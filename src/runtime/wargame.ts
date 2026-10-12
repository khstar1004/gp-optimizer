// @ts-nocheck
/**
 * 워게임 판정 엔진 — 침투 리허설의 탐지·교전 판정 + AAR(사후검토)
 *
 * 과학 모델 (앞서 만든 science.js 계열을 축약 이식):
 *  - 글림프스 누적: 6초 판정 주기마다 합동 단발탐지확률 p를 겪고
 *    P누적 = 1 − ∏(1 − pᵢ)  (Johnson TTPF 관례)
 *  - 단발확률 p(d) = pmax / (1 + (d/d50)^k) — 광학 k=3, 레이더 k=4(R⁻⁴), 음향 k=2
 *  - 환경 감쇠: EO는 조도(lux 로그축)와 가시거리, IR은 가시거리(강수·안개),
 *    음향은 바람·강수 소음. 레이더는 기상 무관(데모 단순화).
 *  - LOS: 타워 가시격자(lookupVisible)를 근사 게이트로 사용 — 음향은 비LOS 전파.
 *  - 표적 크기·소음 계수: 도보 1.0 / 구보 1.15 / 차량 1.6 (음향은 차량 2.4)
 *
 * 출력: 축선별 { samples, t50, t90, firstAsset, gapSegments, phase(NAI/DP/TAI 시각),
 *        engagementMarginMin, verdict } — AAR 카드와 지도 채색이 이걸 소비한다.
 */
import { SITE, MOVE_MODES } from './data';
import { distM, azimuthDeg, offset } from './geo';
import { lookupVisible } from './viewshed';
import { MOUNTS } from './sensorModels';

const GLIMPSE_SEC = 6;
const PROCEDURE_MIN = 6;   // 표준 사격절차 (요청~탄착) — opReport와 동일 가정

const SIZE_FACTOR = { walk: 1.0, run: 1.15, vehicle: 1.6 };
const NOISE_FACTOR = { walk: 1.0, run: 1.5, vehicle: 2.4 };

import { clamp01 } from './mathUtils';

/** 조도(lux) → EO 성능 계수 (월광 0.1lx≈0 · 여명 100lx≈0.6 · 주간 5000lx+=1) */
function luxFactor(lux) {
  return clamp01((Math.log10(Math.max(lux, 0.01)) - Math.log10(0.5)) / (Math.log10(5000) - Math.log10(0.5)));
}

/** 환경 스냅샷 — EnvironmentController.state에서 필요한 값만 */
export function envSnapshot(envState) {
  const lux = envState?.illuminanceLux ?? 20000;
  const visM = envState?.weather?.visibilityMeters ?? 20000;
  const windMps = envState?.weather?.windMps ?? 1;
  const rainMm = envState?.weather?.precipitationRateMmPerHour ?? 0;
  return {
    lux, visM, windMps, rainMm,
    label: `${envState?.daylight?.phaseLabel ?? '주간'} · ${envState?.weather?.label ?? '청명'} · 가시 ${visM >= 1000 ? (visM / 1000).toFixed(0) + 'km' : visM + 'm'}`,
  };
}

