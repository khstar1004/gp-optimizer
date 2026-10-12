/**
 * GP Digital Twin demo server
 * - Serves the static frontend on http://localhost:8917
 * - Proxies VWorld tile/API requests (avoids CORS; VWorld key is registered for `localhost`)
 *
 * The API/static server is TypeScript compiled at runtime by tsx; the frontend
 * is built with Vite.
 *   npm start
 */
const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const {
  readPlan,
  writePlan,
  deletePlan,
} = require('./server/planStore.cts');
const {
  listSessions,
  createSession,
  updateSession,
  deleteSession,
} = require('./server/sessionStore.cts');

type Request = import('node:http').IncomingMessage;
type Response = import('node:http').ServerResponse;
type UpstreamResponse = import('node:http').IncomingMessage;
type RuntimeConfig = Record<string, string>;

const ROOT = __dirname;
const DIST = path.join(ROOT, 'dist');

// VISTA 3D 에셋(624MB, 57 GLB)은 리포에 복사하지 않고 원본 위치를 정적 마운트한다.
// 벤더링한 placementRuntimeAssets.ts의 resolveTerrainRuntimePublicPath()가
// import.meta.url 기준 `../3d-bundles/...` 로 해석하므로 마운트 지점은 /js/vendor/3d-bundles.
const VISTA_BUNDLES_URL = '/js/vendor/3d-bundles/';
const VISTA_BUNDLES_DIR = process.env.VISTA_BUNDLES_DIR
  || 'C:/Users/USER/Desktop/VISTA/client/public/3d-bundles';

// Only these repository directories are public runtime assets.  In particular,
// do not fall back to ROOT for arbitrary paths: that would expose .env, .git,
// server source, plan snapshots, and other operator data over HTTP.
// Cesium 엔진 자체(Cesium.js·Workers·Assets·ThirdParty·Widgets)를 CDN 대신 로컬에서
// 서빙한다 — 오프라인(랜선 뽑힘)에서도 3D 엔진이 뜨게 하려면 여기가 첫 관문이다.
// 버전은 이 코드베이스가 검증해 둔 1.119 로 고정(package.json 의 --save-exact).
const CESIUM_URL = '/vendor/cesium/';
const CESIUM_DIR = path.join(ROOT, 'node_modules', 'cesium', 'Build', 'Cesium');

const PUBLIC_ROOT_MOUNTS = [
  { urlPrefix: '/assets/', directory: path.join(ROOT, 'assets') },
  { urlPrefix: '/js/vendor/', directory: path.join(ROOT, 'js', 'vendor') },
  { urlPrefix: CESIUM_URL, directory: CESIUM_DIR },
];

function isWithin(base: string, target: string): boolean {
  const relative = path.relative(path.resolve(base), path.resolve(target));
  return relative === ''
    || (relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative));
}

function resolveStaticFile(urlPath: string): string | null {
  const normalized = urlPath === '/' ? '/index.html' : urlPath;
  const distCandidate = path.resolve(DIST, normalized.replace(/^\/+/, ''));
  if (isWithin(DIST, distCandidate) && fs.existsSync(distCandidate)) return distCandidate;

  const mount = PUBLIC_ROOT_MOUNTS.find(({ urlPrefix }) => normalized.startsWith(urlPrefix));
  if (mount) {
    const relative = normalized.slice(mount.urlPrefix.length);
    const rootCandidate = path.resolve(mount.directory, relative);
    if (isWithin(mount.directory, rootCandidate) && fs.existsSync(rootCandidate)) return rootCandidate;
  }
  return null;
}

// ─── 키는 .env 한 곳에서만 읽는다 ───
// 프런트에는 /config.js 로 내려보내고(브라우저에서 직접 호출해야 하는 타일·지형 키),
// 서버에서만 쓰는 키(ITS)는 프록시가 주입해 프런트에 노출하지 않는다.
function loadEnv(): RuntimeConfig {
  const out: RuntimeConfig = {};
  try {
    for (const line of fs.readFileSync(path.join(ROOT, '.env'), 'utf8').split('\n')) {
      const t = line.trim();
      if (!t || t.startsWith('#')) continue;
      const i = t.indexOf('=');
      if (i > 0) out[t.slice(0, i).trim()] = t.slice(i + 1).trim();
    }
  } catch { /* .env 없으면 process.env 로만 동작 */ }
  return out;
}
const ENV: RuntimeConfig = { ...loadEnv(), ...(process.env as RuntimeConfig) };
const PORT = Number(ENV.PORT || 8917);
// The standalone server has no authentication yet, so its safe default must
// be loopback-only.  A caller can still choose another bind address explicitly
// for a protected reverse-proxy deployment.
const HOST = ENV.HOST || '127.0.0.1';
const ITS_API_KEY = ENV.ITS_API_KEY || '';

