// @ts-nocheck
export const OPERATIONAL_SETUP_FIELDS = Object.freeze([
  { key: 'personnel.available', label: '가용 인원', unit: 'person', type: 'number', group: '인원' },
  { key: 'personnel.fatigue', label: '피로도', unit: '%', type: 'number', group: '인원' },
  { key: 'mobility.vehicle_available', label: '가용 차량', unit: 'vehicle', type: 'number', group: '기동' },
  { key: 'mobility.vehicle_status', label: '차량 상태', unit: 'state', type: 'text', group: '기동' },
  { key: 'sustainment.fuel', label: '연료', unit: '%', type: 'number', group: '군수' },
  { key: 'sustainment.ammunition', label: '탄약', unit: '%', type: 'number', group: '군수' },
  { key: 'sustainment.equipment_status', label: '장비 상태', unit: 'state', type: 'text', group: '군수' },
  { key: 'communications.radio_model', label: '무전기', unit: 'model', type: 'text', group: '통신' },
  { key: 'communications.power', label: '통신 출력', unit: 'W', type: 'number', group: '통신' },
  { key: 'communications.antenna', label: '안테나', unit: 'type', type: 'text', group: '통신' },
  { key: 'communications.relay', label: '중계 상태', unit: 'state', type: 'text', group: '통신' },
  { key: 'communications.terrain_screening', label: '지형 차폐', unit: 'state', type: 'text', group: '통신' },
])

const fieldByKey = new Map(OPERATIONAL_SETUP_FIELDS.map((field) => [field.key, field]))

export function createOperationalSetupForm() {
  return OPERATIONAL_SETUP_FIELDS.reduce((form, field) => {
    form[field.key] = {
      value: '',
      unit: field.unit,
      sourceLocator: '',
      asOf: '',
      confidence: '',
      estimated: false,
    }
    return form
  }, {})
}

export function hydrateOperationalSetupForm(declaration) {
  const form = createOperationalSetupForm()
  for (const field of OPERATIONAL_SETUP_FIELDS) {
    const [group, fieldName] = field.key.split('.')
    const source = declaration?.[group]?.[fieldName]
    if (!source || typeof source !== 'object') continue
    form[field.key] = {
      value: source.value ?? '',
      unit: source.unit ?? field.unit,
      sourceLocator: String(source.source_locator || ''),
      asOf: String(source.as_of || ''),
      confidence: source.confidence ?? '',
      estimated: Boolean(source.estimated),
    }
  }
  return form
}

function splitPath(key) {
  const [group, field] = String(key).split('.')
  return { group, field }
}

function normalizedValue(value, field) {
  if (field.type === 'number' && String(value).trim() !== '') return Number(value)
  return String(value || '').trim()
}

export function serializeOperationalSetup(form) {
  const declaration = {}
  for (const [key, entry] of Object.entries(form || {})) {
    const field = fieldByKey.get(key)
    if (!field || String(entry?.value ?? '').trim() === '') continue
    const sourceLocator = String(entry?.sourceLocator || '').trim()
    const { group, field: fieldName } = splitPath(key)
    declaration[group] ??= {}
    declaration[group][fieldName] = {
      value: normalizedValue(entry.value, field),
      ...(entry.unit ? { unit: String(entry.unit).trim() } : {}),
      ...(entry.asOf ? { as_of: String(entry.asOf).trim() } : {}),
      ...(String(entry.confidence ?? '').trim() !== ''
        ? { confidence: Number(entry.confidence) }
        : {}),
      estimated: Boolean(entry.estimated),
      source_locator: sourceLocator,
    }
  }
  return Object.keys(declaration).length ? JSON.stringify(declaration) : ''
}

