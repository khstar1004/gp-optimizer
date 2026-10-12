import { resolvePublicAssetPath } from "../../utils/publicAssetUrl";
import type { SudoScenarioLevel } from "./sudoRoutes";

export const SUDO_JANGDO_MOBILITY_VIDEO_SRC = resolvePublicAssetPath(
  "/sudo_data/1-1 장도훈련장 기동(연결프로그램 사진으로 재생)/1-1 장도훈련장 기동(1).mp4"
);
export const SUDO_JANGDO_MOBILITY_2_VIDEO_SRC = resolvePublicAssetPath(
  "/sudo_data/converted/1-1-jangdo-mobility-2.mp4"
);
export const SUDO_JANGDO_MOBILITY_3_VIDEO_SRC = resolvePublicAssetPath(
  "/sudo_data/converted/1-1-jangdo-mobility-3.mp4"
);
export const SUDO_CORPS_TOD_SURVEILLANCE_VIDEO_SRC = resolvePublicAssetPath(
  "/vid/260616/TOD/[TOD] 전차.mp4"
);
export const SUDO_BATTALION_TOD_SURVEILLANCE_VIDEO_SRC =
  resolvePublicAssetPath("/vid/260616/TOD/[TOD]천무.mp4");
export const SUDO_TOD_SURVEILLANCE_VIDEO_SRC =
  SUDO_BATTALION_TOD_SURVEILLANCE_VIDEO_SRC;
export const SUDO_CORPS_SWID_DRONE_VIEW_VIDEO_SRC = resolvePublicAssetPath(
  "/vid/260616/SWID/[SWID] 전차.mp4"
);
export const SUDO_BATTALION_SWID_DRONE_VIEW_VIDEO_SRC = resolvePublicAssetPath(
  "/vid/260616/SWID/[SWID]천무1.mp4"
);
export const SUDO_SWID_DRONE_VIEW_VIDEO_SRC =
  SUDO_BATTALION_SWID_DRONE_VIEW_VIDEO_SRC;
export const SUDO_CHUNMOO_INTRO_VIDEO_SRC = resolvePublicAssetPath(
  "/sudo_data/converted/2-1-chunmoo-intro.mp4"
);
export const SUDO_CHUNMOO_FIRE_1_VIDEO_SRC = resolvePublicAssetPath(
  "/sudo_data/converted/2-2-chunmoo-fire-1.mp4"
);
export const SUDO_CHUNMOO_FIRE_2_VIDEO_SRC = resolvePublicAssetPath(
  "/sudo_data/converted/2-3-chunmoo-fire-2.mp4"
);
export const SUDO_OBJECT_RECOGNITION_VIDEO_SRC = resolvePublicAssetPath(
  "/sudo_data/converted/2-5-object-recognition.mp4"
);
export const SUDO_CORPS_TARGET_NATURE_FRAME_IMAGE_SRC =
  resolvePublicAssetPath(
    "/sudo/mock-frames/sudo-corps-t72-frame-clean.jpg"
  );
export const SUDO_BATTALION_TARGET_NATURE_FRAME_IMAGE_SRC =
  resolvePublicAssetPath(
    "/sudo/mock-frames/sudo-battalion-240mm-bbox-frame.jpg"
  );
export const SUDO_TARGET_NATURE_FRAME_IMAGE_SRC =
  SUDO_BATTALION_TARGET_NATURE_FRAME_IMAGE_SRC;
export const SUDO_CORPS_SCALE_FRAME_IMAGE_SRC = resolvePublicAssetPath(
  "/sudo/mock-frames/sudo-corps-t72-scale-frame-clean.jpg"
);
export const SUDO_CHUNMOO_INTRO_FRAME_IMAGE_SRC = resolvePublicAssetPath(
  "/sudo_data/_extracted/assets/2-1 천무 소개영상/video_frames/frame_00_53.png"
);
export const SUDO_CHUNMOO_FIRE_FRAME_IMAGE_SRC = resolvePublicAssetPath(
  "/sudo_data/_extracted/assets/2-2 천무 사격영상1/video_frames/frame_00_30.png"
);
export const SUDO_CHUNMOO_SPEC_SLIDE_IMAGE_SRC = resolvePublicAssetPath(
  "/sudo_data/_extracted/slides/2-7 천무 교육자료/슬라이드5.PNG"
);
export const SUDO_CHUNMOO_STRUCTURE_SLIDE_IMAGE_SRC = resolvePublicAssetPath(
  "/sudo_data/_extracted/slides/2-7 천무 교육자료/슬라이드6.PNG"
);
export const SUDO_TANK_VIDEO_SRC = SUDO_OBJECT_RECOGNITION_VIDEO_SRC;
export const SUDO_MULTI_VEHICLES_VIDEO_SRC = SUDO_JANGDO_MOBILITY_2_VIDEO_SRC;
export const SUDO_MULTI_VEHICLES_VIDEO_INGEST_SRC =
  SUDO_MULTI_VEHICLES_VIDEO_SRC.replace(/%20/g, " ");
