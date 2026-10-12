// @ts-nocheck
const DEFAULT_MAXIMUM_SCREEN_SPACE_ERROR = 6;
const DEFAULT_CACHE_BYTES = 192 * 1024 * 1024;
const DEFAULT_CACHE_OVERFLOW_BYTES = 96 * 1024 * 1024;

function isObject(value) {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function parseFiniteNumber(value) {
  const parsed = Number(value ?? Number.NaN);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseBoolean(value, fallback = true) {
  if (typeof value === "boolean") {
    return value;
  }

  const text = String(value ?? "")
    .trim()
    .toLowerCase();
  if (["1", "true", "yes", "on"].includes(text)) {
    return true;
  }
  if (["0", "false", "no", "off"].includes(text)) {
    return false;
  }
  return fallback;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function decodeTemplateBraces(value) {
  return String(value ?? "")
    .replace(/%7B/gi, "{")
    .replace(/%7D/gi, "}");
}

function normalizeTilesetRecord(entry, index) {
  if (typeof entry === "string") {
    return {
      id: `offline-tileset-${index + 1}`,
      label: `로컬 3D Tiles ${index + 1}`,
      url: entry,
      enabled: true,
    };
  }

  if (!isObject(entry)) {
    return null;
  }

  const id = String(entry.id ?? entry.name ?? `offline-tileset-${index + 1}`)
    .trim()
    .replace(/[^a-z0-9_-]/gi, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  return {
    ...entry,
    id: id || `offline-tileset-${index + 1}`,
    label: String(
      entry.label ?? entry.title ?? entry.name ?? `로컬 3D Tiles ${index + 1}`
    ).trim(),
    url: String(
      entry.url ?? entry.tilesetUrl ?? entry.data ?? entry.href ?? ""
    ).trim(),
    enabled: parseBoolean(entry.enabled, true),
    show: parseBoolean(entry.show, true),
  };
}

function pushTilesetCandidate(candidates, entry) {
  if (Array.isArray(entry)) {
    entry.forEach((item) => pushTilesetCandidate(candidates, item));
    return;
  }

  if (entry === undefined || entry === null || entry === "") {
    return;
  }

  candidates.push(entry);
}

export function normalizeOfflineTilesetEntries(manifest) {
  const candidates = [];
  const cesiumConfig = manifest?.cesium;

  pushTilesetCandidate(candidates, cesiumConfig?.tilesets);
  pushTilesetCandidate(candidates, cesiumConfig?.tileset);
  pushTilesetCandidate(candidates, cesiumConfig?.tilesetUrl);
  pushTilesetCandidate(candidates, manifest?.tilesets);

  return candidates
    .map((entry, index) => normalizeTilesetRecord(entry, index))
    .filter(Boolean);
}

export function resolveOfflineManifestAssetUrl(manifest, value) {
  const text = String(value ?? "").trim();
  if (!text) {
    return "";
  }

  if (/^(?:https?:|data:|blob:)/i.test(text)) {
    return decodeTemplateBraces(text);
  }

  try {
    const fallbackBase =
      typeof window !== "undefined"
        ? window.location.href
        : "http://localhost/";
    const assetUrl = new URL(text, manifest?.__manifestUrl ?? fallbackBase);
    return decodeTemplateBraces(
      `${assetUrl.pathname}${assetUrl.search}${assetUrl.hash}`
    );
  } catch {
    return decodeTemplateBraces(text);
  }
}

export function buildOfflineTilesetLoadPlan(manifest) {
  return normalizeOfflineTilesetEntries(manifest)
    .filter((entry) => entry.enabled !== false)
    .map((entry) => {
      const url = resolveOfflineManifestAssetUrl(manifest, entry.url);
      if (!url) {
        return null;
      }

      const opacity = parseFiniteNumber(entry.opacity);
      const maximumScreenSpaceError = parseFiniteNumber(
        entry.maximumScreenSpaceError
      );
      const cacheBytes = parseFiniteNumber(entry.cacheBytes);
      const maximumCacheOverflowBytes = parseFiniteNumber(
        entry.maximumCacheOverflowBytes
      );

      return {
        id: entry.id,
        label: entry.label || entry.id,
        url,
        show: entry.show !== false,
        color: String(entry.color ?? "#9bc7bb").trim() || "#9bc7bb",
        opacity:
          opacity === null
            ? undefined
            : clamp(Number(opacity.toFixed(2)), 0.05, 1),
        maximumScreenSpaceError:
          maximumScreenSpaceError === null
            ? DEFAULT_MAXIMUM_SCREEN_SPACE_ERROR
            : clamp(maximumScreenSpaceError, 1, 64),
        dynamicScreenSpaceError: parseBoolean(
          entry.dynamicScreenSpaceError,
          false
        ),
        skipLevelOfDetail: parseBoolean(entry.skipLevelOfDetail, false),
        preferLeaves: parseBoolean(entry.preferLeaves, true),
        cacheBytes:
          cacheBytes === null
            ? DEFAULT_CACHE_BYTES
            : Math.max(16 * 1024 * 1024, Math.floor(cacheBytes)),
        maximumCacheOverflowBytes:
          maximumCacheOverflowBytes === null
            ? DEFAULT_CACHE_OVERFLOW_BYTES
            : Math.max(8 * 1024 * 1024, Math.floor(maximumCacheOverflowBytes)),
        classificationHint: String(entry.classificationHint ?? "").trim(),
        source: String(entry.source ?? "").trim(),
      };
    })
    .filter(Boolean);
}
