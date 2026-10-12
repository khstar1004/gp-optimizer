// @ts-nocheck
/**
 * Cesium 3D 디지털트윈 초기화 — VISTA cesiumWorld.js 검증 패턴 이식
 * - 영상: VWorld WMTS Satellite + Hybrid (localhost 등록 키, {z}/{y}/{x} 순서 주의)
 * - 지형: MapTiler quantized-mesh-v2 — 온라인/오프라인 공통 기본값. ArcGIS World
 *   Elevation은 더 조밀하지만 Cesium.sampleTerrainMostDetailed(자동배치·가시영역 등
 *   지형고도를 실제로 묻는 모든 기능이 쓴다)가 그 가용성(tilemap) 조회 구조 때문에
 *   병적으로 느려지는 게 실측으로 확인돼(3점에 5초+) 기본값에서 뺐다 — 순수 렌더링만
 *   보는 GIS탭 수동 선택 용도로는 여전히 남겨 둔다.
 * - 3D 건물: VWorld facility_LOD4 3D Tileset (선택)
 */
import { SITE } from './data';
import { VWORLD_KEY, MAPTILER_KEY, ARCGIS_KEY } from './config';

export { VWORLD_KEY, MAPTILER_KEY, ARCGIS_KEY };
const KOREA_RECT = () => Cesium.Rectangle.fromDegrees(124.5, 33.0, 132.5, 39.5);

function vworldProvider(layer, ext) {
  return new Cesium.UrlTemplateImageryProvider({
    // 직접 호출은 CORS 헤더 부재로 WebGL 텍스처 사용 불가 → server.cts 프록시 경유
    url: `/vworld/req/wmts/1.0.0/${VWORLD_KEY}/${layer}/{z}/{y}/{x}.${ext}`,
    credit: 'VWorld',
    minimumLevel: 6,
    maximumLevel: 19,
    rectangle: KOREA_RECT(),
  });
}

async function arcgisTerrain() {
  return Cesium.ArcGISTiledElevationTerrainProvider.fromUrl('/arcgis-elevation/');
}
async function maptilerTerrain() {
  return Cesium.CesiumTerrainProvider.fromUrl(
    `/maptiler-terrain/?key=${MAPTILER_KEY}`, { requestVertexNormals: true });
}

export async function initViewer(onStatus) {
  onStatus?.('3D 지형 엔진 초기화…');

  // 기본 베이스맵 = ArcGIS World Imagery. VWorld 위성은 GP(DMZ 인근) 지역에서
  // z13+ 부터 심하게 블러 업스케일되어(3.6KB짜리 그라데이션 뭉갬) 지형이 색 얼룩으로
  // 보인다 — ESRI 쪽은 같은 좌표에서 전술도로까지 선명하다(실측: 14KB 타일).
  // API 키(ARCGIS_KEY)가 있으면 인증되는 ibasemaps-api 엔드포인트로, 없으면 옛 키 없는
  // 공개 엔드포인트로 폴백한다. server.cts /arcgis-img 프록시를 거쳐 디스크에
  // 캐시되므로(proxyTileCached) 한 번 본 범위·줌은 오프라인에서도 그대로 뜬다.
  let baseProvider;
  try {
    baseProvider = ARCGIS_KEY
      ? await Cesium.ArcGisMapServerImageryProvider.fromUrl(
          '/arcgis-img', { token: ARCGIS_KEY })
      : await Cesium.ArcGisMapServerImageryProvider.fromUrl(
          'https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer');
  } catch (e) {
    console.warn('ArcGIS World Imagery 로드 실패 → VWorld 위성 폴백', e);
    baseProvider = vworldProvider('Satellite', 'jpeg');
  }

  const viewer = new Cesium.Viewer('cesiumContainer', {
    baseLayerPicker: false,
    geocoder: false,
    homeButton: false,
    sceneModePicker: false,
    navigationHelpButton: false,
    animation: false,
    timeline: false,
    fullscreenButton: false,
    infoBox: false,
    selectionIndicator: false,
    baseLayer: new Cesium.ImageryLayer(baseProvider),
  });

  // 지명·도로 하이브리드 오버레이
  viewer.imageryLayers.addImageryProvider(vworldProvider('Hybrid', 'png'));

  onStatus?.('정밀 지형(DEM) 연결…');
  try {
    // /maptiler-terrain 프록시를 거친다(server.cts, 디스크 캐시+오프라인 대응) — 온라인/
    // 오프라인 공통 기본값. 이유는 위 파일 헤더 주석 참조.
    viewer.terrainProvider = await maptilerTerrain();
    viewer.__gpTerrainId = 'maptiler';
  } catch (e) {
    console.warn('MapTiler terrain failed → ArcGIS fallback', e);
    try {
      viewer.terrainProvider = await arcgisTerrain();
      viewer.__gpTerrainId = 'arcgis';
    } catch (e2) {
      console.warn('ArcGIS terrain failed → ellipsoid', e2);
      viewer.terrainProvider = new Cesium.EllipsoidTerrainProvider();
      viewer.__gpTerrainId = 'flat';
    }
  }

  const scene = viewer.scene;
  scene.globe.depthTestAgainstTerrain = true;
  scene.globe.enableLighting = false;
  scene.skyAtmosphere.show = true;
  scene.fog.enabled = true;
  scene.fog.density = 0.00012;

  // ─── 시네마틱 렌더링 ───
  scene.msaaSamples = 4;
  scene.postProcessStages.fxaa.enabled = true;
  const bloom = scene.postProcessStages.bloom;
  bloom.enabled = true;
  bloom.uniforms.glowOnly = false;
  bloom.uniforms.contrast = 119;
  bloom.uniforms.brightness = -0.42;
  bloom.uniforms.delta = 0.9;
  bloom.uniforms.sigma = 3.0;
  bloom.uniforms.stepSize = 1.2;
  // 대기 톤 (약한 청록 헤이즈)
  scene.skyAtmosphere.hueShift = -0.02;
  scene.skyAtmosphere.saturationShift = 0.05;
  scene.globe.atmosphereLightIntensity = 12.0;
  scene.highDynamicRange = true;

  const cam = SITE.camera.home;
  viewer.camera.setView({
    destination: Cesium.Cartesian3.fromDegrees(cam.lon, cam.lat, cam.height),
    orientation: {
      heading: Cesium.Math.toRadians(cam.heading),
      pitch: Cesium.Math.toRadians(cam.pitch),
      roll: 0,
    },
  });

  return viewer;
}

