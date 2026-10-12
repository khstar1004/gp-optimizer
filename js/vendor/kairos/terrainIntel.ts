// @ts-nocheck
const EMPTY_FEATURE_COLLECTION = Object.freeze({
  type: "FeatureCollection",
  features: [],
});

const METERS_PER_DEGREE_LAT = 111320;
const OLLAMA_PROXY_PREFIX = "/api/ollama";

export const TERRAIN_INTEL_LAYER_DEFS = Object.freeze([
  {
    key: "river",
    label: "하천망",
    description: "수계, 도하 병목, 저지대 축선 확인",
    dataId: "LT_C_WKMSTRM",
    typeName: "lt_c_wkmstrm",
    style: {
      stroke: "#71d9ff",
      fill: "rgba(113, 217, 255, 0.18)",
      width: 2.4,
    },
    defaultEnabled: true,
    analysisRole: "water",
    geometryKind: "polygon",
  },
  {
    key: "road",
    label: "도로중심선",
    description: "기동 축선, 접근로, 보급로 확인",
    dataId: "LT_L_N3A0020000",
    typeName: "lt_l_n3a0020000",
    style: {
      stroke: "#ffd26d",
      fill: "rgba(255, 210, 109, 0.18)",
      width: 2.6,
    },
    defaultEnabled: true,
    analysisRole: "road",
    geometryKind: "line",
  },
  {
    key: "steep",
    label: "급경사재해예방",
    description: "차량 전개 제한 가능 지역",
    dataId: "LT_C_UP401",
    typeName: "lt_c_up401",
    style: {
      stroke: "#ff8b7c",
      fill: "rgba(255, 139, 124, 0.18)",
      width: 1.8,
    },
    defaultEnabled: true,
    analysisRole: "hazard",
    geometryKind: "polygon",
  },
  {
    key: "forest",
    label: "산림입지도",
    description: "은폐 가능성, 시야 차단 보조",
    dataId: "LT_C_FSDIFRSTS",
    typeName: "lt_c_fsdifrsts",
    style: {
      stroke: "#58d17e",
      fill: "rgba(88, 209, 126, 0.13)",
      width: 1.5,
    },
    defaultEnabled: true,
    analysisRole: "forest",
    geometryKind: "polygon",
  },
  {
    key: "drainage",
    label: "배수등급",
    description: "습윤 저지 가능성 보조 판단",
    dataId: "LT_C_ASITSOILDRA",
    typeName: "lt_c_asitsoildra",
    style: {
      stroke: "#5fd3c8",
      fill: "rgba(95, 211, 200, 0.12)",
      width: 1.4,
    },
    defaultEnabled: false,
    analysisRole: "drainage",
    geometryKind: "polygon",
  },
]);

export const OLLAMA_TERRAIN_REPORT_SCHEMA = Object.freeze({
  type: "object",
  additionalProperties: false,
  required: [
    "executiveSummary",
    "artilleryImplications",
    "maneuverImplications",
    "risks",
    "opportunities",
    "markerCallouts",
  ],
  properties: {
    executiveSummary: {
      type: "string",
    },
    artilleryImplications: {
      type: "array",
      minItems: 1,
      maxItems: 4,
      items: {
        type: "string",
      },
    },
    maneuverImplications: {
      type: "array",
      minItems: 1,
      maxItems: 4,
      items: {
        type: "string",
      },
    },
    risks: {
      type: "array",
      minItems: 1,
      maxItems: 5,
      items: {
        type: "string",
      },
    },
    opportunities: {
      type: "array",
      minItems: 1,
      maxItems: 5,
      items: {
        type: "string",
      },
    },
    markerCallouts: {
      type: "array",
      maxItems: 8,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["id", "title", "significance"],
        properties: {
          id: {
            type: "string",
          },
          title: {
            type: "string",
          },
          significance: {
            type: "string",
          },
        },
      },
    },
  },
});

export function getDefaultTerrainIntelSelection() {
  return TERRAIN_INTEL_LAYER_DEFS.reduce((selection, layerDef) => {
    selection[layerDef.key] = layerDef.defaultEnabled;
    return selection;
  }, {});
}

export function resolveTerrainIntelRuntimeConfig(runtimeConfig, searchParams) {
  const vworldDomain =
    getTrimmedString(runtimeConfig.vworldDomain) || getDefaultVworldDomain();
  const ollamaBaseUrl = resolveOllamaApiBaseUrl(runtimeConfig, searchParams);
  const ollamaVisionModel =
    getTrimmedString(searchParams.get("ollamaModel")) ||
    getTrimmedString(runtimeConfig.ollamaVisionModel);

  return {
    vworldApiKey: getTrimmedString(runtimeConfig.vworldApiKey),
    vworldDomain,
    ollamaBaseUrl,
    ollamaVisionModel,
  };
}

export function resolveOllamaApiBaseUrl(
  runtimeConfig,
  searchParams,
  locationLike = getBrowserLocation()
) {
  const explicitBaseUrl = getTrimmedString(searchParams.get("ollamaUrl"));
  if (explicitBaseUrl) {
    return sanitizeBaseUrl(explicitBaseUrl);
  }

  const configuredBaseUrl = getTrimmedString(runtimeConfig.ollamaBaseUrl);
  if (isSameOriginUrl(configuredBaseUrl, locationLike)) {
    return sanitizeBaseUrl(configuredBaseUrl);
  }

  const origin = getTrimmedString(locationLike?.origin);
  if (!origin) {
    return OLLAMA_PROXY_PREFIX;
  }

  return new URL(OLLAMA_PROXY_PREFIX, origin).toString();
}

export function extractOllamaModelNames(payload) {
  if (!payload || !Array.isArray(payload.models)) {
    return [];
  }

  return payload.models
    .map((model) => getTrimmedString(model?.name))
    .filter(Boolean);
}

export function isLikelyOllamaVisionModelName(modelName) {
  const normalizedName = getTrimmedString(modelName).toLowerCase();
  return [
    "bakllava",
    "gemma3",
    "granite3.2-vision",
    "llava",
    "llama3.2-vision",
    "minicpm-v",
    "moondream",
    "qwen2-vl",
    "qwen2.5-vl",
    "qwen-vl",
  ].some((keyword) => normalizedName.includes(keyword));
}

export function isLikelyOllamaEmbeddingModelName(modelName) {
  const normalizedName = getTrimmedString(modelName).toLowerCase();
  return (
    normalizedName.includes("embed") ||
    normalizedName.includes("embedding") ||
    normalizedName.includes("nomic-bert")
  );
}

function findInstalledOllamaModel(preferredName, modelNames) {
  if (!preferredName) {
    return "";
  }

  if (modelNames.includes(preferredName)) {
    return preferredName;
  }

  const preferredLatestName = preferredName.includes(":")
    ? preferredName
    : `${preferredName}:latest`;
  if (modelNames.includes(preferredLatestName)) {
    return preferredLatestName;
  }

  return "";
}

export function selectOllamaVisionModel(preferredModel, availableModels = []) {
  const preferredName = getTrimmedString(preferredModel);
  const modelNames = availableModels
    .map((modelName) => getTrimmedString(modelName))
    .filter(Boolean);

  if (modelNames.length === 0) {
    return preferredName;
  }

  const installedPreferredName = findInstalledOllamaModel(
    preferredName,
    modelNames
  );
  if (installedPreferredName) {
    return installedPreferredName;
  }

  return (
    modelNames.find(isLikelyOllamaVisionModelName) ??
    modelNames.find((modelName) => !isLikelyOllamaEmbeddingModelName(modelName)) ??
    modelNames[0]
  );
}

export async function loadTerrainIntelLayers({
  bounds,
  selectedLayerKeys,
  runtimeConfig,
}) {
  const activeDefs = TERRAIN_INTEL_LAYER_DEFS.filter((layerDef) =>
    selectedLayerKeys.includes(layerDef.key)
  );
  const layerResults = [];

  for (const layerDef of activeDefs) {
    try {
      const featureCollection = await fetchLayerFeatureCollection(
        layerDef,
        bounds,
        runtimeConfig
      );
      layerResults.push({
        key: layerDef.key,
        layerDef,
        status: "ready",
        featureCollection,
        featureCount: featureCollection.features.length,
      });
    } catch (error) {
      layerResults.push({
        key: layerDef.key,
        layerDef,
        status: "error",
        featureCollection: EMPTY_FEATURE_COLLECTION,
        featureCount: 0,
        errorMessage:
          error instanceof Error ? error.message : "알 수 없는 오류",
      });
    }
  }

  return layerResults;
}

