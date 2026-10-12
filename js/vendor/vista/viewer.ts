// @ts-nocheck
import {
  OLLAMA_TERRAIN_REPORT_SCHEMA,
  TERRAIN_INTEL_LAYER_DEFS,
  buildTerrainVlmPrompt,
  buildTerrainIntelAnalysis,
  enrichTerrainAnalysisWithRuntimeContext,
  getDefaultTerrainIntelSelection,
  loadTerrainIntelLayers,
  parseTerrainVlmReport,
  resolveTerrainIntelRuntimeConfig,
  extractOllamaModelNames,
  isLikelyOllamaVisionModelName,
  selectOllamaVisionModel,
} from "./terrainIntel";
import {
  collectRuntimeSnapshotPreloadUrls,
  createTerrainPlacementRuntime,
} from "./placementRuntime?v=terrain-balanced-perf-20260612";
import { initializeMapTilerTerrainPlanA } from "./maptilerTerrainPlanA?v=terrain-model-material-20260527";
import { buildOfflineTilesetLoadPlan } from "./offlineTilesets?v=terrain-offline-tilesets-20260605";

function resolveTerrainViewerPublicPath(path) {
  const normalizedPath = String(path ?? "")
    .trim()
    .replace(/^\/+/, "");
  if (!normalizedPath) {
    return "";
  }

  const metaUrl = new URL(import.meta.url);
  if (metaUrl.protocol === "http:" || metaUrl.protocol === "https:") {
    return new URL(`../${normalizedPath}`, metaUrl).pathname;
  }

  return `/${normalizedPath}`;
}

const CESIUM_BASE_URL = resolveTerrainViewerPublicPath("flight-sim/cesium/");

const Cesium = window.Cesium;
const runtimeConfig = window.__FLIGHT_SIM_CONFIG__ ?? {};
const searchParams = new URLSearchParams(window.location.search);
const hostedByVistaControls = searchParams.get("hostControls") === "vista";
const terrainPerformanceMode = String(searchParams.get("performanceMode") ?? "")
  .trim()
  .toLowerCase();
const terrainBalancedPerformanceMode =
  hostedByVistaControls ||
  terrainPerformanceMode === "balanced" ||
  terrainPerformanceMode === "low" ||
  terrainPerformanceMode === "1";
const TERRAIN_BALANCED_ANIMATION_FRAME_INTERVAL_MS = 1000 / 30;
const TERRAIN_BALANCED_REQUEST_RENDER_INTERVAL_MS = 1000 / 30;
const TERRAIN_HIDDEN_REQUEST_RENDER_INTERVAL_MS = 250;
const terrainCameraRangeScale = clamp(
  parseFiniteNumber(searchParams.get("cameraRangeScale")) ?? 1,
  0.5,
  1.4
);
const terrainCameraHeadingDeg =
  parseFiniteNumber(searchParams.get("cameraHeadingDeg")) ?? 24;
const terrainCameraPitchDeg = clamp(
  parseFiniteNumber(searchParams.get("cameraPitchDeg")) ?? -38,
  -88,
  -8
);
const terrainCameraRangeMeters = parseFiniteNumber(
  searchParams.get("cameraRangeMeters")
);
const terrainFocusLon = parseFiniteNumber(searchParams.get("focusLon"));
const terrainFocusLat = parseFiniteNumber(searchParams.get("focusLat"));
const terrainVerticalExaggeration = clamp(
  parseFiniteNumber(searchParams.get("terrainExaggeration")) ?? 1.45,
  1,
  12
);
const intelRuntimeConfig = resolveTerrainIntelRuntimeConfig(
  runtimeConfig,
  searchParams
);
const mapTilerApiKey = String(runtimeConfig.mapTilerApiKey ?? "").trim();
const vworldApiKey = intelRuntimeConfig.vworldApiKey;
const requestedImageryProvider = String(
  searchParams.get("imageryProvider") ?? ""
)
  .trim()
  .toLowerCase();
const preferVWorldImagery = requestedImageryProvider === "vworld";
const preferMapTilerImagery = requestedImageryProvider === "maptiler";
const vworldBuildingsRequested =
  searchParams.get("vworldBuildings") === "1" ||
  (preferVWorldImagery && searchParams.get("vworldBuildings") !== "0");
const vworldBuildingsOpacity = clamp(
  parseFiniteNumber(searchParams.get("vworldBuildingsOpacity")) ?? 0.68,
  0.18,
  0.92
);
const requestedAnalysisOverlayMode = searchParams.get("analysisOverlay");
const terrainAnalysisOverlayMode =
  requestedAnalysisOverlayMode === "outline" ||
  requestedAnalysisOverlayMode === "tactical"
    ? requestedAnalysisOverlayMode
    : "full";
const requestedLocalAnalysisMode = String(
  searchParams.get("localAnalysis") ?? "full"
)
  .trim()
  .toLowerCase();
const terrainLocalAnalysisMode =
  requestedLocalAnalysisMode === "buildings" ||
  requestedLocalAnalysisMode === "off"
    ? requestedLocalAnalysisMode
    : "full";
const offlineBuildingsRequested =
  searchParams.get("offlineBuildings") === "1" ||
  searchParams.get("localBuildings3d") === "1";
const requestedHudMode = String(searchParams.get("hudMode") ?? "default")
  .trim()
  .toLowerCase();
const terrainHudMode =
  requestedHudMode === "munition" || requestedHudMode === "collateral"
    ? requestedHudMode
    : "default";
const terrainHudResult = String(searchParams.get("hudResult") ?? "")
  .trim()
  .slice(0, 64);
const terrainHudEffectCell = String(searchParams.get("hudEffectCell") ?? "")
  .trim()
  .slice(0, 32);
const terrainHudDesiredDamagePercent = parseFiniteNumber(
  searchParams.get("hudDesiredDamagePercent")
);
const terrainHudDemReliefM = parseFiniteNumber(
  searchParams.get("hudDemReliefM")
);
const terrainHudDemSlopeP95Deg = parseFiniteNumber(
  searchParams.get("hudDemSlopeP95Deg")
);
const terrainHudNearestCivilianM = parseFiniteNumber(
  searchParams.get("hudNearestCivilianM")
);
const terrainHudCivilianWithin100M = parseFiniteNumber(
  searchParams.get("hudCivilianWithin100M")
);
const terrainHudHdMapWithin250M = parseFiniteNumber(
  searchParams.get("hudHdMapWithin250M")
);
const terrainHudHdMapSafetyWithin250M = parseFiniteNumber(
  searchParams.get("hudHdMapSafetyWithin250M")
);
const terrainHudTerrainComplexity = String(
  searchParams.get("hudTerrainComplexity") ?? ""
)
  .trim()
  .slice(0, 32);
const terrainMissionMode =
  String(searchParams.get("mission") ?? "")
    .trim()
    .toLowerCase() === "drone-redeployment"
    ? "drone-redeployment"
    : "default";
const terrainRevealMode =
  String(searchParams.get("revealMode") ?? "").toLowerCase() === "jarvis"
    ? "jarvis"
    : "none";
const requestedBackgroundMode = String(
  searchParams.get("backgroundMode") ?? "black"
)
  .trim()
  .toLowerCase();
const terrainInitialBackgroundMode =
  requestedBackgroundMode === "sky" ? "sky" : "black";
const VWORLD_3D_BUILDINGS_TILESET_URL =
  "https://xdworld.vworld.kr/TDServer/services/facility_LOD4/vworld_3d_facility.json";
const mapTilerTerrainUrl = mapTilerApiKey
  ? `https://api.maptiler.com/tiles/terrain-quantized-mesh-v2/?key=${mapTilerApiKey}`
  : "";
const offlineSatelliteTileUrl = String(
  isLocalOfflineMapHost()
    ? (searchParams.get("offlineSatelliteTileUrl") ?? "")
    : ""
).trim();
const koreaRectangle = Cesium?.Rectangle?.fromDegrees?.(
  124.5,
  33.0,
  132.5,
  39.5
);
const gridColumns = 10;
const gridRows = 10;
const offlineTerrariumTileCache = new Map();
const offlineTerrariumHeightmapCache = new Map();
const offlineBlankImageryTileCache = new Map();
const OFFLINE_TILE_BOUND_EPSILON = 1e-10;
let offlineTerrainManifestPromise = null;

const loadingOverlay = document.getElementById("loadingOverlay");
const loadingTitle = document.getElementById("loadingTitle");
const loadingDetail = document.getElementById("loadingDetail");
let loadingOverlayHideTimeout = null;
const mapLibreContainer = document.getElementById("mapLibreContainer");
const cesiumContainer = document.getElementById("cesiumContainer");
const statusText = document.getElementById("statusText");
const providerBadge = document.getElementById("providerBadge");
const centerMetric = document.getElementById("centerMetric");
const spanMetric = document.getElementById("spanMetric");
const topViewButton = document.getElementById("topViewButton");
const obliqueViewButton = document.getElementById("obliqueViewButton");
const resetViewButton = document.getElementById("resetViewButton");
const terrainInfoPanel = document.getElementById("terrainInfoPanel");
const terrainPanelBody = document.getElementById("terrainPanelBody");
const toggleTerrainPanelButton = document.getElementById(
  "toggleTerrainPanelButton"
);
const terrainPanelTabButtons = Array.from(
  document.querySelectorAll("[data-terrain-panel-tab]")
);
const terrainPanelGroups = Array.from(
  document.querySelectorAll("[data-terrain-panel-group]")
);
const reloadIntelLayersButton = document.getElementById(
  "reloadIntelLayersButton"
);
const toggleIntelLayersButton = document.getElementById(
  "toggleIntelLayersButton"
);
const intelLayerPanelBody = document.getElementById("intelLayerPanelBody");
const intelLayerList = document.getElementById("intelLayerList");
const layerStatusText = document.getElementById("layerStatusText");
const analysisStatusText = document.getElementById("analysisStatusText");
const runEngineAnalysisButton = document.getElementById(
  "runEngineAnalysisButton"
);
const runVlmAnalysisButton = document.getElementById("runVlmAnalysisButton");
const placementBadge = document.getElementById("placementBadge");
const analysisHud = document.getElementById("analysisHud");
const analysisHudLines = document.getElementById("analysisHudLines");
const analysisHudCards = document.getElementById("analysisHudCards");
const missionOverlay = document.getElementById("missionOverlay");
const missionOverlayTitle = document.getElementById("missionOverlayTitle");
const missionOverlayBody = document.getElementById("missionOverlayBody");
const missionOverlayList = document.getElementById("missionOverlayList");
const missionOverlayMeta = document.getElementById("missionOverlayMeta");
const vlmRuntimeBadge = document.getElementById("vlmRuntimeBadge");
const captureStatusText = document.getElementById("captureStatusText");
const vlmReport = document.getElementById("vlmReport");
const sceneToWindowCoordinates =
  Cesium?.SceneTransforms?.worldToWindowCoordinates ??
  Cesium?.SceneTransforms?.wgs84ToWindowCoordinates;

if (hostedByVistaControls) {
  document.body?.classList.add("is-hosted-by-vista");
}
if (terrainMissionMode === "drone-redeployment") {
  document.body?.classList.add("is-drone-redeployment-mission");
}

const ANALYSIS_HUD_LAYOUT = Object.freeze({
  artillery: {
    kicker: "Fire Position",
    offsetX: -372,
    offsetY: 38,
  },
  concealment: {
    kicker: "Cover Node",
    offsetX: 132,
    offsetY: 42,
  },
  crossing: {
    kicker: "Crossing Window",
    offsetX: 118,
    offsetY: -208,
  },
  summary: {
    kicker: "AI Overview",
    offsetX: -194,
    offsetY: -206,
  },
});

const viewerState = {
  viewer: null,
  bounds: null,
  renderableBounds: null,
  widthMeters: 0,
  heightMeters: 0,
  layerSelection: getDefaultTerrainIntelSelection(),
  layerResults: [],
  layerDataSources: [],
  analysis: null,
  analysisHudEntries: [],
  hudInsets: {
    left: 0,
    right: 0,
  },
  visualOptions: {
    backgroundMode: terrainInitialBackgroundMode,
    showTerrainBriefing: true,
    autoRotateCamera: false,
    revealMode: terrainRevealMode,
  },
  hudCardOverrides: {},
  hudDragState: null,
  markerEntities: [],
  analysisOverlayEntities: [],
  assetRecommendationEntities: [],
  runtimeSnapshot: null,
  runtimeSnapshotSignature: "",
  vworldBuildings: {
    requested: vworldBuildingsRequested,
    ready: false,
    lastError: null,
  },
  offlineBuildings: {
    requested: offlineBuildingsRequested,
    ready: false,
    dataSource: null,
    featureCount: 0,
    sanitizerStats: null,
    lastError: null,
  },
  offlineTilesets: {
    requested: false,
    ready: false,
    loaded: [],
    lastError: null,
  },
  vlmResult: null,
  captureTimestamp: null,
  busy: {
    layers: false,
    engine: false,
    vlm: false,
  },
};
let analysisHudInteractionsWired = false;
let droneRedeploymentMissionAnimationIntervalId = null;
const DRONE_REDEPLOYMENT_MISSION_ANIMATION_DURATION_SECONDS = 42;
const TERRAIN_CAMERA_AUTO_ROTATE_SPEED_RAD_PER_MS =
  Cesium?.Math?.toRadians?.(2.6) / 1000 || 0.000045;
const TERRAIN_CAMERA_AUTO_ROTATE_PITCH_RAD =
  Cesium?.Math?.toRadians?.(-38) || -0.6632251157578453;
const TERRAIN_CAMERA_AUTO_ROTATE_RANGE_SCALE = 0.72;
const TERRAIN_CAMERA_AUTO_ROTATE_MIN_RANGE_METERS = 720;
let terrainCameraAutoRotateState = null;
let terrainCameraAutoRotateFrameId = null;

function notifyHostAnalysisState(extra = {}) {
  if (!hostedByVistaControls || !window.parent || window.parent === window) {
    return;
  }

  const analysis = viewerState.analysis;
  const vlmResult = viewerState.vlmResult;
  window.parent.postMessage(
    {
      type: "terrain3d:analysis-state",
      payload: {
        busy: { ...viewerState.busy },
        hasAnalysis: Boolean(analysis),
        hasVlmResult: Boolean(vlmResult),
        terrainClass:
          typeof analysis?.terrainClass === "string"
            ? analysis.terrainClass
            : "",
        sampledPointCount: Number(analysis?.sampledPointCount) || 0,
        hudEntryCount: viewerState.analysisHudEntries.length,
        vlmSummary:
          typeof vlmResult?.executiveSummary === "string"
            ? vlmResult.executiveSummary
            : "",
        captureTimestamp:
          viewerState.captureTimestamp instanceof Date
            ? viewerState.captureTimestamp.toISOString()
            : null,
        ...extra,
      },
    },
    window.location.origin
  );
}

function setLoadingState(title, detail) {
  if (loadingOverlay) {
    if (loadingOverlayHideTimeout !== null) {
      window.clearTimeout(loadingOverlayHideTimeout);
      loadingOverlayHideTimeout = null;
    }
    loadingOverlay.hidden = false;
    loadingOverlay.classList.remove("is-hidden");
    loadingOverlay.removeAttribute("aria-hidden");
  }
  if (loadingTitle) {
    loadingTitle.textContent = title;
  }
  if (loadingDetail) {
    loadingDetail.textContent = detail;
  }
}

function hideLoadingOverlay() {
  if (!loadingOverlay) {
    return;
  }

  loadingOverlay.classList.add("is-hidden");
  loadingOverlay.setAttribute("aria-hidden", "true");
  if (loadingOverlayHideTimeout !== null) {
    window.clearTimeout(loadingOverlayHideTimeout);
  }
  loadingOverlayHideTimeout = window.setTimeout(() => {
    if (loadingOverlay.classList.contains("is-hidden")) {
      loadingOverlay.hidden = true;
    }
    loadingOverlayHideTimeout = null;
  }, 260);
}

function setStatusMessage(message) {
  if (statusText) {
    statusText.textContent = message;
  }
}

function setProviderBadge(message) {
  if (providerBadge) {
    providerBadge.textContent = message;
  }
}

function shouldTryMapTilerTerrainPlanA() {
  const terrainPlan = searchParams.get("terrainPlan");
  if (terrainPlan === "cesium") {
    return false;
  }

  if (terrainPlan === "maplibre") {
    return true;
  }

  return false;
}

function isClosedNetworkOfflinePort() {
  return ["49154", "49164"].includes(window.location.port);
}

function isLocalOfflineMapHost() {
  return (
    isClosedNetworkOfflinePort() ||
    ["localhost", "127.0.0.1", "::1"].includes(window.location.hostname)
  );
}

function isConfiguredOfflineMapEnabled() {
  return isLocalOfflineMapHost() && runtimeConfig.offlineMap?.enabled === true;
}

function resolveOfflineMapManifestUrl({ includeConfigured = true } = {}) {
  if (!isLocalOfflineMapHost()) {
    return "";
  }

  const queryManifest = String(searchParams.get("offlineMapManifest") ?? "")
    .trim()
    .replace(/^\/+/, "/");
  if (queryManifest) {
    return queryManifest;
  }

  const queryRegionId = String(searchParams.get("offlineMapRegion") ?? "")
    .trim()
    .replace(/[^a-z0-9_-]/gi, "");
  if (queryRegionId) {
    return `/offline-map/${queryRegionId}/manifest.json`;
  }

  if (!includeConfigured || !isConfiguredOfflineMapEnabled()) {
    return "";
  }

  const configuredManifest = String(
    runtimeConfig.offlineMap?.manifestUrl ?? ""
  ).trim();
  if (configuredManifest) {
    return configuredManifest;
  }

  const regionId = String(runtimeConfig.offlineMap?.region ?? "")
    .trim()
    .replace(/[^a-z0-9_-]/gi, "");

  return regionId ? `/offline-map/${regionId}/manifest.json` : "";
}

function isOfflineTerrainMode() {
  if (!isLocalOfflineMapHost()) {
    return false;
  }

  return Boolean(
    searchParams.get("offlineMapManifest") ||
      searchParams.get("offlineMapRegion") ||
      offlineSatelliteTileUrl ||
      (isConfiguredOfflineMapEnabled() && resolveOfflineMapManifestUrl())
  );
}

function prepareCesiumFallbackSurface() {
  if (mapLibreContainer) {
    mapLibreContainer.hidden = true;
    mapLibreContainer.classList.remove("is-active");
  }
  if (cesiumContainer) {
    cesiumContainer.hidden = false;
  }
}

function setOptionalText(element, message) {
  if (!element) {
    return;
  }

  const text = String(message ?? "").trim();
  element.textContent = text;
  element.hidden = text.length === 0;
}

function setPlacementBadge(message) {
  if (placementBadge) {
    placementBadge.textContent = message;
  }
}

function setRuntimePlacementBadge(message) {
  if (
    terrainMissionMode === "drone-redeployment" &&
    String(message ?? "").trim() === "배치 대기"
  ) {
    setPlacementBadge("드론 재배치 대기");
    return;
  }

  setPlacementBadge(message);
}

function normalizeMissionProgressPercent(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.round(clamp(parsed, 0, 100)) : 0;
}

function resolveMissionDroneProgressPercent(drone) {
  const elapsedSeconds =
    Date.now() / 1000 + (Number(drone?.phaseOffsetSeconds) || 0);
  const cycleProgress =
    ((elapsedSeconds % DRONE_REDEPLOYMENT_MISSION_ANIMATION_DURATION_SECONDS) +
      DRONE_REDEPLOYMENT_MISSION_ANIMATION_DURATION_SECONDS) %
    DRONE_REDEPLOYMENT_MISSION_ANIMATION_DURATION_SECONDS;

  return normalizeMissionProgressPercent(
    (cycleProgress / DRONE_REDEPLOYMENT_MISSION_ANIMATION_DURATION_SECONDS) *
      100
  );
}

function resolveMissionDroneStatus(progressPercent) {
  if (progressPercent >= 92) {
    return "도착 접근";
  }
  if (progressPercent >= 16) {
    return "이동중";
  }
  return "이동명령";
}

function normalizeMissionGeoPoint(point) {
  if (!point || typeof point !== "object") {
    return null;
  }
  const latitude = Number(point.latitude);
  const longitude = Number(point.longitude);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return null;
  }

  return {
    latitude,
    longitude,
    altitudeMeters: Number.isFinite(Number(point.altitudeMeters))
      ? Number(point.altitudeMeters)
      : undefined,
  };
}

function interpolateMissionPoint(start, end, progressPercent) {
  const startPoint = normalizeMissionGeoPoint(start);
  const endPoint = normalizeMissionGeoPoint(end);
  if (!startPoint || !endPoint) {
    return startPoint ?? endPoint;
  }

  const progress = clamp(Number(progressPercent) / 100, 0, 1);
  return {
    latitude:
      startPoint.latitude +
      (endPoint.latitude - startPoint.latitude) * progress,
    longitude:
      startPoint.longitude +
      (endPoint.longitude - startPoint.longitude) * progress,
    altitudeMeters:
      Number(startPoint.altitudeMeters ?? endPoint.altitudeMeters) || undefined,
  };
}

function interpolateMissionRoutePoint(drone, progressPercent) {
  const startPoint = normalizeMissionGeoPoint(drone?.start);
  const midPoint = normalizeMissionGeoPoint(drone?.mid);
  const destinationPoint = normalizeMissionGeoPoint(drone?.destination);
  if (!startPoint || !destinationPoint) {
    return null;
  }
  if (!midPoint) {
    return interpolateMissionPoint(
      startPoint,
      destinationPoint,
      progressPercent
    );
  }
  if (progressPercent <= 50) {
    return interpolateMissionPoint(startPoint, midPoint, progressPercent * 2);
  }

  return interpolateMissionPoint(
    midPoint,
    destinationPoint,
    (progressPercent - 50) * 2
  );
}

function resolveMissionHeadingDegrees(fromPoint, toPoint, fallbackHeadingDeg) {
  const from = normalizeMissionGeoPoint(fromPoint);
  const to = normalizeMissionGeoPoint(toPoint);
  if (!from || !to) {
    return Number(fallbackHeadingDeg) || 0;
  }
  const deltaLongitude = to.longitude - from.longitude;
  const deltaLatitude = to.latitude - from.latitude;
  if (
    Math.abs(deltaLongitude) < 0.000001 &&
    Math.abs(deltaLatitude) < 0.000001
  ) {
    return Number(fallbackHeadingDeg) || 0;
  }

  return (Math.atan2(deltaLongitude, deltaLatitude) * 180) / Math.PI;
}

function buildAnimatedDroneRedeploymentSnapshot(snapshot) {
  const summary =
    snapshot?.missionSummary && typeof snapshot.missionSummary === "object"
      ? snapshot.missionSummary
      : null;
  if (
    terrainMissionMode !== "drone-redeployment" ||
    summary?.mode !== "drone-redeployment" ||
    !Array.isArray(summary?.drones)
  ) {
    return snapshot;
  }

  const updatedSummaryDrones = summary.drones.map((drone) => {
    const progressPercent = resolveMissionDroneProgressPercent(drone);
    return {
      ...drone,
      progressPercent,
      status: resolveMissionDroneStatus(progressPercent),
    };
  });
  const updatedSummaryDroneById = new Map(
    updatedSummaryDrones
      .filter((drone) => drone?.id)
      .map((drone) => [String(drone.id), drone])
  );

  const units = Array.isArray(snapshot?.units)
    ? snapshot.units.map((unit) => {
        const drone = updatedSummaryDroneById.get(String(unit?.id ?? ""));
        if (!drone) {
          return unit;
        }

        const progressPercent = normalizeMissionProgressPercent(
          drone.progressPercent
        );
        const currentPoint = interpolateMissionRoutePoint(
          drone,
          progressPercent
        );
        const destinationPoint = normalizeMissionGeoPoint(drone.destination);
        const midPoint = normalizeMissionGeoPoint(drone.mid);
        if (!currentPoint || !destinationPoint) {
          return unit;
        }
        const upcomingRoute =
          progressPercent < 50 && midPoint
            ? [midPoint, destinationPoint]
            : [destinationPoint];
        const altitudeMeters =
          Number(unit?.altitudeMeters) ||
          Number(currentPoint.altitudeMeters) ||
          260;
        const headingDeg = resolveMissionHeadingDegrees(
          currentPoint,
          upcomingRoute[0],
          unit?.headingDeg
        );
        const status = resolveMissionDroneStatus(progressPercent);
        const statusFlags = Array.isArray(unit?.statusFlags)
          ? unit.statusFlags.filter(
              (flag) =>
                !/진행|이동명령|이동중|도착 접근/.test(String(flag ?? ""))
            )
          : [];

        return {
          ...unit,
          latitude: currentPoint.latitude,
          longitude: currentPoint.longitude,
          altitudeMeters,
          headingDeg,
          detectionHeadingDeg: headingDeg,
          route: upcomingRoute.map((routePoint) => ({
            ...routePoint,
            altitudeMeters,
          })),
          desiredRoute: [
            normalizeMissionGeoPoint(drone.start),
            normalizeMissionGeoPoint(drone.mid),
            normalizeMissionGeoPoint(drone.destination),
          ]
            .filter(Boolean)
            .map((routePoint) => ({
              ...routePoint,
              altitudeMeters,
            })),
          statusFlags: [...statusFlags, `진행 ${progressPercent}%`, status],
        };
      })
    : snapshot?.units;

  return {
    ...snapshot,
    currentTime: Date.now() / 1000,
    units,
    missionSummary: {
      ...summary,
      updatedAt: "LIVE",
      drones: updatedSummaryDrones,
    },
  };
}

