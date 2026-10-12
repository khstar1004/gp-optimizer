// @ts-nocheck
/**
 * 날씨 렌더링 — 깊이를 아는 안개와, 진짜 3D 공간에서 떨어지는 강수.
 *
 * 앞선 구현은 화면 위에 무늬를 얹는 것이었다. 그래서 가짜로 보였다:
 *
 *  ① 안개가 지구 표면에만 걸렸다. Cesium 내장 `scene.fog` 는 글로브 전용이라
 *     원경 지형은 흐려지는데 그 앞의 감시탑·건물·인원은 또렷하게 남는다.
 *     사람 눈은 이 불일치를 바로 잡아낸다.
 *  ② 안개에 높이가 없었다. 거리만 보는 안개는 능선 위 GP 에서도 계곡 바닥에서도
 *     똑같이 뿌옇다. 실제 계곡 복사안개는 바닥에 고여 두께가 100~300m 이고,
 *     능선 초소는 그 위로 머리를 내민다.
 *  ③ (구버전) 눈·비가 화면에 그려 넣은 2D 패턴이었다 — 카메라를 돌려도 같은 자리에
 *     붙어 있는 HUD 였다. 깊이 버퍼로 가림을 흉내는 냈지만 시차가 없었다("화면
 *     위에서 뜨는 눈"이라는 피드백). 지금은 `PrecipField`(아래, `BillboardCollection`
 *     기반)가 카메라 주위 실제 ECEF 좌표에 알갱이를 낳아 진짜 낙하시킨다 — 가림은
 *     깊이 테스트가 자동으로 하고(다른 프리미티브와 동일), 크기는 카메라와의
 *     실거리로 매 프레임 다시 계산해 원근이 저절로 생긴다. `Cesium.ParticleSystem`
 *     을 먼저 써 봤지만 그 클래스의 낙하 시간이 `viewer.clock.currentTime`(이 앱은
 *     시간 슬라이더가 실제 경과시간과 무관해야 해서 고정해 둔 시계)에 묶여 있어
 *     슬라이더를 손으로 안 건드리면 알갱이가 하나도 안 태어났다 — 그래서 자체
 *     구현으로 바꿨다(아래 클래스 주석 참고).
 *
 * 안개는 여전히 깊이 버퍼 포스트프로세스로 푼다(광선을 8구간으로 적분해 고도별
 * 소광 — 이건 원래도 화면을 가득 채우는 대기 현상이라 스크린스페이스가 맞는 기법).
 * 강수만 실제 3D 파티클로 바꿨다. 적설은 경사 램프로 급사면에는 눈이 붙지 않게.
 * 번개는 폭풍(비·짙은구름·강한 강수)일 때 무작위 간격으로 화면 전체를 순간
 * 밝히는 덧셈 포스트프로세스 — scene.light 는 건드리지 않는다(environment.ts
 * 가 매 apply() 마다 그 값의 단일 권한을 갖고 되돌리므로, 화면 끝단에 얹는
 * 편이 그 권한과 안 부딪힌다).
 * 비가 올 땐 3D 알갱이(저 너머 내리는 비)만으론 부족하다 — 실제 카메라·유리엔
 * 물이 맺혀 흐른다. LENS_FS 가 그 스크린스페이스 굴절+하이라이트를 낸다.
 *
 * 수치는 전부 `weatherProfile.ts` (순수·시험됨) 에서 오고, 이 파일은 그 수치를
 * 셰이더 uniform·파티클 시스템 파라미터로 옮기는 일만 한다.
 *
 * GLSL 은 **반드시 GLSL ES 3.00 문법**으로 쓴다 (`in` / `texture()` / `out_FragColor`).
 * Cesium 1.119 는 WebGL2 컨텍스트에 `#version 300 es` 를 붙인 뒤 우리 소스를 그대로
 * 이어 붙이고, WebGL1 로 떨어질 때만 demodernizeShader 로 역변환한다. 여기에
 * 옛 문법(`varying` / `texture2D` / `gl_FragColor`)을 쓰면 예약어 오류로 컴파일이
 * 실패하는데 — 그 실패는 `add()` 가 아니라 **첫 렌더**에서 나므로 아래 try/catch 가
 * 잡지 못하고, Cesium 기본 렌더 루프는 그대로 정지한다(지도 전체가 죽는다).
 * 그 최후 방어선이 `renderGuard.ts` 다.
 */
import { fogProfile, precipitationProfile, groundSnowProfile } from './weatherProfile';
import { setGroundSnow } from './terrainfx';
import { SITE } from './data';

// ── 안개: 고도로 층을 이루는 깊이 인식 소광 ─────────────────────────────────
const FOG_FS = `
uniform sampler2D colorTexture;
uniform sampler2D depthTexture;
uniform vec3  uFogColor;
uniform float uBeta;        // 안개층 내부 소광계수 (m^-1)
uniform float uResidual;    // 안개 위 맑은 공기 소광계수 (m^-1)
uniform float uTopHeight;   // 안개 상단 — 역전층 뚜껑 (m)
uniform float uFeather;     // 뚜껑의 날카로움 (m)
uniform float uMaxOpacity;
uniform float uSkyBlend;
in vec2 v_textureCoordinates;

void main(void) {
  vec4 scene = texture(colorTexture, v_textureCoordinates);
  float depth = czm_readDepth(depthTexture, v_textureCoordinates);

  // 하늘. 짙은 안개는 하늘도 같은 회색으로 지운다.
  if (depth >= 1.0 - 0.000001) {
    out_FragColor = vec4(mix(scene.rgb, uFogColor, clamp(uSkyBlend, 0.0, 1.0)), scene.a);
    return;
  }

  vec4 eye = czm_windowToEyeCoordinates(gl_FragCoord.xy, depth);
  vec3 eyePos = eye.xyz / eye.w;
  float dist = length(eyePos);

  vec4 world4 = czm_inverseView * vec4(eyePos, 1.0);
  vec3 world = world4.xyz / world4.w;

  // 국소 연직축. 몇 km 범위에서 지심 방향과 측지 연직의 차이는 무시할 수 있다.
  vec3 up = normalize(czm_viewerPositionWC);
  float camH = czm_eyeHeight;
  float fragH = camH + dot(world - czm_viewerPositionWC, up);

  // 광학 두께를 광선 위 8점으로 적분한다. 밀도가 고도의 smoothstep 이라 닫힌 해가
  // 지저분한데, 8탭이면 능선 하나를 사이에 둔 층 경계도 충분히 잡는다.
  // 능선 위에서 계곡을 내려다보는 사선이 안개 뚜껑을 뚫고 들어가는 그 구간이
  // 제대로 적분돼야 「안개 바다」가 보인다.
  const int STEPS = 8;
  float seg = dist / float(STEPS);
  float tau = 0.0;
  for (int i = 0; i < STEPS; i++) {
    float t = (float(i) + 0.5) / float(STEPS);
    float h = mix(camH, fragH, t);
    float capped = 1.0 - smoothstep(uTopHeight - uFeather, uTopHeight + uFeather, h);
    tau += (uResidual + (uBeta - uResidual) * capped) * seg;
  }

  float fogAmount = clamp((1.0 - exp(-tau)) * uMaxOpacity, 0.0, 1.0);
  out_FragColor = vec4(mix(scene.rgb, uFogColor, fogAmount), scene.a);
}`;

