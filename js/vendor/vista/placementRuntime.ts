// @ts-nocheck
import {
  SIDE_COLOR_MAP,
  WEAPON_TRANSIENT_EFFECT_LIMIT,
  RUNTIME_VISIBLE_UNIT_RENDER_LIMIT,
  RUNTIME_VISIBLE_WEAPON_RENDER_LIMIT,
  EVENT_EFFECT_KEY_LIMIT,
  WEAPON_LAUNCH_EFFECT_MS,
  WEAPON_IMPACT_EFFECT_MS,
  EVENT_TRACE_SAMPLE_COUNT,
  RUNTIME_UNIT_POSITION_SNAP_DISTANCE_METERS,
  RUNTIME_WEAPON_POSITION_SNAP_DISTANCE_METERS,
  TERRAIN_ANCHOR_FALLBACK_GROUND_ALTITUDE_METERS,
  TERRAIN_ANCHOR_HEIGHT_CACHE_DECIMALS,
  TERRAIN_ANCHOR_REFRESH_DELAY_MS,
  TERRAIN_ANCHOR_REFRESH_MAX_ATTEMPTS,
  EFFECT_TEXTURES,
  OBJECTIVE_MARKER_IMAGE_SIZE,
  OBJECTIVE_MARKER_IMAGE_CACHE,
  GROUND_MARKER_CANVAS_SIZE,
  GROUND_MARKER_IMAGE_CACHE,
  GROUND_UNIT_LAUNCH_EFFECT_MS,
} from "./placementRuntimeAssets";

import {
  normalizeBounds,
  expandBounds,
  normalizeHeading,
  escapeHtml,
  truncateText,
  formatMeters,
  isGroundRenderUnit,
  buildUnitRenderContext,
  resolveDisplayedUnitPoint,
  installTerrainModelAxisResolver,
  cssColorForSide,
  resolveUnitModel,
  isPointInsideBounds,
  isFixedTargetReferenceCoveredByGroundMarker,
  buildUnitDescription,
  resolveHeadingOrientation,
  resolveUnitModelHeadingDeg,
  createPlacementLabel,
  createUnitPointGraphics,
  isDroneLikePlacementUnit,
  createUnitBillboardGraphics,
  resolveGroundUnitVisualProfile,
  resolveGroundUnitMovementVisualState,
  createUnitProxyBoxGraphics,
  shouldRenderUnitModel,
  createUnitModelGraphics,
} from "./placementRuntimeModels";

import {
  notifyParentReady,
  sortPlacementUnitsForPanel,
  resolveFocusCameraPreset,
  formatRuntimeTimestamp,
  formatCompactCount,
  clamp,
  clamp01,
  resolveEffectTimelineValue,
  ensureCesiumColorMaterialProperty,
  buildCartesianFromPoint,
  resolveTerrainBoundWeaponMinimumAltitudeMeters,
  normalizeGeoPoint,
  resolveWeaponLaunchPoint,
  offsetPointByHeading,
  resolveWeaponImpactPoint,
  isTerrainBoundWeapon,
  resolveWeaponHeightReference,
  resolveWeaponDepthTestDistance,
  resolveWeaponDisplayPoint,
  shouldSpawnWeaponLaunchEffect,
  shouldSpawnWeaponVanishImpactEffect,
  resolveWeaponImpactCuePoint,
  approximateDistanceMeters,
  getRuntimeNowMs,
  createRuntimeMotionState,
  resolveRuntimeMotionPoint,
  updateRuntimeMotionState,
  isRuntimeMotionActive,
  buildWeaponDescription,
  resolveWeaponEffectProfile,
  resolveWeaponImpactDynamics,
  createWeaponPointGraphics,
  createWeaponModelGraphics,
  createWeaponBillboardGraphics,
  createWeaponLabelGraphics,
  resolveWeaponOrientation,
  resolveWeaponLaunchHeadingDeg,
  sampleWeaponFlareSalvoPoint,
  buildWeaponArcPointSamples,
  buildCartesianArrayFromPoints,
  buildWeaponTrajectoryPointSamples,
  buildWeaponTrailPointSamples,
  buildWeaponProjectileStreakPointSamples,
  createWeaponProjectedTrajectoryGraphics,
  createWeaponTravelTrailGraphics,
  createWeaponProjectileStreakGraphics,
  createWeaponImpactZoneGraphics,
  createWeaponFragmentZoneGraphics,
  createWeaponImpactCueGraphics,
  resolveTerrainObjectiveKind,
  resolveTerrainObjectiveStatus,
  buildUnitRoutePointSamples,
  resolveAircraftRouteProgressState,
  resolveLoiteringMunitionDiveProfile,
  resolveAircraftRouteVisualProfile,
  interpolateGeoPoint,
  samplePointAlongRoute,
  buildRouteFlowSamplePoints,
  createUnitRoutePolylineGraphics,
  createUnitRouteEndpointGraphics,
  createAircraftRouteEndpointLabelGraphics,
  createAircraftRouteFlowPointGraphics,
  createAircraftRouteGroupLabelGraphics,
  createLoiteringDroneDivePolylineGraphics,
  createLoiteringDroneFinalAttackLabelGraphics,
  createGroundShadowEllipseGraphics,
  createGroundSelectionRingGraphics,
  buildGroundDirectionPositions,
  createGroundDirectionPolylineGraphics,
  createGroundMovementDustBillboardGraphics,
  isWeaponInsideBounds,
  resolveEventAnchorPoint,
  buildEventEffectWeapon,
  isTerrainBoundEvent,
  resolveEventHeightReference,
  resolveEventDepthTestDistance,
  resolveEventDisplayPoint,
  buildEventTraceWeapon,
  buildEventTraceArrowPointSamples,
  createEventTraceArrowGraphics,
  createEventTraceGlowGraphics,
  createEventTraceDashGraphics,
  resolveEventTraceLabelPoint,
  createEventTraceLabelGraphics,
  isEventInsideBounds,
  resolveEventPointColor,
  buildEventDescription,
  isImpactLikeEvent,
  isLaunchLikeEvent,
  resolveFocusFireSummary,
  buildFocusFireObjectiveKey,
  isFocusFireImpactEvent,
  resolveFocusFireImpactBoxState,
} from "./placementRuntimeVisuals";

export * from "./placementRuntimeAssets";
export * from "./placementRuntimeModels";
export * from "./placementRuntimeVisuals";