function startDroneRedeploymentMissionAnimation(placementRuntime) {
  if (
    terrainMissionMode !== "drone-redeployment" ||
    droneRedeploymentMissionAnimationIntervalId !== null
  ) {
    return;
  }

  droneRedeploymentMissionAnimationIntervalId = window.setInterval(
    () => {
      const snapshot =
        placementRuntime?.getLastSnapshot?.() ?? viewerState.runtimeSnapshot;
      if (!snapshot?.missionSummary) {
        return;
      }

      const animatedSnapshot = buildAnimatedDroneRedeploymentSnapshot(snapshot);
      viewerState.runtimeSnapshot = animatedSnapshot;
      placementRuntime?.applySnapshot?.(animatedSnapshot);
      renderDroneRedeploymentMissionOverlay(animatedSnapshot);
      viewerState.viewer?.scene?.requestRender?.();
    },
    terrainBalancedPerformanceMode ? 800 : 500
  );
}

function extractMissionProgressFromUnit(unit) {
  const flags = Array.isArray(unit?.statusFlags) ? unit.statusFlags : [];
  const progressFlag = flags
    .map((flag) => String(flag ?? ""))
    .find((flag) => /진행\s*\d+/i.test(flag));
  const match = progressFlag?.match(/진행\s*(\d+)/i);
  return normalizeMissionProgressPercent(match?.[1] ?? 0);
}

function buildMissionFallbackDrones(snapshot) {
  const units = Array.isArray(snapshot?.units) ? snapshot.units : [];
  const referencePoints = Array.isArray(snapshot?.referencePoints)
    ? snapshot.referencePoints
    : [];

  return units
    .filter((unit) => String(unit?.id ?? "").startsWith("sudo-redeploy-drone-"))
    .map((unit) => {
      const destination = referencePoints.find(
        (referencePoint) => referencePoint?.id === unit?.targetId
      );
      const statusFlags = Array.isArray(unit?.statusFlags)
        ? unit.statusFlags.map((flag) => String(flag ?? ""))
        : [];
      const status =
        statusFlags.find((flag) => /이동|도착|대기/.test(flag)) ?? "이동중";

      return {
        id: String(unit?.id ?? ""),
        name: String(unit?.name ?? "DRONE"),
        destinationName: String(
          destination?.name ?? unit?.targetId ?? "목표 미상"
        ),
        status,
        progressPercent: extractMissionProgressFromUnit(unit),
      };
    });
}

function getDroneRedeploymentMissionViewModel(snapshot) {
  const summary =
    snapshot?.missionSummary && typeof snapshot.missionSummary === "object"
      ? snapshot.missionSummary
      : null;
  const summaryDrones = Array.isArray(summary?.drones) ? summary.drones : [];
  const drones =
    summaryDrones.length > 0
      ? summaryDrones.map((drone) => ({
          id: String(drone?.id ?? ""),
          name: String(drone?.name ?? "DRONE"),
          destinationName: String(drone?.destinationName ?? "목표 미상"),
          status: String(drone?.status ?? "이동중"),
          progressPercent: normalizeMissionProgressPercent(
            drone?.progressPercent
          ),
        }))
      : buildMissionFallbackDrones(snapshot);

  return {
    title: String(summary?.title ?? "사태분석도 2안 드론 재배치"),
    command: String(
      summary?.command ??
        "자연어 명령에 따라 가상 드론을 TAI/NAI 후보지로 재배치합니다."
    ),
    decisionBasis: String(summary?.decisionBasis ?? "AI 판단 대기"),
    updatedAt: String(summary?.updatedAt ?? (snapshot ? "LIVE" : "대기")),
    drones,
  };
}

function renderDroneRedeploymentMissionOverlay(
  snapshot = viewerState.runtimeSnapshot
) {
  if (terrainMissionMode !== "drone-redeployment" || !missionOverlay) {
    return;
  }

  const mission = getDroneRedeploymentMissionViewModel(snapshot);
  missionOverlay.hidden = false;
  missionOverlay.classList.add("is-visible");
  if (missionOverlayTitle) {
    missionOverlayTitle.textContent = mission.title;
  }
  if (missionOverlayBody) {
    missionOverlayBody.textContent = mission.command;
  }
  if (missionOverlayMeta) {
    missionOverlayMeta.textContent = `${mission.updatedAt} · DRONE ${mission.drones.length}`;
  }
  if (missionOverlayList) {
    if (mission.drones.length === 0) {
      missionOverlayList.innerHTML =
        '<div class="terrain-mission-item"><div class="terrain-mission-item-name">드론 이동현황 수신 대기</div></div>';
    } else {
      missionOverlayList.innerHTML = mission.drones
        .map((drone) => {
          const progress = normalizeMissionProgressPercent(
            drone.progressPercent
          );
          return `
            <div class="terrain-mission-item">
              <div class="terrain-mission-item-row">
                <span class="terrain-mission-item-name">${escapeHtml(
                  drone.name
                )}</span>
                <span class="terrain-mission-item-status">${escapeHtml(
                  `${progress}%`
                )}</span>
              </div>
              <div class="terrain-mission-progress" aria-hidden="true">
                <span style="width: ${progress}%"></span>
              </div>
              <p>${escapeHtml(drone.status)} · ${escapeHtml(
                drone.destinationName
              )}</p>
            </div>`;
        })
        .join("");
    }
  }
}

function setVlmRuntimeBadge(message) {
  setOptionalText(vlmRuntimeBadge, message);
  notifyHostAnalysisState({
    vlmStatus: String(message ?? "").trim(),
  });
}

function setCaptureStatusMessage(message) {
  setOptionalText(captureStatusText, message);
  notifyHostAnalysisState({
    captureStatus: String(message ?? "").trim(),
  });
}

function setTerrainPanelCollapsed(collapsed) {
  terrainInfoPanel?.classList.toggle("is-collapsed", collapsed);
  if (terrainPanelBody) {
    terrainPanelBody.hidden = collapsed;
  }
  if (toggleTerrainPanelButton) {
    toggleTerrainPanelButton.textContent = collapsed ? "펼치기" : "접기";
    toggleTerrainPanelButton.setAttribute(
      "aria-expanded",
      collapsed ? "false" : "true"
    );
  }
}

function setIntelLayerBodyCollapsed(collapsed) {
  if (intelLayerPanelBody) {
    intelLayerPanelBody.hidden = collapsed;
  }
  if (toggleIntelLayersButton) {
    toggleIntelLayersButton.textContent = collapsed ? "펼치기" : "접기";
    toggleIntelLayersButton.setAttribute(
      "aria-expanded",
      collapsed ? "false" : "true"
    );
  }
}

function setActiveTerrainPanelTab(tabName) {
  terrainPanelTabButtons.forEach((button) => {
    if (!(button instanceof HTMLElement)) {
      return;
    }

    const active = button.dataset.terrainPanelTab === tabName;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-selected", active ? "true" : "false");
  });

  terrainPanelGroups.forEach((group) => {
    if (!(group instanceof HTMLElement)) {
      return;
    }

    const active = group.dataset.terrainPanelGroup === tabName;
    group.classList.toggle("is-active", active);
    group.hidden = !active;
  });

  if (terrainPanelBody) {
    terrainPanelBody.scrollTop = 0;
  }
}

function wirePanelControls() {
  toggleTerrainPanelButton?.addEventListener("click", () => {
    const nextCollapsed = !terrainInfoPanel?.classList.contains("is-collapsed");
    setTerrainPanelCollapsed(nextCollapsed);
  });
  terrainPanelTabButtons.forEach((button) => {
    button.addEventListener("click", () => {
      if (!(button instanceof HTMLElement)) {
        return;
      }

      setActiveTerrainPanelTab(button.dataset.terrainPanelTab ?? "overview");
    });
  });
  toggleIntelLayersButton?.addEventListener("click", () => {
    setIntelLayerBodyCollapsed(!intelLayerPanelBody?.hidden);
  });
  setActiveTerrainPanelTab("overview");
  setTerrainPanelCollapsed(hostedByVistaControls);
  setIntelLayerBodyCollapsed(false);
}

function setLayerStatusMessage(message) {
  setOptionalText(layerStatusText, message);
}

function setAnalysisStatusMessage(message) {
  setOptionalText(analysisStatusText, message);
  notifyHostAnalysisState({
    analysisStatus: String(message ?? "").trim(),
  });
}

function parseFiniteNumber(value) {
  const parsed = Number(value ?? Number.NaN);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeBounds(bounds, minimumSpanDegrees = 0.002) {
  const west = Math.min(bounds.west, bounds.east);
  const east = Math.max(bounds.west, bounds.east);
  const south = Math.min(bounds.south, bounds.north);
  const north = Math.max(bounds.south, bounds.north);

  const centerLon = (west + east) / 2;
  const centerLat = (south + north) / 2;
  const width = Math.max(east - west, minimumSpanDegrees);
  const height = Math.max(north - south, minimumSpanDegrees);

  return {
    west: Math.max(-180, centerLon - width / 2),
    south: Math.max(-85, centerLat - height / 2),
    east: Math.min(180, centerLon + width / 2),
    north: Math.min(85, centerLat + height / 2),
  };
}

function expandBounds(bounds, ratio = 0.08, minimumPadding = 0.0006) {
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

function parseBoundsFromLocation() {
  const west = parseFiniteNumber(searchParams.get("west"));
  const south = parseFiniteNumber(searchParams.get("south"));
  const east = parseFiniteNumber(searchParams.get("east"));
  const north = parseFiniteNumber(searchParams.get("north"));

  if (west === null || south === null || east === null || north === null) {
    return null;
  }

  return normalizeBounds({
    west,
    south,
    east,
    north,
  });
}

function buildRectangle(bounds) {
  return Cesium.Rectangle.fromDegrees(
    bounds.west,
    bounds.south,
    bounds.east,
    bounds.north
  );
}

function getCenter(bounds) {
  return {
    lon: (bounds.west + bounds.east) / 2,
    lat: (bounds.south + bounds.north) / 2,
  };
}

function formatCoordinate(value) {
  return value.toFixed(4);
}

function formatDistanceKm(valueInKilometers) {
  return valueInKilometers >= 100
    ? `${valueInKilometers.toFixed(0)}km`
    : `${valueInKilometers.toFixed(1)}km`;
}

function formatMeters(valueInMeters) {
  return `${Math.round(valueInMeters).toLocaleString("ko-KR")}m`;
}

function formatOptionalMeters(valueInMeters, fallbackLabel = "확인중") {
  return Number.isFinite(valueInMeters)
    ? formatMeters(valueInMeters)
    : fallbackLabel;
}

function formatOptionalDegrees(valueInDegrees, fallbackLabel = "확인중") {
  return Number.isFinite(valueInDegrees)
    ? `${Number(valueInDegrees).toFixed(1)}°`
    : fallbackLabel;
}

function formatOptionalCount(value, fallbackLabel = "-") {
  return Number.isFinite(value)
    ? Math.round(value).toLocaleString("ko-KR")
    : fallbackLabel;
}

function formatPercent(value) {
  return `${Math.round(value * 100)}%`;
}

function formatScore(value) {
  return formatPercent(Math.min(Math.max(value, 0), 1));
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function measureDistanceMeters(startLon, startLat, endLon, endLat) {
  const geodesic = new Cesium.EllipsoidGeodesic(
    Cesium.Cartographic.fromDegrees(startLon, startLat),
    Cesium.Cartographic.fromDegrees(endLon, endLat)
  );
  return Number.isFinite(geodesic.surfaceDistance)
    ? geodesic.surfaceDistance
    : 0;
}

function updateMetrics(bounds) {
  const center = getCenter(bounds);
  const widthMeters = measureDistanceMeters(
    bounds.west,
    center.lat,
    bounds.east,
    center.lat
  );
  const heightMeters = measureDistanceMeters(
    center.lon,
    bounds.south,
    center.lon,
    bounds.north
  );

  if (centerMetric) {
    centerMetric.textContent = `${formatCoordinate(center.lat)}, ${formatCoordinate(center.lon)}`;
  }

  if (spanMetric) {
    spanMetric.textContent = `${formatDistanceKm(widthMeters / 1000)} x ${formatDistanceKm(
      heightMeters / 1000
    )}`;
  }

  return {
    center,
    widthMeters,
    heightMeters,
  };
}

function isInsideKorea(bounds) {
  if (!koreaRectangle) {
    return false;
  }

  const center = getCenter(bounds);
  return Cesium.Rectangle.contains(
    koreaRectangle,
    Cesium.Cartographic.fromDegrees(center.lon, center.lat)
  );
}

function createBaseLayer(bounds, offlineManifest = null) {
  if (preferVWorldImagery && vworldApiKey && isInsideKorea(bounds)) {
    return new Cesium.ImageryLayer(
      new Cesium.UrlTemplateImageryProvider({
        url: `https://api.vworld.kr/req/wmts/1.0.0/${vworldApiKey}/Satellite/{z}/{y}/{x}.jpeg`,
        credit: "VWorld",
        minimumLevel: 6,
        maximumLevel: 19,
        rectangle: buildRectangle(bounds),
      })
    );
  }

  if (offlineSatelliteTileUrl && !preferMapTilerImagery) {
    const satelliteSource = offlineManifest?.sources?.satellite ?? {};
    const tileUrl =
      resolveOfflineManifestAssetTemplate(
        offlineManifest,
        getOfflineTileTemplate(satelliteSource)
      ) || offlineSatelliteTileUrl;
    const tileSize = Math.max(
      16,
      Math.min(512, Math.floor(Number(satelliteSource.tileSize) || 256))
    );
    const { minZoom, maxZoom } = getOfflineTerrainZoomRange(
      offlineManifest,
      satelliteSource,
      0,
      19
    );
    const sourceBounds = getOfflineSourceBounds(
      offlineManifest,
      satelliteSource,
      bounds
    );
    const imageryBounds = intersectBounds(bounds, sourceBounds) ?? sourceBounds;
    const tileCoverage = createOfflineTileCoverage(
      offlineManifest,
      satelliteSource,
      sourceBounds,
      minZoom,
      maxZoom
    );
    const provider = new Cesium.UrlTemplateImageryProvider({
      url: tileUrl,
      credit: "Offline Map",
      tileWidth: tileSize,
      tileHeight: tileSize,
      hasAlphaChannel: false,
      minimumLevel: minZoom,
      maximumLevel: maxZoom,
      rectangle: buildRectangle(imageryBounds),
    });

    return new Cesium.ImageryLayer(
      guardOfflineImageryProvider(provider, tileCoverage, tileSize)
    );
  }

  if (mapTilerApiKey && !preferVWorldImagery) {
    return new Cesium.ImageryLayer(
      new Cesium.UrlTemplateImageryProvider({
        url: `https://api.maptiler.com/maps/satellite/{z}/{x}/{y}@2x.jpg?key=${mapTilerApiKey}`,
        credit: "MapTiler",
        tileWidth: 512,
        tileHeight: 512,
        hasAlphaChannel: false,
        rectangle: buildRectangle(bounds),
      })
    );
  }

  if (vworldApiKey && isInsideKorea(bounds)) {
    return new Cesium.ImageryLayer(
      new Cesium.UrlTemplateImageryProvider({
        url: `https://api.vworld.kr/req/wmts/1.0.0/${vworldApiKey}/Satellite/{z}/{y}/{x}.jpeg`,
        credit: "VWorld",
        minimumLevel: 6,
        maximumLevel: 19,
        rectangle: buildRectangle(bounds),
      })
    );
  }

  return new Cesium.ImageryLayer(
    new Cesium.OpenStreetMapImageryProvider({
      url: "https://tile.openstreetmap.org/",
    })
  );
}

function createFlatHeightmap(width, height) {
  return new Float32Array(width * height);
}

function getOfflineTileTemplate(source) {
  const tiles = source?.tiles;
  if (Array.isArray(tiles)) {
    return String(tiles[0] ?? "").trim();
  }

  return String(tiles ?? "").trim();
}

function resolveOfflineManifestAssetTemplate(manifest, value) {
  const text = String(value ?? "").trim();
  if (!text) {
    return "";
  }

  try {
    const assetUrl = new URL(
      text,
      manifest?.__manifestUrl ?? window.location.href
    );
    return `${assetUrl.pathname}${assetUrl.search}`
      .replace(/%7B/gi, "{")
      .replace(/%7D/gi, "}");
  } catch {
    return text.replace(/%7B/gi, "{").replace(/%7D/gi, "}");
  }
}

function formatOfflineTerrainTileUrl(template, x, y, level) {
  return template
    .replace(/\{z\}/g, String(level))
    .replace(/\{x\}/g, String(x))
    .replace(/\{y\}/g, String(y));
}

function getOfflineTerrainZoomRange(
  manifest,
  source,
  fallbackMinZoom = 0,
  fallbackMaxZoom = fallbackMinZoom
) {
  const minZoom = Math.max(
    0,
    Math.floor(
      parseFiniteNumber(source?.minzoom) ??
        parseFiniteNumber(manifest?.zoom?.min) ??
        fallbackMinZoom
    )
  );
  const maxZoom = Math.max(
    minZoom,
    Math.floor(
      parseFiniteNumber(source?.maxzoom) ??
        parseFiniteNumber(manifest?.zoom?.max) ??
        fallbackMaxZoom
    )
  );

  return {
    minZoom,
    maxZoom,
  };
}

function getOfflineSourceBounds(
  manifest,
  sourceOrFallbackBounds,
  fallbackBounds = null
) {
  const source =
    fallbackBounds === null || fallbackBounds === undefined
      ? null
      : sourceOrFallbackBounds;
  const resolvedFallback =
    fallbackBounds === null || fallbackBounds === undefined
      ? sourceOrFallbackBounds
      : fallbackBounds;
  const bounds = source?.bounds ?? manifest?.bounds;
  if (
    bounds &&
    parseFiniteNumber(bounds.west) !== null &&
    parseFiniteNumber(bounds.south) !== null &&
    parseFiniteNumber(bounds.east) !== null &&
    parseFiniteNumber(bounds.north) !== null
  ) {
    return normalizeBounds(bounds);
  }

  return normalizeBounds(resolvedFallback);
}

function intersectBounds(left, right) {
  const west = Math.max(left.west, right.west);
  const south = Math.max(left.south, right.south);
  const east = Math.min(left.east, right.east);
  const north = Math.min(left.north, right.north);

  if (west >= east || south >= north) {
    return null;
  }

  return normalizeBounds({
    west,
    south,
    east,
    north,
  });
}

function longitudeToMercatorTileX(longitude, level) {
  const scale = 2 ** level;
  return Math.floor(((longitude + 180) / 360) * scale);
}

function latitudeToMercatorTileY(latitude, level) {
  const clampedLatitude = clamp(latitude, -85.05112878, 85.05112878);
  const radians = Cesium.Math.toRadians(clampedLatitude);
  const scale = 2 ** level;
  return Math.floor(
    ((1 - Math.log(Math.tan(radians) + 1 / Math.cos(radians)) / Math.PI) / 2) *
      scale
  );
}

function getOfflineTileRangeForLevel(bounds, level) {
  const scale = 2 ** level;
  return {
    minX: clamp(
      longitudeToMercatorTileX(bounds.west + OFFLINE_TILE_BOUND_EPSILON, level),
      0,
      scale - 1
    ),
    maxX: clamp(
      longitudeToMercatorTileX(bounds.east - OFFLINE_TILE_BOUND_EPSILON, level),
      0,
      scale - 1
    ),
    minY: clamp(
      latitudeToMercatorTileY(bounds.north - OFFLINE_TILE_BOUND_EPSILON, level),
      0,
      scale - 1
    ),
    maxY: clamp(
      latitudeToMercatorTileY(bounds.south + OFFLINE_TILE_BOUND_EPSILON, level),
      0,
      scale - 1
    ),
  };
}

function createOfflineTileCoverage(
  manifest,
  source,
  fallbackBounds,
  minZoom,
  maxZoom
) {
  const bounds = getOfflineSourceBounds(manifest, source, fallbackBounds);
  const zoomRange =
    Number.isFinite(minZoom) && Number.isFinite(maxZoom)
      ? { minZoom, maxZoom }
      : getOfflineTerrainZoomRange(manifest, source);

  return {
    bounds,
    minZoom: zoomRange.minZoom,
    maxZoom: zoomRange.maxZoom,
  };
}

function isOfflineTileInsideCoverage(coverage, x, y, level) {
  if (!coverage || level < coverage.minZoom || level > coverage.maxZoom) {
    return false;
  }

  const range = getOfflineTileRangeForLevel(coverage.bounds, level);
  return (
    x >= range.minX && x <= range.maxX && y >= range.minY && y <= range.maxY
  );
}

function getOfflineBlankImageryTile(tileSize) {
  const key = String(tileSize);
  if (!offlineBlankImageryTileCache.has(key)) {
    const canvas = document.createElement("canvas");
    canvas.width = tileSize;
    canvas.height = tileSize;
    const context = canvas.getContext("2d");
    if (context) {
      context.fillStyle = "#061015";
      context.fillRect(0, 0, tileSize, tileSize);
    }
    offlineBlankImageryTileCache.set(key, canvas);
  }

  return offlineBlankImageryTileCache.get(key);
}

function guardOfflineImageryProvider(provider, coverage, tileSize) {
  const requestImage = provider.requestImage.bind(provider);
  provider.requestImage = (x, y, level, request) => {
    const fallbackTile = getOfflineBlankImageryTile(tileSize);
    if (!isOfflineTileInsideCoverage(coverage, x, y, level)) {
      return fallbackTile;
    }

    try {
      const result = requestImage(x, y, level, request);
      if (result === undefined) {
        return undefined;
      }
      if (typeof result?.then === "function") {
        return result.catch(() => fallbackTile);
      }
      return result;
    } catch {
      return fallbackTile;
    }
  };

  return provider;
}

async function loadOfflineTerrainManifestForCesium() {
  const manifestUrl = resolveOfflineMapManifestUrl();
  if (!manifestUrl) {
    return null;
  }

  if (!offlineTerrainManifestPromise) {
    offlineTerrainManifestPromise = (async () => {
      const response = await fetch(manifestUrl, { cache: "no-store" });
      if (!response.ok) {
        throw new Error(`Offline terrain manifest failed: ${response.status}`);
      }

      return {
        ...(await response.json()),
        __manifestUrl: new URL(manifestUrl, window.location.href).toString(),
      };
    })().catch((error) => {
      offlineTerrainManifestPromise = null;
      throw error;
    });
  }

  return offlineTerrainManifestPromise;
}

function loadImageFromBlob(blob) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const objectUrl = URL.createObjectURL(blob);

    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Offline terrain tile image decode failed."));
    };
    image.decoding = "async";
    image.src = objectUrl;
  });
}

async function createCanvasImageSource(blob) {
  if (typeof createImageBitmap === "function") {
    return createImageBitmap(blob);
  }

  return loadImageFromBlob(blob);
}

async function loadOfflineTerrariumImageData(url, width, height) {
  if (!offlineTerrariumTileCache.has(url)) {
    offlineTerrariumTileCache.set(
      url,
      (async () => {
        const response = await fetch(url, { cache: "force-cache" });
        const contentType = response.headers.get("content-type") ?? "";
        if (!response.ok || !/^image\//i.test(contentType)) {
          return null;
        }

        const blob = await response.blob();
        const image = await createCanvasImageSource(blob);
        try {
          if (image.width <= 1 || image.height <= 1) {
            return null;
          }

          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
          const context = canvas.getContext("2d", {
            willReadFrequently: true,
          });
          if (!context) {
            return null;
          }

          context.drawImage(image, 0, 0, width, height);
          return context.getImageData(0, 0, width, height);
        } finally {
          image.close?.();
        }
      })().catch((error) => {
        console.warn("Offline terrain tile failed to load.", error);
        return null;
      })
    );
  }

  return offlineTerrariumTileCache.get(url);
}

function decodeTerrariumHeightmap(imageData, width, height) {
  const pixels = imageData.data;
  const heights = new Float32Array(width * height);

  for (let index = 0; index < heights.length; index += 1) {
    const pixelIndex = index * 4;
    heights[index] =
      pixels[pixelIndex] * 256 +
      pixels[pixelIndex + 1] +
      pixels[pixelIndex + 2] / 256 -
      32768;
  }

  return heights;
}

function getOfflineTerrainHeightClampMeters(manifest, source) {
  const explicitClamp = parseFiniteNumber(source?.heightClampMeters);
  if (explicitClamp !== null && explicitClamp > 0) {
    return explicitClamp;
  }

  const sourceMax = parseFiniteNumber(source?.maxHeightMeters);
  const summaryMax = parseFiniteNumber(
    manifest?.generationSummary?.ngii?.terrainTiles?.heightMax ??
      manifest?.generationSummary?.ngii?.terrainTiles?.sampleHeightMax
  );
  const maxHeight = sourceMax ?? summaryMax;
  if (maxHeight !== null && maxHeight > 0) {
    return Math.max(24, maxHeight + 18);
  }

  return 240;
}

function getOfflineTerrainSmoothingPasses(source) {
  return clamp(
    Math.floor(parseFiniteNumber(source?.smoothingPasses) ?? 1),
    0,
    4
  );
}

function smoothHeightmap(heights, width, height, passes) {
  let current = heights;

  for (let pass = 0; pass < passes; pass += 1) {
    const next = new Float32Array(current.length);

    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        let weightedSum = current[y * width + x] * 4;
        let weightSum = 4;

        for (let dy = -1; dy <= 1; dy += 1) {
          const sampleY = y + dy;
          if (sampleY < 0 || sampleY >= height) {
            continue;
          }
          for (let dx = -1; dx <= 1; dx += 1) {
            if (dx === 0 && dy === 0) {
              continue;
            }
            const sampleX = x + dx;
            if (sampleX < 0 || sampleX >= width) {
              continue;
            }
            const isCardinal = dx === 0 || dy === 0;
            const weight = isCardinal ? 2 : 1;
            weightedSum += current[sampleY * width + sampleX] * weight;
            weightSum += weight;
          }
        }

        next[y * width + x] = weightedSum / weightSum;
      }
    }

    current = next;
  }

  return current;
}