// ── 렌즈 물방울: 비가 카메라(유리)에 맺혀 흐르는 스크린스페이스 효과 ─────────
// 3D 알갱이(PrecipField)만으로는 "카메라 앞 몇 cm"의 존재감이 안 산다 — 실제
// 카메라·조준경·창에는 물이 맺혀 흐르고, 그 방울이 배경을 살짝 굴절시킨다.
//
// PUBG 등 언리얼 기반 게임의 실제 셰이더는 비공개라 그대로 가져올 수 없다.
// 대신 이 분야의 사실상 표준 공개 레퍼런스인 Martijn Steinrucken(BigWings)의
// Shadertoy "Heartfelt"(2017, CC BY-NC-SA — 코드 자체는 라이선스·저작권 때문에
// 그대로 옮기지 않고, 공개 튜토리얼(cyanilux 「Rain Effects Breakdown」 등)이
// 설명하는 **기법**만 참고해 이 프로젝트 코드로 새로 짰다: ①정지 격자에
// 셀별 시드로 "고정 물방울"을 두되 **셀마다 다른 위상의 주기(도착~증발
// 시간)를 줘서 맺혔다 흘러내리길 반복**시키고(고정 무늬로 안 보이게)
// ②흘러내리는 물줄기는 셀마다 다른 속도로 하강 ③둘 다 자기 위치의 gradient를
// `texture()` 샘플 좌표 오프셋으로 써서 굴절을 낸다(레이트레이싱 없이 노멀맵과
// 같은 원리로 근사). 3D 알갱이 쪽도 같은 리서치에서 확인한 실제 게임 엔진
// 기법(유니티 Shuriken의 "Stretched Billboard" — 스프라이트를 속도 방향으로
// 세움)을 PrecipField.tick() 에 `Billboard.alignedAxis`로 적용했다(아래 참고).
const LENS_FS = `
uniform sampler2D colorTexture;
uniform float uTime;
uniform float uIntensity;   // 0~1 — 강수 세기
in vec2 v_textureCoordinates;

float gp_hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

void main(void) {
  vec2 uv = v_textureCoordinates;
  vec4 scene = texture(colorTexture, uv);
  if (uIntensity <= 0.003) { out_FragColor = scene; return; }

  float aspect = czm_viewport.z / czm_viewport.w;
  vec2 st = vec2(uv.x * aspect, uv.y);

  // 흘러내리는 물줄기 — 셀마다 다른 속도로 아래로 흐른다.
  vec2 gridA = st * vec2(10.0, 4.0);
  vec2 cellASeed = floor(gridA);
  float speedA = 0.5 + gp_hash(cellASeed) * 0.9;
  vec2 pA = vec2(gridA.x, gridA.y - uTime * speedA);
  vec2 cellA = floor(pA);
  vec2 fA = fract(pA) - vec2(0.5 + (gp_hash(cellA + 1.7) - 0.5) * 0.5, 0.5);
  float existsA = step(0.6, gp_hash(cellA));
  float dropA = smoothstep(0.5, 0.0, length(fA * vec2(2.6, 0.55))) * existsA;

  // 맺혀서 안 흐르는 작은 물방울 — 더 촘촘한 정지 격자. 고정으로 두면 화면에
  // 박제된 무늬로 보인다 — 셀마다 다른 위상의 주기를 줘서 맺혔다 흘러내리길
  // 반복하게 한다(자리는 그대로지만 나타났다 사라지는 것만으로 "박제" 느낌이
  // 없어진다 — 실사 카메라 습기 서림 효과에 두루 쓰는 근사).
  vec2 gridB = st * 26.0;
  vec2 cellB = floor(gridB);
  float seedB = gp_hash(cellB + 71.0);
  float cycleB = fract(uTime * 0.12 + seedB * 5.0);
  float lifeB = smoothstep(0.0, 0.12, cycleB) * (1.0 - smoothstep(0.75, 1.0, cycleB));
  vec2 fB = fract(gridB) - 0.5 - (vec2(gp_hash(cellB + 3.0), gp_hash(cellB + 5.0)) - 0.5) * 0.4;
  float dropB = smoothstep(0.4, 0.0, length(fB)) * step(0.86, seedB) * lifeB;

  float mask = clamp(dropA + dropB, 0.0, 1.0) * uIntensity;
  vec2 refractOffset = (fA * dropA + fB * dropB) * 0.018 * uIntensity;
  vec3 refracted = texture(colorTexture, uv - refractOffset).rgb;
  float highlight = (dropA + dropB) * 0.35;

  out_FragColor = vec4(mix(scene.rgb, refracted + vec3(highlight), mask), scene.a);
}`;

// ── 갓레이(크레퓨스큘러 광선): 태양 쪽으로 방사형 감쇠 샘플링 ────────────────
// 유니티·언리얼 자산들이 두루 쓰는 공개 알고리즘 — Kenny Mitchell, "Volumetric
// Light Scattering as a Post-Process"(GPU Gems 3, NVIDIA, 공개 챕터) 가 원조다.
// 원 기법은 별도 렌더패스로 "가림막 지도"(광원=흰색, 그 외 물체=검정)를 만든
// 뒤 그 텍스처에 방사 샘플링을 건다. 여기서는 이미 FOG_FS 에서 검증된 방식대로
// depthTexture 의 depth==1(하늘, 빛이 안 가려짐) 여부를 그 가림막 대신 쓴다 —
// 별도 패스 없이 색+깊이 텍스처만으로 같은 원리를 근사한다. 태양의 화면좌표는
// weatherFx 가 매 프레임 `Cesium.SceneTransforms.worldToWindowCoordinates` 로
// 구해 uniform 으로 넘긴다(_tickGodrays). 알려진 한계 그대로: 태양을 등지면
// (화면 밖으로 나가면) 꺼진다 — 이 기법 자체의 태생적 제약이다.
const GODRAY_FS = `
uniform sampler2D colorTexture;
uniform sampler2D depthTexture;
uniform vec2 uLightUV;
uniform float uIntensity;
in vec2 v_textureCoordinates;

void main(void) {
  vec4 scene = texture(colorTexture, v_textureCoordinates);
  if (uIntensity <= 0.003) { out_FragColor = scene; return; }

  const int SAMPLES = 24;
  vec2 uv = v_textureCoordinates;
  vec2 deltaTexCoord = (uv - uLightUV) * (0.92 / float(SAMPLES));
  vec2 sampleUV = uv;
  float decay = 1.0;
  float accum = 0.0;
  for (int i = 0; i < SAMPLES; i++) {
    sampleUV -= deltaTexCoord;
    float depth = czm_readDepth(depthTexture, sampleUV);
    float sky = step(1.0 - 0.000001, depth);
    accum += sky * decay;
    decay *= 0.965;
  }
  accum /= float(SAMPLES);
  vec3 shaftColor = vec3(1.0, 0.94, 0.8) * accum * uIntensity;
  out_FragColor = vec4(scene.rgb + shaftColor, scene.a);
}`;

