import type { SudoScenarioTable } from "./sudoScenarios";

export const SUDO_RD_ASSESSMENT_SOURCE_NAME =
  "artas program.pdf ARTAS 대포병탐지 R/D 표적탐지";

export const SUDO_RD_ASSESSMENT_SOURCE_PATH =
  "client/public/sudo_data/sudo_senario_ver2/artas program.pdf";

export interface SudoRdAssessmentSourceRow {
  area: string;
  check: string;
  observed: string;
  realCriteria: string;
  falseCriteria: string;
  grade: string;
  responsibility: string;
  source: string;
}

export const SUDO_RD_ASSESSMENT_SOURCE_ROWS: SudoRdAssessmentSourceRow[] = [
  {
    area: "R/D 진지",
    check: "ARTAS 기술적 판단",
    observed: "허상표적 78%",
    realCriteria: "정상 탄도곡선, 정상 레이더 정확도, 충분 추적횟수",
    falseCriteria: "탄도곡선 끊김 / 레이더 예상정확도 300m 초과 / 추적횟수 7회",
    grade: "허상 징후",
    responsibility: "TPQ-74K 1반",
    source: `${SUDO_RD_ASSESSMENT_SOURCE_NAME} page 1`,
  },
  {
    area: "R/D 진지",
    check: "표적탐지 제원",
    observed:
      "AA001 06100900 / 원점 52SCH1234512345 / 낙탄 52SCH1254312543 / 10km",
    realCriteria: "원점-낙탄거리와 탄도곡선 일관",
    falseCriteria: "탐지제원과 탄도곡선 불일치",
    grade: "허상 징후",
    responsibility: "TPQ-74K 1반",
    source: `${SUDO_RD_ASSESSMENT_SOURCE_NAME} page 1`,
  },
  {
    area: "R/D 진지",
    check: "사격방향",
    observed: "북에서 남 방향으로 판독",
    realCriteria: "북 -> 남",
    falseCriteria: "북 -> 북 / 남 -> 북",
    grade: "허상 징후",
    responsibility: "R/D반, 포병여단",
    source: `${SUDO_RD_ASSESSMENT_SOURCE_NAME} ★ 사격방향`,
  },
  {
    area: "R/D 진지",
    check: "탄도곡선 이상유무",
    observed: "탄도곡선이 끊긴 비정상 형태",
    realCriteria: "정상적 포물선",
    falseCriteria: "비정상적: 미형성, 일직선, 끊김",
    grade: "허상 징후",
    responsibility: "R/D반, 포병여단",
    source: `${SUDO_RD_ASSESSMENT_SOURCE_NAME} ★ 탄도곡선`,
  },
  {
    area: "지휘소",
    check: "GP/GOP·포목선 전방 섬광·폭음",
    observed: "섬광 및 폭음 청취 내용 없음",
    realCriteria: "섬광ㆍ폭음 있음",
    falseCriteria: "섬광ㆍ폭음 없음",
    grade: "허상 우세",
    responsibility: "군단ㆍ사단 지휘소",
    source: `${SUDO_RD_ASSESSMENT_SOURCE_NAME} ★ 포목선 전방 확인`,
  },
  {
    area: "지휘소",
    check: "인접 대포병탐지레이더",
    observed: "인접 대포병탐지레이더 미탐지",
    realCriteria: "인접 레이더 획득",
    falseCriteria: "인접 레이더 없음",
    grade: "허상 우세",
    responsibility: "군단ㆍ사단 지휘소",
    source: `${SUDO_RD_ASSESSMENT_SOURCE_NAME} ★ 인접 레이더`,
  },
  {
    area: "지휘소",
    check: "MASINT 첩보확인",
    observed: "MASINT 첩보확인 결과 특이사항 없음",
    realCriteria: "MASINT 획득",
    falseCriteria: "MASINT 없음",
    grade: "허상 우세",
    responsibility: "군단ㆍ사단 지휘소",
    source: `${SUDO_RD_ASSESSMENT_SOURCE_NAME} page 2`,
  },
  {
    area: "지휘소",
    check: "TOD 영상복귀결과",
    observed: "촬영사항 없음",
    realCriteria: "TOD 영상에 발사활동 또는 이동 확인",
    falseCriteria: "촬영사항 없음",
    grade: "허상 우세",
    responsibility: "군단ㆍ사단 지휘소",
    source: `${SUDO_RD_ASSESSMENT_SOURCE_NAME} page 2`,
  },
  {
    area: "지휘소",
    check: "적 특이활동 분석",
    observed: "통신첩보, 광학카메라 촬영결과 등 특이활동 없음",
    realCriteria: "적 활동 특이동향 확인",
    falseCriteria: "적 특이활동 없음",
    grade: "허상 99%",
    responsibility: "군단ㆍ사단 지휘소",
    source: `${SUDO_RD_ASSESSMENT_SOURCE_NAME} page 2`,
  },
];

export function buildSudoRdAssessmentDecisionInputs() {
  return SUDO_RD_ASSESSMENT_SOURCE_ROWS.map(
    ({
      realCriteria: _realCriteria,
      falseCriteria: _falseCriteria,
      responsibility: _responsibility,
      source: _source,
      ...row
    }) => ({
      ...row,
    })
  );
}

export function buildSudoRdAssessmentSourceTable(): SudoScenarioTable {
  return {
    title: "ARTAS 대포병탐지 R/D 표적탐지 원본 체크리스트",
    columns: [
      { key: "area", label: "구분" },
      { key: "check", label: "체크항목" },
      { key: "realCriteria", label: "실존 기준" },
      { key: "falseCriteria", label: "허상 기준" },
      { key: "observed", label: "화면 적용" },
      { key: "grade", label: "판정" },
      { key: "responsibility", label: "평가책임" },
      { key: "source", label: "출처" },
    ],
    rows: SUDO_RD_ASSESSMENT_SOURCE_ROWS.map((row) => ({ ...row })),
  };
}

export function getSudoRdAssessmentRowsForVisual() {
  return SUDO_RD_ASSESSMENT_SOURCE_ROWS.map(
    ({
      realCriteria: _realCriteria,
      falseCriteria: _falseCriteria,
      responsibility: _responsibility,
      source: _source,
      ...row
    }) => ({
      area: row.area,
      check: row.check,
      observed: row.observed,
      grade: row.grade,
    })
  );
}
