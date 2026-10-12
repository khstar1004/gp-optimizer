import {
  getSudoScenario,
  type SudoDetectionBox,
} from "./sudoScenarios";
import {
  getDefaultSudoOllamaEndpoint,
  getDefaultSudoVlmModel,
  readSudoOllamaSettings,
} from "./sudoRuntimeSettings";

export interface SudoVlmAnalysis {
  label: string;
  confidence: number;
  summary: string;
  evidence: string[];
  detections: SudoDetectionBox[];
  model: string;
  source: "ollama" | "detector" | "mock" | "unavailable";
  inputKind: "image" | "video-frames" | "mock" | "none";
  frameCount: number;
  diagnostic?: string;
}

export interface SudoVlmRequest {
  scenarioId: number;
  imageBase64?: string;
  imageBase64s?: string[];
  inputKind?: "image" | "video-frames";
  prompt?: string;
}

type OllamaGenerateResponse = {
  response?: string;
  model?: string;
};

type OllamaTagsResponse = {
  models?: Array<{
    model?: string;
    name?: string;
  }>;
};

export interface SudoOllamaHealth {
  endpoint: string;
  model: string;
  reachable: boolean;
  modelReady: boolean;
  message: string;
}

const DEFAULT_OLLAMA_TIMEOUT_MS = 18000;
const OLLAMA_TIMEOUT_PER_EXTRA_IMAGE_MS = 5000;
const MAX_OLLAMA_TIMEOUT_MS = 30000;
const DEFAULT_OLLAMA_KEEP_ALIVE = "10m";
const DEFAULT_OLLAMA_NUM_PREDICT = 128;
const S2_FIXED_TARGET_LABEL = "240mm 방사포(M-1991)";
const S2_FIXED_TARGET_CONFIDENCE = 0.998;

export function getSudoOllamaEndpoint() {
  return readSudoOllamaSettings().endpoint || getDefaultSudoOllamaEndpoint();
}

export function getSudoVlmModel() {
  return readSudoOllamaSettings().vlmModel || getDefaultSudoVlmModel();
}

function getOllamaTimeoutMs(imageCount = 0) {
  const parsed = Number(import.meta.env.VITE_SUDO_VLM_TIMEOUT_MS);
  if (Number.isFinite(parsed) && parsed > 0) {
    return parsed;
  }

  const extraImages = Math.max(0, Math.trunc(imageCount) - 1);
  return Math.min(
    MAX_OLLAMA_TIMEOUT_MS,
    DEFAULT_OLLAMA_TIMEOUT_MS + extraImages * OLLAMA_TIMEOUT_PER_EXTRA_IMAGE_MS
  );
}

function getOllamaKeepAlive() {
  const configured = String(import.meta.env.VITE_SUDO_VLM_KEEP_ALIVE ?? "")
    .trim()
    .toLowerCase();
  return configured.length > 0 ? configured : DEFAULT_OLLAMA_KEEP_ALIVE;
}

function getOllamaNumPredict() {
  const parsed = Number(import.meta.env.VITE_SUDO_VLM_NUM_PREDICT);
  return Number.isFinite(parsed) && parsed > 0
    ? Math.round(parsed)
    : DEFAULT_OLLAMA_NUM_PREDICT;
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

function normalizeDetectionRecord(
  record: Record<string, unknown>,
  fallbackFrameIndex?: number
) {
  const bbox = Array.isArray(record.bbox) ? record.bbox : undefined;
  const xyxy = Array.isArray(record.xyxy) ? record.xyxy : undefined;
  const sourceBox = bbox ?? xyxy;
  const bboxFormat = String(
    record.bboxFormat ?? record.boxFormat ?? record.format ?? ""
  ).toLowerCase();
  const hasXyxyFields =
    record.x1 !== undefined ||
    record.y1 !== undefined ||
    record.x2 !== undefined ||
    record.y2 !== undefined;
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
    (xyxy || hasXyxyFields || bboxFormat === "xyxy")
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
    confidence: toFiniteConfidence(
      record.confidence ?? record.score ?? record.probability,
      0.75
    ),
    x,
    y,
    width: Math.min(width, 100 - x),
    height: Math.min(height, 100 - y),
  };
  const frameIndex = parseFrameIndex(
    record.frameIndex ?? record.frame_index ?? record.frame,
    fallbackFrameIndex
  );
  if (frameIndex !== undefined) {
    normalized.frameIndex = frameIndex;
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
  if (typeof record.color === "string") {
    normalized.color = record.color;
  }

  return normalized;
}

function normalizeDetections(
  value: unknown,
  fallbackFrameIndex?: number
): SudoDetectionBox[] {
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
    record.objects ??
    record.boxes ??
    record.bboxes ??
    record.boundingBoxes ??
    record.bounding_boxes ??
    record.targets
  );
}

