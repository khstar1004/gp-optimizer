/**
 * 상시 감시 엔진 — 「내가 볼 때만 탐지된다」를 끝낸다
 *
 * 지금까지 표적 판정은 **1인칭 화면이 켜져 있을 때만** 일어났다. 그 화면을 닫으면
 * 아무 일도 없었던 것이 된다. 그런데 GP 의 감시자산은 사람이 보든 말든 계속 서
 * 있고, 관측반이 하는 일은 화면을 들여다보는 것이 아니라 **경보를 받는 것**이다.
 * 「누가 언제 처음 잡았는가」가 남지 않으면 그 배치가 작동했는지 뒤에 물을 수 없다.
 *
 * 그래서 여기서는 배치된 자산 전체를 매초 한 번씩 표적에 대고 판정한다. 규칙은
 * 화면과 같다 — **지금 지향**(돌리지 않는다) · **지금 날씨의 실효거리** · **지형
 * 가시선**. 셋을 통과한 자산이 그 표적을 「잡고 있다」이고, 그 집합이 바뀌는 순간이
 * 사건이다: 처음 잡힘 · 등급 상승 · 놓침 · 재획득.
 *
 * 두 가지를 같은 규칙으로 답한다:
 *   ① 지금  — 어느 표적을 어느 자산이 어느 등급으로 잡고 있는가 (경보·로그)
 *   ② 나중  — 이 침투 축선 전 구간에서 언제 처음 잡히고 어디가 비는가 (공백 분석)
 *
 * Cesium 을 만지지 않는다. 지형 가시선과 실효 성능은 함수로 주입받는다.
 */
import { azDelta, azimuthDeg, distM } from './geo';

export type WatchAsset = {
  uid: string;
  name: string;
  short: string;
  type: string;
  color: string;
  lon: number;
  lat: number;
  eyeH: number;
  aimAz: number;
  fov: number;
};

export type WatchTarget = { key: string; name: string; lon: number; lat: number; h?: number };

export type Grade = '탐지' | '인지' | '식별';

export type Hold = {
  assetUid: string;
  assetName: string;
  assetShort: string;
  color: string;
  grade: Grade;
  rank: number;
  distM: number;
  pd: number;
};

export type TrackWatch = {
  key: string;
  name: string;
  holders: Hold[];
  best: Hold | null;
  rank: number;          // 0 = 아무도 못 봄
};

export type WatchSnapshot = Map<string, TrackWatch>;

export type WatchEventKind = 'ACQUIRE' | 'REACQUIRE' | 'UPGRADE' | 'DOWNGRADE' | 'LOST';

export type WatchEvent = {
  kind: WatchEventKind;
  at: number;
  key: string;
  name: string;
  grade: Grade | null;
  prevGrade: Grade | null;
  assetUid: string | null;
  assetName: string | null;
  assetShort: string | null;
  color: string | null;
  distM: number | null;
  pd: number | null;
  holders: number;
};

export const GRADE_RANK: Record<Grade, number> = { 탐지: 1, 인지: 2, 식별: 3 };

/** 사건 종류별 표시 규약 — 로그·경보·AAR 이 같은 색과 말을 쓴다. */
export const EVENT_LABEL: Record<WatchEventKind, string> = {
  ACQUIRE: '최초 탐지',
  REACQUIRE: '재획득',
  UPGRADE: '등급 상승',
  DOWNGRADE: '등급 하락',
  LOST: '접촉 상실',
};

export const EVENT_COLOR: Record<WatchEventKind, string> = {
  ACQUIRE: '#ed5d5d',
  REACQUIRE: '#e3b341',
  UPGRADE: '#3dd68c',
  DOWNGRADE: '#e3b341',
  LOST: '#7f8c98',
};

const gradeAt = (dri: readonly number[], d: number): Grade =>
  (d <= dri[2] ? '식별' : d <= dri[1] ? '인지' : '탐지');

/**
 * 지금 이 배치가 실제로 무엇을 잡고 있는가.
 *
 * `crossCue` 와 달리 **지향을 돌리지 않는다** — 인계는 「돌리면 볼 수 있는가」를
 * 묻지만, 감시는 「지금 그대로 보고 있는가」를 묻는다. 그 차이가 배치 평가의 전부다.
 */
