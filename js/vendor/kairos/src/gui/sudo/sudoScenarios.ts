import { SUDO_ASSISTANT_240MM_VULNERABILITY_CARDS } from "./sudoAssistantVulnerabilityIntel";
import {
  SUDO_ORDER_CANDIDATE_SOURCE_ROWS,
  formatSudoOrderDistance,
} from "./sudoOrderCandidateIntel";
import { SUDO_TARGET_CLASSIFICATION_EVIDENCE_ROWS } from "./sudoTargetClassificationIntel";
import { getSudoScaleDoctrineRowsForVisual } from "./sudoScaleIntel";
import {
  getSudoFirePlanRowsForVisual,
  getSudoStrikeMethodRowsForVisual,
} from "./sudoFirePlanIntel";
import { SUDO_JANGDO_GIS_INTEL } from "./sudoGisIntel";
import { getSudoRdAssessmentRowsForVisual } from "./sudoRdAssessmentIntel";
import { getSudoMunitionEffectRowsForVisual } from "./sudoMunitionEffectIntel";
import { getSudoDroneIdentificationRowsForVisual } from "./sudoDroneTargetIntel";

export type SudoScenarioVisualKind =
  | "drone"
  | "classification"
  | "scale"
  | "order"
  | "collateral"
  | "assistant"
  | "munition"
  | "firingUnit"
  | "coa"
  | "reposition"
  | "strike"
  | "firePlan"
  | "bda"
  | "rdAssessment";

export interface SudoDetectionBox {
  label: string;
  rawLabel?: string;
  confidence: number;
  x: number;
  y: number;
  width: number;
  height: number;
  color?: string;
  frameIndex?: number;
  trackId?: string;
  role?: string;
  visualFeatures?: {
    launcherScore?: number;
    darkBlobCount?: number;
    topDarkRatio?: number;
    edgeDensity?: number;
    tubeFaceEdgeDensity?: number;
    tubeFaceDarkRatio?: number;
  };
}

export interface SudoMetric {
  label: string;
  value: string;
  tone?: "blue" | "green" | "amber" | "red";
}

export interface SudoTableColumn {
  key: string;
  label: string;
}

export interface SudoScenarioTable {
  title: string;
  columns: SudoTableColumn[];
  rows: Record<string, string>[];
}

export interface SudoScenarioUpgrade {
  label: string;
  outcome: string;
  operatorCue: string;
}

export interface SudoScenario {
  id: number;
  title: string;
  implementationLevel: "필수 구현" | "목업" | "앱 확장";
  visualKind: SudoScenarioVisualKind;
  headline: string;
  objective: string;
  evidence: string[];
  process: string[];
  decision: string;
  upgrade?: SudoScenarioUpgrade;
  metrics: SudoMetric[];
  detections?: SudoDetectionBox[];
  table?: SudoScenarioTable;
  assistantPrompt?: string;
  assistantAnswer?: string[];
}

const SUDO_SCENARIO_7_TERRAIN_SUMMARY = `산림/도심 ${SUDO_JANGDO_GIS_INTEL.forestPercent}% / 개활지 ${SUDO_JANGDO_GIS_INTEL.openTerrainPercent}%`;

