// @ts-nocheck
import {
  SIDE_COLOR_MAP,
  GROUND_CLUSTER_BUCKET_DEGREES,
  GROUND_CLUSTER_BASE_ALTITUDE_METERS,
  GROUND_MODEL_BUDGET,
  GOLDEN_ANGLE_RADIANS,
  DRONE_ROUTE_GROUP_BUCKET_DEGREES,
  DRONE_FORMATION_BASE_RADIUS_METERS,
  DRONE_FORMATION_RING_SPACING_METERS,
  DRONE_FORMATION_BASE_ALTITUDE_METERS,
  DRONE_FORMATION_VERTICAL_STEP_METERS,
  DRONE_FORMATION_COLLAPSE_DISTANCE_METERS,
  AIRCRAFT_ROUTE_TARGET_REACHED_METERS,
  TERRAIN_UNIT_MODEL_MODE,
  MODEL_ROOT_NODE_NAME,
  MODEL_AXIS_CORRECTION_BY_URI,
  MODEL_MATERIAL_CORRECTION_BY_URI,
  MODEL_LOADER_AXIS_BY_CONVENTION,
  DEFAULT_UNIT_MODEL,
  UNIT_MODEL_SCALE_PRESET,
  UNIT_MARKER_IMAGE_SIZE,
  UNIT_MARKER_IMAGE_CACHE,
  UNIT_MODEL_URI_BY_ID,
  AIRCRAFT_MODEL_MAP,
  SHIP_MODEL_MAP,
  FACILITY_MODEL_MAP,
  MEASURED_UNIT_SCALE_ENTRIES,
} from "./placementRuntimeAssets";
import {
  approximateDistanceMeters,
  buildUnitRoutePointSamples,
  clamp,
  resolveAircraftRouteProgressState,
  resolveAircraftRouteVisualProfile,
  normalizeGeoPoint,
  resolveUnitRouteEndpointPoint,
} from "./placementRuntimeVisuals";

export function normalizeBounds(bounds, minimumSpanDegrees = 0.002) {
  const west = Math.min(bounds.west, bounds.east);
  const east = Math.max(bounds.west, bounds.east);
  const south = Math.min(bounds.south, bounds.north);
  const north = Math.max(bounds.south, bounds.north);
  const centerLon = (west + east) * 0.5;
  const centerLat = (south + north) * 0.5;
  const width = Math.max(east - west, minimumSpanDegrees);
  const height = Math.max(north - south, minimumSpanDegrees);

  return {
    west: Math.max(-180, centerLon - width * 0.5),
    south: Math.max(-85, centerLat - height * 0.5),
    east: Math.min(180, centerLon + width * 0.5),
    north: Math.min(85, centerLat + height * 0.5),
  };
}

export function expandBounds(bounds, ratio = 0.04, minimumPadding = 0.0005) {
  const widthPadding = Math.max(
    (bounds.east - bounds.west) * ratio,
    minimumPadding
  );
  const heightPadding = Math.max(
    (bounds.north - bounds.south) * ratio,
    minimumPadding
  );

  return normalizeBounds({
    west: bounds.west - widthPadding,
    south: bounds.south - heightPadding,
    east: bounds.east + widthPadding,
    north: bounds.north + heightPadding,
  });
}

export function normalizeHeading(headingDeg) {
  return (((Number(headingDeg) || 0) % 360) + 360) % 360;
}

export function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function truncateText(value, maxLength = 30) {
  const text = `${value ?? ""}`.trim();
  if (text.length <= maxLength) {
    return text;
  }

  return `${text.slice(0, Math.max(1, maxLength - 1))}…`;
}

export function formatMeters(valueInMeters) {
  return `${Math.round(valueInMeters).toLocaleString("ko-KR")}m`;
}

export function formatImpactLoad(value) {
  const safeValue = Math.max(0, Number(value) || 0);
  return safeValue >= 10 ? safeValue.toFixed(0) : safeValue.toFixed(1);
}

export function isGroundRenderUnit(unit) {
  return (
    unit?.groundUnit === true ||
    unit?.entityType === "facility" ||
    unit?.entityType === "army" ||
    unit?.entityType === "airbase"
  );
}

export function hasRoutePoints(route) {
  return Array.isArray(route) && route.length > 0;
}

export function shouldApplyGroundClusterOffset(unit) {
  if (!isGroundRenderUnit(unit)) {
    return false;
  }

  const movement = resolveGroundUnitMovementVisualState(unit);
  return (
    !movement.moving &&
    !hasRoutePoints(unit?.route) &&
    !hasRoutePoints(unit?.desiredRoute)
  );
}

export function buildGroundClusterKey(unit) {
  const latitude = Number(unit?.latitude);
  const longitude = Number(unit?.longitude);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return null;
  }

  return [
    unit?.sideId ?? "unknown",
    Math.round(latitude / GROUND_CLUSTER_BUCKET_DEGREES),
    Math.round(longitude / GROUND_CLUSTER_BUCKET_DEGREES),
  ].join(":");
}

export function sortGroundClusterUnits(left, right) {
  const leftSelected = left?.selected === true ? 1 : 0;
  const rightSelected = right?.selected === true ? 1 : 0;
  if (leftSelected !== rightSelected) {
    return rightSelected - leftSelected;
  }

  const leftWeapons = Math.max(0, Number(left?.weaponCount) || 0);
  const rightWeapons = Math.max(0, Number(right?.weaponCount) || 0);
  if (leftWeapons !== rightWeapons) {
    return rightWeapons - leftWeapons;
  }

  return `${left?.name ?? ""}`.localeCompare(`${right?.name ?? ""}`, "ko-KR");
}

export function applyEastNorthOffset(
  point,
  eastMeters,
  northMeters,
  altitudeMeters
) {
  const latitude = Number(point?.latitude) || 0;
  const longitude = Number(point?.longitude) || 0;

  return {
    longitude:
      longitude +
      eastMeters /
        (111320 * Math.max(Math.cos((latitude * Math.PI) / 180), 0.01)),
    latitude: latitude + northMeters / 110540,
    altitudeMeters:
      Math.max(0, Number(point?.altitudeMeters) || 0) + altitudeMeters,
  };
}

export function resolveDroneFormationOffset(index, density) {
  const safeIndex = Math.max(0, Math.round(Number(index) || 0));
  const safeDensity = Math.max(1, Math.round(Number(density) || 1));
  if (safeDensity <= 1) {
    return {
      eastMeters: 0,
      northMeters: 0,
      altitudeMeters: 0,
    };
  }

  const ring = Math.floor(safeIndex / 8);
  const radiusMeters =
    DRONE_FORMATION_BASE_RADIUS_METERS +
    Math.min(18, safeDensity * 1.4) +
    ring * DRONE_FORMATION_RING_SPACING_METERS;
  const angle = (safeIndex + 0.35) * GOLDEN_ANGLE_RADIANS;
  const altitudeLane =
    ((safeIndex % 5) - 2) * DRONE_FORMATION_VERTICAL_STEP_METERS;

  return {
    eastMeters: Math.cos(angle) * radiusMeters,
    northMeters: Math.sin(angle) * radiusMeters,
    altitudeMeters:
      DRONE_FORMATION_BASE_ALTITUDE_METERS +
      altitudeLane +
      ring * DRONE_FORMATION_VERTICAL_STEP_METERS,
  };
}

