import type { SudoScenarioTable } from "./sudoScenarios";
import { formatSudoSourceDisplayLabel } from "./sudoSourceDisplay";

export const SUDO_FIRE_PLAN_SOURCE_NAME =
  "senario.pdf page 06 최적 타격방법ㆍ통합화력운용도표";

export const SUDO_FIRE_PLAN_SOURCE_PATH =
  "client/public/sudo_data/md/sources/senario.md";

export interface SudoStrikeMethodSourceRow {
  method: string;
  tai: string;
  hTime: string;
  dp: string;
  rank: string;
  basis: string;
  source: string;
}

export interface SudoFirePlanSourceRow {
  time: string;
  asset: string;
  action: string;
  effect: string;
  phase: string;
  source: string;
}

interface SudoStrikeAssetSourceRow {
  asset: string;
  availableFrom: string;
  availableTo: string;
  score: number;
}

export const SUDO_STRIKE_ASSET_SOURCE_ROWS: SudoStrikeAssetSourceRow[] = [
  {
    asset: "CAS",
    availableFrom: "10:30",
    availableTo: "11:30",
    score: 95,
  },
  {
    asset: "포병",
    availableFrom: "00:00",
    availableTo: "23:59",
    score: 90,
  },
  {
    asset: "육군항공",
    availableFrom: "12:00",
    availableTo: "23:59",
    score: 70,
  },
  {
    asset: "CAS(2차)",
    availableFrom: "14:00",
    availableTo: "15:00",
    score: 82,
  },
];

export const SUDO_STRIKE_METHOD_SOURCE_ROWS: SudoStrikeMethodSourceRow[] = [
  {
    method: "CAS+포병",
    tai: "TAI #5",
    hTime: "11:00",
    dp: "DP #3",
    rank: "1순위",
    basis: "적 이동속도 20km/h와 가용시간 판단 결과 H시 11:00 CAS+포병",
    source: `${SUDO_FIRE_PLAN_SOURCE_NAME} OCR 최적 타격방법`,
  },
  {
    method: "JAAT",
    tai: "TAI #7",
    hTime: "14:00",
    dp: "DP #7",
    rank: "2순위",
    basis: "CAS 2차 가용시간 14:00~15:00 및 육군항공 연계 후보",
    source: `${SUDO_FIRE_PLAN_SOURCE_NAME} OCR 가용자산`,
  },
  {
    method: "Fire-Eagle",
    tai: "TAI #8",
    hTime: "12:00",
    dp: "DP #2",
    rank: "3순위",
    basis: "육군항공 12:00 이후 가능 조건의 보조 후보",
    source: `${SUDO_FIRE_PLAN_SOURCE_NAME} OCR Fire-Eagle`,
  },
];

export const SUDO_FIRE_PLAN_SOURCE_ROWS: SudoFirePlanSourceRow[] = [
  {
    time: "H-10~H",
    asset: "602포병대대·포1대대·669포병대대",
    action: "SEAD 사전 포병사격 / CAS 공역 인계",
    effect: "방공 제압",
    phase: "사전차단",
    source: `${SUDO_FIRE_PLAN_SOURCE_NAME} OCR 타격계획`,
  },
  {
    time: "H~H+10",
    asset: "19전투비행단 F-16 2/T",
    action: "양주 CAS/RJS 진입 / 공역 시간분리",
    effect: "전차 표적 영상정보 전송",
    phase: "주타격",
    source: `${SUDO_FIRE_PLAN_SOURCE_NAME} OCR 통합화력운용도표`,
  },
  {
    time: "H+10~H+20",
    asset: "602포병대대·포1대대·669포병대대",
    action: "TOT 포병사격 / 잔여 진출 차단",
    effect: "전차 표적 HE 48R 낙탄",
    phase: "후속차단",
    source: `${SUDO_FIRE_PLAN_SOURCE_NAME} OCR 타격계획`,
  },
  {
    time: "H-10~H+30",
    asset: "전자전",
    action: "전자전 공격 / 통신차단",
    effect: "지휘통제 차단",
    phase: "지속지원",
    source: `${SUDO_FIRE_PLAN_SOURCE_NAME} OCR 전자전 공격`,
  },
  {
    time: "H-10~H+30",
    asset: "FASCAM",
    action: "DP #3~TAI #5 기동저지",
    effect: "기동제한",
    phase: "지속지원",
    source: `${SUDO_FIRE_PLAN_SOURCE_NAME} OCR FASCAM 사격계획`,
  },
];

export function buildSudoStrikeAssetDecisionInputs() {
  return SUDO_STRIKE_ASSET_SOURCE_ROWS.map((row) => ({ ...row }));
}

export function buildSudoFirePlanDecisionInputs() {
  return SUDO_FIRE_PLAN_SOURCE_ROWS.map(
    ({ source: _source, phase: _phase, ...row }) => ({
      ...row,
    })
  );
}

export function buildSudoStrikeMethodSourceTable(): SudoScenarioTable {
  return {
    title: "최적 타격방법 원본근거",
    columns: [
      { key: "method", label: "타격방법" },
      { key: "tai", label: "TAI" },
      { key: "hTime", label: "H시" },
      { key: "dp", label: "DP" },
      { key: "rank", label: "순위" },
      { key: "basis", label: "원문근거" },
      { key: "source", label: "출처" },
    ],
    rows: SUDO_STRIKE_METHOD_SOURCE_ROWS.map((row) => ({
      ...row,
      source: formatSudoSourceDisplayLabel(row.source),
    })),
  };
}

export function buildSudoStrikeAssetSourceTable(): SudoScenarioTable {
  return {
    title: "가용자산 원본시간표",
    columns: [
      { key: "asset", label: "자산" },
      { key: "window", label: "가용시간" },
      { key: "grade", label: "원본판단" },
      { key: "source", label: "출처" },
    ],
    rows: SUDO_STRIKE_ASSET_SOURCE_ROWS.map((row) => ({
      asset: row.asset,
      window: `${row.availableFrom}~${row.availableTo}`,
      grade:
        row.asset === "CAS"
          ? "H시 11:00 주전 가능"
          : row.asset === "포병"
            ? "24시간 가능"
            : row.asset === "육군항공"
              ? "12:00 이후 가능"
              : "14:00~15:00 예비 CAS",
      source: formatSudoSourceDisplayLabel(
        `${SUDO_FIRE_PLAN_SOURCE_NAME} OCR 가용자산`
      ),
    })),
  };
}

export function buildSudoFirePlanSourceTable(): SudoScenarioTable {
  return {
    title: "통합화력운용도표 원본근거",
    columns: [
      { key: "time", label: "시간" },
      { key: "asset", label: "자산" },
      { key: "action", label: "계획" },
      { key: "effect", label: "효과" },
      { key: "phase", label: "단계" },
      { key: "source", label: "출처" },
    ],
    rows: SUDO_FIRE_PLAN_SOURCE_ROWS.map((row) => ({
      ...row,
      source: formatSudoSourceDisplayLabel(row.source),
    })),
  };
}

export function getSudoStrikeMethodRowsForVisual() {
  return SUDO_STRIKE_METHOD_SOURCE_ROWS.map(({ source: _source, ...row }) => ({
    method: row.method,
    tai: row.tai,
    time: row.hTime,
    dp: row.dp,
    rank: row.rank,
  }));
}

export function getSudoFirePlanRowsForVisual() {
  return SUDO_FIRE_PLAN_SOURCE_ROWS.map(
    ({ source: _source, phase: _phase, ...row }) => ({
      ...row,
    })
  );
}
