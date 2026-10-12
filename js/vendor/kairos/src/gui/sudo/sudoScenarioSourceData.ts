import {
  SUDO_FIRE_PLAN_SOURCE_NAME,
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

export const DEFAULT_SUDO_SCENARIO_SOURCE_DATA_URL =
  "/sudo_data/_extracted/scenario_6_1/structured_scenario_6_1.json";

export interface SudoScenarioSourceAssetUse {
  main?: string;
  sub?: string;
}

export interface SudoScenarioSourceStage {
  id: number;
  title: string;
  page?: number;
  timeBand?: string;
  combatLayer?: string;
  implementationLevel?: string;
  requirements: string[];
  sourceRefs: string[];
  sourceFiles: string[];
  assetUse?: SudoScenarioSourceAssetUse;
  codeAction?: string;
}

export interface SudoScenarioSourceData {
  schemaVersion?: string;
  source?: string;
  sourceStatus?: string;
  generatedAssets?: Record<string, string>;
  notes: string[];
  stages: SudoScenarioSourceStage[];
}

export interface SudoScenarioSourceDataLoadResult {
  document: SudoScenarioSourceData;
  url: string;
  loadedAt: string;
}

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function asString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function asNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  return undefined;
}

function asStringArray(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => asString(item))
    .filter((item): item is string => Boolean(item));
}

function normalizeGeneratedAssets(value: unknown) {
  if (!isRecord(value)) {
    return undefined;
  }

  const entries = Object.entries(value)
    .map(([key, item]) => [key, asString(item)] as const)
    .filter((entry): entry is readonly [string, string] => Boolean(entry[1]));
  return entries.length > 0 ? Object.fromEntries(entries) : undefined;
}

function normalizeAssetUse(
  value: unknown
): SudoScenarioSourceAssetUse | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  const assetUse: SudoScenarioSourceAssetUse = {
    main: asString(value.main),
    sub: asString(value.sub),
  };

  return assetUse.main || assetUse.sub ? assetUse : undefined;
}

export function normalizeSudoScenarioSourceStage(
  value: unknown
): SudoScenarioSourceStage | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  const id = asNumber(value.id);
  const title = asString(value.title);
  if (!id || !title) {
    return undefined;
  }

  return {
    id,
    title,
    page: asNumber(value.page),
    timeBand: asString(value.timeBand),
    combatLayer: asString(value.combatLayer),
    implementationLevel: asString(value.implementationLevel),
    requirements: asStringArray(value.requirements),
    sourceRefs: asStringArray(value.sourceRefs),
    sourceFiles: asStringArray(value.sourceFiles),
    assetUse: normalizeAssetUse(value.assetUse),
    codeAction: asString(value.codeAction),
  };
}

export function normalizeSudoScenarioSourceData(
  value: unknown
): SudoScenarioSourceData {
  if (!isRecord(value)) {
    throw new Error("SUDO 시나리오 원자료 JSON 형식이 아닙니다.");
  }

  const stages = Array.isArray(value.stages)
    ? value.stages
        .map((stage) => normalizeSudoScenarioSourceStage(stage))
        .filter(
          (stage): stage is SudoScenarioSourceStage => stage !== undefined
        )
    : [];

  if (stages.length === 0) {
    throw new Error("SUDO 시나리오 원자료 단계가 없습니다.");
  }

  return {
    schemaVersion: asString(value.schemaVersion),
    source: asString(value.source),
    sourceStatus: asString(value.sourceStatus),
    generatedAssets: normalizeGeneratedAssets(value.generatedAssets),
    notes: asStringArray(value.notes),
    stages,
  };
}

export function getSudoScenarioSourceDataUrl() {
  return resolvePublicAssetPath(DEFAULT_SUDO_SCENARIO_SOURCE_DATA_URL);
}