export function evaluateWatch(
  assets: readonly WatchAsset[],
  targets: readonly WatchTarget[],
  opts: {
    perfOf: (a: WatchAsset) => { range: number; dri: readonly number[] } | null;
    losOk?: ((a: WatchAsset, lon: number, lat: number) => boolean) | null;
    detectionProbability?: (perf: { range: number; dri: readonly number[] }, d: number) => number;
  },
): WatchSnapshot {
  const out: WatchSnapshot = new Map();
  // 자산별 성능은 표적 수만큼 다시 풀 이유가 없다
  const perfCache = new Map<string, { range: number; dri: readonly number[] } | null>();
  const perfFor = (a: WatchAsset) => {
    if (!perfCache.has(a.uid)) perfCache.set(a.uid, opts.perfOf(a));
    return perfCache.get(a.uid) ?? null;
  };

  for (const t of targets) {
    const holders: Hold[] = [];
    for (const a of assets) {
      const perf = perfFor(a);
      if (!perf || perf.range <= 0) continue;
      const d = distM(a.lon, a.lat, t.lon, t.lat);
      if (d > perf.range) continue;
      if (a.fov < 360 && Math.abs(azDelta(azimuthDeg(a.lon, a.lat, t.lon, t.lat), a.aimAz)) > a.fov / 2) continue;
      if (opts.losOk && !opts.losOk(a, t.lon, t.lat)) continue;
      const grade = gradeAt(perf.dri, d);
      holders.push({
        assetUid: a.uid, assetName: a.name, assetShort: a.short, color: a.color,
        grade, rank: GRADE_RANK[grade], distM: d,
        pd: opts.detectionProbability ? opts.detectionProbability(perf, d) : 1,
      });
    }
    // 가장 좋은 등급이 이 표적의 판정이다. 같은 등급이면 가까운 자산이 대표.
    holders.sort((x, y) => (y.rank - x.rank) || (x.distM - y.distM));
    out.set(t.key, {
      key: t.key, name: t.name, holders,
      best: holders[0] ?? null,
      rank: holders[0]?.rank ?? 0,
    });
  }
  return out;
}

/**
 * 두 스냅샷의 차이 = 사건.
 *
 * 상태를 매초 찍어 두기만 하면 로그가 아니라 잡음이 된다. **바뀐 순간만** 남겨야
 * 「23:14 에 IR-01 이 처음 잡았고 23:16 에 능선에 가려 놓쳤다」가 읽힌다.
 *
 * @param everSeen 이미 한 번 잡힌 적 있는 표적 — 처음 잡힘과 재획득을 가른다 (변경됨)
 */
export function diffWatch(
  prev: WatchSnapshot | null,
  next: WatchSnapshot,
  nowMs: number,
  everSeen: Set<string>,
): WatchEvent[] {
  const events: WatchEvent[] = [];
  const mk = (kind: WatchEventKind, w: TrackWatch, prevGrade: Grade | null): WatchEvent => ({
    kind, at: nowMs, key: w.key, name: w.name,
    grade: w.best?.grade ?? null,
    prevGrade,
    assetUid: w.best?.assetUid ?? null,
    assetName: w.best?.assetName ?? null,
    assetShort: w.best?.assetShort ?? null,
    color: w.best?.color ?? null,
    distM: w.best?.distM ?? null,
    pd: w.best?.pd ?? null,
    holders: w.holders.length,
  });

  for (const [key, w] of next) {
    const p = prev?.get(key) ?? null;
    const prevRank = p?.rank ?? 0;
    const prevGrade = p?.best?.grade ?? null;
    if (w.rank > 0 && prevRank === 0) {
      const kind: WatchEventKind = everSeen.has(key) ? 'REACQUIRE' : 'ACQUIRE';
      everSeen.add(key);
      events.push(mk(kind, w, prevGrade));
    } else if (w.rank === 0 && prevRank > 0) {
      events.push({ ...mk('LOST', w, prevGrade), grade: null, assetUid: null, assetName: null,
        assetShort: p?.best?.assetShort ?? null, color: p?.best?.color ?? null,
        distM: p?.best?.distM ?? null, pd: null });
    } else if (w.rank > prevRank && prevRank > 0) {
      events.push(mk('UPGRADE', w, prevGrade));
    } else if (w.rank < prevRank && w.rank > 0) {
      events.push(mk('DOWNGRADE', w, prevGrade));
    }
  }
  // 사라진 표적(리허설 종료·경로 삭제)도 접촉 상실로 닫는다
  if (prev) {
    for (const [key, p] of prev) {
      if (next.has(key) || p.rank === 0) continue;
      events.push({
        kind: 'LOST', at: nowMs, key, name: p.name, grade: null, prevGrade: p.best?.grade ?? null,
        assetUid: null, assetName: null, assetShort: p.best?.assetShort ?? null,
        color: p.best?.color ?? null, distM: p.best?.distM ?? null, pd: null, holders: 0,
      });
    }
  }
  return events;
}

