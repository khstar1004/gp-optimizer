function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function toRadians(degrees) {
  return (degrees * Math.PI) / 180;
}

const DEFAULT_PRESET = {
  targetSize: 4.6,
  cameraVector: [5.2, 3.1, 7.6],
  focusHeight: 0.52,
  rotationY: Math.PI * 0.18,
  padding: 1.12,
  minDistanceFactor: 0.52,
  maxDistanceFactor: 2.45,
};

const DETAIL_PRESETS = {
  drone: {
    targetSize: 3.4,
    cameraVector: [3.8, 2.5, 4.5],
    focusHeight: 0.52,
    rotationY: Math.PI * 0.16,
    padding: 1.1,
    minDistanceFactor: 0.5,
    maxDistanceFactor: 2.35,
  },
  tank: {
    targetSize: 4.9,
    cameraVector: [5.8, 3.2, 7.1],
    focusHeight: 0.56,
    rotationY: Math.PI * 0.12,
    padding: 1.12,
    minDistanceFactor: 0.52,
    maxDistanceFactor: 2.45,
  },
  artillery: {
    targetSize: 5.2,
    cameraVector: [5.6, 3.25, 7.3],
    focusHeight: 0.48,
    rotationY: Math.PI * 0.16,
    padding: 1.16,
    minDistanceFactor: 0.5,
    maxDistanceFactor: 2.5,
  },
  ship: {
    targetSize: 6.6,
    cameraVector: [7.6, 3.8, 9.8],
    focusHeight: 0.42,
    rotationY: Math.PI * 0.12,
    padding: 1.14,
    minDistanceFactor: 0.52,
    maxDistanceFactor: 2.55,
  },
};

const PROFILE_PRESETS = {
  ground: {
    targetSize: 5.2,
    cameraVector: [7.4, 4.3, 9.1],
    focusHeight: 0.56,
    rotationY: Math.PI * 0.12,
    padding: 1.2,
    minDistanceFactor: 0.52,
    maxDistanceFactor: 2.55,
  },
  fires: {
    targetSize: 5.6,
    cameraVector: [8.2, 4.9, 10.2],
    focusHeight: 0.48,
    rotationY: Math.PI * 0.16,
    padding: 1.28,
    minDistanceFactor: 0.5,
    maxDistanceFactor: 2.7,
  },
  defense: {
    targetSize: 5.5,
    cameraVector: [8.8, 5.2, 10.7],
    focusHeight: 0.58,
    rotationY: Math.PI * 0.14,
    padding: 1.28,
    minDistanceFactor: 0.52,
    maxDistanceFactor: 2.7,
  },
  maritime: {
    targetSize: 6.9,
    cameraVector: [9.8, 4.9, 12.5],
    focusHeight: 0.42,
    rotationY: Math.PI * 0.1,
    padding: 1.24,
    minDistanceFactor: 0.52,
    maxDistanceFactor: 2.75,
  },
  base: {
    targetSize: 5.3,
    cameraVector: [8.4, 4.7, 10.8],
    focusHeight: 0.58,
    rotationY: Math.PI * 0.16,
    padding: 1.3,
    minDistanceFactor: 0.52,
    maxDistanceFactor: 2.75,
  },
};

const DEFAULT_MODEL_ROTATION = [0, 0, 0];
const DEFAULT_MODEL_OFFSET = [0, 0, 0];

const MODEL_PRESET_OVERRIDES = {
  "tank-k2": {
    targetSizeMultiplier: 1.12,
    paddingMultiplier: 1.1,
    focusHeight: 0.46,
    cameraVector: [8.4, 3.9, 9.6],
    exposureMultiplier: 1.04,
    keyLightMultiplier: 1.08,
  },
  "tank-k21": {
    targetSizeMultiplier: 1.04,
    paddingMultiplier: 1.08,
    focusHeight: 0.5,
    cameraVector: [7.9, 4.1, 9.2],
  },
  "tank-stryker": {
    targetSizeMultiplier: 1.02,
    paddingMultiplier: 1.06,
    focusHeight: 0.48,
    cameraVector: [7.7, 4.1, 9.4],
  },
  "artillery-k9": {
    targetSizeMultiplier: 1.08,
    paddingMultiplier: 1.18,
    focusHeight: 0.42,
    rotationYOffset: Math.PI * 0.04,
    cameraVector: [9.6, 3.8, 10.9],
    exposureMultiplier: 1.08,
    ambientLightMultiplier: 1.06,
    keyLightMultiplier: 1.12,
    rimLightMultiplier: 1.22,
  },
  "artillery-k9-variant": {
    targetSizeMultiplier: 1.08,
    paddingMultiplier: 1.18,
    focusHeight: 0.42,
    rotationYOffset: Math.PI * 0.04,
    cameraVector: [9.6, 3.8, 10.9],
    exposureMultiplier: 1.08,
    ambientLightMultiplier: 1.06,
    keyLightMultiplier: 1.12,
    rimLightMultiplier: 1.22,
  },
  "artillery-nasams-battery": {
    targetSizeMultiplier: 1.16,
    paddingMultiplier: 1.22,
    focusHeight: 0.46,
    cameraVector: [10.2, 4.7, 11.4],
    exposureMultiplier: 1.05,
    ambientLightMultiplier: 1.04,
    keyLightMultiplier: 1.1,
  },
  "ship-yi-sun-shin": {
    targetSizeMultiplier: 1.12,
    paddingMultiplier: 1.12,
    focusHeight: 0.38,
    cameraVector: [10.6, 4.8, 13.3],
  },
  "ship-tanker": {
    targetSizeMultiplier: 1.18,
    paddingMultiplier: 1.18,
    focusHeight: 0.36,
    cameraVector: [11.1, 4.6, 13.9],
  },
};