/**
 * 어떤 LLM 을 쓸지는 **실제로 깔려 있는 모델**이 정한다.
 *
 * 프런트에 모델 이름을 박아 두면, 그 이름이 이 기기에 없는 순간 AI 배치·평가가
 * 조용히 404 로 떨어지고 사용자는 「AI 가 원래 안 되나 보다」로 읽는다(실제로 그랬다).
 * 그래서 서버가 로컬 Ollama 에 무엇이 있는지 물어보고 그 답을 /config.js 로 내려준다.
 * `.env` 의 OLLAMA_MODEL 이 있으면 그것이 최우선이다.
 */
const MODEL_PREFERENCE = [/^gemma4/i, /^qwen3\.5/i, /^llama3\.[13]/i, /^gemma3/i];
let modelCache: { at: number; name: string } | null = null;
const MODEL_CACHE_MS = 30_000;

function listLocalModels(): Promise<string[]> {
  return new Promise((resolve) => {
    const req = http.request({
      hostname: '127.0.0.1', port: 11434, path: '/api/tags', method: 'GET',
    }, (ur: UpstreamResponse) => {
      let body = '';
      ur.on('data', (c: Buffer) => { body += c.toString(); });
      ur.on('end', () => {
        try {
          const rows = (JSON.parse(body).models ?? []) as Array<{ name?: string }>;
          resolve(rows.map((m) => m.name).filter((n): n is string => !!n));
        } catch { resolve([]); }
      });
    });
    req.on('error', () => resolve([]));
    req.setTimeout(1500, () => { req.destroy(); resolve([]); });
    req.end();
  });
}

async function resolveOllamaModel(): Promise<string> {
  if (ENV.OLLAMA_MODEL) return ENV.OLLAMA_MODEL;
  if (modelCache && Date.now() - modelCache.at < MODEL_CACHE_MS) return modelCache.name;
  const models = (await listLocalModels()).filter((m) => !/embed/i.test(m));
  // 선호 순위대로 훑고, 하나도 안 맞으면 아무거나 — 없으면 빈 문자열(프런트가 미가동으로 안내)
  let picked = '';
  for (const rank of MODEL_PREFERENCE) {
    const hit = models.find((m) => rank.test(m));
    if (hit) { picked = hit; break; }
  }
  if (!picked) picked = models[0] ?? '';
  modelCache = { at: Date.now(), name: picked };
  return picked;
}

/** 브라우저가 직접 호출하는 서비스의 키만 내려보낸다 */
async function serveConfig(res: Response): Promise<void> {
  const cfg = JSON.stringify({
    VWORLD_KEY: ENV.VWORLD_API_KEY || '',
    VWORLD_DOMAIN: ENV.VWORLD_DOMAIN || 'localhost',
    MAPTILER_KEY: ENV.MAPTILER_API_KEY || '',
    ARCGIS_KEY: ENV.ARCGIS_API_KEY || '',
    OLLAMA_MODEL: await resolveOllamaModel(),
    // 서버가 "현장에 인터넷이 없는 게 확실하다"고 알고 있으면(.env GP_OFFLINE_TILES=1)
    // 프런트에도 알려서 지형 소스 자동 전환(map.ts)이 navigator.onLine 오탐(로컬 라우터엔
    // 붙어 있지만 상류 인터넷이 없는 경우)을 무시하고 무조건 오프라인 취급하게 한다.
    OFFLINE_TILES: FORCE_OFFLINE_TILES,
  }, null, 2);
  const body = [
    '// 생성물 — server.cts 가 .env 에서 만들어 내려보낸다.',
    `globalThis.__GP_CONFIG__ = ${cfg};`,
    '',
  ].join('\n');
  res.writeHead(200, {
    'Content-Type': 'text/javascript; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
  });
  res.end(body);
}

const VWORLD_HOSTS: Record<string, string> = {
  '/vworld/': 'api.vworld.kr',
  '/xdworld/': 'xdworld.vworld.kr',
  // 벤더링한 KAIROS terrainIntel.buildVworldServiceUrl()이 `/api/vworld/...` 로 프록시한다.
  '/api/vworld/': 'api.vworld.kr',
};

// 로컬 Ollama 프록시 (CORS 우회): /ollama/* → http://127.0.0.1:11434/*
function proxyOllama(req: Request, res: Response): void {
  const upstreamPath = (req.url ?? '/').slice('/ollama'.length) || '/';
  let body = '';
  req.on('data', (c: Buffer | string) => { body += c.toString(); });
  req.on('end', () => {
    const upstream = http.request({
      hostname: '127.0.0.1', port: 11434, path: upstreamPath,
      method: req.method,
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
    }, (ur: UpstreamResponse) => {
      res.writeHead(ur.statusCode || 502, {
        'Content-Type': ur.headers['content-type'] || 'application/json',
        'Access-Control-Allow-Origin': '*',
      });
      ur.pipe(res);
    });
    upstream.on('error', (e: Error) => {
      res.writeHead(502, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'ollama unreachable: ' + e.message }));
    });
    // 큰 모델(9GB급)은 콜드스타트 + 구조화 출력에 수 분이 걸린다.
    upstream.setTimeout(Number(ENV.OLLAMA_TIMEOUT_MS) || 900000,
      () => upstream.destroy(new Error('timeout (모델 추론이 너무 오래 걸립니다)')));
    if (body) upstream.write(body);
    upstream.end();
  });
}

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.glb': 'model/gltf-binary',
  '.gltf': 'model/gltf+json',
  '.ico': 'image/x-icon',
  '.wasm': 'application/wasm',
  '.terrain': 'application/octet-stream',
  '.gif': 'image/gif',
  '.xml': 'application/xml; charset=utf-8',
  '.cjs': 'text/javascript; charset=utf-8',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
};

