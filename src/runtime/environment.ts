// @ts-nocheck
/**
 * 환경 적용기 + 조종 패널 — 디지털트윈 메인화면(ufs 레포)의 「환경 · 시간 · 계절 ·
 * 날씨」 를 GP Digital Twin에 그대로 옮긴 것.
 *
 * 원본은 three.js 씬이고 이쪽은 Cesium 이라 **그리는 코드**는 같을 수 없다.
 * 같아야 하는 것 — 그리고 실제로 같은 것 — 은 **무엇을 그릴지 정하는 쪽**이다:
 * `environmentModel.js` (원본 `app/environment-model.ts` 의 1:1 포팅) 한 번 호출로
 * 나온 상태를 씬이 받아 바르고, 패널이 그 같은 상태를 읽어 표시한다. 여기서
 * 자체 계산하는 수치는 하나도 없다 — 표면에 박아넣은 일출시각은 계절 슬라이더를
 * 움직여도 따라오지 않는 일출시각이다.
 *
 * Cesium 매핑:
 *   시각·계절 → viewer.clock (태양 원반·대기산란·별·그림자가 전부 시계를 읽는다)
 *   조도·구름 → scene.light(DirectionalLight) · 영상 레이어 밝기/채도/감마
 *   가시거리 → scene.fog.density = Koschmieder β (Cesium 안개농도 척도와 동일 차수)
 *   계절     → 위성영상 색조를 수관 램프(foliageTint) 쪽으로 회전 + 착엽률로 채도
 *   적설·강수 → 영상 밝기/탈채도 + 비·눈 포스트프로세스 (terrainfx Weather)
 */
import {
  environmentState, DEFAULT_ENVIRONMENT, WEATHER_ORDER, WEATHER_LABELS,
  formatClock, formatSeasonDate, formatLux, formatDistance, monthDayOf,
  rgbToCss, clamp01,
} from './environmentModel';
import { clamp, lerp } from './mathUtils';

export {
  WEATHER_ORDER, WEATHER_LABELS, formatClock, formatSeasonDate, formatLux, formatDistance,
};

// ── 환경 조명 레지스트리 (전역 단일 창구) ──────────────────────────────────
// 앱에는 EnvironmentController 가 한 대뿐이고(main.ts state.env), GLB 모델은
// 그보다 한참 뒤에 — 시설을 배치하거나 센서를 거치하거나 GP 모드를 켤 때 —
// 지연 로드된다. 그때마다 env 참조를 생성자로 실어 나르는 대신, 모델을 만드는
// 자리에서 이 함수 하나만 부르면 된다.
//
// 함정: main.ts 의 SiteEntities(감시탑)는 생성자에서 `tower.build().then(...)`
// 로 GLB 를 fire-and-forget 으로 띄운다. 로컬 서버에서 그 GLB는 작아서 fetch 가
// 몇 ms 만에 끝나기도 하는데, 그 사이 다른 await 로 이벤트루프가 한 번이라도
// 양보되면 state.env(훨씬 뒤 줄에서 생성)가 아직 없는 채로 trackEnvModel 이
// 불릴 수 있다 — 그러면 조용히 무시되어 그 감시탑은 영원히 시간·계절·날씨와
// 무관하게 남는다(실측: 기본 감시탑 하나가 딱 이렇게 등록을 놓쳤다). 그래서
// env 가 없을 때는 버리지 않고 큐에 쌓아 뒀다가, env 가 생기는 순간 흘려보낸다.
let _activeEnv = null;
let _pendingTracks = [];   // env 생성 전에 들어온 trackEnvModel 호출 — [model, opts][]
export function setActiveEnvironment(env) {
  _activeEnv = env;
  if (_pendingTracks.length) {
    const queued = _pendingTracks;
    _pendingTracks = [];
    for (const [model, opts] of queued) env.trackModel(model, opts);
  }
}
/** GLB 모델을 환경 조명 아래 등록한다. env 가 아직 없으면 큐에 쌓아 두고,
 *  env 가 생기는 즉시(setActiveEnvironment) 등록한다 — 그 전까지는 모델이
 *  이미 대입해 둔 정적 lightColor 로 남는다(안전한 폴백). */
export function trackEnvModel(model, opts) {
  if (_activeEnv) return _activeEnv.trackModel(model, opts);
  _pendingTracks.push([model, opts]);
  return undefined;
}
/** 지금 환경 상태 조회 (계절 등 텍스처 단위 전환이 필요한 곳에서 쓴다). env 없으면 null. */
export function activeEnvironmentState() { return _activeEnv?.state ?? null; }

/** RGB(0~1) → 색상환 위치(0~1). 계절 색조 회전량 계산용. */
function hueTurns(rgb) {
  const [r, g, b] = rgb;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const d = max - min;
  if (d < 1e-6) return 0;
  let h;
  if (max === r) h = ((g - b) / d) % 6;
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  return (((h / 6) % 1) + 1) % 1;
}

/** 한여름 수관 기준색 — 계절 색조 회전은 이 색으로부터의 편차다. */
const SUMMER_FOLIAGE_RGB = [0x3f / 255, 0x7a / 255, 0x33 / 255];
const SUMMER_FOLIAGE_HUE = hueTurns(SUMMER_FOLIAGE_RGB);