function sanitizeOfflineHeightmap(heights, width, height, options = {}) {
  const minHeightMeters = parseFiniteNumber(options.minHeightMeters) ?? 0;
  const maxHeightMeters = Math.max(
    minHeightMeters,
    parseFiniteNumber(options.maxHeightMeters) ?? 240
  );
  const clamped = new Float32Array(heights.length);

  for (let index = 0; index < heights.length; index += 1) {
    const value = Number.isFinite(heights[index]) ? heights[index] : 0;
    clamped[index] = clamp(value, minHeightMeters, maxHeightMeters);
  }

  const smoothingPasses = Math.max(0, Math.floor(options.smoothingPasses ?? 0));
  if (smoothingPasses <= 0) {
    return clamped;
  }

  return smoothHeightmap(clamped, width, height, smoothingPasses);
}

function loadOfflineTerrariumHeightmap(url, width, height, options = {}) {
  const maxHeightMeters = parseFiniteNumber(options.maxHeightMeters);
  const smoothingPasses = Math.max(
    0,
    Math.floor(parseFiniteNumber(options.smoothingPasses) ?? 0)
  );
  const cacheKey = [
    `${url}|${width}x${height}`,
    `max:${maxHeightMeters ?? "raw"}`,
    `smooth:${smoothingPasses}`,
  ].join("|");
  if (!offlineTerrariumHeightmapCache.has(cacheKey)) {
    offlineTerrariumHeightmapCache.set(
      cacheKey,
      loadOfflineTerrariumImageData(url, width, height).then((imageData) => {
        if (!imageData) {
          return null;
        }

        const heightmap = decodeTerrariumHeightmap(imageData, width, height);
        if (maxHeightMeters === null && smoothingPasses <= 0) {
          return heightmap;
        }

        return sanitizeOfflineHeightmap(heightmap, width, height, {
          maxHeightMeters,
          smoothingPasses,
        });
      })
    );
  }

  return offlineTerrariumHeightmapCache.get(cacheKey);
}

function delay(ms) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

async function withWarmupTimeout(promise, timeoutMs, fallbackValue = null) {
  let timeoutId = null;
  try {
    return await Promise.race([
      promise,
      new Promise((resolve) => {
        timeoutId = window.setTimeout(() => resolve(fallbackValue), timeoutMs);
      }),
    ]);
  } finally {
    if (timeoutId !== null) {
      window.clearTimeout(timeoutId);
    }
  }
}

async function runWarmupQueue(items, worker, concurrency = 6) {
  const entries = [...items];
  let index = 0;
  const workerCount = Math.max(1, Math.min(concurrency, entries.length));
  await Promise.allSettled(
    Array.from({ length: workerCount }, async () => {
      while (index < entries.length) {
        const currentIndex = index;
        index += 1;
        try {
          await worker(entries[currentIndex], currentIndex);
        } catch (error) {
          console.debug("Terrain warmup item failed.", error);
        }
      }
    })
  );
}

async function preloadCachedFetchUrls(urls, concurrency = 6) {
  const uniqueUrls = [...new Set(urls.filter(Boolean))];
  await runWarmupQueue(
    uniqueUrls,
    async (url) => {
      const response = await fetch(url, { cache: "force-cache" });
      if (!response.ok) {
        throw new Error(`warmup fetch failed: ${response.status}`);
      }
    },
    concurrency
  );
}

function preloadImageUrl(url, timeoutMs = 2600) {
  return new Promise((resolve) => {
    let done = false;
    let timeoutId = null;
    const image = new Image();
    const finish = () => {
      if (done) {
        return;
      }
      done = true;
      if (timeoutId !== null) {
        window.clearTimeout(timeoutId);
      }
      resolve();
    };

    image.decoding = "async";
    image.onload = finish;
    image.onerror = finish;
    timeoutId = window.setTimeout(finish, timeoutMs);
    image.src = url;
  });
}

function orderTileCoordinatesByCenter(range, maxCount = 64) {
  const centerX = (range.minX + range.maxX) / 2;
  const centerY = (range.minY + range.maxY) / 2;
  const width = range.maxX - range.minX + 1;
  const height = range.maxY - range.minY + 1;
  const total = Math.max(0, width * height);
  if (total > maxCount * 6) {
    const coordinates = [];
    const originX = clamp(Math.round(centerX), range.minX, range.maxX);
    const originY = clamp(Math.round(centerY), range.minY, range.maxY);
    const maxRadius = Math.max(width, height);

    for (
      let radius = 0;
      radius <= maxRadius && coordinates.length < maxCount;
      radius += 1
    ) {
      for (
        let x = originX - radius;
        x <= originX + radius && coordinates.length < maxCount;
        x += 1
      ) {
        for (
          let y = originY - radius;
          y <= originY + radius && coordinates.length < maxCount;
          y += 1
        ) {
          if (
            x < range.minX ||
            x > range.maxX ||
            y < range.minY ||
            y > range.maxY ||
            (radius > 0 &&
              Math.abs(x - originX) < radius &&
              Math.abs(y - originY) < radius)
          ) {
            continue;
          }
          coordinates.push({ x, y });
        }
      }
    }

    return coordinates;
  }

  const coordinates = [];

  for (let x = range.minX; x <= range.maxX; x += 1) {
    for (let y = range.minY; y <= range.maxY; y += 1) {
      coordinates.push({ x, y });
    }
  }

  return coordinates
    .sort((left, right) => {
      const leftDistance =
        Math.abs(left.x - centerX) + Math.abs(left.y - centerY);
      const rightDistance =
        Math.abs(right.x - centerX) + Math.abs(right.y - centerY);
      return leftDistance - rightDistance;
    })
    .slice(0, maxCount);
}

function collectOfflineTileWarmupUrls(manifest, source, bounds, options = {}) {
  if (!manifest || !source || source.enabled === false) {
    return [];
  }

  const tileTemplate = resolveOfflineManifestAssetTemplate(
    manifest,
    getOfflineTileTemplate(source)
  );
  if (!tileTemplate) {
    return [];
  }

  const { minZoom, maxZoom } = getOfflineTerrainZoomRange(
    manifest,
    source,
    options.fallbackMinZoom ?? 0,
    options.fallbackMaxZoom ?? 0
  );
  const sourceBounds = getOfflineSourceBounds(manifest, source, bounds);
  const targetBounds = intersectBounds(bounds, sourceBounds) ?? sourceBounds;
  const startLevel = Math.max(minZoom, maxZoom - (options.levelSpan ?? 2));
  const maxCount = Math.max(0, Number(options.maxCount) || 48);
  const urls = [];

  for (
    let level = startLevel;
    level <= maxZoom && urls.length < maxCount;
    level += 1
  ) {
    const range = getOfflineTileRangeForLevel(targetBounds, level);
    const coordinates = orderTileCoordinatesByCenter(
      range,
      maxCount - urls.length
    );
    for (const coordinate of coordinates) {
      urls.push(
        formatOfflineTerrainTileUrl(
          tileTemplate,
          coordinate.x,
          coordinate.y,
          level
        )
      );
      if (urls.length >= maxCount) {
        break;
      }
    }
  }

  return urls;
}

async function preloadOfflineTerrainTiles(manifest, bounds) {
  const source = manifest?.sources?.terrainDem;
  const urls = collectOfflineTileWarmupUrls(manifest, source, bounds, {
    levelSpan: 2,
    maxCount: 42,
  });
  if (urls.length === 0) {
    return;
  }

  const tileSize = Math.max(
    16,
    Math.min(512, Math.floor(Number(source?.tileSize) || 256))
  );
  const maxHeightMeters = getOfflineTerrainHeightClampMeters(manifest, source);
  const smoothingPasses = getOfflineTerrainSmoothingPasses(source);
  await runWarmupQueue(
    urls,
    (url) =>
      loadOfflineTerrariumHeightmap(url, tileSize, tileSize, {
        maxHeightMeters,
        smoothingPasses,
      }),
    4
  );
}

async function preloadOfflineImageryTiles(manifest, bounds) {
  const source = manifest?.sources?.satellite;
  const urls = collectOfflineTileWarmupUrls(manifest, source, bounds, {
    fallbackMaxZoom: 19,
    levelSpan: 2,
    maxCount: 42,
  });
  if (urls.length === 0) {
    return;
  }

  await preloadCachedFetchUrls(urls, 6);
}

async function preloadVWorldImageryTiles(bounds) {
  if (!vworldApiKey || !isInsideKorea(bounds)) {
    return;
  }

  const urls = [];
  for (let level = 14; level <= 17 && urls.length < 64; level += 1) {
    const range = getOfflineTileRangeForLevel(bounds, level);
    const coordinates = orderTileCoordinatesByCenter(range, 64 - urls.length);
    for (const coordinate of coordinates) {
      urls.push(
        `https://api.vworld.kr/req/wmts/1.0.0/${vworldApiKey}/Satellite/${level}/${coordinate.y}/${coordinate.x}.jpeg`
      );
      if (urls.length >= 64) {
        break;
      }
    }
  }

  await runWarmupQueue(urls, (url) => preloadImageUrl(url), 8);
}

async function waitForRuntimeSnapshot(placementRuntime, timeoutMs = 900) {
  const startedAt = performance.now();
  while (performance.now() - startedAt < timeoutMs) {
    const snapshot =
      placementRuntime?.getLastSnapshot?.() ?? viewerState.runtimeSnapshot;
    if (snapshot && typeof snapshot === "object") {
      return snapshot;
    }
    await delay(50);
  }

  return placementRuntime?.getLastSnapshot?.() ?? viewerState.runtimeSnapshot;
}

async function preloadRuntimeSnapshotAssets(snapshot, bounds) {
  if (!snapshot) {
    return;
  }

  const urls = collectRuntimeSnapshotPreloadUrls(snapshot, bounds, {
    maxUnits: 240,
    maxWeapons: 160,
  }).map((url) =>
    url.startsWith("/") ? resolveTerrainViewerPublicPath(url) : url
  );
  await preloadCachedFetchUrls(urls.slice(0, 112), 6);
}

function waitForCesiumTileQueueIdle(viewer, timeoutMs = 1400) {
  return new Promise((resolve) => {
    const event = viewer?.scene?.globe?.tileLoadProgressEvent;
    const startedAt = performance.now();
    const minWaitMs = Math.min(2200, Math.max(0, timeoutMs * 0.35));
    if (!event || typeof event.addEventListener !== "function") {
      window.setTimeout(resolve, Math.min(timeoutMs, minWaitMs || 300));
      return;
    }

    let done = false;
    let cleanup = null;
    let pollId = null;
    const finish = () => {
      if (done) {
        return;
      }
      done = true;
      cleanup?.();
      if (pollId !== null) {
        window.clearInterval(pollId);
      }
      resolve();
    };
    const maybeFinish = (queueLength) => {
      if (queueLength === 0 && performance.now() - startedAt >= minWaitMs) {
        finish();
      }
    };
    cleanup = event.addEventListener((queueLength) => {
      maybeFinish(queueLength);
    });
    pollId = window.setInterval(() => {
      viewer?.scene?.requestRender?.();
      if (viewer?.scene?.globe?.tilesLoaded) {
        maybeFinish(0);
      }
    }, 180);
    window.setTimeout(() => {
      maybeFinish(viewer?.scene?.globe?.tilesLoaded ? 0 : Number.NaN);
    });
    window.setTimeout(finish, timeoutMs);
  });
}

async function warmupInitialTerrainRuntime({
  viewer,
  bounds,
  offlineManifest,
  placementRuntime,
}) {
  setLoadingState(
    "3D 지형 선로딩 중",
    "초기 지형 타일, 영상 타일, 전장 모델을 캐시에 올리는 중입니다."
  );

  const snapshot = await waitForRuntimeSnapshot(placementRuntime);
  const warmupTasks = [
    preloadRuntimeSnapshotAssets(snapshot, bounds),
    isOfflineTerrainMode()
      ? preloadOfflineTerrainTiles(offlineManifest, bounds)
      : Promise.resolve(),
    preferVWorldImagery
      ? preloadVWorldImageryTiles(bounds)
      : isOfflineTerrainMode()
        ? preloadOfflineImageryTiles(offlineManifest, bounds)
        : Promise.resolve(),
  ];

  const globe = viewer.scene?.globe;
  if (globe) {
    globe.preloadSiblings = true;
    if ("preloadAncestors" in globe) {
      globe.preloadAncestors = true;
    }
  }
  viewer.scene?.requestRender?.();

  await Promise.allSettled(
    warmupTasks.map((task) => withWarmupTimeout(task, 2600))
  );
  await withWarmupTimeout(
    waitForCesiumTileQueueIdle(viewer, preferVWorldImagery ? 6800 : 1500),
    preferVWorldImagery ? 7000 : 1700
  );
}

async function createOfflineTerrariumTerrainProvider(preloadedManifest = null) {
  if (
    !Cesium?.CustomHeightmapTerrainProvider ||
    !Cesium?.WebMercatorTilingScheme
  ) {
    return null;
  }

  const manifest =
    preloadedManifest ?? (await loadOfflineTerrainManifestForCesium());
  const terrainSource = manifest?.sources?.terrainDem;
  const encoding = String(terrainSource?.encoding ?? "terrarium").toLowerCase();
  const tileTemplate = resolveOfflineManifestAssetTemplate(
    manifest,
    getOfflineTileTemplate(terrainSource)
  );

  if (
    !terrainSource ||
    terrainSource.enabled === false ||
    encoding !== "terrarium" ||
    !tileTemplate
  ) {
    return null;
  }

  const tileSize = Math.max(
    16,
    Math.min(512, Math.floor(Number(terrainSource.tileSize) || 256))
  );
  const { minZoom, maxZoom } = getOfflineTerrainZoomRange(
    manifest,
    terrainSource
  );
  const tileCoverage = createOfflineTileCoverage(
    manifest,
    terrainSource,
    manifest?.bounds,
    minZoom,
    maxZoom
  );
  const maxHeightMeters = getOfflineTerrainHeightClampMeters(
    manifest,
    terrainSource
  );
  const smoothingPasses = getOfflineTerrainSmoothingPasses(terrainSource);

  const provider = new Cesium.CustomHeightmapTerrainProvider({
    width: tileSize,
    height: tileSize,
    tilingScheme: new Cesium.WebMercatorTilingScheme(),
    credit: "Offline Terrarium DEM",
    callback: async (x, y, level) => {
      if (level < minZoom) {
        return createFlatHeightmap(tileSize, tileSize);
      }
      if (level > maxZoom) {
        return createFlatHeightmap(tileSize, tileSize);
      }
      if (!isOfflineTileInsideCoverage(tileCoverage, x, y, level)) {
        return createFlatHeightmap(tileSize, tileSize);
      }

      const tileUrl = formatOfflineTerrainTileUrl(tileTemplate, x, y, level);
      const heightmap = await loadOfflineTerrariumHeightmap(
        tileUrl,
        tileSize,
        tileSize,
        {
          maxHeightMeters,
          smoothingPasses,
        }
      );

      if (!heightmap) {
        return createFlatHeightmap(tileSize, tileSize);
      }

      return heightmap;
    },
  });
  provider.__vistaOfflineTerrainSampleLevel = maxZoom;
  provider.__vistaOfflineTerrainHeightClampMeters = maxHeightMeters;
  return provider;
}

async function createTerrainProvider(preloadedManifest = null) {
  if (isOfflineTerrainMode()) {
    try {
      const offlineTerrainProvider =
        await createOfflineTerrariumTerrainProvider(preloadedManifest);
      if (offlineTerrainProvider) {
        return {
          provider: offlineTerrainProvider,
          providerLabel: "오프라인 고도",
          hasTerrain: true,
        };
      }
    } catch (error) {
      console.warn(
        "Failed to initialize offline Terrarium terrain provider.",
        error
      );
    }

    return {
      provider: new Cesium.EllipsoidTerrainProvider(),
      providerLabel: "오프라인 영상",
      hasTerrain: false,
    };
  }

  if (!mapTilerTerrainUrl) {
    return {
      provider: new Cesium.EllipsoidTerrainProvider(),
      providerLabel: "영상 전용",
      hasTerrain: false,
    };
  }

  try {
    const provider = await Cesium.CesiumTerrainProvider.fromUrl(
      mapTilerTerrainUrl,
      {
        requestVertexNormals: true,
      }
    );
    return {
      provider,
      providerLabel: "MapTiler Terrain",
      hasTerrain: true,
    };
  } catch (error) {
    console.warn(
      "Failed to initialize terrain provider. Falling back to ellipsoid.",
      error
    );
    return {
      provider: new Cesium.EllipsoidTerrainProvider(),
      providerLabel: "영상 전용",
      hasTerrain: false,
    };
  }
}

let vworldBuildingsTileset = null;
let vworldBuildingsPromise = null;
let offlineTilesetsPromise = null;
const offlineTilesetPrimitives = [];

function shouldAttachVWorldBuildings(bounds) {
  return Boolean(
    vworldBuildingsRequested &&
      Cesium?.Cesium3DTileset &&
      bounds &&
      isInsideKorea(bounds)
  );
}

function tuneVWorldBuildingsTileset(tileset) {
  if (!tileset) {
    return;
  }

  tileset.maximumScreenSpaceError = 5;
  tileset.dynamicScreenSpaceError = false;
  tileset.skipLevelOfDetail = false;
  tileset.preferLeaves = true;
  tileset.show = true;
  if (typeof Cesium.Cesium3DTileStyle === "function") {
    tileset.style = new Cesium.Cesium3DTileStyle({
      color: `color('#9bc7bb', ${vworldBuildingsOpacity.toFixed(2)})`,
    });
  }
  if ("cacheBytes" in tileset) {
    tileset.cacheBytes = 192 * 1024 * 1024;
  }
  if ("maximumCacheOverflowBytes" in tileset) {
    tileset.maximumCacheOverflowBytes = 96 * 1024 * 1024;
  }
}

async function createVWorldBuildingsTileset() {
  if (typeof Cesium.Cesium3DTileset.fromUrl === "function") {
    return Cesium.Cesium3DTileset.fromUrl(VWORLD_3D_BUILDINGS_TILESET_URL, {
      maximumScreenSpaceError: 5,
      dynamicScreenSpaceError: false,
      skipLevelOfDetail: false,
      preferLeaves: true,
    });
  }

  return new Cesium.Cesium3DTileset({
    url: VWORLD_3D_BUILDINGS_TILESET_URL,
    maximumScreenSpaceError: 5,
    dynamicScreenSpaceError: false,
    skipLevelOfDetail: false,
    preferLeaves: true,
  });
}

async function attachVWorldBuildingsTileset(viewer, bounds) {
  if (!shouldAttachVWorldBuildings(bounds)) {
    return null;
  }

  if (vworldBuildingsTileset || vworldBuildingsPromise) {
    return vworldBuildingsPromise ?? vworldBuildingsTileset;
  }

  viewerState.vworldBuildings = {
    requested: true,
    ready: false,
    lastError: null,
  };
  setStatusMessage("VWorld 3D 시설 레이어를 불러오는 중입니다.");

  vworldBuildingsPromise = createVWorldBuildingsTileset()
    .then((tileset) => {
      vworldBuildingsTileset = viewer.scene.primitives.add(tileset);
      tuneVWorldBuildingsTileset(vworldBuildingsTileset);

      vworldBuildingsTileset.tileLoad?.addEventListener?.(() => {
        viewer.scene.requestRender();
      });
      vworldBuildingsTileset.initialTilesLoaded?.addEventListener?.(() => {
        viewerState.vworldBuildings.ready = true;
        setProviderBadge("VWorld 3D");
        setStatusMessage("VWorld 3D 시설과 지형 위에 CDE 반구를 표시합니다.");
        viewer.scene.requestRender();
      });

      viewerState.vworldBuildings.ready = true;
      setProviderBadge("VWorld 3D");
      viewer.scene.requestRender();
      return vworldBuildingsTileset;
    })
    .catch((error) => {
      const lastError =
        error instanceof Error ? error.message : "vworld-buildings-failed";
      console.warn("Failed to load VWorld 3D buildings tileset.", error);
      viewerState.vworldBuildings = {
        requested: true,
        ready: false,
        lastError,
      };
      setStatusMessage(
        "VWorld 3D 시설을 불러오지 못해 지형/영상만 표시합니다."
      );
      return null;
    })
    .finally(() => {
      vworldBuildingsPromise = null;
    });

  return vworldBuildingsPromise;
}

function getOfflineTilesetLoadPlan(manifest) {
  if (!isOfflineTerrainMode() || !Cesium?.Cesium3DTileset || !manifest) {
    return [];
  }

  try {
    return buildOfflineTilesetLoadPlan(manifest);
  } catch (error) {
    console.warn("Failed to parse offline 3D Tiles manifest entries.", error);
    return [];
  }
}

function tuneOfflineTileset(tileset, entry) {
  if (!tileset || !entry) {
    return;
  }

  tileset.maximumScreenSpaceError = entry.maximumScreenSpaceError;
  tileset.dynamicScreenSpaceError = entry.dynamicScreenSpaceError;
  tileset.skipLevelOfDetail = entry.skipLevelOfDetail;
  tileset.preferLeaves = entry.preferLeaves;
  tileset.show = entry.show !== false;

  if (
    typeof entry.opacity === "number" &&
    entry.opacity < 1 &&
    typeof Cesium.Cesium3DTileStyle === "function"
  ) {
    const color = /^#[0-9a-f]{6}$/i.test(entry.color) ? entry.color : "#9bc7bb";
    tileset.style = new Cesium.Cesium3DTileStyle({
      color: `color('${color}', ${entry.opacity.toFixed(2)})`,
    });
  }
  if ("cacheBytes" in tileset) {
    tileset.cacheBytes = entry.cacheBytes;
  }
  if ("maximumCacheOverflowBytes" in tileset) {
    tileset.maximumCacheOverflowBytes = entry.maximumCacheOverflowBytes;
  }
}

async function createOfflineTileset(entry) {
  const options = {
    maximumScreenSpaceError: entry.maximumScreenSpaceError,
    dynamicScreenSpaceError: entry.dynamicScreenSpaceError,
    skipLevelOfDetail: entry.skipLevelOfDetail,
    preferLeaves: entry.preferLeaves,
  };

  if (typeof Cesium.Cesium3DTileset.fromUrl === "function") {
    return Cesium.Cesium3DTileset.fromUrl(entry.url, options);
  }

  return new Cesium.Cesium3DTileset({
    url: entry.url,
    ...options,
  });
}

async function attachOfflineTilesets(viewer, manifest) {
  const loadPlan = getOfflineTilesetLoadPlan(manifest);
  if (loadPlan.length === 0) {
    viewerState.offlineTilesets = {
      requested: false,
      ready: false,
      loaded: [],
      lastError: null,
    };
    return null;
  }

  if (offlineTilesetPrimitives.length > 0 || offlineTilesetsPromise) {
    return offlineTilesetsPromise ?? offlineTilesetPrimitives;
  }

  viewerState.offlineTilesets = {
    requested: true,
    ready: false,
    loaded: [],
    lastError: null,
  };
  setStatusMessage("로컬 3D Tiles 도시/시설 레이어를 불러오는 중입니다.");

  offlineTilesetsPromise = Promise.all(
    loadPlan.map(async (entry) => {
      try {
        const tileset = await createOfflineTileset(entry);
        const primitive = viewer.scene.primitives.add(tileset);
        tuneOfflineTileset(primitive, entry);

        primitive.tileLoad?.addEventListener?.(() => {
          viewer.scene.requestRender();
        });
        primitive.initialTilesLoaded?.addEventListener?.(() => {
          viewer.scene.requestRender();
        });

        offlineTilesetPrimitives.push(primitive);
        return {
          status: "fulfilled",
          entry,
          primitive,
        };
      } catch (error) {
        console.warn("Failed to load offline 3D Tiles tileset.", {
          entry,
          error,
        });
        return {
          status: "rejected",
          entry,
          error,
        };
      }
    })
  )
    .then((results) => {
      const loaded = results.filter((result) => result.status === "fulfilled");
      const failed = results.filter((result) => result.status === "rejected");
      const lastError = failed
        .map((result) =>
          result.error instanceof Error
            ? `${result.entry.label}: ${result.error.message}`
            : `${result.entry.label}: offline-tileset-failed`
        )
        .join("; ");

      viewerState.offlineTilesets = {
        requested: true,
        ready: loaded.length > 0,
        loaded: loaded.map((result) => ({
          id: result.entry.id,
          label: result.entry.label,
          url: result.entry.url,
        })),
        lastError: lastError || null,
      };

      if (loaded.length > 0) {
        setProviderBadge("로컬 3D Tiles");
        setStatusMessage(
          `로컬 3D Tiles ${loaded.length.toLocaleString(
            "ko-KR"
          )}개를 지형 위에 중첩했습니다.`
        );
      } else {
        setStatusMessage("로컬 3D Tiles를 불러오지 못했습니다.");
      }

      viewer.scene.requestRender();
      return loaded.map((result) => result.primitive);
    })
    .finally(() => {
      offlineTilesetsPromise = null;
    });

  return offlineTilesetsPromise;
}

function estimateRangeMeters(widthMeters, heightMeters) {
  if (
    Number.isFinite(terrainCameraRangeMeters) &&
    terrainCameraRangeMeters > 0
  ) {
    return terrainCameraRangeMeters;
  }

  const dominantSpan = Math.max(widthMeters, heightMeters, 200);
  return Math.max(
    dominantSpan * 2.6 * terrainCameraRangeScale,
    900 * terrainCameraRangeScale
  );
}