function proxy(req: Request, res: Response, host: string, upstreamPath: string, port = 443): void {
  // GP_OFFLINE_TILES=1 이면 이 경로(ITS 교통정보, VWorld 3D 건물 등 — 캐시가 없는 단순
  // 통과 프록시)도 상류를 안 부르고 즉시 실패시킨다. 안 그러면 진짜 오프라인일 때
  // Node 의 기본 TCP 연결 타임아웃(수십 초)을 매 호출마다 그대로 기다리게 되고, 그
  // 호출이 UI 흐름 중간에 걸려 있으면(예: 지형 인텔 조회) 화면이 그동안 멈춘 것처럼
  // 보인다. proxyTileCached 의 같은 안전장치와 동일한 이유.
  if (FORCE_OFFLINE_TILES) {
    res.writeHead(504, { 'Content-Type': 'text/plain' });
    res.end('unavailable (GP_OFFLINE_TILES=1)');
    return;
  }
  const options = {
    hostname: host,
    port,
    path: upstreamPath,
    method: 'GET',
    headers: {
      'User-Agent': 'Mozilla/5.0 (GP Digital Twin demo)',
      Referer: 'http://localhost/',
      Host: host,
      Accept: req.headers['accept'] || '*/*',
    },
  };
  const upstream = https.request(options, (ur: UpstreamResponse) => {
    const headers: Record<string, string> = {
      'Content-Type': ur.headers['content-type'] || 'application/octet-stream',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'public, max-age=86400',
    };
    if (ur.headers['content-encoding']) headers['Content-Encoding'] = ur.headers['content-encoding'];
    res.writeHead(ur.statusCode || 502, headers);
    ur.pipe(res);
  });
  upstream.on('error', (e: Error) => {
    res.writeHead(502, { 'Content-Type': 'text/plain' });
    res.end('proxy error: ' + e.message);
  });
  upstream.end();
}

/**
 * VWorld 데이터/WFS 전용 프록시.
 *
 * VWorld 는 짧은 간격의 연속 호출을 `INCORRECT_KEY`(인증키 정보가 올바르지 않습니다) 로 거절한다.
 * 키가 잘못된 게 아니라 호출 제한이다 — 실제로 같은 키가 잠시 뒤 정상 응답한다.
 * KAIROS 원본 loadTerrainIntelLayers 는 레이어를 연달아 요청하므로 이 경로에 반드시 걸린다.
 * 그래서 응답을 버퍼링해 그 신호를 감지하면 지수 백오프로 재시도한다(원본 코드는 그대로 둔다).
 */
const VWORLD_RETRY_MAX = 3;
const VWORLD_RETRY_BASE_MS = 2500;
// 재시도를 다 쓰고도 한도면 잠시 차단한다. 그러지 않으면 레이어마다 재시도가 쌓여
// 분석 파이프라인 전체가 수 분간 멈춘다 (한도는 곧 풀리지 않는 성격이다).
const VWORLD_COOLDOWN_MS = 5 * 60 * 1000;
let vworldCooldownUntil = 0;

const VWORLD_THROTTLED_BODY = Buffer.from(JSON.stringify({
  response: {
    status: 'ERROR',
    error: { level: '2', code: 'INCORRECT_KEY', text: 'VWorld 호출 한도 (로컬 차단 중)' },
  },
}));

// 데이터 API 는 호출량 한도가 있다. 성공 응답은 디스크에 캐시해 같은 레이어를 두 번 부르지 않는다.
// (KAIROS 원본은 분석할 때마다 레이어를 다시 요청한다 — 그 호출이 전부 캐시로 흡수된다.)
const VWORLD_CACHE_DIR = path.join(ROOT, 'data', 'vworld-cache');

function vworldCachePath(upstreamPath: string): string {
  // 키는 캐시 키에서 제외한다(키를 바꿔도 같은 자료면 재사용).
  const normalized = upstreamPath.replace(/([?&])key=[^&]*/g, '$1key=');
  const hash = crypto.createHash('sha1').update(normalized).digest('hex').slice(0, 20);
  return path.join(VWORLD_CACHE_DIR, hash + '.json');
}

function readVworldCache(upstreamPath: string): Buffer | null {
  try { return fs.readFileSync(vworldCachePath(upstreamPath)); } catch { return null; }
}

function writeVworldCache(upstreamPath: string, buf: Buffer): void {
  try {
    fs.mkdirSync(VWORLD_CACHE_DIR, { recursive: true });
    fs.writeFileSync(vworldCachePath(upstreamPath), buf);
  } catch { /* 캐시 실패는 무시 */ }
}

