// @ts-nocheck
/**
 * KAIROS(수도) 전술 결심·도식 함수 — 원본에서 함수 단위로 추출.
 * TypeScript 타입 표기만 esbuild 로 제거했고 로직은 원본 그대로다.
 *
 * 원본:
 *   scoreRouteOption     client/src/gui/sudo/sudoDecisionEngine.ts:2190-2210
 *   destinationPoint     client/src/gui/sudo/SudoJangdoTacticalMap.tsx:868-891
 *   buildCirclePolygon   client/src/gui/sudo/SudoJangdoTacticalMap.tsx:893-910
 *   clipLineCoordinates  client/src/gui/sudo/SudoJangdoTacticalMap.tsx:1012-1057
 *   (D:\VISTA_sudo)
 *
 * scoreRouteOption 의 가중치 0.34 / 0.26 / 0.18 / 0.22 는 원본 값이다.
 * 원본에서 이 함수에 넘어오는 roadAssessment 는 수도권 도로정보표(9-1) 매칭 결과인데,
 * GP 합성 부지에는 해당 도로 데이터가 없어 ipb.js 가 지형 경사 여유로 roadScore 를 만든다.
 * 그 부분만 GP 고유이고, 점수 합성 규칙 자체는 원본이다.
 */

export function scoreRouteOption(option, roadAssessment) {
  const coverage = Number.isFinite(option.coverage) ? Math.max(0, Math.min(100, option.coverage)) : 0;
  const gap = Number.isFinite(option.gap) ? Math.max(0, Math.min(100, option.gap)) : 100;
  const fireLinkScore = Number.isFinite(option.fireLinkScore) ? Math.max(0, Math.min(100, option.fireLinkScore)) : 0;
  return Math.round(
    coverage * 0.34 + (100 - gap) * 0.26 + fireLinkScore * 0.18 + roadAssessment.roadScore * 0.22
  );
}
export function destinationPoint(longitude, latitude, distanceMeters, bearingDegrees) {
  const earthRadius = 6378137;
  const bearing = bearingDegrees * Math.PI / 180;
  const lat1 = latitude * Math.PI / 180;
  const lon1 = longitude * Math.PI / 180;
  const angularDistance = distanceMeters / earthRadius;
  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(angularDistance) + Math.cos(lat1) * Math.sin(angularDistance) * Math.cos(bearing)
  );
  const lon2 = lon1 + Math.atan2(
    Math.sin(bearing) * Math.sin(angularDistance) * Math.cos(lat1),
    Math.cos(angularDistance) - Math.sin(lat1) * Math.sin(lat2)
  );
  return [lon2 * 180 / Math.PI, lat2 * 180 / Math.PI];
}
export function buildCirclePolygon(center, radiusMeters, steps = 96) {
  const coordinates = Array.from(
    { length: steps + 1 },
    (_item, index) => destinationPoint(center[0], center[1], radiusMeters, index / steps * 360)
  );
  return {
    type: "Feature",
    properties: {},
    geometry: {
      type: "Polygon",
      coordinates: [coordinates]
    }
  };
}
export function clipLineCoordinates(coordinates, progress) {
  if (coordinates.length <= 1) {
    return coordinates;
  }
  const clampedProgress = Math.max(0, Math.min(1, progress));
  if (clampedProgress >= 1) {
    return coordinates;
  }
  const totalLength = coordinates.reduce((total, coordinate, index) => {
    const previous = coordinates[index - 1];
    return previous ? total + distanceBetweenCoordinates(previous, coordinate) : 0;
  }, 0);
  if (totalLength <= 0) {
    return [coordinates[0], coordinates[0]];
  }
  const targetLength = totalLength * clampedProgress;
  const clipped = [coordinates[0]];
  let traversedLength = 0;
  for (let index = 1; index < coordinates.length; index += 1) {
    const previous = coordinates[index - 1];
    const current = coordinates[index];
    const segmentLength = distanceBetweenCoordinates(previous, current);
    if (traversedLength + segmentLength >= targetLength) {
      const segmentRatio = segmentLength <= 0 ? 0 : (targetLength - traversedLength) / segmentLength;
      clipped.push(interpolateCoordinate(previous, current, segmentRatio));
      return clipped.length === 1 ? [coordinates[0], coordinates[0]] : clipped;
    }
    clipped.push(current);
    traversedLength += segmentLength;
  }
  return clipped;
}