export function buildTerrainIntelAnalysis({
  bounds,
  widthMeters,
  heightMeters,
  terrainSamples,
  layerResults,
}) {
  const featureCollections = new Map(
    layerResults
      .filter((result) => result.status === "ready")
      .map((result) => [result.key, result.featureCollection])
  );
  const center = {
    lon: (bounds.west + bounds.east) / 2,
    lat: (bounds.south + bounds.north) / 2,
  };
  const polygonLookup = {
    river: collectPolygonGeometries(featureCollections.get("river")),
    steep: collectPolygonGeometries(featureCollections.get("steep")),
    forest: collectPolygonGeometries(featureCollections.get("forest")),
    drainage: collectPolygonGeometries(featureCollections.get("drainage")),
  };
  const lineLookup = {
    river: collectLineGeometries(featureCollections.get("river")),
    road: collectLineGeometries(featureCollections.get("road")),
  };
  const enrichedSamples = terrainSamples.map((sample) =>
    enrichSample(sample, center.lat, polygonLookup, lineLookup)
  );
  const validSamples = enrichedSamples.filter((sample) =>
    Number.isFinite(sample.heightMeters)
  );
  const visibilitySamples = attachVisibilityMetrics(validSamples);
  const elevationValues = validSamples.map((sample) => sample.heightMeters);
  const slopeValues = validSamples
    .map((sample) => sample.slopeDegrees)
    .filter((value) => Number.isFinite(value));
  const minElevation =
    elevationValues.length > 0 ? Math.min(...elevationValues) : 0;
  const maxElevation =
    elevationValues.length > 0 ? Math.max(...elevationValues) : 0;
  const reliefMeters = maxElevation - minElevation;
  const meanElevation = calculateMean(elevationValues);
  const meanSlopeDegrees = calculateMean(slopeValues);
  const steepSampleRatio = calculateRatio(
    validSamples,
    (sample) => sample.slopeDegrees >= 15
  );
  const riverSampleRatio = calculateRatio(
    validSamples,
    (sample) => sample.nearWater
  );
  const roadSampleRatio = calculateRatio(
    validSamples,
    (sample) => sample.nearRoad
  );
  const forestSampleRatio = calculateRatio(
    validSamples,
    (sample) => sample.inForest
  );
  const hazardSampleRatio = calculateRatio(
    visibilitySamples,
    (sample) => sample.inHazard
  );
  const drainageSampleRatio = calculateRatio(
    visibilitySamples,
    (sample) => sample.inDrainage
  );
  const scoredSamples = scoreTerrainSamples(visibilitySamples, {
    minElevation,
    maxElevation,
    widthMeters,
    heightMeters,
  });
  const meanVisibilityRatio = calculateMean(
    scoredSamples.map((sample) => sample.visibilityRatio)
  );
  const meanExposureScore = calculateMean(
    scoredSamples.map((sample) => sample.exposureScore)
  );
  const meanConcealmentScore = calculateMean(
    scoredSamples.map((sample) => sample.concealmentScore)
  );
  const maxArtilleryScore = Math.max(
    0,
    ...scoredSamples.map((sample) => sample.artilleryScore)
  );
  const maxCrossingScore = Math.max(
    0,
    ...scoredSamples.map((sample) => sample.crossingPotentialScore)
  );
  const crossingIntersections = findRoadRiverIntersections(
    lineLookup.road,
    lineLookup.river,
    center.lat
  );
  const concealmentCells = buildConcealmentHeatmap(scoredSamples, bounds);
  const terrainClass = classifyTerrain(
    reliefMeters,
    meanSlopeDegrees,
    steepSampleRatio
  );
  const markers = buildTerrainMarkers(
    scoredSamples,
    widthMeters,
    heightMeters,
    {
      crossingIntersections,
      widthMeters,
      heightMeters,
    }
  );
  const firePlans = buildArtilleryFirePlans(
    markers,
    scoredSamples,
    widthMeters,
    heightMeters
  );
  const losSegments = buildLosSegments(firePlans);
  const topConcealmentCells = concealmentCells
    .filter((cell) => cell.dominantType === "concealment")
    .sort((left, right) => right.priorityScore - left.priorityScore)
    .slice(0, 6);
  const topExposureCells = concealmentCells
    .filter((cell) => cell.dominantType === "exposure")
    .sort((left, right) => right.priorityScore - left.priorityScore)
    .slice(0, 6);
  const engineBrief = buildEngineBrief({
    terrainClass,
    reliefMeters,
    meanSlopeDegrees,
    steepSampleRatio,
    riverSampleRatio,
    roadSampleRatio,
    forestSampleRatio,
    hazardSampleRatio,
    drainageSampleRatio,
    meanVisibilityRatio,
    meanExposureScore,
    meanConcealmentScore,
    maxArtilleryScore,
    maxCrossingScore,
    crossingIntersectionCount: crossingIntersections.length,
    firePlans,
    markers,
  });

  return {
    bounds,
    widthMeters,
    heightMeters,
    sampledPointCount: validSamples.length,
    minElevation,
    maxElevation,
    meanElevation,
    reliefMeters,
    meanSlopeDegrees,
    steepSampleRatio,
    riverSampleRatio,
    roadSampleRatio,
    forestSampleRatio,
    hazardSampleRatio,
    drainageSampleRatio,
    meanVisibilityRatio,
    meanExposureScore,
    meanConcealmentScore,
    maxArtilleryScore,
    maxCrossingScore,
    terrainClass,
    markers,
    firePlans,
    losSegments,
    concealmentCells,
    topConcealmentCells,
    topExposureCells,
    crossingIntersections,
    engineBrief,
    layerSummary: layerResults.map((result) => ({
      key: result.key,
      label: result.layerDef.label,
      featureCount: result.featureCount,
      status: result.status,
      errorMessage: result.errorMessage ?? null,
    })),
  };
}

export function enrichTerrainAnalysisWithRuntimeContext(
  analysis,
  runtimeSnapshot
) {
  if (!analysis || typeof analysis !== "object") {
    return analysis;
  }

  const runtimeContext = buildRuntimeAssetTerrainContext({
    bounds: analysis.bounds,
    units: runtimeSnapshot?.units,
    weapons: runtimeSnapshot?.weapons,
    selectedUnitId: runtimeSnapshot?.selectedUnitId,
    currentTime: runtimeSnapshot?.currentTime,
  });

  return {
    ...analysis,
    runtimeContext,
    assetRecommendations: buildAssetTerrainRecommendations({
      markers: analysis.markers,
      runtimeContext,
      widthMeters: analysis.widthMeters,
      heightMeters: analysis.heightMeters,
    }),
  };
}

export function buildRuntimeAssetTerrainContext({
  bounds,
  units = [],
  weapons = [],
  selectedUnitId = "",
  currentTime = null,
} = {}) {
  const safeBounds = isFiniteBounds(bounds) ? bounds : null;
  const selectedId = getTrimmedString(selectedUnitId);
  const visibleUnits = Array.isArray(units)
    ? units
        .map((unit, index) =>
          normalizeRuntimeUnitForTerrain(unit, index, safeBounds, selectedId)
        )
        .filter(Boolean)
    : [];
  const visibleWeapons = Array.isArray(weapons)
    ? weapons
        .map((weapon, index) =>
          normalizeRuntimeWeaponForTerrain(weapon, index, safeBounds)
        )
        .filter(Boolean)
    : [];
  const selectedUnit =
    visibleUnits.find((unit) => unit.selected) ??
    visibleUnits.find((unit) => unit.id === selectedId) ??
    null;

  return {
    hasContext: visibleUnits.length > 0 || visibleWeapons.length > 0,
    selectedUnitId: selectedId,
    selectedUnit,
    visibleUnits,
    visibleWeapons,
    unitCount: visibleUnits.length,
    weaponCount: visibleWeapons.length,
    sideCounts: countRuntimeAssetsBy(visibleUnits, "sideName"),
    roleCounts: countRuntimeAssetsBy(visibleUnits, "role"),
    referenceLatitude: safeBounds
      ? (safeBounds.south + safeBounds.north) / 2
      : selectedUnit?.lat,
    currentTime: Number.isFinite(Number(currentTime))
      ? Number(currentTime)
      : null,
  };
}

export function buildAssetTerrainRecommendations({
  markers = [],
  runtimeContext,
  widthMeters = 0,
  heightMeters = 0,
  limit = 6,
} = {}) {
  const visibleUnits = Array.isArray(runtimeContext?.visibleUnits)
    ? runtimeContext.visibleUnits
    : [];
  const terrainMarkers = Array.isArray(markers)
    ? markers.filter(
        (marker) =>
          marker &&
          Number.isFinite(Number(marker.lon)) &&
          Number.isFinite(Number(marker.lat))
      )
    : [];

  if (visibleUnits.length === 0 || terrainMarkers.length === 0) {
    return [];
  }

  const selectedUnits = visibleUnits.filter((unit) => unit.selected);
  const candidateUnits = [
    ...selectedUnits,
    ...visibleUnits.filter((unit) => !unit.selected),
  ].slice(0, 10);
  const referenceLatitude =
    Number(runtimeContext?.referenceLatitude) ||
    calculateMean(visibleUnits.map((unit) => unit.lat));
  const influenceRangeMeters = Math.max(
    900,
    Math.hypot(Number(widthMeters) || 0, Number(heightMeters) || 0) || 4000
  );
  const recommendations = [];
  const seenKeys = new Set();

  candidateUnits.forEach((unit) => {
    const preferredTypes = getPreferredMarkerTypesForRuntimeUnit(unit);
    const markerCandidates = preferredTypes
      .map((type) =>
        pickBestMarkerForRuntimeUnit({
          unit,
          markers: terrainMarkers.filter((marker) => marker.type === type),
          referenceLatitude,
          influenceRangeMeters,
          preferredTypes,
        })
      )
      .filter(Boolean);
    const fallbackMarker =
      markerCandidates.length > 0
        ? null
        : pickBestMarkerForRuntimeUnit({
            unit,
            markers: terrainMarkers,
            referenceLatitude,
            influenceRangeMeters,
            preferredTypes,
          });

    [...markerCandidates, fallbackMarker]
      .filter(Boolean)
      .slice(0, unit.selected ? 3 : 1)
      .forEach((candidate) => {
        const key = `${unit.id}:${candidate.marker.id}`;
        if (seenKeys.has(key)) {
          return;
        }
        seenKeys.add(key);

        recommendations.push(
          buildRuntimeAssetRecommendation({
            unit,
            marker: candidate.marker,
            distanceMeters: candidate.distanceMeters,
            priority: candidate.priority,
          })
        );
      });
  });

  return recommendations
    .sort((left, right) => {
      const selectedDelta =
        (right.selectedUnit === true ? 1 : 0) -
        (left.selectedUnit === true ? 1 : 0);
      if (selectedDelta !== 0) {
        return selectedDelta;
      }
      return right.priority - left.priority;
    })
    .slice(0, Math.max(1, Number(limit) || 6));
}

export function buildTerrainVlmPrompt(analysis, options = {}) {
  const includeScreenshotContext = options.includeScreenshotContext !== false;
  const runtimeContext = normalizeRuntimeContextForPrompt(
    analysis.runtimeContext
  );
  const structuredPayload = {
    bounds: roundObject(
      {
        west: analysis.bounds.west,
        south: analysis.bounds.south,
        east: analysis.bounds.east,
        north: analysis.bounds.north,
      },
      6
    ),
    areaKm: roundObject(
      {
        widthKm: analysis.widthMeters / 1000,
        heightKm: analysis.heightMeters / 1000,
      },
      2
    ),
    terrainMetrics: roundObject(
      {
        minElevation: analysis.minElevation,
        maxElevation: analysis.maxElevation,
        meanElevation: analysis.meanElevation,
        reliefMeters: analysis.reliefMeters,
        meanSlopeDegrees: analysis.meanSlopeDegrees,
        steepSampleRatio: analysis.steepSampleRatio,
        riverSampleRatio: analysis.riverSampleRatio,
        roadSampleRatio: analysis.roadSampleRatio,
        forestSampleRatio: analysis.forestSampleRatio,
        hazardSampleRatio: analysis.hazardSampleRatio,
        drainageSampleRatio: analysis.drainageSampleRatio,
        meanVisibilityRatio: analysis.meanVisibilityRatio,
        meanExposureScore: analysis.meanExposureScore,
        meanConcealmentScore: analysis.meanConcealmentScore,
        maxArtilleryScore: analysis.maxArtilleryScore,
        maxCrossingScore: analysis.maxCrossingScore,
      },
      3
    ),
    terrainClass: analysis.terrainClass,
    markers: analysis.markers.map((marker) => ({
      id: marker.id,
      type: marker.type,
      title: marker.title,
      reason: marker.reason,
      lon: round(marker.lon, 6),
      lat: round(marker.lat, 6),
      elevationMeters: round(marker.heightMeters, 1),
      slopeDegrees: round(marker.slopeDegrees, 1),
      score: round(marker.score ?? 0, 3),
      visibilityRatio: round(marker.visibilityRatio ?? 0, 3),
      concealmentScore: round(marker.concealmentScore ?? 0, 3),
    })),
    firePlans: analysis.firePlans.map((plan) => ({
      markerId: plan.markerId,
      recommendedMinRangeMeters: round(plan.recommendedMinRangeMeters, 0),
      recommendedMaxRangeMeters: round(plan.recommendedMaxRangeMeters, 0),
      openSectors: plan.openSectors.map((sector) => ({
        label: sector.label,
        visibleRatio: round(sector.visibleRatio, 3),
        distanceMeters: round(sector.distanceMeters, 0),
      })),
      blockedSectors: plan.blockedSectors.map((sector) => ({
        label: sector.label,
        visibleRatio: round(sector.visibleRatio, 3),
        distanceMeters: round(sector.distanceMeters, 0),
      })),
    })),
    topConcealmentCells: analysis.topConcealmentCells.map((cell) => ({
      rowIndex: cell.rowIndex,
      columnIndex: cell.columnIndex,
      concealmentScore: round(cell.concealmentScore, 3),
      exposureScore: round(cell.exposureScore, 3),
      centerLon: round(cell.centerLon, 6),
      centerLat: round(cell.centerLat, 6),
    })),
    topExposureCells: analysis.topExposureCells.map((cell) => ({
      rowIndex: cell.rowIndex,
      columnIndex: cell.columnIndex,
      concealmentScore: round(cell.concealmentScore, 3),
      exposureScore: round(cell.exposureScore, 3),
      centerLon: round(cell.centerLon, 6),
      centerLat: round(cell.centerLat, 6),
    })),
    crossingIntersections: analysis.crossingIntersections
      .slice(0, 8)
      .map((point) => ({
        lon: round(point.lon, 6),
        lat: round(point.lat, 6),
        score: round(point.score ?? 0, 3),
      })),
    runtimeContext,
    assetRecommendations: (analysis.assetRecommendations ?? [])
      .slice(0, 6)
      .map((recommendation) => ({
        unitId: recommendation.unitId,
        unitName: recommendation.unitName,
        unitType: recommendation.unitType,
        markerId: recommendation.markerId,
        markerType: recommendation.markerType,
        actionLabel: recommendation.actionLabel,
        distanceMeters: round(recommendation.distanceMeters, 0),
        priority: round(recommendation.priority, 3),
        summary: recommendation.summary,
      })),
    layers: analysis.layerSummary,
    engineBrief: analysis.engineBrief,
  };

  return [
    "You are a terrain intelligence analyst for indirect fire and maneuver planning.",
    includeScreenshotContext
      ? "Analyze the attached 3D terrain screenshot together with the structured GIS summary."
      : "Analyze the structured GIS summary generated from the 3D terrain engine.",
    "Use only the visible terrain and the provided structured data. Do not invent unseen features.",
    "The labeled markers were generated by the engine and should be referenced when useful.",
    "When runtimeContext and assetRecommendations are present, relate terrain effects to the live units inside the selected bbox.",
    "Focus on artillery siting, observation, line-of-sight, dead ground, concealment, crossing points, obstacle effects, approach corridors, and tactical risk.",
    "Respond in Korean and strictly follow the provided JSON schema.",
    "",
    "Structured GIS summary:",
    JSON.stringify(structuredPayload, null, 2),
  ].join("\n");
}

