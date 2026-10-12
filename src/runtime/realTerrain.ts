
// @ts-nocheck
/**
 * 실사 지형 모델 (Blender 제작) — assets/models/gp_terrain_real.glb
 *
 * ESRI z17 위성 + MapTiler DEM을 캐시→블렌더 파이프라인으로 가공한
 * GP 능선 2km×2km 고화질 지형: 4K 절차적 수관 알베도+노멀맵, 1024² DEM 메시,
 * EXT_mesh_gpu_instancing 침엽·활엽 숲(15만 그루)+하부식생(8만)+바위.
 *
 * 좌표 규약 (towerModel.js와 동일): Blender Z-up 제작 → glTF Y-up 내보내기 →
 * Cesium 재기립. Blender +X=동, +Y=북 그대로 통과.
 * 모델 원점 (0,0,0)은 영역 중심 경위도의 z=0 = DEM 최저 표고(zMinAbs).
 * 배치 시 중심 지형고를 샘플해 h0 = 샘플고 − (centerDemAbs − zMinAbs)로 정합.
 */
import { sampleTerrainDetailed } from './terrainSample';
import { trackEnvModel, activeEnvironmentState } from './environment';

/**
 * 격리(디오라마) 모드의 하늘 — 근본적인 공백이었다.
 *
 * `_applyDisplay()`는 diorama 모드에서 `globe.show=false`뿐 아니라
 * **`skyBox`도 `skyAtmosphere`도 함께 끈다**(주변 VWorld와 이어 붙이지 않는
 * 다이오라마 연출을 위해서). 그런데 그 둘이 Cesium이 하늘·별을 그리는 유일한
 * 경로다 — 꺼두고 남은 자리를 예전엔 고정 색 `#05070a` 하나로 때웠다. 그 결과
 * environmentModel.ts 가 정성껏 계산하는 `state.sky.horizon`(시간·구름이 반영된
 * 하늘색)과 `state.sky.starIntensity`(맑은 무월광 밤에 1) 는 **이 화면(=GP
 * 정밀지형, 이 데모의 대표 뷰)에서 만들어지기만 하고 아무 데도 안 쓰였다**.
 * 그래서 정오든 자정이든 폭설이든, 지형 뒤 배경은 언제나 똑같은 검정이었다 —
 * 지형·조명을 아무리 고쳐도 하늘이 안 바뀌면 "시간대별로 달라 보인다"는
 * 절반은 시작도 안 한 셈이다. 여기서 그 자리를 실제로 채운다: 배경색을
 * sky.horizon 으로 매번 다시 칠하고, PointPrimitiveCollection 으로 만든 별밭을
 * starIntensity 로 밝기 조절한다(진짜 카메라와 별 사이 깊이테스트가 걸리므로
 * 능선 뒤 별은 실제로 가려진다).
 */
const STAR_COUNT = 220;
const STAR_RADIUS_M = 40000;   // 디오라마 어디서 봐도 항상 배경이 되도록 충분히 멀리

class StarField {
  constructor(viewer) {
    this.viewer = viewer;
    this.collection = null;
    this.stars = [];   // { pp, brightness }
  }

  /** 최초 1회 — 지형 중심 기준 큰 반구 위에 별을 흩뿌린다. */
  build(lon, lat, heightAbs) {
    if (this.collection) return;
    this.collection = new Cesium.PointPrimitiveCollection();
    this.viewer.scene.primitives.add(this.collection);
    const origin = Cesium.Cartesian3.fromDegrees(lon, lat, heightAbs);
    const enu = Cesium.Transforms.eastNorthUpToFixedFrame(origin);
    for (let i = 0; i < STAR_COUNT; i++) {
      const az = Math.random() * Math.PI * 2;
      // 지평선 근처(대기 소광이 심한 구간)는 성기게, 천정 쪽에 몰아 자연스럽게.
      const elev = Cesium.Math.toRadians(6 + Math.random() * 82);
      const local = new Cesium.Cartesian3(
        Math.cos(elev) * Math.sin(az) * STAR_RADIUS_M,
        Math.cos(elev) * Math.cos(az) * STAR_RADIUS_M,
        Math.sin(elev) * STAR_RADIUS_M,
      );
      const position = Cesium.Matrix4.multiplyByPoint(enu, local, new Cesium.Cartesian3());
      const brightness = 0.25 + Math.random() * 0.75;
      const pp = this.collection.add({
        position, pixelSize: 1 + Math.random() * 1.8, color: Cesium.Color.WHITE.withAlpha(0),
      });
      this.stars.push({ pp, brightness });
    }
  }