/** 센서별 단발탐지확률 모델 — {p50 유효거리, pmax, 지수, 환경계수, LOS 필요} */
function buildSensors(activeSet, env, mode) {
  const size = SIZE_FACTOR[mode] ?? 1;
  const noise = NOISE_FACTOR[mode] ?? 1;
  const sensors = [];
  const pos = (key) => {
    const m = MOUNTS[key];
    return m ? offset(SITE.gp.lon, SITE.gp.lat, m.az, m.dist) : { lon: SITE.gp.lon, lat: SITE.gp.lat };
  };

  // 감시탑 육안/TOD — 항상 존재 (관측병 상주 가정)
  const eyeF = Math.max(luxFactor(env.lux), 0.45); // 야간 TOD 병행으로 바닥값
  sensors.push({
    key: 'tower', name: '감시탑 관측', lon: SITE.gp.lon, lat: SITE.gp.lat,
    d50: 1600 * eyeF * Math.min(1, env.visM / 2500) * size, pmax: 0.55, k: 3, los: true,
  });

  if (activeSet.has('eo')) {
    const f = luxFactor(env.lux) * Math.min(1, env.visM / 3500);
    const m = MOUNTS.eo;
    sensors.push({
      key: 'eo', name: 'EO 주간카메라', ...pos('eo'),
      d50: 3500 * f * size, pmax: 0.85, k: 3, los: true,
      fov: 90, aimAz: m.aimAz ?? m.heading(),
    });
  }
  if (activeSet.has('ir')) {
    // 열상은 조도 무관, 강수·짙은 안개에 감쇠 (연무 투과는 가시광보다 유리)
    const f = clamp01(0.35 + env.visM / 3000) * (env.rainMm > 4 ? 0.55 : 1);
    const m = MOUNTS.ir;
    sensors.push({
      key: 'ir', name: 'IR 열상(TOD)', ...pos('ir'),
      d50: 2800 * Math.min(1, f) * size, pmax: 0.8, k: 3, los: true,
      fov: 60, aimAz: m.aimAz ?? m.heading(),
    });
  }
  if (activeSet.has('radar')) {
    const m = MOUNTS.radar;
    sensors.push({
      key: 'radar', name: '지상감시레이더', ...pos('radar'),
      d50: 3800 * size, pmax: 0.9, k: 4, los: true,
      fov: 120, aimAz: m.aimAz ?? m.heading(),
    });
  }
  if (activeSet.has('acoustic')) {
    const windPenalty = clamp01(1 - env.windMps / 12) * (env.rainMm > 1 ? 0.6 : 1);
    sensors.push({
      key: 'acoustic', name: '음향탐지 어레이', ...pos('acoustic'),
      d50: 600 * noise * windPenalty, pmax: 0.5, k: 2, los: false,
    });
  }
  return sensors;
}

function singleGlimpseP(sensor, lon, lat, visibleFromTower) {
  const d = distM(sensor.lon, sensor.lat, lon, lat);
  if (sensor.d50 <= 1) return 0;
  if (sensor.los && !visibleFromTower) return 0;
  if (sensor.fov != null) {
    const az = azimuthDeg(sensor.lon, sensor.lat, lon, lat);
    let diff = Math.abs(az - sensor.aimAz) % 360;
    if (diff > 180) diff = 360 - diff;
    if (diff > sensor.fov / 2) return 0;
  }
  return sensor.pmax / (1 + Math.pow(d / sensor.d50, sensor.k));
}

/**
 * 한 축선 판정 — pts는 {lon,lat,h,cumM} 배열 (infiltration allRouteData)
 * grid: 타워 가시격자 (LOS 게이트)
 */