/** rgb 의 색조는 유지한 채 광도(luma)만 target 으로 맞춘다 — 어두운 색조를 그대로
 *  밝기 배수로도 써버리면 색이 어두운 만큼 또 어두워지는 이중 감쇠가 생긴다. */
function normalizeLuma(rgb, target) {
  const luma = rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
  if (luma < 1e-4) return [target, target, target];
  const k = target / luma;
  return [clamp(rgb[0] * k, 0, 1), clamp(rgb[1] * k, 0, 1), clamp(rgb[2] * k, 0, 1)];
}

/** 조도(lux) → 0~1 「낮인 정도」. 박명을 가로지르려면 로그 축이라야 한다. */
function daynessOf(lux) {
  const lo = Math.log10(0.5), hi = Math.log10(60000);
  return clamp01((Math.log10(Math.max(lux, 1e-4)) - lo) / (hi - lo));
}

// ═══════════════════════════════════════════════════════════════════════════
// 적용기
// ═══════════════════════════════════════════════════════════════════════════

export class EnvironmentController {
  /**
   * @param viewer  Cesium.Viewer
   * @param opts {
   *   site: { latitude, longitude, utcOffsetHours },
   *   weather: terrainfx Weather 인스턴스 (비·눈 포스트프로세스),
   *   year: 예행 기준 연도,
   *   onChange: (state) => void   // 패널 재렌더 훅
   * }
   */
  constructor(viewer, opts = {}) {
    this.viewer = viewer;
    this.site = opts.site;
    this.weatherFx = opts.weather ?? null;
    this.audio = opts.audio ?? null;   // environmentAudio.ts — 바람·비 배경음의 단일 권한
    this.year = opts.year ?? 2026;
    this.onChange = opts.onChange ?? null;
    this.settings = { ...DEFAULT_ENVIRONMENT };
    this.timeScale = 0;          // 0 정지 · 60 ×60 · 300 ×300
    this.state = null;
    this._tick = null;
    this._lastT = 0;
    this._enabled = false;
    // 배속 재생은 매 프레임 apply() 를 부른다 — 씬 객체는 새로 만들지 않고 갈아
    // 끼우고, 패널 재렌더는 사람이 읽을 수 있는 속도로만 한다.
    this._light = null;
    this._shadows = null;
    this._lastNotify = 0;
    // 부속 뷰어(센서 피드 PIP 등) — 같은 환경 상태를 같은 권한으로 받는다.
    // 창마다 조명 인스턴스가 따로 필요하므로 슬롯을 나눠 준다.
    this._extra = new Map();     // viewer → { _light, _shadows }
    // 지형·건물·타워·센서 GLB — 예전엔 각자 lightColor 를 상수로 박아 시간·날씨와
    // 무관하게 항상 같은 밝기로 보였다. 이제 이 레지스트리에 등록해 두면 apply()
    // 마다 실제 태양·반구광 세기·색이 실린다. setActiveEnvironment 로 전역에서
    // 이 인스턴스를 찾아 등록할 수 있다 (모델은 앱 초기화 훨씬 뒤에, 지연 로드로
    // 생기므로 생성자 시점 주입이 아니라 이 편이 훨씬 덜 침습적이다).
    this._models = new Set();    // { model, baseColor:[r,g,b], baseIBL:[x,y], terrainTint, surfaceWeather }
    // GLSL 커스텀 셰이더는 컴파일 실패가 add() 가 아니라 첫 렌더에서 나서 렌더
    // 루프 전체를 세운다(FOG_FS 와 같은 사정) — renderGuard 에 등록해 두면 걷어낸다.
    this.guard = opts.renderGuard ?? null;
    this._surfaceShader = null;
    this._surfaceShaderFailed = false;
    setActiveEnvironment(this);
  }

  /**
   * 부속 뷰어를 환경 권한 아래로 넣는다. 피드 창이 본 화면과 다른 하늘·안개를
   * 쓰면 「눈이 오면 안 보인다」를 정작 그 창에서 확인할 수 없다.
   */
  attachViewer(viewer) {
    if (!viewer || this._extra.has(viewer)) return;
    const slot = { _light: null, _shadows: null };
    this._extra.set(viewer, slot);
    if (this.state) {
      try { this._paintViewer(this.state, viewer, slot); } catch (e) { console.warn('env attach', e); }
    }
  }

  detachViewer(viewer) {
    this._extra.delete(viewer);
  }

  /** 최초 1회 — 씬을 환경 모델 권한 아래로 넘긴다. */
  start() {
    if (this._enabled) return;
    this._enabled = true;
    const scene = this.viewer.scene;
    scene.globe.enableLighting = true;
    this.viewer.clock.shouldAnimate = false;
    this.apply();
  }

  set(patch) {
    Object.assign(this.settings, patch);
    this.apply();
  }

  setTimeScale(scale) {
    this.timeScale = scale;
    if (scale > 0) this._startClock();
    else this._stopClock();
    this.onChange?.(this.state);
  }

  _startClock() {
    if (this._tick) return;
    this._lastT = performance.now();
    this._tick = this.viewer.scene.preRender.addEventListener(() => {
      if (this.timeScale <= 0) return;
      const now = performance.now();
      const dtSec = (now - this._lastT) / 1000;
      this._lastT = now;
      const advanced = this.settings.minuteOfDay + (dtSec * this.timeScale) / 60;
      // 자정을 넘으면 하루를 넘긴다 — 시간 배속이 계절도 함께 민다.
      if (advanced >= 1440) this.settings.dayOfYear = (this.settings.dayOfYear % 365) + 1;
      this.settings.minuteOfDay = advanced % 1440;
      // 씬은 매 프레임, 패널 텍스트는 4Hz — 임무영향 4줄을 60Hz 로 다시 그리면
      // 읽을 수 없는 데다 프레임만 먹는다.
      const notify = now - this._lastNotify > 250;
      if (notify) this._lastNotify = now;
      this.apply({ notify });
    });
  }

