import type { SudoScenarioTable } from "./sudoScenarios";
import { formatSudoSourceDisplayLabel } from "./sudoSourceDisplay";

export const SUDO_SITUATION_ANALYSIS_SOURCE_NAME = "9-1 사태분석도 및 도로정보";

export const SUDO_SITUATION_ANALYSIS_SOURCE_PATH =
  "client/public/sudo_data/md/sources/9-1 사태분석도 및 도로정보.md";

export interface SudoSituationRouteSourceRow {
  option: string;
  route: string;
  coverage: number;
  gap: number;
  fireLinkScore: number;
  basis: string;
  adjustment: string;
  source: string;
}

export interface SudoRoadInfoSourceRow {
  road: string;
  lanes: string;
  bridge: string;
  judgment: string;
  useProbability?: number;
}

type SudoDroneRedeploymentStatus = "이동명령" | "이동중" | "도착";

export interface SudoDroneRedeploymentSourceRow {
  droneId: string;
  destinationType: "NAI" | "DP" | "TAI";
  destinationName: string;
  coordinate: string;
  progressPercent: number;
  status: SudoDroneRedeploymentStatus;
  sourceSentence: string;
}

export const SUDO_SITUATION_ROUTE_SOURCE_ROWS: SudoSituationRouteSourceRow[] = [
  {
    option: "1번 도로",
    route: "1번 도로",
    coverage: 10,
    gap: 46,
    fireLinkScore: 58,
    basis: "작전목적 달성 제한, 수도권 진출 제한",
    adjustment: "비추천",
    source: `${SUDO_SITUATION_ANALYSIS_SOURCE_NAME} slide 1`,
  },
  {
    option: "3번 도로",
    route: "3번 도로",
    coverage: 70,
    gap: 8,
    fireLinkScore: 92,
    basis: "3번 도로[70%] 판단안, 수도권 진입 가능",
    adjustment: "감시 2 · 결심 2 · 타격 2",
    source: `${SUDO_SITUATION_ANALYSIS_SOURCE_NAME} slide 1 / sudo_senario_ver2 #9`,
  },
  {
    option: "5번 도로",
    route: "5번 도로",
    coverage: 20,
    gap: 28,
    fireLinkScore: 66,
    basis: "수도권 진입 가능하나 주 예상로 대비 감시·화력 연계 제한",
    adjustment: "대안축",
    source: `${SUDO_SITUATION_ANALYSIS_SOURCE_NAME} slide 1`,
  },
];

export const SUDO_ROAD_INFO_SOURCE_ROWS: SudoRoadInfoSourceRow[] = [
  {
    road: "1번",
    lanes: "2차선",
    bridge: "저차 통제 가능",
    judgment: "작전목적 달성 제한 / 예상확률 10%",
    useProbability: 10,
  },
  {
    road: "3번",
    lanes: "2차선",
    bridge: "저차 통과 가능",
    judgment: "수도권 진입 가능 / 예상확률 70%",
    useProbability: 70,
  },
  {
    road: "5번",
    lanes: "4차선",
    bridge: "다리 없음",
    judgment: "수도권 진입 가능 / 예상확률 20%",
    useProbability: 20,
  },
];

export const SUDO_DRONE_REDEPLOYMENT_SOURCE_ROWS: SudoDroneRedeploymentSourceRow[] =
  [
    {
      droneId: "1번 드론",
      destinationType: "TAI",
      destinationName: "#3 쑥고개",
      coordinate: "BH 13245 68820",
      progressPercent: 35,
      status: "이동중",
      sourceSentence: "1번드론은 TAI #3 지점인 쑥고개로 이동",
    },
    {
      droneId: "2번 드론",
      destinationType: "NAI",
      destinationName: "#4 말고개",
      coordinate: "BH 14562 31094",
      progressPercent: 48,
      status: "이동중",
      sourceSentence: "2번드론은 NAI #4 지점인 말고개로 이동",
    },
    {
      droneId: "3번 드론",
      destinationType: "TAI",
      destinationName: "#4 당동리",
      coordinate: "BH 15884 23301",
      progressPercent: 22,
      status: "이동명령",
      sourceSentence: "3번드론은 TAI #4 지점인 당동리로 이동",
    },
  ];

export function buildSudoSituationRouteDecisionInputs() {
  return SUDO_SITUATION_ROUTE_SOURCE_ROWS.map((row) => ({
    option: row.option,
    route: row.route,
    coverage: row.coverage,
    gap: row.gap,
    fireLinkScore: row.fireLinkScore,
  }));
}

export function buildSudoRoadInfoDecisionInputs() {
  return SUDO_ROAD_INFO_SOURCE_ROWS.map((row) => ({
    road: row.road,
    lanes: row.lanes,
    bridge: row.bridge,
    judgment: row.judgment,
    useProbability: row.useProbability,
  }));
}

export function buildSudoDroneRedeploymentDecisionInputs() {
  return SUDO_DRONE_REDEPLOYMENT_SOURCE_ROWS.map((row) => ({
    droneId: row.droneId,
    destinationType: row.destinationType,
    destinationName: row.destinationName,
    coordinate: row.coordinate,
    progressPercent: row.progressPercent,
    status: row.status,
  }));
}

export function buildSudoSituationAnalysisSourceTables(): SudoScenarioTable[] {
  return [
    {
      title: "9-1 사태분석도 원본 판단표",
      columns: [
        { key: "option", label: "판단안" },
        { key: "route", label: "예상이동로" },
        { key: "coverage", label: "감시율" },
        { key: "basis", label: "판단근거" },
        { key: "adjustment", label: "조정" },
        { key: "source", label: "출처" },
      ],
      rows: SUDO_SITUATION_ROUTE_SOURCE_ROWS.map((row) => ({
        option: row.option,
        route: row.route,
        coverage: `${row.coverage}%`,
        basis: row.basis,
        adjustment: row.adjustment,
        source: formatSudoSourceDisplayLabel(row.source),
      })),
    },
    {
      title: "9-1 도로정보 원본표",
      columns: [
        { key: "road", label: "도로명" },
        { key: "lanes", label: "차선개수" },
        { key: "bridge", label: "비고(도로상 다리현황)" },
        { key: "judgment", label: "활용판단" },
      ],
      rows: SUDO_ROAD_INFO_SOURCE_ROWS.map((row) => ({
        road: row.road,
        lanes: row.lanes,
        bridge: row.bridge,
        judgment: row.judgment,
      })),
    },
  ];
}

export function buildSudoDroneRedeploymentSourceTable(): SudoScenarioTable {
  return {
    title: "9-1 드론 재배치 GPT 응답 원문",
    columns: [
      { key: "drone", label: "드론" },
      { key: "destination", label: "목적지" },
      { key: "coordinate", label: "좌표" },
      { key: "sourceSentence", label: "원문" },
      { key: "source", label: "출처" },
    ],
    rows: SUDO_DRONE_REDEPLOYMENT_SOURCE_ROWS.map((row) => ({
      drone: row.droneId,
      destination: `${row.destinationType} ${row.destinationName}`,
      coordinate: row.coordinate,
      sourceSentence: row.sourceSentence,
      source: formatSudoSourceDisplayLabel(
        `${SUDO_SITUATION_ANALYSIS_SOURCE_NAME} senario.pdf #10`
      ),
    })),
  };
}
