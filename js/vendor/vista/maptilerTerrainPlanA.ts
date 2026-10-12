// @ts-nocheck
const DEFAULT_TERRAIN_EXAGGERATION = 1.5;
const DEFAULT_OBLIQUE_PITCH = 60;
const DEFAULT_OBLIQUE_BEARING = 30;
const DEFAULT_TOP_PITCH = 0;
const DEFAULT_TOP_BEARING = 0;
const TERRAIN_DEM_SOURCE_ID = "maptiler-terrain-dem";
const SATELLITE_SOURCE_ID = "maptiler-satellite";
const OFFLINE_BASE_SOURCE_ID = "offline-basemap";
const OFFLINE_BUILDING_SOURCE_ID = "offline-buildings";
const OFFLINE_ROAD_SOURCE_ID = "offline-roads";
const OFFLINE_WATER_SOURCE_ID = "offline-water";
const OFFLINE_AOI_SOURCE_ID = "offline-aoi";
const UNIT_SOURCE_ID = "terrain-runtime-units";
const WEAPON_SOURCE_ID = "terrain-runtime-weapons";
const GROUND_MARKER_SOURCE_ID = "terrain-runtime-ground-markers";
const MAPLIBRE_LOCAL_SCRIPT_URL = resolveTerrainViewerPublicPath(
  "vendor/maplibre/maplibre-gl.js"
);
const MAPLIBRE_LOCAL_STYLE_URL = resolveTerrainViewerPublicPath(
  "vendor/maplibre/maplibre-gl.css"
);
const MAPLIBRE_CDN_SCRIPT_URL =
  "https://unpkg.com/maplibre-gl/dist/maplibre-gl.js";
const MAPLIBRE_CDN_STYLE_URL =
  "https://unpkg.com/maplibre-gl/dist/maplibre-gl.css";

const SIDE_COLOR_MAP = {
  blue: "#7fe7ff",
  red: "#ff6b6b",
  silver: "#dce5f2",
  yellow: "#ffd166",
  green: "#80ed99",
  black: "#f1f5f9",
};

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

function normalizeColor(value, fallback = "#7fe7ff") {
  const text = String(value ?? "").trim();
  return /^#[0-9a-f]{6}$/i.test(text) ? text : fallback;
}

function loadExternalScript(url, globalName) {
  if (window[globalName]) {
    return Promise.resolve(window[globalName]);
  }

  return new Promise((resolve, reject) => {
    const existingScript = document.querySelector(`script[src="${url}"]`);
    if (existingScript) {
      existingScript.addEventListener("load", () =>
        resolve(window[globalName])
      );
      existingScript.addEventListener("error", () =>
        reject(new Error(`Failed to load ${url}.`))
      );
      return;
    }

    const script = document.createElement("script");
    script.src = url;
    script.async = true;
    script.onload = () => resolve(window[globalName]);
    script.onerror = () => reject(new Error(`Failed to load ${url}.`));
    document.head.appendChild(script);
  });
}

async function loadFirstAvailableScript(urls, globalName) {
  let lastError = null;
  for (const url of urls) {
    try {
      return await loadExternalScript(url, globalName);
    } catch (error) {
      lastError = error;
      console.warn("Failed to load MapLibre runtime candidate.", {
        url,
        error,
      });
    }
  }

  throw lastError ?? new Error("No MapLibre runtime URLs were configured.");
}

function ensureExternalStylesheet(url) {
  if (document.querySelector(`link[href="${url}"]`)) {
    return;
  }

  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = url;
  document.head.appendChild(link);
}

async function resolveMapLibreRuntime(mapLibre, options = {}) {
  if (mapLibre) {
    return mapLibre;
  }

  const scriptUrls = Array.isArray(options.scriptUrls)
    ? options.scriptUrls.filter(Boolean)
    : options.offlineOnly
      ? [MAPLIBRE_LOCAL_SCRIPT_URL]
      : [MAPLIBRE_LOCAL_SCRIPT_URL, MAPLIBRE_CDN_SCRIPT_URL];
  const styleUrls = Array.isArray(options.styleUrls)
    ? options.styleUrls.filter(Boolean)
    : options.offlineOnly
      ? [MAPLIBRE_LOCAL_STYLE_URL]
      : [MAPLIBRE_LOCAL_STYLE_URL, MAPLIBRE_CDN_STYLE_URL];

  styleUrls.forEach((url) => ensureExternalStylesheet(url));
  return loadFirstAvailableScript(scriptUrls, "maplibregl");
}

function colorForRuntimeFeature(feature) {
  return normalizeColor(
    feature?.sideColor,
    SIDE_COLOR_MAP[String(feature?.sideId ?? "").toLowerCase()] ?? "#7fe7ff"
  );
}

