/**
 * 토공·사업비 계산(projectCost.ts) 단위시험.
 *
 * `placement.ts`에서 분리됐다(그 파일 상단 주석·[[gp-digital-twin-demo]] v37 참고) — Cesium
 * 이 전혀 필요 없는 순수 계산인데, `evalReport.ts`가 이 셋(computeProjectCost/fmtKrw/
 * DIFFICULTY_LABELS)만 필요해도 Cesium 커플링된 placement.ts 전체를 끌고 들어가야 해서
 * Node 밖에서 임포트가 불가능했다.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

/**
 * 번들은 모듈 평가 시 __SCAFFOLDA_ENV__ 를 읽는다 — 시험용 최소 환경.
 *
 * static import 는 파일 안 어디에 적든 호이스팅돼 다른 top-level 문보다 먼저
 * 실행되므로, 이 스텁 대입보다 항상 앞서 실행돼 버린다(실측 확인 — 그대로 두면
 * 매번 `Cannot read properties of undefined` 로 죽는다). top-level await 도 이 시험
 * 러너(cjs 변환)에서 못 쓰므로(earthworkMapping.test.ts 와 같은 사정), 지연 동적
 * import 로 첫 사용 시점에만 싣는다.
 */
(globalThis as Record<string, unknown>).__SCAFFOLDA_ENV__ ??= {
  VITE_OLLAMA_MODEL: 'test', VITE_OLLAMA_BASE_URL: '/ollama',
  MODE: 'test', DEV: false, PROD: false,
};
type ProjectCostModule = typeof import('../src/runtime/projectCost');
let modPromise: Promise<ProjectCostModule> | null = null;
const loadMod = () => (modPromise ??= import('../src/runtime/projectCost'));

/** 완만한 경사면 위 20×14m 풋프린트 — earthworkMapping.test.ts 와 같은 조건. */
function sampleGround(p: { x: number; y: number }) {
  return 100 + p.x * 0.06 + p.y * 0.04;
}
const FOOTPRINT = [{ x: -10, y: -7 }, { x: 10, y: -7 }, { x: 10, y: 7 }, { x: -10, y: 7 }];

async function fakeItem(overrides: Record<string, unknown> = {}) {
  const { computeEarthwork, footprintOf } = await loadMod();
  const dims = { widthM: 20, depthM: 14, areaM2: 280 };
  const cost = computeEarthwork(footprintOf(dims), 2, 40, sampleGround, 'none');
  return {
    uid: 'b1', spec: { id: 'living-zone', name: '생활관', category: 'living' },
    floors: 2, capacity: 40, dims, cost,
    ...overrides,
  };
}

// ── footprintOf ─────────────────────────────────────────────────────────

test('footprintOf 는 중심 원점 기준 사각형 4점을 낸다', async () => {
  const { footprintOf } = await loadMod();
  const pts = footprintOf({ widthM: 20, depthM: 10 });
  assert.deepEqual(pts, [
    { x: -10, y: -5 }, { x: 10, y: -5 }, { x: 10, y: 5 }, { x: -10, y: 5 },
  ]);
});

// ── fmtKrw ──────────────────────────────────────────────────────────────

test('fmtKrw 는 유한한 수만 포맷하고 나머지는 - 를 낸다', async () => {
  const { fmtKrw } = await loadMod();
  assert.equal(fmtKrw(NaN), '-');
  assert.equal(fmtKrw(Infinity), '-');
  assert.equal(fmtKrw(undefined), '-');
  assert.notEqual(fmtKrw(123_456_789), '-');
  assert.equal(typeof fmtKrw(123_456_789), 'string');
});

// ── computeEarthwork ────────────────────────────────────────────────────

test('computeEarthwork 는 옮겨 적은 필드가 전부 유한하고 costBreakdown 합과 일치한다', async () => {
  const { computeEarthwork } = await loadMod();
  const r = computeEarthwork(FOOTPRINT, 2, 40, sampleGround, 'none');
  assert.ok(r);
  for (const k of ['pad', 'cutM3', 'fillM3', 'earthworkKrw', 'wallKrw', 'foundationKrw', 'buildingKrw', 'overheadKrw', 'totalKrw']) {
    assert.ok(Number.isFinite((r as any)[k]), `${k} 이 유한한 수가 아니다`);
  }
  const parts = r.earthworkKrw + r.wallKrw + r.foundationKrw + r.buildingKrw + r.overheadKrw;
  assert.ok(Math.abs(parts - r.totalKrw) <= Math.max(2, r.totalKrw * 1e-6));
});

test('방호등급(hardened)은 건물 시공단가만 할증해 방호 없음보다 건물비가 더 비싸다', async () => {
  const { computeEarthwork } = await loadMod();
  const none = computeEarthwork(FOOTPRINT, 2, 40, sampleGround, 'none');
  const hardened = computeEarthwork(FOOTPRINT, 2, 40, sampleGround, 'hardened');
  assert.ok(hardened.buildingKrw > none.buildingKrw * 4, '방호 할증(4.2배)이 건물비에 반영되지 않았다');
  // 절·성토(토공)는 방호와 무관 — 지형·면적만의 함수라 값이 같아야 한다.
  assert.equal(hardened.earthworkKrw, none.earthworkKrw);
});

// ── computeProjectCost ──────────────────────────────────────────────────

test('사업비는 시공비 위에 설계비·인허가비가 더해져 시공비보다 크다', async () => {
  const { computeProjectCost } = await loadMod();
  const item = await fakeItem();
  const r = computeProjectCost([item]);
  assert.ok(Number.isFinite(r.totalKrw) && r.totalKrw > 0);
  assert.ok(r.totalKrw > r.constructionKrw, '설계비·인허가비가 반영되지 않았다');
  assert.ok(r.floorAreaM2 > 0);
});

test('추가 시공비(extraConstructionKrw)는 시공비·총액에 그대로 더해진다', async () => {
  const { computeProjectCost } = await loadMod();
  const item = await fakeItem();
  const base = computeProjectCost([item]);
  const withExtra = computeProjectCost([item], 100_000_000);
  assert.equal(withExtra.constructionKrw - base.constructionKrw, 100_000_000);
  assert.equal(withExtra.totalKrw - base.totalKrw, 100_000_000);
});

test('동이 늘면 연면적과 총사업비도 늘어난다(단조)', async () => {
  const { computeProjectCost } = await loadMod();
  const one = computeProjectCost([await fakeItem({ uid: 'b1' })]);
  const two = computeProjectCost([await fakeItem({ uid: 'b1' }), await fakeItem({ uid: 'b2' })]);
  assert.ok(two.floorAreaM2 > one.floorAreaM2);
  assert.ok(two.totalKrw > one.totalKrw);
});
