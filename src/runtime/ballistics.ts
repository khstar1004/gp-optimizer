/**
 * 중화기 탄도 — 조준경 사다리와 「고각 N밀」의 근거.
 *
 * 조준경 화면의 눈금 간격이 위로 갈수록 좁아지는 것은 보기 좋으라고 그런 것이
 * 아니라 낙차가 거리의 제곱으로 늘기 때문이다. 그 사실이 화면에서 성립하려면
 * 눈금 위치가 실제로 그 계산에서 나와야 한다.
 *
 * 모델: 초속 890 m/s (12.7 mm 급)에서 시작해 항력에 의한 잔존속도 감소를
 * 선형으로 근사하고(1800 m 에서 약 28 % 손실), 그 비행시간 동안의 자유낙하를
 * 각도로 바꾼다. 정밀 사격표가 아니라 **눈금과 제원이 같은 근거에서 나오게**
 * 하기 위한 최소 모델이다.
 */

/** 총구속도 (m/s) — 12.7 mm 급 */
export const MUZZLE_MPS = 890;
/** NATO 밀 — 1 rad = 6400/2π 밀 */
export const MIL_PER_RAD = 6400 / (2 * Math.PI);
const G = 9.81;

/** 사거리까지의 비행시간 (초). 항력은 잔존속도의 선형 감소로 근사한다. */
export function timeOfFlightS(rangeM: number): number {
  const r = Math.max(0, rangeM);
  const vAvg = MUZZLE_MPS * (1 - 0.28 * Math.min(1, r / 1800));
  return r / Math.max(120, vAvg);
}

/** 그 사거리에서 필요한 고각 (NATO 밀). 조준경 사다리 눈금의 위치이기도 하다. */
export function superElevationMil(rangeM: number): number {
  const r = Math.max(1, rangeM);
  const t = timeOfFlightS(r);
  const dropM = 0.5 * G * t * t;
  return (dropM / r) * MIL_PER_RAD;
}

/** 측풍 편류 (NATO 밀) — 비행시간 동안 횡풍이 밀어낸 거리의 각도. */
export function windDriftMil(rangeM: number, crossWindMps: number): number {
  const r = Math.max(1, rangeM);
  return ((crossWindMps * timeOfFlightS(r)) / r) * MIL_PER_RAD;
}