export function flyTo(viewer, lon, lat, height, heading = 0, pitch = -35, duration = 2.2) {
  viewer.camera.flyTo({
    destination: Cesium.Cartesian3.fromDegrees(lon, lat, height),
    orientation: {
      heading: Cesium.Math.toRadians(heading),
      pitch: Cesium.Math.toRadians(pitch),
      roll: 0,
    },
    duration,
  });
}

// 야간/안개 전환은 더 이상 여기 없다 — 조명·안개·영상보정은 environment.js 의
// EnvironmentController 한 곳에서만 온다. 주간/야간을 켜고 끄는 스위치가 따로
// 있으면 시각 슬라이더가 만든 하늘을 그 스위치가 되돌리게 되고, 그러면 어느 쪽이
// 진짜인지 화면만 봐서는 알 수 없다. 아래 initViewer 의 초기값(enableLighting
// false, fog 0.00012)은 부팅 한 프레임짜리이며 env.start() 가 곧바로 덮는다.

/** flyTo를 Promise로 */
function flyToAsync(viewer, opts) {
  return new Promise((resolve) => {
    viewer.camera.flyTo({ ...opts, complete: resolve, cancel: resolve });
  });
}

let tourToken = 0;
export function cancelTour() { tourToken++; }

/**
 * 시네마틱 투어: 광역 조감 → 침투축선 활강 → GP 궤도선회 → 능선 스카이라인 → 타워 시점
 * gp: {lon, lat}, groundH: 타워 지반고.
 * onStage(title, meta) — title=null 이면 종료. meta={index,total,sub}.
 */
export async function cinematicTour(viewer, gp, groundH, towerH, onStage) {
  const my = ++tourToken;
  const D = Cesium.Cartesian3.fromDegrees;
  const rad = Cesium.Math.toRadians;
  const alive = () => tourToken === my;

  const stages = [
    {
      title: '전장 광역 조감', sub: 'GP-107 능선 · 정밀지형',
      fly: { dest: [gp.lon, gp.lat - 0.055, 9500], head: 0, pitch: -42, dur: 3.2 },
    },
    {
      title: '침투축선 북방 활강', sub: '주 접근로 · 감제 종심',
      fly: { dest: [gp.lon - 0.003, gp.lat + 0.030, groundH + 1900], head: 168, pitch: -26, dur: 4.0 },
    },
    { title: 'GP 궤도 선회', sub: '초소·시설 배치 조망', orbit: true },
    {
      title: '능선 스카이라인', sub: '감제선 실루엣',
      fly: { dest: [gp.lon + 0.021, gp.lat - 0.007, groundH + 140], head: 292, pitch: -4, dur: 3.6 },
    },
    {
      title: '감시탑 1인칭 시점', sub: `관측고 ${Math.round(groundH + towerH + 2)}m`,
      fly: { dest: [gp.lon, gp.lat, groundH + towerH + 4], head: 0, pitch: -5, dur: 2.6 },
    },
  ];
  const total = stages.length;

  for (let i = 0; i < stages.length; i++) {
    if (!alive()) return;
    const s = stages[i];
    onStage?.(s.title, { index: i + 1, total, sub: s.sub });
    if (s.orbit) {
      const start = performance.now();
      const DUR = 6500;
      await new Promise((resolve) => {
        const tick = () => {
          if (!alive() || performance.now() - start > DUR) return resolve();
          const t = (performance.now() - start) / DUR;
          const az = rad(200 + t * 250);
          const r = 900 - t * 250;
          const x = gp.lon + (r * Math.sin(az)) / (111320 * Math.cos(rad(gp.lat)));
          const y = gp.lat + (r * Math.cos(az)) / 110540;
          viewer.camera.setView({
            destination: D(x, y, groundH + 380 - t * 120),
            orientation: { heading: az + Math.PI, pitch: rad(-18), roll: 0 },
          });
          requestAnimationFrame(tick);
        };
        tick();
      });
    } else {
      const f = s.fly;
      await flyToAsync(viewer, {
        destination: D(f.dest[0], f.dest[1], f.dest[2]),
        orientation: { heading: rad(f.head), pitch: rad(f.pitch), roll: 0 },
        duration: f.dur,
      });
    }
  }
  if (!alive()) return;
  onStage?.(null);
}

