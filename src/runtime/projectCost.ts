// @ts-nocheck
/**
 * 토공·사업비 계산 — Scaffolda 원본 그대로 호출 (재구현 없음).
 *
 * 이 파일 자체는 (아래에서 옮겨 온 이유가 설명하듯) 완전히 순수하지만, 타입 없는
 * 벤더 번들(js/vendor/scaffolda/scaffolda.bundle.js)의 반환 모양을 그대로 감싸므로
 * `placement.ts` 등 이 번들을 쓰는 다른 모든 파일과 같은 관례로 `@ts-nocheck` 를
 * 유지한다 — 제3자 번들의 .d.ts 를 새로 쓰는 건 이 분리의 목적(순수 로직 시험 가능화)
 * 밖의 별도 작업이다.
 *
 * `placement.ts`에서 분리했다 — 같은 이유([[gp-digital-twin-demo]] v36 참고): 이 함수들은
 * 전부 순수(Scaffolda 번들 호출 + 숫자 가공)라 Cesium 이 전혀 필요 없는데,
 * `placement.ts`를 통째로 임포트하면(그 파일 자체의 `FACILITY_CATALOG` 조립부가
 * 원인으로 보이는 시점에) Node(브라우저 밖)에서 `ReferenceError: Cesium is not defined`
 * 로 죽는다 — 정작 이 파일이 쓰는 스캐폴다 바인딩(DEFAULT_EARTHWORK_CONFIG·
 * computeEarthwork·computeProjectCost·formatKrwShort)만 따로 가져오면 문제없이
 * 동작한다(실측 확인). `evalReport.ts`(LLM 평가보고서 페이로드 조립)가 이 중 셋만
 * 필요한데도 `placement.ts` 전체를 끌고 들어가 있어서 순수 함수인데 단위시험이
 * 불가능했다 — 여기로 옮기고 `placement.ts`는 재수출만 한다.
 */
import {
  DEFAULT_EARTHWORK_CONFIG,
  computeEarthwork as scaffoldaComputeEarthwork,
  computeProjectCost as scaffoldaComputeProjectCost,
  formatKrwShort,
} from '../../js/vendor/scaffolda/scaffolda.bundle';

export { DEFAULT_EARTHWORK_CONFIG };

// GP 고유 추가분은 방호 등급(hardened) 할증 하나뿐이며, 원본 EarthworkConfig 의
// 건물 시공 단가만 배수 조정해 원본 computeEarthwork 에 넘긴다.
export const PROTECTION_MULTIPLIER = { none: 1.0, hardened: 4.2 };

export const DIFFICULTY_LABELS = { low: '낮음', moderate: '보통', high: '높음', severe: '매우 높음' };

/** 원본 computeEarthwork 호출. 반환 필드는 데모 렌더러가 쓰던 이름으로 얕게 매핑한다. */
export function computeEarthwork(footprint, floors, capacity, sampleGround, protection = 'none') {
  const config = {
    ...DEFAULT_EARTHWORK_CONFIG,
    buildingCostPerPyeong:
      DEFAULT_EARTHWORK_CONFIG.buildingCostPerPyeong * (PROTECTION_MULTIPLIER[protection] ?? 1),
  };
  const r = scaffoldaComputeEarthwork(footprint, floors, sampleGround, config);
  if (!r) return null;
  return {
    ...r,
    pad: r.padElevationM,
    cutM3: r.cutVolumeM3,
    fillM3: r.fillVolumeM3,
    // 원본 costBreakdown 은 절·성토를 합쳐 earthworkKrw 하나로 준다 (cutKrw/fillKrw 는 없다).
    // 예전엔 없는 두 필드를 더해 NaN 을 만들었고, 화면에는 토공비가 조용히 「-」로 찍혔다.
    earthworkKrw: r.costBreakdown.earthworkKrw,
    wallKrw: r.costBreakdown.wallKrw,
    foundationKrw: r.costBreakdown.foundationKrw,
    buildingKrw: r.costBreakdown.buildingKrw,
    overheadKrw: r.costBreakdown.overheadKrw,
    totalKrw: r.totalCostKrw,
  };
}

/** 원본 projectCost.formatKrwShort */
export function fmtKrw(value) {
  return Number.isFinite(value) ? formatKrwShort(value) : '-';
}

/** 치수 → 로컬미터 사각 footprint (중심 원점) */
export function footprintOf(dims) {
  const hw = dims.widthM / 2, hd = dims.depthM / 2;
  return [{ x: -hw, y: -hd }, { x: hw, y: -hd }, { x: hw, y: hd }, { x: -hw, y: hd }];
}

/** 원본 computeProjectCost — 배치 아이템을 SiteZone/EarthworkResult 계약으로 넘긴다 */
export function computeProjectCost(items, extraConstructionKrw = 0) {
  const zones = items.map((it) => ({
    id: it.uid,
    kind: 'facility',
    category: it.spec.category ?? 'other',
    facilityTypeId: it.spec.id,
    label: it.spec.name,
    floors: it.floors,
    points: footprintOf(it.dims),
    properties: { capacity: it.capacity },
    style: {},
  }));
  const earthworkByZoneId = Object.fromEntries(items.map((it) => [it.uid, it.cost]));
  const r = scaffoldaComputeProjectCost({ zones, earthworkByZoneId });
  return {
    constructionKrw: r.hardCostKrw + extraConstructionKrw,
    floorAreaM2: r.floorAreaM2,
    designFeeKrw: r.designFeeKrw,
    permitFeeKrw: r.permitFeeKrw,
    permitFeeAuto: r.permitFeeAuto,
    pendingEarthworkCount: r.pendingEarthworkCount,
    totalKrw: r.totalKrw + extraConstructionKrw,
  };
}
