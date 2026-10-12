const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// 세션 레지스트리 — 「같은 GP에 서로 다른 배치안(계획+감시자산)」을 여러 개 두고
// 좌측 상단 스위처로 옮겨 다니기 위한 메타데이터 저장소. 실제 배치 내용은
// planStore.cts 가 세션 id == planId 로 이미 저장한다(단일 JSON 파일). 여기서는
// 그 planId 들에 이름·즐겨찾기를 붙이는 얇은 색인만 둔다.
const SESSIONS_FILE = path.join(__dirname, '..', 'data', 'sessions', 'index.json');
const SESSION_ID_RE = /^[A-Za-z0-9_-]{1,80}$/;
const NAME_MAX = 60;

type JsonRecord = Record<string, unknown>;
type ErrorWithCode = NodeJS.ErrnoException;
export type TerrainRef = {
  catalogId: string;
  gp?: { lon: number; lat: number };
  hub?: { lon: number; lat: number };
  name?: string;
};
export type SessionRecord = {
  id: string;
  name: string;
  favorite: boolean;
  createdAt: string;
  updatedAt: string;
  /** 세션을 만들 때 고른 GP/지형 — 생성 후엔 안 바뀐다(그 GP는 그 자리다). 구버전 세션엔 없을 수 있다. */
  terrain?: TerrainRef;
};

function asRecord(value: unknown): JsonRecord | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as JsonRecord
    : null;
}

function asTerrainRef(value: unknown): TerrainRef | undefined {
  const r = asRecord(value);
  if (!r || typeof r.catalogId !== 'string' || !r.catalogId.trim()) return undefined;
  const point = (p: unknown) => {
    const pr = asRecord(p);
    return pr && Number.isFinite(Number(pr.lon)) && Number.isFinite(Number(pr.lat))
      ? { lon: Number(pr.lon), lat: Number(pr.lat) } : undefined;
  };
  const ref: TerrainRef = { catalogId: r.catalogId.trim().slice(0, 40) };
  const gp = point(r.gp);
  const hub = point(r.hub);
  if (gp) ref.gp = gp;
  if (hub) ref.hub = hub;
  if (typeof r.name === 'string' && r.name.trim()) ref.name = r.name.trim().slice(0, 60);
  return ref;
}

function isSessionRecord(value: unknown): value is SessionRecord {
  const r = asRecord(value);
  return !!r && typeof r.id === 'string' && SESSION_ID_RE.test(r.id)
    && typeof r.name === 'string' && typeof r.favorite === 'boolean'
    && typeof r.createdAt === 'string' && typeof r.updatedAt === 'string';
}

function sanitizeName(name: unknown, fallback: string): string {
  const trimmed = String(name ?? '').trim().slice(0, NAME_MAX);
  return trimmed || fallback;
}

function readAll(): SessionRecord[] {
  try {
    const raw = fs.readFileSync(SESSIONS_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(isSessionRecord) : [];
  } catch (error) {
    if ((error as ErrorWithCode).code === 'ENOENT') return [];
    return [];
  }
}

function writeAll(sessions: SessionRecord[]): void {
  fs.mkdirSync(path.dirname(SESSIONS_FILE), { recursive: true });
  const body = JSON.stringify(sessions, null, 2);
  const temp = `${SESSIONS_FILE}.${process.pid}.${Date.now()}.tmp`;
  fs.writeFileSync(temp, body, 'utf8');
  fs.renameSync(temp, SESSIONS_FILE);
}

function listSessions(): { status: 200; sessions: SessionRecord[] } {
  const sessions = readAll().sort((a, b) =>
    (Number(b.favorite) - Number(a.favorite)) || (Date.parse(b.updatedAt) - Date.parse(a.updatedAt)));
  return { status: 200, sessions };
}

type CreateResult = { status: 200 | 201; session: SessionRecord } | { status: 400; error: string };

/** 클라이언트가 로컬에서 이미 만든 세션을 뒤늦게 동기화하는 경우가 흔하므로 upsert(멱등)로 둔다. */
function createSession(input: unknown): CreateResult {
  const record = asRecord(input) ?? {};
  const id = String(record.id ?? '').trim() || crypto.randomUUID();
  if (!SESSION_ID_RE.test(id)) return { status: 400, error: 'invalid session id' };
  const sessions = readAll();
  const existing = sessions.find((s) => s.id === id);
  if (existing) return { status: 200, session: existing };
  const now = new Date().toISOString();
  const terrain = asTerrainRef(record.terrain);
  const session: SessionRecord = {
    id,
    name: sanitizeName(record.name, `세션 ${sessions.length + 1}`),
    favorite: Boolean(record.favorite),
    createdAt: typeof record.createdAt === 'string' ? record.createdAt : now,
    updatedAt: typeof record.updatedAt === 'string' ? record.updatedAt : now,
    ...(terrain ? { terrain } : {}),
  };
  sessions.push(session);
  writeAll(sessions);
  return { status: 201, session };
}

type UpdateResult = { status: 200; session: SessionRecord } | { status: 400 | 404; error: string };
function updateSession(id: string, patch: unknown): UpdateResult {
  if (!SESSION_ID_RE.test(id)) return { status: 400, error: 'invalid session id' };
  const sessions = readAll();
  const idx = sessions.findIndex((s) => s.id === id);
  if (idx === -1) return { status: 404, error: 'session not found' };
  const record = asRecord(patch) ?? {};
  const current = sessions[idx]!;
  const next: SessionRecord = {
    ...current,
    name: record.name !== undefined ? sanitizeName(record.name, current.name) : current.name,
    favorite: record.favorite !== undefined ? Boolean(record.favorite) : current.favorite,
    updatedAt: new Date().toISOString(),
  };
  sessions[idx] = next;
  writeAll(sessions);
  return { status: 200, session: next };
}

type DeleteResult = { status: 204 } | { status: 400; error: string };
function deleteSession(id: string): DeleteResult {
  if (!SESSION_ID_RE.test(id)) return { status: 400, error: 'invalid session id' };
  writeAll(readAll().filter((s) => s.id !== id));
  return { status: 204 };
}

module.exports = { listSessions, createSession, updateSession, deleteSession };
