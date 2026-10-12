import {
  defaultSudoDecisionInputs,
  type SudoDecisionInputState,
} from "./sudoDecisionEngine";
import { SUDO_JANGDO_GIS_INTEL } from "./sudoGisIntel";
import type { SudoScenarioSourceStage } from "./sudoScenarioSourceData";

export type SudoScenarioSourceInputPatchStatus = "applied" | "ready";

export interface SudoScenarioSourceInputPatchSuggestion {
  id: string;
  label: string;
  field: string;
  status: SudoScenarioSourceInputPatchStatus;
  currentValue: string;
  recommendedValue: string;
  basis: string;
  detail: string;
}

export interface SudoScenarioSourceInputPatchSummary {
  applied: number;
  ready: number;
  total: number;
  label: string;
}

function stageBasis(stage?: SudoScenarioSourceStage) {
  const sourceFiles = stage?.sourceFiles.slice(0, 2).join(" / ");
  return [sourceFiles, stage?.codeAction].filter(Boolean).join(" · ");
}

function cloneRows<T extends object>(rows: readonly T[]) {
  return rows.map((row) => ({ ...row }) as T);
}

function stringifySimpleValue(value: unknown): string {
  if (Array.isArray(value)) {
    return `${value.length}개`;
  }

  if (typeof value === "number") {
    return `${value}`;
  }

  if (typeof value === "string") {
    return value;
  }

  if (value && typeof value === "object") {
    return Object.values(value).filter(Boolean).join(" / ");
  }

  return "미입력";
}

function buildSuggestion({
  id,
  label,
  field,
  applied,
  currentValue,
  recommendedValue,
  basis,
  detail,
}: {
  id: string;
  label: string;
  field: string;
  applied: boolean;
  currentValue: string;
  recommendedValue: string;
  basis: string;
  detail: string;
}): SudoScenarioSourceInputPatchSuggestion {
  return {
    id,
    label,
    field,
    status: applied ? "applied" : "ready",
    currentValue,
    recommendedValue,
    basis,
    detail,
  };
}

function arrayIncludesText<T>(rows: T[], text: string) {
  return rows.some((row) => JSON.stringify(row).includes(text));
}

function scenario3Suggestions(inputs: SudoDecisionInputState, basis: string) {
  return [
    buildSuggestion({
      id: "s3-scale",
      label: "부대규모 기준값",
      field: "observedVehicleCount/marchColumnLengthM",
      applied:
        inputs.observedVehicleCount === 3 &&
        inputs.marchColumnLengthM === 350 &&
        inputs.marchRoute.includes("3번"),
      currentValue: `${inputs.observedVehicleCount}대 / ${inputs.marchColumnLengthM}m / ${inputs.marchRoute}`,
      recommendedValue: "3대 / 350m / 적교리 3번 도로 행군축",
      basis,
      detail:
        "3-1 행군장경 data와 객체추적 bbox 수량을 판단엔진 입력으로 맞춥니다.",
    }),
  ];
}

function scenario4Suggestions(inputs: SudoDecisionInputState, basis: string) {
  return [
    buildSuggestion({
      id: "s4-order-candidates",
      label: "전투서열 후보표",
      field: "orderCandidates",
      applied:
        inputs.orderCandidates.length >= 2 &&
        arrayIncludesText(inputs.orderCandidates, "1사단 1대대 2중대") &&
        arrayIncludesText(inputs.orderCandidates, "240mm 방사포"),
      currentValue: stringifySimpleValue(inputs.orderCandidates),
      recommendedValue: "1사단 1대대 2중대 240mm 방사포 106m 1순위 포함",
      basis,
      detail:
        "4-1 인근부대 위치/보유장비 표를 최기 부대 후보 입력으로 맞춥니다.",
    }),
  ];
}

function scenario5Suggestions(inputs: SudoDecisionInputState, basis: string) {
  return [
    buildSuggestion({
      id: "s5-civilian-distance",
      label: "민가 이격거리",
      field: "nearestCivilianM",
      applied: inputs.nearestCivilianM === 420,
      currentValue: `${inputs.nearestCivilianM}m`,
      recommendedValue: "420m",
      basis,
      detail: "GIS 민가 이격값을 부수피해 판단 입력으로 맞춥니다.",
    }),
    buildSuggestion({
      id: "s5-collateral-munitions",
      label: "탄종 효과반경",
      field: "collateralMunitions",
      applied:
        arrayIncludesText(inputs.collateralMunitions, "HEBB") &&
        arrayIncludesText(inputs.collateralMunitions, "DPBB") &&
        arrayIncludesText(inputs.collateralMunitions, "236"),
      currentValue: stringifySimpleValue(inputs.collateralMunitions),
      recommendedValue: "HEBB 106m / DPBB 236m 포함",
      basis,
      detail: "5-1 탄종별 부수효과 반경표를 CDE 판단 입력으로 맞춥니다.",
    }),
  ];
}

