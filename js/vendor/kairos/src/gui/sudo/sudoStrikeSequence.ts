export interface SudoStrikeSequenceStep {
  id: number;
  label: string;
  time: string;
  title: string;
  firingUnits: string[];
  firingElements: string[];
  origin: string;
  target: string;
  munition: string;
  rounds: string;
  impact: string;
  commandId: string;
  firesArtillery: boolean;
  statusLabel: string;
  detail: string;
}

export const SUDO_STRIKE_SEQUENCE_STEPS: SudoStrikeSequenceStep[] = [
  {
    id: 1,
    label: "1/6 타격",
    time: "10:34~10:36",
    title: "대대급 100포병대대 사격",
    firingUnits: ["100포병대대(K105A1)"],
    firingElements: ["문혜리 100포병대대 HE 3R"],
    origin: "문혜리 100포병대대 포상",
    target: "장도훈련장 240MM 방사포 표적",
    munition: "HE",
    rounds: "HE탄 3R",
    impact: "표적지 낙탄 6R",
    commandId: "strike-step-1-battalion",
    firesArtillery: true,
    statusLabel: "문혜리 100포병대대 HE 3R 사격 진행",
    detail: "S7~S8 산출 결과인 HE 6발을 문혜리 100포병대대 HE탄 3R 사격지시로 연결합니다.",
  },
  {
    id: 2,
    label: "2/6 타격",
    time: "10:55~10:57",
    title: "SEAD 사전 포병사격",
    firingUnits: ["602포병대대", "포1대대", "669포병대대"],
    firingElements: ["문혜리 602+포1대대 HE 12R", "송호동 669대대 HE 12R"],
    origin: "문혜리 602+포1대대 / 송호동 669대대 SEAD 사격진지",
    target: "00 고사포 대대 등 3개 표적",
    munition: "HE",
    rounds: "HE탄 24R",
    impact: "표적지 낙탄 24R",
    commandId: "strike-step-2-sead",
    firesArtillery: true,
    statusLabel: "문혜리 602+포1 HE 12R / 송호동 669 HE 12R SEAD 진행",
    detail: "DP 도달 전 00 고사포 대대 등 3개 표적에 문혜리 602+포1대대 HE 12R, 송호동 669대대 HE 12R을 사격합니다.",
  },
  {
    id: 3,
    label: "3/6 타격",
    time: "10:58~11:00",
    title: "CAS/RJS 진입",
    firingUnits: ["19전투비행단 F-16 2/T"],
    firingElements: ["포격 없음"],
    origin: "장도훈련장 CAS/RJS 진입축",
    target: "DP 이후 이동 중인 적 전차",
    munition: "CAS 절차숙달",
    rounds: "실무장 투하 없음",
    impact: "RJS 영상정보 전송",
    commandId: "strike-step-3-cas",
    firesArtillery: false,
    statusLabel: "19전투비행단 F-16 2/T CAS/RJS 진행, 포격 없음",
    detail: "F-16 2/T가 CAS/RJS 절차를 수행하고 전차 표적 영상정보를 전송합니다.",
  },
  {
    id: 4,
    label: "4/6 타격",
    time: "11:01~11:03",
    title: "TOT 주타격",
    firingUnits: ["602포병대대", "포1대대", "669포병대대"],
    firingElements: ["문혜리 602+포1대대 HE 12R", "송호동 669대대 HE 12R"],
    origin: "문혜리 602+포1대대 / 송호동 669대대 TOT 사격진지",
    target: "TAI 적 전차 표적",
    munition: "HE",
    rounds: "HE탄 24R",
    impact: "표적지 낙탄 48R",
    commandId: "strike-step-4-tot",
    firesArtillery: true,
    statusLabel: "문혜리 602+포1 HE 12R / 송호동 669 HE 12R TOT 진행",
    detail: "CAS 임무 이후 적 전차 표적에 문혜리 602+포1대대 HE 12R, 송호동 669대대 HE 12R을 TOT로 사격합니다.",
  },
  {
    id: 5,
    label: "5/6 타격",
    time: "11:06~11:07",
    title: "BDA 기반 재타격 명령",
    firingUnits: ["KAIROS", "가용포병"],
    firingElements: ["포격 없음"],
    origin: "장도훈련장 TAI BDA 판독점",
    target: "잔여 전차 표적",
    munition: "재타격 명령",
    rounds: "가용포병 사격명령",
    impact: "요망수준 미달성, 재타격 필요",
    commandId: "strike-step-5-bda-reattack-order",
    firesArtillery: false,
    statusLabel: "BDA 미달성 확인, 재타격 명령 생성, 포격 없음",
    detail: "SWID/UAV BDA에서 요망수준 미달성이 확인되어 가용포병 재타격 명령을 생성합니다.",
  },
  {
    id: 6,
    label: "6/6 타격",
    time: "11:08~11:10",
    title: "가용포병 재타격",
    firingUnits: ["602포병대대", "포1대대", "669포병대대"],
    firingElements: ["문혜리 602+포1대대 HE 12R", "송호동 669대대 HE 12R"],
    origin: "문혜리 602+포1대대 / 송호동 669대대 재타격 사격진지",
    target: "잔여 전차 표적",
    munition: "HE",
    rounds: "HE탄 24R",
    impact: "표적지 낙탄 48R",
    commandId: "strike-step-6-reattack",
    firesArtillery: true,
    statusLabel: "문혜리 602+포1 HE 12R / 송호동 669 HE 12R 재타격 진행",
    detail: "문혜리 602+포1대대 HE탄 12R과 송호동 669대대 HE탄 12R을 재타격 단계로 고정합니다.",
  },
];

export const SUDO_STRIKE_SEQUENCE_TOTAL = SUDO_STRIKE_SEQUENCE_STEPS.length;
export const SUDO_ARTILLERY_STRIKE_STEPS = SUDO_STRIKE_SEQUENCE_STEPS.filter(
  (step) => step.firesArtillery
);
export const SUDO_ARTILLERY_STRIKE_TOTAL =
  SUDO_ARTILLERY_STRIKE_STEPS.length;

export function getSudoStrikeSequenceStep(stepId: number) {
  return (
    SUDO_STRIKE_SEQUENCE_STEPS.find((step) => step.id === stepId) ??
    SUDO_STRIKE_SEQUENCE_STEPS[0]
  );
}

export function getSudoStrikeSequenceHoverText(step: SudoStrikeSequenceStep) {
  const fireSummary = step.firesArtillery
    ? `포격: ${step.firingElements.join(" / ")}`
    : `포격 없음: ${step.rounds}`;

  return `${step.label} · ${step.time} · ${step.title} · ${fireSummary} · 사격원점 ${step.origin} · 표적 ${step.target} · ${step.impact}`;
}

export function getSudoArtilleryStrikeButtonLabel(
  step: SudoStrikeSequenceStep
) {
  const artilleryIndex = SUDO_ARTILLERY_STRIKE_STEPS.findIndex(
    (artilleryStep) => artilleryStep.id === step.id
  );

  if (artilleryIndex < 0) {
    return step.label;
  }

  return `${artilleryIndex + 1}/${SUDO_ARTILLERY_STRIKE_TOTAL} 포격`;
}

export function getSudoArtilleryStrikeHoverText(
  step: SudoStrikeSequenceStep
) {
  if (!step.firesArtillery) {
    return getSudoStrikeSequenceHoverText(step);
  }

  return `${getSudoArtilleryStrikeButtonLabel(step)} · ${step.time} · ${step.title} · 포격: ${step.firingElements.join(" / ")} · 사격원점 ${step.origin} · 표적 ${step.target} · ${step.impact}`;
}
