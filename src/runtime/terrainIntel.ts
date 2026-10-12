// @ts-nocheck
/**
 * KAIROS 지형정보 분석 — 벤더링한 원본 엔진을 그대로 구동하는 얇은 어댑터.
 *
 *   js/vendor/kairos/terrainIntel.ts   (D:\VISTA_sudo\...\terrainIntel.ts 무수정 사본, 3,044줄)
 *   js/vendor/kairos/terrainViewer.ts  (viewer.ts에서 함수 단위 verbatim 추출)
 *
 * 이 파일에는 재구현이 없다. 하는 일은 세 가지뿐이다:
 *   1) 런타임 설정(VWorld 키·도메인) 주입
 *   2) 원본 sampleTerrainGrid → loadTerrainIntelLayers → buildTerrainIntelAnalysis 순서 호출
 *   3) 원본 addTerrainMarkers / addAnalysisOverlays 로 렌더
 *
 * VWorld 요청은 원본 buildVworldServiceUrl()이 `/api/vworld/...` 로 만들며,
 * server.cts가 그 프리픽스를 api.vworld.kr 로 프록시한다(CORS 우회).
 */
import {
  TERRAIN_INTEL_LAYER_DEFS,
  getDefaultTerrainIntelSelection,
  resolveTerrainIntelRuntimeConfig,
  loadTerrainIntelLayers,
  buildTerrainIntelAnalysis,
  enrichTerrainAnalysisWithRuntimeContext,
} from '../../js/vendor/kairos/terrainIntel';
import {
  sampleTerrainGrid,
  addTerrainMarkers,
  addAnalysisOverlays,
  clearMarkerEntities,
  clearAnalysisOverlayEntities,
  clearAssetRecommendationEntities,
} from '../../js/vendor/kairos/terrainViewer';
import { VWORLD_KEY, VWORLD_DOMAIN } from './config';

// 키는 .env → server.cts `/config.js` → runtime/config.ts 경로로만 들어온다.

export { TERRAIN_INTEL_LAYER_DEFS, getDefaultTerrainIntelSelection };

/** 원본 resolveTerrainIntelRuntimeConfig 계약 그대로 (vworldDomain은 location.hostname 기본값) */
export function intelRuntimeConfig() {
  return resolveTerrainIntelRuntimeConfig(
    { vworldApiKey: VWORLD_KEY, vworldDomain: VWORLD_DOMAIN, ollamaVisionModel: 'llava' },
    new URLSearchParams(window.location.search),
  );
}

/** 분석 대상 경계 — GP를 중심으로 한 정사각 AOI */
export function boundsAround(center, halfMeters = 6000) {
  const dLat = halfMeters / 111320;
  const dLon = halfMeters / (111320 * Math.cos((center.lat * Math.PI) / 180));
  return {
    west: center.lon - dLon, east: center.lon + dLon,
    south: center.lat - dLat, north: center.lat + dLat,
    widthMeters: halfMeters * 2, heightMeters: halfMeters * 2,
  };
}

/**
 * VWorld 데이터 API 상태 점검.
 *
 * 원본 fetchLayerFeatureCollection 은 VWorld 오류를 `payload.status` 로 본다. 실제 응답은
 * `{response:{status:'ERROR', error:{code:'INCORRECT_KEY'}}}` 로 한 겹 감싸여 있어 원본이
 * 이를 못 잡고 조용히 빈 레이어로 넘긴다 — 그래서 "자료 없음"과 "호출 제한"이 구분되지 않는다.
 * 원본은 그대로 두고, 여기서 같은 프록시로 한 번만 찔러 상태를 분류한다.
 *
 * VWorld 는 호출 한도를 넘기면 키 오류(INCORRECT_KEY)로 위장해 응답한다. 키가 잘못된 게 아니다.
 */
export async function probeVworldData(bounds, dataId = 'LT_C_WKMSTRM') {
  if (!VWORLD_KEY) return { ok: false, reason: 'no-key', message: '.env 에 VWORLD_API_KEY 가 없습니다.' };
  const q = new URLSearchParams({
    service: 'data', version: '2.0', request: 'GetFeature', format: 'json',
    size: '1', page: '1', geometry: 'false', attribute: 'false', crs: 'EPSG:4326',
    data: dataId,
    geomFilter: `BOX(${bounds.west},${bounds.south},${bounds.east},${bounds.north})`,
    key: VWORLD_KEY, domain: VWORLD_DOMAIN,
  });
  try {
    const res = await fetch(`/api/vworld/req/data?${q}`);
    const cache = res.headers.get('X-Vworld-Cache');
    const json = await res.json();
    const r = json?.response ?? json;
    const code = r?.error?.code;
    if (code === 'INCORRECT_KEY') {
      return {
        ok: false, reason: 'throttled', cache,
        message: 'VWorld 데이터 API 호출 한도 — 키는 정상이며 잠시 후 다시 시도하면 채워집니다.',
      };
    }
    if (r?.status === 'NOT_FOUND') {
      return { ok: true, reason: 'no-coverage', cache, message: '이 지역에 해당 자료 없음' };
    }
    if (r?.status === 'OK') {
      return { ok: true, reason: 'ok', cache, total: Number(r?.record?.total ?? 0) };
    }
    return { ok: false, reason: 'error', cache, message: r?.error?.text || 'VWorld 오류' };
  } catch (error) {
    return { ok: false, reason: 'network', message: error.message };
  }
}

let layerResults = [];
let layerDataSources = [];

