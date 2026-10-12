// @ts-nocheck
const CesiumRef = window.Cesium;
const runtimeConfig =
  window.__TACTICAL_SIM_CONFIG__ ?? window.__FLIGHT_SIM_CONFIG__ ?? {};
const queryParams = new URLSearchParams(window.location.search);
const stateKey = queryParams.get("state");
const payload = (() => {
  try {
    return JSON.parse(window.sessionStorage.getItem(stateKey) ?? "null");
  } catch (_error) {
    return null;
  }
})();

const bootStatusElement = document.getElementById("boot-status");
const hudElement = document.getElementById("hud");
const starterPanelElement = document.getElementById("starter-panel");
const mapToolsElement = document.getElementById("map-tools");
const toastElement = document.getElementById("toast");
const reticleElement = document.getElementById("reticle");
const runtimeCommandButtons = [
  ...document.querySelectorAll("[data-runtime-command]"),
];
const hud = {
  eyebrow: document.getElementById("hud-eyebrow"),
  title: document.getElementById("hud-title"),
  subtitle: document.getElementById("hud-subtitle"),
  provider: document.getElementById("hud-provider"),
  status: document.getElementById("hud-status"),
  phase: document.getElementById("hud-phase"),
  objective: document.getElementById("hud-objective"),
  target: document.getElementById("hud-target"),
  weapons: document.getElementById("hud-weapons"),
  system: document.getElementById("hud-system"),
  layout: document.getElementById("hud-layout"),
  queue: document.getElementById("hud-queue"),
  controls: document.getElementById("hud-controls"),
};

const EARTH_RADIUS_M = 6378137;
const CAMERA_CYCLE = {
  ground: ["chase", "operator", "orbit", "profile", "threat", "topdown"],
  fires: ["topdown", "operator", "orbit", "profile", "threat"],
  defense: ["radar", "orbit", "profile", "threat", "topdown"],
  maritime: ["bridge", "operator", "orbit", "profile", "threat", "topdown"],
  base: ["command", "chase", "orbit", "profile", "threat", "topdown"],
};
const routeCache = new Map();
const inflightRouteRequests = new Map();

