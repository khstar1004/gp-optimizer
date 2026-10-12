// @ts-nocheck
/**
 * 환경 모델 — 시간·계절·날씨를 계산해서 내놓는 단일 진입점.
 *
 * 이식 원본: ufs-physical-ai-operations-repo `app/environment-model.ts`
 *   (디지털트윈 메인화면 `ops-console.tsx` 의 「환경 · 시간 · 계절 · 날씨」 패널이
 *    읽는 바로 그 모듈). 타입만 벗겨낸 1:1 포팅이며 상수·산식은 손대지 않았다.
 *
 * 들어가는 것은 둘 뿐이다 — **어디인가**(위경도·시간대)와 **언제인가**(연중일자·분).
 * 그 밖의 모든 것(태양 위치·하늘 색·안개 농도·조도·임무 영향)은 계산되어 나온다.
 *
 *   sun position  ← NOAA Solar Calculator (equation of time + declination)
 *   sky palette   ← 시계 시각이 아니라 **태양 고도**로 보간 — 박명이 이 위도의
 *                   실제 태양 위치에 걸린다
 *   fog density   ← Koschmieder, β = 3.912 / V (가시거리 m)
 *   illuminance   ← 고도 기반, 박명 구간은 log lux 보간 + 월광 바닥값.
 *                   EO 카메라가 쓸만한지 열영상으로 넘어가야 하는지를 가르는 수치.
 *
 * **방법(published)과 우리 보정(calibration)은 일부러 분리돼 있다.** 태양 위치·
 * 균시차·Koschmieder 관계는 공표된 것이며 재조정하면 안 된다. 팔레트·일교차·
 * 기동/비행 계수는 우리 것이다. 아래 섹션 헤더를 보고, 그 경계를 넘겨 상수를
 * 옮기지 말 것.
 *
 * 순수 함수만 있고 Cesium 을 모른다. 씬에 바르는 쪽은 `environment.js`.
 */

// ── 운용자 문구 ─────────────────────────────────────────────────────────────

export const WEATHER_LABELS = {
  clear: '맑음',
  cloudy: '구름 조금',
  overcast: '흐림',
  rain: '비',
  snow: '눈',
  fog: '안개',
};

export const SEASON_LABELS = {
  spring: '봄',
  summer: '여름',
  autumn: '가을',
  winter: '겨울',
};

export const DAYLIGHT_PHASE_LABELS = {
  night: '야간',
  astronomical: '천문박명',
  nautical: '항해박명',
  civil: '시민박명 (BMNT/EENT)',
  golden: '일출·일몰',
  day: '주간',
};

export const WEATHER_ORDER = ['clear', 'cloudy', 'overcast', 'rain', 'snow', 'fog'];

/**
 * 시작 환경.
 *
 * "지금"이 아니라 상수다 — 첫 렌더에서 시계를 읽으면 상태가 새로고침마다 흔들린다.
 */
export const DEFAULT_ENVIRONMENT = {
  dayOfYear: 240,
  minuteOfDay: 600,
  weather: 'clear',
  intensity: 0.5,
  windMps: 3,
};

// ── 작은 수학 ───────────────────────────────────────────────────────────────

import { clamp, clamp01, lerp } from './mathUtils';
export { clamp01 };

const DEG = Math.PI / 180;

