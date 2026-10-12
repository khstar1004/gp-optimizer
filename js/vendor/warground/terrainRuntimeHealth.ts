// @ts-nocheck
const RUNTIME_STATES = Object.freeze({
  loading: { tone: 'pending', label: '지형 렌더러 연결 중' },
  ready: { tone: 'pending', label: '지형 렌더러 준비됨' },
  synced: { tone: 'positive', label: '상태 동기화됨' },
  performance: { tone: 'positive', label: '렌더 성능 측정됨' },
  degraded: { tone: 'caution', label: '일부 지형 레이어 미사용' },
  error: { tone: 'negative', label: '지형 렌더러 사용 불가' },
})

function engineState(physicsStatus = {}) {
  const chronoConfigured = Boolean(physicsStatus?.chrono?.configured)
  const ns3Configured = Boolean(physicsStatus?.ns3?.configured)
  const chrono = Boolean(physicsStatus?.chrono?.ready)
  const ns3 = Boolean(physicsStatus?.ns3?.ready)
  if (chrono && ns3) return { tone: 'positive', label: '물리·통신 엔진 준비됨' }
  if (chrono || ns3) {
    const missing = chrono ? 'ns-3' : 'Chrono'
    return { tone: 'caution', label: `${missing} 엔진 미연결` }
  }
  if (chronoConfigured || ns3Configured) return { tone: 'caution', label: '정밀 엔진 응답 대기' }
  return { tone: 'pending', label: '정밀 엔진 미설정' }
}

export function resolveTerrainRuntimeHealth({ runtimeState, viewMode, physicsStatus, physicsFrame, planningArtifact } = {}) {
  const renderer = RUNTIME_STATES[runtimeState] || RUNTIME_STATES.loading
  const hasConfirmedFrame = Boolean(physicsFrame?.frame_hash || physicsFrame?.frame_id)
  const evidenceBlocked = planningArtifact?.readiness?.ready === false

  return {
    renderer,
    display: {
      tone: viewMode === '3d' || viewMode === 'filament' ? 'positive' : 'neutral',
      label: viewMode === 'filament' ? '실감 물리 재생' : viewMode === '3d' ? '3D 지형 보기' : '2D 전술 지도',
    },
    authority: hasConfirmedFrame
      ? { tone: 'positive', label: `확정 프레임 ${String(physicsFrame.frame_id || '').slice(0, 18) || '사용 가능'}` }
      : { tone: 'caution', label: '확정 물리 프레임 없음 · 대화 이동은 물리 결과가 아님' },
    engine: engineState(physicsStatus),
    evidence: evidenceBlocked
      ? { tone: 'caution', label: '근거 부족으로 결심 보류' }
      : planningArtifact
        ? { tone: 'positive', label: '계획 근거 확인됨' }
        : { tone: 'pending', label: '계획 근거 확인 전' },
  }
}