function parseFiniteNumber(value) {
  const parsed = Number(value ?? Number.NaN);
  return Number.isFinite(parsed) ? parsed : null;
}

function toCoordinateFeature(entry, type) {
  const longitude = parseFiniteNumber(entry?.longitude);
  const latitude = parseFiniteNumber(entry?.latitude);

  if (longitude === null || latitude === null) {
    return null;
  }

  return {
    type: "Feature",
    geometry: {
      type: "Point",
      coordinates: [longitude, latitude],
    },
    properties: {
      id: String(entry?.id ?? ""),
      name: String(entry?.name ?? entry?.className ?? type),
      type,
      color: colorForRuntimeFeature(entry),
      selected: entry?.selected === true,
    },
  };
}

function toGroundMarkerFeature(entry) {
  const longitude = parseFiniteNumber(entry?.longitude);
  const latitude = parseFiniteNumber(entry?.latitude);

  if (longitude === null || latitude === null) {
    return null;
  }

  const label = String(entry?.label ?? entry?.name ?? "").trim();
  if (!label) {
    return null;
  }

  return {
    type: "Feature",
    geometry: {
      type: "Point",
      coordinates: [longitude, latitude],
    },
    properties: {
      id: String(entry?.id ?? ""),
      label,
      color: normalizeColor(entry?.color, "#ffffff"),
      haloColor: String(entry?.outlineColor ?? "rgba(0, 0, 0, 0.72)"),
      textSize: Math.max(16, Math.min(48, Number(entry?.textSizePx) || 32)),
      rotate: Number(entry?.headingDegrees) || 0,
    },
  };
}

function createFeatureCollection(features = []) {
  return {
    type: "FeatureCollection",
    features,
  };
}

function resolveCenter(bounds) {
  return {
    lon: (bounds.west + bounds.east) / 2,
    lat: (bounds.south + bounds.north) / 2,
  };
}

function resolveBoundsPadding() {
  const shortSide = Math.min(
    window.innerWidth || 1200,
    window.innerHeight || 800
  );
  return Math.max(44, Math.min(180, Math.round(shortSide * 0.12)));
}

function resolveInitialZoom(bounds) {
  const span = Math.max(bounds.east - bounds.west, bounds.north - bounds.south);
  if (span <= 0.01) {
    return 14;
  }
  if (span <= 0.04) {
    return 12;
  }
  if (span <= 0.12) {
    return 10;
  }
  return 8;
}

export function isFatalMapLibreSetupError(error) {
  const status = Number(error?.status);
  if (status === 401 || status === 403) {
    return true;
  }

  const message = String(error?.message ?? error ?? "");
  if (
    /source image could not be decoded|image.*decode|failed to load tile/i.test(
      message
    )
  ) {
    return false;
  }

  return (
    /tilejson/i.test(message) ||
    /style.*(load|parse|valid|missing|not found|not available)/i.test(
      message
    ) ||
    /terrain.*(missing|not found|invalid|not available)/i.test(message) ||
    /source.*(missing|not found|invalid|not available|does not exist)/i.test(
      message
    )
  );
}

function waitForMapEvent(map, eventName, timeoutMs = 15000) {
  return new Promise((resolve, reject) => {
    let settled = false;
    const timeoutId = window.setTimeout(() => {
      if (settled) {
        return;
      }
      settled = true;
      cleanup();
      reject(new Error(`Timed out waiting for MapLibre ${eventName}.`));
    }, timeoutMs);

    const cleanup = () => {
      window.clearTimeout(timeoutId);
      map.off(eventName, handleReady);
      map.off("error", handleError);
    };

    const handleReady = () => {
      if (settled) {
        return;
      }
      settled = true;
      cleanup();
      resolve();
    };

    const handleError = (event) => {
      const error = event?.error;
      if (isFatalMapLibreSetupError(error)) {
        if (settled) {
          return;
        }
        settled = true;
        cleanup();
        reject(error instanceof Error ? error : new Error(String(error)));
      }
    };

    map.once(eventName, handleReady);
    map.on("error", handleError);
  });
}

function notifyParentReady() {
  if (window.parent && window.parent !== window) {
    window.parent.postMessage(
      {
        type: "terrain3d:ready",
      },
      window.location.origin
    );
  }
}

function ensureRuntimeSource(map, sourceId) {
  if (!map.getSource(sourceId)) {
    map.addSource(sourceId, {
      type: "geojson",
      data: createFeatureCollection(),
    });
  }
}

function setSourceData(map, sourceId, data) {
  const source = map.getSource(sourceId);
  if (source && typeof source.setData === "function") {
    source.setData(data);
  }
}

