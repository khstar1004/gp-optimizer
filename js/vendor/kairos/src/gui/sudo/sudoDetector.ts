import type { SudoDetectionBox } from "./sudoScenarios";
import { redactSudoMediaDiagnostic } from "./sudoMedia";
import { refineSudoDetectionLabels } from "./sudoTargetLabels";

export const SUDO_SCENARIO_1_DETECTOR_DISPLAY_CONFIDENCE = 0.18;

export type SudoDetectorSource = "detector" | "unconfigured" | "error";

export interface SudoDetectorRuntimeInfo {
  mode?: string;
  device?: string;
  providers?: string[];
  activeProviders?: string[];
  allowCpu?: boolean;
}

export interface SudoDetectorTimings {
  preprocessMs?: number;
  inferenceMs?: number;
  totalMs?: number;
  frameCount?: number;
  inferenceFps?: number;
  sampleCount?: number;
  inferredSampleCount?: number;
  recentDetectionRate?: number;
  latestFrameIndex?: number;
  latestBboxCount?: number;
  streamAgeMs?: number;
}

export type SudoDetectorRuntimeBadgeTone =
  | "gpu"
  | "cpu"
  | "warning"
  | "timing"
  | "cache"
  | "fresh";

export interface SudoDetectorRuntimeBadge {
  label: string;
  compactLabel: string;
  tone: SudoDetectorRuntimeBadgeTone;
}

export interface SudoDetectorResult {
  source: SudoDetectorSource;
  endpoint?: string;
  model?: string;
  device?: string;
  runtime?: SudoDetectorRuntimeInfo;
  timings?: SudoDetectorTimings;
  cache?: string;
  detections: SudoDetectionBox[];
  frameCount: number;
  diagnostic?: string;
  elapsedMs?: number;
}

export interface SudoDetectorVideoSource {
  url: string;
  playbackUrl?: string;
  transport: "mock-file" | "http" | "rtsp";
  label?: string;
}

export interface SudoDetectorRequest {
  scenarioId: number;
  imageBase64s: string[];
  endpointOverride?: string;
  videoSource?: SudoDetectorVideoSource;
  frameCount?: number;
}

export interface SudoDetectorProbeResult {
  source: "probe" | "unconfigured" | "error";
  endpoint?: string;
  reachable: boolean;
  diagnostic: string;
  transport?: SudoDetectorVideoSource["transport"];
  elapsedMs?: number;
}

export interface SudoDetectorHealthResult {
  source: "health" | "unconfigured" | "error";
  endpoint?: string;
  adapterReachable: boolean;
  modelReady?: boolean;
  cameraReachable?: boolean;
  mode?: string;
  model?: string;
  device?: string;
  runtime?: SudoDetectorRuntimeInfo;
  diagnostic: string;
  modelDiagnostic?: string;
  cameraDiagnostic?: string;
  elapsedMs?: number;
}

export interface SudoDetectorConfidenceSample {
  frameIndex: number;
  timestamp?: number;
  bboxCount: number;
  averageConfidence: number;
  maxConfidence: number;
  labelSummary: string;
  trackSummary?: string;
  streamLabel?: string;
  inferenceMs?: number;
  inferred?: boolean;
  detections?: SudoDetectionBox[];
}

export interface SudoDetectorStreamStatsResult {
  source: "stream-stats" | "unconfigured" | "error";
  endpoint?: string;
  model?: string;
  mode?: string;
  device?: string;
  runtime?: SudoDetectorRuntimeInfo;
  historyLimit?: number;
  sampleCount?: number;
  updatedAt?: number;
  samples: SudoDetectorConfidenceSample[];
  diagnostic?: string;
  elapsedMs?: number;
}

export type SudoDetectorStreamFreshness = "fresh" | "lag" | "stale";
export type SudoDetectorStreamQualityTone =
  | "ready"
  | "warning"
  | "stale"
  | "idle";

export interface SudoDetectorStreamQualitySummary {
  sampleCount: number;
  inferredSampleCount: number;
  detectionSampleCount: number;
  detectionRate: number;
  latestFrameIndex?: number;
  latestBboxCount?: number;
  averageInferenceMs?: number;
  inferenceFps?: number;
  streamAgeMs?: number;
  freshness?: SudoDetectorStreamFreshness;
  freshnessLabel?: string;
  statusLabel: string;
  statusTone: SudoDetectorStreamQualityTone;
  detailLabel: string;
  timings?: SudoDetectorTimings;
  latestSample?: SudoDetectorConfidenceSample;
  latestDetectionSample?: SudoDetectorConfidenceSample;
}

export interface SudoDetectorSnapshotResult {
  source: "snapshot" | "unconfigured" | "error";
  endpoint?: string;
  imageBase64?: string;
  contentType?: string;
  diagnostic?: string;
  elapsedMs?: number;
}

const DEFAULT_DETECTOR_TIMEOUT_MS = 6000;
const DEFAULT_STREAM_STATS_TIMEOUT_MS = 2200;
const DEFAULT_DETECTOR_STREAM_FPS = 8;
const DEFAULT_DETECTOR_INFERENCE_FPS = 4;
const DEFAULT_DETECTOR_STREAM_MAX_WIDTH = 960;
const DEFAULT_DETECTOR_STREAM_QUALITY = 62;
const SUDO_DETECTOR_STREAM_QUALITY_WINDOW = 12;
export const SUDO_DETECTOR_STREAM_FRESH_AGE_MS = 4000;
export const SUDO_DETECTOR_STREAM_STALE_AGE_MS = 8000;
export const DEFAULT_SUDO_DETECTOR_ENDPOINT = "http://127.0.0.1:8766/detect";

function formatSudoDetectorDuration(value: number | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return undefined;
  }

  if (value >= 1000) {
    return `${Math.round((value / 1000) * 10) / 10}s`;
  }

  return `${Math.round(value)}ms`;
}

function formatSudoDetectorFps(value: number | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return undefined;
  }

  return `${Math.round(value * 10) / 10} FPS`;
}

function formatSudoDetectorPercent(value: number | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return undefined;
  }

  return `${Math.round(Math.max(0, Math.min(1, value)) * 100)}%`;
}

export function formatSudoDetectorDeviceLabel(device: string | undefined) {
  const normalized = device?.trim().toLowerCase();
  if (!normalized) {
    return undefined;
  }

  if (normalized.includes("cuda")) {
    return "GPU CUDA";
  }

  if (normalized.includes("directml") || normalized === "dml") {
    return "GPU DirectML";
  }

  if (normalized.includes("cpu")) {
    return "CPU";
  }

  return device;
}

export function getSudoDetectorStreamAgeMs(
  stats: SudoDetectorStreamStatsResult | undefined
) {
  if (
    typeof stats?.updatedAt !== "number" ||
    !Number.isFinite(stats.updatedAt)
  ) {
    return undefined;
  }

  return Math.max(0, Date.now() - stats.updatedAt * 1000);
}

