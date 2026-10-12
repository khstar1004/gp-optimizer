/**
 * 원본 산출물 ↔ 화면 필드명 정합 시험.
 *
 * `computeEarthwork`(원래 `placement.ts`, 지금은 `./projectCost.ts` — Cesium 커플링과
 * 무관한 순수 토공·사업비 계산이라 분리됐다, 그 파일 상단 주석 참고)는 Scaffolda 원본
 * `computeEarthwork` 의 결과를 화면이 쓰던 짧은 이름으로 얕게 옮겨 적는다. 그 옮겨 적기는
 * **조용히 틀릴 수 있다** — 없는 필드를 읽으면 `undefined + undefined = NaN` 이 되고,
 * `fmtKrw(NaN)` 은 예외 대신 「-」를 돌려주므로 콘솔은 조용하고 화면에는 토공비 자리에
 * 작대기 하나만 남는다. 실제로 그 상태로 오래 굴러갔다.
 *
 * 그래서 원본을 직접 돌려 **실제로 존재하는 키**를 확인하고, projectCost.ts 가
 * `r.costBreakdown.<이름>` 으로 읽는 이름이 전부 그 안에 있는지 대조한다.
 * (번들은 브라우저 전역을 기대하므로 시험에서 최소한만 세워 준다.)
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const SOURCE = readFileSync(new URL('../src/runtime/projectCost.ts', import.meta.url), 'utf8');

/** 번들은 모듈 평가 시 __SCAFFOLDA_ENV__ 를 읽는다 — 시험용 최소 환경. */
(globalThis as Record<string, unknown>).__SCAFFOLDA_ENV__ ??= {
  VITE_OLLAMA_MODEL: 'test', VITE_OLLAMA_BASE_URL: '/ollama',
  MODE: 'test', DEV: false, PROD: false,
};

// 최상위 await 은 이 시험 러너(cjs 변환)에서 못 쓴다 — 첫 사용 시 한 번만 싣는다.
let bundlePromise: Promise<Record<string, Function>> | null = null;
const loadBundle = () => (bundlePromise ??= import('../js/vendor/scaffolda/scaffolda.bundle.js' as string));

/** 완만한 경사면 위 20×14m 풋프린트 — 절토·성토가 모두 나오는 조건. */
async function sampleEarthwork() {
  const bundle = await loadBundle();
  const footprint = [{ x: -10, y: -7 }, { x: 10, y: -7 }, { x: 10, y: 7 }, { x: -10, y: 7 }];
  // 원본 sampleGround 는 점 하나를 {x, y} 로 받는다 (좌표 두 개가 아니다).
  const ground = (p: { x: number; y: number }) => 100 + p.x * 0.06 + p.y * 0.04;
  return bundle.computeEarthwork(footprint, 1, ground, bundle.DEFAULT_EARTHWORK_CONFIG);
}

test('원본 computeEarthwork 이 costBreakdown 을 낸다', async () => {
  const r = await sampleEarthwork();
  assert.ok(r, 'computeEarthwork 이 아무것도 돌려주지 않았다');
  assert.ok(r.costBreakdown, 'costBreakdown 이 없다 — 원본 계약이 바뀌었다');
  assert.ok(Number.isFinite(r.totalCostKrw), 'totalCostKrw 가 수가 아니다');
});

test('projectCost.ts 가 읽는 costBreakdown 키가 전부 실재한다', async () => {
  const keys = new Set(Object.keys((await sampleEarthwork()).costBreakdown));
  const read = [...SOURCE.matchAll(/r\.costBreakdown\.(\w+)/g)].map((m) => m[1]);
  assert.ok(read.length >= 4, 'projectCost.ts 에서 costBreakdown 참조를 찾지 못했다');
  for (const name of read) {
    assert.ok(keys.has(name),
      `projectCost.ts 가 costBreakdown.${name} 을 읽는데 원본에는 없다 `
      + `(있는 것: ${[...keys].join(', ')}) — 이 오탈자는 NaN 으로 흘러 화면에 「-」로만 보인다`);
  }
});

test('옮겨 적은 비용 필드가 전부 유한한 수다 — NaN 은 화면에서 「-」로 숨는다', async () => {
  const r = await sampleEarthwork();
  const b = r.costBreakdown;
  const mapped = {
    earthworkKrw: b.earthworkKrw,
    wallKrw: b.wallKrw,
    foundationKrw: b.foundationKrw,
    buildingKrw: b.buildingKrw,
    overheadKrw: b.overheadKrw,
    totalKrw: r.totalCostKrw,
  };
  for (const [name, value] of Object.entries(mapped)) {
    assert.ok(Number.isFinite(value), `${name} 이 유한한 수가 아니다: ${String(value)}`);
  }
  // 부분의 합이 전체와 맞는지 — 옮겨 적기가 한 항목을 통째로 빠뜨리면 여기서 걸린다.
  const parts = b.earthworkKrw + b.wallKrw + b.foundationKrw + b.buildingKrw + b.overheadKrw;
  assert.ok(Math.abs(parts - r.totalCostKrw) <= Math.max(2, r.totalCostKrw * 1e-6),
    `항목 합(${parts})과 소계(${r.totalCostKrw})가 어긋난다`);
});
