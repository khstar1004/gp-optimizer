/**
 * 부지 배치 최적화 엔진(siteOptimizer.ts) 단위시험.
 *
 * 이 파일은 지금까지 단위시험이 하나도 없었다 — `sensorPosts.ts`가 모듈 최상단에서
 * `const D = Cesium.Cartesian3.fromDegrees;`(즉시 평가)를 갖고 있어서, `POST_TYPE`
 * (순수 데이터)만 필요한 `postCoverage.ts`/`postOptimizer.ts`가 그 파일을 통째로
 * 임포트하면서 Node 밖(브라우저 없이)에서는 아예 못 불러왔다(연쇄적으로 이 파일도
 * 실질적으로 검증 수단이 없었다). `D`를 지연 평가 래퍼로 바꿔 해결했다 — 이 파일
 * 자체는 애초에 Cesium을 직접 쓰지 않는다(`coverageRaster`의 `document`/`Cesium.Rectangle`
 * 제외 — 그 함수만 브라우저 전용이라 여기서는 시험하지 않는다).
 *
 * LOS(`losClear`)는 이 앱 전체에서 "무엇이 보이는가"를 정하는 안전 임계 로직이라
 * 지구 곡률 항이 실제로 동작하는지(장거리 평지에서도 저고도 관측자는 지평선 너머를
 * 못 본다) 수치로 확인해 둔다.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { lookupTerrainH, losClear, facilityScore, optimizeMountPlacements } from '../src/runtime/siteOptimizer';
import { offset, distM } from '../src/runtime/geo';
import { SITE } from '../src/runtime/data';

/**
 * 합성 ViewshedGrid — viewshed.ts 의 실제 격자와 같은 규약(azStart/azEnd/nAz/nR/rStep,
 * terrainH[a*nR+r], d = minR + rStep*r, az = azStart + azSpan*a/(nAz-1)).
 * `bumpH(az,d)` 로 특정 방위·거리에 지형 기복(능선 등)을 얹을 수 있다.
 */
function makeGrid(opts: {
  lon?: number; lat?: number; groundH?: number; minR?: number; maxR?: number;
  nAz?: number; nR?: number; azStart?: number; azEnd?: number;
  bumpH?: (az: number, d: number) => number;
} = {}) {
  const lon = opts.lon ?? 128.125;
  const lat = opts.lat ?? 38.328;
  const groundH = opts.groundH ?? 500;
  const minR = opts.minR ?? 30;
  const maxR = opts.maxR ?? 2000;
  const nAz = opts.nAz ?? 72;
  const nR = opts.nR ?? 50;
  const azStart = opts.azStart ?? 0;
  const azEnd = opts.azEnd ?? 360;
  const rStep = (maxR - minR) / (nR - 1);
  const azSpan = azEnd - azStart;
  const terrainH = new Float32Array(nAz * nR);
  for (let a = 0; a < nAz; a++) {
    const az = azStart + (azSpan * a) / (nAz - 1);
    for (let r = 0; r < nR; r++) {
      const d = minR + rStep * r;
      terrainH[a * nR + r] = groundH + (opts.bumpH ? opts.bumpH(az, d) : 0);
    }
  }
  return { lon, lat, groundH, minR, maxR, azStart, azEnd, nAz, nR, rStep, terrainH };
}

// ── lookupTerrainH ──────────────────────────────────────────────────────

test('격자 최소반경 안쪽은 지형고 대신 groundH를 그대로 준다', () => {
  const grid = makeGrid({ groundH: 500, minR: 30 });
  const p = offset(grid.lon, grid.lat, 40, 5);
  assert.equal(lookupTerrainH(grid, p.lon, p.lat), 500);
});

test('격자 최대반경 밖은 null이다', () => {
  const grid = makeGrid({ maxR: 2000 });
  const p = offset(grid.lon, grid.lat, 10, 2500);
  assert.equal(lookupTerrainH(grid, p.lon, p.lat), null);
});