function proxyVworldData(req: Request, res: Response, host: string, upstreamPath: string, attempt = 1): void {
  if (attempt === 1) {
    const cached = readVworldCache(upstreamPath);
    if (cached) {
      res.writeHead(200, {
        'Content-Type': 'application/json;charset=UTF-8',
        'Access-Control-Allow-Origin': '*',
        'X-Vworld-Cache': 'hit',
      });
      res.end(cached);
      return;
    }
    // 한도 차단 중이면 상류를 부르지 않고 즉시 알린다 (호출자는 빈 레이어로 계속 진행).
    if (Date.now() < vworldCooldownUntil) {
      res.writeHead(200, {
        'Content-Type': 'application/json;charset=UTF-8',
        'Access-Control-Allow-Origin': '*',
        'X-Vworld-Cache': 'cooldown',
        'X-Vworld-Cooldown-Ms': String(vworldCooldownUntil - Date.now()),
      });
      res.end(VWORLD_THROTTLED_BODY);
      return;
    }
    // GP_OFFLINE_TILES=1 이고 캐시도 없으면 상류를 안 부르고 즉시 실패시킨다 — 안 그러면
    // 진짜 오프라인일 때 Node 기본 TCP 타임아웃(수십 초)을 재시도 횟수만큼 그대로
    // 기다리게 된다. 호출자가 이미 이 응답 모양(INCORRECT_KEY 위장)을 빈 레이어로
    // 계속 진행하는 경로로 처리하므로 그대로 재사용한다.
    if (FORCE_OFFLINE_TILES) {
      res.writeHead(200, {
        'Content-Type': 'application/json;charset=UTF-8',
        'Access-Control-Allow-Origin': '*',
        'X-Vworld-Cache': 'offline',
      });
      res.end(VWORLD_THROTTLED_BODY);
      return;
    }
  }
  const options = {
    hostname: host, port: 443, path: upstreamPath, method: 'GET',
    headers: {
      'User-Agent': 'Mozilla/5.0 (GP Digital Twin demo)',
      Referer: `http://${ENV.VWORLD_DOMAIN || 'localhost'}/`,
      Host: host,
      Accept: req.headers['accept'] || '*/*',
    },
  };
  const upstream = https.request(options, (ur: UpstreamResponse) => {
    const chunks: Buffer[] = [];
    ur.on('data', (c: Buffer | string) => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)));
    ur.on('end', () => {
      const buf = Buffer.concat(chunks);
      const throttled = buf.includes('INCORRECT_KEY');
      if (!throttled && (ur.statusCode || 0) < 400) writeVworldCache(upstreamPath, buf);
      if (throttled && attempt <= VWORLD_RETRY_MAX) {
        const wait = VWORLD_RETRY_BASE_MS * attempt;
        console.log(`  vworld throttled (${attempt}/${VWORLD_RETRY_MAX}) — ${wait}ms 후 재시도`);
        return setTimeout(
          () => proxyVworldData(req, res, host, upstreamPath, attempt + 1), wait);
      }
      if (throttled) {
        vworldCooldownUntil = Date.now() + VWORLD_COOLDOWN_MS;
        console.log(`  vworld 한도 — ${VWORLD_COOLDOWN_MS / 60000}분간 상류 호출을 차단합니다`);
      } else if (vworldCooldownUntil) {
        vworldCooldownUntil = 0;  // 정상 응답이 오면 차단 해제
      }
      res.writeHead(ur.statusCode || 502, {
        'Content-Type': ur.headers['content-type'] || 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'no-store',
        'X-Vworld-Attempts': String(attempt),
        'X-Vworld-Cache': 'miss',
      });
      res.end(buf);
    });
  });
  upstream.on('error', (e: Error) => {
    if (attempt <= VWORLD_RETRY_MAX) {
      return setTimeout(
        () => proxyVworldData(req, res, host, upstreamPath, attempt + 1),
        VWORLD_RETRY_BASE_MS * attempt);
    }
    res.writeHead(502, { 'Content-Type': 'text/plain' });
    res.end('vworld proxy error: ' + e.message);
  });
  upstream.end();
}

/**
 * 위성 타일(ArcGIS World Imagery) · 지형 조각(MapTiler quantized-mesh) 캐시 프록시.
 *
 * 랜선을 뽑으면 이 둘은 브라우저가 직접 인터넷으로 나가려다 실패한다(디오라마 모드는
 * globe.show=false 라 애초에 안 부르므로 무관). 온라인일 때 지나간 타일은 여기서
 * 전부 디스크에 남겨 두었다가, 캐시가 있으면 상류를 부르지 않고 즉시 그걸로 답한다 —
 * GP 주변을 한 번 둘러보기만 하면 그 범위·줌은 오프라인에서도 그대로 뜬다.
 * VWorld 데이터 캐시(readVworldCache)와 같은 설계를 재사용한다.
 */
const TILE_CACHE_DIR = path.join(ROOT, 'data', 'tile-cache');