function installBalancedRequestRenderLimiter(viewer) {
  if (!terrainBalancedPerformanceMode) {
    return;
  }

  const scene = viewer?.scene;
  if (
    !scene ||
    typeof scene.requestRender !== "function" ||
    scene.__vistaBalancedRequestRenderLimiterInstalled
  ) {
    return;
  }

  const requestRenderNow = scene.requestRender.bind(scene);
  let scheduledTimeoutId = null;
  let lastRequestRenderAt = -Infinity;

  const flushRequestRender = () => {
    scheduledTimeoutId = null;
    lastRequestRenderAt = performance.now();
    requestRenderNow();
  };

  scene.requestRender = () => {
    const now = performance.now();
    const intervalMs = document.hidden
      ? TERRAIN_HIDDEN_REQUEST_RENDER_INTERVAL_MS
      : TERRAIN_BALANCED_REQUEST_RENDER_INTERVAL_MS;
    const waitMs = intervalMs - (now - lastRequestRenderAt);

    if (waitMs <= 0) {
      if (scheduledTimeoutId !== null) {
        window.clearTimeout(scheduledTimeoutId);
        scheduledTimeoutId = null;
      }
      lastRequestRenderAt = now;
      requestRenderNow();
      return;
    }

    if (scheduledTimeoutId === null) {
      scheduledTimeoutId = window.setTimeout(flushRequestRender, waitMs);
    }
  };
  scene.__vistaBalancedRequestRenderLimiterInstalled = true;
}

function configureViewer(viewer, limitRectangle, widthMeters, heightMeters) {
  const offlineMode = isOfflineTerrainMode();
  installBalancedRequestRenderLimiter(viewer);
  viewer.scene.requestRenderMode = true;
  viewer.scene.maximumRenderTimeChange = Number.POSITIVE_INFINITY;
  viewer.scene.globe.cartographicLimitRectangle = limitRectangle;
  viewer.scene.globe.depthTestAgainstTerrain = true;
  viewer.scene.globe.baseColor = Cesium.Color.fromCssColorString("#061015");
  viewer.scene.globe.showGroundAtmosphere = false;
  viewer.scene.globe.maximumScreenSpaceError = terrainBalancedPerformanceMode
    ? offlineMode
      ? 2.2
      : 3.2
    : offlineMode
      ? 1.15
      : 2.4;
  viewer.scene.globe.tileCacheSize = terrainBalancedPerformanceMode ? 384 : 768;
  viewer.scene.globe.preloadSiblings = false;
  if ("verticalExaggeration" in viewer.scene) {
    viewer.scene.verticalExaggeration = terrainVerticalExaggeration;
  }
  if ("verticalExaggerationRelativeHeight" in viewer.scene) {
    viewer.scene.verticalExaggerationRelativeHeight = 0;
  }
  if (viewer.scene.skyBox) {
    viewer.scene.skyBox.show = false;
  }
  viewer.scene.skyAtmosphere.show = false;
  viewer.scene.fog.enabled = false;
  viewer.scene.backgroundColor = Cesium.Color.TRANSPARENT;
  viewer.shadows = false;
  viewer.resolutionScale = terrainBalancedPerformanceMode
    ? offlineMode
      ? 0.72
      : Math.min(window.devicePixelRatio || 1, 0.9)
    : offlineMode
      ? 0.9
      : Math.min(window.devicePixelRatio || 1, 1.25);
  if (viewer.scene.postProcessStages?.fxaa) {
    viewer.scene.postProcessStages.fxaa.enabled =
      !terrainBalancedPerformanceMode;
  }

  const controller = viewer.scene.screenSpaceCameraController;
  controller.minimumZoomDistance = Math.min(
    36,
    Math.max(12, Math.min(widthMeters, heightMeters) * 0.002)
  );
  controller.maximumZoomDistance =
    Math.max(widthMeters, heightMeters) * 20 + 4000;
  controller.enableCollisionDetection = true;
  controller.inertiaSpin = 0.65;
  controller.inertiaTranslate = 0.65;
  controller.inertiaZoom = 0.55;
  controller.maximumTiltAngle =
    Cesium.Math.PI_OVER_TWO - Cesium.Math.toRadians(5);

  viewer.cesiumWidget.screenSpaceEventHandler.removeInputAction(
    Cesium.ScreenSpaceEventType.LEFT_DOUBLE_CLICK
  );

  const creditContainer = viewer.cesiumWidget.creditContainer;
  if (creditContainer) {
    creditContainer.style.display = "none";
  }
}

function addSelectionOverlay(viewer, bounds) {
  viewer.entities.add({
    polyline: {
      positions: Cesium.Cartesian3.fromDegreesArray([
        bounds.west,
        bounds.south,
        bounds.east,
        bounds.south,
        bounds.east,
        bounds.north,
        bounds.west,
        bounds.north,
        bounds.west,
        bounds.south,
      ]),
      clampToGround: true,
      width: 3,
      material: Cesium.Color.fromCssColorString("#7fe7ff"),
    },
  });

  const center = getCenter(bounds);
  viewer.entities.add({
    position: Cesium.Cartesian3.fromDegrees(center.lon, center.lat),
    point: {
      pixelSize: 8,
      color: Cesium.Color.fromCssColorString("#d0fbff"),
      outlineColor: Cesium.Color.fromCssColorString("#0a1b21"),
      outlineWidth: 2,
      disableDepthTestDistance: Number.POSITIVE_INFINITY,
    },
  });
}

function getTerrainCameraFocus(bounds) {
  if (
    Number.isFinite(terrainFocusLon) &&
    Number.isFinite(terrainFocusLat) &&
    terrainFocusLon >= bounds.west &&
    terrainFocusLon <= bounds.east &&
    terrainFocusLat >= bounds.south &&
    terrainFocusLat <= bounds.north
  ) {
    return {
      lon: terrainFocusLon,
      lat: terrainFocusLat,
    };
  }

  return getCenter(bounds);
}

function flyToObliqueView(
  viewer,
  bounds,
  widthMeters,
  heightMeters,
  duration = 0.9
) {
  const cameraFocus = getTerrainCameraFocus(bounds);
  const range = estimateRangeMeters(widthMeters, heightMeters);
  const boundingSphere = new Cesium.BoundingSphere(
    Cesium.Cartesian3.fromDegrees(cameraFocus.lon, cameraFocus.lat, 0),
    Math.max(120, Math.min(range * 0.22, 920))
  );

  viewer.camera.flyToBoundingSphere(boundingSphere, {
    duration,
    offset: new Cesium.HeadingPitchRange(
      Cesium.Math.toRadians(terrainCameraHeadingDeg),
      Cesium.Math.toRadians(terrainCameraPitchDeg),
      range
    ),
  });
}

function flyToTopView(viewer, bounds, duration = 0.9) {
  viewer.camera.flyTo({
    destination: buildRectangle(expandBounds(bounds, 0.12, 0.001)),
    duration,
    orientation: {
      heading: 0,
      pitch: -Cesium.Math.PI_OVER_TWO,
      roll: 0,
    },
  });
}

function getTerrainCameraAutoRotateDefaultRange() {
  const bounds = viewerState.renderableBounds ?? viewerState.bounds;
  const center = bounds ? getCenter(bounds) : null;
  const widthMeters =
    bounds && center
      ? measureDistanceMeters(bounds.west, center.lat, bounds.east, center.lat)
      : viewerState.widthMeters;
  const heightMeters =
    bounds && center
      ? measureDistanceMeters(
          center.lon,
          bounds.south,
          center.lon,
          bounds.north
        )
      : viewerState.heightMeters;

  return Math.max(
    estimateRangeMeters(widthMeters, heightMeters) *
      TERRAIN_CAMERA_AUTO_ROTATE_RANGE_SCALE,
    TERRAIN_CAMERA_AUTO_ROTATE_MIN_RANGE_METERS
  );
}

function getTerrainCameraAutoRotateCameraRange(viewer, center) {
  const cameraPosition = viewer?.camera?.positionWC || viewer?.camera?.position;
  if (!cameraPosition || !center) {
    return null;
  }

  const range = Cesium.Cartesian3.distance(cameraPosition, center);
  return Number.isFinite(range) && range > 0 ? range : null;
}

function buildTerrainCameraAutoRotateState(viewer) {
  const bounds = viewerState.renderableBounds ?? viewerState.bounds;
  if (!viewer || !bounds) {
    return null;
  }

  const center = getCenter(bounds);
  const centerCartesian = Cesium.Cartesian3.fromDegrees(
    center.lon,
    center.lat,
    0
  );
  const defaultRange = getTerrainCameraAutoRotateDefaultRange();
  const range = defaultRange;
  const heading = Number.isFinite(viewer.camera?.heading)
    ? viewer.camera.heading
    : Cesium.Math.toRadians(24);

  return {
    center: centerCartesian,
    heading,
    pitch: TERRAIN_CAMERA_AUTO_ROTATE_PITCH_RAD,
    range,
    hasAppliedCameraPose: false,
    lastFrameAtMs: performance.now(),
  };
}

function syncTerrainCameraAutoRotateRange(viewer, state) {
  if (!state?.hasAppliedCameraPose) {
    return;
  }

  const currentRange = getTerrainCameraAutoRotateCameraRange(
    viewer,
    state.center
  );
  if (!currentRange) {
    return;
  }

  const controller = viewer.scene?.screenSpaceCameraController;
  const minRange = Math.max(
    TERRAIN_CAMERA_AUTO_ROTATE_MIN_RANGE_METERS * 0.35,
    Number(controller?.minimumZoomDistance) || 0
  );
  const maxRange = Number(controller?.maximumZoomDistance) || currentRange;
  state.range = Math.min(Math.max(currentRange, minRange), maxRange);
}

function stopTerrainCameraAutoRotate() {
  if (terrainCameraAutoRotateFrameId !== null) {
    window.cancelAnimationFrame(terrainCameraAutoRotateFrameId);
    terrainCameraAutoRotateFrameId = null;
  }

  terrainCameraAutoRotateState = null;
  const viewer = viewerState.viewer;
  viewer?.camera?.lookAtTransform?.(Cesium.Matrix4.IDENTITY);
  viewer?.scene?.requestRender?.();
}

function stepTerrainCameraAutoRotate() {
  const viewer = viewerState.viewer;
  if (!viewer || !viewerState.visualOptions.autoRotateCamera) {
    stopTerrainCameraAutoRotate();
    return;
  }

  if (!terrainCameraAutoRotateState) {
    terrainCameraAutoRotateState = buildTerrainCameraAutoRotateState(viewer);
  }

  const state = terrainCameraAutoRotateState;
  if (!state) {
    return;
  }

  const now = performance.now();
  const deltaMs = Math.min(48, Math.max(0, now - state.lastFrameAtMs));
  state.lastFrameAtMs = now;
  syncTerrainCameraAutoRotateRange(viewer, state);
  state.heading =
    (state.heading + deltaMs * TERRAIN_CAMERA_AUTO_ROTATE_SPEED_RAD_PER_MS) %
    Cesium.Math.TWO_PI;

  viewer.camera.lookAt(
    state.center,
    new Cesium.HeadingPitchRange(state.heading, state.pitch, state.range)
  );
  viewer.camera.lookAtTransform(Cesium.Matrix4.IDENTITY);
  state.hasAppliedCameraPose = true;
  viewer.scene.requestRender();

  terrainCameraAutoRotateFrameId = window.requestAnimationFrame(
    stepTerrainCameraAutoRotate
  );
}

function startTerrainCameraAutoRotate() {
  const viewer = viewerState.viewer;
  if (!viewer || terrainCameraAutoRotateFrameId !== null) {
    return;
  }

  terrainCameraAutoRotateState = buildTerrainCameraAutoRotateState(viewer);
  if (!terrainCameraAutoRotateState) {
    return;
  }

  terrainCameraAutoRotateFrameId = window.requestAnimationFrame(
    stepTerrainCameraAutoRotate
  );
}