export function buildUnitRenderContext(units = []) {
  let groundModelCandidateCount = 0;
  const groundClusters = new Map();
  const droneRouteGroups = new Map();

  units.forEach((unit) => {
    if (isGroundRenderUnit(unit)) {
      groundModelCandidateCount += 1;
    }

    if (!shouldApplyGroundClusterOffset(unit) || typeof unit?.id !== "string") {
      return;
    }

    const clusterKey = buildGroundClusterKey(unit);
    if (!clusterKey) {
      return;
    }

    const cluster = groundClusters.get(clusterKey) ?? [];
    cluster.push(unit);
    groundClusters.set(clusterKey, cluster);
  });

  units.forEach((unit) => {
    if (
      unit?.entityType !== "aircraft" ||
      !isDroneLikePlacementUnit(unit) ||
      typeof unit?.id !== "string"
    ) {
      return;
    }

    const routeEndpoint =
      resolveUnitRouteEndpointPoint(unit, unit?.altitudeMeters) ??
      normalizeGeoPoint(unit?.longitude, unit?.latitude, unit?.altitudeMeters);
    if (!routeEndpoint) {
      return;
    }

    const groupKey = [
      unit?.sideId ?? "unknown",
      Math.round(routeEndpoint.latitude / DRONE_ROUTE_GROUP_BUCKET_DEGREES),
      Math.round(routeEndpoint.longitude / DRONE_ROUTE_GROUP_BUCKET_DEGREES),
    ].join(":");
    const group = droneRouteGroups.get(groupKey) ?? [];
    group.push(unit);
    droneRouteGroups.set(groupKey, group);
  });

  const groundOffsetsByUnitId = {};
  const droneOffsetsByUnitId = {};
  const droneRouteGroupsByUnitId = {};

  groundClusters.forEach((clusterUnits) => {
    clusterUnits.sort(sortGroundClusterUnits).forEach((unit, index) => {
      if (index === 0) {
        groundOffsetsByUnitId[unit.id] = {
          eastMeters: 0,
          northMeters: 0,
          altitudeMeters: GROUND_CLUSTER_BASE_ALTITUDE_METERS,
        };
        return;
      }

      const ring = Math.floor((index - 1) / 6);
      const radiusMeters = 28 + ring * 16;
      const angle = index * GOLDEN_ANGLE_RADIANS;

      groundOffsetsByUnitId[unit.id] = {
        eastMeters: Math.cos(angle) * radiusMeters,
        northMeters: Math.sin(angle) * radiusMeters,
        altitudeMeters: GROUND_CLUSTER_BASE_ALTITUDE_METERS + ring * 0.45,
      };
    });
  });

  droneRouteGroups.forEach((groupUnits) => {
    const sortedGroupUnits = [...groupUnits].sort((left, right) => {
      const leftProgress = resolveAircraftRouteProgressState(
        left,
        buildUnitRoutePointSamples(left, left)
      );
      const rightProgress = resolveAircraftRouteProgressState(
        right,
        buildUnitRoutePointSamples(right, right)
      );
      const leftRemaining = Number.isFinite(
        leftProgress.remainingDistanceMeters
      )
        ? leftProgress.remainingDistanceMeters
        : Number.MAX_SAFE_INTEGER;
      const rightRemaining = Number.isFinite(
        rightProgress.remainingDistanceMeters
      )
        ? rightProgress.remainingDistanceMeters
        : Number.MAX_SAFE_INTEGER;
      return leftRemaining - rightRemaining;
    });
    const leaderId = sortedGroupUnits[0]?.id ?? null;

    sortedGroupUnits.forEach((unit, index) => {
      const droneOffset = resolveDroneFormationOffset(
        index,
        sortedGroupUnits.length
      );
      droneOffsetsByUnitId[unit.id] = droneOffset;
      droneRouteGroupsByUnitId[unit.id] = {
        density: sortedGroupUnits.length,
        lead: unit.id === leaderId,
        index,
        ...droneOffset,
      };
    });
  });

  return {
    groundModelCandidateCount,
    groundOffsetsByUnitId,
    droneOffsetsByUnitId,
    droneRouteGroupsByUnitId,
  };
}

export function hasGroundModelBudget(
  renderContext,
  facilityModelBudget = GROUND_MODEL_BUDGET
) {
  const groundModelCandidateCount = Math.max(
    0,
    Number(renderContext?.groundModelCandidateCount) || 0
  );

  return groundModelCandidateCount <= Math.max(0, facilityModelBudget || 0);
}

export function resolveDroneFormationDisplayScale(unit) {
  const endpoint = resolveUnitRouteEndpointPoint(unit, unit?.altitudeMeters);
  const currentPoint = normalizeGeoPoint(
    unit?.longitude,
    unit?.latitude,
    unit?.altitudeMeters
  );
  if (!endpoint || !currentPoint) {
    return 0;
  }

  const remainingDistanceMeters = approximateDistanceMeters(
    currentPoint,
    endpoint
  );
  if (remainingDistanceMeters <= AIRCRAFT_ROUTE_TARGET_REACHED_METERS) {
    return 0;
  }

  return clamp(
    (remainingDistanceMeters - AIRCRAFT_ROUTE_TARGET_REACHED_METERS) /
      Math.max(
        1,
        DRONE_FORMATION_COLLAPSE_DISTANCE_METERS -
          AIRCRAFT_ROUTE_TARGET_REACHED_METERS
      ),
    0,
    1
  );
}

export function resolveDisplayedUnitPoint(unit, renderContext) {
  if (unit?.entityType === "aircraft" && isDroneLikePlacementUnit(unit)) {
    const offset =
      renderContext?.droneOffsetsByUnitId && typeof unit?.id === "string"
        ? renderContext.droneOffsetsByUnitId[unit.id]
        : null;

    if (offset) {
      const displayScale = resolveDroneFormationDisplayScale(unit);
      if (displayScale <= 0) {
        return unit;
      }

      return applyEastNorthOffset(
        unit,
        (Number(offset.eastMeters) || 0) * displayScale,
        (Number(offset.northMeters) || 0) * displayScale,
        (Number(offset.altitudeMeters) || 0) * displayScale
      );
    }
  }

  if (!isGroundRenderUnit(unit)) {
    return unit;
  }

  const offset =
    renderContext?.groundOffsetsByUnitId && typeof unit?.id === "string"
      ? renderContext.groundOffsetsByUnitId[unit.id]
      : null;

  if (!offset) {
    return applyEastNorthOffset(
      unit,
      0,
      0,
      GROUND_CLUSTER_BASE_ALTITUDE_METERS
    );
  }

  return applyEastNorthOffset(
    unit,
    Number(offset.eastMeters) || 0,
    Number(offset.northMeters) || 0,
    Number(offset.altitudeMeters) || GROUND_CLUSTER_BASE_ALTITUDE_METERS
  );
}

export function buildScaleProfile(spec) {
  return {
    scale: spec.targetLongestAxisMeters / spec.sourceLongestAxisMeters,
    minimumPixelSize: spec.minimumPixelSize,
    maximumScale: spec.maximumScale,
  };
}

export function resolveUnitModelScaleProfile(modelId, uri) {
  const matchedSpec = MEASURED_UNIT_SCALE_ENTRIES.find((entry) => {
    return entry.keys.includes(modelId) || entry.keys.includes(uri);
  });

  return matchedSpec ? buildScaleProfile(matchedSpec) : null;
}

export function findFirstMatchingModel(signature, candidates, fallbackModel) {
  for (const [pattern, modelPath] of candidates) {
    if (pattern.test(signature)) {
      return modelPath;
    }
  }

  return fallbackModel;
}

export function buildPlacementSignature(item) {
  return `${item?.className ?? ""} ${item?.name ?? ""}`.toLowerCase();
}

