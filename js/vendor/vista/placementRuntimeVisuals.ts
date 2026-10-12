// @ts-nocheck
import {
  WEAPON_ARC_SAMPLE_COUNT,
  EVENT_TRACE_SAMPLE_COUNT,
  RUNTIME_POSITION_SMOOTH_MIN_DURATION_MS,
  RUNTIME_POSITION_SMOOTH_MAX_DURATION_MS,
  RUNTIME_POSITION_COAST_MIN_DURATION_MS,
  RUNTIME_POSITION_COAST_MAX_DURATION_MS,
  RUNTIME_POSITION_SMOOTH_DISTANCE_EPSILON_METERS,
  RUNTIME_UNIT_POSITION_SNAP_DISTANCE_METERS,
  MIN_WEAPON_DIRECTION_MAGNITUDE_SQUARED,
  FOCUS_FIRE_IMPACT_EVENT_DISTANCE_METERS,
  AIRCRAFT_ROUTE_TARGET_REACHED_METERS,
  TERRAIN_BOUND_WEAPON_MAX_BASE_ALTITUDE_METERS,
  EFFECT_TEXTURES,
  DEFAULT_WEAPON_MODEL_URI,
  MISSILE_WEAPON_MODEL_URI,
  WEAPON_MODEL_URI_BY_ID,
  WEAPON_MODEL_MAP,
  GROUND_UNIT_ROUTE_SAMPLE_LIMIT,
  UNIT_MODEL_URI_BY_ID,
} from "./placementRuntimeAssets";

import {
  expandBounds,
  normalizeHeading,
  escapeHtml,
  truncateText,
  formatMeters,
  formatImpactLoad,
  isGroundRenderUnit,
  buildUnitRenderContext,
  findFirstMatchingModel,
  buildPlacementSignature,
  buildWeaponSignature,
  hashString,
  colorForSide,
  resolveUnitModel,
  isPointInsideBounds,
  resolveHeadingOrientation,
  isDroneLikePlacementUnit,
  isLoiteringMunitionPlacementUnit,
  isSwarmDronePlacementUnit,
  isBreacherLikePlacementModel,
  resolveGroundUnitVisualProfile,
  resolveGroundUnitMovementVisualState,
} from "./placementRuntimeModels";

export function notifyParentReady() {
  if (window.parent && window.parent !== window) {
    window.parent.postMessage(
      {
        type: "terrain3d:ready",
      },
      window.location.origin
    );
  }
}

export const PLACEMENT_PANEL_TYPE_ORDER = {
  aircraft: 0,
  ship: 1,
  facility: 2,
  army: 3,
  airbase: 4,
};

export function sortPlacementUnitsForPanel(left, right) {
  const leftFocused = left?.focused === true ? 1 : 0;
  const rightFocused = right?.focused === true ? 1 : 0;
  if (leftFocused !== rightFocused) {
    return rightFocused - leftFocused;
  }

  const leftSelected = left?.selected === true ? 1 : 0;
  const rightSelected = right?.selected === true ? 1 : 0;
  if (leftSelected !== rightSelected) {
    return rightSelected - leftSelected;
  }

  const leftTypeOrder =
    PLACEMENT_PANEL_TYPE_ORDER[left?.entityType] ??
    PLACEMENT_PANEL_TYPE_ORDER.facility;
  const rightTypeOrder =
    PLACEMENT_PANEL_TYPE_ORDER[right?.entityType] ??
    PLACEMENT_PANEL_TYPE_ORDER.facility;
  if (leftTypeOrder !== rightTypeOrder) {
    return leftTypeOrder - rightTypeOrder;
  }

  const leftSide = `${left?.sideName ?? left?.sideId ?? ""}`;
  const rightSide = `${right?.sideName ?? right?.sideId ?? ""}`;
  const sideComparison = leftSide.localeCompare(rightSide, "ko-KR");
  if (sideComparison !== 0) {
    return sideComparison;
  }

  return `${left?.name ?? ""}`.localeCompare(`${right?.name ?? ""}`, "ko-KR");
}

export function resolveFocusCameraPreset(unit, model, displayPoint) {
  const signature = buildPlacementSignature(unit);
  const headingDeg = normalizeHeading(unit?.headingDeg || 0);
  const altitudeMeters = Math.max(
    0,
    Number(displayPoint?.altitudeMeters ?? unit?.altitudeMeters) || 0
  );
  const isLauncherLike =
    /\b(patriot|nasams|thaad|l-sam|km-sam|m-sam|cheongung|pegasus|biho|hyunmoo|launcher|rocket|howitzer|artillery|paladin|천궁|천마|비호)\b/i.test(
      signature
    );

  if (unit?.entityType === "aircraft") {
    return {
      headingDeg: normalizeHeading(headingDeg + 132),
      pitchDeg: altitudeMeters > 1400 ? -14 : -18,
      rangeMeters: Math.max(280, Math.min(720, 260 + altitudeMeters * 0.1)),
      sphereRadiusMeters: Math.max(80, Math.min(180, altitudeMeters * 0.04)),
      targetHeightOffsetMeters: altitudeMeters > 1400 ? 18 : 10,
    };
  }

  if (unit?.entityType === "ship") {
    const largeDeck = /\b(carrier|dokdo|amphibious|lhd)\b/i.test(signature);
    return {
      headingDeg: normalizeHeading(headingDeg + 122),
      pitchDeg: -22,
      rangeMeters: largeDeck ? 520 : 380,
      sphereRadiusMeters: largeDeck ? 120 : 84,
      targetHeightOffsetMeters: largeDeck ? 22 : 16,
    };
  }

  if (isGroundRenderUnit(unit)) {
    if (isBreacherLikePlacementModel(unit, model)) {
      return {
        headingDeg: normalizeHeading(headingDeg + 142),
        pitchDeg: -50,
        rangeMeters: 280,
        sphereRadiusMeters: 24,
        targetHeightOffsetMeters: 8,
      };
    }

    return {
      headingDeg: normalizeHeading(headingDeg + (isLauncherLike ? 138 : 146)),
      pitchDeg: isLauncherLike ? -44 : -56,
      rangeMeters: isLauncherLike ? 185 : 128,
      sphereRadiusMeters: isLauncherLike ? 54 : 34,
      targetHeightOffsetMeters: isLauncherLike ? 10 : 6,
    };
  }

  return {
    headingDeg: normalizeHeading(headingDeg + 136),
    pitchDeg: -24,
    rangeMeters: model ? 180 : 120,
    sphereRadiusMeters: model ? 42 : 28,
    targetHeightOffsetMeters: model ? 10 : 6,
  };
}