function addRuntimeLayers(map) {
  ensureRuntimeSource(map, UNIT_SOURCE_ID);
  ensureRuntimeSource(map, WEAPON_SOURCE_ID);
  ensureRuntimeSource(map, GROUND_MARKER_SOURCE_ID);

  if (!map.getLayer("terrain-runtime-ground-marker-label")) {
    map.addLayer({
      id: "terrain-runtime-ground-marker-label",
      type: "symbol",
      source: GROUND_MARKER_SOURCE_ID,
      layout: {
        "text-field": ["get", "label"],
        "text-size": ["get", "textSize"],
        "text-rotate": ["get", "rotate"],
        "text-anchor": "center",
        "text-allow-overlap": true,
        "text-ignore-placement": true,
        "text-pitch-alignment": "map",
        "text-rotation-alignment": "map",
      },
      paint: {
        "text-color": ["get", "color"],
        "text-halo-color": ["get", "haloColor"],
        "text-halo-width": 2.8,
        "text-opacity": 0.96,
      },
    });
  }

  if (!map.getLayer("terrain-runtime-unit-halo")) {
    map.addLayer({
      id: "terrain-runtime-unit-halo",
      type: "circle",
      source: UNIT_SOURCE_ID,
      paint: {
        "circle-radius": ["case", ["get", "selected"], 12, 8],
        "circle-color": ["get", "color"],
        "circle-opacity": 0.18,
        "circle-stroke-width": 1,
        "circle-stroke-color": "#ecfffb",
        "circle-stroke-opacity": 0.28,
      },
    });
  }

  if (!map.getLayer("terrain-runtime-unit-dot")) {
    map.addLayer({
      id: "terrain-runtime-unit-dot",
      type: "circle",
      source: UNIT_SOURCE_ID,
      paint: {
        "circle-radius": ["case", ["get", "selected"], 5.5, 4],
        "circle-color": ["get", "color"],
        "circle-opacity": 0.92,
        "circle-stroke-width": 1.4,
        "circle-stroke-color": "#061015",
      },
    });
  }

  if (!map.getLayer("terrain-runtime-unit-label")) {
    map.addLayer({
      id: "terrain-runtime-unit-label",
      type: "symbol",
      source: UNIT_SOURCE_ID,
      layout: {
        "text-field": ["get", "name"],
        "text-size": 12,
        "text-offset": [0, 1.15],
        "text-anchor": "top",
        "text-allow-overlap": false,
      },
      paint: {
        "text-color": "#ecfffb",
        "text-halo-color": "#061015",
        "text-halo-width": 1.4,
      },
    });
  }

  if (!map.getLayer("terrain-runtime-weapon-dot")) {
    map.addLayer({
      id: "terrain-runtime-weapon-dot",
      type: "circle",
      source: WEAPON_SOURCE_ID,
      paint: {
        "circle-radius": 4,
        "circle-color": "#ffd166",
        "circle-opacity": 0.95,
        "circle-stroke-width": 1.2,
        "circle-stroke-color": "#061015",
      },
    });
  }
}

function buildRuntimeState(map, bounds) {
  const runtimeState = {
    map,
    bounds,
    snapshot: null,
    featuresByUnitId: new Map(),
    visualOptions: {
      showWeaponTrails: true,
      showEventEffects: true,
      autoTrackImpacts: false,
      impactCameraShake: true,
    },
  };

  function applySnapshot(snapshot) {
    runtimeState.snapshot = snapshot;
    const units = Array.isArray(snapshot?.units) ? snapshot.units : [];
    const weapons = Array.isArray(snapshot?.weapons) ? snapshot.weapons : [];
    const groundMarkers = Array.isArray(snapshot?.groundMarkers)
      ? snapshot.groundMarkers
      : [];
    const unitFeatures = units
      .map((unit) => toCoordinateFeature(unit, "unit"))
      .filter(Boolean);
    const weaponFeatures = weapons
      .map((weapon) => toCoordinateFeature(weapon, "weapon"))
      .filter(Boolean);
    const groundMarkerFeatures = groundMarkers
      .map(toGroundMarkerFeature)
      .filter(Boolean);

    runtimeState.featuresByUnitId = new Map(
      unitFeatures.map((feature) => [feature.properties.id, feature])
    );
    setSourceData(
      map,
      GROUND_MARKER_SOURCE_ID,
      createFeatureCollection(groundMarkerFeatures)
    );
    setSourceData(map, UNIT_SOURCE_ID, createFeatureCollection(unitFeatures));
    setSourceData(
      map,
      WEAPON_SOURCE_ID,
      createFeatureCollection(weaponFeatures)
    );
  }

  function focusUnit(unitId) {
    const feature = runtimeState.featuresByUnitId.get(String(unitId ?? ""));
    const coordinates = feature?.geometry?.coordinates;
    if (!Array.isArray(coordinates)) {
      return;
    }

    map.easeTo({
      center: coordinates,
      zoom: Math.max(map.getZoom(), 14),
      pitch: DEFAULT_OBLIQUE_PITCH,
      bearing: map.getBearing(),
      duration: 750,
    });
  }

  function handleCommand(payload) {
    if (payload?.command === "focus-unit") {
      focusUnit(payload.unitId);
      return;
    }
    if (payload?.command === "set-visual-options" && payload.options) {
      runtimeState.visualOptions = {
        ...runtimeState.visualOptions,
        ...payload.options,
      };
    }
  }

  function handleMessage(event) {
    if (event.origin !== window.location.origin) {
      return;
    }

    if (event.data?.type === "terrain3d:runtime-snapshot") {
      applySnapshot(event.data.payload);
      return;
    }

    if (event.data?.type === "terrain3d:command") {
      handleCommand(event.data.payload);
    }
  }

  return {
    ...runtimeState,
    applySnapshot,
    focusUnit,
    handleMessage,
  };
}

