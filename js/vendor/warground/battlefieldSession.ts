// @ts-nocheck
export const BATTLEFIELD_PHASES = Object.freeze([
  { key: 'idle', label: '전장 대기' },
  { key: 'room', label: '전장 세션 생성' },
  { key: 'ontology', label: '전장 지식 구성' },
  { key: 'graph', label: '전장 그래프 구축' },
  { key: 'agents', label: '전장 에이전트 편성' },
  { key: 'rehearsal', label: '결정론 리허설 준비' },
  { key: 'running', label: '가상전장 실행' },
])

export function getBattlefieldPhase(key) {
  return BATTLEFIELD_PHASES.find((phase) => phase.key === key) || BATTLEFIELD_PHASES[0]
}

export function getBattlefieldSurfaceMode(phase) {
  if (phase === 'rehearsal' || phase === 'running') return 'terrain'
  if (phase === 'agents') return 'agents'
  if (phase === 'graph' || phase === 'ontology' || phase === 'room') return 'graph'
  return 'setup'
}

export function buildBattlefieldAnalysisPayload(terrain) {
  const terrainName = String(terrain?.name || '선택 전장').trim()
  return {
    mission_mode: 'war_ground_rehearsal',
    audience: 'battle_staff',
    classification_level: terrain?.classificationLevel || 'secret',
    time_horizon: '72h',
    report_template: 'WarGroundDecisionCard',
    decision_question: `${terrainName}에서 임무를 수행할 때 예상되는 실패 경로와 지휘 결심 시점은 무엇인가?`,
    success_metrics: ['임무 달성', '전투력 보존', '지휘통제 유지'],
    constraints: Array.isArray(terrain?.constraints) ? terrain.constraints : [],
  }
}

function playbackStorageKey(simulationId) {
  return `war-ground:playback:${String(simulationId || '').trim()}`
}

export function saveBattlefieldPlayback(simulationId, state, storage = globalThis.localStorage) {
  if (!String(simulationId || '').trim() || !storage?.setItem) return
  try {
    storage.setItem(playbackStorageKey(simulationId), JSON.stringify({
      coaId: state?.coaId || '',
      minute: Number.isFinite(state?.minute) ? state.minute : 0,
      eventId: state?.eventId || '',
    }))
  } catch {
    // Browser storage can be unavailable or quota-limited; playback remains usable in memory.
  }
}

export function loadBattlefieldPlayback(simulationId, storage = globalThis.localStorage) {
  if (!String(simulationId || '').trim() || !storage?.getItem) return null
  try {
    const parsed = JSON.parse(storage.getItem(playbackStorageKey(simulationId)) || 'null')
    if (!parsed || typeof parsed !== 'object') return null
    return {
      coaId: typeof parsed.coaId === 'string' ? parsed.coaId : '',
      minute: Number.isFinite(parsed.minute) && parsed.minute >= 0 ? parsed.minute : 0,
      eventId: typeof parsed.eventId === 'string' ? parsed.eventId : '',
    }
  } catch {
    return null
  }
}
