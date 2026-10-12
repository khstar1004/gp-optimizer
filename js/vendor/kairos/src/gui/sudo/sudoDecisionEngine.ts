import type {
  SudoDetectionBox,
  SudoMetric,
  SudoScenarioTable,
} from "./sudoScenarios";
import {
  SUDO_COLLATERAL_CDE_SOURCE_NAME,
  SUDO_COLLATERAL_CDE_SOURCE_PATH,
  buildSudoCollateralCdeSourceTable,
  buildSudoCollateralMunitionsFromCde,
} from "./sudoCollateralCdeTable";
import {
  SUDO_ASSISTANT_152MM_VULNERABILITY_CARDS,
  SUDO_ASSISTANT_240MM_VULNERABILITY_CARDS,
  SUDO_ASSISTANT_VULNERABILITY_SOURCE_NAME,
  buildSudoAssistantVulnerabilitySourceTables,
  getSudoAssistantVulnerabilityCardsForTarget,
} from "./sudoAssistantVulnerabilityIntel";
import {
  SUDO_BDA_SOURCE_NAME,
  buildSudoBdaSourceTable,
} from "./sudoBdaIntel";
import {
  SUDO_ORDER_CANDIDATE_SOURCE_NAME,
  SUDO_ORDER_CANDIDATE_SOURCE_ROWS,
  buildSudoOrderCandidateSourceTable,
} from "./sudoOrderCandidateIntel";
import {
  SUDO_FIRING_UNIT_SOURCE_NAME,
  buildSudoFiringUnitDecisionInputs,
  buildSudoFiringUnitSourceTable,
} from "./sudoFiringUnitIntel";
import {
  SUDO_FIRE_PLAN_SOURCE_NAME,
  buildSudoFirePlanDecisionInputs,
  buildSudoFirePlanSourceTable,
  buildSudoStrikeAssetDecisionInputs,
  buildSudoStrikeAssetSourceTable,
  buildSudoStrikeMethodSourceTable,
} from "./sudoFirePlanIntel";
import {
  SUDO_TARGET_CLASSIFICATION_SOURCE_NAME,
  buildSudoTargetClassificationEvidenceTable,
  buildSudoTargetClassificationMediaTable,
} from "./sudoTargetClassificationIntel";
import {
  SUDO_SCALE_SOURCE_NAME,
  buildSudoScaleDoctrineSourceTable,
} from "./sudoScaleIntel";
import {
  SUDO_DRONE_TARGET_SOURCE_NAME,
  buildSudoDroneIdentificationRowsForDecision,
  buildSudoDroneTargetSourceTable,
} from "./sudoDroneTargetIntel";
import {
  SUDO_MUNITION_EFFECT_SOURCE_NAME,
  buildSudoMunitionEffectDecisionRules,
  buildSudoMunitionEffectSourceTable,
} from "./sudoMunitionEffectIntel";
import {
  SUDO_RD_ASSESSMENT_SOURCE_NAME,
  buildSudoRdAssessmentDecisionInputs,
  buildSudoRdAssessmentSourceTable,
} from "./sudoRdAssessmentIntel";
import {
  SUDO_SITUATION_ANALYSIS_SOURCE_NAME,
  buildSudoDroneRedeploymentDecisionInputs,
  buildSudoDroneRedeploymentSourceTable,
  buildSudoRoadInfoDecisionInputs,
  buildSudoSituationAnalysisSourceTables,
  buildSudoSituationRouteDecisionInputs,
} from "./sudoSituationAnalysisIntel";

export interface SudoDecisionOutput {
  title: string;
  summary: string;
  metrics: SudoMetric[];
  steps: string[];
  table?: SudoScenarioTable;
  sourceTables?: SudoScenarioTable[];
}

export interface SudoPerceptionDecisionInput {
  label: string;
  confidence: number;
  summary?: string;
  detections: SudoDetectionBox[];
  model: string;
  frameCount: number;
}

interface FireUnitDecisionInput {
  unit: string;
  ammo: number;
  csr: number;
  distanceKm: number;
  maxRangeKm: number;
  status: "가능" | "대기" | "정비";
  rangeJudgment?: string;
  survival?: string;
  survivalGuaranteed?: boolean;
  ammoSummary?: string;
  civilianImpact?: string;
  civilianSafe?: boolean;
  combatStatus?: string;
  combatReady?: boolean;
}

interface FirePlanDecisionInput {
  time: string;
  asset: string;
  action: string;
  effect: string;
}

interface FireControlPointDecisionInput {
  nai: string;
  dp: string;
  tai: string;
}

interface ScaleAssessmentDecisionInput {
  observedVehicleCount: number;
  marchColumnLengthM: number;
  marchRoute: string;
}

interface CollateralMunitionDecisionInput {
  munition: string;
  radiusM: number;
}

interface OrderCandidateDecisionInput {
  unit: string;
  weapon: string;
  distanceKm: number;
  guns: number;
  directionMatchPercent: number;
  coordinate?: string;
  targetCoordinate?: string;
  equipment?: string;
  grade?: string;
  sourceRank?: string;
}

interface RouteOptionDecisionInput {
  option: string;
  route: string;
  coverage: number;
  gap: number;
  fireLinkScore: number;
}

interface RoadInfoDecisionInput {
  road: string;
  lanes: string;
  bridge: string;
  judgment: string;
  useProbability?: number;
}

export interface RdAssessmentDecisionInput {
  area: string;
  check: string;
  observed: string;
  grade: string;
}

export interface SudoRdAssessmentVerdict {
  rows: RdAssessmentDecisionInput[];
  technicalRows: RdAssessmentDecisionInput[];
  fusionRows: RdAssessmentDecisionInput[];
  falseSignalRows: RdAssessmentDecisionInput[];
  falseTargetCount: number;
  falseTargetProbability: number;
  realTargetProbability: number;
  finalGrade: string;
}

interface AssistantVulnerabilityDecisionInput {
  target?: string;
  factor: string;
  evidence: string;
  impact: string;
  grade: string;
  source?: string;
}

interface DroneRedeploymentDecisionInput {
  droneId: string;
  destinationType: "NAI" | "DP" | "TAI";
  destinationName: string;
  coordinate: string;
  progressPercent: number;
  status: "이동명령" | "이동중" | "도착";
}

export interface StrikeAssetDecisionInput {
  asset: string;
  availableFrom: string;
  availableTo: string;
  score: number;
}

export type StrikeAssetGrade = "주타격" | "지원" | "예비";

export interface SudoStrikeAssessedAsset extends StrikeAssetDecisionInput {
  score: number;
  availableAtArrival: boolean;
  grade: StrikeAssetGrade;
}

export interface SudoStrikeAssessmentVerdict {
  speedKph: number;
  distanceToTaiKm: number;
  arrival: string;
  assessedAssets: SudoStrikeAssessedAsset[];
  primaryAssets: SudoStrikeAssessedAsset[];
  supportAssets: SudoStrikeAssessedAsset[];
  strikeCombination: string;
}

export interface SudoDecisionInputState {
  targetLabel: string;
  observedVehicleCount: number;
  marchColumnLengthM: number;
  marchRoute: string;
  forestPercent: number;
  openTerrainPercent: number;
  desiredDamagePercent: number;
  nearestCivilianM: number;
  collateralMunitions: CollateralMunitionDecisionInput[];
  orderCandidates: OrderCandidateDecisionInput[];
  routeOptions: RouteOptionDecisionInput[];
  roadInfoRows: RoadInfoDecisionInput[];
  rdAssessmentRows: RdAssessmentDecisionInput[];
  assistantVulnerabilityRows: AssistantVulnerabilityDecisionInput[];
  droneRedeploymentOrders: DroneRedeploymentDecisionInput[];
  strikeAssets: StrikeAssetDecisionInput[];
  fireUnits: FireUnitDecisionInput[];
  fireControlPoints: FireControlPointDecisionInput;
  firePlanRows: FirePlanDecisionInput[];
  targetSpeedKph: number;
  distanceToTaiKm: number;
  observedDamagePercent: number;
  remainingTargets: number;
  bdaRequiredDamagePercent: number;
}

export const SUDO_SCENARIO_5_DEMO_NEAREST_CIVILIAN_M = 420;

export function normalizeSudoScenarioDemoDecisionInputs(
  scenarioId: number,
  inputs?: SudoDecisionInputState
): SudoDecisionInputState {
  const safeInputs = inputs ?? defaultSudoDecisionInputs;

  if (
    scenarioId !== 5 ||
    safeInputs.nearestCivilianM >= SUDO_SCENARIO_5_DEMO_NEAREST_CIVILIAN_M
  ) {
    return safeInputs;
  }

  return {
    ...safeInputs,
    nearestCivilianM: SUDO_SCENARIO_5_DEMO_NEAREST_CIVILIAN_M,
  };
}

const munitionEffectColumns = [10, 20, 30] as const;
type MunitionEffectColumn = (typeof munitionEffectColumns)[number];
type MunitionTerrainClass = "open" | "covered";
type MunitionFireUnit = "포대" | "대대";
const unsupportedTargetMunitionResult = "HE 6발";
const unsupportedTargetMunitionEffectCell = "HEBB ①";

interface MunitionEffectRule {
  id: string;
  targetType: string;
  targetPattern: RegExp;
  rangeBand: "0~6km";
  terrainClass: MunitionTerrainClass;
  terrainLabel: "개활지" | "산림/도심";
  fireUnit: MunitionFireUnit;
  effectCells: Record<MunitionEffectColumn, string>;
}

interface MunitionRecommendationCandidate {
  rule: MunitionEffectRule;
  column: MunitionEffectColumn;
  effectCell: string;
  roundCount: number;
  result: string;
  targetMatched: boolean;
  targetScore: number;
  terrainScore: number;
  satisfactionScore: number;
  economyScore: number;
  scaleScore: number;
  score: number;
}

const munitionEffectRules: MunitionEffectRule[] =
  buildSudoMunitionEffectDecisionRules();

const fireUnits: FireUnitDecisionInput[] = buildSudoFiringUnitDecisionInputs();

const collateralRows: CollateralMunitionDecisionInput[] =
  buildSudoCollateralMunitionsFromCde("18km");

const orderCandidates: OrderCandidateDecisionInput[] =
  SUDO_ORDER_CANDIDATE_SOURCE_ROWS.map((row) => ({
    unit: row.unit,
    weapon: row.weapon,
    distanceKm: row.distanceM / 1000,
    guns: row.guns,
    directionMatchPercent: row.directionMatchPercent,
    coordinate: row.coordinate,
    targetCoordinate: row.targetCoordinate,
    equipment: row.equipment,
    grade: row.sourceRank === "제외" ? "제외" : `${row.sourceRank}순위`,
    sourceRank: row.sourceRank,
  }));

const routeOptions: RouteOptionDecisionInput[] =
  buildSudoSituationRouteDecisionInputs();

const roadInfoRows: RoadInfoDecisionInput[] = buildSudoRoadInfoDecisionInputs();

const rdAssessmentRows: RdAssessmentDecisionInput[] =
  buildSudoRdAssessmentDecisionInputs();

const droneRedeploymentOrders: DroneRedeploymentDecisionInput[] =
  buildSudoDroneRedeploymentDecisionInputs();

const strikeAssets: StrikeAssetDecisionInput[] =
  buildSudoStrikeAssetDecisionInputs();

const firePlanRows: FirePlanDecisionInput[] = buildSudoFirePlanDecisionInputs();

const fireControlPoints: FireControlPointDecisionInput = {
  nai: "NAI#4",
  dp: "DP#3",
  tai: "TAI#5",
};

const scaleAssessment: ScaleAssessmentDecisionInput = {
  observedVehicleCount: 3,
  marchColumnLengthM: 350,
  marchRoute: "적교리 3번 도로 행군축",
};

const droneIdentificationRows = buildSudoDroneIdentificationRowsForDecision();

const defaultAssistantVulnerabilityRows: AssistantVulnerabilityDecisionInput[] =
  [
    ...SUDO_ASSISTANT_240MM_VULNERABILITY_CARDS,
    ...SUDO_ASSISTANT_152MM_VULNERABILITY_CARDS,
  ];

export const defaultSudoDecisionInputs: SudoDecisionInputState = {
  targetLabel: "240mm 방사포(M-1991)",
  observedVehicleCount: scaleAssessment.observedVehicleCount,
  marchColumnLengthM: scaleAssessment.marchColumnLengthM,
  marchRoute: scaleAssessment.marchRoute,
  forestPercent: 10,
  openTerrainPercent: 90,
  desiredDamagePercent: 30,
  nearestCivilianM: 420,
  collateralMunitions: collateralRows,
  orderCandidates,
  routeOptions,
  roadInfoRows,
  rdAssessmentRows,
  assistantVulnerabilityRows: defaultAssistantVulnerabilityRows,
  droneRedeploymentOrders,
  strikeAssets,
  fireUnits,
  fireControlPoints,
  firePlanRows,
  targetSpeedKph: 20,
  distanceToTaiKm: 6.7,
  observedDamagePercent: 18,
  remainingTargets: 4,
  bdaRequiredDamagePercent: 30,
};

function percent(value: number) {
  return `${Math.round(value * 10) / 10}%`;
}

function formatDistanceKm(distanceKm: number) {
  if (distanceKm < 1) {
    return `${Math.round(distanceKm * 1000)}m`;
  }

  return `${Math.round(distanceKm * 10) / 10}km`;
}

