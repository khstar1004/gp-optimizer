/**
 * 날씨 묘사 제원 — 환경 상태에서 「어떻게 보일지」의 수치를 뽑아낸다.
 *
 * 셰이더와 분리한 이유가 있다. GLSL 은 눈으로만 검증되는데, 눈·비·안개가
 * 실감나느냐를 실제로 정하는 것은 셰이더 문법이 아니라 **여기 나오는 숫자들**이다 —
 * 안개층이 얼마나 두껍고 어느 높이에서 옅어지는가, 눈송이가 몇 겹으로 얼마나
 * 빠르게 떨어지는가, 바람이 그것을 얼마나 눕히는가. 그 수치를 순수 함수로 빼두면
 * 화면 없이도 시험할 수 있고, 셰이더에는 uniform 을 나르는 일만 남는다.
 *
 * 입력은 `environmentModel.environmentState()` 결과 하나뿐이다. 여기서 날씨를
 * 다시 판단하지 않는다 — 무엇이 내리는지(비/눈/진눈깨비)와 몇 mm/h 인지, 가시거리가
 * 몇 m 인지는 이미 모델이 정했고, 이 모듈은 그것을 그림으로 옮기기만 한다.
 */

import { clamp, clamp01 } from './mathUtils';

const lerp = (a: number, b: number, t: number) => a + (b - a) * clamp01(t);

export type PrecipKind = 'none' | 'rain' | 'snow' | 'sleet';

export type PrecipLayer = {
  /** 이 층이 카메라에서 몇 m 앞에 있다고 볼 것인가 — 가림 판정의 기준. */
  distanceM: number;
  /** 화면을 가로지르는 셀 수. 멀수록 촘촘하다(= 작게 보인다). */
  cellScale: number;
  /** 화면 좌표계 낙하 속도. 가까울수록 빠르게 지나간다. */
  fallSpeed: number;
  /** 셀 안에서 알갱이 반지름. 가까울수록 크다. */
  radius: number;
  /** 이 층의 기여도. */
  opacity: number;
};

export type PrecipProfile = {
  kind: PrecipKind;
  /** 0 비 · 1 눈 · 0.5 진눈깨비 — 셰이더가 줄기↔알갱이를 섞는 계수. */
  snowiness: number;
  /** 강수율에서 온 세기 0~1. 버튼이 아니라 mm/h 가 정한다. */
  strength: number;
  /** 바람이 낙하를 눕히는 정도(부호 포함). */
  lean: number;
  /** 알갱이 색 (sRGB 0~1). */
  tint: readonly [number, number, number];
  layers: PrecipLayer[];
};

export type FogProfile = {
  /** 안개층 내부의 Koschmieder 소광계수, m⁻¹. 모델이 준 값 그대로. */
  betaPerMeter: number;
  /** 안개 위 맑은 공기의 소광 — 0 이 아니다. 원경은 언제나 조금 옅다. */
  residualBetaPerMeter: number;
  /** 안개 상단 고도(m). 역전층 뚜껑. */
  topHeightM: number;
  /** 상단이 얼마나 뚜렷한가(m). 복사안개의 윗면은 놀랄 만큼 날카롭다. */
  featherM: number;
  /** 완전 백색으로 지워지지 않게 하는 상한. */
  maxOpacity: number;
  /** 두꺼운 안개는 하늘도 지운다 (0~1). */
  skyBlend: number;
  color: readonly [number, number, number];
  /** Cesium 자체 안개에 넘길 값 — 눈에 보이는 소광이 아니라 지형 LOD 완화용. */
  cesiumDensity: number;
};

export type GroundSnowProfile = {
  /** 0~1 적설 피복률. */
  cover: number;
  /** 이 경사(도)까지는 거의 그대로 쌓인다. */
  holdSlopeDeg: number;
  /** 이 경사를 넘으면 눈이 붙지 않는다. */
  shedSlopeDeg: number;
  color: readonly [number, number, number];
};

// ── 안개 ────────────────────────────────────────────────────────────────────

