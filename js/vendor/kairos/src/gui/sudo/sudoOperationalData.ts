import {
  defaultSudoDecisionInputs,
  type SudoDecisionInputState,
} from "./sudoDecisionEngine";

export const DEFAULT_SUDO_OPERATIONAL_DATA_URL = "/sudo/operational-data.json";

export type SudoOperationalDataStatus = "idle" | "loading" | "ready" | "error";

export interface SudoOperationalDataState {
  status: SudoOperationalDataStatus;
  url: string;
  sourceName?: string;
  schemaVersion?: string;
  updatedAt?: string;
  loadedAt?: string;
  scenarioIds: number[];
  message: string;
}

export type SudoOperationalDecisionPatch = Omit<
  Partial<SudoDecisionInputState>,
  "fireControlPoints"
> & {
  fireControlPoints?: Partial<SudoDecisionInputState["fireControlPoints"]>;
};

interface RawSudoOperationalDataDocument {
  schemaVersion?: unknown;
  name?: unknown;
  updatedAt?: unknown;
  defaults?: unknown;
  scenarios?: unknown;
}

export interface SudoOperationalDataDocument {
  schemaVersion?: string;
  name?: string;
  updatedAt?: string;
  defaults?: SudoOperationalDecisionPatch;
  scenarios: Record<string, SudoOperationalDecisionPatch>;
}

export interface SudoOperationalDataLoadResult {
  document: SudoOperationalDataDocument;
  url: string;
  loadedAt: string;
}

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function asString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function asNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  return undefined;
}

function asBoolean(value: unknown) {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string" && value.trim()) {
    const normalized = value.trim().toLowerCase();
    if (
      ["true", "yes", "y", "1", "가능", "양호", "없음"].includes(normalized)
    ) {
      return true;
    }
    if (
      ["false", "no", "n", "0", "불가능", "불가", "제한", "있음"].includes(
        normalized
      )
    ) {
      return false;
    }
  }

  return undefined;
}

function clampNumber(value: unknown, min: number, max: number) {
  const parsed = asNumber(value);
  return parsed === undefined
    ? undefined
    : Math.max(min, Math.min(max, parsed));
}

function clampInteger(value: unknown, min: number, max: number) {
  const parsed = clampNumber(value, min, max);
  return parsed === undefined ? undefined : Math.round(parsed);
}

function normalizeFireUnitStatus(
  value: unknown
): SudoDecisionInputState["fireUnits"][number]["status"] | undefined {
  return value === "가능" || value === "대기" || value === "정비"
    ? value
    : undefined;
}

function normalizeRedeploymentType(
  value: unknown
):
  | SudoDecisionInputState["droneRedeploymentOrders"][number]["destinationType"]
  | undefined {
  return value === "NAI" || value === "DP" || value === "TAI"
    ? value
    : undefined;
}

function normalizeRedeploymentStatus(
  value: unknown
):
  | SudoDecisionInputState["droneRedeploymentOrders"][number]["status"]
  | undefined {
  return value === "이동명령" || value === "이동중" || value === "도착"
    ? value
    : undefined;
}

function mapArray<T>(
  value: unknown,
  normalize: (entry: UnknownRecord) => T | undefined
) {
  if (!Array.isArray(value)) {
    return undefined;
  }

  const rows = value
    .filter(isRecord)
    .map(normalize)
    .filter((entry): entry is T => Boolean(entry));

  return rows.length > 0 ? rows : undefined;
}

function normalizeCollateralMunitions(value: unknown) {
  return mapArray(value, (row) => {
    const munition = asString(row.munition);
    const radiusM = clampNumber(row.radiusM, 0, 5000);
    return munition && radiusM !== undefined
      ? { munition, radiusM }
      : undefined;
  });
}

function normalizeOrderCandidates(value: unknown) {
  return mapArray(value, (row) => {
    const unit = asString(row.unit);
    const weapon = asString(row.weapon);
    const distanceKm = clampNumber(row.distanceKm, 0, 200);
    const guns = clampInteger(row.guns, 0, 240);
    const directionMatchPercent = clampNumber(
      row.directionMatchPercent,
      0,
      100
    );
    const coordinate = asString(row.coordinate);
    const targetCoordinate = asString(row.targetCoordinate);
    const equipment = asString(row.equipment);
    const grade = asString(row.grade);
    const sourceRank = asString(row.sourceRank);
    return unit &&
      weapon &&
      distanceKm !== undefined &&
      guns !== undefined &&
      directionMatchPercent !== undefined
      ? {
          unit,
          weapon,
          distanceKm,
          guns,
          directionMatchPercent,
          ...(coordinate ? { coordinate } : {}),
          ...(targetCoordinate ? { targetCoordinate } : {}),
          ...(equipment ? { equipment } : {}),
          ...(grade ? { grade } : {}),
          ...(sourceRank ? { sourceRank } : {}),
        }
      : undefined;
  });
}

