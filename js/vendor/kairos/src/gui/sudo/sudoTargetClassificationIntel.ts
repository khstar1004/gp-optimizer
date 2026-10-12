import type { SudoScenarioTable } from "./sudoScenarios";

export const SUDO_TARGET_CLASSIFICATION_SOURCE_NAME =
  "2-5 객체인식 / 2-6 천무 참고자료 / 2-7 천무 교육자료";

export interface SudoTargetClassificationMediaRow {
  id: string;
  sourceFile: string;
  sourceKind: "video" | "pdf" | "presentation";
  role: string;
  cue: string;
  assetStatus: "브라우저 재생" | "문서근거" | "부분추출";
  playbackPath: string;
  evidence: string;
}

export const SUDO_TARGET_CLASSIFICATION_EVIDENCE_ROWS = [
  {
    basis: "전폭/전장 제원",
    observed: "전장 약 9.0m, 전폭 약 2.9m급 차륜형 발사대 제원과 부합",
    grade: "부합",
    source: "2-6 page 3 / 2-7 slide 5",
  },
  {
    basis: "발사관 배열",
    observed: "상부 다련장 포드와 22연장 계열 발사관 군집 형상 확인",
    grade: "M-1991",
    source: "2-5 객체인식 / 2-7 slide 11",
  },
  {
    basis: "이동속도/기동방식",
    observed: "차륜형 8x8 TEL, 최고속도 80km/h급 운용 제원과 매칭",
    grade: "부합",
    source: "2-6 page 3 / 2-7 slide 5",
  },
  {
    basis: "운전석/차량후미",
    observed: "전방 방호형 캡과 후방 발사대 구조가 참조 형상과 일치",
    grade: "부합",
    source: "2-4 형상자료 / 2-7 slide 6",
  },
  {
    basis: "발사관 앞 적재대/사수의자",
    observed: "발사대 상부 보조 구조물과 사격 운용부 위치가 참조 자료와 부합",
    grade: "부합",
    source: "2-7 slide 6~7",
  },
  {
    basis: "박스형 차량 전면",
    observed: "전면 박스형 캡과 대형 차체 비율이 M-1991 후보와 일치",
    grade: "부합",
    source: "2-5 객체인식 프레임",
  },
  {
    basis: "ROMAN 차대",
    observed:
      "차륜형 TEL 차대와 후방 발사대 탑재 형태가 ROMAN 차대 계열로 판독",
    grade: "부합",
    source: "2-4 형상자료 / 2-5 객체인식",
  },
] satisfies Record<string, string>[];

export const SUDO_TARGET_CLASSIFICATION_MEDIA_ROWS: SudoTargetClassificationMediaRow[] =
  [
    {
      id: "chunmoo-intro",
      sourceFile: "2-1 천무 소개영상.wmv",
      sourceKind: "video",
      role: "형상/기동",
      cue: "00:53 frame",
      assetStatus: "브라우저 재생",
      playbackPath: "/sudo_data/converted/2-1-chunmoo-intro.mp4",
      evidence: "차륜형 8x8 발사대와 제원 형상 대조",
    },
    {
      id: "chunmoo-fire-1",
      sourceFile: "2-2 천무 사격영상1.wmv",
      sourceKind: "video",
      role: "사격형상",
      cue: "00:30 frame",
      assetStatus: "브라우저 재생",
      playbackPath: "/sudo_data/converted/2-2-chunmoo-fire-1.mp4",
      evidence: "다련장 발사대 운용 장면 대조",
    },
    {
      id: "chunmoo-fire-2",
      sourceFile: "2-3 천무 사격영상2.wmv",
      sourceKind: "video",
      role: "사격형상",
      cue: "원본 영상",
      assetStatus: "브라우저 재생",
      playbackPath: "/sudo_data/converted/2-3-chunmoo-fire-2.mp4",
      evidence: "사격 자세와 발사대 상부 구조 보조 검증",
    },
    {
      id: "object-recognition",
      sourceFile: "2-5 객체인식(연결프로그램 사진으로 재생).wmv",
      sourceKind: "video",
      role: "AI 입력",
      cue: "01:45 frame",
      assetStatus: "브라우저 재생",
      playbackPath: "/sudo_data/converted/2-5-object-recognition.mp4",
      evidence: "표적성질 분석 입력 프레임",
    },
    {
      id: "chunmoo-shape-show",
      sourceFile: "2-4 천무형상 및 사진자료.show",
      sourceKind: "presentation",
      role: "형상근거",
      cue: "slide media",
      assetStatus: "부분추출",
      playbackPath:
        "client/public/sudo_data/md/sources/2-4 천무형상 및 사진자료.md",
      evidence: "운전석/차량후미/ROMAN 차대 형상 보조근거",
    },
    {
      id: "chunmoo-reference-pdf",
      sourceFile: "2-6 천무 참고자료.pdf",
      sourceKind: "pdf",
      role: "제원근거",
      cue: "page 3",
      assetStatus: "문서근거",
      playbackPath: "client/public/sudo_data/md/sources/2-6 천무 참고자료.md",
      evidence: "전장/전폭/기동속도 제원",
    },
    {
      id: "chunmoo-training-ppt",
      sourceFile: "2-7 천무 교육자료.pptx",
      sourceKind: "presentation",
      role: "제원/구성",
      cue: "slide 5~7 / 11",
      assetStatus: "문서근거",
      playbackPath: "client/public/sudo_data/md/sources/2-7 천무 교육자료.md",
      evidence: "발사대 제원, 구성, 발사관 배열 판단근거",
    },
  ];

export function buildSudoTargetClassificationEvidenceTable(): SudoScenarioTable {
  return {
    title: "2계열 표적성질 판단근거 원본표",
    columns: [
      { key: "basis", label: "판단근거" },
      { key: "observed", label: "관측내용" },
      { key: "grade", label: "판정" },
      { key: "source", label: "근거자료" },
    ],
    rows: SUDO_TARGET_CLASSIFICATION_EVIDENCE_ROWS.map((row) => ({
      ...row,
    })),
  };
}

export function buildSudoTargetClassificationMediaTable(): SudoScenarioTable {
  return {
    title: "2계열 표적성질 미디어 자산 레지스트리",
    columns: [
      { key: "sourceFile", label: "원본" },
      { key: "role", label: "역할" },
      { key: "cue", label: "Cue" },
      { key: "assetStatus", label: "자산상태" },
      { key: "playbackPath", label: "재생/근거경로" },
      { key: "evidence", label: "검증근거" },
    ],
    rows: SUDO_TARGET_CLASSIFICATION_MEDIA_ROWS.map((row) => ({
      sourceFile: row.sourceFile,
      role: row.role,
      cue: row.cue,
      assetStatus: row.assetStatus,
      playbackPath: row.playbackPath,
      evidence: row.evidence,
    })),
  };
}
