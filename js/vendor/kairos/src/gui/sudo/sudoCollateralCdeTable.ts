import type { SudoScenarioTable } from "./sudoScenarios";

export interface SudoCollateralCdeRow extends Record<string, string> {
  range: string;
  he: string;
  hebb: string;
  dpicm: string;
  dpbb: string;
  guided: string;
  cluster: string;
}

export const SUDO_COLLATERAL_CDE_SOURCE_NAME = "5-1 탄종별 부수적 효과반경";

export const SUDO_COLLATERAL_CDE_SOURCE_PATH =
  "sudo_data/md/sources/5-1 탄종별 부수적 효과반경.md";

export const SUDO_COLLATERAL_CDE_COLUMNS = [
  { key: "range", label: "사거리" },
  { key: "he", label: "HE" },
  { key: "hebb", label: "HEBB" },
  { key: "dpicm", label: "DPICM" },
  { key: "dpbb", label: "DPBB" },
  { key: "guided", label: "고폭유도탄" },
  { key: "cluster", label: "분산유도탄" },
] satisfies SudoScenarioTable["columns"];

export const SUDO_COLLATERAL_CDE_ROWS = [
  {
    range: "15km",
    he: "73",
    hebb: "94",
    dpicm: "94",
    dpbb: "223",
    guided: "65",
    cluster: "130",
  },
  {
    range: "16km",
    he: "84",
    hebb: "99",
    dpicm: "95",
    dpbb: "226",
    guided: "",
    cluster: "",
  },
  {
    range: "17km",
    he: "88",
    hebb: "103",
    dpicm: "110",
    dpbb: "231",
    guided: "",
    cluster: "",
  },
  {
    range: "18km",
    he: "92",
    hebb: "106",
    dpicm: "113",
    dpbb: "236",
    guided: "",
    cluster: "",
  },
  {
    range: "19km",
    he: "-",
    hebb: "110",
    dpicm: "-",
    dpbb: "239",
    guided: "",
    cluster: "",
  },
  {
    range: "20km",
    he: "",
    hebb: "114",
    dpicm: "",
    dpbb: "242",
    guided: "",
    cluster: "",
  },
  {
    range: "21km",
    he: "",
    hebb: "119",
    dpicm: "",
    dpbb: "246",
    guided: "",
    cluster: "",
  },
  {
    range: "22km",
    he: "",
    hebb: "126",
    dpicm: "",
    dpbb: "255",
    guided: "",
    cluster: "",
  },
  {
    range: "23km",
    he: "",
    hebb: "126",
    dpicm: "",
    dpbb: "255",
    guided: "",
    cluster: "",
  },
  {
    range: "24km",
    he: "",
    hebb: "131",
    dpicm: "",
    dpbb: "258",
    guided: "",
    cluster: "",
  },
  {
    range: "25km",
    he: "",
    hebb: "133",
    dpicm: "",
    dpbb: "263",
    guided: "",
    cluster: "",
  },
  {
    range: "26km",
    he: "",
    hebb: "138",
    dpicm: "",
    dpbb: "272",
    guided: "",
    cluster: "",
  },
  {
    range: "27km",
    he: "",
    hebb: "142",
    dpicm: "",
    dpbb: "270",
    guided: "",
    cluster: "",
  },
  {
    range: "28km",
    he: "",
    hebb: "146",
    dpicm: "",
    dpbb: "275",
    guided: "",
    cluster: "",
  },
  {
    range: "29km",
    he: "",
    hebb: "152",
    dpicm: "",
    dpbb: "281",
    guided: "65",
    cluster: "130",
  },
  {
    range: "30km",
    he: "",
    hebb: "157",
    dpicm: "",
    dpbb: "288",
    guided: "",
    cluster: "",
  },
  {
    range: "31km",
    he: "",
    hebb: "162",
    dpicm: "",
    dpbb: "294",
    guided: "",
    cluster: "",
  },
  {
    range: "32km",
    he: "",
    hebb: "170",
    dpicm: "",
    dpbb: "300",
    guided: "",
    cluster: "",
  },
  {
    range: "33km",
    he: "",
    hebb: "181",
    dpicm: "",
    dpbb: "304",
    guided: "",
    cluster: "",
  },
  {
    range: "34km",
    he: "",
    hebb: "192",
    dpicm: "",
    dpbb: "318",
    guided: "",
    cluster: "",
  },
  {
    range: "35km",
    he: "",
    hebb: "213",
    dpicm: "",
    dpbb: "330",
    guided: "",
    cluster: "",
  },
  {
    range: "36km",
    he: "",
    hebb: "231",
    dpicm: "",
    dpbb: "345",
    guided: "",
    cluster: "",
  },
  {
    range: "37km",
    he: "",
    hebb: "243",
    dpicm: "",
    dpbb: "-",
    guided: "",
    cluster: "",
  },
  {
    range: "38km",
    he: "",
    hebb: "257",
    dpicm: "",
    dpbb: "",
    guided: "",
    cluster: "",
  },
  {
    range: "39km",
    he: "",
    hebb: "270",
    dpicm: "",
    dpbb: "",
    guided: "",
    cluster: "",
  },
  {
    range: "40km",
    he: "",
    hebb: "282",
    dpicm: "",
    dpbb: "",
    guided: "",
    cluster: "",
  },
  {
    range: "41km",
    he: "",
    hebb: "290",
    dpicm: "",
    dpbb: "",
    guided: "",
    cluster: "",
  },
] satisfies SudoCollateralCdeRow[];

const visualRangeLabels = new Set([
  "17km",
  "18km",
  "19km",
  "20km",
  "21km",
  "22km",
]);

const munitionByColumnKey: Record<string, string> = {
  he: "HE",
  hebb: "HEBB",
  dpicm: "DPICM",
  dpbb: "DPBB",
  guided: "고폭유도탄",
  cluster: "분산유도탄",
};

function cloneCdeRow(row: SudoCollateralCdeRow): SudoCollateralCdeRow {
  return { ...row };
}

export function buildSudoCollateralCdeSourceTable(): SudoScenarioTable {
  return {
    title: `${SUDO_COLLATERAL_CDE_SOURCE_NAME} 원본표`,
    columns: [...SUDO_COLLATERAL_CDE_COLUMNS],
    rows: SUDO_COLLATERAL_CDE_ROWS.map(cloneCdeRow),
  };
}

export function getSudoCollateralCdeRowsForVisual() {
  return SUDO_COLLATERAL_CDE_ROWS.filter((row) =>
    visualRangeLabels.has(row.range)
  ).map(cloneCdeRow);
}

export function buildSudoCollateralMunitionsFromCde(rangeLabel = "18km") {
  const row =
    SUDO_COLLATERAL_CDE_ROWS.find(
      (candidate) => candidate.range === rangeLabel
    ) ?? SUDO_COLLATERAL_CDE_ROWS[0];

  return SUDO_COLLATERAL_CDE_COLUMNS.filter(
    (column) => column.key !== "range"
  ).flatMap((column) => {
    const key = column.key as keyof typeof row;
    const munition = munitionByColumnKey[column.key];
    const value = row[key]?.trim();
    const radiusM = Number(value);

    return munition && value && value !== "-" && Number.isFinite(radiusM)
      ? [{ munition, radiusM }]
      : [];
  });
}