function fitTerrainBounds(map, bounds, options = {}) {
  map.fitBounds(
    [
      [bounds.west, bounds.south],
      [bounds.east, bounds.north],
    ],
    {
      padding: resolveBoundsPadding(),
      pitch: options.pitch ?? DEFAULT_OBLIQUE_PITCH,
      bearing: options.bearing ?? DEFAULT_OBLIQUE_BEARING,
      duration: options.duration ?? 550,
    }
  );
}

function wireMapViewButtons(map, bounds) {
  document
    .getElementById("obliqueViewButton")
    ?.addEventListener("click", () => {
      fitTerrainBounds(map, bounds, {
        pitch: DEFAULT_OBLIQUE_PITCH,
        bearing: DEFAULT_OBLIQUE_BEARING,
      });
    });

  document.getElementById("topViewButton")?.addEventListener("click", () => {
    fitTerrainBounds(map, bounds, {
      pitch: DEFAULT_TOP_PITCH,
      bearing: DEFAULT_TOP_BEARING,
    });
  });

  document.getElementById("resetViewButton")?.addEventListener("click", () => {
    fitTerrainBounds(map, bounds, {
      pitch: DEFAULT_OBLIQUE_PITCH,
      bearing: DEFAULT_OBLIQUE_BEARING,
      duration: 0,
    });
  });
}

export function buildMapTilerTerrainStyle(apiKey) {
  const encodedKey = encodeURIComponent(String(apiKey ?? "").trim());

  return {
    version: 8,
    sources: {
      [SATELLITE_SOURCE_ID]: {
        type: "raster",
        url: `https://api.maptiler.com/tiles/satellite-v2/tiles.json?key=${encodedKey}`,
        tileSize: 512,
      },
      [TERRAIN_DEM_SOURCE_ID]: {
        type: "raster-dem",
        url: `https://api.maptiler.com/tiles/terrain-rgb/tiles.json?key=${encodedKey}`,
        tileSize: 256,
        maxzoom: 14,
      },
    },
    layers: [
      {
        id: "maptiler-satellite",
        type: "raster",
        source: SATELLITE_SOURCE_ID,
        paint: {
          "raster-saturation": -0.08,
          "raster-contrast": 0.08,
        },
      },
      {
        id: "maptiler-terrain-hillshade",
        type: "hillshade",
        source: TERRAIN_DEM_SOURCE_ID,
        paint: {
          "hillshade-shadow-color": "rgba(3, 10, 15, 0.58)",
          "hillshade-highlight-color": "rgba(255, 255, 255, 0.3)",
          "hillshade-accent-color": "rgba(127, 231, 255, 0.18)",
        },
      },
    ],
    terrain: {
      source: TERRAIN_DEM_SOURCE_ID,
      exaggeration: DEFAULT_TERRAIN_EXAGGERATION,
    },
  };
}

function resolveManifestUrl(manifest, value) {
  const text = String(value ?? "").trim();
  if (!text) {
    return "";
  }
  if (/^[a-z]+:/i.test(text) || text.startsWith("/")) {
    return text;
  }

  return new URL(text, manifest.__manifestUrl).pathname
    .replace(/%7B/gi, "{")
    .replace(/%7D/gi, "}");
}

function normalizeTileUrls(manifest, value) {
  if (Array.isArray(value)) {
    return value
      .map((entry) => resolveManifestUrl(manifest, entry))
      .filter(Boolean);
  }

  const resolved = resolveManifestUrl(manifest, value);
  return resolved ? [resolved] : [];
}