/** Hermite ease — 지형 셰이더가 쓰는 것과 같은 것. */
function smoothstep(edge0, edge1, value) {
  if (edge1 === edge0) return value < edge0 ? 0 : 1;
  const t = clamp01((value - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
}

export function hexToRgb(hex) {
  return [((hex >> 16) & 0xff) / 255, ((hex >> 8) & 0xff) / 255, (hex & 0xff) / 255];
}

export function rgbToHex(rgb) {
  const channel = (value) => Math.round(clamp01(value) * 255);
  return (channel(rgb[0]) << 16) | (channel(rgb[1]) << 8) | channel(rgb[2]);
}

export function rgbToCss(rgb) {
  return `#${rgbToHex(rgb).toString(16).padStart(6, '0')}`;
}

export function mixRgb(a, b, t) {
  const k = clamp01(t);
  return [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)];
}

/** 색을 자기 휘도 쪽으로 당긴다. 구름은 하늘에서 색조를 뺀다. */
function desaturate(rgb, amount) {
  const luma = rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
  return mixRgb(rgb, [luma, luma, luma], amount);
}

function scaleRgb(rgb, factor) {
  return [clamp01(rgb[0] * factor), clamp01(rgb[1] * factor), clamp01(rgb[2] * factor)];
}

/** 스칼라 키프레임 테이블 샘플. 키는 오름차순. */
function sampleRamp(stops, value) {
  if (value <= stops[0].at) return stops[0].color;
  const last = stops[stops.length - 1];
  if (value >= last.at) return last.color;
  for (let index = 1; index < stops.length; index += 1) {
    const upper = stops[index];
    if (value <= upper.at) {
      const lower = stops[index - 1];
      return mixRgb(lower.color, upper.color, (value - lower.at) / (upper.at - lower.at));
    }
  }
  return last.color;
}

// ── 공표된 방법: NOAA 태양 위치 ─────────────────────────────────────────────
//
// NOAA ESRL Global Monitoring Laboratory, *Solar Calculation Details*.
// 균시차·적위 급수는 그대로 인용한 것이다. 재조정 금지.

/** 연중 분율, 라디안. */
function fractionalYear(dayOfYear, hour) {
  return ((2 * Math.PI) / 365) * (dayOfYear - 1 + (hour - 12) / 24);
}

/** 균시차, 분. */
export function equationOfTimeMinutes(dayOfYear, hour = 12) {
  const g = fractionalYear(dayOfYear, hour);
  return (
    229.18
    * (0.000075
      + 0.001868 * Math.cos(g)
      - 0.032077 * Math.sin(g)
      - 0.014615 * Math.cos(2 * g)
      - 0.040849 * Math.sin(2 * g))
  );
}

/** 태양 적위, 라디안. */
export function solarDeclinationRad(dayOfYear, hour = 12) {
  const g = fractionalYear(dayOfYear, hour);
  return (
    0.006918
    - 0.399912 * Math.cos(g)
    + 0.070257 * Math.sin(g)
    - 0.006758 * Math.cos(2 * g)
    + 0.000907 * Math.sin(2 * g)
    - 0.002697 * Math.cos(3 * g)
    + 0.00148 * Math.sin(3 * g)
  );
}

/** 고도·방위각 → 지역 ENU 단위벡터 (동 +X, 상 +Y, 북 −Z). */
export function skyDirection(altitudeDeg, azimuthDeg) {
  const altitude = altitudeDeg * DEG;
  const azimuth = azimuthDeg * DEG;
  const horizontal = Math.cos(altitude);
  return {
    x: horizontal * Math.sin(azimuth),
    y: Math.sin(altitude),
    z: -horizontal * Math.cos(azimuth),
  };
}

/** 이 사이트, 이 날, 이 지방시각의 태양 위치. */
export function solarPosition(site, dayOfYear, minuteOfDay) {
  const day = wrapDayOfYear(dayOfYear);
  const minute = ((minuteOfDay % 1440) + 1440) % 1440;
  const hour = minute / 60;
  const eqTime = equationOfTimeMinutes(day, hour);
  const declination = solarDeclinationRad(day, hour);
  // NOAA: time offset (minutes) = eqtime + 4·longitude(+E) − 60·timezone.
  const timeOffset = eqTime + 4 * site.longitude - 60 * site.utcOffsetHours;
  const trueSolarTime = minute + timeOffset;
  const hourAngle = (trueSolarTime / 4 - 180) * DEG;

  const latitude = site.latitude * DEG;
  const sinAltitude = Math.sin(latitude) * Math.sin(declination)
    + Math.cos(latitude) * Math.cos(declination) * Math.cos(hourAngle);
  const altitude = Math.asin(clamp(sinAltitude, -1, 1));

  // 방위각은 정남 기준(서쪽 +)으로 구한 뒤 나침반으로 회전. atan2 라야 자정을
  // 건너도 연속이다 — arccos 형태는 부호가 뒤집혀 태양이 지평선을 옆으로 뛴다.
  const azimuthFromSouth = Math.atan2(
    Math.sin(hourAngle),
    Math.cos(hourAngle) * Math.sin(latitude) - Math.tan(declination) * Math.cos(latitude),
  );
  const azimuthDeg = ((((azimuthFromSouth / DEG) + 180) % 360) + 360) % 360;
  const altitudeDeg = altitude / DEG;
  return { altitudeDeg, azimuthDeg, direction: skyDirection(altitudeDeg, azimuthDeg) };
}

/** 태양이 자오선을 지나는 지방 분. */
export function solarNoonMinute(site, dayOfYear) {
  const day = wrapDayOfYear(dayOfYear);
  return 720 - 4 * site.longitude - equationOfTimeMinutes(day) + site.utcOffsetHours * 60;
}

/**
 * 태양 중심이 주어진 천정거리를 지나는 지방 분.
 *
 * 90.833° 가 NOAA 의 일출·일몰(태양 반지름 + 평균 굴절), 96° 가 시민박명 —
 * 작전명령서의 BMNT/EENT.
 */
export function horizonCrossings(site, dayOfYear, zenithDeg) {
  const day = wrapDayOfYear(dayOfYear);
  const declination = solarDeclinationRad(day);
  const latitude = site.latitude * DEG;
  const cosHourAngle = Math.cos(zenithDeg * DEG) / (Math.cos(latitude) * Math.cos(declination))
    - Math.tan(latitude) * Math.tan(declination);
  if (cosHourAngle > 1 || cosHourAngle < -1) {
    // 백야/극야. 38°N 에선 없지만, undefined 를 자정으로 돌려주는 건 다른 사실이다.
    return {};
  }
  const hourAngleDeg = Math.acos(cosHourAngle) / DEG;
  const noon = solarNoonMinute(site, day);
  return { rise: noon - 4 * hourAngleDeg, set: noon + 4 * hourAngleDeg };
}

function wrapDayOfYear(dayOfYear) {
  const wrapped = (((Math.round(dayOfYear) - 1) % 365) + 365) % 365;
  return wrapped + 1;
}

// ── 근사임을 밝혀두는 것: 달 ────────────────────────────────────────────────
//
// 천체력이 아니라 조명 모델이다. 삭망 위상은 그 날의 달 모양을 맞출 만큼은
// 정확하고, 위치는 달을 위상각만큼 황도를 따라 밀어낸 태양으로 취급한다 —
// 보름달은 태양 반대편, 삭은 태양 옆. 씬이 필요한 건 「밤에 빛이 어디서
// 오는가」 하나이며, 여기 값을 달 위치로 인용하면 안 된다.

const SYNODIC_MONTH_DAYS = 29.530588;
/** 기준 연도의 삭(New moon) 연중일자. */
const REFERENCE_NEW_MOON_DAY = 18;

export function moonPhase(dayOfYear) {
  const day = wrapDayOfYear(dayOfYear);
  const age = (((day - REFERENCE_NEW_MOON_DAY) % SYNODIC_MONTH_DAYS) + SYNODIC_MONTH_DAYS) % SYNODIC_MONTH_DAYS;
  return age / SYNODIC_MONTH_DAYS;
}

export function moonPosition(site, dayOfYear, minuteOfDay) {
  const phase = moonPhase(dayOfYear);
  // 달은 태양보다 위상만큼 늦으므로 기하가 아니라 시계를 민다.
  const displacedMinute = minuteOfDay + phase * 1440;
  const position = solarPosition(site, dayOfYear, displacedMinute);
  const illuminatedFraction = (1 - Math.cos(phase * 2 * Math.PI)) / 2;
  // 조명 분율만으로는 위상을 대신할 수 없다(보름 기준 대칭이라 하현을 상현으로
  // 그린다). 그래서 phase 를 위치와 함께 들려보낸다.
  return { ...position, illuminatedFraction, phase };
}

// ── 우리 보정: 계절 ─────────────────────────────────────────────────────────
//
// 천문학적 사분기가 아니라 한국 중위도 식물계절에 맞춘 것 — 산은 3월 말까지
// 헐벗었고, 단풍은 10월 셋째 주에 돌고, 첫 적설은 12월이다.

const SEASON_BOUNDS = [
  { id: 'spring', start: 60, end: 151 },
  { id: 'summer', start: 152, end: 243 },
  { id: 'autumn', start: 244, end: 334 },
  { id: 'winter', start: 335, end: 59 },
];

export function seasonAt(dayOfYear) {
  const day = wrapDayOfYear(dayOfYear);
  for (const bound of SEASON_BOUNDS) {
    const wraps = bound.start > bound.end;
    const inside = wraps ? day >= bound.start || day <= bound.end : day >= bound.start && day <= bound.end;
    if (!inside) continue;
    const span = wraps ? 365 - bound.start + bound.end + 1 : bound.end - bound.start + 1;
    const offset = wraps && day < bound.start ? 365 - bound.start + day : day - bound.start;
    return {
      id: bound.id,
      label: SEASON_LABELS[bound.id],
      progress: clamp01(offset / Math.max(1, span - 1)),
      dayOfYear: day,
    };
  }
  return { id: 'winter', label: SEASON_LABELS.winter, progress: 0, dayOfYear: day };
}

/**
 * 연중 수관 색.
 *
 * 계절 이름이 아니라 날짜에 물려 있다 — 그래야 단풍이 어느 자정에 한 칸 뛰는
 * 대신 2주에 걸쳐 번진다. 계절 조종이 슬라이더인 이유가 이것이다.
 */
const FOLIAGE_RAMP = [
  { at: 1, color: hexToRgb(0x6e6a55) },
  { at: 70, color: hexToRgb(0x7a7350) },
  { at: 105, color: hexToRgb(0x8fc65c) },
  { at: 150, color: hexToRgb(0x62a844) },
  { at: 200, color: hexToRgb(0x3f7a33) },
  { at: 255, color: hexToRgb(0x5f8a35) },
  { at: 288, color: hexToRgb(0xc8802c) },
  { at: 305, color: hexToRgb(0xb4552a) },
  { at: 330, color: hexToRgb(0x8a6a41) },
  { at: 365, color: hexToRgb(0x6e6a55) },
];

/** 착엽률 — 가지에 남아 있는 양. */
function foliageDensityAt(dayOfYear) {
  const day = wrapDayOfYear(dayOfYear);
  const leafOut = smoothstep(85, 125, day);
  const leafFall = 1 - smoothstep(292, 330, day);
  return clamp(0.34 + 0.66 * Math.min(leafOut, leafFall), 0.34, 1);
}

/**
 * 기온, °C.
 *
 * 연간 사인파(평균 11.8°C, 반진폭 13.5°C, 최난 7월 말)에 시계가 아니라 태양
 * 고도에 물린 일교차를 더한다 — 12월 오후는 같은 시각의 7월 오후와 다르게
 * 춥고, 구름은 실제로 그러하듯 일교차를 눌러 준다.
 */
function temperatureAt(dayOfYear, sunAltitudeDeg, cloudCover, latitude) {
  const day = wrapDayOfYear(dayOfYear);
  const annual = 11.8 + 13.5 * Math.cos((2 * Math.PI * (day - 208)) / 365);
  // 기준 37.5°N 대비 위도 보정, 약 0.7 °C/도.
  const latitudeShift = (37.5 - latitude) * 0.7;
  const diurnalRange = lerp(11, 4, clamp01(cloudCover));
  const solarDrive = clamp01((sunAltitudeDeg + 6) / 50);
  return annual + latitudeShift + diurnalRange * (solarDrive - 0.45);
}

// ── 우리 보정: 날씨 프리셋 ──────────────────────────────────────────────────
//
// 물리량은 `visibilityMeters` 쪽이고, 씬이 쓰는 안개 농도는 아래 Koschmieder 로
// 유도된다 — 둘이 어긋나게 편집될 수 없다. 범위는 맑은날 → 최대강도.

const WEATHER_PRESETS = {
  clear: { cloudCover: [0.02, 0.14], visibilityMeters: [30000, 22000], precipitationRate: [0, 0], gustMps: [0, 1], wetness: [0, 0] },
  cloudy: { cloudCover: [0.3, 0.62], visibilityMeters: [24000, 16000], precipitationRate: [0, 0], gustMps: [0, 2], wetness: [0, 0.05] },
  overcast: { cloudCover: [0.78, 0.98], visibilityMeters: [16000, 9000], precipitationRate: [0, 0], gustMps: [1, 3], wetness: [0.05, 0.2] },
  rain: { cloudCover: [0.82, 1], visibilityMeters: [8000, 1600], precipitationRate: [1.2, 24], gustMps: [1, 6], wetness: [0.45, 1] },
  snow: { cloudCover: [0.8, 1], visibilityMeters: [5000, 700], precipitationRate: [0.6, 9], gustMps: [1, 5], wetness: [0.1, 0.3] },
  fog: { cloudCover: [0.55, 0.9], visibilityMeters: [1200, 90], precipitationRate: [0, 0], gustMps: [0, 1], wetness: [0.3, 0.6] },
};

function presetAt(range, intensity) {
  return lerp(range[0], range[1], clamp01(intensity));
}

// ── 우리 보정: 하늘과 빛 ────────────────────────────────────────────────────
//
// 태양 고도(도)에 물린 팔레트.

const SKY_TOP_RAMP = [
  { at: -18, color: hexToRgb(0x05070f) },
  { at: -9, color: hexToRgb(0x0d1428) },
  { at: -3, color: hexToRgb(0x1d2c4f) },
  { at: 1, color: hexToRgb(0x2b3f6a) },
  { at: 6, color: hexToRgb(0x2f4f81) },
  { at: 18, color: hexToRgb(0x33547b) },
  { at: 30, color: hexToRgb(0x35597f) },
  { at: 60, color: hexToRgb(0x2f6bb0) },
];

const SKY_HORIZON_RAMP = [
  { at: -18, color: hexToRgb(0x0a1020) },
  { at: -9, color: hexToRgb(0x1e2340) },
  { at: -3, color: hexToRgb(0x6b4a63) },
  { at: 1, color: hexToRgb(0xd77a45) },
  { at: 4, color: hexToRgb(0xe6a173) },
  { at: 12, color: hexToRgb(0xc2cfd2) },
  { at: 30, color: hexToRgb(0xaec6d3) },
  { at: 60, color: hexToRgb(0xb9d3de) },
];

const SKY_GROUND_RAMP = [
  { at: -18, color: hexToRgb(0x04060a) },
  { at: -3, color: hexToRgb(0x0e1015) },
  { at: 4, color: hexToRgb(0x1a1c18) },
  { at: 30, color: hexToRgb(0x232a26) },
];

const SUN_COLOR_RAMP = [
  { at: -6, color: hexToRgb(0x2d1b2a) },
  { at: -1, color: hexToRgb(0x8f3f22) },
  { at: 2, color: hexToRgb(0xff8a3c) },
  { at: 6, color: hexToRgb(0xffb066) },
  { at: 14, color: hexToRgb(0xffdcae) },
  { at: 30, color: hexToRgb(0xffedcc) },
  { at: 60, color: hexToRgb(0xfff6e6) },
];

const MOONLIGHT = hexToRgb(0x9fb6d8);

/**
 * 수평면 조도, lux.
 *
 * 주간은 청천 근사 E ≈ 128 000·sin(h). 박명 구간은 공표된 표식들 사이를
 * log₁₀ lux 로 보간한다 — 지평선 ~400 lx, 시민박명 3.4 lx, 항해박명 0.008 lx,
 * 천문박명 0.0006 lx. 바닥은 월광, 보름에 ~0.25 lx.
 */
export function illuminanceLux(sunAltitudeDeg, cloudCover, moonAltitudeDeg, moonFraction) {
  const transmission = 1 - 0.86 * clamp01(cloudCover);
  let lux;
  if (sunAltitudeDeg > 0) {
    lux = 128000 * Math.pow(Math.sin(sunAltitudeDeg * DEG), 1.05) * transmission;
    lux = Math.max(lux, 400 * transmission * smoothstep(0, 3, sunAltitudeDeg));
  } else {
    const marks = [
      { at: -18, log: Math.log10(0.0006) },
      { at: -12, log: Math.log10(0.008) },
      { at: -6, log: Math.log10(3.4) },
      { at: 0, log: Math.log10(400) },
    ];
    let log = marks[0].log;
    if (sunAltitudeDeg >= marks[marks.length - 1].at) {
      log = marks[marks.length - 1].log;
    } else {
      for (let index = 1; index < marks.length; index += 1) {
        if (sunAltitudeDeg <= marks[index].at) {
          const lower = marks[index - 1];
          const upper = marks[index];
          log = lerp(lower.log, upper.log, (sunAltitudeDeg - lower.at) / (upper.at - lower.at));
          break;
        }
      }
    }
    lux = Math.pow(10, log) * transmission;
  }
  const moonlight = moonAltitudeDeg > 0
    ? 0.25 * moonFraction * Math.sin(moonAltitudeDeg * DEG) * transmission
    : 0;
  return Math.max(lux + moonlight, 0.0003);
}

/** Koschmieder. 공표식: 대비 임계 2 % 에서 β = 3.912 / V. */
export function fogDensityPerMeter(visibilityMeters) {
  return 3.912 / Math.max(30, visibilityMeters);
}

function daylightPhase(sunAltitudeDeg) {
  if (sunAltitudeDeg >= 10) return 'day';
  if (sunAltitudeDeg >= -0.833) return 'golden';
  if (sunAltitudeDeg >= -6) return 'civil';
  if (sunAltitudeDeg >= -12) return 'nautical';
  if (sunAltitudeDeg >= -18) return 'astronomical';
  return 'night';
}

// ── 우리 보정: 날씨가 임무에 물리는 값 ──────────────────────────────────────

function verdictFor(factor) {
  return factor >= 0.75 ? 'GO' : factor >= 0.4 ? 'LIMITED' : 'NO_GO';
}

function opticalImpact(lux, visibilityMeters) {
  // 비냉각 EO 는 대략 10 lx 이상이라야 쓸만한 영상이 되고 200 lx 위에서 편하다.
  // 1 lx 아래면 날씨와 무관하게 열영상이다. 가시거리는 독립적으로 상한을
  // 씌운다 — 조명 켠 안개는 밝으면서도 불투명하다.
  const lightFactor = clamp01(Math.log10(Math.max(lux, 0.001) / 0.5) / Math.log10(200 / 0.5));
  const rangeFactor = clamp01(smoothstep(150, 2500, visibilityMeters));
  const factor = Math.min(lightFactor, rangeFactor);
  const note = rangeFactor < lightFactor
    ? `가시거리 ${formatDistance(visibilityMeters)} · 영상 인식 거리 제한`
    : lux < 1
      ? `조도 ${formatLux(lux)} · 열영상 전환 필요`
      : lux < 50
        ? `조도 ${formatLux(lux)} · 저조도 보정 필요`
        : `조도 ${formatLux(lux)} · 주간 EO 정상`;
  return { id: 'optical', label: '영상 감시', factor, verdict: verdictFor(factor), note };
}

function mobilityImpact(wetness, snowCover, temperatureC) {
  // 젖은 비포장은 최대 마찰의 약 1/4 을 잃고, 신설은 절반쯤. 영하의 젖은 노면은
  // 얼음이다 — 느린 게 아니라 위험한 경우.
  const icy = temperatureC <= 0.5 && wetness > 0.25 && snowCover < 0.35;
  let factor = 1 - 0.26 * clamp01(wetness) - 0.45 * clamp01(snowCover);
  if (icy) factor = Math.min(factor, 0.3);
  factor = clamp01(factor);
  const note = icy
    ? `노면 결빙 위험 (${temperatureC.toFixed(1)}°C) · 제동거리 3배`
    : snowCover > 0.05
      ? `적설 ${Math.round(snowCover * 100)}% · 견인력 ${Math.round(factor * 100)}%`
      : wetness > 0.05
        ? `노면 습윤 ${Math.round(wetness * 100)}% · 견인력 ${Math.round(factor * 100)}%`
        : '노면 건조 · 견인력 정상';
  return { id: 'mobility', label: '지상 기동', factor, verdict: verdictFor(factor), note };
}

function commsImpact(rateMmPerHour, precipitation, foliageWet) {
  // ITU-R P.838 강우 감쇠는 이 대역(UHF~저SHF)에서 무시할 수준이다 — 20 mm/h 에서
  // km 당 수천분의 1 dB. 무시 못 할 것은 젖은 수관 쪽이다(ITU-R P.833): 같은
  // 경로에서 마른 수관보다 수 dB 높다. 이 사이트는 숲이다.
  const rainLoss = 0.0002 * Math.pow(Math.max(0, rateMmPerHour), 1.1);
  const canopyLoss = 2.6 * clamp01(foliageWet);
  const totalDb = rainLoss + canopyLoss;
  const factor = clamp01(1 - totalDb / 9);
  const note = canopyLoss > 0.4
    ? `수관 습윤 감쇠 ${totalDb.toFixed(1)} dB · 중계 여유 확인`
    : precipitation === 'none'
      ? '강우 감쇠 없음 · 링크 여유 정상'
      : `강우 ${rateMmPerHour.toFixed(1)} mm/h · UHF 감쇠 ${totalDb.toFixed(2)} dB (무시 가능)`;
  return { id: 'comms', label: '통신 링크', factor, verdict: verdictFor(factor), note };
}

function flightImpact(windMps, precipitation, visibilityMeters, temperatureC) {
  // 1급 회전익 UAS: 지속풍 한계 12 m/s 가 통상이고 8 m/s 부터 체공이 급격히 준다.
  // 다른 하나의 정지선은 착빙 — −8 °C ~ +2 °C 사이의 가시 수분.
  const windFactor = clamp01(1 - smoothstep(8, 14, windMps));
  const visibilityFactor = clamp01(smoothstep(400, 3000, visibilityMeters));
  const icing = precipitation !== 'none' && temperatureC <= 2 && temperatureC >= -8;
  let factor = Math.min(windFactor, visibilityFactor);
  if (icing) factor = Math.min(factor, 0.25);
  if (precipitation === 'rain' || precipitation === 'sleet') factor = Math.min(factor, 0.55);
  const note = icing
    ? `착빙 조건 (${temperatureC.toFixed(1)}°C, 강수) · 비행 금지`
    : windMps >= 14
      ? `풍속 ${windMps.toFixed(1)} m/s · 한계 초과`
      : visibilityFactor < windFactor
        ? `가시거리 ${formatDistance(visibilityMeters)} · 시계비행 제한`
        : `풍속 ${windMps.toFixed(1)} m/s · 체공 시간 ${Math.round(factor * 100)}%`;
  return { id: 'flight', label: '무인기 운용', factor, verdict: verdictFor(factor), note };
}

export function formatLux(lux) {
  if (lux >= 1000) return `${Math.round(lux / 1000)}k lx`;
  if (lux >= 10) return `${Math.round(lux)} lx`;
  if (lux >= 1) return `${lux.toFixed(1)} lx`;
  return `${lux.toFixed(3)} lx`;
}

export function formatDistance(meters) {
  return meters >= 1000 ? `${(meters / 1000).toFixed(1)} km` : `${Math.round(meters)} m`;
}

/** 지방 자정 이후 분 → `HH:MM`. */
export function formatClock(minuteOfDay) {
  const minute = Math.round(((minuteOfDay % 1440) + 1440) % 1440);
  return `${String(Math.floor(minute / 60)).padStart(2, '0')}:${String(minute % 60).padStart(2, '0')}`;
}

/** 연중일자 → `M월 D일` (평년 기준). */
export function formatSeasonDate(dayOfYear) {
  const { month, day } = monthDayOf(dayOfYear);
  return `${month}월 ${day}일`;
}

/** 연중일자 → {month, day}. Cesium 시계용 실제 날짜 구성에도 쓴다. */
export function monthDayOf(dayOfYear) {
  const dayNumber = (((Math.round(dayOfYear) - 1) % 365) + 365) % 365 + 1;
  const monthLengths = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  let remaining = dayNumber;
  for (let month = 0; month < monthLengths.length; month += 1) {
    if (remaining <= monthLengths[month]) return { month: month + 1, day: remaining };
    remaining -= monthLengths[month];
  }
  return { month: 12, day: 31 };
}

// ── 단 하나의 진입점 ────────────────────────────────────────────────────────

export function environmentState(settings, site) {
  const dayOfYear = wrapDayOfYear(settings.dayOfYear);
  const minuteOfDay = ((Math.round(settings.minuteOfDay) % 1440) + 1440) % 1440;
  const intensity = clamp01(settings.intensity);
  const preset = WEATHER_PRESETS[settings.weather] ?? WEATHER_PRESETS.clear;

  const sun = solarPosition(site, dayOfYear, minuteOfDay);
  const moon = moonPosition(site, dayOfYear, minuteOfDay);
  const altitude = sun.altitudeDeg;

  const cloudCover = clamp01(presetAt(preset.cloudCover, intensity));
  const visibilityMeters = presetAt(preset.visibilityMeters, intensity);
  const windMps = Math.max(0, settings.windMps + presetAt(preset.gustMps, intensity));
  const temperatureC = temperatureAt(dayOfYear, altitude, cloudCover, site.latitude);

  // 무엇이 내리는지는 버튼이 아니라 기온이 정한다. 7월에 눈을 골라도 눈은 온다
  // (예행이고, 운용자의 선택을 거절하는 조종은 거짓말이 된다). 다만 −4 °C 에서
  // 비를 고르면 눈이 온다 — 그게 −4 °C 의 비이며, 그에 맞는 견인력 수치가
  // 함께 나와야 계획을 세울 수 있다.
  const wants = settings.weather === 'rain' || settings.weather === 'snow';
  const precipitation = !wants
    ? (presetAt(preset.precipitationRate, intensity) > 0.05 ? 'rain' : 'none')
    : settings.weather === 'snow'
      ? 'snow'
      : temperatureC <= -1
        ? 'snow'
        : temperatureC <= 2
          ? 'sleet'
          : 'rain';
  const precipitationRateMmPerHour = presetAt(preset.precipitationRate, intensity);

  // 적설은 누적 *그리고* 융설이다 — 봄 오후의 폭설은 흩뿌리고 끝나고 1월의
  // 폭설은 사이트를 하얗게 덮는다.
  const falling = precipitation === 'snow'
    ? clamp01(0.25 + intensity * 0.75)
    : precipitation === 'sleet' ? intensity * 0.25 : 0;
  const meltFactor = 1 - smoothstep(0.5, 7, temperatureC);
  const winterBase = temperatureC <= -1 ? 0.12 * smoothstep(0, -6, temperatureC) : 0;
  const snowCover = clamp01((falling + winterBase) * meltFactor);
  const wetness = clamp01(presetAt(preset.wetness, intensity) * (1 - snowCover * 0.7));

  const lux = illuminanceLux(altitude, cloudCover, moon.altitudeDeg, moon.illuminatedFraction);
  const phase = daylightPhase(altitude);

  const sunrise = horizonCrossings(site, dayOfYear, 90.833);
  const twilight = horizonCrossings(site, dayOfYear, 96);
  const noon = solarNoonMinute(site, dayOfYear);

  // 하늘. 구름은 색조를 빼고 회색으로 당기며, 야간 분기는 완전한 검정으로
  // 가지 않는다 — 주변광이 0 인 씬은 밤이 아니라 고장난 렌더러로 읽힌다.
  const cloudGrey = mixRgb(hexToRgb(0x8d97a1), hexToRgb(0x3a424c), clamp01(1 - smoothstep(-4, 12, altitude)));
  const skyTop = mixRgb(sampleRamp(SKY_TOP_RAMP, altitude), scaleRgb(cloudGrey, 0.75), cloudCover * 0.72);
  const skyHorizon = mixRgb(sampleRamp(SKY_HORIZON_RAMP, altitude), cloudGrey, cloudCover * 0.62);
  const skyGround = sampleRamp(SKY_GROUND_RAMP, altitude);
  const sunTint = sun.altitudeDeg > -6 ? sampleRamp(SUN_COLOR_RAMP, altitude) : [0, 0, 0];
  const starIntensity = clamp01(1 - smoothstep(-16, -5, altitude)) * (1 - cloudCover * 0.92);

  // 안개는 지평선 색을 가져간다 — 지형이 자기가 서 있는 하늘로 흐려지지,
  // 그 하늘에 없는 회색으로 흐려지면 안 된다.
  const fogColor = mixRgb(
    skyHorizon,
    hexToRgb(0xdfe6ea),
    settings.weather === 'snow' ? 0.35 * intensity : settings.weather === 'fog' ? 0.5 * intensity : 0,
  );

  // 빛. 직사광은 구름과 저고도 대기질량에서 소광되고, 잃은 만큼 반구광으로
  // 간다 — 흐린 하늘은 광원의 부재가 아니라 그 자체가 광원이다.
  const directTransmission = clamp01(1 - 0.97 * cloudCover) * clamp01(smoothstep(-1.2, 6, altitude));
  const sunIntensity = 3.35 * directTransmission;
  const moonIntensity = altitude < -1
    ? 0.42 * moon.illuminatedFraction * clamp01(smoothstep(-2, 12, moon.altitudeDeg)) * (1 - cloudCover * 0.8)
    : 0;
  const sunColor = altitude > -1 ? sampleRamp(SUN_COLOR_RAMP, altitude) : MOONLIGHT;

  const dayAmbient = 1.75;
  const nightAmbient = 0.24;
  const ambientDaylight = clamp01(smoothstep(-8, 6, altitude));
  const hemisphereIntensity = lerp(nightAmbient, dayAmbient, ambientDaylight) * lerp(1, 1.24, cloudCover) + snowCover * 0.22;
  const skyAmbient = mixRgb(hexToRgb(0x1a2333), hexToRgb(0xdfe7ee), ambientDaylight);
  const groundAmbient = mixRgb(
    mixRgb(hexToRgb(0x14161c), hexToRgb(0x5a5344), ambientDaylight),
    hexToRgb(0xb9c4cc),
    snowCover * 0.6,
  );

  // 노출. 야간은 한 스톱 반쯤 열어 준다 — 실제 영상증폭기가 하는 일이고,
  // 쓸 수 있는 야간 화면이 되려면 어느 씬이든 해야 하는 일이다.
  const exposure = lerp(1.9, 1.2, ambientDaylight) * lerp(1, 0.92, cloudCover);
  const shadowStrength = clamp01(directTransmission * 1.15);

  const foliageTint = sampleRamp(FOLIAGE_RAMP, dayOfYear);
  const foliageDensity = foliageDensityAt(dayOfYear);
  const foliageWet = clamp01(wetness * foliageDensity);

  return {
    settings: { ...settings, dayOfYear, minuteOfDay, intensity, windMps: settings.windMps },
    site,
    sun: { ...sun, aboveHorizon: altitude > -0.833 },
    moon: { ...moon, aboveHorizon: moon.altitudeDeg > 0 },
    daylight: {
      sunriseMinute: sunrise.rise,
      sunsetMinute: sunrise.set,
      bmntMinute: twilight.rise,
      eentMinute: twilight.set,
      solarNoonMinute: noon,
      dayLengthMinutes: sunrise.rise !== undefined && sunrise.set !== undefined ? sunrise.set - sunrise.rise : 0,
      phase,
      phaseLabel: DAYLIGHT_PHASE_LABELS[phase],
    },
    season: seasonAt(dayOfYear),
    weather: {
      id: settings.weather,
      label: WEATHER_LABELS[settings.weather] ?? WEATHER_LABELS.clear,
      intensity,
      cloudCover,
      precipitation,
      precipitationRateMmPerHour: precipitation === 'none' ? 0 : precipitationRateMmPerHour,
      visibilityMeters,
      fogDensityPerMeter: fogDensityPerMeter(visibilityMeters),
      windMps,
    },
    sky: {
      top: skyTop,
      horizon: skyHorizon,
      ground: skyGround,
      sunTint,
      starIntensity,
      cloudTint: mixRgb(cloudGrey, sunTint, clamp01(smoothstep(-4, 4, altitude)) * 0.28),
      cloudOpacity: clamp01(cloudCover * 0.95),
      fogColor,
    },
    light: {
      sunColor,
      sunIntensity: Math.max(sunIntensity, moonIntensity),
      skyColor: desaturate(skyAmbient, cloudCover * 0.4),
      groundColor: groundAmbient,
      hemisphereIntensity,
      exposure,
      shadowStrength,
    },
    ground: {
      snowCover,
      wetness,
      foliageTint,
      foliageDensity,
    },
    temperatureC,
    illuminanceLux: lux,
    impacts: [
      opticalImpact(lux, visibilityMeters),
      mobilityImpact(wetness, snowCover, temperatureC),
      commsImpact(precipitation === 'none' ? 0 : precipitationRateMmPerHour, precipitation, foliageWet),
      flightImpact(windMps, precipitation, visibilityMeters, temperatureC),
    ],
  };
}

