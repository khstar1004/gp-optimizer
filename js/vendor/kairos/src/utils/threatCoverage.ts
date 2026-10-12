import { KILOMETERS_TO_NAUTICAL_MILES } from "./constants";
import {
  getBearingBetweenTwoPoints,
  getDistanceBetweenTwoPoints,
  getTerminalCoordinatesFromDistanceAndBearing,
} from "./mapFunctions";

export function normalizeAngleDegrees(angle: number): number {
  return ((angle % 360) + 360) % 360;
}

export function smallestAngleDeltaDegrees(
  leftAngle: number,
  rightAngle: number
): number {
  const normalizedLeft = normalizeAngleDegrees(leftAngle);
  const normalizedRight = normalizeAngleDegrees(rightAngle);
  const delta = normalizedLeft - normalizedRight;
  return ((delta + 540) % 360) - 180;
}

export function isBearingInsideSector(
  bearingDegrees: number,
  sectorCenterDegrees: number,
  sectorArcDegrees: number
): boolean {
  if (sectorArcDegrees >= 360) {
    return true;
  }
  return (
    Math.abs(
      smallestAngleDeltaDegrees(bearingDegrees, sectorCenterDegrees)
    ) <= sectorArcDegrees / 2
  );
}

export function isTargetInsideSector(
  originLatitude: number,
  originLongitude: number,
  targetLatitude: number,
  targetLongitude: number,
  radiusNm: number,
  sectorCenterDegrees: number,
  sectorArcDegrees: number
): boolean {
  const distanceToTargetNm =
    getDistanceBetweenTwoPoints(
      originLatitude,
      originLongitude,
      targetLatitude,
      targetLongitude
    ) * KILOMETERS_TO_NAUTICAL_MILES;

  if (distanceToTargetNm > radiusNm) {
    return false;
  }

  const bearingToTarget = getBearingBetweenTwoPoints(
    originLatitude,
    originLongitude,
    targetLatitude,
    targetLongitude
  );

  return isBearingInsideSector(
    bearingToTarget,
    sectorCenterDegrees,
    sectorArcDegrees
  );
}

export function buildSectorCoordinates(
  latitude: number,
  longitude: number,
  radiusNm: number,
  sectorCenterDegrees: number,
  sectorArcDegrees: number,
  segmentCount = 48
): number[][] {
  const sectorCoordinates: number[][] = [[longitude, latitude]];
  const radiusKm = radiusNm / KILOMETERS_TO_NAUTICAL_MILES;
  const boundedArc = Math.max(Math.min(sectorArcDegrees, 359.9), 1);
  const halfArc = boundedArc / 2;
  const startBearing = sectorCenterDegrees - halfArc;
  const totalSegments = Math.max(6, Math.ceil((boundedArc / 360) * segmentCount));

  for (let segmentIndex = 0; segmentIndex <= totalSegments; segmentIndex += 1) {
    const bearing =
      startBearing + (boundedArc * segmentIndex) / totalSegments;
    const [terminalLatitude, terminalLongitude] =
      getTerminalCoordinatesFromDistanceAndBearing(
        latitude,
        longitude,
        radiusKm,
        bearing
      );
    sectorCoordinates.push([terminalLongitude, terminalLatitude]);
  }

  sectorCoordinates.push([longitude, latitude]);
  return sectorCoordinates;
}