// ── 번개: 강한 비에서 화면 전체가 순간 밝아지는 섬광 ────────────────────────
// 실제 조명(scene.light)은 손대지 않는다 — environment.ts 가 매 apply() 마다
// 그 값을 다시 계산해 되돌려서(단일 권한 원칙), 여기서 건드리면 다음 apply()
// 에 지워진다. 화면 맨 끝에 얹는 덧셈 포스트프로세스라 그 권한과 안 부딪힌다.
const FLASH_FS = `
uniform sampler2D colorTexture;
uniform float uFlash;
in vec2 v_textureCoordinates;
void main(void) {
  vec4 scene = texture(colorTexture, v_textureCoordinates);
  out_FragColor = vec4(clamp(scene.rgb + uFlash, 0.0, 1.0), scene.a);
}`;

// ── 강수: 카메라를 따라다니는 실제 3D 알갱이 밭 ─────────────────────────────
//
// 처음엔 `Cesium.ParticleSystem` 을 썼다가 걷어냈다 — 그 클래스의 낙하 시간은
// `frameState.time`(= `viewer.clock.currentTime`)에서 오는데, 이 앱은 시간·계절
// 슬라이더가 실제 경과시간과 무관하게 동작해야 해서 `clock.shouldAnimate=false`
// 로 시계를 고정해 둔다(`environment.ts` start()). 그러면 ParticleSystem 이 보는
// "경과시간"이 거의 0으로 멈춰 알갱이가 하나도 안 태어난다 — 슬라이더를 손으로
// 안 건드리면 영원히 눈이 안 온다. 그래서 여기서는 `Cesium.BillboardCollection`
// 위에 알갱이 풀을 직접 얹고, 옛 강수 셰이더가 그랬던 것처럼 `performance.now()`
// 실제 경과시간으로 낙하·수명·원근을 매 프레임 손으로 계산한다.
//
// 카메라 기준 상대 상자. 아래로 넉넉히 잡아 둔다 — FPV/도보(지상고)뿐 아니라
// 감시탑 캐빈·드론(수십 m 상공)에서도 발밑까지 눈이 이어져 보여야 한다.
//
// **함정(2026-09-07)**: 이 크기는 FPV 기준으로만 잡혀 있었다. 지도·트윈 탭의
// 기본 조감 카메라(GP 에서 수백 m 물러난)에서는 이 상자가 카메라 바로 옆 작은
// 덩어리로만 보여 사실상 "안 보이는" 강수였다 — 화면 전체가 안개·색보정으로만
// 바뀌니 "그냥 흐려지기만 한다"는 인상을 준 진짜 이유. GP 기준점과의 거리로
// 상자를 함께 키워, 조감 시점에서도 지형 전반에 비·눈이 실제로 내리는 것처럼
// 보이게 한다.
const PRECIP_BOX = { halfX: 85, halfY: 85, topZ: 55, botZ: -55 };
const PRECIP_BASE_MAX = 480;    // 근접(scale=1, FPV 기준) 밀도 상한 — 기존 튜닝값
const PRECIP_POOL_MAX = 1800;   // 조감(최대 5배 상자)까지 허용하는 절대 풀 상한(성능 상한)
const PRECIP_REF_POINT = Cesium.Cartesian3.fromDegrees(SITE.gp.lon, SITE.gp.lat, 1025);   // 거리 나눔값은 PrecipField._updateBoxScale() 참고

/**
 * 원근 크기 — Cesium 표준 `scaleByDistance`(NearFarScalar)로 낸다.
 *
 * **함정(2026-09-07)**: 처음엔 카메라 거리를 손으로 재서 매 프레임 `bb.scale`을
 * 대입했다. Billboard 는 기본적으로 **화면 픽셀 고정 크기**라 원근 자체가 없고,
 * 상자 확대(조감뷰 대응)를 보상한다고 `scale`에 최대 1.8배를 곱했더니, 알갱이가
 * 하필 카메라 몇 m 앞에 스폰될 때(균등분포라 항상 일부는 그렇게 스폰된다)
 * 화면을 뒤덮는 **거대한 흰 기둥**이 됐다 — "비가 진짜 별로"라는 피드백의 실체.
 * `scaleByDistance`는 Cesium 이 실제 카메라~빌보드 거리로 매 프레임 자동
 * 계산하는 표준 메커니즘이라, near 이내로는 절대 그 이상 커지지 않고(상한
 * 고정) far 밖으로는 그 이하로 안 작아진다(조감에서도 완전히 안 사라짐).
 * 눈은 부드러운 원형이라 커져도 안 흉했는데(피드백: "눈은 괜찮은듯"), 가늘고
 * 각진 빗줄기는 확대될수록 특히 못생겨져 rain 쪽 near 상한을 더 낮게 잡는다.
 */
const RAIN_SCALE_BY_DISTANCE = new Cesium.NearFarScalar(20, 0.6, 450, 0.34);
const SNOW_SCALE_BY_DISTANCE = new Cesium.NearFarScalar(4, 1.0, 300, 0.24);

/** 카메라 주위 상자에서 낙하하는 알갱이 풀. 위치·수명·원근을 실시간(wall-clock)으로 갱신한다. */
class PrecipField {
  constructor(viewer) {
    this.viewer = viewer;
    this.collection = new Cesium.BillboardCollection({ scene: viewer.scene });
    viewer.scene.primitives.add(this.collection);
    this.particles = [];      // { bb, age, life, speedMul }
    this.shape = null;
    this.baseCount = 0;       // "근접(scale=1)" 기준 밀도 — 실제 표시 개수는 scale²로 늘어난다
    this.imageSize = null;
    this.image = null;
    this.fallSpeed = 1.6;     // m/s, 종단속도
    this.windX = 0; this.windY = 0;   // 동/북 성분 (m/s)
    this.jitter = 0.08;
    this.tint = [1, 1, 1];
    this.alphaMax = 0.85;
    this._basisScratch = new Cesium.Matrix4();
    this._boxScale = 1;
  }