export function getSudoDetectorStreamFreshness(
  ageMs: number | undefined
): SudoDetectorStreamFreshness | undefined {
  if (ageMs === undefined) {
    return undefined;
  }

  if (ageMs <= SUDO_DETECTOR_STREAM_FRESH_AGE_MS) {
    return "fresh";
  }

  if (ageMs >= SUDO_DETECTOR_STREAM_STALE_AGE_MS) {
    return "stale";
  }

  return "lag";
}

export function formatSudoDetectorStreamFreshnessLabel(
  ageMs: number | undefined
) {
  const freshness = getSudoDetectorStreamFreshness(ageMs);
  if (!freshness || ageMs === undefined) {
    return undefined;
  }

  const seconds = Math.round(ageMs / 1000);

  if (freshness === "fresh") {
    return `실시간 ${seconds}초 전`;
  }

  if (freshness === "stale") {
    return `갱신 지연 ${seconds}초`;
  }

  return `지연 ${seconds}초`;
}

export function buildSudoDetectorStreamQualitySummary(
  stats: SudoDetectorStreamStatsResult | undefined
): SudoDetectorStreamQualitySummary | undefined {
  if (!stats) {
    return undefined;
  }

  const samples = stats.samples;
  const sampleCount = stats.sampleCount ?? samples.length;
  const streamAgeMs = getSudoDetectorStreamAgeMs(stats);
  const freshness = getSudoDetectorStreamFreshness(streamAgeMs);
  const freshnessLabel = formatSudoDetectorStreamFreshnessLabel(streamAgeMs);

  if (stats.source !== "stream-stats") {
    return {
      sampleCount,
      inferredSampleCount: 0,
      detectionSampleCount: 0,
      detectionRate: 0,
      streamAgeMs,
      freshness,
      freshnessLabel,
      statusLabel: stats.source === "error" ? "LIVE 오류" : "LIVE 대기",
      statusTone: stats.source === "error" ? "stale" : "idle",
      detailLabel: stats.diagnostic ?? "스트림 통계 대기",
    };
  }

  if (samples.length === 0) {
    return {
      sampleCount,
      inferredSampleCount: 0,
      detectionSampleCount: 0,
      detectionRate: 0,
      streamAgeMs,
      freshness,
      freshnessLabel,
      statusLabel: "LIVE 대기",
      statusTone: "idle",
      detailLabel: stats.diagnostic ?? "스트림 샘플 없음",
    };
  }

  const latestSample = samples.at(-1);
  const latestDetectionSample =
    samples
      .slice()
      .reverse()
      .find((sample) => sample.bboxCount > 0) ?? latestSample;
  const recentSamples = samples.slice(-SUDO_DETECTOR_STREAM_QUALITY_WINDOW);
  const recentInferenceSamples = samples
    .filter(
      (sample) =>
        sample.inferenceMs !== undefined &&
        (sample.inferred === undefined || sample.inferred)
    )
    .slice(-SUDO_DETECTOR_STREAM_QUALITY_WINDOW);
  const inferredSampleCount = recentInferenceSamples.length;
  const detectionSampleCount = recentSamples.filter(
    (sample) => sample.bboxCount > 0
  ).length;
  const detectionRate =
    recentSamples.length > 0 ? detectionSampleCount / recentSamples.length : 0;
  const averageInferenceMs =
    inferredSampleCount > 0
      ? recentInferenceSamples.reduce(
          (total, sample) => total + (sample.inferenceMs ?? 0),
          0
        ) / inferredSampleCount
      : undefined;
  const timedSamples = recentInferenceSamples.filter(
    (sample) => typeof sample.timestamp === "number"
  );
  const firstTimedSample = timedSamples.at(0);
  const latestTimedSample = timedSamples.at(-1);
  const elapsedSeconds =
    firstTimedSample &&
    latestTimedSample &&
    timedSamples.length > 1 &&
    latestTimedSample.timestamp !== undefined &&
    firstTimedSample.timestamp !== undefined
      ? latestTimedSample.timestamp - firstTimedSample.timestamp
      : 0;
  const inferenceFps =
    elapsedSeconds > 0 ? (timedSamples.length - 1) / elapsedSeconds : undefined;
  const latestFrameIndex = latestSample?.frameIndex;
  const latestBboxCount = latestSample?.bboxCount;
  const latestBboxLabel =
    latestBboxCount !== undefined ? `bbox ${latestBboxCount}` : undefined;
  const statusLabel =
    freshness === "stale"
      ? "LIVE 정지"
      : freshness === "lag"
        ? "LIVE 지연"
        : (latestBboxCount ?? 0) > 0
          ? "LIVE 추적"
          : "LIVE 탐색";
  const statusTone: SudoDetectorStreamQualityTone =
    freshness === "stale" ? "stale" : freshness === "lag" ? "warning" : "ready";
  const sampleWindowLabel = stats.historyLimit
    ? `샘플 ${sampleCount}/${stats.historyLimit}`
    : `샘플 ${sampleCount}`;
  const frameLabel =
    latestFrameIndex !== undefined ? `F${latestFrameIndex + 1}` : undefined;
  const inferenceLabel =
    averageInferenceMs !== undefined
      ? `추론 ${formatSudoDetectorDuration(averageInferenceMs)}`
      : undefined;
  const fpsLabel = formatSudoDetectorFps(inferenceFps);
  const hitRateLabel = `HIT ${formatSudoDetectorPercent(detectionRate)}`;
  const detailLabel = [
    sampleWindowLabel,
    frameLabel,
    latestBboxLabel,
    inferenceLabel,
    fpsLabel,
    hitRateLabel,
    freshnessLabel,
  ]
    .filter(Boolean)
    .join(" · ");
  const timings: SudoDetectorTimings = {
    inferenceMs: averageInferenceMs,
    inferenceFps,
    frameCount: samples.length,
    sampleCount,
    inferredSampleCount,
    recentDetectionRate: detectionRate,
    latestFrameIndex,
    latestBboxCount,
    streamAgeMs,
  };

  return {
    sampleCount,
    inferredSampleCount,
    detectionSampleCount,
    detectionRate,
    latestFrameIndex,
    latestBboxCount,
    averageInferenceMs,
    inferenceFps,
    streamAgeMs,
    freshness,
    freshnessLabel,
    statusLabel,
    statusTone,
    detailLabel,
    timings,
    latestSample,
    latestDetectionSample,
  };
}

export function buildSudoDetectorTimingsFromStreamStats(
  stats: SudoDetectorStreamStatsResult | undefined
) {
  return buildSudoDetectorStreamQualitySummary(stats)?.timings;
}