function tileCacheBase(host: string, upstreamPath: string): string {
  // 토큰/키는 캐시 키에서 뺀다 — 키를 나중에 바꿔도 같은 타일을 재사용한다.
  const stripped = upstreamPath.replace(/([?&](?:token|key)=)[^&]*/gi, '$1');
  const hash = crypto.createHash('sha1').update(host + stripped).digest('hex').slice(0, 24);
  return path.join(TILE_CACHE_DIR, hash);
}

function readTileCache(base: string): { body: Buffer; contentType: string } | null {
  try {
    const meta = JSON.parse(fs.readFileSync(base + '.json', 'utf8'));
    return { body: fs.readFileSync(base + '.bin'), contentType: meta.contentType };
  } catch { return null; }
}

function writeTileCache(base: string, body: Buffer, contentType: string): void {
  try {
    fs.mkdirSync(TILE_CACHE_DIR, { recursive: true });
    fs.writeFileSync(base + '.bin', body);
    fs.writeFileSync(base + '.json', JSON.stringify({ contentType, cachedAt: Date.now() }));
  } catch { /* 캐시 실패는 무시 — 다음에 다시 시도 */ }
}

// GP_OFFLINE_TILES=1 이면 상류를 아예 안 부른다 — 현장에 인터넷이 없는 게 확실할 때
// 연결 타임아웃으로 매 타일 몇 초씩 낭비하지 않고 즉시 캐시/실패로 답한다. 검증용으로도
// 쓴다(오프라인을 재현하려고 방화벽·hosts 파일 등 시스템 설정을 건드릴 필요가 없다).
const FORCE_OFFLINE_TILES = ENV.GP_OFFLINE_TILES === '1' || process.env.GP_OFFLINE_TILES === '1';

/**
 * MapTiler layer.json 은 tiles 템플릿을 항상 절대 URL(https://api.maptiler.com/…)로
 * 내려준다. Cesium 의 Resource.parseUrl 은 scheme 이 있는(=절대) URL을 만나면 base
 * resource 를 무시하고 그 절대 URL을 그대로 쓴다 — 즉 /maptiler-terrain 프록시를 거쳐
 * 이 메타데이터를 받아도, 그 뒤 실제 지형 타일(z/x/y.terrain) 요청은 절대 URL을 그대로
 * 써서 api.maptiler.com 으로 직행하고 proxyTileCached 를 완전히 건너뛴다 — 캐시가
 * 전혀 안 쌓인다. tiles 템플릿의 호스트를 우리 프록시 경로(/maptiler-terrain)로 바꿔서
 * 내려주면, 이후 개별 타일 요청도 same-origin 이 되어 proxyTileCached 를 타게 된다.
 */
function proxyMaptilerLayerJson(req: Request, res: Response, upstreamPath: string): void {
  const base = tileCacheBase('api.maptiler.com', upstreamPath);
  const cached = readTileCache(base);
  if (cached) {
    res.writeHead(200, {
      'Content-Type': cached.contentType,
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'public, max-age=604800',
      'X-Tile-Cache': 'hit',
    });
    res.end(cached.body);
    return;
  }
  if (FORCE_OFFLINE_TILES) {
    res.writeHead(504, { 'Content-Type': 'text/plain', 'X-Tile-Cache': 'forced-offline-miss' });
    res.end('layer.json unavailable (GP_OFFLINE_TILES=1, not cached)');
    return;
  }
  const options = {
    hostname: 'api.maptiler.com', port: 443, path: upstreamPath, method: 'GET',
    headers: { 'User-Agent': 'Mozilla/5.0 (GP Digital Twin demo)', Host: 'api.maptiler.com', Accept: 'application/json' },
  };
  const upstream = https.request(options, (ur: UpstreamResponse) => {
    const chunks: Buffer[] = [];
    ur.on('data', (c: Buffer | string) => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)));
    ur.on('end', () => {
      const buf = Buffer.concat(chunks);
      if ((ur.statusCode || 0) >= 400) {
        res.writeHead(ur.statusCode || 502, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
        res.end(buf);
        return;
      }
      let rewritten: Buffer;
      try {
        const json = JSON.parse(buf.toString('utf8'));
        if (Array.isArray(json.tiles)) {
          json.tiles = json.tiles.map((t: string) =>
            String(t).replace(/^https?:\/\/api\.maptiler\.com\/tiles\/terrain-quantized-mesh-v2/, '/maptiler-terrain'));
        }
        rewritten = Buffer.from(JSON.stringify(json));
      } catch {
        // 파싱 실패 시 원본을 그대로 돌려주되 캐시는 하지 않는다(다음 요청에서 재시도).
        res.writeHead(ur.statusCode || 502, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
        res.end(buf);
        return;
      }
      writeTileCache(base, rewritten, 'application/json');
      res.writeHead(200, {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=604800',
        'X-Tile-Cache': 'miss',
      });
      res.end(rewritten);
    });
  });
  upstream.on('error', () => {
    res.writeHead(504, { 'Content-Type': 'text/plain', 'X-Tile-Cache': 'offline-miss' });
    res.end('layer.json unavailable offline');
  });
  upstream.end();
}

