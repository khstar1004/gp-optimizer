// @ts-nocheck
export function resolveBattlefieldGraphRecovery(project = {}) {
  const graphId = String(project?.graph_id || project?.display_graph_id || '').trim()
  if (graphId) {
    return { action: 'complete', graphId }
  }

  const status = String(project?.status || '').trim().toLowerCase()
  if (status === 'ontology_generated') {
    return { action: 'restart' }
  }

  if (status === 'failed') {
    return {
      action: 'failed',
      error: project?.error || '전장 그래프 구축에 실패했습니다.',
    }
  }

  return { action: 'wait' }
}
