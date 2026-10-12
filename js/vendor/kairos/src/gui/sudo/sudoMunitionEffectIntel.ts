import type { SudoScenarioTable } from "./sudoScenarios";

export const SUDO_MUNITION_EFFECT_SOURCE_NAME =
  "7-1~2 지형DB， 탄종 및 발수 판단 자료";

export const SUDO_MUNITION_EFFECT_SOURCE_PATH =
  "client/public/sudo_data/md/sources/7-1~2 지형DB， 탄종 및 발수 판단 자료.md";

export const SUDO_MUNITION_EFFECT_COLUMNS = [10, 20, 30] as const;

export type SudoMunitionEffectColumn =
  (typeof SUDO_MUNITION_EFFECT_COLUMNS)[number];

export type SudoMunitionTerrainClass = "open" | "covered";

export type SudoMunitionFireUnit = "포대" | "대대";

export interface SudoMunitionEffectSourceRow {
  id: string;
  targetType: string;
  targetPattern: RegExp;
  rangeBand: "0~6km" | "6~12km" | "12~18km" | "18~40km";
  terrainClass: SudoMunitionTerrainClass;
  terrainLabel: "개활지" | "산림/도심";
  fireUnit: SudoMunitionFireUnit;
  effectCells: Record<SudoMunitionEffectColumn, string>;
  source: string;
}

export type SudoMunitionEffectDecisionRow = Omit<
  SudoMunitionEffectSourceRow,
  "source"
> & {
  rangeBand: "0~6km";
};

const ROCKET_TARGET_PATTERN = /122|240|방사포|mlrs|m-?1991|k136/i;

