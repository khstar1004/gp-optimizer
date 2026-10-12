/**
 * GP 작전 평가보고서 페이로드/프롬프트/파싱(evalReport.ts) 단위시험.
 *
 * `buildEvalPayload`/`buildEvalPrompt`/`parseEvalReport`는 순수 함수다(LLM 호출은
 * `generateEvalReport`가 따로 맡는다 — 네트워크라 여기서는 시험하지 않는다). 이 파일도
 * `./projectCost`(→ Scaffolda 번들)를 가져오므로 같은 __SCAFFOLDA_ENV__ 스텁 + 지연
 * 동적 import 가 필요하다(projectCost.test.ts 상단 주석 참고 — static import 호이스팅
 * 때문에 스텁보다 먼저 실행돼 죽는다).
 */
import test from 'node:test';
import assert from 'node:assert/strict';

(globalThis as Record<string, unknown>).__SCAFFOLDA_ENV__ ??= {
  VITE_OLLAMA_MODEL: 'test', VITE_OLLAMA_BASE_URL: '/ollama',
  MODE: 'test', DEV: false, PROD: false,
};
type EvalReportModule = typeof import('../src/runtime/evalReport');
let modPromise: Promise<EvalReportModule> | null = null;
const loadMod = () => (modPromise ??= import('../src/runtime/evalReport'));

// ── buildEvalPayload ────────────────────────────────────────────────────

test('컨텍스트가 텅 비어도 죽지 않고 널 안전한 기본값을 낸다', async () => {
  const { buildEvalPayload } = await loadMod();
  const payload = buildEvalPayload({});
  assert.equal(payload.placement, null);
  assert.deepEqual(payload.buildings, []);
  assert.equal(payload.projectCost, null);
  assert.equal(payload.terrain, null);
  assert.equal(payload.threatEnvelope, null);
  assert.equal(payload.gapClosureProposal, null);
  assert.equal(payload.fires, null);
  assert.equal(payload.routeAnalysis.movementMode, '도보 침투 (급속행군)'); // 기본 infilMode='walk'
  assert.deepEqual(payload.routeAnalysis.routes, []);
});

test('이동수단을 지정하면 그 모드의 이름·최대경사가 실린다', async () => {
  const { buildEvalPayload } = await loadMod();
  const payload = buildEvalPayload({ infilMode: 'vehicle' });
  assert.equal(payload.routeAnalysis.movementMode, '차량 침투 (야지기동)');
  assert.equal(payload.routeAnalysis.maxSlopeDeg, 24);
});

test('시설 배치가 있으면 동별 토공·난이도가 반올림돼 실리고 사업비가 계산된다', async () => {
  const { buildEvalPayload } = await loadMod();
  const item = {
    spec: { name: '생활관', category: 'living', id: 'living-zone' },
    capacity: 40, floors: 2, protection: 'none',
    dims: { areaM2: 280.4 },
    cost: {
      pad: 101.234, cutM3: 55.6, fillM3: 12.2, retainingWallAreaM2: 8.4,
      difficulty: 'moderate', siteCostPerPersonKrw: 1_234_567.8, totalKrw: 999_000_000,
    },
  };
  const payload = buildEvalPayload({ placerItems: [item] });
  assert.equal(payload.buildings.length, 1);
  const b = payload.buildings[0];
  assert.equal(b.name, '생활관');
  assert.equal(b.padElevationM, 101.2);
  assert.equal(b.cutM3, 56); // Math.round
  assert.equal(b.difficulty, '보통'); // DIFFICULTY_LABELS.moderate
  assert.ok(payload.projectCost, '시설이 있는데 projectCost 가 계산되지 않았다');
  assert.equal(typeof payload.projectCost.totalText, 'string');
});