  _stopClock() {
    if (this._tick) { this._tick(); this._tick = null; }
  }

  /** 설정 → 상태 → 씬. 다른 곳에서 씬 조명을 건드리면 이 호출이 되돌린다. */
  apply({ notify = true } = {}) {
    this.state = environmentState(this.settings, this.site);
    if (this._enabled) this._paint(this.state);
    if (notify) this.onChange?.(this.state);
    return this.state;
  }

  // ── 씬에 바르기 ───────────────────────────────────────────────────────────

  _paint(s) {
    this._paintClock(s);
    this._paintViewer(s, this.viewer, this);
    for (const [viewer, slot] of [...this._extra]) {
      try { this._paintViewer(s, viewer, slot); } catch (_) { this._extra.delete(viewer); }
    }
    this._paintWeatherFx(s);
    this._paintModels(s);
    this._paintSurfaceShader(s);
    this.audio?.apply(s);
  }

  // ── GLB 모델 조명 레지스트리 ─────────────────────────────────────────────

  /**
   * GLB 모델을 등록한다. baseColor/baseIBL 은 예전에 상수로 박혀 있던 보정값
   * (격리 다이오라마의 빈약한 기본 IBL을 벌충하는 부스트) — 그 위에 지금 이
   * 순간의 태양·반구광이 곱해진다. terrainTint=true 인 모델(지형)만 계절
   * 수관색·적설을 model.color 로 추가로 받는다.
   * 해제 함수를 반환한다 — 모델이 사라질 때 부르면 좋지만, 등록 쪽에서
   * isDestroyed() 로도 자동 정리되므로 필수는 아니다.
   */
  trackModel(model, {
    baseColor = [1, 1, 1], baseIBL = [1, 1], terrainTint = false, surfaceWeather = false,
  } = {}) {
    if (!model) return () => {};
    const entry = { model, baseColor, baseIBL, terrainTint, surfaceWeather };
    this._models.add(entry);
    if (surfaceWeather) {
      const shader = this._getSurfaceShader();
      if (shader) { try { model.customShader = shader; } catch (_) { /* 다음 프레임 재시도 */ } }
    }
    if (this.state) { try { this._paintOneModel(this.state, entry); } catch (_) { /* 다음 apply 재시도 */ } }
    return () => this._models.delete(entry);
  }