export const SUDO_DRONE_VIDEO_SRC = SUDO_SWID_DRONE_VIEW_VIDEO_SRC;
export const SUDO_ROCKET_LAUNCHER_IMAGE_SRC = resolvePublicAssetPath(
  "/sudo/rocket-launcher-aerial.png"
);
export const SUDO_TANK_CONVOY_IMAGE_SRC = resolvePublicAssetPath(
  "/sudo/tank-convoy-aerial.png"
);
export const SUDO_OPERATION_AREA_IMAGE_SRC = resolvePublicAssetPath(
  "/sudo/operation-area-aerial.jpg"
);
export const SUDO_SITUATION_ANALYSIS_BASE_MAP_IMAGE_SRC =
  resolvePublicAssetPath(
    "/sudo_data/_extracted/assets/9-1 사태분석도 및 도로정보/ppt_media/image1.png"
  );
export const SUDO_SCALE_FORMATION_REFERENCE_IMAGE_SRC = resolvePublicAssetPath(
  "/sudo_data/_extracted/slides/3-1 부대별 행군장경 data/슬라이드1.PNG"
);
export const SUDO_SCALE_DRONE_FRAME_IMAGE_SRC = resolvePublicAssetPath(
  "/sudo_data/_extracted/assets/1-1 장도훈련장 기동(1)/video_frames/frame_02_37.png"
);
export const SUDO_BATTALION_SCALE_FRAME_IMAGE_SRC =
  SUDO_SCALE_DRONE_FRAME_IMAGE_SRC;
export const SUDO_BDA_FIGURE_IMAGE_SRC = resolvePublicAssetPath(
  "/sudo_data/_extracted/scenario_6_1/figures/page_06_figure_10_xref_154.png"
);
export const SUDO_ORDER_REFERENCE_IMAGE_SRC = resolvePublicAssetPath(
  "/sudo_data/_extracted/slides/4-1 훈련장 인근부대 위치， 보유 장비 등/슬라이드1.PNG"
);
export const SUDO_COLLATERAL_REFERENCE_IMAGE_SRC = resolvePublicAssetPath(
  "/sudo_data/_extracted/slides/5-1 탄종별 부수적 효과반경/슬라이드1.PNG"
);
export const SUDO_ARTILLERY_BATTERY_IMAGE_SRC = resolvePublicAssetPath(
  "/sudo/artillery-battery-aerial.png"
);
export const SUDO_COMMAND_CENTER_IMAGE_SRC = resolvePublicAssetPath(
  "/sudo/command-center.png"
);
export const SUDO_AIC_LOGO_SRC = resolvePublicAssetPath("/AIC.png");
export const SUDO_CHUNGUI_AI_LOGO_SRC =
  resolvePublicAssetPath("/sudo_logo.png");
export const SUDO_ALERT_SIGNAL_IMAGE_SRC = resolvePublicAssetPath(
  "/sudo/sudo-alert-signal-v1.png"
);

const FRAME_CAPTURE_TIMEOUT_MS = 9000;
const DEFAULT_FRAME_COUNT = 4;
const MAX_FRAME_WIDTH = 960;
const MAX_IMAGE_WIDTH = 960;
type SudoCanPlayTypeFn = (mimeType: string) => string;

export type SudoDroneVideoTransport = "mock-file" | "http" | "rtsp";

export interface SudoDroneVideoSource {
  playbackSrc: string;
  ingestSrc: string;
  transport: SudoDroneVideoTransport;
  label: string;
}

export type SudoDroneVideoGraphicsQuality =
  | "low"
  | "medium"
  | "high"
  | "veryHigh";
type SudoFlightSimGraphicsQuality = "low" | "medium" | "high";

export const DEFAULT_SUDO_DRONE_VIDEO_GRAPHICS_QUALITY: SudoDroneVideoGraphicsQuality =
  "veryHigh";
export const DEFAULT_SUDO_DRONE_VIDEO_ANTIALIASING = true;

export interface SudoDroneVideoSettings {
  playbackUrl: string;
  rtspUrl: string;
  graphicsQuality?: SudoDroneVideoGraphicsQuality;
  antialiasing?: boolean;
}

type SudoDroneVideoSettingsInput = Partial<
  Omit<SudoDroneVideoSettings, "graphicsQuality" | "antialiasing">
> & {
  graphicsQuality?: unknown;
  antialiasing?: unknown;
};

type ResolvedSudoDroneVideoSettings = SudoDroneVideoSettings & {
  graphicsQuality: SudoDroneVideoGraphicsQuality;
  antialiasing: boolean;
};

export interface SudoDroneVideoPreset {
  id: string;
  label: string;
  description: string;
  settings: SudoDroneVideoSettings;
}

