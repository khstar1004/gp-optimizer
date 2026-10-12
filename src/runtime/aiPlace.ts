// @ts-nocheck
/**
 * AI 배치 설계 — Scaffolda 원본 엔진을 그대로 호출한다.
 *
 * 이전 버전은 Scaffolda 파이프라인을 손으로 옮겨 적은 재구현이었다. 현재는 원본
 * TypeScript 소스를 번들해 직접 쓴다:
 *
 *   orca/Scaffolda-public/src/features/scaffolda/lib/**
 *     → js/vendor/scaffolda/scaffolda.bundle.js   (npm run build:scaffolda)
 *
 * 이 파일이 하는 일은 두 가지뿐이다.
 *   1) 원본 API 재수출 (요구사항 대화·질문뱅크·Ollama 클라이언트는 원본 그대로)
 *   2) Cesium 지형 ↔ 원본 엔진의 GroundSampler/LocalPoint 좌표계 어댑팅
 *
 * 배치 결정 로직(generatePlacement 2,971줄, buildProgram, buildDifficultyGrid)은
 * 전부 원본이며 여기서 다시 구현하지 않는다.
 */
import { SITE } from './data';
import { offset } from './geo';
import { sampleTerrainDetailed } from './terrainSample';
import {
  // 요구사항 모델 · 질문뱅크 · Ollama 대화 — 원본 그대로 재수출
  UNIT_TEMPLATES, UNIT_TEMPLATE_LABELS, MODULE_LABELS, CORE_LABELS,
  MODULE_IDS, MODULE_WEIGHTS, ADJUST_TARGETS,
  createDesignRequirements, applyModuleAdjustment, defaultModulesFor,
  buildRequirementsResponseSchema, resolveDesignTurn, mergeTurnRequirements,
  isInterrogativeText,
  QUESTION_BANK, QUESTION_IDS, findQuestion, applyQuestionAnswer,
  requestDesignTurn, createDesignSystemPrompt, AiPlacementError,
  // 배치 엔진
  buildProgram, buildDifficultyGrid, generatePlacement as scaffoldaGeneratePlacement,
  lngLatToLocalMeters, localMetersToLngLat,
  GUARD_POST_PERSONNEL, GUARD_POST_FIXED_FLOORS,
  AREA_PER_PERSON_SQUARE_METERS, SITE_AREA_PER_PERSON_SQUARE_METERS,
  findFacilityTypeById, FACILITY_CATEGORY_LABELS,
} from '../../js/vendor/scaffolda/scaffolda.bundle';

export {
  UNIT_TEMPLATES, UNIT_TEMPLATE_LABELS, MODULE_LABELS, CORE_LABELS,
  MODULE_IDS, MODULE_WEIGHTS, ADJUST_TARGETS,
  createDesignRequirements, applyModuleAdjustment, defaultModulesFor,
  buildRequirementsResponseSchema, resolveDesignTurn, mergeTurnRequirements,
  isInterrogativeText,
  QUESTION_BANK, QUESTION_IDS, findQuestion, applyQuestionAnswer,
  requestDesignTurn, createDesignSystemPrompt, AiPlacementError,
  buildProgram, GUARD_POST_PERSONNEL, GUARD_POST_FIXED_FLOORS,
  AREA_PER_PERSON_SQUARE_METERS, SITE_AREA_PER_PERSON_SQUARE_METERS,
  findFacilityTypeById, FACILITY_CATEGORY_LABELS,
};

export const GREETING =
  '부대 규모와 임무를 알려주시면 GP 부지에 맞춰 배치안을 만들어 드립니다. '
  + '예) "동원소초 40명, 상주 28명 · 정비 비중 높게"';

// ═══════════ GP 부지 경계 (Scaffolda LocalPoint 좌표계) ═══════════
// 타워 남측 후방 320×220m 사각 부지. 원점은 부지 중심.
const SITE_HALF_W = 160;
const SITE_HALF_H = 110;