function proxyTileCached(req: Request, res: Response, host: string, upstreamPath: string): void {
  const base = tileCacheBase(host, upstreamPath);
  const cached = readTileCache(base);
  if (cached) {
    res.writeHead(200, {
      'Content-Type': cached.contentType,
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'public, max-age=604800',
      'X-Tile-Cache': 'hit',
    });
    res.end(cached.body);
    return;
  }
  if (FORCE_OFFLINE_TILES) {
    res.writeHead(504, { 'Content-Type': 'text/plain', 'X-Tile-Cache': 'forced-offline-miss' });
    res.end('tile unavailable (GP_OFFLINE_TILES=1, not cached)');
    return;
  }
  const options = {
    hostname: host, port: 443, path: upstreamPath, method: 'GET',
    headers: {
      'User-Agent': 'Mozilla/5.0 (GP Digital Twin demo)',
      Referer: 'http://localhost/',
      Host: host,
      Accept: req.headers['accept'] || '*/*',
    },
  };
  const upstream = https.request(options, (ur: UpstreamResponse) => {
    const chunks: Buffer[] = [];
    ur.on('data', (c: Buffer | string) => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)));
    ur.on('end', () => {
      const buf = Buffer.concat(chunks);
      const ct = (ur.headers['content-type'] as string) || 'application/octet-stream';
      // ArcGIS 위성/지형은 토큰 만료·한도 초과·잘못된 좌표 에러를 200 OK + application/json
      // `{"error": {...}}` 로 돌려준다(예: ibasemaps-api "Token Required"). VWorld WMTS는
      // 에러를 200 OK + XML(ows:ExceptionReport)로 돌려준다. 그걸 진짜 타일인 줄 알고 캐시하면
      // 캐시 키가 token/key 값을 무시하는 설계상 이후 정상 요청도 영원히 이 오류를 hit 로 받는다
      // — 그래서 캐시하지 않는다. 단, ArcGIS World Elevation(/arcgis-elevation)의 메타데이터
      // (`?f=pjson`)·가용성 조회(`tilemap/...`)는 **정상일 때도** JSON을 돌려주므로, JSON은
      // 무조건 차단하지 않고 실제로 `error` 키를 가진 ArcGIS 에러 형태일 때만 차단한다.
      let isErrorPayload = ct.includes('xml');
      if (!isErrorPayload && ct.includes('json')) {
        try {
          const parsed = JSON.parse(buf.toString('utf8'));
          isErrorPayload = Boolean(parsed) && typeof parsed === 'object' && 'error' in parsed;
        } catch { /* JSON 파싱 실패 — 에러로 보지 않고 그대로 캐시(타일맵 등 정상 응답일 수 있음) */ }
      }
      if ((ur.statusCode || 0) < 400 && !isErrorPayload) writeTileCache(base, buf, ct);
      res.writeHead(ur.statusCode || 502, {
        'Content-Type': ct,
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': isErrorPayload ? 'no-store' : 'public, max-age=604800',
        'X-Tile-Cache': 'miss',
      });
      res.end(buf);
    });
  });
  upstream.on('error', () => {
    // 오프라인 등으로 상류를 못 불렀고 캐시도 없었다는 뜻 — 그 타일은 정말 없다.
    res.writeHead(504, { 'Content-Type': 'text/plain', 'X-Tile-Cache': 'offline-miss' });
    res.end('tile unavailable offline');
  });
  upstream.end();
}

function sendJson(res: Response, status: number, payload: unknown, headers: Record<string, string | number> = {}): void {
  const body = payload === undefined ? '' : JSON.stringify(payload);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    ...headers,
  });
  res.end(body);
}

function readJsonBody(req: Request, maxBytes = 1024 * 1024): Promise<unknown> {
  return new Promise<unknown>((resolve, reject) => {
    let size = 0;
    const chunks: Buffer[] = [];
    let settled = false;
    req.on('data', (chunk: Buffer | string) => {
      if (settled) return;
      size += chunk.length;
      if (size > maxBytes) {
        settled = true;
        reject(new Error('request body exceeds 1 MiB'));
        req.resume();
        return;
      }
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    });
    req.on('end', () => {
      if (settled) return;
      settled = true;
      try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8'))); }
      catch { reject(new Error('request body must be valid JSON')); }
    });
    req.on('error', (error: Error) => {
      if (!settled) { settled = true; reject(error); }
    });
  });
}

/**
 * Versioned plan API. It is file-backed for this standalone deployment; the
 * handler is intentionally storage-agnostic so it can move to Postgres later.
 */
