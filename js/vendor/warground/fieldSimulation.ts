// @ts-nocheck
const MAX_MESSAGES = 48
const MAX_TICK = 12

const WAYPOINT_DEFINITIONS = Object.freeze([
  { id: 'command-post', label: '지휘소', point: [0.16, 0.76], kind: 'command' },
  { id: 'assembly', label: '집결지', point: [0.26, 0.68], kind: 'assembly' },
  { id: 'assembly-two', label: '2소대 집결지', point: [0.32, 0.76], kind: 'assembly' },
  { id: 'fog-belt', label: '안개대', point: [0.42, 0.55], kind: 'hazard' },
  { id: 'valley-route', label: '계곡 우회로', point: [0.49, 0.72], kind: 'route' },
  { id: 'enemy-screen', label: '적 감시선', point: [0.61, 0.43], kind: 'threat' },
  { id: 'alternate-ridge', label: '우회 능선', point: [0.68, 0.66], kind: 'route' },
  { id: 'hill-one', label: '1고지', point: [0.82, 0.30], kind: 'objective' },
  { id: 'hill-two', label: '2고지', point: [0.86, 0.73], kind: 'objective' },
])

const ARCHETYPES = Object.freeze([
  {
    id: 'platoon-one', label: '1소대장', callSign: 'ALPHA-1', group: '1소대', faction: 'blue',
    role: '현장 지휘', posture: '돌파 우선', temperament: '결단이 빠르고 위험을 감수해 시간을 확보합니다.',
    character: 'leader', color: '#2563eb', route: ['assembly', 'fog-belt', 'enemy-screen', 'hill-one'],
  },
  {
    id: 'platoon-two', label: '2소대장', callSign: 'BRAVO-1', group: '2소대', faction: 'blue',
    role: '현장 지휘', posture: '안전 우회', temperament: '노출과 손실을 줄이는 대신 이동 시간을 더 씁니다.',
    character: 'leader', color: '#0f766e', route: ['assembly-two', 'fog-belt', 'valley-route', 'alternate-ridge', 'hill-two'],
  },
  {
    id: 'company-commander', label: '중대장', callSign: 'COMMAND-6', group: '지휘부', faction: 'blue',
    role: '지휘 결심', posture: '조건부 통제', temperament: '두 소대의 판단을 비교하고 재판단 조건을 관리합니다.',
    character: 'commander', color: '#7c3aed', route: ['command-post'],
  },
  {
    id: 'enemy-scout', label: '적 정찰조', callSign: 'RED-SCOUT', group: '대항군', faction: 'opfor',
    role: '감시·차단', posture: '축선 차단', temperament: '노출된 기동을 먼저 탐지하고 감시선을 유지합니다.',
    character: 'scout', color: '#b42318', route: ['enemy-screen', 'enemy-screen'],
  },
  {
    id: 'terrain-observer', label: '지형 관측관', callSign: 'TERRAIN-2', group: '환경', faction: 'environment',
    role: '지형·기상 판단', posture: '안개 경보', temperament: '시정, 능선, 계곡의 제약을 관측해 전파합니다.',
    character: 'observer', color: '#a16207', route: ['fog-belt'],
  },
  {
    id: 'signal-agent', label: '통신병', callSign: 'SIGNAL-3', group: '지원', faction: 'blue',
    role: '지휘통신', posture: '연결 유지', temperament: '부대 간 대화와 위치 보고를 끊김 없이 전달합니다.',
    character: 'signal', color: '#475569', route: ['valley-route', 'fog-belt'],
  },
])

const ROSTER_ROUTE_PATTERNS = Object.freeze([
  ['command-post', 'assembly'],
  ['assembly', 'fog-belt'],
  ['assembly-two', 'fog-belt'],
  ['command-post', 'valley-route'],
  ['fog-belt', 'enemy-screen'],
  ['valley-route', 'alternate-ridge'],
  ['alternate-ridge', 'hill-two'],
  ['enemy-screen', 'hill-one'],
  ['assembly', 'alternate-ridge'],
  ['assembly-two', 'hill-one'],
  ['command-post', 'hill-two'],
  ['fog-belt', 'valley-route', 'alternate-ridge'],
])

const PERSONA_BLUEPRINTS = Object.freeze([
  { character: 'commander', color: '#1d4ed8', posture: '결심 우선', temperament: '불확실성을 감수하고 먼저 결심해 부대의 속도를 확보합니다.' },
  { character: 'analyst', color: '#7c3aed', posture: '근거 확인', temperament: '관측 자료와 신뢰도를 확인한 뒤에만 판단을 확정합니다.' },
  { character: 'scout', color: '#b45309', posture: '탐지 우선', temperament: '노출 징후와 위험 변화를 먼저 찾아 전파합니다.' },
  { character: 'signal', color: '#475569', posture: '연결 유지', temperament: '부대 간 보고 간격을 줄이고 통신 공백을 먼저 관리합니다.' },
  { character: 'medic', color: '#be123c', posture: '손실 억제', temperament: '인원과 지속 가능성을 기준으로 무리한 기동을 제어합니다.' },
  { character: 'engineer', color: '#15803d', posture: '장애물 해소', temperament: '지형 제약을 분해하고 통과 가능한 동선을 제안합니다.' },
  { character: 'logistics', color: '#0f766e', posture: '지속성 우선', temperament: '연료, 장비, 보급 여유를 확인한 뒤 이동 범위를 정합니다.' },
  { character: 'vehicle', color: '#0369a1', posture: '기동 지원', temperament: '차량 상태와 도로망을 조합해 부대 기동을 지원합니다.' },
  { character: 'observer', color: '#a16207', posture: '환경 감시', temperament: '시정과 고도 변화를 관찰해 기동 가능 구역을 갱신합니다.' },
  { character: 'reviewer', color: '#6b21a8', posture: '규칙 점검', temperament: '권한과 제약을 확인해 실행 가능한 선택지만 남깁니다.' },
  { character: 'coordinator', color: '#0369a1', posture: '조정 중심', temperament: '서로 다른 판단을 비교해 충돌 없이 실행 순서를 조정합니다.' },
  { character: 'reserve', color: '#64748b', posture: '대기·대응', temperament: '주요 축선의 변화에 대비해 투입 가능한 상태를 유지합니다.' },
])

const FIELD_AGENT_TARGET = 96

