import {
  buildSudoSubPath,
  parseSudoScenarioId,
  parseSudoScenarioLevel,
  type SudoScenarioLevel,
} from "./sudoRoutes";

export const SUDO_SCENARIO_COMMAND_KEY = "vista:sudo:scenario-command";
export const SUDO_DRONE_REDEPLOYMENT_KEY = "vista:sudo:drone-redeployment";
export const SUDO_ANALYSIS_RESULT_KEY = "vista:sudo:analysis-result";
export const SUDO_ANALYSIS_STATUS_KEY = "vista:sudo:analysis-status";
export const SUDO_ANALYSIS_LOG_KEY = "vista:sudo:analysis-log";
export const SUDO_ASSISTANT_QA_KEY = "vista:sudo:assistant-qa";
export const SUDO_SCENARIO_STATE_UPDATED_EVENT =
  "vista:sudo:scenario-state-updated";

export interface SudoScenarioCommand {
  scenarioId: number;
  issuedAt: number;
  source: "main-sidebar" | "sub-sidebar";
  action: "route" | "analyze";
  scenario1View?: "tod" | "drone";
  scenarioLevel?: SudoScenarioLevel;
}

export interface SudoDroneRedeploymentOrder {
  droneId: string;
  destinationType: "NAI" | "DP" | "TAI";
  destinationName: string;
  coordinate: string;
  progressPercent: number;
  status: "이동명령" | "이동중" | "도착";
}

export interface SudoDroneRedeploymentCommand {
  scenarioId: number;
  issuedAt: number;
  source: "assistant";
  summary: string;
  orders: SudoDroneRedeploymentOrder[];
}

export interface SudoAnalysisResultCommand {
  scenarioId: number;
  issuedAt: number;
  title: string;
  label: string;
  confidence: number;
  model: string;
  source: "ollama" | "detector" | "decision" | "mock" | "unavailable";
  inputKind: "image" | "video-frames" | "computed" | "mock" | "none";
  frameCount: number;
  bboxCount: number;
  detectorSource: "detector" | "unconfigured" | "error";
  summary: string;
}

export type SudoAnalysisStage =
  | "queued"
  | "capturing"
  | "running"
  | "done"
  | "error";

export interface SudoAnalysisStatusCommand {
  scenarioId: number;
  issuedAt: number;
  source: "sub-screen";
  stage: SudoAnalysisStage;
  message: string;
  progressPercent: number;
}

export interface SudoAnalysisLogItem extends SudoAnalysisStatusCommand {
  id: string;
}

export type SudoAssistantQaStatus = "running" | "done" | "error";

export interface SudoAssistantQaCommand {
  scenarioId: number;
  issuedAt: number;
  source: "main-chat" | "sub-screen";
  status: SudoAssistantQaStatus;
  question: string;
  reply: string;
  model?: string;
}

const MAX_ANALYSIS_LOG_ITEMS = 20;

function dispatchLocalStorageEvent(key: string, newValue: string) {
  window.dispatchEvent(
    new StorageEvent("storage", {
      key,
      newValue,
      storageArea: window.localStorage,
    })
  );
}

function parseSudoScenarioCommand(value: string | null) {
  if (!value) {
    return undefined;
  }

  try {
    const parsed = JSON.parse(value) as Partial<SudoScenarioCommand>;
    return {
      scenarioId: parseSudoScenarioId(String(parsed.scenarioId ?? "")),
      issuedAt:
        typeof parsed.issuedAt === "number" && Number.isFinite(parsed.issuedAt)
          ? parsed.issuedAt
          : Date.now(),
      source: parsed.source === "sub-sidebar" ? "sub-sidebar" : "main-sidebar",
      action: parsed.action === "analyze" ? "analyze" : "route",
      scenario1View:
        parsed.scenario1View === "tod" || parsed.scenario1View === "drone"
          ? parsed.scenario1View
          : undefined,
      scenarioLevel: parseSudoScenarioLevel(parsed.scenarioLevel, "corps"),
    } satisfies SudoScenarioCommand;
  } catch (_error) {
    return undefined;
  }
}

