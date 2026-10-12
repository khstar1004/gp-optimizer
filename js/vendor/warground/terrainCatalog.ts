// @ts-nocheck
export const TERRAIN_CATALOG = [
  {
    id: 'seungjin-training-ground',
    name: '승진훈련장',
    status: 'active',
    country: 'KR',
    region: '경기 포천 / 철원 축선',
    center: { longitude: 127.354386, latitude: 38.07775 },
    bounds: { west: 127.13, south: 37.91, east: 127.58, north: 38.24 },
    package: {
      id: 'seungjin',
      version: '2026-04-27',
      hash: 'sha256:9793782916f53bf2bd77ac83dd342e5a48955c5c7ef09cc69a7a420df6538351',
      path: '/offline-map/seungjin/manifest.json',
      layers: ['satellite', 'terrainDem', 'vector', 'roads', 'water', 'buildings', 'aoi'],
    },
    runtime: {
      path: '/terrain3d/index.html?region=seungjin',
      vista3dPath: '/vista-terrain3d/index.html',
      assetManifest: '/terrain3d/assets/manifest.json',
      outboundEvents: ['terrain3d:runtime-snapshot', 'terrain3d:placement-snapshot'],
      inboundEvents: ['terrain3d:ready', 'terrain3d:analysis-state', 'terrain3d:select-unit'],
    },
    terrainType: 'mountain-training-corridor',
    classificationLevel: 'secret',
    commandScope: '승진훈련장 / 지상전 모의전투',
    simulationEnabled: true,
    dataState: 'terrain-ready',
    elevationSummary: '구릉성 산악지, 제한된 축선, 관측 가능한 능선, 사격통제구역이 혼재한 훈련장 지형',
    constraints: [
      '지형정보가 있는 구역에서만 모의전투 실행 가능',
      '기동 축선은 계곡부와 훈련장 도로망 중심으로 제한',
      '능선 관측선과 은폐 접근로를 COA 평가에 자동 반영',
      '화력 운용구역과 안전통제선은 별도 자료 입력 시 우선 적용',
    ],
    graphFacts: [
      'TerrainArea: 승진훈련장',
      'TerrainType: 구릉성 산악 훈련장',
      'MobilityConstraint: 계곡부/도로망 중심 기동',
      'ObservationFactor: 능선 관측선 우세',
      'SimulationGate: terrain-ready인 지형에서만 실행 가능',
    ],
    coaDefaults: [
      'COA-A: 주 기동로를 따라 빠르게 진입하되 능선 감시 위협을 완화한다.',
      'COA-B: 은폐 접근로를 활용해 관측 노출을 줄이고 전개 시간을 늘린다.',
      'COA-C: 제한된 축선에서 예비대 투입 조건을 분리해 병목을 완화한다.',
    ],
  },
  {
    id: 'jangdo-training-ground',
    name: '장도훈련장',
    status: 'active',
    country: 'KR',
    region: '인천 옹진 / 서해 도서 축선',
    center: { longitude: 126.60738, latitude: 37.55121 },
    bounds: { west: 126.36938, south: 37.35921, east: 126.84538, north: 37.74321 },
    package: {
      id: 'jangdo',
      version: '2026-06-08',
      hash: 'sha256:8b6a10646c9aa651a618ea9d1f5e6678127ad47e045526ecb467a38d167593ba',
      path: '/offline-map/jangdo/manifest.json',
      layers: ['satellite', 'terrainDem', 'vector', 'roads', 'water', 'buildings', 'aoi', 'terrainAnalysis', 'terrainLayers', 'hdMapRoadContext'],
    },
    runtime: {
      path: '/terrain3d/index.html?region=jangdo',
      vista3dPath: '/vista-terrain3d/index.html',
      assetManifest: '/terrain3d/assets/manifest.json',
      outboundEvents: ['terrain3d:runtime-snapshot', 'terrain3d:placement-snapshot'],
      inboundEvents: ['terrain3d:ready', 'terrain3d:analysis-state', 'terrain3d:select-unit'],
    },
    terrainType: 'expanded-coastal-hilly-training-area',
    classificationLevel: 'secret',
    commandScope: '장도훈련장 / 서해 도서 방어 모의전투',
    simulationEnabled: true,
    dataState: 'terrain-ready',
    elevationSummary: 'NGII 공개 DEM과 고정밀 도로·지형 분석 레이어가 결합된 확장 구역으로, 구릉·도서·도시 접점의 공간 제약을 함께 평가한다.',
    constraints: [
      '지형정보가 있는 구역에서만 모의전투 실행 가능',
      '기동 축선은 도로망과 고도·경사 분석 레이어를 함께 적용',
      '건물·필지·용도지역·수계 레이어를 민군 접점과 기동 제한 판단에 반영',
      'HD Map 도로 맥락은 최신 현황 자료로 별도 출처와 함께 유지',
    ],
    graphFacts: [
      'TerrainArea: 장도훈련장',
      'TerrainType: 확장 해안 구릉 훈련장',
      'SpatialLayer: terrainAnalysis / terrainLayers / hdMapRoadContext',
      'MobilityConstraint: 도로망·경사·고도 기반 기동',
      'SimulationGate: terrain-ready인 지형에서만 실행 가능',
    ],
    coaDefaults: [
      'COA-A: 도로망 중심으로 신속 전개하되 고지·경사와 건물 밀집 구역의 병목을 관리한다.',
      'COA-B: 지형 은폐와 해안 접근로를 조합해 노출을 줄이고 분산 전개한다.',
      'COA-C: 도시·필지·민간 기반시설 제약을 분리해 예비대와 지원 축선을 보존한다.',
    ],
  },
  {
    id: 'soma-urban-training-ground',
    name: 'SoMa Urban Test Area',
    status: 'active',
    country: 'US',
    region: 'San Francisco SoMa / urban grid',
    center: { longitude: -122.415, latitude: 37.78 },
    bounds: { west: -122.425, south: 37.775, east: -122.405, north: 37.785 },
    package: {
      id: 'soma-urban',
      version: '2026-07-31',
      hash: 'sha256:22e735a966fa299904f3a351d0ed4ce3afd633d5afc26dab89b80cf646ef61e1',
      path: '/offline-map/soma-urban/manifest.json',
      layers: ['base', 'terrainDem', 'vector', 'roads', 'water', 'buildings', 'aoi'],
    },
    runtime: {
      path: '/terrain3d/index.html?region=soma-urban',
      vista3dPath: '/vista-terrain3d/index.html',
      assetManifest: '/terrain3d/assets/manifest.json',
      outboundEvents: ['terrain3d:runtime-snapshot', 'terrain3d:placement-snapshot'],
      inboundEvents: ['terrain3d:ready', 'terrain3d:analysis-state', 'terrain3d:select-unit'],
    },
    terrainType: 'urban-high-rise-grid',
    classificationLevel: 'secret',
    commandScope: 'SoMa Urban Test Area / urban operations rehearsal',
    simulationEnabled: true,
    dataState: 'terrain-ready',
    elevationSummary: 'Public elevation tiles combined with OpenStreetMap building and road geometry for a compact high-rise urban test area.',
    constraints: [
      '운용 범위는 공개 데이터로 생성된 SoMa AOI 안으로 제한',
      '건물 높이와 도로 연결성을 도시지역 기동 제약으로 반영',
      '공개 데이터 기반 지형은 권위 있는 측량자료가 아니므로 결과에 출처와 한계를 표시',
    ],
    graphFacts: [
      'TerrainArea: SoMa Urban Test Area',
      'TerrainType: urban high-rise grid',
      'SpatialLayer: OpenStreetMap buildings / roads / water',
      'ElevationSource: Mapzen Terrain Tiles on AWS',
      'SimulationGate: terrain-ready인 지형에서만 실행 가능',
    ],
    coaDefaults: [
      'COA-A: 주요 도로망과 교차로를 따라 도시 블록 단위로 전개한다.',
      'COA-B: 건물 높이와 골목 연결성을 반영해 노출과 병목을 비교한다.',
      'COA-C: 도시 기반시설과 제한된 AOI를 고려해 예비대 투입 축선을 분리한다.',
    ],
  },
]

