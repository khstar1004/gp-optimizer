// @ts-nocheck
/**
 * 광학 화면 변환 — 「그 자산의 눈이 실제로 만들어 내는 그림」
 *
 * 열상(TOD)으로 들어갔는데 화면이 컬러 위성사진이면 그건 TOD 가 아니다. 열상은
 * 반사광이 아니라 **복사온도**를 본다: 색이 사라지고, 태양 그림자가 아니라 열의
 * 분포가 밝기가 되며, 초점면 배열의 고정패턴잡음이 얹힌다. 야시경(I²)은 반대로
 * 반사광을 증폭해 초록 한 채널로 눌러 담고 그 대가로 광자 산탄잡음이 튄다.
 *
 * 이 파일은 그 변환을 깊이 버퍼를 아는 포스트프로세스 한 단계로 얹는다.
 * 깊이를 쓰는 이유는 두 가지다:
 *   ① 하늘은 열상에서 가장 차갑다 — 지형과 같은 램프로 칠하면 안 된다.
 *   ② 거리가 멀수록 대기 복사가 끼어들어 열대비가 씻긴다(경로복사).
 *
 * 실패해도 앱은 죽지 않는다 — renderGuard 에 등록해 두고, 컴파일이 안 되면
 * 색조 없이 계기만 남긴다. 열상 없는 지도가, 지도 없는 화면보다 낫다.
 */

const OPTIC_FS = `
uniform sampler2D colorTexture;
uniform sampler2D depthTexture;
uniform float uMode;        // 0 통과 · 1 백열 · 2 흑열 · 3 야시 · 4 레이더콘솔
uniform float uMix;         // 0~1 적용 강도
uniform float uTime;        // 초
uniform float uGain;        // 이득 (열대비/증폭)
uniform float uNoise;       // 잡음 세기
uniform float uPathRad;     // 경로복사 — 먼 곳일수록 대비가 씻긴다 (0~1)
uniform float uScan;        // 주사선 세기
in vec2 v_textureCoordinates;

float hash21(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

void main(void) {
  vec4 scene = texture(colorTexture, v_textureCoordinates);
  if (uMode < 0.5 || uMix < 0.002) { out_FragColor = scene; return; }

  vec2 uv = v_textureCoordinates;
  float depth = czm_readDepth(depthTexture, uv);
  bool sky = depth >= 1.0 - 0.000001;

  // 거리 — 경로복사와 원경 대비 손실에 쓴다
  float dist = 0.0;
  if (!sky) {
    vec4 eye = czm_windowToEyeCoordinates(gl_FragCoord.xy, depth);
    dist = length(eye.xyz / eye.w);
  }
  float far = clamp(dist / 4000.0, 0.0, 1.0);

  // 휘도 — 열상은 색을 버린다. 녹색 가중을 낮춰 초목이 통째로 밝아지지 않게.
  float lum = dot(scene.rgb, vec3(0.34, 0.42, 0.24));

  vec3 outc = scene.rgb;

  if (uMode < 2.5) {
    // ── 열상 (LWIR) ────────────────────────────────────────────────────
    // 겉보기 밝기를 겉보기 온도로 바꾼다: 어두운 계곡/수풀이 반드시 차가운 것은
    // 아니므로 중간값 쪽으로 눌러 담은 뒤 이득을 건다(AGC 흉내).
    float t = clamp((lum - 0.12) / 0.62, 0.0, 1.0);
    t = pow(t, 0.78);
    t = clamp(0.5 + (t - 0.5) * uGain, 0.0, 1.0);
    // 경로복사 — 먼 화소는 대비가 중간으로 씻긴다
    t = mix(t, 0.46, far * uPathRad);
    // 하늘은 열상에서 가장 차다 (대기창 밖 — 거의 검게 떨어진다)
    if (sky) t = 0.06 + 0.05 * scene.g;

    // 고정패턴잡음 (FPN) — 세로 줄무늬. 열상을 열상처럼 보이게 하는 결정적 신호.
    float fpn = (hash21(vec2(floor(gl_FragCoord.x), 7.0)) - 0.5) * 0.045;
    float grain = (hash21(gl_FragCoord.xy + uTime * 60.0) - 0.5) * uNoise;
    t = clamp(t + fpn + grain, 0.0, 1.0);

    if (uMode > 1.5) t = 1.0 - t;   // 흑열(BLACK HOT)

    // 완전한 무채색은 아니다 — 실물 마이크로볼로미터 출력은 아주 옅게 푸르다
    outc = vec3(t) * vec3(0.97, 0.99, 1.02);
  } else if (uMode < 3.5) {
    // ── 야시 (I² 영상증폭) ─────────────────────────────────────────────
    float g = clamp(pow(lum * uGain, 0.72), 0.0, 1.0);
    // 하늘은 증폭해도 형체가 없다 — 지형과 같은 이득을 걸면 화면이 통째로
    // 형광 초록으로 타 버리고 능선이 사라진다. 실물 관에도 자동광량조절(ABC)이
    // 밝은 면을 눌러 준다.
    if (sky) g = min(g, 0.30);
    else g = mix(g, g * 0.82, far * 0.6);
    float shot = (hash21(gl_FragCoord.xy + uTime * 120.0) - 0.5) * uNoise * 2.2;
    g = clamp(g + shot * (1.0 - g * 0.6), 0.0, 1.0);
    // 인광체 P43 — 노란기 도는 초록
    outc = vec3(g * 0.16, g * 1.0, g * 0.34);
    // 주변부 감광 (접안 광학의 비네팅)
    float r = length(uv - 0.5) * 1.42;
    outc *= 1.0 - smoothstep(0.62, 1.0, r) * 0.55;
  } else {
    // ── 레이더 콘솔 인광 ───────────────────────────────────────────────
    float g = clamp(lum * 1.15, 0.0, 1.0);
    outc = vec3(g * 0.16, g * 0.92, g * 0.46);
  }

  // 주사선 — CRT/롤링셔터 결
  if (uScan > 0.002) {
    float s = 0.5 + 0.5 * sin((gl_FragCoord.y + uTime * 34.0) * 2.6);
    outc *= 1.0 - uScan * s;
  }

  out_FragColor = vec4(mix(scene.rgb, outc, uMix), scene.a);
}`;