export function formatSudoDetectorTimingSummary(
  detectorResult: Pick<SudoDetectorResult, "timings" | "elapsedMs">
) {
  const timings = detectorResult.timings;
  if (!timings) {
    return detectorResult.elapsedMs !== undefined
      ? `왕복 ${formatSudoDetectorDuration(detectorResult.elapsedMs)}`
      : undefined;
  }

  const parts = [
    timings.preprocessMs !== undefined
      ? `전처리 ${formatSudoDetectorDuration(timings.preprocessMs)}`
      : undefined,
    timings.inferenceMs !== undefined
      ? `추론 ${formatSudoDetectorDuration(timings.inferenceMs)}`
      : undefined,
    timings.totalMs !== undefined
      ? `합계 ${formatSudoDetectorDuration(timings.totalMs)}`
      : undefined,
    formatSudoDetectorFps(timings.inferenceFps),
  ].filter(Boolean);

  return parts.length > 0 ? parts.join(" · ") : undefined;
}

export function buildSudoDetectorRuntimeBadges({
  detectorResult,
  runtime,
  device,
  includeTotal = false,
}: {
  detectorResult?: Pick<
    SudoDetectorResult,
    "device" | "runtime" | "timings" | "cache"
  >;
  runtime?: SudoDetectorRuntimeInfo;
  device?: string;
  includeTotal?: boolean;
}) {
  const resolvedRuntime = detectorResult?.runtime ?? runtime;
  const resolvedDevice =
    detectorResult?.device ?? device ?? resolvedRuntime?.device;
  const timings = detectorResult?.timings;
  const badges: SudoDetectorRuntimeBadge[] = [];
  const deviceLabel = formatSudoDetectorDeviceLabel(resolvedDevice);

  if (deviceLabel) {
    badges.push({
      label: deviceLabel,
      compactLabel: deviceLabel,
      tone: deviceLabel === "CPU" ? "warning" : "gpu",
    });
  }

  if (resolvedRuntime?.allowCpu === false) {
    badges.push({
      label: "CPU 대체경로 차단",
      compactLabel: "CPU OFF",
      tone: "cpu",
    });
  } else if (resolvedRuntime?.allowCpu === true) {
    badges.push({
      label: "CPU 대체경로 허용",
      compactLabel: "CPU ON",
      tone: "warning",
    });
  }

  const preprocess = formatSudoDetectorDuration(timings?.preprocessMs);
  if (preprocess) {
    badges.push({
      label: `전처리 ${preprocess}`,
      compactLabel: `PRE ${preprocess}`,
      tone: "timing",
    });
  }

  const inference = formatSudoDetectorDuration(timings?.inferenceMs);
  if (inference) {
    badges.push({
      label: `추론 ${inference}`,
      compactLabel: `INF ${inference}`,
      tone: "timing",
    });
  }

  const total = includeTotal
    ? formatSudoDetectorDuration(timings?.totalMs)
    : undefined;
  if (total) {
    badges.push({
      label: `합계 ${total}`,
      compactLabel: `TOT ${total}`,
      tone: "timing",
    });
  }

  const fps = formatSudoDetectorFps(timings?.inferenceFps);
  if (fps) {
    badges.push({
      label: fps,
      compactLabel: fps,
      tone: "timing",
    });
  }

  if (timings?.sampleCount !== undefined) {
    const sampleCount = Math.round(timings.sampleCount);
    badges.push({
      label: `스트림 샘플 ${sampleCount}건`,
      compactLabel: `SMP ${sampleCount}`,
      tone: "timing",
    });
  }

  const recentDetectionRate = formatSudoDetectorPercent(
    timings?.recentDetectionRate
  );
  if (recentDetectionRate) {
    badges.push({
      label: `최근 탐지율 ${recentDetectionRate}`,
      compactLabel: `HIT ${recentDetectionRate}`,
      tone: (timings?.recentDetectionRate ?? 0) > 0 ? "gpu" : "warning",
    });
  }

  if (timings?.latestBboxCount !== undefined) {
    const roundedBboxCount = Math.round(timings.latestBboxCount);
    badges.push({
      label: `최신 bbox ${roundedBboxCount}건`,
      compactLabel: `BBOX ${roundedBboxCount}`,
      tone: roundedBboxCount > 0 ? "gpu" : "warning",
    });
  }

  if (timings?.streamAgeMs !== undefined) {
    const streamAgeSeconds = Math.round(timings.streamAgeMs / 1000);
    const freshness =
      timings.streamAgeMs <= 4000
        ? "fresh"
        : timings.streamAgeMs >= 8000
          ? "stale"
          : "lag";
    badges.push({
      label: `LIVE ${freshness} ${streamAgeSeconds}s`,
      compactLabel: `LIVE ${freshness.toUpperCase()} ${streamAgeSeconds}s`,
      tone:
        freshness === "fresh"
          ? "fresh"
          : freshness === "stale"
            ? "warning"
            : "cache",
    });
  }

  if (detectorResult?.cache) {
    badges.push({
      label: `cache ${detectorResult.cache}`,
      compactLabel:
        detectorResult.cache === "hit"
          ? "CACHE"
          : `CACHE ${detectorResult.cache}`,
      tone: "cache",
    });
  }

  return badges;
}

export function getSudoDetectorEndpoint() {
  const endpoint = String(import.meta.env.VITE_SUDO_DETECTOR_URL ?? "").trim();
  return endpoint.length > 0
    ? endpoint.replace(/\/+$/, "")
    : DEFAULT_SUDO_DETECTOR_ENDPOINT;
}

function normalizeEndpoint(value: string | undefined) {
  const endpoint = String(value ?? "").trim();
  return endpoint.length > 0 ? endpoint.replace(/\/+$/, "") : undefined;
}

function getDetectorTimeoutMs() {
  const parsed = Number(import.meta.env.VITE_SUDO_DETECTOR_TIMEOUT_MS);
  return Number.isFinite(parsed) && parsed > 0
    ? parsed
    : DEFAULT_DETECTOR_TIMEOUT_MS;
}

function getDetectorRequestTimeoutMs(frameCount: number) {
  if (frameCount <= 8) {
    return getDetectorTimeoutMs();
  }

  return Math.min(
    45000,
    Math.max(getDetectorTimeoutMs(), Math.round(frameCount * 650))
  );
}

function getDetectorStreamFps() {
  const parsed = Number(
    import.meta.env.VITE_SUDO_DETECTOR_STREAM_FPS ??
      import.meta.env.VITE_SUDO_STREAM_FPS
  );
  return Number.isFinite(parsed) && parsed > 0
    ? Math.max(1, Math.min(30, Math.round(parsed)))
    : DEFAULT_DETECTOR_STREAM_FPS;
}

