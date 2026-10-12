import {
  getSudoDecisionOutput,
  type SudoDecisionOutput,
  type SudoDecisionInputState,
  type SudoPerceptionDecisionInput,
} from "./sudoDecisionEngine";
import {
  buildSudoDataEnhancementIdeaSummary,
  getCoreSudoDataEnhancementIdeas,
  getSudoScenarioDataIntel,
} from "./sudoDataIntel";
import { normalizeSudoDecisionInputs } from "./sudoOperationalData";
import { sudoScenarios } from "./sudoScenarios";
import {
  buildSudoScenarioSourceBindingSummary,
  buildSudoScenarioSourceDecisionBindings,
} from "./sudoScenarioSourceBindings";
import {
  buildFallbackSudoScenarioSourceStage,
  formatSudoScenarioImplementationLevel,
  mergeSudoScenarioSourceValues,
} from "./sudoScenarioSourceData";
import {
  SUDO_DATA_EXTRACTION_SUMMARY,
  buildSudoDataExtractionHealthSummary,
  buildSudoDataExtractionIssueSummary,
  buildSudoDataExtractionRoleSummary,
} from "./sudoDataExtractionIntel";
import {
  buildSudoScenarioSourceInputPatchSuggestions,
  buildSudoScenarioSourceInputPatchSummary,
} from "./sudoScenarioSourceInputPatches";
import {
  formatSudoSourceDisplayLabel,
  summarizeSudoSourceDisplayValues,
} from "./sudoSourceDisplay";
import {
  readLatestSudoAnalysisLogItems,
  readLatestSudoAnalysisResultCommand,
  readLatestSudoDroneRedeploymentCommand,
  type SudoAnalysisResultCommand,
} from "./sudoWindowSync";
import {
  buildSudoDetectionTrackSummary,
  smoothSudoDetectionsByTrack,
} from "./sudoDetectionTimeline";
import type { SudoDetectionBox } from "./sudoScenarios";

export type SudoProgressStatus = "done" | "draft" | "pending";
export interface SudoProgressItem {
  scenario: (typeof sudoScenarios)[number];
  status: SudoProgressStatus;
  required: boolean;
  statusReason: string;
  nextAction: string;
}
type SudoProgressSummaryItem = Pick<
  SudoProgressItem,
  "scenario" | "status" | "required"
> &
  Partial<Pick<SudoProgressItem, "statusReason" | "nextAction">>;

interface PersistedScenarioState {
  analysis?: {
    label?: string;
    confidence?: number;
    source?: string;
    model?: string;
    summary?: string;
    frameCount?: number;
    detections?: unknown[];
  };
  detectorResult?: {
    source?: string;
    model?: string;
    detections?: unknown[];
    endpoint?: string;
  };
  detectorHealth?: {
    source?: string;
    endpoint?: string;
    adapterReachable?: boolean;
    modelReady?: boolean;
    cameraReachable?: boolean;
    mode?: string;
    model?: string;
    diagnostic?: string;
    modelDiagnostic?: string;
    cameraDiagnostic?: string;
    elapsedMs?: number;
  };
  ollamaHealth?: {
    endpoint?: string;
    model?: string;
    reachable?: boolean;
    modelReady?: boolean;
    message?: string;
    elapsedMs?: number;
  };
  decisionInputs?: Partial<SudoDecisionInputState>;
  operatorReview?: {
    status?: string;
    label?: string;
    originalLabel?: string;
    overrideLabel?: string;
    note?: string;
    updatedAt?: string;
  };
  assistantQuestion?: string;
  assistantReply?: string;
  updatedAt?: string;
}

const SUDO_SUB_STATE_KEY_PREFIX = "sudo.sub.scenario-state.v1.";
const REQUIRED_SCENARIO_IDS = new Set(
  sudoScenarios
    .filter((scenario) => scenario.implementationLevel === "필수 구현")
    .map((scenario) => scenario.id)
);
const DECISION_EVIDENCE_SCENARIO_IDS = new Set([
  3, 4, 5, 7, 8, 9, 11, 12, 13, 14,
]);

function readScenarioState(scenarioId: number) {
  if (typeof window === "undefined") {
    return undefined;
  }

  try {
    const raw = window.localStorage.getItem(
      `${SUDO_SUB_STATE_KEY_PREFIX}${scenarioId}`
    );
    return raw ? (JSON.parse(raw) as PersistedScenarioState) : undefined;
  } catch (_error) {
    return undefined;
  }
}

function normalizeDecisionInputs(
  inputs?: Partial<SudoDecisionInputState>
): SudoDecisionInputState {
  return normalizeSudoDecisionInputs(inputs);
}

function hasStoredScenarioWork(state: PersistedScenarioState | undefined) {
  return Boolean(
    state?.updatedAt ||
      state?.analysis ||
      state?.detectorResult ||
      state?.detectorHealth ||
      state?.ollamaHealth ||
      state?.decisionInputs ||
      state?.operatorReview ||
      state?.assistantQuestion ||
      state?.assistantReply
  );
}

function getOperatorReviewStatusLabel(status: string | undefined) {
  if (status === "confirmed") {
    return "작전확정";
  }

  if (status === "needs-review") {
    return "재검토";
  }

  return status ? "미확정" : "";
}

function hasAssistantResponse(state: PersistedScenarioState | undefined) {
  return Boolean(state?.assistantReply?.trim());
}

function isLatestAnalysisForScenario(
  latestAnalysis: SudoAnalysisResultCommand | undefined,
  scenarioId: number
) {
  return latestAnalysis?.scenarioId === scenarioId ? latestAnalysis : undefined;
}

function hasOllamaAnalysis(
  scenarioId: number,
  state: PersistedScenarioState | undefined,
  latestAnalysis: SudoAnalysisResultCommand | undefined
) {
  return (
    state?.analysis?.source === "ollama" ||
    isLatestAnalysisForScenario(latestAnalysis, scenarioId)?.source === "ollama"
  );
}

function getDetectorBboxCount(
  scenarioId: number,
  state: PersistedScenarioState | undefined,
  latestAnalysis: SudoAnalysisResultCommand | undefined
) {
  const storedDetectorCount =
    state?.detectorResult?.source === "detector"
      ? (state.detectorResult.detections?.length ?? 0)
      : 0;
  const latest = isLatestAnalysisForScenario(latestAnalysis, scenarioId);
  const latestDetectorCount =
    latest?.detectorSource === "detector" ? latest.bboxCount : 0;

  return Math.max(storedDetectorCount, latestDetectorCount);
}

