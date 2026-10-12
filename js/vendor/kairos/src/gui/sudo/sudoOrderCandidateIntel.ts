import type { SudoScenarioTable } from "./sudoScenarios";

export const SUDO_ORDER_CANDIDATE_SOURCE_NAME =
  "4-1 훈련장 인근부대 위치, 보유 장비 등";

export interface SudoOrderCandidateSourceRow {
  targetCoordinate: string;
  coordinate: string;
  distanceM: number;
  unit: string;
  weapon: string;
  equipment: string;
  guns: number;
  sourceRank: string;
  directionMatchPercent: number;
}

export const SUDO_ORDER_CANDIDATE_SOURCE_ROWS = [
  {
    targetCoordinate: "BH 12345 67890",
    coordinate: "BH 12346 67899",
    distanceM: 51,
    unit: "2사단 3대대 1중대",
    weapon: "152mm 자주포",
    equipment: "화포 5문, 트럭 4대",
    guns: 5,
    sourceRank: "2",
    directionMatchPercent: 82,
  },
  {
    targetCoordinate: "BH 12345 67890",
    coordinate: "BH 12415 67915",
    distanceM: 106,
    unit: "1사단 1대대 2중대",
    weapon: "240mm 방사포",
    equipment: "방사포 4문, 트럭 4대",
    guns: 4,
    sourceRank: "1",
    directionMatchPercent: 99,
  },
  {
    targetCoordinate: "BH 12345 67890",
    coordinate: "BH 13143 68541",
    distanceM: 2013,
    unit: "1사단 2대대 1중대",
    weapon: "240mm 방사포",
    equipment: "방사포 4문, 트럭 4대",
    guns: 4,
    sourceRank: "3",
    directionMatchPercent: 62,
  },
  {
    targetCoordinate: "BH 12345 67890",
    coordinate: "BH 12918 69031",
    distanceM: 847,
    unit: "2사단 1대대 3중대",
    weapon: "152mm 자주포",
    equipment: "화포 5문, 트럭 4대",
    guns: 5,
    sourceRank: "4",
    directionMatchPercent: 58,
  },
  {
    targetCoordinate: "BH 12345 67890",
    coordinate: "BH 14531 66741",
    distanceM: 1313,
    unit: "3사단 2대대 1중대",
    weapon: "122mm 자주포",
    equipment: "화포 3문, 트럭 3대",
    guns: 3,
    sourceRank: "5",
    directionMatchPercent: 52,
  },
  {
    targetCoordinate: "BH 12345 67890",
    coordinate: "BH 16531 67741",
    distanceM: 3053,
    unit: "1사단 전차중대",
    weapon: "전차",
    equipment: "전차 8대",
    guns: 8,
    sourceRank: "제외",
    directionMatchPercent: 12,
  },
  {
    targetCoordinate: "BH 12345 67890",
    coordinate: "BH 16531 68741",
    distanceM: 3371,
    unit: "1사단 K61 중대",
    weapon: "K61",
    equipment: "K61 20대",
    guns: 20,
    sourceRank: "제외",
    directionMatchPercent: 8,
  },
  {
    targetCoordinate: "BH 12345 67890",
    coordinate: "BH 15531 69741",
    distanceM: 4044,
    unit: "3군단 부교중대",
    weapon: "S형 부주",
    equipment: "S형 부주 50개, 트럭 15대",
    guns: 50,
    sourceRank: "제외",
    directionMatchPercent: 5,
  },
  {
    targetCoordinate: "BH 12345 67890",
    coordinate: "BH 15631 68841",
    distanceM: 3873,
    unit: "57mm 고사포 중대",
    weapon: "57mm 고사포",
    equipment: "고사포 5문, 트럭 5대",
    guns: 5,
    sourceRank: "제외",
    directionMatchPercent: 8,
  },
  {
    targetCoordinate: "BH 12345 67890",
    coordinate: "BH 15838 66941",
    distanceM: 4215,
    unit: "37mm 고사포 중대",
    weapon: "37mm 고사포",
    equipment: "고사포 5문, 트럭 5대",
    guns: 5,
    sourceRank: "제외",
    directionMatchPercent: 8,
  },
  {
    targetCoordinate: "BH 12345 67890",
    coordinate: "BH 17221 62741",
    distanceM: 4116,
    unit: "14.5mm 고사총 중대",
    weapon: "14.5mm 고사총",
    equipment: "고사총 6문, 트럭 6대",
    guns: 6,
    sourceRank: "제외",
    directionMatchPercent: 8,
  },
] satisfies SudoOrderCandidateSourceRow[];

export function formatSudoOrderDistance(distanceM: number) {
  return `${new Intl.NumberFormat("ko-KR").format(distanceM)}m`;
}

export function buildSudoOrderCandidateSourceTable(): SudoScenarioTable {
  return {
    title: "4-1 전투서열 후보 원본표",
    columns: [
      { key: "targetCoordinate", label: "표적좌표" },
      { key: "coordinate", label: "최기부대 적 위치" },
      { key: "distance", label: "이격거리" },
      { key: "unit", label: "전투서열" },
      { key: "equipment", label: "보유장비 및 수량" },
      { key: "sourceRank", label: "판정순위" },
    ],
    rows: SUDO_ORDER_CANDIDATE_SOURCE_ROWS.map((row) => ({
      targetCoordinate: row.targetCoordinate,
      coordinate: row.coordinate,
      distance: formatSudoOrderDistance(row.distanceM),
      unit: `${row.unit} ${row.weapon}`,
      equipment: row.equipment,
      sourceRank: row.sourceRank,
    })),
  };
}