export function formatRuntimeTimestamp(unixSeconds) {
  if (!Number.isFinite(unixSeconds)) {
    return "시간 정보 없음";
  }

  try {
    return new Date(unixSeconds * 1000).toLocaleString("ko-KR", {
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
  } catch (_error) {
    return `${Math.round(unixSeconds)}s`;
  }
}

export function formatCompactCount(value) {
  return Math.max(0, Math.round(Number(value) || 0)).toLocaleString("ko-KR");
}

export function clamp(value, minimum, maximum) {
  return Math.min(Math.max(Number(value) || 0, minimum), maximum);
}

export function clamp01(value) {
  return clamp(value, 0, 1);
}

export function smoothStep(value) {
  const t = clamp01(value);
  return t * t * (3 - 2 * t);
}

export function resolveEffectTimelineValue(progress, stops, fallback = 0) {
  const orderedStops = Array.isArray(stops)
    ? stops
        .map((stop) => ({
          at: clamp01(stop?.at),
          value: Number(stop?.value),
        }))
        .filter((stop) => Number.isFinite(stop.value))
        .sort((left, right) => left.at - right.at)
    : [];

  if (orderedStops.length === 0) {
    return fallback;
  }

  const safeProgress = clamp01(progress);
  if (safeProgress <= orderedStops[0].at) {
    return orderedStops[0].value;
  }

  for (let index = 1; index < orderedStops.length; index += 1) {
    const previous = orderedStops[index - 1];
    const next = orderedStops[index];
    if (safeProgress <= next.at) {
      const span = Math.max(0.0001, next.at - previous.at);
      const localProgress = smoothStep((safeProgress - previous.at) / span);
      return previous.value + (next.value - previous.value) * localProgress;
    }
  }

  return orderedStops[orderedStops.length - 1].value;
}

export function ensureCesiumColorMaterialProperty(Cesium, colorProperty) {
  if (colorProperty && typeof colorProperty.getType === "function") {
    return colorProperty;
  }

  return new Cesium.ColorMaterialProperty(colorProperty);
}

export function buildCartesianFromPoint(Cesium, point) {
  return Cesium.Cartesian3.fromDegrees(
    Number(point?.longitude) || 0,
    Number(point?.latitude) || 0,
    Math.max(0, Number(point?.altitudeMeters) || 0)
  );
}

export function resolveTerrainBoundWeaponMinimumAltitudeMeters(effectProfile) {
  if (effectProfile.flightProfile === "artillery") {
    return 72;
  }
  if (effectProfile.flightProfile === "rocket") {
    return 48;
  }
  if (effectProfile.loiteringMunitionLike) {
    return 36;
  }
  if (effectProfile.directFireLike) {
    return 16;
  }
  return 28;
}

export function isFiniteGeoPoint(longitude, latitude) {
  return (
    Number.isFinite(Number(longitude)) && Number.isFinite(Number(latitude))
  );
}

export function normalizeGeoPoint(longitude, latitude, altitudeMeters = 0) {
  if (!isFiniteGeoPoint(longitude, latitude)) {
    return null;
  }

  return {
    longitude: Number(longitude),
    latitude: Number(latitude),
    altitudeMeters: Math.max(0, Number(altitudeMeters) || 0),
  };
}

export function normalizeRoutePoint(routePoint, fallbackAltitudeMeters = 0) {
  if (!Array.isArray(routePoint) || routePoint.length < 2) {
    return null;
  }

  return normalizeGeoPoint(
    routePoint[1],
    routePoint[0],
    Number.isFinite(Number(routePoint[2]))
      ? Number(routePoint[2])
      : fallbackAltitudeMeters
  );
}

export function resolveWeaponLaunchPoint(weapon) {
  return (
    normalizeGeoPoint(
      weapon?.launchLongitude,
      weapon?.launchLatitude,
      weapon?.launchAltitudeMeters
    ) ??
    normalizeGeoPoint(
      weapon?.longitude,
      weapon?.latitude,
      weapon?.altitudeMeters
    )
  );
}

export function resolveWeaponCurrentPoint(weapon) {
  return normalizeGeoPoint(
    weapon?.longitude,
    weapon?.latitude,
    weapon?.altitudeMeters
  );
}

export function offsetPointByHeading(point, headingDeg, distanceMeters) {
  const headingRadians = (Number(headingDeg) || 0) * (Math.PI / 180);
  const latitudeRadians = point.latitude * (Math.PI / 180);
  const deltaNorthMeters = Math.cos(headingRadians) * distanceMeters;
  const deltaEastMeters = Math.sin(headingRadians) * distanceMeters;
  const metersPerLongitude = Math.max(1, 111320 * Math.cos(latitudeRadians));

  return {
    longitude: point.longitude + deltaEastMeters / metersPerLongitude,
    latitude: point.latitude + deltaNorthMeters / 111320,
    altitudeMeters: point.altitudeMeters,
  };
}

export function resolveBearingDegreesBetweenPoints(fromPoint, toPoint) {
  if (!fromPoint || !toPoint) {
    return 0;
  }

  const centerLatitude =
    ((Number(fromPoint.latitude) + Number(toPoint.latitude)) / 2) *
    (Math.PI / 180);
  const metersPerLongitude = Math.max(1, 111320 * Math.cos(centerLatitude));
  const deltaEastMeters =
    (Number(toPoint.longitude) - Number(fromPoint.longitude)) *
    metersPerLongitude;
  const deltaNorthMeters =
    (Number(toPoint.latitude) - Number(fromPoint.latitude)) * 111320;

  if (Math.hypot(deltaEastMeters, deltaNorthMeters) < 0.5) {
    return 0;
  }

  return normalizeHeading(
    Math.atan2(deltaEastMeters, deltaNorthMeters) * (180 / Math.PI)
  );
}

export function resolveWeaponLaunchHeadingDeg(weapon, launchPoint = null) {
  const explicitHeading = [
    weapon?.launchHeadingDeg,
    weapon?.headingDeg,
    weapon?.heading,
  ].find((value) => Number.isFinite(Number(value)));
  if (explicitHeading !== undefined) {
    return normalizeHeading(Number(explicitHeading));
  }

  const originPoint = launchPoint ?? resolveWeaponLaunchPoint(weapon);
  const targetPoint = resolveWeaponImpactPoint(weapon);
  if (originPoint && targetPoint) {
    return resolveBearingDegreesBetweenPoints(originPoint, targetPoint);
  }

  return 0;
}

export function sampleWeaponFlareSalvoPoint(
  launchPoint,
  headingDeg,
  flareIndex = 0,
  ratio = 0,
  options = {}
) {
  const origin = normalizeGeoPoint(
    launchPoint?.longitude,
    launchPoint?.latitude,
    launchPoint?.altitudeMeters
  );
  if (!origin) {
    return null;
  }

  const safeIndex = Math.max(0, Math.floor(Number(flareIndex) || 0));
  const progress = clamp01(Number(ratio) || 0);
  const side = safeIndex % 2 === 0 ? -1 : 1;
  const row = Math.floor(safeIndex / 2);
  const launchHeadingDeg = normalizeHeading(Number(headingDeg) || 0);
  const lateralHeadingDeg = normalizeHeading(
    launchHeadingDeg + (side > 0 ? 90 : -90)
  );
  const aftHeadingDeg = normalizeHeading(
    launchHeadingDeg + 180 + side * (10 + row * 4)
  );
  const startPoint = offsetPointByHeading(
    {
      ...origin,
      altitudeMeters:
        Math.max(0, Number(origin.altitudeMeters) || 0) + 4 + row * 1.6,
    },
    lateralHeadingDeg,
    16 + row * 4
  );
  const easedProgress = 1 - Math.pow(1 - progress, 2.15);
  const aftDistanceMeters =
    (Number(options.aftDistanceMeters) || 280) + safeIndex * 28 + row * 36;
  const lateralDistanceMeters =
    (Number(options.lateralDistanceMeters) || 34) + safeIndex * 5 + row * 10;
  const dropMeters =
    (Number(options.dropMeters) || 150) + safeIndex * 13 + row * 34;
  const kickMeters = (Number(options.kickMeters) || 26) + row * 6;
  const driftedPoint = offsetPointByHeading(
    offsetPointByHeading(
      startPoint,
      aftHeadingDeg,
      aftDistanceMeters * easedProgress
    ),
    lateralHeadingDeg,
    lateralDistanceMeters * Math.sin(progress * Math.PI * 0.72)
  );

  return {
    ...driftedPoint,
    altitudeMeters: Math.max(
      8,
      Number(startPoint.altitudeMeters) +
        kickMeters * Math.sin(progress * Math.PI) * (1 - progress * 0.18) -
        dropMeters * Math.pow(progress, 1.58)
    ),
  };
}

export function buildWeaponFlareSalvoPointSamples(weapon, options = {}) {
  const effectProfile = resolveWeaponEffectProfile(weapon);
  if (!effectProfile.flareLike) {
    return [];
  }

  const launchPoint = resolveWeaponLaunchPoint(weapon);
  if (!launchPoint) {
    return [];
  }

  const flareCount = clamp(Math.round(Number(options.flareCount) || 4), 1, 8);
  const sampleCount = Math.max(2, Math.round(Number(options.sampleCount) || 8));
  const headingDeg = resolveWeaponLaunchHeadingDeg(weapon, launchPoint);

  return Array.from({ length: flareCount }, (_flare, flareIndex) =>
    Array.from({ length: sampleCount }, (_sample, sampleIndex) =>
      sampleWeaponFlareSalvoPoint(
        launchPoint,
        headingDeg,
        flareIndex,
        sampleIndex / Math.max(1, sampleCount - 1),
        options
      )
    ).filter(Boolean)
  );
}

export function resolveWeaponImpactPoint(weapon) {
  const currentPoint = resolveWeaponCurrentPoint(weapon);
  const targetPoint = normalizeGeoPoint(
    weapon?.targetLongitude,
    weapon?.targetLatitude,
    weapon?.targetAltitudeMeters
  );
  if (targetPoint) {
    return targetPoint;
  }

  const routePoint = normalizeRoutePoint(
    Array.isArray(weapon?.route) ? weapon.route.at(-1) : null,
    currentPoint?.altitudeMeters ?? 0
  );
  if (routePoint) {
    return routePoint;
  }

  if (!currentPoint) {
    return null;
  }

  const fallbackDistanceMeters = clamp(
    (Number(weapon?.speedKts) || Number(weapon?.speed) || 420) * 1.25,
    700,
    4200
  );
  return offsetPointByHeading(
    currentPoint,
    weapon?.headingDeg ?? weapon?.heading,
    fallbackDistanceMeters
  );
}

export function isTerrainBoundWeapon(weapon) {
  const effectProfile = resolveWeaponEffectProfile(weapon);
  const baseAltitudeMeters = Math.max(
    0,
    Number(weapon?.altitudeMeters) || 0,
    Number(weapon?.launchAltitudeMeters) || 0,
    Number(weapon?.targetAltitudeMeters) || 0
  );

  return (
    baseAltitudeMeters <= TERRAIN_BOUND_WEAPON_MAX_BASE_ALTITUDE_METERS &&
    (effectProfile.artilleryLike ||
      effectProfile.rocketLike ||
      effectProfile.directFireLike ||
      effectProfile.loiteringMunitionLike)
  );
}

export function resolveWeaponHeightReference(Cesium, weapon) {
  return isTerrainBoundWeapon(weapon)
    ? Cesium.HeightReference.RELATIVE_TO_GROUND
    : Cesium.HeightReference.NONE;
}

export function resolveWeaponDepthTestDistance() {
  return Number.POSITIVE_INFINITY;
}

export function resolveWeaponDisplayPoint(weapon) {
  const currentPoint = resolveWeaponCurrentPoint(weapon);
  const effectProfile = resolveWeaponEffectProfile(weapon);
  const launchPoint = resolveWeaponLaunchPoint(weapon);
  const impactPoint = resolveWeaponImpactPoint(weapon);

  if (effectProfile.flareLike && launchPoint) {
    const fullDistanceMeters = approximateDistanceMeters(
      launchPoint,
      impactPoint
    );
    const currentDistanceMeters = approximateDistanceMeters(
      launchPoint,
      currentPoint
    );
    const progress =
      fullDistanceMeters > 1
        ? clamp01(currentDistanceMeters / fullDistanceMeters)
        : 0;
    const flareIndex =
      Math.abs(hashString(`${weapon?.id ?? weapon?.name ?? ""}`)) % 4;
    return sampleWeaponFlareSalvoPoint(
      launchPoint,
      resolveWeaponLaunchHeadingDeg(weapon, launchPoint),
      flareIndex,
      progress
    );
  }

  if (!currentPoint || !isTerrainBoundWeapon(weapon)) {
    return currentPoint;
  }

  const minimumAltitudeMeters =
    resolveTerrainBoundWeaponMinimumAltitudeMeters(effectProfile);

  if (launchPoint && impactPoint) {
    const fullDistanceMeters = approximateDistanceMeters(
      launchPoint,
      impactPoint
    );
    const currentDistanceMeters = approximateDistanceMeters(
      launchPoint,
      currentPoint
    );
    if (fullDistanceMeters > 1) {
      const progress = clamp01(currentDistanceMeters / fullDistanceMeters);
      const sampledPoint = sampleWeaponTrajectoryPoint(
        weapon,
        launchPoint,
        impactPoint,
        progress,
        resolveWeaponArcApexMeters(weapon, launchPoint, impactPoint)
      );

      return {
        ...sampledPoint,
        altitudeMeters: Math.max(
          minimumAltitudeMeters,
          Number(sampledPoint.altitudeMeters) || 0
        ),
      };
    }
  }

  return {
    ...currentPoint,
    altitudeMeters: Math.max(
      minimumAltitudeMeters,
      Number(currentPoint.altitudeMeters) || 0
    ),
  };
}

export function shouldSpawnWeaponLaunchEffect(weapon) {
  const effectProfile = resolveWeaponEffectProfile(weapon);
  if (effectProfile.flareLike) {
    return !!resolveWeaponLaunchPoint(weapon);
  }

  if (
    weapon?.terminalEffectOnly === true ||
    weapon?.suppressLaunchEffect === true
  ) {
    return false;
  }

  const currentPoint = resolveWeaponCurrentPoint(weapon);
  const launchPoint = resolveWeaponLaunchPoint(weapon);
  const impactPoint = resolveWeaponImpactPoint(weapon);
  if (!currentPoint || !launchPoint || !impactPoint) {
    return true;
  }

  return !(
    approximateDistanceMeters(currentPoint, impactPoint) <= 4 &&
    approximateDistanceMeters(launchPoint, impactPoint) > 24
  );
}

export function shouldSpawnWeaponVanishImpactEffect(weapon) {
  return !(
    weapon?.terminalEffectOnly === true || weapon?.suppressLaunchEffect === true
  );
}

export function resolveWeaponImpactCuePoint(weapon, impactPoint) {
  if (!impactPoint) {
    return null;
  }

  const effectProfile = resolveWeaponEffectProfile(weapon);
  const minimumAltitudeMeters = isTerrainBoundWeapon(weapon)
    ? Math.max(
        42,
        resolveTerrainBoundWeaponMinimumAltitudeMeters(effectProfile)
      )
    : 32;

  return {
    ...impactPoint,
    altitudeMeters: Math.max(
      minimumAltitudeMeters,
      Number(impactPoint.altitudeMeters) || 0
    ),
  };
}

export function approximateDistanceMeters(leftPoint, rightPoint) {
  if (!leftPoint || !rightPoint) {
    return 0;
  }

  const centerLatitude =
    ((leftPoint.latitude + rightPoint.latitude) / 2) * (Math.PI / 180);
  const metersPerLongitude = Math.max(1, 111320 * Math.cos(centerLatitude));
  const deltaX =
    (rightPoint.longitude - leftPoint.longitude) * metersPerLongitude;
  const deltaY = (rightPoint.latitude - leftPoint.latitude) * 111320;
  const deltaZ =
    (rightPoint.altitudeMeters ?? 0) - (leftPoint.altitudeMeters ?? 0);
  return Math.hypot(deltaX, deltaY, deltaZ);
}

export function getRuntimeNowMs() {
  return typeof performance !== "undefined" &&
    typeof performance.now === "function"
    ? performance.now()
    : Date.now();
}

export function normalizeRuntimeMotionPoint(point) {
  return {
    longitude: Number(point?.longitude) || 0,
    latitude: Number(point?.latitude) || 0,
    altitudeMeters: Math.max(0, Number(point?.altitudeMeters) || 0),
  };
}

export function normalizeRuntimeVelocity(velocity) {
  return {
    longitudePerMs: Number(velocity?.longitudePerMs) || 0,
    latitudePerMs: Number(velocity?.latitudePerMs) || 0,
    altitudeMetersPerMs: Number(velocity?.altitudeMetersPerMs) || 0,
  };
}

export function projectRuntimeMotionPoint(point, velocity, elapsedMs) {
  const origin = normalizeRuntimeMotionPoint(point);
  const motion = normalizeRuntimeVelocity(velocity);
  const durationMs = Math.max(0, Number(elapsedMs) || 0);

  return normalizeRuntimeMotionPoint({
    longitude: origin.longitude + motion.longitudePerMs * durationMs,
    latitude: origin.latitude + motion.latitudePerMs * durationMs,
    altitudeMeters:
      origin.altitudeMeters + motion.altitudeMetersPerMs * durationMs,
  });
}

export function createRuntimeMotionState(
  initialPoint,
  nowMs = getRuntimeNowMs()
) {
  const point = normalizeRuntimeMotionPoint(initialPoint);
  return {
    fromPoint: point,
    toPoint: point,
    startedAtMs: nowMs,
    durationMs: 0,
    lastUpdateAtMs: nowMs,
    coastDurationMs: 0,
    velocityPerMs: {
      longitudePerMs: 0,
      latitudePerMs: 0,
      altitudeMetersPerMs: 0,
    },
  };
}

export function resolveRuntimeMotionPoint(state, nowMs = getRuntimeNowMs()) {
  if (!state) {
    return normalizeRuntimeMotionPoint(null);
  }

  const fromPoint = normalizeRuntimeMotionPoint(state.fromPoint);
  const toPoint = normalizeRuntimeMotionPoint(state.toPoint);
  const durationMs = Math.max(0, Number(state.durationMs) || 0);
  if (durationMs <= 0) {
    return toPoint;
  }

  const elapsedMs = Math.max(
    0,
    Number(nowMs) - (Number(state.startedAtMs) || 0)
  );
  const progress = clamp01(elapsedMs / durationMs);
  if (progress < 1) {
    return interpolateGeoPoint(fromPoint, toPoint, smoothStep(progress));
  }

  const coastDurationMs = Math.max(0, Number(state.coastDurationMs) || 0);
  if (coastDurationMs <= 0) {
    return toPoint;
  }

  const coastElapsedMs = Math.min(
    Math.max(0, elapsedMs - durationMs),
    coastDurationMs
  );
  const coastProgress = clamp01(coastElapsedMs / coastDurationMs);
  const dampedCoastElapsedMs =
    coastElapsedMs * (1 - 0.35 * smoothStep(coastProgress));

  return projectRuntimeMotionPoint(
    toPoint,
    state.velocityPerMs,
    dampedCoastElapsedMs
  );
}

export function updateRuntimeMotionState(
  state,
  nextPoint,
  {
    nowMs = getRuntimeNowMs(),
    maxSnapDistanceMeters = RUNTIME_UNIT_POSITION_SNAP_DISTANCE_METERS,
    minDurationMs = RUNTIME_POSITION_SMOOTH_MIN_DURATION_MS,
    maxDurationMs = RUNTIME_POSITION_SMOOTH_MAX_DURATION_MS,
    coastDurationMs = null,
  } = {}
) {
  if (!state) {
    return createRuntimeMotionState(nextPoint, nowMs);
  }

  const targetPoint = normalizeRuntimeMotionPoint(nextPoint);
  const previousTargetPoint = normalizeRuntimeMotionPoint(state.toPoint);
  const currentPoint = resolveRuntimeMotionPoint(state, nowMs);
  const distanceMeters = approximateDistanceMeters(currentPoint, targetPoint);
  const shouldSnap =
    distanceMeters <= RUNTIME_POSITION_SMOOTH_DISTANCE_EPSILON_METERS ||
    distanceMeters > Math.max(0, Number(maxSnapDistanceMeters) || 0);

  if (shouldSnap) {
    state.fromPoint = targetPoint;
    state.toPoint = targetPoint;
    state.startedAtMs = nowMs;
    state.durationMs = 0;
    state.lastUpdateAtMs = nowMs;
    state.coastDurationMs = 0;
    state.velocityPerMs = {
      longitudePerMs: 0,
      latitudePerMs: 0,
      altitudeMetersPerMs: 0,
    };
    return state;
  }

  const lastUpdateAtMs = Number(state.lastUpdateAtMs);
  const previousUpdateAtMs = Number.isFinite(lastUpdateAtMs)
    ? lastUpdateAtMs
    : nowMs;
  const updateIntervalMs = Math.max(1, nowMs - previousUpdateAtMs);
  state.fromPoint = currentPoint;
  state.toPoint = targetPoint;
  state.startedAtMs = nowMs;
  state.durationMs = clamp(
    updateIntervalMs * 1.15,
    Math.max(1, Number(minDurationMs) || 1),
    Math.max(
      1,
      Number(maxDurationMs) || RUNTIME_POSITION_SMOOTH_MAX_DURATION_MS
    )
  );
  state.coastDurationMs =
    coastDurationMs === null || coastDurationMs === undefined
      ? clamp(
          updateIntervalMs * 1.4,
          RUNTIME_POSITION_COAST_MIN_DURATION_MS,
          RUNTIME_POSITION_COAST_MAX_DURATION_MS
        )
      : Math.max(0, Number(coastDurationMs) || 0);
  state.velocityPerMs = {
    longitudePerMs:
      (targetPoint.longitude - previousTargetPoint.longitude) /
      updateIntervalMs,
    latitudePerMs:
      (targetPoint.latitude - previousTargetPoint.latitude) / updateIntervalMs,
    altitudeMetersPerMs:
      (targetPoint.altitudeMeters - previousTargetPoint.altitudeMeters) /
      updateIntervalMs,
  };
  state.lastUpdateAtMs = nowMs;
  return state;
}

export function isRuntimeMotionActive(state, nowMs = getRuntimeNowMs()) {
  const durationMs = Math.max(0, Number(state?.durationMs) || 0);
  const coastDurationMs = Math.max(0, Number(state?.coastDurationMs) || 0);
  return (
    state &&
    durationMs > 0 &&
    nowMs - (Number(state.startedAtMs) || 0) < durationMs + coastDurationMs
  );
}

export function buildWeaponDescription(weapon) {
  return [
    `<strong>${escapeHtml(weapon?.name ?? "무장")}</strong>`,
    `${escapeHtml(weapon?.launcherName ?? "발사 플랫폼")} · ${escapeHtml(
      weapon?.className ?? "weapon"
    )}`,
    `현재 좌표 ${escapeHtml(Number(weapon?.latitude || 0).toFixed(5))}, ${escapeHtml(
      Number(weapon?.longitude || 0).toFixed(5)
    )}`,
    `고도 ${escapeHtml(formatMeters(Math.max(0, Number(weapon?.altitudeMeters) || 0)))}`,
    `속도 ${escapeHtml(`${Math.round(Math.max(0, Number(weapon?.speedKts) || 0))}kts`)}`,
  ].join("<br/>");
}

export function resolveWeaponFlightVisualProfile(weapon) {
  const signature = buildWeaponSignature(weapon);
  const loiteringMunitionLike =
    /\b(shahed|shahid|loitering|suicide|fpv|one-way|kamikaze)\b/i.test(
      signature
    ) || /(자폭|배회|드론탄|드론폭탄)/i.test(signature);
  const rocketLike =
    /\b(rocket|mlrs|himars|chunmoo|roketsan|surface-to-surface)\b/i.test(
      signature
    ) || /(로켓|다연장|천무)/i.test(signature);
  const ballisticLike =
    /\b(ballistic|hyunmoo|atacms|iskander)\b/i.test(signature) ||
    /(탄도|현무)/i.test(signature);
  const artilleryLike =
    /\b(shell|round|mortar|ksm|ksm120|120mm|155mm|artillery|howitzer|rocket|mlrs|ballistic|hyunmoo|k9|m109|d-30|paladin)\b/i.test(
      signature
    ) || /(포탄|포격|박격포|자주포|곡사|로켓|탄도)/i.test(signature);
  const interceptorLike =
    /\b(interceptor|patriot|thaad|nasams|surface-to-air|sam)\b/i.test(
      signature
    );
  const bombLike =
    /\b(bomb|gbu|jdam|cluster|mk[-\s]?(20|82|84))\b/i.test(signature) ||
    /(폭탄|집속탄)/i.test(signature);
  const bulletLike =
    /\b(bullet|blank|cannon|gun|vulcan|m61|20mm|30mm|40mm)\b/i.test(
      signature
    ) || /(총알|기관포|탄환)/i.test(signature);
  const autocannonLike =
    /\b(autocannon|cannon burst|20mm|30mm|40mm)\b/i.test(signature) ||
    /(기관포)/i.test(signature);
  const smallArmsLike =
    !autocannonLike &&
    (/\b(blank|bullet|machine gun|submachine|k1a|5\.56mm|7\.62mm|12\.7mm)\b/i.test(
      signature
    ) ||
      /(공포탄|기관총|기관단총|탄환)/i.test(signature));
  const smokeSignalLike =
    /\b(smoke|signal)\b/i.test(signature) || /(연막|신호탄)/i.test(signature);
  const flareLike =
    !smokeSignalLike &&
    (/\b(flare|decoy|chaff)\b/i.test(signature) ||
      /(플레어|기만탄)/i.test(signature));
  const greenSignalLike =
    smokeSignalLike &&
    (/\bgreen\b/i.test(signature) || /(녹색|초록)/i.test(signature));
  const mortarLike =
    /\b(mortar|ksm|ksm120)\b/i.test(signature) || /(박격포)/i.test(signature);
  const tankRoundLike =
    !mortarLike &&
    (/\b(tank round|tank shell|sabot|apfsds|heat round|120mm)\b/i.test(
      signature
    ) ||
      /(전차포|철갑|날탄)/i.test(signature));
  const missileLike =
    interceptorLike ||
    loiteringMunitionLike ||
    /\b(missile|aim-|agm-|amraam|sidewinder|harpoon|tomahawk|hellfire|brimstone|tow|anti-armor)\b/i.test(
      signature
    ) ||
    /(미사일|유도탄|대전차)/i.test(signature);
  const apacheLike =
    /\b(apache|ah-64)\b/i.test(signature) || /아파치/i.test(signature);
  const apacheGunLike =
    apacheLike &&
    autocannonLike &&
    (/\b(m230|30mm|30\s*mm|chain gun|cannon burst)\b/i.test(signature) ||
      /기관포/i.test(signature));
  const apacheRocketLike =
    apacheLike &&
    rocketLike &&
    (/\b(hydra|2\.75|70mm|70\s*mm)\b/i.test(signature) ||
      /하이드라/i.test(signature));
  const directFireLike = bulletLike || tankRoundLike;
  const flightProfile = flareLike
    ? "flare"
    : smokeSignalLike
      ? "signal-smoke"
      : loiteringMunitionLike
        ? "loitering-drone"
        : directFireLike
          ? "direct-fire"
          : rocketLike
            ? "rocket"
            : artilleryLike || ballisticLike
              ? "artillery"
              : missileLike
                ? "missile"
                : "munition";
  const label =
    flightProfile === "flare"
      ? "플레어"
      : flightProfile === "signal-smoke"
        ? "신호연막"
        : flightProfile === "loitering-drone"
          ? "자폭드론"
          : flightProfile === "direct-fire"
            ? tankRoundLike
              ? "전차탄"
              : "탄환"
            : flightProfile === "rocket"
              ? "로켓"
              : flightProfile === "artillery"
                ? "포탄"
                : flightProfile === "missile"
                  ? "미사일"
                  : "탄체";
  const trajectoryKind =
    flightProfile === "flare"
      ? "flare"
      : flightProfile === "signal-smoke"
        ? "rocket-smoke"
        : flightProfile === "artillery"
          ? "high-arc"
          : flightProfile === "direct-fire"
            ? "direct-tracer"
            : flightProfile === "rocket"
              ? "rocket-smoke"
              : flightProfile === "missile"
                ? "guided"
                : flightProfile === "loitering-drone"
                  ? "loitering"
                  : "munition";
  const impactRadiusMeters =
    flightProfile === "flare"
      ? 36
      : flightProfile === "signal-smoke"
        ? 72
        : flightProfile === "artillery"
          ? 210
          : flightProfile === "rocket"
            ? apacheRocketLike
              ? 280
              : 250
            : flightProfile === "loitering-drone"
              ? 90
              : directFireLike
                ? tankRoundLike
                  ? 56
                  : smallArmsLike
                    ? 10
                    : autocannonLike
                      ? apacheGunLike
                        ? 42
                        : 28
                      : 24
                : flightProfile === "missile"
                  ? 120
                  : 110;
  const fragmentRadiusMeters =
    flightProfile === "flare"
      ? 48
      : flightProfile === "signal-smoke"
        ? 96
        : flightProfile === "artillery"
          ? 340
          : flightProfile === "rocket"
            ? apacheRocketLike
              ? 440
              : 390
            : flightProfile === "loitering-drone"
              ? 120
              : directFireLike
                ? tankRoundLike
                  ? 92
                  : smallArmsLike
                    ? 24
                    : autocannonLike
                      ? apacheGunLike
                        ? 82
                        : 58
                      : 48
                : flightProfile === "missile"
                  ? 220
                  : 170;
  const residualSmokeMs =
    flightProfile === "flare"
      ? 3600
      : flightProfile === "signal-smoke"
        ? 13200
        : flightProfile === "artillery"
          ? 9800
          : flightProfile === "rocket"
            ? apacheRocketLike
              ? 12600
              : 10600
            : flightProfile === "missile"
              ? 7800
              : flightProfile === "loitering-drone"
                ? 6200
                : directFireLike
                  ? smallArmsLike
                    ? 1100
                    : apacheGunLike
                      ? 4400
                      : 3000
                  : 6200;

  const directFireBulletTrailWidth = smallArmsLike
    ? 5.4
    : autocannonLike
      ? 6.2
      : 3.2;
  const directFireBulletProjectedWidth = smallArmsLike
    ? 2.8
    : autocannonLike
      ? 3
      : 1.9;
  const projectileArrowLike =
    !flareLike &&
    !smokeSignalLike &&
    !loiteringMunitionLike &&
    (directFireLike ||
      rocketLike ||
      artilleryLike ||
      ballisticLike ||
      missileLike);
  const projectileArrowColor = !projectileArrowLike
    ? null
    : flightProfile === "missile"
      ? interceptorLike
        ? "#68e1fd"
        : "#9be7ff"
      : flightProfile === "rocket"
        ? apacheRocketLike
          ? "#fff2b0"
          : "#ff9f1c"
        : flightProfile === "artillery"
          ? ballisticLike
            ? "#ff4d6d"
            : mortarLike
              ? "#ff7a5c"
              : "#ff5c5c"
          : directFireLike
            ? smallArmsLike
              ? "#7cff6b"
              : tankRoundLike
                ? "#ffdf66"
                : apacheGunLike
                  ? "#ffe7a3"
                  : "#ffc857"
            : "#f4f1e8";
  const projectileArrowGlowColor = !projectileArrowLike
    ? null
    : smallArmsLike
      ? "#29f06f"
      : flightProfile === "missile"
        ? "#66f7ff"
        : flightProfile === "artillery"
          ? ballisticLike
            ? "#ff8fb0"
            : "#ffb86b"
          : flightProfile === "rocket"
            ? "#fff0c2"
            : "#ffd166";
  const projectileArrowWidth = !projectileArrowLike
    ? 0
    : flightProfile === "rocket"
      ? apacheRocketLike
        ? 30
        : 26
      : flightProfile === "missile"
        ? interceptorLike
          ? 26
          : 24
        : flightProfile === "artillery"
          ? ballisticLike
            ? 28
            : 24
          : directFireLike
            ? apacheGunLike
              ? 24
              : smallArmsLike
                ? 18
                : tankRoundLike
                  ? 20
                  : 21
            : 18;
  const projectileArrowTailMeters = !projectileArrowLike
    ? 0
    : flightProfile === "rocket"
      ? apacheRocketLike
        ? 240
        : 180
      : flightProfile === "missile"
        ? 240
        : flightProfile === "artillery"
          ? ballisticLike
            ? 260
            : mortarLike
              ? 150
              : 170
          : directFireLike
            ? apacheGunLike
              ? 140
              : tankRoundLike
                ? 130
                : smallArmsLike
                  ? 110
                  : 120
            : 110;
  return {
    artilleryLike,
    rocketLike,
    ballisticLike,
    interceptorLike,
    bombLike,
    bulletLike,
    apacheGunLike,
    apacheRocketLike,
    smallArmsLike,
    autocannonLike,
    smokeSignalLike,
    flareLike,
    greenSignalLike,
    tankRoundLike,
    directFireLike,
    loiteringMunitionLike,
    missileLike,
    projectileArrowLike,
    flightProfile,
    trajectoryKind,
    label,
    trailWidth:
      flightProfile === "flare"
        ? 8.8
        : flightProfile === "signal-smoke"
          ? 6.2
          : flightProfile === "artillery"
            ? 12.8
            : flightProfile === "rocket"
              ? apacheRocketLike
                ? 14.6
                : 11.4
              : flightProfile === "loitering-drone"
                ? 4.8
                : directFireLike
                  ? tankRoundLike
                    ? 3.6
                    : apacheGunLike
                      ? 8.6
                      : directFireBulletTrailWidth
                  : interceptorLike
                    ? 7.4
                    : 7.8,
    projectedWidth:
      flightProfile === "flare"
        ? 5.6
        : flightProfile === "signal-smoke"
          ? 2.8
          : flightProfile === "artillery"
            ? 6.4
            : flightProfile === "rocket"
              ? apacheRocketLike
                ? 6.2
                : 5
              : directFireLike
                ? tankRoundLike
                  ? 2
                  : apacheGunLike
                    ? 4.2
                    : directFireBulletProjectedWidth
                : 3.6,
    glowScale:
      flightProfile === "flare"
        ? 2.45
        : flightProfile === "signal-smoke"
          ? 1.24
          : flightProfile === "artillery"
            ? 1.9
            : flightProfile === "rocket"
              ? apacheRocketLike
                ? 2.08
                : 1.7
              : flightProfile === "loitering-drone"
                ? 1.35
                : bombLike
                  ? 1.34
                  : directFireLike
                    ? apacheGunLike
                      ? 1.58
                      : smallArmsLike || autocannonLike
                        ? 1.22
                        : 1.08
                    : 1.28,
    impactRadiusMeters,
    fragmentRadiusMeters,
    scorchRadiusMeters:
      flightProfile === "flare"
        ? 8
        : flightProfile === "signal-smoke"
          ? 18
          : flightProfile === "artillery"
            ? 136
            : flightProfile === "rocket"
              ? apacheRocketLike
                ? 172
                : 156
              : flightProfile === "loitering-drone"
                ? 70
                : directFireLike
                  ? tankRoundLike
                    ? 42
                    : smallArmsLike
                      ? 8
                      : apacheGunLike
                        ? 30
                        : 20
                  : 84,
    residualSmokeMs,
    smokeColumnScale:
      flightProfile === "flare"
        ? 0.08
        : flightProfile === "signal-smoke"
          ? 1.1
          : flightProfile === "rocket"
            ? apacheRocketLike
              ? 2.05
              : 1.55
            : flightProfile === "artillery"
              ? 1.05
              : flightProfile === "missile"
                ? 0.75
                : directFireLike
                  ? smallArmsLike
                    ? 0.06
                    : apacheGunLike
                      ? 0.42
                      : 0.25
                  : 0.6,
    trailTailMeters:
      flightProfile === "flare"
        ? 360
        : flightProfile === "signal-smoke"
          ? 920
          : directFireLike
            ? tankRoundLike
              ? 820
              : smallArmsLike
                ? 560
                : autocannonLike
                  ? apacheGunLike
                    ? 680
                    : 320
                  : 260
            : flightProfile === "loitering-drone"
              ? 1450
              : flightProfile === "missile"
                ? 2100
                : flightProfile === "rocket"
                  ? apacheRocketLike
                    ? 3800
                    : 2800
                  : 0,
    launchFlashScale:
      flightProfile === "flare"
        ? 0.26
        : flightProfile === "signal-smoke"
          ? 1.12
          : flightProfile === "artillery"
            ? 3.1
            : flightProfile === "rocket"
              ? apacheRocketLike
                ? 3.45
                : 2.8
              : flightProfile === "loitering-drone"
                ? 1.18
                : directFireLike
                  ? smallArmsLike
                    ? 0.72
                    : autocannonLike
                      ? apacheGunLike
                        ? 1.72
                        : 1.18
                      : 1.08
                  : 1.85,
    impactColor: flareLike
      ? "#fff3a3"
      : greenSignalLike
        ? "#79f26a"
        : smokeSignalLike
          ? "#d8f1dc"
          : apacheRocketLike
            ? "#ff9f1c"
            : apacheGunLike
              ? "#ffb84d"
              : smallArmsLike
                ? "#ffd166"
                : null,
    smokeColor: flareLike
      ? "#f7e6b2"
      : greenSignalLike
        ? "#73f86a"
        : smokeSignalLike
          ? "#eef7ef"
          : apacheRocketLike
            ? "#d7ded9"
            : apacheGunLike
              ? "#c8b38b"
              : smallArmsLike
                ? "#c9b18b"
                : null,
    highSmokeColor: flareLike
      ? "#fff6cf"
      : greenSignalLike
        ? "#b8ff9a"
        : smokeSignalLike
          ? "#dce6df"
          : apacheRocketLike
            ? "#c8d0cc"
            : apacheGunLike
              ? "#d5c19a"
              : smallArmsLike
                ? "#d2b98f"
                : null,
    dustColor: flareLike
      ? "#e8c36d"
      : greenSignalLike
        ? "#9bea7d"
        : smokeSignalLike
          ? "#d8dfd0"
          : apacheRocketLike
            ? "#d8b171"
            : apacheGunLike
              ? "#d6ae67"
              : smallArmsLike
                ? "#d1b172"
                : null,
    flashColor: flareLike
      ? "#fff8b8"
      : greenSignalLike
        ? "#9cff77"
        : smokeSignalLike
          ? "#edfbdc"
          : apacheRocketLike
            ? "#fff2b0"
            : apacheGunLike
              ? "#ffe7a3"
              : smallArmsLike
                ? "#ffe7a3"
                : null,
    projectileArrowColor,
    projectileArrowGlowColor,
    projectileArrowWidth,
    projectileArrowTailMeters,
    projectileArrowAlpha: smallArmsLike ? 0.9 : 0.96,
  };
}

export function resolveWeaponEffectProfile(weapon) {
  return resolveWeaponFlightVisualProfile(weapon);
}

export function resolveWeaponImpactDynamics(weapon) {
  const effectProfile = resolveWeaponEffectProfile(weapon);
  const signature = buildWeaponSignature(weapon);
  const bombLike =
    effectProfile.bombLike && effectProfile.flightProfile === "munition";
  const directFireTankRound =
    effectProfile.directFireLike && effectProfile.tankRoundLike;

  if (/\b(miclic|line charge)\b|미클릭|선형폭약/i.test(signature)) {
    return {
      shakeIntensity: 24,
      shakeDurationMs: 620,
      ringScale: 2.45,
      secondaryRingScale: 2.18,
      pressureWaveScale: 2.85,
      pressureWaveAlphaScale: 1.42,
      flashScale: 1.85,
      fireballScale: 2.35,
      dustScale: 2.55,
      smokeScale: 2.35,
      highSmokeScale: 2.05,
      scorchAlphaScale: 1.55,
      flashPeakRatio: 0.052,
      smokeStartRatio: 0.055,
      dustStartRatio: 0.032,
    };
  }

  if (effectProfile.flareLike) {
    return {
      shakeIntensity: 0.6,
      shakeDurationMs: 90,
      ringScale: 0.24,
      secondaryRingScale: 0.16,
      pressureWaveScale: 0.14,
      pressureWaveAlphaScale: 0.08,
      flashScale: 1.55,
      fireballScale: 0.08,
      dustScale: 0.08,
      smokeScale: 0.16,
      highSmokeScale: 0.1,
      scorchAlphaScale: 0.04,
      flashPeakRatio: 0.16,
      smokeStartRatio: 0.24,
      dustStartRatio: 0.18,
    };
  }

  if (effectProfile.smokeSignalLike) {
    return {
      shakeIntensity: 2.4,
      shakeDurationMs: 170,
      ringScale: 0.64,
      secondaryRingScale: 0.54,
      pressureWaveScale: 0.72,
      pressureWaveAlphaScale: 0.22,
      flashScale: 0.58,
      fireballScale: 0.14,
      dustScale: 0.48,
      smokeScale: 1.18,
      highSmokeScale: 1.28,
      scorchAlphaScale: 0.1,
      flashPeakRatio: 0.07,
      smokeStartRatio: 0.04,
      dustStartRatio: 0.08,
    };
  }

  if (effectProfile.flightProfile === "artillery") {
    return {
      shakeIntensity: 16,
      shakeDurationMs: 380,
      ringScale: 1.18,
      secondaryRingScale: 1.08,
      pressureWaveScale: 1.42,
      pressureWaveAlphaScale: 1.05,
      flashScale: 1.18,
      fireballScale: 1.08,
      dustScale: 1.28,
      smokeScale: 1.14,
      highSmokeScale: 1.08,
      scorchAlphaScale: 1.08,
      flashPeakRatio: 0.065,
      smokeStartRatio: 0.11,
      dustStartRatio: 0.05,
    };
  }

  if (effectProfile.apacheRocketLike) {
    return {
      shakeIntensity: 16,
      shakeDurationMs: 390,
      ringScale: 1.34,
      secondaryRingScale: 1.22,
      pressureWaveScale: 1.66,
      pressureWaveAlphaScale: 1.04,
      flashScale: 1.28,
      fireballScale: 1.12,
      dustScale: 1.32,
      smokeScale: 1.54,
      highSmokeScale: 1.38,
      scorchAlphaScale: 1.12,
      flashPeakRatio: 0.052,
      smokeStartRatio: 0.07,
      dustStartRatio: 0.048,
    };
  }

  if (effectProfile.flightProfile === "rocket") {
    return {
      shakeIntensity: 14,
      shakeDurationMs: 340,
      ringScale: 1.26,
      secondaryRingScale: 1.14,
      pressureWaveScale: 1.52,
      pressureWaveAlphaScale: 0.95,
      flashScale: 1.12,
      fireballScale: 1,
      dustScale: 1.2,
      smokeScale: 1.3,
      highSmokeScale: 1.22,
      scorchAlphaScale: 1.02,
      flashPeakRatio: 0.06,
      smokeStartRatio: 0.08,
      dustStartRatio: 0.055,
    };
  }

  if (effectProfile.apacheGunLike) {
    return {
      shakeIntensity: 4.6,
      shakeDurationMs: 190,
      ringScale: 0.56,
      secondaryRingScale: 0.46,
      pressureWaveScale: 0.62,
      pressureWaveAlphaScale: 0.38,
      flashScale: 0.86,
      fireballScale: 0.32,
      dustScale: 0.74,
      smokeScale: 0.52,
      highSmokeScale: 0.28,
      scorchAlphaScale: 0.4,
      flashPeakRatio: 0.032,
      smokeStartRatio: 0.1,
      dustStartRatio: 0.02,
    };
  }

  if (directFireTankRound) {
    return {
      shakeIntensity: 5.8,
      shakeDurationMs: 210,
      ringScale: 0.66,
      secondaryRingScale: 0.54,
      pressureWaveScale: 0.78,
      pressureWaveAlphaScale: 0.5,
      flashScale: 0.86,
      fireballScale: 0.4,
      dustScale: 0.86,
      smokeScale: 0.52,
      highSmokeScale: 0.34,
      scorchAlphaScale: 0.52,
      flashPeakRatio: 0.04,
      smokeStartRatio: 0.14,
      dustStartRatio: 0.03,
    };
  }

  if (effectProfile.smallArmsLike) {
    return {
      shakeIntensity: 0.8,
      shakeDurationMs: 80,
      ringScale: 0.24,
      secondaryRingScale: 0.18,
      pressureWaveScale: 0.18,
      pressureWaveAlphaScale: 0.08,
      flashScale: 0.46,
      fireballScale: 0.035,
      dustScale: 0.34,
      smokeScale: 0.08,
      highSmokeScale: 0.035,
      scorchAlphaScale: 0.08,
      flashPeakRatio: 0.025,
      smokeStartRatio: 0.1,
      dustStartRatio: 0.018,
    };
  }

  if (effectProfile.directFireLike) {
    return {
      shakeIntensity: 3.4,
      shakeDurationMs: 160,
      ringScale: 0.42,
      secondaryRingScale: 0.34,
      pressureWaveScale: 0.46,
      pressureWaveAlphaScale: 0.28,
      flashScale: 0.62,
      fireballScale: 0.24,
      dustScale: 0.54,
      smokeScale: 0.34,
      highSmokeScale: 0.18,
      scorchAlphaScale: 0.32,
      flashPeakRatio: 0.035,
      smokeStartRatio: 0.12,
      dustStartRatio: 0.025,
    };
  }

  if (effectProfile.loiteringMunitionLike) {
    return {
      shakeIntensity: 8,
      shakeDurationMs: 260,
      ringScale: 0.82,
      secondaryRingScale: 0.74,
      pressureWaveScale: 0.94,
      pressureWaveAlphaScale: 0.68,
      flashScale: 0.92,
      fireballScale: 0.82,
      dustScale: 0.86,
      smokeScale: 0.68,
      highSmokeScale: 0.5,
      scorchAlphaScale: 0.74,
      flashPeakRatio: 0.055,
      smokeStartRatio: 0.11,
      dustStartRatio: 0.06,
    };
  }

  if (effectProfile.missileLike) {
    return {
      shakeIntensity: 11,
      shakeDurationMs: 300,
      ringScale: 0.94,
      secondaryRingScale: 0.84,
      pressureWaveScale: 1.12,
      pressureWaveAlphaScale: 0.78,
      flashScale: 1.04,
      fireballScale: 0.9,
      dustScale: 0.84,
      smokeScale: 0.76,
      highSmokeScale: 0.68,
      scorchAlphaScale: 0.76,
      flashPeakRatio: 0.052,
      smokeStartRatio: 0.12,
      dustStartRatio: 0.07,
    };
  }

  if (bombLike) {
    return {
      shakeIntensity: 13,
      shakeDurationMs: 360,
      ringScale: 1.12,
      secondaryRingScale: 1.02,
      pressureWaveScale: 1.34,
      pressureWaveAlphaScale: 0.95,
      flashScale: 1.12,
      fireballScale: 1.06,
      dustScale: 1.16,
      smokeScale: 1.02,
      highSmokeScale: 0.9,
      scorchAlphaScale: 1,
      flashPeakRatio: 0.06,
      smokeStartRatio: 0.1,
      dustStartRatio: 0.05,
    };
  }

  return {
    shakeIntensity: 9.6,
    shakeDurationMs: 280,
    ringScale: 0.92,
    secondaryRingScale: 0.84,
    pressureWaveScale: 1,
    pressureWaveAlphaScale: 0.72,
    flashScale: 0.98,
    fireballScale: 0.86,
    dustScale: 0.92,
    smokeScale: 0.82,
    highSmokeScale: 0.68,
    scorchAlphaScale: 0.82,
    flashPeakRatio: 0.055,
    smokeStartRatio: 0.1,
    dustStartRatio: 0.06,
  };
}

export function resolveWeaponModelProfile(weapon) {
  const effectProfile = resolveWeaponEffectProfile(weapon);
  const explicitUri = WEAPON_MODEL_URI_BY_ID[weapon?.modelId];
  const fallbackUri = effectProfile.loiteringMunitionLike
    ? UNIT_MODEL_URI_BY_ID["drone-shahed"]
    : effectProfile.missileLike
      ? MISSILE_WEAPON_MODEL_URI
      : DEFAULT_WEAPON_MODEL_URI;
  const uri =
    explicitUri ??
    findFirstMatchingModel(
      buildWeaponSignature(weapon),
      WEAPON_MODEL_MAP,
      fallbackUri
    );

  if (effectProfile.loiteringMunitionLike) {
    return {
      uri,
      scale: 2.35,
      minimumPixelSize: 38,
      maximumScale: 104,
      visibleDistanceMeters: 5200,
      colorAlpha: 0.92,
      colorBlendAmount: 0.12,
      silhouetteAlpha: 0.84,
      silhouetteSize: 1.55,
    };
  }

  if (effectProfile.directFireLike) {
    if (effectProfile.apacheGunLike) {
      return {
        uri,
        scale: 1.62,
        minimumPixelSize: 58,
        maximumScale: 150,
        visibleDistanceMeters: 6800,
        colorAlpha: 1,
        colorBlendAmount: 0.02,
        silhouetteAlpha: 0.98,
        silhouetteSize: 2.8,
      };
    }

    return {
      uri,
      scale: effectProfile.tankRoundLike ? 0.42 : 0.28,
      minimumPixelSize: effectProfile.tankRoundLike ? 12 : 9,
      maximumScale: effectProfile.tankRoundLike ? 34 : 24,
      visibleDistanceMeters: effectProfile.tankRoundLike ? 1800 : 1100,
      colorAlpha: 0.9,
      colorBlendAmount: 0.28,
      silhouetteAlpha: 0.68,
      silhouetteSize: effectProfile.tankRoundLike ? 1 : 0.86,
    };
  }

  if (effectProfile.artilleryLike || effectProfile.rocketLike) {
    if (effectProfile.apacheRocketLike) {
      return {
        uri,
        scale: 2.34,
        minimumPixelSize: 72,
        maximumScale: 260,
        visibleDistanceMeters: 9400,
        colorAlpha: 1,
        colorBlendAmount: 0.02,
        silhouetteAlpha: 0.98,
        silhouetteSize: 3.2,
      };
    }

    return {
      uri,
      scale: effectProfile.rocketLike ? 0.92 : 0.84,
      minimumPixelSize: effectProfile.rocketLike ? 22 : 20,
      maximumScale: effectProfile.rocketLike ? 84 : 76,
      visibleDistanceMeters: effectProfile.rocketLike ? 3800 : 3400,
      colorAlpha: 0.92,
      colorBlendAmount: 0.2,
      silhouetteAlpha: 0.82,
      silhouetteSize: effectProfile.rocketLike ? 1.24 : 1.18,
    };
  }

  return {
    uri,
    scale: effectProfile.bombLike ? 0.64 : 1,
    minimumPixelSize: effectProfile.bombLike ? 10 : 13,
    maximumScale: effectProfile.bombLike ? 34 : 44,
    visibleDistanceMeters: effectProfile.interceptorLike ? 1800 : 1600,
    colorAlpha: 0.9,
    colorBlendAmount: 0.2,
    silhouetteAlpha: 0.7,
    silhouetteSize: effectProfile.interceptorLike ? 1.2 : 1.05,
  };
}

export function addRuntimeAssetValueUrls(target, value) {
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed) {
      target.add(trimmed);
    }
    return;
  }

  if (Array.isArray(value)) {
    value.forEach((entry) => addRuntimeAssetValueUrls(target, entry));
    return;
  }

  if (value && typeof value === "object") {
    Object.values(value).forEach((entry) =>
      addRuntimeAssetValueUrls(target, entry)
    );
  }
}