function getAnyBboxCount(
  scenarioId: number,
  state: PersistedScenarioState | undefined,
  latestAnalysis: SudoAnalysisResultCommand | undefined
) {
  return Math.max(
    getDetectorBboxCount(scenarioId, state, latestAnalysis),
    state?.analysis?.detections?.length ?? 0,
    isLatestAnalysisForScenario(latestAnalysis, scenarioId)?.bboxCount ?? 0
  );
}

function hasDecisionEvidence(
  scenarioId: number,
  state: PersistedScenarioState | undefined
) {
  if (!state?.updatedAt) {
    return false;
  }

  const inputs = normalizeDecisionInputs(state.decisionInputs);
  const output = getSudoDecisionOutput(scenarioId, inputs);
  if (!output?.summary) {
    return false;
  }

  if (scenarioId !== 12) {
    return true;
  }

  return inputs.firePlanRows.some(
    (row) => row.time && row.asset && row.action && row.effect
  );
}

function buildRequiredScenarioEvaluation(
  scenarioId: number,
  state: PersistedScenarioState | undefined,
  latestAnalysis: SudoAnalysisResultCommand | undefined
): Pick<SudoProgressItem, "status" | "statusReason" | "nextAction"> {
  const hasWork = hasStoredScenarioWork(state);

  if (scenarioId === 1) {
    if (state?.updatedAt) {
      return {
        status: "done",
        statusReason: "드론 표적 식별 화면 상태가 저장되었습니다.",
        nextAction: "표적성질분석으로 진행",
      };
    }

    return {
      status: hasWork ? "draft" : "pending",
      statusReason: hasWork
        ? "표적 식별 화면 일부 상태가 저장되어 확인 중입니다."
        : "드론 표적 식별 화면 확인이 아직 필요합니다.",
      nextAction: "주 화면 표적 경보 확인 후 S1 부 화면을 열어 상태 저장",
    };
  }

  if (scenarioId === 2) {
    const hasVlm = hasOllamaAnalysis(scenarioId, state, latestAnalysis);
    const detectorBboxCount = getDetectorBboxCount(
      scenarioId,
      state,
      latestAnalysis
    );
    const done = hasVlm && detectorBboxCount > 0;
    if (done) {
      return {
        status: "done",
        statusReason: `Gemma VLM 분석과 Detector bbox ${detectorBboxCount}건이 확보되었습니다.`,
        nextAction: "탄종/발수 판단으로 결과 이관",
      };
    }

    if (hasVlm && detectorBboxCount === 0) {
      return {
        status: "draft",
        statusReason:
          "Gemma VLM 분석은 완료됐지만 Detector bbox 근거가 없습니다.",
        nextAction: "Detector/영상 입력 사전점검 후 분석 재실행",
      };
    }

    if (!hasVlm && detectorBboxCount > 0) {
      return {
        status: "draft",
        statusReason: `Detector bbox ${detectorBboxCount}건은 있으나 Gemma VLM 판독이 필요합니다.`,
        nextAction: "영상 프레임->Gemma 분석 실행",
      };
    }

    return {
      status: hasWork ? "draft" : "pending",
      statusReason: hasWork
        ? "표적성질분석 입력 또는 상태만 저장되어 있습니다."
        : "표적성질분석 실행 전입니다.",
      nextAction: "사전점검 후 영상 프레임->Gemma 분석 실행",
    };
  }

  if (scenarioId === 6) {
    const hasResponse = hasAssistantResponse(state);
    if (hasResponse) {
      return {
        status: "done",
        statusReason: "Army GPT 질의응답 결과가 저장되었습니다.",
        nextAction: "취약점 답변을 표적성질 판단근거에 첨부",
      };
    }

    return {
      status: hasWork ? "draft" : "pending",
      statusReason: hasWork
        ? "AI 어시스턴트 질문 또는 답변이 아직 완성되지 않았습니다."
        : "AI 어시스턴트 질의응답 실행 전입니다.",
      nextAction: "질의 실행으로 취약점 답변 생성",
    };
  }

  if (DECISION_EVIDENCE_SCENARIO_IDS.has(scenarioId)) {
    const done = hasDecisionEvidence(scenarioId, state);
    if (done) {
      return {
        status: "done",
        statusReason:
          scenarioId === 13
            ? "R/D 체크리스트와 타출처 정보융합 판단 산출물이 저장되었습니다."
            : scenarioId === 14
              ? "타격결과 영상 기반 BDA 산출물이 저장되었습니다."
              : "판단근거 보조창 입력과 최종 판단 산출물이 저장되었습니다.",
        nextAction:
          scenarioId === 13
            ? "허상표적 판단을 보고서에 반영"
            : scenarioId === 14
              ? "재타격 판단을 보고서에 반영"
              : "다음 필수 판단 단계로 진행",
      };
    }

    return {
      status: hasWork ? "draft" : "pending",
      statusReason: hasWork
        ? "판단 입력 일부가 저장됐지만 완료 조건을 아직 충족하지 못했습니다."
        : "판단근거 보조창 확인이 아직 필요합니다.",
      nextAction:
        scenarioId === 12
          ? "통합화력운용도표 입력값과 타격계획 행 확인"
          : scenarioId === 3
            ? "장비대수와 행군장경 판단값 확인"
            : scenarioId === 4
              ? "전투서열 후보 거리/화포/방향 점수 확인"
              : scenarioId === 5
                ? "민가 이격거리와 탄종별 효과반경 확인"
                : scenarioId === 9
                  ? "사태분석도 후보 감시율/공백/화력연계 확인"
                  : scenarioId === 11
                    ? "TAI 도착시간과 가용자산 시간표 확인"
                    : scenarioId === 13
                      ? "R/D 진지와 지휘소 체크리스트 실존·허상 근거 확인"
                      : scenarioId === 14
                        ? "타격결과 피해율과 잔여표적 기준 확인"
                        : "판단근거 보조창에서 표/입력값 확인",
    };
  }

  if (scenarioId === 10) {
    if (hasAssistantResponse(state)) {
      return {
        status: "draft",
        statusReason:
          "AI 어시스턴트 응답은 저장됐지만 드론 재배치 명령 확인이 필요합니다.",
        nextAction: "질의 실행 후 주 화면 드론 재배치 오버레이 확인",
      };
    }

    return {
      status: hasWork ? "draft" : "pending",
      statusReason: hasWork
        ? "감시자산 재배치 입력 또는 답변 일부가 저장되어 있습니다."
        : "감시자산 재배치 명령 실행 전입니다.",
      nextAction: "AI 어시스턴트 질의 실행으로 재배치 명령 하달",
    };
  }

  return {
    status: hasWork ? "draft" : "pending",
    statusReason: hasWork
      ? "필수 시나리오 상태가 저장되어 검토 중입니다."
      : "필수 시나리오 실행 전입니다.",
    nextAction: "부 화면에서 시나리오 처리",
  };
}