  /** t=0~1(state.sky.starIntensity) — 맑은 무월광 밤일수록 밝고, 낮·구름·달빛엔 꺼진다. */
  setIntensity(t) {
    const clamped = Cesium.Math.clamp(t, 0, 1);
    for (const s of this.stars) s.pp.color = new Cesium.Color(1, 1, 0.97, clamped * s.brightness);
  }

  setVisible(v) { if (this.collection) this.collection.show = v; }
}

/**
 * 디오라마 하늘 그라디언트 — v29 는 배경을 `sky.top` 단색으로만 채웠다(스샷 확인:
 * 완전히 평평한 회색 한 장, 지평선도 천정도 구분이 없다). 실제 하늘은 지평선
 * 쪽이 밝고(대기 산란 경로가 길어 옅어짐) 천정이 짙다 — `environmentModel.ts`
 * 가 이미 그 둘을 `sky.horizon`/`sky.top`으로 따로 계산해 두고도(syncSky 주석
 * 참고) 배경엔 하나만 썼다. `scene.backgroundColor`는 단색만 가능해 그라디언트를
 * 못 내므로, FOG_FS(weatherFx.ts)와 같은 기법 — 깊이버퍼로 "하늘 화소"만 골라
 * (`czm_readDepth`), 그 화소의 실제 시선 방향을 복원해(`czm_windowToEyeCoordinates`
 * + `czm_inverseView`, FOG_FS 72~77행과 동일) 연직축(`czm_viewerPositionWC` 지심
 * 방향, FOG_FS 80행과 동일)과의 각도로 지평선↔천정을 섞는 화면 후처리로 낸다.
 * 별(StarField)은 실좌표에 찍힌 실제 프리미티브라 깊이값이 유한해 이 조건에
 * 안 걸리고 그 위에 정상적으로 남는다.
 */
const SKY_GRADIENT_FS = `
uniform sampler2D colorTexture;
uniform sampler2D depthTexture;
uniform vec3 uHorizonColor;
uniform vec3 uZenithColor;
in vec2 v_textureCoordinates;
void main(void) {
  vec4 scene = texture(colorTexture, v_textureCoordinates);
  float depth = czm_readDepth(depthTexture, v_textureCoordinates);
  if (depth < 1.0 - 0.000001) { out_FragColor = scene; return; }
  // 시선 방향은 깊이버퍼(하늘 화소=먼 평면, 로그 깊이에서 값이 안 정직하다)로
  // 복원하지 않는다 — 근평면 NDC 점을 역투영해 방향만 뽑는 표준 기법을 쓴다
  // (원근 나눗셈은 방향에 영향 없어 원평면/먼평면 어디를 잡아도 동일하다).
  vec2 ndc = v_textureCoordinates * 2.0 - 1.0;
  vec4 eyeNear = czm_inverseProjection * vec4(ndc, -1.0, 1.0);
  vec3 dirEC = normalize(eyeNear.xyz / eyeNear.w);
  vec3 dirWC = normalize((czm_inverseView * vec4(dirEC, 0.0)).xyz);
  vec3 up = normalize(czm_viewerPositionWC);
  float elev = clamp(dot(dirWC, up), -1.0, 1.0);
  float t = smoothstep(-0.05, 0.6, elev);
  out_FragColor = vec4(mix(uHorizonColor, uZenithColor, t), 1.0);
}`;

