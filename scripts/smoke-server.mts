/**
 * Repeatable local-server smoke test.
 *
 * Usage: npm run smoke:server
 * Optional: GP_BASE_URL=http://127.0.0.1:8917
 */
const baseUrl = (process.env.GP_BASE_URL ?? 'http://127.0.0.1:8917').replace(/\/$/, '');

async function check(path: string, expectedStatus: number): Promise<Response> {
  const response = await fetch(`${baseUrl}${path}`);
  if (response.status !== expectedStatus) {
    throw new Error(`${path}: expected ${expectedStatus}, received ${response.status}`);
  }
  return response;
}

const health = await check('/api/health', 200).then((response) => response.json()) as {
  status?: string;
  checks?: Record<string, unknown>;
};
if (health.status !== 'ok') throw new Error('health status is not ok');
for (const name of ['storage', 'ollama', 'vworld', 'maptiler', 'vistaBundles']) {
  if (!(name in (health.checks ?? {}))) throw new Error(`health check missing: ${name}`);
}

await check('/', 200);
await check('/config.js', 200);
await check('/assets/models/gp_tower_base.glb', 200);
for (const path of ['/.env', '/.git/config', '/server.cts', '/assets/../.env', '/js/vendor/../..//.env']) {
  await check(path, 404);
}

console.log(`GP Digital Twin server smoke passed: ${baseUrl}`);