function wireViewButtons(viewer, bounds, widthMeters, heightMeters) {
  obliqueViewButton?.addEventListener("click", () => {
    flyToObliqueView(viewer, bounds, widthMeters, heightMeters);
  });

  topViewButton?.addEventListener("click", () => {
    flyToTopView(viewer, bounds);
  });

  resetViewButton?.addEventListener("click", () => {
    flyToObliqueView(viewer, bounds, widthMeters, heightMeters);
  });
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function renderIntelLayerControls() {
  if (!intelLayerList) {
    return;
  }

  intelLayerList.innerHTML = "";
  for (const layerDef of TERRAIN_INTEL_LAYER_DEFS) {
    const layerResult = viewerState.layerResults.find(
      (result) => result.key === layerDef.key
    );
    const button = document.createElement("button");
    button.type = "button";
    button.className = "terrain-layer-toggle";
    button.setAttribute(
      "aria-pressed",
      viewerState.layerSelection[layerDef.key] === true ? "true" : "false"
    );
    if (viewerState.layerSelection[layerDef.key] === true) {
      button.classList.add("is-active");
    }
    button.disabled = viewerState.busy.layers;
    button.addEventListener("click", () => {
      if (viewerState.busy.layers) {
        return;
      }
      viewerState.layerSelection[layerDef.key] =
        viewerState.layerSelection[layerDef.key] !== true;
      renderIntelLayerControls();
      if (viewerState.viewer) {
        refreshTerrainIntelLayers(viewerState.viewer);
      }
    });

    const indicator = document.createElement("span");
    indicator.className = "terrain-layer-indicator";
    indicator.setAttribute("aria-hidden", "true");

    const copy = document.createElement("div");
    copy.className = "terrain-layer-copy";
    copy.innerHTML = `<strong>${escapeHtml(layerDef.label)}</strong>`;

    const meta = document.createElement("div");
    meta.className = "terrain-layer-meta";
    meta.innerHTML = `<span class="terrain-layer-count">${
      layerResult?.status === "ready"
        ? `${layerResult.featureCount.toLocaleString("ko-KR")}건`
        : "-"
    }</span><span class="terrain-layer-state">${escapeHtml(
      layerResult?.status === "error"
        ? (layerResult.errorMessage ?? "오류")
        : layerResult?.status === "ready"
          ? "로드됨"
          : ""
    )}</span>`;

    button.appendChild(indicator);
    button.appendChild(copy);
    button.appendChild(meta);
    intelLayerList.appendChild(button);
  }
}

function renderAnalysisSummary() {
  if (!analysisSummary) {
    return;
  }

  if (!viewerState.analysis) {
    analysisSummary.innerHTML = "";
    notifyHostAnalysisState();
    return;
  }

  const analysis = viewerState.analysis;
  analysisSummary.innerHTML = `
    <article class="terrain-summary-card">
      <h3>핵심 수치</h3>
      <dl class="terrain-summary-grid">
        <div>
          <dt>지형 성격</dt>
          <dd>${escapeHtml(analysis.terrainClass)}</dd>
        </div>
        <div>
          <dt>기복</dt>
          <dd>${escapeHtml(formatMeters(analysis.reliefMeters))}</dd>
        </div>
        <div>
          <dt>평균 가시율</dt>
          <dd>${escapeHtml(formatPercent(analysis.meanVisibilityRatio))}</dd>
        </div>
        <div>
          <dt>평균 차폐도</dt>
          <dd>${escapeHtml(formatScore(analysis.meanConcealmentScore))}</dd>
        </div>
        <div>
          <dt>최고 포대 점수</dt>
          <dd>${escapeHtml(formatScore(analysis.maxArtilleryScore))}</dd>
        </div>
        <div>
          <dt>실교차 수</dt>
          <dd>${escapeHtml(String(analysis.crossingIntersections.length))}</dd>
        </div>
      </dl>
    </article>
    <article class="terrain-summary-card">
      <h3>사선 제약</h3>
      ${renderFirePlanSummary(analysis.firePlans)}
    </article>
    <article class="terrain-summary-card">
      <h3>차폐 히트맵</h3>
      ${renderHeatmapSummary(analysis.topConcealmentCells, analysis.topExposureCells)}
    </article>
    ${renderAssetRecommendationSummary(
      analysis.runtimeContext,
      analysis.assetRecommendations
    )}
  `;
  notifyHostAnalysisState();
}

function renderFirePlanSummary(firePlans) {
  if (!Array.isArray(firePlans) || firePlans.length === 0) {
    return "";
  }

  return `<ul class="terrain-list">${firePlans
    .map((plan) => {
      const openLabel =
        plan.openSectors.length > 0
          ? plan.openSectors
              .map(
                (sector) =>
                  `${escapeHtml(sector.label)} ${escapeHtml(
                    formatPercent(sector.visibleRatio)
                  )}`
              )
              .join(", ")
          : "개방 섹터 없음";
      const blockedLabel =
        plan.blockedSectors.length > 0
          ? plan.blockedSectors
              .map(
                (sector) =>
                  `${escapeHtml(sector.label)} ${escapeHtml(
                    formatPercent(sector.visibleRatio)
                  )}`
              )
              .join(", ")
          : "차단 섹터 없음";

      return `<li><strong>${escapeHtml(plan.markerId)}</strong> 유효 거리 ${escapeHtml(
        formatDistanceKm((plan.recommendedMinRangeMeters ?? 0) / 1000)
      )} - ${escapeHtml(
        formatDistanceKm((plan.recommendedMaxRangeMeters ?? 0) / 1000)
      )}<br /><span class="terrain-report-copy">${openLabel} / ${blockedLabel}</span></li>`;
    })
    .join("")}</ul>`;
}

function renderHeatmapSummary(topConcealmentCells, topExposureCells) {
  const concealmentItems = Array.isArray(topConcealmentCells)
    ? topConcealmentCells
    : [];
  const exposureItems = Array.isArray(topExposureCells) ? topExposureCells : [];

  return `
    <section>
      <h3>차폐 우세 셀</h3>
      ${
        concealmentItems.length > 0
          ? `<ul class="terrain-list">${concealmentItems
              .slice(0, 3)
              .map(
                (cell) =>
                  `<li>R${cell.rowIndex + 1} C${cell.columnIndex + 1} · ${escapeHtml(
                    formatScore(cell.concealmentScore)
                  )}</li>`
              )
              .join("")}</ul>`
          : ""
      }
    </section>
    <section>
      <h3>노출 우세 셀</h3>
      ${
        exposureItems.length > 0
          ? `<ul class="terrain-list">${exposureItems
              .slice(0, 3)
              .map(
                (cell) =>
                  `<li>R${cell.rowIndex + 1} C${cell.columnIndex + 1} · ${escapeHtml(
                    formatScore(cell.exposureScore)
                  )}</li>`
              )
              .join("")}</ul>`
          : ""
      }
    </section>
  `;
}

function renderAssetRecommendationSummary(runtimeContext, recommendations) {
  const visibleUnitCount = runtimeContext?.unitCount ?? 0;
  const visibleWeaponCount = runtimeContext?.weaponCount ?? 0;
  const selectedUnit = runtimeContext?.selectedUnit ?? null;
  const recommendationItems = Array.isArray(recommendations)
    ? recommendations
    : [];

  if (
    !runtimeContext?.hasContext &&
    visibleUnitCount === 0 &&
    visibleWeaponCount === 0
  ) {
    return `
      <article class="terrain-summary-card">
        <h3>전장 자산 연계</h3>
        <p class="terrain-report-copy">선택 bbox 안에 연동된 전장 자산이 없어 순수 지형 분석만 표시합니다.</p>
      </article>
    `;
  }

  return `
    <article class="terrain-summary-card">
      <h3>전장 자산 연계</h3>
      <dl class="terrain-summary-grid">
        <div>
          <dt>범위 내 자산</dt>
          <dd>${escapeHtml(visibleUnitCount.toLocaleString("ko-KR"))}</dd>
        </div>
        <div>
          <dt>비행 중 무기</dt>
          <dd>${escapeHtml(visibleWeaponCount.toLocaleString("ko-KR"))}</dd>
        </div>
        <div>
          <dt>선택 자산</dt>
          <dd>${escapeHtml(selectedUnit?.name ?? "범위 내 선택 없음")}</dd>
        </div>
        <div>
          <dt>추천 수</dt>
          <dd>${escapeHtml(String(recommendationItems.length))}</dd>
        </div>
      </dl>
      ${
        recommendationItems.length > 0
          ? `<ul class="terrain-list">${recommendationItems
              .slice(0, 4)
              .map(
                (recommendation) =>
                  `<li><strong>${escapeHtml(
                    recommendation.actionLabel
                  )}</strong> ${escapeHtml(recommendation.summary)}</li>`
              )
              .join("")}</ul>`
          : `<p class="terrain-report-copy">자산과 지형 후보 마커의 직접 연계 후보가 없습니다.</p>`
      }
    </article>
  `;
}

function renderVlmReport() {
  if (!vlmReport) {
    return;
  }

  if (!viewerState.vlmResult) {
    vlmReport.innerHTML = "";
    notifyHostAnalysisState();
    return;
  }

  const report = viewerState.vlmResult;
  vlmReport.innerHTML = `
    <article class="terrain-report-card">
      <h3>상황 요약</h3>
      <p class="terrain-report-copy">${escapeHtml(report.executiveSummary ?? "")}</p>
    </article>
    ${renderReportListCard("포격 시사점", report.artilleryImplications)}
    ${renderReportListCard("기동 시사점", report.maneuverImplications)}
    ${renderReportListCard("위험 요소", report.risks)}
    ${renderReportListCard("기회 요소", report.opportunities)}
  `;
  notifyHostAnalysisState();
}

function renderReportListCard(title, items) {
  const listItems = Array.isArray(items) ? items : [];
  return `
    <article class="terrain-report-card">
      <h3>${escapeHtml(title)}</h3>
      ${
        listItems.length > 0
          ? `<ul class="terrain-list">${listItems
              .map((item) => `<li>${escapeHtml(item)}</li>`)
              .join("")}</ul>`
          : ""
      }
    </article>
  `;
}

function getTopMarker(markers, type) {
  return (markers ?? [])
    .filter((marker) => marker.type === type)
    .sort((left, right) => (right.score ?? 0) - (left.score ?? 0))[0];
}

function getEntryMetrics(analysis, marker) {
  if (marker.type === "artillery") {
    const firePlan = (analysis.firePlans ?? []).find(
      (plan) => plan.markerId === marker.id
    );
    return [
      ["점수", formatScore(marker.score ?? 0)],
      ["경사", `${marker.slopeDegrees.toFixed(1)}°`],
      [
        "사거리",
        firePlan
          ? formatDistanceKm((firePlan.recommendedMaxRangeMeters ?? 0) / 1000)
          : formatDistanceKm(Math.max(analysis.widthMeters, 1) / 1000),
      ],
    ];
  }

  if (marker.type === "concealment") {
    return [
      ["차폐", formatScore(marker.concealmentScore ?? 0)],
      ["가시", formatPercent(marker.visibilityRatio ?? 0)],
      ["경사", `${marker.slopeDegrees.toFixed(1)}°`],
    ];
  }

  return [
    ["점수", formatScore(marker.score ?? 0)],
    ["표고", formatMeters(marker.heightMeters)],
    ["경사", `${marker.slopeDegrees.toFixed(1)}°`],
  ];
}

function getEntrySummary(analysis, marker) {
  const markerCallout = getMarkerCalloutForHud(marker.id);

  if (marker.type === "artillery") {
    if (markerCallout) {
      return markerCallout;
    }
    if (viewerState.vlmResult?.artilleryImplications?.[0]) {
      return viewerState.vlmResult.artilleryImplications[0];
    }
    const firePlan = (analysis.firePlans ?? []).find(
      (plan) => plan.markerId === marker.id
    );
    if (!firePlan) {
      return `${analysis.terrainClass} 지형에서 상단 화력 노드로 분류됐습니다.`;
    }
    const openLabel =
      firePlan.openSectors.length > 0
        ? firePlan.openSectors
            .map(
              (sector) =>
                `${sector.label} ${formatPercent(sector.visibleRatio)}`
            )
            .join(", ")
        : "개방 섹터 없음";
    return `개방 섹터 ${openLabel}`;
  }

  if (marker.type === "concealment") {
    if (markerCallout) {
      return markerCallout;
    }
    if (viewerState.vlmResult?.maneuverImplications?.[0]) {
      return viewerState.vlmResult.maneuverImplications[0];
    }
    return `${analysis.terrainClass} 지형의 차폐 우세 지점입니다.`;
  }

  if (markerCallout) {
    return markerCallout;
  }
  if (viewerState.vlmResult?.opportunities?.[0]) {
    return viewerState.vlmResult.opportunities[0];
  }

  return `${analysis.terrainClass} 지형의 기동 및 도하 전개 후보입니다.`;
}

function getEntryHighlights(analysis, marker) {
  if (marker.type === "artillery") {
    const firePlan = (analysis.firePlans ?? []).find(
      (plan) => plan.markerId === marker.id
    );
    return [
      marker.reason,
      getAssetRecommendationHighlight(analysis, marker),
      ...getVlmHighlights("artilleryImplications", 2),
      firePlan?.blockedSectors?.length
        ? `차단 섹터 ${firePlan.blockedSectors
            .map(
              (sector) =>
                `${sector.label} ${formatPercent(sector.visibleRatio)}`
            )
            .join(", ")}`
        : analysis.engineBrief?.artillery?.[0],
    ]
      .filter(Boolean)
      .slice(0, 3);
  }

  if (marker.type === "concealment") {
    const matchingCell = (analysis.topConcealmentCells ?? []).find(
      (cell) =>
        cell.rowIndex === marker.rowIndex &&
        cell.columnIndex === marker.columnIndex
    );
    return [
      marker.reason,
      getAssetRecommendationHighlight(analysis, marker),
      ...getVlmHighlights("maneuverImplications", 2),
      matchingCell
        ? `상위 차폐 셀 R${matchingCell.rowIndex + 1} C${matchingCell.columnIndex + 1} · ${formatScore(
            matchingCell.concealmentScore
          )}`
        : analysis.engineBrief?.maneuver?.[0],
    ]
      .filter(Boolean)
      .slice(0, 3);
  }

  return [
    marker.reason,
    getAssetRecommendationHighlight(analysis, marker),
    ...getVlmHighlights("risks", 1),
    ...getVlmHighlights("opportunities", 1),
    analysis.engineBrief?.opportunities?.[0] ??
      analysis.engineBrief?.maneuver?.[0],
  ]
    .filter(Boolean)
    .slice(0, 3);
}

function buildAnalysisHudEntries(analysis) {
  if (!analysis) {
    return [];
  }

  if (isTerrainDecisionHudMode()) {
    const decisionEntry = buildTerrainDecisionHudEntry(analysis);
    return decisionEntry ? [decisionEntry] : [];
  }

  if (isCollateralHudMode()) {
    const collateralEntry = buildCollateralHudEntry(analysis);
    return collateralEntry ? [collateralEntry] : [];
  }

  const entries = ["artillery", "crossing", "concealment"]
    .map((type) => {
      const marker = getTopMarker(analysis.markers, type);
      if (!marker) {
        return null;
      }

      const layout = ANALYSIS_HUD_LAYOUT[type];
      return {
        key: marker.id,
        type,
        marker,
        kicker: layout?.kicker ?? "Terrain Intel",
        title: `${marker.id} ${marker.title}`,
        summary: getEntrySummary(analysis, marker),
        metrics: getEntryMetrics(analysis, marker),
        highlights: getEntryHighlights(analysis, marker).slice(0, 3),
      };
    })
    .filter(Boolean);

  const overviewEntry = viewerState.visualOptions.showTerrainBriefing
    ? buildOverviewHudEntry(analysis)
    : null;
  if (overviewEntry) {
    entries.unshift(overviewEntry);
  }

  if (entries.length > 0) {
    return entries;
  }

  return [
    {
      key: "summary",
      type: "crossing",
      marker: {
        lon: getCenter(analysis.bounds).lon,
        lat: getCenter(analysis.bounds).lat,
        heightMeters: analysis.meanElevation ?? 0,
        score: analysis.meanVisibilityRatio ?? 0,
        slopeDegrees: analysis.meanSlopeDegrees ?? 0,
      },
      kicker: "Terrain Intel",
      title: "분석 개요",
      summary: `${analysis.terrainClass} · 기복 ${formatMeters(
        analysis.reliefMeters
      )}`,
      metrics: [
        ["가시", formatPercent(analysis.meanVisibilityRatio ?? 0)],
        ["차폐", formatScore(analysis.meanConcealmentScore ?? 0)],
        ["경사", `${(analysis.meanSlopeDegrees ?? 0).toFixed(1)}°`],
      ],
      highlights: [
        analysis.engineBrief?.overview?.[0] ??
          "핵심 후보 마커 없이 지형 전체 요약만 표시합니다.",
        analysis.engineBrief?.risks?.[0] ??
          analysis.engineBrief?.opportunities?.[0],
      ].filter(Boolean),
    },
  ];
}

function isTerrainDecisionHudMode() {
  return terrainHudMode === "munition";
}

function isCollateralHudMode() {
  return terrainHudMode === "collateral";
}

function buildTerrainDecisionHudEntry(analysis) {
  const center = getCenter(analysis.bounds);
  const anchorMarker = {
    lon: center.lon,
    lat: center.lat,
    heightMeters: analysis.meanElevation ?? 0,
    score: analysis.meanVisibilityRatio ?? 0,
    slopeDegrees: analysis.meanSlopeDegrees ?? 0,
  };
  const openTerrainLabel =
    getRuntimeGroundMarkerLabel("개활지") || "개활지 90%";
  const urbanTerrainLabel =
    getRuntimeGroundMarkerLabel("B010 건물") || "B010 건물";
  const reliefLabel = formatOptionalMeters(
    terrainHudDemReliefM,
    formatMeters(analysis.reliefMeters)
  );
  const slopeLabel = formatOptionalDegrees(
    terrainHudDemSlopeP95Deg,
    `${(analysis.meanSlopeDegrees ?? 0).toFixed(1)}°`
  );
  const nearestCivilianLabel = formatOptionalMeters(
    terrainHudNearestCivilianM,
    "확인중"
  );
  const civilianWithin100Label = formatOptionalCount(
    terrainHudCivilianWithin100M
  );
  const hdSafetyWithin250Label = formatOptionalCount(
    terrainHudHdMapSafetyWithin250M
  );
  const hdWithin250Label = formatOptionalCount(terrainHudHdMapWithin250M);
  const terrainComplexityLabel =
    terrainHudTerrainComplexity || analysis.terrainClass || "DEM";

  return {
    key: "terrain-decision",
    type: "summary",
    marker: anchorMarker,
    kicker: "Terrain Decision",
    title: "탄종/발수 지형 판정",
    summary: `${openTerrainLabel} · ${urbanTerrainLabel} · ${
      terrainHudResult || "HE 효과권"
    }`,
    metrics: [
      ["주 지형", openTerrainLabel.replace("개활지 ", "")],
      ["권역", "5/5"],
      ["건물", vworldBuildingsRequested ? "VWorld" : "Local"],
      ["DEM", reliefLabel],
      ["p95", slopeLabel],
      ["민가", nearestCivilianLabel],
      [
        "요망",
        Number.isFinite(terrainHudDesiredDamagePercent)
          ? `${terrainHudDesiredDamagePercent}%`
          : "30%",
      ],
      ["판정", terrainHudEffectCell || terrainHudResult || "HE"],
    ],
    highlights: [
      "수계·개활지·B010 건물·B080 DEM 사면·B110 도로를 실제 NGII 레이어 기준으로 표시합니다.",
      vworldBuildingsRequested
        ? "로컬 DEM, 건물 extrusion, 도로/수계/지형분석 레이어를 HE 산정 기준과 중첩합니다."
        : "광역 VWorld 3D 건물은 제외하고 AOI 로컬 건물 extrusion만 중첩합니다.",
      "영상참조 영역은 실제 분류 데이터 밖이면 도심/사면 색칠에서 제외합니다.",
      terrainHudResult ? `최종 산정 ${terrainHudResult}` : "",
      `B080 DEM ${terrainComplexityLabel} · 기복 ${reliefLabel} · p95 경사 ${slopeLabel}`,
      `민가 100m ${civilianWithin100Label}개 · 최근 민가 ${nearestCivilianLabel}`,
      `B110 HD 250m ${hdWithin250Label}개 · 안전시설 ${hdSafetyWithin250Label}개`,
    ].filter(Boolean),
  };
}

function buildCollateralHudEntry(analysis) {
  const center = getCenter(analysis.bounds);
  const anchorMarker = {
    lon: center.lon,
    lat: center.lat,
    heightMeters: analysis.meanElevation ?? 0,
    score: analysis.meanConcealmentScore ?? analysis.meanVisibilityRatio ?? 0,
    slopeDegrees: analysis.meanSlopeDegrees ?? 0,
  };
  const fragmentLabel =
    getRuntimeGroundMarkerLabel("파편권") || "제한 탄종 파편권";
  const impactLabel = getRuntimeGroundMarkerLabel("탄착권") || "허용 탄착권";

  return {
    key: "collateral-decision",
    type: "summary",
    marker: anchorMarker,
    kicker: "CDE Overlay",
    title: "부수피해 3D 판독",
    summary: `${fragmentLabel} · ${impactLabel}`,
    metrics: [
      ["표시", "3D 반구"],
      ["건물", "Footprint"],
      ["기복", formatMeters(analysis.reliefMeters)],
    ],
    highlights: [
      "탄착권과 파편권을 같은 크롭 지형 위 반구로 비교합니다.",
      "건물 footprint는 민가/도심 밀집 확인용으로 범위 안에서만 표시합니다.",
      `${analysis.terrainClass} · 평균 경사 ${(analysis.meanSlopeDegrees ?? 0).toFixed(1)}°`,
    ],
  };
}

function getRuntimeGroundMarkerLabel(fragment) {
  const normalizedFragment = String(fragment ?? "").trim();
  if (!normalizedFragment) {
    return "";
  }

  const groundMarkers = Array.isArray(
    viewerState.runtimeSnapshot?.groundMarkers
  )
    ? viewerState.runtimeSnapshot.groundMarkers
    : [];
  const matchedMarker = groundMarkers.find((marker) =>
    String(marker?.label ?? "").includes(normalizedFragment)
  );
  return typeof matchedMarker?.label === "string" ? matchedMarker.label : "";
}

function buildOverviewHudEntry(analysis) {
  const center = getCenter(analysis.bounds);
  const anchorMarker = {
    lon: center.lon,
    lat: center.lat,
    heightMeters: analysis.meanElevation ?? 0,
    score: analysis.meanVisibilityRatio ?? 0,
    slopeDegrees: analysis.meanSlopeDegrees ?? 0,
  };
  const layout = ANALYSIS_HUD_LAYOUT.summary;
  const overviewHighlights = [
    viewerState.vlmResult?.executiveSummary,
    analysis.assetRecommendations?.[0]?.summary,
    ...getVlmHighlights("risks", 1),
    analysis.engineBrief?.overview?.[0],
  ]
    .filter(Boolean)
    .slice(0, 2);

  return {
    key: "overview",
    type: "summary",
    marker: anchorMarker,
    kicker: layout.kicker,
    title: "AI 지형 브리핑",
    summary:
      viewerState.vlmResult?.executiveSummary ??
      `${analysis.terrainClass} · 기복 ${formatMeters(analysis.reliefMeters)}`,
    metrics: [
      ["가시", formatPercent(analysis.meanVisibilityRatio ?? 0)],
      ["차폐", formatScore(analysis.meanConcealmentScore ?? 0)],
      ["포대", formatScore(analysis.maxArtilleryScore ?? 0)],
    ],
    highlights: overviewHighlights,
  };
}

function getMarkerCalloutForHud(markerId) {
  const markerCallouts = viewerState.vlmResult?.markerCallouts;
  if (!Array.isArray(markerCallouts)) {
    return "";
  }

  const matchedCallout = markerCallouts.find(
    (callout) => callout.id === markerId
  );
  return typeof matchedCallout?.significance === "string"
    ? matchedCallout.significance
    : typeof matchedCallout?.title === "string"
      ? matchedCallout.title
      : "";
}

function getAssetRecommendationHighlight(analysis, marker) {
  const recommendation = (analysis.assetRecommendations ?? []).find(
    (item) => item.markerId === marker.id || item.markerType === marker.type
  );
  return recommendation?.summary ?? "";
}

function getVlmHighlights(field, limit) {
  const items = viewerState.vlmResult?.[field];
  if (!Array.isArray(items)) {
    return [];
  }
  return items
    .filter((item) => typeof item === "string" && item.trim().length > 0)
    .slice(0, limit);
}

function clearAnalysisHud() {
  viewerState.analysisHudEntries = [];
  analysisHud?.classList.remove("is-visible");
  if (analysisHudCards) {
    analysisHudCards.innerHTML = "";
  }
  if (analysisHudLines) {
    analysisHudLines.innerHTML = "";
  }
  notifyHostAnalysisState();
}

function renderAnalysisHud(viewer) {
  if (!analysisHud || !analysisHudCards || !analysisHudLines) {
    return;
  }

  viewerState.analysisHudEntries = buildAnalysisHudEntries(
    viewerState.analysis
  );
  if (viewerState.analysisHudEntries.length === 0) {
    clearAnalysisHud();
    return;
  }

  analysisHud.classList.add("is-visible");
  analysisHudCards.innerHTML = viewerState.analysisHudEntries
    .map((entry, entryIndex) => {
      const cardState = getHudCardState(entry.key);
      const collapsed = cardState.collapsed === true;
      return `
        <article
          class="terrain-analysis-callout"
          data-entry-key="${escapeHtml(entry.key)}"
          data-type="${escapeHtml(entry.type)}"
          data-collapsed="${collapsed ? "true" : "false"}"
          style="--terrain-hud-index: ${entryIndex}"
        >
          <div class="terrain-analysis-callout-head">
            <span class="terrain-analysis-callout-kicker">${escapeHtml(
              entry.kicker
            )}</span>
            <div class="terrain-analysis-callout-tools">
              <span class="terrain-analysis-callout-score">${escapeHtml(
                formatScore(entry.marker.score ?? 0)
              )}</span>
              <button
                class="terrain-analysis-callout-action"
                type="button"
                data-hud-collapse="${escapeHtml(entry.key)}"
                aria-label="${collapsed ? "펼치기" : "접기"}"
                aria-expanded="${collapsed ? "false" : "true"}"
                title="${collapsed ? "펼치기" : "접기"}"
              >${collapsed ? "+" : "-"}</button>
            </div>
          </div>
          <h3 class="terrain-analysis-callout-title">${escapeHtml(entry.title)}</h3>
          <div class="terrain-analysis-callout-body">
            <p class="terrain-analysis-callout-copy">${escapeHtml(
              entry.summary
            )}</p>
            <dl class="terrain-analysis-callout-grid">
              ${entry.metrics
                .map(
                  ([label, value]) => `
                    <div>
                      <dt>${escapeHtml(label)}</dt>
                      <dd>${escapeHtml(value)}</dd>
                    </div>
                  `
                )
                .join("")}
            </dl>
            ${
              entry.highlights.length > 0
                ? `<ul class="terrain-analysis-callout-list">
                    ${entry.highlights
                      .map((item) => `<li>${escapeHtml(item)}</li>`)
                      .join("")}
                  </ul>`
                : ""
            }
          </div>
        </article>
      `;
    })
    .join("");

  analysisHud.classList.remove("is-jarvis-reveal");
  if (shouldUseJarvisReveal()) {
    void analysisHud.offsetWidth;
    analysisHud.classList.add("is-jarvis-reveal");
  }
  syncAnalysisHudLayout(viewer);
}

function syncAnalysisHudLayout(viewer) {
  if (
    !analysisHud ||
    !analysisHudCards ||
    !analysisHudLines ||
    viewerState.analysisHudEntries.length === 0
  ) {
    return;
  }

  const compactHud = window.innerWidth <= 720;
  if (compactHud) {
    analysisHudCards
      .querySelectorAll(".terrain-analysis-callout")
      .forEach((card) => {
        if (card instanceof HTMLElement) {
          card.dataset.hidden = "false";
          card.style.left = "";
          card.style.top = "";
        }
      });
    analysisHudLines.innerHTML = "";
    return;
  }

  if (typeof sceneToWindowCoordinates !== "function") {
    analysisHudCards
      .querySelectorAll(".terrain-analysis-callout")
      .forEach((card) => {
        if (card instanceof HTMLElement) {
          card.dataset.hidden = "true";
        }
      });
    analysisHudLines.innerHTML = "";
    return;
  }

  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const margin = 24;
  const topInset = viewportWidth >= 1200 ? 72 : 64;
  const availableLeft = getHudAvailableLeft(margin);
  const availableRight = getHudAvailableRight(viewportWidth, margin);
  const terrainRect = getTerrainViewportRect(
    viewer,
    viewportWidth,
    viewportHeight,
    12
  );
  const connectorMarkup = [];
  const placedRects = [];

  analysisHudLines.setAttribute(
    "viewBox",
    `0 0 ${viewportWidth} ${viewportHeight}`
  );
  analysisHudLines.setAttribute("width", `${viewportWidth}`);
  analysisHudLines.setAttribute("height", `${viewportHeight}`);

  viewerState.analysisHudEntries.forEach((entry) => {
    const card = analysisHudCards.querySelector(
      `[data-entry-key="${entry.key}"]`
    );
    if (!(card instanceof HTMLElement)) {
      return;
    }

    const anchorPoints = getHudAnchorPoints(viewer, entry.marker);
    if (
      !anchorPoints ||
      !isHudPointNearViewport(anchorPoints.lift, viewportWidth, viewportHeight)
    ) {
      card.dataset.hidden = "true";
      return;
    }

    card.dataset.hidden = "false";
    const hasManualPosition = hasHudManualPosition(entry.key);
    const slot = getHudCardSlot({
      entry,
      viewportWidth,
      viewportHeight,
      cardWidth: card.offsetWidth,
      cardHeight: card.offsetHeight,
      margin,
      topInset,
      availableLeft,
      availableRight,
      anchorPoint: anchorPoints.lift,
      terrainRect,
      placedRects,
    });
    const desiredSlot = hasManualPosition
      ? slot
      : resolveHudCardSlotOverlap({
          slot,
          placedRects,
          viewportHeight,
          cardWidth: card.offsetWidth,
          cardHeight: card.offsetHeight,
          margin,
          topInset,
          availableLeft,
          availableRight,
          terrainRect,
          anchorPoint: anchorPoints.lift,
        });
    const desiredLeft = desiredSlot.left;
    const desiredTop = desiredSlot.top;

    card.style.left = `${desiredLeft}px`;
    card.style.top = `${desiredTop}px`;

    const rect = {
      left: desiredLeft,
      top: desiredTop,
      right: desiredLeft + card.offsetWidth,
      bottom: desiredTop + card.offsetHeight,
      width: card.offsetWidth,
      height: card.offsetHeight,
    };
    placedRects.push(rect);

    const connectionPoint = getCardConnectionPoint(rect, anchorPoints.lift);
    const cardCenterX = rect.left + rect.width / 2;
    const cardCenterY = rect.top + rect.height / 2;
    const tiltX = clamp(
      (cardCenterY - anchorPoints.lift.y) / rect.height,
      -1,
      1
    );
    const tiltY = clamp(
      (anchorPoints.lift.x - cardCenterX) / rect.width,
      -1,
      1
    );
    card.dataset.anchorSide = connectionPoint.side;
    card.style.setProperty(
      "--terrain-hud-origin",
      getHudTransformOrigin(connectionPoint.side)
    );
    card.style.setProperty(
      "--terrain-hud-tilt-x",
      `${(tiltX * 3.2).toFixed(2)}deg`
    );
    card.style.setProperty(
      "--terrain-hud-tilt-y",
      `${(tiltY * 4.8).toFixed(2)}deg`
    );

    connectorMarkup.push(
      buildHudConnectorMarkup({
        basePoint: anchorPoints.base,
        liftPoint: anchorPoints.lift,
        endPoint: connectionPoint,
        strokeColor: getHudStrokeColor(entry.type),
      })
    );
  });

  analysisHudLines.innerHTML = connectorMarkup.join("");
}

function getHudCardState(key) {
  const normalizedKey = String(key ?? "");
  if (!viewerState.hudCardOverrides[normalizedKey]) {
    viewerState.hudCardOverrides[normalizedKey] = {};
  }
  return viewerState.hudCardOverrides[normalizedKey];
}

function hasHudManualPosition(key) {
  const cardState = viewerState.hudCardOverrides[String(key ?? "")];
  return Number.isFinite(cardState?.left) && Number.isFinite(cardState?.top);
}

function updateHudCardState(key, patch) {
  const normalizedKey = String(key ?? "");
  viewerState.hudCardOverrides[normalizedKey] = {
    ...viewerState.hudCardOverrides[normalizedKey],
    ...patch,
  };
  return viewerState.hudCardOverrides[normalizedKey];
}

function getTerrainViewportRect(
  viewer,
  viewportWidth,
  viewportHeight,
  padding
) {
  if (!viewerState.bounds) {
    return null;
  }

  const { west, east, south, north } = viewerState.bounds;
  const center = getCenter(viewerState.bounds);
  const heightMeters = viewerState.analysis?.meanElevation ?? 0;
  const samples = [
    [west, south],
    [east, south],
    [east, north],
    [west, north],
    [center.lon, south],
    [east, center.lat],
    [center.lon, north],
    [west, center.lat],
    [center.lon, center.lat],
  ];
  const points = samples
    .map(([lon, lat]) =>
      projectMarkerToWindow(viewer, { lon, lat, heightMeters }, 4)
    )
    .filter(Boolean)
    .filter((point) =>
      isHudPointNearViewport(point, viewportWidth, viewportHeight)
    );

  if (points.length < 2) {
    return null;
  }

  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);
  return {
    left: clamp(Math.min(...xs) - padding, 0, viewportWidth),
    top: clamp(Math.min(...ys) - padding, 0, viewportHeight),
    right: clamp(Math.max(...xs) + padding, 0, viewportWidth),
    bottom: clamp(Math.max(...ys) + padding, 0, viewportHeight),
  };
}

function getHudAnchorPoints(viewer, marker) {
  const base = projectMarkerToWindow(viewer, marker, 3);
  const lift = projectMarkerToWindow(viewer, marker, 58);

  if (!base && !lift) {
    return null;
  }

  return {
    base: base ?? lift,
    lift: lift ?? base,
  };
}

function projectMarkerToWindow(viewer, marker, heightOffsetMeters) {
  if (
    !viewer ||
    !marker ||
    typeof sceneToWindowCoordinates !== "function" ||
    !Number.isFinite(marker.lon) ||
    !Number.isFinite(marker.lat)
  ) {
    return null;
  }

  const point = sceneToWindowCoordinates(
    viewer.scene,
    Cesium.Cartesian3.fromDegrees(
      marker.lon,
      marker.lat,
      (marker.heightMeters ?? 0) + heightOffsetMeters
    )
  );

  if (!point || !Number.isFinite(point.x) || !Number.isFinite(point.y)) {
    return null;
  }

  return {
    x: point.x,
    y: point.y,
  };
}

function isHudPointNearViewport(point, viewportWidth, viewportHeight) {
  const tolerance = 180;
  return (
    point.x >= -tolerance &&
    point.x <= viewportWidth + tolerance &&
    point.y >= -tolerance &&
    point.y <= viewportHeight + tolerance
  );
}

function resolveHudCardSlotOverlap({
  slot,
  placedRects,
  viewportHeight,
  cardWidth,
  cardHeight,
  margin,
  topInset,
  availableLeft,
  availableRight,
  terrainRect,
  anchorPoint,
}) {
  const gap = 12;
  const maxLeft = Math.max(availableLeft, availableRight - cardWidth);
  const bottomLimit = viewportHeight - cardHeight - margin;
  let left = clamp(slot.left, availableLeft, maxLeft);
  let top = clamp(slot.top, topInset, bottomLimit);

  for (let pass = 0; pass < 4; pass += 1) {
    let changed = false;
    for (const rect of placedRects) {
      if (!hudRectsOverlap(left, top, cardWidth, cardHeight, rect, gap)) {
        continue;
      }

      const pushedDown = rect.bottom + gap;
      if (pushedDown <= bottomLimit) {
        top = pushedDown;
      } else {
        const pushedUp = rect.top - cardHeight - gap;
        if (pushedUp >= topInset) {
          top = pushedUp;
        } else {
          left = clamp(rect.left - cardWidth - gap, availableLeft, maxLeft);
        }
      }
      changed = true;
    }

    if (!changed) {
      break;
    }
  }

  const terrainAdjustedSlot = moveHudCardOutsideTerrain({
    left,
    top,
    cardWidth,
    cardHeight,
    terrainRect,
    anchorPoint,
    margin,
    topInset,
    availableLeft,
    availableRight,
    viewportHeight,
  });
  left = terrainAdjustedSlot.left;
  top = terrainAdjustedSlot.top;

  return { left, top };
}

function hudRectsOverlap(left, top, width, height, rect, gap) {
  return !(
    left + width + gap <= rect.left ||
    left >= rect.right + gap ||
    top + height + gap <= rect.top ||
    top >= rect.bottom + gap
  );
}

function moveHudCardOutsideTerrain({
  left,
  top,
  cardWidth,
  cardHeight,
  terrainRect,
  anchorPoint,
  margin,
  topInset,
  availableLeft,
  availableRight,
  viewportHeight,
}) {
  if (
    !terrainRect ||
    getRectOverlapArea(
      { left, top, right: left + cardWidth, bottom: top + cardHeight },
      terrainRect
    ) === 0
  ) {
    return { left, top };
  }

  const maxLeft = Math.max(availableLeft, availableRight - cardWidth);
  const bottomLimit = viewportHeight - cardHeight - margin;
  const gap = 14;
  const candidates = [
    {
      left: clamp(anchorPoint.x - cardWidth / 2, availableLeft, maxLeft),
      top: terrainRect.top - cardHeight - gap,
      preference: 0,
    },
    {
      left: clamp(anchorPoint.x - cardWidth / 2, availableLeft, maxLeft),
      top: terrainRect.bottom + gap,
      preference: 8,
    },
    {
      left: terrainRect.left - cardWidth - gap,
      top: clamp(anchorPoint.y - cardHeight / 2, topInset, bottomLimit),
      preference: 12,
    },
    {
      left: terrainRect.right + gap,
      top: clamp(anchorPoint.y - cardHeight / 2, topInset, bottomLimit),
      preference: 12,
    },
  ].map((candidate) => ({
    left: clamp(candidate.left, availableLeft, maxLeft),
    top: clamp(candidate.top, topInset, bottomLimit),
    preference: candidate.preference,
  }));

  return pickBestHudSlot({
    candidates,
    cardWidth,
    cardHeight,
    anchorPoint,
    terrainRect,
    placedRects: [],
  });
}

function getRectOverlapArea(rectA, rectB) {
  if (!rectA || !rectB) {
    return 0;
  }

  const width = Math.max(
    0,
    Math.min(rectA.right, rectB.right) - Math.max(rectA.left, rectB.left)
  );
  const height = Math.max(
    0,
    Math.min(rectA.bottom, rectB.bottom) - Math.max(rectA.top, rectB.top)
  );
  return width * height;
}

