// @ts-nocheck
const OPERATIONAL_FIELDS = Object.freeze([
  ['personnel', 'available'],
  ['personnel', 'fatigue'],
  ['mobility', 'vehicle_available'],
  ['mobility', 'vehicle_status'],
  ['sustainment', 'fuel'],
  ['sustainment', 'ammunition'],
  ['sustainment', 'equipment_status'],
  ['communications', 'radio_model'],
  ['communications', 'power'],
  ['communications', 'antenna'],
  ['communications', 'relay'],
  ['communications', 'terrain_screening'],
])
const OPERATIONAL_FIELD_SET = new Set(OPERATIONAL_FIELDS.map(([group, field]) => `${group}.${field}`))

function firstSourcedObservation(profiles, group, field) {
  for (const profile of profiles) {
    const observation = profile?.war_ground_profile?.operational_state?.[group]?.[field]
    if (observation?.value !== undefined && observation?.value !== null && observation?.source) {
      return {
        value: observation.value,
        unit: observation.unit ?? null,
        as_of: observation.as_of ?? null,
        evidence_id: String(observation.source),
        confidence: observation.confidence ?? null,
        estimated: Boolean(observation.estimated),
      }
    }
  }
  return undefined
}

function coaId(index) {
  return `coa-${String.fromCharCode(97 + index)}`
}

function decisionList(value) {
  if (Array.isArray(value)) return value.map((item) => String(item || '').trim()).filter(Boolean)
  return String(value || '').split(/\r?\n/).map((item) => item.trim()).filter(Boolean)
}

function decisionPointOf({
  decisionTime = '',
  inputCutoffTime = '',
  decisionQuestion = '',
  decisionContext = '',
  missionContext = '',
  knownInformation = '',
  unknownInformation = '',
} = {}) {
  const point = {}
  const values = {
    decision_time: decisionTime,
    input_cutoff_time: inputCutoffTime || decisionTime,
    decision_question: decisionQuestion,
    decision_context: decisionContext,
    mission_context: missionContext,
  }
  for (const [key, value] of Object.entries(values)) {
    const normalized = String(value || '').trim()
    if (normalized) point[key] = normalized
  }
  const known = decisionList(knownInformation)
  const unknown = decisionList(unknownInformation)
  if (known.length) point.known_information_at_decision_time = known
  if (unknown.length) point.unknown_information_at_decision_time = unknown
  return Object.keys(point).length ? point : undefined
}

function parseEventLocation(value, eventId) {
  if (value === undefined || value === null) return undefined
  const coordinates = Array.isArray(value)
    ? value
    : [value.longitude, value.latitude]
  if (coordinates.length < 2 || !Number.isFinite(Number(coordinates[0])) || !Number.isFinite(Number(coordinates[1]))) {
    throw new Error(`operator event location must contain longitude and latitude: ${eventId}`)
  }
  const longitude = Number(coordinates[0])
  const latitude = Number(coordinates[1])
  if (longitude < -180 || longitude > 180 || latitude < -90 || latitude > 90) {
    throw new Error(`operator event location is out of range: ${eventId}`)
  }
  return [longitude, latitude]
}

function parseOperatorStateDeclaration(raw, evidenceId) {
  if (!raw || !String(raw).trim()) return {}
  let declaration
  try {
    declaration = JSON.parse(raw)
  } catch {
    throw new Error('operator state declaration must be valid JSON')
  }
  if (!declaration || typeof declaration !== 'object' || Array.isArray(declaration)) {
    throw new Error('operator state declaration must be an object')
  }

  const state = {}
  for (const [group, fields] of Object.entries(declaration)) {
    if (group === '_metadata' || group === 'metadata') continue
    if (!fields || typeof fields !== 'object' || Array.isArray(fields)) throw new Error(`invalid operational group: ${group}`)
    for (const [field, observation] of Object.entries(fields)) {
      const path = `${group}.${field}`
      if (!OPERATIONAL_FIELD_SET.has(path)) throw new Error(`unknown operational field: ${path}`)
      if (!observation || typeof observation !== 'object' || Array.isArray(observation)) throw new Error(`invalid observation: ${path}`)
      if (observation.value === null || observation.value === undefined) continue
      const sourceLocator = String(observation.source_locator || '').trim()
      if (!sourceLocator) throw new Error(`operator state declaration requires source_locator: ${path}`)
      const observationEvidenceId = String(observation.evidence_id || evidenceId || '').trim()
      if (!observationEvidenceId) throw new Error(`operator state declaration requires evidence_id: ${path}`)
      state[group] ??= {}
      state[group][field] = {
        value: observation.value,
        unit: observation.unit ?? null,
        as_of: observation.as_of ?? null,
        source_locator: sourceLocator,
        evidence_id: observationEvidenceId,
        ...(Array.isArray(observation.evidence_ids) ? { evidence_ids: observation.evidence_ids } : {}),
        ...(observation.information_class ? { information_class: observation.information_class } : {}),
        confidence: observation.confidence ?? null,
        estimated: Boolean(observation.estimated),
      }
    }
  }
  return state
}