async function handlePlanApi(req: Request, res: Response, parsedUrl: URL): Promise<boolean> {
  if (parsedUrl.pathname === '/api/health') {
    const ollamaModel = await resolveOllamaModel();
    sendJson(res, 200, {
      status: 'ok', service: 'gp-digital-twin', planApi: 'v1', time: new Date().toISOString(),
      checks: {
        storage: fs.existsSync(path.join(ROOT, 'data', 'plans')),
        ollama: { configured: Boolean(ollamaModel), model: ollamaModel || null },
        vworld: Boolean(ENV.VWORLD_API_KEY),
        maptiler: Boolean(ENV.MAPTILER_API_KEY),
        vistaBundles: fs.existsSync(VISTA_BUNDLES_DIR),
      },
    });
    return true;
  }
  const match = parsedUrl.pathname.match(/^\/api\/plans\/([^/]+)$/);
  if (!match) return false;
  const planId = decodeURIComponent(match[1]!);
  if (req.method === 'GET') {
    const result = readPlan(planId);
    if (result.status !== 200) {
      sendJson(res, result.status, result.status === 404 ? { error: 'plan not found' } : { error: result.error });
      return true;
    }
    sendJson(res, 200, result.snapshot, { ETag: result.etag });
    return true;
  }
  if (req.method === 'PUT') {
    try {
      const input = await readJsonBody(req);
      const result = writePlan(planId, input, req.headers['if-match'] || null);
      if (result.status !== 200) {
        sendJson(res, result.status, { error: result.error });
        return true;
      }
      sendJson(res, 200, result.snapshot, { ETag: result.etag });
    } catch (error) {
      sendJson(res, 400, { error: (error as Error).message || 'invalid plan' });
    }
    return true;
  }
  if (req.method === 'DELETE') {
    const result = deletePlan(planId);
    if (result.status !== 204) sendJson(res, result.status, { error: result.error });
    else res.writeHead(204, { 'Cache-Control': 'no-store' }).end();
    return true;
  }
  res.setHeader('Allow', 'GET, PUT, DELETE');
  sendJson(res, 405, { error: 'method not allowed' });
  return true;
}

/**
 * 세션 레지스트리 API — 이름·즐겨찾기 메타데이터만 다룬다(배치 내용은 /api/plans/:id).
 */
async function handleSessionApi(req: Request, res: Response, parsedUrl: URL): Promise<boolean> {
  if (parsedUrl.pathname === '/api/sessions') {
    if (req.method === 'GET') {
      const result = listSessions();
      sendJson(res, result.status, result.sessions);
      return true;
    }
    if (req.method === 'POST') {
      try {
        const input = await readJsonBody(req);
        const result = createSession(input);
        if (result.status === 400) { sendJson(res, result.status, { error: result.error }); return true; }
        sendJson(res, result.status, result.session);
      } catch (error) {
        sendJson(res, 400, { error: (error as Error).message || 'invalid session' });
      }
      return true;
    }
    res.setHeader('Allow', 'GET, POST');
    sendJson(res, 405, { error: 'method not allowed' });
    return true;
  }
  const match = parsedUrl.pathname.match(/^\/api\/sessions\/([^/]+)$/);
  if (!match) return false;
  const sessionId = decodeURIComponent(match[1]!);
  if (req.method === 'PATCH') {
    try {
      const input = await readJsonBody(req);
      const result = updateSession(sessionId, input);
      if (result.status !== 200) {
        sendJson(res, result.status, { error: result.error });
        return true;
      }
      sendJson(res, 200, result.session);
    } catch (error) {
      sendJson(res, 400, { error: (error as Error).message || 'invalid session' });
    }
    return true;
  }
  if (req.method === 'DELETE') {
    const result = deleteSession(sessionId);
    if (result.status !== 204) sendJson(res, result.status, { error: result.error });
    else res.writeHead(204, { 'Cache-Control': 'no-store' }).end();
    return true;
  }
  res.setHeader('Allow', 'PATCH, DELETE');
  sendJson(res, 405, { error: 'method not allowed' });
  return true;
}

