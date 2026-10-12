/**
 * Versioned mission/scenario contract.
 *
 * The current application starts from a hard-coded synthetic site.  This
 * contract is the seam for a real project workspace: inputs can be imported,
 * validated, persisted, and reproduced without coupling them to Cesium or
 * the imperative UI runtime.
 */
export const MISSION_SCHEMA = 'gp-digital-twin.mission';
export const MISSION_SCHEMA_VERSION = 1;

export type MissionCoordinate = { lon: number; lat: number };

export type MissionDataSource = {
  id: string;
  label: string;
  kind: string;
  status: 'verified' | 'estimated' | 'synthetic' | 'unavailable';
  capturedAt: string | null;
  uri: string | null;
};

export type MissionRequirements = {
  personnel: number;
  residentPersonnel: number;
  coverageTargetPercent: number;
  maxBudgetKrw: number | null;
  maxSlopeDeg: number;
  constructionDeadlineDays: number | null;
  requiredMobilityModes: string[];
};

export type MissionEnvironment = {
  dayOfYear: number;
  minuteOfDay: number;
  weather: string;
  intensity: number;
  windMps: number;
};

export type MissionProvenance = {
  source: string;
  capturedAt: string;
  author: string;
};

export type MissionScenario = {
  schema: typeof MISSION_SCHEMA;
  version: typeof MISSION_SCHEMA_VERSION;
  id: string;
  name: string;
  description: string;
  siteId: string;
  siteCenter: MissionCoordinate;
  sectorCenterAz: number;
  sectorHalfAngle: number;
  threatDirectionsDeg: number[];
  requirements: MissionRequirements;
  environment: MissionEnvironment;
  dataSources: MissionDataSource[];
  provenance: MissionProvenance;
  createdAt: string;
  updatedAt: string;
};

export type MissionValidation = { ok: boolean; errors: string[] };

type JsonRecord = Record<string, unknown>;

function asRecord(value: unknown): JsonRecord | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as JsonRecord
    : null;
}

