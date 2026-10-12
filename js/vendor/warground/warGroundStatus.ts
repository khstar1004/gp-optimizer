// @ts-nocheck
const normalizeStatus = (value) => String(value || '').trim().toLowerCase()

export function resolveWarGroundStatus({
  error = '',
  decisionCard = null,
  rehearsal = null,
  live = null,
  simulation = null,
  graph = null,
} = {}) {
  if (String(error || '').trim()) return { key: 'attention', label: '확인 필요' }

  const decisionStatus = normalizeStatus(decisionCard?.decision_status || rehearsal?.decision_status)
  if (decisionStatus === 'hold') return { key: 'hold', label: '결심 보류' }
  if (decisionCard) return { key: 'review', label: '결심카드 검토 필요' }
  if (rehearsal) return { key: 'rehearsal', label: '리허설 완료' }
  if (live?.status === 'completed') return { key: 'live-complete', label: '실시간 리허설 완료' }
  if (live?.status === 'running') return { key: 'live-running', label: '실시간 리허설 실행 중' }

  const simulationStatus = normalizeStatus(simulation?.status)
  if (simulationStatus === 'failed' || simulationStatus === 'error') return { key: 'failed', label: '구성 실패' }
  if (simulation) return { key: 'ready', label: '리허설 준비' }
  if (graph) return { key: 'graph', label: '그래프 구축 완료' }
  return { key: 'idle', label: '초기화' }
}
