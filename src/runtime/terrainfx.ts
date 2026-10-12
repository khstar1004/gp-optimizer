// @ts-nocheck
/**
 * 지형분석 머티리얼 + 태양·그림자 + 날씨 셰이더
 *
 * 이식 원본:
 *  - Cesium Sandcastle "Globe Materials": ElevationRamp/SlopeRamp/AspectRamp +
 *    ElevationContour 합성 fabric 패턴 (컬러램프 캔버스 방식 그대로)
 *  - 커뮤니티 표준 비/눈 PostProcessStage GLSL (cesium weather OSS 계열)
 * 경사 램프는 GP 도메인화: 이동수단 한계경사(차량 24° / 구보 30° / 도보 38°) 기동성 색상
 */

// ─── 컬러 램프 (Sandcastle getColorRamp 패턴) ───
function buildRamp(stops) {
  const ramp = document.createElement('canvas');
  ramp.width = 128; ramp.height = 1;
  const ctx = ramp.getContext('2d');
  const grd = ctx.createLinearGradient(0, 0, 128, 0);
  for (const [pos, color] of stops) grd.addColorStop(pos, color);
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, 128, 1);
  return ramp;
}

// 기동성 경사 램프: 0..90°를 0..1로 (SlopeRamp 셰이더 규약)
const MOBILITY_SLOPE_STOPS = [
  [0.0, 'rgba(61,214,140,0.0)'],       // 평지 — 투명 (영상 표출)
  [0.08, 'rgba(61,214,140,0.45)'],     // ~7° 전차량 기동
  [24 / 90, 'rgba(227,179,65,0.55)'],  // 24° 차량 한계
  [30 / 90, 'rgba(242,120,60,0.6)'],   // 30° 구보 한계
  [38 / 90, 'rgba(237,93,93,0.65)'],   // 38° 도보 한계
  [0.55, 'rgba(150,40,60,0.7)'],
  [1.0, 'rgba(80,20,40,0.75)'],
];
const ELEV_STOPS = [
  [0.0, 'rgba(45,80,150,0.55)'],
  [0.25, 'rgba(61,170,140,0.5)'],
  [0.5, 'rgba(227,179,65,0.5)'],
  [0.75, 'rgba(200,110,60,0.55)'],
  [1.0, 'rgba(240,240,245,0.6)'],
];
const ASPECT_STOPS = [
  [0.0, 'rgba(237,93,93,0.55)'],   // N
  [0.25, 'rgba(227,179,65,0.55)'], // E
  [0.5, 'rgba(61,214,140,0.55)'],  // S
  [0.75, 'rgba(94,177,239,0.55)'], // W
  [1.0, 'rgba(237,93,93,0.55)'],
];

/** Sandcastle 합성 fabric: 램프 + 등고선 */
function rampContourMaterial(rampType, rampImage, extraUniforms = {}) {
  const material = new Cesium.Material({
    fabric: {
      type: `${rampType}Contour`,
      materials: {
        contourMaterial: { type: 'ElevationContour' },
        rampMaterial: { type: rampType },
      },
      components: {
        diffuse: 'contourMaterial.alpha == 0.0 ? rampMaterial.diffuse : contourMaterial.diffuse',
        alpha: 'max(contourMaterial.alpha, rampMaterial.alpha)',
      },
    },
    translucent: false,
  });
  const contour = material.materials.contourMaterial;
  contour.uniforms.width = 1.4;
  contour.uniforms.spacing = 100;
  contour.uniforms.color = Cesium.Color.WHITE.withAlpha(0.35);
  const rampU = material.materials.rampMaterial;
  rampU.uniforms.image = rampImage;
  Object.assign(rampU.uniforms, extraUniforms);
  return material;
}

export const TERRAIN_MODES = [
  { id: 'none', name: '표출 없음' },
  { id: 'slope', name: '경사도 (기동성)' },
  { id: 'aspect', name: '사면향 (Aspect)' },
  { id: 'elevation', name: '표고 램프' },
  { id: 'contour', name: '등고선만' },
];