function numberOr(value: unknown, fallback: number): number {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function clamp(value: unknown, min: number, max: number, fallback: number): number {
  return Math.min(max, Math.max(min, numberOr(value, fallback)));
}

function integerOr(value: unknown, fallback: number): number {
  return Math.round(numberOr(value, fallback));
}

function nullableNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function isoOr(value: unknown, fallback: string): string {
  const date = new Date(String(value ?? ''));
  return Number.isFinite(date.getTime()) ? date.toISOString() : fallback;
}

function normalizeCoordinate(value: unknown): MissionCoordinate {
  const record = asRecord(value);
  return {
    lon: numberOr(record?.lon, 0),
    lat: numberOr(record?.lat, 0),
  };
}

function normalizeDataSource(value: unknown): MissionDataSource | null {
  const record = asRecord(value);
  if (!record) return null;
  const id = String(record.id ?? '').trim();
  if (!id) return null;
  const statuses: MissionDataSource['status'][] = ['verified', 'estimated', 'synthetic', 'unavailable'];
  const status = String(record.status ?? 'unavailable') as MissionDataSource['status'];
  return {
    id,
    label: String(record.label ?? id).trim() || id,
    kind: String(record.kind ?? 'other').trim() || 'other',
    status: statuses.includes(status) ? status : 'unavailable',
    capturedAt: record.capturedAt ? isoOr(record.capturedAt, '') : null,
    uri: record.uri ? String(record.uri) : null,
  };
}

const now = (): string => new Date().toISOString();

/** A safe starting scenario for the current synthetic demonstration. */
export const DEFAULT_MISSION_SCENARIO: MissionScenario = {
  schema: MISSION_SCHEMA,
  version: MISSION_SCHEMA_VERSION,
  id: 'mission-gp-107-demo',
  name: 'GP-107 기본 시나리오',
  description: '합성 지형과 가상 제원을 사용하는 데모 시나리오',
  siteId: 'GP-107',
  siteCenter: { lon: 128.125, lat: 38.328 },
  sectorCenterAz: 0,
  sectorHalfAngle: 75,
  threatDirectionsDeg: [0],
  requirements: {
    personnel: 10,
    residentPersonnel: 10,
    coverageTargetPercent: 80,
    maxBudgetKrw: null,
    maxSlopeDeg: 24,
    constructionDeadlineDays: null,
    requiredMobilityModes: ['walk'],
  },
  environment: {
    dayOfYear: 240,
    minuteOfDay: 600,
    weather: 'clear',
    intensity: 0.3,
    windMps: 2,
  },
  dataSources: [
    {
      id: 'demo-scenario',
      label: '합성 데모 데이터',
      kind: 'scenario',
      status: 'synthetic',
      capturedAt: null,
      uri: null,
    },
  ],
  provenance: { source: 'built-in-demo', capturedAt: now(), author: 'system' },
  createdAt: now(),
  updatedAt: now(),
};

/** Normalize old/incomplete input while retaining unknown fields for extension. */
export function normalizeMissionScenario(input: unknown, fallback = DEFAULT_MISSION_SCENARIO): MissionScenario {
  const record = asRecord(input) ?? {};
  const requirements = asRecord(record.requirements);
  const environment = asRecord(record.environment);
  const provenance = asRecord(record.provenance);
  const createdAt = isoOr(record.createdAt, fallback.createdAt);
  const updatedAt = isoOr(record.updatedAt, now());
  const personnel = Math.max(0, integerOr(requirements?.personnel, fallback.requirements.personnel));
  const residentPersonnel = Math.min(
    personnel,
    Math.max(0, integerOr(requirements?.residentPersonnel, fallback.requirements.residentPersonnel)),
  );
  const mobility = Array.isArray(requirements?.requiredMobilityModes)
    ? requirements.requiredMobilityModes.map(String).map((mode) => mode.trim()).filter(Boolean)
    : [...fallback.requirements.requiredMobilityModes];

  return {
    ...fallback,
    ...record,
    schema: MISSION_SCHEMA,
    version: MISSION_SCHEMA_VERSION,
    id: String(record.id ?? fallback.id).trim() || fallback.id,
    name: String(record.name ?? fallback.name).trim() || fallback.name,
    description: String(record.description ?? fallback.description),
    siteId: String(record.siteId ?? fallback.siteId).trim() || fallback.siteId,
    siteCenter: normalizeCoordinate(record.siteCenter ?? fallback.siteCenter),
    sectorCenterAz: ((numberOr(record.sectorCenterAz, fallback.sectorCenterAz) % 360) + 360) % 360,
    sectorHalfAngle: clamp(record.sectorHalfAngle, 1, 180, fallback.sectorHalfAngle),
    threatDirectionsDeg: (Array.isArray(record.threatDirectionsDeg)
      ? record.threatDirectionsDeg : fallback.threatDirectionsDeg)
      .map((direction) => ((numberOr(direction, 0) % 360) + 360) % 360),
    requirements: {
      ...fallback.requirements,
      ...(requirements ?? {}),
      personnel,
      residentPersonnel,
      coverageTargetPercent: clamp(
        requirements?.coverageTargetPercent, 0, 100, fallback.requirements.coverageTargetPercent,
      ),
      maxBudgetKrw: nullableNumber(requirements?.maxBudgetKrw),
      maxSlopeDeg: clamp(requirements?.maxSlopeDeg, 0, 90, fallback.requirements.maxSlopeDeg),
      constructionDeadlineDays: nullableNumber(requirements?.constructionDeadlineDays),
      requiredMobilityModes: mobility,
    },
    environment: {
      ...fallback.environment,
      ...(environment ?? {}),
      dayOfYear: ((integerOr(environment?.dayOfYear, fallback.environment.dayOfYear) - 1) % 365 + 365) % 365 + 1,
      minuteOfDay: ((integerOr(environment?.minuteOfDay, fallback.environment.minuteOfDay) % 1440) + 1440) % 1440,
      weather: String(environment?.weather ?? fallback.environment.weather),
      intensity: clamp(environment?.intensity, 0, 1, fallback.environment.intensity),
      windMps: clamp(environment?.windMps, 0, 80, fallback.environment.windMps),
    },
    dataSources: Array.isArray(record.dataSources)
      ? record.dataSources.map(normalizeDataSource).filter((source): source is MissionDataSource => source !== null)
      : [...fallback.dataSources],
    provenance: {
      ...fallback.provenance,
      ...(provenance ?? {}),
      source: String(provenance?.source ?? fallback.provenance.source),
      capturedAt: isoOr(provenance?.capturedAt, fallback.provenance.capturedAt),
      author: String(provenance?.author ?? fallback.provenance.author),
    },
    createdAt,
    updatedAt,
  };
}

export function validateMissionScenario(input: unknown): MissionValidation {
  const record = asRecord(input);
  if (!record) return { ok: false, errors: ['mission must be an object'] };
  const mission = normalizeMissionScenario(record);
  const errors: string[] = [];
  if (record.schema !== MISSION_SCHEMA) errors.push(`schema must be ${MISSION_SCHEMA}`);
  if (record.version !== MISSION_SCHEMA_VERSION) errors.push(`version must be ${MISSION_SCHEMA_VERSION}`);
  if (!String(record.name ?? '').trim()) errors.push('name is required');
  if (!String(record.siteId ?? '').trim()) errors.push('siteId is required');
  if (!asRecord(record.siteCenter)) errors.push('siteCenter is required');
  if (!asRecord(record.requirements)) errors.push('requirements are required');
  if (!asRecord(record.environment)) errors.push('environment is required');
  if (!asRecord(record.provenance)) errors.push('provenance is required');
  if (!Number.isFinite(mission.siteCenter.lon) || mission.siteCenter.lon < -180 || mission.siteCenter.lon > 180) {
    errors.push('siteCenter.lon must be between -180 and 180');
  }
  if (!Number.isFinite(mission.siteCenter.lat) || mission.siteCenter.lat < -90 || mission.siteCenter.lat > 90) {
    errors.push('siteCenter.lat must be between -90 and 90');
  }
  const rawRequirements = asRecord(record.requirements);
  const rawPersonnel = Number(rawRequirements?.personnel);
  const rawResidentPersonnel = Number(rawRequirements?.residentPersonnel);
  if (!Number.isFinite(rawPersonnel) || rawPersonnel < 0) errors.push('requirements.personnel must be non-negative');
  if (!Number.isFinite(rawResidentPersonnel) || rawResidentPersonnel < 0) {
    errors.push('requirements.residentPersonnel must be non-negative');
  }
  if (Number.isFinite(rawResidentPersonnel) && Number.isFinite(rawPersonnel) && rawResidentPersonnel > rawPersonnel) {
    errors.push('residentPersonnel cannot exceed personnel');
  }
  if (!Array.isArray(rawRequirements?.requiredMobilityModes)
    || !rawRequirements.requiredMobilityModes.some((mode) => String(mode).trim())) {
    errors.push('at least one mobility mode is required');
  }
  if (!mission.dataSources.length) errors.push('at least one data source is required');
  return { ok: errors.length === 0, errors };
}

/** Stable digest for cache keys, comparison, and audit correlation. */
export function missionFingerprint(input: unknown): string {
  const mission = normalizeMissionScenario(input);
  const text = JSON.stringify({
    schema: mission.schema,
    version: mission.version,
    id: mission.id,
    siteId: mission.siteId,
    siteCenter: mission.siteCenter,
    sectorCenterAz: mission.sectorCenterAz,
    sectorHalfAngle: mission.sectorHalfAngle,
    threatDirectionsDeg: mission.threatDirectionsDeg,
    requirements: mission.requirements,
    environment: mission.environment,
    dataSources: mission.dataSources,
  });
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}
