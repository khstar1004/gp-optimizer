export const SUDO_JANGDO_GIS_INTEL = {
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
    "id": "(B110)정밀도로지도_인천광역시도_5호선(원창-원창선):A4_SUBSIDIARYSECTION:hdmap:116",
    "kind": "hd-subsidiary-section",
    "label": "부속구간",
    "distanceM": 6,
    "coordinate": [
      126.61128,
      37.54669
    ],
    "routeLabel": "인천광역시도_5호선(원창-원창선)",
    "typeCode": "",
    "kindCode": ""
  },
  "nearestHdMapSafetyFeature": {
    "id": "(B110)정밀도로지도_인천광역시도_5호선(원창-원창선):B3_SURFACEMARK:hdmap:611",
    "kind": "hd-surface-mark",
    "label": "노면표시",
    "distanceM": 10,
    "coordinate": [
      126.61132,
      37.54669
    ],
    "routeLabel": "인천광역시도_5호선(원창-원창선)",
    "typeCode": "1",
    "kindCode": "5382"
  },
  "nearestHdMapObstacleFeature": {
    "id": "(B110)정밀도로지도_고속국도_130호선(인천국제공항선):C3_VEHICLEPROTECTIONSAFETY:hdmap:17",
    "kind": "hd-vehicle-protection",
    "label": "차량방호안전시설",
    "distanceM": 684,
    "coordinate": [
      126.60811,
      37.55241
    ],
    "routeLabel": "고속국도_130호선(인천국제공항선)",
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
    "id": "(B010)수치지도_37607085_2025_00000495679972.zip:N3A_B0010000:1000037607085B00110000000000000643",
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
} as const;

export function formatSudoGisIntelCounts() {
  return [
    `도로 ${SUDO_JANGDO_GIS_INTEL.roads.toLocaleString()}`,
    `HD ${SUDO_JANGDO_GIS_INTEL.hdMapFeatures.toLocaleString()}`,
    `건물 ${SUDO_JANGDO_GIS_INTEL.buildings.toLocaleString()}`,
    `민가 ${SUDO_JANGDO_GIS_INTEL.civilianBuildings.toLocaleString()}`,
    `지형 ${SUDO_JANGDO_GIS_INTEL.terrainAnalysis.toLocaleString()}`,
    `규제 ${SUDO_JANGDO_GIS_INTEL.restrictedFeatures.toLocaleString()}`,
  ].join(" · ");
}