const GENERATED_AGENT_FAMILIES = Object.freeze([
  { unit: '제1기동소대', role: '기동 분대장', character: 'leader', faction: 'blue', layer: 'field', group: '1소대', posture: '속도 우선', temperament: '시간을 줄이기 위해 위험을 감수하고 선두에서 판단합니다.', color: '#2563eb' },
  { unit: '제2기동소대', role: '기동 분대장', character: 'leader', faction: 'blue', layer: 'field', group: '2소대', posture: '안전 우회', temperament: '노출을 줄이고 대형을 보존하는 경로를 선호합니다.', color: '#0f766e' },
  { unit: '제3기동소대', role: '기동 분대장', character: 'leader', faction: 'blue', layer: 'field', group: '3소대', posture: '조건부 돌파', temperament: '관측 결과에 따라 돌파와 우회를 빠르게 전환합니다.', color: '#1d4ed8' },
  { unit: '제4기동소대', role: '기동 분대장', character: 'leader', faction: 'blue', layer: 'field', group: '4소대', posture: '측면 기동', temperament: '주 축선과 간격을 유지하며 측면에서 기회를 만듭니다.', color: '#4338ca' },
  { unit: '전방 정찰반', role: '정찰·감시', character: 'scout', faction: 'blue', layer: 'field', group: '정찰대', posture: '탐지 우선', temperament: '노출 징후와 적 위치 변화를 먼저 찾아 전파합니다.', color: '#b45309' },
  { unit: '공병 장애물반', role: '공병·장애물 판단', character: 'engineer', faction: 'blue', layer: 'support', group: '공병대', posture: '통과로 확보', temperament: '지형 제약을 분해하고 통과 가능한 동선을 제안합니다.', color: '#15803d' },
  { unit: '통신 중계반', role: '지휘통신', character: 'signal', faction: 'blue', layer: 'support', group: '통신대', posture: '연결 유지', temperament: '부대 간 보고 간격과 통신 공백을 먼저 관리합니다.', color: '#475569' },
  { unit: '군수 보급반', role: '군수·보급', character: 'logistics', faction: 'blue', layer: 'support', group: '군수대', posture: '지속성 우선', temperament: '연료와 장비 여유를 확인한 뒤 이동 범위를 정합니다.', color: '#0f766e' },
  { unit: '의무 후송반', role: '의무·후송', character: 'medic', faction: 'blue', layer: 'support', group: '의무대', posture: '손실 억제', temperament: '인원 지속 가능성을 기준으로 무리한 기동을 제어합니다.', color: '#be123c' },
  { unit: '기동 장비반', role: '차량·기동 지원', character: 'vehicle', faction: 'blue', layer: 'support', group: '기동지원대', posture: '기동 지원', temperament: '차량 상태와 도로망을 조합해 이동을 지원합니다.', color: '#0369a1' },
  { unit: '적 전방감시대', role: '적 감시·차단', character: 'scout', faction: 'opfor', layer: 'opfor', group: '대항군 전방대', posture: '축선 차단', temperament: '청색 기동을 먼저 감지하고 감시선의 빈틈을 줄입니다.', color: '#b42318' },
  { unit: '적 화력관측대', role: '적 화력 관측', character: 'analyst', faction: 'opfor', layer: 'opfor', group: '대항군 화력대', posture: '표적 고정', temperament: '노출된 위치를 분석해 화력 운용 우선순위를 정합니다.', color: '#991b1b' },
  { unit: '적 예비기동대', role: '적 예비·기동타격', character: 'reserve', faction: 'opfor', layer: 'opfor', group: '대항군 예비대', posture: '대응 대기', temperament: '주요 축선의 변화에 맞춰 예비 전력을 보존합니다.', color: '#7f1d1d' },
  { unit: '지형 기상관측대', role: '지형·기상 판단', character: 'observer', faction: 'environment', layer: 'environment', group: '환경·지형', posture: '환경 감시', temperament: '시정과 고도 변화를 관찰해 기동 가능 구역을 갱신합니다.', color: '#a16207' },
  { unit: '통제 평가실', role: '규칙·결심 검토', character: 'reviewer', faction: 'blue', layer: 'control', group: '지휘·통제', posture: '규칙 점검', temperament: '권한과 제약을 확인해 실행 가능한 선택지만 남깁니다.', color: '#6b21a8' },
])

const GENERATED_AGENT_BLUEPRINTS = Object.freeze(
  GENERATED_AGENT_FAMILIES.flatMap((family, familyIndex) => Array.from({ length: 6 }, (_, memberIndex) => ({
    ...family,
    index: familyIndex * 6 + memberIndex,
    name: `${family.unit} ${memberIndex + 1}번`,
    callSign: `${family.unit.replace(/[^0-9가-힣]/g, '').slice(0, 4).toUpperCase() || 'UNIT'}-${String(memberIndex + 1).padStart(2, '0')}`,
  }))),
)

const SCENARIO_MESSAGES = Object.freeze({
  0: [
    ['company-commander', '전원, 21:40 야간기동을 개시한다. 1·2소대는 각자 판단을 보고하라.', 'command'],
    ['platoon-one', '직선 축선으로 먼저 압박하겠습니다. 적 감시선을 만나면 돌파해 1고지를 잡겠습니다.', 'decisive'],
    ['platoon-two', '안개대 전방에서 정찰을 확인하겠습니다. 노출되면 계곡으로 우회해 2고지로 가겠습니다.', 'cautious'],
  ],
  1: [
    ['terrain-observer', '안개대 진입. 시정은 600m 이하로 떨어졌고 능선 관측선이 불안정합니다.', 'warning'],
    ['signal-agent', '1소대와 2소대 위치 보고 수신. 통신은 현재 유지됩니다.', 'report'],
  ],
  2: [
    ['enemy-scout', '청색 기동을 감지했다. 감시선에서 직접 축선을 차단한다.', 'threat'],
    ['company-commander', '두 소대의 위험 성향이 다르다. 접촉 뒤 경로 선택을 비교한다.', 'decision'],
  ],
  3: [
    ['platoon-one', '적 감시선과 접촉. 1소대는 교전으로 통과한다. 속도를 유지한다.', 'engage'],
    ['platoon-two', '직접 교전은 피한다. 2소대는 계곡 우회로로 전환해 2고지로 간다.', 'bypass'],
    ['company-commander', '결정 반영: 1소대 돌파, 2소대 우회. 두 경로를 분리 추적한다.', 'decision'],
  ],
  5: [
    ['signal-agent', '1소대는 적 감시선 북쪽으로 이동 중. 2소대는 계곡 구간 진입을 확인했다.', 'report'],
    ['terrain-observer', '안개가 계곡 방향으로 남아 있다. 우회로는 느리지만 노출이 낮다.', 'warning'],
  ],
  8: [
    ['platoon-one', '1고지 접근. 돌파 경로는 손실 위험이 있지만 목표 도달 시간이 짧다.', 'engage'],
    ['platoon-two', '2고지 전방 도착. 우회로가 길었지만 대형을 유지했다.', 'bypass'],
  ],
  10: [
    ['company-commander', '상황 보고: 두 소대의 위치와 선택 경로를 결심카드에 기록한다.', 'complete'],
  ],
})

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