export interface SudoScenarioLevelMedia {
  scenarioLevel: SudoScenarioLevel;
  targetDetectionLabel: string;
  targetClassificationLabel: string;
  targetConfidenceLabel: string;
  targetFrameImageSrc: string;
  scaleFrameImageSrc: string;
  scaleFrameSourceLabel: string;
  droneVideoSrc: string;
  droneVideoLabel: string;
  droneVideoDescription: string;
  todVideoSrc: string;
  todVideoLabel: string;
  droneDetectionStartSeconds: number;
  droneDetectionStartRatio: number;
  todDetectionStartSeconds: number;
  todDetectionStartRatio: number;
}

export const EMPTY_SUDO_DRONE_VIDEO_SOURCE: SudoDroneVideoSource = {
  playbackSrc: "",
  ingestSrc: "",
  transport: "http",
  label: "영상 미입력",
};

export const SUDO_SCENARIO_LEVEL_MEDIA: Record<
  SudoScenarioLevel,
  SudoScenarioLevelMedia
> = {
  corps: {
    scenarioLevel: "corps",
    targetDetectionLabel: "T-72 전차",
    targetClassificationLabel: "T-72 전차",
    targetConfidenceLabel: "94.6%",
    targetFrameImageSrc: SUDO_CORPS_TARGET_NATURE_FRAME_IMAGE_SRC,
    scaleFrameImageSrc: SUDO_CORPS_SCALE_FRAME_IMAGE_SRC,
    scaleFrameSourceLabel: "SWID 전차 실제 영상",
    droneVideoSrc: SUDO_CORPS_SWID_DRONE_VIEW_VIDEO_SRC,
    droneVideoLabel: "SWID 전차 실제 영상",
    droneVideoDescription: "260616 SWID 전차 드론 시점 영상",
    todVideoSrc: SUDO_CORPS_TOD_SURVEILLANCE_VIDEO_SRC,
    todVideoLabel: "TOD 전차 실제 영상",
    droneDetectionStartSeconds: 57,
    droneDetectionStartRatio: 0.614,
    todDetectionStartSeconds: 18.5,
    todDetectionStartRatio: 0.103,
  },
  battalion: {
    scenarioLevel: "battalion",
    targetDetectionLabel: "240mm 방사포",
    targetClassificationLabel: "240mm 방사포(M-1991)",
    targetConfidenceLabel: "99.8%",
    targetFrameImageSrc: SUDO_BATTALION_TARGET_NATURE_FRAME_IMAGE_SRC,
    scaleFrameImageSrc: SUDO_BATTALION_SCALE_FRAME_IMAGE_SRC,
    scaleFrameSourceLabel: "1-1 장도훈련장 기동(1)",
    droneVideoSrc: SUDO_BATTALION_SWID_DRONE_VIEW_VIDEO_SRC,
    droneVideoLabel: "SWID 천무1 실제 영상",
    droneVideoDescription: "260616 SWID 천무1 드론 시점 영상",
    todVideoSrc: SUDO_BATTALION_TOD_SURVEILLANCE_VIDEO_SRC,
    todVideoLabel: "TOD 천무 실제 영상",
    droneDetectionStartSeconds: 44.1,
    droneDetectionStartRatio: 0.305,
    todDetectionStartSeconds: 126.5,
    todDetectionStartRatio: 0.26,
  },
};

export function getSudoScenarioLevelMedia(
  scenarioLevel: SudoScenarioLevel = "corps"
) {
  return SUDO_SCENARIO_LEVEL_MEDIA[scenarioLevel];
}

export type SudoPlaybackKind =
  | "mp4"
  | "webm"
  | "ogg"
  | "hls"
  | "webrtc"
  | "rtsp"
  | "unknown";

export interface SudoPlaybackInspection {
  kind: SudoPlaybackKind;
  playable: boolean;
  attention: boolean;
  diagnostic: string;
}

export const SUDO_DRONE_VIDEO_PRESETS: SudoDroneVideoPreset[] = [
  {
    id: "actual-swid-chunmoo-1",
    label: "SWID 천무1",
    description: "260616 SWID 천무1 MP4",
    settings: {
      playbackUrl: SUDO_SWID_DRONE_VIEW_VIDEO_SRC,
      rtspUrl: "",
    },
  },
  {
    id: "actual-jangdo-mobility-2",
    label: "1-1 장도훈련장 기동(2)",
    description: "sudo_data WMV 변환 MP4",
    settings: {
      playbackUrl: SUDO_JANGDO_MOBILITY_2_VIDEO_SRC,
      rtspUrl: "",
    },
  },
  {
    id: "actual-jangdo-mobility-3",
    label: "1-1 장도훈련장 기동(3)",
    description: "sudo_data WMV 변환 MP4",
    settings: {
      playbackUrl: SUDO_JANGDO_MOBILITY_3_VIDEO_SRC,
      rtspUrl: "",
    },
  },
  {
    id: "actual-object-recognition",
    label: "2-5 객체인식",
    description: "표적성질 분석용 실제 객체인식 MP4",
    settings: {
      playbackUrl: SUDO_OBJECT_RECOGNITION_VIDEO_SRC,
      rtspUrl: "",
    },
  },
  {
    id: "actual-chunmoo-intro",
    label: "2-1 천무 소개",
    description: "천무 장비 참고 실제 변환 MP4",
    settings: {
      playbackUrl: SUDO_CHUNMOO_INTRO_VIDEO_SRC,
      rtspUrl: "",
    },
  },
  {
    id: "actual-chunmoo-fire-1",
    label: "2-2 천무 사격(1)",
    description: "천무 사격 참고 실제 변환 MP4",
    settings: {
      playbackUrl: SUDO_CHUNMOO_FIRE_1_VIDEO_SRC,
      rtspUrl: "",
    },
  },
  {
    id: "actual-chunmoo-fire-2",
    label: "2-3 천무 사격(2)",
    description: "천무 사격 참고 실제 변환 MP4",
    settings: {
      playbackUrl: SUDO_CHUNMOO_FIRE_2_VIDEO_SRC,
      rtspUrl: "",
    },
  },
];