/**
 * 근접(도보 정찰) 지면 디테일 — albedo_v3/normal_v3(6144px가 5000m 타일 전체를 덮음 =
 * ~0.81m/텍셀)는 위성 오쏘텍스처라 항공뷰엔 충분해도, 도보 근접에선 텍셀 하나가 거의
 * 발 크기라 뭉개져 보인다(2026-09-07 사용자 리포트: "화질이 로우폴리 느낌"). glTF 굽기로
 * 해상도를 올리는 건 한계가 있다 — 5000m 타일 전체를 덮는 한 장짜리 텍스처는 몇 K로
 * 키워도 px/m이 크게 안 는다(실제로 시도해 검증: 2.4m 반복 패턴을 6144px 캔버스에
 * 구우면 반복 한 칸이 3px밖에 안 돼 리샘플에 뭉개져 사라짐). 그래서 굽지 않고 —
 * Cesium `CustomShader`로 지형 모델의 로컬좌표(=월드 오프셋, modelMatrix가 순수
 * ENU 변환이라)를 타일 주기로 나눠 실시간으로 별도 고해상 디테일 텍스처를 반복
 * 샘플링해 알베도에 곱한다. 텍스처 자체 해상도(2k)가 2.4m 한 칸을 통째로 표현하므로
 * 실질 px/m이 macro 텍스처보다 100배 이상 높다. 시접 앨리어싱 방지를 위해 wrap 전
 * 좌표의 화면공간 미분(dFdx/dFdy)을 먼저 구해 `textureGrad`로 밉을 정직하게 고른다
 * — fract() 이후 좌표로 미분하면 타일 경계에서 미분이 튀어 앨리어싱 줄무늬가 생긴다.
 */
const DETAIL_TILE_M = 1.8;
const DETAIL_SOIL_URL = 'assets/textures/pbr/brown_mud_leaves_01/color.jpg';
const DETAIL_LEAF_URL = 'assets/textures/pbr/forest_leaves_02/color.jpg';
const DETAIL_ROADMASK_URL = 'assets/textures/masks/gp_terrain_road_v3.png';

const GLB_URL = 'assets/models/gp_terrain_real.glb';
// 겨울 전용 텍스처 변형 — 같은 지오메시(15만 그루 인스턴싱)에 DEM 경사 기반 적설
// 텍스처만 다시 구운 것(data/blender_cache/make_winter.py + build_winter_glb.mjs).
// Blender 재빌드(재인스턴싱·재export) 없이 텍스처만 바꿔치기해 만들었다 — 완경사엔
// 눈이 쌓이고 급사면·능선은 흘러내려 비고, 도로는 덜 덮인다.
const GLB_URL_WINTER = 'assets/models/gp_terrain_real_winter.glb';
const META_URL = 'assets/models/gp_terrain_real.json';
const HGT_META_URL = 'assets/models/gp_terrain_height.json';

export class RealTerrainModel {
  constructor(viewer) {
    this.viewer = viewer;
    this.model = null;
    this.meta = null;
    this._loading = false;
    this.originHeight = null;   // GLB 모델 원점 절대표고 (h0+1.5) — 표면 재구성 기준
    this._hf = null;            // { n, data:Float32Array, bbox:[w,s,e,n] }
    this._hfLoading = null;
    this.contextRadiusM = null; // null=디오라마(격리), 값=주변 VWorld 포함 반경(m)
    this._winterLoaded = false; // 지금 붙어 있는 GLB 가 겨울 텍스처 변형인가
    this._seasonTimer = null;   // 계절 슬라이더 드래그 중 재로드 폭주 방지 디바운스
    this.renderGuard = null;    // main.ts가 생성 직후 주입 — 하늘 셰이더 실패 시 안전하게 걷어냄
    this._skyStage = null;
    this._detailShader = null;
    this._detailShaderFailed = false;
  }