function normalizeRouteOptions(value: unknown) {
  return mapArray(value, (row) => {
    const option = asString(row.option);
    const route = asString(row.route);
    const coverage = clampNumber(row.coverage, 0, 100);
    const gap = clampNumber(row.gap, 0, 100);
    const fireLinkScore = clampNumber(row.fireLinkScore, 0, 100);
    return option &&
      route &&
      coverage !== undefined &&
      gap !== undefined &&
      fireLinkScore !== undefined
      ? { option, route, coverage, gap, fireLinkScore }
      : undefined;
  });
}

function normalizeRoadInfoRows(value: unknown) {
  return mapArray(value, (row) => {
    const road = asString(row.road);
    const lanes = asString(row.lanes);
    const bridge = asString(row.bridge);
    const judgment = asString(row.judgment);
    const useProbability = clampNumber(row.useProbability, 0, 100);
    return road && lanes && bridge && judgment
      ? {
          road,
          lanes,
          bridge,
          judgment,
          ...(useProbability !== undefined ? { useProbability } : {}),
        }
      : undefined;
  });
}

function normalizeRdAssessmentRows(value: unknown) {
  return mapArray(value, (row) => {
    const area = asString(row.area);
    const check = asString(row.check);
    const observed = asString(row.observed);
    const grade = asString(row.grade);
    return area && check && observed && grade
      ? { area, check, observed, grade }
      : undefined;
  });
}

function normalizeAssistantVulnerabilityRows(value: unknown) {
  return mapArray(value, (row) => {
    const factor = asString(row.factor);
    const evidence = asString(row.evidence);
    const impact = asString(row.impact);
    const grade = asString(row.grade);
    const target = asString(row.target);
    const source = asString(row.source);
    return factor && evidence && impact && grade
      ? {
          factor,
          evidence,
          impact,
          grade,
          ...(target ? { target } : {}),
          ...(source ? { source } : {}),
        }
      : undefined;
  });
}

function normalizeRedeploymentOrders(value: unknown) {
  return mapArray(value, (row) => {
    const droneId = asString(row.droneId);
    const destinationType = normalizeRedeploymentType(row.destinationType);
    const destinationName = asString(row.destinationName);
    const coordinate = asString(row.coordinate);
    const progressPercent = clampInteger(row.progressPercent, 0, 100);
    const status = normalizeRedeploymentStatus(row.status);
    return droneId &&
      destinationType &&
      destinationName &&
      coordinate &&
      progressPercent !== undefined &&
      status
      ? {
          droneId,
          destinationType,
          destinationName,
          coordinate,
          progressPercent,
          status,
        }
      : undefined;
  });
}

function normalizeStrikeAssets(value: unknown) {
  return mapArray(value, (row) => {
    const asset = asString(row.asset);
    const availableFrom = asString(row.availableFrom);
    const availableTo = asString(row.availableTo);
    const score = clampNumber(row.score, 0, 100);
    return asset && availableFrom && availableTo && score !== undefined
      ? { asset, availableFrom, availableTo, score }
      : undefined;
  });
}

function normalizeFireUnits(value: unknown) {
  return mapArray(value, (row) => {
    const unit = asString(row.unit);
    const ammo = clampInteger(row.ammo, 0, 10000);
    const csr = clampNumber(row.csr, 0, 100);
    const distanceKm = clampNumber(row.distanceKm, 0, 500);
    const maxRangeKm = clampNumber(row.maxRangeKm, 0.1, 500);
    const status = normalizeFireUnitStatus(row.status);
    const rangeJudgment = asString(row.rangeJudgment);
    const survival = asString(row.survival);
    const survivalGuaranteed = asBoolean(row.survivalGuaranteed);
    const ammoSummary = asString(row.ammoSummary);
    const civilianImpact = asString(row.civilianImpact);
    const civilianSafe = asBoolean(row.civilianSafe);
    const combatStatus = asString(row.combatStatus);
    const combatReady = asBoolean(row.combatReady);
    return unit &&
      ammo !== undefined &&
      csr !== undefined &&
      distanceKm !== undefined &&
      maxRangeKm !== undefined &&
      status
      ? {
          unit,
          ammo,
          csr,
          distanceKm,
          maxRangeKm,
          status,
          ...(rangeJudgment ? { rangeJudgment } : {}),
          ...(survival ? { survival } : {}),
          ...(survivalGuaranteed !== undefined ? { survivalGuaranteed } : {}),
          ...(ammoSummary ? { ammoSummary } : {}),
          ...(civilianImpact ? { civilianImpact } : {}),
          ...(civilianSafe !== undefined ? { civilianSafe } : {}),
          ...(combatStatus ? { combatStatus } : {}),
          ...(combatReady !== undefined ? { combatReady } : {}),
        }
      : undefined;
  });
}

