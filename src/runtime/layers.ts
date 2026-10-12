// @ts-nocheck
/**
 * 다중 소스 레이어 매니저 — 실전 GIS 스타일 (Terria/ArcGIS 카탈로그 패턴)
 * 베이스맵: VWorld 위성 / VWorld 야간 / ArcGIS World Imagery / OpenTopoMap
 * 오버레이: VWorld 하이브리드(지명), ArcGIS Hillshade(음영기복), VWorld 3D 건물
 * 지형 소스: MapTiler quantized-mesh / ArcGIS World Elevation / 타원체
 */
import { VWORLD_KEY, MAPTILER_KEY, ARCGIS_KEY } from './map';

const KOREA_RECT = () => Cesium.Rectangle.fromDegrees(124.5, 33.0, 132.5, 39.5);

function vworldProvider(layer, ext) {
  return new Cesium.UrlTemplateImageryProvider({
    url: `/vworld/req/wmts/1.0.0/${VWORLD_KEY}/${layer}/{z}/{y}/{x}.${ext}`,
    credit: 'VWorld', minimumLevel: 6, maximumLevel: 19, rectangle: KOREA_RECT(),
  });
}

export const BASEMAPS = [
  { id: 'vworld-sat', name: 'VWorld 위성', make: () => vworldProvider('Satellite', 'jpeg') },
  { id: 'vworld-night', name: 'VWorld 야간지도', make: () => vworldProvider('midnight', 'png') },
  {
    id: 'arcgis-img', name: 'ArcGIS World Imagery',
    make: () => ARCGIS_KEY
      ? Cesium.ArcGisMapServerImageryProvider.fromUrl('/arcgis-img', { token: ARCGIS_KEY })
      : Cesium.ArcGisMapServerImageryProvider.fromUrl(
          'https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer'),
  },
  {
    id: 'opentopo', name: 'OpenTopoMap (등고지형도)',
    make: () => new Cesium.UrlTemplateImageryProvider({
      url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
      subdomains: ['a', 'b', 'c'], credit: '© OpenTopoMap (CC-BY-SA)', maximumLevel: 16,
    }),
  },
];

export const OVERLAYS = [
  { id: 'hybrid', name: 'VWorld 지명·도로', make: () => vworldProvider('Hybrid', 'png'), alpha: 1.0 },
  {
    id: 'hillshade', name: 'ArcGIS 음영기복 (Hillshade)',
    make: () => Cesium.ArcGisMapServerImageryProvider.fromUrl(
      'https://services.arcgisonline.com/arcgis/rest/services/Elevation/World_Hillshade/MapServer'),
    alpha: 0.5,
  },
];

export const TERRAINS = [
  {
    id: 'maptiler', name: 'MapTiler 정밀지형',
    // /maptiler-terrain 프록시 경유(server.cts, 디스크 캐시+오프라인 대응) — map.ts
    // initViewer 의 온라인/오프라인 공통 기본 지형과 동일 경로.
    make: () => Cesium.CesiumTerrainProvider.fromUrl(
      `/maptiler-terrain/?key=${MAPTILER_KEY}`,
      { requestVertexNormals: true }),
  },
  {
    id: 'arcgis', name: 'ArcGIS World Elevation',
    // /arcgis-elevation 프록시 경유 — 더 조밀하지만 Cesium.sampleTerrainMostDetailed
    // (자동배치·가시영역 등)가 이 소스에서 병적으로 느려지는 게 확인돼 기본값에서
    // 뺐다(map.ts 헤더 주석 참조). 순수 조망용으로 수동 선택할 때만 쓴다.
    make: () => Cesium.ArcGISTiledElevationTerrainProvider.fromUrl('/arcgis-elevation/'),
  },
  { id: 'flat', name: '타원체 (지형 없음)', make: () => new Cesium.EllipsoidTerrainProvider() },
];

export class LayerManager {
  constructor(viewer) {
    this.viewer = viewer;
    // map.ts 부트가 이미 ArcGIS World Imagery 를 0번에 넣는다 — GP 인근에서
    // VWorld 위성보다 훨씬 선명해(전술도로까지 보임) 기본값으로 채택했다.
    this.basemapId = 'arcgis-img';
    // map.ts initViewer 가 정한 기본 지형(viewer.__gpTerrainId, 기본 'maptiler')을
    // 그대로 반영해 이 선택기의 초기 표시를 맞춘다.
    this.terrainId = viewer.__gpTerrainId || 'maptiler';
    this.overlayLayers = new Map(); // id → ImageryLayer
    this.buildings = null;          // VWorld 3D 타일셋
    this.onTerrainChange = null;
    // 부트 시 map.js가 이미 base(0)=위성, (1)=하이브리드를 넣음 → 등록
    if (viewer.imageryLayers.length > 1) {
      this.overlayLayers.set('hybrid', viewer.imageryLayers.get(1));
    }
  }

  async setBasemap(id) {
    const def = BASEMAPS.find((b) => b.id === id);
    if (!def) return;
    const provider = await def.make();
    const layers = this.viewer.imageryLayers;
    const old = layers.get(0);
    layers.remove(old, true);
    const layer = layers.addImageryProvider(provider, 0);
    this.basemapId = id;
    return layer;
  }

  hasOverlay(id) { return this.overlayLayers.has(id); }

  async toggleOverlay(id, on) {
    const def = OVERLAYS.find((o) => o.id === id);
    if (!def) return;
    const existing = this.overlayLayers.get(id);
    if (!on) {
      if (existing) { this.viewer.imageryLayers.remove(existing, true); this.overlayLayers.delete(id); }
      return;
    }
    if (existing) return;
    const provider = await def.make();
    const layer = this.viewer.imageryLayers.addImageryProvider(provider);
    layer.alpha = def.alpha;
    this.overlayLayers.set(id, layer);
  }

  setOverlayAlpha(id, alpha) {
    const layer = this.overlayLayers.get(id);
    if (layer) layer.alpha = alpha;
  }

  /** VWorld 3D 건물 (VISTA cesiumWorld.js 이식 — facility_LOD4 타일셋) */
  async toggleBuildings(on) {
    if (!on) {
      if (this.buildings) { this.viewer.scene.primitives.remove(this.buildings); this.buildings = null; }
      return;
    }
    if (this.buildings) return;
    try {
      this.buildings = await Cesium.Cesium3DTileset.fromUrl(
        'https://xdworld.vworld.kr/TDServer/services/facility_LOD4/vworld_3d_facility.json',
        { maximumScreenSpaceError: 10, dynamicScreenSpaceError: false, skipLevelOfDetail: false, preferLeaves: true });
      this.viewer.scene.primitives.add(this.buildings);
    } catch (e) {
      console.warn('VWorld 3D buildings load failed', e);
      this.buildings = null;
      throw e;
    }
  }

  async setTerrain(id) {
    const def = TERRAINS.find((t) => t.id === id);
    if (!def) return;
    this.viewer.terrainProvider = await def.make();
    this.terrainId = id;
    this.viewer.__gpTerrainId = id;
    this.onTerrainChange?.(id);
  }
}