test('격자 방위 범위(섹터) 밖은 null이다', () => {
  const grid = makeGrid({ azStart: 0, azEnd: 150 });
  const inside = offset(grid.lon, grid.lat, 80, 500);
  const outside = offset(grid.lon, grid.lat, 200, 500);
  assert.notEqual(lookupTerrainH(grid, inside.lon, inside.lat), null);
  assert.equal(lookupTerrainH(grid, outside.lon, outside.lat), null);
});

test('범위 안이면 해당 셀의 지형고를 돌려준다', () => {
  const grid = makeGrid({ groundH: 500, minR: 30, maxR: 2000, nR: 50, bumpH: (_az, d) => (d > 1000 ? 40 : 0) });
  const near = offset(grid.lon, grid.lat, 0, 500);
  const far = offset(grid.lon, grid.lat, 0, 1500);
  assert.equal(lookupTerrainH(grid, near.lon, near.lat), 500);
  assert.equal(lookupTerrainH(grid, far.lon, far.lat), 540);
});

// ── losClear ────────────────────────────────────────────────────────────

test('평탄한 지형·근거리에서는 낮은 관측고에서도 가시선이 통한다', () => {
  const grid = makeGrid({ groundH: 500 });
  const target = offset(grid.lon, grid.lat, 30, 1000);
  assert.equal(losClear(grid, grid.lon, grid.lat, 500 + 1.7, target.lon, target.lat), true);
});

test('평탄한 지형이라도 아주 먼 거리에서는 지구 곡률에 막혀 안 보인다', () => {
  const grid = makeGrid({ groundH: 500, maxR: 25000, nR: 80, nAz: 36 });
  const target = offset(grid.lon, grid.lat, 30, 20000);
  // 낮은 관측고(사람 눈높이) — 곡률 항이 없다면 평지에서 20km 도 항상 보여야 한다.
  assert.equal(losClear(grid, grid.lon, grid.lat, 500 + 1.7, target.lon, target.lat), false);
});

test('시선 경로 위 능선이 관측고보다 높으면 막힌다', () => {
  const grid = makeGrid({
    groundH: 500,
    bumpH: (_az, d) => (d > 900 && d < 1100 ? 60 : 0), // 1km 지점에 60m 능선
  });
  const target = offset(grid.lon, grid.lat, 45, 2000);
  const clearBefore = losClear(grid, grid.lon, grid.lat, 500 + 5, target.lon, target.lat);
  assert.equal(clearBefore, false);
});

test('같은 능선이라도 관측고를 충분히 올리면 다시 보인다', () => {
  // 능선이 절반 지점에 있으면 시선(관측고→표적고 직선)이 그 지점까지 내려온
  // 상태라, 능선 절대고도를 살짝 넘는 정도로는 부족하다 — 시선 자체를 능선 위로
  // 들어 올릴 만큼 관측고를 크게 높여야 한다(아래서 막힘을 먼저 확인한 뒤 비교).
  const grid = makeGrid({
    groundH: 500,
    bumpH: (_az, d) => (d > 900 && d < 1100 ? 60 : 0),
  });
  const target = offset(grid.lon, grid.lat, 45, 2000);
  assert.equal(losClear(grid, grid.lon, grid.lat, 500 + 65, target.lon, target.lat), false);
  assert.equal(losClear(grid, grid.lon, grid.lat, 500 + 150, target.lon, target.lat), true);
});

test('표적이 격자 범위 밖(toGround가 null)이면 항상 막힌 것으로 본다', () => {
  const grid = makeGrid({ maxR: 2000 });
  const target = offset(grid.lon, grid.lat, 0, 3000);
  assert.equal(losClear(grid, grid.lon, grid.lat, 600, target.lon, target.lat), false);
});

// ── facilityScore ───────────────────────────────────────────────────────

test('지휘소는 감시탑에서 75m 넘게 떨어지면 배치 불가(-Infinity)다', () => {
  const c = { lon: 128.125, lat: 38.328, az: 0, d: 76, h: 500, slopeDeg: 0 };
  assert.equal(facilityScore('command-zone', c, 500, []), -Infinity);
});

