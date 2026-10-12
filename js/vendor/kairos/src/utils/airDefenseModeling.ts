import {
  getFacilityThreatProfile,
  type FacilityThreatProfile,
} from "../game/db/facilityThreatProfiles";

export type DefenseProxyVisualProfileId =
  | "artillery-patriot"
  | "artillery-nasams-battery"
  | "artillery-thaad";

export type DefenseVisualizationTier = "point" | "area" | "strategic";

export type DefenseConceptVariant =
  | "defense-point-launcher"
  | "defense-point-hybrid"
  | "defense-area"
  | "defense-strategic";

export interface DefenseVisualizationPolicy {
  tier: DefenseVisualizationTier;
  mode: "closest" | "concept";
  proxyVisualProfileId: DefenseProxyVisualProfileId | null;
  proxyModelLabel: string | null;
  conceptVariant: DefenseConceptVariant;
  threatRangeNm: number | null;
  detectionArcDegrees: number | null;
  sourceLabel: string | null;
  categoryLabel: string;
  silhouetteLabel: string;
  reasonLabel: string;
  title: string;
  description: string;
}

const DEFENSE_SIGNATURE_PATTERN =
  /\b(sam|patriot|nasams|thaad|cheongung|km-sam|m-sam|l-sam|pegasus|biho|vads|chaparral|radar|air defense|surface-to-air|surface to air|antiair|anti-air|interceptor|s-400|s-300|s-500|buk|tor|pantsir|hq-9|hq-19|hq-16|hq-17|hq-7|aster|barak|manpads|chiron|samp\/t|samp-t|iron dome|spyder)\b/i;

const EXACT_DEFENSE_FAMILY_PATTERN = /\b(patriot|mim-104|nasams|thaad)\b/i;

const POINT_DEFENSE_PATTERN =
  /\b(pegasus|k-sam|biho|tor|pantsir|hq-17|hq-7|vads|chaparral|manpads|chiron|iron dome|spyder|shorad|short range)\b/i;

const POINT_DEFENSE_HYBRID_PATTERN = /\b(pantsir|biho|vads)\b/i;

const STRATEGIC_DEFENSE_PATTERN =
  /\b(l-sam|s-500|hq-19|upper tier|exoatmospheric|ballistic missile defense)\b/i;

const PATRIOT_PROXY_PATTERN =
  /\b(cheongung|km-sam|m-sam|s-400|s-300|hq-9|aster 30|barak 8|samp\/t|samp-t)\b/i;

const NASAMS_BATTERY_PROXY_PATTERN = /\b(buk-m3|hq-16)\b/i;

const THAAD_PROXY_PATTERN = /\b(l-sam|s-500|hq-19)\b/i;

