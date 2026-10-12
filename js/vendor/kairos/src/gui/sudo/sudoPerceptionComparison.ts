import type { SudoDetectorResult } from "./sudoDetector";
import type { SudoDetectionBox } from "./sudoScenarios";
import type { SudoVlmAnalysis } from "./sudoVlm";

type ComparisonTone = "green" | "amber" | "red" | "blue";

export interface SudoPerceptionComparisonMetric {
  label: string;
  value: string;
  tone: ComparisonTone;
}

export interface SudoPerceptionComparisonReviewItem {
  label: string;
  value: string;
  detail: string;
  tone: ComparisonTone;
}

export interface SudoPerceptionComparison {
  statusLabel: string;
  tone: ComparisonTone;
  summary: string;
  vlmLabel: string;
  detectorLabel?: string;
  labelMatched: boolean;
  vlmConfidencePercent: string;
  detectorConfidencePercent: string;
  confidenceGapPercent?: string;
  bboxDelta: number;
  frameDelta: number;
  metrics: SudoPerceptionComparisonMetric[];
  reviewItems: SudoPerceptionComparisonReviewItem[];
}

function formatPercent(value: number | undefined) {
  if (value === undefined || !Number.isFinite(value)) {
    return "-";
  }

  return `${Math.round(value * 1000) / 10}%`;
}

function averageConfidence(detections: SudoDetectionBox[]) {
  if (detections.length === 0) {
    return undefined;
  }

  return (
    detections.reduce((total, detection) => total + detection.confidence, 0) /
    detections.length
  );
}

function getDominantDetectionLabel(detections: SudoDetectionBox[]) {
  if (detections.length === 0) {
    return undefined;
  }

  const counts = new Map<
    string,
    { label: string; count: number; score: number }
  >();
  detections.forEach((detection) => {
    const key = canonicalizeTargetLabel(detection.label);
    const current = counts.get(key) ?? {
      label: detection.label,
      count: 0,
      score: 0,
    };
    current.count += 1;
    current.score += detection.confidence;
    counts.set(key, current);
  });

  return [...counts.values()].sort(
    (left, right) =>
      right.count - left.count ||
      right.score - left.score ||
      left.label.localeCompare(right.label)
  )[0]?.label;
}

function normalizeLabelText(label: string) {
  return label
    .toLowerCase()
    .replace(/[\s_\-()[\].]/g, "")
    .trim();
}

export function canonicalizeTargetLabel(label: string) {
  const normalized = normalizeLabelText(label);

  if (
    normalized.includes("240") ||
    normalized.includes("m1991") ||
    normalized.includes("tel") ||
    normalized.includes("launcher") ||
    normalized.includes("방사포")
  ) {
    return "240mm방사포";
  }

  if (
    normalized.includes("tank") ||
    normalized.includes("전차") ||
    normalized.includes("mbt")
  ) {
    return "전차";
  }

  if (
    normalized.includes("ammo") ||
    normalized.includes("truck") ||
    normalized.includes("차량") ||
    normalized.includes("탄약")
  ) {
    return "지원차량";
  }

  if (normalized.includes("tube") || normalized.includes("발사관")) {
    return "발사관";
  }

  return normalized;
}

function labelsMatch(vlmLabel: string, detectorLabel: string | undefined) {
  if (!detectorLabel) {
    return false;
  }

  return (
    canonicalizeTargetLabel(vlmLabel) === canonicalizeTargetLabel(detectorLabel)
  );
}

export function buildSudoPerceptionComparison(
  analysis: SudoVlmAnalysis,
  detectorResult: SudoDetectorResult
): SudoPerceptionComparison {
  const detectorLabel = getDominantDetectionLabel(detectorResult.detections);
  const detectorConfidence = averageConfidence(detectorResult.detections);
  const confidenceGap =
    detectorConfidence === undefined
      ? undefined
      : Math.abs(analysis.confidence - detectorConfidence);
  const bboxDelta = Math.abs(
    analysis.detections.length - detectorResult.detections.length
  );
  const frameDelta = Math.abs(analysis.frameCount - detectorResult.frameCount);
  const labelMatched = labelsMatch(analysis.label, detectorLabel);
  const reviewItems = buildReviewItems(
    analysis,
    detectorResult,
    detectorLabel,
    labelMatched,
    detectorConfidence,
    confidenceGap,
    bboxDelta,
    frameDelta
  );

  if (detectorResult.source === "error") {
    return {
      statusLabel: "Detector 오류",
      tone: "red",
      summary:
        detectorResult.diagnostic ??
        "Detector 결과가 오류 상태라 VLM 판단을 우선 표시합니다.",
      vlmLabel: analysis.label,
      detectorLabel,
      labelMatched: false,
      vlmConfidencePercent: formatPercent(analysis.confidence),
      detectorConfidencePercent: formatPercent(detectorConfidence),
      confidenceGapPercent: formatPercent(confidenceGap),
      bboxDelta,
      frameDelta,
      reviewItems,
      metrics: buildComparisonMetrics(
        analysis,
        detectorResult,
        detectorConfidence,
        confidenceGap,
        bboxDelta,
        frameDelta
      ),
    };
  }

  if (!detectorLabel) {
    return {
      statusLabel: "Detector 대기",
      tone: "blue",
      summary:
        "Detector bbox가 없어 Gemma VLM 판단과 내장 시나리오 근거를 우선 사용합니다.",
      vlmLabel: analysis.label,
      detectorLabel,
      labelMatched: false,
      vlmConfidencePercent: formatPercent(analysis.confidence),
      detectorConfidencePercent: formatPercent(detectorConfidence),
      confidenceGapPercent: formatPercent(confidenceGap),
      bboxDelta,
      frameDelta,
      reviewItems,
      metrics: buildComparisonMetrics(
        analysis,
        detectorResult,
        detectorConfidence,
        confidenceGap,
        bboxDelta,
        frameDelta
      ),
    };
  }

  const tone: ComparisonTone = labelMatched ? "green" : "amber";

  return {
    statusLabel: labelMatched ? "교차검증 일치" : "교차검증 검토",
    tone,
    summary: labelMatched
      ? `${analysis.label} 판단과 Detector 주 라벨 ${detectorLabel}가 같은 표적군으로 매칭됩니다.`
      : `${analysis.label} 판단과 Detector 주 라벨 ${detectorLabel}가 달라 추가 확인이 필요합니다.`,
    vlmLabel: analysis.label,
    detectorLabel,
    labelMatched,
    vlmConfidencePercent: formatPercent(analysis.confidence),
    detectorConfidencePercent: formatPercent(detectorConfidence),
    confidenceGapPercent: formatPercent(confidenceGap),
    bboxDelta,
    frameDelta,
    reviewItems,
    metrics: buildComparisonMetrics(
      analysis,
      detectorResult,
      detectorConfidence,
      confidenceGap,
      bboxDelta,
      frameDelta
    ),
  };
}