const REGISTERED_TERRAIN_STORAGE_KEY = 'war-ground:registered-terrain-catalog'

function loadRegisteredTerrains(storage = globalThis.localStorage) {
  try {
    const entries = JSON.parse(storage?.getItem?.(REGISTERED_TERRAIN_STORAGE_KEY) || '[]')
    return Array.isArray(entries) ? entries.filter((entry) => entry?.id && entry?.package?.id) : []
  } catch {
    return []
  }
}

function terrainFromRegisteredPackage(record = {}) {
  const packageId = String(record.id || '').trim()
  if (!packageId) return null
  return {
    id: String(record.terrain_id || `${packageId}-training-ground`),
    name: String(record.name || packageId),
    status: 'active',
    country: 'KR',
    region: '사용자 등록 로컬 작전지역',
    center: record.center,
    bounds: record.bounds,
    package: {
      id: packageId,
      version: String(record.version || 'operator-upload'),
      hash: String(record.hash || ''),
      path: String(record.manifest_url || `/offline-map/${packageId}/manifest.json`),
      layers: Array.isArray(record.layers) ? record.layers : [],
    },
    runtime: {
      path: `/terrain3d/index.html?region=${encodeURIComponent(packageId)}`,
      vista3dPath: '/vista-terrain3d/index.html',
      assetManifest: '/terrain3d/assets/manifest.json',
      outboundEvents: ['terrain3d:runtime-snapshot', 'terrain3d:placement-snapshot'],
      inboundEvents: ['terrain3d:ready', 'terrain3d:analysis-state', 'terrain3d:select-unit'],
    },
    terrainType: String(record.terrain_type || 'user-supplied-local-package'),
    classificationLevel: 'secret',
    commandScope: `${record.name || packageId} / 사용자 등록 로컬 모의전투`,
    simulationEnabled: true,
    dataState: 'terrain-ready',
    elevationSummary: '사용자가 등록한 로컬 지형 패키지입니다. 원본 자료의 범위와 레이어는 manifest 기준으로 검증됩니다.',
    constraints: ['검증된 로컬 지형 패키지 범위에서만 실행 가능', '패키지 manifest의 레이어와 해시를 room·그래프에 고정'],
    graphFacts: [`TerrainArea: ${record.name || packageId}`, `TerrainPackage: ${packageId}`, `SpatialLayers: ${(record.layers || []).join(', ')}`],
    coaDefaults: ['COA-A: 사용자 제공 지형과 기동 제약을 기준으로 신속 전개한다.', 'COA-B: 지형 노출과 민간 기반시설 제약을 반영해 우회한다.'],
  }
}