export function judgeRoute(rd, mode, grid, activeSet, env) {
  const m = MOVE_MODES[mode];
  const sensors = buildSensors(activeSet, env, mode);
  const pts = rd.pts;
  const totalM = pts[pts.length - 1].cumM;
  const totalMin = totalM / m.speed / 60;
  const stride = Math.max(1, Math.floor(pts.length / 220));

  const samples = [];
  let pCum = 0;
  let t50 = null, t90 = null, firstAsset = null;
  const contrib = Object.fromEntries(sensors.map((s) => [s.key, 0]));
  let prevCumM = 0;

  for (let i = 0; i < pts.length; i += stride) {
    const p = pts[i];
    const vis = lookupVisible(grid, p.lon, p.lat);
    const ps = sensors.map((s) => singleGlimpseP(s, p.lon, p.lat, vis));
    const pJoint = 1 - ps.reduce((acc, v) => acc * (1 - v), 1);
    const dtSec = (p.cumM - prevCumM) / m.speed;
    prevCumM = p.cumM;
    const nGlimpse = Math.max(0, dtSec / GLIMPSE_SEC);
    pCum = 1 - (1 - pCum) * Math.pow(1 - pJoint, nGlimpse);
    sensors.forEach((s, si) => { contrib[s.key] += ps[si] * nGlimpse; });
    const tMin = p.cumM / m.speed / 60;
    if (t50 == null && pCum >= 0.5) {
      t50 = tMin;
      let best = null, bv = -1;
      sensors.forEach((s, si) => { if (ps[si] > bv) { bv = ps[si]; best = s.name; } });
      firstAsset = best;
    }
    if (t90 == null && pCum >= 0.9) t90 = tMin;
    samples.push({ frac: p.cumM / totalM, tMin, lon: p.lon, lat: p.lat, h: p.h, pJoint, pCum });
  }

  // 판정 공백 구간 (합동 단발확률 < 2%)
  const gapSegments = [];
  let gs = null;
  for (const s of samples) {
    if (s.pJoint < 0.02) { if (!gs) gs = { fromFrac: s.frac, toFrac: s.frac }; else gs.toFrac = s.frac; }
    else if (gs) { gapSegments.push(gs); gs = null; }
  }
  if (gs) gapSegments.push(gs);
  const gapRatio = gapSegments.reduce((a, g) => a + (g.toFrac - g.fromFrac), 0);

  const phase = { naiMin: totalMin * 0.24, dpMin: totalMin * 0.56, taiMin: totalMin * 0.82, totalMin };
  const engagementMarginMin = t50 == null ? null : phase.taiMin - t50 - PROCEDURE_MIN;
  const detectedBeforeDP = t50 != null && t50 <= phase.dpMin;

  let verdict, verdictClass;
  if (t50 == null) { verdict = '미탐지 — 축선 전 구간 침투 허용'; verdictClass = 'bad'; }
  else if (!detectedBeforeDP) { verdict = 'DP 이후 지연 탐지 — 결심 시간 부족'; verdictClass = 'warn'; }
  else if (engagementMarginMin < 0) { verdict = '조기 탐지했으나 화력운용 시간 부족'; verdictClass = 'warn'; }
  else { verdict = '조기 탐지 · 교전 시간 확보'; verdictClass = 'ok'; }

  const recommendations = [];
  if (t50 == null || !detectedBeforeDP) {
    recommendations.push('전방(NAI 이전) 구간 센서 보강 — 「자산 배치 최적화」 재실행 권장');
  }
  if (gapRatio > 0.35) recommendations.push(`판정 공백 ${Math.round(gapRatio * 100)}% — 음향 어레이(비가시선)로 사각 보완 권장`);
  if (engagementMarginMin != null && engagementMarginMin < 0) {
    recommendations.push('사전 표적화(TAI 사전 등록)로 사격절차 단축 필요');
  }
  if (env.lux < 50 && !activeSet.has('ir')) recommendations.push('야간 조건 — IR 열상 미가동 상태, 가동 권장');

  return {
    route: rd.route, mode, totalMin, samples, t50, t90, firstAsset,
    contrib, gapSegments, gapRatio, phase, engagementMarginMin, detectedBeforeDP,
    verdict, verdictClass, recommendations, env,
  };
}

/** 활성 축선 전부 판정 — 위험(늦은 탐지) 순 정렬 */
export function judgeAll(routeDatas, mode, grid, activeSet, envState) {
  const env = envSnapshot(envState);
  const results = routeDatas.map((rd) => judgeRoute(rd, mode, grid, activeSet, env));
  // 위험도: 미탐지 > DP 이후 탐지 > 여유 부족 > 안전, 동급에선 t50 늦은 순
  const rank = (r) => (r.t50 == null ? 3000 : (!r.detectedBeforeDP ? 2000 : (r.engagementMarginMin < 0 ? 1000 : 0)) + r.t50);
  results.sort((a, b) => rank(b) - rank(a));
  return results;
}