export function createTerrainPlacementRuntime({
  Cesium,
  bounds,
  widthMeters,
  heightMeters,
  liveRuntimeEnabled = false,
  notifyReadyOnAttach = true,
  animationFrameIntervalMs = 0,
  setStatusMessage,
  setPlacementBadge,
}) {
  installTerrainModelAxisResolver(Cesium);

  let viewer = null;
  let dataSource = null;
  let weaponDataSource = null;
  let eventDataSource = null;
  let objectiveDataSource = null;
  let groundMarkerDataSource = null;
  let focusFireDataSource = null;
  let effectDataSource = null;
  let pendingSnapshot = null;
  let lastSnapshot = null;
  let focusedUnitId = null;
  let activeUnits = [];
  let activeReferencePoints = [];
  let activeEvents = [];
  let interactionHandler = null;

  const unitStateById = new Map();
  const weaponStateById = new Map();
  const objectivePointByEntityId = new Map();
  const eventByEntityId = new Map();
  const activeTransientEffects = new Map();
  const triggeredEventEffectIds = new Set();
  const focusFireSeenImpactEventIds = new Set();
  const terrainHeightByKey = new Map();
  let focusFireImpactObjectiveKey = "";
  let focusFireImpactCount = 0;
  let focusFireImpactRingEntity = null;
  let focusFireImpactLabelEntity = null;
  let terrainRefreshTimerId = null;
  let terrainAnchorRefreshAttempts = 0;
  const assetPanel = document.getElementById("assetPanel");
  const assetCountBadge = document.getElementById("assetCountBadge");
  const assetFocusHint = document.getElementById("assetFocusHint");
  const assetList = document.getElementById("assetList");
  const assetDetail = document.getElementById("assetDetail");
  const runtimeModeBadge = document.getElementById("runtimeModeBadge");
  const runtimeTimeMetric = document.getElementById("runtimeTimeMetric");
  const runtimeSideMetric = document.getElementById("runtimeSideMetric");
  const runtimeAssetMetric = document.getElementById("runtimeAssetMetric");
  const runtimeWeaponMetric = document.getElementById("runtimeWeaponMetric");
  const runtimeSelectionText = document.getElementById("runtimeSelectionText");
  const runtimeEventList = document.getElementById("runtimeEventList");

  const placementBounds = expandBounds(bounds, 0.04, 0.0005);
  const terrainEffectBounds = normalizeBounds(bounds, 0);
  const labelDistance = Math.max(widthMeters, heightMeters) * 7 + 5000;
  const runtimeVisualOptions = {
    showWeaponTrails: true,
    showEventEffects: true,
    showUnitModels: true,
    showUnitProxyBoxes: true,
    showFriendlyModelOutlines: false,
    showDetailedLabels: false,
    autoTrackImpacts: false,
    impactCameraShake: false,
    showLaunchEffects: true,
  };
  let lastTrackedImpactEventId = null;
  const runtimeAnimationFrameIntervalMs = Math.max(
    0,
    Number(animationFrameIntervalMs) || 0
  );

  function requestRender() {
    viewer?.scene?.requestRender?.();
  }

  let positionInterpolationLoopActive = false;
  let lastPositionInterpolationFrameAt = -Infinity;

  function createRuntimeCartesianPositionProperty(
    motionState,
    transformPoint = null
  ) {
    return new Cesium.CallbackProperty(() => {
      const point = resolveRuntimeMotionPoint(motionState);
      return buildCartesianFromPoint(
        Cesium,
        typeof transformPoint === "function" ? transformPoint(point) : point
      );
    }, false);
  }

  function hasActivePositionInterpolation() {
    const nowMs = getRuntimeNowMs();
    for (const unitState of unitStateById.values()) {
      if (isRuntimeMotionActive(unitState?.motionState, nowMs)) {
        return true;
      }
    }
    for (const weaponState of weaponStateById.values()) {
      if (isRuntimeMotionActive(weaponState?.motionState, nowMs)) {
        return true;
      }
    }
    return false;
  }

  function startPositionInterpolationLoop() {
    if (positionInterpolationLoopActive) {
      return;
    }

    positionInterpolationLoopActive = true;
    const tick = (frameTime = performance.now()) => {
      if (
        runtimeAnimationFrameIntervalMs <= 0 ||
        frameTime - lastPositionInterpolationFrameAt >=
          runtimeAnimationFrameIntervalMs
      ) {
        lastPositionInterpolationFrameAt = frameTime;
        requestRender();
      }
      if (hasActivePositionInterpolation()) {
        window.requestAnimationFrame(tick);
      } else {
        positionInterpolationLoopActive = false;
        lastPositionInterpolationFrameAt = -Infinity;
      }
    };
    window.requestAnimationFrame(tick);
  }

  function updateEntityMotionState(motionState, nextPoint, options) {
    updateRuntimeMotionState(motionState, nextPoint, options);
    if (isRuntimeMotionActive(motionState)) {
      startPositionInterpolationLoop();
    }
    return motionState;
  }

  function buildTerrainHeightCacheKey(longitude, latitude) {
    if (!Number.isFinite(longitude) || !Number.isFinite(latitude)) {
      return "";
    }

    return `${longitude.toFixed(TERRAIN_ANCHOR_HEIGHT_CACHE_DECIMALS)}:${latitude.toFixed(TERRAIN_ANCHOR_HEIGHT_CACHE_DECIMALS)}`;
  }

  function rememberTerrainHeight(longitude, latitude, terrainHeight) {
    if (!Number.isFinite(terrainHeight)) {
      return;
    }

    const key = buildTerrainHeightCacheKey(longitude, latitude);
    if (key) {
      terrainHeightByKey.set(key, terrainHeight);
    }
  }

  function lookupTerrainHeight(longitude, latitude) {
    const key = buildTerrainHeightCacheKey(longitude, latitude);
    if (!key) {
      return undefined;
    }

    return terrainHeightByKey.get(key);
  }

  function scheduleTerrainAnchoredRefresh() {
    if (
      !lastSnapshot ||
      terrainRefreshTimerId !== null ||
      terrainAnchorRefreshAttempts >= TERRAIN_ANCHOR_REFRESH_MAX_ATTEMPTS
    ) {
      return;
    }

    const schedule = globalThis.setTimeout;
    if (typeof schedule !== "function") {
      return;
    }

    terrainAnchorRefreshAttempts += 1;
    terrainRefreshTimerId = schedule(() => {
      terrainRefreshTimerId = null;
      if (lastSnapshot) {
        applySnapshot(lastSnapshot);
      }
    }, TERRAIN_ANCHOR_REFRESH_DELAY_MS);
  }

  function getTransientEffectProgress(effect) {
    return clamp01(
      (performance.now() - effect.startedAtMs) / Math.max(1, effect.durationMs)
    );
  }

  function removeTransientEffect(effectKey, options = {}) {
    const effect = activeTransientEffects.get(effectKey);
    if (!effect) {
      return;
    }

    effect.entities.forEach((entity) => {
      effectDataSource?.entities?.remove(entity);
    });
    activeTransientEffects.delete(effectKey);
    if (options.completed === true && typeof effect.onComplete === "function") {
      effect.onComplete();
    }
  }

  function pruneTransientEffects() {
    const now = performance.now();
    activeTransientEffects.forEach((effect, effectKey) => {
      if (now - effect.startedAtMs >= effect.durationMs) {
        removeTransientEffect(effectKey, { completed: true });
      }
    });

    while (activeTransientEffects.size > WEAPON_TRANSIENT_EFFECT_LIMIT) {
      const oldestKey = activeTransientEffects.keys().next().value;
      if (!oldestKey) {
        break;
      }
      removeTransientEffect(oldestKey);
    }
  }

  let transientEffectLoopActive = false;
  let lastTransientEffectFrameAt = -Infinity;
  function startTransientEffectLoop() {
    if (transientEffectLoopActive) {
      return;
    }

    transientEffectLoopActive = true;
    const tick = (frameTime = performance.now()) => {
      if (
        runtimeAnimationFrameIntervalMs <= 0 ||
        frameTime - lastTransientEffectFrameAt >=
          runtimeAnimationFrameIntervalMs
      ) {
        lastTransientEffectFrameAt = frameTime;
        pruneTransientEffects();
        requestRender();
      }
      if (activeTransientEffects.size > 0) {
        window.requestAnimationFrame(tick);
      } else {
        transientEffectLoopActive = false;
        lastTransientEffectFrameAt = -Infinity;
      }
    };
    window.requestAnimationFrame(tick);
  }

  function rememberTriggeredEventEffect(effectKey) {
    triggeredEventEffectIds.add(effectKey);
    while (triggeredEventEffectIds.size > EVENT_EFFECT_KEY_LIMIT) {
      const oldestKey = triggeredEventEffectIds.values().next().value;
      if (!oldestKey) {
        break;
      }
      triggeredEventEffectIds.delete(oldestKey);
    }
  }

  function makeEffectScaleProperty(effect, startScale, endScale) {
    return new Cesium.CallbackProperty(() => {
      const progress = getTransientEffectProgress(effect);
      return startScale + (endScale - startScale) * progress;
    }, false);
  }

  function makeEffectTimelineNumberProperty(effect, stops, fallback = 0) {
    return new Cesium.CallbackProperty(
      () =>
        resolveEffectTimelineValue(
          getTransientEffectProgress(effect),
          stops,
          fallback
        ),
      false
    );
  }

  function makeEffectFrameImageProperty(
    effect,
    frames,
    startRatio = 0,
    endRatio = 1
  ) {
    const safeFrames =
      Array.isArray(frames) && frames.length > 0 ? frames : [""];
    return new Cesium.CallbackProperty(() => {
      const rawProgress = getTransientEffectProgress(effect);
      const frameProgress = clamp01(
        (rawProgress - startRatio) / Math.max(0.0001, endRatio - startRatio)
      );
      const frameIndex = clamp(
        Math.floor(frameProgress * safeFrames.length),
        0,
        safeFrames.length - 1
      );
      return safeFrames[frameIndex];
    }, false);
  }

  function makeEffectColorProperty(effect, cssColor, startAlpha, endAlpha) {
    return new Cesium.CallbackProperty(() => {
      const progress = getTransientEffectProgress(effect);
      return Cesium.Color.fromCssColorString(cssColor).withAlpha(
        startAlpha + (endAlpha - startAlpha) * progress
      );
    }, false);
  }

  function makeEffectTimelineColorProperty(
    effect,
    cssColor,
    stops,
    fallback = 0
  ) {
    return new Cesium.CallbackProperty(() => {
      const alpha = resolveEffectTimelineValue(
        getTransientEffectProgress(effect),
        stops,
        fallback
      );
      return Cesium.Color.fromCssColorString(cssColor).withAlpha(
        clamp01(alpha)
      );
    }, false);
  }

  function getDelayedTransientEffectProgress(effect, delayMs = 0) {
    const delay = Math.max(0, Number(delayMs) || 0);
    return clamp01(
      (performance.now() - effect.startedAtMs - delay) /
        Math.max(1, effect.durationMs - delay)
    );
  }

  function makeDelayedEffectTimelineNumberProperty(
    effect,
    delayMs,
    stops,
    fallback = 0
  ) {
    return new Cesium.CallbackProperty(() => {
      return resolveEffectTimelineValue(
        getDelayedTransientEffectProgress(effect, delayMs),
        stops,
        fallback
      );
    }, false);
  }

  function makeDelayedEffectTimelineColorProperty(
    effect,
    delayMs,
    cssColor,
    stops,
    fallback = 0
  ) {
    return new Cesium.CallbackProperty(() => {
      const alpha = resolveEffectTimelineValue(
        getDelayedTransientEffectProgress(effect, delayMs),
        stops,
        fallback
      );
      return Cesium.Color.fromCssColorString(cssColor).withAlpha(
        clamp01(alpha)
      );
    }, false);
  }

  function resolveFlareEffectPointAtProgress(config, progressRatio) {
    return sampleWeaponFlareSalvoPoint(
      config.launchPoint,
      config.headingDeg,
      config.flareIndex,
      progressRatio,
      config.pathOptions
    );
  }

  function makeFlareEffectPositionProperty(effect, config, progressLag = 0) {
    return new Cesium.CallbackProperty(() => {
      const progress = Math.max(
        0,
        getDelayedTransientEffectProgress(effect, config.delayMs) - progressLag
      );
      return buildCartesianFromPoint(
        Cesium,
        resolveFlareEffectPointAtProgress(config, progress)
      );
    }, false);
  }

  function makeFlareEffectTrailPositionsProperty(effect, config) {
    return new Cesium.CallbackProperty(() => {
      const progress = getDelayedTransientEffectProgress(
        effect,
        config.delayMs
      );
      if (progress <= 0) {
        const startPoint = resolveFlareEffectPointAtProgress(config, 0);
        return buildCartesianArrayFromPoints(Cesium, [startPoint, startPoint]);
      }

      const sampleCount = 7;
      const startProgress = Math.max(0, progress - 0.5);
      const points = Array.from({ length: sampleCount }, (_item, index) => {
        const ratio =
          startProgress +
          (progress - startProgress) * (index / Math.max(1, sampleCount - 1));
        return resolveFlareEffectPointAtProgress(config, ratio);
      }).filter(Boolean);

      return buildCartesianArrayFromPoints(Cesium, points);
    }, false);
  }

  function spawnFlareLaunchEffect(
    effectKey,
    weapon,
    launchPoint,
    effectProfile
  ) {
    const effect = {
      startedAtMs: performance.now(),
      durationMs: Math.max(4200, effectProfile.residualSmokeMs + 1200),
      entities: [],
    };
    const headingDeg = resolveWeaponLaunchHeadingDeg(weapon, launchPoint);
    const effectHeightReference = resolveWeaponHeightReference(Cesium, weapon);
    const effectDepthTestDistance = resolveWeaponDepthTestDistance(weapon);
    const pathOptions = {
      aftDistanceMeters: 315,
      lateralDistanceMeters: 38,
      dropMeters: 165,
      kickMeters: 30,
    };

    Array.from({ length: 4 }, (_item, flareIndex) => {
      const delayMs = flareIndex * 115;
      const config = {
        launchPoint,
        headingDeg,
        flareIndex,
        delayMs,
        pathOptions,
      };

      effect.entities.push(
        effectDataSource.entities.add({
          id: `terrain-flare-trail-${effectKey}-${flareIndex}`,
          polyline: {
            positions: makeFlareEffectTrailPositionsProperty(effect, config),
            width: 4.2,
            material: new Cesium.PolylineGlowMaterialProperty({
              glowPower: 0.2,
              taperPower: 0.72,
              color: makeDelayedEffectTimelineColorProperty(
                effect,
                delayMs,
                "#fff3a3",
                [
                  { at: 0, value: 0 },
                  { at: 0.08, value: 0.96 },
                  { at: 0.48, value: 0.82 },
                  { at: 0.82, value: 0.34 },
                  { at: 1, value: 0 },
                ]
              ),
            }),
            clampToGround: false,
            disableDepthTestDistance: effectDepthTestDistance,
          },
        }),
        effectDataSource.entities.add({
          id: `terrain-flare-halo-${effectKey}-${flareIndex}`,
          position: makeFlareEffectPositionProperty(effect, config),
          billboard: {
            image: EFFECT_TEXTURES.headGlow,
            scale: makeDelayedEffectTimelineNumberProperty(effect, delayMs, [
              { at: 0, value: 0 },
              { at: 0.04, value: 0.72 },
              { at: 0.16, value: 2.15 },
              { at: 0.58, value: 1.62 },
              { at: 0.9, value: 0.52 },
              { at: 1, value: 0 },
            ]),
            width: 138,
            height: 138,
            color: makeDelayedEffectTimelineColorProperty(
              effect,
              delayMs,
              "#ff8f1f",
              [
                { at: 0, value: 0 },
                { at: 0.05, value: 0.92 },
                { at: 0.4, value: 0.7 },
                { at: 0.78, value: 0.22 },
                { at: 1, value: 0 },
              ]
            ),
            verticalOrigin: Cesium.VerticalOrigin.CENTER,
            horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
            heightReference: effectHeightReference,
            disableDepthTestDistance: effectDepthTestDistance,
          },
        }),
        effectDataSource.entities.add({
          id: `terrain-flare-core-${effectKey}-${flareIndex}`,
          position: makeFlareEffectPositionProperty(effect, config),
          billboard: {
            image: EFFECT_TEXTURES.impactFlash,
            scale: makeDelayedEffectTimelineNumberProperty(effect, delayMs, [
              { at: 0, value: 0 },
              { at: 0.03, value: 0.46 },
              { at: 0.12, value: 0.92 },
              { at: 0.62, value: 0.72 },
              { at: 0.9, value: 0.18 },
              { at: 1, value: 0 },
            ]),
            width: 72,
            height: 72,
            color: makeDelayedEffectTimelineColorProperty(
              effect,
              delayMs,
              "#fffbd2",
              [
                { at: 0, value: 0 },
                { at: 0.02, value: 1 },
                { at: 0.62, value: 0.96 },
                { at: 0.88, value: 0.36 },
                { at: 1, value: 0 },
              ]
            ),
            verticalOrigin: Cesium.VerticalOrigin.CENTER,
            horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
            heightReference: effectHeightReference,
            disableDepthTestDistance: effectDepthTestDistance,
          },
        })
      );

      [0.16, 0.34].forEach((lag, smokeIndex) => {
        effect.entities.push(
          effectDataSource.entities.add({
            id: `terrain-flare-smoke-${effectKey}-${flareIndex}-${smokeIndex}`,
            position: makeFlareEffectPositionProperty(effect, config, lag),
            billboard: {
              image:
                smokeIndex === 0
                  ? EFFECT_TEXTURES.trailSmoke
                  : EFFECT_TEXTURES.impactSmoke,
              scale: makeDelayedEffectTimelineNumberProperty(
                effect,
                delayMs + smokeIndex * 160,
                [
                  { at: 0, value: 0 },
                  { at: 0.18, value: 0.24 + smokeIndex * 0.08 },
                  { at: 0.52, value: 0.78 + smokeIndex * 0.16 },
                  { at: 1, value: 1.18 + smokeIndex * 0.24 },
                ]
              ),
              width: 72 + smokeIndex * 18,
              height: 72 + smokeIndex * 18,
              color: makeDelayedEffectTimelineColorProperty(
                effect,
                delayMs + smokeIndex * 160,
                "#d8d7c8",
                [
                  { at: 0, value: 0 },
                  { at: 0.2, value: 0.36 },
                  { at: 0.64, value: 0.22 },
                  { at: 1, value: 0 },
                ]
              ),
              verticalOrigin: Cesium.VerticalOrigin.CENTER,
              horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
              heightReference: effectHeightReference,
              disableDepthTestDistance: effectDepthTestDistance,
            },
          })
        );
      });
    });

    activeTransientEffects.set(effectKey, effect);
    startTransientEffectLoop();
  }

  function spawnLaunchEffect(effectKey, weapon) {
    if (runtimeVisualOptions.showLaunchEffects !== true) {
      return;
    }
    const effectProfile = resolveWeaponEffectProfile(weapon);
    if (weapon?.suppressLaunchEffect === true && !effectProfile.flareLike) {
      return;
    }
    if (
      !runtimeVisualOptions.showEventEffects ||
      activeTransientEffects.has(effectKey)
    ) {
      return;
    }

    const launchPoint = resolveWeaponLaunchPoint(weapon);
    if (!launchPoint || !isPointInsideBounds(launchPoint, placementBounds)) {
      return;
    }

    const effect = {
      startedAtMs: performance.now(),
      durationMs: WEAPON_LAUNCH_EFFECT_MS,
      entities: [],
    };
    if (effectProfile.flareLike) {
      spawnFlareLaunchEffect(effectKey, weapon, launchPoint, effectProfile);
      return;
    }

    const terrainBoundLaunch = isTerrainBoundWeapon(weapon);
    const effectHeightReference = terrainBoundLaunch
      ? Cesium.HeightReference.RELATIVE_TO_GROUND
      : resolveWeaponHeightReference(Cesium, weapon);
    const effectDepthTestDistance = terrainBoundLaunch
      ? Number.POSITIVE_INFINITY
      : resolveWeaponDepthTestDistance(weapon);
    const position = buildRuntimeCartesianFromHeightReferencedPoint(
      launchPoint,
      terrainBoundLaunch,
      18
    );
    const smokePosition = buildRuntimeCartesianFromHeightReferencedPoint(
      launchPoint,
      terrainBoundLaunch,
      14
    );
    const flashEndScale = effectProfile.launchFlashScale;
    const flashStartScale = effectProfile.directFireLike ? 0.42 : 0.78;
    const flashSize =
      effectProfile.flightProfile === "artillery"
        ? 126
        : effectProfile.flightProfile === "rocket"
          ? effectProfile.apacheRocketLike
            ? 146
            : 112
          : effectProfile.directFireLike
            ? effectProfile.apacheGunLike
              ? 82
              : 54
            : 78;

    effect.entities.push(
      effectDataSource.entities.add({
        id: `terrain-weapon-launch-${effectKey}`,
        position,
        billboard: {
          image: EFFECT_TEXTURES.launchMuzzle,
          scale: makeEffectScaleProperty(
            effect,
            flashStartScale,
            flashEndScale
          ),
          width: flashSize,
          height: flashSize,
          color: makeEffectColorProperty(effect, "#ffd166", 0.94, 0.02),
          verticalOrigin: Cesium.VerticalOrigin.CENTER,
          horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
          heightReference: effectHeightReference,
          disableDepthTestDistance: effectDepthTestDistance,
        },
      }),
      effectDataSource.entities.add({
        id: `terrain-weapon-launch-smoke-${effectKey}`,
        position: smokePosition,
        billboard: {
          image: effectProfile.directFireLike
            ? EFFECT_TEXTURES.impactDust
            : EFFECT_TEXTURES.trailSmoke,
          scale: makeEffectTimelineNumberProperty(effect, [
            { at: 0, value: effectProfile.directFireLike ? 0.18 : 0.34 },
            {
              at: 0.25,
              value: effectProfile.directFireLike
                ? effectProfile.apacheGunLike
                  ? 0.82
                  : 0.62
                : 1.12,
            },
            {
              at: 0.78,
              value: effectProfile.directFireLike
                ? effectProfile.apacheGunLike
                  ? 1.34
                  : 1.05
                : 1.72,
            },
            {
              at: 1,
              value: effectProfile.directFireLike
                ? effectProfile.apacheGunLike
                  ? 1.52
                  : 1.18
                : 2.05,
            },
          ]),
          width: effectProfile.directFireLike
            ? effectProfile.apacheGunLike
              ? 104
              : 72
            : 118,
          height: effectProfile.directFireLike
            ? effectProfile.apacheGunLike
              ? 68
              : 46
            : 96,
          color: makeEffectTimelineColorProperty(effect, "#d9dedb", [
            { at: 0, value: effectProfile.directFireLike ? 0.36 : 0.5 },
            { at: 0.32, value: effectProfile.directFireLike ? 0.22 : 0.42 },
            { at: 0.8, value: 0.08 },
            { at: 1, value: 0 },
          ]),
          verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
          horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
          heightReference: effectHeightReference,
          disableDepthTestDistance: effectDepthTestDistance,
        },
      })
    );

    if (effectProfile.flightProfile === "rocket") {
      const smokeColumnPosition =
        buildRuntimeCartesianFromHeightReferencedPoint(
          launchPoint,
          terrainBoundLaunch,
          46
        );
      const smokeColumnHighPosition =
        buildRuntimeCartesianFromHeightReferencedPoint(
          launchPoint,
          terrainBoundLaunch,
          104
        );

      effect.entities.push(
        effectDataSource.entities.add({
          id: `terrain-weapon-launch-smoke-column-${effectKey}`,
          position: smokeColumnPosition,
          billboard: {
            image: EFFECT_TEXTURES.trailSmoke,
            scale: makeEffectTimelineNumberProperty(effect, [
              { at: 0, value: 0.2 * effectProfile.smokeColumnScale },
              { at: 0.24, value: 1.18 * effectProfile.smokeColumnScale },
              { at: 0.7, value: 2.18 * effectProfile.smokeColumnScale },
              { at: 1, value: 2.85 * effectProfile.smokeColumnScale },
            ]),
            width: 112,
            height: 238,
            color: makeEffectTimelineColorProperty(effect, "#d7ded9", [
              { at: 0, value: 0.42 },
              { at: 0.26, value: 0.6 },
              { at: 0.74, value: 0.28 },
              { at: 1, value: 0 },
            ]),
            verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
            horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
            heightReference: effectHeightReference,
            disableDepthTestDistance: effectDepthTestDistance,
          },
        }),
        effectDataSource.entities.add({
          id: `terrain-weapon-launch-smoke-column-high-${effectKey}`,
          position: smokeColumnHighPosition,
          billboard: {
            image: EFFECT_TEXTURES.impactSmoke,
            scale: makeEffectTimelineNumberProperty(effect, [
              { at: 0, value: 0.08 },
              { at: 0.34, value: 0.72 * effectProfile.smokeColumnScale },
              { at: 0.82, value: 1.72 * effectProfile.smokeColumnScale },
              { at: 1, value: 2.2 * effectProfile.smokeColumnScale },
            ]),
            width: 146,
            height: 186,
            color: makeEffectTimelineColorProperty(effect, "#c8d0cc", [
              { at: 0, value: 0 },
              { at: 0.28, value: 0.38 },
              { at: 0.76, value: 0.2 },
              { at: 1, value: 0 },
            ]),
            verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
            horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
            heightReference: effectHeightReference,
            disableDepthTestDistance: effectDepthTestDistance,
          },
        })
      );
    }

    activeTransientEffects.set(effectKey, effect);
    startTransientEffectLoop();
  }

  function findLaunchUnitStateForEvent(event, anchorPoint) {
    const actorId =
      typeof event?.actorId === "string" && event.actorId.length > 0
        ? event.actorId
        : null;
    const actorState = actorId ? unitStateById.get(actorId) : null;
    const actorProfile = actorState
      ? resolveGroundUnitVisualProfile(
          actorState.unit,
          actorState.model,
          isUnitEmphasized(actorState.unit)
        )
      : null;
    if (actorProfile?.launchCapable) {
      return actorState;
    }

    if (!anchorPoint) {
      return null;
    }

    let closestState = null;
    let closestDistance = Number.POSITIVE_INFINITY;
    activeUnits.forEach((unitState) => {
      const profile = resolveGroundUnitVisualProfile(
        unitState.unit,
        unitState.model,
        isUnitEmphasized(unitState.unit)
      );
      if (!profile?.launchCapable) {
        return;
      }

      const distanceMeters = approximateDistanceMeters(
        unitState.displayPoint,
        anchorPoint
      );
      if (distanceMeters < closestDistance) {
        closestDistance = distanceMeters;
        closestState = unitState;
      }
    });

    return closestDistance <= 130 ? closestState : null;
  }

  function spawnGroundUnitLaunchEffect(effectKey, unitState) {
    if (runtimeVisualOptions.showLaunchEffects !== true) {
      return;
    }
    if (
      !runtimeVisualOptions.showEventEffects ||
      activeTransientEffects.has(effectKey)
    ) {
      return;
    }

    const emphasized = isUnitEmphasized(unitState.unit);
    const profile = resolveGroundUnitVisualProfile(
      unitState.unit,
      unitState.model,
      emphasized
    );
    if (!profile?.launchCapable) {
      return;
    }

    const basePoint = normalizeGeoPoint(
      unitState.displayPoint.longitude,
      unitState.displayPoint.latitude,
      Math.max(0, Number(unitState.displayPoint.altitudeMeters) || 0)
    );
    if (!basePoint || !isPointInsideBounds(basePoint, placementBounds)) {
      return;
    }

    const headingDeg = normalizeHeading(unitState.unit?.headingDeg);
    const muzzlePoint = offsetPointByHeading(
      {
        ...basePoint,
        altitudeMeters: basePoint.altitudeMeters + profile.muzzleAltitudeMeters,
      },
      headingDeg,
      profile.muzzleForwardOffsetMeters
    );
    const smokePoint = offsetPointByHeading(
      {
        ...basePoint,
        altitudeMeters:
          basePoint.altitudeMeters + profile.muzzleAltitudeMeters * 0.72,
      },
      headingDeg + 180,
      profile.dustBackOffsetMeters * 0.35
    );
    const groundDustPoint = offsetPointByHeading(
      {
        ...basePoint,
        altitudeMeters: Math.max(3, basePoint.altitudeMeters + 3),
      },
      headingDeg + 180,
      profile.dustBackOffsetMeters
    );
    const effect = {
      startedAtMs: performance.now(),
      durationMs: GROUND_UNIT_LAUNCH_EFFECT_MS,
      entities: [],
    };
    const flashColor = profile.kind === "air-defense" ? "#f3ff8f" : "#ffd166";
    const smokeAlpha = profile.kind === "launcher" ? 0.62 : 0.52;

    effect.entities.push(
      effectDataSource.entities.add({
        id: `terrain-ground-launch-flash-${effectKey}`,
        position: buildCartesianFromPoint(Cesium, muzzlePoint),
        billboard: {
          image: EFFECT_TEXTURES.launchMuzzle,
          scale: makeEffectTimelineNumberProperty(effect, [
            { at: 0, value: 0.4 },
            { at: 0.08, value: emphasized ? 1.48 : 1.22 },
            { at: 0.24, value: emphasized ? 2.05 : 1.72 },
            { at: 1, value: 0.38 },
          ]),
          width: profile.launchFlashSize,
          height: profile.launchFlashSize,
          color: makeEffectTimelineColorProperty(effect, flashColor, [
            { at: 0, value: 0.98 },
            { at: 0.12, value: 0.92 },
            { at: 0.28, value: 0.14 },
            { at: 1, value: 0 },
          ]),
          verticalOrigin: Cesium.VerticalOrigin.CENTER,
          horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
          heightReference: Cesium.HeightReference.RELATIVE_TO_GROUND,
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
        },
      }),
      effectDataSource.entities.add({
        id: `terrain-ground-launch-smoke-${effectKey}`,
        position: buildCartesianFromPoint(Cesium, smokePoint),
        billboard: {
          image: EFFECT_TEXTURES.trailSmoke,
          scale: makeEffectTimelineNumberProperty(effect, [
            { at: 0, value: 0.26 },
            { at: 0.22, value: emphasized ? 1.22 : 1.04 },
            { at: 0.72, value: emphasized ? 1.92 : 1.64 },
            { at: 1, value: emphasized ? 2.28 : 1.96 },
          ]),
          width: profile.launchSmokeSize,
          height: profile.launchSmokeSize,
          color: makeEffectTimelineColorProperty(effect, "#d8ddd8", [
            { at: 0, value: smokeAlpha },
            { at: 0.32, value: smokeAlpha * 0.78 },
            { at: 0.78, value: 0.12 },
            { at: 1, value: 0 },
          ]),
          verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
          horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
          heightReference: Cesium.HeightReference.RELATIVE_TO_GROUND,
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
        },
      }),
      effectDataSource.entities.add({
        id: `terrain-ground-launch-dust-${effectKey}`,
        position: buildCartesianFromPoint(Cesium, groundDustPoint),
        billboard: {
          image: EFFECT_TEXTURES.impactDust,
          scale: makeEffectTimelineNumberProperty(effect, [
            { at: 0, value: 0.24 },
            { at: 0.2, value: emphasized ? 1.12 : 0.92 },
            { at: 0.74, value: emphasized ? 1.74 : 1.46 },
            { at: 1, value: emphasized ? 1.94 : 1.62 },
          ]),
          width: profile.dustWidth * 1.16,
          height: profile.dustHeight * 1.08,
          color: makeEffectTimelineColorProperty(effect, "#cdb38d", [
            { at: 0, value: 0.46 },
            { at: 0.32, value: 0.34 },
            { at: 0.82, value: 0.08 },
            { at: 1, value: 0 },
          ]),
          verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
          horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
          heightReference: Cesium.HeightReference.RELATIVE_TO_GROUND,
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
        },
      })
    );

    activeTransientEffects.set(effectKey, effect);
    startTransientEffectLoop();
  }

  function spawnImpactEffect(
    effectKey,
    point,
    sideColor = "yellow",
    options = {}
  ) {
    if (
      !runtimeVisualOptions.showEventEffects ||
      activeTransientEffects.has(effectKey)
    ) {
      return;
    }

    if (!point || !isPointInsideBounds(point, terrainEffectBounds)) {
      return;
    }

    const effect = {
      startedAtMs: performance.now(),
      durationMs: options.durationMs ?? WEAPON_IMPACT_EFFECT_MS,
      entities: [],
    };
    const impactColor =
      options.impactColor ??
      SIDE_COLOR_MAP[`${sideColor ?? ""}`.toLowerCase()] ??
      "#ff9f1c";
    const flashColor = options.flashColor ?? "#ffcf7a";
    const smokeColor = options.smokeColor ?? "#ffffff";
    const highSmokeColor = options.highSmokeColor ?? "#dbe2df";
    const dustColor = options.dustColor ?? "#ffd8a1";
    const outlineColor = options.outlineColor ?? "#ffd8a1";
    const fireballColor = options.fireballColor ?? "#ffffff";
    const fireballAlphaScale = options.fireballAlphaScale ?? 1;
    const flashAlphaScale = options.flashAlphaScale ?? 1;
    const terrainBoundEffect = options.terrainBound === true;
    const effectHeightReference = terrainBoundEffect
      ? Cesium.HeightReference.RELATIVE_TO_GROUND
      : Cesium.HeightReference.NONE;
    const effectDepthTestDistance = terrainBoundEffect
      ? 0
      : Number.POSITIVE_INFINITY;
    const baseAltitude = terrainBoundEffect
      ? 0
      : Math.max(0, Number(point.altitudeMeters) || 0);
    const radiusMeters = options.radiusMeters ?? 102;
    const scorchRadiusMeters =
      options.scorchRadiusMeters ?? radiusMeters * 0.58;
    const residualSmokeScale = options.residualSmokeScale ?? 1;
    const ringScale = options.ringScale ?? 1;
    const secondaryRingScale = options.secondaryRingScale ?? ringScale;
    const pressureWaveScale = options.pressureWaveScale ?? ringScale;
    const pressureWaveAlphaScale = options.pressureWaveAlphaScale ?? 0.72;
    const flashScale = options.flashScale ?? 1;
    const fireballScale = options.fireballScale ?? 1;
    const dustScale = options.dustScale ?? 1;
    const smokeScale = options.smokeScale ?? 1;
    const highSmokeScale = options.highSmokeScale ?? smokeScale;
    const scorchAlphaScale = options.scorchAlphaScale ?? 1;
    const flashPeakRatio = clamp(options.flashPeakRatio ?? 0.06, 0.02, 0.14);
    const smokeStartRatio = clamp(options.smokeStartRatio ?? 0.1, 0, 0.32);
    const dustStartRatio = clamp(options.dustStartRatio ?? 0.05, 0, 0.24);
    const ringRadiusMeters = radiusMeters * ringScale;
    const secondaryRingRadiusMeters = radiusMeters * secondaryRingScale;
    const pressureWaveRadiusMeters = radiusMeters * pressureWaveScale;
    const smokePeakRatio = clamp(smokeStartRatio + 0.2, 0.12, 0.56);
    const dustPeakRatio = clamp(dustStartRatio + 0.18, 0.1, 0.48);
    const centerPosition = buildRuntimeCartesianFromHeightReferencedPoint(
      point,
      terrainBoundEffect,
      baseAltitude
    );
    const fireballPosition = buildRuntimeCartesianFromHeightReferencedPoint(
      point,
      terrainBoundEffect,
      Math.max(30, baseAltitude + 42)
    );
    const smokePosition = buildRuntimeCartesianFromHeightReferencedPoint(
      point,
      terrainBoundEffect,
      Math.max(52, baseAltitude + 74)
    );
    const highSmokePosition = buildRuntimeCartesianFromHeightReferencedPoint(
      point,
      terrainBoundEffect,
      Math.max(86, baseAltitude + 112)
    );
    const dustPosition = buildRuntimeCartesianFromHeightReferencedPoint(
      point,
      terrainBoundEffect,
      Math.max(10, baseAltitude + 10)
    );

    effect.entities.push(
      effectDataSource.entities.add({
        id: `terrain-impact-ring-${effectKey}`,
        position: centerPosition,
        ellipse: {
          semiMajorAxis: makeEffectTimelineNumberProperty(effect, [
            { at: 0, value: 10 },
            { at: 0.24, value: ringRadiusMeters * 0.78 },
            { at: 0.72, value: ringRadiusMeters * 1.22 },
            { at: 1, value: ringRadiusMeters * 1.34 },
          ]),
          semiMinorAxis: makeEffectTimelineNumberProperty(effect, [
            { at: 0, value: 10 },
            { at: 0.24, value: ringRadiusMeters * 0.78 },
            { at: 0.72, value: ringRadiusMeters * 1.22 },
            { at: 1, value: ringRadiusMeters * 1.34 },
          ]),
          material: ensureCesiumColorMaterialProperty(
            Cesium,
            makeEffectTimelineColorProperty(effect, impactColor, [
              { at: 0, value: 0.4 },
              { at: 0.12, value: 0.24 },
              { at: 0.52, value: 0.06 },
              { at: 1, value: 0 },
            ])
          ),
          outline: false,
          height: 0,
          heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
          classificationType: Cesium.ClassificationType.TERRAIN,
        },
      }),
      effectDataSource.entities.add({
        id: `terrain-impact-secondary-ring-${effectKey}`,
        position: centerPosition,
        ellipse: {
          semiMajorAxis: makeEffectTimelineNumberProperty(effect, [
            { at: 0, value: 4 },
            { at: 0.16, value: secondaryRingRadiusMeters * 0.42 },
            { at: 0.4, value: secondaryRingRadiusMeters * 0.92 },
            { at: 1, value: secondaryRingRadiusMeters * 1.08 },
          ]),
          semiMinorAxis: makeEffectTimelineNumberProperty(effect, [
            { at: 0, value: 4 },
            { at: 0.16, value: secondaryRingRadiusMeters * 0.42 },
            { at: 0.4, value: secondaryRingRadiusMeters * 0.92 },
            { at: 1, value: secondaryRingRadiusMeters * 1.08 },
          ]),
          material: ensureCesiumColorMaterialProperty(
            Cesium,
            makeEffectTimelineColorProperty(effect, flashColor, [
              { at: 0, value: 0.48 },
              { at: 0.1, value: 0.3 },
              { at: 0.28, value: 0.04 },
              { at: 1, value: 0 },
            ])
          ),
          outline: false,
          height: 0,
          heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
          classificationType: Cesium.ClassificationType.TERRAIN,
        },
      }),
      effectDataSource.entities.add({
        id: `terrain-impact-pressure-wave-${effectKey}`,
        position: centerPosition,
        ellipse: {
          semiMajorAxis: makeEffectTimelineNumberProperty(effect, [
            { at: 0, value: 1 },
            { at: 0.08, value: pressureWaveRadiusMeters * 0.38 },
            { at: 0.28, value: pressureWaveRadiusMeters * 1.12 },
            { at: 0.58, value: pressureWaveRadiusMeters * 1.78 },
            { at: 1, value: pressureWaveRadiusMeters * 2.08 },
          ]),
          semiMinorAxis: makeEffectTimelineNumberProperty(effect, [
            { at: 0, value: 1 },
            { at: 0.08, value: pressureWaveRadiusMeters * 0.34 },
            { at: 0.28, value: pressureWaveRadiusMeters },
            { at: 0.58, value: pressureWaveRadiusMeters * 1.54 },
            { at: 1, value: pressureWaveRadiusMeters * 1.82 },
          ]),
          material: ensureCesiumColorMaterialProperty(
            Cesium,
            makeEffectTimelineColorProperty(effect, flashColor, [
              { at: 0, value: 0 },
              { at: 0.04, value: 0.18 * pressureWaveAlphaScale },
              { at: 0.16, value: 0.12 * pressureWaveAlphaScale },
              { at: 0.36, value: 0.04 * pressureWaveAlphaScale },
              { at: 1, value: 0 },
            ])
          ),
          outline: false,
          height: 0,
          heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
          classificationType: Cesium.ClassificationType.TERRAIN,
        },
      }),
      effectDataSource.entities.add({
        id: `terrain-impact-scorch-${effectKey}`,
        position: centerPosition,
        ellipse: {
          semiMajorAxis: makeEffectTimelineNumberProperty(effect, [
            { at: 0, value: radiusMeters * 0.24 },
            { at: 0.16, value: scorchRadiusMeters * 0.84 },
            { at: 0.46, value: scorchRadiusMeters },
            { at: 1, value: scorchRadiusMeters * 1.08 },
          ]),
          semiMinorAxis: makeEffectTimelineNumberProperty(effect, [
            { at: 0, value: radiusMeters * 0.18 },
            { at: 0.16, value: scorchRadiusMeters * 0.72 },
            { at: 0.46, value: scorchRadiusMeters * 0.9 },
            { at: 1, value: scorchRadiusMeters },
          ]),
          material: ensureCesiumColorMaterialProperty(
            Cesium,
            makeEffectTimelineColorProperty(effect, "#16110c", [
              { at: 0, value: 0 },
              { at: 0.12, value: 0.28 * scorchAlphaScale },
              { at: 0.72, value: 0.18 * scorchAlphaScale },
              { at: 1, value: 0 },
            ])
          ),
          outline: false,
          height: 0,
          heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
          classificationType: Cesium.ClassificationType.TERRAIN,
        },
      }),
      effectDataSource.entities.add({
        id: `terrain-impact-fireball-${effectKey}`,
        position: fireballPosition,
        billboard: {
          image: makeEffectFrameImageProperty(
            effect,
            EFFECT_TEXTURES.explosionFrames,
            0,
            0.34
          ),
          scale: makeEffectTimelineNumberProperty(effect, [
            { at: 0, value: 0.36 * fireballScale },
            { at: flashPeakRatio, value: 1.18 * fireballScale },
            { at: 0.28, value: 1.96 * fireballScale },
            { at: 0.44, value: 1.36 * fireballScale },
            { at: 1, value: 0.34 * fireballScale },
          ]),
          width: 132 * fireballScale,
          height: 132 * fireballScale,
          color: makeEffectTimelineColorProperty(effect, fireballColor, [
            { at: 0, value: 0 },
            { at: 0.03, value: 1 * fireballAlphaScale },
            { at: 0.16, value: 0.96 * fireballAlphaScale },
            { at: 0.36, value: 0.22 * fireballAlphaScale },
            { at: 0.5, value: 0 },
            { at: 1, value: 0 },
          ]),
          verticalOrigin: Cesium.VerticalOrigin.CENTER,
          horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
          heightReference: effectHeightReference,
          disableDepthTestDistance: effectDepthTestDistance,
        },
      }),
      effectDataSource.entities.add({
        id: `terrain-impact-flash-${effectKey}`,
        position: fireballPosition,
        billboard: {
          image: makeEffectFrameImageProperty(
            effect,
            EFFECT_TEXTURES.flashFrames,
            0,
            0.18
          ),
          scale: makeEffectTimelineNumberProperty(effect, [
            { at: 0, value: 0.32 * flashScale },
            { at: flashPeakRatio, value: 1.34 * flashScale },
            { at: 0.2, value: 2.12 * flashScale },
            { at: 0.34, value: 0.5 * flashScale },
            { at: 1, value: 0.23 * flashScale },
          ]),
          width: 116 * flashScale,
          height: 116 * flashScale,
          color: makeEffectTimelineColorProperty(effect, flashColor, [
            { at: 0, value: 0.88 * flashAlphaScale },
            { at: 0.1, value: 1 * flashAlphaScale },
            { at: 0.24, value: 0.2 * flashAlphaScale },
            { at: 0.34, value: 0 },
            { at: 1, value: 0 },
          ]),
          verticalOrigin: Cesium.VerticalOrigin.CENTER,
          horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
          heightReference: effectHeightReference,
          disableDepthTestDistance: effectDepthTestDistance,
        },
      }),
      effectDataSource.entities.add({
        id: `terrain-impact-smoke-${effectKey}`,
        position: smokePosition,
        billboard: {
          image: EFFECT_TEXTURES.impactSmoke,
          scale: makeEffectTimelineNumberProperty(effect, [
            { at: 0, value: 0 },
            {
              at: smokeStartRatio,
              value: 0.36 * residualSmokeScale * smokeScale,
            },
            {
              at: smokePeakRatio,
              value: 1 * residualSmokeScale * smokeScale,
            },
            { at: 0.62, value: 2.05 * residualSmokeScale * smokeScale },
            { at: 1, value: 2.66 * residualSmokeScale * smokeScale },
          ]),
          width: 146 * smokeScale,
          height: 146 * smokeScale,
          color: makeEffectTimelineColorProperty(effect, smokeColor, [
            { at: 0, value: 0 },
            { at: smokeStartRatio, value: 0 },
            { at: smokePeakRatio, value: 0.58 },
            { at: 0.6, value: 0.42 },
            { at: 0.88, value: 0.1 },
            { at: 1, value: 0 },
          ]),
          verticalOrigin: Cesium.VerticalOrigin.CENTER,
          horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
          heightReference: effectHeightReference,
          disableDepthTestDistance: effectDepthTestDistance,
        },
      }),
      effectDataSource.entities.add({
        id: `terrain-impact-smoke-high-${effectKey}`,
        position: highSmokePosition,
        billboard: {
          image: EFFECT_TEXTURES.trailSmoke,
          scale: makeEffectTimelineNumberProperty(effect, [
            { at: 0, value: 0 },
            {
              at: smokeStartRatio,
              value: 0.12 * residualSmokeScale * highSmokeScale,
            },
            { at: 0.28, value: 0.58 * residualSmokeScale * highSmokeScale },
            { at: 0.7, value: 1.47 * residualSmokeScale * highSmokeScale },
            { at: 1, value: 1.98 * residualSmokeScale * highSmokeScale },
          ]),
          width: 132 * highSmokeScale,
          height: 132 * highSmokeScale,
          color: makeEffectTimelineColorProperty(effect, highSmokeColor, [
            { at: 0, value: 0 },
            { at: smokeStartRatio, value: 0 },
            { at: 0.24, value: 0.34 },
            { at: 0.72, value: 0.18 },
            { at: 1, value: 0 },
          ]),
          verticalOrigin: Cesium.VerticalOrigin.CENTER,
          horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
          heightReference: effectHeightReference,
          disableDepthTestDistance: effectDepthTestDistance,
        },
      }),
      effectDataSource.entities.add({
        id: `terrain-impact-dust-${effectKey}`,
        position: dustPosition,
        billboard: {
          image: EFFECT_TEXTURES.impactDust,
          scale: makeEffectTimelineNumberProperty(effect, [
            { at: 0, value: 0 },
            {
              at: dustStartRatio,
              value: 0.32 * residualSmokeScale * dustScale,
            },
            { at: dustPeakRatio, value: 1.15 * residualSmokeScale * dustScale },
            { at: 0.62, value: 1.76 * residualSmokeScale * dustScale },
            { at: 1, value: 2.22 * residualSmokeScale * dustScale },
          ]),
          width: 152 * dustScale,
          height: 98 * dustScale,
          color: makeEffectTimelineColorProperty(effect, dustColor, [
            { at: 0, value: 0 },
            { at: dustStartRatio, value: 0.6 },
            { at: dustPeakRatio, value: 0.54 },
            { at: 0.76, value: 0.14 },
            { at: 1, value: 0 },
          ]),
          verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
          horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
          heightReference: effectHeightReference,
          disableDepthTestDistance: effectDepthTestDistance,
        },
      })
    );

    activeTransientEffects.set(effectKey, effect);
    startTransientEffectLoop();
    triggerImpactShake(
      options.shakeIntensity ?? 10,
      options.shakeDurationMs ?? 260
    );
  }

  function resolveEventProjectileFlightDurationMs(traceWeapon) {
    const launchPoint = resolveWeaponLaunchPoint(traceWeapon);
    const impactPoint = resolveWeaponImpactPoint(traceWeapon);
    const effectProfile = resolveWeaponEffectProfile(traceWeapon);
    const distanceMeters = approximateDistanceMeters(launchPoint, impactPoint);
    const speedMetersPerSecond = Math.max(
      240,
      (Number(traceWeapon?.speedKts) || 0) * 0.514444
    );
    const rawDurationMs =
      Number.isFinite(distanceMeters) && distanceMeters > 0
        ? (distanceMeters / speedMetersPerSecond) * 1000
        : 900;
    const minDurationMs = effectProfile.directFireLike
      ? 360
      : effectProfile.flightProfile === "artillery"
        ? 720
        : 520;
    const maxDurationMs =
      effectProfile.flightProfile === "artillery" ? 1800 : 1500;

    return clamp(rawDurationMs, minDurationMs, maxDurationMs);
  }

  function spawnEventProjectileArrivalEffect(
    effectKey,
    event,
    impactPoint,
    sideColor,
    impactOptions
  ) {
    const traceWeapon = buildEventTraceWeapon(event);
    if (!traceWeapon || activeTransientEffects.has(`${effectKey}-flight`)) {
      return false;
    }

    const effectProfile = resolveWeaponEffectProfile(traceWeapon);
    if (effectProfile.projectileArrowLike !== true) {
      return false;
    }

    const effect = {
      startedAtMs: performance.now(),
      durationMs: resolveEventProjectileFlightDurationMs(traceWeapon),
      entities: [],
      onComplete: () => {
        spawnImpactEffect(effectKey, impactPoint, sideColor, impactOptions);
      },
    };
    const positions = new Cesium.CallbackProperty(() => {
      const progress = clamp(getTransientEffectProgress(effect), 0.08, 1);
      return buildRuntimeEventTraceArrowPositions(traceWeapon, progress);
    }, false);

    effect.entities.push(
      effectDataSource.entities.add({
        id: `terrain-event-projectile-flight-${effectKey}`,
        polyline: createEventTraceArrowGraphics(
          Cesium,
          traceWeapon,
          positions,
          1
        ),
      })
    );

    activeTransientEffects.set(`${effectKey}-flight`, effect);
    startTransientEffectLoop();
    return true;
  }

  function syncWeaponTrailVisibility() {
    weaponStateById.forEach((weaponState) => {
      if (!runtimeVisualOptions.showWeaponTrails) {
        if (weaponState?.pointEntity) {
          weaponState.pointEntity.model = undefined;
          weaponState.pointEntity.billboard = undefined;
          weaponState.pointEntity.label = undefined;
        }
        if (weaponState?.trajectoryEntity) {
          weaponDataSource.entities.remove(weaponState.trajectoryEntity);
          weaponState.trajectoryEntity = null;
        }
        if (weaponState?.trailEntity) {
          weaponDataSource.entities.remove(weaponState.trailEntity);
          weaponState.trailEntity = null;
        }
        if (weaponState?.projectileStreakEntity) {
          weaponDataSource.entities.remove(weaponState.projectileStreakEntity);
          weaponState.projectileStreakEntity = null;
        }
        if (weaponState?.impactZoneEntity) {
          weaponDataSource.entities.remove(weaponState.impactZoneEntity);
          weaponState.impactZoneEntity = null;
        }
        if (weaponState?.fragmentZoneEntity) {
          weaponDataSource.entities.remove(weaponState.fragmentZoneEntity);
          weaponState.fragmentZoneEntity = null;
        }
        if (weaponState?.impactCueEntity) {
          weaponDataSource.entities.remove(weaponState.impactCueEntity);
          weaponState.impactCueEntity = null;
        }
        return;
      }

      if (weaponState?.pointEntity && weaponState?.weapon) {
        const terrainBoundWeapon = isTerrainBoundWeapon(weaponState.weapon);
        weaponState.pointEntity.model = createWeaponModelGraphics(
          Cesium,
          weaponState.weapon,
          terrainBoundWeapon
        );
        weaponState.pointEntity.billboard = createWeaponBillboardGraphics(
          Cesium,
          weaponState.weapon,
          terrainBoundWeapon
        );
        weaponState.pointEntity.label = runtimeVisualOptions.showDetailedLabels
          ? createWeaponLabelGraphics(
              Cesium,
              weaponState.weapon,
              terrainBoundWeapon
            )
          : undefined;
      }

      if (
        !runtimeVisualOptions.showDetailedLabels &&
        weaponState?.impactCueEntity
      ) {
        weaponDataSource.entities.remove(weaponState.impactCueEntity);
        weaponState.impactCueEntity = null;
      }
      if (
        !runtimeVisualOptions.showDetailedLabels &&
        weaponState?.impactZoneEntity
      ) {
        weaponDataSource.entities.remove(weaponState.impactZoneEntity);
        weaponState.impactZoneEntity = null;
      }
      if (
        !runtimeVisualOptions.showDetailedLabels &&
        weaponState?.fragmentZoneEntity
      ) {
        weaponDataSource.entities.remove(weaponState.fragmentZoneEntity);
        weaponState.fragmentZoneEntity = null;
      }

      const needsImpactDetail = runtimeVisualOptions.showDetailedLabels;
      const needsProjectileStreak =
        buildWeaponProjectileStreakPointSamples(weaponState?.weapon).length > 0;
      if (
        (!weaponState?.trajectoryEntity ||
          !weaponState?.trailEntity ||
          (needsProjectileStreak && !weaponState?.projectileStreakEntity) ||
          (needsImpactDetail &&
            (!weaponState?.impactZoneEntity ||
              !weaponState?.fragmentZoneEntity ||
              !weaponState?.impactCueEntity))) &&
        weaponState?.weapon
      ) {
        upsertWeaponState(weaponState.weapon);
      }
    });
  }

  function syncEventEffectVisibility() {
    if (lastSnapshot) {
      const visibleEvents = Array.isArray(lastSnapshot.recentEvents)
        ? lastSnapshot.recentEvents
            .filter((event) => isEventInsideBounds(event, placementBounds))
            .slice(-6)
        : [];
      renderEventEntities(visibleEvents);
    }
  }

  function applyRuntimeVisualOptions(options = {}) {
    runtimeVisualOptions.showWeaponTrails =
      options.showWeaponTrails !== undefined
        ? options.showWeaponTrails === true
        : runtimeVisualOptions.showWeaponTrails;
    runtimeVisualOptions.showEventEffects =
      options.showEventEffects !== undefined
        ? options.showEventEffects === true
        : runtimeVisualOptions.showEventEffects;
    runtimeVisualOptions.showUnitModels =
      options.showUnitModels !== undefined
        ? options.showUnitModels === true
        : runtimeVisualOptions.showUnitModels;
    runtimeVisualOptions.showUnitProxyBoxes =
      options.showUnitProxyBoxes !== undefined
        ? options.showUnitProxyBoxes === true
        : runtimeVisualOptions.showUnitProxyBoxes;
    runtimeVisualOptions.showFriendlyModelOutlines =
      options.showFriendlyModelOutlines !== undefined
        ? options.showFriendlyModelOutlines === true
        : runtimeVisualOptions.showFriendlyModelOutlines;
    runtimeVisualOptions.showDetailedLabels =
      options.showDetailedLabels !== undefined
        ? options.showDetailedLabels === true
        : runtimeVisualOptions.showDetailedLabels;
    runtimeVisualOptions.autoTrackImpacts =
      options.autoTrackImpacts !== undefined
        ? options.autoTrackImpacts === true
        : runtimeVisualOptions.autoTrackImpacts;
    runtimeVisualOptions.impactCameraShake =
      options.impactCameraShake !== undefined
        ? options.impactCameraShake === true
        : runtimeVisualOptions.impactCameraShake;
    runtimeVisualOptions.showLaunchEffects =
      options.showLaunchEffects !== undefined
        ? options.showLaunchEffects === true
        : options.showEventEffects !== undefined
          ? options.showEventEffects === true
          : runtimeVisualOptions.showLaunchEffects;

    if (!runtimeVisualOptions.showEventEffects) {
      effectDataSource?.entities?.removeAll();
      activeTransientEffects.clear();
    }
    syncWeaponTrailVisibility();
    syncEventEffectVisibility();
    unitStateById.forEach((unitState) => {
      syncUnitVisualState(unitState);
    });
    if (Array.isArray(lastSnapshot?.groundMarkers)) {
      renderGroundMarkerEntities(
        lastSnapshot.groundMarkers.filter((marker) =>
          isGroundMarkerInsideBounds(marker, placementBounds)
        )
      );
    }
    requestRender();
  }

  function setRuntimeSelectionText(text) {
    if (runtimeSelectionText) {
      runtimeSelectionText.textContent = text;
    }
  }

  function renderRuntimeEvents(events = []) {
    if (!runtimeEventList) {
      return;
    }

    if (!Array.isArray(events) || events.length === 0) {
      runtimeEventList.innerHTML = "";
      return;
    }

    runtimeEventList.innerHTML = events
      .map((event) => {
        const sideTone =
          SIDE_COLOR_MAP[`${event?.sideColor ?? ""}`.toLowerCase()] ??
          "#7fe7ff";
        return `
          <div class="terrain-event-row">
            <span class="terrain-event-time">${escapeHtml(
              formatRuntimeTimestamp(Number(event?.timestamp) || 0)
            )}</span>
            <div class="terrain-event-copy">
              <span class="terrain-event-pill" style="--terrain-event-tone: ${escapeHtml(
                sideTone
              )}">${escapeHtml(event?.sideName ?? "전장")}</span>
              <strong>${escapeHtml(event?.message ?? "이벤트")}</strong>
            </div>
          </div>
        `;
      })
      .join("");
  }

  function renderRuntimeSummary(
    snapshot,
    visibleUnits,
    visibleWeapons,
    visibleEvents
  ) {
    if (runtimeModeBadge) {
      runtimeModeBadge.textContent = liveRuntimeEnabled
        ? "실시간 진행"
        : "정적 보기";
    }
    if (runtimeTimeMetric) {
      runtimeTimeMetric.textContent = snapshot
        ? formatRuntimeTimestamp(Number(snapshot.currentTime) || 0)
        : "-";
    }
    if (runtimeSideMetric) {
      runtimeSideMetric.textContent =
        snapshot?.currentSideName ?? snapshot?.currentSideId ?? "세력 없음";
    }
    if (runtimeAssetMetric) {
      runtimeAssetMetric.textContent = snapshot
        ? `${formatCompactCount(visibleUnits.length)} / ${formatCompactCount(
            snapshot.units?.length
          )}`
        : "-";
    }
    if (runtimeWeaponMetric) {
      runtimeWeaponMetric.textContent = snapshot
        ? `${formatCompactCount(visibleWeapons.length)} / ${formatCompactCount(
            snapshot.stats?.weaponsInFlight
          )}`
        : "-";
    }

    if (!snapshot) {
      setRuntimeSelectionText("");
      renderRuntimeEvents([]);
      return;
    }

    const focusedUnitState = getFocusedUnitState();
    const selectedUnit =
      focusedUnitState?.unit ??
      snapshot.units?.find((unit) => unit.id === snapshot.selectedUnitId) ??
      null;

    if (selectedUnit) {
      setRuntimeSelectionText(
        `${selectedUnit.sideName ?? selectedUnit.sideId ?? "세력 없음"} · ${
          selectedUnit.name ?? selectedUnit.className ?? "자산"
        }`
      );
    } else {
      setRuntimeSelectionText("");
    }

    renderRuntimeEvents(visibleEvents);
  }

  function clearFocusFireImpactBox() {
    if (focusFireImpactRingEntity) {
      focusFireDataSource?.entities?.remove(focusFireImpactRingEntity);
      focusFireImpactRingEntity = null;
    }
    if (focusFireImpactLabelEntity) {
      focusFireDataSource?.entities?.remove(focusFireImpactLabelEntity);
      focusFireImpactLabelEntity = null;
    }
  }

  function createFocusFireImpactRingGraphics(state) {
    const radiusMeters = clamp(
      68 + state.impactLoad * 18 + state.weaponsInFlight * 7,
      68,
      260
    );

    return {
      semiMajorAxis: radiusMeters,
      semiMinorAxis: radiusMeters,
      material: Cesium.Color.fromCssColorString("#ffb347").withAlpha(0.16),
      outline: false,
      height: 0,
      heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
      classificationType: Cesium.ClassificationType.TERRAIN,
    };
  }

  function createFocusFireImpactLabelGraphics(state) {
    return {
      text: state.text,
      font: "800 13px 'Segoe UI', 'Noto Sans KR', sans-serif",
      fillColor: Cesium.Color.fromCssColorString("#07151a").withAlpha(0.96),
      outlineColor: Cesium.Color.WHITE.withAlpha(0.5),
      outlineWidth: 1,
      style: Cesium.LabelStyle.FILL_AND_OUTLINE,
      showBackground: true,
      backgroundColor:
        Cesium.Color.fromCssColorString("#ecffff").withAlpha(0.94),
      pixelOffset: new Cesium.Cartesian2(0, -52),
      verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
      horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
      heightReference: Cesium.HeightReference.RELATIVE_TO_GROUND,
      disableDepthTestDistance: Number.POSITIVE_INFINITY,
      distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 260000),
    };
  }

  function accumulateFocusFireImpactEvents(snapshot, summary) {
    const objectiveKey = buildFocusFireObjectiveKey(summary);
    if (objectiveKey !== focusFireImpactObjectiveKey) {
      focusFireImpactObjectiveKey = objectiveKey;
      focusFireSeenImpactEventIds.clear();
      focusFireImpactCount = 0;
    }

    if (!Array.isArray(snapshot?.recentEvents)) {
      return;
    }

    snapshot.recentEvents.forEach((event) => {
      const eventId = `${event?.id ?? ""}`;
      if (!eventId || focusFireSeenImpactEventIds.has(eventId)) {
        return;
      }
      if (!isFocusFireImpactEvent(event, summary)) {
        return;
      }

      focusFireSeenImpactEventIds.add(eventId);
      focusFireImpactCount += 1;
    });
  }

  function updateFocusFireImpactBox(snapshot) {
    const summary = resolveFocusFireSummary(snapshot);
    if (
      !summary ||
      summary.enabled !== true ||
      !isPointInsideBounds(
        {
          longitude: summary.objectiveLongitude,
          latitude: summary.objectiveLatitude,
        },
        placementBounds
      )
    ) {
      clearFocusFireImpactBox();
      return;
    }

    accumulateFocusFireImpactEvents(snapshot, summary);
    const state = resolveFocusFireImpactBoxState(
      {
        ...snapshot,
        focusFireSummary: summary,
      },
      focusFireImpactCount
    );
    if (!state) {
      clearFocusFireImpactBox();
      return;
    }

    const groundPosition = buildCartesianFromPoint(Cesium, {
      longitude: state.longitude,
      latitude: state.latitude,
      altitudeMeters: 0,
    });
    const labelPosition = buildCartesianFromPoint(Cesium, state);

    if (!focusFireImpactRingEntity) {
      focusFireImpactRingEntity = focusFireDataSource.entities.add({
        id: "terrain-focus-fire-impact-ring",
        position: groundPosition,
        ellipse: createFocusFireImpactRingGraphics(state),
      });
    } else {
      focusFireImpactRingEntity.position = groundPosition;
      focusFireImpactRingEntity.ellipse =
        createFocusFireImpactRingGraphics(state);
    }

    if (!focusFireImpactLabelEntity) {
      focusFireImpactLabelEntity = focusFireDataSource.entities.add({
        id: "terrain-focus-fire-impact-label",
        position: labelPosition,
        label: createFocusFireImpactLabelGraphics(state),
        point: {
          pixelSize: 12,
          color: Cesium.Color.fromCssColorString("#ffb347").withAlpha(0.96),
          outlineColor: Cesium.Color.WHITE.withAlpha(0.88),
          outlineWidth: 2,
          heightReference: Cesium.HeightReference.RELATIVE_TO_GROUND,
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
        },
      });
    } else {
      focusFireImpactLabelEntity.position = labelPosition;
      focusFireImpactLabelEntity.label =
        createFocusFireImpactLabelGraphics(state);
    }
  }

  function clearPlacement() {
    dataSource?.entities?.removeAll();
    weaponDataSource?.entities?.removeAll();
    eventDataSource?.entities?.removeAll();
    objectiveDataSource?.entities?.removeAll();
    groundMarkerDataSource?.entities?.removeAll();
    focusFireDataSource?.entities?.removeAll();
    effectDataSource?.entities?.removeAll();
    lastSnapshot = null;
    focusedUnitId = null;
    lastTrackedImpactEventId = null;
    activeUnits = [];
    activeReferencePoints = [];
    activeEvents = [];
    unitStateById.clear();
    weaponStateById.clear();
    objectivePointByEntityId.clear();
    eventByEntityId.clear();
    activeTransientEffects.clear();
    triggeredEventEffectIds.clear();
    focusFireSeenImpactEventIds.clear();
    terrainHeightByKey.clear();
    if (terrainRefreshTimerId !== null) {
      globalThis.clearTimeout?.(terrainRefreshTimerId);
      terrainRefreshTimerId = null;
    }
    terrainAnchorRefreshAttempts = 0;
    focusFireImpactObjectiveKey = "";
    focusFireImpactCount = 0;
    focusFireImpactRingEntity = null;
    focusFireImpactLabelEntity = null;
    renderAssetPanel();
    renderRuntimeSummary(null, [], [], []);
    requestRender();
  }

  function setAssetCount(text) {
    if (assetCountBadge) {
      assetCountBadge.textContent = text;
    }
  }

  function setAssetHint(text) {
    if (assetFocusHint) {
      assetFocusHint.textContent = text;
    }
  }

  function getFocusedUnitState() {
    return focusedUnitId ? (unitStateById.get(focusedUnitId) ?? null) : null;
  }

  function isUnitEmphasized(unit) {
    return (
      unit?.selected === true ||
      unit?.id === lastSnapshot?.selectedUnitId ||
      unit?.id === focusedUnitId
    );
  }

  function getGroundOverlayPosition(unitState) {
    if (unitState?.groundPositionProperty) {
      return unitState.groundPositionProperty;
    }

    return buildCartesianFromPoint(Cesium, {
      ...unitState.displayPoint,
      altitudeMeters: 0,
    });
  }

  function removeGroundAuxiliaryVisualState(unitState) {
    [
      "groundShadowEntity",
      "selectionRingEntity",
      "bodyDirectionEntity",
      "barrelDirectionEntity",
      "movementDustEntity",
    ].forEach((key) => {
      if (unitState?.[key]) {
        dataSource.entities.remove(unitState[key]);
        unitState[key] = null;
      }
    });
  }

  function syncGroundAuxiliaryVisualState(unitState) {
    const emphasized = isUnitEmphasized(unitState.unit);
    const profile = resolveGroundUnitVisualProfile(
      unitState.unit,
      unitState.model,
      emphasized
    );
    if (!profile) {
      removeGroundAuxiliaryVisualState(unitState);
      return;
    }

    const groundPosition = getGroundOverlayPosition(unitState);
    const shadowEllipse = createGroundShadowEllipseGraphics(
      Cesium,
      unitState.unit,
      unitState.model,
      emphasized
    );
    if (!unitState.groundShadowEntity) {
      unitState.groundShadowEntity = dataSource.entities.add({
        id: `terrain-placement-ground-shadow-${unitState.unit.id}`,
        position: groundPosition,
        ellipse: shadowEllipse,
      });
    } else {
      unitState.groundShadowEntity.position = groundPosition;
      unitState.groundShadowEntity.ellipse = shadowEllipse;
    }

    const selectionRing = createGroundSelectionRingGraphics(
      Cesium,
      unitState.unit,
      unitState.model,
      emphasized
    );
    if (selectionRing) {
      if (!unitState.selectionRingEntity) {
        unitState.selectionRingEntity = dataSource.entities.add({
          id: `terrain-placement-selection-ring-${unitState.unit.id}`,
          position: groundPosition,
          ellipse: selectionRing,
        });
      } else {
        unitState.selectionRingEntity.position = groundPosition;
        unitState.selectionRingEntity.ellipse = selectionRing;
      }
    } else if (unitState.selectionRingEntity) {
      dataSource.entities.remove(unitState.selectionRingEntity);
      unitState.selectionRingEntity = null;
    }

    const headingDeg = normalizeHeading(unitState.unit?.headingDeg);
    const bodyPositions = buildGroundDirectionPositions(
      Cesium,
      unitState.displayPoint,
      headingDeg,
      -profile.hullBackMeters,
      profile.hullForwardMeters
    );
    const barrelPositions = buildGroundDirectionPositions(
      Cesium,
      unitState.displayPoint,
      headingDeg,
      0,
      profile.barrelForwardMeters
    );
    const bodyPolyline = createGroundDirectionPolylineGraphics(
      Cesium,
      unitState.unit,
      unitState.model,
      bodyPositions,
      emphasized,
      "body"
    );
    const barrelPolyline = createGroundDirectionPolylineGraphics(
      Cesium,
      unitState.unit,
      unitState.model,
      barrelPositions,
      emphasized,
      "barrel"
    );

    if (bodyPolyline) {
      if (!unitState.bodyDirectionEntity) {
        unitState.bodyDirectionEntity = dataSource.entities.add({
          id: `terrain-placement-body-line-${unitState.unit.id}`,
          polyline: bodyPolyline,
        });
      } else {
        unitState.bodyDirectionEntity.polyline = bodyPolyline;
      }
    }
    if (barrelPolyline) {
      if (!unitState.barrelDirectionEntity) {
        unitState.barrelDirectionEntity = dataSource.entities.add({
          id: `terrain-placement-barrel-line-${unitState.unit.id}`,
          polyline: barrelPolyline,
        });
      } else {
        unitState.barrelDirectionEntity.polyline = barrelPolyline;
      }
    }

    const dustBillboard = createGroundMovementDustBillboardGraphics(
      Cesium,
      unitState.unit,
      unitState.model,
      emphasized
    );
    if (dustBillboard) {
      const dustBasePoint = normalizeGeoPoint(
        unitState.displayPoint.longitude,
        unitState.displayPoint.latitude,
        Math.max(3, Number(unitState.displayPoint.altitudeMeters) || 0)
      );
      const dustPoint = dustBasePoint
        ? offsetPointByHeading(
            dustBasePoint,
            headingDeg + 180,
            profile.dustBackOffsetMeters
          )
        : null;
      if (!dustPoint) {
        return;
      }
      const dustPosition = buildCartesianFromPoint(Cesium, dustPoint);
      if (!unitState.movementDustEntity) {
        unitState.movementDustEntity = dataSource.entities.add({
          id: `terrain-placement-dust-${unitState.unit.id}`,
          position: dustPosition,
          billboard: dustBillboard,
        });
      } else {
        unitState.movementDustEntity.position = dustPosition;
        unitState.movementDustEntity.billboard = dustBillboard;
      }
    } else if (unitState.movementDustEntity) {
      dataSource.entities.remove(unitState.movementDustEntity);
      unitState.movementDustEntity = null;
    }
  }

  function syncUnitVisualState(unitState) {
    if (!unitState?.entity) {
      return;
    }

    const emphasized = isUnitEmphasized(unitState.unit);
    unitState.entity.orientation = resolveHeadingOrientation(
      Cesium,
      unitState.displayPoint,
      resolveUnitModelHeadingDeg(unitState.unit, unitState.model)
    );
    unitState.entity.label = createPlacementLabel(
      Cesium,
      unitState.unit,
      emphasized,
      labelDistance,
      unitState.routeGroupState
    );
    unitState.entity.description = buildUnitDescription(
      unitState.unit,
      unitState.displayPoint
    );
    unitState.entity.billboard = createUnitBillboardGraphics(
      Cesium,
      unitState.unit,
      emphasized,
      labelDistance,
      runtimeVisualOptions
    );

    if (
      runtimeVisualOptions.showUnitModels &&
      shouldRenderUnitModel(unitState.unit, unitState.model, emphasized)
    ) {
      unitState.entity.model = createUnitModelGraphics(
        Cesium,
        unitState.unit,
        unitState.model,
        emphasized,
        runtimeVisualOptions
      );
      unitState.entity.box = undefined;
      unitState.entity.point = undefined;
    } else {
      unitState.entity.model = undefined;
      unitState.entity.box = runtimeVisualOptions.showUnitProxyBoxes
        ? createUnitProxyBoxGraphics(
            Cesium,
            unitState.unit,
            unitState.model,
            emphasized,
            runtimeVisualOptions
          )
        : undefined;
      unitState.entity.point = createUnitPointGraphics(
        Cesium,
        unitState.unit,
        emphasized
      );
    }
    syncGroundAuxiliaryVisualState(unitState);
  }

  function removeUnitRouteVisualState(unitState) {
    if (unitState?.routeEntity) {
      dataSource.entities.remove(unitState.routeEntity);
      unitState.routeEntity = null;
    }
    if (unitState?.routeEndpointEntity) {
      dataSource.entities.remove(unitState.routeEndpointEntity);
      unitState.routeEndpointEntity = null;
    }
    if (Array.isArray(unitState?.routeFlowEntities)) {
      unitState.routeFlowEntities.forEach((entity) => {
        dataSource.entities.remove(entity);
      });
      unitState.routeFlowEntities = [];
    }
    [
      "routeGroupLabelEntity",
      "routeDiveEntity",
      "routeDiveLabelEntity",
    ].forEach((key) => {
      if (unitState?.[key]) {
        dataSource.entities.remove(unitState[key]);
        unitState[key] = null;
      }
    });
  }

  function syncAircraftRouteFlowVisualState(
    unitState,
    routePoints,
    profile,
    emphasized
  ) {
    const compactGroupedDrone =
      profile?.droneLike &&
      profile?.groupDensity > 1 &&
      profile?.groupLead !== true &&
      !emphasized;
    if (
      !profile?.droneLike ||
      profile.flowMarkerCount <= 0 ||
      compactGroupedDrone
    ) {
      if (Array.isArray(unitState.routeFlowEntities)) {
        unitState.routeFlowEntities.forEach((entity) =>
          dataSource.entities.remove(entity)
        );
      }
      unitState.routeFlowEntities = [];
      return;
    }

    const flowPoints = buildRouteFlowSamplePoints(
      routePoints,
      profile.flowMarkerCount
    );
    const flowEntities = Array.isArray(unitState.routeFlowEntities)
      ? unitState.routeFlowEntities
      : [];

    while (flowEntities.length > flowPoints.length) {
      const removedEntity = flowEntities.pop();
      if (removedEntity) {
        dataSource.entities.remove(removedEntity);
      }
    }

    flowPoints.forEach((point, index) => {
      const flowPosition = buildCartesianFromPoint(Cesium, {
        ...point,
        altitudeMeters: Math.max(26, Number(point.altitudeMeters) || 0),
      });
      const pointGraphics = createAircraftRouteFlowPointGraphics(
        Cesium,
        unitState.unit,
        emphasized,
        profile,
        index,
        flowPoints.length
      );

      if (!flowEntities[index]) {
        flowEntities[index] = dataSource.entities.add({
          id: `terrain-placement-route-flow-${unitState.unit.id}-${index}`,
          position: flowPosition,
          point: pointGraphics,
        });
      } else {
        flowEntities[index].position = flowPosition;
        flowEntities[index].point = pointGraphics;
      }
    });

    unitState.routeFlowEntities = flowEntities;
  }

  function syncAircraftRouteGroupLabelState(unitState, routePoints, profile) {
    const label = createAircraftRouteGroupLabelGraphics(
      Cesium,
      unitState.unit,
      profile
    );
    const labelPoint = label ? samplePointAlongRoute(routePoints, 0.42) : null;

    if (!label || !labelPoint) {
      if (unitState.routeGroupLabelEntity) {
        dataSource.entities.remove(unitState.routeGroupLabelEntity);
        unitState.routeGroupLabelEntity = null;
      }
      return;
    }

    const position = buildRuntimeCartesianFromTerrainPoint(
      {
        ...labelPoint,
        altitudeMeters:
          Math.max(42, Number(labelPoint.altitudeMeters) || 0) + 24,
      },
      true,
      66
    );
    if (!unitState.routeGroupLabelEntity) {
      unitState.routeGroupLabelEntity = dataSource.entities.add({
        id: `terrain-placement-route-group-${unitState.unit.id}`,
        position,
        label,
      });
    } else {
      unitState.routeGroupLabelEntity.position = position;
      unitState.routeGroupLabelEntity.label = label;
    }
  }

  function syncLoiteringDiveRouteState(unitState, routePoints) {
    const diveProfile = resolveLoiteringMunitionDiveProfile(
      unitState.unit,
      routePoints
    );
    if (!diveProfile) {
      if (unitState.routeDiveEntity) {
        dataSource.entities.remove(unitState.routeDiveEntity);
        unitState.routeDiveEntity = null;
      }
      if (unitState.routeDiveLabelEntity) {
        dataSource.entities.remove(unitState.routeDiveLabelEntity);
        unitState.routeDiveLabelEntity = null;
      }
      return null;
    }

    const emphasized = isUnitEmphasized(unitState.unit);
    const routeGroupState = unitState.routeGroupState ?? {};
    const showDiveDetail =
      emphasized ||
      routeGroupState.lead === true ||
      Math.max(1, Number(routeGroupState.density) || 1) <= 1;
    if (!showDiveDetail) {
      if (unitState.routeDiveEntity) {
        dataSource.entities.remove(unitState.routeDiveEntity);
        unitState.routeDiveEntity = null;
      }
      if (unitState.routeDiveLabelEntity) {
        dataSource.entities.remove(unitState.routeDiveLabelEntity);
        unitState.routeDiveLabelEntity = null;
      }
      return diveProfile;
    }

    const positions = buildRuntimeCartesianArrayFromTerrainPoints(
      [diveProfile.startPoint, diveProfile.finalPoint],
      true
    );
    if (positions.length >= 2) {
      const polyline = createLoiteringDroneDivePolylineGraphics(
        Cesium,
        positions
      );
      if (!unitState.routeDiveEntity) {
        unitState.routeDiveEntity = dataSource.entities.add({
          id: `terrain-placement-route-dive-${unitState.unit.id}`,
          polyline,
        });
      } else {
        unitState.routeDiveEntity.polyline = polyline;
      }
    }

    const labelPoint = interpolateGeoPoint(
      diveProfile.startPoint,
      diveProfile.finalPoint,
      0.72
    );
    const labelPosition = buildRuntimeCartesianFromTerrainPoint(
      labelPoint,
      true,
      labelPoint?.altitudeMeters
    );
    const label = createLoiteringDroneFinalAttackLabelGraphics(
      Cesium,
      diveProfile
    );
    if (!unitState.routeDiveLabelEntity) {
      unitState.routeDiveLabelEntity = dataSource.entities.add({
        id: `terrain-placement-route-dive-label-${unitState.unit.id}`,
        position: labelPosition,
        label,
      });
    } else {
      unitState.routeDiveLabelEntity.position = labelPosition;
      unitState.routeDiveLabelEntity.label = label;
    }

    return diveProfile;
  }

  function syncUnitRouteVisualState(unitState) {
    const emphasized = isUnitEmphasized(unitState.unit);
    const groundRouteUnit = isGroundRenderUnit(unitState.unit);
    const routePoints = buildUnitRoutePointSamples(
      unitState.unit,
      unitState.displayPoint
    );
    if (routePoints.length < 2) {
      removeUnitRouteVisualState(unitState);
      return;
    }

    const routePositions = groundRouteUnit
      ? buildCartesianArrayFromPoints(Cesium, routePoints)
      : buildRuntimeCartesianArrayFromTerrainPoints(routePoints, true);
    const endpoint = routePoints[routePoints.length - 1];
    if (routePositions.length < 2 || !endpoint) {
      removeUnitRouteVisualState(unitState);
      return;
    }

    const routeProfile = groundRouteUnit
      ? null
      : resolveAircraftRouteVisualProfile(
          unitState.unit,
          routePoints,
          unitState.routeGroupState
        );
    const progressState = groundRouteUnit
      ? null
      : resolveAircraftRouteProgressState(unitState.unit, routePoints);
    const diveProfile = groundRouteUnit
      ? null
      : syncLoiteringDiveRouteState(unitState, routePoints);
    const compactGroupedRoute =
      !groundRouteUnit &&
      routeProfile?.droneLike &&
      routeProfile?.groupDensity > 1 &&
      routeProfile?.groupLead !== true &&
      !emphasized;
    if (compactGroupedRoute) {
      if (unitState.routeEntity) {
        dataSource.entities.remove(unitState.routeEntity);
        unitState.routeEntity = null;
      }
    } else if (!unitState.routeEntity) {
      unitState.routeEntity = dataSource.entities.add({
        id: `terrain-placement-route-${unitState.unit.id}`,
        polyline: createUnitRoutePolylineGraphics(
          Cesium,
          unitState.unit,
          unitState.model,
          routePositions,
          emphasized,
          routeProfile,
          progressState
        ),
      });
    } else {
      unitState.routeEntity.polyline = createUnitRoutePolylineGraphics(
        Cesium,
        unitState.unit,
        unitState.model,
        routePositions,
        emphasized,
        routeProfile,
        progressState
      );
    }

    syncAircraftRouteFlowVisualState(
      unitState,
      routePoints,
      routeProfile,
      emphasized
    );
    syncAircraftRouteGroupLabelState(unitState, routePoints, routeProfile);

    const endpointVisualPoint = diveProfile?.finalPoint ?? endpoint;
    const endpointHeightMeters = Math.max(
      18,
      Number(endpointVisualPoint.altitudeMeters) || 0
    );
    const endpointPosition = groundRouteUnit
      ? buildCartesianFromPoint(Cesium, {
          ...endpointVisualPoint,
          altitudeMeters: endpointHeightMeters,
        })
      : buildRuntimeCartesianFromTerrainPoint(
          endpointVisualPoint,
          true,
          endpointHeightMeters
        );
    const shouldShowEndpoint =
      !groundRouteUnit ||
      resolveGroundUnitMovementVisualState(unitState.unit).routePointCount > 0;
    if (!shouldShowEndpoint) {
      if (unitState.routeEndpointEntity) {
        dataSource.entities.remove(unitState.routeEndpointEntity);
        unitState.routeEndpointEntity = null;
      }
      return;
    }

    if (!unitState.routeEndpointEntity) {
      unitState.routeEndpointEntity = dataSource.entities.add({
        id: `terrain-placement-route-end-${unitState.unit.id}`,
        position: endpointPosition,
        point: createUnitRouteEndpointGraphics(
          Cesium,
          unitState.unit,
          emphasized,
          routeProfile,
          progressState
        ),
        label: createAircraftRouteEndpointLabelGraphics(
          Cesium,
          unitState.unit,
          emphasized,
          routeProfile,
          progressState
        ),
      });
    } else {
      unitState.routeEndpointEntity.position = endpointPosition;
      unitState.routeEndpointEntity.point = createUnitRouteEndpointGraphics(
        Cesium,
        unitState.unit,
        emphasized,
        routeProfile,
        progressState
      );
      unitState.routeEndpointEntity.label =
        createAircraftRouteEndpointLabelGraphics(
          Cesium,
          unitState.unit,
          emphasized,
          routeProfile,
          progressState
        );
    }
  }

  function upsertUnitState(unit, renderContext) {
    const displayPoint = resolveDisplayedUnitPoint(unit, renderContext);
    const model = resolveUnitModel(unit, renderContext);
    const existingState = unitStateById.get(unit.id) ?? null;
    const routeGroupState =
      renderContext?.droneRouteGroupsByUnitId && typeof unit?.id === "string"
        ? (renderContext.droneRouteGroupsByUnitId[unit.id] ?? null)
        : null;

    if (!existingState) {
      const motionState = createRuntimeMotionState(displayPoint);
      const positionProperty =
        createRuntimeCartesianPositionProperty(motionState);
      const groundPositionProperty = createRuntimeCartesianPositionProperty(
        motionState,
        (point) => ({
          ...point,
          altitudeMeters: 0,
        })
      );
      const entityConfig = {
        id: `terrain-placement-${unit.id}`,
        position: positionProperty,
        orientation: resolveHeadingOrientation(
          Cesium,
          displayPoint,
          resolveUnitModelHeadingDeg(unit, model)
        ),
        billboard: createUnitBillboardGraphics(
          Cesium,
          unit,
          isUnitEmphasized(unit),
          labelDistance,
          runtimeVisualOptions
        ),
        label: createPlacementLabel(
          Cesium,
          unit,
          isUnitEmphasized(unit),
          labelDistance,
          routeGroupState
        ),
        description: buildUnitDescription(unit, displayPoint),
      };

      if (
        runtimeVisualOptions.showUnitModels &&
        shouldRenderUnitModel(unit, model, isUnitEmphasized(unit))
      ) {
        entityConfig.model = createUnitModelGraphics(
          Cesium,
          unit,
          model,
          isUnitEmphasized(unit),
          runtimeVisualOptions
        );
      } else {
        if (runtimeVisualOptions.showUnitProxyBoxes) {
          entityConfig.box = createUnitProxyBoxGraphics(
            Cesium,
            unit,
            model,
            isUnitEmphasized(unit),
            runtimeVisualOptions
          );
        }
        entityConfig.point = createUnitPointGraphics(
          Cesium,
          unit,
          isUnitEmphasized(unit)
        );
      }

      const entity = dataSource.entities.add(entityConfig);
      const unitState = {
        unit,
        model,
        entity,
        displayPoint,
        routeEntity: null,
        routeEndpointEntity: null,
        routeFlowEntities: [],
        routeGroupLabelEntity: null,
        routeDiveEntity: null,
        routeDiveLabelEntity: null,
        groundShadowEntity: null,
        selectionRingEntity: null,
        bodyDirectionEntity: null,
        barrelDirectionEntity: null,
        movementDustEntity: null,
        routeGroupState,
        motionState,
        positionProperty,
        groundPositionProperty,
      };
      unitStateById.set(unit.id, unitState);
      syncGroundAuxiliaryVisualState(unitState);
      syncUnitRouteVisualState(unitState);
      return unitState;
    }

    existingState.unit = unit;
    existingState.model = model;
    existingState.displayPoint = displayPoint;
    existingState.routeGroupState = routeGroupState;
    if (!existingState.motionState) {
      existingState.motionState = createRuntimeMotionState(displayPoint);
    }
    if (!existingState.positionProperty) {
      existingState.positionProperty = createRuntimeCartesianPositionProperty(
        existingState.motionState
      );
    }
    if (!existingState.groundPositionProperty) {
      existingState.groundPositionProperty =
        createRuntimeCartesianPositionProperty(
          existingState.motionState,
          (point) => ({
            ...point,
            altitudeMeters: 0,
          })
        );
    }
    updateEntityMotionState(existingState.motionState, displayPoint, {
      maxSnapDistanceMeters: RUNTIME_UNIT_POSITION_SNAP_DISTANCE_METERS,
      coastDurationMs: isGroundRenderUnit(unit) ? 0 : null,
    });
    existingState.entity.position = existingState.positionProperty;
    syncUnitVisualState(existingState);
    syncUnitRouteVisualState(existingState);
    return existingState;
  }

  function syncFocusedVisuals(previousFocusedUnitId, nextFocusedUnitId) {
    const changedUnitIds = new Set(
      [
        previousFocusedUnitId,
        nextFocusedUnitId,
        lastSnapshot?.selectedUnitId,
      ].filter((unitId) => typeof unitId === "string" && unitId.length > 0)
    );

    changedUnitIds.forEach((unitId) => {
      const unitState = unitStateById.get(unitId);
      if (unitState) {
        syncUnitVisualState(unitState);
        syncUnitRouteVisualState(unitState);
      }
    });

    requestRender();
  }

  function removeHiddenUnitStates(nextVisibleUnitIds) {
    [...unitStateById.keys()].forEach((unitId) => {
      if (nextVisibleUnitIds.has(unitId)) {
        return;
      }

      const unitState = unitStateById.get(unitId);
      if (unitState?.entity) {
        removeUnitRouteVisualState(unitState);
        removeGroundAuxiliaryVisualState(unitState);
        dataSource.entities.remove(unitState.entity);
      }
      unitStateById.delete(unitId);
    });
  }

  function upsertWeaponState(weapon) {
    const displayPoint = resolveWeaponDisplayPoint(weapon) ?? {
      longitude: Number(weapon?.longitude) || 0,
      latitude: Number(weapon?.latitude) || 0,
      altitudeMeters: Math.max(0, Number(weapon?.altitudeMeters) || 0),
    };
    const terrainBoundWeapon = isTerrainBoundWeapon(weapon);
    const point = terrainBoundWeapon
      ? {
          ...displayPoint,
          altitudeMeters: Math.max(
            Number(displayPoint?.altitudeMeters) || 0,
            resolveTerrainBoundWeaponMinimumAltitudeMeters(
              resolveWeaponEffectProfile(weapon)
            )
          ),
        }
      : displayPoint;
    const orientation = resolveWeaponOrientation(Cesium, weapon, point);
    const trajectoryPositions = buildRuntimeWeaponTrajectoryPositions(weapon);
    const trailPositions = buildRuntimeWeaponTrailPositions(weapon);
    const projectileStreakPositions =
      buildRuntimeWeaponProjectileStreakPositions(weapon);
    const impactPoint = resolveWeaponImpactPoint(weapon);
    const existingState = weaponStateById.get(weapon.id) ?? null;

    if (!existingState) {
      const motionState = createRuntimeMotionState(point);
      const positionProperty =
        createRuntimeCartesianPositionProperty(motionState);
      const pointEntity = weaponDataSource.entities.add({
        id: `terrain-weapon-${weapon.id}`,
        position: positionProperty,
        orientation,
        model: runtimeVisualOptions.showWeaponTrails
          ? createWeaponModelGraphics(Cesium, weapon, terrainBoundWeapon)
          : undefined,
        point: createWeaponPointGraphics(Cesium, weapon, terrainBoundWeapon),
        billboard: runtimeVisualOptions.showWeaponTrails
          ? createWeaponBillboardGraphics(Cesium, weapon, terrainBoundWeapon)
          : undefined,
        label:
          runtimeVisualOptions.showWeaponTrails &&
          runtimeVisualOptions.showDetailedLabels
            ? createWeaponLabelGraphics(Cesium, weapon, terrainBoundWeapon)
            : undefined,
        description: buildWeaponDescription(weapon),
      });
      const trajectoryEntity =
        runtimeVisualOptions.showWeaponTrails && trajectoryPositions.length > 0
          ? weaponDataSource.entities.add({
              id: `terrain-weapon-trajectory-${weapon.id}`,
              polyline: createWeaponProjectedTrajectoryGraphics(
                Cesium,
                weapon,
                trajectoryPositions
              ),
            })
          : null;
      const trailEntity =
        runtimeVisualOptions.showWeaponTrails && trailPositions.length > 0
          ? weaponDataSource.entities.add({
              id: `terrain-weapon-trail-${weapon.id}`,
              polyline: createWeaponTravelTrailGraphics(
                Cesium,
                weapon,
                trailPositions
              ),
            })
          : null;
      const projectileStreakEntity =
        runtimeVisualOptions.showWeaponTrails &&
        projectileStreakPositions.length > 0
          ? weaponDataSource.entities.add({
              id: `terrain-weapon-projectile-streak-${weapon.id}`,
              polyline: createWeaponProjectileStreakGraphics(
                Cesium,
                weapon,
                projectileStreakPositions
              ),
            })
          : null;
      const impactZoneEntity =
        runtimeVisualOptions.showWeaponTrails &&
        runtimeVisualOptions.showDetailedLabels &&
        impactPoint
          ? weaponDataSource.entities.add({
              id: `terrain-weapon-impact-zone-${weapon.id}`,
              position: buildCartesianFromPoint(Cesium, impactPoint),
              ellipse: createWeaponImpactZoneGraphics(Cesium, weapon),
            })
          : null;
      const fragmentZoneEntity =
        runtimeVisualOptions.showWeaponTrails &&
        runtimeVisualOptions.showDetailedLabels &&
        impactPoint
          ? weaponDataSource.entities.add({
              id: `terrain-weapon-fragment-zone-${weapon.id}`,
              position: buildCartesianFromPoint(Cesium, impactPoint),
              ellipse: createWeaponFragmentZoneGraphics(Cesium, weapon),
            })
          : null;
      const impactCueEntity =
        runtimeVisualOptions.showWeaponTrails &&
        runtimeVisualOptions.showDetailedLabels &&
        impactPoint
          ? weaponDataSource.entities.add({
              id: `terrain-weapon-impact-cue-${weapon.id}`,
              position: buildCartesianFromPoint(
                Cesium,
                resolveWeaponImpactCuePoint(weapon, impactPoint)
              ),
              label: createWeaponImpactCueGraphics(
                Cesium,
                weapon,
                isTerrainBoundWeapon(weapon)
              ),
            })
          : null;

      const weaponState = {
        weapon,
        pointEntity,
        trajectoryEntity,
        trailEntity,
        projectileStreakEntity,
        impactZoneEntity,
        fragmentZoneEntity,
        impactCueEntity,
        motionState,
        positionProperty,
      };
      weaponStateById.set(weapon.id, weaponState);
      if (shouldSpawnWeaponLaunchEffect(weapon)) {
        spawnLaunchEffect(`weapon-${weapon.id}`, weapon);
      }
      return weaponState;
    }

    existingState.weapon = weapon;
    if (!existingState.motionState) {
      existingState.motionState = createRuntimeMotionState(point);
    }
    if (!existingState.positionProperty) {
      existingState.positionProperty = createRuntimeCartesianPositionProperty(
        existingState.motionState
      );
    }
    updateEntityMotionState(existingState.motionState, point, {
      maxSnapDistanceMeters: RUNTIME_WEAPON_POSITION_SNAP_DISTANCE_METERS,
      minDurationMs: 280,
      maxDurationMs: 1300,
    });
    existingState.pointEntity.position = existingState.positionProperty;
    existingState.pointEntity.orientation = orientation;
    existingState.pointEntity.model = runtimeVisualOptions.showWeaponTrails
      ? createWeaponModelGraphics(Cesium, weapon, terrainBoundWeapon)
      : undefined;
    existingState.pointEntity.point = createWeaponPointGraphics(
      Cesium,
      weapon,
      terrainBoundWeapon
    );
    existingState.pointEntity.billboard = runtimeVisualOptions.showWeaponTrails
      ? createWeaponBillboardGraphics(Cesium, weapon, terrainBoundWeapon)
      : undefined;
    existingState.pointEntity.label =
      runtimeVisualOptions.showWeaponTrails &&
      runtimeVisualOptions.showDetailedLabels
        ? createWeaponLabelGraphics(Cesium, weapon, terrainBoundWeapon)
        : undefined;
    existingState.pointEntity.description = buildWeaponDescription(weapon);

    if (
      runtimeVisualOptions.showWeaponTrails &&
      trajectoryPositions.length > 0
    ) {
      if (!existingState.trajectoryEntity) {
        existingState.trajectoryEntity = weaponDataSource.entities.add({
          id: `terrain-weapon-trajectory-${weapon.id}`,
          polyline: createWeaponProjectedTrajectoryGraphics(
            Cesium,
            weapon,
            trajectoryPositions
          ),
        });
      } else {
        existingState.trajectoryEntity.polyline =
          createWeaponProjectedTrajectoryGraphics(
            Cesium,
            weapon,
            trajectoryPositions
          );
      }
    } else if (existingState.trajectoryEntity) {
      weaponDataSource.entities.remove(existingState.trajectoryEntity);
      existingState.trajectoryEntity = null;
    }

    if (runtimeVisualOptions.showWeaponTrails && trailPositions.length > 0) {
      if (!existingState.trailEntity) {
        existingState.trailEntity = weaponDataSource.entities.add({
          id: `terrain-weapon-trail-${weapon.id}`,
          polyline: createWeaponTravelTrailGraphics(
            Cesium,
            weapon,
            trailPositions
          ),
        });
      } else {
        existingState.trailEntity.polyline = createWeaponTravelTrailGraphics(
          Cesium,
          weapon,
          trailPositions
        );
      }
    } else if (existingState.trailEntity) {
      weaponDataSource.entities.remove(existingState.trailEntity);
      existingState.trailEntity = null;
    }

    if (
      runtimeVisualOptions.showWeaponTrails &&
      projectileStreakPositions.length > 0
    ) {
      if (!existingState.projectileStreakEntity) {
        existingState.projectileStreakEntity = weaponDataSource.entities.add({
          id: `terrain-weapon-projectile-streak-${weapon.id}`,
          polyline: createWeaponProjectileStreakGraphics(
            Cesium,
            weapon,
            projectileStreakPositions
          ),
        });
      } else {
        existingState.projectileStreakEntity.polyline =
          createWeaponProjectileStreakGraphics(
            Cesium,
            weapon,
            projectileStreakPositions
          );
      }
    } else {
      if (existingState.projectileStreakEntity) {
        weaponDataSource.entities.remove(existingState.projectileStreakEntity);
        existingState.projectileStreakEntity = null;
      }
    }

    if (
      runtimeVisualOptions.showWeaponTrails &&
      runtimeVisualOptions.showDetailedLabels &&
      impactPoint
    ) {
      if (!existingState.impactZoneEntity) {
        existingState.impactZoneEntity = weaponDataSource.entities.add({
          id: `terrain-weapon-impact-zone-${weapon.id}`,
          position: buildCartesianFromPoint(Cesium, impactPoint),
          ellipse: createWeaponImpactZoneGraphics(Cesium, weapon),
        });
      } else {
        existingState.impactZoneEntity.position = buildCartesianFromPoint(
          Cesium,
          impactPoint
        );
        existingState.impactZoneEntity.ellipse = createWeaponImpactZoneGraphics(
          Cesium,
          weapon
        );
      }
    } else if (existingState.impactZoneEntity) {
      weaponDataSource.entities.remove(existingState.impactZoneEntity);
      existingState.impactZoneEntity = null;
    }

    if (
      runtimeVisualOptions.showWeaponTrails &&
      runtimeVisualOptions.showDetailedLabels &&
      impactPoint
    ) {
      if (!existingState.fragmentZoneEntity) {
        existingState.fragmentZoneEntity = weaponDataSource.entities.add({
          id: `terrain-weapon-fragment-zone-${weapon.id}`,
          position: buildCartesianFromPoint(Cesium, impactPoint),
          ellipse: createWeaponFragmentZoneGraphics(Cesium, weapon),
        });
      } else {
        existingState.fragmentZoneEntity.position = buildCartesianFromPoint(
          Cesium,
          impactPoint
        );
        existingState.fragmentZoneEntity.ellipse =
          createWeaponFragmentZoneGraphics(Cesium, weapon);
      }
    } else if (existingState.fragmentZoneEntity) {
      weaponDataSource.entities.remove(existingState.fragmentZoneEntity);
      existingState.fragmentZoneEntity = null;
    }

    if (
      runtimeVisualOptions.showWeaponTrails &&
      runtimeVisualOptions.showDetailedLabels &&
      impactPoint
    ) {
      const cuePosition = buildCartesianFromPoint(
        Cesium,
        resolveWeaponImpactCuePoint(weapon, impactPoint)
      );
      if (!existingState.impactCueEntity) {
        existingState.impactCueEntity = weaponDataSource.entities.add({
          id: `terrain-weapon-impact-cue-${weapon.id}`,
          position: cuePosition,
          label: createWeaponImpactCueGraphics(
            Cesium,
            weapon,
            isTerrainBoundWeapon(weapon)
          ),
        });
      } else {
        existingState.impactCueEntity.position = cuePosition;
        existingState.impactCueEntity.label = createWeaponImpactCueGraphics(
          Cesium,
          weapon,
          isTerrainBoundWeapon(weapon)
        );
      }
    } else if (existingState.impactCueEntity) {
      weaponDataSource.entities.remove(existingState.impactCueEntity);
      existingState.impactCueEntity = null;
    }

    return existingState;
  }

  function sampleRuntimeRepresentatives(items, limit, getGroupKey) {
    if (!Array.isArray(items) || items.length === 0 || limit <= 0) {
      return [];
    }

    if (items.length <= limit) {
      return items;
    }

    const groupsByKey = new Map();
    items.forEach((item, index) => {
      const key = getGroupKey(item) || `item-${index}`;
      const group = groupsByKey.get(key) ?? [];
      group.push({ item, index });
      groupsByKey.set(key, group);
    });

    const groups = [...groupsByKey.values()].sort((left, right) => {
      if (right.length !== left.length) {
        return right.length - left.length;
      }
      return left[0].index - right[0].index;
    });
    const selectedIndexes = new Set();
    const selected = [];
    const quota = Math.max(1, Math.floor(limit / Math.max(1, groups.length)));

    function addEntry(entry) {
      if (
        !entry ||
        selectedIndexes.has(entry.index) ||
        selected.length >= limit
      ) {
        return;
      }
      selectedIndexes.add(entry.index);
      selected.push(entry);
    }

    groups.forEach((group) => {
      const groupLimit = Math.min(group.length, quota);
      if (groupLimit <= 0) {
        return;
      }
      if (groupLimit === 1) {
        addEntry(group[0]);
        return;
      }
      for (let sampleIndex = 0; sampleIndex < groupLimit; sampleIndex += 1) {
        const groupIndex = Math.round(
          (sampleIndex * (group.length - 1)) / (groupLimit - 1)
        );
        addEntry(group[groupIndex]);
      }
    });

    let fillCursor = 0;
    while (selected.length < limit && fillCursor < items.length * 2) {
      const group = groups[fillCursor % groups.length];
      const entry = group.find(
        (candidate) => !selectedIndexes.has(candidate.index)
      );
      addEntry(entry);
      fillCursor += 1;
    }

    return selected
      .sort((left, right) => left.index - right.index)
      .map((entry) => entry.item);
  }

  function buildRuntimeUnitGroupKey(unit) {
    return [
      unit?.entityType ?? "unit",
      unit?.sideColor ?? unit?.sideId ?? "",
      unit?.className ?? unit?.name ?? "",
    ].join(":");
  }

  function buildRuntimeWeaponGroupKey(weapon) {
    return [
      weapon?.sideColor ?? weapon?.sideId ?? "",
      weapon?.className ?? weapon?.name ?? "",
      weapon?.targetId ?? "",
    ].join(":");
  }

  function limitVisibleUnitsForRender(units, selectedUnitId) {
    if (!Array.isArray(units)) {
      return [];
    }

    if (units.length <= RUNTIME_VISIBLE_UNIT_RENDER_LIMIT) {
      return units;
    }

    const pinned = units.filter((unit) => unit?.id === selectedUnitId);
    const pinnedIds = new Set(pinned.map((unit) => unit?.id).filter(Boolean));
    const candidates = units.filter((unit) => !pinnedIds.has(unit?.id));
    const sampled = sampleRuntimeRepresentatives(
      candidates,
      Math.max(0, RUNTIME_VISIBLE_UNIT_RENDER_LIMIT - pinned.length),
      buildRuntimeUnitGroupKey
    );

    return [...pinned, ...sampled].slice(0, RUNTIME_VISIBLE_UNIT_RENDER_LIMIT);
  }

  function limitVisibleWeaponsForRender(weapons) {
    return sampleRuntimeRepresentatives(
      weapons,
      RUNTIME_VISIBLE_WEAPON_RENDER_LIMIT,
      buildRuntimeWeaponGroupKey
    );
  }

  function buildWeaponImpactEffectOptions(weapon) {
    const effectProfile = resolveWeaponEffectProfile(weapon);
    const impactDynamics = resolveWeaponImpactDynamics(weapon);
    return {
      terrainBound: isTerrainBoundWeapon(weapon),
      radiusMeters: effectProfile.impactRadiusMeters,
      scorchRadiusMeters: effectProfile.scorchRadiusMeters,
      residualSmokeScale: effectProfile.smokeSignalLike
        ? 0.9
        : effectProfile.flightProfile === "rocket"
          ? 1.24
          : effectProfile.flightProfile === "artillery"
            ? 1.18
            : effectProfile.directFireLike
              ? effectProfile.smallArmsLike
                ? 0.18
                : 0.72
              : 1,
      shakeIntensity: impactDynamics.shakeIntensity,
      shakeDurationMs: impactDynamics.shakeDurationMs,
      ringScale: impactDynamics.ringScale,
      secondaryRingScale: impactDynamics.secondaryRingScale,
      pressureWaveScale: impactDynamics.pressureWaveScale,
      pressureWaveAlphaScale: impactDynamics.pressureWaveAlphaScale,
      flashScale: impactDynamics.flashScale,
      fireballScale: impactDynamics.fireballScale,
      dustScale: impactDynamics.dustScale,
      smokeScale: impactDynamics.smokeScale,
      highSmokeScale: impactDynamics.highSmokeScale,
      scorchAlphaScale: impactDynamics.scorchAlphaScale,
      flashPeakRatio: impactDynamics.flashPeakRatio,
      smokeStartRatio: impactDynamics.smokeStartRatio,
      dustStartRatio: impactDynamics.dustStartRatio,
      durationMs:
        effectProfile.residualSmokeMs ??
        (effectProfile.directFireLike
          ? Math.round(WEAPON_IMPACT_EFFECT_MS * 0.54)
          : WEAPON_IMPACT_EFFECT_MS),
      impactColor: effectProfile.impactColor,
      outlineColor: effectProfile.impactColor,
      smokeColor: effectProfile.smokeColor,
      highSmokeColor: effectProfile.highSmokeColor,
      dustColor: effectProfile.dustColor,
      flashColor: effectProfile.flashColor,
      fireballColor: effectProfile.flashColor,
      fireballAlphaScale: effectProfile.smokeSignalLike
        ? 0.18
        : effectProfile.smallArmsLike
          ? 0.08
          : 1,
      flashAlphaScale: effectProfile.smokeSignalLike ? 0.42 : 1,
    };
  }

  function removeHiddenWeaponStates(nextVisibleWeaponIds, options = {}) {
    const spawnImpactEffects = options.spawnImpactEffects !== false;
    [...weaponStateById.keys()].forEach((weaponId) => {
      if (nextVisibleWeaponIds.has(weaponId)) {
        return;
      }

      const weaponState = weaponStateById.get(weaponId);
      if (weaponState?.pointEntity) {
        weaponDataSource.entities.remove(weaponState.pointEntity);
      }
      if (weaponState?.trajectoryEntity) {
        weaponDataSource.entities.remove(weaponState.trajectoryEntity);
      }
      if (weaponState?.trailEntity) {
        weaponDataSource.entities.remove(weaponState.trailEntity);
      }
      if (weaponState?.projectileStreakEntity) {
        weaponDataSource.entities.remove(weaponState.projectileStreakEntity);
      }
      if (weaponState?.impactZoneEntity) {
        weaponDataSource.entities.remove(weaponState.impactZoneEntity);
      }
      if (weaponState?.fragmentZoneEntity) {
        weaponDataSource.entities.remove(weaponState.fragmentZoneEntity);
      }
      if (weaponState?.impactCueEntity) {
        weaponDataSource.entities.remove(weaponState.impactCueEntity);
      }
      const impactPoint = resolveWeaponImpactPoint(weaponState?.weapon);
      if (
        spawnImpactEffects &&
        impactPoint &&
        shouldSpawnWeaponVanishImpactEffect(weaponState?.weapon)
      ) {
        spawnImpactEffect(
          `weapon-vanish-${weaponId}-${Math.round(performance.now())}`,
          impactPoint,
          weaponState?.weapon?.sideColor,
          buildWeaponImpactEffectOptions(weaponState?.weapon)
        );
      }
      weaponStateById.delete(weaponId);
    });
  }

  function buildReferencePointSignature(referencePoint) {
    return [
      referencePoint?.id,
      referencePoint?.name,
      referencePoint?.sideName,
      referencePoint?.sideColor,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
  }

  function resolveObjectiveMarkerKind(referencePoint) {
    return resolveTerrainObjectiveKind(referencePoint);
  }

  function resolveObjectiveCssColor(referencePoint, kind, state) {
    if (state?.status === "complete") {
      return "#80ed99";
    }

    if (state?.status === "active") {
      return "#ffd166";
    }

    if (state?.status === "approaching") {
      return "#7fe7ff";
    }

    if (kind === "strike") {
      return "#ff5c5c";
    }

    if (kind === "arrival") {
      return "#65e6ff";
    }

    return cssColorForSide(referencePoint?.sideColor);
  }

  function resolveObjectiveColor(
    Cesium,
    referencePoint,
    kind,
    alpha = 1,
    state = null
  ) {
    return Cesium.Color.fromCssColorString(
      resolveObjectiveCssColor(referencePoint, kind, state)
    ).withAlpha(alpha);
  }

  function resolveObjectiveLabelPrefix(kind) {
    if (kind === "strike") {
      return "타격목표";
    }

    if (kind === "arrival") {
      return "도착목표";
    }

    return "목표";
  }

  function createObjectiveLabelText(referencePoint, kind, state = null) {
    const name = `${referencePoint?.name ?? ""}`.trim();
    const prefix = resolveObjectiveLabelPrefix(kind);
    const baseLabel = !name
      ? prefix
      : /(목표|표적|target|objective)/i.test(name)
        ? name
        : `${prefix} ${name}`;

    return state?.status && state.status !== "waiting"
      ? `${state.label} · ${baseLabel}`
      : baseLabel;
  }

  function getObjectiveMarkerImage(kind, sideColor, state = null) {
    if (typeof document === "undefined") {
      return "";
    }

    const color = resolveObjectiveCssColor({ sideColor }, kind, state);
    const key = `${kind}|${color}|${state?.status ?? "waiting"}`;
    const cachedImage = OBJECTIVE_MARKER_IMAGE_CACHE.get(key);
    if (cachedImage) {
      return cachedImage;
    }

    const canvas = document.createElement("canvas");
    canvas.width = OBJECTIVE_MARKER_IMAGE_SIZE;
    canvas.height = OBJECTIVE_MARKER_IMAGE_SIZE;
    const context = canvas.getContext("2d");
    if (!context) {
      return "";
    }

    const size = OBJECTIVE_MARKER_IMAGE_SIZE;
    const center = size * 0.5;
    context.clearRect(0, 0, size, size);
    context.shadowColor = "rgba(0, 0, 0, 0.75)";
    context.shadowBlur = 12;
    context.shadowOffsetY = 2;
    context.lineCap = "round";
    context.lineJoin = "round";
    context.strokeStyle = "rgba(255, 255, 255, 0.96)";
    context.fillStyle = color;

    if (kind === "strike") {
      context.beginPath();
      context.arc(center, center, size * 0.28, 0, Math.PI * 2);
      context.fill();
      context.lineWidth = 7;
      context.stroke();
      context.shadowBlur = 0;
      context.strokeStyle = "rgba(0, 0, 0, 0.72)";
      context.lineWidth = 4;
      context.beginPath();
      context.moveTo(center, size * 0.16);
      context.lineTo(center, size * 0.84);
      context.moveTo(size * 0.16, center);
      context.lineTo(size * 0.84, center);
      context.stroke();
    } else {
      context.beginPath();
      context.moveTo(center, size * 0.12);
      context.lineTo(size * 0.78, size * 0.4);
      context.lineTo(center, size * 0.88);
      context.lineTo(size * 0.22, size * 0.4);
      context.closePath();
      context.fill();
      context.lineWidth = 7;
      context.stroke();
      context.shadowBlur = 0;
      context.fillStyle = "rgba(0, 0, 0, 0.72)";
      context.beginPath();
      context.arc(center, size * 0.42, size * 0.08, 0, Math.PI * 2);
      context.fill();
    }

    const image = canvas.toDataURL("image/png");
    OBJECTIVE_MARKER_IMAGE_CACHE.set(key, image);
    return image;
  }

  function createObjectiveBillboardGraphics(
    Cesium,
    referencePoint,
    kind,
    state,
    labelDistance
  ) {
    const image = getObjectiveMarkerImage(
      kind,
      referencePoint?.sideColor,
      state
    );
    if (!image) {
      return undefined;
    }

    const pixelSize =
      state?.status === "complete" ? 48 : kind === "strike" ? 46 : 40;
    return {
      image,
      width: pixelSize,
      height: pixelSize,
      heightReference: Cesium.HeightReference.RELATIVE_TO_GROUND,
      disableDepthTestDistance: Number.POSITIVE_INFINITY,
      pixelOffset: new Cesium.Cartesian2(0, -22),
      scaleByDistance: new Cesium.NearFarScalar(2500, 1, labelDistance, 0.72),
      distanceDisplayCondition: new Cesium.DistanceDisplayCondition(
        0,
        Number.POSITIVE_INFINITY
      ),
      verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
    };
  }

  function createObjectiveLabelGraphics(
    Cesium,
    referencePoint,
    kind,
    state,
    labelDistance
  ) {
    return {
      text: createObjectiveLabelText(referencePoint, kind, state),
      font: "700 15px Inter, Pretendard, sans-serif",
      fillColor: Cesium.Color.WHITE,
      outlineColor: Cesium.Color.BLACK.withAlpha(0.92),
      outlineWidth: 4,
      style: Cesium.LabelStyle.FILL_AND_OUTLINE,
      showBackground: true,
      backgroundColor: resolveObjectiveColor(
        Cesium,
        referencePoint,
        kind,
        state?.status === "complete" ? 0.78 : 0.72,
        state
      ),
      backgroundPadding: new Cesium.Cartesian2(8, 5),
      pixelOffset: new Cesium.Cartesian2(0, -58),
      horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
      verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
      heightReference: Cesium.HeightReference.RELATIVE_TO_GROUND,
      disableDepthTestDistance: Number.POSITIVE_INFINITY,
      scaleByDistance: new Cesium.NearFarScalar(2500, 1, labelDistance, 0.74),
      distanceDisplayCondition: new Cesium.DistanceDisplayCondition(
        0,
        Number.POSITIVE_INFINITY
      ),
    };
  }

  function buildObjectiveDescription(referencePoint, kind, state) {
    return [
      `<strong>${escapeHtml(createObjectiveLabelText(referencePoint, kind, state))}</strong>`,
      `${escapeHtml(referencePoint?.sideName ?? "세력 없음")} · ${escapeHtml(resolveObjectiveLabelPrefix(kind))}`,
      `상태 ${escapeHtml(state?.label ?? "대기")}`,
      `위도 ${escapeHtml(Number(referencePoint?.latitude || 0).toFixed(5))} / 경도 ${escapeHtml(
        Number(referencePoint?.longitude || 0).toFixed(5)
      )}`,
      `고도 ${escapeHtml(formatMeters(Math.max(0, Number(referencePoint?.altitudeMeters) || 0)))}`,
    ].join("<br/>");
  }

  function renderObjectiveEntities(referencePoints) {
    objectiveDataSource?.entities?.removeAll();
    objectivePointByEntityId.clear();

    referencePoints.forEach((referencePoint, index) => {
      const longitude = Number(referencePoint?.longitude);
      const latitude = Number(referencePoint?.latitude);
      if (!Number.isFinite(longitude) || !Number.isFinite(latitude)) {
        return;
      }

      const kind = resolveObjectiveMarkerKind(referencePoint);
      const state = resolveTerrainObjectiveStatus(
        referencePoint,
        lastSnapshot ?? {},
        kind
      );
      const terrainAnchored = true;
      const position = buildCartesianFromPoint(Cesium, {
        longitude,
        latitude,
        altitudeMeters: Math.max(
          16,
          Number(referencePoint?.altitudeMeters) || 0
        ),
      });

      const entityId = `terrain-objective-${referencePoint?.id ?? "point"}-${index}`;
      objectivePointByEntityId.set(entityId, {
        referencePoint,
        kind,
        state,
      });
      objectiveDataSource?.entities?.add({
        id: entityId,
        position,
        billboard: createObjectiveBillboardGraphics(
          Cesium,
          referencePoint,
          kind,
          state,
          labelDistance,
          terrainAnchored
        ),
        label: createObjectiveLabelGraphics(
          Cesium,
          referencePoint,
          kind,
          state,
          labelDistance,
          terrainAnchored
        ),
        description: buildObjectiveDescription(referencePoint, kind, state),
      });
    });
  }

  function normalizeGroundMarker(marker) {
    const point = normalizeGeoPoint(
      marker?.longitude,
      marker?.latitude,
      marker?.altitudeMeters
    );
    const label = String(marker?.label ?? marker?.name ?? "").trim();

    if (!point || !label) {
      return null;
    }

    const markerKind = String(marker?.kind ?? "label")
      .trim()
      .toLowerCase();
    const maximumMarkerSizeMeters =
      markerKind === "zone" || markerKind === "hemisphere" ? 4200 : 800;
    const coordinates =
      markerKind === "zone" && Array.isArray(marker?.coordinates)
        ? sanitizeGroundMarkerZoneCoordinates(marker.coordinates)
        : [];

    return {
      ...point,
      id: String(marker?.id ?? `ground-marker-${label}`),
      kind: markerKind,
      label,
      headingDegrees: Number(marker?.headingDegrees) || 0,
      widthMeters: clamp(
        Number(marker?.widthMeters) || 96,
        18,
        maximumMarkerSizeMeters
      ),
      heightMeters: clamp(
        Number(marker?.heightMeters) || 86,
        18,
        maximumMarkerSizeMeters
      ),
      textSizePx: clamp(Number(marker?.textSizePx) || 34, 12, 96),
      color: String(marker?.color ?? "#ffffff"),
      fillColor: String(marker?.fillColor ?? marker?.color ?? "#ffffff"),
      fillOpacity: clamp(Number(marker?.fillOpacity) || 0.18, 0.04, 0.5),
      outlineColor: String(marker?.outlineColor ?? "rgba(0, 0, 0, 0.74)"),
      radiusMeters: clamp(
        Number(marker?.radiusMeters) ||
          Math.max(
            Number(marker?.widthMeters) || 0,
            Number(marker?.heightMeters) || 0
          ) / 2 ||
          96,
        18,
        maximumMarkerSizeMeters
      ),
      verticalRadiusMeters: clamp(
        Number(marker?.verticalRadiusMeters) ||
          Number(marker?.radiusMeters) ||
          Number(marker?.heightMeters) ||
          86,
        18,
        maximumMarkerSizeMeters
      ),
      volumeHeightMeters: clamp(
        Number(marker?.volumeHeightMeters) || 0,
        0,
        maximumMarkerSizeMeters
      ),
      labelAltitudeMeters: clamp(
        Number(marker?.labelAltitudeMeters) ||
          (markerKind === "zone" ? 48 : 18),
        0,
        maximumMarkerSizeMeters
      ),
      subLabel: String(marker?.subLabel ?? "").trim(),
      showLabel: marker?.showLabel !== false,
      description: String(marker?.description ?? "").trim(),
      coordinates,
    };
  }

  function normalizeGroundMarkerCoordinate(coordinate) {
    if (Array.isArray(coordinate)) {
      return normalizeGeoPoint(
        coordinate[0],
        coordinate[1],
        coordinate[2] ?? 0
      );
    }

    return normalizeGeoPoint(
      coordinate?.longitude,
      coordinate?.latitude,
      coordinate?.altitudeMeters
    );
  }

  function sanitizeGroundMarkerZoneCoordinates(coordinates) {
    const points = Array.isArray(coordinates)
      ? coordinates.map(normalizeGroundMarkerCoordinate).filter(Boolean)
      : [];
    if (points.length < 3) {
      return [];
    }

    const dedupedPoints = [];
    points.forEach((point) => {
      const previous = dedupedPoints[dedupedPoints.length - 1];
      if (!previous || !sameGroundMarkerCoordinate(previous, point)) {
        dedupedPoints.push(point);
      }
    });

    if (
      dedupedPoints.length > 1 &&
      sameGroundMarkerCoordinate(
        dedupedPoints[0],
        dedupedPoints[dedupedPoints.length - 1]
      )
    ) {
      dedupedPoints.pop();
    }

    const uniquePointKeys = new Set(
      dedupedPoints.map(
        (point) => `${point.longitude.toFixed(8)},${point.latitude.toFixed(8)}`
      )
    );
    if (dedupedPoints.length < 3 || uniquePointKeys.size < 3) {
      return [];
    }

    return getGroundMarkerAreaDegrees(dedupedPoints) >= 1e-12
      ? dedupedPoints
      : [];
  }

  function sameGroundMarkerCoordinate(left, right) {
    return (
      left?.longitude === right?.longitude && left?.latitude === right?.latitude
    );
  }

  function getGroundMarkerAreaDegrees(coordinates) {
    let area = 0;
    for (
      let index = 0, previousIndex = coordinates.length - 1;
      index < coordinates.length;
      previousIndex = index, index += 1
    ) {
      area +=
        coordinates[previousIndex].longitude * coordinates[index].latitude -
        coordinates[index].longitude * coordinates[previousIndex].latitude;
    }
    return Math.abs(area) / 2;
  }

  function getGroundMarkerCoordinateBounds(coordinates) {
    const points = Array.isArray(coordinates)
      ? coordinates.map(normalizeGroundMarkerCoordinate).filter(Boolean)
      : [];

    if (points.length === 0) {
      return null;
    }

    const longitudes = points.map((point) => point.longitude);
    const latitudes = points.map((point) => point.latitude);
    return {
      west: Math.min(...longitudes),
      south: Math.min(...latitudes),
      east: Math.max(...longitudes),
      north: Math.max(...latitudes),
    };
  }

  function boundsIntersect(left, right) {
    if (!left || !right) {
      return false;
    }

    return !(
      left.east < right.west ||
      left.west > right.east ||
      left.north < right.south ||
      left.south > right.north
    );
  }

  function isGroundMarkerInsideBounds(marker, bounds) {
    const markerPoint = normalizeGeoPoint(
      marker?.longitude,
      marker?.latitude,
      marker?.altitudeMeters
    );
    if (markerPoint && isPointInsideBounds(markerPoint, bounds)) {
      return true;
    }

    const coordinateBounds = getGroundMarkerCoordinateBounds(
      marker?.coordinates
    );
    if (boundsIntersect(coordinateBounds, bounds)) {
      return true;
    }

    return Array.isArray(marker?.coordinates)
      ? marker.coordinates.some((coordinate) => {
          const point = normalizeGroundMarkerCoordinate(coordinate);
          return point && isPointInsideBounds(point, bounds);
        })
      : false;
  }

  function buildGroundMarkerRectangle(marker) {
    const latitudeRadians = marker.latitude * (Math.PI / 180);
    const metersPerLongitude = Math.max(1, 111320 * Math.cos(latitudeRadians));
    const halfWidthDegrees = marker.widthMeters / 2 / metersPerLongitude;
    const halfHeightDegrees = marker.heightMeters / 2 / 110540;

    return Cesium.Rectangle.fromDegrees(
      marker.longitude - halfWidthDegrees,
      marker.latitude - halfHeightDegrees,
      marker.longitude + halfWidthDegrees,
      marker.latitude + halfHeightDegrees
    );
  }

  function createGroundMarkerCanvas(marker) {
    const cacheKey = [
      marker.label,
      marker.color,
      marker.outlineColor,
      marker.textSizePx,
    ].join("|");
    const cached = GROUND_MARKER_IMAGE_CACHE.get(cacheKey);
    if (cached) {
      return cached;
    }

    const canvas = document.createElement("canvas");
    canvas.width = GROUND_MARKER_CANVAS_SIZE;
    canvas.height = GROUND_MARKER_CANVAS_SIZE;
    const context = canvas.getContext("2d");
    if (!context) {
      return canvas;
    }

    context.clearRect(0, 0, canvas.width, canvas.height);
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.font = `900 ${Math.round(
      GROUND_MARKER_CANVAS_SIZE * 0.58
    )}px "Arial Black", "Noto Sans KR", "Segoe UI", sans-serif`;
    context.lineJoin = "round";
    context.miterLimit = 2;
    context.shadowColor = "rgba(0, 0, 0, 0.48)";
    context.shadowBlur = 9;
    context.shadowOffsetX = 0;
    context.shadowOffsetY = 3;
    context.strokeStyle = marker.outlineColor;
    context.lineWidth = 24;
    context.strokeText(
      marker.label,
      GROUND_MARKER_CANVAS_SIZE / 2,
      GROUND_MARKER_CANVAS_SIZE / 2 + 4
    );
    context.shadowBlur = 0;
    context.fillStyle = marker.color;
    context.fillText(
      marker.label,
      GROUND_MARKER_CANVAS_SIZE / 2,
      GROUND_MARKER_CANVAS_SIZE / 2 + 4
    );

    GROUND_MARKER_IMAGE_CACHE.set(cacheKey, canvas);
    return canvas;
  }

  function buildGroundMarkerMaterial(marker) {
    if (marker.kind === "zone") {
      return Cesium.Color.fromCssColorString(marker.fillColor).withAlpha(
        marker.fillOpacity
      );
    }

    return new Cesium.ImageMaterialProperty({
      image: createGroundMarkerCanvas(marker),
      transparent: true,
      color: Cesium.Color.WHITE.withAlpha(0.96),
    });
  }

  function buildGroundMarkerPolygonHierarchy(marker) {
    if (
      marker.kind !== "zone" ||
      marker.coordinates.length < 3 ||
      getGroundMarkerAreaDegrees(marker.coordinates) < 1e-12
    ) {
      return null;
    }

    const positions = marker.coordinates.map((coordinate) =>
      Cesium.Cartesian3.fromDegrees(
        coordinate.longitude,
        coordinate.latitude,
        coordinate.altitudeMeters ?? 0
      )
    );

    return new Cesium.PolygonHierarchy(positions);
  }

  function buildGroundMarkerLabelText(marker) {
    const detail = runtimeVisualOptions.showDetailedLabels
      ? marker.subLabel || marker.description
      : "";
    const trimmedDetail = String(detail ?? "")
      .replace(marker.label, "")
      .replace(/^[\s·-]+/, "")
      .trim();

    return trimmedDetail
      ? `${marker.label}\n${truncateText(trimmedDetail, 34)}`
      : marker.label;
  }

  function createGroundMarkerZoneLabelGraphics(marker) {
    const textSize = clamp(Number(marker.textSizePx) || 16, 12, 26);
    return {
      text: buildGroundMarkerLabelText(marker),
      font: `900 ${textSize}px 'Segoe UI', 'Noto Sans KR', sans-serif`,
      fillColor: Cesium.Color.fromCssColorString(marker.color),
      outlineColor: Cesium.Color.fromCssColorString("#031014").withAlpha(0.95),
      outlineWidth: 3,
      style: Cesium.LabelStyle.FILL_AND_OUTLINE,
      showBackground: true,
      backgroundColor:
        Cesium.Color.fromCssColorString("#04161d").withAlpha(0.76),
      backgroundPadding: new Cesium.Cartesian2(8, 6),
      horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
      verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
      pixelOffset: new Cesium.Cartesian2(0, -8),
      heightReference: Cesium.HeightReference.RELATIVE_TO_GROUND,
      disableDepthTestDistance: Number.POSITIVE_INFINITY,
      distanceDisplayCondition: new Cesium.DistanceDisplayCondition(
        0,
        Number.POSITIVE_INFINITY
      ),
      scaleByDistance: new Cesium.NearFarScalar(1200, 1, labelDistance, 0.72),
    };
  }

  function createGroundMarkerZonePointGraphics(marker) {
    return {
      pixelSize: 8,
      color: Cesium.Color.fromCssColorString(marker.color).withAlpha(0.95),
      outlineColor: Cesium.Color.fromCssColorString("#031014").withAlpha(0.9),
      outlineWidth: 2,
      heightReference: Cesium.HeightReference.RELATIVE_TO_GROUND,
      disableDepthTestDistance: Number.POSITIVE_INFINITY,
    };
  }

  function buildGroundMarkerZonePolygonGraphics(marker, polygonHierarchy) {
    const polygon = {
      hierarchy: polygonHierarchy,
      material: buildGroundMarkerMaterial(marker),
      outline: false,
      distanceDisplayCondition: new Cesium.DistanceDisplayCondition(
        0,
        Number.POSITIVE_INFINITY
      ),
    };

    if (marker.volumeHeightMeters > 0) {
      return {
        ...polygon,
        closeTop: true,
        closeBottom: false,
        height: 0,
        extrudedHeight: marker.volumeHeightMeters,
        heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
        extrudedHeightReference: Cesium.HeightReference.RELATIVE_TO_GROUND,
      };
    }

    return {
      ...polygon,
      height: 0,
      classificationType: Cesium.ClassificationType.TERRAIN,
    };
  }

  function addGroundMarkerZoneLabel(marker) {
    if (marker.kind !== "zone" || !marker.showLabel) {
      return;
    }

    const labelPoint = {
      ...marker,
      altitudeMeters: Math.max(
        marker.labelAltitudeMeters,
        marker.volumeHeightMeters + 24
      ),
    };
    groundMarkerDataSource?.entities?.add({
      id: `terrain-ground-marker-label-${marker.id}`,
      position: buildRuntimeCartesianFromHeightReferencedPoint(
        labelPoint,
        true,
        24
      ),
      point: createGroundMarkerZonePointGraphics(marker),
      label: createGroundMarkerZoneLabelGraphics(marker),
      description:
        marker.description || `훈련장 3D 지형 권역 ${escapeHtml(marker.label)}`,
    });
  }

  function renderGroundMarkerEntities(groundMarkers) {
    groundMarkerDataSource?.entities?.removeAll();
    if (!Array.isArray(groundMarkers)) {
      return;
    }

    groundMarkers
      .map(normalizeGroundMarker)
      .filter(Boolean)
      .filter((marker) => isGroundMarkerInsideBounds(marker, placementBounds))
      .forEach((marker) => {
        const polygonHierarchy = buildGroundMarkerPolygonHierarchy(marker);
        const groundGeometry =
          marker.kind === "hemisphere"
            ? {
                position: buildCartesianFromPoint(Cesium, {
                  ...marker,
                  altitudeMeters: resolveGroundAbsoluteAltitude(marker),
                }),
                ellipsoid: {
                  radii: new Cesium.Cartesian3(
                    marker.radiusMeters,
                    marker.radiusMeters,
                    marker.verticalRadiusMeters
                  ),
                  minimumCone: 0,
                  maximumCone: Cesium.Math.PI_OVER_TWO,
                  material: Cesium.Color.fromCssColorString(
                    marker.fillColor
                  ).withAlpha(marker.fillOpacity),
                  outline: true,
                  outlineColor: Cesium.Color.fromCssColorString(
                    marker.outlineColor
                  ).withAlpha(0.82),
                  slicePartitions: 36,
                  stackPartitions: 18,
                  distanceDisplayCondition: new Cesium.DistanceDisplayCondition(
                    0,
                    Number.POSITIVE_INFINITY
                  ),
                },
              }
            : polygonHierarchy
              ? {
                  polygon: {
                    ...buildGroundMarkerZonePolygonGraphics(
                      marker,
                      polygonHierarchy
                    ),
                  },
                }
              : {
                  rectangle: {
                    coordinates: buildGroundMarkerRectangle(marker),
                    material: buildGroundMarkerMaterial(marker),
                    rotation: Cesium.Math.toRadians(marker.headingDegrees),
                    stRotation: Cesium.Math.toRadians(marker.headingDegrees),
                    height: 0,
                    heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
                    classificationType: Cesium.ClassificationType.TERRAIN,
                    outline: false,
                    distanceDisplayCondition:
                      new Cesium.DistanceDisplayCondition(
                        0,
                        Number.POSITIVE_INFINITY
                      ),
                  },
                };

        groundMarkerDataSource?.entities?.add({
          id: `terrain-ground-marker-${marker.id}`,
          name:
            marker.kind === "zone"
              ? `훈련장 지형 ${marker.label}`
              : `훈련장 표적 ${marker.label}`,
          ...groundGeometry,
          description:
            marker.description ||
            `승진훈련장 고정 표적 ${escapeHtml(marker.label)}`,
        });
        addGroundMarkerZoneLabel(marker);
      });
  }

  function resolveEventPinLabel(event) {
    const effectProfile = resolveWeaponEffectProfile(
      buildEventEffectWeapon(event, resolveEventAnchorPoint(event))
    );
    if (effectProfile.flareLike) {
      return "플레어";
    }

    if (isImpactLikeEvent(event)) {
      return "탄착";
    }

    if (isLaunchLikeEvent(event)) {
      return "발사";
    }

    const type = `${event?.type ?? ""}`.toLowerCase();
    const message = `${event?.message ?? ""}`;
    if (type.includes("crash") || /(추락|손실|상실)/i.test(message)) {
      return "손실";
    }

    if (/(도착|완료|route|complete)/i.test(`${type} ${message}`)) {
      return "완료";
    }

    return "이벤트";
  }

  function createEventPinLabelGraphics(
    Cesium,
    event,
    freshness,
    terrainAnchored = false
  ) {
    const label = resolveEventPinLabel(event);
    const alpha = 0.72 + freshness * 0.24;
    return {
      text: label,
      font: "800 12px 'Segoe UI', 'Noto Sans KR', sans-serif",
      fillColor: Cesium.Color.WHITE.withAlpha(alpha),
      outlineColor: Cesium.Color.BLACK.withAlpha(0.84),
      outlineWidth: 3,
      style: Cesium.LabelStyle.FILL_AND_OUTLINE,
      showBackground: true,
      backgroundColor: resolveEventPointColor(Cesium, event).withAlpha(
        0.44 + freshness * 0.22
      ),
      backgroundPadding: new Cesium.Cartesian2(7, 4),
      pixelOffset: new Cesium.Cartesian2(0, -30),
      verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
      horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
      heightReference: terrainAnchored
        ? Cesium.HeightReference.RELATIVE_TO_GROUND
        : resolveEventHeightReference(Cesium, event),
      disableDepthTestDistance: terrainAnchored
        ? Number.POSITIVE_INFINITY
        : resolveEventDepthTestDistance(event),
      scaleByDistance: new Cesium.NearFarScalar(2500, 1, 180000, 0.66),
      distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 220000),
    };
  }

  function renderEventEntities(events) {
    eventDataSource?.entities?.removeAll();
    eventByEntityId.clear();

    events.forEach((event, eventIndex) => {
      const anchorPoint = resolveEventAnchorPoint(event);
      if (!anchorPoint) {
        return;
      }

      const impactLike = isImpactLikeEvent(event);
      const launchLike = isLaunchLikeEvent(event);
      const suppressedLaunchEffect = event?.suppressLaunchEffect === true;
      const terrainBoundEvent = isTerrainBoundEvent(event);
      const eventId =
        event?.id ?? `${eventIndex}-${Number(event?.timestamp) || 0}`;
      const eventEffectKey = `event-${eventId}`;
      const freshness =
        events.length > 1 ? clamp01((eventIndex + 1) / events.length) : 1;

      if (
        runtimeVisualOptions.showEventEffects &&
        !triggeredEventEffectIds.has(eventEffectKey) &&
        (impactLike || launchLike)
      ) {
        rememberTriggeredEventEffect(eventEffectKey);
        const eventEffectWeapon = buildEventEffectWeapon(event, anchorPoint);
        if (impactLike) {
          const eventEffectProfile =
            resolveWeaponEffectProfile(eventEffectWeapon);
          if (eventEffectProfile.flareLike) {
            spawnLaunchEffect(eventEffectKey, eventEffectWeapon);
          } else {
            const impactOptions = {
              ...buildWeaponImpactEffectOptions(eventEffectWeapon),
              terrainBound: terrainBoundEvent,
            };
            const projectileDelayStarted = spawnEventProjectileArrivalEffect(
              eventEffectKey,
              event,
              anchorPoint,
              event?.sideColor,
              impactOptions
            );
            if (!projectileDelayStarted) {
              spawnImpactEffect(
                eventEffectKey,
                anchorPoint,
                event?.sideColor,
                impactOptions
              );
            }
          }
        } else if (!suppressedLaunchEffect) {
          spawnLaunchEffect(eventEffectKey, eventEffectWeapon);
          const launchUnitState = findLaunchUnitStateForEvent(
            event,
            anchorPoint
          );
          if (launchUnitState) {
            spawnGroundUnitLaunchEffect(
              `ground-${eventEffectKey}-${launchUnitState.unit.id}`,
              launchUnitState
            );
          }
        }
      }

      if (runtimeVisualOptions.showEventEffects) {
        const traceWeapon = buildEventTraceWeapon(event);
        const tracePositions = traceWeapon
          ? buildRuntimeEventTracePositions(traceWeapon)
          : [];
        const traceArrowPositions = traceWeapon
          ? buildRuntimeEventTraceArrowPositions(traceWeapon)
          : [];
        if (traceWeapon && tracePositions.length > 0) {
          eventDataSource.entities.add({
            id: `terrain-event-trace-glow-${eventId}`,
            polyline: createEventTraceGlowGraphics(
              Cesium,
              traceWeapon,
              tracePositions,
              freshness
            ),
          });
          eventDataSource.entities.add({
            id: `terrain-event-trace-dash-${eventId}`,
            polyline: createEventTraceDashGraphics(
              Cesium,
              traceWeapon,
              tracePositions,
              freshness
            ),
          });
          if (traceArrowPositions.length > 0) {
            eventDataSource.entities.add({
              id: `terrain-event-trace-arrow-${eventId}`,
              polyline: createEventTraceArrowGraphics(
                Cesium,
                traceWeapon,
                traceArrowPositions,
                freshness
              ),
            });
          }

          const labelPoint = resolveEventTraceLabelPoint(traceWeapon);
          if (labelPoint && runtimeVisualOptions.showDetailedLabels) {
            eventDataSource.entities.add({
              id: `terrain-event-trace-label-${eventId}`,
              position: buildCartesianFromPoint(Cesium, labelPoint),
              label: createEventTraceLabelGraphics(
                Cesium,
                event,
                traceWeapon,
                freshness
              ),
            });
          }
        }
      }

      const entityId = `terrain-event-${eventId}`;
      const eventDisplayPoint = resolveEventDisplayPoint(
        event,
        anchorPoint,
        impactLike ? 42 : launchLike ? 28 : 12
      );
      const eventPosition = buildCartesianFromPoint(Cesium, eventDisplayPoint);
      eventByEntityId.set(entityId, event);
      eventDataSource.entities.add({
        id: entityId,
        position: eventPosition,
        point: {
          pixelSize: impactLike ? 15 : launchLike ? 12 : 11,
          color: resolveEventPointColor(Cesium, event),
          outlineColor: Cesium.Color.BLACK.withAlpha(0.72),
          outlineWidth: 2,
          heightReference: terrainBoundEvent
            ? Cesium.HeightReference.RELATIVE_TO_GROUND
            : resolveEventHeightReference(Cesium, event),
          disableDepthTestDistance: terrainBoundEvent
            ? Number.POSITIVE_INFINITY
            : resolveEventDepthTestDistance(event),
        },
        label:
          eventIndex >= events.length - 3
            ? createEventPinLabelGraphics(
                Cesium,
                event,
                freshness,
                terrainBoundEvent
              )
            : undefined,
        description: buildEventDescription(event),
      });
    });
  }

  function resolveGroundAbsoluteAltitude(displayPoint) {
    const longitude = Number(displayPoint?.longitude);
    const latitude = Number(displayPoint?.latitude);

    if (
      !Number.isFinite(longitude) ||
      !Number.isFinite(latitude) ||
      !viewer?.scene
    ) {
      return Math.max(
        0,
        TERRAIN_ANCHOR_FALLBACK_GROUND_ALTITUDE_METERS +
          Math.max(0, Number(displayPoint?.altitudeMeters) || 0)
      );
    }

    const cartographic = Cesium.Cartographic.fromDegrees(longitude, latitude);
    let terrainHeight = viewer.scene.globe?.getHeight?.(cartographic);

    if (
      !Number.isFinite(terrainHeight) &&
      viewer.scene.sampleHeightSupported === true
    ) {
      try {
        terrainHeight = viewer.scene.sampleHeight(cartographic);
      } catch (_error) {
        terrainHeight = undefined;
      }
    }

    if (Number.isFinite(terrainHeight)) {
      rememberTerrainHeight(longitude, latitude, terrainHeight);
      return Math.max(
        0,
        terrainHeight + Math.max(0, Number(displayPoint?.altitudeMeters) || 0)
      );
    }

    scheduleTerrainAnchoredRefresh();
    const cachedTerrainHeight = lookupTerrainHeight(longitude, latitude);
    return Math.max(
      0,
      (Number.isFinite(cachedTerrainHeight)
        ? cachedTerrainHeight
        : TERRAIN_ANCHOR_FALLBACK_GROUND_ALTITUDE_METERS) +
        Math.max(0, Number(displayPoint?.altitudeMeters) || 0)
    );
  }

  function resolveTerrainAnchoredPoint(point, minimumAltitudeMeters = 0) {
    if (!point) {
      return null;
    }

    const terrainRelativePoint = {
      ...point,
      altitudeMeters: Math.max(
        Number(minimumAltitudeMeters) || 0,
        Number(point.altitudeMeters) || 0
      ),
    };

    return {
      ...terrainRelativePoint,
      altitudeMeters: resolveGroundAbsoluteAltitude(terrainRelativePoint),
    };
  }

  function buildRuntimeCartesianFromTerrainPoint(
    point,
    terrainAnchored = false,
    minimumAltitudeMeters = 0
  ) {
    if (!point) {
      return buildCartesianFromPoint(Cesium, null);
    }

    return buildCartesianFromPoint(
      Cesium,
      terrainAnchored
        ? resolveTerrainAnchoredPoint(point, minimumAltitudeMeters)
        : {
            ...point,
            altitudeMeters: Math.max(
              Number(minimumAltitudeMeters) || 0,
              Number(point?.altitudeMeters) || 0
            ),
          }
    );
  }

  function buildRuntimeCartesianFromHeightReferencedPoint(
    point,
    terrainAnchored = false,
    minimumAltitudeMeters = 0
  ) {
    if (!point) {
      return buildCartesianFromPoint(Cesium, null);
    }

    if (!terrainAnchored) {
      return buildRuntimeCartesianFromTerrainPoint(
        point,
        false,
        minimumAltitudeMeters
      );
    }

    return buildCartesianFromPoint(Cesium, {
      ...point,
      altitudeMeters: Math.max(
        Number(minimumAltitudeMeters) || 0,
        Number(point?.altitudeMeters) || 0
      ),
    });
  }

  function buildRuntimeCartesianArrayFromTerrainPoints(
    points,
    terrainRelative
  ) {
    const resolvedPoints = terrainRelative
      ? points.map((point) => ({
          ...point,
          altitudeMeters: resolveGroundAbsoluteAltitude(point),
        }))
      : points;

    return buildCartesianArrayFromPoints(Cesium, resolvedPoints);
  }

  function buildRuntimeWeaponTrajectoryPositions(weapon) {
    return buildRuntimeCartesianArrayFromTerrainPoints(
      buildWeaponTrajectoryPointSamples(weapon),
      isTerrainBoundWeapon(weapon)
    );
  }

  function buildRuntimeWeaponTrailPositions(weapon) {
    return buildRuntimeCartesianArrayFromTerrainPoints(
      buildWeaponTrailPointSamples(weapon),
      isTerrainBoundWeapon(weapon)
    );
  }

  function buildRuntimeWeaponProjectileStreakPositions(weapon) {
    return buildRuntimeCartesianArrayFromTerrainPoints(
      buildWeaponProjectileStreakPointSamples(weapon),
      isTerrainBoundWeapon(weapon)
    );
  }

  function buildRuntimeEventTracePositions(traceWeapon) {
    return buildRuntimeCartesianArrayFromTerrainPoints(
      buildWeaponArcPointSamples(
        traceWeapon,
        resolveWeaponImpactPoint(traceWeapon),
        EVENT_TRACE_SAMPLE_COUNT
      ),
      isTerrainBoundWeapon(traceWeapon)
    );
  }

  function buildRuntimeEventTraceArrowPositions(
    traceWeapon,
    headProgress = 0.86
  ) {
    return buildRuntimeCartesianArrayFromTerrainPoints(
      buildEventTraceArrowPointSamples(traceWeapon, headProgress),
      isTerrainBoundWeapon(traceWeapon)
    );
  }

  function resolveFocusTargetCartesian(unitState, preset) {
    const longitude = Number(unitState?.displayPoint?.longitude) || 0;
    const latitude = Number(unitState?.displayPoint?.latitude) || 0;
    const terrainRelativeUnit =
      isGroundRenderUnit(unitState?.unit) ||
      unitState?.unit?.entityType === "aircraft";
    const baseAltitude = terrainRelativeUnit
      ? resolveGroundAbsoluteAltitude(unitState?.displayPoint)
      : Math.max(0, Number(unitState?.displayPoint?.altitudeMeters) || 0);

    return Cesium.Cartesian3.fromDegrees(
      longitude,
      latitude,
      baseAltitude + Math.max(0, Number(preset?.targetHeightOffsetMeters) || 0)
    );
  }

  function buildFocusCameraView(targetCartesian, preset) {
    const headingRadians = Cesium.Math.toRadians(
      normalizeHeading(preset?.headingDeg || 0)
    );
    const pitchRadians = Cesium.Math.toRadians(Number(preset?.pitchDeg) || -45);
    const rangeMeters = Math.max(24, Number(preset?.rangeMeters) || 120);
    const horizontalRange = rangeMeters * Math.cos(-pitchRadians);
    const localOffset = new Cesium.Cartesian3(
      Math.sin(headingRadians) * horizontalRange,
      Math.cos(headingRadians) * horizontalRange,
      rangeMeters * Math.sin(-pitchRadians)
    );
    const transform =
      Cesium.Transforms.eastNorthUpToFixedFrame(targetCartesian);
    const destination = Cesium.Matrix4.multiplyByPoint(
      transform,
      localOffset,
      new Cesium.Cartesian3()
    );
    const direction = Cesium.Cartesian3.normalize(
      Cesium.Cartesian3.subtract(
        targetCartesian,
        destination,
        new Cesium.Cartesian3()
      ),
      new Cesium.Cartesian3()
    );
    const geodeticUp = Cesium.Ellipsoid.WGS84.geodeticSurfaceNormal(
      destination,
      new Cesium.Cartesian3()
    );
    let right = Cesium.Cartesian3.cross(
      direction,
      geodeticUp,
      new Cesium.Cartesian3()
    );

    if (Cesium.Cartesian3.magnitudeSquared(right) < 1e-6) {
      right = Cesium.Cartesian3.cross(
        direction,
        Cesium.Cartesian3.UNIT_Z,
        new Cesium.Cartesian3()
      );
    }

    right = Cesium.Cartesian3.normalize(right, right);
    const up = Cesium.Cartesian3.normalize(
      Cesium.Cartesian3.cross(right, direction, new Cesium.Cartesian3()),
      new Cesium.Cartesian3()
    );

    return {
      destination,
      orientation: {
        direction,
        up,
      },
    };
  }

  function triggerImpactShake(intensity = 10, durationMs = 260) {
    if (!runtimeVisualOptions.impactCameraShake) {
      return;
    }

    const targetElement =
      viewer?.container ?? document.getElementById("cesiumContainer");
    if (!targetElement) {
      return;
    }

    if (typeof targetElement.animate === "function") {
      targetElement.animate(
        [
          { transform: "translate3d(0, 0, 0)" },
          {
            transform: `translate3d(${Math.round(intensity * 0.5)}px, ${Math.round(
              intensity * -0.35
            )}px, 0)`,
          },
          {
            transform: `translate3d(${Math.round(intensity * -0.45)}px, ${Math.round(
              intensity * 0.25
            )}px, 0)`,
          },
          {
            transform: `translate3d(${Math.round(intensity * 0.2)}px, ${Math.round(
              intensity * 0.1
            )}px, 0)`,
          },
          { transform: "translate3d(0, 0, 0)" },
        ],
        {
          duration: durationMs,
          easing: "cubic-bezier(0.22, 0.61, 0.36, 1)",
        }
      );
      return;
    }

    targetElement.style.transform = `translate(${Math.round(intensity * 0.3)}px, ${Math.round(
      intensity * -0.2
    )}px)`;
    window.setTimeout(() => {
      targetElement.style.transform = "";
    }, durationMs);
  }

  function flyToTerrainPoint(point, preset, options = {}) {
    if (!viewer || !point) {
      return false;
    }

    const targetCartesian = buildCartesianFromPoint(Cesium, {
      ...point,
      altitudeMeters: Math.max(
        Number(preset?.targetHeightOffsetMeters) || 0,
        Number(point?.altitudeMeters) || 0
      ),
    });
    const focusView = buildFocusCameraView(targetCartesian, preset);

    viewer.camera.cancelFlight?.();
    viewer.camera.flyTo({
      destination: focusView.destination,
      orientation: focusView.orientation,
      duration: typeof options.duration === "number" ? options.duration : 0.72,
      easingFunction: Cesium.EasingFunction.QUADRATIC_OUT,
      maximumHeight: Math.max(
        240,
        Math.max(0, Number(preset?.rangeMeters) || 0) * 1.8
      ),
      endTransform: Cesium.Matrix4.IDENTITY,
    });
    requestRender();
    return true;
  }

  function focusObjectiveByData(referencePoint, options = {}) {
    if (!referencePoint) {
      return false;
    }

    const kind = resolveObjectiveMarkerKind(referencePoint);
    const state = resolveTerrainObjectiveStatus(
      referencePoint,
      lastSnapshot ?? {},
      kind
    );
    const rangeMeters =
      kind === "strike" ? (state.status === "active" ? 520 : 620) : 760;
    return flyToTerrainPoint(
      {
        longitude: Number(referencePoint.longitude),
        latitude: Number(referencePoint.latitude),
        altitudeMeters: Math.max(
          36,
          Number(referencePoint.altitudeMeters) || 0
        ),
      },
      {
        headingDeg: kind === "strike" ? 138 : 118,
        pitchDeg: kind === "strike" ? -36 : -42,
        rangeMeters,
        targetHeightOffsetMeters: 52,
      },
      options
    );
  }

  function focusEventByData(event, options = {}) {
    if (!viewer) {
      return;
    }

    const anchorPoint = resolveEventAnchorPoint(event);
    if (!anchorPoint) {
      return;
    }

    const currentHeadingDeg = Number.isFinite(viewer.camera?.heading)
      ? Cesium.Math.toDegrees(viewer.camera.heading)
      : 136;
    const preset = {
      headingDeg: normalizeHeading(currentHeadingDeg + 18),
      pitchDeg: -34,
      rangeMeters: isImpactLikeEvent(event) ? 240 : 300,
      targetHeightOffsetMeters: isImpactLikeEvent(event) ? 24 : 18,
    };
    flyToTerrainPoint(anchorPoint, preset, options);

    if (isImpactLikeEvent(event)) {
      const impactDynamics = resolveWeaponImpactDynamics(
        buildEventEffectWeapon(event, anchorPoint)
      );
      triggerImpactShake(
        impactDynamics.shakeIntensity,
        impactDynamics.shakeDurationMs
      );
    }
  }

  function focusCameraPreset(presetId, options = {}) {
    if (!viewer) {
      return;
    }

    const normalizedPresetId = `${presetId ?? ""}`.toLowerCase();
    if (normalizedPresetId === "overview") {
      viewer.camera.cancelFlight?.();
      viewer.camera.flyTo({
        destination: Cesium.Rectangle.fromDegrees(
          placementBounds.west,
          placementBounds.south,
          placementBounds.east,
          placementBounds.north
        ),
        duration:
          typeof options.duration === "number" ? options.duration : 0.85,
        easingFunction: Cesium.EasingFunction.QUADRATIC_OUT,
      });
      requestRender();
      return;
    }

    if (normalizedPresetId === "fires") {
      const activeWeapon =
        [...weaponStateById.values()].find((weaponState) =>
          resolveWeaponImpactPoint(weaponState.weapon)
        ) ?? null;
      if (
        activeWeapon &&
        flyToTerrainPoint(
          resolveWeaponImpactPoint(activeWeapon.weapon),
          {
            headingDeg: 132,
            pitchDeg: -34,
            rangeMeters: 900,
            targetHeightOffsetMeters: 96,
          },
          options
        )
      ) {
        return;
      }

      const latestImpactEvent = [...activeEvents]
        .reverse()
        .find((event) => isImpactLikeEvent(event));
      if (latestImpactEvent) {
        focusEventByData(latestImpactEvent, options);
        return;
      }
    }

    if (normalizedPresetId === "drone") {
      const droneUnitState =
        activeUnits.find((unitState) =>
          isDroneLikePlacementUnit(unitState.unit)
        ) ?? null;
      if (droneUnitState) {
        focusUnitById(droneUnitState.unit.id, options);
        return;
      }
    }

    if (normalizedPresetId === "ground") {
      const groundUnitState =
        activeUnits.find((unitState) => isGroundRenderUnit(unitState.unit)) ??
        null;
      if (groundUnitState) {
        focusUnitById(groundUnitState.unit.id, options);
        return;
      }
    }

    const objective =
      activeReferencePoints.find(
        (referencePoint) =>
          resolveTerrainObjectiveStatus(
            referencePoint,
            lastSnapshot ?? {},
            resolveObjectiveMarkerKind(referencePoint)
          ).status === "active"
      ) ??
      activeReferencePoints.find(
        (referencePoint) =>
          resolveObjectiveMarkerKind(referencePoint) === "strike"
      ) ??
      activeReferencePoints[0] ??
      null;
    if (objective) {
      focusObjectiveByData(objective, options);
      return;
    }

    const fallbackPoint = {
      longitude: (placementBounds.west + placementBounds.east) / 2,
      latitude: (placementBounds.south + placementBounds.north) / 2,
      altitudeMeters: 120,
    };
    flyToTerrainPoint(
      fallbackPoint,
      {
        headingDeg: 132,
        pitchDeg: -48,
        rangeMeters: 2200,
        targetHeightOffsetMeters: 120,
      },
      options
    );
  }

  function renderAssetDetail(unitState) {
    if (!assetDetail) {
      return;
    }

    if (!unitState) {
      assetDetail.innerHTML = "";
      return;
    }

    const { unit, displayPoint } = unitState;
    assetDetail.innerHTML = [
      `<strong>${escapeHtml(unit?.name ?? "이름 없음")}</strong>`,
      `${escapeHtml(unit?.sideName ?? "세력 없음")} · ${escapeHtml(
        unit?.className ?? unit?.entityType ?? "unknown"
      )}`,
      `표시 좌표 ${escapeHtml(
        Number(displayPoint?.latitude || 0).toFixed(5)
      )}, ${escapeHtml(Number(displayPoint?.longitude || 0).toFixed(5))}`,
      `표시 고도 ${escapeHtml(
        formatMeters(Math.max(0, Number(displayPoint?.altitudeMeters) || 0))
      )} · 방위 ${escapeHtml(
        `${Math.round(normalizeHeading(unit?.headingDeg))}°`
      )}`,
    ].join("<br/>");
  }

  function renderAssetPanel() {
    if (!assetPanel || !assetList) {
      return;
    }

    if (activeUnits.length === 0) {
      setAssetCount("자산 0");
      setAssetHint("");
      renderAssetDetail(null);
      assetList.innerHTML = "";
      return;
    }

    const sortedUnits = [...activeUnits].sort((left, right) =>
      sortPlacementUnitsForPanel(
        {
          ...left.unit,
          focused: left.unit.id === focusedUnitId,
        },
        {
          ...right.unit,
          focused: right.unit.id === focusedUnitId,
        }
      )
    );

    setAssetCount(`자산 ${sortedUnits.length.toLocaleString("ko-KR")}개`);
    setAssetHint("");
    renderAssetDetail(getFocusedUnitState());
    assetList.innerHTML = "";

    sortedUnits.forEach((unitState) => {
      const { unit, displayPoint } = unitState;
      const button = document.createElement("button");
      button.type = "button";
      button.className = "terrain-asset-button";
      if (unit.id === focusedUnitId) {
        button.classList.add("is-active");
      }

      button.innerHTML = `
        <span class="terrain-asset-title">
          <strong>${escapeHtml(truncateText(unit?.name ?? "이름 없음", 28))}</strong>
          <span class="terrain-asset-side">${escapeHtml(
            truncateText(unit?.sideName ?? unit?.sideId ?? "Unknown", 10)
          )}</span>
        </span>
        <span class="terrain-asset-meta">${escapeHtml(
          unit?.className ?? unit?.entityType ?? "unknown"
        )}</span>
        <span class="terrain-asset-coord">${escapeHtml(
          `${Number(displayPoint?.latitude || 0).toFixed(4)}, ${Number(
            displayPoint?.longitude || 0
          ).toFixed(4)}`
        )}</span>
      `;
      button.addEventListener("click", () => {
        focusUnitById(unit.id);
      });
      assetList.appendChild(button);
    });
  }

  function focusUnitById(unitId, options = {}) {
    if (!viewer) {
      return;
    }

    if (focusedUnitId !== unitId) {
      const previousFocusedUnitId = focusedUnitId;
      focusedUnitId = unitId;
      syncFocusedVisuals(previousFocusedUnitId, focusedUnitId);
    } else {
      renderAssetPanel();
    }

    const unitState = unitStateById.get(unitId);
    if (!unitState) {
      return;
    }

    const preset = resolveFocusCameraPreset(
      unitState.unit,
      unitState.model,
      unitState.displayPoint
    );
    const targetCartesian = resolveFocusTargetCartesian(unitState, preset);
    const focusView = buildFocusCameraView(targetCartesian, preset);

    viewer.selectedEntity = unitState.entity ?? undefined;
    viewer.camera.cancelFlight?.();
    viewer.camera.flyTo({
      destination: focusView.destination,
      orientation: focusView.orientation,
      duration: typeof options.duration === "number" ? options.duration : 0.65,
      easingFunction: Cesium.EasingFunction.QUADRATIC_OUT,
      maximumHeight: Math.max(
        180,
        Math.max(0, Number(preset?.rangeMeters) || 0) * 1.45
      ),
      endTransform: Cesium.Matrix4.IDENTITY,
    });
    renderAssetPanel();
    renderRuntimeSummary(
      lastSnapshot,
      activeUnits.map((unitState) => unitState.unit),
      [...weaponStateById.values()].map((weaponState) => weaponState.weapon),
      Array.isArray(lastSnapshot?.recentEvents)
        ? lastSnapshot.recentEvents.slice(0, 6)
        : []
    );
    requestRender();
  }

  function normalizeLayerRevealPointId(pointId) {
    return String(pointId ?? "")
      .trim()
      .replace(/^ref-/, "");
  }

  function getLayerRevealTriggerPointId() {
    const layerReveal = lastSnapshot?.layerReveal;
    if (layerReveal?.enabled !== true) {
      return "";
    }
    return normalizeLayerRevealPointId(layerReveal.triggerPointId);
  }

  function notifyLayerRevealFromPickedEntity(pickedRuntimeEntity) {
    const triggerPointId = getLayerRevealTriggerPointId();
    if (!triggerPointId || !pickedRuntimeEntity) {
      return false;
    }

    let pickedPointId = "";
    if (pickedRuntimeEntity.type === "unit") {
      pickedPointId = normalizeLayerRevealPointId(pickedRuntimeEntity.id);
    } else if (pickedRuntimeEntity.type === "objective") {
      const referencePoint = objectivePointByEntityId.get(
        pickedRuntimeEntity.id
      )?.referencePoint;
      pickedPointId = normalizeLayerRevealPointId(referencePoint?.id);
    }

    if (pickedPointId !== triggerPointId) {
      return false;
    }

    window.parent?.postMessage(
      {
        type: "terrain3d:target-reveal",
        payload: {
          triggerPointId,
          source: pickedRuntimeEntity.type,
        },
      },
      window.location.origin
    );
    requestRender();
    return true;
  }

  function resolvePickedRuntimeEntity(picked) {
    const candidate =
      picked?.id && typeof picked.id === "object"
        ? picked.id
        : picked?.primitive?.id && typeof picked.primitive.id === "object"
          ? picked.primitive.id
          : null;
    const entityId = typeof candidate?.id === "string" ? candidate.id : null;

    if (!entityId) {
      return null;
    }

    if (
      entityId.startsWith("terrain-placement-route-") ||
      entityId.startsWith("terrain-placement-route-end-")
    ) {
      return null;
    }

    const groundAuxiliaryMatch = entityId.match(
      /^terrain-placement-(?:ground-shadow|selection-ring|body-line|barrel-line|dust)-(.+)$/
    );
    if (groundAuxiliaryMatch) {
      const unitId = groundAuxiliaryMatch[1];
      return {
        type: "unit",
        entity: unitStateById.get(unitId)?.entity ?? candidate,
        id: unitId,
      };
    }

    if (entityId.startsWith("terrain-placement-")) {
      return {
        type: "unit",
        entity: candidate,
        id: entityId.replace(/^terrain-placement-/, ""),
      };
    }

    if (entityId.startsWith("terrain-objective-")) {
      return {
        type: "objective",
        entity: candidate,
        id: entityId,
      };
    }

    if (entityId.startsWith("terrain-event-")) {
      return {
        type: "event",
        entity: candidate,
        id: entityId,
      };
    }

    return null;
  }

  function wireSceneInteraction() {
    interactionHandler?.destroy?.();
    interactionHandler = new Cesium.ScreenSpaceEventHandler(
      viewer.scene.canvas
    );
    interactionHandler.setInputAction((movement) => {
      const picked = viewer.scene.pick(movement.position);
      const pickedRuntimeEntity = resolvePickedRuntimeEntity(picked);
      if (!pickedRuntimeEntity) {
        return;
      }

      if (notifyLayerRevealFromPickedEntity(pickedRuntimeEntity)) {
        return;
      }

      if (pickedRuntimeEntity.type === "unit") {
        focusUnitById(pickedRuntimeEntity.id, {
          duration: 0.5,
        });
        return;
      }

      if (pickedRuntimeEntity.type === "objective") {
        focusObjectiveByData(
          objectivePointByEntityId.get(pickedRuntimeEntity.id)?.referencePoint,
          { duration: 0.5 }
        );
        return;
      }

      if (pickedRuntimeEntity.type === "event") {
        focusEventByData(eventByEntityId.get(pickedRuntimeEntity.id), {
          duration: 0.5,
        });
      }
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK);
  }

  function applySnapshot(snapshot) {
    if (!dataSource) {
      pendingSnapshot = snapshot;
      return;
    }

    if (snapshot !== lastSnapshot) {
      terrainAnchorRefreshAttempts = 0;
    }
    lastSnapshot = snapshot;
    if (!snapshot || !Array.isArray(snapshot.units)) {
      clearPlacement();
      setPlacementBadge?.("배치 없음");
      return;
    }

    const visibleUnitCandidates = snapshot.units.filter((unit) =>
      isPointInsideBounds(unit, placementBounds)
    );
    const visibleUnits = limitVisibleUnitsForRender(
      visibleUnitCandidates,
      snapshot?.selectedUnitId
    );
    const visibleWeaponCandidates = Array.isArray(snapshot.weapons)
      ? snapshot.weapons.filter((weapon) =>
          isWeaponInsideBounds(weapon, placementBounds)
        )
      : [];
    const visibleWeapons = limitVisibleWeaponsForRender(
      visibleWeaponCandidates
    );
    const visibleGroundMarkers = Array.isArray(snapshot.groundMarkers)
      ? snapshot.groundMarkers.filter((marker) =>
          isGroundMarkerInsideBounds(marker, placementBounds)
        )
      : [];
    const visibleReferencePoints = Array.isArray(snapshot.referencePoints)
      ? snapshot.referencePoints
          .filter((referencePoint) =>
            isPointInsideBounds(referencePoint, placementBounds)
          )
          .filter(
            (referencePoint) =>
              !isFixedTargetReferenceCoveredByGroundMarker(
                referencePoint,
                visibleGroundMarkers
              )
          )
      : [];
    const visibleEvents = Array.isArray(snapshot.recentEvents)
      ? snapshot.recentEvents
          .filter((event) => isEventInsideBounds(event, terrainEffectBounds))
          .slice(-6)
      : [];
    const renderContext = buildUnitRenderContext(visibleUnits);
    const nextFocusedUnitId = visibleUnits.some(
      (unit) => unit.id === focusedUnitId
    )
      ? focusedUnitId
      : visibleUnits.some((unit) => unit.id === snapshot?.selectedUnitId)
        ? snapshot.selectedUnitId
        : null;

    const previousFocusedUnitId = focusedUnitId;
    focusedUnitId = nextFocusedUnitId;
    activeUnits = [];
    activeReferencePoints = visibleReferencePoints;
    activeEvents = visibleEvents;

    const nextVisibleUnitIds = new Set();
    visibleUnits.forEach((unit) => {
      nextVisibleUnitIds.add(unit.id);
      const unitState = upsertUnitState(unit, renderContext);
      if (unitState) {
        activeUnits.push(unitState);
      }
    });
    removeHiddenUnitStates(nextVisibleUnitIds);

    const nextVisibleWeaponIds = new Set();
    visibleWeapons.forEach((weapon) => {
      nextVisibleWeaponIds.add(weapon.id);
      upsertWeaponState(weapon);
    });
    removeHiddenWeaponStates(nextVisibleWeaponIds, {
      spawnImpactEffects:
        visibleWeaponCandidates.length <= RUNTIME_VISIBLE_WEAPON_RENDER_LIMIT,
    });
    renderGroundMarkerEntities(visibleGroundMarkers);
    renderObjectiveEntities(visibleReferencePoints);
    renderEventEntities(visibleEvents);
    updateFocusFireImpactBox(snapshot);

    const latestVisibleImpactEvent =
      runtimeVisualOptions.autoTrackImpacts === true
        ? ([...visibleEvents]
            .filter((event) => isImpactLikeEvent(event))
            .sort(
              (left, right) =>
                (Number(right?.timestamp) || 0) - (Number(left?.timestamp) || 0)
            )[0] ?? null)
        : null;

    if (
      latestVisibleImpactEvent &&
      latestVisibleImpactEvent.id !== lastTrackedImpactEventId
    ) {
      lastTrackedImpactEventId = latestVisibleImpactEvent.id;
      focusEventByData(latestVisibleImpactEvent, { duration: 0.78 });
    }

    if (previousFocusedUnitId !== focusedUnitId) {
      syncFocusedVisuals(previousFocusedUnitId, focusedUnitId);
    }

    setPlacementBadge?.(
      visibleUnits.length > 0 || visibleWeapons.length > 0
        ? `자산 ${visibleUnits.length.toLocaleString("ko-KR")}${
            visibleUnitCandidates.length > visibleUnits.length
              ? `/${visibleUnitCandidates.length.toLocaleString("ko-KR")}`
              : ""
          } · 무기 ${visibleWeapons.length.toLocaleString("ko-KR")}${
            visibleWeaponCandidates.length > visibleWeapons.length
              ? `/${visibleWeaponCandidates.length.toLocaleString("ko-KR")}`
              : ""
          }`
        : "배치 0개"
    );

    if (visibleUnits.length > 0 || visibleWeapons.length > 0) {
      setStatusMessage?.(
        `선택 bbox 내부 전력을 실시간 반영합니다. 자산 ${visibleUnits.length.toLocaleString(
          "ko-KR"
        )}개${
          visibleUnitCandidates.length > visibleUnits.length
            ? ` / 전체 ${visibleUnitCandidates.length.toLocaleString(
                "ko-KR"
              )}개 중 대표 전력`
            : ""
        }, 비행 중 무기 ${visibleWeapons.length.toLocaleString("ko-KR")}개${
          visibleWeaponCandidates.length > visibleWeapons.length
            ? ` / 전체 ${visibleWeaponCandidates.length.toLocaleString(
                "ko-KR"
              )}개 중 대표 탄도`
            : ""
        }를 표시합니다.`
      );
    } else {
      setStatusMessage?.(
        "선택 bbox 내부 전력이 아직 없습니다. 시뮬레이션이 진행되면 여기에 즉시 반영됩니다."
      );
    }

    renderAssetPanel();
    renderRuntimeSummary(snapshot, visibleUnits, visibleWeapons, visibleEvents);
    if (focusedUnitId && unitStateById.has(focusedUnitId)) {
      viewer.selectedEntity =
        unitStateById.get(focusedUnitId)?.entity ?? undefined;
    }
    requestRender();
  }

  function handleMessage(event) {
    if (event.origin !== window.location.origin) {
      return;
    }

    if (event.data?.type === "terrain3d:command") {
      const commandPayload =
        event.data?.payload && typeof event.data.payload === "object"
          ? event.data.payload
          : null;

      if (commandPayload?.command === "set-visual-options") {
        applyRuntimeVisualOptions(commandPayload.options ?? {});
      }
      if (
        commandPayload?.command === "focus-unit" &&
        typeof commandPayload.unitId === "string"
      ) {
        focusUnitById(commandPayload.unitId, { duration: 0.5 });
      }
      if (
        commandPayload?.command === "focus-camera-preset" &&
        typeof commandPayload.presetId === "string"
      ) {
        focusCameraPreset(commandPayload.presetId, { duration: 0.65 });
      }
      if (
        commandPayload?.command === "focus-objective" &&
        typeof commandPayload.referencePointId === "string"
      ) {
        focusObjectiveByData(
          activeReferencePoints.find(
            (referencePoint) =>
              referencePoint?.id === commandPayload.referencePointId
          ),
          { duration: 0.55 }
        );
      }
      if (
        commandPayload?.command === "focus-event" &&
        typeof commandPayload.eventId === "string"
      ) {
        focusEventByData(
          activeEvents.find((event) => event?.id === commandPayload.eventId),
          { duration: 0.55 }
        );
      }
      return;
    }

    if (
      event.data?.type !== "terrain3d:placement-snapshot" &&
      event.data?.type !== "terrain3d:runtime-snapshot"
    ) {
      return;
    }

    const snapshot = event.data?.payload ?? null;
    if (!dataSource) {
      pendingSnapshot = snapshot;
      return;
    }

    applySnapshot(snapshot);
  }

  async function attach(viewerInstance) {
    viewer = viewerInstance;
    dataSource = new Cesium.CustomDataSource("terrain-placement");
    weaponDataSource = new Cesium.CustomDataSource("terrain-weapons");
    eventDataSource = new Cesium.CustomDataSource("terrain-events");
    objectiveDataSource = new Cesium.CustomDataSource("terrain-objectives");
    groundMarkerDataSource = new Cesium.CustomDataSource(
      "terrain-ground-markers"
    );
    focusFireDataSource = new Cesium.CustomDataSource("terrain-focus-fire");
    effectDataSource = new Cesium.CustomDataSource("terrain-effects");
    await viewer.dataSources.add(dataSource);
    await viewer.dataSources.add(weaponDataSource);
    await viewer.dataSources.add(eventDataSource);
    await viewer.dataSources.add(objectiveDataSource);
    await viewer.dataSources.add(groundMarkerDataSource);
    await viewer.dataSources.add(focusFireDataSource);
    await viewer.dataSources.add(effectDataSource);
    wireSceneInteraction();
    setPlacementBadge?.("배치 대기");
    renderAssetPanel();
    renderRuntimeSummary(null, [], [], []);
    if (notifyReadyOnAttach) {
      notifyParentReady();
    }
    viewer.scene?.globe?.tileLoadProgressEvent?.addEventListener?.(
      (queueLength) => {
        if (queueLength === 0) {
          terrainAnchorRefreshAttempts = 0;
          scheduleTerrainAnchoredRefresh();
        }
      }
    );

    if (pendingSnapshot) {
      const snapshot = pendingSnapshot;
      pendingSnapshot = null;
      applySnapshot(snapshot);
    }
  }

  return {
    attach,
    applySnapshot,
    clearPlacement,
    getLastSnapshot: () => lastSnapshot,
    handleMessage,
    notifyReady: notifyParentReady,
  };
}