function allTerrains() {
  const builtInIds = new Set(TERRAIN_CATALOG.map((terrain) => terrain.id))
  return [...TERRAIN_CATALOG, ...loadRegisteredTerrains().filter((terrain) => !builtInIds.has(terrain.id))]
}

export function cacheRegisteredTerrain(record, storage = globalThis.localStorage) {
  const terrain = terrainFromRegisteredPackage(record)
  if (!terrain) return null
  const entries = loadRegisteredTerrains(storage).filter((entry) => entry.id !== terrain.id && entry.package?.id !== terrain.package.id)
  try {
    storage?.setItem?.(REGISTERED_TERRAIN_STORAGE_KEY, JSON.stringify([...entries, terrain]))
  } catch {
    return null
  }
  return terrain
}

export const DEFAULT_TERRAIN_ID = 'seungjin-training-ground'

export function getTerrainById(id = DEFAULT_TERRAIN_ID) {
  return allTerrains().find((terrain) => terrain.id === id) || TERRAIN_CATALOG[0] || null
}

export function getSimulationEnabledTerrains() {
  return allTerrains().filter((terrain) => terrain.simulationEnabled && terrain.dataState === 'terrain-ready')
}

export function buildTerrainPackageRecord(terrain = getTerrainById()) {
  if (!terrain?.package || !terrain.center || !terrain.bounds) return null
  return {
    id: terrain.package.id,
    version: terrain.package.version,
    hash: terrain.package.hash,
    center: { ...terrain.center },
    bounds: { ...terrain.bounds },
    layers: [...(terrain.package.layers || [])],
  }
}