function normalizePercentPair(left: number, right: number) {
  const safeLeft = Number.isFinite(left) ? Math.max(0, Math.min(100, left)) : 0;
  const safeRight = Number.isFinite(right)
    ? Math.max(0, Math.min(100, right))
    : 0;
  const total = safeLeft + safeRight;
  if (total <= 0) {
    return { left: 0, right: 0 };
  }

  return {
    left: Math.round((safeLeft / total) * 1000) / 10,
    right: Math.round((safeRight / total) * 1000) / 10,
  };
}

function buildDroneTargetIdentificationDecision(
  inputs: SudoDecisionInputState,
  perception?: SudoPerceptionDecisionInput
): SudoDecisionOutput {
  const perceivedLabel = perception?.label?.trim();
  const fallbackLabel = inputs.targetLabel.trim() || "표적 후보";
  const targetLabel =
    perceivedLabel && perceivedLabel !== "분석결과 대기"
      ? perceivedLabel
      : fallbackLabel;
  const confidence = perception?.confidence ?? 0.92;
  const bboxCount = perception?.detections.length ?? 1;
  const sourceTable = buildSudoDroneTargetSourceTable();

  return {
    title: "드론 표적식별 산출",
    summary: `드론1이 장도훈련장 지형 DB와 감시좌표 BH 12345 67890을 대조해 ${targetLabel} 후보를 식별하고 표적성질분석으로 이관합니다.`,
    metrics: [
      { label: "감시좌표", value: "BH 12345 67890", tone: "blue" },
      { label: "드론좌표", value: "BH 12321 56789", tone: "green" },
      { label: "bbox", value: `${bboxCount}건`, tone: "amber" },
      { label: "신뢰도", value: percent(confidence * 100), tone: "green" },
    ],
    steps: [
      `${SUDO_DRONE_TARGET_SOURCE_NAME} 원본 cue ${sourceTable.rows.length}건을 불러옵니다.`,
      "드론 EO 화면의 이동 표적 후보를 장도훈련장 지형 DB 위에 투영합니다.",
      "1-1 장도훈련장 기동 설명자료의 01:45 기동 cue와 1-2 MilMap 좌표를 근거로 영상/지형DB 전시 상태를 검수합니다.",
      "감시좌표와 드론좌표를 비교해 표적 후보 위치를 확정합니다.",
      "표적 후보를 2번 표적성질분석 단계로 전달하고 주 화면 경보를 유지합니다.",
    ],
    table: {
      title: "드론운용 상태",
      columns: [
        { key: "item", label: "항목" },
        { key: "value", label: "값" },
        { key: "status", label: "상태" },
      ],
      rows: droneIdentificationRows.map((row) => ({ ...row })),
    },
    sourceTables: [sourceTable],
  };
}

function normalizeTargetMatchToken(value: string | undefined) {
  return String(value ?? "")
    .replace(/\s+/g, "")
    .replace(/[()\-_/]/g, "")
    .toLowerCase();
}

function getAssistantVulnerabilityRows(
  inputs: SudoDecisionInputState,
  targetLabel: string
) {
  const rows =
    inputs.assistantVulnerabilityRows.length > 0
      ? inputs.assistantVulnerabilityRows
      : defaultAssistantVulnerabilityRows;
  const targetToken = normalizeTargetMatchToken(targetLabel);
  const matchedRows = rows.filter((row) => {
    const rowTargetToken = normalizeTargetMatchToken(row.target);
    return (
      rowTargetToken.length > 0 &&
      (targetToken.includes(rowTargetToken) ||
        rowTargetToken.includes(targetToken) ||
        (targetToken.includes("240mm") && rowTargetToken.includes("240mm")) ||
        (targetToken.includes("152mm") && rowTargetToken.includes("152mm")))
    );
  });

  if (matchedRows.length > 0) {
    return matchedRows;
  }

  const targetRows = getSudoAssistantVulnerabilityCardsForTarget(targetLabel);
  return targetRows.length > 0 ? targetRows : rows;
}

function buildAssistantDecision(
  inputs: SudoDecisionInputState,
  perception?: SudoPerceptionDecisionInput
): SudoDecisionOutput {
  const targetLabel =
    inputs.targetLabel.trim() || perception?.label?.trim() || "240mm 방사포";
  const assistantRows = getAssistantVulnerabilityRows(inputs, targetLabel);
  const highRiskFactors = assistantRows.filter((row) => row.grade === "상");
  const sourceTables = buildSudoAssistantVulnerabilitySourceTables();
  const sourceCount = new Set(
    assistantRows
      .map((row) => row.source)
      .filter((source): source is string => Boolean(source))
  ).size;

  return {
    title: "AI 취약점 보조판단",
    summary: `${targetLabel} 취약점 ${assistantRows.length}건 중 ${highRiskFactors
      .map((row) => row.factor)
      .join(", ")}를 우선 근거로 제시하고 표적성질분석 보조근거로 첨부합니다.`,
    metrics: [
      { label: "대상", value: targetLabel, tone: "amber" },
      {
        label: "취약점",
        value: `${assistantRows.length}건`,
        tone: "green",
      },
      {
        label: "우선근거",
        value: `${highRiskFactors.length}건`,
        tone: "blue",
      },
      {
        label: "원천자료",
        value: sourceCount > 0 ? `${sourceCount}건` : "6-1",
        tone: "amber",
      },
      {
        label: "비교자료",
        value: "152mm",
        tone: "blue",
      },
    ],
    steps: [
      `질의 문장을 현재 표적성질 ${targetLabel}와 매칭합니다.`,
      `${SUDO_ASSISTANT_VULNERABILITY_SOURCE_NAME} 원천자료에서 240mm 8개 취약점 카드를 검색합니다.`,
      "동일 원천자료의 152mm 자주포 취약점 카드를 비교 지식으로 연결합니다.",
      "Ollama Gemma 계열 응답을 작전 보조문장으로 정리하고 보고서 판단근거에 반영합니다.",
    ],
    table: {
      title: "취약점 근거표",
      columns: [
        { key: "factor", label: "취약요소" },
        { key: "evidence", label: "근거" },
        { key: "impact", label: "작전효과" },
        { key: "grade", label: "우선도" },
      ],
      rows: assistantRows.map((row) => ({ ...row })),
    },
    sourceTables,
  };
}

function minutesToClock(baseHour: number, baseMinute: number, minutes: number) {
  const totalMinutes = baseHour * 60 + baseMinute + Math.round(minutes);
  const hour = Math.floor(totalMinutes / 60) % 24;
  const minute = totalMinutes % 60;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function parseClockMinutes(value: string) {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!match) {
    return undefined;
  }

  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (
    !Number.isInteger(hour) ||
    !Number.isInteger(minute) ||
    hour < 0 ||
    hour > 23 ||
    minute < 0 ||
    minute > 59
  ) {
    return undefined;
  }

  return hour * 60 + minute;
}

function isClockWithinWindow(clock: string, from: string, to: string) {
  const clockMinutes = parseClockMinutes(clock);
  const fromMinutes = parseClockMinutes(from);
  const toMinutes = parseClockMinutes(to);
  if (
    clockMinutes === undefined ||
    fromMinutes === undefined ||
    toMinutes === undefined
  ) {
    return false;
  }

  if (fromMinutes <= toMinutes) {
    return clockMinutes >= fromMinutes && clockMinutes <= toMinutes;
  }

  return clockMinutes >= fromMinutes || clockMinutes <= toMinutes;
}

function getMunitionDominantTerrain(
  terrain: ReturnType<typeof normalizePercentPair>
): MunitionTerrainClass {
  return terrain.right >= 60 || terrain.right >= terrain.left
    ? "open"
    : "covered";
}

function getMunitionEffectColumn(desiredDamage: number): MunitionEffectColumn {
  return (
    munitionEffectColumns.find((column) => column >= desiredDamage) ??
    munitionEffectColumns[munitionEffectColumns.length - 1]
  );
}

function getMunitionRoundCount(effectCell: string) {
  if (effectCell.includes("①")) return 1;
  if (effectCell.includes("②")) return 2;
  if (effectCell.includes("③")) return 3;
  if (effectCell.includes("⑥")) return 6;
  if (effectCell.includes("⑨")) return 9;
  const parsed = Number.parseInt(effectCell.replace(/[^0-9]/g, ""), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

function getMunitionResult(rule: MunitionEffectRule, effectCell: string) {
  const munition = effectCell.split(/\s+/)[0] || "HE";
  const roundCount = getMunitionRoundCount(effectCell);
  const totalRounds = rule.fireUnit === "대대" ? roundCount * 6 : roundCount;

  return `${munition} ${totalRounds}발`;
}

function scoreMunitionRule({
  rule,
  targetLabel,
  dominantTerrain,
  desiredDamage,
  selectedColumn,
}: Readonly<{
  rule: MunitionEffectRule;
  targetLabel: string;
  dominantTerrain: MunitionTerrainClass;
  desiredDamage: number;
  selectedColumn: MunitionEffectColumn;
}>): MunitionRecommendationCandidate {
  const effectCell = rule.effectCells[selectedColumn];
  const roundCount = getMunitionRoundCount(effectCell);
  const targetMatched = rule.targetPattern.test(targetLabel);
  const targetScore = targetMatched ? 1 : 0.62;
  const terrainScore = rule.terrainClass === dominantTerrain ? 1 : 0.18;
  const satisfactionScore = Math.min(
    1,
    selectedColumn / Math.max(1, desiredDamage)
  );
  const economyScore = Math.max(0, 1 - (roundCount - 1) / 8);
  const scaleScore = rule.fireUnit === "포대" ? 1 : 0.72;
  const score =
    targetScore * 24 +
    terrainScore * 34 +
    satisfactionScore * 24 +
    economyScore * 12 +
    scaleScore * 6;

  return {
    rule,
    column: selectedColumn,
    effectCell,
    roundCount,
    result: getMunitionResult(rule, effectCell),
    targetMatched,
    targetScore,
    terrainScore,
    satisfactionScore,
    economyScore,
    scaleScore,
    score: Math.round(score),
  };
}

function buildMunitionRecommendation(inputs: SudoDecisionInputState): {
  terrain: ReturnType<typeof normalizePercentPair>;
  dominantTerrain: MunitionTerrainClass;
  selectedColumn: MunitionEffectColumn;
  selected: MunitionRecommendationCandidate;
  candidates: MunitionRecommendationCandidate[];
} {
  const desiredDamage = inputs.desiredDamagePercent;
  const targetLabel = inputs.targetLabel.trim() || "표적";
  const terrain = normalizePercentPair(
    inputs.forestPercent,
    inputs.openTerrainPercent
  );
  const dominantTerrain = getMunitionDominantTerrain(terrain);
  const selectedColumn = getMunitionEffectColumn(desiredDamage);
  const candidates = munitionEffectRules
    .map((rule) =>
      scoreMunitionRule({
        rule,
        targetLabel,
        dominantTerrain,
        desiredDamage,
        selectedColumn,
      })
    )
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }
      if (left.roundCount !== right.roundCount) {
        return left.roundCount - right.roundCount;
      }
      return left.rule.fireUnit.localeCompare(right.rule.fireUnit, "ko-KR");
    });

  return {
    terrain,
    dominantTerrain,
    selectedColumn,
    selected: candidates[0],
    candidates,
  };
}