function terrainBounds(terrain) {
  const bounds = terrain?.bounds || {}
  return {
    west: Number(bounds.west ?? terrain?.center?.longitude ?? 127),
    south: Number(bounds.south ?? terrain?.center?.latitude ?? 38),
    east: Number(bounds.east ?? (terrain?.center?.longitude ?? 127) + 0.1),
    north: Number(bounds.north ?? (terrain?.center?.latitude ?? 38) + 0.1),
  }
}

function coordinateForPoint(point, bounds) {
  const x = clamp(Number(point?.[0] ?? 0.5), 0, 1)
  const y = clamp(Number(point?.[1] ?? 0.5), 0, 1)
  return {
    longitude: bounds.west + (bounds.east - bounds.west) * x,
    latitude: bounds.north - (bounds.north - bounds.south) * y,
  }
}

function findWaypoint(id) {
  return WAYPOINT_DEFINITIONS.find((item) => item.id === id) || WAYPOINT_DEFINITIONS[0]
}

function normalizeProfileKey(profile) {
  return String(
    profile?.user_id
    ?? profile?.agent_id
    ?? profile?.username
    ?? profile?.name
    ?? '',
  ).trim()
}

function profileText(profile) {
  const role = profile?.war_ground_profile || {}
  return [profile?.name, profile?.display_name, profile?.role, role.role, role.call_sign]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
}

function pickProfile(profiles, used, archetype) {
  const candidates = profiles.filter((profile) => !used.has(normalizeProfileKey(profile)))
  const profileMatchScore = (profile) => {
    const text = profileText(profile)
    if (archetype.faction === 'opfor') {
      if (!/적|대항|opfor|enemy|red/.test(text)) return 0
      if (/정찰|감시|scout|screen/.test(text)) return 100
      if (/화력|fire/.test(text)) return 80
      if (/지휘|command/.test(text)) return 60
      return 40
    }
    if (archetype.id === 'terrain-observer') {
      if (!/지형|기상|terrain|weather/.test(text)) return 0
      if (/관측|observer|weather/.test(text)) return 100
      return 60
    }
    if (archetype.id === 'signal-agent') {
      if (!/통신|무전|signal|radio/.test(text)) return 0
      if (/통신병|통신참모|무전 운용|signal agent|radio operator/.test(text)) return 100
      return 60
    }
    if (archetype.id === 'company-commander') {
      if (!/대대장|중대장|지휘.?결심|지휘부|command|commander/.test(text)) return 0
      if (/중대장|company commander/.test(text)) return 100
      if (/지휘.?결심|지휘부/.test(text)) return 85
      if (/대대장/.test(text)) return 70
      return 50
    }
    if (archetype.id === 'platoon-one') {
      if (!/1소대|1중대.*소대|platoon.?one/.test(text)) return 0
      if (/1소대장|1중대.*1소대장|platoon.?one.*leader/.test(text)) return 100
      if (/1소대.*장|1소대.*기동/.test(text)) return 80
      return 40
    }
    if (archetype.id === 'platoon-two') {
      if (!/2소대|2중대.*소대|platoon.?two/.test(text)) return 0
      if (/2소대장|2중대.*2소대장|platoon.?two.*leader/.test(text)) return 100
      if (/2소대.*장|2소대.*기동/.test(text)) return 80
      return 40
    }
    return /소대|현장|기동|field|platoon|leader/.test(text) ? 20 : 0
  }
  const match = candidates
    .map((profile, index) => ({ profile, index, score: profileMatchScore(profile) }))
    .filter((item) => item.score > 0)
    .sort((left, right) => right.score - left.score || left.index - right.index)[0]?.profile
  const selected = match || candidates[0]
  if (selected) used.add(normalizeProfileKey(selected))
  return selected || null
}

function numericStat(value, fallback) {
  const number = Number(value)
  return Number.isFinite(number) ? number : fallback
}

function combatStatsFor(profile, index = 0) {
  const stats = profile?.war_ground_profile?.combat_stats || {}
  return {
    health_hp: clamp(numericStat(stats.health_hp, 78 + (index % 5) * 4), 1, 120),
    stamina: clamp(numericStat(stats.stamina, 70 + (index % 6) * 4), 1, 120),
    armor: clamp(numericStat(stats.armor, 28 + (index % 7) * 5), 0, 100),
    move_speed_kph: clamp(numericStat(stats.move_speed_kph, 4.5 + (index % 4) * 0.8), 0, 20),
    comm_range_km: clamp(numericStat(stats.comm_range_km, 7 + (index % 5) * 1.5), 0, 50),
    reaction_sec: clamp(numericStat(stats.reaction_sec ?? stats.reaction_time_sec, 24 + (index % 6) * 4), 1, 180),
  }
}

function profileFaction(profile) {
  const role = profile?.war_ground_profile || {}
  const text = [role.faction, role.layer, profile?.role, profile?.profession, profile?.name]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
  if (/opfor|enemy|red|대항|적/.test(text)) return 'opfor'
  if (/environment|terrain|weather|환경|지형|기상/.test(text)) return 'environment'
  return 'blue'
}

function profileGroup(profile, faction) {
  const role = profile?.war_ground_profile || {}
  const layer = String(role.layer || '').toLowerCase()
  if (role.group) return role.group
  if (faction === 'opfor') return '대항군'
  if (faction === 'environment') return '환경·지형'
  if (layer === 'control') return '지휘·통제'
  if (layer === 'staff') return '참모·분석'
  return '현장 지원'
}