  /**
   * 건물·타워·센서 표면에 적설·젖음을 입히는 공유 커스텀 셰이더 — 모델마다
   * 새로 만들지 않고 하나를 여러 모델이 같이 쓰며, uniform 만 `_paintSurfaceShader`
   * 가 매 프레임 갱신한다(Cesium `CustomShader.setUniform`).
   *
   * 위로 향한 면일수록 눈이 쌓인다 — 블렌더·언리얼·유니티에서 두루 쓰는
   * 「법선·업벡터 내적 기반 적설」기법 그대로다(지오메트리 눈은 다시 만들지
   * 않고, 위를 보는 지붕·난간·처마만 실시간으로 하얗게 밀어 올린다). 다만
   * 그 경계를 순수 smoothstep 하나로만 그으면 페인트로 칠한 것처럼 매끈해
   * 보인다 — 실제 적설은 뭉치고 얼룩진다. 그래서 로컬 좌표 해시로 3옥타브
   * 얼룩 노이즈를 만들어 경계를 흩뜨리고, 막 덮이기 시작하는 가장자리는
   * 살짝 밝게(빛이 걸리는 눈 능선) 얹는다.
   *
   * 비에 젖으면 단순히 어두워지기만 하는 게 아니라 — 실제 젖은 표면과 마른
   * 표면의 차이는 대부분 반사 하이라이트다. `czm_lightDirectionEC`(이 앱의
   * 커스텀 태양/달 DirectionalLight 방향, eye space)로 Blinn-Phong 하이라이트를
   * 얹고, 시야각이 표면에 스칠수록(Fresnel) 더 강하게 낸다 — 젖은 콘크리트를
   * 비스듬히 볼 때 번들거리는 그 각도 의존성이다.
   */
  _getSurfaceShader() {
    if (this._surfaceShader) return this._surfaceShader;
    if (this._surfaceShaderFailed) return null;
    try {
      this._surfaceShader = new Cesium.CustomShader({
        mode: Cesium.CustomShaderMode.MODIFY_MATERIAL,
        lightingModel: Cesium.LightingModel.PBR,
        uniforms: {
          u_snowCover: { type: Cesium.UniformType.FLOAT, value: 0 },
          u_wetness: { type: Cesium.UniformType.FLOAT, value: 0 },
          u_snowColor: { type: Cesium.UniformType.VEC3, value: new Cesium.Cartesian3(0.92, 0.95, 1.0) },
        },
        fragmentShaderText: `
          float gp_hash(vec3 p) {
            p = fract(p * 0.3183099 + vec3(0.1, 0.2, 0.3));
            p *= 17.0;
            return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
          }

          void fragmentMain(FragmentInput fsInput, inout czm_modelMaterial material) {
            // ECEF 좌표계에서는 그 지점 위치벡터 자체가 국소 연직(상방)이다 —
            // 이 앱 활동반경(수 km)에서는 이 근사가 FOG_FS 의 up 근사와 동급이다.
            vec3 up = normalize(fsInput.attributes.positionWC);
            vec3 nWC = normalize(czm_inverseViewRotation * fsInput.attributes.normalEC);
            float facingUp = clamp(dot(nWC, up), 0.0, 1.0);

            // 3옥타브 얼룩 노이즈 — 모델 로컬 좌표라 같은 건물은 언제나 같은
            // 얼룩을 갖는다(프레임마다 지글거리지 않는다).
            vec3 pMC = fsInput.attributes.positionMC * 0.35;
            float blotch = gp_hash(floor(pMC)) * 0.5
              + gp_hash(floor(pMC * 2.3) + 11.0) * 0.3
              + gp_hash(floor(pMC * 5.1) + 47.0) * 0.2;
            float snowMask = smoothstep(0.22, 0.78, facingUp + (blotch - 0.5) * 0.7);
            float snow = snowMask * u_snowCover;

            // 눈이 막 덮이기 시작하는 가장자리 — 두께가 얇아 빛을 살짝 더 튕긴다.
            float edge = smoothstep(0.0, 0.2, snow) * (1.0 - smoothstep(0.2, 0.55, snow));
            material.diffuse = mix(material.diffuse, u_snowColor + vec3(edge * 0.10), snow);

            // 눈 덮인 면은 젖음 표현에서 제외한다 — 이미 얼어 있다.
            float wet = u_wetness * (1.0 - snow);
            material.diffuse *= mix(1.0, 0.72, wet);

            // 젖은 표면 반사 하이라이트 — Blinn-Phong + Fresnel. material.specular
            // 필드는 문서에 명시가 없어 확실한 material.diffuse 가산으로 낸다.
            vec3 viewDirEC = normalize(-fsInput.attributes.positionEC);
            vec3 nEC = normalize(fsInput.attributes.normalEC);
            vec3 halfDirEC = normalize(viewDirEC + czm_lightDirectionEC);
            float ndh = clamp(dot(nEC, halfDirEC), 0.0, 1.0);
            float fresnel = pow(1.0 - clamp(dot(nEC, viewDirEC), 0.0, 1.0), 4.0);
            float wetSpec = pow(ndh, 42.0) * (0.35 + 0.65 * fresnel) * wet;
            material.diffuse += vec3(wetSpec) * 0.6;
          }
        `,
      });
    } catch (error) {
      console.warn('환경 표면 셰이더 생성 실패 — 적설·젖음 표현 없음', error);
      this._surfaceShaderFailed = true;
      return null;
    }
    this.guard?.register('환경 표면 셰이더', {}, () => {
      this._surfaceShaderFailed = true;
      this._surfaceShader = null;
      for (const entry of this._models) {
        if (entry.surfaceWeather && !entry.model.isDestroyed?.()) {
          try { entry.model.customShader = undefined; } catch (_) { /* noop */ }
        }
      }
    });
    return this._surfaceShader;
  }

  /**
   * 공유 셰이더의 uniform 을 지금 환경 상태로 갱신 — 셰이더 자체는 다시 만들지 않는다.
   * 젖음은 `s.ground.wetness`(순간값) 대신 weatherFx 가 실시간(wall-clock)으로
   * 서서히 뒤쫓는 `wetnessAccum`을 쓴다 — 날씨를 비로 바꾸는 순간 건물이 즉시
   * 흠뻑 젖어 보이면 시뮬레이션 조작감이 든다. 실제 웅덩이·표면장력처럼 서서히
   * 고이고 훨씬 느리게 마르는 지연(hysteresis)을 흉내 낸다.
   */
  _paintSurfaceShader(s) {
    if (!this._surfaceShader) return;
    try {
      this._surfaceShader.setUniform('u_snowCover', s.ground.snowCover);
      this._surfaceShader.setUniform('u_wetness', this.weatherFx?.wetnessAccum ?? s.ground.wetness);
    } catch (_) { /* 다음 프레임 재시도 */ }
  }

  untrackModel(model) {
    for (const entry of this._models) if (entry.model === model) this._models.delete(entry);
  }

  _paintModels(s) {
    if (!this._models.size) return;
    const tint = this._lightingTint(s);
    for (const entry of [...this._models]) {
      if (entry.model.isDestroyed?.()) { this._models.delete(entry); continue; }
      try { this._paintOneModel(s, entry, tint); } catch (_) { /* 로드 중일 수 있다 — 다음 프레임 재시도 */ }
    }
  }