  destroy() {
    this.viewer.scene.primitives.remove(this.collection);
    this.particles = [];
  }

  /** 강도·모양이 바뀔 때 부른다 — 근접 기준 밀도를 정하고, 스프라이트를 갈아 끼운다.
   *  실제 표시 개수는 tick() 이 카메라 거리(_boxScale)에 맞춰 매번 다시 잡는다 —
   *  조감 시점에서 상자가 커진 만큼 개수도 같이 늘어야 밀도가 흐려지지 않는다. */
  setShape(shape, baseCount, imageSize, image) {
    this.baseCount = Math.max(0, Math.round(baseCount));
    this.imageSize = imageSize;
    this.image = image;
    if (shape !== this.shape) {
      this.shape = shape;
      this.scaleByDistance = shape === 'snow' ? SNOW_SCALE_BY_DISTANCE : RAIN_SCALE_BY_DISTANCE;
      for (const p of this.particles) {
        p.bb.image = image; p.bb.width = imageSize.x; p.bb.height = imageSize.y;
        p.bb.scaleByDistance = this.scaleByDistance;
        // 비→눈 전환 시 이전 낙하방향 정렬이 남아 있으면 안 된다 — 눈은
        // 화면기준 정면(회전만 자유)이어야 한다.
        if (shape === 'snow') p.bb.alignedAxis = Cesium.Cartesian3.ZERO;
      }
    }
  }

  /** 목표 개수로 풀 크기를 맞춘다 — 이미지·색 등 현재 모양 그대로. */
  _resizeTo(count) {
    count = Math.min(PRECIP_POOL_MAX, Math.max(0, count));
    while (this.particles.length > count) {
      const p = this.particles.pop();
      this.collection.remove(p.bb);
    }
    while (this.particles.length < count) {
      const bb = this.collection.add({
        image: this.image, width: this.imageSize.x, height: this.imageSize.y,
        position: Cesium.Cartesian3.ZERO, scale: 1, color: Cesium.Color.WHITE.withAlpha(0),
        scaleByDistance: this.scaleByDistance,
      });
      this.particles.push({ bb, age: Math.random() * 30, life: 1, spawned: false });
    }
  }

  /**
   * 카메라와 GP 기준점 사이 거리로 상자·밀도를 함께 키운다 — 근접(FPV)에서
   * 튜닝된 크기를 조감(트윈·지도 탭 기본 카메라)에서도 그대로 쓰면 카메라
   * 옆 작은 덩어리로만 보여 "안 내리는 비"가 된다.
   *
   * **실측(2026-09-07)**: GP 정밀지형 `focusCamera()`의 기본 조감 위치조차
   * GP 기준점에서 약 2.8km 떨어져 있다(5km 타일 전체를 담으려면 그 정도 물러나야
   * 한다) — 나눔값을 500m로 잡았더니 **기본 화면부터 최대(5배)로 고정**돼 튜닝이
   * 무의미했다. 150m(도보·FPV) 이내는 원래 크기, 기본 조감(~2.8km)에서는
   * 중간(~2배) 정도로, 그보다 훨씬 멀어져야(7.5km+) 최대 5배에 닿게 나눔값을
   * 1500으로 올렸다.
   */
  _updateBoxScale() {
    const d = Cesium.Cartesian3.distance(this.viewer.camera.positionWC, PRECIP_REF_POINT);
    this._boxScale = Cesium.Math.clamp(d / 1500, 1, 5);
  }

  /** 매 프레임 — dtSec 은 실제 경과초(성능 타이머), 시뮬레이션 시계와 무관하다. */
  tick(dtSec) {
    if (!this.baseCount) { if (this.particles.length) this._resizeTo(0); return; }
    this._updateBoxScale();
    const scale = this._boxScale;
    // scale² 로 순수 면적비만큼 늘리면 최대(5배 상자→25배 면적) 개수가 폭발해
    // 성능이 무너진다 — 완만한 선형 증가(최대 3.4배)로 절충한다.
    this._resizeTo(Math.round(this.baseCount * (0.4 + 0.6 * scale)));
    if (!this.particles.length) return;

    const box = {
      halfX: PRECIP_BOX.halfX * scale, halfY: PRECIP_BOX.halfY * scale,
      topZ: PRECIP_BOX.topZ * scale, botZ: PRECIP_BOX.botZ * scale,
    };
    const cam = this.viewer.camera.positionWC;
    // 카메라 위치의 ENU 기저(동·북·상 단위벡터, ECEF) — 5km 남짓한 활동반경에서는
    // 프레임마다 다시 구해도 사실상 상수라, 낙하방향을 이 기저로 근사한다.
    const enu = Cesium.Transforms.eastNorthUpToFixedFrame(cam, undefined, this._basisScratch);
    const rot = Cesium.Matrix4.getMatrix3(enu, scratchRot);
    const east = Cesium.Matrix3.getColumn(rot, 0, scratchEast);
    const north = Cesium.Matrix3.getColumn(rot, 1, scratchNorth);
    const up = Cesium.Matrix3.getColumn(rot, 2, scratchUp);
    const life = Math.max(3, (box.topZ - box.botZ) / Math.max(0.3, this.fallSpeed));

    for (const p of this.particles) {
      p.age += dtSec;
      let d = p.spawned ? Cesium.Cartesian3.distance(p.bb.position, cam) : Infinity;
      if (!p.spawned || p.age > p.life || d > box.halfX * 1.6) {
        this._respawn(p, cam, enu, life, box);
        d = Cesium.Cartesian3.distance(p.bb.position, cam);
      } else {
        // 흔들림 — 매 프레임 난수를 다시 뽑으면 눈이 지글거리며 떤다(랜덤워크는
        // 자연스러운 흔들림이 아니라 노이즈로 읽힌다). 대신 각 알갱이가 자기
        // 위상(phase)을 갖는 2옥타브 사인파로 흔든다 — 진짜 낙엽·눈이 하는
        // 준주기적 팔랑임에 훨씬 가깝고, 알갱이마다 위상이 달라 한 덩어리로
        // 안 움직인다.
        const sway = Math.sin(p.age * 0.8 + p.phase) * 0.7 + Math.sin(p.age * 2.1 + p.phase * 1.7) * 0.3;
        const swayY = Math.sin(p.age * 0.65 + p.phase + 2.4) * 0.7 + Math.sin(p.age * 1.7 + p.phase * 1.3) * 0.3;
        const jx = this.windX + sway * this.jitter;
        const jy = this.windY + swayY * this.jitter;
        Cesium.Cartesian3.multiplyByScalar(east, jx * dtSec, scratchStep1);
        Cesium.Cartesian3.multiplyByScalar(north, jy * dtSec, scratchStep2);
        Cesium.Cartesian3.multiplyByScalar(up, -this.fallSpeed * p.speedMul * dtSec, scratchStep3);
        Cesium.Cartesian3.add(scratchStep1, scratchStep2, scratchStepSum);
        Cesium.Cartesian3.add(scratchStepSum, scratchStep3, scratchStepSum);
        // 반환 참조를 직접 고쳐 쓰지 않는다 — Billboard.position 은 세터를 거쳐야
        // 내부 더티 플래그가 서고 실제로 다시 그려진다. 항상 새 값을 대입한다.
        p.bb.position = Cesium.Cartesian3.add(p.bb.position, scratchStepSum, new Cesium.Cartesian3());
        // 빗줄기는 항상 화면 수직으로 서 있었다 — 실제 게임(유니티 Stretched
        // Billboard 등)은 스프라이트를 **낙하 속도 방향**에 맞춰 세운다. 바람이
        // 강하면 빗줄기가 눕는 게 보여야 진짜다. Cesium 의 대응 기능이
        // `alignedAxis`(빌보드 up 벡터가 향할 월드 방향) — 이번 프레임 이동
        // 벡터(=속도 방향)를 그대로 정규화해 넣는다. 눈은 결정형이라 방향
        // 정렬 대신 자유 회전(rotation, 아래)을 쓴다.
        if (this.shape === 'rain') {
          p.bb.alignedAxis = Cesium.Cartesian3.normalize(scratchStepSum, new Cesium.Cartesian3());
        }
      }
      // 원근 크기는 이제 손으로 안 잰다 — 빌보드에 건 scaleByDistance(위 상수
      // 정의부 주석 참고)가 실제 카메라 거리로 매 프레임 자동 계산한다.
      // 눈송이는 떨어지며 천천히 구른다 — 비는 낙하선이라 회전하면 오히려 어색하다.
      if (this.shape === 'snow') p.bb.rotation = p.age * p.rotSpeed + p.phase;
      // 수명 끝자락(마지막 12%)에서 서서히 사라진다 — 눈이 뚝 끊기면 어색하다.
      const fadeOut = 1 - Cesium.Math.clamp((p.age / p.life - 0.88) / 0.12, 0, 1);
      p.bb.color = new Cesium.Color(this.tint[0], this.tint[1], this.tint[2], this.alphaMax * fadeOut);
    }
  }

