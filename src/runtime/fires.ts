// @ts-nocheck
/**
 * 화력운용 판단 — KAIROS(수도) 교리 데이터·판단 로직을 그대로 호출한다.
 *
 * 원본 (js/vendor/kairos/kairos.bundle.js ← D:\VISTA_sudo\client\src):
 *   sudoMunitionEffectIntel   탄종·발수 판단표 (표적 × 사거리대 × 지형 × 사격단위 → 요망효과 10/20/30%)
 *   sudoCollateralCdeTable    부수피해평가(CDE) — 사거리별 탄종 안전거리, 탄종별 피해반경
 *   sudoFiringUnitIntel       사격부대 제원 (사거리·생존성·탄약·CSR·민간피해)
 *   sudoFirePlanIntel         사격계획·타격수단·타격자산 원표
 *   sudoStrikeSequence        타격 6단계 절차 (SEAD → CAS → TOT → BDA → 재타격)
 *   sudoDecisionEngine        SUDO_COLLATERAL_REQUIRED_SAFETY_MARGIN_M (300m) 등 결심 상수
 *   utils/threatCoverage      FACILITY_THREAT_PROFILES — 실무기체계 사거리·탐지호(공개출처)
 *
 * 이 파일은 GP 상황(표적 사거리·지형·아군 시설 위치)을 원본 계약에 맞춰 넘기고
 * 결과를 표시용으로 정리할 뿐, 판단 규칙을 다시 구현하지 않는다.
 */
import {
  SUDO_MUNITION_EFFECT_SOURCE_ROWS,
  SUDO_MUNITION_EFFECT_COLUMNS,
  buildSudoMunitionEffectSourceTable,
  SUDO_COLLATERAL_CDE_ROWS,
  buildSudoCollateralMunitionsFromCde,
  SUDO_FIRING_UNIT_SOURCE_ROWS,
  buildSudoFiringUnitDecisionInputs,
  SUDO_FIRE_PLAN_SOURCE_ROWS,
  SUDO_STRIKE_ASSET_SOURCE_ROWS,
  SUDO_STRIKE_METHOD_SOURCE_ROWS,
  SUDO_STRIKE_SEQUENCE_STEPS,
  SUDO_COLLATERAL_REQUIRED_SAFETY_MARGIN_M,
  SUDO_SCALE_DOCTRINE_ROWS,
  FACILITY_THREAT_PROFILES,
  getFacilityThreatProfile,
  getFacilityThreatRange,
} from '../../js/vendor/kairos/kairos.bundle';

export {
  SUDO_MUNITION_EFFECT_SOURCE_ROWS, SUDO_MUNITION_EFFECT_COLUMNS,
  SUDO_COLLATERAL_CDE_ROWS, SUDO_FIRING_UNIT_SOURCE_ROWS,
  SUDO_FIRE_PLAN_SOURCE_ROWS, SUDO_STRIKE_ASSET_SOURCE_ROWS,
  SUDO_STRIKE_METHOD_SOURCE_ROWS, SUDO_STRIKE_SEQUENCE_STEPS,
  SUDO_SCALE_DOCTRINE_ROWS, SUDO_COLLATERAL_REQUIRED_SAFETY_MARGIN_M,
  FACILITY_THREAT_PROFILES, getFacilityThreatProfile, getFacilityThreatRange,
  buildSudoMunitionEffectSourceTable, buildSudoFiringUnitDecisionInputs,
};

/** 탄종별 부수피해 반경 (원본 CDE 표에서 산출) — 모듈 로드 시 1회 */
export const COLLATERAL_MUNITIONS = buildSudoCollateralMunitionsFromCde();

/** GP→표적 거리(m)를 원본 표의 사거리대 라벨로 (원본 rangeBand: '0~6km' / '6~12km' …) */
export function rangeBandFor(distanceM) {
  const km = distanceM / 1000;
  const bands = [...new Set(SUDO_MUNITION_EFFECT_SOURCE_ROWS.map((r) => r.rangeBand))];
  for (const band of bands) {
    const m = band.match(/([\d.]+)\s*~\s*([\d.]+)/);
    if (m && km >= Number(m[1]) && km < Number(m[2])) return band;
  }
  // 표의 최소/최대 밖이면 가장 가까운 대역으로 (GP 교전은 대개 최하단 대역)
  return bands[0] ?? null;
}

/** KAIROS terrainIntel 의 지형 분류 → 탄약효과표의 terrainClass ('open' | 'covered') */
export function terrainClassFor(terrainClassLabel, forestRatio = 0) {
  if (typeof terrainClassLabel === 'string'
    && /산지|산림|도심|험준/.test(terrainClassLabel)) return 'covered';
  return forestRatio >= 0.4 ? 'covered' : 'open';
}

/**
 * 탄종·발수 판단 — 원본 표를 표적/사거리대/지형/사격단위로 조회한다.
 * @returns [{ fireUnit, effects: { '10': 'HE ③', '20': …, '30': … }, row }]
 */
