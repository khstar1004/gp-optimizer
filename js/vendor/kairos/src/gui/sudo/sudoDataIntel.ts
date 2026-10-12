import { SUDO_JANGDO_GIS_INTEL } from "./sudoGisIntel";
import { getSudoScenarioReference } from "./sudoScenarioReferences";
import type { SudoScenarioSourceDecisionBinding } from "./sudoScenarioSourceBindings";
import {
  formatSudoScenarioImplementationLevel,
  type SudoScenarioSourceStage,
} from "./sudoScenarioSourceData";
import type { SudoScenarioSourceInputPatchSuggestion } from "./sudoScenarioSourceInputPatches";
import {
  formatSudoSourceDisplayLabel,
  summarizeSudoSourceDisplayValues,
} from "./sudoSourceDisplay";
import {
  buildSudoDataExtractionPromptLines,
  buildSudoDataExtractionHealthSummary,
  buildSudoDataExtractionIssueSummary,
  buildSudoDataExtractionRoleSummary,
} from "./sudoDataExtractionIntel";
import {
  getSudoScenarioImageEvidence,
  type SudoScenarioImageEvidence,
} from "./sudoScenarioImageIntel";
import {
  SUDO_DRONE_TARGET_DESCRIPTION_SOURCE_NAME,
  SUDO_DRONE_TARGET_SOURCE_NAME,
  SUDO_DRONE_TARGET_SOURCE_ROWS,
} from "./sudoDroneTargetIntel";
import {
  SUDO_MUNITION_EFFECT_SOURCE_NAME,
  SUDO_MUNITION_EFFECT_SOURCE_PATH,
  SUDO_MUNITION_EFFECT_SOURCE_ROWS,
} from "./sudoMunitionEffectIntel";
import {
  SUDO_FIRE_PLAN_SOURCE_NAME,
  SUDO_FIRE_PLAN_SOURCE_PATH,
  SUDO_FIRE_PLAN_SOURCE_ROWS,
  SUDO_STRIKE_ASSET_SOURCE_ROWS,
  SUDO_STRIKE_METHOD_SOURCE_ROWS,
} from "./sudoFirePlanIntel";
import {
  SUDO_BDA_FIGURE_ID,
  SUDO_BDA_SOURCE_NAME,
  SUDO_BDA_SOURCE_PATH,
} from "./sudoBdaIntel";
import { resolvePublicAssetPath } from "../../utils/publicAssetUrl";

export type SudoDataIntelLinkKind =
  | "document"
  | "gis"
  | "image"
  | "markdown"
  | "video";

export type SudoEnhancementIdeaStatus = "implemented" | "ready" | "next";

export interface SudoDataIntelLink {
  kind: SudoDataIntelLinkKind;
  label: string;
  href: string;
}

export interface SudoDataEnhancementIdea {
  id: string;
  title: string;
  status: SudoEnhancementIdeaStatus;
  scenarioIds: number[];
  basis: string;
}

export interface SudoScenarioDataIntel {
  scenarioId: number;
  sourceRefs: string[];
  sourceFiles: string[];
  dataPoints: string[];
  gisHighlights: string[];
  links: SudoDataIntelLink[];
  enhancementIdeas: SudoDataEnhancementIdea[];
  imageEvidence?: SudoScenarioImageEvidence;
}

type SudoScenarioDataIntelSeed = Omit<
  SudoScenarioDataIntel,
  "enhancementIdeas" | "gisHighlights" | "links"
> & {
  gisHighlights?: string[];
  links?: SudoDataIntelLink[];
};

const sudoAsset = (path: string) =>
  resolvePublicAssetPath(`/sudo_data/${path}`);
const scenarioAsset = (path: string) =>
  sudoAsset(`_extracted/scenario_6_1/${path}`);
const mdSource = (filename: string) => sudoAsset(`md/sources/${filename}.md`);
const slideAsset = (folder: string, slide: number) =>
  sudoAsset(`_extracted/slides/${folder}/슬라이드${slide}.PNG`);

const gis = SUDO_JANGDO_GIS_INTEL;

const COMMON_GIS_HIGHLIGHTS = [
  `NGII/VWorld/MOLIT GIS: 도로 ${gis.roads.toLocaleString()}건, 건물 ${gis.buildings.toLocaleString()}동, HD map ${gis.hdMapFeatures.toLocaleString()}건`,
  `표적 주변 민가 ${gis.nearestCivilianM}m, 250m 내 민가 ${gis.civilianWithin250M}동, 민가 위험 ${gis.civilianRiskLevel}`,
  `지형분석: 산림/차폐 ${gis.forestPercent}%, 개활지 ${gis.openTerrainPercent}%, DEM relief ${gis.demAoiReliefM}m`,
];