function getDetectorStreamInferenceFps() {
  const parsed = Number(
    import.meta.env.VITE_SUDO_DETECTOR_INFERENCE_FPS ??
      import.meta.env.VITE_SUDO_INFERENCE_FPS
  );
  return Number.isFinite(parsed) && parsed > 0
    ? Math.max(1, Math.min(30, Math.round(parsed)))
    : DEFAULT_DETECTOR_INFERENCE_FPS;
}

function getDetectorStreamMaxWidth() {
  const parsed = Number(
    import.meta.env.VITE_SUDO_DETECTOR_STREAM_MAX_WIDTH ??
      import.meta.env.VITE_SUDO_STREAM_MAX_WIDTH
  );
  return Number.isFinite(parsed) && parsed > 0
    ? Math.max(320, Math.min(1920, Math.round(parsed)))
    : DEFAULT_DETECTOR_STREAM_MAX_WIDTH;
}

function getDetectorStreamQuality() {
  const parsed = Number(
    import.meta.env.VITE_SUDO_DETECTOR_STREAM_QUALITY ??
      import.meta.env.VITE_SUDO_STREAM_QUALITY
  );
  return Number.isFinite(parsed) && parsed > 0
    ? Math.max(35, Math.min(95, Math.round(parsed)))
    : DEFAULT_DETECTOR_STREAM_QUALITY;
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function parseNumericValue(value: unknown) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? { value, percent: false } : undefined;
  }

  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }

  const percent = trimmed.endsWith("%");
  const numericText = (percent ? trimmed.slice(0, -1) : trimmed)
    .trim()
    .replace(/,/g, "");
  const parsed = Number(numericText);

  return Number.isFinite(parsed) ? { value: parsed, percent } : undefined;
}

function toFiniteConfidence(value: unknown, fallback: number) {
  const parsed = parseNumericValue(value);
  if (!parsed) {
    return fallback;
  }

  const confidence =
    parsed.percent || parsed.value > 1 ? parsed.value / 100 : parsed.value;
  return Math.max(0, Math.min(1, confidence));
}

function toPercentCoordinate(value: unknown) {
  const parsed = parseNumericValue(value);
  if (!parsed) {
    return undefined;
  }

  const percentValue =
    parsed.percent || parsed.value > 1 ? parsed.value : parsed.value * 100;
  return Math.max(0, Math.min(100, percentValue));
}

function parseFrameIndex(value: unknown, fallback?: number) {
  const parsed = parseNumericValue(value);
  if (!parsed) {
    return fallback;
  }

  return Math.max(0, Math.trunc(parsed.value));
}

function parseTrackId(value: unknown) {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }

  return undefined;
}

function toOptionalBoolean(value: unknown) {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return value !== 0;
  }

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["true", "yes", "ready", "ok", "loaded"].includes(normalized)) {
      return true;
    }
    if (["false", "no", "error", "missing", "unloaded"].includes(normalized)) {
      return false;
    }
  }

  return undefined;
}

function toFiniteNumber(value: unknown) {
  const parsed = parseNumericValue(value);
  return parsed ? parsed.value : undefined;
}

function toNonNegativeInteger(value: unknown, fallback: number) {
  const parsed = parseNumericValue(value);
  if (!parsed) {
    return fallback;
  }

  return Math.max(0, Math.trunc(parsed.value));
}

function toStringArray(value: unknown) {
  if (!Array.isArray(value)) {
    return undefined;
  }

  const strings = value
    .map((entry) => String(entry ?? "").trim())
    .filter(Boolean);
  return strings.length > 0 ? strings : undefined;
}

function normalizeDetectorRuntime(
  value: unknown,
  fallbackRecord?: Record<string, unknown>
): SudoDetectorRuntimeInfo | undefined {
  const record =
    value && typeof value === "object"
      ? (value as Record<string, unknown>)
      : {};
  const mode =
    typeof record.mode === "string"
      ? record.mode
      : typeof fallbackRecord?.mode === "string"
        ? fallbackRecord.mode
        : typeof fallbackRecord?.detector === "string"
          ? fallbackRecord.detector
          : undefined;
  const device =
    typeof record.device === "string"
      ? record.device
      : typeof fallbackRecord?.device === "string"
        ? fallbackRecord.device
        : undefined;
  const providers =
    toStringArray(record.providers) ?? toStringArray(fallbackRecord?.providers);
  const activeProviders =
    toStringArray(record.activeProviders) ??
    toStringArray(record.active_providers) ??
    toStringArray(fallbackRecord?.activeProviders) ??
    toStringArray(fallbackRecord?.active_providers);
  const allowCpu =
    toOptionalBoolean(record.allowCpu ?? record.allow_cpu) ??
    toOptionalBoolean(fallbackRecord?.allowCpu ?? fallbackRecord?.allow_cpu);

  const runtime: SudoDetectorRuntimeInfo = {};
  if (mode) runtime.mode = mode;
  if (device) runtime.device = device;
  if (providers) runtime.providers = providers;
  if (activeProviders) runtime.activeProviders = activeProviders;
  if (allowCpu !== undefined) runtime.allowCpu = allowCpu;

  return Object.keys(runtime).length > 0 ? runtime : undefined;
}

function normalizeDetectorTimings(value: unknown) {
  if (!value || typeof value !== "object") {
    return undefined;
  }

  const record = value as Record<string, unknown>;
  const timings: SudoDetectorTimings = {};
  const preprocessMs = toFiniteNumber(
    record.preprocessMs ?? record.preprocess_ms
  );
  const inferenceMs = toFiniteNumber(record.inferenceMs ?? record.inference_ms);
  const totalMs = toFiniteNumber(
    record.totalMs ?? record.total_ms ?? record.elapsedMs ?? record.elapsed_ms
  );
  const frameCount = toFiniteNumber(record.frameCount ?? record.frame_count);
  const inferenceFps = toFiniteNumber(
    record.inferenceFps ?? record.inference_fps
  );
  const sampleCount = toFiniteNumber(record.sampleCount ?? record.sample_count);
  const inferredSampleCount = toFiniteNumber(
    record.inferredSampleCount ?? record.inferred_sample_count
  );
  const recentDetectionRate = toFiniteNumber(
    record.recentDetectionRate ??
      record.recent_detection_rate ??
      record.detectionRate ??
      record.detection_rate
  );
  const latestFrameIndex = toFiniteNumber(
    record.latestFrameIndex ?? record.latest_frame_index
  );
  const latestBboxCount = toFiniteNumber(
    record.latestBboxCount ?? record.latest_bbox_count
  );
  const streamAgeMs = toFiniteNumber(
    record.streamAgeMs ?? record.stream_age_ms
  );

  if (preprocessMs !== undefined) timings.preprocessMs = preprocessMs;
  if (inferenceMs !== undefined) timings.inferenceMs = inferenceMs;
  if (totalMs !== undefined) timings.totalMs = totalMs;
  if (frameCount !== undefined) timings.frameCount = Math.max(0, frameCount);
  if (inferenceFps !== undefined) timings.inferenceFps = inferenceFps;
  if (sampleCount !== undefined) timings.sampleCount = Math.max(0, sampleCount);
  if (inferredSampleCount !== undefined) {
    timings.inferredSampleCount = Math.max(0, inferredSampleCount);
  }
  if (recentDetectionRate !== undefined) {
    timings.recentDetectionRate = Math.max(0, Math.min(1, recentDetectionRate));
  }
  if (latestFrameIndex !== undefined) {
    timings.latestFrameIndex = Math.max(0, latestFrameIndex);
  }
  if (latestBboxCount !== undefined) {
    timings.latestBboxCount = Math.max(0, latestBboxCount);
  }
  if (streamAgeMs !== undefined) {
    timings.streamAgeMs = Math.max(0, streamAgeMs);
  }

  return Object.keys(timings).length > 0 ? timings : undefined;
}