function toRedeploymentOrder(
  value: Partial<SudoDroneRedeploymentOrder> | undefined,
  index: number
): SudoDroneRedeploymentOrder {
  const fallbackTypes = ["NAI", "DP", "TAI"] as const;
  const destinationType = fallbackTypes.includes(
    value?.destinationType as (typeof fallbackTypes)[number]
  )
    ? (value?.destinationType as SudoDroneRedeploymentOrder["destinationType"])
    : fallbackTypes[index % fallbackTypes.length];

  const statusOptions = ["이동명령", "이동중", "도착"] as const;
  const status = statusOptions.includes(
    value?.status as (typeof statusOptions)[number]
  )
    ? (value?.status as SudoDroneRedeploymentOrder["status"])
    : "이동명령";
  const progressPercent = Number(value?.progressPercent);

  return {
    droneId:
      typeof value?.droneId === "string" && value.droneId.trim().length > 0
        ? value.droneId.trim()
        : `DRONE-${index + 1}`,
    destinationType,
    destinationName:
      typeof value?.destinationName === "string" &&
      value.destinationName.trim().length > 0
        ? value.destinationName.trim()
        : destinationType,
    coordinate:
      typeof value?.coordinate === "string" &&
      value.coordinate.trim().length > 0
        ? value.coordinate.trim()
        : "BH 0000000000",
    progressPercent: Number.isFinite(progressPercent)
      ? Math.max(0, Math.min(100, Math.round(progressPercent)))
      : 0,
    status,
  };
}

function parseSudoDroneRedeploymentCommand(value: string | null) {
  if (!value) {
    return undefined;
  }

  try {
    const parsed = JSON.parse(value) as Partial<SudoDroneRedeploymentCommand>;
    const orders = Array.isArray(parsed.orders)
      ? parsed.orders.map((order, index) =>
          toRedeploymentOrder(
            order as Partial<SudoDroneRedeploymentOrder>,
            index
          )
        )
      : [];

    return {
      scenarioId: parseSudoScenarioId(String(parsed.scenarioId ?? "10")),
      issuedAt:
        typeof parsed.issuedAt === "number" && Number.isFinite(parsed.issuedAt)
          ? parsed.issuedAt
          : Date.now(),
      source: "assistant",
      summary:
        typeof parsed.summary === "string" && parsed.summary.trim().length > 0
          ? parsed.summary.trim()
          : "감시자산 재배치 명령을 수신했습니다.",
      orders,
    } satisfies SudoDroneRedeploymentCommand;
  } catch (_error) {
    return undefined;
  }
}

function parseSudoAnalysisResultCommand(value: string | null) {
  if (!value) {
    return undefined;
  }

  try {
    const parsed = JSON.parse(value) as Partial<SudoAnalysisResultCommand>;
    const confidence = Number(parsed.confidence);
    const frameCount = Number(parsed.frameCount);
    const bboxCount = Number(parsed.bboxCount);
    const sourceOptions = [
      "ollama",
      "detector",
      "decision",
      "mock",
      "unavailable",
    ];
    const inputKindOptions = [
      "image",
      "video-frames",
      "computed",
      "mock",
      "none",
    ];
    const detectorSourceOptions = ["detector", "unconfigured", "error"];

    return {
      scenarioId: parseSudoScenarioId(String(parsed.scenarioId ?? "")),
      issuedAt:
        typeof parsed.issuedAt === "number" && Number.isFinite(parsed.issuedAt)
          ? parsed.issuedAt
          : Date.now(),
      title:
        typeof parsed.title === "string" && parsed.title.trim().length > 0
          ? parsed.title.trim()
          : "분석결과",
      label:
        typeof parsed.label === "string" && parsed.label.trim().length > 0
          ? parsed.label.trim()
          : "미분류",
      confidence: Number.isFinite(confidence)
        ? Math.max(0, Math.min(1, confidence))
        : 0,
      model:
        typeof parsed.model === "string" && parsed.model.trim().length > 0
          ? parsed.model.trim()
          : "unknown",
      source: sourceOptions.includes(String(parsed.source))
        ? (parsed.source as SudoAnalysisResultCommand["source"])
        : "unavailable",
      inputKind: inputKindOptions.includes(String(parsed.inputKind))
        ? (parsed.inputKind as SudoAnalysisResultCommand["inputKind"])
        : "none",
      frameCount: Number.isFinite(frameCount) ? Math.max(0, frameCount) : 0,
      bboxCount: Number.isFinite(bboxCount) ? Math.max(0, bboxCount) : 0,
      detectorSource: detectorSourceOptions.includes(
        String(parsed.detectorSource)
      )
        ? (parsed.detectorSource as SudoAnalysisResultCommand["detectorSource"])
        : "unconfigured",
      summary:
        typeof parsed.summary === "string" && parsed.summary.trim().length > 0
          ? parsed.summary.trim()
          : "분석 요약이 없습니다.",
    } satisfies SudoAnalysisResultCommand;
  } catch (_error) {
    return undefined;
  }
}