export function munitionEffects({ distanceM, terrainClassLabel, targetType = null, forestRatio = 0 }) {
  const rangeBand = rangeBandFor(distanceM);
  const terrainClass = terrainClassFor(terrainClassLabel, forestRatio);
  const rows = SUDO_MUNITION_EFFECT_SOURCE_ROWS.filter((r) =>
    r.rangeBand === rangeBand
    && r.terrainClass === terrainClass
    && (!targetType || r.targetType === targetType));
  return {
    rangeBand,
    terrainClass,
    terrainLabel: rows[0]?.terrainLabel ?? (terrainClass === 'covered' ? '산림/도심' : '개활지'),
    options: rows.map((r) => ({
      fireUnit: r.fireUnit, targetType: r.targetType, effects: r.effectCells, source: r.source, row: r,
    })),
  };
}

/**
 * 부수피해 판단 — 탄종별 피해반경 + 원본 요구 안전여유(300m)로
 * 아군 시설(배치 건물·GP)과의 이격을 검증한다.
 * @param nearestFriendlyM 표적에서 가장 가까운 아군 시설까지 거리(m)
 */
export function collateralCheck(nearestFriendlyM) {
  const margin = SUDO_COLLATERAL_REQUIRED_SAFETY_MARGIN_M;
  return COLLATERAL_MUNITIONS.map((m) => {
    const required = m.radiusM + margin;
    return {
      munition: m.munition,
      radiusM: m.radiusM,
      requiredM: required,
      safe: Number.isFinite(nearestFriendlyM) ? nearestFriendlyM >= required : null,
      shortfallM: Number.isFinite(nearestFriendlyM) ? Math.max(0, required - nearestFriendlyM) : null,
    };
  });
}

/**
 * 사격부대 가용 판단 — 원본 제원표를 GP 표적 거리로 재평가한다.
 * 원본 행의 maxRangeKm·생존성·탄약·CSR·민간피해는 그대로 쓰고,
 * 사거리 판정만 이 표적 거리로 다시 계산한다(원본 rangeJudgment 규칙과 동일한 비교).
 */
export function firingUnits(distanceM) {
  const km = distanceM / 1000;
  return SUDO_FIRING_UNIT_SOURCE_ROWS.map((r) => {
    const inRange = km <= r.maxRangeKm;
    return {
      ...r,
      targetDistanceKm: Math.round(km * 10) / 10,
      inRange,
      // 사격 가능 = 사거리 내 && 원본 전투상태 가용
      firable: inRange && r.combatReady,
      judgment: `${(Math.round(km * 10) / 10)}km / 최대 ${r.maxRangeKm}km — ${inRange ? '사거리 내' : '사거리 초과'}`,
    };
  }).sort((a, b) => Number(b.firable) - Number(a.firable) || a.maxRangeKm - b.maxRangeKm);
}

/**
 * 화력운용 종합 판단.
 * @param opts.distanceM         GP→표적 거리
 * @param opts.terrainClassLabel KAIROS 지형분석의 terrainClass (없으면 개활지 가정)
 * @param opts.nearestFriendlyM  표적↔최근접 아군 시설 거리
 * @param opts.forestRatio       KAIROS forestSampleRatio
 */
export function fireDecision(opts) {
  const effects = munitionEffects(opts);
  const collateral = collateralCheck(opts.nearestFriendlyM);
  const units = firingUnits(opts.distanceM);
  const firable = units.filter((u) => u.firable);
  const safeMunitions = collateral.filter((c) => c.safe !== false);

  // 권고: 사격 가능 부대 중 민간피해 없는 부대 우선, 부수피해 반경이 가장 작은 탄종
  const recommendedUnit = firable.find((u) => u.civilianSafe) ?? firable[0] ?? null;
  const recommendedMunition = safeMunitions.sort((a, b) => a.radiusM - b.radiusM)[0] ?? null;

  return {
    ...effects,
    collateral,
    units,
    recommendedUnit,
    recommendedMunition,
    safetyMarginM: SUDO_COLLATERAL_REQUIRED_SAFETY_MARGIN_M,
    verdict: !firable.length ? '사격 불가 — 사거리 내 가용 부대 없음'
      : !recommendedMunition ? '사격 보류 — 전 탄종 부수피해 안전거리 미달'
        : `${recommendedUnit.unit} · ${recommendedMunition.munition} 권고`,
    ok: Boolean(firable.length && recommendedMunition),
  };
}

/** 타격 절차 6단계 (원본 그대로) */
export function strikeSequence() {
  return SUDO_STRIKE_SEQUENCE_STEPS;
}

/**
 * 위협 사거리 프로파일 조회 — VISTA utils/threatCoverage 원본.
 * 공개 출처(제조사·방사청 페이지) URL이 원본 행에 함께 들어 있다.
 */
export function threatProfiles() {
  return FACILITY_THREAT_PROFILES;
}