function getOfflineSource(manifest, key) {
  return manifest?.sources?.[key] ?? {};
}

function getManifestTileBounds(manifest) {
  const bounds = manifest?.bounds;
  const west = parseFiniteNumber(bounds?.west);
  const south = parseFiniteNumber(bounds?.south);
  const east = parseFiniteNumber(bounds?.east);
  const north = parseFiniteNumber(bounds?.north);

  if (west === null || south === null || east === null || north === null) {
    return null;
  }

  return [west, south, east, north];
}

function getManifestCenter(manifest) {
  const centerLongitude = parseFiniteNumber(manifest?.center?.longitude);
  const centerLatitude = parseFiniteNumber(manifest?.center?.latitude);
  if (centerLongitude !== null && centerLatitude !== null) {
    return {
      lon: centerLongitude,
      lat: centerLatitude,
    };
  }

  const bounds = manifest?.bounds;
  const west = parseFiniteNumber(bounds?.west);
  const south = parseFiniteNumber(bounds?.south);
  const east = parseFiniteNumber(bounds?.east);
  const north = parseFiniteNumber(bounds?.north);
  if (west === null || south === null || east === null || north === null) {
    return null;
  }

  return {
    lon: (west + east) / 2,
    lat: (south + north) / 2,
  };
}

function lonToTileX(lon, zoom) {
  return Math.floor(((lon + 180) / 360) * 2 ** zoom);
}

function latToTileY(lat, zoom) {
  const latRad = (lat * Math.PI) / 180;
  return Math.floor(
    ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) *
      2 ** zoom
  );
}

function getSourceZoomRange(manifest, source) {
  const minZoom = parseFiniteNumber(source?.minzoom) ?? 0;
  const maxZoom = parseFiniteNumber(source?.maxzoom) ?? minZoom;
  return {
    minZoom,
    maxZoom,
  };
}

function pickRasterProbeZoom(manifest, source) {
  const { minZoom, maxZoom } = getSourceZoomRange(manifest, source);
  const preferredZoom =
    parseFiniteNumber(manifest?.zoom?.preferred) ??
    parseFiniteNumber(manifest?.zoom?.min) ??
    minZoom;

  return Math.max(minZoom, Math.min(maxZoom, Math.round(preferredZoom)));
}

function formatProbeTileUrl(tileUrl, manifest, source, zoomOverride = null) {
  const center = getManifestCenter(manifest);
  if (!center) {
    return "";
  }

  const zoom =
    parseFiniteNumber(zoomOverride) ?? pickRasterProbeZoom(manifest, source);
  const x = lonToTileX(center.lon, zoom);
  const y = latToTileY(center.lat, zoom);

  return tileUrl
    .replace(/\{z\}/g, String(zoom))
    .replace(/\{x\}/g, String(x))
    .replace(/\{y\}/g, String(y));
}

function isUsableRasterContentType(contentType) {
  const normalized = String(contentType ?? "").toLowerCase();
  return (
    normalized.startsWith("image/jpeg") ||
    normalized.startsWith("image/jpg") ||
    normalized.startsWith("image/png") ||
    normalized.startsWith("image/webp")
  );
}

async function findUsableOfflineTileMaxZoom(manifest, key, fetchImpl = fetch) {
  const source = getOfflineSource(manifest, key);
  if (source.enabled === false) {
    return null;
  }

  const tiles = normalizeTileUrls(manifest, source.tiles);
  if (tiles.length === 0 || typeof fetchImpl !== "function") {
    return null;
  }

  const { minZoom, maxZoom } = getSourceZoomRange(manifest, source);
  for (let zoom = maxZoom; zoom >= minZoom; zoom -= 1) {
    const probeUrl = formatProbeTileUrl(tiles[0], manifest, source, zoom);
    if (!probeUrl) {
      continue;
    }

    try {
      const response = await fetchImpl(probeUrl, {
        cache: "no-store",
      });
      if (
        response?.ok === true &&
        isUsableRasterContentType(response.headers?.get?.("content-type"))
      ) {
        return zoom;
      }
    } catch (error) {
      console.warn("Offline tile zoom probe failed.", {
        source: key,
        zoom,
        error,
      });
    }
  }

  return null;
}

function updateOfflineTileSource(manifest, key, updates) {
  return {
    ...manifest,
    sources: {
      ...manifest.sources,
      [key]: {
        ...getOfflineSource(manifest, key),
        ...updates,
      },
    },
  };
}