function parseSudoAnalysisStatusCommand(value: string | null) {
  if (!value) {
    return undefined;
  }

  try {
    const parsed = JSON.parse(value) as Partial<SudoAnalysisStatusCommand>;
    const progressPercent = Number(parsed.progressPercent);
    const stageOptions: SudoAnalysisStage[] = [
      "queued",
      "capturing",
      "running",
      "done",
      "error",
    ];

    return {
      scenarioId: parseSudoScenarioId(String(parsed.scenarioId ?? "")),
      issuedAt:
        typeof parsed.issuedAt === "number" && Number.isFinite(parsed.issuedAt)
          ? parsed.issuedAt
          : Date.now(),
      source: "sub-screen",
      stage: stageOptions.includes(parsed.stage as SudoAnalysisStage)
        ? (parsed.stage as SudoAnalysisStage)
        : "queued",
      message:
        typeof parsed.message === "string" && parsed.message.trim().length > 0
          ? parsed.message.trim()
          : "부 화면 분석 상태를 수신했습니다.",
      progressPercent: Number.isFinite(progressPercent)
        ? Math.max(0, Math.min(100, Math.round(progressPercent)))
        : 0,
    } satisfies SudoAnalysisStatusCommand;
  } catch (_error) {
    return undefined;
  }
}

function parseSudoAssistantQaCommand(value: string | null) {
  if (!value) {
    return undefined;
  }

  try {
    const parsed = JSON.parse(value) as Partial<SudoAssistantQaCommand>;
    const statusOptions: SudoAssistantQaStatus[] = ["running", "done", "error"];
    const question =
      typeof parsed.question === "string" ? parsed.question.trim() : "";
    const reply = typeof parsed.reply === "string" ? parsed.reply.trim() : "";

    return {
      scenarioId: parseSudoScenarioId(String(parsed.scenarioId ?? "6")),
      issuedAt:
        typeof parsed.issuedAt === "number" && Number.isFinite(parsed.issuedAt)
          ? parsed.issuedAt
          : Date.now(),
      source: parsed.source === "sub-screen" ? "sub-screen" : "main-chat",
      status: statusOptions.includes(parsed.status as SudoAssistantQaStatus)
        ? (parsed.status as SudoAssistantQaStatus)
        : "running",
      question,
      reply,
      model:
        typeof parsed.model === "string" && parsed.model.trim().length > 0
          ? parsed.model.trim()
          : undefined,
    } satisfies SudoAssistantQaCommand;
  } catch (_error) {
    return undefined;
  }
}

function toSudoAnalysisLogItem(
  value: Partial<SudoAnalysisLogItem> | undefined,
  index: number
): SudoAnalysisLogItem | undefined {
  if (!value) {
    return undefined;
  }

  const parsed = parseSudoAnalysisStatusCommand(JSON.stringify(value));
  if (!parsed) {
    return undefined;
  }

  return {
    ...parsed,
    id:
      typeof value.id === "string" && value.id.trim().length > 0
        ? value.id.trim()
        : `${parsed.issuedAt}-${parsed.scenarioId}-${parsed.stage}-${index}`,
  };
}