function siteOrigin() {
  const c = offset(SITE.gp.lon, SITE.gp.lat, 180, 130);
  return { lng: c.lon, lat: c.lat };
}

function siteBoundary() {
  return [
    { x: -SITE_HALF_W, y: -SITE_HALF_H },
    { x: SITE_HALF_W, y: -SITE_HALF_H },
    { x: SITE_HALF_W, y: SITE_HALF_H },
    { x: -SITE_HALF_W, y: SITE_HALF_H },
  ];
}

/**
 * Cesium 지형 → 원본 GroundSampler((LocalPoint) => 절대 지반고 m | null).
 * 원본 엔진은 동기 샘플러를 요구하므로 격자를 먼저 비동기로 채운 뒤 쌍선형 보간으로 돌려준다.
 */
async function buildGroundSampler(viewer, origin, halfW, halfH, steps = 48, realTerrain = null) {
  const minX = -halfW, minY = -halfH;
  const cellX = (halfW * 2) / (steps - 1);
  const cellY = (halfH * 2) / (steps - 1);
  const cartos = [];
  const lls = [];
  for (let iy = 0; iy < steps; iy++) {
    for (let ix = 0; ix < steps; ix++) {
      const ll = localMetersToLngLat(minX + ix * cellX, minY + iy * cellY, origin);
      lls.push(ll);
      cartos.push(Cesium.Cartographic.fromDegrees(ll.lng, ll.lat));
    }
  }
  // GP 정밀지형(GLB) 표출 중이면 그 표면을 우선한다 — 라이브 지형만 보면 이 격자가
  // 계산하는 경사·난이도가 실제로 렌더되는 지형과 달라져, 배치 결정 자체가
  // 화면에 보이는 능선과 맞지 않는 곳을 「평탄」으로 잘못 고르게 된다.
  let H;
  if (realTerrain?.active && realTerrain?.surfaceReady) {
    H = lls.map((ll) => realTerrain.surfaceHeightAt(ll.lng, ll.lat));
    if (H.some((h) => !Number.isFinite(h))) {
      await sampleTerrainDetailed(viewer.terrainProvider, cartos);
      H = H.map((h, i) => (Number.isFinite(h) ? h : (Number.isFinite(cartos[i].height) ? cartos[i].height : NaN)));
    }
  } else {
    await sampleTerrainDetailed(viewer.terrainProvider, cartos);
    H = cartos.map((c) => (Number.isFinite(c.height) ? c.height : NaN));
  }

  return (point) => {
    const fx = (point.x - minX) / cellX;
    const fy = (point.y - minY) / cellY;
    if (fx < 0 || fy < 0 || fx > steps - 1 || fy > steps - 1) return null;
    const ix = Math.min(steps - 2, Math.floor(fx));
    const iy = Math.min(steps - 2, Math.floor(fy));
    const tx = fx - ix, ty = fy - iy;
    const h00 = H[iy * steps + ix];
    const h10 = H[iy * steps + ix + 1];
    const h01 = H[(iy + 1) * steps + ix];
    const h11 = H[(iy + 1) * steps + ix + 1];
    if (![h00, h10, h01, h11].every(Number.isFinite)) return null;
    return (h00 * (1 - tx) + h10 * tx) * (1 - ty) + (h01 * (1 - tx) + h11 * tx) * ty;
  };
}

/** SiteZone 폴리곤 중심 (local meter) */
function zoneCenter(points) {
  const n = points.length || 1;
  return {
    x: points.reduce((a, p) => a + p.x, 0) / n,
    y: points.reduce((a, p) => a + p.y, 0) / n,
  };
}

/**
 * 배치 실행 — 원본 Scaffolda generatePlacement 호출.
 * @returns { placements:[{unit, lon, lat, floors, score}], zones, warnings, notes, summary }
 */
