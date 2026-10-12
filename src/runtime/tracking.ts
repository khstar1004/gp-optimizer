/**
 * 표적 추적 — 「보인다」에서 「무엇이 어디로 가고 있다」로
 *
 * 지금까지 화면에 걸리는 브래킷은 **한 프레임의 판정**이었다. 3.4km 에 탐지,
 * Pd 0.70 — 그것으로 끝이다. 그런데 관측반이 실제로 상급부대에 보고하는 것은
 * 그 한 장이 아니라 **그것이 무엇을 하고 있는가**다: 어느 방향으로, 얼마나
 * 빠르게, 이대로면 GP 까지 몇 분에 붙는가, 지금 우리 관측 안에 몇 분째 있는가.
 *
 * 그 값들은 위치 하나로는 나오지 않는다. **시간에 걸친 위치의 열**이 있어야
 * 나온다. 이 파일이 그 열을 들고 있다.
 *
 * Cesium 을 만지지 않는다 — 순수 계산이라 그대로 시험할 수 있다.
 */
import { distM, azimuthDeg, azDelta } from './geo';

export type Fix = { t: number; lon: number; lat: number; h: number };

export type Kinematics = {
  ok: boolean;
  speedMps: number;
  courseDeg: number;
  spanS: number;
  climbMps: number;
};

/** 속도·진로를 뽑기 위해 최소한 이만큼의 시간이 쌓여야 한다 (초). */
export const MIN_SPAN_S = 2.5;
/** 항적 보관 길이 (초) — 이보다 오래된 관측은 진로 판단을 흐린다. */
export const HISTORY_S = 45;
/**
 * 지상 표적이 낼 수 있는 최대 속도 (m/s). 이보다 빠른 「이동」은 이동이 아니다 —
 * 리허설 시간축을 사람이 끌었거나(스크럽), 축선이 다시 계산된 것이다. 그 순간을
 * 속도로 받아들이면 「도보 침투가 시속 200km」 같은 계기가 나온다.
 */
export const MAX_PLAUSIBLE_MPS = 35;
/**
 * 그러나 **속도만으로는 판별할 수 없다.** 리허설의 표적 위치는 축선 표본
 * (12 m 간격)에 물려 있어서, 몇 초에 한 칸씩 **한 프레임 만에 12 m 를 건너뛴다** —
 * 순간속도로 보면 60 m/s 다. 그것을 순간이동으로 처리하면 항적이 매번 끊겨
 * 속도도 진로도 영원히 나오지 않는다.
 *
 * 그래서 두 조건을 **함께** 본다: 절대 변위가 이만큼 크고(스크럽·재계산),
 * 그 변위가 낼 수 없는 속도일 것. 표본 한 칸은 이 문턱을 넘지 못한다.
 */
export const MAX_JUMP_M = 250;

/**
 * 항적의 운동 제원.
 *
 * 표본 두 개를 그냥 빼면 GPS 지터가 그대로 속도가 된다. 그래서 **보관 구간의
 * 처음과 끝**을 쓴다 — 사람 걸음(1~2 m/s)을 몇 초 창으로 재는 데는 이것이
 * 미분보다 안정적이고, 진로도 같은 근거에서 나온다.
 */
export function kinematics(hist: readonly Fix[]): Kinematics {
  const none = { ok: false, speedMps: 0, courseDeg: 0, spanS: 0, climbMps: 0 };
  if (!hist || hist.length < 2) return none;
  const a = hist[0];
  const b = hist[hist.length - 1];
  const spanS = (b.t - a.t) / 1000;
  if (spanS < MIN_SPAN_S) return { ...none, spanS };
  const d = distM(a.lon, a.lat, b.lon, b.lat);
  return {
    ok: true,
    speedMps: d / spanS,
    courseDeg: d < 0.5 ? 0 : azimuthDeg(a.lon, a.lat, b.lon, b.lat),
    spanS,
    climbMps: (b.h - a.h) / spanS,
  };
}

/**
 * 어떤 지점으로의 **접근률** (m/s, 양수 = 다가온다).
 *
 * 표적 속도 전체가 아니라 그 지점을 향한 성분만이 도달시간을 정한다 —
 * 3 m/s 로 달려도 GP 를 스쳐 지나가는 축선이면 영원히 도착하지 않는다.
 */
export function closingRateMps(
  k: Kinematics,
  fromLon: number, fromLat: number,
  toLon: number, toLat: number,
): number {
  if (!k.ok || k.speedMps < 0.05) return 0;
  const bearingToTarget = azimuthDeg(fromLon, fromLat, toLon, toLat);
  return k.speedMps * Math.cos((azDelta(k.courseDeg, bearingToTarget) * Math.PI) / 180);
}

/** 접근률로 본 도달 예상시간 (초). 멀어지거나 정지면 null. */
export function etaSeconds(distanceM: number, closingMps: number): number | null {
  if (!(closingMps > 0.15)) return null;
  return distanceM / closingMps;
}