  /**
   * 청천 정오를 1.0 기준으로 정규화한 「지금 얼마나·무슨 색으로 빛나는가」.
   * 지금까지 계산만 되고 아무 데도 쓰이지 않던 hemisphereIntensity·exposure를
   * 여기서 처음 소비한다 — 반구 주변광은 IBL 세기로, 노출은 야간 증폭으로.
   *
   * 처음 버전은 여기서 색(night=skyColor, 그 자체가 이미 어두운 남색)과 밝기(bright,
   * 야간엔 0.12까지 떨어짐)를 곱해 합쳤다 — 어두운 색 × 낮은 밝기 = 거의 완전한 암전.
   * 감시 트윈은 야간에도 지형 형태가 읽혀야 하는 화면이라(달빛 아래 육안·야시 수준),
   * 색조는 야간에도 일정 광도로 정규화해 두고 전체 밝기(bright)만 따로 낮춘다.
   */
  _lightingTint(s) {
    const REF_SUN = 3.35;                 // environmentModel 의 청천 정오 sunIntensity
    const REF_HEMI = 1.75 * 1.24;         // 청천 정오 근사 hemisphereIntensity
    const sunDominance = clamp01(s.light.sunIntensity / REF_SUN);
    const night = normalizeLuma(s.light.skyColor, 0.55);   // 달빛 색조 — 어둡지 않게 광도만 고정
    const c = s.light.sunColor;
    const color = [
      lerp(night[0], c[0], sunDominance),
      lerp(night[1], c[1], sunDominance),
      lerp(night[2], c[2], sunDominance),
    ];
    const raw = 0.55 * (s.light.sunIntensity / REF_SUN) + 0.45 * (s.light.hemisphereIntensity / REF_HEMI);
    const exposureGain = s.light.exposure / 1.2;   // 1.2 = 모델의 청천 주간 기준 노출
    // 바닥을 0.34로 올린다 — 그 아래로는 다이오라마 배경(#05070a)과 구분이 안 가 지형이
    // 통째로 사라진 것처럼 보인다(실측: 0.12 바닥 + 어두운 색조 조합 시 지형 RGB 0.01대).
    const bright = clamp(raw * exposureGain, 0.34, 1.6);
    const ambient = clamp(s.light.hemisphereIntensity / REF_HEMI, 0.28, 1.4);
    return { color, bright, ambient };
  }

  _paintOneModel(s, entry, tint = this._lightingTint(s)) {
    const { model, baseColor, baseIBL, terrainTint } = entry;
    model.lightColor = new Cesium.Cartesian3(
      baseColor[0] * tint.color[0] * tint.bright,
      baseColor[1] * tint.color[1] * tint.bright,
      baseColor[2] * tint.color[2] * tint.bright,
    );
    if (model.imageBasedLighting) {
      model.imageBasedLighting.imageBasedLightingFactor = new Cesium.Cartesian2(
        baseIBL[0] * tint.ambient, baseIBL[1] * tint.ambient,
      );
    }
    if (terrainTint) {
      const g = this._terrainTint(s);
      model.color = new Cesium.Color(g.color[0], g.color[1], g.color[2], 1);
      model.colorBlendMode = Cesium.ColorBlendMode.MIX;
      model.colorBlendAmount = g.amount;
    }
  }

  /**
   * 지형 GLB 색조 — 구운 텍스처는 촬영 당시 계절(한여름) 그대로 고정이다.
   * 그래서 계절 슬라이더를 겨울로 돌려도 나무는 계속 여름 초록이었다.
   * 여기서 한여름 기준색(SUMMER_FOLIAGE_RGB)으로부터 지금 계절이 얼마나
   * 벗어났는지만큼만 물들인다 — 한여름엔 편차가 0이라 원본 텍스처가
   * 그대로 남고(가장 사실적인 지점을 그대로 보존), 겨울·가을·적설엔 그
   * 편차·눈 덮임만큼 색이 실제로 바뀐다.
   */
  _terrainTint(s) {
    const [fr, fg, fb] = s.ground.foliageTint;
    const [sr, sg, sb] = SUMMER_FOLIAGE_RGB;
    const dist = Math.abs(fr - sr) + Math.abs(fg - sg) + Math.abs(fb - sb);
    let amount = clamp01(dist * 1.8);
    let tr = fr, tg = fg, tb = fb;
    const snow = s.ground.snowCover;
    if (snow > 0.02) {
      tr = lerp(tr, 0.94, snow); tg = lerp(tg, 0.96, snow); tb = lerp(tb, 1.0, snow);
      amount = Math.max(amount, clamp01(snow * 1.3));
    }
    amount = clamp01(amount + s.ground.wetness * 0.08);
    return { color: [tr, tg, tb], amount: amount * 0.8 };   // 0.8 캡 — 완전 REPLACE 되면 위성 디테일이 지워진다
  }

  /** 뷰어 한 대에 조명·대기·영상보정을 바른다. slot 은 그 뷰어의 조명 인스턴스 보관함. */
  _paintViewer(s, viewer, slot) {
    if (!viewer || viewer.isDestroyed?.()) { this._extra.delete(viewer); return; }
    const scene = viewer.scene;
    this._paintLight(s, scene, viewer, slot);
    this._paintAtmosphere(s, scene);
    this._paintImagery(s, viewer);
  }