// ═══════════════════════════════════════════════════════════════════════════
// 시간축 감시 공백 — 「전 구간에서 언제 처음 잡히고 어디가 비는가」
// ═══════════════════════════════════════════════════════════════════════════

export type CoverStep = {
  i: number;
  lon: number;
  lat: number;
  cumM: number;       // 축선 시작점부터의 이동거리
  distToGpM: number;
  rank: number;
  grade: Grade | null;
  assetShort: string | null;
  holders: number;
};

export type CoverGap = {
  fromCumM: number;
  toCumM: number;
  lengthM: number;
  nearestGpM: number;
  /** 공백 한가운데 — 「여기에 하나 더 세우면 메워진다」의 그 지점 */
  midLon: number;
  midLat: number;
};

/**
 * GP 직전 공백을 경고로 올릴 최소 길이 (m).
 *
 * 표본 한 칸(50 m)짜리 공백까지 경고하면, 정작 2.8 km 가 비어 있는 축선의 경고가
 * 같은 무게로 묻힌다. 전부 울리는 경보는 아무것도 울리지 않는 것과 같다.
 */
export const FINAL_GAP_WARN_M = 150;

export type RouteCoverage = {
  routeId: string;
  routeName: string;
  totalM: number;
  steps: CoverStep[];
  coveredRatio: number;              // 관측된 구간 길이 / 전체
  identifiedRatio: number;           // 식별 등급 이상 구간 비율
  firstDetect: { cumM: number; distToGpM: number; assetShort: string; grade: Grade } | null;
  gaps: CoverGap[];
  longestGap: CoverGap | null;
  finalGapM: number;                 // GP 직전 마지막 공백 길이 (0 이면 끝까지 관측)
};

/**
 * 축선 하나를 처음부터 끝까지 걸어 보며 매 걸음의 판정을 남긴다.
 *
 * 공간 커버리지(「어디가 보이는가」)와 다른 물음이다 — 침투 부대는 **한 점에
 * 머물지 않는다**. 어느 지점이 보이느냐가 아니라 **그 부대가 지나가는 동안 몇 %의
 * 구간에서 잡혀 있었고, 어디서 끊겼는가**가 배치의 성적표다. 특히 마지막 공백 —
 * GP 코앞에서 놓치는 구간 — 이 가장 비싸다.
 */