const ROAD_GIS_HIGHLIGHTS = [
  `사태분석 도로망: NGII B110 A2_LINK ${gis.situationRoadLinks.toLocaleString()}개 link`,
  `HD map operational context: 표적 1km 내 ${gis.hdMapWithin1000M.toLocaleString()}건, 250m 내 ${gis.hdMapWithin250M.toLocaleString()}건`,
  `최근 HD 객체: ${gis.nearestHdMapFeature.label} ${gis.nearestHdMapFeature.distanceM}m / ${gis.nearestHdMapFeature.routeLabel}`,
];

const SUDO_DRONE_RECHECK_CUES = SUDO_DRONE_TARGET_SOURCE_ROWS.filter(
  (row) => row.status === "재검수"
).map((row) => `${row.sourceFile} ${row.cue}`);

const SUDO_DRONE_TERRAIN_CUE_COUNT = SUDO_DRONE_TARGET_SOURCE_ROWS.filter(
  (row) => row.sourceFile === "1-2 장도훈련장 사진.show"
).length;

const SUDO_MUNITION_RANGE_BANDS = Array.from(
  new Set(SUDO_MUNITION_EFFECT_SOURCE_ROWS.map((row) => row.rangeBand))
).join("/");

const SUDO_MUNITION_HEBB_ROW_COUNT = SUDO_MUNITION_EFFECT_SOURCE_ROWS.filter(
  (row) => Object.values(row.effectCells).some((cell) => cell.includes("HEBB"))
).length;

const SUDO_MUNITION_CURRENT_TERRAIN_CLASS =
  gis.forestPercent >= gis.openTerrainPercent ? "covered" : "open";

const SUDO_MUNITION_CURRENT_TERRAIN_LABEL =
  SUDO_MUNITION_CURRENT_TERRAIN_CLASS === "covered" ? "산림/도심" : "개활지";

const SUDO_MUNITION_CURRENT_FIRE_UNIT = "대대";

const SUDO_MUNITION_CURRENT_EFFECT =
  SUDO_MUNITION_EFFECT_SOURCE_ROWS.find(
    (row) =>
      row.rangeBand === "0~6km" &&
      row.terrainClass === SUDO_MUNITION_CURRENT_TERRAIN_CLASS &&
      row.fireUnit === SUDO_MUNITION_CURRENT_FIRE_UNIT
  )?.effectCells[30] ?? "HE ③";

const SUDO_PRIMARY_STRIKE_ASSET = SUDO_STRIKE_ASSET_SOURCE_ROWS[0];
const SUDO_PRIMARY_STRIKE_METHOD = SUDO_STRIKE_METHOD_SOURCE_ROWS[0];
const SUDO_PRIMARY_FIRE_PLAN_ROW = SUDO_FIRE_PLAN_SOURCE_ROWS[1];