export const sudoScenarios: SudoScenario[] = [
  {
    id: 1,
    title: "드론 표적 식별",
    implementationLevel: "필수 구현",
    visualKind: "drone",
    headline: "WARNING: 드론1이 표적을 식별하였습니다.",
    objective: "장도훈련장 지형DB와 실제 드론 촬영 표적 영상을 함께 전시",
    evidence: [
      "장도훈련장 실기동 촬영 영상에서 도로상 표적 bbox 확인",
      "지형DB, 드론자세, 위치, 고도, 감시좌표 동시 전시",
      "표적좌표 BH 12345 67890, 드론좌표 BH 12321 56789 형식 적용",
    ],
    process: [
      "드론1 EO 영상에서 표적 후보를 탐지하고 빨간 bbox로 표시",
      "탐지 지점을 장도훈련장 지형DB와 매칭",
      "식별 알림을 주 화면에 띄우고 보조 화면에 실제 영상/사진을 연결",
    ],
    decision: "표적 후보 1건을 식별하고 표적성질 분석 단계로 이관합니다.",
    upgrade: {
      label: "TOD-드론 전환 신뢰도 보강",
      outcome:
        "TOD 감시, 드론 출동, bbox 이관 상태를 한 흐름으로 묶어 감지 미연결과 감지 반영을 구분합니다.",
      operatorCue: "TOD 감지상태와 드론 bbox 이관 여부를 먼저 확인하세요.",
    },
    metrics: [
      { label: "드론", value: "드론1", tone: "blue" },
      { label: "표적좌표", value: "BH 12345 67890", tone: "green" },
      { label: "제공자료", value: "1-1 / 1-2", tone: "amber" },
    ],
    table: {
      title: "드론운용 현황",
      columns: [
        { key: "item", label: "항목" },
        { key: "value", label: "전시값" },
        { key: "source", label: "근거자료" },
      ],
      rows: getSudoDroneIdentificationRowsForVisual(),
    },
  },
  {
    id: 2,
    title: "표적성질분석",
    implementationLevel: "필수 구현",
    visualKind: "classification",
    headline: "표적성질 판단: 240mm 방사포(M-1991) 99.8%",
    objective: "객체인식 결과와 형상 판단근거 7개를 보조 화면에 구조화",
    evidence: [
      "전폭/전장 제원 일치",
      "실시간 YOLO 차량 track 확인",
      "후보 확률 240mm 방사포(M-1991) 99.8%, M-1989 0.2%",
    ],
    process: [
      "전송 영상에서 차량 외곽 bbox를 추출",
      "발사관, 차체, 운전석, 차량후미 특징을 참조 형상과 비교",
      "후보 확률표와 판단근거 목록을 함께 전시",
    ],
    decision: "표적성질 판정: 240mm 방사포(M-1991), 신뢰도 99.8%",
    upgrade: {
      label: "형상근거 우선순위 보강",
      outcome:
        "발사관, 차체, 운전석, 차량후미 근거를 후보 확률보다 먼저 보이게 정리해 generic vehicle 오판을 낮춥니다.",
      operatorCue:
        "240mm 확정 전 발사관/TEL 형상 근거가 분리됐는지 확인하세요.",
    },
    metrics: [
      { label: "표적성질", value: "240mm 방사포(M-1991)", tone: "green" },
      { label: "표적좌표", value: "BH 12345 67890", tone: "green" },
      { label: "신뢰도", value: "99.8%", tone: "green" },
      { label: "근거", value: "7개", tone: "blue" },
    ],
    table: {
      title: "표적성질 판단근거",
      columns: [
        { key: "basis", label: "판단근거" },
        { key: "observed", label: "관측내용" },
        { key: "grade", label: "판정" },
        { key: "source", label: "근거자료" },
      ],
      rows: SUDO_TARGET_CLASSIFICATION_EVIDENCE_ROWS.map((row) => ({
        ...row,
      })),
    },
  },
  {
    id: 3,
    title: "부대규모 판단",
    implementationLevel: "목업",
    visualKind: "scale",
    headline: "프레임 식별 3대와 행군장경 350m로 중대규모를 판단합니다.",
    objective: "프레임 bbox 3건과 3-1 행군장경/편성표를 근거로 부대규모 산정",
    evidence: [
      "객체인식 bbox 3건: 선두 차량, 중간 트럭, 후미 방사포",
      "행군장경 약 350m",
      "장비대수와 행군장경 판정 중 더 큰 규모를 종합 판정에 반영",
    ],
    process: [
      "드론 프레임에서 초록 bbox 3건을 식별",
      "선두-후미 거리로 행군장경 약 350m 산출",
      "3-1 부대별 행군장경 기준표와 편성 수량을 비교",
    ],
    decision: "부대규모 판정: 장비대수와 행군장경 기준을 종합해 규모 산출",
    upgrade: {
      label: "행군장경 산정 보강",
      outcome:
        "프레임 bbox 수량과 선두-후미 행군장경을 함께 표시해 장비대수 기준과 대열 길이 기준의 차이를 드러냅니다.",
      operatorCue: "관측 대수와 350m 행군장경 중 큰 규모 기준을 비교하세요.",
    },
    metrics: [
      { label: "판정", value: "AI 산출", tone: "green" },
      { label: "행군장경", value: "350m", tone: "blue" },
      { label: "편성", value: "프레임 3대", tone: "amber" },
    ],
    table: {
      title: "3-1 부대별 행군장경 기준",
      columns: [
        { key: "unit", label: "편성" },
        { key: "equipment", label: "장비구성" },
        { key: "length", label: "행군장경" },
        { key: "grade", label: "판정" },
      ],
      rows: getSudoScaleDoctrineRowsForVisual(),
    },
  },
  {
    id: 4,
    title: "전투서열 판단",
    implementationLevel: "목업",
    visualKind: "order",
    headline:
      "표적좌표와 최기부대 DB를 비교해 1사단 1대대 2중대를 1순위로 판단합니다.",
    objective: "4-1 인근부대 위치/보유장비 표를 기반으로 전투서열 후보 정렬",
    evidence: [
      "표적좌표 BH 12345 67890",
      "BH 12415 67915, 106m 이격, 1사단 1대대 2중대 240mm 방사포",
      "근접 후보 152mm 자주포는 표적성질 불일치로 2순위",
    ],
    process: [
      "표적좌표와 최기부대 위치 간 이격거리 계산",
      "전투서열명과 보유화기, 수량을 표적성질과 매칭",
      "이격거리, 화기 일치, 보유장비 수량을 기준으로 순위화",
    ],
    decision: "예상 전투서열: 1사단 1대대 2중대 240mm 방사포, 99.8%",
    upgrade: {
      label: "전투서열 후보 비교 보강",
      outcome:
        "최기부대 거리, 화기 일치, 보유장비 수량을 한 후보표에 묶어 1순위와 제외 후보의 차이를 즉시 비교합니다.",
      operatorCue: "106m 이격 후보와 152mm 불일치 후보를 같이 확인하세요.",
    },
    metrics: [
      { label: "1순위", value: "1사단 1대대 2중대", tone: "green" },
      { label: "이격", value: "106m", tone: "blue" },
      { label: "화기", value: "240mm 방사포", tone: "amber" },
    ],
    table: {
      title: "4-1 전투서열 후보표",
      columns: [
        { key: "target", label: "표적좌표" },
        { key: "coord", label: "최기부대 적 위치" },
        { key: "distance", label: "이격거리" },
        { key: "unit", label: "전투서열" },
        { key: "equipment", label: "보유장비" },
        { key: "rank", label: "순위" },
      ],
      rows: SUDO_ORDER_CANDIDATE_SOURCE_ROWS.map((row) => ({
        target: row.targetCoordinate,
        coord: row.coordinate,
        distance: formatSudoOrderDistance(row.distanceM),
        unit: row.unit,
        equipment: `${row.weapon} / ${row.equipment}`,
        rank: row.sourceRank,
      })),
    },
  },
  {
    id: 5,
    title: "부수적 피해 판단",
    implementationLevel: "목업",
    visualKind: "collateral",
    headline:
      "거리별 CDE 표와 민가지역 반경을 비교해 HEBB 사격가능으로 판단합니다.",
    objective: "5-1 탄종별 부수적 효과반경 표를 지도 반경 판단과 연결",
    evidence: [
      "탄종별 CDE: HE, HEBB, DPICM, DPBB",
      "18km 기준 HEBB 106, DPBB 236",
      "DPBB 사격 시 민가지역 피해발생 가능",
    ],
    process: [
      "표적과 민가지역을 지형DB 위에 표시",
      "거리별 CDE 표에서 현재 사거리 구간의 탄종별 반경을 조회",
      "HEBB/DPBB 반경과 민가지역 중첩 여부를 비교",
    ],
    decision: "부수피해 판단: HEBB 사격가능",
    upgrade: {
      label: "CDE 안전여유 보강",
      outcome:
        "HEBB와 DPBB 효과반경을 민가지역 반경과 같은 판단 단위로 정리해 허용 탄종과 제한 탄종을 분리합니다.",
      operatorCue: "HEBB 106m와 DPBB 236m 중첩 차이를 확인하세요.",
    },
    metrics: [
      { label: "판정", value: "HEBB 가능", tone: "green" },
      { label: "18km HEBB", value: "106", tone: "blue" },
      { label: "18km DPBB", value: "236", tone: "amber" },
    ],
    table: {
      title: "5-1 탄종별 부수적 효과반경 일부",
      columns: [
        { key: "distance", label: "사거리" },
        { key: "he", label: "HE" },
        { key: "hebb", label: "HEBB" },
        { key: "dp", label: "DPICM" },
        { key: "dpbb", label: "DPBB" },
      ],
      rows: [
        {
          distance: "17km",
          he: "88",
          hebb: "103",
          dp: "110",
          dpbb: "231",
        },
        {
          distance: "18km",
          he: "92",
          hebb: "106",
          dp: "113",
          dpbb: "236",
        },
        {
          distance: "19km",
          he: "-",
          hebb: "110",
          dp: "-",
          dpbb: "239",
        },
        {
          distance: "20km",
          he: "-",
          hebb: "114",
          dp: "-",
          dpbb: "242",
        },
        {
          distance: "21km",
          he: "-",
          hebb: "119",
          dp: "-",
          dpbb: "246",
        },
        {
          distance: "22km",
          he: "-",
          hebb: "126",
          dp: "-",
          dpbb: "255",
        },
      ],
    },
  },
  {
    id: 6,
    title: "충의 AI어시스턴트",
    implementationLevel: "목업",
    visualKind: "assistant",
    headline: "240mm 방사포 취약점을 8개 카드형 근거로 제공합니다.",
    objective: "6-1 취약점 슬라이드의 카드 구조를 충의-GPT 답변으로 확장",
    evidence: [
      "발사 위치 노출, 재장전 시간 문제",
      "기동성 한계, 정밀도 한계",
      "탄약·물류 부담, 드론 시대의 취약성, 기상 영향, 기타 취약 요소",
    ],
    process: [
      "사용자 질의를 표적성질 240mm 방사포와 매칭",
      "6-1 취약점 자료에서 카드형 근거를 검색",
      "240mm 방사포와 152mm 자주포 취약점 자료를 보조 지식으로 연결",
    ],
    decision: "충의-GPT 답변을 표적성질/사격계획 보조근거로 첨부합니다.",
    upgrade: {
      label: "취약점 카드 답변 보강",
      outcome:
        "8개 취약점 카드를 답변 근거와 작전활용 문장으로 나눠 충의-GPT 결과가 표적 판단 근거로 재사용되게 합니다.",
      operatorCue: "발사 위치 노출과 재장전 시간 취약점을 우선 확인하세요.",
    },
    metrics: [
      { label: "근거카드", value: "8개", tone: "green" },
      { label: "대상", value: "240mm 방사포", tone: "blue" },
      { label: "자료", value: "6-1", tone: "amber" },
    ],
    assistantPrompt: "240mm 방사포 취약점 알려줘",
    assistantAnswer: [
      "발사 위치 노출: 사격 순간 발사 섬광과 후폭풍으로 위치가 노출됩니다.",
      "재장전 시간 문제: 차탄 준비 중 대화력 타격 시간창이 형성됩니다.",
      "기동성 한계: 차륜형 TEL은 기동로 차단 시 회피가 어렵습니다.",
      "정밀도 한계: 장거리 사격 시 탄착 분산과 보정 한계가 큽니다.",
      "탄약·물류 부담: 대형 탄약 보급과 재장전 차량 의존도가 높습니다.",
      "드론 시대의 취약성: 상시 감시와 재탐지에 노출됩니다.",
      "기상 영향: 관측, 기동, 사격정확도가 기상에 영향을 받습니다.",
      "기타 취약 요소: 진지 선택, 은폐, 통신 유지 실패가 생존성을 낮춥니다.",
    ],
    table: {
      title: "6-1 취약점 카드",
      columns: [
        { key: "factor", label: "취약점" },
        { key: "evidence", label: "요약" },
        { key: "impact", label: "작전활용" },
        { key: "grade", label: "우선도" },
        { key: "source", label: "원천" },
      ],
      rows: SUDO_ASSISTANT_240MM_VULNERABILITY_CARDS.map((card) => ({
        factor: card.factor,
        evidence: card.evidence,
        impact: card.impact,
        grade: card.grade,
        source: card.source,
      })),
    },
  },
  {
    id: 7,
    title: "탄종/발수 판단",
    implementationLevel: "필수 구현",
    visualKind: "munition",
    headline: `122/240밀리 방사포, 0~6km, ${SUDO_SCENARIO_7_TERRAIN_SUMMARY}, 파괴 30% 기준 HE 6발입니다.`,
    objective:
      "7-1~2 무기효과 매트릭스와 지형분석 결과를 결합해 탄종/발수 산출",
    evidence: [
      "표적성질: 122/240밀리 방사포",
      `사거리: 0~6km, 지형: ${SUDO_SCENARIO_7_TERRAIN_SUMMARY}`,
      "요망효과: 파괴 30%, 결과: HE 6발",
    ],
    process: [
      "지형DB에서 산림/도심 우세 지형분석 결과를 확인",
      "표적성질과 사거리 구간을 무기효과 판단표에 입력",
      "요망효과 30%를 충족하는 대대 행의 HE 6발을 선택",
    ],
    decision: "최종 판정: HE 6발",
    upgrade: {
      label: "지형-무기효과 결합 보강",
      outcome:
        "산림/도심 피복, 개활지 비율, 사거리 0~6km를 7-1~2 무기효과 행 선택과 직접 연결합니다.",
      operatorCue: "HE 6발과 100포병대대 HE탄 3R 사격지시가 연결되는지 확인하세요.",
    },
    metrics: [
      { label: "탄종", value: "HE", tone: "green" },
      { label: "발수", value: "24발", tone: "blue" },
      { label: "요망효과", value: "30%", tone: "amber" },
    ],
    table: {
      title: "7-1~2 탄종/발수 판단표",
      columns: [
        { key: "target", label: "표적성질" },
        { key: "range", label: "사거리" },
        { key: "terrain", label: "지형" },
        { key: "fireUnit", label: "사격부대" },
        { key: "effect10", label: "10%" },
        { key: "effect20", label: "20%" },
        { key: "effect30", label: "30%" },
      ],
      rows: getSudoMunitionEffectRowsForVisual(),
    },
  },
  {
    id: 8,
    title: "최적의 사격부대 선정",
    implementationLevel: "필수 구현",
    visualKind: "firingUnit",
    headline: "5개 평가항목을 비교해 100포병대대(K105A1)를 선정합니다.",
    objective:
      "8-1 후보부대 표의 사거리, 생존성, 탄보유, 민간피해, 전투력수준 반영",
    evidence: [
      "100포병대대(K105A1): 최대사거리 11km 내 6km 사격 가능",
      "유개호 포상으로 생존성 보장",
      "HE 100R 보유, 민간피해 없음, 전투력 수준 양호",
    ],
    process: [
      "후보 5개 부대의 사거리 가능 여부를 비교",
      "생존성보장, 탄 보유량, 민간피해, 전투력수준을 행렬로 평가",
      "모든 조건을 충족하는 100포병대대(K105A1)를 최종 선정",
    ],
    decision: "사격가능부대: 100포병대대(K105A1)",
    upgrade: {
      label: "사격부대 제외사유 보강",
      outcome:
        "사거리, 생존성, 탄보유량, 민간피해, 전투력수준을 후보별 제외사유까지 함께 보여 최종 선정 근거를 강화합니다.",
      operatorCue: "100포병대대 선정 전에 K9/K55A1 제외 사유를 확인하세요.",
    },
    metrics: [
      { label: "추천부대", value: "100포병대대", tone: "green" },
      { label: "화기", value: "K105A1", tone: "blue" },
      { label: "탄", value: "HE 100R", tone: "amber" },
    ],
    table: {
      title: "8-1 최적 사격부대 판단",
      columns: [
        { key: "unit", label: "후보부대" },
        { key: "range", label: "사거리" },
        { key: "survival", label: "생존성" },
        { key: "ammo", label: "탄보유량" },
        { key: "civilian", label: "민간피해" },
        { key: "grade", label: "판정" },
      ],
      rows: [
        {
          unit: "669포병대대(K9)",
          range: "32km 가능",
          survival: "불가능",
          ammo: "HE 30R / HEBB 12R",
          civilian: "민가 2세대 피해 가능",
          grade: "제외",
        },
        {
          unit: "602포병대대(K55A1)",
          range: "36km 불가",
          survival: "가능",
          ammo: "HE 30R / HEBB 40R",
          civilian: "민가 3세대 피해 가능",
          grade: "제외",
        },
        {
          unit: "포5대대(K55A1)",
          range: "33km 불가",
          survival: "불가능",
          ammo: "HE 50R / HEBB 60R",
          civilian: "민가 2세대 피해 가능",
          grade: "제외",
        },
        {
          unit: "100포병대대(K105A1)",
          range: "6km 가능",
          survival: "가능",
          ammo: "HE 100R / DP-ICM 100R",
          civilian: "민가 피해 없음",
          grade: "선정",
        },
        {
          unit: "101여단 4.2인치 박격포",
          range: "8km 불가",
          survival: "불가능",
          ammo: "HE 100R / DPBB 70R",
          civilian: "민가 피해 없음",
          grade: "제외",
        },
      ],
    },
  },
  {
    id: 9,
    title: "사태분석도 분석",
    implementationLevel: "목업",
    visualKind: "coa",
    headline:
      "3번 도로[70%] 판단안을 기준으로 이동로 분석 후 NAI/DP/TAI 조정안을 추천합니다.",
    objective:
      "9-1 사태분석도 판단안에서 1번/3번/5번 도로를 비교하고 NAI/DP/TAI 조정",
    evidence: [
      "예상 이동로: 3번 도로[70%]",
      "1번 도로 10%, 3번 도로 70%, 5번 도로 20%",
      "3번 도로는 수도권 진입 가능 및 고속기동 가능",
      "NAI, DP, TAI 판단: 감시 2, 결심 2, 타격 2",
    ],
    process: [
      "1번, 2번, 3번 도로의 기동여건과 작전목적 달성 가능성을 비교",
      "예상 확률 70%인 3번 도로를 우선 판단안으로 선택",
      "3번 도로 기준 감시 2, 결심 2, 타격 2를 NAI/DP/TAI로 조정",
    ],
    decision:
      "예상 이동로: 3번 도로[70%], NAI/DP/TAI 판단 감시 2 · 결심 2 · 타격 2",
    upgrade: {
      label: "도로판단 추적성 보강",
      outcome:
        "1/3/5번 도로별 확률과 기동여건을 같은 표에 고정해 3번 도로 70% 판단 근거를 추적할 수 있게 합니다.",
      operatorCue:
        "70% 근거와 제외 도로의 작전목적 제한 사유를 같이 확인하세요.",
    },
    metrics: [
      { label: "추천안", value: "#2", tone: "green" },
      { label: "확률", value: "70%", tone: "blue" },
      { label: "NAI/DP/TAI", value: "2/2/2", tone: "amber" },
    ],
    table: {
      title: "9-1 사태분석도 분석 결과",
      columns: [
        { key: "item", label: "구분" },
        { key: "road1", label: "1번 도로" },
        { key: "road3", label: "3번 도로" },
        { key: "road5", label: "5번 도로" },
      ],
      rows: [
        {
          item: "기동여건 보장",
          road1: "와룡2차선, 저차 통제 가능 / 포장도로",
          road3: "와룡2차선, 저차 통과 가능 / 포장도로",
          road5: "와룡4차선, 저차 통과 가능 / 포장도로",
        },
        {
          item: "작전목적 달성",
          road1: "수도권 진출 제한",
          road3: "수도권 진입 가능",
          road5: "수도권 진입 가능",
        },
        {
          item: "예상 확률(%)",
          road1: "10%",
          road3: "70%",
          road5: "20%",
        },
      ],
    },
  },
  {
    id: 10,
    title: "사태분석도 분석 with AI",
    implementationLevel: "목업",
    visualKind: "reposition",
    headline: "AI 명령으로 드론 3대를 TAI #3, NAI #4, TAI #4로 재배치합니다.",
    objective: "사태분석도 판단안 2번에 따른 감시자산 재배치 명령을 화면화",
    evidence: [
      "질의: 사태분석도 판단안(2안)에 따라 감시자산(드론)재배치 해줘!",
      "1번 드론: TAI #3 쑥고개",
      "2번 드론: NAI #4 말고개, 3번 드론: TAI #4 당동리",
    ],
    process: [
      "사태분석도 #2의 조정 NAI/TAI 지점을 추출",
      "드론별 목표지점과 이동명령을 생성",
      "주 화면 지도와 보조 GPT 답변에 동일한 통제사항을 전시",
    ],
    decision: "감시자산 재배치 명령 하달 완료",
    upgrade: {
      label: "감시자산 재배치 확인 보강",
      outcome:
        "드론 1~3번의 목표지점, 좌표, 통제상태를 재배치표로 고정해 명령과 지도 표시의 불일치를 줄입니다.",
      operatorCue: "TAI #3, NAI #4, TAI #4 배치가 주 화면과 같은지 확인하세요.",
    },
    metrics: [
      { label: "드론1", value: "TAI #3", tone: "green" },
      { label: "드론2", value: "NAI #4", tone: "blue" },
      { label: "드론3", value: "TAI #4", tone: "amber" },
    ],
    assistantPrompt: "사태분석도 판단안(2안)에 따라 감시자산(드론)재배치 해줘!",
    assistantAnswer: [
      "1번 드론은 TAI #3 쑥고개로 이동시킵니다.",
      "2번 드론은 NAI #4 말고개로 이동시킵니다.",
      "3번 드론은 TAI #4 당동리로 이동시킵니다.",
    ],
    table: {
      title: "감시자산 재배치표",
      columns: [
        { key: "drone", label: "드론" },
        { key: "destination", label: "목표지점" },
        { key: "coordinate", label: "좌표" },
        { key: "status", label: "통제상태" },
      ],
      rows: [
        {
          drone: "1번 드론",
          destination: "TAI #3 쑥고개",
          coordinate: "BH 13245 68820",
          status: "이동명령",
        },
        {
          drone: "2번 드론",
          destination: "NAI #4 말고개",
          coordinate: "BH 14562 31094",
          status: "이동명령",
        },
        {
          drone: "3번 드론",
          destination: "TAI #4 당동리",
          coordinate: "BH 15884 23301",
          status: "이동명령",
        },
      ],
    },
  },
  {
    id: 11,
    title: "최적의 타격방법 결정",
    implementationLevel: "목업",
    visualKind: "strike",
    headline:
      "PDF 원본 작성중 자료를 앱 보강 DATA로 보완해 CAS+포병, TAI#5, H시 11:00, DP#3을 1순위로 제시합니다.",
    objective: "11-1 가용자산 시간표와 타격방법 결정표를 실제 후보 구조로 반영",
    evidence: [
      "PDF 원본 상태: 작성중, 앱 보강 DATA로 시연값 구성",
      "CAS 가용시간: 10:30~11:30, 14:00~15:00",
      "육군항공: 12:00 이후 가능, 포병: 24시간 가능",
      "1순위 CAS+포병 TAI#5 H시 11:00 DP#3",
    ],
    process: [
      "CAS, 육군항공, 포병 가용시간을 정리",
      "TAI별 H시와 DP를 비교",
      "CAS+포병, JAAT, Fire-Eagle 후보를 순위화",
    ],
    decision: "최적 타격방법: CAS+포병, TAI#5, H시 11:00, DP#3",
    upgrade: {
      label: "타격시간 후보검증 보강",
      outcome:
        "CAS, 육군항공, 포병 가용시간과 TAI/DP 후보를 같은 결정표로 묶어 11:00 CAS+포병 1순위 근거를 분리합니다.",
      operatorCue: "10:30~11:30 CAS 가용창과 DP#3 조건을 함께 확인하세요.",
    },
    metrics: [
      { label: "H시", value: "11:00", tone: "green" },
      { label: "추천", value: "CAS+포병", tone: "blue" },
      { label: "DP", value: "#3", tone: "amber" },
    ],
    table: {
      title: "타격방법 결정표",
      columns: [
        { key: "method", label: "조합" },
        { key: "tai", label: "추천 TAI" },
        { key: "time", label: "H시" },
        { key: "dp", label: "DP" },
        { key: "rank", label: "순위" },
      ],
      rows: getSudoStrikeMethodRowsForVisual(),
    },
  },
  {
    id: 12,
    title: "통합화력운용도표 작성",
    implementationLevel: "필수 구현",
    visualKind: "firePlan",
    headline:
      "PDF 원본 작성중 자료를 앱 보강 DATA로 보완해 H시 11:00 기준 H-10~H+30 통합화력운용도표를 작성합니다.",
    objective: "12-1 원본 통합화력운용도표의 시간축과 자산 배치를 화면에 반영",
    evidence: [
      "PDF 원본 상태: 작성중, 앱 보강 DATA로 시연값 구성",
      "통합화력운용 H시: 11:00",
      "H-10부터 H+30까지 자산별 운용",
      "NAI/DP/TAI와 타격자산을 같은 시간축에 배치",
    ],
    process: [
      "선정된 TAI#5, DP#3, CAS+포병 조합을 계획표에 입력",
      "H-10, H, H+10, H+30 시간 구간별 운용을 배치",
      "주 화면과 보조 화면에 통합화력운용도표를 동시 전시",
    ],
    decision: "통합화력운용 계획 시행 가능",
    upgrade: {
      label: "H시 도표 동기화 보강",
      outcome:
        "H-10부터 H+30까지 감시, 결심, 타격 자산을 한 시간축에 배치해 주/부 화면 도표 불일치를 줄입니다.",
      operatorCue:
        "H시 11:00, TAI #5, DP #3이 같은 행군 흐름에 묶였는지 확인하세요.",
    },
    metrics: [
      { label: "H시", value: "11:00", tone: "green" },
      { label: "TAI", value: "#5", tone: "blue" },
      { label: "DP", value: "#3", tone: "amber" },
    ],
    table: {
      title: "통합화력운용도표",
      columns: [
        { key: "time", label: "시간" },
        { key: "asset", label: "자산" },
        { key: "action", label: "운용" },
        { key: "effect", label: "효과" },
      ],
      rows: getSudoFirePlanRowsForVisual(),
    },
  },
  {
    id: 13,
    title: "ARTAS 대포병탐지 R/D 표적탐지 분석",
    implementationLevel: "목업",
    visualKind: "rdAssessment",
    headline:
      "WARNING: ARTAS 표적 AA001이 탐지되었습니다. 허상표적 99%로 판단합니다.",
    objective: "artas program.pdf 기준 대포병탐지 R/D 표적탐지 분석안을 작성",
    evidence: [
      "ARTAS 1차 기술판단 허상표적 78%",
      "탄도곡선 끊김, 레이더 예상정확도 300m 초과, 추적횟수 7회",
      "섬광ㆍ폭음, MASINT, TOD, 적 특이활동 추가 확인 결과 없음",
    ],
    process: [
      "ARTAS 표적번호 AA001 탐지제원과 기술판단 결과를 확인",
      "정확한 평가를 위해 섬광ㆍ폭음, MASINT, TOD, 적 활동을 추가 확인",
      "기술적평가와 지휘소평가를 합산해 허상표적 99% 분석안을 작성",
    ],
    decision: "R/D 판단: 실존 1%, 허상 99%로 허상표적 가능성이 우세합니다.",
    upgrade: {
      label: "ARTAS 허상융합 보강",
      outcome:
        "기술판단 78%, 섬광/폭음, MASINT, TOD, 적 특이활동 확인 결과를 합산해 허상 99% 전환 근거를 보강합니다.",
      operatorCue:
        "허상 99% 전환 전 추가 출처 4종이 모두 특이사항 없음인지 확인하세요.",
    },
    metrics: [
      { label: "허상", value: "99%", tone: "green" },
      { label: "기술판단", value: "78%", tone: "amber" },
      { label: "표적번호", value: "AA001", tone: "blue" },
    ],
    table: {
      title: "ARTAS 대포병탐지 R/D 표적탐지 체크리스트",
      columns: [
        { key: "area", label: "구분" },
        { key: "check", label: "체크항목" },
        { key: "observed", label: "확인내용" },
        { key: "grade", label: "판정" },
      ],
      rows: getSudoRdAssessmentRowsForVisual(),
    },
  },
  {
    id: 14,
    title: "타격결과 평가",
    implementationLevel: "앱 확장",
    visualKind: "bda",
    headline: "요망효과 30% 미달성으로 재타격 시행을 판단합니다.",
    objective:
      "타격결과 영상(입력 DATA) 판독 결과와 요망효과 30% 달성 여부를 전시",
    evidence: [
      "최초 설정한 요망효과는 30%",
      "타격결과 전차 1대 완파",
      "병력 5명이 쓰러져 있는 것을 식별",
    ],
    process: [
      "타격결과 영상 제시 후 AI 판독 결과를 분리 전시",
      "전차 완파와 병력 피해 식별 결과를 요망효과 30%와 비교",
      "요망효과 미달 시 재타격 시행 판단근거를 생성",
    ],
    decision: "타격결과 평가: 요망효과 30% 미달성, 재타격 시행 필요",
    metrics: [
      { label: "요망효과", value: "30%", tone: "amber" },
      { label: "영상판독", value: "전차1/병력5", tone: "red" },
      { label: "후속", value: "재타격", tone: "amber" },
    ],
    detections: [
      {
        label: "완파 전차",
        confidence: 0.92,
        x: 18,
        y: 42,
        width: 20,
        height: 15,
        color: "#ff6969",
      },
      {
        label: "잔여 전차",
        confidence: 0.86,
        x: 56,
        y: 39,
        width: 18,
        height: 13,
        color: "#ffc857",
      },
      {
        label: "병력 5명",
        confidence: 0.81,
        x: 43,
        y: 63,
        width: 16,
        height: 12,
        color: "#7fe7ff",
      },
    ],
    table: {
      title: "타격결과 평가 결과",
      columns: [
        { key: "item", label: "평가항목" },
        { key: "observed", label: "관측값" },
        { key: "criteria", label: "기준" },
        { key: "grade", label: "판정" },
      ],
      rows: [
        {
          item: "요망효과",
          observed: "30%",
          criteria: "최초 설정값",
          grade: "기준",
        },
        {
          item: "영상판독",
          observed: "전차 1대 완파 / 병력 5명 쓰러짐",
          criteria: "타격결과 영상",
          grade: "피해 식별",
        },
        {
          item: "후속판단",
          observed: "현재 요망효과 미달성",
          criteria: "요망효과 30%",
          grade: "재타격",
        },
      ],
    },
  },
];

export function getSudoScenario(id: number) {
  return (
    sudoScenarios.find((scenario) => scenario.id === id) ?? sudoScenarios[0]
  );
}