/**
 * 안개는 균질한 안개상자가 아니라 **뚜껑이 덮인 층**이다.
 *
 * 이 데모가 안개를 실감나게 못 그렸던 진짜 이유는 셰이더가 아니라 이 사실을
 * 무시한 데 있다. Cesium 내장 안개는 거리에만 반응하므로 능선 위 GP 에서도
 * 계곡 바닥에서도 똑같이 뿌옇다. 실제 계곡 복사안개는 바닥에 고여 있고 두께가
 * 60~250m 이며, 능선 초소는 **안개 바다 위로 머리를 내민다**. 그 그림이 나와야
 * 「지금 계곡은 안 보이고 대안 능선은 보인다」가 화면에서 읽힌다.
 *
 * 감쇠를 지수로 두면 안 된다 — 지수는 끝나지 않아서, 안개 위 200m 에서도
 * 10% 짜리 안개가 남고 1km 를 보면 그것만으로 불투명해진다. 실제 복사안개의
 * 윗면은 역전층이 만든 **뚜껑**이고 놀랄 만큼 날카롭다. 그래서 상단 고도와
 * 그 날카로움(feather)으로 모델링하고, 그 위는 맑은 공기의 잔류 소광만 남긴다.
 *
 * @param state       environmentState() 결과
 * @param floorHeightM 안개가 고이는 바닥(계곡) 고도 — GP 지반고가 아니다
 */
export function fogProfile(state: any, floorHeightM: number): FogProfile {
  const weather = state.weather.id as string;
  const intensity = clamp01(state.weather.intensity);
  const beta = state.weather.fogDensityPerMeter as number;
  /** 맑은 공기(가시거리 30km)의 소광 — 안개 위에도 이만큼은 남는다. */
  const CLEAR_AIR = 3.912 / 30000;

  // 안개층 깊이. 60m(옅은 아침 안개) ~ 240m(짙은 밤 안개). GP-107 은 계곡을
  // 220m 감제하므로, 중간 세기에서는 능선이 안개 위에 있고 최대 세기에서는
  // 초소까지 잠긴다 — 둘 다 실제로 일어나는 일이고, 슬라이더로 둘 다 볼 수 있다.
  const depthM = lerp(60, 240, intensity);
  const isFog = weather === 'fog';

  const topHeightM = isFog ? floorHeightM + depthM : floorHeightM + 20000;
  const featherM = isFog ? 35 : 3000;
  // 안개만 뚜껑을 갖는다. 강수·연무는 시야 전체를 고르게 채우므로 잔류값이
  // 곧 본값이고, 고도 구조는 사실상 보이지 않는다.
  const residualBetaPerMeter = isFog ? CLEAR_AIR : beta;

  // 상한. 짙은 안개는 정말로 아무것도 안 보여야 하고, 맑은 날의 원경은
  // 지워지는 대신 옅어지기만 해야 한다.
  const maxOpacity = weather === 'fog'
    ? lerp(0.82, 0.98, intensity)
    : weather === 'snow'
      ? lerp(0.55, 0.9, intensity)
      : weather === 'rain'
        ? lerp(0.5, 0.85, intensity)
        : weather === 'overcast'
          ? lerp(0.35, 0.6, intensity)
          : lerp(0.18, 0.42, intensity);

  // 하늘. 가시거리가 1km 아래로 떨어지면 하늘도 같은 회색이 된다.
  const skyBlend = clamp01(1 - (state.weather.visibilityMeters as number) / 2500) * maxOpacity;

  // Cesium 자체 안개는 지형 타일 LOD 를 느슨하게 해 주는 값으로만 남긴다.
  // 눈에 보이는 소광은 깊이 인식 포스트프로세스가 전담한다 — 내장 안개는
  // 지구 표면에만 걸려서 타워·건물·인원은 또렷하게 남고, 그 불일치가 가짜로 읽힌다.
  const cesiumDensity = clamp(beta * 0.28, 5e-5, 1.0e-3);

  return {
    betaPerMeter: beta,
    residualBetaPerMeter,
    topHeightM,
    featherM,
    maxOpacity,
    skyBlend,
    color: state.sky.fogColor,
    cesiumDensity,
  };
}

// ── 강수 ────────────────────────────────────────────────────────────────────

/** 이 강수율이면 최대 세기로 본다 (mm/h 액체환산). */
const RATE_FULL: Record<Exclude<PrecipKind, 'none'>, number> = { rain: 18, snow: 7, sleet: 10 };

/**
 * 눈·비의 겹 구조.
 *
 * 한 겹짜리 화면 노이즈가 가짜로 보이는 이유는 두 가지다 — 모든 알갱이가 같은
 * 크기·같은 속도로 움직이고(시차가 없다), 앞에 무엇이 있든 그 위에 그려진다
 * (캐빈 유리 안에서도 눈이 내린다). 그래서 층마다 **명목 거리**를 준다:
 * 셰이더는 그 거리보다 앞에 지형·건물이 있으면 그 층을 그리지 않는다.
 */
