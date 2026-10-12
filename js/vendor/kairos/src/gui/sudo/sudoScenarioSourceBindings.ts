import type { SudoDecisionInputState } from "./sudoDecisionEngine";
import type { SudoScenarioSourceStage } from "./sudoScenarioSourceData";

export type SudoScenarioSourceBindingStatus = "connected" | "missing";

export interface SudoScenarioSourceDecisionBinding {
  id: string;
  label: string;
  detail: string;
  status: SudoScenarioSourceBindingStatus;
  basis: string;
}

type SudoScenarioSourceBindingBuilder = (
  inputs: SudoDecisionInputState,
  stage?: SudoScenarioSourceStage
) => SudoScenarioSourceDecisionBinding;

function hasRows(rows: unknown[]) {
  return Array.isArray(rows) && rows.length > 0;
}

function buildBinding(
  id: string,
  label: string,
  connected: boolean,
  detail: string,
  basis: string
): SudoScenarioSourceDecisionBinding {
  return {
    id,
    label,
    detail,
    basis,
    status: connected ? "connected" : "missing",
  };
}

function sourceFileBasis(stage: SudoScenarioSourceStage | undefined) {
  return stage?.sourceFiles.slice(0, 2).join(" / ") || "sudo_data 정적 기본값";
}

function hasControlPointValues(inputs: SudoDecisionInputState) {
  return Boolean(
    inputs.fireControlPoints.nai &&
      inputs.fireControlPoints.dp &&
      inputs.fireControlPoints.tai
  );
}

const bindingBuildersByScenario: Record<
  number,
  SudoScenarioSourceBindingBuilder[]
