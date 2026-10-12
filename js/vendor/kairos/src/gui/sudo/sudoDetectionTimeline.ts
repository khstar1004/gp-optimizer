import type { SudoDetectionBox } from "./sudoScenarios";

export interface SudoDetectionFrameSummary {
  frameIndex: number;
  count: number;
  averageConfidence: number;
  labelSummary: string;
  labels: string[];
  trackIds: string[];
  trackSummary: string;
}

export interface SudoDetectionTrackSummary {
  trackId: string;
  label: string;
  count: number;
  firstFrameIndex: number;
  lastFrameIndex: number;
  averageConfidence: number;
  color?: string;
}

export interface SudoDetectionTimelineOptions {
  maxFrames?: number;
}

function normalizeMaxFrames(value: unknown) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return undefined;
  }

  return Math.max(1, Math.trunc(parsed));
}

function normalizeFrameIndex(value: unknown, fallback = 0) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return Math.max(0, Math.trunc(parsed));
}

function getTimelineFrameCount(
  detections: SudoDetectionBox[],
  frameCount: number
) {
  const highestFrameIndex = detections.reduce(
    (highest, box) => Math.max(highest, normalizeFrameIndex(box.frameIndex, 0)),
    -1
  );
  const requestedFrameCount = Number.isFinite(frameCount)
    ? Math.max(0, Math.trunc(frameCount))
    : 0;

  if (requestedFrameCount > 0 || highestFrameIndex >= 0) {
    return Math.max(requestedFrameCount, highestFrameIndex + 1);
  }

  return detections.length > 0 ? 1 : 0;
}

function buildTimelineFrameIndexes(
  detections: SudoDetectionBox[],
  frameCount: number,
  maxFrames?: number
) {
  if (!maxFrames || frameCount <= maxFrames) {
    return Array.from(
      { length: frameCount },
      (_entry, frameIndex) => frameIndex
    );
  }

  const selected = new Set<number>();
  const detectionFrameIndexes = [
    ...new Set(
      detections
        .map((box) => normalizeFrameIndex(box.frameIndex, 0))
        .filter((frameIndex) => frameIndex >= 0 && frameIndex < frameCount)
    ),
  ].sort((left, right) => left - right);

  detectionFrameIndexes.forEach((frameIndex) => {
    if (selected.size < maxFrames) {
      selected.add(frameIndex);
    }
  });

  for (
    let sampleIndex = 0;
    selected.size < maxFrames && sampleIndex < maxFrames;
    sampleIndex += 1
  ) {
    const denominator = Math.max(1, maxFrames - 1);
    selected.add(Math.round((sampleIndex * (frameCount - 1)) / denominator));
  }

  return [...selected].sort((left, right) => left - right);
}

function summarizeLabels(labels: string[]) {
  if (labels.length === 0) {
    return "-";
  }

  const counts = new Map<string, number>();
  labels.forEach((label) => counts.set(label, (counts.get(label) ?? 0) + 1));

  return [...counts.entries()]
    .sort(
      (left, right) => right[1] - left[1] || left[0].localeCompare(right[0])
    )
    .map(([label, count]) => (count > 1 ? `${label} x${count}` : label))
    .join(", ");
}

function getTrackId(box: SudoDetectionBox) {
  return box.trackId?.trim();
}

function summarizeTrackIds(trackIds: string[]) {
  return trackIds.length > 0 ? trackIds.join(", ") : "-";
}

function roundConfidence(value: number) {
  return Math.round(value * 10000) / 10000;
}

interface TrackLabelStat {
  label: string;
  count: number;
  confidenceSum: number;
  firstSeen: number;
}

function getDominantTrackLabel(labelStats: Map<string, TrackLabelStat>) {
  return [...labelStats.values()].sort(
    (left, right) =>
      right.count - left.count ||
      right.confidenceSum - left.confidenceSum ||
      left.firstSeen - right.firstSeen ||
      left.label.localeCompare(right.label)
  )[0]?.label;
}

function updateTrackLabelStats(
  labelStats: Map<string, TrackLabelStat>,
  box: SudoDetectionBox,
  order: number
) {
  const current = labelStats.get(box.label);
  if (!current) {
    labelStats.set(box.label, {
      label: box.label,
      count: 1,
      confidenceSum: box.confidence,
      firstSeen: order,
    });
    return;
  }

  current.count += 1;
  current.confidenceSum += box.confidence;
}

function smoothCoordinate(previous: number, current: number, next: number) {
  return (
    Math.round((previous * 0.25 + current * 0.5 + next * 0.25) * 100) / 100
  );
}