export const SUDO_MUNITION_EFFECT_SOURCE_ROWS: SudoMunitionEffectSourceRow[] = [
  {
    id: "rocket-0-6-open-battery",
    targetType: "122/240mm 방사포",
    targetPattern: ROCKET_TARGET_PATTERN,
    rangeBand: "0~6km",
    terrainClass: "open",
    terrainLabel: "개활지",
    fireUnit: "포대",
    effectCells: { 10: "HE ③", 20: "HE ⑥", 30: "HE ⑨" },
    source: `${SUDO_MUNITION_EFFECT_SOURCE_NAME} #1 100포병대대 0~6km 개활지 포대`,
  },
  {
    id: "rocket-0-6-open-battalion",
    targetType: "122/240mm 방사포",
    targetPattern: ROCKET_TARGET_PATTERN,
    rangeBand: "0~6km",
    terrainClass: "open",
    terrainLabel: "개활지",
    fireUnit: "대대",
    effectCells: { 10: "HE ①", 20: "HE ①", 30: "HE ①" },
    source: `${SUDO_MUNITION_EFFECT_SOURCE_NAME} #1 100포병대대 0~6km 개활지 대대`,
  },
  {
    id: "rocket-0-6-covered-battery",
    targetType: "122/240mm 방사포",
    targetPattern: ROCKET_TARGET_PATTERN,
    rangeBand: "0~6km",
    terrainClass: "covered",
    terrainLabel: "산림/도심",
    fireUnit: "포대",
    effectCells: { 10: "HE ③", 20: "HE ⑥", 30: "HE ⑨" },
    source: `${SUDO_MUNITION_EFFECT_SOURCE_NAME} #1 100포병대대 0~6km 산림/도심 포대`,
  },
  {
    id: "rocket-0-6-covered-battalion",
    targetType: "122/240mm 방사포",
    targetPattern: ROCKET_TARGET_PATTERN,
    rangeBand: "0~6km",
    terrainClass: "covered",
    terrainLabel: "산림/도심",
    fireUnit: "대대",
    effectCells: { 10: "HE ①", 20: "HE ①", 30: "HE ①" },
    source: `${SUDO_MUNITION_EFFECT_SOURCE_NAME} #1 100포병대대 0~6km 산림/도심 대대`,
  },
  {
    id: "rocket-6-12-open-battery",
    targetType: "122/240mm 방사포",
    targetPattern: ROCKET_TARGET_PATTERN,
    rangeBand: "6~12km",
    terrainClass: "open",
    terrainLabel: "개활지",
    fireUnit: "포대",
    effectCells: { 10: "HE ③", 20: "HE ⑥", 30: "HE ⑧" },
    source: `${SUDO_MUNITION_EFFECT_SOURCE_NAME} #1 100포병대대 6~12km 개활지 포대`,
  },
  {
    id: "rocket-6-12-open-battalion",
    targetType: "122/240mm 방사포",
    targetPattern: ROCKET_TARGET_PATTERN,
    rangeBand: "6~12km",
    terrainClass: "open",
    terrainLabel: "개활지",
    fireUnit: "대대",
    effectCells: { 10: "HE ①", 20: "HE ②", 30: "HE ③" },
    source: `${SUDO_MUNITION_EFFECT_SOURCE_NAME} #1 100포병대대 6~12km 개활지 대대`,
  },
  {
    id: "rocket-6-12-covered-battery",
    targetType: "122/240mm 방사포",
    targetPattern: ROCKET_TARGET_PATTERN,
    rangeBand: "6~12km",
    terrainClass: "covered",
    terrainLabel: "산림/도심",
    fireUnit: "포대",
    effectCells: { 10: "HE ③", 20: "HE ⑦", 30: "HE ⑩" },
    source: `${SUDO_MUNITION_EFFECT_SOURCE_NAME} #1 100포병대대 6~12km 산림/도심 포대`,
  },
  {
    id: "rocket-6-12-covered-battalion",
    targetType: "122/240mm 방사포",
    targetPattern: ROCKET_TARGET_PATTERN,
    rangeBand: "6~12km",
    terrainClass: "covered",
    terrainLabel: "산림/도심",
    fireUnit: "대대",
    effectCells: { 10: "HE ②", 20: "HE ③", 30: "HE ④" },
    source: `${SUDO_MUNITION_EFFECT_SOURCE_NAME} #1 100포병대대 6~12km 산림/도심 대대`,
  },
  {
    id: "rocket-12-18-open-battery",
    targetType: "122/240mm 방사포",
    targetPattern: ROCKET_TARGET_PATTERN,
    rangeBand: "12~18km",
    terrainClass: "open",
    terrainLabel: "개활지",
    fireUnit: "포대",
    effectCells: { 10: "HE ③", 20: "HE ⑥", 30: "HE ⑩" },
    source: `${SUDO_MUNITION_EFFECT_SOURCE_NAME} #1 100포병대대 12~18km 개활지 포대`,
  },
  {
    id: "rocket-12-18-open-battalion",
    targetType: "122/240mm 방사포",
    targetPattern: ROCKET_TARGET_PATTERN,
    rangeBand: "12~18km",
    terrainClass: "open",
    terrainLabel: "개활지",
    fireUnit: "대대",
    effectCells: { 10: "HE ①", 20: "HE ②", 30: "HE ③" },
    source: `${SUDO_MUNITION_EFFECT_SOURCE_NAME} #1 100포병대대 12~18km 개활지 대대`,
  },
  {
    id: "rocket-12-18-covered-battery",
    targetType: "122/240mm 방사포",
    targetPattern: ROCKET_TARGET_PATTERN,
    rangeBand: "12~18km",
    terrainClass: "covered",
    terrainLabel: "산림/도심",
    fireUnit: "포대",
    effectCells: { 10: "HE ④", 20: "HE ⑧", 30: "HE ⑫" },
    source: `${SUDO_MUNITION_EFFECT_SOURCE_NAME} #1 100포병대대 12~18km 산림/도심 포대`,
  },
  {
    id: "rocket-12-18-covered-battalion",
    targetType: "122/240mm 방사포",
    targetPattern: ROCKET_TARGET_PATTERN,
    rangeBand: "12~18km",
    terrainClass: "covered",
    terrainLabel: "산림/도심",
    fireUnit: "대대",
    effectCells: { 10: "HE ②", 20: "HE ③", 30: "HE ⑤" },
    source: `${SUDO_MUNITION_EFFECT_SOURCE_NAME} #1 100포병대대 12~18km 산림/도심 대대`,
  },
  {
    id: "rocket-18-40-open-battery",
    targetType: "122/240mm 방사포",
    targetPattern: ROCKET_TARGET_PATTERN,
    rangeBand: "18~40km",
    terrainClass: "open",
    terrainLabel: "개활지",
    fireUnit: "포대",
    effectCells: { 10: "HEBB ③", 20: "HEBB ⑦", 30: "HEBB ⑩" },
    source: `${SUDO_MUNITION_EFFECT_SOURCE_NAME} #1 100포병대대 18~40km 개활지 포대`,
  },
  {
    id: "rocket-18-40-open-battalion",
    targetType: "122/240mm 방사포",
    targetPattern: ROCKET_TARGET_PATTERN,
    rangeBand: "18~40km",
    terrainClass: "open",
    terrainLabel: "개활지",
    fireUnit: "대대",
    effectCells: { 10: "HEBB ②", 20: "HEBB ③", 30: "HEBB ④" },
    source: `${SUDO_MUNITION_EFFECT_SOURCE_NAME} #1 100포병대대 18~40km 개활지 대대`,
  },
  {
    id: "rocket-18-40-covered-battery",
    targetType: "122/240mm 방사포",
    targetPattern: ROCKET_TARGET_PATTERN,
    rangeBand: "18~40km",
    terrainClass: "covered",
    terrainLabel: "산림/도심",
    fireUnit: "포대",
    effectCells: { 10: "HEBB ③", 20: "HEBB ④", 30: "HEBB ⑩" },
    source: `${SUDO_MUNITION_EFFECT_SOURCE_NAME} #1 100포병대대 18~40km 산림/도심 포대`,
  },
  {
    id: "rocket-18-40-covered-battalion",
    targetType: "122/240mm 방사포",
    targetPattern: ROCKET_TARGET_PATTERN,
    rangeBand: "18~40km",
    terrainClass: "covered",
    terrainLabel: "산림/도심",
    fireUnit: "대대",
    effectCells: { 10: "HEBB ②", 20: "HEBB ③", 30: "HEBB ④" },
    source: `${SUDO_MUNITION_EFFECT_SOURCE_NAME} #1 100포병대대 18~40km 산림/도심 대대`,
  },
];

