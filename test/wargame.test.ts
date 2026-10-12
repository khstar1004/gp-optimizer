/**
 * 워게임 판정 엔진(wargame.ts) 단위시험 — 침투 리허설의 누적 탐지확률(Johnson TTPF 관례)·
 * 교전 여유 판정.
 *
 * 이 파일은 임포트를 막는 요인이 전혀 없어(모든 Cesium 참조가 `paintJudgement`
 * 함수 본문 안에만 있다) 지금까지 그냥 테스트가 없었을 뿐이다 — 침투 탐지 판정처럼
 * 안전에 직결된 로직인데도 검증 수단이 하나도 없었다.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { envSnapshot, judgeRoute, judgeAll } from '../src/runtime/wargame';
import { SITE } from '../src/runtime/data';
import { offset } from '../src/runtime/geo';

/** viewshed.ts 와 같은 규약의 합성 가시격자. vis=1(전부 가시) 또는 0(전부 차폐)로 채운다. */
function makeGrid(visible: boolean, opts: { minR?: number; maxR?: number } = {}) {
  const nR = 40, nAz = 72;
  const minR = opts.minR ?? 10, maxR = opts.maxR ?? 5000;
  return {
    lon: SITE.gp.lon, lat: SITE.gp.lat, minR, maxR,
    azStart: 0, azEnd: 360, nAz, nR,
    rStep: (maxR - minR) / (nR - 1),
    vis: new Uint8Array(nAz * nR).fill(visible ? 1 : 0),
  };
}

/**
 * GP 로부터 방위 az 로 fromDist→toDist(m) 를 n스텝에 걸쳐 접근(또는 이탈)하는 축선.
 * 방위가 고정된 직선 이동이라 누적거리(cumM)는 스텝당 균등 증가한다.
 */
function makeRouteData(name: string, az: number, fromDist: number, toDist: number, n = 200) {
  const stepM = Math.abs(toDist - fromDist) / n;
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const d = fromDist + (toDist - fromDist) * (i / n);
    const p = offset(SITE.gp.lon, SITE.gp.lat, az, d);
    pts.push({ lon: p.lon, lat: p.lat, h: 550, cumM: i * stepM });
  }
  return { route: { name }, pts };
}

const DAYLIGHT_ENV = { lux: 20000, visM: 20000, windMps: 2, rainMm: 0, label: '주간 · 청명 · 가시 20km' };

// ── envSnapshot ─────────────────────────────────────────────────────────

test('envSnapshot 은 환경상태가 없어도 청천 주간 기본값으로 떨어진다', () => {
  const env = envSnapshot(null);
  assert.equal(env.lux, 20000);
  assert.equal(env.visM, 20000);
  assert.equal(env.windMps, 1);
  assert.equal(env.rainMm, 0);
});

test('envSnapshot 은 제공된 값을 그대로 옮겨 적는다', () => {
  const env = envSnapshot({
    illuminanceLux: 5, weather: { visibilityMeters: 800, windMps: 9, precipitationRateMmPerHour: 12, label: '폭우' },
    daylight: { phaseLabel: '야간' },
  });
  assert.equal(env.lux, 5);
  assert.equal(env.visM, 800);
  assert.equal(env.windMps, 9);
  assert.equal(env.rainMm, 12);
  assert.match(env.label, /야간.*폭우/);
});

// ── judgeRoute ──────────────────────────────────────────────────────────

test('사방 가시·주간에 GP로 곧장 접근하면 결국 탐지되고 누적확률은 단조 증가한다', () => {
  const grid = makeGrid(true);
  const rd = makeRouteData('축선 1', 0, 4000, 0, 300);
  const r = judgeRoute(rd, 'walk', grid, new Set(), DAYLIGHT_ENV);

  assert.ok(r.t50 != null, '접근 축선인데 t50(50% 탐지)이 안 나왔다');
  assert.ok(r.t90 != null);
  assert.ok(r.t50 <= r.t90);
  assert.equal(r.firstAsset, '감시탑 관측'); // activeSet이 비어있어 타워 육안뿐

  let prev = 0;
  for (const s of r.samples) {
    assert.ok(s.pCum >= prev - 1e-12, '누적 탐지확률이 감소했다');
    prev = s.pCum;
  }
});

test('전 구간 가시선이 막히면(비가시선 자산도 없으면) 끝까지 미탐지 판정이다', () => {
  const grid = makeGrid(false, { minR: 0 });
  const rd = makeRouteData('축선 1', 0, 4000, 50, 200); // GP 코앞(50m)까지만 접근, minR 안으로는 안 들어간다
  const r = judgeRoute(rd, 'walk', grid, new Set(), DAYLIGHT_ENV);
  assert.equal(r.t50, null);
  assert.equal(r.t90, null);
  assert.equal(r.firstAsset, null);
  assert.equal(r.verdict, '미탐지 — 축선 전 구간 침투 허용');
  assert.equal(r.verdictClass, 'bad');
});