function scenario7Suggestions(inputs: SudoDecisionInputState, basis: string) {
  const recommendedForestPercent = SUDO_JANGDO_GIS_INTEL.forestPercent;
  const recommendedOpenTerrainPercent =
    SUDO_JANGDO_GIS_INTEL.openTerrainPercent;
  const recommendedDesiredDamagePercent = 30;

  return [
    buildSuggestion({
      id: "s7-terrain-effect",
      label: "지형/요망효과",
      field: "forestPercent/openTerrainPercent/desiredDamagePercent",
      applied:
        inputs.forestPercent === recommendedForestPercent &&
        inputs.openTerrainPercent === recommendedOpenTerrainPercent &&
        inputs.desiredDamagePercent === recommendedDesiredDamagePercent,
      currentValue: `산림 ${inputs.forestPercent}% / 개활지 ${inputs.openTerrainPercent}% / 피해 ${inputs.desiredDamagePercent}%`,
      recommendedValue: `산림 ${recommendedForestPercent}% / 개활지 ${recommendedOpenTerrainPercent}% / 요망효과 ${recommendedDesiredDamagePercent}%`,
      basis,
      detail:
        "GIS 지형분석 피복비율과 7-1~2 탄종/발수 판단표를 탄종 추천 입력으로 맞춥니다.",
    }),
  ];
}

function scenario8Suggestions(inputs: SudoDecisionInputState, basis: string) {
  return [
    buildSuggestion({
      id: "s8-fire-units",
      label: "사격부대 후보",
      field: "fireUnits",
      applied:
        inputs.fireUnits.length >= 5 &&
        arrayIncludesText(inputs.fireUnits, "100포병대대") &&
        arrayIncludesText(inputs.fireUnits, "민가 피해 없음"),
      currentValue: stringifySimpleValue(inputs.fireUnits),
      recommendedValue:
        "100포병대대(K105A1) 사격가능/생존성/민간피해 없음 포함",
      basis,
      detail: "8-1 최적 사격부대 판단 자료를 후보 평가표 입력으로 맞춥니다.",
    }),
  ];
}

function scenario9Suggestions(inputs: SudoDecisionInputState, basis: string) {
  return [
    buildSuggestion({
      id: "s9-route-options",
      label: "사태분석 방책",
      field: "routeOptions",
      applied:
        inputs.routeOptions.length >= 2 &&
        arrayIncludesText(inputs.routeOptions, "3번 도로") &&
        arrayIncludesText(inputs.routeOptions, "70"),
      currentValue: stringifySimpleValue(inputs.routeOptions),
      recommendedValue: "1번 도로 10% / 3번 도로 70% / 5번 도로 20%",
      basis,
      detail: "9-1 사태분석도 분석 결과를 예상이동로 판단 입력으로 맞춥니다.",
    }),
    buildSuggestion({
      id: "s9-road-info",
      label: "도로정보 표",
      field: "roadInfoRows",
      applied:
        inputs.roadInfoRows.length >= 3 &&
        arrayIncludesText(inputs.roadInfoRows, "3번") &&
        arrayIncludesText(inputs.roadInfoRows, "70%"),
      currentValue: stringifySimpleValue(inputs.roadInfoRows),
      recommendedValue: "1번 10% / 3번 70% / 2번 20% 도로정보",
      basis,
      detail:
        "PDF 9-1 도로별 기동여건/작전목적/예상확률 표를 입력으로 맞춥니다.",
    }),
  ];
}