function buildMunitionDecision(
  inputs: SudoDecisionInputState
): SudoDecisionOutput {
  const desiredDamage = inputs.desiredDamagePercent;
  const targetLabel = inputs.targetLabel.trim() || "표적";
  const recommendation = buildMunitionRecommendation(inputs);
  const sourceTable = buildSudoMunitionEffectSourceTable();
  const { terrain, selectedColumn, selected, candidates } = recommendation;
  const terrainLabel = `산림/도심 ${percent(terrain.left)} / 개활지 ${percent(
    terrain.right
  )}`;
  const targetSupported = candidates.some(
    (candidate) => candidate.targetMatched
  );
  const desiredDamageSatisfied =
    targetSupported && selectedColumn >= desiredDamage;
  const displayedResult = targetSupported
    ? selected.result
    : unsupportedTargetMunitionResult;
  const displayedEffectCell = targetSupported
    ? selected.effectCell
    : unsupportedTargetMunitionEffectCell;
  const dominantTerrainLabel = selected.rule.terrainLabel;
  const summary = !targetSupported
    ? `7-1~2 매트릭스는 122/240mm 방사포 기준이므로 ${targetLabel} 표적에는 참고 추천 ${displayedResult}을 표시합니다. ${terrainLabel} 지형조건의 참고 셀은 ${dominantTerrainLabel}/${selected.rule.fireUnit}/${selectedColumn}% ${displayedEffectCell}입니다.`
    : desiredDamageSatisfied
      ? `${targetLabel} 표적과 ${terrainLabel} 지형조건을 7-1~2 매트릭스에 대입해 ${dominantTerrainLabel}/${selected.rule.fireUnit}/${selectedColumn}% 셀의 ${displayedResult}을 추천합니다.`
      : `${targetLabel} 표적과 ${terrainLabel} 지형조건에서 요망피해율 ${desiredDamage}%는 표 내 최대 효과열 ${selectedColumn}%를 초과해 ${displayedResult}을 최대 가용안으로 표시하고 추가 화력 검토가 필요합니다.`;

  return {
    title: "탄종/발수 산출",
    summary,
    metrics: [
      {
        label: "추천",
        value: displayedResult,
        tone: desiredDamageSatisfied ? "green" : "amber",
      },
      {
        label: "피해율",
        value: percent(selectedColumn),
        tone: desiredDamageSatisfied ? "blue" : "red",
      },
      { label: "요망효과", value: percent(desiredDamage), tone: "amber" },
      {
        label: "충족",
        value: desiredDamageSatisfied
          ? "충족"
          : targetSupported
            ? "추가검토"
            : "참고추천",
        tone: desiredDamageSatisfied ? "green" : "red",
      },
      { label: "표적성질", value: targetLabel, tone: "blue" },
      { label: "지형", value: terrainLabel, tone: "green" },
      { label: "지형행", value: dominantTerrainLabel, tone: "green" },
      { label: "사격부대", value: selected.rule.fireUnit, tone: "blue" },
      { label: "효과열", value: percent(selectedColumn), tone: "amber" },
      { label: "효과셀", value: displayedEffectCell, tone: "blue" },
      { label: "추천점수", value: `${selected.score}`, tone: "green" },
    ],
    steps: [
      `표적성질 ${targetLabel}와 ${terrainLabel} 지형조건을 입력합니다.`,
      `${SUDO_MUNITION_EFFECT_SOURCE_NAME} #1 100포병대대(K105A1) 122/240mm 방사포 원본행 ${sourceTable.rows.length}개를 불러옵니다.`,
      `${terrain.right >= terrain.left ? "개활지" : "산림/도심"} 우세 지형으로 분류하고 7-1~2 행 후보를 점수화합니다.`,
      `${selected.rule.terrainLabel}/${selected.rule.fireUnit}/${selectedColumn}% 셀 ${displayedEffectCell}을 선택합니다.`,
      !targetSupported
        ? `${displayedResult}을 우측 최종 판정에 표시하고 표적성질은 근거 문장으로만 재확인합니다.`
        : desiredDamageSatisfied
          ? `${displayedResult} 이후 더 큰 단위/발수 후보는 과다 사격으로 제외합니다.`
          : `${displayedResult}은 현재 표의 최대 가용안이므로 상급 화력 또는 재사격 연계를 검토합니다.`,
    ],
    table: {
      title: "7-1~2 탄종/발수 추천 매트릭스",
      columns: [
        { key: "target", label: "표적성질" },
        { key: "range", label: "사거리" },
        { key: "terrain", label: "지형" },
        { key: "fireUnit", label: "사격부대" },
        { key: "effect10", label: "10%" },
        { key: "effect20", label: "20%" },
        { key: "effect30", label: "30%" },
        { key: "score", label: "추천점수" },
        { key: "grade", label: "판정" },
      ],
      rows: candidates.map((candidate) => ({
        target: candidate.rule.targetType,
        range: candidate.rule.rangeBand,
        terrain: candidate.rule.terrainLabel,
        fireUnit: candidate.rule.fireUnit,
        effect10: candidate.rule.effectCells[10],
        effect20: candidate.rule.effectCells[20],
        effect30: candidate.rule.effectCells[30],
        score: `${candidate.score}`,
        grade: !candidate.targetMatched
          ? "표적불일치"
          : candidate.rule.id === selected.rule.id
            ? desiredDamageSatisfied
              ? "추천"
              : "최대가용"
            : candidate.rule.terrainClass !== recommendation.dominantTerrain
              ? "지형불일치"
              : candidate.score < selected.score
                ? "후순위"
                : "동점후순위",
      })),
    },
    sourceTables: [sourceTable],
  };
}

interface TargetClassificationEvidence {
  evidenceScore: number;
  launcherEvidence: boolean;
  confidence: number;
  tubeCount: number;
  visualEvidenceCount: number;
  supportReasons: string[];
}

const rocketTargetPattern =
  /240|m-?1991|방사포|mrl|mlrs|rocket|launcher|발사관|tel|roman|22연장|차대|tube/i;

function hasRocketTargetEvidence(value: string | undefined) {
  return rocketTargetPattern.test(value ?? "");
}

const nonTargetObjectLabelPattern =
  /^(traffic light|stop sign|parking meter|bench|bird|cat|dog|horse|sheep|cow|elephant|bear|zebra|giraffe|backpack|umbrella|handbag|tie|suitcase|frisbee|skis|snowboard|sports ball|kite|baseball bat|baseball glove|skateboard|surfboard|tennis racket|bottle|wine glass|cup|fork|knife|spoon|bowl|banana|apple|sandwich|orange|broccoli|carrot|hot dog|pizza|donut|cake|chair|couch|potted plant|bed|dining table|toilet|tv|laptop|mouse|remote|keyboard|cell phone|microwave|oven|toaster|sink|refrigerator|book|clock|vase|scissors|teddy bear|hair drier|toothbrush)$/i;

function getTargetClassificationDisplayLabel(
  inputs: SudoDecisionInputState,
  perception?: SudoPerceptionDecisionInput
) {
  const perceptionLabel = perception?.label?.trim();

  if (perceptionLabel && !nonTargetObjectLabelPattern.test(perceptionLabel)) {
    return perceptionLabel;
  }

  if (hasRocketTargetEvidence(inputs.targetLabel)) {
    return "차량형 화력장비";
  }

  return inputs.targetLabel.trim() || "차량형 화력장비";
}

function getVisualLauncherEvidenceScore(box: SudoDetectionBox) {
  const features = box.visualFeatures;
  if (!features) {
    return 0;
  }

  const explicitLauncherScore =
    typeof features.launcherScore === "number"
      ? Math.max(0, Math.min(1, features.launcherScore))
      : 0;
  const tubeFaceCue =
    Math.max(
      features.tubeFaceEdgeDensity ?? 0,
      features.tubeFaceDarkRatio ?? 0
    ) * 0.65;
  const silhouetteCue =
    Math.min(1, (features.darkBlobCount ?? 0) / 6) * 0.18 +
    Math.min(1, (features.topDarkRatio ?? 0) / 0.45) * 0.1 +
    Math.min(1, (features.edgeDensity ?? 0) / 0.35) * 0.07;

  return Math.max(explicitLauncherScore, tubeFaceCue + silhouetteCue);
}

function buildTargetClassificationEvidence(
  inputs: SudoDecisionInputState,
  perception?: SudoPerceptionDecisionInput
): TargetClassificationEvidence {
  const detections = perception?.detections ?? [];
  const detectionEvidence = detections.filter((box) =>
    hasRocketTargetEvidence(
      `${box.label} ${box.rawLabel ?? ""} ${box.role ?? ""}`
    )
  );
  const tubeCount = detections.filter((box) =>
    /tube|launcher|발사관|로켓|tube-face/i.test(
      `${box.label} ${box.rawLabel ?? ""} ${box.role ?? ""}`
    )
  ).length;
  const visualEvidenceScores = detections
    .map(getVisualLauncherEvidenceScore)
    .filter((score) => score >= 0.55);
  const visualEvidenceScore = Math.min(
    32,
    Math.round(
      visualEvidenceScores.reduce(
        (total, score) => total + Math.min(1, score) * 28,
        0
      )
    )
  );
  const inputLabelMatched = hasRocketTargetEvidence(inputs.targetLabel);
  const perceptionLabelMatched = hasRocketTargetEvidence(perception?.label);
  const summaryMatched = hasRocketTargetEvidence(perception?.summary);
  const hasPerceptionEvidence =
    perceptionLabelMatched ||
    summaryMatched ||
    detectionEvidence.length > 0 ||
    visualEvidenceScore > 0;
  const inputLabelScore =
    inputLabelMatched && perception === undefined
      ? 42
      : inputLabelMatched
        ? 12
        : 0;
  const labelScore = perceptionLabelMatched ? 32 : 0;
  const summaryScore = summaryMatched ? 16 : 0;
  const detectionScore = Math.min(28, detectionEvidence.length * 12);
  const tubeScore = Math.min(16, tubeCount * 8);
  const confidenceScore =
    perception && hasPerceptionEvidence
      ? Math.min(10, Math.max(0, perception.confidence) * 10)
      : 0;
  const frameScore =
    perception && hasPerceptionEvidence
      ? Math.min(6, Math.max(0, perception.frameCount) * 1.5)
      : 0;
  const evidenceScore = Math.round(
    Math.min(
      100,
      inputLabelScore +
        labelScore +
        summaryScore +
        detectionScore +
        tubeScore +
        visualEvidenceScore +
        confidenceScore +
        frameScore
    )
  );
  const launcherEvidence = evidenceScore >= 35;
  const strongScenarioMatch =
    perception === undefined && inputLabelMatched && launcherEvidence;
  const strongPerceptionMatch =
    perceptionLabelMatched ||
    tubeCount > 0 ||
    detectionEvidence.length >= 2 ||
    visualEvidenceScore >= 22;
  const confidence = launcherEvidence
    ? Math.max(
        perception?.confidence ?? 0,
        strongScenarioMatch || strongPerceptionMatch ? 0.998 : 0.94
      )
    : (perception?.confidence ??
      Math.max(0, ...detections.map((box) => box.confidence), 0.62));
  const supportReasons = [
    inputLabelScore > 0 ? `시나리오 표적명 ${inputs.targetLabel}` : undefined,
    labelScore > 0 ? `AI 라벨 ${perception?.label}` : undefined,
    summaryScore > 0 ? "분석요약 방사포/TEL 키워드" : undefined,
    detectionScore > 0 ? `bbox ${detectionEvidence.length}건` : undefined,
    tubeScore > 0 ? `발사관 ${tubeCount}건` : undefined,
    visualEvidenceScore > 0
      ? `영상특징 ${visualEvidenceScores.length}건`
      : undefined,
  ].filter((reason): reason is string => Boolean(reason));

  return {
    evidenceScore,
    launcherEvidence,
    confidence,
    tubeCount,
    visualEvidenceCount: visualEvidenceScores.length,
    supportReasons,
  };
}

function buildTargetClassificationDecision(
  inputs: SudoDecisionInputState,
  perception?: SudoPerceptionDecisionInput
): SudoDecisionOutput {
  const detections = perception?.detections ?? [];
  const evidence = buildTargetClassificationEvidence(inputs, perception);
  const launcherEvidence = evidence.launcherEvidence;
  const target = launcherEvidence
    ? "240mm 방사포(M-1991)"
    : getTargetClassificationDisplayLabel(inputs, perception);
  const confidence = evidence.confidence;
  const tubeCount = evidence.tubeCount;
  const primaryEvidence =
    evidence.supportReasons.join(" / ") ||
    "generic 차량 bbox/track 확인, 발사관/TEL 근거 부족";
  const sourceTable = buildSudoTargetClassificationEvidenceTable();
  const mediaSourceTable = buildSudoTargetClassificationMediaTable();

  return {
    title: "표적성질 산출",
    summary: `${perception?.model ?? "내장 분석"} 결과 ${target}로 분류합니다.`,
    metrics: [
      { label: "표적성질", value: target, tone: "green" },
      { label: "표적좌표", value: "BH 12345 67890", tone: "green" },
      { label: "신뢰도", value: percent(confidence * 100), tone: "blue" },
      {
        label: "근거점수",
        value: `${evidence.evidenceScore}/100`,
        tone: launcherEvidence ? "green" : "amber",
      },
      {
        label: "영상근거",
        value: `${evidence.visualEvidenceCount}건`,
        tone: evidence.visualEvidenceCount > 0 ? "blue" : "amber",
      },
      {
        label: "원천근거",
        value: `${sourceTable.rows.length}개`,
        tone: "green",
      },
      {
        label: "bbox",
        value: `${detections.length}건`,
        tone: detections.length > 0 ? "amber" : "red",
      },
    ],
    steps: [
      `${perception?.frameCount ?? 0}개 프레임에서 차량 외곽 bbox를 추출합니다.`,
      `${SUDO_TARGET_CLASSIFICATION_SOURCE_NAME}의 ${sourceTable.rows.length}개 판단근거를 표적 형상 판독 기준으로 불러옵니다.`,
      tubeCount > 0
        ? "발사관 bbox가 탐지되어 방사포 계열 특징으로 반영합니다."
        : launcherEvidence
          ? `${primaryEvidence}를 방사포 계열 판단근거로 반영합니다.`
          : "generic 차량 bbox만 확인되어 발사관/TEL 확정 근거는 보류합니다.",
      launcherEvidence
        ? `후보 확률표에서 M-1991 ${percent(confidence * 100)}를 우선 후보로 두고 근거점수 ${evidence.evidenceScore}/100 기준으로 표적명을 확정합니다.`
        : `근거점수 ${evidence.evidenceScore}/100으로 기준 미달이어서 차량 후보 상태를 유지하고 운영자 재검토를 요구합니다.`,
    ],
    table: {
      title: "표적성질 후보",
      columns: [
        { key: "candidate", label: "후보" },
        { key: "evidence", label: "근거" },
        { key: "score", label: "점수" },
      ],
      rows: launcherEvidence
        ? [
            {
              candidate: "240mm 방사포(M-1991)",
              evidence: primaryEvidence,
              score: percent(confidence * 100),
            },
            {
              candidate: "M-1989",
              evidence: "참조 형상 일부 유사",
              score: `${Math.max(0.2, Math.round((100 - confidence * 100) * 10) / 10)}%`,
            },
          ]
        : [
            {
              candidate: target,
              evidence: "generic 차량 bbox/track 확인",
              score: percent(confidence * 100),
            },
            {
              candidate: "240mm 방사포(M-1991)",
              evidence: "발사관/TEL 형상 근거 부족",
              score: `근거 ${evidence.evidenceScore}/100`,
            },
            {
              candidate: "M-1989",
              evidence: "참조 형상 일부 유사",
              score: "34.0%",
            },
          ],
    },
    sourceTables: [sourceTable, mediaSourceTable],
  };
}