export function precipitationProfile(state: any): PrecipProfile {
  const kind = state.weather.precipitation as PrecipKind;
  const rate = state.weather.precipitationRateMmPerHour as number;
  const windMps = state.weather.windMps as number;

  if (kind === 'none' || rate <= 0) {
    return { kind: 'none', snowiness: 0, strength: 0, lean: 0, tint: [0, 0, 0], layers: [] };
  }

  const snowiness = kind === 'snow' ? 1 : kind === 'sleet' ? 0.5 : 0;
  const strength = clamp01(rate / RATE_FULL[kind]);

  // 바람이 낙하를 눕힌다. 눈은 종단속도가 1 m/s 남짓이라 같은 바람에도 훨씬 크게
  // 밀리고, 빗줄기는 8~9 m/s 로 떨어져 잘 눕지 않는다.
  //
  // 다만 화면 위 기울기는 실제 낙하각의 탄젠트 그대로가 아니다 — 바람의 절반쯤은
  // 시선 앞뒤로 불어 화면에서는 기울기로 보이지 않는다. 0.5 가 그 몫이고, 이걸
  // 빼면 산들바람에도 눈이 옆으로 날아간다.
  //
  // 상한은 하드 클램프가 아니라 tanh 로 부드럽게 준다. 눈은 종단속도가 워낙
  // 느려서 6 m/s 만 불어도 클램프에 붙어버리고, 그러면 풍속 슬라이더가 그 위로는
  // 아무것도 하지 않는다 — 풍속 6 과 18 이 같은 그림이면 조종이 거짓말을 한다.
  const LEAN_MAX = 1.6;
  const terminalMps = lerp(9, 1.2, snowiness);
  const raw = (windMps / terminalMps) * 0.5;
  const lean = LEAN_MAX * Math.tanh(raw / LEAN_MAX);

  // 눈은 하늘빛을 받아 푸르스름한 흰색, 비는 더 어둡고 푸르다.
  const tint: readonly [number, number, number] = snowiness > 0.5
    ? [0.96, 0.975, 1.0]
    : snowiness > 0 ? [0.85, 0.89, 0.95] : [0.62, 0.70, 0.82];

  // 낙하 속도는 실제 종단속도를 화면 속도로 옮긴 것 — 눈은 흩날리고 비는 긋는다.
  const speedBase = lerp(1.9, 0.42, snowiness);

  // 가까운 층일수록 크고 빠르고 성기다. 먼 층일수록 작고 느리고 촘촘하다.
  const layers: PrecipLayer[] = [
    { distanceM: 90, cellScale: 46, fallSpeed: speedBase * 0.45, radius: 0.055, opacity: 0.55 },
    { distanceM: 26, cellScale: 20, fallSpeed: speedBase * 0.85, radius: 0.085, opacity: 0.75 },
    { distanceM: 7, cellScale: 8.5, fallSpeed: speedBase * 1.7, radius: 0.135, opacity: 1.0 },
  ].map((layer) => ({
    ...layer,
    // 약한 강수에서는 가까운(큰) 알갱이부터 사라진다 — 이슬비에 함박눈이
    // 날리면 그것대로 거짓말이다.
    opacity: layer.opacity * lerp(layer.distanceM < 12 ? 0.25 : 0.6, 1, strength),
    radius: layer.radius * lerp(0.7, 1.15, strength),
  }));

  return { kind, snowiness, strength, lean, tint, layers };
}

// ── 적설 ────────────────────────────────────────────────────────────────────

/**
 * 땅에 쌓인 눈.
 *
 * 위성영상을 통째로 밝히고 탈색하는 것만으로는 절벽까지 하얘진다. 눈은 급사면에
 * 붙지 않는다 — 그래서 경사로 걸러야 하고, 그러면 능선·암벽이 검게 남아 지형이
 * 오히려 또렷해진다. 기동 판단(견인력)과도 같은 이야기를 하게 된다.
 */
export function groundSnowProfile(state: any): GroundSnowProfile {
  const cover = clamp01(state.ground.snowCover);
  // 눈 그림자색은 순백이 아니라 그 시각 하늘빛을 받는다 — 새벽 적설은 푸르다.
  const sky = state.light.skyColor as readonly [number, number, number];
  const color: readonly [number, number, number] = [
    lerp(sky[0], 1, 0.72), lerp(sky[1], 1, 0.72), lerp(sky[2], 1, 0.76),
  ];
  return { cover, holdSlopeDeg: 32, shedSlopeDeg: 58, color };
}