export async function loadSudoScenarioSourceData(
  url = getSudoScenarioSourceDataUrl(),
  fetchImpl: typeof fetch = fetch
): Promise<SudoScenarioSourceDataLoadResult> {
  const response = await fetchImpl(url, {
    headers: { Accept: "application/json" },
  });
  if (!response.ok) {
    throw new Error(`SUDO 시나리오 원자료 요청 실패: HTTP ${response.status}`);
  }

  const payload = await response.json();
  return {
    document: normalizeSudoScenarioSourceData(payload),
    url,
    loadedAt: new Date().toISOString(),
  };
}

export function findSudoScenarioSourceStage(
  document: SudoScenarioSourceData,
  scenarioId: number
) {
  return document.stages.find((stage) => stage.id === scenarioId);
}

const SUDO_SCENARIO_SOURCE_STAGE_FALLBACKS: Record<
  number,
  SudoScenarioSourceStage
> = {
  1: {
    id: 1,
    title: "드론 표적 식별",
    page: 1,
    timeBand: "H~H+5'",
    combatLayer: "근접 화력 전투",
    implementationLevel: "필수 구현",
    requirements: [
      "드론이 표적식별 시 알림창 전시",
      "지형DB(장도훈련장) 전시",
      "드론운용 현황 가시화: 드론자세, 위치, 고도, 감시좌표",
    ],
    sourceRefs: ["1-1", "1-2"],
    sourceFiles: [
      "1-1 장도훈련장 기동(연결프로그램 사진으로 재생)",
      "1-1설명자료.hwp",
      "1-2 장도훈련장 사진.show",
    ],
    assetUse: {
      main: "충의 AI 표적식별 알림, 드론 좌표/표적좌표, 지형DB",
      sub: "장도훈련장 촬영 영상/사진 및 지형DB",
    },
    codeAction:
      "scenario 1의 미디어를 실제 1-1 영상/1-2 슬라이드로 교체하고 드론운용 현황값을 원자료 기준으로 맞춘다.",
  },
  2: {
    id: 2,
    title: "표적성질 식별",
    page: 1,
    timeBand: "H+5'~H+10'",
    combatLayer: "근접 화력 전투",
    implementationLevel: "필수 구현",
    requirements: [
      "객체인식을 통한 표적성질 식별",
      "객체인식 분석과정 가시화",
      "표적성질 판단근거 나열/판정",
    ],
    sourceRefs: ["2-1~3", "2-4~5", "2-6~7"],
    sourceFiles: [
      "2-1~3 천무영상",
      "2-4 천무형상 및 사진자료.show",
      "2-5 객체인식(연결프로그램 사진으로 재생) .wmv",
      "2-6 천무 참고자료.pdf",
      "2-7 천무 교육자료.pptx",
    ],
    assetUse: {
      main: "240mm 방사포(M-1991) 판단 근거와 신뢰도",
      sub: "객체인식 영상, 천무 형상/교육자료, 판단근거",
    },
    codeAction:
      "classification visual의 판단근거를 2-6/2-7 텍스트와 2-5 영상 기반으로 갱신한다.",
  },
  3: {
    id: 3,
    title: "부대규모 판단",
    page: 2,
    timeBand: "H~H+5'",
    combatLayer: "근접 화력 전투",
    implementationLevel: "Mock UP",
    requirements: [
      "객체인식을 통한 장비대수 판단",
      "행군장경(적교리)을 고려한 부대규모 판단",
    ],
    sourceRefs: ["3-1"],
    sourceFiles: ["3-1 부대별 행군장경 data.show", "1-1 장도훈련장 기동 영상"],
    assetUse: {
      main: "화포문수 4문 식별, 행군장경 약 350m, 중대규모 98.7%",
      sub: "행군장경 판단표와 실제 1-1 영상",
    },
    codeAction:
      "scenario 3의 scale table을 3-1 자료의 중대/대대/전차/고사포/견인포 기준으로 교체한다.",
  },
  4: {
    id: 4,
    title: "전투서열 판단",
    page: 2,
    timeBand: "H+5'~H+10'",
    combatLayer: "근접 화력 전투",
    implementationLevel: "Mock UP",
    requirements: [
      "드론 촬영 표적위치 기준 최기부대와 이격거리 및 예상부대 확인",
      "이격거리+보유화포를 고려한 전투서열 판단과정 가시화",
      "전투서열 판단근거 나열/판정",
    ],
    sourceRefs: ["4-1"],
    sourceFiles: ["4-1 훈련장 인근부대 위치， 보유 장비 등.show"],
    assetUse: {
      main: "표적좌표 BH 12345 67890와 후보 부대 위치/보유화기 비교",
      sub: "인근부대 위치표, 보유화기/수량표",
    },
    codeAction:
      "orderCandidates를 4-1 표의 BH 좌표, 이격거리, 전투서열, 보유장비 기준으로 재작성한다.",
  },
  5: {
    id: 5,
    title: "부수적 피해 판단",
    page: 3,
    timeBand: "H+5'~H+10'",
    combatLayer: "근접 화력 전투",
    implementationLevel: "Mock UP",
    requirements: [
      "표적 및 민가지역 가시화",
      "표적으로부터 민가지역 이격거리 전시",
      "탄종별 부수피해 발생가능성 분석과정 가시화 및 사용가능탄종 제시",
    ],
    sourceRefs: ["5-1"],
    sourceFiles: ["5-1 탄종별 부수적 효과반경.show"],
    assetUse: {
      main: "민가 이격거리와 탄종별 CDE 반경 비교",
      sub: "탄종별 부수적 효과반경 표",
    },
    codeAction:
      "collateralMunitions를 거리별 HE/HEBB/DP/DPBB/유도탄 반경 테이블로 확장한다.",
  },
  6: {
    id: 6,
    title: "Army GPT 취약점 질의",
    page: 3,
    timeBand: "H+5'~H+10'",
    combatLayer: "근접 화력 전투",
    implementationLevel: "Mock UP",
    requirements: [
      "충의-GPT(AI어시스턴트)를 통해 실시간 적 취약점 등 정보 제공",
    ],
    sourceRefs: ["6-1"],
    sourceFiles: ["6-1 240mm 및 152mm 취약점.Show"],
    assetUse: {
      main: "240mm 방사포/152mm 자주포 취약점 답변",
      sub: "대화형 assistant 답변과 취약점 카드",
    },
    codeAction:
      "sudoAssistant context에 6-1 취약점 요약을 knowledge base로 연결한다.",
  },
  7: {
    id: 7,
    title: "탄종/발수 판단",
    page: 4,
    timeBand: "H+5'~H+10'",
    combatLayer: "근접 화력 전투",
    implementationLevel: "필수 구현",
    requirements: [
      "표적성질 및 지형분석(산림, 개활지) 결과",
      "무기효과 판단 프로그램에 의한 최적 탄종/발수 선정과정 및 판단결과 제시",
    ],
    sourceRefs: ["7-1", "7-2"],
    sourceFiles: ["7-1~2 지형DB， 탄종 및 발수 판단 자료.hwp"],
    assetUse: {
      main: "지형비율, 사거리, 요망효과 기반 탄종/발수 판단",
      sub: "지형DB 색상/분류와 무기효과 판단 결과",
    },
    codeAction:
      "munition visual과 decision engine에 표적성질+지형+사거리+요망효과별 발수 테이블을 추가한다.",
  },
  8: {
    id: 8,
    title: "최적 사격부대 선정",
    page: 4,
    timeBand: "H+5'~H+10'",
    combatLayer: "근접 화력 전투",
    implementationLevel: "필수 구현",
    requirements: [
      "사격부대 후보 5개 항목 평가",
      "최적 사격부대 선정과 판단근거 제시",
    ],
    sourceRefs: ["8-1"],
    sourceFiles: ["8-1 최적의 사격부대 선정 판단 자료.hwp"],
    assetUse: {
      main: "사거리, 생존성, 탄보유량, 민간피해, 전투력수준 평가",
      sub: "사격부대 후보 지도/표",
    },
    codeAction:
      "fireUnits 입력을 8-1 자료의 668/K55/K105/4.2인치 후보표로 교체한다.",
  },
  9: {
    id: 9,
    title: "사태분석도 분석",
    page: 5,
    timeBand: "H+20'~H+30'",
    combatLayer: "종심 화력 전투",
    implementationLevel: "Mock UP",
    requirements: [
      "예상이동로를 고려한 적 방책 제시",
      "NAI, TAI 지점 선정과정 제시 및 최적 판단결과",
    ],
    sourceRefs: ["9-1"],
    sourceFiles: ["9-1 사태분석도 및 도로정보.show"],
    assetUse: {
      main: "사태분석도 #1/#2 비교, 도로정보 기반 방책 판단",
      sub: "작전지역/도로 임의 데이터",
    },
    codeAction:
      "routeOptions를 9-1의 사태분석도 #1/#2와 도로/교량 제약으로 재작성한다.",
  },
  10: {
    id: 10,
    title: "드론 재배치/이동통제",
    page: 5,
    timeBand: "H+20'~H+30'",
    combatLayer: "종심 화력 전투",
    implementationLevel: "Mock UP",
    requirements: [
      "지형정보에서 드론이동사항 전시",
      "드론이동통제사항 전시",
      "보조 GPT 또는 주 화면 메뉴바 구성",
    ],
    sourceRefs: ["9-1"],
    sourceFiles: ["9-1 사태분석도 및 도로정보.show"],
    assetUse: {
      main: "사태분석도 판단안 2번 기반 드론 재배치 명령",
      sub: "NAI/TAI/DP 이동 지시와 진행률",
    },
    codeAction:
      "droneRedeploymentOrders를 실제 NAI/TAI/DP 지점과 연결하고 assistant 명령과 동기화한다.",
  },
  11: {
    id: 11,
    title: "최적 타격방법 결정",
    page: 6,
    timeBand: "H+30'~H+50'",
    combatLayer: "종심 화력 전투",
    implementationLevel: "Mock UP",
    requirements: [
      "가용자산 현황(CAS, 육항 등)",
      "지형 및 가용시간을 고려한 최적 타격방법 선정과정 및 최종판단결과 제시",
    ],
    sourceRefs: ["senario.pdf #11", "page 06 OCR"],
    sourceFiles: [
      SUDO_FIRE_PLAN_SOURCE_NAME,
      "PDF 원본 작성중 - 앱 보강 DATA",
      `가용자산 원본시간표 ${SUDO_STRIKE_ASSET_SOURCE_ROWS.length}행`,
      `최적 타격방법 원본근거 ${SUDO_STRIKE_METHOD_SOURCE_ROWS.length}행`,
    ],
    assetUse: {
      main: "CAS/육항/포병 가용시간표, 추천 TAI/DP 순위",
      sub: "최적 타격방법 결정표",
    },
    codeAction:
      "strikeAssets를 senario.pdf page 06 OCR의 CAS/육항/포병 가용시간으로 갱신한다.",
  },
  12: {
    id: 12,
    title: "통합화력운용도표 작성",
    page: 6,
    timeBand: "H+30'~H+50'",
    combatLayer: "종심 화력 전투",
    implementationLevel: "필수 구현",
    requirements: [
      "통합화력운용도표 작성결과 전시",
      "통합화력운용도표 판단과정 및 최종 작성결과 제시",
    ],
    sourceRefs: ["senario.pdf #12", "page 06 OCR"],
    sourceFiles: [
      SUDO_FIRE_PLAN_SOURCE_NAME,
      "PDF 원본 작성중 - 앱 보강 DATA",
      `통합화력운용도표 원본근거 ${SUDO_FIRE_PLAN_SOURCE_ROWS.length}행`,
    ],
    assetUse: {
      main: "통합화력운용도표, 판단근거, H 시각",
      sub: "통합화력운용도표 이미지/표",
    },
    codeAction:
      "firePlanRows와 fireControlPoints를 senario.pdf page 06 통합화력운용도표 구조로 보강한다.",
  },
  13: {
    id: 13,
    title: "대포병탐지 R/D 실존·허상표적 판단",
    page: 7,
    timeBand: "별도 R/D 판단 단계",
    combatLayer: "대포병탐지 R/D",
    implementationLevel: "Mock UP",
    requirements: [
      "표적탐지 시 표적탐지 알람",
      "좌측에는 R/D 진지 탐지 정보와 관련 메뉴바 제시",
      "우측에는 지휘소 타출처 정보까지 고려한 메뉴바 제시",
    ],
    sourceRefs: ["13-1"],
    sourceFiles: ["13-1 실존ㆍ허상표적 판단표.hwp"],
    assetUse: {
      main: "실존(10%)/허상(90%) 판단 결과와 판단근거",
      sub: "R/D 진지 체크리스트와 지휘소 타출처 정보",
    },
    codeAction:
      "ARTAS/RD 판단은 제공된 dan/daedae 레벨 PDF 본선 흐름 밖의 확장 근거로 보존한다.",
  },
  14: {
    id: 14,
    title: "타격결과 평가",
    page: 6,
    timeBand: "BDA 후속 평가",
    combatLayer: "종심 화력 전투",
    implementationLevel: "앱 확장",
    requirements: [
      "타격결과 영상을 기준으로 피해율과 잔여표적을 평가",
      "요망효과 대비 관측 피해율을 비교해 재타격 필요성을 제시",
      "BDA 입력 자료와 scenario_6_1 page_06 figure를 근거로 결과 전시",
    ],
    sourceRefs: ["dan_level_Senario.pdf #13", "BDA 입력", "page 06 figure"],
    sourceFiles: [
      SUDO_BDA_SOURCE_NAME,
      `타격결과 평가 figure ${SUDO_BDA_FIGURE_ID}`,
      SUDO_BDA_SOURCE_PATH,
    ],
    assetUse: {
      main: "요망효과 대비 타격결과, 잔여 표적, 재타격 여부",
      sub: "BDA 결과 보드와 타격결과 평가 figure",
    },
    codeAction:
      "observedDamagePercent, remainingTargets, bdaRequiredDamagePercent를 BDA 판단엔진 입력으로 연결한다.",
  },
};