export const SUDO_DATA_ENHANCEMENT_IDEAS: SudoDataEnhancementIdea[] = [
  {
    id: "scenario-source-intel",
    title: "시나리오별 원자료 인텔 패널",
    status: "implemented",
    scenarioIds: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14],
    basis: "senario.pdf 구조화 JSON, md/sources, 추출 page/figure",
  },
  {
    id: "gis-risk-summary",
    title: "GIS 민가/도로 위험요약",
    status: "implemented",
    scenarioIds: [5, 7, 8, 9, 10, 11, 12, 14],
    basis:
      "jangdo-gis-summary.json, road-summary.json, offline-map/jangdo intel",
  },
  {
    id: "media-reference-switcher",
    title: "영상·슬라이드 근거 바로 열기",
    status: "implemented",
    scenarioIds: [1, 2, 3, 5, 6, 7, 8, 9, 13, 14],
    basis: "converted MP4, extracted slides, scenario page renders",
  },
  {
    id: "scenario-media-asset-registry",
    title: "S1/S2 원본-변환본 자산 레지스트리",
    status: "implemented",
    scenarioIds: [1, 2],
    basis:
      "S1 1-1/1-2 cue별 playbackPath, S2 2-1~7 브라우저 재생/문서근거/부분추출 상태",
  },
  {
    id: "scale-source-priority-panel",
    title: "S3 원본 대열 이미지-기준표 우선 패널",
    status: "implemented",
    scenarioIds: [3],
    basis:
      "3-1 부대별 행군장경 data 슬라이드 이미지와 선택 기준행, 행군장경을 규모판단 우측 근거 상단에 고정 표시",
  },
  {
    id: "order-map-source-rank-link",
    title: "S4 지도 마커-원본 후보순위 매칭",
    status: "implemented",
    scenarioIds: [4],
    basis:
      "4-1 전투서열 후보 원본표의 판정순위와 지도 마커 번호를 매칭하고 선택 마커에 보유장비 팝업으로 연결",
  },
  {
    id: "firing-unit-source-matrix-highlight",
    title: "S8 후보 선택-source matrix 하이라이트",
    status: "implemented",
    scenarioIds: [8],
    basis: "8-1 원본 평가표에서 AI 추천행과 운용자 현재 검토행을 동시에 표시",
  },
  {
    id: "redeployment-source-destination-labels",
    title: "S10 재배치 목적지-원문 매칭 라벨",
    status: "implemented",
    scenarioIds: [10],
    basis:
      "9-1 GPT 응답 원문과 TAI/NAI 목적지 카드에 원문매칭 라벨과 source sentence 표시",
  },
  {
    id: "strike-source-timeline-link",
    title: "S11 원본 가용시간표-H시 매칭",
    status: "implemented",
    scenarioIds: [11],
    basis:
      "senario.pdf page 06 가용자산 원본시간표와 최적 타격방법 원본근거를 H시 11:00 시간축 요약으로 연결",
  },
  {
    id: "fire-plan-source-lane-link",
    title: "S12 원본 화력운용 레인 매칭",
    status: "implemented",
    scenarioIds: [12],
    basis:
      "통합화력운용도표 원본근거 5행을 H-10~H+30 도표 레인 요약과 source row 속성으로 연결",
  },
  {
    id: "rd-assessment-hover-source-detail",
    title: "S13 R/D 체크리스트 hover 원문근거",
    status: "implemented",
    scenarioIds: [13],
    basis:
      "13-1 실존ㆍ허상표적 판단표의 실존/허상 기준, 평가책임, 출처를 각 판단 카드에 hover/focus 근거로 연결",
  },
  {
    id: "bda-input-observation-evidence-rail",
    title: "S14 입력 DATA-관측 프레임 근거 레일",
    status: "implemented",
    scenarioIds: [14],
    basis:
      "senario.pdf page 06 타격결과 figure와 DRONE-10 재관측 frame_02_37을 BDA 입력 영상/관측 프레임으로 병렬 표시",
  },
  {
    id: "assistant-source-context",
    title: "Army GPT 원자료 문맥 보강",
    status: "implemented",
    scenarioIds: [2, 6, 9, 10, 13],
    basis: "sudo_data source refs, 판단근거, GIS 요약",
  },
  {
    id: "runtime-json-source-loader",
    title: "structured_scenario_6_1.json 런타임 로더",
    status: "implemented",
    scenarioIds: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13],
    basis: "public JSON을 직접 fetch해 자료 갱신을 코드 배포와 분리",
  },
  {
    id: "decision-binding-trace",
    title: "원자료 액션-판단입력 계산연결 추적",
    status: "implemented",
    scenarioIds: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14],
    basis: "structured_scenario_6_1.json codeAction + operational-data inputs",
  },
  {
    id: "source-derived-decision-inputs",
    title: "원자료 액션 기반 판단엔진 입력 패치 제안",
    status: "implemented",
    scenarioIds: [3, 4, 5, 7, 8, 9, 11, 12, 13, 14],
    basis:
      "structured_scenario_6_1.json codeAction + md/sources 판단표 + 운영자 수동 적용",
  },
  {
    id: "source-stage-fallback-manifest",
    title: "원자료 단계 정적 대체 매니페스트",
    status: "implemented",
    scenarioIds: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14],
    basis:
      "structured_scenario_6_1.json 로딩 전/실패 시에도 원자료 요구사항·제공자료·codeAction 유지",
  },
  {
    id: "source-trace-export",
    title: "FTX/시나리오 export 원자료 추적",
    status: "implemented",
    scenarioIds: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14],
    basis:
      "FTX JSON/CSV/Markdown, 시나리오 CSV/운용 JSON/판정 복사에 sourceRefs/sourceFiles/bindings/patch 상태 포함",
  },
  {
    id: "source-extraction-health",
    title: "sudo_data 추출/OCR 상태 추적",
    status: "implemented",
    scenarioIds: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14],
    basis:
      "extraction_metadata.json, ocr_manifest.json, ocr_results.json, presentation_export_status.json 요약",
  },
  {
    id: "source-image-evidence-catalog",
    title: "PDF page/figure 이미지 근거 카탈로그",
    status: "implemented",
    scenarioIds: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14],
    basis:
      "md/시나리오_6.1_이미지_카탈로그.md, scenario_6_1/pages, scenario_6_1/figures",
  },
];

const SUDO_DATA_ENHANCEMENT_IDEA_SUMMARY_PRIORITY = new Map(
  [
    "source-stage-fallback-manifest",
    "runtime-json-source-loader",
    "decision-binding-trace",
    "scale-source-priority-panel",
    "bda-input-observation-evidence-rail",
    "order-map-source-rank-link",
    "strike-source-timeline-link",
    "fire-plan-source-lane-link",
    "source-derived-decision-inputs",
    "scenario-media-asset-registry",
    "firing-unit-source-matrix-highlight",
    "redeployment-source-destination-labels",
    "rd-assessment-hover-source-detail",
    "source-trace-export",
    "source-extraction-health",
    "source-image-evidence-catalog",
    "assistant-source-context",
    "gis-risk-summary",
    "media-reference-switcher",
    "scenario-source-intel",
  ].map((id, index) => [id, index])
);

