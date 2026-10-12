import type { SudoScenarioTable } from "./sudoScenarios";
import { SUDO_DRONE_VIDEO_SRC } from "./sudoMedia";
import { formatSudoSourceDisplayLabel } from "./sudoSourceDisplay";

export const SUDO_DRONE_TARGET_SOURCE_NAME =
  "SWID 천무1 / 1-2 장도훈련장 사진";

export const SUDO_DRONE_TARGET_DESCRIPTION_SOURCE_NAME = "1-1설명자료.hwp";

export interface SudoDroneTargetSourceRow {
  id: string;
  sourceFile: string;
  sourceKind: "video" | "hwp" | "presentation" | "pdf";
  cue: string;
  evidence: string;
  status: "적용" | "전시" | "재검수";
  assetStatus: "주영상" | "브라우저 재생" | "원본 전용" | "문서근거";
  path: string;
  playbackPath?: string;
}

export const SUDO_DRONE_TARGET_SOURCE_ROWS: SudoDroneTargetSourceRow[] = [
  {
    id: "video-1-mobility",
    sourceFile: "[SWID]천무1.mp4",
    sourceKind: "video",
    cue: "천무1",
    evidence: "SWID 드론 시점: 천무1 대대급 영상",
    status: "적용",
    assetStatus: "주영상",
    path: "client/public/vid/260616/SWID/[SWID]천무1.mp4",
    playbackPath: SUDO_DRONE_VIDEO_SRC,
  },
  {
    id: "video-1-loading",
    sourceFile: "1-1 장도훈련장 기동(1).mp4",
    sourceKind: "hwp",
    cue: "04:18",
    evidence:
      "1-1설명자료: 4분18초 천무 발사대 장전 영상. 현재 추출 MP4 03:30보다 길어 원문 cue 재검수 필요",
    status: "재검수",
    assetStatus: "원본 전용",
    path: "client/public/sudo_data/md/sources/1-1설명자료.md",
  },
  {
    id: "video-2-loading",
    sourceFile: "1-1 장도훈련장 기동(2).wmv",
    sourceKind: "video",
    cue: "00:02 / 00:43",
    evidence: "1-1설명자료: 2초부터 장전, 43초부터 기동영상",
    status: "적용",
    assetStatus: "브라우저 재생",
    path: "client/public/sudo_data/md/sources/1-1 장도훈련장 기동(2).md",
    playbackPath: "/sudo_data/converted/1-1-jangdo-mobility-2.mp4",
  },
  {
    id: "video-3-mobility",
    sourceFile: "1-1 장도훈련장 기동(3).wmv",
    sourceKind: "video",
    cue: "01:04",
    evidence: "1-1설명자료: 1분4초부터 기동영상",
    status: "적용",
    assetStatus: "브라우저 재생",
    path: "client/public/sudo_data/md/sources/1-1 장도훈련장 기동(3).md",
    playbackPath: "/sudo_data/converted/1-1-jangdo-mobility-3.mp4",
  },
  {
    id: "terrain-photo-1",
    sourceFile: "1-2 장도훈련장 사진.show",
    sourceKind: "presentation",
    cue: "slide media image1",
    evidence:
      "MilMap 좌표 126.6075630 / 37.546994, MGRS 52SBG8864858245, 장도훈련장 지형DB",
    status: "전시",
    assetStatus: "문서근거",
    path: "client/public/sudo_data/md/sources/1-2 장도훈련장 사진.md",
  },
  {
    id: "terrain-photo-2",
    sourceFile: "1-2 장도훈련장 사진.show",
    sourceKind: "presentation",
    cue: "slide media image2",
    evidence:
      "MilMap 좌표 126.6312151 / 37.5621520, MGRS 52SBG9078159874, 장도훈련장 지형DB",
    status: "전시",
    assetStatus: "문서근거",
    path: "client/public/sudo_data/md/sources/1-2 장도훈련장 사진.md",
  },
  {
    id: "pdf-requirement",
    sourceFile: "senario.pdf page 01",
    sourceKind: "pdf",
    cue: "H~H+5'",
    evidence:
      "드론이 표적식별 시 알림창 전시, 지형DB 전시, 드론자세/위치/고도/감시좌표 가시화",
    status: "적용",
    assetStatus: "문서근거",
    path: "client/public/sudo_data/md/sources/senario.md",
  },
];

export function buildSudoDroneTargetSourceTable(): SudoScenarioTable {
  return {
    title: "1-1/1-2 드론 표적식별 원본 큐",
    columns: [
      { key: "sourceFile", label: "원본" },
      { key: "cue", label: "Cue" },
      { key: "evidence", label: "근거" },
      { key: "status", label: "상태" },
      { key: "assetStatus", label: "자산상태" },
      { key: "playbackPath", label: "재생경로" },
      { key: "path", label: "경로" },
    ],
    rows: SUDO_DRONE_TARGET_SOURCE_ROWS.map((row) => ({
      sourceFile: formatSudoSourceDisplayLabel(row.sourceFile),
      cue: row.cue,
      evidence: row.evidence,
      status: row.status,
      assetStatus: row.assetStatus,
      playbackPath: row.playbackPath ?? "-",
      path: row.path,
    })),
  };
}

export function buildSudoDroneIdentificationRowsForDecision() {
  return [
    { item: "드론호기", value: "드론1", status: "감시중" },
    { item: "표적좌표", value: "BH 12345 67890", status: "확정" },
    { item: "드론좌표", value: "BH 12321 56789", status: "추적중" },
    { item: "지형 DB", value: "장도훈련장", status: "매칭" },
    { item: "원본 cue", value: "1-1 01:45 / 1-2 MilMap", status: "연결" },
    { item: "이관", value: "표적성질분석", status: "준비완료" },
  ];
}

export function getSudoDroneIdentificationRowsForVisual() {
  return [
    {
      item: "경보",
      value: "드론1이 표적을 식별",
      source: formatSudoSourceDisplayLabel("senario.pdf page 01"),
    },
    {
      item: "표적좌표",
      value: "BH 12345 67890",
      source: "SWID 영상 / 1-2 MilMap",
    },
    {
      item: "드론좌표",
      value: "BH 12321 56789",
      source: "SWID 영상",
    },
    {
      item: "영상 cue",
      value: "SWID 천무1",
      source: SUDO_DRONE_TARGET_DESCRIPTION_SOURCE_NAME,
    },
    {
      item: "장전 cue",
      value: "1-1(1) 04:18 재검수",
      source: SUDO_DRONE_TARGET_DESCRIPTION_SOURCE_NAME,
    },
    {
      item: "지형DB",
      value: "MGRS 52SBG8864858245 / 52SBG9078159874",
      source: "1-2 장도훈련장 사진.show",
    },
  ];
}