export function getSudoTargetDroneVideoPresets(
  scenarioLevel: SudoScenarioLevel = "corps"
): SudoDroneVideoPreset[] {
  const levelMedia = getSudoScenarioLevelMedia(scenarioLevel);

  return [
    {
      id: `drone-1-swid-${scenarioLevel}`,
      label: "드론1",
      description: levelMedia.droneVideoDescription,
      settings: {
        playbackUrl: levelMedia.droneVideoSrc,
        rtspUrl: "",
      },
    },
    {
      id: "drone-2-jangdo",
      label: "드론2",
      description: "장도훈련장 기동(3) 드론 EO 영상",
      settings: {
        playbackUrl: SUDO_JANGDO_MOBILITY_3_VIDEO_SRC,
        rtspUrl: "",
      },
    },
  ];
}

export const SUDO_TARGET_DRONE_VIDEO_PRESETS: SudoDroneVideoPreset[] =
  getSudoTargetDroneVideoPresets("corps");

function normalizeVideoPresetPath(value: string) {
  try {
    const parsed = new URL(
      value,
      typeof window === "undefined" ? "http://localhost" : window.location.href
    );
    return decodeURIComponent(parsed.pathname)
      .replace(/\\/g, "/")
      .toLowerCase();
  } catch {
    try {
      return decodeURIComponent(value).replace(/\\/g, "/").toLowerCase();
    } catch {
      return value.replace(/\\/g, "/").toLowerCase();
    }
  }
}

export function getSudoTargetDroneVideoPresetId(
  source: Pick<SudoDroneVideoSource, "playbackSrc"> | SudoDroneVideoSettings,
  scenarioLevel?: SudoScenarioLevel
) {
  const playbackSrc =
    "playbackSrc" in source ? source.playbackSrc : source.playbackUrl;
  if (
    isRetiredBattalionSwidDroneVideoUrl(playbackSrc) ||
    isGeneratedPreprocessedDetectionVideoUrl(playbackSrc)
  ) {
    return !scenarioLevel || scenarioLevel === "battalion"
      ? "drone-1-swid-battalion"
      : undefined;
  }

  const normalizedSource = normalizeVideoPresetPath(playbackSrc);
  const presets = scenarioLevel
    ? getSudoTargetDroneVideoPresets(scenarioLevel)
    : [
        ...getSudoTargetDroneVideoPresets("corps"),
        ...getSudoTargetDroneVideoPresets("battalion"),
      ];
  return presets.find((preset) => {
    const presetPath = normalizeVideoPresetPath(preset.settings.playbackUrl);
    return (
      normalizedSource === presetPath || normalizedSource.endsWith(presetPath)
    );
  })?.id;
}

const SUDO_DRONE_PLAYBACK_URL_KEY = "sudo.drone.playback-url.v1";
const SUDO_DRONE_RTSP_URL_KEY = "sudo.drone.rtsp-url.v1";
const SUDO_DRONE_GRAPHICS_QUALITY_KEY = "sudo.drone.graphics-quality.v1";
const SUDO_DRONE_ANTIALIASING_KEY = "sudo.drone.antialiasing.v1";
const SUDO_LEGACY_MOCK_DRONE_VIDEO_SRC = "/vid/drone_view.mp4";
const SUDO_LEGACY_DEFAULT_DRONE_VIDEO_SRCS = [SUDO_JANGDO_MOBILITY_VIDEO_SRC];
const SUDO_RETIRED_BATTALION_SWID_DRONE_VIDEO_SRCS = [
  "/vid/260616/SWID/[SWID]천무 전차 통합이동mp4.mp4",
];

function isLegacyMockDroneVideoUrl(url: string) {
  return (
    normalizeVideoPresetPath(url) ===
    normalizeVideoPresetPath(SUDO_LEGACY_MOCK_DRONE_VIDEO_SRC)
  );
}

function isLegacyDefaultDroneVideoUrl(url: string) {
  const normalizedUrl = normalizeVideoPresetPath(url);
  return SUDO_LEGACY_DEFAULT_DRONE_VIDEO_SRCS.some(
    (legacySrc) => normalizedUrl === normalizeVideoPresetPath(legacySrc)
  );
}