function buildRuntimePreloadEntryKey(entry) {
  return [
    entry?.id,
    entry?.entityType,
    entry?.modelId,
    entry?.className,
    entry?.name,
  ]
    .filter((value) => value !== null && value !== undefined)
    .join("|");
}

function collectBoundedRuntimePreloadEntries(
  entries,
  placementBounds,
  isInsideBounds,
  maxEntries
) {
  const result = [];
  const seen = new Set();

  entries.forEach((entry) => {
    if (result.length >= maxEntries || !entry || typeof entry !== "object") {
      return;
    }

    if (placementBounds && !isInsideBounds(entry, placementBounds)) {
      return;
    }

    const key = buildRuntimePreloadEntryKey(entry);
    if (key && seen.has(key)) {
      return;
    }

    if (key) {
      seen.add(key);
    }
    result.push(entry);
  });

  return result;
}

export function collectRuntimeSnapshotPreloadUrls(
  snapshot,
  bounds = null,
  options = {}
) {
  const urls = new Set();
  const placementBounds = bounds ? expandBounds(bounds, 0.04, 0.0005) : null;
  const maxUnits = Math.max(0, Number(options.maxUnits) || 96);
  const maxWeapons = Math.max(0, Number(options.maxWeapons) || 32);
  const liveUnits = Array.isArray(snapshot?.units) ? snapshot.units : [];
  const preloadUnits = Array.isArray(snapshot?.preloadUnits)
    ? snapshot.preloadUnits
    : [];
  const units = collectBoundedRuntimePreloadEntries(
    [...liveUnits, ...preloadUnits],
    placementBounds,
    isPointInsideBounds,
    maxUnits
  );
  const renderContext = buildUnitRenderContext(units);

  units.forEach((unit) => {
    const model = resolveUnitModel(unit, renderContext);
    addRuntimeAssetValueUrls(urls, model?.uri);
  });

  const liveWeapons = Array.isArray(snapshot?.weapons) ? snapshot.weapons : [];
  const preloadWeapons = Array.isArray(snapshot?.preloadWeapons)
    ? snapshot.preloadWeapons
    : [];
  const weapons = collectBoundedRuntimePreloadEntries(
    [...liveWeapons, ...preloadWeapons],
    placementBounds,
    isWeaponInsideBounds,
    maxWeapons
  );
  weapons.forEach((weapon) => {
    const modelProfile = resolveWeaponModelProfile(weapon);
    addRuntimeAssetValueUrls(urls, modelProfile?.uri);
  });

  addRuntimeAssetValueUrls(urls, DEFAULT_WEAPON_MODEL_URI);
  addRuntimeAssetValueUrls(urls, MISSILE_WEAPON_MODEL_URI);
  addRuntimeAssetValueUrls(urls, EFFECT_TEXTURES);

  return [...urls];
}