function parseSudoAnalysisLogItems(
  value: string | null
): SudoAnalysisLogItem[] {
  if (!value) {
    return [];
  }

  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .map((entry, index) =>
        toSudoAnalysisLogItem(entry as Partial<SudoAnalysisLogItem>, index)
      )
      .filter((entry): entry is SudoAnalysisLogItem => Boolean(entry))
      .sort((left, right) => right.issuedAt - left.issuedAt)
      .slice(0, MAX_ANALYSIS_LOG_ITEMS);
  } catch (_error) {
    return [];
  }
}

function appendSudoAnalysisLogItem(command: SudoAnalysisStatusCommand) {
  const currentItems = parseSudoAnalysisLogItems(
    window.localStorage.getItem(SUDO_ANALYSIS_LOG_KEY)
  );
  const isDuplicate = currentItems.some(
    (item) =>
      item.scenarioId === command.scenarioId &&
      item.stage === command.stage &&
      item.message === command.message &&
      Math.abs(item.issuedAt - command.issuedAt) < 1000
  );

  if (isDuplicate) {
    return;
  }

  const nextItem: SudoAnalysisLogItem = {
    ...command,
    id: [
      command.issuedAt,
      command.scenarioId,
      command.stage,
      currentItems.length,
    ].join("-"),
  };
  const nextValue = JSON.stringify(
    [nextItem, ...currentItems].slice(0, MAX_ANALYSIS_LOG_ITEMS)
  );
  window.localStorage.setItem(SUDO_ANALYSIS_LOG_KEY, nextValue);
  dispatchLocalStorageEvent(SUDO_ANALYSIS_LOG_KEY, nextValue);
}

export function publishSudoScenarioCommand(
  scenarioId: number,
  source: SudoScenarioCommand["source"] = "main-sidebar",
  action: SudoScenarioCommand["action"] = "route",
  options: Pick<SudoScenarioCommand, "scenario1View" | "scenarioLevel"> = {}
) {
  if (typeof window === "undefined") {
    return;
  }

  const command: SudoScenarioCommand = {
    scenarioId: parseSudoScenarioId(String(scenarioId)),
    issuedAt: Date.now(),
    source,
    action,
    scenario1View:
      parseSudoScenarioId(String(scenarioId)) === 1
        ? options.scenario1View
        : undefined,
    scenarioLevel: parseSudoScenarioLevel(options.scenarioLevel, "corps"),
  };

  const nextValue = JSON.stringify(command);
  window.localStorage.setItem(SUDO_SCENARIO_COMMAND_KEY, nextValue);
  dispatchLocalStorageEvent(SUDO_SCENARIO_COMMAND_KEY, nextValue);
}

export function readLatestSudoScenarioCommand() {
  if (typeof window === "undefined") {
    return undefined;
  }

  return parseSudoScenarioCommand(
    window.localStorage.getItem(SUDO_SCENARIO_COMMAND_KEY)
  );
}

export function buildDefaultSudoDroneRedeploymentCommand(): SudoDroneRedeploymentCommand {
  return {
    scenarioId: 10,
    issuedAt: Date.now(),
    source: "assistant",
    summary: "사태분석도 판단안 2안에 따라 감시자산 3대를 재배치합니다.",
    orders: [
      {
        droneId: "DRONE-1",
        destinationType: "TAI",
        destinationName: "#3 쑥고개",
        coordinate: "BH 13245 68820",
        progressPercent: 35,
        status: "이동중",
      },
      {
        droneId: "DRONE-2",
        destinationType: "NAI",
        destinationName: "#4 말고개",
        coordinate: "BH 14562 31094",
        progressPercent: 48,
        status: "이동중",
      },
      {
        droneId: "DRONE-3",
        destinationType: "TAI",
        destinationName: "#4 당동리",
        coordinate: "BH 15884 23301",
        progressPercent: 22,
        status: "이동명령",
      },
    ],
  };
}

