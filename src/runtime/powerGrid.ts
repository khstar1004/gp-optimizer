/**
 * 전원 — 「몇 개를 살 수 있나」 옆에 「몇 개를 **켤 수 있나**」를 놓는다
 *
 * 지금까지 감시자산의 제약은 돈 하나였다. 예산이 되면 세우고, 세우면 켜져 있다.
 * 그런데 GP 에서 실제로 자산 수를 정하는 것은 **전원**인 경우가 더 많다 — 열상
 * 한 대가 400 W 를 먹고, 레이더가 900 W 를 먹는데, 발전기는 5 kW 이고 유류는
 * 헬기로 올라온다. 그래서 「TOD 를 한 대 더」는 돈 문제 이전에 발전기 문제다.
 *
 * 그리고 **정전은 골고루 오지 않는다.** 용량이 모자라면 부하를 끊는데, 무엇부터
 * 끊을지는 교리가 정한다 — 야간에 유일한 눈인 열상을 끄고 주간 카메라를 남기는
 * 부대는 없다. 그 순서를 자산마다 적어 두고, 모자라는 순간 낮은 것부터 떨어뜨린다.
 *
 * 떨어진 자산은 **감시 엔진에서도 빠진다.** 그래야 「전원이 모자라면 축선 공백이
 * 늘어난다」가 화면에서 성립한다. 전원 계기가 숫자로만 있고 탐지가 그대로면,
 * 그건 계기가 아니라 장식이다.
 *
 * Cesium 도 DOM 도 만지지 않는다.
 */
import { STATUS_COLOR as BASE_STATUS_COLOR } from './statusColor';

export type PowerAsset = {
  uid: string;
  name: string;
  short: string;
  /** 정격 소비전력 (W). 0 이면 전원이 필요 없는 자산(화기·크레모아 등) */
  powerW: number;
  /**
   * 차단 우선순위. **클수록 마지막까지 남긴다.**
   * 5 기반 · 4 야간 유일 관측 · 3 전천후 탐지 · 2 주간 광학 · 1 부가
   */
  priority: number;
};

export type Generator = {
  uid: string;
  name: string;
  /** 정격 출력 (W) */
  capacityW: number;
  /** 연료 탱크 (L) */
  fuelL: number;
  /** 무부하 소모 (L/h) — 발전기는 켜져 있기만 해도 먹는다 */
  idleLph: number;
  /** 정격부하 소모 (L/h) */
  fullLph: number;
  running: boolean;
};

export type PowerStatus = 'OK' | 'TIGHT' | 'SHED' | 'BLACKOUT';

export const STATUS_LABEL: Record<PowerStatus, string> = {
  OK: '여유',
  TIGHT: '빠듯함',
  SHED: '부하 차단',
  BLACKOUT: '정전',
};

export const STATUS_COLOR: Record<PowerStatus, string> = {
  OK: BASE_STATUS_COLOR.good,
  TIGHT: BASE_STATUS_COLOR.warn,
  SHED: '#f2793c',
  BLACKOUT: BASE_STATUS_COLOR.bad,
};

/**
 * 한랭 보정.
 *
 * 겨울 GP 의 전력 소모는 카탈로그 값이 아니다 — 광학 창의 결로방지 열선, 레이더
 * 도파관 히터, 배터리 보온이 붙는다. 영하로 내려갈수록 붙는 양이 는다.
 * (0 ℃ 에서 +10 %, −20 ℃ 에서 +40 %)
 */
export function coldFactor(tempC: number): number {
  return 1 + Math.max(0, (10 - tempC)) * 0.015;
}

export type PowerBalance = {
  demandW: number;        // 보정 후 총 요구
  nominalW: number;       // 카탈로그 합
  supplyW: number;        // 가동 중 발전기 합
  servedW: number;        // 실제로 공급되는 부하
  marginW: number;        // 여유 (음수면 부족)
  ratio: number;          // 부하율 (servedW / supplyW)
  offline: Array<{ uid: string; name: string; short: string; powerW: number }>;
  status: PowerStatus;
  fuelHours: number | null;   // 지금 부하로 몇 시간 (발전기 없으면 null)
  note: string;
};