export function parseTerrainVlmReport(responseText) {
  try {
    const parsed = JSON.parse(responseText);
    if (parsed && typeof parsed === "object") {
      return parsed;
    }
  } catch (error) {
    console.warn("Failed to parse terrain report as JSON.", error);
  }

  return {
    executiveSummary: responseText.trim(),
    artilleryImplications: [],
    maneuverImplications: [],
    risks: [],
    opportunities: [],
    markerCallouts: [],
  };
}

function normalizeRuntimeUnitForTerrain(unit, index, bounds, selectedUnitId) {
  if (!unit || typeof unit !== "object") {
    return null;
  }

  const lon = getFirstFiniteNumber(unit.longitude, unit.lon);
  const lat = getFirstFiniteNumber(unit.latitude, unit.lat);
  if (
    !Number.isFinite(lon) ||
    !Number.isFinite(lat) ||
    (bounds && !isLonLatInsideBounds(lon, lat, bounds))
  ) {
    return null;
  }

  const id = getTrimmedString(unit.id) || `unit-${index + 1}`;
  const className = getTrimmedString(unit.className);
  const modelId = getTrimmedString(unit.modelId);
  const name = getTrimmedString(unit.name) || className || id;
  const signature = `${name} ${className} ${modelId}`;
  const entityType = normalizeRuntimeEntityType(unit.entityType, signature);
  const role = classifyRuntimeAssetRole(entityType, signature);
  const selected =
    unit.selected === true || (!!selectedUnitId && id === selectedUnitId);

  return {
    id,
    name,
    className,
    modelId,
    entityType,
    role,
    roleLabel: getRuntimeRoleLabel(role),
    sideId: getTrimmedString(unit.sideId),
    sideName: getTrimmedString(unit.sideName) || "세력 없음",
    sideColor: getTrimmedString(unit.sideColor),
    lon,
    lat,
    longitude: lon,
    latitude: lat,
    altitudeMeters: Math.max(0, getFirstFiniteNumber(unit.altitudeMeters, 0)),
    headingDeg: getFirstFiniteNumber(unit.headingDeg, unit.heading, 0),
    speedKts: Math.max(0, getFirstFiniteNumber(unit.speedKts, unit.speed, 0)),
    weaponCount: Math.max(
      0,
      Math.round(
        getFirstFiniteNumber(
          unit.weaponCount,
          Array.isArray(unit.weapons) ? unit.weapons.length : 0
        )
      )
    ),
    engagementRangeMeters: Math.max(
      0,
      getFirstFiniteNumber(unit.engagementRangeNm, 0) * 1852
    ),
    selected,
    groundUnit:
      unit.groundUnit === true ||
      entityType === "army" ||
      entityType === "facility" ||
      entityType === "airbase",
    statusFlags: Array.isArray(unit.statusFlags)
      ? unit.statusFlags
          .map((flag) => getTrimmedString(flag))
          .filter(Boolean)
          .slice(0, 8)
      : [],
  };
}

function normalizeRuntimeWeaponForTerrain(weapon, index, bounds) {
  if (!weapon || typeof weapon !== "object") {
    return null;
  }

  const lon = getFirstFiniteNumber(weapon.longitude, weapon.lon);
  const lat = getFirstFiniteNumber(weapon.latitude, weapon.lat);
  const targetLon = getFirstFiniteNumber(
    weapon.targetLongitude,
    weapon.targetLon
  );
  const targetLat = getFirstFiniteNumber(
    weapon.targetLatitude,
    weapon.targetLat
  );
  const currentInside =
    Number.isFinite(lon) &&
    Number.isFinite(lat) &&
    (!bounds || isLonLatInsideBounds(lon, lat, bounds));
  const targetInside =
    Number.isFinite(targetLon) &&
    Number.isFinite(targetLat) &&
    !!bounds &&
    isLonLatInsideBounds(targetLon, targetLat, bounds);

  if (!currentInside && !targetInside) {
    return null;
  }

  const id = getTrimmedString(weapon.id) || `weapon-${index + 1}`;
  return {
    id,
    name:
      getTrimmedString(weapon.name) || getTrimmedString(weapon.className) || id,
    className: getTrimmedString(weapon.className),
    launcherId: getTrimmedString(weapon.launcherId),
    launcherName: getTrimmedString(weapon.launcherName),
    sideId: getTrimmedString(weapon.sideId),
    sideName: getTrimmedString(weapon.sideName) || "세력 없음",
    lon,
    lat,
    longitude: lon,
    latitude: lat,
    altitudeMeters: Math.max(0, getFirstFiniteNumber(weapon.altitudeMeters, 0)),
    targetLon: Number.isFinite(targetLon) ? targetLon : null,
    targetLat: Number.isFinite(targetLat) ? targetLat : null,
    targetInside,
    currentInside,
  };
}

function normalizeRuntimeEntityType(entityType, signature) {
  const rawType = getTrimmedString(entityType).toLowerCase();
  if (
    rawType === "aircraft" ||
    rawType === "army" ||
    rawType === "facility" ||
    rawType === "airbase" ||
    rawType === "ship"
  ) {
    return rawType;
  }

  if (
    /\b(f-15|f-16|f-35|kf-21|aircraft|fighter|bomber|drone|uav|helicopter)\b/i.test(
      signature
    )
  ) {
    return "aircraft";
  }
  if (
    /\b(ship|destroyer|carrier|submarine|frigate|cruiser)\b/i.test(signature)
  ) {
    return "ship";
  }
  if (/\b(airbase|base|runway)\b/i.test(signature)) {
    return "airbase";
  }
  if (
    /\b(tank|ifv|apc|army|infantry|armor|artillery|howitzer|launcher)\b/i.test(
      signature
    )
  ) {
    return "army";
  }
  return "facility";
}

function classifyRuntimeAssetRole(entityType, signature) {
  if (
    /\b(howitzer|artillery|mlrs|k9|m109|paladin|hyunmoo|rocket|launcher|cannon|gun)\b/i.test(
      signature
    )
  ) {
    return "fires";
  }
  if (
    /\b(sam|patriot|thaad|nasams|s-300|s-400|air defense|interceptor)\b/i.test(
      signature
    )
  ) {
    return "air-defense";
  }
  if (entityType === "aircraft") {
    return "air";
  }
  if (entityType === "ship") {
    return "naval";
  }
  if (entityType === "army") {
    return "ground";
  }
  if (entityType === "airbase") {
    return "base";
  }
  return "facility";
}

function getRuntimeRoleLabel(role) {
  if (role === "fires") {
    return "화력";
  }
  if (role === "air-defense") {
    return "방공";
  }
  if (role === "air") {
    return "항공";
  }
  if (role === "naval") {
    return "해상";
  }
  if (role === "ground") {
    return "지상";
  }
  if (role === "base") {
    return "기지";
  }
  return "시설";
}

function countRuntimeAssetsBy(assets, key) {
  return assets.reduce((counts, asset) => {
    const label = getTrimmedString(asset?.[key]) || "미분류";
    counts[label] = (counts[label] ?? 0) + 1;
    return counts;
  }, {});
}

function getPreferredMarkerTypesForRuntimeUnit(unit) {
  if (unit.role === "fires" || unit.role === "air-defense") {
    return ["artillery", "concealment", "crossing"];
  }
  if (unit.role === "ground") {
    return ["concealment", "crossing", "artillery"];
  }
  if (unit.role === "naval") {
    return ["artillery", "crossing", "concealment"];
  }
  if (unit.role === "air") {
    return ["artillery", "concealment", "crossing"];
  }
  return ["concealment", "artillery", "crossing"];
}

function pickBestMarkerForRuntimeUnit({
  unit,
  markers,
  referenceLatitude,
  influenceRangeMeters,
  preferredTypes,
}) {
  if (!Array.isArray(markers) || markers.length === 0) {
    return null;
  }

  return markers.reduce((best, marker) => {
    const distanceMeters = distancePointToPointMeters(
      unit,
      marker,
      referenceLatitude
    );
    const markerScore = getMarkerScoreForRuntimeRecommendation(marker);
    const distanceScore =
      1 - clamp(distanceMeters / influenceRangeMeters, 0, 1);
    const typeIndex = Math.max(0, preferredTypes.indexOf(marker.type));
    const roleBonus = getRuntimeRoleMarkerBonus(unit, marker);
    const selectedBonus = unit.selected ? 0.14 : 0;
    const priority = clamp(
      markerScore * 0.58 +
        distanceScore * 0.3 +
        roleBonus +
        selectedBonus -
        typeIndex * 0.035,
      0,
      1
    );
    const candidate = {
      marker,
      distanceMeters,
      priority,
    };

    if (!best || candidate.priority > best.priority) {
      return candidate;
    }
    return best;
  }, null);
}

function getMarkerScoreForRuntimeRecommendation(marker) {
  return Math.max(
    0,
    getFirstFiniteNumber(
      marker.score,
      marker.artilleryScore,
      marker.crossingPotentialScore,
      marker.concealmentScore,
      marker.visibilityRatio,
      0
    )
  );
}

function getRuntimeRoleMarkerBonus(unit, marker) {
  if (
    marker.type === "artillery" &&
    (unit.role === "fires" ||
      unit.role === "air-defense" ||
      unit.role === "naval")
  ) {
    return 0.1;
  }
  if (
    marker.type === "concealment" &&
    (unit.role === "ground" ||
      unit.role === "facility" ||
      unit.role === "base" ||
      unit.role === "fires")
  ) {
    return 0.08;
  }
  if (marker.type === "crossing" && unit.role === "ground") {
    return 0.08;
  }
  return 0;
}