  _respawn(p, cam, enu, life, box) {
    const b = box;
    const local = Cesium.Cartesian3.fromElements(
      (Math.random() * 2 - 1) * b.halfX,
      (Math.random() * 2 - 1) * b.halfY,
      b.botZ + Math.random() * (b.topZ - b.botZ),
      scratchLocal,
    );
    Cesium.Matrix4.multiplyByPoint(enu, local, p.bb.position);
    p.age = 0;
    p.life = life * (0.85 + Math.random() * 0.3);
    p.speedMul = 0.85 + Math.random() * 0.3;
    p.phase = Math.random() * Math.PI * 2;          // 알갱이별 흔들림 위상 — 한 덩어리로 안 움직이게
    p.rotSpeed = (Math.random() * 2 - 1) * 1.4;      // 눈송이 자전 속도(rad/s), 부호도 무작위
    p.spawned = true;
  }
}
const scratchRot = new Cesium.Matrix3();
const scratchEast = new Cesium.Cartesian3();
const scratchNorth = new Cesium.Cartesian3();
const scratchUp = new Cesium.Cartesian3();
const scratchLocal = new Cesium.Cartesian3();
const scratchStep1 = new Cesium.Cartesian3();
const scratchStep2 = new Cesium.Cartesian3();
const scratchStep3 = new Cesium.Cartesian3();
const scratchStepSum = new Cesium.Cartesian3();

/**
 * 눈송이 스프라이트 — 부드러운 중심광 + 6방향 결정 축.
 * 순수한 원판이면 아무리 회전을 걸어도(PrecipField.tick) 티가 안 난다 — 결정처럼
 * 방향성이 있어야 자전이 보이고, 실제 눈송이의 6각 대칭에도 더 가깝다.
 */
function makeSnowflakeImage() {
  const c = document.createElement('canvas');
  c.width = c.height = 32;
  const ctx = c.getContext('2d');
  const cx = 16, cy = 16;
  const core = ctx.createRadialGradient(cx, cy, 0, cx, cy, 15);
  core.addColorStop(0, 'rgba(255,255,255,1)');
  core.addColorStop(0.5, 'rgba(255,255,255,0.75)');
  core.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = core;
  ctx.beginPath(); ctx.arc(cx, cy, 15, 0, Math.PI * 2); ctx.fill();

  ctx.strokeStyle = 'rgba(255,255,255,0.55)';
  ctx.lineWidth = 1.4;
  ctx.lineCap = 'round';
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const dx = Math.cos(a), dy = Math.sin(a);
    ctx.beginPath();
    ctx.moveTo(cx + dx * 3, cy + dy * 3);
    ctx.lineTo(cx + dx * 14, cy + dy * 14);
    ctx.stroke();
  }
  return c;
}

/**
 * 세로로 늘어진 스트릭 — 빗줄기(속도가 빨라 눈에는 점이 아니라 선으로 남는다).
 * 크기 상한이 걸리기 전(scaleByDistance 도입 전)엔 딱딱한 사각형이 커지면
 * "흰 각목"으로 보였다("비가 진짜 별로" 피드백의 시각적 실체 중 하나) — 크기는
 * 이제 상한이 걸렸지만, 모양 자체도 각진 사각형보다는 blur 로 가장자리를
 * 흐리고 중심에 가는 하이라이트를 넣어 실제 빗줄기의 빛 반사에 가깝게 했다.
 */
function makeRainStreakImage() {
  const c = document.createElement('canvas');
  c.width = 12; c.height = 48;
  const ctx = c.getContext('2d');
  const body = ctx.createLinearGradient(0, 0, 0, 48);
  body.addColorStop(0, 'rgba(225,235,248,0)');
  body.addColorStop(0.35, 'rgba(225,235,248,0.5)');
  body.addColorStop(0.85, 'rgba(225,235,248,0.82)');
  body.addColorStop(1, 'rgba(235,242,250,0.5)');   // 맨 아래는 옅게 — 물방울로 흩어지는 끝단
  try { ctx.filter = 'blur(1.1px)'; } catch (_) { /* 미지원 브라우저는 각진 채로 폴백 */ }
  ctx.fillStyle = body;
  ctx.fillRect(3, 2, 6, 44);
  // 가는 중심 하이라이트 — 원기둥형 빗줄기가 빛을 굴절시켜 생기는 밝은 실선.
  try { ctx.filter = 'blur(0.5px)'; } catch (_) { /* noop */ }
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.fillRect(5, 4, 2, 38);
  return c;
}