function gradeBySeverity(scale: string) {
  if (scale === "대대 규모") {
    return 3;
  }

  if (scale === "중대 규모") {
    return 2;
  }

  if (scale === "소대/단일 표적") {
    return 1;
  }

  return 0;
}

function chooseHigherScale(left: string, right: string) {
  return gradeBySeverity(left) >= gradeBySeverity(right) ? left : right;
}

function scaleFromCount(count: number) {
  return count >= 12
    ? "대대 규모"
    : count >= 3
      ? "중대 규모"
      : count >= 1
        ? "소대/단일 표적"
        : "판단 보류";
}

function scaleFromMarchLength(lengthM: number) {
  return lengthM >= 700
    ? "대대 규모"
    : lengthM >= 250
      ? "중대 규모"
      : lengthM >= 80
        ? "소대/단일 표적"
        : "판단 보류";
}

function scaleFromPerceptionText(text: string | undefined) {
  const normalized = String(text ?? "").trim();
  if (!normalized) {
    return undefined;
  }

  if (/대대|battalion/i.test(normalized)) {
    return "대대 규모";
  }

  if (/중대|company/i.test(normalized)) {
    return "중대 규모";
  }

  if (/소대|platoon|단일|single/i.test(normalized)) {
    return "소대/단일 표적";
  }

  return undefined;
}

function isScaleVehicleDetection(label: string) {
  return /tank|truck|vehicle|tel|mrl|mlrs|rocket|launcher|전차|차량|트럭|방사포/i.test(
    label
  );
}

function classifyScaleCompositionLabel(label: string) {
  if (/mrl|mlrs|rocket|launcher|tel|방사포|발사대/i.test(label)) {
    return "MRL/MLRS";
  }

  if (/tank|전차/i.test(label)) {
    return "전차";
  }

  if (/truck|vehicle|차량|트럭/i.test(label)) {
    return "군용 트럭";
  }

  return "기타";
}

function getScaleCompositionRank(label: string) {
  if (label === "MRL/MLRS") {
    return 0;
  }

  if (label === "전차") {
    return 1;
  }

  if (label === "군용 트럭") {
    return 2;
  }

  return 3;
}

function getDominantScaleLabel(detections: SudoDetectionBox[]) {
  const labelStats = new Map<
    string,
    { label: string; count: number; confidenceSum: number; firstSeen: number }
  >();

  detections.forEach((box, index) => {
    const current = labelStats.get(box.label);
    if (!current) {
      labelStats.set(box.label, {
        label: box.label,
        count: 1,
        confidenceSum: box.confidence,
        firstSeen: index,
      });
      return;
    }

    current.count += 1;
    current.confidenceSum += box.confidence;
  });

  return [...labelStats.values()].sort(
    (left, right) =>
      right.count - left.count ||
      right.confidenceSum - left.confidenceSum ||
      left.firstSeen - right.firstSeen ||
      left.label.localeCompare(right.label)
  )[0]?.label;
}

function summarizeScaleComposition(
  detections: SudoDetectionBox[],
  trackedCount: number
) {
  const compositionCounts = new Map<string, number>();

  if (trackedCount > 0) {
    const tracks = new Map<string, SudoDetectionBox[]>();
    detections.forEach((box) => {
      const trackId = box.trackId?.trim();
      if (!trackId) {
        return;
      }

      const group = tracks.get(trackId) ?? [];
      group.push(box);
      tracks.set(trackId, group);
    });

    tracks.forEach((group) => {
      const label = getDominantScaleLabel(group);
      if (!label) {
        return;
      }

      const compositionLabel = classifyScaleCompositionLabel(label);
      compositionCounts.set(
        compositionLabel,
        (compositionCounts.get(compositionLabel) ?? 0) + 1
      );
    });
  } else {
    detections.forEach((box) => {
      const compositionLabel = classifyScaleCompositionLabel(box.label);
      compositionCounts.set(
        compositionLabel,
        (compositionCounts.get(compositionLabel) ?? 0) + 1
      );
    });
  }

  const rows = [...compositionCounts.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort(
      (left, right) =>
        getScaleCompositionRank(left.label) -
          getScaleCompositionRank(right.label) ||
        right.count - left.count ||
        left.label.localeCompare(right.label)
    );
  const labels = new Set(
    rows.filter((row) => row.label !== "기타").map((row) => row.label)
  );
  const formation =
    labels.has("MRL/MLRS") && labels.has("군용 트럭")
      ? "혼성편성"
      : labels.size > 1
        ? "복합편성"
        : labels.size === 1
          ? "단일계열"
          : "구성대기";
  const summary = rows.length
    ? rows.map((row) => `${row.label} ${row.count}대`).join(" / ")
    : "구성대기";

  return { rows, formation, summary };
}

function countTrackedScaleVehicles(detections: SudoDetectionBox[]) {
  const vehicleDetections = detections.filter((box) =>
    isScaleVehicleDetection(box.label)
  );
  const candidateDetections = vehicleDetections.length
    ? vehicleDetections
    : detections;
  const trackedIds = [
    ...new Set(
      candidateDetections
        .map((box) => box.trackId?.trim())
        .filter((trackId): trackId is string => Boolean(trackId))
    ),
  ];

  return {
    bboxCount: candidateDetections.length,
    trackedCount: trackedIds.length,
    count: trackedIds.length || candidateDetections.length,
    composition: summarizeScaleComposition(
      candidateDetections,
      trackedIds.length
    ),
  };
}

function buildScaleDecision(
  inputs: SudoDecisionInputState,
  perception?: SudoPerceptionDecisionInput
): SudoDecisionOutput {
  const sourceTable = buildSudoScaleDoctrineSourceTable();
  const detections = perception?.detections ?? [];
  const trackedVehicles = countTrackedScaleVehicles(detections);
  const detectedCount = trackedVehicles.count;
  const count = Math.max(
    0,
    Math.round(detectedCount || inputs.observedVehicleCount)
  );
  const marchLengthM = Math.max(0, Math.round(inputs.marchColumnLengthM));
  const countScale = scaleFromCount(count);
  const marchScale = scaleFromMarchLength(marchLengthM);
  const perceptionScale = scaleFromPerceptionText(
    [perception?.label, perception?.summary].filter(Boolean).join(" ")
  );
  const scale = [countScale, marchScale, perceptionScale]
    .filter((value): value is string => Boolean(value))
    .reduce((current, candidate) => chooseHigherScale(current, candidate));
  const inputSource =
    detectedCount > 0
      ? trackedVehicles.trackedCount > 0
        ? "trackId"
        : "bbox"
      : "입력";
  const perceptionSuffix = perceptionScale
    ? `, AI/운영자 라벨 ${perceptionScale}`
    : "";
  const compositionSuffix =
    detectedCount > 0
      ? `, 구성 ${trackedVehicles.composition.summary}(${trackedVehicles.composition.formation})`
      : "";
  const perceptionMetrics = perceptionScale
    ? [
        {
          label: "AI규모",
          value: perceptionScale,
          tone: "blue" as const,
        },
      ]
    : [];
  const compositionMetrics =
    detectedCount > 0
      ? [
          {
            label: "장비구성",
            value: trackedVehicles.composition.formation,
            tone:
              trackedVehicles.composition.formation === "혼성편성"
                ? ("amber" as const)
                : ("blue" as const),
          },
        ]
      : [];
  const perceptionRows = perceptionScale
    ? [
        {
          basis: "AI/운영자라벨",
          observed: perception?.label ?? "",
          grade: perceptionScale,
        },
      ]
    : [];
  const compositionRows =
    detectedCount > 0
      ? [
          {
            basis: "장비구성",
            observed: trackedVehicles.composition.summary,
            grade: trackedVehicles.composition.formation,
          },
        ]
      : [];

  return {
    title: "표적 규모 산출",
    summary: `${inputs.marchRoute} 행군장경 ${marchLengthM}m와 ${inputSource} 장비 ${count}대${perceptionSuffix}${compositionSuffix}를 기준으로 ${scale}로 판단합니다.`,
    metrics: [
      {
        label: "탐지수량",
        value: `${count}대`,
        tone: count > 0 ? "green" : "red",
      },
      {
        label: "행군장경",
        value: `${marchLengthM}m`,
        tone: marchLengthM >= 250 ? "green" : "amber",
      },
      {
        label: "판정",
        value: scale,
        tone: gradeBySeverity(scale) >= 2 ? "green" : "amber",
      },
      {
        label: "프레임",
        value: `${perception?.frameCount ?? 0}장`,
        tone: "blue",
      },
      ...perceptionMetrics,
      {
        label: "bbox",
        value: `${trackedVehicles.bboxCount}건`,
        tone: trackedVehicles.trackedCount > 0 ? "blue" : "amber",
      },
      ...compositionMetrics,
    ],
    steps: [
      `${SUDO_SCALE_SOURCE_NAME}의 240mm 방사포 중대 350m / 대대 1500m 편성표를 원본 기준으로 대조합니다.`,
      detectedCount > 0
        ? trackedVehicles.trackedCount > 0
          ? "프레임별 bbox를 trackId 기준으로 중복 제거해 장비대수를 산정합니다."
          : "프레임별 bbox를 합산해 장비대수 후보를 수량화합니다."
        : "Detector 수량이 없을 때는 운영자 입력 장비대수를 수동 관측값으로 사용합니다.",
      `${inputs.marchRoute} 행군장경 ${marchLengthM}m를 소대/중대/대대 기준표와 비교합니다.`,
      perceptionScale
        ? "Gemma 또는 운영자 확정 라벨에 포함된 규모 표현을 추가 판정근거로 반영합니다."
        : "AI 라벨에 규모 표현이 없으면 수량과 행군장경 기준을 우선 적용합니다.",
      "장비대수 판정과 행군장경 판정 중 더 큰 규모를 후속 전투서열 후보 점수에 반영합니다.",
    ],
    sourceTables: [sourceTable],
    table: {
      title: "규모 산출표",
      columns: [
        { key: "basis", label: "기준" },
        { key: "observed", label: "관측" },
        { key: "grade", label: "판정" },
      ],
      rows: [
        {
          basis: "장비대수",
          observed:
            trackedVehicles.trackedCount > 0
              ? `${count}대(track) / ${trackedVehicles.bboxCount}건(bbox)`
              : `${count}대`,
          grade: countScale,
        },
        {
          basis: "행군장경",
          observed: `${marchLengthM}m`,
          grade: marchScale,
        },
        ...perceptionRows,
        ...compositionRows,
        {
          basis: "종합",
          observed:
            detectedCount > 0
              ? `${count}대 / ${marchLengthM}m / ${trackedVehicles.composition.formation}`
              : `${count}대 / ${marchLengthM}m`,
          grade: scale,
        },
      ],
    },
  };
}

const firingUnitRequiredHeRounds = 3;

function clampRatio(value: number) {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, Math.min(1, value));
}

function formatSignedDistanceKm(distanceKm: number) {
  const rounded = Math.round(Math.abs(distanceKm) * 10) / 10;
  return `${distanceKm >= 0 ? "+" : "-"}${rounded}km`;
}

function assessFiringUnit(unit: FireUnitDecisionInput) {
  const maxRangeKm = Math.max(0, unit.maxRangeKm);
  const distanceKm = Math.max(0, unit.distanceKm);
  const rangeMarginKm = maxRangeKm - distanceKm;
  const rangePossible = rangeMarginKm >= 0;
  const statusReady = unit.status === "가능";
  const survivalOk = unit.survivalGuaranteed !== false;
  const civilianOk = unit.civilianSafe !== false;
  const combatOk = unit.combatReady !== false;
  const ammoOk = unit.ammo >= firingUnitRequiredHeRounds;
  const eligible =
    rangePossible &&
    statusReady &&
    survivalOk &&
    civilianOk &&
    combatOk &&
    ammoOk;
  const rangeScore = rangePossible
    ? 70 + clampRatio(rangeMarginKm / Math.max(maxRangeKm, 1)) * 30
    : clampRatio(maxRangeKm / Math.max(distanceKm, 1)) * 45;
  const ammoScore = clampRatio(unit.ammo / 100) * 100;
  const csrScore = clampRatio(unit.csr / 100) * 100;
  const survivalScore = survivalOk ? 100 : 18;
  const civilianScore = civilianOk ? 100 : 22;
  const readinessScore =
    statusReady && combatOk
      ? 100
      : unit.status === "대기"
        ? 42
        : combatOk
          ? 34
          : 15;
  const score = Math.round(
    rangeScore * 0.24 +
      survivalScore * 0.22 +
      ammoScore * 0.18 +
      civilianScore * 0.16 +
      readinessScore * 0.12 +
      csrScore * 0.08
  );
  const limitingReasons = [
    rangePossible
      ? undefined
      : `사거리 ${formatSignedDistanceKm(rangeMarginKm)}`,
    survivalOk ? undefined : "생존성",
    ammoOk ? undefined : `HE ${firingUnitRequiredHeRounds}R 미만`,
    civilianOk ? undefined : "민간피해",
    statusReady && combatOk ? undefined : "전투준비",
  ].filter((reason): reason is string => Boolean(reason));

  return {
    ...unit,
    rangeMarginKm,
    rangePossible,
    ammoOk,
    survivalOk,
    civilianOk,
    combatOk: statusReady && combatOk,
    eligible,
    score,
    rangeScore: Math.round(rangeScore),
    ammoScore: Math.round(ammoScore),
    csrScore: Math.round(csrScore),
    survivalScore,
    civilianScore,
    readinessScore,
    limitingReasons,
  };
}

