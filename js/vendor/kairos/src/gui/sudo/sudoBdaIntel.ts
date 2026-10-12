import type { SudoScenarioTable } from "./sudoScenarios";
import { formatSudoSourceDisplayLabel } from "./sudoSourceDisplay";

export const SUDO_BDA_SOURCE_NAME = "senario.pdf page 06 타격결과 평가";

export const SUDO_BDA_SOURCE_PATH =
  "client/public/sudo_data/md/sources/senario.md";

export const SUDO_BDA_FIGURE_ID = "page_06_figure_10_xref_154";

export interface SudoBdaEvidenceInput {
  observedDamagePercent: number;
  remainingTargets: number;
  bdaRequiredDamagePercent: number;
}

export function buildSudoBdaSourceTable(
  inputs: SudoBdaEvidenceInput
): SudoScenarioTable {
  const damageGap = Math.max(
    0,
    inputs.bdaRequiredDamagePercent - inputs.observedDamagePercent
  );
  const targetGap = Math.max(0, inputs.remainingTargets - 2);

  return {
    title: "타격결과 평가 원본근거",
    columns: [
      { key: "item", label: "근거항목" },
      { key: "observed", label: "관측/입력" },
      { key: "criteria", label: "기준" },
      { key: "grade", label: "판정" },
      { key: "source", label: "출처" },
    ],
    rows: [
      {
        item: "입력 DATA",
        observed: "타격결과 영상 제시",
        criteria: "DRONE-10 재관측",
        grade: "BDA 입력",
        source: formatSudoSourceDisplayLabel(
          `${SUDO_BDA_SOURCE_NAME} figure ${SUDO_BDA_FIGURE_ID}`
        ),
      },
      {
        item: "영상판독",
        observed: "전차 1대 완파 / 병력 5명 전투불능",
        criteria: "AI 판독 결과",
        grade: "피해 식별",
        source: formatSudoSourceDisplayLabel(`${SUDO_BDA_SOURCE_NAME} OCR`),
      },
      {
        item: "피해율",
        observed: `${inputs.observedDamagePercent}%`,
        criteria: `${inputs.bdaRequiredDamagePercent}% 이상`,
        grade: damageGap > 0 ? `${damageGap}%p 미달` : "충족",
        source: formatSudoSourceDisplayLabel(
          `${SUDO_BDA_SOURCE_NAME} 요망효과 30%`
        ),
      },
      {
        item: "잔여표적",
        observed: `${inputs.remainingTargets}대`,
        criteria: "2대 이하",
        grade: targetGap > 0 ? `${targetGap}대 초과` : "충족",
        source: formatSudoSourceDisplayLabel(
          `${SUDO_BDA_SOURCE_NAME} 잔여표적 재획득`
        ),
      },
      {
        item: "후속조치",
        observed: damageGap > 0 || targetGap > 0 ? "재타격 시행" : "감시 유지",
        criteria: "요망효과 달성",
        grade: damageGap > 0 || targetGap > 0 ? "재타격" : "보류",
        source: formatSudoSourceDisplayLabel(
          `${SUDO_BDA_SOURCE_NAME} 요구내용`
        ),
      },
    ],
  };
}