function blueprintFor(profile, index) {
  const role = profile?.war_ground_profile || {}
  const faction = profileFaction(profile)
  if (role.character) {
    const base = PERSONA_BLUEPRINTS.find((item) => item.character === role.character) || PERSONA_BLUEPRINTS[index % PERSONA_BLUEPRINTS.length]
    return {
      ...base,
      character: role.character,
      color: role.color || base.color,
      posture: role.posture || base.posture,
      temperament: role.temperament || base.temperament,
    }
  }
  if (faction === 'opfor') return { ...PERSONA_BLUEPRINTS[2], character: 'scout', color: '#b42318', posture: '축선 차단', temperament: '청색 기동을 먼저 감지하고 감시선의 빈틈을 줄입니다.' }
  if (faction === 'environment') return { ...PERSONA_BLUEPRINTS[8] }
  if (String(profile?.war_ground_profile?.layer || '').toLowerCase() === 'control') return { ...PERSONA_BLUEPRINTS[9] }
  return PERSONA_BLUEPRINTS[index % PERSONA_BLUEPRINTS.length]
}

function rosterPlacement(index) {
  const column = index % 10
  const row = Math.floor(index / 10)
  return [0.06 + column * 0.096, 0.16 + row * 0.09 + (column % 2 ? 0.018 : 0)]
}

function createRosterAgent(profile, index, bounds) {
  const role = profile?.war_ground_profile || {}
  const faction = profileFaction(profile)
  const blueprint = blueprintFor(profile, index)
  const route = ROSTER_ROUTE_PATTERNS[index % ROSTER_ROUTE_PATTERNS.length]
  const placementPoint = rosterPlacement(index)
  const profileName = profile?.display_name || profile?.name || `전장 에이전트 ${index + 1}`
  const roleLabel = role.role || profile?.role || profile?.profession || '전장 에이전트'
  const objective = findWaypoint(route.at(-1)).label
  return {
    id: `roster-${normalizeProfileKey(profile) || index}`,
    sourceProfileId: normalizeProfileKey(profile),
    profileGenerator: profile?.profile_generator || role.generator || 'unverified',
    profileEvidenceIds: [...(profile?.evidence_ids || role.evidence_ids || [])],
    label: profileName,
    name: profileName,
    profileName,
    callSign: role.call_sign || profile?.username || `ROSTER-${String(index + 1).padStart(2, '0')}`,
    group: profileGroup(profile, faction),
    role: roleLabel,
    faction,
    sideName: faction === 'opfor' ? '대항군' : faction === 'environment' ? '환경·지형' : '아군',
    sideColor: blueprint.color,
    entityType: 'army',
    groundUnit: true,
    modelId: role.model_id || 'personnel-soldier',
    layer: role.layer || 'field',
    posture: blueprint.posture,
    temperament: blueprint.temperament,
    persona: profile?.persona || profile?.bio || blueprint.temperament,
    personaSummary: `${roleLabel} · ${blueprint.temperament}`,
    character: blueprint.character,
    color: blueprint.color,
    route: [...route],
    placementPoint,
    objective,
    locationLabel: '현장 배치',
    longitude: coordinateForPoint(placementPoint, bounds).longitude,
    latitude: coordinateForPoint(placementPoint, bounds).latitude,
    progress: 0,
    status: '대기',
    dialogue: '',
    combatStats: combatStatsFor(profile, index),
    confidence: numericStat(role.confidence, 0.78),
    synthetic: false,
  }
}

function createGeneratedProfile(blueprint) {
  const index = blueprint.index
  const name = blueprint.name
  return {
    user_id: `generated-${index}`,
    name,
    display_name: name,
    username: `generated_${String(index + 1).padStart(2, '0')}`,
    role: blueprint.role,
    profession: blueprint.role,
    persona: `${name}는 ${blueprint.temperament}`,
    war_ground_profile: {
      call_sign: blueprint.callSign,
      role: blueprint.role,
      faction: blueprint.faction,
      layer: blueprint.layer,
      group: blueprint.group,
      character: blueprint.character,
      posture: blueprint.posture,
      temperament: blueprint.temperament,
      color: blueprint.color,
      model_id: 'personnel-soldier',
      combat_stats: {
        health_hp: 72 + (index % 8) * 5,
        stamina: 64 + (index % 7) * 6,
        armor: 20 + (index % 9) * 6,
        move_speed_kph: 3.8 + (index % 6) * 0.7,
        comm_range_km: 5 + (index % 8) * 1.8,
        reaction_sec: 18 + (index % 7) * 5,
      },
    },
  }
}

function syntheticProfile(archetype) {
  return {
    user_id: `synthetic-${archetype.id}`,
    name: archetype.label,
    display_name: archetype.label,
    war_ground_profile: { call_sign: archetype.callSign, role: archetype.role },
  }
}

function dynamicUnitType(unit = {}) {
  const text = [unit.unit_type, unit.type, unit.layer, unit.role, unit.mission].filter(Boolean).join(' ').toLowerCase()
  if (/opfor|enemy|적|대항/.test(text)) return 'opfor'
  if (/environment|terrain|weather|환경|지형|기상/.test(text)) return 'environment'
  if (/control|통제|심판|sop/.test(text)) return 'control'
  if (/staff|hq|본부|참모|지휘/.test(text)) return 'staff'
  if (/support|지원|군수|의무|통신|공병/.test(text)) return 'support'
  return 'maneuver'
}

function dynamicFaction(value, unit = {}) {
  const text = [value, unit.faction, unit.unit_type, unit.layer, unit.name].filter(Boolean).join(' ').toLowerCase()
  if (/opfor|enemy|red|적|대항/.test(text)) return 'opfor'
  if (/environment|terrain|weather|환경|지형|기상/.test(text)) return 'environment'
  return 'blue'
}

function organizationFromProfiles(profiles = []) {
  const units = []
  const byKey = new Map()
  profiles.forEach((profile, index) => {
    const role = profile?.war_ground_profile || {}
    const key = String(role.unit_id || profile.unit_id || role.unit || role.group || profile.group || 'unassigned').trim() || 'unassigned'
    if (!byKey.has(key)) {
      const unit = {
        id: key.toLowerCase().replace(/[^0-9a-z가-힣]+/gi, '-') || `unit-${index + 1}`,
        name: key === 'unassigned' ? '미지정 부대' : key,
        parent_id: 'battalion',
        unit_type: dynamicUnitType({ ...role, role: role.role || profile.role, unit: key }),
        faction: dynamicFaction(role.faction, role),
        is_maneuver: dynamicUnitType({ ...role, role: role.role || profile.role, unit: key }) === 'maneuver',
        mission: role.mission || role.role || profile.role || '부대 임무 수행',
        personality: role.temperament || profile.persona || '상황에 따라 판단',
        risk_tolerance: role.risk_tolerance || '중간',
        sop_constraints: role.sop_constraints || [],
        route_options: role.route_options || {},
        personnel: [],
      }
      byKey.set(key, unit)
      units.push(unit)
    }
    byKey.get(key).personnel.push(profile)
  })
  return {
    version: 'war-ground-organization-v1-client-inferred',
    root_id: 'battalion',
    battalion: { id: 'battalion', name: '사용자 제공 대대', mission: '사용자 제공 임무' },
    units,
    agents: [],
    maneuver_units: units.filter((unit) => unit.is_maneuver).map((unit) => ({
      unit_id: unit.id,
      name: unit.name,
      mission: unit.mission,
      personality: unit.personality,
      risk_tolerance: unit.risk_tolerance,
      route_options: unit.route_options,
    })),
  }
}

