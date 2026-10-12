import type { SudoDetectorResult } from "./sudoDetector";
import type { SudoVlmAnalysis } from "./sudoVlm";
import { inferSudoTargetFromDetections } from "./sudoTargetLabels";

export function mergeDetectorDetections(
  analysis: SudoVlmAnalysis,
  detectorResult: SudoDetectorResult,
  scenarioId = 0
): SudoVlmAnalysis {
  if (detectorResult.detections.length === 0) {
    return analysis;
  }

  const detectorLabel = detectorResult.model ?? "detector";
  const targetInference = inferSudoTargetFromDetections(
    detectorResult.detections,
    scenarioId
  );
  const prefersDetectorScaleInference =
    scenarioId === 3 && Boolean(targetInference);
  const shouldPromoteDetector =
    Boolean(targetInference) &&
    (prefersDetectorScaleInference ||
      analysis.source === "unavailable" ||
      analysis.confidence <= 0 ||
      /미분류|unknown|unclassified/i.test(analysis.label));
  const promotedLabel =
    shouldPromoteDetector && targetInference
      ? targetInference.label
      : analysis.label;
  const detectorEvidence = targetInference?.evidence
    ? `${detectorLabel} ${targetInference.evidence}`
    : `${detectorLabel} bbox ${detectorResult.detections.length}건을 우선 적용`;
  const detectorSummary =
    shouldPromoteDetector && targetInference
      ? `${targetInference.evidence} 기준으로 ${targetInference.label} 판단을 보강했습니다.`
      : undefined;
  const detectorOnlyGenericVehicle =
    scenarioId === 2 && targetInference?.label === "차량 후보";
  const analysisLooksLikeRocketArtillery =
    /240|방사포|mrl|mlrs|tel|launcher|발사관/i.test(analysis.label);
  const shouldCapGenericVehicleCertainty =
    detectorOnlyGenericVehicle &&
    analysisLooksLikeRocketArtillery &&
    analysis.confidence > 0.85;
  const mergedConfidence =
    shouldPromoteDetector && targetInference
      ? Math.max(analysis.confidence, targetInference.confidence)
      : shouldCapGenericVehicleCertainty && targetInference
        ? Math.min(
            analysis.confidence,
            Math.max(0.55, targetInference.confidence)
          )
        : analysis.confidence;
  const genericVehicleCaution =
    shouldCapGenericVehicleCertainty && targetInference
      ? `Detector는 ${targetInference.evidence} 수준이라 방사포 확정 신뢰도를 detector 후보 confidence로 제한했습니다.`
      : undefined;
  const keepAnalysisSummary =
    !prefersDetectorScaleInference ||
    (analysis.confidence > 0 &&
      !/unknown|unclassified|coherent request|미분류|결과가 아직/i.test(
        analysis.summary
      ));

  return {
    ...analysis,
    label: promotedLabel,
    confidence: mergedConfidence,
    summary: detectorSummary
      ? keepAnalysisSummary
        ? `${detectorSummary} ${analysis.summary}`.trim()
        : detectorSummary
      : genericVehicleCaution
        ? `${genericVehicleCaution} ${analysis.summary}`.trim()
        : analysis.summary,
    detections: detectorResult.detections,
    source:
      shouldPromoteDetector && analysis.source === "unavailable"
        ? "detector"
        : analysis.source,
    inputKind:
      analysis.inputKind === "none" && detectorResult.frameCount > 0
        ? "video-frames"
        : analysis.inputKind,
    frameCount: Math.max(analysis.frameCount, detectorResult.frameCount),
    diagnostic:
      shouldPromoteDetector && analysis.diagnostic
        ? `Gemma VLM 결과가 없거나 미분류라 Detector bbox 근거로 보강했습니다. ${analysis.diagnostic}`
        : analysis.diagnostic,
    evidence: [
      detectorEvidence,
      ...(genericVehicleCaution ? [genericVehicleCaution] : []),
      ...analysis.evidence,
    ],
  };
}