function getKoreaRectangle() {
  if (typeof CesiumRef?.Rectangle?.fromDegrees !== "function") {
    return undefined;
  }

  return CesiumRef.Rectangle.fromDegrees(122.71, 31.65, 134.28, 43.39);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function normalizeHeading(heading) {
  return ((heading % 360) + 360) % 360;
}

function headingBetween(a, b) {
  return normalizeHeading((Math.atan2(b.x - a.x, b.y - a.y) * 180) / Math.PI);
}

function distance2D(a, b) {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

function distance3D(a, b) {
  return Math.hypot(b.x - a.x, b.y - a.y, (b.z ?? 0) - (a.z ?? 0));
}

function hasFiniteLocalPoint(point) {
  return (
    point &&
    Number.isFinite(point.x) &&
    Number.isFinite(point.y) &&
    (!("z" in point) || Number.isFinite(point.z ?? 0))
  );
}

function directionFromHeading(headingDeg) {
  const radians = (headingDeg * Math.PI) / 180;
  return { x: Math.sin(radians), y: Math.cos(radians) };
}

function defaultOrbitPitch(profile) {
  if (profile === "maritime") return -10;
  if (profile === "base") return -12;
  return -14;
}

function defaultOrbitRange(profile, modelRuntime) {
  return Math.max(
    modelRuntime.operatorDistance * 1.18,
    profile === "maritime"
      ? 96
      : profile === "base"
        ? 72
        : profile === "defense"
          ? 58
          : 44
  );
}

function createOrbitCamera(profile, modelRuntime, headingDeg = 0) {
  const range = defaultOrbitRange(profile, modelRuntime);

  return {
    headingDeg: normalizeHeading(headingDeg + 138),
    pitchDeg: defaultOrbitPitch(profile),
    range,
    minRange: Math.max(24, range * 0.55),
    maxRange: Math.max(range * 2.1, range + 48),
    dragging: false,
    pointerId: null,
    lastX: 0,
    lastY: 0,
    dragDistance: 0,
    suppressSelectionUntil: 0,
  };
}

function localPointToLonLat(origin, point) {
  const latRadians = (origin.lat * Math.PI) / 180;
  return {
    lon:
      origin.lon +
      (point.x / (EARTH_RADIUS_M * Math.cos(latRadians))) * (180 / Math.PI),
    lat: origin.lat + (point.y / EARTH_RADIUS_M) * (180 / Math.PI),
  };
}

function lonLatToLocalPoint(origin, coordinates) {
  const latRadians = (origin.lat * Math.PI) / 180;
  return {
    x:
      (((coordinates.lon - origin.lon) * Math.PI) / 180) *
      EARTH_RADIUS_M *
      Math.cos(latRadians),
    y: (((coordinates.lat - origin.lat) * Math.PI) / 180) * EARTH_RADIUS_M,
  };
}

function colorFromCss(color, alpha = 1) {
  return CesiumRef.Color.fromCssColorString(color).withAlpha(alpha);
}

function cartesianFromLocal(origin, point) {
  const lonLat = localPointToLonLat(origin, point);
  return CesiumRef.Cartesian3.fromDegrees(lonLat.lon, lonLat.lat, point.z ?? 0);
}

function midpoint(a, b, ratio = 0.5) {
  return {
    x: a.x + (b.x - a.x) * ratio,
    y: a.y + (b.y - a.y) * ratio,
    z: (a.z ?? 0) + ((b.z ?? 0) - (a.z ?? 0)) * ratio,
  };
}

function formatDistanceLabel(value) {
  return value >= 1000
    ? `${(value / 1000).toFixed(1)}km`
    : `${Math.round(value)}m`;
}

function hasKoreanOrigin() {
  const lon = payload?.scenario?.origin?.lon;
  const lat = payload?.scenario?.origin?.lat;
  return (
    Number.isFinite(lon) &&
    Number.isFinite(lat) &&
    lon >= 124 &&
    lon <= 132.5 &&
    lat >= 33 &&
    lat <= 39.5
  );
}

function createVworldImageryProvider(layerName, extension) {
  const vworldApiKey = (runtimeConfig.vworldApiKey ?? "").trim();
  if (!vworldApiKey) {
    return null;
  }

  const providerOptions = {
    url: `https://api.vworld.kr/req/wmts/1.0.0/${vworldApiKey}/${layerName}/{z}/{y}/{x}.${extension}`,
    credit: "VWorld",
    minimumLevel: 6,
    maximumLevel: 19,
  };
  const koreaRectangle = getKoreaRectangle();
  if (koreaRectangle) {
    providerOptions.rectangle = koreaRectangle;
  }

  return new CesiumRef.UrlTemplateImageryProvider(providerOptions);
}

function createBaseLayer() {
  const mapTilerApiKey = (runtimeConfig.mapTilerApiKey ?? "").trim();
  if (mapTilerApiKey.length > 0) {
    return new CesiumRef.ImageryLayer(
      new CesiumRef.UrlTemplateImageryProvider({
        url: `https://api.maptiler.com/maps/satellite/{z}/{x}/{y}@2x.jpg?key=${mapTilerApiKey}`,
        credit: "MapTiler",
        tileWidth: 512,
        tileHeight: 512,
        hasAlphaChannel: false,
      })
    );
  }

  return new CesiumRef.ImageryLayer(
    new CesiumRef.OpenStreetMapImageryProvider({
      url: "https://tile.openstreetmap.org/",
      credit: "OpenStreetMap",
    })
  );
}

function resolveMapProviderLabel() {
  const baseProvider = (runtimeConfig.mapTilerApiKey ?? "").trim()
    ? "Cesium + MapTiler"
    : "Cesium + OSM";

  if (hasKoreanOrigin() && (runtimeConfig.vworldApiKey ?? "").trim()) {
    return `${baseProvider} + VWorld`;
  }

  return baseProvider;
}

function createEllipsoidTerrainProvider() {
  return new CesiumRef.EllipsoidTerrainProvider();
}

function resolveIonAccessToken() {
  const configuredToken =
    runtimeConfig.cesiumIonAccessToken ?? runtimeConfig.ionAccessToken ?? "";

  return typeof configuredToken === "string" ? configuredToken.trim() : "";
}

function createTerrainConfig() {
  const ionAccessToken = resolveIonAccessToken();
  const worldTerrainEnabled =
    runtimeConfig.enableCesiumWorldTerrain === true &&
    ionAccessToken.length > 0 &&
    typeof CesiumRef.Terrain?.fromWorldTerrain === "function";

  if (worldTerrainEnabled) {
    if (CesiumRef.Ion) {
      CesiumRef.Ion.defaultAccessToken = ionAccessToken;
    }

    return {
      terrain: CesiumRef.Terrain.fromWorldTerrain(),
    };
  }

  return {
    terrainProvider: createEllipsoidTerrainProvider(),
  };
}

function attachTerrainFallback(viewer, terrain) {
  if (!viewer || !terrain?.errorEvent) {
    return;
  }

  let didFallback = false;
  const fallback = (error) => {
    if (didFallback) {
      return;
    }

    didFallback = true;
    console.warn(
      "Tactical sim terrain provider failed. Falling back to ellipsoid terrain.",
      error
    );
    viewer.terrainProvider = createEllipsoidTerrainProvider();
    viewer.scene?.requestRender?.();
  };

  terrain.errorEvent.addEventListener((error) => {
    fallback(error);
  });
  terrain.readyEvent?.addEventListener((readyTerrain) => {
    readyTerrain?.errorEvent?.addEventListener((error) => {
      fallback(error);
    });
  });
}

function addKoreanOverlayLayers(viewer) {
  if (!viewer?.scene?.imageryLayers || !hasKoreanOrigin()) {
    return;
  }

  const hybridLayer = createVworldImageryProvider("Hybrid", "png");
  if (!hybridLayer) {
    return;
  }

  try {
    viewer.scene.imageryLayers.addImageryProvider(hybridLayer);
  } catch (error) {
    console.warn("Failed to add the tactical VWorld hybrid layer.", error);
  }
}

function applyViewerTuning(viewer) {
  if (!viewer?.scene) {
    return;
  }

  viewer.scene.requestRenderMode = false;
  viewer.scene.maximumRenderTimeChange = 0;
  viewer.scene.globe.maximumScreenSpaceError = 2;
  viewer.scene.globe.tileCacheSize = 2048;
  viewer.scene.globe.preloadAncestors = true;
  viewer.scene.globe.preloadSiblings = true;
  viewer.scene.globe.loadingDescendantLimit = 20;
  viewer.scene.globe.skipLevelOfDetail = true;
  viewer.scene.globe.baseScreenSpaceError = 1024;
  viewer.scene.globe.skipScreenSpaceErrorFactor = 16;
  viewer.scene.globe.skipLevels = 1;
  viewer.scene.globe.depthTestAgainstTerrain = true;
  viewer.scene.globe.enableLighting = true;
  viewer.scene.fog.enabled = true;
  viewer.scene.fog.density = 0.0001;
  viewer.scene.highDynamicRange = false;
  viewer.scene.postProcessStages?.fxaa &&
    (viewer.scene.postProcessStages.fxaa.enabled = true);
  viewer.resolutionScale = 0.75;

  const atmosphere = viewer.scene.skyAtmosphere ?? viewer.scene.atmosphere;
  if (atmosphere && "show" in atmosphere) {
    atmosphere.show = true;
  }

  if (viewer.cesiumWidget?._creditContainer) {
    viewer.cesiumWidget._creditContainer.style.display = "none";
  }
}

function createViewer() {
  const terrainConfig = createTerrainConfig();
  const viewer = new CesiumRef.Viewer("viewer", {
    baseLayer: createBaseLayer(),
    ...terrainConfig,
    timeline: false,
    animation: false,
    homeButton: false,
    geocoder: false,
    sceneModePicker: false,
    baseLayerPicker: false,
    navigationHelpButton: false,
    fullscreenButton: false,
    infoBox: false,
    selectionIndicator: false,
    shouldAnimate: true,
    contextOptions: {
      webgl: {
        preserveDrawingBuffer: true,
      },
    },
  });

  if (terrainConfig.terrain) {
    attachTerrainFallback(viewer, terrainConfig.terrain);
  }
  applyViewerTuning(viewer);
  addKoreanOverlayLayers(viewer);

  const controller = viewer.scene.screenSpaceCameraController;
  controller.enableRotate = false;
  controller.enableZoom = false;
  controller.enableTranslate = false;
  controller.enableTilt = false;
  controller.enableLook = false;

  return viewer;
}

function defaultModelRuntime() {
  const byProfile = {
    ground: {
      spawnMode: "road",
      maxSpeedMps: 15,
      reverseSpeedMps: 4,
      turnRateDeg: 46,
      chaseDistance: 34,
      operatorDistance: 18,
      topDownHeight: 540,
      projectileDistance: 42,
      impactDistance: 96,
      impactHeight: 48,
    },
    fires: {
      spawnMode: "battery",
      maxSpeedMps: 9,
      reverseSpeedMps: 2,
      turnRateDeg: 28,
      chaseDistance: 38,
      operatorDistance: 24,
      topDownHeight: 820,
      projectileDistance: 30,
      impactDistance: 124,
      impactHeight: 72,
    },
    defense: {
      spawnMode: "defense-pad",
      maxSpeedMps: 6,
      reverseSpeedMps: 2,
      turnRateDeg: 24,
      chaseDistance: 36,
      operatorDistance: 26,
      topDownHeight: 1100,
      projectileDistance: 34,
      impactDistance: 130,
      impactHeight: 76,
    },
    maritime: {
      spawnMode: "sea-lane",
      maxSpeedMps: 16,
      reverseSpeedMps: 4,
      turnRateDeg: 18,
      chaseDistance: 110,
      operatorDistance: 62,
      topDownHeight: 1450,
      projectileDistance: 46,
      impactDistance: 150,
      impactHeight: 82,
    },
    base: {
      spawnMode: "helipad",
      maxSpeedMps: 54,
      reverseSpeedMps: 0,
      turnRateDeg: 20,
      chaseDistance: 70,
      operatorDistance: 40,
      topDownHeight: 900,
      projectileDistance: 36,
      impactDistance: 116,
      impactHeight: 64,
    },
  };
  return {
    modelPath: payload?.model?.path ?? "",
    label: payload?.model?.label ?? payload?.asset?.name ?? "Platform",
    ...byProfile[payload?.profile ?? "ground"],
    ...(payload?.modelRuntime ?? {}),
  };
}

function offsetPointByHeading(point, headingDeg, forwardM = 0, lateralM = 0) {
  const forward = directionFromHeading(headingDeg);
  const lateral = directionFromHeading(normalizeHeading(headingDeg + 90));
  return {
    x: point.x + forward.x * forwardM + lateral.x * lateralM,
    y: point.y + forward.y * forwardM + lateral.y * lateralM,
    z: point.z ?? 0,
  };
}

function laneProfileForSpawnMode(spawnMode) {
  return (
    {
      road: { curveM: 92, snapRadiusM: 108, approachM: 92 },
      battery: { curveM: 128, snapRadiusM: 144, approachM: 126 },
      "defense-pad": { curveM: 156, snapRadiusM: 176, approachM: 138 },
      "sea-lane": { curveM: 260, snapRadiusM: 280, approachM: 240 },
      runway: { curveM: 74, snapRadiusM: 96, approachM: 96 },
      helipad: { curveM: 112, snapRadiusM: 136, approachM: 96 },
      "drone-pad": { curveM: 94, snapRadiusM: 112, approachM: 82 },
    }[spawnMode] ?? { curveM: 120, snapRadiusM: 132, approachM: 112 }
  );
}

function resolveMovementAnchor(profile, playerHome, scenario, sites) {
  const objectiveSite = sites.find(
    (site) => site.kind === "objective"
  )?.position;
  const supportSite = sites.find((site) => site.kind === "support")?.position;
  const runwaySite = sites.find((site) => site.kind === "runway")?.position;
  const firstHostile = scenario.config.hostileContacts[0]?.position ?? null;

  if (profile === "base") {
    return supportSite ?? runwaySite ?? playerHome;
  }

  if (profile === "defense") {
    const hostileHeading = firstHostile
      ? headingBetween(playerHome, firstHostile)
      : 38;
    return offsetPointByHeading(playerHome, hostileHeading, 320, 110);
  }

  return (
    objectiveSite ??
    firstHostile ??
    supportSite ??
    runwaySite ??
    offsetPointByHeading(playerHome, 35, 620, 0)
  );
}

function buildMovementLane(home, anchor, spawnMode) {
  if (!anchor) return [];

  const profile = laneProfileForSpawnMode(spawnMode);
  const headingDeg = headingBetween(home, anchor);
  const legOne = midpoint(home, anchor, 0.28);
  const legTwo = midpoint(home, anchor, 0.58);
  const legThree = midpoint(home, anchor, 0.82);

  return [
    { ...home },
    offsetPointByHeading(legOne, headingDeg, 0, profile.curveM),
    offsetPointByHeading(legTwo, headingDeg, 0, profile.curveM * 0.45),
    offsetPointByHeading(legThree, headingDeg, 0, -profile.curveM * 0.18),
    offsetPointByHeading(
      anchor,
      normalizeHeading(headingDeg + 180),
      profile.approachM,
      -profile.curveM * 0.08
    ),
    { x: anchor.x, y: anchor.y, z: anchor.z ?? 0 },
  ];
}

function strategicCameraModeForProfile(profile) {
  return (
    {
      ground: "topdown",
      fires: "topdown",
      defense: "radar",
      maritime: "topdown",
      base: "command",
    }[profile] ?? "topdown"
  );
}

function isStrategicCameraMode(mode) {
  return mode === "topdown" || mode === "radar" || mode === "command";
}

function buildBattlespaceFrame(playerHome, movementAnchor, scenario, sites) {
  const points = [
    { ...playerHome, z: 0 },
    ...(movementAnchor ? [{ ...movementAnchor, z: 0 }] : []),
    ...sites.map((site) => ({ ...site.position, z: 0 })),
    ...scenario.config.hostileContacts.flatMap((hostile) => [
      { ...hostile.position, z: 0 },
      ...hostile.waypoints.map((waypoint) => ({ ...waypoint, z: 0 })),
    ]),
  ];

  if (points.length === 0) {
    return {
      center: { x: 0, y: 0, z: 0 },
      spanM: 1200,
      radiusM: 720,
      headingDeg: 26,
    };
  }

  let minX = points[0].x;
  let maxX = points[0].x;
  let minY = points[0].y;
  let maxY = points[0].y;

  points.forEach((point) => {
    minX = Math.min(minX, point.x);
    maxX = Math.max(maxX, point.x);
    minY = Math.min(minY, point.y);
    maxY = Math.max(maxY, point.y);
  });

  const center = {
    x: (minX + maxX) / 2,
    y: (minY + maxY) / 2,
    z: 0,
  };
  const spanM = Math.max(680, maxX - minX, maxY - minY);

  return {
    center,
    spanM,
    radiusM: Math.max(540, spanM * 0.72),
    headingDeg: normalizeHeading(headingBetween(center, playerHome) + 180),
  };
}

function commandZoomBounds(state) {
  const baseline = Math.max(
    state.battlespaceFrame.radiusM * 1.24,
    state.modelRuntime.topDownHeight + 320
  );

  return {
    min: -baseline * 0.62,
    max: baseline * 0.9,
  };
}

function ensureStrategicCamera(state) {
  if (state.cinematic || state.overviewActive) {
    return;
  }

  if (!isStrategicCameraMode(state.cameraMode)) {
    state.cameraMode = strategicCameraModeForProfile(state.profile);
    state.cameraCycleIndex = Math.max(
      0,
      CAMERA_CYCLE[state.profile].indexOf(state.cameraMode)
    );
  }
}

function setOverviewActive(state, active, options = {}) {
  if (state.cinematic) {
    return;
  }

  state.overviewActive = active;

  if (active) {
    state.commandZoomBias = 0;
    state.commandHeadingBias = state.battlespaceFrame.headingDeg;
  } else {
    const nextMode =
      options.mode ??
      state.mission.missionPhases[state.phaseIndex]?.cameraCue ??
      state.mission.defaultCameraMode;
    state.cameraMode = nextMode;
    state.cameraCycleIndex = Math.max(
      0,
      CAMERA_CYCLE[state.profile].indexOf(nextMode)
    );
    if (options.resetBias !== false) {
      state.commandZoomBias = 0;
      if (!isStrategicCameraMode(nextMode)) {
        state.commandHeadingBias = 0;
      }
    }
  }

  if (options.announceText) {
    announce(state, options.announceText, options.durationMs ?? 1600);
  }
}

function enterMissionView(state, options = {}) {
  setOverviewActive(state, false, options);
}

function resetOrbitCamera(state, headingDeg = state.player.headingDeg) {
  state.orbitCamera = createOrbitCamera(
    state.profile,
    state.modelRuntime,
    headingDeg
  );
}

function isOrbitCameraMode(state) {
  return (
    !state.cinematic && !state.overviewActive && state.cameraMode === "orbit"
  );
}

function setCameraPreset(state, mode, announceText) {
  if (state.cinematic) {
    return;
  }

  state.overviewActive = false;
  state.cameraMode = mode;
  state.cameraCycleIndex = Math.max(
    0,
    CAMERA_CYCLE[state.profile].indexOf(mode)
  );
  if (mode === "orbit") {
    resetOrbitCamera(state);
  }
  if (announceText) {
    announce(state, announceText, 1500);
  }
}

function adjustMapZoom(state, deltaM, options = {}) {
  if (state.cinematic) {
    return;
  }

  if (!state.overviewActive) {
    ensureStrategicCamera(state);
  }

  const bounds = commandZoomBounds(state);
  state.commandZoomBias = clamp(
    state.commandZoomBias + deltaM,
    bounds.min,
    bounds.max
  );

  if (options.announceText) {
    announce(state, options.announceText, options.durationMs ?? 1200);
  }
}

function rotateStrategicView(state, deltaDeg, options = {}) {
  if (state.cinematic) {
    return;
  }

  if (!state.overviewActive) {
    ensureStrategicCamera(state);
  }

  state.commandHeadingBias = normalizeHeading(
    state.commandHeadingBias + deltaDeg
  );

  if (options.announceText) {
    announce(state, options.announceText, options.durationMs ?? 1200);
  }
}

function handleTacticalCommand(state, command) {
  switch (command) {
    case "cycle-camera":
      cycleCamera(state);
      return;
    case "overview":
      setOverviewActive(state, true, {
        announceText: "3D 전장 개요",
      });
      return;
    case "mission-view": {
      const phase = state.mission.missionPhases[state.phaseIndex];
      enterMissionView(state, {
        mode: phase?.cameraCue ?? state.mission.defaultCameraMode,
        announceText: phase ? `${phase.title} 시점` : "임무 시점",
      });
      return;
    }
    case "next-target":
      if (state.overviewActive) {
        enterMissionView(state, {
          mode: state.mission.defaultCameraMode,
          announceText: "임무 시점",
        });
      }
      selectNextTarget(state);
      return;
    case "auto-target":
      clearTargetSelection(state);
      return;
    case "fire-primary":
      if (state.overviewActive) {
        enterMissionView(state, {
          mode: state.mission.defaultCameraMode,
          announceText: "임무 시점",
        });
      }
      triggerPrimaryAction(state);
      return;
    case "fire-support":
      if (state.overviewActive) {
        enterMissionView(state, {
          mode: state.mission.defaultCameraMode,
          announceText: "임무 시점",
        });
      }
      triggerSupportAction(state);
      return;
    case "zoom-in":
      adjustMapZoom(state, -220);
      return;
    case "zoom-out":
      adjustMapZoom(state, 220);
      return;
    case "showcase-view":
      setCameraPreset(state, "orbit", "360 모델 보기");
      return;
    case "chase-view":
      if (state.overviewActive) {
        enterMissionView(state, {
          mode: "chase",
          announceText: "추적 시점",
        });
        return;
      }
      setCameraPreset(state, "chase", "추적 시점");
      return;
    case "profile-view":
      setCameraPreset(state, "profile", "측면 실루엣");
      return;
    case "threat-view":
      if (!selectedTarget(state)) {
        selectNextTarget(state);
      }
      setCameraPreset(state, "threat", "표적 추적");
      return;
    case "rotate-left":
      rotateStrategicView(state, -18);
      return;
    case "rotate-right":
      rotateStrategicView(state, 18);
      return;
    case "reset-view":
      if (state.overviewActive) {
        setOverviewActive(state, true, {
          announceText: "전장 개요 기준 복구",
        });
        return;
      }
      if (state.cameraMode === "orbit") {
        resetOrbitCamera(state);
        announce(state, "360 모델 기준 복구", 1400);
        return;
      }
      state.commandZoomBias = 0;
      state.commandHeadingBias = 0;
      state.cameraMode = state.mission.defaultCameraMode;
      state.cameraCycleIndex = Math.max(
        0,
        CAMERA_CYCLE[state.profile].indexOf(state.cameraMode)
      );
      announce(state, "기본 시점 복구", 1400);
      return;
  }
}

function supportsLiveRoadRouting(profile, spawnMode) {
  return (
    (profile === "ground" || profile === "fires" || profile === "defense") &&
    (spawnMode === "road" ||
      spawnMode === "battery" ||
      spawnMode === "defense-pad")
  );
}

function dedupeLanePoints(points) {
  const lane = [];
  points.forEach((point) => {
    const previous = lane[lane.length - 1];
    if (!previous || distance2D(previous, point) > 6) {
      lane.push({
        x: point.x,
        y: point.y,
        z: point.z ?? 0,
      });
    }
  });
  return lane;
}

function compactLanePoints(points, maxPoints = 64) {
  if (points.length <= maxPoints) {
    return points;
  }

  const compacted = [points[0]];
  const stride = (points.length - 1) / (maxPoints - 1);
  for (let index = 1; index < maxPoints - 1; index += 1) {
    compacted.push(points[Math.round(index * stride)]);
  }
  compacted.push(points[points.length - 1]);
  return dedupeLanePoints(compacted);
}

function routeModeLabel(mode) {
  return (
    {
      fallback: "합성 경로",
      routing: "경로 조회",
      "live-road": "실도로 경로",
      "partial-live": "혼합 경로",
      "route-fallback": "대체 경로",
    }[mode] ?? "경로"
  );
}

function normalizeProviderConfig(provider, index) {
  if (!provider) return null;
  if (typeof provider === "string") {
    return {
      id: `route-provider-${index + 1}`,
      baseUrl: provider,
    };
  }
  if (typeof provider.baseUrl === "string" && provider.baseUrl.length > 0) {
    return {
      id: provider.id ?? `route-provider-${index + 1}`,
      baseUrl: provider.baseUrl,
    };
  }
  return null;
}

function routeProviders() {
  const configuredProviders = Array.isArray(runtimeConfig.routeProviders)
    ? runtimeConfig.routeProviders
    : [];
  const fallbackProviders = [
    "https://router.project-osrm.org/route/v1/driving/",
    "https://routing.openstreetmap.de/routed-car/route/v1/driving/",
  ];

  return [...configuredProviders, ...fallbackProviders]
    .map((provider, index) => normalizeProviderConfig(provider, index))
    .filter((provider, index, providers) => {
      if (!provider) return false;
      return (
        providers.findIndex(
          (candidate) => candidate?.baseUrl === provider.baseUrl
        ) === index
      );
    });
}

function routeRequestTimeoutMs() {
  return clamp(runtimeConfig.routeRequestTimeoutMs ?? 3200, 1200, 8000);
}

function localRouteCacheKey(origin, startPoint, endPoint) {
  const start = localPointToLonLat(origin, startPoint);
  const end = localPointToLonLat(origin, endPoint);
  return [
    start.lon.toFixed(5),
    start.lat.toFixed(5),
    end.lon.toFixed(5),
    end.lat.toFixed(5),
  ].join(":");
}

function normalizeRouteCoordinates(origin, coordinates, startPoint, endPoint) {
  const localPoints = coordinates.map(([lon, lat]) => ({
    ...lonLatToLocalPoint(origin, { lon, lat }),
    z: 0,
  }));
  return compactLanePoints(
    dedupeLanePoints([
      { ...startPoint, z: 0 },
      ...localPoints,
      { ...endPoint, z: 0 },
    ])
  );
}

function updateMovementLaneEntity(state) {
  if (!state.movementLaneEntity) {
    return;
  }

  state.movementLaneEntity.show = state.movementLane.length > 1;
  state.movementLaneEntity.polyline.positions = state.movementLane.map(
    (point) => cartesianFromLocal(state.origin, point)
  );
}

async function fetchRouteGeometry(origin, startPoint, endPoint) {
  const cacheKey = localRouteCacheKey(origin, startPoint, endPoint);
  if (routeCache.has(cacheKey)) {
    return routeCache.get(cacheKey);
  }

  const inflight = inflightRouteRequests.get(cacheKey);
  if (inflight) {
    return inflight;
  }

  const request = (async () => {
    const start = localPointToLonLat(origin, startPoint);
    const end = localPointToLonLat(origin, endPoint);

    for (const provider of routeProviders()) {
      const controller =
        typeof AbortController === "function" ? new AbortController() : null;
      const timeoutId =
        controller !== null
          ? window.setTimeout(() => controller.abort(), routeRequestTimeoutMs())
          : null;
      const routeUrl =
        `${provider.baseUrl}${start.lon},${start.lat};${end.lon},${end.lat}` +
        "?overview=full&geometries=geojson&steps=false";

      try {
        const response = await fetch(routeUrl, {
          cache: "no-store",
          mode: "cors",
          signal: controller?.signal,
        });
        if (!response.ok) {
          throw new Error(`route-http-${response.status}`);
        }

        const routePayload = await response.json();
        const coordinates = routePayload?.routes?.[0]?.geometry?.coordinates;
        if (!Array.isArray(coordinates) || coordinates.length < 2) {
          throw new Error("route-empty");
        }

        const result = {
          providerId: provider.id,
          distanceM: Math.round(routePayload?.routes?.[0]?.distance ?? 0),
          coordinates,
        };
        routeCache.set(cacheKey, result);
        return result;
      } catch (_error) {
        // Try the next provider.
      } finally {
        if (timeoutId !== null) {
          window.clearTimeout(timeoutId);
        }
      }
    }

    throw new Error("route-unavailable");
  })();

  inflightRouteRequests.set(cacheKey, request);
  try {
    return await request;
  } finally {
    inflightRouteRequests.delete(cacheKey);
  }
}

async function fetchLiveRoadLane(state) {
  if (
    !supportsLiveRoadRouting(state.profile, state.modelRuntime.spawnMode) ||
    typeof fetch !== "function" ||
    !state.movementAnchor
  ) {
    state.movementRouteMode = "fallback";
    state.movementRoutePending = false;
    return false;
  }

  try {
    const routePayload = await fetchRouteGeometry(
      state.origin,
      state.player.homePosition,
      state.movementAnchor
    );
    state.movementLane = normalizeRouteCoordinates(
      state.origin,
      routePayload.coordinates,
      state.player.homePosition,
      state.movementAnchor
    );
    state.movementLaneRadiusM = clamp(
      state.movementLaneRadiusM * 0.58,
      54,
      state.movementLaneRadiusM
    );
    state.movementRouteMode = "live-road";
    state.movementRoutePending = false;
    state.movementRouteDistanceM = routePayload.distanceM;
    state.movementRouteSource = routePayload.providerId;
    updateMovementLaneEntity(state);
    const snapped = snapPointToLane(
      state.player.position,
      state.movementLane,
      state.movementLaneRadiusM,
      1
    );
    state.player.position = snapped.point;
    announce(state, "실도로 이동 경로 동기화 완료", 1800);
    return true;
  } catch (_error) {
    state.movementRouteMode = "route-fallback";
    state.movementRoutePending = false;
    announce(
      state,
      "실도로 경로를 찾지 못해 전술 lane으로 계속 진행합니다.",
      1800
    );
    return false;
  }
}

function supportsHostileRoadRouting(hostile) {
  return (
    hostile.domain === "ground" &&
    hostile.speedMps > 0 &&
    hostile.waypoints.length > 1
  );
}

function updateHostileRouteStats(state) {
  const routedHostiles = state.hostiles.filter((hostile) =>
    supportsHostileRoadRouting(hostile)
  );
  state.hostileRouting = {
    total: routedHostiles.length,
    pending: routedHostiles.filter((hostile) => hostile.routePending).length,
    live: routedHostiles.filter((hostile) => hostile.routeMode === "live-road")
      .length,
    partial: routedHostiles.filter(
      (hostile) => hostile.routeMode === "partial-live"
    ).length,
    fallback: routedHostiles.filter(
      (hostile) =>
        hostile.routeMode === "route-fallback" ||
        hostile.routeMode === "fallback"
    ).length,
  };
}

function buildHostileRouteLegs(hostile) {
  const points = hostile.waypoints.map((waypoint) => ({ ...waypoint, z: 0 }));
  if (points.length < 2) return [];

  const legs = [];
  for (let index = 0; index < points.length - 1; index += 1) {
    legs.push([points[index], points[index + 1]]);
  }
  legs.push([points[points.length - 1], points[0]]);
  return legs;
}

async function hydrateHostileRoadRoute(state, hostile) {
  if (!supportsHostileRoadRouting(hostile)) {
    hostile.routePending = false;
    hostile.routeMode = "fallback";
    return false;
  }

  const legs = buildHostileRouteLegs(hostile);
  const mergedRoute = [];
  let liveSegments = 0;
  let routeDistanceM = 0;

  for (const [startPoint, endPoint] of legs) {
    try {
      const routePayload = await fetchRouteGeometry(
        state.origin,
        startPoint,
        endPoint
      );
      const legRoute = normalizeRouteCoordinates(
        state.origin,
        routePayload.coordinates,
        startPoint,
        endPoint
      );
      mergedRoute.push(
        ...(mergedRoute.length > 0 ? legRoute.slice(1) : legRoute)
      );
      routeDistanceM += routePayload.distanceM;
      liveSegments += 1;
    } catch (_error) {
      mergedRoute.push(
        ...(mergedRoute.length > 0 ? [endPoint] : [startPoint, endPoint])
      );
    }
  }

  hostile.routePending = false;
  hostile.routeDistanceM = routeDistanceM;
  hostile.routeMode =
    liveSegments === legs.length
      ? "live-road"
      : liveSegments > 0
        ? "partial-live"
        : "route-fallback";

  const routedWaypoints = compactLanePoints(dedupeLanePoints(mergedRoute));
  if (routedWaypoints.length >= 2) {
    hostile.waypoints = routedWaypoints;
    hostile.position = { ...routedWaypoints[0] };
    hostile.waypointIndex = 1;
    hostile.headingDeg = headingBetween(routedWaypoints[0], routedWaypoints[1]);
  }
  return liveSegments > 0;
}

async function hydrateHostileRoutes(state) {
  const routedHostiles = state.hostiles.filter((hostile) =>
    supportsHostileRoadRouting(hostile)
  );
  if (routedHostiles.length === 0) {
    updateHostileRouteStats(state);
    return;
  }

  updateHostileRouteStats(state);
  const results = await Promise.allSettled(
    routedHostiles.map((hostile) => hydrateHostileRoadRoute(state, hostile))
  );
  updateHostileRouteStats(state);

  const liveCount = results.filter(
    (result) => result.status === "fulfilled" && result.value
  ).length;

  if (liveCount > 0) {
    announce(
      state,
      `적 지상 유닛 ${liveCount}개가 실도로 경로에 동기화되었습니다.`,
      1800
    );
  }
}

async function bootstrapRoutes(state) {
  await Promise.allSettled([
    fetchLiveRoadLane(state),
    hydrateHostileRoutes(state),
  ]);
  updateHud(state);
}

function shortestHeadingDelta(currentHeading, desiredHeading) {
  let delta = desiredHeading - currentHeading;
  if (delta > 180) delta -= 360;
  if (delta < -180) delta += 360;
  return delta;
}

function nearestPointOnSegment(point, start, end) {
  const deltaX = end.x - start.x;
  const deltaY = end.y - start.y;
  const lengthSquared = deltaX * deltaX + deltaY * deltaY;
  if (lengthSquared <= 1) {
    return {
      point: { x: start.x, y: start.y, z: start.z ?? 0 },
      distance: distance2D(point, start),
      headingDeg: headingBetween(start, end),
    };
  }

  const factor = clamp(
    ((point.x - start.x) * deltaX + (point.y - start.y) * deltaY) /
      lengthSquared,
    0,
    1
  );
  const projectedPoint = {
    x: start.x + deltaX * factor,
    y: start.y + deltaY * factor,
    z: (start.z ?? 0) + ((end.z ?? 0) - (start.z ?? 0)) * factor,
  };

  return {
    point: projectedPoint,
    distance: distance2D(point, projectedPoint),
    headingDeg: headingBetween(start, end),
  };
}

function snapPointToLane(point, lane, snapRadiusM, blend = 1) {
  if (!lane || lane.length < 2) {
    return { point, headingDeg: null, distance: Number.POSITIVE_INFINITY };
  }

  let nearest = null;
  for (let index = 0; index < lane.length - 1; index += 1) {
    const candidate = nearestPointOnSegment(
      point,
      lane[index],
      lane[index + 1]
    );
    if (!nearest || candidate.distance < nearest.distance) {
      nearest = candidate;
    }
  }

  if (!nearest || nearest.distance > snapRadiusM) {
    return { point, headingDeg: null, distance: nearest?.distance ?? 0 };
  }

  return {
    point: {
      x: point.x + (nearest.point.x - point.x) * blend,
      y: point.y + (nearest.point.y - point.y) * blend,
      z: point.z ?? nearest.point.z ?? 0,
    },
    headingDeg: nearest.headingDeg,
    distance: nearest.distance,
  };
}

function createState(viewer) {
  const modelRuntime = defaultModelRuntime();
  const scenario = payload.scenario;
  const sites = scenario.config.sites.map((site) => ({
    ...site,
    areaEntity: null,
    labelEntity: null,
  }));
  const runway = sites.find((site) => site.kind === "runway")?.position ?? {
    x: 0,
    y: 0,
  };
  const support = sites.find((site) => site.kind === "support")?.position ?? {
    x: -40,
    y: -30,
  };
  const homeBySpawn = {
    road: { x: -140, y: -260 },
    battery: { x: -260, y: -220 },
    "defense-pad": { x: 0, y: 0 },
    "sea-lane": { x: -850, y: -160 },
    runway: { x: runway.x - 320, y: runway.y },
    helipad: { x: support.x - 50, y: support.y - 30 },
    "drone-pad": { x: support.x - 30, y: support.y + 10 },
  };
  const playerHome = hasFiniteLocalPoint(scenario.player.position)
    ? { ...scenario.player.position }
    : (homeBySpawn[modelRuntime.spawnMode] ?? { x: 0, y: 0 });
  const movementAnchor = resolveMovementAnchor(
    payload.profile,
    playerHome,
    scenario,
    sites
  );
  const movementLane = buildMovementLane(
    playerHome,
    movementAnchor,
    modelRuntime.spawnMode
  );
  const movementLaneProfile = laneProfileForSpawnMode(modelRuntime.spawnMode);
  const battlespaceFrame = buildBattlespaceFrame(
    playerHome,
    movementAnchor,
    scenario,
    sites
  );

  return {
    viewer,
    payload,
    profile: payload.profile,
    origin: scenario.origin,
    theme: payload.theme,
    mission: payload.mission,
    modelRuntime,
    scenario,
    sites,
    keys: new Set(),
    statusText: payload.mission.briefingSummary,
    toast: null,
    elapsedSeconds: 0,
    phaseIndex: 0,
    phaseTimer: 0,
    kills: 0,
    externalFocusFire: null,
    cameraMode: payload.mission.defaultCameraMode,
    cameraCycleIndex: Math.max(
      0,
      CAMERA_CYCLE[payload.profile].indexOf(payload.mission.defaultCameraMode)
    ),
    cinematic: null,
    overviewActive: true,
    battlespaceFrame,
    commandZoomBias: 0,
    commandHeadingBias: battlespaceFrame.headingDeg,
    orbitCamera: createOrbitCamera(
      payload.profile,
      modelRuntime,
      scenario.player.headingDeg ?? 0
    ),
    selectedTargetId: null,
    player: {
      position: { ...playerHome },
      homePosition: { ...playerHome },
      headingDeg: normalizeHeading(scenario.player.headingDeg ?? 0),
      speedMps: 0,
      ammoPrimary: scenario.player.ammoPrimary,
      ammoSupport: scenario.player.ammoSupport,
      primaryCooldown: 0,
      supportCooldown: 0,
      entity: null,
    },
    base: {
      originPoint: { x: 0, y: 0 },
      dispatched: false,
      returning: false,
      pendingStrike: false,
      targetId: null,
    },
    hostiles: scenario.config.hostileContacts.map((hostile, index) =>
      buildRuntimeHostile(hostile, index, payload.profile)
    ),
    projectiles: [],
    explosions: [],
    sensorEntity: null,
    targetLineEntity: null,
    targetRingEntity: null,
    movementAnchor,
    movementLane,
    movementLaneRadiusM: movementLaneProfile.snapRadiusM,
    movementRouteMode: supportsLiveRoadRouting(
      payload.profile,
      modelRuntime.spawnMode
    )
      ? "routing"
      : "fallback",
    movementRoutePending: supportsLiveRoadRouting(
      payload.profile,
      modelRuntime.spawnMode
    ),
    movementRouteDistanceM: 0,
    movementRouteSource: null,
    movementLaneEntity: null,
    hostileRouting: {
      total: 0,
      pending: 0,
      live: 0,
      partial: 0,
      fallback: 0,
    },
    lastFrameTime: 0,
    hudUpdatedAt: 0,
  };
}

function buildRuntimeHostile(hostile, index, profile) {
  return {
    ...hostile,
    position: { ...hostile.position },
    altitudeM:
      hostile.domain === "air"
        ? profile === "defense"
          ? ([1100, 520, 180][index] ?? 280)
          : profile === "base"
            ? ([240, 0, 180][index] ?? 120)
            : profile === "maritime"
              ? 260
              : 160
        : hostile.domain === "surface"
          ? 6
          : 0,
    waypointIndex: hostile.waypoints.length > 1 ? 1 : 0,
    headingDeg:
      hostile.waypoints.length > 1
        ? headingBetween(hostile.position, hostile.waypoints[1])
        : 0,
    health: hostile.health,
    routeMode:
      hostile.domain === "ground" && hostile.speedMps > 0 ? "routing" : "fallback",
    routePending: hostile.domain === "ground" && hostile.speedMps > 0,
    routeDistanceM: 0,
    destroyed: false,
    entity: null,
  };
}

function playerAltitude(state) {
  if (state.profile === "maritime") return 4;
  if (state.profile !== "base") return 0;
  const distanceFromHome = distance2D(
    state.player.position,
    state.player.homePosition
  );
  if (state.modelRuntime.spawnMode === "runway") {
    if (!state.base.dispatched && !state.base.returning) return 2;
    return clamp(12 + distanceFromHome * 0.18, 2, 320);
  }
  return state.modelRuntime.spawnMode === "drone-pad"
    ? state.base.dispatched || state.base.returning
      ? 48
      : 14
    : state.base.dispatched || state.base.returning
      ? 72
      : 18;
}

function createEntities(state) {
  const accentColor = colorFromCss(state.theme.accentColor, 0.18);
  const glowColor = colorFromCss(state.theme.glowColor, 0.74);
  state.player.entity = state.viewer.entities.add(
    state.modelRuntime.modelPath
      ? {
          position: cartesianFromLocal(state.origin, {
            ...state.player.position,
            z: 0,
          }),
          model: {
            uri: state.modelRuntime.modelPath,
            scale: state.modelRuntime.scale ?? 1.8,
            minimumPixelSize: state.modelRuntime.minimumPixelSize ?? 84,
            silhouetteColor: colorFromCss(state.theme.accentColor, 0.92),
            silhouetteSize: 0.7,
          },
          label: {
            text: state.modelRuntime.label,
            font: "700 13px Bahnschrift, sans-serif",
            fillColor: CesiumRef.Color.WHITE,
            outlineColor: colorFromCss("#04121b", 0.96),
            outlineWidth: 4,
            style: CesiumRef.LabelStyle.FILL_AND_OUTLINE,
            verticalOrigin: CesiumRef.VerticalOrigin.BOTTOM,
            pixelOffset: new CesiumRef.Cartesian2(0, -32),
            disableDepthTestDistance: Number.POSITIVE_INFINITY,
          },
        }
      : {
          position: cartesianFromLocal(state.origin, {
            ...state.player.position,
            z: 0,
          }),
          point: {
            pixelSize: 18,
            color: colorFromCss(state.theme.accentColor, 0.95),
            outlineColor: CesiumRef.Color.BLACK,
            outlineWidth: 2,
            disableDepthTestDistance: Number.POSITIVE_INFINITY,
          },
          label: {
            text: state.modelRuntime.label,
            font: "700 13px Bahnschrift, sans-serif",
            fillColor: CesiumRef.Color.WHITE,
            outlineColor: colorFromCss("#04121b", 0.96),
            outlineWidth: 4,
            style: CesiumRef.LabelStyle.FILL_AND_OUTLINE,
          },
        }
  );

  state.sensorEntity = state.viewer.entities.add({
    position: cartesianFromLocal(state.origin, { x: 0, y: 0, z: 0 }),
    ellipse: {
      semiMajorAxis: state.scenario.config.sensorRangeM,
      semiMinorAxis: state.scenario.config.sensorRangeM,
      material: accentColor,
      outline: true,
      outlineColor: glowColor,
      outlineWidth: 2,
      height: 0,
    },
  });

  state.targetLineEntity = state.viewer.entities.add({
    show: false,
    polyline: {
      positions: [],
      width: 2,
      material: new CesiumRef.PolylineGlowMaterialProperty({
        glowPower: 0.2,
        color: colorFromCss(state.theme.glowColor, 0.82),
      }),
    },
  });

  state.targetRingEntity = state.viewer.entities.add({
    show: false,
    position: cartesianFromLocal(state.origin, { x: 0, y: 0, z: 0 }),
    ellipse: {
      semiMajorAxis: 90,
      semiMinorAxis: 90,
      material: colorFromCss(state.theme.glowColor, 0.08),
      outline: true,
      outlineColor: colorFromCss(state.theme.glowColor, 0.86),
      outlineWidth: 2,
      height: 0,
    },
  });

  state.movementLaneEntity = state.viewer.entities.add({
    show: state.movementLane.length > 1,
    polyline: {
      positions: state.movementLane.map((point) =>
        cartesianFromLocal(state.origin, point)
      ),
      width: state.profile === "maritime" ? 5 : 4,
      material: new CesiumRef.PolylineGlowMaterialProperty({
        glowPower: 0.2,
        color: colorFromCss(state.theme.accentColor, 0.48),
      }),
      clampToGround: false,
    },
  });

  state.sites.forEach((site) => {
    addSiteEntities(state, site);
  });

  state.hostiles.forEach((hostile) => {
    addHostileEntity(state, hostile);
  });
}

function addSiteEntities(state, site) {
  site.areaEntity = state.viewer.entities.add({
    position: cartesianFromLocal(state.origin, { ...site.position, z: 0 }),
    ellipse: {
      semiMajorAxis: site.radiusM,
      semiMinorAxis: site.radiusM,
      material: colorFromCss(
        site.kind === "objective"
          ? state.theme.glowColor
          : state.theme.accentColor,
        site.kind === "objective" ? 0.11 : 0.08
      ),
      outline: true,
      outlineColor: colorFromCss(
        site.kind === "objective"
          ? state.theme.glowColor
          : state.theme.accentColor,
        0.72
      ),
      outlineWidth: 2,
      height: 0,
    },
  });
  site.labelEntity = state.viewer.entities.add({
    position: cartesianFromLocal(state.origin, { ...site.position, z: 4 }),
    label: {
      text: site.label,
      font: "700 12px Bahnschrift, sans-serif",
      fillColor: CesiumRef.Color.WHITE,
      outlineColor: colorFromCss("#04121b", 0.96),
      outlineWidth: 4,
      style: CesiumRef.LabelStyle.FILL_AND_OUTLINE,
      verticalOrigin: CesiumRef.VerticalOrigin.BOTTOM,
      disableDepthTestDistance: Number.POSITIVE_INFINITY,
    },
  });
}

function addHostileEntity(state, hostile) {
  hostile.entity = state.viewer.entities.add({
    position: cartesianFromLocal(state.origin, {
      ...hostile.position,
      z: hostile.altitudeM,
    }),
    point: {
      pixelSize: hostile.domain === "air" ? 16 : 14,
      color: colorFromCss("#ef476f", 0.94),
      outlineColor: colorFromCss("#23070b", 0.94),
      outlineWidth: 2,
      disableDepthTestDistance: Number.POSITIVE_INFINITY,
    },
    label: {
      text: hostile.label,
      font: "700 12px Bahnschrift, sans-serif",
      fillColor: CesiumRef.Color.WHITE,
      outlineColor: colorFromCss("#23070b", 0.96),
      outlineWidth: 4,
      style: CesiumRef.LabelStyle.FILL_AND_OUTLINE,
      verticalOrigin: CesiumRef.VerticalOrigin.BOTTOM,
      pixelOffset: new CesiumRef.Cartesian2(0, -20),
      disableDepthTestDistance: Number.POSITIVE_INFINITY,
    },
  });
}

function removeSiteEntities(state) {
  state.sites.forEach((site) => {
    site.areaEntity && state.viewer.entities.remove(site.areaEntity);
    site.labelEntity && state.viewer.entities.remove(site.labelEntity);
  });
}

function removeHostileEntities(state) {
  state.hostiles.forEach((hostile) => {
    hostile.entity && state.viewer.entities.remove(hostile.entity);
  });
}

function syncMovementLaneEntity(state) {
  if (!state.movementLaneEntity?.polyline) {
    return;
  }

  state.movementLaneEntity.show = state.movementLane.length > 1;
  state.movementLaneEntity.polyline.positions = state.movementLane.map((point) =>
    cartesianFromLocal(state.origin, point)
  );
}

function applyExternalTacticalRuntimeUpdate(state, nextPayload) {
  if (!nextPayload?.scenario?.config || !nextPayload?.mission || !nextPayload?.theme) {
    return;
  }

  state.payload = nextPayload;
  state.scenario = nextPayload.scenario;
  state.origin = nextPayload.scenario.origin;
  state.theme = nextPayload.theme;
  state.mission = nextPayload.mission;
  state.statusText = nextPayload.mission.briefingSummary;

  if (hasFiniteLocalPoint(nextPayload.scenario.player.position)) {
    state.player.position = { ...nextPayload.scenario.player.position };
    state.player.homePosition = { ...nextPayload.scenario.player.position };
  }
  state.player.headingDeg = normalizeHeading(
    nextPayload.scenario.player.headingDeg ?? state.player.headingDeg
  );
  state.player.ammoPrimary = nextPayload.scenario.player.ammoPrimary;
  state.player.ammoSupport = nextPayload.scenario.player.ammoSupport;

  removeSiteEntities(state);
  state.sites = nextPayload.scenario.config.sites.map((site) => ({
    ...site,
    areaEntity: null,
    labelEntity: null,
  }));
  state.sites.forEach((site) => addSiteEntities(state, site));

  removeHostileEntities(state);
  state.hostiles = nextPayload.scenario.config.hostileContacts.map(
    (hostile, index) =>
      buildRuntimeHostile(hostile, index, nextPayload.profile ?? state.profile)
  );
  state.hostiles.forEach((hostile) => addHostileEntity(state, hostile));

  const movementAnchor = resolveMovementAnchor(
    state.profile,
    state.player.homePosition,
    state.scenario,
    state.sites
  );
  state.movementAnchor = movementAnchor;
  state.movementLane = buildMovementLane(
    state.player.homePosition,
    movementAnchor,
    state.modelRuntime.spawnMode
  );
  state.battlespaceFrame = buildBattlespaceFrame(
    state.player.homePosition,
    movementAnchor,
    state.scenario,
    state.sites
  );
  state.commandHeadingBias = state.battlespaceFrame.headingDeg;
  syncMovementLaneEntity(state);
  updateHostileRouteStats(state);

  if (!state.hostiles.some((hostile) => hostile.id === state.selectedTargetId)) {
    state.selectedTargetId = state.hostiles[0]?.id ?? null;
  }
  window.__TACTICAL_SIM_RUNTIME__ = {
    ...(window.__TACTICAL_SIM_RUNTIME__ ?? {}),
    statusText: state.statusText,
  };
}

function announce(state, text, durationMs = 2200) {
  state.statusText = text;
  state.toast = { text, until: performance.now() + durationMs };
}

function selectedTarget(state) {
  return (
    state.hostiles.find(
      (hostile) => hostile.id === state.selectedTargetId && !hostile.destroyed
    ) ?? null
  );
}

function liveHostiles(state) {
  return state.hostiles.filter((hostile) => !hostile.destroyed);
}

function sourceAltitude(state, role) {
  if (state.profile === "base") {
    return role === "primary" ? 10 : playerAltitude(state) + 12;
  }
  if (state.profile === "maritime") return role === "support" ? 18 : 12;
  if (state.profile === "fires") return role === "support" ? 34 : 22;
  if (state.profile === "defense") return role === "support" ? 36 : 24;
  return role === "support" ? 18 : 10;
}

function nearestTarget(state, sourcePoint) {
  return (
    [...liveHostiles(state)].sort(
      (left, right) =>
        distance2D(sourcePoint, left.position) -
        distance2D(sourcePoint, right.position)
    )[0] ?? null
  );
}

function selectionReferencePoint(state) {
  return state.profile === "base" || state.profile === "defense"
    ? state.base.originPoint
    : state.player.position;
}

function prioritizedTargets(state) {
  const reference = selectionReferencePoint(state);
  return [...liveHostiles(state)].sort(
    (left, right) =>
      distance2D(reference, left.position) -
      distance2D(reference, right.position)
  );
}

function selectNextTarget(state) {
  const threats = prioritizedTargets(state);
  if (threats.length === 0) {
    announce(state, "선택 가능한 위협이 없습니다.", 1600);
    return null;
  }

  const currentIndex = threats.findIndex(
    (hostile) => hostile.id === state.selectedTargetId
  );
  const nextTarget = threats[(currentIndex + 1) % threats.length];
  state.selectedTargetId = nextTarget.id;
  announce(state, `${nextTarget.label} 우선 표적 지정`, 1800);
  return nextTarget;
}

function clearTargetSelection(state) {
  state.selectedTargetId = null;
  announce(state, "자동 표적 모드", 1500);
}

function triggerPrimaryAction(state) {
  return state.profile === "base"
    ? fireWeapon(state, "primary", {
        x: 0,
        y: 0,
        z: sourceAltitude(state, "primary"),
      })
    : fireWeapon(state, "primary", {
        x: state.player.position.x,
        y: state.player.position.y,
        z: sourceAltitude(state, "primary"),
      });
}

function triggerSupportAction(state) {
  if (
    state.profile === "base" &&
    !state.base.dispatched &&
    !state.base.returning
  ) {
    return dispatchBaseAsset(state);
  }

  return fireWeapon(
    state,
    "support",
    {
      x: state.player.position.x,
      y: state.player.position.y,
      z: sourceAltitude(state, "support"),
    },
    state.profile === "base"
      ? {
          consumeAmmo: false,
          ignoreCooldown: true,
          target:
            selectedTarget(state) ??
            nearestTarget(state, state.player.position),
        }
      : {}
  );
}

function pickTarget(state, weapon, sourcePoint) {
  const active = selectedTarget(state);
  const source = { ...sourcePoint, z: sourcePoint.z ?? 0 };
  if (
    active &&
    distance3D(source, { ...active.position, z: active.altitudeM ?? 0 }) <=
      weapon.maxRangeM
  ) {
    return active;
  }
  return nearestTarget(state, sourcePoint);
}

function projectileCamera(state, projectileId) {
  state.cinematic = {
    type: "projectile",
    projectileId,
    explosionId: null,
    returnMode: state.cameraMode,
    timer: 2.5,
  };
}

function impactCamera(state, explosionId) {
  state.cinematic = {
    type: "impact",
    projectileId: null,
    explosionId,
    returnMode: state.cinematic?.returnMode ?? state.cameraMode,
    timer: 1.3,
  };
}

function shouldTrack(role, profile) {
  return (
    profile === "fires" ||
    profile === "defense" ||
    profile === "maritime" ||
    role === "support"
  );
}

function spawnExplosion(state, point, radiusM, damage, color) {
  const explosion = {
    id: crypto.randomUUID(),
    position: { ...point },
    ttlSeconds: 1.1,
    radiusM,
    color,
    entity: state.viewer.entities.add({
      position: cartesianFromLocal(state.origin, point),
      ellipsoid: {
        radii: new CesiumRef.Cartesian3(10, 10, 10),
        material: colorFromCss(color, 0.26),
        outline: true,
        outlineColor: colorFromCss(color, 0.92),
        outlineWidth: 2,
      },
    }),
  };
  state.explosions.push(explosion);

  state.hostiles.forEach((hostile) => {
    if (hostile.destroyed) return;
    const distance = distance3D(point, {
      ...hostile.position,
      z: hostile.altitudeM ?? 0,
    });
    if (distance > radiusM + hostile.hitRadiusM) return;
    hostile.health -=
      damage * clamp(1 - distance / Math.max(radiusM, 1), 0.25, 1);
    if (hostile.health <= 0) {
      hostile.destroyed = true;
      hostile.entity.show = false;
      state.kills += 1;
      if (state.selectedTargetId === hostile.id) state.selectedTargetId = null;
      announce(state, `${hostile.label} 격파`);
    }
  });
  return explosion;
}

function fireWeapon(state, role, sourcePoint, options = {}) {
  const weapon =
    role === "primary"
      ? state.scenario.config.primaryWeapon
      : state.scenario.config.supportWeapon;
  const ammoKey = role === "primary" ? "ammoPrimary" : "ammoSupport";
  const cooldownKey =
    role === "primary" ? "primaryCooldown" : "supportCooldown";
  const consumeAmmo = options.consumeAmmo !== false;

  if (!options.ignoreCooldown && state.player[cooldownKey] > 0) {
    announce(state, `${weapon.label} 재장전 중`, 1600);
    return false;
  }
  if (consumeAmmo && state.player[ammoKey] <= 0) {
    announce(state, `${weapon.label} 잔탄 없음`, 1600);
    return false;
  }

  const target = options.target ?? pickTarget(state, weapon, sourcePoint);
  if (!target) {
    announce(state, `${weapon.label} 사정권 내 표적 없음`, 1800);
    return false;
  }

  const targetPoint = { ...target.position, z: target.altitudeM ?? 0 };
  if (distance3D(sourcePoint, targetPoint) > weapon.maxRangeM) {
    announce(state, `${target.label} 사정권 외부`, 1800);
    return false;
  }

  if (state.overviewActive) {
    enterMissionView(state, {
      mode:
        state.mission.missionPhases[state.phaseIndex]?.cameraCue ??
        strategicCameraModeForProfile(state.profile),
      resetBias: false,
    });
  }

  const salvoCount = Math.min(
    weapon.salvo,
    consumeAmmo ? state.player[ammoKey] : weapon.salvo
  );
  const baseHeading = headingBetween(sourcePoint, target.position);
  let trackedId = null;

  for (let index = 0; index < salvoCount; index += 1) {
    const spread = (index - (salvoCount - 1) / 2) * 2.8;
    const headingDeg = normalizeHeading(baseHeading + spread);
    const direction = directionFromHeading(headingDeg);
    const speedMps = weapon.speedMps;
    const source = {
      x: sourcePoint.x + direction.x * 26,
      y: sourcePoint.y + direction.y * 26,
      z: sourcePoint.z ?? 0,
    };
    const rise =
      ((targetPoint.z ?? 0) - (source.z ?? 0)) /
      Math.max(1, distance2D(source, target.position));
    const projectile = {
      id: crypto.randomUUID(),
      role,
      position: source,
      previousPosition: { ...source },
      velocity: {
        x: direction.x * speedMps,
        y: direction.y * speedMps,
        z: rise * speedMps,
      },
      targetId: weapon.homing ? target.id : undefined,
      targetPoint,
      remainingRangeM: weapon.maxRangeM,
      ttlSeconds: weapon.maxRangeM / speedMps + 1.2,
      splashRadiusM: weapon.splashRadiusM,
      damage: weapon.damage,
      color: weapon.color,
      homing: weapon.homing,
      trail: [cartesianFromLocal(state.origin, source)],
      entity: state.viewer.entities.add({
        position: cartesianFromLocal(state.origin, source),
        point: {
          pixelSize: role === "support" ? 10 : 8,
          color: colorFromCss(weapon.color, 0.96),
          outlineColor: CesiumRef.Color.WHITE,
          outlineWidth: 1.5,
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
        },
      }),
      trailEntity: state.viewer.entities.add({
        polyline: {
          positions: [cartesianFromLocal(state.origin, source)],
          width: role === "support" ? 3 : 2,
          material: new CesiumRef.PolylineGlowMaterialProperty({
            glowPower: role === "support" ? 0.3 : 0.2,
            color: colorFromCss(weapon.color, 0.86),
          }),
        },
      }),
    };
    state.projectiles.push(projectile);
    if (index === Math.floor(salvoCount / 2)) trackedId = projectile.id;
  }

  if (consumeAmmo) state.player[ammoKey] -= salvoCount;
  state.player[cooldownKey] = weapon.cooldownSeconds;
  state.selectedTargetId = target.id;
  if (options.announce !== false) {
    announce(state, `${weapon.label} 발사: ${target.label}`);
  }
  if (
    trackedId &&
    options.trackProjectile !== false &&
    shouldTrack(role, state.profile)
  )
    projectileCamera(state, trackedId);
  return true;
}

function objectiveSite(state) {
  return state.sites.find((site) => site.kind === "objective") ?? null;
}

function focusFireTarget(state) {
  const objective = objectiveSite(state)?.position ?? { x: 0, y: 0 };
  return (
    [...liveHostiles(state)].sort(
      (left, right) =>
        distance2D(left.position, objective) -
        distance2D(right.position, objective)
    )[0] ?? null
  );
}

function focusFireLaunchPoints(state) {
  const anchor = state.player.homePosition ?? state.player.position;
  const primaryAltitude = sourceAltitude(state, "primary");
  const supportAltitude = sourceAltitude(state, "support");

  return [
    {
      role: "primary",
      point: { x: anchor.x - 220, y: anchor.y - 150, z: primaryAltitude },
    },
    {
      role: "primary",
      point: { x: anchor.x - 90, y: anchor.y - 230, z: primaryAltitude },
    },
    {
      role: "support",
      point: { x: anchor.x + 30, y: anchor.y - 210, z: supportAltitude },
    },
    {
      role: "primary",
      point: { x: anchor.x + 170, y: anchor.y - 120, z: primaryAltitude },
    },
    {
      role: "support",
      point: { x: anchor.x + 280, y: anchor.y - 20, z: supportAltitude },
    },
  ];
}

function triggerFocusFireBarrage(state, burstCount = 3, options = {}) {
  const target = focusFireTarget(state);
  if (!target) {
    if (options.announce !== false) {
      announce(state, "집중포격 대상이 아직 없습니다.", 1600);
    }
    return false;
  }

  const launchPoints = focusFireLaunchPoints(state);
  const clampedBursts = clamp(Math.floor(burstCount), 1, launchPoints.length);
  let launched = 0;

  for (let index = 0; index < clampedBursts; index += 1) {
    const launch = launchPoints[index % launchPoints.length];
    const didLaunch = fireWeapon(state, launch.role, launch.point, {
      consumeAmmo: false,
      ignoreCooldown: true,
      trackProjectile: false,
      announce: false,
      target,
    });
    if (didLaunch) {
      launched += 1;
    }
  }

  if (launched > 0 && options.announce !== false) {
    announce(state, `${target.label} 방향 집중포격 시작`, 1800);
  }
  return launched > 0;
}

function applyExternalFocusFireUpdate(state, payload) {
  if (!payload || typeof payload !== "object") {
    return;
  }

  const nextFocusFire = {
    objectiveName:
      typeof payload.objectiveName === "string" &&
      payload.objectiveName.trim().length > 0
        ? payload.objectiveName.trim()
        : (state.externalFocusFire?.objectiveName ?? "Objective Grid"),
    active: payload.active === true,
    captureProgress: clamp(Number(payload.captureProgress) || 0, 0, 100),
    aircraftCount: Math.max(0, Math.floor(Number(payload.aircraftCount) || 0)),
    artilleryCount: Math.max(
      0,
      Math.floor(Number(payload.artilleryCount) || 0)
    ),
    armorCount: Math.max(0, Math.floor(Number(payload.armorCount) || 0)),
    weaponsInFlight: Math.max(
      0,
      Math.floor(Number(payload.weaponsInFlight) || 0)
    ),
    statusLabel:
      typeof payload.statusLabel === "string" &&
      payload.statusLabel.trim().length > 0
        ? payload.statusLabel.trim()
        : (state.externalFocusFire?.statusLabel ?? "집중포격 진행 중"),
  };

  const previousWeaponsInFlight = state.externalFocusFire?.weaponsInFlight ?? 0;
  state.externalFocusFire = nextFocusFire;
  state.statusText = `${nextFocusFire.objectiveName} · ${nextFocusFire.statusLabel}`;

  const objective = objectiveSite(state);
  if (objective) {
    objective.label = nextFocusFire.objectiveName;
    if (objective.labelEntity?.label) {
      objective.labelEntity.label.text = nextFocusFire.objectiveName;
    }
  }

  const additionalBursts = clamp(
    Math.ceil((nextFocusFire.weaponsInFlight - previousWeaponsInFlight) / 4),
    0,
    3
  );
  if (additionalBursts > 0) {
    triggerFocusFireBarrage(state, additionalBursts, { announce: false });
  }

  window.__TACTICAL_SIM_RUNTIME__ = {
    ...(window.__TACTICAL_SIM_RUNTIME__ ?? {}),
    statusText: state.statusText,
  };
}

function dispatchBaseAsset(state) {
  if (state.base.dispatched || state.base.returning) {
    announce(state, "대응 자산이 이미 출동 중입니다.", 1800);
    return;
  }
  if (state.player.supportCooldown > 0) {
    announce(state, "출격 승인 재사용 대기 중입니다.", 1800);
    return;
  }
  if (state.player.ammoSupport <= 0) {
    announce(state, "출격 가능한 슬롯이 없습니다.", 1800);
    return;
  }
  const target =
    selectedTarget(state) ?? nearestTarget(state, state.base.originPoint);
  if (!target) {
    announce(state, "출격할 위협이 없습니다.", 1800);
    return;
  }
  state.player.ammoSupport -= 1;
  state.player.supportCooldown =
    state.scenario.config.supportWeapon.cooldownSeconds;
  state.base.dispatched = true;
  state.base.pendingStrike = true;
  state.base.targetId = target.id;
  state.selectedTargetId = target.id;
  announce(state, `${state.modelRuntime.label} 출격 승인: ${target.label}`);
}

function moveToward(
  player,
  destination,
  maxSpeedMps,
  turnRateDeg,
  deltaSeconds
) {
  const desiredHeading = headingBetween(player.position, destination);
  let deltaHeading = desiredHeading - player.headingDeg;
  if (deltaHeading > 180) deltaHeading -= 360;
  if (deltaHeading < -180) deltaHeading += 360;
  player.headingDeg = normalizeHeading(
    player.headingDeg +
      clamp(
        deltaHeading,
        -turnRateDeg * deltaSeconds,
        turnRateDeg * deltaSeconds
      )
  );
  player.speedMps +=
    (maxSpeedMps - player.speedMps) * Math.min(1, deltaSeconds * 1.8);
  const direction = directionFromHeading(player.headingDeg);
  player.position = {
    x: player.position.x + direction.x * player.speedMps * deltaSeconds,
    y: player.position.y + direction.y * player.speedMps * deltaSeconds,
  };
  return distance2D(player.position, destination);
}

function baseAttackRange(state) {
  if (state.modelRuntime.spawnMode === "runway") return 420;
  return state.modelRuntime.spawnMode === "drone-pad" ? 220 : 300;
}

function updatePlayer(state, deltaSeconds) {
  const keys = state.keys;
  if (state.profile === "base") {
    if (keys.has("w") || keys.has("arrowup"))
      state.commandZoomBias = clamp(
        state.commandZoomBias - 220 * deltaSeconds,
        -280,
        360
      );
    if (keys.has("s") || keys.has("arrowdown"))
      state.commandZoomBias = clamp(
        state.commandZoomBias + 220 * deltaSeconds,
        -280,
        360
      );
    if (keys.has("a") || keys.has("arrowleft"))
      state.commandHeadingBias = normalizeHeading(
        state.commandHeadingBias - 28 * deltaSeconds
      );
    if (keys.has("d") || keys.has("arrowright"))
      state.commandHeadingBias = normalizeHeading(
        state.commandHeadingBias + 28 * deltaSeconds
      );

    const target =
      state.hostiles.find(
        (hostile) => hostile.id === state.base.targetId && !hostile.destroyed
      ) ?? null;
    if (state.base.dispatched || state.base.returning) {
      const destination =
        state.base.returning || !target
          ? state.player.homePosition
          : target.position;
      const remainingDistance = moveToward(
        state.player,
        destination,
        state.modelRuntime.maxSpeedMps,
        state.modelRuntime.turnRateDeg,
        deltaSeconds
      );
      if (
        target &&
        state.base.pendingStrike &&
        remainingDistance <= baseAttackRange(state)
      ) {
        state.base.pendingStrike = false;
        state.base.dispatched = false;
        state.base.returning = true;
        fireWeapon(
          state,
          "support",
          {
            x: state.player.position.x,
            y: state.player.position.y,
            z: sourceAltitude(state, "support"),
          },
          { consumeAmmo: false, ignoreCooldown: true, target }
        );
      }
      if (state.base.returning && remainingDistance < 70) {
        state.base.returning = false;
        state.base.targetId = null;
        state.player.position = { ...state.player.homePosition };
        state.player.speedMps = 0;
        announce(state, `${state.modelRuntime.label} 복귀 완료`, 2000);
      }
    }
  } else {
    if (keys.has("a") || keys.has("arrowleft")) {
      state.player.headingDeg = normalizeHeading(
        state.player.headingDeg - state.modelRuntime.turnRateDeg * deltaSeconds
      );
    }
    if (keys.has("d") || keys.has("arrowright")) {
      state.player.headingDeg = normalizeHeading(
        state.player.headingDeg + state.modelRuntime.turnRateDeg * deltaSeconds
      );
    }
    const targetSpeed =
      keys.has("w") || keys.has("arrowup")
        ? state.modelRuntime.maxSpeedMps
        : keys.has("s") || keys.has("arrowdown")
          ? -state.modelRuntime.reverseSpeedMps
          : 0;
    state.player.speedMps +=
      (targetSpeed - state.player.speedMps) *
      Math.min(1, deltaSeconds * (targetSpeed !== 0 ? 2.8 : 2.1));
    const direction = directionFromHeading(state.player.headingDeg);
    state.player.position = {
      x:
        state.player.position.x +
        direction.x * state.player.speedMps * deltaSeconds,
      y:
        state.player.position.y +
        direction.y * state.player.speedMps * deltaSeconds,
    };
    const snapped = snapPointToLane(
      state.player.position,
      state.movementLane,
      state.movementLaneRadiusM,
      Math.min(1, deltaSeconds * 6.5)
    );
    state.player.position = snapped.point;
    if (snapped.headingDeg !== null && Math.abs(state.player.speedMps) > 0.8) {
      state.player.headingDeg = normalizeHeading(
        state.player.headingDeg +
          clamp(
            shortestHeadingDelta(state.player.headingDeg, snapped.headingDeg),
            -state.modelRuntime.turnRateDeg * 0.55 * deltaSeconds,
            state.modelRuntime.turnRateDeg * 0.55 * deltaSeconds
          )
      );
    }
  }

  state.player.primaryCooldown = Math.max(
    0,
    state.player.primaryCooldown - deltaSeconds
  );
  state.player.supportCooldown = Math.max(
    0,
    state.player.supportCooldown - deltaSeconds
  );
}

function updateHostiles(state, deltaSeconds) {
  state.hostiles.forEach((hostile) => {
    if (
      hostile.destroyed ||
      hostile.speedMps <= 0 ||
      hostile.waypoints.length < 2
    )
      return;
    const targetWaypoint = hostile.waypoints[hostile.waypointIndex];
    const maxStep = hostile.speedMps * deltaSeconds;
    if (distance2D(hostile.position, targetWaypoint) <= maxStep + 5) {
      hostile.position = { ...targetWaypoint };
      hostile.waypointIndex =
        (hostile.waypointIndex + 1) % hostile.waypoints.length;
    } else {
      hostile.headingDeg = headingBetween(hostile.position, targetWaypoint);
      const direction = directionFromHeading(hostile.headingDeg);
      hostile.position = {
        x: hostile.position.x + direction.x * maxStep,
        y: hostile.position.y + direction.y * maxStep,
      };
    }
  });
}

function updateProjectiles(state, deltaSeconds) {
  for (let index = state.projectiles.length - 1; index >= 0; index -= 1) {
    const projectile = state.projectiles[index];
    projectile.previousPosition = { ...projectile.position };
    const target = projectile.targetId
      ? state.hostiles.find(
          (hostile) => hostile.id === projectile.targetId && !hostile.destroyed
        )
      : null;
    if (projectile.homing && target) {
      const targetPoint = { ...target.position, z: target.altitudeM ?? 0 };
      const speed = Math.hypot(
        projectile.velocity.x,
        projectile.velocity.y,
        projectile.velocity.z
      );
      const headingDeg = headingBetween(projectile.position, target.position);
      const direction = directionFromHeading(headingDeg);
      const rise =
        ((targetPoint.z ?? 0) - (projectile.position.z ?? 0)) /
        Math.max(1, distance2D(projectile.position, target.position));
      projectile.velocity = {
        x: direction.x * speed,
        y: direction.y * speed,
        z: rise * speed,
      };
      projectile.targetPoint = targetPoint;
    }
    projectile.position = {
      x: projectile.position.x + projectile.velocity.x * deltaSeconds,
      y: projectile.position.y + projectile.velocity.y * deltaSeconds,
      z: (projectile.position.z ?? 0) + projectile.velocity.z * deltaSeconds,
    };
    projectile.remainingRangeM -= distance3D(
      projectile.previousPosition,
      projectile.position
    );
    projectile.ttlSeconds -= deltaSeconds;
    projectile.trail.push(
      cartesianFromLocal(state.origin, projectile.position)
    );
    if (projectile.trail.length > 10) projectile.trail.shift();
    projectile.entity.position = cartesianFromLocal(
      state.origin,
      projectile.position
    );
    projectile.trailEntity.polyline.positions = projectile.trail;
    if (
      distance3D(projectile.position, projectile.targetPoint) >
        Math.max(projectile.splashRadiusM * 0.45, 26) &&
      projectile.remainingRangeM > 0 &&
      projectile.ttlSeconds > 0
    ) {
      continue;
    }
    const explosion = spawnExplosion(
      state,
      target
        ? { ...target.position, z: target.altitudeM ?? 0 }
        : projectile.position,
      projectile.splashRadiusM,
      projectile.damage,
      projectile.color
    );
    if (
      state.cinematic?.type === "projectile" &&
      state.cinematic.projectileId === projectile.id
    ) {
      impactCamera(state, explosion.id);
    }
    state.viewer.entities.remove(projectile.entity);
    state.viewer.entities.remove(projectile.trailEntity);
    state.projectiles.splice(index, 1);
  }
}

function updateExplosions(state, deltaSeconds) {
  for (let index = state.explosions.length - 1; index >= 0; index -= 1) {
    const explosion = state.explosions[index];
    explosion.ttlSeconds -= deltaSeconds;
    const radius = Math.max(
      12,
      explosion.radiusM * (1.5 - explosion.ttlSeconds * 0.45) * 0.4
    );
    explosion.entity.position = cartesianFromLocal(
      state.origin,
      explosion.position
    );
    explosion.entity.ellipsoid.radii = new CesiumRef.Cartesian3(
      radius,
      radius,
      radius
    );
    explosion.entity.ellipsoid.material = colorFromCss(
      explosion.color,
      clamp(explosion.ttlSeconds * 0.24, 0.02, 0.28)
    );
    if (explosion.ttlSeconds > 0) continue;
    state.viewer.entities.remove(explosion.entity);
    state.explosions.splice(index, 1);
  }
}

function updateEntities(state) {
  const playerCartesian = cartesianFromLocal(state.origin, {
    ...state.player.position,
    z: playerAltitude(state),
  });
  state.player.entity.position = playerCartesian;
  state.player.entity.orientation =
    CesiumRef.Transforms.headingPitchRollQuaternion(
      playerCartesian,
      new CesiumRef.HeadingPitchRoll(
        CesiumRef.Math.toRadians(
          normalizeHeading(state.player.headingDeg + 180)
        ),
        0,
        0
      )
    );
  state.sensorEntity.position = cartesianFromLocal(
    state.origin,
    state.profile === "base" || state.profile === "defense"
      ? { x: 0, y: 0, z: 0 }
      : { ...state.player.position, z: 0 }
  );
  state.sensorEntity.ellipse.semiMajorAxis = state.scenario.config.sensorRangeM;
  state.sensorEntity.ellipse.semiMinorAxis = state.scenario.config.sensorRangeM;
  state.hostiles.forEach((hostile) => {
    hostile.entity.show = !hostile.destroyed;
    if (hostile.destroyed) return;
    hostile.entity.position = cartesianFromLocal(state.origin, {
      ...hostile.position,
      z: hostile.altitudeM,
    });
    hostile.entity.point.pixelSize =
      hostile.id === state.selectedTargetId
        ? 20
        : hostile.domain === "air"
          ? 16
          : 14;
    hostile.entity.point.color = colorFromCss(
      hostile.id === state.selectedTargetId
        ? "#ff8c42"
        : hostile.domain === "air"
          ? "#ff6b6b"
          : "#ef476f",
      0.95
    );
    hostile.entity.label.text = `${hostile.label} ${Math.max(0, Math.round(hostile.health))}`;
  });
  const target = selectedTarget(state);
  state.targetLineEntity.show = Boolean(target);
  state.targetRingEntity.show = Boolean(target);
  if (target) {
    state.targetLineEntity.polyline.positions = [
      cartesianFromLocal(state.origin, {
        ...state.player.position,
        z: playerAltitude(state) + 10,
      }),
      cartesianFromLocal(state.origin, {
        ...target.position,
        z: target.altitudeM ?? 0,
      }),
    ];
    state.targetRingEntity.position = cartesianFromLocal(state.origin, {
      ...target.position,
      z: 0,
    });
    state.targetRingEntity.ellipse.semiMajorAxis = Math.max(
      90,
      target.hitRadiusM + 70
    );
    state.targetRingEntity.ellipse.semiMinorAxis = Math.max(
      90,
      target.hitRadiusM + 70
    );
  }
}

function advancePhase(state, nextIndex) {
  state.phaseIndex = clamp(
    nextIndex,
    0,
    state.mission.missionPhases.length - 1
  );
  state.phaseTimer = 0;
  state.cameraMode = state.mission.missionPhases[state.phaseIndex].cameraCue;
  state.cameraCycleIndex = Math.max(
    0,
    CAMERA_CYCLE[state.profile].indexOf(state.cameraMode)
  );
  announce(
    state,
    `${state.mission.missionPhases[state.phaseIndex].title}: ${state.mission.missionPhases[state.phaseIndex].objective}`,
    2400
  );
}

function updateMission(state, deltaSeconds) {
  if (state.overviewActive && !state.cinematic) {
    return;
  }
  state.phaseTimer += deltaSeconds;
  const alive = liveHostiles(state).length;
  if (alive === 0) {
    if (state.phaseIndex !== state.mission.missionPhases.length - 1) {
      advancePhase(state, state.mission.missionPhases.length - 1);
    }
    return;
  }
  if (state.phaseIndex === 0 && state.phaseTimer > 5)
    return advancePhase(state, 1);
  if (
    state.phaseIndex === 1 &&
    (state.selectedTargetId || state.phaseTimer > 8)
  )
    return advancePhase(state, 2);
  if (state.phaseIndex === 2 && (state.kills > 0 || state.phaseTimer > 12)) {
    return advancePhase(
      state,
      Math.min(3, state.mission.missionPhases.length - 1)
    );
  }
}

function strategicFocus(state) {
  const target = selectedTarget(state);
  if ((state.profile === "base" || state.profile === "defense") && target) {
    return midpoint(
      { x: 0, y: 0, z: 0 },
      { ...target.position, z: target.altitudeM ?? 0 },
      0.38
    );
  }
  if (
    (state.cameraMode === "topdown" || state.cameraMode === "operator") &&
    target
  ) {
    return midpoint(
      { ...state.player.position, z: playerAltitude(state) },
      { ...target.position, z: target.altitudeM ?? 0 },
      0.46
    );
  }
  return { ...state.player.position, z: playerAltitude(state) };
}

function updateCamera(state) {
  const camera = state.viewer.camera;
  const mode =
    state.cinematic?.type === "projectile"
      ? "projectile"
      : state.cinematic?.type === "impact"
        ? "impact"
        : state.cameraMode;
  reticleElement.dataset.mode = mode;
  reticleElement.hidden =
    state.overviewActive ||
    mode === "orbit" ||
    mode === "operator" ||
    mode === "chase" ||
    mode === "bridge" ||
    mode === "profile" ||
    mode === "topdown" ||
    mode === "radar" ||
    mode === "command";

  if (state.overviewActive && !state.cinematic) {
    const height =
      Math.max(
        state.battlespaceFrame.radiusM * 1.24,
        state.modelRuntime.topDownHeight + 320
      ) + state.commandZoomBias;
    camera.lookAt(
      cartesianFromLocal(state.origin, state.battlespaceFrame.center),
      new CesiumRef.HeadingPitchRange(
        CesiumRef.Math.toRadians(state.commandHeadingBias),
        CesiumRef.Math.toRadians(-58),
        Math.max(320, height)
      )
    );
    return;
  }

  if (mode === "projectile") {
    const projectile = state.projectiles.find(
      (item) => item.id === state.cinematic?.projectileId
    );
    if (projectile) {
      camera.lookAt(
        cartesianFromLocal(state.origin, projectile.position),
        new CesiumRef.HeadingPitchRange(
          CesiumRef.Math.toRadians(
            normalizeHeading(
              headingBetween(projectile.previousPosition, projectile.position) +
                180
            )
          ),
          CesiumRef.Math.toRadians(-14),
          state.modelRuntime.projectileDistance
        )
      );
      return;
    }
  }

  if (mode === "impact") {
    const explosion = state.explosions.find(
      (item) => item.id === state.cinematic?.explosionId
    );
    if (explosion) {
      camera.lookAt(
        cartesianFromLocal(state.origin, explosion.position),
        new CesiumRef.HeadingPitchRange(
          CesiumRef.Math.toRadians(
            normalizeHeading((performance.now() * 0.05) % 360)
          ),
          CesiumRef.Math.toRadians(-22),
          state.modelRuntime.impactDistance
        )
      );
      return;
    }
  }

  const focus = strategicFocus(state);
  const focusCartesian = cartesianFromLocal(state.origin, focus);
  const behindHeading = normalizeHeading(state.player.headingDeg + 180);
  if (mode === "orbit") {
    const orbitFocus = cartesianFromLocal(state.origin, {
      ...state.player.position,
      z: playerAltitude(state),
    });
    camera.lookAt(
      orbitFocus,
      new CesiumRef.HeadingPitchRange(
        CesiumRef.Math.toRadians(state.orbitCamera.headingDeg),
        CesiumRef.Math.toRadians(state.orbitCamera.pitchDeg),
        state.orbitCamera.range
      )
    );
    return;
  }
  if (mode === "profile") {
    camera.lookAt(
      focusCartesian,
      new CesiumRef.HeadingPitchRange(
        CesiumRef.Math.toRadians(
          normalizeHeading(state.player.headingDeg + 90)
        ),
        CesiumRef.Math.toRadians(-8),
        Math.max(
          state.modelRuntime.chaseDistance,
          state.profile === "maritime"
            ? 120
            : state.profile === "base"
              ? 78
              : 44
        )
      )
    );
    return;
  }
  if (mode === "threat") {
    const target =
      selectedTarget(state) ??
      nearestTarget(state, selectionReferencePoint(state));
    if (target) {
      const targetPoint = {
        ...target.position,
        z: target.altitudeM ?? 0,
      };
      camera.lookAt(
        cartesianFromLocal(state.origin, targetPoint),
        new CesiumRef.HeadingPitchRange(
          CesiumRef.Math.toRadians(
            normalizeHeading(
              headingBetween(target.position, selectionReferencePoint(state)) +
                208
            )
          ),
          CesiumRef.Math.toRadians(target.altitudeM > 0 ? -12 : -10),
          Math.max(
            state.modelRuntime.operatorDistance * 1.3,
            target.altitudeM > 0 ? 148 : 72
          )
        )
      );
      return;
    }
  }
  if (mode === "chase" || mode === "bridge") {
    camera.lookAt(
      focusCartesian,
      new CesiumRef.HeadingPitchRange(
        CesiumRef.Math.toRadians(behindHeading),
        CesiumRef.Math.toRadians(mode === "bridge" ? -12 : -18),
        state.modelRuntime.chaseDistance
      )
    );
  } else if (mode === "operator") {
    camera.lookAt(
      focusCartesian,
      new CesiumRef.HeadingPitchRange(
        CesiumRef.Math.toRadians(behindHeading - 12),
        CesiumRef.Math.toRadians(-10),
        state.modelRuntime.operatorDistance
      )
    );
  } else {
    const focusPoint =
      mode === "command" && selectedTarget(state)
        ? midpoint(
            { x: 0, y: 0, z: 0 },
            { ...selectedTarget(state).position, z: 0 },
            0.34
          )
        : strategicFocus(state);
    const height =
      mode === "radar"
        ? state.modelRuntime.topDownHeight + 140 + state.commandZoomBias
        : state.modelRuntime.topDownHeight + state.commandZoomBias;
    camera.lookAt(
      cartesianFromLocal(state.origin, focusPoint),
      new CesiumRef.HeadingPitchRange(
        CesiumRef.Math.toRadians(state.commandHeadingBias),
        CesiumRef.Math.toRadians(mode === "radar" ? -84 : -86),
        height
      )
    );
  }
}

function chip(title, description) {
  return `<div class="hud-chip"><strong>${title}</strong><span>${description}</span></div>`;
}

function cameraModeLabel(mode) {
  return (
    {
      overview: "전장 개요",
      chase: "추적",
      operator: "운용",
      orbit: "360 모델",
      profile: "측면 실루엣",
      threat: "표적 추적",
      topdown: "탑뷰",
      projectile: "발사체",
      impact: "폭발",
      radar: "레이더",
      bridge: "함교",
      command: "지휘",
    }[mode] ?? mode
  );
}

function updateHud(state) {
  const phase = state.mission.missionPhases[state.phaseIndex];
  const focusFire = state.externalFocusFire;
  const target = selectedTarget(state);
  const reference =
    state.profile === "base" || state.profile === "defense"
      ? state.base.originPoint
      : state.player.position;
  const nearest = [...liveHostiles(state)]
    .map((hostile) => ({
      hostile,
      distance: Math.round(distance2D(reference, hostile.position)),
    }))
    .sort((left, right) => left.distance - right.distance)[0];

  hud.eyebrow.textContent = state.theme.opsOverline;
  hud.title.textContent = state.theme.opsTitle;
  hud.subtitle.textContent = `${state.mission.operatorRole} · ${state.mission.environmentLabel}`;
  hud.provider.textContent = `${resolveMapProviderLabel()} · ${state.modelRuntime.label}`;
  hud.status.textContent = state.overviewActive
    ? `대기 · ${phase.title}`
    : focusFire
      ? `집중포격 · ${focusFire.statusLabel}`
      : `${state.phaseIndex + 1}/${state.mission.missionPhases.length} ${phase.title}`;
  hud.phase.textContent = state.overviewActive
    ? `Overview / ${phase.title}`
    : focusFire
      ? `집중포격 · ${focusFire.statusLabel}`
      : `${state.phaseIndex + 1}/${state.mission.missionPhases.length} ${phase.title}`;
  hud.objective.textContent = state.overviewActive
    ? state.mission.missionStatement
    : focusFire
      ? `${focusFire.objectiveName} · 점령 ${Math.round(focusFire.captureProgress)}%`
      : phase.objective;
  hud.target.textContent = state.overviewActive
    ? target
      ? `${target.label} / ${target.role}`
      : "우선순위 미지정"
    : target
      ? `${target.label} / ${target.role}`
      : "자동 표적";
  hud.weapons.textContent = `F ${state.player.ammoPrimary} · Enter ${state.player.ammoSupport}`;
  hud.system.textContent = state.overviewActive
    ? `${cameraModeLabel("overview")} · 위협 ${liveHostiles(state).length} · 전장 ${formatDistanceLabel(state.battlespaceFrame.spanM)}`
    : focusFire
      ? `${cameraModeLabel(state.cinematic?.type ?? state.cameraMode)} · 탄체 ${focusFire.weaponsInFlight} · 격파 ${state.kills}`
      : `${cameraModeLabel(state.cinematic?.type ?? state.cameraMode)} · 격파 ${state.kills} · 위협 ${liveHostiles(state).length}`;
  hud.controls.textContent = `${state.scenario.config.controls.join(" · ")} · 360 모델: 드래그 회전 · 휠: 확대/축소`;
  hud.layout.innerHTML = state.mission.interfaceBlocks
    .map((item) => chip(item.title, item.description))
    .join("");
  const queueItems = [
    target
      ? chip("Locked", `${target.label} · ${target.role}`)
      : chip("Target", "자동 표적"),
    nearest
      ? chip("Nearest", `${nearest.hostile.label} / ${nearest.distance}m`)
      : "",
    chip("Mission", state.overviewActive ? phase.objective : phase.instruction),
    focusFire
      ? chip(
          "Focus Fire",
          `${focusFire.statusLabel} · 탄체 ${focusFire.weaponsInFlight}`
        )
      : "",
    ...liveHostiles(state)
      .slice(0, 2)
      .map((hostile) =>
        chip(
          hostile.label,
          `${hostile.role} · HP ${Math.max(0, Math.round(hostile.health))}`
        )
      ),
  ].filter(Boolean);
  hud.queue.innerHTML =
    queueItems.length > 0
      ? queueItems.join("")
      : chip("Status", `${state.mission.freePlayLabel} 상태로 전환`);

  if (!state.toast || state.toast.until < performance.now()) {
    state.toast = null;
    toastElement.hidden = true;
  } else {
    toastElement.textContent = state.toast.text;
    toastElement.hidden = false;
  }
}

function cycleCamera(state) {
  if (state.cinematic) return;
  if (state.overviewActive) {
    enterMissionView(state, {
      mode: state.mission.defaultCameraMode,
      announceText: `${cameraModeLabel(state.mission.defaultCameraMode)} 카메라`,
    });
    return;
  }
  state.cameraCycleIndex =
    (state.cameraCycleIndex + 1) % CAMERA_CYCLE[state.profile].length;
  state.cameraMode = CAMERA_CYCLE[state.profile][state.cameraCycleIndex];
  if (state.cameraMode === "orbit") {
    resetOrbitCamera(state);
  }
  announce(state, `${cameraModeLabel(state.cameraMode)} 카메라`, 1500);
}

function adjustOrbitZoom(state, deltaY) {
  const zoomDelta = clamp(deltaY * 0.06, -18, 18);
  state.orbitCamera.range = clamp(
    state.orbitCamera.range + zoomDelta,
    state.orbitCamera.minRange,
    state.orbitCamera.maxRange
  );
}

function handleOrbitPointerDown(state, event) {
  if (!isOrbitCameraMode(state)) {
    return;
  }

  state.orbitCamera.dragging = true;
  state.orbitCamera.pointerId = event.pointerId;
  state.orbitCamera.lastX = event.clientX;
  state.orbitCamera.lastY = event.clientY;
  state.orbitCamera.dragDistance = 0;
  state.viewer.canvas.setPointerCapture?.(event.pointerId);
}

function handleOrbitPointerMove(state, event) {
  if (
    !state.orbitCamera.dragging ||
    state.orbitCamera.pointerId !== event.pointerId
  ) {
    return;
  }

  const deltaX = event.clientX - state.orbitCamera.lastX;
  const deltaY = event.clientY - state.orbitCamera.lastY;
  state.orbitCamera.lastX = event.clientX;
  state.orbitCamera.lastY = event.clientY;
  state.orbitCamera.dragDistance += Math.abs(deltaX) + Math.abs(deltaY);
  state.orbitCamera.headingDeg = normalizeHeading(
    state.orbitCamera.headingDeg - deltaX * 0.32
  );
  state.orbitCamera.pitchDeg = clamp(
    state.orbitCamera.pitchDeg + deltaY * 0.18,
    -68,
    -6
  );
}

function handleOrbitPointerUp(state, event) {
  if (state.orbitCamera.pointerId !== event.pointerId) {
    return;
  }

  state.orbitCamera.dragging = false;
  state.orbitCamera.pointerId = null;
  if (state.orbitCamera.dragDistance > 6) {
    state.orbitCamera.suppressSelectionUntil = performance.now() + 140;
  }
  if (state.viewer.canvas.hasPointerCapture?.(event.pointerId)) {
    state.viewer.canvas.releasePointerCapture(event.pointerId);
  }
}

function pickClickPoint(state, movement) {
  const picked = state.viewer.camera.pickEllipsoid(
    movement.position,
    state.viewer.scene.globe.ellipsoid
  );
  if (!picked) return null;
  const cartographic = CesiumRef.Cartographic.fromCartesian(picked);
  return lonLatToLocalPoint(state.origin, {
    lon: CesiumRef.Math.toDegrees(cartographic.longitude),
    lat: CesiumRef.Math.toDegrees(cartographic.latitude),
  });
}

function selectByClick(state, movement) {
  if (
    isOrbitCameraMode(state) ||
    state.orbitCamera.suppressSelectionUntil > performance.now()
  ) {
    return;
  }

  const point = pickClickPoint(state, movement);
  if (!point) return;
  const nearest = [...liveHostiles(state)]
    .map((hostile) => ({
      hostile,
      distance: distance2D(hostile.position, point),
    }))
    .sort((left, right) => left.distance - right.distance)[0];
  if (nearest && nearest.distance <= 240) {
    state.selectedTargetId = nearest.hostile.id;
    announce(state, `${nearest.hostile.label} 우선 표적 지정`, 1800);
  } else {
    state.selectedTargetId = null;
    announce(state, "자동 표적 모드", 1500);
  }
}

function frame(state, timestamp) {
  const deltaSeconds = state.lastFrameTime
    ? Math.min((timestamp - state.lastFrameTime) / 1000, 0.05)
    : 0.016;
  state.lastFrameTime = timestamp;
  state.elapsedSeconds += deltaSeconds;
  updatePlayer(state, deltaSeconds);
  updateHostiles(state, deltaSeconds);
  updateProjectiles(state, deltaSeconds);
  updateExplosions(state, deltaSeconds);
  updateMission(state, deltaSeconds);
  if (state.cinematic) {
    state.cinematic.timer -= deltaSeconds;
    if (state.cinematic.timer <= 0) {
      state.cameraMode = state.cinematic.returnMode;
      state.cameraCycleIndex = Math.max(
        0,
        CAMERA_CYCLE[state.profile].indexOf(state.cameraMode)
      );
      state.cinematic = null;
    }
  }
  updateEntities(state);
  updateCamera(state);
  if (timestamp - state.hudUpdatedAt > 140) {
    updateHud(state);
    state.hudUpdatedAt = timestamp;
  }
  state.frameHandle = window.requestAnimationFrame((nextTimestamp) =>
    frame(state, nextTimestamp)
  );
}

function onKeyDown(state, event) {
  const key = event.key.toLowerCase();
  if ("wasdfr ".includes(key) || key.startsWith("arrow") || key === "enter")
    event.preventDefault();
  if (event.repeat && (key === "f" || key === "enter" || key === " ")) return;
  if (key === "f") return triggerPrimaryAction(state);
  if (key === "enter") return triggerSupportAction(state);
  if (key === " ") return cycleCamera(state);
  if (key === "r") {
    return handleTacticalCommand(state, "reset-view");
  }
  state.keys.add(key);
}

function onKeyUp(state, event) {
  state.keys.delete(event.key.toLowerCase());
}

function showError(message) {
  bootStatusElement.textContent = message;
  bootStatusElement.hidden = false;
  hudElement.hidden = true;
  if (starterPanelElement) {
    starterPanelElement.hidden = true;
  }
  if (mapToolsElement) {
    mapToolsElement.hidden = true;
  }
  toastElement.hidden = true;
}

if (!CesiumRef || !payload) {
  showError(
    payload
      ? "Cesium 런타임을 찾지 못했습니다."
      : "전술 시뮬레이션 상태를 찾지 못했습니다."
  );
} else {
  try {
    document.documentElement.style.setProperty(
      "--accent",
      payload.theme.accentColor
    );
    document.documentElement.style.setProperty(
      "--glow",
      payload.theme.glowColor
    );
    document.body.dataset.profile = payload.profile;
    const state = createState(createViewer());
    updateHostileRouteStats(state);
    createEntities(state);
    const handleExternalMessage = (event) => {
      if (event.origin !== window.location.origin || !event.data) {
        return;
      }

      if (event.data.type === "vista-focus-fire-update") {
        applyExternalFocusFireUpdate(state, event.data.payload);
        updateHud(state);
        return;
      }

      if (event.data.type === "vista-tactical-runtime-update") {
        applyExternalTacticalRuntimeUpdate(state, event.data.payload);
        updateEntities(state);
        updateCamera(state);
        updateHud(state);
        return;
      }

      if (event.data.type === "vista-tactical-command") {
        handleTacticalCommand(state, event.data.payload?.command);
        updateCamera(state);
        updateHud(state);
        return;
      }

      if (
        event.data.type === "vista-focus-fire-command" &&
        event.data.payload?.command === "start-barrage"
      ) {
        const bursts = clamp(
          Math.floor(Number(event.data.payload.bursts) || 3),
          1,
          6
        );
        triggerFocusFireBarrage(state, bursts, { announce: true });
        updateHud(state);
      }
    };
    window.addEventListener("message", handleExternalMessage);
    const handleRuntimeCommandClick = (event) => {
      handleTacticalCommand(state, event.currentTarget.dataset.runtimeCommand);
      updateCamera(state);
      updateHud(state);
    };
    runtimeCommandButtons.forEach((button) =>
      button.addEventListener("click", handleRuntimeCommandClick)
    );
    const handleWheel = (event) => {
      event.preventDefault();
      if (Math.abs(event.deltaY) < 2) {
        return;
      }
      if (isOrbitCameraMode(state)) {
        adjustOrbitZoom(state, event.deltaY);
        updateCamera(state);
        updateHud(state);
        return;
      }
      adjustMapZoom(state, event.deltaY > 0 ? 220 : -220);
      updateCamera(state);
      updateHud(state);
    };
    state.viewer.canvas.addEventListener("wheel", handleWheel, {
      passive: false,
    });
    state.viewer.canvas.addEventListener("pointerdown", (event) =>
      handleOrbitPointerDown(state, event)
    );
    window.addEventListener("pointermove", (event) =>
      handleOrbitPointerMove(state, event)
    );
    window.addEventListener("pointerup", (event) =>
      handleOrbitPointerUp(state, event)
    );
    window.addEventListener("pointercancel", (event) =>
      handleOrbitPointerUp(state, event)
    );
    state.viewer.screenSpaceEventHandler.setInputAction(
      (movement) => selectByClick(state, movement),
      CesiumRef.ScreenSpaceEventType.LEFT_CLICK
    );
    window.addEventListener("keydown", (event) => onKeyDown(state, event));
    window.addEventListener("keyup", (event) => onKeyUp(state, event));
    bootStatusElement.hidden = true;
    hudElement.hidden = false;
    if (starterPanelElement) {
      starterPanelElement.hidden = true;
    }
    if (mapToolsElement) {
      mapToolsElement.hidden = true;
    }
    announce(
      state,
      `3D 모델 집중 보기에서 시작합니다. ${payload.mission.missionStatement}`,
      3200
    );
    updateEntities(state);
    updateCamera(state);
    updateHud(state);
    void bootstrapRoutes(state);
    state.frameHandle = window.requestAnimationFrame((timestamp) =>
      frame(state, timestamp)
    );
    window.__TACTICAL_SIM_RUNTIME__ = {
      statusText: state.statusText,
      mapProvider: resolveMapProviderLabel(),
    };
  } catch (error) {
    console.error(
      "Failed to initialize the tactical simulation viewer.",
      error
    );
    showError(
      "3D 전술 지도를 초기화하지 못했습니다. 지도 공급자 설정을 확인한 뒤 다시 시도해 주세요."
    );
  }
}