function coordinateForDynamicPoint(point, bounds) {
  if (point && typeof point === 'object' && !Array.isArray(point)) {
    if (Number.isFinite(Number(point.longitude)) && Number.isFinite(Number(point.latitude))) return point
    if (Array.isArray(point.point)) return coordinateForPoint(point.point, bounds)
  }
  if (Array.isArray(point)) return coordinateForPoint(point, bounds)
  return coordinateForPoint([0.5, 0.5], bounds)
}

function dynamicRoutePoints(unit, index, { allowFallback = true } = {}) {
  const options = unit?.route_options || unit?.routes || {}
  const optionValues = Object.values(options).filter((value) => Array.isArray(value) && value.length)
  const selected = optionValues[0] || []
  const normalized = selected.map((point) => {
    if (point && typeof point === 'object' && !Array.isArray(point)
      && Number.isFinite(Number(point.longitude)) && Number.isFinite(Number(point.latitude))) {
      return {
        longitude: Number(point.longitude),
        latitude: Number(point.latitude),
        altitude_m: Number(point.altitude_m ?? point.altitude ?? 0),
      }
    }
    if (Array.isArray(point)) return point
    if (point && typeof point === 'object' && Array.isArray(point.point)) return point.point
    return null
  }).filter((point) => (
    Array.isArray(point)
      ? point.length >= 2
      : point && Number.isFinite(Number(point.longitude)) && Number.isFinite(Number(point.latitude))
  ))
  if (normalized.length >= 2) return normalized
  if (!allowFallback) return []
  const column = index % 8
  const row = Math.floor(index / 8)
  const start = [0.08 + column * 0.08, 0.72 + (row % 2) * 0.06]
  const goal = [0.55 + ((index * 17) % 35) / 100, 0.18 + ((index * 29) % 58) / 100]
  const middle = [start[0] + (goal[0] - start[0]) * 0.48, start[1] + (goal[1] - start[1]) * (unit?.is_maneuver ? 0.34 : 0.5)]
  return [start, middle, goal]
}

function dynamicColor(index, faction) {
  const palette = faction === 'opfor' ? ['#b42318', '#991b1b', '#7f1d1d'] : faction === 'environment' ? ['#a16207', '#854d0e'] : ['#2563eb', '#0f766e', '#4338ca', '#0369a1', '#15803d', '#7c3aed']
  return palette[index % palette.length]
}

