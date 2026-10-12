/**
 * 배치 감시자산 합동 커버리지 엔진(postCoverage.ts) 단위시험.
 *
 * `sensorPosts.ts`의 모듈최상단 즉시평가 Cesium 참조를 지연평가로 바꾼 뒤에야
 * (siteOptimizer.test.ts 상단 주석 참고) 이 파일도 Node 에서 임포트 가능해졌다 —
 * `raster()`(document/Cesium.Rectangle 사용)만 브라우저 전용이라 시험 대상에서 뺀다.
 *
 * LOS 마스크 굽기(build)·합동 탐지확률(score)·한계기여(marginal)·사각지대(gaps)·
 * 날씨 스윕(weatherSweep)·침투축선 노출도(routeExposure) 는 전부 순수 계산이다.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { CoverageEngine, routeExposure, type SensorPostLike } from '../src/runtime/postCoverage';
import { SITE } from '../src/runtime/data';
import { azDelta, offset } from '../src/runtime/geo';
import { DEFAULT_ENVIRONMENT } from '../src/runtime/environmentModel';

/** siteOptimizer.test.ts 와 동일한 규약의 평탄 지형 합성 격자. */
function makeGrid(opts: { groundH?: number } = {}) {
  const nR = 20, minR = 100, maxR = SITE.sector.maxR + 200;
  const groundH = opts.groundH ?? 550;
  return {
    lon: SITE.gp.lon, lat: SITE.gp.lat, groundH,
    minR, maxR, azStart: 0, azEnd: 360, nAz: 36, nR,
    rStep: (maxR - minR) / (nR - 1),
    terrainH: new Float32Array(36 * nR).fill(groundH),
  };
}

let postSeq = 0;
function post(overrides: Partial<SensorPostLike> = {}): SensorPostLike {
  postSeq += 1;
  return {
    uid: `post-${postSeq}`, type: 'eo', band: 'vis',
    lon: SITE.gp.lon, lat: SITE.gp.lat, eyeH: 559.5,
    fov: 90, aimAz: SITE.sector.centerAz,
    perf: { range: 3000, dri: [3000, 1200, 600] },
    ...overrides,
  };
}

// ── 픽셀 격자 구성 ────────────────────────────────────────────────────────

test('책임구역(부채꼴) 안의 픽셀만 남긴다', () => {
  const engine = new CoverageEngine(makeGrid(), 64);
  assert.ok(engine.n > 0);
  assert.equal(engine.idx.length, engine.n);
  for (let i = 0; i < engine.n; i++) {
    assert.ok(engine.d0[i] >= SITE.sector.minR && engine.d0[i] <= SITE.sector.maxR);
    assert.ok(Math.abs(azDelta(engine.az0[i], SITE.sector.centerAz)) <= SITE.sector.halfAngle);
  }
});

// ── LOS 마스크 ────────────────────────────────────────────────────────────

test('평탄 지형에서는 청천 제원 안 픽셀 대부분이 가시(los=1)다', async () => {
  const engine = new CoverageEngine(makeGrid(), 64);
  const a = post({ band: 'vis' });
  await engine.build([a]);
  const mask = engine.masks.get(CoverageEngine.sigOf(a));
  assert.ok(mask);
  let visible = 0;
  for (let i = 0; i < engine.n; i++) if (mask.los[i]) visible++;
  assert.ok(visible > 0, '평탄 지형인데 아무 데도 안 보인다');
});

test('비가시선 대역(acoustic/rf)은 지형 차폐와 무관하게 청천 제원 범위 안은 전부 가시로 본다', async () => {
  // 모든 방향에 아주 높은 능선을 세워 광학은 전부 막히게 한다.
  const grid = makeGrid();
  grid.terrainH.fill(grid.groundH + 5000);
  const engine = new CoverageEngine(grid, 48);

  const visPost = post({ uid: 'vis1', type: 'eo', band: 'vis' });
  const acPost = post({ uid: 'ac1', type: 'acoustic', band: 'acoustic', eyeH: 552 });
  await engine.build([visPost, acPost]);

  const visMask = engine.masks.get(CoverageEngine.sigOf(visPost));
  const acMask = engine.masks.get(CoverageEngine.sigOf(acPost));
  assert.ok(visMask && acMask);
  const visVisible = [...visMask.los].some((v) => v === 1);
  const acVisible = [...acMask.los].some((v) => v === 1);
  assert.equal(visVisible, false, '거대한 능선인데 광학이 뚫려 보인다');
  assert.equal(acVisible, true, '음향은 지형 차폐를 안 받아야 하는데 전부 막혔다');
});

