/**
 * 전방(휴전선 서해안~동해안) 위성 타일·지형 타일을 미리 긁어와 data/tile-cache/ 에 저장한다.
 * server.cts 의 proxyTileCached / proxyMaptilerLayerJson 을 그대로 통해 요청하므로
 * (직접 상류 API를 부르지 않는다) 이 스크립트가 만든 캐시는 실제 브라우저가 오프라인일 때
 * 쓰는 것과 완전히 같은 파일이다 — 이미 있는 캐시는 서버가 즉시 hit 로 답해 재다운로드가 없다
 * (중단 후 재실행해도 안전).
 *
 *   npx tsx scripts/seed-offline-cache.mts
 *
 * 범위/줌은 아래 CONFIG 에서 조정. 기본값은 "휴전선 전체 폭 · 고화질" 프리셋 — 위성
 * z0-16(ArcGIS World Imagery), 지형 z0-15(MapTiler quantized-mesh-v2 — 온라인/오프라인
 * 공통 기본 지형 소스. ArcGIS World Elevation은 화질은 더 좋지만
 * Cesium.sampleTerrainMostDetailed 가 그 가용성(tilemap) 조회 구조 때문에 병적으로
 * 느려지는 게 실측 확인돼(자동배치·가시영역 등 지형고도를 묻는 모든 기능에 영향) 기본값
 * 에서 뺐다 — 이미 받아둔 ArcGIS 캐시는 GIS탭 수동 선택용으로 그냥 둔다).
 */