export class WeatherFx {
  /**
   * @param viewer Cesium.Viewer
   * @param opts { floorHeight: () => number }  안개가 고이는 계곡 바닥 고도(m)
   */
  constructor(viewer, opts = {}) {
    this.viewer = viewer;
    this.opts = opts;
    // 렌더 파수꾼에게 「이 단계는 죽으면 걷어내도 된다」고 알려 둘 통로
    this.guard = opts.renderGuard ?? null;
    this.fogStage = null;
    this.flashStage = null;   // 번개 — 화면 전체가 순간 밝아지는 포스트프로세스
    this.lensStage = null;    // 렌즈 물방울 — 비 올 때 카메라에 맺혀 흐르는 효과
    this.godrayStage = null;  // 크레퓨스큘러 광선(태양 방향 방사 블러)
    this.kind = 'none';
    this.terrainMode = 'none';
    this._failed = { fog: false, precip: false, lightning: false, lens: false, godray: false };
    this._snowImg = null; this._rainImg = null;   // 캔버스 스프라이트, 1회 생성 재사용
    this._precipField = null;   // PrecipField — 지연 생성(강수가 처음 필요해질 때)
    this._precipShape = null;   // 'snow' | 'rain' — 지금 켜져 있는 스프라이트 모양
    this._lastState = null;     // 마지막 apply(state) — 실시간 틱이 폭풍 여부를 읽는다
    this._lightningFlash = 0;   // 지금 밝기(0~1, 감쇠)
    this._lightningTimer = 6 + Math.random() * 10;   // 다음 번개까지 남은 초
    this._lightningPending = 0; // 예약된 2차 섬광까지 남은 초(겹쳐 치는 자연스러움)
    // 표면 젖음 — 실제 강수 세기를 그대로 uniform 에 꽂으면 날씨를 바꾸는 순간
    // 즉시 흠뻑 젖거나 즉시 바짝 마른다. 실제 젖음(웅덩이·표면장력)은 지속시간에
    // 따라 서서히 고이고, 훨씬 천천히 마른다 — 그 물리적 시차(hysteresis)를
    // 흉내 낸 값을 surfaceWeather 셰이더(environment.ts)에 대신 공급한다.
    this.wetnessAccum = 0;
    this._wetnessTarget = 0;
    this._lensT0 = performance.now();
    this._lastPumpT = performance.now();
    // 강수·번개·렌즈 물방울은 실제 경과시간(wall-clock)으로 움직여야 한다 — 씬의
    // 시뮬레이션 시계는 시간·계절 슬라이더 조종을 위해 멈춰 있다(PrecipField
    // 클래스 주석 참고).
    this._pump = viewer.scene.preRender.addEventListener(() => {
      const now = performance.now();
      const dtSec = Math.min(0.25, (now - this._lastPumpT) / 1000);
      this._lastPumpT = now;
      this._precipField?.tick(dtSec);
      this._tickLightning(dtSec);
      this._tickWetness(dtSec);
      this._tickGodrays();
      if (this.lensStage?.enabled) this.lensStage.uniforms.uTime = (now - this._lensT0) / 1000;
    });
  }

  /** 젖음 누적 — 비를 맞은 만큼 서서히 고이고, 갠 뒤에는 그보다 훨씬 느리게 마른다. */
  _tickWetness(dtSec) {
    const RISE = 0.05;    // 초당 최대 상승 — 완전히 젖는 데 대략 20여 초
    const DECAY = 0.012;  // 초당 최대 하강 — 마르는 덴 그 4배 넘게 걸린다
    if (this.wetnessAccum < this._wetnessTarget) {
      this.wetnessAccum = Math.min(this._wetnessTarget, this.wetnessAccum + RISE * dtSec);
    } else {
      this.wetnessAccum = Math.max(this._wetnessTarget, this.wetnessAccum - DECAY * dtSec);
    }
  }

  destroy() {
    this._pump?.();
    const stages = this.viewer.scene.postProcessStages;
    if (this.fogStage) stages.remove(this.fogStage);
    if (this.flashStage) stages.remove(this.flashStage);
    if (this.lensStage) stages.remove(this.lensStage);
    if (this.godrayStage) stages.remove(this.godrayStage);
    this._precipField?.destroy();
    this.fogStage = null;
    this.flashStage = null;
    this.lensStage = null;
    this.godrayStage = null;
    this._precipField = null;
  }

  /** 지형분석 표출이 켜지면 적설 머티리얼은 양보한다 (운용자가 명시적으로 고른 것). */
  setTerrainMode(mode) {
    this.terrainMode = mode;
  }

  /** 환경 상태 하나로 안개·강수·적설을 한 번에 맞춘다. */
  apply(state) {
    if (!state) return;
    this._lastState = state;   // 실시간 틱(_tickLightning)이 폭풍 여부를 읽는 참조
    this._wetnessTarget = state.ground.wetness;   // 실제 값은 _tickWetness 가 서서히 뒤쫓는다
    this._applyFog(state);
    this._applyPrecipitation(state);
    this._applyGroundSnow(state);
    this._applyLensDroplets(state);
  }

  // ── 렌즈 물방울 ───────────────────────────────────────────────────────────

  /**
   * 3D 알갱이(PrecipField)는 "저 너머 내리는 비"이고, 이 렌즈 물방울은 "지금 내
   * 카메라 앞에 맺힌 비"라는 의도였다.
   *
   * **끔(2026-09-07, 사용자 실사용 피드백)**: 이 앱의 기본 시점은 대부분 GP 능선
   * 전체를 조감하는 지도·트윈 탭 카메라다 — 창이나 조준경 유리 너머로 보는
   * POV 가 아니다. 그런 카메라에 "유리에 맺힌 물방울"을 얹으면 서사적으로도
   * 맞지 않고, 스크린UV 격자(gridA)가 화면 폭의 1/10~1/4 을 차지해 화면을
   * 뒤덮는 두꺼운 줄무늬로 보인다 — 실측 uIntensity 0.64(강수 50%)에서 정확히
   * 이 화면 지배 문제가 재현됨. 반면 진짜 3D 강수(PrecipField)는 scaleByDistance
   * 로 화면 1.8×25px 남짓의 제 크기를 지킨다. 사용자가 "눈처럼 3D map 위에서
   * 오게 해달라, 화면 위 HUD만 올리는 게 아니라"고 정확히 이 문제를 지적 —
   * 그래서 활성화를 껐다(target 을 항상 0으로). 셰이더 코드는 남겨 둔다 — 실제
   * FPV/도보/타워 캐빈처럼 유리·조준경이 있는 1인칭 시점에 한해서만 켜는
   * 조건부 재도입은 여지가 있다(그때는 이 텍스트를 없앨 것).
   */
  _applyLensDroplets(_state) {
    if (this._failed.lens) return;
    const target = 0;   // 항상 끔 — 위 주석 참고. LENS_FS 셰이더 자체는 그대로 둠.

    if (target <= 0.003) {
      if (this.lensStage) this.lensStage.enabled = false;
      return;
    }
    if (!this.lensStage) {
      try {
        this.lensStage = this.viewer.scene.postProcessStages.add(new Cesium.PostProcessStage({
          name: 'gp_lens_droplets',
          fragmentShader: LENS_FS,
          uniforms: { uTime: 0, uIntensity: 0 },
        }));
        this.guard?.register('렌즈 물방울', this.lensStage, () => {
          this.lensStage = null;
          this._failed.lens = true;
        });
      } catch (error) {
        console.warn('렌즈 물방울 단계 생성 실패 — 표현 없음', error);
        this._failed.lens = true;
        return;
      }
    }
    this.lensStage.enabled = true;
    this.lensStage.uniforms.uIntensity = target;
  }