function isRetiredBattalionSwidDroneVideoUrl(url: string) {
  const normalizedUrl = normalizeVideoPresetPath(url);
  return SUDO_RETIRED_BATTALION_SWID_DRONE_VIDEO_SRCS.some(
    (legacySrc) => normalizedUrl === normalizeVideoPresetPath(legacySrc)
  );
}

function isGeneratedPreprocessedDetectionVideoUrl(url: string) {
  return (
    normalizeVideoPresetPath(url) ===
    "/vid/260616/swid/swid-integrated-yolo-preprocessed.mp4"
  );
}

function normalizeOptionalEnvUrl(value: unknown) {
  const url = String(value ?? "").trim();
  if (isLegacyMockDroneVideoUrl(url)) {
    return undefined;
  }
  if (isLegacyDefaultDroneVideoUrl(url)) {
    return SUDO_DRONE_VIDEO_SRC;
  }
  if (isRetiredBattalionSwidDroneVideoUrl(url)) {
    return SUDO_BATTALION_SWID_DRONE_VIEW_VIDEO_SRC;
  }
  if (isGeneratedPreprocessedDetectionVideoUrl(url)) {
    return SUDO_DRONE_VIDEO_SRC;
  }

  return url.length > 0 ? url : undefined;
}

function normalizeBooleanValue(value: unknown, fallback: boolean) {
  if (typeof value === "boolean") {
    return value;
  }

  const normalized = String(value ?? "").trim().toLowerCase();
  if (!normalized.length) {
    return fallback;
  }

  if (["1", "true", "yes", "y", "on", "enable", "enabled"].includes(normalized)) {
    return true;
  }

  if (["0", "false", "no", "n", "off", "disable", "disabled"].includes(normalized)) {
    return false;
  }

  return fallback;
}

function normalizeSudoDroneVideoGraphicsQuality(
  value: unknown,
): SudoDroneVideoGraphicsQuality {
  const normalized = String(value ?? "").trim().toLowerCase();

  if (normalized === "low") {
    return "low";
  }

  if (normalized === "medium" || normalized === "normal") {
    return "medium";
  }

  if (normalized === "high") {
    return "high";
  }

  if (
    normalized === "veryhigh" ||
    normalized === "very-high" ||
    normalized === "very_high" ||
    normalized === "ultra"
  ) {
    return "veryHigh";
  }

  return DEFAULT_SUDO_DRONE_VIDEO_GRAPHICS_QUALITY;
}

export function getSudoDroneFeedGraphicsSettings(
  settings: SudoDroneVideoSettingsInput = {}
): ResolvedSudoDroneVideoSettings {
  const playbackUrl =
    typeof settings.playbackUrl === "string" ? settings.playbackUrl.trim() : "";
  const rtspUrl =
    typeof settings.rtspUrl === "string" ? settings.rtspUrl.trim() : "";

  return {
    playbackUrl,
    rtspUrl,
    graphicsQuality: normalizeSudoDroneVideoGraphicsQuality(
      settings.graphicsQuality ?? DEFAULT_SUDO_DRONE_VIDEO_GRAPHICS_QUALITY
    ),
    antialiasing: normalizeBooleanValue(
      settings.antialiasing ?? DEFAULT_SUDO_DRONE_VIDEO_ANTIALIASING,
      DEFAULT_SUDO_DRONE_VIDEO_ANTIALIASING
    ),
  };
}

export function getSudoDroneFeedQualityForFlightSim(
  settings: SudoDroneVideoSettingsInput = {}
): {
  graphicsQuality: SudoFlightSimGraphicsQuality;
  antialiasing: boolean;
} {
  const normalized = getSudoDroneFeedGraphicsSettings(settings);
  return {
    graphicsQuality:
      normalized.graphicsQuality === "veryHigh" ? "high" : normalized.graphicsQuality,
    antialiasing: normalized.antialiasing,
  };
}

function readRuntimeEnvValue(key: string, env: Record<string, unknown>) {
  const runtimeEnv = (
    globalThis as typeof globalThis & {
      process?: { env?: Record<string, string | undefined> };
    }
  ).process?.env;

  return env[key] ?? runtimeEnv?.[key];
}

export function buildSudoDroneVideoPresets(
  env: Record<string, unknown> = import.meta.env
) {
  const playbackUrl = normalizeOptionalEnvUrl(
    readRuntimeEnvValue("VITE_SUDO_DRONE_VIDEO_URL", env)
  );
  const rtspUrl = normalizeOptionalEnvUrl(
    readRuntimeEnvValue("VITE_SUDO_RTSP_URL", env)
  );
  if (!playbackUrl && !rtspUrl) {
    return SUDO_DRONE_VIDEO_PRESETS;
  }

  const fieldPreset: SudoDroneVideoPreset = {
    id: "field-configured",
    label: "현장 설정",
    description:
      playbackUrl && rtspUrl
        ? "env RTSP ingest + playback URL"
        : rtspUrl
          ? "env RTSP ingest"
          : "env playback URL",
    settings: {
      playbackUrl: playbackUrl ?? "",
      rtspUrl: rtspUrl ?? "",
    },
  };

  return [fieldPreset, ...SUDO_DRONE_VIDEO_PRESETS];
}