export async function generatePlacement(viewer, requirements, realTerrain = null) {
  const origin = siteOrigin();
  const boundary = siteBoundary();
  const sampleGround = await buildGroundSampler(viewer, origin, SITE_HALF_W, SITE_HALF_H, 48, realTerrain);

  // 원본: 경계 bbox를 8m 격자로 훑어 셀별 국소 경사·고도를 사전계산
  const difficultyGrid = buildDifficultyGrid(boundary, sampleGround);

  // 원본 배치 엔진 (지형 난이도 + 건물 간 친화도 + 산포 최소화, 복수 정렬 후보 비교)
  const result = scaffoldaGeneratePlacement(
    boundary, requirements, difficultyGrid, sampleGround,
    // 출입 anchor: 남측 경계 중점 1곳 (외부 도로 데이터가 없는 합성 부지)
    { externalRoadPoints: [{ x: 0, y: -SITE_HALF_H }] },
  );

  // 원본 SiteZone[] → 데모 렌더러가 쓰는 위경도 배치 목록.
  // 인원수는 원본 summary.units(라벨 매칭)에서 가져온다.
  const personnelByLabel = new Map(
    (result.summary?.units ?? []).map((u) => [u.label, u.personnel]),
  );
  // 원본은 도로·주차·담장도 같은 facility zone 으로 낸다(구분은 facilityTypeId).
  // 3D 건물 스택으로 세울 수 있는 것만 placements 로 넘기고, 나머지는 zones 로 그대로 돌려준다.
  const NON_BUILDING = new Set([
    'road', 'fence', 'fence-boundary', 'parking-zone', 'vehicle-parking-zone',
  ]);
  const placements = result.zones
    .filter((zone) => !NON_BUILDING.has(zone.facilityTypeId)
      && Array.isArray(zone.points) && zone.points.length >= 3)
    .map((zone) => {
      const c = zoneCenter(zone.points);
      const ll = localMetersToLngLat(c.x, c.y, origin);
      const facility = zone.facilityTypeId ? findFacilityTypeById(zone.facilityTypeId) : null;
      const personnel = personnelByLabel.get(zone.label)
        ?? zone.properties?.capacity ?? facility?.defaultCapacity ?? 1;
      return {
        zone,
        unit: {
          id: zone.id,
          label: zone.label,
          category: zone.category,
          facilityTypeId: zone.facilityTypeId ?? null,
          personnel,
          capacity: personnel,
        },
        lon: ll.lng,
        lat: ll.lat,
        floors: zone.floors ?? facility?.defaultFloors ?? 1,
        score: 0,
      };
    });

  const roads = result.zones.filter((z) => z.facilityTypeId === 'road');
  const parking = result.zones.filter(
    (z) => z.facilityTypeId === 'parking-zone' || z.facilityTypeId === 'vehicle-parking-zone');

  return {
    placements,
    roads,
    parking,
    zones: result.zones,
    warnings: result.warnings ?? [],
    notes: result.notes ?? [],
    summary: result.summary ?? null,
    // 원본 배치 총점 (지형+친화도+산포, 낮을수록 좋음)
    totalScore: Math.round((result.summary?.totalScore ?? 0) * 10) / 10,
    origin,
    boundary,
  };
}

/** 오프라인 폴백 파서 (Scaffolda엔 없음 — Ollama 미가동 시 데모 지속용) */
export function parseOffline(text) {
  const total = text.match(/(?:총원|전체|규모)?\s*(\d{1,3})\s*(?:명|인)/);
  const template =
    /전차|기갑/.test(text) ? 'armor' : /본부/.test(text) ? 'headquarters'
      : /정비/.test(text) ? 'maintenance' : /보병|소총|동원|소초/.test(text) ? 'infantry' : 'generic';
  const t = total ? parseInt(total[1], 10) : null;
  const resident = /무인|원격/.test(text) ? 0 : /교대/.test(text) ? (t ? Math.round(t * 0.7) : null) : t;
  return resolveDesignTurn({
    reply: '(오프라인 규칙 파서) 요구를 해석해 배치합니다.',
    requirements: { unitTemplate: template, totalPersonnel: t ?? 0, residentPersonnel: resident ?? 0 },
    askQuestionIds: [], moduleAdjustments: [],
  }, QUESTION_IDS);
}

