// @ts-nocheck
/**
 * GP 작전 평가보고서 — 배치최적화 · 적 이동경로 · 자산배치 · 화력결과를 LLM이 평가한다.
 *
 * VISTA 지형 브리핑과 같은 방식이다 (원본: terrain-3d/viewer.ts + terrainIntel.ts):
 *   ① 엔진이 만든 구조화 산출물을 JSON 페이로드로 묶고
 *   ② 한국어 지시 + 엄격한 JSON 스키마를 붙여
 *   ③ `POST {ollamaBaseUrl}/api/chat  {model, stream:false, format:<schema>, messages}` 로 보내고
 *   ④ 응답을 파싱해 카드로 렌더한다.
 *
 * 다른 점은 페이로드뿐이다. VISTA는 지형만 넣지만 여기서는 GP 데모가 실제로 계산한
 * 네 가지 산출물을 함께 넣는다 — 전부 원본 엔진 결과이며 LLM이 지어내지 않는다:
 *   배치최적화  Scaffolda generatePlacement (규칙 검증·배치점수·도로) + computeEarthwork 동별 비용
 *   이동경로    KAIROS scoreRouteOption 축선 채점 + NAI/DP/TAI + 경사 P95 기동판정
 *   자산배치    위협권(FACILITY_THREAT_PROFILES) + 드론 진출한계 + 감시 커버리지
 *   화력결과    KAIROS 탄약효과표·부수피해 CDE·사격부대 판단
 */
import { SITE, MOVE_MODES } from './data';
import { DIFFICULTY_LABELS, computeProjectCost, fmtKrw } from './projectCost';

/** 평가보고서 응답 스키마 — VISTA OLLAMA_TERRAIN_REPORT_SCHEMA 와 같은 형식의 GP 확장판 */
export const GP_EVAL_REPORT_SCHEMA = Object.freeze({
  type: 'object',
  additionalProperties: false,
  required: [
    'executiveSummary', 'placementAssessment', 'routeThreatAssessment',
    'firesAssessment', 'risks', 'recommendations', 'verdict',
  ],
  properties: {
    executiveSummary: { type: 'string' },
    placementAssessment: { type: 'array', minItems: 1, maxItems: 5, items: { type: 'string' } },
    routeThreatAssessment: { type: 'array', minItems: 1, maxItems: 5, items: { type: 'string' } },
    firesAssessment: { type: 'array', minItems: 1, maxItems: 5, items: { type: 'string' } },
    risks: { type: 'array', minItems: 1, maxItems: 5, items: { type: 'string' } },
    recommendations: {
      type: 'array', minItems: 1, maxItems: 6,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['title', 'action', 'priority'],
        properties: {
          title: { type: 'string' },
          action: { type: 'string' },
          priority: { type: 'string', enum: ['높음', '보통', '낮음'] },
        },
      },
    },
    verdict: {
      type: 'object',
      additionalProperties: false,
      required: ['grade', 'rationale'],
      properties: {
        grade: { type: 'string', enum: ['적합', '보완필요', '부적합'] },
        rationale: { type: 'string' },
      },
    },
  },
});

const round = (v, d = 2) => (Number.isFinite(v) ? Number(v.toFixed(d)) : null);