function readStorageValue(key: string) {
  if (typeof window === "undefined") {
    return "";
  }

  const value = window.localStorage.getItem(key)?.trim() ?? "";
  if (key === SUDO_DRONE_PLAYBACK_URL_KEY && isLegacyMockDroneVideoUrl(value)) {
    window.localStorage.removeItem(key);
    return "";
  }
  if (
    key === SUDO_DRONE_PLAYBACK_URL_KEY &&
    isLegacyDefaultDroneVideoUrl(value)
  ) {
    window.localStorage.setItem(key, SUDO_DRONE_VIDEO_SRC);
    return SUDO_DRONE_VIDEO_SRC;
  }
  if (
    key === SUDO_DRONE_PLAYBACK_URL_KEY &&
    isRetiredBattalionSwidDroneVideoUrl(value)
  ) {
    window.localStorage.setItem(key, SUDO_BATTALION_SWID_DRONE_VIEW_VIDEO_SRC);
    return SUDO_BATTALION_SWID_DRONE_VIEW_VIDEO_SRC;
  }
  if (
    key === SUDO_DRONE_PLAYBACK_URL_KEY &&
    isGeneratedPreprocessedDetectionVideoUrl(value)
  ) {
    window.localStorage.setItem(key, SUDO_DRONE_VIDEO_SRC);
    return SUDO_DRONE_VIDEO_SRC;
  }

  return value;
}

function writeStorageValue(key: string, value: string) {
  if (typeof window === "undefined") {
    return;
  }

  const trimmed = value.trim();
  if (trimmed.length === 0) {
    window.localStorage.removeItem(key);
    return;
  }

  window.localStorage.setItem(key, trimmed);
}

export function readSudoDroneVideoSettings(): SudoDroneVideoSettings {
  return getSudoDroneFeedGraphicsSettings({
    playbackUrl: readStorageValue(SUDO_DRONE_PLAYBACK_URL_KEY),
    rtspUrl: readStorageValue(SUDO_DRONE_RTSP_URL_KEY),
    graphicsQuality: readStorageValue(SUDO_DRONE_GRAPHICS_QUALITY_KEY),
    antialiasing: readStorageValue(SUDO_DRONE_ANTIALIASING_KEY),
  });
}

export function writeSudoDroneVideoSettings(settings: SudoDroneVideoSettings) {
  const normalized = getSudoDroneFeedGraphicsSettings(settings);
  writeStorageValue(SUDO_DRONE_PLAYBACK_URL_KEY, normalized.playbackUrl);
  writeStorageValue(SUDO_DRONE_RTSP_URL_KEY, normalized.rtspUrl);
  writeStorageValue(
    SUDO_DRONE_GRAPHICS_QUALITY_KEY,
    normalized.graphicsQuality
  );
  writeStorageValue(
    SUDO_DRONE_ANTIALIASING_KEY,
    normalized.antialiasing ? "1" : "0"
  );
}

export function clearSudoDroneVideoSettings() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(SUDO_DRONE_PLAYBACK_URL_KEY);
  window.localStorage.removeItem(SUDO_DRONE_RTSP_URL_KEY);
  window.localStorage.removeItem(SUDO_DRONE_GRAPHICS_QUALITY_KEY);
  window.localStorage.removeItem(SUDO_DRONE_ANTIALIASING_KEY);
}

export function redactSudoMediaUrl(value: string) {
  const source = value.trim();
  if (!source) {
    return "";
  }

  try {
    const parsed = new URL(
      source,
      typeof window === "undefined" ? "http://localhost" : window.location.href
    );
    if (parsed.username) {
      parsed.username = "***";
    }
    if (parsed.password) {
      parsed.password = "***";
    }

    if (/^[a-z][a-z0-9+.-]*:\/\//i.test(source)) {
      return parsed.toString();
    }

    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return source;
  }
}

export function redactSudoMediaDiagnostic(diagnostic: string, url?: string) {
  const source = String(url ?? "").trim();
  if (!source) {
    return diagnostic;
  }

  return diagnostic.split(source).join(redactSudoMediaUrl(source));
}

function getPlaybackPath(value: string) {
  try {
    const parsed = new URL(
      value,
      typeof window === "undefined" ? "http://localhost" : window.location.href
    );
    return `${parsed.protocol}//${parsed.host}${parsed.pathname}`.toLowerCase();
  } catch {
    return value.toLowerCase();
  }
}

function getVideoCanPlayType(): SudoCanPlayTypeFn {
  if (typeof document === "undefined") {
    return () => "";
  }

  const video = document.createElement("video");
  return (mimeType: string) => video.canPlayType(mimeType);
}

