// @ts-nocheck
const SNAPSHOT_FIELDS = Object.freeze([
  'units',
  'weapons',
  'groundMarkers',
  'referencePoints',
  'routes',
  'messages',
  'recentEvents',
  'selectedUnitId',
  'currentTime',
  'stats',
])

const INBOUND_EVENTS = new Set(['terrain3d:ready', 'terrain3d:analysis-state', 'terrain3d:select-unit'])

function plainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function cloneForPostMessage(value) {
  if (value === undefined) return null
  try {
    return JSON.parse(JSON.stringify(value))
  } catch {
    return null
  }
}

export function buildTerrainSnapshot(source = {}) {
  const snapshot = {}
  for (const field of SNAPSHOT_FIELDS) {
    const fallback = field.endsWith('s') ? [] : null
    snapshot[field] = cloneForPostMessage(source[field] ?? fallback) ?? fallback
  }
  return snapshot
}

export function isTerrainRuntimeMessage(message) {
  return plainObject(message) && INBOUND_EVENTS.has(message.type) && plainObject(message.payload)
}

export function buildTerrainRuntimeCommand(command, payload = {}) {
  return {
    type: 'terrain3d:command',
    payload: {
      command,
      ...cloneForPostMessage(payload),
    },
  }
}

export function buildFocusUnitCommand(unitId) {
  return buildTerrainRuntimeCommand('focus-unit', { unitId: String(unitId || '') })
}

export function buildFocusEventCommand(eventId) {
  return buildTerrainRuntimeCommand('focus-event', { eventId: String(eventId || '') })
}