function normalizeStreamConfidenceSample(
  entry: unknown,
  fallbackFrameIndex: number
) {
  if (!entry || typeof entry !== "object") {
    return undefined;
  }

  const record = entry as Record<string, unknown>;
  const frameIndex =
    parseFrameIndex(
      record.frameIndex ?? record.frame_index,
      fallbackFrameIndex
    ) ?? fallbackFrameIndex;
  const averageConfidence = toFiniteConfidence(
    record.averageConfidence ??
      record.avgConfidence ??
      record.average_confidence ??
      record.confidence,
    0
  );
  const maxConfidence = toFiniteConfidence(
    record.maxConfidence ?? record.max_confidence ?? record.confidence,
    averageConfidence
  );
  const bboxCount = toNonNegativeInteger(
    record.bboxCount ?? record.count ?? record.bbox_count,
    0
  );
  const timestampNumber = Number(record.timestamp ?? record.time);
  const labelSummary =
    typeof record.labelSummary === "string" &&
    record.labelSummary.trim().length > 0
      ? record.labelSummary.trim()
      : typeof record.label_summary === "string" &&
          record.label_summary.trim().length > 0
        ? record.label_summary.trim()
        : bboxCount > 0
          ? "detected"
          : "-";
  const sample: SudoDetectorConfidenceSample = {
    frameIndex,
    timestamp: Number.isFinite(timestampNumber) ? timestampNumber : undefined,
    bboxCount,
    averageConfidence,
    maxConfidence,
    labelSummary,
  };

  if (typeof record.trackSummary === "string") {
    sample.trackSummary = record.trackSummary;
  } else if (typeof record.track_summary === "string") {
    sample.trackSummary = record.track_summary;
  }

  if (typeof record.streamLabel === "string") {
    sample.streamLabel = record.streamLabel;
  } else if (typeof record.stream_label === "string") {
    sample.streamLabel = record.stream_label;
  }

  const inferenceMs = toFiniteNumber(record.inferenceMs ?? record.inference_ms);
  if (inferenceMs !== undefined) {
    sample.inferenceMs = inferenceMs;
  }

  const inferred = toOptionalBoolean(record.inferred ?? record.isInferred);
  if (inferred !== undefined) {
    sample.inferred = inferred;
  }

  const detections = normalizeDetectionArray(
    record.detections ?? record.boxes ?? record.bboxes,
    frameIndex
  );
  if (detections.length > 0) {
    sample.detections = detections;
  }

  return sample;
}

function normalizeDetectionRecord(
  record: Record<string, unknown>,
  fallbackFrameIndex?: number
) {
  const bbox = Array.isArray(record.bbox) ? record.bbox : undefined;
  const xyxy = Array.isArray(record.xyxy) ? record.xyxy : undefined;
  const bboxFormat =
    typeof record.bboxFormat === "string"
      ? record.bboxFormat.toLowerCase()
      : typeof record.format === "string"
        ? record.format.toLowerCase()
        : undefined;
  const sourceBox = bbox ?? xyxy;
  const x = toPercentCoordinate(record.x ?? record.x1 ?? sourceBox?.[0]);
  const y = toPercentCoordinate(record.y ?? record.y1 ?? sourceBox?.[1]);
  let width = toPercentCoordinate(
    record.width ?? record.w ?? record.x2 ?? sourceBox?.[2]
  );
  let height = toPercentCoordinate(
    record.height ?? record.h ?? record.y2 ?? sourceBox?.[3]
  );

  if (
    x !== undefined &&
    y !== undefined &&
    width !== undefined &&
    height !== undefined &&
    (xyxy ||
      bboxFormat === "xyxy" ||
      record.x2 !== undefined ||
      record.y2 !== undefined ||
      (bbox && bboxFormat !== "xywh" && width > x && height > y))
  ) {
    width = Math.max(1, width - x);
    height = Math.max(1, height - y);
  }

  if (
    x === undefined ||
    y === undefined ||
    width === undefined ||
    height === undefined
  ) {
    return undefined;
  }

  const label =
    typeof record.label === "string" && record.label.trim().length > 0
      ? record.label.trim()
      : typeof record.class === "string" && record.class.trim().length > 0
        ? record.class.trim()
        : typeof record.name === "string" && record.name.trim().length > 0
          ? record.name.trim()
          : "target";
  const normalized: SudoDetectionBox = {
    label,
    confidence: toFiniteConfidence(record.confidence ?? record.score, 0.75),
    x,
    y,
    width: Math.min(width, 100 - x),
    height: Math.min(height, 100 - y),
    frameIndex: parseFrameIndex(
      record.frameIndex ?? record.frame_index ?? record.frame,
      fallbackFrameIndex
    ),
  };
  const rawLabel =
    typeof record.rawLabel === "string" && record.rawLabel.trim().length > 0
      ? record.rawLabel.trim()
      : typeof record.raw_label === "string" &&
          record.raw_label.trim().length > 0
        ? record.raw_label.trim()
        : undefined;
  if (rawLabel && rawLabel !== label) {
    normalized.rawLabel = rawLabel;
  }
  const trackId = parseTrackId(
    record.trackId ??
      record.track_id ??
      record.track ??
      record.objectId ??
      record.object_id ??
      record.id
  );
  if (trackId) {
    normalized.trackId = trackId;
  }

  if (typeof record.role === "string" && record.role.trim().length > 0) {
    normalized.role = record.role.trim();
  }

  if (
    record.visualFeatures &&
    typeof record.visualFeatures === "object" &&
    !Array.isArray(record.visualFeatures)
  ) {
    const features = record.visualFeatures as Record<string, unknown>;
    const visualFeatures = {
      launcherScore: Number(features.launcherScore),
      darkBlobCount: Number(features.darkBlobCount),
      topDarkRatio: Number(features.topDarkRatio),
      edgeDensity: Number(features.edgeDensity),
      tubeFaceEdgeDensity: Number(features.tubeFaceEdgeDensity),
      tubeFaceDarkRatio: Number(features.tubeFaceDarkRatio),
    };
    normalized.visualFeatures = Object.fromEntries(
      Object.entries(visualFeatures).filter(([, value]) =>
        Number.isFinite(value)
      )
    ) as SudoDetectionBox["visualFeatures"];
  }

  if (typeof record.color === "string") {
    normalized.color = record.color;
  }

  return normalized;
}

