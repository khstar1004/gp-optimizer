/**
 * 교차표적지정 (cross-cue) — 「내가 본 것」을 「우리가 보는 것」으로
 *
 * 자산을 여러 개 세워 두는 이유는 화면을 여러 개 갖기 위해서가 아니라, **하나가
 * 잡은 것을 나머지가 같이 볼 수 있기 때문**이다. 열상이 능선 너머 열원을 먼저
 * 잡고, 그 방위를 EO 가 받아 사람인지 노루인지 식별하고, 레이더가 속도를 확인하고,
 * 화기가 사거리에 드는지를 답한다 — 이 순서가 관측반이 실제로 하는 일이다.
 *
 * 그러려면 「저기 3.4km 에 뭔가」가 아니라 **번호와 좌표**가 있어야 한다
 * (`tracking.ts` 의 항적). 이 파일은 그 좌표를 받아, 배치된 자산 하나하나에게
 * 같은 질문을 던진다:
 *
 *   ① 지향을 돌리면 시야각 안에 드는가 (부채꼴은 돌릴 수 있다)
 *   ② 지금 날씨의 **실효** 거리 안에 드는가 (청천 제원이 아니라)
 *   ③ 지형이 막지 않는가 (능선 하나면 5km 레이더도 소용없다)
 *
 * 셋을 다 통과해야 「인계 가능」이다. 하나라도 걸리면 **무엇에 걸렸는지**를
 * 돌려준다 — 「안 보인다」가 아니라 「능선에 막혔다」여야 배치를 고칠 수 있다.
 *
 * Cesium 을 만지지 않는다. 지형 가시선은 함수로 주입받는다.
 */
import { azDelta, azimuthDeg, distM } from './geo';

export type CuePost = {
  uid: string;
  name: string;
  type: string;
  short: string;
  color: string;
  lon: number;
  lat: number;
  eyeH: number;
  aimAz: number;
  fov: number;
  feed: string;
};

export type CueVerdict = 'READY' | 'SLEW' | 'FAR' | 'MASKED' | 'BLIND';

export type CueResult = {
  post: CuePost;
  distM: number;
  bearingDeg: number;
  slewDeg: number;        // 지금 지향에서 몇 도 돌려야 하는가
  inFovNow: boolean;
  losOk: boolean;
  inRange: boolean;
  grade: '식별' | '인지' | '탐지' | '—';
  verdict: CueVerdict;
  reason: string;
  rangeM: number;         // 이 자산의 실효 탐지거리
};

const VERDICT_ORDER: Record<CueVerdict, number> = {
  READY: 0, SLEW: 1, FAR: 2, MASKED: 3, BLIND: 4,
};

/** 인계 판정 결과를 사람이 읽는 한 줄로. */
export const CUE_LABEL: Record<CueVerdict, string> = {
  READY: '즉시 관측',
  SLEW: '지향 전환 필요',
  FAR: '실효거리 초과',
  MASKED: '지형 차폐',
  BLIND: '관측 불가',
};

/**
 * 표적 하나를 배치된 자산 전체에 물어본다.
 *
 * @param posts    배치 자산 (부채꼴을 돌릴 수 있는 것들)
 * @param target   { lon, lat, h }
 * @param opts.perfOf  자산 → 실효 성능 (sensorPerformance.effectiveRanges 결과)
 * @param opts.losOk   지형 가시선 판정. 없으면 통과로 본다(격자 미계산 상태)
 * @returns 좋은 순서대로 정렬된 판정 목록
 */
export function cueSolution(
  posts: readonly CuePost[],
  target: { lon: number; lat: number; h?: number },
  opts: {
    perfOf: (post: CuePost) => { range: number; dri: readonly number[] } | null;
    losOk?: ((post: CuePost, tLon: number, tLat: number) => boolean) | null;
  },
): CueResult[] {
  const out: CueResult[] = [];
  for (const post of posts) {
    const d = distM(post.lon, post.lat, target.lon, target.lat);
    const bearing = azimuthDeg(post.lon, post.lat, target.lon, target.lat);
    const half = Math.min(180, (post.fov ?? 360) / 2);
    const slew = Math.abs(azDelta(bearing, post.aimAz));
    const inFovNow = post.fov >= 360 || slew <= half;
    const perf = opts.perfOf(post);
    const rangeM = perf?.range ?? 0;
    const inRange = rangeM > 0 && d <= rangeM;
    const losOk = opts.losOk ? opts.losOk(post, target.lon, target.lat) : true;
    const dri = perf?.dri ?? [0, 0, 0];

    let verdict: CueVerdict;
    let reason: string;
    if (!perf || rangeM <= 0) {
      verdict = 'BLIND';
      reason = '이 자산은 화면 채널이 없다 (탐지 전용)';
    } else if (!losOk) {
      verdict = 'MASKED';
      reason = '능선 차폐 — 지향을 돌려도 보이지 않는다';
    } else if (!inRange) {
      verdict = 'FAR';
      reason = `실효 ${Math.round(rangeM)}m < 표적 ${Math.round(d)}m`;
    } else if (!inFovNow) {
      verdict = 'SLEW';
      reason = `지향 ${Math.round(slew)}° 전환하면 시야 안 (현재 ±${Math.round(half)}°)`;
    } else {
      verdict = 'READY';
      reason = '현 지향 그대로 시야 안';
    }

    const grade = !inRange || !losOk ? '—'
      : d <= dri[2] ? '식별' : d <= dri[1] ? '인지' : '탐지';

    out.push({
      post, distM: d, bearingDeg: bearing, slewDeg: slew,
      inFovNow, losOk, inRange, grade, verdict, reason, rangeM,
    });
  }
  // 좋은 판정 먼저, 같은 판정이면 가까운 것 먼저
  out.sort((a, b) => (VERDICT_ORDER[a.verdict] - VERDICT_ORDER[b.verdict]) || (a.distM - b.distM));
  return out;
}

/** 실제로 지향을 돌려 관측에 넣을 수 있는 자산 (READY | SLEW). */
export function cueable(results: readonly CueResult[]): CueResult[] {
  return results.filter((r) => r.verdict === 'READY' || r.verdict === 'SLEW');
}

/** 인계 결과 한 줄 요약 — 토스트와 관측보고에 같은 문장을 쓴다. */
export function cueSummary(results: readonly CueResult[]): string {
  const ok = cueable(results);
  if (!ok.length) {
    const masked = results.filter((r) => r.verdict === 'MASKED').length;
    const far = results.filter((r) => r.verdict === 'FAR').length;
    return `인계 가능 자산 없음 — 차폐 ${masked} · 사거리 초과 ${far}`;
  }
  const head = ok.slice(0, 3)
    .map((r) => `${r.post.short}-${r.post.name.split('-')[1] ?? ''} ${(r.distM / 1000).toFixed(1)}km ${r.grade}`)
    .join(' · ');
  return `${ok.length}개 자산 인계 — ${head}${ok.length > 3 ? ' 외' : ''}`;
}