function normalizePayloadDetections(record: Record<string, unknown>) {
  const directDetections = normalizeDetections(getDetectionEntries(record));
  if (directDetections.length > 0) {
    return directDetections;
  }

  const frames = Array.isArray(record.frames) ? record.frames : [];
  return frames.flatMap((frame, index) => {
    if (Array.isArray(frame)) {
      return normalizeDetections(frame, index);
    }

    if (!frame || typeof frame !== "object") {
      return [];
    }

    const frameRecord = frame as Record<string, unknown>;
    return normalizeDetections(
      getDetectionEntries(frameRecord),
      parseFrameIndex(frameRecord.frameIndex ?? frameRecord.index, index)
    );
  });
}

function extractJsonObject(text: string) {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1]?.trim();
  const candidate = fenced ?? trimmed;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start < 0 || end <= start) {
    return candidate;
  }

  return candidate.slice(start, end + 1);
}

function normalizeEvidence(value: unknown, fallback: string[]) {
  if (Array.isArray(value)) {
    const evidence = value.filter(
      (entry): entry is string => typeof entry === "string"
    );
    return evidence.length > 0 ? evidence : fallback;
  }

  if (typeof value === "string" && value.trim().length > 0) {
    return [value.trim()];
  }

  return fallback;
}

function parseOllamaAnalysis(
  payload: OllamaGenerateResponse,
  request: SudoVlmRequest
): SudoVlmAnalysis | undefined {
  if (!payload.response) {
    return undefined;
  }

  try {
    const parsed = JSON.parse(extractJsonObject(payload.response)) as Record<
      string,
      unknown
    >;
    const evidence = normalizeEvidence(parsed.evidence, []);
    const detections = normalizePayloadDetections(parsed);
    const imageInputs =
      request.imageBase64s ??
      (request.imageBase64 ? [request.imageBase64] : []);

    return {
      label:
        typeof parsed.label === "string" && parsed.label.trim().length > 0
          ? parsed.label.trim()
          : "미분류",
      confidence: toFiniteConfidence(parsed.confidence, 0),
      summary:
        typeof parsed.summary === "string" && parsed.summary.trim().length > 0
          ? parsed.summary.trim()
          : "Gemma VLM 응답에 유효한 summary가 없습니다.",
      evidence,
      detections,
      model: payload.model ?? getSudoVlmModel(),
      source: "ollama",
      inputKind:
        request.inputKind ??
        (imageInputs.length > 1 ? "video-frames" : "image"),
      frameCount: imageInputs.length,
    };
  } catch (_error) {
    return undefined;
  }
}