function buildRuntimeAssetRecommendation({
  unit,
  marker,
  distanceMeters,
  priority,
}) {
  const markerId =
    getTrimmedString(marker.id) || `${getMarkerTypeLabel(marker.type)} 후보`;
  const actionLabel = getAssetRecommendationActionLabel(unit, marker);
  const distanceLabel = formatRuntimeRecommendationDistance(distanceMeters);
  const unitLabel = unit.selected ? "선택 자산" : unit.roleLabel;

  return {
    id: `asset-${unit.id}-${markerId}`,
    unitId: unit.id,
    unitName: unit.name,
    unitType: unit.className || unit.entityType,
    unitRole: unit.role,
    unitRoleLabel: unit.roleLabel,
    sideName: unit.sideName,
    selectedUnit: unit.selected,
    unitLon: unit.lon,
    unitLat: unit.lat,
    unitHeightMeters: unit.altitudeMeters,
    markerId,
    markerType: marker.type,
    markerTitle: marker.title,
    markerLon: Number(marker.lon),
    markerLat: Number(marker.lat),
    markerHeightMeters: Number(marker.heightMeters) || 0,
    distanceMeters,
    priority,
    actionLabel,
    summary: `${unitLabel} ${unit.name}에서 ${markerId} ${getMarkerTypeLabel(
      marker.type
    )}까지 ${distanceLabel}. ${actionLabel}로 우선 검토합니다.`,
  };
}

function getAssetRecommendationActionLabel(unit, marker) {
  if (marker.type === "artillery") {
    if (unit.role === "fires") {
      return "사격 진지 보정";
    }
    if (unit.role === "air-defense") {
      return "방공 배치 고도 보정";
    }
    return "관측/화력 연계";
  }
  if (marker.type === "concealment") {
    return "차폐 이동 후보";
  }
  if (marker.type === "crossing") {
    return "기동 관문 통제";
  }
  return "지형 효과 연계";
}

function getMarkerTypeLabel(markerType) {
  if (markerType === "artillery") {
    return "화력 노드";
  }
  if (markerType === "concealment") {
    return "차폐 노드";
  }
  if (markerType === "crossing") {
    return "도하/기동 노드";
  }
  return "지형 노드";
}

function normalizeRuntimeContextForPrompt(runtimeContext) {
  if (!runtimeContext || typeof runtimeContext !== "object") {
    return {
      hasContext: false,
      unitCount: 0,
      weaponCount: 0,
      selectedUnit: null,
      visibleUnits: [],
      visibleWeapons: [],
      sideCounts: {},
      roleCounts: {},
    };
  }

  return {
    hasContext: runtimeContext.hasContext === true,
    unitCount: runtimeContext.unitCount ?? 0,
    weaponCount: runtimeContext.weaponCount ?? 0,
    selectedUnit: normalizeRuntimeUnitForPrompt(runtimeContext.selectedUnit),
    visibleUnits: Array.isArray(runtimeContext.visibleUnits)
      ? runtimeContext.visibleUnits
          .slice(0, 12)
          .map((unit) => normalizeRuntimeUnitForPrompt(unit))
      : [],
    visibleWeapons: Array.isArray(runtimeContext.visibleWeapons)
      ? runtimeContext.visibleWeapons
          .slice(0, 8)
          .map((weapon) => normalizeRuntimeWeaponForPrompt(weapon))
      : [],
    sideCounts: runtimeContext.sideCounts ?? {},
    roleCounts: runtimeContext.roleCounts ?? {},
  };
}

function normalizeRuntimeUnitForPrompt(unit) {
  if (!unit) {
    return null;
  }

  return {
    id: unit.id,
    name: unit.name,
    type: unit.className || unit.entityType,
    role: unit.roleLabel ?? unit.role,
    sideName: unit.sideName,
    selected: unit.selected === true,
    lon: round(unit.lon, 6),
    lat: round(unit.lat, 6),
    altitudeMeters: round(unit.altitudeMeters, 0),
    speedKts: round(unit.speedKts ?? 0, 0),
    weaponCount: unit.weaponCount ?? 0,
  };
}

function normalizeRuntimeWeaponForPrompt(weapon) {
  if (!weapon) {
    return null;
  }

  return {
    id: weapon.id,
    name: weapon.name,
    launcherName: weapon.launcherName,
    sideName: weapon.sideName,
    lon: round(weapon.lon, 6),
    lat: round(weapon.lat, 6),
    targetLon: Number.isFinite(weapon.targetLon)
      ? round(weapon.targetLon, 6)
      : null,
    targetLat: Number.isFinite(weapon.targetLat)
      ? round(weapon.targetLat, 6)
      : null,
    targetInside: weapon.targetInside === true,
    currentInside: weapon.currentInside === true,
  };
}

function formatRuntimeRecommendationDistance(distanceMeters) {
  if (!Number.isFinite(distanceMeters)) {
    return "거리 미상";
  }
  if (distanceMeters < 950) {
    return `${Math.round(distanceMeters)}m`;
  }
  return `${(distanceMeters / 1000).toFixed(1)}km`;
}

function getFirstFiniteNumber(...values) {
  for (const value of values) {
    const numberValue = Number(value);
    if (Number.isFinite(numberValue)) {
      return numberValue;
    }
  }
  return Number.NaN;
}

function isFiniteBounds(bounds) {
  return (
    bounds &&
    Number.isFinite(Number(bounds.west)) &&
    Number.isFinite(Number(bounds.south)) &&
    Number.isFinite(Number(bounds.east)) &&
    Number.isFinite(Number(bounds.north)) &&
    Number(bounds.west) < Number(bounds.east) &&
    Number(bounds.south) < Number(bounds.north)
  );
}

function isLonLatInsideBounds(lon, lat, bounds) {
  return (
    lon >= Number(bounds.west) &&
    lon <= Number(bounds.east) &&
    lat >= Number(bounds.south) &&
    lat <= Number(bounds.north)
  );
}

function getTrimmedString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function sanitizeBaseUrl(value) {
  const trimmed = getTrimmedString(value);
  return trimmed.replace(/\/+$/, "");
}

function isSameOriginUrl(value, locationLike = getBrowserLocation()) {
  const trimmed = getTrimmedString(value);
  const origin = getTrimmedString(locationLike?.origin);
  if (!trimmed || !origin) {
    return false;
  }

  try {
    return new URL(trimmed, origin).origin === origin;
  } catch (_error) {
    return false;
  }
}

function getBrowserLocation() {
  return typeof window !== "undefined" ? window.location : null;
}

function getDefaultVworldDomain(locationLike = getBrowserLocation()) {
  if (!locationLike) {
    return "";
  }

  return (
    getTrimmedString(locationLike.hostname) ||
    getTrimmedString(locationLike.host) ||
    getTrimmedString(locationLike.origin)
  );
}

export function shouldUseVworldProxy(locationLike = getBrowserLocation()) {
  if (!locationLike) {
    return false;
  }

  return Boolean(getTrimmedString(locationLike.origin));
}

export function buildVworldServiceUrl(
  pathname,
  locationLike = getBrowserLocation()
) {
  const normalizedPath = pathname.startsWith("/") ? pathname : `/${pathname}`;
  if (shouldUseVworldProxy(locationLike)) {
    const origin = getTrimmedString(locationLike?.origin) || "http://localhost";
    return new URL(`/api/vworld${normalizedPath}`, origin);
  }
  return new URL(normalizedPath, "https://api.vworld.kr");
}

async function fetchLayerFeatureCollection(layerDef, bounds, runtimeConfig) {
  if (!runtimeConfig.vworldApiKey) {
    throw new Error("VWorld API 키가 없어 레이어를 조회할 수 없습니다.");
  }

  const dataUrl = buildVworldDataUrl(layerDef.dataId, bounds, runtimeConfig);
  const dataResponse = await fetch(dataUrl);
  const dataPayload = await safeReadJson(dataResponse);

  if (!dataResponse.ok) {
    throw new Error(
      extractPayloadError(dataPayload) ||
        "브이월드 Data API 요청이 실패했습니다."
    );
  }

  if (dataPayload?.status === "ERROR") {
    throw new Error(
      extractPayloadError(dataPayload) ||
        "브이월드 Data API가 오류를 반환했습니다."
    );
  }

  if (dataPayload?.status === "NOT_FOUND") {
    return EMPTY_FEATURE_COLLECTION;
  }

  const dataFeatureCollection = normalizeFeatureCollection(
    findFeatureCollectionNode(dataPayload)
  );
  if (dataFeatureCollection.features.length > 0) {
    return dataFeatureCollection;
  }

  const wfsUrl = buildVworldWfsUrl(layerDef.typeName, bounds, runtimeConfig);
  const wfsResponse = await fetch(wfsUrl);
  const responseText = await wfsResponse.text();

  if (!wfsResponse.ok) {
    throw new Error("브이월드 WFS 요청이 실패했습니다.");
  }

  if (responseText.trim().startsWith("{")) {
    const parsedJson = JSON.parse(responseText);
    return normalizeFeatureCollection(findFeatureCollectionNode(parsedJson));
  }

  return normalizeFeatureCollection(parseWfsFeatureCollection(responseText));
}

async function safeReadJson(response) {
  try {
    return await response.json();
  } catch (error) {
    return null;
  }
}

function buildVworldDataUrl(dataId, bounds, runtimeConfig) {
  const url = buildVworldServiceUrl("/req/data");
  url.searchParams.set("service", "data");
  url.searchParams.set("version", "2.0");
  url.searchParams.set("request", "GetFeature");
  url.searchParams.set("format", "json");
  url.searchParams.set("size", "1000");
  url.searchParams.set("page", "1");
  url.searchParams.set("geometry", "true");
  url.searchParams.set("attribute", "true");
  url.searchParams.set("crs", "EPSG:4326");
  url.searchParams.set("data", dataId);
  url.searchParams.set(
    "geomFilter",
    `BOX(${bounds.west},${bounds.south},${bounds.east},${bounds.north})`
  );
  url.searchParams.set("key", runtimeConfig.vworldApiKey);
  if (runtimeConfig.vworldDomain) {
    url.searchParams.set("domain", runtimeConfig.vworldDomain);
  }
  return url.toString();
}

function buildVworldWfsUrl(typeName, bounds, runtimeConfig) {
  const url = buildVworldServiceUrl("/req/wfs");
  url.searchParams.set("service", "WFS");
  url.searchParams.set("version", "1.1.0");
  url.searchParams.set("request", "GetFeature");
  url.searchParams.set("typename", typeName.toLowerCase());
  url.searchParams.set(
    "bbox",
    `${bounds.south},${bounds.west},${bounds.north},${bounds.east}`
  );
  url.searchParams.set("srsname", "EPSG:4326");
  url.searchParams.set("maxfeatures", "1000");
  url.searchParams.set("output", "GML2");
  url.searchParams.set("key", runtimeConfig.vworldApiKey);
  if (runtimeConfig.vworldDomain) {
    url.searchParams.set("domain", runtimeConfig.vworldDomain);
  }
  return url.toString();
}