  /**
   * 근접 지면 디테일 커스텀 셰이더(최초 1회, 실패해도 조용히 포기 — 원래대로 macro
   * 텍스처만 남는다). `model.customShader` 슬롯은 environment.ts의 공유 표면 셰이더
   * (`surfaceWeather:true`로 옵트인한 모델만 씀)와 겹치지 않는다 — 지형은 그 옵션을
   * 안 쓰고 `terrainTint`(model.color 블렌드, 별도 파이프라인)만 쓰므로 이 슬롯이
   * 비어 있다. `fsInput.attributes.positionMC`는 지형 GLB 로컬좌표가 곧 중심 기준
   * 월드 오프셋(m)이라(modelMatrix가 순수 ENU 변환, export_apply로 스케일 없음)
   * 별도 변환 없이 바로 타일 좌표로 쓸 수 있다.
   */
  _ensureDetailShader() {
    if (this._detailShader || this._detailShaderFailed) return this._detailShader;
    try {
      this._detailShader = new Cesium.CustomShader({
        mode: Cesium.CustomShaderMode.MODIFY_MATERIAL,
        lightingModel: Cesium.LightingModel.PBR,
        uniforms: {
          u_gpSoilTex: { type: Cesium.UniformType.SAMPLER_2D, value: new Cesium.TextureUniform({ url: DETAIL_SOIL_URL, repeat: true }) },
          u_gpLeafTex: { type: Cesium.UniformType.SAMPLER_2D, value: new Cesium.TextureUniform({ url: DETAIL_LEAF_URL, repeat: true }) },
          u_gpRoadMask: { type: Cesium.UniformType.SAMPLER_2D, value: new Cesium.TextureUniform({ url: DETAIL_ROADMASK_URL }) },
          u_gpHalfSize: { type: Cesium.UniformType.FLOAT, value: this.tileHalfM },
          u_gpInvTile: { type: Cesium.UniformType.FLOAT, value: 1.0 / DETAIL_TILE_M },
          u_gpStrength: { type: Cesium.UniformType.FLOAT, value: 0.45 },
        },
        fragmentShaderText: `
          void fragmentMain(FragmentInput fsInput, inout czm_modelMaterial material) {
            // 지형 UV(u=(x+half)/size, v=(y+half)/size)와 동일한 정규화 — road_v3.npy를
            // 그대로 내려 만든 마스크 PNG라 build_v5.py의 sample()과 같은 좌표계를 공유한다.
            vec2 macroUV = (fsInput.attributes.positionMC.xy + vec2(u_gpHalfSize)) / (2.0 * u_gpHalfSize);
            float bare = clamp(texture(u_gpRoadMask, clamp(macroUV, 0.0, 1.0)).r * 1.8, 0.0, 1.0);

            // 타일 좌표는 fract() 전에 미분을 떠 시접에서 밉이 안 튀게(textureGrad) 한다.
            vec2 p = fsInput.attributes.positionMC.xy * u_gpInvTile;
            vec2 dpdx = dFdx(p);
            vec2 dpdy = dFdy(p);
            vec2 tiled = fract(p);
            vec3 soil = textureGrad(u_gpSoilTex, tiled, dpdx, dpdy).rgb;
            vec3 leaf = textureGrad(u_gpLeafTex, tiled, dpdx, dpdy).rgb;
            vec3 detail = mix(leaf, soil, bare);
            float luma = dot(detail, vec3(0.299, 0.587, 0.114)) - 0.5;
            material.diffuse = clamp(material.diffuse * (1.0 + luma * u_gpStrength), 0.0, 1.0);
          }
        `,
      });
    } catch (error) {
      console.warn('근접 지면 디테일 셰이더 생성 실패 — macro 텍스처만 유지', error);
      this._detailShaderFailed = true;
      return null;
    }
    this.renderGuard?.register('근접 지면 디테일 셰이더', {}, () => {
      this._detailShaderFailed = true;
      this._detailShader = null;
      if (this.model) { try { this.model.customShader = undefined; } catch (_) { /* noop */ } }
    });
    return this._detailShader;
  }

  /** 디오라마 하늘 그라디언트 후처리 단계를 만든다(최초 1회) — 실패해도 조용히 포기. */
  _ensureSkyStage() {
    if (this._skyStage || this._skyStageFailed) return this._skyStage;
    try {
      this._skyStage = this.viewer.scene.postProcessStages.add(new Cesium.PostProcessStage({
        name: 'gp_sky_gradient',
        fragmentShader: SKY_GRADIENT_FS,
        uniforms: {
          uHorizonColor: new Cesium.Cartesian3(0.05, 0.07, 0.1),
          uZenithColor: new Cesium.Cartesian3(0.02, 0.03, 0.05),
        },
      }));
    } catch (error) {
      console.warn('디오라마 하늘 그라디언트 생성 실패 — 단색 배경으로 유지', error);
      this._skyStageFailed = true;
      return null;
    }
    this.renderGuard?.register('디오라마 하늘 그라디언트', this._skyStage, () => {
      this._skyStageFailed = true;
      this._skyStage = null;
    });
    return this._skyStage;
  }