function smoothTrackDetections(trackDetections: SudoDetectionBox[]) {
  if (trackDetections.length < 3) {
    return trackDetections;
  }

  const ordered = [...trackDetections].sort(
    (left, right) =>
      normalizeFrameIndex(left.frameIndex, 0) -
      normalizeFrameIndex(right.frameIndex, 0)
  );
  const smoothedByBox = new Map<SudoDetectionBox, SudoDetectionBox>();

  ordered.forEach((box, index) => {
    const previous = ordered[index - 1];
    const next = ordered[index + 1];
    if (!previous || !next) {
      smoothedByBox.set(box, box);
      return;
    }

    smoothedByBox.set(box, {
      ...box,
      x: smoothCoordinate(previous.x, box.x, next.x),
      y: smoothCoordinate(previous.y, box.y, next.y),
      width: smoothCoordinate(previous.width, box.width, next.width),
      height: smoothCoordinate(previous.height, box.height, next.height),
    });
  });

  return trackDetections.map((box) => smoothedByBox.get(box) ?? box);
}

export function smoothSudoDetectionsByTrack(
  detections: SudoDetectionBox[]
): SudoDetectionBox[] {
  const trackGroups = new Map<string, SudoDetectionBox[]>();
  detections.forEach((box) => {
    const trackId = getTrackId(box);
    if (!trackId || box.frameIndex === undefined) {
      return;
    }

    const group = trackGroups.get(trackId) ?? [];
    group.push(box);
    trackGroups.set(trackId, group);
  });

  if (![...trackGroups.values()].some((group) => group.length >= 3)) {
    return detections;
  }

  const smoothedByBox = new Map<SudoDetectionBox, SudoDetectionBox>();
  trackGroups.forEach((group) => {
    smoothTrackDetections(group).forEach((box, index) => {
      smoothedByBox.set(group[index], box);
    });
  });

  return detections.map((box) => smoothedByBox.get(box) ?? box);
}

export function buildSudoDetectionTimeline(
  detections: SudoDetectionBox[],
  frameCount: number,
  options: SudoDetectionTimelineOptions = {}
): SudoDetectionFrameSummary[] {
  const safeFrameCount = getTimelineFrameCount(detections, frameCount);
  if (safeFrameCount === 0) {
    return [];
  }

  const frameIndexes = buildTimelineFrameIndexes(
    detections,
    safeFrameCount,
    normalizeMaxFrames(options.maxFrames)
  );

  return frameIndexes.map((frameIndex) => {
    const frameDetections = detections.filter(
      (box) => normalizeFrameIndex(box.frameIndex, 0) === frameIndex
    );
    const confidenceSum = frameDetections.reduce(
      (sum, box) => sum + box.confidence,
      0
    );
    const labels = frameDetections.map((box) => box.label);
    const trackIds = [
      ...new Set(
        frameDetections
          .map((box) => getTrackId(box))
          .filter((trackId): trackId is string => Boolean(trackId))
      ),
    ];

    return {
      frameIndex,
      count: frameDetections.length,
      averageConfidence:
        frameDetections.length > 0
          ? roundConfidence(confidenceSum / frameDetections.length)
          : 0,
      labelSummary: summarizeLabels(labels),
      labels,
      trackIds,
      trackSummary: summarizeTrackIds(trackIds),
    };
  });
}

export function buildSudoDetectionTrackSummary(
  detections: SudoDetectionBox[]
): SudoDetectionTrackSummary[] {
  const trackState = new Map<
    string,
    SudoDetectionTrackSummary & {
      confidenceSum: number;
      labelStats: Map<string, TrackLabelStat>;
    }
  >();

  detections.forEach((box, order) => {
    const trackId = getTrackId(box);
    if (!trackId) {
      return;
    }

    const frameIndex = normalizeFrameIndex(box.frameIndex, 0);
    const current = trackState.get(trackId);
    if (!current) {
      trackState.set(trackId, {
        trackId,
        label: box.label,
        count: 1,
        firstFrameIndex: frameIndex,
        lastFrameIndex: frameIndex,
        averageConfidence: box.confidence,
        confidenceSum: box.confidence,
        color: box.color,
        labelStats: new Map([
          [
            box.label,
            {
              label: box.label,
              count: 1,
              confidenceSum: box.confidence,
              firstSeen: order,
            },
          ],
        ]),
      });
      return;
    }

    current.count += 1;
    current.confidenceSum += box.confidence;
    updateTrackLabelStats(current.labelStats, box, order);
    current.label = getDominantTrackLabel(current.labelStats) ?? current.label;
    current.firstFrameIndex = Math.min(current.firstFrameIndex, frameIndex);
    current.lastFrameIndex = Math.max(current.lastFrameIndex, frameIndex);
    current.averageConfidence = roundConfidence(
      current.confidenceSum / current.count
    );
    if (!current.color && box.color) {
      current.color = box.color;
    }
  });

  return [...trackState.values()]
    .map(
      ({ confidenceSum: _confidenceSum, labelStats: _labelStats, ...track }) =>
        track
    )
    .sort(
      (left, right) =>
        left.firstFrameIndex - right.firstFrameIndex ||
        left.trackId.localeCompare(right.trackId)
    );
}