function buildFiringUnitDecision(
  inputs: SudoDecisionInputState
): SudoDecisionOutput {
  const sourceTable = buildSudoFiringUnitSourceTable();
  const ranked = inputs.fireUnits
    .map(assessFiringUnit)
    .sort(
      (left, right) =>
        Number(right.eligible) - Number(left.eligible) ||
        right.score - left.score ||
        right.csr - left.csr ||
        right.ammo - left.ammo ||
        left.distanceKm - right.distanceKm
    );
  const bestEligible = ranked.find((unit) => unit.eligible);
  const best = bestEligible ?? ranked[0];
  const hasEligibleUnit = Boolean(bestEligible);

  if (!best) {
    return {
      title: "사격부대 산출",
      summary: "사격부대 후보가 없어 추천을 산출할 수 없습니다.",
      metrics: [
        { label: "추천부대", value: "조건 충족 부대 없음", tone: "red" },
        { label: "산출점수", value: "0/100", tone: "red" },
      ],
      steps: ["사격부대 후보 입력이 필요합니다."],
      sourceTables: [sourceTable],
      table: {
        title: "8-1 최적 사격부대 판단표",
        columns: [
          { key: "unit", label: "부대" },
          { key: "grade", label: "판정" },
        ],
        rows: [],
      },
    };
  }

  const bestLimit =
    best.limitingReasons.length > 0
      ? best.limitingReasons.join(", ")
      : "제한 없음";
  const rangeSummary = `${formatDistanceKm(best.distanceKm)} / ${formatDistanceKm(
    best.maxRangeKm
  )} ${best.rangePossible ? "가능" : "불가"}(${formatSignedDistanceKm(
    best.rangeMarginKm
  )})`;
  const buildGrade = (unit: typeof best) => {
    if (bestEligible?.unit === unit.unit) {
      return "추천";
    }

    if (unit.eligible) {
      return "가능";
    }

    if (!unit.rangePossible) {
      return "사거리제한";
    }

    if (!unit.survivalOk) {
      return "생존성제한";
    }

    if (!unit.ammoOk) {
      return "탄부족";
    }

    if (!unit.civilianOk) {
      return "민간피해제한";
    }

    if (!unit.combatOk) {
      return "전투준비제한";
    }

    return "제한";
  };

  return {
    title: "사격부대 산출",
    summary: hasEligibleUnit
      ? `${best.unit}를 추천합니다. 사거리 ${rangeSummary}, HE ${best.ammo}R, CSR ${best.csr}%이며 생존성/민간피해/전투준비 제한이 없습니다.`
      : `최고점 후보 ${best.unit}도 ${bestLimit} 조건 때문에 선정 불가입니다. 사거리, 생존성, HE ${firingUnitRequiredHeRounds}R, 민간피해, 전투준비를 재확인해야 합니다.`,
    metrics: [
      {
        label: "추천부대",
        value: hasEligibleUnit ? best.unit : "조건 충족 부대 없음",
        tone: hasEligibleUnit ? "green" : "red",
      },
      { label: "산출점수", value: `${best.score}/100`, tone: "blue" },
      { label: "HE", value: `${best.ammo}R`, tone: "amber" },
      {
        label: "사거리",
        value: rangeSummary,
        tone: best.rangePossible ? "green" : "red",
      },
      {
        label: "생존성",
        value: best.survivalOk ? "보장" : "제한",
        tone: best.survivalOk ? "green" : "red",
      },
      {
        label: "민간피해",
        value: best.civilianOk ? "피해없음" : "제한",
        tone: best.civilianOk ? "green" : "red",
      },
    ],
    steps: [
      `${SUDO_FIRING_UNIT_SOURCE_NAME} #1의 사거리, 생존성보장, 탄보유량, 민간피해, 전투력수준 5개 항목을 원본 평가표와 대조합니다.`,
      "표적거리와 부대 최대사거리 차이를 계산해 사거리 점수 24%로 반영합니다.",
      `HE 6발 기준 필요 탄량 ${firingUnitRequiredHeRounds}R 이상인지 확인하고 탄보유 점수 18%로 반영합니다.`,
      "생존성 22%, 민간피해 16%, 전투준비 12%, CSR 8%를 합산해 후보를 정렬합니다.",
      hasEligibleUnit
        ? `${best.unit}가 모든 필수조건을 통과해 추천으로 표시됩니다.`
        : `${best.unit}가 최고점이나 ${bestLimit} 제한으로 추천에서 제외됩니다.`,
    ],
    sourceTables: [sourceTable],
    table: {
      title: "8-1 최적 사격부대 판단표",
      columns: [
        { key: "unit", label: "부대" },
        { key: "range", label: "사거리" },
        { key: "survival", label: "생존성" },
        { key: "ammo", label: "탄보유량" },
        { key: "civilian", label: "민간피해" },
        { key: "combat", label: "전투력" },
        { key: "csr", label: "CSR" },
        { key: "score", label: "점수" },
        { key: "grade", label: "판정" },
      ],
      rows: ranked.map((unit) => ({
        unit: unit.unit,
        range: `${formatDistanceKm(unit.distanceKm)} / ${formatDistanceKm(
          unit.maxRangeKm
        )} ${unit.rangePossible ? "가능" : "불가"}(${formatSignedDistanceKm(
          unit.rangeMarginKm
        )})`,
        survival: unit.survival ?? "확인",
        ammo: `HE ${unit.ammo}R`,
        civilian: unit.civilianImpact ?? "검토",
        combat: `${unit.status} / ${unit.combatReady !== false ? "준비" : "불가"}`,
        csr: `${unit.csr}%`,
        score: `${unit.score}`,
        grade: buildGrade(unit),
      })),
    },
  };
}

export const SUDO_COLLATERAL_REQUIRED_SAFETY_MARGIN_M = 300;
const collateralRequiredSafetyMarginM =
  SUDO_COLLATERAL_REQUIRED_SAFETY_MARGIN_M;
const collateralMunitionProfile: Record<
  string,
  { suitability: number; availability: number; riskPenalty: number }
> = {
  HE: { suitability: 78, availability: 96, riskPenalty: 0 },
  HEBB: { suitability: 96, availability: 94, riskPenalty: 0 },
  DP: { suitability: 84, availability: 82, riskPenalty: 12 },
  DPBB: { suitability: 88, availability: 78, riskPenalty: 18 },
  고폭유도탄: { suitability: 76, availability: 58, riskPenalty: 0 },
  분산유도탄: { suitability: 70, availability: 56, riskPenalty: 24 },
};

function getCollateralProfile(munition: string) {
  return (
    collateralMunitionProfile[munition] ?? {
      suitability: 70,
      availability: 60,
      riskPenalty: 8,
    }
  );
}

function getCollateralRiskGrade(marginM: number) {
  if (marginM < 0) {
    return "CDE-4 중첩";
  }

  if (marginM < collateralRequiredSafetyMarginM) {
    return "CDE-3 제한";
  }

  if (marginM < collateralRequiredSafetyMarginM * 2) {
    return "CDE-2 주의";
  }

  return "CDE-1 안전";
}

function assessCollateralMunition(
  row: CollateralMunitionDecisionInput,
  nearestCivilianM: number
) {
  const munition = row.munition.trim() || "탄종";
  const radiusM = Number.isFinite(row.radiusM) ? Math.max(0, row.radiusM) : 0;
  const marginM = nearestCivilianM - radiusM;
  const allowed = marginM >= collateralRequiredSafetyMarginM;
  const profile = getCollateralProfile(munition);
  const marginScore = allowed
    ? Math.min(100, 58 + (marginM - collateralRequiredSafetyMarginM) / 7)
    : Math.max(0, 35 + marginM / 8);
  const reserveScore = Math.min(100, Math.max(0, marginM / 8));
  const score = Math.max(
    0,
    Math.round(
      marginScore * 0.45 +
        profile.suitability * 0.35 +
        profile.availability * 0.12 +
        reserveScore * 0.08 -
        profile.riskPenalty
    )
  );

  return {
    munition,
    radiusM,
    nearestCivilianM,
    marginM,
    allowed,
    suitability: profile.suitability,
    availability: profile.availability,
    riskGrade: getCollateralRiskGrade(marginM),
    score,
  };
}

function buildCollateralDecision(
  inputs: SudoDecisionInputState
): SudoDecisionOutput {
  const munitions =
    inputs.collateralMunitions.length > 0
      ? inputs.collateralMunitions
      : collateralRows;
  const assessed = munitions
    .map((row) => assessCollateralMunition(row, inputs.nearestCivilianM))
    .sort(
      (left, right) =>
        Number(right.allowed) - Number(left.allowed) ||
        right.score - left.score ||
        left.radiusM - right.radiusM ||
        left.munition.localeCompare(right.munition)
    );
  const allowed = assessed.filter((row) => row.allowed);
  const restricted = assessed.filter((row) => !row.allowed);
  const best = allowed[0] ?? assessed[0];
  const safeList = allowed.map((row) => row.munition).join(", ") || "없음";
  const restrictedList =
    restricted.map((row) => row.munition).join(", ") || "없음";
  const cdeSourceTable = buildSudoCollateralCdeSourceTable();

  return {
    title: "부수피해 산출",
    summary:
      allowed.length > 0
        ? `${best.munition}을 추천합니다. 민가까지 ${best.marginM}m 안전여유, ${best.riskGrade}, CDE 점수 ${best.score}점이며 허용 탄종은 ${safeList}입니다${
            restricted.length > 0
              ? `. ${restrictedList}은 안전여유 ${collateralRequiredSafetyMarginM}m 미만으로 제한합니다`
              : ""
          }.`
        : `모든 탄종이 민가 안전여유 ${collateralRequiredSafetyMarginM}m를 충족하지 못해 재검토가 필요합니다.`,
    metrics: [
      {
        label: "추천탄종",
        value: best?.allowed ? best.munition : "추천 없음",
        tone: best?.allowed ? "green" : "red",
      },
      {
        label: "최근접 민가",
        value: `${Math.round(inputs.nearestCivilianM / 10) / 100}km`,
        tone: allowed.length > 0 ? "green" : "red",
      },
      {
        label: "허용탄종",
        value: safeList,
        tone: allowed.length > 0 ? "blue" : "red",
      },
      {
        label: "제한",
        value: restrictedList,
        tone: restricted.length > 0 ? "red" : "green",
      },
      {
        label: "안전여유",
        value: best ? `${best.marginM}m` : "0m",
        tone: best?.allowed ? "green" : "red",
      },
      {
        label: "CDE등급",
        value: best?.riskGrade ?? "CDE-4 중첩",
        tone: best?.allowed ? "green" : "red",
      },
    ],
    steps: [
      `표적좌표에서 민가지역 최단거리를 ${inputs.nearestCivilianM}m로 산출합니다.`,
      `탄종별 효과반경과 최단거리를 비교해 안전여유 ${collateralRequiredSafetyMarginM}m 이상인 탄종만 허용합니다.`,
      `${SUDO_COLLATERAL_CDE_SOURCE_NAME} 원본표(${SUDO_COLLATERAL_CDE_SOURCE_PATH})의 ${cdeSourceTable.rows.length}개 사거리 중 18km 행을 현재 CDE 반경으로 적용합니다.`,
      "허용 탄종은 안전여유 45%, 표적효과 적합도 35%, 가용성 12%, 여유폭 8%로 점수화합니다.",
      best?.allowed
        ? `${best.munition}이 CDE 점수 ${best.score}점으로 추천탄종입니다.`
        : "허용 탄종이 없어 사격방법 또는 탄종 재선정이 필요합니다.",
    ],
    table: {
      title: "부수피해 반경표",
      columns: [
        { key: "munition", label: "탄종" },
        { key: "radius", label: "반경" },
        { key: "margin", label: "여유" },
        { key: "risk", label: "CDE" },
        { key: "score", label: "점수" },
        { key: "grade", label: "판정" },
      ],
      rows: assessed.map((row) => ({
        munition: row.munition,
        radius: `${row.radiusM}m`,
        margin: `${row.marginM}m`,
        risk: row.riskGrade,
        score: `${row.score}`,
        grade:
          best?.munition === row.munition && row.allowed
            ? "추천"
            : row.allowed
              ? "사용가능"
              : "제한",
      })),
    },
    sourceTables: [cdeSourceTable],
  };
}

function scoreOrderCandidate(
  candidate: OrderCandidateDecisionInput,
  detectedRocket: boolean
) {
  const distanceKm = Number.isFinite(candidate.distanceKm)
    ? Math.max(0, candidate.distanceKm)
    : 0;
  const guns = Number.isFinite(candidate.guns)
    ? Math.max(0, candidate.guns)
    : 0;
  const directionMatchPercent = Number.isFinite(candidate.directionMatchPercent)
    ? Math.max(0, Math.min(100, candidate.directionMatchPercent))
    : 0;
  const weaponLabel = candidate.weapon.toLowerCase();
  const rocketWeapon = /240|m-?1991|122|방사포|rocket|mrl|mlrs|tel/.test(
    weaponLabel
  );
  const sourceRank = Number.parseInt(candidate.sourceRank ?? "", 10);
  const distanceScore = Math.max(0, 34 - distanceKm * 0.7);
  const gunsScore = Math.min(guns / 18, 1) * 24;
  const directionScore = directionMatchPercent * 0.2;
  const weaponScore = detectedRocket ? (rocketWeapon ? 22 : 8) : 14;
  const sourceRankScore = Number.isFinite(sourceRank)
    ? Math.max(0, 12 - sourceRank * 2)
    : candidate.sourceRank === "제외"
      ? -8
      : 0;

  return Math.min(
    99,
    Math.round(
      distanceScore + gunsScore + directionScore + weaponScore + sourceRankScore
    )
  );
}

