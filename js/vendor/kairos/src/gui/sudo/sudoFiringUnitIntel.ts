import type { SudoScenarioTable } from "./sudoScenarios";

export const SUDO_FIRING_UNIT_SOURCE_NAME =
  "8-1 최적의 사격부대 선정 판단 자료";

export const SUDO_FIRING_UNIT_SOURCE_PATH =
  "client/public/sudo_data/md/sources/8-1 최적의 사격부대 선정 판단 자료.md";

type SudoFireUnitStatus = "가능" | "대기" | "정비";

export interface SudoFiringUnitSourceRow {
  unit: string;
  weapon: string;
  distanceKm: number;
  maxRangeKm: number;
  rangeJudgment: string;
  rangePossible: boolean;
  survival: "가능" | "불가능";
  survivalGuaranteed: boolean;
  ammoSummary: string;
  heRounds: number;
  csr: number;
  civilianImpact: string;
  civilianSafe: boolean;
  combatStatus: "사격 가능" | "사격 불가" | "사격 불가능";
  combatReady: boolean;
  status: SudoFireUnitStatus;
  sourceCase: string;
}

export const SUDO_FIRING_UNIT_SOURCE_ROWS: SudoFiringUnitSourceRow[] = [
  {
    unit: "669포병대대(K9)",
    weapon: "K9",
    distanceKm: 32,
    maxRangeKm: 40,
    rangeJudgment: "32km(사격가능)",
    rangePossible: true,
    survival: "불가능",
    survivalGuaranteed: false,
    ammoSummary: "HE 30R / HEBB 12R",
    heRounds: 30,
    csr: 88,
    civilianImpact: "민가 2세대 피해 가능",
    civilianSafe: false,
    combatStatus: "사격 가능",
    combatReady: true,
    status: "가능",
    sourceCase: "#1. 100포병대대(K105A1) 사격 시",
  },
  {
    unit: "602포병대대(K55A1)",
    weapon: "K55A1",
    distanceKm: 36,
    maxRangeKm: 30,
    rangeJudgment: "36km(사격불가능)",
    rangePossible: false,
    survival: "가능",
    survivalGuaranteed: true,
    ammoSummary: "HE 30R / HEBB 40R",
    heRounds: 30,
    csr: 82,
    civilianImpact: "민가 3세대 피해 가능",
    civilianSafe: false,
    combatStatus: "사격 불가",
    combatReady: false,
    status: "가능",
    sourceCase: "#1. 100포병대대(K105A1) 사격 시",
  },
  {
    unit: "포5대대(K55A1)",
    weapon: "K55A1",
    distanceKm: 33,
    maxRangeKm: 30,
    rangeJudgment: "33km(사격불가능)",
    rangePossible: false,
    survival: "불가능",
    survivalGuaranteed: false,
    ammoSummary: "HE 50R / HEBB 60R",
    heRounds: 50,
    csr: 80,
    civilianImpact: "민가 2세대 피해 가능",
    civilianSafe: false,
    combatStatus: "사격 가능",
    combatReady: true,
    status: "가능",
    sourceCase: "#1. 100포병대대(K105A1) 사격 시",
  },
  {
    unit: "100포병대대(K105A1)",
    weapon: "K105A1",
    distanceKm: 6,
    maxRangeKm: 11,
    rangeJudgment: "6km(사격가능)",
    rangePossible: true,
    survival: "가능",
    survivalGuaranteed: true,
    ammoSummary: "HE 100R / DP-ICM 100R",
    heRounds: 100,
    csr: 92,
    civilianImpact: "민가 피해 없음",
    civilianSafe: true,
    combatStatus: "사격 가능",
    combatReady: true,
    status: "가능",
    sourceCase: "#1. 100포병대대(K105A1) 사격 시",
  },
  {
    unit: "101여단 4.2인치 박격포",
    weapon: "4.2인치 박격포",
    distanceKm: 8,
    maxRangeKm: 6,
    rangeJudgment: "8km(사격불가능)",
    rangePossible: false,
    survival: "불가능",
    survivalGuaranteed: false,
    ammoSummary: "HE 100R / DPBB 70R",
    heRounds: 100,
    csr: 76,
    civilianImpact: "민가 피해 없음",
    civilianSafe: true,
    combatStatus: "사격 불가능",
    combatReady: false,
    status: "가능",
    sourceCase: "#1. 100포병대대(K105A1) 사격 시",
  },
];

export function buildSudoFiringUnitDecisionInputs() {
  return SUDO_FIRING_UNIT_SOURCE_ROWS.map((row) => ({
    unit: row.unit,
    ammo: row.heRounds,
    csr: row.csr,
    distanceKm: row.distanceKm,
    maxRangeKm: row.maxRangeKm,
    status: row.status,
    rangeJudgment: row.rangeJudgment.replace(/[()]/g, " "),
    survival: row.survival,
    survivalGuaranteed: row.survivalGuaranteed,
    ammoSummary: row.ammoSummary,
    civilianImpact: row.civilianImpact,
    civilianSafe: row.civilianSafe,
    combatStatus: row.combatStatus,
    combatReady: row.combatReady,
  }));
}

export function buildSudoFiringUnitSourceTable(): SudoScenarioTable {
  return {
    title: "8-1 최적 사격부대 원본 평가표",
    columns: [
      { key: "unit", label: "후보부대" },
      { key: "range", label: "사거리" },
      { key: "survival", label: "생존성보장" },
      { key: "ammo", label: "탄보유량" },
      { key: "civilian", label: "민간피해" },
      { key: "combat", label: "전투력수준" },
      { key: "source", label: "출처" },
    ],
    rows: SUDO_FIRING_UNIT_SOURCE_ROWS.map((row) => ({
      unit: row.unit,
      range: row.rangeJudgment,
      survival: row.survival,
      ammo: row.ammoSummary,
      civilian: row.civilianImpact,
      combat: row.combatStatus,
      source: `${SUDO_FIRING_UNIT_SOURCE_NAME} ${row.sourceCase}`,
    })),
  };
}
