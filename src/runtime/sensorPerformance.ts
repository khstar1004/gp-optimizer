// @ts-nocheck
/**
 * 센서 실효성능 모델 — 「눈이 오면 얼마나 안 보이는가」에 숫자로 답하는 곳
 *
 * 카탈로그의 사거리는 **청천 제원**이다. 실제로 보이는 거리는 그 제원에 대기가
 * 곱해진 값이고, 대기가 곱하는 양은 파장대마다 다르다 — 이 모듈의 존재 이유가
 * 그 차이다. 눈은 EO를 죽이고 IR을 반쯤 깎지만 레이더는 거의 통과시킨다. 그
 * 순서가 뒤집히면 「악천후에 무엇을 믿을 것인가」라는 배치 판단이 통째로 틀린다.
 *
 * 공표식(published) — 재조정 금지:
 *   Koschmieder      β = 3.912 / V           (대비 임계 2 %, 가시거리 V[m])
 *   Duntley 대비감쇠  C(R) = C₀·exp(−βR)      → 과업별 임계대비로 거리 역산
 *   ITU-R P.838-3    γ = k·R^α  (X대역 10 GHz 수평편파 k=0.01217, α=1.2571)
 *   레이더 방정식     SNR ∝ R⁻⁴ · 10^(−2γR/10)  (양방향 감쇠)
 *   Johnson 기준     탐지:인지:식별 = 필요 해상선수 비 → DRI 3거리 (카탈로그 제원)
 *
 * 우리 보정(calibration) — 데모 합성치이며 실제 장비 제원이 아니다:
 *   파장대별 소광비 K_LWIR, 표적 고유대비 C₀, 열대비 ΔT 및 그 습윤/적설 보정,
 *   음향 전달손실·풍잡음 마스킹, 조명탄 역산란, 육안 저조도 계수.
 *
 * 두 구획을 섞지 말 것. 위쪽은 문헌이고 아래쪽은 우리가 고른 값이다.
 */
import { clamp01 } from './environmentModel';
import { clamp } from './mathUtils';

// ═══════════════════════════════════════════════════════════════════════════
// 공표식
// ═══════════════════════════════════════════════════════════════════════════

/** Koschmieder 소광계수 (m⁻¹). 가시대역. */
export function betaVisible(visibilityMeters) {
  return 3.912 / Math.max(30, visibilityMeters);
}

/** Duntley: 고유대비 C₀ 표적이 임계대비 εTh 로 떨어지는 거리(m). */
export function contrastRange(beta, c0, epsTh) {
  if (c0 <= epsTh) return 0;
  return Math.log(c0 / epsTh) / Math.max(1e-9, beta);
}

/** ITU-R P.838-3, X대역(10 GHz) 수평편파 강우특성 감쇠 (dB/km). */
export function rainAttenDbPerKm(rateMmPerHour) {
  if (rateMmPerHour <= 0) return 0;
  return 0.01217 * Math.pow(rateMmPerHour, 1.2571);
}

/**
 * 레이더 유효거리 — 청천 기준거리 R₀ 에서 SNR = 검출문턱이라 두고, 대기감쇠 γ 의
 * 왕복 손실과 강수 체적클러터에 의한 문턱 상승 ΔdB 를 반영해 SNR(R) = 문턱인 R.
 *
 *   40·log₁₀(R₀/R) − 2γR/1000 − ΔdB = 0
 *
 * 감쇠 항은 R₀ 대비 증분이 아니라 **절대 경로손실**이다 — 기준거리는 청천 정의라
 * 감쇠가 0 이었고, R 에서는 왕복 2R 만큼 전부 먹는다. (증분으로 쓰면 γ 를 키웠을 때
 * 거리가 되레 늘어나는 뒤집힘이 생긴다.)
 */
export function radarRange(r0, gammaDbPerKm, clutterDb) {
  let lo = 30, hi = r0;
  const f = (r) => 40 * Math.log10(r0 / r) - (2 * gammaDbPerKm * r) / 1000 - clutterDb;
  if (f(r0) >= 0) return r0;                 // 감쇠·클러터 없음
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2;
    if (f(mid) >= 0) lo = mid; else hi = mid;
  }
  return lo;
}

