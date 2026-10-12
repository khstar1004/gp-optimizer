// @ts-nocheck
const PRESENTATION_FIELDS = [
  'sourceProfileId', 'label', 'name', 'profileName', 'callSign', 'group', 'role', 'faction',
  'sideName', 'sideColor', 'entityType', 'groundUnit', 'modelId', 'layer', 'posture',
  'temperament', 'persona', 'personaSummary', 'character', 'color', 'unitId', 'parentUnitId',
  'parentAgentId', 'organizationPath', 'commanderAgentId', 'isCommander', 'isManeuver',
  'mission', 'riskTolerance', 'sopConstraints', 'weapons', 'vehicles', 'logisticsAssets',
  'communicationAssets', 'reconnaissanceAssets', 'supportAssets',
  'profileGenerator', 'profileEvidenceIds', 'traits', 'warGroundProfile', 'combatStats',
  'routeGeometryAuthority', 'routeGeometryIssue',
]

function finiteCoordinate(value) {
  const number = Number(value)
  return Number.isFinite(number) ? number : null
}

function usableBounds(bounds) {
  if (!bounds || typeof bounds !== 'object') return false
  return ['west', 'south', 'east', 'north'].every((key) => finiteCoordinate(bounds[key]) !== null)
}

function insideBounds(point, bounds) {
  if (!usableBounds(bounds)) return true
  const longitude = finiteCoordinate(point?.longitude)
  const latitude = finiteCoordinate(point?.latitude)
  if (longitude === null || latitude === null) return false
  return longitude >= Number(bounds.west)
    && longitude <= Number(bounds.east)
    && latitude >= Number(bounds.south)
    && latitude <= Number(bounds.north)
}

export function mergeLiveSnapshotAgents(currentAgents = [], snapshotAgents = []) {
  const currentById = new Map(currentAgents.map((agent) => [agent.id, agent]))

  return snapshotAgents.map((savedAgent) => {
    const currentAgent = currentById.get(savedAgent.id)
    if (!currentAgent) return savedAgent

    const mergedAgent = { ...currentAgent, ...savedAgent, id: savedAgent.id }
    for (const field of PRESENTATION_FIELDS) {
      mergedAgent[field] = currentAgent[field] ?? savedAgent[field]
    }

    return mergedAgent
  })
}

export function validateLiveSceneGeometry(scene = {}, bounds = scene?.bounds) {
  if (!usableBounds(bounds)) return { valid: true, invalidAgents: [] }
  const invalidAgents = []
  for (const agent of Array.isArray(scene?.agents) ? scene.agents : []) {
    const route = Array.isArray(agent?.routeCoordinates) ? agent.routeCoordinates : []
    const geometryAuthority = String(agent?.routeGeometryAuthority || '').trim().toLowerCase()
    const hasInvalidRoute = route.length === 0 || route.some((point) => !insideBounds(point, bounds))
    const hasInvalidPosition = !insideBounds(agent, bounds)
    if (hasInvalidRoute || hasInvalidPosition || geometryAuthority !== 'declared_wgs84') {
      invalidAgents.push({
        id: String(agent?.id || ''),
        label: String(agent?.label || agent?.name || agent?.id || '알 수 없는 에이전트'),
        reason: hasInvalidRoute
          ? 'route_out_of_bounds'
          : hasInvalidPosition
            ? 'position_out_of_bounds'
            : 'route_geometry_not_declared_wgs84',
      })
    }
  }
  return { valid: invalidAgents.length === 0, invalidAgents }
}

export function buildLiveSnapshotRoutes(agents = [], currentRoutes = [], bounds = null) {
  const currentById = new Map((Array.isArray(currentRoutes) ? currentRoutes : []).map((route) => [String(route?.id || ''), route]))
  const routes = agents
    .map((agent) => {
      const points = agent?.routeCoordinates || []
      if (points.length > 1 && points.every((point) => insideBounds(point, bounds))) {
        return {
          id: agent.id,
          label: `${agent.group || '현장'} ${agent.posture || ''}`.trim(),
          coordinates: points.map((point) => [point.longitude, point.latitude]),
          color: agent.color || agent.sideColor || '#2563eb',
          active: Boolean(agent.isManeuver || agent.is_maneuver || Number(agent.progress || 0) > 0),
        }
      }
      return currentById.get(String(agent?.id || '')) || null
    })
    .filter(Boolean)
  return routes
}
