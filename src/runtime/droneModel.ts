/**
 * 정찰드론 — 「한 대가 늘 떠 있다」가 아니라 **편대를 운용한다**
 *
 * 지금까지 드론은 화면 하나였다. 버튼을 누르면 어디선가 나타나 영원히 선회하고,
 * 끄면 사라진다. 그런데 드론이 감시자산으로서 값어치가 있는 이유는 바로 그
 * **유한함** 때문이다 — 40분 뜨고 25분 충전한다. 그래서 「지금 몇 대가 떠 있고
 * 몇 분 남았고 다음 기체는 언제 뜨는가」가 계획의 일부가 된다. 무한히 떠 있는
 * 드론은 자산이 아니라 배경이다.
 *
 * 이 파일은 그 유한함만 담는다 — 상태기계(대기·이륙·임무·복귀·충전), 배터리,
 * 선회 궤도. Cesium 도 DOM 도 만지지 않으므로 그대로 시험할 수 있다.
 */
import { azimuthDeg, distM, offset } from './geo';

export type DroneState = 'READY' | 'LAUNCH' | 'PATROL' | 'RTB' | 'CHARGE';

export const STATE_LABEL: Record<DroneState, string> = {
  READY: '대기',
  LAUNCH: '이륙 중',
  PATROL: '임무 중',
  RTB: '복귀 중',
  CHARGE: '충전 중',
};

export const STATE_COLOR: Record<DroneState, string> = {
  READY: '#7f8c98',
  LAUNCH: '#e3b341',
  PATROL: '#3dd68c',
  RTB: '#e3b341',
  CHARGE: '#5eb1ef',
};

/** 소형 정찰드론 제원 — 숫자를 한 곳에만 적는다. */
export const DRONE_SPEC = {
  enduranceMin: 40,        // 만충 체공 (분)
  chargeMin: 25,           // 완충까지 (분)
  cruiseMps: 18,           // 순항 대지속도
  climbMps: 6,             // 상승/하강률
  minAglM: 120,
  maxAglM: 900,
  minRadiusM: 250,
  maxRadiusM: 2200,
  /** 이 아래로 떨어지면 스스로 복귀한다 — 사람이 잊어도 기체는 돌아와야 한다. */
  rtbBattery: 0.25,
  /** 복귀 중 이 아래면 「비상」 — 화면에 붉게 뜬다. */
  criticalBattery: 0.1,
} as const;

export type Drone = {
  uid: string;
  name: string;
  state: DroneState;
  battery: number;            // 0~1
  payload: 'eo' | 'ir';
  /** 순찰 중심 — 이 점 둘레를 돈다. 짐벌은 늘 이 점을 문다. */
  patrolLon: number;
  patrolLat: number;
  /** 이착륙장 (배치된 GP 근처) */
  homeLon: number;
  homeLat: number;
  radiusM: number;
  aglM: number;
  /** 궤도상 현재 각 (deg) */
  angleDeg: number;
  /** 상승/하강 중 현재 고도 (m AGL) */
  curAglM: number;
  /** 누적 체공 (분) — 정비 판단의 근거 */
  flownMin: number;
  sorties: number;
};

let SEQ = 0;

export function makeDrone(over: Partial<Drone> = {}): Drone {
  SEQ += 1;
  return {
    uid: `uas${SEQ}`,
    name: `UAS-${String(SEQ).padStart(2, '0')}`,
    state: 'READY',
    battery: 1,
    payload: 'eo',
    patrolLon: 0, patrolLat: 0,
    homeLon: 0, homeLat: 0,
    radiusM: 900,
    aglM: 300,
    angleDeg: 0,
    curAglM: 0,
    flownMin: 0,
    sorties: 0,
    ...over,
  };
}

/** 시험을 위해 번호를 되돌린다. */
export function resetDroneSeq(n = 0): void { SEQ = n; }

/** 이 배터리로 남은 체공 (분). 지상에 있으면 만충 기준 체공시간을 뜻한다. */
export function enduranceMin(battery: number): number {
  return Math.max(0, battery * DRONE_SPEC.enduranceMin);
}

/** 선회 궤도 위의 현재 위치. */
export function orbitPoint(d: Drone): { lon: number; lat: number } {
  return offset(d.patrolLon, d.patrolLat, d.angleDeg, d.radiusM);
}

/** 궤도 각속도 (°/s) — 순항속도와 반경에서 나온다. 반경이 크면 천천히 돈다. */
export function orbitRateDegS(d: Drone): number {
  return (DRONE_SPEC.cruiseMps / Math.max(1, d.radiusM)) * (180 / Math.PI);
}

/** 짐벌은 늘 순찰 중심을 문다 — 그 방위가 이 기체의 감시 지향이다. */
export function gimbalAimDeg(d: Drone): number {
  const p = orbitPoint(d);
  return azimuthDeg(p.lon, p.lat, d.patrolLon, d.patrolLat);
}

/** 지금 이 기체가 실제로 관측하고 있는가 (지상·이착륙 중에는 아니다). */
export function isOnStation(d: Drone): boolean {
  return d.state === 'PATROL' || (d.state === 'RTB' && d.curAglM > DRONE_SPEC.minAglM * 0.5);
}