/** 현재 GP 상태 → LLM에 넘길 구조화 페이로드 (전부 엔진 계산값) */
export function buildEvalPayload(ctx = {}) {
  const {
    placement = null, placerItems = [], routeScores = [], ipbItems = [],
    intel = null, fires = null, threat = null, infilMode = 'walk',
    towerHeight = 0, coveragePct = null, roadInfo = null, gapClosure = null,
  } = ctx;

  const mode = MOVE_MODES[infilMode] ?? MOVE_MODES.walk;
  const cost = placerItems.length ? computeProjectCost(placerItems) : null;

  return {
    site: {
      name: SITE.name,
      lon: round(SITE.gp.lon, 5), lat: round(SITE.gp.lat, 5),
      towerHeightM: Math.round(towerHeight),
      observedCoveragePercent: coveragePct,
    },

    // ── 배치최적화 (Scaffolda 엔진 산출) ──
    placement: placement ? {
      engine: 'Scaffolda generatePlacement',
      placedCount: placement.summary?.placedCount ?? null,
      unitCount: placement.summary?.unitCount ?? null,
      totalScore: placement.totalScore ?? null,
      scoreMeaning: '지형난이도+건물친화도+산포 합. 낮을수록 좋음',
      terrainAware: placement.summary?.terrainAware ?? null,
      autoRoadCount: placement.roads?.length ?? 0,
      parkingCount: placement.parking?.length ?? 0,
      rules: (placement.summary?.rules ?? []).map((r) => ({ label: r.label, ok: r.ok, detail: r.detail ?? null })),
      warnings: placement.warnings ?? [],
      notes: placement.notes ?? [],
    } : null,

    // ── 동별 토공·비용 (Scaffolda computeEarthwork) ──
    // 동별 상세는 12동까지만 (프롬프트 비대화 방지 — 추론 시간에 직접 영향)
    buildings: placerItems.slice(0, 12).map((it) => ({
      name: it.spec.name,
      capacity: it.capacity,
      floors: it.floors,
      protection: it.protection,
      areaM2: it.dims.areaM2,
      padElevationM: round(it.cost.pad, 1),
      cutM3: Math.round(it.cost.cutM3),
      fillM3: Math.round(it.cost.fillM3),
      retainingWallM2: Math.round(it.cost.retainingWallAreaM2 ?? 0),
      difficulty: DIFFICULTY_LABELS[it.cost.difficulty] ?? it.cost.difficulty,
      sitePerPersonKrw: Math.round(it.cost.siteCostPerPersonKrw ?? 0),
      totalKrw: Math.round(it.cost.totalKrw),
    })),
    projectCost: cost ? {
      constructionKrw: Math.round(cost.constructionKrw),
      designFeeKrw: Math.round(cost.designFeeKrw),
      permitFeeKrw: Math.round(cost.permitFeeKrw),
      totalKrw: Math.round(cost.totalKrw),
      totalText: fmtKrw(cost.totalKrw),
      floorAreaM2: round(cost.floorAreaM2, 1),
    } : null,

    // ── 적 이동경로 분석 (KAIROS scoreRouteOption) ──
    routeAnalysis: {
      engine: 'KAIROS scoreRouteOption (가중치 커버0.34/공백0.26/화력연계0.18/기동로0.22)',
      movementMode: mode.name,
      maxSlopeDeg: mode.maxSlopeDeg,
      roadScoreSource: roadInfo ? `ITS 실시간 소통정보 ${roadInfo.totalLinks}링크` : '축선 경사 대체',
      routes: routeScores.map((r) => ({
        name: r.rd.route.name,
        totalKm: round(r.rd.totalM / 1000, 2),
        slopeP95Deg: round(r.rd.slopeP95, 1),
        maxSlopeDeg: round(r.rd.maxSlope, 1),
        feasible: r.feasible,
        score: r.score,
        coveragePercent: Math.round(r.coverage),
        surveillanceGapPercent: Math.round(r.gap),
        fireLinkPercent: Math.round(r.fireLink),
        roadScore: r.roadScore,
      })),
    },
    ipbGraphics: ipbItems.map((i) => ({ kind: i.kind, n: i.n, note: i.note ?? null })),

    // ── 지형정보 (KAIROS terrainIntel) ──
    terrain: intel ? {
      terrainClass: intel.terrainClass,
      minElevationM: Math.round(intel.minElevation),
      maxElevationM: Math.round(intel.maxElevation),
      reliefM: Math.round(intel.reliefMeters),
      meanSlopeDeg: round(intel.meanSlopeDegrees, 1),
      steepRatio: round(intel.steepSampleRatio, 3),
      forestRatio: round(intel.forestSampleRatio, 3),
      meanVisibilityRatio: round(intel.meanVisibilityRatio, 3),
      meanConcealmentScore: round(intel.meanConcealmentScore, 3),
      meanExposureScore: round(intel.meanExposureScore, 3),
      markerCount: intel.markers?.length ?? 0,
      firePlanCount: intel.firePlans?.length ?? 0,
    } : null,

    // ── 자산배치 위협권 (VISTA threatCoverage) ──
    threatEnvelope: threat ? {
      placedSystems: threat.placed?.map((p) => ({
        system: p.profile.className, side: p.side, rangeKm: p.profile.range,
        detectionArcDeg: p.profile.detectionArcDegrees,
      })) ?? [],
      droneEgress: threat.envelope ? {
        originInsideThreat: threat.envelope.originInside,
        limitKm: round(threat.envelope.limitedByM / 1000, 1),
        limitingSystem: threat.envelope.threat?.className ?? null,
      } : null,
    } : null,

    // ── 감시공백 보완안 (엔진이 계산한 부감시소 위치와 개선폭) ──
    gapClosureProposal: gapClosure?.ok ? {
      targetRoute: gapClosure.route.name,
      postElevationM: gapClosure.post.elevationM,
      postHeightM: gapClosure.postHeightM,
      distanceFromGpM: gapClosure.post.rangeM,
      insideEnemyThreatRing: gapClosure.post.inThreat,
      routeCoverageBeforePercent: gapClosure.coverage.beforePercent,
      routeCoverageAfterPercent: gapClosure.coverage.afterPercent,
      gapPointsTotal: gapClosure.coverage.gapPointsTotal,
      gapPointsClosedEstimate: gapClosure.coverage.gapPointsClosedEstimate,
      candidatesEvaluated: gapClosure.candidates.length,
    } : null,

    // ── 화력결과 (KAIROS 교리) ──
    fires: fires ? {
      engine: 'KAIROS 탄약효과표·부수피해 CDE·사격부대 제원',
      verdict: fires.verdict,
      rangeBand: fires.rangeBand,
      terrainLabel: fires.terrainLabel,
      munitionOptions: (fires.options ?? []).map((o) => ({
        fireUnit: o.fireUnit, targetType: o.targetType, effects: o.effects,
      })),
      safetyMarginM: fires.safetyMarginM,
      collateral: (fires.collateral ?? []).map((c) => ({
        munition: c.munition, damageRadiusM: c.radiusM,
        requiredSeparationM: c.requiredM, satisfied: c.safe,
      })),
      firingUnits: (fires.units ?? []).map((u) => ({
        unit: u.unit, maxRangeKm: u.maxRangeKm, firable: u.firable,
        civilianSafe: u.civilianSafe, ammo: u.ammoSummary, csr: u.csr,
      })),
    } : null,
  };
}