export function shouldUseKineticProjectileVisuals(effectProfile) {
  return (
    !effectProfile.flareLike &&
    !effectProfile.smokeSignalLike &&
    !effectProfile.loiteringMunitionLike &&
    (effectProfile.directFireLike ||
      effectProfile.rocketLike ||
      effectProfile.artilleryLike)
  );
}

export function shouldUseProjectileArrowVisuals(effectProfile) {
  return (
    effectProfile?.projectileArrowLike === true ||
    (!effectProfile?.flareLike &&
      !effectProfile?.smokeSignalLike &&
      !effectProfile?.loiteringMunitionLike &&
      (effectProfile?.directFireLike ||
        effectProfile?.rocketLike ||
        effectProfile?.artilleryLike ||
        effectProfile?.ballisticLike ||
        effectProfile?.missileLike))
  );
}

export function createWeaponPointGraphics(
  Cesium,
  weapon,
  terrainAnchored = false
) {
  const highAltitudeWeapon =
    Math.max(0, Number(weapon?.altitudeMeters) || 0) > 400;
  const effectProfile = resolveWeaponEffectProfile(weapon);
  const kineticProjectile = shouldUseKineticProjectileVisuals(effectProfile);
  if (kineticProjectile) {
    return undefined;
  }
  const projectilePointSize = effectProfile.apacheRocketLike
    ? 18
    : effectProfile.apacheGunLike
      ? 14
      : effectProfile.rocketLike || effectProfile.artilleryLike
        ? 12
        : 4;
  const pixelSize = kineticProjectile
    ? projectilePointSize
    : effectProfile.flightProfile === "loitering-drone"
      ? 14
      : effectProfile.flareLike
        ? 12
        : effectProfile.flightProfile === "artillery"
          ? 11
          : effectProfile.flightProfile === "rocket"
            ? 10
            : effectProfile.directFireLike
              ? 7
              : highAltitudeWeapon
                ? 9
                : 8;

  return {
    pixelSize,
    color: kineticProjectile
      ? Cesium.Color.fromCssColorString(
          effectProfile.apacheRocketLike
            ? "#fff2b0"
            : effectProfile.apacheGunLike
              ? "#ffe7a3"
              : "#f4f1e8"
        ).withAlpha(effectProfile.apacheGunLike ? 0.96 : 0.92)
      : effectProfile.flightProfile === "loitering-drone"
        ? colorForSide(Cesium, weapon?.sideColor, 0.96)
        : effectProfile.flareLike
          ? Cesium.Color.fromCssColorString("#fff8b8").withAlpha(0.98)
          : Cesium.Color.WHITE.withAlpha(0.94),
    outlineColor: kineticProjectile
      ? Cesium.Color.BLACK.withAlpha(0.62)
      : Cesium.Color.WHITE.withAlpha(0.96),
    outlineWidth: kineticProjectile ? 1 : effectProfile.directFireLike ? 1 : 2,
    heightReference: terrainAnchored
      ? Cesium.HeightReference.RELATIVE_TO_GROUND
      : resolveWeaponHeightReference(Cesium, weapon),
    disableDepthTestDistance: terrainAnchored
      ? Number.POSITIVE_INFINITY
      : resolveWeaponDepthTestDistance(weapon),
  };
}

export function createWeaponModelGraphics(
  Cesium,
  weapon,
  terrainAnchored = false
) {
  const effectProfile = resolveWeaponEffectProfile(weapon);
  if (shouldUseKineticProjectileVisuals(effectProfile)) {
    return undefined;
  }

  const modelProfile = resolveWeaponModelProfile(weapon);

  const graphics = {
    uri: encodeURI(modelProfile.uri),
    scale: modelProfile.scale,
    minimumPixelSize: modelProfile.minimumPixelSize,
    maximumScale: modelProfile.maximumScale,
    color: colorForSide(Cesium, weapon?.sideColor, modelProfile.colorAlpha),
    colorBlendMode: Cesium.ColorBlendMode.MIX,
    colorBlendAmount: modelProfile.colorBlendAmount,
    silhouetteColor: Cesium.Color.WHITE.withAlpha(modelProfile.silhouetteAlpha),
    silhouetteSize: modelProfile.silhouetteSize,
    heightReference: terrainAnchored
      ? Cesium.HeightReference.RELATIVE_TO_GROUND
      : resolveWeaponHeightReference(Cesium, weapon),
    distanceDisplayCondition: new Cesium.DistanceDisplayCondition(
      0,
      modelProfile.visibleDistanceMeters
    ),
  };

  return graphics;
}

export function createWeaponBillboardGraphics(
  Cesium,
  weapon,
  terrainAnchored = false
) {
  const effectProfile = resolveWeaponEffectProfile(weapon);
  const kineticProjectile = shouldUseKineticProjectileVisuals(effectProfile);
  if (kineticProjectile) {
    return undefined;
  }

  const altitudeMeters = Math.max(0, Number(weapon?.altitudeMeters) || 0);
  const scale =
    effectProfile.flightProfile === "loitering-drone"
      ? 1.18
      : effectProfile.flareLike
        ? 1.18 * effectProfile.glowScale
        : altitudeMeters > 1200
          ? 1.45
          : altitudeMeters > 280
            ? 1.15
            : 0.96 * effectProfile.glowScale;

  return {
    image: EFFECT_TEXTURES.headGlow,
    color: effectProfile.flareLike
      ? Cesium.Color.fromCssColorString("#ffb02e").withAlpha(0.94)
      : colorForSide(Cesium, weapon?.sideColor, 0.94),
    scale,
    verticalOrigin: Cesium.VerticalOrigin.CENTER,
    horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
    width:
      effectProfile.flightProfile === "artillery"
        ? 68
        : effectProfile.flightProfile === "rocket"
          ? 62
          : effectProfile.flareLike
            ? 72
            : effectProfile.flightProfile === "loitering-drone"
              ? 56
              : effectProfile.directFireLike
                ? 38
                : 52,
    height:
      effectProfile.flightProfile === "artillery"
        ? 68
        : effectProfile.flightProfile === "rocket"
          ? 62
          : effectProfile.flareLike
            ? 72
            : effectProfile.flightProfile === "loitering-drone"
              ? 56
              : effectProfile.directFireLike
                ? 38
                : 52,
    heightReference: terrainAnchored
      ? Cesium.HeightReference.RELATIVE_TO_GROUND
      : resolveWeaponHeightReference(Cesium, weapon),
    disableDepthTestDistance: terrainAnchored
      ? Number.POSITIVE_INFINITY
      : resolveWeaponDepthTestDistance(weapon),
  };
}

export function createWeaponLabelGraphics(
  Cesium,
  weapon,
  terrainAnchored = false
) {
  const effectProfile = resolveWeaponEffectProfile(weapon);
  const currentPoint = resolveWeaponCurrentPoint(weapon);
  const impactPoint = resolveWeaponImpactPoint(weapon);
  const distanceMeters = approximateDistanceMeters(currentPoint, impactPoint);
  const etaSeconds = resolveWeaponEtaSeconds(weapon);
  const etaLabel = etaSeconds ? `${etaSeconds}s` : "계산중";
  const distanceLabel = formatCompactDistanceMeters(distanceMeters);

  return {
    text: `${effectProfile.label} ${etaLabel}\n${distanceLabel}`,
    font: "800 12px 'Segoe UI', 'Noto Sans KR', sans-serif",
    fillColor: Cesium.Color.WHITE.withAlpha(0.96),
    outlineColor: Cesium.Color.BLACK.withAlpha(0.88),
    outlineWidth: 3,
    style: Cesium.LabelStyle.FILL_AND_OUTLINE,
    showBackground: true,
    backgroundColor: colorForSide(Cesium, weapon?.sideColor, 0.42),
    backgroundPadding: new Cesium.Cartesian2(7, 4),
    pixelOffset: new Cesium.Cartesian2(0, -36),
    verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
    horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
    heightReference: terrainAnchored
      ? Cesium.HeightReference.RELATIVE_TO_GROUND
      : resolveWeaponHeightReference(Cesium, weapon),
    disableDepthTestDistance: terrainAnchored
      ? Number.POSITIVE_INFINITY
      : resolveWeaponDepthTestDistance(weapon),
    scaleByDistance: new Cesium.NearFarScalar(1800, 1, 120000, 0.68),
    distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 180000),
  };
}

export function resolveWeaponOrientationTargetPoint(weapon, currentPoint) {
  const impactPoint = resolveWeaponImpactPoint(weapon);
  if (impactPoint && approximateDistanceMeters(currentPoint, impactPoint) > 8) {
    return impactPoint;
  }

  return offsetPointByHeading(
    currentPoint,
    weapon?.headingDeg ?? weapon?.heading,
    180
  );
}