function getCardConnectionPoint(rect, anchorPoint) {
  const edgeInset = 24;
  const candidates = [
    {
      side: "left",
      x: rect.left,
      y: clamp(anchorPoint.y, rect.top + edgeInset, rect.bottom - edgeInset),
    },
    {
      side: "right",
      x: rect.right,
      y: clamp(anchorPoint.y, rect.top + edgeInset, rect.bottom - edgeInset),
    },
    {
      side: "top",
      x: clamp(anchorPoint.x, rect.left + edgeInset, rect.right - edgeInset),
      y: rect.top,
    },
    {
      side: "bottom",
      x: clamp(anchorPoint.x, rect.left + edgeInset, rect.right - edgeInset),
      y: rect.bottom,
    },
  ];

  return candidates.reduce((best, candidate) => {
    const bestDistance = distanceSquared(best, anchorPoint);
    const candidateDistance = distanceSquared(candidate, anchorPoint);
    return candidateDistance < bestDistance ? candidate : best;
  }, candidates[0]);
}

function distanceSquared(point, anchorPoint) {
  const dx = point.x - anchorPoint.x;
  const dy = point.y - anchorPoint.y;
  return dx * dx + dy * dy;
}

function getHudTransformOrigin(side) {
  if (side === "left") {
    return "0% 50%";
  }
  if (side === "right") {
    return "100% 50%";
  }
  if (side === "top") {
    return "50% 0%";
  }
  return "50% 100%";
}

function getHudStrokeColor(type) {
  if (type === "artillery") {
    return "#ff9576";
  }
  if (type === "concealment") {
    return "#7de9a8";
  }
  if (type === "summary") {
    return "#d8fbff";
  }
  return "#71d9ff";
}

function buildHudConnectorMarkup({
  basePoint,
  liftPoint,
  endPoint,
  strokeColor,
}) {
  const mastPath = `M ${formatSvgNumber(basePoint.x)} ${formatSvgNumber(
    basePoint.y
  )} L ${formatSvgNumber(liftPoint.x)} ${formatSvgNumber(liftPoint.y)}`;
  const connectorPath = buildHudConnectorPath(liftPoint, endPoint);

  return `
    <path class="terrain-analysis-anchor-mast" d="${mastPath}" stroke="${strokeColor}" />
    <path class="terrain-analysis-connector-shadow" d="${connectorPath}" />
    <path class="terrain-analysis-connector" d="${connectorPath}" stroke="${strokeColor}" />
    <circle class="terrain-analysis-anchor-ring" cx="${formatSvgNumber(
      basePoint.x
    )}" cy="${formatSvgNumber(basePoint.y)}" r="7" stroke="${strokeColor}" />
    <circle class="terrain-analysis-anchor-dot" cx="${formatSvgNumber(
      basePoint.x
    )}" cy="${formatSvgNumber(basePoint.y)}" r="2.6" fill="${strokeColor}" />
    <circle class="terrain-analysis-card-node" cx="${formatSvgNumber(
      endPoint.x
    )}" cy="${formatSvgNumber(endPoint.y)}" r="3" fill="${strokeColor}" />
  `;
}

function buildHudConnectorPath(startPoint, endPoint) {
  const dx = endPoint.x - startPoint.x;
  const dy = endPoint.y - startPoint.y;
  const horizontalCurve = Math.abs(dx) >= Math.abs(dy) * 0.72;

  if (horizontalCurve) {
    const pull = clamp(Math.abs(dx) * 0.42, 48, 168) * Math.sign(dx || 1);
    return [
      `M ${formatSvgNumber(startPoint.x)} ${formatSvgNumber(startPoint.y)}`,
      `C ${formatSvgNumber(startPoint.x + pull)} ${formatSvgNumber(
        startPoint.y
      )}`,
      `${formatSvgNumber(endPoint.x - pull * 0.48)} ${formatSvgNumber(
        endPoint.y
      )}`,
      `${formatSvgNumber(endPoint.x)} ${formatSvgNumber(endPoint.y)}`,
    ].join(" ");
  }

  const pull = clamp(Math.abs(dy) * 0.42, 42, 152) * Math.sign(dy || 1);
  return [
    `M ${formatSvgNumber(startPoint.x)} ${formatSvgNumber(startPoint.y)}`,
    `C ${formatSvgNumber(startPoint.x)} ${formatSvgNumber(startPoint.y + pull)}`,
    `${formatSvgNumber(endPoint.x)} ${formatSvgNumber(endPoint.y - pull * 0.46)}`,
    `${formatSvgNumber(endPoint.x)} ${formatSvgNumber(endPoint.y)}`,
  ].join(" ");
}

function formatSvgNumber(value) {
  return Number.isFinite(value) ? value.toFixed(1) : "0.0";
}

function getHudCardSlot({
  entry,
  viewportWidth,
  viewportHeight,
  cardWidth,
  cardHeight,
  margin,
  topInset,
  availableLeft,
  availableRight,
  anchorPoint,
  terrainRect,
  placedRects,
}) {
  const maxLeft = Math.max(availableLeft, availableRight - cardWidth);
  const bottomRail = viewportHeight - cardHeight - margin;
  const cardState = viewerState.hudCardOverrides[String(entry.key ?? "")];
  if (Number.isFinite(cardState?.left) && Number.isFinite(cardState?.top)) {
    return {
      left: clamp(cardState.left, availableLeft, maxLeft),
      top: clamp(cardState.top, topInset, bottomRail),
    };
  }

  const fallbackLeft =
    availableLeft + (availableRight - availableLeft - cardWidth) / 2;
  const layout = ANALYSIS_HUD_LAYOUT[entry.type] ?? ANALYSIS_HUD_LAYOUT.summary;
  const preferredLeft =
    (Number.isFinite(anchorPoint?.x) ? anchorPoint.x : fallbackLeft) +
    layout.offsetX;
  const preferredTop =
    (Number.isFinite(anchorPoint?.y) ? anchorPoint.y : topInset) +
    layout.offsetY;
  const terrainGap = 18;
  const terrainCenterX = terrainRect
    ? (terrainRect.left + terrainRect.right) / 2
    : fallbackLeft + cardWidth / 2;
  const terrainCenterY = terrainRect
    ? (terrainRect.top + terrainRect.bottom) / 2
    : viewportHeight / 2;
  const topOutside = terrainRect
    ? terrainRect.top - cardHeight - terrainGap
    : topInset;
  const bottomOutside = terrainRect
    ? terrainRect.bottom + terrainGap
    : bottomRail;
  const leftOutside = terrainRect
    ? terrainRect.left - cardWidth - terrainGap
    : availableLeft;
  const rightOutside = terrainRect ? terrainRect.right + terrainGap : maxLeft;
  const verticalAnchor = Number.isFinite(anchorPoint?.y)
    ? anchorPoint.y - cardHeight / 2
    : terrainCenterY - cardHeight / 2;
  const horizontalAnchor = Number.isFinite(anchorPoint?.x)
    ? anchorPoint.x - cardWidth / 2
    : terrainCenterX - cardWidth / 2;

  const candidates = [
    { left: preferredLeft, top: preferredTop, preference: 28 },
    {
      left: horizontalAnchor,
      top: topOutside,
      preference: entry.type === "summary" ? 0 : 10,
    },
    {
      left: horizontalAnchor,
      top: bottomOutside,
      preference: entry.type === "summary" ? 8 : 6,
    },
    {
      left: leftOutside,
      top: verticalAnchor,
      preference: entry.type === "artillery" ? 0 : 14,
    },
    {
      left: rightOutside,
      top: verticalAnchor,
      preference: entry.type === "artillery" ? 18 : 0,
    },
    {
      left: availableLeft,
      top: terrainRect ? terrainRect.bottom + terrainGap : bottomRail,
      preference: entry.type === "artillery" ? 4 : 22,
    },
    {
      left: maxLeft,
      top: terrainRect ? terrainRect.top - cardHeight - terrainGap : topInset,
      preference: entry.type === "crossing" ? 4 : 18,
    },
    {
      left: maxLeft,
      top: terrainRect ? terrainRect.bottom + terrainGap : bottomRail,
      preference: entry.type === "concealment" ? 4 : 20,
    },
    {
      left: fallbackLeft,
      top: topInset,
      preference: 30,
    },
  ].map((candidate) => ({
    left: clamp(candidate.left, availableLeft, maxLeft),
    top: clamp(candidate.top, topInset, bottomRail),
    preference: candidate.preference,
  }));

  return pickBestHudSlot({
    candidates,
    cardWidth,
    cardHeight,
    anchorPoint,
    terrainRect,
    placedRects,
  });
}

function pickBestHudSlot({
  candidates,
  cardWidth,
  cardHeight,
  anchorPoint,
  terrainRect,
  placedRects,
}) {
  return candidates.reduce((best, candidate) => {
    const score = scoreHudSlot({
      slot: candidate,
      cardWidth,
      cardHeight,
      anchorPoint,
      terrainRect,
      placedRects,
    });
    if (!best || score < best.score) {
      return {
        left: candidate.left,
        top: candidate.top,
        score,
      };
    }
    return best;
  }, null);
}

function scoreHudSlot({
  slot,
  cardWidth,
  cardHeight,
  anchorPoint,
  terrainRect,
  placedRects,
}) {
  const rect = {
    left: slot.left,
    top: slot.top,
    right: slot.left + cardWidth,
    bottom: slot.top + cardHeight,
  };
  const centerX = slot.left + cardWidth / 2;
  const centerY = slot.top + cardHeight / 2;
  const dx = centerX - anchorPoint.x;
  const dy = centerY - anchorPoint.y;
  const terrainOverlap = getRectOverlapArea(rect, terrainRect);
  const placedOverlap = placedRects.reduce(
    (total, placedRect) => total + getRectOverlapArea(rect, placedRect),
    0
  );

  return (
    (slot.preference ?? 0) * 100 +
    Math.hypot(dx, dy) * 0.12 +
    terrainOverlap * 3 +
    placedOverlap * 2 +
    (terrainOverlap > 0 ? 80000 : 0) +
    (placedOverlap > 0 ? 42000 : 0)
  );
}

function getHudAvailableLeft(margin) {
  const inset = Number(viewerState.hudInsets?.left) || 0;
  return Math.max(margin, inset + margin);
}

function getHudAvailableRight(viewportWidth, margin) {
  const rightInset = Number(viewerState.hudInsets?.right) || 0;
  const defaultRight = Math.max(margin, viewportWidth - margin - rightInset);
  if (
    !terrainInfoPanel ||
    window.innerWidth <= 720 ||
    terrainInfoPanel.classList.contains("is-collapsed")
  ) {
    return defaultRight;
  }

  const panelRect = terrainInfoPanel.getBoundingClientRect();
  if (
    panelRect.width <= 0 ||
    panelRect.height <= 0 ||
    panelRect.left >= viewportWidth ||
    panelRect.right <= 0
  ) {
    return defaultRight;
  }

  return Math.max(margin, Math.min(defaultRight, panelRect.left - margin));
}

function setAnalysisHudInsets(payload) {
  const left = Math.max(0, Number(payload?.left) || 0);
  const right = Math.max(0, Number(payload?.right) || 0);
  viewerState.hudInsets = { left, right };

  if (viewerState.viewer) {
    syncAnalysisHudLayout(viewerState.viewer);
    viewerState.viewer.scene.requestRender();
  }
}

function applyTerrainBackgroundMode(backgroundMode) {
  const mode = backgroundMode === "black" ? "black" : "sky";
  document.body?.classList.toggle("is-black-background", mode === "black");

  if (viewerState.viewer?.scene) {
    viewerState.viewer.scene.backgroundColor =
      mode === "black" ? Cesium.Color.BLACK : Cesium.Color.TRANSPARENT;
    viewerState.viewer.scene.requestRender();
  }
}

function setTerrainViewerVisualOptions(options) {
  if (!options || typeof options !== "object") {
    return;
  }

  viewerState.visualOptions = {
    ...viewerState.visualOptions,
    backgroundMode:
      options.backgroundMode === "black" || options.backgroundMode === "sky"
        ? options.backgroundMode
        : viewerState.visualOptions.backgroundMode,
    showTerrainBriefing:
      typeof options.showTerrainBriefing === "boolean"
        ? options.showTerrainBriefing
        : viewerState.visualOptions.showTerrainBriefing,
    autoRotateCamera:
      typeof options.autoRotateCamera === "boolean"
        ? options.autoRotateCamera
        : viewerState.visualOptions.autoRotateCamera,
    revealMode:
      options.revealMode === "jarvis" || options.revealMode === "none"
        ? options.revealMode
        : viewerState.visualOptions.revealMode,
  };

  applyTerrainBackgroundMode(viewerState.visualOptions.backgroundMode);
  document.body?.classList.toggle(
    "terrain-jarvis-enabled",
    shouldUseJarvisReveal()
  );
  if (shouldUseJarvisReveal()) {
    triggerTerrainJarvisScan();
  }

  if (viewerState.visualOptions.autoRotateCamera) {
    startTerrainCameraAutoRotate();
  } else {
    stopTerrainCameraAutoRotate();
  }

  if (viewerState.viewer && viewerState.analysis) {
    renderAnalysisHud(viewerState.viewer);
    viewerState.viewer.scene.requestRender();
  }
}

function wireAnalysisHudInteractions() {
  if (!analysisHudCards || analysisHudInteractionsWired) {
    return;
  }
  analysisHudInteractionsWired = true;

  analysisHudCards.addEventListener("click", (event) => {
    const button = event.target?.closest?.("[data-hud-collapse]");
    if (!(button instanceof HTMLElement)) {
      return;
    }

    const key = button.dataset.hudCollapse;
    const cardState = getHudCardState(key);
    const collapsed = cardState.collapsed !== true;
    updateHudCardState(key, { collapsed });
    const card = button.closest(".terrain-analysis-callout");
    if (card instanceof HTMLElement) {
      card.dataset.collapsed = collapsed ? "true" : "false";
    }
    button.setAttribute("aria-expanded", collapsed ? "false" : "true");
    button.setAttribute("aria-label", collapsed ? "펼치기" : "접기");
    button.setAttribute("title", collapsed ? "펼치기" : "접기");
    button.textContent = collapsed ? "+" : "-";
    if (viewerState.viewer) {
      syncAnalysisHudLayout(viewerState.viewer);
      viewerState.viewer.scene.requestRender();
    }
  });

  analysisHudCards.addEventListener("pointerdown", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement) || target.closest("button")) {
      return;
    }

    const card = target.closest(".terrain-analysis-callout");
    if (!(card instanceof HTMLElement) || card.dataset.hidden === "true") {
      return;
    }

    const key = card.dataset.entryKey;
    const rect = card.getBoundingClientRect();
    viewerState.hudDragState = {
      key,
      pointerId: event.pointerId,
      offsetX: event.clientX - rect.left,
      offsetY: event.clientY - rect.top,
    };
    card.dataset.dragging = "true";
    card.setPointerCapture?.(event.pointerId);
    event.preventDefault();
  });

  window.addEventListener("pointermove", (event) => {
    const dragState = viewerState.hudDragState;
    if (!dragState || dragState.pointerId !== event.pointerId) {
      return;
    }

    const card = analysisHudCards.querySelector(
      `[data-entry-key="${dragState.key}"]`
    );
    if (!(card instanceof HTMLElement)) {
      return;
    }

    const margin = 18;
    const topInset = window.innerWidth >= 1200 ? 64 : 56;
    const availableLeft = getHudAvailableLeft(margin);
    const availableRight = getHudAvailableRight(window.innerWidth, margin);
    const maxLeft = Math.max(availableLeft, availableRight - card.offsetWidth);
    const maxTop = Math.max(
      topInset,
      window.innerHeight - card.offsetHeight - margin
    );
    const left = clamp(
      event.clientX - dragState.offsetX,
      availableLeft,
      maxLeft
    );
    const top = clamp(event.clientY - dragState.offsetY, topInset, maxTop);
    updateHudCardState(dragState.key, { left, top });
    card.style.left = `${left}px`;
    card.style.top = `${top}px`;

    if (viewerState.viewer) {
      syncAnalysisHudLayout(viewerState.viewer);
      viewerState.viewer.scene.requestRender();
    }
  });

  window.addEventListener("pointerup", endAnalysisHudDrag);
  window.addEventListener("pointercancel", endAnalysisHudDrag);
}

function endAnalysisHudDrag(event) {
  const dragState = viewerState.hudDragState;
  if (!dragState || dragState.pointerId !== event.pointerId) {
    return;
  }

  const card = analysisHudCards?.querySelector(
    `[data-entry-key="${dragState.key}"]`
  );
  if (card instanceof HTMLElement) {
    card.dataset.dragging = "false";
    if (card.hasPointerCapture?.(event.pointerId)) {
      card.releasePointerCapture(event.pointerId);
    }
  }
  viewerState.hudDragState = null;
}

function handleTerrainViewerCommand(event) {
  if (event.origin !== window.location.origin) {
    return;
  }

  const payload =
    event.data?.payload && typeof event.data.payload === "object"
      ? event.data.payload
      : null;
  if (event.data?.type !== "terrain3d:command" || !payload) {
    return;
  }

  if (payload.command === "set-hud-insets") {
    setAnalysisHudInsets(payload);
    return;
  }
  if (payload.command === "set-visual-options") {
    setTerrainViewerVisualOptions(payload.options);
    return;
  }
  if (payload.command === "run-engine-analysis") {
    void runEngineAnalysis(viewerState.viewer);
    return;
  }
  if (payload.command === "clear-terrain-analysis") {
    clearTerrainAnalysis(viewerState.viewer);
    return;
  }
  if (payload.command === "run-vlm-analysis") {
    void runVlmAnalysis(viewerState.viewer);
  }
}

function handleRuntimeSnapshotMessage(event) {
  if (event.origin !== window.location.origin) {
    return;
  }

  if (
    event.data?.type !== "terrain3d:placement-snapshot" &&
    event.data?.type !== "terrain3d:runtime-snapshot"
  ) {
    return;
  }

  const snapshot = event.data?.payload ?? null;
  const nextSignature = buildRuntimeSnapshotAnalysisSignature(
    snapshot,
    viewerState.bounds
  );
  viewerState.runtimeSnapshot = snapshot;
  renderDroneRedeploymentMissionOverlay(snapshot);
  if (nextSignature === viewerState.runtimeSnapshotSignature) {
    return;
  }
  viewerState.runtimeSnapshotSignature = nextSignature;

  if (!viewerState.analysis) {
    return;
  }

  viewerState.analysis = enrichTerrainAnalysisWithRuntimeContext(
    viewerState.analysis,
    viewerState.runtimeSnapshot
  );
  renderAnalysisSummary();

  const viewer = viewerState.viewer;
  if (!viewer?.entities || !viewer?.scene) {
    return;
  }

  clearAssetRecommendationEntities(viewer);
  addAssetRecommendationOverlay(
    viewer,
    viewerState.analysis.assetRecommendations
  );
  renderAnalysisHud(viewer);
  viewer.scene.requestRender();
}

function buildRuntimeSnapshotAnalysisSignature(snapshot, bounds) {
  if (!snapshot || typeof snapshot !== "object") {
    return "";
  }

  const units = Array.isArray(snapshot.units)
    ? snapshot.units
        .filter((unit) =>
          isRuntimePointInsideBounds(unit?.longitude, unit?.latitude, bounds)
        )
        .map(
          (unit) =>
            `${unit.id ?? ""}:${unit.selected === true ? 1 : 0}:${roundRuntimeSignatureNumber(
              unit.longitude,
              4
            )}:${roundRuntimeSignatureNumber(
              unit.latitude,
              4
            )}:${roundRuntimeSignatureNumber(unit.altitudeMeters, 0)}`
        )
        .sort()
    : [];
  const weapons = Array.isArray(snapshot.weapons)
    ? snapshot.weapons
        .filter(
          (weapon) =>
            isRuntimePointInsideBounds(
              weapon?.longitude,
              weapon?.latitude,
              bounds
            ) ||
            isRuntimePointInsideBounds(
              weapon?.targetLongitude,
              weapon?.targetLatitude,
              bounds
            )
        )
        .map(
          (weapon) =>
            `${weapon.id ?? ""}:${roundRuntimeSignatureNumber(
              weapon.longitude,
              4
            )}:${roundRuntimeSignatureNumber(
              weapon.latitude,
              4
            )}:${roundRuntimeSignatureNumber(
              weapon.targetLongitude,
              4
            )}:${roundRuntimeSignatureNumber(weapon.targetLatitude, 4)}`
        )
        .sort()
    : [];

  return [
    snapshot.selectedUnitId ?? "",
    units.join("|"),
    weapons.join("|"),
  ].join("::");
}

function isRuntimePointInsideBounds(longitude, latitude, bounds) {
  const lon = Number(longitude);
  const lat = Number(latitude);
  if (!Number.isFinite(lon) || !Number.isFinite(lat)) {
    return false;
  }
  if (!bounds) {
    return true;
  }
  return (
    lon >= bounds.west &&
    lon <= bounds.east &&
    lat >= bounds.south &&
    lat <= bounds.north
  );
}

function roundRuntimeSignatureNumber(value, fractionDigits) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue)
    ? numberValue.toFixed(fractionDigits)
    : "";
}

function clearLayerDataSources(viewer) {
  viewerState.layerDataSources.forEach((dataSource) => {
    viewer.dataSources.remove(dataSource, true);
  });
  viewerState.layerDataSources = [];
}

function clearMarkerEntities(viewer) {
  viewerState.markerEntities.forEach((entity) => {
    viewer.entities.remove(entity);
  });
  viewerState.markerEntities = [];
}

function clearAnalysisOverlayEntities(viewer) {
  viewerState.analysisOverlayEntities.forEach((entity) => {
    viewer.entities.remove(entity);
  });
  viewerState.analysisOverlayEntities = [];
}

function clearAssetRecommendationEntities(viewer) {
  viewerState.assetRecommendationEntities.forEach((entity) => {
    viewer.entities.remove(entity);
  });
  viewerState.assetRecommendationEntities = [];
}

function setButtonBusy(button, busy, label) {
  if (!button) {
    return;
  }

  button.disabled = busy;
  if (label) {
    button.textContent = label;
  }
}

function clearTerrainAnalysis(viewer) {
  viewerState.analysis = null;
  viewerState.vlmResult = null;
  viewerState.captureTimestamp = null;
  viewerState.hudCardOverrides = {};
  viewerState.hudDragState = null;

  if (viewer?.entities) {
    clearMarkerEntities(viewer);
    clearAnalysisOverlayEntities(viewer);
    clearAssetRecommendationEntities(viewer);
  }
  viewer?.scene?.requestRender?.();

  clearAnalysisHud();
  renderAnalysisSummary();
  renderVlmReport();
  setAnalysisStatusMessage("");
  setVlmRuntimeBadge("");
  setCaptureStatusMessage("");
  setButtonBusy(runEngineAnalysisButton, false, "지형 분석");
  setButtonBusy(runVlmAnalysisButton, false, "VLM 브리핑");
  notifyHostAnalysisState({
    analysisStatus: "",
    vlmStatus: "",
    captureStatus: "",
  });
}

async function refreshTerrainIntelLayers(viewer) {
  if (!viewerState.bounds) {
    return;
  }

  viewerState.busy.layers = true;
  renderIntelLayerControls();

  if (isOfflineTerrainMode()) {
    clearLayerDataSources(viewer);
    if (terrainLocalAnalysisMode === "off") {
      viewerState.layerResults = [];
      setLayerStatusMessage(
        "로컬 지형분석 레이어는 현재 3D 미션에서 숨겼습니다."
      );
      viewerState.busy.layers = false;
      renderIntelLayerControls();
      return;
    }
    try {
      const result = await loadOfflineTerrainAnalysisDataSource(viewer);
      viewerState.layerResults = result ? [result] : [];
      setLayerStatusMessage(
        result
          ? `로컬 NGII ${result.layerDef.label} ${result.featureCount.toLocaleString(
              "ko-KR"
            )}건을 3D 지형에 반영했습니다.`
          : "로컬 지형분석 GeoJSON을 찾지 못했습니다."
      );
    } catch (error) {
      console.warn("Failed to load local offline terrain analysis.", error);
      viewerState.layerResults = [];
      setLayerStatusMessage(
        error instanceof Error
          ? error.message
          : "로컬 지형분석 레이어를 반영하지 못했습니다."
      );
    } finally {
      viewerState.busy.layers = false;
      renderIntelLayerControls();
    }
    return;
  }

  if (!vworldApiKey) {
    clearLayerDataSources(viewer);
    viewerState.layerResults = [];
    setLayerStatusMessage(
      "VWorld API 키가 없어 벡터 레이어를 불러오지 못했습니다."
    );
    viewerState.busy.layers = false;
    renderIntelLayerControls();
    return;
  }

  try {
    const selectedLayerKeys = TERRAIN_INTEL_LAYER_DEFS.filter(
      (layerDef) => viewerState.layerSelection[layerDef.key]
    ).map((layerDef) => layerDef.key);

    if (selectedLayerKeys.length === 0) {
      clearLayerDataSources(viewer);
      viewerState.layerResults = [];
      viewerState.analysis = null;
      clearMarkerEntities(viewer);
      clearAnalysisOverlayEntities(viewer);
      clearAssetRecommendationEntities(viewer);
      clearAnalysisHud();
      setAnalysisStatusMessage("");
      setLayerStatusMessage("선택된 보조 레이어가 없습니다.");
      viewer.scene.requestRender();
      return;
    }

    clearLayerDataSources(viewer);
    viewerState.layerResults = await loadTerrainIntelLayers({
      bounds: viewerState.bounds,
      selectedLayerKeys,
      runtimeConfig: intelRuntimeConfig,
    });

    for (const result of viewerState.layerResults) {
      if (result.status !== "ready" || result.featureCount === 0) {
        continue;
      }
      const dataSource = await Cesium.GeoJsonDataSource.load(
        result.featureCollection,
        {
          clampToGround: true,
        }
      );
      applyLayerStyle(dataSource, result.layerDef);
      await viewer.dataSources.add(dataSource);
      viewerState.layerDataSources.push(dataSource);
    }

    viewerState.analysis = null;
    clearMarkerEntities(viewer);
    clearAnalysisOverlayEntities(viewer);
    clearAssetRecommendationEntities(viewer);
    clearAnalysisHud();
    setAnalysisStatusMessage("");

    const loadedFeatureCount = viewerState.layerResults.reduce(
      (total, result) => total + result.featureCount,
      0
    );
    setLayerStatusMessage(
      `${selectedLayerKeys.length}개 레이어, 총 ${loadedFeatureCount.toLocaleString(
        "ko-KR"
      )}건을 선택 범위로 반영했습니다.`
    );
    viewer.scene.requestRender();
  } catch (error) {
    console.error("Failed to refresh VWorld terrain-intel layers.", error);
    setLayerStatusMessage(
      error instanceof Error
        ? error.message
        : "브이월드 레이어를 반영하지 못했습니다."
    );
  } finally {
    viewerState.busy.layers = false;
    renderIntelLayerControls();
  }
}