function normalizeFireControlPoints(value: unknown) {
  if (!isRecord(value)) {
    return undefined;
  }

  const nai = asString(value.nai);
  const dp = asString(value.dp);
  const tai = asString(value.tai);
  return nai || dp || tai
    ? {
        ...(nai ? { nai } : {}),
        ...(dp ? { dp } : {}),
        ...(tai ? { tai } : {}),
      }
    : undefined;
}

function normalizeFirePlanRows(value: unknown) {
  return mapArray(value, (row) => {
    const time = asString(row.time);
    const asset = asString(row.asset);
    const action = asString(row.action);
    const effect = asString(row.effect);
    return time && asset && action && effect
      ? { time, asset, action, effect }
      : undefined;
  });
}

export function normalizeSudoOperationalDecisionPatch(
  value: unknown
): SudoOperationalDecisionPatch {
  if (!isRecord(value)) {
    return {};
  }

  const patch: SudoOperationalDecisionPatch = {};
  const targetLabel = asString(value.targetLabel);
  const marchRoute = asString(value.marchRoute);
  const observedVehicleCount = clampInteger(value.observedVehicleCount, 0, 500);
  const marchColumnLengthM = clampNumber(value.marchColumnLengthM, 0, 20000);
  const forestPercent = clampNumber(value.forestPercent, 0, 100);
  const openTerrainPercent = clampNumber(value.openTerrainPercent, 0, 100);
  const desiredDamagePercent = clampNumber(value.desiredDamagePercent, 0, 100);
  const nearestCivilianM = clampNumber(value.nearestCivilianM, 0, 100000);
  const targetSpeedKph = clampNumber(value.targetSpeedKph, 0, 300);
  const distanceToTaiKm = clampNumber(value.distanceToTaiKm, 0, 500);
  const observedDamagePercent = clampNumber(
    value.observedDamagePercent,
    0,
    100
  );
  const remainingTargets = clampInteger(value.remainingTargets, 0, 1000);
  const bdaRequiredDamagePercent = clampNumber(
    value.bdaRequiredDamagePercent,
    0,
    100
  );

  if (targetLabel) patch.targetLabel = targetLabel;
  if (observedVehicleCount !== undefined) {
    patch.observedVehicleCount = observedVehicleCount;
  }
  if (marchColumnLengthM !== undefined) {
    patch.marchColumnLengthM = marchColumnLengthM;
  }
  if (marchRoute) patch.marchRoute = marchRoute;
  if (forestPercent !== undefined) patch.forestPercent = forestPercent;
  if (openTerrainPercent !== undefined) {
    patch.openTerrainPercent = openTerrainPercent;
  }
  if (desiredDamagePercent !== undefined) {
    patch.desiredDamagePercent = desiredDamagePercent;
  }
  if (nearestCivilianM !== undefined) {
    patch.nearestCivilianM = nearestCivilianM;
  }
  if (targetSpeedKph !== undefined) patch.targetSpeedKph = targetSpeedKph;
  if (distanceToTaiKm !== undefined) patch.distanceToTaiKm = distanceToTaiKm;
  if (observedDamagePercent !== undefined) {
    patch.observedDamagePercent = observedDamagePercent;
  }
  if (remainingTargets !== undefined) patch.remainingTargets = remainingTargets;
  if (bdaRequiredDamagePercent !== undefined) {
    patch.bdaRequiredDamagePercent = bdaRequiredDamagePercent;
  }

  const collateralMunitions = normalizeCollateralMunitions(
    value.collateralMunitions
  );
  const orderCandidates = normalizeOrderCandidates(value.orderCandidates);
  const routeOptions = normalizeRouteOptions(value.routeOptions);
  const roadInfoRows = normalizeRoadInfoRows(value.roadInfoRows);
  const rdAssessmentRows = normalizeRdAssessmentRows(value.rdAssessmentRows);
  const assistantVulnerabilityRows = normalizeAssistantVulnerabilityRows(
    value.assistantVulnerabilityRows
  );
  const droneRedeploymentOrders = normalizeRedeploymentOrders(
    value.droneRedeploymentOrders
  );
  const strikeAssets = normalizeStrikeAssets(value.strikeAssets);
  const fireUnits = normalizeFireUnits(value.fireUnits);
  const fireControlPoints = normalizeFireControlPoints(value.fireControlPoints);
  const firePlanRows = normalizeFirePlanRows(value.firePlanRows);

  if (collateralMunitions) patch.collateralMunitions = collateralMunitions;
  if (orderCandidates) patch.orderCandidates = orderCandidates;
  if (routeOptions) patch.routeOptions = routeOptions;
  if (roadInfoRows) patch.roadInfoRows = roadInfoRows;
  if (rdAssessmentRows) patch.rdAssessmentRows = rdAssessmentRows;
  if (assistantVulnerabilityRows) {
    patch.assistantVulnerabilityRows = assistantVulnerabilityRows;
  }
  if (droneRedeploymentOrders) {
    patch.droneRedeploymentOrders = droneRedeploymentOrders;
  }
  if (strikeAssets) patch.strikeAssets = strikeAssets;
  if (fireUnits) patch.fireUnits = fireUnits;
  if (fireControlPoints) {
    patch.fireControlPoints = fireControlPoints;
  }
  if (firePlanRows) patch.firePlanRows = firePlanRows;

  return patch;
}