function normalizeDetectionArray(value: unknown, fallbackFrameIndex?: number) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((entry) => {
      if (!entry || typeof entry !== "object") {
        return undefined;
      }

      return normalizeDetectionRecord(
        entry as Record<string, unknown>,
        fallbackFrameIndex
      );
    })
    .filter((entry): entry is SudoDetectionBox => entry !== undefined);
}

function getDetectionEntries(record: Record<string, unknown>) {
  return (
    record.detections ??
    record.boxes ??
    record.objects ??
    record.bboxes ??
    record.boundingBoxes ??
    record.bounding_boxes ??
    record.targets
  );
}

export function normalizeSudoDetectorResponse(
  payload: unknown,
  frameCount: number,
  endpoint?: string,
  elapsedMs?: number
): SudoDetectorResult {
  const record =
    payload && typeof payload === "object"
      ? (payload as Record<string, unknown>)
      : {};
  const requestedScenarioId = Number(record.scenarioId ?? record.scenario_id);
  const frames = Array.isArray(record.frames) ? record.frames : undefined;
  const timings = normalizeDetectorTimings(record.timings);
  const payloadFrameCount = toFiniteNumber(
    record.frameCount ?? record.frame_count ?? timings?.frameCount
  );
  const resolvedFrameCount =
    payloadFrameCount !== undefined && payloadFrameCount > 0
      ? Math.round(payloadFrameCount)
      : frameCount > 0
        ? frameCount
        : (frames?.length ?? frameCount);
  const frameDetections =
    frames?.flatMap((frame, index) => {
      if (Array.isArray(frame)) {
        return normalizeDetectionArray(frame, index);
      }

      if (!frame || typeof frame !== "object") {
        return [];
      }

      const frameRecord = frame as Record<string, unknown>;
      return normalizeDetectionArray(
        getDetectionEntries(frameRecord),
        parseFrameIndex(frameRecord.frameIndex ?? frameRecord.index, index)
      );
    }) ?? [];
  const flatDetections = normalizeDetectionArray(
    Array.isArray(payload) ? payload : getDetectionEntries(record)
  );
  const normalizedDetections =
    frameDetections.length > 0 ? frameDetections : flatDetections;
  const detections = refineSudoDetectionLabels(
    normalizedDetections,
    Number.isFinite(requestedScenarioId) ? requestedScenarioId : 0
  );
  const runtime = normalizeDetectorRuntime(record.runtime, record);
  const cache =
    typeof record.cache === "string" && record.cache.trim().length > 0
      ? record.cache.trim()
      : undefined;

  return {
    source: "detector",
    endpoint,
    model:
      typeof record.model === "string"
        ? record.model
        : typeof record.detector === "string"
          ? record.detector
          : undefined,
    device: runtime?.device,
    runtime,
    timings,
    cache,
    detections,
    frameCount: resolvedFrameCount,
    elapsedMs,
    diagnostic:
      detections.length > 0
        ? undefined
        : "Detector 응답에서 유효한 bbox를 찾지 못했습니다.",
  };
}

export async function requestSudoDetectorAnalysis({
  scenarioId,
  imageBase64s,
  endpointOverride,
  videoSource,
  frameCount,
}: SudoDetectorRequest): Promise<SudoDetectorResult> {
  const endpoint =
    normalizeEndpoint(endpointOverride) ?? getSudoDetectorEndpoint();
  const hasVideoSource = Boolean(videoSource?.url?.trim());
  const requestedFrameCount =
    frameCount && frameCount > 0
      ? Math.round(frameCount)
      : imageBase64s.length > 0
        ? imageBase64s.length
        : hasVideoSource
          ? 1
          : 0;
  if (!endpoint || (imageBase64s.length === 0 && !hasVideoSource)) {
    return {
      source: "unconfigured",
      endpoint,
      detections: [],
      frameCount: requestedFrameCount,
      diagnostic: endpoint
        ? "Detector에 전달할 이미지 프레임 또는 영상 소스가 없습니다."
        : "VITE_SUDO_DETECTOR_URL이 없어 detector adapter를 건너뜁니다.",
    };
  }

  const startedAt = performance.now();
  let timeoutId: number | undefined;

  try {
    const controller = new AbortController();
    const timeoutMs = getDetectorRequestTimeoutMs(requestedFrameCount);
    const payload = await Promise.race([
      (async () => {
        const response = await fetch(endpoint, {
          method: "POST",
          signal: controller.signal,
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            scenarioId,
            images: imageBase64s,
            videoSource: hasVideoSource ? videoSource : undefined,
            frameCount: requestedFrameCount,
            coordinateSystem: "percent",
            output: "frames",
          }),
        });

        if (!response.ok) {
          throw new Error(`Detector responded with ${response.status}`);
        }

        return (await response.json()) as unknown;
      })(),
      new Promise<never>((_resolve, reject) => {
        timeoutId = window.setTimeout(() => {
          controller.abort();
          reject(new Error(`Timed out after ${timeoutMs}ms`));
        }, timeoutMs);
      }),
    ]);

    const record =
      payload && typeof payload === "object"
        ? (payload as Record<string, unknown>)
        : {};
    const responsePayload =
      Number(record.scenarioId ?? record.scenario_id) === scenarioId
        ? payload
        : {
            ...record,
            scenarioId,
          };

    return normalizeSudoDetectorResponse(
      responsePayload,
      requestedFrameCount,
      endpoint,
      Math.round(performance.now() - startedAt)
    );
  } catch (error) {
    return {
      source: "error",
      endpoint,
      detections: [],
      frameCount: requestedFrameCount,
      elapsedMs: Math.round(performance.now() - startedAt),
      diagnostic: `Detector 연결 실패: ${getErrorMessage(error)}`,
    };
  } finally {
    if (timeoutId !== undefined) {
      window.clearTimeout(timeoutId);
    }
  }
}

function buildSiblingEndpoint(endpoint: string, path: string) {
  const url = new URL(endpoint, window.location.href);
  url.pathname = path;
  url.search = "";
  url.hash = "";
  return url.toString().replace(/\/+$/, "");
}

function normalizeDetectorStartRatio(startRatio?: number) {
  return typeof startRatio === "number" && Number.isFinite(startRatio)
    ? Math.max(0, Math.min(0.98, startRatio))
    : 0;
}

