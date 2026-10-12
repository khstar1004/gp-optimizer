import {
  MissionScenario,
  normalizeMissionScenario,
  validateMissionScenario,
} from './missionContract';

/**
 * Versioned domain contract for a GP plan.
 *
 * This module deliberately has no browser, Cesium, or server dependency.  The
 * same shape can therefore be persisted by the browser today and by an API or
 * worker later without changing the optimizer itself.
 */
export const PLAN_SCHEMA = 'gp-digital-twin.plan';
export const PLAN_SCHEMA_VERSION = 2;
export const PLAN_SOURCES = Object.freeze({
  LOCAL: 'browser-local',
  SERVER: 'server',
  SLOT: 'browser-slot',
});

export type PlanItem = Record<string, unknown> & {
  specId: string;
  lon: number;
  lat: number;
  groundH: number;
  headingDeg: number;
};

export type PlanIpbItem = Record<string, unknown> & {
  kind: string;
  lon: number;
  lat: number;
  h: number;
  note: string;
};

export type PlanProvenance = {
  source: string;
  algorithmVersion: string;
  terrainSource: string;
  capturedAt: string;
};

export type PlanSnapshot = Record<string, unknown> & {
  schema: typeof PLAN_SCHEMA;
  version: typeof PLAN_SCHEMA_VERSION;
  updatedAt: string;
  towerHeight: number;
  items: PlanItem[];
  ipb: PlanIpbItem[];
  /** Optional while v2 snapshots migrate to full project/mission persistence. */
  mission?: MissionScenario;
  /** Optional reference to the evidence dataset and derived requirement set. */
  trainingEvidence?: Record<string, unknown> | null;
  provenance: PlanProvenance;
};

export type PlanValidation = { ok: boolean; errors: string[] };
export type NormalizePlanOptions = Partial<Pick<PlanProvenance, 'algorithmVersion' | 'terrainSource'>> & {
  source?: string;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

const finite = (value: unknown, fallback = 0): number => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

function iso(value: unknown, fallback = new Date().toISOString()): string {
  const date = new Date(String(value ?? ''));
  return Number.isFinite(date.getTime()) ? date.toISOString() : fallback;
}

function normalizeItem(item: unknown): PlanItem | null {
  const record = asRecord(item);
  if (!record) return null;
  const specId = String(record.specId ?? '').trim();
  if (!specId) return null;
  return {
    ...record,
    specId,
    lon: finite(record.lon),
    lat: finite(record.lat),
    groundH: finite(record.groundH),
    headingDeg: finite(record.headingDeg),
  };
}

function normalizeIpb(item: unknown): PlanIpbItem | null {
  const record = asRecord(item);
  if (!record) return null;
  const kind = String(record.kind ?? '').trim();
  if (!kind) return null;
  return {
    ...record,
    kind,
    lon: finite(record.lon),
    lat: finite(record.lat),
    h: finite(record.h),
    note: String(record.note ?? ''),
  };
}

/**
 * Normalize old v1 snapshots and attach reproducibility metadata.
 * Unknown fields are retained to keep forward-compatible extensions intact.
 */
export function normalizePlanSnapshot(input: unknown, options: NormalizePlanOptions = {}): PlanSnapshot {
  const inputRecord = asRecord(input);
  const inputProvenance = asRecord(inputRecord?.provenance);
  const source = options.source ?? String(inputProvenance?.source ?? PLAN_SOURCES.LOCAL);
  const now = new Date().toISOString();
  const provenance = {
    source,
    algorithmVersion: String(
      options.algorithmVersion ?? inputProvenance?.algorithmVersion ?? 'gp-digital-twin-optimizer-v2',
    ),
    terrainSource: String(
      options.terrainSource ?? inputProvenance?.terrainSource ?? 'cesium-runtime',
    ),
    capturedAt: iso(inputProvenance?.capturedAt, now),
  };
  const mission = inputRecord?.mission === undefined
    ? undefined
    : normalizeMissionScenario(inputRecord.mission);
  return {
    ...(inputRecord ?? {}),
    schema: PLAN_SCHEMA,
    version: PLAN_SCHEMA_VERSION,
    updatedAt: iso(inputRecord?.updatedAt, now),
    towerHeight: Math.max(0, finite(inputRecord?.towerHeight, 18)),
    items: Array.isArray(inputRecord?.items)
      ? inputRecord.items.map(normalizeItem).filter((item): item is PlanItem => item !== null)
      : [],
    ipb: Array.isArray(inputRecord?.ipb)
      ? inputRecord.ipb.map(normalizeIpb).filter((item): item is PlanIpbItem => item !== null)
      : [],
    ...(mission ? { mission } : {}),
    provenance,
  };
}

export function validatePlanSnapshot(input: unknown): PlanValidation {
  const record = asRecord(input);
  if (!record) {
    return { ok: false, errors: ['plan must be an object'] };
  }
  const errors = [];
  if (record.schema !== PLAN_SCHEMA) errors.push(`schema must be ${PLAN_SCHEMA}`);
  if (record.version !== PLAN_SCHEMA_VERSION) errors.push(`version must be ${PLAN_SCHEMA_VERSION}`);
  if (!Number.isFinite(Number(record.towerHeight)) || Number(record.towerHeight) < 0) {
    errors.push('towerHeight must be a non-negative number');
  }
  if (!Array.isArray(record.items)) errors.push('items must be an array');
  if (!Array.isArray(record.ipb)) errors.push('ipb must be an array');
  if (!asRecord(record.provenance)) errors.push('provenance is required');
  if (record.mission !== undefined) {
    const missionValidation = validateMissionScenario(record.mission);
    errors.push(...missionValidation.errors.map((error) => `mission.${error}`));
  }
  for (const [index, item] of (Array.isArray(record.items) ? record.items : []).entries()) {
    const itemRecord = asRecord(item);
    if (!itemRecord || !String(itemRecord.specId ?? '').trim()) {
      errors.push(`items[${index}].specId is required`);
    }
    if (!Number.isFinite(Number(itemRecord?.lon)) || !Number.isFinite(Number(itemRecord?.lat))) {
      errors.push(`items[${index}] coordinates must be finite`);
    }
  }
  for (const [index, item] of (Array.isArray(record.ipb) ? record.ipb : []).entries()) {
    const itemRecord = asRecord(item);
    if (!itemRecord || !String(itemRecord.kind ?? '').trim()) {
      errors.push(`ipb[${index}].kind is required`);
    }
    if (!Number.isFinite(Number(itemRecord?.lon)) || !Number.isFinite(Number(itemRecord?.lat))) {
      errors.push(`ipb[${index}] coordinates must be finite`);
    }
  }
  return { ok: errors.length === 0, errors };
}

/** Full content key for change detection; do not use a short hash to decide whether to save. */
export function planContentKey(snapshot: unknown): string {
  const normalized = normalizePlanSnapshot(snapshot);
  const { updatedAt: _updatedAt, provenance, ...content } = normalized;
  return JSON.stringify(content, (_key, value) => {
    // Imported JSON can have different object-key order. Array order remains significant.
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return Object.fromEntries(Object.keys(value).sort().map((key) => [key, value[key]]));
    }
    return value;
  });
}

/** JSON snapshots must not retain mutable references to live application objects. */
export function copyPlanSnapshot(snapshot: unknown): PlanSnapshot {
  return JSON.parse(JSON.stringify(normalizePlanSnapshot(snapshot))) as PlanSnapshot;
}

/** Stable-enough digest for UI diagnostics and request correlation. */
export function planFingerprint(snapshot: unknown): string {
  const text = planContentKey(snapshot);
  let hash = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