export function normalizeSudoOperationalDataDocument(
  value: unknown
): SudoOperationalDataDocument {
  if (!isRecord(value)) {
    throw new Error("운용 데이터 JSON 루트가 객체가 아닙니다.");
  }

  const raw = value as RawSudoOperationalDataDocument;
  const scenarios: Record<string, SudoOperationalDecisionPatch> = {};
  if (isRecord(raw.scenarios)) {
    Object.entries(raw.scenarios).forEach(([scenarioId, patch]) => {
      const normalizedPatch = normalizeSudoOperationalDecisionPatch(patch);
      if (Object.keys(normalizedPatch).length > 0) {
        scenarios[scenarioId] = normalizedPatch;
      }
    });
  }

  const defaults = normalizeSudoOperationalDecisionPatch(raw.defaults);
  if (
    Object.keys(defaults).length === 0 &&
    Object.keys(scenarios).length === 0
  ) {
    throw new Error(
      "운용 데이터에 적용 가능한 defaults/scenarios 값이 없습니다."
    );
  }

  return {
    schemaVersion: asString(raw.schemaVersion),
    name: asString(raw.name),
    updatedAt: asString(raw.updatedAt),
    defaults,
    scenarios,
  };
}

function cloneDecisionInputs(
  inputs: SudoDecisionInputState
): SudoDecisionInputState {
  return {
    ...inputs,
    collateralMunitions: inputs.collateralMunitions.map((row) => ({ ...row })),
    orderCandidates: inputs.orderCandidates.map((row) => ({ ...row })),
    routeOptions: inputs.routeOptions.map((row) => ({ ...row })),
    roadInfoRows: inputs.roadInfoRows.map((row) => ({ ...row })),
    rdAssessmentRows: inputs.rdAssessmentRows.map((row) => ({ ...row })),
    assistantVulnerabilityRows: inputs.assistantVulnerabilityRows.map(
      (row) => ({
        ...row,
      })
    ),
    droneRedeploymentOrders: inputs.droneRedeploymentOrders.map((row) => ({
      ...row,
    })),
    strikeAssets: inputs.strikeAssets.map((row) => ({ ...row })),
    fireUnits: inputs.fireUnits.map((row) => ({ ...row })),
    fireControlPoints: { ...inputs.fireControlPoints },
    firePlanRows: inputs.firePlanRows.map((row) => ({ ...row })),
  };
}