export function buildWeaponSignature(weapon) {
  return [
    weapon?.id,
    weapon?.modelId,
    weapon?.className,
    weapon?.name,
    weapon?.launcherId,
    weapon?.launcherName,
    weapon?.launcherClassName,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

export function hashString(value) {
  const text = `${value ?? ""}`;
  let hash = 0;
  for (let index = 0; index < text.length; index += 1) {
    hash = (hash * 31 + text.charCodeAt(index)) >>> 0;
  }
  return hash;
}

export function normalizeModelUriForLookup(uri) {
  const rawUri =
    typeof uri?.getUrlComponent === "function"
      ? uri.getUrlComponent(false)
      : typeof uri?.url === "string"
        ? uri.url
        : String(uri ?? "");
  const withoutQuery = rawUri.split("?")[0];
  try {
    const decodedUri = decodeURI(withoutQuery);
    if (
      typeof window !== "undefined" &&
      typeof window.location?.href === "string"
    ) {
      try {
        return decodeURI(new URL(decodedUri, window.location.href).pathname);
      } catch (_urlError) {
        return decodedUri;
      }
    }

    return decodedUri;
  } catch (_error) {
    return withoutQuery;
  }
}

const GLB_MAGIC = 0x46546c67;
const GLB_JSON_CHUNK_TYPE = 0x4e4f534a;
const WHITE_EMISSIVE_COMPONENT_THRESHOLD = 0.95;
const WHITE_EMISSIVE_MATERIAL_RATIO = 0.6;
const SANITIZED_MODEL_URL_CACHE = new Map();

function isUniformWhiteEmissiveMaterial(material) {
  const emissiveFactor = material?.emissiveFactor;
  return (
    Array.isArray(emissiveFactor) &&
    emissiveFactor.length >= 3 &&
    emissiveFactor
      .slice(0, 3)
      .every(
        (component) =>
          Number.isFinite(Number(component)) &&
          Number(component) >= WHITE_EMISSIVE_COMPONENT_THRESHOLD
      ) &&
    material?.emissiveTexture === undefined
  );
}

export function shouldSanitizeTerrainGltfWhiteEmissiveMaterials(gltfJson) {
  const materials = Array.isArray(gltfJson?.materials)
    ? gltfJson.materials
    : [];
  if (materials.length < 2) {
    return false;
  }

  const whiteEmissiveMaterialCount = materials.filter(
    isUniformWhiteEmissiveMaterial
  ).length;
  return (
    whiteEmissiveMaterialCount >= 2 &&
    whiteEmissiveMaterialCount / materials.length >=
      WHITE_EMISSIVE_MATERIAL_RATIO
  );
}

export function sanitizeTerrainGltfMaterialJson(gltfJson) {
  if (!shouldSanitizeTerrainGltfWhiteEmissiveMaterials(gltfJson)) {
    return gltfJson;
  }

  return {
    ...gltfJson,
    materials: gltfJson.materials.map((material) => {
      if (!isUniformWhiteEmissiveMaterial(material)) {
        return material;
      }

      const nextMaterial = {
        ...material,
        emissiveFactor: [0, 0, 0],
      };
      if (nextMaterial.extensions?.KHR_materials_emissive_strength) {
        const nextExtensions = { ...nextMaterial.extensions };
        delete nextExtensions.KHR_materials_emissive_strength;
        if (Object.keys(nextExtensions).length > 0) {
          nextMaterial.extensions = nextExtensions;
        } else {
          delete nextMaterial.extensions;
        }
      }
      return nextMaterial;
    }),
  };
}

export function sanitizeTerrainGlbArrayBufferMaterials(arrayBuffer) {
  const source =
    arrayBuffer instanceof Uint8Array
      ? arrayBuffer
      : new Uint8Array(arrayBuffer);
  if (source.byteLength < 20) {
    return null;
  }

  const view = new DataView(
    source.buffer,
    source.byteOffset,
    source.byteLength
  );
  if (view.getUint32(0, true) !== GLB_MAGIC || view.getUint32(4, true) !== 2) {
    return null;
  }

  const jsonChunkLength = view.getUint32(12, true);
  const jsonChunkType = view.getUint32(16, true);
  const jsonChunkStart = 20;
  const jsonChunkEnd = jsonChunkStart + jsonChunkLength;
  if (
    jsonChunkType !== GLB_JSON_CHUNK_TYPE ||
    jsonChunkLength <= 0 ||
    jsonChunkEnd > source.byteLength
  ) {
    return null;
  }

  const decoder = new TextDecoder();
  const gltfJson = JSON.parse(
    decoder.decode(source.subarray(jsonChunkStart, jsonChunkEnd)).trimEnd()
  );
  const sanitizedJson = sanitizeTerrainGltfMaterialJson(gltfJson);
  if (sanitizedJson === gltfJson) {
    return null;
  }

  const encoder = new TextEncoder();
  const jsonBytes = encoder.encode(JSON.stringify(sanitizedJson));
  const paddedJsonLength = Math.ceil(jsonBytes.byteLength / 4) * 4;
  const restChunkStart = jsonChunkEnd;
  const nextByteLength =
    12 + 8 + paddedJsonLength + (source.byteLength - restChunkStart);
  const output = new Uint8Array(nextByteLength);
  output.set(source.subarray(0, 12), 0);
  const outputView = new DataView(output.buffer);
  outputView.setUint32(8, nextByteLength, true);
  outputView.setUint32(12, paddedJsonLength, true);
  outputView.setUint32(16, GLB_JSON_CHUNK_TYPE, true);
  output.fill(0x20, jsonChunkStart, jsonChunkStart + paddedJsonLength);
  output.set(jsonBytes, jsonChunkStart);
  output.set(
    source.subarray(restChunkStart),
    jsonChunkStart + paddedJsonLength
  );
  return output.buffer;
}

function shouldCorrectTerrainModelMaterials(uri) {
  const normalizedUri = normalizeModelUriForLookup(uri);
  return (
    MODEL_MATERIAL_CORRECTION_BY_URI.get(normalizedUri) ===
    "remove-uniform-white-emissive"
  );
}

function extractModelUrlForFetch(uri) {
  if (typeof uri === "string") {
    return uri;
  }

  if (typeof uri?.getUrlComponent === "function") {
    return uri.getUrlComponent(true);
  }

  if (typeof uri?.url === "string") {
    return uri.url;
  }

  return "";
}

export function resolveSanitizedTerrainModelUrl(uri) {
  if (
    typeof fetch !== "function" ||
    typeof Blob === "undefined" ||
    typeof URL === "undefined" ||
    typeof URL.createObjectURL !== "function" ||
    !shouldCorrectTerrainModelMaterials(uri)
  ) {
    return null;
  }

  const modelUrl = extractModelUrlForFetch(uri);
  if (!modelUrl) {
    return null;
  }

  const cacheKey = normalizeModelUriForLookup(modelUrl);
  const cachedValue = SANITIZED_MODEL_URL_CACHE.get(cacheKey);
  if (cachedValue) {
    return cachedValue;
  }

  const sanitizedUrlPromise = fetch(modelUrl)
    .then((response) => {
      if (!response.ok) {
        throw new Error(`Failed to fetch model ${modelUrl}`);
      }
      return response.arrayBuffer();
    })
    .then((arrayBuffer) => {
      const sanitizedBuffer =
        sanitizeTerrainGlbArrayBufferMaterials(arrayBuffer);
      if (!sanitizedBuffer) {
        return modelUrl;
      }
      return URL.createObjectURL(
        new Blob([sanitizedBuffer], { type: "model/gltf-binary" })
      );
    })
    .catch(() => modelUrl);

  SANITIZED_MODEL_URL_CACHE.set(cacheKey, sanitizedUrlPromise);
  return sanitizedUrlPromise;
}

export function resolveModelAxisCorrectionProfile(uri) {
  const normalizedUri = normalizeModelUriForLookup(uri);
  const convention = MODEL_AXIS_CORRECTION_BY_URI.get(normalizedUri);
  const loaderAxes = MODEL_LOADER_AXIS_BY_CONVENTION[convention];

  if (!convention || !loaderAxes) {
    return null;
  }

  return {
    nodeName: MODEL_ROOT_NODE_NAME,
    convention,
    upAxis: loaderAxes.upAxis,
    forwardAxis: loaderAxes.forwardAxis,
  };
}

export function resolveCesiumAxis(Cesium, axisName) {
  return Cesium?.Axis?.[axisName];
}

export function installTerrainModelAxisResolver(Cesium) {
  if (
    !Cesium?.Model?.fromGltfAsync ||
    !Cesium?.Axis ||
    Cesium.Model.__terrainAxisResolverInstalled === true
  ) {
    return;
  }

  const originalFromGltfAsync = Cesium.Model.fromGltfAsync;
  Cesium.Model.fromGltfAsync = function fromGltfAsyncWithTerrainAxes(
    options = {}
  ) {
    const sourceUri = options?.url ?? options?.gltf;
    const axisProfile = resolveModelAxisCorrectionProfile(sourceUri);
    const sanitizedUrl = resolveSanitizedTerrainModelUrl(sourceUri);
    const nextOptions = { ...options };

    if (axisProfile) {
      const upAxis = resolveCesiumAxis(Cesium, axisProfile.upAxis);
      const forwardAxis = resolveCesiumAxis(Cesium, axisProfile.forwardAxis);
      if (upAxis !== undefined && forwardAxis !== undefined) {
        nextOptions.upAxis = upAxis;
        nextOptions.forwardAxis = forwardAxis;
      }
    }

    if (sanitizedUrl) {
      return Promise.resolve(sanitizedUrl).then((url) => {
        const sanitizedOptions = {
          ...nextOptions,
          url,
        };
        delete sanitizedOptions.gltf;
        return originalFromGltfAsync.call(this, sanitizedOptions);
      });
    }

    return originalFromGltfAsync.call(this, nextOptions);
  };
  Cesium.Model.__terrainAxisResolverInstalled = true;
}

export function colorForSide(Cesium, sideColor, alpha = 1) {
  const normalized =
    typeof sideColor === "string" && sideColor.trim().length > 0
      ? sideColor.trim().toLowerCase()
      : "silver";
  const cssColor = SIDE_COLOR_MAP[normalized] ?? normalized;
  return Cesium.Color.fromCssColorString(cssColor).withAlpha(alpha);
}

export function cssColorForSide(sideColor) {
  const normalized =
    typeof sideColor === "string" && sideColor.trim().length > 0
      ? sideColor.trim().toLowerCase()
      : "silver";
  return SIDE_COLOR_MAP[normalized] ?? normalized;
}

export function isEnemyModelOutlineSide(sideColor) {
  const normalized =
    typeof sideColor === "string" && sideColor.trim().length > 0
      ? sideColor.trim().toLowerCase()
      : "";
  const cssColor = SIDE_COLOR_MAP[normalized] ?? normalized;
  return normalized === "red" || cssColor === SIDE_COLOR_MAP.red;
}

export function shouldRenderUnitSideColorOutline(unit, options = {}) {
  if (options?.showFriendlyModelOutlines !== false) {
    return true;
  }

  return isEnemyModelOutlineSide(unit?.sideColor);
}

export function resolveUnitModelFromProfileId(unit, renderContext) {
  const uri = UNIT_MODEL_URI_BY_ID[unit?.modelId];
  if (!uri || unit?.entityType === "airbase") {
    return null;
  }

  if (isGroundRenderUnit(unit) && !hasGroundModelBudget(renderContext)) {
    return null;
  }

  if (unit.entityType === "ship") {
    return {
      uri,
      scale:
        unit.modelId === "ship-submarine"
          ? UNIT_MODEL_SCALE_PRESET.ship.submarine
          : UNIT_MODEL_SCALE_PRESET.ship.default,
      minimumPixelSize: UNIT_MODEL_SCALE_PRESET.ship.minimumPixelSize,
      maximumScale: UNIT_MODEL_SCALE_PRESET.ship.maximumScale,
    };
  }

  if (unit.entityType === "aircraft") {
    const measuredScaleProfile = resolveUnitModelScaleProfile(
      unit?.modelId,
      uri
    );
    if (measuredScaleProfile) {
      return {
        uri,
        ...measuredScaleProfile,
      };
    }

    return {
      uri,
      scale:
        unit.modelId === "drone-animated" || unit.modelId === "drone-quad"
          ? UNIT_MODEL_SCALE_PRESET.aircraft.drone
          : UNIT_MODEL_SCALE_PRESET.aircraft.default,
      minimumPixelSize: UNIT_MODEL_SCALE_PRESET.aircraft.minimumPixelSize,
      maximumScale: UNIT_MODEL_SCALE_PRESET.aircraft.maximumScale,
    };
  }

  const measuredScaleProfile = resolveUnitModelScaleProfile(unit?.modelId, uri);
  if (measuredScaleProfile) {
    return {
      uri,
      ...measuredScaleProfile,
    };
  }

  return {
    uri,
    scale:
      unit.modelId === "artillery-patriot" ||
      unit.modelId === "artillery-nasams" ||
      unit.modelId === "artillery-thaad" ||
      unit.modelId === "artillery-hyunmoo"
        ? UNIT_MODEL_SCALE_PRESET.ground.launcher
        : UNIT_MODEL_SCALE_PRESET.ground.default,
    minimumPixelSize: UNIT_MODEL_SCALE_PRESET.ground.minimumPixelSize,
    maximumScale: UNIT_MODEL_SCALE_PRESET.ground.maximumScale,
  };
}

export function resolveUnitModel(unit, renderContext) {
  if (unit?.entityType === "airbase") {
    return null;
  }

  const resolvedByProfileId = resolveUnitModelFromProfileId(
    unit,
    renderContext
  );
  if (resolvedByProfileId) {
    return resolvedByProfileId;
  }

  const signature = buildPlacementSignature(unit);

  if (unit?.entityType === "aircraft") {
    const uri = findFirstMatchingModel(
      signature,
      AIRCRAFT_MODEL_MAP,
      DEFAULT_UNIT_MODEL.aircraft
    );
    const measuredScaleProfile = resolveUnitModelScaleProfile(
      unit?.modelId,
      uri
    );
    if (measuredScaleProfile) {
      return {
        uri,
        ...measuredScaleProfile,
      };
    }

    return {
      uri,
      scale: /\b(drone|uav|mq-|rq-)\b|드론|무인기/i.test(signature)
        ? UNIT_MODEL_SCALE_PRESET.aircraft.drone
        : UNIT_MODEL_SCALE_PRESET.aircraft.default,
      minimumPixelSize: UNIT_MODEL_SCALE_PRESET.aircraft.minimumPixelSize,
      maximumScale: UNIT_MODEL_SCALE_PRESET.aircraft.maximumScale,
    };
  }

  if (unit?.entityType === "ship") {
    const uri = findFirstMatchingModel(
      signature,
      SHIP_MODEL_MAP,
      DEFAULT_UNIT_MODEL.ship
    );
    return {
      uri,
      scale: /\b(submarine|ssn|sss|sub)\b/i.test(signature)
        ? UNIT_MODEL_SCALE_PRESET.ship.submarine
        : UNIT_MODEL_SCALE_PRESET.ship.default,
      minimumPixelSize: UNIT_MODEL_SCALE_PRESET.ship.minimumPixelSize,
      maximumScale: UNIT_MODEL_SCALE_PRESET.ship.maximumScale,
    };
  }

  if (isGroundRenderUnit(unit) && hasGroundModelBudget(renderContext)) {
    const uri = findFirstMatchingModel(
      signature,
      FACILITY_MODEL_MAP,
      DEFAULT_UNIT_MODEL.facility
    );
    const measuredScaleProfile = resolveUnitModelScaleProfile(
      unit?.modelId,
      uri
    );
    if (measuredScaleProfile) {
      return {
        uri,
        ...measuredScaleProfile,
      };
    }

    return {
      uri,
      scale: /\b(patriot|nasams|thaad|hyunmoo|launcher)\b/i.test(signature)
        ? UNIT_MODEL_SCALE_PRESET.ground.launcher
        : UNIT_MODEL_SCALE_PRESET.ground.default,
      minimumPixelSize: UNIT_MODEL_SCALE_PRESET.ground.minimumPixelSize,
      maximumScale: UNIT_MODEL_SCALE_PRESET.ground.maximumScale,
    };
  }

  return null;
}

export function resolveUnitModelHeightReference(Cesium, unit) {
  return isGroundRenderUnit(unit) || unit?.entityType === "aircraft"
    ? Cesium.HeightReference.RELATIVE_TO_GROUND
    : Cesium.HeightReference.NONE;
}

export function resolveUnitOverlayHeightReference(Cesium, unit) {
  if (isGroundRenderUnit(unit)) {
    return Cesium.HeightReference.CLAMP_TO_GROUND;
  }

  return unit?.entityType === "aircraft"
    ? Cesium.HeightReference.RELATIVE_TO_GROUND
    : Cesium.HeightReference.NONE;
}

export function isPointInsideBounds(point, bounds) {
  const longitude = Number(point?.longitude);
  const latitude = Number(point?.latitude);

  return (
    Number.isFinite(longitude) &&
    Number.isFinite(latitude) &&
    longitude >= bounds.west &&
    longitude <= bounds.east &&
    latitude >= bounds.south &&
    latitude <= bounds.north
  );
}

export function normalizeFixedTargetMarkerLabel(value) {
  const label = `${value ?? ""}`.trim().toUpperCase();
  if (/^[1-9]$/.test(label) || label === "I" || label === "T") {
    return label;
  }
  return null;
}

export function resolveFixedTargetReferenceLabel(referencePoint) {
  const id = `${referencePoint?.id ?? ""}`.toLowerCase();
  const idMatch = id.match(/(?:^|[-_])target[-_](\d|i|t)(?:$|[-_])/);
  if (idMatch) {
    return idMatch[1].toUpperCase();
  }

  const name = `${referencePoint?.name ?? ""}`;
  const numberMatch = name.match(/([1-9])\s*번/);
  if (numberMatch) {
    return numberMatch[1];
  }

  const letterMatch = name.match(/\b([it])\s*자/i);
  return letterMatch ? letterMatch[1].toUpperCase() : null;
}

export function isFixedTargetReferenceCoveredByGroundMarker(
  referencePoint,
  groundMarkers
) {
  const referenceLabel = resolveFixedTargetReferenceLabel(referencePoint);
  if (!referenceLabel || !Array.isArray(groundMarkers)) {
    return false;
  }

  return groundMarkers.some(
    (marker) =>
      normalizeFixedTargetMarkerLabel(marker?.label) === referenceLabel
  );
}

export function buildUnitDescription(unit, displayPoint) {
  return [
    `<strong>${escapeHtml(unit?.name ?? "이름 없음")}</strong>`,
    `${escapeHtml(unit?.sideName ?? "세력 없음")} · ${escapeHtml(
      unit?.className ?? unit?.entityType ?? "unknown"
    )}`,
    `위도 ${escapeHtml(Number(unit?.latitude || 0).toFixed(5))} / 경도 ${escapeHtml(
      Number(unit?.longitude || 0).toFixed(5)
    )}`,
    `표시 고도 ${escapeHtml(formatMeters(Math.max(0, Number(displayPoint?.altitudeMeters) || 0)))}`,
    `방위 ${escapeHtml(String(Math.round(normalizeHeading(unit?.headingDeg))))}°`,
  ].join("<br/>");
}

export function resolveHeadingOrientation(Cesium, point, headingDeg) {
  const position = Cesium.Cartesian3.fromDegrees(
    Number(point?.longitude) || 0,
    Number(point?.latitude) || 0,
    Math.max(0, Number(point?.altitudeMeters) || 0)
  );
  const hpr = new Cesium.HeadingPitchRoll(
    Cesium.Math.toRadians(normalizeHeading(headingDeg || 0)),
    0,
    0
  );

  return Cesium.Transforms.headingPitchRollQuaternion(position, hpr);
}

export function resolveModelHeadingOffsetDeg(model) {
  const axisProfile = resolveModelAxisCorrectionProfile(model?.uri);
  return axisProfile?.forwardAxis === "Y" ? -90 : 0;
}

export function resolveUnitModelHeadingDeg(unit, model) {
  return normalizeHeading(
    (Number(unit?.headingDeg) || 0) + resolveModelHeadingOffsetDeg(model)
  );
}

export function createPlacementLabel(
  Cesium,
  unit,
  emphasized,
  labelDistance,
  routeGroupState = null
) {
  const routeProfile =
    unit?.entityType === "aircraft"
      ? resolveAircraftRouteVisualProfile(unit, [], routeGroupState)
      : null;
  const compactSwarmLabel =
    routeProfile?.compactUnitLabel === true && emphasized !== true;
  const groundUnit = isGroundRenderUnit(unit);
  const labelName = truncateText(
    unit?.name ?? unit?.className ?? "이름 없음",
    emphasized ? 34 : 24
  );
  const labelText = compactSwarmLabel
    ? routeProfile?.groupLead
      ? "선두"
      : "군집"
    : groundUnit && emphasized
      ? `${labelName}\n${Math.round(normalizeHeading(unit?.headingDeg))}° · ${
          unit?.className ?? unit?.entityType ?? "지상자산"
        }`
      : labelName;

  return {
    text: labelText,
    scale: emphasized ? 0.74 : compactSwarmLabel ? 0.46 : 0.6,
    showBackground: true,
    backgroundColor: colorForSide(
      Cesium,
      unit?.sideColor,
      groundUnit
        ? emphasized
          ? 0.34
          : 0.18
        : emphasized
          ? 0.24
          : compactSwarmLabel
            ? 0.08
            : 0.12
    ),
    fillColor: Cesium.Color.WHITE.withAlpha(
      emphasized ? 1 : compactSwarmLabel ? 0.8 : 0.94
    ),
    outlineColor: Cesium.Color.BLACK.withAlpha(emphasized ? 0.86 : 0.64),
    outlineWidth: emphasized ? 3 : 2,
    style: Cesium.LabelStyle.FILL_AND_OUTLINE,
    font: emphasized
      ? "700 30px Bahnschrift, sans-serif"
      : compactSwarmLabel
        ? "700 18px Bahnschrift, sans-serif"
        : "600 24px Bahnschrift, sans-serif",
    heightReference: resolveUnitOverlayHeightReference(Cesium, unit),
    disableDepthTestDistance:
      emphasized || isGroundRenderUnit(unit) ? Number.POSITIVE_INFINITY : 0,
    pixelOffset: new Cesium.Cartesian2(
      0,
      groundUnit
        ? emphasized
          ? -58
          : -38
        : emphasized
          ? -42
          : compactSwarmLabel
            ? -20
            : -28
    ),
    scaleByDistance: new Cesium.NearFarScalar(
      2500,
      emphasized ? 1.04 : 0.98,
      labelDistance,
      emphasized ? 0.84 : compactSwarmLabel ? 0.52 : 0.72
    ),
    distanceDisplayCondition: new Cesium.DistanceDisplayCondition(
      0,
      compactSwarmLabel ? labelDistance * 0.54 : labelDistance
    ),
    verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
  };
}

export function createUnitPointGraphics(Cesium, unit, emphasized) {
  return {
    pixelSize: emphasized ? 18 : isGroundRenderUnit(unit) ? 14 : 12,
    color: colorForSide(Cesium, unit?.sideColor, 0.95),
    outlineColor: Cesium.Color.BLACK.withAlpha(0.72),
    outlineWidth: emphasized ? 3 : 2,
    heightReference: resolveUnitOverlayHeightReference(Cesium, unit),
    disableDepthTestDistance:
      emphasized || isGroundRenderUnit(unit) ? Number.POSITIVE_INFINITY : 0,
  };
}

export function isDroneLikePlacementUnit(unit) {
  return /\b(drone|uav|mq-|rq-|reaper|predator|global hawk|shahed|shahid|loitering|munition|suicide)\b|자폭|드론|무인기/i.test(
    buildPlacementSignature(unit)
  );
}

export function isLoiteringMunitionPlacementUnit(unit) {
  return /\b(shahed|shahid|loitering|munition|suicide|one-way|kamikaze|fpv|자폭|배회)\b/i.test(
    buildPlacementSignature(unit)
  );
}

export function isSwarmDronePlacementUnit(unit) {
  return /\b(swarm|formation|drone wave|drone cell)\b|군집|편대|드론군/i.test(
    buildPlacementSignature(unit)
  );
}

export function resolveGroundUnitVisualKind(unit, model) {
  const signature = [buildPlacementSignature(unit), unit?.modelId, model?.uri]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  const modelId = `${unit?.modelId ?? ""}`.toLowerCase();

  if (
    /\b(biho|chaparral|pegasus|cheongung|km-sam|m-sam|anti-air|air defense|point defense)\b/i.test(
      signature
    ) ||
    /(비호|천마|천궁|방공|대공)/i.test(signature)
  ) {
    return "air-defense";
  }

  if (
    modelId.includes("artillery-k9") ||
    /\b(k9|m109|paladin|howitzer|d-30|self-propelled)\b/i.test(signature) ||
    /(자주포|곡사|포병|화포)/i.test(signature)
  ) {
    return "artillery";
  }

  if (
    modelId.startsWith("artillery-") ||
    /\b(patriot|nasams|thaad|l-sam|hyunmoo|chunmoo|launcher|launch vehicle|mlrs|rocket|missile|roketsan)\b/i.test(
      signature
    ) ||
    /(현무|천무|발사대|다연장|로켓|유도탄)/i.test(signature)
  ) {
    return "launcher";
  }

  if (
    modelId.startsWith("tank-") ||
    /\b(tank|armor|tracked|stryker|apc|m113|m577|km900|k2|k21|k808|kaav|m-atv|matv|armored)\b/i.test(
      signature
    ) ||
    /(전차|장갑차|기갑|궤도)/i.test(signature)
  ) {
    return "armor";
  }

  return "ground";
}

export function resolveUnitMarkerShape(unit) {
  if (unit?.entityType === "aircraft") {
    return isDroneLikePlacementUnit(unit) ? "drone" : "aircraft";
  }

  if (unit?.entityType === "ship") {
    return "ship";
  }

  if (isGroundRenderUnit(unit)) {
    return resolveGroundUnitVisualKind(unit);
  }

  return "unit";
}

export function resolveUnitMarkerPixelSize(unit, emphasized = false) {
  const shape = resolveUnitMarkerShape(unit);

  if (emphasized) {
    return shape === "aircraft"
      ? 48
      : shape === "drone"
        ? 44
        : shape === "artillery" || shape === "launcher"
          ? 56
          : shape === "air-defense" || shape === "armor"
            ? 52
            : 38;
  }

  return shape === "aircraft"
    ? 38
    : shape === "drone"
      ? 36
      : shape === "artillery" || shape === "launcher"
        ? 46
        : shape === "air-defense" || shape === "armor"
          ? 42
          : 30;
}

export function drawRoundedRectPath(context, x, y, width, height, radius) {
  const safeRadius = Math.max(0, Math.min(radius, width * 0.5, height * 0.5));
  context.moveTo(x + safeRadius, y);
  context.lineTo(x + width - safeRadius, y);
  context.quadraticCurveTo(x + width, y, x + width, y + safeRadius);
  context.lineTo(x + width, y + height - safeRadius);
  context.quadraticCurveTo(
    x + width,
    y + height,
    x + width - safeRadius,
    y + height
  );
  context.lineTo(x + safeRadius, y + height);
  context.quadraticCurveTo(x, y + height, x, y + height - safeRadius);
  context.lineTo(x, y + safeRadius);
  context.quadraticCurveTo(x, y, x + safeRadius, y);
}

export function drawUnitMarkerPath(context, shape, size) {
  const center = size * 0.5;

  context.beginPath();
  if (shape === "aircraft" || shape === "drone") {
    context.moveTo(center, size * 0.1);
    context.lineTo(size * 0.72, size * 0.78);
    context.lineTo(center, size * 0.64);
    context.lineTo(size * 0.28, size * 0.78);
    context.closePath();
    return;
  }

  if (shape === "ship") {
    context.moveTo(center, size * 0.12);
    context.lineTo(size * 0.78, size * 0.38);
    context.lineTo(size * 0.66, size * 0.84);
    context.lineTo(size * 0.34, size * 0.84);
    context.lineTo(size * 0.22, size * 0.38);
    context.closePath();
    return;
  }

  if (shape === "armor") {
    context.rect(size * 0.18, size * 0.26, size * 0.64, size * 0.42);
    return;
  }

  if (shape === "artillery") {
    drawRoundedRectPath(
      context,
      size * 0.18,
      size * 0.36,
      size * 0.64,
      size * 0.34,
      size * 0.08
    );
    return;
  }

  if (shape === "launcher") {
    drawRoundedRectPath(
      context,
      size * 0.2,
      size * 0.28,
      size * 0.6,
      size * 0.44,
      size * 0.08
    );
    return;
  }

  if (shape === "air-defense") {
    context.arc(center, center, size * 0.28, 0, Math.PI * 2);
    return;
  }

  context.rect(size * 0.26, size * 0.26, size * 0.48, size * 0.48);
}

export function getUnitMarkerImage(unit, emphasized) {
  if (typeof document === "undefined") {
    return "";
  }

  const shape = resolveUnitMarkerShape(unit);
  const color = cssColorForSide(unit?.sideColor);
  const key = `${shape}|${color}|${emphasized ? "hot" : "normal"}`;
  const cachedImage = UNIT_MARKER_IMAGE_CACHE.get(key);
  if (cachedImage) {
    return cachedImage;
  }

  const canvas = document.createElement("canvas");
  canvas.width = UNIT_MARKER_IMAGE_SIZE;
  canvas.height = UNIT_MARKER_IMAGE_SIZE;
  const context = canvas.getContext("2d");
  if (!context) {
    return "";
  }

  const size = UNIT_MARKER_IMAGE_SIZE;
  context.clearRect(0, 0, size, size);
  context.shadowColor = "rgba(0, 0, 0, 0.72)";
  context.shadowBlur = emphasized ? 10 : 7;
  context.shadowOffsetY = 2;
  context.lineJoin = "round";
  context.lineCap = "round";
  drawUnitMarkerPath(context, shape, size);
  context.fillStyle = color;
  context.globalAlpha = emphasized ? 0.96 : 0.84;
  context.fill();
  context.globalAlpha = 1;
  context.lineWidth = emphasized ? 7 : 5;
  context.strokeStyle = emphasized
    ? "rgba(255, 255, 255, 0.96)"
    : "rgba(1, 9, 14, 0.9)";
  context.stroke();

  if (shape === "drone") {
    context.shadowBlur = 0;
    context.fillStyle = "rgba(236, 255, 251, 0.92)";
    [
      [size * 0.26, size * 0.3],
      [size * 0.74, size * 0.3],
      [size * 0.26, size * 0.72],
      [size * 0.74, size * 0.72],
    ].forEach(([x, y]) => {
      context.beginPath();
      context.arc(x, y, emphasized ? 4.8 : 3.8, 0, Math.PI * 2);
      context.fill();
    });
  }

  if (shape === "armor") {
    context.shadowBlur = 0;
    context.strokeStyle = "rgba(236, 255, 251, 0.94)";
    context.lineWidth = emphasized ? 4 : 3;
    context.beginPath();
    context.moveTo(size * 0.3, size * 0.47);
    context.lineTo(size * 0.7, size * 0.47);
    context.moveTo(size * 0.5, size * 0.47);
    context.lineTo(size * 0.5, size * 0.18);
    context.stroke();
  }

  if (shape === "artillery" || shape === "launcher") {
    context.shadowBlur = 0;
    context.strokeStyle = "rgba(255, 232, 168, 0.96)";
    context.lineWidth = emphasized ? 4 : 3;
    context.beginPath();
    if (shape === "artillery") {
      context.moveTo(size * 0.28, size * 0.54);
      context.lineTo(size * 0.72, size * 0.54);
      context.moveTo(size * 0.5, size * 0.36);
      context.lineTo(size * 0.5, size * 0.12);
    } else {
      context.moveTo(size * 0.35, size * 0.36);
      context.lineTo(size * 0.72, size * 0.18);
      context.moveTo(size * 0.42, size * 0.52);
      context.lineTo(size * 0.76, size * 0.34);
    }
    context.stroke();
  }

  if (shape === "air-defense") {
    context.shadowBlur = 0;
    context.strokeStyle = "rgba(236, 255, 251, 0.96)";
    context.lineWidth = emphasized ? 4 : 3;
    context.beginPath();
    context.arc(size * 0.5, size * 0.5, size * 0.2, Math.PI, 0);
    context.moveTo(size * 0.5, size * 0.5);
    context.lineTo(size * 0.5, size * 0.16);
    context.stroke();
  }

  const image = canvas.toDataURL("image/png");
  UNIT_MARKER_IMAGE_CACHE.set(key, image);
  return image;
}

export function createUnitBillboardGraphics(
  Cesium,
  unit,
  emphasized,
  labelDistance,
  options = {}
) {
  if (!shouldRenderUnitSideColorOutline(unit, options)) {
    return undefined;
  }

  const image = getUnitMarkerImage(unit, emphasized);
  const pixelSize = resolveUnitMarkerPixelSize(unit, emphasized);

  if (!image) {
    return undefined;
  }

  return {
    image,
    width: pixelSize,
    height: pixelSize,
    heightReference: resolveUnitOverlayHeightReference(Cesium, unit),
    disableDepthTestDistance: Number.POSITIVE_INFINITY,
    pixelOffset: new Cesium.Cartesian2(0, emphasized ? -10 : -6),
    scaleByDistance: new Cesium.NearFarScalar(
      2500,
      emphasized ? 1.12 : 1,
      labelDistance,
      emphasized ? 0.94 : 0.82
    ),
    distanceDisplayCondition: new Cesium.DistanceDisplayCondition(
      0,
      Number.POSITIVE_INFINITY
    ),
    verticalOrigin: Cesium.VerticalOrigin.CENTER,
  };
}

export function isLauncherLikePlacementUnit(unit, model) {
  const modelId = `${unit?.modelId ?? ""}`.toLowerCase();
  const modelUri = `${model?.uri ?? ""}`.toLowerCase();
  const signature = buildPlacementSignature(unit);

  return (
    modelId.includes("patriot") ||
    modelId.includes("chaparral") ||
    modelId.includes("nasams") ||
    modelId.includes("thaad") ||
    modelId.includes("hyunmoo") ||
    modelUri.includes("m48_chaparral") ||
    modelUri.includes("/3d-bundles/artillery/models/") ||
    /\b(patriot|nasams|thaad|l-sam|km-sam|m-sam|cheongung|pegasus|biho|hyunmoo|chunmoo|launcher|mlrs|missile|천궁|천마|비호)\b/i.test(
      signature
    )
  );
}

export function isTankLikePlacementModel(unit, model) {
  const modelId = `${unit?.modelId ?? ""}`.toLowerCase();
  const modelUri = `${model?.uri ?? ""}`.toLowerCase();
  const signature = buildPlacementSignature(unit);

  return (
    modelId.startsWith("tank-") ||
    modelUri.includes("/3d-bundles/tank/models/") ||
    modelUri.includes("m1150_abv") ||
    modelUri.includes("mini_dron_ugv") ||
    modelUri.includes("oshkosh_m-atv") ||
    /\b(tank|armor|tracked|stryker|apc|m113|m577|km900|k2|k21|k808|kaav|ugv|rcws|m-atv|matv|miclic|abv)\b/i.test(
      signature
    )
  );
}

export function isBreacherLikePlacementModel(unit, model) {
  const modelId = `${unit?.modelId ?? ""}`.toLowerCase();
  const modelUri = `${model?.uri ?? ""}`.toLowerCase();
  const signature = buildPlacementSignature(unit);

  return (
    modelId.includes("m1150") ||
    modelUri.includes("m1150_abv") ||
    /\b(abv|assault breacher|breacher|miclic|mine clearing|개척|장애물 개척)\b/i.test(
      signature
    )
  );
}

export function isPersonnelOrTargetPlacementModel(unit, model) {
  const modelId = `${unit?.modelId ?? ""}`.toLowerCase();
  const modelUri = `${model?.uri ?? ""}`.toLowerCase();
  const signature = buildPlacementSignature(unit);

  return (
    modelId.includes("personnel") ||
    modelId.includes("target-mannequin") ||
    modelId.includes("robotics-quadruped") ||
    modelUri.includes("/3d-bundles/personnel/") ||
    modelUri.includes("/3d-bundles/robotics/") ||
    modelUri.includes("target_mannequin") ||
    /\b(soldier|rifle team|mannequin|target dummy|quadruped|ground robot|robot dog|소총수|다족보행|마네킹)\b/i.test(
      signature
    )
  );
}

export function isCompactInfrastructurePlacementModel(unit, model) {
  const modelId = `${unit?.modelId ?? ""}`.toLowerCase();
  const modelUri = `${model?.uri ?? ""}`.toLowerCase();
  const signature = buildPlacementSignature(unit);

  return (
    modelId === "infrastructure-tent" ||
    modelUri.includes("military_tent_hangar") ||
    /\b(tent|지휘소 텐트|command post tent)\b/i.test(signature)
  );
}

export function resolveGroundUnitVisualProfile(
  unit,
  model,
  emphasized = false
) {
  if (!isGroundRenderUnit(unit)) {
    return null;
  }

  const kind = resolveGroundUnitVisualKind(unit, model);
  const focusScale = emphasized ? 1.18 : 1;
  const breacherLike = isBreacherLikePlacementModel(unit, model);
  const compactInfrastructure = isCompactInfrastructurePlacementModel(
    unit,
    model
  );
  const combatScale = breacherLike
    ? 0.184
    : compactInfrastructure
      ? 0.36
      : kind === "artillery" || kind === "launcher"
        ? 1.12
        : kind === "air-defense"
          ? 1.05
          : 1;
  const baseScale = focusScale * combatScale;
  const launchCapable =
    kind === "artillery" || kind === "launcher" || kind === "air-defense";

  return {
    kind,
    launchCapable,
    shadowMajorAxisMeters:
      (breacherLike
        ? 18
        : kind === "artillery"
          ? 26
          : kind === "launcher"
            ? 28
            : kind === "air-defense"
              ? 22
              : kind === "armor"
                ? 23
                : 18) * baseScale,
    shadowMinorAxisMeters:
      (breacherLike
        ? 9
        : kind === "artillery"
          ? 13
          : kind === "launcher"
            ? 14
            : kind === "air-defense"
              ? 12
              : kind === "armor"
                ? 12
                : 10) * baseScale,
    shadowAlpha: emphasized ? 0.42 : 0.3,
    selectionRingRadiusMeters:
      (breacherLike
        ? 30
        : kind === "artillery" || kind === "launcher"
          ? 42
          : kind === "air-defense"
            ? 36
            : kind === "armor"
              ? 34
              : 28) *
      (breacherLike || compactInfrastructure ? baseScale : focusScale),
    hullBackMeters:
      (breacherLike
        ? 11
        : kind === "artillery" || kind === "launcher"
          ? 17
          : 13) * baseScale,
    hullForwardMeters:
      (breacherLike
        ? 14
        : kind === "artillery" || kind === "launcher"
          ? 22
          : 16) * baseScale,
    barrelForwardMeters:
      (breacherLike
        ? 18
        : kind === "artillery"
          ? 42
          : kind === "launcher"
            ? 36
            : kind === "air-defense"
              ? 26
              : kind === "armor"
                ? 28
                : 16) * baseScale,
    bodyLineWidth: breacherLike
      ? emphasized
        ? 1.2
        : 0.9
      : emphasized
        ? 5.4
        : 3.8,
    barrelLineWidth: breacherLike
      ? emphasized
        ? 1
        : 0.8
      : kind === "artillery" || kind === "launcher"
        ? emphasized
          ? 5
          : 3.6
        : emphasized
          ? 4.2
          : 3,
    routeWidth: breacherLike
      ? emphasized
        ? 1.2
        : 0.9
      : emphasized
        ? 5.8
        : 4.2,
    dustWidth:
      (breacherLike
        ? 84
        : kind === "armor" || kind === "artillery"
          ? 112
          : 92) * baseScale,
    dustHeight:
      (breacherLike ? 40 : kind === "armor" || kind === "artillery" ? 58 : 48) *
      baseScale,
    dustBackOffsetMeters:
      (breacherLike
        ? 12
        : kind === "artillery" || kind === "launcher"
          ? 18
          : 14) * baseScale,
    muzzleForwardOffsetMeters:
      (breacherLike
        ? 14
        : kind === "artillery"
          ? 34
          : kind === "launcher"
            ? 32
            : kind === "air-defense"
              ? 20
              : 22) * baseScale,
    muzzleAltitudeMeters: breacherLike
      ? 0.9
      : kind === "artillery"
        ? 7.5
        : kind === "launcher"
          ? 8.5
          : kind === "air-defense"
            ? 6.5
            : 4.8,
    launchFlashSize: breacherLike
      ? 14
      : kind === "artillery"
        ? 118
        : kind === "launcher"
          ? 126
          : 84,
    launchSmokeSize: breacherLike
      ? 17
      : kind === "artillery"
        ? 132
        : kind === "launcher"
          ? 148
          : 104,
  };
}

export function resolveGroundUnitMovementVisualState(unit) {
  const speedKts = Math.max(
    0,
    Number(unit?.speedKts ?? unit?.speed ?? unit?.groundSpeedKts) || 0
  );
  const routePointCount =
    (Array.isArray(unit?.desiredRoute) ? unit.desiredRoute.length : 0) ||
    (Array.isArray(unit?.route) ? unit.route.length : 0);
  const statusSignature = Array.isArray(unit?.statusFlags)
    ? unit.statusFlags.join(" ").toLowerCase()
    : "";
  const moving =
    isGroundRenderUnit(unit) &&
    (speedKts > 1.2 ||
      routePointCount > 0 ||
      /(\bmoving\b|\bmaneuver\b|\badvancing\b|\brelocating\b|\broute\b|기동|이동|진출|재배치)/i.test(
        statusSignature
      ));

  return {
    moving,
    speedKts,
    routePointCount,
  };
}

export function resolveUnitProxyDimensions(unit, model, emphasized = false) {
  const focusScale = emphasized ? 1.32 : 1;

  if (unit?.entityType === "aircraft") {
    const droneLike = isDroneLikePlacementUnit(unit);
    return {
      x: (droneLike ? 170 : 280) * focusScale,
      y: (droneLike ? 120 : 340) * focusScale,
      z: (droneLike ? 26 : 46) * focusScale,
    };
  }

  if (unit?.entityType === "ship") {
    return {
      x: 90 * focusScale,
      y: 280 * focusScale,
      z: 34 * focusScale,
    };
  }

  if (isLauncherLikePlacementUnit(unit, model)) {
    return {
      x: 28 * focusScale,
      y: 48 * focusScale,
      z: 16 * focusScale,
    };
  }

  if (isTankLikePlacementModel(unit, model)) {
    return {
      x: 24 * focusScale,
      y: 38 * focusScale,
      z: 13 * focusScale,
    };
  }

  if (isPersonnelOrTargetPlacementModel(unit, model)) {
    return {
      x: 8 * focusScale,
      y: 8 * focusScale,
      z: 4 * focusScale,
    };
  }

  return {
    x: 30 * focusScale,
    y: 34 * focusScale,
    z: 14 * focusScale,
  };
}

export function createUnitProxyBoxGraphics(
  Cesium,
  unit,
  model,
  emphasized,
  options = {}
) {
  const dimensions = resolveUnitProxyDimensions(unit, model, emphasized);
  const alpha = unit?.entityType === "aircraft" ? 0.7 : 0.62;
  const sideColorOutlineEnabled = shouldRenderUnitSideColorOutline(
    unit,
    options
  );

  return {
    dimensions: new Cesium.Cartesian3(dimensions.x, dimensions.y, dimensions.z),
    material: sideColorOutlineEnabled
      ? colorForSide(Cesium, unit?.sideColor, emphasized ? 0.88 : alpha)
      : Cesium.Color.WHITE.withAlpha(alpha),
    outline: true,
    outlineColor: emphasized
      ? Cesium.Color.WHITE.withAlpha(0.96)
      : sideColorOutlineEnabled
        ? colorForSide(Cesium, unit?.sideColor, 0.88)
        : Cesium.Color.WHITE.withAlpha(0.38),
    heightReference: resolveUnitModelHeightReference(Cesium, unit),
    distanceDisplayCondition: new Cesium.DistanceDisplayCondition(
      0,
      Number.POSITIVE_INFINITY
    ),
  };
}

export function shouldRenderUnitModel(unit, model, emphasized = false) {
  if (!model) {
    return false;
  }

  if (TERRAIN_UNIT_MODEL_MODE === "focused-only") {
    return emphasized || unit?.selected === true;
  }

  return true;
}

export function resolveUnitModelScreenSizing(unit, model, emphasized) {
  const focusedGroundUnit = emphasized && isGroundRenderUnit(unit);
  const focusedShip = emphasized && unit?.entityType === "ship";
  const aircraftUnit = unit?.entityType === "aircraft";
  const overviewGroundUnit = !emphasized && isGroundRenderUnit(unit);
  const overviewShip = !emphasized && unit?.entityType === "ship";
  const droneLike = isDroneLikePlacementUnit(unit);
  const breacherLike = isBreacherLikePlacementModel(unit, model);
  const compactInfrastructure = isCompactInfrastructurePlacementModel(
    unit,
    model
  );
  const aircraftScaleBoost = unit?.entityType === "aircraft" ? 2 : 1;
  const tankLike = isTankLikePlacementModel(unit, model);
  const tankScaleBoost = breacherLike ? 1 : tankLike ? 2.4 : 1;
  const scaleBoost = Math.max(aircraftScaleBoost, tankScaleBoost);
  const enlargedModel = scaleBoost > 1;
  const baseScale = Number(model?.scale) || 1;
  const baseMinimumPixelSize = Number(model?.minimumPixelSize) || 0;
  const baseMaximumScale = Number(model?.maximumScale) || 1;
  let minimumPixelSize = baseMinimumPixelSize;
  let maximumScale = baseMaximumScale;

  if (focusedGroundUnit) {
    minimumPixelSize = Math.max(
      baseMinimumPixelSize * scaleBoost,
      breacherLike ? 2 : compactInfrastructure ? 18 : tankLike ? 96 : 72
    );
    maximumScale = Math.max(
      baseMaximumScale * scaleBoost,
      breacherLike ? 4 : compactInfrastructure ? 12 : tankLike ? 210 : 140
    );
  } else if (focusedShip) {
    minimumPixelSize = Math.max(baseMinimumPixelSize, 84);
    maximumScale = Math.max(baseMaximumScale, 128);
  } else if (aircraftUnit) {
    minimumPixelSize = Math.max(
      baseMinimumPixelSize * scaleBoost,
      droneLike ? 52 : 42
    );
    maximumScale = Math.max(
      baseMaximumScale * scaleBoost,
      droneLike ? 128 : 96
    );
  } else if (overviewGroundUnit) {
    minimumPixelSize = Math.max(
      baseMinimumPixelSize * scaleBoost,
      breacherLike ? 2 : compactInfrastructure ? 10 : tankLike ? 44 : 26
    );
    maximumScale = Math.max(
      baseMaximumScale * scaleBoost,
      breacherLike ? 3 : compactInfrastructure ? 8 : tankLike ? 132 : 72
    );
  } else if (overviewShip) {
    minimumPixelSize = Math.max(baseMinimumPixelSize, 32);
    maximumScale = Math.max(baseMaximumScale, 96);
  } else if (enlargedModel) {
    minimumPixelSize = Math.max(
      baseMinimumPixelSize * scaleBoost,
      breacherLike ? 2 : 22
    );
    maximumScale = Math.max(
      baseMaximumScale * scaleBoost,
      breacherLike ? 3 : 54
    );
  }

  return {
    scale: baseScale * scaleBoost,
    minimumPixelSize,
    maximumScale,
    enlargedModel,
  };
}

export function createUnitModelGraphics(
  Cesium,
  unit,
  model,
  emphasized,
  options = {}
) {
  const screenSizing = resolveUnitModelScreenSizing(unit, model, emphasized);
  const sideColorOutlineEnabled = shouldRenderUnitSideColorOutline(
    unit,
    options
  );
  const silhouetteEnabled = sideColorOutlineEnabled;
  const focusedSilhouetteColor = sideColorOutlineEnabled
    ? colorForSide(Cesium, unit?.sideColor, 0.72)
    : Cesium.Color.WHITE.withAlpha(0);
  const overviewSilhouetteColor = sideColorOutlineEnabled
    ? colorForSide(Cesium, unit?.sideColor, 0.5)
    : Cesium.Color.WHITE.withAlpha(0);

  const graphics = {
    uri: encodeURI(model.uri),
    show: true,
    scale: screenSizing.scale,
    minimumPixelSize: screenSizing.minimumPixelSize,
    maximumScale: screenSizing.maximumScale,
    incrementallyLoadTextures: true,
    runAnimations: true,
    clampAnimations: false,
    enableVerticalExaggeration: false,
    heightReference: resolveUnitModelHeightReference(Cesium, unit),
    silhouetteColor: emphasized
      ? focusedSilhouetteColor
      : overviewSilhouetteColor,
    silhouetteSize: silhouetteEnabled
      ? emphasized
        ? screenSizing.enlargedModel
          ? 1.6
          : 1.35
        : screenSizing.enlargedModel
          ? 1.4
          : 0.9
      : 0,
    distanceDisplayCondition: new Cesium.DistanceDisplayCondition(
      0,
      Number.POSITIVE_INFINITY
    ),
  };

  if (sideColorOutlineEnabled) {
    graphics.color = colorForSide(
      Cesium,
      unit?.sideColor,
      emphasized ? 0.9 : 0.82
    );
    graphics.colorBlendAmount = emphasized ? 0.05 : 0.14;
    if (Cesium?.ColorBlendMode?.MIX !== undefined) {
      graphics.colorBlendMode = Cesium.ColorBlendMode.MIX;
    }
  }

  return graphics;
}