// ═══════════════════════════════════════════════════════════════════════════
// 우리 보정
// ═══════════════════════════════════════════════════════════════════════════

/**
 * 장파장적외(8~12 µm) 소광 / 가시 소광 비.
 *
 * 산란은 입자 크기 대 파장 비가 정한다. 연무 입자(≪10 µm)는 LWIR 을 거의 그냥
 * 통과시키고, 안개 물방울(5~20 µm)은 파장과 같은 급이라 상당히 막으며, 빗방울·
 * 눈송이(0.5~10 mm)는 파장보다 훨씬 커서 기하광학 영역 — 파장을 가리지 않는다.
 * 그래서 「눈에는 열상도 별 수 없다」가 되고, 「연무에는 열상이 뚫는다」가 된다.
 */
function lwirRatio(weatherId, intensity, precipitation) {
  switch (precipitation === 'snow' ? 'snow' : weatherId) {
    // 복사무(작은 방울)는 LWIR 을 상당히 통과시키고, 짙은 이류무(큰 방울)는 덜 통과시킨다.
    // 통념 「열상은 안개에서 3배 본다」가 옅은 쪽 끝이고, 짙은 쪽에서는 2배도 못 간다.
    case 'fog': return 0.32 + 0.36 * clamp01(intensity);
    case 'snow': return 0.86 + 0.08 * clamp01(intensity);  // 기하산란 — 파장 무관
    case 'rain': return 0.72 + 0.10 * clamp01(intensity);
    case 'overcast': return 0.22;
    case 'cloudy': return 0.16;
    default: return 0.12;                                   // 순수 연무·분자산란
  }
}

/** X대역 강수 감쇠 (dB/km) — 눈은 건설/습설을 갈라 본다. */
function radarGamma(precipitation, rateMmPerHour, temperatureC) {
  if (precipitation === 'none' || rateMmPerHour <= 0) return 0;
  if (precipitation === 'snow') {
    // 건설은 유전손실이 작아 같은 수당량 강우의 1/10 이하. 0 °C 근처 습설은 급증.
    const wet = clamp01((temperatureC + 2) / 3);
    return (0.0015 * Math.pow(rateMmPerHour, 1.6)) * (1 + 7 * wet);
  }
  if (precipitation === 'sleet') return rainAttenDbPerKm(rateMmPerHour) * 2.2;
  return rainAttenDbPerKm(rateMmPerHour);
}

/** 강수 체적 클러터에 의한 검출문턱 상승 (dB). MTI 로 상당 부분 걸러진다는 전제. */
function radarClutterDb(precipitation, rateMmPerHour, windMps) {
  if (precipitation === 'none') return 0;
  const rain = 2.6 * Math.pow(clamp01(rateMmPerHour / 20), 0.8);
  const blow = 1.4 * clamp01((windMps - 7) / 8) * (precipitation === 'snow' ? 1.6 : 1);  // 지취설
  return rain + blow;
}

/** 표적 고유대비 C₀ — 위장한 인원 대 산림/적설 배경. 눈 위에서는 대비가 오른다. */
function inherentContrast(snowCover, foliageDensity) {
  return clamp(0.22 + 0.30 * clamp01(snowCover) - 0.06 * clamp01(foliageDensity), 0.12, 0.55);
}

/** 과업별 임계대비 — 탐지 2 %, 인지 5 %, 식별 10 %. */
const TASK_EPS = [0.02, 0.05, 0.10];
/** 과업별 열상 SNR 문턱 × NETD(0.05 K) → 필요 겉보기 온도차 (K). */
const TASK_DT = [0.20, 0.42, 0.75];

/** 조도 → EO 유효거리 배율. 저조도에서는 노출·잡음이 거리를 먼저 깎는다. */
function eoLightScale(lux, hasIllumination) {
  const l = Math.max(lux, 1e-4) + (hasIllumination ? 12 : 0);   // 조명탄/서치라이트 바닥값
  // 0.5 lx(만월) → 0.30, 20 lx(박명) → 0.72, 200 lx 이상 → 1.0
  const t = clamp01(Math.log10(l / 0.05) / Math.log10(200 / 0.05));
  return clamp(0.12 + 0.88 * t, 0.12, 1);
}