  // ── 안개 ──────────────────────────────────────────────────────────────────

  _applyFog(state) {
    if (this._failed.fog) return;
    const floor = this.opts.floorHeight?.() ?? 0;
    const p = fogProfile(state, floor);

    // Cesium 내장 안개는 지형 LOD 완화용으로만 남긴다 — 보이는 소광은 아래 단계가 전담.
    const fog = this.viewer.scene.fog;
    fog.enabled = true;
    fog.density = p.cesiumDensity;

    if (!this.fogStage) {
      try {
        this.fogStage = this.viewer.scene.postProcessStages.add(new Cesium.PostProcessStage({
          name: 'gp_fog_depth',
          fragmentShader: FOG_FS,
          uniforms: {
            uFogColor: new Cesium.Cartesian3(0.8, 0.85, 0.9),
            uBeta: 1.3e-4, uResidual: 1.3e-4, uTopHeight: 20000, uFeather: 3000,
            uMaxOpacity: 0.3, uSkyBlend: 0,
          },
        }));
        this.guard?.register('깊이 안개', this.fogStage, () => {
          // 파수꾼이 걷어냈다 — 다시 얹지 않고 Cesium 내장 안개로 되돌린다
          this.fogStage = null;
          this._failed.fog = true;
          this.viewer.scene.fog.density = Math.min(p.betaPerMeter, 6e-3);
        });
      } catch (error) {
        // 셰이더가 컴파일되지 않으면 안개 효과만 포기한다. 앱은 계속 돈다.
        console.warn('깊이 인식 안개 단계 생성 실패 — Cesium 내장 안개로 대체', error);
        this._failed.fog = true;
        fog.density = Math.min(p.betaPerMeter, 6e-3);
        return;
      }
    }
    const u = this.fogStage.uniforms;
    u.uFogColor = new Cesium.Cartesian3(p.color[0], p.color[1], p.color[2]);
    u.uBeta = p.betaPerMeter;
    u.uResidual = p.residualBetaPerMeter;
    u.uTopHeight = p.topHeightM;
    u.uFeather = p.featherM;
    u.uMaxOpacity = p.maxOpacity;
    u.uSkyBlend = p.skyBlend;
  }

  // ── 강수: 실제 3D 알갱이 밭 ───────────────────────────────────────────────

  _applyPrecipitation(state) {
    if (this._failed.precip) return;
    const p = precipitationProfile(state);
    this.kind = p.kind;

    if (p.kind === 'none' || p.layers.length < 3) {
      if (this._precipField) this._precipField.setShape(this._precipShape, 0, { x: 1, y: 1 }, this._snowImg);
      return;
    }

    if (!this._precipField) {
      // BillboardCollection 은 커스텀 GLSL 이 아니라 Cesium 표준 프리미티브라
      // fogStage 처럼 첫 렌더에서 컴파일 실패가 나는 부류가 아니다 — 여기 try/catch
      // 만으로 충분하고 renderGuard 등록은 필요 없다.
      try {
        this._precipField = new PrecipField(this.viewer);
      } catch (error) {
        console.warn('강수 파티클 생성 실패 — 강수 표현 없음', error);
        this._failed.precip = true;
        return;
      }
    }

    const shape = p.snowiness >= 0.5 ? 'snow' : 'rain';
    this._precipShape = shape;
    const image = shape === 'snow'
      ? (this._snowImg ??= makeSnowflakeImage())
      : (this._rainImg ??= makeRainStreakImage());
    // 화면 기본 픽셀 크기 — 원근에 따른 축소는 PrecipField.tick 이 거리로 다시 곱한다.
    const imageSize = shape === 'snow' ? new Cesium.Cartesian2(18, 18) : new Cesium.Cartesian2(3, 42);

    // 세기(강수율)는 낙하 속도가 아니라 밀도(개체수)로만 나타낸다 — 약한 비라고
    // 빗방울이 천천히 떨어지진 않는다, 드문드문 떨어질 뿐이다.
    const maxCount = shape === 'snow' ? PRECIP_BASE_MAX : Math.round(PRECIP_BASE_MAX * 0.6);
    const count = Math.round(Cesium.Math.lerp(maxCount * 0.12, maxCount, p.strength));
    this._precipField.setShape(shape, count, imageSize, image);

    // 종단속도(m/s) — 실제 물리값(눈 1.2~2, 비 8~11).
    this._precipField.fallSpeed = Cesium.Math.lerp(9.5, 1.6, p.snowiness);

    // 바람 — lean 은 이미 tanh 로 부드럽게 클램프된 값. 고정 방위(300°, GP 능선의
    // 우세 계절풍 방향 근사)로 눕히고, 눈이 비보다 훨씬 크게 흔들린다.
    const bearing = Cesium.Math.toRadians(300);
    this._precipField.windX = Math.sin(bearing) * p.lean * 0.9 * this._precipField.fallSpeed;
    this._precipField.windY = Math.cos(bearing) * p.lean * 0.9 * this._precipField.fallSpeed;
    this._precipField.jitter = Cesium.Math.lerp(0.15, 1.2, p.snowiness);

    this._precipField.tint = [p.tint[0], p.tint[1], p.tint[2]];
    this._precipField.alphaMax = 0.35 + 0.55 * p.strength;
  }

  // ── 적설 ──────────────────────────────────────────────────────────────────

  _applyGroundSnow(state) {
    const p = groundSnowProfile(state);
    setGroundSnow(this.viewer, this.terrainMode === 'none' ? p : { ...p, cover: 0 });
  }

  // ── 번개 ──────────────────────────────────────────────────────────────────

