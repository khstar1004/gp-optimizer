/**
 * 작전 보고서 마크다운 생성(report.ts) 단위시험.
 *
 * `buildReportMarkdown`는 순수 함수(문자열 조립)인데, `computeProjectCost`/`fmtKrw`/
 * `DIFFICULTY_LABELS`를 Cesium 커플링된 `placement.ts`에서 가져오고 있어서 Node 밖에서
 * 임포트가 불가능했다 — projectCost.ts(v37)로 이미 분리된 그 셋을 여기서도 직접
 * 가져오도록 바꿔 해결([[gp-digital-twin-demo]] 참고).
 *
 * 가장 버그가 나기 쉬운 부분은 **섹션 번호가 조건부로 밀리는 로직**이다 — 훈련근거
 * 섹션이 끼어들면 그 뒤 모든 섹션 번호가 +1 밀려야 하는데, 조건 하나만 놓쳐도 번호가
 * 안 맞는 보고서가 나간다. 그래서 이 시험은 번호 자체를 핵심으로 확인한다.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

(globalThis as Record<string, unknown>).__SCAFFOLDA_ENV__ ??= {
  VITE_OLLAMA_MODEL: 'test', VITE_OLLAMA_BASE_URL: '/ollama', MODE: 'test', DEV: false, PROD: false,
};
(globalThis as Record<string, unknown>).__KAIROS_ENV__ ??= {
  BASE_URL: '/', VITE_SUDO_OLLAMA_URL: '/ollama', VITE_SUDO_VLM_MODEL: 'test', VITE_SUDO_ASSISTANT_MODEL: 'test',
  MODE: 'test', DEV: false, PROD: false,
};
type ReportModule = typeof import('../src/runtime/report');
let modPromise: Promise<ReportModule> | null = null;
const loadMod = () => (modPromise ??= import('../src/runtime/report'));

test('빈 컨텍스트도 죽지 않고 기본 골격(1~4절+부록)을 낸다', async () => {
  const { buildReportMarkdown } = await loadMod();
  const md = buildReportMarkdown({});
  assert.match(md, /^# .+ 작전 보고서/);
  assert.match(md, /합성 데모 데이터/);
  assert.match(md, /## 1\. 감시 태세/);
  assert.doesNotMatch(md, /훈련근거 기반 시설 소요/);
  assert.match(md, /## 2\. 시설 배치 · 사업비/);
  assert.match(md, /배치된 시설이 없습니다\./);
  assert.match(md, /## 3\. 침투 축선 판단/);
  assert.match(md, /축선 분석 결과가 없습니다\./);
  assert.match(md, /## 4\. 전장정보분석 \(IPB\)/);
  assert.match(md, /도출된 전술 도식이 없습니다\./);
  assert.doesNotMatch(md, /지형정보 분석/);
  assert.doesNotMatch(md, /화력운용 판단/);
  assert.doesNotMatch(md, /참모 결심 판단/);
  assert.match(md, /## 부록 — 작전 워크플로 단계/);
  assert.match(md, /총 6단계/);
});

test('훈련근거 섹션이 끼어들면 그 뒤 모든 섹션 번호가 하나씩 밀린다', async () => {
  const { buildReportMarkdown } = await loadMod();
  const trainingEvidence = {
    dataset: { name: '합성셋 A' }, fingerprint: 'fp-1', sessionLimit: 12,
    hotspot: {
      id: 'H1', label: '남측 진입로', recurrence: { sessions: 9, total: 12 }, confidence: 82,
      trainingLossRate: 3.4, dwellP90Sec: 240, responseP90Sec: 180, commsGapSec: 60,
    },
    needs: [{ label: '조기경보', priority: '높음', facilityTypeId: 'security-zone', selectedCandidate: { label: '남측 초소' } }],
  };
  const md = buildReportMarkdown({ trainingEvidence, intel: fakeIntel(), fires: fakeFires() });
  assert.match(md, /## 2\. 훈련근거 기반 시설 소요/);
  assert.match(md, /## 3\. 시설 배치 · 사업비/);
  assert.match(md, /## 4\. 침투 축선 판단/);
  assert.match(md, /## 5\. 전장정보분석 \(IPB\)/);
  assert.match(md, /## 6\. 지형정보 분석 \(KAIROS\)/);
  assert.match(md, /## 7\. 화력운용 판단 \(KAIROS 교리\)/);
});

test('시설 배치가 있으면 표와 사업비 합계가 실린다', async () => {
  const { buildReportMarkdown } = await loadMod();
  const item = {
    spec: { name: '생활관' }, capacity: 40, floors: 2,
    dims: { areaM2: 280 },
    cost: { difficulty: 'moderate', totalKrw: 500_000_000 },
  };
  const md = buildReportMarkdown({ placerItems: [item] });
  assert.match(md, /\| 생활관 \| 40 \| 2 \| 280 \| 보통 \|/);
  assert.match(md, /총사업비/);
});

test('기동수단의 한계경사와 축선 경사가 같으면(경계값) 기동 가능으로 판정한다', async () => {
  const { buildReportMarkdown } = await loadMod();
  const route = { route: { name: '축선 1' }, totalM: 4200, slopeP95: 38, maxSlope: 40 };
  const md = buildReportMarkdown({ routes: [route], infilMode: 'walk' }); // walk 한계경사 38°
  const row = md.split('\n').find((l) => l.includes('축선 1'));
  assert.ok(row);
  assert.match(row, /가능/);
});

test('경사가 한계를 넘으면 기동 불가로 판정한다', async () => {
  const { buildReportMarkdown } = await loadMod();
  const route = { route: { name: '축선 1' }, totalM: 4200, slopeP95: 38.1, maxSlope: 40 };
  const md = buildReportMarkdown({ routes: [route], infilMode: 'walk' });
  const row = md.split('\n').find((l) => l.includes('축선 1'));
  assert.ok(row);
  assert.match(row, /불가/);
});

test('화력운용 판단에는 부수피해 충족/미달이 함께 실린다', async () => {
  const { buildReportMarkdown } = await loadMod();
  const md = buildReportMarkdown({ fires: fakeFires() });
  assert.match(md, /화력운용 판단/);
  assert.match(md, /K9 105m\(충족\)/);
  assert.match(md, /K105 40m\(미달\)/);
});

test('오류난 결심 시나리오는 조용히 건너뛴다', async () => {
  const { buildReportMarkdown } = await loadMod();
  const decisions = [
    { id: 1, output: { error: '실패' } },
    { id: 2, output: { title: '방책 A', summary: '요약', metrics: [{ label: 'X', value: '1' }] } },
  ];
  const md = buildReportMarkdown({ decisions });
  assert.doesNotMatch(md, /### 1\./);
  assert.match(md, /### 2\. 방책 A/);
});

test('renderReportHtml 은 원본 sanitize+render 파이프라인을 그대로 태워 문자열을 낸다', async () => {
  const { buildReportMarkdown, renderReportHtml } = await loadMod();
  const html = renderReportHtml(buildReportMarkdown({}));
  assert.equal(typeof html, 'string');
  assert.ok(html.length > 0);
});

function fakeIntel() {
  return {
    terrainClass: '산악', minElevation: 620, maxElevation: 1025, reliefMeters: 405,
    meanSlopeDegrees: 18.4, steepSampleRatio: 0.32,
    meanVisibilityRatio: 0.55, meanConcealmentScore: 0.4, meanExposureScore: 0.3,
    markers: [1, 2], firePlans: [1], losSegments: [1, 2, 3],
  };
}

function fakeFires() {
  return {
    verdict: 'GO', rangeBand: '중거리', terrainLabel: '산악',
    options: [{ fireUnit: 'K9', effects: { '10': '2발', '20': '4발', '30': '6발' } }],
    safetyMarginM: 150,
    collateral: [
      { munition: 'K9', requiredM: 105, safe: true },
      { munition: 'K105', requiredM: 40, safe: false },
    ],
  };
}