function isSudoMunitionEffectDecisionRow(
  row: SudoMunitionEffectSourceRow
): row is SudoMunitionEffectSourceRow & { rangeBand: "0~6km" } {
  return row.rangeBand === "0~6km";
}

export function buildSudoMunitionEffectDecisionRules(): SudoMunitionEffectDecisionRow[] {
  return SUDO_MUNITION_EFFECT_SOURCE_ROWS.filter(
    isSudoMunitionEffectDecisionRow
  ).map(({ source: _source, ...row }) => ({ ...row }));
}

export function buildSudoMunitionEffectSourceTable(): SudoScenarioTable {
  return {
    title: "7-1~2 탄종/발수 원본 매트릭스",
    columns: [
      { key: "target", label: "표적성질" },
      { key: "range", label: "사거리" },
      { key: "terrain", label: "지형" },
      { key: "fireUnit", label: "사격부대" },
      { key: "effect10", label: "10%" },
      { key: "effect20", label: "20%" },
      { key: "effect30", label: "30%" },
      { key: "source", label: "출처" },
    ],
    rows: SUDO_MUNITION_EFFECT_SOURCE_ROWS.map((row) => ({
      target: row.targetType,
      range: row.rangeBand,
      terrain: row.terrainLabel,
      fireUnit: row.fireUnit,
      effect10: row.effectCells[10],
      effect20: row.effectCells[20],
      effect30: row.effectCells[30],
      source: row.source,
    })),
  };
}

export function getSudoMunitionEffectRowsForVisual() {
  return SUDO_MUNITION_EFFECT_SOURCE_ROWS.filter(
    (row) => row.rangeBand === "0~6km"
  ).map((row) => ({
    target: row.targetType,
    range: row.rangeBand,
    terrain: row.terrainLabel,
    fireUnit: row.fireUnit,
    effect10: row.effectCells[10],
    effect20: row.effectCells[20],
    effect30: row.effectCells[30],
  }));
}