  /** 시계 — 태양 원반·대기산란·별·지형 그림자가 전부 여기서 온다. */
  _paintClock(s) {
    const { month, day } = monthDayOf(s.settings.dayOfYear);
    const minute = Math.round(s.settings.minuteOfDay);
    const hh = String(Math.floor(minute / 60)).padStart(2, '0');
    const mm = String(minute % 60).padStart(2, '0');
    const off = s.site.utcOffsetHours >= 0 ? '+' : '-';
    const oh = String(Math.abs(Math.trunc(s.site.utcOffsetHours))).padStart(2, '0');
    const iso = `${this.year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
      + `T${hh}:${mm}:00${off}${oh}:00`;
    this.viewer.clock.currentTime = Cesium.JulianDate.fromDate(new Date(iso));
  }

  /**
   * 조명. 방향은 모델이 준 태양(밤이면 달) 벡터를 ENU→ECEF 로 돌린 것이고,
   * 세기·색은 구름 소광까지 반영된 모델 값 그대로다.
   */
  _paintLight(s, scene, viewer = this.viewer, slot = this) {
    const body = s.sun.aboveHorizon ? s.sun : s.moon;
    const d = body.direction;                       // 동+X, 상+Y, 북−Z
    const enu = Cesium.Transforms.eastNorthUpToFixedFrame(
      Cesium.Cartesian3.fromDegrees(s.site.longitude, s.site.latitude, 0),
    );
    const rot = Cesium.Matrix4.getMatrix3(enu, new Cesium.Matrix3());
    // ENU(동, 북, 상) 순으로 다시 세운 뒤 광선 진행방향(=천체 반대)으로 뒤집는다.
    const local = new Cesium.Cartesian3(-d.x, d.z, -d.y);
    const dir = Cesium.Matrix3.multiplyByVector(rot, local, new Cesium.Cartesian3());
    Cesium.Cartesian3.normalize(dir, dir);

    const c = s.light.sunColor;
    const color = new Cesium.Color(c[0], c[1], c[2], 1);
    const intensity = Math.max(0.12, s.light.sunIntensity);
    if (!slot._light) {
      slot._light = new Cesium.DirectionalLight({ direction: dir, color, intensity });
      scene.light = slot._light;
    } else {
      slot._light.direction = dir;
      slot._light.color = color;
      slot._light.intensity = intensity;
      if (scene.light !== slot._light) scene.light = slot._light;
    }

    // 그림자는 직사광이 남아 있을 때만 — 흐린 날의 하드 섀도우는 거짓말이다.
    // 값이 바뀔 때만 대입한다: 그림자 토글은 셰도우맵을 다시 세운다.
    const shadows = s.light.shadowStrength > 0.35;
    if (shadows !== slot._shadows) {
      slot._shadows = shadows;
      viewer.shadows = shadows;
      viewer.terrainShadows = shadows ? Cesium.ShadowMode.ENABLED : Cesium.ShadowMode.DISABLED;
    }
  }

  /**
   * 대기.
   *
   * 안개 자체는 여기서 칠하지 않는다 — `weatherFx` 의 깊이 인식 단계가 전담한다.
   * Cesium 내장 `scene.fog` 는 지구 표면에만 걸려서 원경 지형만 흐려지고 그 앞의
   * 타워·건물·인원은 또렷하게 남는데, 사람 눈은 그 불일치를 바로 가짜로 읽는다.
   * 내장 안개는 지형 타일 LOD 를 느슨하게 해 주는 값으로만 남기고(weatherFx 가
   * density 를 준다), 여기서는 밝기를 낮게 고정해 이중으로 얹히지 않게 한다.
   */
  _paintAtmosphere(s, scene) {
    scene.fog.minimumBrightness = 0.03;

    const sky = scene.skyAtmosphere;
    sky.show = true;
    sky.hueShift = -0.02;
    sky.saturationShift = 0.05 - 0.55 * s.weather.cloudCover;
    sky.brightnessShift = -0.30 * s.weather.cloudCover;

    const globe = scene.globe;
    globe.atmosphereSaturationShift = -0.45 * s.weather.cloudCover;
    globe.atmosphereBrightnessShift = -0.25 * s.weather.cloudCover;
    globe.atmosphereLightIntensity = lerp(3.0, 12.0, daynessOf(s.illuminanceLux));
  }

  /**
   * 위성영상. 밤·구름·적설·계절이 전부 여기로 모인다 — Cesium 의 전역 조명만으로는
   * 정사영상이 밤에도 대낮처럼 밝게 남기 때문이다.
   */
  _paintImagery(s, viewer = this.viewer) {
    // 베이스맵은 항상 0번이다 (LayerManager.setBasemap 이 0번을 갈아끼운다).
    // 지명·음영기복 오버레이는 건드리지 않는다 — 그 투명도는 운용자가 슬라이더로
    // 정한 값이고, 환경이 매 프레임 덮어쓰면 그 슬라이더가 거짓이 된다.
    const base = viewer.imageryLayers.get(0);
    if (!base) return;

    const dayness = daynessOf(s.illuminanceLux);
    const cloud = s.weather.cloudCover;
    const snow = s.ground.snowCover;

    let brightness = lerp(0.22, 1.04, dayness) * (1 - 0.16 * cloud);
    brightness *= 1 + 0.5 * snow;
    let saturation = lerp(0.32, 1.0, dayness) * (1 - 0.40 * cloud);
    saturation *= 1 - 0.72 * snow;
    // 착엽률: 헐벗은 겨울 숲은 채도가 낮다 — 위성사진 전체를 "겨울다운 흐릿함"으로
    // 눌러 계절감의 대부분을 여기서 낸다(아래 hueShift 는 보조일 뿐이다).
    saturation *= lerp(0.55, 1.15, s.ground.foliageDensity);

    // 계절 색조 — 수관 램프가 한여름 녹색에서 얼마나 돌아갔는지를 그대로 회전.
    //
    // **함정(2026-09-07)**: 원래 이 회전을 거의 그대로(0.5 가중) 걸었더니 겨울에
    // 위성사진 **전체**(도로·바위·건물까지)가 황토색으로 물들었다 — `ImageryLayer.hue`
    // 는 화소 전부를 같은 각도로 돌리는 전역 연산이라 "나무만 색이 바뀐다"를
    // 표현할 방법이 없다(나무만 골라 돌릴 마스크가 없다). 사진을 잘못된 색으로
    // 물들이느니, 계절감은 대부분 채도(위)로 내고 색조는 아주 약하게만 거들도록
    // 가중치를 크게 낮췄다 — 겨울은 "황토색 사진"이 아니라 "흐리고 탈색된 사진"
    // 이어야 실제 겨울 위성사진에 더 가깝다.
    let hueShift = (hueTurns(s.ground.foliageTint) - SUMMER_FOLIAGE_HUE);
    if (hueShift > 0.5) hueShift -= 1;
    if (hueShift < -0.5) hueShift += 1;
    const seasonHue = hueShift * Math.PI * 0.35;       // turns → rad, 크게 감쇠된 가중치
    const nightHue = 0.10 * (1 - dayness);             // 야간 청색 편이 (기존 톤 유지)

    base.brightness = clamp(brightness, 0.14, 1.9);
    base.saturation = clamp(saturation, 0.05, 1.6);
    base.hue = seasonHue + nightHue;
    base.gamma = clamp(lerp(1.35, 1.0, dayness), 0.85, 1.5);
  }

  /**
   * 안개·강수·적설. 셋 다 같은 상태 하나에서 나오므로 한 번에 넘긴다 —
   * 무엇이 내리는지는 버튼이 아니라 기온이 정한 값이고, 안개가 얼마나 두꺼운지는
   * 가시거리가 정한 값이며, 적설이 어디 붙는지는 경사가 정한다.
   */
  _paintWeatherFx(s) {
    this.weatherFx?.apply(s);
  }

  /** 상태바·HUD 용 한 줄. */
  headline() {
    const s = this.state;
    if (!s) return '';
    return `${formatClock(s.settings.minuteOfDay)} KST · ${formatSeasonDate(s.season.dayOfYear)} `
      + `${s.season.label} · ${s.weather.label} · ${s.daylight.phaseLabel}`;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// 조종 패널 — 원본 ops-console.tsx `stage-environment-panel` 의 마크업·문구 이식
// ═══════════════════════════════════════════════════════════════════════════

const VERDICT_TEXT = { GO: '가능', LIMITED: '제한', NO_GO: '불가' };

/**
 * 패널을 mount 엘리먼트 안에 렌더하고 이벤트를 물린다.
 * 재렌더 시 슬라이더 포커스가 튀지 않도록 값만 갱신하는 경로를 따로 둔다.
 */
export function renderEnvironmentPanel(mount, env) {
  if (!mount) return;
  const s = env.state ?? env.apply();

  mount.innerHTML = `
    <div class="env-panel">
      <div class="env-head">
        <span>환경 · 시간 · 계절 · 날씨</span>
        <strong id="env-headline">${formatClock(s.settings.minuteOfDay)} · ${formatSeasonDate(s.season.dayOfYear)} · ${s.weather.label}</strong>
      </div>

      <label class="env-row">
        <span>시각</span>
        <input type="range" id="env-minute" min="0" max="1439" step="1"
          value="${Math.round(s.settings.minuteOfDay)}" aria-label="작전 시각">
        <b id="env-minute-val">${formatClock(s.settings.minuteOfDay)}</b>
      </label>

      <div class="env-speed" role="group" aria-label="시간 배속">
        ${[[0, '정지'], [60, '×60'], [300, '×300']].map(([scale, label]) => `
          <button class="env-btn ${env.timeScale === scale ? 'is-active' : ''}" data-env-scale="${scale}">${label}</button>`).join('')}
        <em id="env-daylight">${daylightLine(s)}</em>
      </div>

      <label class="env-row">
        <span>계절</span>
        <input type="range" id="env-day" min="1" max="365" step="1"
          value="${s.season.dayOfYear}" aria-label="계절 (연중 일자)">
        <b id="env-day-val">${s.season.label} · ${formatSeasonDate(s.season.dayOfYear)}</b>
      </label>

      <div class="env-weather" role="group" aria-label="날씨">
        ${WEATHER_ORDER.map((w) => `
          <button class="env-btn ${s.weather.id === w ? 'is-active' : ''}" data-env-weather="${w}">${WEATHER_LABELS[w]}</button>`).join('')}
      </div>

      <label class="env-row">
        <span>강도</span>
        <input type="range" id="env-intensity" min="0" max="100" step="1"
          value="${Math.round(s.weather.intensity * 100)}" aria-label="날씨 강도">
        <b id="env-intensity-val">${Math.round(s.weather.intensity * 100)}%</b>
      </label>

      <label class="env-row">
        <span>풍속</span>
        <input type="range" id="env-wind" min="0" max="20" step="1"
          value="${Math.round(env.settings.windMps)}" aria-label="풍속">
        <b id="env-wind-val">${s.weather.windMps.toFixed(1)} m/s</b>
      </label>

      <label class="env-row">
        <span>환경음</span>
        <input type="range" id="env-audio-vol" min="0" max="100" step="5"
          value="${Math.round((env.audio?.volume ?? 0.5) * 100)}" aria-label="환경음 볼륨">
        <button class="env-audio-toggle ${env.audio?.enabled === false ? '' : 'is-active'}"
          id="env-audio-toggle" type="button" title="바람·비 배경음 음소거">
          ${env.audio?.enabled === false ? '🔇' : '🔊'}
        </button>
      </label>

      <div class="env-readout" id="env-readout">${readoutHtml(s)}</div>

      <!-- 임무 영향 — 이 패널을 그래픽 장난감이 아니라 작전 조종으로 만드는 절반.
           태양을 움직인 그 상태가 카메라가 아직 쓸만한지, 노면이 바퀴에 무엇을
           할지, 무인기가 뜰 수 있는지를 같이 정한다. -->
      <div class="env-impacts" id="env-impacts">${impactsHtml(s)}</div>
    </div>`;

  const q = (sel) => mount.querySelector(sel);

  q('#env-minute').oninput = (e) => {
    env.set({ minuteOfDay: +e.target.value });
    refreshEnvironmentPanel(mount, env);
  };
  q('#env-day').oninput = (e) => {
    env.set({ dayOfYear: +e.target.value });
    refreshEnvironmentPanel(mount, env);
  };
  q('#env-intensity').oninput = (e) => {
    env.set({ intensity: +e.target.value / 100 });
    refreshEnvironmentPanel(mount, env);
  };
  q('#env-wind').oninput = (e) => {
    env.set({ windMps: +e.target.value });
    refreshEnvironmentPanel(mount, env);
  };
  q('#env-audio-vol').oninput = (e) => {
    env.audio?.setVolume(+e.target.value / 100);
  };
  q('#env-audio-toggle').onclick = () => {
    if (!env.audio) return;
    env.audio.setEnabled(!env.audio.enabled);
    env.audio.resume();   // 음소거 해제 클릭이 곧 사용자 제스처 — 여기서 컨텍스트를 깨운다
    const btn = q('#env-audio-toggle');
    btn.textContent = env.audio.enabled ? '🔊' : '🔇';
    btn.classList.toggle('is-active', env.audio.enabled);
  };
  mount.querySelectorAll('[data-env-scale]').forEach((b) => {
    b.onclick = () => {
      env.setTimeScale(+b.dataset.envScale);
      mount.querySelectorAll('[data-env-scale]').forEach((o) => {
        o.classList.toggle('is-active', +o.dataset.envScale === env.timeScale);
      });
    };
  });
  mount.querySelectorAll('[data-env-weather]').forEach((b) => {
    b.onclick = () => {
      env.set({ weather: b.dataset.envWeather });
      mount.querySelectorAll('[data-env-weather]').forEach((o) => {
        o.classList.toggle('is-active', o.dataset.envWeather === env.state.weather.id);
      });
      refreshEnvironmentPanel(mount, env);
    };
  });
}

/** 값만 갱신 — 드래그 중 innerHTML 을 갈아끼우면 슬라이더를 놓치게 된다. */
export function refreshEnvironmentPanel(mount, env) {
  if (!mount) return;
  const s = env.state;
  if (!s) return;
  const set = (sel, text) => { const el = mount.querySelector(sel); if (el) el.textContent = text; };
  set('#env-headline', `${formatClock(s.settings.minuteOfDay)} · ${formatSeasonDate(s.season.dayOfYear)} · ${s.weather.label}`);
  set('#env-minute-val', formatClock(s.settings.minuteOfDay));
  set('#env-day-val', `${s.season.label} · ${formatSeasonDate(s.season.dayOfYear)}`);
  set('#env-intensity-val', `${Math.round(s.weather.intensity * 100)}%`);
  set('#env-wind-val', `${s.weather.windMps.toFixed(1)} m/s`);
  set('#env-daylight', daylightLine(s));
  const ro = mount.querySelector('#env-readout');
  if (ro) ro.innerHTML = readoutHtml(s);
  const im = mount.querySelector('#env-impacts');
  if (im) im.innerHTML = impactsHtml(s);
  // 시간 배속으로 시각이 흐르는 동안 슬라이더 손잡이도 따라가야 한다.
  const minute = mount.querySelector('#env-minute');
  if (minute && document.activeElement !== minute) minute.value = Math.round(s.settings.minuteOfDay);
  const day = mount.querySelector('#env-day');
  if (day && document.activeElement !== day) day.value = s.season.dayOfYear;
}

function daylightLine(s) {
  const rise = s.daylight.sunriseMinute === undefined ? '—' : formatClock(s.daylight.sunriseMinute);
  const set = s.daylight.sunsetMinute === undefined ? '—' : formatClock(s.daylight.sunsetMinute);
  return `일출 ${rise} · 일몰 ${set} · 고도 ${s.sun.altitudeDeg.toFixed(0)}°`;
}

function readoutHtml(s) {
  return `
    <span>${s.daylight.phaseLabel}</span>
    <span>${s.temperatureC.toFixed(1)}°C</span>
    <span>${formatLux(s.illuminanceLux)}</span>
    <span>가시 ${formatDistance(s.weather.visibilityMeters)}</span>`;
}

function impactsHtml(s) {
  return s.impacts.map((i) => `
    <div class="env-impact is-${i.verdict.toLowerCase()}">
      <i></i>
      <strong>${i.label}</strong>
      <b>${VERDICT_TEXT[i.verdict]}</b>
      <small>${i.note}</small>
    </div>`).join('');
}

export { rgbToCss };