test('지휘소 점수는 경사·엄폐·거리 가중합으로 정확히 계산된다', () => {
  // slopeScore=1, defilade=0(같은 높이), rear=0(정면 az=centerAz=0) → 기본항 0.5
  // + 지휘소 보너스 (1 - 50/75) * 0.25
  const c = { lon: 128.125, lat: 38.328, az: 0, d: 50, h: 500, slopeDeg: 0 };
  const score = facilityScore('command-zone', c, 500, []);
  const expected = 0.5 + (1 - 50 / 75) * 0.25;
  assert.ok(Math.abs(score - expected) < 1e-9, `${score} !== ${expected}`);
});

test('탄약고(storage-zone)는 생활동에서 50m 미만이면 배치 불가다', () => {
  const base = { lon: 128.125, lat: 38.328 };
  const near = offset(base.lon, base.lat, 90, 49);
  const c = { lon: near.lon, lat: near.lat, az: 90, d: 200, h: 500, slopeDeg: 0 };
  const placedSoFar = [{ id: 'living-zone', lon: base.lon, lat: base.lat }];
  assert.equal(facilityScore('storage-zone', c, 500, placedSoFar), -Infinity);
});

test('정확히 50m 는 이격 위반이 아니다 — 문턱은 미만이다', () => {
  const base = { lon: 128.125, lat: 38.328 };
  const at50 = offset(base.lon, base.lat, 90, 50);
  const c = { lon: at50.lon, lat: at50.lat, az: 90, d: 200, h: 500, slopeDeg: 0 };
  const placedSoFar = [{ id: 'living-zone', lon: base.lon, lat: base.lat }];
  const score = facilityScore('storage-zone', c, 500, placedSoFar);
  assert.notEqual(score, -Infinity);
});

test('위병소(entry-zone)는 허브 방위에서 40도 넘게 벗어나면 배치 불가다', () => {
  const c39 = { lon: 128.125, lat: 38.328, az: 129, d: 100, h: 500, slopeDeg: 0 }; // |129-90|=39
  const c40 = { lon: 128.125, lat: 38.328, az: 130, d: 100, h: 500, slopeDeg: 0 }; // |130-90|=40
  assert.notEqual(facilityScore('entry-zone', c39, 500, [], { hubAz: 90 }), -Infinity);
  assert.equal(facilityScore('entry-zone', c40, 500, [], { hubAz: 90 }), -Infinity);
});

test('알 수 없는 시설 id는 기본 경사·엄폐·전후방 가중합만 낸다', () => {
  const c = { lon: 128.125, lat: 38.328, az: 180, d: 100, h: 490, slopeDeg: 6 };
  const score = facilityScore('unknown-zone', c, 500, []);
  const slopeScore = 1 - 6 / 12; // 0.5
  const defilade = Math.min(1, Math.max(0, (500 - 490) / 25)); // 0.4
  const fwd = Math.max(0, 1 - 180 / 90); // 0 (180도 벗어나면 azDelta는 180이 아니라 -180으로 wrap되지만 절대값은 같다)
  const rear = 1 - fwd;
  const expected = slopeScore * 0.5 + defilade * 0.28 + rear * 0.08;
  assert.ok(Math.abs(score - expected) < 1e-9, `${score} !== ${expected}`);
});

test('경사가 가팔라질수록 점수가 단조 감소한다', () => {
  const mk = (slopeDeg: number) => facilityScore('unknown-zone', { lon: 128.125, lat: 38.328, az: 0, d: 100, h: 500, slopeDeg }, 500, []);
  assert.ok(mk(0) > mk(4));
  assert.ok(mk(4) > mk(8));
  assert.ok(mk(8) > mk(12));
});