export async function prepareOfflineTerrainManifestForRuntime(
  manifest,
  options = {}
) {
  if (!manifest) {
    return null;
  }

  let runtimeManifest = manifest;
  const fetchImpl = options.fetchImpl ?? fetch;
  if (options.disableRasterImagery === true) {
    for (const key of ["base", "satellite"]) {
      runtimeManifest = updateOfflineTileSource(runtimeManifest, key, {
        enabled: false,
        runtimeStatus: "disabled-for-dem-runtime",
      });
    }
  } else {
    for (const key of ["base", "satellite"]) {
      const source = getOfflineSource(runtimeManifest, key);
      const tiles = normalizeTileUrls(runtimeManifest, source.tiles);
      if (source.enabled === false || tiles.length === 0) {
        continue;
      }

      const maxUsableZoom = await findUsableOfflineTileMaxZoom(
        runtimeManifest,
        key,
        fetchImpl
      );
      if (maxUsableZoom === null) {
        runtimeManifest = updateOfflineTileSource(runtimeManifest, key, {
          enabled: false,
          runtimeStatus: "disabled-missing-raster",
        });
        continue;
      }

      if (
        maxUsableZoom < (parseFiniteNumber(source.maxzoom) ?? maxUsableZoom)
      ) {
        runtimeManifest = updateOfflineTileSource(runtimeManifest, key, {
          maxzoom: maxUsableZoom,
          runtimeStatus: "clamped-missing-high-zoom",
        });
      }
    }
  }

  const terrainSource = getOfflineSource(runtimeManifest, "terrainDem");
  if (normalizeTileUrls(runtimeManifest, terrainSource.tiles).length > 0) {
    const maxUsableTerrainZoom = await findUsableOfflineTileMaxZoom(
      runtimeManifest,
      "terrainDem",
      fetchImpl
    );
    if (maxUsableTerrainZoom !== null) {
      runtimeManifest = updateOfflineTileSource(runtimeManifest, "terrainDem", {
        maxzoom: maxUsableTerrainZoom,
        runtimeStatus:
          maxUsableTerrainZoom <
          (parseFiniteNumber(terrainSource.maxzoom) ?? maxUsableTerrainZoom)
            ? "clamped-missing-high-zoom"
            : terrainSource.runtimeStatus,
      });
    }
  }

  return runtimeManifest;
}

function addOptionalGeoJsonSource(style, manifest, sourceId, sourceConfig) {
  const dataUrl = resolveManifestUrl(manifest, sourceConfig?.data);
  if (!dataUrl) {
    return false;
  }

  style.sources[sourceId] = {
    type: "geojson",
    data: dataUrl,
  };
  return true;
}

