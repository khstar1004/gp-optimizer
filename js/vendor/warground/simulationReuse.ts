// @ts-nocheck
const REUSABLE_SIMULATION_STATUSES = new Set([
  'preparing',
  'ready',
  'running',
  'paused',
  'stopped',
  'completed',
])

const normalizeSimulationStatus = (simulation) => String(simulation?.status || '').trim().toLowerCase()

export const getSimulationSortTimestamp = (simulation) => {
  const timestamp = Date.parse(simulation?.updated_at || simulation?.created_at || '')
  return Number.isFinite(timestamp) ? timestamp : 0
}

export const hasPreparedSimulationArtifacts = (simulation) => {
  const status = normalizeSimulationStatus(simulation)
  if (status === 'preparing') {
    return true
  }

  return Boolean(
    simulation?.config_generated
    || Number(simulation?.profiles_count || 0) > 0
    || Number(simulation?.entities_count || 0) > 0
  )
}

export const isReusableSimulation = (simulation, { projectId = null, graphId = null } = {}) => {
  if (!simulation?.simulation_id) return false
  if (projectId && simulation.project_id !== projectId) return false
  if (graphId && simulation.graph_id !== graphId) return false

  const status = normalizeSimulationStatus(simulation)
  if (!REUSABLE_SIMULATION_STATUSES.has(status)) return false

  return hasPreparedSimulationArtifacts(simulation)
}

export const pickReusableSimulation = (simulations, context = {}) => {
  if (!Array.isArray(simulations)) {
    return null
  }

  return simulations
    .filter((simulation) => isReusableSimulation(simulation, context))
    .sort((left, right) => getSimulationSortTimestamp(right) - getSimulationSortTimestamp(left))[0] || null
}

export { REUSABLE_SIMULATION_STATUSES }
