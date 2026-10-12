import type { SudoScenarioTable } from "./sudoScenarios";
import { SUDO_JANGDO_GIS_INTEL } from "./sudoGisIntel";
import { formatSudoSourceDisplayLabel } from "./sudoSourceDisplay";
import { resolvePublicAssetPath } from "../../utils/publicAssetUrl";

export interface SudoScenarioReferenceImage {
  src: string;
  label: string;
}

export interface SudoScenarioReference {
  scenarioId: number;
  source: string;
  page: string;
  result: string;
  images: SudoScenarioReferenceImage[];
  bullets: string[];
  table?: SudoScenarioTable;
}

const scenarioAsset = (path: string) =>
  resolvePublicAssetPath(`/sudo_data/_extracted/scenario_6_1/${path}`);

const page = (pageNo: number) =>
  scenarioAsset(`pages/page_${String(pageNo).padStart(2, "0")}.png`);

const figure = (path: string) => scenarioAsset(`figures/${path}`);

const SUDO_SCENARIO_7_TERRAIN_SUMMARY = `산림/도심 ${SUDO_JANGDO_GIS_INTEL.forestPercent}% / 개활지 ${SUDO_JANGDO_GIS_INTEL.openTerrainPercent}%`;

export const sudoScenarioReferences: SudoScenarioReference[] = [
  {
    scenarioId: 1,
    source: "senario.pdf / 1-1, 1-2",
    page: "page_01",
    result: "WARNING: 드론1이 표적을 식별하였습니다.",
    images: [
      { src: page(1), label: "S1~S2 실제 표 구조" },
      {
        src: figure("page_01_figure_03_xref_38.png"),
        label: "드론 촬영 표적 bbox",
      },
    ],
    bullets: [
      "장도훈련장 지형DB와 드론 운용현황을 동시에 전시",
      "표적좌표 BH 12345 67890, 드론좌표 BH 12321 56789 형식 사용",
      "보조 화면은 실제 드론 촬영 사진/영상과 빨간 bbox가 중심",
    ],
    table: {
      title: "제공자료/요구내용",
      columns: [
        { key: "item", label: "구분" },
        { key: "value", label: "실제자료" },
        { key: "use", label: "앱 반영" },
      ],
      rows: [
        {
          item: "1-1",
          value: "장도훈련장 실기동 촬영 영상",
          use: "드론 표적 식별 영상",
        },
        {
          item: "1-2",
          value: "장도훈련장 사진 DB",
          use: "지형DB/보조 화면",
        },
      ],
    },
  },
  {
    scenarioId: 2,
    source: "senario.pdf / 2-1~7",
    page: "page_01",
    result: "240mm 방사포(M-1991) 99.8%",
    images: [
      {
        src: figure("page_01_figure_04_xref_55.png"),
        label: "객체인식 분석 화면",
      },
      {
        src: figure("page_01_figure_08_xref_70.png"),
        label: "참조 형상",
      },
    ],
    bullets: [
      "전폭/전장 제원, 22연장 발사관, 이동속도, 운전석/차량후미를 근거로 사용",
      "발사관 앞 적재대/사수의자, 박스형 차량 전면, ROMAN 차대 확인",
      "후보 확률은 M-1991 99.8%, M-1989 0.2% 구조",
    ],
    table: {
      title: "표적성질 판단근거",
      columns: [
        { key: "basis", label: "근거" },
        { key: "observed", label: "관측" },
        { key: "grade", label: "판정" },
      ],
      rows: [
        { basis: "발사관", observed: "22연장 배열", grade: "M-1991 부합" },
        { basis: "차대", observed: "ROMAN 계열", grade: "240mm 방사포" },
        { basis: "후보", observed: "M-1991 99.8%", grade: "최종" },
      ],
    },
  },
  {
    scenarioId: 3,
    source: "senario.pdf / 3-1",
    page: "page_02",
    result: "장비대수·행군장경 기반 규모 산출",
    images: [
      { src: page(2), label: "S3~S4 실제 표 구조" },
      {
        src: figure("page_02_figure_03_xref_84.png"),
        label: "부대규모 분석 화면",
      },
    ],
    bullets: [
      "현재 프레임: 초록 bbox 3건, 선두 차량-중간 트럭-후미 방사포",
      "240mm 방사포 대대: 방사포 12문, 지프 1대, 트럭 30대, 행군장경 약 1500m",
      "현재 bbox 3건과 행군장경 표를 함께 반영",
    ],
    table: {
      title: "3-1 부대별 행군장경 기준",
      columns: [
        { key: "unit", label: "편성" },
        { key: "equipment", label: "장비" },
        { key: "length", label: "행군장경" },
        { key: "grade", label: "판정" },
      ],
      rows: [
        {
          unit: "240mm 방사포 중대",
          equipment: "프레임 식별 3대",
          length: "350m",
          grade: "중대",
        },
        {
          unit: "240mm 방사포 대대",
          equipment: "방사포12 + 지프1 + 트럭30",
          length: "1500m",
          grade: "대대",
        },
        {
          unit: "전차 중대",
          equipment: "전차8",
          length: "300m",
          grade: "중대",
        },
      ],
    },
  },
  {
    scenarioId: 4,
    source: "senario.pdf / 4-1",
    page: "page_02",
    result: "1사단 1대대 2중대 240mm 방사포 99.8%",
    images: [
      {
        src: figure("page_02_figure_06_xref_87.png"),
        label: "전투서열 판단 지도/표",
      },
    ],
    bullets: [
      "표적좌표 BH 12345 67890 기준 최기부대 위치와 이격거리 비교",
      "BH 12415 67915, 106m, 1사단 1대대 2중대 240mm 방사포가 1순위",
      "51m 152mm 자주포 후보는 근접하지만 표적성질 불일치로 2순위",
    ],
    table: {
      title: "4-1 전투서열 후보",
      columns: [
        { key: "coord", label: "최기부대 위치" },
        { key: "distance", label: "이격" },
        { key: "unit", label: "전투서열" },
        { key: "rank", label: "순위" },
      ],
      rows: [
        {
          coord: "BH 12415 67915",
          distance: "106m",
          unit: "1사단 1대대 2중대 240mm 방사포",
          rank: "1",
        },
        {
          coord: "BH 12346 67899",
          distance: "51m",
          unit: "2사단 3대대 1중대 152mm 자주포",
          rank: "2",
        },
        {
          coord: "BH 13143 68541",
          distance: "2,013m",
          unit: "1사단 2대대 1중대 240mm 방사포",
          rank: "3",
        },
      ],
    },
  },
  {
    scenarioId: 5,
    source: "senario.pdf / 5-1",
    page: "page_03",
    result: "HEBB 사격가능",
    images: [
      { src: page(3), label: "S5~S6 실제 표 구조" },
      {
        src: figure("page_03_figure_04_xref_104.png"),
        label: "CDE 효과반경 표",
      },
    ],
    bullets: [
      "화면 표는 HE, HEBB, DPICM, DPBB의 17~22km 구간 CDE를 표시",
      "18km 기준 HE 92, HEBB 106, DPICM 113, DPBB 236",
      "화면 결론은 DPBB 민간지역 피해 가능성을 제한하고 HEBB 사격가능으로 표시",
    ],
    table: {
      title: "5-1 탄종별 CDE 일부",
      columns: [
        { key: "distance", label: "거리" },
        { key: "he", label: "HE" },
        { key: "hebb", label: "HEBB" },
        { key: "dp", label: "DPICM" },
        { key: "dpbb", label: "DPBB" },
      ],
      rows: [
        { distance: "17km", he: "88", hebb: "103", dp: "110", dpbb: "231" },
        { distance: "18km", he: "92", hebb: "106", dp: "113", dpbb: "236" },
        { distance: "19km", he: "-", hebb: "110", dp: "-", dpbb: "239" },
        { distance: "20km", he: "-", hebb: "114", dp: "-", dpbb: "242" },
        { distance: "21km", he: "-", hebb: "119", dp: "-", dpbb: "246" },
        { distance: "22km", he: "-", hebb: "126", dp: "-", dpbb: "255" },
      ],
    },
  },
  {
    scenarioId: 6,
    source: "senario.pdf / 6-1",
    page: "page_03",
    result: "240mm 방사포 취약점 카드 8개",
    images: [
      {
        src: figure("page_03_figure_05_xref_105.png"),
        label: "충의-GPT 취약점 인포그래픽",
      },
    ],
    bullets: [
      "발사 위치 노출, 재장전 시간 문제, 기동성 한계, 정밀도 한계",
      "탄약·물류 부담, 드론 시대의 취약성, 기상 영향, 기타 취약 요소",
      "6-1 자료는 240mm 방사포와 152mm 자주포 취약점 슬라이드를 포함",
    ],
  },
  {
    scenarioId: 7,
    source: "senario.pdf / 7-1, 7-2",
    page: "page_04",
    result: "HE 6발",
    images: [
      { src: page(4), label: "S7~S8 실제 표 구조" },
      {
        src: figure("page_04_figure_03_xref_121.png"),
        label: "탄종/발수 판단 과정",
      },
    ],
    bullets: [
      `표적성질 122/240밀리 방사포, 사거리 0~6km, 지형 ${SUDO_SCENARIO_7_TERRAIN_SUMMARY}`,
      "요망효과 파괴 30% 기준 HE 6발",
      "100포병대대 사격지시는 HE탄 3R로 하달",
      "실제 화면은 지형분류 지도와 요망효과별 매트릭스를 함께 전시",
    ],
    table: {
      title: "7-1~2 무기효과 판단",
      columns: [
        { key: "target", label: "표적성질" },
        { key: "range", label: "사거리" },
        { key: "terrain", label: "지형" },
        { key: "effect", label: "요망효과" },
        { key: "result", label: "결과" },
      ],
      rows: [
        {
          target: "122/240밀리 방사포",
          range: "0~6km",
          terrain: "산림/도심",
          effect: "파괴 30%",
          result: "HE 6발",
        },
      ],
    },
  },
  {
    scenarioId: 8,
    source: "senario.pdf / 8-1",
    page: "page_04",
    result: "100포병대대(K105A1)",
    images: [
      {
        src: figure("page_04_figure_04_xref_122.png"),
        label: "최적 사격부대 선정 화면",
      },
    ],
    bullets: [
      "후보는 669포병대대(K9), 602포병대대(K55A1), 포5대대(K55A1), 100포병대대(K105A1), 101여단 4.2인치 박격포",
      "평가항목은 사거리, 생존성보장, 탄보유량, 민간피해, 전투력수준",
      "100포병대대는 6km 사격 가능, 유개호 포상, HE 100R, 민간피해 없음",
    ],
    table: {
      title: "8-1 사격부대 후보",
      columns: [
        { key: "unit", label: "후보" },
        { key: "range", label: "사거리" },
        { key: "ammo", label: "탄" },
        { key: "civilian", label: "민간피해" },
        { key: "grade", label: "판정" },
      ],
      rows: [
        {
          unit: "100포병대대(K105A1)",
          range: "6km 가능",
          ammo: "HE 100R",
          civilian: "없음",
          grade: "선정",
        },
        {
          unit: "669포병대대(K9)",
          range: "사거리 가능",
          ammo: "제한",
          civilian: "검토",
          grade: "후보",
        },
        {
          unit: "101여단 4.2인치",
          range: "제한",
          ammo: "확인필요",
          civilian: "검토",
          grade: "제외",
        },
      ],
    },
  },
  {
    scenarioId: 9,
    source: "senario.pdf / 9-1",
    page: "page_05",
    result: "3번 도로[70%], 감시 2 · 결심 2 · 타격 2",
    images: [
      { src: page(5), label: "S9~S11 실제 표 구조" },
      {
        src: figure("page_05_figure_03_xref_138.png"),
        label: "사태분석도 #1/#2 비교",
      },
    ],
    bullets: [
      "예상 이동로: 3번 도로[70%]",
      "1번 도로 10%, 3번 도로 70%, 5번 도로 20%",
      "3번 도로는 수도권 진입 가능 및 고속기동 가능",
      "NAI, DP, TAI 판단: 감시 2, 결심 2, 타격 2",
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
          road1: "포장도로, 고속기동 가능",
          road3: "포장도로, 고속기동 가능",
          road5: "포장도로, 고속기동 가능",
        },
        {
          item: "작전목적 달성",
          road1: "수도권 진출 제한",
          road3: "수도권 진입 가능",
          road5: "수도권 진입 가능",
        },
        { item: "예상 확률(%)", road1: "10%", road3: "70%", road5: "20%" },
      ],
    },
  },
  {
    scenarioId: 10,
    source: "senario.pdf / 9-1",
    page: "page_05",
    result: "1번 TAI #3 쑥고개, 2번 NAI #4 말고개, 3번 TAI #4 당동리",
    images: [
      {
        src: figure("page_05_figure_04_xref_139.png"),
        label: "AI 기반 감시자산 재배치",
      },
    ],
    bullets: [
      "질의: 사태분석도 판단안(2안)에 따라 감시자산(드론)재배치 해줘!",
      "1번 드론은 TAI #3 쑥고개로 이동",
      "2번 드론은 NAI #4 말고개, 3번 드론은 TAI #4 당동리로 이동",
    ],
  },
  {
    scenarioId: 11,
    source: "senario.pdf / 11-1",
    page: "page_05",
    result: "CAS+포병 / TAI#5 / H시 11:00 / DP#3",
    images: [
      {
        src: figure("page_05_figure_06_xref_141.png"),
        label: "타격방법 결정표",
      },
    ],
    bullets: [
      "CAS 가용 10:30~11:30, 14:00~15:00",
      "육군항공은 12:00 이후, 포병은 24시간 가능",
      "1순위 CAS+포병 TAI#5 H시 11:00 DP#3",
    ],
    table: {
      title: "타격방법 결정",
      columns: [
        { key: "method", label: "방법" },
        { key: "tai", label: "TAI" },
        { key: "time", label: "H시" },
        { key: "dp", label: "DP" },
        { key: "rank", label: "순위" },
      ],
      rows: [
        {
          method: "CAS+포병",
          tai: "TAI#5",
          time: "11:00",
          dp: "DP#3",
          rank: "1",
        },
        { method: "JAAT", tai: "TAI#7", time: "14:00", dp: "DP#7", rank: "2" },
        {
          method: "Fire-Eagle",
          tai: "TAI#8",
          time: "12:00",
          dp: "DP#2",
          rank: "3",
        },
      ],
    },
  },
  {
    scenarioId: 12,
    source: "senario.pdf / 12-1",
    page: "page_06",
    result: "통합화력운용 H시 11:00 (H-10~H+30)",
    images: [
      { src: page(6), label: "S12~S13 실제 표 구조" },
      {
        src: figure("page_06_figure_08_xref_152.png"),
        label: "통합화력운용도표",
      },
    ],
    bullets: [
      "실제 화면은 중앙에 통합화력운용도표 이미지가 핵심",
      "H시 11:00 기준 H-10부터 H+30까지 자산별 운용",
      "NAI/DP/TAI와 타격자산을 같은 시간축에 배치",
    ],
  },
  {
    scenarioId: 13,
    source: "artas program.pdf",
    page: "page_01-02",
    result: "ARTAS 허상표적 99%",
    images: [
      {
        src: figure("page_07_figure_01_xref_159.png"),
        label: "ARTAS 대포병탐지 R/D 판단 참고",
      },
    ],
    bullets: [
      "AA001 / TPQ-74K 1반 기술적 판단: 허상표적 78%",
      "탄도곡선 끊김, 레이더 예상정확도 300m 초과, 추적횟수 7회",
      "섬광·폭음, MASINT, TOD 영상복귀, 적 특이활동이 없어 종합 허상표적 99%",
    ],
    table: {
      title: "ARTAS 대포병탐지 R/D 표적탐지 판단근거",
      columns: [
        { key: "area", label: "구분" },
        { key: "observed", label: "확인" },
        { key: "grade", label: "판정" },
      ],
      rows: [
        { area: "ARTAS", observed: "허상표적 78%", grade: "허상 우세" },
        {
          area: "기술판단",
          observed: "탄도곡선 끊김 / 정확도 300m 초과 / 추적 7회",
          grade: "허상 징후",
        },
        { area: "지휘소", observed: "섬광·폭음 없음", grade: "허상 우세" },
        {
          area: "타출처",
          observed: "MASINT 없음 / TOD 복귀 없음 / 적 특이활동 없음",
          grade: "허상 99%",
        },
      ],
    },
  },
];

export function getSudoScenarioReference(
  scenarioId: number
): SudoScenarioReference | undefined {
  const reference = sudoScenarioReferences.find(
    (reference) => reference.scenarioId === scenarioId
  );
  return reference
    ? {
        ...reference,
        source: formatSudoSourceDisplayLabel(reference.source),
      }
    : undefined;
}