function buildScenarioEvaluation(
  scenarioId: number
): Pick<SudoProgressItem, "status" | "statusReason" | "nextAction"> {
  const latestAnalysis = readLatestSudoAnalysisResultCommand();
  const redeployment = readLatestSudoDroneRedeploymentCommand();
  const scenario = sudoScenarios.find((item) => item.id === scenarioId);
  if (scenarioId === 10 && redeployment?.orders.length) {
    return {
      status: "done",
      statusReason: `드론 재배치 명령 ${redeployment.orders.length}건이 하달되었습니다.`,
      nextAction: "재배치 상황 주 화면 추적",
    };
  }

  const state = readScenarioState(scenarioId);
  if (state?.operatorReview?.status === "needs-review") {
    return {
      status: "draft",
      statusReason: `${state.operatorReview.label ?? scenario?.title ?? "시나리오"} 결과가 운영자 재검토로 표시되었습니다.`,
      nextAction: "AI 교차검증 확인항목 검토 후 결과 확정",
    };
  }

  if (REQUIRED_SCENARIO_IDS.has(scenarioId)) {
    return buildRequiredScenarioEvaluation(scenarioId, state, latestAnalysis);
  }

  if (scenario?.visualKind === "assistant") {
    if (hasAssistantResponse(state)) {
      return {
        status: "done",
        statusReason: "Army GPT 질의응답 결과가 저장되었습니다.",
        nextAction: "취약점 답변을 표적성질 판단근거에 첨부",
      };
    }

    return {
      status: hasStoredScenarioWork(state) ? "draft" : "pending",
      statusReason: hasStoredScenarioWork(state)
        ? "AI 어시스턴트 질문 또는 답변이 아직 완성되지 않았습니다."
        : "AI 어시스턴트 질의응답 실행 전입니다.",
      nextAction: "질의 실행으로 취약점 답변 생성",
    };
  }

  if (scenario?.visualKind === "reposition" && hasAssistantResponse(state)) {
    return {
      status: "draft",
      statusReason:
        "AI 어시스턴트 응답은 저장됐지만 드론 재배치 명령 확인이 필요합니다.",
      nextAction: "질의 실행 후 주 화면 드론 재배치 오버레이 확인",
    };
  }

  if (DECISION_EVIDENCE_SCENARIO_IDS.has(scenarioId)) {
    return buildRequiredScenarioEvaluation(scenarioId, state, latestAnalysis);
  }

  if (isLatestAnalysisForScenario(latestAnalysis, scenarioId)) {
    return {
      status: "done",
      statusReason: "최신 부 화면 분석 결과가 주 화면으로 연동되었습니다.",
      nextAction: "보고서 반영",
    };
  }

  if (!state) {
    return {
      status: "pending",
      statusReason: "시나리오 처리 전입니다.",
      nextAction: "부 화면에서 시나리오 선택",
    };
  }

  if (
    state.analysis?.source === "ollama" ||
    state.detectorResult?.source === "detector" ||
    (state.detectorResult?.detections?.length ?? 0) > 0
  ) {
    return {
      status: "done",
      statusReason: "분석 또는 Detector 결과가 저장되었습니다.",
      nextAction: "보고서 반영",
    };
  }

  return {
    status: state.updatedAt ? "draft" : "pending",
    statusReason: state.updatedAt
      ? "시나리오 입력 상태가 저장되어 검토 중입니다."
      : "시나리오 처리 전입니다.",
    nextAction: "부 화면에서 판단근거 확인",
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function readStringField(record: Record<string, unknown>, key: string) {
  const value = record[key];
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : undefined;
}

function readNumberField(record: Record<string, unknown>, key: string) {
  const value = Number(record[key]);
  return Number.isFinite(value) ? value : undefined;
}

function normalizeReportDetection(
  detection: unknown
): SudoDetectionBox | undefined {
  if (!isRecord(detection)) {
    return undefined;
  }

  const label =
    readStringField(detection, "label") ??
    readStringField(detection, "className") ??
    readStringField(detection, "class") ??
    readStringField(detection, "name");

  if (!label) {
    return undefined;
  }

  return {
    label,
    rawLabel: readStringField(detection, "rawLabel"),
    confidence:
      readNumberField(detection, "confidence") ??
      readNumberField(detection, "score") ??
      0,
    x: readNumberField(detection, "x") ?? 0,
    y: readNumberField(detection, "y") ?? 0,
    width: readNumberField(detection, "width") ?? 0,
    height: readNumberField(detection, "height") ?? 0,
    color: readStringField(detection, "color"),
    frameIndex:
      readNumberField(detection, "frameIndex") ??
      readNumberField(detection, "frame_index") ??
      readNumberField(detection, "frame"),
    trackId:
      readStringField(detection, "trackId") ??
      readStringField(detection, "track_id") ??
      readStringField(detection, "id"),
  };
}

function normalizeReportDetections(detections?: unknown[]) {
  return (
    detections
      ?.map((detection) => normalizeReportDetection(detection))
      .filter((detection): detection is SudoDetectionBox =>
        Boolean(detection)
      ) ?? []
  );
}

function buildDetectionReportFields(detections?: unknown[]) {
  const normalizedDetections = smoothSudoDetectionsByTrack(
    normalizeReportDetections(detections)
  );
  const tracks = buildSudoDetectionTrackSummary(normalizedDetections);

  return {
    bboxCount: detections?.length ?? 0,
    rawLabelCount: normalizedDetections.filter((box) => box.rawLabel).length,
    trackedBboxCount: normalizedDetections.filter((box) => box.trackId).length,
    trackCount: tracks.length,
    trackIds: tracks.map((track) => track.trackId),
  };
}

function buildDecisionPerceptionInput(
  state: PersistedScenarioState | undefined
): SudoPerceptionDecisionInput | undefined {
  if (!state?.analysis && !state?.detectorResult) {
    return undefined;
  }

  const detectorDetections = normalizeReportDetections(
    state.detectorResult?.detections
  );
  const analysisDetections = normalizeReportDetections(
    state.analysis?.detections
  );
  const detections = detectorDetections.length
    ? detectorDetections
    : analysisDetections;
  const label =
    state.operatorReview?.label?.trim() ||
    state.analysis?.label?.trim() ||
    detections[0]?.label ||
    "";

  if (!label && detections.length === 0) {
    return undefined;
  }

  return {
    label,
    confidence:
      typeof state.analysis?.confidence === "number"
        ? state.analysis.confidence
        : Math.max(0, ...detections.map((box) => box.confidence)),
    detections,
    model:
      state.detectorResult?.model ||
      state.analysis?.model ||
      state.detectorResult?.source ||
      state.analysis?.source ||
      "저장 분석",
    frameCount: Math.max(
      state.analysis?.frameCount ?? 0,
      detections.reduce(
        (maxFrame, box) => Math.max(maxFrame, (box.frameIndex ?? 0) + 1),
        0
      )
    ),
  };
}

export function buildSudoProgressItems() {
  return sudoScenarios
    .filter((scenario) => Boolean(scenario))
    .map((scenario) => {
      const evaluation = buildScenarioEvaluation(scenario.id);
      return {
        scenario,
        ...evaluation,
        required: REQUIRED_SCENARIO_IDS.has(scenario.id),
      };
    });
}

export function buildSudoProgressSummary(
  items: SudoProgressSummaryItem[] = buildSudoProgressItems()
) {
  const requiredItems = items.filter((item) => item.required);
  const nextRequiredItem =
    requiredItems.find((item) => item.status !== "done") ??
    items.find((item) => item.status !== "done");

  return {
    total: items.length,
    done: items.filter((item) => item.status === "done").length,
    requiredTotal: requiredItems.length,
    requiredDone: requiredItems.filter((item) => item.status === "done").length,
    requiredReady: requiredItems.filter((item) => item.status === "draft")
      .length,
    requiredWaiting: requiredItems.filter((item) => item.status === "pending")
      .length,
    nextRequiredScenario: nextRequiredItem
      ? {
          id: nextRequiredItem.scenario.id,
          title: nextRequiredItem.scenario.title,
          status: nextRequiredItem.status,
          required: nextRequiredItem.required,
          statusReason: nextRequiredItem.statusReason ?? "",
          nextAction: nextRequiredItem.nextAction ?? "",
        }
      : undefined,
  };
}

export function getSudoProgressStatusLabel(status: SudoProgressStatus) {
  if (status === "done") {
    return "DONE";
  }

  if (status === "draft") {
    return "READY";
  }

  return "WAIT";
}

export function getSudoProgressStatusColor(status: SudoProgressStatus) {
  if (status === "done") {
    return "#67f29b";
  }

  if (status === "draft") {
    return "#ffc857";
  }

  return "rgba(236, 255, 251, 0.34)";
}

function summarizeReportList(items: readonly string[], limit = 3) {
  const values = items.map((item) => item.trim()).filter(Boolean);
  const visible = values.slice(0, limit);
  const hidden = values.length - visible.length;
  return [...visible, ...(hidden > 0 ? [`+${hidden}건`] : [])].join(" | ");
}

function buildSudoDataReportSource(
  scenarioId: number,
  decisionInputs: SudoDecisionInputState
) {
  const intel = getSudoScenarioDataIntel(scenarioId);
  const sourceStage = buildFallbackSudoScenarioSourceStage(scenarioId);
  const decisionBindings = buildSudoScenarioSourceDecisionBindings(
    scenarioId,
    decisionInputs,
    sourceStage
  );
  const bindingSummary =
    buildSudoScenarioSourceBindingSummary(decisionBindings);
  const inputPatchSuggestions = buildSudoScenarioSourceInputPatchSuggestions(
    scenarioId,
    decisionInputs,
    sourceStage
  );
  const inputPatchSummary = buildSudoScenarioSourceInputPatchSummary(
    inputPatchSuggestions
  );

  return {
    sourceRefs: mergeSudoScenarioSourceValues(
      intel.sourceRefs,
      sourceStage?.sourceRefs
    ),
    sourceFiles: mergeSudoScenarioSourceValues(
      intel.sourceFiles,
      sourceStage?.sourceFiles
    ),
    dataPoints: [...intel.dataPoints],
    gisHighlights: [...intel.gisHighlights],
    links: intel.links.map((link) => ({ ...link })),
    extractionHealthSummary: buildSudoDataExtractionHealthSummary(),
    extractionRoleSummary: buildSudoDataExtractionRoleSummary(),
    extractionIssueSummary: buildSudoDataExtractionIssueSummary(),
    extraction: {
      generatedAt: SUDO_DATA_EXTRACTION_SUMMARY.generatedAt,
      sourceTotal: SUDO_DATA_EXTRACTION_SUMMARY.sourceTotal,
      sourceOk: SUDO_DATA_EXTRACTION_SUMMARY.sourceOk,
      sourcePartial: SUDO_DATA_EXTRACTION_SUMMARY.sourcePartial,
      ocrEngine: SUDO_DATA_EXTRACTION_SUMMARY.ocrEngine,
      ocrTotal: SUDO_DATA_EXTRACTION_SUMMARY.ocrTotal,
      ocrOk: SUDO_DATA_EXTRACTION_SUMMARY.ocrOk,
      ocrFailed: SUDO_DATA_EXTRACTION_SUMMARY.ocrFailed,
      presentationTotal: SUDO_DATA_EXTRACTION_SUMMARY.presentationTotal,
      presentationOk: SUDO_DATA_EXTRACTION_SUMMARY.presentationOk,
      presentationSkipped: SUDO_DATA_EXTRACTION_SUMMARY.presentationSkipped,
      slideRenderTotal: SUDO_DATA_EXTRACTION_SUMMARY.slideRenderTotal,
      roleCounts: SUDO_DATA_EXTRACTION_SUMMARY.roleCounts.map((item) => ({
        ...item,
      })),
      issues: SUDO_DATA_EXTRACTION_SUMMARY.issues.map((issue) => ({
        ...issue,
      })),
      links: SUDO_DATA_EXTRACTION_SUMMARY.links.map((link) => ({ ...link })),
    },
    enhancementIdeaSummary: buildSudoDataEnhancementIdeaSummary(
      getCoreSudoDataEnhancementIdeas(intel.enhancementIdeas)
    ),
    enhancementIdeas: getCoreSudoDataEnhancementIdeas(
      intel.enhancementIdeas
    ).map((idea) => ({ ...idea })),
    stage: sourceStage
      ? {
          id: sourceStage.id,
          title: sourceStage.title,
          page: sourceStage.page,
          timeBand: sourceStage.timeBand,
          combatLayer: sourceStage.combatLayer,
          implementationLevel:
            formatSudoScenarioImplementationLevel(
              sourceStage.implementationLevel
            ) ?? sourceStage.implementationLevel,
          requirements: [...sourceStage.requirements],
          sourceRefs: [...sourceStage.sourceRefs],
          sourceFiles: [...sourceStage.sourceFiles],
          assetUse: sourceStage.assetUse
            ? { ...sourceStage.assetUse }
            : undefined,
          codeAction: sourceStage.codeAction,
        }
      : undefined,
    bindingSummary: bindingSummary.label,
    bindingDetails: decisionBindings.map((binding) => ({
      id: binding.id,
      label: binding.label,
      status: binding.status,
      detail: binding.detail,
      basis: binding.basis,
    })),
    inputPatchSummary: inputPatchSummary.label,
    inputPatchDetails: inputPatchSuggestions.map((suggestion) => ({
      id: suggestion.id,
      label: suggestion.label,
      field: suggestion.field,
      status: suggestion.status,
      currentValue: suggestion.currentValue,
      recommendedValue: suggestion.recommendedValue,
      basis: suggestion.basis,
      detail: suggestion.detail,
    })),
  };
}

export function buildSudoFtxReport() {
  const items = buildSudoProgressItems();
  const latestAnalysis = readLatestSudoAnalysisResultCommand();
  const analysisLog = readLatestSudoAnalysisLogItems();
  const redeployment = readLatestSudoDroneRedeploymentCommand();
  const summary = buildSudoProgressSummary(items);

  return {
    generatedAt: new Date().toISOString(),
    summary,
    latestAnalysis,
    analysisLog,
    redeployment,
    scenarios: items.map(
      ({ scenario, status, required, statusReason, nextAction }) => {
        const state = readScenarioState(scenario.id);
        const analysisDetectionFields = buildDetectionReportFields(
          state?.analysis?.detections
        );
        const detectorDetectionFields = buildDetectionReportFields(
          state?.detectorResult?.detections
        );
        const decisionInputs = normalizeDecisionInputs(state?.decisionInputs);
        const decisionOutput = getSudoDecisionOutput(
          scenario.id,
          decisionInputs,
          buildDecisionPerceptionInput(state)
        );
        const sudoData = buildSudoDataReportSource(scenario.id, decisionInputs);

        return {
          id: scenario.id,
          title: scenario.title,
          implementationLevel: scenario.implementationLevel,
          required,
          status,
          statusReason,
          nextAction,
          updatedAt: state?.updatedAt,
          decision: decisionOutput?.summary ?? scenario.decision,
          decisionEvidence: buildDecisionEvidence(decisionOutput),
          sudoData,
          decisionInputs: {
            targetLabel: decisionInputs.targetLabel,
            scaleSummary: summarizeScaleInputs(decisionInputs),
            forestPercent: decisionInputs.forestPercent,
            openTerrainPercent: decisionInputs.openTerrainPercent,
            desiredDamagePercent: decisionInputs.desiredDamagePercent,
            collateralSummary: summarizeCollateralMunitions(
              decisionInputs.collateralMunitions
            ),
            orderCandidateSummary: summarizeOrderCandidates(
              decisionInputs.orderCandidates
            ),
            routeOptionSummary: summarizeRouteOptions(
              decisionInputs.routeOptions
            ),
            droneRedeploymentSummary: summarizeDroneRedeploymentOrders(
              decisionInputs.droneRedeploymentOrders
            ),
            strikeAssetSummary: summarizeStrikeAssets(
              decisionInputs.strikeAssets
            ),
            fireControlPointSummary: summarizeFireControlPoints(
              decisionInputs.fireControlPoints
            ),
            fireUnitSummary: summarizeFireUnits(decisionInputs.fireUnits),
          },
          operatorReview: state?.operatorReview
            ? {
                status: state.operatorReview.status,
                statusLabel: getOperatorReviewStatusLabel(
                  state.operatorReview.status
                ),
                label: state.operatorReview.label,
                originalLabel: state.operatorReview.originalLabel,
                overrideLabel: state.operatorReview.overrideLabel,
                note: state.operatorReview.note,
                updatedAt: state.operatorReview.updatedAt,
              }
            : undefined,
          analysis: state?.analysis
            ? {
                label: state.analysis.label,
                confidence: state.analysis.confidence,
                source: state.analysis.source,
                model: state.analysis.model,
                frameCount: state.analysis.frameCount,
                ...analysisDetectionFields,
                summary: state.analysis.summary,
              }
            : undefined,
          detector: state?.detectorResult
            ? {
                source: state.detectorResult.source,
                model: state.detectorResult.model,
                endpoint: state.detectorResult.endpoint,
                ...detectorDetectionFields,
                health: state.detectorHealth
                  ? {
                      source: state.detectorHealth.source,
                      endpoint: state.detectorHealth.endpoint,
                      adapterReachable: state.detectorHealth.adapterReachable,
                      modelReady: state.detectorHealth.modelReady,
                      cameraReachable: state.detectorHealth.cameraReachable,
                      mode: state.detectorHealth.mode,
                      model: state.detectorHealth.model,
                      diagnostic: state.detectorHealth.diagnostic,
                      modelDiagnostic: state.detectorHealth.modelDiagnostic,
                      cameraDiagnostic: state.detectorHealth.cameraDiagnostic,
                      elapsedMs: state.detectorHealth.elapsedMs,
                    }
                  : undefined,
              }
            : undefined,
          ollama: state?.ollamaHealth
            ? {
                endpoint: state.ollamaHealth.endpoint,
                model: state.ollamaHealth.model,
                reachable: state.ollamaHealth.reachable,
                modelReady: state.ollamaHealth.modelReady,
                message: state.ollamaHealth.message,
                elapsedMs: state.ollamaHealth.elapsedMs,
              }
            : undefined,
          assistant:
            state?.assistantQuestion || state?.assistantReply
              ? {
                  question: state.assistantQuestion ?? "",
                  reply: state.assistantReply ?? "",
                }
              : undefined,
        };
      }
    ),
  };
}

function quoteCsvCell(value: string) {
  return `"${value.replace(/"/g, '""')}"`;
}

function boolStatus(value: boolean | undefined) {
  if (value === undefined) {
    return "unknown";
  }

  return value ? "true" : "false";
}

function summarizeScaleInputs(
  inputs: ReturnType<typeof normalizeDecisionInputs>
) {
  return `${inputs.marchRoute} ${inputs.observedVehicleCount}대 / ${inputs.marchColumnLengthM}m`;
}

function summarizeFireUnits(
  fireUnits: ReturnType<typeof normalizeDecisionInputs>["fireUnits"]
) {
  return fireUnits
    .map(
      (unit) =>
        `${unit.unit} ${unit.distanceKm}/${unit.maxRangeKm}km 탄${unit.ammo} CSR${unit.csr} ${unit.status}`
    )
    .join(" | ");
}

function summarizeCollateralMunitions(
  collateralMunitions: ReturnType<
    typeof normalizeDecisionInputs
  >["collateralMunitions"]
) {
  return collateralMunitions
    .map((munition) => `${munition.munition} ${munition.radiusM}m`)
    .join(" | ");
}

function summarizeOrderCandidates(
  orderCandidates: ReturnType<typeof normalizeDecisionInputs>["orderCandidates"]
) {
  return orderCandidates
    .map(
      (candidate) =>
        `${candidate.unit} ${candidate.weapon} ${candidate.distanceKm}km ${candidate.guns}문 방향${candidate.directionMatchPercent}%`
    )
    .join(" | ");
}

function summarizeRouteOptions(
  routeOptions: ReturnType<typeof normalizeDecisionInputs>["routeOptions"]
) {
  return routeOptions
    .map(
      (option) =>
        `${option.option} ${option.route} 감시${option.coverage}% 공백${option.gap}% 화력${option.fireLinkScore}%`
    )
    .join(" | ");
}

function summarizeDroneRedeploymentOrders(
  orders: ReturnType<typeof normalizeDecisionInputs>["droneRedeploymentOrders"]
) {
  return orders
    .map(
      (order) =>
        `${order.droneId} ${order.destinationType} ${order.destinationName} ${order.coordinate} ${order.status} ${order.progressPercent}%`
    )
    .join(" | ");
}

function summarizeStrikeAssets(
  strikeAssets: ReturnType<typeof normalizeDecisionInputs>["strikeAssets"]
) {
  return strikeAssets
    .map(
      (asset) =>
        `${asset.asset} ${asset.availableFrom}~${asset.availableTo} ${asset.score}점`
    )
    .join(" | ");
}

function summarizeFireControlPoints(
  fireControlPoints: ReturnType<
    typeof normalizeDecisionInputs
  >["fireControlPoints"]
) {
  return `${fireControlPoints.nai} / ${fireControlPoints.dp} / ${fireControlPoints.tai}`;
}

function summarizeDecisionMetrics(output: SudoDecisionOutput | undefined) {
  return (
    output?.metrics
      .map((metric) => `${metric.label}: ${metric.value}`)
      .join(" | ") ?? ""
  );
}

function summarizeDecisionSteps(output: SudoDecisionOutput | undefined) {
  return (
    output?.steps.map((step, index) => `${index + 1}. ${step}`).join(" | ") ??
    ""
  );
}

function summarizeDecisionTable(output: SudoDecisionOutput | undefined) {
  if (!output?.table) {
    return "";
  }

  return output.table.rows
    .map((row) =>
      output.table?.columns.map((column) => row[column.key] ?? "").join(" / ")
    )
    .join(" | ");
}

function summarizeSudoDataBindings(
  sudoData: ReturnType<typeof buildSudoDataReportSource>
) {
  return sudoData.bindingDetails
    .map((detail) => `[${detail.status}] ${detail.label}: ${detail.detail}`)
    .join(" | ");
}

function summarizeSudoDataPatches(
  sudoData: ReturnType<typeof buildSudoDataReportSource>
) {
  return sudoData.inputPatchDetails
    .map(
      (detail) =>
        `[${detail.status}] ${detail.label}: ${detail.recommendedValue}`
    )
    .join(" | ");
}

function summarizeSudoDataEvidence(
  sudoData: ReturnType<typeof buildSudoDataReportSource>
) {
  return summarizeReportList(
    [
      ...sudoData.dataPoints.slice(0, 3).map(formatSudoSourceDisplayLabel),
      ...sudoData.gisHighlights.slice(0, 2).map(formatSudoSourceDisplayLabel),
    ],
    4
  );
}

function buildDecisionEvidence(output: SudoDecisionOutput | undefined) {
  if (!output) {
    return undefined;
  }

  return {
    title: output.title,
    summary: output.summary,
    metrics: output.metrics.map((metric) => ({
      label: metric.label,
      value: metric.value,
      tone: metric.tone,
    })),
    steps: [...output.steps],
    table: output.table
      ? {
          title: output.table.title,
          columns: output.table.columns.map((column) => ({
            key: column.key,
            label: column.label,
          })),
          rows: output.table.rows.map((row) => ({ ...row })),
        }
      : undefined,
    sourceTables: output.sourceTables?.map((table) => ({
      title: table.title,
      columns: table.columns.map((column) => ({
        key: column.key,
        label: column.label,
      })),
      rows: table.rows.map((row) => ({ ...row })),
    })),
  };
}

export function buildSudoFtxReportCsv() {
  const report = buildSudoFtxReport();
  const rows: string[][] = [
    ["구분", "항목", "값"],
    ["보고서", "생성시각", report.generatedAt],
    ["요약", "전체", String(report.summary.total)],
    ["요약", "완료", String(report.summary.done)],
    ["요약", "필수전체", String(report.summary.requiredTotal)],
    ["요약", "필수완료", String(report.summary.requiredDone)],
    ["요약", "필수READY", String(report.summary.requiredReady)],
    ["요약", "필수WAIT", String(report.summary.requiredWaiting)],
    [
      "요약",
      "다음필수",
      report.summary.nextRequiredScenario
        ? `S${report.summary.nextRequiredScenario.id} ${report.summary.nextRequiredScenario.title}`
        : "완료",
    ],
    [],
    ["분석상태", "시나리오", "단계", "진행률", "메시지", "수신시각"],
    ...report.analysisLog.map((item) => [
      "분석상태",
      `S${item.scenarioId}`,
      item.stage,
      String(item.progressPercent),
      item.message,
      new Date(item.issuedAt).toISOString(),
    ]),
    [],
    [
      "시나리오",
      "제목",
      "구현레벨",
      "필수",
      "상태",
      "상태근거",
      "다음조치",
      "수정시각",
      "최종판정",
      "판단산출",
      "판단메트릭",
      "판단단계",
      "판단근거표",
      "sudo_data 원자료",
      "sudo_data 파일",
      "sudo_data 계산연결",
      "sudo_data 계산세부",
      "sudo_data 입력패치",
      "sudo_data 입력패치세부",
      "sudo_data 추출상태",
      "sudo_data 추출역할",
      "sudo_data 추출이슈",
      "sudo_data 고도화",
      "입력표적",
      "규모판단입력",
      "산림",
      "개활지",
      "요망피해율",
      "전투서열입력",
      "사태분석도입력",
      "드론재배치입력",
      "타격자산입력",
      "통합화력지점",
      "부수피해입력",
      "사격부대입력",
      "운영자확정",
      "확정라벨",
      "원AI라벨",
      "보정라벨",
      "확정메모",
      "분석라벨",
      "분석bbox",
      "분석track",
      "Detector",
      "Detector bbox",
      "Detector track",
      "Adapter",
      "Model",
      "Camera",
      "Ollama",
      "진단",
      "AI질문",
      "AI답변",
    ],
  ];

  report.scenarios.forEach((scenario) => {
    rows.push([
      `S${scenario.id}`,
      scenario.title,
      scenario.implementationLevel,
      scenario.required ? "Y" : "N",
      scenario.status,
      scenario.statusReason,
      scenario.nextAction,
      scenario.updatedAt ?? "",
      scenario.decision ?? "",
      scenario.decisionEvidence?.title ?? "",
      summarizeDecisionMetrics(scenario.decisionEvidence),
      summarizeDecisionSteps(scenario.decisionEvidence),
      summarizeDecisionTable(scenario.decisionEvidence),
      summarizeSudoSourceDisplayValues(scenario.sudoData.sourceRefs, 99, " | "),
      summarizeSudoSourceDisplayValues(
        scenario.sudoData.sourceFiles,
        99,
        " | "
      ),
      scenario.sudoData.bindingSummary,
      summarizeSudoDataBindings(scenario.sudoData),
      scenario.sudoData.inputPatchSummary,
      summarizeSudoDataPatches(scenario.sudoData),
      scenario.sudoData.extractionHealthSummary,
      scenario.sudoData.extractionRoleSummary,
      scenario.sudoData.extractionIssueSummary,
      scenario.sudoData.enhancementIdeaSummary,
      scenario.decisionInputs?.targetLabel ?? "",
      scenario.decisionInputs?.scaleSummary ?? "",
      String(scenario.decisionInputs?.forestPercent ?? ""),
      String(scenario.decisionInputs?.openTerrainPercent ?? ""),
      String(scenario.decisionInputs?.desiredDamagePercent ?? ""),
      scenario.decisionInputs?.orderCandidateSummary ?? "",
      scenario.decisionInputs?.routeOptionSummary ?? "",
      scenario.decisionInputs?.droneRedeploymentSummary ?? "",
      scenario.decisionInputs?.strikeAssetSummary ?? "",
      scenario.decisionInputs?.fireControlPointSummary ?? "",
      scenario.decisionInputs?.collateralSummary ?? "",
      scenario.decisionInputs?.fireUnitSummary ?? "",
      scenario.operatorReview?.statusLabel ?? "",
      scenario.operatorReview?.label ?? "",
      scenario.operatorReview?.originalLabel ?? "",
      scenario.operatorReview?.overrideLabel ?? "",
      scenario.operatorReview?.note ?? "",
      scenario.analysis?.label ?? "",
      String(scenario.analysis?.bboxCount ?? 0),
      scenario.analysis?.trackIds?.join(" | ") ?? "",
      scenario.detector?.model ?? scenario.detector?.source ?? "",
      String(scenario.detector?.bboxCount ?? 0),
      scenario.detector?.trackIds?.join(" | ") ?? "",
      boolStatus(scenario.detector?.health?.adapterReachable),
      boolStatus(scenario.detector?.health?.modelReady),
      boolStatus(scenario.detector?.health?.cameraReachable),
      boolStatus(scenario.ollama?.modelReady),
      scenario.detector?.health?.diagnostic ?? "",
      scenario.assistant?.question ?? "",
      scenario.assistant?.reply ?? "",
    ]);
  });

  return rows
    .map((row) =>
      row
        .map((cell) => quoteCsvCell(formatSudoSourceDisplayLabel(String(cell))))
        .join(",")
    )
    .join("\n");
}

function escapeMarkdownTableCell(value: unknown) {
  return formatSudoSourceDisplayLabel(String(value ?? ""))
    .replace(/\|/g, "\\|")
    .replace(/\r?\n/g, " ")
    .trim();
}

function formatMarkdownPercent(value: number | undefined) {
  return typeof value === "number" && Number.isFinite(value)
    ? `${Math.round(value * 1000) / 10}%`
    : "";
}

function formatMarkdownNextRequired(
  nextRequiredScenario: ReturnType<
    typeof buildSudoProgressSummary
  >["nextRequiredScenario"]
) {
  if (!nextRequiredScenario) {
    return "완료";
  }

  return `S${nextRequiredScenario.id} ${nextRequiredScenario.title} (${getSudoProgressStatusLabel(nextRequiredScenario.status)})`;
}

function markdownTable(headers: string[], rows: unknown[][]) {
  return [
    `| ${headers.map(escapeMarkdownTableCell).join(" | ")} |`,
    `| ${headers.map(() => "---").join(" | ")} |`,
    ...rows.map((row) => `| ${row.map(escapeMarkdownTableCell).join(" | ")} |`),
  ].join("\n");
}

export function buildSudoFtxReportMarkdown() {
  const report = buildSudoFtxReport();
  const latest = report.latestAnalysis;
  const lines = [
    "# KAIROS 통합화력운용 보고",
    "",
    `- 생성시각: ${report.generatedAt}`,
    `- 전체 진행: ${report.summary.done}/${report.summary.total}`,
    `- 필수 진행: ${report.summary.requiredDone}/${report.summary.requiredTotal}`,
    `- 필수 READY/WAIT: ${report.summary.requiredReady}/${report.summary.requiredWaiting}`,
    `- 다음 필수: ${formatMarkdownNextRequired(report.summary.nextRequiredScenario)}`,
    "",
    "## 최신 AI 분석",
  ];

  if (latest) {
    lines.push(
      `- 시나리오: S${latest.scenarioId} ${latest.title}`,
      `- 표적판정: ${latest.label} (${formatMarkdownPercent(latest.confidence)})`,
      `- 모델/소스: ${latest.model} / ${latest.source} / ${latest.inputKind}`,
      `- 프레임/BBOX: ${latest.frameCount} / ${latest.bboxCount}`,
      `- 요약: ${latest.summary}`
    );
  } else {
    lines.push("- 최신 분석결과 없음");
  }

  lines.push(
    "",
    "## 시나리오 판단표",
    markdownTable(
      [
        "S",
        "제목",
        "필수",
        "상태",
        "상태근거",
        "다음조치",
        "최종판정",
        "운영자",
        "분석",
        "BBOX",
        "TRACK",
        "Detector",
        "Ollama",
        "AI질문",
        "진단",
      ],
      report.scenarios.map((scenario) => [
        `S${scenario.id}`,
        scenario.title,
        scenario.required ? "Y" : "N",
        getSudoProgressStatusLabel(scenario.status),
        scenario.statusReason,
        scenario.nextAction,
        scenario.decision ?? "",
        [
          scenario.operatorReview?.statusLabel ?? "",
          scenario.operatorReview?.overrideLabel ??
            scenario.operatorReview?.label ??
            "",
        ]
          .filter(Boolean)
          .join(" "),
        scenario.analysis?.label ?? "",
        scenario.analysis?.bboxCount ?? 0,
        scenario.analysis?.trackIds?.join(" / ") ?? "",
        scenario.detector?.model ?? scenario.detector?.source ?? "",
        scenario.ollama?.modelReady === undefined
          ? ""
          : scenario.ollama.modelReady
            ? "READY"
            : "CHECK",
        scenario.assistant?.question ?? "",
        scenario.detector?.health?.diagnostic ?? "",
      ])
    )
  );

  lines.push(
    "",
    "## sudo_data 원자료 연결",
    markdownTable(
      [
        "S",
        "원자료",
        "실제파일",
        "계산연결",
        "입력패치",
        "추출상태",
        "고도화",
        "판단근거",
      ],
      report.scenarios.map((scenario) => [
        `S${scenario.id}`,
        summarizeSudoSourceDisplayValues(scenario.sudoData.sourceRefs),
        summarizeSudoSourceDisplayValues(scenario.sudoData.sourceFiles),
        scenario.sudoData.bindingSummary,
        scenario.sudoData.inputPatchSummary,
        scenario.sudoData.extractionHealthSummary,
        scenario.sudoData.enhancementIdeaSummary,
        summarizeSudoDataEvidence(scenario.sudoData),
      ])
    )
  );

  const decisionEvidenceScenarios = report.scenarios.filter(
    (scenario) => scenario.decisionEvidence
  );
  if (decisionEvidenceScenarios.length > 0) {
    lines.push(
      "",
      "## 판단근거 상세",
      markdownTable(
        ["S", "산출", "메트릭", "단계", "근거표"],
        decisionEvidenceScenarios.map((scenario) => [
          `S${scenario.id}`,
          scenario.decisionEvidence?.title ?? "",
          summarizeDecisionMetrics(scenario.decisionEvidence),
          summarizeDecisionSteps(scenario.decisionEvidence),
          summarizeDecisionTable(scenario.decisionEvidence),
        ])
      )
    );
  }

  const assistantScenarios = report.scenarios.filter(
    (scenario) => scenario.assistant?.question || scenario.assistant?.reply
  );
  if (assistantScenarios.length > 0) {
    lines.push(
      "",
      "## AI 어시스턴트 기록",
      markdownTable(
        ["S", "질문", "답변"],
        assistantScenarios.map((scenario) => [
          `S${scenario.id}`,
          scenario.assistant?.question ?? "",
          scenario.assistant?.reply ?? "",
        ])
      )
    );
  }

  if (report.analysisLog.length > 0) {
    lines.push(
      "",
      "## 분석 상태 로그",
      markdownTable(
        ["수신", "S", "단계", "진행", "메시지"],
        report.analysisLog.map((item) => [
          new Date(item.issuedAt).toISOString(),
          `S${item.scenarioId}`,
          item.stage,
          `${item.progressPercent}%`,
          item.message,
        ])
      )
    );
  }

  if (report.redeployment) {
    lines.push(
      "",
      "## 드론 재배치",
      `- ${report.redeployment.summary}`,
      markdownTable(
        ["드론", "목적", "좌표", "상태", "진행"],
        report.redeployment.orders.map((order) => [
          order.droneId,
          `${order.destinationType} ${order.destinationName}`,
          order.coordinate,
          order.status,
          `${order.progressPercent}%`,
        ])
      )
    );
  }

  return `${lines.join("\n")}\n`;
}