export function resolveWeaponOrientation(Cesium, weapon, currentPoint) {
  const originPoint = currentPoint ?? resolveWeaponCurrentPoint(weapon);
  if (!originPoint) {
    return undefined;
  }

  const targetPoint = resolveWeaponOrientationTargetPoint(weapon, originPoint);
  const position = buildCartesianFromPoint(Cesium, originPoint);
  const target = buildCartesianFromPoint(Cesium, targetPoint);
  const direction = Cesium.Cartesian3.subtract(
    target,
    position,
    new Cesium.Cartesian3()
  );

  if (
    Cesium.Cartesian3.magnitudeSquared(direction) <
    MIN_WEAPON_DIRECTION_MAGNITUDE_SQUARED
  ) {
    return resolveHeadingOrientation(
      Cesium,
      originPoint,
      weapon?.headingDeg ?? weapon?.heading
    );
  }

  Cesium.Cartesian3.normalize(direction, direction);

  const transform = Cesium.Transforms.eastNorthUpToFixedFrame(position);
  const inverseTransform = Cesium.Matrix4.inverseTransformation(
    transform,
    new Cesium.Matrix4()
  );
  const localDirection = Cesium.Matrix4.multiplyByPointAsVector(
    inverseTransform,
    direction,
    new Cesium.Cartesian3()
  );
  const horizontalMagnitude = Math.hypot(localDirection.x, localDirection.y);
  const hpr = new Cesium.HeadingPitchRoll(
    Math.atan2(localDirection.x, localDirection.y),
    Math.atan2(localDirection.z, Math.max(horizontalMagnitude, 0.0001)),
    0
  );

  return Cesium.Transforms.headingPitchRollQuaternion(position, hpr);
}

export function resolveWeaponArcApexMeters(weapon, startPoint, endPoint) {
  const effectProfile = resolveWeaponEffectProfile(weapon);
  const distanceMeters = approximateDistanceMeters(startPoint, endPoint);
  const altitudeDeltaMeters = Math.abs(
    (endPoint?.altitudeMeters ?? 0) - (startPoint?.altitudeMeters ?? 0)
  );

  if (effectProfile.flightProfile === "rocket") {
    return clamp(distanceMeters * 0.14 + altitudeDeltaMeters * 0.12, 130, 2600);
  }

  if (effectProfile.flightProfile === "artillery") {
    return clamp(distanceMeters * 0.54 + altitudeDeltaMeters * 0.34, 420, 7800);
  }

  if (effectProfile.loiteringMunitionLike) {
    return clamp(distanceMeters * 0.035 + altitudeDeltaMeters * 0.08, 55, 720);
  }

  if (effectProfile.directFireLike) {
    return clamp(
      distanceMeters * 0.007,
      6,
      effectProfile.tankRoundLike ? 95 : 58
    );
  }

  if (effectProfile.missileLike) {
    return clamp(distanceMeters * 0.085 + altitudeDeltaMeters * 0.08, 90, 2200);
  }

  return clamp(distanceMeters * 0.055, 55, 1200);
}

export function sampleWeaponArc(startPoint, endPoint, ratio, apexHeightMeters) {
  const t = clamp01(ratio);
  return {
    longitude:
      startPoint.longitude + (endPoint.longitude - startPoint.longitude) * t,
    latitude:
      startPoint.latitude + (endPoint.latitude - startPoint.latitude) * t,
    altitudeMeters:
      startPoint.altitudeMeters +
      (endPoint.altitudeMeters - startPoint.altitudeMeters) * t +
      apexHeightMeters * 4 * t * (1 - t),
  };
}

export function offsetPointLaterally(
  startPoint,
  endPoint,
  point,
  offsetMeters
) {
  const centerLatitude =
    ((startPoint.latitude + endPoint.latitude) / 2) * (Math.PI / 180);
  const metersPerLongitude = Math.max(1, 111320 * Math.cos(centerLatitude));
  const eastMeters =
    (endPoint.longitude - startPoint.longitude) * metersPerLongitude;
  const northMeters = (endPoint.latitude - startPoint.latitude) * 111320;
  const horizontalDistanceMeters = Math.hypot(eastMeters, northMeters);

  if (horizontalDistanceMeters < 1) {
    return point;
  }

  const normalEast = -northMeters / horizontalDistanceMeters;
  const normalNorth = eastMeters / horizontalDistanceMeters;

  return {
    ...point,
    longitude:
      point.longitude + (normalEast * offsetMeters) / metersPerLongitude,
    latitude: point.latitude + (normalNorth * offsetMeters) / 111320,
  };
}

export function sampleWeaponGuidedPoint(
  weapon,
  startPoint,
  endPoint,
  ratio,
  apexHeightMeters
) {
  const t = clamp01(ratio);
  const effectProfile = resolveWeaponEffectProfile(weapon);
  const basePoint = sampleWeaponArc(startPoint, endPoint, t, 0);
  const signatureHash = hashString(
    weapon?.id ?? weapon?.name ?? buildWeaponSignature(weapon)
  );
  const phaseRadians = (signatureHash % 628) / 100;
  const distanceMeters = approximateDistanceMeters(startPoint, endPoint);
  const lateralAmplitudeMeters = clamp(
    distanceMeters * (effectProfile.interceptorLike ? 0.055 : 0.038),
    55,
    effectProfile.interceptorLike ? 1100 : 760
  );
  const lateralOffsetMeters =
    lateralAmplitudeMeters *
    Math.sin(Math.PI * t) *
    Math.sin(Math.PI * 1.65 * t + phaseRadians);
  const loftProgress = Math.sin(Math.PI * t);
  const terminalDive = clamp01((t - 0.72) / 0.28);
  const guidedAltitudeMeters =
    basePoint.altitudeMeters +
    apexHeightMeters *
      loftProgress *
      (0.62 + 0.18 * Math.sin(Math.PI * 2 * t + phaseRadians)) *
      (1 - terminalDive * 0.36);

  return offsetPointLaterally(
    startPoint,
    endPoint,
    {
      ...basePoint,
      altitudeMeters: Math.max(0, guidedAltitudeMeters),
    },
    lateralOffsetMeters
  );
}

export function sampleWeaponTrajectoryPoint(
  weapon,
  startPoint,
  endPoint,
  ratio,
  apexHeightMeters
) {
  const effectProfile = resolveWeaponEffectProfile(weapon);
  if (effectProfile.flightProfile === "missile") {
    return sampleWeaponGuidedPoint(
      weapon,
      startPoint,
      endPoint,
      ratio,
      apexHeightMeters
    );
  }

  return sampleWeaponArc(startPoint, endPoint, ratio, apexHeightMeters);
}

export function buildWeaponArcPointSamples(
  weapon,
  endPoint,
  sampleCount = WEAPON_ARC_SAMPLE_COUNT
) {
  const startPoint = resolveWeaponLaunchPoint(weapon);
  if (!startPoint || !endPoint) {
    return [];
  }

  const apexHeightMeters = resolveWeaponArcApexMeters(
    weapon,
    startPoint,
    endPoint
  );
  const safeSampleCount = Math.max(3, Math.round(Number(sampleCount) || 3));

  return Array.from({ length: safeSampleCount }, (_item, index) =>
    sampleWeaponTrajectoryPoint(
      weapon,
      startPoint,
      endPoint,
      index / (safeSampleCount - 1),
      apexHeightMeters
    )
  );
}

export function buildCartesianArrayFromPoints(Cesium, points) {
  const positions = [];
  points.forEach((point) => {
    positions.push(
      point.longitude,
      point.latitude,
      Math.max(0, Number(point.altitudeMeters) || 0)
    );
  });

  return positions.length >= 6
    ? Cesium.Cartesian3.fromDegreesArrayHeights(positions)
    : [];
}

export function buildWeaponTrajectoryPositions(Cesium, weapon) {
  return buildCartesianArrayFromPoints(
    Cesium,
    buildWeaponTrajectoryPointSamples(weapon)
  );
}

export function buildWeaponTrajectoryPointSamples(weapon) {
  const effectProfile = resolveWeaponEffectProfile(weapon);
  if (effectProfile.flareLike) {
    return [];
  }

  return buildWeaponArcPointSamples(weapon, resolveWeaponImpactPoint(weapon));
}

export function buildWeaponTrailPointSamples(weapon) {
  const currentPoint = resolveWeaponCurrentPoint(weapon);
  const impactPoint = resolveWeaponImpactPoint(weapon);
  const launchPoint = resolveWeaponLaunchPoint(weapon);
  const effectProfile = resolveWeaponEffectProfile(weapon);

  if (!launchPoint || !currentPoint) {
    return [];
  }

  if (effectProfile.flareLike) {
    const fullDistance = approximateDistanceMeters(launchPoint, impactPoint);
    const currentDistance = approximateDistanceMeters(
      launchPoint,
      currentPoint
    );
    const progress =
      fullDistance > 1 ? clamp01(currentDistance / fullDistance) : 1;
    const flareIndex =
      Math.abs(hashString(`${weapon?.id ?? weapon?.name ?? ""}`)) % 4;
    const sampleCount = 7;
    const headingDeg = resolveWeaponLaunchHeadingDeg(weapon, launchPoint);
    const startProgress = Math.max(0, progress - 0.56);

    return Array.from({ length: sampleCount }, (_item, index) => {
      const ratio =
        startProgress +
        (progress - startProgress) * (index / Math.max(1, sampleCount - 1));
      return sampleWeaponFlareSalvoPoint(
        launchPoint,
        headingDeg,
        flareIndex,
        ratio
      );
    }).filter(Boolean);
  }

  const fullDistance = approximateDistanceMeters(launchPoint, impactPoint);
  const currentDistance = approximateDistanceMeters(launchPoint, currentPoint);
  const progress =
    fullDistance > 1 ? clamp01(currentDistance / fullDistance) : 1;
  const sampleCount = Math.max(
    4,
    Math.round(WEAPON_ARC_SAMPLE_COUNT * progress)
  );

  if (
    impactPoint &&
    (effectProfile.directFireLike || effectProfile.loiteringMunitionLike)
  ) {
    const tailMeters = effectProfile.trailTailMeters || 900;
    const tailRatio =
      fullDistance > 1
        ? clamp(
            tailMeters / fullDistance,
            effectProfile.directFireLike ? 0.035 : 0.06,
            effectProfile.directFireLike
              ? effectProfile.tankRoundLike
                ? 0.3
                : 0.18
              : 0.42
          )
        : effectProfile.directFireLike
          ? 0.08
          : 0.16;
    const startProgress = Math.max(0, progress - tailRatio);
    const localSampleCount = effectProfile.directFireLike
      ? effectProfile.tankRoundLike
        ? 4
        : 3
      : 8;
    const apexHeightMeters = resolveWeaponArcApexMeters(
      weapon,
      launchPoint,
      impactPoint
    );
    return Array.from({ length: localSampleCount }, (_item, index) => {
      const ratio =
        startProgress +
        (progress - startProgress) *
          (index / Math.max(1, localSampleCount - 1));
      return sampleWeaponTrajectoryPoint(
        weapon,
        launchPoint,
        impactPoint,
        ratio,
        apexHeightMeters
      );
    });
  }

  if (progress < 0.98 && impactPoint) {
    const apexHeightMeters = resolveWeaponArcApexMeters(
      weapon,
      launchPoint,
      impactPoint
    );
    return Array.from({ length: sampleCount }, (_item, index) =>
      sampleWeaponTrajectoryPoint(
        weapon,
        launchPoint,
        impactPoint,
        progress * (index / (sampleCount - 1)),
        apexHeightMeters
      )
    );
  }

  return buildWeaponArcPointSamples(weapon, currentPoint, sampleCount);
}

export function buildWeaponProjectileStreakPointSamples(weapon) {
  const effectProfile = resolveWeaponEffectProfile(weapon);
  if (!shouldUseProjectileArrowVisuals(effectProfile)) {
    return [];
  }

  const currentPoint = resolveWeaponCurrentPoint(weapon);
  const impactPoint = resolveWeaponImpactPoint(weapon);
  const launchPoint = resolveWeaponLaunchPoint(weapon);
  if (!launchPoint || !currentPoint) {
    return [];
  }

  const fullDistance = approximateDistanceMeters(launchPoint, impactPoint);
  const currentDistance = approximateDistanceMeters(launchPoint, currentPoint);
  const progress =
    fullDistance > 1 ? clamp01(currentDistance / fullDistance) : 1;
  const tailMeters = effectProfile.projectileArrowTailMeters || 110;
  const tailRatio =
    fullDistance > 1
      ? clamp(
          tailMeters / fullDistance,
          effectProfile.apacheGunLike ? 0.04 : 0.05,
          effectProfile.apacheGunLike ? 0.28 : 0.38
        )
      : effectProfile.apacheGunLike
        ? 0.16
        : 0.24;
  const startProgress = Math.max(0, progress - tailRatio);
  const sampleCount = 2;

  if (impactPoint) {
    const apexHeightMeters = resolveWeaponArcApexMeters(
      weapon,
      launchPoint,
      impactPoint
    );
    return Array.from({ length: sampleCount }, (_item, index) => {
      const ratio =
        startProgress +
        (progress - startProgress) * (index / Math.max(1, sampleCount - 1));
      return sampleWeaponTrajectoryPoint(
        weapon,
        launchPoint,
        impactPoint,
        ratio,
        apexHeightMeters
      );
    });
  }

  return Array.from({ length: sampleCount }, (_item, index) => {
    const ratio =
      startProgress +
      (progress - startProgress) * (index / Math.max(1, sampleCount - 1));
    return interpolateGeoPoint(launchPoint, currentPoint, ratio);
  });
}

export function buildWeaponTrailPositions(Cesium, weapon) {
  return buildCartesianArrayFromPoints(
    Cesium,
    buildWeaponTrailPointSamples(weapon)
  );
}

export function createWeaponProjectedTrajectoryGraphics(
  Cesium,
  weapon,
  positions
) {
  const effectProfile = resolveWeaponEffectProfile(weapon);
  return {
    positions,
    width: Math.max(1.1, effectProfile.projectedWidth * 0.52),
    material: new Cesium.PolylineDashMaterialProperty({
      color: colorForSide(
        Cesium,
        weapon?.sideColor,
        effectProfile.directFireLike ? 0.2 : 0.28
      ),
      gapColor: colorForSide(Cesium, weapon?.sideColor, 0.015),
      dashLength:
        effectProfile.flightProfile === "artillery"
          ? 24
          : effectProfile.flightProfile === "rocket"
            ? 20
            : effectProfile.directFireLike
              ? 10
              : 15,
    }),
    clampToGround: false,
    disableDepthTestDistance: resolveWeaponDepthTestDistance(weapon),
  };
}

export function createWeaponTravelTrailGraphics(Cesium, weapon, positions) {
  const effectProfile = resolveWeaponEffectProfile(weapon);
  const trailColor = effectProfile.flareLike
    ? Cesium.Color.fromCssColorString("#fff8b8").withAlpha(0.88)
    : effectProfile.flightProfile === "rocket"
      ? Cesium.Color.fromCssColorString("#dbe2df").withAlpha(
          effectProfile.apacheRocketLike ? 0.68 : 0.46
        )
      : effectProfile.directFireLike
        ? Cesium.Color.fromCssColorString(
            effectProfile.smallArmsLike
              ? (effectProfile.projectileArrowGlowColor ?? "#29f06f")
              : "#ffe7a3"
          ).withAlpha(
            effectProfile.tankRoundLike
              ? 0.48
              : effectProfile.apacheGunLike
                ? 0.92
                : effectProfile.smallArmsLike || effectProfile.autocannonLike
                  ? 0.68
                  : 0.42
          )
        : colorForSide(
            Cesium,
            weapon?.sideColor,
            effectProfile.flightProfile === "artillery" ? 0.58 : 0.52
          );
  const trailWidthMultiplier = effectProfile.apacheRocketLike
    ? 0.96
    : effectProfile.apacheGunLike
      ? 1.18
      : 0.64;

  return {
    positions,
    width: Math.max(1.3, effectProfile.trailWidth * trailWidthMultiplier),
    material: new Cesium.PolylineGlowMaterialProperty({
      glowPower:
        effectProfile.flightProfile === "artillery"
          ? 0.52
          : effectProfile.flightProfile === "rocket"
            ? effectProfile.apacheRocketLike
              ? 0.52
              : 0.42
            : effectProfile.directFireLike
              ? effectProfile.apacheGunLike
                ? 0.34
                : effectProfile.smallArmsLike || effectProfile.autocannonLike
                  ? 0.28
                  : 0.16
              : 0.36,
      taperPower: effectProfile.directFireLike ? 0.94 : 0.7,
      color: trailColor,
    }),
    clampToGround: false,
    disableDepthTestDistance: resolveWeaponDepthTestDistance(weapon),
  };
}

function createProjectileArrowPolylineGraphics(
  Cesium,
  weapon,
  positions,
  options = {}
) {
  const effectProfile = resolveWeaponEffectProfile(weapon);
  const alpha = clamp(
    Number(options.alpha ?? effectProfile.projectileArrowAlpha ?? 0.96),
    0,
    1
  );
  const streakColor = effectProfile.projectileArrowColor ?? "#f4f1e8";
  const glowColor = effectProfile.projectileArrowGlowColor ?? streakColor;
  const width = Math.max(
    10,
    (Number(effectProfile.projectileArrowWidth) || 18) *
      (Number(options.widthMultiplier) || 1)
  );
  const color = Cesium.Color.fromCssColorString(streakColor).withAlpha(alpha);
  const fallbackColor =
    Cesium.Color.fromCssColorString(glowColor).withAlpha(alpha);
  const makeMaterial = () =>
    typeof Cesium.PolylineArrowMaterialProperty === "function"
      ? new Cesium.PolylineArrowMaterialProperty(color)
      : new Cesium.PolylineGlowMaterialProperty({
          glowPower: effectProfile.apacheGunLike ? 0.14 : 0.2,
          taperPower: 0.42,
          color: fallbackColor,
        });

  return {
    positions,
    width,
    material: makeMaterial(),
    depthFailMaterial: makeMaterial(),
    arcType: Cesium.ArcType.NONE,
    clampToGround: false,
    disableDepthTestDistance:
      options.disableDepthTestDistance ??
      resolveWeaponDepthTestDistance(weapon),
  };
}