function extractPayloadError(payload) {
  if (!payload || typeof payload !== "object") {
    return "";
  }

  if (
    typeof payload?.error?.text === "string" &&
    payload.error.text.length > 0
  ) {
    return payload.error.text;
  }

  if (typeof payload?.message === "string" && payload.message.length > 0) {
    return payload.message;
  }

  return "";
}

function findFeatureCollectionNode(value, depth = 0, seen = new WeakSet()) {
  if (depth > 6 || value === null || typeof value !== "object") {
    return null;
  }

  if (seen.has(value)) {
    return null;
  }

  seen.add(value);

  if (value.type === "FeatureCollection" && Array.isArray(value.features)) {
    return value;
  }

  if (Array.isArray(value.features)) {
    return {
      type: "FeatureCollection",
      features: value.features,
    };
  }

  for (const nestedValue of Object.values(value)) {
    const candidate = findFeatureCollectionNode(nestedValue, depth + 1, seen);
    if (candidate) {
      return candidate;
    }
  }

  return null;
}

function normalizeFeatureCollection(featureCollection) {
  if (!featureCollection || !Array.isArray(featureCollection.features)) {
    return EMPTY_FEATURE_COLLECTION;
  }

  return {
    type: "FeatureCollection",
    features: featureCollection.features
      .filter((feature) => feature && typeof feature === "object")
      .map((feature, index) => ({
        type: "Feature",
        id:
          feature.id ??
          feature.properties?.id ??
          feature.properties?.gid ??
          `${feature.geometry?.type ?? "feature"}-${index}`,
        properties:
          feature.properties && typeof feature.properties === "object"
            ? feature.properties
            : {},
        geometry: normalizeGeometry(feature.geometry),
      }))
      .filter((feature) => feature.geometry !== null),
  };
}

function normalizeGeometry(geometry) {
  if (
    !geometry ||
    typeof geometry !== "object" ||
    typeof geometry.type !== "string"
  ) {
    return null;
  }

  if (
    !Array.isArray(geometry.coordinates) &&
    geometry.type !== "GeometryCollection"
  ) {
    return null;
  }

  if (
    geometry.type === "GeometryCollection" &&
    Array.isArray(geometry.geometries)
  ) {
    const normalizedGeometries = geometry.geometries
      .map((nestedGeometry) => normalizeGeometry(nestedGeometry))
      .filter((nestedGeometry) => nestedGeometry !== null);
    return normalizedGeometries.length > 0
      ? {
          type: "GeometryCollection",
          geometries: normalizedGeometries,
        }
      : null;
  }

  return geometry;
}

function parseWfsFeatureCollection(xmlText) {
  const documentNode = new DOMParser().parseFromString(xmlText, "text/xml");
  const parserError = documentNode.querySelector("parsererror");
  if (parserError) {
    throw new Error("브이월드 WFS 응답을 파싱하지 못했습니다.");
  }

  const featureElements = collectWfsFeatureElements(documentNode);
  const features = featureElements
    .map((featureElement, index) => parseWfsFeature(featureElement, index))
    .filter((feature) => feature !== null);

  return {
    type: "FeatureCollection",
    features,
  };
}

function collectWfsFeatureElements(documentNode) {
  const featureMemberNodes = Array.from(
    documentNode.getElementsByTagNameNS("*", "featureMember")
  );
  if (featureMemberNodes.length > 0) {
    return featureMemberNodes
      .map((featureMemberNode) =>
        Array.from(featureMemberNode.children).find(
          (childNode) => childNode.nodeType === 1
        )
      )
      .filter((featureNode) => featureNode);
  }

  const featureMembersNode = documentNode.getElementsByTagNameNS(
    "*",
    "featureMembers"
  )[0];
  if (!featureMembersNode) {
    return [];
  }

  return Array.from(featureMembersNode.children).filter(
    (childNode) => childNode.nodeType === 1
  );
}

function parseWfsFeature(featureElement, index) {
  const properties = {};
  let geometry = null;

  for (const childNode of Array.from(featureElement.children)) {
    const parsedGeometry = parseGmlGeometryFromNode(childNode);
    if (parsedGeometry) {
      geometry = parsedGeometry;
      continue;
    }

    properties[childNode.localName] = childNode.textContent?.trim?.() ?? "";
  }

  if (!geometry) {
    geometry = parseGmlGeometryFromNode(featureElement);
  }

  if (!geometry) {
    return null;
  }

  return {
    type: "Feature",
    id: featureElement.getAttribute("fid") ?? `wfs-feature-${index}`,
    properties,
    geometry,
  };
}

function parseGmlGeometryFromNode(node) {
  if (!(node instanceof Element)) {
    return null;
  }

  const geometryNode = locateGeometryNode(node);
  if (!geometryNode) {
    return null;
  }

  switch (geometryNode.localName) {
    case "Point":
      return parseGmlPoint(geometryNode);
    case "LineString":
      return parseGmlLineString(geometryNode);
    case "Polygon":
      return parseGmlPolygon(geometryNode);
    case "MultiPolygon":
      return parseGmlMultiPolygon(geometryNode);
    case "MultiLineString":
      return parseGmlMultiLineString(geometryNode);
    default:
      return null;
  }
}

function locateGeometryNode(node) {
  const geometryNames = new Set([
    "Point",
    "LineString",
    "Polygon",
    "MultiPolygon",
    "MultiLineString",
  ]);

  if (geometryNames.has(node.localName)) {
    return node;
  }

  for (const descendantNode of Array.from(node.getElementsByTagName("*"))) {
    if (geometryNames.has(descendantNode.localName)) {
      return descendantNode;
    }
  }

  return null;
}

function parseGmlPoint(pointNode) {
  const coordinates = extractCoordinatePairs(pointNode);
  if (coordinates.length === 0) {
    return null;
  }

  return {
    type: "Point",
    coordinates: coordinates[0],
  };
}

function parseGmlLineString(lineNode) {
  const coordinates = extractCoordinatePairs(lineNode);
  if (coordinates.length < 2) {
    return null;
  }

  return {
    type: "LineString",
    coordinates,
  };
}

function parseGmlPolygon(polygonNode) {
  const ringNodes = Array.from(
    polygonNode.getElementsByTagNameNS("*", "LinearRing")
  );
  const rings = ringNodes
    .map((ringNode) => extractCoordinatePairs(ringNode))
    .filter((coordinates) => coordinates.length >= 4);

  if (rings.length === 0) {
    return null;
  }

  return {
    type: "Polygon",
    coordinates: rings,
  };
}

function parseGmlMultiPolygon(multiPolygonNode) {
  const polygonNodes = Array.from(
    multiPolygonNode.getElementsByTagNameNS("*", "Polygon")
  );
  const polygons = polygonNodes
    .map((polygonNode) => parseGmlPolygon(polygonNode))
    .filter((polygon) => polygon !== null)
    .map((polygon) => polygon.coordinates);

  if (polygons.length === 0) {
    return null;
  }

  return {
    type: "MultiPolygon",
    coordinates: polygons,
  };
}

function parseGmlMultiLineString(multiLineNode) {
  const lineNodes = Array.from(
    multiLineNode.getElementsByTagNameNS("*", "LineString")
  );
  const lineStrings = lineNodes
    .map((lineNode) => parseGmlLineString(lineNode))
    .filter((lineString) => lineString !== null)
    .map((lineString) => lineString.coordinates);

  if (lineStrings.length === 0) {
    return null;
  }

  return {
    type: "MultiLineString",
    coordinates: lineStrings,
  };
}

function extractCoordinatePairs(node) {
  const posListNode = node.getElementsByTagNameNS("*", "posList")[0];
  if (posListNode?.textContent) {
    return tokenizeCoordinateText(posListNode.textContent);
  }

  const posNodes = Array.from(node.getElementsByTagNameNS("*", "pos"));
  if (posNodes.length > 0) {
    return posNodes.flatMap((posNode) =>
      tokenizeCoordinateText(posNode.textContent ?? "")
    );
  }

  const coordinatesNode = node.getElementsByTagNameNS("*", "coordinates")[0];
  if (coordinatesNode?.textContent) {
    return tokenizeCoordinateText(coordinatesNode.textContent, true);
  }

  return [];
}

function tokenizeCoordinateText(rawText, isLegacyCoordinates = false) {
  const normalizedText = rawText.trim();
  if (!normalizedText) {
    return [];
  }

  if (isLegacyCoordinates) {
    return normalizedText
      .split(/\s+/)
      .map((token) => token.split(",").map((value) => Number(value)))
      .filter(
        (pair) =>
          pair.length >= 2 && pair.every((value) => Number.isFinite(value))
      )
      .map((pair) => [pair[0], pair[1]]);
  }

  const values = normalizedText
    .split(/\s+/)
    .map((token) => Number(token))
    .filter((value) => Number.isFinite(value));
  const coordinates = [];

  for (let index = 0; index < values.length; index += 2) {
    const lon = values[index];
    const lat = values[index + 1];
    if (Number.isFinite(lon) && Number.isFinite(lat)) {
      coordinates.push([lon, lat]);
    }
  }

  return coordinates;
}

function collectPolygonGeometries(featureCollection) {
  if (!featureCollection?.features) {
    return [];
  }

  return featureCollection.features.flatMap((feature) =>
    flattenPolygonCoordinates(feature.geometry)
  );
}

function collectLineGeometries(featureCollection) {
  if (!featureCollection?.features) {
    return [];
  }

  return featureCollection.features.flatMap((feature) =>
    flattenLineCoordinates(feature.geometry)
  );
}

function flattenPolygonCoordinates(geometry) {
  if (!geometry) {
    return [];
  }

  switch (geometry.type) {
    case "Polygon":
      return [geometry.coordinates];
    case "MultiPolygon":
      return geometry.coordinates;
    case "GeometryCollection":
      return geometry.geometries.flatMap((nestedGeometry) =>
        flattenPolygonCoordinates(nestedGeometry)
      );
    default:
      return [];
  }
}

function flattenLineCoordinates(geometry) {
  if (!geometry) {
    return [];
  }

  switch (geometry.type) {
    case "LineString":
      return [geometry.coordinates];
    case "MultiLineString":
      return geometry.coordinates;
    case "Polygon":
      return geometry.coordinates;
    case "MultiPolygon":
      return geometry.coordinates.flatMap(
        (polygonCoordinates) => polygonCoordinates
      );
    case "GeometryCollection":
      return geometry.geometries.flatMap((nestedGeometry) =>
        flattenLineCoordinates(nestedGeometry)
      );
    default:
      return [];
  }
}

function enrichSample(sample, referenceLatitude, polygonLookup, lineLookup) {
  const samplePoint = [sample.lon, sample.lat];
  const insideRiverPolygon = polygonLookup.river.some((polygon) =>
    isPointInPolygon(samplePoint, polygon[0])
  );
  const riverDistanceMeters = insideRiverPolygon
    ? 0
    : distanceToNearestLineMeters(
        samplePoint,
        lineLookup.river,
        referenceLatitude
      );
  const roadDistanceMeters = distanceToNearestLineMeters(
    samplePoint,
    lineLookup.road,
    referenceLatitude
  );

  return {
    ...sample,
    riverDistanceMeters,
    roadDistanceMeters,
    nearWater: insideRiverPolygon || riverDistanceMeters <= 90,
    nearRoad: roadDistanceMeters <= 140,
    inForest: polygonLookup.forest.some((polygon) =>
      isPointInPolygon(samplePoint, polygon[0])
    ),
    inHazard: polygonLookup.steep.some((polygon) =>
      isPointInPolygon(samplePoint, polygon[0])
    ),
    inDrainage: polygonLookup.drainage.some((polygon) =>
      isPointInPolygon(samplePoint, polygon[0])
    ),
  };
}