export async function loadOfflineTerrainManifest(manifestUrl) {
  const url = String(manifestUrl ?? "").trim();
  if (!url) {
    return null;
  }

  const response = await fetch(url, {
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(`Offline terrain manifest failed to load: ${url}`);
  }

  const manifest = await response.json();
  return {
    ...manifest,
    __manifestUrl: new URL(url, window.location.href).toString(),
  };
}

export function buildOfflineTerrainStyle(manifest) {
  const baseSource = getOfflineSource(manifest, "base");
  const satelliteSource = getOfflineSource(manifest, "satellite");
  const terrainSource = getOfflineSource(manifest, "terrainDem");
  const baseTiles =
    baseSource.enabled === false
      ? []
      : normalizeTileUrls(manifest, baseSource.tiles);
  const satelliteTiles =
    satelliteSource.enabled === false
      ? []
      : normalizeTileUrls(manifest, satelliteSource.tiles);
  const terrainTiles = normalizeTileUrls(manifest, terrainSource.tiles);
  const tileBounds = getManifestTileBounds(manifest);
  const style = {
    version: 8,
    sources: {},
    layers: [
      {
        id: "offline-background",
        type: "background",
        paint: {
          "background-color": "#071118",
        },
      },
    ],
  };

  if (baseTiles.length > 0) {
    style.sources[OFFLINE_BASE_SOURCE_ID] = {
      type: "raster",
      tiles: baseTiles,
      tileSize: baseSource.tileSize ?? 256,
      minzoom: baseSource.minzoom ?? 6,
      maxzoom: baseSource.maxzoom ?? 15,
      bounds: tileBounds ?? undefined,
    };
    style.layers.push({
      id: "offline-basemap",
      type: "raster",
      source: OFFLINE_BASE_SOURCE_ID,
      paint: {
        "raster-saturation": -0.18,
        "raster-contrast": 0.08,
        "raster-brightness-min": 0.08,
      },
    });
  }

  if (satelliteTiles.length > 0) {
    style.sources[SATELLITE_SOURCE_ID] = {
      type: "raster",
      tiles: satelliteTiles,
      tileSize: satelliteSource.tileSize ?? 256,
      minzoom: satelliteSource.minzoom ?? 6,
      maxzoom: satelliteSource.maxzoom ?? 16,
      bounds: tileBounds ?? undefined,
    };
    style.layers.push({
      id: "offline-satellite",
      type: "raster",
      source: SATELLITE_SOURCE_ID,
      paint: {
        "raster-saturation": -0.1,
        "raster-contrast": 0.08,
      },
    });
  }

  if (terrainTiles.length > 0) {
    style.sources[TERRAIN_DEM_SOURCE_ID] = {
      type: "raster-dem",
      tiles: terrainTiles,
      tileSize: terrainSource.tileSize ?? 256,
      minzoom: terrainSource.minzoom ?? 6,
      maxzoom: terrainSource.maxzoom ?? 13,
      encoding: terrainSource.encoding ?? "terrarium",
      bounds: tileBounds ?? undefined,
    };
    style.layers.push({
      id: "offline-terrain-hillshade",
      type: "hillshade",
      source: TERRAIN_DEM_SOURCE_ID,
      paint: {
        "hillshade-shadow-color": "rgba(3, 10, 15, 0.68)",
        "hillshade-highlight-color": "rgba(255, 255, 255, 0.3)",
        "hillshade-accent-color": "rgba(127, 231, 255, 0.16)",
      },
    });
    style.terrain = {
      source: TERRAIN_DEM_SOURCE_ID,
      exaggeration:
        Number(manifest?.terrain?.exaggeration) || DEFAULT_TERRAIN_EXAGGERATION,
    };
  }

  if (
    addOptionalGeoJsonSource(
      style,
      manifest,
      OFFLINE_AOI_SOURCE_ID,
      manifest?.intel?.aoi
    )
  ) {
    style.layers.push(
      {
        id: "offline-aoi-outline",
        type: "line",
        source: OFFLINE_AOI_SOURCE_ID,
        paint: {
          "line-color": "#7fe7ff",
          "line-opacity": 0.64,
          "line-width": 2,
        },
      },
      {
        id: "offline-aoi-point",
        type: "circle",
        source: OFFLINE_AOI_SOURCE_ID,
        paint: {
          "circle-radius": 7,
          "circle-color": "#ff4d3d",
          "circle-stroke-color": "#fff1e8",
          "circle-stroke-width": 2,
        },
      }
    );
  }

  if (
    addOptionalGeoJsonSource(
      style,
      manifest,
      OFFLINE_WATER_SOURCE_ID,
      manifest?.intel?.water
    )
  ) {
    style.layers.push({
      id: "offline-water",
      type: "fill",
      source: OFFLINE_WATER_SOURCE_ID,
      paint: {
        "fill-color": "#174255",
        "fill-opacity": 0.62,
      },
    });
  }

  if (
    addOptionalGeoJsonSource(
      style,
      manifest,
      OFFLINE_ROAD_SOURCE_ID,
      manifest?.intel?.roads
    )
  ) {
    style.layers.push({
      id: "offline-roads",
      type: "line",
      source: OFFLINE_ROAD_SOURCE_ID,
      paint: {
        "line-color": "#d7c58b",
        "line-opacity": 0.74,
        "line-width": ["interpolate", ["linear"], ["zoom"], 9, 0.7, 14, 3.2],
      },
    });
  }

  if (
    addOptionalGeoJsonSource(
      style,
      manifest,
      OFFLINE_BUILDING_SOURCE_ID,
      manifest?.intel?.buildings
    )
  ) {
    style.layers.push({
      id: "offline-buildings",
      type: "fill-extrusion",
      source: OFFLINE_BUILDING_SOURCE_ID,
      minzoom: 12,
      paint: {
        "fill-extrusion-color": "#77848e",
        "fill-extrusion-opacity": 0.64,
        "fill-extrusion-height": [
          "coalesce",
          ["to-number", ["get", "height"]],
          10,
        ],
        "fill-extrusion-base": 0,
      },
    });
  }

  return style;
}

function canUseOfflineTerrainPlanA({ mapLibre, offlineMapManifest }) {
  return Boolean(
    mapLibre?.Map && offlineMapManifest && typeof mapLibre.Map === "function"
  );
}

export function canUseMapTilerTerrainPlanA({
  mapLibre,
  mapTilerApiKey,
  offlineMapManifest,
}) {
  return Boolean(
    mapLibre?.Map &&
      (String(mapTilerApiKey ?? "").trim() ||
        canUseOfflineTerrainPlanA({ mapLibre, offlineMapManifest })) &&
      typeof mapLibre.Map === "function"
  );
}

export async function initializeMapTilerTerrainPlanA({
  mapLibre,
  container,
  bounds,
  mapTilerApiKey,
  offlineMapManifestUrl,
  setLoadingState = () => {},
  hideLoadingOverlay = () => {},
  setStatusMessage = () => {},
  setProviderBadge = () => {},
  setPlacementBadge = () => {},
  wirePanelControls = () => {},
}) {
  if (!container) {
    throw new Error("MapLibre container not found.");
  }
  const offlineMapManifest = await loadOfflineTerrainManifest(
    offlineMapManifestUrl
  );
  const runtimeOfflineMapManifest =
    await prepareOfflineTerrainManifestForRuntime(offlineMapManifest);
  const resolvedMapLibre = await resolveMapLibreRuntime(mapLibre, {
    offlineOnly: Boolean(offlineMapManifest),
    scriptUrls: offlineMapManifest?.maplibre?.script
      ? [
          resolveManifestUrl(
            offlineMapManifest,
            offlineMapManifest.maplibre.script
          ),
        ]
      : undefined,
    styleUrls: offlineMapManifest?.maplibre?.stylesheet
      ? [
          resolveManifestUrl(
            offlineMapManifest,
            offlineMapManifest.maplibre.stylesheet
          ),
        ]
      : undefined,
  });
  if (
    !canUseMapTilerTerrainPlanA({
      mapLibre: resolvedMapLibre,
      mapTilerApiKey,
      offlineMapManifest: runtimeOfflineMapManifest,
    })
  ) {
    throw new Error("MapLibre terrain runtime is not available.");
  }

  const offlineMode = canUseOfflineTerrainPlanA({
    mapLibre: resolvedMapLibre,
    offlineMapManifest: runtimeOfflineMapManifest,
  });
  const terrainExaggeration = offlineMode
    ? Number(runtimeOfflineMapManifest?.terrain?.exaggeration) ||
      DEFAULT_TERRAIN_EXAGGERATION
    : DEFAULT_TERRAIN_EXAGGERATION;

  setLoadingState(
    offlineMode ? "오프라인 3D 지형 준비 중" : "MapTiler 3D 지형 준비 중",
    offlineMode
      ? "로컬 DEM과 작전지역 레이어를 연결합니다."
      : "Terrain RGB DEM으로 선택 범위를 먼저 렌더링합니다."
  );
  container.hidden = false;
  container.classList.add("is-active");

  const center = resolveCenter(bounds);
  const map = new resolvedMapLibre.Map({
    container,
    style: offlineMode
      ? buildOfflineTerrainStyle(runtimeOfflineMapManifest)
      : buildMapTilerTerrainStyle(mapTilerApiKey),
    center: [center.lon, center.lat],
    zoom: resolveInitialZoom(bounds),
    pitch: DEFAULT_OBLIQUE_PITCH,
    bearing: DEFAULT_OBLIQUE_BEARING,
    hash: false,
    attributionControl: true,
    antialias: true,
  });

  try {
    if (typeof resolvedMapLibre.NavigationControl === "function") {
      map.addControl(
        new resolvedMapLibre.NavigationControl({
          visualizePitch: true,
        }),
        "bottom-right"
      );
    }

    await waitForMapEvent(map, "load");
    if (
      map.getSource(TERRAIN_DEM_SOURCE_ID) &&
      typeof map.setTerrain === "function"
    ) {
      map.setTerrain({
        source: TERRAIN_DEM_SOURCE_ID,
        exaggeration: terrainExaggeration,
      });
    }
  } catch (error) {
    container.hidden = true;
    container.classList.remove("is-active");
    map.remove();
    throw error;
  }

  addRuntimeLayers(map);
  fitTerrainBounds(map, bounds, {
    duration: 0,
  });
  wireMapViewButtons(map, bounds);
  wirePanelControls();

  const runtimeState = buildRuntimeState(map, bounds);
  window.addEventListener("message", runtimeState.handleMessage);
  window.__terrain3dViewer__ = map;
  window.__terrain3dMapLibreRuntime__ = runtimeState;
  setProviderBadge(
    offlineMode ? "Offline MapLibre DEM" : "MapTiler Terrain RGB"
  );
  setPlacementBadge(offlineMode ? "로컬 DEM" : "MapTiler DEM");
  setStatusMessage(
    offlineMode
      ? `${runtimeOfflineMapManifest?.label ?? "오프라인 AOI"} 로컬 지형 패키지로 선택 bbox를 렌더링합니다.`
      : "MapTiler Terrain RGB DEM으로 선택 bbox를 렌더링합니다."
  );
  hideLoadingOverlay();
  notifyParentReady();

  return {
    map,
    runtimeState,
    dispose() {
      window.removeEventListener("message", runtimeState.handleMessage);
      map.remove();
    },
  };
}