export function getModelRotationOffset(modelId = "") {
  return modelId === "aircraft-kf21" ? Math.PI : 0;
}

export function getViewFramingPreset({ bundle, profile, mode, modelId = "" }) {
  const basePreset =
    (profile && PROFILE_PRESETS[profile]) ||
    DETAIL_PRESETS[bundle] ||
    DEFAULT_PRESET;
  const modePadding = mode === "immersive" ? 1.04 : 1;
  const modelOverride = MODEL_PRESET_OVERRIDES[modelId] ?? null;

  return {
    ...basePreset,
    padding:
      basePreset.padding *
      modePadding *
      (modelOverride?.paddingMultiplier ?? 1),
    targetSize:
      basePreset.targetSize * (modelOverride?.targetSizeMultiplier ?? 1),
    focusHeight: modelOverride?.focusHeight ?? basePreset.focusHeight,
    rotationY: basePreset.rotationY + (modelOverride?.rotationYOffset ?? 0),
    cameraVector: modelOverride?.cameraVector ?? basePreset.cameraVector,
    modelRotation: modelOverride?.modelRotation ?? DEFAULT_MODEL_ROTATION,
    modelOffset: modelOverride?.modelOffset ?? DEFAULT_MODEL_OFFSET,
    exposureMultiplier: modelOverride?.exposureMultiplier ?? 1,
    ambientLightMultiplier: modelOverride?.ambientLightMultiplier ?? 1,
    keyLightMultiplier: modelOverride?.keyLightMultiplier ?? 1,
    rimLightMultiplier: modelOverride?.rimLightMultiplier ?? 1,
  };
}

export function computeUniformScale(maxAxis, targetSize) {
  if (
    !Number.isFinite(maxAxis) ||
    maxAxis <= 0 ||
    !Number.isFinite(targetSize) ||
    targetSize <= 0
  ) {
    return 1;
  }

  return clamp(targetSize / maxAxis, 0.04, 16);
}

export function computeFocusTarget(bounds, focusHeight = 0.52) {
  const safeFocusHeight = clamp(focusHeight, 0.2, 0.82);
  const width = Math.max(0, bounds.maxX - bounds.minX);
  const height = Math.max(0, bounds.maxY - bounds.minY);
  const depth = Math.max(0, bounds.maxZ - bounds.minZ);

  return {
    x: bounds.minX + width * 0.5,
    y: bounds.minY + height * safeFocusHeight,
    z: bounds.minZ + depth * 0.5,
  };
}

export function normalizeVector(vector) {
  const [x = 0, y = 0, z = 0] = Array.isArray(vector) ? vector : [];
  const length = Math.hypot(x, y, z) || 1;

  return [x / length, y / length, z / length];
}

export function computeFitDistance({
  radius,
  fovDegrees,
  aspect,
  padding = 1.12,
}) {
  const safeRadius = Math.max(0.001, Number.isFinite(radius) ? radius : 0);
  const safeAspect = clamp(Number.isFinite(aspect) ? aspect : 1, 0.35, 4);
  const verticalFov = clamp(
    toRadians(Number.isFinite(fovDegrees) ? fovDegrees : 42),
    toRadians(12),
    toRadians(110)
  );
  const horizontalFov = 2 * Math.atan(Math.tan(verticalFov * 0.5) * safeAspect);
  const fitFov = Math.max(toRadians(12), Math.min(verticalFov, horizontalFov));

  return (
    (safeRadius / Math.sin(fitFov * 0.5)) *
    Math.max(1.02, Number.isFinite(padding) ? padding : 1.12)
  );
}

export function computeCameraPosition({ target, direction, distance }) {
  const [dirX, dirY, dirZ] = normalizeVector(direction);

  return {
    x: target.x + dirX * distance,
    y: target.y + dirY * distance,
    z: target.z + dirZ * distance,
  };
}

export function computeOrbitDistances({
  distance,
  radius,
  minDistanceFactor = 0.52,
  maxDistanceFactor = 2.45,
}) {
  const safeDistance = Math.max(
    0.001,
    Number.isFinite(distance) ? distance : 0
  );
  const safeRadius = Math.max(0.001, Number.isFinite(radius) ? radius : 0);

  return {
    minDistance: Math.max(
      safeRadius * 0.82,
      safeDistance * Math.max(0.28, minDistanceFactor)
    ),
    maxDistance: Math.max(
      safeRadius * 3.4,
      safeDistance * Math.max(1.6, maxDistanceFactor)
    ),
  };
}