import { existsSync, readFileSync, statSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const ROOT = path.resolve(import.meta.dirname, '..');
const toImportUrl = (p: string) => pathToFileURL(p).href;

function readEnvKey(name: string): string {
  const envPath = path.join(ROOT, '.env');
  if (!existsSync(envPath)) return '';
  const line = readFileSync(envPath, 'utf8').split(/\r?\n/).find((l) => l.startsWith(name + '='));
  return line ? line.slice(name.length + 1).trim() : '';
}

// 휴전선 전체 폭(서해안~동해안, MDL 남북 40km) — 위성은 이미 이 범위로 다 받아뒀다.
// const FULL_DMZ_BBOX = { lonMin: 126.1, lonMax: 128.7, latMin: 37.75, latMax: 38.65 };
// MapTiler 무료 플랜이 시간당 소량(2천~6천 타일)만 허용하는 게 확인돼(429 반복) 지형만
// GP-107 반경 약 30km로 좁혔다 — 이 정도면 몇 번의 재시도 주기 안에 끝난다.
const GP_LOCAL_BBOX = { lonMin: 127.85, lonMax: 128.40, latMin: 38.05, latMax: 38.60 };

const CONFIG = {
  base: process.env.GP_URL ?? 'http://127.0.0.1:8917',
  bbox: GP_LOCAL_BBOX,
  imageryMaxZ: 16,   // ArcGIS World Imagery — ~2.4m/px, 도로급 선명도 (이미 전체 캐시됨)
  terrainMaxZ: 15,   // MapTiler quantized-mesh-v2 실제 상한(layer.json maxzoom=15)
  // 동시요청 12개로 새 지형 타일을 쏘면 몇 초 안에 다시 429(재시도 대기 ~2시간)에 걸리는
  // 게 실측 확인됐다 — 위성은 이미 100% 캐시라 동시성 무의미(즉시 hit), 순전히 MapTiler
  // 지형 쪽 순간 버스트 한도 때문. 훨씬 낮춰서 지속 가능한 속도로 간다.
  concurrency: 2,
  terrainDelayMs: 400, // 지형(신규) 요청 사이 최소 간격 — 버스트 한도 재유발 방지
  maptilerKey: readEnvKey('MAPTILER_API_KEY'),
  arcgisKey: readEnvKey('ARCGIS_API_KEY'),
};

// ── 타일 좌표 계산 (Cesium 코어 모듈을 그대로 사용 — 우리가 수식을 다시 구현해서
//    Cesium 실제 타일링과 어긋나는 사고를 막는다) ──
const { default: WebMercatorTilingScheme } = await import(
  toImportUrl(path.join(ROOT, 'node_modules/@cesium/engine/Source/Core/WebMercatorTilingScheme.js'))
);
const { default: GeographicTilingScheme } = await import(
  toImportUrl(path.join(ROOT, 'node_modules/@cesium/engine/Source/Core/GeographicTilingScheme.js'))
);
const { default: Cartographic } = await import(
  toImportUrl(path.join(ROOT, 'node_modules/@cesium/engine/Source/Core/Cartographic.js'))
);

type TileXY = { z: number; x: number; y: number };

function tilesForBbox(scheme: any, maxZ: number, bbox: typeof CONFIG.bbox): TileXY[] {
  const out: TileXY[] = [];
  for (let z = 0; z <= maxZ; z++) {
    const nw = scheme.positionToTileXY(Cartographic.fromDegrees(bbox.lonMin, bbox.latMax), z);
    const se = scheme.positionToTileXY(Cartographic.fromDegrees(bbox.lonMax, bbox.latMin), z);
    const xMin = Math.min(nw.x, se.x), xMax = Math.max(nw.x, se.x);
    const yMin = Math.min(nw.y, se.y), yMax = Math.max(nw.y, se.y);
    for (let x = xMin; x <= xMax; x++) {
      for (let y = yMin; y <= yMax; y++) out.push({ z, x, y });
    }
  }
  return out;
}

// ── 요청 목록 빌드 ──
// 위성: Cesium ArcGisMapServerImageryProvider 가 실제로 쓰는 경로 형식 그대로
//   (buildImageResource → `tile/${level}/${row}/${col}`, row=y가 먼저). 토큰은 base
//   resource 의 쿼리파라미터로 얹혀 모든 파생 타일 요청에 자동으로 따라붙는다
//   (ArcGisMapServerImageryProvider.fromUrl(url, {token}) 내부 동작) — 여기서도 반드시
//   같이 보내야 한다. 빠뜨리면 ibasemaps-api 가 `{"error":{"code":499,"message":"Token
//   Required."}}` 를 200 OK 로 돌려주고, 그게 진짜 타일인 것처럼 캐시에 영구 저장된다
//   (캐시 키가 token 값을 무시하므로 이후 정상 요청도 이 오류 응답을 계속 hit 로 받는다).
const imageryTiles = tilesForBbox(new WebMercatorTilingScheme(), CONFIG.imageryMaxZ, CONFIG.bbox);
const imageryUrls = imageryTiles.map(
  ({ z, x, y }) => `${CONFIG.base}/arcgis-img/tile/${z}/${y}/${x}?token=${CONFIG.arcgisKey}`
);

// 지형: MapTiler quantized-mesh 는 scheme:"tms" (layer.json 미지정 시 기본값) → 실제
//   요청 시 y가 뒤집힌다(CesiumTerrainProvider.requestTileGeometry:
//   terrainY = yTilesAtLevel - y - 1). 그대로 재현하지 않으면 우리가 캐시한 타일과
//   브라우저가 실제로 요청하는 타일이 어긋난다.
const terrainScheme = new GeographicTilingScheme({ numberOfLevelZeroTilesX: 2, numberOfLevelZeroTilesY: 1 });
const terrainTiles = tilesForBbox(terrainScheme, CONFIG.terrainMaxZ, CONFIG.bbox);
const TERRAIN_ACCEPT = 'application/vnd.quantized-mesh;extensions=octvertexnormals,application/octet-stream;q=0.9,*/*;q=0.01';
const terrainRequests = terrainTiles.map(({ z, x, y }) => {
  const yTilesAtLevel = terrainScheme.getNumberOfYTilesAtLevel(z);
  const terrainY = yTilesAtLevel - y - 1;
  return {
    url: `${CONFIG.base}/maptiler-terrain/${z}/${x}/${terrainY}.terrain?key=${CONFIG.maptilerKey}`,
    headers: { Accept: TERRAIN_ACCEPT },
  };
});

function dirSizeBytes(dir: string): number {
  if (!existsSync(dir)) return 0;
  let total = 0;
  for (const f of readdirSync(dir)) {
    // 다른 프로세스가 동시에 이 디렉터리의 파일을 지우고 있을 수 있다(예: 더 이상 안
    // 쓰는 지형 소스 캐시 정리) — readdir 스냅샷과 stat 사이에 사라진 파일은 그냥 건너뛴다.
    try { total += statSync(path.join(dir, f)).size; } catch { /* 방금 지워짐 — 무시 */ }
  }
  return total;
}

console.log(`대상: 위성 ${imageryTiles.length.toLocaleString()}장(z0-${CONFIG.imageryMaxZ}) + 지형 ${terrainTiles.length.toLocaleString()}장(z0-${CONFIG.terrainMaxZ}) = ${(imageryTiles.length + terrainTiles.length).toLocaleString()}건`);
console.log(`bbox: ${CONFIG.bbox.lonMin}~${CONFIG.bbox.lonMax}E, ${CONFIG.bbox.latMin}~${CONFIG.bbox.latMax}N | 서버: ${CONFIG.base}`);

// 먼저 layer.json 을 한 번 통과시켜 프록시 재작성(캐시)이 반영돼 있는지 확인.
const layerJsonRes = await fetch(`${CONFIG.base}/maptiler-terrain/layer.json?key=${CONFIG.maptilerKey}`);
const layerJson = await layerJsonRes.json();
if (!Array.isArray(layerJson.tiles) || !String(layerJson.tiles[0] ?? '').startsWith('/maptiler-terrain')) {
  throw new Error('layer.json tiles 템플릿이 로컬 프록시로 재작성되지 않았습니다 — server.cts 수정이 적용된 서버인지 확인하세요.');
}

type Job = { url: string; headers?: Record<string, string>; kind: 'imagery' | 'terrain' };
// 지형을 먼저 돌린다 — 위성은 이 좁힌 범위에서 이미 100% 캐시돼 있어(전방 전체 다운로드
// 때 다 받아둠) 매번 재시작할 때마다 그걸 다시 훑고 지나가는 데만 몇 분씩 낭비된다
// (MapTiler 429 한도 + 이 세션의 백그라운드 프로세스가 자주 죽는 문제가 겹쳐 재시작이
// 잦다 — 재시작마다 새로운 지형 타일에 최대한 빨리 도달하는 게 중요).
let jobs: Job[] = [
  ...terrainRequests.map((r) => ({ url: r.url, headers: r.headers, kind: 'terrain' as const })),
  ...imageryUrls.map((url) => ({ url, kind: 'imagery' as const })),
];
// GP_SEED_LIMIT=200 처럼 주면 앞부분 N건만 돌려서 빠르게 검증할 수 있다(스모크 테스트용).
const limit = Number(process.env.GP_SEED_LIMIT ?? '');
if (Number.isFinite(limit) && limit > 0) {
  jobs = jobs.slice(0, limit);
  console.log(`GP_SEED_LIMIT=${limit} — 처음 ${jobs.length}건만 실행합니다(테스트 모드).`);
}

let done = 0, hit = 0, fetched = 0, failed = 0;
const startedAt = Date.now();
let nextIndex = 0;
let consecutive429 = 0;
let aborted = false;
const CONSECUTIVE_429_ABORT = 20; // 이 정도 연속되면 이번 회차는 가망 없다 — 나머지 안 태운다
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function worker() {
  while (nextIndex < jobs.length && !aborted) {
    const job = jobs[nextIndex++];
    try {
      const r = await fetch(job.url, { headers: job.headers });
      if (r.status === 200) {
        if (r.headers.get('x-tile-cache') === 'hit') {
          hit++;
        } else {
          fetched++;
          if (job.kind === 'terrain') await sleep(CONFIG.terrainDelayMs); // 버스트 한도 재유발 방지
        }
        consecutive429 = 0;
        await r.arrayBuffer(); // 응답을 다 소비해야 서버 측 캐시 기록이 끝난다
      } else if (r.status === 429) {
        failed++;
        if (++consecutive429 >= CONSECUTIVE_429_ABORT) {
          aborted = true;
          console.log(`\n429 연속 ${consecutive429}회 — 이번 회차 한도 소진으로 판단, 나머지 ${jobs.length - done}건은 건너뜁니다.`);
        }
      } else if (r.status === 504) {
        // 해당 범위/줌에 데이터가 없거나(바다 등) 네트워크 실패 — 계속 진행.
        failed++;
        consecutive429 = 0;
      } else {
        failed++;
        consecutive429 = 0;
      }
    } catch {
      failed++;
    }
    done++;
    if (done % 500 === 0 || done === jobs.length) {
      const elapsedS = (Date.now() - startedAt) / 1000;
      const rate = done / Math.max(1, elapsedS);
      const etaS = Math.max(0, (jobs.length - done) / Math.max(0.001, rate));
      const cacheDir = path.join(ROOT, 'data', 'tile-cache');
      const mb = (dirSizeBytes(cacheDir) / 1024 / 1024).toFixed(0);
      console.log(
        `${done.toLocaleString()}/${jobs.length.toLocaleString()} ` +
        `(기존캐시 ${hit.toLocaleString()} · 신규 ${fetched.toLocaleString()} · 실패 ${failed.toLocaleString()}) ` +
        `${rate.toFixed(1)}건/s · 남은시간 ~${Math.round(etaS / 60)}분 · 캐시 ${mb}MB`
      );
    }
  }
}

await Promise.all(Array.from({ length: CONFIG.concurrency }, () => worker()));

console.log('완료.');
console.log(`총 ${jobs.length.toLocaleString()}건 — 기존캐시 ${hit.toLocaleString()} · 신규 다운로드 ${fetched.toLocaleString()} · 실패/데이터없음 ${failed.toLocaleString()}`);
console.log(`캐시 용량: ${(dirSizeBytes(path.join(ROOT, 'data', 'tile-cache')) / 1024 / 1024).toFixed(0)}MB`);
