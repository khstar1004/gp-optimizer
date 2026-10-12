import type { SudoDetectionBox } from "./sudoScenarios";

export interface SudoImageLikeData {
  data: Uint8ClampedArray;
  width: number;
  height: number;
}

export interface SudoDetectionKeyframe {
  timeRatio: number;
  x: number;
  y: number;
  width: number;
  height: number;
  confidence?: number;
}

export interface SudoDetectionTrack {
  label: string;
  color: string;
  confidence: number;
  keyframes: SudoDetectionKeyframe[];
}

export const sudoDroneLauncherDetectionTracks: SudoDetectionTrack[] = [
  {
    label: "M-1991 240mm TEL",
    color: "#ffb547",
    confidence: 0.998,
    keyframes: [
      { timeRatio: 0, x: 36.5, y: 27.5, width: 40.5, height: 36.5 },
      { timeRatio: 0.24, x: 38.2, y: 25.8, width: 39.5, height: 35.2 },
      { timeRatio: 0.5, x: 40.4, y: 24.8, width: 38.2, height: 34.4 },
      { timeRatio: 0.76, x: 38.8, y: 26.4, width: 39.4, height: 35.4 },
      { timeRatio: 1, x: 36.5, y: 27.5, width: 40.5, height: 36.5 },
    ],
  },
  {
    label: "발사관 22연장",
    color: "#38d7ff",
    confidence: 0.941,
    keyframes: [
      { timeRatio: 0, x: 55.4, y: 27.2, width: 25.8, height: 15.8 },
      { timeRatio: 0.24, x: 56.2, y: 25.8, width: 25.4, height: 15.4 },
      { timeRatio: 0.5, x: 57.6, y: 25.0, width: 24.6, height: 15.0 },
      { timeRatio: 0.76, x: 56.4, y: 26.0, width: 25.2, height: 15.5 },
      { timeRatio: 1, x: 55.4, y: 27.2, width: 25.8, height: 15.8 },
    ],
  },
  {
    label: "차량 차체",
    color: "#67f29b",
    confidence: 0.918,
    keyframes: [
      { timeRatio: 0, x: 36.8, y: 43.4, width: 38.2, height: 20.2 },
      { timeRatio: 0.24, x: 38.5, y: 41.6, width: 37.4, height: 19.8 },
      { timeRatio: 0.5, x: 40.6, y: 40.8, width: 36.2, height: 19.4 },
      { timeRatio: 0.76, x: 39.2, y: 42.2, width: 37.2, height: 19.8 },
      { timeRatio: 1, x: 36.8, y: 43.4, width: 38.2, height: 20.2 },
    ],
  },
];

function clampPercent(value: number) {
  return Math.max(0, Math.min(100, value));
}

function lerp(start: number, end: number, ratio: number) {
  return start + (end - start) * ratio;
}

function normalizePlaybackRatio(currentTime: number, duration: number) {
  const fallbackDuration = 12;
  const safeDuration =
    Number.isFinite(duration) && duration > 0.05 ? duration : fallbackDuration;
  const wrappedTime =
    (((Number.isFinite(currentTime) ? currentTime : 0) % safeDuration) +
      safeDuration) %
    safeDuration;

  return wrappedTime / safeDuration;
}

function interpolateKeyframe(
  start: SudoDetectionKeyframe,
  end: SudoDetectionKeyframe,
  ratio: number
): SudoDetectionKeyframe {
  return {
    timeRatio: lerp(start.timeRatio, end.timeRatio, ratio),
    x: lerp(start.x, end.x, ratio),
    y: lerp(start.y, end.y, ratio),
    width: lerp(start.width, end.width, ratio),
    height: lerp(start.height, end.height, ratio),
    confidence:
      start.confidence !== undefined || end.confidence !== undefined
        ? lerp(start.confidence ?? 0, end.confidence ?? 0, ratio)
        : undefined,
  };
}

export function interpolateSudoDetectionTrack(
  track: SudoDetectionTrack,
  playbackRatio: number
): SudoDetectionBox | undefined {
  if (track.keyframes.length === 0) {
    return undefined;
  }

  const sortedKeyframes = [...track.keyframes].sort(
    (left, right) => left.timeRatio - right.timeRatio
  );
  const ratio = Math.max(0, Math.min(1, playbackRatio));
  const nextIndex = sortedKeyframes.findIndex(
    (keyframe) => keyframe.timeRatio >= ratio
  );
  const end =
    nextIndex >= 0
      ? sortedKeyframes[nextIndex]
      : sortedKeyframes[sortedKeyframes.length - 1];
  const start =
    nextIndex > 0 ? sortedKeyframes[nextIndex - 1] : sortedKeyframes[0];
  const span = Math.max(0.0001, end.timeRatio - start.timeRatio);
  const localRatio = Math.max(0, Math.min(1, (ratio - start.timeRatio) / span));
  const keyframe = interpolateKeyframe(start, end, localRatio);
  const x = clampPercent(keyframe.x);
  const y = clampPercent(keyframe.y);

  return {
    label: track.label,
    confidence: keyframe.confidence ?? track.confidence,
    x,
    y,
    width: Math.max(1, Math.min(keyframe.width, 100 - x)),
    height: Math.max(1, Math.min(keyframe.height, 100 - y)),
    color: track.color,
  };
}