function buildOrderDecision(
  inputs: SudoDecisionInputState,
  perception?: SudoPerceptionDecisionInput
): SudoDecisionOutput {
  const detectedRocket = hasRocketTargetEvidence(
    `${inputs.targetLabel} ${perception?.label ?? ""} ${perception?.summary ?? ""} ${perception?.detections
      .map((box) => `${box.label} ${box.rawLabel ?? ""} ${box.role ?? ""}`)
      .join(" ")}`
  );
  const candidates =
    inputs.orderCandidates.length > 0
      ? inputs.orderCandidates
      : orderCandidates;
  const sourceTable = buildSudoOrderCandidateSourceTable();
  const ranked = candidates
    .map((candidate) => ({
      ...candidate,
      score: scoreOrderCandidate(candidate, detectedRocket),
    }))
    .sort((left, right) => right.score - left.score);
  const best = ranked[0];

  return {
    title: "전투서열 산출",
    summary: `${best.unit}가 ${detectedRocket ? "240mm 방사포 탐지 결과와 " : ""}${formatDistanceKm(best.distanceKm)} 이격, ${best.weapon} ${best.guns}문, 관측방향 ${best.directionMatchPercent}% 조건에서 최상위 후보입니다.`,
    metrics: [
      { label: "1순위", value: best.unit, tone: "green" },
      { label: "이격", value: formatDistanceKm(best.distanceKm), tone: "blue" },
      { label: "매칭", value: `${best.score}%`, tone: "amber" },
    ],
    steps: [
      `${SUDO_ORDER_CANDIDATE_SOURCE_NAME} 원본표 ${sourceTable.rows.length}개 후보를 표적좌표 BH 12345 67890 기준으로 불러옵니다.`,
      "드론 표적좌표와 인근 부대 위치 DB 간 거리를 계산합니다.",
      detectedRocket
        ? "Detector/Gemma4가 판정한 240mm 방사포 표적성질을 후보부대 보유화포와 매칭합니다."
        : "보유화포 수량과 표적성질을 매칭합니다.",
      "이격거리, 보유화포 수량, 화기명, 관측방향 일치율, 4-1 판정순위를 합산해 후보를 정렬합니다.",
    ],
    table: {
      title: "전투서열 후보 점수",
      columns: [
        { key: "targetCoordinate", label: "표적좌표" },
        { key: "coordinate", label: "좌표" },
        { key: "unit", label: "후보" },
        { key: "weapon", label: "보유화기" },
        { key: "distance", label: "이격" },
        { key: "equipment", label: "보유장비" },
        { key: "direction", label: "방향" },
        { key: "sourceRank", label: "4-1순위" },
        { key: "score", label: "점수" },
      ],
      rows: ranked.map((candidate) => ({
        targetCoordinate: candidate.targetCoordinate ?? "BH 12345 67890",
        coordinate: candidate.coordinate ?? "-",
        unit: candidate.unit,
        weapon: candidate.weapon,
        distance: formatDistanceKm(candidate.distanceKm),
        guns: `${candidate.guns}문`,
        equipment: candidate.equipment ?? `${candidate.guns}문`,
        direction: `${candidate.directionMatchPercent}%`,
        sourceRank: candidate.sourceRank ?? candidate.grade ?? "-",
        score: `${candidate.score}%`,
      })),
    },
    sourceTables: [sourceTable],
  };
}

interface RouteRoadAssessment {
  road?: RoadInfoDecisionInput;
  roadLabel: string;
  roadScore: number;
  roadStatus: "주축" | "대안축" | "보조축" | "제한축" | "미확인";
  roadBasis: string;
}

function clampDecisionPercent(value: number, fallback = 0) {
  return Number.isFinite(value) ? Math.max(0, Math.min(100, value)) : fallback;
}

function getRouteRoadNos(route: string) {
  return Array.from(route.matchAll(/(\d+)\s*번/g), (match) => match[1]).filter(
    (roadNo, index, roadNos) => roadNos.indexOf(roadNo) === index
  );
}

function getRouteRoadNo(route: string) {
  return getRouteRoadNos(route)[0];
}

function getLaneCount(lanes: string) {
  const parsed = Number.parseInt(lanes.match(/(\d+)/)?.[1] ?? "", 10);
  return Number.isFinite(parsed) ? parsed : 0;
}

function getBridgeTonnageLimit(judgment: string) {
  const normalized = judgment.toLowerCase();
  const parsed = Number.parseInt(
    normalized.match(/(\d+)\s*t/)?.[1] ??
      normalized.match(/(\d+)\s*톤/)?.[1] ??
      "",
    10
  );

  return Number.isFinite(parsed) ? parsed : undefined;
}

function assessRoadInfo(road: RoadInfoDecisionInput): RouteRoadAssessment {
  const laneCount = getLaneCount(road.lanes);
  const noBridge = road.bridge === "다리 없음";
  const tonnageLimit = getBridgeTonnageLimit(road.judgment);
  const normalizedJudgment = road.judgment.replace(/\s+/g, " ");
  const useProbability = road.useProbability;
  let roadScore =
    useProbability !== undefined
      ? clampDecisionPercent(useProbability, 50)
      : 42 + Math.min(24, laneCount * 4);

  roadScore += Math.min(18, laneCount * 2);
  roadScore += noBridge
    ? 14
    : tonnageLimit === undefined
      ? -4
      : tonnageLimit >= 40
        ? 8
        : tonnageLimit >= 30
          ? 2
          : -22;

  if (/주\s*예상|주\s*이동|주축/i.test(normalizedJudgment)) {
    roadScore += 12;
  } else if (/대안|우회/i.test(normalizedJudgment)) {
    roadScore += 7;
  } else if (/보조/i.test(normalizedJudgment)) {
    roadScore += 3;
  }

  if (
    /제한|불가|침수|파손|차단|20t\s*이하|20톤\s*이하/i.test(normalizedJudgment)
  ) {
    roadScore -= 18;
  }

  const clampedRoadScore = Math.round(clampDecisionPercent(roadScore, 50));
  const roadStatus =
    clampedRoadScore < 45 || /제한|불가|차단/i.test(normalizedJudgment)
      ? "제한축"
      : /주\s*예상|주\s*이동|주축/i.test(normalizedJudgment)
        ? "주축"
        : /대안|우회/i.test(normalizedJudgment)
          ? "대안축"
          : "보조축";
  const roadBasis = `${road.road} 도로 ${road.lanes}, ${road.bridge}, ${road.judgment}`;

  return {
    road,
    roadLabel: road.road,
    roadScore: clampedRoadScore,
    roadStatus,
    roadBasis,
  };
}

const roadStatusRank: Record<RouteRoadAssessment["roadStatus"], number> = {
  제한축: 0,
  미확인: 1,
  보조축: 2,
  대안축: 3,
  주축: 4,
};

function assessCompositeRouteRoad(
  roads: RoadInfoDecisionInput[]
): RouteRoadAssessment {
  const assessments = roads.map(assessRoadInfo);
  const worstAssessment = assessments.reduce((worst, current) =>
    roadStatusRank[current.roadStatus] < roadStatusRank[worst.roadStatus]
      ? current
      : worst
  );
  const constrainedCount = assessments.filter(
    (assessment) => assessment.roadStatus === "제한축"
  ).length;
  const averageScore =
    assessments.reduce((total, assessment) => total + assessment.roadScore, 0) /
    Math.max(1, assessments.length);
  const roadScore = Math.round(
    clampDecisionPercent(
      constrainedCount > 0
        ? Math.min(
            worstAssessment.roadScore,
            averageScore - constrainedCount * 10
          )
        : averageScore,
      50
    )
  );

  return {
    road: assessments[0]?.road,
    roadLabel: assessments.map((assessment) => assessment.roadLabel).join("·"),
    roadScore,
    roadStatus: constrainedCount > 0 ? "제한축" : worstAssessment.roadStatus,
    roadBasis: assessments
      .map((assessment) => assessment.roadBasis)
      .join(" / "),
  };
}

function assessRouteRoad(
  option: RouteOptionDecisionInput,
  roads: RoadInfoDecisionInput[]
): RouteRoadAssessment {
  const routeRoadNos = getRouteRoadNos(option.route);
  const matchedRoads = routeRoadNos
    .map((roadNo) =>
      roads.find((candidate) => candidate.road.replace(/\D/g, "") === roadNo)
    )
    .filter((road): road is RoadInfoDecisionInput => Boolean(road));
  const routeRoadNo = routeRoadNos[0];

  if (matchedRoads.length > 1) {
    return assessCompositeRouteRoad(matchedRoads);
  }

  const road =
    matchedRoads[0] ??
    roads.find((candidate) => option.route.includes(candidate.road));

  if (road) {
    return assessRoadInfo(road);
  }

  const primaryRoad =
    roads.find((candidate) => candidate.road === "3번") ??
    roads.find((candidate) => candidate.road === "13번") ??
    roads.find((candidate) => candidate.useProbability !== undefined);

  if (primaryRoad && /기존|NAI|TAI|감시선/i.test(option.route)) {
    return {
      ...assessRoadInfo(primaryRoad),
      roadStatus: "미확인",
    };
  }

  return {
    roadLabel: routeRoadNo ? `${routeRoadNo}번` : "미지정",
    roadScore: 45,
    roadStatus: "미확인",
    roadBasis: "예상이동로와 9-1 도로정보표 매칭 필요",
  };
}

function scoreRouteOption(
  option: RouteOptionDecisionInput,
  roadAssessment: RouteRoadAssessment
) {
  const coverage = Number.isFinite(option.coverage)
    ? Math.max(0, Math.min(100, option.coverage))
    : 0;
  const gap = Number.isFinite(option.gap)
    ? Math.max(0, Math.min(100, option.gap))
    : 100;
  const fireLinkScore = Number.isFinite(option.fireLinkScore)
    ? Math.max(0, Math.min(100, option.fireLinkScore))
    : 0;

  return Math.round(
    coverage * 0.34 +
      (100 - gap) * 0.26 +
      fireLinkScore * 0.18 +
      roadAssessment.roadScore * 0.22
  );
}

function buildCoaDecision(inputs: SudoDecisionInputState): SudoDecisionOutput {
  const sourceTables = buildSudoSituationAnalysisSourceTables();
  const options =
    inputs.routeOptions.length > 0 ? inputs.routeOptions : routeOptions;
  const roads =
    inputs.roadInfoRows.length > 0 ? inputs.roadInfoRows : roadInfoRows;
  const ranked = options
    .map((option) => {
      const roadAssessment = assessRouteRoad(option, roads);

      return {
        ...option,
        ...roadAssessment,
        score: scoreRouteOption(option, roadAssessment),
      };
    })
    .sort((left, right) => {
      if (left.score !== right.score) {
        return right.score - left.score;
      }
      if (left.roadScore !== right.roadScore) {
        return right.roadScore - left.roadScore;
      }
      return right.coverage - left.coverage;
    });
  const best = ranked[0];
  const primaryRoad =
    best.road ??
    roads.find((road) => road.road === "3번") ??
    roads.find((road) => road.road === "13번") ??
    roads.find((road) => road.useProbability !== undefined) ??
    roads[0];
  const constrainedRoads = roads.filter(
    (road) =>
      road.bridge !== "다리 없음" ||
      assessRoadInfo(road).roadStatus === "제한축"
  );
  const roadBasis = primaryRoad
    ? `${primaryRoad.road} 도로 ${primaryRoad.lanes}, ${primaryRoad.bridge}, ${primaryRoad.judgment}`
    : "도로정보표 미입력";
  const constrainedBasis = constrainedRoads
    .slice(0, 3)
    .map((road) => `${road.road} ${road.bridge}(${road.judgment})`)
    .join(", ");

  return {
    title: "사태분석도 산출",
    summary: `${best.option}가 ${best.route} 예상이동로에서 감시율 ${best.coverage}%, 공백 ${best.gap}%, 화력연계 ${best.fireLinkScore}%, 도로가용 ${best.roadScore}%(${best.roadStatus})로 NAI/DP/TAI 조정안에 가장 적합합니다. ${best.roadBasis}를 주 이동근거로 반영합니다.`,
    metrics: [
      {
        label: "추천안",
        value: best.option.replace("사태분석도 ", ""),
        tone: "green",
      },
      { label: "감시율", value: `${best.coverage}%`, tone: "blue" },
      { label: "공백", value: `${best.gap}%`, tone: "amber" },
      {
        label: "도로가용",
        value: `${best.roadScore}%`,
        tone: best.roadStatus === "제한축" ? "red" : "green",
      },
    ],
    steps: [
      `${SUDO_SITUATION_ANALYSIS_SOURCE_NAME} slide 1의 사태분석도 #1 30% / #2 70%와 slide 2 도로정보표를 원본근거로 대조합니다.`,
      `${best.route} 예상 이동로를 기준선으로 설정합니다.`,
      `9-1 도로정보표: ${roadBasis}${constrainedBasis ? `, 제한축 ${constrainedBasis}` : ""}.`,
      "각 판단안의 감시율, 감시공백, 화력연계, 도로가용성을 비교합니다.",
      `도로가용성은 차로수·교량 톤수 제한·주/대안/보조 축 판단을 22% 가중치로 반영합니다.`,
      "감시공백이 낮고 화력연계 및 도로가용 점수가 높은 판단안을 NAI/DP/TAI 조정안으로 선택합니다.",
    ],
    sourceTables,
    table: {
      title: "사태분석도 후보",
      columns: [
        { key: "option", label: "판단안" },
        { key: "route", label: "예상이동로" },
        { key: "coverage", label: "감시율" },
        { key: "gap", label: "공백" },
        { key: "fireLink", label: "화력연계" },
        { key: "road", label: "주도로" },
        { key: "roadAvailability", label: "도로가용" },
        { key: "roadStatus", label: "도로판정" },
        { key: "roadBasis", label: "도로근거" },
        { key: "score", label: "점수" },
      ],
      rows: ranked.map((option) => ({
        option: option.option,
        route: option.route,
        coverage: `${option.coverage}%`,
        gap: `${option.gap}%`,
        fireLink: `${option.fireLinkScore}%`,
        road: option.roadLabel,
        roadAvailability: `${option.roadScore}%`,
        roadStatus: option.roadStatus,
        roadBasis: option.roadBasis,
        score: String(option.score),
        grade: option === best ? "추천" : option.roadStatus,
      })),
    },
  };
}