export function publishSudoDroneRedeploymentCommand(
  command: SudoDroneRedeploymentCommand = buildDefaultSudoDroneRedeploymentCommand()
) {
  if (typeof window === "undefined") {
    return;
  }

  const nextValue = JSON.stringify({
    ...command,
    issuedAt: Date.now(),
    source: "assistant",
  } satisfies SudoDroneRedeploymentCommand);
  window.localStorage.setItem(SUDO_DRONE_REDEPLOYMENT_KEY, nextValue);
  dispatchLocalStorageEvent(SUDO_DRONE_REDEPLOYMENT_KEY, nextValue);
}

export function readLatestSudoDroneRedeploymentCommand() {
  if (typeof window === "undefined") {
    return undefined;
  }

  return parseSudoDroneRedeploymentCommand(
    window.localStorage.getItem(SUDO_DRONE_REDEPLOYMENT_KEY)
  );
}

export function publishSudoAnalysisResultCommand(
  command: Omit<SudoAnalysisResultCommand, "issuedAt">
) {
  if (typeof window === "undefined") {
    return;
  }

  const nextValue = JSON.stringify({
    ...command,
    issuedAt: Date.now(),
  } satisfies SudoAnalysisResultCommand);
  window.localStorage.setItem(SUDO_ANALYSIS_RESULT_KEY, nextValue);
  dispatchLocalStorageEvent(SUDO_ANALYSIS_RESULT_KEY, nextValue);
  publishSudoAnalysisStatusCommand({
    scenarioId: command.scenarioId,
    stage: "done",
    message: `${command.title} 분석결과를 주 화면에 전송했습니다.`,
    progressPercent: 100,
  });
}

export function readLatestSudoAnalysisResultCommand() {
  if (typeof window === "undefined") {
    return undefined;
  }

  return parseSudoAnalysisResultCommand(
    window.localStorage.getItem(SUDO_ANALYSIS_RESULT_KEY)
  );
}

export function publishSudoAnalysisStatusCommand(
  command: Omit<SudoAnalysisStatusCommand, "issuedAt" | "source">
) {
  if (typeof window === "undefined") {
    return;
  }

  const statusCommand: SudoAnalysisStatusCommand = {
    ...command,
    issuedAt: Date.now(),
    source: "sub-screen",
  };
  const nextValue = JSON.stringify(statusCommand);
  window.localStorage.setItem(SUDO_ANALYSIS_STATUS_KEY, nextValue);
  dispatchLocalStorageEvent(SUDO_ANALYSIS_STATUS_KEY, nextValue);
  appendSudoAnalysisLogItem(statusCommand);
}

export function readLatestSudoAnalysisStatusCommand() {
  if (typeof window === "undefined") {
    return undefined;
  }

  return parseSudoAnalysisStatusCommand(
    window.localStorage.getItem(SUDO_ANALYSIS_STATUS_KEY)
  );
}

export function readLatestSudoAnalysisLogItems() {
  if (typeof window === "undefined") {
    return [];
  }

  return parseSudoAnalysisLogItems(
    window.localStorage.getItem(SUDO_ANALYSIS_LOG_KEY)
  );
}

export function publishSudoAssistantQaCommand(
  command: Omit<SudoAssistantQaCommand, "issuedAt">
) {
  if (typeof window === "undefined") {
    return;
  }

  const nextValue = JSON.stringify({
    ...command,
    scenarioId: parseSudoScenarioId(String(command.scenarioId)),
    question: command.question.trim(),
    reply: command.reply.trim(),
    issuedAt: Date.now(),
  } satisfies SudoAssistantQaCommand);
  window.localStorage.setItem(SUDO_ASSISTANT_QA_KEY, nextValue);
  dispatchLocalStorageEvent(SUDO_ASSISTANT_QA_KEY, nextValue);
}

export function readLatestSudoAssistantQaCommand() {
  if (typeof window === "undefined") {
    return undefined;
  }

  return parseSudoAssistantQaCommand(
    window.localStorage.getItem(SUDO_ASSISTANT_QA_KEY)
  );
}