function scenario11Suggestions(inputs: SudoDecisionInputState, basis: string) {
  return [
    buildSuggestion({
      id: "s11-arrival",
      label: "도착시간 계산 입력",
      field: "targetSpeedKph/distanceToTaiKm",
      applied: inputs.targetSpeedKph === 20 && inputs.distanceToTaiKm === 6.7,
      currentValue: `${inputs.targetSpeedKph}km/h / ${inputs.distanceToTaiKm}km`,
      recommendedValue: "20km/h / 6.7km",
      basis,
      detail: "DP-TAI 거리와 속도를 타격자산 가용시간 계산 입력으로 맞춥니다.",
    }),
    buildSuggestion({
      id: "s11-strike-assets",
      label: "타격자산 시간표",
      field: "strikeAssets",
      applied:
        arrayIncludesText(inputs.strikeAssets, "CAS") &&
        arrayIncludesText(inputs.strikeAssets, "10:30") &&
        arrayIncludesText(inputs.strikeAssets, "포병"),
      currentValue: stringifySimpleValue(inputs.strikeAssets),
      recommendedValue: "CAS 10:30~11:30 / 포병 24시간 / 육항 12:00 이후",
      basis,
      detail: "CAS/육항/포병 운용시간 DATA를 타격조합 입력으로 맞춥니다.",
    }),
  ];
}

function scenario12Suggestions(inputs: SudoDecisionInputState, basis: string) {
  return [
    buildSuggestion({
      id: "s12-control-points",
      label: "통합화력 지점",
      field: "fireControlPoints",
      applied:
        inputs.fireControlPoints.nai === "NAI#4" &&
        inputs.fireControlPoints.dp === "DP#3" &&
        inputs.fireControlPoints.tai === "TAI#5",
      currentValue: stringifySimpleValue(inputs.fireControlPoints),
      recommendedValue: "NAI#4 / DP#3 / TAI#5",
      basis,
      detail: "통합화력운용도표의 NAI/DP/TAI 기준점을 입력으로 맞춥니다.",
    }),
    buildSuggestion({
      id: "s12-fire-plan",
      label: "화력운용도표",
      field: "firePlanRows",
      applied:
        inputs.firePlanRows.length >= 5 &&
        arrayIncludesText(inputs.firePlanRows, "H~H+10") &&
        arrayIncludesText(inputs.firePlanRows, "F-16K"),
      currentValue: stringifySimpleValue(inputs.firePlanRows),
      recommendedValue: "H-10~H+30 통합화력 5개 행",
      basis,
      detail:
        "통합화력운용도표 원본근거를 시간축별 자산 운용 입력으로 맞춥니다.",
    }),
  ];
}

function scenario13Suggestions(inputs: SudoDecisionInputState, basis: string) {
  return [
    buildSuggestion({
      id: "s13-rd-assessment",
      label: "R/D 허상 판단표",
      field: "rdAssessmentRows",
      applied:
        inputs.rdAssessmentRows.length >= 6 &&
        arrayIncludesText(inputs.rdAssessmentRows, "허상 99%") &&
        arrayIncludesText(inputs.rdAssessmentRows, "탄도곡선"),
      currentValue: stringifySimpleValue(inputs.rdAssessmentRows),
      recommendedValue:
        "ARTAS 허상표적 78%, 탄도곡선/섬광·폭음/MASINT, 허상 99%",
      basis,
      detail:
        "artas program.pdf 표적탐지 판단표를 R/D 종합판정 입력으로 맞춥니다.",
    }),
  ];
}

function scenario14Suggestions(inputs: SudoDecisionInputState, basis: string) {
  return [
    buildSuggestion({
      id: "s14-bda",
      label: "BDA 피해평가",
      field: "observedDamagePercent/remainingTargets/bdaRequiredDamagePercent",
      applied:
        inputs.observedDamagePercent === 18 &&
        inputs.remainingTargets === 4 &&
        inputs.bdaRequiredDamagePercent === 30,
      currentValue: `${inputs.observedDamagePercent}% / 잔여 ${inputs.remainingTargets} / 기준 ${inputs.bdaRequiredDamagePercent}%`,
      recommendedValue:
        "요망효과 30% / 전차 1대 완파 / 병력 5명 식별 / 재타격 시행",
      basis,
      detail:
        "BDA 입력 DATA와 타격결과 figure를 PDF 판독 중심 재타격 판단으로 맞춥니다.",
    }),
  ];
}