/** 프리셋 — palette 이름 하나로 uniform 한 벌이 정해진다. */
const PRESET = {
  vis:   { mode: 0, mix: 0,    gain: 1,    noise: 0,     path: 0,    scan: 0 },
  wh:    { mode: 1, mix: 1,    gain: 1.35, noise: 0.055, path: 0.55, scan: 0.055 },
  bh:    { mode: 2, mix: 1,    gain: 1.35, noise: 0.055, path: 0.55, scan: 0.055 },
  nvg:   { mode: 3, mix: 0.96, gain: 3.4,  noise: 0.085, path: 0.2,  scan: 0.03 },
  radar: { mode: 4, mix: 0.72, gain: 1,    noise: 0,     path: 0,    scan: 0.08 },
};

/**
 * 뷰어 하나에 얹는 광학 변환.
 *
 *   const fx = new OpticFx(viewer, { renderGuard });
 *   fx.set('wh', { deltaT: 3.2 });   // 열대비가 낮으면 이득이 올라가고 잡음도 함께 오른다
 *   fx.set(null);                    // 통과
 */
export class OpticFx {
  constructor(viewer, opts = {}) {
    this.viewer = viewer;
    this.guard = opts.renderGuard ?? null;
    this.stage = null;
    this.failed = false;
    this.palette = null;
    this._t0 = performance.now();
    this._pump = viewer.scene.preRender.addEventListener(() => {
      if (this.stage) this.stage.uniforms.uTime = (performance.now() - this._t0) / 1000;
    });
  }

  _ensure() {
    if (this.stage || this.failed) return this.stage;
    try {
      this.stage = this.viewer.scene.postProcessStages.add(new Cesium.PostProcessStage({
        name: 'gp_optic',
        fragmentShader: OPTIC_FS,
        uniforms: { uMode: 0, uMix: 0, uTime: 0, uGain: 1.3, uNoise: 0.05, uPathRad: 0.5, uScan: 0 },
      }));
      this.guard?.register('광학 화면(열상/야시)', this.stage, () => {
        this.stage = null;
        this.failed = true;
      });
    } catch (e) {
      console.warn('광학 변환 단계 생성 실패 — 색조 없이 계기만 표시', e);
      this.failed = true;
    }
    return this.stage;
  }

  /**
   * @param palette 'wh'|'bh'|'nvg'|'radar'|'vis'|null
   * @param env { deltaT, lux } — 열대비가 낮을수록 AGC 이득이 올라가고 잡음이 튄다
   */
  set(palette, env = {}) {
    this.palette = palette && palette !== 'vis' ? palette : null;
    if (!this.palette) {
      if (this.stage) { this.stage.enabled = false; this.stage.uniforms.uMix = 0; }
      return;
    }
    const st = this._ensure();
    if (!st) return;
    const p = PRESET[this.palette] ?? PRESET.wh;
    st.enabled = true;
    const u = st.uniforms;
    u.uMode = p.mode;
    u.uMix = p.mix;
    u.uScan = p.scan;
    u.uPathRad = p.path;
    if (p.mode === 1 || p.mode === 2) {
      // 열대비 ΔT 가 작을수록 이득을 올려 짜내고, 그만큼 잡음이 올라온다
      const dt = Math.max(0.3, env.deltaT ?? 3);
      const k = Math.min(2.4, Math.max(0.9, 3.2 / dt));
      u.uGain = 1.0 + k * 0.45;
      u.uNoise = Math.min(0.16, 0.03 + (k - 0.9) * 0.055);
    } else if (p.mode === 3) {
      // 조도가 낮을수록 증폭이 커지고 산탄잡음이 화면을 채운다
      const lux = Math.max(1e-4, env.lux ?? 0.01);
      const k = Math.min(4.2, Math.max(1.3, 0.45 / Math.pow(lux, 0.22)));
      u.uGain = k;
      u.uNoise = Math.min(0.22, 0.03 + k * 0.028);
    } else {
      u.uGain = p.gain;
      u.uNoise = p.noise;
    }
  }

  destroy() {
    this._pump?.();
    if (this.stage) {
      try { this.viewer.scene.postProcessStages.remove(this.stage); } catch { /* 이미 제거됨 */ }
      this.stage = null;
    }
  }
}

/**
 * I² 자동 전환 문턱 (lx). 시민박명이 끝나는 무렵(≈3.4 lx)보다 조금 위에 둔다 —
 * 사람 눈으로 아직 형체가 보이는 구간에서 이미 EO 화면은 쓸모를 잃기 때문이다.
 */
export const NVG_SWITCH_LUX = 8;

/**
 * 지금 이 광학이 실제로 내보낼 화면 극성.
 * 운용자가 극성을 직접 눌렀으면 그것을 존중하고, 아니면 광학·조도가 정한다.
 */
export function resolvePalette(optic, { manual, lux } = {}) {
  if (manual) return manual;
  if (optic.band === 'lwir') return 'wh';
  if (optic.band === 'radar') return 'radar';
  // EO·육안은 조도가 떨어지면 야시로 넘어간다 (I² 자동 전환)
  if (optic.nightNvg && (lux ?? 1e4) < NVG_SWITCH_LUX) return 'nvg';
  return 'vis';
}