/** 지도 채색 — 판정 결과를 축선 위 세그먼트 폴리라인으로 (초록=판정권·빨강=공백) */
export function paintJudgement(viewer, ds, result) {
  ds.entities.removeAll();
  const S = result.samples;
  const segN = 3;
  for (let i = 0; i + segN < S.length; i += segN) {
    const seg = S.slice(i, i + segN + 1);
    const p = seg[Math.floor(seg.length / 2)].pJoint;
    const color = p < 0.02 ? '#ed5d5d' : p < 0.12 ? '#e3b341' : '#3dd68c';
    ds.entities.add({
      polyline: {
        positions: seg.map((s) => Cesium.Cartesian3.fromDegrees(s.lon, s.lat, (s.h ?? 0) + 6)),
        width: 7,
        material: Cesium.Color.fromCssColorString(color).withAlpha(0.85),
      },
    });
  }
  // 이벤트 마커 (50%/90% 탐지 확정 지점)
  const mark = (tMin, text, color) => {
    if (tMin == null) return;
    const s = S.reduce((a, b) => (Math.abs(b.tMin - tMin) < Math.abs(a.tMin - tMin) ? b : a));
    ds.entities.add({
      position: Cesium.Cartesian3.fromDegrees(s.lon, s.lat, (s.h ?? 0) + 40),
      label: {
        text,
        font: '700 12px "Chakra Petch", monospace',
        fillColor: Cesium.Color.fromCssColorString(color),
        showBackground: true,
        backgroundColor: Cesium.Color.fromCssColorString('#04161d').withAlpha(0.85),
        backgroundPadding: new Cesium.Cartesian2(8, 5),
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
        scaleByDistance: new Cesium.NearFarScalar(3000, 1, 30000, 0.6),
      },
      point: {
        pixelSize: 8, color: Cesium.Color.fromCssColorString(color),
        outlineColor: Cesium.Color.BLACK, outlineWidth: 2,
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
      },
    });
  };
  mark(result.t50, `⚑ 탐지 50% · H+${Math.round(result.t50 ?? 0)}분`, '#e3b341');
  mark(result.t90, `⚑ 탐지 확정 90% · H+${Math.round(result.t90 ?? 0)}분`, '#3dd68c');
}

/** AAR 곡선 차트 — P누적 vs 시간 + NAI/DP/TAI 위상선 */
export function drawAarChart(canvas, result) {
  const dpr = window.devicePixelRatio || 1;
  const W = canvas.clientWidth || 420, H = 150;
  canvas.width = W * dpr; canvas.height = H * dpr;
  canvas.style.height = H + 'px';
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);
  const pad = { l: 36, r: 10, t: 10, b: 20 };
  const T = result.phase.totalMin;
  const X = (t) => pad.l + (t / T) * (W - pad.l - pad.r);
  const Y = (p) => H - pad.b - p * (H - pad.t - pad.b);
  ctx.clearRect(0, 0, W, H);

  // 격자 + 축 라벨
  ctx.strokeStyle = '#1c2530'; ctx.fillStyle = '#8494a6';
  ctx.font = '9px "Chakra Petch"'; ctx.lineWidth = 1;
  [0, 0.5, 0.9, 1].forEach((p) => {
    ctx.beginPath(); ctx.moveTo(pad.l, Y(p)); ctx.lineTo(W - pad.r, Y(p)); ctx.stroke();
    ctx.fillText(`${Math.round(p * 100)}%`, 5, Y(p) + 3);
  });
  // 위상선 NAI/DP/TAI
  [['NAI', result.phase.naiMin, '#64dfff'], ['DP', result.phase.dpMin, '#ffc857'], ['TAI', result.phase.taiMin, '#ff6969']]
    .forEach(([name, t, c]) => {
      ctx.strokeStyle = c; ctx.setLineDash([4, 3]);
      ctx.beginPath(); ctx.moveTo(X(t), pad.t); ctx.lineTo(X(t), H - pad.b); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = c; ctx.fillText(name, X(t) - 8, pad.t + 8);
    });
  // 누적 곡선
  ctx.beginPath();
  result.samples.forEach((s, i) => {
    if (i === 0) ctx.moveTo(X(s.tMin), Y(s.pCum));
    else ctx.lineTo(X(s.tMin), Y(s.pCum));
  });
  ctx.strokeStyle = '#f2a33c'; ctx.lineWidth = 2.2; ctx.stroke();
  // 시간축
  ctx.fillStyle = '#8494a6';
  for (let t = 0; t <= T; t += Math.max(10, Math.round(T / 6 / 10) * 10)) {
    ctx.fillText(`H+${Math.round(t)}`, X(t) - 8, H - 7);
  }
}