export function buildSudoScenarioSourceInputPatchSuggestions(
  scenarioId: number,
  inputs: SudoDecisionInputState,
  stage?: SudoScenarioSourceStage
) {
  const basis = stageBasis(stage) || "sudo_data 원자료 기본 판단값";

  switch (scenarioId) {
    case 3:
      return scenario3Suggestions(inputs, basis);
    case 4:
      return scenario4Suggestions(inputs, basis);
    case 5:
      return scenario5Suggestions(inputs, basis);
    case 7:
      return scenario7Suggestions(inputs, basis);
    case 8:
      return scenario8Suggestions(inputs, basis);
    case 9:
      return scenario9Suggestions(inputs, basis);
    case 11:
      return scenario11Suggestions(inputs, basis);
    case 12:
      return scenario12Suggestions(inputs, basis);
    case 13:
      return scenario13Suggestions(inputs, basis);
    case 14:
      return scenario14Suggestions(inputs, basis);
    default:
      return [];
  }
}

export function buildSudoScenarioSourceInputPatchSummary(
  suggestions: SudoScenarioSourceInputPatchSuggestion[]
): SudoScenarioSourceInputPatchSummary {
  const applied = suggestions.filter(
    (suggestion) => suggestion.status === "applied"
  ).length;
  const ready = suggestions.filter(
    (suggestion) => suggestion.status === "ready"
  ).length;
  const total = suggestions.length;
  return {
    applied,
    ready,
    total,
    label:
      total === 0
        ? "입력패치 없음"
        : ready > 0
          ? `${ready}/${total} 입력패치 대기`
          : `${applied}/${total} 원자료 반영`,
  };
}

export function buildSudoScenarioSourceDecisionInputPatch(
  scenarioId: number,
  inputs: SudoDecisionInputState,
  stage?: SudoScenarioSourceStage
): Partial<SudoDecisionInputState> {
  const readyIds = new Set(
    buildSudoScenarioSourceInputPatchSuggestions(scenarioId, inputs, stage)
      .filter((suggestion) => suggestion.status === "ready")
      .map((suggestion) => suggestion.id)
  );
  const patch: Partial<SudoDecisionInputState> = {};

  if (readyIds.has("s3-scale")) {
    patch.observedVehicleCount = 3;
    patch.marchColumnLengthM = 350;
    patch.marchRoute = "적교리 3번 도로 행군축";
  }

  if (readyIds.has("s4-order-candidates")) {
    patch.orderCandidates = cloneRows(
      defaultSudoDecisionInputs.orderCandidates
    );
  }

  if (readyIds.has("s5-civilian-distance")) {
    patch.nearestCivilianM = 420;
  }

  if (readyIds.has("s5-collateral-munitions")) {
    patch.collateralMunitions = cloneRows(
      defaultSudoDecisionInputs.collateralMunitions
    );
  }

  if (readyIds.has("s7-terrain-effect")) {
    patch.forestPercent = SUDO_JANGDO_GIS_INTEL.forestPercent;
    patch.openTerrainPercent = SUDO_JANGDO_GIS_INTEL.openTerrainPercent;
    patch.desiredDamagePercent = 30;
  }

  if (readyIds.has("s8-fire-units")) {
    patch.fireUnits = cloneRows(defaultSudoDecisionInputs.fireUnits);
  }

  if (readyIds.has("s9-route-options")) {
    patch.routeOptions = cloneRows(defaultSudoDecisionInputs.routeOptions);
  }

  if (readyIds.has("s9-road-info")) {
    patch.roadInfoRows = cloneRows(defaultSudoDecisionInputs.roadInfoRows);
  }

  if (readyIds.has("s11-arrival")) {
    patch.targetSpeedKph = 20;
    patch.distanceToTaiKm = 6.7;
  }

  if (readyIds.has("s11-strike-assets")) {
    patch.strikeAssets = cloneRows(defaultSudoDecisionInputs.strikeAssets);
  }

  if (readyIds.has("s12-control-points")) {
    patch.fireControlPoints = {
      ...defaultSudoDecisionInputs.fireControlPoints,
    };
  }

  if (readyIds.has("s12-fire-plan")) {
    patch.firePlanRows = cloneRows(defaultSudoDecisionInputs.firePlanRows);
  }

  if (readyIds.has("s13-rd-assessment")) {
    patch.rdAssessmentRows = cloneRows(
      defaultSudoDecisionInputs.rdAssessmentRows
    );
  }

  if (readyIds.has("s14-bda")) {
    patch.observedDamagePercent = 18;
    patch.remainingTargets = 4;
    patch.bdaRequiredDamagePercent = 30;
  }

  return patch;
}

export function getSudoScenarioSourceInputPatchStatusLabel(
  status: SudoScenarioSourceInputPatchStatus
) {
  return status === "applied" ? "반영" : "적용대기";
}