function supportsAnyMimeType(
  mimeTypes: string[],
  canPlayType: SudoCanPlayTypeFn = getVideoCanPlayType()
) {
  return mimeTypes.some((mimeType) => Boolean(canPlayType(mimeType)));
}

export function inspectSudoPlaybackSource(
  source: Pick<SudoDroneVideoSource, "playbackSrc" | "transport">,
  options: { canPlayType?: SudoCanPlayTypeFn } = {}
): SudoPlaybackInspection {
  const playbackSrc = String(source.playbackSrc ?? "").trim();
  if (!playbackSrc) {
    return {
      kind: "unknown",
      playable: false,
      attention: true,
      diagnostic:
        "브라우저 playback URL이 비어 있습니다. RTSP ingest는 detector에서 처리하더라도 화면/프레임 캡처용 URL이 필요합니다.",
    };
  }

  const normalizedPath = getPlaybackPath(playbackSrc);
  if (normalizedPath.startsWith("rtsp://")) {
    return {
      kind: "rtsp",
      playable: false,
      attention: true,
      diagnostic:
        "RTSP는 브라우저 video 태그가 직접 재생할 수 없습니다. HLS, WebRTC, MJPEG, 또는 MP4 proxy playback URL을 함께 설정하세요.",
    };
  }

  if (/\.m3u8(?:$|[?#])/.test(normalizedPath)) {
    const playable = supportsAnyMimeType(
      [
        "application/vnd.apple.mpegurl",
        "application/x-mpegURL",
        "application/mpegurl",
      ],
      options.canPlayType
    );
    return {
      kind: "hls",
      playable,
      attention: !playable,
      diagnostic: playable
        ? "HLS playback URL은 현재 브라우저에서 재생 가능 형식으로 보입니다."
        : "현재 브라우저는 HLS(.m3u8)를 네이티브로 재생하지 못할 수 있습니다. hls.js/MSE proxy, WebRTC, 또는 MP4 preview를 준비하세요.",
    };
  }

  if (/\.mp4(?:$|[?#])/.test(normalizedPath)) {
    return {
      kind: "mp4",
      playable: true,
      attention: false,
      diagnostic:
        "MP4 playback URL은 브라우저 프레임 캡처 입력으로 사용할 수 있습니다.",
    };
  }

  if (/\.webm(?:$|[?#])/.test(normalizedPath)) {
    return {
      kind: "webm",
      playable: true,
      attention: false,
      diagnostic:
        "WebM playback URL은 브라우저 프레임 캡처 입력으로 사용할 수 있습니다.",
    };
  }

  if (/\.og[gv](?:$|[?#])/.test(normalizedPath)) {
    return {
      kind: "ogg",
      playable: true,
      attention: false,
      diagnostic:
        "Ogg playback URL은 브라우저 프레임 캡처 입력으로 사용할 수 있습니다.",
    };
  }

  if (/webrtc|whep|whip/i.test(playbackSrc)) {
    return {
      kind: "webrtc",
      playable: false,
      attention: true,
      diagnostic:
        "WebRTC/WHEP 주소는 video src로 바로 캡처되지 않을 수 있습니다. 화면 재생용 컴포넌트와 VLM 프레임 캡처용 snapshot/MP4/HLS 경로를 분리하세요.",
    };
  }

  return {
    kind: "unknown",
    playable: source.transport === "mock-file",
    attention: source.transport !== "mock-file",
    diagnostic:
      source.transport === "mock-file"
        ? "로컬 영상 파일 경로를 사용합니다."
        : "playback URL 확장자를 확인할 수 없습니다. 브라우저 재생 가능 HLS/MP4/WebM/OGG 또는 별도 snapshot 경로인지 확인하세요.",
  };
}

export function getSudoDroneVideoSource(
  settings: Partial<SudoDroneVideoSettings> = readSudoDroneVideoSettings()
): SudoDroneVideoSource {
  const configuredSource = getConfiguredSudoDroneVideoSource(settings);
  if (configuredSource) {
    return configuredSource;
  }

  return {
    playbackSrc: SUDO_DRONE_VIDEO_SRC,
    ingestSrc: SUDO_DRONE_VIDEO_SRC,
    transport: "http",
    label: "SWID 천무1 영상",
  };
}

function buildConfiguredSudoDroneVideoSource(
  playbackSrc: string | undefined,
  rtspSrc: string | undefined
): SudoDroneVideoSource | undefined {
  if (rtspSrc) {
    return {
      playbackSrc: playbackSrc ?? "",
      ingestSrc: rtspSrc,
      transport: "rtsp",
      label: "RTSP ingest",
    };
  }

  if (playbackSrc) {
    return {
      playbackSrc,
      ingestSrc: playbackSrc,
      transport: "http",
      label: "Live video",
    };
  }

  return undefined;
}

export function getExplicitSudoDroneVideoSource(
  settings: Partial<SudoDroneVideoSettings> = readSudoDroneVideoSettings()
): SudoDroneVideoSource | undefined {
  return buildConfiguredSudoDroneVideoSource(
    normalizeOptionalEnvUrl(settings.playbackUrl),
    normalizeOptionalEnvUrl(settings.rtspUrl)
  );
}

export function getConfiguredSudoDroneVideoSource(
  settings: Partial<SudoDroneVideoSettings> = readSudoDroneVideoSettings()
): SudoDroneVideoSource | undefined {
  return (
    getExplicitSudoDroneVideoSource(settings) ??
    buildConfiguredSudoDroneVideoSource(
      normalizeOptionalEnvUrl(
        readRuntimeEnvValue("VITE_SUDO_DRONE_VIDEO_URL", import.meta.env)
      ),
      normalizeOptionalEnvUrl(
        readRuntimeEnvValue("VITE_SUDO_RTSP_URL", import.meta.env)
      )
    )
  );
}

function waitForMediaEvent(
  target: HTMLMediaElement,
  eventName: keyof HTMLMediaElementEventMap,
  timeoutMs = FRAME_CAPTURE_TIMEOUT_MS
) {
  return new Promise<void>((resolve, reject) => {
    const timeoutId = window.setTimeout(() => {
      cleanup();
      reject(new Error(`Timed out waiting for ${eventName}`));
    }, timeoutMs);

    const cleanup = () => {
      window.clearTimeout(timeoutId);
      target.removeEventListener(eventName, handleEvent);
      target.removeEventListener("error", handleError);
    };
    const handleEvent = () => {
      cleanup();
      resolve();
    };
    const handleError = () => {
      cleanup();
      reject(new Error("Video frame source failed to load"));
    };

    target.addEventListener(eventName, handleEvent, { once: true });
    target.addEventListener("error", handleError, { once: true });
  });
}

function toBase64Payload(dataUrl: string) {
  return dataUrl.replace(/^data:image\/[a-zA-Z0-9.+-]+;base64,/, "");
}

function drawVideoFrame(video: HTMLVideoElement) {
  const sourceWidth = video.videoWidth || 1280;
  const sourceHeight = video.videoHeight || 720;
  const scale = Math.min(1, MAX_FRAME_WIDTH / sourceWidth);
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(sourceWidth * scale));
  canvas.height = Math.max(1, Math.round(sourceHeight * scale));
  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Canvas context unavailable");
  }

  context.drawImage(video, 0, 0, canvas.width, canvas.height);
  return toBase64Payload(canvas.toDataURL("image/jpeg", 0.82));
}

function loadBlobImage(blob: Blob) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    const objectUrl = URL.createObjectURL(blob);
    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Image source failed to load"));
    };
    image.src = objectUrl;
  });
}

async function drawImageBlobAsBase64(blob: Blob) {
  const image = await loadBlobImage(blob);
  const scale = Math.min(1, MAX_IMAGE_WIDTH / image.naturalWidth);
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Canvas context unavailable");
  }

  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  return toBase64Payload(canvas.toDataURL("image/jpeg", 0.82));
}

function resolveVideoFrameTimes(duration: number, frameCount: number) {
  const safeCount = Math.max(1, frameCount);
  if (!Number.isFinite(duration) || duration <= 0.5) {
    return Array.from({ length: safeCount }, (_, index) => index * 0.25);
  }

  const start = Math.min(0.35, duration * 0.08);
  const end = Math.max(start, duration - Math.min(0.35, duration * 0.08));
  if (safeCount === 1) {
    return [(start + end) / 2];
  }

  return Array.from({ length: safeCount }, (_, index) => {
    const ratio = index / (safeCount - 1);
    return start + (end - start) * ratio;
  });
}

export async function captureVideoFramesAsBase64(
  source = SUDO_TANK_VIDEO_SRC,
  frameCount = DEFAULT_FRAME_COUNT
) {
  if (typeof document === "undefined") {
    return [];
  }

  const video = document.createElement("video");
  video.muted = true;
  video.playsInline = true;
  video.preload = "auto";
  video.crossOrigin = "anonymous";
  video.src = new URL(source, window.location.href).toString();
  video.load();

  if (video.readyState < HTMLMediaElement.HAVE_METADATA) {
    await waitForMediaEvent(video, "loadedmetadata");
  }
  if (video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
    await waitForMediaEvent(video, "loadeddata");
  }

  const frames: string[] = [];
  const frameTimes = resolveVideoFrameTimes(video.duration, frameCount);
  for (const time of frameTimes) {
    video.currentTime = Math.min(Math.max(time, 0), video.duration || time);
    await waitForMediaEvent(video, "seeked");
    frames.push(drawVideoFrame(video));
  }

  video.removeAttribute("src");
  video.load();
  return frames;
}

export async function loadImageAsBase64(source: string) {
  const response = await fetch(source);
  if (!response.ok) {
    throw new Error(`Unable to load image ${source}`);
  }

  const blob = await response.blob();
  return drawImageBlobAsBase64(blob);
}