/** 초 → `M:SS` / `H:MM:SS`. 계기에는 소수점이 아니라 시계가 필요하다. */
export function fmtDuration(sec: number): string {
  const s = Math.max(0, Math.round(sec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  const two = (n: number) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${two(m)}:${two(ss)}` : `${m}:${two(ss)}`;
}

/** 방위각 → 8방위 한글. 보고문에 「047°」보다 「북동」이 먼저 읽힌다. */
export function compassKo(azDeg: number): string {
  const dirs = ['북', '북동', '동', '남동', '남', '남서', '서', '북서'];
  return dirs[Math.round((((azDeg % 360) + 360) % 360) / 45) % 8];
}

/**
 * 이동속도로 본 이동 양상. 도보 침투 판단의 언어를 그대로 쓴다.
 * (침투 시뮬레이션의 MOVE_MODES 와 같은 자릿수)
 */
export function motionLabel(speedMps: number): string {
  if (speedMps < 0.15) return '정지';
  if (speedMps < 0.7) return '포복·은밀';
  if (speedMps < 1.6) return '도보';
  if (speedMps < 3.2) return '급속도보';
  if (speedMps < 9) return '차량(저속)';
  return '차량';
}

export type Track = {
  id: string;
  key: string;
  name: string;
  hist: Fix[];
  firstAt: number;
  lastAt: number;
};

/**
 * 항적부 — 관측된 것에 **번호를 준다**.
 *
 * 번호가 있어야 인계가 성립한다. 「저기 3.4km 에 뭔가」로는 다른 자산에게
 * 넘길 수 없지만 「T01」이면 넘길 수 있고, 넘겨받은 쪽이 같은 것을 보고 있는지
 * 확인할 수도 있다.
 */
export class TrackBook {
  tracks = new Map<string, Track>();
  private seq = 0;

  /** 이 관측을 항적에 넣는다. 처음 보는 것이면 번호를 발급한다. */
  observe(key: string, name: string, fix: Fix): Track {
    let tr = this.tracks.get(key);
    if (!tr) {
      this.seq += 1;
      tr = {
        id: `T${String(this.seq).padStart(2, '0')}`,
        key, name, hist: [], firstAt: fix.t, lastAt: fix.t,
      };
      this.tracks.set(key, tr);
    }
    const last = tr.hist[tr.hist.length - 1];
    // 같은 프레임에 여러 창이 같은 표적을 보고해도 항적은 한 번만 자란다
    if (!last || fix.t - last.t >= 200) {
      // 순간이동은 이동이 아니다 — 시간축 스크럽·축선 재계산이면 항적을 새로 시작한다.
      // (섞어 두면 그 뒤 수십 초 동안 속도와 도달시간이 통째로 거짓이 된다)
      if (last) {
        const dt = (fix.t - last.t) / 1000;
        const jumpM = distM(last.lon, last.lat, fix.lon, fix.lat);
        if (dt > 0 && jumpM > MAX_JUMP_M && jumpM / dt > MAX_PLAUSIBLE_MPS) {
          tr.hist.length = 0;
          tr.firstAt = fix.t;
        }
      }
      tr.hist.push(fix);
      tr.lastAt = fix.t;
      const cutoff = fix.t - HISTORY_S * 1000;
      while (tr.hist.length > 2 && tr.hist[0].t < cutoff) tr.hist.shift();
    }
    return tr;
  }

  get(key: string): Track | null { return this.tracks.get(key) ?? null; }

  /** 오래 보이지 않은 항적은 지운다 — 번호는 재사용하지 않는다. */
  prune(nowMs: number, staleS = 120): void {
    for (const [key, tr] of this.tracks) {
      if (nowMs - tr.lastAt > staleS * 1000) this.tracks.delete(key);
    }
  }

  clear(): void { this.tracks.clear(); }
}

// ═══════════════════════════════════════════════════════════════════════════
// 예측 진로 — 지금 속도로 계속 가면 어디에, 언제
// ═══════════════════════════════════════════════════════════════════════════

/**
 * 항적을 앞으로 밀어 본다 (추측항법).
 *
 * 관측의 값어치는 「지금 어디 있나」가 아니라 「**언제 어디에 닿나**」에서 나온다.
 * 곡선 예측은 근거가 없으므로 직선 등속으로만 민다 — 그 이상은 지어내는 것이다.
 */
export function deadReckon(
  point: { lon: number; lat: number },
  k: Kinematics | null,
  seconds: number,
): { lon: number; lat: number } | null {
  if (!k?.ok || k.speedMps < 0.05) return null;
  const rad = Math.PI / 180;
  const R = 6371008.8;
  const d = k.speedMps * seconds;
  const lat = point.lat + (d * Math.cos(k.courseDeg * rad)) / R / rad;
  const lon = point.lon + (d * Math.sin(k.courseDeg * rad)) / (R * Math.cos(point.lat * rad)) / rad;
  return { lon, lat };
}

/**
 * 이 항적이 화기 사거리에 언제 드는가.
 *
 * 「사거리 안이다/밖이다」는 정지한 표적의 말이다. 움직이는 표적에는 **몇 초 뒤에
 * 든다**가 답이고, 그 숫자가 있어야 조명·사격 준비 시점을 정할 수 있다.
 *
 * @returns 빨리 드는 것부터. 이미 안이면 `inS: 0`.
 */
export function weaponEntry<T extends { lon: number; lat: number; rangeM: number }>(
  point: { lon: number; lat: number },
  k: Kinematics | null,
  weapons: readonly T[],
  opts: { horizonS?: number; stepS?: number } = {},
): Array<T & { inS: number; atM: number }> {
  const horizonS = opts.horizonS ?? 600;
  const stepS = opts.stepS ?? 10;
  const out: Array<T & { inS: number; atM: number }> = [];
  for (const w of weapons) {
    const d0 = distM(point.lon, point.lat, w.lon, w.lat);
    if (d0 <= w.rangeM) { out.push({ ...w, inS: 0, atM: d0 }); continue; }
    if (!k?.ok || k.speedMps < 0.05) continue;
    let found: { inS: number; atM: number } | null = null;
    for (let t = stepS; t <= horizonS; t += stepS) {
      const p = deadReckon(point, k, t);
      if (!p) break;
      const d = distM(p.lon, p.lat, w.lon, w.lat);
      if (d <= w.rangeM) { found = { inS: t, atM: d }; break; }
    }
    if (found) out.push({ ...w, ...found });
  }
  return out.sort((a, b) => a.inS - b.inS);
}