function buildRedeploymentDecision(
  inputs: SudoDecisionInputState
): SudoDecisionOutput {
  const sourceTable = buildSudoDroneRedeploymentSourceTable();
  const orders =
    inputs.droneRedeploymentOrders.length > 0
      ? inputs.droneRedeploymentOrders
      : droneRedeploymentOrders;
  const averageProgress =
    orders.reduce((total, order) => total + order.progressPercent, 0) /
    Math.max(orders.length, 1);
  const doneCount = orders.filter((order) => order.status === "도착").length;
  const routeSummary = orders
    .map(
      (order) =>
        `${order.droneId}->${order.destinationType} ${order.destinationName}`
    )
    .join(", ");

  return {
    title: "감시자산 재배치 산출",
    summary: `사태분석도 판단안에 따라 ${routeSummary} 재배치 명령을 하달합니다.`,
    metrics: [
      { label: "드론", value: `${orders.length}대`, tone: "blue" },
      {
        label: "평균진척",
        value: `${Math.round(averageProgress)}%`,
        tone: averageProgress >= 60 ? "green" : "amber",
      },
      {
        label: "도착",
        value: `${doneCount}대`,
        tone: doneCount === orders.length ? "green" : "amber",
      },
    ],
    steps: [
      `${SUDO_SITUATION_ANALYSIS_SOURCE_NAME} GPT 응답의 1번 TAI #3 쑥고개, 2번 NAI #4 말고개, 3번 TAI #4 당동리 문장을 원문 기준으로 대조합니다.`,
      "AI 어시스턴트 재배치 명령을 운용자가 설정한 드론별 목적지 계획과 대조합니다.",
      "NAI/DP/TAI 목적지와 좌표를 주 화면 재배치 오버레이에 전송합니다.",
      "각 드론의 이동 상태와 진척률을 주 화면 및 보고서에 동시 반영합니다.",
    ],
    sourceTables: [sourceTable],
    table: {
      title: "드론 재배치 계획",
      columns: [
        { key: "drone", label: "드론" },
        { key: "destination", label: "목적지" },
        { key: "coordinate", label: "좌표" },
        { key: "status", label: "상태" },
        { key: "progress", label: "진척" },
      ],
      rows: orders.map((order) => ({
        drone: order.droneId,
        destination: `${order.destinationType} ${order.destinationName}`,
        coordinate: order.coordinate,
        status: order.status,
        progress: `${order.progressPercent}%`,
      })),
    },
  };
}

function formatStrikeAssetForMethod(asset: string) {
  return asset.replace(/\(.*?\)/g, "").trim();
}

export function buildSudoStrikeAssessmentVerdict(
  inputs: Pick<
    SudoDecisionInputState,
    "targetSpeedKph" | "distanceToTaiKm" | "strikeAssets"
  > = defaultSudoDecisionInputs
): SudoStrikeAssessmentVerdict {
  const speedKph = Math.max(1, inputs.targetSpeedKph);
  const distanceToTaiKm = inputs.distanceToTaiKm;
  const arrivalMinutes = (distanceToTaiKm / speedKph) * 60;
  const arrival = minutesToClock(10, 40, arrivalMinutes);
  const assets =
    inputs.strikeAssets.length > 0 ? inputs.strikeAssets : strikeAssets;
  const assessedAssets = assets
    .map<SudoStrikeAssessedAsset>((asset) => {
      const availableAtArrival = isClockWithinWindow(
        arrival,
        asset.availableFrom,
        asset.availableTo
      );
      const score = Number.isFinite(asset.score)
        ? Math.max(0, Math.min(100, asset.score))
        : 0;
      const ewAsset =
        asset.asset === "전자전" || asset.asset.toLowerCase() === "ew";
      const primary = availableAtArrival && !ewAsset && score >= 80;
      const support = !primary && availableAtArrival && ewAsset && score >= 60;
      const grade: StrikeAssetGrade = primary
        ? "주타격"
        : support
          ? "지원"
          : "예비";

      return {
        ...asset,
        score,
        availableAtArrival,
        grade,
      };
    })
    .sort((left, right) => {
      if (left.grade !== right.grade) {
        const gradeRank: Record<StrikeAssetGrade, number> = {
          주타격: 3,
          지원: 2,
          예비: 1,
        };
        return gradeRank[right.grade] - gradeRank[left.grade];
      }

      return right.score - left.score;
    });
  const primaryAssets = assessedAssets.filter(
    (asset) => asset.grade === "주타격"
  );
  const supportAssets = assessedAssets.filter(
    (asset) => asset.grade === "지원"
  );
  const strikeCombination =
    primaryAssets.length > 0
      ? primaryAssets
          .slice(0, 2)
          .map((asset) => formatStrikeAssetForMethod(asset.asset))
          .join("+")
      : "가용자산 재조정";

  return {
    speedKph,
    distanceToTaiKm,
    arrival,
    assessedAssets,
    primaryAssets,
    supportAssets,
    strikeCombination,
  };
}

function buildStrikeDecision(
  inputs: SudoDecisionInputState
): SudoDecisionOutput {
  const assetSourceTable = buildSudoStrikeAssetSourceTable();
  const methodSourceTable = buildSudoStrikeMethodSourceTable();
  const verdict = buildSudoStrikeAssessmentVerdict(inputs);
  const selectedAssets = verdict.primaryAssets.map((asset) => asset.asset);

  return {
    title: "타격방법 산출",
    summary:
      selectedAssets.length > 0
        ? `적 전차가 ${verdict.arrival}에 TAI#5에 도착하므로 ${verdict.strikeCombination}를 주타격 조합으로 선택합니다.`
        : `적 전차가 ${verdict.arrival}에 TAI#5에 도착하지만 해당 시각 주타격 가능자산이 없어 가용시간 재조정이 필요합니다.`,
    metrics: [
      {
        label: "도착",
        value: verdict.arrival,
        tone: selectedAssets.length > 0 ? "green" : "red",
      },
      { label: "속도", value: `${verdict.speedKph}km/h`, tone: "blue" },
      {
        label: "조합",
        value: verdict.strikeCombination,
        tone: selectedAssets.length > 0 ? "amber" : "red",
      },
    ],
    steps: [
      `${SUDO_FIRE_PLAN_SOURCE_NAME}의 CAS 10:30~11:30, 포병 24시간, 육군항공 12:00 이후 가용시간을 원본 기준으로 대조합니다.`,
      `${verdict.distanceToTaiKm}km 남은 표적이 ${verdict.speedKph}km/h로 이동한다고 가정합니다.`,
      `현 시간 10:40 기준 TAI#5 도착예정시각을 ${verdict.arrival}로 계산합니다.`,
      selectedAssets.length > 0
        ? `도착시각과 가용시간이 중첩되고 점수 80 이상인 ${verdict.strikeCombination}를 1순위로 선택합니다.`
        : "도착시각과 가용시간이 중첩되는 주타격 자산이 없어 H시 또는 자산 가용시간 조정이 필요합니다.",
    ],
    sourceTables: [assetSourceTable, methodSourceTable],
    table: {
      title: "가용자산 시간표",
      columns: [
        { key: "asset", label: "자산" },
        { key: "window", label: "가용시간" },
        { key: "score", label: "점수" },
        { key: "grade", label: "판정" },
      ],
      rows: verdict.assessedAssets.map((asset) => ({
        asset: asset.asset,
        window: `${asset.availableFrom}~${asset.availableTo}`,
        score: String(asset.score),
        grade: asset.availableAtArrival
          ? asset.grade
          : asset.grade === "지원"
            ? "지원"
            : "시간불일치",
      })),
    },
  };
}

function parseFirePlanHOffset(value: string) {
  const normalized = value.trim();
  if (normalized === "H") {
    return 0;
  }

  const match = /^H([+-]\d+)$/.exec(normalized);
  return match ? Number(match[1]) : undefined;
}

function parseFirePlanWindow(time: string) {
  const [startRaw, endRaw] = time.split("~").map((value) => value.trim());
  const start = parseFirePlanHOffset(startRaw);
  const end = parseFirePlanHOffset(endRaw ?? startRaw);

  if (start === undefined || end === undefined) {
    return undefined;
  }

  return {
    start: Math.min(start, end),
    end: Math.max(start, end),
  };
}

function firePlanText(row: FirePlanDecisionInput) {
  return `${row.time} ${row.asset} ${row.action} ${row.effect}`;
}

function classifyFirePlanPhase(row: FirePlanDecisionInput) {
  const text = firePlanText(row);

  if (/전자전|FASCAM|기동제한|통신|지휘통제/i.test(text)) {
    return "지속지원";
  }

  if (/사전|H-10~H|H-10\s*~\s*H/i.test(text)) {
    return "사전차단";
  }

  if (/CAS|F-16|F-15|주타격|정밀|파괴|TAI#?5/i.test(text)) {
    return "주타격";
  }

  if (/후속|잔여|보강|H\+10|H\+20/i.test(text)) {
    return "후속차단";
  }

  return "미분류";
}

function scoreFirePlanTime(
  phase: string,
  window?: { start: number; end: number }
) {
  if (phase === "미분류") {
    return 18;
  }

  if (!window) {
    return 25;
  }

  if (phase === "사전차단") {
    return window.start <= -10 && window.end >= 0
      ? 100
      : window.start < 0 && window.end <= 10
        ? 72
        : 36;
  }

  if (phase === "주타격") {
    return window.start <= 0 && window.end >= 10
      ? 100
      : window.start <= 0 && window.end >= 0
        ? 78
        : 42;
  }

  if (phase === "후속차단") {
    return window.start <= 10 && window.end >= 20
      ? 100
      : window.start <= 20 && window.end >= 10
        ? 76
        : 38;
  }

  return window.start <= -10 && window.end >= 30
    ? 100
    : window.end - window.start >= 20
      ? 78
      : 44;
}

function scoreFirePlanAsset(
  row: FirePlanDecisionInput,
  strikeCombination: string
) {
  const text = firePlanText(row);
  const combination = strikeCombination.replace(/\s+/g, "");
  const artilleryMatch = /포병|곡사|TOT|FASCAM/i.test(text);
  const airMatch = /CAS|F-16|F-15|항공|헬기|JAAT/i.test(text);
  const ewMatch = /전자전|EW|EA|통신/i.test(text);

  if (/CAS/i.test(combination) && airMatch) {
    return 100;
  }

  if (/곡사|포병/i.test(combination) && artilleryMatch) {
    return 100;
  }

  if (ewMatch || artilleryMatch || airMatch) {
    return 78;
  }

  return 44;
}

function scoreFirePlanEffect(phase: string, row: FirePlanDecisionInput) {
  const text = firePlanText(row);
  if (phase === "미분류") {
    return 24;
  }

  const effectMatches =
    phase === "사전차단"
      ? /지연|차단|사전|공역|인계/i.test(text)
      : phase === "주타격"
        ? /파괴|주타격|정밀|타격/i.test(text)
        : phase === "후속차단"
          ? /후속|잔여|보강|차단/i.test(text)
          : /통신|지휘|전자전|기동제한|FASCAM|공역/i.test(text);

  return effectMatches ? 100 : 48;
}

function assessFirePlanRow(
  row: FirePlanDecisionInput,
  strikeCombination: string,
  hasControlPoints: boolean
) {
  const phase = classifyFirePlanPhase(row);
  const window = parseFirePlanWindow(row.time);
  const timeScore = scoreFirePlanTime(phase, window);
  const assetScore = scoreFirePlanAsset(row, strikeCombination);
  const effectScore = scoreFirePlanEffect(phase, row);
  const pointScore = hasControlPoints ? 100 : 40;
  const score = Math.round(
    timeScore * 0.36 + assetScore * 0.3 + effectScore * 0.24 + pointScore * 0.1
  );
  const grade = score >= 85 ? "동기화" : score >= 70 ? "보완가능" : "보완필요";

  return {
    ...row,
    phase,
    timeScore,
    assetScore,
    effectScore,
    score,
    grade,
  };
}