export function validateGuidedSetup({ form, events, useAdvancedDeclarations = false } = {}) {
  if (useAdvancedDeclarations) return ''
  for (const [key, entry] of Object.entries(form || {})) {
    if (String(entry?.value ?? '').trim() === '') continue
    const field = fieldByKey.get(key)
    if (!String(entry?.sourceLocator || '').trim()) return `${field?.label || key}의 출처 위치를 입력하세요.`
    if (!String(entry?.unit || '').trim()) return `${field?.label || key}의 단위를 입력하세요.`
    if (!String(entry?.asOf || '').trim()) return `${field?.label || key}의 기준시각을 입력하세요.`
    const confidence = Number(entry?.confidence)
    if (!Number.isFinite(confidence) || confidence < 0 || confidence > 1) {
      return `${field?.label || key}의 신뢰도는 0에서 1 사이여야 합니다.`
    }
  }
  for (const row of events || []) {
    if (!String(row?.eventId || '').trim()) continue
    if (!String(row?.sourceLocator || '').trim()) return `사건 ${row.eventId}의 출처 위치를 입력하세요.`
    if (!String(row?.effectPath || '').trim() || !String(row?.effectSet || '').trim()) {
      return `사건 ${row.eventId}의 변경 항목과 변경 값을 입력하세요.`
    }
  }
  return ''
}

function defaultCoaName(item, index) {
  if (item && typeof item === 'object') return String(item.name || `방책 ${index + 1}`)
  const raw = String(item || '').trim()
  return raw.includes(':') ? raw.slice(raw.indexOf(':') + 1).trim() : raw || `방책 ${index + 1}`
}

export function createCoaSetupRows(coaDefaults = []) {
  return Array.from({ length: 3 }, (_, index) => {
    const item = coaDefaults[index]
    const objectItem = item && typeof item === 'object' ? item : {}
    return {
      rowId: `coa-row-${index + 1}`,
      coaId: String(objectItem.coa_id || `coa-${String.fromCharCode(97 + index)}`),
      name: defaultCoaName(item, index),
      priority: Number.isFinite(objectItem.priority) ? objectItem.priority : index + 1,
      decisionReason: String(objectItem.decision_reason || ''),
    }
  })
}

export function serializeCoaSetup(rows) {
  const coas = (rows || [])
    .filter((row) => String(row?.name || '').trim())
    .map((row, index) => ({
      coa_id: String(row.coaId || `coa-${String.fromCharCode(97 + index)}`).trim(),
      name: String(row.name).trim(),
      priority: Number(row.priority) || index + 1,
      ...(String(row.decisionReason || '').trim() ? { decision_reason: String(row.decisionReason).trim() } : {}),
    }))
  return coas.length ? JSON.stringify(coas) : ''
}

export function createEventSetupRow(rowId = `event-row-${Date.now()}`) {
  return {
    rowId,
    eventId: '',
    atMinute: 15,
    affectedCoaIds: 'coa-a',
    sourceLocator: '',
    effectPath: 'communications.relay',
    effectSet: 'unavailable',
    failurePathId: '',
    impact: 'high',
  }
}

export function hydrateEventSetupRows(events) {
  if (!Array.isArray(events) || !events.length) return [createEventSetupRow('event-row-1')]
  return events.map((event, index) => {
    const effect = Array.isArray(event?.effects) ? event.effects[0] || {} : {}
    const failurePath = event?.failure_path && typeof event.failure_path === 'object' ? event.failure_path : {}
    const row = createEventSetupRow(`event-row-${index + 1}`)
    row.eventId = String(event?.event_id || '')
    row.atMinute = Number.isFinite(Number(event?.at_minute)) ? Number(event.at_minute) : row.atMinute
    row.affectedCoaIds = Array.isArray(event?.affected_coa_ids)
      ? event.affected_coa_ids.join(', ')
      : String(event?.affected_coa_ids || row.affectedCoaIds)
    row.sourceLocator = String(event?.source_locator || '')
    row.effectPath = String(effect.path || row.effectPath)
    row.effectSet = String(effect.set ?? row.effectSet)
    row.failurePathId = String(failurePath.failure_path_id || '')
    row.impact = String(failurePath.impact || row.impact)
    return row
  })
}

export function serializeEventSetup(rows) {
  const events = (rows || [])
    .filter((row) => String(row?.eventId || '').trim())
    .map((row) => ({
      event_id: String(row.eventId).trim(),
      at_minute: Number(row.atMinute) || 0,
      affected_coa_ids: String(row.affectedCoaIds || '')
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean),
      source_locator: String(row.sourceLocator || '').trim(),
      effects: [{ path: String(row.effectPath || '').trim(), set: String(row.effectSet || '').trim() }],
      ...(String(row.failurePathId || '').trim()
        ? { failure_path: { failure_path_id: String(row.failurePathId).trim(), impact: String(row.impact || '').trim() } }
        : {}),
    }))
  return events.length ? JSON.stringify(events) : ''
}