const THREAT_PROFILE_ALIASES: Array<{
  pattern: RegExp;
  className: string;
}> = [
  { pattern: /\b(mim-104|patriot)\b/i, className: "MIM-104 Patriot" },
  { pattern: /\b(nasams)\b/i, className: "NASAMS" },
  { pattern: /\b(thaad)\b/i, className: "THAAD" },
  { pattern: /\b(l-sam)\b/i, className: "L-SAM" },
  {
    pattern: /\b(cheongung-ii|km-sam block ii)\b/i,
    className: "Cheongung-II (KM-SAM Block II)",
  },
  {
    pattern: /\b(cheongung|m-sam)\b/i,
    className: "Cheongung (M-SAM)",
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
  { pattern: /\b(barak 8)\b/i, className: "Barak 8" },
];

function getDefenseCategoryLabel(tier: DefenseVisualizationTier) {
  switch (tier) {
    case "point":
      return "근접 점방어";
    case "area":
      return "구역 방공";
    case "strategic":
      return "상층 방공";
  }
}

function getDefenseConceptVariant(
  tier: DefenseVisualizationTier,
  signature: string
): DefenseConceptVariant {
  switch (tier) {
    case "point":
      return POINT_DEFENSE_HYBRID_PATTERN.test(signature)
        ? "defense-point-hybrid"
        : "defense-point-launcher";
    case "area":
      return "defense-area";
    case "strategic":
      return "defense-strategic";
  }
}

function getDefenseSilhouetteLabel(
  tier: DefenseVisualizationTier,
  signature: string
) {
  switch (tier) {
    case "point":
      return POINT_DEFENSE_HYBRID_PATTERN.test(signature)
        ? "포·미사일 복합 점방어"
        : "미사일 중심 점방어";
    case "area":
      return "배터리형 구역방공";
    case "strategic":
      return "상층 요격 포대";
  }
}

export function getDefenseProxyModelLabel(
  profileId: DefenseProxyVisualProfileId
) {
  switch (profileId) {
    case "artillery-patriot":
      return "Patriot";
    case "artillery-nasams-battery":
      return "NASAMS Battery";
    case "artillery-thaad":
      return "THAAD";
  }
}

export function buildAssetSignature(className: string, name = "") {
  return `${className} ${name}`.trim().toLowerCase();
}

export function isDefenseAssetSignature(signature: string) {
  return DEFENSE_SIGNATURE_PATTERN.test(signature);
}

function formatSourceLabel(profile: FacilityThreatProfile | undefined) {
  if (!profile) {
    return null;
  }
  if (profile.sourceNote) {
    return profile.sourceNote;
  }
  if (!profile.sourceUrl) {
    return null;
  }

  try {
    return new URL(profile.sourceUrl).hostname.replace(/^www\./, "");
  } catch {
    return profile.sourceUrl;
  }
}

function resolveThreatProfileBySignature(signature: string) {
  for (const alias of THREAT_PROFILE_ALIASES) {
    if (alias.pattern.test(signature)) {
      return getFacilityThreatProfile(alias.className);
    }
  }

  return undefined;
}

function resolveDefenseThreatProfile(className: string, signature: string) {
  return (
    getFacilityThreatProfile(className) ??
    resolveThreatProfileBySignature(signature)
  );
}

function inferDefenseTier(
  signature: string,
  threatProfile: FacilityThreatProfile | undefined
): DefenseVisualizationTier {
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

function pickProxyVisualProfileId(
  signature: string,
  tier: DefenseVisualizationTier,
  threatProfile: FacilityThreatProfile | undefined
): DefenseProxyVisualProfileId | null {
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
  if (
    threatProfile.range <= 55 &&
    threatProfile.detectionArcDegrees <= 130
  ) {
    return "artillery-nasams-battery";
  }

  return "artillery-patriot";
}

function buildReasonLabel(
  categoryLabel: string,
  threatProfile: FacilityThreatProfile | undefined
) {
  if (!threatProfile) {
    return `${categoryLabel} 분류, 공개 제원 부족으로 보수적으로 표현`;
  }

  return `${categoryLabel} 분류, 사거리 ${threatProfile.range} NM / 탐지각 ${threatProfile.detectionArcDegrees}° 기준`;
}

function buildDescription(
  mode: DefenseVisualizationPolicy["mode"],
  categoryLabel: string,
  proxyModelLabel: string | null,
  threatProfile: FacilityThreatProfile | undefined
) {
  const basisLabel = threatProfile
    ? `사거리 ${threatProfile.range} NM와 탐지각 ${threatProfile.detectionArcDegrees}°`
    : "시그니처 분류";

  if (mode === "closest" && proxyModelLabel) {
    return `${basisLabel} 기준 ${categoryLabel} 계층으로 판단해 ${proxyModelLabel} 계열 프록시로 표시합니다.`;
  }

  return `근접한 GLB도 충분히 유사하지 않아, ${basisLabel} 기준 ${categoryLabel} 개념형 프리뷰로 제한합니다.`;
}

function resolveDefenseVisualizationPolicyFromSignature(
  className: string,
  signature: string
): DefenseVisualizationPolicy | null {
  if (
    !isDefenseAssetSignature(signature) ||
    EXACT_DEFENSE_FAMILY_PATTERN.test(signature)
  ) {
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
  const proxyModelLabel = proxyVisualProfileId
    ? getDefenseProxyModelLabel(proxyVisualProfileId)
    : null;

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
    title:
      mode === "closest"
        ? `${categoryLabel} 근접 대체 3D`
        : `${categoryLabel} 개념 프리뷰`,
    description: buildDescription(
      mode,
      categoryLabel,
      proxyModelLabel,
      threatProfile
    ),
  };
}

function resolveDefenseVisualizationPolicyBySignature(signature: string) {
  return resolveDefenseVisualizationPolicyFromSignature(signature, signature);
}

export function resolveDefenseVisualizationPolicy(className: string, name = "") {
  return resolveDefenseVisualizationPolicyFromSignature(
    className,
    buildAssetSignature(className, name)
  );
}

export function isConceptOnlyDefenseAssetSignature(signature: string) {
  return resolveDefenseVisualizationPolicyBySignature(signature)?.mode === "concept";
}

export function inferDefenseProxyVisualProfileId(
  signature: string
): DefenseProxyVisualProfileId | null {
  const policy = resolveDefenseVisualizationPolicyBySignature(signature);

  return policy?.mode === "closest" ? policy.proxyVisualProfileId : null;
}
