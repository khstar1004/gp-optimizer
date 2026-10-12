/**
 * 관측보고 (SPOTREP) — 화면 한 장을 보고문 한 장으로
 *
 * 관측반이 표적을 잡으면 다음에 하는 일은 화면을 더 보는 것이 아니라 **보고**다.
 * 그리고 보고에 들어가는 항목은 정해져 있다 — SALUTE (규모·활동·위치·부대·시간·장비).
 *
 * 이 앱은 그 항목을 이미 전부 알고 있다: 항적이 규모·활동을, LRF 와 지형이 위치를,
 * 시뮬레이션 시각이 시간을, 광학 프로파일이 장비를 안다. 흩어져 있을 뿐이다.
 * 여기서 한 장으로 모은다.
 *
 * 「관측 조건」 절이 이 보고문의 핵심이다. 같은 표적을 같은 자산으로 봐도 눈이
 * 오면 등급이 내려간다 — 보고를 받는 쪽은 **그 판정이 어떤 조건에서 나왔는지**를
 * 알아야 믿을지 말지를 정할 수 있다. 「식별」한 줄만 오는 보고는 검증할 수 없다.
 *
 * Cesium 을 만지지 않는다 — 값만 받아 문자열을 만든다.
 */
import { compassKo, fmtDuration, motionLabel } from './tracking';

export type SpotrepInput = {
  dtg: string;                    // 시뮬레이션 DTG
  observer: {
    name: string;                 // 자산 이름 (IR-01 …)
    optic: string;                // 광학 이름 (열상감시장비 (TOD) …)
    tag: string;                  // 채널 태그
    mgrs: string;
    eyeH: number;
    azDeg: number;
    elDeg: number;
    zoom: number;
    palette: string;
  };
  target: {
    trackId: string | null;
    name: string | null;
    mgrs: string;
    distM: number;
    bearingDeg: number;
    elevationM: number | null;
    grade: string;
    pd: number | null;
    speedMps: number | null;
    courseDeg: number | null;
    observedS: number | null;
    etaToGpS: number | null;
    distToGpM: number | null;
    source: 'track' | 'lrf' | 'aim';
  };
  conditions: {
    weather: string;
    tempC: number;
    windMps: number;
    visibilityM: number;
    lux: number;
    deltaT: number;
    illuminated: boolean;
    snowCover: number;
  };
  performance: {
    rangeM: number;
    specRangeM: number;
    limiter: string;
    verdict: string;
    note: string;
  } | null;
  cue?: string | null;            // 인계 요약 한 줄
};

// 이 보고서는 격자 이격거리를 2 자리(㎞)로 못 박는 테스트가 있다 — 화면용 sensorPerformance.fmtM(1자리)와
// 정밀도가 다른 것은 드리프트가 아니라 SPOTREP 서식의 의도된 요구사항이다. 통합하지 않는다.
const fmtM = (m: number) => (m >= 1000 ? `${(m / 1000).toFixed(2)}km` : `${Math.round(m)}m`);
const az3 = (a: number) => String(Math.round(((a % 360) + 360) % 360)).padStart(3, '0');
const fmtLux = (lux: number) => (lux >= 10 ? `${Math.round(lux)} lx` : `${lux.toFixed(3)} lx`);

/**
 * SALUTE 골격의 관측보고 본문.
 *
 * 값이 없는 항목은 **비워 두지 않고 「미상」이라고 적는다** — 빈칸은 읽는 쪽에서
 * 「0」이나 「해당 없음」으로 오해되지만, 미상은 미상으로 읽힌다.
 */
export function buildSpotrep(input: SpotrepInput): string {
  const { observer: o, target: t, conditions: c, performance: p } = input;
  const unknown = '미상';

  const activity = t.speedMps != null && t.courseDeg != null
    ? `${motionLabel(t.speedMps)} · ${compassKo(t.courseDeg)}(${az3(t.courseDeg)}°)로 이동 · ${t.speedMps.toFixed(1)} m/s`
    : t.source === 'lrf' ? '레이저 측거점 (이동 판단 없음)' : unknown;

  const eta = t.etaToGpS != null
    ? `GP 도달 예상 ${fmtDuration(t.etaToGpS)} (이격 ${fmtM(t.distToGpM ?? 0)})`
    : t.distToGpM != null ? `GP 이격 ${fmtM(t.distToGpM)} · 접근 아님` : unknown;

  const lines = [
    '━━━ 관측보고 (SPOTREP) ━━━',
    `일시(DTG)   ${input.dtg}`,
    `보고자산    ${o.name} · ${o.optic} [${o.tag}]`,
    `관측점      ${o.mgrs} · 관측고 ${Math.round(o.eyeH)}m · 지향 ${az3(o.azDeg)}° / 부앙 ${o.elDeg.toFixed(1)}° · ×${o.zoom} · ${o.palette}`,
    '',
    `S 규모      ${t.trackId ? `항적 ${t.trackId}` : '단일 접촉'}${t.name ? ` (${t.name})` : ''}`,
    `A 활동      ${activity}`,
    `L 위치      ${t.mgrs} · 관측점 기준 ${az3(t.bearingDeg)}° / ${fmtM(t.distM)}`
      + `${t.elevationM != null ? ` · 표고 ${Math.round(t.elevationM)}m` : ''}`,
    `U 부대      ${unknown} (식별 근거 없음 — 관측 등급 「${t.grade}」)`,
    `T 시각      관측 개시 후 ${t.observedS != null ? fmtDuration(t.observedS) : unknown} 경과 · ${eta}`,
    `E 장비      ${unknown}`,
    '',
    '━━━ 관측 조건 ━━━',
    `기상        ${c.weather} · ${c.tempC.toFixed(0)}℃ · 풍 ${c.windMps.toFixed(1)} m/s`
      + `${c.snowCover > 0.05 ? ` · 적설 ${Math.round(c.snowCover * 100)}%` : ''}`,
    `광학 조건   조도 ${fmtLux(c.lux)}${c.illuminated ? ' (조명 지원 중)' : ''}`
      + ` · 시정 ${fmtM(c.visibilityM)} · 열대비 ΔT ${c.deltaT.toFixed(1)}K`,
  ];

  if (p) {
    lines.push(
      `센서 성능   실효 ${fmtM(p.rangeM)} / 청천 ${fmtM(p.specRangeM)}`
        + ` (${Math.round((p.rangeM / Math.max(1, p.specRangeM)) * 100)}%) · 판정 ${p.verdict}`,
      `제한 요인   ${p.limiter} — ${p.note}`,
    );
  }
  if (t.pd != null) {
    lines.push(`탐지확률    P(d) ${t.pd.toFixed(2)} · 관측 등급 ${t.grade}`);
  }
  if (input.cue) {
    lines.push('', '━━━ 교차표적지정 ━━━', `인계        ${input.cue}`);
  }

  lines.push(
    '',
    '※ 합성 데모 자료 — 실기준 아님. 등급·확률은 현재 환경 모델에서 계산된 값이다.',
  );
  return lines.join('\n');
}

/** 파일 이름 — 정렬되도록 DTG 를 앞에 둔다. */
export function spotrepFilename(input: SpotrepInput): string {
  const stamp = input.dtg.replace(/[^0-9]/g, '').slice(0, 12) || 'nodtg';
  const who = input.observer.tag.replace(/[^A-Za-z0-9-]/g, '');
  const what = input.target.trackId ?? 'LRF';
  return `SPOTREP_${stamp}_${who}_${what}`;
}
