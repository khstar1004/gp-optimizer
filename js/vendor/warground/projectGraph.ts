// @ts-nocheck
const pickGraphId = (...values) => {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) {
      return value.trim()
    }
  }
  return ''
}

export function getProjectWorkflowGraphId(project = null) {
  const metrics = project?.graph_build_metrics || project?.graphBuildMetrics || {}

  return pickGraphId(
    project?.display_graph_id,
    project?.displayGraphId,
    project?.room_version_graph_id,
    project?.roomVersionGraphId,
    project?.graph_id,
    project?.graphId,
    metrics?.source_graph_id,
    metrics?.sourceGraphId,
    metrics?.original_graph_id,
    metrics?.originalGraphId,
  )
}