/**
 * 전원 수지.
 *
 * 용량이 모자라면 **우선순위가 낮은 것부터** 끊는다. 같은 순위면 큰 부하부터 —
 * 한 대를 끊어 여러 대를 살리는 쪽이 관측 총량에 낫다.
 */
export function powerBalance(
  assets: readonly PowerAsset[],
  gens: readonly Generator[],
  opts: { tempC?: number } = {},
): PowerBalance {
  const k = coldFactor(opts.tempC ?? 15);
  const powered = assets.filter((a) => a.powerW > 0);
  const nominalW = powered.reduce((s, a) => s + a.powerW, 0);
  const demandW = Math.round(nominalW * k);
  const running = gens.filter((g) => g.running);
  const supplyW = running.reduce((s, g) => s + g.capacityW, 0);

  // 낮은 우선순위 · 큰 부하부터 끊는다
  const order = [...powered].sort((a, b) => (a.priority - b.priority) || (b.powerW - a.powerW));
  const offline: PowerBalance['offline'] = [];
  let servedW = demandW;
  for (const a of order) {
    if (servedW <= supplyW) break;
    servedW -= Math.round(a.powerW * k);
    offline.push({ uid: a.uid, name: a.name, short: a.short, powerW: a.powerW });
  }
  servedW = Math.max(0, servedW);

  const marginW = supplyW - servedW;
  const ratio = supplyW > 0 ? servedW / supplyW : 0;
  const status: PowerStatus = supplyW <= 0 && demandW > 0 ? 'BLACKOUT'
    : offline.length ? 'SHED'
      : ratio >= 0.85 ? 'TIGHT' : 'OK';

  // 연료 — 무부하에서도 먹고, 부하율만큼 더 먹는다
  let fuelHours: number | null = null;
  if (running.length) {
    const burnLph = running.reduce((s, g) => {
      const share = supplyW > 0 ? (g.capacityW / supplyW) * ratio : 0;
      return s + g.idleLph + (g.fullLph - g.idleLph) * Math.min(1, share);
    }, 0);
    const fuelL = running.reduce((s, g) => s + g.fuelL, 0);
    fuelHours = burnLph > 0 ? fuelL / burnLph : null;
  }

  const note = status === 'BLACKOUT'
    ? '가동 중인 발전기가 없습니다 — 전원이 필요한 자산은 전부 정지'
    : status === 'SHED'
      ? `${Math.round(servedW)}W 공급 / ${demandW}W 요구 — ${offline.length}개 자산 차단`
      : status === 'TIGHT'
        ? `부하율 ${Math.round(ratio * 100)}% — 한 대만 더 붙여도 차단이 시작됩니다`
        : `여유 ${Math.round(marginW)}W · 부하율 ${Math.round(ratio * 100)}%`;

  return { demandW, nominalW, supplyW, servedW, marginW, ratio, offline, status, fuelHours, note };
}

/** 차단 목록을 빠른 조회용 Set 으로. */
export function offlineSet(bal: PowerBalance): Set<string> {
  return new Set(bal.offline.map((o) => o.uid));
}

/** 이 부하를 감당하려면 발전기가 몇 kW 더 필요한가 (0 이면 충분). */
export function shortfallW(bal: PowerBalance): number {
  return Math.max(0, bal.demandW - bal.supplyW);
}

/** 연료 잔량을 시계로 — 「4.2시간」보다 「4시간 12분」이 근무 교대에 읽힌다. */
export function fmtFuelHours(h: number | null): string {
  if (h == null) return '—';
  if (!Number.isFinite(h)) return '—';
  const total = Math.max(0, Math.round(h * 60));
  return `${Math.floor(total / 60)}시간 ${String(total % 60).padStart(2, '0')}분`;
}