  /** 겨울인가 — 계절 경계에서만 지오메트리 텍스처 세트를 바꾼다(봄·가을은 색조 블렌드로 충분). */
  static _wantsWinter(envState) {
    return envState?.season?.id === 'winter';
  }

  get active() { return !!this.model && this.model.show; }
  /** 표면 높이 재구성 준비 완료 (원점표고 + 하이트필드 로드됨) */
  get surfaceReady() { return Number.isFinite(this.originHeight) && !!this._hf; }

  /** GP 지형 하이트필드(1024² 로컬표고) 로드 — GLB 지형 표면을 카메라·수목 무관하게 재구성 */
  async _loadHeightField() {
    if (this._hf) return this._hf;
    if (this._hfLoading) return this._hfLoading;
    this._hfLoading = (async () => {
      const hm = await (await fetch(HGT_META_URL)).json();
      const buf = await (await fetch('assets/models/' + hm.bin)).arrayBuffer();
      const meta = this.meta ?? await (await fetch(META_URL)).json();
      this._hf = { n: hm.n, data: new Float32Array(buf), bbox: meta.bbox };
      return this._hf;
    })();
    return this._hfLoading;
  }

  /**
   * 렌더되는 GLB 지형 표면의 절대표고 (m) — (lon,lat).
   * GLB 메시는 dem_v3(변위 없음)로 만들어져 표면 = 모델원점Z + (demLocal). 하이트필드에서
   * 이중선형 보간해 반환한다. 준비 안 됐거나 영역 밖이면 null.
   */
  surfaceHeightAt(lon, lat) {
    if (!this.surfaceReady) return null;
    const { n, data, bbox } = this._hf;                 // bbox = [W, S, E, N]
    const fx = (lon - bbox[0]) / (bbox[2] - bbox[0]) * (n - 1);        // 열: 서→동
    const fy = (bbox[3] - lat) / (bbox[3] - bbox[1]) * (n - 1);        // 행: 북(0)→남
    if (!(fx >= 0 && fx <= n - 1 && fy >= 0 && fy <= n - 1)) return null;
    const ix = Math.min(n - 2, Math.floor(fx)), iy = Math.min(n - 2, Math.floor(fy));
    const tx = fx - ix, ty = fy - iy;
    const z00 = data[iy * n + ix], z10 = data[iy * n + ix + 1];
    const z01 = data[(iy + 1) * n + ix], z11 = data[(iy + 1) * n + ix + 1];
    const local = (z00 * (1 - tx) + z10 * tx) * (1 - ty) + (z01 * (1 - tx) + z11 * tx) * ty;
    return this.originHeight + local;
  }

  /** GLB 한 장을 지정 위치에 올리고 조명 트래킹까지 건다 — show()/_reloadForSeason() 공용. */
  async _loadGlbAt(url, modelMatrix) {
    const model = await Cesium.Model.fromGltfAsync({ url, modelMatrix, scale: 1.0 });
    // 데모 씬 블룸(brightness −0.42)+HDR이 PBR을 검게 누름 → 타워/시설 모델과 동일 부스트.
    // 이 값은 즉시 대입해 두는 안전한 기본값이고, 실제 밝기·색조는 아래 트래킹 등록으로
    // 환경(시간·계절·날씨)이 매 프레임 다시 계산해 준다 — 밤엔 어두워지고 겨울엔 하얘진다.
    model.lightColor = new Cesium.Cartesian3(0.95, 0.97, 0.92);
    if (model.imageBasedLighting) {
      model.imageBasedLighting.imageBasedLightingFactor = new Cesium.Cartesian2(1.15, 1.15);
    }
    trackEnvModel(model, { baseColor: [0.95, 0.97, 0.92], baseIBL: [1.15, 1.15], terrainTint: true });
    const detailShader = this._ensureDetailShader();
    if (detailShader) { try { model.customShader = detailShader; } catch (_) { /* 디테일 없이 진행 */ } }
    this.viewer.scene.primitives.add(model);
    return model;
  }