/**
 * 한 걸음.
 *
 * 배터리는 **떠 있는 동안만** 준다. 그리고 25% 아래로 떨어지면 사람이 잊어도
 * 기체가 스스로 복귀한다 — 자동 복귀가 없는 편대 관리는 관리가 아니라 도박이다.
 *
 * @param dtS 흐른 시간 (초)
 * @returns 이 걸음에서 일어난 사건 (없으면 null) — 편대 로그에 남긴다
 */
export function stepDrone(d: Drone, dtS: number): string | null {
  const drainPerS = 1 / (DRONE_SPEC.enduranceMin * 60);
  const chargePerS = 1 / (DRONE_SPEC.chargeMin * 60);
  let event: string | null = null;

  switch (d.state) {
    case 'READY':
      // 지상 대기 — 소모도 충전도 없다
      break;

    case 'CHARGE':
      d.battery = Math.min(1, d.battery + chargePerS * dtS);
      // 문턱을 넘는 순간 만충으로 확정한다 — 0.9995 인 채로 「충전 완료」라고
      // 적으면 화면의 100% 와 내부 값이 어긋난다
      if (d.battery >= 0.999) { d.battery = 1; d.state = 'READY'; event = '충전 완료 — 출격 대기'; }
      break;

    case 'LAUNCH':
      d.battery = Math.max(0, d.battery - drainPerS * dtS);
      d.flownMin += dtS / 60;
      d.curAglM = Math.min(d.aglM, d.curAglM + DRONE_SPEC.climbMps * dtS);
      if (d.curAglM >= d.aglM - 0.5) {
        d.curAglM = d.aglM;
        d.state = 'PATROL';
        event = `임무 고도 ${Math.round(d.aglM)}m 도달 — 감시 개시`;
      }
      break;

    case 'PATROL':
      d.battery = Math.max(0, d.battery - drainPerS * dtS);
      d.flownMin += dtS / 60;
      d.angleDeg = (d.angleDeg + orbitRateDegS(d) * dtS) % 360;
      // 지정 고도를 바꾸면 천천히 따라 올라간다/내려간다
      if (Math.abs(d.curAglM - d.aglM) > 0.5) {
        const dir = Math.sign(d.aglM - d.curAglM);
        d.curAglM += dir * Math.min(DRONE_SPEC.climbMps * dtS, Math.abs(d.aglM - d.curAglM));
      }
      if (d.battery <= DRONE_SPEC.rtbBattery) {
        d.state = 'RTB';
        event = `배터리 ${Math.round(d.battery * 100)}% — 자동 복귀 개시`;
      }
      break;

    case 'RTB':
      d.battery = Math.max(0, d.battery - drainPerS * dtS);
      d.flownMin += dtS / 60;
      d.curAglM = Math.max(0, d.curAglM - DRONE_SPEC.climbMps * dtS);
      if (d.curAglM <= 0.5) {
        d.curAglM = 0;
        d.state = 'CHARGE';
        d.sorties += 1;
        event = `착륙 — 소티 ${d.sorties}회 · 누적 체공 ${d.flownMin.toFixed(0)}분`;
      }
      break;
  }
  return event;
}

/** 출격. 이미 떠 있거나 배터리가 모자라면 이유를 돌려준다. */
export function launch(d: Drone): { ok: boolean; reason?: string } {
  if (d.state !== 'READY') return { ok: false, reason: `${STATE_LABEL[d.state]} 상태에서는 출격할 수 없습니다` };
  if (d.battery <= DRONE_SPEC.rtbBattery) {
    return { ok: false, reason: `배터리 ${Math.round(d.battery * 100)}% — 복귀 문턱 이하입니다` };
  }
  d.state = 'LAUNCH';
  d.curAglM = 0;
  return { ok: true };
}

/** 복귀 지시. 이미 지상이면 아무 일도 하지 않는다. */
export function recall(d: Drone): { ok: boolean; reason?: string } {
  if (d.state === 'READY' || d.state === 'CHARGE') {
    return { ok: false, reason: '이미 지상에 있습니다' };
  }
  d.state = 'RTB';
  return { ok: true };
}

/** 편대 요약 한 줄 — 「지금 몇 대가 떠 있고 다음은 언제」 */
export function fleetSummary(drones: readonly Drone[]): string {
  if (!drones.length) return '편대 없음';
  const air = drones.filter((d) => d.state === 'PATROL' || d.state === 'LAUNCH' || d.state === 'RTB');
  const ready = drones.filter((d) => d.state === 'READY');
  const charge = drones.filter((d) => d.state === 'CHARGE');
  const soonest = air.length
    ? Math.min(...air.map((d) => enduranceMin(d.battery)))
    : null;
  return `공중 ${air.length} · 대기 ${ready.length} · 충전 ${charge.length}`
    + (soonest != null ? ` · 최단 잔여 ${soonest.toFixed(0)}분` : '');
}

/**
 * 순찰 중심을 옮기면 궤도상 현재 각도 재계산 — 그러지 않으면 기체가 순간이동한다.
 * (지금 있는 자리에서 새 중심을 바라보는 각으로 맞춘다)
 */
export function retargetPatrol(d: Drone, lon: number, lat: number): void {
  const here = orbitPoint(d);
  d.patrolLon = lon;
  d.patrolLat = lat;
  d.radiusM = Math.max(DRONE_SPEC.minRadiusM,
    Math.min(DRONE_SPEC.maxRadiusM, distM(lon, lat, here.lon, here.lat) || d.radiusM));
  d.angleDeg = azimuthDeg(lon, lat, here.lon, here.lat);
}