function createOrganizationAgent(agent, unit, index, bounds) {
  const source = agent || {}
  const sourceWarGroundProfile = source.war_ground_profile || source.warGroundProfile || {}
  const unitType = dynamicUnitType(unit)
  const isManeuver = unit.is_maneuver ?? unit.isManeuver ?? unitType === 'maneuver'
  const faction = dynamicFaction(source.faction, unit)
  const coordinateSystem = String(unit.route_coordinate_system || unit.coordinate_system || '').trim().toLowerCase()
  const declaredWgs84 = ['wgs84', 'epsg:4326', 'wgs84+altitude_m'].includes(coordinateSystem)
  const routePoints = dynamicRoutePoints(unit, index, { allowFallback: !declaredWgs84 })
  const role = source.role || (source.commander ? '부대 지휘' : unitType === 'maneuver' ? '현장 수행' : unitType)
  const posture = source.posture || unit.personality || '상황에 따라 판단'
  const color = source.color || unit.color || dynamicColor(index, faction)
  const initial = coordinateForDynamicPoint(routePoints[0], bounds)
  const options = Object.keys(unit.route_options || {}).filter(Boolean)
  const defaultDecision = source.liveDecision || source.decision || options[0] || (isManeuver ? 'advance' : 'hold')
  return {
    id: String(source.id || source.user_id || `${unit.id}::agent-${index + 1}`).trim(),
    sourceProfileId: source.source_profile_id || source.user_id || source.sourceProfileId || '',
    profileGenerator: source.profile_generator || sourceWarGroundProfile.generator || 'unverified',
    profileEvidenceIds: [...(source.evidence_ids || sourceWarGroundProfile.evidence_ids || [])],
    label: source.label || source.name || source.display_name || `${unit.name} ${index + 1}번`,
    name: source.name || source.label || source.display_name || `${unit.name} ${index + 1}번`,
    profileName: source.name || source.label || source.display_name || `${unit.name} ${index + 1}번`,
    callSign: source.call_sign || source.callSign || `${unit.id}-${String(index + 1).padStart(2, '0')}`,
    group: unit.name,
    role,
    rank: source.rank || '',
    faction,
    sideName: faction === 'opfor' ? '대항군' : faction === 'environment' ? '환경·지형' : '아군',
    sideColor: color,
    color,
    layer: source.layer || unitType,
    character: source.character || (unitType === 'maneuver' ? 'leader' : unitType === 'support' ? 'coordinator' : unitType === 'opfor' ? 'scout' : 'observer'),
    posture,
    temperament: source.personality || source.temperament || unit.personality || '상황에 따라 판단',
    persona: source.personality || source.persona || unit.personality || '상황에 따라 판단',
    personaSummary: `${role} · ${source.personality || unit.personality || '상황에 따라 판단'}`,
    traits: [...(source.traits || sourceWarGroundProfile.traits || unit.traits || [])],
    warGroundProfile: sourceWarGroundProfile,
    unitId: unit.id,
    parentUnitId: unit.parent_id || 'battalion',
    parentAgentId: source.parent_agent_id || source.parentAgentId || '',
    organizationPath: unit.path || [unit.name],
    commanderAgentId: unit.commander_id || '',
    isCommander: Boolean(source.commander || source.is_commander || source.id === unit.commander_id),
    isManeuver: Boolean(isManeuver),
    mission: source.mission || unit.mission || '임무 수행',
    objective: source.objective || unit.mission || '지정 임무 수행',
    riskTolerance: source.risk_tolerance || unit.risk_tolerance || '중간',
    sopConstraints: [...(source.sop_constraints || unit.sop_constraints || [])],
    weapons: [...(source.weapons || unit.weapons || [])],
    vehicles: [...(source.vehicles || unit.vehicles || [])],
    logisticsAssets: [...(source.logistics_assets || unit.logistics_assets || [])],
    communicationAssets: [...(source.communication_assets || unit.communication_assets || [])],
    reconnaissanceAssets: [...(source.reconnaissance_assets || unit.reconnaissance_assets || [])],
    supportAssets: [...(source.support_assets || unit.support_assets || [])],
    communicationState: source.communication_state || source.communicationState || unit.communication_state || {},
    logisticsStatus: source.logistics_status || source.logisticsStatus || unit.logistics_status || {},
    currentBattlefieldState: source.current_battlefield_state || source.currentBattlefieldState || unit.current_battlefield_state || {},
    decisionHistory: [...(source.decision_history || source.decisionHistory || unit.decision_history || [])],
    decisionOptions: options.length ? options : isManeuver ? ['advance', 'hold'] : ['hold'],
    liveDecision: defaultDecision,
    routePoints,
    routeGeometryAuthority: declaredWgs84 && routePoints.length >= 2 ? 'declared_wgs84' : 'unverified',
    routeGeometryIssue: declaredWgs84 ? 'route_missing_or_invalid' : 'route_coordinate_system_missing_or_not_wgs84',
    route: [],
    placementPoint: routePoints[0],
    status: '배치 대기',
    locationLabel: '현장 배치',
    longitude: initial.longitude,
    latitude: initial.latitude,
    progress: 0,
    dialogue: '',
    combatStats: {
      health_hp: numericStat(source.combat_stats?.health_hp ?? source.combatStats?.health_hp ?? sourceWarGroundProfile.combat_stats?.health_hp ?? unit.combat_stats?.health_hp, 80),
      stamina: numericStat(source.combat_stats?.stamina ?? source.combatStats?.stamina ?? sourceWarGroundProfile.combat_stats?.stamina ?? unit.combat_stats?.stamina, 75),
      armor: numericStat(source.combat_stats?.armor ?? source.combatStats?.armor ?? sourceWarGroundProfile.combat_stats?.armor ?? unit.combat_stats?.armor, 30),
      move_speed_kph: numericStat(source.combat_stats?.move_speed_kph ?? source.combatStats?.move_speed_kph ?? sourceWarGroundProfile.combat_stats?.move_speed_kph ?? unit.combat_stats?.move_speed_kph, 6),
      comm_range_km: numericStat(source.combat_stats?.comm_range_km ?? source.combatStats?.comm_range_km ?? sourceWarGroundProfile.combat_stats?.comm_range_km ?? unit.combat_stats?.comm_range_km, 7),
      reaction_sec: numericStat(source.combat_stats?.reaction_time_sec ?? source.combatStats?.reaction_sec ?? sourceWarGroundProfile.combat_stats?.reaction_sec ?? unit.combat_stats?.reaction_sec, 30),
    },
    synthetic: false,
  }
}

function buildDynamicMessages(scene, tick) {
  const commanders = scene.agents.filter((agent) => agent.isCommander || agent.isManeuver).slice(0, 4)
  if (!commanders.length) return []
  return commanders.map((agent) => ({
    id: `${agent.id}-${tick}`,
    tick,
    timeMinute: tick * 5,
    speakerId: agent.id,
    speaker: agent.label,
    callSign: agent.callSign,
    group: agent.group,
    text: tick === 0
      ? `${agent.group} 초기 보고: ${agent.mission}을 수행합니다. ${agent.posture} 성향을 적용합니다.`
      : `${agent.group} 상황 보고: ${agent.status}. 현재 임무와 ${agent.riskTolerance} 위험 허용도를 기준으로 다음 행동을 판단합니다.`,
    tone: agent.faction === 'opfor' ? 'threat' : tick === 0 ? 'command' : 'report',
    location: { longitude: agent.longitude, latitude: agent.latitude },
  }))
}

export function koreanDisplayText(value, fallback) {
  const text = String(value || '').trim()
  if (!text || /[A-Za-z]{3,}/.test(text)) return fallback
  return text
}

function createAgent(archetype, profile, bounds) {
  const source = profile || syntheticProfile(archetype)
  const role = source.war_ground_profile || {}
  const initialPoint = coordinateForPoint(findWaypoint(archetype.route[0]).point, bounds)
  const sourceProfileName = koreanDisplayText(source.display_name || source.name, archetype.label)
  const displayName = sourceProfileName
  const roleLabel = koreanDisplayText(role.role || source.role || source.profession, archetype.role)
  const personaSummary = koreanDisplayText(role.temperament || source.persona || source.bio, archetype.temperament)
  return {
    id: archetype.id,
    sourceProfileId: normalizeProfileKey(profile),
    profileGenerator: source.profile_generator || role.generator || 'unverified',
    profileEvidenceIds: [...(source.evidence_ids || role.evidence_ids || [])],
    sourceProfileName,
    label: displayName,
    name: displayName,
    profileName: sourceProfileName,
    callSign: role.call_sign || source.username || archetype.callSign,
    group: archetype.group,
    role: roleLabel,
    layer: role.layer || archetype.group,
    faction: archetype.faction,
    sideName: archetype.faction === 'opfor' ? '대항군' : archetype.faction === 'environment' ? '환경·지형' : '아군',
    sideColor: archetype.color,
    entityType: 'army',
    groundUnit: true,
    modelId: role.model_id || 'personnel-soldier',
    posture: archetype.posture,
    temperament: archetype.temperament,
    persona: personaSummary,
    personaSummary: `${roleLabel} · ${personaSummary}`,
    traits: [...(role.traits || source.traits || [])],
    warGroundProfile: role,
    routeGeometryAuthority: 'inferred_preview',
    routeGeometryIssue: 'organization_route_not_declared',
    character: archetype.character,
    color: archetype.color,
    route: [...archetype.route],
    placementPoint: null,
    status: '대기',
    locationLabel: findWaypoint(archetype.route[0]).label,
    objective: findWaypoint(archetype.route.at(-1)).label,
    longitude: initialPoint.longitude,
    latitude: initialPoint.latitude,
    progress: 0,
    dialogue: '',
    combatStats: combatStatsFor(source, ARCHETYPES.findIndex((item) => item.id === archetype.id)),
    confidence: numericStat(role.confidence, 0.78),
    synthetic: !profile,
  }
}

