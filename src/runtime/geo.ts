/** 측지 유틸리티 — 10km 이내 국지 분석이므로 국지 평면 근사 사용 */

export type GeoPoint = { lon: number; lat: number };
export type SampledGeoPoint = GeoPoint & { cumM: number };
export type Waypoint = readonly [number, number];

export const R_EARTH = 6371008.8;
const D2R = Math.PI / 180;
const R2D = 180 / Math.PI;

/** (lon,lat)에서 방위각 azDeg, 거리 distM 만큼 이동한 지점 */
export function offset(lon: number, lat: number, azDeg: number, distM: number): GeoPoint {
  const az = azDeg * D2R;
  const dLat = (distM * Math.cos(az)) / R_EARTH;
  const dLon = (distM * Math.sin(az)) / (R_EARTH * Math.cos(lat * D2R));
  return { lon: lon + dLon * R2D, lat: lat + dLat * R2D };
}

/** 두 지점 간 거리(m) */
export function distM(lon1: number, lat1: number, lon2: number, lat2: number): number {
  const x = (lon2 - lon1) * D2R * Math.cos(((lat1 + lat2) / 2) * D2R) * R_EARTH;
  const y = (lat2 - lat1) * D2R * R_EARTH;
  return Math.hypot(x, y);
}

/** 1→2 방위각 (deg, 0=북, 시계방향) */
export function azimuthDeg(lon1: number, lat1: number, lon2: number, lat2: number): number {
  const x = (lon2 - lon1) * D2R * Math.cos(((lat1 + lat2) / 2) * D2R);
  const y = (lat2 - lat1) * D2R;
  let az = Math.atan2(x, y) * R2D;
  if (az < 0) az += 360;
  return az;
}

/** 방위각 차 (–180..180) */
export function azDelta(a: number, b: number): number {
  let d = ((a - b) % 360 + 540) % 360 - 180;
  return d;
}

/** 폴리라인을 일정 간격(stepM)으로 리샘플 → [{lon,lat,cumM}] */
export function resamplePath(waypoints: readonly Waypoint[], stepM: number): SampledGeoPoint[] {
  const out: SampledGeoPoint[] = [];
  let cum = 0;
  for (let i = 0; i < waypoints.length - 1; i++) {
    const [lon1, lat1] = waypoints[i];
    const [lon2, lat2] = waypoints[i + 1];
    const segLen = distM(lon1, lat1, lon2, lat2);
    const n = Math.max(1, Math.ceil(segLen / stepM));
    for (let k = 0; k < n; k++) {
      const t = k / n;
      out.push({ lon: lon1 + (lon2 - lon1) * t, lat: lat1 + (lat2 - lat1) * t, cumM: cum + segLen * t });
    }
    cum += segLen;
  }
  const last = waypoints[waypoints.length - 1];
  out.push({ lon: last[0], lat: last[1], cumM: cum });
  return out;
}