export function createWeaponProjectileStreakGraphics(
  Cesium,
  weapon,
  positions
) {
  return createProjectileArrowPolylineGraphics(Cesium, weapon, positions);
}

export function createWeaponImpactZoneGraphics(Cesium, weapon) {
  const effectProfile = resolveWeaponEffectProfile(weapon);
  const radiusMeters = clamp(
    Number(weapon?.impactRadiusMeters) || effectProfile.impactRadiusMeters,
    1,
    12000
  );

  return {
    semiMajorAxis: radiusMeters,
    semiMinorAxis: radiusMeters,
    material: ensureCesiumColorMaterialProperty(
      Cesium,
      colorForSide(Cesium, weapon?.sideColor, 0.1)
    ),
    outline: false,
    height: 0,
    heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
    classificationType: Cesium.ClassificationType.TERRAIN,
  };
}

export function createWeaponFragmentZoneGraphics(Cesium, weapon) {
  const effectProfile = resolveWeaponEffectProfile(weapon);
  const radiusMeters = Math.max(
    clamp(
      Number(weapon?.impactRadiusMeters) || effectProfile.impactRadiusMeters,
      1,
      12000
    ),
    clamp(
      Number(weapon?.fragmentRadiusMeters) ||
        effectProfile.fragmentRadiusMeters,
      1,
      12000
    )
  );

  return {
    semiMajorAxis: radiusMeters,
    semiMinorAxis: radiusMeters,
    material: ensureCesiumColorMaterialProperty(
      Cesium,
      colorForSide(Cesium, weapon?.sideColor, 0.045)
    ),
    outline: false,
    height: 0,
    heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
    classificationType: Cesium.ClassificationType.TERRAIN,
  };
}

export function formatCompactDistanceMeters(distanceMeters) {
  const safeDistanceMeters = Math.max(0, Number(distanceMeters) || 0);
  if (safeDistanceMeters >= 1000) {
    const precision = safeDistanceMeters >= 10000 ? 0 : 1;
    return `${(safeDistanceMeters / 1000).toFixed(precision)}km`;
  }

  return `${Math.round(safeDistanceMeters)}m`;
}

export function resolveWeaponEtaSeconds(weapon) {
  const currentPoint = resolveWeaponCurrentPoint(weapon);
  const impactPoint = resolveWeaponImpactPoint(weapon);
  const distanceMeters = approximateDistanceMeters(currentPoint, impactPoint);
  const speedMetersPerSecond = Math.max(
    0,
    (Number(weapon?.speedKts) || 0) * 0.514444
  );

  if (!Number.isFinite(distanceMeters) || distanceMeters <= 0) {
    return null;
  }

  if (!Number.isFinite(speedMetersPerSecond) || speedMetersPerSecond <= 1) {
    return null;
  }

  return Math.max(1, Math.ceil(distanceMeters / speedMetersPerSecond));
}

export function createWeaponImpactCueGraphics(
  Cesium,
  weapon,
  terrainAnchored = false
) {
  const currentPoint = resolveWeaponCurrentPoint(weapon);
  const impactPoint = resolveWeaponImpactPoint(weapon);
  const distanceMeters = approximateDistanceMeters(currentPoint, impactPoint);
  const etaSeconds = resolveWeaponEtaSeconds(weapon);
  const effectProfile = resolveWeaponEffectProfile(weapon);
  const distanceLabel = formatCompactDistanceMeters(distanceMeters);
  const etaLabel = etaSeconds ? `${etaSeconds}s` : "계산중";
  const impactRadiusLabel = formatCompactDistanceMeters(
    Number(weapon?.impactRadiusMeters) || effectProfile.impactRadiusMeters
  );
  const fragmentRadiusLabel = formatCompactDistanceMeters(
    Number(weapon?.fragmentRadiusMeters) || effectProfile.fragmentRadiusMeters
  );

  return {
    text: `ETA ${etaLabel} · 잔여 ${distanceLabel}\n탄착권 ${impactRadiusLabel} · 파편권 ${fragmentRadiusLabel}`,
    font: "800 13px 'Segoe UI', 'Noto Sans KR', sans-serif",
    fillColor: Cesium.Color.WHITE.withAlpha(0.96),
    outlineColor: Cesium.Color.BLACK.withAlpha(0.86),
    outlineWidth: 3,
    style: Cesium.LabelStyle.FILL_AND_OUTLINE,
    showBackground: true,
    backgroundColor: colorForSide(Cesium, weapon?.sideColor, 0.5),
    pixelOffset: new Cesium.Cartesian2(0, -46),
    verticalOrigin: Cesium.VerticalOrigin.TOP,
    heightReference: terrainAnchored
      ? Cesium.HeightReference.RELATIVE_TO_GROUND
      : resolveWeaponHeightReference(Cesium, weapon),
    disableDepthTestDistance: resolveWeaponDepthTestDistance(weapon),
    distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 240000),
  };
}

export function resolveTerrainObjectiveKind(referencePoint) {
  const signature = [
    referencePoint?.id,
    referencePoint?.name,
    referencePoint?.sideName,
    referencePoint?.sideColor,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (/(타격|표적|사격|target|strike|impact|fire)/i.test(signature)) {
    return "strike";
  }

  if (
    /(도착|기동|상공|집결|목표|arrival|maneuver|objective|rally)/i.test(
      signature
    )
  ) {
    return "arrival";
  }

  return "reference";
}

export function getReferenceGeoPoint(referencePoint) {
  return normalizeGeoPoint(
    referencePoint?.longitude,
    referencePoint?.latitude,
    referencePoint?.altitudeMeters
  );
}

export function isPointNearReferencePoint(point, referencePoint, radiusMeters) {
  const referenceGeoPoint = getReferenceGeoPoint(referencePoint);
  if (!point || !referenceGeoPoint) {
    return false;
  }

  return approximateDistanceMeters(point, referenceGeoPoint) <= radiusMeters;
}

export function isWeaponTargetingReferencePoint(weapon, referencePoint) {
  if (!weapon || !referencePoint) {
    return false;
  }

  if (
    typeof referencePoint.id === "string" &&
    referencePoint.id.length > 0 &&
    weapon?.targetId === referencePoint.id
  ) {
    return true;
  }

  const impactPoint = resolveWeaponImpactPoint(weapon);
  return isPointNearReferencePoint(impactPoint, referencePoint, 380);
}

export function isEventTargetingReferencePoint(event, referencePoint) {
  if (!event || !referencePoint) {
    return false;
  }

  if (
    typeof referencePoint.id === "string" &&
    referencePoint.id.length > 0 &&
    event?.targetId === referencePoint.id
  ) {
    return true;
  }

  return [resolveEventTargetPoint(event), resolveEventAnchorPoint(event)].some(
    (point) => isPointNearReferencePoint(point, referencePoint, 420)
  );
}

export function isUnitAtReferencePoint(
  unit,
  referencePoint,
  radiusMeters = 190
) {
  const point = normalizeGeoPoint(
    unit?.longitude,
    unit?.latitude,
    unit?.altitudeMeters
  );
  return isPointNearReferencePoint(point, referencePoint, radiusMeters);
}

export function isUnitApproachingReferencePoint(unit, referencePoint) {
  const routes = [
    ...(Array.isArray(unit?.route) ? unit.route : []),
    ...(Array.isArray(unit?.desiredRoute) ? unit.desiredRoute : []),
  ];
  return routes.some((routePoint) =>
    isPointNearReferencePoint(
      normalizeUnitRoutePoint(routePoint, unit?.altitudeMeters),
      referencePoint,
      420
    )
  );
}

export function resolveTerrainObjectiveStatus(
  referencePoint,
  snapshot = {},
  kind = resolveTerrainObjectiveKind(referencePoint)
) {
  const weapons = Array.isArray(snapshot?.weapons) ? snapshot.weapons : [];
  const events = Array.isArray(snapshot?.recentEvents)
    ? snapshot.recentEvents
    : [];
  const units = Array.isArray(snapshot?.units) ? snapshot.units : [];
  const matchingWeapon = weapons.find((weapon) =>
    isWeaponTargetingReferencePoint(weapon, referencePoint)
  );
  const matchingImpactEvent = [...events]
    .reverse()
    .find(
      (event) =>
        isImpactLikeEvent(event) &&
        isEventTargetingReferencePoint(event, referencePoint)
    );
  const matchingLaunchEvent = [...events]
    .reverse()
    .find(
      (event) =>
        isLaunchLikeEvent(event) &&
        isEventTargetingReferencePoint(event, referencePoint)
    );
  const nearbyUnit = units.find((unit) =>
    isUnitAtReferencePoint(unit, referencePoint, kind === "arrival" ? 220 : 150)
  );
  const approachingUnit = units.find((unit) =>
    isUnitApproachingReferencePoint(unit, referencePoint)
  );

  if (kind === "strike" && matchingImpactEvent) {
    return {
      status: "complete",
      label: "타격완료",
      priority: 4,
    };
  }

  if (kind === "arrival" && nearbyUnit) {
    return {
      status: "complete",
      label: "도착완료",
      priority: 4,
    };
  }

  if (matchingWeapon || matchingLaunchEvent) {
    return {
      status: "active",
      label: kind === "strike" ? "타격중" : "진행중",
      priority: 3,
    };
  }

  if (kind === "arrival" && approachingUnit) {
    return {
      status: "approaching",
      label: "접근중",
      priority: 2,
    };
  }

  return {
    status: "waiting",
    label: "대기",
    priority: 1,
  };
}

export function normalizeUnitRoutePoint(
  routePoint,
  fallbackAltitudeMeters = 0
) {
  if (Array.isArray(routePoint)) {
    return normalizeRoutePoint(routePoint, fallbackAltitudeMeters);
  }

  if (routePoint && typeof routePoint === "object") {
    return normalizeGeoPoint(
      routePoint.longitude,
      routePoint.latitude,
      Number.isFinite(Number(routePoint.altitudeMeters))
        ? Number(routePoint.altitudeMeters)
        : fallbackAltitudeMeters
    );
  }

  return null;
}

export function getUnitRouteSource(unit) {
  if (Array.isArray(unit?.route) && unit.route.length > 0) {
    return unit.route;
  }

  if (Array.isArray(unit?.desiredRoute) && unit.desiredRoute.length > 0) {
    return unit.desiredRoute;
  }

  return [];
}

export function isAircraftRouteVisualUnit(unit) {
  return unit?.entityType === "aircraft" && getUnitRouteSource(unit).length > 0;
}

export function resolveUnitRouteEndpointPoint(
  unit,
  fallbackAltitudeMeters = 0
) {
  const route = getUnitRouteSource(unit);
  if (route.length === 0) {
    return null;
  }

  return normalizeUnitRoutePoint(
    route[route.length - 1],
    Number.isFinite(Number(fallbackAltitudeMeters))
      ? Number(fallbackAltitudeMeters)
      : Number(unit?.altitudeMeters) || 0
  );
}

export function selectGroundRouteVisualPoints(unit) {
  if (Array.isArray(unit?.desiredRoute) && unit.desiredRoute.length > 0) {
    return unit.desiredRoute;
  }

  return Array.isArray(unit?.route) ? unit.route : [];
}

export function buildUnitRoutePointSamples(unit, displayPoint) {
  const groundMovement = resolveGroundUnitMovementVisualState(unit);
  if (!isAircraftRouteVisualUnit(unit) && !groundMovement.moving) {
    return [];
  }

  const startPoint = normalizeGeoPoint(
    displayPoint?.longitude ?? unit?.longitude,
    displayPoint?.latitude ?? unit?.latitude,
    displayPoint?.altitudeMeters ?? unit?.altitudeMeters
  );
  if (!startPoint) {
    return [];
  }

  const fallbackAltitudeMeters = Math.max(
    0,
    Number(displayPoint?.altitudeMeters ?? unit?.altitudeMeters) || 0
  );
  if (isGroundRenderUnit(unit)) {
    const routePoints = selectGroundRouteVisualPoints(unit)
      .slice(0, GROUND_UNIT_ROUTE_SAMPLE_LIMIT)
      .map((routePoint) =>
        normalizeUnitRoutePoint(routePoint, fallbackAltitudeMeters)
      )
      .filter(Boolean);

    if (routePoints.length > 0) {
      return [startPoint, ...routePoints];
    }

    const headingDeg = normalizeHeading(unit?.headingDeg ?? unit?.heading ?? 0);
    const wakeFar = offsetPointByHeading(startPoint, headingDeg + 180, 82);
    const wakeNear = offsetPointByHeading(startPoint, headingDeg + 180, 36);
    return [wakeFar, wakeNear, startPoint];
  }

  const routePoints = getUnitRouteSource(unit)
    .map((routePoint) =>
      normalizeUnitRoutePoint(routePoint, fallbackAltitudeMeters)
    )
    .filter(Boolean);

  return [startPoint, ...routePoints];
}

export function calculateRoutePathDistanceMeters(routePoints) {
  if (!Array.isArray(routePoints) || routePoints.length < 2) {
    return 0;
  }

  let distanceMeters = 0;
  for (let index = 1; index < routePoints.length; index += 1) {
    distanceMeters += approximateDistanceMeters(
      routePoints[index - 1],
      routePoints[index]
    );
  }

  return distanceMeters;
}

export function resolveAircraftRouteProgressState(unit, routePoints = []) {
  const points = Array.isArray(routePoints) ? routePoints.filter(Boolean) : [];
  const currentPoint = points[0] ?? null;
  const endpoint = points.length > 1 ? points[points.length - 1] : null;
  const remainingDistanceMeters =
    currentPoint && endpoint
      ? approximateDistanceMeters(currentPoint, endpoint)
      : Number.POSITIVE_INFINITY;
  const pathDistanceMeters = calculateRoutePathDistanceMeters(points);
  const targetReached =
    remainingDistanceMeters <= AIRCRAFT_ROUTE_TARGET_REACHED_METERS ||
    (Array.isArray(unit?.statusFlags) &&
      unit.statusFlags.some((flag) =>
        /\b(arrived|reached|target-reached|목표도달|도달)\b/i.test(`${flag}`)
      ));

  return {
    currentPoint,
    endpoint,
    remainingDistanceMeters,
    pathDistanceMeters,
    targetReached,
  };
}

export function resolveLoiteringMunitionDiveProfile(unit, routePoints = []) {
  if (!isLoiteringMunitionPlacementUnit(unit)) {
    return null;
  }

  const points = Array.isArray(routePoints) ? routePoints.filter(Boolean) : [];
  if (points.length < 2) {
    return null;
  }

  const endpoint = points[points.length - 1];
  const approachPoint =
    points.length > 2 ? points[points.length - 2] : points[0];
  const approachAltitudeMeters = Math.max(
    180,
    Number(approachPoint?.altitudeMeters) || 0,
    Number(points[0]?.altitudeMeters) || 0
  );
  const impactAltitudeMeters = Math.max(
    24,
    Math.min(96, (Number(endpoint?.altitudeMeters) || 0) * 0.18)
  );
  const startPoint = {
    ...approachPoint,
    altitudeMeters: approachAltitudeMeters,
  };
  const finalPoint = {
    ...endpoint,
    altitudeMeters: impactAltitudeMeters,
  };
  const horizontalDistanceMeters = approximateDistanceMeters(
    {
      ...startPoint,
      altitudeMeters: 0,
    },
    {
      ...finalPoint,
      altitudeMeters: 0,
    }
  );
  const altitudeDropMeters = Math.max(
    0,
    startPoint.altitudeMeters - finalPoint.altitudeMeters
  );
  const descentAngleDeg = clamp(
    (Math.atan2(altitudeDropMeters, Math.max(1, horizontalDistanceMeters)) *
      180) /
      Math.PI,
    8,
    72
  );

  return {
    startPoint,
    finalPoint,
    descentAngleDeg,
  };
}

export function resolveAircraftRouteVisualProfile(
  unit,
  routePoints = [],
  groupState = null
) {
  const droneLike = isDroneLikePlacementUnit(unit);
  const loiteringMunitionLike = isLoiteringMunitionPlacementUnit(unit);
  const groupDensity = Math.max(
    1,
    Math.round(Number(groupState?.density) || 1)
  );
  const swarmLike =
    droneLike && (isSwarmDronePlacementUnit(unit) || groupDensity > 1);
  const groupLead = groupState?.lead === true || groupDensity <= 1;
  const points = Array.isArray(routePoints) ? routePoints.filter(Boolean) : [];
  const highestAltitudeMeters = points.reduce(
    (highest, point) => Math.max(highest, Number(point?.altitudeMeters) || 0),
    Math.max(0, Number(unit?.altitudeMeters) || 0)
  );
  const visualKind = loiteringMunitionLike
    ? "loitering-drone"
    : swarmLike
      ? "swarm-drone"
      : droneLike
        ? "drone"
        : "aircraft";

  return {
    visualKind,
    droneLike,
    loiteringMunitionLike,
    swarmLike,
    groupDensity,
    groupLead,
    compactUnitLabel: swarmLike && groupDensity > 1,
    flowMarkerCount:
      visualKind === "swarm-drone"
        ? groupLead
          ? clamp(groupDensity + 3, 4, 8)
          : 2
        : visualKind === "drone" || visualKind === "loitering-drone"
          ? 3
          : 0,
    routeWidth:
      visualKind === "aircraft"
        ? 1.8
        : visualKind === "swarm-drone"
          ? 4.8
          : visualKind === "loitering-drone"
            ? 4.2
            : 3.4,
    routeAlpha:
      visualKind === "aircraft"
        ? 0.52
        : visualKind === "swarm-drone"
          ? 0.72
          : 0.66,
    highestAltitudeMeters,
    groupLabel:
      visualKind === "swarm-drone"
        ? `군집 ${groupDensity.toLocaleString("ko-KR")}대`
        : "",
    routeLabel:
      visualKind === "aircraft"
        ? `고도 ${formatMeters(highestAltitudeMeters)}`
        : visualKind === "loitering-drone"
          ? "자폭드론 접근"
          : visualKind === "swarm-drone"
            ? "군집 접근"
            : "드론 접근",
  };
}

export function interpolateGeoPoint(leftPoint, rightPoint, ratio) {
  const t = clamp01(ratio);
  return {
    longitude:
      leftPoint.longitude + (rightPoint.longitude - leftPoint.longitude) * t,
    latitude:
      leftPoint.latitude + (rightPoint.latitude - leftPoint.latitude) * t,
    altitudeMeters:
      leftPoint.altitudeMeters +
      (rightPoint.altitudeMeters - leftPoint.altitudeMeters) * t,
  };
}

export function samplePointAlongRoute(routePoints, ratio) {
  const points = Array.isArray(routePoints) ? routePoints.filter(Boolean) : [];
  if (points.length === 0) {
    return null;
  }

  if (points.length === 1) {
    return points[0];
  }

  const targetDistance =
    calculateRoutePathDistanceMeters(points) * clamp01(ratio);
  let walkedDistance = 0;
  for (let index = 1; index < points.length; index += 1) {
    const segmentStart = points[index - 1];
    const segmentEnd = points[index];
    const segmentDistance = approximateDistanceMeters(segmentStart, segmentEnd);
    if (walkedDistance + segmentDistance >= targetDistance) {
      const localRatio =
        segmentDistance > 0
          ? (targetDistance - walkedDistance) / segmentDistance
          : 1;
      return interpolateGeoPoint(segmentStart, segmentEnd, localRatio);
    }
    walkedDistance += segmentDistance;
  }

  return points[points.length - 1];
}

export function buildRouteFlowSamplePoints(routePoints, count) {
  const safeCount = Math.max(0, Math.round(Number(count) || 0));
  if (safeCount === 0) {
    return [];
  }

  return Array.from({ length: safeCount }, (_item, index) =>
    samplePointAlongRoute(routePoints, (index + 1) / (safeCount + 1))
  ).filter(Boolean);
}

export function createUnitRoutePolylineGraphics(
  Cesium,
  unit,
  model,
  positions,
  emphasized,
  routeProfile = null,
  progressState = null
) {
  const profile = resolveGroundUnitVisualProfile(unit, model, emphasized);
  if (profile) {
    return {
      positions,
      width: profile.routeWidth,
      material: new Cesium.PolylineGlowMaterialProperty({
        glowPower: emphasized ? 0.34 : 0.22,
        taperPower: 0.84,
        color: colorForSide(Cesium, unit?.sideColor, emphasized ? 0.68 : 0.44),
      }),
      clampToGround: true,
      disableDepthTestDistance: Number.POSITIVE_INFINITY,
    };
  }

  const aircraftProfile =
    routeProfile ?? resolveAircraftRouteVisualProfile(unit, [], null);
  const reached = progressState?.targetReached === true;
  const color = reached
    ? Cesium.Color.fromCssColorString("#80ed99").withAlpha(0.9)
    : aircraftProfile.visualKind === "loitering-drone"
      ? Cesium.Color.fromCssColorString("#ff8b7c").withAlpha(
          emphasized ? 0.92 : 0.74
        )
      : colorForSide(
          Cesium,
          unit?.sideColor,
          emphasized
            ? Math.min(0.96, aircraftProfile.routeAlpha + 0.2)
            : aircraftProfile.routeAlpha
        );

  if (aircraftProfile.visualKind === "aircraft") {
    return {
      positions,
      width: emphasized
        ? aircraftProfile.routeWidth + 0.8
        : aircraftProfile.routeWidth,
      material: new Cesium.PolylineDashMaterialProperty({
        color,
        gapColor: colorForSide(Cesium, unit?.sideColor, 0.06),
        dashLength: emphasized ? 26 : 20,
      }),
      clampToGround: false,
      disableDepthTestDistance: Number.POSITIVE_INFINITY,
    };
  }

  return {
    positions,
    width: emphasized
      ? aircraftProfile.routeWidth + 1.5
      : aircraftProfile.routeWidth,
    material: new Cesium.PolylineGlowMaterialProperty({
      glowPower:
        aircraftProfile.visualKind === "swarm-drone"
          ? emphasized
            ? 0.46
            : 0.34
          : emphasized
            ? 0.38
            : 0.26,
      taperPower:
        aircraftProfile.visualKind === "loitering-drone" ? 0.84 : 0.72,
      color,
    }),
    clampToGround: false,
    disableDepthTestDistance: Number.POSITIVE_INFINITY,
  };
}

export function createUnitRouteEndpointGraphics(
  Cesium,
  unit,
  emphasized,
  routeProfile = null,
  progressState = null
) {
  const groundMovement = resolveGroundUnitMovementVisualState(unit);
  const groundUnit = isGroundRenderUnit(unit);
  const aircraftProfile =
    routeProfile ?? resolveAircraftRouteVisualProfile(unit, [], null);
  const reached = progressState?.targetReached === true;
  return {
    pixelSize: groundUnit
      ? emphasized
        ? 11
        : 8
      : aircraftProfile.visualKind === "aircraft"
        ? emphasized
          ? 10
          : 7
        : emphasized
          ? 14
          : 10,
    color: groundUnit
      ? Cesium.Color.fromCssColorString("#d8c2a2").withAlpha(
          groundMovement.moving ? 0.9 : 0.68
        )
      : reached
        ? Cesium.Color.fromCssColorString("#80ed99").withAlpha(0.96)
        : aircraftProfile.visualKind === "loitering-drone"
          ? Cesium.Color.fromCssColorString("#ff8b7c").withAlpha(0.96)
          : colorForSide(Cesium, unit?.sideColor, emphasized ? 0.96 : 0.78),
    outlineColor: Cesium.Color.WHITE.withAlpha(emphasized ? 0.96 : 0.74),
    outlineWidth: emphasized ? 3 : 2,
    heightReference: groundUnit
      ? Cesium.HeightReference.CLAMP_TO_GROUND
      : Cesium.HeightReference.NONE,
    disableDepthTestDistance: Number.POSITIVE_INFINITY,
  };
}

export function createAircraftRouteEndpointLabelGraphics(
  Cesium,
  unit,
  emphasized,
  profile,
  progressState
) {
  const reached = progressState?.targetReached === true;
  const showLeader =
    profile?.visualKind === "swarm-drone" && profile?.groupLead === true;
  const showReachedDetail =
    reached &&
    (emphasized ||
      profile?.groupLead === true ||
      profile?.groupDensity <= 1 ||
      profile?.visualKind === "aircraft");
  const showLoiteringDetail =
    profile?.visualKind === "loitering-drone" &&
    (emphasized || profile?.groupLead === true || profile?.groupDensity <= 1);
  const text = showReachedDetail
    ? "목표 도달"
    : profile?.visualKind === "loitering-drone"
      ? showLoiteringDetail
        ? "최종 돌입점"
        : ""
      : showLeader
        ? "선두"
        : emphasized && profile?.visualKind === "aircraft"
          ? profile.routeLabel
          : "";

  if (!text) {
    return undefined;
  }

  return {
    text,
    font: emphasized
      ? "800 13px 'Segoe UI', 'Noto Sans KR', sans-serif"
      : "800 11px 'Segoe UI', 'Noto Sans KR', sans-serif",
    fillColor: Cesium.Color.WHITE.withAlpha(reached ? 1 : 0.92),
    outlineColor: Cesium.Color.BLACK.withAlpha(0.86),
    outlineWidth: 3,
    style: Cesium.LabelStyle.FILL_AND_OUTLINE,
    showBackground: true,
    backgroundColor: reached
      ? Cesium.Color.fromCssColorString("#1f9d55").withAlpha(0.52)
      : colorForSide(Cesium, unit?.sideColor, emphasized ? 0.42 : 0.28),
    pixelOffset: new Cesium.Cartesian2(0, profile?.droneLike ? -26 : -18),
    verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
    horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
    heightReference: Cesium.HeightReference.NONE,
    disableDepthTestDistance: Number.POSITIVE_INFINITY,
    distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 90000),
  };
}

