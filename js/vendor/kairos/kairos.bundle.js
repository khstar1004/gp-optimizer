// KAIROS(수도) 원본 번들 — 생성물. 직접 수정하지 말 것.
// 원본: D:\VISTA_sudo\client\src\gui\sudo\**  (npm run build:kairos)


// js/vendor/kairos/src/utils/constants.ts
var EARTH_RADIUS_KM = 6371;
var EARTH_RADIUS_M = 63710088e-1;
var NAUTICAL_MILES_TO_METERS = 1852;
var KILOMETERS_TO_NAUTICAL_MILES = 0.539957;
var DEFAULT_OL_PROJECTION_CODE = "EPSG:3857";
var GAME_SPEED_DELAY_MS = {
  1: 1e3,
  2: 500,
  4: 250,
  8: 125,
  100: 0
};
var RECORDING_INTERVALS_SECONDS = [
  1,
  10,
  30,
  60,
  300,
  600,
  3600
];
var APP_DRAWER_WIDTH = 352;
var APP_GUIDE_RAIL_WIDTH = 264;
var APP_DISPLAY_NAME = "VISTA";
var APP_FULL_NAME = "Visualized Intelligence for Situational Tactical Awareness";
var colorPalette = {
  lightGray: "#07171D",
  darkGray: "#10434C",
  black: "#D8FAF6",
  white: "#0D2129"
};

// js/vendor/kairos/src/game/db/facilityThreatProfiles.ts
function profile(className, range, detectionArcDegrees, sourceUrl, sourceNote) {
  return {
    className,
    range,
    detectionArcDegrees,
    sourceUrl,
    sourceNote
  };
}
var FACILITY_THREAT_PROFILES = [
  profile(
    "Chunmoo MRLS",
    80,
    120,
    "https://www.hanwha.com/en/business/defense/chunmoo.do",
    "Hanwha public product page"
  ),
  profile(
    "Tactical Surface to Surface Missile Launcher",
    180,
    90,
    "https://www.dapa.go.kr/dapa/na/ntt/selectNttInfo.do?bbsId=326&menuId=678&nttSn=33445",
    "DAPA tactical surface-to-surface missile program page"
  ),
  profile("L-SAM", 150, 150, "https://www.hanwha.com/companies/hanwha-aerospace.do?nlsFlag=gnb"),
  profile(
    "Cheongung-II (KM-SAM Block II)",
    65,
    150,
    "https://www.lignex1.com/news/nex1newsView.do?bbs_no=7024",
    "LIG Nex1 export announcement for Cheongung-II"
  ),
  profile(
    "Cheongung (M-SAM)",
    45,
    150,
    "https://www.dapa.go.kr/dapa/index.do?menuSeq=3074",
    "DAPA public policy page references all-direction response"
  ),
  profile(
    "Pegasus (K-SAM)",
    10,
    100,
    "https://www.lignex1.com/business/gddWpnList.do"
  ),
  profile(
    "Biho Hybrid",
    6,
    100,
    "https://www.lignex1.com/business/gddWpnList.do"
  ),
  profile("K2 Black Panther", 8, 100),
  profile("KM900 APC", 6, 90),
  profile("M113A1", 5, 90),
  profile("M577 Command Vehicle", 6, 90),
  profile(
    "S-400 Triumf",
    200,
    140,
    "https://roe.ru/en/production/protivovozdushnaya-oborona/zenitnye-raketnye-kompleksy-i-ustanovki/zenitnye-raketnye-sistemy-dalnego-deystviya/s-400-triumf/",
    "Official export-family reference"
  ),
  profile(
    "S-300V4",
    200,
    140,
    "https://roe.ru/en/production/protivovozdushnaya-oborona/zenitnye-raketnye-kompleksy-i-ustanovki/zenitnye-raketnye-sistemy-dalnego-deystviya/antey-4000/?theme=theme-lightblue",
    "Antey-4000 export-family reference"
  ),
  profile("S-500 Prometey", 200, 150),
  profile("Buk-M3", 50, 120),
  profile("Tor-M2", 10, 100),
  profile("Pantsir-S1", 10, 100),
  profile("HQ-9", 200, 140),
  profile("HQ-19", 200, 150),
  profile("HQ-16", 50, 120),
  profile("HQ-17", 10, 100),
  profile("HQ-7", 10, 100),
  profile(
    "MIM-104 Patriot",
    200,
    140,
    "https://www.rtx.com/raytheon/what-we-do/integrated-air-and-missile-defense/global-patriot-solutions",
    "Raytheon product page"
  ),
  profile(
    "THAAD",
    200,
    160,
    "https://www.lockheedmartin.com/en-us/products/thaad/thaad-media-kit.html",
    "Lockheed Martin THAAD media kit"
  ),
  profile(
    "Aster 30",
    50,
    160,
    "https://www.mbda-systems.com/products/area-protection/aster-family/aster-30",
    "MBDA product page notes 360 coverage"
  ),
  profile("Barak 8", 50, 150),
  profile(
    "NASAMS",
    50,
    140,
    "https://www.kongsberg.com/kda/news/news-archive/2020/hungary-selects-kongsberg-and-raytheon-missiles--defense-for-medium-range-air-defense/",
    "Kongsberg NASAMS medium-range reference"
  )
];
var facilityThreatProfileMap = new Map(
  FACILITY_THREAT_PROFILES.map((profileEntry) => [
    profileEntry.className,
    profileEntry
  ])
);
function getFacilityThreatProfile(className) {
  if (!className) return void 0;
  return facilityThreatProfileMap.get(className);
}
function getFacilityThreatRange(className, fallbackRange = 250) {
  return getFacilityThreatProfile(className)?.range ?? fallbackRange;
}
function getFacilityDetectionArcDegrees(className, fallbackArc = 120) {
  return getFacilityThreatProfile(className)?.detectionArcDegrees ?? fallbackArc;
}
function kmToNm(km) {
  return Number((km * KILOMETERS_TO_NAUTICAL_MILES).toFixed(2));
}

// js/vendor/kairos/src/utils/publicAssetUrl.ts
var FALLBACK_BASE_URL = "http://localhost/";
function getDocumentBaseUrl() {
  if (typeof document !== "undefined" && typeof document.baseURI === "string") {
    return document.baseURI;
  }
  if (typeof window !== "undefined" && typeof window.location?.href === "string") {
    return window.location.href;
  }
  return FALLBACK_BASE_URL;
}
function getPublicAssetBaseUrl() {
  return new URL(globalThis.__KAIROS_ENV__.BASE_URL, getDocumentBaseUrl());
}
function resolvePublicAssetPath(path) {
  const rawPath = `${path ?? ""}`.trim();
  if (!rawPath || /^[a-z]+:/i.test(rawPath)) {
    return rawPath;
  }
  const baseUrl = getPublicAssetBaseUrl();
  const basePath = baseUrl.pathname.endsWith("/") ? baseUrl.pathname : `${baseUrl.pathname}/`;
  const absolutePath = rawPath.startsWith("/") ? rawPath : `/${rawPath}`;
  if (basePath !== "/" && absolutePath.startsWith(basePath)) {
    return absolutePath;
  }
  const resolvedUrl = new URL(rawPath.replace(/^\/+/, ""), baseUrl);
  return `${resolvedUrl.pathname}${resolvedUrl.search}${resolvedUrl.hash}`;
}
function buildPublicAssetPath(path, searchParams) {
  const resolvedPath = resolvePublicAssetPath(path);
  if (!searchParams || searchParams.size === 0) {
    return resolvedPath;
  }
  const resolvedUrl = new URL(resolvedPath, FALLBACK_BASE_URL);
  resolvedUrl.search = searchParams.toString();
  return `${resolvedUrl.pathname}${resolvedUrl.search}${resolvedUrl.hash}`;
}

// js/vendor/kairos/src/gui/sudo/sudoAssistantVulnerabilityIntel.ts
var SUDO_ASSISTANT_VULNERABILITY_SOURCE_NAME = "6-1 240mm \uBC0F 152mm \uCDE8\uC57D\uC810";
var SUDO_ASSISTANT_T72_VULNERABILITY_SOURCE_NAME = "T-72 \uC804\uCC28 \uCDE8\uC57D\uC810 \uBD84\uC11D \uBAA9\uC5C5";
var SUDO_ASSISTANT_T72_VULNERABILITY_IMAGE_SRC = resolvePublicAssetPath("/sudo_data/260626_senario_v2/\uCC28 \uCDE8\uC57D\uC810.png");
var SUDO_ASSISTANT_VULNERABILITY_ASSET_ROOT = "/sudo_data/_extracted/assets/6-1 240mm \uBC0F 152mm \uCDE8\uC57D\uC810/ppt_media";
function vulnerabilityAsset(filename) {
  return resolvePublicAssetPath(
    `${SUDO_ASSISTANT_VULNERABILITY_ASSET_ROOT}/${filename}`
  );
}
var SUDO_ASSISTANT_240MM_VULNERABILITY_CARDS = [
  {
    target: "240mm \uBC29\uC0AC\uD3EC",
    factor: "\uBC1C\uC0AC \uC704\uCE58 \uB178\uCD9C",
    evidence: "\uBC1C\uC0AC \uC2DC \uD654\uC5FC, \uC5F0\uAE30, \uC18C\uC74C, \uC5F4\uC6D0(IR), \uD0C4\uB3C4 \uADA4\uC801\uC73C\uB85C \uC704\uCE58\uAC00 \uB178\uCD9C",
    impact: "\uB300\uD3EC\uBCD1 \uB808\uC774\uB354, \uD56D\uACF5\uC815\uCC30, \uB4DC\uB860 \uD0C0\uACA9\uC758 \uC989\uC751 \uD45C\uC801\uC774 \uB428",
    grade: "\uC0C1",
    source: `${SUDO_ASSISTANT_VULNERABILITY_SOURCE_NAME} / Slide 1`,
    assetId: "s6-240mm-vulnerability"
  },
  {
    target: "240mm \uBC29\uC0AC\uD3EC",
    factor: "\uC7AC\uC7A5\uC804 \uC2DC\uAC04 \uBB38\uC81C",
    evidence: "\uB85C\uCF13\uC774 \uD06C\uACE0 \uBB34\uAC70\uC6CC \uC7AC\uC7A5\uC804 \uC2DC\uAC04\uC774 \uAE38\uACE0 \uD0C4\uC57D\uCC28\xB7\uC778\uB825\xB7\uC7A5\uBE44\uAC00 \uD544\uC694",
    impact: "\uCD08\uD0C4 \uC77C\uC81C\uC0AC\uACA9 \uC774\uD6C4 \uC5F0\uC18D \uAD50\uC804 \uC9C0\uC18D\uC131\uC774 \uC81C\uD55C\uB428",
    grade: "\uC0C1",
    source: `${SUDO_ASSISTANT_VULNERABILITY_SOURCE_NAME} / Slide 1`,
    assetId: "s6-240mm-vulnerability"
  },
  {
    target: "240mm \uBC29\uC0AC\uD3EC",
    factor: "\uAE30\uB3D9\uC131 \uD55C\uACC4",
    evidence: "\uB300\uD615 \uCC28\uB95C\uD615 TEL \uCC28\uCCB4\uB85C \uB3C4\uB85C, \uD5D8\uC9C0, \uC9C4\uCC3D, \uB3C4\uD558 \uC870\uAC74\uC758 \uC81C\uC57D\uC774 \uD07C",
    impact: "\uC2E0\uC18D\uD55C Shoot & Scoot \uC9C0\uC5F0\uC73C\uB85C \uC0DD\uC874\uC131\uC774 \uC800\uD558\uB428",
    grade: "\uC911",
    source: `${SUDO_ASSISTANT_VULNERABILITY_SOURCE_NAME} / Slide 1`,
    assetId: "s6-240mm-vulnerability"
  },
  {
    target: "240mm \uBC29\uC0AC\uD3EC",
    factor: "\uC815\uBC00\uB3C4 \uD55C\uACC4",
    evidence: "\uAD11\uC5ED \uC81C\uC555\uC5D0\uB294 \uD6A8\uACFC\uC801\uC774\uB098 \uBB34\uC720\uB3C4 \uAD6C\uD615 \uCCB4\uACC4\uB294 \uD0C4\uCC29 \uC624\uCC28\uAC00 \uD07C",
    impact: "\uC774\uB3D9 \uD45C\uC801, \uC18C\uADDC\uBAA8 \uD45C\uC801, \uAC15\uD654 \uC9C4\uC9C0 \uD0C0\uACA9 \uD6A8\uC728\uC774 \uB0AE\uC544\uC9D0",
    grade: "\uC911",
    source: `${SUDO_ASSISTANT_VULNERABILITY_SOURCE_NAME} / Slide 1`,
    assetId: "s6-240mm-vulnerability"
  },
  {
    target: "240mm \uBC29\uC0AC\uD3EC",
    factor: "\uD0C4\uC57D\xB7\uBB3C\uB958 \uBD80\uB2F4",
    evidence: "\uB85C\uCF13 \uBD80\uD53C\uC640 \uC911\uB7C9\uC774 \uCEE4 \uC800\uC7A5, \uC6B4\uBC18, \uBCF4\uAE09\uC120 \uC720\uC9C0 \uBD80\uB2F4\uC774 \uD07C",
    impact: "\uD0C4\uC57D\uACE0\xB7\uC5F0\uB8CC\xB7\uC218\uC1A1 \uCC28\uB2E8 \uC2DC \uD654\uB825 \uC720\uC9C0\uAC00 \uC5B4\uB824\uC6C0",
    grade: "\uC911",
    source: `${SUDO_ASSISTANT_VULNERABILITY_SOURCE_NAME} / Slide 1`,
    assetId: "s6-240mm-vulnerability"
  },
  {
    target: "240mm \uBC29\uC0AC\uD3EC",
    factor: "\uB4DC\uB860 \uC2DC\uB300\uC758 \uCDE8\uC57D\uC131",
    evidence: "\uC815\uCC30\xB7\uACF5\uACA9 \uB4DC\uB860 \uBC1C\uC804\uC73C\uB85C \uBC1C\uC0AC \uC900\uBE44\uC640 \uC7AC\uC7A5\uC804 \uC704\uCE58 \uD0D0\uC9C0 \uC704\uD5D8\uC774 \uC99D\uAC00",
    impact: "\uC7AC\uC7A5\uC804 \uC911 \uC740\uD3D0\uAC00 \uBBF8\uD761\uD558\uBA74 \uCD94\uC801\xB7\uC2DD\uBCC4\xB7\uC9C1\uC811\uD0C0\uACA9 \uAC00\uB2A5\uC131\uC774 \uB192\uC544\uC9D0",
    grade: "\uC0C1",
    source: `${SUDO_ASSISTANT_VULNERABILITY_SOURCE_NAME} / Slide 1`,
    assetId: "s6-240mm-vulnerability"
  },
  {
    target: "240mm \uBC29\uC0AC\uD3EC",
    factor: "\uAE30\uC0C1 \uC601\uD5A5",
    evidence: "\uBC14\uB78C, \uC628\uB3C4, \uAE30\uC555 \uB4F1 \uAE30\uC0C1\uC870\uAC74\uC774 \uC7A5\uAC70\uB9AC \uB85C\uCF13 \uD0C4\uCC29 \uC624\uCC28\uB97C \uD0A4\uC6C0",
    impact: "\uC0AC\uAC70\uB9AC \uBCC0\uB3D9\uACFC \uBA85\uC911 \uC815\uD655\uB3C4 \uC800\uD558\uB85C \uBCF4\uC815 \uC18C\uC694\uAC00 \uCEE4\uC9D0",
    grade: "\uC911",
    source: `${SUDO_ASSISTANT_VULNERABILITY_SOURCE_NAME} / Slide 1`,
    assetId: "s6-240mm-vulnerability"
  },
  {
    target: "240mm \uBC29\uC0AC\uD3EC",
    factor: "\uAE30\uD0C0 \uCDE8\uC57D \uC694\uC18C",
    evidence: "\uC804\uC790\uC804, \uD1B5\uC2E0 \uC758\uC874\uC131, \uC2B9\uBB34\uC6D0 \uB178\uCD9C, \uC7A5\uBE44 \uB178\uD6C4\uD654\uAC00 \uBCF5\uD569 \uC791\uC6A9",
    impact: "\uC804\uD22C \uD6A8\uC728\uACFC \uC784\uBB34 \uC9C0\uC18D\uC131\uC774 \uB3D9\uC2DC\uC5D0 \uAC10\uC18C\uD568",
    grade: "\uC911",
    source: `${SUDO_ASSISTANT_VULNERABILITY_SOURCE_NAME} / Slide 1`,
    assetId: "s6-240mm-vulnerability"
  }
];
var SUDO_ASSISTANT_152MM_VULNERABILITY_CARDS = [
  {
    target: "152mm \uC790\uC8FC\uD3EC",
    factor: "\uBC1C\uC0AC \uC704\uCE58 \uB178\uCD9C",
    evidence: "\uD3EC\uAD6C \uD654\uC5FC, \uD3ED\uC74C, \uC5F0\uAE30, \uC5F4\uC6D0(IR), \uD0C4\uB3C4 \uADA4\uC801\uC73C\uB85C \uC704\uCE58\uAC00 \uB178\uCD9C",
    impact: "\uB300\uD3EC\uBCD1 \uC0AC\uACA9, \uB4DC\uB860, \uD56D\uACF5\uACF5\uACA9\uC758 \uD0D0\uC9C0 \uB2E8\uC11C\uAC00 \uB428",
    grade: "\uC0C1",
    source: `${SUDO_ASSISTANT_VULNERABILITY_SOURCE_NAME} / Slide 5`,
    assetId: "s6-152mm-vulnerability"
  },
  {
    target: "152mm \uC790\uC8FC\uD3EC",
    factor: "\uC7A5\uAC70\uB9AC \uD654\uB825 \uC5F4\uC138",
    evidence: "\uC0AC\uAC70\uB9AC, \uC815\uBC00\uB3C4, \uC0AC\uACA9\uD1B5\uC81C\uC7A5\uCE58\uAC00 \uCD5C\uC2E0 K9\uAE09 \uCCB4\uACC4\uBCF4\uB2E4 \uC5F4\uC138",
    impact: "\uC6D0\uAC70\uB9AC \uAD50\uC804\uACFC \uC815\uBC00 \uD45C\uC801 \uAC31\uC2E0 \uC18D\uB3C4\uC5D0\uC11C \uBD88\uB9AC\uD568",
    grade: "\uC0C1",
    source: `${SUDO_ASSISTANT_VULNERABILITY_SOURCE_NAME} / Slide 5`,
    assetId: "s6-152mm-vulnerability"
  },
  {
    target: "152mm \uC790\uC8FC\uD3EC",
    factor: "\uAE30\uB3D9\uC131 \uC81C\uD55C",
    evidence: "\uAD6C\uD615 \uADA4\uB3C4\uD615 \uCC28\uCCB4\uB294 \uC18D\uB3C4\uAC00 \uB290\uB9AC\uACE0 \uC5F0\uB8CC \uC18C\uBAA8\uC640 \uACE0\uC7A5 \uAC00\uB2A5\uC131\uC774 \uD07C",
    impact: "\uC9C4\uC9C0 \uBCC0\uACBD\uACFC \uD5D8\uC9C0 \uC8FC\uD589\uC774 \uB2A6\uC5B4 \uC0DD\uC874\uC131\uC774 \uC800\uD558\uB428",
    grade: "\uC911",
    source: `${SUDO_ASSISTANT_VULNERABILITY_SOURCE_NAME} / Slide 5`,
    assetId: "s6-152mm-vulnerability"
  },
  {
    target: "152mm \uC790\uC8FC\uD3EC",
    factor: "\uC7AC\uBCF4\uAE09 \uBD80\uB2F4",
    evidence: "152mm \uD3EC\uD0C4\uC740 \uBB34\uAC81\uACE0 \uBD80\uD53C\uAC00 \uCEE4 \uD0C4\uC57D\uCC28, \uC5F0\uB8CC\uCC28, \uC815\uBE44 \uC778\uB825\uC774 \uD544\uC694",
    impact: "\uBCF4\uAE09\uC120 \uCC28\uB2E8 \uC2DC \uC9C0\uC18D \uC0AC\uACA9 \uB2A5\uB825\uC774 \uAE09\uACA9\uD788 \uB5A8\uC5B4\uC9D0",
    grade: "\uC911",
    source: `${SUDO_ASSISTANT_VULNERABILITY_SOURCE_NAME} / Slide 5`,
    assetId: "s6-152mm-vulnerability"
  },
  {
    target: "152mm \uC790\uC8FC\uD3EC",
    factor: "\uB4DC\uB860 \uC704\uD611 \uC99D\uAC00",
    evidence: "\uC815\uCC30 \uB4DC\uB860\uC73C\uB85C \uC704\uCE58 \uD0D0\uC9C0 \uD6C4 FPV\xB7\uACF5\uACA9 \uB4DC\uB860 \uC9C1\uC811 \uD0C0\uACA9\uC774 \uAC00\uB2A5",
    impact: "\uC704\uC7A5\uB418\uC9C0 \uC54A\uC740 \uC0C1\uD0DC\uC5D0\uC11C \uC0DD\uC874\uC131\uC774 \uB9E4\uC6B0 \uB0AE\uC544\uC9D0",
    grade: "\uC0C1",
    source: `${SUDO_ASSISTANT_VULNERABILITY_SOURCE_NAME} / Slide 5`,
    assetId: "s6-152mm-vulnerability"
  },
  {
    target: "152mm \uC790\uC8FC\uD3EC",
    factor: "\uC0C1\uBD80 \uC7A5\uAC11 \uCDE8\uC57D",
    evidence: "\uC804\uCC28\uBCF4\uB2E4 \uC7A5\uAC11\uC774 \uC587\uACE0 \uC0C1\uBD80\uAC00 \uB4DC\uB860, \uD3EC\uD0C4 \uD30C\uD3B8, \uC0C1\uBD80\uACF5\uACA9\uC5D0 \uC57D\uD568",
    impact: "\uC0AC\uACA9 \uD6C4 \uC989\uC2DC \uC774\uB3D9\uD558\uC9C0 \uBABB\uD558\uBA74 \uBC18\uACA9 \uD53C\uD574\uAC00 \uCEE4\uC9D0",
    grade: "\uC0C1",
    source: `${SUDO_ASSISTANT_VULNERABILITY_SOURCE_NAME} / Slide 5`,
    assetId: "s6-152mm-vulnerability"
  },
  {
    target: "152mm \uC790\uC8FC\uD3EC",
    factor: "\uC9C0\uD718\uD1B5\uC81C(C4ISR) \uC5F4\uC138",
    evidence: "\uC218\uB3D9\xB7\uC544\uB0A0\uB85C\uADF8 \uC704\uC8FC\uC758 \uC815\uBCF4 \uD68D\uB4DD, \uACF5\uC720, \uD45C\uC801 \uACBD\uC2E0 \uC18D\uB3C4\uAC00 \uB290\uB9BC",
    impact: "\uB2E4\uC218 \uD45C\uC801 \uB3D9\uC2DC \uB300\uC751\uACFC \uC2E4\uC2DC\uAC04 \uC0AC\uACA9 \uB2A5\uB825\uC774 \uC81C\uD55C\uB428",
    grade: "\uC911",
    source: `${SUDO_ASSISTANT_VULNERABILITY_SOURCE_NAME} / Slide 5`,
    assetId: "s6-152mm-vulnerability"
  },
  {
    target: "152mm \uC790\uC8FC\uD3EC",
    factor: "\uAE30\uC0C1 \uC601\uD5A5",
    evidence: "\uAE30\uC628, \uAE30\uC555, \uD48D\uC18D, \uC2B5\uB3C4, \uAC15\uC218 \uC870\uAC74\uC5D0 \uB530\uB77C \uD0C4\uCC29 \uC624\uCC28\uAC00 \uC99D\uAC00",
    impact: "\uC0AC\uAC70\uB9AC\uAC00 \uAE38\uC5B4\uC9C8\uC218\uB85D \uC624\uCC28 \uB204\uC801\uACFC \uBCF4\uC815 \uBD80\uB2F4\uC774 \uCEE4\uC9D0",
    grade: "\uC911",
    source: `${SUDO_ASSISTANT_VULNERABILITY_SOURCE_NAME} / Slide 5`,
    assetId: "s6-152mm-vulnerability"
  }
];
var SUDO_ASSISTANT_T72_VULNERABILITY_CARDS = [
  {
    target: "T-72 \uC804\uCC28",
    factor: "\uC0C1\uBD80 \uC7A5\uAC11 \uCDE8\uC57D",
    evidence: "\uD3EC\uD0D1\uACFC \uCC28\uCCB4 \uC0C1\uBA74 \uBC29\uD638\uAC00 \uC0C1\uB300\uC801\uC73C\uB85C \uC587\uC544 \uC0C1\uBD80 \uAD00\uCE21\xB7\uD0C0\uACA9\uC5D0 \uCDE8\uC57D",
    impact: "\uB4DC\uB860 \uAD00\uCE21\uACFC \uC0C1\uBD80\uACF5\uACA9 \uACC4\uC5F4 \uC704\uD611\uC5D0 \uB178\uCD9C\uB420 \uB54C \uC0DD\uC874\uC131\uC774 \uAE09\uAC10",
    grade: "\uC0C1",
    source: `${SUDO_ASSISTANT_T72_VULNERABILITY_SOURCE_NAME} / \uC601\uC0C1 \uC2DD\uBCC4 \uD504\uB808\uC784`,
    assetId: "s6-t72-vulnerability"
  },
  {
    target: "T-72 \uC804\uCC28",
    factor: "\uCE21\uD6C4\uBA74 \uBC29\uD638 \uC57D\uC810",
    evidence: "\uCE21\uBA74 \uC2A4\uCEE4\uD2B8\uC640 \uD6C4\uBC29 \uC5D4\uC9C4\uB8F8\uC740 \uC804\uBA74 \uC7A5\uAC11\uBCF4\uB2E4 \uBC29\uD638 \uC5EC\uC720\uAC00 \uC791\uC74C",
    impact: "\uC6B0\uD68C \uAD00\uCE21\xB7\uCE21\uD6C4\uBC29 \uD654\uB825 \uC9D1\uC911 \uC2DC \uAE30\uB3D9 \uC9C0\uC18D\uC131\uC774 \uB0AE\uC544\uC9D0",
    grade: "\uC0C1",
    source: `${SUDO_ASSISTANT_T72_VULNERABILITY_SOURCE_NAME} / \uC601\uC0C1 \uC2DD\uBCC4 \uD504\uB808\uC784`,
    assetId: "s6-t72-vulnerability"
  },
  {
    target: "T-72 \uC804\uCC28",
    factor: "\uADA4\uB3C4\xB7\uD604\uC218\uC7A5\uCE58 \uB178\uCD9C",
    evidence: "\uADA4\uB3C4\uC640 \uAD6C\uB3D9\uB95C\uC774 \uC678\uBD80\uC5D0 \uB178\uCD9C\uB418\uC5B4 \uD30C\uD3B8\xB7\uC9C1\uACA9 \uC190\uC0C1\uC5D0 \uCDE8\uC57D",
    impact: "\uAE30\uB3D9 \uBD88\uB2A5 \uC0C1\uD0DC\uAC00 \uB418\uBA74 \uD6C4\uC18D \uC815\uBC00\uD0C0\uACA9\uACFC \uD3EC\uD68D \uC704\uD5D8\uC774 \uC99D\uAC00",
    grade: "\uC0C1",
    source: `${SUDO_ASSISTANT_T72_VULNERABILITY_SOURCE_NAME} / \uC601\uC0C1 \uC2DD\uBCC4 \uD504\uB808\uC784`,
    assetId: "s6-t72-vulnerability"
  },
  {
    target: "T-72 \uC804\uCC28",
    factor: "\uD0C4\uC57D \uC801\uC7AC \uAD6C\uC870 \uC704\uD5D8",
    evidence: "\uCC28\uCCB4 \uB0B4\uBD80 \uD0C4\uC57D \uC801\uC7AC\uBD80 \uD53C\uACA9 \uC2DC 2\uCC28 \uD3ED\uBC1C \uAC00\uB2A5\uC131\uC774 \uCEE4\uC9D0",
    impact: "\uAD00\uD1B5 \uD53C\uD574\uAC00 \uB2E8\uC77C \uCC28\uB7C9 \uC190\uC2E4\uC744 \uB118\uC5B4 \uB300\uD615 \uD3ED\uBC1C \uD53C\uD574\uB85C \uD655\uB300 \uAC00\uB2A5",
    grade: "\uC0C1",
    source: `${SUDO_ASSISTANT_T72_VULNERABILITY_SOURCE_NAME} / \uC804\uCC28 \uCDE8\uC57D\uC810 \uBD84\uC11D`,
    assetId: "s6-t72-vulnerability"
  },
  {
    target: "T-72 \uC804\uCC28",
    factor: "\uAD00\uCE21\uC7A5\uBE44 \uC81C\uD55C",
    evidence: "\uC5F0\uB9C9, \uC9C0\uD615 \uCC28\uD3D0, \uC57C\uAC04\xB7\uBA3C\uC9C0 \uD658\uACBD\uC5D0\uC11C \uD45C\uC801 \uD0D0\uC9C0\uC640 \uC0C1\uD669\uC778\uC2DD\uC774 \uC81C\uD55C",
    impact: "\uBCF4\uBCD1\xB7\uB4DC\uB860\xB7\uAC04\uC811\uD654\uB825 \uC5F0\uACC4 \uC704\uD611\uC5D0 \uB300\uD55C \uBC18\uC751 \uC2DC\uAC04\uC774 \uB2A6\uC5B4\uC9D0",
    grade: "\uC911",
    source: `${SUDO_ASSISTANT_T72_VULNERABILITY_SOURCE_NAME} / \uC804\uCC28 \uCDE8\uC57D\uC810 \uBD84\uC11D`,
    assetId: "s6-t72-vulnerability"
  },
  {
    target: "T-72 \uC804\uCC28",
    factor: "\uC815\uBE44\xB7\uBCF4\uAE09 \uC758\uC874",
    evidence: "\uADA4\uB3C4 \uC7A5\uBE44 \uD2B9\uC131\uC0C1 \uC5F0\uB8CC, \uC815\uBE44, \uBCF5\uAD6C\uCC28\uB7C9 \uC9C0\uC6D0 \uC758\uC874\uB3C4\uAC00 \uD07C",
    impact: "\uBCF4\uAE09\uC120 \uCC28\uB2E8 \uB610\uB294 \uBCF5\uAD6C \uC9C0\uC5F0 \uC2DC \uC804\uD22C \uC9C0\uC18D\uC131\uC774 \uBE60\uB974\uAC8C \uC800\uD558",
    grade: "\uC911",
    source: `${SUDO_ASSISTANT_T72_VULNERABILITY_SOURCE_NAME} / \uC804\uCC28 \uCDE8\uC57D\uC810 \uBD84\uC11D`,
    assetId: "s6-t72-vulnerability"
  }
];
var SUDO_ASSISTANT_VULNERABILITY_EVIDENCE_IMAGES = [
  {
    id: "s6-240mm-vulnerability",
    title: "240mm \uBC29\uC0AC\uD3EC \uCDE8\uC57D\uC810 \uC6D0\uC790\uB8CC",
    source: SUDO_ASSISTANT_VULNERABILITY_SOURCE_NAME,
    tag: "240MM",
    src: vulnerabilityAsset("image3.png")
  },
  {
    id: "s6-152mm-vulnerability",
    title: "152mm \uC790\uC8FC\uD3EC \uCDE8\uC57D\uC810 \uC6D0\uC790\uB8CC",
    source: SUDO_ASSISTANT_VULNERABILITY_SOURCE_NAME,
    tag: "152MM",
    src: vulnerabilityAsset("image5.png")
  },
  {
    id: "s6-152mm-system",
    title: "152mm \uC2DC\uC2A4\uD15C \uCDE8\uC57D\uC810",
    source: `${SUDO_ASSISTANT_VULNERABILITY_SOURCE_NAME} / Slide 6`,
    tag: "SYS",
    src: vulnerabilityAsset("image6.png")
  },
  {
    id: "s6-t72-vulnerability",
    title: "T-72 \uC804\uCC28 \uCDE8\uC57D\uC810 \uBD84\uC11D \uC6D0\uC790\uB8CC",
    source: SUDO_ASSISTANT_T72_VULNERABILITY_SOURCE_NAME,
    tag: "T-72",
    src: SUDO_ASSISTANT_T72_VULNERABILITY_IMAGE_SRC
  }
];
function toSourceTable(title, rows) {
  return {
    title,
    columns: [
      { key: "target", label: "\uB300\uC0C1" },
      { key: "factor", label: "\uCDE8\uC57D\uC694\uC18C" },
      { key: "evidence", label: "\uADFC\uAC70" },
      { key: "impact", label: "\uC791\uC804\uD6A8\uACFC" },
      { key: "grade", label: "\uC6B0\uC120\uB3C4" },
      { key: "source", label: "\uC6D0\uCC9C" }
    ],
    rows: rows.map((row) => ({ ...row }))
  };
}
function buildSudoAssistantVulnerabilitySourceTables() {
  return [
    toSourceTable(
      "6-1 240mm \uBC29\uC0AC\uD3EC \uCDE8\uC57D\uC810 \uC6D0\uBCF8 \uCE74\uB4DC",
      SUDO_ASSISTANT_240MM_VULNERABILITY_CARDS
    ),
    toSourceTable(
      "6-1 152mm \uC790\uC8FC\uD3EC \uBE44\uAD50 \uCDE8\uC57D\uC810 \uC6D0\uBCF8 \uCE74\uB4DC",
      SUDO_ASSISTANT_152MM_VULNERABILITY_CARDS
    )
  ];
}
function getSudoAssistantVulnerabilityCardsForTarget(targetLabel) {
  const normalized = String(targetLabel ?? "").replace(/\s+/g, "");
  if (/t-?72|전차|tank/i.test(normalized)) {
    return SUDO_ASSISTANT_T72_VULNERABILITY_CARDS;
  }
  if (normalized.includes("152mm") || normalized.includes("152\uBC00\uB9AC")) {
    return SUDO_ASSISTANT_152MM_VULNERABILITY_CARDS;
  }
  return SUDO_ASSISTANT_240MM_VULNERABILITY_CARDS;
}

// js/vendor/kairos/src/gui/sudo/sudoSourceDisplay.ts
var SUDO_SOURCE_LABEL_REPLACEMENTS = [
  [/senario\.pdf\s*#\s*(\d+)/gi, "\uC6D0\uC790\uB8CC #$1"],
  [/senario\.pdf\s+page[_\s-]*(\d+)/gi, "\uC6D0\uC790\uB8CC $1\uCABD"],
  [/PDF\s+page[_\s-]*(\d+)/gi, "\uC6D0\uC790\uB8CC $1\uCABD"],
  [/page[_\s-]*(\d+)\s+OCR/gi, "\uC6D0\uC790\uB8CC $1\uCABD OCR"],
  [/page[_\s-]*(\d+)\s+figure/gi, "\uC6D0\uC790\uB8CC $1\uCABD figure"],
  [/senario\.pdf/gi, "\uC6D0\uC790\uB8CC"],
  [/(^|\s)PDF(?=\s|$)/gi, "$1\uC6D0\uC790\uB8CC"]
];
function formatSudoSourceDisplayLabel(value) {
  return SUDO_SOURCE_LABEL_REPLACEMENTS.reduce(
    (label, [pattern, replacement]) => label.replace(pattern, replacement),
    value
  ).trim();
}
function summarizeSudoSourceDisplayValues(items, limit = 3, separator = " / ") {
  const values = items.map((item) => formatSudoSourceDisplayLabel(item)).map((item) => item.trim()).filter(Boolean);
  const visible = values.slice(0, limit);
  const hidden = values.length - visible.length;
  return [...visible, ...hidden > 0 ? [`+${hidden}\uAC74`] : []].join(separator);
}

// js/vendor/kairos/src/gui/sudo/sudoBdaIntel.ts
var SUDO_BDA_SOURCE_NAME = "senario.pdf page 06 \uD0C0\uACA9\uACB0\uACFC \uD3C9\uAC00";
var SUDO_BDA_SOURCE_PATH = "client/public/sudo_data/md/sources/senario.md";
var SUDO_BDA_FIGURE_ID = "page_06_figure_10_xref_154";
function buildSudoBdaSourceTable(inputs) {
  const damageGap = Math.max(
    0,
    inputs.bdaRequiredDamagePercent - inputs.observedDamagePercent
  );
  const targetGap = Math.max(0, inputs.remainingTargets - 2);
  return {
    title: "\uD0C0\uACA9\uACB0\uACFC \uD3C9\uAC00 \uC6D0\uBCF8\uADFC\uAC70",
    columns: [
      { key: "item", label: "\uADFC\uAC70\uD56D\uBAA9" },
      { key: "observed", label: "\uAD00\uCE21/\uC785\uB825" },
      { key: "criteria", label: "\uAE30\uC900" },
      { key: "grade", label: "\uD310\uC815" },
      { key: "source", label: "\uCD9C\uCC98" }
    ],
    rows: [
      {
        item: "\uC785\uB825 DATA",
        observed: "\uD0C0\uACA9\uACB0\uACFC \uC601\uC0C1 \uC81C\uC2DC",
        criteria: "DRONE-10 \uC7AC\uAD00\uCE21",
        grade: "BDA \uC785\uB825",
        source: formatSudoSourceDisplayLabel(
          `${SUDO_BDA_SOURCE_NAME} figure ${SUDO_BDA_FIGURE_ID}`
        )
      },
      {
        item: "\uC601\uC0C1\uD310\uB3C5",
        observed: "\uC804\uCC28 1\uB300 \uC644\uD30C / \uBCD1\uB825 5\uBA85 \uC804\uD22C\uBD88\uB2A5",
        criteria: "AI \uD310\uB3C5 \uACB0\uACFC",
        grade: "\uD53C\uD574 \uC2DD\uBCC4",
        source: formatSudoSourceDisplayLabel(`${SUDO_BDA_SOURCE_NAME} OCR`)
      },
      {
        item: "\uD53C\uD574\uC728",
        observed: `${inputs.observedDamagePercent}%`,
        criteria: `${inputs.bdaRequiredDamagePercent}% \uC774\uC0C1`,
        grade: damageGap > 0 ? `${damageGap}%p \uBBF8\uB2EC` : "\uCDA9\uC871",
        source: formatSudoSourceDisplayLabel(
          `${SUDO_BDA_SOURCE_NAME} \uC694\uB9DD\uD6A8\uACFC 30%`
        )
      },
      {
        item: "\uC794\uC5EC\uD45C\uC801",
        observed: `${inputs.remainingTargets}\uB300`,
        criteria: "2\uB300 \uC774\uD558",
        grade: targetGap > 0 ? `${targetGap}\uB300 \uCD08\uACFC` : "\uCDA9\uC871",
        source: formatSudoSourceDisplayLabel(
          `${SUDO_BDA_SOURCE_NAME} \uC794\uC5EC\uD45C\uC801 \uC7AC\uD68D\uB4DD`
        )
      },
      {
        item: "\uD6C4\uC18D\uC870\uCE58",
        observed: damageGap > 0 || targetGap > 0 ? "\uC7AC\uD0C0\uACA9 \uC2DC\uD589" : "\uAC10\uC2DC \uC720\uC9C0",
        criteria: "\uC694\uB9DD\uD6A8\uACFC \uB2EC\uC131",
        grade: damageGap > 0 || targetGap > 0 ? "\uC7AC\uD0C0\uACA9" : "\uBCF4\uB958",
        source: formatSudoSourceDisplayLabel(
          `${SUDO_BDA_SOURCE_NAME} \uC694\uAD6C\uB0B4\uC6A9`
        )
      }
    ]
  };
}

// js/vendor/kairos/src/gui/sudo/sudoCollateralCdeTable.ts
var SUDO_COLLATERAL_CDE_SOURCE_NAME = "5-1 \uD0C4\uC885\uBCC4 \uBD80\uC218\uC801 \uD6A8\uACFC\uBC18\uACBD";
var SUDO_COLLATERAL_CDE_SOURCE_PATH = "sudo_data/md/sources/5-1 \uD0C4\uC885\uBCC4 \uBD80\uC218\uC801 \uD6A8\uACFC\uBC18\uACBD.md";
var SUDO_COLLATERAL_CDE_COLUMNS = [
  { key: "range", label: "\uC0AC\uAC70\uB9AC" },
  { key: "he", label: "HE" },
  { key: "hebb", label: "HEBB" },
  { key: "dpicm", label: "DPICM" },
  { key: "dpbb", label: "DPBB" },
  { key: "guided", label: "\uACE0\uD3ED\uC720\uB3C4\uD0C4" },
  { key: "cluster", label: "\uBD84\uC0B0\uC720\uB3C4\uD0C4" }
];
var SUDO_COLLATERAL_CDE_ROWS = [
  {
    range: "15km",
    he: "73",
    hebb: "94",
    dpicm: "94",
    dpbb: "223",
    guided: "65",
    cluster: "130"
  },
  {
    range: "16km",
    he: "84",
    hebb: "99",
    dpicm: "95",
    dpbb: "226",
    guided: "",
    cluster: ""
  },
  {
    range: "17km",
    he: "88",
    hebb: "103",
    dpicm: "110",
    dpbb: "231",
    guided: "",
    cluster: ""
  },
  {
    range: "18km",
    he: "92",
    hebb: "106",
    dpicm: "113",
    dpbb: "236",
    guided: "",
    cluster: ""
  },
  {
    range: "19km",
    he: "-",
    hebb: "110",
    dpicm: "-",
    dpbb: "239",
    guided: "",
    cluster: ""
  },
  {
    range: "20km",
    he: "",
    hebb: "114",
    dpicm: "",
    dpbb: "242",
    guided: "",
    cluster: ""
  },
  {
    range: "21km",
    he: "",
    hebb: "119",
    dpicm: "",
    dpbb: "246",
    guided: "",
    cluster: ""
  },
  {
    range: "22km",
    he: "",
    hebb: "126",
    dpicm: "",
    dpbb: "255",
    guided: "",
    cluster: ""
  },
  {
    range: "23km",
    he: "",
    hebb: "126",
    dpicm: "",
    dpbb: "255",
    guided: "",
    cluster: ""
  },
  {
    range: "24km",
    he: "",
    hebb: "131",
    dpicm: "",
    dpbb: "258",
    guided: "",
    cluster: ""
  },
  {
    range: "25km",
    he: "",
    hebb: "133",
    dpicm: "",
    dpbb: "263",
    guided: "",
    cluster: ""
  },
  {
    range: "26km",
    he: "",
    hebb: "138",
    dpicm: "",
    dpbb: "272",
    guided: "",
    cluster: ""
  },
  {
    range: "27km",
    he: "",
    hebb: "142",
    dpicm: "",
    dpbb: "270",
    guided: "",
    cluster: ""
  },
  {
    range: "28km",
    he: "",
    hebb: "146",
    dpicm: "",
    dpbb: "275",
    guided: "",
    cluster: ""
  },
  {
    range: "29km",
    he: "",
    hebb: "152",
    dpicm: "",
    dpbb: "281",
    guided: "65",
    cluster: "130"
  },
  {
    range: "30km",
    he: "",
    hebb: "157",
    dpicm: "",
    dpbb: "288",
    guided: "",
    cluster: ""
  },
  {
    range: "31km",
    he: "",
    hebb: "162",
    dpicm: "",
    dpbb: "294",
    guided: "",
    cluster: ""
  },
  {
    range: "32km",
    he: "",
    hebb: "170",
    dpicm: "",
    dpbb: "300",
    guided: "",
    cluster: ""
  },
  {
    range: "33km",
    he: "",
    hebb: "181",
    dpicm: "",
    dpbb: "304",
    guided: "",
    cluster: ""
  },
  {
    range: "34km",
    he: "",
    hebb: "192",
    dpicm: "",
    dpbb: "318",
    guided: "",
    cluster: ""
  },
  {
    range: "35km",
    he: "",
    hebb: "213",
    dpicm: "",
    dpbb: "330",
    guided: "",
    cluster: ""
  },
  {
    range: "36km",
    he: "",
    hebb: "231",
    dpicm: "",
    dpbb: "345",
    guided: "",
    cluster: ""
  },
  {
    range: "37km",
    he: "",
    hebb: "243",
    dpicm: "",
    dpbb: "-",
    guided: "",
    cluster: ""
  },
  {
    range: "38km",
    he: "",
    hebb: "257",
    dpicm: "",
    dpbb: "",
    guided: "",
    cluster: ""
  },
  {
    range: "39km",
    he: "",
    hebb: "270",
    dpicm: "",
    dpbb: "",
    guided: "",
    cluster: ""
  },
  {
    range: "40km",
    he: "",
    hebb: "282",
    dpicm: "",
    dpbb: "",
    guided: "",
    cluster: ""
  },
  {
    range: "41km",
    he: "",
    hebb: "290",
    dpicm: "",
    dpbb: "",
    guided: "",
    cluster: ""
  }
];
var visualRangeLabels = /* @__PURE__ */ new Set([
  "17km",
  "18km",
  "19km",
  "20km",
  "21km",
  "22km"
]);
var munitionByColumnKey = {
  he: "HE",
  hebb: "HEBB",
  dpicm: "DPICM",
  dpbb: "DPBB",
  guided: "\uACE0\uD3ED\uC720\uB3C4\uD0C4",
  cluster: "\uBD84\uC0B0\uC720\uB3C4\uD0C4"
};
function cloneCdeRow(row) {
  return { ...row };
}
function buildSudoCollateralCdeSourceTable() {
  return {
    title: `${SUDO_COLLATERAL_CDE_SOURCE_NAME} \uC6D0\uBCF8\uD45C`,
    columns: [...SUDO_COLLATERAL_CDE_COLUMNS],
    rows: SUDO_COLLATERAL_CDE_ROWS.map(cloneCdeRow)
  };
}
function getSudoCollateralCdeRowsForVisual() {
  return SUDO_COLLATERAL_CDE_ROWS.filter(
    (row) => visualRangeLabels.has(row.range)
  ).map(cloneCdeRow);
}
function buildSudoCollateralMunitionsFromCde(rangeLabel = "18km") {
  const row = SUDO_COLLATERAL_CDE_ROWS.find(
    (candidate) => candidate.range === rangeLabel
  ) ?? SUDO_COLLATERAL_CDE_ROWS[0];
  return SUDO_COLLATERAL_CDE_COLUMNS.filter(
    (column) => column.key !== "range"
  ).flatMap((column) => {
    const key = column.key;
    const munition = munitionByColumnKey[column.key];
    const value = row[key]?.trim();
    const radiusM = Number(value);
    return munition && value && value !== "-" && Number.isFinite(radiusM) ? [{ munition, radiusM }] : [];
  });
}

// js/vendor/kairos/src/gui/sudo/sudoDataExtractionIntel.ts
var SUDO_DATA_EXTRACTION_SUMMARY = {
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
    { role: "video-frame", label: "\uC601\uC0C1 \uD504\uB808\uC784", count: 31 },
    { role: "ppt-slide-render", label: "\uC2AC\uB77C\uC774\uB4DC \uB80C\uB354", count: 47 },
    { role: "ppt-embedded-media", label: "PPT \uB9E4\uCCB4", count: 101 },
    { role: "pdf-page-render", label: "\uBB38\uC11C \uD398\uC774\uC9C0", count: 41 },
    { role: "hwp-bin-image", label: "HWP \uC774\uBBF8\uC9C0", count: 28 }
  ],
  issues: [
    {
      source: "2-4 \uCC9C\uBB34\uD615\uC0C1 \uBC0F \uC0AC\uC9C4\uC790\uB8CC.show",
      status: "skipped",
      detail: "\uC554\uD638\uD654/legacy OLE \uCEE8\uD14C\uC774\uB108\uB85C \uC2AC\uB77C\uC774\uB4DC \uC9C1\uC811 \uCD94\uCD9C \uC81C\uC678"
    },
    {
      source: "\uC2DC\uB098\uB9AC\uC624(6.1.).hwp",
      status: "partial",
      detail: "\uBCF8\uBB38 stream decode \uBD88\uAC00, \uC774\uBBF8\uC9C0/OCR \uCD94\uCD9C\uB9CC \uC0AC\uC6A9"
    }
  ],
  links: [
    {
      label: "\uCD94\uCD9C \uBA54\uD0C0\uB370\uC774\uD130",
      href: resolvePublicAssetPath(
        "/sudo_data/_extracted/extraction_metadata.json"
      )
    },
    {
      label: "OCR manifest",
      href: resolvePublicAssetPath("/sudo_data/_extracted/ocr_manifest.json")
    },
    {
      label: "OCR results",
      href: resolvePublicAssetPath("/sudo_data/_extracted/ocr_results.json")
    },
    {
      label: "\uC2AC\uB77C\uC774\uB4DC export \uC0C1\uD0DC",
      href: resolvePublicAssetPath(
        "/sudo_data/_extracted/presentation_export_status.json"
      )
    }
  ]
};
function buildSudoDataExtractionHealthSummary(summary = SUDO_DATA_EXTRACTION_SUMMARY) {
  return `\uC6D0\uCC9C ${summary.sourceOk}/${summary.sourceTotal} ok \xB7 OCR ${summary.ocrOk}/${summary.ocrTotal} ok \xB7 \uC2AC\uB77C\uC774\uB4DC ${summary.presentationOk}/${summary.presentationTotal} export \xB7 \uC774\uC288 ${summary.issues.length}\uAC74`;
}
function buildSudoDataExtractionRoleSummary(summary = SUDO_DATA_EXTRACTION_SUMMARY, limit = 4) {
  const visible = summary.roleCounts.slice(0, limit).map((item) => `${item.label} ${item.count}\uAC74`);
  const hidden = summary.roleCounts.length - visible.length;
  return [...visible, ...hidden > 0 ? [`+${hidden}\uC885`] : []].join(" | ");
}
function buildSudoDataExtractionIssueSummary(summary = SUDO_DATA_EXTRACTION_SUMMARY, limit = 2) {
  const visible = summary.issues.slice(0, limit).map((issue) => `${issue.source}: ${issue.detail}`);
  const hidden = summary.issues.length - visible.length;
  return [...visible, ...hidden > 0 ? [`+${hidden}\uAC74`] : []].join(" | ");
}
function buildSudoDataExtractionPromptLines(summary = SUDO_DATA_EXTRACTION_SUMMARY) {
  return [
    `- \uCD94\uCD9C\uC0C1\uD0DC: ${buildSudoDataExtractionHealthSummary(summary)}`,
    `- \uCD94\uCD9C\uC5ED\uD560: ${buildSudoDataExtractionRoleSummary(summary)}`,
    `- \uCD94\uCD9C\uC774\uC288: ${buildSudoDataExtractionIssueSummary(summary)}`
  ];
}

// js/vendor/kairos/src/gui/sudo/sudoGisIntel.ts
var SUDO_JANGDO_GIS_INTEL = {
  "source": "NGII B010/B080/B110 HD map + VWorld road-name GIS + MOLIT cadastral/zoning/building/ecology + NGII land-use raw downloads",
  "generatedAt": "2026-06-08T06:37:40.772Z",
  "roads": 9171,
  "buildings": 8837,
  "water": 402,
  "hdMapFeatures": 43395,
  "hdMapSafetyFeatures": 12449,
  "hdMapObstacleFeatures": 4264,
  "hdMapWithin100M": 82,
  "hdMapWithin250M": 222,
  "hdMapWithin1000M": 2010,
  "hdMapRuntimeFeatures": 2010,
  "hdMapSafetyWithin250M": 97,
  "hdMapObstacleWithin250M": 0,
  "nearestHdMapFeature": {
    "id": "(B110)\uC815\uBC00\uB3C4\uB85C\uC9C0\uB3C4_\uC778\uCC9C\uAD11\uC5ED\uC2DC\uB3C4_5\uD638\uC120(\uC6D0\uCC3D-\uC6D0\uCC3D\uC120):A4_SUBSIDIARYSECTION:hdmap:116",
    "kind": "hd-subsidiary-section",
    "label": "\uBD80\uC18D\uAD6C\uAC04",
    "distanceM": 6,
    "coordinate": [
      126.61128,
      37.54669
    ],
    "routeLabel": "\uC778\uCC9C\uAD11\uC5ED\uC2DC\uB3C4_5\uD638\uC120(\uC6D0\uCC3D-\uC6D0\uCC3D\uC120)",
    "typeCode": "",
    "kindCode": ""
  },
  "nearestHdMapSafetyFeature": {
    "id": "(B110)\uC815\uBC00\uB3C4\uB85C\uC9C0\uB3C4_\uC778\uCC9C\uAD11\uC5ED\uC2DC\uB3C4_5\uD638\uC120(\uC6D0\uCC3D-\uC6D0\uCC3D\uC120):B3_SURFACEMARK:hdmap:611",
    "kind": "hd-surface-mark",
    "label": "\uB178\uBA74\uD45C\uC2DC",
    "distanceM": 10,
    "coordinate": [
      126.61132,
      37.54669
    ],
    "routeLabel": "\uC778\uCC9C\uAD11\uC5ED\uC2DC\uB3C4_5\uD638\uC120(\uC6D0\uCC3D-\uC6D0\uCC3D\uC120)",
    "typeCode": "1",
    "kindCode": "5382"
  },
  "nearestHdMapObstacleFeature": {
    "id": "(B110)\uC815\uBC00\uB3C4\uB85C\uC9C0\uB3C4_\uACE0\uC18D\uAD6D\uB3C4_130\uD638\uC120(\uC778\uCC9C\uAD6D\uC81C\uACF5\uD56D\uC120):C3_VEHICLEPROTECTIONSAFETY:hdmap:17",
    "kind": "hd-vehicle-protection",
    "label": "\uCC28\uB7C9\uBC29\uD638\uC548\uC804\uC2DC\uC124",
    "distanceM": 684,
    "coordinate": [
      126.60811,
      37.55241
    ],
    "routeLabel": "\uACE0\uC18D\uAD6D\uB3C4_130\uD638\uC120(\uC778\uCC9C\uAD6D\uC81C\uACF5\uD56D\uC120)",
    "typeCode": "2",
    "kindCode": ""
  },
  "terrainAnalysis": 66476,
  "terrainCore": 2039,
  "terrainParcels": 27953,
  "terrainZoning": 28012,
  "terrainBuildingRegister": 7677,
  "terrainEcology": 232,
  "terrainLandUse": 563,
  "terrainTiles": 996,
  "demAoiReliefM": 10.41,
  "demAoiSlopeP95Deg": 4.47,
  "demAoiRoughnessM": 0.59,
  "demAoiMeanHeightM": 5.02,
  "demAoiTerrainComplexity": "rolling",
  "demCoverageReliefM": 66.2,
  "demCoverageSlopeP95Deg": 7.48,
  "situationRoadLinks": 6641,
  "parcels": 27953,
  "civilianBuildings": 4358,
  "civilianWithin100M": 2,
  "civilianWithin250M": 5,
  "civilianWithin500M": 27,
  "civilianWithin1000M": 43,
  "civilianRiskLevel": "very-high",
  "criticalFacilities": 153,
  "logisticsBuildings": 1410,
  "restrictedFeatures": 21372,
  "restrictedWithin250M": 60,
  "restrictedWithin500M": 151,
  "targetInsideRestrictedFeatures": 1,
  "ecologyFeatures": 232,
  "nearestCivilianM": 45,
  "nearestCivilian": {
    "id": "(B010)\uC218\uCE58\uC9C0\uB3C4_37607085_2025_00000495679972.zip:N3A_B0010000:1000037607085B00110000000000000643",
    "distanceM": 45,
    "coordinate": [
      126.61086,
      37.54611
    ],
    "legalDong": "",
    "parcelNo": "",
    "buildingUsage": "",
    "buildingDetailUsage": "",
    "buildingUsageGroup": ""
  },
  "forestPercent": 73,
  "openTerrainPercent": 27,
  "urls": {
    "roads": "/offline-map/jangdo/intel/roads.geojson",
    "buildings": "/offline-map/jangdo/intel/buildings.geojson",
    "water": "/offline-map/jangdo/intel/water.geojson",
    "terrainAnalysis": "/offline-map/jangdo/intel/terrain-core.geojson",
    "terrainAnalysisAll": "/offline-map/jangdo/intel/terrain-analysis.geojson",
    "terrainParcels": "/offline-map/jangdo/intel/terrain-parcels.geojson",
    "terrainZoning": "/offline-map/jangdo/intel/terrain-zoning.geojson",
    "terrainBuildingRegister": "/offline-map/jangdo/intel/terrain-building-register.geojson",
    "terrainEcology": "/offline-map/jangdo/intel/terrain-ecology.geojson",
    "terrainLandUse": "/offline-map/jangdo/intel/terrain-land-use.geojson",
    "demMetrics": "/offline-map/jangdo/intel/dem-metrics.json",
    "hdMapRoadContext": "/offline-map/jangdo/intel/hdmap-road-context.geojson",
    "hdMapOperationalContext": "/offline-map/jangdo/intel/hdmap-operational-context.geojson",
    "operationalContext": "/offline-map/jangdo/intel/operational-context.geojson",
    "situationRoads": "/sudo_data/gis/processed/situation-analysis/ngii-a2-link-roads.geojson"
  }
};
function formatSudoGisIntelCounts() {
  return [
    `\uB3C4\uB85C ${SUDO_JANGDO_GIS_INTEL.roads.toLocaleString()}`,
    `HD ${SUDO_JANGDO_GIS_INTEL.hdMapFeatures.toLocaleString()}`,
    `\uAC74\uBB3C ${SUDO_JANGDO_GIS_INTEL.buildings.toLocaleString()}`,
    `\uBBFC\uAC00 ${SUDO_JANGDO_GIS_INTEL.civilianBuildings.toLocaleString()}`,
    `\uC9C0\uD615 ${SUDO_JANGDO_GIS_INTEL.terrainAnalysis.toLocaleString()}`,
    `\uADDC\uC81C ${SUDO_JANGDO_GIS_INTEL.restrictedFeatures.toLocaleString()}`
  ].join(" \xB7 ");
}

// js/vendor/kairos/src/gui/sudo/sudoScenarioReferences.ts
var scenarioAsset = (path) => resolvePublicAssetPath(`/sudo_data/_extracted/scenario_6_1/${path}`);
var page = (pageNo) => scenarioAsset(`pages/page_${String(pageNo).padStart(2, "0")}.png`);
var figure = (path) => scenarioAsset(`figures/${path}`);
var SUDO_SCENARIO_7_TERRAIN_SUMMARY = `\uC0B0\uB9BC/\uB3C4\uC2EC ${SUDO_JANGDO_GIS_INTEL.forestPercent}% / \uAC1C\uD65C\uC9C0 ${SUDO_JANGDO_GIS_INTEL.openTerrainPercent}%`;
var sudoScenarioReferences = [
  {
    scenarioId: 1,
    source: "senario.pdf / 1-1, 1-2",
    page: "page_01",
    result: "WARNING: \uB4DC\uB8601\uC774 \uD45C\uC801\uC744 \uC2DD\uBCC4\uD558\uC600\uC2B5\uB2C8\uB2E4.",
    images: [
      { src: page(1), label: "S1~S2 \uC2E4\uC81C \uD45C \uAD6C\uC870" },
      {
        src: figure("page_01_figure_03_xref_38.png"),
        label: "\uB4DC\uB860 \uCD2C\uC601 \uD45C\uC801 bbox"
      }
    ],
    bullets: [
      "\uC7A5\uB3C4\uD6C8\uB828\uC7A5 \uC9C0\uD615DB\uC640 \uB4DC\uB860 \uC6B4\uC6A9\uD604\uD669\uC744 \uB3D9\uC2DC\uC5D0 \uC804\uC2DC",
      "\uD45C\uC801\uC88C\uD45C BH 12345 67890, \uB4DC\uB860\uC88C\uD45C BH 12321 56789 \uD615\uC2DD \uC0AC\uC6A9",
      "\uBCF4\uC870 \uD654\uBA74\uC740 \uC2E4\uC81C \uB4DC\uB860 \uCD2C\uC601 \uC0AC\uC9C4/\uC601\uC0C1\uACFC \uBE68\uAC04 bbox\uAC00 \uC911\uC2EC"
    ],
    table: {
      title: "\uC81C\uACF5\uC790\uB8CC/\uC694\uAD6C\uB0B4\uC6A9",
      columns: [
        { key: "item", label: "\uAD6C\uBD84" },
        { key: "value", label: "\uC2E4\uC81C\uC790\uB8CC" },
        { key: "use", label: "\uC571 \uBC18\uC601" }
      ],
      rows: [
        {
          item: "1-1",
          value: "\uC7A5\uB3C4\uD6C8\uB828\uC7A5 \uC2E4\uAE30\uB3D9 \uCD2C\uC601 \uC601\uC0C1",
          use: "\uB4DC\uB860 \uD45C\uC801 \uC2DD\uBCC4 \uC601\uC0C1"
        },
        {
          item: "1-2",
          value: "\uC7A5\uB3C4\uD6C8\uB828\uC7A5 \uC0AC\uC9C4 DB",
          use: "\uC9C0\uD615DB/\uBCF4\uC870 \uD654\uBA74"
        }
      ]
    }
  },
  {
    scenarioId: 2,
    source: "senario.pdf / 2-1~7",
    page: "page_01",
    result: "240mm \uBC29\uC0AC\uD3EC(M-1991) 99.8%",
    images: [
      {
        src: figure("page_01_figure_04_xref_55.png"),
        label: "\uAC1D\uCCB4\uC778\uC2DD \uBD84\uC11D \uD654\uBA74"
      },
      {
        src: figure("page_01_figure_08_xref_70.png"),
        label: "\uCC38\uC870 \uD615\uC0C1"
      }
    ],
    bullets: [
      "\uC804\uD3ED/\uC804\uC7A5 \uC81C\uC6D0, 22\uC5F0\uC7A5 \uBC1C\uC0AC\uAD00, \uC774\uB3D9\uC18D\uB3C4, \uC6B4\uC804\uC11D/\uCC28\uB7C9\uD6C4\uBBF8\uB97C \uADFC\uAC70\uB85C \uC0AC\uC6A9",
      "\uBC1C\uC0AC\uAD00 \uC55E \uC801\uC7AC\uB300/\uC0AC\uC218\uC758\uC790, \uBC15\uC2A4\uD615 \uCC28\uB7C9 \uC804\uBA74, ROMAN \uCC28\uB300 \uD655\uC778",
      "\uD6C4\uBCF4 \uD655\uB960\uC740 M-1991 99.8%, M-1989 0.2% \uAD6C\uC870"
    ],
    table: {
      title: "\uD45C\uC801\uC131\uC9C8 \uD310\uB2E8\uADFC\uAC70",
      columns: [
        { key: "basis", label: "\uADFC\uAC70" },
        { key: "observed", label: "\uAD00\uCE21" },
        { key: "grade", label: "\uD310\uC815" }
      ],
      rows: [
        { basis: "\uBC1C\uC0AC\uAD00", observed: "22\uC5F0\uC7A5 \uBC30\uC5F4", grade: "M-1991 \uBD80\uD569" },
        { basis: "\uCC28\uB300", observed: "ROMAN \uACC4\uC5F4", grade: "240mm \uBC29\uC0AC\uD3EC" },
        { basis: "\uD6C4\uBCF4", observed: "M-1991 99.8%", grade: "\uCD5C\uC885" }
      ]
    }
  },
  {
    scenarioId: 3,
    source: "senario.pdf / 3-1",
    page: "page_02",
    result: "\uC7A5\uBE44\uB300\uC218\xB7\uD589\uAD70\uC7A5\uACBD \uAE30\uBC18 \uADDC\uBAA8 \uC0B0\uCD9C",
    images: [
      { src: page(2), label: "S3~S4 \uC2E4\uC81C \uD45C \uAD6C\uC870" },
      {
        src: figure("page_02_figure_03_xref_84.png"),
        label: "\uBD80\uB300\uADDC\uBAA8 \uBD84\uC11D \uD654\uBA74"
      }
    ],
    bullets: [
      "\uD604\uC7AC \uD504\uB808\uC784: \uCD08\uB85D bbox 3\uAC74, \uC120\uB450 \uCC28\uB7C9-\uC911\uAC04 \uD2B8\uB7ED-\uD6C4\uBBF8 \uBC29\uC0AC\uD3EC",
      "240mm \uBC29\uC0AC\uD3EC \uB300\uB300: \uBC29\uC0AC\uD3EC 12\uBB38, \uC9C0\uD504 1\uB300, \uD2B8\uB7ED 30\uB300, \uD589\uAD70\uC7A5\uACBD \uC57D 1500m",
      "\uD604\uC7AC bbox 3\uAC74\uACFC \uD589\uAD70\uC7A5\uACBD \uD45C\uB97C \uD568\uAED8 \uBC18\uC601"
    ],
    table: {
      title: "3-1 \uBD80\uB300\uBCC4 \uD589\uAD70\uC7A5\uACBD \uAE30\uC900",
      columns: [
        { key: "unit", label: "\uD3B8\uC131" },
        { key: "equipment", label: "\uC7A5\uBE44" },
        { key: "length", label: "\uD589\uAD70\uC7A5\uACBD" },
        { key: "grade", label: "\uD310\uC815" }
      ],
      rows: [
        {
          unit: "240mm \uBC29\uC0AC\uD3EC \uC911\uB300",
          equipment: "\uD504\uB808\uC784 \uC2DD\uBCC4 3\uB300",
          length: "350m",
          grade: "\uC911\uB300"
        },
        {
          unit: "240mm \uBC29\uC0AC\uD3EC \uB300\uB300",
          equipment: "\uBC29\uC0AC\uD3EC12 + \uC9C0\uD5041 + \uD2B8\uB7ED30",
          length: "1500m",
          grade: "\uB300\uB300"
        },
        {
          unit: "\uC804\uCC28 \uC911\uB300",
          equipment: "\uC804\uCC288",
          length: "300m",
          grade: "\uC911\uB300"
        }
      ]
    }
  },
  {
    scenarioId: 4,
    source: "senario.pdf / 4-1",
    page: "page_02",
    result: "1\uC0AC\uB2E8 1\uB300\uB300 2\uC911\uB300 240mm \uBC29\uC0AC\uD3EC 99.8%",
    images: [
      {
        src: figure("page_02_figure_06_xref_87.png"),
        label: "\uC804\uD22C\uC11C\uC5F4 \uD310\uB2E8 \uC9C0\uB3C4/\uD45C"
      }
    ],
    bullets: [
      "\uD45C\uC801\uC88C\uD45C BH 12345 67890 \uAE30\uC900 \uCD5C\uAE30\uBD80\uB300 \uC704\uCE58\uC640 \uC774\uACA9\uAC70\uB9AC \uBE44\uAD50",
      "BH 12415 67915, 106m, 1\uC0AC\uB2E8 1\uB300\uB300 2\uC911\uB300 240mm \uBC29\uC0AC\uD3EC\uAC00 1\uC21C\uC704",
      "51m 152mm \uC790\uC8FC\uD3EC \uD6C4\uBCF4\uB294 \uADFC\uC811\uD558\uC9C0\uB9CC \uD45C\uC801\uC131\uC9C8 \uBD88\uC77C\uCE58\uB85C 2\uC21C\uC704"
    ],
    table: {
      title: "4-1 \uC804\uD22C\uC11C\uC5F4 \uD6C4\uBCF4",
      columns: [
        { key: "coord", label: "\uCD5C\uAE30\uBD80\uB300 \uC704\uCE58" },
        { key: "distance", label: "\uC774\uACA9" },
        { key: "unit", label: "\uC804\uD22C\uC11C\uC5F4" },
        { key: "rank", label: "\uC21C\uC704" }
      ],
      rows: [
        {
          coord: "BH 12415 67915",
          distance: "106m",
          unit: "1\uC0AC\uB2E8 1\uB300\uB300 2\uC911\uB300 240mm \uBC29\uC0AC\uD3EC",
          rank: "1"
        },
        {
          coord: "BH 12346 67899",
          distance: "51m",
          unit: "2\uC0AC\uB2E8 3\uB300\uB300 1\uC911\uB300 152mm \uC790\uC8FC\uD3EC",
          rank: "2"
        },
        {
          coord: "BH 13143 68541",
          distance: "2,013m",
          unit: "1\uC0AC\uB2E8 2\uB300\uB300 1\uC911\uB300 240mm \uBC29\uC0AC\uD3EC",
          rank: "3"
        }
      ]
    }
  },
  {
    scenarioId: 5,
    source: "senario.pdf / 5-1",
    page: "page_03",
    result: "HEBB \uC0AC\uACA9\uAC00\uB2A5",
    images: [
      { src: page(3), label: "S5~S6 \uC2E4\uC81C \uD45C \uAD6C\uC870" },
      {
        src: figure("page_03_figure_04_xref_104.png"),
        label: "CDE \uD6A8\uACFC\uBC18\uACBD \uD45C"
      }
    ],
    bullets: [
      "\uD654\uBA74 \uD45C\uB294 HE, HEBB, DPICM, DPBB\uC758 17~22km \uAD6C\uAC04 CDE\uB97C \uD45C\uC2DC",
      "18km \uAE30\uC900 HE 92, HEBB 106, DPICM 113, DPBB 236",
      "\uD654\uBA74 \uACB0\uB860\uC740 DPBB \uBBFC\uAC04\uC9C0\uC5ED \uD53C\uD574 \uAC00\uB2A5\uC131\uC744 \uC81C\uD55C\uD558\uACE0 HEBB \uC0AC\uACA9\uAC00\uB2A5\uC73C\uB85C \uD45C\uC2DC"
    ],
    table: {
      title: "5-1 \uD0C4\uC885\uBCC4 CDE \uC77C\uBD80",
      columns: [
        { key: "distance", label: "\uAC70\uB9AC" },
        { key: "he", label: "HE" },
        { key: "hebb", label: "HEBB" },
        { key: "dp", label: "DPICM" },
        { key: "dpbb", label: "DPBB" }
      ],
      rows: [
        { distance: "17km", he: "88", hebb: "103", dp: "110", dpbb: "231" },
        { distance: "18km", he: "92", hebb: "106", dp: "113", dpbb: "236" },
        { distance: "19km", he: "-", hebb: "110", dp: "-", dpbb: "239" },
        { distance: "20km", he: "-", hebb: "114", dp: "-", dpbb: "242" },
        { distance: "21km", he: "-", hebb: "119", dp: "-", dpbb: "246" },
        { distance: "22km", he: "-", hebb: "126", dp: "-", dpbb: "255" }
      ]
    }
  },
  {
    scenarioId: 6,
    source: "senario.pdf / 6-1",
    page: "page_03",
    result: "240mm \uBC29\uC0AC\uD3EC \uCDE8\uC57D\uC810 \uCE74\uB4DC 8\uAC1C",
    images: [
      {
        src: figure("page_03_figure_05_xref_105.png"),
        label: "\uCDA9\uC758-GPT \uCDE8\uC57D\uC810 \uC778\uD3EC\uADF8\uB798\uD53D"
      }
    ],
    bullets: [
      "\uBC1C\uC0AC \uC704\uCE58 \uB178\uCD9C, \uC7AC\uC7A5\uC804 \uC2DC\uAC04 \uBB38\uC81C, \uAE30\uB3D9\uC131 \uD55C\uACC4, \uC815\uBC00\uB3C4 \uD55C\uACC4",
      "\uD0C4\uC57D\xB7\uBB3C\uB958 \uBD80\uB2F4, \uB4DC\uB860 \uC2DC\uB300\uC758 \uCDE8\uC57D\uC131, \uAE30\uC0C1 \uC601\uD5A5, \uAE30\uD0C0 \uCDE8\uC57D \uC694\uC18C",
      "6-1 \uC790\uB8CC\uB294 240mm \uBC29\uC0AC\uD3EC\uC640 152mm \uC790\uC8FC\uD3EC \uCDE8\uC57D\uC810 \uC2AC\uB77C\uC774\uB4DC\uB97C \uD3EC\uD568"
    ]
  },
  {
    scenarioId: 7,
    source: "senario.pdf / 7-1, 7-2",
    page: "page_04",
    result: "HE 6\uBC1C",
    images: [
      { src: page(4), label: "S7~S8 \uC2E4\uC81C \uD45C \uAD6C\uC870" },
      {
        src: figure("page_04_figure_03_xref_121.png"),
        label: "\uD0C4\uC885/\uBC1C\uC218 \uD310\uB2E8 \uACFC\uC815"
      }
    ],
    bullets: [
      `\uD45C\uC801\uC131\uC9C8 122/240\uBC00\uB9AC \uBC29\uC0AC\uD3EC, \uC0AC\uAC70\uB9AC 0~6km, \uC9C0\uD615 ${SUDO_SCENARIO_7_TERRAIN_SUMMARY}`,
      "\uC694\uB9DD\uD6A8\uACFC \uD30C\uAD34 30% \uAE30\uC900 HE 6\uBC1C",
      "100\uD3EC\uBCD1\uB300\uB300 \uC0AC\uACA9\uC9C0\uC2DC\uB294 HE\uD0C4 3R\uB85C \uD558\uB2EC",
      "\uC2E4\uC81C \uD654\uBA74\uC740 \uC9C0\uD615\uBD84\uB958 \uC9C0\uB3C4\uC640 \uC694\uB9DD\uD6A8\uACFC\uBCC4 \uB9E4\uD2B8\uB9AD\uC2A4\uB97C \uD568\uAED8 \uC804\uC2DC"
    ],
    table: {
      title: "7-1~2 \uBB34\uAE30\uD6A8\uACFC \uD310\uB2E8",
      columns: [
        { key: "target", label: "\uD45C\uC801\uC131\uC9C8" },
        { key: "range", label: "\uC0AC\uAC70\uB9AC" },
        { key: "terrain", label: "\uC9C0\uD615" },
        { key: "effect", label: "\uC694\uB9DD\uD6A8\uACFC" },
        { key: "result", label: "\uACB0\uACFC" }
      ],
      rows: [
        {
          target: "122/240\uBC00\uB9AC \uBC29\uC0AC\uD3EC",
          range: "0~6km",
          terrain: "\uC0B0\uB9BC/\uB3C4\uC2EC",
          effect: "\uD30C\uAD34 30%",
          result: "HE 6\uBC1C"
        }
      ]
    }
  },
  {
    scenarioId: 8,
    source: "senario.pdf / 8-1",
    page: "page_04",
    result: "100\uD3EC\uBCD1\uB300\uB300(K105A1)",
    images: [
      {
        src: figure("page_04_figure_04_xref_122.png"),
        label: "\uCD5C\uC801 \uC0AC\uACA9\uBD80\uB300 \uC120\uC815 \uD654\uBA74"
      }
    ],
    bullets: [
      "\uD6C4\uBCF4\uB294 669\uD3EC\uBCD1\uB300\uB300(K9), 602\uD3EC\uBCD1\uB300\uB300(K55A1), \uD3EC5\uB300\uB300(K55A1), 100\uD3EC\uBCD1\uB300\uB300(K105A1), 101\uC5EC\uB2E8 4.2\uC778\uCE58 \uBC15\uACA9\uD3EC",
      "\uD3C9\uAC00\uD56D\uBAA9\uC740 \uC0AC\uAC70\uB9AC, \uC0DD\uC874\uC131\uBCF4\uC7A5, \uD0C4\uBCF4\uC720\uB7C9, \uBBFC\uAC04\uD53C\uD574, \uC804\uD22C\uB825\uC218\uC900",
      "100\uD3EC\uBCD1\uB300\uB300\uB294 6km \uC0AC\uACA9 \uAC00\uB2A5, \uC720\uAC1C\uD638 \uD3EC\uC0C1, HE 100R, \uBBFC\uAC04\uD53C\uD574 \uC5C6\uC74C"
    ],
    table: {
      title: "8-1 \uC0AC\uACA9\uBD80\uB300 \uD6C4\uBCF4",
      columns: [
        { key: "unit", label: "\uD6C4\uBCF4" },
        { key: "range", label: "\uC0AC\uAC70\uB9AC" },
        { key: "ammo", label: "\uD0C4" },
        { key: "civilian", label: "\uBBFC\uAC04\uD53C\uD574" },
        { key: "grade", label: "\uD310\uC815" }
      ],
      rows: [
        {
          unit: "100\uD3EC\uBCD1\uB300\uB300(K105A1)",
          range: "6km \uAC00\uB2A5",
          ammo: "HE 100R",
          civilian: "\uC5C6\uC74C",
          grade: "\uC120\uC815"
        },
        {
          unit: "669\uD3EC\uBCD1\uB300\uB300(K9)",
          range: "\uC0AC\uAC70\uB9AC \uAC00\uB2A5",
          ammo: "\uC81C\uD55C",
          civilian: "\uAC80\uD1A0",
          grade: "\uD6C4\uBCF4"
        },
        {
          unit: "101\uC5EC\uB2E8 4.2\uC778\uCE58",
          range: "\uC81C\uD55C",
          ammo: "\uD655\uC778\uD544\uC694",
          civilian: "\uAC80\uD1A0",
          grade: "\uC81C\uC678"
        }
      ]
    }
  },
  {
    scenarioId: 9,
    source: "senario.pdf / 9-1",
    page: "page_05",
    result: "3\uBC88 \uB3C4\uB85C[70%], \uAC10\uC2DC 2 \xB7 \uACB0\uC2EC 2 \xB7 \uD0C0\uACA9 2",
    images: [
      { src: page(5), label: "S9~S11 \uC2E4\uC81C \uD45C \uAD6C\uC870" },
      {
        src: figure("page_05_figure_03_xref_138.png"),
        label: "\uC0AC\uD0DC\uBD84\uC11D\uB3C4 #1/#2 \uBE44\uAD50"
      }
    ],
    bullets: [
      "\uC608\uC0C1 \uC774\uB3D9\uB85C: 3\uBC88 \uB3C4\uB85C[70%]",
      "1\uBC88 \uB3C4\uB85C 10%, 3\uBC88 \uB3C4\uB85C 70%, 5\uBC88 \uB3C4\uB85C 20%",
      "3\uBC88 \uB3C4\uB85C\uB294 \uC218\uB3C4\uAD8C \uC9C4\uC785 \uAC00\uB2A5 \uBC0F \uACE0\uC18D\uAE30\uB3D9 \uAC00\uB2A5",
      "NAI, DP, TAI \uD310\uB2E8: \uAC10\uC2DC 2, \uACB0\uC2EC 2, \uD0C0\uACA9 2"
    ],
    table: {
      title: "9-1 \uC0AC\uD0DC\uBD84\uC11D\uB3C4 \uBD84\uC11D \uACB0\uACFC",
      columns: [
        { key: "item", label: "\uAD6C\uBD84" },
        { key: "road1", label: "1\uBC88 \uB3C4\uB85C" },
        { key: "road3", label: "3\uBC88 \uB3C4\uB85C" },
        { key: "road5", label: "5\uBC88 \uB3C4\uB85C" }
      ],
      rows: [
        {
          item: "\uAE30\uB3D9\uC5EC\uAC74 \uBCF4\uC7A5",
          road1: "\uD3EC\uC7A5\uB3C4\uB85C, \uACE0\uC18D\uAE30\uB3D9 \uAC00\uB2A5",
          road3: "\uD3EC\uC7A5\uB3C4\uB85C, \uACE0\uC18D\uAE30\uB3D9 \uAC00\uB2A5",
          road5: "\uD3EC\uC7A5\uB3C4\uB85C, \uACE0\uC18D\uAE30\uB3D9 \uAC00\uB2A5"
        },
        {
          item: "\uC791\uC804\uBAA9\uC801 \uB2EC\uC131",
          road1: "\uC218\uB3C4\uAD8C \uC9C4\uCD9C \uC81C\uD55C",
          road3: "\uC218\uB3C4\uAD8C \uC9C4\uC785 \uAC00\uB2A5",
          road5: "\uC218\uB3C4\uAD8C \uC9C4\uC785 \uAC00\uB2A5"
        },
        { item: "\uC608\uC0C1 \uD655\uB960(%)", road1: "10%", road3: "70%", road5: "20%" }
      ]
    }
  },
  {
    scenarioId: 10,
    source: "senario.pdf / 9-1",
    page: "page_05",
    result: "1\uBC88 TAI #3 \uC465\uACE0\uAC1C, 2\uBC88 NAI #4 \uB9D0\uACE0\uAC1C, 3\uBC88 TAI #4 \uB2F9\uB3D9\uB9AC",
    images: [
      {
        src: figure("page_05_figure_04_xref_139.png"),
        label: "AI \uAE30\uBC18 \uAC10\uC2DC\uC790\uC0B0 \uC7AC\uBC30\uCE58"
      }
    ],
    bullets: [
      "\uC9C8\uC758: \uC0AC\uD0DC\uBD84\uC11D\uB3C4 \uD310\uB2E8\uC548(2\uC548)\uC5D0 \uB530\uB77C \uAC10\uC2DC\uC790\uC0B0(\uB4DC\uB860)\uC7AC\uBC30\uCE58 \uD574\uC918!",
      "1\uBC88 \uB4DC\uB860\uC740 TAI #3 \uC465\uACE0\uAC1C\uB85C \uC774\uB3D9",
      "2\uBC88 \uB4DC\uB860\uC740 NAI #4 \uB9D0\uACE0\uAC1C, 3\uBC88 \uB4DC\uB860\uC740 TAI #4 \uB2F9\uB3D9\uB9AC\uB85C \uC774\uB3D9"
    ]
  },
  {
    scenarioId: 11,
    source: "senario.pdf / 11-1",
    page: "page_05",
    result: "CAS+\uD3EC\uBCD1 / TAI#5 / H\uC2DC 11:00 / DP#3",
    images: [
      {
        src: figure("page_05_figure_06_xref_141.png"),
        label: "\uD0C0\uACA9\uBC29\uBC95 \uACB0\uC815\uD45C"
      }
    ],
    bullets: [
      "CAS \uAC00\uC6A9 10:30~11:30, 14:00~15:00",
      "\uC721\uAD70\uD56D\uACF5\uC740 12:00 \uC774\uD6C4, \uD3EC\uBCD1\uC740 24\uC2DC\uAC04 \uAC00\uB2A5",
      "1\uC21C\uC704 CAS+\uD3EC\uBCD1 TAI#5 H\uC2DC 11:00 DP#3"
    ],
    table: {
      title: "\uD0C0\uACA9\uBC29\uBC95 \uACB0\uC815",
      columns: [
        { key: "method", label: "\uBC29\uBC95" },
        { key: "tai", label: "TAI" },
        { key: "time", label: "H\uC2DC" },
        { key: "dp", label: "DP" },
        { key: "rank", label: "\uC21C\uC704" }
      ],
      rows: [
        {
          method: "CAS+\uD3EC\uBCD1",
          tai: "TAI#5",
          time: "11:00",
          dp: "DP#3",
          rank: "1"
        },
        { method: "JAAT", tai: "TAI#7", time: "14:00", dp: "DP#7", rank: "2" },
        {
          method: "Fire-Eagle",
          tai: "TAI#8",
          time: "12:00",
          dp: "DP#2",
          rank: "3"
        }
      ]
    }
  },
  {
    scenarioId: 12,
    source: "senario.pdf / 12-1",
    page: "page_06",
    result: "\uD1B5\uD569\uD654\uB825\uC6B4\uC6A9 H\uC2DC 11:00 (H-10~H+30)",
    images: [
      { src: page(6), label: "S12~S13 \uC2E4\uC81C \uD45C \uAD6C\uC870" },
      {
        src: figure("page_06_figure_08_xref_152.png"),
        label: "\uD1B5\uD569\uD654\uB825\uC6B4\uC6A9\uB3C4\uD45C"
      }
    ],
    bullets: [
      "\uC2E4\uC81C \uD654\uBA74\uC740 \uC911\uC559\uC5D0 \uD1B5\uD569\uD654\uB825\uC6B4\uC6A9\uB3C4\uD45C \uC774\uBBF8\uC9C0\uAC00 \uD575\uC2EC",
      "H\uC2DC 11:00 \uAE30\uC900 H-10\uBD80\uD130 H+30\uAE4C\uC9C0 \uC790\uC0B0\uBCC4 \uC6B4\uC6A9",
      "NAI/DP/TAI\uC640 \uD0C0\uACA9\uC790\uC0B0\uC744 \uAC19\uC740 \uC2DC\uAC04\uCD95\uC5D0 \uBC30\uCE58"
    ]
  },
  {
    scenarioId: 13,
    source: "artas program.pdf",
    page: "page_01-02",
    result: "ARTAS \uD5C8\uC0C1\uD45C\uC801 99%",
    images: [
      {
        src: figure("page_07_figure_01_xref_159.png"),
        label: "ARTAS \uB300\uD3EC\uBCD1\uD0D0\uC9C0 R/D \uD310\uB2E8 \uCC38\uACE0"
      }
    ],
    bullets: [
      "AA001 / TPQ-74K 1\uBC18 \uAE30\uC220\uC801 \uD310\uB2E8: \uD5C8\uC0C1\uD45C\uC801 78%",
      "\uD0C4\uB3C4\uACE1\uC120 \uB04A\uAE40, \uB808\uC774\uB354 \uC608\uC0C1\uC815\uD655\uB3C4 300m \uCD08\uACFC, \uCD94\uC801\uD69F\uC218 7\uD68C",
      "\uC12C\uAD11\xB7\uD3ED\uC74C, MASINT, TOD \uC601\uC0C1\uBCF5\uADC0, \uC801 \uD2B9\uC774\uD65C\uB3D9\uC774 \uC5C6\uC5B4 \uC885\uD569 \uD5C8\uC0C1\uD45C\uC801 99%"
    ],
    table: {
      title: "ARTAS \uB300\uD3EC\uBCD1\uD0D0\uC9C0 R/D \uD45C\uC801\uD0D0\uC9C0 \uD310\uB2E8\uADFC\uAC70",
      columns: [
        { key: "area", label: "\uAD6C\uBD84" },
        { key: "observed", label: "\uD655\uC778" },
        { key: "grade", label: "\uD310\uC815" }
      ],
      rows: [
        { area: "ARTAS", observed: "\uD5C8\uC0C1\uD45C\uC801 78%", grade: "\uD5C8\uC0C1 \uC6B0\uC138" },
        {
          area: "\uAE30\uC220\uD310\uB2E8",
          observed: "\uD0C4\uB3C4\uACE1\uC120 \uB04A\uAE40 / \uC815\uD655\uB3C4 300m \uCD08\uACFC / \uCD94\uC801 7\uD68C",
          grade: "\uD5C8\uC0C1 \uC9D5\uD6C4"
        },
        { area: "\uC9C0\uD718\uC18C", observed: "\uC12C\uAD11\xB7\uD3ED\uC74C \uC5C6\uC74C", grade: "\uD5C8\uC0C1 \uC6B0\uC138" },
        {
          area: "\uD0C0\uCD9C\uCC98",
          observed: "MASINT \uC5C6\uC74C / TOD \uBCF5\uADC0 \uC5C6\uC74C / \uC801 \uD2B9\uC774\uD65C\uB3D9 \uC5C6\uC74C",
          grade: "\uD5C8\uC0C1 99%"
        }
      ]
    }
  }
];
function getSudoScenarioReference(scenarioId) {
  const reference = sudoScenarioReferences.find(
    (reference2) => reference2.scenarioId === scenarioId
  );
  return reference ? {
    ...reference,
    source: formatSudoSourceDisplayLabel(reference.source)
  } : void 0;
}

// js/vendor/kairos/src/gui/sudo/sudoFirePlanIntel.ts
var SUDO_FIRE_PLAN_SOURCE_NAME = "senario.pdf page 06 \uCD5C\uC801 \uD0C0\uACA9\uBC29\uBC95\u318D\uD1B5\uD569\uD654\uB825\uC6B4\uC6A9\uB3C4\uD45C";
var SUDO_FIRE_PLAN_SOURCE_PATH = "client/public/sudo_data/md/sources/senario.md";
var SUDO_STRIKE_ASSET_SOURCE_ROWS = [
  {
    asset: "CAS",
    availableFrom: "10:30",
    availableTo: "11:30",
    score: 95
  },
  {
    asset: "\uD3EC\uBCD1",
    availableFrom: "00:00",
    availableTo: "23:59",
    score: 90
  },
  {
    asset: "\uC721\uAD70\uD56D\uACF5",
    availableFrom: "12:00",
    availableTo: "23:59",
    score: 70
  },
  {
    asset: "CAS(2\uCC28)",
    availableFrom: "14:00",
    availableTo: "15:00",
    score: 82
  }
];
var SUDO_STRIKE_METHOD_SOURCE_ROWS = [
  {
    method: "CAS+\uD3EC\uBCD1",
    tai: "TAI #5",
    hTime: "11:00",
    dp: "DP #3",
    rank: "1\uC21C\uC704",
    basis: "\uC801 \uC774\uB3D9\uC18D\uB3C4 20km/h\uC640 \uAC00\uC6A9\uC2DC\uAC04 \uD310\uB2E8 \uACB0\uACFC H\uC2DC 11:00 CAS+\uD3EC\uBCD1",
    source: `${SUDO_FIRE_PLAN_SOURCE_NAME} OCR \uCD5C\uC801 \uD0C0\uACA9\uBC29\uBC95`
  },
  {
    method: "JAAT",
    tai: "TAI #7",
    hTime: "14:00",
    dp: "DP #7",
    rank: "2\uC21C\uC704",
    basis: "CAS 2\uCC28 \uAC00\uC6A9\uC2DC\uAC04 14:00~15:00 \uBC0F \uC721\uAD70\uD56D\uACF5 \uC5F0\uACC4 \uD6C4\uBCF4",
    source: `${SUDO_FIRE_PLAN_SOURCE_NAME} OCR \uAC00\uC6A9\uC790\uC0B0`
  },
  {
    method: "Fire-Eagle",
    tai: "TAI #8",
    hTime: "12:00",
    dp: "DP #2",
    rank: "3\uC21C\uC704",
    basis: "\uC721\uAD70\uD56D\uACF5 12:00 \uC774\uD6C4 \uAC00\uB2A5 \uC870\uAC74\uC758 \uBCF4\uC870 \uD6C4\uBCF4",
    source: `${SUDO_FIRE_PLAN_SOURCE_NAME} OCR Fire-Eagle`
  }
];
var SUDO_FIRE_PLAN_SOURCE_ROWS = [
  {
    time: "H-10~H",
    asset: "602\uD3EC\uBCD1\uB300\uB300\xB7\uD3EC1\uB300\uB300\xB7669\uD3EC\uBCD1\uB300\uB300",
    action: "SEAD \uC0AC\uC804 \uD3EC\uBCD1\uC0AC\uACA9 / CAS \uACF5\uC5ED \uC778\uACC4",
    effect: "\uBC29\uACF5 \uC81C\uC555",
    phase: "\uC0AC\uC804\uCC28\uB2E8",
    source: `${SUDO_FIRE_PLAN_SOURCE_NAME} OCR \uD0C0\uACA9\uACC4\uD68D`
  },
  {
    time: "H~H+10",
    asset: "19\uC804\uD22C\uBE44\uD589\uB2E8 F-16 2/T",
    action: "\uC591\uC8FC CAS/RJS \uC9C4\uC785 / \uACF5\uC5ED \uC2DC\uAC04\uBD84\uB9AC",
    effect: "\uC804\uCC28 \uD45C\uC801 \uC601\uC0C1\uC815\uBCF4 \uC804\uC1A1",
    phase: "\uC8FC\uD0C0\uACA9",
    source: `${SUDO_FIRE_PLAN_SOURCE_NAME} OCR \uD1B5\uD569\uD654\uB825\uC6B4\uC6A9\uB3C4\uD45C`
  },
  {
    time: "H+10~H+20",
    asset: "602\uD3EC\uBCD1\uB300\uB300\xB7\uD3EC1\uB300\uB300\xB7669\uD3EC\uBCD1\uB300\uB300",
    action: "TOT \uD3EC\uBCD1\uC0AC\uACA9 / \uC794\uC5EC \uC9C4\uCD9C \uCC28\uB2E8",
    effect: "\uC804\uCC28 \uD45C\uC801 HE 48R \uB099\uD0C4",
    phase: "\uD6C4\uC18D\uCC28\uB2E8",
    source: `${SUDO_FIRE_PLAN_SOURCE_NAME} OCR \uD0C0\uACA9\uACC4\uD68D`
  },
  {
    time: "H-10~H+30",
    asset: "\uC804\uC790\uC804",
    action: "\uC804\uC790\uC804 \uACF5\uACA9 / \uD1B5\uC2E0\uCC28\uB2E8",
    effect: "\uC9C0\uD718\uD1B5\uC81C \uCC28\uB2E8",
    phase: "\uC9C0\uC18D\uC9C0\uC6D0",
    source: `${SUDO_FIRE_PLAN_SOURCE_NAME} OCR \uC804\uC790\uC804 \uACF5\uACA9`
  },
  {
    time: "H-10~H+30",
    asset: "FASCAM",
    action: "DP #3~TAI #5 \uAE30\uB3D9\uC800\uC9C0",
    effect: "\uAE30\uB3D9\uC81C\uD55C",
    phase: "\uC9C0\uC18D\uC9C0\uC6D0",
    source: `${SUDO_FIRE_PLAN_SOURCE_NAME} OCR FASCAM \uC0AC\uACA9\uACC4\uD68D`
  }
];
function buildSudoStrikeAssetDecisionInputs() {
  return SUDO_STRIKE_ASSET_SOURCE_ROWS.map((row) => ({ ...row }));
}
function buildSudoFirePlanDecisionInputs() {
  return SUDO_FIRE_PLAN_SOURCE_ROWS.map(
    ({ source: _source, phase: _phase, ...row }) => ({
      ...row
    })
  );
}
function buildSudoStrikeMethodSourceTable() {
  return {
    title: "\uCD5C\uC801 \uD0C0\uACA9\uBC29\uBC95 \uC6D0\uBCF8\uADFC\uAC70",
    columns: [
      { key: "method", label: "\uD0C0\uACA9\uBC29\uBC95" },
      { key: "tai", label: "TAI" },
      { key: "hTime", label: "H\uC2DC" },
      { key: "dp", label: "DP" },
      { key: "rank", label: "\uC21C\uC704" },
      { key: "basis", label: "\uC6D0\uBB38\uADFC\uAC70" },
      { key: "source", label: "\uCD9C\uCC98" }
    ],
    rows: SUDO_STRIKE_METHOD_SOURCE_ROWS.map((row) => ({
      ...row,
      source: formatSudoSourceDisplayLabel(row.source)
    }))
  };
}
function buildSudoStrikeAssetSourceTable() {
  return {
    title: "\uAC00\uC6A9\uC790\uC0B0 \uC6D0\uBCF8\uC2DC\uAC04\uD45C",
    columns: [
      { key: "asset", label: "\uC790\uC0B0" },
      { key: "window", label: "\uAC00\uC6A9\uC2DC\uAC04" },
      { key: "grade", label: "\uC6D0\uBCF8\uD310\uB2E8" },
      { key: "source", label: "\uCD9C\uCC98" }
    ],
    rows: SUDO_STRIKE_ASSET_SOURCE_ROWS.map((row) => ({
      asset: row.asset,
      window: `${row.availableFrom}~${row.availableTo}`,
      grade: row.asset === "CAS" ? "H\uC2DC 11:00 \uC8FC\uC804 \uAC00\uB2A5" : row.asset === "\uD3EC\uBCD1" ? "24\uC2DC\uAC04 \uAC00\uB2A5" : row.asset === "\uC721\uAD70\uD56D\uACF5" ? "12:00 \uC774\uD6C4 \uAC00\uB2A5" : "14:00~15:00 \uC608\uBE44 CAS",
      source: formatSudoSourceDisplayLabel(
        `${SUDO_FIRE_PLAN_SOURCE_NAME} OCR \uAC00\uC6A9\uC790\uC0B0`
      )
    }))
  };
}
function buildSudoFirePlanSourceTable() {
  return {
    title: "\uD1B5\uD569\uD654\uB825\uC6B4\uC6A9\uB3C4\uD45C \uC6D0\uBCF8\uADFC\uAC70",
    columns: [
      { key: "time", label: "\uC2DC\uAC04" },
      { key: "asset", label: "\uC790\uC0B0" },
      { key: "action", label: "\uACC4\uD68D" },
      { key: "effect", label: "\uD6A8\uACFC" },
      { key: "phase", label: "\uB2E8\uACC4" },
      { key: "source", label: "\uCD9C\uCC98" }
    ],
    rows: SUDO_FIRE_PLAN_SOURCE_ROWS.map((row) => ({
      ...row,
      source: formatSudoSourceDisplayLabel(row.source)
    }))
  };
}
function getSudoStrikeMethodRowsForVisual() {
  return SUDO_STRIKE_METHOD_SOURCE_ROWS.map(({ source: _source, ...row }) => ({
    method: row.method,
    tai: row.tai,
    time: row.hTime,
    dp: row.dp,
    rank: row.rank
  }));
}
function getSudoFirePlanRowsForVisual() {
  return SUDO_FIRE_PLAN_SOURCE_ROWS.map(
    ({ source: _source, phase: _phase, ...row }) => ({
      ...row
    })
  );
}

// js/vendor/kairos/src/gui/sudo/sudoScenarioSourceData.ts
var DEFAULT_SUDO_SCENARIO_SOURCE_DATA_URL = "/sudo_data/_extracted/scenario_6_1/structured_scenario_6_1.json";
function isRecord(value) {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}
function asString(value) {
  return typeof value === "string" && value.trim() ? value.trim() : void 0;
}
function asNumber(value) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : void 0;
  }
  return void 0;
}
function asStringArray(value) {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.map((item) => asString(item)).filter((item) => Boolean(item));
}
function normalizeGeneratedAssets(value) {
  if (!isRecord(value)) {
    return void 0;
  }
  const entries = Object.entries(value).map(([key, item]) => [key, asString(item)]).filter((entry) => Boolean(entry[1]));
  return entries.length > 0 ? Object.fromEntries(entries) : void 0;
}
function normalizeAssetUse(value) {
  if (!isRecord(value)) {
    return void 0;
  }
  const assetUse = {
    main: asString(value.main),
    sub: asString(value.sub)
  };
  return assetUse.main || assetUse.sub ? assetUse : void 0;
}
function normalizeSudoScenarioSourceStage(value) {
  if (!isRecord(value)) {
    return void 0;
  }
  const id = asNumber(value.id);
  const title = asString(value.title);
  if (!id || !title) {
    return void 0;
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
    codeAction: asString(value.codeAction)
  };
}
function normalizeSudoScenarioSourceData(value) {
  if (!isRecord(value)) {
    throw new Error("SUDO \uC2DC\uB098\uB9AC\uC624 \uC6D0\uC790\uB8CC JSON \uD615\uC2DD\uC774 \uC544\uB2D9\uB2C8\uB2E4.");
  }
  const stages = Array.isArray(value.stages) ? value.stages.map((stage) => normalizeSudoScenarioSourceStage(stage)).filter(
    (stage) => stage !== void 0
  ) : [];
  if (stages.length === 0) {
    throw new Error("SUDO \uC2DC\uB098\uB9AC\uC624 \uC6D0\uC790\uB8CC \uB2E8\uACC4\uAC00 \uC5C6\uC2B5\uB2C8\uB2E4.");
  }
  return {
    schemaVersion: asString(value.schemaVersion),
    source: asString(value.source),
    sourceStatus: asString(value.sourceStatus),
    generatedAssets: normalizeGeneratedAssets(value.generatedAssets),
    notes: asStringArray(value.notes),
    stages
  };
}
function getSudoScenarioSourceDataUrl() {
  return resolvePublicAssetPath(DEFAULT_SUDO_SCENARIO_SOURCE_DATA_URL);
}
async function loadSudoScenarioSourceData(url = getSudoScenarioSourceDataUrl(), fetchImpl = fetch) {
  const response = await fetchImpl(url, {
    headers: { Accept: "application/json" }
  });
  if (!response.ok) {
    throw new Error(`SUDO \uC2DC\uB098\uB9AC\uC624 \uC6D0\uC790\uB8CC \uC694\uCCAD \uC2E4\uD328: HTTP ${response.status}`);
  }
  const payload = await response.json();
  return {
    document: normalizeSudoScenarioSourceData(payload),
    url,
    loadedAt: (/* @__PURE__ */ new Date()).toISOString()
  };
}
function findSudoScenarioSourceStage(document2, scenarioId) {
  return document2.stages.find((stage) => stage.id === scenarioId);
}
var SUDO_SCENARIO_SOURCE_STAGE_FALLBACKS = {
  1: {
    id: 1,
    title: "\uB4DC\uB860 \uD45C\uC801 \uC2DD\uBCC4",
    page: 1,
    timeBand: "H~H+5'",
    combatLayer: "\uADFC\uC811 \uD654\uB825 \uC804\uD22C",
    implementationLevel: "\uD544\uC218 \uAD6C\uD604",
    requirements: [
      "\uB4DC\uB860\uC774 \uD45C\uC801\uC2DD\uBCC4 \uC2DC \uC54C\uB9BC\uCC3D \uC804\uC2DC",
      "\uC9C0\uD615DB(\uC7A5\uB3C4\uD6C8\uB828\uC7A5) \uC804\uC2DC",
      "\uB4DC\uB860\uC6B4\uC6A9 \uD604\uD669 \uAC00\uC2DC\uD654: \uB4DC\uB860\uC790\uC138, \uC704\uCE58, \uACE0\uB3C4, \uAC10\uC2DC\uC88C\uD45C"
    ],
    sourceRefs: ["1-1", "1-2"],
    sourceFiles: [
      "1-1 \uC7A5\uB3C4\uD6C8\uB828\uC7A5 \uAE30\uB3D9(\uC5F0\uACB0\uD504\uB85C\uADF8\uB7A8 \uC0AC\uC9C4\uC73C\uB85C \uC7AC\uC0DD)",
      "1-1\uC124\uBA85\uC790\uB8CC.hwp",
      "1-2 \uC7A5\uB3C4\uD6C8\uB828\uC7A5 \uC0AC\uC9C4.show"
    ],
    assetUse: {
      main: "\uCDA9\uC758 AI \uD45C\uC801\uC2DD\uBCC4 \uC54C\uB9BC, \uB4DC\uB860 \uC88C\uD45C/\uD45C\uC801\uC88C\uD45C, \uC9C0\uD615DB",
      sub: "\uC7A5\uB3C4\uD6C8\uB828\uC7A5 \uCD2C\uC601 \uC601\uC0C1/\uC0AC\uC9C4 \uBC0F \uC9C0\uD615DB"
    },
    codeAction: "scenario 1\uC758 \uBBF8\uB514\uC5B4\uB97C \uC2E4\uC81C 1-1 \uC601\uC0C1/1-2 \uC2AC\uB77C\uC774\uB4DC\uB85C \uAD50\uCCB4\uD558\uACE0 \uB4DC\uB860\uC6B4\uC6A9 \uD604\uD669\uAC12\uC744 \uC6D0\uC790\uB8CC \uAE30\uC900\uC73C\uB85C \uB9DE\uCD98\uB2E4."
  },
  2: {
    id: 2,
    title: "\uD45C\uC801\uC131\uC9C8 \uC2DD\uBCC4",
    page: 1,
    timeBand: "H+5'~H+10'",
    combatLayer: "\uADFC\uC811 \uD654\uB825 \uC804\uD22C",
    implementationLevel: "\uD544\uC218 \uAD6C\uD604",
    requirements: [
      "\uAC1D\uCCB4\uC778\uC2DD\uC744 \uD1B5\uD55C \uD45C\uC801\uC131\uC9C8 \uC2DD\uBCC4",
      "\uAC1D\uCCB4\uC778\uC2DD \uBD84\uC11D\uACFC\uC815 \uAC00\uC2DC\uD654",
      "\uD45C\uC801\uC131\uC9C8 \uD310\uB2E8\uADFC\uAC70 \uB098\uC5F4/\uD310\uC815"
    ],
    sourceRefs: ["2-1~3", "2-4~5", "2-6~7"],
    sourceFiles: [
      "2-1~3 \uCC9C\uBB34\uC601\uC0C1",
      "2-4 \uCC9C\uBB34\uD615\uC0C1 \uBC0F \uC0AC\uC9C4\uC790\uB8CC.show",
      "2-5 \uAC1D\uCCB4\uC778\uC2DD(\uC5F0\uACB0\uD504\uB85C\uADF8\uB7A8 \uC0AC\uC9C4\uC73C\uB85C \uC7AC\uC0DD) .wmv",
      "2-6 \uCC9C\uBB34 \uCC38\uACE0\uC790\uB8CC.pdf",
      "2-7 \uCC9C\uBB34 \uAD50\uC721\uC790\uB8CC.pptx"
    ],
    assetUse: {
      main: "240mm \uBC29\uC0AC\uD3EC(M-1991) \uD310\uB2E8 \uADFC\uAC70\uC640 \uC2E0\uB8B0\uB3C4",
      sub: "\uAC1D\uCCB4\uC778\uC2DD \uC601\uC0C1, \uCC9C\uBB34 \uD615\uC0C1/\uAD50\uC721\uC790\uB8CC, \uD310\uB2E8\uADFC\uAC70"
    },
    codeAction: "classification visual\uC758 \uD310\uB2E8\uADFC\uAC70\uB97C 2-6/2-7 \uD14D\uC2A4\uD2B8\uC640 2-5 \uC601\uC0C1 \uAE30\uBC18\uC73C\uB85C \uAC31\uC2E0\uD55C\uB2E4."
  },
  3: {
    id: 3,
    title: "\uBD80\uB300\uADDC\uBAA8 \uD310\uB2E8",
    page: 2,
    timeBand: "H~H+5'",
    combatLayer: "\uADFC\uC811 \uD654\uB825 \uC804\uD22C",
    implementationLevel: "Mock UP",
    requirements: [
      "\uAC1D\uCCB4\uC778\uC2DD\uC744 \uD1B5\uD55C \uC7A5\uBE44\uB300\uC218 \uD310\uB2E8",
      "\uD589\uAD70\uC7A5\uACBD(\uC801\uAD50\uB9AC)\uC744 \uACE0\uB824\uD55C \uBD80\uB300\uADDC\uBAA8 \uD310\uB2E8"
    ],
    sourceRefs: ["3-1"],
    sourceFiles: ["3-1 \uBD80\uB300\uBCC4 \uD589\uAD70\uC7A5\uACBD data.show", "1-1 \uC7A5\uB3C4\uD6C8\uB828\uC7A5 \uAE30\uB3D9 \uC601\uC0C1"],
    assetUse: {
      main: "\uD654\uD3EC\uBB38\uC218 4\uBB38 \uC2DD\uBCC4, \uD589\uAD70\uC7A5\uACBD \uC57D 350m, \uC911\uB300\uADDC\uBAA8 98.7%",
      sub: "\uD589\uAD70\uC7A5\uACBD \uD310\uB2E8\uD45C\uC640 \uC2E4\uC81C 1-1 \uC601\uC0C1"
    },
    codeAction: "scenario 3\uC758 scale table\uC744 3-1 \uC790\uB8CC\uC758 \uC911\uB300/\uB300\uB300/\uC804\uCC28/\uACE0\uC0AC\uD3EC/\uACAC\uC778\uD3EC \uAE30\uC900\uC73C\uB85C \uAD50\uCCB4\uD55C\uB2E4."
  },
  4: {
    id: 4,
    title: "\uC804\uD22C\uC11C\uC5F4 \uD310\uB2E8",
    page: 2,
    timeBand: "H+5'~H+10'",
    combatLayer: "\uADFC\uC811 \uD654\uB825 \uC804\uD22C",
    implementationLevel: "Mock UP",
    requirements: [
      "\uB4DC\uB860 \uCD2C\uC601 \uD45C\uC801\uC704\uCE58 \uAE30\uC900 \uCD5C\uAE30\uBD80\uB300\uC640 \uC774\uACA9\uAC70\uB9AC \uBC0F \uC608\uC0C1\uBD80\uB300 \uD655\uC778",
      "\uC774\uACA9\uAC70\uB9AC+\uBCF4\uC720\uD654\uD3EC\uB97C \uACE0\uB824\uD55C \uC804\uD22C\uC11C\uC5F4 \uD310\uB2E8\uACFC\uC815 \uAC00\uC2DC\uD654",
      "\uC804\uD22C\uC11C\uC5F4 \uD310\uB2E8\uADFC\uAC70 \uB098\uC5F4/\uD310\uC815"
    ],
    sourceRefs: ["4-1"],
    sourceFiles: ["4-1 \uD6C8\uB828\uC7A5 \uC778\uADFC\uBD80\uB300 \uC704\uCE58\uFF0C \uBCF4\uC720 \uC7A5\uBE44 \uB4F1.show"],
    assetUse: {
      main: "\uD45C\uC801\uC88C\uD45C BH 12345 67890\uC640 \uD6C4\uBCF4 \uBD80\uB300 \uC704\uCE58/\uBCF4\uC720\uD654\uAE30 \uBE44\uAD50",
      sub: "\uC778\uADFC\uBD80\uB300 \uC704\uCE58\uD45C, \uBCF4\uC720\uD654\uAE30/\uC218\uB7C9\uD45C"
    },
    codeAction: "orderCandidates\uB97C 4-1 \uD45C\uC758 BH \uC88C\uD45C, \uC774\uACA9\uAC70\uB9AC, \uC804\uD22C\uC11C\uC5F4, \uBCF4\uC720\uC7A5\uBE44 \uAE30\uC900\uC73C\uB85C \uC7AC\uC791\uC131\uD55C\uB2E4."
  },
  5: {
    id: 5,
    title: "\uBD80\uC218\uC801 \uD53C\uD574 \uD310\uB2E8",
    page: 3,
    timeBand: "H+5'~H+10'",
    combatLayer: "\uADFC\uC811 \uD654\uB825 \uC804\uD22C",
    implementationLevel: "Mock UP",
    requirements: [
      "\uD45C\uC801 \uBC0F \uBBFC\uAC00\uC9C0\uC5ED \uAC00\uC2DC\uD654",
      "\uD45C\uC801\uC73C\uB85C\uBD80\uD130 \uBBFC\uAC00\uC9C0\uC5ED \uC774\uACA9\uAC70\uB9AC \uC804\uC2DC",
      "\uD0C4\uC885\uBCC4 \uBD80\uC218\uD53C\uD574 \uBC1C\uC0DD\uAC00\uB2A5\uC131 \uBD84\uC11D\uACFC\uC815 \uAC00\uC2DC\uD654 \uBC0F \uC0AC\uC6A9\uAC00\uB2A5\uD0C4\uC885 \uC81C\uC2DC"
    ],
    sourceRefs: ["5-1"],
    sourceFiles: ["5-1 \uD0C4\uC885\uBCC4 \uBD80\uC218\uC801 \uD6A8\uACFC\uBC18\uACBD.show"],
    assetUse: {
      main: "\uBBFC\uAC00 \uC774\uACA9\uAC70\uB9AC\uC640 \uD0C4\uC885\uBCC4 CDE \uBC18\uACBD \uBE44\uAD50",
      sub: "\uD0C4\uC885\uBCC4 \uBD80\uC218\uC801 \uD6A8\uACFC\uBC18\uACBD \uD45C"
    },
    codeAction: "collateralMunitions\uB97C \uAC70\uB9AC\uBCC4 HE/HEBB/DP/DPBB/\uC720\uB3C4\uD0C4 \uBC18\uACBD \uD14C\uC774\uBE14\uB85C \uD655\uC7A5\uD55C\uB2E4."
  },
  6: {
    id: 6,
    title: "Army GPT \uCDE8\uC57D\uC810 \uC9C8\uC758",
    page: 3,
    timeBand: "H+5'~H+10'",
    combatLayer: "\uADFC\uC811 \uD654\uB825 \uC804\uD22C",
    implementationLevel: "Mock UP",
    requirements: [
      "\uCDA9\uC758-GPT(AI\uC5B4\uC2DC\uC2A4\uD134\uD2B8)\uB97C \uD1B5\uD574 \uC2E4\uC2DC\uAC04 \uC801 \uCDE8\uC57D\uC810 \uB4F1 \uC815\uBCF4 \uC81C\uACF5"
    ],
    sourceRefs: ["6-1"],
    sourceFiles: ["6-1 240mm \uBC0F 152mm \uCDE8\uC57D\uC810.Show"],
    assetUse: {
      main: "240mm \uBC29\uC0AC\uD3EC/152mm \uC790\uC8FC\uD3EC \uCDE8\uC57D\uC810 \uB2F5\uBCC0",
      sub: "\uB300\uD654\uD615 assistant \uB2F5\uBCC0\uACFC \uCDE8\uC57D\uC810 \uCE74\uB4DC"
    },
    codeAction: "sudoAssistant context\uC5D0 6-1 \uCDE8\uC57D\uC810 \uC694\uC57D\uC744 knowledge base\uB85C \uC5F0\uACB0\uD55C\uB2E4."
  },
  7: {
    id: 7,
    title: "\uD0C4\uC885/\uBC1C\uC218 \uD310\uB2E8",
    page: 4,
    timeBand: "H+5'~H+10'",
    combatLayer: "\uADFC\uC811 \uD654\uB825 \uC804\uD22C",
    implementationLevel: "\uD544\uC218 \uAD6C\uD604",
    requirements: [
      "\uD45C\uC801\uC131\uC9C8 \uBC0F \uC9C0\uD615\uBD84\uC11D(\uC0B0\uB9BC, \uAC1C\uD65C\uC9C0) \uACB0\uACFC",
      "\uBB34\uAE30\uD6A8\uACFC \uD310\uB2E8 \uD504\uB85C\uADF8\uB7A8\uC5D0 \uC758\uD55C \uCD5C\uC801 \uD0C4\uC885/\uBC1C\uC218 \uC120\uC815\uACFC\uC815 \uBC0F \uD310\uB2E8\uACB0\uACFC \uC81C\uC2DC"
    ],
    sourceRefs: ["7-1", "7-2"],
    sourceFiles: ["7-1~2 \uC9C0\uD615DB\uFF0C \uD0C4\uC885 \uBC0F \uBC1C\uC218 \uD310\uB2E8 \uC790\uB8CC.hwp"],
    assetUse: {
      main: "\uC9C0\uD615\uBE44\uC728, \uC0AC\uAC70\uB9AC, \uC694\uB9DD\uD6A8\uACFC \uAE30\uBC18 \uD0C4\uC885/\uBC1C\uC218 \uD310\uB2E8",
      sub: "\uC9C0\uD615DB \uC0C9\uC0C1/\uBD84\uB958\uC640 \uBB34\uAE30\uD6A8\uACFC \uD310\uB2E8 \uACB0\uACFC"
    },
    codeAction: "munition visual\uACFC decision engine\uC5D0 \uD45C\uC801\uC131\uC9C8+\uC9C0\uD615+\uC0AC\uAC70\uB9AC+\uC694\uB9DD\uD6A8\uACFC\uBCC4 \uBC1C\uC218 \uD14C\uC774\uBE14\uC744 \uCD94\uAC00\uD55C\uB2E4."
  },
  8: {
    id: 8,
    title: "\uCD5C\uC801 \uC0AC\uACA9\uBD80\uB300 \uC120\uC815",
    page: 4,
    timeBand: "H+5'~H+10'",
    combatLayer: "\uADFC\uC811 \uD654\uB825 \uC804\uD22C",
    implementationLevel: "\uD544\uC218 \uAD6C\uD604",
    requirements: [
      "\uC0AC\uACA9\uBD80\uB300 \uD6C4\uBCF4 5\uAC1C \uD56D\uBAA9 \uD3C9\uAC00",
      "\uCD5C\uC801 \uC0AC\uACA9\uBD80\uB300 \uC120\uC815\uACFC \uD310\uB2E8\uADFC\uAC70 \uC81C\uC2DC"
    ],
    sourceRefs: ["8-1"],
    sourceFiles: ["8-1 \uCD5C\uC801\uC758 \uC0AC\uACA9\uBD80\uB300 \uC120\uC815 \uD310\uB2E8 \uC790\uB8CC.hwp"],
    assetUse: {
      main: "\uC0AC\uAC70\uB9AC, \uC0DD\uC874\uC131, \uD0C4\uBCF4\uC720\uB7C9, \uBBFC\uAC04\uD53C\uD574, \uC804\uD22C\uB825\uC218\uC900 \uD3C9\uAC00",
      sub: "\uC0AC\uACA9\uBD80\uB300 \uD6C4\uBCF4 \uC9C0\uB3C4/\uD45C"
    },
    codeAction: "fireUnits \uC785\uB825\uC744 8-1 \uC790\uB8CC\uC758 668/K55/K105/4.2\uC778\uCE58 \uD6C4\uBCF4\uD45C\uB85C \uAD50\uCCB4\uD55C\uB2E4."
  },
  9: {
    id: 9,
    title: "\uC0AC\uD0DC\uBD84\uC11D\uB3C4 \uBD84\uC11D",
    page: 5,
    timeBand: "H+20'~H+30'",
    combatLayer: "\uC885\uC2EC \uD654\uB825 \uC804\uD22C",
    implementationLevel: "Mock UP",
    requirements: [
      "\uC608\uC0C1\uC774\uB3D9\uB85C\uB97C \uACE0\uB824\uD55C \uC801 \uBC29\uCC45 \uC81C\uC2DC",
      "NAI, TAI \uC9C0\uC810 \uC120\uC815\uACFC\uC815 \uC81C\uC2DC \uBC0F \uCD5C\uC801 \uD310\uB2E8\uACB0\uACFC"
    ],
    sourceRefs: ["9-1"],
    sourceFiles: ["9-1 \uC0AC\uD0DC\uBD84\uC11D\uB3C4 \uBC0F \uB3C4\uB85C\uC815\uBCF4.show"],
    assetUse: {
      main: "\uC0AC\uD0DC\uBD84\uC11D\uB3C4 #1/#2 \uBE44\uAD50, \uB3C4\uB85C\uC815\uBCF4 \uAE30\uBC18 \uBC29\uCC45 \uD310\uB2E8",
      sub: "\uC791\uC804\uC9C0\uC5ED/\uB3C4\uB85C \uC784\uC758 \uB370\uC774\uD130"
    },
    codeAction: "routeOptions\uB97C 9-1\uC758 \uC0AC\uD0DC\uBD84\uC11D\uB3C4 #1/#2\uC640 \uB3C4\uB85C/\uAD50\uB7C9 \uC81C\uC57D\uC73C\uB85C \uC7AC\uC791\uC131\uD55C\uB2E4."
  },
  10: {
    id: 10,
    title: "\uB4DC\uB860 \uC7AC\uBC30\uCE58/\uC774\uB3D9\uD1B5\uC81C",
    page: 5,
    timeBand: "H+20'~H+30'",
    combatLayer: "\uC885\uC2EC \uD654\uB825 \uC804\uD22C",
    implementationLevel: "Mock UP",
    requirements: [
      "\uC9C0\uD615\uC815\uBCF4\uC5D0\uC11C \uB4DC\uB860\uC774\uB3D9\uC0AC\uD56D \uC804\uC2DC",
      "\uB4DC\uB860\uC774\uB3D9\uD1B5\uC81C\uC0AC\uD56D \uC804\uC2DC",
      "\uBCF4\uC870 GPT \uB610\uB294 \uC8FC \uD654\uBA74 \uBA54\uB274\uBC14 \uAD6C\uC131"
    ],
    sourceRefs: ["9-1"],
    sourceFiles: ["9-1 \uC0AC\uD0DC\uBD84\uC11D\uB3C4 \uBC0F \uB3C4\uB85C\uC815\uBCF4.show"],
    assetUse: {
      main: "\uC0AC\uD0DC\uBD84\uC11D\uB3C4 \uD310\uB2E8\uC548 2\uBC88 \uAE30\uBC18 \uB4DC\uB860 \uC7AC\uBC30\uCE58 \uBA85\uB839",
      sub: "NAI/TAI/DP \uC774\uB3D9 \uC9C0\uC2DC\uC640 \uC9C4\uD589\uB960"
    },
    codeAction: "droneRedeploymentOrders\uB97C \uC2E4\uC81C NAI/TAI/DP \uC9C0\uC810\uACFC \uC5F0\uACB0\uD558\uACE0 assistant \uBA85\uB839\uACFC \uB3D9\uAE30\uD654\uD55C\uB2E4."
  },
  11: {
    id: 11,
    title: "\uCD5C\uC801 \uD0C0\uACA9\uBC29\uBC95 \uACB0\uC815",
    page: 6,
    timeBand: "H+30'~H+50'",
    combatLayer: "\uC885\uC2EC \uD654\uB825 \uC804\uD22C",
    implementationLevel: "Mock UP",
    requirements: [
      "\uAC00\uC6A9\uC790\uC0B0 \uD604\uD669(CAS, \uC721\uD56D \uB4F1)",
      "\uC9C0\uD615 \uBC0F \uAC00\uC6A9\uC2DC\uAC04\uC744 \uACE0\uB824\uD55C \uCD5C\uC801 \uD0C0\uACA9\uBC29\uBC95 \uC120\uC815\uACFC\uC815 \uBC0F \uCD5C\uC885\uD310\uB2E8\uACB0\uACFC \uC81C\uC2DC"
    ],
    sourceRefs: ["senario.pdf #11", "page 06 OCR"],
    sourceFiles: [
      SUDO_FIRE_PLAN_SOURCE_NAME,
      "PDF \uC6D0\uBCF8 \uC791\uC131\uC911 - \uC571 \uBCF4\uAC15 DATA",
      `\uAC00\uC6A9\uC790\uC0B0 \uC6D0\uBCF8\uC2DC\uAC04\uD45C ${SUDO_STRIKE_ASSET_SOURCE_ROWS.length}\uD589`,
      `\uCD5C\uC801 \uD0C0\uACA9\uBC29\uBC95 \uC6D0\uBCF8\uADFC\uAC70 ${SUDO_STRIKE_METHOD_SOURCE_ROWS.length}\uD589`
    ],
    assetUse: {
      main: "CAS/\uC721\uD56D/\uD3EC\uBCD1 \uAC00\uC6A9\uC2DC\uAC04\uD45C, \uCD94\uCC9C TAI/DP \uC21C\uC704",
      sub: "\uCD5C\uC801 \uD0C0\uACA9\uBC29\uBC95 \uACB0\uC815\uD45C"
    },
    codeAction: "strikeAssets\uB97C senario.pdf page 06 OCR\uC758 CAS/\uC721\uD56D/\uD3EC\uBCD1 \uAC00\uC6A9\uC2DC\uAC04\uC73C\uB85C \uAC31\uC2E0\uD55C\uB2E4."
  },
  12: {
    id: 12,
    title: "\uD1B5\uD569\uD654\uB825\uC6B4\uC6A9\uB3C4\uD45C \uC791\uC131",
    page: 6,
    timeBand: "H+30'~H+50'",
    combatLayer: "\uC885\uC2EC \uD654\uB825 \uC804\uD22C",
    implementationLevel: "\uD544\uC218 \uAD6C\uD604",
    requirements: [
      "\uD1B5\uD569\uD654\uB825\uC6B4\uC6A9\uB3C4\uD45C \uC791\uC131\uACB0\uACFC \uC804\uC2DC",
      "\uD1B5\uD569\uD654\uB825\uC6B4\uC6A9\uB3C4\uD45C \uD310\uB2E8\uACFC\uC815 \uBC0F \uCD5C\uC885 \uC791\uC131\uACB0\uACFC \uC81C\uC2DC"
    ],
    sourceRefs: ["senario.pdf #12", "page 06 OCR"],
    sourceFiles: [
      SUDO_FIRE_PLAN_SOURCE_NAME,
      "PDF \uC6D0\uBCF8 \uC791\uC131\uC911 - \uC571 \uBCF4\uAC15 DATA",
      `\uD1B5\uD569\uD654\uB825\uC6B4\uC6A9\uB3C4\uD45C \uC6D0\uBCF8\uADFC\uAC70 ${SUDO_FIRE_PLAN_SOURCE_ROWS.length}\uD589`
    ],
    assetUse: {
      main: "\uD1B5\uD569\uD654\uB825\uC6B4\uC6A9\uB3C4\uD45C, \uD310\uB2E8\uADFC\uAC70, H \uC2DC\uAC01",
      sub: "\uD1B5\uD569\uD654\uB825\uC6B4\uC6A9\uB3C4\uD45C \uC774\uBBF8\uC9C0/\uD45C"
    },
    codeAction: "firePlanRows\uC640 fireControlPoints\uB97C senario.pdf page 06 \uD1B5\uD569\uD654\uB825\uC6B4\uC6A9\uB3C4\uD45C \uAD6C\uC870\uB85C \uBCF4\uAC15\uD55C\uB2E4."
  },
  13: {
    id: 13,
    title: "\uB300\uD3EC\uBCD1\uD0D0\uC9C0 R/D \uC2E4\uC874\xB7\uD5C8\uC0C1\uD45C\uC801 \uD310\uB2E8",
    page: 7,
    timeBand: "\uBCC4\uB3C4 R/D \uD310\uB2E8 \uB2E8\uACC4",
    combatLayer: "\uB300\uD3EC\uBCD1\uD0D0\uC9C0 R/D",
    implementationLevel: "Mock UP",
    requirements: [
      "\uD45C\uC801\uD0D0\uC9C0 \uC2DC \uD45C\uC801\uD0D0\uC9C0 \uC54C\uB78C",
      "\uC88C\uCE21\uC5D0\uB294 R/D \uC9C4\uC9C0 \uD0D0\uC9C0 \uC815\uBCF4\uC640 \uAD00\uB828 \uBA54\uB274\uBC14 \uC81C\uC2DC",
      "\uC6B0\uCE21\uC5D0\uB294 \uC9C0\uD718\uC18C \uD0C0\uCD9C\uCC98 \uC815\uBCF4\uAE4C\uC9C0 \uACE0\uB824\uD55C \uBA54\uB274\uBC14 \uC81C\uC2DC"
    ],
    sourceRefs: ["13-1"],
    sourceFiles: ["13-1 \uC2E4\uC874\u318D\uD5C8\uC0C1\uD45C\uC801 \uD310\uB2E8\uD45C.hwp"],
    assetUse: {
      main: "\uC2E4\uC874(10%)/\uD5C8\uC0C1(90%) \uD310\uB2E8 \uACB0\uACFC\uC640 \uD310\uB2E8\uADFC\uAC70",
      sub: "R/D \uC9C4\uC9C0 \uCCB4\uD06C\uB9AC\uC2A4\uD2B8\uC640 \uC9C0\uD718\uC18C \uD0C0\uCD9C\uCC98 \uC815\uBCF4"
    },
    codeAction: "ARTAS/RD \uD310\uB2E8\uC740 \uC81C\uACF5\uB41C dan/daedae \uB808\uBCA8 PDF \uBCF8\uC120 \uD750\uB984 \uBC16\uC758 \uD655\uC7A5 \uADFC\uAC70\uB85C \uBCF4\uC874\uD55C\uB2E4."
  },
  14: {
    id: 14,
    title: "\uD0C0\uACA9\uACB0\uACFC \uD3C9\uAC00",
    page: 6,
    timeBand: "BDA \uD6C4\uC18D \uD3C9\uAC00",
    combatLayer: "\uC885\uC2EC \uD654\uB825 \uC804\uD22C",
    implementationLevel: "\uC571 \uD655\uC7A5",
    requirements: [
      "\uD0C0\uACA9\uACB0\uACFC \uC601\uC0C1\uC744 \uAE30\uC900\uC73C\uB85C \uD53C\uD574\uC728\uACFC \uC794\uC5EC\uD45C\uC801\uC744 \uD3C9\uAC00",
      "\uC694\uB9DD\uD6A8\uACFC \uB300\uBE44 \uAD00\uCE21 \uD53C\uD574\uC728\uC744 \uBE44\uAD50\uD574 \uC7AC\uD0C0\uACA9 \uD544\uC694\uC131\uC744 \uC81C\uC2DC",
      "BDA \uC785\uB825 \uC790\uB8CC\uC640 scenario_6_1 page_06 figure\uB97C \uADFC\uAC70\uB85C \uACB0\uACFC \uC804\uC2DC"
    ],
    sourceRefs: ["dan_level_Senario.pdf #13", "BDA \uC785\uB825", "page 06 figure"],
    sourceFiles: [
      SUDO_BDA_SOURCE_NAME,
      `\uD0C0\uACA9\uACB0\uACFC \uD3C9\uAC00 figure ${SUDO_BDA_FIGURE_ID}`,
      SUDO_BDA_SOURCE_PATH
    ],
    assetUse: {
      main: "\uC694\uB9DD\uD6A8\uACFC \uB300\uBE44 \uD0C0\uACA9\uACB0\uACFC, \uC794\uC5EC \uD45C\uC801, \uC7AC\uD0C0\uACA9 \uC5EC\uBD80",
      sub: "BDA \uACB0\uACFC \uBCF4\uB4DC\uC640 \uD0C0\uACA9\uACB0\uACFC \uD3C9\uAC00 figure"
    },
    codeAction: "observedDamagePercent, remainingTargets, bdaRequiredDamagePercent\uB97C BDA \uD310\uB2E8\uC5D4\uC9C4 \uC785\uB825\uC73C\uB85C \uC5F0\uACB0\uD55C\uB2E4."
  }
};
function cloneSudoScenarioSourceStage(stage) {
  return {
    ...stage,
    requirements: [...stage.requirements],
    sourceRefs: [...stage.sourceRefs],
    sourceFiles: [...stage.sourceFiles],
    assetUse: stage.assetUse ? { ...stage.assetUse } : void 0
  };
}
function mergeSudoScenarioSourceValues(...lists) {
  const seen = /* @__PURE__ */ new Set();
  return lists.flatMap(
    (list) => (list ?? []).map((item) => item.trim()).filter((item) => {
      if (!item || seen.has(item)) {
        return false;
      }
      seen.add(item);
      return true;
    })
  );
}
function buildFallbackSudoScenarioSourceStage(scenarioId) {
  const stage = SUDO_SCENARIO_SOURCE_STAGE_FALLBACKS[scenarioId];
  return stage ? cloneSudoScenarioSourceStage(stage) : void 0;
}
function formatSudoScenarioImplementationLevel(level) {
  const trimmed = level?.trim();
  if (!trimmed) {
    return "";
  }
  const normalized = trimmed.toLowerCase().replace(/\s+/g, "");
  if (normalized === "mockup") {
    return "\uBAA9\uC5C5 \uAE30\uC900";
  }
  return trimmed;
}
function buildSudoScenarioSourceStageLines(stage) {
  const implementationLevelLabel = formatSudoScenarioImplementationLevel(
    stage.implementationLevel
  );
  return [
    `\uC6D0\uC790\uB8CC \uB2E8\uACC4: ${stage.id}. ${stage.title}`,
    stage.timeBand ? `\uC2DC\uAC04\uB300: ${stage.timeBand}` : "",
    implementationLevelLabel ? `\uAD6C\uD604\uC218\uC900: ${implementationLevelLabel}` : "",
    ...stage.requirements.slice(0, 4).map((item) => `\uC694\uAD6C\uC0AC\uD56D: ${item}`),
    stage.assetUse?.main ? `\uC8FC \uD654\uBA74: ${stage.assetUse.main}` : "",
    stage.assetUse?.sub ? `\uBD80 \uD654\uBA74: ${stage.assetUse.sub}` : "",
    stage.codeAction ? `\uACE0\uB3C4\uD654 \uC561\uC158: ${stage.codeAction}` : ""
  ].filter(Boolean);
}

// js/vendor/kairos/src/gui/sudo/sudoScenarioImageIntel.ts
var scenarioAsset2 = (path) => resolvePublicAssetPath(`/sudo_data/_extracted/scenario_6_1/${path}`);
var sudoAsset = (path) => resolvePublicAssetPath(`/sudo_data/${path}`);
var catalogHref = sudoAsset("md/\uC2DC\uB098\uB9AC\uC624_6.1_\uC774\uBBF8\uC9C0_\uCE74\uD0C8\uB85C\uADF8.md");
var imageEvidenceByScenario = {
  1: {
    scenarioId: 1,
    page: 1,
    pageHref: scenarioAsset2("pages/page_01.png"),
    pageLabel: "PDF page 01",
    summary: "\uB4DC\uB860 \uD45C\uC801 \uC2DD\uBCC4 WARNING, \uC7A5\uB3C4\uD6C8\uB828\uC7A5 \uC9C0\uD615DB/\uB4DC\uB860\uC6B4\uC6A9 \uD604\uD669, \uD45C\uC801/\uB4DC\uB860 \uC88C\uD45C \uCEA1\uCC98",
    catalogHref,
    figures: [
      {
        id: "page_01_figure_01_xref_36",
        label: "\uD45C\uC801\uC2DD\uBCC4 \uC54C\uB9BC",
        href: scenarioAsset2("figures/page_01_figure_01_xref_36.png"),
        size: "1912x376",
        ocrExcerpt: "WARNING \uB4DC\uB8601\uC774 '\uD45C\uC801\uC744\uC2DD\uBCC4'\uD558\uC600\uC2B5\uB2C8\uB2E4"
      },
      {
        id: "page_01_figure_02_xref_37",
        label: "\uB4DC\uB860\uC6B4\uC6A9 \uD604\uD669",
        href: scenarioAsset2("figures/page_01_figure_02_xref_37.png"),
        size: "1912x376",
        ocrExcerpt: "\uD45C\uC801\uC88C\uD45C BH 12345 67890 / \uB4DC\uB860\uC88C\uD45C BH 12321 56789"
      }
    ]
  },
  2: {
    scenarioId: 2,
    page: 1,
    pageHref: scenarioAsset2("pages/page_01.png"),
    pageLabel: "PDF page 01",
    summary: "\uD45C\uC801\uC131\uC9C8 \uD310\uB2E8 WARNING, \uC804\uC1A1\uC601\uC0C1 \uAC1D\uCCB4\uC778\uC2DD \uACB0\uACFC, 240mm \uBC29\uC0AC\uD3EC \uD6C4\uBCF4 \uD655\uB960 \uCEA1\uCC98",
    catalogHref,
    figures: [
      {
        id: "page_01_figure_06_xref_57",
        label: "\uD45C\uC801\uC131\uC9C8 \uD310\uB2E8",
        href: scenarioAsset2("figures/page_01_figure_06_xref_57.png"),
        size: "1928x319",
        ocrExcerpt: "\uD45C\uC801\uC131\uC9C8 \uD310\uB2E8, 240mm \uBC29\uC0AC\uD3EC(M-1991)"
      },
      {
        id: "page_01_figure_07_xref_58",
        label: "\uAC1D\uCCB4\uC778\uC2DD \uACB0\uACFC",
        href: scenarioAsset2("figures/page_01_figure_07_xref_58.png"),
        size: "1928x319",
        ocrExcerpt: "\uC804\uC1A1\uC601\uC0C1 \uAC1D\uCCB4\uC778\uC2DD \uBD84\uC11D \uACB0\uACFC, ROMAN \uCC28\uB300, M-1991"
      }
    ]
  },
  3: {
    scenarioId: 3,
    page: 2,
    pageHref: scenarioAsset2("pages/page_02.png"),
    pageLabel: "PDF page 02",
    summary: "\uBD80\uB300\uADDC\uBAA8 \uD310\uB2E8 WARNING\uACFC \uB300\uC5F4/\uD589\uAD70\uC7A5\uACBD \uD310\uB2E8 \uD654\uBA74 \uCEA1\uCC98",
    catalogHref,
    figures: [
      {
        id: "page_02_figure_01_xref_82",
        label: "\uADDC\uBAA8\uD310\uB2E8 \uC54C\uB9BC",
        href: scenarioAsset2("figures/page_02_figure_01_xref_82.png"),
        size: "1756x321",
        ocrExcerpt: "\uC2DD\uBCC4\uB41C \uD45C\uC801\uC758 \uADDC\uBAA8\uB97C \uD310\uB2E8\uD558\uACA0\uC2B5\uB2C8\uB2E4"
      },
      {
        id: "page_02_figure_03_xref_84",
        label: "\uADDC\uBAA8\uD310\uB2E8 \uD654\uBA74",
        href: scenarioAsset2("figures/page_02_figure_03_xref_84.png"),
        size: "1277x708",
        ocrExcerpt: "\uBD80\uB300\uADDC\uBAA8 \uD310\uB2E8\uACFC \uD45C\uC801 \uC815\uBCF4 \uD654\uBA74"
      }
    ]
  },
  4: {
    scenarioId: 4,
    page: 2,
    pageHref: scenarioAsset2("pages/page_02.png"),
    pageLabel: "PDF page 02",
    summary: "\uC804\uD22C\uC11C\uC5F4 \uD310\uB2E8 WARNING\uACFC \uD6C4\uBCF4\uBD80\uB300/\uBCF4\uC720\uD654\uD3EC \uADFC\uAC70 \uCEA1\uCC98",
    catalogHref,
    figures: [
      {
        id: "page_02_figure_04_xref_85",
        label: "\uC804\uD22C\uC11C\uC5F4 \uD310\uB2E8",
        href: scenarioAsset2("figures/page_02_figure_04_xref_85.png"),
        size: "1755x321",
        ocrExcerpt: "\uC804\uD22C\uC11C\uC5F4\uC744 \uD310\uB2E8\uD558\uACA0\uC2B5\uB2C8\uB2E4"
      },
      {
        id: "page_02_figure_06_xref_87",
        label: "\uC804\uD22C\uC11C\uC5F4 \uD654\uBA74",
        href: scenarioAsset2("figures/page_02_figure_06_xref_87.png"),
        size: "1275x709",
        ocrExcerpt: "\uC804\uD22C\uC11C\uC5F4 \uD310\uB2E8\uACFC \uD45C\uC801 \uC815\uBCF4 \uD654\uBA74"
      }
    ]
  },
  5: {
    scenarioId: 5,
    page: 3,
    pageHref: scenarioAsset2("pages/page_03.png"),
    pageLabel: "PDF page 03",
    summary: "\uBD80\uC218\uC801 \uD53C\uD574 \uD310\uB2E8 WARNING, \uD45C\uC801/\uBBFC\uAC00/\uD0C4\uC885 \uD6A8\uACFC\uBC18\uACBD \uD310\uB2E8 \uD654\uBA74",
    catalogHref,
    figures: [
      {
        id: "page_03_figure_01_xref_101",
        label: "\uBD80\uC218\uD53C\uD574 \uD310\uB2E8",
        href: scenarioAsset2("figures/page_03_figure_01_xref_101.png"),
        size: "1753x319",
        ocrExcerpt: "\uBD80\uC218\uC801 \uD53C\uD574 \uD310\uB2E8\uC744 \uD558\uACA0\uC2B5\uB2C8\uB2E4"
      },
      {
        id: "page_03_figure_04_xref_104",
        label: "\uBD80\uC218\uD53C\uD574 \uADFC\uAC70",
        href: scenarioAsset2("figures/page_03_figure_04_xref_104.png"),
        size: "1631x904",
        ocrExcerpt: "\uD45C\uC801\uC815\uBCF4\uC640 \uBD80\uC218\uC801 \uD53C\uD574 \uD310\uB2E8 \uD654\uBA74"
      }
    ]
  },
  6: {
    scenarioId: 6,
    page: 3,
    pageHref: scenarioAsset2("pages/page_03.png"),
    pageLabel: "PDF page 03",
    summary: "Army GPT \uCDE8\uC57D\uC810 \uC9C8\uC758/\uB2F5\uBCC0 \uD654\uBA74\uACFC 240mm \uBC29\uC0AC\uD3EC \uCDE8\uC57D\uC810 \uCEA1\uCC98",
    catalogHref,
    figures: [
      {
        id: "page_03_figure_05_xref_105",
        label: "\uCDE8\uC57D\uC810 GPT \uB2F5\uBCC0",
        href: scenarioAsset2("figures/page_03_figure_05_xref_105.png"),
        size: "1276x697",
        ocrExcerpt: "240mm \uBC29\uC0AC\uD3EC \uCDE8\uC57D\uC810, \uBC1C\uC0AC \uC704\uCE58 \uB178\uCD9C, \uC7AC\uC7A5\uC804 \uC2DC\uAC04"
      }
    ]
  },
  7: {
    scenarioId: 7,
    page: 4,
    pageHref: scenarioAsset2("pages/page_04.png"),
    pageLabel: "PDF page 04",
    summary: "\uD0C4\uC885/\uBC1C\uC218 \uD310\uB2E8 WARNING, \uD45C\uC801\uC131\uC9C8\uACFC \uBB34\uAE30\uD6A8\uACFC \uBD84\uC11D \uD654\uBA74",
    catalogHref,
    figures: [
      {
        id: "page_04_figure_01_xref_119",
        label: "\uD0C4\uC885/\uBC1C\uC218 \uD310\uB2E8",
        href: scenarioAsset2("figures/page_04_figure_01_xref_119.png"),
        size: "1754x321",
        ocrExcerpt: "\uD45C\uC801 \uC131\uC9C8\uACFC \uBB34\uAE30\uD6A8\uACFC\uB97C \uACE0\uB824\uD558\uC5EC \uD0C4\uC885/\uBC1C\uC218\uB97C \uD310\uB2E8"
      },
      {
        id: "page_04_figure_03_xref_121",
        label: "\uD0C4\uC885/\uBC1C\uC218 \uADFC\uAC70",
        href: scenarioAsset2("figures/page_04_figure_03_xref_121.png"),
        size: "1277x709",
        ocrExcerpt: "\uD0C4\uC885/\uBC1C\uC218 \uD310\uB2E8\uACFC \uD1B5\uD569\uD654\uB825\uC6B4\uC6A9 \uD654\uBA74"
      }
    ]
  },
  8: {
    scenarioId: 8,
    page: 4,
    pageHref: scenarioAsset2("pages/page_04.png"),
    pageLabel: "PDF page 04",
    summary: "\uC0AC\uACA9\uBD80\uB300 \uC120\uC815 \uD654\uBA74\uACFC 5\uAC1C \uD56D\uBAA9 \uD3C9\uAC00 \uADFC\uAC70 \uCEA1\uCC98",
    catalogHref,
    figures: [
      {
        id: "page_04_figure_04_xref_122",
        label: "\uC0AC\uACA9\uBD80\uB300 \uC120\uC815",
        href: scenarioAsset2("figures/page_04_figure_04_xref_122.png"),
        size: "1275x706",
        ocrExcerpt: "\uC0AC\uACA9\uBD80\uB300 \uC120\uC815\uACFC \uD6C4\uBCF4\uBD80\uB300 \uD3C9\uAC00 \uD654\uBA74"
      }
    ]
  },
  9: {
    scenarioId: 9,
    page: 5,
    pageHref: scenarioAsset2("pages/page_05.png"),
    pageLabel: "PDF page 05",
    summary: "\uC0AC\uD0DC\uBD84\uC11D\uB3C4 #1/#2, \uC608\uC0C1\uC774\uB3D9\uB85C, NAI/TAI \uC870\uC815 \uADFC\uAC70 \uCEA1\uCC98",
    catalogHref,
    figures: [
      {
        id: "page_05_figure_01_xref_136",
        label: "\uC0AC\uD0DC\uBD84\uC11D\uB3C4 \uBD84\uC11D",
        href: scenarioAsset2("figures/page_05_figure_01_xref_136.png"),
        size: "1754x321",
        ocrExcerpt: "\uD1B5\uD569\uD654\uB825\uC6B4\uC6A9\uC744 \uC704\uD55C \uC0AC\uD0DC\uBD84\uC11D\uB3C4 \uBD84\uC11D"
      },
      {
        id: "page_05_figure_03_xref_138",
        label: "\uC0AC\uD0DC\uBD84\uC11D \uACB0\uACFC",
        href: scenarioAsset2("figures/page_05_figure_03_xref_138.png"),
        size: "1276x708",
        ocrExcerpt: "\uC0AC\uD0DC\uBD84\uC11D\uB3C4 \uBD84\uC11D \uACB0\uACFC"
      }
    ]
  },
  10: {
    scenarioId: 10,
    page: 5,
    pageHref: scenarioAsset2("pages/page_05.png"),
    pageLabel: "PDF page 05",
    summary: "\uC0AC\uD0DC\uBD84\uC11D\uB3C4 \uD310\uB2E8\uC548 \uAE30\uBC18 \uB4DC\uB860 \uC7AC\uBC30\uCE58 \uBA85\uB839 \uB2F5\uBCC0 \uCEA1\uCC98",
    catalogHref,
    figures: [
      {
        id: "page_05_figure_06_xref_141",
        label: "\uB4DC\uB860 \uC7AC\uBC30\uCE58 \uB2F5\uBCC0",
        href: scenarioAsset2("figures/page_05_figure_06_xref_141.png"),
        size: "1142x622",
        ocrExcerpt: "1\uBC88 \uB4DC\uB860 TAI #3, 2\uBC88 \uB4DC\uB860 NAI #4, 3\uBC88 \uB4DC\uB860 TAI #4"
      }
    ]
  },
  11: {
    scenarioId: 11,
    page: 6,
    pageHref: scenarioAsset2("pages/page_06.png"),
    pageLabel: "PDF page 06",
    summary: "CAS/\uC721\uD56D/\uD3EC\uBCD1 \uAC00\uC6A9\uC2DC\uAC04\uACFC \uCD5C\uC801 \uD0C0\uACA9\uBC29\uBC95 \uD310\uB2E8 \uD654\uBA74",
    catalogHref,
    figures: [
      {
        id: "page_06_figure_04_xref_148",
        label: "\uAC00\uC6A9\uC790\uC0B0 \uD310\uB2E8",
        href: scenarioAsset2("figures/page_06_figure_04_xref_148.png"),
        size: "1928x323",
        ocrExcerpt: "\uAC00\uC6A9\uC790\uC0B0 \uD310\uB2E8, 10:30~11:30, 14:00~15:00, 24\uC2DC\uAC04"
      },
      {
        id: "page_06_figure_05_xref_149",
        label: "\uD0C0\uACA9\uBC29\uBC95 \uCD94\uCC9C",
        href: scenarioAsset2("figures/page_06_figure_05_xref_149.png"),
        size: "1928x322",
        ocrExcerpt: "CAS+\uD3EC\uBCD1, TAI #5, DP #3"
      }
    ]
  },
  12: {
    scenarioId: 12,
    page: 6,
    pageHref: scenarioAsset2("pages/page_06.png"),
    pageLabel: "PDF page 06",
    summary: "\uD1B5\uD569\uD654\uB825\uC6B4\uC6A9\uB3C4\uD45C \uC791\uC131 WARNING\uACFC H-10~H+30 \uB3C4\uD45C \uCEA1\uCC98",
    catalogHref,
    figures: [
      {
        id: "page_06_figure_08_xref_152",
        label: "\uD1B5\uD569\uD654\uB825\uC6B4\uC6A9\uB3C4\uD45C",
        href: scenarioAsset2("figures/page_06_figure_08_xref_152.png"),
        size: "1928x313",
        ocrExcerpt: "\uD1B5\uD569\uD654\uB825\uC6B4\uC6A9\uB3C4\uD45C, 111/112/113 \uD3EC\uBCD1\uB300\uB300"
      },
      {
        id: "page_06_figure_09_xref_153",
        label: "\uC2DC\uAC04\uB300\uBCC4 \uC6B4\uC6A9\uB3C4\uD45C",
        href: scenarioAsset2("figures/page_06_figure_09_xref_153.png"),
        size: "1928x312",
        ocrExcerpt: "\uACF5\uACA9 H-10, H+10, H+20, H+30"
      }
    ]
  },
  13: {
    scenarioId: 13,
    page: 7,
    pageHref: scenarioAsset2("pages/page_07.png"),
    pageLabel: "PDF page 07",
    summary: "ARTAS \uB300\uD3EC\uBCD1\uD0D0\uC9C0 R/D \uD45C\uC801\uD0D0\uC9C0 \uBD84\uC11D\uACFC \uD5C8\uC0C1\uD45C\uC801 99% \uACB0\uB860",
    catalogHref,
    figures: [
      {
        id: "page_07_figure_01_xref_159",
        label: "ARTAS R/D \uD45C\uC801\uD0D0\uC9C0 \uD310\uB2E8",
        href: scenarioAsset2("figures/page_07_figure_01_xref_159.png"),
        size: "1236x648",
        ocrExcerpt: "ARTAS \uD5C8\uC0C1\uD45C\uC801 78% / \uC885\uD569 \uD5C8\uC0C1\uD45C\uC801 99%"
      }
    ]
  },
  14: {
    scenarioId: 14,
    page: 6,
    pageHref: scenarioAsset2("pages/page_06.png"),
    pageLabel: "PDF page 06",
    summary: "\uC571 \uD655\uC7A5 BDA \uB2E8\uACC4\uC6A9 \uD0C0\uACA9\uACB0\uACFC \uD3C9\uAC00 \uCEA1\uCC98\uC640 page 06 \uADFC\uAC70",
    catalogHref,
    figures: [
      {
        id: "page_06_figure_10_xref_154",
        label: "\uD0C0\uACA9\uACB0\uACFC \uD3C9\uAC00",
        href: scenarioAsset2("figures/page_06_figure_10_xref_154.png"),
        size: "1277x706",
        ocrExcerpt: "\uD0C0\uACA9\uACB0\uACFC \uD3C9\uAC00, \uD45C\uC801\uC88C\uD45C/\uB4DC\uB860\uC88C\uD45C\uC640 \uACB0\uACFC \uD654\uBA74"
      }
    ]
  }
};
function getSudoScenarioImageEvidence(scenarioId) {
  return imageEvidenceByScenario[scenarioId];
}
function buildSudoScenarioImageEvidenceSummary(evidence, figureLimit = 2) {
  if (!evidence) {
    return "\uC774\uBBF8\uC9C0 \uADFC\uAC70 \uC5C6\uC74C";
  }
  const figures = evidence.figures.slice(0, figureLimit).map((figure2) => figure2.label).join(" / ");
  const hidden = evidence.figures.length - Math.min(evidence.figures.length, figureLimit);
  return [
    formatSudoSourceDisplayLabel(evidence.pageLabel),
    evidence.summary,
    figures ? `figure ${figures}${hidden > 0 ? ` +${hidden}` : ""}` : ""
  ].filter(Boolean).join(" \xB7 ");
}

// js/vendor/kairos/src/gui/sudo/sudoMedia.ts
var SUDO_JANGDO_MOBILITY_VIDEO_SRC = resolvePublicAssetPath(
  "/sudo_data/1-1 \uC7A5\uB3C4\uD6C8\uB828\uC7A5 \uAE30\uB3D9(\uC5F0\uACB0\uD504\uB85C\uADF8\uB7A8 \uC0AC\uC9C4\uC73C\uB85C \uC7AC\uC0DD)/1-1 \uC7A5\uB3C4\uD6C8\uB828\uC7A5 \uAE30\uB3D9(1).mp4"
);
var SUDO_JANGDO_MOBILITY_2_VIDEO_SRC = resolvePublicAssetPath(
  "/sudo_data/converted/1-1-jangdo-mobility-2.mp4"
);
var SUDO_JANGDO_MOBILITY_3_VIDEO_SRC = resolvePublicAssetPath(
  "/sudo_data/converted/1-1-jangdo-mobility-3.mp4"
);
var SUDO_CORPS_TOD_SURVEILLANCE_VIDEO_SRC = resolvePublicAssetPath(
  "/vid/260616/TOD/[TOD] \uC804\uCC28.mp4"
);
var SUDO_BATTALION_TOD_SURVEILLANCE_VIDEO_SRC = resolvePublicAssetPath("/vid/260616/TOD/[TOD]\uCC9C\uBB34.mp4");
var SUDO_TOD_SURVEILLANCE_VIDEO_SRC = SUDO_BATTALION_TOD_SURVEILLANCE_VIDEO_SRC;
var SUDO_CORPS_SWID_DRONE_VIEW_VIDEO_SRC = resolvePublicAssetPath(
  "/vid/260616/SWID/[SWID] \uC804\uCC28.mp4"
);
var SUDO_BATTALION_SWID_DRONE_VIEW_VIDEO_SRC = resolvePublicAssetPath(
  "/vid/260616/SWID/[SWID]\uCC9C\uBB341.mp4"
);
var SUDO_SWID_DRONE_VIEW_VIDEO_SRC = SUDO_BATTALION_SWID_DRONE_VIEW_VIDEO_SRC;
var SUDO_CHUNMOO_INTRO_VIDEO_SRC = resolvePublicAssetPath(
  "/sudo_data/converted/2-1-chunmoo-intro.mp4"
);
var SUDO_CHUNMOO_FIRE_1_VIDEO_SRC = resolvePublicAssetPath(
  "/sudo_data/converted/2-2-chunmoo-fire-1.mp4"
);
var SUDO_CHUNMOO_FIRE_2_VIDEO_SRC = resolvePublicAssetPath(
  "/sudo_data/converted/2-3-chunmoo-fire-2.mp4"
);
var SUDO_OBJECT_RECOGNITION_VIDEO_SRC = resolvePublicAssetPath(
  "/sudo_data/converted/2-5-object-recognition.mp4"
);
var SUDO_CORPS_TARGET_NATURE_FRAME_IMAGE_SRC = resolvePublicAssetPath(
  "/sudo/mock-frames/sudo-corps-t72-frame-clean.jpg"
);
var SUDO_BATTALION_TARGET_NATURE_FRAME_IMAGE_SRC = resolvePublicAssetPath(
  "/sudo/mock-frames/sudo-battalion-240mm-bbox-frame.jpg"
);
var SUDO_TARGET_NATURE_FRAME_IMAGE_SRC = SUDO_BATTALION_TARGET_NATURE_FRAME_IMAGE_SRC;
var SUDO_CORPS_SCALE_FRAME_IMAGE_SRC = resolvePublicAssetPath(
  "/sudo/mock-frames/sudo-corps-t72-scale-frame-clean.jpg"
);
var SUDO_CHUNMOO_INTRO_FRAME_IMAGE_SRC = resolvePublicAssetPath(
  "/sudo_data/_extracted/assets/2-1 \uCC9C\uBB34 \uC18C\uAC1C\uC601\uC0C1/video_frames/frame_00_53.png"
);
var SUDO_CHUNMOO_FIRE_FRAME_IMAGE_SRC = resolvePublicAssetPath(
  "/sudo_data/_extracted/assets/2-2 \uCC9C\uBB34 \uC0AC\uACA9\uC601\uC0C11/video_frames/frame_00_30.png"
);
var SUDO_CHUNMOO_SPEC_SLIDE_IMAGE_SRC = resolvePublicAssetPath(
  "/sudo_data/_extracted/slides/2-7 \uCC9C\uBB34 \uAD50\uC721\uC790\uB8CC/\uC2AC\uB77C\uC774\uB4DC5.PNG"
);
var SUDO_CHUNMOO_STRUCTURE_SLIDE_IMAGE_SRC = resolvePublicAssetPath(
  "/sudo_data/_extracted/slides/2-7 \uCC9C\uBB34 \uAD50\uC721\uC790\uB8CC/\uC2AC\uB77C\uC774\uB4DC6.PNG"
);
var SUDO_TANK_VIDEO_SRC = SUDO_OBJECT_RECOGNITION_VIDEO_SRC;
var SUDO_MULTI_VEHICLES_VIDEO_SRC = SUDO_JANGDO_MOBILITY_2_VIDEO_SRC;
var SUDO_MULTI_VEHICLES_VIDEO_INGEST_SRC = SUDO_MULTI_VEHICLES_VIDEO_SRC.replace(/%20/g, " ");
var SUDO_DRONE_VIDEO_SRC = SUDO_SWID_DRONE_VIEW_VIDEO_SRC;
var SUDO_ROCKET_LAUNCHER_IMAGE_SRC = resolvePublicAssetPath(
  "/sudo/rocket-launcher-aerial.png"
);
var SUDO_TANK_CONVOY_IMAGE_SRC = resolvePublicAssetPath(
  "/sudo/tank-convoy-aerial.png"
);
var SUDO_OPERATION_AREA_IMAGE_SRC = resolvePublicAssetPath(
  "/sudo/operation-area-aerial.jpg"
);
var SUDO_SITUATION_ANALYSIS_BASE_MAP_IMAGE_SRC = resolvePublicAssetPath(
  "/sudo_data/_extracted/assets/9-1 \uC0AC\uD0DC\uBD84\uC11D\uB3C4 \uBC0F \uB3C4\uB85C\uC815\uBCF4/ppt_media/image1.png"
);
var SUDO_SCALE_FORMATION_REFERENCE_IMAGE_SRC = resolvePublicAssetPath(
  "/sudo_data/_extracted/slides/3-1 \uBD80\uB300\uBCC4 \uD589\uAD70\uC7A5\uACBD data/\uC2AC\uB77C\uC774\uB4DC1.PNG"
);
var SUDO_SCALE_DRONE_FRAME_IMAGE_SRC = resolvePublicAssetPath(
  "/sudo_data/_extracted/assets/1-1 \uC7A5\uB3C4\uD6C8\uB828\uC7A5 \uAE30\uB3D9(1)/video_frames/frame_02_37.png"
);
var SUDO_BATTALION_SCALE_FRAME_IMAGE_SRC = SUDO_SCALE_DRONE_FRAME_IMAGE_SRC;
var SUDO_BDA_FIGURE_IMAGE_SRC = resolvePublicAssetPath(
  "/sudo_data/_extracted/scenario_6_1/figures/page_06_figure_10_xref_154.png"
);
var SUDO_ORDER_REFERENCE_IMAGE_SRC = resolvePublicAssetPath(
  "/sudo_data/_extracted/slides/4-1 \uD6C8\uB828\uC7A5 \uC778\uADFC\uBD80\uB300 \uC704\uCE58\uFF0C \uBCF4\uC720 \uC7A5\uBE44 \uB4F1/\uC2AC\uB77C\uC774\uB4DC1.PNG"
);
var SUDO_COLLATERAL_REFERENCE_IMAGE_SRC = resolvePublicAssetPath(
  "/sudo_data/_extracted/slides/5-1 \uD0C4\uC885\uBCC4 \uBD80\uC218\uC801 \uD6A8\uACFC\uBC18\uACBD/\uC2AC\uB77C\uC774\uB4DC1.PNG"
);
var SUDO_ARTILLERY_BATTERY_IMAGE_SRC = resolvePublicAssetPath(
  "/sudo/artillery-battery-aerial.png"
);
var SUDO_COMMAND_CENTER_IMAGE_SRC = resolvePublicAssetPath(
  "/sudo/command-center.png"
);
var SUDO_AIC_LOGO_SRC = resolvePublicAssetPath("/AIC.png");
var SUDO_CHUNGUI_AI_LOGO_SRC = resolvePublicAssetPath("/sudo_logo.png");
var SUDO_ALERT_SIGNAL_IMAGE_SRC = resolvePublicAssetPath(
  "/sudo/sudo-alert-signal-v1.png"
);
var FRAME_CAPTURE_TIMEOUT_MS = 9e3;
var DEFAULT_FRAME_COUNT = 4;
var MAX_FRAME_WIDTH = 960;
var MAX_IMAGE_WIDTH = 960;
var DEFAULT_SUDO_DRONE_VIDEO_GRAPHICS_QUALITY = "veryHigh";
var DEFAULT_SUDO_DRONE_VIDEO_ANTIALIASING = true;
var EMPTY_SUDO_DRONE_VIDEO_SOURCE = {
  playbackSrc: "",
  ingestSrc: "",
  transport: "http",
  label: "\uC601\uC0C1 \uBBF8\uC785\uB825"
};
var SUDO_SCENARIO_LEVEL_MEDIA = {
  corps: {
    scenarioLevel: "corps",
    targetDetectionLabel: "T-72 \uC804\uCC28",
    targetClassificationLabel: "T-72 \uC804\uCC28",
    targetConfidenceLabel: "94.6%",
    targetFrameImageSrc: SUDO_CORPS_TARGET_NATURE_FRAME_IMAGE_SRC,
    scaleFrameImageSrc: SUDO_CORPS_SCALE_FRAME_IMAGE_SRC,
    scaleFrameSourceLabel: "SWID \uC804\uCC28 \uC2E4\uC81C \uC601\uC0C1",
    droneVideoSrc: SUDO_CORPS_SWID_DRONE_VIEW_VIDEO_SRC,
    droneVideoLabel: "SWID \uC804\uCC28 \uC2E4\uC81C \uC601\uC0C1",
    droneVideoDescription: "260616 SWID \uC804\uCC28 \uB4DC\uB860 \uC2DC\uC810 \uC601\uC0C1",
    todVideoSrc: SUDO_CORPS_TOD_SURVEILLANCE_VIDEO_SRC,
    todVideoLabel: "TOD \uC804\uCC28 \uC2E4\uC81C \uC601\uC0C1",
    droneDetectionStartSeconds: 57,
    droneDetectionStartRatio: 0.614,
    todDetectionStartSeconds: 18.5,
    todDetectionStartRatio: 0.103
  },
  battalion: {
    scenarioLevel: "battalion",
    targetDetectionLabel: "240mm \uBC29\uC0AC\uD3EC",
    targetClassificationLabel: "240mm \uBC29\uC0AC\uD3EC(M-1991)",
    targetConfidenceLabel: "99.8%",
    targetFrameImageSrc: SUDO_BATTALION_TARGET_NATURE_FRAME_IMAGE_SRC,
    scaleFrameImageSrc: SUDO_BATTALION_SCALE_FRAME_IMAGE_SRC,
    scaleFrameSourceLabel: "1-1 \uC7A5\uB3C4\uD6C8\uB828\uC7A5 \uAE30\uB3D9(1)",
    droneVideoSrc: SUDO_BATTALION_SWID_DRONE_VIEW_VIDEO_SRC,
    droneVideoLabel: "SWID \uCC9C\uBB341 \uC2E4\uC81C \uC601\uC0C1",
    droneVideoDescription: "260616 SWID \uCC9C\uBB341 \uB4DC\uB860 \uC2DC\uC810 \uC601\uC0C1",
    todVideoSrc: SUDO_BATTALION_TOD_SURVEILLANCE_VIDEO_SRC,
    todVideoLabel: "TOD \uCC9C\uBB34 \uC2E4\uC81C \uC601\uC0C1",
    droneDetectionStartSeconds: 44.1,
    droneDetectionStartRatio: 0.305,
    todDetectionStartSeconds: 126.5,
    todDetectionStartRatio: 0.26
  }
};
function getSudoScenarioLevelMedia(scenarioLevel = "corps") {
  return SUDO_SCENARIO_LEVEL_MEDIA[scenarioLevel];
}
var SUDO_DRONE_VIDEO_PRESETS = [
  {
    id: "actual-swid-chunmoo-1",
    label: "SWID \uCC9C\uBB341",
    description: "260616 SWID \uCC9C\uBB341 MP4",
    settings: {
      playbackUrl: SUDO_SWID_DRONE_VIEW_VIDEO_SRC,
      rtspUrl: ""
    }
  },
  {
    id: "actual-jangdo-mobility-2",
    label: "1-1 \uC7A5\uB3C4\uD6C8\uB828\uC7A5 \uAE30\uB3D9(2)",
    description: "sudo_data WMV \uBCC0\uD658 MP4",
    settings: {
      playbackUrl: SUDO_JANGDO_MOBILITY_2_VIDEO_SRC,
      rtspUrl: ""
    }
  },
  {
    id: "actual-jangdo-mobility-3",
    label: "1-1 \uC7A5\uB3C4\uD6C8\uB828\uC7A5 \uAE30\uB3D9(3)",
    description: "sudo_data WMV \uBCC0\uD658 MP4",
    settings: {
      playbackUrl: SUDO_JANGDO_MOBILITY_3_VIDEO_SRC,
      rtspUrl: ""
    }
  },
  {
    id: "actual-object-recognition",
    label: "2-5 \uAC1D\uCCB4\uC778\uC2DD",
    description: "\uD45C\uC801\uC131\uC9C8 \uBD84\uC11D\uC6A9 \uC2E4\uC81C \uAC1D\uCCB4\uC778\uC2DD MP4",
    settings: {
      playbackUrl: SUDO_OBJECT_RECOGNITION_VIDEO_SRC,
      rtspUrl: ""
    }
  },
  {
    id: "actual-chunmoo-intro",
    label: "2-1 \uCC9C\uBB34 \uC18C\uAC1C",
    description: "\uCC9C\uBB34 \uC7A5\uBE44 \uCC38\uACE0 \uC2E4\uC81C \uBCC0\uD658 MP4",
    settings: {
      playbackUrl: SUDO_CHUNMOO_INTRO_VIDEO_SRC,
      rtspUrl: ""
    }
  },
  {
    id: "actual-chunmoo-fire-1",
    label: "2-2 \uCC9C\uBB34 \uC0AC\uACA9(1)",
    description: "\uCC9C\uBB34 \uC0AC\uACA9 \uCC38\uACE0 \uC2E4\uC81C \uBCC0\uD658 MP4",
    settings: {
      playbackUrl: SUDO_CHUNMOO_FIRE_1_VIDEO_SRC,
      rtspUrl: ""
    }
  },
  {
    id: "actual-chunmoo-fire-2",
    label: "2-3 \uCC9C\uBB34 \uC0AC\uACA9(2)",
    description: "\uCC9C\uBB34 \uC0AC\uACA9 \uCC38\uACE0 \uC2E4\uC81C \uBCC0\uD658 MP4",
    settings: {
      playbackUrl: SUDO_CHUNMOO_FIRE_2_VIDEO_SRC,
      rtspUrl: ""
    }
  }
];
function getSudoTargetDroneVideoPresets(scenarioLevel = "corps") {
  const levelMedia = getSudoScenarioLevelMedia(scenarioLevel);
  return [
    {
      id: `drone-1-swid-${scenarioLevel}`,
      label: "\uB4DC\uB8601",
      description: levelMedia.droneVideoDescription,
      settings: {
        playbackUrl: levelMedia.droneVideoSrc,
        rtspUrl: ""
      }
    },
    {
      id: "drone-2-jangdo",
      label: "\uB4DC\uB8602",
      description: "\uC7A5\uB3C4\uD6C8\uB828\uC7A5 \uAE30\uB3D9(3) \uB4DC\uB860 EO \uC601\uC0C1",
      settings: {
        playbackUrl: SUDO_JANGDO_MOBILITY_3_VIDEO_SRC,
        rtspUrl: ""
      }
    }
  ];
}
var SUDO_TARGET_DRONE_VIDEO_PRESETS = getSudoTargetDroneVideoPresets("corps");
function normalizeVideoPresetPath(value) {
  try {
    const parsed = new URL(
      value,
      typeof window === "undefined" ? "http://localhost" : window.location.href
    );
    return decodeURIComponent(parsed.pathname).replace(/\\/g, "/").toLowerCase();
  } catch {
    try {
      return decodeURIComponent(value).replace(/\\/g, "/").toLowerCase();
    } catch {
      return value.replace(/\\/g, "/").toLowerCase();
    }
  }
}
function getSudoTargetDroneVideoPresetId(source, scenarioLevel) {
  const playbackSrc = "playbackSrc" in source ? source.playbackSrc : source.playbackUrl;
  if (isRetiredBattalionSwidDroneVideoUrl(playbackSrc) || isGeneratedPreprocessedDetectionVideoUrl(playbackSrc)) {
    return !scenarioLevel || scenarioLevel === "battalion" ? "drone-1-swid-battalion" : void 0;
  }
  const normalizedSource = normalizeVideoPresetPath(playbackSrc);
  const presets = scenarioLevel ? getSudoTargetDroneVideoPresets(scenarioLevel) : [
    ...getSudoTargetDroneVideoPresets("corps"),
    ...getSudoTargetDroneVideoPresets("battalion")
  ];
  return presets.find((preset) => {
    const presetPath = normalizeVideoPresetPath(preset.settings.playbackUrl);
    return normalizedSource === presetPath || normalizedSource.endsWith(presetPath);
  })?.id;
}
var SUDO_DRONE_PLAYBACK_URL_KEY = "sudo.drone.playback-url.v1";
var SUDO_DRONE_RTSP_URL_KEY = "sudo.drone.rtsp-url.v1";
var SUDO_DRONE_GRAPHICS_QUALITY_KEY = "sudo.drone.graphics-quality.v1";
var SUDO_DRONE_ANTIALIASING_KEY = "sudo.drone.antialiasing.v1";
var SUDO_LEGACY_MOCK_DRONE_VIDEO_SRC = "/vid/drone_view.mp4";
var SUDO_LEGACY_DEFAULT_DRONE_VIDEO_SRCS = [SUDO_JANGDO_MOBILITY_VIDEO_SRC];
var SUDO_RETIRED_BATTALION_SWID_DRONE_VIDEO_SRCS = [
  "/vid/260616/SWID/[SWID]\uCC9C\uBB34 \uC804\uCC28 \uD1B5\uD569\uC774\uB3D9mp4.mp4"
];
function isLegacyMockDroneVideoUrl(url) {
  return normalizeVideoPresetPath(url) === normalizeVideoPresetPath(SUDO_LEGACY_MOCK_DRONE_VIDEO_SRC);
}
function isLegacyDefaultDroneVideoUrl(url) {
  const normalizedUrl = normalizeVideoPresetPath(url);
  return SUDO_LEGACY_DEFAULT_DRONE_VIDEO_SRCS.some(
    (legacySrc) => normalizedUrl === normalizeVideoPresetPath(legacySrc)
  );
}
function isRetiredBattalionSwidDroneVideoUrl(url) {
  const normalizedUrl = normalizeVideoPresetPath(url);
  return SUDO_RETIRED_BATTALION_SWID_DRONE_VIDEO_SRCS.some(
    (legacySrc) => normalizedUrl === normalizeVideoPresetPath(legacySrc)
  );
}
function isGeneratedPreprocessedDetectionVideoUrl(url) {
  return normalizeVideoPresetPath(url) === "/vid/260616/swid/swid-integrated-yolo-preprocessed.mp4";
}
function normalizeOptionalEnvUrl(value) {
  const url = String(value ?? "").trim();
  if (isLegacyMockDroneVideoUrl(url)) {
    return void 0;
  }
  if (isLegacyDefaultDroneVideoUrl(url)) {
    return SUDO_DRONE_VIDEO_SRC;
  }
  if (isRetiredBattalionSwidDroneVideoUrl(url)) {
    return SUDO_BATTALION_SWID_DRONE_VIEW_VIDEO_SRC;
  }
  if (isGeneratedPreprocessedDetectionVideoUrl(url)) {
    return SUDO_DRONE_VIDEO_SRC;
  }
  return url.length > 0 ? url : void 0;
}
function normalizeBooleanValue(value, fallback) {
  if (typeof value === "boolean") {
    return value;
  }
  const normalized = String(value ?? "").trim().toLowerCase();
  if (!normalized.length) {
    return fallback;
  }
  if (["1", "true", "yes", "y", "on", "enable", "enabled"].includes(normalized)) {
    return true;
  }
  if (["0", "false", "no", "n", "off", "disable", "disabled"].includes(normalized)) {
    return false;
  }
  return fallback;
}
function normalizeSudoDroneVideoGraphicsQuality(value) {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (normalized === "low") {
    return "low";
  }
  if (normalized === "medium" || normalized === "normal") {
    return "medium";
  }
  if (normalized === "high") {
    return "high";
  }
  if (normalized === "veryhigh" || normalized === "very-high" || normalized === "very_high" || normalized === "ultra") {
    return "veryHigh";
  }
  return DEFAULT_SUDO_DRONE_VIDEO_GRAPHICS_QUALITY;
}
function getSudoDroneFeedGraphicsSettings(settings = {}) {
  const playbackUrl = typeof settings.playbackUrl === "string" ? settings.playbackUrl.trim() : "";
  const rtspUrl = typeof settings.rtspUrl === "string" ? settings.rtspUrl.trim() : "";
  return {
    playbackUrl,
    rtspUrl,
    graphicsQuality: normalizeSudoDroneVideoGraphicsQuality(
      settings.graphicsQuality ?? DEFAULT_SUDO_DRONE_VIDEO_GRAPHICS_QUALITY
    ),
    antialiasing: normalizeBooleanValue(
      settings.antialiasing ?? DEFAULT_SUDO_DRONE_VIDEO_ANTIALIASING,
      DEFAULT_SUDO_DRONE_VIDEO_ANTIALIASING
    )
  };
}
function getSudoDroneFeedQualityForFlightSim(settings = {}) {
  const normalized = getSudoDroneFeedGraphicsSettings(settings);
  return {
    graphicsQuality: normalized.graphicsQuality === "veryHigh" ? "high" : normalized.graphicsQuality,
    antialiasing: normalized.antialiasing
  };
}
function readRuntimeEnvValue(key, env) {
  const runtimeEnv = globalThis.process?.env;
  return env[key] ?? runtimeEnv?.[key];
}
function buildSudoDroneVideoPresets(env = globalThis.__KAIROS_ENV__) {
  const playbackUrl = normalizeOptionalEnvUrl(
    readRuntimeEnvValue("VITE_SUDO_DRONE_VIDEO_URL", env)
  );
  const rtspUrl = normalizeOptionalEnvUrl(
    readRuntimeEnvValue("VITE_SUDO_RTSP_URL", env)
  );
  if (!playbackUrl && !rtspUrl) {
    return SUDO_DRONE_VIDEO_PRESETS;
  }
  const fieldPreset = {
    id: "field-configured",
    label: "\uD604\uC7A5 \uC124\uC815",
    description: playbackUrl && rtspUrl ? "env RTSP ingest + playback URL" : rtspUrl ? "env RTSP ingest" : "env playback URL",
    settings: {
      playbackUrl: playbackUrl ?? "",
      rtspUrl: rtspUrl ?? ""
    }
  };
  return [fieldPreset, ...SUDO_DRONE_VIDEO_PRESETS];
}
function readStorageValue(key) {
  if (typeof window === "undefined") {
    return "";
  }
  const value = window.localStorage.getItem(key)?.trim() ?? "";
  if (key === SUDO_DRONE_PLAYBACK_URL_KEY && isLegacyMockDroneVideoUrl(value)) {
    window.localStorage.removeItem(key);
    return "";
  }
  if (key === SUDO_DRONE_PLAYBACK_URL_KEY && isLegacyDefaultDroneVideoUrl(value)) {
    window.localStorage.setItem(key, SUDO_DRONE_VIDEO_SRC);
    return SUDO_DRONE_VIDEO_SRC;
  }
  if (key === SUDO_DRONE_PLAYBACK_URL_KEY && isRetiredBattalionSwidDroneVideoUrl(value)) {
    window.localStorage.setItem(key, SUDO_BATTALION_SWID_DRONE_VIEW_VIDEO_SRC);
    return SUDO_BATTALION_SWID_DRONE_VIEW_VIDEO_SRC;
  }
  if (key === SUDO_DRONE_PLAYBACK_URL_KEY && isGeneratedPreprocessedDetectionVideoUrl(value)) {
    window.localStorage.setItem(key, SUDO_DRONE_VIDEO_SRC);
    return SUDO_DRONE_VIDEO_SRC;
  }
  return value;
}
function writeStorageValue(key, value) {
  if (typeof window === "undefined") {
    return;
  }
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    window.localStorage.removeItem(key);
    return;
  }
  window.localStorage.setItem(key, trimmed);
}
function readSudoDroneVideoSettings() {
  return getSudoDroneFeedGraphicsSettings({
    playbackUrl: readStorageValue(SUDO_DRONE_PLAYBACK_URL_KEY),
    rtspUrl: readStorageValue(SUDO_DRONE_RTSP_URL_KEY),
    graphicsQuality: readStorageValue(SUDO_DRONE_GRAPHICS_QUALITY_KEY),
    antialiasing: readStorageValue(SUDO_DRONE_ANTIALIASING_KEY)
  });
}
function writeSudoDroneVideoSettings(settings) {
  const normalized = getSudoDroneFeedGraphicsSettings(settings);
  writeStorageValue(SUDO_DRONE_PLAYBACK_URL_KEY, normalized.playbackUrl);
  writeStorageValue(SUDO_DRONE_RTSP_URL_KEY, normalized.rtspUrl);
  writeStorageValue(
    SUDO_DRONE_GRAPHICS_QUALITY_KEY,
    normalized.graphicsQuality
  );
  writeStorageValue(
    SUDO_DRONE_ANTIALIASING_KEY,
    normalized.antialiasing ? "1" : "0"
  );
}
function clearSudoDroneVideoSettings() {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.removeItem(SUDO_DRONE_PLAYBACK_URL_KEY);
  window.localStorage.removeItem(SUDO_DRONE_RTSP_URL_KEY);
  window.localStorage.removeItem(SUDO_DRONE_GRAPHICS_QUALITY_KEY);
  window.localStorage.removeItem(SUDO_DRONE_ANTIALIASING_KEY);
}
function redactSudoMediaUrl(value) {
  const source = value.trim();
  if (!source) {
    return "";
  }
  try {
    const parsed = new URL(
      source,
      typeof window === "undefined" ? "http://localhost" : window.location.href
    );
    if (parsed.username) {
      parsed.username = "***";
    }
    if (parsed.password) {
      parsed.password = "***";
    }
    if (/^[a-z][a-z0-9+.-]*:\/\//i.test(source)) {
      return parsed.toString();
    }
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return source;
  }
}
function redactSudoMediaDiagnostic(diagnostic, url) {
  const source = String(url ?? "").trim();
  if (!source) {
    return diagnostic;
  }
  return diagnostic.split(source).join(redactSudoMediaUrl(source));
}
function getPlaybackPath(value) {
  try {
    const parsed = new URL(
      value,
      typeof window === "undefined" ? "http://localhost" : window.location.href
    );
    return `${parsed.protocol}//${parsed.host}${parsed.pathname}`.toLowerCase();
  } catch {
    return value.toLowerCase();
  }
}
function getVideoCanPlayType() {
  if (typeof document === "undefined") {
    return () => "";
  }
  const video = document.createElement("video");
  return (mimeType) => video.canPlayType(mimeType);
}
function supportsAnyMimeType(mimeTypes, canPlayType = getVideoCanPlayType()) {
  return mimeTypes.some((mimeType) => Boolean(canPlayType(mimeType)));
}
function inspectSudoPlaybackSource(source, options = {}) {
  const playbackSrc = String(source.playbackSrc ?? "").trim();
  if (!playbackSrc) {
    return {
      kind: "unknown",
      playable: false,
      attention: true,
      diagnostic: "\uBE0C\uB77C\uC6B0\uC800 playback URL\uC774 \uBE44\uC5B4 \uC788\uC2B5\uB2C8\uB2E4. RTSP ingest\uB294 detector\uC5D0\uC11C \uCC98\uB9AC\uD558\uB354\uB77C\uB3C4 \uD654\uBA74/\uD504\uB808\uC784 \uCEA1\uCC98\uC6A9 URL\uC774 \uD544\uC694\uD569\uB2C8\uB2E4."
    };
  }
  const normalizedPath = getPlaybackPath(playbackSrc);
  if (normalizedPath.startsWith("rtsp://")) {
    return {
      kind: "rtsp",
      playable: false,
      attention: true,
      diagnostic: "RTSP\uB294 \uBE0C\uB77C\uC6B0\uC800 video \uD0DC\uADF8\uAC00 \uC9C1\uC811 \uC7AC\uC0DD\uD560 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4. HLS, WebRTC, MJPEG, \uB610\uB294 MP4 proxy playback URL\uC744 \uD568\uAED8 \uC124\uC815\uD558\uC138\uC694."
    };
  }
  if (/\.m3u8(?:$|[?#])/.test(normalizedPath)) {
    const playable = supportsAnyMimeType(
      [
        "application/vnd.apple.mpegurl",
        "application/x-mpegURL",
        "application/mpegurl"
      ],
      options.canPlayType
    );
    return {
      kind: "hls",
      playable,
      attention: !playable,
      diagnostic: playable ? "HLS playback URL\uC740 \uD604\uC7AC \uBE0C\uB77C\uC6B0\uC800\uC5D0\uC11C \uC7AC\uC0DD \uAC00\uB2A5 \uD615\uC2DD\uC73C\uB85C \uBCF4\uC785\uB2C8\uB2E4." : "\uD604\uC7AC \uBE0C\uB77C\uC6B0\uC800\uB294 HLS(.m3u8)\uB97C \uB124\uC774\uD2F0\uBE0C\uB85C \uC7AC\uC0DD\uD558\uC9C0 \uBABB\uD560 \uC218 \uC788\uC2B5\uB2C8\uB2E4. hls.js/MSE proxy, WebRTC, \uB610\uB294 MP4 preview\uB97C \uC900\uBE44\uD558\uC138\uC694."
    };
  }
  if (/\.mp4(?:$|[?#])/.test(normalizedPath)) {
    return {
      kind: "mp4",
      playable: true,
      attention: false,
      diagnostic: "MP4 playback URL\uC740 \uBE0C\uB77C\uC6B0\uC800 \uD504\uB808\uC784 \uCEA1\uCC98 \uC785\uB825\uC73C\uB85C \uC0AC\uC6A9\uD560 \uC218 \uC788\uC2B5\uB2C8\uB2E4."
    };
  }
  if (/\.webm(?:$|[?#])/.test(normalizedPath)) {
    return {
      kind: "webm",
      playable: true,
      attention: false,
      diagnostic: "WebM playback URL\uC740 \uBE0C\uB77C\uC6B0\uC800 \uD504\uB808\uC784 \uCEA1\uCC98 \uC785\uB825\uC73C\uB85C \uC0AC\uC6A9\uD560 \uC218 \uC788\uC2B5\uB2C8\uB2E4."
    };
  }
  if (/\.og[gv](?:$|[?#])/.test(normalizedPath)) {
    return {
      kind: "ogg",
      playable: true,
      attention: false,
      diagnostic: "Ogg playback URL\uC740 \uBE0C\uB77C\uC6B0\uC800 \uD504\uB808\uC784 \uCEA1\uCC98 \uC785\uB825\uC73C\uB85C \uC0AC\uC6A9\uD560 \uC218 \uC788\uC2B5\uB2C8\uB2E4."
    };
  }
  if (/webrtc|whep|whip/i.test(playbackSrc)) {
    return {
      kind: "webrtc",
      playable: false,
      attention: true,
      diagnostic: "WebRTC/WHEP \uC8FC\uC18C\uB294 video src\uB85C \uBC14\uB85C \uCEA1\uCC98\uB418\uC9C0 \uC54A\uC744 \uC218 \uC788\uC2B5\uB2C8\uB2E4. \uD654\uBA74 \uC7AC\uC0DD\uC6A9 \uCEF4\uD3EC\uB10C\uD2B8\uC640 VLM \uD504\uB808\uC784 \uCEA1\uCC98\uC6A9 snapshot/MP4/HLS \uACBD\uB85C\uB97C \uBD84\uB9AC\uD558\uC138\uC694."
    };
  }
  return {
    kind: "unknown",
    playable: source.transport === "mock-file",
    attention: source.transport !== "mock-file",
    diagnostic: source.transport === "mock-file" ? "\uB85C\uCEEC \uC601\uC0C1 \uD30C\uC77C \uACBD\uB85C\uB97C \uC0AC\uC6A9\uD569\uB2C8\uB2E4." : "playback URL \uD655\uC7A5\uC790\uB97C \uD655\uC778\uD560 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4. \uBE0C\uB77C\uC6B0\uC800 \uC7AC\uC0DD \uAC00\uB2A5 HLS/MP4/WebM/OGG \uB610\uB294 \uBCC4\uB3C4 snapshot \uACBD\uB85C\uC778\uC9C0 \uD655\uC778\uD558\uC138\uC694."
  };
}
function getSudoDroneVideoSource(settings = readSudoDroneVideoSettings()) {
  const configuredSource = getConfiguredSudoDroneVideoSource(settings);
  if (configuredSource) {
    return configuredSource;
  }
  return {
    playbackSrc: SUDO_DRONE_VIDEO_SRC,
    ingestSrc: SUDO_DRONE_VIDEO_SRC,
    transport: "http",
    label: "SWID \uCC9C\uBB341 \uC601\uC0C1"
  };
}
function buildConfiguredSudoDroneVideoSource(playbackSrc, rtspSrc) {
  if (rtspSrc) {
    return {
      playbackSrc: playbackSrc ?? "",
      ingestSrc: rtspSrc,
      transport: "rtsp",
      label: "RTSP ingest"
    };
  }
  if (playbackSrc) {
    return {
      playbackSrc,
      ingestSrc: playbackSrc,
      transport: "http",
      label: "Live video"
    };
  }
  return void 0;
}
function getExplicitSudoDroneVideoSource(settings = readSudoDroneVideoSettings()) {
  return buildConfiguredSudoDroneVideoSource(
    normalizeOptionalEnvUrl(settings.playbackUrl),
    normalizeOptionalEnvUrl(settings.rtspUrl)
  );
}
function getConfiguredSudoDroneVideoSource(settings = readSudoDroneVideoSettings()) {
  return getExplicitSudoDroneVideoSource(settings) ?? buildConfiguredSudoDroneVideoSource(
    normalizeOptionalEnvUrl(
      readRuntimeEnvValue("VITE_SUDO_DRONE_VIDEO_URL", globalThis.__KAIROS_ENV__)
    ),
    normalizeOptionalEnvUrl(
      readRuntimeEnvValue("VITE_SUDO_RTSP_URL", globalThis.__KAIROS_ENV__)
    )
  );
}
function waitForMediaEvent(target, eventName, timeoutMs = FRAME_CAPTURE_TIMEOUT_MS) {
  return new Promise((resolve, reject) => {
    const timeoutId = window.setTimeout(() => {
      cleanup();
      reject(new Error(`Timed out waiting for ${eventName}`));
    }, timeoutMs);
    const cleanup = () => {
      window.clearTimeout(timeoutId);
      target.removeEventListener(eventName, handleEvent);
      target.removeEventListener("error", handleError);
    };
    const handleEvent = () => {
      cleanup();
      resolve();
    };
    const handleError = () => {
      cleanup();
      reject(new Error("Video frame source failed to load"));
    };
    target.addEventListener(eventName, handleEvent, { once: true });
    target.addEventListener("error", handleError, { once: true });
  });
}
function toBase64Payload(dataUrl) {
  return dataUrl.replace(/^data:image\/[a-zA-Z0-9.+-]+;base64,/, "");
}
function drawVideoFrame(video) {
  const sourceWidth = video.videoWidth || 1280;
  const sourceHeight = video.videoHeight || 720;
  const scale = Math.min(1, MAX_FRAME_WIDTH / sourceWidth);
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(sourceWidth * scale));
  canvas.height = Math.max(1, Math.round(sourceHeight * scale));
  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Canvas context unavailable");
  }
  context.drawImage(video, 0, 0, canvas.width, canvas.height);
  return toBase64Payload(canvas.toDataURL("image/jpeg", 0.82));
}
function loadBlobImage(blob) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const objectUrl = URL.createObjectURL(blob);
    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Image source failed to load"));
    };
    image.src = objectUrl;
  });
}
async function drawImageBlobAsBase64(blob) {
  const image = await loadBlobImage(blob);
  const scale = Math.min(1, MAX_IMAGE_WIDTH / image.naturalWidth);
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Canvas context unavailable");
  }
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  return toBase64Payload(canvas.toDataURL("image/jpeg", 0.82));
}
function resolveVideoFrameTimes(duration, frameCount) {
  const safeCount = Math.max(1, frameCount);
  if (!Number.isFinite(duration) || duration <= 0.5) {
    return Array.from({ length: safeCount }, (_, index) => index * 0.25);
  }
  const start = Math.min(0.35, duration * 0.08);
  const end = Math.max(start, duration - Math.min(0.35, duration * 0.08));
  if (safeCount === 1) {
    return [(start + end) / 2];
  }
  return Array.from({ length: safeCount }, (_, index) => {
    const ratio = index / (safeCount - 1);
    return start + (end - start) * ratio;
  });
}
async function captureVideoFramesAsBase64(source = SUDO_TANK_VIDEO_SRC, frameCount = DEFAULT_FRAME_COUNT) {
  if (typeof document === "undefined") {
    return [];
  }
  const video = document.createElement("video");
  video.muted = true;
  video.playsInline = true;
  video.preload = "auto";
  video.crossOrigin = "anonymous";
  video.src = new URL(source, window.location.href).toString();
  video.load();
  if (video.readyState < HTMLMediaElement.HAVE_METADATA) {
    await waitForMediaEvent(video, "loadedmetadata");
  }
  if (video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
    await waitForMediaEvent(video, "loadeddata");
  }
  const frames = [];
  const frameTimes = resolveVideoFrameTimes(video.duration, frameCount);
  for (const time of frameTimes) {
    video.currentTime = Math.min(Math.max(time, 0), video.duration || time);
    await waitForMediaEvent(video, "seeked");
    frames.push(drawVideoFrame(video));
  }
  video.removeAttribute("src");
  video.load();
  return frames;
}
async function loadImageAsBase64(source) {
  const response = await fetch(source);
  if (!response.ok) {
    throw new Error(`Unable to load image ${source}`);
  }
  const blob = await response.blob();
  return drawImageBlobAsBase64(blob);
}

// js/vendor/kairos/src/gui/sudo/sudoDroneTargetIntel.ts
var SUDO_DRONE_TARGET_SOURCE_NAME = "SWID \uCC9C\uBB341 / 1-2 \uC7A5\uB3C4\uD6C8\uB828\uC7A5 \uC0AC\uC9C4";
var SUDO_DRONE_TARGET_DESCRIPTION_SOURCE_NAME = "1-1\uC124\uBA85\uC790\uB8CC.hwp";
var SUDO_DRONE_TARGET_SOURCE_ROWS = [
  {
    id: "video-1-mobility",
    sourceFile: "[SWID]\uCC9C\uBB341.mp4",
    sourceKind: "video",
    cue: "\uCC9C\uBB341",
    evidence: "SWID \uB4DC\uB860 \uC2DC\uC810: \uCC9C\uBB341 \uB300\uB300\uAE09 \uC601\uC0C1",
    status: "\uC801\uC6A9",
    assetStatus: "\uC8FC\uC601\uC0C1",
    path: "client/public/vid/260616/SWID/[SWID]\uCC9C\uBB341.mp4",
    playbackPath: SUDO_DRONE_VIDEO_SRC
  },
  {
    id: "video-1-loading",
    sourceFile: "1-1 \uC7A5\uB3C4\uD6C8\uB828\uC7A5 \uAE30\uB3D9(1).mp4",
    sourceKind: "hwp",
    cue: "04:18",
    evidence: "1-1\uC124\uBA85\uC790\uB8CC: 4\uBD8418\uCD08 \uCC9C\uBB34 \uBC1C\uC0AC\uB300 \uC7A5\uC804 \uC601\uC0C1. \uD604\uC7AC \uCD94\uCD9C MP4 03:30\uBCF4\uB2E4 \uAE38\uC5B4 \uC6D0\uBB38 cue \uC7AC\uAC80\uC218 \uD544\uC694",
    status: "\uC7AC\uAC80\uC218",
    assetStatus: "\uC6D0\uBCF8 \uC804\uC6A9",
    path: "client/public/sudo_data/md/sources/1-1\uC124\uBA85\uC790\uB8CC.md"
  },
  {
    id: "video-2-loading",
    sourceFile: "1-1 \uC7A5\uB3C4\uD6C8\uB828\uC7A5 \uAE30\uB3D9(2).wmv",
    sourceKind: "video",
    cue: "00:02 / 00:43",
    evidence: "1-1\uC124\uBA85\uC790\uB8CC: 2\uCD08\uBD80\uD130 \uC7A5\uC804, 43\uCD08\uBD80\uD130 \uAE30\uB3D9\uC601\uC0C1",
    status: "\uC801\uC6A9",
    assetStatus: "\uBE0C\uB77C\uC6B0\uC800 \uC7AC\uC0DD",
    path: "client/public/sudo_data/md/sources/1-1 \uC7A5\uB3C4\uD6C8\uB828\uC7A5 \uAE30\uB3D9(2).md",
    playbackPath: "/sudo_data/converted/1-1-jangdo-mobility-2.mp4"
  },
  {
    id: "video-3-mobility",
    sourceFile: "1-1 \uC7A5\uB3C4\uD6C8\uB828\uC7A5 \uAE30\uB3D9(3).wmv",
    sourceKind: "video",
    cue: "01:04",
    evidence: "1-1\uC124\uBA85\uC790\uB8CC: 1\uBD844\uCD08\uBD80\uD130 \uAE30\uB3D9\uC601\uC0C1",
    status: "\uC801\uC6A9",
    assetStatus: "\uBE0C\uB77C\uC6B0\uC800 \uC7AC\uC0DD",
    path: "client/public/sudo_data/md/sources/1-1 \uC7A5\uB3C4\uD6C8\uB828\uC7A5 \uAE30\uB3D9(3).md",
    playbackPath: "/sudo_data/converted/1-1-jangdo-mobility-3.mp4"
  },
  {
    id: "terrain-photo-1",
    sourceFile: "1-2 \uC7A5\uB3C4\uD6C8\uB828\uC7A5 \uC0AC\uC9C4.show",
    sourceKind: "presentation",
    cue: "slide media image1",
    evidence: "MilMap \uC88C\uD45C 126.6075630 / 37.546994, MGRS 52SBG8864858245, \uC7A5\uB3C4\uD6C8\uB828\uC7A5 \uC9C0\uD615DB",
    status: "\uC804\uC2DC",
    assetStatus: "\uBB38\uC11C\uADFC\uAC70",
    path: "client/public/sudo_data/md/sources/1-2 \uC7A5\uB3C4\uD6C8\uB828\uC7A5 \uC0AC\uC9C4.md"
  },
  {
    id: "terrain-photo-2",
    sourceFile: "1-2 \uC7A5\uB3C4\uD6C8\uB828\uC7A5 \uC0AC\uC9C4.show",
    sourceKind: "presentation",
    cue: "slide media image2",
    evidence: "MilMap \uC88C\uD45C 126.6312151 / 37.5621520, MGRS 52SBG9078159874, \uC7A5\uB3C4\uD6C8\uB828\uC7A5 \uC9C0\uD615DB",
    status: "\uC804\uC2DC",
    assetStatus: "\uBB38\uC11C\uADFC\uAC70",
    path: "client/public/sudo_data/md/sources/1-2 \uC7A5\uB3C4\uD6C8\uB828\uC7A5 \uC0AC\uC9C4.md"
  },
  {
    id: "pdf-requirement",
    sourceFile: "senario.pdf page 01",
    sourceKind: "pdf",
    cue: "H~H+5'",
    evidence: "\uB4DC\uB860\uC774 \uD45C\uC801\uC2DD\uBCC4 \uC2DC \uC54C\uB9BC\uCC3D \uC804\uC2DC, \uC9C0\uD615DB \uC804\uC2DC, \uB4DC\uB860\uC790\uC138/\uC704\uCE58/\uACE0\uB3C4/\uAC10\uC2DC\uC88C\uD45C \uAC00\uC2DC\uD654",
    status: "\uC801\uC6A9",
    assetStatus: "\uBB38\uC11C\uADFC\uAC70",
    path: "client/public/sudo_data/md/sources/senario.md"
  }
];
function buildSudoDroneTargetSourceTable() {
  return {
    title: "1-1/1-2 \uB4DC\uB860 \uD45C\uC801\uC2DD\uBCC4 \uC6D0\uBCF8 \uD050",
    columns: [
      { key: "sourceFile", label: "\uC6D0\uBCF8" },
      { key: "cue", label: "Cue" },
      { key: "evidence", label: "\uADFC\uAC70" },
      { key: "status", label: "\uC0C1\uD0DC" },
      { key: "assetStatus", label: "\uC790\uC0B0\uC0C1\uD0DC" },
      { key: "playbackPath", label: "\uC7AC\uC0DD\uACBD\uB85C" },
      { key: "path", label: "\uACBD\uB85C" }
    ],
    rows: SUDO_DRONE_TARGET_SOURCE_ROWS.map((row) => ({
      sourceFile: formatSudoSourceDisplayLabel(row.sourceFile),
      cue: row.cue,
      evidence: row.evidence,
      status: row.status,
      assetStatus: row.assetStatus,
      playbackPath: row.playbackPath ?? "-",
      path: row.path
    }))
  };
}
function buildSudoDroneIdentificationRowsForDecision() {
  return [
    { item: "\uB4DC\uB860\uD638\uAE30", value: "\uB4DC\uB8601", status: "\uAC10\uC2DC\uC911" },
    { item: "\uD45C\uC801\uC88C\uD45C", value: "BH 12345 67890", status: "\uD655\uC815" },
    { item: "\uB4DC\uB860\uC88C\uD45C", value: "BH 12321 56789", status: "\uCD94\uC801\uC911" },
    { item: "\uC9C0\uD615 DB", value: "\uC7A5\uB3C4\uD6C8\uB828\uC7A5", status: "\uB9E4\uCE6D" },
    { item: "\uC6D0\uBCF8 cue", value: "1-1 01:45 / 1-2 MilMap", status: "\uC5F0\uACB0" },
    { item: "\uC774\uAD00", value: "\uD45C\uC801\uC131\uC9C8\uBD84\uC11D", status: "\uC900\uBE44\uC644\uB8CC" }
  ];
}
function getSudoDroneIdentificationRowsForVisual() {
  return [
    {
      item: "\uACBD\uBCF4",
      value: "\uB4DC\uB8601\uC774 \uD45C\uC801\uC744 \uC2DD\uBCC4",
      source: formatSudoSourceDisplayLabel("senario.pdf page 01")
    },
    {
      item: "\uD45C\uC801\uC88C\uD45C",
      value: "BH 12345 67890",
      source: "SWID \uC601\uC0C1 / 1-2 MilMap"
    },
    {
      item: "\uB4DC\uB860\uC88C\uD45C",
      value: "BH 12321 56789",
      source: "SWID \uC601\uC0C1"
    },
    {
      item: "\uC601\uC0C1 cue",
      value: "SWID \uCC9C\uBB341",
      source: SUDO_DRONE_TARGET_DESCRIPTION_SOURCE_NAME
    },
    {
      item: "\uC7A5\uC804 cue",
      value: "1-1(1) 04:18 \uC7AC\uAC80\uC218",
      source: SUDO_DRONE_TARGET_DESCRIPTION_SOURCE_NAME
    },
    {
      item: "\uC9C0\uD615DB",
      value: "MGRS 52SBG8864858245 / 52SBG9078159874",
      source: "1-2 \uC7A5\uB3C4\uD6C8\uB828\uC7A5 \uC0AC\uC9C4.show"
    }
  ];
}

// js/vendor/kairos/src/gui/sudo/sudoMunitionEffectIntel.ts
var SUDO_MUNITION_EFFECT_SOURCE_NAME = "7-1~2 \uC9C0\uD615DB\uFF0C \uD0C4\uC885 \uBC0F \uBC1C\uC218 \uD310\uB2E8 \uC790\uB8CC";
var SUDO_MUNITION_EFFECT_SOURCE_PATH = "client/public/sudo_data/md/sources/7-1~2 \uC9C0\uD615DB\uFF0C \uD0C4\uC885 \uBC0F \uBC1C\uC218 \uD310\uB2E8 \uC790\uB8CC.md";
var SUDO_MUNITION_EFFECT_COLUMNS = [10, 20, 30];
var ROCKET_TARGET_PATTERN = /122|240|방사포|mlrs|m-?1991|k136/i;
var SUDO_MUNITION_EFFECT_SOURCE_ROWS = [
  {
    id: "rocket-0-6-open-battery",
    targetType: "122/240mm \uBC29\uC0AC\uD3EC",
    targetPattern: ROCKET_TARGET_PATTERN,
    rangeBand: "0~6km",
    terrainClass: "open",
    terrainLabel: "\uAC1C\uD65C\uC9C0",
    fireUnit: "\uD3EC\uB300",
    effectCells: { 10: "HE \u2462", 20: "HE \u2465", 30: "HE \u2468" },
    source: `${SUDO_MUNITION_EFFECT_SOURCE_NAME} #1 100\uD3EC\uBCD1\uB300\uB300 0~6km \uAC1C\uD65C\uC9C0 \uD3EC\uB300`
  },
  {
    id: "rocket-0-6-open-battalion",
    targetType: "122/240mm \uBC29\uC0AC\uD3EC",
    targetPattern: ROCKET_TARGET_PATTERN,
    rangeBand: "0~6km",
    terrainClass: "open",
    terrainLabel: "\uAC1C\uD65C\uC9C0",
    fireUnit: "\uB300\uB300",
    effectCells: { 10: "HE \u2460", 20: "HE \u2460", 30: "HE \u2460" },
    source: `${SUDO_MUNITION_EFFECT_SOURCE_NAME} #1 100\uD3EC\uBCD1\uB300\uB300 0~6km \uAC1C\uD65C\uC9C0 \uB300\uB300`
  },
  {
    id: "rocket-0-6-covered-battery",
    targetType: "122/240mm \uBC29\uC0AC\uD3EC",
    targetPattern: ROCKET_TARGET_PATTERN,
    rangeBand: "0~6km",
    terrainClass: "covered",
    terrainLabel: "\uC0B0\uB9BC/\uB3C4\uC2EC",
    fireUnit: "\uD3EC\uB300",
    effectCells: { 10: "HE \u2462", 20: "HE \u2465", 30: "HE \u2468" },
    source: `${SUDO_MUNITION_EFFECT_SOURCE_NAME} #1 100\uD3EC\uBCD1\uB300\uB300 0~6km \uC0B0\uB9BC/\uB3C4\uC2EC \uD3EC\uB300`
  },
  {
    id: "rocket-0-6-covered-battalion",
    targetType: "122/240mm \uBC29\uC0AC\uD3EC",
    targetPattern: ROCKET_TARGET_PATTERN,
    rangeBand: "0~6km",
    terrainClass: "covered",
    terrainLabel: "\uC0B0\uB9BC/\uB3C4\uC2EC",
    fireUnit: "\uB300\uB300",
    effectCells: { 10: "HE \u2460", 20: "HE \u2460", 30: "HE \u2460" },
    source: `${SUDO_MUNITION_EFFECT_SOURCE_NAME} #1 100\uD3EC\uBCD1\uB300\uB300 0~6km \uC0B0\uB9BC/\uB3C4\uC2EC \uB300\uB300`
  },
  {
    id: "rocket-6-12-open-battery",
    targetType: "122/240mm \uBC29\uC0AC\uD3EC",
    targetPattern: ROCKET_TARGET_PATTERN,
    rangeBand: "6~12km",
    terrainClass: "open",
    terrainLabel: "\uAC1C\uD65C\uC9C0",
    fireUnit: "\uD3EC\uB300",
    effectCells: { 10: "HE \u2462", 20: "HE \u2465", 30: "HE \u2467" },
    source: `${SUDO_MUNITION_EFFECT_SOURCE_NAME} #1 100\uD3EC\uBCD1\uB300\uB300 6~12km \uAC1C\uD65C\uC9C0 \uD3EC\uB300`
  },
  {
    id: "rocket-6-12-open-battalion",
    targetType: "122/240mm \uBC29\uC0AC\uD3EC",
    targetPattern: ROCKET_TARGET_PATTERN,
    rangeBand: "6~12km",
    terrainClass: "open",
    terrainLabel: "\uAC1C\uD65C\uC9C0",
    fireUnit: "\uB300\uB300",
    effectCells: { 10: "HE \u2460", 20: "HE \u2461", 30: "HE \u2462" },
    source: `${SUDO_MUNITION_EFFECT_SOURCE_NAME} #1 100\uD3EC\uBCD1\uB300\uB300 6~12km \uAC1C\uD65C\uC9C0 \uB300\uB300`
  },
  {
    id: "rocket-6-12-covered-battery",
    targetType: "122/240mm \uBC29\uC0AC\uD3EC",
    targetPattern: ROCKET_TARGET_PATTERN,
    rangeBand: "6~12km",
    terrainClass: "covered",
    terrainLabel: "\uC0B0\uB9BC/\uB3C4\uC2EC",
    fireUnit: "\uD3EC\uB300",
    effectCells: { 10: "HE \u2462", 20: "HE \u2466", 30: "HE \u2469" },
    source: `${SUDO_MUNITION_EFFECT_SOURCE_NAME} #1 100\uD3EC\uBCD1\uB300\uB300 6~12km \uC0B0\uB9BC/\uB3C4\uC2EC \uD3EC\uB300`
  },
  {
    id: "rocket-6-12-covered-battalion",
    targetType: "122/240mm \uBC29\uC0AC\uD3EC",
    targetPattern: ROCKET_TARGET_PATTERN,
    rangeBand: "6~12km",
    terrainClass: "covered",
    terrainLabel: "\uC0B0\uB9BC/\uB3C4\uC2EC",
    fireUnit: "\uB300\uB300",
    effectCells: { 10: "HE \u2461", 20: "HE \u2462", 30: "HE \u2463" },
    source: `${SUDO_MUNITION_EFFECT_SOURCE_NAME} #1 100\uD3EC\uBCD1\uB300\uB300 6~12km \uC0B0\uB9BC/\uB3C4\uC2EC \uB300\uB300`
  },
  {
    id: "rocket-12-18-open-battery",
    targetType: "122/240mm \uBC29\uC0AC\uD3EC",
    targetPattern: ROCKET_TARGET_PATTERN,
    rangeBand: "12~18km",
    terrainClass: "open",
    terrainLabel: "\uAC1C\uD65C\uC9C0",
    fireUnit: "\uD3EC\uB300",
    effectCells: { 10: "HE \u2462", 20: "HE \u2465", 30: "HE \u2469" },
    source: `${SUDO_MUNITION_EFFECT_SOURCE_NAME} #1 100\uD3EC\uBCD1\uB300\uB300 12~18km \uAC1C\uD65C\uC9C0 \uD3EC\uB300`
  },
  {
    id: "rocket-12-18-open-battalion",
    targetType: "122/240mm \uBC29\uC0AC\uD3EC",
    targetPattern: ROCKET_TARGET_PATTERN,
    rangeBand: "12~18km",
    terrainClass: "open",
    terrainLabel: "\uAC1C\uD65C\uC9C0",
    fireUnit: "\uB300\uB300",
    effectCells: { 10: "HE \u2460", 20: "HE \u2461", 30: "HE \u2462" },
    source: `${SUDO_MUNITION_EFFECT_SOURCE_NAME} #1 100\uD3EC\uBCD1\uB300\uB300 12~18km \uAC1C\uD65C\uC9C0 \uB300\uB300`
  },
  {
    id: "rocket-12-18-covered-battery",
    targetType: "122/240mm \uBC29\uC0AC\uD3EC",
    targetPattern: ROCKET_TARGET_PATTERN,
    rangeBand: "12~18km",
    terrainClass: "covered",
    terrainLabel: "\uC0B0\uB9BC/\uB3C4\uC2EC",
    fireUnit: "\uD3EC\uB300",
    effectCells: { 10: "HE \u2463", 20: "HE \u2467", 30: "HE \u246B" },
    source: `${SUDO_MUNITION_EFFECT_SOURCE_NAME} #1 100\uD3EC\uBCD1\uB300\uB300 12~18km \uC0B0\uB9BC/\uB3C4\uC2EC \uD3EC\uB300`
  },
  {
    id: "rocket-12-18-covered-battalion",
    targetType: "122/240mm \uBC29\uC0AC\uD3EC",
    targetPattern: ROCKET_TARGET_PATTERN,
    rangeBand: "12~18km",
    terrainClass: "covered",
    terrainLabel: "\uC0B0\uB9BC/\uB3C4\uC2EC",
    fireUnit: "\uB300\uB300",
    effectCells: { 10: "HE \u2461", 20: "HE \u2462", 30: "HE \u2464" },
    source: `${SUDO_MUNITION_EFFECT_SOURCE_NAME} #1 100\uD3EC\uBCD1\uB300\uB300 12~18km \uC0B0\uB9BC/\uB3C4\uC2EC \uB300\uB300`
  },
  {
    id: "rocket-18-40-open-battery",
    targetType: "122/240mm \uBC29\uC0AC\uD3EC",
    targetPattern: ROCKET_TARGET_PATTERN,
    rangeBand: "18~40km",
    terrainClass: "open",
    terrainLabel: "\uAC1C\uD65C\uC9C0",
    fireUnit: "\uD3EC\uB300",
    effectCells: { 10: "HEBB \u2462", 20: "HEBB \u2466", 30: "HEBB \u2469" },
    source: `${SUDO_MUNITION_EFFECT_SOURCE_NAME} #1 100\uD3EC\uBCD1\uB300\uB300 18~40km \uAC1C\uD65C\uC9C0 \uD3EC\uB300`
  },
  {
    id: "rocket-18-40-open-battalion",
    targetType: "122/240mm \uBC29\uC0AC\uD3EC",
    targetPattern: ROCKET_TARGET_PATTERN,
    rangeBand: "18~40km",
    terrainClass: "open",
    terrainLabel: "\uAC1C\uD65C\uC9C0",
    fireUnit: "\uB300\uB300",
    effectCells: { 10: "HEBB \u2461", 20: "HEBB \u2462", 30: "HEBB \u2463" },
    source: `${SUDO_MUNITION_EFFECT_SOURCE_NAME} #1 100\uD3EC\uBCD1\uB300\uB300 18~40km \uAC1C\uD65C\uC9C0 \uB300\uB300`
  },
  {
    id: "rocket-18-40-covered-battery",
    targetType: "122/240mm \uBC29\uC0AC\uD3EC",
    targetPattern: ROCKET_TARGET_PATTERN,
    rangeBand: "18~40km",
    terrainClass: "covered",
    terrainLabel: "\uC0B0\uB9BC/\uB3C4\uC2EC",
    fireUnit: "\uD3EC\uB300",
    effectCells: { 10: "HEBB \u2462", 20: "HEBB \u2463", 30: "HEBB \u2469" },
    source: `${SUDO_MUNITION_EFFECT_SOURCE_NAME} #1 100\uD3EC\uBCD1\uB300\uB300 18~40km \uC0B0\uB9BC/\uB3C4\uC2EC \uD3EC\uB300`
  },
  {
    id: "rocket-18-40-covered-battalion",
    targetType: "122/240mm \uBC29\uC0AC\uD3EC",
    targetPattern: ROCKET_TARGET_PATTERN,
    rangeBand: "18~40km",
    terrainClass: "covered",
    terrainLabel: "\uC0B0\uB9BC/\uB3C4\uC2EC",
    fireUnit: "\uB300\uB300",
    effectCells: { 10: "HEBB \u2461", 20: "HEBB \u2462", 30: "HEBB \u2463" },
    source: `${SUDO_MUNITION_EFFECT_SOURCE_NAME} #1 100\uD3EC\uBCD1\uB300\uB300 18~40km \uC0B0\uB9BC/\uB3C4\uC2EC \uB300\uB300`
  }
];
function isSudoMunitionEffectDecisionRow(row) {
  return row.rangeBand === "0~6km";
}
function buildSudoMunitionEffectDecisionRules() {
  return SUDO_MUNITION_EFFECT_SOURCE_ROWS.filter(
    isSudoMunitionEffectDecisionRow
  ).map(({ source: _source, ...row }) => ({ ...row }));
}
function buildSudoMunitionEffectSourceTable() {
  return {
    title: "7-1~2 \uD0C4\uC885/\uBC1C\uC218 \uC6D0\uBCF8 \uB9E4\uD2B8\uB9AD\uC2A4",
    columns: [
      { key: "target", label: "\uD45C\uC801\uC131\uC9C8" },
      { key: "range", label: "\uC0AC\uAC70\uB9AC" },
      { key: "terrain", label: "\uC9C0\uD615" },
      { key: "fireUnit", label: "\uC0AC\uACA9\uBD80\uB300" },
      { key: "effect10", label: "10%" },
      { key: "effect20", label: "20%" },
      { key: "effect30", label: "30%" },
      { key: "source", label: "\uCD9C\uCC98" }
    ],
    rows: SUDO_MUNITION_EFFECT_SOURCE_ROWS.map((row) => ({
      target: row.targetType,
      range: row.rangeBand,
      terrain: row.terrainLabel,
      fireUnit: row.fireUnit,
      effect10: row.effectCells[10],
      effect20: row.effectCells[20],
      effect30: row.effectCells[30],
      source: row.source
    }))
  };
}
function getSudoMunitionEffectRowsForVisual() {
  return SUDO_MUNITION_EFFECT_SOURCE_ROWS.filter(
    (row) => row.rangeBand === "0~6km"
  ).map((row) => ({
    target: row.targetType,
    range: row.rangeBand,
    terrain: row.terrainLabel,
    fireUnit: row.fireUnit,
    effect10: row.effectCells[10],
    effect20: row.effectCells[20],
    effect30: row.effectCells[30]
  }));
}

// js/vendor/kairos/src/gui/sudo/sudoDataIntel.ts
var sudoAsset2 = (path) => resolvePublicAssetPath(`/sudo_data/${path}`);
var scenarioAsset3 = (path) => sudoAsset2(`_extracted/scenario_6_1/${path}`);
var mdSource = (filename) => sudoAsset2(`md/sources/${filename}.md`);
var slideAsset = (folder, slide) => sudoAsset2(`_extracted/slides/${folder}/\uC2AC\uB77C\uC774\uB4DC${slide}.PNG`);
var gis = SUDO_JANGDO_GIS_INTEL;
var COMMON_GIS_HIGHLIGHTS = [
  `NGII/VWorld/MOLIT GIS: \uB3C4\uB85C ${gis.roads.toLocaleString()}\uAC74, \uAC74\uBB3C ${gis.buildings.toLocaleString()}\uB3D9, HD map ${gis.hdMapFeatures.toLocaleString()}\uAC74`,
  `\uD45C\uC801 \uC8FC\uBCC0 \uBBFC\uAC00 ${gis.nearestCivilianM}m, 250m \uB0B4 \uBBFC\uAC00 ${gis.civilianWithin250M}\uB3D9, \uBBFC\uAC00 \uC704\uD5D8 ${gis.civilianRiskLevel}`,
  `\uC9C0\uD615\uBD84\uC11D: \uC0B0\uB9BC/\uCC28\uD3D0 ${gis.forestPercent}%, \uAC1C\uD65C\uC9C0 ${gis.openTerrainPercent}%, DEM relief ${gis.demAoiReliefM}m`
];
var ROAD_GIS_HIGHLIGHTS = [
  `\uC0AC\uD0DC\uBD84\uC11D \uB3C4\uB85C\uB9DD: NGII B110 A2_LINK ${gis.situationRoadLinks.toLocaleString()}\uAC1C link`,
  `HD map operational context: \uD45C\uC801 1km \uB0B4 ${gis.hdMapWithin1000M.toLocaleString()}\uAC74, 250m \uB0B4 ${gis.hdMapWithin250M.toLocaleString()}\uAC74`,
  `\uCD5C\uADFC HD \uAC1D\uCCB4: ${gis.nearestHdMapFeature.label} ${gis.nearestHdMapFeature.distanceM}m / ${gis.nearestHdMapFeature.routeLabel}`
];
var SUDO_DRONE_RECHECK_CUES = SUDO_DRONE_TARGET_SOURCE_ROWS.filter(
  (row) => row.status === "\uC7AC\uAC80\uC218"
).map((row) => `${row.sourceFile} ${row.cue}`);
var SUDO_DRONE_TERRAIN_CUE_COUNT = SUDO_DRONE_TARGET_SOURCE_ROWS.filter(
  (row) => row.sourceFile === "1-2 \uC7A5\uB3C4\uD6C8\uB828\uC7A5 \uC0AC\uC9C4.show"
).length;
var SUDO_MUNITION_RANGE_BANDS = Array.from(
  new Set(SUDO_MUNITION_EFFECT_SOURCE_ROWS.map((row) => row.rangeBand))
).join("/");
var SUDO_MUNITION_HEBB_ROW_COUNT = SUDO_MUNITION_EFFECT_SOURCE_ROWS.filter(
  (row) => Object.values(row.effectCells).some((cell) => cell.includes("HEBB"))
).length;
var SUDO_MUNITION_CURRENT_TERRAIN_CLASS = gis.forestPercent >= gis.openTerrainPercent ? "covered" : "open";
var SUDO_MUNITION_CURRENT_TERRAIN_LABEL = SUDO_MUNITION_CURRENT_TERRAIN_CLASS === "covered" ? "\uC0B0\uB9BC/\uB3C4\uC2EC" : "\uAC1C\uD65C\uC9C0";
var SUDO_MUNITION_CURRENT_FIRE_UNIT = "\uB300\uB300";
var SUDO_MUNITION_CURRENT_EFFECT = SUDO_MUNITION_EFFECT_SOURCE_ROWS.find(
  (row) => row.rangeBand === "0~6km" && row.terrainClass === SUDO_MUNITION_CURRENT_TERRAIN_CLASS && row.fireUnit === SUDO_MUNITION_CURRENT_FIRE_UNIT
)?.effectCells[30] ?? "HE \u2462";
var SUDO_PRIMARY_STRIKE_ASSET = SUDO_STRIKE_ASSET_SOURCE_ROWS[0];
var SUDO_PRIMARY_STRIKE_METHOD = SUDO_STRIKE_METHOD_SOURCE_ROWS[0];
var SUDO_PRIMARY_FIRE_PLAN_ROW = SUDO_FIRE_PLAN_SOURCE_ROWS[1];
var SUDO_DATA_ENHANCEMENT_IDEAS = [
  {
    id: "scenario-source-intel",
    title: "\uC2DC\uB098\uB9AC\uC624\uBCC4 \uC6D0\uC790\uB8CC \uC778\uD154 \uD328\uB110",
    status: "implemented",
    scenarioIds: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14],
    basis: "senario.pdf \uAD6C\uC870\uD654 JSON, md/sources, \uCD94\uCD9C page/figure"
  },
  {
    id: "gis-risk-summary",
    title: "GIS \uBBFC\uAC00/\uB3C4\uB85C \uC704\uD5D8\uC694\uC57D",
    status: "implemented",
    scenarioIds: [5, 7, 8, 9, 10, 11, 12, 14],
    basis: "jangdo-gis-summary.json, road-summary.json, offline-map/jangdo intel"
  },
  {
    id: "media-reference-switcher",
    title: "\uC601\uC0C1\xB7\uC2AC\uB77C\uC774\uB4DC \uADFC\uAC70 \uBC14\uB85C \uC5F4\uAE30",
    status: "implemented",
    scenarioIds: [1, 2, 3, 5, 6, 7, 8, 9, 13, 14],
    basis: "converted MP4, extracted slides, scenario page renders"
  },
  {
    id: "scenario-media-asset-registry",
    title: "S1/S2 \uC6D0\uBCF8-\uBCC0\uD658\uBCF8 \uC790\uC0B0 \uB808\uC9C0\uC2A4\uD2B8\uB9AC",
    status: "implemented",
    scenarioIds: [1, 2],
    basis: "S1 1-1/1-2 cue\uBCC4 playbackPath, S2 2-1~7 \uBE0C\uB77C\uC6B0\uC800 \uC7AC\uC0DD/\uBB38\uC11C\uADFC\uAC70/\uBD80\uBD84\uCD94\uCD9C \uC0C1\uD0DC"
  },
  {
    id: "scale-source-priority-panel",
    title: "S3 \uC6D0\uBCF8 \uB300\uC5F4 \uC774\uBBF8\uC9C0-\uAE30\uC900\uD45C \uC6B0\uC120 \uD328\uB110",
    status: "implemented",
    scenarioIds: [3],
    basis: "3-1 \uBD80\uB300\uBCC4 \uD589\uAD70\uC7A5\uACBD data \uC2AC\uB77C\uC774\uB4DC \uC774\uBBF8\uC9C0\uC640 \uC120\uD0DD \uAE30\uC900\uD589, \uD589\uAD70\uC7A5\uACBD\uC744 \uADDC\uBAA8\uD310\uB2E8 \uC6B0\uCE21 \uADFC\uAC70 \uC0C1\uB2E8\uC5D0 \uACE0\uC815 \uD45C\uC2DC"
  },
  {
    id: "order-map-source-rank-link",
    title: "S4 \uC9C0\uB3C4 \uB9C8\uCEE4-\uC6D0\uBCF8 \uD6C4\uBCF4\uC21C\uC704 \uB9E4\uCE6D",
    status: "implemented",
    scenarioIds: [4],
    basis: "4-1 \uC804\uD22C\uC11C\uC5F4 \uD6C4\uBCF4 \uC6D0\uBCF8\uD45C\uC758 \uD310\uC815\uC21C\uC704\uC640 \uC9C0\uB3C4 \uB9C8\uCEE4 \uBC88\uD638\uB97C \uB9E4\uCE6D\uD558\uACE0 \uC120\uD0DD \uB9C8\uCEE4\uC5D0 \uBCF4\uC720\uC7A5\uBE44 \uD31D\uC5C5\uC73C\uB85C \uC5F0\uACB0"
  },
  {
    id: "firing-unit-source-matrix-highlight",
    title: "S8 \uD6C4\uBCF4 \uC120\uD0DD-source matrix \uD558\uC774\uB77C\uC774\uD2B8",
    status: "implemented",
    scenarioIds: [8],
    basis: "8-1 \uC6D0\uBCF8 \uD3C9\uAC00\uD45C\uC5D0\uC11C AI \uCD94\uCC9C\uD589\uACFC \uC6B4\uC6A9\uC790 \uD604\uC7AC \uAC80\uD1A0\uD589\uC744 \uB3D9\uC2DC\uC5D0 \uD45C\uC2DC"
  },
  {
    id: "redeployment-source-destination-labels",
    title: "S10 \uC7AC\uBC30\uCE58 \uBAA9\uC801\uC9C0-\uC6D0\uBB38 \uB9E4\uCE6D \uB77C\uBCA8",
    status: "implemented",
    scenarioIds: [10],
    basis: "9-1 GPT \uC751\uB2F5 \uC6D0\uBB38\uACFC TAI/NAI \uBAA9\uC801\uC9C0 \uCE74\uB4DC\uC5D0 \uC6D0\uBB38\uB9E4\uCE6D \uB77C\uBCA8\uACFC source sentence \uD45C\uC2DC"
  },
  {
    id: "strike-source-timeline-link",
    title: "S11 \uC6D0\uBCF8 \uAC00\uC6A9\uC2DC\uAC04\uD45C-H\uC2DC \uB9E4\uCE6D",
    status: "implemented",
    scenarioIds: [11],
    basis: "senario.pdf page 06 \uAC00\uC6A9\uC790\uC0B0 \uC6D0\uBCF8\uC2DC\uAC04\uD45C\uC640 \uCD5C\uC801 \uD0C0\uACA9\uBC29\uBC95 \uC6D0\uBCF8\uADFC\uAC70\uB97C H\uC2DC 11:00 \uC2DC\uAC04\uCD95 \uC694\uC57D\uC73C\uB85C \uC5F0\uACB0"
  },
  {
    id: "fire-plan-source-lane-link",
    title: "S12 \uC6D0\uBCF8 \uD654\uB825\uC6B4\uC6A9 \uB808\uC778 \uB9E4\uCE6D",
    status: "implemented",
    scenarioIds: [12],
    basis: "\uD1B5\uD569\uD654\uB825\uC6B4\uC6A9\uB3C4\uD45C \uC6D0\uBCF8\uADFC\uAC70 5\uD589\uC744 H-10~H+30 \uB3C4\uD45C \uB808\uC778 \uC694\uC57D\uACFC source row \uC18D\uC131\uC73C\uB85C \uC5F0\uACB0"
  },
  {
    id: "rd-assessment-hover-source-detail",
    title: "S13 R/D \uCCB4\uD06C\uB9AC\uC2A4\uD2B8 hover \uC6D0\uBB38\uADFC\uAC70",
    status: "implemented",
    scenarioIds: [13],
    basis: "13-1 \uC2E4\uC874\u318D\uD5C8\uC0C1\uD45C\uC801 \uD310\uB2E8\uD45C\uC758 \uC2E4\uC874/\uD5C8\uC0C1 \uAE30\uC900, \uD3C9\uAC00\uCC45\uC784, \uCD9C\uCC98\uB97C \uAC01 \uD310\uB2E8 \uCE74\uB4DC\uC5D0 hover/focus \uADFC\uAC70\uB85C \uC5F0\uACB0"
  },
  {
    id: "bda-input-observation-evidence-rail",
    title: "S14 \uC785\uB825 DATA-\uAD00\uCE21 \uD504\uB808\uC784 \uADFC\uAC70 \uB808\uC77C",
    status: "implemented",
    scenarioIds: [14],
    basis: "senario.pdf page 06 \uD0C0\uACA9\uACB0\uACFC figure\uC640 DRONE-10 \uC7AC\uAD00\uCE21 frame_02_37\uC744 BDA \uC785\uB825 \uC601\uC0C1/\uAD00\uCE21 \uD504\uB808\uC784\uC73C\uB85C \uBCD1\uB82C \uD45C\uC2DC"
  },
  {
    id: "assistant-source-context",
    title: "Army GPT \uC6D0\uC790\uB8CC \uBB38\uB9E5 \uBCF4\uAC15",
    status: "implemented",
    scenarioIds: [2, 6, 9, 10, 13],
    basis: "sudo_data source refs, \uD310\uB2E8\uADFC\uAC70, GIS \uC694\uC57D"
  },
  {
    id: "runtime-json-source-loader",
    title: "structured_scenario_6_1.json \uB7F0\uD0C0\uC784 \uB85C\uB354",
    status: "implemented",
    scenarioIds: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13],
    basis: "public JSON\uC744 \uC9C1\uC811 fetch\uD574 \uC790\uB8CC \uAC31\uC2E0\uC744 \uCF54\uB4DC \uBC30\uD3EC\uC640 \uBD84\uB9AC"
  },
  {
    id: "decision-binding-trace",
    title: "\uC6D0\uC790\uB8CC \uC561\uC158-\uD310\uB2E8\uC785\uB825 \uACC4\uC0B0\uC5F0\uACB0 \uCD94\uC801",
    status: "implemented",
    scenarioIds: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14],
    basis: "structured_scenario_6_1.json codeAction + operational-data inputs"
  },
  {
    id: "source-derived-decision-inputs",
    title: "\uC6D0\uC790\uB8CC \uC561\uC158 \uAE30\uBC18 \uD310\uB2E8\uC5D4\uC9C4 \uC785\uB825 \uD328\uCE58 \uC81C\uC548",
    status: "implemented",
    scenarioIds: [3, 4, 5, 7, 8, 9, 11, 12, 13, 14],
    basis: "structured_scenario_6_1.json codeAction + md/sources \uD310\uB2E8\uD45C + \uC6B4\uC601\uC790 \uC218\uB3D9 \uC801\uC6A9"
  },
  {
    id: "source-stage-fallback-manifest",
    title: "\uC6D0\uC790\uB8CC \uB2E8\uACC4 \uC815\uC801 \uB300\uCCB4 \uB9E4\uB2C8\uD398\uC2A4\uD2B8",
    status: "implemented",
    scenarioIds: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14],
    basis: "structured_scenario_6_1.json \uB85C\uB529 \uC804/\uC2E4\uD328 \uC2DC\uC5D0\uB3C4 \uC6D0\uC790\uB8CC \uC694\uAD6C\uC0AC\uD56D\xB7\uC81C\uACF5\uC790\uB8CC\xB7codeAction \uC720\uC9C0"
  },
  {
    id: "source-trace-export",
    title: "FTX/\uC2DC\uB098\uB9AC\uC624 export \uC6D0\uC790\uB8CC \uCD94\uC801",
    status: "implemented",
    scenarioIds: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14],
    basis: "FTX JSON/CSV/Markdown, \uC2DC\uB098\uB9AC\uC624 CSV/\uC6B4\uC6A9 JSON/\uD310\uC815 \uBCF5\uC0AC\uC5D0 sourceRefs/sourceFiles/bindings/patch \uC0C1\uD0DC \uD3EC\uD568"
  },
  {
    id: "source-extraction-health",
    title: "sudo_data \uCD94\uCD9C/OCR \uC0C1\uD0DC \uCD94\uC801",
    status: "implemented",
    scenarioIds: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14],
    basis: "extraction_metadata.json, ocr_manifest.json, ocr_results.json, presentation_export_status.json \uC694\uC57D"
  },
  {
    id: "source-image-evidence-catalog",
    title: "PDF page/figure \uC774\uBBF8\uC9C0 \uADFC\uAC70 \uCE74\uD0C8\uB85C\uADF8",
    status: "implemented",
    scenarioIds: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14],
    basis: "md/\uC2DC\uB098\uB9AC\uC624_6.1_\uC774\uBBF8\uC9C0_\uCE74\uD0C8\uB85C\uADF8.md, scenario_6_1/pages, scenario_6_1/figures"
  }
];
var SUDO_DATA_ENHANCEMENT_IDEA_SUMMARY_PRIORITY = new Map(
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
    "scenario-source-intel"
  ].map((id, index) => [id, index])
);
var HIDDEN_DATA_INTEL_EXPORT_IDEA_IDS = /* @__PURE__ */ new Set([
  "source-image-evidence-catalog"
]);
function getCoreSudoDataEnhancementIdeas(ideas) {
  return ideas.filter(
    (idea) => !HIDDEN_DATA_INTEL_EXPORT_IDEA_IDS.has(idea.id)
  );
}
function sortSudoDataEnhancementIdeas(ideas) {
  return [...ideas].sort((a, b) => {
    const aPriority = SUDO_DATA_ENHANCEMENT_IDEA_SUMMARY_PRIORITY.get(a.id) ?? 99;
    const bPriority = SUDO_DATA_ENHANCEMENT_IDEA_SUMMARY_PRIORITY.get(b.id) ?? 99;
    if (aPriority !== bPriority) {
      return aPriority - bPriority;
    }
    return a.title.localeCompare(b.title, "ko");
  });
}
var SUDO_SCENARIO_DATA_INTEL = {
  1: {
    scenarioId: 1,
    sourceRefs: ["1-1", "1-1\uC124\uBA85\uC790\uB8CC", "1-2", "senario.pdf #1"],
    sourceFiles: [
      SUDO_DRONE_TARGET_SOURCE_NAME,
      SUDO_DRONE_TARGET_DESCRIPTION_SOURCE_NAME,
      "1-2 \uC7A5\uB3C4\uD6C8\uB828\uC7A5 \uC0AC\uC9C4.show",
      "senario.pdf page 01"
    ],
    dataPoints: [
      `\uC6D0\uBCF8 cue ${SUDO_DRONE_TARGET_SOURCE_ROWS.length}\uAC74: \uC601\uC0C1/\uC124\uBA85\uC790\uB8CC/1-2 MilMap/\uC6D0\uC790\uB8CC \uC694\uAD6C\uC0AC\uD56D \uC5F0\uACB0`,
      `\uC7AC\uAC80\uC218 cue ${SUDO_DRONE_RECHECK_CUES.join(", ")}: \uD604\uC7AC \uCD94\uCD9C MP4 03:30\uBCF4\uB2E4 \uAE38\uC5B4 \uC6D0\uBB38 \uC2DC\uAC04\uCD95 \uD655\uC778 \uD544\uC694`,
      `1-2 MilMap \uC9C0\uD615 cue ${SUDO_DRONE_TERRAIN_CUE_COUNT}\uAC74: 52SBG8864858245 / 52SBG9078159874`,
      "\uD45C\uC801\uC88C\uD45C BH 12345 67890 / \uB4DC\uB860\uC88C\uD45C BH 12321 56789",
      "senario.pdf page 01 H~H+5': \uC54C\uB9BC\uCC3D, \uC9C0\uD615DB, \uB4DC\uB860\uC790\uC138/\uC704\uCE58/\uACE0\uB3C4/\uAC10\uC2DC\uC88C\uD45C \uC804\uC2DC"
    ],
    links: [
      {
        kind: "video",
        label: "1-1 \uC2E4\uC81C \uAE30\uB3D9 \uC601\uC0C1",
        href: sudoAsset2(
          "1-1 \uC7A5\uB3C4\uD6C8\uB828\uC7A5 \uAE30\uB3D9(\uC5F0\uACB0\uD504\uB85C\uADF8\uB7A8 \uC0AC\uC9C4\uC73C\uB85C \uC7AC\uC0DD)/1-1 \uC7A5\uB3C4\uD6C8\uB828\uC7A5 \uAE30\uB3D9(1).mp4"
        )
      },
      {
        kind: "markdown",
        label: "1-1 \uC124\uBA85\uC790\uB8CC",
        href: mdSource("1-1\uC124\uBA85\uC790\uB8CC")
      },
      {
        kind: "markdown",
        label: "1-2 \uC7A5\uB3C4\uD6C8\uB828\uC7A5 \uC0AC\uC9C4",
        href: mdSource("1-2 \uC7A5\uB3C4\uD6C8\uB828\uC7A5 \uC0AC\uC9C4")
      }
    ]
  },
  2: {
    scenarioId: 2,
    sourceRefs: ["2-1~3", "2-4~5", "2-6~7", "senario.pdf #2"],
    sourceFiles: [
      "2-5 \uAC1D\uCCB4\uC778\uC2DD \uBCC0\uD658 MP4",
      "2-6 \uCC9C\uBB34 \uCC38\uACE0\uC790\uB8CC",
      "2-7 \uCC9C\uBB34 \uAD50\uC721\uC790\uB8CC"
    ],
    dataPoints: [
      "240mm \uBC29\uC0AC\uD3EC(M-1991) 99.8%",
      "\uC804\uD3ED/\uC804\uC7A5, 22\uC5F0\uC7A5 \uBC1C\uC0AC\uAD00, ROMAN \uCC28\uB300, \uC6B4\uC804\uC11D/\uD6C4\uBBF8 \uD615\uC0C1",
      "M-1989 \uD6C4\uBCF4 0.2%\uC640 \uBE44\uAD50 \uD310\uC815"
    ],
    links: [
      {
        kind: "video",
        label: "2-5 \uAC1D\uCCB4\uC778\uC2DD \uC601\uC0C1",
        href: sudoAsset2("converted/2-5-object-recognition.mp4")
      },
      {
        kind: "image",
        label: "\uCC9C\uBB34 \uAD50\uC721\uC790\uB8CC \uC81C\uC6D0",
        href: slideAsset("2-7 \uCC9C\uBB34 \uAD50\uC721\uC790\uB8CC", 5)
      },
      {
        kind: "markdown",
        label: "2-6 \uCC9C\uBB34 \uCC38\uACE0\uC790\uB8CC",
        href: mdSource("2-6 \uCC9C\uBB34 \uCC38\uACE0\uC790\uB8CC")
      }
    ]
  },
  3: {
    scenarioId: 3,
    sourceRefs: ["3-1", "1-1", "senario.pdf #3"],
    sourceFiles: ["3-1 \uBD80\uB300\uBCC4 \uD589\uAD70\uC7A5\uACBD data", "1-1 \uC7A5\uB3C4\uD6C8\uB828\uC7A5 \uAE30\uB3D9 \uC601\uC0C1"],
    dataPoints: [
      "\uD504\uB808\uC784 bbox 3\uAC74\uACFC \uD589\uAD70\uC7A5\uACBD \uC57D 350m",
      "240mm \uBC29\uC0AC\uD3EC \uC911\uB300/\uB300\uB300, \uC804\uCC28\uC911\uB300, \uACE0\uC0AC\uD3EC\uC911\uB300, \uACAC\uC778\uD3EC\uC911\uB300 \uAE30\uC900",
      "3-1 \uC6D0\uBCF8 \uB300\uC5F4 \uC774\uBBF8\uC9C0\uC640 \uC120\uD0DD \uAE30\uC900\uD589\uC744 \uADDC\uBAA8\uD310\uB2E8 \uC6B0\uCE21 \uADFC\uAC70 \uC0C1\uB2E8\uC5D0 \uACE0\uC815 \uD45C\uC2DC",
      "\uB300\uC218\uC640 \uD589\uAD70\uC7A5\uACBD \uC911 \uB354 \uD070 \uADDC\uBAA8\uB97C \uC885\uD569 \uD310\uC815"
    ],
    links: [
      {
        kind: "image",
        label: "3-1 \uD589\uAD70\uC7A5\uACBD \uAE30\uC900\uD45C",
        href: slideAsset("3-1 \uBD80\uB300\uBCC4 \uD589\uAD70\uC7A5\uACBD data", 1)
      },
      {
        kind: "markdown",
        label: "3-1 \uCD94\uCD9C \uD14D\uC2A4\uD2B8",
        href: mdSource("3-1 \uBD80\uB300\uBCC4 \uD589\uAD70\uC7A5\uACBD data")
      }
    ]
  },
  4: {
    scenarioId: 4,
    sourceRefs: ["4-1", "senario.pdf #4"],
    sourceFiles: ["4-1 \uD6C8\uB828\uC7A5 \uC778\uADFC\uBD80\uB300 \uC704\uCE58, \uBCF4\uC720 \uC7A5\uBE44 \uB4F1"],
    dataPoints: [
      "\uD45C\uC801\uC88C\uD45C\uC640 \uCD5C\uAE30\uBD80\uB300 BH \uC88C\uD45C \uC774\uACA9\uAC70\uB9AC \uBE44\uAD50",
      "1\uC0AC\uB2E8 1\uB300\uB300 2\uC911\uB300 240mm \uBC29\uC0AC\uD3EC 106m \uD6C4\uBCF4",
      "\uADFC\uC811 152mm \uD6C4\uBCF4\uB294 \uD45C\uC801\uC131\uC9C8 \uBD88\uC77C\uCE58\uB85C \uD6C4\uC21C\uC704",
      "\uC9C0\uB3C4 \uB9C8\uCEE4 \uBC88\uD638\uC640 4-1 \uC6D0\uBCF8 \uD6C4\uBCF4\uD45C \uD310\uC815\uC21C\uC704\uB97C \uB9E4\uCE6D\uD558\uACE0 \uC120\uD0DD \uB9C8\uCEE4\uC5D0 \uBCF4\uC720\uC7A5\uBE44 \uD31D\uC5C5 \uD45C\uC2DC"
    ],
    links: [
      {
        kind: "image",
        label: "4-1 \uC778\uADFC\uBD80\uB300 \uD45C",
        href: slideAsset("4-1 \uD6C8\uB828\uC7A5 \uC778\uADFC\uBD80\uB300 \uC704\uCE58\uFF0C \uBCF4\uC720 \uC7A5\uBE44 \uB4F1", 1)
      },
      {
        kind: "markdown",
        label: "4-1 \uCD94\uCD9C \uD14D\uC2A4\uD2B8",
        href: mdSource("4-1 \uD6C8\uB828\uC7A5 \uC778\uADFC\uBD80\uB300 \uC704\uCE58\uFF0C \uBCF4\uC720 \uC7A5\uBE44 \uB4F1")
      }
    ]
  },
  5: {
    scenarioId: 5,
    sourceRefs: ["5-1", "GIS", "senario.pdf #5"],
    sourceFiles: ["5-1 \uD0C4\uC885\uBCC4 \uBD80\uC218\uC801 \uD6A8\uACFC\uBC18\uACBD", "jangdo-gis-summary.json"],
    dataPoints: [
      "HEBB \uC0AC\uACA9\uAC00\uB2A5 / DPBB \uBBFC\uAC00\uC9C0\uC5ED \uD53C\uD574 \uAC00\uB2A5\uC131 \uC81C\uD55C",
      "17~22km \uAC70\uB9AC\uBCC4 HE, HEBB, DPICM, DPBB \uD6A8\uACFC\uBC18\uACBD",
      `\uD45C\uC801 \uC8FC\uBCC0 \uCD5C\uADFC \uBBFC\uAC00 ${gis.nearestCivilianM}m`
    ],
    gisHighlights: COMMON_GIS_HIGHLIGHTS,
    links: [
      {
        kind: "image",
        label: "5-1 CDE \uD45C",
        href: slideAsset("5-1 \uD0C4\uC885\uBCC4 \uBD80\uC218\uC801 \uD6A8\uACFC\uBC18\uACBD", 1)
      },
      {
        kind: "gis",
        label: "GIS summary",
        href: sudoAsset2("gis/processed/jangdo-gis-summary.json")
      }
    ]
  },
  6: {
    scenarioId: 6,
    sourceRefs: ["6-1", "senario.pdf #6"],
    sourceFiles: ["6-1 240mm \uBC0F 152mm \uCDE8\uC57D\uC810"],
    dataPoints: [
      "\uBC1C\uC0AC \uC704\uCE58 \uB178\uCD9C, \uC7AC\uC7A5\uC804 \uC2DC\uAC04, \uAE30\uB3D9\uC131, \uC815\uBC00\uB3C4 \uD55C\uACC4",
      "\uD0C4\uC57D\xB7\uBB3C\uB958 \uBD80\uB2F4, \uB4DC\uB860 \uCDE8\uC57D\uC131, \uAE30\uC0C1 \uC601\uD5A5, \uAE30\uD0C0 \uCDE8\uC57D \uC694\uC18C",
      "240mm \uBC29\uC0AC\uD3EC\uC640 152mm \uC790\uC8FC\uD3EC \uCDE8\uC57D\uC810 \uC9C8\uC758\uC751\uB2F5 \uADFC\uAC70"
    ],
    links: [
      {
        kind: "image",
        label: "6-1 \uCDE8\uC57D\uC810 \uC2AC\uB77C\uC774\uB4DC",
        href: slideAsset("6-1 240mm \uBC0F 152mm \uCDE8\uC57D\uC810", 1)
      },
      {
        kind: "markdown",
        label: "6-1 \uCD94\uCD9C \uD14D\uC2A4\uD2B8",
        href: mdSource("6-1 240mm \uBC0F 152mm \uCDE8\uC57D\uC810")
      }
    ]
  },
  7: {
    scenarioId: 7,
    sourceRefs: ["7-1~2", "GIS", "senario.pdf #7"],
    sourceFiles: [
      SUDO_MUNITION_EFFECT_SOURCE_NAME,
      `7-1~2 \uC6D0\uBCF8 \uB9E4\uD2B8\uB9AD\uC2A4 ${SUDO_MUNITION_EFFECT_SOURCE_ROWS.length}\uD589`,
      "terrain-core.geojson"
    ],
    dataPoints: [
      `${SUDO_MUNITION_RANGE_BANDS} x \uAC1C\uD65C\uC9C0/\uC0B0\uB9BC\xB7\uB3C4\uC2EC x \uD3EC\uB300/\uB300\uB300 \uC6D0\uBCF8 \uB9E4\uD2B8\uB9AD\uC2A4 ${SUDO_MUNITION_EFFECT_SOURCE_ROWS.length}\uD589`,
      `\uD604\uC7AC \uD45C\uC801 122/240mm \uBC29\uC0AC\uD3EC, 0~6km, ${SUDO_MUNITION_CURRENT_TERRAIN_LABEL} ${gis.forestPercent}/${gis.openTerrainPercent}, \uC694\uB9DD\uD6A8\uACFC 30% -> ${SUDO_MUNITION_CURRENT_EFFECT} ${SUDO_MUNITION_CURRENT_FIRE_UNIT} 1\uBC1C / 100\uD3EC\uBCD1\uB300\uB300 HE\uD0C4 3R`,
      `18~40km \uC6D0\uAC70\uB9AC ${SUDO_MUNITION_HEBB_ROW_COUNT}\uD589\uC740 HEBB\uB85C \uBD84\uB9AC\uD574 \uB2E8\uAC70\uB9AC HE \uD310\uB2E8\uACFC \uD63C\uC120 \uBC29\uC9C0`,
      `\uC6D0\uBCF8 \uACBD\uB85C ${SUDO_MUNITION_EFFECT_SOURCE_PATH}`
    ],
    gisHighlights: COMMON_GIS_HIGHLIGHTS,
    links: [
      {
        kind: "markdown",
        label: "7-1~2 \uCD94\uCD9C \uD14D\uC2A4\uD2B8",
        href: mdSource("7-1~2 \uC9C0\uD615DB\uFF0C \uD0C4\uC885 \uBC0F \uBC1C\uC218 \uD310\uB2E8 \uC790\uB8CC")
      },
      {
        kind: "gis",
        label: "Terrain core",
        href: resolvePublicAssetPath(
          "/offline-map/jangdo/intel/terrain-core.geojson"
        )
      }
    ]
  },
  8: {
    scenarioId: 8,
    sourceRefs: ["8-1", "GIS", "senario.pdf #8"],
    sourceFiles: ["8-1 \uCD5C\uC801\uC758 \uC0AC\uACA9\uBD80\uB300 \uC120\uC815 \uD310\uB2E8 \uC790\uB8CC"],
    dataPoints: [
      "\uD6C4\uBCF4\uBD80\uB300 5\uAC1C \uD56D\uBAA9 \uD3C9\uAC00: \uC0AC\uAC70\uB9AC, \uC0DD\uC874\uC131, \uD0C4, \uBBFC\uAC04\uD53C\uD574, \uC804\uD22C\uB825",
      "100\uD3EC\uBCD1\uB300\uB300(K105A1) 6km \uC0AC\uACA9 \uAC00\uB2A5, HE 100R",
      "\uC720\uAC1C\uD638 \uD3EC\uC0C1 \uC0DD\uC874\uC131, \uBBFC\uAC04\uD53C\uD574 \uC5C6\uC74C"
    ],
    gisHighlights: COMMON_GIS_HIGHLIGHTS.slice(1),
    links: [
      {
        kind: "markdown",
        label: "8-1 \uCD94\uCD9C \uD14D\uC2A4\uD2B8",
        href: mdSource("8-1 \uCD5C\uC801\uC758 \uC0AC\uACA9\uBD80\uB300 \uC120\uC815 \uD310\uB2E8 \uC790\uB8CC")
      }
    ]
  },
  9: {
    scenarioId: 9,
    sourceRefs: ["9-1", "NGII B110", "senario.pdf #9"],
    sourceFiles: [
      "9-1 \uC0AC\uD0DC\uBD84\uC11D\uB3C4 \uBC0F \uB3C4\uB85C\uC815\uBCF4",
      "ngii-a2-link-roads.geojson",
      "road-summary.json"
    ],
    dataPoints: [
      "\uC608\uC0C1 \uC774\uB3D9\uB85C: 3\uBC88 \uB3C4\uB85C[70%]",
      "1\uBC88 \uB3C4\uB85C 10%, 3\uBC88 \uB3C4\uB85C 70%, 5\uBC88 \uB3C4\uB85C 20%",
      "\uAC10\uC2DC 2 \xB7 \uACB0\uC2EC 2 \xB7 \uD0C0\uACA9 2 \uD310\uB2E8"
    ],
    gisHighlights: ROAD_GIS_HIGHLIGHTS,
    links: [
      {
        kind: "image",
        label: "9-1 \uC0AC\uD0DC\uBD84\uC11D\uB3C4",
        href: slideAsset("9-1 \uC0AC\uD0DC\uBD84\uC11D\uB3C4 \uBC0F \uB3C4\uB85C\uC815\uBCF4", 1)
      },
      {
        kind: "gis",
        label: "\uB3C4\uB85C \uC694\uC57D JSON",
        href: sudoAsset2("gis/processed/situation-analysis/road-summary.json")
      }
    ]
  },
  10: {
    scenarioId: 10,
    sourceRefs: ["9-1", "senario.pdf #10"],
    sourceFiles: ["9-1 \uC0AC\uD0DC\uBD84\uC11D\uB3C4 \uBC0F \uB3C4\uB85C\uC815\uBCF4", "droneRedeploymentOrders"],
    dataPoints: [
      "1\uBC88 \uB4DC\uB860 TAI #3 \uC465\uACE0\uAC1C",
      "2\uBC88 \uB4DC\uB860 NAI #4 \uB9D0\uACE0\uAC1C",
      "3\uBC88 \uB4DC\uB860 TAI #4 \uB2F9\uB3D9\uB9AC"
    ],
    gisHighlights: ROAD_GIS_HIGHLIGHTS,
    links: [
      {
        kind: "gis",
        label: "\uB3C4\uB85C GeoJSON",
        href: sudoAsset2(
          "gis/processed/situation-analysis/ngii-a2-link-roads.geojson"
        )
      }
    ]
  },
  11: {
    scenarioId: 11,
    sourceRefs: ["senario.pdf #11", "page 06 OCR"],
    sourceFiles: [
      SUDO_FIRE_PLAN_SOURCE_NAME,
      "PDF \uC6D0\uBCF8 \uC791\uC131\uC911 - \uC571 \uBCF4\uAC15 DATA",
      `\uAC00\uC6A9\uC790\uC0B0 \uC6D0\uBCF8\uC2DC\uAC04\uD45C ${SUDO_STRIKE_ASSET_SOURCE_ROWS.length}\uD589`,
      `\uCD5C\uC801 \uD0C0\uACA9\uBC29\uBC95 \uC6D0\uBCF8\uADFC\uAC70 ${SUDO_STRIKE_METHOD_SOURCE_ROWS.length}\uD589`
    ],
    dataPoints: [
      "PDF \uC6D0\uBCF8 \uC791\uC131\uC911 \uAE30\uC900, \uC2DC\uC5F0\uC6A9 \uBCF4\uAC15 DATA\uB85C \uC0B0\uCD9C",
      `${SUDO_PRIMARY_STRIKE_ASSET.asset} ${SUDO_PRIMARY_STRIKE_ASSET.availableFrom}~${SUDO_PRIMARY_STRIKE_ASSET.availableTo}, CAS(2\uCC28) 14:00~15:00`,
      "\uC721\uAD70\uD56D\uACF5 12:00 \uC774\uD6C4, \uD3EC\uBCD1 24\uC2DC\uAC04",
      `${SUDO_PRIMARY_STRIKE_METHOD.rank} ${SUDO_PRIMARY_STRIKE_METHOD.method}, ${SUDO_PRIMARY_STRIKE_METHOD.tai}, H\uC2DC ${SUDO_PRIMARY_STRIKE_METHOD.hTime}, ${SUDO_PRIMARY_STRIKE_METHOD.dp}`,
      "\uC6D0\uBCF8 \uAC00\uC6A9\uC2DC\uAC04\uD45C\uC640 \uCD5C\uC801 \uD0C0\uACA9\uBC29\uBC95 \uC6D0\uBB38\uADFC\uAC70\uB97C H\uC2DC 11:00 \uC2DC\uAC04\uCD95 \uC694\uC57D\uC73C\uB85C \uC5F0\uACB0"
    ],
    gisHighlights: ROAD_GIS_HIGHLIGHTS.slice(0, 1),
    links: [
      {
        kind: "markdown",
        label: "senario.pdf OCR",
        href: mdSource("senario")
      }
    ]
  },
  12: {
    scenarioId: 12,
    sourceRefs: ["senario.pdf #12", "page 06 OCR"],
    sourceFiles: [
      SUDO_FIRE_PLAN_SOURCE_NAME,
      "PDF \uC6D0\uBCF8 \uC791\uC131\uC911 - \uC571 \uBCF4\uAC15 DATA",
      `\uD1B5\uD569\uD654\uB825\uC6B4\uC6A9\uB3C4\uD45C \uC6D0\uBCF8\uADFC\uAC70 ${SUDO_FIRE_PLAN_SOURCE_ROWS.length}\uD589`,
      "scenario_6_1 page_06"
    ],
    dataPoints: [
      "PDF \uC6D0\uBCF8 \uC791\uC131\uC911 \uAE30\uC900, \uC2DC\uC5F0\uC6A9 \uBCF4\uAC15 DATA\uB85C \uC0B0\uCD9C",
      `\uD1B5\uD569\uD654\uB825\uC6B4\uC6A9 H\uC2DC ${SUDO_PRIMARY_STRIKE_METHOD.hTime}`,
      `${SUDO_FIRE_PLAN_SOURCE_ROWS[0].time}~${SUDO_FIRE_PLAN_SOURCE_ROWS[2].time} \uD3EC\uD568, ${SUDO_FIRE_PLAN_SOURCE_ROWS.length}\uAC1C \uD654\uB825\uC6B4\uC6A9 \uD589`,
      `${SUDO_PRIMARY_FIRE_PLAN_ROW.asset}: ${SUDO_PRIMARY_FIRE_PLAN_ROW.action} / ${SUDO_PRIMARY_FIRE_PLAN_ROW.effect}`,
      "\uD1B5\uD569\uD654\uB825\uC6B4\uC6A9\uB3C4\uD45C \uC6D0\uBCF8\uADFC\uAC70 5\uD589\uC744 H-10~H+30 \uB808\uC778 \uC694\uC57D\uC73C\uB85C \uC5F0\uACB0",
      "NAI, DP, TAI\uC640 \uD0C0\uACA9\uC790\uC0B0 \uBC30\uCE58"
    ],
    links: [
      {
        kind: "image",
        label: "\uD1B5\uD569\uD654\uB825\uC6B4\uC6A9\uB3C4\uD45C figure",
        href: scenarioAsset3("figures/page_06_figure_08_xref_152.png")
      }
    ]
  },
  13: {
    scenarioId: 13,
    sourceRefs: ["ARTAS", "artas program.pdf"],
    sourceFiles: ["artas program.pdf", "ARTAS \uB300\uD3EC\uBCD1\uD0D0\uC9C0 R/D \uD45C\uC801\uD0D0\uC9C0 \uBD84\uC11D"],
    dataPoints: [
      "AA001 / TPQ-74K 1\uBC18 \uAE30\uC220\uC801 \uD310\uB2E8: \uD5C8\uC0C1\uD45C\uC801 78%",
      "\uD0C4\uB3C4\uACE1\uC120 \uB04A\uAE40, \uB808\uC774\uB354 \uC608\uC0C1\uC815\uD655\uB3C4 300m \uCD08\uACFC, \uCD94\uC801\uD69F\uC218 7\uD68C",
      "\uC12C\uAD11\xB7\uD3ED\uC74C \uC5C6\uC74C, MASINT \uC5C6\uC74C, TOD \uC601\uC0C1\uBCF5\uADC0 \uC5C6\uC74C",
      "\uC885\uD569 \uD5C8\uC0C1\uD45C\uC801 99%"
    ],
    links: [
      {
        kind: "markdown",
        label: "artas program.pdf \uADFC\uAC70",
        href: mdSource("artas program")
      },
      {
        kind: "markdown",
        label: "ARTAS \uD45C\uC801\uD0D0\uC9C0 \uBD84\uC11D",
        href: mdSource("artas program")
      }
    ]
  },
  14: {
    scenarioId: 14,
    sourceRefs: ["dan_level_Senario.pdf #13", "BDA \uC785\uB825", "page 06 figure"],
    sourceFiles: [
      SUDO_BDA_SOURCE_NAME,
      `\uD0C0\uACA9\uACB0\uACFC \uD3C9\uAC00 figure ${SUDO_BDA_FIGURE_ID}`,
      SUDO_BDA_SOURCE_PATH
    ],
    dataPoints: [
      "\uCD5C\uCD08 \uC124\uC815\uD55C \uC694\uB9DD\uD6A8\uACFC\uB294 30%",
      "\uC804\uCC28 1\uB300 \uC644\uD30C, \uBCD1\uB825 5\uBA85 \uC2DD\uBCC4",
      "\uD604\uC7AC \uC694\uB9DD\uD6A8\uACFC \uBBF8\uB2EC\uC131\uC73C\uB85C \uC7AC\uD0C0\uACA9 \uD544\uC694",
      "page_06_figure_10_xref_154\uC640 DRONE-10 frame_02_37\uC744 \uC785\uB825 DATA/\uAD00\uCE21 \uD504\uB808\uC784 \uADFC\uAC70\uB85C \uBCD1\uB82C \uD45C\uC2DC",
      "DRONE-10 \uC7AC\uAD00\uCE21\uACFC AI \uC601\uC0C1\uD310\uB3C5 \uACB0\uACFC\uB97C BDA \uC785\uB825\uC73C\uB85C \uC5F0\uACB0"
    ],
    gisHighlights: COMMON_GIS_HIGHLIGHTS.slice(0, 2),
    links: [
      {
        kind: "image",
        label: "\uD0C0\uACA9\uACB0\uACFC \uD3C9\uAC00 figure",
        href: scenarioAsset3("figures/page_06_figure_10_xref_154.png")
      },
      {
        kind: "image",
        label: "DRONE-10 BDA \uAD00\uCE21 \uD504\uB808\uC784",
        href: sudoAsset2(
          "_extracted/assets/1-1 \uC7A5\uB3C4\uD6C8\uB828\uC7A5 \uAE30\uB3D9(1)/video_frames/frame_02_37.png"
        )
      }
    ]
  }
};
function uniqueByHref(links) {
  const seen = /* @__PURE__ */ new Set();
  return links.filter((link) => {
    const key = `${link.kind}:${link.href}:${link.label}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}
function getSudoScenarioEnhancementIdeas(scenarioId) {
  return SUDO_DATA_ENHANCEMENT_IDEAS.filter(
    (idea) => idea.scenarioIds.includes(scenarioId)
  );
}
function getSudoDataEnhancementIdeaStatusLabel(status) {
  if (status === "implemented") {
    return "\uBC18\uC601";
  }
  if (status === "ready") {
    return "\uC900\uBE44";
  }
  return "\uB2E4\uC74C";
}
function formatSudoDataEnhancementIdea(idea) {
  return `${getSudoDataEnhancementIdeaStatusLabel(idea.status)} \xB7 ${idea.title}`;
}
function buildSudoDataEnhancementIdeaSummary(ideas, limit = 5) {
  const sortedIdeas = sortSudoDataEnhancementIdeas(ideas);
  const visible = sortedIdeas.slice(0, limit).map(formatSudoDataEnhancementIdea);
  const hidden = sortedIdeas.length - visible.length;
  return [...visible, ...hidden > 0 ? [`+${hidden}\uAC74`] : []].join(" | ");
}
function getSudoScenarioDataIntel(scenarioId) {
  const reference = getSudoScenarioReference(scenarioId);
  const imageEvidence = getSudoScenarioImageEvidence(scenarioId);
  const seed = SUDO_SCENARIO_DATA_INTEL[scenarioId] ?? {
    scenarioId,
    sourceRefs: [`senario.pdf #${scenarioId}`],
    sourceFiles: ["senario.pdf"],
    dataPoints: reference?.bullets ?? []
  };
  const referenceLinks = reference?.images.map((image) => ({
    kind: "image",
    label: image.label,
    href: image.src
  })) ?? [];
  return {
    scenarioId,
    sourceRefs: seed.sourceRefs,
    sourceFiles: seed.sourceFiles,
    dataPoints: seed.dataPoints,
    gisHighlights: seed.gisHighlights ?? [],
    links: uniqueByHref([...seed.links ?? [], ...referenceLinks]),
    enhancementIdeas: getSudoScenarioEnhancementIdeas(scenarioId),
    imageEvidence
  };
}
function buildSudoScenarioDataIntelPromptLines(scenarioId) {
  const intel = getSudoScenarioDataIntel(scenarioId);
  return [
    "sudo_data \uC6D0\uC790\uB8CC \uC5F0\uACB0:",
    `- \uC81C\uACF5\uC790\uB8CC: ${summarizeSudoSourceDisplayValues(intel.sourceRefs, 99, ", ")}`,
    `- \uC2E4\uC81C \uD30C\uC77C: ${summarizeSudoSourceDisplayValues(intel.sourceFiles, 4)}`,
    ...intel.dataPoints.slice(0, 5).map((point) => `- \uD310\uB2E8\uADFC\uAC70: ${formatSudoSourceDisplayLabel(point)}`),
    ...intel.gisHighlights.slice(0, 2).map((point) => `- GIS: ${formatSudoSourceDisplayLabel(point)}`),
    ...buildSudoDataExtractionPromptLines(),
    `- \uACE0\uB3C4\uD654: ${buildSudoDataEnhancementIdeaSummary(
      getCoreSudoDataEnhancementIdeas(intel.enhancementIdeas),
      4
    )}`
  ];
}
function buildSudoScenarioDataIntelCopyText(intel, sourceStage, decisionBindings = [], inputPatchSuggestions = []) {
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
    ...intel.gisHighlights.length > 0 ? intel.gisHighlights.map(
      (point) => `- ${formatSudoSourceDisplayLabel(point)}`
    ) : ["- GIS \uC5F0\uACB0 \uC5C6\uC74C"],
    "",
    "## Source Stage",
    ...sourceStage ? [
      `- stage: ${sourceStage.id}. ${sourceStage.title}`,
      sourceStage.timeBand ? `- time-band: ${sourceStage.timeBand}` : "",
      sourceStageImplementationLevel ? `- implementation-level: ${sourceStageImplementationLevel}` : "",
      ...sourceStage.requirements.map(
        (requirement) => `- requirement: ${requirement}`
      ),
      sourceStage.codeAction ? `- code-action: ${formatSudoSourceDisplayLabel(sourceStage.codeAction)}` : ""
    ].filter(Boolean) : ["- structured_scenario_6_1.json \uC544\uC9C1 \uB85C\uB4DC\uB418\uC9C0 \uC54A\uC74C"],
    "",
    "## Decision Bindings",
    ...decisionBindings.length > 0 ? decisionBindings.map(
      (binding) => `- [${binding.status}] ${binding.label}: ${binding.detail} (${formatSudoSourceDisplayLabel(binding.basis)})`
    ) : ["- \uACC4\uC0B0 \uC5F0\uACB0 \uCD94\uC801 \uC5C6\uC74C"],
    "",
    "## Source Input Patches",
    ...inputPatchSuggestions.length > 0 ? inputPatchSuggestions.map(
      (suggestion) => `- [${suggestion.status}] ${suggestion.field}: ${suggestion.currentValue} -> ${suggestion.recommendedValue} (${formatSudoSourceDisplayLabel(suggestion.basis)})`
    ) : ["- \uC6D0\uC790\uB8CC \uC785\uB825 \uD328\uCE58 \uC81C\uC548 \uC5C6\uC74C"],
    "",
    "## Extraction Health",
    `- summary: ${buildSudoDataExtractionHealthSummary()}`,
    `- roles: ${buildSudoDataExtractionRoleSummary()}`,
    `- issues: ${buildSudoDataExtractionIssueSummary()}`,
    "",
    "## Enhancement Ideas",
    ...getCoreSudoDataEnhancementIdeas(intel.enhancementIdeas).length > 0 ? sortSudoDataEnhancementIdeas(
      getCoreSudoDataEnhancementIdeas(intel.enhancementIdeas)
    ).map(
      (idea) => `- [${idea.status}] ${idea.id}: ${formatSudoDataEnhancementIdea(idea)}: ${formatSudoSourceDisplayLabel(idea.basis)}`
    ) : ["- \uACE0\uB3C4\uD654 \uC544\uC774\uB514\uC5B4 \uC5C6\uC74C"],
    "",
    "## Links",
    ...intel.links.map(
      (link) => `- [${link.kind}] ${formatSudoSourceDisplayLabel(link.label)}: ${link.href}`
    )
  ].join("\n");
}

// js/vendor/kairos/src/gui/sudo/sudoOrderCandidateIntel.ts
var SUDO_ORDER_CANDIDATE_SOURCE_NAME = "4-1 \uD6C8\uB828\uC7A5 \uC778\uADFC\uBD80\uB300 \uC704\uCE58, \uBCF4\uC720 \uC7A5\uBE44 \uB4F1";
var SUDO_ORDER_CANDIDATE_SOURCE_ROWS = [
  {
    targetCoordinate: "BH 12345 67890",
    coordinate: "BH 12346 67899",
    distanceM: 51,
    unit: "2\uC0AC\uB2E8 3\uB300\uB300 1\uC911\uB300",
    weapon: "152mm \uC790\uC8FC\uD3EC",
    equipment: "\uD654\uD3EC 5\uBB38, \uD2B8\uB7ED 4\uB300",
    guns: 5,
    sourceRank: "2",
    directionMatchPercent: 82
  },
  {
    targetCoordinate: "BH 12345 67890",
    coordinate: "BH 12415 67915",
    distanceM: 106,
    unit: "1\uC0AC\uB2E8 1\uB300\uB300 2\uC911\uB300",
    weapon: "240mm \uBC29\uC0AC\uD3EC",
    equipment: "\uBC29\uC0AC\uD3EC 4\uBB38, \uD2B8\uB7ED 4\uB300",
    guns: 4,
    sourceRank: "1",
    directionMatchPercent: 99
  },
  {
    targetCoordinate: "BH 12345 67890",
    coordinate: "BH 13143 68541",
    distanceM: 2013,
    unit: "1\uC0AC\uB2E8 2\uB300\uB300 1\uC911\uB300",
    weapon: "240mm \uBC29\uC0AC\uD3EC",
    equipment: "\uBC29\uC0AC\uD3EC 4\uBB38, \uD2B8\uB7ED 4\uB300",
    guns: 4,
    sourceRank: "3",
    directionMatchPercent: 62
  },
  {
    targetCoordinate: "BH 12345 67890",
    coordinate: "BH 12918 69031",
    distanceM: 847,
    unit: "2\uC0AC\uB2E8 1\uB300\uB300 3\uC911\uB300",
    weapon: "152mm \uC790\uC8FC\uD3EC",
    equipment: "\uD654\uD3EC 5\uBB38, \uD2B8\uB7ED 4\uB300",
    guns: 5,
    sourceRank: "4",
    directionMatchPercent: 58
  },
  {
    targetCoordinate: "BH 12345 67890",
    coordinate: "BH 14531 66741",
    distanceM: 1313,
    unit: "3\uC0AC\uB2E8 2\uB300\uB300 1\uC911\uB300",
    weapon: "122mm \uC790\uC8FC\uD3EC",
    equipment: "\uD654\uD3EC 3\uBB38, \uD2B8\uB7ED 3\uB300",
    guns: 3,
    sourceRank: "5",
    directionMatchPercent: 52
  },
  {
    targetCoordinate: "BH 12345 67890",
    coordinate: "BH 16531 67741",
    distanceM: 3053,
    unit: "1\uC0AC\uB2E8 \uC804\uCC28\uC911\uB300",
    weapon: "\uC804\uCC28",
    equipment: "\uC804\uCC28 8\uB300",
    guns: 8,
    sourceRank: "\uC81C\uC678",
    directionMatchPercent: 12
  },
  {
    targetCoordinate: "BH 12345 67890",
    coordinate: "BH 16531 68741",
    distanceM: 3371,
    unit: "1\uC0AC\uB2E8 K61 \uC911\uB300",
    weapon: "K61",
    equipment: "K61 20\uB300",
    guns: 20,
    sourceRank: "\uC81C\uC678",
    directionMatchPercent: 8
  },
  {
    targetCoordinate: "BH 12345 67890",
    coordinate: "BH 15531 69741",
    distanceM: 4044,
    unit: "3\uAD70\uB2E8 \uBD80\uAD50\uC911\uB300",
    weapon: "S\uD615 \uBD80\uC8FC",
    equipment: "S\uD615 \uBD80\uC8FC 50\uAC1C, \uD2B8\uB7ED 15\uB300",
    guns: 50,
    sourceRank: "\uC81C\uC678",
    directionMatchPercent: 5
  },
  {
    targetCoordinate: "BH 12345 67890",
    coordinate: "BH 15631 68841",
    distanceM: 3873,
    unit: "57mm \uACE0\uC0AC\uD3EC \uC911\uB300",
    weapon: "57mm \uACE0\uC0AC\uD3EC",
    equipment: "\uACE0\uC0AC\uD3EC 5\uBB38, \uD2B8\uB7ED 5\uB300",
    guns: 5,
    sourceRank: "\uC81C\uC678",
    directionMatchPercent: 8
  },
  {
    targetCoordinate: "BH 12345 67890",
    coordinate: "BH 15838 66941",
    distanceM: 4215,
    unit: "37mm \uACE0\uC0AC\uD3EC \uC911\uB300",
    weapon: "37mm \uACE0\uC0AC\uD3EC",
    equipment: "\uACE0\uC0AC\uD3EC 5\uBB38, \uD2B8\uB7ED 5\uB300",
    guns: 5,
    sourceRank: "\uC81C\uC678",
    directionMatchPercent: 8
  },
  {
    targetCoordinate: "BH 12345 67890",
    coordinate: "BH 17221 62741",
    distanceM: 4116,
    unit: "14.5mm \uACE0\uC0AC\uCD1D \uC911\uB300",
    weapon: "14.5mm \uACE0\uC0AC\uCD1D",
    equipment: "\uACE0\uC0AC\uCD1D 6\uBB38, \uD2B8\uB7ED 6\uB300",
    guns: 6,
    sourceRank: "\uC81C\uC678",
    directionMatchPercent: 8
  }
];
function formatSudoOrderDistance(distanceM) {
  return `${new Intl.NumberFormat("ko-KR").format(distanceM)}m`;
}
function buildSudoOrderCandidateSourceTable() {
  return {
    title: "4-1 \uC804\uD22C\uC11C\uC5F4 \uD6C4\uBCF4 \uC6D0\uBCF8\uD45C",
    columns: [
      { key: "targetCoordinate", label: "\uD45C\uC801\uC88C\uD45C" },
      { key: "coordinate", label: "\uCD5C\uAE30\uBD80\uB300 \uC801 \uC704\uCE58" },
      { key: "distance", label: "\uC774\uACA9\uAC70\uB9AC" },
      { key: "unit", label: "\uC804\uD22C\uC11C\uC5F4" },
      { key: "equipment", label: "\uBCF4\uC720\uC7A5\uBE44 \uBC0F \uC218\uB7C9" },
      { key: "sourceRank", label: "\uD310\uC815\uC21C\uC704" }
    ],
    rows: SUDO_ORDER_CANDIDATE_SOURCE_ROWS.map((row) => ({
      targetCoordinate: row.targetCoordinate,
      coordinate: row.coordinate,
      distance: formatSudoOrderDistance(row.distanceM),
      unit: `${row.unit} ${row.weapon}`,
      equipment: row.equipment,
      sourceRank: row.sourceRank
    }))
  };
}

// js/vendor/kairos/src/gui/sudo/sudoFiringUnitIntel.ts
var SUDO_FIRING_UNIT_SOURCE_NAME = "8-1 \uCD5C\uC801\uC758 \uC0AC\uACA9\uBD80\uB300 \uC120\uC815 \uD310\uB2E8 \uC790\uB8CC";
var SUDO_FIRING_UNIT_SOURCE_PATH = "client/public/sudo_data/md/sources/8-1 \uCD5C\uC801\uC758 \uC0AC\uACA9\uBD80\uB300 \uC120\uC815 \uD310\uB2E8 \uC790\uB8CC.md";
var SUDO_FIRING_UNIT_SOURCE_ROWS = [
  {
    unit: "669\uD3EC\uBCD1\uB300\uB300(K9)",
    weapon: "K9",
    distanceKm: 32,
    maxRangeKm: 40,
    rangeJudgment: "32km(\uC0AC\uACA9\uAC00\uB2A5)",
    rangePossible: true,
    survival: "\uBD88\uAC00\uB2A5",
    survivalGuaranteed: false,
    ammoSummary: "HE 30R / HEBB 12R",
    heRounds: 30,
    csr: 88,
    civilianImpact: "\uBBFC\uAC00 2\uC138\uB300 \uD53C\uD574 \uAC00\uB2A5",
    civilianSafe: false,
    combatStatus: "\uC0AC\uACA9 \uAC00\uB2A5",
    combatReady: true,
    status: "\uAC00\uB2A5",
    sourceCase: "#1. 100\uD3EC\uBCD1\uB300\uB300(K105A1) \uC0AC\uACA9 \uC2DC"
  },
  {
    unit: "602\uD3EC\uBCD1\uB300\uB300(K55A1)",
    weapon: "K55A1",
    distanceKm: 36,
    maxRangeKm: 30,
    rangeJudgment: "36km(\uC0AC\uACA9\uBD88\uAC00\uB2A5)",
    rangePossible: false,
    survival: "\uAC00\uB2A5",
    survivalGuaranteed: true,
    ammoSummary: "HE 30R / HEBB 40R",
    heRounds: 30,
    csr: 82,
    civilianImpact: "\uBBFC\uAC00 3\uC138\uB300 \uD53C\uD574 \uAC00\uB2A5",
    civilianSafe: false,
    combatStatus: "\uC0AC\uACA9 \uBD88\uAC00",
    combatReady: false,
    status: "\uAC00\uB2A5",
    sourceCase: "#1. 100\uD3EC\uBCD1\uB300\uB300(K105A1) \uC0AC\uACA9 \uC2DC"
  },
  {
    unit: "\uD3EC5\uB300\uB300(K55A1)",
    weapon: "K55A1",
    distanceKm: 33,
    maxRangeKm: 30,
    rangeJudgment: "33km(\uC0AC\uACA9\uBD88\uAC00\uB2A5)",
    rangePossible: false,
    survival: "\uBD88\uAC00\uB2A5",
    survivalGuaranteed: false,
    ammoSummary: "HE 50R / HEBB 60R",
    heRounds: 50,
    csr: 80,
    civilianImpact: "\uBBFC\uAC00 2\uC138\uB300 \uD53C\uD574 \uAC00\uB2A5",
    civilianSafe: false,
    combatStatus: "\uC0AC\uACA9 \uAC00\uB2A5",
    combatReady: true,
    status: "\uAC00\uB2A5",
    sourceCase: "#1. 100\uD3EC\uBCD1\uB300\uB300(K105A1) \uC0AC\uACA9 \uC2DC"
  },
  {
    unit: "100\uD3EC\uBCD1\uB300\uB300(K105A1)",
    weapon: "K105A1",
    distanceKm: 6,
    maxRangeKm: 11,
    rangeJudgment: "6km(\uC0AC\uACA9\uAC00\uB2A5)",
    rangePossible: true,
    survival: "\uAC00\uB2A5",
    survivalGuaranteed: true,
    ammoSummary: "HE 100R / DP-ICM 100R",
    heRounds: 100,
    csr: 92,
    civilianImpact: "\uBBFC\uAC00 \uD53C\uD574 \uC5C6\uC74C",
    civilianSafe: true,
    combatStatus: "\uC0AC\uACA9 \uAC00\uB2A5",
    combatReady: true,
    status: "\uAC00\uB2A5",
    sourceCase: "#1. 100\uD3EC\uBCD1\uB300\uB300(K105A1) \uC0AC\uACA9 \uC2DC"
  },
  {
    unit: "101\uC5EC\uB2E8 4.2\uC778\uCE58 \uBC15\uACA9\uD3EC",
    weapon: "4.2\uC778\uCE58 \uBC15\uACA9\uD3EC",
    distanceKm: 8,
    maxRangeKm: 6,
    rangeJudgment: "8km(\uC0AC\uACA9\uBD88\uAC00\uB2A5)",
    rangePossible: false,
    survival: "\uBD88\uAC00\uB2A5",
    survivalGuaranteed: false,
    ammoSummary: "HE 100R / DPBB 70R",
    heRounds: 100,
    csr: 76,
    civilianImpact: "\uBBFC\uAC00 \uD53C\uD574 \uC5C6\uC74C",
    civilianSafe: true,
    combatStatus: "\uC0AC\uACA9 \uBD88\uAC00\uB2A5",
    combatReady: false,
    status: "\uAC00\uB2A5",
    sourceCase: "#1. 100\uD3EC\uBCD1\uB300\uB300(K105A1) \uC0AC\uACA9 \uC2DC"
  }
];
function buildSudoFiringUnitDecisionInputs() {
  return SUDO_FIRING_UNIT_SOURCE_ROWS.map((row) => ({
    unit: row.unit,
    ammo: row.heRounds,
    csr: row.csr,
    distanceKm: row.distanceKm,
    maxRangeKm: row.maxRangeKm,
    status: row.status,
    rangeJudgment: row.rangeJudgment.replace(/[()]/g, " "),
    survival: row.survival,
    survivalGuaranteed: row.survivalGuaranteed,
    ammoSummary: row.ammoSummary,
    civilianImpact: row.civilianImpact,
    civilianSafe: row.civilianSafe,
    combatStatus: row.combatStatus,
    combatReady: row.combatReady
  }));
}
function buildSudoFiringUnitSourceTable() {
  return {
    title: "8-1 \uCD5C\uC801 \uC0AC\uACA9\uBD80\uB300 \uC6D0\uBCF8 \uD3C9\uAC00\uD45C",
    columns: [
      { key: "unit", label: "\uD6C4\uBCF4\uBD80\uB300" },
      { key: "range", label: "\uC0AC\uAC70\uB9AC" },
      { key: "survival", label: "\uC0DD\uC874\uC131\uBCF4\uC7A5" },
      { key: "ammo", label: "\uD0C4\uBCF4\uC720\uB7C9" },
      { key: "civilian", label: "\uBBFC\uAC04\uD53C\uD574" },
      { key: "combat", label: "\uC804\uD22C\uB825\uC218\uC900" },
      { key: "source", label: "\uCD9C\uCC98" }
    ],
    rows: SUDO_FIRING_UNIT_SOURCE_ROWS.map((row) => ({
      unit: row.unit,
      range: row.rangeJudgment,
      survival: row.survival,
      ammo: row.ammoSummary,
      civilian: row.civilianImpact,
      combat: row.combatStatus,
      source: `${SUDO_FIRING_UNIT_SOURCE_NAME} ${row.sourceCase}`
    }))
  };
}

// js/vendor/kairos/src/gui/sudo/sudoTargetClassificationIntel.ts
var SUDO_TARGET_CLASSIFICATION_SOURCE_NAME = "2-5 \uAC1D\uCCB4\uC778\uC2DD / 2-6 \uCC9C\uBB34 \uCC38\uACE0\uC790\uB8CC / 2-7 \uCC9C\uBB34 \uAD50\uC721\uC790\uB8CC";
var SUDO_TARGET_CLASSIFICATION_EVIDENCE_ROWS = [
  {
    basis: "\uC804\uD3ED/\uC804\uC7A5 \uC81C\uC6D0",
    observed: "\uC804\uC7A5 \uC57D 9.0m, \uC804\uD3ED \uC57D 2.9m\uAE09 \uCC28\uB95C\uD615 \uBC1C\uC0AC\uB300 \uC81C\uC6D0\uACFC \uBD80\uD569",
    grade: "\uBD80\uD569",
    source: "2-6 page 3 / 2-7 slide 5"
  },
  {
    basis: "\uBC1C\uC0AC\uAD00 \uBC30\uC5F4",
    observed: "\uC0C1\uBD80 \uB2E4\uB828\uC7A5 \uD3EC\uB4DC\uC640 22\uC5F0\uC7A5 \uACC4\uC5F4 \uBC1C\uC0AC\uAD00 \uAD70\uC9D1 \uD615\uC0C1 \uD655\uC778",
    grade: "M-1991",
    source: "2-5 \uAC1D\uCCB4\uC778\uC2DD / 2-7 slide 11"
  },
  {
    basis: "\uC774\uB3D9\uC18D\uB3C4/\uAE30\uB3D9\uBC29\uC2DD",
    observed: "\uCC28\uB95C\uD615 8x8 TEL, \uCD5C\uACE0\uC18D\uB3C4 80km/h\uAE09 \uC6B4\uC6A9 \uC81C\uC6D0\uACFC \uB9E4\uCE6D",
    grade: "\uBD80\uD569",
    source: "2-6 page 3 / 2-7 slide 5"
  },
  {
    basis: "\uC6B4\uC804\uC11D/\uCC28\uB7C9\uD6C4\uBBF8",
    observed: "\uC804\uBC29 \uBC29\uD638\uD615 \uCEA1\uACFC \uD6C4\uBC29 \uBC1C\uC0AC\uB300 \uAD6C\uC870\uAC00 \uCC38\uC870 \uD615\uC0C1\uACFC \uC77C\uCE58",
    grade: "\uBD80\uD569",
    source: "2-4 \uD615\uC0C1\uC790\uB8CC / 2-7 slide 6"
  },
  {
    basis: "\uBC1C\uC0AC\uAD00 \uC55E \uC801\uC7AC\uB300/\uC0AC\uC218\uC758\uC790",
    observed: "\uBC1C\uC0AC\uB300 \uC0C1\uBD80 \uBCF4\uC870 \uAD6C\uC870\uBB3C\uACFC \uC0AC\uACA9 \uC6B4\uC6A9\uBD80 \uC704\uCE58\uAC00 \uCC38\uC870 \uC790\uB8CC\uC640 \uBD80\uD569",
    grade: "\uBD80\uD569",
    source: "2-7 slide 6~7"
  },
  {
    basis: "\uBC15\uC2A4\uD615 \uCC28\uB7C9 \uC804\uBA74",
    observed: "\uC804\uBA74 \uBC15\uC2A4\uD615 \uCEA1\uACFC \uB300\uD615 \uCC28\uCCB4 \uBE44\uC728\uC774 M-1991 \uD6C4\uBCF4\uC640 \uC77C\uCE58",
    grade: "\uBD80\uD569",
    source: "2-5 \uAC1D\uCCB4\uC778\uC2DD \uD504\uB808\uC784"
  },
  {
    basis: "ROMAN \uCC28\uB300",
    observed: "\uCC28\uB95C\uD615 TEL \uCC28\uB300\uC640 \uD6C4\uBC29 \uBC1C\uC0AC\uB300 \uD0D1\uC7AC \uD615\uD0DC\uAC00 ROMAN \uCC28\uB300 \uACC4\uC5F4\uB85C \uD310\uB3C5",
    grade: "\uBD80\uD569",
    source: "2-4 \uD615\uC0C1\uC790\uB8CC / 2-5 \uAC1D\uCCB4\uC778\uC2DD"
  }
];
var SUDO_TARGET_CLASSIFICATION_MEDIA_ROWS = [
  {
    id: "chunmoo-intro",
    sourceFile: "2-1 \uCC9C\uBB34 \uC18C\uAC1C\uC601\uC0C1.wmv",
    sourceKind: "video",
    role: "\uD615\uC0C1/\uAE30\uB3D9",
    cue: "00:53 frame",
    assetStatus: "\uBE0C\uB77C\uC6B0\uC800 \uC7AC\uC0DD",
    playbackPath: "/sudo_data/converted/2-1-chunmoo-intro.mp4",
    evidence: "\uCC28\uB95C\uD615 8x8 \uBC1C\uC0AC\uB300\uC640 \uC81C\uC6D0 \uD615\uC0C1 \uB300\uC870"
  },
  {
    id: "chunmoo-fire-1",
    sourceFile: "2-2 \uCC9C\uBB34 \uC0AC\uACA9\uC601\uC0C11.wmv",
    sourceKind: "video",
    role: "\uC0AC\uACA9\uD615\uC0C1",
    cue: "00:30 frame",
    assetStatus: "\uBE0C\uB77C\uC6B0\uC800 \uC7AC\uC0DD",
    playbackPath: "/sudo_data/converted/2-2-chunmoo-fire-1.mp4",
    evidence: "\uB2E4\uB828\uC7A5 \uBC1C\uC0AC\uB300 \uC6B4\uC6A9 \uC7A5\uBA74 \uB300\uC870"
  },
  {
    id: "chunmoo-fire-2",
    sourceFile: "2-3 \uCC9C\uBB34 \uC0AC\uACA9\uC601\uC0C12.wmv",
    sourceKind: "video",
    role: "\uC0AC\uACA9\uD615\uC0C1",
    cue: "\uC6D0\uBCF8 \uC601\uC0C1",
    assetStatus: "\uBE0C\uB77C\uC6B0\uC800 \uC7AC\uC0DD",
    playbackPath: "/sudo_data/converted/2-3-chunmoo-fire-2.mp4",
    evidence: "\uC0AC\uACA9 \uC790\uC138\uC640 \uBC1C\uC0AC\uB300 \uC0C1\uBD80 \uAD6C\uC870 \uBCF4\uC870 \uAC80\uC99D"
  },
  {
    id: "object-recognition",
    sourceFile: "2-5 \uAC1D\uCCB4\uC778\uC2DD(\uC5F0\uACB0\uD504\uB85C\uADF8\uB7A8 \uC0AC\uC9C4\uC73C\uB85C \uC7AC\uC0DD).wmv",
    sourceKind: "video",
    role: "AI \uC785\uB825",
    cue: "01:45 frame",
    assetStatus: "\uBE0C\uB77C\uC6B0\uC800 \uC7AC\uC0DD",
    playbackPath: "/sudo_data/converted/2-5-object-recognition.mp4",
    evidence: "\uD45C\uC801\uC131\uC9C8 \uBD84\uC11D \uC785\uB825 \uD504\uB808\uC784"
  },
  {
    id: "chunmoo-shape-show",
    sourceFile: "2-4 \uCC9C\uBB34\uD615\uC0C1 \uBC0F \uC0AC\uC9C4\uC790\uB8CC.show",
    sourceKind: "presentation",
    role: "\uD615\uC0C1\uADFC\uAC70",
    cue: "slide media",
    assetStatus: "\uBD80\uBD84\uCD94\uCD9C",
    playbackPath: "client/public/sudo_data/md/sources/2-4 \uCC9C\uBB34\uD615\uC0C1 \uBC0F \uC0AC\uC9C4\uC790\uB8CC.md",
    evidence: "\uC6B4\uC804\uC11D/\uCC28\uB7C9\uD6C4\uBBF8/ROMAN \uCC28\uB300 \uD615\uC0C1 \uBCF4\uC870\uADFC\uAC70"
  },
  {
    id: "chunmoo-reference-pdf",
    sourceFile: "2-6 \uCC9C\uBB34 \uCC38\uACE0\uC790\uB8CC.pdf",
    sourceKind: "pdf",
    role: "\uC81C\uC6D0\uADFC\uAC70",
    cue: "page 3",
    assetStatus: "\uBB38\uC11C\uADFC\uAC70",
    playbackPath: "client/public/sudo_data/md/sources/2-6 \uCC9C\uBB34 \uCC38\uACE0\uC790\uB8CC.md",
    evidence: "\uC804\uC7A5/\uC804\uD3ED/\uAE30\uB3D9\uC18D\uB3C4 \uC81C\uC6D0"
  },
  {
    id: "chunmoo-training-ppt",
    sourceFile: "2-7 \uCC9C\uBB34 \uAD50\uC721\uC790\uB8CC.pptx",
    sourceKind: "presentation",
    role: "\uC81C\uC6D0/\uAD6C\uC131",
    cue: "slide 5~7 / 11",
    assetStatus: "\uBB38\uC11C\uADFC\uAC70",
    playbackPath: "client/public/sudo_data/md/sources/2-7 \uCC9C\uBB34 \uAD50\uC721\uC790\uB8CC.md",
    evidence: "\uBC1C\uC0AC\uB300 \uC81C\uC6D0, \uAD6C\uC131, \uBC1C\uC0AC\uAD00 \uBC30\uC5F4 \uD310\uB2E8\uADFC\uAC70"
  }
];
function buildSudoTargetClassificationEvidenceTable() {
  return {
    title: "2\uACC4\uC5F4 \uD45C\uC801\uC131\uC9C8 \uD310\uB2E8\uADFC\uAC70 \uC6D0\uBCF8\uD45C",
    columns: [
      { key: "basis", label: "\uD310\uB2E8\uADFC\uAC70" },
      { key: "observed", label: "\uAD00\uCE21\uB0B4\uC6A9" },
      { key: "grade", label: "\uD310\uC815" },
      { key: "source", label: "\uADFC\uAC70\uC790\uB8CC" }
    ],
    rows: SUDO_TARGET_CLASSIFICATION_EVIDENCE_ROWS.map((row) => ({
      ...row
    }))
  };
}
function buildSudoTargetClassificationMediaTable() {
  return {
    title: "2\uACC4\uC5F4 \uD45C\uC801\uC131\uC9C8 \uBBF8\uB514\uC5B4 \uC790\uC0B0 \uB808\uC9C0\uC2A4\uD2B8\uB9AC",
    columns: [
      { key: "sourceFile", label: "\uC6D0\uBCF8" },
      { key: "role", label: "\uC5ED\uD560" },
      { key: "cue", label: "Cue" },
      { key: "assetStatus", label: "\uC790\uC0B0\uC0C1\uD0DC" },
      { key: "playbackPath", label: "\uC7AC\uC0DD/\uADFC\uAC70\uACBD\uB85C" },
      { key: "evidence", label: "\uAC80\uC99D\uADFC\uAC70" }
    ],
    rows: SUDO_TARGET_CLASSIFICATION_MEDIA_ROWS.map((row) => ({
      sourceFile: row.sourceFile,
      role: row.role,
      cue: row.cue,
      assetStatus: row.assetStatus,
      playbackPath: row.playbackPath,
      evidence: row.evidence
    }))
  };
}

// js/vendor/kairos/src/gui/sudo/sudoScaleIntel.ts
var SUDO_SCALE_SOURCE_NAME = "3-1 \uBD80\uB300\uBCC4 \uD589\uAD70\uC7A5\uACBD data";
var SUDO_SCALE_SOURCE_PATH = "client/public/sudo_data/md/sources/3-1 \uBD80\uB300\uBCC4 \uD589\uAD70\uC7A5\uACBD data.md";
var SUDO_SCALE_DOCTRINE_ROWS = [
  {
    unit: "240mm \uBC29\uC0AC\uD3EC \uC911\uB300",
    grade: "\uC911\uB300",
    equipment: "\uBC29\uC0AC\uD3EC 4\uBB38 / \uD2B8\uB7ED 4\uB300",
    rocketLaunchers: 4,
    trucks: 4,
    marchLengthM: 350,
    source: `${SUDO_SCALE_SOURCE_NAME} slide 1`
  },
  {
    unit: "240mm \uBC29\uC0AC\uD3EC \uB300\uB300",
    grade: "\uB300\uB300",
    equipment: "\uBC29\uC0AC\uD3EC 12\uBB38 / \uC9C0\uD504 1\uB300 / \uD2B8\uB7ED 30\uB300",
    rocketLaunchers: 12,
    jeeps: 1,
    trucks: 30,
    marchLengthM: 1500,
    source: `${SUDO_SCALE_SOURCE_NAME} slide 1`
  },
  {
    unit: "\uC804\uCC28\uC911\uB300",
    grade: "\uC911\uB300",
    equipment: "\uC804\uCC28 8\uB300",
    tanks: 8,
    marchLengthM: 300,
    source: `${SUDO_SCALE_SOURCE_NAME} slide 1`
  },
  {
    unit: "57mm \uACE0\uC0AC\uD3EC \uC911\uB300",
    grade: "\uC911\uB300",
    equipment: "\uACE0\uC0AC\uD3EC 5\uBB38 / \uD2B8\uB7ED 5\uB300",
    guns: 5,
    trucks: 5,
    marchLengthM: 220,
    source: `${SUDO_SCALE_SOURCE_NAME} slide 1`
  },
  {
    unit: "76.2mm \uACAC\uC778\uD3EC \uC911\uB300",
    grade: "\uC911\uB300",
    equipment: "\uD654\uD3EC 5\uBB38 / \uACAC\uC778\uD2B8\uB7ED 5\uB300",
    guns: 5,
    trucks: 5,
    marchLengthM: 300,
    source: `${SUDO_SCALE_SOURCE_NAME} slide 1`
  }
];
function buildSudoScaleDoctrineSourceTable() {
  return {
    title: "3-1 \uBD80\uB300\uADDC\uBAA8 \uD589\uAD70\uC7A5\uACBD \uC6D0\uBCF8\uD45C",
    columns: [
      { key: "unit", label: "\uBD80\uB300/\uD3B8\uC131" },
      { key: "equipment", label: "\uBCF4\uC720\uC7A5\uBE44" },
      { key: "length", label: "\uD589\uAD70\uC7A5\uACBD" },
      { key: "grade", label: "\uADDC\uBAA8" },
      { key: "source", label: "\uCD9C\uCC98" }
    ],
    rows: SUDO_SCALE_DOCTRINE_ROWS.map((row) => ({
      unit: row.unit,
      equipment: row.equipment,
      length: `\uC57D ${row.marchLengthM}m`,
      grade: row.grade,
      source: row.source
    }))
  };
}
function getSudoScaleDoctrineRowsForVisual() {
  return SUDO_SCALE_DOCTRINE_ROWS.map((row) => ({
    unit: row.unit,
    equipment: row.equipment,
    length: `\uC57D ${row.marchLengthM}m`,
    grade: row.grade
  }));
}

// js/vendor/kairos/src/gui/sudo/sudoRdAssessmentIntel.ts
var SUDO_RD_ASSESSMENT_SOURCE_NAME = "artas program.pdf ARTAS \uB300\uD3EC\uBCD1\uD0D0\uC9C0 R/D \uD45C\uC801\uD0D0\uC9C0";
var SUDO_RD_ASSESSMENT_SOURCE_PATH = "client/public/sudo_data/sudo_senario_ver2/artas program.pdf";
var SUDO_RD_ASSESSMENT_SOURCE_ROWS = [
  {
    area: "R/D \uC9C4\uC9C0",
    check: "ARTAS \uAE30\uC220\uC801 \uD310\uB2E8",
    observed: "\uD5C8\uC0C1\uD45C\uC801 78%",
    realCriteria: "\uC815\uC0C1 \uD0C4\uB3C4\uACE1\uC120, \uC815\uC0C1 \uB808\uC774\uB354 \uC815\uD655\uB3C4, \uCDA9\uBD84 \uCD94\uC801\uD69F\uC218",
    falseCriteria: "\uD0C4\uB3C4\uACE1\uC120 \uB04A\uAE40 / \uB808\uC774\uB354 \uC608\uC0C1\uC815\uD655\uB3C4 300m \uCD08\uACFC / \uCD94\uC801\uD69F\uC218 7\uD68C",
    grade: "\uD5C8\uC0C1 \uC9D5\uD6C4",
    responsibility: "TPQ-74K 1\uBC18",
    source: `${SUDO_RD_ASSESSMENT_SOURCE_NAME} page 1`
  },
  {
    area: "R/D \uC9C4\uC9C0",
    check: "\uD45C\uC801\uD0D0\uC9C0 \uC81C\uC6D0",
    observed: "AA001 06100900 / \uC6D0\uC810 52SCH1234512345 / \uB099\uD0C4 52SCH1254312543 / 10km",
    realCriteria: "\uC6D0\uC810-\uB099\uD0C4\uAC70\uB9AC\uC640 \uD0C4\uB3C4\uACE1\uC120 \uC77C\uAD00",
    falseCriteria: "\uD0D0\uC9C0\uC81C\uC6D0\uACFC \uD0C4\uB3C4\uACE1\uC120 \uBD88\uC77C\uCE58",
    grade: "\uD5C8\uC0C1 \uC9D5\uD6C4",
    responsibility: "TPQ-74K 1\uBC18",
    source: `${SUDO_RD_ASSESSMENT_SOURCE_NAME} page 1`
  },
  {
    area: "R/D \uC9C4\uC9C0",
    check: "\uC0AC\uACA9\uBC29\uD5A5",
    observed: "\uBD81\uC5D0\uC11C \uB0A8 \uBC29\uD5A5\uC73C\uB85C \uD310\uB3C5",
    realCriteria: "\uBD81 -> \uB0A8",
    falseCriteria: "\uBD81 -> \uBD81 / \uB0A8 -> \uBD81",
    grade: "\uD5C8\uC0C1 \uC9D5\uD6C4",
    responsibility: "R/D\uBC18, \uD3EC\uBCD1\uC5EC\uB2E8",
    source: `${SUDO_RD_ASSESSMENT_SOURCE_NAME} \u2605 \uC0AC\uACA9\uBC29\uD5A5`
  },
  {
    area: "R/D \uC9C4\uC9C0",
    check: "\uD0C4\uB3C4\uACE1\uC120 \uC774\uC0C1\uC720\uBB34",
    observed: "\uD0C4\uB3C4\uACE1\uC120\uC774 \uB04A\uAE34 \uBE44\uC815\uC0C1 \uD615\uD0DC",
    realCriteria: "\uC815\uC0C1\uC801 \uD3EC\uBB3C\uC120",
    falseCriteria: "\uBE44\uC815\uC0C1\uC801: \uBBF8\uD615\uC131, \uC77C\uC9C1\uC120, \uB04A\uAE40",
    grade: "\uD5C8\uC0C1 \uC9D5\uD6C4",
    responsibility: "R/D\uBC18, \uD3EC\uBCD1\uC5EC\uB2E8",
    source: `${SUDO_RD_ASSESSMENT_SOURCE_NAME} \u2605 \uD0C4\uB3C4\uACE1\uC120`
  },
  {
    area: "\uC9C0\uD718\uC18C",
    check: "GP/GOP\xB7\uD3EC\uBAA9\uC120 \uC804\uBC29 \uC12C\uAD11\xB7\uD3ED\uC74C",
    observed: "\uC12C\uAD11 \uBC0F \uD3ED\uC74C \uCCAD\uCDE8 \uB0B4\uC6A9 \uC5C6\uC74C",
    realCriteria: "\uC12C\uAD11\u318D\uD3ED\uC74C \uC788\uC74C",
    falseCriteria: "\uC12C\uAD11\u318D\uD3ED\uC74C \uC5C6\uC74C",
    grade: "\uD5C8\uC0C1 \uC6B0\uC138",
    responsibility: "\uAD70\uB2E8\u318D\uC0AC\uB2E8 \uC9C0\uD718\uC18C",
    source: `${SUDO_RD_ASSESSMENT_SOURCE_NAME} \u2605 \uD3EC\uBAA9\uC120 \uC804\uBC29 \uD655\uC778`
  },
  {
    area: "\uC9C0\uD718\uC18C",
    check: "\uC778\uC811 \uB300\uD3EC\uBCD1\uD0D0\uC9C0\uB808\uC774\uB354",
    observed: "\uC778\uC811 \uB300\uD3EC\uBCD1\uD0D0\uC9C0\uB808\uC774\uB354 \uBBF8\uD0D0\uC9C0",
    realCriteria: "\uC778\uC811 \uB808\uC774\uB354 \uD68D\uB4DD",
    falseCriteria: "\uC778\uC811 \uB808\uC774\uB354 \uC5C6\uC74C",
    grade: "\uD5C8\uC0C1 \uC6B0\uC138",
    responsibility: "\uAD70\uB2E8\u318D\uC0AC\uB2E8 \uC9C0\uD718\uC18C",
    source: `${SUDO_RD_ASSESSMENT_SOURCE_NAME} \u2605 \uC778\uC811 \uB808\uC774\uB354`
  },
  {
    area: "\uC9C0\uD718\uC18C",
    check: "MASINT \uCCA9\uBCF4\uD655\uC778",
    observed: "MASINT \uCCA9\uBCF4\uD655\uC778 \uACB0\uACFC \uD2B9\uC774\uC0AC\uD56D \uC5C6\uC74C",
    realCriteria: "MASINT \uD68D\uB4DD",
    falseCriteria: "MASINT \uC5C6\uC74C",
    grade: "\uD5C8\uC0C1 \uC6B0\uC138",
    responsibility: "\uAD70\uB2E8\u318D\uC0AC\uB2E8 \uC9C0\uD718\uC18C",
    source: `${SUDO_RD_ASSESSMENT_SOURCE_NAME} page 2`
  },
  {
    area: "\uC9C0\uD718\uC18C",
    check: "TOD \uC601\uC0C1\uBCF5\uADC0\uACB0\uACFC",
    observed: "\uCD2C\uC601\uC0AC\uD56D \uC5C6\uC74C",
    realCriteria: "TOD \uC601\uC0C1\uC5D0 \uBC1C\uC0AC\uD65C\uB3D9 \uB610\uB294 \uC774\uB3D9 \uD655\uC778",
    falseCriteria: "\uCD2C\uC601\uC0AC\uD56D \uC5C6\uC74C",
    grade: "\uD5C8\uC0C1 \uC6B0\uC138",
    responsibility: "\uAD70\uB2E8\u318D\uC0AC\uB2E8 \uC9C0\uD718\uC18C",
    source: `${SUDO_RD_ASSESSMENT_SOURCE_NAME} page 2`
  },
  {
    area: "\uC9C0\uD718\uC18C",
    check: "\uC801 \uD2B9\uC774\uD65C\uB3D9 \uBD84\uC11D",
    observed: "\uD1B5\uC2E0\uCCA9\uBCF4, \uAD11\uD559\uCE74\uBA54\uB77C \uCD2C\uC601\uACB0\uACFC \uB4F1 \uD2B9\uC774\uD65C\uB3D9 \uC5C6\uC74C",
    realCriteria: "\uC801 \uD65C\uB3D9 \uD2B9\uC774\uB3D9\uD5A5 \uD655\uC778",
    falseCriteria: "\uC801 \uD2B9\uC774\uD65C\uB3D9 \uC5C6\uC74C",
    grade: "\uD5C8\uC0C1 99%",
    responsibility: "\uAD70\uB2E8\u318D\uC0AC\uB2E8 \uC9C0\uD718\uC18C",
    source: `${SUDO_RD_ASSESSMENT_SOURCE_NAME} page 2`
  }
];
function buildSudoRdAssessmentDecisionInputs() {
  return SUDO_RD_ASSESSMENT_SOURCE_ROWS.map(
    ({
      realCriteria: _realCriteria,
      falseCriteria: _falseCriteria,
      responsibility: _responsibility,
      source: _source,
      ...row
    }) => ({
      ...row
    })
  );
}
function buildSudoRdAssessmentSourceTable() {
  return {
    title: "ARTAS \uB300\uD3EC\uBCD1\uD0D0\uC9C0 R/D \uD45C\uC801\uD0D0\uC9C0 \uC6D0\uBCF8 \uCCB4\uD06C\uB9AC\uC2A4\uD2B8",
    columns: [
      { key: "area", label: "\uAD6C\uBD84" },
      { key: "check", label: "\uCCB4\uD06C\uD56D\uBAA9" },
      { key: "realCriteria", label: "\uC2E4\uC874 \uAE30\uC900" },
      { key: "falseCriteria", label: "\uD5C8\uC0C1 \uAE30\uC900" },
      { key: "observed", label: "\uD654\uBA74 \uC801\uC6A9" },
      { key: "grade", label: "\uD310\uC815" },
      { key: "responsibility", label: "\uD3C9\uAC00\uCC45\uC784" },
      { key: "source", label: "\uCD9C\uCC98" }
    ],
    rows: SUDO_RD_ASSESSMENT_SOURCE_ROWS.map((row) => ({ ...row }))
  };
}
function getSudoRdAssessmentRowsForVisual() {
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
      grade: row.grade
    })
  );
}

// js/vendor/kairos/src/gui/sudo/sudoSituationAnalysisIntel.ts
var SUDO_SITUATION_ANALYSIS_SOURCE_NAME = "9-1 \uC0AC\uD0DC\uBD84\uC11D\uB3C4 \uBC0F \uB3C4\uB85C\uC815\uBCF4";
var SUDO_SITUATION_ANALYSIS_SOURCE_PATH = "client/public/sudo_data/md/sources/9-1 \uC0AC\uD0DC\uBD84\uC11D\uB3C4 \uBC0F \uB3C4\uB85C\uC815\uBCF4.md";
var SUDO_SITUATION_ROUTE_SOURCE_ROWS = [
  {
    option: "1\uBC88 \uB3C4\uB85C",
    route: "1\uBC88 \uB3C4\uB85C",
    coverage: 10,
    gap: 46,
    fireLinkScore: 58,
    basis: "\uC791\uC804\uBAA9\uC801 \uB2EC\uC131 \uC81C\uD55C, \uC218\uB3C4\uAD8C \uC9C4\uCD9C \uC81C\uD55C",
    adjustment: "\uBE44\uCD94\uCC9C",
    source: `${SUDO_SITUATION_ANALYSIS_SOURCE_NAME} slide 1`
  },
  {
    option: "3\uBC88 \uB3C4\uB85C",
    route: "3\uBC88 \uB3C4\uB85C",
    coverage: 70,
    gap: 8,
    fireLinkScore: 92,
    basis: "3\uBC88 \uB3C4\uB85C[70%] \uD310\uB2E8\uC548, \uC218\uB3C4\uAD8C \uC9C4\uC785 \uAC00\uB2A5",
    adjustment: "\uAC10\uC2DC 2 \xB7 \uACB0\uC2EC 2 \xB7 \uD0C0\uACA9 2",
    source: `${SUDO_SITUATION_ANALYSIS_SOURCE_NAME} slide 1 / sudo_senario_ver2 #9`
  },
  {
    option: "5\uBC88 \uB3C4\uB85C",
    route: "5\uBC88 \uB3C4\uB85C",
    coverage: 20,
    gap: 28,
    fireLinkScore: 66,
    basis: "\uC218\uB3C4\uAD8C \uC9C4\uC785 \uAC00\uB2A5\uD558\uB098 \uC8FC \uC608\uC0C1\uB85C \uB300\uBE44 \uAC10\uC2DC\xB7\uD654\uB825 \uC5F0\uACC4 \uC81C\uD55C",
    adjustment: "\uB300\uC548\uCD95",
    source: `${SUDO_SITUATION_ANALYSIS_SOURCE_NAME} slide 1`
  }
];
var SUDO_ROAD_INFO_SOURCE_ROWS = [
  {
    road: "1\uBC88",
    lanes: "2\uCC28\uC120",
    bridge: "\uC800\uCC28 \uD1B5\uC81C \uAC00\uB2A5",
    judgment: "\uC791\uC804\uBAA9\uC801 \uB2EC\uC131 \uC81C\uD55C / \uC608\uC0C1\uD655\uB960 10%",
    useProbability: 10
  },
  {
    road: "3\uBC88",
    lanes: "2\uCC28\uC120",
    bridge: "\uC800\uCC28 \uD1B5\uACFC \uAC00\uB2A5",
    judgment: "\uC218\uB3C4\uAD8C \uC9C4\uC785 \uAC00\uB2A5 / \uC608\uC0C1\uD655\uB960 70%",
    useProbability: 70
  },
  {
    road: "5\uBC88",
    lanes: "4\uCC28\uC120",
    bridge: "\uB2E4\uB9AC \uC5C6\uC74C",
    judgment: "\uC218\uB3C4\uAD8C \uC9C4\uC785 \uAC00\uB2A5 / \uC608\uC0C1\uD655\uB960 20%",
    useProbability: 20
  }
];
var SUDO_DRONE_REDEPLOYMENT_SOURCE_ROWS = [
  {
    droneId: "1\uBC88 \uB4DC\uB860",
    destinationType: "TAI",
    destinationName: "#3 \uC465\uACE0\uAC1C",
    coordinate: "BH 13245 68820",
    progressPercent: 35,
    status: "\uC774\uB3D9\uC911",
    sourceSentence: "1\uBC88\uB4DC\uB860\uC740 TAI #3 \uC9C0\uC810\uC778 \uC465\uACE0\uAC1C\uB85C \uC774\uB3D9"
  },
  {
    droneId: "2\uBC88 \uB4DC\uB860",
    destinationType: "NAI",
    destinationName: "#4 \uB9D0\uACE0\uAC1C",
    coordinate: "BH 14562 31094",
    progressPercent: 48,
    status: "\uC774\uB3D9\uC911",
    sourceSentence: "2\uBC88\uB4DC\uB860\uC740 NAI #4 \uC9C0\uC810\uC778 \uB9D0\uACE0\uAC1C\uB85C \uC774\uB3D9"
  },
  {
    droneId: "3\uBC88 \uB4DC\uB860",
    destinationType: "TAI",
    destinationName: "#4 \uB2F9\uB3D9\uB9AC",
    coordinate: "BH 15884 23301",
    progressPercent: 22,
    status: "\uC774\uB3D9\uBA85\uB839",
    sourceSentence: "3\uBC88\uB4DC\uB860\uC740 TAI #4 \uC9C0\uC810\uC778 \uB2F9\uB3D9\uB9AC\uB85C \uC774\uB3D9"
  }
];
function buildSudoSituationRouteDecisionInputs() {
  return SUDO_SITUATION_ROUTE_SOURCE_ROWS.map((row) => ({
    option: row.option,
    route: row.route,
    coverage: row.coverage,
    gap: row.gap,
    fireLinkScore: row.fireLinkScore
  }));
}
function buildSudoRoadInfoDecisionInputs() {
  return SUDO_ROAD_INFO_SOURCE_ROWS.map((row) => ({
    road: row.road,
    lanes: row.lanes,
    bridge: row.bridge,
    judgment: row.judgment,
    useProbability: row.useProbability
  }));
}
function buildSudoDroneRedeploymentDecisionInputs() {
  return SUDO_DRONE_REDEPLOYMENT_SOURCE_ROWS.map((row) => ({
    droneId: row.droneId,
    destinationType: row.destinationType,
    destinationName: row.destinationName,
    coordinate: row.coordinate,
    progressPercent: row.progressPercent,
    status: row.status
  }));
}
function buildSudoSituationAnalysisSourceTables() {
  return [
    {
      title: "9-1 \uC0AC\uD0DC\uBD84\uC11D\uB3C4 \uC6D0\uBCF8 \uD310\uB2E8\uD45C",
      columns: [
        { key: "option", label: "\uD310\uB2E8\uC548" },
        { key: "route", label: "\uC608\uC0C1\uC774\uB3D9\uB85C" },
        { key: "coverage", label: "\uAC10\uC2DC\uC728" },
        { key: "basis", label: "\uD310\uB2E8\uADFC\uAC70" },
        { key: "adjustment", label: "\uC870\uC815" },
        { key: "source", label: "\uCD9C\uCC98" }
      ],
      rows: SUDO_SITUATION_ROUTE_SOURCE_ROWS.map((row) => ({
        option: row.option,
        route: row.route,
        coverage: `${row.coverage}%`,
        basis: row.basis,
        adjustment: row.adjustment,
        source: formatSudoSourceDisplayLabel(row.source)
      }))
    },
    {
      title: "9-1 \uB3C4\uB85C\uC815\uBCF4 \uC6D0\uBCF8\uD45C",
      columns: [
        { key: "road", label: "\uB3C4\uB85C\uBA85" },
        { key: "lanes", label: "\uCC28\uC120\uAC1C\uC218" },
        { key: "bridge", label: "\uBE44\uACE0(\uB3C4\uB85C\uC0C1 \uB2E4\uB9AC\uD604\uD669)" },
        { key: "judgment", label: "\uD65C\uC6A9\uD310\uB2E8" }
      ],
      rows: SUDO_ROAD_INFO_SOURCE_ROWS.map((row) => ({
        road: row.road,
        lanes: row.lanes,
        bridge: row.bridge,
        judgment: row.judgment
      }))
    }
  ];
}
function buildSudoDroneRedeploymentSourceTable() {
  return {
    title: "9-1 \uB4DC\uB860 \uC7AC\uBC30\uCE58 GPT \uC751\uB2F5 \uC6D0\uBB38",
    columns: [
      { key: "drone", label: "\uB4DC\uB860" },
      { key: "destination", label: "\uBAA9\uC801\uC9C0" },
      { key: "coordinate", label: "\uC88C\uD45C" },
      { key: "sourceSentence", label: "\uC6D0\uBB38" },
      { key: "source", label: "\uCD9C\uCC98" }
    ],
    rows: SUDO_DRONE_REDEPLOYMENT_SOURCE_ROWS.map((row) => ({
      drone: row.droneId,
      destination: `${row.destinationType} ${row.destinationName}`,
      coordinate: row.coordinate,
      sourceSentence: row.sourceSentence,
      source: formatSudoSourceDisplayLabel(
        `${SUDO_SITUATION_ANALYSIS_SOURCE_NAME} senario.pdf #10`
      )
    }))
  };
}

// js/vendor/kairos/src/gui/sudo/sudoDecisionEngine.ts
var SUDO_SCENARIO_5_DEMO_NEAREST_CIVILIAN_M = 420;
function normalizeSudoScenarioDemoDecisionInputs(scenarioId, inputs) {
  const safeInputs = inputs ?? defaultSudoDecisionInputs;
  if (scenarioId !== 5 || safeInputs.nearestCivilianM >= SUDO_SCENARIO_5_DEMO_NEAREST_CIVILIAN_M) {
    return safeInputs;
  }
  return {
    ...safeInputs,
    nearestCivilianM: SUDO_SCENARIO_5_DEMO_NEAREST_CIVILIAN_M
  };
}
var munitionEffectColumns = [10, 20, 30];
var unsupportedTargetMunitionResult = "HE 6\uBC1C";
var unsupportedTargetMunitionEffectCell = "HEBB \u2460";
var munitionEffectRules = buildSudoMunitionEffectDecisionRules();
var fireUnits = buildSudoFiringUnitDecisionInputs();
var collateralRows = buildSudoCollateralMunitionsFromCde("18km");
var orderCandidates = SUDO_ORDER_CANDIDATE_SOURCE_ROWS.map((row) => ({
  unit: row.unit,
  weapon: row.weapon,
  distanceKm: row.distanceM / 1e3,
  guns: row.guns,
  directionMatchPercent: row.directionMatchPercent,
  coordinate: row.coordinate,
  targetCoordinate: row.targetCoordinate,
  equipment: row.equipment,
  grade: row.sourceRank === "\uC81C\uC678" ? "\uC81C\uC678" : `${row.sourceRank}\uC21C\uC704`,
  sourceRank: row.sourceRank
}));
var routeOptions = buildSudoSituationRouteDecisionInputs();
var roadInfoRows = buildSudoRoadInfoDecisionInputs();
var rdAssessmentRows = buildSudoRdAssessmentDecisionInputs();
var droneRedeploymentOrders = buildSudoDroneRedeploymentDecisionInputs();
var strikeAssets = buildSudoStrikeAssetDecisionInputs();
var firePlanRows = buildSudoFirePlanDecisionInputs();
var fireControlPoints = {
  nai: "NAI#4",
  dp: "DP#3",
  tai: "TAI#5"
};
var scaleAssessment = {
  observedVehicleCount: 3,
  marchColumnLengthM: 350,
  marchRoute: "\uC801\uAD50\uB9AC 3\uBC88 \uB3C4\uB85C \uD589\uAD70\uCD95"
};
var droneIdentificationRows = buildSudoDroneIdentificationRowsForDecision();
var defaultAssistantVulnerabilityRows = [
  ...SUDO_ASSISTANT_240MM_VULNERABILITY_CARDS,
  ...SUDO_ASSISTANT_152MM_VULNERABILITY_CARDS
];
var defaultSudoDecisionInputs = {
  targetLabel: "240mm \uBC29\uC0AC\uD3EC(M-1991)",
  observedVehicleCount: scaleAssessment.observedVehicleCount,
  marchColumnLengthM: scaleAssessment.marchColumnLengthM,
  marchRoute: scaleAssessment.marchRoute,
  forestPercent: 10,
  openTerrainPercent: 90,
  desiredDamagePercent: 30,
  nearestCivilianM: 420,
  collateralMunitions: collateralRows,
  orderCandidates,
  routeOptions,
  roadInfoRows,
  rdAssessmentRows,
  assistantVulnerabilityRows: defaultAssistantVulnerabilityRows,
  droneRedeploymentOrders,
  strikeAssets,
  fireUnits,
  fireControlPoints,
  firePlanRows,
  targetSpeedKph: 20,
  distanceToTaiKm: 6.7,
  observedDamagePercent: 18,
  remainingTargets: 4,
  bdaRequiredDamagePercent: 30
};
function percent(value) {
  return `${Math.round(value * 10) / 10}%`;
}
function formatDistanceKm(distanceKm) {
  if (distanceKm < 1) {
    return `${Math.round(distanceKm * 1e3)}m`;
  }
  return `${Math.round(distanceKm * 10) / 10}km`;
}
function normalizePercentPair(left, right) {
  const safeLeft = Number.isFinite(left) ? Math.max(0, Math.min(100, left)) : 0;
  const safeRight = Number.isFinite(right) ? Math.max(0, Math.min(100, right)) : 0;
  const total = safeLeft + safeRight;
  if (total <= 0) {
    return { left: 0, right: 0 };
  }
  return {
    left: Math.round(safeLeft / total * 1e3) / 10,
    right: Math.round(safeRight / total * 1e3) / 10
  };
}
function buildDroneTargetIdentificationDecision(inputs, perception) {
  const perceivedLabel = perception?.label?.trim();
  const fallbackLabel = inputs.targetLabel.trim() || "\uD45C\uC801 \uD6C4\uBCF4";
  const targetLabel = perceivedLabel && perceivedLabel !== "\uBD84\uC11D\uACB0\uACFC \uB300\uAE30" ? perceivedLabel : fallbackLabel;
  const confidence = perception?.confidence ?? 0.92;
  const bboxCount = perception?.detections.length ?? 1;
  const sourceTable = buildSudoDroneTargetSourceTable();
  return {
    title: "\uB4DC\uB860 \uD45C\uC801\uC2DD\uBCC4 \uC0B0\uCD9C",
    summary: `\uB4DC\uB8601\uC774 \uC7A5\uB3C4\uD6C8\uB828\uC7A5 \uC9C0\uD615 DB\uC640 \uAC10\uC2DC\uC88C\uD45C BH 12345 67890\uC744 \uB300\uC870\uD574 ${targetLabel} \uD6C4\uBCF4\uB97C \uC2DD\uBCC4\uD558\uACE0 \uD45C\uC801\uC131\uC9C8\uBD84\uC11D\uC73C\uB85C \uC774\uAD00\uD569\uB2C8\uB2E4.`,
    metrics: [
      { label: "\uAC10\uC2DC\uC88C\uD45C", value: "BH 12345 67890", tone: "blue" },
      { label: "\uB4DC\uB860\uC88C\uD45C", value: "BH 12321 56789", tone: "green" },
      { label: "bbox", value: `${bboxCount}\uAC74`, tone: "amber" },
      { label: "\uC2E0\uB8B0\uB3C4", value: percent(confidence * 100), tone: "green" }
    ],
    steps: [
      `${SUDO_DRONE_TARGET_SOURCE_NAME} \uC6D0\uBCF8 cue ${sourceTable.rows.length}\uAC74\uC744 \uBD88\uB7EC\uC635\uB2C8\uB2E4.`,
      "\uB4DC\uB860 EO \uD654\uBA74\uC758 \uC774\uB3D9 \uD45C\uC801 \uD6C4\uBCF4\uB97C \uC7A5\uB3C4\uD6C8\uB828\uC7A5 \uC9C0\uD615 DB \uC704\uC5D0 \uD22C\uC601\uD569\uB2C8\uB2E4.",
      "1-1 \uC7A5\uB3C4\uD6C8\uB828\uC7A5 \uAE30\uB3D9 \uC124\uBA85\uC790\uB8CC\uC758 01:45 \uAE30\uB3D9 cue\uC640 1-2 MilMap \uC88C\uD45C\uB97C \uADFC\uAC70\uB85C \uC601\uC0C1/\uC9C0\uD615DB \uC804\uC2DC \uC0C1\uD0DC\uB97C \uAC80\uC218\uD569\uB2C8\uB2E4.",
      "\uAC10\uC2DC\uC88C\uD45C\uC640 \uB4DC\uB860\uC88C\uD45C\uB97C \uBE44\uAD50\uD574 \uD45C\uC801 \uD6C4\uBCF4 \uC704\uCE58\uB97C \uD655\uC815\uD569\uB2C8\uB2E4.",
      "\uD45C\uC801 \uD6C4\uBCF4\uB97C 2\uBC88 \uD45C\uC801\uC131\uC9C8\uBD84\uC11D \uB2E8\uACC4\uB85C \uC804\uB2EC\uD558\uACE0 \uC8FC \uD654\uBA74 \uACBD\uBCF4\uB97C \uC720\uC9C0\uD569\uB2C8\uB2E4."
    ],
    table: {
      title: "\uB4DC\uB860\uC6B4\uC6A9 \uC0C1\uD0DC",
      columns: [
        { key: "item", label: "\uD56D\uBAA9" },
        { key: "value", label: "\uAC12" },
        { key: "status", label: "\uC0C1\uD0DC" }
      ],
      rows: droneIdentificationRows.map((row) => ({ ...row }))
    },
    sourceTables: [sourceTable]
  };
}
function normalizeTargetMatchToken(value) {
  return String(value ?? "").replace(/\s+/g, "").replace(/[()\-_/]/g, "").toLowerCase();
}
function getAssistantVulnerabilityRows(inputs, targetLabel) {
  const rows = inputs.assistantVulnerabilityRows.length > 0 ? inputs.assistantVulnerabilityRows : defaultAssistantVulnerabilityRows;
  const targetToken = normalizeTargetMatchToken(targetLabel);
  const matchedRows = rows.filter((row) => {
    const rowTargetToken = normalizeTargetMatchToken(row.target);
    return rowTargetToken.length > 0 && (targetToken.includes(rowTargetToken) || rowTargetToken.includes(targetToken) || targetToken.includes("240mm") && rowTargetToken.includes("240mm") || targetToken.includes("152mm") && rowTargetToken.includes("152mm"));
  });
  if (matchedRows.length > 0) {
    return matchedRows;
  }
  const targetRows = getSudoAssistantVulnerabilityCardsForTarget(targetLabel);
  return targetRows.length > 0 ? targetRows : rows;
}
function buildAssistantDecision(inputs, perception) {
  const targetLabel = inputs.targetLabel.trim() || perception?.label?.trim() || "240mm \uBC29\uC0AC\uD3EC";
  const assistantRows = getAssistantVulnerabilityRows(inputs, targetLabel);
  const highRiskFactors = assistantRows.filter((row) => row.grade === "\uC0C1");
  const sourceTables = buildSudoAssistantVulnerabilitySourceTables();
  const sourceCount = new Set(
    assistantRows.map((row) => row.source).filter((source) => Boolean(source))
  ).size;
  return {
    title: "AI \uCDE8\uC57D\uC810 \uBCF4\uC870\uD310\uB2E8",
    summary: `${targetLabel} \uCDE8\uC57D\uC810 ${assistantRows.length}\uAC74 \uC911 ${highRiskFactors.map((row) => row.factor).join(", ")}\uB97C \uC6B0\uC120 \uADFC\uAC70\uB85C \uC81C\uC2DC\uD558\uACE0 \uD45C\uC801\uC131\uC9C8\uBD84\uC11D \uBCF4\uC870\uADFC\uAC70\uB85C \uCCA8\uBD80\uD569\uB2C8\uB2E4.`,
    metrics: [
      { label: "\uB300\uC0C1", value: targetLabel, tone: "amber" },
      {
        label: "\uCDE8\uC57D\uC810",
        value: `${assistantRows.length}\uAC74`,
        tone: "green"
      },
      {
        label: "\uC6B0\uC120\uADFC\uAC70",
        value: `${highRiskFactors.length}\uAC74`,
        tone: "blue"
      },
      {
        label: "\uC6D0\uCC9C\uC790\uB8CC",
        value: sourceCount > 0 ? `${sourceCount}\uAC74` : "6-1",
        tone: "amber"
      },
      {
        label: "\uBE44\uAD50\uC790\uB8CC",
        value: "152mm",
        tone: "blue"
      }
    ],
    steps: [
      `\uC9C8\uC758 \uBB38\uC7A5\uC744 \uD604\uC7AC \uD45C\uC801\uC131\uC9C8 ${targetLabel}\uC640 \uB9E4\uCE6D\uD569\uB2C8\uB2E4.`,
      `${SUDO_ASSISTANT_VULNERABILITY_SOURCE_NAME} \uC6D0\uCC9C\uC790\uB8CC\uC5D0\uC11C 240mm 8\uAC1C \uCDE8\uC57D\uC810 \uCE74\uB4DC\uB97C \uAC80\uC0C9\uD569\uB2C8\uB2E4.`,
      "\uB3D9\uC77C \uC6D0\uCC9C\uC790\uB8CC\uC758 152mm \uC790\uC8FC\uD3EC \uCDE8\uC57D\uC810 \uCE74\uB4DC\uB97C \uBE44\uAD50 \uC9C0\uC2DD\uC73C\uB85C \uC5F0\uACB0\uD569\uB2C8\uB2E4.",
      "Ollama Gemma \uACC4\uC5F4 \uC751\uB2F5\uC744 \uC791\uC804 \uBCF4\uC870\uBB38\uC7A5\uC73C\uB85C \uC815\uB9AC\uD558\uACE0 \uBCF4\uACE0\uC11C \uD310\uB2E8\uADFC\uAC70\uC5D0 \uBC18\uC601\uD569\uB2C8\uB2E4."
    ],
    table: {
      title: "\uCDE8\uC57D\uC810 \uADFC\uAC70\uD45C",
      columns: [
        { key: "factor", label: "\uCDE8\uC57D\uC694\uC18C" },
        { key: "evidence", label: "\uADFC\uAC70" },
        { key: "impact", label: "\uC791\uC804\uD6A8\uACFC" },
        { key: "grade", label: "\uC6B0\uC120\uB3C4" }
      ],
      rows: assistantRows.map((row) => ({ ...row }))
    },
    sourceTables
  };
}
function minutesToClock(baseHour, baseMinute, minutes) {
  const totalMinutes = baseHour * 60 + baseMinute + Math.round(minutes);
  const hour = Math.floor(totalMinutes / 60) % 24;
  const minute = totalMinutes % 60;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}
function parseClockMinutes(value) {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!match) {
    return void 0;
  }
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (!Number.isInteger(hour) || !Number.isInteger(minute) || hour < 0 || hour > 23 || minute < 0 || minute > 59) {
    return void 0;
  }
  return hour * 60 + minute;
}
function isClockWithinWindow(clock, from, to) {
  const clockMinutes = parseClockMinutes(clock);
  const fromMinutes = parseClockMinutes(from);
  const toMinutes = parseClockMinutes(to);
  if (clockMinutes === void 0 || fromMinutes === void 0 || toMinutes === void 0) {
    return false;
  }
  if (fromMinutes <= toMinutes) {
    return clockMinutes >= fromMinutes && clockMinutes <= toMinutes;
  }
  return clockMinutes >= fromMinutes || clockMinutes <= toMinutes;
}
function getMunitionDominantTerrain(terrain) {
  return terrain.right >= 60 || terrain.right >= terrain.left ? "open" : "covered";
}
function getMunitionEffectColumn(desiredDamage) {
  return munitionEffectColumns.find((column) => column >= desiredDamage) ?? munitionEffectColumns[munitionEffectColumns.length - 1];
}
function getMunitionRoundCount(effectCell) {
  if (effectCell.includes("\u2460")) return 1;
  if (effectCell.includes("\u2461")) return 2;
  if (effectCell.includes("\u2462")) return 3;
  if (effectCell.includes("\u2465")) return 6;
  if (effectCell.includes("\u2468")) return 9;
  const parsed = Number.parseInt(effectCell.replace(/[^0-9]/g, ""), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}
function getMunitionResult(rule, effectCell) {
  const munition = effectCell.split(/\s+/)[0] || "HE";
  const roundCount = getMunitionRoundCount(effectCell);
  const totalRounds = rule.fireUnit === "\uB300\uB300" ? roundCount * 6 : roundCount;
  return `${munition} ${totalRounds}\uBC1C`;
}
function scoreMunitionRule({
  rule,
  targetLabel,
  dominantTerrain,
  desiredDamage,
  selectedColumn
}) {
  const effectCell = rule.effectCells[selectedColumn];
  const roundCount = getMunitionRoundCount(effectCell);
  const targetMatched = rule.targetPattern.test(targetLabel);
  const targetScore = targetMatched ? 1 : 0.62;
  const terrainScore = rule.terrainClass === dominantTerrain ? 1 : 0.18;
  const satisfactionScore = Math.min(
    1,
    selectedColumn / Math.max(1, desiredDamage)
  );
  const economyScore = Math.max(0, 1 - (roundCount - 1) / 8);
  const scaleScore = rule.fireUnit === "\uD3EC\uB300" ? 1 : 0.72;
  const score = targetScore * 24 + terrainScore * 34 + satisfactionScore * 24 + economyScore * 12 + scaleScore * 6;
  return {
    rule,
    column: selectedColumn,
    effectCell,
    roundCount,
    result: getMunitionResult(rule, effectCell),
    targetMatched,
    targetScore,
    terrainScore,
    satisfactionScore,
    economyScore,
    scaleScore,
    score: Math.round(score)
  };
}
function buildMunitionRecommendation(inputs) {
  const desiredDamage = inputs.desiredDamagePercent;
  const targetLabel = inputs.targetLabel.trim() || "\uD45C\uC801";
  const terrain = normalizePercentPair(
    inputs.forestPercent,
    inputs.openTerrainPercent
  );
  const dominantTerrain = getMunitionDominantTerrain(terrain);
  const selectedColumn = getMunitionEffectColumn(desiredDamage);
  const candidates = munitionEffectRules.map(
    (rule) => scoreMunitionRule({
      rule,
      targetLabel,
      dominantTerrain,
      desiredDamage,
      selectedColumn
    })
  ).sort((left, right) => {
    if (right.score !== left.score) {
      return right.score - left.score;
    }
    if (left.roundCount !== right.roundCount) {
      return left.roundCount - right.roundCount;
    }
    return left.rule.fireUnit.localeCompare(right.rule.fireUnit, "ko-KR");
  });
  return {
    terrain,
    dominantTerrain,
    selectedColumn,
    selected: candidates[0],
    candidates
  };
}
function buildMunitionDecision(inputs) {
  const desiredDamage = inputs.desiredDamagePercent;
  const targetLabel = inputs.targetLabel.trim() || "\uD45C\uC801";
  const recommendation = buildMunitionRecommendation(inputs);
  const sourceTable = buildSudoMunitionEffectSourceTable();
  const { terrain, selectedColumn, selected, candidates } = recommendation;
  const terrainLabel = `\uC0B0\uB9BC/\uB3C4\uC2EC ${percent(terrain.left)} / \uAC1C\uD65C\uC9C0 ${percent(
    terrain.right
  )}`;
  const targetSupported = candidates.some(
    (candidate) => candidate.targetMatched
  );
  const desiredDamageSatisfied = targetSupported && selectedColumn >= desiredDamage;
  const displayedResult = targetSupported ? selected.result : unsupportedTargetMunitionResult;
  const displayedEffectCell = targetSupported ? selected.effectCell : unsupportedTargetMunitionEffectCell;
  const dominantTerrainLabel = selected.rule.terrainLabel;
  const summary = !targetSupported ? `7-1~2 \uB9E4\uD2B8\uB9AD\uC2A4\uB294 122/240mm \uBC29\uC0AC\uD3EC \uAE30\uC900\uC774\uBBC0\uB85C ${targetLabel} \uD45C\uC801\uC5D0\uB294 \uCC38\uACE0 \uCD94\uCC9C ${displayedResult}\uC744 \uD45C\uC2DC\uD569\uB2C8\uB2E4. ${terrainLabel} \uC9C0\uD615\uC870\uAC74\uC758 \uCC38\uACE0 \uC140\uC740 ${dominantTerrainLabel}/${selected.rule.fireUnit}/${selectedColumn}% ${displayedEffectCell}\uC785\uB2C8\uB2E4.` : desiredDamageSatisfied ? `${targetLabel} \uD45C\uC801\uACFC ${terrainLabel} \uC9C0\uD615\uC870\uAC74\uC744 7-1~2 \uB9E4\uD2B8\uB9AD\uC2A4\uC5D0 \uB300\uC785\uD574 ${dominantTerrainLabel}/${selected.rule.fireUnit}/${selectedColumn}% \uC140\uC758 ${displayedResult}\uC744 \uCD94\uCC9C\uD569\uB2C8\uB2E4.` : `${targetLabel} \uD45C\uC801\uACFC ${terrainLabel} \uC9C0\uD615\uC870\uAC74\uC5D0\uC11C \uC694\uB9DD\uD53C\uD574\uC728 ${desiredDamage}%\uB294 \uD45C \uB0B4 \uCD5C\uB300 \uD6A8\uACFC\uC5F4 ${selectedColumn}%\uB97C \uCD08\uACFC\uD574 ${displayedResult}\uC744 \uCD5C\uB300 \uAC00\uC6A9\uC548\uC73C\uB85C \uD45C\uC2DC\uD558\uACE0 \uCD94\uAC00 \uD654\uB825 \uAC80\uD1A0\uAC00 \uD544\uC694\uD569\uB2C8\uB2E4.`;
  return {
    title: "\uD0C4\uC885/\uBC1C\uC218 \uC0B0\uCD9C",
    summary,
    metrics: [
      {
        label: "\uCD94\uCC9C",
        value: displayedResult,
        tone: desiredDamageSatisfied ? "green" : "amber"
      },
      {
        label: "\uD53C\uD574\uC728",
        value: percent(selectedColumn),
        tone: desiredDamageSatisfied ? "blue" : "red"
      },
      { label: "\uC694\uB9DD\uD6A8\uACFC", value: percent(desiredDamage), tone: "amber" },
      {
        label: "\uCDA9\uC871",
        value: desiredDamageSatisfied ? "\uCDA9\uC871" : targetSupported ? "\uCD94\uAC00\uAC80\uD1A0" : "\uCC38\uACE0\uCD94\uCC9C",
        tone: desiredDamageSatisfied ? "green" : "red"
      },
      { label: "\uD45C\uC801\uC131\uC9C8", value: targetLabel, tone: "blue" },
      { label: "\uC9C0\uD615", value: terrainLabel, tone: "green" },
      { label: "\uC9C0\uD615\uD589", value: dominantTerrainLabel, tone: "green" },
      { label: "\uC0AC\uACA9\uBD80\uB300", value: selected.rule.fireUnit, tone: "blue" },
      { label: "\uD6A8\uACFC\uC5F4", value: percent(selectedColumn), tone: "amber" },
      { label: "\uD6A8\uACFC\uC140", value: displayedEffectCell, tone: "blue" },
      { label: "\uCD94\uCC9C\uC810\uC218", value: `${selected.score}`, tone: "green" }
    ],
    steps: [
      `\uD45C\uC801\uC131\uC9C8 ${targetLabel}\uC640 ${terrainLabel} \uC9C0\uD615\uC870\uAC74\uC744 \uC785\uB825\uD569\uB2C8\uB2E4.`,
      `${SUDO_MUNITION_EFFECT_SOURCE_NAME} #1 100\uD3EC\uBCD1\uB300\uB300(K105A1) 122/240mm \uBC29\uC0AC\uD3EC \uC6D0\uBCF8\uD589 ${sourceTable.rows.length}\uAC1C\uB97C \uBD88\uB7EC\uC635\uB2C8\uB2E4.`,
      `${terrain.right >= terrain.left ? "\uAC1C\uD65C\uC9C0" : "\uC0B0\uB9BC/\uB3C4\uC2EC"} \uC6B0\uC138 \uC9C0\uD615\uC73C\uB85C \uBD84\uB958\uD558\uACE0 7-1~2 \uD589 \uD6C4\uBCF4\uB97C \uC810\uC218\uD654\uD569\uB2C8\uB2E4.`,
      `${selected.rule.terrainLabel}/${selected.rule.fireUnit}/${selectedColumn}% \uC140 ${displayedEffectCell}\uC744 \uC120\uD0DD\uD569\uB2C8\uB2E4.`,
      !targetSupported ? `${displayedResult}\uC744 \uC6B0\uCE21 \uCD5C\uC885 \uD310\uC815\uC5D0 \uD45C\uC2DC\uD558\uACE0 \uD45C\uC801\uC131\uC9C8\uC740 \uADFC\uAC70 \uBB38\uC7A5\uC73C\uB85C\uB9CC \uC7AC\uD655\uC778\uD569\uB2C8\uB2E4.` : desiredDamageSatisfied ? `${displayedResult} \uC774\uD6C4 \uB354 \uD070 \uB2E8\uC704/\uBC1C\uC218 \uD6C4\uBCF4\uB294 \uACFC\uB2E4 \uC0AC\uACA9\uC73C\uB85C \uC81C\uC678\uD569\uB2C8\uB2E4.` : `${displayedResult}\uC740 \uD604\uC7AC \uD45C\uC758 \uCD5C\uB300 \uAC00\uC6A9\uC548\uC774\uBBC0\uB85C \uC0C1\uAE09 \uD654\uB825 \uB610\uB294 \uC7AC\uC0AC\uACA9 \uC5F0\uACC4\uB97C \uAC80\uD1A0\uD569\uB2C8\uB2E4.`
    ],
    table: {
      title: "7-1~2 \uD0C4\uC885/\uBC1C\uC218 \uCD94\uCC9C \uB9E4\uD2B8\uB9AD\uC2A4",
      columns: [
        { key: "target", label: "\uD45C\uC801\uC131\uC9C8" },
        { key: "range", label: "\uC0AC\uAC70\uB9AC" },
        { key: "terrain", label: "\uC9C0\uD615" },
        { key: "fireUnit", label: "\uC0AC\uACA9\uBD80\uB300" },
        { key: "effect10", label: "10%" },
        { key: "effect20", label: "20%" },
        { key: "effect30", label: "30%" },
        { key: "score", label: "\uCD94\uCC9C\uC810\uC218" },
        { key: "grade", label: "\uD310\uC815" }
      ],
      rows: candidates.map((candidate) => ({
        target: candidate.rule.targetType,
        range: candidate.rule.rangeBand,
        terrain: candidate.rule.terrainLabel,
        fireUnit: candidate.rule.fireUnit,
        effect10: candidate.rule.effectCells[10],
        effect20: candidate.rule.effectCells[20],
        effect30: candidate.rule.effectCells[30],
        score: `${candidate.score}`,
        grade: !candidate.targetMatched ? "\uD45C\uC801\uBD88\uC77C\uCE58" : candidate.rule.id === selected.rule.id ? desiredDamageSatisfied ? "\uCD94\uCC9C" : "\uCD5C\uB300\uAC00\uC6A9" : candidate.rule.terrainClass !== recommendation.dominantTerrain ? "\uC9C0\uD615\uBD88\uC77C\uCE58" : candidate.score < selected.score ? "\uD6C4\uC21C\uC704" : "\uB3D9\uC810\uD6C4\uC21C\uC704"
      }))
    },
    sourceTables: [sourceTable]
  };
}
var rocketTargetPattern = /240|m-?1991|방사포|mrl|mlrs|rocket|launcher|발사관|tel|roman|22연장|차대|tube/i;
function hasRocketTargetEvidence(value) {
  return rocketTargetPattern.test(value ?? "");
}
var nonTargetObjectLabelPattern = /^(traffic light|stop sign|parking meter|bench|bird|cat|dog|horse|sheep|cow|elephant|bear|zebra|giraffe|backpack|umbrella|handbag|tie|suitcase|frisbee|skis|snowboard|sports ball|kite|baseball bat|baseball glove|skateboard|surfboard|tennis racket|bottle|wine glass|cup|fork|knife|spoon|bowl|banana|apple|sandwich|orange|broccoli|carrot|hot dog|pizza|donut|cake|chair|couch|potted plant|bed|dining table|toilet|tv|laptop|mouse|remote|keyboard|cell phone|microwave|oven|toaster|sink|refrigerator|book|clock|vase|scissors|teddy bear|hair drier|toothbrush)$/i;
function getTargetClassificationDisplayLabel(inputs, perception) {
  const perceptionLabel = perception?.label?.trim();
  if (perceptionLabel && !nonTargetObjectLabelPattern.test(perceptionLabel)) {
    return perceptionLabel;
  }
  if (hasRocketTargetEvidence(inputs.targetLabel)) {
    return "\uCC28\uB7C9\uD615 \uD654\uB825\uC7A5\uBE44";
  }
  return inputs.targetLabel.trim() || "\uCC28\uB7C9\uD615 \uD654\uB825\uC7A5\uBE44";
}
function getVisualLauncherEvidenceScore(box) {
  const features = box.visualFeatures;
  if (!features) {
    return 0;
  }
  const explicitLauncherScore = typeof features.launcherScore === "number" ? Math.max(0, Math.min(1, features.launcherScore)) : 0;
  const tubeFaceCue = Math.max(
    features.tubeFaceEdgeDensity ?? 0,
    features.tubeFaceDarkRatio ?? 0
  ) * 0.65;
  const silhouetteCue = Math.min(1, (features.darkBlobCount ?? 0) / 6) * 0.18 + Math.min(1, (features.topDarkRatio ?? 0) / 0.45) * 0.1 + Math.min(1, (features.edgeDensity ?? 0) / 0.35) * 0.07;
  return Math.max(explicitLauncherScore, tubeFaceCue + silhouetteCue);
}
function buildTargetClassificationEvidence(inputs, perception) {
  const detections = perception?.detections ?? [];
  const detectionEvidence = detections.filter(
    (box) => hasRocketTargetEvidence(
      `${box.label} ${box.rawLabel ?? ""} ${box.role ?? ""}`
    )
  );
  const tubeCount = detections.filter(
    (box) => /tube|launcher|발사관|로켓|tube-face/i.test(
      `${box.label} ${box.rawLabel ?? ""} ${box.role ?? ""}`
    )
  ).length;
  const visualEvidenceScores = detections.map(getVisualLauncherEvidenceScore).filter((score) => score >= 0.55);
  const visualEvidenceScore = Math.min(
    32,
    Math.round(
      visualEvidenceScores.reduce(
        (total, score) => total + Math.min(1, score) * 28,
        0
      )
    )
  );
  const inputLabelMatched = hasRocketTargetEvidence(inputs.targetLabel);
  const perceptionLabelMatched = hasRocketTargetEvidence(perception?.label);
  const summaryMatched = hasRocketTargetEvidence(perception?.summary);
  const hasPerceptionEvidence = perceptionLabelMatched || summaryMatched || detectionEvidence.length > 0 || visualEvidenceScore > 0;
  const inputLabelScore = inputLabelMatched && perception === void 0 ? 42 : inputLabelMatched ? 12 : 0;
  const labelScore = perceptionLabelMatched ? 32 : 0;
  const summaryScore = summaryMatched ? 16 : 0;
  const detectionScore = Math.min(28, detectionEvidence.length * 12);
  const tubeScore = Math.min(16, tubeCount * 8);
  const confidenceScore = perception && hasPerceptionEvidence ? Math.min(10, Math.max(0, perception.confidence) * 10) : 0;
  const frameScore = perception && hasPerceptionEvidence ? Math.min(6, Math.max(0, perception.frameCount) * 1.5) : 0;
  const evidenceScore = Math.round(
    Math.min(
      100,
      inputLabelScore + labelScore + summaryScore + detectionScore + tubeScore + visualEvidenceScore + confidenceScore + frameScore
    )
  );
  const launcherEvidence = evidenceScore >= 35;
  const strongScenarioMatch = perception === void 0 && inputLabelMatched && launcherEvidence;
  const strongPerceptionMatch = perceptionLabelMatched || tubeCount > 0 || detectionEvidence.length >= 2 || visualEvidenceScore >= 22;
  const confidence = launcherEvidence ? Math.max(
    perception?.confidence ?? 0,
    strongScenarioMatch || strongPerceptionMatch ? 0.998 : 0.94
  ) : perception?.confidence ?? Math.max(0, ...detections.map((box) => box.confidence), 0.62);
  const supportReasons = [
    inputLabelScore > 0 ? `\uC2DC\uB098\uB9AC\uC624 \uD45C\uC801\uBA85 ${inputs.targetLabel}` : void 0,
    labelScore > 0 ? `AI \uB77C\uBCA8 ${perception?.label}` : void 0,
    summaryScore > 0 ? "\uBD84\uC11D\uC694\uC57D \uBC29\uC0AC\uD3EC/TEL \uD0A4\uC6CC\uB4DC" : void 0,
    detectionScore > 0 ? `bbox ${detectionEvidence.length}\uAC74` : void 0,
    tubeScore > 0 ? `\uBC1C\uC0AC\uAD00 ${tubeCount}\uAC74` : void 0,
    visualEvidenceScore > 0 ? `\uC601\uC0C1\uD2B9\uC9D5 ${visualEvidenceScores.length}\uAC74` : void 0
  ].filter((reason) => Boolean(reason));
  return {
    evidenceScore,
    launcherEvidence,
    confidence,
    tubeCount,
    visualEvidenceCount: visualEvidenceScores.length,
    supportReasons
  };
}
function buildTargetClassificationDecision(inputs, perception) {
  const detections = perception?.detections ?? [];
  const evidence = buildTargetClassificationEvidence(inputs, perception);
  const launcherEvidence = evidence.launcherEvidence;
  const target = launcherEvidence ? "240mm \uBC29\uC0AC\uD3EC(M-1991)" : getTargetClassificationDisplayLabel(inputs, perception);
  const confidence = evidence.confidence;
  const tubeCount = evidence.tubeCount;
  const primaryEvidence = evidence.supportReasons.join(" / ") || "generic \uCC28\uB7C9 bbox/track \uD655\uC778, \uBC1C\uC0AC\uAD00/TEL \uADFC\uAC70 \uBD80\uC871";
  const sourceTable = buildSudoTargetClassificationEvidenceTable();
  const mediaSourceTable = buildSudoTargetClassificationMediaTable();
  return {
    title: "\uD45C\uC801\uC131\uC9C8 \uC0B0\uCD9C",
    summary: `${perception?.model ?? "\uB0B4\uC7A5 \uBD84\uC11D"} \uACB0\uACFC ${target}\uB85C \uBD84\uB958\uD569\uB2C8\uB2E4.`,
    metrics: [
      { label: "\uD45C\uC801\uC131\uC9C8", value: target, tone: "green" },
      { label: "\uD45C\uC801\uC88C\uD45C", value: "BH 12345 67890", tone: "green" },
      { label: "\uC2E0\uB8B0\uB3C4", value: percent(confidence * 100), tone: "blue" },
      {
        label: "\uADFC\uAC70\uC810\uC218",
        value: `${evidence.evidenceScore}/100`,
        tone: launcherEvidence ? "green" : "amber"
      },
      {
        label: "\uC601\uC0C1\uADFC\uAC70",
        value: `${evidence.visualEvidenceCount}\uAC74`,
        tone: evidence.visualEvidenceCount > 0 ? "blue" : "amber"
      },
      {
        label: "\uC6D0\uCC9C\uADFC\uAC70",
        value: `${sourceTable.rows.length}\uAC1C`,
        tone: "green"
      },
      {
        label: "bbox",
        value: `${detections.length}\uAC74`,
        tone: detections.length > 0 ? "amber" : "red"
      }
    ],
    steps: [
      `${perception?.frameCount ?? 0}\uAC1C \uD504\uB808\uC784\uC5D0\uC11C \uCC28\uB7C9 \uC678\uACFD bbox\uB97C \uCD94\uCD9C\uD569\uB2C8\uB2E4.`,
      `${SUDO_TARGET_CLASSIFICATION_SOURCE_NAME}\uC758 ${sourceTable.rows.length}\uAC1C \uD310\uB2E8\uADFC\uAC70\uB97C \uD45C\uC801 \uD615\uC0C1 \uD310\uB3C5 \uAE30\uC900\uC73C\uB85C \uBD88\uB7EC\uC635\uB2C8\uB2E4.`,
      tubeCount > 0 ? "\uBC1C\uC0AC\uAD00 bbox\uAC00 \uD0D0\uC9C0\uB418\uC5B4 \uBC29\uC0AC\uD3EC \uACC4\uC5F4 \uD2B9\uC9D5\uC73C\uB85C \uBC18\uC601\uD569\uB2C8\uB2E4." : launcherEvidence ? `${primaryEvidence}\uB97C \uBC29\uC0AC\uD3EC \uACC4\uC5F4 \uD310\uB2E8\uADFC\uAC70\uB85C \uBC18\uC601\uD569\uB2C8\uB2E4.` : "generic \uCC28\uB7C9 bbox\uB9CC \uD655\uC778\uB418\uC5B4 \uBC1C\uC0AC\uAD00/TEL \uD655\uC815 \uADFC\uAC70\uB294 \uBCF4\uB958\uD569\uB2C8\uB2E4.",
      launcherEvidence ? `\uD6C4\uBCF4 \uD655\uB960\uD45C\uC5D0\uC11C M-1991 ${percent(confidence * 100)}\uB97C \uC6B0\uC120 \uD6C4\uBCF4\uB85C \uB450\uACE0 \uADFC\uAC70\uC810\uC218 ${evidence.evidenceScore}/100 \uAE30\uC900\uC73C\uB85C \uD45C\uC801\uBA85\uC744 \uD655\uC815\uD569\uB2C8\uB2E4.` : `\uADFC\uAC70\uC810\uC218 ${evidence.evidenceScore}/100\uC73C\uB85C \uAE30\uC900 \uBBF8\uB2EC\uC774\uC5B4\uC11C \uCC28\uB7C9 \uD6C4\uBCF4 \uC0C1\uD0DC\uB97C \uC720\uC9C0\uD558\uACE0 \uC6B4\uC601\uC790 \uC7AC\uAC80\uD1A0\uB97C \uC694\uAD6C\uD569\uB2C8\uB2E4.`
    ],
    table: {
      title: "\uD45C\uC801\uC131\uC9C8 \uD6C4\uBCF4",
      columns: [
        { key: "candidate", label: "\uD6C4\uBCF4" },
        { key: "evidence", label: "\uADFC\uAC70" },
        { key: "score", label: "\uC810\uC218" }
      ],
      rows: launcherEvidence ? [
        {
          candidate: "240mm \uBC29\uC0AC\uD3EC(M-1991)",
          evidence: primaryEvidence,
          score: percent(confidence * 100)
        },
        {
          candidate: "M-1989",
          evidence: "\uCC38\uC870 \uD615\uC0C1 \uC77C\uBD80 \uC720\uC0AC",
          score: `${Math.max(0.2, Math.round((100 - confidence * 100) * 10) / 10)}%`
        }
      ] : [
        {
          candidate: target,
          evidence: "generic \uCC28\uB7C9 bbox/track \uD655\uC778",
          score: percent(confidence * 100)
        },
        {
          candidate: "240mm \uBC29\uC0AC\uD3EC(M-1991)",
          evidence: "\uBC1C\uC0AC\uAD00/TEL \uD615\uC0C1 \uADFC\uAC70 \uBD80\uC871",
          score: `\uADFC\uAC70 ${evidence.evidenceScore}/100`
        },
        {
          candidate: "M-1989",
          evidence: "\uCC38\uC870 \uD615\uC0C1 \uC77C\uBD80 \uC720\uC0AC",
          score: "34.0%"
        }
      ]
    },
    sourceTables: [sourceTable, mediaSourceTable]
  };
}
function gradeBySeverity(scale) {
  if (scale === "\uB300\uB300 \uADDC\uBAA8") {
    return 3;
  }
  if (scale === "\uC911\uB300 \uADDC\uBAA8") {
    return 2;
  }
  if (scale === "\uC18C\uB300/\uB2E8\uC77C \uD45C\uC801") {
    return 1;
  }
  return 0;
}
function chooseHigherScale(left, right) {
  return gradeBySeverity(left) >= gradeBySeverity(right) ? left : right;
}
function scaleFromCount(count) {
  return count >= 12 ? "\uB300\uB300 \uADDC\uBAA8" : count >= 3 ? "\uC911\uB300 \uADDC\uBAA8" : count >= 1 ? "\uC18C\uB300/\uB2E8\uC77C \uD45C\uC801" : "\uD310\uB2E8 \uBCF4\uB958";
}
function scaleFromMarchLength(lengthM) {
  return lengthM >= 700 ? "\uB300\uB300 \uADDC\uBAA8" : lengthM >= 250 ? "\uC911\uB300 \uADDC\uBAA8" : lengthM >= 80 ? "\uC18C\uB300/\uB2E8\uC77C \uD45C\uC801" : "\uD310\uB2E8 \uBCF4\uB958";
}
function scaleFromPerceptionText(text) {
  const normalized = String(text ?? "").trim();
  if (!normalized) {
    return void 0;
  }
  if (/대대|battalion/i.test(normalized)) {
    return "\uB300\uB300 \uADDC\uBAA8";
  }
  if (/중대|company/i.test(normalized)) {
    return "\uC911\uB300 \uADDC\uBAA8";
  }
  if (/소대|platoon|단일|single/i.test(normalized)) {
    return "\uC18C\uB300/\uB2E8\uC77C \uD45C\uC801";
  }
  return void 0;
}
function isScaleVehicleDetection(label) {
  return /tank|truck|vehicle|tel|mrl|mlrs|rocket|launcher|전차|차량|트럭|방사포/i.test(
    label
  );
}
function classifyScaleCompositionLabel(label) {
  if (/mrl|mlrs|rocket|launcher|tel|방사포|발사대/i.test(label)) {
    return "MRL/MLRS";
  }
  if (/tank|전차/i.test(label)) {
    return "\uC804\uCC28";
  }
  if (/truck|vehicle|차량|트럭/i.test(label)) {
    return "\uAD70\uC6A9 \uD2B8\uB7ED";
  }
  return "\uAE30\uD0C0";
}
function getScaleCompositionRank(label) {
  if (label === "MRL/MLRS") {
    return 0;
  }
  if (label === "\uC804\uCC28") {
    return 1;
  }
  if (label === "\uAD70\uC6A9 \uD2B8\uB7ED") {
    return 2;
  }
  return 3;
}
function getDominantScaleLabel(detections) {
  const labelStats = /* @__PURE__ */ new Map();
  detections.forEach((box, index) => {
    const current = labelStats.get(box.label);
    if (!current) {
      labelStats.set(box.label, {
        label: box.label,
        count: 1,
        confidenceSum: box.confidence,
        firstSeen: index
      });
      return;
    }
    current.count += 1;
    current.confidenceSum += box.confidence;
  });
  return [...labelStats.values()].sort(
    (left, right) => right.count - left.count || right.confidenceSum - left.confidenceSum || left.firstSeen - right.firstSeen || left.label.localeCompare(right.label)
  )[0]?.label;
}
function summarizeScaleComposition(detections, trackedCount) {
  const compositionCounts = /* @__PURE__ */ new Map();
  if (trackedCount > 0) {
    const tracks = /* @__PURE__ */ new Map();
    detections.forEach((box) => {
      const trackId = box.trackId?.trim();
      if (!trackId) {
        return;
      }
      const group = tracks.get(trackId) ?? [];
      group.push(box);
      tracks.set(trackId, group);
    });
    tracks.forEach((group) => {
      const label = getDominantScaleLabel(group);
      if (!label) {
        return;
      }
      const compositionLabel = classifyScaleCompositionLabel(label);
      compositionCounts.set(
        compositionLabel,
        (compositionCounts.get(compositionLabel) ?? 0) + 1
      );
    });
  } else {
    detections.forEach((box) => {
      const compositionLabel = classifyScaleCompositionLabel(box.label);
      compositionCounts.set(
        compositionLabel,
        (compositionCounts.get(compositionLabel) ?? 0) + 1
      );
    });
  }
  const rows = [...compositionCounts.entries()].map(([label, count]) => ({ label, count })).sort(
    (left, right) => getScaleCompositionRank(left.label) - getScaleCompositionRank(right.label) || right.count - left.count || left.label.localeCompare(right.label)
  );
  const labels = new Set(
    rows.filter((row) => row.label !== "\uAE30\uD0C0").map((row) => row.label)
  );
  const formation = labels.has("MRL/MLRS") && labels.has("\uAD70\uC6A9 \uD2B8\uB7ED") ? "\uD63C\uC131\uD3B8\uC131" : labels.size > 1 ? "\uBCF5\uD569\uD3B8\uC131" : labels.size === 1 ? "\uB2E8\uC77C\uACC4\uC5F4" : "\uAD6C\uC131\uB300\uAE30";
  const summary = rows.length ? rows.map((row) => `${row.label} ${row.count}\uB300`).join(" / ") : "\uAD6C\uC131\uB300\uAE30";
  return { rows, formation, summary };
}
function countTrackedScaleVehicles(detections) {
  const vehicleDetections = detections.filter(
    (box) => isScaleVehicleDetection(box.label)
  );
  const candidateDetections = vehicleDetections.length ? vehicleDetections : detections;
  const trackedIds = [
    ...new Set(
      candidateDetections.map((box) => box.trackId?.trim()).filter((trackId) => Boolean(trackId))
    )
  ];
  return {
    bboxCount: candidateDetections.length,
    trackedCount: trackedIds.length,
    count: trackedIds.length || candidateDetections.length,
    composition: summarizeScaleComposition(
      candidateDetections,
      trackedIds.length
    )
  };
}
function buildScaleDecision(inputs, perception) {
  const sourceTable = buildSudoScaleDoctrineSourceTable();
  const detections = perception?.detections ?? [];
  const trackedVehicles = countTrackedScaleVehicles(detections);
  const detectedCount = trackedVehicles.count;
  const count = Math.max(
    0,
    Math.round(detectedCount || inputs.observedVehicleCount)
  );
  const marchLengthM = Math.max(0, Math.round(inputs.marchColumnLengthM));
  const countScale = scaleFromCount(count);
  const marchScale = scaleFromMarchLength(marchLengthM);
  const perceptionScale = scaleFromPerceptionText(
    [perception?.label, perception?.summary].filter(Boolean).join(" ")
  );
  const scale = [countScale, marchScale, perceptionScale].filter((value) => Boolean(value)).reduce((current, candidate) => chooseHigherScale(current, candidate));
  const inputSource = detectedCount > 0 ? trackedVehicles.trackedCount > 0 ? "trackId" : "bbox" : "\uC785\uB825";
  const perceptionSuffix = perceptionScale ? `, AI/\uC6B4\uC601\uC790 \uB77C\uBCA8 ${perceptionScale}` : "";
  const compositionSuffix = detectedCount > 0 ? `, \uAD6C\uC131 ${trackedVehicles.composition.summary}(${trackedVehicles.composition.formation})` : "";
  const perceptionMetrics = perceptionScale ? [
    {
      label: "AI\uADDC\uBAA8",
      value: perceptionScale,
      tone: "blue"
    }
  ] : [];
  const compositionMetrics = detectedCount > 0 ? [
    {
      label: "\uC7A5\uBE44\uAD6C\uC131",
      value: trackedVehicles.composition.formation,
      tone: trackedVehicles.composition.formation === "\uD63C\uC131\uD3B8\uC131" ? "amber" : "blue"
    }
  ] : [];
  const perceptionRows = perceptionScale ? [
    {
      basis: "AI/\uC6B4\uC601\uC790\uB77C\uBCA8",
      observed: perception?.label ?? "",
      grade: perceptionScale
    }
  ] : [];
  const compositionRows = detectedCount > 0 ? [
    {
      basis: "\uC7A5\uBE44\uAD6C\uC131",
      observed: trackedVehicles.composition.summary,
      grade: trackedVehicles.composition.formation
    }
  ] : [];
  return {
    title: "\uD45C\uC801 \uADDC\uBAA8 \uC0B0\uCD9C",
    summary: `${inputs.marchRoute} \uD589\uAD70\uC7A5\uACBD ${marchLengthM}m\uC640 ${inputSource} \uC7A5\uBE44 ${count}\uB300${perceptionSuffix}${compositionSuffix}\uB97C \uAE30\uC900\uC73C\uB85C ${scale}\uB85C \uD310\uB2E8\uD569\uB2C8\uB2E4.`,
    metrics: [
      {
        label: "\uD0D0\uC9C0\uC218\uB7C9",
        value: `${count}\uB300`,
        tone: count > 0 ? "green" : "red"
      },
      {
        label: "\uD589\uAD70\uC7A5\uACBD",
        value: `${marchLengthM}m`,
        tone: marchLengthM >= 250 ? "green" : "amber"
      },
      {
        label: "\uD310\uC815",
        value: scale,
        tone: gradeBySeverity(scale) >= 2 ? "green" : "amber"
      },
      {
        label: "\uD504\uB808\uC784",
        value: `${perception?.frameCount ?? 0}\uC7A5`,
        tone: "blue"
      },
      ...perceptionMetrics,
      {
        label: "bbox",
        value: `${trackedVehicles.bboxCount}\uAC74`,
        tone: trackedVehicles.trackedCount > 0 ? "blue" : "amber"
      },
      ...compositionMetrics
    ],
    steps: [
      `${SUDO_SCALE_SOURCE_NAME}\uC758 240mm \uBC29\uC0AC\uD3EC \uC911\uB300 350m / \uB300\uB300 1500m \uD3B8\uC131\uD45C\uB97C \uC6D0\uBCF8 \uAE30\uC900\uC73C\uB85C \uB300\uC870\uD569\uB2C8\uB2E4.`,
      detectedCount > 0 ? trackedVehicles.trackedCount > 0 ? "\uD504\uB808\uC784\uBCC4 bbox\uB97C trackId \uAE30\uC900\uC73C\uB85C \uC911\uBCF5 \uC81C\uAC70\uD574 \uC7A5\uBE44\uB300\uC218\uB97C \uC0B0\uC815\uD569\uB2C8\uB2E4." : "\uD504\uB808\uC784\uBCC4 bbox\uB97C \uD569\uC0B0\uD574 \uC7A5\uBE44\uB300\uC218 \uD6C4\uBCF4\uB97C \uC218\uB7C9\uD654\uD569\uB2C8\uB2E4." : "Detector \uC218\uB7C9\uC774 \uC5C6\uC744 \uB54C\uB294 \uC6B4\uC601\uC790 \uC785\uB825 \uC7A5\uBE44\uB300\uC218\uB97C \uC218\uB3D9 \uAD00\uCE21\uAC12\uC73C\uB85C \uC0AC\uC6A9\uD569\uB2C8\uB2E4.",
      `${inputs.marchRoute} \uD589\uAD70\uC7A5\uACBD ${marchLengthM}m\uB97C \uC18C\uB300/\uC911\uB300/\uB300\uB300 \uAE30\uC900\uD45C\uC640 \uBE44\uAD50\uD569\uB2C8\uB2E4.`,
      perceptionScale ? "Gemma \uB610\uB294 \uC6B4\uC601\uC790 \uD655\uC815 \uB77C\uBCA8\uC5D0 \uD3EC\uD568\uB41C \uADDC\uBAA8 \uD45C\uD604\uC744 \uCD94\uAC00 \uD310\uC815\uADFC\uAC70\uB85C \uBC18\uC601\uD569\uB2C8\uB2E4." : "AI \uB77C\uBCA8\uC5D0 \uADDC\uBAA8 \uD45C\uD604\uC774 \uC5C6\uC73C\uBA74 \uC218\uB7C9\uACFC \uD589\uAD70\uC7A5\uACBD \uAE30\uC900\uC744 \uC6B0\uC120 \uC801\uC6A9\uD569\uB2C8\uB2E4.",
      "\uC7A5\uBE44\uB300\uC218 \uD310\uC815\uACFC \uD589\uAD70\uC7A5\uACBD \uD310\uC815 \uC911 \uB354 \uD070 \uADDC\uBAA8\uB97C \uD6C4\uC18D \uC804\uD22C\uC11C\uC5F4 \uD6C4\uBCF4 \uC810\uC218\uC5D0 \uBC18\uC601\uD569\uB2C8\uB2E4."
    ],
    sourceTables: [sourceTable],
    table: {
      title: "\uADDC\uBAA8 \uC0B0\uCD9C\uD45C",
      columns: [
        { key: "basis", label: "\uAE30\uC900" },
        { key: "observed", label: "\uAD00\uCE21" },
        { key: "grade", label: "\uD310\uC815" }
      ],
      rows: [
        {
          basis: "\uC7A5\uBE44\uB300\uC218",
          observed: trackedVehicles.trackedCount > 0 ? `${count}\uB300(track) / ${trackedVehicles.bboxCount}\uAC74(bbox)` : `${count}\uB300`,
          grade: countScale
        },
        {
          basis: "\uD589\uAD70\uC7A5\uACBD",
          observed: `${marchLengthM}m`,
          grade: marchScale
        },
        ...perceptionRows,
        ...compositionRows,
        {
          basis: "\uC885\uD569",
          observed: detectedCount > 0 ? `${count}\uB300 / ${marchLengthM}m / ${trackedVehicles.composition.formation}` : `${count}\uB300 / ${marchLengthM}m`,
          grade: scale
        }
      ]
    }
  };
}
var firingUnitRequiredHeRounds = 3;
function clampRatio(value) {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.max(0, Math.min(1, value));
}
function formatSignedDistanceKm(distanceKm) {
  const rounded = Math.round(Math.abs(distanceKm) * 10) / 10;
  return `${distanceKm >= 0 ? "+" : "-"}${rounded}km`;
}
function assessFiringUnit(unit) {
  const maxRangeKm = Math.max(0, unit.maxRangeKm);
  const distanceKm = Math.max(0, unit.distanceKm);
  const rangeMarginKm = maxRangeKm - distanceKm;
  const rangePossible = rangeMarginKm >= 0;
  const statusReady = unit.status === "\uAC00\uB2A5";
  const survivalOk = unit.survivalGuaranteed !== false;
  const civilianOk = unit.civilianSafe !== false;
  const combatOk = unit.combatReady !== false;
  const ammoOk = unit.ammo >= firingUnitRequiredHeRounds;
  const eligible = rangePossible && statusReady && survivalOk && civilianOk && combatOk && ammoOk;
  const rangeScore = rangePossible ? 70 + clampRatio(rangeMarginKm / Math.max(maxRangeKm, 1)) * 30 : clampRatio(maxRangeKm / Math.max(distanceKm, 1)) * 45;
  const ammoScore = clampRatio(unit.ammo / 100) * 100;
  const csrScore = clampRatio(unit.csr / 100) * 100;
  const survivalScore = survivalOk ? 100 : 18;
  const civilianScore = civilianOk ? 100 : 22;
  const readinessScore = statusReady && combatOk ? 100 : unit.status === "\uB300\uAE30" ? 42 : combatOk ? 34 : 15;
  const score = Math.round(
    rangeScore * 0.24 + survivalScore * 0.22 + ammoScore * 0.18 + civilianScore * 0.16 + readinessScore * 0.12 + csrScore * 0.08
  );
  const limitingReasons = [
    rangePossible ? void 0 : `\uC0AC\uAC70\uB9AC ${formatSignedDistanceKm(rangeMarginKm)}`,
    survivalOk ? void 0 : "\uC0DD\uC874\uC131",
    ammoOk ? void 0 : `HE ${firingUnitRequiredHeRounds}R \uBBF8\uB9CC`,
    civilianOk ? void 0 : "\uBBFC\uAC04\uD53C\uD574",
    statusReady && combatOk ? void 0 : "\uC804\uD22C\uC900\uBE44"
  ].filter((reason) => Boolean(reason));
  return {
    ...unit,
    rangeMarginKm,
    rangePossible,
    ammoOk,
    survivalOk,
    civilianOk,
    combatOk: statusReady && combatOk,
    eligible,
    score,
    rangeScore: Math.round(rangeScore),
    ammoScore: Math.round(ammoScore),
    csrScore: Math.round(csrScore),
    survivalScore,
    civilianScore,
    readinessScore,
    limitingReasons
  };
}
function buildFiringUnitDecision(inputs) {
  const sourceTable = buildSudoFiringUnitSourceTable();
  const ranked = inputs.fireUnits.map(assessFiringUnit).sort(
    (left, right) => Number(right.eligible) - Number(left.eligible) || right.score - left.score || right.csr - left.csr || right.ammo - left.ammo || left.distanceKm - right.distanceKm
  );
  const bestEligible = ranked.find((unit) => unit.eligible);
  const best = bestEligible ?? ranked[0];
  const hasEligibleUnit = Boolean(bestEligible);
  if (!best) {
    return {
      title: "\uC0AC\uACA9\uBD80\uB300 \uC0B0\uCD9C",
      summary: "\uC0AC\uACA9\uBD80\uB300 \uD6C4\uBCF4\uAC00 \uC5C6\uC5B4 \uCD94\uCC9C\uC744 \uC0B0\uCD9C\uD560 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4.",
      metrics: [
        { label: "\uCD94\uCC9C\uBD80\uB300", value: "\uC870\uAC74 \uCDA9\uC871 \uBD80\uB300 \uC5C6\uC74C", tone: "red" },
        { label: "\uC0B0\uCD9C\uC810\uC218", value: "0/100", tone: "red" }
      ],
      steps: ["\uC0AC\uACA9\uBD80\uB300 \uD6C4\uBCF4 \uC785\uB825\uC774 \uD544\uC694\uD569\uB2C8\uB2E4."],
      sourceTables: [sourceTable],
      table: {
        title: "8-1 \uCD5C\uC801 \uC0AC\uACA9\uBD80\uB300 \uD310\uB2E8\uD45C",
        columns: [
          { key: "unit", label: "\uBD80\uB300" },
          { key: "grade", label: "\uD310\uC815" }
        ],
        rows: []
      }
    };
  }
  const bestLimit = best.limitingReasons.length > 0 ? best.limitingReasons.join(", ") : "\uC81C\uD55C \uC5C6\uC74C";
  const rangeSummary = `${formatDistanceKm(best.distanceKm)} / ${formatDistanceKm(
    best.maxRangeKm
  )} ${best.rangePossible ? "\uAC00\uB2A5" : "\uBD88\uAC00"}(${formatSignedDistanceKm(
    best.rangeMarginKm
  )})`;
  const buildGrade = (unit) => {
    if (bestEligible?.unit === unit.unit) {
      return "\uCD94\uCC9C";
    }
    if (unit.eligible) {
      return "\uAC00\uB2A5";
    }
    if (!unit.rangePossible) {
      return "\uC0AC\uAC70\uB9AC\uC81C\uD55C";
    }
    if (!unit.survivalOk) {
      return "\uC0DD\uC874\uC131\uC81C\uD55C";
    }
    if (!unit.ammoOk) {
      return "\uD0C4\uBD80\uC871";
    }
    if (!unit.civilianOk) {
      return "\uBBFC\uAC04\uD53C\uD574\uC81C\uD55C";
    }
    if (!unit.combatOk) {
      return "\uC804\uD22C\uC900\uBE44\uC81C\uD55C";
    }
    return "\uC81C\uD55C";
  };
  return {
    title: "\uC0AC\uACA9\uBD80\uB300 \uC0B0\uCD9C",
    summary: hasEligibleUnit ? `${best.unit}\uB97C \uCD94\uCC9C\uD569\uB2C8\uB2E4. \uC0AC\uAC70\uB9AC ${rangeSummary}, HE ${best.ammo}R, CSR ${best.csr}%\uC774\uBA70 \uC0DD\uC874\uC131/\uBBFC\uAC04\uD53C\uD574/\uC804\uD22C\uC900\uBE44 \uC81C\uD55C\uC774 \uC5C6\uC2B5\uB2C8\uB2E4.` : `\uCD5C\uACE0\uC810 \uD6C4\uBCF4 ${best.unit}\uB3C4 ${bestLimit} \uC870\uAC74 \uB54C\uBB38\uC5D0 \uC120\uC815 \uBD88\uAC00\uC785\uB2C8\uB2E4. \uC0AC\uAC70\uB9AC, \uC0DD\uC874\uC131, HE ${firingUnitRequiredHeRounds}R, \uBBFC\uAC04\uD53C\uD574, \uC804\uD22C\uC900\uBE44\uB97C \uC7AC\uD655\uC778\uD574\uC57C \uD569\uB2C8\uB2E4.`,
    metrics: [
      {
        label: "\uCD94\uCC9C\uBD80\uB300",
        value: hasEligibleUnit ? best.unit : "\uC870\uAC74 \uCDA9\uC871 \uBD80\uB300 \uC5C6\uC74C",
        tone: hasEligibleUnit ? "green" : "red"
      },
      { label: "\uC0B0\uCD9C\uC810\uC218", value: `${best.score}/100`, tone: "blue" },
      { label: "HE", value: `${best.ammo}R`, tone: "amber" },
      {
        label: "\uC0AC\uAC70\uB9AC",
        value: rangeSummary,
        tone: best.rangePossible ? "green" : "red"
      },
      {
        label: "\uC0DD\uC874\uC131",
        value: best.survivalOk ? "\uBCF4\uC7A5" : "\uC81C\uD55C",
        tone: best.survivalOk ? "green" : "red"
      },
      {
        label: "\uBBFC\uAC04\uD53C\uD574",
        value: best.civilianOk ? "\uD53C\uD574\uC5C6\uC74C" : "\uC81C\uD55C",
        tone: best.civilianOk ? "green" : "red"
      }
    ],
    steps: [
      `${SUDO_FIRING_UNIT_SOURCE_NAME} #1\uC758 \uC0AC\uAC70\uB9AC, \uC0DD\uC874\uC131\uBCF4\uC7A5, \uD0C4\uBCF4\uC720\uB7C9, \uBBFC\uAC04\uD53C\uD574, \uC804\uD22C\uB825\uC218\uC900 5\uAC1C \uD56D\uBAA9\uC744 \uC6D0\uBCF8 \uD3C9\uAC00\uD45C\uC640 \uB300\uC870\uD569\uB2C8\uB2E4.`,
      "\uD45C\uC801\uAC70\uB9AC\uC640 \uBD80\uB300 \uCD5C\uB300\uC0AC\uAC70\uB9AC \uCC28\uC774\uB97C \uACC4\uC0B0\uD574 \uC0AC\uAC70\uB9AC \uC810\uC218 24%\uB85C \uBC18\uC601\uD569\uB2C8\uB2E4.",
      `HE 6\uBC1C \uAE30\uC900 \uD544\uC694 \uD0C4\uB7C9 ${firingUnitRequiredHeRounds}R \uC774\uC0C1\uC778\uC9C0 \uD655\uC778\uD558\uACE0 \uD0C4\uBCF4\uC720 \uC810\uC218 18%\uB85C \uBC18\uC601\uD569\uB2C8\uB2E4.`,
      "\uC0DD\uC874\uC131 22%, \uBBFC\uAC04\uD53C\uD574 16%, \uC804\uD22C\uC900\uBE44 12%, CSR 8%\uB97C \uD569\uC0B0\uD574 \uD6C4\uBCF4\uB97C \uC815\uB82C\uD569\uB2C8\uB2E4.",
      hasEligibleUnit ? `${best.unit}\uAC00 \uBAA8\uB4E0 \uD544\uC218\uC870\uAC74\uC744 \uD1B5\uACFC\uD574 \uCD94\uCC9C\uC73C\uB85C \uD45C\uC2DC\uB429\uB2C8\uB2E4.` : `${best.unit}\uAC00 \uCD5C\uACE0\uC810\uC774\uB098 ${bestLimit} \uC81C\uD55C\uC73C\uB85C \uCD94\uCC9C\uC5D0\uC11C \uC81C\uC678\uB429\uB2C8\uB2E4.`
    ],
    sourceTables: [sourceTable],
    table: {
      title: "8-1 \uCD5C\uC801 \uC0AC\uACA9\uBD80\uB300 \uD310\uB2E8\uD45C",
      columns: [
        { key: "unit", label: "\uBD80\uB300" },
        { key: "range", label: "\uC0AC\uAC70\uB9AC" },
        { key: "survival", label: "\uC0DD\uC874\uC131" },
        { key: "ammo", label: "\uD0C4\uBCF4\uC720\uB7C9" },
        { key: "civilian", label: "\uBBFC\uAC04\uD53C\uD574" },
        { key: "combat", label: "\uC804\uD22C\uB825" },
        { key: "csr", label: "CSR" },
        { key: "score", label: "\uC810\uC218" },
        { key: "grade", label: "\uD310\uC815" }
      ],
      rows: ranked.map((unit) => ({
        unit: unit.unit,
        range: `${formatDistanceKm(unit.distanceKm)} / ${formatDistanceKm(
          unit.maxRangeKm
        )} ${unit.rangePossible ? "\uAC00\uB2A5" : "\uBD88\uAC00"}(${formatSignedDistanceKm(
          unit.rangeMarginKm
        )})`,
        survival: unit.survival ?? "\uD655\uC778",
        ammo: `HE ${unit.ammo}R`,
        civilian: unit.civilianImpact ?? "\uAC80\uD1A0",
        combat: `${unit.status} / ${unit.combatReady !== false ? "\uC900\uBE44" : "\uBD88\uAC00"}`,
        csr: `${unit.csr}%`,
        score: `${unit.score}`,
        grade: buildGrade(unit)
      }))
    }
  };
}
var SUDO_COLLATERAL_REQUIRED_SAFETY_MARGIN_M = 300;
var collateralRequiredSafetyMarginM = SUDO_COLLATERAL_REQUIRED_SAFETY_MARGIN_M;
var collateralMunitionProfile = {
  HE: { suitability: 78, availability: 96, riskPenalty: 0 },
  HEBB: { suitability: 96, availability: 94, riskPenalty: 0 },
  DP: { suitability: 84, availability: 82, riskPenalty: 12 },
  DPBB: { suitability: 88, availability: 78, riskPenalty: 18 },
  \uACE0\uD3ED\uC720\uB3C4\uD0C4: { suitability: 76, availability: 58, riskPenalty: 0 },
  \uBD84\uC0B0\uC720\uB3C4\uD0C4: { suitability: 70, availability: 56, riskPenalty: 24 }
};
function getCollateralProfile(munition) {
  return collateralMunitionProfile[munition] ?? {
    suitability: 70,
    availability: 60,
    riskPenalty: 8
  };
}
function getCollateralRiskGrade(marginM) {
  if (marginM < 0) {
    return "CDE-4 \uC911\uCCA9";
  }
  if (marginM < collateralRequiredSafetyMarginM) {
    return "CDE-3 \uC81C\uD55C";
  }
  if (marginM < collateralRequiredSafetyMarginM * 2) {
    return "CDE-2 \uC8FC\uC758";
  }
  return "CDE-1 \uC548\uC804";
}
function assessCollateralMunition(row, nearestCivilianM) {
  const munition = row.munition.trim() || "\uD0C4\uC885";
  const radiusM = Number.isFinite(row.radiusM) ? Math.max(0, row.radiusM) : 0;
  const marginM = nearestCivilianM - radiusM;
  const allowed = marginM >= collateralRequiredSafetyMarginM;
  const profile2 = getCollateralProfile(munition);
  const marginScore = allowed ? Math.min(100, 58 + (marginM - collateralRequiredSafetyMarginM) / 7) : Math.max(0, 35 + marginM / 8);
  const reserveScore = Math.min(100, Math.max(0, marginM / 8));
  const score = Math.max(
    0,
    Math.round(
      marginScore * 0.45 + profile2.suitability * 0.35 + profile2.availability * 0.12 + reserveScore * 0.08 - profile2.riskPenalty
    )
  );
  return {
    munition,
    radiusM,
    nearestCivilianM,
    marginM,
    allowed,
    suitability: profile2.suitability,
    availability: profile2.availability,
    riskGrade: getCollateralRiskGrade(marginM),
    score
  };
}
function buildCollateralDecision(inputs) {
  const munitions = inputs.collateralMunitions.length > 0 ? inputs.collateralMunitions : collateralRows;
  const assessed = munitions.map((row) => assessCollateralMunition(row, inputs.nearestCivilianM)).sort(
    (left, right) => Number(right.allowed) - Number(left.allowed) || right.score - left.score || left.radiusM - right.radiusM || left.munition.localeCompare(right.munition)
  );
  const allowed = assessed.filter((row) => row.allowed);
  const restricted = assessed.filter((row) => !row.allowed);
  const best = allowed[0] ?? assessed[0];
  const safeList = allowed.map((row) => row.munition).join(", ") || "\uC5C6\uC74C";
  const restrictedList = restricted.map((row) => row.munition).join(", ") || "\uC5C6\uC74C";
  const cdeSourceTable = buildSudoCollateralCdeSourceTable();
  return {
    title: "\uBD80\uC218\uD53C\uD574 \uC0B0\uCD9C",
    summary: allowed.length > 0 ? `${best.munition}\uC744 \uCD94\uCC9C\uD569\uB2C8\uB2E4. \uBBFC\uAC00\uAE4C\uC9C0 ${best.marginM}m \uC548\uC804\uC5EC\uC720, ${best.riskGrade}, CDE \uC810\uC218 ${best.score}\uC810\uC774\uBA70 \uD5C8\uC6A9 \uD0C4\uC885\uC740 ${safeList}\uC785\uB2C8\uB2E4${restricted.length > 0 ? `. ${restrictedList}\uC740 \uC548\uC804\uC5EC\uC720 ${collateralRequiredSafetyMarginM}m \uBBF8\uB9CC\uC73C\uB85C \uC81C\uD55C\uD569\uB2C8\uB2E4` : ""}.` : `\uBAA8\uB4E0 \uD0C4\uC885\uC774 \uBBFC\uAC00 \uC548\uC804\uC5EC\uC720 ${collateralRequiredSafetyMarginM}m\uB97C \uCDA9\uC871\uD558\uC9C0 \uBABB\uD574 \uC7AC\uAC80\uD1A0\uAC00 \uD544\uC694\uD569\uB2C8\uB2E4.`,
    metrics: [
      {
        label: "\uCD94\uCC9C\uD0C4\uC885",
        value: best?.allowed ? best.munition : "\uCD94\uCC9C \uC5C6\uC74C",
        tone: best?.allowed ? "green" : "red"
      },
      {
        label: "\uCD5C\uADFC\uC811 \uBBFC\uAC00",
        value: `${Math.round(inputs.nearestCivilianM / 10) / 100}km`,
        tone: allowed.length > 0 ? "green" : "red"
      },
      {
        label: "\uD5C8\uC6A9\uD0C4\uC885",
        value: safeList,
        tone: allowed.length > 0 ? "blue" : "red"
      },
      {
        label: "\uC81C\uD55C",
        value: restrictedList,
        tone: restricted.length > 0 ? "red" : "green"
      },
      {
        label: "\uC548\uC804\uC5EC\uC720",
        value: best ? `${best.marginM}m` : "0m",
        tone: best?.allowed ? "green" : "red"
      },
      {
        label: "CDE\uB4F1\uAE09",
        value: best?.riskGrade ?? "CDE-4 \uC911\uCCA9",
        tone: best?.allowed ? "green" : "red"
      }
    ],
    steps: [
      `\uD45C\uC801\uC88C\uD45C\uC5D0\uC11C \uBBFC\uAC00\uC9C0\uC5ED \uCD5C\uB2E8\uAC70\uB9AC\uB97C ${inputs.nearestCivilianM}m\uB85C \uC0B0\uCD9C\uD569\uB2C8\uB2E4.`,
      `\uD0C4\uC885\uBCC4 \uD6A8\uACFC\uBC18\uACBD\uACFC \uCD5C\uB2E8\uAC70\uB9AC\uB97C \uBE44\uAD50\uD574 \uC548\uC804\uC5EC\uC720 ${collateralRequiredSafetyMarginM}m \uC774\uC0C1\uC778 \uD0C4\uC885\uB9CC \uD5C8\uC6A9\uD569\uB2C8\uB2E4.`,
      `${SUDO_COLLATERAL_CDE_SOURCE_NAME} \uC6D0\uBCF8\uD45C(${SUDO_COLLATERAL_CDE_SOURCE_PATH})\uC758 ${cdeSourceTable.rows.length}\uAC1C \uC0AC\uAC70\uB9AC \uC911 18km \uD589\uC744 \uD604\uC7AC CDE \uBC18\uACBD\uC73C\uB85C \uC801\uC6A9\uD569\uB2C8\uB2E4.`,
      "\uD5C8\uC6A9 \uD0C4\uC885\uC740 \uC548\uC804\uC5EC\uC720 45%, \uD45C\uC801\uD6A8\uACFC \uC801\uD569\uB3C4 35%, \uAC00\uC6A9\uC131 12%, \uC5EC\uC720\uD3ED 8%\uB85C \uC810\uC218\uD654\uD569\uB2C8\uB2E4.",
      best?.allowed ? `${best.munition}\uC774 CDE \uC810\uC218 ${best.score}\uC810\uC73C\uB85C \uCD94\uCC9C\uD0C4\uC885\uC785\uB2C8\uB2E4.` : "\uD5C8\uC6A9 \uD0C4\uC885\uC774 \uC5C6\uC5B4 \uC0AC\uACA9\uBC29\uBC95 \uB610\uB294 \uD0C4\uC885 \uC7AC\uC120\uC815\uC774 \uD544\uC694\uD569\uB2C8\uB2E4."
    ],
    table: {
      title: "\uBD80\uC218\uD53C\uD574 \uBC18\uACBD\uD45C",
      columns: [
        { key: "munition", label: "\uD0C4\uC885" },
        { key: "radius", label: "\uBC18\uACBD" },
        { key: "margin", label: "\uC5EC\uC720" },
        { key: "risk", label: "CDE" },
        { key: "score", label: "\uC810\uC218" },
        { key: "grade", label: "\uD310\uC815" }
      ],
      rows: assessed.map((row) => ({
        munition: row.munition,
        radius: `${row.radiusM}m`,
        margin: `${row.marginM}m`,
        risk: row.riskGrade,
        score: `${row.score}`,
        grade: best?.munition === row.munition && row.allowed ? "\uCD94\uCC9C" : row.allowed ? "\uC0AC\uC6A9\uAC00\uB2A5" : "\uC81C\uD55C"
      }))
    },
    sourceTables: [cdeSourceTable]
  };
}
function scoreOrderCandidate(candidate, detectedRocket) {
  const distanceKm = Number.isFinite(candidate.distanceKm) ? Math.max(0, candidate.distanceKm) : 0;
  const guns = Number.isFinite(candidate.guns) ? Math.max(0, candidate.guns) : 0;
  const directionMatchPercent = Number.isFinite(candidate.directionMatchPercent) ? Math.max(0, Math.min(100, candidate.directionMatchPercent)) : 0;
  const weaponLabel = candidate.weapon.toLowerCase();
  const rocketWeapon = /240|m-?1991|122|방사포|rocket|mrl|mlrs|tel/.test(
    weaponLabel
  );
  const sourceRank = Number.parseInt(candidate.sourceRank ?? "", 10);
  const distanceScore = Math.max(0, 34 - distanceKm * 0.7);
  const gunsScore = Math.min(guns / 18, 1) * 24;
  const directionScore = directionMatchPercent * 0.2;
  const weaponScore = detectedRocket ? rocketWeapon ? 22 : 8 : 14;
  const sourceRankScore = Number.isFinite(sourceRank) ? Math.max(0, 12 - sourceRank * 2) : candidate.sourceRank === "\uC81C\uC678" ? -8 : 0;
  return Math.min(
    99,
    Math.round(
      distanceScore + gunsScore + directionScore + weaponScore + sourceRankScore
    )
  );
}
function buildOrderDecision(inputs, perception) {
  const detectedRocket = hasRocketTargetEvidence(
    `${inputs.targetLabel} ${perception?.label ?? ""} ${perception?.summary ?? ""} ${perception?.detections.map((box) => `${box.label} ${box.rawLabel ?? ""} ${box.role ?? ""}`).join(" ")}`
  );
  const candidates = inputs.orderCandidates.length > 0 ? inputs.orderCandidates : orderCandidates;
  const sourceTable = buildSudoOrderCandidateSourceTable();
  const ranked = candidates.map((candidate) => ({
    ...candidate,
    score: scoreOrderCandidate(candidate, detectedRocket)
  })).sort((left, right) => right.score - left.score);
  const best = ranked[0];
  return {
    title: "\uC804\uD22C\uC11C\uC5F4 \uC0B0\uCD9C",
    summary: `${best.unit}\uAC00 ${detectedRocket ? "240mm \uBC29\uC0AC\uD3EC \uD0D0\uC9C0 \uACB0\uACFC\uC640 " : ""}${formatDistanceKm(best.distanceKm)} \uC774\uACA9, ${best.weapon} ${best.guns}\uBB38, \uAD00\uCE21\uBC29\uD5A5 ${best.directionMatchPercent}% \uC870\uAC74\uC5D0\uC11C \uCD5C\uC0C1\uC704 \uD6C4\uBCF4\uC785\uB2C8\uB2E4.`,
    metrics: [
      { label: "1\uC21C\uC704", value: best.unit, tone: "green" },
      { label: "\uC774\uACA9", value: formatDistanceKm(best.distanceKm), tone: "blue" },
      { label: "\uB9E4\uCE6D", value: `${best.score}%`, tone: "amber" }
    ],
    steps: [
      `${SUDO_ORDER_CANDIDATE_SOURCE_NAME} \uC6D0\uBCF8\uD45C ${sourceTable.rows.length}\uAC1C \uD6C4\uBCF4\uB97C \uD45C\uC801\uC88C\uD45C BH 12345 67890 \uAE30\uC900\uC73C\uB85C \uBD88\uB7EC\uC635\uB2C8\uB2E4.`,
      "\uB4DC\uB860 \uD45C\uC801\uC88C\uD45C\uC640 \uC778\uADFC \uBD80\uB300 \uC704\uCE58 DB \uAC04 \uAC70\uB9AC\uB97C \uACC4\uC0B0\uD569\uB2C8\uB2E4.",
      detectedRocket ? "Detector/Gemma4\uAC00 \uD310\uC815\uD55C 240mm \uBC29\uC0AC\uD3EC \uD45C\uC801\uC131\uC9C8\uC744 \uD6C4\uBCF4\uBD80\uB300 \uBCF4\uC720\uD654\uD3EC\uC640 \uB9E4\uCE6D\uD569\uB2C8\uB2E4." : "\uBCF4\uC720\uD654\uD3EC \uC218\uB7C9\uACFC \uD45C\uC801\uC131\uC9C8\uC744 \uB9E4\uCE6D\uD569\uB2C8\uB2E4.",
      "\uC774\uACA9\uAC70\uB9AC, \uBCF4\uC720\uD654\uD3EC \uC218\uB7C9, \uD654\uAE30\uBA85, \uAD00\uCE21\uBC29\uD5A5 \uC77C\uCE58\uC728, 4-1 \uD310\uC815\uC21C\uC704\uB97C \uD569\uC0B0\uD574 \uD6C4\uBCF4\uB97C \uC815\uB82C\uD569\uB2C8\uB2E4."
    ],
    table: {
      title: "\uC804\uD22C\uC11C\uC5F4 \uD6C4\uBCF4 \uC810\uC218",
      columns: [
        { key: "targetCoordinate", label: "\uD45C\uC801\uC88C\uD45C" },
        { key: "coordinate", label: "\uC88C\uD45C" },
        { key: "unit", label: "\uD6C4\uBCF4" },
        { key: "weapon", label: "\uBCF4\uC720\uD654\uAE30" },
        { key: "distance", label: "\uC774\uACA9" },
        { key: "equipment", label: "\uBCF4\uC720\uC7A5\uBE44" },
        { key: "direction", label: "\uBC29\uD5A5" },
        { key: "sourceRank", label: "4-1\uC21C\uC704" },
        { key: "score", label: "\uC810\uC218" }
      ],
      rows: ranked.map((candidate) => ({
        targetCoordinate: candidate.targetCoordinate ?? "BH 12345 67890",
        coordinate: candidate.coordinate ?? "-",
        unit: candidate.unit,
        weapon: candidate.weapon,
        distance: formatDistanceKm(candidate.distanceKm),
        guns: `${candidate.guns}\uBB38`,
        equipment: candidate.equipment ?? `${candidate.guns}\uBB38`,
        direction: `${candidate.directionMatchPercent}%`,
        sourceRank: candidate.sourceRank ?? candidate.grade ?? "-",
        score: `${candidate.score}%`
      }))
    },
    sourceTables: [sourceTable]
  };
}
function clampDecisionPercent(value, fallback = 0) {
  return Number.isFinite(value) ? Math.max(0, Math.min(100, value)) : fallback;
}
function getRouteRoadNos(route) {
  return Array.from(route.matchAll(/(\d+)\s*번/g), (match) => match[1]).filter(
    (roadNo, index, roadNos) => roadNos.indexOf(roadNo) === index
  );
}
function getLaneCount(lanes) {
  const parsed = Number.parseInt(lanes.match(/(\d+)/)?.[1] ?? "", 10);
  return Number.isFinite(parsed) ? parsed : 0;
}
function getBridgeTonnageLimit(judgment) {
  const normalized = judgment.toLowerCase();
  const parsed = Number.parseInt(
    normalized.match(/(\d+)\s*t/)?.[1] ?? normalized.match(/(\d+)\s*톤/)?.[1] ?? "",
    10
  );
  return Number.isFinite(parsed) ? parsed : void 0;
}
function assessRoadInfo(road) {
  const laneCount = getLaneCount(road.lanes);
  const noBridge = road.bridge === "\uB2E4\uB9AC \uC5C6\uC74C";
  const tonnageLimit = getBridgeTonnageLimit(road.judgment);
  const normalizedJudgment = road.judgment.replace(/\s+/g, " ");
  const useProbability = road.useProbability;
  let roadScore = useProbability !== void 0 ? clampDecisionPercent(useProbability, 50) : 42 + Math.min(24, laneCount * 4);
  roadScore += Math.min(18, laneCount * 2);
  roadScore += noBridge ? 14 : tonnageLimit === void 0 ? -4 : tonnageLimit >= 40 ? 8 : tonnageLimit >= 30 ? 2 : -22;
  if (/주\s*예상|주\s*이동|주축/i.test(normalizedJudgment)) {
    roadScore += 12;
  } else if (/대안|우회/i.test(normalizedJudgment)) {
    roadScore += 7;
  } else if (/보조/i.test(normalizedJudgment)) {
    roadScore += 3;
  }
  if (/제한|불가|침수|파손|차단|20t\s*이하|20톤\s*이하/i.test(normalizedJudgment)) {
    roadScore -= 18;
  }
  const clampedRoadScore = Math.round(clampDecisionPercent(roadScore, 50));
  const roadStatus = clampedRoadScore < 45 || /제한|불가|차단/i.test(normalizedJudgment) ? "\uC81C\uD55C\uCD95" : /주\s*예상|주\s*이동|주축/i.test(normalizedJudgment) ? "\uC8FC\uCD95" : /대안|우회/i.test(normalizedJudgment) ? "\uB300\uC548\uCD95" : "\uBCF4\uC870\uCD95";
  const roadBasis = `${road.road} \uB3C4\uB85C ${road.lanes}, ${road.bridge}, ${road.judgment}`;
  return {
    road,
    roadLabel: road.road,
    roadScore: clampedRoadScore,
    roadStatus,
    roadBasis
  };
}
var roadStatusRank = {
  \uC81C\uD55C\uCD95: 0,
  \uBBF8\uD655\uC778: 1,
  \uBCF4\uC870\uCD95: 2,
  \uB300\uC548\uCD95: 3,
  \uC8FC\uCD95: 4
};
function assessCompositeRouteRoad(roads) {
  const assessments = roads.map(assessRoadInfo);
  const worstAssessment = assessments.reduce(
    (worst, current) => roadStatusRank[current.roadStatus] < roadStatusRank[worst.roadStatus] ? current : worst
  );
  const constrainedCount = assessments.filter(
    (assessment) => assessment.roadStatus === "\uC81C\uD55C\uCD95"
  ).length;
  const averageScore = assessments.reduce((total, assessment) => total + assessment.roadScore, 0) / Math.max(1, assessments.length);
  const roadScore = Math.round(
    clampDecisionPercent(
      constrainedCount > 0 ? Math.min(
        worstAssessment.roadScore,
        averageScore - constrainedCount * 10
      ) : averageScore,
      50
    )
  );
  return {
    road: assessments[0]?.road,
    roadLabel: assessments.map((assessment) => assessment.roadLabel).join("\xB7"),
    roadScore,
    roadStatus: constrainedCount > 0 ? "\uC81C\uD55C\uCD95" : worstAssessment.roadStatus,
    roadBasis: assessments.map((assessment) => assessment.roadBasis).join(" / ")
  };
}
function assessRouteRoad(option, roads) {
  const routeRoadNos = getRouteRoadNos(option.route);
  const matchedRoads = routeRoadNos.map(
    (roadNo) => roads.find((candidate) => candidate.road.replace(/\D/g, "") === roadNo)
  ).filter((road2) => Boolean(road2));
  const routeRoadNo = routeRoadNos[0];
  if (matchedRoads.length > 1) {
    return assessCompositeRouteRoad(matchedRoads);
  }
  const road = matchedRoads[0] ?? roads.find((candidate) => option.route.includes(candidate.road));
  if (road) {
    return assessRoadInfo(road);
  }
  const primaryRoad = roads.find((candidate) => candidate.road === "3\uBC88") ?? roads.find((candidate) => candidate.road === "13\uBC88") ?? roads.find((candidate) => candidate.useProbability !== void 0);
  if (primaryRoad && /기존|NAI|TAI|감시선/i.test(option.route)) {
    return {
      ...assessRoadInfo(primaryRoad),
      roadStatus: "\uBBF8\uD655\uC778"
    };
  }
  return {
    roadLabel: routeRoadNo ? `${routeRoadNo}\uBC88` : "\uBBF8\uC9C0\uC815",
    roadScore: 45,
    roadStatus: "\uBBF8\uD655\uC778",
    roadBasis: "\uC608\uC0C1\uC774\uB3D9\uB85C\uC640 9-1 \uB3C4\uB85C\uC815\uBCF4\uD45C \uB9E4\uCE6D \uD544\uC694"
  };
}
function scoreRouteOption(option, roadAssessment) {
  const coverage = Number.isFinite(option.coverage) ? Math.max(0, Math.min(100, option.coverage)) : 0;
  const gap = Number.isFinite(option.gap) ? Math.max(0, Math.min(100, option.gap)) : 100;
  const fireLinkScore = Number.isFinite(option.fireLinkScore) ? Math.max(0, Math.min(100, option.fireLinkScore)) : 0;
  return Math.round(
    coverage * 0.34 + (100 - gap) * 0.26 + fireLinkScore * 0.18 + roadAssessment.roadScore * 0.22
  );
}
function buildCoaDecision(inputs) {
  const sourceTables = buildSudoSituationAnalysisSourceTables();
  const options = inputs.routeOptions.length > 0 ? inputs.routeOptions : routeOptions;
  const roads = inputs.roadInfoRows.length > 0 ? inputs.roadInfoRows : roadInfoRows;
  const ranked = options.map((option) => {
    const roadAssessment = assessRouteRoad(option, roads);
    return {
      ...option,
      ...roadAssessment,
      score: scoreRouteOption(option, roadAssessment)
    };
  }).sort((left, right) => {
    if (left.score !== right.score) {
      return right.score - left.score;
    }
    if (left.roadScore !== right.roadScore) {
      return right.roadScore - left.roadScore;
    }
    return right.coverage - left.coverage;
  });
  const best = ranked[0];
  const primaryRoad = best.road ?? roads.find((road) => road.road === "3\uBC88") ?? roads.find((road) => road.road === "13\uBC88") ?? roads.find((road) => road.useProbability !== void 0) ?? roads[0];
  const constrainedRoads = roads.filter(
    (road) => road.bridge !== "\uB2E4\uB9AC \uC5C6\uC74C" || assessRoadInfo(road).roadStatus === "\uC81C\uD55C\uCD95"
  );
  const roadBasis = primaryRoad ? `${primaryRoad.road} \uB3C4\uB85C ${primaryRoad.lanes}, ${primaryRoad.bridge}, ${primaryRoad.judgment}` : "\uB3C4\uB85C\uC815\uBCF4\uD45C \uBBF8\uC785\uB825";
  const constrainedBasis = constrainedRoads.slice(0, 3).map((road) => `${road.road} ${road.bridge}(${road.judgment})`).join(", ");
  return {
    title: "\uC0AC\uD0DC\uBD84\uC11D\uB3C4 \uC0B0\uCD9C",
    summary: `${best.option}\uAC00 ${best.route} \uC608\uC0C1\uC774\uB3D9\uB85C\uC5D0\uC11C \uAC10\uC2DC\uC728 ${best.coverage}%, \uACF5\uBC31 ${best.gap}%, \uD654\uB825\uC5F0\uACC4 ${best.fireLinkScore}%, \uB3C4\uB85C\uAC00\uC6A9 ${best.roadScore}%(${best.roadStatus})\uB85C NAI/DP/TAI \uC870\uC815\uC548\uC5D0 \uAC00\uC7A5 \uC801\uD569\uD569\uB2C8\uB2E4. ${best.roadBasis}\uB97C \uC8FC \uC774\uB3D9\uADFC\uAC70\uB85C \uBC18\uC601\uD569\uB2C8\uB2E4.`,
    metrics: [
      {
        label: "\uCD94\uCC9C\uC548",
        value: best.option.replace("\uC0AC\uD0DC\uBD84\uC11D\uB3C4 ", ""),
        tone: "green"
      },
      { label: "\uAC10\uC2DC\uC728", value: `${best.coverage}%`, tone: "blue" },
      { label: "\uACF5\uBC31", value: `${best.gap}%`, tone: "amber" },
      {
        label: "\uB3C4\uB85C\uAC00\uC6A9",
        value: `${best.roadScore}%`,
        tone: best.roadStatus === "\uC81C\uD55C\uCD95" ? "red" : "green"
      }
    ],
    steps: [
      `${SUDO_SITUATION_ANALYSIS_SOURCE_NAME} slide 1\uC758 \uC0AC\uD0DC\uBD84\uC11D\uB3C4 #1 30% / #2 70%\uC640 slide 2 \uB3C4\uB85C\uC815\uBCF4\uD45C\uB97C \uC6D0\uBCF8\uADFC\uAC70\uB85C \uB300\uC870\uD569\uB2C8\uB2E4.`,
      `${best.route} \uC608\uC0C1 \uC774\uB3D9\uB85C\uB97C \uAE30\uC900\uC120\uC73C\uB85C \uC124\uC815\uD569\uB2C8\uB2E4.`,
      `9-1 \uB3C4\uB85C\uC815\uBCF4\uD45C: ${roadBasis}${constrainedBasis ? `, \uC81C\uD55C\uCD95 ${constrainedBasis}` : ""}.`,
      "\uAC01 \uD310\uB2E8\uC548\uC758 \uAC10\uC2DC\uC728, \uAC10\uC2DC\uACF5\uBC31, \uD654\uB825\uC5F0\uACC4, \uB3C4\uB85C\uAC00\uC6A9\uC131\uC744 \uBE44\uAD50\uD569\uB2C8\uB2E4.",
      `\uB3C4\uB85C\uAC00\uC6A9\uC131\uC740 \uCC28\uB85C\uC218\xB7\uAD50\uB7C9 \uD1A4\uC218 \uC81C\uD55C\xB7\uC8FC/\uB300\uC548/\uBCF4\uC870 \uCD95 \uD310\uB2E8\uC744 22% \uAC00\uC911\uCE58\uB85C \uBC18\uC601\uD569\uB2C8\uB2E4.`,
      "\uAC10\uC2DC\uACF5\uBC31\uC774 \uB0AE\uACE0 \uD654\uB825\uC5F0\uACC4 \uBC0F \uB3C4\uB85C\uAC00\uC6A9 \uC810\uC218\uAC00 \uB192\uC740 \uD310\uB2E8\uC548\uC744 NAI/DP/TAI \uC870\uC815\uC548\uC73C\uB85C \uC120\uD0DD\uD569\uB2C8\uB2E4."
    ],
    sourceTables,
    table: {
      title: "\uC0AC\uD0DC\uBD84\uC11D\uB3C4 \uD6C4\uBCF4",
      columns: [
        { key: "option", label: "\uD310\uB2E8\uC548" },
        { key: "route", label: "\uC608\uC0C1\uC774\uB3D9\uB85C" },
        { key: "coverage", label: "\uAC10\uC2DC\uC728" },
        { key: "gap", label: "\uACF5\uBC31" },
        { key: "fireLink", label: "\uD654\uB825\uC5F0\uACC4" },
        { key: "road", label: "\uC8FC\uB3C4\uB85C" },
        { key: "roadAvailability", label: "\uB3C4\uB85C\uAC00\uC6A9" },
        { key: "roadStatus", label: "\uB3C4\uB85C\uD310\uC815" },
        { key: "roadBasis", label: "\uB3C4\uB85C\uADFC\uAC70" },
        { key: "score", label: "\uC810\uC218" }
      ],
      rows: ranked.map((option) => ({
        option: option.option,
        route: option.route,
        coverage: `${option.coverage}%`,
        gap: `${option.gap}%`,
        fireLink: `${option.fireLinkScore}%`,
        road: option.roadLabel,
        roadAvailability: `${option.roadScore}%`,
        roadStatus: option.roadStatus,
        roadBasis: option.roadBasis,
        score: String(option.score),
        grade: option === best ? "\uCD94\uCC9C" : option.roadStatus
      }))
    }
  };
}
function buildRedeploymentDecision(inputs) {
  const sourceTable = buildSudoDroneRedeploymentSourceTable();
  const orders = inputs.droneRedeploymentOrders.length > 0 ? inputs.droneRedeploymentOrders : droneRedeploymentOrders;
  const averageProgress = orders.reduce((total, order) => total + order.progressPercent, 0) / Math.max(orders.length, 1);
  const doneCount = orders.filter((order) => order.status === "\uB3C4\uCC29").length;
  const routeSummary = orders.map(
    (order) => `${order.droneId}->${order.destinationType} ${order.destinationName}`
  ).join(", ");
  return {
    title: "\uAC10\uC2DC\uC790\uC0B0 \uC7AC\uBC30\uCE58 \uC0B0\uCD9C",
    summary: `\uC0AC\uD0DC\uBD84\uC11D\uB3C4 \uD310\uB2E8\uC548\uC5D0 \uB530\uB77C ${routeSummary} \uC7AC\uBC30\uCE58 \uBA85\uB839\uC744 \uD558\uB2EC\uD569\uB2C8\uB2E4.`,
    metrics: [
      { label: "\uB4DC\uB860", value: `${orders.length}\uB300`, tone: "blue" },
      {
        label: "\uD3C9\uADE0\uC9C4\uCC99",
        value: `${Math.round(averageProgress)}%`,
        tone: averageProgress >= 60 ? "green" : "amber"
      },
      {
        label: "\uB3C4\uCC29",
        value: `${doneCount}\uB300`,
        tone: doneCount === orders.length ? "green" : "amber"
      }
    ],
    steps: [
      `${SUDO_SITUATION_ANALYSIS_SOURCE_NAME} GPT \uC751\uB2F5\uC758 1\uBC88 TAI #3 \uC465\uACE0\uAC1C, 2\uBC88 NAI #4 \uB9D0\uACE0\uAC1C, 3\uBC88 TAI #4 \uB2F9\uB3D9\uB9AC \uBB38\uC7A5\uC744 \uC6D0\uBB38 \uAE30\uC900\uC73C\uB85C \uB300\uC870\uD569\uB2C8\uB2E4.`,
      "AI \uC5B4\uC2DC\uC2A4\uD134\uD2B8 \uC7AC\uBC30\uCE58 \uBA85\uB839\uC744 \uC6B4\uC6A9\uC790\uAC00 \uC124\uC815\uD55C \uB4DC\uB860\uBCC4 \uBAA9\uC801\uC9C0 \uACC4\uD68D\uACFC \uB300\uC870\uD569\uB2C8\uB2E4.",
      "NAI/DP/TAI \uBAA9\uC801\uC9C0\uC640 \uC88C\uD45C\uB97C \uC8FC \uD654\uBA74 \uC7AC\uBC30\uCE58 \uC624\uBC84\uB808\uC774\uC5D0 \uC804\uC1A1\uD569\uB2C8\uB2E4.",
      "\uAC01 \uB4DC\uB860\uC758 \uC774\uB3D9 \uC0C1\uD0DC\uC640 \uC9C4\uCC99\uB960\uC744 \uC8FC \uD654\uBA74 \uBC0F \uBCF4\uACE0\uC11C\uC5D0 \uB3D9\uC2DC \uBC18\uC601\uD569\uB2C8\uB2E4."
    ],
    sourceTables: [sourceTable],
    table: {
      title: "\uB4DC\uB860 \uC7AC\uBC30\uCE58 \uACC4\uD68D",
      columns: [
        { key: "drone", label: "\uB4DC\uB860" },
        { key: "destination", label: "\uBAA9\uC801\uC9C0" },
        { key: "coordinate", label: "\uC88C\uD45C" },
        { key: "status", label: "\uC0C1\uD0DC" },
        { key: "progress", label: "\uC9C4\uCC99" }
      ],
      rows: orders.map((order) => ({
        drone: order.droneId,
        destination: `${order.destinationType} ${order.destinationName}`,
        coordinate: order.coordinate,
        status: order.status,
        progress: `${order.progressPercent}%`
      }))
    }
  };
}
function formatStrikeAssetForMethod(asset) {
  return asset.replace(/\(.*?\)/g, "").trim();
}
function buildSudoStrikeAssessmentVerdict(inputs = defaultSudoDecisionInputs) {
  const speedKph = Math.max(1, inputs.targetSpeedKph);
  const distanceToTaiKm = inputs.distanceToTaiKm;
  const arrivalMinutes = distanceToTaiKm / speedKph * 60;
  const arrival = minutesToClock(10, 40, arrivalMinutes);
  const assets = inputs.strikeAssets.length > 0 ? inputs.strikeAssets : strikeAssets;
  const assessedAssets = assets.map((asset) => {
    const availableAtArrival = isClockWithinWindow(
      arrival,
      asset.availableFrom,
      asset.availableTo
    );
    const score = Number.isFinite(asset.score) ? Math.max(0, Math.min(100, asset.score)) : 0;
    const ewAsset = asset.asset === "\uC804\uC790\uC804" || asset.asset.toLowerCase() === "ew";
    const primary = availableAtArrival && !ewAsset && score >= 80;
    const support = !primary && availableAtArrival && ewAsset && score >= 60;
    const grade = primary ? "\uC8FC\uD0C0\uACA9" : support ? "\uC9C0\uC6D0" : "\uC608\uBE44";
    return {
      ...asset,
      score,
      availableAtArrival,
      grade
    };
  }).sort((left, right) => {
    if (left.grade !== right.grade) {
      const gradeRank = {
        \uC8FC\uD0C0\uACA9: 3,
        \uC9C0\uC6D0: 2,
        \uC608\uBE44: 1
      };
      return gradeRank[right.grade] - gradeRank[left.grade];
    }
    return right.score - left.score;
  });
  const primaryAssets = assessedAssets.filter(
    (asset) => asset.grade === "\uC8FC\uD0C0\uACA9"
  );
  const supportAssets = assessedAssets.filter(
    (asset) => asset.grade === "\uC9C0\uC6D0"
  );
  const strikeCombination = primaryAssets.length > 0 ? primaryAssets.slice(0, 2).map((asset) => formatStrikeAssetForMethod(asset.asset)).join("+") : "\uAC00\uC6A9\uC790\uC0B0 \uC7AC\uC870\uC815";
  return {
    speedKph,
    distanceToTaiKm,
    arrival,
    assessedAssets,
    primaryAssets,
    supportAssets,
    strikeCombination
  };
}
function buildStrikeDecision(inputs) {
  const assetSourceTable = buildSudoStrikeAssetSourceTable();
  const methodSourceTable = buildSudoStrikeMethodSourceTable();
  const verdict = buildSudoStrikeAssessmentVerdict(inputs);
  const selectedAssets = verdict.primaryAssets.map((asset) => asset.asset);
  return {
    title: "\uD0C0\uACA9\uBC29\uBC95 \uC0B0\uCD9C",
    summary: selectedAssets.length > 0 ? `\uC801 \uC804\uCC28\uAC00 ${verdict.arrival}\uC5D0 TAI#5\uC5D0 \uB3C4\uCC29\uD558\uBBC0\uB85C ${verdict.strikeCombination}\uB97C \uC8FC\uD0C0\uACA9 \uC870\uD569\uC73C\uB85C \uC120\uD0DD\uD569\uB2C8\uB2E4.` : `\uC801 \uC804\uCC28\uAC00 ${verdict.arrival}\uC5D0 TAI#5\uC5D0 \uB3C4\uCC29\uD558\uC9C0\uB9CC \uD574\uB2F9 \uC2DC\uAC01 \uC8FC\uD0C0\uACA9 \uAC00\uB2A5\uC790\uC0B0\uC774 \uC5C6\uC5B4 \uAC00\uC6A9\uC2DC\uAC04 \uC7AC\uC870\uC815\uC774 \uD544\uC694\uD569\uB2C8\uB2E4.`,
    metrics: [
      {
        label: "\uB3C4\uCC29",
        value: verdict.arrival,
        tone: selectedAssets.length > 0 ? "green" : "red"
      },
      { label: "\uC18D\uB3C4", value: `${verdict.speedKph}km/h`, tone: "blue" },
      {
        label: "\uC870\uD569",
        value: verdict.strikeCombination,
        tone: selectedAssets.length > 0 ? "amber" : "red"
      }
    ],
    steps: [
      `${SUDO_FIRE_PLAN_SOURCE_NAME}\uC758 CAS 10:30~11:30, \uD3EC\uBCD1 24\uC2DC\uAC04, \uC721\uAD70\uD56D\uACF5 12:00 \uC774\uD6C4 \uAC00\uC6A9\uC2DC\uAC04\uC744 \uC6D0\uBCF8 \uAE30\uC900\uC73C\uB85C \uB300\uC870\uD569\uB2C8\uB2E4.`,
      `${verdict.distanceToTaiKm}km \uB0A8\uC740 \uD45C\uC801\uC774 ${verdict.speedKph}km/h\uB85C \uC774\uB3D9\uD55C\uB2E4\uACE0 \uAC00\uC815\uD569\uB2C8\uB2E4.`,
      `\uD604 \uC2DC\uAC04 10:40 \uAE30\uC900 TAI#5 \uB3C4\uCC29\uC608\uC815\uC2DC\uAC01\uC744 ${verdict.arrival}\uB85C \uACC4\uC0B0\uD569\uB2C8\uB2E4.`,
      selectedAssets.length > 0 ? `\uB3C4\uCC29\uC2DC\uAC01\uACFC \uAC00\uC6A9\uC2DC\uAC04\uC774 \uC911\uCCA9\uB418\uACE0 \uC810\uC218 80 \uC774\uC0C1\uC778 ${verdict.strikeCombination}\uB97C 1\uC21C\uC704\uB85C \uC120\uD0DD\uD569\uB2C8\uB2E4.` : "\uB3C4\uCC29\uC2DC\uAC01\uACFC \uAC00\uC6A9\uC2DC\uAC04\uC774 \uC911\uCCA9\uB418\uB294 \uC8FC\uD0C0\uACA9 \uC790\uC0B0\uC774 \uC5C6\uC5B4 H\uC2DC \uB610\uB294 \uC790\uC0B0 \uAC00\uC6A9\uC2DC\uAC04 \uC870\uC815\uC774 \uD544\uC694\uD569\uB2C8\uB2E4."
    ],
    sourceTables: [assetSourceTable, methodSourceTable],
    table: {
      title: "\uAC00\uC6A9\uC790\uC0B0 \uC2DC\uAC04\uD45C",
      columns: [
        { key: "asset", label: "\uC790\uC0B0" },
        { key: "window", label: "\uAC00\uC6A9\uC2DC\uAC04" },
        { key: "score", label: "\uC810\uC218" },
        { key: "grade", label: "\uD310\uC815" }
      ],
      rows: verdict.assessedAssets.map((asset) => ({
        asset: asset.asset,
        window: `${asset.availableFrom}~${asset.availableTo}`,
        score: String(asset.score),
        grade: asset.availableAtArrival ? asset.grade : asset.grade === "\uC9C0\uC6D0" ? "\uC9C0\uC6D0" : "\uC2DC\uAC04\uBD88\uC77C\uCE58"
      }))
    }
  };
}
function parseFirePlanHOffset(value) {
  const normalized = value.trim();
  if (normalized === "H") {
    return 0;
  }
  const match = /^H([+-]\d+)$/.exec(normalized);
  return match ? Number(match[1]) : void 0;
}
function parseFirePlanWindow(time) {
  const [startRaw, endRaw] = time.split("~").map((value) => value.trim());
  const start = parseFirePlanHOffset(startRaw);
  const end = parseFirePlanHOffset(endRaw ?? startRaw);
  if (start === void 0 || end === void 0) {
    return void 0;
  }
  return {
    start: Math.min(start, end),
    end: Math.max(start, end)
  };
}
function firePlanText(row) {
  return `${row.time} ${row.asset} ${row.action} ${row.effect}`;
}
function classifyFirePlanPhase(row) {
  const text = firePlanText(row);
  if (/전자전|FASCAM|기동제한|통신|지휘통제/i.test(text)) {
    return "\uC9C0\uC18D\uC9C0\uC6D0";
  }
  if (/사전|H-10~H|H-10\s*~\s*H/i.test(text)) {
    return "\uC0AC\uC804\uCC28\uB2E8";
  }
  if (/CAS|F-16|F-15|주타격|정밀|파괴|TAI#?5/i.test(text)) {
    return "\uC8FC\uD0C0\uACA9";
  }
  if (/후속|잔여|보강|H\+10|H\+20/i.test(text)) {
    return "\uD6C4\uC18D\uCC28\uB2E8";
  }
  return "\uBBF8\uBD84\uB958";
}
function scoreFirePlanTime(phase, window2) {
  if (phase === "\uBBF8\uBD84\uB958") {
    return 18;
  }
  if (!window2) {
    return 25;
  }
  if (phase === "\uC0AC\uC804\uCC28\uB2E8") {
    return window2.start <= -10 && window2.end >= 0 ? 100 : window2.start < 0 && window2.end <= 10 ? 72 : 36;
  }
  if (phase === "\uC8FC\uD0C0\uACA9") {
    return window2.start <= 0 && window2.end >= 10 ? 100 : window2.start <= 0 && window2.end >= 0 ? 78 : 42;
  }
  if (phase === "\uD6C4\uC18D\uCC28\uB2E8") {
    return window2.start <= 10 && window2.end >= 20 ? 100 : window2.start <= 20 && window2.end >= 10 ? 76 : 38;
  }
  return window2.start <= -10 && window2.end >= 30 ? 100 : window2.end - window2.start >= 20 ? 78 : 44;
}
function scoreFirePlanAsset(row, strikeCombination) {
  const text = firePlanText(row);
  const combination = strikeCombination.replace(/\s+/g, "");
  const artilleryMatch = /포병|곡사|TOT|FASCAM/i.test(text);
  const airMatch = /CAS|F-16|F-15|항공|헬기|JAAT/i.test(text);
  const ewMatch = /전자전|EW|EA|통신/i.test(text);
  if (/CAS/i.test(combination) && airMatch) {
    return 100;
  }
  if (/곡사|포병/i.test(combination) && artilleryMatch) {
    return 100;
  }
  if (ewMatch || artilleryMatch || airMatch) {
    return 78;
  }
  return 44;
}
function scoreFirePlanEffect(phase, row) {
  const text = firePlanText(row);
  if (phase === "\uBBF8\uBD84\uB958") {
    return 24;
  }
  const effectMatches = phase === "\uC0AC\uC804\uCC28\uB2E8" ? /지연|차단|사전|공역|인계/i.test(text) : phase === "\uC8FC\uD0C0\uACA9" ? /파괴|주타격|정밀|타격/i.test(text) : phase === "\uD6C4\uC18D\uCC28\uB2E8" ? /후속|잔여|보강|차단/i.test(text) : /통신|지휘|전자전|기동제한|FASCAM|공역/i.test(text);
  return effectMatches ? 100 : 48;
}
function assessFirePlanRow(row, strikeCombination, hasControlPoints) {
  const phase = classifyFirePlanPhase(row);
  const window2 = parseFirePlanWindow(row.time);
  const timeScore = scoreFirePlanTime(phase, window2);
  const assetScore = scoreFirePlanAsset(row, strikeCombination);
  const effectScore = scoreFirePlanEffect(phase, row);
  const pointScore = hasControlPoints ? 100 : 40;
  const score = Math.round(
    timeScore * 0.36 + assetScore * 0.3 + effectScore * 0.24 + pointScore * 0.1
  );
  const grade = score >= 85 ? "\uB3D9\uAE30\uD654" : score >= 70 ? "\uBCF4\uC644\uAC00\uB2A5" : "\uBCF4\uC644\uD544\uC694";
  return {
    ...row,
    phase,
    timeScore,
    assetScore,
    effectScore,
    score,
    grade
  };
}
function buildFirePlanDecision(inputs) {
  const sourceTable = buildSudoFirePlanSourceTable();
  const strikeVerdict = buildSudoStrikeAssessmentVerdict(inputs);
  const strike = buildStrikeDecision(inputs);
  const rows = inputs.firePlanRows.length > 0 ? inputs.firePlanRows : firePlanRows;
  const controlPoints = {
    nai: inputs.fireControlPoints.nai.trim() || fireControlPoints.nai,
    dp: inputs.fireControlPoints.dp.trim() || fireControlPoints.dp,
    tai: inputs.fireControlPoints.tai.trim() || fireControlPoints.tai
  };
  const hasControlPoints = Boolean(
    controlPoints.nai && controlPoints.dp && controlPoints.tai
  );
  const assessedRows = rows.map(
    (row) => assessFirePlanRow(row, strikeVerdict.strikeCombination, hasControlPoints)
  ).sort(
    (left, right) => (parseFirePlanWindow(left.time)?.start ?? 99) - (parseFirePlanWindow(right.time)?.start ?? 99) || right.score - left.score
  );
  const assetCount = new Set(
    rows.map((row) => row.asset.trim()).filter(Boolean)
  ).size;
  const effectSummary = rows.map((row) => row.effect.trim()).filter(Boolean).slice(0, 3).join(" / ");
  const syncedCount = assessedRows.filter(
    (row) => row.grade === "\uB3D9\uAE30\uD654"
  ).length;
  const presentPhases = new Set(assessedRows.map((row) => row.phase));
  const requiredPhases = ["\uC0AC\uC804\uCC28\uB2E8", "\uC8FC\uD0C0\uACA9", "\uD6C4\uC18D\uCC28\uB2E8", "\uC9C0\uC18D\uC9C0\uC6D0"];
  const missingPhases = requiredPhases.filter(
    (phase) => !presentPhases.has(phase)
  );
  const requiredPresentCount = requiredPhases.length - missingPhases.length;
  const planReady = missingPhases.length === 0 && syncedCount === rows.length;
  return {
    title: "\uD1B5\uD569\uD654\uB825\uC6B4\uC6A9\uB3C4\uD45C \uC0B0\uCD9C",
    summary: planReady ? `${controlPoints.nai} \uAC10\uC2DC, ${controlPoints.dp} \uACB0\uC2EC, ${controlPoints.tai} \uD0C0\uACA9\uC73C\uB85C H\uC2DC ${strikeVerdict.arrival} \uAE30\uC900 ${rows.length}\uAC1C \uACC4\uD68D\uC774 \uBAA8\uB450 \uB3D9\uAE30\uD654\uB418\uC5C8\uC2B5\uB2C8\uB2E4.` : `${controlPoints.nai}/${controlPoints.dp}/${controlPoints.tai} \uB3C4\uD45C\uC5D0\uC11C ${syncedCount}/${rows.length}\uAC1C \uACC4\uD68D\uB9CC \uB3D9\uAE30\uD654\uB418\uC5B4 ${missingPhases.join(", ") || "\uC800\uC810 \uD589"} \uBCF4\uC644\uC774 \uD544\uC694\uD569\uB2C8\uB2E4.`,
    metrics: [
      { label: "NAI", value: controlPoints.nai, tone: "blue" },
      { label: "DP", value: controlPoints.dp, tone: "green" },
      { label: "TAI", value: controlPoints.tai, tone: "amber" },
      {
        label: "H\uC2DC",
        value: strikeVerdict.arrival,
        tone: planReady ? "green" : "amber"
      },
      {
        label: "\uC8FC\uD0C0\uACA9",
        value: strikeVerdict.strikeCombination,
        tone: strikeVerdict.primaryAssets.length > 0 ? "green" : "red"
      },
      {
        label: "\uAC80\uC99D",
        value: `${syncedCount}/${rows.length}`,
        tone: planReady ? "green" : "amber"
      },
      {
        label: "\uB2E8\uACC4",
        value: `${requiredPresentCount}/${requiredPhases.length}`,
        tone: missingPhases.length === 0 ? "green" : "red"
      }
    ],
    steps: [
      `${SUDO_FIRE_PLAN_SOURCE_NAME}\uC758 H-10~H SEAD \uD3EC\uBCD1, H~H+10 19\uC804\uD22C\uBE44\uD589\uB2E8 CAS/RJS, H+10~H+20 TOT \uD3EC\uBCD1, \uC804\uC790\uC804/FASCAM \uD589\uC744 \uC6D0\uBCF8 \uAE30\uC900\uC73C\uB85C \uB300\uC870\uD569\uB2C8\uB2E4.`,
      `\uC0AC\uD0DC\uBD84\uC11D\uB3C4 #2\uC758 ${controlPoints.nai}/${controlPoints.dp}/${controlPoints.tai} \uC870\uC815\uC548\uC744 \uB3C4\uD45C \uC785\uB825\uAC12\uC73C\uB85C \uC0AC\uC6A9\uD569\uB2C8\uB2E4.`,
      `${strike.summary}`,
      `${effectSummary || "\uC694\uB9DD\uD6A8\uACFC"} \uB2EC\uC131\uC744 \uAE30\uC900\uC73C\uB85C \uC0AC\uC804\uCC28\uB2E8/\uC8FC\uD0C0\uACA9/\uD6C4\uC18D\uCC28\uB2E8/\uC9C0\uC18D\uC9C0\uC6D0 \uB2E8\uACC4\uB97C \uBD84\uB958\uD569\uB2C8\uB2E4.`,
      missingPhases.length === 0 ? "\uD544\uC218 \uB2E8\uACC4\uAC00 \uBAA8\uB450 \uBC30\uCE58\uB418\uC5B4 H-10~H+30 \uC2DC\uAC04\uD45C\uB97C \uAC80\uC99D\uD569\uB2C8\uB2E4." : `\uBBF8\uBC30\uCE58 \uB2E8\uACC4 ${missingPhases.join(", ")}\uB97C \uCD94\uAC00\uD574\uC57C \uD569\uB2C8\uB2E4.`
    ],
    sourceTables: [sourceTable],
    table: {
      title: "\uC0DD\uC131 \uD1B5\uD569\uD654\uB825\uC6B4\uC6A9\uB3C4\uD45C",
      columns: [
        { key: "time", label: "\uC2DC\uAC04" },
        { key: "asset", label: "\uC790\uC0B0" },
        { key: "action", label: "\uACC4\uD68D" },
        { key: "effect", label: "\uD6A8\uACFC" },
        { key: "phase", label: "\uB2E8\uACC4" },
        { key: "score", label: "\uC810\uC218" },
        { key: "grade", label: "\uD310\uC815" }
      ],
      rows: assessedRows.map((row) => ({
        time: row.time,
        asset: row.asset,
        action: row.action,
        effect: row.effect,
        phase: row.phase,
        score: `${row.score}`,
        grade: row.grade
      }))
    }
  };
}
function buildBdaDecision(inputs) {
  const sourceTable = buildSudoBdaSourceTable(inputs);
  const damageSatisfied = inputs.observedDamagePercent >= inputs.bdaRequiredDamagePercent;
  const targetSatisfied = inputs.remainingTargets <= 2;
  const missionComplete = damageSatisfied && targetSatisfied;
  const reattackRounds = missionComplete ? 0 : Math.max(
    1,
    Math.ceil(
      (inputs.bdaRequiredDamagePercent - inputs.observedDamagePercent) / 12
    )
  );
  return {
    title: "\uD0C0\uACA9\uACB0\uACFC \uD3C9\uAC00",
    summary: missionComplete ? `\uAD00\uCE21 \uD53C\uD574\uC728 ${inputs.observedDamagePercent}%\uC640 \uC794\uC5EC\uD45C\uC801 ${inputs.remainingTargets}\uB300\uAC00 \uAE30\uC900\uC744 \uCDA9\uC871\uD574 \uC7AC\uD0C0\uACA9 \uC5C6\uC774 \uAC10\uC2DC\uB97C \uC720\uC9C0\uD569\uB2C8\uB2E4.` : `\uAD00\uCE21 \uD53C\uD574\uC728 ${inputs.observedDamagePercent}%\uC640 \uC794\uC5EC\uD45C\uC801 ${inputs.remainingTargets}\uB300\uB97C \uAE30\uC900\uC73C\uB85C \uC694\uB9DD\uD6A8\uACFC \uBBF8\uB2EC \uC7AC\uD0C0\uACA9 ${reattackRounds}\uD68C\uB97C \uAD8C\uACE0\uD558\uACE0 \uC794\uC5EC\uD45C\uC801 \uC7AC\uD68D\uB4DD\uC744 \uC9C0\uC2DC\uD569\uB2C8\uB2E4.`,
    metrics: [
      {
        label: "\uC694\uB9DD\uD6A8\uACFC",
        value: percent(inputs.bdaRequiredDamagePercent),
        tone: "amber"
      },
      {
        label: "\uAD00\uCE21\uD53C\uD574",
        value: percent(inputs.observedDamagePercent),
        tone: damageSatisfied ? "green" : "red"
      },
      {
        label: "\uC794\uC5EC\uD45C\uC801",
        value: `${inputs.remainingTargets}\uB300`,
        tone: targetSatisfied ? "blue" : "red"
      },
      {
        label: "\uD6C4\uC18D",
        value: missionComplete ? "\uAC10\uC2DC\uC720\uC9C0" : `\uC7AC\uD0C0\uACA9 ${reattackRounds}\uD68C`,
        tone: missionComplete ? "green" : "amber"
      }
    ],
    steps: [
      `${SUDO_BDA_SOURCE_NAME}\uC758 \uD0C0\uACA9\uACB0\uACFC \uC601\uC0C1\uACFC OCR \uADFC\uAC70\uB97C BDA \uC785\uB825 DATA\uB85C \uB300\uC870\uD569\uB2C8\uB2E4.`,
      "\uD0C0\uACA9\uACB0\uACFC \uC601\uC0C1\uC744 \uC81C\uC2DC\uD558\uACE0 \uC644\uD30C \uC804\uCC28, \uC794\uC5EC \uD45C\uC801, \uBCD1\uB825 \uD53C\uD574\uB97C \uC2DD\uBCC4\uD569\uB2C8\uB2E4.",
      "\uD0C0\uACA9 \uD6C4 \uB4DC\uB860 \uC7AC\uAD00\uCE21 \uD504\uB808\uC784\uC5D0\uC11C \uD53C\uD574\uC728\uACFC \uC794\uC5EC\uD45C\uC801\uC744 \uAC31\uC2E0\uD569\uB2C8\uB2E4.",
      `\uC694\uB9DD \uD53C\uD574\uC728 ${inputs.bdaRequiredDamagePercent}% \uC774\uC0C1\uACFC \uC794\uC5EC\uD45C\uC801 2\uB300 \uC774\uD558 \uAE30\uC900\uC744 \uC801\uC6A9\uD569\uB2C8\uB2E4.`,
      missionComplete ? "\uC694\uB9DD\uD6A8\uACFC\uAC00 \uCDA9\uC871\uB418\uC5B4 TAI \uAC10\uC2DC\uB97C \uC720\uC9C0\uD558\uACE0 \uCD94\uAC00 \uC0AC\uACA9\uC744 \uBCF4\uB958\uD569\uB2C8\uB2E4." : "\uC694\uB9DD\uD6A8\uACFC \uBBF8\uB2EC \uD56D\uBAA9\uC744 \uAE30\uC900\uC73C\uB85C \uC7AC\uD0C0\uACA9 \uC18C\uC694\uC640 \uC794\uC5EC\uD45C\uC801 \uC7AC\uD68D\uB4DD \uC9C0\uC2DC\uB97C \uC0B0\uCD9C\uD569\uB2C8\uB2E4."
    ],
    sourceTables: [sourceTable],
    table: {
      title: "BDA \uC0B0\uCD9C\uD45C",
      columns: [
        { key: "item", label: "\uD3C9\uAC00\uD56D\uBAA9" },
        { key: "observed", label: "\uAD00\uCE21\uAC12" },
        { key: "criteria", label: "\uAE30\uC900" },
        { key: "grade", label: "\uD310\uC815" }
      ],
      rows: [
        {
          item: "\uD53C\uD574\uC728",
          observed: percent(inputs.observedDamagePercent),
          criteria: `${inputs.bdaRequiredDamagePercent}% \uC774\uC0C1`,
          grade: damageSatisfied ? "\uCDA9\uC871" : "\uBBF8\uB2EC"
        },
        {
          item: "\uC794\uC5EC\uD45C\uC801",
          observed: `${inputs.remainingTargets}\uB300`,
          criteria: "2\uB300 \uC774\uD558",
          grade: targetSatisfied ? "\uCDA9\uC871" : "\uC7AC\uD0C0\uACA9 \uACE0\uB824"
        },
        {
          item: "\uD6C4\uC18D\uC870\uCE58",
          observed: missionComplete ? "TAI \uAC10\uC2DC\uC720\uC9C0" : `\uC7AC\uD0C0\uACA9 ${reattackRounds}\uD68C`,
          criteria: "\uC694\uB9DD\uD6A8\uACFC \uB2EC\uC131",
          grade: missionComplete ? "\uC784\uBB34\uB2EC\uC131" : "\uC7AC\uD0C0\uACA9"
        }
      ]
    }
  };
}
function isRdFalseTargetSignal(row) {
  const signalText = `${row.observed} ${row.grade}`;
  return /허상|미탐지|미청취|특이사항 없음|비정상|불일치/.test(signalText);
}
function getRdFalseTargetProbability(falseTargetCount) {
  if (falseTargetCount >= 6) return 99;
  if (falseTargetCount >= 5) return 90;
  if (falseTargetCount >= 4) return 80;
  if (falseTargetCount >= 3) return 70;
  if (falseTargetCount >= 2) return 60;
  if (falseTargetCount >= 1) return 50;
  return 35;
}
function buildSudoRdAssessmentVerdict(inputs = defaultSudoDecisionInputs) {
  const rows = inputs.rdAssessmentRows.length > 0 ? inputs.rdAssessmentRows : rdAssessmentRows;
  const technicalRows = rows.filter((row) => row.area.includes("R/D"));
  const fusionRows = rows.filter((row) => !row.area.includes("R/D"));
  const falseSignalRows = rows.filter(isRdFalseTargetSignal);
  const falseTargetCount = falseSignalRows.length;
  const falseTargetProbability = getRdFalseTargetProbability(falseTargetCount);
  const realTargetProbability = Math.max(0, 100 - falseTargetProbability);
  const finalGrade = falseTargetProbability >= 70 ? "\uD5C8\uC0C1\uD45C\uC801" : falseTargetProbability >= 50 ? "\uD5C8\uC0C1 \uC758\uC2EC" : "\uC2E4\uC874 \uC7AC\uD655\uC778 \uD544\uC694";
  return {
    rows,
    technicalRows,
    fusionRows,
    falseSignalRows,
    falseTargetCount,
    falseTargetProbability,
    realTargetProbability,
    finalGrade
  };
}
function buildRdAssessmentDecision(inputs) {
  const sourceTable = buildSudoRdAssessmentSourceTable();
  const verdict = buildSudoRdAssessmentVerdict(inputs);
  const technicalFalseSignals = verdict.falseSignalRows.filter(
    (row) => row.area.includes("R/D")
  ).length;
  const fusionFalseSignals = verdict.falseSignalRows.length - technicalFalseSignals;
  return {
    title: "ARTAS \uB300\uD3EC\uBCD1\uD0D0\uC9C0 R/D \uD45C\uC801\uD0D0\uC9C0 \uBD84\uC11D",
    summary: `R/D \uAE30\uC220\uD310\uB3C5 ${technicalFalseSignals}/${verdict.technicalRows.length}\uAC74, \uC9C0\uD718\uC18C \uD0C0\uCD9C\uCC98 ${fusionFalseSignals}/${verdict.fusionRows.length}\uAC74\uC5D0\uC11C \uD5C8\uC0C1 \uC9D5\uD6C4\uAC00 \uC911\uCCA9\uB418\uC5B4 \uC2E4\uC874 ${verdict.realTargetProbability}% / \uD5C8\uC0C1 ${verdict.falseTargetProbability}%\uB85C \uD310\uB2E8\uD569\uB2C8\uB2E4.`,
    metrics: [
      {
        label: "\uC2E4\uC874",
        value: `${verdict.realTargetProbability}%`,
        tone: "amber"
      },
      {
        label: "\uD5C8\uC0C1",
        value: `${verdict.falseTargetProbability}%`,
        tone: "green"
      },
      { label: "\uD310\uC815", value: verdict.finalGrade, tone: "red" }
    ],
    steps: [
      `${SUDO_RD_ASSESSMENT_SOURCE_NAME}\uC758 ARTAS \uCD5C\uCD08\uD310\uB2E8 \uD575\uC2EC\uC694\uC18C\uC640 R/D \uC9C4\uC9C0\u318D\uC9C0\uD718\uC18C \uCCB4\uD06C\uB9AC\uC2A4\uD2B8\uB97C \uC6D0\uBCF8 \uAE30\uC900\uC73C\uB85C \uB300\uC870\uD569\uB2C8\uB2E4.`,
      "R/D \uC9C4\uC9C0\uC5D0\uC11C \uC0AC\uACA9\uBC29\uD5A5, \uD0C4\uB3C4\uACE1\uC120, \uD3EC\uAD6C\uCD08\uC18D/\uD654\uD3EC\uC885\uB958 \uC77C\uCE58 \uC5EC\uBD80\uB97C \uD655\uC778\uD569\uB2C8\uB2E4.",
      "\uC9C0\uD718\uC18C\uC5D0\uC11C \uD3EC\uBAA9\uC120 \uC804\uBC29 \uC12C\uAD11\xB7\uD3ED\uC74C, \uC778\uC811 \uB300\uD3EC\uBCD1\uD0D0\uC9C0\uB808\uC774\uB354, MASINT \uCCA9\uBCF4\uB97C \uAD50\uCC28 \uD655\uC778\uD569\uB2C8\uB2E4.",
      "\uAE30\uC220\uC801 \uD310\uB2E8\uACFC \uD0C0\uCD9C\uCC98 \uC815\uBCF4\uC735\uD569 \uACB0\uACFC\uB97C \uD569\uC0B0\uD574 \uD5C8\uC0C1\uD45C\uC801 \uAC00\uB2A5\uC131\uC744 \uC6B0\uC120 \uC804\uC2DC\uD569\uB2C8\uB2E4."
    ],
    sourceTables: [sourceTable],
    table: {
      title: "R/D \uC2E4\uC874\xB7\uD5C8\uC0C1 \uD310\uB2E8 \uCCB4\uD06C\uB9AC\uC2A4\uD2B8",
      columns: [
        { key: "area", label: "\uAD6C\uBD84" },
        { key: "check", label: "\uCCB4\uD06C\uD56D\uBAA9" },
        { key: "observed", label: "\uD655\uC778\uB0B4\uC6A9" },
        { key: "grade", label: "\uD310\uC815" }
      ],
      rows: verdict.rows.map((row) => ({
        area: row.area,
        check: row.check,
        observed: row.observed,
        grade: row.grade
      }))
    }
  };
}
function getSudoDecisionOutput(scenarioId, inputs = defaultSudoDecisionInputs, perception) {
  switch (scenarioId) {
    case 1:
      return buildDroneTargetIdentificationDecision(inputs, perception);
    case 2:
      return buildTargetClassificationDecision(inputs, perception);
    case 3:
      return buildScaleDecision(inputs, perception);
    case 4:
      return buildOrderDecision(inputs, perception);
    case 5:
      return buildCollateralDecision(inputs);
    case 6:
      return buildAssistantDecision(inputs, perception);
    case 7:
      return buildMunitionDecision(inputs);
    case 8:
      return buildFiringUnitDecision(inputs);
    case 9:
      return buildCoaDecision(inputs);
    case 10:
      return buildRedeploymentDecision(inputs);
    case 11:
      return buildStrikeDecision(inputs);
    case 12:
      return buildFirePlanDecision(inputs);
    case 13:
      return buildRdAssessmentDecision(inputs);
    case 14:
      return buildBdaDecision(inputs);
    default:
      return void 0;
  }
}

// js/vendor/kairos/src/gui/sudo/sudoTargetLabels.ts
var genericVehiclePattern = /\b(car|truck|vehicle|bus|van|train|boat|motorcycle|person)\b|차량|트럭|자동차/i;
var tankPattern = /\b(tank|armored|armoured|afv|apc)\b|전차|장갑/i;
var launcherPattern = /\b(m-?1991|240|tel|rocket|launcher|mlrs|artillery)\b|방사포|발사대/i;
var mrlPattern = /\b(mrl|mlrs)\b/i;
var militaryTruckPattern = /\b(military truck|cargo truck)\b|군용\s*트럭/i;
var tubePattern = /\b(tube|barrel|pod|launcher tubes?)\b|발사관|포신/i;
var bodyPattern = /\b(chassis|body|cab)\b|차체|운전석/i;
var targetCoordinateTrackPattern = /^YOLO[-_\s]*(.*)$/i;
function normalizeLabelText(value) {
  return String(value ?? "").trim().toLowerCase();
}
function getDetectionLabelText(box) {
  return `${box.label ?? ""} ${box.rawLabel ?? ""} ${box.trackId ?? ""}`;
}
function hasGenericRawVehicleLabel(box) {
  const rawLabel = normalizeLabelText(box.rawLabel);
  return Boolean(rawLabel) && genericVehiclePattern.test(rawLabel) && !shouldPreserveMilitaryLabel(rawLabel);
}
function isGenericVehicleCandidateBox(box) {
  const label = normalizeLabelText(box.label);
  return hasGenericRawVehicleLabel(box) && launcherPattern.test(label);
}
function shouldPreserveMilitaryLabel(label) {
  return launcherPattern.test(label) || tubePattern.test(label) || bodyPattern.test(label) || tankPattern.test(label);
}
function normalizeTargetCoordinateTrackId(trackId) {
  const value = trackId?.trim();
  if (!value) {
    return void 0;
  }
  const match = targetCoordinateTrackPattern.exec(value);
  if (!match) {
    return value;
  }
  const suffix = match[1].replace(/^[-_\s]+/, "").trim();
  return suffix ? `TGT-${suffix}` : "TGT";
}
function resolveTargetCoordinateLabel(box) {
  const normalized = normalizeLabelText(box.label);
  const combined = `${normalized} ${normalizeLabelText(box.rawLabel)} ${normalizeLabelText(
    box.trackId
  )}`;
  if (normalized.includes("\uD45C\uC801 \uD6C4\uBCF4") || /\byolo\b/i.test(box.label) || /\btarget\b/i.test(combined) || genericVehiclePattern.test(combined) || launcherPattern.test(combined)) {
    return "\uD45C\uC801 \uD6C4\uBCF4";
  }
  return box.label.trim();
}
function resolveMilitaryLabel(box, scenarioId) {
  const label = box.label.trim();
  if (scenarioId === 1) {
    return resolveTargetCoordinateLabel(box);
  }
  const normalized = normalizeLabelText(label);
  const trackId = normalizeLabelText(box.trackId);
  const combined = `${normalized} ${trackId}`;
  const scaleScenario = [3, 11, 12, 13].includes(scenarioId);
  if (scenarioId === 2 && hasGenericRawVehicleLabel(box) && launcherPattern.test(normalized)) {
    return "\uCC28\uB7C9 \uD6C4\uBCF4";
  }
  if (scaleScenario && mrlPattern.test(combined)) {
    return "MRL/MLRS";
  }
  if (scaleScenario && militaryTruckPattern.test(combined)) {
    return "\uAD70\uC6A9 \uD2B8\uB7ED";
  }
  if (scaleScenario && tankPattern.test(combined)) {
    return "\uC804\uCC28";
  }
  if (scaleScenario && launcherPattern.test(combined)) {
    return "MRL/MLRS \uD6C4\uBCF4";
  }
  if (scaleScenario && genericVehiclePattern.test(combined)) {
    return "\uAD70\uC6A9 \uD2B8\uB7ED";
  }
  if (tubePattern.test(combined)) {
    return "240mm \uBC1C\uC0AC\uAD00";
  }
  if (bodyPattern.test(combined)) {
    return "\uCC28\uCCB4";
  }
  if (launcherPattern.test(combined)) {
    if (scenarioId === 2) {
      return "M-1991 240mm TEL";
    }
    return "M-1991 240mm TEL";
  }
  if (scenarioId === 4 && genericVehiclePattern.test(combined)) {
    return "240mm \uBC29\uC0AC\uD3EC \uD6C4\uBCF4";
  }
  if (shouldPreserveMilitaryLabel(label)) {
    return label;
  }
  return label;
}
function refineSudoDetectionLabels(detections, scenarioId) {
  return detections.map((box) => {
    const refinedLabel = resolveMilitaryLabel(box, scenarioId);
    const refinedTrackId = scenarioId === 1 ? normalizeTargetCoordinateTrackId(box.trackId) : box.trackId;
    const labelChanged = refinedLabel !== box.label;
    const trackChanged = refinedTrackId !== box.trackId;
    if (!labelChanged && !trackChanged) {
      return box;
    }
    const nextBox = {
      ...box,
      label: refinedLabel
    };
    if (labelChanged) {
      nextBox.rawLabel = box.rawLabel ?? box.label;
    }
    if (trackChanged) {
      nextBox.trackId = refinedTrackId;
    }
    return nextBox;
  });
}
function inferDetectionCategory(detections, scenarioId) {
  const combined = detections.map(getDetectionLabelText).join(" ");
  const launcherCandidateText = detections.filter((box) => !isGenericVehicleCandidateBox(box)).map(getDetectionLabelText).join(" ");
  const hasLauncher = launcherPattern.test(launcherCandidateText) || detections.some(
    (box) => !isGenericVehicleCandidateBox(box) && /MRL|MLRS|TEL|방사포/i.test(box.label)
  );
  const hasLauncherComponents = tubePattern.test(combined) && bodyPattern.test(combined);
  const hasTank = detections.some((box) => {
    const label = normalizeLabelText(box.label);
    const sourceText = `${box.rawLabel ?? ""} ${box.trackId ?? ""}`;
    return label === "\uC804\uCC28" || tankPattern.test(sourceText);
  });
  const hasVehicle = genericVehiclePattern.test(combined);
  const hasMilitaryTruck = militaryTruckPattern.test(combined) || detections.some((box) => /군용 트럭/i.test(box.label));
  const scaleScenario = [3, 11, 12, 13].includes(scenarioId);
  if (scaleScenario && hasLauncher && (hasMilitaryTruck || hasVehicle)) {
    return "MRL/\uAD70\uC6A9\uD2B8\uB7ED \uD63C\uC131";
  }
  if (scaleScenario && hasLauncher) {
    return "MRL/MLRS";
  }
  if (scaleScenario && hasTank) {
    return "\uC804\uCC28";
  }
  if (scaleScenario && (hasMilitaryTruck || hasVehicle)) {
    return "\uAD70\uC6A9 \uD2B8\uB7ED";
  }
  if (scenarioId === 2 && (hasLauncher || hasLauncherComponents)) {
    return "240mm \uBC29\uC0AC\uD3EC";
  }
  if (scenarioId === 4 && (hasLauncher || hasVehicle)) {
    return hasLauncher ? "240mm \uBC29\uC0AC\uD3EC" : "240mm \uBC29\uC0AC\uD3EC \uD6C4\uBCF4";
  }
  if (hasLauncher || hasLauncherComponents) {
    return "240mm \uBC29\uC0AC\uD3EC";
  }
  if (hasTank) {
    return "\uC804\uCC28";
  }
  if (hasVehicle) {
    return "\uCC28\uB7C9 \uD6C4\uBCF4";
  }
  return void 0;
}
function inferSudoTargetFromDetections(detections, scenarioId = 0) {
  if (detections.length === 0) {
    return void 0;
  }
  const category = inferDetectionCategory(detections, scenarioId);
  const strongestDetection = detections.reduce(
    (current, next) => next.confidence > current.confidence ? next : current
  );
  const label = scenarioId === 3 && category ? `${category} \uC911\uB300\uADDC\uBAA8` : category ?? strongestDetection.label;
  const confidence = Math.max(
    strongestDetection.confidence,
    detections.reduce((total, box) => total + box.confidence, 0) / detections.length
  );
  const labelSummary = [...new Set(detections.map((box) => box.label))].slice(0, 4).join(", ");
  return {
    label,
    confidence: Math.max(0, Math.min(1, confidence)),
    count: detections.length,
    evidence: `Detector bbox ${detections.length}\uAC74(${labelSummary})`
  };
}

// js/vendor/kairos/src/gui/sudo/sudoDetectionMerge.ts
function mergeDetectorDetections(analysis, detectorResult, scenarioId = 0) {
  if (detectorResult.detections.length === 0) {
    return analysis;
  }
  const detectorLabel = detectorResult.model ?? "detector";
  const targetInference = inferSudoTargetFromDetections(
    detectorResult.detections,
    scenarioId
  );
  const prefersDetectorScaleInference = scenarioId === 3 && Boolean(targetInference);
  const shouldPromoteDetector = Boolean(targetInference) && (prefersDetectorScaleInference || analysis.source === "unavailable" || analysis.confidence <= 0 || /미분류|unknown|unclassified/i.test(analysis.label));
  const promotedLabel = shouldPromoteDetector && targetInference ? targetInference.label : analysis.label;
  const detectorEvidence = targetInference?.evidence ? `${detectorLabel} ${targetInference.evidence}` : `${detectorLabel} bbox ${detectorResult.detections.length}\uAC74\uC744 \uC6B0\uC120 \uC801\uC6A9`;
  const detectorSummary = shouldPromoteDetector && targetInference ? `${targetInference.evidence} \uAE30\uC900\uC73C\uB85C ${targetInference.label} \uD310\uB2E8\uC744 \uBCF4\uAC15\uD588\uC2B5\uB2C8\uB2E4.` : void 0;
  const detectorOnlyGenericVehicle = scenarioId === 2 && targetInference?.label === "\uCC28\uB7C9 \uD6C4\uBCF4";
  const analysisLooksLikeRocketArtillery = /240|방사포|mrl|mlrs|tel|launcher|발사관/i.test(analysis.label);
  const shouldCapGenericVehicleCertainty = detectorOnlyGenericVehicle && analysisLooksLikeRocketArtillery && analysis.confidence > 0.85;
  const mergedConfidence = shouldPromoteDetector && targetInference ? Math.max(analysis.confidence, targetInference.confidence) : shouldCapGenericVehicleCertainty && targetInference ? Math.min(
    analysis.confidence,
    Math.max(0.55, targetInference.confidence)
  ) : analysis.confidence;
  const genericVehicleCaution = shouldCapGenericVehicleCertainty && targetInference ? `Detector\uB294 ${targetInference.evidence} \uC218\uC900\uC774\uB77C \uBC29\uC0AC\uD3EC \uD655\uC815 \uC2E0\uB8B0\uB3C4\uB97C detector \uD6C4\uBCF4 confidence\uB85C \uC81C\uD55C\uD588\uC2B5\uB2C8\uB2E4.` : void 0;
  const keepAnalysisSummary = !prefersDetectorScaleInference || analysis.confidence > 0 && !/unknown|unclassified|coherent request|미분류|결과가 아직/i.test(
    analysis.summary
  );
  return {
    ...analysis,
    label: promotedLabel,
    confidence: mergedConfidence,
    summary: detectorSummary ? keepAnalysisSummary ? `${detectorSummary} ${analysis.summary}`.trim() : detectorSummary : genericVehicleCaution ? `${genericVehicleCaution} ${analysis.summary}`.trim() : analysis.summary,
    detections: detectorResult.detections,
    source: shouldPromoteDetector && analysis.source === "unavailable" ? "detector" : analysis.source,
    inputKind: analysis.inputKind === "none" && detectorResult.frameCount > 0 ? "video-frames" : analysis.inputKind,
    frameCount: Math.max(analysis.frameCount, detectorResult.frameCount),
    diagnostic: shouldPromoteDetector && analysis.diagnostic ? `Gemma VLM \uACB0\uACFC\uAC00 \uC5C6\uAC70\uB098 \uBBF8\uBD84\uB958\uB77C Detector bbox \uADFC\uAC70\uB85C \uBCF4\uAC15\uD588\uC2B5\uB2C8\uB2E4. ${analysis.diagnostic}` : analysis.diagnostic,
    evidence: [
      detectorEvidence,
      ...genericVehicleCaution ? [genericVehicleCaution] : [],
      ...analysis.evidence
    ]
  };
}

// js/vendor/kairos/src/gui/sudo/sudoDetectionTimeline.ts
function normalizeMaxFrames(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return void 0;
  }
  return Math.max(1, Math.trunc(parsed));
}
function normalizeFrameIndex(value, fallback = 0) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return Math.max(0, Math.trunc(parsed));
}
function getTimelineFrameCount(detections, frameCount) {
  const highestFrameIndex = detections.reduce(
    (highest, box) => Math.max(highest, normalizeFrameIndex(box.frameIndex, 0)),
    -1
  );
  const requestedFrameCount = Number.isFinite(frameCount) ? Math.max(0, Math.trunc(frameCount)) : 0;
  if (requestedFrameCount > 0 || highestFrameIndex >= 0) {
    return Math.max(requestedFrameCount, highestFrameIndex + 1);
  }
  return detections.length > 0 ? 1 : 0;
}
function buildTimelineFrameIndexes(detections, frameCount, maxFrames) {
  if (!maxFrames || frameCount <= maxFrames) {
    return Array.from(
      { length: frameCount },
      (_entry, frameIndex) => frameIndex
    );
  }
  const selected = /* @__PURE__ */ new Set();
  const detectionFrameIndexes = [
    ...new Set(
      detections.map((box) => normalizeFrameIndex(box.frameIndex, 0)).filter((frameIndex) => frameIndex >= 0 && frameIndex < frameCount)
    )
  ].sort((left, right) => left - right);
  detectionFrameIndexes.forEach((frameIndex) => {
    if (selected.size < maxFrames) {
      selected.add(frameIndex);
    }
  });
  for (let sampleIndex = 0; selected.size < maxFrames && sampleIndex < maxFrames; sampleIndex += 1) {
    const denominator = Math.max(1, maxFrames - 1);
    selected.add(Math.round(sampleIndex * (frameCount - 1) / denominator));
  }
  return [...selected].sort((left, right) => left - right);
}
function summarizeLabels(labels) {
  if (labels.length === 0) {
    return "-";
  }
  const counts = /* @__PURE__ */ new Map();
  labels.forEach((label) => counts.set(label, (counts.get(label) ?? 0) + 1));
  return [...counts.entries()].sort(
    (left, right) => right[1] - left[1] || left[0].localeCompare(right[0])
  ).map(([label, count]) => count > 1 ? `${label} x${count}` : label).join(", ");
}
function getTrackId(box) {
  return box.trackId?.trim();
}
function summarizeTrackIds(trackIds) {
  return trackIds.length > 0 ? trackIds.join(", ") : "-";
}
function roundConfidence(value) {
  return Math.round(value * 1e4) / 1e4;
}
function getDominantTrackLabel(labelStats) {
  return [...labelStats.values()].sort(
    (left, right) => right.count - left.count || right.confidenceSum - left.confidenceSum || left.firstSeen - right.firstSeen || left.label.localeCompare(right.label)
  )[0]?.label;
}
function updateTrackLabelStats(labelStats, box, order) {
  const current = labelStats.get(box.label);
  if (!current) {
    labelStats.set(box.label, {
      label: box.label,
      count: 1,
      confidenceSum: box.confidence,
      firstSeen: order
    });
    return;
  }
  current.count += 1;
  current.confidenceSum += box.confidence;
}
function smoothCoordinate(previous, current, next) {
  return Math.round((previous * 0.25 + current * 0.5 + next * 0.25) * 100) / 100;
}
function smoothTrackDetections(trackDetections) {
  if (trackDetections.length < 3) {
    return trackDetections;
  }
  const ordered = [...trackDetections].sort(
    (left, right) => normalizeFrameIndex(left.frameIndex, 0) - normalizeFrameIndex(right.frameIndex, 0)
  );
  const smoothedByBox = /* @__PURE__ */ new Map();
  ordered.forEach((box, index) => {
    const previous = ordered[index - 1];
    const next = ordered[index + 1];
    if (!previous || !next) {
      smoothedByBox.set(box, box);
      return;
    }
    smoothedByBox.set(box, {
      ...box,
      x: smoothCoordinate(previous.x, box.x, next.x),
      y: smoothCoordinate(previous.y, box.y, next.y),
      width: smoothCoordinate(previous.width, box.width, next.width),
      height: smoothCoordinate(previous.height, box.height, next.height)
    });
  });
  return trackDetections.map((box) => smoothedByBox.get(box) ?? box);
}
function smoothSudoDetectionsByTrack(detections) {
  const trackGroups = /* @__PURE__ */ new Map();
  detections.forEach((box) => {
    const trackId = getTrackId(box);
    if (!trackId || box.frameIndex === void 0) {
      return;
    }
    const group = trackGroups.get(trackId) ?? [];
    group.push(box);
    trackGroups.set(trackId, group);
  });
  if (![...trackGroups.values()].some((group) => group.length >= 3)) {
    return detections;
  }
  const smoothedByBox = /* @__PURE__ */ new Map();
  trackGroups.forEach((group) => {
    smoothTrackDetections(group).forEach((box, index) => {
      smoothedByBox.set(group[index], box);
    });
  });
  return detections.map((box) => smoothedByBox.get(box) ?? box);
}
function buildSudoDetectionTimeline(detections, frameCount, options = {}) {
  const safeFrameCount = getTimelineFrameCount(detections, frameCount);
  if (safeFrameCount === 0) {
    return [];
  }
  const frameIndexes = buildTimelineFrameIndexes(
    detections,
    safeFrameCount,
    normalizeMaxFrames(options.maxFrames)
  );
  return frameIndexes.map((frameIndex) => {
    const frameDetections = detections.filter(
      (box) => normalizeFrameIndex(box.frameIndex, 0) === frameIndex
    );
    const confidenceSum = frameDetections.reduce(
      (sum, box) => sum + box.confidence,
      0
    );
    const labels = frameDetections.map((box) => box.label);
    const trackIds = [
      ...new Set(
        frameDetections.map((box) => getTrackId(box)).filter((trackId) => Boolean(trackId))
      )
    ];
    return {
      frameIndex,
      count: frameDetections.length,
      averageConfidence: frameDetections.length > 0 ? roundConfidence(confidenceSum / frameDetections.length) : 0,
      labelSummary: summarizeLabels(labels),
      labels,
      trackIds,
      trackSummary: summarizeTrackIds(trackIds)
    };
  });
}
function buildSudoDetectionTrackSummary(detections) {
  const trackState = /* @__PURE__ */ new Map();
  detections.forEach((box, order) => {
    const trackId = getTrackId(box);
    if (!trackId) {
      return;
    }
    const frameIndex = normalizeFrameIndex(box.frameIndex, 0);
    const current = trackState.get(trackId);
    if (!current) {
      trackState.set(trackId, {
        trackId,
        label: box.label,
        count: 1,
        firstFrameIndex: frameIndex,
        lastFrameIndex: frameIndex,
        averageConfidence: box.confidence,
        confidenceSum: box.confidence,
        color: box.color,
        labelStats: /* @__PURE__ */ new Map([
          [
            box.label,
            {
              label: box.label,
              count: 1,
              confidenceSum: box.confidence,
              firstSeen: order
            }
          ]
        ])
      });
      return;
    }
    current.count += 1;
    current.confidenceSum += box.confidence;
    updateTrackLabelStats(current.labelStats, box, order);
    current.label = getDominantTrackLabel(current.labelStats) ?? current.label;
    current.firstFrameIndex = Math.min(current.firstFrameIndex, frameIndex);
    current.lastFrameIndex = Math.max(current.lastFrameIndex, frameIndex);
    current.averageConfidence = roundConfidence(
      current.confidenceSum / current.count
    );
    if (!current.color && box.color) {
      current.color = box.color;
    }
  });
  return [...trackState.values()].map(
    ({ confidenceSum: _confidenceSum, labelStats: _labelStats, ...track }) => track
  ).sort(
    (left, right) => left.firstFrameIndex - right.firstFrameIndex || left.trackId.localeCompare(right.trackId)
  );
}

// js/vendor/kairos/src/gui/sudo/sudoDetector.ts
var SUDO_SCENARIO_1_DETECTOR_DISPLAY_CONFIDENCE = 0.18;
var DEFAULT_DETECTOR_TIMEOUT_MS = 6e3;
var DEFAULT_STREAM_STATS_TIMEOUT_MS = 2200;
var DEFAULT_DETECTOR_STREAM_FPS = 8;
var DEFAULT_DETECTOR_INFERENCE_FPS = 4;
var DEFAULT_DETECTOR_STREAM_MAX_WIDTH = 960;
var DEFAULT_DETECTOR_STREAM_QUALITY = 62;
var SUDO_DETECTOR_STREAM_QUALITY_WINDOW = 12;
var SUDO_DETECTOR_STREAM_FRESH_AGE_MS = 4e3;
var SUDO_DETECTOR_STREAM_STALE_AGE_MS = 8e3;
var DEFAULT_SUDO_DETECTOR_ENDPOINT = "http://127.0.0.1:8766/detect";
function formatSudoDetectorDuration(value) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return void 0;
  }
  if (value >= 1e3) {
    return `${Math.round(value / 1e3 * 10) / 10}s`;
  }
  return `${Math.round(value)}ms`;
}
function formatSudoDetectorFps(value) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return void 0;
  }
  return `${Math.round(value * 10) / 10} FPS`;
}
function formatSudoDetectorPercent(value) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return void 0;
  }
  return `${Math.round(Math.max(0, Math.min(1, value)) * 100)}%`;
}
function formatSudoDetectorDeviceLabel(device) {
  const normalized = device?.trim().toLowerCase();
  if (!normalized) {
    return void 0;
  }
  if (normalized.includes("cuda")) {
    return "GPU CUDA";
  }
  if (normalized.includes("directml") || normalized === "dml") {
    return "GPU DirectML";
  }
  if (normalized.includes("cpu")) {
    return "CPU";
  }
  return device;
}
function getSudoDetectorStreamAgeMs(stats) {
  if (typeof stats?.updatedAt !== "number" || !Number.isFinite(stats.updatedAt)) {
    return void 0;
  }
  return Math.max(0, Date.now() - stats.updatedAt * 1e3);
}
function getSudoDetectorStreamFreshness(ageMs) {
  if (ageMs === void 0) {
    return void 0;
  }
  if (ageMs <= SUDO_DETECTOR_STREAM_FRESH_AGE_MS) {
    return "fresh";
  }
  if (ageMs >= SUDO_DETECTOR_STREAM_STALE_AGE_MS) {
    return "stale";
  }
  return "lag";
}
function formatSudoDetectorStreamFreshnessLabel(ageMs) {
  const freshness = getSudoDetectorStreamFreshness(ageMs);
  if (!freshness || ageMs === void 0) {
    return void 0;
  }
  const seconds = Math.round(ageMs / 1e3);
  if (freshness === "fresh") {
    return `\uC2E4\uC2DC\uAC04 ${seconds}\uCD08 \uC804`;
  }
  if (freshness === "stale") {
    return `\uAC31\uC2E0 \uC9C0\uC5F0 ${seconds}\uCD08`;
  }
  return `\uC9C0\uC5F0 ${seconds}\uCD08`;
}
function buildSudoDetectorStreamQualitySummary(stats) {
  if (!stats) {
    return void 0;
  }
  const samples = stats.samples;
  const sampleCount = stats.sampleCount ?? samples.length;
  const streamAgeMs = getSudoDetectorStreamAgeMs(stats);
  const freshness = getSudoDetectorStreamFreshness(streamAgeMs);
  const freshnessLabel = formatSudoDetectorStreamFreshnessLabel(streamAgeMs);
  if (stats.source !== "stream-stats") {
    return {
      sampleCount,
      inferredSampleCount: 0,
      detectionSampleCount: 0,
      detectionRate: 0,
      streamAgeMs,
      freshness,
      freshnessLabel,
      statusLabel: stats.source === "error" ? "LIVE \uC624\uB958" : "LIVE \uB300\uAE30",
      statusTone: stats.source === "error" ? "stale" : "idle",
      detailLabel: stats.diagnostic ?? "\uC2A4\uD2B8\uB9BC \uD1B5\uACC4 \uB300\uAE30"
    };
  }
  if (samples.length === 0) {
    return {
      sampleCount,
      inferredSampleCount: 0,
      detectionSampleCount: 0,
      detectionRate: 0,
      streamAgeMs,
      freshness,
      freshnessLabel,
      statusLabel: "LIVE \uB300\uAE30",
      statusTone: "idle",
      detailLabel: stats.diagnostic ?? "\uC2A4\uD2B8\uB9BC \uC0D8\uD50C \uC5C6\uC74C"
    };
  }
  const latestSample = samples.at(-1);
  const latestDetectionSample = samples.slice().reverse().find((sample) => sample.bboxCount > 0) ?? latestSample;
  const recentSamples = samples.slice(-SUDO_DETECTOR_STREAM_QUALITY_WINDOW);
  const recentInferenceSamples = samples.filter(
    (sample) => sample.inferenceMs !== void 0 && (sample.inferred === void 0 || sample.inferred)
  ).slice(-SUDO_DETECTOR_STREAM_QUALITY_WINDOW);
  const inferredSampleCount = recentInferenceSamples.length;
  const detectionSampleCount = recentSamples.filter(
    (sample) => sample.bboxCount > 0
  ).length;
  const detectionRate = recentSamples.length > 0 ? detectionSampleCount / recentSamples.length : 0;
  const averageInferenceMs = inferredSampleCount > 0 ? recentInferenceSamples.reduce(
    (total, sample) => total + (sample.inferenceMs ?? 0),
    0
  ) / inferredSampleCount : void 0;
  const timedSamples = recentInferenceSamples.filter(
    (sample) => typeof sample.timestamp === "number"
  );
  const firstTimedSample = timedSamples.at(0);
  const latestTimedSample = timedSamples.at(-1);
  const elapsedSeconds = firstTimedSample && latestTimedSample && timedSamples.length > 1 && latestTimedSample.timestamp !== void 0 && firstTimedSample.timestamp !== void 0 ? latestTimedSample.timestamp - firstTimedSample.timestamp : 0;
  const inferenceFps = elapsedSeconds > 0 ? (timedSamples.length - 1) / elapsedSeconds : void 0;
  const latestFrameIndex = latestSample?.frameIndex;
  const latestBboxCount = latestSample?.bboxCount;
  const latestBboxLabel = latestBboxCount !== void 0 ? `bbox ${latestBboxCount}` : void 0;
  const statusLabel = freshness === "stale" ? "LIVE \uC815\uC9C0" : freshness === "lag" ? "LIVE \uC9C0\uC5F0" : (latestBboxCount ?? 0) > 0 ? "LIVE \uCD94\uC801" : "LIVE \uD0D0\uC0C9";
  const statusTone = freshness === "stale" ? "stale" : freshness === "lag" ? "warning" : "ready";
  const sampleWindowLabel = stats.historyLimit ? `\uC0D8\uD50C ${sampleCount}/${stats.historyLimit}` : `\uC0D8\uD50C ${sampleCount}`;
  const frameLabel = latestFrameIndex !== void 0 ? `F${latestFrameIndex + 1}` : void 0;
  const inferenceLabel = averageInferenceMs !== void 0 ? `\uCD94\uB860 ${formatSudoDetectorDuration(averageInferenceMs)}` : void 0;
  const fpsLabel = formatSudoDetectorFps(inferenceFps);
  const hitRateLabel = `HIT ${formatSudoDetectorPercent(detectionRate)}`;
  const detailLabel = [
    sampleWindowLabel,
    frameLabel,
    latestBboxLabel,
    inferenceLabel,
    fpsLabel,
    hitRateLabel,
    freshnessLabel
  ].filter(Boolean).join(" \xB7 ");
  const timings = {
    inferenceMs: averageInferenceMs,
    inferenceFps,
    frameCount: samples.length,
    sampleCount,
    inferredSampleCount,
    recentDetectionRate: detectionRate,
    latestFrameIndex,
    latestBboxCount,
    streamAgeMs
  };
  return {
    sampleCount,
    inferredSampleCount,
    detectionSampleCount,
    detectionRate,
    latestFrameIndex,
    latestBboxCount,
    averageInferenceMs,
    inferenceFps,
    streamAgeMs,
    freshness,
    freshnessLabel,
    statusLabel,
    statusTone,
    detailLabel,
    timings,
    latestSample,
    latestDetectionSample
  };
}
function buildSudoDetectorTimingsFromStreamStats(stats) {
  return buildSudoDetectorStreamQualitySummary(stats)?.timings;
}
function formatSudoDetectorTimingSummary(detectorResult) {
  const timings = detectorResult.timings;
  if (!timings) {
    return detectorResult.elapsedMs !== void 0 ? `\uC655\uBCF5 ${formatSudoDetectorDuration(detectorResult.elapsedMs)}` : void 0;
  }
  const parts = [
    timings.preprocessMs !== void 0 ? `\uC804\uCC98\uB9AC ${formatSudoDetectorDuration(timings.preprocessMs)}` : void 0,
    timings.inferenceMs !== void 0 ? `\uCD94\uB860 ${formatSudoDetectorDuration(timings.inferenceMs)}` : void 0,
    timings.totalMs !== void 0 ? `\uD569\uACC4 ${formatSudoDetectorDuration(timings.totalMs)}` : void 0,
    formatSudoDetectorFps(timings.inferenceFps)
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(" \xB7 ") : void 0;
}
function buildSudoDetectorRuntimeBadges({
  detectorResult,
  runtime,
  device,
  includeTotal = false
}) {
  const resolvedRuntime = detectorResult?.runtime ?? runtime;
  const resolvedDevice = detectorResult?.device ?? device ?? resolvedRuntime?.device;
  const timings = detectorResult?.timings;
  const badges = [];
  const deviceLabel = formatSudoDetectorDeviceLabel(resolvedDevice);
  if (deviceLabel) {
    badges.push({
      label: deviceLabel,
      compactLabel: deviceLabel,
      tone: deviceLabel === "CPU" ? "warning" : "gpu"
    });
  }
  if (resolvedRuntime?.allowCpu === false) {
    badges.push({
      label: "CPU \uB300\uCCB4\uACBD\uB85C \uCC28\uB2E8",
      compactLabel: "CPU OFF",
      tone: "cpu"
    });
  } else if (resolvedRuntime?.allowCpu === true) {
    badges.push({
      label: "CPU \uB300\uCCB4\uACBD\uB85C \uD5C8\uC6A9",
      compactLabel: "CPU ON",
      tone: "warning"
    });
  }
  const preprocess = formatSudoDetectorDuration(timings?.preprocessMs);
  if (preprocess) {
    badges.push({
      label: `\uC804\uCC98\uB9AC ${preprocess}`,
      compactLabel: `PRE ${preprocess}`,
      tone: "timing"
    });
  }
  const inference = formatSudoDetectorDuration(timings?.inferenceMs);
  if (inference) {
    badges.push({
      label: `\uCD94\uB860 ${inference}`,
      compactLabel: `INF ${inference}`,
      tone: "timing"
    });
  }
  const total = includeTotal ? formatSudoDetectorDuration(timings?.totalMs) : void 0;
  if (total) {
    badges.push({
      label: `\uD569\uACC4 ${total}`,
      compactLabel: `TOT ${total}`,
      tone: "timing"
    });
  }
  const fps = formatSudoDetectorFps(timings?.inferenceFps);
  if (fps) {
    badges.push({
      label: fps,
      compactLabel: fps,
      tone: "timing"
    });
  }
  if (timings?.sampleCount !== void 0) {
    const sampleCount = Math.round(timings.sampleCount);
    badges.push({
      label: `\uC2A4\uD2B8\uB9BC \uC0D8\uD50C ${sampleCount}\uAC74`,
      compactLabel: `SMP ${sampleCount}`,
      tone: "timing"
    });
  }
  const recentDetectionRate = formatSudoDetectorPercent(
    timings?.recentDetectionRate
  );
  if (recentDetectionRate) {
    badges.push({
      label: `\uCD5C\uADFC \uD0D0\uC9C0\uC728 ${recentDetectionRate}`,
      compactLabel: `HIT ${recentDetectionRate}`,
      tone: (timings?.recentDetectionRate ?? 0) > 0 ? "gpu" : "warning"
    });
  }
  if (timings?.latestBboxCount !== void 0) {
    const roundedBboxCount = Math.round(timings.latestBboxCount);
    badges.push({
      label: `\uCD5C\uC2E0 bbox ${roundedBboxCount}\uAC74`,
      compactLabel: `BBOX ${roundedBboxCount}`,
      tone: roundedBboxCount > 0 ? "gpu" : "warning"
    });
  }
  if (timings?.streamAgeMs !== void 0) {
    const streamAgeSeconds = Math.round(timings.streamAgeMs / 1e3);
    const freshness = timings.streamAgeMs <= 4e3 ? "fresh" : timings.streamAgeMs >= 8e3 ? "stale" : "lag";
    badges.push({
      label: `LIVE ${freshness} ${streamAgeSeconds}s`,
      compactLabel: `LIVE ${freshness.toUpperCase()} ${streamAgeSeconds}s`,
      tone: freshness === "fresh" ? "fresh" : freshness === "stale" ? "warning" : "cache"
    });
  }
  if (detectorResult?.cache) {
    badges.push({
      label: `cache ${detectorResult.cache}`,
      compactLabel: detectorResult.cache === "hit" ? "CACHE" : `CACHE ${detectorResult.cache}`,
      tone: "cache"
    });
  }
  return badges;
}
function getSudoDetectorEndpoint() {
  const endpoint = String(globalThis.__KAIROS_ENV__.VITE_SUDO_DETECTOR_URL ?? "").trim();
  return endpoint.length > 0 ? endpoint.replace(/\/+$/, "") : DEFAULT_SUDO_DETECTOR_ENDPOINT;
}
function normalizeEndpoint(value) {
  const endpoint = String(value ?? "").trim();
  return endpoint.length > 0 ? endpoint.replace(/\/+$/, "") : void 0;
}
function getDetectorTimeoutMs() {
  const parsed = Number(globalThis.__KAIROS_ENV__.VITE_SUDO_DETECTOR_TIMEOUT_MS);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_DETECTOR_TIMEOUT_MS;
}
function getDetectorRequestTimeoutMs(frameCount) {
  if (frameCount <= 8) {
    return getDetectorTimeoutMs();
  }
  return Math.min(
    45e3,
    Math.max(getDetectorTimeoutMs(), Math.round(frameCount * 650))
  );
}
function getDetectorStreamFps() {
  const parsed = Number(
    globalThis.__KAIROS_ENV__.VITE_SUDO_DETECTOR_STREAM_FPS ?? globalThis.__KAIROS_ENV__.VITE_SUDO_STREAM_FPS
  );
  return Number.isFinite(parsed) && parsed > 0 ? Math.max(1, Math.min(30, Math.round(parsed))) : DEFAULT_DETECTOR_STREAM_FPS;
}
function getDetectorStreamInferenceFps() {
  const parsed = Number(
    globalThis.__KAIROS_ENV__.VITE_SUDO_DETECTOR_INFERENCE_FPS ?? globalThis.__KAIROS_ENV__.VITE_SUDO_INFERENCE_FPS
  );
  return Number.isFinite(parsed) && parsed > 0 ? Math.max(1, Math.min(30, Math.round(parsed))) : DEFAULT_DETECTOR_INFERENCE_FPS;
}
function getDetectorStreamMaxWidth() {
  const parsed = Number(
    globalThis.__KAIROS_ENV__.VITE_SUDO_DETECTOR_STREAM_MAX_WIDTH ?? globalThis.__KAIROS_ENV__.VITE_SUDO_STREAM_MAX_WIDTH
  );
  return Number.isFinite(parsed) && parsed > 0 ? Math.max(320, Math.min(1920, Math.round(parsed))) : DEFAULT_DETECTOR_STREAM_MAX_WIDTH;
}
function getDetectorStreamQuality() {
  const parsed = Number(
    globalThis.__KAIROS_ENV__.VITE_SUDO_DETECTOR_STREAM_QUALITY ?? globalThis.__KAIROS_ENV__.VITE_SUDO_STREAM_QUALITY
  );
  return Number.isFinite(parsed) && parsed > 0 ? Math.max(35, Math.min(95, Math.round(parsed))) : DEFAULT_DETECTOR_STREAM_QUALITY;
}
function getErrorMessage(error) {
  return error instanceof Error ? error.message : String(error);
}
function parseNumericValue(value) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? { value, percent: false } : void 0;
  }
  if (typeof value !== "string") {
    return void 0;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return void 0;
  }
  const percent2 = trimmed.endsWith("%");
  const numericText = (percent2 ? trimmed.slice(0, -1) : trimmed).trim().replace(/,/g, "");
  const parsed = Number(numericText);
  return Number.isFinite(parsed) ? { value: parsed, percent: percent2 } : void 0;
}
function toFiniteConfidence(value, fallback) {
  const parsed = parseNumericValue(value);
  if (!parsed) {
    return fallback;
  }
  const confidence = parsed.percent || parsed.value > 1 ? parsed.value / 100 : parsed.value;
  return Math.max(0, Math.min(1, confidence));
}
function toPercentCoordinate(value) {
  const parsed = parseNumericValue(value);
  if (!parsed) {
    return void 0;
  }
  const percentValue = parsed.percent || parsed.value > 1 ? parsed.value : parsed.value * 100;
  return Math.max(0, Math.min(100, percentValue));
}
function parseFrameIndex(value, fallback) {
  const parsed = parseNumericValue(value);
  if (!parsed) {
    return fallback;
  }
  return Math.max(0, Math.trunc(parsed.value));
}
function parseTrackId(value) {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : void 0;
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }
  return void 0;
}
function toOptionalBoolean(value) {
  if (typeof value === "boolean") {
    return value;
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return value !== 0;
  }
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["true", "yes", "ready", "ok", "loaded"].includes(normalized)) {
      return true;
    }
    if (["false", "no", "error", "missing", "unloaded"].includes(normalized)) {
      return false;
    }
  }
  return void 0;
}
function toFiniteNumber(value) {
  const parsed = parseNumericValue(value);
  return parsed ? parsed.value : void 0;
}
function toNonNegativeInteger(value, fallback) {
  const parsed = parseNumericValue(value);
  if (!parsed) {
    return fallback;
  }
  return Math.max(0, Math.trunc(parsed.value));
}
function toStringArray(value) {
  if (!Array.isArray(value)) {
    return void 0;
  }
  const strings = value.map((entry) => String(entry ?? "").trim()).filter(Boolean);
  return strings.length > 0 ? strings : void 0;
}
function normalizeDetectorRuntime(value, fallbackRecord) {
  const record = value && typeof value === "object" ? value : {};
  const mode = typeof record.mode === "string" ? record.mode : typeof fallbackRecord?.mode === "string" ? fallbackRecord.mode : typeof fallbackRecord?.detector === "string" ? fallbackRecord.detector : void 0;
  const device = typeof record.device === "string" ? record.device : typeof fallbackRecord?.device === "string" ? fallbackRecord.device : void 0;
  const providers = toStringArray(record.providers) ?? toStringArray(fallbackRecord?.providers);
  const activeProviders = toStringArray(record.activeProviders) ?? toStringArray(record.active_providers) ?? toStringArray(fallbackRecord?.activeProviders) ?? toStringArray(fallbackRecord?.active_providers);
  const allowCpu = toOptionalBoolean(record.allowCpu ?? record.allow_cpu) ?? toOptionalBoolean(fallbackRecord?.allowCpu ?? fallbackRecord?.allow_cpu);
  const runtime = {};
  if (mode) runtime.mode = mode;
  if (device) runtime.device = device;
  if (providers) runtime.providers = providers;
  if (activeProviders) runtime.activeProviders = activeProviders;
  if (allowCpu !== void 0) runtime.allowCpu = allowCpu;
  return Object.keys(runtime).length > 0 ? runtime : void 0;
}
function normalizeDetectorTimings(value) {
  if (!value || typeof value !== "object") {
    return void 0;
  }
  const record = value;
  const timings = {};
  const preprocessMs = toFiniteNumber(
    record.preprocessMs ?? record.preprocess_ms
  );
  const inferenceMs = toFiniteNumber(record.inferenceMs ?? record.inference_ms);
  const totalMs = toFiniteNumber(
    record.totalMs ?? record.total_ms ?? record.elapsedMs ?? record.elapsed_ms
  );
  const frameCount = toFiniteNumber(record.frameCount ?? record.frame_count);
  const inferenceFps = toFiniteNumber(
    record.inferenceFps ?? record.inference_fps
  );
  const sampleCount = toFiniteNumber(record.sampleCount ?? record.sample_count);
  const inferredSampleCount = toFiniteNumber(
    record.inferredSampleCount ?? record.inferred_sample_count
  );
  const recentDetectionRate = toFiniteNumber(
    record.recentDetectionRate ?? record.recent_detection_rate ?? record.detectionRate ?? record.detection_rate
  );
  const latestFrameIndex = toFiniteNumber(
    record.latestFrameIndex ?? record.latest_frame_index
  );
  const latestBboxCount = toFiniteNumber(
    record.latestBboxCount ?? record.latest_bbox_count
  );
  const streamAgeMs = toFiniteNumber(
    record.streamAgeMs ?? record.stream_age_ms
  );
  if (preprocessMs !== void 0) timings.preprocessMs = preprocessMs;
  if (inferenceMs !== void 0) timings.inferenceMs = inferenceMs;
  if (totalMs !== void 0) timings.totalMs = totalMs;
  if (frameCount !== void 0) timings.frameCount = Math.max(0, frameCount);
  if (inferenceFps !== void 0) timings.inferenceFps = inferenceFps;
  if (sampleCount !== void 0) timings.sampleCount = Math.max(0, sampleCount);
  if (inferredSampleCount !== void 0) {
    timings.inferredSampleCount = Math.max(0, inferredSampleCount);
  }
  if (recentDetectionRate !== void 0) {
    timings.recentDetectionRate = Math.max(0, Math.min(1, recentDetectionRate));
  }
  if (latestFrameIndex !== void 0) {
    timings.latestFrameIndex = Math.max(0, latestFrameIndex);
  }
  if (latestBboxCount !== void 0) {
    timings.latestBboxCount = Math.max(0, latestBboxCount);
  }
  if (streamAgeMs !== void 0) {
    timings.streamAgeMs = Math.max(0, streamAgeMs);
  }
  return Object.keys(timings).length > 0 ? timings : void 0;
}
function normalizeStreamConfidenceSample(entry, fallbackFrameIndex) {
  if (!entry || typeof entry !== "object") {
    return void 0;
  }
  const record = entry;
  const frameIndex = parseFrameIndex(
    record.frameIndex ?? record.frame_index,
    fallbackFrameIndex
  ) ?? fallbackFrameIndex;
  const averageConfidence2 = toFiniteConfidence(
    record.averageConfidence ?? record.avgConfidence ?? record.average_confidence ?? record.confidence,
    0
  );
  const maxConfidence = toFiniteConfidence(
    record.maxConfidence ?? record.max_confidence ?? record.confidence,
    averageConfidence2
  );
  const bboxCount = toNonNegativeInteger(
    record.bboxCount ?? record.count ?? record.bbox_count,
    0
  );
  const timestampNumber = Number(record.timestamp ?? record.time);
  const labelSummary = typeof record.labelSummary === "string" && record.labelSummary.trim().length > 0 ? record.labelSummary.trim() : typeof record.label_summary === "string" && record.label_summary.trim().length > 0 ? record.label_summary.trim() : bboxCount > 0 ? "detected" : "-";
  const sample = {
    frameIndex,
    timestamp: Number.isFinite(timestampNumber) ? timestampNumber : void 0,
    bboxCount,
    averageConfidence: averageConfidence2,
    maxConfidence,
    labelSummary
  };
  if (typeof record.trackSummary === "string") {
    sample.trackSummary = record.trackSummary;
  } else if (typeof record.track_summary === "string") {
    sample.trackSummary = record.track_summary;
  }
  if (typeof record.streamLabel === "string") {
    sample.streamLabel = record.streamLabel;
  } else if (typeof record.stream_label === "string") {
    sample.streamLabel = record.stream_label;
  }
  const inferenceMs = toFiniteNumber(record.inferenceMs ?? record.inference_ms);
  if (inferenceMs !== void 0) {
    sample.inferenceMs = inferenceMs;
  }
  const inferred = toOptionalBoolean(record.inferred ?? record.isInferred);
  if (inferred !== void 0) {
    sample.inferred = inferred;
  }
  const detections = normalizeDetectionArray(
    record.detections ?? record.boxes ?? record.bboxes,
    frameIndex
  );
  if (detections.length > 0) {
    sample.detections = detections;
  }
  return sample;
}
function normalizeDetectionRecord(record, fallbackFrameIndex) {
  const bbox = Array.isArray(record.bbox) ? record.bbox : void 0;
  const xyxy = Array.isArray(record.xyxy) ? record.xyxy : void 0;
  const bboxFormat = typeof record.bboxFormat === "string" ? record.bboxFormat.toLowerCase() : typeof record.format === "string" ? record.format.toLowerCase() : void 0;
  const sourceBox = bbox ?? xyxy;
  const x = toPercentCoordinate(record.x ?? record.x1 ?? sourceBox?.[0]);
  const y = toPercentCoordinate(record.y ?? record.y1 ?? sourceBox?.[1]);
  let width = toPercentCoordinate(
    record.width ?? record.w ?? record.x2 ?? sourceBox?.[2]
  );
  let height = toPercentCoordinate(
    record.height ?? record.h ?? record.y2 ?? sourceBox?.[3]
  );
  if (x !== void 0 && y !== void 0 && width !== void 0 && height !== void 0 && (xyxy || bboxFormat === "xyxy" || record.x2 !== void 0 || record.y2 !== void 0 || bbox && bboxFormat !== "xywh" && width > x && height > y)) {
    width = Math.max(1, width - x);
    height = Math.max(1, height - y);
  }
  if (x === void 0 || y === void 0 || width === void 0 || height === void 0) {
    return void 0;
  }
  const label = typeof record.label === "string" && record.label.trim().length > 0 ? record.label.trim() : typeof record.class === "string" && record.class.trim().length > 0 ? record.class.trim() : typeof record.name === "string" && record.name.trim().length > 0 ? record.name.trim() : "target";
  const normalized = {
    label,
    confidence: toFiniteConfidence(record.confidence ?? record.score, 0.75),
    x,
    y,
    width: Math.min(width, 100 - x),
    height: Math.min(height, 100 - y),
    frameIndex: parseFrameIndex(
      record.frameIndex ?? record.frame_index ?? record.frame,
      fallbackFrameIndex
    )
  };
  const rawLabel = typeof record.rawLabel === "string" && record.rawLabel.trim().length > 0 ? record.rawLabel.trim() : typeof record.raw_label === "string" && record.raw_label.trim().length > 0 ? record.raw_label.trim() : void 0;
  if (rawLabel && rawLabel !== label) {
    normalized.rawLabel = rawLabel;
  }
  const trackId = parseTrackId(
    record.trackId ?? record.track_id ?? record.track ?? record.objectId ?? record.object_id ?? record.id
  );
  if (trackId) {
    normalized.trackId = trackId;
  }
  if (typeof record.role === "string" && record.role.trim().length > 0) {
    normalized.role = record.role.trim();
  }
  if (record.visualFeatures && typeof record.visualFeatures === "object" && !Array.isArray(record.visualFeatures)) {
    const features = record.visualFeatures;
    const visualFeatures = {
      launcherScore: Number(features.launcherScore),
      darkBlobCount: Number(features.darkBlobCount),
      topDarkRatio: Number(features.topDarkRatio),
      edgeDensity: Number(features.edgeDensity),
      tubeFaceEdgeDensity: Number(features.tubeFaceEdgeDensity),
      tubeFaceDarkRatio: Number(features.tubeFaceDarkRatio)
    };
    normalized.visualFeatures = Object.fromEntries(
      Object.entries(visualFeatures).filter(
        ([, value]) => Number.isFinite(value)
      )
    );
  }
  if (typeof record.color === "string") {
    normalized.color = record.color;
  }
  return normalized;
}
function normalizeDetectionArray(value, fallbackFrameIndex) {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.map((entry) => {
    if (!entry || typeof entry !== "object") {
      return void 0;
    }
    return normalizeDetectionRecord(
      entry,
      fallbackFrameIndex
    );
  }).filter((entry) => entry !== void 0);
}
function getDetectionEntries(record) {
  return record.detections ?? record.boxes ?? record.objects ?? record.bboxes ?? record.boundingBoxes ?? record.bounding_boxes ?? record.targets;
}
function normalizeSudoDetectorResponse(payload, frameCount, endpoint, elapsedMs) {
  const record = payload && typeof payload === "object" ? payload : {};
  const requestedScenarioId = Number(record.scenarioId ?? record.scenario_id);
  const frames = Array.isArray(record.frames) ? record.frames : void 0;
  const timings = normalizeDetectorTimings(record.timings);
  const payloadFrameCount = toFiniteNumber(
    record.frameCount ?? record.frame_count ?? timings?.frameCount
  );
  const resolvedFrameCount = payloadFrameCount !== void 0 && payloadFrameCount > 0 ? Math.round(payloadFrameCount) : frameCount > 0 ? frameCount : frames?.length ?? frameCount;
  const frameDetections = frames?.flatMap((frame, index) => {
    if (Array.isArray(frame)) {
      return normalizeDetectionArray(frame, index);
    }
    if (!frame || typeof frame !== "object") {
      return [];
    }
    const frameRecord = frame;
    return normalizeDetectionArray(
      getDetectionEntries(frameRecord),
      parseFrameIndex(frameRecord.frameIndex ?? frameRecord.index, index)
    );
  }) ?? [];
  const flatDetections = normalizeDetectionArray(
    Array.isArray(payload) ? payload : getDetectionEntries(record)
  );
  const normalizedDetections = frameDetections.length > 0 ? frameDetections : flatDetections;
  const detections = refineSudoDetectionLabels(
    normalizedDetections,
    Number.isFinite(requestedScenarioId) ? requestedScenarioId : 0
  );
  const runtime = normalizeDetectorRuntime(record.runtime, record);
  const cache = typeof record.cache === "string" && record.cache.trim().length > 0 ? record.cache.trim() : void 0;
  return {
    source: "detector",
    endpoint,
    model: typeof record.model === "string" ? record.model : typeof record.detector === "string" ? record.detector : void 0,
    device: runtime?.device,
    runtime,
    timings,
    cache,
    detections,
    frameCount: resolvedFrameCount,
    elapsedMs,
    diagnostic: detections.length > 0 ? void 0 : "Detector \uC751\uB2F5\uC5D0\uC11C \uC720\uD6A8\uD55C bbox\uB97C \uCC3E\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4."
  };
}
async function requestSudoDetectorAnalysis({
  scenarioId,
  imageBase64s,
  endpointOverride,
  videoSource,
  frameCount
}) {
  const endpoint = normalizeEndpoint(endpointOverride) ?? getSudoDetectorEndpoint();
  const hasVideoSource = Boolean(videoSource?.url?.trim());
  const requestedFrameCount = frameCount && frameCount > 0 ? Math.round(frameCount) : imageBase64s.length > 0 ? imageBase64s.length : hasVideoSource ? 1 : 0;
  if (!endpoint || imageBase64s.length === 0 && !hasVideoSource) {
    return {
      source: "unconfigured",
      endpoint,
      detections: [],
      frameCount: requestedFrameCount,
      diagnostic: endpoint ? "Detector\uC5D0 \uC804\uB2EC\uD560 \uC774\uBBF8\uC9C0 \uD504\uB808\uC784 \uB610\uB294 \uC601\uC0C1 \uC18C\uC2A4\uAC00 \uC5C6\uC2B5\uB2C8\uB2E4." : "VITE_SUDO_DETECTOR_URL\uC774 \uC5C6\uC5B4 detector adapter\uB97C \uAC74\uB108\uB701\uB2C8\uB2E4."
    };
  }
  const startedAt = performance.now();
  let timeoutId;
  try {
    const controller = new AbortController();
    const timeoutMs = getDetectorRequestTimeoutMs(requestedFrameCount);
    const payload = await Promise.race([
      (async () => {
        const response = await fetch(endpoint, {
          method: "POST",
          signal: controller.signal,
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            scenarioId,
            images: imageBase64s,
            videoSource: hasVideoSource ? videoSource : void 0,
            frameCount: requestedFrameCount,
            coordinateSystem: "percent",
            output: "frames"
          })
        });
        if (!response.ok) {
          throw new Error(`Detector responded with ${response.status}`);
        }
        return await response.json();
      })(),
      new Promise((_resolve, reject) => {
        timeoutId = window.setTimeout(() => {
          controller.abort();
          reject(new Error(`Timed out after ${timeoutMs}ms`));
        }, timeoutMs);
      })
    ]);
    const record = payload && typeof payload === "object" ? payload : {};
    const responsePayload = Number(record.scenarioId ?? record.scenario_id) === scenarioId ? payload : {
      ...record,
      scenarioId
    };
    return normalizeSudoDetectorResponse(
      responsePayload,
      requestedFrameCount,
      endpoint,
      Math.round(performance.now() - startedAt)
    );
  } catch (error) {
    return {
      source: "error",
      endpoint,
      detections: [],
      frameCount: requestedFrameCount,
      elapsedMs: Math.round(performance.now() - startedAt),
      diagnostic: `Detector \uC5F0\uACB0 \uC2E4\uD328: ${getErrorMessage(error)}`
    };
  } finally {
    if (timeoutId !== void 0) {
      window.clearTimeout(timeoutId);
    }
  }
}
function buildSiblingEndpoint(endpoint, path) {
  const url = new URL(endpoint, window.location.href);
  url.pathname = path;
  url.search = "";
  url.hash = "";
  return url.toString().replace(/\/+$/, "");
}
function normalizeDetectorStartRatio(startRatio) {
  return typeof startRatio === "number" && Number.isFinite(startRatio) ? Math.max(0, Math.min(0.98, startRatio)) : 0;
}
function normalizeDetectorDisplayConfidence(displayConfidence) {
  return typeof displayConfidence === "number" && Number.isFinite(displayConfidence) ? Math.max(0.01, Math.min(0.95, displayConfidence)) : void 0;
}
function buildSudoDetectorStreamUrl({
  endpointOverride,
  videoSource,
  scenarioId,
  startRatio,
  displayConfidence
}) {
  const endpoint = normalizeEndpoint(endpointOverride) ?? getSudoDetectorEndpoint();
  if (!endpoint || !videoSource?.url.trim()) {
    return void 0;
  }
  const url = new URL(buildSiblingEndpoint(endpoint, "/stream.mjpg"));
  url.searchParams.set("url", videoSource.url);
  if (videoSource.playbackUrl) {
    url.searchParams.set("playbackUrl", videoSource.playbackUrl);
  }
  url.searchParams.set("transport", videoSource.transport);
  if (videoSource.label) {
    url.searchParams.set("label", videoSource.label);
  }
  if (scenarioId !== void 0) {
    url.searchParams.set("scenarioId", String(scenarioId));
  }
  url.searchParams.set("fps", String(getDetectorStreamFps()));
  url.searchParams.set("inferenceFps", String(getDetectorStreamInferenceFps()));
  url.searchParams.set("maxWidth", String(getDetectorStreamMaxWidth()));
  url.searchParams.set("quality", String(getDetectorStreamQuality()));
  url.searchParams.set(
    "startRatio",
    String(normalizeDetectorStartRatio(startRatio))
  );
  const normalizedDisplayConfidence = normalizeDetectorDisplayConfidence(displayConfidence);
  if (normalizedDisplayConfidence !== void 0) {
    url.searchParams.set("displayConf", String(normalizedDisplayConfidence));
  }
  return url.toString();
}
function buildSudoDetectorSnapshotUrl({
  endpointOverride,
  videoSource,
  scenarioId
}) {
  const endpoint = normalizeEndpoint(endpointOverride) ?? getSudoDetectorEndpoint();
  if (!endpoint || !videoSource?.url.trim()) {
    return void 0;
  }
  const url = new URL(buildSiblingEndpoint(endpoint, "/snapshot.jpg"));
  url.searchParams.set("url", videoSource.url);
  if (videoSource.playbackUrl) {
    url.searchParams.set("playbackUrl", videoSource.playbackUrl);
  }
  url.searchParams.set("transport", videoSource.transport);
  if (videoSource.label) {
    url.searchParams.set("label", videoSource.label);
  }
  if (scenarioId !== void 0) {
    url.searchParams.set("scenarioId", String(scenarioId));
  }
  return url.toString();
}
function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 32768;
  let binary = "";
  for (let index = 0; index < bytes.length; index += chunkSize) {
    const chunk = bytes.subarray(index, index + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return window.btoa(binary);
}
async function requestSudoDetectorSnapshotFrame({
  endpointOverride,
  videoSource,
  scenarioId
}) {
  const endpoint = normalizeEndpoint(endpointOverride) ?? getSudoDetectorEndpoint();
  const snapshotUrl = buildSudoDetectorSnapshotUrl({
    endpointOverride,
    videoSource,
    scenarioId
  });
  if (!endpoint || !snapshotUrl) {
    return {
      source: "unconfigured",
      endpoint,
      diagnostic: "Detector snapshot endpoint \uB610\uB294 \uC601\uC0C1 \uC785\uB825 \uC8FC\uC18C\uAC00 \uC5C6\uC5B4 live frame\uC744 \uAC00\uC838\uC62C \uC218 \uC5C6\uC2B5\uB2C8\uB2E4."
    };
  }
  const startedAt = performance.now();
  try {
    const response = await fetch(snapshotUrl, {
      method: "GET",
      cache: "no-store"
    });
    if (!response.ok) {
      throw new Error(`Snapshot responded with ${response.status}`);
    }
    const buffer = await response.arrayBuffer();
    return {
      source: "snapshot",
      endpoint,
      imageBase64: arrayBufferToBase64(buffer),
      contentType: response.headers.get("content-type") ?? "image/jpeg",
      elapsedMs: Math.round(performance.now() - startedAt)
    };
  } catch (error) {
    return {
      source: "error",
      endpoint,
      elapsedMs: Math.round(performance.now() - startedAt),
      diagnostic: `YOLO live snapshot \uC870\uD68C \uC2E4\uD328: ${getErrorMessage(error)}`
    };
  }
}
async function requestSudoDetectorStreamStats({
  endpointOverride,
  limit = 80,
  videoSource,
  scenarioId,
  startRatio,
  displayConfidence
}) {
  const endpoint = normalizeEndpoint(endpointOverride) ?? getSudoDetectorEndpoint();
  if (!endpoint) {
    return {
      source: "unconfigured",
      endpoint,
      samples: [],
      diagnostic: "Detector endpoint\uAC00 \uC5C6\uC5B4 \uC2A4\uD2B8\uB9BC \uC2E0\uB8B0\uB3C4 \uC2DC\uACC4\uC5F4\uC744 \uC77D\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4."
    };
  }
  const startedAt = performance.now();
  let timeoutId;
  try {
    const controller = new AbortController();
    const url = new URL(buildSiblingEndpoint(endpoint, "/stream-stats"));
    url.searchParams.set("limit", String(Math.max(1, Math.min(120, limit))));
    if (videoSource?.url.trim()) {
      url.searchParams.set("track", "1");
      url.searchParams.set("url", videoSource.url);
      if (videoSource.playbackUrl) {
        url.searchParams.set("playbackUrl", videoSource.playbackUrl);
      }
      url.searchParams.set("transport", videoSource.transport);
      if (videoSource.label) {
        url.searchParams.set("label", videoSource.label);
      }
    }
    if (scenarioId !== void 0) {
      url.searchParams.set("scenarioId", String(scenarioId));
    }
    if (startRatio !== void 0) {
      url.searchParams.set(
        "startRatio",
        String(normalizeDetectorStartRatio(startRatio))
      );
    }
    const normalizedDisplayConfidence = normalizeDetectorDisplayConfidence(displayConfidence);
    if (normalizedDisplayConfidence !== void 0) {
      url.searchParams.set("displayConf", String(normalizedDisplayConfidence));
    }
    const payload = await Promise.race([
      (async () => {
        const response = await fetch(url.toString(), {
          method: "GET",
          signal: controller.signal
        });
        if (!response.ok) {
          throw new Error(`Stream stats responded with ${response.status}`);
        }
        return await response.json();
      })(),
      new Promise((_resolve, reject) => {
        timeoutId = window.setTimeout(() => {
          controller.abort();
          reject(
            new Error(`Timed out after ${DEFAULT_STREAM_STATS_TIMEOUT_MS}ms`)
          );
        }, DEFAULT_STREAM_STATS_TIMEOUT_MS);
      })
    ]);
    const record = payload && typeof payload === "object" ? payload : {};
    const rawSamples = Array.isArray(record.samples) ? record.samples : [];
    const samples = rawSamples.map((sample, index) => normalizeStreamConfidenceSample(sample, index)).filter(
      (sample) => sample !== void 0
    );
    const runtime = normalizeDetectorRuntime(record.runtime, record);
    return {
      source: "stream-stats",
      endpoint,
      model: typeof record.model === "string" ? record.model : void 0,
      mode: typeof record.mode === "string" ? record.mode : void 0,
      device: runtime?.device,
      runtime,
      historyLimit: toFiniteNumber(record.historyLimit ?? record.history_limit),
      sampleCount: toFiniteNumber(record.sampleCount ?? record.sample_count),
      updatedAt: toFiniteNumber(record.updatedAt ?? record.updated_at),
      samples,
      elapsedMs: Math.round(performance.now() - startedAt),
      diagnostic: samples.length > 0 ? void 0 : "YOLO stream confidence \uC0D8\uD50C\uC774 \uC544\uC9C1 \uC5C6\uC2B5\uB2C8\uB2E4."
    };
  } catch (error) {
    return {
      source: "error",
      endpoint,
      samples: [],
      elapsedMs: Math.round(performance.now() - startedAt),
      diagnostic: `YOLO stream confidence \uC870\uD68C \uC2E4\uD328: ${getErrorMessage(error)}`
    };
  } finally {
    if (timeoutId !== void 0) {
      window.clearTimeout(timeoutId);
    }
  }
}
async function requestSudoDetectorProbe({
  endpointOverride,
  videoSource
}) {
  const endpoint = normalizeEndpoint(endpointOverride) ?? getSudoDetectorEndpoint();
  if (!endpoint || !videoSource?.url.trim()) {
    return {
      source: "unconfigured",
      endpoint,
      reachable: false,
      transport: videoSource?.transport,
      diagnostic: !endpoint ? "Detector endpoint\uAC00 \uC5C6\uC5B4 RTSP \uAC80\uC99D\uC744 \uC2E4\uD589\uD560 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4." : "\uAC80\uC99D\uD560 \uC601\uC0C1/RTSP \uC8FC\uC18C\uAC00 \uC5C6\uC2B5\uB2C8\uB2E4."
    };
  }
  const startedAt = performance.now();
  try {
    const response = await fetch(buildSiblingEndpoint(endpoint, "/probe"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ videoSource })
    });
    if (!response.ok) {
      throw new Error(`Probe responded with ${response.status}`);
    }
    const payload = await response.json();
    const reachable = Boolean(payload.reachable ?? payload.ok);
    const diagnostic = typeof payload.message === "string" ? payload.message : reachable ? "\uC601\uC0C1 \uC785\uB825 \uC8FC\uC18C\uC5D0 \uC811\uADFC \uAC00\uB2A5\uD569\uB2C8\uB2E4." : "\uC601\uC0C1 \uC785\uB825 \uC8FC\uC18C \uC811\uADFC\uC5D0 \uC2E4\uD328\uD588\uC2B5\uB2C8\uB2E4.";
    return {
      source: "probe",
      endpoint,
      reachable,
      transport: videoSource.transport,
      elapsedMs: Math.round(performance.now() - startedAt),
      diagnostic: redactSudoMediaDiagnostic(diagnostic, videoSource.url)
    };
  } catch (error) {
    return {
      source: "error",
      endpoint,
      reachable: false,
      transport: videoSource.transport,
      elapsedMs: Math.round(performance.now() - startedAt),
      diagnostic: `RTSP/\uC601\uC0C1 \uC785\uB825 \uAC80\uC99D \uC2E4\uD328: ${getErrorMessage(error)}`
    };
  }
}
async function requestSudoDetectorHealth({
  endpointOverride,
  videoSource
}) {
  const endpoint = normalizeEndpoint(endpointOverride) ?? getSudoDetectorEndpoint();
  if (!endpoint) {
    return {
      source: "unconfigured",
      endpoint,
      adapterReachable: false,
      diagnostic: "Detector endpoint\uAC00 \uC5C6\uC5B4 \uC0C1\uD0DC \uD655\uC778\uC744 \uC2E4\uD589\uD560 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4."
    };
  }
  const startedAt = performance.now();
  try {
    const response = await fetch(buildSiblingEndpoint(endpoint, "/health"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        videoSource
      })
    });
    if (!response.ok) {
      throw new Error(`Health responded with ${response.status}`);
    }
    const payload = await response.json();
    const adapter = payload.adapter && typeof payload.adapter === "object" ? payload.adapter : {};
    const modelStatus = payload.modelStatus && typeof payload.modelStatus === "object" ? payload.modelStatus : {};
    const camera = payload.camera && typeof payload.camera === "object" ? payload.camera : {};
    const adapterReachable = toOptionalBoolean(adapter.reachable) ?? toOptionalBoolean(payload.ok) ?? true;
    const modelReady = toOptionalBoolean(modelStatus.ready) ?? toOptionalBoolean(payload.modelReady);
    const cameraReachable = toOptionalBoolean(camera.reachable) ?? toOptionalBoolean(payload.cameraReachable);
    const model = typeof modelStatus.name === "string" ? modelStatus.name : typeof payload.model === "string" ? payload.model : void 0;
    const mode = typeof payload.mode === "string" ? payload.mode : typeof modelStatus.mode === "string" ? modelStatus.mode : void 0;
    const runtime = normalizeDetectorRuntime(modelStatus, payload);
    return {
      source: "health",
      endpoint,
      adapterReachable,
      modelReady,
      cameraReachable,
      model,
      mode,
      device: runtime?.device,
      runtime,
      elapsedMs: Math.round(performance.now() - startedAt),
      diagnostic: typeof adapter.message === "string" ? adapter.message : adapterReachable ? "Detector adapter\uC5D0 \uC5F0\uACB0\uB418\uC5C8\uC2B5\uB2C8\uB2E4." : "Detector adapter \uC751\uB2F5\uC774 \uBD88\uC548\uC815\uD569\uB2C8\uB2E4.",
      modelDiagnostic: typeof modelStatus.message === "string" ? modelStatus.message : void 0,
      cameraDiagnostic: typeof camera.message === "string" ? redactSudoMediaDiagnostic(camera.message, videoSource?.url) : void 0
    };
  } catch (error) {
    return {
      source: "error",
      endpoint,
      adapterReachable: false,
      elapsedMs: Math.round(performance.now() - startedAt),
      diagnostic: `Detector \uC0C1\uD0DC \uD655\uC778 \uC2E4\uD328: ${getErrorMessage(error)}`
    };
  }
}

// js/vendor/kairos/src/gui/sudo/sudoOperationalData.ts
var DEFAULT_SUDO_OPERATIONAL_DATA_URL = "/sudo/operational-data.json";
function isRecord2(value) {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}
function asString2(value) {
  return typeof value === "string" && value.trim() ? value.trim() : void 0;
}
function asNumber2(value) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : void 0;
  }
  return void 0;
}
function asBoolean(value) {
  if (typeof value === "boolean") {
    return value;
  }
  if (typeof value === "string" && value.trim()) {
    const normalized = value.trim().toLowerCase();
    if (["true", "yes", "y", "1", "\uAC00\uB2A5", "\uC591\uD638", "\uC5C6\uC74C"].includes(normalized)) {
      return true;
    }
    if (["false", "no", "n", "0", "\uBD88\uAC00\uB2A5", "\uBD88\uAC00", "\uC81C\uD55C", "\uC788\uC74C"].includes(
      normalized
    )) {
      return false;
    }
  }
  return void 0;
}
function clampNumber(value, min, max) {
  const parsed = asNumber2(value);
  return parsed === void 0 ? void 0 : Math.max(min, Math.min(max, parsed));
}
function clampInteger(value, min, max) {
  const parsed = clampNumber(value, min, max);
  return parsed === void 0 ? void 0 : Math.round(parsed);
}
function normalizeFireUnitStatus(value) {
  return value === "\uAC00\uB2A5" || value === "\uB300\uAE30" || value === "\uC815\uBE44" ? value : void 0;
}
function normalizeRedeploymentType(value) {
  return value === "NAI" || value === "DP" || value === "TAI" ? value : void 0;
}
function normalizeRedeploymentStatus(value) {
  return value === "\uC774\uB3D9\uBA85\uB839" || value === "\uC774\uB3D9\uC911" || value === "\uB3C4\uCC29" ? value : void 0;
}
function mapArray(value, normalize) {
  if (!Array.isArray(value)) {
    return void 0;
  }
  const rows = value.filter(isRecord2).map(normalize).filter((entry) => Boolean(entry));
  return rows.length > 0 ? rows : void 0;
}
function normalizeCollateralMunitions(value) {
  return mapArray(value, (row) => {
    const munition = asString2(row.munition);
    const radiusM = clampNumber(row.radiusM, 0, 5e3);
    return munition && radiusM !== void 0 ? { munition, radiusM } : void 0;
  });
}
function normalizeOrderCandidates(value) {
  return mapArray(value, (row) => {
    const unit = asString2(row.unit);
    const weapon = asString2(row.weapon);
    const distanceKm = clampNumber(row.distanceKm, 0, 200);
    const guns = clampInteger(row.guns, 0, 240);
    const directionMatchPercent = clampNumber(
      row.directionMatchPercent,
      0,
      100
    );
    const coordinate = asString2(row.coordinate);
    const targetCoordinate = asString2(row.targetCoordinate);
    const equipment = asString2(row.equipment);
    const grade = asString2(row.grade);
    const sourceRank = asString2(row.sourceRank);
    return unit && weapon && distanceKm !== void 0 && guns !== void 0 && directionMatchPercent !== void 0 ? {
      unit,
      weapon,
      distanceKm,
      guns,
      directionMatchPercent,
      ...coordinate ? { coordinate } : {},
      ...targetCoordinate ? { targetCoordinate } : {},
      ...equipment ? { equipment } : {},
      ...grade ? { grade } : {},
      ...sourceRank ? { sourceRank } : {}
    } : void 0;
  });
}
function normalizeRouteOptions(value) {
  return mapArray(value, (row) => {
    const option = asString2(row.option);
    const route = asString2(row.route);
    const coverage = clampNumber(row.coverage, 0, 100);
    const gap = clampNumber(row.gap, 0, 100);
    const fireLinkScore = clampNumber(row.fireLinkScore, 0, 100);
    return option && route && coverage !== void 0 && gap !== void 0 && fireLinkScore !== void 0 ? { option, route, coverage, gap, fireLinkScore } : void 0;
  });
}
function normalizeRoadInfoRows(value) {
  return mapArray(value, (row) => {
    const road = asString2(row.road);
    const lanes = asString2(row.lanes);
    const bridge = asString2(row.bridge);
    const judgment = asString2(row.judgment);
    const useProbability = clampNumber(row.useProbability, 0, 100);
    return road && lanes && bridge && judgment ? {
      road,
      lanes,
      bridge,
      judgment,
      ...useProbability !== void 0 ? { useProbability } : {}
    } : void 0;
  });
}
function normalizeRdAssessmentRows(value) {
  return mapArray(value, (row) => {
    const area = asString2(row.area);
    const check = asString2(row.check);
    const observed = asString2(row.observed);
    const grade = asString2(row.grade);
    return area && check && observed && grade ? { area, check, observed, grade } : void 0;
  });
}
function normalizeAssistantVulnerabilityRows(value) {
  return mapArray(value, (row) => {
    const factor = asString2(row.factor);
    const evidence = asString2(row.evidence);
    const impact = asString2(row.impact);
    const grade = asString2(row.grade);
    const target = asString2(row.target);
    const source = asString2(row.source);
    return factor && evidence && impact && grade ? {
      factor,
      evidence,
      impact,
      grade,
      ...target ? { target } : {},
      ...source ? { source } : {}
    } : void 0;
  });
}
function normalizeRedeploymentOrders(value) {
  return mapArray(value, (row) => {
    const droneId = asString2(row.droneId);
    const destinationType = normalizeRedeploymentType(row.destinationType);
    const destinationName = asString2(row.destinationName);
    const coordinate = asString2(row.coordinate);
    const progressPercent = clampInteger(row.progressPercent, 0, 100);
    const status = normalizeRedeploymentStatus(row.status);
    return droneId && destinationType && destinationName && coordinate && progressPercent !== void 0 && status ? {
      droneId,
      destinationType,
      destinationName,
      coordinate,
      progressPercent,
      status
    } : void 0;
  });
}
function normalizeStrikeAssets(value) {
  return mapArray(value, (row) => {
    const asset = asString2(row.asset);
    const availableFrom = asString2(row.availableFrom);
    const availableTo = asString2(row.availableTo);
    const score = clampNumber(row.score, 0, 100);
    return asset && availableFrom && availableTo && score !== void 0 ? { asset, availableFrom, availableTo, score } : void 0;
  });
}
function normalizeFireUnits(value) {
  return mapArray(value, (row) => {
    const unit = asString2(row.unit);
    const ammo = clampInteger(row.ammo, 0, 1e4);
    const csr = clampNumber(row.csr, 0, 100);
    const distanceKm = clampNumber(row.distanceKm, 0, 500);
    const maxRangeKm = clampNumber(row.maxRangeKm, 0.1, 500);
    const status = normalizeFireUnitStatus(row.status);
    const rangeJudgment = asString2(row.rangeJudgment);
    const survival = asString2(row.survival);
    const survivalGuaranteed = asBoolean(row.survivalGuaranteed);
    const ammoSummary = asString2(row.ammoSummary);
    const civilianImpact = asString2(row.civilianImpact);
    const civilianSafe = asBoolean(row.civilianSafe);
    const combatStatus = asString2(row.combatStatus);
    const combatReady = asBoolean(row.combatReady);
    return unit && ammo !== void 0 && csr !== void 0 && distanceKm !== void 0 && maxRangeKm !== void 0 && status ? {
      unit,
      ammo,
      csr,
      distanceKm,
      maxRangeKm,
      status,
      ...rangeJudgment ? { rangeJudgment } : {},
      ...survival ? { survival } : {},
      ...survivalGuaranteed !== void 0 ? { survivalGuaranteed } : {},
      ...ammoSummary ? { ammoSummary } : {},
      ...civilianImpact ? { civilianImpact } : {},
      ...civilianSafe !== void 0 ? { civilianSafe } : {},
      ...combatStatus ? { combatStatus } : {},
      ...combatReady !== void 0 ? { combatReady } : {}
    } : void 0;
  });
}
function normalizeFireControlPoints(value) {
  if (!isRecord2(value)) {
    return void 0;
  }
  const nai = asString2(value.nai);
  const dp = asString2(value.dp);
  const tai = asString2(value.tai);
  return nai || dp || tai ? {
    ...nai ? { nai } : {},
    ...dp ? { dp } : {},
    ...tai ? { tai } : {}
  } : void 0;
}
function normalizeFirePlanRows(value) {
  return mapArray(value, (row) => {
    const time = asString2(row.time);
    const asset = asString2(row.asset);
    const action = asString2(row.action);
    const effect = asString2(row.effect);
    return time && asset && action && effect ? { time, asset, action, effect } : void 0;
  });
}
function normalizeSudoOperationalDecisionPatch(value) {
  if (!isRecord2(value)) {
    return {};
  }
  const patch = {};
  const targetLabel = asString2(value.targetLabel);
  const marchRoute = asString2(value.marchRoute);
  const observedVehicleCount = clampInteger(value.observedVehicleCount, 0, 500);
  const marchColumnLengthM = clampNumber(value.marchColumnLengthM, 0, 2e4);
  const forestPercent = clampNumber(value.forestPercent, 0, 100);
  const openTerrainPercent = clampNumber(value.openTerrainPercent, 0, 100);
  const desiredDamagePercent = clampNumber(value.desiredDamagePercent, 0, 100);
  const nearestCivilianM = clampNumber(value.nearestCivilianM, 0, 1e5);
  const targetSpeedKph = clampNumber(value.targetSpeedKph, 0, 300);
  const distanceToTaiKm = clampNumber(value.distanceToTaiKm, 0, 500);
  const observedDamagePercent = clampNumber(
    value.observedDamagePercent,
    0,
    100
  );
  const remainingTargets = clampInteger(value.remainingTargets, 0, 1e3);
  const bdaRequiredDamagePercent = clampNumber(
    value.bdaRequiredDamagePercent,
    0,
    100
  );
  if (targetLabel) patch.targetLabel = targetLabel;
  if (observedVehicleCount !== void 0) {
    patch.observedVehicleCount = observedVehicleCount;
  }
  if (marchColumnLengthM !== void 0) {
    patch.marchColumnLengthM = marchColumnLengthM;
  }
  if (marchRoute) patch.marchRoute = marchRoute;
  if (forestPercent !== void 0) patch.forestPercent = forestPercent;
  if (openTerrainPercent !== void 0) {
    patch.openTerrainPercent = openTerrainPercent;
  }
  if (desiredDamagePercent !== void 0) {
    patch.desiredDamagePercent = desiredDamagePercent;
  }
  if (nearestCivilianM !== void 0) {
    patch.nearestCivilianM = nearestCivilianM;
  }
  if (targetSpeedKph !== void 0) patch.targetSpeedKph = targetSpeedKph;
  if (distanceToTaiKm !== void 0) patch.distanceToTaiKm = distanceToTaiKm;
  if (observedDamagePercent !== void 0) {
    patch.observedDamagePercent = observedDamagePercent;
  }
  if (remainingTargets !== void 0) patch.remainingTargets = remainingTargets;
  if (bdaRequiredDamagePercent !== void 0) {
    patch.bdaRequiredDamagePercent = bdaRequiredDamagePercent;
  }
  const collateralMunitions = normalizeCollateralMunitions(
    value.collateralMunitions
  );
  const orderCandidates2 = normalizeOrderCandidates(value.orderCandidates);
  const routeOptions2 = normalizeRouteOptions(value.routeOptions);
  const roadInfoRows2 = normalizeRoadInfoRows(value.roadInfoRows);
  const rdAssessmentRows2 = normalizeRdAssessmentRows(value.rdAssessmentRows);
  const assistantVulnerabilityRows = normalizeAssistantVulnerabilityRows(
    value.assistantVulnerabilityRows
  );
  const droneRedeploymentOrders2 = normalizeRedeploymentOrders(
    value.droneRedeploymentOrders
  );
  const strikeAssets2 = normalizeStrikeAssets(value.strikeAssets);
  const fireUnits2 = normalizeFireUnits(value.fireUnits);
  const fireControlPoints2 = normalizeFireControlPoints(value.fireControlPoints);
  const firePlanRows2 = normalizeFirePlanRows(value.firePlanRows);
  if (collateralMunitions) patch.collateralMunitions = collateralMunitions;
  if (orderCandidates2) patch.orderCandidates = orderCandidates2;
  if (routeOptions2) patch.routeOptions = routeOptions2;
  if (roadInfoRows2) patch.roadInfoRows = roadInfoRows2;
  if (rdAssessmentRows2) patch.rdAssessmentRows = rdAssessmentRows2;
  if (assistantVulnerabilityRows) {
    patch.assistantVulnerabilityRows = assistantVulnerabilityRows;
  }
  if (droneRedeploymentOrders2) {
    patch.droneRedeploymentOrders = droneRedeploymentOrders2;
  }
  if (strikeAssets2) patch.strikeAssets = strikeAssets2;
  if (fireUnits2) patch.fireUnits = fireUnits2;
  if (fireControlPoints2) {
    patch.fireControlPoints = fireControlPoints2;
  }
  if (firePlanRows2) patch.firePlanRows = firePlanRows2;
  return patch;
}
function normalizeSudoOperationalDataDocument(value) {
  if (!isRecord2(value)) {
    throw new Error("\uC6B4\uC6A9 \uB370\uC774\uD130 JSON \uB8E8\uD2B8\uAC00 \uAC1D\uCCB4\uAC00 \uC544\uB2D9\uB2C8\uB2E4.");
  }
  const raw = value;
  const scenarios = {};
  if (isRecord2(raw.scenarios)) {
    Object.entries(raw.scenarios).forEach(([scenarioId, patch]) => {
      const normalizedPatch = normalizeSudoOperationalDecisionPatch(patch);
      if (Object.keys(normalizedPatch).length > 0) {
        scenarios[scenarioId] = normalizedPatch;
      }
    });
  }
  const defaults = normalizeSudoOperationalDecisionPatch(raw.defaults);
  if (Object.keys(defaults).length === 0 && Object.keys(scenarios).length === 0) {
    throw new Error(
      "\uC6B4\uC6A9 \uB370\uC774\uD130\uC5D0 \uC801\uC6A9 \uAC00\uB2A5\uD55C defaults/scenarios \uAC12\uC774 \uC5C6\uC2B5\uB2C8\uB2E4."
    );
  }
  return {
    schemaVersion: asString2(raw.schemaVersion),
    name: asString2(raw.name),
    updatedAt: asString2(raw.updatedAt),
    defaults,
    scenarios
  };
}
function cloneDecisionInputs(inputs) {
  return {
    ...inputs,
    collateralMunitions: inputs.collateralMunitions.map((row) => ({ ...row })),
    orderCandidates: inputs.orderCandidates.map((row) => ({ ...row })),
    routeOptions: inputs.routeOptions.map((row) => ({ ...row })),
    roadInfoRows: inputs.roadInfoRows.map((row) => ({ ...row })),
    rdAssessmentRows: inputs.rdAssessmentRows.map((row) => ({ ...row })),
    assistantVulnerabilityRows: inputs.assistantVulnerabilityRows.map(
      (row) => ({
        ...row
      })
    ),
    droneRedeploymentOrders: inputs.droneRedeploymentOrders.map((row) => ({
      ...row
    })),
    strikeAssets: inputs.strikeAssets.map((row) => ({ ...row })),
    fireUnits: inputs.fireUnits.map((row) => ({ ...row })),
    fireControlPoints: { ...inputs.fireControlPoints },
    firePlanRows: inputs.firePlanRows.map((row) => ({ ...row }))
  };
}
function mergeDecisionPatch(base, patch) {
  if (!patch) {
    return cloneDecisionInputs(base);
  }
  return {
    ...base,
    ...patch,
    collateralMunitions: patch.collateralMunitions ? patch.collateralMunitions.map((row) => ({ ...row })) : base.collateralMunitions.map((row) => ({ ...row })),
    orderCandidates: patch.orderCandidates ? patch.orderCandidates.map((row) => ({ ...row })) : base.orderCandidates.map((row) => ({ ...row })),
    routeOptions: patch.routeOptions ? patch.routeOptions.map((row) => ({ ...row })) : base.routeOptions.map((row) => ({ ...row })),
    roadInfoRows: patch.roadInfoRows ? patch.roadInfoRows.map((row) => ({ ...row })) : base.roadInfoRows.map((row) => ({ ...row })),
    rdAssessmentRows: patch.rdAssessmentRows ? patch.rdAssessmentRows.map((row) => ({ ...row })) : base.rdAssessmentRows.map((row) => ({ ...row })),
    assistantVulnerabilityRows: patch.assistantVulnerabilityRows ? patch.assistantVulnerabilityRows.map((row) => ({ ...row })) : base.assistantVulnerabilityRows.map((row) => ({ ...row })),
    droneRedeploymentOrders: patch.droneRedeploymentOrders ? patch.droneRedeploymentOrders.map((row) => ({ ...row })) : base.droneRedeploymentOrders.map((row) => ({ ...row })),
    strikeAssets: patch.strikeAssets ? patch.strikeAssets.map((row) => ({ ...row })) : base.strikeAssets.map((row) => ({ ...row })),
    fireUnits: patch.fireUnits ? patch.fireUnits.map((row) => ({ ...row })) : base.fireUnits.map((row) => ({ ...row })),
    fireControlPoints: patch.fireControlPoints ? { ...base.fireControlPoints, ...patch.fireControlPoints } : { ...base.fireControlPoints },
    firePlanRows: patch.firePlanRows ? patch.firePlanRows.map((row) => ({ ...row })) : base.firePlanRows.map((row) => ({ ...row }))
  };
}
function buildDefaultSudoDecisionInputs() {
  return mergeDecisionPatch(defaultSudoDecisionInputs, {});
}
function normalizeSudoDecisionInputs(inputs) {
  return mergeDecisionPatch(
    buildDefaultSudoDecisionInputs(),
    normalizeSudoOperationalDecisionPatch(inputs)
  );
}
function buildSudoDecisionInputsFromOperationalData(base, document2, scenarioId) {
  const withDefaults = mergeDecisionPatch(base, document2.defaults);
  return mergeDecisionPatch(
    withDefaults,
    document2.scenarios[String(scenarioId)]
  );
}
function getSudoOperationalDataUrl(env = globalThis.__KAIROS_ENV__) {
  const configured = asString2(env.VITE_SUDO_OPERATIONAL_DATA_URL);
  return configured ?? DEFAULT_SUDO_OPERATIONAL_DATA_URL;
}
function buildIdleSudoOperationalDataState(url = getSudoOperationalDataUrl()) {
  return {
    status: "idle",
    url,
    scenarioIds: [],
    message: "\uC6B4\uC6A9 \uB370\uC774\uD130 \uB3D9\uAE30\uD654 \uC804\uC785\uB2C8\uB2E4."
  };
}
async function loadSudoOperationalData(url = getSudoOperationalDataUrl(), fetchImpl = fetch) {
  const response = await fetchImpl(url, {
    headers: { Accept: "application/json" }
  });
  if (!response.ok) {
    throw new Error(`\uC6B4\uC6A9 \uB370\uC774\uD130 \uC694\uCCAD \uC2E4\uD328: HTTP ${response.status}`);
  }
  const payload = await response.json();
  const document2 = normalizeSudoOperationalDataDocument(payload);
  return {
    document: document2,
    url,
    loadedAt: (/* @__PURE__ */ new Date()).toISOString()
  };
}
function buildReadySudoOperationalDataState(result) {
  const scenarioIds = Object.keys(result.document.scenarios).map((scenarioId) => Number(scenarioId)).filter((scenarioId) => Number.isFinite(scenarioId)).sort((left, right) => left - right);
  return {
    status: "ready",
    url: result.url,
    sourceName: result.document.name,
    schemaVersion: result.document.schemaVersion,
    updatedAt: result.document.updatedAt,
    loadedAt: result.loadedAt,
    scenarioIds,
    message: `${result.document.name ?? "\uC6B4\uC6A9 \uB370\uC774\uD130"} \uC801\uC6A9 \uAC00\uB2A5: ${scenarioIds.length}\uAC1C \uC2DC\uB098\uB9AC\uC624`
  };
}

// js/vendor/kairos/src/gui/sudo/sudoScenarios.ts
var SUDO_SCENARIO_7_TERRAIN_SUMMARY2 = `\uC0B0\uB9BC/\uB3C4\uC2EC ${SUDO_JANGDO_GIS_INTEL.forestPercent}% / \uAC1C\uD65C\uC9C0 ${SUDO_JANGDO_GIS_INTEL.openTerrainPercent}%`;
var sudoScenarios = [
  {
    id: 1,
    title: "\uB4DC\uB860 \uD45C\uC801 \uC2DD\uBCC4",
    implementationLevel: "\uD544\uC218 \uAD6C\uD604",
    visualKind: "drone",
    headline: "WARNING: \uB4DC\uB8601\uC774 \uD45C\uC801\uC744 \uC2DD\uBCC4\uD558\uC600\uC2B5\uB2C8\uB2E4.",
    objective: "\uC7A5\uB3C4\uD6C8\uB828\uC7A5 \uC9C0\uD615DB\uC640 \uC2E4\uC81C \uB4DC\uB860 \uCD2C\uC601 \uD45C\uC801 \uC601\uC0C1\uC744 \uD568\uAED8 \uC804\uC2DC",
    evidence: [
      "\uC7A5\uB3C4\uD6C8\uB828\uC7A5 \uC2E4\uAE30\uB3D9 \uCD2C\uC601 \uC601\uC0C1\uC5D0\uC11C \uB3C4\uB85C\uC0C1 \uD45C\uC801 bbox \uD655\uC778",
      "\uC9C0\uD615DB, \uB4DC\uB860\uC790\uC138, \uC704\uCE58, \uACE0\uB3C4, \uAC10\uC2DC\uC88C\uD45C \uB3D9\uC2DC \uC804\uC2DC",
      "\uD45C\uC801\uC88C\uD45C BH 12345 67890, \uB4DC\uB860\uC88C\uD45C BH 12321 56789 \uD615\uC2DD \uC801\uC6A9"
    ],
    process: [
      "\uB4DC\uB8601 EO \uC601\uC0C1\uC5D0\uC11C \uD45C\uC801 \uD6C4\uBCF4\uB97C \uD0D0\uC9C0\uD558\uACE0 \uBE68\uAC04 bbox\uB85C \uD45C\uC2DC",
      "\uD0D0\uC9C0 \uC9C0\uC810\uC744 \uC7A5\uB3C4\uD6C8\uB828\uC7A5 \uC9C0\uD615DB\uC640 \uB9E4\uCE6D",
      "\uC2DD\uBCC4 \uC54C\uB9BC\uC744 \uC8FC \uD654\uBA74\uC5D0 \uB744\uC6B0\uACE0 \uBCF4\uC870 \uD654\uBA74\uC5D0 \uC2E4\uC81C \uC601\uC0C1/\uC0AC\uC9C4\uC744 \uC5F0\uACB0"
    ],
    decision: "\uD45C\uC801 \uD6C4\uBCF4 1\uAC74\uC744 \uC2DD\uBCC4\uD558\uACE0 \uD45C\uC801\uC131\uC9C8 \uBD84\uC11D \uB2E8\uACC4\uB85C \uC774\uAD00\uD569\uB2C8\uB2E4.",
    upgrade: {
      label: "TOD-\uB4DC\uB860 \uC804\uD658 \uC2E0\uB8B0\uB3C4 \uBCF4\uAC15",
      outcome: "TOD \uAC10\uC2DC, \uB4DC\uB860 \uCD9C\uB3D9, bbox \uC774\uAD00 \uC0C1\uD0DC\uB97C \uD55C \uD750\uB984\uC73C\uB85C \uBB36\uC5B4 \uAC10\uC9C0 \uBBF8\uC5F0\uACB0\uACFC \uAC10\uC9C0 \uBC18\uC601\uC744 \uAD6C\uBD84\uD569\uB2C8\uB2E4.",
      operatorCue: "TOD \uAC10\uC9C0\uC0C1\uD0DC\uC640 \uB4DC\uB860 bbox \uC774\uAD00 \uC5EC\uBD80\uB97C \uBA3C\uC800 \uD655\uC778\uD558\uC138\uC694."
    },
    metrics: [
      { label: "\uB4DC\uB860", value: "\uB4DC\uB8601", tone: "blue" },
      { label: "\uD45C\uC801\uC88C\uD45C", value: "BH 12345 67890", tone: "green" },
      { label: "\uC81C\uACF5\uC790\uB8CC", value: "1-1 / 1-2", tone: "amber" }
    ],
    table: {
      title: "\uB4DC\uB860\uC6B4\uC6A9 \uD604\uD669",
      columns: [
        { key: "item", label: "\uD56D\uBAA9" },
        { key: "value", label: "\uC804\uC2DC\uAC12" },
        { key: "source", label: "\uADFC\uAC70\uC790\uB8CC" }
      ],
      rows: getSudoDroneIdentificationRowsForVisual()
    }
  },
  {
    id: 2,
    title: "\uD45C\uC801\uC131\uC9C8\uBD84\uC11D",
    implementationLevel: "\uD544\uC218 \uAD6C\uD604",
    visualKind: "classification",
    headline: "\uD45C\uC801\uC131\uC9C8 \uD310\uB2E8: 240mm \uBC29\uC0AC\uD3EC(M-1991) 99.8%",
    objective: "\uAC1D\uCCB4\uC778\uC2DD \uACB0\uACFC\uC640 \uD615\uC0C1 \uD310\uB2E8\uADFC\uAC70 7\uAC1C\uB97C \uBCF4\uC870 \uD654\uBA74\uC5D0 \uAD6C\uC870\uD654",
    evidence: [
      "\uC804\uD3ED/\uC804\uC7A5 \uC81C\uC6D0 \uC77C\uCE58",
      "\uC2E4\uC2DC\uAC04 YOLO \uCC28\uB7C9 track \uD655\uC778",
      "\uD6C4\uBCF4 \uD655\uB960 240mm \uBC29\uC0AC\uD3EC(M-1991) 99.8%, M-1989 0.2%"
    ],
    process: [
      "\uC804\uC1A1 \uC601\uC0C1\uC5D0\uC11C \uCC28\uB7C9 \uC678\uACFD bbox\uB97C \uCD94\uCD9C",
      "\uBC1C\uC0AC\uAD00, \uCC28\uCCB4, \uC6B4\uC804\uC11D, \uCC28\uB7C9\uD6C4\uBBF8 \uD2B9\uC9D5\uC744 \uCC38\uC870 \uD615\uC0C1\uACFC \uBE44\uAD50",
      "\uD6C4\uBCF4 \uD655\uB960\uD45C\uC640 \uD310\uB2E8\uADFC\uAC70 \uBAA9\uB85D\uC744 \uD568\uAED8 \uC804\uC2DC"
    ],
    decision: "\uD45C\uC801\uC131\uC9C8 \uD310\uC815: 240mm \uBC29\uC0AC\uD3EC(M-1991), \uC2E0\uB8B0\uB3C4 99.8%",
    upgrade: {
      label: "\uD615\uC0C1\uADFC\uAC70 \uC6B0\uC120\uC21C\uC704 \uBCF4\uAC15",
      outcome: "\uBC1C\uC0AC\uAD00, \uCC28\uCCB4, \uC6B4\uC804\uC11D, \uCC28\uB7C9\uD6C4\uBBF8 \uADFC\uAC70\uB97C \uD6C4\uBCF4 \uD655\uB960\uBCF4\uB2E4 \uBA3C\uC800 \uBCF4\uC774\uAC8C \uC815\uB9AC\uD574 generic vehicle \uC624\uD310\uC744 \uB0AE\uCDA5\uB2C8\uB2E4.",
      operatorCue: "240mm \uD655\uC815 \uC804 \uBC1C\uC0AC\uAD00/TEL \uD615\uC0C1 \uADFC\uAC70\uAC00 \uBD84\uB9AC\uB410\uB294\uC9C0 \uD655\uC778\uD558\uC138\uC694."
    },
    metrics: [
      { label: "\uD45C\uC801\uC131\uC9C8", value: "240mm \uBC29\uC0AC\uD3EC(M-1991)", tone: "green" },
      { label: "\uD45C\uC801\uC88C\uD45C", value: "BH 12345 67890", tone: "green" },
      { label: "\uC2E0\uB8B0\uB3C4", value: "99.8%", tone: "green" },
      { label: "\uADFC\uAC70", value: "7\uAC1C", tone: "blue" }
    ],
    table: {
      title: "\uD45C\uC801\uC131\uC9C8 \uD310\uB2E8\uADFC\uAC70",
      columns: [
        { key: "basis", label: "\uD310\uB2E8\uADFC\uAC70" },
        { key: "observed", label: "\uAD00\uCE21\uB0B4\uC6A9" },
        { key: "grade", label: "\uD310\uC815" },
        { key: "source", label: "\uADFC\uAC70\uC790\uB8CC" }
      ],
      rows: SUDO_TARGET_CLASSIFICATION_EVIDENCE_ROWS.map((row) => ({
        ...row
      }))
    }
  },
  {
    id: 3,
    title: "\uBD80\uB300\uADDC\uBAA8 \uD310\uB2E8",
    implementationLevel: "\uBAA9\uC5C5",
    visualKind: "scale",
    headline: "\uD504\uB808\uC784 \uC2DD\uBCC4 3\uB300\uC640 \uD589\uAD70\uC7A5\uACBD 350m\uB85C \uC911\uB300\uADDC\uBAA8\uB97C \uD310\uB2E8\uD569\uB2C8\uB2E4.",
    objective: "\uD504\uB808\uC784 bbox 3\uAC74\uACFC 3-1 \uD589\uAD70\uC7A5\uACBD/\uD3B8\uC131\uD45C\uB97C \uADFC\uAC70\uB85C \uBD80\uB300\uADDC\uBAA8 \uC0B0\uC815",
    evidence: [
      "\uAC1D\uCCB4\uC778\uC2DD bbox 3\uAC74: \uC120\uB450 \uCC28\uB7C9, \uC911\uAC04 \uD2B8\uB7ED, \uD6C4\uBBF8 \uBC29\uC0AC\uD3EC",
      "\uD589\uAD70\uC7A5\uACBD \uC57D 350m",
      "\uC7A5\uBE44\uB300\uC218\uC640 \uD589\uAD70\uC7A5\uACBD \uD310\uC815 \uC911 \uB354 \uD070 \uADDC\uBAA8\uB97C \uC885\uD569 \uD310\uC815\uC5D0 \uBC18\uC601"
    ],
    process: [
      "\uB4DC\uB860 \uD504\uB808\uC784\uC5D0\uC11C \uCD08\uB85D bbox 3\uAC74\uC744 \uC2DD\uBCC4",
      "\uC120\uB450-\uD6C4\uBBF8 \uAC70\uB9AC\uB85C \uD589\uAD70\uC7A5\uACBD \uC57D 350m \uC0B0\uCD9C",
      "3-1 \uBD80\uB300\uBCC4 \uD589\uAD70\uC7A5\uACBD \uAE30\uC900\uD45C\uC640 \uD3B8\uC131 \uC218\uB7C9\uC744 \uBE44\uAD50"
    ],
    decision: "\uBD80\uB300\uADDC\uBAA8 \uD310\uC815: \uC7A5\uBE44\uB300\uC218\uC640 \uD589\uAD70\uC7A5\uACBD \uAE30\uC900\uC744 \uC885\uD569\uD574 \uADDC\uBAA8 \uC0B0\uCD9C",
    upgrade: {
      label: "\uD589\uAD70\uC7A5\uACBD \uC0B0\uC815 \uBCF4\uAC15",
      outcome: "\uD504\uB808\uC784 bbox \uC218\uB7C9\uACFC \uC120\uB450-\uD6C4\uBBF8 \uD589\uAD70\uC7A5\uACBD\uC744 \uD568\uAED8 \uD45C\uC2DC\uD574 \uC7A5\uBE44\uB300\uC218 \uAE30\uC900\uACFC \uB300\uC5F4 \uAE38\uC774 \uAE30\uC900\uC758 \uCC28\uC774\uB97C \uB4DC\uB7EC\uB0C5\uB2C8\uB2E4.",
      operatorCue: "\uAD00\uCE21 \uB300\uC218\uC640 350m \uD589\uAD70\uC7A5\uACBD \uC911 \uD070 \uADDC\uBAA8 \uAE30\uC900\uC744 \uBE44\uAD50\uD558\uC138\uC694."
    },
    metrics: [
      { label: "\uD310\uC815", value: "AI \uC0B0\uCD9C", tone: "green" },
      { label: "\uD589\uAD70\uC7A5\uACBD", value: "350m", tone: "blue" },
      { label: "\uD3B8\uC131", value: "\uD504\uB808\uC784 3\uB300", tone: "amber" }
    ],
    table: {
      title: "3-1 \uBD80\uB300\uBCC4 \uD589\uAD70\uC7A5\uACBD \uAE30\uC900",
      columns: [
        { key: "unit", label: "\uD3B8\uC131" },
        { key: "equipment", label: "\uC7A5\uBE44\uAD6C\uC131" },
        { key: "length", label: "\uD589\uAD70\uC7A5\uACBD" },
        { key: "grade", label: "\uD310\uC815" }
      ],
      rows: getSudoScaleDoctrineRowsForVisual()
    }
  },
  {
    id: 4,
    title: "\uC804\uD22C\uC11C\uC5F4 \uD310\uB2E8",
    implementationLevel: "\uBAA9\uC5C5",
    visualKind: "order",
    headline: "\uD45C\uC801\uC88C\uD45C\uC640 \uCD5C\uAE30\uBD80\uB300 DB\uB97C \uBE44\uAD50\uD574 1\uC0AC\uB2E8 1\uB300\uB300 2\uC911\uB300\uB97C 1\uC21C\uC704\uB85C \uD310\uB2E8\uD569\uB2C8\uB2E4.",
    objective: "4-1 \uC778\uADFC\uBD80\uB300 \uC704\uCE58/\uBCF4\uC720\uC7A5\uBE44 \uD45C\uB97C \uAE30\uBC18\uC73C\uB85C \uC804\uD22C\uC11C\uC5F4 \uD6C4\uBCF4 \uC815\uB82C",
    evidence: [
      "\uD45C\uC801\uC88C\uD45C BH 12345 67890",
      "BH 12415 67915, 106m \uC774\uACA9, 1\uC0AC\uB2E8 1\uB300\uB300 2\uC911\uB300 240mm \uBC29\uC0AC\uD3EC",
      "\uADFC\uC811 \uD6C4\uBCF4 152mm \uC790\uC8FC\uD3EC\uB294 \uD45C\uC801\uC131\uC9C8 \uBD88\uC77C\uCE58\uB85C 2\uC21C\uC704"
    ],
    process: [
      "\uD45C\uC801\uC88C\uD45C\uC640 \uCD5C\uAE30\uBD80\uB300 \uC704\uCE58 \uAC04 \uC774\uACA9\uAC70\uB9AC \uACC4\uC0B0",
      "\uC804\uD22C\uC11C\uC5F4\uBA85\uACFC \uBCF4\uC720\uD654\uAE30, \uC218\uB7C9\uC744 \uD45C\uC801\uC131\uC9C8\uACFC \uB9E4\uCE6D",
      "\uC774\uACA9\uAC70\uB9AC, \uD654\uAE30 \uC77C\uCE58, \uBCF4\uC720\uC7A5\uBE44 \uC218\uB7C9\uC744 \uAE30\uC900\uC73C\uB85C \uC21C\uC704\uD654"
    ],
    decision: "\uC608\uC0C1 \uC804\uD22C\uC11C\uC5F4: 1\uC0AC\uB2E8 1\uB300\uB300 2\uC911\uB300 240mm \uBC29\uC0AC\uD3EC, 99.8%",
    upgrade: {
      label: "\uC804\uD22C\uC11C\uC5F4 \uD6C4\uBCF4 \uBE44\uAD50 \uBCF4\uAC15",
      outcome: "\uCD5C\uAE30\uBD80\uB300 \uAC70\uB9AC, \uD654\uAE30 \uC77C\uCE58, \uBCF4\uC720\uC7A5\uBE44 \uC218\uB7C9\uC744 \uD55C \uD6C4\uBCF4\uD45C\uC5D0 \uBB36\uC5B4 1\uC21C\uC704\uC640 \uC81C\uC678 \uD6C4\uBCF4\uC758 \uCC28\uC774\uB97C \uC989\uC2DC \uBE44\uAD50\uD569\uB2C8\uB2E4.",
      operatorCue: "106m \uC774\uACA9 \uD6C4\uBCF4\uC640 152mm \uBD88\uC77C\uCE58 \uD6C4\uBCF4\uB97C \uAC19\uC774 \uD655\uC778\uD558\uC138\uC694."
    },
    metrics: [
      { label: "1\uC21C\uC704", value: "1\uC0AC\uB2E8 1\uB300\uB300 2\uC911\uB300", tone: "green" },
      { label: "\uC774\uACA9", value: "106m", tone: "blue" },
      { label: "\uD654\uAE30", value: "240mm \uBC29\uC0AC\uD3EC", tone: "amber" }
    ],
    table: {
      title: "4-1 \uC804\uD22C\uC11C\uC5F4 \uD6C4\uBCF4\uD45C",
      columns: [
        { key: "target", label: "\uD45C\uC801\uC88C\uD45C" },
        { key: "coord", label: "\uCD5C\uAE30\uBD80\uB300 \uC801 \uC704\uCE58" },
        { key: "distance", label: "\uC774\uACA9\uAC70\uB9AC" },
        { key: "unit", label: "\uC804\uD22C\uC11C\uC5F4" },
        { key: "equipment", label: "\uBCF4\uC720\uC7A5\uBE44" },
        { key: "rank", label: "\uC21C\uC704" }
      ],
      rows: SUDO_ORDER_CANDIDATE_SOURCE_ROWS.map((row) => ({
        target: row.targetCoordinate,
        coord: row.coordinate,
        distance: formatSudoOrderDistance(row.distanceM),
        unit: row.unit,
        equipment: `${row.weapon} / ${row.equipment}`,
        rank: row.sourceRank
      }))
    }
  },
  {
    id: 5,
    title: "\uBD80\uC218\uC801 \uD53C\uD574 \uD310\uB2E8",
    implementationLevel: "\uBAA9\uC5C5",
    visualKind: "collateral",
    headline: "\uAC70\uB9AC\uBCC4 CDE \uD45C\uC640 \uBBFC\uAC00\uC9C0\uC5ED \uBC18\uACBD\uC744 \uBE44\uAD50\uD574 HEBB \uC0AC\uACA9\uAC00\uB2A5\uC73C\uB85C \uD310\uB2E8\uD569\uB2C8\uB2E4.",
    objective: "5-1 \uD0C4\uC885\uBCC4 \uBD80\uC218\uC801 \uD6A8\uACFC\uBC18\uACBD \uD45C\uB97C \uC9C0\uB3C4 \uBC18\uACBD \uD310\uB2E8\uACFC \uC5F0\uACB0",
    evidence: [
      "\uD0C4\uC885\uBCC4 CDE: HE, HEBB, DPICM, DPBB",
      "18km \uAE30\uC900 HEBB 106, DPBB 236",
      "DPBB \uC0AC\uACA9 \uC2DC \uBBFC\uAC00\uC9C0\uC5ED \uD53C\uD574\uBC1C\uC0DD \uAC00\uB2A5"
    ],
    process: [
      "\uD45C\uC801\uACFC \uBBFC\uAC00\uC9C0\uC5ED\uC744 \uC9C0\uD615DB \uC704\uC5D0 \uD45C\uC2DC",
      "\uAC70\uB9AC\uBCC4 CDE \uD45C\uC5D0\uC11C \uD604\uC7AC \uC0AC\uAC70\uB9AC \uAD6C\uAC04\uC758 \uD0C4\uC885\uBCC4 \uBC18\uACBD\uC744 \uC870\uD68C",
      "HEBB/DPBB \uBC18\uACBD\uACFC \uBBFC\uAC00\uC9C0\uC5ED \uC911\uCCA9 \uC5EC\uBD80\uB97C \uBE44\uAD50"
    ],
    decision: "\uBD80\uC218\uD53C\uD574 \uD310\uB2E8: HEBB \uC0AC\uACA9\uAC00\uB2A5",
    upgrade: {
      label: "CDE \uC548\uC804\uC5EC\uC720 \uBCF4\uAC15",
      outcome: "HEBB\uC640 DPBB \uD6A8\uACFC\uBC18\uACBD\uC744 \uBBFC\uAC00\uC9C0\uC5ED \uBC18\uACBD\uACFC \uAC19\uC740 \uD310\uB2E8 \uB2E8\uC704\uB85C \uC815\uB9AC\uD574 \uD5C8\uC6A9 \uD0C4\uC885\uACFC \uC81C\uD55C \uD0C4\uC885\uC744 \uBD84\uB9AC\uD569\uB2C8\uB2E4.",
      operatorCue: "HEBB 106m\uC640 DPBB 236m \uC911\uCCA9 \uCC28\uC774\uB97C \uD655\uC778\uD558\uC138\uC694."
    },
    metrics: [
      { label: "\uD310\uC815", value: "HEBB \uAC00\uB2A5", tone: "green" },
      { label: "18km HEBB", value: "106", tone: "blue" },
      { label: "18km DPBB", value: "236", tone: "amber" }
    ],
    table: {
      title: "5-1 \uD0C4\uC885\uBCC4 \uBD80\uC218\uC801 \uD6A8\uACFC\uBC18\uACBD \uC77C\uBD80",
      columns: [
        { key: "distance", label: "\uC0AC\uAC70\uB9AC" },
        { key: "he", label: "HE" },
        { key: "hebb", label: "HEBB" },
        { key: "dp", label: "DPICM" },
        { key: "dpbb", label: "DPBB" }
      ],
      rows: [
        {
          distance: "17km",
          he: "88",
          hebb: "103",
          dp: "110",
          dpbb: "231"
        },
        {
          distance: "18km",
          he: "92",
          hebb: "106",
          dp: "113",
          dpbb: "236"
        },
        {
          distance: "19km",
          he: "-",
          hebb: "110",
          dp: "-",
          dpbb: "239"
        },
        {
          distance: "20km",
          he: "-",
          hebb: "114",
          dp: "-",
          dpbb: "242"
        },
        {
          distance: "21km",
          he: "-",
          hebb: "119",
          dp: "-",
          dpbb: "246"
        },
        {
          distance: "22km",
          he: "-",
          hebb: "126",
          dp: "-",
          dpbb: "255"
        }
      ]
    }
  },
  {
    id: 6,
    title: "\uCDA9\uC758 AI\uC5B4\uC2DC\uC2A4\uD134\uD2B8",
    implementationLevel: "\uBAA9\uC5C5",
    visualKind: "assistant",
    headline: "240mm \uBC29\uC0AC\uD3EC \uCDE8\uC57D\uC810\uC744 8\uAC1C \uCE74\uB4DC\uD615 \uADFC\uAC70\uB85C \uC81C\uACF5\uD569\uB2C8\uB2E4.",
    objective: "6-1 \uCDE8\uC57D\uC810 \uC2AC\uB77C\uC774\uB4DC\uC758 \uCE74\uB4DC \uAD6C\uC870\uB97C \uCDA9\uC758-GPT \uB2F5\uBCC0\uC73C\uB85C \uD655\uC7A5",
    evidence: [
      "\uBC1C\uC0AC \uC704\uCE58 \uB178\uCD9C, \uC7AC\uC7A5\uC804 \uC2DC\uAC04 \uBB38\uC81C",
      "\uAE30\uB3D9\uC131 \uD55C\uACC4, \uC815\uBC00\uB3C4 \uD55C\uACC4",
      "\uD0C4\uC57D\xB7\uBB3C\uB958 \uBD80\uB2F4, \uB4DC\uB860 \uC2DC\uB300\uC758 \uCDE8\uC57D\uC131, \uAE30\uC0C1 \uC601\uD5A5, \uAE30\uD0C0 \uCDE8\uC57D \uC694\uC18C"
    ],
    process: [
      "\uC0AC\uC6A9\uC790 \uC9C8\uC758\uB97C \uD45C\uC801\uC131\uC9C8 240mm \uBC29\uC0AC\uD3EC\uC640 \uB9E4\uCE6D",
      "6-1 \uCDE8\uC57D\uC810 \uC790\uB8CC\uC5D0\uC11C \uCE74\uB4DC\uD615 \uADFC\uAC70\uB97C \uAC80\uC0C9",
      "240mm \uBC29\uC0AC\uD3EC\uC640 152mm \uC790\uC8FC\uD3EC \uCDE8\uC57D\uC810 \uC790\uB8CC\uB97C \uBCF4\uC870 \uC9C0\uC2DD\uC73C\uB85C \uC5F0\uACB0"
    ],
    decision: "\uCDA9\uC758-GPT \uB2F5\uBCC0\uC744 \uD45C\uC801\uC131\uC9C8/\uC0AC\uACA9\uACC4\uD68D \uBCF4\uC870\uADFC\uAC70\uB85C \uCCA8\uBD80\uD569\uB2C8\uB2E4.",
    upgrade: {
      label: "\uCDE8\uC57D\uC810 \uCE74\uB4DC \uB2F5\uBCC0 \uBCF4\uAC15",
      outcome: "8\uAC1C \uCDE8\uC57D\uC810 \uCE74\uB4DC\uB97C \uB2F5\uBCC0 \uADFC\uAC70\uC640 \uC791\uC804\uD65C\uC6A9 \uBB38\uC7A5\uC73C\uB85C \uB098\uB220 \uCDA9\uC758-GPT \uACB0\uACFC\uAC00 \uD45C\uC801 \uD310\uB2E8 \uADFC\uAC70\uB85C \uC7AC\uC0AC\uC6A9\uB418\uAC8C \uD569\uB2C8\uB2E4.",
      operatorCue: "\uBC1C\uC0AC \uC704\uCE58 \uB178\uCD9C\uACFC \uC7AC\uC7A5\uC804 \uC2DC\uAC04 \uCDE8\uC57D\uC810\uC744 \uC6B0\uC120 \uD655\uC778\uD558\uC138\uC694."
    },
    metrics: [
      { label: "\uADFC\uAC70\uCE74\uB4DC", value: "8\uAC1C", tone: "green" },
      { label: "\uB300\uC0C1", value: "240mm \uBC29\uC0AC\uD3EC", tone: "blue" },
      { label: "\uC790\uB8CC", value: "6-1", tone: "amber" }
    ],
    assistantPrompt: "240mm \uBC29\uC0AC\uD3EC \uCDE8\uC57D\uC810 \uC54C\uB824\uC918",
    assistantAnswer: [
      "\uBC1C\uC0AC \uC704\uCE58 \uB178\uCD9C: \uC0AC\uACA9 \uC21C\uAC04 \uBC1C\uC0AC \uC12C\uAD11\uACFC \uD6C4\uD3ED\uD48D\uC73C\uB85C \uC704\uCE58\uAC00 \uB178\uCD9C\uB429\uB2C8\uB2E4.",
      "\uC7AC\uC7A5\uC804 \uC2DC\uAC04 \uBB38\uC81C: \uCC28\uD0C4 \uC900\uBE44 \uC911 \uB300\uD654\uB825 \uD0C0\uACA9 \uC2DC\uAC04\uCC3D\uC774 \uD615\uC131\uB429\uB2C8\uB2E4.",
      "\uAE30\uB3D9\uC131 \uD55C\uACC4: \uCC28\uB95C\uD615 TEL\uC740 \uAE30\uB3D9\uB85C \uCC28\uB2E8 \uC2DC \uD68C\uD53C\uAC00 \uC5B4\uB835\uC2B5\uB2C8\uB2E4.",
      "\uC815\uBC00\uB3C4 \uD55C\uACC4: \uC7A5\uAC70\uB9AC \uC0AC\uACA9 \uC2DC \uD0C4\uCC29 \uBD84\uC0B0\uACFC \uBCF4\uC815 \uD55C\uACC4\uAC00 \uD07D\uB2C8\uB2E4.",
      "\uD0C4\uC57D\xB7\uBB3C\uB958 \uBD80\uB2F4: \uB300\uD615 \uD0C4\uC57D \uBCF4\uAE09\uACFC \uC7AC\uC7A5\uC804 \uCC28\uB7C9 \uC758\uC874\uB3C4\uAC00 \uB192\uC2B5\uB2C8\uB2E4.",
      "\uB4DC\uB860 \uC2DC\uB300\uC758 \uCDE8\uC57D\uC131: \uC0C1\uC2DC \uAC10\uC2DC\uC640 \uC7AC\uD0D0\uC9C0\uC5D0 \uB178\uCD9C\uB429\uB2C8\uB2E4.",
      "\uAE30\uC0C1 \uC601\uD5A5: \uAD00\uCE21, \uAE30\uB3D9, \uC0AC\uACA9\uC815\uD655\uB3C4\uAC00 \uAE30\uC0C1\uC5D0 \uC601\uD5A5\uC744 \uBC1B\uC2B5\uB2C8\uB2E4.",
      "\uAE30\uD0C0 \uCDE8\uC57D \uC694\uC18C: \uC9C4\uC9C0 \uC120\uD0DD, \uC740\uD3D0, \uD1B5\uC2E0 \uC720\uC9C0 \uC2E4\uD328\uAC00 \uC0DD\uC874\uC131\uC744 \uB0AE\uCDA5\uB2C8\uB2E4."
    ],
    table: {
      title: "6-1 \uCDE8\uC57D\uC810 \uCE74\uB4DC",
      columns: [
        { key: "factor", label: "\uCDE8\uC57D\uC810" },
        { key: "evidence", label: "\uC694\uC57D" },
        { key: "impact", label: "\uC791\uC804\uD65C\uC6A9" },
        { key: "grade", label: "\uC6B0\uC120\uB3C4" },
        { key: "source", label: "\uC6D0\uCC9C" }
      ],
      rows: SUDO_ASSISTANT_240MM_VULNERABILITY_CARDS.map((card) => ({
        factor: card.factor,
        evidence: card.evidence,
        impact: card.impact,
        grade: card.grade,
        source: card.source
      }))
    }
  },
  {
    id: 7,
    title: "\uD0C4\uC885/\uBC1C\uC218 \uD310\uB2E8",
    implementationLevel: "\uD544\uC218 \uAD6C\uD604",
    visualKind: "munition",
    headline: `122/240\uBC00\uB9AC \uBC29\uC0AC\uD3EC, 0~6km, ${SUDO_SCENARIO_7_TERRAIN_SUMMARY2}, \uD30C\uAD34 30% \uAE30\uC900 HE 6\uBC1C\uC785\uB2C8\uB2E4.`,
    objective: "7-1~2 \uBB34\uAE30\uD6A8\uACFC \uB9E4\uD2B8\uB9AD\uC2A4\uC640 \uC9C0\uD615\uBD84\uC11D \uACB0\uACFC\uB97C \uACB0\uD569\uD574 \uD0C4\uC885/\uBC1C\uC218 \uC0B0\uCD9C",
    evidence: [
      "\uD45C\uC801\uC131\uC9C8: 122/240\uBC00\uB9AC \uBC29\uC0AC\uD3EC",
      `\uC0AC\uAC70\uB9AC: 0~6km, \uC9C0\uD615: ${SUDO_SCENARIO_7_TERRAIN_SUMMARY2}`,
      "\uC694\uB9DD\uD6A8\uACFC: \uD30C\uAD34 30%, \uACB0\uACFC: HE 6\uBC1C"
    ],
    process: [
      "\uC9C0\uD615DB\uC5D0\uC11C \uC0B0\uB9BC/\uB3C4\uC2EC \uC6B0\uC138 \uC9C0\uD615\uBD84\uC11D \uACB0\uACFC\uB97C \uD655\uC778",
      "\uD45C\uC801\uC131\uC9C8\uACFC \uC0AC\uAC70\uB9AC \uAD6C\uAC04\uC744 \uBB34\uAE30\uD6A8\uACFC \uD310\uB2E8\uD45C\uC5D0 \uC785\uB825",
      "\uC694\uB9DD\uD6A8\uACFC 30%\uB97C \uCDA9\uC871\uD558\uB294 \uB300\uB300 \uD589\uC758 HE 6\uBC1C\uC744 \uC120\uD0DD"
    ],
    decision: "\uCD5C\uC885 \uD310\uC815: HE 6\uBC1C",
    upgrade: {
      label: "\uC9C0\uD615-\uBB34\uAE30\uD6A8\uACFC \uACB0\uD569 \uBCF4\uAC15",
      outcome: "\uC0B0\uB9BC/\uB3C4\uC2EC \uD53C\uBCF5, \uAC1C\uD65C\uC9C0 \uBE44\uC728, \uC0AC\uAC70\uB9AC 0~6km\uB97C 7-1~2 \uBB34\uAE30\uD6A8\uACFC \uD589 \uC120\uD0DD\uACFC \uC9C1\uC811 \uC5F0\uACB0\uD569\uB2C8\uB2E4.",
      operatorCue: "HE 6\uBC1C\uACFC 100\uD3EC\uBCD1\uB300\uB300 HE\uD0C4 3R \uC0AC\uACA9\uC9C0\uC2DC\uAC00 \uC5F0\uACB0\uB418\uB294\uC9C0 \uD655\uC778\uD558\uC138\uC694."
    },
    metrics: [
      { label: "\uD0C4\uC885", value: "HE", tone: "green" },
      { label: "\uBC1C\uC218", value: "24\uBC1C", tone: "blue" },
      { label: "\uC694\uB9DD\uD6A8\uACFC", value: "30%", tone: "amber" }
    ],
    table: {
      title: "7-1~2 \uD0C4\uC885/\uBC1C\uC218 \uD310\uB2E8\uD45C",
      columns: [
        { key: "target", label: "\uD45C\uC801\uC131\uC9C8" },
        { key: "range", label: "\uC0AC\uAC70\uB9AC" },
        { key: "terrain", label: "\uC9C0\uD615" },
        { key: "fireUnit", label: "\uC0AC\uACA9\uBD80\uB300" },
        { key: "effect10", label: "10%" },
        { key: "effect20", label: "20%" },
        { key: "effect30", label: "30%" }
      ],
      rows: getSudoMunitionEffectRowsForVisual()
    }
  },
  {
    id: 8,
    title: "\uCD5C\uC801\uC758 \uC0AC\uACA9\uBD80\uB300 \uC120\uC815",
    implementationLevel: "\uD544\uC218 \uAD6C\uD604",
    visualKind: "firingUnit",
    headline: "5\uAC1C \uD3C9\uAC00\uD56D\uBAA9\uC744 \uBE44\uAD50\uD574 100\uD3EC\uBCD1\uB300\uB300(K105A1)\uB97C \uC120\uC815\uD569\uB2C8\uB2E4.",
    objective: "8-1 \uD6C4\uBCF4\uBD80\uB300 \uD45C\uC758 \uC0AC\uAC70\uB9AC, \uC0DD\uC874\uC131, \uD0C4\uBCF4\uC720, \uBBFC\uAC04\uD53C\uD574, \uC804\uD22C\uB825\uC218\uC900 \uBC18\uC601",
    evidence: [
      "100\uD3EC\uBCD1\uB300\uB300(K105A1): \uCD5C\uB300\uC0AC\uAC70\uB9AC 11km \uB0B4 6km \uC0AC\uACA9 \uAC00\uB2A5",
      "\uC720\uAC1C\uD638 \uD3EC\uC0C1\uC73C\uB85C \uC0DD\uC874\uC131 \uBCF4\uC7A5",
      "HE 100R \uBCF4\uC720, \uBBFC\uAC04\uD53C\uD574 \uC5C6\uC74C, \uC804\uD22C\uB825 \uC218\uC900 \uC591\uD638"
    ],
    process: [
      "\uD6C4\uBCF4 5\uAC1C \uBD80\uB300\uC758 \uC0AC\uAC70\uB9AC \uAC00\uB2A5 \uC5EC\uBD80\uB97C \uBE44\uAD50",
      "\uC0DD\uC874\uC131\uBCF4\uC7A5, \uD0C4 \uBCF4\uC720\uB7C9, \uBBFC\uAC04\uD53C\uD574, \uC804\uD22C\uB825\uC218\uC900\uC744 \uD589\uB82C\uB85C \uD3C9\uAC00",
      "\uBAA8\uB4E0 \uC870\uAC74\uC744 \uCDA9\uC871\uD558\uB294 100\uD3EC\uBCD1\uB300\uB300(K105A1)\uB97C \uCD5C\uC885 \uC120\uC815"
    ],
    decision: "\uC0AC\uACA9\uAC00\uB2A5\uBD80\uB300: 100\uD3EC\uBCD1\uB300\uB300(K105A1)",
    upgrade: {
      label: "\uC0AC\uACA9\uBD80\uB300 \uC81C\uC678\uC0AC\uC720 \uBCF4\uAC15",
      outcome: "\uC0AC\uAC70\uB9AC, \uC0DD\uC874\uC131, \uD0C4\uBCF4\uC720\uB7C9, \uBBFC\uAC04\uD53C\uD574, \uC804\uD22C\uB825\uC218\uC900\uC744 \uD6C4\uBCF4\uBCC4 \uC81C\uC678\uC0AC\uC720\uAE4C\uC9C0 \uD568\uAED8 \uBCF4\uC5EC \uCD5C\uC885 \uC120\uC815 \uADFC\uAC70\uB97C \uAC15\uD654\uD569\uB2C8\uB2E4.",
      operatorCue: "100\uD3EC\uBCD1\uB300\uB300 \uC120\uC815 \uC804\uC5D0 K9/K55A1 \uC81C\uC678 \uC0AC\uC720\uB97C \uD655\uC778\uD558\uC138\uC694."
    },
    metrics: [
      { label: "\uCD94\uCC9C\uBD80\uB300", value: "100\uD3EC\uBCD1\uB300\uB300", tone: "green" },
      { label: "\uD654\uAE30", value: "K105A1", tone: "blue" },
      { label: "\uD0C4", value: "HE 100R", tone: "amber" }
    ],
    table: {
      title: "8-1 \uCD5C\uC801 \uC0AC\uACA9\uBD80\uB300 \uD310\uB2E8",
      columns: [
        { key: "unit", label: "\uD6C4\uBCF4\uBD80\uB300" },
        { key: "range", label: "\uC0AC\uAC70\uB9AC" },
        { key: "survival", label: "\uC0DD\uC874\uC131" },
        { key: "ammo", label: "\uD0C4\uBCF4\uC720\uB7C9" },
        { key: "civilian", label: "\uBBFC\uAC04\uD53C\uD574" },
        { key: "grade", label: "\uD310\uC815" }
      ],
      rows: [
        {
          unit: "669\uD3EC\uBCD1\uB300\uB300(K9)",
          range: "32km \uAC00\uB2A5",
          survival: "\uBD88\uAC00\uB2A5",
          ammo: "HE 30R / HEBB 12R",
          civilian: "\uBBFC\uAC00 2\uC138\uB300 \uD53C\uD574 \uAC00\uB2A5",
          grade: "\uC81C\uC678"
        },
        {
          unit: "602\uD3EC\uBCD1\uB300\uB300(K55A1)",
          range: "36km \uBD88\uAC00",
          survival: "\uAC00\uB2A5",
          ammo: "HE 30R / HEBB 40R",
          civilian: "\uBBFC\uAC00 3\uC138\uB300 \uD53C\uD574 \uAC00\uB2A5",
          grade: "\uC81C\uC678"
        },
        {
          unit: "\uD3EC5\uB300\uB300(K55A1)",
          range: "33km \uBD88\uAC00",
          survival: "\uBD88\uAC00\uB2A5",
          ammo: "HE 50R / HEBB 60R",
          civilian: "\uBBFC\uAC00 2\uC138\uB300 \uD53C\uD574 \uAC00\uB2A5",
          grade: "\uC81C\uC678"
        },
        {
          unit: "100\uD3EC\uBCD1\uB300\uB300(K105A1)",
          range: "6km \uAC00\uB2A5",
          survival: "\uAC00\uB2A5",
          ammo: "HE 100R / DP-ICM 100R",
          civilian: "\uBBFC\uAC00 \uD53C\uD574 \uC5C6\uC74C",
          grade: "\uC120\uC815"
        },
        {
          unit: "101\uC5EC\uB2E8 4.2\uC778\uCE58 \uBC15\uACA9\uD3EC",
          range: "8km \uBD88\uAC00",
          survival: "\uBD88\uAC00\uB2A5",
          ammo: "HE 100R / DPBB 70R",
          civilian: "\uBBFC\uAC00 \uD53C\uD574 \uC5C6\uC74C",
          grade: "\uC81C\uC678"
        }
      ]
    }
  },
  {
    id: 9,
    title: "\uC0AC\uD0DC\uBD84\uC11D\uB3C4 \uBD84\uC11D",
    implementationLevel: "\uBAA9\uC5C5",
    visualKind: "coa",
    headline: "3\uBC88 \uB3C4\uB85C[70%] \uD310\uB2E8\uC548\uC744 \uAE30\uC900\uC73C\uB85C \uC774\uB3D9\uB85C \uBD84\uC11D \uD6C4 NAI/DP/TAI \uC870\uC815\uC548\uC744 \uCD94\uCC9C\uD569\uB2C8\uB2E4.",
    objective: "9-1 \uC0AC\uD0DC\uBD84\uC11D\uB3C4 \uD310\uB2E8\uC548\uC5D0\uC11C 1\uBC88/3\uBC88/5\uBC88 \uB3C4\uB85C\uB97C \uBE44\uAD50\uD558\uACE0 NAI/DP/TAI \uC870\uC815",
    evidence: [
      "\uC608\uC0C1 \uC774\uB3D9\uB85C: 3\uBC88 \uB3C4\uB85C[70%]",
      "1\uBC88 \uB3C4\uB85C 10%, 3\uBC88 \uB3C4\uB85C 70%, 5\uBC88 \uB3C4\uB85C 20%",
      "3\uBC88 \uB3C4\uB85C\uB294 \uC218\uB3C4\uAD8C \uC9C4\uC785 \uAC00\uB2A5 \uBC0F \uACE0\uC18D\uAE30\uB3D9 \uAC00\uB2A5",
      "NAI, DP, TAI \uD310\uB2E8: \uAC10\uC2DC 2, \uACB0\uC2EC 2, \uD0C0\uACA9 2"
    ],
    process: [
      "1\uBC88, 2\uBC88, 3\uBC88 \uB3C4\uB85C\uC758 \uAE30\uB3D9\uC5EC\uAC74\uACFC \uC791\uC804\uBAA9\uC801 \uB2EC\uC131 \uAC00\uB2A5\uC131\uC744 \uBE44\uAD50",
      "\uC608\uC0C1 \uD655\uB960 70%\uC778 3\uBC88 \uB3C4\uB85C\uB97C \uC6B0\uC120 \uD310\uB2E8\uC548\uC73C\uB85C \uC120\uD0DD",
      "3\uBC88 \uB3C4\uB85C \uAE30\uC900 \uAC10\uC2DC 2, \uACB0\uC2EC 2, \uD0C0\uACA9 2\uB97C NAI/DP/TAI\uB85C \uC870\uC815"
    ],
    decision: "\uC608\uC0C1 \uC774\uB3D9\uB85C: 3\uBC88 \uB3C4\uB85C[70%], NAI/DP/TAI \uD310\uB2E8 \uAC10\uC2DC 2 \xB7 \uACB0\uC2EC 2 \xB7 \uD0C0\uACA9 2",
    upgrade: {
      label: "\uB3C4\uB85C\uD310\uB2E8 \uCD94\uC801\uC131 \uBCF4\uAC15",
      outcome: "1/3/5\uBC88 \uB3C4\uB85C\uBCC4 \uD655\uB960\uACFC \uAE30\uB3D9\uC5EC\uAC74\uC744 \uAC19\uC740 \uD45C\uC5D0 \uACE0\uC815\uD574 3\uBC88 \uB3C4\uB85C 70% \uD310\uB2E8 \uADFC\uAC70\uB97C \uCD94\uC801\uD560 \uC218 \uC788\uAC8C \uD569\uB2C8\uB2E4.",
      operatorCue: "70% \uADFC\uAC70\uC640 \uC81C\uC678 \uB3C4\uB85C\uC758 \uC791\uC804\uBAA9\uC801 \uC81C\uD55C \uC0AC\uC720\uB97C \uAC19\uC774 \uD655\uC778\uD558\uC138\uC694."
    },
    metrics: [
      { label: "\uCD94\uCC9C\uC548", value: "#2", tone: "green" },
      { label: "\uD655\uB960", value: "70%", tone: "blue" },
      { label: "NAI/DP/TAI", value: "2/2/2", tone: "amber" }
    ],
    table: {
      title: "9-1 \uC0AC\uD0DC\uBD84\uC11D\uB3C4 \uBD84\uC11D \uACB0\uACFC",
      columns: [
        { key: "item", label: "\uAD6C\uBD84" },
        { key: "road1", label: "1\uBC88 \uB3C4\uB85C" },
        { key: "road3", label: "3\uBC88 \uB3C4\uB85C" },
        { key: "road5", label: "5\uBC88 \uB3C4\uB85C" }
      ],
      rows: [
        {
          item: "\uAE30\uB3D9\uC5EC\uAC74 \uBCF4\uC7A5",
          road1: "\uC640\uB8E12\uCC28\uC120, \uC800\uCC28 \uD1B5\uC81C \uAC00\uB2A5 / \uD3EC\uC7A5\uB3C4\uB85C",
          road3: "\uC640\uB8E12\uCC28\uC120, \uC800\uCC28 \uD1B5\uACFC \uAC00\uB2A5 / \uD3EC\uC7A5\uB3C4\uB85C",
          road5: "\uC640\uB8E14\uCC28\uC120, \uC800\uCC28 \uD1B5\uACFC \uAC00\uB2A5 / \uD3EC\uC7A5\uB3C4\uB85C"
        },
        {
          item: "\uC791\uC804\uBAA9\uC801 \uB2EC\uC131",
          road1: "\uC218\uB3C4\uAD8C \uC9C4\uCD9C \uC81C\uD55C",
          road3: "\uC218\uB3C4\uAD8C \uC9C4\uC785 \uAC00\uB2A5",
          road5: "\uC218\uB3C4\uAD8C \uC9C4\uC785 \uAC00\uB2A5"
        },
        {
          item: "\uC608\uC0C1 \uD655\uB960(%)",
          road1: "10%",
          road3: "70%",
          road5: "20%"
        }
      ]
    }
  },
  {
    id: 10,
    title: "\uC0AC\uD0DC\uBD84\uC11D\uB3C4 \uBD84\uC11D with AI",
    implementationLevel: "\uBAA9\uC5C5",
    visualKind: "reposition",
    headline: "AI \uBA85\uB839\uC73C\uB85C \uB4DC\uB860 3\uB300\uB97C TAI #3, NAI #4, TAI #4\uB85C \uC7AC\uBC30\uCE58\uD569\uB2C8\uB2E4.",
    objective: "\uC0AC\uD0DC\uBD84\uC11D\uB3C4 \uD310\uB2E8\uC548 2\uBC88\uC5D0 \uB530\uB978 \uAC10\uC2DC\uC790\uC0B0 \uC7AC\uBC30\uCE58 \uBA85\uB839\uC744 \uD654\uBA74\uD654",
    evidence: [
      "\uC9C8\uC758: \uC0AC\uD0DC\uBD84\uC11D\uB3C4 \uD310\uB2E8\uC548(2\uC548)\uC5D0 \uB530\uB77C \uAC10\uC2DC\uC790\uC0B0(\uB4DC\uB860)\uC7AC\uBC30\uCE58 \uD574\uC918!",
      "1\uBC88 \uB4DC\uB860: TAI #3 \uC465\uACE0\uAC1C",
      "2\uBC88 \uB4DC\uB860: NAI #4 \uB9D0\uACE0\uAC1C, 3\uBC88 \uB4DC\uB860: TAI #4 \uB2F9\uB3D9\uB9AC"
    ],
    process: [
      "\uC0AC\uD0DC\uBD84\uC11D\uB3C4 #2\uC758 \uC870\uC815 NAI/TAI \uC9C0\uC810\uC744 \uCD94\uCD9C",
      "\uB4DC\uB860\uBCC4 \uBAA9\uD45C\uC9C0\uC810\uACFC \uC774\uB3D9\uBA85\uB839\uC744 \uC0DD\uC131",
      "\uC8FC \uD654\uBA74 \uC9C0\uB3C4\uC640 \uBCF4\uC870 GPT \uB2F5\uBCC0\uC5D0 \uB3D9\uC77C\uD55C \uD1B5\uC81C\uC0AC\uD56D\uC744 \uC804\uC2DC"
    ],
    decision: "\uAC10\uC2DC\uC790\uC0B0 \uC7AC\uBC30\uCE58 \uBA85\uB839 \uD558\uB2EC \uC644\uB8CC",
    upgrade: {
      label: "\uAC10\uC2DC\uC790\uC0B0 \uC7AC\uBC30\uCE58 \uD655\uC778 \uBCF4\uAC15",
      outcome: "\uB4DC\uB860 1~3\uBC88\uC758 \uBAA9\uD45C\uC9C0\uC810, \uC88C\uD45C, \uD1B5\uC81C\uC0C1\uD0DC\uB97C \uC7AC\uBC30\uCE58\uD45C\uB85C \uACE0\uC815\uD574 \uBA85\uB839\uACFC \uC9C0\uB3C4 \uD45C\uC2DC\uC758 \uBD88\uC77C\uCE58\uB97C \uC904\uC785\uB2C8\uB2E4.",
      operatorCue: "TAI #3, NAI #4, TAI #4 \uBC30\uCE58\uAC00 \uC8FC \uD654\uBA74\uACFC \uAC19\uC740\uC9C0 \uD655\uC778\uD558\uC138\uC694."
    },
    metrics: [
      { label: "\uB4DC\uB8601", value: "TAI #3", tone: "green" },
      { label: "\uB4DC\uB8602", value: "NAI #4", tone: "blue" },
      { label: "\uB4DC\uB8603", value: "TAI #4", tone: "amber" }
    ],
    assistantPrompt: "\uC0AC\uD0DC\uBD84\uC11D\uB3C4 \uD310\uB2E8\uC548(2\uC548)\uC5D0 \uB530\uB77C \uAC10\uC2DC\uC790\uC0B0(\uB4DC\uB860)\uC7AC\uBC30\uCE58 \uD574\uC918!",
    assistantAnswer: [
      "1\uBC88 \uB4DC\uB860\uC740 TAI #3 \uC465\uACE0\uAC1C\uB85C \uC774\uB3D9\uC2DC\uD0B5\uB2C8\uB2E4.",
      "2\uBC88 \uB4DC\uB860\uC740 NAI #4 \uB9D0\uACE0\uAC1C\uB85C \uC774\uB3D9\uC2DC\uD0B5\uB2C8\uB2E4.",
      "3\uBC88 \uB4DC\uB860\uC740 TAI #4 \uB2F9\uB3D9\uB9AC\uB85C \uC774\uB3D9\uC2DC\uD0B5\uB2C8\uB2E4."
    ],
    table: {
      title: "\uAC10\uC2DC\uC790\uC0B0 \uC7AC\uBC30\uCE58\uD45C",
      columns: [
        { key: "drone", label: "\uB4DC\uB860" },
        { key: "destination", label: "\uBAA9\uD45C\uC9C0\uC810" },
        { key: "coordinate", label: "\uC88C\uD45C" },
        { key: "status", label: "\uD1B5\uC81C\uC0C1\uD0DC" }
      ],
      rows: [
        {
          drone: "1\uBC88 \uB4DC\uB860",
          destination: "TAI #3 \uC465\uACE0\uAC1C",
          coordinate: "BH 13245 68820",
          status: "\uC774\uB3D9\uBA85\uB839"
        },
        {
          drone: "2\uBC88 \uB4DC\uB860",
          destination: "NAI #4 \uB9D0\uACE0\uAC1C",
          coordinate: "BH 14562 31094",
          status: "\uC774\uB3D9\uBA85\uB839"
        },
        {
          drone: "3\uBC88 \uB4DC\uB860",
          destination: "TAI #4 \uB2F9\uB3D9\uB9AC",
          coordinate: "BH 15884 23301",
          status: "\uC774\uB3D9\uBA85\uB839"
        }
      ]
    }
  },
  {
    id: 11,
    title: "\uCD5C\uC801\uC758 \uD0C0\uACA9\uBC29\uBC95 \uACB0\uC815",
    implementationLevel: "\uBAA9\uC5C5",
    visualKind: "strike",
    headline: "PDF \uC6D0\uBCF8 \uC791\uC131\uC911 \uC790\uB8CC\uB97C \uC571 \uBCF4\uAC15 DATA\uB85C \uBCF4\uC644\uD574 CAS+\uD3EC\uBCD1, TAI#5, H\uC2DC 11:00, DP#3\uC744 1\uC21C\uC704\uB85C \uC81C\uC2DC\uD569\uB2C8\uB2E4.",
    objective: "11-1 \uAC00\uC6A9\uC790\uC0B0 \uC2DC\uAC04\uD45C\uC640 \uD0C0\uACA9\uBC29\uBC95 \uACB0\uC815\uD45C\uB97C \uC2E4\uC81C \uD6C4\uBCF4 \uAD6C\uC870\uB85C \uBC18\uC601",
    evidence: [
      "PDF \uC6D0\uBCF8 \uC0C1\uD0DC: \uC791\uC131\uC911, \uC571 \uBCF4\uAC15 DATA\uB85C \uC2DC\uC5F0\uAC12 \uAD6C\uC131",
      "CAS \uAC00\uC6A9\uC2DC\uAC04: 10:30~11:30, 14:00~15:00",
      "\uC721\uAD70\uD56D\uACF5: 12:00 \uC774\uD6C4 \uAC00\uB2A5, \uD3EC\uBCD1: 24\uC2DC\uAC04 \uAC00\uB2A5",
      "1\uC21C\uC704 CAS+\uD3EC\uBCD1 TAI#5 H\uC2DC 11:00 DP#3"
    ],
    process: [
      "CAS, \uC721\uAD70\uD56D\uACF5, \uD3EC\uBCD1 \uAC00\uC6A9\uC2DC\uAC04\uC744 \uC815\uB9AC",
      "TAI\uBCC4 H\uC2DC\uC640 DP\uB97C \uBE44\uAD50",
      "CAS+\uD3EC\uBCD1, JAAT, Fire-Eagle \uD6C4\uBCF4\uB97C \uC21C\uC704\uD654"
    ],
    decision: "\uCD5C\uC801 \uD0C0\uACA9\uBC29\uBC95: CAS+\uD3EC\uBCD1, TAI#5, H\uC2DC 11:00, DP#3",
    upgrade: {
      label: "\uD0C0\uACA9\uC2DC\uAC04 \uD6C4\uBCF4\uAC80\uC99D \uBCF4\uAC15",
      outcome: "CAS, \uC721\uAD70\uD56D\uACF5, \uD3EC\uBCD1 \uAC00\uC6A9\uC2DC\uAC04\uACFC TAI/DP \uD6C4\uBCF4\uB97C \uAC19\uC740 \uACB0\uC815\uD45C\uB85C \uBB36\uC5B4 11:00 CAS+\uD3EC\uBCD1 1\uC21C\uC704 \uADFC\uAC70\uB97C \uBD84\uB9AC\uD569\uB2C8\uB2E4.",
      operatorCue: "10:30~11:30 CAS \uAC00\uC6A9\uCC3D\uACFC DP#3 \uC870\uAC74\uC744 \uD568\uAED8 \uD655\uC778\uD558\uC138\uC694."
    },
    metrics: [
      { label: "H\uC2DC", value: "11:00", tone: "green" },
      { label: "\uCD94\uCC9C", value: "CAS+\uD3EC\uBCD1", tone: "blue" },
      { label: "DP", value: "#3", tone: "amber" }
    ],
    table: {
      title: "\uD0C0\uACA9\uBC29\uBC95 \uACB0\uC815\uD45C",
      columns: [
        { key: "method", label: "\uC870\uD569" },
        { key: "tai", label: "\uCD94\uCC9C TAI" },
        { key: "time", label: "H\uC2DC" },
        { key: "dp", label: "DP" },
        { key: "rank", label: "\uC21C\uC704" }
      ],
      rows: getSudoStrikeMethodRowsForVisual()
    }
  },
  {
    id: 12,
    title: "\uD1B5\uD569\uD654\uB825\uC6B4\uC6A9\uB3C4\uD45C \uC791\uC131",
    implementationLevel: "\uD544\uC218 \uAD6C\uD604",
    visualKind: "firePlan",
    headline: "PDF \uC6D0\uBCF8 \uC791\uC131\uC911 \uC790\uB8CC\uB97C \uC571 \uBCF4\uAC15 DATA\uB85C \uBCF4\uC644\uD574 H\uC2DC 11:00 \uAE30\uC900 H-10~H+30 \uD1B5\uD569\uD654\uB825\uC6B4\uC6A9\uB3C4\uD45C\uB97C \uC791\uC131\uD569\uB2C8\uB2E4.",
    objective: "12-1 \uC6D0\uBCF8 \uD1B5\uD569\uD654\uB825\uC6B4\uC6A9\uB3C4\uD45C\uC758 \uC2DC\uAC04\uCD95\uACFC \uC790\uC0B0 \uBC30\uCE58\uB97C \uD654\uBA74\uC5D0 \uBC18\uC601",
    evidence: [
      "PDF \uC6D0\uBCF8 \uC0C1\uD0DC: \uC791\uC131\uC911, \uC571 \uBCF4\uAC15 DATA\uB85C \uC2DC\uC5F0\uAC12 \uAD6C\uC131",
      "\uD1B5\uD569\uD654\uB825\uC6B4\uC6A9 H\uC2DC: 11:00",
      "H-10\uBD80\uD130 H+30\uAE4C\uC9C0 \uC790\uC0B0\uBCC4 \uC6B4\uC6A9",
      "NAI/DP/TAI\uC640 \uD0C0\uACA9\uC790\uC0B0\uC744 \uAC19\uC740 \uC2DC\uAC04\uCD95\uC5D0 \uBC30\uCE58"
    ],
    process: [
      "\uC120\uC815\uB41C TAI#5, DP#3, CAS+\uD3EC\uBCD1 \uC870\uD569\uC744 \uACC4\uD68D\uD45C\uC5D0 \uC785\uB825",
      "H-10, H, H+10, H+30 \uC2DC\uAC04 \uAD6C\uAC04\uBCC4 \uC6B4\uC6A9\uC744 \uBC30\uCE58",
      "\uC8FC \uD654\uBA74\uACFC \uBCF4\uC870 \uD654\uBA74\uC5D0 \uD1B5\uD569\uD654\uB825\uC6B4\uC6A9\uB3C4\uD45C\uB97C \uB3D9\uC2DC \uC804\uC2DC"
    ],
    decision: "\uD1B5\uD569\uD654\uB825\uC6B4\uC6A9 \uACC4\uD68D \uC2DC\uD589 \uAC00\uB2A5",
    upgrade: {
      label: "H\uC2DC \uB3C4\uD45C \uB3D9\uAE30\uD654 \uBCF4\uAC15",
      outcome: "H-10\uBD80\uD130 H+30\uAE4C\uC9C0 \uAC10\uC2DC, \uACB0\uC2EC, \uD0C0\uACA9 \uC790\uC0B0\uC744 \uD55C \uC2DC\uAC04\uCD95\uC5D0 \uBC30\uCE58\uD574 \uC8FC/\uBD80 \uD654\uBA74 \uB3C4\uD45C \uBD88\uC77C\uCE58\uB97C \uC904\uC785\uB2C8\uB2E4.",
      operatorCue: "H\uC2DC 11:00, TAI #5, DP #3\uC774 \uAC19\uC740 \uD589\uAD70 \uD750\uB984\uC5D0 \uBB36\uC600\uB294\uC9C0 \uD655\uC778\uD558\uC138\uC694."
    },
    metrics: [
      { label: "H\uC2DC", value: "11:00", tone: "green" },
      { label: "TAI", value: "#5", tone: "blue" },
      { label: "DP", value: "#3", tone: "amber" }
    ],
    table: {
      title: "\uD1B5\uD569\uD654\uB825\uC6B4\uC6A9\uB3C4\uD45C",
      columns: [
        { key: "time", label: "\uC2DC\uAC04" },
        { key: "asset", label: "\uC790\uC0B0" },
        { key: "action", label: "\uC6B4\uC6A9" },
        { key: "effect", label: "\uD6A8\uACFC" }
      ],
      rows: getSudoFirePlanRowsForVisual()
    }
  },
  {
    id: 13,
    title: "ARTAS \uB300\uD3EC\uBCD1\uD0D0\uC9C0 R/D \uD45C\uC801\uD0D0\uC9C0 \uBD84\uC11D",
    implementationLevel: "\uBAA9\uC5C5",
    visualKind: "rdAssessment",
    headline: "WARNING: ARTAS \uD45C\uC801 AA001\uC774 \uD0D0\uC9C0\uB418\uC5C8\uC2B5\uB2C8\uB2E4. \uD5C8\uC0C1\uD45C\uC801 99%\uB85C \uD310\uB2E8\uD569\uB2C8\uB2E4.",
    objective: "artas program.pdf \uAE30\uC900 \uB300\uD3EC\uBCD1\uD0D0\uC9C0 R/D \uD45C\uC801\uD0D0\uC9C0 \uBD84\uC11D\uC548\uC744 \uC791\uC131",
    evidence: [
      "ARTAS 1\uCC28 \uAE30\uC220\uD310\uB2E8 \uD5C8\uC0C1\uD45C\uC801 78%",
      "\uD0C4\uB3C4\uACE1\uC120 \uB04A\uAE40, \uB808\uC774\uB354 \uC608\uC0C1\uC815\uD655\uB3C4 300m \uCD08\uACFC, \uCD94\uC801\uD69F\uC218 7\uD68C",
      "\uC12C\uAD11\u318D\uD3ED\uC74C, MASINT, TOD, \uC801 \uD2B9\uC774\uD65C\uB3D9 \uCD94\uAC00 \uD655\uC778 \uACB0\uACFC \uC5C6\uC74C"
    ],
    process: [
      "ARTAS \uD45C\uC801\uBC88\uD638 AA001 \uD0D0\uC9C0\uC81C\uC6D0\uACFC \uAE30\uC220\uD310\uB2E8 \uACB0\uACFC\uB97C \uD655\uC778",
      "\uC815\uD655\uD55C \uD3C9\uAC00\uB97C \uC704\uD574 \uC12C\uAD11\u318D\uD3ED\uC74C, MASINT, TOD, \uC801 \uD65C\uB3D9\uC744 \uCD94\uAC00 \uD655\uC778",
      "\uAE30\uC220\uC801\uD3C9\uAC00\uC640 \uC9C0\uD718\uC18C\uD3C9\uAC00\uB97C \uD569\uC0B0\uD574 \uD5C8\uC0C1\uD45C\uC801 99% \uBD84\uC11D\uC548\uC744 \uC791\uC131"
    ],
    decision: "R/D \uD310\uB2E8: \uC2E4\uC874 1%, \uD5C8\uC0C1 99%\uB85C \uD5C8\uC0C1\uD45C\uC801 \uAC00\uB2A5\uC131\uC774 \uC6B0\uC138\uD569\uB2C8\uB2E4.",
    upgrade: {
      label: "ARTAS \uD5C8\uC0C1\uC735\uD569 \uBCF4\uAC15",
      outcome: "\uAE30\uC220\uD310\uB2E8 78%, \uC12C\uAD11/\uD3ED\uC74C, MASINT, TOD, \uC801 \uD2B9\uC774\uD65C\uB3D9 \uD655\uC778 \uACB0\uACFC\uB97C \uD569\uC0B0\uD574 \uD5C8\uC0C1 99% \uC804\uD658 \uADFC\uAC70\uB97C \uBCF4\uAC15\uD569\uB2C8\uB2E4.",
      operatorCue: "\uD5C8\uC0C1 99% \uC804\uD658 \uC804 \uCD94\uAC00 \uCD9C\uCC98 4\uC885\uC774 \uBAA8\uB450 \uD2B9\uC774\uC0AC\uD56D \uC5C6\uC74C\uC778\uC9C0 \uD655\uC778\uD558\uC138\uC694."
    },
    metrics: [
      { label: "\uD5C8\uC0C1", value: "99%", tone: "green" },
      { label: "\uAE30\uC220\uD310\uB2E8", value: "78%", tone: "amber" },
      { label: "\uD45C\uC801\uBC88\uD638", value: "AA001", tone: "blue" }
    ],
    table: {
      title: "ARTAS \uB300\uD3EC\uBCD1\uD0D0\uC9C0 R/D \uD45C\uC801\uD0D0\uC9C0 \uCCB4\uD06C\uB9AC\uC2A4\uD2B8",
      columns: [
        { key: "area", label: "\uAD6C\uBD84" },
        { key: "check", label: "\uCCB4\uD06C\uD56D\uBAA9" },
        { key: "observed", label: "\uD655\uC778\uB0B4\uC6A9" },
        { key: "grade", label: "\uD310\uC815" }
      ],
      rows: getSudoRdAssessmentRowsForVisual()
    }
  },
  {
    id: 14,
    title: "\uD0C0\uACA9\uACB0\uACFC \uD3C9\uAC00",
    implementationLevel: "\uC571 \uD655\uC7A5",
    visualKind: "bda",
    headline: "\uC694\uB9DD\uD6A8\uACFC 30% \uBBF8\uB2EC\uC131\uC73C\uB85C \uC7AC\uD0C0\uACA9 \uC2DC\uD589\uC744 \uD310\uB2E8\uD569\uB2C8\uB2E4.",
    objective: "\uD0C0\uACA9\uACB0\uACFC \uC601\uC0C1(\uC785\uB825 DATA) \uD310\uB3C5 \uACB0\uACFC\uC640 \uC694\uB9DD\uD6A8\uACFC 30% \uB2EC\uC131 \uC5EC\uBD80\uB97C \uC804\uC2DC",
    evidence: [
      "\uCD5C\uCD08 \uC124\uC815\uD55C \uC694\uB9DD\uD6A8\uACFC\uB294 30%",
      "\uD0C0\uACA9\uACB0\uACFC \uC804\uCC28 1\uB300 \uC644\uD30C",
      "\uBCD1\uB825 5\uBA85\uC774 \uC4F0\uB7EC\uC838 \uC788\uB294 \uAC83\uC744 \uC2DD\uBCC4"
    ],
    process: [
      "\uD0C0\uACA9\uACB0\uACFC \uC601\uC0C1 \uC81C\uC2DC \uD6C4 AI \uD310\uB3C5 \uACB0\uACFC\uB97C \uBD84\uB9AC \uC804\uC2DC",
      "\uC804\uCC28 \uC644\uD30C\uC640 \uBCD1\uB825 \uD53C\uD574 \uC2DD\uBCC4 \uACB0\uACFC\uB97C \uC694\uB9DD\uD6A8\uACFC 30%\uC640 \uBE44\uAD50",
      "\uC694\uB9DD\uD6A8\uACFC \uBBF8\uB2EC \uC2DC \uC7AC\uD0C0\uACA9 \uC2DC\uD589 \uD310\uB2E8\uADFC\uAC70\uB97C \uC0DD\uC131"
    ],
    decision: "\uD0C0\uACA9\uACB0\uACFC \uD3C9\uAC00: \uC694\uB9DD\uD6A8\uACFC 30% \uBBF8\uB2EC\uC131, \uC7AC\uD0C0\uACA9 \uC2DC\uD589 \uD544\uC694",
    metrics: [
      { label: "\uC694\uB9DD\uD6A8\uACFC", value: "30%", tone: "amber" },
      { label: "\uC601\uC0C1\uD310\uB3C5", value: "\uC804\uCC281/\uBCD1\uB8255", tone: "red" },
      { label: "\uD6C4\uC18D", value: "\uC7AC\uD0C0\uACA9", tone: "amber" }
    ],
    detections: [
      {
        label: "\uC644\uD30C \uC804\uCC28",
        confidence: 0.92,
        x: 18,
        y: 42,
        width: 20,
        height: 15,
        color: "#ff6969"
      },
      {
        label: "\uC794\uC5EC \uC804\uCC28",
        confidence: 0.86,
        x: 56,
        y: 39,
        width: 18,
        height: 13,
        color: "#ffc857"
      },
      {
        label: "\uBCD1\uB825 5\uBA85",
        confidence: 0.81,
        x: 43,
        y: 63,
        width: 16,
        height: 12,
        color: "#7fe7ff"
      }
    ],
    table: {
      title: "\uD0C0\uACA9\uACB0\uACFC \uD3C9\uAC00 \uACB0\uACFC",
      columns: [
        { key: "item", label: "\uD3C9\uAC00\uD56D\uBAA9" },
        { key: "observed", label: "\uAD00\uCE21\uAC12" },
        { key: "criteria", label: "\uAE30\uC900" },
        { key: "grade", label: "\uD310\uC815" }
      ],
      rows: [
        {
          item: "\uC694\uB9DD\uD6A8\uACFC",
          observed: "30%",
          criteria: "\uCD5C\uCD08 \uC124\uC815\uAC12",
          grade: "\uAE30\uC900"
        },
        {
          item: "\uC601\uC0C1\uD310\uB3C5",
          observed: "\uC804\uCC28 1\uB300 \uC644\uD30C / \uBCD1\uB825 5\uBA85 \uC4F0\uB7EC\uC9D0",
          criteria: "\uD0C0\uACA9\uACB0\uACFC \uC601\uC0C1",
          grade: "\uD53C\uD574 \uC2DD\uBCC4"
        },
        {
          item: "\uD6C4\uC18D\uD310\uB2E8",
          observed: "\uD604\uC7AC \uC694\uB9DD\uD6A8\uACFC \uBBF8\uB2EC\uC131",
          criteria: "\uC694\uB9DD\uD6A8\uACFC 30%",
          grade: "\uC7AC\uD0C0\uACA9"
        }
      ]
    }
  }
];
function getSudoScenario(id) {
  return sudoScenarios.find((scenario) => scenario.id === id) ?? sudoScenarios[0];
}

// js/vendor/kairos/src/gui/sudo/sudoScenarioSourceBindings.ts
function hasRows(rows) {
  return Array.isArray(rows) && rows.length > 0;
}
function buildBinding(id, label, connected, detail, basis) {
  return {
    id,
    label,
    detail,
    basis,
    status: connected ? "connected" : "missing"
  };
}
function sourceFileBasis(stage) {
  return stage?.sourceFiles.slice(0, 2).join(" / ") || "sudo_data \uC815\uC801 \uAE30\uBCF8\uAC12";
}
function hasControlPointValues(inputs) {
  return Boolean(
    inputs.fireControlPoints.nai && inputs.fireControlPoints.dp && inputs.fireControlPoints.tai
  );
}
var bindingBuildersByScenario = {
  2: [
    (inputs, stage) => buildBinding(
      "targetLabel",
      "targetLabel",
      inputs.targetLabel.trim().length > 0,
      inputs.targetLabel,
      sourceFileBasis(stage)
    )
  ],
  3: [
    (inputs, stage) => buildBinding(
      "observedVehicleCount",
      "observedVehicleCount",
      inputs.observedVehicleCount > 0,
      `${inputs.observedVehicleCount}\uB300`,
      sourceFileBasis(stage)
    ),
    (inputs, stage) => buildBinding(
      "marchColumnLengthM",
      "marchColumnLengthM",
      inputs.marchColumnLengthM > 0,
      `${inputs.marchColumnLengthM}m`,
      sourceFileBasis(stage)
    )
  ],
  4: [
    (inputs, stage) => buildBinding(
      "orderCandidates",
      "orderCandidates",
      hasRows(inputs.orderCandidates),
      `${inputs.orderCandidates.length}\uAC1C \uD6C4\uBCF4`,
      sourceFileBasis(stage)
    )
  ],
  5: [
    (inputs, stage) => buildBinding(
      "nearestCivilianM",
      "nearestCivilianM",
      inputs.nearestCivilianM > 0,
      `${inputs.nearestCivilianM}m`,
      sourceFileBasis(stage)
    ),
    (inputs, stage) => buildBinding(
      "collateralMunitions",
      "collateralMunitions",
      hasRows(inputs.collateralMunitions),
      `${inputs.collateralMunitions.length}\uAC1C \uD0C4\uC885`,
      sourceFileBasis(stage)
    )
  ],
  6: [
    (inputs, stage) => buildBinding(
      "assistantVulnerabilityRows",
      "assistantVulnerabilityRows",
      hasRows(inputs.assistantVulnerabilityRows),
      `${inputs.assistantVulnerabilityRows.length}\uAC1C \uCDE8\uC57D\uC810`,
      sourceFileBasis(stage)
    )
  ],
  7: [
    (inputs, stage) => buildBinding(
      "terrainPercent",
      "forest/openTerrainPercent",
      inputs.forestPercent + inputs.openTerrainPercent > 0,
      `\uC0B0\uB9BC ${inputs.forestPercent}% / \uAC1C\uD65C\uC9C0 ${inputs.openTerrainPercent}%`,
      sourceFileBasis(stage)
    ),
    (inputs, stage) => buildBinding(
      "desiredDamagePercent",
      "desiredDamagePercent",
      inputs.desiredDamagePercent > 0,
      `${inputs.desiredDamagePercent}%`,
      sourceFileBasis(stage)
    )
  ],
  8: [
    (inputs, stage) => buildBinding(
      "fireUnits",
      "fireUnits",
      hasRows(inputs.fireUnits),
      `${inputs.fireUnits.length}\uAC1C \uD6C4\uBCF4`,
      sourceFileBasis(stage)
    )
  ],
  9: [
    (inputs, stage) => buildBinding(
      "routeOptions",
      "routeOptions",
      hasRows(inputs.routeOptions),
      `${inputs.routeOptions.length}\uAC1C \uBC29\uCC45`,
      sourceFileBasis(stage)
    ),
    (inputs, stage) => buildBinding(
      "roadInfoRows",
      "roadInfoRows",
      hasRows(inputs.roadInfoRows),
      `${inputs.roadInfoRows.length}\uAC1C \uB3C4\uB85C`,
      sourceFileBasis(stage)
    )
  ],
  10: [
    (inputs, stage) => buildBinding(
      "droneRedeploymentOrders",
      "droneRedeploymentOrders",
      hasRows(inputs.droneRedeploymentOrders),
      `${inputs.droneRedeploymentOrders.length}\uB300`,
      sourceFileBasis(stage)
    )
  ],
  11: [
    (inputs, stage) => buildBinding(
      "strikeAssets",
      "strikeAssets",
      hasRows(inputs.strikeAssets),
      `${inputs.strikeAssets.length}\uAC1C \uC790\uC0B0`,
      sourceFileBasis(stage)
    ),
    (inputs, stage) => buildBinding(
      "arrivalInputs",
      "targetSpeed/distanceToTai",
      inputs.targetSpeedKph > 0 && inputs.distanceToTaiKm > 0,
      `${inputs.targetSpeedKph}km/h \xB7 ${inputs.distanceToTaiKm}km`,
      sourceFileBasis(stage)
    )
  ],
  12: [
    (inputs, stage) => buildBinding(
      "firePlanRows",
      "firePlanRows",
      hasRows(inputs.firePlanRows),
      `${inputs.firePlanRows.length}\uAC1C \uD589`,
      sourceFileBasis(stage)
    ),
    (inputs, stage) => buildBinding(
      "fireControlPoints",
      "fireControlPoints",
      hasControlPointValues(inputs),
      `${inputs.fireControlPoints.nai}/${inputs.fireControlPoints.dp}/${inputs.fireControlPoints.tai}`,
      sourceFileBasis(stage)
    )
  ],
  13: [
    (inputs, stage) => buildBinding(
      "rdAssessmentRows",
      "rdAssessmentRows",
      hasRows(inputs.rdAssessmentRows),
      `${inputs.rdAssessmentRows.length}\uAC1C \uCCB4\uD06C`,
      sourceFileBasis(stage)
    )
  ],
  14: [
    (inputs, stage) => buildBinding(
      "bdaInputs",
      "BDA damage inputs",
      inputs.observedDamagePercent > 0 && inputs.remainingTargets >= 0,
      `${inputs.observedDamagePercent}% / \uC794\uC5EC ${inputs.remainingTargets}`,
      sourceFileBasis(stage)
    )
  ]
};
function buildSudoScenarioSourceDecisionBindings(scenarioId, inputs, stage) {
  return (bindingBuildersByScenario[scenarioId] ?? []).map(
    (builder) => builder(inputs, stage)
  );
}
function buildSudoScenarioSourceBindingSummary(bindings) {
  const connected = bindings.filter(
    (binding) => binding.status === "connected"
  ).length;
  return {
    connected,
    total: bindings.length,
    label: bindings.length > 0 ? `${connected}/${bindings.length} \uACC4\uC0B0\uC5F0\uACB0` : "\uACC4\uC0B0\uC5F0\uACB0 \uC5C6\uC74C"
  };
}

// js/vendor/kairos/src/gui/sudo/sudoScenarioSourceInputPatches.ts
function stageBasis(stage) {
  const sourceFiles = stage?.sourceFiles.slice(0, 2).join(" / ");
  return [sourceFiles, stage?.codeAction].filter(Boolean).join(" \xB7 ");
}
function cloneRows(rows) {
  return rows.map((row) => ({ ...row }));
}
function stringifySimpleValue(value) {
  if (Array.isArray(value)) {
    return `${value.length}\uAC1C`;
  }
  if (typeof value === "number") {
    return `${value}`;
  }
  if (typeof value === "string") {
    return value;
  }
  if (value && typeof value === "object") {
    return Object.values(value).filter(Boolean).join(" / ");
  }
  return "\uBBF8\uC785\uB825";
}
function buildSuggestion({
  id,
  label,
  field,
  applied,
  currentValue,
  recommendedValue,
  basis,
  detail
}) {
  return {
    id,
    label,
    field,
    status: applied ? "applied" : "ready",
    currentValue,
    recommendedValue,
    basis,
    detail
  };
}
function arrayIncludesText(rows, text) {
  return rows.some((row) => JSON.stringify(row).includes(text));
}
function scenario3Suggestions(inputs, basis) {
  return [
    buildSuggestion({
      id: "s3-scale",
      label: "\uBD80\uB300\uADDC\uBAA8 \uAE30\uC900\uAC12",
      field: "observedVehicleCount/marchColumnLengthM",
      applied: inputs.observedVehicleCount === 3 && inputs.marchColumnLengthM === 350 && inputs.marchRoute.includes("3\uBC88"),
      currentValue: `${inputs.observedVehicleCount}\uB300 / ${inputs.marchColumnLengthM}m / ${inputs.marchRoute}`,
      recommendedValue: "3\uB300 / 350m / \uC801\uAD50\uB9AC 3\uBC88 \uB3C4\uB85C \uD589\uAD70\uCD95",
      basis,
      detail: "3-1 \uD589\uAD70\uC7A5\uACBD data\uC640 \uAC1D\uCCB4\uCD94\uC801 bbox \uC218\uB7C9\uC744 \uD310\uB2E8\uC5D4\uC9C4 \uC785\uB825\uC73C\uB85C \uB9DE\uCDA5\uB2C8\uB2E4."
    })
  ];
}
function scenario4Suggestions(inputs, basis) {
  return [
    buildSuggestion({
      id: "s4-order-candidates",
      label: "\uC804\uD22C\uC11C\uC5F4 \uD6C4\uBCF4\uD45C",
      field: "orderCandidates",
      applied: inputs.orderCandidates.length >= 2 && arrayIncludesText(inputs.orderCandidates, "1\uC0AC\uB2E8 1\uB300\uB300 2\uC911\uB300") && arrayIncludesText(inputs.orderCandidates, "240mm \uBC29\uC0AC\uD3EC"),
      currentValue: stringifySimpleValue(inputs.orderCandidates),
      recommendedValue: "1\uC0AC\uB2E8 1\uB300\uB300 2\uC911\uB300 240mm \uBC29\uC0AC\uD3EC 106m 1\uC21C\uC704 \uD3EC\uD568",
      basis,
      detail: "4-1 \uC778\uADFC\uBD80\uB300 \uC704\uCE58/\uBCF4\uC720\uC7A5\uBE44 \uD45C\uB97C \uCD5C\uAE30 \uBD80\uB300 \uD6C4\uBCF4 \uC785\uB825\uC73C\uB85C \uB9DE\uCDA5\uB2C8\uB2E4."
    })
  ];
}
function scenario5Suggestions(inputs, basis) {
  return [
    buildSuggestion({
      id: "s5-civilian-distance",
      label: "\uBBFC\uAC00 \uC774\uACA9\uAC70\uB9AC",
      field: "nearestCivilianM",
      applied: inputs.nearestCivilianM === 420,
      currentValue: `${inputs.nearestCivilianM}m`,
      recommendedValue: "420m",
      basis,
      detail: "GIS \uBBFC\uAC00 \uC774\uACA9\uAC12\uC744 \uBD80\uC218\uD53C\uD574 \uD310\uB2E8 \uC785\uB825\uC73C\uB85C \uB9DE\uCDA5\uB2C8\uB2E4."
    }),
    buildSuggestion({
      id: "s5-collateral-munitions",
      label: "\uD0C4\uC885 \uD6A8\uACFC\uBC18\uACBD",
      field: "collateralMunitions",
      applied: arrayIncludesText(inputs.collateralMunitions, "HEBB") && arrayIncludesText(inputs.collateralMunitions, "DPBB") && arrayIncludesText(inputs.collateralMunitions, "236"),
      currentValue: stringifySimpleValue(inputs.collateralMunitions),
      recommendedValue: "HEBB 106m / DPBB 236m \uD3EC\uD568",
      basis,
      detail: "5-1 \uD0C4\uC885\uBCC4 \uBD80\uC218\uD6A8\uACFC \uBC18\uACBD\uD45C\uB97C CDE \uD310\uB2E8 \uC785\uB825\uC73C\uB85C \uB9DE\uCDA5\uB2C8\uB2E4."
    })
  ];
}
function scenario7Suggestions(inputs, basis) {
  const recommendedForestPercent = SUDO_JANGDO_GIS_INTEL.forestPercent;
  const recommendedOpenTerrainPercent = SUDO_JANGDO_GIS_INTEL.openTerrainPercent;
  const recommendedDesiredDamagePercent = 30;
  return [
    buildSuggestion({
      id: "s7-terrain-effect",
      label: "\uC9C0\uD615/\uC694\uB9DD\uD6A8\uACFC",
      field: "forestPercent/openTerrainPercent/desiredDamagePercent",
      applied: inputs.forestPercent === recommendedForestPercent && inputs.openTerrainPercent === recommendedOpenTerrainPercent && inputs.desiredDamagePercent === recommendedDesiredDamagePercent,
      currentValue: `\uC0B0\uB9BC ${inputs.forestPercent}% / \uAC1C\uD65C\uC9C0 ${inputs.openTerrainPercent}% / \uD53C\uD574 ${inputs.desiredDamagePercent}%`,
      recommendedValue: `\uC0B0\uB9BC ${recommendedForestPercent}% / \uAC1C\uD65C\uC9C0 ${recommendedOpenTerrainPercent}% / \uC694\uB9DD\uD6A8\uACFC ${recommendedDesiredDamagePercent}%`,
      basis,
      detail: "GIS \uC9C0\uD615\uBD84\uC11D \uD53C\uBCF5\uBE44\uC728\uACFC 7-1~2 \uD0C4\uC885/\uBC1C\uC218 \uD310\uB2E8\uD45C\uB97C \uD0C4\uC885 \uCD94\uCC9C \uC785\uB825\uC73C\uB85C \uB9DE\uCDA5\uB2C8\uB2E4."
    })
  ];
}
function scenario8Suggestions(inputs, basis) {
  return [
    buildSuggestion({
      id: "s8-fire-units",
      label: "\uC0AC\uACA9\uBD80\uB300 \uD6C4\uBCF4",
      field: "fireUnits",
      applied: inputs.fireUnits.length >= 5 && arrayIncludesText(inputs.fireUnits, "100\uD3EC\uBCD1\uB300\uB300") && arrayIncludesText(inputs.fireUnits, "\uBBFC\uAC00 \uD53C\uD574 \uC5C6\uC74C"),
      currentValue: stringifySimpleValue(inputs.fireUnits),
      recommendedValue: "100\uD3EC\uBCD1\uB300\uB300(K105A1) \uC0AC\uACA9\uAC00\uB2A5/\uC0DD\uC874\uC131/\uBBFC\uAC04\uD53C\uD574 \uC5C6\uC74C \uD3EC\uD568",
      basis,
      detail: "8-1 \uCD5C\uC801 \uC0AC\uACA9\uBD80\uB300 \uD310\uB2E8 \uC790\uB8CC\uB97C \uD6C4\uBCF4 \uD3C9\uAC00\uD45C \uC785\uB825\uC73C\uB85C \uB9DE\uCDA5\uB2C8\uB2E4."
    })
  ];
}
function scenario9Suggestions(inputs, basis) {
  return [
    buildSuggestion({
      id: "s9-route-options",
      label: "\uC0AC\uD0DC\uBD84\uC11D \uBC29\uCC45",
      field: "routeOptions",
      applied: inputs.routeOptions.length >= 2 && arrayIncludesText(inputs.routeOptions, "3\uBC88 \uB3C4\uB85C") && arrayIncludesText(inputs.routeOptions, "70"),
      currentValue: stringifySimpleValue(inputs.routeOptions),
      recommendedValue: "1\uBC88 \uB3C4\uB85C 10% / 3\uBC88 \uB3C4\uB85C 70% / 5\uBC88 \uB3C4\uB85C 20%",
      basis,
      detail: "9-1 \uC0AC\uD0DC\uBD84\uC11D\uB3C4 \uBD84\uC11D \uACB0\uACFC\uB97C \uC608\uC0C1\uC774\uB3D9\uB85C \uD310\uB2E8 \uC785\uB825\uC73C\uB85C \uB9DE\uCDA5\uB2C8\uB2E4."
    }),
    buildSuggestion({
      id: "s9-road-info",
      label: "\uB3C4\uB85C\uC815\uBCF4 \uD45C",
      field: "roadInfoRows",
      applied: inputs.roadInfoRows.length >= 3 && arrayIncludesText(inputs.roadInfoRows, "3\uBC88") && arrayIncludesText(inputs.roadInfoRows, "70%"),
      currentValue: stringifySimpleValue(inputs.roadInfoRows),
      recommendedValue: "1\uBC88 10% / 3\uBC88 70% / 2\uBC88 20% \uB3C4\uB85C\uC815\uBCF4",
      basis,
      detail: "PDF 9-1 \uB3C4\uB85C\uBCC4 \uAE30\uB3D9\uC5EC\uAC74/\uC791\uC804\uBAA9\uC801/\uC608\uC0C1\uD655\uB960 \uD45C\uB97C \uC785\uB825\uC73C\uB85C \uB9DE\uCDA5\uB2C8\uB2E4."
    })
  ];
}
function scenario11Suggestions(inputs, basis) {
  return [
    buildSuggestion({
      id: "s11-arrival",
      label: "\uB3C4\uCC29\uC2DC\uAC04 \uACC4\uC0B0 \uC785\uB825",
      field: "targetSpeedKph/distanceToTaiKm",
      applied: inputs.targetSpeedKph === 20 && inputs.distanceToTaiKm === 6.7,
      currentValue: `${inputs.targetSpeedKph}km/h / ${inputs.distanceToTaiKm}km`,
      recommendedValue: "20km/h / 6.7km",
      basis,
      detail: "DP-TAI \uAC70\uB9AC\uC640 \uC18D\uB3C4\uB97C \uD0C0\uACA9\uC790\uC0B0 \uAC00\uC6A9\uC2DC\uAC04 \uACC4\uC0B0 \uC785\uB825\uC73C\uB85C \uB9DE\uCDA5\uB2C8\uB2E4."
    }),
    buildSuggestion({
      id: "s11-strike-assets",
      label: "\uD0C0\uACA9\uC790\uC0B0 \uC2DC\uAC04\uD45C",
      field: "strikeAssets",
      applied: arrayIncludesText(inputs.strikeAssets, "CAS") && arrayIncludesText(inputs.strikeAssets, "10:30") && arrayIncludesText(inputs.strikeAssets, "\uD3EC\uBCD1"),
      currentValue: stringifySimpleValue(inputs.strikeAssets),
      recommendedValue: "CAS 10:30~11:30 / \uD3EC\uBCD1 24\uC2DC\uAC04 / \uC721\uD56D 12:00 \uC774\uD6C4",
      basis,
      detail: "CAS/\uC721\uD56D/\uD3EC\uBCD1 \uC6B4\uC6A9\uC2DC\uAC04 DATA\uB97C \uD0C0\uACA9\uC870\uD569 \uC785\uB825\uC73C\uB85C \uB9DE\uCDA5\uB2C8\uB2E4."
    })
  ];
}
function scenario12Suggestions(inputs, basis) {
  return [
    buildSuggestion({
      id: "s12-control-points",
      label: "\uD1B5\uD569\uD654\uB825 \uC9C0\uC810",
      field: "fireControlPoints",
      applied: inputs.fireControlPoints.nai === "NAI#4" && inputs.fireControlPoints.dp === "DP#3" && inputs.fireControlPoints.tai === "TAI#5",
      currentValue: stringifySimpleValue(inputs.fireControlPoints),
      recommendedValue: "NAI#4 / DP#3 / TAI#5",
      basis,
      detail: "\uD1B5\uD569\uD654\uB825\uC6B4\uC6A9\uB3C4\uD45C\uC758 NAI/DP/TAI \uAE30\uC900\uC810\uC744 \uC785\uB825\uC73C\uB85C \uB9DE\uCDA5\uB2C8\uB2E4."
    }),
    buildSuggestion({
      id: "s12-fire-plan",
      label: "\uD654\uB825\uC6B4\uC6A9\uB3C4\uD45C",
      field: "firePlanRows",
      applied: inputs.firePlanRows.length >= 5 && arrayIncludesText(inputs.firePlanRows, "H~H+10") && arrayIncludesText(inputs.firePlanRows, "F-16K"),
      currentValue: stringifySimpleValue(inputs.firePlanRows),
      recommendedValue: "H-10~H+30 \uD1B5\uD569\uD654\uB825 5\uAC1C \uD589",
      basis,
      detail: "\uD1B5\uD569\uD654\uB825\uC6B4\uC6A9\uB3C4\uD45C \uC6D0\uBCF8\uADFC\uAC70\uB97C \uC2DC\uAC04\uCD95\uBCC4 \uC790\uC0B0 \uC6B4\uC6A9 \uC785\uB825\uC73C\uB85C \uB9DE\uCDA5\uB2C8\uB2E4."
    })
  ];
}
function scenario13Suggestions(inputs, basis) {
  return [
    buildSuggestion({
      id: "s13-rd-assessment",
      label: "R/D \uD5C8\uC0C1 \uD310\uB2E8\uD45C",
      field: "rdAssessmentRows",
      applied: inputs.rdAssessmentRows.length >= 6 && arrayIncludesText(inputs.rdAssessmentRows, "\uD5C8\uC0C1 99%") && arrayIncludesText(inputs.rdAssessmentRows, "\uD0C4\uB3C4\uACE1\uC120"),
      currentValue: stringifySimpleValue(inputs.rdAssessmentRows),
      recommendedValue: "ARTAS \uD5C8\uC0C1\uD45C\uC801 78%, \uD0C4\uB3C4\uACE1\uC120/\uC12C\uAD11\xB7\uD3ED\uC74C/MASINT, \uD5C8\uC0C1 99%",
      basis,
      detail: "artas program.pdf \uD45C\uC801\uD0D0\uC9C0 \uD310\uB2E8\uD45C\uB97C R/D \uC885\uD569\uD310\uC815 \uC785\uB825\uC73C\uB85C \uB9DE\uCDA5\uB2C8\uB2E4."
    })
  ];
}
function scenario14Suggestions(inputs, basis) {
  return [
    buildSuggestion({
      id: "s14-bda",
      label: "BDA \uD53C\uD574\uD3C9\uAC00",
      field: "observedDamagePercent/remainingTargets/bdaRequiredDamagePercent",
      applied: inputs.observedDamagePercent === 18 && inputs.remainingTargets === 4 && inputs.bdaRequiredDamagePercent === 30,
      currentValue: `${inputs.observedDamagePercent}% / \uC794\uC5EC ${inputs.remainingTargets} / \uAE30\uC900 ${inputs.bdaRequiredDamagePercent}%`,
      recommendedValue: "\uC694\uB9DD\uD6A8\uACFC 30% / \uC804\uCC28 1\uB300 \uC644\uD30C / \uBCD1\uB825 5\uBA85 \uC2DD\uBCC4 / \uC7AC\uD0C0\uACA9 \uC2DC\uD589",
      basis,
      detail: "BDA \uC785\uB825 DATA\uC640 \uD0C0\uACA9\uACB0\uACFC figure\uB97C PDF \uD310\uB3C5 \uC911\uC2EC \uC7AC\uD0C0\uACA9 \uD310\uB2E8\uC73C\uB85C \uB9DE\uCDA5\uB2C8\uB2E4."
    })
  ];
}
function buildSudoScenarioSourceInputPatchSuggestions(scenarioId, inputs, stage) {
  const basis = stageBasis(stage) || "sudo_data \uC6D0\uC790\uB8CC \uAE30\uBCF8 \uD310\uB2E8\uAC12";
  switch (scenarioId) {
    case 3:
      return scenario3Suggestions(inputs, basis);
    case 4:
      return scenario4Suggestions(inputs, basis);
    case 5:
      return scenario5Suggestions(inputs, basis);
    case 7:
      return scenario7Suggestions(inputs, basis);
    case 8:
      return scenario8Suggestions(inputs, basis);
    case 9:
      return scenario9Suggestions(inputs, basis);
    case 11:
      return scenario11Suggestions(inputs, basis);
    case 12:
      return scenario12Suggestions(inputs, basis);
    case 13:
      return scenario13Suggestions(inputs, basis);
    case 14:
      return scenario14Suggestions(inputs, basis);
    default:
      return [];
  }
}
function buildSudoScenarioSourceInputPatchSummary(suggestions) {
  const applied = suggestions.filter(
    (suggestion) => suggestion.status === "applied"
  ).length;
  const ready = suggestions.filter(
    (suggestion) => suggestion.status === "ready"
  ).length;
  const total = suggestions.length;
  return {
    applied,
    ready,
    total,
    label: total === 0 ? "\uC785\uB825\uD328\uCE58 \uC5C6\uC74C" : ready > 0 ? `${ready}/${total} \uC785\uB825\uD328\uCE58 \uB300\uAE30` : `${applied}/${total} \uC6D0\uC790\uB8CC \uBC18\uC601`
  };
}
function buildSudoScenarioSourceDecisionInputPatch(scenarioId, inputs, stage) {
  const readyIds = new Set(
    buildSudoScenarioSourceInputPatchSuggestions(scenarioId, inputs, stage).filter((suggestion) => suggestion.status === "ready").map((suggestion) => suggestion.id)
  );
  const patch = {};
  if (readyIds.has("s3-scale")) {
    patch.observedVehicleCount = 3;
    patch.marchColumnLengthM = 350;
    patch.marchRoute = "\uC801\uAD50\uB9AC 3\uBC88 \uB3C4\uB85C \uD589\uAD70\uCD95";
  }
  if (readyIds.has("s4-order-candidates")) {
    patch.orderCandidates = cloneRows(
      defaultSudoDecisionInputs.orderCandidates
    );
  }
  if (readyIds.has("s5-civilian-distance")) {
    patch.nearestCivilianM = 420;
  }
  if (readyIds.has("s5-collateral-munitions")) {
    patch.collateralMunitions = cloneRows(
      defaultSudoDecisionInputs.collateralMunitions
    );
  }
  if (readyIds.has("s7-terrain-effect")) {
    patch.forestPercent = SUDO_JANGDO_GIS_INTEL.forestPercent;
    patch.openTerrainPercent = SUDO_JANGDO_GIS_INTEL.openTerrainPercent;
    patch.desiredDamagePercent = 30;
  }
  if (readyIds.has("s8-fire-units")) {
    patch.fireUnits = cloneRows(defaultSudoDecisionInputs.fireUnits);
  }
  if (readyIds.has("s9-route-options")) {
    patch.routeOptions = cloneRows(defaultSudoDecisionInputs.routeOptions);
  }
  if (readyIds.has("s9-road-info")) {
    patch.roadInfoRows = cloneRows(defaultSudoDecisionInputs.roadInfoRows);
  }
  if (readyIds.has("s11-arrival")) {
    patch.targetSpeedKph = 20;
    patch.distanceToTaiKm = 6.7;
  }
  if (readyIds.has("s11-strike-assets")) {
    patch.strikeAssets = cloneRows(defaultSudoDecisionInputs.strikeAssets);
  }
  if (readyIds.has("s12-control-points")) {
    patch.fireControlPoints = {
      ...defaultSudoDecisionInputs.fireControlPoints
    };
  }
  if (readyIds.has("s12-fire-plan")) {
    patch.firePlanRows = cloneRows(defaultSudoDecisionInputs.firePlanRows);
  }
  if (readyIds.has("s13-rd-assessment")) {
    patch.rdAssessmentRows = cloneRows(
      defaultSudoDecisionInputs.rdAssessmentRows
    );
  }
  if (readyIds.has("s14-bda")) {
    patch.observedDamagePercent = 18;
    patch.remainingTargets = 4;
    patch.bdaRequiredDamagePercent = 30;
  }
  return patch;
}
function getSudoScenarioSourceInputPatchStatusLabel(status) {
  return status === "applied" ? "\uBC18\uC601" : "\uC801\uC6A9\uB300\uAE30";
}

// js/vendor/kairos/src/gui/sudo/sudoRoutes.ts
var SUDO_MAIN_HASH = "#/sudo_main";
var SUDO_SUB_HASH = "#/sudo_sub";
var SUDO_ARTAS_HASH = "#/sudo_artas";
var SUDO_MAIN_PATH = "/sudo_main";
var SUDO_SUB_PATH = "/sudo_sub";
var SUDO_ARTAS_PATH = "/sudo_artas";
var SUDO_SCENARIO_COUNT = 14;
var SUDO_DEFAULT_SUB_SCENARIO_ID = 2;
function normalizePathname(pathname) {
  return pathname.replace(/\/+$/, "") || "/";
}
function isPathRoute(pathname, routePath) {
  const normalizedPathname = normalizePathname(pathname);
  return normalizedPathname === routePath || normalizedPathname.endsWith(routePath);
}
function getSudoHashRoute(hash) {
  if (hash.startsWith(SUDO_MAIN_HASH)) {
    return "main";
  }
  if (hash.startsWith(SUDO_SUB_HASH)) {
    return "sub";
  }
  if (hash.startsWith(SUDO_ARTAS_HASH)) {
    return "artas";
  }
  return void 0;
}
function isSudoMainRoute(hash, pathname = "") {
  if (isPathRoute(pathname, SUDO_MAIN_PATH)) {
    return true;
  }
  const hashRoute = getSudoHashRoute(hash);
  return hashRoute === "main";
}
function isSudoSubRoute(hash, pathname = "") {
  if (isPathRoute(pathname, SUDO_SUB_PATH)) {
    return true;
  }
  const hashRoute = getSudoHashRoute(hash);
  return hashRoute === "sub";
}
function isSudoArtasRoute(hash, pathname = "") {
  if (isPathRoute(pathname, SUDO_ARTAS_PATH)) {
    return true;
  }
  const hashRoute = getSudoHashRoute(hash);
  return hashRoute === "artas";
}
function isSudoPathRoute(pathname) {
  return isPathRoute(pathname, SUDO_MAIN_PATH) || isPathRoute(pathname, SUDO_SUB_PATH) || isPathRoute(pathname, SUDO_ARTAS_PATH);
}
function getSudoRouteQueryParams(hash, search = "", pathname = "") {
  const hashQuery = hash.includes("?") ? hash.split("?")[1] : "";
  const pathQuery = search.startsWith("?") ? search.slice(1) : search;
  const pathRoute = isSudoPathRoute(pathname);
  return new URLSearchParams(pathRoute && pathQuery ? pathQuery : hashQuery || pathQuery);
}
function parseSudoScenarioId(value, fallback = SUDO_DEFAULT_SUB_SCENARIO_ID) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > SUDO_SCENARIO_COUNT) {
    return fallback;
  }
  return parsed;
}
function parseSudoScenarioLevel(value, fallback = "corps") {
  return value === "battalion" || value === "corps" ? value : fallback;
}
function buildSudoSubHash(scenarioId = SUDO_DEFAULT_SUB_SCENARIO_ID) {
  const params = new URLSearchParams();
  params.set("scenario", String(parseSudoScenarioId(String(scenarioId))));
  return `${SUDO_SUB_HASH}?${params.toString()}`;
}
function buildSudoMainPath() {
  return SUDO_MAIN_PATH;
}
function buildSudoSubPath(scenarioId = SUDO_DEFAULT_SUB_SCENARIO_ID, options = {}) {
  const params = new URLSearchParams();
  params.set("scenario", String(parseSudoScenarioId(String(scenarioId))));
  if (options.scenarioLevel === "battalion") {
    params.set("level", options.scenarioLevel);
  }
  return `${SUDO_SUB_PATH}?${params.toString()}`;
}
function buildSudoArtasPath() {
  return SUDO_ARTAS_PATH;
}

// js/vendor/kairos/src/gui/sudo/sudoWindowSync.ts
var SUDO_SCENARIO_COMMAND_KEY = "vista:sudo:scenario-command";
var SUDO_DRONE_REDEPLOYMENT_KEY = "vista:sudo:drone-redeployment";
var SUDO_ANALYSIS_RESULT_KEY = "vista:sudo:analysis-result";
var SUDO_ANALYSIS_STATUS_KEY = "vista:sudo:analysis-status";
var SUDO_ANALYSIS_LOG_KEY = "vista:sudo:analysis-log";
var SUDO_ASSISTANT_QA_KEY = "vista:sudo:assistant-qa";
var SUDO_SCENARIO_STATE_UPDATED_EVENT = "vista:sudo:scenario-state-updated";
var MAX_ANALYSIS_LOG_ITEMS = 20;
function dispatchLocalStorageEvent(key, newValue) {
  window.dispatchEvent(
    new StorageEvent("storage", {
      key,
      newValue,
      storageArea: window.localStorage
    })
  );
}
function parseSudoScenarioCommand(value) {
  if (!value) {
    return void 0;
  }
  try {
    const parsed = JSON.parse(value);
    return {
      scenarioId: parseSudoScenarioId(String(parsed.scenarioId ?? "")),
      issuedAt: typeof parsed.issuedAt === "number" && Number.isFinite(parsed.issuedAt) ? parsed.issuedAt : Date.now(),
      source: parsed.source === "sub-sidebar" ? "sub-sidebar" : "main-sidebar",
      action: parsed.action === "analyze" ? "analyze" : "route",
      scenario1View: parsed.scenario1View === "tod" || parsed.scenario1View === "drone" ? parsed.scenario1View : void 0,
      scenarioLevel: parseSudoScenarioLevel(parsed.scenarioLevel, "corps")
    };
  } catch (_error) {
    return void 0;
  }
}
function toRedeploymentOrder(value, index) {
  const fallbackTypes = ["NAI", "DP", "TAI"];
  const destinationType = fallbackTypes.includes(
    value?.destinationType
  ) ? value?.destinationType : fallbackTypes[index % fallbackTypes.length];
  const statusOptions = ["\uC774\uB3D9\uBA85\uB839", "\uC774\uB3D9\uC911", "\uB3C4\uCC29"];
  const status = statusOptions.includes(
    value?.status
  ) ? value?.status : "\uC774\uB3D9\uBA85\uB839";
  const progressPercent = Number(value?.progressPercent);
  return {
    droneId: typeof value?.droneId === "string" && value.droneId.trim().length > 0 ? value.droneId.trim() : `DRONE-${index + 1}`,
    destinationType,
    destinationName: typeof value?.destinationName === "string" && value.destinationName.trim().length > 0 ? value.destinationName.trim() : destinationType,
    coordinate: typeof value?.coordinate === "string" && value.coordinate.trim().length > 0 ? value.coordinate.trim() : "BH 0000000000",
    progressPercent: Number.isFinite(progressPercent) ? Math.max(0, Math.min(100, Math.round(progressPercent))) : 0,
    status
  };
}
function parseSudoDroneRedeploymentCommand(value) {
  if (!value) {
    return void 0;
  }
  try {
    const parsed = JSON.parse(value);
    const orders = Array.isArray(parsed.orders) ? parsed.orders.map(
      (order, index) => toRedeploymentOrder(
        order,
        index
      )
    ) : [];
    return {
      scenarioId: parseSudoScenarioId(String(parsed.scenarioId ?? "10")),
      issuedAt: typeof parsed.issuedAt === "number" && Number.isFinite(parsed.issuedAt) ? parsed.issuedAt : Date.now(),
      source: "assistant",
      summary: typeof parsed.summary === "string" && parsed.summary.trim().length > 0 ? parsed.summary.trim() : "\uAC10\uC2DC\uC790\uC0B0 \uC7AC\uBC30\uCE58 \uBA85\uB839\uC744 \uC218\uC2E0\uD588\uC2B5\uB2C8\uB2E4.",
      orders
    };
  } catch (_error) {
    return void 0;
  }
}
function parseSudoAnalysisResultCommand(value) {
  if (!value) {
    return void 0;
  }
  try {
    const parsed = JSON.parse(value);
    const confidence = Number(parsed.confidence);
    const frameCount = Number(parsed.frameCount);
    const bboxCount = Number(parsed.bboxCount);
    const sourceOptions = [
      "ollama",
      "detector",
      "decision",
      "mock",
      "unavailable"
    ];
    const inputKindOptions = [
      "image",
      "video-frames",
      "computed",
      "mock",
      "none"
    ];
    const detectorSourceOptions = ["detector", "unconfigured", "error"];
    return {
      scenarioId: parseSudoScenarioId(String(parsed.scenarioId ?? "")),
      issuedAt: typeof parsed.issuedAt === "number" && Number.isFinite(parsed.issuedAt) ? parsed.issuedAt : Date.now(),
      title: typeof parsed.title === "string" && parsed.title.trim().length > 0 ? parsed.title.trim() : "\uBD84\uC11D\uACB0\uACFC",
      label: typeof parsed.label === "string" && parsed.label.trim().length > 0 ? parsed.label.trim() : "\uBBF8\uBD84\uB958",
      confidence: Number.isFinite(confidence) ? Math.max(0, Math.min(1, confidence)) : 0,
      model: typeof parsed.model === "string" && parsed.model.trim().length > 0 ? parsed.model.trim() : "unknown",
      source: sourceOptions.includes(String(parsed.source)) ? parsed.source : "unavailable",
      inputKind: inputKindOptions.includes(String(parsed.inputKind)) ? parsed.inputKind : "none",
      frameCount: Number.isFinite(frameCount) ? Math.max(0, frameCount) : 0,
      bboxCount: Number.isFinite(bboxCount) ? Math.max(0, bboxCount) : 0,
      detectorSource: detectorSourceOptions.includes(
        String(parsed.detectorSource)
      ) ? parsed.detectorSource : "unconfigured",
      summary: typeof parsed.summary === "string" && parsed.summary.trim().length > 0 ? parsed.summary.trim() : "\uBD84\uC11D \uC694\uC57D\uC774 \uC5C6\uC2B5\uB2C8\uB2E4."
    };
  } catch (_error) {
    return void 0;
  }
}
function parseSudoAnalysisStatusCommand(value) {
  if (!value) {
    return void 0;
  }
  try {
    const parsed = JSON.parse(value);
    const progressPercent = Number(parsed.progressPercent);
    const stageOptions = [
      "queued",
      "capturing",
      "running",
      "done",
      "error"
    ];
    return {
      scenarioId: parseSudoScenarioId(String(parsed.scenarioId ?? "")),
      issuedAt: typeof parsed.issuedAt === "number" && Number.isFinite(parsed.issuedAt) ? parsed.issuedAt : Date.now(),
      source: "sub-screen",
      stage: stageOptions.includes(parsed.stage) ? parsed.stage : "queued",
      message: typeof parsed.message === "string" && parsed.message.trim().length > 0 ? parsed.message.trim() : "\uBD80 \uD654\uBA74 \uBD84\uC11D \uC0C1\uD0DC\uB97C \uC218\uC2E0\uD588\uC2B5\uB2C8\uB2E4.",
      progressPercent: Number.isFinite(progressPercent) ? Math.max(0, Math.min(100, Math.round(progressPercent))) : 0
    };
  } catch (_error) {
    return void 0;
  }
}
function parseSudoAssistantQaCommand(value) {
  if (!value) {
    return void 0;
  }
  try {
    const parsed = JSON.parse(value);
    const statusOptions = ["running", "done", "error"];
    const question = typeof parsed.question === "string" ? parsed.question.trim() : "";
    const reply = typeof parsed.reply === "string" ? parsed.reply.trim() : "";
    return {
      scenarioId: parseSudoScenarioId(String(parsed.scenarioId ?? "6")),
      issuedAt: typeof parsed.issuedAt === "number" && Number.isFinite(parsed.issuedAt) ? parsed.issuedAt : Date.now(),
      source: parsed.source === "sub-screen" ? "sub-screen" : "main-chat",
      status: statusOptions.includes(parsed.status) ? parsed.status : "running",
      question,
      reply,
      model: typeof parsed.model === "string" && parsed.model.trim().length > 0 ? parsed.model.trim() : void 0
    };
  } catch (_error) {
    return void 0;
  }
}
function toSudoAnalysisLogItem(value, index) {
  if (!value) {
    return void 0;
  }
  const parsed = parseSudoAnalysisStatusCommand(JSON.stringify(value));
  if (!parsed) {
    return void 0;
  }
  return {
    ...parsed,
    id: typeof value.id === "string" && value.id.trim().length > 0 ? value.id.trim() : `${parsed.issuedAt}-${parsed.scenarioId}-${parsed.stage}-${index}`
  };
}
function parseSudoAnalysisLogItems(value) {
  if (!value) {
    return [];
  }
  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.map(
      (entry, index) => toSudoAnalysisLogItem(entry, index)
    ).filter((entry) => Boolean(entry)).sort((left, right) => right.issuedAt - left.issuedAt).slice(0, MAX_ANALYSIS_LOG_ITEMS);
  } catch (_error) {
    return [];
  }
}
function appendSudoAnalysisLogItem(command) {
  const currentItems = parseSudoAnalysisLogItems(
    window.localStorage.getItem(SUDO_ANALYSIS_LOG_KEY)
  );
  const isDuplicate = currentItems.some(
    (item) => item.scenarioId === command.scenarioId && item.stage === command.stage && item.message === command.message && Math.abs(item.issuedAt - command.issuedAt) < 1e3
  );
  if (isDuplicate) {
    return;
  }
  const nextItem = {
    ...command,
    id: [
      command.issuedAt,
      command.scenarioId,
      command.stage,
      currentItems.length
    ].join("-")
  };
  const nextValue = JSON.stringify(
    [nextItem, ...currentItems].slice(0, MAX_ANALYSIS_LOG_ITEMS)
  );
  window.localStorage.setItem(SUDO_ANALYSIS_LOG_KEY, nextValue);
  dispatchLocalStorageEvent(SUDO_ANALYSIS_LOG_KEY, nextValue);
}
function publishSudoScenarioCommand(scenarioId, source = "main-sidebar", action = "route", options = {}) {
  if (typeof window === "undefined") {
    return;
  }
  const command = {
    scenarioId: parseSudoScenarioId(String(scenarioId)),
    issuedAt: Date.now(),
    source,
    action,
    scenario1View: parseSudoScenarioId(String(scenarioId)) === 1 ? options.scenario1View : void 0,
    scenarioLevel: parseSudoScenarioLevel(options.scenarioLevel, "corps")
  };
  const nextValue = JSON.stringify(command);
  window.localStorage.setItem(SUDO_SCENARIO_COMMAND_KEY, nextValue);
  dispatchLocalStorageEvent(SUDO_SCENARIO_COMMAND_KEY, nextValue);
}
function readLatestSudoScenarioCommand() {
  if (typeof window === "undefined") {
    return void 0;
  }
  return parseSudoScenarioCommand(
    window.localStorage.getItem(SUDO_SCENARIO_COMMAND_KEY)
  );
}
function buildDefaultSudoDroneRedeploymentCommand() {
  return {
    scenarioId: 10,
    issuedAt: Date.now(),
    source: "assistant",
    summary: "\uC0AC\uD0DC\uBD84\uC11D\uB3C4 \uD310\uB2E8\uC548 2\uC548\uC5D0 \uB530\uB77C \uAC10\uC2DC\uC790\uC0B0 3\uB300\uB97C \uC7AC\uBC30\uCE58\uD569\uB2C8\uB2E4.",
    orders: [
      {
        droneId: "DRONE-1",
        destinationType: "TAI",
        destinationName: "#3 \uC465\uACE0\uAC1C",
        coordinate: "BH 13245 68820",
        progressPercent: 35,
        status: "\uC774\uB3D9\uC911"
      },
      {
        droneId: "DRONE-2",
        destinationType: "NAI",
        destinationName: "#4 \uB9D0\uACE0\uAC1C",
        coordinate: "BH 14562 31094",
        progressPercent: 48,
        status: "\uC774\uB3D9\uC911"
      },
      {
        droneId: "DRONE-3",
        destinationType: "TAI",
        destinationName: "#4 \uB2F9\uB3D9\uB9AC",
        coordinate: "BH 15884 23301",
        progressPercent: 22,
        status: "\uC774\uB3D9\uBA85\uB839"
      }
    ]
  };
}
function publishSudoDroneRedeploymentCommand(command = buildDefaultSudoDroneRedeploymentCommand()) {
  if (typeof window === "undefined") {
    return;
  }
  const nextValue = JSON.stringify({
    ...command,
    issuedAt: Date.now(),
    source: "assistant"
  });
  window.localStorage.setItem(SUDO_DRONE_REDEPLOYMENT_KEY, nextValue);
  dispatchLocalStorageEvent(SUDO_DRONE_REDEPLOYMENT_KEY, nextValue);
}
function readLatestSudoDroneRedeploymentCommand() {
  if (typeof window === "undefined") {
    return void 0;
  }
  return parseSudoDroneRedeploymentCommand(
    window.localStorage.getItem(SUDO_DRONE_REDEPLOYMENT_KEY)
  );
}
function publishSudoAnalysisResultCommand(command) {
  if (typeof window === "undefined") {
    return;
  }
  const nextValue = JSON.stringify({
    ...command,
    issuedAt: Date.now()
  });
  window.localStorage.setItem(SUDO_ANALYSIS_RESULT_KEY, nextValue);
  dispatchLocalStorageEvent(SUDO_ANALYSIS_RESULT_KEY, nextValue);
  publishSudoAnalysisStatusCommand({
    scenarioId: command.scenarioId,
    stage: "done",
    message: `${command.title} \uBD84\uC11D\uACB0\uACFC\uB97C \uC8FC \uD654\uBA74\uC5D0 \uC804\uC1A1\uD588\uC2B5\uB2C8\uB2E4.`,
    progressPercent: 100
  });
}
function readLatestSudoAnalysisResultCommand() {
  if (typeof window === "undefined") {
    return void 0;
  }
  return parseSudoAnalysisResultCommand(
    window.localStorage.getItem(SUDO_ANALYSIS_RESULT_KEY)
  );
}
function publishSudoAnalysisStatusCommand(command) {
  if (typeof window === "undefined") {
    return;
  }
  const statusCommand = {
    ...command,
    issuedAt: Date.now(),
    source: "sub-screen"
  };
  const nextValue = JSON.stringify(statusCommand);
  window.localStorage.setItem(SUDO_ANALYSIS_STATUS_KEY, nextValue);
  dispatchLocalStorageEvent(SUDO_ANALYSIS_STATUS_KEY, nextValue);
  appendSudoAnalysisLogItem(statusCommand);
}
function readLatestSudoAnalysisStatusCommand() {
  if (typeof window === "undefined") {
    return void 0;
  }
  return parseSudoAnalysisStatusCommand(
    window.localStorage.getItem(SUDO_ANALYSIS_STATUS_KEY)
  );
}
function readLatestSudoAnalysisLogItems() {
  if (typeof window === "undefined") {
    return [];
  }
  return parseSudoAnalysisLogItems(
    window.localStorage.getItem(SUDO_ANALYSIS_LOG_KEY)
  );
}
function publishSudoAssistantQaCommand(command) {
  if (typeof window === "undefined") {
    return;
  }
  const nextValue = JSON.stringify({
    ...command,
    scenarioId: parseSudoScenarioId(String(command.scenarioId)),
    question: command.question.trim(),
    reply: command.reply.trim(),
    issuedAt: Date.now()
  });
  window.localStorage.setItem(SUDO_ASSISTANT_QA_KEY, nextValue);
  dispatchLocalStorageEvent(SUDO_ASSISTANT_QA_KEY, nextValue);
}
function readLatestSudoAssistantQaCommand() {
  if (typeof window === "undefined") {
    return void 0;
  }
  return parseSudoAssistantQaCommand(
    window.localStorage.getItem(SUDO_ASSISTANT_QA_KEY)
  );
}
function subscribeSudoAnalysisResultCommand(onCommand) {
  if (typeof window === "undefined") {
    return () => {
    };
  }
  const handleStorage = (event) => {
    if (event.key !== SUDO_ANALYSIS_RESULT_KEY) {
      return;
    }
    const command = parseSudoAnalysisResultCommand(event.newValue);
    if (command) {
      onCommand(command);
    }
  };
  window.addEventListener("storage", handleStorage);
  return () => {
    window.removeEventListener("storage", handleStorage);
  };
}
function subscribeSudoAnalysisStatusCommand(onCommand) {
  if (typeof window === "undefined") {
    return () => {
    };
  }
  const handleStorage = (event) => {
    if (event.key !== SUDO_ANALYSIS_STATUS_KEY) {
      return;
    }
    const command = parseSudoAnalysisStatusCommand(event.newValue);
    if (command) {
      onCommand(command);
    }
  };
  window.addEventListener("storage", handleStorage);
  return () => {
    window.removeEventListener("storage", handleStorage);
  };
}
function subscribeSudoAnalysisLogItems(onItems) {
  if (typeof window === "undefined") {
    return () => {
    };
  }
  const handleStorage = (event) => {
    if (event.key !== SUDO_ANALYSIS_LOG_KEY) {
      return;
    }
    onItems(parseSudoAnalysisLogItems(event.newValue));
  };
  window.addEventListener("storage", handleStorage);
  return () => {
    window.removeEventListener("storage", handleStorage);
  };
}
function subscribeSudoAssistantQaCommand(onCommand) {
  if (typeof window === "undefined") {
    return () => {
    };
  }
  const handleStorage = (event) => {
    if (event.key !== SUDO_ASSISTANT_QA_KEY) {
      return;
    }
    const command = parseSudoAssistantQaCommand(event.newValue);
    if (command) {
      onCommand(command);
    }
  };
  window.addEventListener("storage", handleStorage);
  return () => {
    window.removeEventListener("storage", handleStorage);
  };
}
function subscribeSudoDroneRedeploymentCommand(onCommand) {
  if (typeof window === "undefined") {
    return () => {
    };
  }
  const handleStorage = (event) => {
    if (event.key !== SUDO_DRONE_REDEPLOYMENT_KEY) {
      return;
    }
    const command = parseSudoDroneRedeploymentCommand(event.newValue);
    if (command) {
      onCommand(command);
    }
  };
  window.addEventListener("storage", handleStorage);
  return () => {
    window.removeEventListener("storage", handleStorage);
  };
}
function subscribeSudoScenarioCommand(onCommand) {
  if (typeof window === "undefined") {
    return () => {
    };
  }
  const handleStorage = (event) => {
    if (event.key !== SUDO_SCENARIO_COMMAND_KEY) {
      return;
    }
    const command = parseSudoScenarioCommand(event.newValue);
    if (command) {
      onCommand(command);
    }
  };
  window.addEventListener("storage", handleStorage);
  return () => {
    window.removeEventListener("storage", handleStorage);
  };
}
function routeSudoSubWindowToScenario(scenarioId, scenarioLevel) {
  const nextPath = buildSudoSubPath(scenarioId, { scenarioLevel });
  const currentPath = `${window.location.pathname}${window.location.search}`;
  if (currentPath !== nextPath || window.location.hash) {
    window.history.pushState(null, "", nextPath);
    window.dispatchEvent(new PopStateEvent("popstate"));
  }
}

// js/vendor/kairos/src/gui/sudo/sudoFtxReport.ts
var SUDO_SUB_STATE_KEY_PREFIX = "sudo.sub.scenario-state.v1.";
var REQUIRED_SCENARIO_IDS = new Set(
  sudoScenarios.filter((scenario) => scenario.implementationLevel === "\uD544\uC218 \uAD6C\uD604").map((scenario) => scenario.id)
);
var DECISION_EVIDENCE_SCENARIO_IDS = /* @__PURE__ */ new Set([
  3,
  4,
  5,
  7,
  8,
  9,
  11,
  12,
  13,
  14
]);
function readScenarioState(scenarioId) {
  if (typeof window === "undefined") {
    return void 0;
  }
  try {
    const raw = window.localStorage.getItem(
      `${SUDO_SUB_STATE_KEY_PREFIX}${scenarioId}`
    );
    return raw ? JSON.parse(raw) : void 0;
  } catch (_error) {
    return void 0;
  }
}
function normalizeDecisionInputs(inputs) {
  return normalizeSudoDecisionInputs(inputs);
}
function hasStoredScenarioWork(state) {
  return Boolean(
    state?.updatedAt || state?.analysis || state?.detectorResult || state?.detectorHealth || state?.ollamaHealth || state?.decisionInputs || state?.operatorReview || state?.assistantQuestion || state?.assistantReply
  );
}
function getOperatorReviewStatusLabel(status) {
  if (status === "confirmed") {
    return "\uC791\uC804\uD655\uC815";
  }
  if (status === "needs-review") {
    return "\uC7AC\uAC80\uD1A0";
  }
  return status ? "\uBBF8\uD655\uC815" : "";
}
function hasAssistantResponse(state) {
  return Boolean(state?.assistantReply?.trim());
}
function isLatestAnalysisForScenario(latestAnalysis, scenarioId) {
  return latestAnalysis?.scenarioId === scenarioId ? latestAnalysis : void 0;
}
function hasOllamaAnalysis(scenarioId, state, latestAnalysis) {
  return state?.analysis?.source === "ollama" || isLatestAnalysisForScenario(latestAnalysis, scenarioId)?.source === "ollama";
}
function getDetectorBboxCount(scenarioId, state, latestAnalysis) {
  const storedDetectorCount = state?.detectorResult?.source === "detector" ? state.detectorResult.detections?.length ?? 0 : 0;
  const latest = isLatestAnalysisForScenario(latestAnalysis, scenarioId);
  const latestDetectorCount = latest?.detectorSource === "detector" ? latest.bboxCount : 0;
  return Math.max(storedDetectorCount, latestDetectorCount);
}
function hasDecisionEvidence(scenarioId, state) {
  if (!state?.updatedAt) {
    return false;
  }
  const inputs = normalizeDecisionInputs(state.decisionInputs);
  const output = getSudoDecisionOutput(scenarioId, inputs);
  if (!output?.summary) {
    return false;
  }
  if (scenarioId !== 12) {
    return true;
  }
  return inputs.firePlanRows.some(
    (row) => row.time && row.asset && row.action && row.effect
  );
}
function buildRequiredScenarioEvaluation(scenarioId, state, latestAnalysis) {
  const hasWork = hasStoredScenarioWork(state);
  if (scenarioId === 1) {
    if (state?.updatedAt) {
      return {
        status: "done",
        statusReason: "\uB4DC\uB860 \uD45C\uC801 \uC2DD\uBCC4 \uD654\uBA74 \uC0C1\uD0DC\uAC00 \uC800\uC7A5\uB418\uC5C8\uC2B5\uB2C8\uB2E4.",
        nextAction: "\uD45C\uC801\uC131\uC9C8\uBD84\uC11D\uC73C\uB85C \uC9C4\uD589"
      };
    }
    return {
      status: hasWork ? "draft" : "pending",
      statusReason: hasWork ? "\uD45C\uC801 \uC2DD\uBCC4 \uD654\uBA74 \uC77C\uBD80 \uC0C1\uD0DC\uAC00 \uC800\uC7A5\uB418\uC5B4 \uD655\uC778 \uC911\uC785\uB2C8\uB2E4." : "\uB4DC\uB860 \uD45C\uC801 \uC2DD\uBCC4 \uD654\uBA74 \uD655\uC778\uC774 \uC544\uC9C1 \uD544\uC694\uD569\uB2C8\uB2E4.",
      nextAction: "\uC8FC \uD654\uBA74 \uD45C\uC801 \uACBD\uBCF4 \uD655\uC778 \uD6C4 S1 \uBD80 \uD654\uBA74\uC744 \uC5F4\uC5B4 \uC0C1\uD0DC \uC800\uC7A5"
    };
  }
  if (scenarioId === 2) {
    const hasVlm = hasOllamaAnalysis(scenarioId, state, latestAnalysis);
    const detectorBboxCount = getDetectorBboxCount(
      scenarioId,
      state,
      latestAnalysis
    );
    const done = hasVlm && detectorBboxCount > 0;
    if (done) {
      return {
        status: "done",
        statusReason: `Gemma VLM \uBD84\uC11D\uACFC Detector bbox ${detectorBboxCount}\uAC74\uC774 \uD655\uBCF4\uB418\uC5C8\uC2B5\uB2C8\uB2E4.`,
        nextAction: "\uD0C4\uC885/\uBC1C\uC218 \uD310\uB2E8\uC73C\uB85C \uACB0\uACFC \uC774\uAD00"
      };
    }
    if (hasVlm && detectorBboxCount === 0) {
      return {
        status: "draft",
        statusReason: "Gemma VLM \uBD84\uC11D\uC740 \uC644\uB8CC\uB410\uC9C0\uB9CC Detector bbox \uADFC\uAC70\uAC00 \uC5C6\uC2B5\uB2C8\uB2E4.",
        nextAction: "Detector/\uC601\uC0C1 \uC785\uB825 \uC0AC\uC804\uC810\uAC80 \uD6C4 \uBD84\uC11D \uC7AC\uC2E4\uD589"
      };
    }
    if (!hasVlm && detectorBboxCount > 0) {
      return {
        status: "draft",
        statusReason: `Detector bbox ${detectorBboxCount}\uAC74\uC740 \uC788\uC73C\uB098 Gemma VLM \uD310\uB3C5\uC774 \uD544\uC694\uD569\uB2C8\uB2E4.`,
        nextAction: "\uC601\uC0C1 \uD504\uB808\uC784->Gemma \uBD84\uC11D \uC2E4\uD589"
      };
    }
    return {
      status: hasWork ? "draft" : "pending",
      statusReason: hasWork ? "\uD45C\uC801\uC131\uC9C8\uBD84\uC11D \uC785\uB825 \uB610\uB294 \uC0C1\uD0DC\uB9CC \uC800\uC7A5\uB418\uC5B4 \uC788\uC2B5\uB2C8\uB2E4." : "\uD45C\uC801\uC131\uC9C8\uBD84\uC11D \uC2E4\uD589 \uC804\uC785\uB2C8\uB2E4.",
      nextAction: "\uC0AC\uC804\uC810\uAC80 \uD6C4 \uC601\uC0C1 \uD504\uB808\uC784->Gemma \uBD84\uC11D \uC2E4\uD589"
    };
  }
  if (scenarioId === 6) {
    const hasResponse = hasAssistantResponse(state);
    if (hasResponse) {
      return {
        status: "done",
        statusReason: "Army GPT \uC9C8\uC758\uC751\uB2F5 \uACB0\uACFC\uAC00 \uC800\uC7A5\uB418\uC5C8\uC2B5\uB2C8\uB2E4.",
        nextAction: "\uCDE8\uC57D\uC810 \uB2F5\uBCC0\uC744 \uD45C\uC801\uC131\uC9C8 \uD310\uB2E8\uADFC\uAC70\uC5D0 \uCCA8\uBD80"
      };
    }
    return {
      status: hasWork ? "draft" : "pending",
      statusReason: hasWork ? "AI \uC5B4\uC2DC\uC2A4\uD134\uD2B8 \uC9C8\uBB38 \uB610\uB294 \uB2F5\uBCC0\uC774 \uC544\uC9C1 \uC644\uC131\uB418\uC9C0 \uC54A\uC558\uC2B5\uB2C8\uB2E4." : "AI \uC5B4\uC2DC\uC2A4\uD134\uD2B8 \uC9C8\uC758\uC751\uB2F5 \uC2E4\uD589 \uC804\uC785\uB2C8\uB2E4.",
      nextAction: "\uC9C8\uC758 \uC2E4\uD589\uC73C\uB85C \uCDE8\uC57D\uC810 \uB2F5\uBCC0 \uC0DD\uC131"
    };
  }
  if (DECISION_EVIDENCE_SCENARIO_IDS.has(scenarioId)) {
    const done = hasDecisionEvidence(scenarioId, state);
    if (done) {
      return {
        status: "done",
        statusReason: scenarioId === 13 ? "R/D \uCCB4\uD06C\uB9AC\uC2A4\uD2B8\uC640 \uD0C0\uCD9C\uCC98 \uC815\uBCF4\uC735\uD569 \uD310\uB2E8 \uC0B0\uCD9C\uBB3C\uC774 \uC800\uC7A5\uB418\uC5C8\uC2B5\uB2C8\uB2E4." : scenarioId === 14 ? "\uD0C0\uACA9\uACB0\uACFC \uC601\uC0C1 \uAE30\uBC18 BDA \uC0B0\uCD9C\uBB3C\uC774 \uC800\uC7A5\uB418\uC5C8\uC2B5\uB2C8\uB2E4." : "\uD310\uB2E8\uADFC\uAC70 \uBCF4\uC870\uCC3D \uC785\uB825\uACFC \uCD5C\uC885 \uD310\uB2E8 \uC0B0\uCD9C\uBB3C\uC774 \uC800\uC7A5\uB418\uC5C8\uC2B5\uB2C8\uB2E4.",
        nextAction: scenarioId === 13 ? "\uD5C8\uC0C1\uD45C\uC801 \uD310\uB2E8\uC744 \uBCF4\uACE0\uC11C\uC5D0 \uBC18\uC601" : scenarioId === 14 ? "\uC7AC\uD0C0\uACA9 \uD310\uB2E8\uC744 \uBCF4\uACE0\uC11C\uC5D0 \uBC18\uC601" : "\uB2E4\uC74C \uD544\uC218 \uD310\uB2E8 \uB2E8\uACC4\uB85C \uC9C4\uD589"
      };
    }
    return {
      status: hasWork ? "draft" : "pending",
      statusReason: hasWork ? "\uD310\uB2E8 \uC785\uB825 \uC77C\uBD80\uAC00 \uC800\uC7A5\uB410\uC9C0\uB9CC \uC644\uB8CC \uC870\uAC74\uC744 \uC544\uC9C1 \uCDA9\uC871\uD558\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4." : "\uD310\uB2E8\uADFC\uAC70 \uBCF4\uC870\uCC3D \uD655\uC778\uC774 \uC544\uC9C1 \uD544\uC694\uD569\uB2C8\uB2E4.",
      nextAction: scenarioId === 12 ? "\uD1B5\uD569\uD654\uB825\uC6B4\uC6A9\uB3C4\uD45C \uC785\uB825\uAC12\uACFC \uD0C0\uACA9\uACC4\uD68D \uD589 \uD655\uC778" : scenarioId === 3 ? "\uC7A5\uBE44\uB300\uC218\uC640 \uD589\uAD70\uC7A5\uACBD \uD310\uB2E8\uAC12 \uD655\uC778" : scenarioId === 4 ? "\uC804\uD22C\uC11C\uC5F4 \uD6C4\uBCF4 \uAC70\uB9AC/\uD654\uD3EC/\uBC29\uD5A5 \uC810\uC218 \uD655\uC778" : scenarioId === 5 ? "\uBBFC\uAC00 \uC774\uACA9\uAC70\uB9AC\uC640 \uD0C4\uC885\uBCC4 \uD6A8\uACFC\uBC18\uACBD \uD655\uC778" : scenarioId === 9 ? "\uC0AC\uD0DC\uBD84\uC11D\uB3C4 \uD6C4\uBCF4 \uAC10\uC2DC\uC728/\uACF5\uBC31/\uD654\uB825\uC5F0\uACC4 \uD655\uC778" : scenarioId === 11 ? "TAI \uB3C4\uCC29\uC2DC\uAC04\uACFC \uAC00\uC6A9\uC790\uC0B0 \uC2DC\uAC04\uD45C \uD655\uC778" : scenarioId === 13 ? "R/D \uC9C4\uC9C0\uC640 \uC9C0\uD718\uC18C \uCCB4\uD06C\uB9AC\uC2A4\uD2B8 \uC2E4\uC874\xB7\uD5C8\uC0C1 \uADFC\uAC70 \uD655\uC778" : scenarioId === 14 ? "\uD0C0\uACA9\uACB0\uACFC \uD53C\uD574\uC728\uACFC \uC794\uC5EC\uD45C\uC801 \uAE30\uC900 \uD655\uC778" : "\uD310\uB2E8\uADFC\uAC70 \uBCF4\uC870\uCC3D\uC5D0\uC11C \uD45C/\uC785\uB825\uAC12 \uD655\uC778"
    };
  }
  if (scenarioId === 10) {
    if (hasAssistantResponse(state)) {
      return {
        status: "draft",
        statusReason: "AI \uC5B4\uC2DC\uC2A4\uD134\uD2B8 \uC751\uB2F5\uC740 \uC800\uC7A5\uB410\uC9C0\uB9CC \uB4DC\uB860 \uC7AC\uBC30\uCE58 \uBA85\uB839 \uD655\uC778\uC774 \uD544\uC694\uD569\uB2C8\uB2E4.",
        nextAction: "\uC9C8\uC758 \uC2E4\uD589 \uD6C4 \uC8FC \uD654\uBA74 \uB4DC\uB860 \uC7AC\uBC30\uCE58 \uC624\uBC84\uB808\uC774 \uD655\uC778"
      };
    }
    return {
      status: hasWork ? "draft" : "pending",
      statusReason: hasWork ? "\uAC10\uC2DC\uC790\uC0B0 \uC7AC\uBC30\uCE58 \uC785\uB825 \uB610\uB294 \uB2F5\uBCC0 \uC77C\uBD80\uAC00 \uC800\uC7A5\uB418\uC5B4 \uC788\uC2B5\uB2C8\uB2E4." : "\uAC10\uC2DC\uC790\uC0B0 \uC7AC\uBC30\uCE58 \uBA85\uB839 \uC2E4\uD589 \uC804\uC785\uB2C8\uB2E4.",
      nextAction: "AI \uC5B4\uC2DC\uC2A4\uD134\uD2B8 \uC9C8\uC758 \uC2E4\uD589\uC73C\uB85C \uC7AC\uBC30\uCE58 \uBA85\uB839 \uD558\uB2EC"
    };
  }
  return {
    status: hasWork ? "draft" : "pending",
    statusReason: hasWork ? "\uD544\uC218 \uC2DC\uB098\uB9AC\uC624 \uC0C1\uD0DC\uAC00 \uC800\uC7A5\uB418\uC5B4 \uAC80\uD1A0 \uC911\uC785\uB2C8\uB2E4." : "\uD544\uC218 \uC2DC\uB098\uB9AC\uC624 \uC2E4\uD589 \uC804\uC785\uB2C8\uB2E4.",
    nextAction: "\uBD80 \uD654\uBA74\uC5D0\uC11C \uC2DC\uB098\uB9AC\uC624 \uCC98\uB9AC"
  };
}
function buildScenarioEvaluation(scenarioId) {
  const latestAnalysis = readLatestSudoAnalysisResultCommand();
  const redeployment = readLatestSudoDroneRedeploymentCommand();
  const scenario = sudoScenarios.find((item) => item.id === scenarioId);
  if (scenarioId === 10 && redeployment?.orders.length) {
    return {
      status: "done",
      statusReason: `\uB4DC\uB860 \uC7AC\uBC30\uCE58 \uBA85\uB839 ${redeployment.orders.length}\uAC74\uC774 \uD558\uB2EC\uB418\uC5C8\uC2B5\uB2C8\uB2E4.`,
      nextAction: "\uC7AC\uBC30\uCE58 \uC0C1\uD669 \uC8FC \uD654\uBA74 \uCD94\uC801"
    };
  }
  const state = readScenarioState(scenarioId);
  if (state?.operatorReview?.status === "needs-review") {
    return {
      status: "draft",
      statusReason: `${state.operatorReview.label ?? scenario?.title ?? "\uC2DC\uB098\uB9AC\uC624"} \uACB0\uACFC\uAC00 \uC6B4\uC601\uC790 \uC7AC\uAC80\uD1A0\uB85C \uD45C\uC2DC\uB418\uC5C8\uC2B5\uB2C8\uB2E4.`,
      nextAction: "AI \uAD50\uCC28\uAC80\uC99D \uD655\uC778\uD56D\uBAA9 \uAC80\uD1A0 \uD6C4 \uACB0\uACFC \uD655\uC815"
    };
  }
  if (REQUIRED_SCENARIO_IDS.has(scenarioId)) {
    return buildRequiredScenarioEvaluation(scenarioId, state, latestAnalysis);
  }
  if (scenario?.visualKind === "assistant") {
    if (hasAssistantResponse(state)) {
      return {
        status: "done",
        statusReason: "Army GPT \uC9C8\uC758\uC751\uB2F5 \uACB0\uACFC\uAC00 \uC800\uC7A5\uB418\uC5C8\uC2B5\uB2C8\uB2E4.",
        nextAction: "\uCDE8\uC57D\uC810 \uB2F5\uBCC0\uC744 \uD45C\uC801\uC131\uC9C8 \uD310\uB2E8\uADFC\uAC70\uC5D0 \uCCA8\uBD80"
      };
    }
    return {
      status: hasStoredScenarioWork(state) ? "draft" : "pending",
      statusReason: hasStoredScenarioWork(state) ? "AI \uC5B4\uC2DC\uC2A4\uD134\uD2B8 \uC9C8\uBB38 \uB610\uB294 \uB2F5\uBCC0\uC774 \uC544\uC9C1 \uC644\uC131\uB418\uC9C0 \uC54A\uC558\uC2B5\uB2C8\uB2E4." : "AI \uC5B4\uC2DC\uC2A4\uD134\uD2B8 \uC9C8\uC758\uC751\uB2F5 \uC2E4\uD589 \uC804\uC785\uB2C8\uB2E4.",
      nextAction: "\uC9C8\uC758 \uC2E4\uD589\uC73C\uB85C \uCDE8\uC57D\uC810 \uB2F5\uBCC0 \uC0DD\uC131"
    };
  }
  if (scenario?.visualKind === "reposition" && hasAssistantResponse(state)) {
    return {
      status: "draft",
      statusReason: "AI \uC5B4\uC2DC\uC2A4\uD134\uD2B8 \uC751\uB2F5\uC740 \uC800\uC7A5\uB410\uC9C0\uB9CC \uB4DC\uB860 \uC7AC\uBC30\uCE58 \uBA85\uB839 \uD655\uC778\uC774 \uD544\uC694\uD569\uB2C8\uB2E4.",
      nextAction: "\uC9C8\uC758 \uC2E4\uD589 \uD6C4 \uC8FC \uD654\uBA74 \uB4DC\uB860 \uC7AC\uBC30\uCE58 \uC624\uBC84\uB808\uC774 \uD655\uC778"
    };
  }
  if (DECISION_EVIDENCE_SCENARIO_IDS.has(scenarioId)) {
    return buildRequiredScenarioEvaluation(scenarioId, state, latestAnalysis);
  }
  if (isLatestAnalysisForScenario(latestAnalysis, scenarioId)) {
    return {
      status: "done",
      statusReason: "\uCD5C\uC2E0 \uBD80 \uD654\uBA74 \uBD84\uC11D \uACB0\uACFC\uAC00 \uC8FC \uD654\uBA74\uC73C\uB85C \uC5F0\uB3D9\uB418\uC5C8\uC2B5\uB2C8\uB2E4.",
      nextAction: "\uBCF4\uACE0\uC11C \uBC18\uC601"
    };
  }
  if (!state) {
    return {
      status: "pending",
      statusReason: "\uC2DC\uB098\uB9AC\uC624 \uCC98\uB9AC \uC804\uC785\uB2C8\uB2E4.",
      nextAction: "\uBD80 \uD654\uBA74\uC5D0\uC11C \uC2DC\uB098\uB9AC\uC624 \uC120\uD0DD"
    };
  }
  if (state.analysis?.source === "ollama" || state.detectorResult?.source === "detector" || (state.detectorResult?.detections?.length ?? 0) > 0) {
    return {
      status: "done",
      statusReason: "\uBD84\uC11D \uB610\uB294 Detector \uACB0\uACFC\uAC00 \uC800\uC7A5\uB418\uC5C8\uC2B5\uB2C8\uB2E4.",
      nextAction: "\uBCF4\uACE0\uC11C \uBC18\uC601"
    };
  }
  return {
    status: state.updatedAt ? "draft" : "pending",
    statusReason: state.updatedAt ? "\uC2DC\uB098\uB9AC\uC624 \uC785\uB825 \uC0C1\uD0DC\uAC00 \uC800\uC7A5\uB418\uC5B4 \uAC80\uD1A0 \uC911\uC785\uB2C8\uB2E4." : "\uC2DC\uB098\uB9AC\uC624 \uCC98\uB9AC \uC804\uC785\uB2C8\uB2E4.",
    nextAction: "\uBD80 \uD654\uBA74\uC5D0\uC11C \uD310\uB2E8\uADFC\uAC70 \uD655\uC778"
  };
}
function isRecord3(value) {
  return typeof value === "object" && value !== null;
}
function readStringField(record, key) {
  const value = record[key];
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : void 0;
}
function readNumberField(record, key) {
  const value = Number(record[key]);
  return Number.isFinite(value) ? value : void 0;
}
function normalizeReportDetection(detection) {
  if (!isRecord3(detection)) {
    return void 0;
  }
  const label = readStringField(detection, "label") ?? readStringField(detection, "className") ?? readStringField(detection, "class") ?? readStringField(detection, "name");
  if (!label) {
    return void 0;
  }
  return {
    label,
    rawLabel: readStringField(detection, "rawLabel"),
    confidence: readNumberField(detection, "confidence") ?? readNumberField(detection, "score") ?? 0,
    x: readNumberField(detection, "x") ?? 0,
    y: readNumberField(detection, "y") ?? 0,
    width: readNumberField(detection, "width") ?? 0,
    height: readNumberField(detection, "height") ?? 0,
    color: readStringField(detection, "color"),
    frameIndex: readNumberField(detection, "frameIndex") ?? readNumberField(detection, "frame_index") ?? readNumberField(detection, "frame"),
    trackId: readStringField(detection, "trackId") ?? readStringField(detection, "track_id") ?? readStringField(detection, "id")
  };
}
function normalizeReportDetections(detections) {
  return detections?.map((detection) => normalizeReportDetection(detection)).filter(
    (detection) => Boolean(detection)
  ) ?? [];
}
function buildDetectionReportFields(detections) {
  const normalizedDetections = smoothSudoDetectionsByTrack(
    normalizeReportDetections(detections)
  );
  const tracks = buildSudoDetectionTrackSummary(normalizedDetections);
  return {
    bboxCount: detections?.length ?? 0,
    rawLabelCount: normalizedDetections.filter((box) => box.rawLabel).length,
    trackedBboxCount: normalizedDetections.filter((box) => box.trackId).length,
    trackCount: tracks.length,
    trackIds: tracks.map((track) => track.trackId)
  };
}
function buildDecisionPerceptionInput(state) {
  if (!state?.analysis && !state?.detectorResult) {
    return void 0;
  }
  const detectorDetections = normalizeReportDetections(
    state.detectorResult?.detections
  );
  const analysisDetections = normalizeReportDetections(
    state.analysis?.detections
  );
  const detections = detectorDetections.length ? detectorDetections : analysisDetections;
  const label = state.operatorReview?.label?.trim() || state.analysis?.label?.trim() || detections[0]?.label || "";
  if (!label && detections.length === 0) {
    return void 0;
  }
  return {
    label,
    confidence: typeof state.analysis?.confidence === "number" ? state.analysis.confidence : Math.max(0, ...detections.map((box) => box.confidence)),
    detections,
    model: state.detectorResult?.model || state.analysis?.model || state.detectorResult?.source || state.analysis?.source || "\uC800\uC7A5 \uBD84\uC11D",
    frameCount: Math.max(
      state.analysis?.frameCount ?? 0,
      detections.reduce(
        (maxFrame, box) => Math.max(maxFrame, (box.frameIndex ?? 0) + 1),
        0
      )
    )
  };
}
function buildSudoProgressItems() {
  return sudoScenarios.filter((scenario) => Boolean(scenario)).map((scenario) => {
    const evaluation = buildScenarioEvaluation(scenario.id);
    return {
      scenario,
      ...evaluation,
      required: REQUIRED_SCENARIO_IDS.has(scenario.id)
    };
  });
}
function buildSudoProgressSummary(items = buildSudoProgressItems()) {
  const requiredItems = items.filter((item) => item.required);
  const nextRequiredItem = requiredItems.find((item) => item.status !== "done") ?? items.find((item) => item.status !== "done");
  return {
    total: items.length,
    done: items.filter((item) => item.status === "done").length,
    requiredTotal: requiredItems.length,
    requiredDone: requiredItems.filter((item) => item.status === "done").length,
    requiredReady: requiredItems.filter((item) => item.status === "draft").length,
    requiredWaiting: requiredItems.filter((item) => item.status === "pending").length,
    nextRequiredScenario: nextRequiredItem ? {
      id: nextRequiredItem.scenario.id,
      title: nextRequiredItem.scenario.title,
      status: nextRequiredItem.status,
      required: nextRequiredItem.required,
      statusReason: nextRequiredItem.statusReason ?? "",
      nextAction: nextRequiredItem.nextAction ?? ""
    } : void 0
  };
}
function getSudoProgressStatusLabel(status) {
  if (status === "done") {
    return "DONE";
  }
  if (status === "draft") {
    return "READY";
  }
  return "WAIT";
}
function getSudoProgressStatusColor(status) {
  if (status === "done") {
    return "#67f29b";
  }
  if (status === "draft") {
    return "#ffc857";
  }
  return "rgba(236, 255, 251, 0.34)";
}
function summarizeReportList(items, limit = 3) {
  const values = items.map((item) => item.trim()).filter(Boolean);
  const visible = values.slice(0, limit);
  const hidden = values.length - visible.length;
  return [...visible, ...hidden > 0 ? [`+${hidden}\uAC74`] : []].join(" | ");
}
function buildSudoDataReportSource(scenarioId, decisionInputs) {
  const intel = getSudoScenarioDataIntel(scenarioId);
  const sourceStage = buildFallbackSudoScenarioSourceStage(scenarioId);
  const decisionBindings = buildSudoScenarioSourceDecisionBindings(
    scenarioId,
    decisionInputs,
    sourceStage
  );
  const bindingSummary = buildSudoScenarioSourceBindingSummary(decisionBindings);
  const inputPatchSuggestions = buildSudoScenarioSourceInputPatchSuggestions(
    scenarioId,
    decisionInputs,
    sourceStage
  );
  const inputPatchSummary = buildSudoScenarioSourceInputPatchSummary(
    inputPatchSuggestions
  );
  return {
    sourceRefs: mergeSudoScenarioSourceValues(
      intel.sourceRefs,
      sourceStage?.sourceRefs
    ),
    sourceFiles: mergeSudoScenarioSourceValues(
      intel.sourceFiles,
      sourceStage?.sourceFiles
    ),
    dataPoints: [...intel.dataPoints],
    gisHighlights: [...intel.gisHighlights],
    links: intel.links.map((link) => ({ ...link })),
    extractionHealthSummary: buildSudoDataExtractionHealthSummary(),
    extractionRoleSummary: buildSudoDataExtractionRoleSummary(),
    extractionIssueSummary: buildSudoDataExtractionIssueSummary(),
    extraction: {
      generatedAt: SUDO_DATA_EXTRACTION_SUMMARY.generatedAt,
      sourceTotal: SUDO_DATA_EXTRACTION_SUMMARY.sourceTotal,
      sourceOk: SUDO_DATA_EXTRACTION_SUMMARY.sourceOk,
      sourcePartial: SUDO_DATA_EXTRACTION_SUMMARY.sourcePartial,
      ocrEngine: SUDO_DATA_EXTRACTION_SUMMARY.ocrEngine,
      ocrTotal: SUDO_DATA_EXTRACTION_SUMMARY.ocrTotal,
      ocrOk: SUDO_DATA_EXTRACTION_SUMMARY.ocrOk,
      ocrFailed: SUDO_DATA_EXTRACTION_SUMMARY.ocrFailed,
      presentationTotal: SUDO_DATA_EXTRACTION_SUMMARY.presentationTotal,
      presentationOk: SUDO_DATA_EXTRACTION_SUMMARY.presentationOk,
      presentationSkipped: SUDO_DATA_EXTRACTION_SUMMARY.presentationSkipped,
      slideRenderTotal: SUDO_DATA_EXTRACTION_SUMMARY.slideRenderTotal,
      roleCounts: SUDO_DATA_EXTRACTION_SUMMARY.roleCounts.map((item) => ({
        ...item
      })),
      issues: SUDO_DATA_EXTRACTION_SUMMARY.issues.map((issue) => ({
        ...issue
      })),
      links: SUDO_DATA_EXTRACTION_SUMMARY.links.map((link) => ({ ...link }))
    },
    enhancementIdeaSummary: buildSudoDataEnhancementIdeaSummary(
      getCoreSudoDataEnhancementIdeas(intel.enhancementIdeas)
    ),
    enhancementIdeas: getCoreSudoDataEnhancementIdeas(
      intel.enhancementIdeas
    ).map((idea) => ({ ...idea })),
    stage: sourceStage ? {
      id: sourceStage.id,
      title: sourceStage.title,
      page: sourceStage.page,
      timeBand: sourceStage.timeBand,
      combatLayer: sourceStage.combatLayer,
      implementationLevel: formatSudoScenarioImplementationLevel(
        sourceStage.implementationLevel
      ) ?? sourceStage.implementationLevel,
      requirements: [...sourceStage.requirements],
      sourceRefs: [...sourceStage.sourceRefs],
      sourceFiles: [...sourceStage.sourceFiles],
      assetUse: sourceStage.assetUse ? { ...sourceStage.assetUse } : void 0,
      codeAction: sourceStage.codeAction
    } : void 0,
    bindingSummary: bindingSummary.label,
    bindingDetails: decisionBindings.map((binding) => ({
      id: binding.id,
      label: binding.label,
      status: binding.status,
      detail: binding.detail,
      basis: binding.basis
    })),
    inputPatchSummary: inputPatchSummary.label,
    inputPatchDetails: inputPatchSuggestions.map((suggestion) => ({
      id: suggestion.id,
      label: suggestion.label,
      field: suggestion.field,
      status: suggestion.status,
      currentValue: suggestion.currentValue,
      recommendedValue: suggestion.recommendedValue,
      basis: suggestion.basis,
      detail: suggestion.detail
    }))
  };
}
function buildSudoFtxReport() {
  const items = buildSudoProgressItems();
  const latestAnalysis = readLatestSudoAnalysisResultCommand();
  const analysisLog = readLatestSudoAnalysisLogItems();
  const redeployment = readLatestSudoDroneRedeploymentCommand();
  const summary = buildSudoProgressSummary(items);
  return {
    generatedAt: (/* @__PURE__ */ new Date()).toISOString(),
    summary,
    latestAnalysis,
    analysisLog,
    redeployment,
    scenarios: items.map(
      ({ scenario, status, required, statusReason, nextAction }) => {
        const state = readScenarioState(scenario.id);
        const analysisDetectionFields = buildDetectionReportFields(
          state?.analysis?.detections
        );
        const detectorDetectionFields = buildDetectionReportFields(
          state?.detectorResult?.detections
        );
        const decisionInputs = normalizeDecisionInputs(state?.decisionInputs);
        const decisionOutput = getSudoDecisionOutput(
          scenario.id,
          decisionInputs,
          buildDecisionPerceptionInput(state)
        );
        const sudoData = buildSudoDataReportSource(scenario.id, decisionInputs);
        return {
          id: scenario.id,
          title: scenario.title,
          implementationLevel: scenario.implementationLevel,
          required,
          status,
          statusReason,
          nextAction,
          updatedAt: state?.updatedAt,
          decision: decisionOutput?.summary ?? scenario.decision,
          decisionEvidence: buildDecisionEvidence(decisionOutput),
          sudoData,
          decisionInputs: {
            targetLabel: decisionInputs.targetLabel,
            scaleSummary: summarizeScaleInputs(decisionInputs),
            forestPercent: decisionInputs.forestPercent,
            openTerrainPercent: decisionInputs.openTerrainPercent,
            desiredDamagePercent: decisionInputs.desiredDamagePercent,
            collateralSummary: summarizeCollateralMunitions(
              decisionInputs.collateralMunitions
            ),
            orderCandidateSummary: summarizeOrderCandidates(
              decisionInputs.orderCandidates
            ),
            routeOptionSummary: summarizeRouteOptions(
              decisionInputs.routeOptions
            ),
            droneRedeploymentSummary: summarizeDroneRedeploymentOrders(
              decisionInputs.droneRedeploymentOrders
            ),
            strikeAssetSummary: summarizeStrikeAssets(
              decisionInputs.strikeAssets
            ),
            fireControlPointSummary: summarizeFireControlPoints(
              decisionInputs.fireControlPoints
            ),
            fireUnitSummary: summarizeFireUnits(decisionInputs.fireUnits)
          },
          operatorReview: state?.operatorReview ? {
            status: state.operatorReview.status,
            statusLabel: getOperatorReviewStatusLabel(
              state.operatorReview.status
            ),
            label: state.operatorReview.label,
            originalLabel: state.operatorReview.originalLabel,
            overrideLabel: state.operatorReview.overrideLabel,
            note: state.operatorReview.note,
            updatedAt: state.operatorReview.updatedAt
          } : void 0,
          analysis: state?.analysis ? {
            label: state.analysis.label,
            confidence: state.analysis.confidence,
            source: state.analysis.source,
            model: state.analysis.model,
            frameCount: state.analysis.frameCount,
            ...analysisDetectionFields,
            summary: state.analysis.summary
          } : void 0,
          detector: state?.detectorResult ? {
            source: state.detectorResult.source,
            model: state.detectorResult.model,
            endpoint: state.detectorResult.endpoint,
            ...detectorDetectionFields,
            health: state.detectorHealth ? {
              source: state.detectorHealth.source,
              endpoint: state.detectorHealth.endpoint,
              adapterReachable: state.detectorHealth.adapterReachable,
              modelReady: state.detectorHealth.modelReady,
              cameraReachable: state.detectorHealth.cameraReachable,
              mode: state.detectorHealth.mode,
              model: state.detectorHealth.model,
              diagnostic: state.detectorHealth.diagnostic,
              modelDiagnostic: state.detectorHealth.modelDiagnostic,
              cameraDiagnostic: state.detectorHealth.cameraDiagnostic,
              elapsedMs: state.detectorHealth.elapsedMs
            } : void 0
          } : void 0,
          ollama: state?.ollamaHealth ? {
            endpoint: state.ollamaHealth.endpoint,
            model: state.ollamaHealth.model,
            reachable: state.ollamaHealth.reachable,
            modelReady: state.ollamaHealth.modelReady,
            message: state.ollamaHealth.message,
            elapsedMs: state.ollamaHealth.elapsedMs
          } : void 0,
          assistant: state?.assistantQuestion || state?.assistantReply ? {
            question: state.assistantQuestion ?? "",
            reply: state.assistantReply ?? ""
          } : void 0
        };
      }
    )
  };
}
function quoteCsvCell(value) {
  return `"${value.replace(/"/g, '""')}"`;
}
function boolStatus(value) {
  if (value === void 0) {
    return "unknown";
  }
  return value ? "true" : "false";
}
function summarizeScaleInputs(inputs) {
  return `${inputs.marchRoute} ${inputs.observedVehicleCount}\uB300 / ${inputs.marchColumnLengthM}m`;
}
function summarizeFireUnits(fireUnits2) {
  return fireUnits2.map(
    (unit) => `${unit.unit} ${unit.distanceKm}/${unit.maxRangeKm}km \uD0C4${unit.ammo} CSR${unit.csr} ${unit.status}`
  ).join(" | ");
}
function summarizeCollateralMunitions(collateralMunitions) {
  return collateralMunitions.map((munition) => `${munition.munition} ${munition.radiusM}m`).join(" | ");
}
function summarizeOrderCandidates(orderCandidates2) {
  return orderCandidates2.map(
    (candidate) => `${candidate.unit} ${candidate.weapon} ${candidate.distanceKm}km ${candidate.guns}\uBB38 \uBC29\uD5A5${candidate.directionMatchPercent}%`
  ).join(" | ");
}
function summarizeRouteOptions(routeOptions2) {
  return routeOptions2.map(
    (option) => `${option.option} ${option.route} \uAC10\uC2DC${option.coverage}% \uACF5\uBC31${option.gap}% \uD654\uB825${option.fireLinkScore}%`
  ).join(" | ");
}
function summarizeDroneRedeploymentOrders(orders) {
  return orders.map(
    (order) => `${order.droneId} ${order.destinationType} ${order.destinationName} ${order.coordinate} ${order.status} ${order.progressPercent}%`
  ).join(" | ");
}
function summarizeStrikeAssets(strikeAssets2) {
  return strikeAssets2.map(
    (asset) => `${asset.asset} ${asset.availableFrom}~${asset.availableTo} ${asset.score}\uC810`
  ).join(" | ");
}
function summarizeFireControlPoints(fireControlPoints2) {
  return `${fireControlPoints2.nai} / ${fireControlPoints2.dp} / ${fireControlPoints2.tai}`;
}
function summarizeDecisionMetrics(output) {
  return output?.metrics.map((metric) => `${metric.label}: ${metric.value}`).join(" | ") ?? "";
}
function summarizeDecisionSteps(output) {
  return output?.steps.map((step, index) => `${index + 1}. ${step}`).join(" | ") ?? "";
}
function summarizeDecisionTable(output) {
  if (!output?.table) {
    return "";
  }
  return output.table.rows.map(
    (row) => output.table?.columns.map((column) => row[column.key] ?? "").join(" / ")
  ).join(" | ");
}
function summarizeSudoDataBindings(sudoData) {
  return sudoData.bindingDetails.map((detail) => `[${detail.status}] ${detail.label}: ${detail.detail}`).join(" | ");
}
function summarizeSudoDataPatches(sudoData) {
  return sudoData.inputPatchDetails.map(
    (detail) => `[${detail.status}] ${detail.label}: ${detail.recommendedValue}`
  ).join(" | ");
}
function summarizeSudoDataEvidence(sudoData) {
  return summarizeReportList(
    [
      ...sudoData.dataPoints.slice(0, 3).map(formatSudoSourceDisplayLabel),
      ...sudoData.gisHighlights.slice(0, 2).map(formatSudoSourceDisplayLabel)
    ],
    4
  );
}
function buildDecisionEvidence(output) {
  if (!output) {
    return void 0;
  }
  return {
    title: output.title,
    summary: output.summary,
    metrics: output.metrics.map((metric) => ({
      label: metric.label,
      value: metric.value,
      tone: metric.tone
    })),
    steps: [...output.steps],
    table: output.table ? {
      title: output.table.title,
      columns: output.table.columns.map((column) => ({
        key: column.key,
        label: column.label
      })),
      rows: output.table.rows.map((row) => ({ ...row }))
    } : void 0,
    sourceTables: output.sourceTables?.map((table) => ({
      title: table.title,
      columns: table.columns.map((column) => ({
        key: column.key,
        label: column.label
      })),
      rows: table.rows.map((row) => ({ ...row }))
    }))
  };
}
function buildSudoFtxReportCsv() {
  const report = buildSudoFtxReport();
  const rows = [
    ["\uAD6C\uBD84", "\uD56D\uBAA9", "\uAC12"],
    ["\uBCF4\uACE0\uC11C", "\uC0DD\uC131\uC2DC\uAC01", report.generatedAt],
    ["\uC694\uC57D", "\uC804\uCCB4", String(report.summary.total)],
    ["\uC694\uC57D", "\uC644\uB8CC", String(report.summary.done)],
    ["\uC694\uC57D", "\uD544\uC218\uC804\uCCB4", String(report.summary.requiredTotal)],
    ["\uC694\uC57D", "\uD544\uC218\uC644\uB8CC", String(report.summary.requiredDone)],
    ["\uC694\uC57D", "\uD544\uC218READY", String(report.summary.requiredReady)],
    ["\uC694\uC57D", "\uD544\uC218WAIT", String(report.summary.requiredWaiting)],
    [
      "\uC694\uC57D",
      "\uB2E4\uC74C\uD544\uC218",
      report.summary.nextRequiredScenario ? `S${report.summary.nextRequiredScenario.id} ${report.summary.nextRequiredScenario.title}` : "\uC644\uB8CC"
    ],
    [],
    ["\uBD84\uC11D\uC0C1\uD0DC", "\uC2DC\uB098\uB9AC\uC624", "\uB2E8\uACC4", "\uC9C4\uD589\uB960", "\uBA54\uC2DC\uC9C0", "\uC218\uC2E0\uC2DC\uAC01"],
    ...report.analysisLog.map((item) => [
      "\uBD84\uC11D\uC0C1\uD0DC",
      `S${item.scenarioId}`,
      item.stage,
      String(item.progressPercent),
      item.message,
      new Date(item.issuedAt).toISOString()
    ]),
    [],
    [
      "\uC2DC\uB098\uB9AC\uC624",
      "\uC81C\uBAA9",
      "\uAD6C\uD604\uB808\uBCA8",
      "\uD544\uC218",
      "\uC0C1\uD0DC",
      "\uC0C1\uD0DC\uADFC\uAC70",
      "\uB2E4\uC74C\uC870\uCE58",
      "\uC218\uC815\uC2DC\uAC01",
      "\uCD5C\uC885\uD310\uC815",
      "\uD310\uB2E8\uC0B0\uCD9C",
      "\uD310\uB2E8\uBA54\uD2B8\uB9AD",
      "\uD310\uB2E8\uB2E8\uACC4",
      "\uD310\uB2E8\uADFC\uAC70\uD45C",
      "sudo_data \uC6D0\uC790\uB8CC",
      "sudo_data \uD30C\uC77C",
      "sudo_data \uACC4\uC0B0\uC5F0\uACB0",
      "sudo_data \uACC4\uC0B0\uC138\uBD80",
      "sudo_data \uC785\uB825\uD328\uCE58",
      "sudo_data \uC785\uB825\uD328\uCE58\uC138\uBD80",
      "sudo_data \uCD94\uCD9C\uC0C1\uD0DC",
      "sudo_data \uCD94\uCD9C\uC5ED\uD560",
      "sudo_data \uCD94\uCD9C\uC774\uC288",
      "sudo_data \uACE0\uB3C4\uD654",
      "\uC785\uB825\uD45C\uC801",
      "\uADDC\uBAA8\uD310\uB2E8\uC785\uB825",
      "\uC0B0\uB9BC",
      "\uAC1C\uD65C\uC9C0",
      "\uC694\uB9DD\uD53C\uD574\uC728",
      "\uC804\uD22C\uC11C\uC5F4\uC785\uB825",
      "\uC0AC\uD0DC\uBD84\uC11D\uB3C4\uC785\uB825",
      "\uB4DC\uB860\uC7AC\uBC30\uCE58\uC785\uB825",
      "\uD0C0\uACA9\uC790\uC0B0\uC785\uB825",
      "\uD1B5\uD569\uD654\uB825\uC9C0\uC810",
      "\uBD80\uC218\uD53C\uD574\uC785\uB825",
      "\uC0AC\uACA9\uBD80\uB300\uC785\uB825",
      "\uC6B4\uC601\uC790\uD655\uC815",
      "\uD655\uC815\uB77C\uBCA8",
      "\uC6D0AI\uB77C\uBCA8",
      "\uBCF4\uC815\uB77C\uBCA8",
      "\uD655\uC815\uBA54\uBAA8",
      "\uBD84\uC11D\uB77C\uBCA8",
      "\uBD84\uC11Dbbox",
      "\uBD84\uC11Dtrack",
      "Detector",
      "Detector bbox",
      "Detector track",
      "Adapter",
      "Model",
      "Camera",
      "Ollama",
      "\uC9C4\uB2E8",
      "AI\uC9C8\uBB38",
      "AI\uB2F5\uBCC0"
    ]
  ];
  report.scenarios.forEach((scenario) => {
    rows.push([
      `S${scenario.id}`,
      scenario.title,
      scenario.implementationLevel,
      scenario.required ? "Y" : "N",
      scenario.status,
      scenario.statusReason,
      scenario.nextAction,
      scenario.updatedAt ?? "",
      scenario.decision ?? "",
      scenario.decisionEvidence?.title ?? "",
      summarizeDecisionMetrics(scenario.decisionEvidence),
      summarizeDecisionSteps(scenario.decisionEvidence),
      summarizeDecisionTable(scenario.decisionEvidence),
      summarizeSudoSourceDisplayValues(scenario.sudoData.sourceRefs, 99, " | "),
      summarizeSudoSourceDisplayValues(
        scenario.sudoData.sourceFiles,
        99,
        " | "
      ),
      scenario.sudoData.bindingSummary,
      summarizeSudoDataBindings(scenario.sudoData),
      scenario.sudoData.inputPatchSummary,
      summarizeSudoDataPatches(scenario.sudoData),
      scenario.sudoData.extractionHealthSummary,
      scenario.sudoData.extractionRoleSummary,
      scenario.sudoData.extractionIssueSummary,
      scenario.sudoData.enhancementIdeaSummary,
      scenario.decisionInputs?.targetLabel ?? "",
      scenario.decisionInputs?.scaleSummary ?? "",
      String(scenario.decisionInputs?.forestPercent ?? ""),
      String(scenario.decisionInputs?.openTerrainPercent ?? ""),
      String(scenario.decisionInputs?.desiredDamagePercent ?? ""),
      scenario.decisionInputs?.orderCandidateSummary ?? "",
      scenario.decisionInputs?.routeOptionSummary ?? "",
      scenario.decisionInputs?.droneRedeploymentSummary ?? "",
      scenario.decisionInputs?.strikeAssetSummary ?? "",
      scenario.decisionInputs?.fireControlPointSummary ?? "",
      scenario.decisionInputs?.collateralSummary ?? "",
      scenario.decisionInputs?.fireUnitSummary ?? "",
      scenario.operatorReview?.statusLabel ?? "",
      scenario.operatorReview?.label ?? "",
      scenario.operatorReview?.originalLabel ?? "",
      scenario.operatorReview?.overrideLabel ?? "",
      scenario.operatorReview?.note ?? "",
      scenario.analysis?.label ?? "",
      String(scenario.analysis?.bboxCount ?? 0),
      scenario.analysis?.trackIds?.join(" | ") ?? "",
      scenario.detector?.model ?? scenario.detector?.source ?? "",
      String(scenario.detector?.bboxCount ?? 0),
      scenario.detector?.trackIds?.join(" | ") ?? "",
      boolStatus(scenario.detector?.health?.adapterReachable),
      boolStatus(scenario.detector?.health?.modelReady),
      boolStatus(scenario.detector?.health?.cameraReachable),
      boolStatus(scenario.ollama?.modelReady),
      scenario.detector?.health?.diagnostic ?? "",
      scenario.assistant?.question ?? "",
      scenario.assistant?.reply ?? ""
    ]);
  });
  return rows.map(
    (row) => row.map((cell) => quoteCsvCell(formatSudoSourceDisplayLabel(String(cell)))).join(",")
  ).join("\n");
}
function escapeMarkdownTableCell(value) {
  return formatSudoSourceDisplayLabel(String(value ?? "")).replace(/\|/g, "\\|").replace(/\r?\n/g, " ").trim();
}
function formatMarkdownPercent(value) {
  return typeof value === "number" && Number.isFinite(value) ? `${Math.round(value * 1e3) / 10}%` : "";
}
function formatMarkdownNextRequired(nextRequiredScenario) {
  if (!nextRequiredScenario) {
    return "\uC644\uB8CC";
  }
  return `S${nextRequiredScenario.id} ${nextRequiredScenario.title} (${getSudoProgressStatusLabel(nextRequiredScenario.status)})`;
}
function markdownTable(headers, rows) {
  return [
    `| ${headers.map(escapeMarkdownTableCell).join(" | ")} |`,
    `| ${headers.map(() => "---").join(" | ")} |`,
    ...rows.map((row) => `| ${row.map(escapeMarkdownTableCell).join(" | ")} |`)
  ].join("\n");
}
function buildSudoFtxReportMarkdown() {
  const report = buildSudoFtxReport();
  const latest = report.latestAnalysis;
  const lines = [
    "# KAIROS \uD1B5\uD569\uD654\uB825\uC6B4\uC6A9 \uBCF4\uACE0",
    "",
    `- \uC0DD\uC131\uC2DC\uAC01: ${report.generatedAt}`,
    `- \uC804\uCCB4 \uC9C4\uD589: ${report.summary.done}/${report.summary.total}`,
    `- \uD544\uC218 \uC9C4\uD589: ${report.summary.requiredDone}/${report.summary.requiredTotal}`,
    `- \uD544\uC218 READY/WAIT: ${report.summary.requiredReady}/${report.summary.requiredWaiting}`,
    `- \uB2E4\uC74C \uD544\uC218: ${formatMarkdownNextRequired(report.summary.nextRequiredScenario)}`,
    "",
    "## \uCD5C\uC2E0 AI \uBD84\uC11D"
  ];
  if (latest) {
    lines.push(
      `- \uC2DC\uB098\uB9AC\uC624: S${latest.scenarioId} ${latest.title}`,
      `- \uD45C\uC801\uD310\uC815: ${latest.label} (${formatMarkdownPercent(latest.confidence)})`,
      `- \uBAA8\uB378/\uC18C\uC2A4: ${latest.model} / ${latest.source} / ${latest.inputKind}`,
      `- \uD504\uB808\uC784/BBOX: ${latest.frameCount} / ${latest.bboxCount}`,
      `- \uC694\uC57D: ${latest.summary}`
    );
  } else {
    lines.push("- \uCD5C\uC2E0 \uBD84\uC11D\uACB0\uACFC \uC5C6\uC74C");
  }
  lines.push(
    "",
    "## \uC2DC\uB098\uB9AC\uC624 \uD310\uB2E8\uD45C",
    markdownTable(
      [
        "S",
        "\uC81C\uBAA9",
        "\uD544\uC218",
        "\uC0C1\uD0DC",
        "\uC0C1\uD0DC\uADFC\uAC70",
        "\uB2E4\uC74C\uC870\uCE58",
        "\uCD5C\uC885\uD310\uC815",
        "\uC6B4\uC601\uC790",
        "\uBD84\uC11D",
        "BBOX",
        "TRACK",
        "Detector",
        "Ollama",
        "AI\uC9C8\uBB38",
        "\uC9C4\uB2E8"
      ],
      report.scenarios.map((scenario) => [
        `S${scenario.id}`,
        scenario.title,
        scenario.required ? "Y" : "N",
        getSudoProgressStatusLabel(scenario.status),
        scenario.statusReason,
        scenario.nextAction,
        scenario.decision ?? "",
        [
          scenario.operatorReview?.statusLabel ?? "",
          scenario.operatorReview?.overrideLabel ?? scenario.operatorReview?.label ?? ""
        ].filter(Boolean).join(" "),
        scenario.analysis?.label ?? "",
        scenario.analysis?.bboxCount ?? 0,
        scenario.analysis?.trackIds?.join(" / ") ?? "",
        scenario.detector?.model ?? scenario.detector?.source ?? "",
        scenario.ollama?.modelReady === void 0 ? "" : scenario.ollama.modelReady ? "READY" : "CHECK",
        scenario.assistant?.question ?? "",
        scenario.detector?.health?.diagnostic ?? ""
      ])
    )
  );
  lines.push(
    "",
    "## sudo_data \uC6D0\uC790\uB8CC \uC5F0\uACB0",
    markdownTable(
      [
        "S",
        "\uC6D0\uC790\uB8CC",
        "\uC2E4\uC81C\uD30C\uC77C",
        "\uACC4\uC0B0\uC5F0\uACB0",
        "\uC785\uB825\uD328\uCE58",
        "\uCD94\uCD9C\uC0C1\uD0DC",
        "\uACE0\uB3C4\uD654",
        "\uD310\uB2E8\uADFC\uAC70"
      ],
      report.scenarios.map((scenario) => [
        `S${scenario.id}`,
        summarizeSudoSourceDisplayValues(scenario.sudoData.sourceRefs),
        summarizeSudoSourceDisplayValues(scenario.sudoData.sourceFiles),
        scenario.sudoData.bindingSummary,
        scenario.sudoData.inputPatchSummary,
        scenario.sudoData.extractionHealthSummary,
        scenario.sudoData.enhancementIdeaSummary,
        summarizeSudoDataEvidence(scenario.sudoData)
      ])
    )
  );
  const decisionEvidenceScenarios = report.scenarios.filter(
    (scenario) => scenario.decisionEvidence
  );
  if (decisionEvidenceScenarios.length > 0) {
    lines.push(
      "",
      "## \uD310\uB2E8\uADFC\uAC70 \uC0C1\uC138",
      markdownTable(
        ["S", "\uC0B0\uCD9C", "\uBA54\uD2B8\uB9AD", "\uB2E8\uACC4", "\uADFC\uAC70\uD45C"],
        decisionEvidenceScenarios.map((scenario) => [
          `S${scenario.id}`,
          scenario.decisionEvidence?.title ?? "",
          summarizeDecisionMetrics(scenario.decisionEvidence),
          summarizeDecisionSteps(scenario.decisionEvidence),
          summarizeDecisionTable(scenario.decisionEvidence)
        ])
      )
    );
  }
  const assistantScenarios = report.scenarios.filter(
    (scenario) => scenario.assistant?.question || scenario.assistant?.reply
  );
  if (assistantScenarios.length > 0) {
    lines.push(
      "",
      "## AI \uC5B4\uC2DC\uC2A4\uD134\uD2B8 \uAE30\uB85D",
      markdownTable(
        ["S", "\uC9C8\uBB38", "\uB2F5\uBCC0"],
        assistantScenarios.map((scenario) => [
          `S${scenario.id}`,
          scenario.assistant?.question ?? "",
          scenario.assistant?.reply ?? ""
        ])
      )
    );
  }
  if (report.analysisLog.length > 0) {
    lines.push(
      "",
      "## \uBD84\uC11D \uC0C1\uD0DC \uB85C\uADF8",
      markdownTable(
        ["\uC218\uC2E0", "S", "\uB2E8\uACC4", "\uC9C4\uD589", "\uBA54\uC2DC\uC9C0"],
        report.analysisLog.map((item) => [
          new Date(item.issuedAt).toISOString(),
          `S${item.scenarioId}`,
          item.stage,
          `${item.progressPercent}%`,
          item.message
        ])
      )
    );
  }
  if (report.redeployment) {
    lines.push(
      "",
      "## \uB4DC\uB860 \uC7AC\uBC30\uCE58",
      `- ${report.redeployment.summary}`,
      markdownTable(
        ["\uB4DC\uB860", "\uBAA9\uC801", "\uC88C\uD45C", "\uC0C1\uD0DC", "\uC9C4\uD589"],
        report.redeployment.orders.map((order) => [
          order.droneId,
          `${order.destinationType} ${order.destinationName}`,
          order.coordinate,
          order.status,
          `${order.progressPercent}%`
        ])
      )
    );
  }
  return `${lines.join("\n")}
`;
}

// js/vendor/kairos/src/gui/sudo/sudoPerceptionComparison.ts
function formatPercent(value) {
  if (value === void 0 || !Number.isFinite(value)) {
    return "-";
  }
  return `${Math.round(value * 1e3) / 10}%`;
}
function averageConfidence(detections) {
  if (detections.length === 0) {
    return void 0;
  }
  return detections.reduce((total, detection) => total + detection.confidence, 0) / detections.length;
}
function getDominantDetectionLabel(detections) {
  if (detections.length === 0) {
    return void 0;
  }
  const counts = /* @__PURE__ */ new Map();
  detections.forEach((detection) => {
    const key = canonicalizeTargetLabel(detection.label);
    const current = counts.get(key) ?? {
      label: detection.label,
      count: 0,
      score: 0
    };
    current.count += 1;
    current.score += detection.confidence;
    counts.set(key, current);
  });
  return [...counts.values()].sort(
    (left, right) => right.count - left.count || right.score - left.score || left.label.localeCompare(right.label)
  )[0]?.label;
}
function normalizeLabelText2(label) {
  return label.toLowerCase().replace(/[\s_\-()[\].]/g, "").trim();
}
function canonicalizeTargetLabel(label) {
  const normalized = normalizeLabelText2(label);
  if (normalized.includes("240") || normalized.includes("m1991") || normalized.includes("tel") || normalized.includes("launcher") || normalized.includes("\uBC29\uC0AC\uD3EC")) {
    return "240mm\uBC29\uC0AC\uD3EC";
  }
  if (normalized.includes("tank") || normalized.includes("\uC804\uCC28") || normalized.includes("mbt")) {
    return "\uC804\uCC28";
  }
  if (normalized.includes("ammo") || normalized.includes("truck") || normalized.includes("\uCC28\uB7C9") || normalized.includes("\uD0C4\uC57D")) {
    return "\uC9C0\uC6D0\uCC28\uB7C9";
  }
  if (normalized.includes("tube") || normalized.includes("\uBC1C\uC0AC\uAD00")) {
    return "\uBC1C\uC0AC\uAD00";
  }
  return normalized;
}
function labelsMatch(vlmLabel, detectorLabel) {
  if (!detectorLabel) {
    return false;
  }
  return canonicalizeTargetLabel(vlmLabel) === canonicalizeTargetLabel(detectorLabel);
}
function buildSudoPerceptionComparison(analysis, detectorResult) {
  const detectorLabel = getDominantDetectionLabel(detectorResult.detections);
  const detectorConfidence = averageConfidence(detectorResult.detections);
  const confidenceGap = detectorConfidence === void 0 ? void 0 : Math.abs(analysis.confidence - detectorConfidence);
  const bboxDelta = Math.abs(
    analysis.detections.length - detectorResult.detections.length
  );
  const frameDelta = Math.abs(analysis.frameCount - detectorResult.frameCount);
  const labelMatched = labelsMatch(analysis.label, detectorLabel);
  const reviewItems = buildReviewItems(
    analysis,
    detectorResult,
    detectorLabel,
    labelMatched,
    detectorConfidence,
    confidenceGap,
    bboxDelta,
    frameDelta
  );
  if (detectorResult.source === "error") {
    return {
      statusLabel: "Detector \uC624\uB958",
      tone: "red",
      summary: detectorResult.diagnostic ?? "Detector \uACB0\uACFC\uAC00 \uC624\uB958 \uC0C1\uD0DC\uB77C VLM \uD310\uB2E8\uC744 \uC6B0\uC120 \uD45C\uC2DC\uD569\uB2C8\uB2E4.",
      vlmLabel: analysis.label,
      detectorLabel,
      labelMatched: false,
      vlmConfidencePercent: formatPercent(analysis.confidence),
      detectorConfidencePercent: formatPercent(detectorConfidence),
      confidenceGapPercent: formatPercent(confidenceGap),
      bboxDelta,
      frameDelta,
      reviewItems,
      metrics: buildComparisonMetrics(
        analysis,
        detectorResult,
        detectorConfidence,
        confidenceGap,
        bboxDelta,
        frameDelta
      )
    };
  }
  if (!detectorLabel) {
    return {
      statusLabel: "Detector \uB300\uAE30",
      tone: "blue",
      summary: "Detector bbox\uAC00 \uC5C6\uC5B4 Gemma VLM \uD310\uB2E8\uACFC \uB0B4\uC7A5 \uC2DC\uB098\uB9AC\uC624 \uADFC\uAC70\uB97C \uC6B0\uC120 \uC0AC\uC6A9\uD569\uB2C8\uB2E4.",
      vlmLabel: analysis.label,
      detectorLabel,
      labelMatched: false,
      vlmConfidencePercent: formatPercent(analysis.confidence),
      detectorConfidencePercent: formatPercent(detectorConfidence),
      confidenceGapPercent: formatPercent(confidenceGap),
      bboxDelta,
      frameDelta,
      reviewItems,
      metrics: buildComparisonMetrics(
        analysis,
        detectorResult,
        detectorConfidence,
        confidenceGap,
        bboxDelta,
        frameDelta
      )
    };
  }
  const tone = labelMatched ? "green" : "amber";
  return {
    statusLabel: labelMatched ? "\uAD50\uCC28\uAC80\uC99D \uC77C\uCE58" : "\uAD50\uCC28\uAC80\uC99D \uAC80\uD1A0",
    tone,
    summary: labelMatched ? `${analysis.label} \uD310\uB2E8\uACFC Detector \uC8FC \uB77C\uBCA8 ${detectorLabel}\uAC00 \uAC19\uC740 \uD45C\uC801\uAD70\uC73C\uB85C \uB9E4\uCE6D\uB429\uB2C8\uB2E4.` : `${analysis.label} \uD310\uB2E8\uACFC Detector \uC8FC \uB77C\uBCA8 ${detectorLabel}\uAC00 \uB2EC\uB77C \uCD94\uAC00 \uD655\uC778\uC774 \uD544\uC694\uD569\uB2C8\uB2E4.`,
    vlmLabel: analysis.label,
    detectorLabel,
    labelMatched,
    vlmConfidencePercent: formatPercent(analysis.confidence),
    detectorConfidencePercent: formatPercent(detectorConfidence),
    confidenceGapPercent: formatPercent(confidenceGap),
    bboxDelta,
    frameDelta,
    reviewItems,
    metrics: buildComparisonMetrics(
      analysis,
      detectorResult,
      detectorConfidence,
      confidenceGap,
      bboxDelta,
      frameDelta
    )
  };
}
function buildReviewItems(analysis, detectorResult, detectorLabel, labelMatched, detectorConfidence, confidenceGap, bboxDelta, frameDelta) {
  const items = [];
  if (detectorResult.source === "error") {
    items.push({
      label: "Detector \uC624\uB958",
      value: "\uD655\uC778\uD544\uC694",
      detail: detectorResult.diagnostic ?? "Detector adapter, endpoint, \uC601\uC0C1 \uC785\uB825 \uC0C1\uD0DC\uB97C \uD655\uC778\uD558\uC138\uC694.",
      tone: "red"
    });
  } else if (!detectorLabel) {
    items.push({
      label: "Detector bbox",
      value: "\uBBF8\uC218\uC2E0",
      detail: "Detector bbox\uAC00 \uC5C6\uC5B4 VLM \uD310\uB2E8\uB9CC\uC73C\uB85C \uC0B0\uCD9C \uC911\uC785\uB2C8\uB2E4. adapter \uC0C1\uD0DC\uC640 \uC785\uB825 \uD504\uB808\uC784\uC744 \uD655\uC778\uD558\uC138\uC694.",
      tone: "blue"
    });
  }
  if (detectorLabel && !labelMatched) {
    items.push({
      label: "\uB77C\uBCA8 \uBD88\uC77C\uCE58",
      value: `${analysis.label} \u2194 ${detectorLabel}`,
      detail: "VLM \uD45C\uC801\uC131\uC9C8\uACFC Detector \uC8FC \uB77C\uBCA8\uC774 \uB2E4\uB978 \uD45C\uC801\uAD70\uC785\uB2C8\uB2E4. \uD504\uB808\uC784 \uC120\uD0DD\uACFC bbox \uB77C\uBCA8\uC744 \uC7AC\uD655\uC778\uD558\uC138\uC694.",
      tone: "amber"
    });
  }
  if (confidenceGap !== void 0 && confidenceGap > 0.15) {
    items.push({
      label: "\uC2E0\uB8B0\uB3C4 \uD3B8\uCC28",
      value: formatPercent(confidenceGap),
      detail: `VLM ${formatPercent(analysis.confidence)}\uC640 Detector \uD3C9\uADE0 ${formatPercent(detectorConfidence)} \uC0AC\uC774 \uD3B8\uCC28\uAC00 \uD07D\uB2C8\uB2E4.`,
      tone: "amber"
    });
  }
  if (bboxDelta > 1) {
    items.push({
      label: "BBOX \uC218 \uCC28\uC774",
      value: `${bboxDelta}\uAC74`,
      detail: "VLM/Detector \uC0B0\uCD9C bbox \uC218 \uCC28\uC774\uAC00 \uD07D\uB2C8\uB2E4. \uC7A5\uBE44 \uBCF8\uCCB4\uC640 \uC138\uBD80 \uBD80\uD488 bbox\uAC00 \uC11E\uC600\uB294\uC9C0 \uD655\uC778\uD558\uC138\uC694.",
      tone: "amber"
    });
  }
  if (frameDelta > 1) {
    items.push({
      label: "\uD504\uB808\uC784 \uC218 \uCC28\uC774",
      value: `${frameDelta}`,
      detail: "VLM\uACFC Detector\uAC00 \uC11C\uB85C \uB2E4\uB978 \uD504\uB808\uC784 \uC218\uB97C \uAE30\uC900\uC73C\uB85C \uD310\uB2E8\uD588\uC2B5\uB2C8\uB2E4. \uC601\uC0C1 \uD504\uB808\uC784 \uC694\uCCAD \uC218\uC640 adapter \uCC98\uB9AC \uD504\uB808\uC784\uC744 \uD655\uC778\uD558\uC138\uC694.",
      tone: "amber"
    });
  }
  return items;
}
function buildComparisonMetrics(analysis, detectorResult, detectorConfidence, confidenceGap, bboxDelta, frameDelta) {
  return [
    {
      label: "VLM",
      value: `${analysis.label} \xB7 ${formatPercent(analysis.confidence)}`,
      tone: "blue"
    },
    {
      label: "Detector",
      value: detectorResult.detections.length > 0 ? `${detectorResult.detections.length} bbox \xB7 ${formatPercent(detectorConfidence)}` : detectorResult.source === "error" ? "\uC624\uB958" : "\uB300\uAE30",
      tone: detectorResult.source === "error" ? "red" : detectorResult.detections.length > 0 ? "green" : "blue"
    },
    {
      label: "\uC2E0\uB8B0\uB3C4\uCC28",
      value: confidenceGap === void 0 ? "-" : formatPercent(confidenceGap),
      tone: confidenceGap === void 0 ? "blue" : confidenceGap <= 0.15 ? "green" : "amber"
    },
    {
      label: "BBOX\uCC28",
      value: `${bboxDelta}\uAC74`,
      tone: bboxDelta <= 1 ? "green" : "amber"
    },
    {
      label: "\uD504\uB808\uC784\uCC28",
      value: `${frameDelta}`,
      tone: frameDelta <= 1 ? "green" : "amber"
    }
  ];
}

// js/vendor/kairos/src/gui/sudo/sudoRealtimeDetections.ts
var sudoDroneLauncherDetectionTracks = [
  {
    label: "M-1991 240mm TEL",
    color: "#ffb547",
    confidence: 0.998,
    keyframes: [
      { timeRatio: 0, x: 36.5, y: 27.5, width: 40.5, height: 36.5 },
      { timeRatio: 0.24, x: 38.2, y: 25.8, width: 39.5, height: 35.2 },
      { timeRatio: 0.5, x: 40.4, y: 24.8, width: 38.2, height: 34.4 },
      { timeRatio: 0.76, x: 38.8, y: 26.4, width: 39.4, height: 35.4 },
      { timeRatio: 1, x: 36.5, y: 27.5, width: 40.5, height: 36.5 }
    ]
  },
  {
    label: "\uBC1C\uC0AC\uAD00 22\uC5F0\uC7A5",
    color: "#38d7ff",
    confidence: 0.941,
    keyframes: [
      { timeRatio: 0, x: 55.4, y: 27.2, width: 25.8, height: 15.8 },
      { timeRatio: 0.24, x: 56.2, y: 25.8, width: 25.4, height: 15.4 },
      { timeRatio: 0.5, x: 57.6, y: 25, width: 24.6, height: 15 },
      { timeRatio: 0.76, x: 56.4, y: 26, width: 25.2, height: 15.5 },
      { timeRatio: 1, x: 55.4, y: 27.2, width: 25.8, height: 15.8 }
    ]
  },
  {
    label: "\uCC28\uB7C9 \uCC28\uCCB4",
    color: "#67f29b",
    confidence: 0.918,
    keyframes: [
      { timeRatio: 0, x: 36.8, y: 43.4, width: 38.2, height: 20.2 },
      { timeRatio: 0.24, x: 38.5, y: 41.6, width: 37.4, height: 19.8 },
      { timeRatio: 0.5, x: 40.6, y: 40.8, width: 36.2, height: 19.4 },
      { timeRatio: 0.76, x: 39.2, y: 42.2, width: 37.2, height: 19.8 },
      { timeRatio: 1, x: 36.8, y: 43.4, width: 38.2, height: 20.2 }
    ]
  }
];
function clampPercent(value) {
  return Math.max(0, Math.min(100, value));
}
function lerp(start, end, ratio) {
  return start + (end - start) * ratio;
}
function normalizePlaybackRatio(currentTime, duration) {
  const fallbackDuration = 12;
  const safeDuration = Number.isFinite(duration) && duration > 0.05 ? duration : fallbackDuration;
  const wrappedTime = ((Number.isFinite(currentTime) ? currentTime : 0) % safeDuration + safeDuration) % safeDuration;
  return wrappedTime / safeDuration;
}
function interpolateKeyframe(start, end, ratio) {
  return {
    timeRatio: lerp(start.timeRatio, end.timeRatio, ratio),
    x: lerp(start.x, end.x, ratio),
    y: lerp(start.y, end.y, ratio),
    width: lerp(start.width, end.width, ratio),
    height: lerp(start.height, end.height, ratio),
    confidence: start.confidence !== void 0 || end.confidence !== void 0 ? lerp(start.confidence ?? 0, end.confidence ?? 0, ratio) : void 0
  };
}
function interpolateSudoDetectionTrack(track, playbackRatio) {
  if (track.keyframes.length === 0) {
    return void 0;
  }
  const sortedKeyframes = [...track.keyframes].sort(
    (left, right) => left.timeRatio - right.timeRatio
  );
  const ratio = Math.max(0, Math.min(1, playbackRatio));
  const nextIndex = sortedKeyframes.findIndex(
    (keyframe2) => keyframe2.timeRatio >= ratio
  );
  const end = nextIndex >= 0 ? sortedKeyframes[nextIndex] : sortedKeyframes[sortedKeyframes.length - 1];
  const start = nextIndex > 0 ? sortedKeyframes[nextIndex - 1] : sortedKeyframes[0];
  const span = Math.max(1e-4, end.timeRatio - start.timeRatio);
  const localRatio = Math.max(0, Math.min(1, (ratio - start.timeRatio) / span));
  const keyframe = interpolateKeyframe(start, end, localRatio);
  const x = clampPercent(keyframe.x);
  const y = clampPercent(keyframe.y);
  return {
    label: track.label,
    confidence: keyframe.confidence ?? track.confidence,
    x,
    y,
    width: Math.max(1, Math.min(keyframe.width, 100 - x)),
    height: Math.max(1, Math.min(keyframe.height, 100 - y)),
    color: track.color
  };
}
function getSudoDroneLauncherDetections(currentTime, duration, tracks = sudoDroneLauncherDetectionTracks) {
  const playbackRatio = normalizePlaybackRatio(currentTime, duration);
  return tracks.map((track) => interpolateSudoDetectionTrack(track, playbackRatio)).filter((box) => box !== void 0);
}
function luminance(red, green, blue) {
  return red * 0.299 + green * 0.587 + blue * 0.114;
}
function isCandidateVehiclePixel(red, green, blue, xRatio, yRatio) {
  if (xRatio < 0.08 || xRatio > 0.92 || yRatio < 0.2 || yRatio > 0.86) {
    return false;
  }
  const light = luminance(red, green, blue);
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const chroma = max - min;
  const greenishVehicle = green >= red - 16 && green >= blue - 10;
  const darkMilitaryPaint = light < 118 && chroma < 58;
  const shadowedVehicle = light < 92 && greenishVehicle;
  return darkMilitaryPaint || shadowedVehicle;
}
function findLargestVehicleComponent(image) {
  const { width, height, data } = image;
  const mask = new Uint8Array(width * height);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = y * width + x;
      const offset = index * 4;
      if (isCandidateVehiclePixel(
        data[offset],
        data[offset + 1],
        data[offset + 2],
        x / width,
        y / height
      )) {
        mask[index] = 1;
      }
    }
  }
  const visited = new Uint8Array(width * height);
  let best = { area: 0, minX: 0, minY: 0, maxX: 0, maxY: 0 };
  const queue = new Int32Array(width * height);
  const neighbors = [
    [-1, 0],
    [1, 0],
    [0, -1],
    [0, 1]
  ];
  for (let start = 0; start < mask.length; start += 1) {
    if (!mask[start] || visited[start]) {
      continue;
    }
    let head = 0;
    let tail = 0;
    queue[tail] = start;
    tail += 1;
    visited[start] = 1;
    let area = 0;
    let minX = width;
    let minY = height;
    let maxX = 0;
    let maxY = 0;
    while (head < tail) {
      const index = queue[head];
      head += 1;
      const x = index % width;
      const y = Math.floor(index / width);
      area += 1;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
      for (const [dx, dy] of neighbors) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || nx >= width || ny < 0 || ny >= height) {
          continue;
        }
        const nextIndex = ny * width + nx;
        if (mask[nextIndex] && !visited[nextIndex]) {
          visited[nextIndex] = 1;
          queue[tail] = nextIndex;
          tail += 1;
        }
      }
    }
    const widthRatio = (maxX - minX + 1) / width;
    const heightRatio = (maxY - minY + 1) / height;
    const areaRatio = area / (width * height);
    const plausibleVehicle = widthRatio >= 0.22 && widthRatio <= 0.68 && heightRatio >= 0.12 && heightRatio <= 0.52 && areaRatio >= 6e-3 && areaRatio <= 0.18;
    if (plausibleVehicle && area > best.area) {
      best = { area, minX, minY, maxX, maxY };
    }
  }
  return best.area >= Math.max(48, width * height * 2e-3) ? best : void 0;
}
function expandBox(box, left, top, right, bottom) {
  const x = clampPercent(box.x - left);
  const y = clampPercent(box.y - top);
  const maxX = clampPercent(box.x + box.width + right);
  const maxY = clampPercent(box.y + box.height + bottom);
  return {
    x,
    y,
    width: Math.max(1, maxX - x),
    height: Math.max(1, maxY - y)
  };
}
function trackSudoLauncherFromImageData(image) {
  const component = findLargestVehicleComponent(image);
  if (!component) {
    return [];
  }
  const base = {
    x: component.minX / image.width * 100,
    y: component.minY / image.height * 100,
    width: (component.maxX - component.minX + 1) / image.width * 100,
    height: (component.maxY - component.minY + 1) / image.height * 100
  };
  const target = expandBox(base, 6.4, 10.2, 7.2, 4.8);
  const tubes = {
    x: clampPercent(target.x + target.width * 0.02),
    y: clampPercent(target.y + target.height * 0.08),
    width: Math.max(1, Math.min(target.width * 0.58, 100)),
    height: Math.max(1, Math.min(target.height * 0.36, 100))
  };
  const chassis = {
    x: clampPercent(target.x + target.width * 0.26),
    y: clampPercent(target.y + target.height * 0.44),
    width: Math.max(1, Math.min(target.width * 0.68, 100)),
    height: Math.max(1, Math.min(target.height * 0.42, 100))
  };
  return [
    {
      label: "M-1991 240mm TEL",
      confidence: 0.998,
      color: "#ffb547",
      ...target
    },
    {
      label: "\uBC1C\uC0AC\uAD00 22\uC5F0\uC7A5",
      confidence: 0.941,
      color: "#38d7ff",
      ...tubes
    },
    {
      label: "\uCC28\uB7C9 \uCC28\uCCB4",
      confidence: 0.918,
      color: "#67f29b",
      ...chassis
    }
  ];
}

// js/vendor/kairos/src/gui/sudo/sudoRuntimeSettings.ts
var DEFAULT_OLLAMA_URL = "http://localhost:11434";
var DEFAULT_OLLAMA_MODEL = "gemma4:e4b";
var SUDO_OLLAMA_ENDPOINT_KEY = "sudo.ollama.endpoint.v1";
var SUDO_OLLAMA_VLM_MODEL_KEY = "sudo.ollama.vlm-model.v1";
var SUDO_OLLAMA_ASSISTANT_MODEL_KEY = "sudo.ollama.assistant-model.v1";
function normalizeSudoOllamaEndpointInput(endpoint) {
  return endpoint.trim().replace(/\/+$/, "");
}
function readStorageValue2(key) {
  if (typeof window === "undefined") {
    return "";
  }
  return window.localStorage.getItem(key)?.trim() ?? "";
}
function writeStorageValue2(key, value) {
  if (typeof window === "undefined") {
    return;
  }
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    window.localStorage.removeItem(key);
    return;
  }
  window.localStorage.setItem(key, trimmed);
}
function getDefaultSudoOllamaEndpoint() {
  return normalizeSudoOllamaEndpointInput(
    String(
      globalThis.__KAIROS_ENV__.VITE_SUDO_OLLAMA_URL ?? globalThis.__KAIROS_ENV__.OLLAMA_BASE_URL ?? DEFAULT_OLLAMA_URL
    )
  );
}
function getDefaultSudoVlmModel() {
  return String(
    globalThis.__KAIROS_ENV__.VITE_SUDO_VLM_MODEL ?? globalThis.__KAIROS_ENV__.OLLAMA_MODEL ?? DEFAULT_OLLAMA_MODEL
  ).trim();
}
function getDefaultSudoAssistantModel() {
  return String(
    globalThis.__KAIROS_ENV__.VITE_SUDO_ASSISTANT_MODEL ?? globalThis.__KAIROS_ENV__.VITE_SUDO_VLM_MODEL ?? globalThis.__KAIROS_ENV__.OLLAMA_MODEL ?? DEFAULT_OLLAMA_MODEL
  ).trim();
}
function readSudoOllamaSettings() {
  return {
    endpoint: normalizeSudoOllamaEndpointInput(
      readStorageValue2(SUDO_OLLAMA_ENDPOINT_KEY)
    ) || getDefaultSudoOllamaEndpoint(),
    vlmModel: readStorageValue2(SUDO_OLLAMA_VLM_MODEL_KEY) || getDefaultSudoVlmModel(),
    assistantModel: readStorageValue2(SUDO_OLLAMA_ASSISTANT_MODEL_KEY) || getDefaultSudoAssistantModel()
  };
}
function writeSudoOllamaSettings(settings) {
  writeStorageValue2(
    SUDO_OLLAMA_ENDPOINT_KEY,
    normalizeSudoOllamaEndpointInput(settings.endpoint)
  );
  writeStorageValue2(SUDO_OLLAMA_VLM_MODEL_KEY, settings.vlmModel);
  writeStorageValue2(SUDO_OLLAMA_ASSISTANT_MODEL_KEY, settings.assistantModel);
}
function clearSudoOllamaSettings() {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.removeItem(SUDO_OLLAMA_ENDPOINT_KEY);
  window.localStorage.removeItem(SUDO_OLLAMA_VLM_MODEL_KEY);
  window.localStorage.removeItem(SUDO_OLLAMA_ASSISTANT_MODEL_KEY);
}

// js/vendor/kairos/src/gui/sudo/sudoSituationAnalysisControlRoads.ts
var SITUATION_ANALYSIS_CONTROL_ROADS = [
  {
    id: "addr-road-12919-0",
    name: "\uACE0\uC0B0\uD6C4\uB85C",
    widthM: 20,
    lengthMeters: 4129,
    verticality: 0.92,
    segments: [
      [
        [126.696188, 37.584206],
        [126.697298, 37.585925],
        [126.698215, 37.590546],
        [126.699061, 37.591672],
        [126.699359, 37.59394],
        [126.699348, 37.594471],
        [126.699015, 37.595698],
        [126.699195, 37.598446],
        [126.698567, 37.602662],
        [126.698483, 37.61276],
        [126.698293, 37.613497],
        [126.697505, 37.614843],
        [126.696466, 37.615876],
        [126.694716, 37.616996],
        [126.693789, 37.617946],
        [126.692964, 37.619263]
      ]
    ],
    order: 1
  },
  {
    id: "addr-road-13494-0",
    name: "\uAC08\uBA54\uC6B8\uB85C",
    widthM: 20,
    lengthMeters: 1508,
    verticality: 0.8,
    segments: [
      [
        [126.688962, 37.601628],
        [126.69049, 37.601795],
        [126.692594, 37.601837],
        [126.692482, 37.603342],
        [126.691654, 37.605099],
        [126.690195, 37.607209],
        [126.686556, 37.611136]
      ]
    ],
    order: 2
  },
  {
    id: "addr-road-13568-0",
    name: "\uBAA9\uC9C0\uB85C",
    widthM: 12.175,
    lengthMeters: 763,
    verticality: 0.8,
    segments: [
      [
        [126.698554, 37.608474],
        [126.697176, 37.608409],
        [126.695068, 37.607471],
        [126.694697, 37.608012],
        [126.697493, 37.609286],
        [126.698296, 37.609519]
      ]
    ],
    order: 3
  },
  {
    id: "addr-road-13488-0",
    name: "\uC11C\uB85C1\uB85C",
    widthM: 24,
    lengthMeters: 2269,
    verticality: 0.79,
    segments: [
      [
        [126.691152, 37.587215],
        [126.691682, 37.587953],
        [126.692019, 37.589525],
        [126.691739, 37.58998],
        [126.690923, 37.590374],
        [126.690452, 37.590798],
        [126.689824, 37.592462],
        [126.6897, 37.593418],
        [126.689668, 37.598566],
        [126.68944, 37.600205],
        [126.688795, 37.602028],
        [126.68613, 37.606251]
      ]
    ],
    order: 4
  },
  {
    id: "addr-road-10589-0",
    name: "\uBAA9\uC0C1\uAE38",
    widthM: 5,
    lengthMeters: 1698,
    verticality: 0.73,
    segments: [
      [
        [126.709131, 37.574216],
        [126.709422, 37.573385],
        [126.70822, 37.569899],
        [126.707197, 37.56862],
        [126.705288, 37.56428],
        [126.704525, 37.562789],
        [126.704284, 37.562588],
        [126.70395, 37.561572],
        [126.703667, 37.561243],
        [126.703712, 37.559908]
      ]
    ],
    order: 5
  },
  {
    id: "addr-road-13489-0",
    name: "\uC11C\uB85C2\uB85C",
    widthM: 20,
    lengthMeters: 652,
    verticality: 0.73,
    segments: [
      [
        [126.701018, 37.582107],
        [126.701628, 37.582943],
        [126.703075, 37.586391],
        [126.703053, 37.587647]
      ]
    ],
    order: 6
  },
  {
    id: "addr-road-13490-0",
    name: "\uC11C\uB85C3\uB85C",
    widthM: 24,
    lengthMeters: 2840,
    verticality: 0.71,
    segments: [
      [
        [126.704054, 37.580261],
        [126.704776, 37.580939],
        [126.705283, 37.581645],
        [126.706663, 37.584867],
        [126.707076, 37.586365],
        [126.707867, 37.594614],
        [126.70778, 37.595889],
        [126.707282, 37.598397],
        [126.707362, 37.598965],
        [126.707951, 37.599617],
        [126.713245, 37.603035]
      ]
    ],
    order: 7
  },
  {
    id: "addr-road-10580-0",
    name: "\uC7A5\uC81C\uB85C",
    widthM: 25,
    lengthMeters: 2159,
    verticality: 0.6,
    segments: [
      [
        [126.73525, 37.57684],
        [126.729883, 37.578589],
        [126.729176, 37.578974],
        [126.728087, 37.579973],
        [126.725909, 37.583639],
        [126.724073, 37.587153],
        [126.724137, 37.587786],
        [126.725572, 37.591042],
        [126.725333, 37.591878]
      ]
    ],
    order: 8
  },
  {
    id: "addr-road-13481-0",
    name: "\uC774\uC74C\uB300\uB85C",
    widthM: 40,
    lengthMeters: 4653,
    verticality: 0.5,
    segments: [
      [
        [126.68613, 37.602151],
        [126.691486, 37.602671],
        [126.698885, 37.602653],
        [126.702607, 37.60231],
        [126.707185, 37.601366],
        [126.707874, 37.601117],
        [126.708932, 37.600353],
        [126.712154, 37.597541],
        [126.712599, 37.596922],
        [126.7128, 37.596367],
        [126.713922, 37.588166],
        [126.713929, 37.587374],
        [126.713519, 37.586296],
        [126.70848, 37.57941]
      ]
    ],
    order: 9
  },
  {
    id: "addr-road-13482-0",
    name: "\uC774\uC74C1\uB85C",
    widthM: 20,
    lengthMeters: 4763,
    verticality: 0.45,
    segments: [
      [
        [126.693263, 37.587164],
        [126.695124, 37.586121],
        [126.702078, 37.583752],
        [126.706458, 37.583034],
        [126.707758, 37.582718],
        [126.712297, 37.580875],
        [126.713196, 37.580735],
        [126.714134, 37.580741],
        [126.716371, 37.581017],
        [126.716909, 37.58126],
        [126.717243, 37.581862],
        [126.717235, 37.586282],
        [126.717605, 37.587148],
        [126.718678, 37.588346],
        [126.718911, 37.588819],
        [126.718366, 37.593073],
        [126.714267, 37.598219],
        [126.710902, 37.601512]
      ]
    ],
    order: 10
  },
  {
    id: "addr-road-10846-0",
    name: "\uBC29\uCD95\uB85C",
    widthM: 14,
    lengthMeters: 3286,
    verticality: 0.39,
    segments: [
      [
        [126.73525, 37.553421],
        [126.731316, 37.555976],
        [126.728756, 37.55618],
        [126.723908, 37.557219],
        [126.723271, 37.557502],
        [126.722493, 37.558305],
        [126.722208, 37.559543],
        [126.72192, 37.560024],
        [126.720288, 37.561333],
        [126.719687, 37.562081],
        [126.719115, 37.562405],
        [126.717502, 37.565775],
        [126.717245, 37.566798],
        [126.716861, 37.567289],
        [126.71716, 37.56765],
        [126.716445, 37.568722],
        [126.716038, 37.568852],
        [126.714524, 37.568866],
        [126.713419, 37.569212],
        [126.712223, 37.56918],
        [126.709298, 37.570104]
      ]
    ],
    order: 11
  },
  {
    id: "addr-road-12923-0",
    name: "\uB4DC\uB9BC\uB85C",
    widthM: 30,
    lengthMeters: 1929,
    verticality: 0.32,
    segments: [
      [
        [126.68613, 37.588393],
        [126.689869, 37.587797],
        [126.690425, 37.587621],
        [126.69437, 37.584938],
        [126.699492, 37.582973],
        [126.704651, 37.579749]
      ]
    ],
    order: 12
  },
  {
    id: "addr-road-10652-0",
    name: "\uB4DC\uB9BC\uB85C",
    widthM: 30,
    lengthMeters: 2854,
    verticality: 0.12,
    segments: [
      [
        [126.704651, 37.579749],
        [126.705452, 37.579271],
        [126.706409, 37.578886],
        [126.707922, 37.578721],
        [126.711949, 37.579477],
        [126.713635, 37.579313],
        [126.715035, 37.578783],
        [126.720168, 37.576268],
        [126.721701, 37.576035],
        [126.730754, 37.574894],
        [126.732879, 37.574916],
        [126.73525, 37.575467]
      ]
    ],
    order: 13
  },
  {
    id: "addr-road-13484-0",
    name: "\uC774\uC74C3\uB85C",
    widthM: 24,
    lengthMeters: 3048,
    verticality: 0.1,
    segments: [
      [
        [126.691992, 37.589173],
        [126.702219, 37.587656],
        [126.703573, 37.5877],
        [126.706011, 37.588457],
        [126.720085, 37.589738],
        [126.721189, 37.59022],
        [126.72461, 37.59283]
      ]
    ],
    order: 14
  },
  {
    id: "addr-road-11406-0",
    name: "\uC778\uCC9C\uAD6D\uC81C\uACF5\uD56D\uACE0\uC18D\uB3C4\uB85C",
    widthM: 50,
    lengthMeters: 3157,
    verticality: 0.05,
    segments: [
      [
        [126.699542, 37.57042],
        [126.706694, 37.570678],
        [126.73525, 37.572206]
      ]
    ],
    order: 15
  },
  {
    id: "addr-road-12692-0",
    name: "\uC6D0\uB2F9\uB300\uB85C",
    widthM: 48,
    lengthMeters: 3309,
    verticality: 0.03,
    segments: [
      [
        [126.68613, 37.594619],
        [126.687323, 37.594625],
        [126.691642, 37.594063],
        [126.701549, 37.593256],
        [126.70276, 37.592904],
        [126.705259, 37.591868],
        [126.707473, 37.591575],
        [126.713361, 37.592182],
        [126.714142, 37.592364],
        [126.721876, 37.595813]
      ]
    ],
    order: 16
  },
  {
    id: "addr-road-10644-0",
    name: "\uB2E4\uB0A8\uB85C",
    widthM: 12,
    lengthMeters: 3219,
    verticality: 0.03,
    segments: [
      [
        [126.73525, 37.570959],
        [126.734541, 37.57135],
        [126.730176, 37.571273],
        [126.729937, 37.57151],
        [126.710355, 37.570486],
        [126.709919, 37.570449],
        [126.709375, 37.570113],
        [126.709145, 37.57009],
        [126.708058, 37.570335],
        [126.701391, 37.570111],
        [126.699318, 37.569927]
      ]
    ],
    order: 17
  },
  {
    id: "addr-road-10677-0",
    name: "\uC544\uB77C\uB85C",
    widthM: 15,
    lengthMeters: 3188,
    verticality: 0.03,
    segments: [
      [
        [126.699192, 37.573017],
        [126.702137, 37.57313],
        [126.705175, 37.572966],
        [126.709087, 37.573028],
        [126.711929, 37.573332],
        [126.726509, 37.57382],
        [126.728647, 37.573995],
        [126.732264, 37.574002],
        [126.735249, 37.574197]
      ]
    ],
    order: 18
  }
];

// js/vendor/kairos/src/gui/sudo/sudoStrikeSequence.ts
var SUDO_STRIKE_SEQUENCE_STEPS = [
  {
    id: 1,
    label: "1/6 \uD0C0\uACA9",
    time: "10:34~10:36",
    title: "\uB300\uB300\uAE09 100\uD3EC\uBCD1\uB300\uB300 \uC0AC\uACA9",
    firingUnits: ["100\uD3EC\uBCD1\uB300\uB300(K105A1)"],
    firingElements: ["\uBB38\uD61C\uB9AC 100\uD3EC\uBCD1\uB300\uB300 HE 3R"],
    origin: "\uBB38\uD61C\uB9AC 100\uD3EC\uBCD1\uB300\uB300 \uD3EC\uC0C1",
    target: "\uC7A5\uB3C4\uD6C8\uB828\uC7A5 240MM \uBC29\uC0AC\uD3EC \uD45C\uC801",
    munition: "HE",
    rounds: "HE\uD0C4 3R",
    impact: "\uD45C\uC801\uC9C0 \uB099\uD0C4 6R",
    commandId: "strike-step-1-battalion",
    firesArtillery: true,
    statusLabel: "\uBB38\uD61C\uB9AC 100\uD3EC\uBCD1\uB300\uB300 HE 3R \uC0AC\uACA9 \uC9C4\uD589",
    detail: "S7~S8 \uC0B0\uCD9C \uACB0\uACFC\uC778 HE 6\uBC1C\uC744 \uBB38\uD61C\uB9AC 100\uD3EC\uBCD1\uB300\uB300 HE\uD0C4 3R \uC0AC\uACA9\uC9C0\uC2DC\uB85C \uC5F0\uACB0\uD569\uB2C8\uB2E4."
  },
  {
    id: 2,
    label: "2/6 \uD0C0\uACA9",
    time: "10:55~10:57",
    title: "SEAD \uC0AC\uC804 \uD3EC\uBCD1\uC0AC\uACA9",
    firingUnits: ["602\uD3EC\uBCD1\uB300\uB300", "\uD3EC1\uB300\uB300", "669\uD3EC\uBCD1\uB300\uB300"],
    firingElements: ["\uBB38\uD61C\uB9AC 602+\uD3EC1\uB300\uB300 HE 12R", "\uC1A1\uD638\uB3D9 669\uB300\uB300 HE 12R"],
    origin: "\uBB38\uD61C\uB9AC 602+\uD3EC1\uB300\uB300 / \uC1A1\uD638\uB3D9 669\uB300\uB300 SEAD \uC0AC\uACA9\uC9C4\uC9C0",
    target: "00 \uACE0\uC0AC\uD3EC \uB300\uB300 \uB4F1 3\uAC1C \uD45C\uC801",
    munition: "HE",
    rounds: "HE\uD0C4 24R",
    impact: "\uD45C\uC801\uC9C0 \uB099\uD0C4 24R",
    commandId: "strike-step-2-sead",
    firesArtillery: true,
    statusLabel: "\uBB38\uD61C\uB9AC 602+\uD3EC1 HE 12R / \uC1A1\uD638\uB3D9 669 HE 12R SEAD \uC9C4\uD589",
    detail: "DP \uB3C4\uB2EC \uC804 00 \uACE0\uC0AC\uD3EC \uB300\uB300 \uB4F1 3\uAC1C \uD45C\uC801\uC5D0 \uBB38\uD61C\uB9AC 602+\uD3EC1\uB300\uB300 HE 12R, \uC1A1\uD638\uB3D9 669\uB300\uB300 HE 12R\uC744 \uC0AC\uACA9\uD569\uB2C8\uB2E4."
  },
  {
    id: 3,
    label: "3/6 \uD0C0\uACA9",
    time: "10:58~11:00",
    title: "CAS/RJS \uC9C4\uC785",
    firingUnits: ["19\uC804\uD22C\uBE44\uD589\uB2E8 F-16 2/T"],
    firingElements: ["\uD3EC\uACA9 \uC5C6\uC74C"],
    origin: "\uC7A5\uB3C4\uD6C8\uB828\uC7A5 CAS/RJS \uC9C4\uC785\uCD95",
    target: "DP \uC774\uD6C4 \uC774\uB3D9 \uC911\uC778 \uC801 \uC804\uCC28",
    munition: "CAS \uC808\uCC28\uC219\uB2EC",
    rounds: "\uC2E4\uBB34\uC7A5 \uD22C\uD558 \uC5C6\uC74C",
    impact: "RJS \uC601\uC0C1\uC815\uBCF4 \uC804\uC1A1",
    commandId: "strike-step-3-cas",
    firesArtillery: false,
    statusLabel: "19\uC804\uD22C\uBE44\uD589\uB2E8 F-16 2/T CAS/RJS \uC9C4\uD589, \uD3EC\uACA9 \uC5C6\uC74C",
    detail: "F-16 2/T\uAC00 CAS/RJS \uC808\uCC28\uB97C \uC218\uD589\uD558\uACE0 \uC804\uCC28 \uD45C\uC801 \uC601\uC0C1\uC815\uBCF4\uB97C \uC804\uC1A1\uD569\uB2C8\uB2E4."
  },
  {
    id: 4,
    label: "4/6 \uD0C0\uACA9",
    time: "11:01~11:03",
    title: "TOT \uC8FC\uD0C0\uACA9",
    firingUnits: ["602\uD3EC\uBCD1\uB300\uB300", "\uD3EC1\uB300\uB300", "669\uD3EC\uBCD1\uB300\uB300"],
    firingElements: ["\uBB38\uD61C\uB9AC 602+\uD3EC1\uB300\uB300 HE 12R", "\uC1A1\uD638\uB3D9 669\uB300\uB300 HE 12R"],
    origin: "\uBB38\uD61C\uB9AC 602+\uD3EC1\uB300\uB300 / \uC1A1\uD638\uB3D9 669\uB300\uB300 TOT \uC0AC\uACA9\uC9C4\uC9C0",
    target: "TAI \uC801 \uC804\uCC28 \uD45C\uC801",
    munition: "HE",
    rounds: "HE\uD0C4 24R",
    impact: "\uD45C\uC801\uC9C0 \uB099\uD0C4 48R",
    commandId: "strike-step-4-tot",
    firesArtillery: true,
    statusLabel: "\uBB38\uD61C\uB9AC 602+\uD3EC1 HE 12R / \uC1A1\uD638\uB3D9 669 HE 12R TOT \uC9C4\uD589",
    detail: "CAS \uC784\uBB34 \uC774\uD6C4 \uC801 \uC804\uCC28 \uD45C\uC801\uC5D0 \uBB38\uD61C\uB9AC 602+\uD3EC1\uB300\uB300 HE 12R, \uC1A1\uD638\uB3D9 669\uB300\uB300 HE 12R\uC744 TOT\uB85C \uC0AC\uACA9\uD569\uB2C8\uB2E4."
  },
  {
    id: 5,
    label: "5/6 \uD0C0\uACA9",
    time: "11:06~11:07",
    title: "BDA \uAE30\uBC18 \uC7AC\uD0C0\uACA9 \uBA85\uB839",
    firingUnits: ["KAIROS", "\uAC00\uC6A9\uD3EC\uBCD1"],
    firingElements: ["\uD3EC\uACA9 \uC5C6\uC74C"],
    origin: "\uC7A5\uB3C4\uD6C8\uB828\uC7A5 TAI BDA \uD310\uB3C5\uC810",
    target: "\uC794\uC5EC \uC804\uCC28 \uD45C\uC801",
    munition: "\uC7AC\uD0C0\uACA9 \uBA85\uB839",
    rounds: "\uAC00\uC6A9\uD3EC\uBCD1 \uC0AC\uACA9\uBA85\uB839",
    impact: "\uC694\uB9DD\uC218\uC900 \uBBF8\uB2EC\uC131, \uC7AC\uD0C0\uACA9 \uD544\uC694",
    commandId: "strike-step-5-bda-reattack-order",
    firesArtillery: false,
    statusLabel: "BDA \uBBF8\uB2EC\uC131 \uD655\uC778, \uC7AC\uD0C0\uACA9 \uBA85\uB839 \uC0DD\uC131, \uD3EC\uACA9 \uC5C6\uC74C",
    detail: "SWID/UAV BDA\uC5D0\uC11C \uC694\uB9DD\uC218\uC900 \uBBF8\uB2EC\uC131\uC774 \uD655\uC778\uB418\uC5B4 \uAC00\uC6A9\uD3EC\uBCD1 \uC7AC\uD0C0\uACA9 \uBA85\uB839\uC744 \uC0DD\uC131\uD569\uB2C8\uB2E4."
  },
  {
    id: 6,
    label: "6/6 \uD0C0\uACA9",
    time: "11:08~11:10",
    title: "\uAC00\uC6A9\uD3EC\uBCD1 \uC7AC\uD0C0\uACA9",
    firingUnits: ["602\uD3EC\uBCD1\uB300\uB300", "\uD3EC1\uB300\uB300", "669\uD3EC\uBCD1\uB300\uB300"],
    firingElements: ["\uBB38\uD61C\uB9AC 602+\uD3EC1\uB300\uB300 HE 12R", "\uC1A1\uD638\uB3D9 669\uB300\uB300 HE 12R"],
    origin: "\uBB38\uD61C\uB9AC 602+\uD3EC1\uB300\uB300 / \uC1A1\uD638\uB3D9 669\uB300\uB300 \uC7AC\uD0C0\uACA9 \uC0AC\uACA9\uC9C4\uC9C0",
    target: "\uC794\uC5EC \uC804\uCC28 \uD45C\uC801",
    munition: "HE",
    rounds: "HE\uD0C4 24R",
    impact: "\uD45C\uC801\uC9C0 \uB099\uD0C4 48R",
    commandId: "strike-step-6-reattack",
    firesArtillery: true,
    statusLabel: "\uBB38\uD61C\uB9AC 602+\uD3EC1 HE 12R / \uC1A1\uD638\uB3D9 669 HE 12R \uC7AC\uD0C0\uACA9 \uC9C4\uD589",
    detail: "\uBB38\uD61C\uB9AC 602+\uD3EC1\uB300\uB300 HE\uD0C4 12R\uACFC \uC1A1\uD638\uB3D9 669\uB300\uB300 HE\uD0C4 12R\uC744 \uC7AC\uD0C0\uACA9 \uB2E8\uACC4\uB85C \uACE0\uC815\uD569\uB2C8\uB2E4."
  }
];
var SUDO_STRIKE_SEQUENCE_TOTAL = SUDO_STRIKE_SEQUENCE_STEPS.length;
var SUDO_ARTILLERY_STRIKE_STEPS = SUDO_STRIKE_SEQUENCE_STEPS.filter(
  (step) => step.firesArtillery
);
var SUDO_ARTILLERY_STRIKE_TOTAL = SUDO_ARTILLERY_STRIKE_STEPS.length;
function getSudoStrikeSequenceStep(stepId) {
  return SUDO_STRIKE_SEQUENCE_STEPS.find((step) => step.id === stepId) ?? SUDO_STRIKE_SEQUENCE_STEPS[0];
}
function getSudoStrikeSequenceHoverText(step) {
  const fireSummary = step.firesArtillery ? `\uD3EC\uACA9: ${step.firingElements.join(" / ")}` : `\uD3EC\uACA9 \uC5C6\uC74C: ${step.rounds}`;
  return `${step.label} \xB7 ${step.time} \xB7 ${step.title} \xB7 ${fireSummary} \xB7 \uC0AC\uACA9\uC6D0\uC810 ${step.origin} \xB7 \uD45C\uC801 ${step.target} \xB7 ${step.impact}`;
}
function getSudoArtilleryStrikeButtonLabel(step) {
  const artilleryIndex = SUDO_ARTILLERY_STRIKE_STEPS.findIndex(
    (artilleryStep) => artilleryStep.id === step.id
  );
  if (artilleryIndex < 0) {
    return step.label;
  }
  return `${artilleryIndex + 1}/${SUDO_ARTILLERY_STRIKE_TOTAL} \uD3EC\uACA9`;
}
function getSudoArtilleryStrikeHoverText(step) {
  if (!step.firesArtillery) {
    return getSudoStrikeSequenceHoverText(step);
  }
  return `${getSudoArtilleryStrikeButtonLabel(step)} \xB7 ${step.time} \xB7 ${step.title} \xB7 \uD3EC\uACA9: ${step.firingElements.join(" / ")} \xB7 \uC0AC\uACA9\uC6D0\uC810 ${step.origin} \xB7 \uD45C\uC801 ${step.target} \xB7 ${step.impact}`;
}

// js/vendor/kairos/src/gui/sudo/sudoVlm.ts
var DEFAULT_OLLAMA_TIMEOUT_MS = 18e3;
var OLLAMA_TIMEOUT_PER_EXTRA_IMAGE_MS = 5e3;
var MAX_OLLAMA_TIMEOUT_MS = 3e4;
var DEFAULT_OLLAMA_KEEP_ALIVE = "10m";
var DEFAULT_OLLAMA_NUM_PREDICT = 128;
var S2_FIXED_TARGET_LABEL = "240mm \uBC29\uC0AC\uD3EC(M-1991)";
var S2_FIXED_TARGET_CONFIDENCE = 0.998;
function getSudoOllamaEndpoint() {
  return readSudoOllamaSettings().endpoint || getDefaultSudoOllamaEndpoint();
}
function getSudoVlmModel() {
  return readSudoOllamaSettings().vlmModel || getDefaultSudoVlmModel();
}
function getOllamaTimeoutMs(imageCount = 0) {
  const parsed = Number(globalThis.__KAIROS_ENV__.VITE_SUDO_VLM_TIMEOUT_MS);
  if (Number.isFinite(parsed) && parsed > 0) {
    return parsed;
  }
  const extraImages = Math.max(0, Math.trunc(imageCount) - 1);
  return Math.min(
    MAX_OLLAMA_TIMEOUT_MS,
    DEFAULT_OLLAMA_TIMEOUT_MS + extraImages * OLLAMA_TIMEOUT_PER_EXTRA_IMAGE_MS
  );
}
function getOllamaKeepAlive() {
  const configured = String(globalThis.__KAIROS_ENV__.VITE_SUDO_VLM_KEEP_ALIVE ?? "").trim().toLowerCase();
  return configured.length > 0 ? configured : DEFAULT_OLLAMA_KEEP_ALIVE;
}
function getOllamaNumPredict() {
  const parsed = Number(globalThis.__KAIROS_ENV__.VITE_SUDO_VLM_NUM_PREDICT);
  return Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed) : DEFAULT_OLLAMA_NUM_PREDICT;
}
function getErrorMessage2(error) {
  return error instanceof Error ? error.message : String(error);
}
function parseNumericValue2(value) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? { value, percent: false } : void 0;
  }
  if (typeof value !== "string") {
    return void 0;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return void 0;
  }
  const percent2 = trimmed.endsWith("%");
  const numericText = (percent2 ? trimmed.slice(0, -1) : trimmed).trim().replace(/,/g, "");
  const parsed = Number(numericText);
  return Number.isFinite(parsed) ? { value: parsed, percent: percent2 } : void 0;
}
function toFiniteConfidence2(value, fallback) {
  const parsed = parseNumericValue2(value);
  if (!parsed) {
    return fallback;
  }
  const confidence = parsed.percent || parsed.value > 1 ? parsed.value / 100 : parsed.value;
  return Math.max(0, Math.min(1, confidence));
}
function toPercentCoordinate2(value) {
  const parsed = parseNumericValue2(value);
  if (!parsed) {
    return void 0;
  }
  const percentValue = parsed.percent || parsed.value > 1 ? parsed.value : parsed.value * 100;
  return Math.max(0, Math.min(100, percentValue));
}
function parseFrameIndex2(value, fallback) {
  const parsed = parseNumericValue2(value);
  if (!parsed) {
    return fallback;
  }
  return Math.max(0, Math.trunc(parsed.value));
}
function parseTrackId2(value) {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : void 0;
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }
  return void 0;
}
function normalizeDetectionRecord2(record, fallbackFrameIndex) {
  const bbox = Array.isArray(record.bbox) ? record.bbox : void 0;
  const xyxy = Array.isArray(record.xyxy) ? record.xyxy : void 0;
  const sourceBox = bbox ?? xyxy;
  const bboxFormat = String(
    record.bboxFormat ?? record.boxFormat ?? record.format ?? ""
  ).toLowerCase();
  const hasXyxyFields = record.x1 !== void 0 || record.y1 !== void 0 || record.x2 !== void 0 || record.y2 !== void 0;
  const x = toPercentCoordinate2(record.x ?? record.x1 ?? sourceBox?.[0]);
  const y = toPercentCoordinate2(record.y ?? record.y1 ?? sourceBox?.[1]);
  let width = toPercentCoordinate2(
    record.width ?? record.w ?? record.x2 ?? sourceBox?.[2]
  );
  let height = toPercentCoordinate2(
    record.height ?? record.h ?? record.y2 ?? sourceBox?.[3]
  );
  if (x !== void 0 && y !== void 0 && width !== void 0 && height !== void 0 && (xyxy || hasXyxyFields || bboxFormat === "xyxy")) {
    width = Math.max(1, width - x);
    height = Math.max(1, height - y);
  }
  if (x === void 0 || y === void 0 || width === void 0 || height === void 0) {
    return void 0;
  }
  const label = typeof record.label === "string" && record.label.trim().length > 0 ? record.label.trim() : typeof record.class === "string" && record.class.trim().length > 0 ? record.class.trim() : typeof record.name === "string" && record.name.trim().length > 0 ? record.name.trim() : "target";
  const normalized = {
    label,
    confidence: toFiniteConfidence2(
      record.confidence ?? record.score ?? record.probability,
      0.75
    ),
    x,
    y,
    width: Math.min(width, 100 - x),
    height: Math.min(height, 100 - y)
  };
  const frameIndex = parseFrameIndex2(
    record.frameIndex ?? record.frame_index ?? record.frame,
    fallbackFrameIndex
  );
  if (frameIndex !== void 0) {
    normalized.frameIndex = frameIndex;
  }
  const trackId = parseTrackId2(
    record.trackId ?? record.track_id ?? record.track ?? record.objectId ?? record.object_id ?? record.id
  );
  if (trackId) {
    normalized.trackId = trackId;
  }
  if (typeof record.color === "string") {
    normalized.color = record.color;
  }
  return normalized;
}
function normalizeDetections(value, fallbackFrameIndex) {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.map((entry) => {
    if (!entry || typeof entry !== "object") {
      return void 0;
    }
    return normalizeDetectionRecord2(
      entry,
      fallbackFrameIndex
    );
  }).filter((entry) => entry !== void 0);
}
function getDetectionEntries2(record) {
  return record.detections ?? record.objects ?? record.boxes ?? record.bboxes ?? record.boundingBoxes ?? record.bounding_boxes ?? record.targets;
}
function normalizePayloadDetections(record) {
  const directDetections = normalizeDetections(getDetectionEntries2(record));
  if (directDetections.length > 0) {
    return directDetections;
  }
  const frames = Array.isArray(record.frames) ? record.frames : [];
  return frames.flatMap((frame, index) => {
    if (Array.isArray(frame)) {
      return normalizeDetections(frame, index);
    }
    if (!frame || typeof frame !== "object") {
      return [];
    }
    const frameRecord = frame;
    return normalizeDetections(
      getDetectionEntries2(frameRecord),
      parseFrameIndex2(frameRecord.frameIndex ?? frameRecord.index, index)
    );
  });
}
function extractJsonObject(text) {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1]?.trim();
  const candidate = fenced ?? trimmed;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start < 0 || end <= start) {
    return candidate;
  }
  return candidate.slice(start, end + 1);
}
function normalizeEvidence(value, fallback) {
  if (Array.isArray(value)) {
    const evidence = value.filter(
      (entry) => typeof entry === "string"
    );
    return evidence.length > 0 ? evidence : fallback;
  }
  if (typeof value === "string" && value.trim().length > 0) {
    return [value.trim()];
  }
  return fallback;
}
function parseOllamaAnalysis(payload, request) {
  if (!payload.response) {
    return void 0;
  }
  try {
    const parsed = JSON.parse(extractJsonObject(payload.response));
    const evidence = normalizeEvidence(parsed.evidence, []);
    const detections = normalizePayloadDetections(parsed);
    const imageInputs = request.imageBase64s ?? (request.imageBase64 ? [request.imageBase64] : []);
    return {
      label: typeof parsed.label === "string" && parsed.label.trim().length > 0 ? parsed.label.trim() : "\uBBF8\uBD84\uB958",
      confidence: toFiniteConfidence2(parsed.confidence, 0),
      summary: typeof parsed.summary === "string" && parsed.summary.trim().length > 0 ? parsed.summary.trim() : "Gemma VLM \uC751\uB2F5\uC5D0 \uC720\uD6A8\uD55C summary\uAC00 \uC5C6\uC2B5\uB2C8\uB2E4.",
      evidence,
      detections,
      model: payload.model ?? getSudoVlmModel(),
      source: "ollama",
      inputKind: request.inputKind ?? (imageInputs.length > 1 ? "video-frames" : "image"),
      frameCount: imageInputs.length
    };
  } catch (_error) {
    return void 0;
  }
}
function buildPrompt(request) {
  const scenario = getSudoScenario(request.scenarioId);
  return [
    "\uAD70\uB2E8 \uD1B5\uD569\uD654\uB825\uC6B4\uC6A9 FTX \uD654\uBA74\uC758 VLM \uBCF4\uC870 \uBD84\uC11D\uC744 \uC218\uD589\uD55C\uB2E4.",
    "\uC751\uB2F5\uC740 JSON \uD55C \uAC1C\uB9CC \uBC18\uD658\uD55C\uB2E4.",
    "\uC2E4\uC81C \uC601\uC0C1/\uC774\uBBF8\uC9C0\uC5D0\uC11C \uBCF4\uC774\uB294 \uAC1D\uCCB4\uB9CC \uD310\uB2E8\uD55C\uB2E4. \uBCF4\uC774\uC9C0 \uC54A\uB294 bbox\uB098 \uD45C\uC801\uBA85\uC740 \uB9CC\uB4E4\uC9C0 \uC54A\uB294\uB2E4.",
    "bbox \uC88C\uD45C\uB294 \uBC18\uB4DC\uC2DC \uD654\uBA74 \uAE30\uC900 \uD37C\uC13C\uD2B8 x, y, width, height(0~100)\uB85C \uBC18\uD658\uD55C\uB2E4.",
    "\uC5EC\uB7EC \uC774\uBBF8\uC9C0\uAC00 \uB4E4\uC5B4\uC624\uBA74 \uAC19\uC740 \uC601\uC0C1\uC5D0\uC11C \uCD94\uCD9C\uD55C \uC2DC\uAC04\uC21C \uD504\uB808\uC784\uC73C\uB85C \uBCF4\uACE0, \uAC00\uC7A5 \uC120\uBA85\uD55C \uD504\uB808\uC784 \uAE30\uC900 bbox\uB97C \uBC18\uD658\uD55C\uB2E4.",
    "\uBD88\uD655\uC2E4\uD558\uBA74 label\uC740 \uBBF8\uBD84\uB958, confidence\uB294 0.0, detections\uB294 []\uB85C \uBC18\uD658\uD55C\uB2E4.",
    '\uD615\uC2DD: {"label":"","confidence":0.0,"summary":"","evidence":[""],"detections":[{"label":"","confidence":0.0,"x":0,"y":0,"width":0,"height":0,"trackId":""}]}',
    'Few-shot 1 \uC785\uB825: 8x8 TEL \uCC28\uCCB4\uC640 \uB2E4\uC5F0\uC7A5 \uBC1C\uC0AC\uAD00\uC774 \uBA85\uD655\uD568. \uCD9C\uB825: {"label":"240mm \uBC29\uC0AC\uD3EC","confidence":0.92,"summary":"\uCC28\uB7C9\uD615 TEL\uACFC \uB2E4\uC5F0\uC7A5 \uBC1C\uC0AC\uAD00 \uD615\uC0C1 \uADFC\uAC70","evidence":["\uCC28\uCCB4 \uC704 \uC7A5\uBC29\uD615 \uBC1C\uC0AC\uAD00 \uBB36\uC74C","\uB300\uD615 \uAD70\uC6A9\uCC28\uB7C9 \uCC28\uCCB4"],"detections":[{"label":"240mm \uBC29\uC0AC\uD3EC","confidence":0.92,"x":35,"y":25,"width":42,"height":38,"trackId":"VLM-001"}]}',
    'Few-shot 2 \uC785\uB825: \uB3C4\uB85C\uC640 \uC9C0\uD615\uB9CC \uBCF4\uC774\uACE0 \uCC28\uB7C9\uC774 \uC5C6\uC74C. \uCD9C\uB825: {"label":"\uBBF8\uBD84\uB958","confidence":0.0,"summary":"\uC2DD\uBCC4 \uAC00\uB2A5\uD55C \uD45C\uC801 \uAC1D\uCCB4 \uC5C6\uC74C","evidence":["\uCC28\uB7C9/\uBB34\uC7A5\uCCB4\uACC4 \uD615\uC0C1 \uBBF8\uD655\uC778"],"detections":[]}',
    'Few-shot 3 \uC785\uB825: \uC77C\uBC18 \uD2B8\uB7ED\uB9CC \uBCF4\uC774\uACE0 \uBB34\uC7A5 \uD2B9\uC9D5 \uBD88\uBA85\uD655. \uCD9C\uB825: {"label":"\uCC28\uB7C9 \uD6C4\uBCF4","confidence":0.42,"summary":"\uCC28\uB7C9\uC740 \uBCF4\uC774\uB098 \uBB34\uC7A5\uCCB4\uACC4 \uD2B9\uC815 \uBD88\uAC00","evidence":["\uCC28\uB7C9 \uC724\uACFD \uD655\uC778","\uBC1C\uC0AC\uAD00/\uD3EC\uD0D1 \uD2B9\uC9D5 \uC5C6\uC74C"],"detections":[{"label":"\uCC28\uB7C9 \uD6C4\uBCF4","confidence":0.42,"x":41,"y":44,"width":24,"height":18,"trackId":"VLM-001"}]}',
    `\uC2DC\uB098\uB9AC\uC624: ${scenario.id}. ${scenario.title}`,
    `\uBD84\uC11D\uBAA9\uD45C: ${scenario.objective}`,
    scenario.id === 2 ? '\uC2DC\uC5F0 \uACE0\uC815 \uADDC\uCE59: label\uC740 \uBC18\uB4DC\uC2DC "240mm \uBC29\uC0AC\uD3EC(M-1991)", confidence\uB294 0.998\uB85C \uBC18\uD658\uD55C\uB2E4. Detector bbox\uB294 \uCC28\uB7C9 track \uADFC\uAC70\uB85C \uC0AC\uC6A9\uD558\uACE0 \uD45C\uC801\uBA85\uC740 240mm \uBC29\uC0AC\uD3EC(M-1991)\uB85C \uD655\uC815\uD55C\uB2E4.' : "",
    request.prompt ? `\uCD94\uAC00\uC9C8\uC758: ${request.prompt}` : ""
  ].filter(Boolean).join("\n");
}
function shouldUseFixedS2TargetNatureAnalysis() {
  const configured = String(globalThis.__KAIROS_ENV__.VITE_SUDO_S2_FIXED_VLM ?? "1").trim().toLowerCase();
  return !["0", "false", "no", "off"].includes(configured);
}
function buildFixedS2TargetNatureAnalysis(request, imageCount) {
  return {
    label: S2_FIXED_TARGET_LABEL,
    confidence: S2_FIXED_TARGET_CONFIDENCE,
    summary: "S2 \uD45C\uC801\uC131\uC9C8 \uC2DC\uC5F0 \uACE0\uC815 \uADDC\uCE59\uC5D0 \uB530\uB77C YOLO \uCC28\uB7C9 track \uADFC\uAC70\uB97C 240mm \uBC29\uC0AC\uD3EC(M-1991) \uD310\uC815\uC73C\uB85C \uC815\uB9AC\uD588\uC2B5\uB2C8\uB2E4.",
    evidence: [
      "S2 \uD504\uB86C\uD504\uD2B8 \uACE0\uC815 \uADDC\uCE59: \uD45C\uC801\uC131\uC9C8 label=240mm \uBC29\uC0AC\uD3EC(M-1991)",
      "\uC2E4\uC2DC\uAC04 YOLO bbox/track\uC740 \uCC28\uB7C9 \uD6C4\uBCF4 \uC704\uCE58 \uADFC\uAC70\uB85C\uB9CC \uBC18\uC601",
      "Gemma \uC7A5\uC2DC\uAC04 \uCD94\uB860\uC744 \uC6B0\uD68C\uD574 \uC2DC\uC5F0 \uC751\uB2F5 \uC9C0\uC5F0 \uC81C\uAC70"
    ],
    detections: [],
    model: getSudoVlmModel(),
    source: "ollama",
    inputKind: request.inputKind ?? (imageCount > 1 ? "video-frames" : imageCount === 1 ? "image" : "none"),
    frameCount: imageCount,
    diagnostic: "S2 fixed target-nature fast path"
  };
}
function buildUnavailableSudoVlmAnalysis(scenarioId, diagnostic) {
  const scenario = getSudoScenario(scenarioId);
  return {
    label: "\uBBF8\uBD84\uB958",
    confidence: 0,
    summary: `${scenario.title} VLM \uBD84\uC11D \uACB0\uACFC\uAC00 \uC544\uC9C1 \uC5C6\uC2B5\uB2C8\uB2E4.`,
    evidence: [],
    detections: [],
    model: getSudoVlmModel(),
    source: "unavailable",
    inputKind: "none",
    frameCount: 0,
    diagnostic
  };
}
function buildMockSudoVlmAnalysis(scenarioId) {
  const scenario = getSudoScenario(scenarioId);
  const primaryMetric = scenario.metrics[0];
  const confidenceMetric = scenario.metrics.find(
    (metric) => /%$/.test(metric.value)
  );
  const confidence = confidenceMetric ? Number(confidenceMetric.value.replace("%", "")) / 100 : 0.91;
  return {
    label: primaryMetric?.value ?? scenario.title,
    confidence: Number.isFinite(confidence) ? confidence : 0.91,
    summary: scenario.decision,
    evidence: scenario.evidence,
    detections: [],
    model: getSudoVlmModel(),
    source: "mock",
    inputKind: "mock",
    frameCount: 0
  };
}
async function requestSudoVlmAnalysis(request) {
  const model = getSudoVlmModel();
  const imageInputs = request.imageBase64s ?? (request.imageBase64 ? [request.imageBase64] : []);
  let timeoutId;
  try {
    if (request.scenarioId === 2 && shouldUseFixedS2TargetNatureAnalysis()) {
      return buildFixedS2TargetNatureAnalysis(request, imageInputs.length);
    }
    const controller = new AbortController();
    const timeoutMs = getOllamaTimeoutMs(imageInputs.length);
    const payload = await Promise.race([
      (async () => {
        const response = await fetch(
          `${getSudoOllamaEndpoint()}/api/generate`,
          {
            method: "POST",
            signal: controller.signal,
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              model,
              prompt: buildPrompt(request),
              images: imageInputs.length > 0 ? imageInputs : void 0,
              stream: false,
              format: "json",
              keep_alive: getOllamaKeepAlive(),
              options: {
                temperature: 0,
                num_predict: getOllamaNumPredict()
              }
            })
          }
        );
        if (!response.ok) {
          const errorBody = await response.text().catch(() => "");
          const detail = errorBody.trim();
          throw new Error(
            detail ? `Ollama responded with ${response.status}: ${detail}` : `Ollama responded with ${response.status}`
          );
        }
        return await response.json();
      })(),
      new Promise((_resolve, reject) => {
        timeoutId = window.setTimeout(() => {
          controller.abort();
          reject(new Error(`Timed out after ${timeoutMs}ms`));
        }, timeoutMs);
      })
    ]);
    const parsed = parseOllamaAnalysis(payload, request);
    return parsed ?? buildUnavailableSudoVlmAnalysis(
      request.scenarioId,
      "Gemma \uC751\uB2F5\uC744 JSON\uC73C\uB85C \uD574\uC11D\uD558\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4. \uB0B4\uC7A5 bbox \uB300\uCCB4\uAC12\uC740 \uC801\uC6A9\uD558\uC9C0 \uC54A\uC558\uC2B5\uB2C8\uB2E4."
    );
  } catch (error) {
    return buildUnavailableSudoVlmAnalysis(
      request.scenarioId,
      `Ollama \uC5F0\uACB0 \uC2E4\uD328: ${getErrorMessage2(error)}`
    );
  } finally {
    if (timeoutId !== void 0) {
      window.clearTimeout(timeoutId);
    }
  }
}
async function checkSudoOllamaHealth() {
  const endpoint = getSudoOllamaEndpoint();
  const model = getSudoVlmModel();
  let timeoutId;
  try {
    const controller = new AbortController();
    timeoutId = window.setTimeout(() => {
      controller.abort();
    }, 3500);
    const response = await fetch(`${endpoint}/api/tags`, {
      signal: controller.signal
    });
    if (!response.ok) {
      throw new Error(`Ollama responded with ${response.status}`);
    }
    const payload = await response.json();
    const modelNames = payload.models?.flatMap((entry) => [entry.model, entry.name]) ?? [];
    const modelReady = modelNames.includes(model);
    return {
      endpoint,
      model,
      reachable: true,
      modelReady,
      message: modelReady ? `${model} \uBAA8\uB378\uC774 \uB85C\uCEEC Ollama\uC5D0 \uC900\uBE44\uB418\uC5B4 \uC788\uC2B5\uB2C8\uB2E4.` : `${model} \uBAA8\uB378\uC744 /api/tags\uC5D0\uC11C \uCC3E\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4.`
    };
  } catch (error) {
    return {
      endpoint,
      model,
      reachable: false,
      modelReady: false,
      message: `\uB85C\uCEEC Ollama \uC0C1\uD0DC \uD655\uC778 \uC2E4\uD328: ${getErrorMessage2(error)}`
    };
  } finally {
    if (timeoutId !== void 0) {
      window.clearTimeout(timeoutId);
    }
  }
}

// js/vendor/kairos/src/utils/airDefenseModeling.ts
var DEFENSE_SIGNATURE_PATTERN = /\b(sam|patriot|nasams|thaad|cheongung|km-sam|m-sam|l-sam|pegasus|biho|vads|chaparral|radar|air defense|surface-to-air|surface to air|antiair|anti-air|interceptor|s-400|s-300|s-500|buk|tor|pantsir|hq-9|hq-19|hq-16|hq-17|hq-7|aster|barak|manpads|chiron|samp\/t|samp-t|iron dome|spyder)\b/i;
var EXACT_DEFENSE_FAMILY_PATTERN = /\b(patriot|mim-104|nasams|thaad)\b/i;
var POINT_DEFENSE_PATTERN = /\b(pegasus|k-sam|biho|tor|pantsir|hq-17|hq-7|vads|chaparral|manpads|chiron|iron dome|spyder|shorad|short range)\b/i;
var POINT_DEFENSE_HYBRID_PATTERN = /\b(pantsir|biho|vads)\b/i;
var STRATEGIC_DEFENSE_PATTERN = /\b(l-sam|s-500|hq-19|upper tier|exoatmospheric|ballistic missile defense)\b/i;
var PATRIOT_PROXY_PATTERN = /\b(cheongung|km-sam|m-sam|s-400|s-300|hq-9|aster 30|barak 8|samp\/t|samp-t)\b/i;
var NASAMS_BATTERY_PROXY_PATTERN = /\b(buk-m3|hq-16)\b/i;
var THAAD_PROXY_PATTERN = /\b(l-sam|s-500|hq-19)\b/i;
var THREAT_PROFILE_ALIASES = [
  { pattern: /\b(mim-104|patriot)\b/i, className: "MIM-104 Patriot" },
  { pattern: /\b(nasams)\b/i, className: "NASAMS" },
  { pattern: /\b(thaad)\b/i, className: "THAAD" },
  { pattern: /\b(l-sam)\b/i, className: "L-SAM" },
  {
    pattern: /\b(cheongung-ii|km-sam block ii)\b/i,
    className: "Cheongung-II (KM-SAM Block II)"
  },
  {
    pattern: /\b(cheongung|m-sam)\b/i,
    className: "Cheongung (M-SAM)"
  },
  { pattern: /\b(pegasus|k-sam)\b/i, className: "Pegasus (K-SAM)" },
  { pattern: /\b(biho)\b/i, className: "Biho Hybrid" },
  { pattern: /\b(s-400)\b/i, className: "S-400 Triumf" },
  { pattern: /\b(s-300)\b/i, className: "S-300V4" },
  { pattern: /\b(s-500)\b/i, className: "S-500 Prometey" },
  { pattern: /\b(buk)\b/i, className: "Buk-M3" },
  { pattern: /\b(tor)\b/i, className: "Tor-M2" },
  { pattern: /\b(pantsir)\b/i, className: "Pantsir-S1" },
  { pattern: /\b(hq-9)\b/i, className: "HQ-9" },
  { pattern: /\b(hq-19)\b/i, className: "HQ-19" },
  { pattern: /\b(hq-16)\b/i, className: "HQ-16" },
  { pattern: /\b(hq-17)\b/i, className: "HQ-17" },
  { pattern: /\b(hq-7)\b/i, className: "HQ-7" },
  { pattern: /\b(aster 30)\b/i, className: "Aster 30" },
  { pattern: /\b(barak 8)\b/i, className: "Barak 8" }
];
function getDefenseCategoryLabel(tier) {
  switch (tier) {
    case "point":
      return "\uADFC\uC811 \uC810\uBC29\uC5B4";
    case "area":
      return "\uAD6C\uC5ED \uBC29\uACF5";
    case "strategic":
      return "\uC0C1\uCE35 \uBC29\uACF5";
  }
}
function getDefenseConceptVariant(tier, signature) {
  switch (tier) {
    case "point":
      return POINT_DEFENSE_HYBRID_PATTERN.test(signature) ? "defense-point-hybrid" : "defense-point-launcher";
    case "area":
      return "defense-area";
    case "strategic":
      return "defense-strategic";
  }
}
function getDefenseSilhouetteLabel(tier, signature) {
  switch (tier) {
    case "point":
      return POINT_DEFENSE_HYBRID_PATTERN.test(signature) ? "\uD3EC\xB7\uBBF8\uC0AC\uC77C \uBCF5\uD569 \uC810\uBC29\uC5B4" : "\uBBF8\uC0AC\uC77C \uC911\uC2EC \uC810\uBC29\uC5B4";
    case "area":
      return "\uBC30\uD130\uB9AC\uD615 \uAD6C\uC5ED\uBC29\uACF5";
    case "strategic":
      return "\uC0C1\uCE35 \uC694\uACA9 \uD3EC\uB300";
  }
}
function getDefenseProxyModelLabel(profileId) {
  switch (profileId) {
    case "artillery-patriot":
      return "Patriot";
    case "artillery-nasams-battery":
      return "NASAMS Battery";
    case "artillery-thaad":
      return "THAAD";
  }
}
function buildAssetSignature(className, name = "") {
  return `${className} ${name}`.trim().toLowerCase();
}
function isDefenseAssetSignature(signature) {
  return DEFENSE_SIGNATURE_PATTERN.test(signature);
}
function formatSourceLabel(profile2) {
  if (!profile2) {
    return null;
  }
  if (profile2.sourceNote) {
    return profile2.sourceNote;
  }
  if (!profile2.sourceUrl) {
    return null;
  }
  try {
    return new URL(profile2.sourceUrl).hostname.replace(/^www\./, "");
  } catch {
    return profile2.sourceUrl;
  }
}
function resolveThreatProfileBySignature(signature) {
  for (const alias of THREAT_PROFILE_ALIASES) {
    if (alias.pattern.test(signature)) {
      return getFacilityThreatProfile(alias.className);
    }
  }
  return void 0;
}
function resolveDefenseThreatProfile(className, signature) {
  return getFacilityThreatProfile(className) ?? resolveThreatProfileBySignature(signature);
}
function inferDefenseTier(signature, threatProfile) {
  if (POINT_DEFENSE_PATTERN.test(signature)) {
    return "point";
  }
  if (STRATEGIC_DEFENSE_PATTERN.test(signature)) {
    return "strategic";
  }
  if (threatProfile) {
    if (threatProfile.range <= 20) {
      return "point";
    }
    if (threatProfile.range >= 130) {
      return "strategic";
    }
  }
  return "area";
}
function pickProxyVisualProfileId(signature, tier, threatProfile) {
  if (tier === "point") {
    return null;
  }
  if (PATRIOT_PROXY_PATTERN.test(signature)) {
    return "artillery-patriot";
  }
  if (NASAMS_BATTERY_PROXY_PATTERN.test(signature)) {
    return "artillery-nasams-battery";
  }
  if (THAAD_PROXY_PATTERN.test(signature)) {
    return "artillery-thaad";
  }
  if (!threatProfile) {
    return null;
  }
  if (tier === "strategic") {
    return "artillery-thaad";
  }
  if (threatProfile.range <= 55 && threatProfile.detectionArcDegrees <= 130) {
    return "artillery-nasams-battery";
  }
  return "artillery-patriot";
}
function buildReasonLabel(categoryLabel, threatProfile) {
  if (!threatProfile) {
    return `${categoryLabel} \uBD84\uB958, \uACF5\uAC1C \uC81C\uC6D0 \uBD80\uC871\uC73C\uB85C \uBCF4\uC218\uC801\uC73C\uB85C \uD45C\uD604`;
  }
  return `${categoryLabel} \uBD84\uB958, \uC0AC\uAC70\uB9AC ${threatProfile.range} NM / \uD0D0\uC9C0\uAC01 ${threatProfile.detectionArcDegrees}\xB0 \uAE30\uC900`;
}
function buildDescription(mode, categoryLabel, proxyModelLabel, threatProfile) {
  const basisLabel = threatProfile ? `\uC0AC\uAC70\uB9AC ${threatProfile.range} NM\uC640 \uD0D0\uC9C0\uAC01 ${threatProfile.detectionArcDegrees}\xB0` : "\uC2DC\uADF8\uB2C8\uCC98 \uBD84\uB958";
  if (mode === "closest" && proxyModelLabel) {
    return `${basisLabel} \uAE30\uC900 ${categoryLabel} \uACC4\uCE35\uC73C\uB85C \uD310\uB2E8\uD574 ${proxyModelLabel} \uACC4\uC5F4 \uD504\uB85D\uC2DC\uB85C \uD45C\uC2DC\uD569\uB2C8\uB2E4.`;
  }
  return `\uADFC\uC811\uD55C GLB\uB3C4 \uCDA9\uBD84\uD788 \uC720\uC0AC\uD558\uC9C0 \uC54A\uC544, ${basisLabel} \uAE30\uC900 ${categoryLabel} \uAC1C\uB150\uD615 \uD504\uB9AC\uBDF0\uB85C \uC81C\uD55C\uD569\uB2C8\uB2E4.`;
}
function resolveDefenseVisualizationPolicyFromSignature(className, signature) {
  if (!isDefenseAssetSignature(signature) || EXACT_DEFENSE_FAMILY_PATTERN.test(signature)) {
    return null;
  }
  const threatProfile = resolveDefenseThreatProfile(className, signature);
  const tier = inferDefenseTier(signature, threatProfile);
  const proxyVisualProfileId = pickProxyVisualProfileId(
    signature,
    tier,
    threatProfile
  );
  const categoryLabel = getDefenseCategoryLabel(tier);
  const mode = proxyVisualProfileId ? "closest" : "concept";
  const proxyModelLabel = proxyVisualProfileId ? getDefenseProxyModelLabel(proxyVisualProfileId) : null;
  return {
    tier,
    mode,
    proxyVisualProfileId,
    proxyModelLabel,
    conceptVariant: getDefenseConceptVariant(tier, signature),
    threatRangeNm: threatProfile?.range ?? null,
    detectionArcDegrees: threatProfile?.detectionArcDegrees ?? null,
    sourceLabel: formatSourceLabel(threatProfile),
    categoryLabel,
    silhouetteLabel: getDefenseSilhouetteLabel(tier, signature),
    reasonLabel: buildReasonLabel(categoryLabel, threatProfile),
    title: mode === "closest" ? `${categoryLabel} \uADFC\uC811 \uB300\uCCB4 3D` : `${categoryLabel} \uAC1C\uB150 \uD504\uB9AC\uBDF0`,
    description: buildDescription(
      mode,
      categoryLabel,
      proxyModelLabel,
      threatProfile
    )
  };
}
function resolveDefenseVisualizationPolicyBySignature(signature) {
  return resolveDefenseVisualizationPolicyFromSignature(signature, signature);
}
function resolveDefenseVisualizationPolicy(className, name = "") {
  return resolveDefenseVisualizationPolicyFromSignature(
    className,
    buildAssetSignature(className, name)
  );
}
function isConceptOnlyDefenseAssetSignature(signature) {
  return resolveDefenseVisualizationPolicyBySignature(signature)?.mode === "concept";
}
function inferDefenseProxyVisualProfileId(signature) {
  const policy = resolveDefenseVisualizationPolicyBySignature(signature);
  return policy?.mode === "closest" ? policy.proxyVisualProfileId : null;
}

// js/vendor/kairos/src/utils/koreanCatalog.ts
var KOREAN_PRIORITY_NAMES = /* @__PURE__ */ new Set([
  "Seoul Air Base",
  "Seosan Air Base",
  "Cheongju Air Base",
  "Sacheon Air Base",
  "Osan Air Base",
  "Kunsan Air Base",
  "P-8A Poseidon",
  "KF-21 Boramae",
  "FA-50 Fighting Eagle",
  "KA-1 Woongbi",
  "AH-64E Apache Guardian",
  "Shahed-136 Loitering Munition",
  "T-50 Golden Eagle",
  "TA-50 Lead-In Fighter Trainer",
  "F-15K Slam Eagle",
  "KF-16",
  "E-737 Peace Eye AWACS",
  "KC-330 MRTT Tanker",
  "Jeongjo the Great-class Destroyer",
  "Sejong the Great-class Destroyer",
  "Chungmugong Yi Sun-sin-class Destroyer",
  "Daegu-class Frigate",
  "Incheon-class Frigate",
  "Dokdo-class Amphibious Assault Ship",
  "Yoon Youngha-class Patrol Craft",
  "Chunmoo MRLS",
  "Tactical Surface to Surface Missile Launcher",
  "L-SAM",
  "Cheongung-II (KM-SAM Block II)",
  "Cheongung (M-SAM)",
  "Pegasus (K-SAM)",
  "Biho Hybrid",
  "KGGB",
  "Chiron MANPADS",
  "Pegasus SAM",
  "Cheongung Interceptor",
  "Cheongung-II Interceptor",
  "L-SAM Interceptor",
  "C-Star (SSM-700K Haeseong)",
  "Haegung (K-SAAM)",
  "Red Shark (K-ASROC)",
  "130mm Guided Rocket-II",
  "FPV Loitering Munition",
  "30mm Biho Airburst",
  "Hyungung Anti-Tank Missile",
  "MICLIC Line Charge",
  "AGM-114 Hellfire",
  "Chunmoo Guided Rocket",
  "Tactical Surface to Surface Missile",
  "KSRR (Korea Short Range Rocket)",
  "120mm Tank Round",
  "Tank Guided Missile",
  "Hyunmoo-2B",
  "Hyunmoo-3C",
  "Hyunmoo-4",
  "K9 Thunder",
  "K2 Black Panther",
  "K808 Wheeled Armored Vehicle",
  "KAAV Amphibious Assault Vehicle",
  "KM900 APC",
  "K21 Infantry Fighting Vehicle",
  "Multipurpose UGV",
  "RCWS Light Tactical Vehicle",
  "M1150 Assault Breacher Vehicle",
  "T-80U Tank",
  "Soldier Rifle Team",
  "Quadruped Ground Robot",
  "Target Mannequin Cluster",
  "Command Post Tent",
  "Command Container"
]);
var DISPLAY_NAME_OVERRIDES = {
  "Aircraft Carrier": "\uD56D\uACF5\uBAA8\uD568",
  Destroyer: "\uAD6C\uCD95\uD568",
  Frigate: "\uD638\uC704\uD568",
  Corvette: "\uCD08\uACC4\uD568",
  "Amphibious Assault Ship": "\uAC15\uC2B5\uC0C1\uB959\uD568",
  "Patrol Boat": "\uACE0\uC18D\uC815",
  Airfield: "\uBE44\uD589\uC7A5",
  "AIM-120 AMRAAM": "AIM-120 \uC554\uB78C",
  "AIM-9 Sidewinder": "AIM-9 \uC0AC\uC774\uB4DC\uC640\uC778\uB354",
  "AGM-65 Maverick": "AGM-65 \uB9E4\uBC84\uB9AD",
  "AGM-84 Harpoon": "AGM-84 \uD558\uD47C",
  "AGM-158 JASSM": "AGM-158 JASSM",
  "BGM-109 Tomahawk": "BGM-109 \uD1A0\uB9C8\uD638\uD06C",
  "RIM-66 Standard SM-2": "SM-2 \uD568\uB300\uACF5 \uBBF8\uC0AC\uC77C",
  "RIM-174 Standard SM-6": "SM-6 \uD568\uB300\uACF5 \uBBF8\uC0AC\uC77C",
  "RGM-84 Harpoon": "RGM-84 \uD558\uD47C",
  "RIM-116 RAM": "RAM \uADFC\uC811\uBC29\uACF5\uBBF8\uC0AC\uC77C",
  "MIM-104 Patriot": "\uD328\uD2B8\uB9AC\uC5C7",
  THAAD: "\uC0AC\uB4DC",
  "S-400 Triumf": "S-400 \uD2B8\uB9AC\uC6C0\uD504",
  "S-300V4": "S-300V4",
  "S-500 Prometey": "S-500 \uD504\uB85C\uBA54\uD14C\uC774",
  "Buk-M3": "Buk-M3",
  "Tor-M2": "Tor-M2",
  "Pantsir-S1": "\uD310\uCE58\uB974-S1",
  "HQ-9": "HQ-9",
  "HQ-19": "HQ-19",
  "HQ-16": "HQ-16",
  "HQ-17": "HQ-17",
  "HQ-7": "HQ-7",
  "Aster 30": "\uC544\uC2A4\uD130 30",
  "Barak 8": "\uBC14\uB77D 8",
  NASAMS: "NASAMS",
  "Kunsan Air Base": "\uAD70\uC0B0 \uACF5\uAD70\uAE30\uC9C0",
  "Osan Air Base": "\uC624\uC0B0 \uACF5\uAD70\uAE30\uC9C0",
  "Seoul Air Base": "\uC11C\uC6B8 \uACF5\uAD70\uAE30\uC9C0",
  "Seosan Air Base": "\uC11C\uC0B0 \uACF5\uAD70\uAE30\uC9C0",
  "Cheongju Air Base": "\uCCAD\uC8FC \uACF5\uAD70\uAE30\uC9C0",
  "Sacheon Air Base": "\uC0AC\uCC9C \uACF5\uAD70\uAE30\uC9C0",
  "P-8A Poseidon": "P-8A \uD3EC\uC138\uC774\uB3C8",
  "KF-21 Boramae": "KF-21 \uBCF4\uB77C\uB9E4",
  "FA-50 Fighting Eagle": "FA-50 \uD30C\uC774\uD305\uC774\uAE00",
  "KA-1 Woongbi": "KA-1 \uC6C5\uBE44",
  "AH-64E Apache Guardian": "AH-64E \uC544\uD30C\uCE58 \uAC00\uB514\uC5B8",
  "Shahed-136 Loitering Munition": "Shahed-136 \uC790\uD3ED\uB4DC\uB860",
  "T-50 Golden Eagle": "T-50 \uACE8\uB4E0\uC774\uAE00",
  "TA-50 Lead-In Fighter Trainer": "TA-50 \uC804\uC220\uC785\uBB38\uD6C8\uB828\uAE30",
  "F-15K Slam Eagle": "F-15K \uC2AC\uB7A8\uC774\uAE00",
  "KF-16": "KF-16",
  "E-737 Peace Eye AWACS": "E-737 \uD56D\uACF5\uD1B5\uC81C\uAE30",
  "KC-330 MRTT Tanker": "KC-330 \uACF5\uC911\uAE09\uC720\uAE30",
  "Jeongjo the Great-class Destroyer": "\uC815\uC870\uB300\uC655\uAE09 \uAD6C\uCD95\uD568",
  "Sejong the Great-class Destroyer": "\uC138\uC885\uB300\uC655\uAE09 \uAD6C\uCD95\uD568",
  "Chungmugong Yi Sun-sin-class Destroyer": "\uCDA9\uBB34\uACF5\uC774\uC21C\uC2E0\uAE09 \uAD6C\uCD95\uD568",
  "Daegu-class Frigate": "\uB300\uAD6C\uAE09 \uD638\uC704\uD568",
  "Incheon-class Frigate": "\uC778\uCC9C\uAE09 \uD638\uC704\uD568",
  "Dokdo-class Amphibious Assault Ship": "\uB3C5\uB3C4\uAE09 \uB300\uD615\uC218\uC1A1\uD568",
  "Yoon Youngha-class Patrol Craft": "\uC724\uC601\uD558\uAE09 \uC720\uB3C4\uD0C4\uACE0\uC18D\uD568",
  "Chunmoo MRLS": "\uCC9C\uBB34 \uB2E4\uC5F0\uC7A5\uB85C\uCF13",
  "Tactical Surface to Surface Missile Launcher": "\uC804\uC220\uC9C0\uB300\uC9C0\uC720\uB3C4\uBB34\uAE30 \uBC1C\uC0AC\uB300",
  "L-SAM": "L-SAM \uC7A5\uAC70\uB9AC \uBC29\uACF5\uCCB4\uACC4",
  "Cheongung-II (KM-SAM Block II)": "\uCC9C\uAD81-II",
  "Cheongung (M-SAM)": "\uCC9C\uAD81",
  "Pegasus (K-SAM)": "\uCC9C\uB9C8(K-SAM \uD398\uAC00\uC218\uC2A4)",
  "Biho Hybrid": "\uBE44\uD638 \uBCF5\uD569",
  KGGB: "KGGB \uC815\uBC00\uC720\uB3C4\uD3ED\uD0C4",
  "Chiron MANPADS": "\uC2E0\uAD81 \uD734\uB300\uC6A9 \uC9C0\uB300\uACF5\uBBF8\uC0AC\uC77C",
  "Pegasus SAM": "\uCC9C\uB9C8 \uC694\uACA9\uBBF8\uC0AC\uC77C",
  "Cheongung Interceptor": "\uCC9C\uAD81 \uC694\uACA9\uBBF8\uC0AC\uC77C",
  "Cheongung-II Interceptor": "\uCC9C\uAD81-II \uC694\uACA9\uBBF8\uC0AC\uC77C",
  "L-SAM Interceptor": "L-SAM \uC694\uACA9\uBBF8\uC0AC\uC77C",
  "C-Star (SSM-700K Haeseong)": "\uD574\uC131(C-Star) \uD568\uB300\uD568\uBBF8\uC0AC\uC77C",
  "Haegung (K-SAAM)": "\uD574\uAD81(K-SAAM) \uD568\uB300\uACF5\uBBF8\uC0AC\uC77C",
  "Red Shark (K-ASROC)": "\uD64D\uC0C1\uC5B4(K-ASROC)",
  "130mm Guided Rocket-II": "130mm \uC720\uB3C4\uB85C\uCF13-II",
  "FPV Loitering Munition": "FPV \uC790\uD3ED\uD0C4",
  "30mm Biho Airburst": "30mm \uBE44\uD638 \uACF5\uC911\uD3ED\uBC1C\uD0C4",
  "Hyungung Anti-Tank Missile": "\uD604\uAD81 \uB300\uC804\uCC28\uC720\uB3C4\uD0C4",
  "MICLIC Line Charge": "MICLIC \uC9C0\uB8B0\uC9C0\uB300\uAC1C\uCC99\uC120\uD615\uD3ED\uC57D",
  "AGM-114 Hellfire": "AGM-114 \uD5EC\uD30C\uC774\uC5B4",
  "Chunmoo Guided Rocket": "\uCC9C\uBB34 \uC720\uB3C4\uD0C4",
  "Tactical Surface to Surface Missile": "\uC804\uC220\uC9C0\uB300\uC9C0\uC720\uB3C4\uBB34\uAE30",
  "KSRR (Korea Short Range Rocket)": "KSRR \uB2E8\uAC70\uB9AC \uB85C\uCF13",
  "120mm Tank Round": "120mm \uC804\uCC28\uD3EC\uD0C4",
  "Tank Guided Missile": "\uC804\uCC28 \uC720\uB3C4\uD0C4",
  "Hyunmoo-2B": "\uD604\uBB34-2B",
  "Hyunmoo-3C": "\uD604\uBB34-3C",
  "Hyunmoo-4": "\uD604\uBB34-4",
  "K9 Thunder": "K-9 \uC790\uC8FC\uD3EC",
  "MQ-9 Reaper": "MQ-9 \uB9AC\uD37C",
  "AH-64 Apache": "AH-64 \uC544\uD30C\uCE58",
  "K2 Black Panther": "K2 \uD751\uD45C",
  "K808 Wheeled Armored Vehicle": "K808 \uCC28\uB95C\uD615\uC7A5\uAC11\uCC28",
  "KAAV Amphibious Assault Vehicle": "KAAV \uC0C1\uB959\uB3CC\uACA9\uC7A5\uAC11\uCC28",
  "KM900 APC": "KM900 \uCC28\uB95C\uD615 \uC7A5\uAC11\uCC28",
  "K21 Infantry Fighting Vehicle": "K21 \uBCF4\uBCD1\uC804\uD22C\uC7A5\uAC11\uCC28",
  "Multipurpose UGV": "\uB2E4\uBAA9\uC801 \uBB34\uC778\uC9C0\uC0C1\uCC28\uB7C9",
  "RCWS Light Tactical Vehicle": "RCWS \uC18C\uD615\uC804\uC220\uCC28\uB7C9",
  "M1150 Assault Breacher Vehicle": "M1150 \uC7A5\uC560\uBB3C\uAC1C\uCC99\uCC28\uB7C9",
  "T-80U Tank": "T-80U \uC804\uCC28",
  "Soldier Rifle Team": "\uC544\uAD70 \uC18C\uCD1D\uC218",
  "Quadruped Ground Robot": "\uB2E4\uC871\uBCF4\uD589\uB85C\uBD07",
  "Target Mannequin Cluster": "\uB9C8\uB124\uD0B9 \uD45C\uC801\uAD70",
  M113A1: "M113A1 \uC7A5\uAC11\uCC28",
  "M577 Command Vehicle": "M577 \uC9C0\uD718\uCC28\uB7C9",
  "Command Post Tent": "\uC9C0\uD718\uC18C \uD150\uD2B8",
  "Command Container": "\uCEE8\uD14C\uC774\uB108 \uC9C0\uD718\uC18C",
  "Command Tower": "\uD1B5\uC81C \uD0C0\uC6CC",
  "Training Observation Post": "\uD6C8\uB828 \uAD00\uCE21 \uC9C0\uC810"
};
var ENTITY_TYPE_LABELS = {
  aircraft: "\uD56D\uACF5\uAE30",
  drone: "\uB4DC\uB860",
  airbase: "\uAE30\uC9C0",
  army: "\uC9C0\uC0C1\uAD70",
  facility: "\uC9C0\uC0C1 \uBB34\uAE30\uCCB4\uACC4",
  tank: "\uC804\uCC28/\uC7A5\uAC11\uCC28",
  other: "\uAE30\uD0C0 \uC790\uC0B0",
  ship: "\uD568\uC815",
  referencePoint: "\uCC38\uC870\uC810",
  weapon: "\uBB34\uC7A5",
  circle: "\uC138\uB825"
};
var DOCTRINE_LABELS = {
  "Aircraft attack hostile aircraft": "\uD56D\uACF5\uAE30 \uC790\uB3D9 \uAD50\uC804",
  "Aircraft chase hostile aircraft": "\uD56D\uACF5\uAE30 \uCD94\uC801 \uBE44\uD589",
  "Aircraft RTB when out of range of homebase": "\uADC0\uD658 \uC5F0\uB8CC \uAE30\uC900 \uC801\uC6A9",
  "Aircraft RTB when strike mission complete": "\uD0C0\uACA9 \uC784\uBB34 \uD6C4 \uC790\uB3D9 \uBCF5\uADC0",
  "SAMs attack hostile aircraft": "\uBC29\uACF5\uCCB4\uACC4 \uC790\uB3D9 \uAD50\uC804",
  "Ships attack hostile aircraft": "\uD568\uC815 \uC790\uB3D9 \uAD50\uC804"
};
function isKoreanPriorityName(name) {
  return KOREAN_PRIORITY_NAMES.has(name);
}
function getDisplayName(name) {
  if (!name) return "";
  return DISPLAY_NAME_OVERRIDES[name] ?? name;
}
function getEntityTypeLabel(type) {
  if (!type) return "";
  return ENTITY_TYPE_LABELS[type] ?? type;
}
function getDoctrineLabel(key) {
  return DOCTRINE_LABELS[key] ?? key;
}
function sortByKoreanPriority(items, getName) {
  return [...items].sort((left, right) => {
    const leftName = getName(left);
    const rightName = getName(right);
    const leftPriority = isKoreanPriorityName(leftName) ? 0 : 1;
    const rightPriority = isKoreanPriorityName(rightName) ? 0 : 1;
    if (leftPriority !== rightPriority) {
      return leftPriority - rightPriority;
    }
    return getDisplayName(leftName).localeCompare(
      getDisplayName(rightName),
      "ko"
    );
  });
}

// js/vendor/kairos/src/utils/assetTypeCatalog.ts
var DRONE_AIRCRAFT_PATTERN = /\b(drone|uav|uas|ucav|fpv|vtol|loitering|munition|suicide|one-way|kamikaze|robin|pandion|canister|sword|mq-|rq-|global hawk|predator|reaper|bayraktar|wing loong|heron)\b|자폭|드론|무인기|배회/i;
var TANK_FACILITY_PATTERN = /\b(tank|mbt|abrams|leopard|k1|k2|k9|k21|ifv|infantry fighting vehicle|apc|afv|armored|armoured|ugv|unmanned ground vehicle|humvee|hmmwv|km900|m113(?:a\d+)?|m577|stryker|bradley|bmp|btr|lav|aavp|k808|kaav|m-atv|matv|oshkosh|rcws|m1150|abv|miclic|obstacle breacher)\b/i;
var PRIORITY_AIRCRAFT_CLASS_NAMES = [
  "P-8A Poseidon",
  "KF-21 Boramae",
  "FA-50 Fighting Eagle"
];
var PRIORITY_TANK_FACILITY_CLASS_NAMES = [
  "K2 Black Panther",
  "K21 Infantry Fighting Vehicle",
  "K808 Wheeled Armored Vehicle",
  "KAAV Amphibious Assault Vehicle"
];
var FIRES_FACILITY_PATTERN = /\b(biho|chunmoo|kooryong|k136|mortar|ksm|surface to surface|artillery|howitzer|mlrs|rocket|launcher|hyunmoo|himars|paladin|k9|k55)\b/i;
var SUPPORT_AIRCRAFT_PATTERN = /\b(kc-|kc-330|mrtt|mrt|c-\d+|e-3|e-7|e-737|aew|aew&c|rc-|p-8|tanker|transport|awacs)\b/i;
var OTHER_FACILITY_PATTERN = /\b(soldier|rifle team|infantry team|mannequin|target dummy|target cluster|dummy target|quadruped|ground robot|robot dog|unitree|command post tent|command container)\b/i;
function isDroneAircraftClassName(className) {
  return !!className && DRONE_AIRCRAFT_PATTERN.test(className);
}
function isTankFacilityClassName(className) {
  return !!className && TANK_FACILITY_PATTERN.test(className);
}
function isFiresFacilityClassName(className) {
  return !!className && FIRES_FACILITY_PATTERN.test(className);
}
function isSupportAircraftClassName(className) {
  return !!className && SUPPORT_AIRCRAFT_PATTERN.test(className);
}
function isOtherFacilityClassName(className) {
  return !!className && OTHER_FACILITY_PATTERN.test(className);
}
function compareAircraftClassNames(leftClassName, rightClassName) {
  const leftPriority = PRIORITY_AIRCRAFT_CLASS_NAMES.indexOf(
    leftClassName ?? ""
  );
  const rightPriority = PRIORITY_AIRCRAFT_CLASS_NAMES.indexOf(
    rightClassName ?? ""
  );
  if (leftPriority !== -1 || rightPriority !== -1) {
    if (leftPriority === -1) return 1;
    if (rightPriority === -1) return -1;
    return leftPriority - rightPriority;
  }
  return getDisplayName(leftClassName).localeCompare(
    getDisplayName(rightClassName),
    "ko"
  );
}
function compareTankFacilityClassNames(leftClassName, rightClassName) {
  const leftPriority = PRIORITY_TANK_FACILITY_CLASS_NAMES.indexOf(
    leftClassName ?? ""
  );
  const rightPriority = PRIORITY_TANK_FACILITY_CLASS_NAMES.indexOf(
    rightClassName ?? ""
  );
  if (leftPriority !== -1 || rightPriority !== -1) {
    if (leftPriority === -1) return 1;
    if (rightPriority === -1) return -1;
    return leftPriority - rightPriority;
  }
  return getDisplayName(leftClassName).localeCompare(
    getDisplayName(rightClassName),
    "ko"
  );
}

// js/vendor/kairos/src/utils/dateTimeFunctions.ts
function unixToLocalTime(unixTimestamp) {
  const date = new Date(unixTimestamp * 1e3);
  const hours = date.getHours() < 10 ? "0" + date.getHours().toString() : date.getHours();
  const minutes = "0" + date.getMinutes();
  const seconds = "0" + date.getSeconds();
  const formattedTime = hours + ":" + minutes.substring(minutes.length - 2) + ":" + seconds.substring(seconds.length - 2);
  return formattedTime;
}
function getLocalDateTime() {
  const now = /* @__PURE__ */ new Date();
  return now.toISOString();
}
function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
function formatNumberStringWithPlural(time, suffix) {
  return time + " " + suffix + (time > 1 ? "s" : "");
}
function formatSecondsToString(seconds) {
  if (seconds < 60) {
    return formatNumberStringWithPlural(seconds, "second");
  } else if (seconds < 3600) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return formatNumberStringWithPlural(minutes, "minute") + (remainingSeconds > 0 ? " " + formatNumberStringWithPlural(remainingSeconds, "second") : "");
  } else {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor(seconds % 3600 / 60);
    const remainingSeconds = seconds % 60;
    return formatNumberStringWithPlural(hours, "hour") + (minutes > 0 ? " " + formatNumberStringWithPlural(minutes, "minute") : "") + (remainingSeconds > 0 ? " " + formatNumberStringWithPlural(remainingSeconds, "second") : "");
  }
}

// js/vendor/kairos/src/utils/generateUUID.ts
function randomUUID() {
  if (crypto && typeof crypto?.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return generateUUID();
}
function generateUUID() {
  let uuid = "";
  const chars = "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx";
  for (let i = 0; i < chars.length; i++) {
    const randomValue = Math.random() * 16 | 0;
    if (chars[i] === "x") {
      uuid += randomValue.toString(16);
    } else if (chars[i] === "y") {
      uuid += (randomValue & 3 | 8).toString(16);
    } else {
      uuid += chars[i];
    }
  }
  return uuid;
}

// js/vendor/kairos/src/utils/mapFunctions.ts
function toRadians(degrees) {
  return degrees * Math.PI / 180;
}
function toDegrees(radians) {
  return radians * 180 / Math.PI;
}
function getBearingBetweenTwoPoints(startLatitude, startLongitude, destinationLatitude, destinationLongitude) {
  startLatitude = toRadians(startLatitude);
  startLongitude = toRadians(startLongitude);
  destinationLatitude = toRadians(destinationLatitude);
  destinationLongitude = toRadians(destinationLongitude);
  const y = Math.sin(destinationLongitude - startLongitude) * Math.cos(destinationLatitude);
  const x = Math.cos(startLatitude) * Math.sin(destinationLatitude) - Math.sin(startLatitude) * Math.cos(destinationLatitude) * Math.cos(destinationLongitude - startLongitude);
  const bearing = (toDegrees(Math.atan2(y, x)) + 360) % 360;
  return bearing;
}
function getDistanceBetweenTwoPoints(startLatitude, startLongitude, destinationLatitude, destinationLongitude) {
  const \u03C61 = toRadians(startLatitude);
  const \u03C62 = toRadians(destinationLatitude);
  const \u0394\u03C6 = toRadians(destinationLatitude - startLatitude);
  const \u0394\u03BB = toRadians(destinationLongitude - startLongitude);
  const a = Math.sin(\u0394\u03C6 / 2) * Math.sin(\u0394\u03C6 / 2) + Math.cos(\u03C61) * Math.cos(\u03C62) * Math.sin(\u0394\u03BB / 2) * Math.sin(\u0394\u03BB / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = EARTH_RADIUS_KM * c;
  return d;
}
function getTerminalCoordinatesFromDistanceAndBearing(startLatitude, startLongitude, distance, bearing) {
  const bearingInRadians = toRadians(bearing);
  const initialLatitude = toRadians(startLatitude);
  const initialLongitude = toRadians(startLongitude);
  const finalLatitude = toDegrees(
    Math.asin(
      Math.sin(initialLatitude) * Math.cos(distance / EARTH_RADIUS_KM) + Math.cos(initialLatitude) * Math.sin(distance / EARTH_RADIUS_KM) * Math.cos(bearingInRadians)
    )
  );
  const finalLongitude = toDegrees(
    initialLongitude + Math.atan2(
      Math.sin(bearingInRadians) * Math.sin(distance / EARTH_RADIUS_KM) * Math.cos(initialLatitude),
      Math.cos(distance / EARTH_RADIUS_KM) - Math.sin(initialLatitude) * Math.sin(finalLatitude)
    )
  );
  return [finalLatitude, finalLongitude];
}
function randomFloat(min = 0, max = 1) {
  return Math.random() * (max - min) + min;
}
function randomInt(min = 0, max = 100) {
  return Math.floor(Math.random() * (max - min + 1) + min);
}
function getNextCoordinates(originLatitude, originLongitude, destinationLatitude, destinationLongitude, platformSpeed) {
  const heading = getBearingBetweenTwoPoints(
    originLatitude,
    originLongitude,
    destinationLatitude,
    destinationLongitude
  );
  const totalDistanceKm = getDistanceBetweenTwoPoints(
    originLatitude,
    originLongitude,
    destinationLatitude,
    destinationLongitude
  );
  const totalTimeHours = totalDistanceKm * KILOMETERS_TO_NAUTICAL_MILES / (platformSpeed < 0 ? -platformSpeed : platformSpeed);
  const totalTimeSeconds = Math.max(Math.floor(totalTimeHours * 3600), 1e-4);
  const legDistanceKm = totalDistanceKm / totalTimeSeconds;
  if (totalDistanceKm < legDistanceKm) {
    return [destinationLatitude, destinationLongitude];
  }
  return getTerminalCoordinatesFromDistanceAndBearing(
    originLatitude,
    originLongitude,
    legDistanceKm,
    heading
  );
}

// js/vendor/kairos/src/utils/threatCoverage.ts
function normalizeAngleDegrees(angle) {
  return (angle % 360 + 360) % 360;
}
function smallestAngleDeltaDegrees(leftAngle, rightAngle) {
  const normalizedLeft = normalizeAngleDegrees(leftAngle);
  const normalizedRight = normalizeAngleDegrees(rightAngle);
  const delta = normalizedLeft - normalizedRight;
  return (delta + 540) % 360 - 180;
}
function isBearingInsideSector(bearingDegrees, sectorCenterDegrees, sectorArcDegrees) {
  if (sectorArcDegrees >= 360) {
    return true;
  }
  return Math.abs(
    smallestAngleDeltaDegrees(bearingDegrees, sectorCenterDegrees)
  ) <= sectorArcDegrees / 2;
}
function isTargetInsideSector(originLatitude, originLongitude, targetLatitude, targetLongitude, radiusNm, sectorCenterDegrees, sectorArcDegrees) {
  const distanceToTargetNm = getDistanceBetweenTwoPoints(
    originLatitude,
    originLongitude,
    targetLatitude,
    targetLongitude
  ) * KILOMETERS_TO_NAUTICAL_MILES;
  if (distanceToTargetNm > radiusNm) {
    return false;
  }
  const bearingToTarget = getBearingBetweenTwoPoints(
    originLatitude,
    originLongitude,
    targetLatitude,
    targetLongitude
  );
  return isBearingInsideSector(
    bearingToTarget,
    sectorCenterDegrees,
    sectorArcDegrees
  );
}
function buildSectorCoordinates(latitude, longitude, radiusNm, sectorCenterDegrees, sectorArcDegrees, segmentCount = 48) {
  const sectorCoordinates = [[longitude, latitude]];
  const radiusKm = radiusNm / KILOMETERS_TO_NAUTICAL_MILES;
  const boundedArc = Math.max(Math.min(sectorArcDegrees, 359.9), 1);
  const halfArc = boundedArc / 2;
  const startBearing = sectorCenterDegrees - halfArc;
  const totalSegments = Math.max(6, Math.ceil(boundedArc / 360 * segmentCount));
  for (let segmentIndex = 0; segmentIndex <= totalSegments; segmentIndex += 1) {
    const bearing = startBearing + boundedArc * segmentIndex / totalSegments;
    const [terminalLatitude, terminalLongitude] = getTerminalCoordinatesFromDistanceAndBearing(
      latitude,
      longitude,
      radiusKm,
      bearing
    );
    sectorCoordinates.push([terminalLongitude, terminalLatitude]);
  }
  sectorCoordinates.push([longitude, latitude]);
  return sectorCoordinates;
}
export {
  APP_DISPLAY_NAME,
  APP_DRAWER_WIDTH,
  APP_FULL_NAME,
  APP_GUIDE_RAIL_WIDTH,
  DEFAULT_OL_PROJECTION_CODE,
  DEFAULT_SUDO_DETECTOR_ENDPOINT,
  DEFAULT_SUDO_DRONE_VIDEO_ANTIALIASING,
  DEFAULT_SUDO_DRONE_VIDEO_GRAPHICS_QUALITY,
  DEFAULT_SUDO_OPERATIONAL_DATA_URL,
  DEFAULT_SUDO_SCENARIO_SOURCE_DATA_URL,
  EARTH_RADIUS_KM,
  EARTH_RADIUS_M,
  EMPTY_SUDO_DRONE_VIDEO_SOURCE,
  FACILITY_THREAT_PROFILES,
  GAME_SPEED_DELAY_MS,
  KILOMETERS_TO_NAUTICAL_MILES,
  NAUTICAL_MILES_TO_METERS,
  RECORDING_INTERVALS_SECONDS,
  SITUATION_ANALYSIS_CONTROL_ROADS,
  SUDO_AIC_LOGO_SRC,
  SUDO_ALERT_SIGNAL_IMAGE_SRC,
  SUDO_ANALYSIS_LOG_KEY,
  SUDO_ANALYSIS_RESULT_KEY,
  SUDO_ANALYSIS_STATUS_KEY,
  SUDO_ARTAS_HASH,
  SUDO_ARTAS_PATH,
  SUDO_ARTILLERY_BATTERY_IMAGE_SRC,
  SUDO_ARTILLERY_STRIKE_STEPS,
  SUDO_ARTILLERY_STRIKE_TOTAL,
  SUDO_ASSISTANT_152MM_VULNERABILITY_CARDS,
  SUDO_ASSISTANT_240MM_VULNERABILITY_CARDS,
  SUDO_ASSISTANT_QA_KEY,
  SUDO_ASSISTANT_T72_VULNERABILITY_CARDS,
  SUDO_ASSISTANT_T72_VULNERABILITY_IMAGE_SRC,
  SUDO_ASSISTANT_T72_VULNERABILITY_SOURCE_NAME,
  SUDO_ASSISTANT_VULNERABILITY_EVIDENCE_IMAGES,
  SUDO_ASSISTANT_VULNERABILITY_SOURCE_NAME,
  SUDO_BATTALION_SCALE_FRAME_IMAGE_SRC,
  SUDO_BATTALION_SWID_DRONE_VIEW_VIDEO_SRC,
  SUDO_BATTALION_TARGET_NATURE_FRAME_IMAGE_SRC,
  SUDO_BATTALION_TOD_SURVEILLANCE_VIDEO_SRC,
  SUDO_BDA_FIGURE_ID,
  SUDO_BDA_FIGURE_IMAGE_SRC,
  SUDO_BDA_SOURCE_NAME,
  SUDO_BDA_SOURCE_PATH,
  SUDO_CHUNGUI_AI_LOGO_SRC,
  SUDO_CHUNMOO_FIRE_1_VIDEO_SRC,
  SUDO_CHUNMOO_FIRE_2_VIDEO_SRC,
  SUDO_CHUNMOO_FIRE_FRAME_IMAGE_SRC,
  SUDO_CHUNMOO_INTRO_FRAME_IMAGE_SRC,
  SUDO_CHUNMOO_INTRO_VIDEO_SRC,
  SUDO_CHUNMOO_SPEC_SLIDE_IMAGE_SRC,
  SUDO_CHUNMOO_STRUCTURE_SLIDE_IMAGE_SRC,
  SUDO_COLLATERAL_CDE_COLUMNS,
  SUDO_COLLATERAL_CDE_ROWS,
  SUDO_COLLATERAL_CDE_SOURCE_NAME,
  SUDO_COLLATERAL_CDE_SOURCE_PATH,
  SUDO_COLLATERAL_REFERENCE_IMAGE_SRC,
  SUDO_COLLATERAL_REQUIRED_SAFETY_MARGIN_M,
  SUDO_COMMAND_CENTER_IMAGE_SRC,
  SUDO_CORPS_SCALE_FRAME_IMAGE_SRC,
  SUDO_CORPS_SWID_DRONE_VIEW_VIDEO_SRC,
  SUDO_CORPS_TARGET_NATURE_FRAME_IMAGE_SRC,
  SUDO_CORPS_TOD_SURVEILLANCE_VIDEO_SRC,
  SUDO_DATA_ENHANCEMENT_IDEAS,
  SUDO_DATA_EXTRACTION_SUMMARY,
  SUDO_DEFAULT_SUB_SCENARIO_ID,
  SUDO_DETECTOR_STREAM_FRESH_AGE_MS,
  SUDO_DETECTOR_STREAM_STALE_AGE_MS,
  SUDO_DRONE_REDEPLOYMENT_KEY,
  SUDO_DRONE_REDEPLOYMENT_SOURCE_ROWS,
  SUDO_DRONE_TARGET_DESCRIPTION_SOURCE_NAME,
  SUDO_DRONE_TARGET_SOURCE_NAME,
  SUDO_DRONE_TARGET_SOURCE_ROWS,
  SUDO_DRONE_VIDEO_PRESETS,
  SUDO_DRONE_VIDEO_SRC,
  SUDO_FIRE_PLAN_SOURCE_NAME,
  SUDO_FIRE_PLAN_SOURCE_PATH,
  SUDO_FIRE_PLAN_SOURCE_ROWS,
  SUDO_FIRING_UNIT_SOURCE_NAME,
  SUDO_FIRING_UNIT_SOURCE_PATH,
  SUDO_FIRING_UNIT_SOURCE_ROWS,
  SUDO_JANGDO_GIS_INTEL,
  SUDO_JANGDO_MOBILITY_2_VIDEO_SRC,
  SUDO_JANGDO_MOBILITY_3_VIDEO_SRC,
  SUDO_JANGDO_MOBILITY_VIDEO_SRC,
  SUDO_MAIN_HASH,
  SUDO_MAIN_PATH,
  SUDO_MULTI_VEHICLES_VIDEO_INGEST_SRC,
  SUDO_MULTI_VEHICLES_VIDEO_SRC,
  SUDO_MUNITION_EFFECT_COLUMNS,
  SUDO_MUNITION_EFFECT_SOURCE_NAME,
  SUDO_MUNITION_EFFECT_SOURCE_PATH,
  SUDO_MUNITION_EFFECT_SOURCE_ROWS,
  SUDO_OBJECT_RECOGNITION_VIDEO_SRC,
  SUDO_OPERATION_AREA_IMAGE_SRC,
  SUDO_ORDER_CANDIDATE_SOURCE_NAME,
  SUDO_ORDER_CANDIDATE_SOURCE_ROWS,
  SUDO_ORDER_REFERENCE_IMAGE_SRC,
  SUDO_RD_ASSESSMENT_SOURCE_NAME,
  SUDO_RD_ASSESSMENT_SOURCE_PATH,
  SUDO_RD_ASSESSMENT_SOURCE_ROWS,
  SUDO_ROAD_INFO_SOURCE_ROWS,
  SUDO_ROCKET_LAUNCHER_IMAGE_SRC,
  SUDO_SCALE_DOCTRINE_ROWS,
  SUDO_SCALE_DRONE_FRAME_IMAGE_SRC,
  SUDO_SCALE_FORMATION_REFERENCE_IMAGE_SRC,
  SUDO_SCALE_SOURCE_NAME,
  SUDO_SCALE_SOURCE_PATH,
  SUDO_SCENARIO_1_DETECTOR_DISPLAY_CONFIDENCE,
  SUDO_SCENARIO_5_DEMO_NEAREST_CIVILIAN_M,
  SUDO_SCENARIO_COMMAND_KEY,
  SUDO_SCENARIO_COUNT,
  SUDO_SCENARIO_LEVEL_MEDIA,
  SUDO_SCENARIO_STATE_UPDATED_EVENT,
  SUDO_SITUATION_ANALYSIS_BASE_MAP_IMAGE_SRC,
  SUDO_SITUATION_ANALYSIS_SOURCE_NAME,
  SUDO_SITUATION_ANALYSIS_SOURCE_PATH,
  SUDO_SITUATION_ROUTE_SOURCE_ROWS,
  SUDO_STRIKE_ASSET_SOURCE_ROWS,
  SUDO_STRIKE_METHOD_SOURCE_ROWS,
  SUDO_STRIKE_SEQUENCE_STEPS,
  SUDO_STRIKE_SEQUENCE_TOTAL,
  SUDO_SUB_HASH,
  SUDO_SUB_PATH,
  SUDO_SWID_DRONE_VIEW_VIDEO_SRC,
  SUDO_TANK_CONVOY_IMAGE_SRC,
  SUDO_TANK_VIDEO_SRC,
  SUDO_TARGET_CLASSIFICATION_EVIDENCE_ROWS,
  SUDO_TARGET_CLASSIFICATION_MEDIA_ROWS,
  SUDO_TARGET_CLASSIFICATION_SOURCE_NAME,
  SUDO_TARGET_DRONE_VIDEO_PRESETS,
  SUDO_TARGET_NATURE_FRAME_IMAGE_SRC,
  SUDO_TOD_SURVEILLANCE_VIDEO_SRC,
  buildAssetSignature,
  buildDefaultSudoDecisionInputs,
  buildDefaultSudoDroneRedeploymentCommand,
  buildFallbackSudoScenarioSourceStage,
  buildIdleSudoOperationalDataState,
  buildMockSudoVlmAnalysis,
  buildPublicAssetPath,
  buildReadySudoOperationalDataState,
  buildSectorCoordinates,
  buildSudoArtasPath,
  buildSudoAssistantVulnerabilitySourceTables,
  buildSudoBdaSourceTable,
  buildSudoCollateralCdeSourceTable,
  buildSudoCollateralMunitionsFromCde,
  buildSudoDataEnhancementIdeaSummary,
  buildSudoDataExtractionHealthSummary,
  buildSudoDataExtractionIssueSummary,
  buildSudoDataExtractionPromptLines,
  buildSudoDataExtractionRoleSummary,
  buildSudoDecisionInputsFromOperationalData,
  buildSudoDetectionTimeline,
  buildSudoDetectionTrackSummary,
  buildSudoDetectorRuntimeBadges,
  buildSudoDetectorSnapshotUrl,
  buildSudoDetectorStreamQualitySummary,
  buildSudoDetectorStreamUrl,
  buildSudoDetectorTimingsFromStreamStats,
  buildSudoDroneIdentificationRowsForDecision,
  buildSudoDroneRedeploymentDecisionInputs,
  buildSudoDroneRedeploymentSourceTable,
  buildSudoDroneTargetSourceTable,
  buildSudoDroneVideoPresets,
  buildSudoFirePlanDecisionInputs,
  buildSudoFirePlanSourceTable,
  buildSudoFiringUnitDecisionInputs,
  buildSudoFiringUnitSourceTable,
  buildSudoFtxReport,
  buildSudoFtxReportCsv,
  buildSudoFtxReportMarkdown,
  buildSudoMainPath,
  buildSudoMunitionEffectDecisionRules,
  buildSudoMunitionEffectSourceTable,
  buildSudoOrderCandidateSourceTable,
  buildSudoPerceptionComparison,
  buildSudoProgressItems,
  buildSudoProgressSummary,
  buildSudoRdAssessmentDecisionInputs,
  buildSudoRdAssessmentSourceTable,
  buildSudoRdAssessmentVerdict,
  buildSudoRoadInfoDecisionInputs,
  buildSudoScaleDoctrineSourceTable,
  buildSudoScenarioDataIntelCopyText,
  buildSudoScenarioDataIntelPromptLines,
  buildSudoScenarioImageEvidenceSummary,
  buildSudoScenarioSourceBindingSummary,
  buildSudoScenarioSourceDecisionBindings,
  buildSudoScenarioSourceDecisionInputPatch,
  buildSudoScenarioSourceInputPatchSuggestions,
  buildSudoScenarioSourceInputPatchSummary,
  buildSudoScenarioSourceStageLines,
  buildSudoSituationAnalysisSourceTables,
  buildSudoSituationRouteDecisionInputs,
  buildSudoStrikeAssessmentVerdict,
  buildSudoStrikeAssetDecisionInputs,
  buildSudoStrikeAssetSourceTable,
  buildSudoStrikeMethodSourceTable,
  buildSudoSubHash,
  buildSudoSubPath,
  buildSudoTargetClassificationEvidenceTable,
  buildSudoTargetClassificationMediaTable,
  buildUnavailableSudoVlmAnalysis,
  canonicalizeTargetLabel,
  captureVideoFramesAsBase64,
  checkSudoOllamaHealth,
  clearSudoDroneVideoSettings,
  clearSudoOllamaSettings,
  colorPalette,
  compareAircraftClassNames,
  compareTankFacilityClassNames,
  defaultSudoDecisionInputs,
  delay,
  findSudoScenarioSourceStage,
  formatSecondsToString,
  formatSudoDataEnhancementIdea,
  formatSudoDetectorDeviceLabel,
  formatSudoDetectorStreamFreshnessLabel,
  formatSudoDetectorTimingSummary,
  formatSudoGisIntelCounts,
  formatSudoOrderDistance,
  formatSudoScenarioImplementationLevel,
  formatSudoSourceDisplayLabel,
  getBearingBetweenTwoPoints,
  getConfiguredSudoDroneVideoSource,
  getCoreSudoDataEnhancementIdeas,
  getDefaultSudoAssistantModel,
  getDefaultSudoOllamaEndpoint,
  getDefaultSudoVlmModel,
  getDefenseProxyModelLabel,
  getDisplayName,
  getDistanceBetweenTwoPoints,
  getDoctrineLabel,
  getEntityTypeLabel,
  getExplicitSudoDroneVideoSource,
  getFacilityDetectionArcDegrees,
  getFacilityThreatProfile,
  getFacilityThreatRange,
  getLocalDateTime,
  getNextCoordinates,
  getPublicAssetBaseUrl,
  getSudoArtilleryStrikeButtonLabel,
  getSudoArtilleryStrikeHoverText,
  getSudoAssistantVulnerabilityCardsForTarget,
  getSudoCollateralCdeRowsForVisual,
  getSudoDataEnhancementIdeaStatusLabel,
  getSudoDecisionOutput,
  getSudoDetectorEndpoint,
  getSudoDetectorStreamAgeMs,
  getSudoDetectorStreamFreshness,
  getSudoDroneFeedGraphicsSettings,
  getSudoDroneFeedQualityForFlightSim,
  getSudoDroneIdentificationRowsForVisual,
  getSudoDroneLauncherDetections,
  getSudoDroneVideoSource,
  getSudoFirePlanRowsForVisual,
  getSudoMunitionEffectRowsForVisual,
  getSudoOllamaEndpoint,
  getSudoOperationalDataUrl,
  getSudoProgressStatusColor,
  getSudoProgressStatusLabel,
  getSudoRdAssessmentRowsForVisual,
  getSudoRouteQueryParams,
  getSudoScaleDoctrineRowsForVisual,
  getSudoScenario,
  getSudoScenarioDataIntel,
  getSudoScenarioEnhancementIdeas,
  getSudoScenarioImageEvidence,
  getSudoScenarioLevelMedia,
  getSudoScenarioReference,
  getSudoScenarioSourceDataUrl,
  getSudoScenarioSourceInputPatchStatusLabel,
  getSudoStrikeMethodRowsForVisual,
  getSudoStrikeSequenceHoverText,
  getSudoStrikeSequenceStep,
  getSudoTargetDroneVideoPresetId,
  getSudoTargetDroneVideoPresets,
  getSudoVlmModel,
  getTerminalCoordinatesFromDistanceAndBearing,
  inferDefenseProxyVisualProfileId,
  inferSudoTargetFromDetections,
  inspectSudoPlaybackSource,
  interpolateSudoDetectionTrack,
  isBearingInsideSector,
  isConceptOnlyDefenseAssetSignature,
  isDefenseAssetSignature,
  isDroneAircraftClassName,
  isFiresFacilityClassName,
  isKoreanPriorityName,
  isOtherFacilityClassName,
  isSudoArtasRoute,
  isSudoMainRoute,
  isSudoPathRoute,
  isSudoSubRoute,
  isSupportAircraftClassName,
  isTankFacilityClassName,
  isTargetInsideSector,
  kmToNm,
  loadImageAsBase64,
  loadSudoOperationalData,
  loadSudoScenarioSourceData,
  mergeDetectorDetections,
  mergeSudoScenarioSourceValues,
  normalizeAngleDegrees,
  normalizeSudoDecisionInputs,
  normalizeSudoDetectorResponse,
  normalizeSudoOllamaEndpointInput,
  normalizeSudoOperationalDataDocument,
  normalizeSudoOperationalDecisionPatch,
  normalizeSudoScenarioDemoDecisionInputs,
  normalizeSudoScenarioSourceData,
  normalizeSudoScenarioSourceStage,
  parseSudoScenarioId,
  parseSudoScenarioLevel,
  publishSudoAnalysisResultCommand,
  publishSudoAnalysisStatusCommand,
  publishSudoAssistantQaCommand,
  publishSudoDroneRedeploymentCommand,
  publishSudoScenarioCommand,
  randomFloat,
  randomInt,
  randomUUID,
  readLatestSudoAnalysisLogItems,
  readLatestSudoAnalysisResultCommand,
  readLatestSudoAnalysisStatusCommand,
  readLatestSudoAssistantQaCommand,
  readLatestSudoDroneRedeploymentCommand,
  readLatestSudoScenarioCommand,
  readSudoDroneVideoSettings,
  readSudoOllamaSettings,
  redactSudoMediaDiagnostic,
  redactSudoMediaUrl,
  refineSudoDetectionLabels,
  requestSudoDetectorAnalysis,
  requestSudoDetectorHealth,
  requestSudoDetectorProbe,
  requestSudoDetectorSnapshotFrame,
  requestSudoDetectorStreamStats,
  requestSudoVlmAnalysis,
  resolveDefenseVisualizationPolicy,
  resolvePublicAssetPath,
  routeSudoSubWindowToScenario,
  smallestAngleDeltaDegrees,
  smoothSudoDetectionsByTrack,
  sortByKoreanPriority,
  sortSudoDataEnhancementIdeas,
  subscribeSudoAnalysisLogItems,
  subscribeSudoAnalysisResultCommand,
  subscribeSudoAnalysisStatusCommand,
  subscribeSudoAssistantQaCommand,
  subscribeSudoDroneRedeploymentCommand,
  subscribeSudoScenarioCommand,
  sudoDroneLauncherDetectionTracks,
  sudoScenarioReferences,
  sudoScenarios,
  summarizeSudoSourceDisplayValues,
  toDegrees,
  toRadians,
  trackSudoLauncherFromImageData,
  unixToLocalTime,
  writeSudoDroneVideoSettings,
  writeSudoOllamaSettings
};