  async show() {
    if (this.model) { this.model.show = true; return; }
    if (this._loading) return;
    this._loading = true;
    try {
      const meta = this.meta ?? await (await fetch(META_URL)).json();
      this.meta = meta;
      const { lon, lat } = meta.center;

      // 앱 지형고 샘플로 수직 정합
      let h0 = meta.zMinAbs;
      try {
        const [p] = await sampleTerrainDetailed(
          this.viewer.terrainProvider,
          [Cesium.Cartographic.fromDegrees(lon, lat)]);
        if (Number.isFinite(p?.height)) h0 = p.height - meta.deltaCenter;
      } catch (_) { /* 지형 미로드 시 절대표고 사용 */ }

      // 저해상 베이스 지형과의 Z-fighting 방지 + 캐노피가 베이스를 확실히 덮도록 살짝 들어올림
      this.originHeight = h0 + 1.5;                       // 시설 접지·경사 판정 기준
      await this._loadHeightField().catch((e) => console.warn('heightfield load fail', e));
      const origin = Cesium.Cartesian3.fromDegrees(lon, lat, h0 + 1.5);
      this._modelMatrix = Cesium.Transforms.eastNorthUpToFixedFrame(origin);
      this._winterLoaded = RealTerrainModel._wantsWinter(activeEnvironmentState());
      const model = await this._loadGlbAt(this._winterLoaded ? GLB_URL_WINTER : GLB_URL, this._modelMatrix);
      this.model = model;
    } finally {
      this._loading = false;
    }
  }

  /**
   * 계절이 겨울 경계를 넘나들면 지오메트리 텍스처 세트를 통째로 바꿔 낀다 — model.color
   * MIX 블렌드(environment.ts _terrainTint)는 색조만 돌릴 뿐 실제 적설 텍스처(경사별
   * 눈 쌓임·능선 노출)를 만들어내지 못하기 때문이다. main.ts 의 env onChange 에서 매번
   * 불러 주면 되고, 디바운스가 계절 슬라이더를 드래그하는 동안의 재로드 폭주를 막는다.
   */
  syncSeason(envState) {
    if (!this.model || !this._modelMatrix) return;   // 아직 GP 모드 진입 전 — show() 가 알아서 고른다
    const wantWinter = RealTerrainModel._wantsWinter(envState);
    if (wantWinter === this._winterLoaded) return;
    clearTimeout(this._seasonTimer);
    this._seasonTimer = setTimeout(() => this._reloadForSeason(wantWinter), 250);
  }

  async _reloadForSeason(wantWinter) {
    if (this._loading || wantWinter === this._winterLoaded) return;
    this._loading = true;
    const old = this.model;
    const wasShown = old?.show ?? true;
    try {
      const fresh = await this._loadGlbAt(wantWinter ? GLB_URL_WINTER : GLB_URL, this._modelMatrix);
      fresh.show = wasShown;
      this.model = fresh;
      this._winterLoaded = wantWinter;
      if (old) this.viewer.scene.primitives.remove(old);
    } catch (e) {
      console.warn('겨울 지형 텍스처 교체 실패 — 기존 유지', e);
    } finally {
      this._loading = false;
    }
  }

  get tileHalfM() { return (this.meta?.sizeMeters || 5000) / 2; }