function normalizeDetectorDisplayConfidence(displayConfidence?: number) {
  return typeof displayConfidence === "number" &&
    Number.isFinite(displayConfidence)
    ? Math.max(0.01, Math.min(0.95, displayConfidence))
    : undefined;
}

export function buildSudoDetectorStreamUrl({
  endpointOverride,
  videoSource,
  scenarioId,
  startRatio,
  displayConfidence,
}: {
  endpointOverride?: string;
  videoSource?: SudoDetectorVideoSource;
  scenarioId?: number;
  startRatio?: number;
  displayConfidence?: number;
}) {
  const endpoint =
    normalizeEndpoint(endpointOverride) ?? getSudoDetectorEndpoint();
  if (!endpoint || !videoSource?.url.trim()) {
    return undefined;
  }

  const url = new URL(buildSiblingEndpoint(endpoint, "/stream.mjpg"));
  url.searchParams.set("url", videoSource.url);
  if (videoSource.playbackUrl) {
    url.searchParams.set("playbackUrl", videoSource.playbackUrl);
  }
  url.searchParams.set("transport", videoSource.transport);
  if (videoSource.label) {
    url.searchParams.set("label", videoSource.label);
  }
  if (scenarioId !== undefined) {
    url.searchParams.set("scenarioId", String(scenarioId));
  }
  url.searchParams.set("fps", String(getDetectorStreamFps()));
  url.searchParams.set("inferenceFps", String(getDetectorStreamInferenceFps()));
  url.searchParams.set("maxWidth", String(getDetectorStreamMaxWidth()));
  url.searchParams.set("quality", String(getDetectorStreamQuality()));
  url.searchParams.set(
    "startRatio",
    String(normalizeDetectorStartRatio(startRatio))
  );
  const normalizedDisplayConfidence =
    normalizeDetectorDisplayConfidence(displayConfidence);
  if (normalizedDisplayConfidence !== undefined) {
    url.searchParams.set("displayConf", String(normalizedDisplayConfidence));
  }
  return url.toString();
}

export function buildSudoDetectorSnapshotUrl({
  endpointOverride,
  videoSource,
  scenarioId,
}: {
  endpointOverride?: string;
  videoSource?: SudoDetectorVideoSource;
  scenarioId?: number;
}) {
  const endpoint =
    normalizeEndpoint(endpointOverride) ?? getSudoDetectorEndpoint();
  if (!endpoint || !videoSource?.url.trim()) {
    return undefined;
  }

  const url = new URL(buildSiblingEndpoint(endpoint, "/snapshot.jpg"));
  url.searchParams.set("url", videoSource.url);
  if (videoSource.playbackUrl) {
    url.searchParams.set("playbackUrl", videoSource.playbackUrl);
  }
  url.searchParams.set("transport", videoSource.transport);
  if (videoSource.label) {
    url.searchParams.set("label", videoSource.label);
  }
  if (scenarioId !== undefined) {
    url.searchParams.set("scenarioId", String(scenarioId));
  }
  return url.toString();
}

