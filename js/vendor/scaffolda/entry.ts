// @ts-nocheck
/**
 * Scaffolda 번들 엔트리 — orca/Scaffolda-public 의 원본 TypeScript 소스를 그대로 재수출한다.
 * 이 파일은 재수출 목록일 뿐, 로직을 한 줄도 담지 않는다.
 *
 * 빌드: npm run build:scaffolda  →  js/vendor/scaffolda/scaffolda.bundle.js (ESM)
 */

export {
  DEFAULT_EARTHWORK_CONFIG,
  computeEarthwork,
  polygonCentroid,
  buildEarthworkReselectionIssues,
} from '../../../../../Scaffolda-public/src/features/scaffolda/lib/earthworkModel';

export {
  DEFAULT_PROJECT_COST_CONFIG,
  resolveAutoPermitFeeKrw,
  computeProjectCost,
  formatKrwShort,
} from '../../../../../Scaffolda-public/src/features/scaffolda/lib/projectCost';

export {
  FACILITY_CATEGORY_LABELS,
  FACILITY_CATALOG,
  findFacilityTypeById,
  groupFacilitiesByCategory,
} from '../../../../../Scaffolda-public/src/features/scaffolda/lib/facilityCatalog';

export {
  lngLatToLocalMeters,
  localMetersToLngLat,
  polygonLngLatToLocalMeters,
} from '../../../../../Scaffolda-public/src/features/scaffolda/lib/localCoordinate';

export {
  isPolygonInsidePolygon,
  arePointsInsidePolygon,
  offsetPolygonOutward,
  closeLocalRing,
  getBoundingBox,
  calculatePolygonOverlapAreaSquareMeters,
} from '../../../../../Scaffolda-public/src/features/scaffolda/lib/siteZoneGeometry';

export {
  UNIT_TEMPLATES,
  UNIT_TEMPLATE_LABELS,
  MODULE_IDS,
  MODULE_WEIGHTS,
  MODULE_LABELS,
  CORE_LABELS,
  ADJUST_TARGETS,
  AREA_PER_PERSON_SQUARE_METERS,
  SITE_AREA_PER_PERSON_SQUARE_METERS,
  defaultModulesFor,
  createDesignRequirements,
  applyModuleAdjustment,
  buildRequirementsResponseSchema,
  resolveDesignTurn,
  mergeTurnRequirements,
  isInterrogativeText,
} from '../../../../../Scaffolda-public/src/features/scaffolda/lib/aiPlacement/designRequirements';

export {
  GUARD_POST_PERSONNEL,
  GUARD_POST_FIXED_FLOORS,
  buildProgram,
  splitInfraUnit,
} from '../../../../../Scaffolda-public/src/features/scaffolda/lib/aiPlacement/buildingProgram';

export {
  buildDifficultyGrid,
  normalizedElevationForRect,
  difficultyForRect,
  slopeAtPoint,
  difficultyForPolygon,
  difficultyGridToGeoJson,
} from '../../../../../Scaffolda-public/src/features/scaffolda/lib/aiPlacement/difficultyGrid';

export {
  AiPlacementError,
  requestDesignTurn,
  createDesignSystemPrompt,
} from '../../../../../Scaffolda-public/src/features/scaffolda/lib/aiPlacement/ollamaClient';

export {
  QUESTION_BANK,
  QUESTION_IDS,
  findQuestion,
  applyQuestionAnswer,
} from '../../../../../Scaffolda-public/src/features/scaffolda/lib/aiPlacement/questionBank';

export {
  CANDIDATE_ANGLES_DEG,
  rotatePolygon,
  scalePolygonToArea,
  footprintTemplates,
} from '../../../../../Scaffolda-public/src/features/scaffolda/lib/aiPlacement/placementShapes';

export {
  MAX_ENTRY_POINTS,
  getExternalRoadPoints,
  findBoundaryRoadCrossings,
  segmentIntersection,
} from '../../../../../Scaffolda-public/src/features/scaffolda/lib/aiPlacement/externalRoads';

export {
  GUARD_COVER_SPACING_M,
  generatePlacement,
  shouldSkipDetachedWelfare,
  entryCenterOf,
  delaunayEdges,
  pruneRoadEdges,
  routeRoadAroundObstacles,
} from '../../../../../Scaffolda-public/src/features/scaffolda/lib/aiPlacement/placementEngine';

export {
  PYEONG_TO_SQUARE_METERS,
  DEFAULT_ZONE_CAPACITY,
  RECOMMENDED_AREA_PYEONG_PER_CAPACITY,
  DEFAULT_AREA_PER_PERSON_M2,
  createDefaultZoneProperties,
  normalizeZoneProperties,
  createZoneAreaMetrics,
  createRecommendedZoneDimensions,
  calculateLocalPolygonAreaSquareMeters,
} from '../../../../../Scaffolda-public/src/features/scaffolda/lib/siteZoneProperties';
