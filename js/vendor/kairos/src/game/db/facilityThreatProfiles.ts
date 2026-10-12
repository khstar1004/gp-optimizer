import { KILOMETERS_TO_NAUTICAL_MILES } from "../../utils/constants";

export interface FacilityThreatProfile {
  className: string;
  range: number;
  detectionArcDegrees: number;
  sourceUrl?: string;
  sourceNote?: string;
}

function profile(
  className: string,
  range: number,
  detectionArcDegrees: number,
  sourceUrl?: string,
  sourceNote?: string
): FacilityThreatProfile {
  return {
    className,
    range,
    detectionArcDegrees,
    sourceUrl,
    sourceNote,
  };
}

// NOTE:
// `range` remains in the engine's existing gameplay unit scale. The engine/UI
// currently label these values as NM, so we avoid a full unit migration here
// and centralize per-class defaults plus directional coverage in one place.
export const FACILITY_THREAT_PROFILES: FacilityThreatProfile[] = [
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
  ),
];

const facilityThreatProfileMap = new Map(
  FACILITY_THREAT_PROFILES.map((profileEntry) => [
    profileEntry.className,
    profileEntry,
  ])
);

export function getFacilityThreatProfile(
  className?: string | null
): FacilityThreatProfile | undefined {
  if (!className) return undefined;
  return facilityThreatProfileMap.get(className);
}

export function getFacilityThreatRange(
  className?: string | null,
  fallbackRange = 250
): number {
  return getFacilityThreatProfile(className)?.range ?? fallbackRange;
}

export function getFacilityDetectionArcDegrees(
  className?: string | null,
  fallbackArc = 120
): number {
  return getFacilityThreatProfile(className)?.detectionArcDegrees ?? fallbackArc;
}

export function kmToNm(km: number): number {
  return Number((km * KILOMETERS_TO_NAUTICAL_MILES).toFixed(2));
}