test('청천 제원(dri[0]) 밖은 지형과 무관하게 영원히 안 보인다', async () => {
  // 미등록 type 이라 specMax 기본값(3000m) 적용 — 초소가 격자 중심(SITE.gp)에 있으므로
  // 픽셀까지 거리 ≈ d0. 부채꼴 최대반경(4000m)까지 픽셀이 있으니 3000~4000m 대역은
  // 지형이 평탄해도(가시선은 열려 있어도) specMax 컷오프로 안 보여야 한다.
  const engine = new CoverageEngine(makeGrid(), 64);
  const shortPost = post({ type: 'x', band: 'vis' });
  await engine.build([shortPost]);
  const mask = engine.masks.get(CoverageEngine.sigOf(shortPost));
  assert.ok(mask);
  let sawFar = false;
  for (let i = 0; i < engine.n; i++) {
    if (mask.dist[i] > 3000) { sawFar = true; assert.equal(mask.los[i], 0, `${mask.dist[i]}m 는 청천 제원 밖인데 가시로 잡혔다`); }
  }
  assert.ok(sawFar, '시험 격자에 3000m 넘는 픽셀이 없어 이 시험이 무의미하다');
});

test('사라진 초소의 마스크는 다음 build 에서 정리된다', async () => {
  // sigOf() 는 uid 가 아니라 물리적 위치·관측고로 캐시 키를 만든다(같은 자리에 다시
  // 세우면 마스크를 재사용하려는 의도) — 그래서 b는 a와 다른 위치여야 마스크가 둘로 는다.
  const engine = new CoverageEngine(makeGrid(), 32);
  const bPos = offset(SITE.gp.lon, SITE.gp.lat, 90, 40);
  const a = post({ uid: 'a' });
  const b = post({ uid: 'b', lon: bPos.lon, lat: bPos.lat });
  await engine.build([a, b]);
  assert.equal(engine.masks.size, 2);
  await engine.build([a]);
  assert.equal(engine.masks.size, 1);
  assert.ok(engine.masks.has(CoverageEngine.sigOf(a)));
});

// ── 합동 탐지확률 ────────────────────────────────────────────────────────

test('score() 결과는 0~1 범위이고, 자산을 더하면 합동 커버가 줄지 않는다(단조)', async () => {
  const engine = new CoverageEngine(makeGrid(), 48);
  const a = post({ uid: 'a', aimAz: SITE.sector.centerAz - 30 });
  const b = post({ uid: 'b', aimAz: SITE.sector.centerAz + 30 });
  await engine.build([a, b]);

  const soloA = engine.score([a]);
  const both = engine.score([a, b]);
  assert.ok(soloA.joint >= 0 && soloA.joint <= 1);
  assert.ok(both.joint >= 0 && both.joint <= 1);
  assert.ok(both.joint >= soloA.joint - 1e-9, '자산을 추가했는데 합동 커버가 줄었다');
});

test('range<=0 인 성능표는 기여가 없다', async () => {
  const engine = new CoverageEngine(makeGrid(), 32);
  const a = post({ uid: 'a' });
  await engine.build([a]);
  const dead = engine.score([a], { a: { range: 0, dri: [0, 0, 0] } });
  assert.equal(dead.joint, 0);
  assert.equal(dead.covered, 0);
});

test('perfBy 로 특정 초소의 성능표를 덮어쓸 수 있다', async () => {
  const engine = new CoverageEngine(makeGrid(), 32);
  const a = post({ uid: 'a' });
  await engine.build([a]);
  const withDefault = engine.score([a]);
  const withOverride = engine.score([a], { a: { range: 100, dri: [100, 40, 20] } });
  assert.ok(withOverride.joint < withDefault.joint, '더 짧은 성능표로 덮었는데 커버가 안 줄었다');
});

// ── 한계기여 ────────────────────────────────────────────────────────────

test('초소가 하나뿐이면 한계기여는 합동 커버 전체와 같다', async () => {
  const engine = new CoverageEngine(makeGrid(), 32);
  const a = post({ uid: 'solo' });
  await engine.build([a]);
  const [m] = engine.marginal([a]);
  const joint = engine.score([a]).joint;
  assert.ok(Math.abs(m.marginal - joint) < 1e-9);
});