// ─── 글로브 머티리얼 조정자 ───
// globe.material 은 하나뿐인데 두 가지가 그것을 원한다 — 지형분석 표출과 적설.
// 둘 다 각자 대입하면 마지막에 그린 쪽이 이기고, 화면만 봐서는 왜 그런지 알 수 없다.
// 그래서 상태를 여기 한 곳에 모아두고 규칙을 하나로 정한다: **운용자가 명시적으로
// 고른 지형분석이 언제나 이긴다.** 적설은 표출이 꺼져 있을 때만 땅에 앉는다.
const _globe = { mode: 'none', snow: null };

/** 경사 램프로 만든 적설 — 급사면에는 눈이 붙지 않는다. */
function snowRamp(snow) {
  const [r, g, b] = snow.color.map((c) => Math.round(Math.max(0, Math.min(1, c)) * 255));
  const at = (k) => `rgba(${r}, ${g}, ${b}, ${(snow.cover * k).toFixed(3)})`;
  const hold = snow.holdSlopeDeg / 90;
  const shed = snow.shedSlopeDeg / 90;
  return buildRamp([
    [0.0, at(0.94)],           // 평지 — 그대로 쌓인다
    [hold, at(0.8)],           // 완사면 — 거의 그대로
    [(hold + shed) / 2, at(0.3)],
    [shed, at(0.0)],           // 급사면 — 흘러내려 붙지 않는다
    [1.0, at(0.0)],
  ]);
}

function applyGlobeMaterial(viewer) {
  const globe = viewer.scene.globe;
  const mode = _globe.mode;
  if (mode !== 'none') { globe.material = terrainMaterial(mode); return; }
  const snow = _globe.snow;
  if (snow && snow.cover > 0.02) {
    const m = Cesium.Material.fromType('SlopeRamp');
    m.uniforms.image = snowRamp(snow);
    globe.material = m;
    return;
  }
  globe.material = undefined;
}

/** 적설 갱신 — weatherFx 가 환경 상태마다 불러 준다. */
export function setGroundSnow(viewer, snow) {
  _globe.snow = snow;
  applyGlobeMaterial(viewer);
}

export function setTerrainMode(viewer, mode) {
  _globe.mode = mode;
  applyGlobeMaterial(viewer);
}

function terrainMaterial(mode) {
  if (mode === 'contour') {
    const m = Cesium.Material.fromType('ElevationContour');
    m.uniforms.width = 1.5;
    m.uniforms.spacing = 100;
    m.uniforms.color = Cesium.Color.WHITE.withAlpha(0.4);
    return m;
  }
  if (mode === 'slope') return rampContourMaterial('SlopeRamp', buildRamp(MOBILITY_SLOPE_STOPS));
  if (mode === 'aspect') return rampContourMaterial('AspectRamp', buildRamp(ASPECT_STOPS));
  if (mode === 'elevation') {
    return rampContourMaterial('ElevationRamp', buildRamp(ELEV_STOPS), {
      minimumHeight: 200, maximumHeight: 1400,
    });
  }
  return undefined;
}

// ─── 태양·그림자 시뮬레이션 ───
export class SunSim {
  constructor(viewer) {
    this.viewer = viewer;
    this.active = false;
    this.dateStr = '2026-09-02';
    this.hour = 12;
  }

  set(on) {
    const v = this.viewer;
    this.active = on;
    v.scene.globe.enableLighting = on;
    v.shadows = on;
    v.terrainShadows = on ? Cesium.ShadowMode.ENABLED : Cesium.ShadowMode.DISABLED;
    v.scene.light = on ? new Cesium.SunLight() : undefined;
    v.clock.shouldAnimate = false;
    if (on) this.apply();
    else {
      const base = v.imageryLayers.get(0);
      if (base) { base.brightness = 1.0; base.saturation = 1.0; }
    }
  }

  apply() {
    // KST 기준 시각 → UTC
    const h = Math.floor(this.hour), m = Math.round((this.hour - h) * 60);
    const iso = `${this.dateStr}T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00+09:00`;
    this.viewer.clock.currentTime = Cesium.JulianDate.fromDate(new Date(iso));
  }
}

// ─── 날씨 렌더링은 weatherFx.ts 로 옮겨갔다 ───
// 화면에 무늬를 얹는 2D 비/눈 포스트프로세스가 여기 있었다. 깊이를 몰라서
// 캐빈 유리 안에도 눈이 내렸고, 시차가 없어 모든 알갱이가 한 판으로 움직였다.
// 대체 구현(`weatherFx.ts`)은 depthTexture 로 가림과 고도를 함께 다룬다.
