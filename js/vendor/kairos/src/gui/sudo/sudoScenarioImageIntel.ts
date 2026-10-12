import { resolvePublicAssetPath } from "../../utils/publicAssetUrl";
import { formatSudoSourceDisplayLabel } from "./sudoSourceDisplay";

export interface SudoScenarioImageFigure {
  id: string;
  label: string;
  href: string;
  size: string;
  ocrExcerpt: string;
}

export interface SudoScenarioImageEvidence {
  scenarioId: number;
  page: number;
  pageHref: string;
  pageLabel: string;
  summary: string;
  catalogHref: string;
  figures: SudoScenarioImageFigure[];
}

const scenarioAsset = (path: string) =>
  resolvePublicAssetPath(`/sudo_data/_extracted/scenario_6_1/${path}`);

const sudoAsset = (path: string) =>
  resolvePublicAssetPath(`/sudo_data/${path}`);

const catalogHref = sudoAsset("md/시나리오_6.1_이미지_카탈로그.md");

const imageEvidenceByScenario: Record<number, SudoScenarioImageEvidence> = {
  1: {
    scenarioId: 1,
    page: 1,
    pageHref: scenarioAsset("pages/page_01.png"),
    pageLabel: "PDF page 01",
    summary:
      "드론 표적 식별 WARNING, 장도훈련장 지형DB/드론운용 현황, 표적/드론 좌표 캡처",
    catalogHref,
    figures: [
      {
        id: "page_01_figure_01_xref_36",
        label: "표적식별 알림",
        href: scenarioAsset("figures/page_01_figure_01_xref_36.png"),
        size: "1912x376",
        ocrExcerpt: "WARNING 드론1이 '표적을식별'하였습니다",
      },
      {
        id: "page_01_figure_02_xref_37",
        label: "드론운용 현황",
        href: scenarioAsset("figures/page_01_figure_02_xref_37.png"),
        size: "1912x376",
        ocrExcerpt: "표적좌표 BH 12345 67890 / 드론좌표 BH 12321 56789",
      },
    ],
  },
  2: {
    scenarioId: 2,
    page: 1,
    pageHref: scenarioAsset("pages/page_01.png"),
    pageLabel: "PDF page 01",
    summary:
      "표적성질 판단 WARNING, 전송영상 객체인식 결과, 240mm 방사포 후보 확률 캡처",
    catalogHref,
    figures: [
      {
        id: "page_01_figure_06_xref_57",
        label: "표적성질 판단",
        href: scenarioAsset("figures/page_01_figure_06_xref_57.png"),
        size: "1928x319",
        ocrExcerpt: "표적성질 판단, 240mm 방사포(M-1991)",
      },
      {
        id: "page_01_figure_07_xref_58",
        label: "객체인식 결과",
        href: scenarioAsset("figures/page_01_figure_07_xref_58.png"),
        size: "1928x319",
        ocrExcerpt: "전송영상 객체인식 분석 결과, ROMAN 차대, M-1991",
      },
    ],
  },
  3: {
    scenarioId: 3,
    page: 2,
    pageHref: scenarioAsset("pages/page_02.png"),
    pageLabel: "PDF page 02",
    summary: "부대규모 판단 WARNING과 대열/행군장경 판단 화면 캡처",
    catalogHref,
    figures: [
      {
        id: "page_02_figure_01_xref_82",
        label: "규모판단 알림",
        href: scenarioAsset("figures/page_02_figure_01_xref_82.png"),
        size: "1756x321",
        ocrExcerpt: "식별된 표적의 규모를 판단하겠습니다",
      },
      {
        id: "page_02_figure_03_xref_84",
        label: "규모판단 화면",
        href: scenarioAsset("figures/page_02_figure_03_xref_84.png"),
        size: "1277x708",
        ocrExcerpt: "부대규모 판단과 표적 정보 화면",
      },
    ],
  },
  4: {
    scenarioId: 4,
    page: 2,
    pageHref: scenarioAsset("pages/page_02.png"),
    pageLabel: "PDF page 02",
    summary: "전투서열 판단 WARNING과 후보부대/보유화포 근거 캡처",
    catalogHref,
    figures: [
      {
        id: "page_02_figure_04_xref_85",
        label: "전투서열 판단",
        href: scenarioAsset("figures/page_02_figure_04_xref_85.png"),
        size: "1755x321",
        ocrExcerpt: "전투서열을 판단하겠습니다",
      },
      {
        id: "page_02_figure_06_xref_87",
        label: "전투서열 화면",
        href: scenarioAsset("figures/page_02_figure_06_xref_87.png"),
        size: "1275x709",
        ocrExcerpt: "전투서열 판단과 표적 정보 화면",
      },
    ],
  },
  5: {
    scenarioId: 5,
    page: 3,
    pageHref: scenarioAsset("pages/page_03.png"),
    pageLabel: "PDF page 03",
    summary: "부수적 피해 판단 WARNING, 표적/민가/탄종 효과반경 판단 화면",
    catalogHref,
    figures: [
      {
        id: "page_03_figure_01_xref_101",
        label: "부수피해 판단",
        href: scenarioAsset("figures/page_03_figure_01_xref_101.png"),
        size: "1753x319",
        ocrExcerpt: "부수적 피해 판단을 하겠습니다",
      },
      {
        id: "page_03_figure_04_xref_104",
        label: "부수피해 근거",
        href: scenarioAsset("figures/page_03_figure_04_xref_104.png"),
        size: "1631x904",
        ocrExcerpt: "표적정보와 부수적 피해 판단 화면",
      },
    ],
  },
  6: {
    scenarioId: 6,
    page: 3,
    pageHref: scenarioAsset("pages/page_03.png"),
    pageLabel: "PDF page 03",
    summary: "Army GPT 취약점 질의/답변 화면과 240mm 방사포 취약점 캡처",
    catalogHref,
    figures: [
      {
        id: "page_03_figure_05_xref_105",
        label: "취약점 GPT 답변",
        href: scenarioAsset("figures/page_03_figure_05_xref_105.png"),
        size: "1276x697",
        ocrExcerpt: "240mm 방사포 취약점, 발사 위치 노출, 재장전 시간",
      },
    ],
  },
  7: {
    scenarioId: 7,
    page: 4,
    pageHref: scenarioAsset("pages/page_04.png"),
    pageLabel: "PDF page 04",
    summary: "탄종/발수 판단 WARNING, 표적성질과 무기효과 분석 화면",
    catalogHref,
    figures: [
      {
        id: "page_04_figure_01_xref_119",
        label: "탄종/발수 판단",
        href: scenarioAsset("figures/page_04_figure_01_xref_119.png"),
        size: "1754x321",
        ocrExcerpt: "표적 성질과 무기효과를 고려하여 탄종/발수를 판단",
      },
      {
        id: "page_04_figure_03_xref_121",
        label: "탄종/발수 근거",
        href: scenarioAsset("figures/page_04_figure_03_xref_121.png"),
        size: "1277x709",
        ocrExcerpt: "탄종/발수 판단과 통합화력운용 화면",
      },
    ],
  },
  8: {
    scenarioId: 8,
    page: 4,
    pageHref: scenarioAsset("pages/page_04.png"),
    pageLabel: "PDF page 04",
    summary: "사격부대 선정 화면과 5개 항목 평가 근거 캡처",
    catalogHref,
    figures: [
      {
        id: "page_04_figure_04_xref_122",
        label: "사격부대 선정",
        href: scenarioAsset("figures/page_04_figure_04_xref_122.png"),
        size: "1275x706",
        ocrExcerpt: "사격부대 선정과 후보부대 평가 화면",
      },
    ],
  },
  9: {
    scenarioId: 9,
    page: 5,
    pageHref: scenarioAsset("pages/page_05.png"),
    pageLabel: "PDF page 05",
    summary: "사태분석도 #1/#2, 예상이동로, NAI/TAI 조정 근거 캡처",
    catalogHref,
    figures: [
      {
        id: "page_05_figure_01_xref_136",
        label: "사태분석도 분석",
        href: scenarioAsset("figures/page_05_figure_01_xref_136.png"),
        size: "1754x321",
        ocrExcerpt: "통합화력운용을 위한 사태분석도 분석",
      },
      {
        id: "page_05_figure_03_xref_138",
        label: "사태분석 결과",
        href: scenarioAsset("figures/page_05_figure_03_xref_138.png"),
        size: "1276x708",
        ocrExcerpt: "사태분석도 분석 결과",
      },
    ],
  },
  10: {
    scenarioId: 10,
    page: 5,
    pageHref: scenarioAsset("pages/page_05.png"),
    pageLabel: "PDF page 05",
    summary: "사태분석도 판단안 기반 드론 재배치 명령 답변 캡처",
    catalogHref,
    figures: [
      {
        id: "page_05_figure_06_xref_141",
        label: "드론 재배치 답변",
        href: scenarioAsset("figures/page_05_figure_06_xref_141.png"),
        size: "1142x622",
        ocrExcerpt: "1번 드론 TAI #3, 2번 드론 NAI #4, 3번 드론 TAI #4",
      },
    ],
  },
  11: {
    scenarioId: 11,
    page: 6,
    pageHref: scenarioAsset("pages/page_06.png"),
    pageLabel: "PDF page 06",
    summary: "CAS/육항/포병 가용시간과 최적 타격방법 판단 화면",
    catalogHref,
    figures: [
      {
        id: "page_06_figure_04_xref_148",
        label: "가용자산 판단",
        href: scenarioAsset("figures/page_06_figure_04_xref_148.png"),
        size: "1928x323",
        ocrExcerpt: "가용자산 판단, 10:30~11:30, 14:00~15:00, 24시간",
      },
      {
        id: "page_06_figure_05_xref_149",
        label: "타격방법 추천",
        href: scenarioAsset("figures/page_06_figure_05_xref_149.png"),
        size: "1928x322",
        ocrExcerpt: "CAS+포병, TAI #5, DP #3",
      },
    ],
  },
  12: {
    scenarioId: 12,
    page: 6,
    pageHref: scenarioAsset("pages/page_06.png"),
    pageLabel: "PDF page 06",
    summary: "통합화력운용도표 작성 WARNING과 H-10~H+30 도표 캡처",
    catalogHref,
    figures: [
      {
        id: "page_06_figure_08_xref_152",
        label: "통합화력운용도표",
        href: scenarioAsset("figures/page_06_figure_08_xref_152.png"),
        size: "1928x313",
        ocrExcerpt: "통합화력운용도표, 111/112/113 포병대대",
      },
      {
        id: "page_06_figure_09_xref_153",
        label: "시간대별 운용도표",
        href: scenarioAsset("figures/page_06_figure_09_xref_153.png"),
        size: "1928x312",
        ocrExcerpt: "공격 H-10, H+10, H+20, H+30",
      },
    ],
  },
  13: {
    scenarioId: 13,
    page: 7,
    pageHref: scenarioAsset("pages/page_07.png"),
    pageLabel: "PDF page 07",
    summary: "ARTAS 대포병탐지 R/D 표적탐지 분석과 허상표적 99% 결론",
    catalogHref,
    figures: [
      {
        id: "page_07_figure_01_xref_159",
        label: "ARTAS R/D 표적탐지 판단",
        href: scenarioAsset("figures/page_07_figure_01_xref_159.png"),
        size: "1236x648",
        ocrExcerpt: "ARTAS 허상표적 78% / 종합 허상표적 99%",
      },
    ],
  },
  14: {
    scenarioId: 14,
    page: 6,
    pageHref: scenarioAsset("pages/page_06.png"),
    pageLabel: "PDF page 06",
    summary: "앱 확장 BDA 단계용 타격결과 평가 캡처와 page 06 근거",
    catalogHref,
    figures: [
      {
        id: "page_06_figure_10_xref_154",
        label: "타격결과 평가",
        href: scenarioAsset("figures/page_06_figure_10_xref_154.png"),
        size: "1277x706",
        ocrExcerpt: "타격결과 평가, 표적좌표/드론좌표와 결과 화면",
      },
    ],
  },
};

export function getSudoScenarioImageEvidence(scenarioId: number) {
  return imageEvidenceByScenario[scenarioId];
}

export function buildSudoScenarioImageEvidenceSummary(
  evidence: SudoScenarioImageEvidence | undefined,
  figureLimit = 2
) {
  if (!evidence) {
    return "이미지 근거 없음";
  }

  const figures = evidence.figures
    .slice(0, figureLimit)
    .map((figure) => figure.label)
    .join(" / ");
  const hidden =
    evidence.figures.length - Math.min(evidence.figures.length, figureLimit);
  return [
    formatSudoSourceDisplayLabel(evidence.pageLabel),
    evidence.summary,
    figures ? `figure ${figures}${hidden > 0 ? ` +${hidden}` : ""}` : "",
  ]
    .filter(Boolean)
    .join(" · ");
}