export function getSudoDroneLauncherDetections(
  currentTime: number,
  duration: number,
  tracks = sudoDroneLauncherDetectionTracks
) {
  const playbackRatio = normalizePlaybackRatio(currentTime, duration);

  return tracks
    .map((track) => interpolateSudoDetectionTrack(track, playbackRatio))
    .filter((box): box is SudoDetectionBox => box !== undefined);
}

function luminance(red: number, green: number, blue: number) {
  return red * 0.299 + green * 0.587 + blue * 0.114;
}

function isCandidateVehiclePixel(
  red: number,
  green: number,
  blue: number,
  xRatio: number,
  yRatio: number
) {
  if (xRatio < 0.08 || xRatio > 0.92 || yRatio < 0.2 || yRatio > 0.86) {
    return false;
  }

  const light = luminance(red, green, blue);
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const chroma = max - min;
  const greenishVehicle = green >= red - 16 && green >= blue - 10;
  const darkMilitaryPaint = light < 118 && chroma < 58;
  const shadowedVehicle = light < 92 && greenishVehicle;

  return darkMilitaryPaint || shadowedVehicle;
}

function findLargestVehicleComponent(image: SudoImageLikeData) {
  const { width, height, data } = image;
  const mask = new Uint8Array(width * height);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = y * width + x;
      const offset = index * 4;
      if (
        isCandidateVehiclePixel(
          data[offset],
          data[offset + 1],
          data[offset + 2],
          x / width,
          y / height
        )
      ) {
        mask[index] = 1;
      }
    }
  }

  const visited = new Uint8Array(width * height);
  let best = { area: 0, minX: 0, minY: 0, maxX: 0, maxY: 0 };
  const queue = new Int32Array(width * height);
  const neighbors = [
    [-1, 0],
    [1, 0],
    [0, -1],
    [0, 1],
  ];

  for (let start = 0; start < mask.length; start += 1) {
    if (!mask[start] || visited[start]) {
      continue;
    }

    let head = 0;
    let tail = 0;
    queue[tail] = start;
    tail += 1;
    visited[start] = 1;
    let area = 0;
    let minX = width;
    let minY = height;
    let maxX = 0;
    let maxY = 0;

    while (head < tail) {
      const index = queue[head];
      head += 1;
      const x = index % width;
      const y = Math.floor(index / width);
      area += 1;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);

      for (const [dx, dy] of neighbors) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || nx >= width || ny < 0 || ny >= height) {
          continue;
        }

        const nextIndex = ny * width + nx;
        if (mask[nextIndex] && !visited[nextIndex]) {
          visited[nextIndex] = 1;
          queue[tail] = nextIndex;
          tail += 1;
        }
      }
    }

    const widthRatio = (maxX - minX + 1) / width;
    const heightRatio = (maxY - minY + 1) / height;
    const areaRatio = area / (width * height);
    const plausibleVehicle =
      widthRatio >= 0.22 &&
      widthRatio <= 0.68 &&
      heightRatio >= 0.12 &&
      heightRatio <= 0.52 &&
      areaRatio >= 0.006 &&
      areaRatio <= 0.18;

    if (plausibleVehicle && area > best.area) {
      best = { area, minX, minY, maxX, maxY };
    }
  }

  return best.area >= Math.max(48, width * height * 0.002) ? best : undefined;
}

function expandBox(
  box: { x: number; y: number; width: number; height: number },
  left: number,
  top: number,
  right: number,
  bottom: number
) {
  const x = clampPercent(box.x - left);
  const y = clampPercent(box.y - top);
  const maxX = clampPercent(box.x + box.width + right);
  const maxY = clampPercent(box.y + box.height + bottom);
  return {
    x,
    y,
    width: Math.max(1, maxX - x),
    height: Math.max(1, maxY - y),
  };
}

export function trackSudoLauncherFromImageData(
  image: SudoImageLikeData
): SudoDetectionBox[] {
  const component = findLargestVehicleComponent(image);
  if (!component) {
    return [];
  }

  const base = {
    x: (component.minX / image.width) * 100,
    y: (component.minY / image.height) * 100,
    width: ((component.maxX - component.minX + 1) / image.width) * 100,
    height: ((component.maxY - component.minY + 1) / image.height) * 100,
  };
  const target = expandBox(base, 6.4, 10.2, 7.2, 4.8);
  const tubes = {
    x: clampPercent(target.x + target.width * 0.02),
    y: clampPercent(target.y + target.height * 0.08),
    width: Math.max(1, Math.min(target.width * 0.58, 100)),
    height: Math.max(1, Math.min(target.height * 0.36, 100)),
  };
  const chassis = {
    x: clampPercent(target.x + target.width * 0.26),
    y: clampPercent(target.y + target.height * 0.44),
    width: Math.max(1, Math.min(target.width * 0.68, 100)),
    height: Math.max(1, Math.min(target.height * 0.42, 100)),
  };

  return [
    {
      label: "M-1991 240mm TEL",
      confidence: 0.998,
      color: "#ffb547",
      ...target,
    },
    {
      label: "발사관 22연장",
      confidence: 0.941,
      color: "#38d7ff",
      ...tubes,
    },
    {
      label: "차량 차체",
      confidence: 0.918,
      color: "#67f29b",
      ...chassis,
    },
  ];
}
