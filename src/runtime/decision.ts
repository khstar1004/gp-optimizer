// @ts-nocheck
/**
 * 참모 결심 판단 — KAIROS 원본 결심엔진(sudoDecisionEngine, 3,013줄)을 GP 상황으로 구동한다.
 *
 * 원본 `getSudoDecisionOutput(scenarioId, inputs, perception)` 는 14개 시나리오를 갖고 있고
 * 각각 `{title, summary, metrics, steps, table, sourceTables}` 를 낸다 — 서술·판단근거·원표까지.
 * 이 파일은 GP 데모 상태(지형분석·침투·IPB·배치·ITS 도로)를 원본 입력 계약에 맞춰
 * 옮기기만 하고, 판단 규칙은 한 줄도 다시 쓰지 않는다.
 */
import {
  getSudoDecisionOutput,
  normalizeSudoDecisionInputs,
  defaultSudoDecisionInputs,
  buildSudoCollateralMunitionsFromCde,
  SUDO_FIRING_UNIT_SOURCE_ROWS,
} from '../../js/vendor/kairos/kairos.bundle';
import { SITE, MOVE_MODES } from './data';
import { distM } from './geo';

export { getSudoDecisionOutput };

/** 원본 시나리오 목록 — id 는 원본 switch 분기와 같다 */
export const DECISION_SCENARIOS = [
  { id: 1, label: '드론 표적식별' },
  { id: 2, label: '표적성질' },
  { id: 3, label: '표적 규모' },
  { id: 4, label: '전투서열' },
  { id: 5, label: '부수피해' },
  { id: 6, label: 'AI 취약점 보조판단' },
  { id: 7, label: '탄종/발수' },
  { id: 8, label: '사격부대' },
  { id: 9, label: '사태분석도(COA)' },
  { id: 10, label: '감시자산 재배치' },
  { id: 11, label: '타격방법' },
  { id: 12, label: '통합화력운용도표' },
  { id: 13, label: 'ARTAS 대포병탐지 R/D' },
  { id: 14, label: '타격결과 평가(BDA)' },
];

/** KAIROS 지형분류 라벨 → 산림/개활 비율 (원본 forestPercent/openTerrainPercent 입력) */
function terrainSplit(intel) {
  if (intel && Number.isFinite(intel.forestSampleRatio)) {
    const forest = Math.round(intel.forestSampleRatio * 100);
    return { forestPercent: forest, openTerrainPercent: 100 - forest };
  }
  // 지형분석 전이면 분류 라벨로 근사
  const label = intel?.terrainClass ?? '';
  if (/험준|산지|산림/.test(label)) return { forestPercent: 70, openTerrainPercent: 30 };
  if (/구릉/.test(label)) return { forestPercent: 45, openTerrainPercent: 55 };
  return { forestPercent: 20, openTerrainPercent: 80 };
}

/**
 * GP 현재 상태 → 원본 결심 입력.
 *
 * @param ctx.intel        KAIROS 지형분석 결과 (runtime/terrainIntel.ts runAnalysis)
 * @param ctx.routeScores  IPB scoreRoutes 결과 (coverage/gap/fireLink/roadScore)
 * @param ctx.infilUnits   침투 유닛
 * @param ctx.infilMode    이동수단
 * @param ctx.placerItems  배치 시설 (최근접 아군 시설 = 부수피해 기준)
 * @param ctx.roadInfo     ITS 실도로 집계 (runtime/roads.ts)
 * @param ctx.desiredDamagePercent 요망효과 (10/20/30)
 */
export function buildInputs(ctx = {}) {
  const {
    intel = null, routeScores = [], infilUnits = [], infilMode = 'walk',
    placerItems = [], roadInfo = null, desiredDamagePercent = 30,
  } = ctx;

  const mode = MOVE_MODES[infilMode] ?? MOVE_MODES.walk;
  const best = routeScores[0] ?? null;

  // 표적: 최우선 위협축선의 침투 제대
  const targetLabel = best
    ? `${best.rd.route.name.split(' — ')[0]} 침투제대 (${mode.name.split(' ')[0]})`
    : `${SITE.name} 접근 침투제대`;

  // 최근접 민간/아군 시설 — 원본은 부수피해 안전거리 판정에 쓴다
  const targetPoint = best ? best.rd.pts[Math.floor(best.rd.pts.length * 0.82)] : null;
  const nearestCivilianM = targetPoint && placerItems.length
    ? Math.round(Math.min(...placerItems.map((it) => distM(it.lon, it.lat, targetPoint.lon, targetPoint.lat))))
    : (targetPoint ? Math.round(distM(SITE.gp.lon, SITE.gp.lat, targetPoint.lon, targetPoint.lat)) : 420);

  // 기동로 후보 — IPB 채점 결과를 원본 routeOptions 계약으로
  const routeOptions = routeScores.length
    ? routeScores.map((r) => ({
      option: r.rd.route.name.split(' — ')[0],
      route: r.rd.route.name,
      coverage: Math.round(r.coverage),
      gap: Math.round(r.gap),
      fireLinkScore: Math.round(r.fireLink),
    }))
    : defaultSudoDecisionInputs.routeOptions;

  // 도로정보 — ITS 실측이 있으면 그 집계로, 없으면 원본 표
  const roadInfoRows = roadInfo?.roads?.length
    ? roadInfo.roads.slice(0, 8).map((r) => ({
      road: r.roadName,
      lanes: '실측(ITS)',
      bridge: '-',
      judgment: `평균 ${r.avgSpeed}km/h · 링크 ${r.links}개`,
      useProbability: r.roadScore,
    }))
    : defaultSudoDecisionInputs.roadInfoRows;

  const { forestPercent, openTerrainPercent } = terrainSplit(intel);

  return normalizeSudoDecisionInputs({
    ...defaultSudoDecisionInputs,
    targetLabel,
    observedVehicleCount: Math.max(1, infilUnits.length),
    marchColumnLengthM: best ? Math.round(best.rd.totalM * 0.08) : 350,
    marchRoute: best ? best.rd.route.name : `${SITE.name} 북측 접근축`,
    targetSpeedKph: Math.round(mode.speed * 3.6),
    forestPercent,
    openTerrainPercent,
    desiredDamagePercent,
    nearestCivilianM,
    collateralMunitions: buildSudoCollateralMunitionsFromCde(),
    routeOptions,
    roadInfoRows,
    fireUnits: SUDO_FIRING_UNIT_SOURCE_ROWS,
  });
}

/** 시나리오 1개 실행 */
export function runScenario(scenarioId, inputs) {
  try {
    return getSudoDecisionOutput(scenarioId, inputs) ?? null;
  } catch (error) {
    return { title: `시나리오 ${scenarioId}`, error: error.message };
  }
}

/** 14개 전체 실행 */
export function runAll(inputs) {
  return DECISION_SCENARIOS.map((s) => ({ ...s, output: runScenario(s.id, inputs) }))
    .filter((s) => s.output);
}