> = {
  2: [
    (inputs, stage) =>
      buildBinding(
        "targetLabel",
        "targetLabel",
        inputs.targetLabel.trim().length > 0,
        inputs.targetLabel,
        sourceFileBasis(stage)
      ),
  ],
  3: [
    (inputs, stage) =>
      buildBinding(
        "observedVehicleCount",
        "observedVehicleCount",
        inputs.observedVehicleCount > 0,
        `${inputs.observedVehicleCount}대`,
        sourceFileBasis(stage)
      ),
    (inputs, stage) =>
      buildBinding(
        "marchColumnLengthM",
        "marchColumnLengthM",
        inputs.marchColumnLengthM > 0,
        `${inputs.marchColumnLengthM}m`,
        sourceFileBasis(stage)
      ),
  ],
  4: [
    (inputs, stage) =>
      buildBinding(
        "orderCandidates",
        "orderCandidates",
        hasRows(inputs.orderCandidates),
        `${inputs.orderCandidates.length}개 후보`,
        sourceFileBasis(stage)
      ),
  ],
  5: [
    (inputs, stage) =>
      buildBinding(
        "nearestCivilianM",
        "nearestCivilianM",
        inputs.nearestCivilianM > 0,
        `${inputs.nearestCivilianM}m`,
        sourceFileBasis(stage)
      ),
    (inputs, stage) =>
      buildBinding(
        "collateralMunitions",
        "collateralMunitions",
        hasRows(inputs.collateralMunitions),
        `${inputs.collateralMunitions.length}개 탄종`,
        sourceFileBasis(stage)
      ),
  ],
  6: [
    (inputs, stage) =>
      buildBinding(
        "assistantVulnerabilityRows",
        "assistantVulnerabilityRows",
        hasRows(inputs.assistantVulnerabilityRows),
        `${inputs.assistantVulnerabilityRows.length}개 취약점`,
        sourceFileBasis(stage)
      ),
  ],
  7: [
    (inputs, stage) =>
      buildBinding(
        "terrainPercent",
        "forest/openTerrainPercent",
        inputs.forestPercent + inputs.openTerrainPercent > 0,
        `산림 ${inputs.forestPercent}% / 개활지 ${inputs.openTerrainPercent}%`,
        sourceFileBasis(stage)
      ),
    (inputs, stage) =>
      buildBinding(
        "desiredDamagePercent",
        "desiredDamagePercent",
        inputs.desiredDamagePercent > 0,
        `${inputs.desiredDamagePercent}%`,
        sourceFileBasis(stage)
      ),
  ],
  8: [
    (inputs, stage) =>
      buildBinding(
        "fireUnits",
        "fireUnits",
        hasRows(inputs.fireUnits),
        `${inputs.fireUnits.length}개 후보`,
        sourceFileBasis(stage)
      ),
  ],
  9: [
    (inputs, stage) =>
      buildBinding(
        "routeOptions",
        "routeOptions",
        hasRows(inputs.routeOptions),
        `${inputs.routeOptions.length}개 방책`,
        sourceFileBasis(stage)
      ),
    (inputs, stage) =>
      buildBinding(
        "roadInfoRows",
        "roadInfoRows",
        hasRows(inputs.roadInfoRows),
        `${inputs.roadInfoRows.length}개 도로`,
        sourceFileBasis(stage)
      ),
  ],
  10: [
    (inputs, stage) =>
      buildBinding(
        "droneRedeploymentOrders",
        "droneRedeploymentOrders",
        hasRows(inputs.droneRedeploymentOrders),
        `${inputs.droneRedeploymentOrders.length}대`,
        sourceFileBasis(stage)
      ),
  ],
  11: [
    (inputs, stage) =>
      buildBinding(
        "strikeAssets",
        "strikeAssets",
        hasRows(inputs.strikeAssets),
        `${inputs.strikeAssets.length}개 자산`,
        sourceFileBasis(stage)
      ),
    (inputs, stage) =>
      buildBinding(
        "arrivalInputs",
        "targetSpeed/distanceToTai",
        inputs.targetSpeedKph > 0 && inputs.distanceToTaiKm > 0,
        `${inputs.targetSpeedKph}km/h · ${inputs.distanceToTaiKm}km`,
        sourceFileBasis(stage)
      ),
  ],
  12: [
    (inputs, stage) =>
      buildBinding(
        "firePlanRows",
        "firePlanRows",
        hasRows(inputs.firePlanRows),
        `${inputs.firePlanRows.length}개 행`,
        sourceFileBasis(stage)
      ),
    (inputs, stage) =>
      buildBinding(
        "fireControlPoints",
        "fireControlPoints",
        hasControlPointValues(inputs),
        `${inputs.fireControlPoints.nai}/${inputs.fireControlPoints.dp}/${inputs.fireControlPoints.tai}`,
        sourceFileBasis(stage)
      ),
  ],
  13: [
    (inputs, stage) =>
      buildBinding(
        "rdAssessmentRows",
        "rdAssessmentRows",
        hasRows(inputs.rdAssessmentRows),
        `${inputs.rdAssessmentRows.length}개 체크`,
        sourceFileBasis(stage)
      ),
  ],
  14: [
    (inputs, stage) =>
      buildBinding(
        "bdaInputs",
        "BDA damage inputs",
        inputs.observedDamagePercent > 0 && inputs.remainingTargets >= 0,
        `${inputs.observedDamagePercent}% / 잔여 ${inputs.remainingTargets}`,
        sourceFileBasis(stage)
      ),
  ],
};

export function buildSudoScenarioSourceDecisionBindings(
  scenarioId: number,
  inputs: SudoDecisionInputState,
  stage?: SudoScenarioSourceStage
) {
  return (bindingBuildersByScenario[scenarioId] ?? []).map((builder) =>
    builder(inputs, stage)
  );
}

export function buildSudoScenarioSourceBindingSummary(
  bindings: SudoScenarioSourceDecisionBinding[]
) {
  const connected = bindings.filter(
    (binding) => binding.status === "connected"
  ).length;
  return {
    connected,
    total: bindings.length,
    label:
      bindings.length > 0
        ? `${connected}/${bindings.length} 계산연결`
        : "계산연결 없음",
  };
}