function buildFirePlanDecision(
  inputs: SudoDecisionInputState
): SudoDecisionOutput {
  const sourceTable = buildSudoFirePlanSourceTable();
  const strikeVerdict = buildSudoStrikeAssessmentVerdict(inputs);
  const strike = buildStrikeDecision(inputs);
  const rows =
    inputs.firePlanRows.length > 0 ? inputs.firePlanRows : firePlanRows;
  const controlPoints = {
    nai: inputs.fireControlPoints.nai.trim() || fireControlPoints.nai,
    dp: inputs.fireControlPoints.dp.trim() || fireControlPoints.dp,
    tai: inputs.fireControlPoints.tai.trim() || fireControlPoints.tai,
  };
  const hasControlPoints = Boolean(
    controlPoints.nai && controlPoints.dp && controlPoints.tai
  );
  const assessedRows = rows
    .map((row) =>
      assessFirePlanRow(row, strikeVerdict.strikeCombination, hasControlPoints)
    )
    .sort(
      (left, right) =>
        (parseFirePlanWindow(left.time)?.start ?? 99) -
          (parseFirePlanWindow(right.time)?.start ?? 99) ||
        right.score - left.score
    );
  const assetCount = new Set(
    rows.map((row) => row.asset.trim()).filter(Boolean)
  ).size;
  const effectSummary = rows
    .map((row) => row.effect.trim())
    .filter(Boolean)
    .slice(0, 3)
    .join(" / ");
  const syncedCount = assessedRows.filter(
    (row) => row.grade === "동기화"
  ).length;
  const presentPhases = new Set(assessedRows.map((row) => row.phase));
  const requiredPhases = ["사전차단", "주타격", "후속차단", "지속지원"];
  const missingPhases = requiredPhases.filter(
    (phase) => !presentPhases.has(phase)
  );
  const requiredPresentCount = requiredPhases.length - missingPhases.length;
  const planReady = missingPhases.length === 0 && syncedCount === rows.length;

  return {
    title: "통합화력운용도표 산출",
    summary: planReady
      ? `${controlPoints.nai} 감시, ${controlPoints.dp} 결심, ${controlPoints.tai} 타격으로 H시 ${strikeVerdict.arrival} 기준 ${rows.length}개 계획이 모두 동기화되었습니다.`
      : `${controlPoints.nai}/${controlPoints.dp}/${controlPoints.tai} 도표에서 ${syncedCount}/${rows.length}개 계획만 동기화되어 ${missingPhases.join(", ") || "저점 행"} 보완이 필요합니다.`,
    metrics: [
      { label: "NAI", value: controlPoints.nai, tone: "blue" },
      { label: "DP", value: controlPoints.dp, tone: "green" },
      { label: "TAI", value: controlPoints.tai, tone: "amber" },
      {
        label: "H시",
        value: strikeVerdict.arrival,
        tone: planReady ? "green" : "amber",
      },
      {
        label: "주타격",
        value: strikeVerdict.strikeCombination,
        tone: strikeVerdict.primaryAssets.length > 0 ? "green" : "red",
      },
      {
        label: "검증",
        value: `${syncedCount}/${rows.length}`,
        tone: planReady ? "green" : "amber",
      },
      {
        label: "단계",
        value: `${requiredPresentCount}/${requiredPhases.length}`,
        tone: missingPhases.length === 0 ? "green" : "red",
      },
    ],
    steps: [
      `${SUDO_FIRE_PLAN_SOURCE_NAME}의 H-10~H SEAD 포병, H~H+10 19전투비행단 CAS/RJS, H+10~H+20 TOT 포병, 전자전/FASCAM 행을 원본 기준으로 대조합니다.`,
      `사태분석도 #2의 ${controlPoints.nai}/${controlPoints.dp}/${controlPoints.tai} 조정안을 도표 입력값으로 사용합니다.`,
      `${strike.summary}`,
      `${effectSummary || "요망효과"} 달성을 기준으로 사전차단/주타격/후속차단/지속지원 단계를 분류합니다.`,
      missingPhases.length === 0
        ? "필수 단계가 모두 배치되어 H-10~H+30 시간표를 검증합니다."
        : `미배치 단계 ${missingPhases.join(", ")}를 추가해야 합니다.`,
    ],
    sourceTables: [sourceTable],
    table: {
      title: "생성 통합화력운용도표",
      columns: [
        { key: "time", label: "시간" },
        { key: "asset", label: "자산" },
        { key: "action", label: "계획" },
        { key: "effect", label: "효과" },
        { key: "phase", label: "단계" },
        { key: "score", label: "점수" },
        { key: "grade", label: "판정" },
      ],
      rows: assessedRows.map((row) => ({
        time: row.time,
        asset: row.asset,
        action: row.action,
        effect: row.effect,
        phase: row.phase,
        score: `${row.score}`,
        grade: row.grade,
      })),
    },
  };
}

function buildBdaDecision(inputs: SudoDecisionInputState): SudoDecisionOutput {
  const sourceTable = buildSudoBdaSourceTable(inputs);
  const damageSatisfied =
    inputs.observedDamagePercent >= inputs.bdaRequiredDamagePercent;
  const targetSatisfied = inputs.remainingTargets <= 2;
  const missionComplete = damageSatisfied && targetSatisfied;
  const reattackRounds = missionComplete
    ? 0
    : Math.max(
        1,
        Math.ceil(
          (inputs.bdaRequiredDamagePercent - inputs.observedDamagePercent) / 12
        )
      );

  return {
    title: "타격결과 평가",
    summary: missionComplete
      ? `관측 피해율 ${inputs.observedDamagePercent}%와 잔여표적 ${inputs.remainingTargets}대가 기준을 충족해 재타격 없이 감시를 유지합니다.`
      : `관측 피해율 ${inputs.observedDamagePercent}%와 잔여표적 ${inputs.remainingTargets}대를 기준으로 요망효과 미달 재타격 ${reattackRounds}회를 권고하고 잔여표적 재획득을 지시합니다.`,
    metrics: [
      {
        label: "요망효과",
        value: percent(inputs.bdaRequiredDamagePercent),
        tone: "amber",
      },
      {
        label: "관측피해",
        value: percent(inputs.observedDamagePercent),
        tone: damageSatisfied ? "green" : "red",
      },
      {
        label: "잔여표적",
        value: `${inputs.remainingTargets}대`,
        tone: targetSatisfied ? "blue" : "red",
      },
      {
        label: "후속",
        value: missionComplete ? "감시유지" : `재타격 ${reattackRounds}회`,
        tone: missionComplete ? "green" : "amber",
      },
    ],
    steps: [
      `${SUDO_BDA_SOURCE_NAME}의 타격결과 영상과 OCR 근거를 BDA 입력 DATA로 대조합니다.`,
      "타격결과 영상을 제시하고 완파 전차, 잔여 표적, 병력 피해를 식별합니다.",
      "타격 후 드론 재관측 프레임에서 피해율과 잔여표적을 갱신합니다.",
      `요망 피해율 ${inputs.bdaRequiredDamagePercent}% 이상과 잔여표적 2대 이하 기준을 적용합니다.`,
      missionComplete
        ? "요망효과가 충족되어 TAI 감시를 유지하고 추가 사격을 보류합니다."
        : "요망효과 미달 항목을 기준으로 재타격 소요와 잔여표적 재획득 지시를 산출합니다.",
    ],
    sourceTables: [sourceTable],
    table: {
      title: "BDA 산출표",
      columns: [
        { key: "item", label: "평가항목" },
        { key: "observed", label: "관측값" },
        { key: "criteria", label: "기준" },
        { key: "grade", label: "판정" },
      ],
      rows: [
        {
          item: "피해율",
          observed: percent(inputs.observedDamagePercent),
          criteria: `${inputs.bdaRequiredDamagePercent}% 이상`,
          grade: damageSatisfied ? "충족" : "미달",
        },
        {
          item: "잔여표적",
          observed: `${inputs.remainingTargets}대`,
          criteria: "2대 이하",
          grade: targetSatisfied ? "충족" : "재타격 고려",
        },
        {
          item: "후속조치",
          observed: missionComplete
            ? "TAI 감시유지"
            : `재타격 ${reattackRounds}회`,
          criteria: "요망효과 달성",
          grade: missionComplete ? "임무달성" : "재타격",
        },
      ],
    },
  };
}

function isRdFalseTargetSignal(row: RdAssessmentDecisionInput) {
  const signalText = `${row.observed} ${row.grade}`;

  return /허상|미탐지|미청취|특이사항 없음|비정상|불일치/.test(signalText);
}

function getRdFalseTargetProbability(falseTargetCount: number) {
  if (falseTargetCount >= 6) return 99;
  if (falseTargetCount >= 5) return 90;
  if (falseTargetCount >= 4) return 80;
  if (falseTargetCount >= 3) return 70;
  if (falseTargetCount >= 2) return 60;
  if (falseTargetCount >= 1) return 50;
  return 35;
}

export function buildSudoRdAssessmentVerdict(
  inputs: Pick<
    SudoDecisionInputState,
    "rdAssessmentRows"
  > = defaultSudoDecisionInputs
): SudoRdAssessmentVerdict {
  const rows =
    inputs.rdAssessmentRows.length > 0
      ? inputs.rdAssessmentRows
      : rdAssessmentRows;
  const technicalRows = rows.filter((row) => row.area.includes("R/D"));
  const fusionRows = rows.filter((row) => !row.area.includes("R/D"));
  const falseSignalRows = rows.filter(isRdFalseTargetSignal);
  const falseTargetCount = falseSignalRows.length;
  const falseTargetProbability = getRdFalseTargetProbability(falseTargetCount);
  const realTargetProbability = Math.max(0, 100 - falseTargetProbability);
  const finalGrade =
    falseTargetProbability >= 70
      ? "허상표적"
      : falseTargetProbability >= 50
        ? "허상 의심"
        : "실존 재확인 필요";

  return {
    rows,
    technicalRows,
    fusionRows,
    falseSignalRows,
    falseTargetCount,
    falseTargetProbability,
    realTargetProbability,
    finalGrade,
  };
}

function buildRdAssessmentDecision(
  inputs: SudoDecisionInputState
): SudoDecisionOutput {
  const sourceTable = buildSudoRdAssessmentSourceTable();
  const verdict = buildSudoRdAssessmentVerdict(inputs);
  const technicalFalseSignals = verdict.falseSignalRows.filter((row) =>
    row.area.includes("R/D")
  ).length;
  const fusionFalseSignals =
    verdict.falseSignalRows.length - technicalFalseSignals;

  return {
    title: "ARTAS 대포병탐지 R/D 표적탐지 분석",
    summary: `R/D 기술판독 ${technicalFalseSignals}/${verdict.technicalRows.length}건, 지휘소 타출처 ${fusionFalseSignals}/${verdict.fusionRows.length}건에서 허상 징후가 중첩되어 실존 ${verdict.realTargetProbability}% / 허상 ${verdict.falseTargetProbability}%로 판단합니다.`,
    metrics: [
      {
        label: "실존",
        value: `${verdict.realTargetProbability}%`,
        tone: "amber",
      },
      {
        label: "허상",
        value: `${verdict.falseTargetProbability}%`,
        tone: "green",
      },
      { label: "판정", value: verdict.finalGrade, tone: "red" },
    ],
    steps: [
      `${SUDO_RD_ASSESSMENT_SOURCE_NAME}의 ARTAS 최초판단 핵심요소와 R/D 진지ㆍ지휘소 체크리스트를 원본 기준으로 대조합니다.`,
      "R/D 진지에서 사격방향, 탄도곡선, 포구초속/화포종류 일치 여부를 확인합니다.",
      "지휘소에서 포목선 전방 섬광·폭음, 인접 대포병탐지레이더, MASINT 첩보를 교차 확인합니다.",
      "기술적 판단과 타출처 정보융합 결과를 합산해 허상표적 가능성을 우선 전시합니다.",
    ],
    sourceTables: [sourceTable],
    table: {
      title: "R/D 실존·허상 판단 체크리스트",
      columns: [
        { key: "area", label: "구분" },
        { key: "check", label: "체크항목" },
        { key: "observed", label: "확인내용" },
        { key: "grade", label: "판정" },
      ],
      rows: verdict.rows.map<Record<string, string>>((row) => ({
        area: row.area,
        check: row.check,
        observed: row.observed,
        grade: row.grade,
      })),
    },
  };
}

export function getSudoDecisionOutput(
  scenarioId: number,
  inputs: SudoDecisionInputState = defaultSudoDecisionInputs,
  perception?: SudoPerceptionDecisionInput
): SudoDecisionOutput | undefined {
  switch (scenarioId) {
    case 1:
      return buildDroneTargetIdentificationDecision(inputs, perception);
    case 2:
      return buildTargetClassificationDecision(inputs, perception);
    case 3:
      return buildScaleDecision(inputs, perception);
    case 4:
      return buildOrderDecision(inputs, perception);
    case 5:
      return buildCollateralDecision(inputs);
    case 6:
      return buildAssistantDecision(inputs, perception);
    case 7:
      return buildMunitionDecision(inputs);
    case 8:
      return buildFiringUnitDecision(inputs);
    case 9:
      return buildCoaDecision(inputs);
    case 10:
      return buildRedeploymentDecision(inputs);
    case 11:
      return buildStrikeDecision(inputs);
    case 12:
      return buildFirePlanDecision(inputs);
    case 13:
      return buildRdAssessmentDecision(inputs);
    case 14:
      return buildBdaDecision(inputs);
    default:
      return undefined;
  }
}