function buildReviewItems(
  analysis: SudoVlmAnalysis,
  detectorResult: SudoDetectorResult,
  detectorLabel: string | undefined,
  labelMatched: boolean,
  detectorConfidence: number | undefined,
  confidenceGap: number | undefined,
  bboxDelta: number,
  frameDelta: number
): SudoPerceptionComparisonReviewItem[] {
  const items: SudoPerceptionComparisonReviewItem[] = [];

  if (detectorResult.source === "error") {
    items.push({
      label: "Detector 오류",
      value: "확인필요",
      detail:
        detectorResult.diagnostic ??
        "Detector adapter, endpoint, 영상 입력 상태를 확인하세요.",
      tone: "red",
    });
  } else if (!detectorLabel) {
    items.push({
      label: "Detector bbox",
      value: "미수신",
      detail:
        "Detector bbox가 없어 VLM 판단만으로 산출 중입니다. adapter 상태와 입력 프레임을 확인하세요.",
      tone: "blue",
    });
  }

  if (detectorLabel && !labelMatched) {
    items.push({
      label: "라벨 불일치",
      value: `${analysis.label} ↔ ${detectorLabel}`,
      detail:
        "VLM 표적성질과 Detector 주 라벨이 다른 표적군입니다. 프레임 선택과 bbox 라벨을 재확인하세요.",
      tone: "amber",
    });
  }

  if (confidenceGap !== undefined && confidenceGap > 0.15) {
    items.push({
      label: "신뢰도 편차",
      value: formatPercent(confidenceGap),
      detail: `VLM ${formatPercent(analysis.confidence)}와 Detector 평균 ${formatPercent(detectorConfidence)} 사이 편차가 큽니다.`,
      tone: "amber",
    });
  }

  if (bboxDelta > 1) {
    items.push({
      label: "BBOX 수 차이",
      value: `${bboxDelta}건`,
      detail:
        "VLM/Detector 산출 bbox 수 차이가 큽니다. 장비 본체와 세부 부품 bbox가 섞였는지 확인하세요.",
      tone: "amber",
    });
  }

  if (frameDelta > 1) {
    items.push({
      label: "프레임 수 차이",
      value: `${frameDelta}`,
      detail:
        "VLM과 Detector가 서로 다른 프레임 수를 기준으로 판단했습니다. 영상 프레임 요청 수와 adapter 처리 프레임을 확인하세요.",
      tone: "amber",
    });
  }

  return items;
}

function buildComparisonMetrics(
  analysis: SudoVlmAnalysis,
  detectorResult: SudoDetectorResult,
  detectorConfidence: number | undefined,
  confidenceGap: number | undefined,
  bboxDelta: number,
  frameDelta: number
): SudoPerceptionComparisonMetric[] {
  return [
    {
      label: "VLM",
      value: `${analysis.label} · ${formatPercent(analysis.confidence)}`,
      tone: "blue",
    },
    {
      label: "Detector",
      value:
        detectorResult.detections.length > 0
          ? `${detectorResult.detections.length} bbox · ${formatPercent(detectorConfidence)}`
          : detectorResult.source === "error"
            ? "오류"
            : "대기",
      tone:
        detectorResult.source === "error"
          ? "red"
          : detectorResult.detections.length > 0
            ? "green"
            : "blue",
    },
    {
      label: "신뢰도차",
      value: confidenceGap === undefined ? "-" : formatPercent(confidenceGap),
      tone:
        confidenceGap === undefined
          ? "blue"
          : confidenceGap <= 0.15
            ? "green"
            : "amber",
    },
    {
      label: "BBOX차",
      value: `${bboxDelta}건`,
      tone: bboxDelta <= 1 ? "green" : "amber",
    },
    {
      label: "프레임차",
      value: `${frameDelta}`,
      tone: frameDelta <= 1 ? "green" : "amber",
    },
  ];
}