/**
 * GP 지역 도로 보강 레이어.
 *
 * KAIROS 원본의 'road' 레이어는 수치지형도 도로중심선(LT_L_N3A0020000)인데 접경 산악부에는
 * 커버리지가 없다(GP AOI 0건). 교통DB 도로구간(LT_L_MOCTLINK)에는 같은 범위에 자료가 있어,
 * 원본 layerResults 계약(key/layerDef/status/featureCollection/featureCount)에 맞춘 항목으로
 * 만들어 넣는다. buildTerrainIntelAnalysis 는 이걸 자기 도로 레이어로 그대로 소비한다.
 */
const GP_ROAD_DATA_ID = 'LT_L_MOCTLINK';
const ROAD_LAYER_DEF = TERRAIN_INTEL_LAYER_DEFS.find((d) => d.key === 'road');

async function loadGpRoadLayer(bounds) {
  const q = new URLSearchParams({
    service: 'data', version: '2.0', request: 'GetFeature', format: 'json',
    size: '1000', page: '1', geometry: 'true', attribute: 'true', crs: 'EPSG:4326',
    data: GP_ROAD_DATA_ID,
    geomFilter: `BOX(${bounds.west},${bounds.south},${bounds.east},${bounds.north})`,
    key: VWORLD_KEY, domain: VWORLD_DOMAIN,
  });
  const res = await fetch(`/api/vworld/req/data?${q}`);
  const json = await res.json();
  const r = json?.response ?? json;
  if (r?.error?.code === 'INCORRECT_KEY') throw new Error('VWorld 호출 한도');
  const fc = r?.result?.featureCollection;
  if (!fc?.features?.length) return null;
  return {
    key: 'road',
    layerDef: { ...ROAD_LAYER_DEF, dataId: GP_ROAD_DATA_ID, label: '도로구간(교통DB)' },
    status: 'ready',
    featureCollection: fc,
    featureCount: fc.features.length,
  };
}

/** VWorld 보조 레이어 조회 + GeoJSON 렌더 (원본 viewer.js refreshTerrainIntelLayers 절차) */
export async function loadLayers(viewer, bounds, selectedLayerKeys) {
  for (const ds of layerDataSources) viewer.dataSources.remove(ds, true);
  layerDataSources = [];

  layerResults = await loadTerrainIntelLayers({
    bounds, selectedLayerKeys, runtimeConfig: intelRuntimeConfig(),
  });

  // 원본 도로 레이어가 비었으면 교통DB 도로구간으로 대체한다.
  if (selectedLayerKeys.includes('road')) {
    const existing = layerResults.find((l) => l.key === 'road');
    if (!existing || existing.featureCount === 0) {
      try {
        const alt = await loadGpRoadLayer(bounds);
        if (alt) {
          if (existing) Object.assign(existing, alt);
          else layerResults.push(alt);
        }
      } catch { /* 한도/네트워크 실패는 흡수 — 원본이 빈 레이어로 계속 동작 */ }
    }
  }

  for (const result of layerResults) {
    if (result.status !== 'ready' || result.featureCount === 0) continue;
    const ds = await Cesium.GeoJsonDataSource.load(result.featureCollection, { clampToGround: true });
    const stroke = Cesium.Color.fromCssColorString(result.layerDef.style.stroke);
    const fill = Cesium.Color.fromCssColorString(result.layerDef.style.fill);
    ds.entities.values.forEach((entity) => {
      if (entity.polygon) {
        entity.polygon.material = fill;
        entity.polygon.outline = false;
        entity.polygon.classificationType = Cesium.ClassificationType.TERRAIN;
      }
      if (entity.polyline) {
        entity.polyline.material = stroke;
        entity.polyline.width = result.layerDef.style.width;
        entity.polyline.clampToGround = true;
      }
      if (entity.point) {
        entity.point.color = stroke;
        entity.point.pixelSize = 6;
        entity.point.outlineColor = Cesium.Color.fromCssColorString('#04161d');
        entity.point.outlineWidth = 2;
      }
    });
    await viewer.dataSources.add(ds);
    layerDataSources.push(ds);
  }
  return layerResults;
}

export function clearLayers(viewer) {
  for (const ds of layerDataSources) viewer.dataSources.remove(ds, true);
  layerDataSources = [];
  layerResults = [];
}

/**
 * 지형분석 실행 — 원본 파이프라인 그대로.
 * runtimeSnapshot을 주면 원본 enrichTerrainAnalysisWithRuntimeContext가
 * 배치 자산 기준 권고(assetRecommendations)까지 붙인다.
 */
export async function runAnalysis(viewer, bounds, { columns = 16, rows = 16, runtimeSnapshot = null } = {}) {
  const terrainSamples = await sampleTerrainGrid(viewer, bounds, columns, rows);
  const base = buildTerrainIntelAnalysis({
    bounds,
    widthMeters: bounds.widthMeters,
    heightMeters: bounds.heightMeters,
    terrainSamples,
    layerResults,
  });
  const analysis = runtimeSnapshot
    ? enrichTerrainAnalysisWithRuntimeContext(base, runtimeSnapshot)
    : base;

  addTerrainMarkers(viewer, analysis.markers);
  addAnalysisOverlays(viewer, analysis);
  viewer.scene.requestRender();
  return analysis;
}

export function clearAnalysis(viewer) {
  clearMarkerEntities(viewer);
  clearAnalysisOverlayEntities(viewer);
  clearAssetRecommendationEntities(viewer);
  viewer.scene.requestRender();
}

