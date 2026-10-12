// @ts-nocheck
function finiteNumber(value) {
  const number = Number(value)
  return Number.isFinite(number) ? number : null
}

function routePoint(point) {
  if (!point || typeof point !== 'object') return null
  const longitude = finiteNumber(point.longitude)
  const latitude = finiteNumber(point.latitude)
  const altitude = finiteNumber(point.altitude_m ?? point.altitude) ?? 0
  if (longitude === null || latitude === null) return null
  return { longitude, latitude, altitude_m: altitude }
}

function routeCoordinates(agent) {
  const raw = agent?.routeCoordinates || agent?.route_coordinates || []
  return Array.isArray(raw) ? raw.map(routePoint).filter(Boolean) : []
}

function declaredSpeedMps(agent) {
  const direct = finiteNumber(agent?.physics?.speed_mps ?? agent?.mobility?.speed_mps ?? agent?.speed_mps)
  if (direct !== null && direct >= 0) return { value: direct, estimated: false }
  const kph = finiteNumber(agent?.combatStats?.move_speed_kph)
  if (kph !== null && kph >= 0) return { value: kph / 3.6, estimated: true }
  return { value: null, estimated: false }
}

function simulationMinuteOf(frame) {
  const seconds = finiteNumber(frame?.simulation_time_s)
  if (seconds !== null) return seconds / 60
  return finiteNumber(frame?.simulation_minute) ?? 0
}

export function buildSpatialUnitPayload(agents = [], { simulationId = '', allowEstimated = true } = {}) {
  if (!Array.isArray(agents)) return []
  return agents.map((agent) => {
    const route = routeCoordinates(agent)
    const position = routePoint({
      longitude: agent?.longitude ?? route[0]?.longitude,
      latitude: agent?.latitude ?? route[0]?.latitude,
      altitude_m: agent?.altitude_m ?? route[0]?.altitude_m ?? 0,
    })
    const speed = declaredSpeedMps(agent)
    const estimated = Boolean(speed.estimated || agent?.synthetic)
    const payload = {
      id: String(agent?.id || '').trim(),
      label: agent?.label || agent?.name || agent?.id || '전장 부대',
      role: agent?.role || '',
      group: agent?.group || '',
      faction: agent?.faction || 'blue',
      model_id: agent?.modelId || agent?.model_id || '',
      parent_agent_id: agent?.parentAgentId || agent?.parent_agent_id || '',
      route_geometry_authority: agent?.routeGeometryAuthority || agent?.route_geometry_authority || '',
      profile_generator: agent?.profileGenerator || agent?.profile_generator || '',
      position,
      route,
      evidence_ids: Array.isArray(agent?.evidence_ids)
        ? agent.evidence_ids
        : Array.isArray(agent?.profileEvidenceIds)
          ? agent.profileEvidenceIds
          : [],
      source_locator: {
        kind: 'roster-profile-runtime-declaration',
        simulation_id: simulationId,
        profile_id: agent?.sourceProfileId || agent?.id || '',
      },
      estimated,
    }
    if (speed.value !== null && (!estimated || allowEstimated)) payload.speed_mps = speed.value
    return payload
  }).filter((unit) => unit.id && unit.position)
}

export function buildSpatialRouteUpdates(agents = [], options = {}) {
  return Object.fromEntries(
    buildSpatialUnitPayload(agents, options)
      .filter((unit) => unit.route.length > 1)
      .map((unit) => [unit.id, {
        route: unit.route,
        speed_mps: unit.speed_mps,
        evidence_ids: unit.evidence_ids,
        source_locator: unit.source_locator,
        estimated: unit.estimated,
      }]),
  )
}

export function spatialFrameOf(session) {
  if (!session || typeof session !== 'object') return null
  const frames = Array.isArray(session.frames) ? session.frames : []
  return session.current_frame || frames.at(-1) || null
}

export function mergeSpatialFrameIntoScene(scene, frame) {
  if (!scene || !frame || !Array.isArray(frame.units)) return scene
  const byId = new Map()
  for (const unit of frame.units) {
    const id = String(unit?.id || unit?.unit_id || '').trim()
    if (id && !byId.has(id)) byId.set(id, unit)
  }
  const agents = (scene.agents || []).map((agent) => {
    const unit = byId.get(String(agent.id))
    if (!unit) return { ...agent, physicsState: { status: 'unresolved', modelFidelity: frame.model_fidelity || null } }
    const position = unit.position_wgs84 || {}
    const total = finiteNumber(unit.route_total_m) ?? 0
    const progressValue = finiteNumber(unit.route_progress_m) ?? 0
    const fallbackProgress = finiteNumber(agent.progress) ?? 0
    const progress = total > 0 ? Math.max(0, Math.min(1, progressValue / total)) : Math.max(0, Math.min(1, fallbackProgress))
    return {
      ...agent,
      longitude: position.longitude ?? agent.longitude,
      latitude: position.latitude ?? agent.latitude,
      altitude_m: position.altitude_m ?? agent.altitude_m ?? 0,
      headingDegrees: unit.heading_deg ?? agent.headingDegrees ?? 0,
      progress,
      status: unit.status || agent.status,
      physicsState: unit,
    }
  })
  const simulationMinute = simulationMinuteOf(frame)
  return {
    ...scene,
    agents,
    units: agents,
    tick: Number(frame.tick || 0),
    currentTime: `T+${simulationMinute.toFixed(1)}분`,
    physicsFrameId: frame.frame_id || null,
    physicsFrameHash: frame.frame_hash || null,
    physicsModelFidelity: frame.model_fidelity || null,
    physicsWarnings: Array.isArray(frame.warnings) ? frame.warnings : [],
  }
}

export function spatialStats(session) {
  const frame = spatialFrameOf(session)
  if (!frame) return null
  return {
    frameId: frame.frame_id || null,
    frameHash: frame.frame_hash || null,
    modelFidelity: frame.model_fidelity || null,
    unitCount: Array.isArray(frame.units) ? frame.units.length : 0,
    eventCount: Array.isArray(frame.events) ? frame.events.length : 0,
    warningCount: Array.isArray(frame.warnings) ? frame.warnings.length : 0,
    simulationMinute: simulationMinuteOf(frame),
  }
}