test('완전히 겹치는 중복 초소의 한계기여는 단독 기여보다 작다(중복 감지)', async () => {
  const engine = new CoverageEngine(makeGrid(), 32);
  const a = post({ uid: 'a' });
  const bDup = post({ uid: 'b', lon: a.lon, lat: a.lat, eyeH: a.eyeH, fov: a.fov, aimAz: a.aimAz, perf: a.perf, type: a.type });
  await engine.build([a, bDup]);
  const solo = engine.score([a]).joint;
  const [{ marginal: mA }] = engine.marginal([a, bDup]).filter((x) => x.uid === 'a');
  assert.ok(mA < solo, `중복 초소 한계기여(${mA})가 단독 기여(${solo})보다 작아야 한다`);
});

// ── 사각지대 ────────────────────────────────────────────────────────────

test('아무것도 안 보이면 조기경보선 전체가 사각으로 잡힌다', () => {
  const engine = new CoverageEngine(makeGrid(), 32);
  const p = new Float32Array(engine.n); // 전부 0
  const gaps = engine.gaps({ p }, 0.25);
  assert.ok(gaps.length >= 1);
});

test('전 구간이 잘 보이면 사각지대가 없다', () => {
  const engine = new CoverageEngine(makeGrid(), 32);
  const p = new Float32Array(engine.n).fill(1); // 전부 완전 탐지
  const gaps = engine.gaps({ p }, 0.25);
  assert.equal(gaps.length, 0);
});

// ── 날씨 스윕 ────────────────────────────────────────────────────────────

test('날씨 스윕은 6종 날씨 × 3강도 = 18행을 내고, 흐릴수록 유효거리가 청천보다 짧아진다', async () => {
  const engine = new CoverageEngine(makeGrid(), 32);
  const a = post({ uid: 'a', type: 'eo', band: 'vis' });
  await engine.build([a]);
  const site = { latitude: SITE.gp.lat, longitude: SITE.gp.lon, utcOffsetHours: 9 };
  const rows = engine.weatherSweep([a], site, { ...DEFAULT_ENVIRONMENT, minuteOfDay: 720 });
  assert.equal(rows.length, 18);
  const clearRow = rows.find((r) => r.weather === 'clear' && r.intensity === 1.0);
  const fogRow = rows.find((r) => r.weather === 'fog' && r.intensity === 1.0);
  assert.ok(clearRow && fogRow);
  assert.ok(fogRow.visibilityMeters < clearRow.visibilityMeters);
});

test('발전기(genW 있는 유형)는 커버리지 합에 들어가지 않는다', async () => {
  const engine = new CoverageEngine(makeGrid(), 32);
  const gen = post({ uid: 'gen', type: 'genset', band: 'none', fov: 0 });
  await engine.build([gen]);
  const site = { latitude: SITE.gp.lat, longitude: SITE.gp.lon, utcOffsetHours: 9 };
  const rows = engine.weatherSweep([gen], site, DEFAULT_ENVIRONMENT, [1.0]);
  // POST_TYPE.genset 은 genW>0 이라 perfBy에서 제외돼야 한다 — 발전기가 커버를 만들면 안 된다.
  for (const r of rows) assert.equal(r.joint, 0);
});

// ── 침투 축선 노출도 ──────────────────────────────────────────────────────

test('축선이 완전히 커버 밖(거리 0)이면 노출도를 지어내지 않는다', () => {
  const engine = new CoverageEngine(makeGrid(), 32);
  const scored = { p: new Float32Array(engine.n).fill(1) };
  const routes = [{ id: 'r1', name: 'A', color: '#fff', pts: [{ lon: SITE.gp.lon, lat: SITE.gp.lat, cumM: 0 }] }];
  const [r] = routeExposure(engine, scored, routes);
  assert.equal(r.totalM, 0);
  assert.equal(r.exposure, 0);
});

test('완전히 커버된 축선은 노출도 1이고 사각 구간이 없다', () => {
  const engine = new CoverageEngine(makeGrid(), 32);
  const scored = { p: new Float32Array(engine.n).fill(1) };
  const inner = { lon: engine.lon[Math.floor(engine.n / 2)], lat: engine.lat[Math.floor(engine.n / 2)] };
  const routes = [{
    id: 'r1', name: 'A', color: '#fff',
    pts: [
      { lon: inner.lon, lat: inner.lat, cumM: 0 },
      { lon: inner.lon + 0.0005, lat: inner.lat, cumM: 40 },
    ],
  }];
  const [r] = routeExposure(engine, scored, routes);
  assert.ok(r.totalM > 0);
  assert.ok(r.exposure > 0.9);
  assert.equal(r.worstDarkM, 0);
});