function distance(a, b) {
  return Math.hypot(b[0] - a[0], b[1] - a[1])
}

function pointAlongRoute(route, progress) {
  if (route.length <= 1) return route[0] || [0.5, 0.5]
  const segments = route.slice(1).map((point, index) => ({ from: route[index], to: point, length: distance(route[index], point) }))
  const total = segments.reduce((sum, segment) => sum + segment.length, 0) || 1
  let remaining = clamp(progress, 0, 1) * total
  for (const segment of segments) {
    if (remaining <= segment.length) {
      const ratio = segment.length ? remaining / segment.length : 0
      return [
        segment.from[0] + (segment.to[0] - segment.from[0]) * ratio,
        segment.from[1] + (segment.to[1] - segment.from[1]) * ratio,
      ]
    }
    remaining -= segment.length
  }
  return segments.at(-1).to
}

function agentRoute(agent, tick) {
  return agent.route
}

function statusForAgent(agent, tick, routeProgress) {
  if (agent.id === 'platoon-one' && !agent.unitId) return tick >= 3 ? (routeProgress >= 0.84 ? '1고지 확보' : '적 감시선 돌파') : '출발 대기'
  if (agent.id === 'platoon-two' && !agent.unitId) return tick >= 3 ? (routeProgress >= 0.84 ? '2고지 접근' : '계곡 우회 이동') : '출발 대기'
  if (agent.faction === 'opfor') return tick >= 2 ? '감시선 차단' : '감시 대기'
  if (agent.layer === 'environment' || agent.character === 'observer') return '환경 관측'
  if (agent.character === 'signal') return tick >= 5 ? '위치 보고' : '통신 연결'
  if (tick < 1) return '출발 대기'
  if (agent.isCommander && agent.isManeuver) return routeProgress >= 0.84 ? '목표 구역 확보' : '기동 판단·실행 중'
  if (agent.id.startsWith('roster-')) {
    if (agent.faction === 'opfor') return tick >= 2 ? '감시·차단' : '감시 대기'
    if (agent.faction === 'environment') return '환경 관측'
    if (agent.layer === 'control') return '상황 조정'
    return routeProgress >= 0.84 ? '목표 구역 도달' : '기동·분석 중'
  }
  return '기동 중'
}

function buildMessage(id, tick, text, tone, bounds) {
  const archetype = ARCHETYPES.find((item) => item.id === id) || ARCHETYPES[0]
  const location = coordinateForPoint(findWaypoint(archetype.route[Math.min(tick, archetype.route.length - 1)]).point, bounds)
  return {
    id: `${id}-${tick}`,
    tick,
    timeMinute: tick * 5,
    speakerId: id,
    speaker: archetype.label,
    callSign: archetype.callSign,
    group: archetype.group,
    text,
    tone,
    location,
  }
}

function messagesAtTick(tick, bounds) {
  return (SCENARIO_MESSAGES[tick] || []).map(([id, text, tone]) => buildMessage(id, tick, text, tone, bounds))
}

function materializeScene(scene, tick, bounds) {
  const messages = scene.messages || []
  const latestByAgent = new Map()
  for (const message of messages) latestByAgent.set(message.speakerId, message)
  const agents = scene.agents.map((agent) => {
    const routeIds = agentRoute(agent, tick)
    const routePoints = agent.routePoints?.length
      ? agent.routePoints
      : [
      ...(agent.placementPoint ? [agent.placementPoint] : []),
      ...routeIds.map((id) => findWaypoint(id).point),
    ]
    const progress = !agent.isManeuver && (agent.layer === 'staff' || agent.layer === 'control' || agent.layer === 'environment' || agent.faction === 'opfor' || agent.character === 'observer')
      ? (tick >= 3 ? 1 : 0)
      : clamp(tick / 10, 0, 1)
    const point = pointAlongRoute(routePoints, progress)
    const coordinate = coordinateForDynamicPoint(point, bounds)
    const latest = latestByAgent.get(agent.id)
    return {
      ...agent,
      route: routeIds,
      routePoints,
      routeCoordinates: routePoints.map((item) => coordinateForDynamicPoint(item, bounds)),
      progress,
      longitude: coordinate.longitude,
      latitude: coordinate.latitude,
      locationLabel: progress === 0 && agent.placementPoint
        ? '현장 배치'
        : agent.routePoints?.length
          ? (progress >= 0.95 ? agent.objective || '목표 구역' : `${agent.group} 이동 중`)
          : findWaypoint(routeIds[Math.min(Math.floor(progress * routeIds.length), routeIds.length - 1)]).label,
      status: statusForAgent(agent, tick, progress),
      dialogue: latest?.tick === tick ? latest.text : '',
      dialogueTone: latest?.tick === tick ? latest.tone : '',
      selected: agent.id === scene.selectedAgentId,
    }
  })
  const routes = agents
    .filter((agent) => agent.routeCoordinates.length > 1)
    .map((agent) => ({
      id: agent.id,
      label: `${agent.group} ${agent.posture}`,
      coordinates: agent.routeCoordinates.map((item) => [item.longitude, item.latitude]),
      color: agent.color,
      active: agent.isManeuver || agent.progress > 0,
    }))
  const groundMarkers = WAYPOINT_DEFINITIONS.map((waypoint) => ({
    id: waypoint.id,
    label: waypoint.label,
    kind: waypoint.kind,
    ...coordinateForPoint(waypoint.point, bounds),
  }))
  return { ...scene, tick, currentTime: `T+${tick * 5}분`, agents, units: agents, routes, groundMarkers }
}