const HIDDEN_DATA_INTEL_EXPORT_IDEA_IDS = new Set([
  "source-image-evidence-catalog",
]);

export function getCoreSudoDataEnhancementIdeas(
  ideas: readonly SudoDataEnhancementIdea[]
) {
  return ideas.filter(
    (idea) => !HIDDEN_DATA_INTEL_EXPORT_IDEA_IDS.has(idea.id)
  );
}

export function sortSudoDataEnhancementIdeas<
  T extends Pick<SudoDataEnhancementIdea, "id" | "title">,
>(ideas: readonly T[]) {
  return [...ideas].sort((a, b) => {
    const aPriority =
      SUDO_DATA_ENHANCEMENT_IDEA_SUMMARY_PRIORITY.get(a.id) ?? 99;
    const bPriority =
      SUDO_DATA_ENHANCEMENT_IDEA_SUMMARY_PRIORITY.get(b.id) ?? 99;

    if (aPriority !== bPriority) {
      return aPriority - bPriority;
    }

    return a.title.localeCompare(b.title, "ko");
  });
}

const SUDO_SCENARIO_DATA_INTEL: Record<number, SudoScenarioDataIntelSeed> = {
  1: {
    scenarioId: 1,
    sourceRefs: ["1-1", "1-1설명자료", "1-2", "senario.pdf #1"],
    sourceFiles: [
      SUDO_DRONE_TARGET_SOURCE_NAME,
      SUDO_DRONE_TARGET_DESCRIPTION_SOURCE_NAME,
      "1-2 장도훈련장 사진.show",
      "senario.pdf page 01",
    ],
    dataPoints: [
      `원본 cue ${SUDO_DRONE_TARGET_SOURCE_ROWS.length}건: 영상/설명자료/1-2 MilMap/원자료 요구사항 연결`,
      `재검수 cue ${SUDO_DRONE_RECHECK_CUES.join(", ")}: 현재 추출 MP4 03:30보다 길어 원문 시간축 확인 필요`,
      `1-2 MilMap 지형 cue ${SUDO_DRONE_TERRAIN_CUE_COUNT}건: 52SBG8864858245 / 52SBG9078159874`,
      "표적좌표 BH 12345 67890 / 드론좌표 BH 12321 56789",
      "senario.pdf page 01 H~H+5': 알림창, 지형DB, 드론자세/위치/고도/감시좌표 전시",
    ],
    links: [
      {
        kind: "video",
        label: "1-1 실제 기동 영상",
        href: sudoAsset(
          "1-1 장도훈련장 기동(연결프로그램 사진으로 재생)/1-1 장도훈련장 기동(1).mp4"
        ),
      },
      {
        kind: "markdown",
        label: "1-1 설명자료",
        href: mdSource("1-1설명자료"),
      },
      {
        kind: "markdown",
        label: "1-2 장도훈련장 사진",
        href: mdSource("1-2 장도훈련장 사진"),
      },
    ],
  },
  2: {
    scenarioId: 2,
    sourceRefs: ["2-1~3", "2-4~5", "2-6~7", "senario.pdf #2"],
    sourceFiles: [
      "2-5 객체인식 변환 MP4",
      "2-6 천무 참고자료",
      "2-7 천무 교육자료",
    ],
    dataPoints: [
      "240mm 방사포(M-1991) 99.8%",
      "전폭/전장, 22연장 발사관, ROMAN 차대, 운전석/후미 형상",
      "M-1989 후보 0.2%와 비교 판정",
    ],
    links: [
      {
        kind: "video",
        label: "2-5 객체인식 영상",
        href: sudoAsset("converted/2-5-object-recognition.mp4"),
      },
      {
        kind: "image",
        label: "천무 교육자료 제원",
        href: slideAsset("2-7 천무 교육자료", 5),
      },
      {
        kind: "markdown",
        label: "2-6 천무 참고자료",
        href: mdSource("2-6 천무 참고자료"),
      },
    ],
  },
  3: {
    scenarioId: 3,
    sourceRefs: ["3-1", "1-1", "senario.pdf #3"],
    sourceFiles: ["3-1 부대별 행군장경 data", "1-1 장도훈련장 기동 영상"],
    dataPoints: [
      "프레임 bbox 3건과 행군장경 약 350m",
      "240mm 방사포 중대/대대, 전차중대, 고사포중대, 견인포중대 기준",
      "3-1 원본 대열 이미지와 선택 기준행을 규모판단 우측 근거 상단에 고정 표시",
      "대수와 행군장경 중 더 큰 규모를 종합 판정",
    ],
    links: [
      {
        kind: "image",
        label: "3-1 행군장경 기준표",
        href: slideAsset("3-1 부대별 행군장경 data", 1),
      },
      {
        kind: "markdown",
        label: "3-1 추출 텍스트",
        href: mdSource("3-1 부대별 행군장경 data"),
      },
    ],
  },
  4: {
    scenarioId: 4,
    sourceRefs: ["4-1", "senario.pdf #4"],
    sourceFiles: ["4-1 훈련장 인근부대 위치, 보유 장비 등"],
    dataPoints: [
      "표적좌표와 최기부대 BH 좌표 이격거리 비교",
      "1사단 1대대 2중대 240mm 방사포 106m 후보",
      "근접 152mm 후보는 표적성질 불일치로 후순위",
      "지도 마커 번호와 4-1 원본 후보표 판정순위를 매칭하고 선택 마커에 보유장비 팝업 표시",
    ],
    links: [
      {
        kind: "image",
        label: "4-1 인근부대 표",
        href: slideAsset("4-1 훈련장 인근부대 위치， 보유 장비 등", 1),
      },
      {
        kind: "markdown",
        label: "4-1 추출 텍스트",
        href: mdSource("4-1 훈련장 인근부대 위치， 보유 장비 등"),
      },
    ],
  },
  5: {
    scenarioId: 5,
    sourceRefs: ["5-1", "GIS", "senario.pdf #5"],
    sourceFiles: ["5-1 탄종별 부수적 효과반경", "jangdo-gis-summary.json"],
    dataPoints: [
      "HEBB 사격가능 / DPBB 민가지역 피해 가능성 제한",
      "17~22km 거리별 HE, HEBB, DPICM, DPBB 효과반경",
      `표적 주변 최근 민가 ${gis.nearestCivilianM}m`,
    ],
    gisHighlights: COMMON_GIS_HIGHLIGHTS,
    links: [
      {
        kind: "image",
        label: "5-1 CDE 표",
        href: slideAsset("5-1 탄종별 부수적 효과반경", 1),
      },
      {
        kind: "gis",
        label: "GIS summary",
        href: sudoAsset("gis/processed/jangdo-gis-summary.json"),
      },
    ],
  },
  6: {
    scenarioId: 6,
    sourceRefs: ["6-1", "senario.pdf #6"],
    sourceFiles: ["6-1 240mm 및 152mm 취약점"],
    dataPoints: [
      "발사 위치 노출, 재장전 시간, 기동성, 정밀도 한계",
      "탄약·물류 부담, 드론 취약성, 기상 영향, 기타 취약 요소",
      "240mm 방사포와 152mm 자주포 취약점 질의응답 근거",
    ],
    links: [
      {
        kind: "image",
        label: "6-1 취약점 슬라이드",
        href: slideAsset("6-1 240mm 및 152mm 취약점", 1),
      },
      {
        kind: "markdown",
        label: "6-1 추출 텍스트",
        href: mdSource("6-1 240mm 및 152mm 취약점"),
      },
    ],
  },
  7: {
    scenarioId: 7,
    sourceRefs: ["7-1~2", "GIS", "senario.pdf #7"],
    sourceFiles: [
      SUDO_MUNITION_EFFECT_SOURCE_NAME,
      `7-1~2 원본 매트릭스 ${SUDO_MUNITION_EFFECT_SOURCE_ROWS.length}행`,
      "terrain-core.geojson",
    ],
    dataPoints: [
      `${SUDO_MUNITION_RANGE_BANDS} x 개활지/산림·도심 x 포대/대대 원본 매트릭스 ${SUDO_MUNITION_EFFECT_SOURCE_ROWS.length}행`,
      `현재 표적 122/240mm 방사포, 0~6km, ${SUDO_MUNITION_CURRENT_TERRAIN_LABEL} ${gis.forestPercent}/${gis.openTerrainPercent}, 요망효과 30% -> ${SUDO_MUNITION_CURRENT_EFFECT} ${SUDO_MUNITION_CURRENT_FIRE_UNIT} 1발 / 100포병대대 HE탄 3R`,
      `18~40km 원거리 ${SUDO_MUNITION_HEBB_ROW_COUNT}행은 HEBB로 분리해 단거리 HE 판단과 혼선 방지`,
      `원본 경로 ${SUDO_MUNITION_EFFECT_SOURCE_PATH}`,
    ],
    gisHighlights: COMMON_GIS_HIGHLIGHTS,
    links: [
      {
        kind: "markdown",
        label: "7-1~2 추출 텍스트",
        href: mdSource("7-1~2 지형DB， 탄종 및 발수 판단 자료"),
      },
      {
        kind: "gis",
        label: "Terrain core",
        href: resolvePublicAssetPath(
          "/offline-map/jangdo/intel/terrain-core.geojson"
        ),
      },
    ],
  },
  8: {
    scenarioId: 8,
    sourceRefs: ["8-1", "GIS", "senario.pdf #8"],
    sourceFiles: ["8-1 최적의 사격부대 선정 판단 자료"],
    dataPoints: [
      "후보부대 5개 항목 평가: 사거리, 생존성, 탄, 민간피해, 전투력",
      "100포병대대(K105A1) 6km 사격 가능, HE 100R",
      "유개호 포상 생존성, 민간피해 없음",
    ],
    gisHighlights: COMMON_GIS_HIGHLIGHTS.slice(1),
    links: [
      {
        kind: "markdown",
        label: "8-1 추출 텍스트",
        href: mdSource("8-1 최적의 사격부대 선정 판단 자료"),
      },
    ],
  },
  9: {
    scenarioId: 9,
    sourceRefs: ["9-1", "NGII B110", "senario.pdf #9"],
    sourceFiles: [
      "9-1 사태분석도 및 도로정보",
      "ngii-a2-link-roads.geojson",
      "road-summary.json",
    ],
    dataPoints: [
      "예상 이동로: 3번 도로[70%]",
      "1번 도로 10%, 3번 도로 70%, 5번 도로 20%",
      "감시 2 · 결심 2 · 타격 2 판단",
    ],
    gisHighlights: ROAD_GIS_HIGHLIGHTS,
    links: [
      {
        kind: "image",
        label: "9-1 사태분석도",
        href: slideAsset("9-1 사태분석도 및 도로정보", 1),
      },
      {
        kind: "gis",
        label: "도로 요약 JSON",
        href: sudoAsset("gis/processed/situation-analysis/road-summary.json"),
      },
    ],
  },
  10: {
    scenarioId: 10,
    sourceRefs: ["9-1", "senario.pdf #10"],
    sourceFiles: ["9-1 사태분석도 및 도로정보", "droneRedeploymentOrders"],
    dataPoints: [
      "1번 드론 TAI #3 쑥고개",
      "2번 드론 NAI #4 말고개",
      "3번 드론 TAI #4 당동리",
    ],
    gisHighlights: ROAD_GIS_HIGHLIGHTS,
    links: [
      {
        kind: "gis",
        label: "도로 GeoJSON",
        href: sudoAsset(
          "gis/processed/situation-analysis/ngii-a2-link-roads.geojson"
        ),
      },
    ],
  },
  11: {
    scenarioId: 11,
    sourceRefs: ["senario.pdf #11", "page 06 OCR"],
    sourceFiles: [
      SUDO_FIRE_PLAN_SOURCE_NAME,
      "PDF 원본 작성중 - 앱 보강 DATA",
      `가용자산 원본시간표 ${SUDO_STRIKE_ASSET_SOURCE_ROWS.length}행`,
      `최적 타격방법 원본근거 ${SUDO_STRIKE_METHOD_SOURCE_ROWS.length}행`,
    ],
    dataPoints: [
      "PDF 원본 작성중 기준, 시연용 보강 DATA로 산출",
      `${SUDO_PRIMARY_STRIKE_ASSET.asset} ${SUDO_PRIMARY_STRIKE_ASSET.availableFrom}~${SUDO_PRIMARY_STRIKE_ASSET.availableTo}, CAS(2차) 14:00~15:00`,
      "육군항공 12:00 이후, 포병 24시간",
      `${SUDO_PRIMARY_STRIKE_METHOD.rank} ${SUDO_PRIMARY_STRIKE_METHOD.method}, ${SUDO_PRIMARY_STRIKE_METHOD.tai}, H시 ${SUDO_PRIMARY_STRIKE_METHOD.hTime}, ${SUDO_PRIMARY_STRIKE_METHOD.dp}`,
      "원본 가용시간표와 최적 타격방법 원문근거를 H시 11:00 시간축 요약으로 연결",
    ],
    gisHighlights: ROAD_GIS_HIGHLIGHTS.slice(0, 1),
    links: [
      {
        kind: "markdown",
        label: "senario.pdf OCR",
        href: mdSource("senario"),
      },
    ],
  },
  12: {
    scenarioId: 12,
    sourceRefs: ["senario.pdf #12", "page 06 OCR"],
    sourceFiles: [
      SUDO_FIRE_PLAN_SOURCE_NAME,
      "PDF 원본 작성중 - 앱 보강 DATA",
      `통합화력운용도표 원본근거 ${SUDO_FIRE_PLAN_SOURCE_ROWS.length}행`,
      "scenario_6_1 page_06",
    ],
    dataPoints: [
      "PDF 원본 작성중 기준, 시연용 보강 DATA로 산출",
      `통합화력운용 H시 ${SUDO_PRIMARY_STRIKE_METHOD.hTime}`,
      `${SUDO_FIRE_PLAN_SOURCE_ROWS[0].time}~${SUDO_FIRE_PLAN_SOURCE_ROWS[2].time} 포함, ${SUDO_FIRE_PLAN_SOURCE_ROWS.length}개 화력운용 행`,
      `${SUDO_PRIMARY_FIRE_PLAN_ROW.asset}: ${SUDO_PRIMARY_FIRE_PLAN_ROW.action} / ${SUDO_PRIMARY_FIRE_PLAN_ROW.effect}`,
      "통합화력운용도표 원본근거 5행을 H-10~H+30 레인 요약으로 연결",
      "NAI, DP, TAI와 타격자산 배치",
    ],
    links: [
      {
        kind: "image",
        label: "통합화력운용도표 figure",
        href: scenarioAsset("figures/page_06_figure_08_xref_152.png"),
      },
    ],
  },
  13: {
    scenarioId: 13,
    sourceRefs: ["ARTAS", "artas program.pdf"],
    sourceFiles: ["artas program.pdf", "ARTAS 대포병탐지 R/D 표적탐지 분석"],
    dataPoints: [
      "AA001 / TPQ-74K 1반 기술적 판단: 허상표적 78%",
      "탄도곡선 끊김, 레이더 예상정확도 300m 초과, 추적횟수 7회",
      "섬광·폭음 없음, MASINT 없음, TOD 영상복귀 없음",
      "종합 허상표적 99%",
    ],
    links: [
      {
        kind: "markdown",
        label: "artas program.pdf 근거",
        href: mdSource("artas program"),
      },
      {
        kind: "markdown",
        label: "ARTAS 표적탐지 분석",
        href: mdSource("artas program"),
      },
    ],
  },
  14: {
    scenarioId: 14,
    sourceRefs: ["dan_level_Senario.pdf #13", "BDA 입력", "page 06 figure"],
    sourceFiles: [
      SUDO_BDA_SOURCE_NAME,
      `타격결과 평가 figure ${SUDO_BDA_FIGURE_ID}`,
      SUDO_BDA_SOURCE_PATH,
    ],
    dataPoints: [
      "최초 설정한 요망효과는 30%",
      "전차 1대 완파, 병력 5명 식별",
      "현재 요망효과 미달성으로 재타격 필요",
      "page_06_figure_10_xref_154와 DRONE-10 frame_02_37을 입력 DATA/관측 프레임 근거로 병렬 표시",
      "DRONE-10 재관측과 AI 영상판독 결과를 BDA 입력으로 연결",
    ],
    gisHighlights: COMMON_GIS_HIGHLIGHTS.slice(0, 2),
    links: [
      {
        kind: "image",
        label: "타격결과 평가 figure",
        href: scenarioAsset("figures/page_06_figure_10_xref_154.png"),
      },
      {
        kind: "image",
        label: "DRONE-10 BDA 관측 프레임",
        href: sudoAsset(
          "_extracted/assets/1-1 장도훈련장 기동(1)/video_frames/frame_02_37.png"
        ),
      },
    ],
  },
};