test('12동 넘게 배치해도 프롬프트 비대화 방지로 12동까지만 상세를 싣는다', async () => {
  const { buildEvalPayload } = await loadMod();
  const mk = (i: number) => ({
    spec: { name: `동${i}`, category: 'living', id: 'living-zone' },
    capacity: 10, floors: 1, protection: 'none',
    dims: { areaM2: 100 },
    cost: { pad: 100, cutM3: 1, fillM3: 1, difficulty: 'low', totalKrw: 1000 },
  });
  const items = Array.from({ length: 15 }, (_, i) => mk(i));
  const payload = buildEvalPayload({ placerItems: items });
  assert.equal(payload.buildings.length, 12);
});

test('감시공백 보완안이 없으면(ok=false 또는 미제공) null 이다', async () => {
  const { buildEvalPayload } = await loadMod();
  assert.equal(buildEvalPayload({}).gapClosureProposal, null);
  assert.equal(buildEvalPayload({ gapClosure: { ok: false } }).gapClosureProposal, null);
});

test('감시공백 보완안이 있으면 개선폭이 그대로 옮겨진다', async () => {
  const { buildEvalPayload } = await loadMod();
  const gapClosure = {
    ok: true,
    route: { name: '축선 1' },
    post: { elevationM: 812, rangeM: 640, inThreat: false },
    postHeightM: 12,
    coverage: { beforePercent: 40, afterPercent: 78, gapPointsTotal: 20, gapPointsClosedEstimate: 12 },
    candidates: [1, 2, 3],
  };
  const payload = buildEvalPayload({ gapClosure });
  assert.ok(payload.gapClosureProposal);
  assert.equal(payload.gapClosureProposal.targetRoute, '축선 1');
  assert.equal(payload.gapClosureProposal.routeCoverageAfterPercent, 78);
  assert.equal(payload.gapClosureProposal.candidatesEvaluated, 3);
});

// ── buildEvalPrompt ─────────────────────────────────────────────────────

test('프롬프트는 역할 지시와 페이로드 JSON을 함께 담는다', async () => {
  const { buildEvalPayload, buildEvalPrompt } = await loadMod();
  const payload = buildEvalPayload({});
  const prompt = buildEvalPrompt(payload);
  assert.match(prompt, /작전참모/);
  assert.match(prompt, /한국어로 답하고/);
  assert.ok(prompt.includes(JSON.stringify(payload, null, 2)));
});

// ── parseEvalReport ─────────────────────────────────────────────────────

test('유효한 JSON 객체는 그대로 돌려준다', async () => {
  const { parseEvalReport } = await loadMod();
  const obj = { executiveSummary: '요약', verdict: { grade: '적합', rationale: '근거' } };
  assert.deepEqual(parseEvalReport(JSON.stringify(obj)), obj);
});

test('JSON 이 아니면 원문을 요약으로 담은 방어적 기본형으로 떨어진다', async () => {
  const { parseEvalReport } = await loadMod();
  const r = parseEvalReport('이건 JSON이 아니다');
  assert.equal(r.executiveSummary, '이건 JSON이 아니다');
  assert.deepEqual(r.placementAssessment, []);
  assert.deepEqual(r.routeThreatAssessment, []);
  assert.deepEqual(r.risks, []);
  assert.deepEqual(r.recommendations, []);
  assert.equal(r.verdict, null);
});

test('빈 응답도 죽지 않고 빈 요약으로 떨어진다', async () => {
  const { parseEvalReport } = await loadMod();
  const r = parseEvalReport('');
  assert.equal(r.executiveSummary, '');
});

// ── EvalReportError ─────────────────────────────────────────────────────

test('EvalReportError 는 이름과 원인을 보존한다', async () => {
  const { EvalReportError } = await loadMod();
  const cause = new Error('원인');
  const err = new EvalReportError('실패', cause);
  assert.equal(err.name, 'EvalReportError');
  assert.equal(err.message, '실패');
  assert.equal(err.cause, cause);
  assert.ok(err instanceof Error);
});