function arrayBufferToBase64(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  let binary = "";
  for (let index = 0; index < bytes.length; index += chunkSize) {
    const chunk = bytes.subarray(index, index + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return window.btoa(binary);
}

export async function requestSudoDetectorSnapshotFrame({
  endpointOverride,
  videoSource,
  scenarioId,
}: {
  endpointOverride?: string;
  videoSource?: SudoDetectorVideoSource;
  scenarioId?: number;
}): Promise<SudoDetectorSnapshotResult> {
  const endpoint =
    normalizeEndpoint(endpointOverride) ?? getSudoDetectorEndpoint();
  const snapshotUrl = buildSudoDetectorSnapshotUrl({
    endpointOverride,
    videoSource,
    scenarioId,
  });
  if (!endpoint || !snapshotUrl) {
    return {
      source: "unconfigured",
      endpoint,
      diagnostic:
        "Detector snapshot endpoint 또는 영상 입력 주소가 없어 live frame을 가져올 수 없습니다.",
    };
  }

  const startedAt = performance.now();
  try {
    const response = await fetch(snapshotUrl, {
      method: "GET",
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(`Snapshot responded with ${response.status}`);
    }

    const buffer = await response.arrayBuffer();
    return {
      source: "snapshot",
      endpoint,
      imageBase64: arrayBufferToBase64(buffer),
      contentType: response.headers.get("content-type") ?? "image/jpeg",
      elapsedMs: Math.round(performance.now() - startedAt),
    };
  } catch (error) {
    return {
      source: "error",
      endpoint,
      elapsedMs: Math.round(performance.now() - startedAt),
      diagnostic: `YOLO live snapshot 조회 실패: ${getErrorMessage(error)}`,
    };
  }
}

export async function requestSudoDetectorStreamStats({
  endpointOverride,
  limit = 80,
  videoSource,
  scenarioId,
  startRatio,
  displayConfidence,
}: {
  endpointOverride?: string;
  limit?: number;
  videoSource?: SudoDetectorVideoSource;
  scenarioId?: number;
  startRatio?: number;
  displayConfidence?: number;
}): Promise<SudoDetectorStreamStatsResult> {
  const endpoint =
    normalizeEndpoint(endpointOverride) ?? getSudoDetectorEndpoint();
  if (!endpoint) {
    return {
      source: "unconfigured",
      endpoint,
      samples: [],
      diagnostic:
        "Detector endpoint가 없어 스트림 신뢰도 시계열을 읽을 수 없습니다.",
    };
  }

  const startedAt = performance.now();
  let timeoutId: number | undefined;

  try {
    const controller = new AbortController();
    const url = new URL(buildSiblingEndpoint(endpoint, "/stream-stats"));
    url.searchParams.set("limit", String(Math.max(1, Math.min(120, limit))));
    if (videoSource?.url.trim()) {
      url.searchParams.set("track", "1");
      url.searchParams.set("url", videoSource.url);
      if (videoSource.playbackUrl) {
        url.searchParams.set("playbackUrl", videoSource.playbackUrl);
      }
      url.searchParams.set("transport", videoSource.transport);
      if (videoSource.label) {
        url.searchParams.set("label", videoSource.label);
      }
    }
    if (scenarioId !== undefined) {
      url.searchParams.set("scenarioId", String(scenarioId));
    }
    if (startRatio !== undefined) {
      url.searchParams.set(
        "startRatio",
        String(normalizeDetectorStartRatio(startRatio))
      );
    }
    const normalizedDisplayConfidence =
      normalizeDetectorDisplayConfidence(displayConfidence);
    if (normalizedDisplayConfidence !== undefined) {
      url.searchParams.set("displayConf", String(normalizedDisplayConfidence));
    }
    const payload = await Promise.race([
      (async () => {
        const response = await fetch(url.toString(), {
          method: "GET",
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(`Stream stats responded with ${response.status}`);
        }

        return (await response.json()) as unknown;
      })(),
      new Promise<never>((_resolve, reject) => {
        timeoutId = window.setTimeout(() => {
          controller.abort();
          reject(
            new Error(`Timed out after ${DEFAULT_STREAM_STATS_TIMEOUT_MS}ms`)
          );
        }, DEFAULT_STREAM_STATS_TIMEOUT_MS);
      }),
    ]);
    const record =
      payload && typeof payload === "object"
        ? (payload as Record<string, unknown>)
        : {};
    const rawSamples = Array.isArray(record.samples) ? record.samples : [];
    const samples = rawSamples
      .map((sample, index) => normalizeStreamConfidenceSample(sample, index))
      .filter(
        (sample): sample is SudoDetectorConfidenceSample => sample !== undefined
      );
    const runtime = normalizeDetectorRuntime(record.runtime, record);

    return {
      source: "stream-stats",
      endpoint,
      model: typeof record.model === "string" ? record.model : undefined,
      mode: typeof record.mode === "string" ? record.mode : undefined,
      device: runtime?.device,
      runtime,
      historyLimit: toFiniteNumber(record.historyLimit ?? record.history_limit),
      sampleCount: toFiniteNumber(record.sampleCount ?? record.sample_count),
      updatedAt: toFiniteNumber(record.updatedAt ?? record.updated_at),
      samples,
      elapsedMs: Math.round(performance.now() - startedAt),
      diagnostic:
        samples.length > 0
          ? undefined
          : "YOLO stream confidence 샘플이 아직 없습니다.",
    };
  } catch (error) {
    return {
      source: "error",
      endpoint,
      samples: [],
      elapsedMs: Math.round(performance.now() - startedAt),
      diagnostic: `YOLO stream confidence 조회 실패: ${getErrorMessage(error)}`,
    };
  } finally {
    if (timeoutId !== undefined) {
      window.clearTimeout(timeoutId);
    }
  }
}

export async function requestSudoDetectorProbe({
  endpointOverride,
  videoSource,
}: {
  endpointOverride?: string;
  videoSource?: SudoDetectorVideoSource;
}): Promise<SudoDetectorProbeResult> {
  const endpoint =
    normalizeEndpoint(endpointOverride) ?? getSudoDetectorEndpoint();
  if (!endpoint || !videoSource?.url.trim()) {
    return {
      source: "unconfigured",
      endpoint,
      reachable: false,
      transport: videoSource?.transport,
      diagnostic: !endpoint
        ? "Detector endpoint가 없어 RTSP 검증을 실행할 수 없습니다."
        : "검증할 영상/RTSP 주소가 없습니다.",
    };
  }

  const startedAt = performance.now();
  try {
    const response = await fetch(buildSiblingEndpoint(endpoint, "/probe"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ videoSource }),
    });

    if (!response.ok) {
      throw new Error(`Probe responded with ${response.status}`);
    }

    const payload = (await response.json()) as Record<string, unknown>;
    const reachable = Boolean(payload.reachable ?? payload.ok);
    const diagnostic =
      typeof payload.message === "string"
        ? payload.message
        : reachable
          ? "영상 입력 주소에 접근 가능합니다."
          : "영상 입력 주소 접근에 실패했습니다.";
    return {
      source: "probe",
      endpoint,
      reachable,
      transport: videoSource.transport,
      elapsedMs: Math.round(performance.now() - startedAt),
      diagnostic: redactSudoMediaDiagnostic(diagnostic, videoSource.url),
    };
  } catch (error) {
    return {
      source: "error",
      endpoint,
      reachable: false,
      transport: videoSource.transport,
      elapsedMs: Math.round(performance.now() - startedAt),
      diagnostic: `RTSP/영상 입력 검증 실패: ${getErrorMessage(error)}`,
    };
  }
}

export async function requestSudoDetectorHealth({
  endpointOverride,
  videoSource,
}: {
  endpointOverride?: string;
  videoSource?: SudoDetectorVideoSource;
}): Promise<SudoDetectorHealthResult> {
  const endpoint =
    normalizeEndpoint(endpointOverride) ?? getSudoDetectorEndpoint();
  if (!endpoint) {
    return {
      source: "unconfigured",
      endpoint,
      adapterReachable: false,
      diagnostic: "Detector endpoint가 없어 상태 확인을 실행할 수 없습니다.",
    };
  }

  const startedAt = performance.now();
  try {
    const response = await fetch(buildSiblingEndpoint(endpoint, "/health"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        videoSource,
      }),
    });

    if (!response.ok) {
      throw new Error(`Health responded with ${response.status}`);
    }

    const payload = (await response.json()) as Record<string, unknown>;
    const adapter =
      payload.adapter && typeof payload.adapter === "object"
        ? (payload.adapter as Record<string, unknown>)
        : {};
    const modelStatus =
      payload.modelStatus && typeof payload.modelStatus === "object"
        ? (payload.modelStatus as Record<string, unknown>)
        : {};
    const camera =
      payload.camera && typeof payload.camera === "object"
        ? (payload.camera as Record<string, unknown>)
        : {};
    const adapterReachable =
      toOptionalBoolean(adapter.reachable) ??
      toOptionalBoolean(payload.ok) ??
      true;
    const modelReady =
      toOptionalBoolean(modelStatus.ready) ??
      toOptionalBoolean(payload.modelReady);
    const cameraReachable =
      toOptionalBoolean(camera.reachable) ??
      toOptionalBoolean(payload.cameraReachable);
    const model =
      typeof modelStatus.name === "string"
        ? modelStatus.name
        : typeof payload.model === "string"
          ? payload.model
          : undefined;
    const mode =
      typeof payload.mode === "string"
        ? payload.mode
        : typeof modelStatus.mode === "string"
          ? modelStatus.mode
          : undefined;
    const runtime = normalizeDetectorRuntime(modelStatus, payload);

    return {
      source: "health",
      endpoint,
      adapterReachable,
      modelReady,
      cameraReachable,
      model,
      mode,
      device: runtime?.device,
      runtime,
      elapsedMs: Math.round(performance.now() - startedAt),
      diagnostic:
        typeof adapter.message === "string"
          ? adapter.message
          : adapterReachable
            ? "Detector adapter에 연결되었습니다."
            : "Detector adapter 응답이 불안정합니다.",
      modelDiagnostic:
        typeof modelStatus.message === "string"
          ? modelStatus.message
          : undefined,
      cameraDiagnostic:
        typeof camera.message === "string"
          ? redactSudoMediaDiagnostic(camera.message, videoSource?.url)
          : undefined,
    };
  } catch (error) {
    return {
      source: "error",
      endpoint,
      adapterReachable: false,
      elapsedMs: Math.round(performance.now() - startedAt),
      diagnostic: `Detector 상태 확인 실패: ${getErrorMessage(error)}`,
    };
  }
}