  /**
   * 실시간(wall-clock) 틱 — 폭풍 조건(비·강한 강수·짙은 구름)에서 무작위 간격으로
   * 섬광을 터뜨리고 빠르게 감쇠시킨다. 30% 확률로 2차 섬광을 예약해 실제 번개의
   * 겹쳐 치는 깜빡임을 흉내 낸다. `_lastState`(마지막 apply() 상태)만 읽고, 씬
   * 조명 자체는 건드리지 않는다 — 화면 끝단 덧셈 포스트프로세스로만 표현한다.
   * 새 섬광이 시작되는 그 순간(1차·예약된 2차 모두)에만 `opts.onLightning`을
   * 불러 `environmentAudio.ts`가 천둥을 붙일 수 있게 한다 — 매 프레임 부르면
   * 감쇠 중에도 계속 불려 번개 한 번에 천둥이 여러 번 울린다.
   */
  _tickLightning(dtSec) {
    if (this._failed.lightning) return;
    const w = this._lastState?.weather;
    const stormy = !!w && w.precipitation === 'rain'
      && w.precipitationRateMmPerHour > 9 && w.cloudCover > 0.82;

    this._lightningTimer -= dtSec;
    if (stormy && this._lightningTimer <= 0) {
      this._lightningFlash = 0.55 + Math.random() * 0.35;
      this._lightningTimer = 5 + Math.random() * 16;
      if (Math.random() < 0.3) this._lightningPending = 0.08 + Math.random() * 0.1;
      this.opts.onLightning?.(this._lightningFlash);
    } else if (!stormy) {
      // 날씨가 갰다 — 다음 번개까지 다시 넉넉히 기다리게 해 갬과 동시에 치지 않게.
      this._lightningTimer = Math.max(this._lightningTimer, 6);
    }
    if (this._lightningPending > 0) {
      this._lightningPending -= dtSec;
      if (this._lightningPending <= 0) {
        this._lightningPending = 0;
        this._lightningFlash = Math.max(this._lightningFlash, 0.45 + Math.random() * 0.3);
        this.opts.onLightning?.(this._lightningFlash);
      }
    }
    // 빠른 감쇠 — 실제 번개 섬광은 한순간이다.
    this._lightningFlash = Math.max(0, this._lightningFlash - dtSec * 3.4);

    if (this._lightningFlash <= 0.002) {
      if (this.flashStage) this.flashStage.enabled = false;
      return;
    }
    if (!this.flashStage) {
      try {
        this.flashStage = this.viewer.scene.postProcessStages.add(new Cesium.PostProcessStage({
          name: 'gp_lightning_flash',
          fragmentShader: FLASH_FS,
          uniforms: { uFlash: 0 },
        }));
        this.guard?.register('번개 섬광', this.flashStage, () => {
          this.flashStage = null;
          this._failed.lightning = true;
        });
      } catch (error) {
        console.warn('번개 섬광 단계 생성 실패 — 번개 표현 없음', error);
        this._failed.lightning = true;
        return;
      }
    }
    this.flashStage.enabled = true;
    this.flashStage.uniforms.uFlash = this._lightningFlash;
  }

  // ── 갓레이 ─────────────────────────────────────────────────────────────────

  /**
   * 태양의 화면좌표를 매 프레임 다시 구해 GODRAY_FS 에 넘긴다. 이 틱은
   * `preRender` 리스너 안에서 매 프레임 불리므로, 어디서든 예외가 나면 그
   * 리스너 자체가 죽을 위험이 있다 — 전부 try/catch 로 감싼다(GLSL 컴파일
   * 실패만 renderGuard 대상이고, 여기 JS 로직 실패는 그냥 이번 프레임 갓레이를
   * 끄는 것으로 충분하다).
   */
  _tickGodrays() {
    if (this._failed.godray) return;
    try {
      const s = this._lastState;
      const scene = this.viewer.scene;
      const sunUp = s?.sun?.aboveHorizon;
      const strength = sunUp ? Cesium.Math.clamp(s.light.sunIntensity / 3.35, 0, 1) : 0;
      const dir = scene.light?.direction;
      if (!s || strength <= 0.02 || !dir) { this._disableGodrays(); return; }

      // scene.light.direction 은 광선 진행방향(태양→지면) — 태양 자체는 그 반대편.
      const toSun = Cesium.Cartesian3.negate(dir, new Cesium.Cartesian3());
      const camera = this.viewer.camera;
      // 카메라가 태양 쪽을 보고 있지 않으면(등지거나 옆을 보면) 끈다 — 이 기법
      // 자체의 알려진 한계("빛을 바라볼 때만 유효")를 그대로 인정한다.
      if (Cesium.Cartesian3.dot(camera.direction, toSun) <= 0.05) { this._disableGodrays(); return; }

      const sunFar = Cesium.Cartesian3.add(
        camera.positionWC, Cesium.Cartesian3.multiplyByScalar(toSun, 3.0e5, new Cesium.Cartesian3()),
        new Cesium.Cartesian3(),
      );
      const win = Cesium.SceneTransforms.worldToWindowCoordinates(scene, sunFar);
      const canvas = scene.canvas;
      if (!win || !canvas.clientWidth || !canvas.clientHeight) { this._disableGodrays(); return; }
      const u = win.x / canvas.clientWidth;
      const v = 1.0 - win.y / canvas.clientHeight;   // 셰이더 UV 는 아래가 0
      if (u < -0.3 || u > 1.3 || v < -0.3 || v > 1.3) { this._disableGodrays(); return; }

      if (!this.godrayStage) {
        this.godrayStage = scene.postProcessStages.add(new Cesium.PostProcessStage({
          name: 'gp_godrays',
          fragmentShader: GODRAY_FS,
          uniforms: { uLightUV: new Cesium.Cartesian2(0.5, 0.5), uIntensity: 0 },
        }));
        this.guard?.register('갓레이', this.godrayStage, () => {
          this.godrayStage = null;
          this._failed.godray = true;
        });
      }
      this.godrayStage.enabled = true;
      this.godrayStage.uniforms.uLightUV = new Cesium.Cartesian2(u, v);
      // 안개·흐림은 오히려 빛줄기를 더 또렷하게 만든다(산란매질) — 맑은 날엔 은은하게.
      const haze = Cesium.Math.clamp(s.weather.cloudCover + (1 - s.weather.visibilityMeters / 20000), 0, 1);
      this.godrayStage.uniforms.uIntensity = strength * (0.4 + 0.6 * haze) * 0.22;
    } catch (error) {
      if (!this._failed.godray) console.warn('갓레이 틱 실패 — 이후 비활성화', error);
      this._failed.godray = true;
      this._disableGodrays();
    }
  }

  _disableGodrays() {
    if (this.godrayStage) this.godrayStage.enabled = false;
  }
}