/** VISTA buildTerrainVlmPrompt 와 같은 구성 — 역할·근거제한·언어·스키마 지시 + 구조화 페이로드 */
export function buildEvalPrompt(payload) {
  return [
    '당신은 아군 GP(감시초소)를 방어하는 부대의 작전참모다.',
    '아래는 시뮬레이션 엔진이 산출한 구조화 결과다. 배치최적화, 적 이동경로 분석,',
    '자산배치 위협권, 화력운용 판단이 모두 들어 있다.',
    '',
    '용어 정의 — 반드시 이 의미로 해석한다:',
    '- routeAnalysis.routes 는 **적이 GP로 침투해 오는 축선**이다. 아군 접근로가 아니다.',
    '- coveragePercent 는 그 축선 중 **아군 감시탑이 관측 가능한 비율**이다.',
    '  높을수록 아군에게 유리하고 적에게 불리하다.',
    '- surveillanceGapPercent 는 축선 종말부(목표 근접부)의 **아군 감시 공백 비율**이다.',
    '  높을수록 적이 은밀히 접근할 수 있어 아군에게 위험하다.',
    '- fireLinkPercent 는 축선 중 **아군 화력으로 교전 가능한 구간 비율**이다.',
    '- feasible=false 인 축선은 그 이동수단으로는 적이 기동할 수 없다는 뜻이다.',
    '  즉 아군이 감시·화력을 집중할 필요가 낮다.',
    '- score 가 높은 축선일수록 **아군이 대응하기 유리한 축선**이다.',
    '  따라서 위협이 큰 축선은 score 가 낮고 감시 공백이 큰 축선이다.',
    '- threatEnvelope 의 side="red" 는 적 방공 자산이다. 그 사거리 안에서는 아군 드론·항공이 위험하다.',
    '- fires 는 **아군이 그 침투 제대를 타격할 때**의 탄종·발수·부수피해 판단이다.',
    '- gapClosureProposal 은 엔진이 이미 계산해 놓은 **감시공백 보완안**이다.',
    '  routeCoverageBefore/After 는 그 부감시소를 세웠을 때의 관측률 변화 추정치다.',
    '  보완안이 있으면 그 개선폭을 평가에 반영하고, 여전히 남는 취약점을 짚어라.',
    '- buildings / projectCost 는 **아군 GP 시설**의 토공·공사비다.',
    '',
    '규칙:',
    '- 제공된 수치와 판정만 근거로 쓴다. 데이터에 없는 사실을 지어내지 않는다.',
    '- 각 항목은 반드시 근거 수치를 인용한다 (예: "경사 P95 24.2°", "부수피해 HE 392m").',
    '- 배치·경로·화력을 서로 연결해 평가한다. 단순 나열이 아니라 인과를 쓴다.',
    '- 가장 위협적인 축선(감시 공백이 크거나 화력연계가 낮은 축선)을 짚고,',
    '  그 축선에 대해 배치·감시·화력이 충분한지 평가한다.',
    '- 판정(verdict)은 데이터가 뒷받침하는 수준에서만 내린다.',
    '- 한국어로 답하고 제공된 JSON 스키마를 엄격히 따른다.',
    '',
    '엔진 산출물:',
    JSON.stringify(payload, null, 2),
  ].join('\n');
}