const server = http.createServer((req: Request, res: Response) => {
  const rawUrl = req.url ?? '/';
  let url;
  try { url = decodeURIComponent(rawUrl.split('?')[0]); }
  catch {
    return sendJson(res, 400, { error: 'malformed URL' });
  }
  const parsedUrl = new URL(rawUrl, `http://${req.headers.host || 'localhost'}`);

  if (url === '/api/health' || url.startsWith('/api/plans/')) {
    void handlePlanApi(req, res, parsedUrl);
    return;
  }

  if (url === '/api/sessions' || url.startsWith('/api/sessions/')) {
    void handleSessionApi(req, res, parsedUrl);
    return;
  }

  if (url === '/config.js') { void serveConfig(res); return; }

  if (rawUrl.startsWith('/ollama/')) return proxyOllama(req, res);

  // 위성 타일 · 지형 조각 — 캐시 프록시(오프라인 대응, 위 proxyTileCached 참조).
  if (rawUrl.startsWith('/arcgis-img')) {
    return proxyTileCached(req, res, 'ibasemaps-api.arcgis.com',
      '/arcgis/rest/services/World_Imagery/MapServer' + rawUrl.slice('/arcgis-img'.length));
  }
  if (rawUrl.startsWith('/maptiler-terrain')) {
    const upstreamPath = '/tiles/terrain-quantized-mesh-v2' + rawUrl.slice('/maptiler-terrain'.length);
    // layer.json 은 특수 처리(tiles 템플릿을 로컬 프록시 경로로 재작성) — 위 주석 참조.
    if (upstreamPath.split('?')[0].endsWith('/layer.json')) {
      return proxyMaptilerLayerJson(req, res, upstreamPath);
    }
    return proxyTileCached(req, res, 'api.maptiler.com', upstreamPath);
  }
  // ArcGIS World Elevation(ImageServer, LERC) — 기본 지형. ArcGISTiledElevationTerrainProvider
  // 가 만드는 요청은 전부 base(=/arcgis-elevation)에 대한 상대경로(`?f=pjson` 메타데이터,
  // `tile/{z}/{y}/{x}` 지형 조각, `tile{s}map/{z}/{y}/{x}/{dim}/{dim}` 가용성 조회)라
  // MapTiler 때와 달리 절대 URL 재작성이 필요 없다 — proxyTileCached 로 바로 캐시된다.
  if (rawUrl.startsWith('/arcgis-elevation')) {
    return proxyTileCached(req, res, 'elevation3d.arcgis.com',
      '/arcgis/rest/services/WorldElevation3D/Terrain3D/ImageServer' + rawUrl.slice('/arcgis-elevation'.length));
  }

  // 국가교통정보센터(ITS) 실시간 소통정보 프록시 — 브라우저 CORS 우회.
  // 키는 서버에서 주입한다(프런트 노출 방지). 예: /its/trafficInfo?minX=..&maxX=..
  if (rawUrl.startsWith('/its/')) {
    const u = new URL(rawUrl, 'http://localhost');
    u.searchParams.set('apiKey', ITS_API_KEY);
    if (!u.searchParams.has('getType')) u.searchParams.set('getType', 'json');
    if (!u.searchParams.has('type')) u.searchParams.set('type', 'all');
    return proxy(req, res, 'openapi.its.go.kr', u.pathname.slice('/its'.length) + u.search, 9443);
  }

  for (const [prefix, host] of Object.entries(VWORLD_HOSTS)) {
    if (rawUrl.startsWith(prefix)) {
      const upstreamPath = rawUrl.slice(prefix.length - 1);
      // 데이터/WFS 요청은 호출 제한에 걸리면 INCORRECT_KEY 로 위장해 돌아온다 → 백오프 재시도
      if (/^\/req\/(data|wfs)/.test(upstreamPath)) {
        return proxyVworldData(req, res, host, upstreamPath);
      }
      // WMTS 타일(Satellite/Hybrid/midnight — map.ts 가 기본으로 얹는 지명·도로 오버레이
      // 포함)도 위성·지형과 같은 디스크 캐시 프록시를 태운다. 이전엔 무조건 plain proxy 라
      // 오프라인에서 절대 안 뜨고(GP_OFFLINE_TILES=1 이어도 상류를 계속 시도) 캐시도
      // 안 쌓였다 — ArcGIS 위성만 오프라인 되고 그 위에 얹히는 하이브리드 라벨 레이어는
      // 여전히 인터넷이 있어야 뜨는 반쪽짜리 오프라인이 됐을 것이다.
      if (/^\/req\/wmts\//.test(upstreamPath)) {
        return proxyTileCached(req, res, host, upstreamPath);
      }
      return proxy(req, res, host, upstreamPath);
    }
  }

  let filePath: string | null;
  if (url.startsWith(VISTA_BUNDLES_URL)) {
    const rel = url.slice(VISTA_BUNDLES_URL.length);
    const candidate = path.resolve(VISTA_BUNDLES_DIR, rel);
    if (!isWithin(VISTA_BUNDLES_DIR, candidate)) {
      res.writeHead(403, { 'X-Content-Type-Options': 'nosniff' });
      return res.end();
    }
    filePath = candidate;
  } else {
    filePath = resolveStaticFile(url);
  }
  if (!filePath) {
    res.writeHead(404, {
      'Content-Type': 'text/plain; charset=utf-8',
      'X-Content-Type-Options': 'nosniff',
    });
    return res.end('404 ' + url);
  }
  if (url.startsWith(VISTA_BUNDLES_URL) && !fs.existsSync(filePath)) {
    res.writeHead(404, {
      'Content-Type': 'text/plain; charset=utf-8',
      'X-Content-Type-Options': 'nosniff',
    });
    return res.end();
  }
  fs.readFile(filePath, (err: NodeJS.ErrnoException | null, data: Buffer) => {
    if (err) {
      res.writeHead(404, {
        'Content-Type': 'text/plain; charset=utf-8',
        'X-Content-Type-Options': 'nosniff',
      });
      return res.end('404 ' + url);
    }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, {
      'Content-Type': MIME[ext] || 'application/octet-stream',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'same-origin',
    });
    res.end(data);
  });
});

server.listen(PORT, HOST, () => {
  console.log(`GP Digital Twin demo:  http://${HOST}:${PORT}`);
});