export function routeCoverage(
  route: { id: string; name: string; pts: ReadonlyArray<{ lon: number; lat: number; cumM?: number }>; totalM: number },
  assets: readonly WatchAsset[],
  gp: { lon: number; lat: number },
  opts: {
    perfOf: (a: WatchAsset) => { range: number; dri: readonly number[] } | null;
    losOk?: ((a: WatchAsset, lon: number, lat: number) => boolean) | null;
    stepM?: number;
  },
): RouteCoverage {
  const stepM = opts.stepM ?? 50;
  const pts = route.pts;
  const n = pts.length;
  const steps: CoverStep[] = [];
  if (!n) {
    return {
      routeId: route.id, routeName: route.name, totalM: route.totalM, steps: [],
      coveredRatio: 0, identifiedRatio: 0, firstDetect: null, gaps: [], longestGap: null,
      finalGapM: route.totalM,
    };
  }
  // 경로 표본이 조밀하면 건너뛰며 본다 — 50m 마다면 사람이 30초에 지나는 거리다
  const spacing = route.totalM / Math.max(1, n - 1);
  const stride = Math.max(1, Math.round(stepM / Math.max(1, spacing)));

  for (let i = 0; i < n; i += stride) {
    const p = pts[i];
    const snap = evaluateWatch(assets, [{ key: 't', name: route.name, lon: p.lon, lat: p.lat }], opts);
    const w = snap.get('t')!;
    steps.push({
      i,
      lon: p.lon, lat: p.lat,
      cumM: p.cumM ?? i * spacing,
      distToGpM: distM(p.lon, p.lat, gp.lon, gp.lat),
      rank: w.rank,
      grade: w.best?.grade ?? null,
      assetShort: w.best?.assetShort ?? null,
      holders: w.holders.length,
    });
  }

  // 구간 길이 기준 비율 — 표본 개수로 세면 표본 간격이 다를 때 거짓말이 된다
  let coveredM = 0;
  let identifiedM = 0;
  const gaps: CoverGap[] = [];
  let gapStart: number | null = null;
  for (let k = 0; k < steps.length; k += 1) {
    const s = steps[k];
    const nextCum = k + 1 < steps.length ? steps[k + 1].cumM : route.totalM;
    const segM = Math.max(0, nextCum - s.cumM);
    if (s.rank > 0) {
      coveredM += segM;
      if (s.rank >= GRADE_RANK.식별) identifiedM += segM;
      if (gapStart != null) {
        gaps.push(makeGap(gapStart, s.cumM, steps));
        gapStart = null;
      }
    } else if (gapStart == null) {
      gapStart = s.cumM;
    }
  }
  if (gapStart != null) gaps.push(makeGap(gapStart, route.totalM, steps));

  const first = steps.find((s) => s.rank > 0) ?? null;
  const lastStep = steps[steps.length - 1];
  const finalGap = lastStep && lastStep.rank === 0 && gaps.length
    ? gaps[gaps.length - 1].lengthM
    : 0;

  return {
    routeId: route.id,
    routeName: route.name,
    totalM: route.totalM,
    steps,
    coveredRatio: route.totalM > 0 ? coveredM / route.totalM : 0,
    identifiedRatio: route.totalM > 0 ? identifiedM / route.totalM : 0,
    firstDetect: first
      ? { cumM: first.cumM, distToGpM: first.distToGpM, assetShort: first.assetShort!, grade: first.grade! }
      : null,
    gaps,
    longestGap: gaps.reduce<CoverGap | null>((a, b) => (!a || b.lengthM > a.lengthM ? b : a), null),
    finalGapM: finalGap,
  };
}

function makeGap(fromCumM: number, toCumM: number, steps: readonly CoverStep[]): CoverGap {
  const inside = steps.filter((s) => s.cumM >= fromCumM && s.cumM <= toCumM);
  const nearestGpM = inside.length ? Math.min(...inside.map((s) => s.distToGpM)) : Number.NaN;
  // 공백의 한가운데 — 「어디가 비었나」에 좌표로 답할 수 있어야 배치를 고친다
  const mid = inside.length ? inside[Math.floor(inside.length / 2)] : null;
  return {
    fromCumM, toCumM, lengthM: Math.max(0, toCumM - fromCumM), nearestGpM,
    midLon: mid?.lon ?? Number.NaN, midLat: mid?.lat ?? Number.NaN,
  };
}

/** 공백 하나를 사람이 읽는 한 줄로 — 「어디가」를 GP 이격으로 말한다. */
export function describeGap(g: CoverGap): string {
  const km = (m: number) => (m >= 1000 ? `${(m / 1000).toFixed(1)}km` : `${Math.round(m)}m`);
  return `${km(g.lengthM)} 구간 (GP ${km(g.nearestGpM)} 지점까지 접근)`;
}