async function loadOfflineTerrainAnalysisDataSource(viewer) {
  const manifest = await loadOfflineTerrainManifestForCesium();
  const dataPath =
    manifest?.intel?.terrainAnalysis?.data ??
    "./intel/terrain-analysis.geojson";
  const dataUrl = resolveOfflineManifestAssetTemplate(manifest, dataPath);
  if (!dataUrl) {
    return null;
  }

  const response = await fetch(dataUrl, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`로컬 NGII 지형분석 로드 실패: ${response.status}`);
  }
  const featureCollection = await response.json();
  const filteredFeatureCollection =
    filterOfflineTerrainAnalysisFeatureCollection(
      featureCollection,
      viewerState.renderableBounds ?? viewerState.bounds
    );
  const sanitizerStats = createCesiumGeoJsonSanitizerStats();
  const cesiumFeatureCollection = sanitizeGeoJsonFeatureCollectionForCesium(
    filteredFeatureCollection,
    {
      stats: sanitizerStats,
    }
  );
  const features = Array.isArray(cesiumFeatureCollection?.features)
    ? cesiumFeatureCollection.features
    : [];
  if (features.length === 0) {
    return null;
  }

  const dataSource = await Cesium.GeoJsonDataSource.load(
    cesiumFeatureCollection,
    {
      clampToGround: true,
    }
  );
  applyOfflineTerrainAnalysisStyle(dataSource);
  await viewer.dataSources.add(dataSource);
  viewerState.layerDataSources.push(dataSource);
  revealCesiumEntitiesInBatches(viewer, dataSource.entities.values, {
    delayMs: 220,
    batchSize: 22,
    intervalMs: 30,
  });
  triggerTerrainJarvisScan();
  viewer.scene.requestRender();

  return {
    status: "ready",
    featureCount: features.length,
    sanitizerStats,
    featureCollection: filteredFeatureCollection,
    layerDef: {
      key: "ngii-local-terrain",
      label:
        terrainLocalAnalysisMode === "buildings"
          ? "건물 footprint"
          : "로컬 지형분석",
      analysisRole: "local",
    },
  };
}

async function attachOfflineBuildingsDataSource(viewer) {
  if (!offlineBuildingsRequested || !isOfflineTerrainMode()) {
    return null;
  }

  const manifest = await loadOfflineTerrainManifestForCesium();
  const dataPath =
    manifest?.intel?.buildings?.data ?? "./intel/buildings.geojson";
  const dataUrl = resolveOfflineManifestAssetTemplate(manifest, dataPath);
  if (!dataUrl) {
    return null;
  }

  try {
    viewerState.offlineBuildings = {
      requested: true,
      ready: false,
      dataSource: null,
      featureCount: 0,
      sanitizerStats: null,
      lastError: null,
    };
    setStatusMessage("로컬 NGII 건물 footprint를 3D로 세우는 중입니다.");

    const response = await fetch(dataUrl, { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`로컬 NGII 건물 로드 실패: ${response.status}`);
    }

    const featureCollection = await response.json();
    const filteredFeatureCollection = filterOfflineBuildingsFeatureCollection(
      featureCollection,
      viewerState.renderableBounds ?? viewerState.bounds
    );
    const sanitizerStats = createCesiumGeoJsonSanitizerStats();
    const cesiumFeatureCollection = sanitizeGeoJsonFeatureCollectionForCesium(
      filteredFeatureCollection,
      {
        dropNonPolygons: true,
        stats: sanitizerStats,
      }
    );
    const features = Array.isArray(cesiumFeatureCollection?.features)
      ? cesiumFeatureCollection.features
      : [];
    if (features.length === 0) {
      viewerState.offlineBuildings.ready = true;
      setStatusMessage("표시 범위 안의 로컬 NGII 건물 footprint가 없습니다.");
      return null;
    }

    const dataSource = await Cesium.GeoJsonDataSource.load(
      cesiumFeatureCollection,
      {
        clampToGround: false,
      }
    );
    applyOfflineBuildingExtrusionStyle(dataSource);
    await viewer.dataSources.add(dataSource);
    revealCesiumEntitiesInBatches(viewer, dataSource.entities.values, {
      delayMs: 620,
      batchSize: 96,
      intervalMs: 24,
    });

    viewerState.offlineBuildings = {
      requested: true,
      ready: true,
      dataSource,
      featureCount: features.length,
      sanitizerStats,
      lastError: null,
    };
    setProviderBadge("오프라인 3D");
    setStatusMessage(
      `로컬 NGII 건물 ${features.length.toLocaleString(
        "ko-KR"
      )}개를 지형 위 3D extrusion으로 표시합니다.`
    );
    triggerTerrainJarvisScan();
    viewer.scene.requestRender();
    return dataSource;
  } catch (error) {
    const lastError =
      error instanceof Error ? error.message : "offline-buildings-failed";
    console.warn("Failed to load offline NGII buildings.", error);
    viewerState.offlineBuildings = {
      requested: true,
      ready: false,
      dataSource: null,
      featureCount: 0,
      sanitizerStats: null,
      lastError,
    };
    setStatusMessage("로컬 NGII 건물 3D를 불러오지 못했습니다.");
    return null;
  }
}

function filterOfflineBuildingsFeatureCollection(featureCollection, bounds) {
  const features = Array.isArray(featureCollection?.features)
    ? featureCollection.features
    : [];
  if (!bounds || features.length === 0) {
    return {
      type: "FeatureCollection",
      features: [],
    };
  }

  const expandedBounds = expandBounds(bounds, 0, 0.0008);
  return {
    ...featureCollection,
    type: "FeatureCollection",
    features: features.filter((feature) =>
      geoJsonFeatureIntersectsBounds(feature, expandedBounds)
    ),
  };
}

function resolveOfflineBuildingHeightMeters(entity) {
  const height = Number(getEntityPropertyValue(entity, "height"));
  if (Number.isFinite(height) && height > 0) {
    return clamp(height, 3, 90);
  }

  const levels = Number(getEntityPropertyValue(entity, "levels"));
  if (Number.isFinite(levels) && levels > 0) {
    return clamp(levels * 3.8, 3.8, 90);
  }

  return 7.5;
}

function resolveOfflineBuildingAnalysisClass(entity) {
  return String(getEntityPropertyValue(entity, "analysisClass") ?? "")
    .trim()
    .toLowerCase();
}

function getOfflineBuildingUsageText(entity) {
  return [
    getEntityPropertyValue(entity, "buildingUsageGroup"),
    getEntityPropertyValue(entity, "buildingUsage"),
    getEntityPropertyValue(entity, "buildingDetailUsage"),
    getEntityPropertyValue(entity, "category"),
    getEntityPropertyValue(entity, "kind"),
  ]
    .map((value) => String(value ?? "").trim())
    .filter(Boolean)
    .join(" ");
}

function offlineBuildingTextIncludesAny(text, tokens) {
  return tokens.some((token) => text.includes(token));
}

function resolveOfflineBuildingMaterial(entity, heightMeters) {
  const analysisClass = resolveOfflineBuildingAnalysisClass(entity);
  const usageText = getOfflineBuildingUsageText(entity);
  const category = String(getEntityPropertyValue(entity, "category") ?? "");
  const levels = Number(getEntityPropertyValue(entity, "levels"));

  if (
    analysisClass === "critical" ||
    offlineBuildingTextIncludesAny(usageText, [
      "교육",
      "의료",
      "공공",
      "연구",
      "종교",
      "문화",
    ])
  ) {
    return Cesium.Color.fromCssColorString("#d7bd74").withAlpha(0.92);
  }
  if (
    analysisClass === "civilian" ||
    offlineBuildingTextIncludesAny(usageText, [
      "주거",
      "주택",
      "아파트",
      "연립",
      "다가구",
      "다세대",
    ])
  ) {
    return Cesium.Color.fromCssColorString("#d8c3ad").withAlpha(0.9);
  }
  if (
    analysisClass === "logistics" ||
    offlineBuildingTextIncludesAny(usageText, [
      "공장",
      "창고",
      "물류",
      "운수",
      "자동차",
      "제조",
    ])
  ) {
    return Cesium.Color.fromCssColorString("#98aeb4").withAlpha(0.88);
  }
  if (
    analysisClass === "restricted" ||
    offlineBuildingTextIncludesAny(usageText, ["군사", "위험", "제한"])
  ) {
    return Cesium.Color.fromCssColorString("#b98d82").withAlpha(0.88);
  }
  if (category.includes("가건물")) {
    return Cesium.Color.fromCssColorString("#b9c3bc").withAlpha(0.82);
  }
  if (category.includes("아파트") || heightMeters >= 28 || levels >= 8) {
    return Cesium.Color.fromCssColorString("#c8d4d2").withAlpha(0.9);
  }
  if (category.includes("공장") || category.includes("창고")) {
    return Cesium.Color.fromCssColorString("#9fb2b4").withAlpha(0.88);
  }
  if (category.includes("주택")) {
    return Cesium.Color.fromCssColorString("#d4c8b5").withAlpha(0.88);
  }

  return Cesium.Color.fromCssColorString("#c4c8bd").withAlpha(0.86);
}

function resolveOfflineBuildingOutlineColor(entity, heightMeters) {
  const analysisClass = resolveOfflineBuildingAnalysisClass(entity);
  if (analysisClass === "critical") {
    return Cesium.Color.fromCssColorString("#ffe188").withAlpha(0.42);
  }
  if (analysisClass === "civilian") {
    return Cesium.Color.fromCssColorString("#fff0d6").withAlpha(0.34);
  }
  if (analysisClass === "restricted") {
    return Cesium.Color.fromCssColorString("#ff9b8d").withAlpha(0.36);
  }
  if (heightMeters >= 14) {
    return Cesium.Color.fromCssColorString("#eef7ef").withAlpha(0.22);
  }
  return Cesium.Color.fromCssColorString("#f4ead5").withAlpha(0.12);
}