function parseOperatorEventDeclaration(raw, evidenceId) {
  if (!raw || !String(raw).trim()) return []
  let declaration
  try {
    declaration = JSON.parse(raw)
  } catch {
    throw new Error('operator event declaration must be valid JSON')
  }
  if (!Array.isArray(declaration) || declaration.length > 64) {
    throw new Error('operator event declaration must be a list of at most 64 events')
  }

  return declaration.map((event) => {
    if (!event || typeof event !== 'object' || Array.isArray(event)) throw new Error('invalid operator event')
    const eventId = String(event.event_id || '').trim()
    if (!eventId || !Number.isInteger(event.at_minute) || event.at_minute < 0) throw new Error('operator event requires event_id and non-negative at_minute')
    const sourceLocator = String(event.source_locator || '').trim()
    if (!sourceLocator) throw new Error(`operator event requires source_locator: ${eventId}`)
    const eventEvidenceIds = Array.from(new Set(
      (Array.isArray(event.evidence_ids) ? event.evidence_ids : [evidenceId])
        .map((value) => String(value || '').trim())
        .filter(Boolean),
    ))
    if (!eventEvidenceIds.length) throw new Error(`operator event requires evidence_id: ${eventId}`)
    const location = parseEventLocation(event.location, eventId)
    const effects = Array.isArray(event.effects) ? event.effects : []
    return {
      event_id: eventId,
      at_minute: event.at_minute,
      ...(event.event_type ? { event_type: String(event.event_type).trim() } : {}),
      ...(location ? { location } : {}),
      ...(event.location_note ? { location_note: String(event.location_note).trim() } : {}),
      affected_coa_ids: Array.from(new Set((Array.isArray(event.affected_coa_ids) ? event.affected_coa_ids : []).map((value) => String(value || '').trim()).filter(Boolean))).sort(),
      source_locator: sourceLocator,
      effects: effects.map((effect) => {
        if (!effect || typeof effect !== 'object' || Array.isArray(effect)) throw new Error(`invalid event effect: ${eventId}`)
        const path = String(effect.path || '').trim()
        if (!OPERATIONAL_FIELD_SET.has(path)) throw new Error(`unknown operational field: ${path}`)
        const hasDelta = Object.hasOwn(effect, 'delta')
        const hasSet = Object.hasOwn(effect, 'set')
        if (hasDelta === hasSet) throw new Error(`event effect requires delta or set: ${path}`)
        const effectEvidenceIds = Array.from(new Set(
          (Array.isArray(effect.evidence_ids) ? effect.evidence_ids : eventEvidenceIds)
            .map((value) => String(value || '').trim())
            .filter(Boolean),
        ))
        return { ...effect, path, evidence_ids: effectEvidenceIds }
      }),
      evidence_ids: eventEvidenceIds,
      failure_path: event.failure_path || undefined,
      when: event.when || undefined,
    }
  })
}

export function buildDeterministicRehearsalInput({
  terrain,
  profiles = [],
  operatorStateDeclaration = '',
  operatorEvidenceId = '',
  operatorCoaDeclaration = '',
  operatorEventDeclaration = '',
  operatorEventEvidenceId = '',
  scenarioSeed = '',
  scenarioId = '',
  decisionTime = '',
  inputCutoffTime = '',
  decisionQuestion = '',
  decisionContext = '',
  missionContext = '',
  knownInformation = '',
  unknownInformation = '',
} = {}) {
  const declaredState = parseOperatorStateDeclaration(operatorStateDeclaration, operatorEvidenceId)
  const initial_state = {}
  for (const [group, field] of OPERATIONAL_FIELDS) {
    const observation = declaredState[group]?.[field] || firstSourcedObservation(profiles, group, field)
    if (!observation) continue
    initial_state[group] ??= {}
    initial_state[group][field] = observation
  }

  let coaDefaults = Array.isArray(terrain?.coaDefaults) ? terrain.coaDefaults : []
  if (operatorCoaDeclaration.trim()) {
    let declaredCoas
    try {
      declaredCoas = JSON.parse(operatorCoaDeclaration)
    } catch {
      throw new Error('방책 선언은 JSON 배열이어야 합니다.')
    }
    if (!Array.isArray(declaredCoas) || !declaredCoas.length) {
      throw new Error('방책 선언은 하나 이상의 방책을 담은 JSON 배열이어야 합니다.')
    }
    coaDefaults = declaredCoas
  }
  const normalizedScenarioId = String(scenarioId || '').trim()
  const decision_point = decisionPointOf({
    decisionTime,
    inputCutoffTime,
    decisionQuestion,
    decisionContext,
    missionContext,
    knownInformation,
    unknownInformation,
  })
  return {
    seed: String(scenarioSeed || terrain?.package?.hash || '').trim() || 'terrain-package-unverified',
    ...(normalizedScenarioId ? { scenario_id: normalizedScenarioId } : {}),
    ...(decision_point ? { decision_point } : {}),
    initial_state,
    coas: coaDefaults.slice(0, 12).map((item, index) => {
      const definition = item && typeof item === 'object' ? item : { name: item }
      const declaredCoaId = String(definition.coa_id || '').trim()
      const effects = Array.isArray(definition.effects)
        ? definition.effects
        : Array.isArray(definition.expected_effects)
          ? definition.expected_effects
          : []
      return {
      coa_id: declaredCoaId || coaId(index),
      name: String(definition.name || coaId(index)).trim() || coaId(index),
      ...(Number.isFinite(definition.priority) ? { priority: definition.priority } : {}),
      ...(definition.decision_reason ? { decision_reason: String(definition.decision_reason).trim() } : {}),
      ...(Array.isArray(definition.preconditions) ? { preconditions: definition.preconditions } : {}),
      ...(Array.isArray(definition.immediate_actions) ? { immediate_actions: definition.immediate_actions } : {}),
      ...(Array.isArray(definition.reassessment_conditions) ? { reassessment_conditions: definition.reassessment_conditions } : {}),
      ...(Array.isArray(definition.evidence_ids) ? { evidence_ids: definition.evidence_ids } : {}),
      ...(definition.origin ? { origin: definition.origin } : {}),
      ...(definition.summary ? { summary: String(definition.summary) } : {}),
      ...(definition.concept ? { concept: String(definition.concept) } : {}),
      effects,
      }
    }),
    event_rules: parseOperatorEventDeclaration(operatorEventDeclaration, operatorEventEvidenceId),
  }
}
