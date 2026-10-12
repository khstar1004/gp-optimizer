// @ts-nocheck
/**
 * 충격파 화면 왜곡 — Cesium `PostProcessStage` 한 장
 *
 * 폭발에서 사람이 실제로 「느끼는」 것은 불빛보다 **공기가 밀려나는 것**이다. 압축된
 * 공기는 굴절률이 달라 그 너머 풍경을 밀어 놓는다 — 그래서 충격파는 빛나는 고리가
 * 아니라 **풍경이 잠깐 휘는 띠**로 보인다. 3D 도형으로는 그 느낌이 안 나온다.
 * 화면을 다 그린 뒤에 픽셀을 밀어야 나온다.
 *
 * 계산은 전부 시각 t 에서 온다(반경·세기 모두 uniform 으로 넣는다). 그래서 재생 막대를
 * 되감아도 같은 프레임이 나온다 — 파티클과 달리 이 층은 결정적이다.
 *
 * 참고: Cesium PostProcessStage 는 GLSL ES 3.00 규약을 쓴다
 *       (`in vec2 v_textureCoordinates`, `out_FragColor`, `texture(...)`).
 */

const FS = `
uniform sampler2D colorTexture;
uniform vec2 u_center;     // 폭심의 화면 좌표 (0~1, 좌하단 기준)
uniform float u_radius;    // 충격파 반경 (화면 높이로 정규화)
uniform float u_width;     // 띠 두께
uniform float u_strength;  // 밀어내는 세기
uniform float u_aspect;    // 화면 가로/세로 비
uniform float u_glow;      // 전선의 밝기 (압축된 공기가 하늘빛을 문다)
in vec2 v_textureCoordinates;

void main() {
  vec2 uv = v_textureCoordinates;
  vec2 d = uv - u_center;
  d.x *= u_aspect;
  float r = length(d);

  // 전선에서만 민다 — 안쪽·바깥쪽은 손대지 않는다
  float band = 1.0 - smoothstep(0.0, max(1e-4, u_width), abs(r - u_radius));
  band *= band;

  if (band < 0.002) {
    out_FragColor = texture(colorTexture, uv);
    return;
  }

  vec2 dir = r > 1e-4 ? d / r : vec2(0.0);
  // 전선 안쪽은 당기고 바깥쪽은 민다 — 렌즈처럼 한 번 접힌다
  float sign = r < u_radius ? -1.0 : 1.0;
  vec2 off = dir * band * u_strength * sign;
  off.x /= u_aspect;

  // 색수차 — 굴절이 파장마다 다르다. 아주 약하게만 준다.
  vec4 c;
  c.r = texture(colorTexture, uv - off * 1.08).r;
  c.g = texture(colorTexture, uv - off).g;
  c.b = texture(colorTexture, uv - off * 0.92).b;
  c.a = 1.0;

  out_FragColor = c + vec4(vec3(band * u_glow), 0.0);
}
`;

export class Shockwave {
  constructor(scene) {
    this.scene = scene;
    this.uniforms = {
      u_center: new Cesium.Cartesian2(0.5, 0.5),
      u_radius: 0.0,
      u_width: 0.05,
      u_strength: 0.0,
      u_aspect: 1.6,
      u_glow: 0.0,
    };
    this.stage = null;
    try {
      this.stage = scene.postProcessStages.add(new Cesium.PostProcessStage({
        name: 'gp_strike_shockwave',
        fragmentShader: FS,
        uniforms: {
          u_center: () => this.uniforms.u_center,
          u_radius: () => this.uniforms.u_radius,
          u_width: () => this.uniforms.u_width,
          u_strength: () => this.uniforms.u_strength,
          u_aspect: () => this.uniforms.u_aspect,
          u_glow: () => this.uniforms.u_glow,
        },
      }));
      this.stage.enabled = false;
    } catch (e) {
      console.warn('[strike] 충격파 포스트프로세스를 만들지 못했습니다 — 없이 진행합니다', e);
    }
  }

  /** 폭심의 화면 좌표. 카메라 뒤이거나 화면 밖이면 null. */
  _screen(worldPos) {
    const T = Cesium.SceneTransforms;
    const fn = T.worldToWindowCoordinates ?? T.wgs84ToWindowCoordinates;
    return fn ? fn(this.scene, worldPos) : null;
  }

  /**
   * @param center Cartesian3 폭심
   * @param edge   Cartesian3 폭심에서 충격파 반경만큼 떨어진 지표의 한 점
   *               (반경을 화면 픽셀로 환산하기 위해 — 원근을 그대로 반영한다)
   * @param strength 0~1 세기
   */
  update(center, edge, strength) {
    if (!this.stage) return;
    if (!(strength > 0.001)) { this.stage.enabled = false; return; }
    const c = this._screen(center);
    const e = this._screen(edge);
    const canvas = this.scene.canvas;
    const w = canvas.clientWidth || canvas.width;
    const h = canvas.clientHeight || canvas.height;
    if (!c || !e || !w || !h) { this.stage.enabled = false; return; }

    const radiusPx = Math.hypot(e.x - c.x, e.y - c.y);
    const radius = radiusPx / h;
    // 화면을 벗어날 만큼 커졌으면 더 그리지 않는다 (전선이 시야 밖이면 왜곡도 없다)
    if (radius > 3.2) { this.stage.enabled = false; return; }

    this.uniforms.u_center = new Cesium.Cartesian2(c.x / w, 1 - c.y / h);
    this.uniforms.u_aspect = w / h;
    this.uniforms.u_radius = radius;
    // 띠는 반경에 비례해 두꺼워지되 상한을 둔다 — 멀어질수록 얇고 흐려진다
    this.uniforms.u_width = Math.min(0.12, 0.018 + radius * 0.14);
    this.uniforms.u_strength = 0.032 * strength;
    this.uniforms.u_glow = 0.16 * strength;
    this.stage.enabled = true;
  }

  disable() { if (this.stage) this.stage.enabled = false; }

  destroy() {
    if (!this.stage) return;
    try { this.scene.postProcessStages.remove(this.stage); } catch { /* 장면이 먼저 사라짐 */ }
    this.stage = null;
  }
}