function cloneSudoScenarioSourceStage(
  stage: SudoScenarioSourceStage
): SudoScenarioSourceStage {
  return {
    ...stage,
    requirements: [...stage.requirements],
    sourceRefs: [...stage.sourceRefs],
    sourceFiles: [...stage.sourceFiles],
    assetUse: stage.assetUse ? { ...stage.assetUse } : undefined,
  };
}

export function mergeSudoScenarioSourceValues(
  ...lists: Array<readonly string[] | undefined>
) {
  const seen = new Set<string>();
  return lists.flatMap((list) =>
    (list ?? [])
      .map((item) => item.trim())
      .filter((item) => {
        if (!item || seen.has(item)) {
          return false;
        }

        seen.add(item);
        return true;
      })
  );
}

export function buildFallbackSudoScenarioSourceStage(
  scenarioId: number
): SudoScenarioSourceStage | undefined {
  const stage = SUDO_SCENARIO_SOURCE_STAGE_FALLBACKS[scenarioId];
  return stage ? cloneSudoScenarioSourceStage(stage) : undefined;
}

export function formatSudoScenarioImplementationLevel(level?: string) {
  const trimmed = level?.trim();
  if (!trimmed) {
    return "";
  }

  const normalized = trimmed.toLowerCase().replace(/\s+/g, "");
  if (normalized === "mockup") {
    return "목업 기준";
  }

  return trimmed;
}

export function buildSudoScenarioSourceStageLines(
  stage: SudoScenarioSourceStage
) {
  const implementationLevelLabel = formatSudoScenarioImplementationLevel(
    stage.implementationLevel
  );

  return [
    `원자료 단계: ${stage.id}. ${stage.title}`,
    stage.timeBand ? `시간대: ${stage.timeBand}` : "",
    implementationLevelLabel ? `구현수준: ${implementationLevelLabel}` : "",
    ...stage.requirements.slice(0, 4).map((item) => `요구사항: ${item}`),
    stage.assetUse?.main ? `주 화면: ${stage.assetUse.main}` : "",
    stage.assetUse?.sub ? `부 화면: ${stage.assetUse.sub}` : "",
    stage.codeAction ? `고도화 액션: ${stage.codeAction}` : "",
  ].filter(Boolean);
}