/** VISTA parseTerrainVlmReport 와 같은 방어적 파싱 */
export function parseEvalReport(responseText) {
  try {
    const parsed = JSON.parse(responseText);
    if (parsed && typeof parsed === 'object') return parsed;
  } catch { /* 스키마 강제에도 실패하면 원문을 요약으로 */ }
  return {
    executiveSummary: String(responseText ?? '').trim(),
    placementAssessment: [], routeThreatAssessment: [], firesAssessment: [],
    risks: [], recommendations: [], verdict: null,
  };
}

export class EvalReportError extends Error {
  constructor(message, cause) { super(message); this.name = 'EvalReportError'; this.cause = cause; }
}

/**
 * 평가보고서 생성 — VISTA 와 동일한 Ollama 호출 계약.
 * @param opts.model    Ollama 모델명
 * @param opts.baseUrl  기본 '/ollama' (server.cts 프록시)
 */
/**
 * 모델 예열 — 콜드스타트(9GB급 로딩)를 평가 요청 밖으로 빼낸다.
 * 이걸 안 하면 첫 요청이 모델 로딩까지 떠안아 수 분이 걸린다.
 */
export async function warmModel(model, baseUrl = '/ollama') {
  try {
    await fetch(`${baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model, stream: false, keep_alive: '10m',
        options: { num_predict: 1 },
        messages: [{ role: 'user', content: 'ok' }],
      }),
    });
    return true;
  } catch { return false; }
}

export async function generateEvalReport(payload, opts = {}) {
  const { model = 'gemma4:e4b', baseUrl = '/ollama', signal = null } = opts;
  const prompt = buildEvalPrompt(payload);

  let response;
  try {
    response = await fetch(`${baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal,
      body: JSON.stringify({
        model,
        stream: false,
        keep_alive: '10m',
        format: GP_EVAL_REPORT_SCHEMA,
        options: { temperature: 0.2 },
        messages: [{ role: 'user', content: prompt }],
      }),
    });
  } catch (error) {
    throw new EvalReportError('로컬 Ollama에 연결하지 못했습니다. `ollama serve` 실행 여부를 확인하세요.', error);
  }

  const json = await response.json().catch(() => null);
  if (!response.ok) {
    throw new EvalReportError(json?.error || `Ollama 요청 실패 (${response.status})`);
  }
  const content = json?.message?.content;
  if (typeof content !== 'string' || !content.trim()) {
    throw new EvalReportError('평가 응답 본문이 비어 있습니다.');
  }
  return { report: parseEvalReport(content), model, promptChars: prompt.length };
}

/** 사용 가능한 Ollama 모델 목록 */
export async function listOllamaModels(baseUrl = '/ollama') {
  try {
    const res = await fetch(`${baseUrl}/api/tags`);
    const json = await res.json();
    return (json?.models ?? []).map((m) => m.name).filter(Boolean);
  } catch {
    return [];
  }
}