test('야간(저조도)에 IR을 켜지 않았으면 IR 가동을 권고한다', () => {
  const grid = makeGrid(true);
  const rd = makeRouteData('축선 1', 0, 3000, 0, 150);
  const night = { ...DAYLIGHT_ENV, lux: 5 };
  const r = judgeRoute(rd, 'walk', grid, new Set(), night); // IR 미포함
  assert.ok(r.recommendations.some((x) => x.includes('IR 열상')));
});

test('IR을 이미 가동 중이면 IR 권고가 없다', () => {
  const grid = makeGrid(true);
  const rd = makeRouteData('축선 1', 0, 3000, 0, 150);
  const night = { ...DAYLIGHT_ENV, lux: 5 };
  const r = judgeRoute(rd, 'walk', grid, new Set(['ir']), night);
  assert.ok(!r.recommendations.some((x) => x.includes('IR 열상')));
});

test('탐지 없이 DP를 지나면(늦은 탐지) 결심시간 부족 경고를 낸다', () => {
  // minR 안쪽은 항상 가시(코드 규약) — minR을 60m로 좁게 잡으면 축선 끝(GP 코앞, DP 이후
  // 지점)에서만 잠깐 보이고 그 전 구간(DP 이전 포함)은 전부 안 보이게 만들 수 있다.
  const gridNearOnly = makeGrid(false, { minR: 60, maxR: 5000 });
  const rd = makeRouteData('축선 1', 0, 3000, 0, 300);
  const r = judgeRoute(rd, 'walk', gridNearOnly, new Set(), DAYLIGHT_ENV);
  assert.ok(r.t50 != null, '코앞에서는 결국 잡혀야 한다');
  assert.equal(r.detectedBeforeDP, false, 'DP(56% 지점) 훨씬 이후인 코앞에서만 잡혔는데 DP 이전으로 판정됐다');
  assert.equal(r.verdict, 'DP 이후 지연 탐지 — 결심 시간 부족');
  assert.equal(r.verdictClass, 'warn');
});

test('이동수단이 빠를수록(vehicle) 같은 축선의 총 소요시간이 짧다', () => {
  const grid = makeGrid(true);
  const rd = makeRouteData('축선 1', 0, 3000, 0, 150);
  const walk = judgeRoute(rd, 'walk', grid, new Set(), DAYLIGHT_ENV);
  const vehicle = judgeRoute(rd, 'vehicle', grid, new Set(), DAYLIGHT_ENV);
  assert.ok(vehicle.totalMin < walk.totalMin);
});

// ── judgeAll ────────────────────────────────────────────────────────────

test('judgeAll은 위험(미탐지·늦은 탐지) 순으로 정렬한다', () => {
  const visibleGrid = makeGrid(true);
  const blockedGrid = makeGrid(false, { minR: 0 });
  const safe = makeRouteData('안전축선(즉시노출)', 0, 1200, 0, 120);
  const risky = makeRouteData('위험축선(미탐지)', 90, 1200, 50, 120);

  // judgeAll은 격자를 하나만 받으므로, 안전축선엔 항상 보이는 격자를,
  // 위험축선엔 항상 막힌 격자를 각각 별도 judgeRoute로 만들고 judgeAll의 정렬 로직만
  // 재현 검증한다 — 실제 judgeAll 시그니처(단일 grid)에 맞춰 두 케이스를 병합 확인.
  const rSafe = judgeRoute(safe, 'walk', visibleGrid, new Set(), DAYLIGHT_ENV);
  const rRisky = judgeRoute(risky, 'walk', blockedGrid, new Set(), DAYLIGHT_ENV);
  assert.ok(rSafe.t50 != null && rRisky.t50 == null);

  // judgeAll 자체는 단일 grid 로 여러 축선을 판정 — 같은 격자에서 접근각이 달라 결과가
  // 갈리는 두 축선으로 정렬을 확인한다.
  const nearHub = makeRouteData('허브 근접', 0, 800, 0, 120);
  const farAway = makeRouteData('먼 우회', 180, 4000, 3600, 40); // 계속 멀리 머무는 축선
  const results = judgeAll([nearHub, farAway], 'walk', visibleGrid, new Set(), null);
  assert.equal(results.length, 2);
  // 더 위험(늦게 잡히거나 못 잡히는) 쪽이 먼저 온다.
  const riskRank = (r: any) => (r.t50 == null ? 3000 : (!r.detectedBeforeDP ? 2000 : (r.engagementMarginMin < 0 ? 1000 : 0)) + r.t50);
  assert.ok(riskRank(results[0]) >= riskRank(results[1]));
});