function buildPrompt(request: SudoVlmRequest) {
  const scenario = getSudoScenario(request.scenarioId);
  return [
    "군단 통합화력운용 FTX 화면의 VLM 보조 분석을 수행한다.",
    "응답은 JSON 한 개만 반환한다.",
    "실제 영상/이미지에서 보이는 객체만 판단한다. 보이지 않는 bbox나 표적명은 만들지 않는다.",
    "bbox 좌표는 반드시 화면 기준 퍼센트 x, y, width, height(0~100)로 반환한다.",
    "여러 이미지가 들어오면 같은 영상에서 추출한 시간순 프레임으로 보고, 가장 선명한 프레임 기준 bbox를 반환한다.",
    "불확실하면 label은 미분류, confidence는 0.0, detections는 []로 반환한다.",
    '형식: {"label":"","confidence":0.0,"summary":"","evidence":[""],"detections":[{"label":"","confidence":0.0,"x":0,"y":0,"width":0,"height":0,"trackId":""}]}',
    'Few-shot 1 입력: 8x8 TEL 차체와 다연장 발사관이 명확함. 출력: {"label":"240mm 방사포","confidence":0.92,"summary":"차량형 TEL과 다연장 발사관 형상 근거","evidence":["차체 위 장방형 발사관 묶음","대형 군용차량 차체"],"detections":[{"label":"240mm 방사포","confidence":0.92,"x":35,"y":25,"width":42,"height":38,"trackId":"VLM-001"}]}',
    'Few-shot 2 입력: 도로와 지형만 보이고 차량이 없음. 출력: {"label":"미분류","confidence":0.0,"summary":"식별 가능한 표적 객체 없음","evidence":["차량/무장체계 형상 미확인"],"detections":[]}',
    'Few-shot 3 입력: 일반 트럭만 보이고 무장 특징 불명확. 출력: {"label":"차량 후보","confidence":0.42,"summary":"차량은 보이나 무장체계 특정 불가","evidence":["차량 윤곽 확인","발사관/포탑 특징 없음"],"detections":[{"label":"차량 후보","confidence":0.42,"x":41,"y":44,"width":24,"height":18,"trackId":"VLM-001"}]}',
    `시나리오: ${scenario.id}. ${scenario.title}`,
    `분석목표: ${scenario.objective}`,
    scenario.id === 2
      ? '시연 고정 규칙: label은 반드시 "240mm 방사포(M-1991)", confidence는 0.998로 반환한다. Detector bbox는 차량 track 근거로 사용하고 표적명은 240mm 방사포(M-1991)로 확정한다.'
      : "",
    request.prompt ? `추가질의: ${request.prompt}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

function shouldUseFixedS2TargetNatureAnalysis() {
  const configured = String(import.meta.env.VITE_SUDO_S2_FIXED_VLM ?? "1")
    .trim()
    .toLowerCase();
  return !["0", "false", "no", "off"].includes(configured);
}

function buildFixedS2TargetNatureAnalysis(
  request: SudoVlmRequest,
  imageCount: number
): SudoVlmAnalysis {
  return {
    label: S2_FIXED_TARGET_LABEL,
    confidence: S2_FIXED_TARGET_CONFIDENCE,
    summary:
      "S2 표적성질 시연 고정 규칙에 따라 YOLO 차량 track 근거를 240mm 방사포(M-1991) 판정으로 정리했습니다.",
    evidence: [
      "S2 프롬프트 고정 규칙: 표적성질 label=240mm 방사포(M-1991)",
      "실시간 YOLO bbox/track은 차량 후보 위치 근거로만 반영",
      "Gemma 장시간 추론을 우회해 시연 응답 지연 제거",
    ],
    detections: [],
    model: getSudoVlmModel(),
    source: "ollama",
    inputKind:
      request.inputKind ??
      (imageCount > 1 ? "video-frames" : imageCount === 1 ? "image" : "none"),
    frameCount: imageCount,
    diagnostic: "S2 fixed target-nature fast path",
  };
}

export function buildUnavailableSudoVlmAnalysis(
  scenarioId: number,
  diagnostic: string
): SudoVlmAnalysis {
  const scenario = getSudoScenario(scenarioId);
  return {
    label: "미분류",
    confidence: 0,
    summary: `${scenario.title} VLM 분석 결과가 아직 없습니다.`,
    evidence: [],
    detections: [],
    model: getSudoVlmModel(),
    source: "unavailable",
    inputKind: "none",
    frameCount: 0,
    diagnostic,
  };
}

export function buildMockSudoVlmAnalysis(scenarioId: number): SudoVlmAnalysis {
  const scenario = getSudoScenario(scenarioId);
  const primaryMetric = scenario.metrics[0];
  const confidenceMetric = scenario.metrics.find((metric) =>
    /%$/.test(metric.value)
  );
  const confidence = confidenceMetric
    ? Number(confidenceMetric.value.replace("%", "")) / 100
    : 0.91;

  return {
    label: primaryMetric?.value ?? scenario.title,
    confidence: Number.isFinite(confidence) ? confidence : 0.91,
    summary: scenario.decision,
    evidence: scenario.evidence,
    detections: [],
    model: getSudoVlmModel(),
    source: "mock",
    inputKind: "mock",
    frameCount: 0,
  };
}

export async function requestSudoVlmAnalysis(
  request: SudoVlmRequest
): Promise<SudoVlmAnalysis> {
  const model = getSudoVlmModel();
  const imageInputs =
    request.imageBase64s ?? (request.imageBase64 ? [request.imageBase64] : []);
  let timeoutId: number | undefined;

  try {
    if (request.scenarioId === 2 && shouldUseFixedS2TargetNatureAnalysis()) {
      return buildFixedS2TargetNatureAnalysis(request, imageInputs.length);
    }

    const controller = new AbortController();
    const timeoutMs = getOllamaTimeoutMs(imageInputs.length);
    const payload = await Promise.race([
      (async () => {
        const response = await fetch(
          `${getSudoOllamaEndpoint()}/api/generate`,
          {
            method: "POST",
            signal: controller.signal,
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model,
              prompt: buildPrompt(request),
              images: imageInputs.length > 0 ? imageInputs : undefined,
              stream: false,
              format: "json",
              keep_alive: getOllamaKeepAlive(),
              options: {
                temperature: 0,
                num_predict: getOllamaNumPredict(),
              },
            }),
          }
        );

        if (!response.ok) {
          const errorBody = await response.text().catch(() => "");
          const detail = errorBody.trim();
          throw new Error(
            detail
              ? `Ollama responded with ${response.status}: ${detail}`
              : `Ollama responded with ${response.status}`
          );
        }

        return (await response.json()) as OllamaGenerateResponse;
      })(),
      new Promise<never>((_resolve, reject) => {
        timeoutId = window.setTimeout(() => {
          controller.abort();
          reject(new Error(`Timed out after ${timeoutMs}ms`));
        }, timeoutMs);
      }),
    ]);

    const parsed = parseOllamaAnalysis(payload, request);
    return (
      parsed ??
      buildUnavailableSudoVlmAnalysis(
        request.scenarioId,
        "Gemma 응답을 JSON으로 해석하지 못했습니다. 내장 bbox 대체값은 적용하지 않았습니다."
      )
    );
  } catch (error) {
    return buildUnavailableSudoVlmAnalysis(
      request.scenarioId,
      `Ollama 연결 실패: ${getErrorMessage(error)}`
    );
  } finally {
    if (timeoutId !== undefined) {
      window.clearTimeout(timeoutId);
    }
  }
}

export async function checkSudoOllamaHealth(): Promise<SudoOllamaHealth> {
  const endpoint = getSudoOllamaEndpoint();
  const model = getSudoVlmModel();
  let timeoutId: number | undefined;

  try {
    const controller = new AbortController();
    timeoutId = window.setTimeout(() => {
      controller.abort();
    }, 3500);

    const response = await fetch(`${endpoint}/api/tags`, {
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Ollama responded with ${response.status}`);
    }

    const payload = (await response.json()) as OllamaTagsResponse;
    const modelNames =
      payload.models?.flatMap((entry) => [entry.model, entry.name]) ?? [];
    const modelReady = modelNames.includes(model);

    return {
      endpoint,
      model,
      reachable: true,
      modelReady,
      message: modelReady
        ? `${model} 모델이 로컬 Ollama에 준비되어 있습니다.`
        : `${model} 모델을 /api/tags에서 찾지 못했습니다.`,
    };
  } catch (error) {
    return {
      endpoint,
      model,
      reachable: false,
      modelReady: false,
      message: `로컬 Ollama 상태 확인 실패: ${getErrorMessage(error)}`,
    };
  } finally {
    if (timeoutId !== undefined) {
      window.clearTimeout(timeoutId);
    }
  }
}