/** 육안(조준경) 저조도 배율 — 증폭장치가 없으므로 EO 보다 훨씬 가파르다. */
function eyeLightScale(lux, hasIllumination) {
  const l = Math.max(lux, 1e-4) + (hasIllumination ? 20 : 0);
  const t = clamp01(Math.log10(l / 1) / Math.log10(500 / 1));
  return clamp(0.05 + 0.95 * t, 0.05, 1);
}

/**
 * 제한요인 고르기 (가시대역·육안).
 *
 * 유효거리는 min(제원, 대기한계) × 조도배율 이므로 감쇠원이 둘이다. 「무엇이 막고
 * 있는가」는 **더 많이 깎은 쪽**이라야 한다 — 조도가 30 % 를 깎았는데 대기가
 * 제원 안이라는 이유로 「제원」이라고 적으면, 거리는 줄었는데 원인은 없는 화면이 된다.
 */
function pickLimiter(lightScale, atmRange, specRange) {
  const lightCut = 1 - clamp01(lightScale);
  const atmCut = 1 - clamp01(Math.min(1, atmRange / Math.max(1, specRange)));
  if (lightCut < 0.03 && atmCut < 0.03) return '제원';
  return lightCut >= atmCut ? '조도' : '가시거리';
}

/** 열대비 ΔT (K) — 적설 배경은 대비를 키우고, 젖은 표적/배경은 씻어낸다. */
function thermalDeltaT(snowCover, wetness, lux) {
  const solarLoad = 0.6 + 0.8 * clamp01(Math.log10(Math.max(lux, 0.01) / 1) / Math.log10(50000));
  const base = 2.6 * solarLoad;
  return clamp(base * (1 + 0.55 * clamp01(snowCover)) * (1 - 0.5 * clamp01(wetness)), 0.5, 6.5);
}

// ═══════════════════════════════════════════════════════════════════════════
// 파장대별 유효거리
// ═══════════════════════════════════════════════════════════════════════════

/**
 * 대기 상태를 한 번만 풀어 둔다 — 자산 수만큼 반복 계산할 이유가 없다.
 * @param env environmentState() 결과
 */
export function atmosphereOf(env) {
  const w = env.weather;
  const g = env.ground;
  const beta = betaVisible(w.visibilityMeters);
  const kLwir = lwirRatio(w.id, w.intensity, w.precipitation);
  const rate = w.precipitationRateMmPerHour ?? 0;
  return {
    visibilityMeters: w.visibilityMeters,
    betaVis: beta,
    betaLwir: beta * kLwir,
    lwirRatio: kLwir,
    gammaDbPerKm: radarGamma(w.precipitation, rate, env.temperatureC),
    clutterDb: radarClutterDb(w.precipitation, rate, w.windMps),
    lux: env.illuminanceLux,
    snowCover: g.snowCover,
    wetness: g.wetness,
    foliageDensity: g.foliageDensity,
    windMps: w.windMps,
    precipitation: w.precipitation,
    precipitationRate: rate,
    temperatureC: env.temperatureC,
    weatherId: w.id,
    weatherLabel: w.label,
    intensity: w.intensity,
    c0: inherentContrast(g.snowCover, g.foliageDensity),
    deltaT: thermalDeltaT(g.snowCover, g.wetness, env.illuminanceLux),
  };
}

/**
 * 자산 하나의 실효 성능.
 *
 * @param spec { band, dri?[3], range?, fov }
 *   band: vis · lwir · radar · acoustic · rf · flare · seismic · fence · indirect · eye(기본)
 * @param atm  atmosphereOf() 결과
 * @param opts { illuminated: 조명 지원 여부 }
 * @returns {
 *   dri:[탐지,인지,식별] 유효거리 m, spec:[청천 제원],
 *   range: 대표 유효거리(=dri[0]), specRange, factor: 유효/청천,
 *   limiter: '가시거리'|'조도'|'열대비'|'강수감쇠'|'풍잡음'|'적설흡수'|'제원',
 *   note, verdict: 'GO'|'LIMITED'|'NO_GO'
 * }
 */
