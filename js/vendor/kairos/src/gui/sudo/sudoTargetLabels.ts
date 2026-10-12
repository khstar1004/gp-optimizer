import type { SudoDetectionBox } from "./sudoScenarios";

const genericVehiclePattern =
  /\b(car|truck|vehicle|bus|van|train|boat|motorcycle|person)\b|차량|트럭|자동차/i;
const tankPattern = /\b(tank|armored|armoured|afv|apc)\b|전차|장갑/i;
const launcherPattern =
  /\b(m-?1991|240|tel|rocket|launcher|mlrs|artillery)\b|방사포|발사대/i;
const mrlPattern = /\b(mrl|mlrs)\b/i;
const militaryTruckPattern = /\b(military truck|cargo truck)\b|군용\s*트럭/i;
const tubePattern = /\b(tube|barrel|pod|launcher tubes?)\b|발사관|포신/i;
const bodyPattern = /\b(chassis|body|cab)\b|차체|운전석/i;
const targetCoordinateTrackPattern = /^YOLO[-_\s]*(.*)$/i;

function normalizeLabelText(value: string | undefined) {
  return String(value ?? "")
    .trim()
    .toLowerCase();
}

function getDetectionLabelText(box: SudoDetectionBox) {
  return `${box.label ?? ""} ${box.rawLabel ?? ""} ${box.trackId ?? ""}`;
}

function hasGenericRawVehicleLabel(box: SudoDetectionBox) {
  const rawLabel = normalizeLabelText(box.rawLabel);
  return (
    Boolean(rawLabel) &&
    genericVehiclePattern.test(rawLabel) &&
    !shouldPreserveMilitaryLabel(rawLabel)
  );
}

function isGenericVehicleCandidateBox(box: SudoDetectionBox) {
  const label = normalizeLabelText(box.label);
  return hasGenericRawVehicleLabel(box) && launcherPattern.test(label);
}

function shouldPreserveMilitaryLabel(label: string) {
  return (
    launcherPattern.test(label) ||
    tubePattern.test(label) ||
    bodyPattern.test(label) ||
    tankPattern.test(label)
  );
}

function normalizeTargetCoordinateTrackId(trackId?: string) {
  const value = trackId?.trim();
  if (!value) {
    return undefined;
  }

  const match = targetCoordinateTrackPattern.exec(value);
  if (!match) {
    return value;
  }

  const suffix = match[1].replace(/^[-_\s]+/, "").trim();
  return suffix ? `TGT-${suffix}` : "TGT";
}

function resolveTargetCoordinateLabel(box: SudoDetectionBox) {
  const normalized = normalizeLabelText(box.label);
  const combined = `${normalized} ${normalizeLabelText(box.rawLabel)} ${normalizeLabelText(
    box.trackId
  )}`;

  if (
    normalized.includes("표적 후보") ||
    /\byolo\b/i.test(box.label) ||
    /\btarget\b/i.test(combined) ||
    genericVehiclePattern.test(combined) ||
    launcherPattern.test(combined)
  ) {
    return "표적 후보";
  }

  return box.label.trim();
}

function resolveMilitaryLabel(box: SudoDetectionBox, scenarioId: number) {
  const label = box.label.trim();
  if (scenarioId === 1) {
    return resolveTargetCoordinateLabel(box);
  }

  const normalized = normalizeLabelText(label);
  const trackId = normalizeLabelText(box.trackId);
  const combined = `${normalized} ${trackId}`;
  const scaleScenario = [3, 11, 12, 13].includes(scenarioId);

  if (
    scenarioId === 2 &&
    hasGenericRawVehicleLabel(box) &&
    launcherPattern.test(normalized)
  ) {
    return "차량 후보";
  }

  if (scaleScenario && mrlPattern.test(combined)) {
    return "MRL/MLRS";
  }

  if (scaleScenario && militaryTruckPattern.test(combined)) {
    return "군용 트럭";
  }

  if (scaleScenario && tankPattern.test(combined)) {
    return "전차";
  }

  if (scaleScenario && launcherPattern.test(combined)) {
    return "MRL/MLRS 후보";
  }

  if (scaleScenario && genericVehiclePattern.test(combined)) {
    return "군용 트럭";
  }

  if (tubePattern.test(combined)) {
    return "240mm 발사관";
  }

  if (bodyPattern.test(combined)) {
    return "차체";
  }

  if (launcherPattern.test(combined)) {
    if (scenarioId === 2) {
      return "M-1991 240mm TEL";
    }
    return "M-1991 240mm TEL";
  }

  if (scenarioId === 4 && genericVehiclePattern.test(combined)) {
    return "240mm 방사포 후보";
  }

  if (shouldPreserveMilitaryLabel(label)) {
    return label;
  }

  return label;
}