export function buildFieldScene({ profiles = [], organization = null, terrain, initialTick = 0 } = {}) {
  const bounds = terrainBounds(terrain)
  const hasExplicitProfileOrganization = profiles.some((profile) => {
    const role = profile?.war_ground_profile || {}
    return Boolean(role.unit_id || profile.unit_id || role.unit || role.group || profile.group || role.mission || role.route_options || role.weapons || role.vehicles)
  })
  const suppliedOrganization = organization?.units?.length
    ? organization
    : hasExplicitProfileOrganization
      ? organizationFromProfiles(profiles)
      : null
  if (suppliedOrganization?.units?.length) {
    const units = suppliedOrganization.units
    const sourceAgents = suppliedOrganization.agents?.length
      ? suppliedOrganization.agents
      : units.flatMap((unit) => (unit.personnel || []).map((agent) => ({ ...agent, unit_id: unit.id })))
    const agents = sourceAgents.length
      ? sourceAgents.map((agent, index) => {
        const unit = units.find((item) => item.id === (agent.unit_id || agent.unitId)) || units[index % units.length]
        return createOrganizationAgent(agent, unit, index, bounds)
      })
      : units.flatMap((unit, unitIndex) => [createOrganizationAgent({
        id: unit.commander_id || `${unit.id}::commander`,
        name: `${unit.name} 지휘관`,
        role: '부대 지휘',
        commander: true,
      }, unit, unitIndex, bounds)])
    const maneuverUnits = units.filter((unit) => (unit.is_maneuver ?? unit.isManeuver ?? dynamicUnitType(unit) === 'maneuver') && dynamicFaction(unit.faction, unit) === 'blue')
    let dynamicScene = {
      id: 'organization-driven-rehearsal',
      title: suppliedOrganization.battalion?.name || '사용자 편성 기반 리허설',
      description: suppliedOrganization.battalion?.mission || '사용자가 제공한 부대 편성과 임무를 기준으로 생성된 리허설입니다.',
      mission: suppliedOrganization.battalion?.mission || '사용자 제공 대대 임무 수행',
      organization: suppliedOrganization,
      maneuverUnits: maneuverUnits.map((unit) => ({
        unitId: unit.id,
        name: unit.name,
        commanderId: unit.commander_id,
        mission: unit.mission,
        routeOptions: unit.route_options || {},
      })),
      environment: [
        { label: '편성', value: `${units.length}개 부대` },
        { label: '기동 부대', value: `${maneuverUnits.length}개` },
        { label: 'SOP', value: `${(suppliedOrganization.battalion?.sop || []).length}개 조건` },
      ],
      tick: 0,
      maxTick: MAX_TICK,
      currentTime: 'T+0분',
      phase: 'briefing',
      phaseLabel: '기동 준비',
      selectedAgentId: agents[0]?.id || null,
      bounds,
      agents,
      messages: [],
      routes: [],
      groundMarkers: [],
      units: [],
    }
    dynamicScene = materializeScene(dynamicScene, 0, bounds)
    return dynamicScene
  }
  // A front-end scenario template must never become a substitute for the
  // graph-derived roster, declared organization, or routes.  Until those
  // server-owned inputs exist, show a blocked surface instead of staged
  // agents, scripted dialogue, or fabricated movement.
  return {
    id: 'awaiting-authoritative-organization',
    title: '편성·경로 선언 대기',
    description: '그래프 기반 AI 에이전트, 편성, 그리고 실제 좌표 경로가 모두 확정되어야 리허설을 시작할 수 있습니다.',
    mission: '',
    authority: 'blocked',
    blockReason: 'organization_and_declared_routes_required',
    profileCount: profiles.length,
    tick: 0,
    maxTick: MAX_TICK,
    currentTime: 'T+0분',
    phase: 'blocked',
    phaseLabel: '서버 편성 대기',
    selectedAgentId: null,
    bounds,
    agents: [],
    messages: [],
    routes: [],
    groundMarkers: [],
    units: [],
  }
}

export function advanceFieldScene(scene) {
  if (!scene) return scene
  if (scene.authority === 'blocked') return scene
  const nextTick = Math.min(Number(scene.maxTick || MAX_TICK), Number(scene.tick || 0) + 1)
  if (nextTick === scene.tick) return { ...scene, phase: 'complete', phaseLabel: '목표 도달', playing: false }
  const newMessages = scene.organization?.units?.length
    ? buildDynamicMessages({ ...scene, tick: nextTick }, nextTick)
    : messagesAtTick(nextTick, scene.bounds)
  const next = {
    ...scene,
    tick: nextTick,
    phase: nextTick >= scene.maxTick ? 'complete' : nextTick >= 3 ? 'moving' : 'briefing',
    phaseLabel: nextTick >= scene.maxTick ? '목표 도달' : nextTick >= 3 ? '경로 실행 중' : '상황 전파 중',
    messages: [...(scene.messages || []), ...newMessages].slice(-MAX_MESSAGES),
  }
  return materializeScene(next, nextTick, scene.bounds)
}

export function selectFieldAgent(scene, agentId) {
  if (!scene || !scene.agents.some((agent) => agent.id === agentId)) return scene
  return { ...scene, selectedAgentId: agentId }
}

export function saveFieldSimulationState(simulationId, scene, storage = globalThis.localStorage) {
  if (!String(simulationId || '').trim() || !storage?.setItem || !scene) return
  try {
    storage.setItem(`war-ground:field:${simulationId}`, JSON.stringify({
      scenarioId: scene.id,
      tick: scene.tick,
      selectedAgentId: scene.selectedAgentId,
    }))
  } catch {
    // A browser without storage can still run the field simulation in memory.
  }
}

export function loadFieldSimulationState(simulationId, storage = globalThis.localStorage) {
  if (!String(simulationId || '').trim() || !storage?.getItem) return null
  try {
    const payload = JSON.parse(storage.getItem(`war-ground:field:${simulationId}`) || 'null')
    if (!payload || typeof payload !== 'object') return null
    return {
      scenarioId: String(payload.scenarioId || ''),
      tick: Number.isFinite(payload.tick) ? clamp(payload.tick, 0, MAX_TICK) : 0,
      selectedAgentId: String(payload.selectedAgentId || ''),
    }
  } catch {
    return null
  }
}

export function fieldScenarioSummary(scene) {
  if (!scene) return null
  const maneuverAgents = (scene.agents || []).filter((agent) => agent.isManeuver || agent.is_maneuver || agent.unitId || agent.unit_id)
  const first = maneuverAgents[0]
  const second = maneuverAgents[1]
  return {
    time: scene.currentTime,
    phase: scene.phaseLabel,
    firstRoute: first?.status || '',
    secondRoute: second?.status || '',
    maneuverUnits: maneuverAgents.map((agent) => ({
      id: agent.unitId || agent.unit_id || agent.id,
      label: agent.group || agent.label || agent.id,
      status: agent.status || '',
      decision: agent.liveDecision || agent.decision || '',
    })),
    messageCount: scene.messages?.length || 0,
  }
}