function mergeDecisionPatch(
  base: SudoDecisionInputState,
  patch?: SudoOperationalDecisionPatch
) {
  if (!patch) {
    return cloneDecisionInputs(base);
  }

  return {
    ...base,
    ...patch,
    collateralMunitions: patch.collateralMunitions
      ? patch.collateralMunitions.map((row) => ({ ...row }))
      : base.collateralMunitions.map((row) => ({ ...row })),
    orderCandidates: patch.orderCandidates
      ? patch.orderCandidates.map((row) => ({ ...row }))
      : base.orderCandidates.map((row) => ({ ...row })),
    routeOptions: patch.routeOptions
      ? patch.routeOptions.map((row) => ({ ...row }))
      : base.routeOptions.map((row) => ({ ...row })),
    roadInfoRows: patch.roadInfoRows
      ? patch.roadInfoRows.map((row) => ({ ...row }))
      : base.roadInfoRows.map((row) => ({ ...row })),
    rdAssessmentRows: patch.rdAssessmentRows
      ? patch.rdAssessmentRows.map((row) => ({ ...row }))
      : base.rdAssessmentRows.map((row) => ({ ...row })),
    assistantVulnerabilityRows: patch.assistantVulnerabilityRows
      ? patch.assistantVulnerabilityRows.map((row) => ({ ...row }))
      : base.assistantVulnerabilityRows.map((row) => ({ ...row })),
    droneRedeploymentOrders: patch.droneRedeploymentOrders
      ? patch.droneRedeploymentOrders.map((row) => ({ ...row }))
      : base.droneRedeploymentOrders.map((row) => ({ ...row })),
    strikeAssets: patch.strikeAssets
      ? patch.strikeAssets.map((row) => ({ ...row }))
      : base.strikeAssets.map((row) => ({ ...row })),
    fireUnits: patch.fireUnits
      ? patch.fireUnits.map((row) => ({ ...row }))
      : base.fireUnits.map((row) => ({ ...row })),
    fireControlPoints: patch.fireControlPoints
      ? { ...base.fireControlPoints, ...patch.fireControlPoints }
      : { ...base.fireControlPoints },
    firePlanRows: patch.firePlanRows
      ? patch.firePlanRows.map((row) => ({ ...row }))
      : base.firePlanRows.map((row) => ({ ...row })),
  };
}

export function buildDefaultSudoDecisionInputs(): SudoDecisionInputState {
  return mergeDecisionPatch(defaultSudoDecisionInputs, {});
}

export function normalizeSudoDecisionInputs(
  inputs?: SudoOperationalDecisionPatch | Partial<SudoDecisionInputState>
): SudoDecisionInputState {
  return mergeDecisionPatch(
    buildDefaultSudoDecisionInputs(),
    normalizeSudoOperationalDecisionPatch(inputs)
  );
}

export function buildSudoDecisionInputsFromOperationalData(
  base: SudoDecisionInputState,
  document: SudoOperationalDataDocument,
  scenarioId: number
) {
  const withDefaults = mergeDecisionPatch(base, document.defaults);
  return mergeDecisionPatch(
    withDefaults,
    document.scenarios[String(scenarioId)]
  );
}

export function getSudoOperationalDataUrl(
  env: Record<string, unknown> = import.meta.env
) {
  const configured = asString(env.VITE_SUDO_OPERATIONAL_DATA_URL);
  return configured ?? DEFAULT_SUDO_OPERATIONAL_DATA_URL;
}

export function buildIdleSudoOperationalDataState(
  url = getSudoOperationalDataUrl()
): SudoOperationalDataState {
  return {
    status: "idle",
    url,
    scenarioIds: [],
    message: "운용 데이터 동기화 전입니다.",
  };
}

export async function loadSudoOperationalData(
  url = getSudoOperationalDataUrl(),
  fetchImpl: typeof fetch = fetch
): Promise<SudoOperationalDataLoadResult> {
  const response = await fetchImpl(url, {
    headers: { Accept: "application/json" },
  });
  if (!response.ok) {
    throw new Error(`운용 데이터 요청 실패: HTTP ${response.status}`);
  }

  const payload = await response.json();
  const document = normalizeSudoOperationalDataDocument(payload);
  return {
    document,
    url,
    loadedAt: new Date().toISOString(),
  };
}

export function buildReadySudoOperationalDataState(
  result: SudoOperationalDataLoadResult
): SudoOperationalDataState {
  const scenarioIds = Object.keys(result.document.scenarios)
    .map((scenarioId) => Number(scenarioId))
    .filter((scenarioId) => Number.isFinite(scenarioId))
    .sort((left, right) => left - right);

  return {
    status: "ready",
    url: result.url,
    sourceName: result.document.name,
    schemaVersion: result.document.schemaVersion,
    updatedAt: result.document.updatedAt,
    loadedAt: result.loadedAt,
    scenarioIds,
    message: `${result.document.name ?? "운용 데이터"} 적용 가능: ${scenarioIds.length}개 시나리오`,
  };
}