export function refineSudoDetectionLabels(
  detections: SudoDetectionBox[],
  scenarioId: number
) {
  return detections.map((box) => {
    const refinedLabel = resolveMilitaryLabel(box, scenarioId);
    const refinedTrackId =
      scenarioId === 1
        ? normalizeTargetCoordinateTrackId(box.trackId)
        : box.trackId;
    const labelChanged = refinedLabel !== box.label;
    const trackChanged = refinedTrackId !== box.trackId;

    if (!labelChanged && !trackChanged) {
      return box;
    }

    const nextBox: SudoDetectionBox = {
      ...box,
      label: refinedLabel,
    };
    if (labelChanged) {
      nextBox.rawLabel = box.rawLabel ?? box.label;
    }
    if (trackChanged) {
      nextBox.trackId = refinedTrackId;
    }

    return nextBox;
  });
}

export interface SudoDetectionTargetInference {
  label: string;
  confidence: number;
  count: number;
  evidence: string;
}

function inferDetectionCategory(
  detections: SudoDetectionBox[],
  scenarioId: number
) {
  const combined = detections.map(getDetectionLabelText).join(" ");
  const launcherCandidateText = detections
    .filter((box) => !isGenericVehicleCandidateBox(box))
    .map(getDetectionLabelText)
    .join(" ");
  const hasLauncher =
    launcherPattern.test(launcherCandidateText) ||
    detections.some(
      (box) =>
        !isGenericVehicleCandidateBox(box) &&
        /MRL|MLRS|TEL|방사포/i.test(box.label)
    );
  const hasLauncherComponents =
    tubePattern.test(combined) && bodyPattern.test(combined);
  const hasTank = detections.some((box) => {
    const label = normalizeLabelText(box.label);
    const sourceText = `${box.rawLabel ?? ""} ${box.trackId ?? ""}`;
    return label === "전차" || tankPattern.test(sourceText);
  });
  const hasVehicle = genericVehiclePattern.test(combined);
  const hasMilitaryTruck =
    militaryTruckPattern.test(combined) ||
    detections.some((box) => /군용 트럭/i.test(box.label));
  const scaleScenario = [3, 11, 12, 13].includes(scenarioId);

  if (scaleScenario && hasLauncher && (hasMilitaryTruck || hasVehicle)) {
    return "MRL/군용트럭 혼성";
  }

  if (scaleScenario && hasLauncher) {
    return "MRL/MLRS";
  }

  if (scaleScenario && hasTank) {
    return "전차";
  }

  if (scaleScenario && (hasMilitaryTruck || hasVehicle)) {
    return "군용 트럭";
  }

  if (scenarioId === 2 && (hasLauncher || hasLauncherComponents)) {
    return "240mm 방사포";
  }

  if (scenarioId === 4 && (hasLauncher || hasVehicle)) {
    return hasLauncher ? "240mm 방사포" : "240mm 방사포 후보";
  }

  if (hasLauncher || hasLauncherComponents) {
    return "240mm 방사포";
  }

  if (hasTank) {
    return "전차";
  }

  if (hasVehicle) {
    return "차량 후보";
  }

  return undefined;
}

export function inferSudoTargetFromDetections(
  detections: SudoDetectionBox[],
  scenarioId = 0
): SudoDetectionTargetInference | undefined {
  if (detections.length === 0) {
    return undefined;
  }

  const category = inferDetectionCategory(detections, scenarioId);
  const strongestDetection = detections.reduce((current, next) =>
    next.confidence > current.confidence ? next : current
  );
  const label =
    scenarioId === 3 && category
      ? `${category} 중대규모`
      : (category ?? strongestDetection.label);
  const confidence = Math.max(
    strongestDetection.confidence,
    detections.reduce((total, box) => total + box.confidence, 0) /
      detections.length
  );
  const labelSummary = [...new Set(detections.map((box) => box.label))]
    .slice(0, 4)
    .join(", ");

  return {
    label,
    confidence: Math.max(0, Math.min(1, confidence)),
    count: detections.length,
    evidence: `Detector bbox ${detections.length}건(${labelSummary})`,
  };
}