function escapeOfflineBuildingDescription(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function buildOfflineBuildingDescription(entity, heightMeters) {
  const analysisClass = resolveOfflineBuildingAnalysisClass(entity);
  const rows = [
    ["분류", analysisClass || "building"],
    ["용도군", getEntityPropertyValue(entity, "buildingUsageGroup")],
    ["용도", getEntityPropertyValue(entity, "buildingUsage")],
    ["세부용도", getEntityPropertyValue(entity, "buildingDetailUsage")],
    ["구조", getEntityPropertyValue(entity, "buildingStructure")],
    ["법정동", getEntityPropertyValue(entity, "legalDong")],
    ["지번", getEntityPropertyValue(entity, "parcelNo")],
    ["층수", getEntityPropertyValue(entity, "levels")],
    ["높이", `${Math.round(heightMeters)}m`],
    ["승인일", getEntityPropertyValue(entity, "approvalDate")],
  ].filter(([, value]) => String(value ?? "").trim());

  const tableRows = rows
    .map(
      ([label, value]) =>
        `<tr><th style="padding:3px 8px 3px 0;text-align:left;color:#7a8790;white-space:nowrap;">${escapeOfflineBuildingDescription(
          label
        )}</th><td style="padding:3px 0;color:#f4f7f7;">${escapeOfflineBuildingDescription(
          value
        )}</td></tr>`
    )
    .join("");

  return `<div style="font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#081114;color:#f4f7f7;padding:10px 12px;"><h3 style="margin:0 0 8px;font-size:15px;color:#9ee7ff;">NGII 오프라인 건물</h3><table style="border-collapse:collapse;font-size:12px;line-height:1.35;">${tableRows}</table></div>`;
}

function applyOfflineBuildingExtrusionStyle(dataSource) {
  dataSource.entities.values.forEach((entity) => {
    if (!entity.polygon) {
      return;
    }

    const analysisClass = resolveOfflineBuildingAnalysisClass(entity);
    const heightMeters = resolveOfflineBuildingHeightMeters(entity);
    entity.polygon.material = resolveOfflineBuildingMaterial(
      entity,
      heightMeters
    );
    entity.polygon.outline = false;
    entity.polygon.outlineColor = resolveOfflineBuildingOutlineColor(
      entity,
      heightMeters
    );
    entity.polygon.closeTop = true;
    entity.polygon.closeBottom = true;
    entity.polygon.height = 0;
    entity.polygon.extrudedHeight = heightMeters;
    entity.description = buildOfflineBuildingDescription(entity, heightMeters);
    if (Cesium.HeightReference) {
      entity.polygon.heightReference = Cesium.HeightReference.CLAMP_TO_GROUND;
      entity.polygon.extrudedHeightReference =
        Cesium.HeightReference.RELATIVE_TO_GROUND;
    }
  });
}

function filterOfflineTerrainAnalysisFeatureCollection(
  featureCollection,
  bounds
) {
  const features = Array.isArray(featureCollection?.features)
    ? featureCollection.features
    : [];
  if (!bounds || terrainLocalAnalysisMode === "off" || features.length === 0) {
    return {
      type: "FeatureCollection",
      features: [],
    };
  }

  const expandedBounds = expandBounds(bounds, 0, 0.0006);
  const filteredFeatures = features.filter((feature) => {
    const kind = String(feature?.properties?.kind ?? "");
    if (offlineBuildingsRequested && kind === "building-footprint") {
      return false;
    }
    if (terrainLocalAnalysisMode === "buildings") {
      if (kind !== "building-footprint") {
        return false;
      }
    }

    return geoJsonFeatureIntersectsBounds(feature, expandedBounds);
  });

  return {
    ...featureCollection,
    type: "FeatureCollection",
    features: filteredFeatures,
  };
}

function geoJsonFeatureIntersectsBounds(feature, bounds) {
  return geoJsonGeometryIntersectsBounds(feature?.geometry, bounds);
}

function geoJsonGeometryIntersectsBounds(geometry, bounds) {
  if (!geometry) {
    return false;
  }

  if (geometry.type === "GeometryCollection") {
    return Array.isArray(geometry.geometries)
      ? geometry.geometries.some((item) =>
          geoJsonGeometryIntersectsBounds(item, bounds)
        )
      : false;
  }

  return coordinatesIntersectBounds(geometry.coordinates, bounds);
}

function coordinatesIntersectBounds(coordinates, bounds) {
  if (!Array.isArray(coordinates)) {
    return false;
  }

  if (
    coordinates.length >= 2 &&
    typeof coordinates[0] === "number" &&
    typeof coordinates[1] === "number"
  ) {
    return coordinateIntersectsBounds(coordinates, bounds);
  }

  return coordinates.some((coordinate) =>
    coordinatesIntersectBounds(coordinate, bounds)
  );
}

function coordinateIntersectsBounds(coordinate, bounds) {
  const longitude = Number(coordinate?.[0]);
  const latitude = Number(coordinate?.[1]);
  return (
    Number.isFinite(longitude) &&
    Number.isFinite(latitude) &&
    longitude >= bounds.west &&
    longitude <= bounds.east &&
    latitude >= bounds.south &&
    latitude <= bounds.north
  );
}

const CESIUM_MIN_POLYGON_AREA_DEGREES = 1e-12;

function createCesiumGeoJsonSanitizerStats() {
  return {
    inputFeatureCount: 0,
    outputFeatureCount: 0,
    droppedFeatureCount: 0,
    inputRingCount: 0,
    droppedRingCount: 0,
  };
}

function sanitizeGeoJsonFeatureCollectionForCesium(
  featureCollection,
  options = {}
) {
  const features = Array.isArray(featureCollection?.features)
    ? featureCollection.features
    : [];
  if (options.stats) {
    options.stats.inputFeatureCount += features.length;
  }
  const sanitizedFeatures = features
    .map((feature) => {
      const sanitizedFeature = sanitizeGeoJsonFeatureForCesium(
        feature,
        options
      );
      if (!sanitizedFeature && options.stats) {
        options.stats.droppedFeatureCount += 1;
      }
      return sanitizedFeature;
    })
    .filter(Boolean);
  if (options.stats) {
    options.stats.outputFeatureCount += sanitizedFeatures.length;
  }

  return {
    ...featureCollection,
    type: "FeatureCollection",
    features: sanitizedFeatures,
  };
}

function sanitizeGeoJsonFeatureForCesium(feature, options) {
  const geometry = sanitizeGeoJsonGeometryForCesium(feature?.geometry, options);
  if (!geometry) {
    return null;
  }

  return {
    ...feature,
    type: "Feature",
    geometry,
  };
}

function sanitizeGeoJsonGeometryForCesium(geometry, options = {}) {
  if (!geometry) {
    return null;
  }

  if (geometry.type === "Polygon") {
    const coordinates = sanitizePolygonCoordinatesForCesium(
      geometry.coordinates,
      options
    );
    return coordinates ? { ...geometry, coordinates } : null;
  }

  if (geometry.type === "MultiPolygon") {
    const coordinates = Array.isArray(geometry.coordinates)
      ? geometry.coordinates
          .map((item) => sanitizePolygonCoordinatesForCesium(item, options))
          .filter(Boolean)
      : [];
    return coordinates.length > 0 ? { ...geometry, coordinates } : null;
  }

  if (geometry.type === "GeometryCollection") {
    const geometries = Array.isArray(geometry.geometries)
      ? geometry.geometries
          .map((item) => sanitizeGeoJsonGeometryForCesium(item, options))
          .filter(Boolean)
      : [];
    return geometries.length > 0 ? { ...geometry, geometries } : null;
  }

  return options.dropNonPolygons ? null : geometry;
}

function sanitizePolygonCoordinatesForCesium(coordinates, options = {}) {
  if (!Array.isArray(coordinates) || coordinates.length === 0) {
    return null;
  }

  const outerRing = sanitizeLinearRingForCesium(coordinates[0], options);
  if (!outerRing) {
    return null;
  }

  const innerRings = coordinates
    .slice(1)
    .map((ring) => sanitizeLinearRingForCesium(ring, options))
    .filter(Boolean);

  return [outerRing, ...innerRings];
}

function sanitizeLinearRingForCesium(ring, options = {}) {
  if (options.stats) {
    options.stats.inputRingCount += 1;
  }

  const dropRing = () => {
    if (options.stats) {
      options.stats.droppedRingCount += 1;
    }
    return null;
  };

  const points = Array.isArray(ring)
    ? ring.map(normalizeGeoJsonPosition).filter(Boolean)
    : [];
  if (points.length < 3) {
    return dropRing();
  }

  const dedupedPoints = [];
  points.forEach((point) => {
    const previous = dedupedPoints[dedupedPoints.length - 1];
    if (!previous || !sameGeoJsonPosition2d(previous, point)) {
      dedupedPoints.push(point);
    }
  });

  if (
    dedupedPoints.length > 1 &&
    sameGeoJsonPosition2d(
      dedupedPoints[0],
      dedupedPoints[dedupedPoints.length - 1]
    )
  ) {
    dedupedPoints.pop();
  }

  const uniquePointKeys = new Set(
    dedupedPoints.map(
      (point) => `${point[0].toFixed(8)},${point[1].toFixed(8)}`
    )
  );
  if (dedupedPoints.length < 3 || uniquePointKeys.size < 3) {
    return dropRing();
  }

  const closedRing = [...dedupedPoints, dedupedPoints[0]];
  if (getLinearRingAreaDegrees(closedRing) < CESIUM_MIN_POLYGON_AREA_DEGREES) {
    return dropRing();
  }

  return closedRing;
}

function normalizeGeoJsonPosition(position) {
  if (!Array.isArray(position) || position.length < 2) {
    return null;
  }

  const longitude = Number(position[0]);
  const latitude = Number(position[1]);
  if (!Number.isFinite(longitude) || !Number.isFinite(latitude)) {
    return null;
  }

  const normalized = [longitude, latitude];
  const altitude = Number(position[2]);
  if (Number.isFinite(altitude)) {
    normalized.push(altitude);
  }
  return normalized;
}

function sameGeoJsonPosition2d(left, right) {
  return left?.[0] === right?.[0] && left?.[1] === right?.[1];
}

function getLinearRingAreaDegrees(ring) {
  let area = 0;
  for (
    let index = 0, previousIndex = ring.length - 1;
    index < ring.length;
    previousIndex = index, index += 1
  ) {
    area +=
      ring[previousIndex][0] * ring[index][1] -
      ring[index][0] * ring[previousIndex][1];
  }
  return Math.abs(area) / 2;
}

function getEntityPropertyValue(entity, key) {
  const property = entity?.properties?.[key];
  if (!property) {
    return "";
  }
  if (typeof property.getValue === "function") {
    return property.getValue(Cesium.JulianDate.now());
  }
  return property;
}

function getOfflineAnalysisStyle(analysisClass, kind) {
  if (kind === "road-surface") {
    return {
      fill: "#d8c981",
      stroke: "#ffe190",
      alpha: 0.08,
      width: 0.8,
    };
  }
  if (kind === "building-footprint") {
    return {
      fill: "#c4c8bd",
      stroke: "#f4ead5",
      alpha: 0.06,
      width: 0.45,
    };
  }
  switch (analysisClass) {
    case "water":
      return {
        fill: "#69d8ee",
        stroke: "#69d8ee",
        alpha: 0.28,
        width: 2.2,
      };
    case "urban":
      return {
        fill: "#b4459d",
        stroke: "#e778cc",
        alpha: 0.16,
        width: 1.0,
      };
    case "forest":
      return {
        fill: "#228b35",
        stroke: "#58d17e",
        alpha: 0.18,
        width: 1.2,
      };
    case "open":
      return {
        fill: "#d2b05f",
        stroke: "#ffe08a",
        alpha: 0.14,
        width: 1.0,
      };
    case "slope-high":
      return {
        fill: "#e1645f",
        stroke: "#ff9a80",
        alpha: 0.22,
        width: 1.7,
      };
    case "slope-mid":
      return {
        fill: "#d2b05f",
        stroke: "#ffd26d",
        alpha: 0.17,
        width: 1.2,
      };
    case "slope-low":
      return {
        fill: "#7fbf7b",
        stroke: "#9be48c",
        alpha: 0.1,
        width: 0.8,
      };
    case "contour":
      return {
        fill: "#ecfffb",
        stroke: "#ecfffb",
        alpha: 0.48,
        width: 1.0,
      };
    case "elevation-point":
      return {
        fill: "#ecfffb",
        stroke: "#04161d",
        alpha: 0.86,
        width: 1.0,
      };
    default:
      return {
        fill: "#7fe7ff",
        stroke: "#7fe7ff",
        alpha: 0.12,
        width: 0.9,
      };
  }
}

function resolveOfflineAnalysisFillAlpha(style) {
  if (terrainAnalysisOverlayMode === "outline") {
    return 0;
  }

  if (terrainAnalysisOverlayMode === "tactical") {
    return clamp(style.alpha * 1.35, 0.12, 0.34);
  }

  return style.alpha;
}

function applyOfflineTerrainAnalysisStyle(dataSource) {
  dataSource.entities.values.forEach((entity) => {
    const analysisClass = String(
      getEntityPropertyValue(entity, "analysisClass") ?? ""
    );
    const kind = String(getEntityPropertyValue(entity, "kind") ?? "");
    const style = getOfflineAnalysisStyle(analysisClass, kind);
    const fillColor = Cesium.Color.fromCssColorString(style.fill).withAlpha(
      resolveOfflineAnalysisFillAlpha(style)
    );
    const strokeColor = Cesium.Color.fromCssColorString(style.stroke).withAlpha(
      terrainAnalysisOverlayMode === "tactical"
        ? Math.min(0.95, style.alpha + 0.48)
        : Math.min(0.9, style.alpha + 0.32)
    );

    if (entity.polygon) {
      entity.polygon.material = fillColor;
      entity.polygon.show = terrainAnalysisOverlayMode !== "outline";
      entity.polygon.outline = false;
      entity.polygon.classificationType =
        terrainAnalysisOverlayMode === "outline"
          ? undefined
          : Cesium.ClassificationType.TERRAIN;
    }
    if (entity.polyline) {
      entity.polyline.material = strokeColor;
      entity.polyline.width = style.width;
      entity.polyline.clampToGround = true;
    }
    if (entity.point) {
      entity.point.color = fillColor;
      entity.point.pixelSize = analysisClass === "elevation-point" ? 5 : 6;
      entity.point.outlineColor = Cesium.Color.fromCssColorString("#04161d");
      entity.point.outlineWidth = 2;
    }
  });
}

function applyLayerStyle(dataSource, layerDef) {
  const strokeColor = Cesium.Color.fromCssColorString(layerDef.style.stroke);
  const fillColor = Cesium.Color.fromCssColorString(layerDef.style.fill);

  dataSource.entities.values.forEach((entity) => {
    if (entity.polygon) {
      entity.polygon.material = fillColor;
      entity.polygon.outline = false;
      entity.polygon.classificationType = Cesium.ClassificationType.TERRAIN;
    }
    if (entity.polyline) {
      entity.polyline.material = strokeColor;
      entity.polyline.width = layerDef.style.width;
      entity.polyline.clampToGround = true;
    }
    if (entity.point) {
      entity.point.color = strokeColor;
      entity.point.pixelSize = 6;
      entity.point.outlineColor = Cesium.Color.fromCssColorString("#04161d");
      entity.point.outlineWidth = 2;
    }
  });
}

async function sampleTerrainGrid(viewer, bounds, columns = 10, rows = 10) {
  const center = getCenter(bounds);
  const lonStep = (bounds.east - bounds.west) / columns;
  const latStep = (bounds.north - bounds.south) / rows;
  const samples = [];
  const terrainProvider = viewer.terrainProvider;
  const supportsTerrain =
    terrainProvider &&
    !(terrainProvider instanceof Cesium.EllipsoidTerrainProvider);

  for (let rowIndex = 0; rowIndex < rows; rowIndex += 1) {
    for (let columnIndex = 0; columnIndex < columns; columnIndex += 1) {
      const lon = bounds.west + lonStep * (columnIndex + 0.5);
      const lat = bounds.south + latStep * (rowIndex + 0.5);
      samples.push({
        rowIndex,
        columnIndex,
        lon,
        lat,
        cartographic: Cesium.Cartographic.fromDegrees(lon, lat),
      });
    }
  }

  if (supportsTerrain) {
    await sampleTerrainCartographics(
      terrainProvider,
      samples.map((sample) => sample.cartographic)
    );
  }

  const metersPerLongitude = 111320 * Math.cos((center.lat * Math.PI) / 180);
  const enrichedSamples = samples.map((sample) => {
    const sampledHeight = Number.isFinite(sample.cartographic.height)
      ? sample.cartographic.height
      : 0;
    const localX = (sample.lon - center.lon) * metersPerLongitude;
    const localY = (sample.lat - center.lat) * 111320;

    return {
      ...sample,
      heightMeters: sampledHeight,
      localX,
      localY,
      distanceFromCenterMeters: Math.hypot(localX, localY),
      slopeDegrees: 0,
    };
  });

  return calculateSampleSlopes(enrichedSamples);
}

async function sampleTerrainCartographics(terrainProvider, cartographics) {
  const supportsMostDetailedSampling =
    typeof Cesium.sampleTerrainMostDetailed === "function" &&
    typeof terrainProvider?.availability?.computeMaximumLevelAtPosition ===
      "function";

  if (supportsMostDetailedSampling) {
    try {
      await Cesium.sampleTerrainMostDetailed(terrainProvider, cartographics);
      return;
    } catch (error) {
      console.warn(
        "Most detailed terrain sampling failed. Falling back to fixed-level sampling.",
        error
      );
    }
  }

  if (typeof Cesium.sampleTerrain !== "function") {
    return;
  }

  const sampleLevel = Math.max(
    0,
    Math.floor(Number(terrainProvider?.__vistaOfflineTerrainSampleLevel) || 12)
  );

  try {
    await Cesium.sampleTerrain(terrainProvider, sampleLevel, cartographics);
  } catch (error) {
    console.warn(
      "Fixed-level terrain sampling failed. Continuing analysis with flat heights.",
      error
    );
  }
}

function calculateSampleSlopes(samples) {
  const sampleLookup = new Map(
    samples.map((sample) => [
      `${sample.rowIndex}:${sample.columnIndex}`,
      sample,
    ])
  );

  return samples.map((sample) => {
    const left =
      sampleLookup.get(`${sample.rowIndex}:${sample.columnIndex - 1}`) ??
      sample;
    const right =
      sampleLookup.get(`${sample.rowIndex}:${sample.columnIndex + 1}`) ??
      sample;
    const down =
      sampleLookup.get(`${sample.rowIndex - 1}:${sample.columnIndex}`) ??
      sample;
    const up =
      sampleLookup.get(`${sample.rowIndex + 1}:${sample.columnIndex}`) ??
      sample;
    const deltaX = right.localX - left.localX || 1;
    const deltaY = up.localY - down.localY || 1;
    const dzdx = (right.heightMeters - left.heightMeters) / deltaX;
    const dzdy = (up.heightMeters - down.heightMeters) / deltaY;
    const slopeDegrees =
      Math.atan(Math.sqrt(dzdx * dzdx + dzdy * dzdy)) * (180 / Math.PI);

    return {
      ...sample,
      slopeDegrees: Number.isFinite(slopeDegrees) ? slopeDegrees : 0,
    };
  });
}

function addTerrainMarkers(viewer, markers) {
  clearMarkerEntities(viewer);

  markers.forEach((marker) => {
    const markerColor =
      marker.type === "artillery"
        ? Cesium.Color.fromCssColorString("#ffd26d")
        : marker.type === "crossing"
          ? Cesium.Color.fromCssColorString("#71d9ff")
          : Cesium.Color.fromCssColorString("#58d17e");
    const entity = viewer.entities.add({
      position: Cesium.Cartesian3.fromDegrees(
        marker.lon,
        marker.lat,
        marker.heightMeters + 12
      ),
      point: {
        pixelSize: 9,
        color: markerColor,
        outlineColor: Cesium.Color.fromCssColorString("#051117"),
        outlineWidth: 2,
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
      },
      label: {
        text: marker.id,
        font: "700 11px 'Segoe UI', 'Noto Sans KR', sans-serif",
        fillColor: Cesium.Color.fromCssColorString("#ecfffb"),
        showBackground: true,
        backgroundColor:
          Cesium.Color.fromCssColorString("#04161d").withAlpha(0.8),
        pixelOffset: new Cesium.Cartesian2(0, -18),
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
        verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
      },
      description: `${marker.reason}\n점수 ${formatScore(marker.score ?? 0)}`,
    });
    viewerState.markerEntities.push(entity);
  });
}

function addAnalysisOverlays(viewer, analysis) {
  clearAnalysisOverlayEntities(viewer);
  clearAssetRecommendationEntities(viewer);

  addHeatmapOverlay(viewer, analysis.concealmentCells);
  addLosOverlay(viewer, analysis.losSegments);
  addAssetRecommendationOverlay(viewer, analysis.assetRecommendations);
}

function addHeatmapOverlay(viewer, cells) {
  if (!Array.isArray(cells)) {
    return;
  }

  cells.forEach((cell) => {
    const dominantScore =
      cell.dominantType === "concealment"
        ? cell.concealmentScore
        : cell.exposureScore;
    if (dominantScore < 0.4) {
      return;
    }

    const alpha = 0.08 + dominantScore * 0.2;
    const fillColor =
      cell.dominantType === "concealment"
        ? Cesium.Color.fromCssColorString("#58d17e").withAlpha(alpha)
        : Cesium.Color.fromCssColorString("#ff8b7c").withAlpha(alpha * 0.92);
    const entity = viewer.entities.add({
      polygon: {
        hierarchy: Cesium.Cartesian3.fromDegreesArray([
          cell.west,
          cell.south,
          cell.east,
          cell.south,
          cell.east,
          cell.north,
          cell.west,
          cell.north,
        ]),
        material: fillColor,
        outline: false,
        classificationType: Cesium.ClassificationType.TERRAIN,
      },
    });
    viewerState.analysisOverlayEntities.push(entity);
  });
}

function addLosOverlay(viewer, losSegments) {
  if (!Array.isArray(losSegments)) {
    return;
  }

  losSegments.forEach((segment) => {
    if (
      !Number.isFinite(segment.startLon) ||
      !Number.isFinite(segment.startLat) ||
      !Number.isFinite(segment.endLon) ||
      !Number.isFinite(segment.endLat)
    ) {
      return;
    }

    const isOpenSegment = segment.type === "open";
    const entity = viewer.entities.add({
      polyline: {
        positions: Cesium.Cartesian3.fromDegreesArrayHeights([
          segment.startLon,
          segment.startLat,
          (segment.startHeightMeters ?? 0) + 28,
          segment.endLon,
          segment.endLat,
          (segment.endHeightMeters ?? 0) + 20,
        ]),
        width: isOpenSegment ? 2.2 : 1.8,
        clampToGround: false,
        material: isOpenSegment
          ? Cesium.Color.fromCssColorString("#8cff9f").withAlpha(0.9)
          : new Cesium.PolylineDashMaterialProperty({
              color: Cesium.Color.fromCssColorString("#ff8b7c").withAlpha(0.88),
              dashLength: 14,
            }),
      },
    });
    viewerState.analysisOverlayEntities.push(entity);
  });
}

function addAssetRecommendationOverlay(viewer, recommendations) {
  if (!Array.isArray(recommendations)) {
    return;
  }

  recommendations.slice(0, 4).forEach((recommendation) => {
    if (
      !Number.isFinite(recommendation.unitLon) ||
      !Number.isFinite(recommendation.unitLat) ||
      !Number.isFinite(recommendation.markerLon) ||
      !Number.isFinite(recommendation.markerLat)
    ) {
      return;
    }

    const color =
      recommendation.markerType === "artillery"
        ? Cesium.Color.fromCssColorString("#ffd26d")
        : recommendation.markerType === "concealment"
          ? Cesium.Color.fromCssColorString("#7de9a8")
          : Cesium.Color.fromCssColorString("#71d9ff");
    const entity = viewer.entities.add({
      polyline: {
        positions: Cesium.Cartesian3.fromDegreesArrayHeights([
          recommendation.unitLon,
          recommendation.unitLat,
          (recommendation.unitHeightMeters ?? 0) + 36,
          recommendation.markerLon,
          recommendation.markerLat,
          (recommendation.markerHeightMeters ?? 0) + 32,
        ]),
        width: recommendation.selectedUnit ? 3.2 : 2.4,
        clampToGround: false,
        material: new Cesium.PolylineDashMaterialProperty({
          color: color.withAlpha(recommendation.selectedUnit ? 0.95 : 0.74),
          dashLength: recommendation.selectedUnit ? 18 : 24,
        }),
      },
      description: recommendation.summary,
    });
    viewerState.assetRecommendationEntities.push(entity);
  });
}

async function runEngineAnalysis(viewer) {
  if (!viewer) {
    setAnalysisStatusMessage("3D 지형 뷰어 준비 후 분석을 실행할 수 있습니다.");
    return null;
  }

  if (!viewerState.bounds) {
    return null;
  }

  viewerState.busy.engine = true;
  setButtonBusy(runEngineAnalysisButton, true, "분석 중");
  setAnalysisStatusMessage(
    "고도 샘플, LOS 레이, 차폐 히트맵을 종합해 전술 콜아웃을 전개합니다."
  );

  try {
    if (viewerState.layerResults.length === 0 && vworldApiKey) {
      await refreshTerrainIntelLayers(viewer);
    }

    const terrainSamples = await sampleTerrainGrid(
      viewer,
      viewerState.bounds,
      gridColumns,
      gridRows
    );
    const baseAnalysis = buildTerrainIntelAnalysis({
      bounds: viewerState.bounds,
      widthMeters: viewerState.widthMeters,
      heightMeters: viewerState.heightMeters,
      terrainSamples,
      layerResults: viewerState.layerResults,
    });
    viewerState.analysis = enrichTerrainAnalysisWithRuntimeContext(
      baseAnalysis,
      viewerState.runtimeSnapshot
    );
    viewerState.vlmResult = null;
    addTerrainMarkers(viewer, viewerState.analysis.markers);
    addAnalysisOverlays(viewer, viewerState.analysis);
    revealCesiumEntitiesInBatches(
      viewer,
      [
        ...viewerState.markerEntities,
        ...viewerState.analysisOverlayEntities,
        ...viewerState.assetRecommendationEntities,
      ],
      {
        delayMs: 180,
        batchSize: 8,
        intervalMs: 70,
      }
    );
    renderAnalysisHud(viewer);
    triggerTerrainJarvisScan();
    renderAnalysisSummary();
    renderVlmReport();
    setAnalysisStatusMessage(
      `${viewerState.analysis.sampledPointCount}개 샘플 기반으로 ${viewerState.analysisHudEntries.length}개 전술 콜아웃을 전개했습니다.`
    );
    viewer.scene.requestRender();
    return viewerState.analysis;
  } catch (error) {
    console.error("Failed to run engine terrain analysis.", error);
    setAnalysisStatusMessage(
      error instanceof Error
        ? error.message
        : "엔진 지형 분석을 수행하지 못했습니다."
    );
    return null;
  } finally {
    viewerState.busy.engine = false;
    setButtonBusy(runEngineAnalysisButton, false, "지형 분석");
    notifyHostAnalysisState();
  }
}

async function captureViewerImageBase64(viewer) {
  viewer.render();
  viewer.scene.requestRender();
  await wait(80);
  const dataUrl = viewer.canvas.toDataURL("image/png");
  return dataUrl.replace(/^data:image\/png;base64,/, "");
}

async function resolveOllamaVisionModel() {
  try {
    const response = await fetch(
      `${intelRuntimeConfig.ollamaBaseUrl}/api/tags`
    );
    if (!response.ok) {
      return intelRuntimeConfig.ollamaVisionModel;
    }

    const payload = await readJsonResponse(response);
    return selectOllamaVisionModel(
      intelRuntimeConfig.ollamaVisionModel,
      extractOllamaModelNames(payload)
    );
  } catch (error) {
    console.warn("Failed to inspect local Ollama models.", error);
    return intelRuntimeConfig.ollamaVisionModel;
  }
}

async function readJsonResponse(response) {
  const responseText = await response.text();
  if (!responseText.trim()) {
    return {};
  }

  try {
    return JSON.parse(responseText);
  } catch (_error) {
    return {
      error: responseText,
    };
  }
}

async function runVlmAnalysis(viewer) {
  if (!viewer) {
    setCaptureStatusMessage(
      "3D 지형 뷰어 준비 후 VLM 브리핑을 실행할 수 있습니다."
    );
    return;
  }

  viewerState.busy.vlm = true;
  setButtonBusy(runVlmAnalysisButton, true, "브리핑 중");
  setVlmRuntimeBadge("캡처 준비");

  try {
    const analysis = viewerState.analysis ?? (await runEngineAnalysis(viewer));
    if (!analysis) {
      throw new Error("VLM 브리핑 전에 엔진 분석을 만들지 못했습니다.");
    }

    setVlmRuntimeBadge("확인");
    const ollamaVisionModel = await resolveOllamaVisionModel();
    if (!ollamaVisionModel) {
      throw new Error("Ollama 모델을 찾지 못했습니다.");
    }
    const supportsImageInput = isLikelyOllamaVisionModelName(ollamaVisionModel);
    let screenshotBase64 = "";
    if (supportsImageInput) {
      screenshotBase64 = await captureViewerImageBase64(viewer);
      viewerState.captureTimestamp = new Date();
      setCaptureStatusMessage("캡처 완료");
    } else {
      setCaptureStatusMessage(
        `이미지 입력 모델이 없어 ${ollamaVisionModel} 엔진 분석 브리핑으로 전환했습니다.`
      );
    }
    setVlmRuntimeBadge("분석 중");
    const briefingMessage = {
      role: "user",
      content: buildTerrainVlmPrompt(analysis, {
        includeScreenshotContext: supportsImageInput,
      }),
    };
    if (supportsImageInput) {
      briefingMessage.images = [screenshotBase64];
    }

    const response = await fetch(
      `${intelRuntimeConfig.ollamaBaseUrl}/api/chat`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: ollamaVisionModel,
          stream: false,
          format: OLLAMA_TERRAIN_REPORT_SCHEMA,
          messages: [briefingMessage],
        }),
      }
    );
    const payload = await readJsonResponse(response);
    if (!response.ok) {
      throw new Error("Ollama 요청 실패");
    }

    const content = payload?.message?.content;
    if (typeof content !== "string" || content.trim().length === 0) {
      throw new Error("분석 응답 본문이 비어 있습니다.");
    }

    viewerState.vlmResult = parseTerrainVlmReport(content);
    renderVlmReport();
    renderAnalysisHud(viewer);
    setVlmRuntimeBadge("브리핑 완료");
    setAnalysisStatusMessage("VLM 브리핑을 HUD 전술 콜아웃에 반영했습니다.");
    viewer.scene.requestRender();
  } catch (error) {
    console.error("Failed to run terrain briefing.", error);
    setVlmRuntimeBadge("브리핑 실패");
    setCaptureStatusMessage(
      error instanceof Error
        ? error.message
        : "분석 브리핑을 수행하지 못했습니다."
    );
  } finally {
    viewerState.busy.vlm = false;
    setButtonBusy(runVlmAnalysisButton, false, "VLM 브리핑");
    notifyHostAnalysisState();
  }
}

function wait(durationMs) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, durationMs);
  });
}

function shouldUseJarvisReveal() {
  return viewerState.visualOptions.revealMode === "jarvis";
}

function triggerTerrainJarvisScan() {
  if (!shouldUseJarvisReveal() || !document.body) {
    return;
  }

  document.body.classList.remove("terrain-jarvis-scan");
  void document.body.offsetWidth;
  document.body.classList.add("terrain-jarvis-scan");
  window.setTimeout(() => {
    document.body?.classList.remove("terrain-jarvis-scan");
  }, 950);
}

function revealCesiumEntitiesInBatches(
  viewer,
  entities,
  { delayMs = 0, batchSize = 24, intervalMs = 34 } = {}
) {
  if (!viewer?.scene || !shouldUseJarvisReveal() || !Array.isArray(entities)) {
    return;
  }

  const revealTargets = entities.filter(Boolean);
  if (revealTargets.length === 0) {
    return;
  }

  revealTargets.forEach((entity) => {
    entity.show = false;
  });
  viewer.scene.requestRender();

  let index = 0;
  const revealNextBatch = () => {
    const batch = revealTargets.slice(index, index + batchSize);
    batch.forEach((entity) => {
      entity.show = true;
    });
    index += batchSize;
    viewer.scene.requestRender();
    if (index < revealTargets.length) {
      window.setTimeout(revealNextBatch, intervalMs);
    }
  };

  window.setTimeout(revealNextBatch, delayMs);
}

function wireIntelControls(viewer) {
  reloadIntelLayersButton?.addEventListener("click", () => {
    refreshTerrainIntelLayers(viewer);
  });
  runEngineAnalysisButton?.addEventListener("click", () => {
    if (viewerState.analysis) {
      clearTerrainAnalysis(viewer);
      return;
    }

    runEngineAnalysis(viewer);
  });
  runVlmAnalysisButton?.addEventListener("click", () => {
    runVlmAnalysis(viewer);
  });
  renderIntelLayerControls();
  clearAnalysisHud();
  renderAnalysisSummary();
  renderVlmReport();
  setVlmRuntimeBadge("");
}

async function initialize() {
  const bounds = parseBoundsFromLocation();
  if (!bounds) {
    throw new Error("Invalid terrain bounds.");
  }

  viewerState.bounds = bounds;
  setLoadingState(
    "선택 지형 준비 중",
    "MapTiler 지형과 선택 범위 전용 3D 런타임을 초기화합니다."
  );

  if (shouldTryMapTilerTerrainPlanA()) {
    try {
      if (cesiumContainer) {
        cesiumContainer.hidden = true;
      }
      const planA = await initializeMapTilerTerrainPlanA({
        container: mapLibreContainer,
        bounds,
        mapTilerApiKey,
        offlineMapManifestUrl: resolveOfflineMapManifestUrl(),
        setLoadingState,
        hideLoadingOverlay,
        setStatusMessage,
        setProviderBadge,
        setPlacementBadge,
        wirePanelControls,
      });
      viewerState.viewer = planA.map;
      viewerState.provider = "maptiler-maplibre";
      window.__terrain3dIntelState__ = viewerState;
      return;
    } catch (error) {
      console.warn(
        "MapTiler MapLibre terrain plan failed. Falling back to Cesium/VWorld runtime.",
        error
      );
      prepareCesiumFallbackSurface();
      setLoadingState(
        "기존 3D 지형 경로로 전환 중",
        "MapTiler Plan A 초기화에 실패해 Plan B를 시도합니다."
      );
    }
  }

  if (!Cesium) {
    throw new Error("Cesium runtime not found.");
  }

  window.CESIUM_BASE_URL = CESIUM_BASE_URL;
  if (typeof Cesium.buildModuleUrl?.setBaseUrl === "function") {
    Cesium.buildModuleUrl.setBaseUrl(CESIUM_BASE_URL);
  }

  const { widthMeters, heightMeters } = updateMetrics(bounds);
  viewerState.widthMeters = widthMeters;
  viewerState.heightMeters = heightMeters;
  let offlineManifest = null;
  if (isOfflineTerrainMode()) {
    try {
      offlineManifest = await loadOfflineTerrainManifestForCesium();
    } catch (error) {
      console.warn("Failed to preload offline map manifest.", error);
    }
  }
  const runtimeRenderableBounds =
    isOfflineTerrainMode() && offlineManifest
      ? (intersectBounds(
          bounds,
          getOfflineSourceBounds(
            offlineManifest,
            offlineManifest?.sources?.terrainDem,
            bounds
          )
        ) ?? bounds)
      : bounds;
  viewerState.renderableBounds = runtimeRenderableBounds;
  const placementRuntime = createTerrainPlacementRuntime({
    Cesium,
    bounds: runtimeRenderableBounds,
    widthMeters,
    heightMeters,
    liveRuntimeEnabled: searchParams.get("continueSimulation") === "1",
    notifyReadyOnAttach: false,
    animationFrameIntervalMs: terrainBalancedPerformanceMode
      ? TERRAIN_BALANCED_ANIMATION_FRAME_INTERVAL_MS
      : 0,
    setStatusMessage,
    setPlacementBadge: setRuntimePlacementBadge,
  });

  window.addEventListener("message", handleRuntimeSnapshotMessage);
  window.addEventListener("message", placementRuntime.handleMessage);
  window.addEventListener("message", handleTerrainViewerCommand);
  renderDroneRedeploymentMissionOverlay();
  setRuntimePlacementBadge("배치 대기");

  const terrainProviderInfo = await createTerrainProvider(offlineManifest);
  const imageryBounds = isOfflineTerrainMode()
    ? bounds
    : expandBounds(bounds, 0.14, 0.0012);
  const viewer = new Cesium.Viewer("cesiumContainer", {
    baseLayer: createBaseLayer(imageryBounds, offlineManifest),
    terrainProvider: terrainProviderInfo.provider,
    timeline: false,
    animation: false,
    baseLayerPicker: false,
    geocoder: false,
    homeButton: false,
    infoBox: false,
    sceneModePicker: false,
    selectionIndicator: false,
    navigationHelpButton: false,
    fullscreenButton: false,
    shouldAnimate: false,
    scene3DOnly: true,
    shadows: false,
    contextOptions: {
      webgl: {
        alpha: true,
        preserveDrawingBuffer: !terrainBalancedPerformanceMode,
        powerPreference: "high-performance",
      },
    },
  });
  viewerState.viewer = viewer;

  const limitRectangle = buildRectangle(expandBounds(bounds, 0.08, 0.0006));
  configureViewer(viewer, limitRectangle, widthMeters, heightMeters);
  await placementRuntime.attach(viewer);
  startDroneRedeploymentMissionAnimation(placementRuntime);
  addSelectionOverlay(viewer, bounds);
  flyToObliqueView(viewer, bounds, widthMeters, heightMeters, 0);
  wireViewButtons(viewer, bounds, widthMeters, heightMeters);
  wirePanelControls();
  wireIntelControls(viewer);
  wireAnalysisHudInteractions();
  viewer.scene.postRender.addEventListener(() => {
    syncAnalysisHudLayout(viewer);
  });
  window.addEventListener("resize", () => {
    syncAnalysisHudLayout(viewer);
    viewer.scene.requestRender();
  });
  viewer.scene.requestRender();

  window.__terrain3dViewer__ = viewer;
  window.__terrain3dIntelState__ = viewerState;
  window.__terrain3dPlacementRuntime__ = placementRuntime;
  setProviderBadge(terrainProviderInfo.providerLabel);

  if (terrainProviderInfo.hasTerrain) {
    setStatusMessage("선택 bbox 내부만 지형과 영상 타일을 로드합니다.");
  } else {
    setStatusMessage("지형 고도 데이터를 불러오지 못해 영상만 표시합니다.");
  }
  const vworldBuildingsLoad = attachVWorldBuildingsTileset(
    viewer,
    runtimeRenderableBounds
  );
  const offlineTilesetsLoad = attachOfflineTilesets(viewer, offlineManifest);
  const offlineBuildingsLoad = attachOfflineBuildingsDataSource(viewer);

  if (isOfflineTerrainMode()) {
    setLayerStatusMessage("로컬 NGII 지형분석 레이어를 불러오는 중입니다.");
    await refreshTerrainIntelLayers(viewer);
  } else if (vworldApiKey) {
    setLayerStatusMessage(
      "브이월드 벡터 레이어를 범위 기준으로 불러오는 중입니다."
    );
    await refreshTerrainIntelLayers(viewer);
  } else {
    setLayerStatusMessage(
      "VWorld API 키가 없어 벡터 레이어는 비활성 상태입니다."
    );
  }
  setAnalysisStatusMessage("");

  await warmupInitialTerrainRuntime({
    viewer,
    bounds: runtimeRenderableBounds,
    offlineManifest,
    placementRuntime,
  });
  await withWarmupTimeout(offlineBuildingsLoad, 3200);
  await withWarmupTimeout(offlineTilesetsLoad, 4200);
  await withWarmupTimeout(vworldBuildingsLoad, 5200);
  hideLoadingOverlay();
  placementRuntime.notifyReady();
}

initialize().catch((error) => {
  console.error("Failed to initialize terrain 3D viewer.", error);
  setProviderBadge("초기화 실패");
  setPlacementBadge("사용 불가");
  setStatusMessage("선택 영역 전용 3D 뷰어를 시작하지 못했습니다.");
  setLoadingState(
    "3D 지형을 열지 못했습니다.",
    "영역 정보 또는 외부 지형 타일 설정을 확인해 주세요."
  );
  setAnalysisStatusMessage(
    error instanceof Error
      ? error.message
      : "지형 뷰어 초기화 중 오류가 발생했습니다."
  );
});
