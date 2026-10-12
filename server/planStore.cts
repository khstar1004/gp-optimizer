const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PLAN_SCHEMA = 'gp-digital-twin.plan';
const PLAN_SCHEMA_VERSION = 2;
const PLAN_ID_RE = /^[A-Za-z0-9_-]{1,80}$/;
const PLANS_DIR = path.join(__dirname, '..', 'data', 'plans');

type JsonRecord = Record<string, unknown>;
type ErrorWithCode = NodeJS.ErrnoException;
type ReadPlanResult =
  | { status: 200; snapshot: JsonRecord; etag: string }
  | { status: 400 | 500; error: string }
  | { status: 404 };
type WritePlanResult =
  | { status: 200; snapshot: JsonRecord; etag: string }
  | { status: 400 | 409; error: string };
type DeletePlanResult = { status: 204 } | { status: 400 | 500; error: string };

function asRecord(value: unknown): JsonRecord | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as JsonRecord
    : null;
}

function planFile(planId: string): string | null {
  if (!PLAN_ID_RE.test(planId)) return null;
  return path.join(PLANS_DIR, `${planId}.json`);
}

function etag(body: string): string {
  return `"${crypto.createHash('sha256').update(body).digest('hex').slice(0, 16)}"`;
}

function readPlan(planId: string): ReadPlanResult {
  const file = planFile(planId);
  if (!file) return { status: 400, error: 'invalid plan id' };
  try {
    const body = fs.readFileSync(file, 'utf8');
    const snapshot = asRecord(JSON.parse(body));
    if (!snapshot) return { status: 500, error: 'plan storage payload is not an object' };
    return { status: 200, snapshot, etag: etag(body) };
  } catch (error) {
    if ((error as ErrorWithCode).code === 'ENOENT') return { status: 404 };
    return { status: 500, error: 'plan storage read failed' };
  }
}

function normalizePlan(input: unknown): { body: string; snapshot: JsonRecord; etag: string } {
  const record = asRecord(input);
  if (!record) throw new Error('plan must be an object');
  if (record.schema !== PLAN_SCHEMA || record.version !== PLAN_SCHEMA_VERSION) {
    throw new Error(`plan schema must be ${PLAN_SCHEMA} v${PLAN_SCHEMA_VERSION}`);
  }
  if (!Array.isArray(record.items) || !Array.isArray(record.ipb)) throw new Error('items and ipb must be arrays');
  if (!asRecord(record.provenance)) throw new Error('provenance is required');
  if (!Number.isFinite(Number(record.towerHeight)) || Number(record.towerHeight) < 0) {
    throw new Error('towerHeight must be a non-negative number');
  }
  for (const [index, item] of record.items.entries()) {
    const itemRecord = asRecord(item);
    if (!itemRecord || !String(itemRecord.specId || '').trim()) {
      throw new Error(`items[${index}].specId is required`);
    }
    if (!Number.isFinite(Number(itemRecord.lon)) || !Number.isFinite(Number(itemRecord.lat))) {
      throw new Error(`items[${index}] coordinates must be finite`);
    }
  }
  for (const [index, item] of record.ipb.entries()) {
    const itemRecord = asRecord(item);
    if (!itemRecord || !String(itemRecord.kind || '').trim()) {
      throw new Error(`ipb[${index}].kind is required`);
    }
    if (!Number.isFinite(Number(itemRecord.lon)) || !Number.isFinite(Number(itemRecord.lat))) {
      throw new Error(`ipb[${index}] coordinates must be finite`);
    }
  }
  const body = JSON.stringify({
    ...record,
    towerHeight: Number(record.towerHeight),
    updatedAt: new Date().toISOString(),
  });
  if (Buffer.byteLength(body) > 1024 * 1024) throw new Error('plan payload exceeds 1 MiB');
  return { body, snapshot: JSON.parse(body) as JsonRecord, etag: etag(body) };
}

function writePlan(planId: string, input: unknown, expectedEtag: string | null = null): WritePlanResult {
  const file = planFile(planId);
  if (!file) return { status: 400, error: 'invalid plan id' };
  const current = readPlan(planId);
  if (expectedEtag && current.status === 200 && expectedEtag !== current.etag) {
    return { status: 409, error: 'plan changed on server' };
  }
  try {
    const next = normalizePlan(input);
    fs.mkdirSync(PLANS_DIR, { recursive: true });
    const temp = `${file}.${process.pid}.${Date.now()}.tmp`;
    fs.writeFileSync(temp, next.body, { encoding: 'utf8', flag: 'wx' });
    fs.renameSync(temp, file);
    return { status: 200, snapshot: next.snapshot, etag: next.etag };
  } catch (error) {
    if ((error as ErrorWithCode).code === 'EEXIST') return { status: 409, error: 'plan write collision' };
    return { status: 400, error: (error as Error).message || 'invalid plan' };
  }
}

function deletePlan(planId: string): DeletePlanResult {
  const file = planFile(planId);
  if (!file) return { status: 400, error: 'invalid plan id' };
  try { fs.unlinkSync(file); } catch (error) {
    if ((error as ErrorWithCode).code !== 'ENOENT') return { status: 500, error: 'plan delete failed' };
  }
  return { status: 204 };
}

module.exports = { PLAN_SCHEMA, PLAN_SCHEMA_VERSION, readPlan, writePlan, deletePlan };