export function subscribeSudoAnalysisResultCommand(
  onCommand: (command: SudoAnalysisResultCommand) => void
) {
  if (typeof window === "undefined") {
    return () => {};
  }

  const handleStorage = (event: StorageEvent) => {
    if (event.key !== SUDO_ANALYSIS_RESULT_KEY) {
      return;
    }

    const command = parseSudoAnalysisResultCommand(event.newValue);
    if (command) {
      onCommand(command);
    }
  };

  window.addEventListener("storage", handleStorage);
  return () => {
    window.removeEventListener("storage", handleStorage);
  };
}

export function subscribeSudoAnalysisStatusCommand(
  onCommand: (command: SudoAnalysisStatusCommand) => void
) {
  if (typeof window === "undefined") {
    return () => {};
  }

  const handleStorage = (event: StorageEvent) => {
    if (event.key !== SUDO_ANALYSIS_STATUS_KEY) {
      return;
    }

    const command = parseSudoAnalysisStatusCommand(event.newValue);
    if (command) {
      onCommand(command);
    }
  };

  window.addEventListener("storage", handleStorage);
  return () => {
    window.removeEventListener("storage", handleStorage);
  };
}

export function subscribeSudoAnalysisLogItems(
  onItems: (items: SudoAnalysisLogItem[]) => void
) {
  if (typeof window === "undefined") {
    return () => {};
  }

  const handleStorage = (event: StorageEvent) => {
    if (event.key !== SUDO_ANALYSIS_LOG_KEY) {
      return;
    }

    onItems(parseSudoAnalysisLogItems(event.newValue));
  };

  window.addEventListener("storage", handleStorage);
  return () => {
    window.removeEventListener("storage", handleStorage);
  };
}

export function subscribeSudoAssistantQaCommand(
  onCommand: (command: SudoAssistantQaCommand) => void
) {
  if (typeof window === "undefined") {
    return () => {};
  }

  const handleStorage = (event: StorageEvent) => {
    if (event.key !== SUDO_ASSISTANT_QA_KEY) {
      return;
    }

    const command = parseSudoAssistantQaCommand(event.newValue);
    if (command) {
      onCommand(command);
    }
  };

  window.addEventListener("storage", handleStorage);
  return () => {
    window.removeEventListener("storage", handleStorage);
  };
}

export function subscribeSudoDroneRedeploymentCommand(
  onCommand: (command: SudoDroneRedeploymentCommand) => void
) {
  if (typeof window === "undefined") {
    return () => {};
  }

  const handleStorage = (event: StorageEvent) => {
    if (event.key !== SUDO_DRONE_REDEPLOYMENT_KEY) {
      return;
    }

    const command = parseSudoDroneRedeploymentCommand(event.newValue);
    if (command) {
      onCommand(command);
    }
  };

  window.addEventListener("storage", handleStorage);
  return () => {
    window.removeEventListener("storage", handleStorage);
  };
}

export function subscribeSudoScenarioCommand(
  onCommand: (command: SudoScenarioCommand) => void
) {
  if (typeof window === "undefined") {
    return () => {};
  }

  const handleStorage = (event: StorageEvent) => {
    if (event.key !== SUDO_SCENARIO_COMMAND_KEY) {
      return;
    }

    const command = parseSudoScenarioCommand(event.newValue);
    if (command) {
      onCommand(command);
    }
  };

  window.addEventListener("storage", handleStorage);
  return () => {
    window.removeEventListener("storage", handleStorage);
  };
}

export function routeSudoSubWindowToScenario(
  scenarioId: number,
  scenarioLevel?: SudoScenarioLevel
) {
  const nextPath = buildSudoSubPath(scenarioId, { scenarioLevel });
  const currentPath = `${window.location.pathname}${window.location.search}`;
  if (currentPath !== nextPath || window.location.hash) {
    window.history.pushState(null, "", nextPath);
    window.dispatchEvent(new PopStateEvent("popstate"));
  }
}