  /**
   * 크롭 지형이 화면을 채우도록 남측 상공에서 조망. radiusM 을 주면 그 반경이 화면에
   * 들어오도록 카메라를 뒤로 뺀다 (주변 VWorld 지형까지 함께 보고 싶을 때 크게).
   */
  focusCamera(duration = 1.6, radiusM = null) {
    if (!this.meta) return;
    const { lon, lat } = this.meta.center;
    const half = radiusM ?? this.tileHalfM;                // 조망 반경(m)
    const back = half / 111320 * 0.62;                     // 남쪽 후퇴(도)
    this.viewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(lon, lat - back, (this.meta.centerDemAbs || 1040) + half * 0.95),
      orientation: { heading: 0, pitch: Cesium.Math.toRadians(-30), roll: 0 },
      duration,
    });
  }

  hide() { if (this.model) this.model.show = false; }

  /**
   * 표출 방식 적용 — contextRadiusM 에 따라 두 가지.
   *  · null(디오라마): VISTA식으로 지구본을 끄고 검은 공간에 크롭 타일만 띄운다.
   *  · 값(주변 포함): 지구본(VWorld 위성/지형)을 켜둔 채 고정밀 GLB 타일을 그 위에 얹어
   *    중심은 상세, 주변 수십 km 는 VWorld 로 이어지게 한다.
   */
  _applyDisplay() {
    const sc = this.viewer.scene;
    if (this._baseline === undefined) {
      this._baseline = {
        globe: sc.globe.show,
        skyBox: sc.skyBox ? sc.skyBox.show : true,
        skyAtm: sc.skyAtmosphere ? sc.skyAtmosphere.show : true,
        bg: sc.backgroundColor,
        fog: sc.fog ? sc.fog.enabled : false,
        dSSE: sc.globe.dynamicScreenSpaceError ?? true,
      };
    }
    const diorama = this.contextRadiusM == null;
    sc.globe.show = !diorama;
    if (sc.skyBox) sc.skyBox.show = diorama ? false : this._baseline.skyBox;
    if (sc.skyAtmosphere) sc.skyAtmosphere.show = diorama ? false : this._baseline.skyAtm;
    if (sc.fog) sc.fog.enabled = diorama ? false : this._baseline.fog;
    if (diorama) {
      // skyBox·skyAtmosphere 를 껐으니 하늘·별이 통째로 빈다 — 우리 환경 모델이
      // 계산해 둔 값으로 그 자리를 채운다(별 배치는 1회, 밝기는 계속 갱신).
      if (!this._starField) this._starField = new StarField(this.viewer);
      this._starField.build(this.meta.center.lon, this.meta.center.lat, this.meta.centerDemAbs ?? 1000);
      this._starField.setVisible(true);
      const skyStage = this._ensureSkyStage();
      if (skyStage) skyStage.enabled = true;
      this.syncSky();
    } else {
      this._starField?.setVisible(false);
      if (this._skyStage) this._skyStage.enabled = false;
      sc.backgroundColor = this._baseline.bg;
    }
    // 주변 포함(넓은 조망)에서는 먼 VWorld 타일을 거리비례로 성글게 로드해 렉을 줄인다.
    sc.globe.dynamicScreenSpaceError = diorama ? this._baseline.dSSE : true;
    if (!diorama) {
      sc.globe.dynamicScreenSpaceErrorDensity = 0.0025;
      sc.globe.dynamicScreenSpaceErrorFactor = 4.0;
    }
  }

  _restoreDisplay() {
    const sc = this.viewer.scene;
    if (!this._baseline) return;
    sc.globe.show = this._baseline.globe;
    if (sc.skyBox) sc.skyBox.show = this._baseline.skyBox;
    if (sc.skyAtmosphere) sc.skyAtmosphere.show = this._baseline.skyAtm;
    if (sc.fog) sc.fog.enabled = this._baseline.fog;
    sc.backgroundColor = this._baseline.bg;
    sc.globe.dynamicScreenSpaceError = this._baseline.dSSE;
    this._starField?.setVisible(false);
    if (this._skyStage) this._skyStage.enabled = false;
  }

  /**
   * 디오라마 배경색·별밭을 지금 환경 상태로 다시 칠한다 — 계절(syncSeason)과
   * 같은 자리(main.ts env onChange)에서 매번 불러 준다. GP 모드+디오라마가
   * 아니면(주변 VWorld 포함 모드거나 GP 자체가 꺼져 있으면) 손대지 않는다 —
   * 그때는 진짜 skyAtmosphere 가 하늘을 그린다.
   *
   * **함정(2026-09-07 발견)**: 처음엔 `sky.horizon`을 그대로 썼다. 그런데 비·눈
   * 안개(weatherFx FOG_FS)의 색도 정확히 같은 `sky.horizon`(기상 무강수 시엔
   * `fogColor === sky.horizon` 그대로다 — environmentModel.ts 참고)이라, 강수가
   * 짙어질수록 지형·타워가 안개에 먹혀 **배경과 완전히 같은 색으로 수렴**했다.
   * 화면 전체가 단색으로 보인 이유가 이것 — 안개가 심한 게 아니라 안개색과
   * 배경색이 애초에 같았다. `sky.top`(더 짙고 채도 높은 천정색)을 대신 써서
   * 배경과 안개색을 서로 다른 값으로 갈라 둔다 — 강수가 짙어도 "먼 배경"과
   * "안개 낀 전경"이 최소한의 톤 차이를 유지한다.
   */
  syncSky(envState) {
    if (this.mode !== 'gp' || this.contextRadiusM != null) return;
    const s = envState ?? activeEnvironmentState();
    const sc = this.viewer.scene;
    if (!s) {
      sc.backgroundColor = Cesium.Color.fromCssColorString('#05070a');
      this._skyHorizon = null; this._skyZenith = null;
      return;
    }
    const [r, g, b] = s.sky.top;
    // 후처리 하늘 그라디언트가 정상 동작하면 실제로 화면에 남는 건 지평선 쪽
    // 색뿐이지만(천정은 위쪽 화면 밖으로 벗어나기 일쑤), backgroundColor 는
    // 셰이더가 실패해 renderGuard 가 걷어냈을 때의 안전한 단색 폴백으로 유지한다.
    sc.backgroundColor = new Cesium.Color(r, g, b, 1);
    this._skyHorizon = s.sky.horizon;
    this._skyZenith = s.sky.top;
    // PostProcessStage 는 이 코드베이스의 다른 모든 셰이더(FOG_FS 의 uFogColor,
    // FLASH_FS 의 uFlash)와 같은 규약으로 직접 대입해야 매 프레임 반영된다 —
    // 생성 시점 uniforms 에 함수를 넣는 방식은 이 앱에서 검증되지 않았다.
    if (this._skyStage) {
      const [hr, hg, hb] = this._skyHorizon;
      const [zr, zg, zb] = this._skyZenith;
      this._skyStage.uniforms.uHorizonColor = new Cesium.Cartesian3(hr, hg, hb);
      this._skyStage.uniforms.uZenithColor = new Cesium.Cartesian3(zr, zg, zb);
    }
    this._starField?.setIntensity(s.sky.starIntensity);
  }

  /**
   * 표출 범위 설정 — km 반경. tile 반경 이하면 디오라마(격리), 크면 주변 VWorld 포함.
   * GP 모드일 때만 즉시 반영하고 카메라를 그 범위에 맞춰 다시 잡는다.
   */
  setContextRadiusKm(km) {
    const tileHalfKm = this.tileHalfM / 1000;
    this.contextRadiusM = (km == null || km <= tileHalfKm + 0.01) ? null : km * 1000;
    if (this.mode !== 'gp') return;
    this._applyDisplay();
    this.focusCamera(1.0, this.contextRadiusM ?? this.tileHalfM);
  }

  contextRadiusKm() {
    return this.contextRadiusM == null ? Math.round(this.tileHalfM / 1000 * 10) / 10 : this.contextRadiusM / 1000;
  }

  /** 모드 전환: 'nation' 전역 지형 | 'gp' GP 크롭 타일 표출 (디오라마/주변포함) */
  async setMode(mode) {
    if (mode === 'gp') {
      await this.show();
      this._applyDisplay();
      this.focusCamera(1.6, this.contextRadiusM ?? this.tileHalfM);
    } else {
      this.hide();
      this._restoreDisplay();
    }
    this.mode = mode;
  }

  async toggle(on) { await this.setMode(on ? 'gp' : 'nation'); }

  destroy() {
    if (this.model) {
      this.viewer.scene.primitives.remove(this.model);
      this.model = null;
    }
    if (this._starField?.collection) this.viewer.scene.primitives.remove(this._starField.collection);
  }
}