export function createAircraftRouteFlowPointGraphics(
  Cesium,
  unit,
  emphasized,
  profile,
  index,
  count
) {
  const leadMarker =
    profile?.visualKind === "swarm-drone" &&
    profile?.groupLead === true &&
    index === count - 1;

  return {
    pixelSize: leadMarker ? (emphasized ? 13 : 11) : emphasized ? 8 : 6,
    color: leadMarker
      ? Cesium.Color.fromCssColorString("#ecfffb").withAlpha(0.96)
      : colorForSide(
          Cesium,
          unit?.sideColor,
          profile?.visualKind === "loitering-drone" ? 0.82 : 0.72
        ),
    outlineColor: leadMarker
      ? colorForSide(Cesium, unit?.sideColor, 0.92)
      : Cesium.Color.WHITE.withAlpha(0.52),
    outlineWidth: leadMarker ? 3 : 1,
    heightReference: Cesium.HeightReference.RELATIVE_TO_GROUND,
    disableDepthTestDistance: Number.POSITIVE_INFINITY,
  };
}

export function createAircraftRouteGroupLabelGraphics(Cesium, unit, profile) {
  if (profile?.visualKind !== "swarm-drone" || profile?.groupLead !== true) {
    return undefined;
  }

  return {
    text: `${profile.groupLabel}\n선두 ${truncateText(unit?.name ?? "드론", 14)}`,
    font: "800 12px 'Segoe UI', 'Noto Sans KR', sans-serif",
    fillColor: Cesium.Color.WHITE.withAlpha(0.94),
    outlineColor: Cesium.Color.BLACK.withAlpha(0.86),
    outlineWidth: 3,
    style: Cesium.LabelStyle.FILL_AND_OUTLINE,
    showBackground: true,
    backgroundColor: colorForSide(Cesium, unit?.sideColor, 0.34),
    pixelOffset: new Cesium.Cartesian2(0, -22),
    verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
    horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
    heightReference: Cesium.HeightReference.NONE,
    disableDepthTestDistance: Number.POSITIVE_INFINITY,
    distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 110000),
  };
}

export function createLoiteringDroneDivePolylineGraphics(Cesium, positions) {
  return {
    positions,
    width: 6.4,
    material: new Cesium.PolylineGlowMaterialProperty({
      glowPower: 0.48,
      taperPower: 0.92,
      color: Cesium.Color.fromCssColorString("#ff5c5c").withAlpha(0.88),
    }),
    clampToGround: false,
    disableDepthTestDistance: Number.POSITIVE_INFINITY,
  };
}

export function createLoiteringDroneFinalAttackLabelGraphics(
  Cesium,
  diveProfile
) {
  return {
    text: `최종 돌입\n하강각 ${Math.round(diveProfile.descentAngleDeg)}°`,
    font: "900 13px 'Segoe UI', 'Noto Sans KR', sans-serif",
    fillColor: Cesium.Color.WHITE.withAlpha(0.98),
    outlineColor: Cesium.Color.BLACK.withAlpha(0.9),
    outlineWidth: 3,
    style: Cesium.LabelStyle.FILL_AND_OUTLINE,
    showBackground: true,
    backgroundColor: Cesium.Color.fromCssColorString("#b42318").withAlpha(0.54),
    pixelOffset: new Cesium.Cartesian2(0, -28),
    verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
    horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
    heightReference: Cesium.HeightReference.NONE,
    disableDepthTestDistance: Number.POSITIVE_INFINITY,
    distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 120000),
  };
}

export function createGroundShadowEllipseGraphics(
  Cesium,
  unit,
  model,
  emphasized
) {
  const profile = resolveGroundUnitVisualProfile(unit, model, emphasized);
  if (!profile) {
    return undefined;
  }

  return {
    semiMajorAxis: profile.shadowMajorAxisMeters,
    semiMinorAxis: profile.shadowMinorAxisMeters,
    rotation: Cesium.Math.toRadians(normalizeHeading(unit?.headingDeg)),
    material: ensureCesiumColorMaterialProperty(
      Cesium,
      Cesium.Color.fromCssColorString("#020507").withAlpha(profile.shadowAlpha)
    ),
    outline: false,
    height: 0,
    heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
    classificationType: Cesium.ClassificationType.TERRAIN,
    distanceDisplayCondition: new Cesium.DistanceDisplayCondition(
      0,
      Number.POSITIVE_INFINITY
    ),
  };
}

export function createGroundSelectionRingGraphics(
  Cesium,
  unit,
  model,
  emphasized
) {
  const profile = resolveGroundUnitVisualProfile(unit, model, emphasized);
  if (!profile || !emphasized) {
    return undefined;
  }

  return {
    semiMajorAxis: profile.selectionRingRadiusMeters,
    semiMinorAxis: profile.selectionRingRadiusMeters,
    material: ensureCesiumColorMaterialProperty(
      Cesium,
      colorForSide(Cesium, unit?.sideColor, 0.1)
    ),
    outline: false,
    height: 0,
    heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
    classificationType: Cesium.ClassificationType.TERRAIN,
    distanceDisplayCondition: new Cesium.DistanceDisplayCondition(
      0,
      Number.POSITIVE_INFINITY
    ),
  };
}

export function buildGroundDirectionPositions(
  Cesium,
  displayPoint,
  headingDeg,
  startM,
  endM
) {
  const basePoint = normalizeGeoPoint(
    displayPoint?.longitude,
    displayPoint?.latitude,
    displayPoint?.altitudeMeters
  );
  if (!basePoint) {
    return [];
  }

  return buildCartesianArrayFromPoints(Cesium, [
    offsetPointByHeading(basePoint, headingDeg, startM),
    offsetPointByHeading(basePoint, headingDeg, endM),
  ]);
}

export function createGroundDirectionPolylineGraphics(
  Cesium,
  unit,
  model,
  positions,
  emphasized,
  role
) {
  const profile = resolveGroundUnitVisualProfile(unit, model, emphasized);
  if (!profile || positions.length < 2) {
    return undefined;
  }

  const barrel = role === "barrel";
  return {
    positions,
    width: barrel ? profile.barrelLineWidth : profile.bodyLineWidth,
    material: new Cesium.PolylineGlowMaterialProperty({
      glowPower: barrel ? (emphasized ? 0.28 : 0.2) : emphasized ? 0.34 : 0.22,
      taperPower: barrel ? 0.92 : 0.78,
      color: barrel
        ? Cesium.Color.fromCssColorString(
            profile.launchCapable ? "#ffd166" : "#ecfffb"
          ).withAlpha(emphasized ? 0.86 : 0.64)
        : colorForSide(Cesium, unit?.sideColor, emphasized ? 0.72 : 0.5),
    }),
    clampToGround: true,
    disableDepthTestDistance: Number.POSITIVE_INFINITY,
  };
}

export function createGroundMovementDustBillboardGraphics(
  Cesium,
  unit,
  model,
  emphasized
) {
  const profile = resolveGroundUnitVisualProfile(unit, model, emphasized);
  const movement = resolveGroundUnitMovementVisualState(unit);
  if (!profile || !movement.moving) {
    return undefined;
  }

  const speedAlpha = clamp(movement.speedKts / 28, 0.34, 0.82);
  return {
    image: EFFECT_TEXTURES.impactDust,
    width: profile.dustWidth,
    height: profile.dustHeight,
    scale: emphasized ? 1.08 : 0.92,
    color: Cesium.Color.fromCssColorString("#cdb38d").withAlpha(speedAlpha),
    verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
    horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
    heightReference: Cesium.HeightReference.NONE,
    disableDepthTestDistance: Number.POSITIVE_INFINITY,
    distanceDisplayCondition: new Cesium.DistanceDisplayCondition(
      0,
      Number.POSITIVE_INFINITY
    ),
  };
}

export function isWeaponInsideBounds(weapon, bounds) {
  return (
    isPointInsideBounds(weapon, bounds) ||
    (isFiniteGeoPoint(weapon?.launchLongitude, weapon?.launchLatitude) &&
      Number(weapon.launchLongitude) >= bounds.west &&
      Number(weapon.launchLongitude) <= bounds.east &&
      Number(weapon.launchLatitude) >= bounds.south &&
      Number(weapon.launchLatitude) <= bounds.north) ||
    (isFiniteGeoPoint(weapon?.targetLongitude, weapon?.targetLatitude) &&
      Number(weapon.targetLongitude) >= bounds.west &&
      Number(weapon.targetLongitude) <= bounds.east &&
      Number(weapon.targetLatitude) >= bounds.south &&
      Number(weapon.targetLatitude) <= bounds.north)
  );
}