// ── optimizeMountPlacements ─────────────────────────────────────────────
//
// `candidateRing()`는 `SITE.gp`(실제 사이트 상수) 기준으로 후보를 깔고,
// `sectorTargets(grid)`는 `grid.lon/lat` 기준으로 표적을 깐다 — 둘이 같은 원점을
// 가리켜야 기하가 맞으므로, 격자 원점을 `SITE.gp`와 일치시킨다. 평탄한 지형(모든
// 시야가 트임)에서 결과의 불변식(범위·형태·자산 배치 여부)을 확인한다 — 그리디
// 최적화 자체는 손으로 정확한 수치를 예측하기엔 조합이 많아, 스모크+불변식 시험이다.
function makeOptimizerGrid() {
  const nR = 20, minR = 100, maxR = SITE.sector.maxR + 200;
  return {
    lon: SITE.gp.lon, lat: SITE.gp.lat, groundH: 550,
    minR, maxR, azStart: 0, azEnd: 360, nAz: 36, nR,
    rStep: (maxR - minR) / (nR - 1),
    terrainH: new Float32Array(36 * nR).fill(550),
  };
}
const flatCandHeights = async (pts: Array<{ lon: number; lat: number }>) => pts.map(() => 550);

test('평탄한 지형에서 단일 자산(EO)을 배치하면 실제로 후보가 하나 선정되고 합동 커버가 0~1 사이다', async () => {
  const grid = makeOptimizerGrid();
  const { placements, report } = await optimizeMountPlacements(grid, ['eo'], flatCandHeights, null);
  assert.equal(report.nCands, 30 * 6); // az 12도 간격×30, 거리 6종
  assert.ok(report.nTargets > 0);
  assert.ok(placements.has('eo'));
  const eo = placements.get('eo');
  assert.ok(eo.coverage > 0 && eo.coverage <= 1);
  assert.ok(eo.marginal > 0 && eo.marginal <= 1);
  assert.ok(report.jointAfter >= 0 && report.jointAfter <= 1);
  assert.ok(report.jointAfter > 0); // 평탄 지형이면 뭔가는 보여야 한다
  assert.equal(report.perAsset.length, 1);
  assert.equal(report.perAsset[0].key, 'eo');
});

test('키를 하나도 안 주면 아무것도 배치하지 않고 합동 커버는 0이다', async () => {
  const grid = makeOptimizerGrid();
  const { placements, report } = await optimizeMountPlacements(grid, [], flatCandHeights, null);
  assert.equal(placements.size, 0);
  assert.equal(report.jointAfter, 0);
  assert.equal(report.perAsset.length, 0);
});

test('두 자산을 함께 배치하면 서로 10m 이내로 겹치지 않는다', async () => {
  const grid = makeOptimizerGrid();
  const { placements } = await optimizeMountPlacements(grid, ['eo', 'ir'], flatCandHeights, null);
  const pts = [...placements.values()];
  for (let i = 0; i < pts.length; i++) {
    for (let j = i + 1; j < pts.length; j++) {
      assert.ok(distM(pts[i].lon, pts[i].lat, pts[j].lon, pts[j].lat) >= 10);
    }
  }
});

test('고정고도(elev) 자산(cuas)은 후보 중 가장 높은 지반을 고른다', async () => {
  const grid = makeOptimizerGrid();
  // 30~90m 링 중 32m 링만 유독 높게 — cuas(maxDist=30)는 32m 밖은 후보가 아니므로
  // 12m·20m 링(둘 다 groundH=550) 중에서 골라야 한다는 것도 함께 확인한다.
  const candHeights = async (pts: Array<{ lon: number; lat: number }>) => pts.map((p) => {
    const d = distM(SITE.gp.lon, SITE.gp.lat, p.lon, p.lat);
    return d < 25 ? 550 + d : 550; // 12m 링보다 20m 링이 더 높게
  });
  const { placements } = await optimizeMountPlacements(grid, ['cuas'], candHeights, null);
  const cuas = placements.get('cuas');
  assert.ok(cuas);
  assert.ok(distM(SITE.gp.lon, SITE.gp.lat, cuas.lon, cuas.lat) <= 30);
  assert.ok(Math.abs(cuas.dist - 20) < 1e-6); // 20m 링이 12m 링보다 높으므로 그쪽이 선택돼야 한다
});
