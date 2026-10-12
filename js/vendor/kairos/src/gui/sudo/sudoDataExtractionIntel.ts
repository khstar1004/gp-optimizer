import { resolvePublicAssetPath } from "../../utils/publicAssetUrl";

export interface SudoDataExtractionIssue {
  source: string;
  status: "partial" | "skipped" | "failed";
  detail: string;
}

export interface SudoDataExtractionRoleCount {
  role: string;
  label: string;
  count: number;
}

export interface SudoDataExtractionSummary {
  generatedAt: string;
  sourceTotal: number;
  sourceOk: number;
  sourcePartial: number;
  ocrEngine: string;
  ocrTotal: number;
  ocrOk: number;
  ocrFailed: number;
  presentationTotal: number;
  presentationOk: number;
  presentationSkipped: number;
  slideRenderTotal: number;
  roleCounts: SudoDataExtractionRoleCount[];
  issues: SudoDataExtractionIssue[];
  links: {
    label: string;
    href: string;
  }[];
}

export const SUDO_DATA_EXTRACTION_SUMMARY: SudoDataExtractionSummary = {
  generatedAt: "2026-06-02T01:41:02.088862+00:00",
  sourceTotal: 24,
  sourceOk: 22,
  sourcePartial: 2,
  ocrEngine: "Windows.Media.Ocr ko",
  ocrTotal: 248,
  ocrOk: 221,
  ocrFailed: 27,
  presentationTotal: 8,
  presentationOk: 7,
  presentationSkipped: 1,
  slideRenderTotal: 47,
  roleCounts: [
    { role: "video-frame", label: "영상 프레임", count: 31 },
    { role: "ppt-slide-render", label: "슬라이드 렌더", count: 47 },
    { role: "ppt-embedded-media", label: "PPT 매체", count: 101 },
    { role: "pdf-page-render", label: "문서 페이지", count: 41 },
    { role: "hwp-bin-image", label: "HWP 이미지", count: 28 },
  ],
  issues: [
    {
      source: "2-4 천무형상 및 사진자료.show",
      status: "skipped",
      detail: "암호화/legacy OLE 컨테이너로 슬라이드 직접 추출 제외",
    },
    {
      source: "시나리오(6.1.).hwp",
      status: "partial",
      detail: "본문 stream decode 불가, 이미지/OCR 추출만 사용",
    },
  ],
  links: [
    {
      label: "추출 메타데이터",
      href: resolvePublicAssetPath(
        "/sudo_data/_extracted/extraction_metadata.json"
      ),
    },
    {
      label: "OCR manifest",
      href: resolvePublicAssetPath("/sudo_data/_extracted/ocr_manifest.json"),
    },
    {
      label: "OCR results",
      href: resolvePublicAssetPath("/sudo_data/_extracted/ocr_results.json"),
    },
    {
      label: "슬라이드 export 상태",
      href: resolvePublicAssetPath(
        "/sudo_data/_extracted/presentation_export_status.json"
      ),
    },
  ],
};

export function buildSudoDataExtractionHealthSummary(
  summary: SudoDataExtractionSummary = SUDO_DATA_EXTRACTION_SUMMARY
) {
  return `원천 ${summary.sourceOk}/${summary.sourceTotal} ok · OCR ${summary.ocrOk}/${summary.ocrTotal} ok · 슬라이드 ${summary.presentationOk}/${summary.presentationTotal} export · 이슈 ${summary.issues.length}건`;
}

export function buildSudoDataExtractionRoleSummary(
  summary: SudoDataExtractionSummary = SUDO_DATA_EXTRACTION_SUMMARY,
  limit = 4
) {
  const visible = summary.roleCounts
    .slice(0, limit)
    .map((item) => `${item.label} ${item.count}건`);
  const hidden = summary.roleCounts.length - visible.length;
  return [...visible, ...(hidden > 0 ? [`+${hidden}종`] : [])].join(" | ");
}

export function buildSudoDataExtractionIssueSummary(
  summary: SudoDataExtractionSummary = SUDO_DATA_EXTRACTION_SUMMARY,
  limit = 2
) {
  const visible = summary.issues
    .slice(0, limit)
    .map((issue) => `${issue.source}: ${issue.detail}`);
  const hidden = summary.issues.length - visible.length;
  return [...visible, ...(hidden > 0 ? [`+${hidden}건`] : [])].join(" | ");
}

export function buildSudoDataExtractionPromptLines(
  summary: SudoDataExtractionSummary = SUDO_DATA_EXTRACTION_SUMMARY
) {
  return [
    `- 추출상태: ${buildSudoDataExtractionHealthSummary(summary)}`,
    `- 추출역할: ${buildSudoDataExtractionRoleSummary(summary)}`,
    `- 추출이슈: ${buildSudoDataExtractionIssueSummary(summary)}`,
  ];
}