export function resolveEventAnchorPoint(event) {
  const impactLike = isImpactLikeEvent(event);
  const launchLike = isLaunchLikeEvent(event);

  if (
    impactLike &&
    isFiniteGeoPoint(event?.targetLongitude, event?.targetLatitude)
  ) {
    return {
      longitude: Number(event.targetLongitude),
      latitude: Number(event.targetLatitude),
      altitudeMeters: Math.max(0, Number(event?.targetAltitudeMeters) || 0),
    };
  }

  if (
    launchLike &&
    isFiniteGeoPoint(event?.sourceLongitude, event?.sourceLatitude)
  ) {
    return {
      longitude: Number(event.sourceLongitude),
      latitude: Number(event.sourceLatitude),
      altitudeMeters: Math.max(0, Number(event?.sourceAltitudeMeters) || 0),
    };
  }

  if (isFiniteGeoPoint(event?.focusLongitude, event?.focusLatitude)) {
    return {
      longitude: Number(event.focusLongitude),
      latitude: Number(event.focusLatitude),
      altitudeMeters: Math.max(0, Number(event?.focusAltitudeMeters) || 0),
    };
  }

  if (isFiniteGeoPoint(event?.targetLongitude, event?.targetLatitude)) {
    return {
      longitude: Number(event.targetLongitude),
      latitude: Number(event.targetLatitude),
      altitudeMeters: Math.max(0, Number(event?.targetAltitudeMeters) || 0),
    };
  }

  if (isFiniteGeoPoint(event?.sourceLongitude, event?.sourceLatitude)) {
    return {
      longitude: Number(event.sourceLongitude),
      latitude: Number(event.sourceLatitude),
      altitudeMeters: Math.max(0, Number(event?.sourceAltitudeMeters) || 0),
    };
  }

  return null;
}

export function resolveEventSourcePoint(event) {
  return normalizeGeoPoint(
    event?.sourceLongitude,
    event?.sourceLatitude,
    event?.sourceAltitudeMeters
  );
}

export function resolveEventTargetPoint(event) {
  return (
    normalizeGeoPoint(
      event?.targetLongitude,
      event?.targetLatitude,
      event?.targetAltitudeMeters
    ) ??
    normalizeGeoPoint(
      event?.focusLongitude,
      event?.focusLatitude,
      event?.focusAltitudeMeters
    )
  );
}

export function buildEventWeaponSignature(event) {
  return [
    event?.weaponName,
    event?.weaponClassName,
    event?.message,
    event?.type,
    event?.resultTag,
  ]
    .filter(Boolean)
    .join(" ");
}

export function buildEventEffectWeapon(event, anchorPoint = null) {
  const sourcePoint = resolveEventSourcePoint(event) ?? anchorPoint;
  const targetPoint = resolveEventTargetPoint(event) ?? anchorPoint;
  const signature = buildEventWeaponSignature(event);
  const anchorAltitudeMeters = Math.max(
    0,
    Number(anchorPoint?.altitudeMeters) || 0
  );

  return {
    ...event,
    name: signature || event?.weaponName || event?.message,
    className: signature || event?.weaponClassName || event?.type,
    longitude: Number(targetPoint?.longitude ?? anchorPoint?.longitude) || 0,
    latitude: Number(targetPoint?.latitude ?? anchorPoint?.latitude) || 0,
    altitudeMeters: Math.max(
      0,
      Number(targetPoint?.altitudeMeters) || anchorAltitudeMeters
    ),
    launchLongitude:
      Number(sourcePoint?.longitude ?? anchorPoint?.longitude) || 0,
    launchLatitude: Number(sourcePoint?.latitude ?? anchorPoint?.latitude) || 0,
    launchAltitudeMeters: Math.max(
      0,
      Number(sourcePoint?.altitudeMeters) || anchorAltitudeMeters
    ),
    targetLongitude:
      Number(targetPoint?.longitude ?? anchorPoint?.longitude) || 0,
    targetLatitude: Number(targetPoint?.latitude ?? anchorPoint?.latitude) || 0,
    targetAltitudeMeters: Math.max(
      0,
      Number(targetPoint?.altitudeMeters) || anchorAltitudeMeters
    ),
  };
}

export function isTerrainBoundEvent(event) {
  const anchorPoint = resolveEventAnchorPoint(event);
  const anchorAltitudeMeters = Math.max(
    0,
    Number(anchorPoint?.altitudeMeters) || 0
  );
  if (
    anchorAltitudeMeters <= TERRAIN_BOUND_WEAPON_MAX_BASE_ALTITUDE_METERS &&
    (isImpactLikeEvent(event) || isLaunchLikeEvent(event))
  ) {
    return true;
  }

  return isTerrainBoundWeapon(buildEventEffectWeapon(event, anchorPoint));
}

export function resolveEventHeightReference(Cesium, event) {
  return isTerrainBoundEvent(event)
    ? Cesium.HeightReference.RELATIVE_TO_GROUND
    : Cesium.HeightReference.NONE;
}

export function resolveEventDepthTestDistance() {
  return Number.POSITIVE_INFINITY;
}

export function resolveEventDisplayPoint(
  event,
  point,
  minimumAltitudeMeters = 0
) {
  if (!point) {
    return null;
  }

  return {
    ...point,
    altitudeMeters: Math.max(
      Number(minimumAltitudeMeters) || 0,
      Number(point.altitudeMeters) || 0
    ),
  };
}

export function buildEventTraceWeapon(event) {
  if (/\bflare\b|플레어/i.test(buildEventWeaponSignature(event))) {
    return null;
  }

  const sourcePoint = resolveEventSourcePoint(event);
  const targetPoint = resolveEventTargetPoint(event);

  if (!sourcePoint || !targetPoint) {
    return null;
  }

  if (approximateDistanceMeters(sourcePoint, targetPoint) < 8) {
    return null;
  }

  const signature = buildEventWeaponSignature(event);
  const impactLike = isImpactLikeEvent(event);
  const launchLike = isLaunchLikeEvent(event);

  if (!impactLike && !launchLike && !event?.weaponId) {
    return null;
  }

  return {
    id: event?.id,
    name: signature,
    className: signature,
    sideColor: event?.sideColor,
    launchLongitude: sourcePoint.longitude,
    launchLatitude: sourcePoint.latitude,
    launchAltitudeMeters: sourcePoint.altitudeMeters,
    longitude: targetPoint.longitude,
    latitude: targetPoint.latitude,
    altitudeMeters: targetPoint.altitudeMeters,
    targetLongitude: targetPoint.longitude,
    targetLatitude: targetPoint.latitude,
    targetAltitudeMeters: targetPoint.altitudeMeters,
    speedKts: 1450,
  };
}

export function buildEventTracePositions(Cesium, traceWeapon) {
  return buildCartesianArrayFromPoints(
    Cesium,
    buildWeaponArcPointSamples(
      traceWeapon,
      resolveWeaponImpactPoint(traceWeapon),
      EVENT_TRACE_SAMPLE_COUNT
    )
  );
}

export function buildEventTraceArrowPointSamples(
  traceWeapon,
  headProgress = 0.86
) {
  const effectProfile = resolveWeaponEffectProfile(traceWeapon);
  if (!shouldUseProjectileArrowVisuals(effectProfile)) {
    return [];
  }

  const launchPoint = resolveWeaponLaunchPoint(traceWeapon);
  const impactPoint = resolveWeaponImpactPoint(traceWeapon);
  if (!launchPoint || !impactPoint) {
    return [];
  }

  const fullDistance = approximateDistanceMeters(launchPoint, impactPoint);
  const progress = clamp(
    Number.isFinite(Number(headProgress)) ? Number(headProgress) : 0.86,
    0.08,
    1
  );
  const tailRatio =
    fullDistance > 1
      ? clamp(
          (effectProfile.projectileArrowTailMeters || 140) / fullDistance,
          effectProfile.directFireLike ? 0.035 : 0.05,
          effectProfile.directFireLike ? 0.34 : 0.48
        )
      : effectProfile.directFireLike
        ? 0.2
        : 0.28;
  const startProgress = Math.max(0, progress - tailRatio);
  const apexHeightMeters = resolveWeaponArcApexMeters(
    traceWeapon,
    launchPoint,
    impactPoint
  );

  return [startProgress, progress].map((ratio) =>
    sampleWeaponTrajectoryPoint(
      traceWeapon,
      launchPoint,
      impactPoint,
      ratio,
      apexHeightMeters
    )
  );
}

export function createEventTraceArrowGraphics(
  Cesium,
  traceWeapon,
  positions,
  freshness
) {
  return createProjectileArrowPolylineGraphics(Cesium, traceWeapon, positions, {
    alpha: 0.5 + clamp01(Number(freshness) || 0) * 0.42,
    widthMultiplier: 0.82,
    disableDepthTestDistance: Number.POSITIVE_INFINITY,
  });
}

export function createEventTraceGlowGraphics(
  Cesium,
  traceWeapon,
  positions,
  freshness
) {
  const effectProfile = resolveWeaponEffectProfile(traceWeapon);
  return {
    positions,
    width:
      effectProfile.flightProfile === "artillery"
        ? 8.6
        : effectProfile.flightProfile === "rocket"
          ? 7.8
          : effectProfile.directFireLike
            ? 4.2
            : 6.4,
    material: new Cesium.PolylineGlowMaterialProperty({
      glowPower:
        effectProfile.flightProfile === "artillery"
          ? 0.44
          : effectProfile.directFireLike
            ? 0.24
            : 0.32,
      taperPower: 0.85,
      color: colorForSide(
        Cesium,
        traceWeapon?.sideColor,
        0.22 + freshness * 0.5
      ),
    }),
    clampToGround: false,
    disableDepthTestDistance: Number.POSITIVE_INFINITY,
  };
}

export function createEventTraceDashGraphics(
  Cesium,
  traceWeapon,
  positions,
  freshness
) {
  const effectProfile = resolveWeaponEffectProfile(traceWeapon);
  return {
    positions,
    width:
      effectProfile.flightProfile === "artillery"
        ? 4.2
        : effectProfile.flightProfile === "rocket"
          ? 3.8
          : effectProfile.directFireLike
            ? 2.2
            : 3,
    material: new Cesium.PolylineDashMaterialProperty({
      color: colorForSide(
        Cesium,
        traceWeapon?.sideColor,
        0.36 + freshness * 0.42
      ),
      gapColor: colorForSide(Cesium, traceWeapon?.sideColor, 0.04),
      dashLength:
        effectProfile.flightProfile === "artillery"
          ? 24
          : effectProfile.directFireLike
            ? 10
            : 14,
    }),
    clampToGround: false,
    disableDepthTestDistance: Number.POSITIVE_INFINITY,
  };
}

export function resolveEventTraceLabelPoint(traceWeapon) {
  const launchPoint = resolveWeaponLaunchPoint(traceWeapon);
  const impactPoint = resolveWeaponImpactPoint(traceWeapon);

  if (!launchPoint || !impactPoint) {
    return null;
  }

  return sampleWeaponTrajectoryPoint(
    traceWeapon,
    launchPoint,
    impactPoint,
    0.62,
    resolveWeaponArcApexMeters(traceWeapon, launchPoint, impactPoint)
  );
}

export function createEventTraceLabelGraphics(
  Cesium,
  event,
  traceWeapon,
  freshness
) {
  const effectProfile = resolveWeaponEffectProfile(traceWeapon);
  const labelText = effectProfile.flareLike
    ? "플레어 잔상"
    : isImpactLikeEvent(event)
      ? "탄착 잔상"
      : "발사 궤적";
  return {
    text: labelText,
    font: "800 12px 'Segoe UI', 'Noto Sans KR', sans-serif",
    fillColor: Cesium.Color.WHITE.withAlpha(0.72 + freshness * 0.24),
    outlineColor: Cesium.Color.BLACK.withAlpha(0.78),
    outlineWidth: 3,
    style: Cesium.LabelStyle.FILL_AND_OUTLINE,
    showBackground: true,
    backgroundColor: colorForSide(Cesium, traceWeapon?.sideColor, 0.34),
    pixelOffset: new Cesium.Cartesian2(0, -12),
    verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
    heightReference: resolveWeaponHeightReference(Cesium, traceWeapon),
    disableDepthTestDistance: resolveWeaponDepthTestDistance(traceWeapon),
    distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 220000),
  };
}

export function isEventInsideBounds(event, bounds) {
  const impactLike = isImpactLikeEvent(event);
  const launchLike = isLaunchLikeEvent(event);
  const points = impactLike
    ? [resolveEventTargetPoint(event), resolveEventAnchorPoint(event)]
    : launchLike
      ? [resolveEventSourcePoint(event), resolveEventAnchorPoint(event)]
      : [
          resolveEventAnchorPoint(event),
          resolveEventSourcePoint(event),
          resolveEventTargetPoint(event),
        ];
  return points.some((point) => isPointInsideBounds(point, bounds));
}

export function resolveEventPointColor(Cesium, event) {
  const type = `${event?.type ?? ""}`.toLowerCase();
  const resultTag = `${event?.resultTag ?? ""}`.toLowerCase();

  if (
    resultTag.includes("impact") ||
    type.includes("impact") ||
    type.includes("hit") ||
    type.includes("destroy")
  ) {
    return Cesium.Color.fromCssColorString("#ff8b7c").withAlpha(0.92);
  }

  if (
    resultTag.includes("launch") ||
    type.includes("launch") ||
    type.includes("weapon")
  ) {
    return Cesium.Color.fromCssColorString("#ffd166").withAlpha(0.92);
  }

  return Cesium.Color.fromCssColorString("#7fe7ff").withAlpha(0.88);
}

export function buildEventDescription(event) {
  return [
    `<strong>${escapeHtml(event?.message ?? "이벤트")}</strong>`,
    `${escapeHtml(event?.sideName ?? "세력 없음")} · ${escapeHtml(
      event?.type ?? "event"
    )}`,
    `시각 ${escapeHtml(formatRuntimeTimestamp(Number(event?.timestamp) || 0))}`,
    event?.actorName ? `행위자 ${escapeHtml(event.actorName)}` : null,
    event?.targetName ? `대상 ${escapeHtml(event.targetName)}` : null,
  ]
    .filter(Boolean)
    .join("<br/>");
}

export function isImpactLikeEvent(event) {
  const type = `${event?.type ?? ""}`.toLowerCase();
  const resultTag = `${event?.resultTag ?? ""}`.toLowerCase();
  const message = `${event?.message ?? ""}`.toLowerCase();

  return (
    resultTag.includes("impact") ||
    type.includes("impact") ||
    type.includes("hit") ||
    type.includes("destroy") ||
    /\b(hit|impact|격파|명중|파괴)\b/i.test(message)
  );
}

export function isLaunchLikeEvent(event) {
  const type = `${event?.type ?? ""}`.toLowerCase();
  const resultTag = `${event?.resultTag ?? ""}`.toLowerCase();
  const message = `${event?.message ?? ""}`.toLowerCase();

  return (
    resultTag.includes("launch") ||
    type.includes("launch") ||
    type.includes("weapon") ||
    /\b(launch|fired|발사|사격)\b/i.test(message)
  );
}

export function resolveFocusFireSummary(snapshot) {
  const summary =
    snapshot?.focusFireSummary && typeof snapshot.focusFireSummary === "object"
      ? snapshot.focusFireSummary
      : snapshot?.focusFire && typeof snapshot.focusFire === "object"
        ? snapshot.focusFire
        : null;

  if (!summary) {
    return null;
  }

  const latitude = Number(summary.objectiveLatitude);
  const longitude = Number(summary.objectiveLongitude);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return null;
  }

  return {
    ...summary,
    objectiveLatitude: latitude,
    objectiveLongitude: longitude,
  };
}

export function buildFocusFireObjectiveKey(summary) {
  if (!summary) {
    return "";
  }

  return [
    Number(summary.objectiveLatitude).toFixed(5),
    Number(summary.objectiveLongitude).toFixed(5),
  ].join(":");
}

export function isFocusFireImpactEvent(event, summary) {
  if (!event || !summary || !isImpactLikeEvent(event)) {
    return false;
  }

  const objectiveName = `${summary.objectiveName ?? ""}`.trim();
  if (objectiveName && `${event?.targetName ?? ""}`.trim() === objectiveName) {
    return true;
  }

  const impactPoint =
    normalizeGeoPoint(
      event?.targetLongitude,
      event?.targetLatitude,
      event?.targetAltitudeMeters
    ) ??
    normalizeGeoPoint(
      event?.focusLongitude,
      event?.focusLatitude,
      event?.focusAltitudeMeters
    );
  if (!impactPoint) {
    return false;
  }

  return (
    approximateDistanceMeters(impactPoint, {
      longitude: summary.objectiveLongitude,
      latitude: summary.objectiveLatitude,
      altitudeMeters: 0,
    }) <= FOCUS_FIRE_IMPACT_EVENT_DISTANCE_METERS
  );
}

export function resolveFocusFireImpactBoxState(
  snapshot,
  accumulatedImpactCount = 0
) {
  const summary = resolveFocusFireSummary(snapshot);
  if (!summary || summary.enabled !== true) {
    return null;
  }

  const weaponsInFlight = Math.max(0, Number(summary.weaponsInFlight) || 0);
  const impactLoad = Math.max(0, Number(accumulatedImpactCount) || 0);
  const expectedStrikeEffect = Number(
    summary?.recommendation?.expectedStrikeEffect
  );
  const expectedText = Number.isFinite(expectedStrikeEffect)
    ? `예상 ${formatImpactLoad(expectedStrikeEffect)}`
    : summary.active === true
      ? "진행 중"
      : `${summary.statusLabel ?? "대기"}`;

  return {
    longitude: summary.objectiveLongitude,
    latitude: summary.objectiveLatitude,
    altitudeMeters: 58,
    impactLoad,
    weaponsInFlight,
    expectedStrikeEffect: Number.isFinite(expectedStrikeEffect)
      ? expectedStrikeEffect
      : null,
    text: [
      `충격량 ${formatImpactLoad(impactLoad)}`,
      `탄착 ${Math.round(impactLoad)} · 비행 ${weaponsInFlight}`,
      expectedText,
    ].join("\n"),
  };
}