export function buildTerrainRuntimeUrl(terrain = getTerrainById(), mode = 'vista3d') {
  if (!terrain?.runtime) return ''
  if (mode !== 'vista3d') {
    const runtimePath = terrain.runtime.path || ''
    return mode === 'map2d' ? `${runtimePath}${runtimePath.includes('?') ? '&' : '?'}mode=2d` : runtimePath
  }

  const bounds = terrain.bounds || {}
  const params = new URLSearchParams({
    region: terrain.package?.id || terrain.id || DEFAULT_TERRAIN_ID,
    offlineMapRegion: terrain.package?.id || '',
    offlineMapManifest: terrain.package?.path || '',
    // MapLibre is the primary local renderer. The viewer retains Cesium as a
    // fallback when a package cannot initialize its local MapLibre surface.
    terrainPlan: 'maplibre',
    hostControls: 'vista',
    west: String(bounds.west),
    south: String(bounds.south),
    east: String(bounds.east),
    north: String(bounds.north),
    center: [terrain.center?.longitude, terrain.center?.latitude].join(','),
    continueSimulation: '1',
  })
  return `${terrain.runtime.vista3dPath || terrain.runtime.path}?${params.toString()}`
}

export function buildTerrainRoomSeed(terrain = getTerrainById()) {
  if (!terrain) {
    return {
      name: '',
      description: '',
      classificationLevel: 'secret',
      commandScope: '',
    }
  }

  return {
    name: `WAR GROUND ${terrain.name} 모의전투 Room`,
    description:
      `${terrain.name} 지형 기반 WAR GROUND 모의전투 room. ` +
      `${terrain.elevationSummary}. ` +
      '선택 지형정보는 해당 훈련장의 pre-ontology 위에 고정하고, 지형 제약을 반영해 방책별 수행 리허설과 결심카드를 산출한다.',
    classificationLevel: terrain.classificationLevel || 'secret',
    commandScope: terrain.commandScope || terrain.region || '',
    terrainPackage: buildTerrainPackageRecord(terrain),
  }
}

export function buildTerrainSourceText(terrain = getTerrainById()) {
  if (!terrain) return ''

  return [
    '[WAR GROUND TERRAIN PACKAGE]',
    `terrain_id: ${terrain.id}`,
    `terrain_name: ${terrain.name}`,
    `country: ${terrain.country}`,
    `region: ${terrain.region}`,
    `center_longitude: ${terrain.center?.longitude ?? ''}`,
    `center_latitude: ${terrain.center?.latitude ?? ''}`,
    `bounds: ${[terrain.bounds?.west, terrain.bounds?.south, terrain.bounds?.east, terrain.bounds?.north].join(',')}`,
    `terrain_package_id: ${terrain.package?.id || ''}`,
    `terrain_package_version: ${terrain.package?.version || ''}`,
    `terrain_package_hash: ${terrain.package?.hash || ''}`,
    `terrain_layers: ${(terrain.package?.layers || []).join(',')}`,
    `terrain_type: ${terrain.terrainType}`,
    `data_state: ${terrain.dataState}`,
    `simulation_enabled: ${terrain.simulationEnabled ? 'true' : 'false'}`,
    '',
    '[지형 요약]',
    terrain.elevationSummary,
    '',
    '[모의전투 제약]',
    ...(terrain.constraints || []).map((item) => `- ${item}`),
    '',
    '[훈련장별 pre-ontology 기준 사실]',
    ...(terrain.graphFacts || []).map((item) => `- ${item}`),
    '',
    '[초기 방책 기준]',
    ...(terrain.coaDefaults || []).map((item) => `- ${item}`),
  ].join('\n')
}