function distanceToNearestLineMeters(point, lineStrings, referenceLatitude) {
  if (!Array.isArray(lineStrings) || lineStrings.length === 0) {
    return Number.POSITIVE_INFINITY;
  }

  return lineStrings.reduce((minimumDistance, lineCoordinates) => {
    return Math.min(
      minimumDistance,
      distancePointToLineMeters(point, lineCoordinates, referenceLatitude)
    );
  }, Number.POSITIVE_INFINITY);
}

function isPointInPolygon(point, outerRing) {
  let inside = false;
  const x = point[0];
  const y = point[1];

  for (
    let currentIndex = 0, previousIndex = outerRing.length - 1;
    currentIndex < outerRing.length;
    previousIndex = currentIndex++
  ) {
    const xi = outerRing[currentIndex][0];
    const yi = outerRing[currentIndex][1];
    const xj = outerRing[previousIndex][0];
    const yj = outerRing[previousIndex][1];
    const intersects =
      yi > y !== yj > y &&
      x < ((xj - xi) * (y - yi)) / (yj - yi || Number.EPSILON) + xi;

    if (intersects) {
      inside = !inside;
    }
  }

  return inside;
}

function distancePointToLineMeters(point, lineCoordinates, referenceLatitude) {
  if (lineCoordinates.length === 0) {
    return Number.POSITIVE_INFINITY;
  }

  const pointMeters = lonLatToMeters(point[0], point[1], referenceLatitude);
  let minimumDistance = Number.POSITIVE_INFINITY;

  for (let index = 1; index < lineCoordinates.length; index += 1) {
    const startMeters = lonLatToMeters(
      lineCoordinates[index - 1][0],
      lineCoordinates[index - 1][1],
      referenceLatitude
    );
    const endMeters = lonLatToMeters(
      lineCoordinates[index][0],
      lineCoordinates[index][1],
      referenceLatitude
    );
    minimumDistance = Math.min(
      minimumDistance,
      distancePointToSegmentMeters(pointMeters, startMeters, endMeters)
    );
  }

  return minimumDistance;
}

function lonLatToMeters(lon, lat, referenceLatitude) {
  return {
    x:
      lon *
      METERS_PER_DEGREE_LAT *
      Math.cos((referenceLatitude * Math.PI) / 180),
    y: lat * METERS_PER_DEGREE_LAT,
  };
}

function distancePointToSegmentMeters(point, segmentStart, segmentEnd) {
  const dx = segmentEnd.x - segmentStart.x;
  const dy = segmentEnd.y - segmentStart.y;
  const lengthSquared = dx * dx + dy * dy;
  if (lengthSquared === 0) {
    return Math.hypot(point.x - segmentStart.x, point.y - segmentStart.y);
  }

  const projection = clamp(
    ((point.x - segmentStart.x) * dx + (point.y - segmentStart.y) * dy) /
      lengthSquared,
    0,
    1
  );
  const closestPoint = {
    x: segmentStart.x + projection * dx,
    y: segmentStart.y + projection * dy,
  };

  return Math.hypot(point.x - closestPoint.x, point.y - closestPoint.y);
}

