import type { SudoScenarioTable } from "./sudoScenarios";

export const SUDO_SCALE_SOURCE_NAME = "3-1 부대별 행군장경 data";

export const SUDO_SCALE_SOURCE_PATH =
  "client/public/sudo_data/md/sources/3-1 부대별 행군장경 data.md";

export interface SudoScaleDoctrineRow {
  unit: string;
  grade: "중대" | "대대";
  equipment: string;
  rocketLaunchers?: number;
  trucks?: number;
  jeeps?: number;
  tanks?: number;
  guns?: number;
  marchLengthM: number;
  source: string;
}

export const SUDO_SCALE_DOCTRINE_ROWS: SudoScaleDoctrineRow[] = [
  {
    unit: "240mm 방사포 중대",
    grade: "중대",
    equipment: "방사포 4문 / 트럭 4대",
    rocketLaunchers: 4,
    trucks: 4,
    marchLengthM: 350,
    source: `${SUDO_SCALE_SOURCE_NAME} slide 1`,
  },
  {
    unit: "240mm 방사포 대대",
    grade: "대대",
    equipment: "방사포 12문 / 지프 1대 / 트럭 30대",
    rocketLaunchers: 12,
    jeeps: 1,
    trucks: 30,
    marchLengthM: 1500,
    source: `${SUDO_SCALE_SOURCE_NAME} slide 1`,
  },
  {
    unit: "전차중대",
    grade: "중대",
    equipment: "전차 8대",
    tanks: 8,
    marchLengthM: 300,
    source: `${SUDO_SCALE_SOURCE_NAME} slide 1`,
  },
  {
    unit: "57mm 고사포 중대",
    grade: "중대",
    equipment: "고사포 5문 / 트럭 5대",
    guns: 5,
    trucks: 5,
    marchLengthM: 220,
    source: `${SUDO_SCALE_SOURCE_NAME} slide 1`,
  },
  {
    unit: "76.2mm 견인포 중대",
    grade: "중대",
    equipment: "화포 5문 / 견인트럭 5대",
    guns: 5,
    trucks: 5,
    marchLengthM: 300,
    source: `${SUDO_SCALE_SOURCE_NAME} slide 1`,
  },
];

export function buildSudoScaleDoctrineSourceTable(): SudoScenarioTable {
  return {
    title: "3-1 부대규모 행군장경 원본표",
    columns: [
      { key: "unit", label: "부대/편성" },
      { key: "equipment", label: "보유장비" },
      { key: "length", label: "행군장경" },
      { key: "grade", label: "규모" },
      { key: "source", label: "출처" },
    ],
    rows: SUDO_SCALE_DOCTRINE_ROWS.map((row) => ({
      unit: row.unit,
      equipment: row.equipment,
      length: `약 ${row.marchLengthM}m`,
      grade: row.grade,
      source: row.source,
    })),
  };
}

export function getSudoScaleDoctrineRowsForVisual() {
  return SUDO_SCALE_DOCTRINE_ROWS.map((row) => ({
    unit: row.unit,
    equipment: row.equipment,
    length: `약 ${row.marchLengthM}m`,
    grade: row.grade,
  }));
}