export function effectiveRanges(spec, atm, opts = {}) {
  const illuminated = !!opts.illuminated;
  const specDri = spec.dri ?? [spec.range, spec.range * 0.34, spec.range * 0.17];
  let dri, limiter, note;

  switch (spec.band) {
    // ── 가시대역 EO ──────────────────────────────────────────────────────
    case 'vis': {
      const light = eoLightScale(atm.lux, illuminated);
      const atmR = TASK_EPS.map((eps) => contrastRange(atm.betaVis, atm.c0, eps));
      dri = specDri.map((r, i) => Math.min(r, atmR[i]) * light);
      limiter = pickLimiter(light, atmR[0], specDri[0]);
      note = limiter === '조도'
        ? `조도 ${fmtLux(atm.lux)}${illuminated ? ' (조명 지원)' : ''}`
          + ` · 영상증폭 한계 (유효 ${Math.round(light * 100)}%)`
        : limiter === '가시거리'
          ? `가시거리 ${fmtM(atm.visibilityMeters)} · 대비감쇠 C₀ ${atm.c0.toFixed(2)}`
          : '청천 제원 그대로';
      break;
    }
    // ── 장파장적외 열상 ──────────────────────────────────────────────────
    case 'lwir': {
      const atmR = TASK_DT.map((need) => (atm.deltaT <= need
        ? 0
        : Math.log(atm.deltaT / need) / Math.max(1e-9, atm.betaLwir)));
      dri = specDri.map((r, i) => Math.min(r, atmR[i]));
      const atmBound = atmR[0] < specDri[0];
      limiter = !atmBound ? '제원'
        : atm.deltaT < 1.4 ? '열대비' : '가시거리';
      note = limiter === '열대비'
        ? `열대비 ΔT ${atm.deltaT.toFixed(1)}K · 습윤 세척 (LWIR 소광비 ${atm.lwirRatio.toFixed(2)})`
        : limiter === '가시거리'
          ? `LWIR 소광 ${(atm.betaLwir * 1000).toFixed(2)}/km (가시대비 ${(atm.lwirRatio * 100).toFixed(0)}%)`
          : '청천 제원 그대로 · 주야 무관';
      break;
    }
    // ── X대역 지상감시레이더 ────────────────────────────────────────────
    case 'radar': {
      const r = radarRange(specDri[0], atm.gammaDbPerKm, atm.clutterDb);
      dri = [r, Math.min(specDri[1], r * (specDri[1] / specDri[0])), Math.min(specDri[2], r * (specDri[2] / specDri[0]))];
      limiter = atm.clutterDb > 0.8 ? '강수감쇠' : atm.gammaDbPerKm > 0.05 ? '강수감쇠' : '제원';
      note = limiter === '강수감쇠'
        ? `강수 감쇠 ${atm.gammaDbPerKm.toFixed(3)} dB/km · 체적클러터 +${atm.clutterDb.toFixed(1)} dB`
        : '전천후 — 대기 영향 무시 가능';
      break;
    }
    // ── 음향 어레이 ──────────────────────────────────────────────────────
    case 'acoustic': {
      // 신설은 다공질 흡음체다(흡음률 0.6~0.9) — 배경도 조용해지지만 표적
      // 발걸음 신호가 먼저 죽는다. 풍잡음은 주파수 무관 마스킹으로 들어온다.
      const snowAbs = 1 - 0.62 * clamp01(atm.snowCover);
      const windMask = 1 / (1 + Math.pow(Math.max(0, atm.windMps) / 5.5, 1.8));
      const rainMask = 1 - 0.28 * clamp01(atm.precipitationRate / 20);
      const f = clamp01(snowAbs * windMask * rainMask);
      dri = specDri.map((r) => r * f);
      limiter = windMask < snowAbs && windMask < rainMask ? '풍잡음'
        : snowAbs < 0.85 ? '적설흡수' : f > 0.9 ? '제원' : '풍잡음';
      note = limiter === '풍잡음'
        ? `풍속 ${atm.windMps.toFixed(1)} m/s 마스킹 · 유효 ${Math.round(f * 100)}%`
        : limiter === '적설흡수'
          ? `적설 ${Math.round(atm.snowCover * 100)}% 흡음 · 유효 ${Math.round(f * 100)}%`
          : '정온 — 제원 유지';
      break;
    }
    // ── C-UAS RF 재머 ────────────────────────────────────────────────────
    case 'rf': {
      // 2.4/5.8 GHz 강우 감쇠는 20 mm/h 에서도 0.05 dB/km 미만이다.
      const f = 1 - 0.04 * clamp01(atm.precipitationRate / 25);
      dri = specDri.map((r) => r * f);
      limiter = '제원';
      note = '전천후 — RF 감쇠 무시 가능 (< 0.05 dB/km)';
      break;
    }
    // ── 조명탄 ──────────────────────────────────────────────────────────
    case 'flare': {
      // 안개·강설 속 조명은 역산란으로 스스로를 가린다 — 반경이 줄 뿐 아니라
      // 그 안의 EO 대비까지 깎는다.
      const f = clamp01(Math.min(1, (0.85 * atm.visibilityMeters) / specDri[0]));
      dri = specDri.map((r) => r * f);
      limiter = f < 0.95 ? '가시거리' : '제원';
      note = f < 0.6
        ? `역산란 — 조명 반경 ${Math.round(f * 100)}% · 근거리 백화 주의`
        : `조명 반경 ${Math.round(f * 100)}% · 유효 조도 지원`;
      break;
    }
    // ── 지진동 감지 (매설형 UGS) ────────────────────────────────────────
    case 'seismic': {
      // 땅을 통해 오는 발걸음을 듣는다 — **빛도 안개도 상관없다.** 그래서 야간·
      // 짙은 안개에서 광학이 전부 죽었을 때 남는 몇 안 되는 눈이다.
      //
      // 대신 지면이 정한다: 언 땅은 진동을 멀리 실어 나르고(감도 상승), 신설은
      // 그 위를 덮어 발걸음 자체를 흡수하며, 강풍은 수목 진동으로 바닥잡음을 올린다.
      const frozen = atm.temperatureC <= -2 ? 1.18 : 1;
      const snowMuffle = 1 - 0.45 * clamp01(atm.snowCover);
      const windNoise = 1 / (1 + Math.pow(Math.max(0, atm.windMps) / 7, 1.6));
      const f = clamp01(frozen * snowMuffle * windNoise);
      dri = specDri.map((r) => r * f);
      limiter = snowMuffle < windNoise && snowMuffle < 0.9 ? '적설흡수'
        : windNoise < 0.85 ? '풍잡음' : '제원';
      note = limiter === '적설흡수'
        ? `신설 ${Math.round(atm.snowCover * 100)}% 가 발걸음을 덮는다 · 유효 ${Math.round(f * 100)}%`
        : limiter === '풍잡음'
          ? `풍속 ${atm.windMps.toFixed(1)} m/s 수목 진동 · 유효 ${Math.round(f * 100)}%`
          : `${frozen > 1 ? '동결 지반 — 전달 양호 · ' : ''}빛·시정과 무관`;
      break;
    }
    // ── 광망 (철책 감지선) ──────────────────────────────────────────────
    case 'fence': {
      // 철책에 닿는 순간을 잡는다 — 거리가 아니라 **선**이다. 그래서 날씨가
      // 유효거리를 깎지 않는다(닿으면 울린다). 대신 강풍·착설이 오경보를 만들고,
      // 오경보가 잦아지면 사람이 경보를 믿지 않게 되어 사실상 감도가 떨어진다.
      const falseAlarm = clamp01(Math.max(0, atm.windMps - 8) / 14 + atm.snowCover * 0.5
        + clamp01(atm.precipitationRate / 25) * 0.3);
      const f = 1 - 0.35 * falseAlarm;   // 「믿지 않게 되는」 만큼만 깎는다
      dri = specDri.map((r) => r * f);
      limiter = falseAlarm > 0.3 ? '오경보' : '제원';
      note = falseAlarm > 0.3
        ? `풍·착설 오경보 위험 ${Math.round(falseAlarm * 100)}% — 잦은 오경보는 경보를 무디게 한다`
        : '접촉식 — 시정·조도와 무관하게 울린다';
      break;
    }
    // ── 곡사 화기 (박격포) ──────────────────────────────────────────────
    case 'indirect': {
      // 관측이 아니라 타격이다. 그리고 **가시선이 필요 없다** — 능선 뒤 사각으로
      // 떨어뜨릴 수 있는 것이 곡사의 존재 이유다. 날씨는 사거리를 거의 깎지 않고,
      // 강풍만 탄착 산포를 키운다.
      const f = 1 - 0.12 * clamp01(Math.max(0, atm.windMps - 6) / 12);
      dri = specDri.map((r) => r * f);
      limiter = f < 0.97 ? '풍잡음' : '제원';
      note = f < 0.97
        ? `풍속 ${atm.windMps.toFixed(1)} m/s — 탄착 산포 증가 (유효 ${Math.round(f * 100)}%)`
        : '곡사 — 가시선 불요, 능선 뒤 사각 타격 가능';
      break;
    }
    // ── 육안 조준 (화기) ────────────────────────────────────────────────
    default: {
      const light = eyeLightScale(atm.lux, illuminated);
      const atmR = TASK_EPS.map((eps) => contrastRange(atm.betaVis, atm.c0, eps));
      dri = specDri.map((r, i) => Math.min(r, atmR[i]) * light);
      limiter = pickLimiter(light, atmR[0], specDri[0]);
      note = limiter === '조도'
        // 조명은 이제 「자산이 있다」가 아니라 「지금 떠 있다」이므로, 그 사실이
        // 문장에도 남아야 한다 — 같은 조도에서 유효거리가 열 배 달라지는 이유다.
        ? `조도 ${fmtLux(atm.lux)}${illuminated
          ? ' (조명 지원 중) · 관측사격 가능'
          : ' · 조명 지원 없이는 관측사격 불가'}`
        : limiter === '가시거리'
          ? `가시거리 ${fmtM(atm.visibilityMeters)} — 사거리보다 관측이 먼저 막힌다`
          : '관측사격 가능 · 유효사거리 그대로';
      break;
    }
  }

  dri = dri.map((r) => Math.max(0, Math.round(r)));
  const factor = specDri[0] > 0 ? clamp01(dri[0] / specDri[0]) : 0;
  return {
    dri, spec: specDri, range: dri[0], specRange: specDri[0], factor, limiter, note,
    verdict: factor >= 0.7 ? 'GO' : factor >= 0.35 ? 'LIMITED' : 'NO_GO',
  };
}

/** 탐지확률 P(d) — 유효 DRI 구간을 그대로 확률 프로파일로 쓴다. */
export function detectionProbability(perf, d) {
  const [D, R, I] = perf.dri;
  if (d <= 0 || D <= 0 || d > D) return 0;
  if (d <= I) return 0.97;
  if (d <= R) return 0.97 - 0.17 * ((d - I) / Math.max(1, R - I));
  return 0.80 * (1 - (d - R) / Math.max(1, D - R)) ** 1.15;
}

// ── 표시 보조 ───────────────────────────────────────────────────────────────
export function fmtM(m) {
  return m >= 1000 ? `${(m / 1000).toFixed(1)}km` : `${Math.round(m)}m`;
}
export function fmtLux(lux) {
  if (lux >= 1000) return `${Math.round(lux / 1000)}k lx`;
  if (lux >= 10) return `${Math.round(lux)} lx`;
  if (lux >= 1) return `${lux.toFixed(1)} lx`;
  return `${lux.toFixed(3)} lx`;
}
export const VERDICT_COLOR = { GO: '#3dd68c', LIMITED: '#e3b341', NO_GO: '#ed5d5d' };
export const VERDICT_TEXT = { GO: '정상', LIMITED: '제한', NO_GO: '불가' };