function calculateMean(values) {
  if (values.length === 0) {
    return 0;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function calculateRatio(values, predicate) {
  if (values.length === 0) {
    return 0;
  }

  return values.filter(predicate).length / values.length;
}

function attachVisibilityMetrics(samples) {
  const sampleLookup = new Map(
    samples.map((sample) => [
      `${sample.rowIndex}:${sample.columnIndex}`,
      sample,
    ])
  );

  return samples.map((sample) => {
    let visibleCount = 0;
    let consideredCount = 0;

    for (const targetSample of samples) {
      if (targetSample === sample) {
        continue;
      }

      consideredCount += 1;
      if (isLineOfSightClear(sample, targetSample, sampleLookup)) {
        visibleCount += 1;
      }
    }

    const visibilityRatio =
      consideredCount > 0 ? visibleCount / consideredCount : 1;

    return {
      ...sample,
      visibilityRatio,
      deadGroundRatio: 1 - visibilityRatio,
    };
  });
}

function isLineOfSightClear(startSample, endSample, sampleLookup) {
  const deltaRow = endSample.rowIndex - startSample.rowIndex;
  const deltaColumn = endSample.columnIndex - startSample.columnIndex;
  const stepCount = Math.max(Math.abs(deltaRow), Math.abs(deltaColumn));

  if (stepCount <= 1) {
    return true;
  }

  const startHeight = startSample.heightMeters + 5;
  const endHeight = endSample.heightMeters + 2;

  for (let step = 1; step < stepCount; step += 1) {
    const t = step / stepCount;
    const rowPosition = startSample.rowIndex + deltaRow * t;
    const columnPosition = startSample.columnIndex + deltaColumn * t;
    const terrainHeight = interpolateGridHeight(
      sampleLookup,
      rowPosition,
      columnPosition,
      startSample.heightMeters
    );
    const lineHeight = startHeight + (endHeight - startHeight) * t;

    if (terrainHeight + 2 > lineHeight) {
      return false;
    }
  }

  return true;
}

function interpolateGridHeight(
  sampleLookup,
  rowPosition,
  columnPosition,
  fallbackHeight
) {
  const rowFloor = Math.floor(rowPosition);
  const rowCeil = Math.ceil(rowPosition);
  const columnFloor = Math.floor(columnPosition);
  const columnCeil = Math.ceil(columnPosition);
  const topLeft =
    sampleLookup.get(`${rowFloor}:${columnFloor}`)?.heightMeters ??
    fallbackHeight;
  const topRight =
    sampleLookup.get(`${rowFloor}:${columnCeil}`)?.heightMeters ?? topLeft;
  const bottomLeft =
    sampleLookup.get(`${rowCeil}:${columnFloor}`)?.heightMeters ?? topLeft;
  const bottomRight =
    sampleLookup.get(`${rowCeil}:${columnCeil}`)?.heightMeters ?? topLeft;
  const rowFraction = clamp(rowPosition - rowFloor, 0, 1);
  const columnFraction = clamp(columnPosition - columnFloor, 0, 1);
  const topInterpolated = topLeft + (topRight - topLeft) * columnFraction;
  const bottomInterpolated =
    bottomLeft + (bottomRight - bottomLeft) * columnFraction;

  return topInterpolated + (bottomInterpolated - topInterpolated) * rowFraction;
}

function scoreTerrainSamples(samples, context) {
  const reliefMeters = Math.max(context.maxElevation - context.minElevation, 1);
  const diagonalMeters = Math.max(
    Math.hypot(context.widthMeters, context.heightMeters),
    1
  );

  return samples.map((sample) => {
    const elevationFactor = clamp(
      (sample.heightMeters - context.minElevation) / reliefMeters,
      0,
      1
    );
    const roadAccessScore = 1 - clamp(sample.roadDistanceMeters / 420, 0, 1);
    const waterStandOffScore = clamp(sample.riverDistanceMeters / 240, 0, 1);
    const slopeSuitabilityScore = clamp(1 - sample.slopeDegrees / 18, 0, 1);
    const exposureScore = clamp(
      sample.visibilityRatio * 0.52 +
        (sample.nearRoad ? 0.14 : 0) +
        (sample.nearWater ? 0.1 : 0) +
        elevationFactor * 0.12 +
        (sample.inForest ? 0 : 0.12),
      0,
      1
    );
    const concealmentScore = clamp(
      (1 - sample.visibilityRatio) * 0.38 +
        (sample.inForest ? 0.24 : 0) +
        (1 - elevationFactor) * 0.15 +
        (sample.nearRoad ? 0 : 0.1) +
        (sample.nearWater ? 0 : 0.07) +
        (sample.inHazard ? 0 : 0.06),
      0,
      1
    );
    const artilleryScore = clamp(
      sample.visibilityRatio * 0.28 +
        elevationFactor * 0.18 +
        slopeSuitabilityScore * 0.16 +
        roadAccessScore * 0.16 +
        waterStandOffScore * 0.1 +
        (sample.inHazard ? 0 : 0.12) +
        (sample.inForest ? 0.05 : 0),
      0,
      1
    );
    const crossingPotentialScore =
      sample.nearRoad && sample.nearWater
        ? clamp(
            (1 - clamp(sample.riverDistanceMeters / 110, 0, 1)) * 0.34 +
              (1 - clamp(sample.roadDistanceMeters / 150, 0, 1)) * 0.34 +
              clamp(1 - sample.slopeDegrees / 16, 0, 1) * 0.16 +
              (sample.inHazard ? 0 : 0.08) +
              (1 -
                clamp(
                  sample.distanceFromCenterMeters / (diagonalMeters * 0.45),
                  0,
                  1
                )) *
                0.08,
            0,
            1
          )
        : 0;

    return {
      ...sample,
      elevationFactor,
      roadAccessScore,
      exposureScore,
      concealmentScore,
      artilleryScore,
      crossingPotentialScore,
    };
  });
}

function classifyTerrain(reliefMeters, meanSlopeDegrees, steepSampleRatio) {
  if (
    reliefMeters >= 420 ||
    steepSampleRatio >= 0.38 ||
    meanSlopeDegrees >= 18
  ) {
    return "험준 산지";
  }
  if (
    reliefMeters >= 220 ||
    steepSampleRatio >= 0.22 ||
    meanSlopeDegrees >= 10
  ) {
    return "구릉-산지 혼합";
  }
  return "완경사 지형";
}

function buildTerrainMarkers(samples, widthMeters, heightMeters, options = {}) {
  const spacingMeters = Math.max(
    Math.min(widthMeters, heightMeters) * 0.18,
    320
  );
  const artilleryMarkers = pickSpacedMarkers(
    samples
      .filter(
        (sample) =>
          sample.artilleryScore >= 0.48 &&
          sample.slopeDegrees <= 14 &&
          !sample.inHazard &&
          sample.riverDistanceMeters >= 100
      )
      .sort((left, right) => right.artilleryScore - left.artilleryScore),
    3,
    spacingMeters,
    "A",
    "artillery",
    (sample, index) => ({
      title: `A${index + 1} 포대 후보`,
      reason: `가시율 ${formatScore(sample.visibilityRatio)}, 경사 ${round(
        sample.slopeDegrees,
        1
      )}°, 도로 ${round(sample.roadDistanceMeters, 0)}m`,
      score: sample.artilleryScore,
    })
  );
  const concealmentMarkers = pickSpacedMarkers(
    samples
      .filter(
        (sample) =>
          sample.concealmentScore >= 0.44 &&
          sample.slopeDegrees <= 16 &&
          !sample.inHazard &&
          !sample.nearWater
      )
      .sort((left, right) => right.concealmentScore - left.concealmentScore),
    2,
    spacingMeters,
    "C",
    "concealment",
    (sample, index) => ({
      title: `C${index + 1} 차폐 후보`,
      reason: `차폐 ${formatScore(sample.concealmentScore)}, 노출 ${formatScore(
        sample.exposureScore
      )}${sample.inForest ? ", 산림 피복" : ""}`,
      score: sample.concealmentScore,
    })
  );
  const crossingMarkers = pickSpacedMarkers(
    buildCrossingMarkerSamples(samples, options).sort(
      (left, right) =>
        (right.markerScore ?? right.crossingPotentialScore) -
        (left.markerScore ?? left.crossingPotentialScore)
    ),
    3,
    spacingMeters,
    "X",
    "crossing",
    (sample, index) => ({
      title: `X${index + 1} 도하 후보`,
      reason:
        sample.crossingReason ??
        `도로 ${round(sample.roadDistanceMeters, 0)}m, 수계 ${round(
          sample.riverDistanceMeters,
          0
        )}m, 경사 ${round(sample.slopeDegrees, 1)}°`,
      score: sample.markerScore ?? sample.crossingPotentialScore,
    })
  );

  return [...artilleryMarkers, ...concealmentMarkers, ...crossingMarkers];
}

function buildCrossingMarkerSamples(samples, options) {
  const intersections = Array.isArray(options.crossingIntersections)
    ? options.crossingIntersections
    : [];
  if (intersections.length === 0) {
    return samples.filter(
      (sample) =>
        sample.crossingPotentialScore >= 0.38 &&
        sample.slopeDegrees <= 16 &&
        !sample.inHazard
    );
  }

  const diagonalMeters = Math.max(
    Math.hypot(options.widthMeters ?? 0, options.heightMeters ?? 0),
    1
  );

  return intersections
    .map((intersection) => {
      const nearestSample = findNearestSample(
        samples,
        intersection.lon,
        intersection.lat
      );
      if (!nearestSample) {
        return null;
      }

      const centerWeight =
        1 -
        clamp(
          nearestSample.distanceFromCenterMeters / (diagonalMeters * 0.45),
          0,
          1
        );
      const slopeSuitabilityScore = clamp(
        1 - nearestSample.slopeDegrees / 16,
        0,
        1
      );
      const markerScore = clamp(
        0.42 +
          slopeSuitabilityScore * 0.22 +
          (nearestSample.inHazard ? 0 : 0.14) +
          centerWeight * 0.12 +
          (nearestSample.inForest ? 0.06 : 0) +
          (nearestSample.nearRoad ? 0.04 : 0),
        0,
        1
      );

      return {
        ...nearestSample,
        lon: intersection.lon,
        lat: intersection.lat,
        localX: nearestSample.localX,
        localY: nearestSample.localY,
        markerScore,
        crossingReason: `실교차 추정 지점, 경사 ${round(
          nearestSample.slopeDegrees,
          1
        )}°, 차폐 ${formatScore(nearestSample.concealmentScore)}, 점수 ${formatScore(
          markerScore
        )}`,
      };
    })
    .filter((sample) => sample !== null);
}

function pickSpacedMarkers(
  sortedSamples,
  limit,
  minimumSpacingMeters,
  prefix,
  type,
  buildMeta
) {
  const pickedMarkers = [];

  for (const sample of sortedSamples) {
    const tooClose = pickedMarkers.some(
      (marker) =>
        Math.hypot(
          marker.localX - sample.localX,
          marker.localY - sample.localY
        ) < minimumSpacingMeters
    );
    if (tooClose) {
      continue;
    }

    const index = pickedMarkers.length;
    const meta = buildMeta(sample, index);
    pickedMarkers.push({
      id: `${prefix}${index + 1}`,
      type,
      title: meta.title,
      reason: meta.reason,
      score: meta.score ?? 0,
      lon: sample.lon,
      lat: sample.lat,
      rowIndex: sample.rowIndex,
      columnIndex: sample.columnIndex,
      heightMeters: sample.heightMeters,
      slopeDegrees: sample.slopeDegrees,
      visibilityRatio: sample.visibilityRatio ?? 0,
      concealmentScore: sample.concealmentScore ?? 0,
      exposureScore: sample.exposureScore ?? 0,
      localX: sample.localX,
      localY: sample.localY,
    });

    if (pickedMarkers.length >= limit) {
      break;
    }
  }

  return pickedMarkers;
}

function findNearestSample(samples, lon, lat) {
  let nearestSample = null;
  let minimumDistance = Number.POSITIVE_INFINITY;

  for (const sample of samples) {
    const distance = Math.hypot(sample.lon - lon, sample.lat - lat);
    if (distance < minimumDistance) {
      minimumDistance = distance;
      nearestSample = sample;
    }
  }

  return nearestSample;
}

function buildConcealmentHeatmap(samples, bounds) {
  const maxRowIndex = Math.max(0, ...samples.map((sample) => sample.rowIndex));
  const maxColumnIndex = Math.max(
    0,
    ...samples.map((sample) => sample.columnIndex)
  );
  const rowCount = maxRowIndex + 1;
  const columnCount = maxColumnIndex + 1;
  const lonStep = (bounds.east - bounds.west) / Math.max(columnCount, 1);
  const latStep = (bounds.north - bounds.south) / Math.max(rowCount, 1);

  return samples.map((sample) => {
    const west = clamp(sample.lon - lonStep / 2, bounds.west, bounds.east);
    const east = clamp(sample.lon + lonStep / 2, bounds.west, bounds.east);
    const south = clamp(sample.lat - latStep / 2, bounds.south, bounds.north);
    const north = clamp(sample.lat + latStep / 2, bounds.south, bounds.north);

    return {
      rowIndex: sample.rowIndex,
      columnIndex: sample.columnIndex,
      west,
      south,
      east,
      north,
      centerLon: sample.lon,
      centerLat: sample.lat,
      heightMeters: sample.heightMeters,
      concealmentScore: sample.concealmentScore,
      exposureScore: sample.exposureScore,
      dominantType:
        sample.concealmentScore >= sample.exposureScore
          ? "concealment"
          : "exposure",
      priorityScore: Math.max(sample.concealmentScore, sample.exposureScore),
    };
  });
}

function buildArtilleryFirePlans(markers, samples, widthMeters, heightMeters) {
  const artilleryMarkers = markers.filter(
    (marker) => marker.type === "artillery"
  );
  if (artilleryMarkers.length === 0) {
    return [];
  }

  const sampleLookup = new Map(
    samples.map((sample) => [
      `${sample.rowIndex}:${sample.columnIndex}`,
      sample,
    ])
  );
  const diagonalMeters = Math.max(Math.hypot(widthMeters, heightMeters), 1);
  const minimumRangeMeters = Math.max(
    Math.min(widthMeters, heightMeters) * 0.08,
    220
  );
  const maximumRangeMeters = diagonalMeters * 0.72;
  const sectorCount = 8;
  const sectorWidthDegrees = 360 / sectorCount;

  return artilleryMarkers.map((marker) => {
    const originSample = sampleLookup.get(
      `${marker.rowIndex}:${marker.columnIndex}`
    );
    if (!originSample) {
      return {
        markerId: marker.id,
        markerTitle: marker.title,
        recommendedMinRangeMeters: 0,
        recommendedMaxRangeMeters: 0,
        openSectors: [],
        blockedSectors: [],
      };
    }

    const sectors = Array.from({ length: sectorCount }, (_, index) => ({
      index,
      azimuthDegrees: index * sectorWidthDegrees,
      visibleCount: 0,
      consideredCount: 0,
      farthestVisibleTarget: null,
      nearestBlockedTarget: null,
    }));
    const visibleDistances = [];

    for (const targetSample of samples) {
      if (targetSample === originSample) {
        continue;
      }

      const distanceMeters = Math.hypot(
        targetSample.localX - originSample.localX,
        targetSample.localY - originSample.localY
      );
      if (
        distanceMeters < minimumRangeMeters ||
        distanceMeters > maximumRangeMeters
      ) {
        continue;
      }

      const azimuthDegrees = calculateAzimuthDegrees(
        originSample,
        targetSample
      );
      const sectorIndex = Math.floor(azimuthDegrees / sectorWidthDegrees);
      const sector = sectors[sectorIndex];
      if (!sector) {
        continue;
      }

      const visible = isLineOfSightClear(
        originSample,
        targetSample,
        sampleLookup
      );
      sector.consideredCount += 1;

      if (visible) {
        sector.visibleCount += 1;
        visibleDistances.push(distanceMeters);
        if (
          !sector.farthestVisibleTarget ||
          distanceMeters > sector.farthestVisibleTarget.distanceMeters
        ) {
          sector.farthestVisibleTarget = {
            lon: targetSample.lon,
            lat: targetSample.lat,
            heightMeters: targetSample.heightMeters,
            distanceMeters,
          };
        }
      } else if (
        !sector.nearestBlockedTarget ||
        distanceMeters < sector.nearestBlockedTarget.distanceMeters
      ) {
        sector.nearestBlockedTarget = {
          lon: targetSample.lon,
          lat: targetSample.lat,
          heightMeters: targetSample.heightMeters,
          distanceMeters,
        };
      }
    }

    const normalizedSectors = sectors
      .filter((sector) => sector.consideredCount > 0)
      .map((sector) => {
        const visibleRatio = sector.visibleCount / sector.consideredCount;
        return {
          ...sector,
          visibleRatio,
          label: formatAzimuthWindow(
            sector.azimuthDegrees,
            sector.azimuthDegrees + sectorWidthDegrees
          ),
          distanceMeters:
            sector.farthestVisibleTarget?.distanceMeters ??
            sector.nearestBlockedTarget?.distanceMeters ??
            minimumRangeMeters,
        };
      });

    const openSectors = normalizedSectors
      .filter((sector) => sector.visibleRatio >= 0.46)
      .sort((left, right) => right.visibleRatio - left.visibleRatio)
      .slice(0, 2)
      .map((sector) => ({
        label: sector.label,
        visibleRatio: sector.visibleRatio,
        distanceMeters: sector.distanceMeters,
        targetLon: sector.farthestVisibleTarget?.lon ?? originSample.lon,
        targetLat: sector.farthestVisibleTarget?.lat ?? originSample.lat,
        targetHeightMeters:
          sector.farthestVisibleTarget?.heightMeters ??
          originSample.heightMeters,
      }));
    const blockedSectors = normalizedSectors
      .filter((sector) => sector.visibleRatio <= 0.34)
      .sort((left, right) => left.visibleRatio - right.visibleRatio)
      .slice(0, 2)
      .map((sector) => ({
        label: sector.label,
        visibleRatio: sector.visibleRatio,
        distanceMeters: sector.distanceMeters,
        targetLon: sector.nearestBlockedTarget?.lon ?? originSample.lon,
        targetLat: sector.nearestBlockedTarget?.lat ?? originSample.lat,
        targetHeightMeters:
          sector.nearestBlockedTarget?.heightMeters ??
          originSample.heightMeters,
      }));

    return {
      markerId: marker.id,
      markerTitle: marker.title,
      markerLon: marker.lon,
      markerLat: marker.lat,
      markerHeightMeters: marker.heightMeters,
      recommendedMinRangeMeters:
        quantile(visibleDistances, 0.2) ?? minimumRangeMeters,
      recommendedMaxRangeMeters:
        quantile(visibleDistances, 0.8) ?? maximumRangeMeters,
      openSectors,
      blockedSectors,
    };
  });
}

function buildLosSegments(firePlans) {
  return firePlans.flatMap((plan) => {
    const openSegments = plan.openSectors.map((sector, index) => ({
      id: `${plan.markerId}-open-${index + 1}`,
      markerId: plan.markerId,
      type: "open",
      label: `${plan.markerId} ${sector.label}`,
      startLon: plan.markerLon,
      startLat: plan.markerLat,
      startHeightMeters: plan.markerHeightMeters,
      endLon: sector.targetLon,
      endLat: sector.targetLat,
      endHeightMeters: sector.targetHeightMeters,
      distanceMeters: sector.distanceMeters,
      visibleRatio: sector.visibleRatio,
    }));
    const blockedSegments = plan.blockedSectors.map((sector, index) => ({
      id: `${plan.markerId}-blocked-${index + 1}`,
      markerId: plan.markerId,
      type: "blocked",
      label: `${plan.markerId} ${sector.label}`,
      startLon: plan.markerLon,
      startLat: plan.markerLat,
      startHeightMeters: plan.markerHeightMeters,
      endLon: sector.targetLon,
      endLat: sector.targetLat,
      endHeightMeters: sector.targetHeightMeters,
      distanceMeters: sector.distanceMeters,
      visibleRatio: sector.visibleRatio,
    }));

    return [...openSegments, ...blockedSegments];
  });
}

function calculateAzimuthDegrees(originSample, targetSample) {
  const deltaX = targetSample.localX - originSample.localX;
  const deltaY = targetSample.localY - originSample.localY;
  const azimuthDegrees = (Math.atan2(deltaX, deltaY) * 180) / Math.PI;
  return (azimuthDegrees + 360) % 360;
}

function formatAzimuthWindow(startDegrees, endDegrees) {
  const normalizedStart = ((startDegrees % 360) + 360) % 360;
  const normalizedEnd = ((endDegrees % 360) + 360) % 360;
  return `${round(normalizedStart, 0)}-${round(normalizedEnd, 0)}°`;
}

function quantile(values, percentile) {
  if (!Array.isArray(values) || values.length === 0) {
    return null;
  }

  const sortedValues = [...values].sort((left, right) => left - right);
  const index = clamp(
    Math.round((sortedValues.length - 1) * percentile),
    0,
    sortedValues.length - 1
  );
  return sortedValues[index];
}

function findRoadRiverIntersections(roadLines, riverLines, referenceLatitude) {
  const roadSegments = collectProjectedSegments(roadLines, referenceLatitude);
  const riverSegments = collectProjectedSegments(riverLines, referenceLatitude);
  const intersections = [];

  for (const roadSegment of roadSegments) {
    for (const riverSegment of riverSegments) {
      if (!segmentBoundsOverlap(roadSegment.bounds, riverSegment.bounds, 20)) {
        continue;
      }

      const projectedIntersection = intersectProjectedSegments(
        roadSegment.start,
        roadSegment.end,
        riverSegment.start,
        riverSegment.end
      );
      if (!projectedIntersection) {
        continue;
      }

      intersections.push(
        metersToLonLat(
          projectedIntersection.x,
          projectedIntersection.y,
          referenceLatitude
        )
      );
    }
  }

  return deduplicateLonLatPoints(intersections, referenceLatitude, 45).slice(
    0,
    24
  );
}

function collectProjectedSegments(lineStrings, referenceLatitude) {
  return lineStrings.flatMap((lineCoordinates) => {
    const segments = [];
    for (let index = 1; index < lineCoordinates.length; index += 1) {
      const start = lonLatToMeters(
        lineCoordinates[index - 1][0],
        lineCoordinates[index - 1][1],
        referenceLatitude
      );
      const end = lonLatToMeters(
        lineCoordinates[index][0],
        lineCoordinates[index][1],
        referenceLatitude
      );
      segments.push({
        start,
        end,
        bounds: {
          minX: Math.min(start.x, end.x),
          maxX: Math.max(start.x, end.x),
          minY: Math.min(start.y, end.y),
          maxY: Math.max(start.y, end.y),
        },
      });
    }
    return segments;
  });
}

function segmentBoundsOverlap(leftBounds, rightBounds, paddingMeters = 0) {
  return !(
    leftBounds.maxX + paddingMeters < rightBounds.minX ||
    rightBounds.maxX + paddingMeters < leftBounds.minX ||
    leftBounds.maxY + paddingMeters < rightBounds.minY ||
    rightBounds.maxY + paddingMeters < leftBounds.minY
  );
}

function intersectProjectedSegments(startA, endA, startB, endB) {
  const r = {
    x: endA.x - startA.x,
    y: endA.y - startA.y,
  };
  const s = {
    x: endB.x - startB.x,
    y: endB.y - startB.y,
  };
  const denominator = cross2d(r, s);
  if (Math.abs(denominator) < 1e-9) {
    return null;
  }

  const offset = {
    x: startB.x - startA.x,
    y: startB.y - startA.y,
  };
  const t = cross2d(offset, s) / denominator;
  const u = cross2d(offset, r) / denominator;
  if (t < 0 || t > 1 || u < 0 || u > 1) {
    return null;
  }

  return {
    x: startA.x + r.x * t,
    y: startA.y + r.y * t,
  };
}

function cross2d(left, right) {
  return left.x * right.y - left.y * right.x;
}

function metersToLonLat(x, y, referenceLatitude) {
  return {
    lon:
      x /
      (METERS_PER_DEGREE_LAT * Math.cos((referenceLatitude * Math.PI) / 180)),
    lat: y / METERS_PER_DEGREE_LAT,
  };
}

function deduplicateLonLatPoints(points, referenceLatitude, thresholdMeters) {
  const deduplicatedPoints = [];

  for (const point of points) {
    const isDuplicate = deduplicatedPoints.some(
      (existingPoint) =>
        distancePointToPointMeters(point, existingPoint, referenceLatitude) <=
        thresholdMeters
    );
    if (!isDuplicate) {
      deduplicatedPoints.push(point);
    }
  }

  return deduplicatedPoints;
}

function distancePointToPointMeters(leftPoint, rightPoint, referenceLatitude) {
  const leftMeters = lonLatToMeters(
    leftPoint.lon,
    leftPoint.lat,
    referenceLatitude
  );
  const rightMeters = lonLatToMeters(
    rightPoint.lon,
    rightPoint.lat,
    referenceLatitude
  );

  return Math.hypot(leftMeters.x - rightMeters.x, leftMeters.y - rightMeters.y);
}

function buildEngineBrief(metrics) {
  const overview = [];
  const artillery = [];
  const maneuver = [];
  const risks = [];
  const opportunities = [];

  overview.push(
    `${metrics.terrainClass} 성격이며 고도 기복은 약 ${round(metrics.reliefMeters, 0)}m입니다.`
  );
  overview.push(
    `평균 가시율 ${formatScore(metrics.meanVisibilityRatio)}, 평균 차폐 점수 ${formatScore(
      metrics.meanConcealmentScore
    )}로 관측 우세와 데드그라운드가 혼재합니다.`
  );

  if (metrics.riverSampleRatio >= 0.18) {
    overview.push(
      "수계 영향이 커서 기동 축이 잘리거나 도하 병목이 생길 가능성이 있습니다."
    );
  }
  if (metrics.crossingIntersectionCount >= 1) {
    overview.push(
      `도로-수계 실교차 후보가 ${metrics.crossingIntersectionCount}개 확인되어 도하 통제 지점을 세분화할 수 있습니다.`
    );
  }
  if (metrics.forestSampleRatio >= 0.28) {
    overview.push("산림 피복이 넓어 시야 차단과 은폐 접근 가능성이 보입니다.");
  }

  if (metrics.maxArtilleryScore >= 0.58) {
    artillery.push(
      `포대 후보 점수가 ${formatScore(metrics.maxArtilleryScore)} 수준으로 관측 및 사격 지휘 보조 지점을 둘 여지가 있습니다.`
    );
  }
  if (metrics.firePlans.some((plan) => plan.openSectors.length > 0)) {
    artillery.push(
      "포대 후보별로 개방 섹터와 차단 섹터를 나눠 사선 제약을 함께 볼 수 있습니다."
    );
  }
  if (metrics.hazardSampleRatio >= 0.12 || metrics.steepSampleRatio >= 0.25) {
    artillery.push(
      "급경사 구간이 넓어 자주포나 차량화 포대 전개는 평탄도 검증이 필요합니다."
    );
  }
  if (metrics.roadSampleRatio >= 0.14) {
    artillery.push(
      "도로 접근성이 있어 보급 및 포대 진출입 시간 단축 여지가 있습니다."
    );
  }

  if (metrics.roadSampleRatio >= 0.14) {
    maneuver.push(
      "도로 중심축을 따라 기동이 빠를 수 있으나 노출도도 함께 커질 수 있습니다."
    );
  }
  if (metrics.meanConcealmentScore >= 0.46) {
    maneuver.push(
      "차폐 잠재가 살아 있는 구간이 있어 산림과 역사면을 이용한 은폐 기동 여지가 있습니다."
    );
  }
  if (metrics.forestSampleRatio >= 0.28) {
    maneuver.push(
      "산림대를 이용한 은폐 이동은 가능하지만 시야와 통신 차단을 함께 고려해야 합니다."
    );
  }
  if (metrics.markers.some((marker) => marker.type === "crossing")) {
    maneuver.push(
      "도로와 수계가 만나는 지점이 병목으로 작동할 수 있어 통제 가치가 높습니다."
    );
  }
  if (metrics.firePlans.some((plan) => plan.blockedSectors.length > 0)) {
    maneuver.push(
      "포대별 차단 섹터는 우회 기동이나 관측 제한 방향을 빠르게 가려내는 기준이 됩니다."
    );
  }

  if (metrics.riverSampleRatio >= 0.18) {
    risks.push(
      "하천/계곡축 때문에 우회 강요나 도하 지연이 발생할 수 있습니다."
    );
  }
  if (metrics.hazardSampleRatio >= 0.12) {
    risks.push(
      "급경사 지정 구역 인접으로 차량 전개와 복귀 시 안전 여유가 작아질 수 있습니다."
    );
  }
  if (metrics.steepSampleRatio >= 0.25) {
    risks.push(
      "경사 자체가 큰 구간이 많아 사격각과 차량 자세 안정성 검토가 필요합니다."
    );
  }
  if (metrics.meanExposureScore >= 0.52) {
    risks.push(
      "개활 시야가 큰 방향에서는 포대와 기동 축이 관측에 쉽게 노출될 수 있습니다."
    );
  }

  if (metrics.markers.some((marker) => marker.type === "artillery")) {
    opportunities.push(
      "포대 후보 지점을 먼저 확보하면 관측 우세와 사격 조정 우위를 가져갈 수 있습니다."
    );
  }
  if (metrics.markers.some((marker) => marker.type === "concealment")) {
    opportunities.push(
      "차폐 후보는 은폐 집결지나 접근 전 대기 구역으로 검토할 수 있습니다."
    );
  }
  if (metrics.markers.some((marker) => marker.type === "crossing")) {
    opportunities.push(
      "도하/교차 후보를 장악하면 상대 기동을 제어하는 효과를 기대할 수 있습니다."
    );
  }

  return {
    overview,
    artillery,
    maneuver,
    risks,
    opportunities,
  };
}

function roundObject(input, fractionDigits) {
  return Object.fromEntries(
    Object.entries(input).map(([key, value]) => [
      key,
      typeof value === "number" ? round(value, fractionDigits) : value,
    ])
  );
}

function round(value, fractionDigits) {
  const factor = 10 ** fractionDigits;
  return Math.round(value * factor) / factor;
}

function formatScore(value) {
  return `${Math.round(clamp(value, 0, 1) * 100)}%`;
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}