function uniqueByHref(links: SudoDataIntelLink[]) {
  const seen = new Set<string>();
  return links.filter((link) => {
    const key = `${link.kind}:${link.href}:${link.label}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

export function getSudoScenarioEnhancementIdeas(scenarioId: number) {
  return SUDO_DATA_ENHANCEMENT_IDEAS.filter((idea) =>
    idea.scenarioIds.includes(scenarioId)
  );
}

export function getSudoDataEnhancementIdeaStatusLabel(
  status: SudoEnhancementIdeaStatus
) {
  if (status === "implemented") {
    return "반영";
  }

  if (status === "ready") {
    return "준비";
  }

  return "다음";
}

export function formatSudoDataEnhancementIdea(idea: SudoDataEnhancementIdea) {
  return `${getSudoDataEnhancementIdeaStatusLabel(idea.status)} · ${idea.title}`;
}

export function buildSudoDataEnhancementIdeaSummary(
  ideas: readonly SudoDataEnhancementIdea[],
  limit = 5
) {
  const sortedIdeas = sortSudoDataEnhancementIdeas(ideas);
  const visible = sortedIdeas
    .slice(0, limit)
    .map(formatSudoDataEnhancementIdea);
  const hidden = sortedIdeas.length - visible.length;
  return [...visible, ...(hidden > 0 ? [`+${hidden}건`] : [])].join(" | ");
}

export function getSudoScenarioDataIntel(
  scenarioId: number
): SudoScenarioDataIntel {
  const reference = getSudoScenarioReference(scenarioId);
  const imageEvidence = getSudoScenarioImageEvidence(scenarioId);
  const seed = SUDO_SCENARIO_DATA_INTEL[scenarioId] ?? {
    scenarioId,
    sourceRefs: [`senario.pdf #${scenarioId}`],
    sourceFiles: ["senario.pdf"],
    dataPoints: reference?.bullets ?? [],
  };
  const referenceLinks: SudoDataIntelLink[] =
    reference?.images.map((image) => ({
      kind: "image",
      label: image.label,
      href: image.src,
    })) ?? [];

  return {
    scenarioId,
    sourceRefs: seed.sourceRefs,
    sourceFiles: seed.sourceFiles,
    dataPoints: seed.dataPoints,
    gisHighlights: seed.gisHighlights ?? [],
    links: uniqueByHref([...(seed.links ?? []), ...referenceLinks]),
    enhancementIdeas: getSudoScenarioEnhancementIdeas(scenarioId),
    imageEvidence,
  };
}

export function buildSudoScenarioDataIntelPromptLines(scenarioId: number) {
  const intel = getSudoScenarioDataIntel(scenarioId);
  return [
    "sudo_data 원자료 연결:",
    `- 제공자료: ${summarizeSudoSourceDisplayValues(intel.sourceRefs, 99, ", ")}`,
    `- 실제 파일: ${summarizeSudoSourceDisplayValues(intel.sourceFiles, 4)}`,
    ...intel.dataPoints
      .slice(0, 5)
      .map((point) => `- 판단근거: ${formatSudoSourceDisplayLabel(point)}`),
    ...intel.gisHighlights
      .slice(0, 2)
      .map((point) => `- GIS: ${formatSudoSourceDisplayLabel(point)}`),
    ...buildSudoDataExtractionPromptLines(),
    `- 고도화: ${buildSudoDataEnhancementIdeaSummary(
      getCoreSudoDataEnhancementIdeas(intel.enhancementIdeas),
      4
    )}`,
  ];
}

export function buildSudoScenarioDataIntelCopyText(
  intel: SudoScenarioDataIntel,
  sourceStage?: SudoScenarioSourceStage,
  decisionBindings: SudoScenarioSourceDecisionBinding[] = [],
  inputPatchSuggestions: SudoScenarioSourceInputPatchSuggestion[] = []
) {
  const sourceStageImplementationLevel = formatSudoScenarioImplementationLevel(
    sourceStage?.implementationLevel
  );

  return [
    `SUDO scenario ${intel.scenarioId} sudo_data intel`,
    `source-refs: ${summarizeSudoSourceDisplayValues(intel.sourceRefs, 99, ", ")}`,
    `source-files: ${summarizeSudoSourceDisplayValues(intel.sourceFiles, 99)}`,
    "",
    "## Data Points",
    ...intel.dataPoints.map(
      (point) => `- ${formatSudoSourceDisplayLabel(point)}`
    ),
    "",
    "## GIS Highlights",
    ...(intel.gisHighlights.length > 0
      ? intel.gisHighlights.map(
          (point) => `- ${formatSudoSourceDisplayLabel(point)}`
        )
      : ["- GIS 연결 없음"]),
    "",
    "## Source Stage",
    ...(sourceStage
      ? [
          `- stage: ${sourceStage.id}. ${sourceStage.title}`,
          sourceStage.timeBand ? `- time-band: ${sourceStage.timeBand}` : "",
          sourceStageImplementationLevel
            ? `- implementation-level: ${sourceStageImplementationLevel}`
            : "",
          ...sourceStage.requirements.map(
            (requirement) => `- requirement: ${requirement}`
          ),
          sourceStage.codeAction
            ? `- code-action: ${formatSudoSourceDisplayLabel(sourceStage.codeAction)}`
            : "",
        ].filter(Boolean)
      : ["- structured_scenario_6_1.json 아직 로드되지 않음"]),
    "",
    "## Decision Bindings",
    ...(decisionBindings.length > 0
      ? decisionBindings.map(
          (binding) =>
            `- [${binding.status}] ${binding.label}: ${binding.detail} (${formatSudoSourceDisplayLabel(binding.basis)})`
        )
      : ["- 계산 연결 추적 없음"]),
    "",
    "## Source Input Patches",
    ...(inputPatchSuggestions.length > 0
      ? inputPatchSuggestions.map(
          (suggestion) =>
            `- [${suggestion.status}] ${suggestion.field}: ${suggestion.currentValue} -> ${suggestion.recommendedValue} (${formatSudoSourceDisplayLabel(suggestion.basis)})`
        )
      : ["- 원자료 입력 패치 제안 없음"]),
    "",
    "## Extraction Health",
    `- summary: ${buildSudoDataExtractionHealthSummary()}`,
    `- roles: ${buildSudoDataExtractionRoleSummary()}`,
    `- issues: ${buildSudoDataExtractionIssueSummary()}`,
    "",
    "## Enhancement Ideas",
    ...(getCoreSudoDataEnhancementIdeas(intel.enhancementIdeas).length > 0
      ? sortSudoDataEnhancementIdeas(
          getCoreSudoDataEnhancementIdeas(intel.enhancementIdeas)
        ).map(
          (idea) =>
            `- [${idea.status}] ${idea.id}: ${formatSudoDataEnhancementIdea(idea)}: ${formatSudoSourceDisplayLabel(idea.basis)}`
        )
      : ["- 고도화 아이디어 없음"]),
    "",
    "## Links",
    ...intel.links.map(
      (link) =>
        `- [${link.kind}] ${formatSudoSourceDisplayLabel(link.label)}: ${link.href}`
    ),
  ].join("\n");
}
