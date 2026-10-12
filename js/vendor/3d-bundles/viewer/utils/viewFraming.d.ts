export interface ViewFramingBounds {
  minX: number;
  minY: number;
  minZ: number;
  maxX: number;
  maxY: number;
  maxZ: number;
}

export interface ViewFramingPresetInput {
  bundle: string;
  profile: string;
  mode: string;
  modelId?: string;
}

export interface ViewFramingPreset {
  targetSize: number;
  cameraVector: [number, number, number];
  focusHeight: number;
  rotationY: number;
  padding: number;
  minDistanceFactor: number;
  maxDistanceFactor: number;
  modelRotation: [number, number, number];
  modelOffset: [number, number, number];
  exposureMultiplier: number;
  ambientLightMultiplier: number;
  keyLightMultiplier: number;
  rimLightMultiplier: number;
}

export interface FitDistanceInput {
  radius: number;
  fovDegrees: number;
  aspect: number;
  padding?: number;
}

export interface CameraPositionInput {
  target: { x: number; y: number; z: number };
  direction: [number, number, number] | number[];
  distance: number;
}

export interface OrbitDistancesInput {
  distance: number;
  radius: number;
  minDistanceFactor?: number;
  maxDistanceFactor?: number;
}

export function getModelRotationOffset(modelId?: string): number;
export function getViewFramingPreset(
  input: ViewFramingPresetInput
): ViewFramingPreset;
export function computeUniformScale(
  maxAxis: number,
  targetSize: number
): number;
export function computeFocusTarget(
  bounds: ViewFramingBounds,
  focusHeight?: number
): { x: number; y: number; z: number };
export function normalizeVector(
  vector: [number, number, number] | number[]
): [number, number, number];
export function computeFitDistance(input: FitDistanceInput): number;
export function computeCameraPosition(input: CameraPositionInput): {
  x: number;
  y: number;
  z: number;
};
export function computeOrbitDistances(input: OrbitDistancesInput): {
  minDistance: number;
  maxDistance: number;
};
