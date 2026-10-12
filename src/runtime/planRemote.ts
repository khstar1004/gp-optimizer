/** Thin API adapter. The UI can continue to run local-only if the API is absent. */
const REQUEST_TIMEOUT_MS = 1800;

type RequestOptions = RequestInit & { timeoutMs?: number };
export type RemotePlan = { snapshot: unknown; etag: string | null };

async function request(path: string, options: RequestOptions = {}): Promise<Response> {
  const controller = new AbortController();
  const { timeoutMs = REQUEST_TIMEOUT_MS, signal, ...init } = options;
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(path, { ...init, signal: signal ?? controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

export function planPath(planId: string): string {
  return `/api/plans/${encodeURIComponent(planId)}`;
}

export async function loadRemotePlan(planId: string): Promise<RemotePlan | null> {
  const response = await request(planPath(planId), { headers: { Accept: 'application/json' } });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`plan load failed (${response.status})`);
  return {
    snapshot: await response.json(),
    etag: response.headers.get('ETag'),
  };
}

export async function saveRemotePlan(planId: string, snapshot: unknown, etag: string | null = null): Promise<RemotePlan> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json', Accept: 'application/json' };
  if (etag) headers['If-Match'] = etag;
  const response = await request(planPath(planId), {
    method: 'PUT', headers, body: JSON.stringify(snapshot), timeoutMs: 4500,
  });
  if (response.status === 409) throw new Error('plan changed on server (reload required)');
  if (!response.ok) throw new Error(`plan save failed (${response.status})`);
  return { snapshot: await response.json(), etag: response.headers.get('ETag') };
}

export async function deleteRemotePlan(planId: string): Promise<void> {
  const response = await request(planPath(planId), { method: 'DELETE', timeoutMs: 1800 });
  if (!response.ok && response.status !== 404) throw new Error(`plan delete failed (${response.status})`);
}

