// @ts-nocheck
const CREATED_STATUSES = new Set(['', 'created', 'idle', 'pending', 'queued'])
const PREPARING_STATUSES = new Set(['preparing', 'processing'])
const READY_STATUSES = new Set(['ready'])
const RUNNING_STATUSES = new Set(['running', 'starting', 'paused', 'stopping'])
const COMPLETED_STATUSES = new Set(['completed', 'success', 'succeeded'])
const WARNING_STATUSES = new Set(['stopped', 'cancelled', 'canceled'])
const FAILED_STATUSES = new Set(['failed', 'error'])

export const SIMULATION_STATUS_META = {
  created: {
    label: '준비 전',
    tone: 'neutral',
    note: '프로필과 실행 조건을 아직 만들지 않았습니다.',
  },
  preparing: {
    label: '준비 중',
    tone: 'info',
    note: '프로필과 실행 조건을 준비하는 중입니다.',
  },
  ready: {
    label: '준비 완료',
    tone: 'ready',
    note: '프로필과 실행 조건이 준비되어 바로 실행할 수 있습니다.',
  },
  running: {
    label: '실행 중',
    tone: 'info',
    note: '시뮬레이션이 현재 실행 중입니다.',
  },
  completed: {
    label: '완료',
    tone: 'success',
    note: '시뮬레이션 실행이 정상적으로 끝났습니다.',
  },
  warning: {
    label: '경고 포함 완료',
    tone: 'warning',
    note: '실행은 끝났지만 확인이 필요한 경고가 남아 있습니다.',
  },
  failed: {
    label: '실패',
    tone: 'danger',
    note: '시뮬레이션 실행 또는 준비 작업이 실패했습니다.',
  },
  excluded: {
    label: '실행 제외',
    tone: 'neutral',
    note: '이번 실행에서는 이 채널을 사용하지 않았습니다.',
  },
}

const normalizeStatusValue = (value) => String(value || '').trim().toLowerCase()

const toCount = (value) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? Math.max(0, parsed) : 0
}

const getStatusMeta = (key) => SIMULATION_STATUS_META[key] || SIMULATION_STATUS_META.created

export const resolveSimulationLifecycleStatus = ({
  status = '',
  runnerStatus = '',
  alreadyPrepared = false,
  configGenerated = false,
  diagnosticMessage = '',
  error = '',
  totalActions = 0,
  totalRounds = 0,
} = {}) => {
  const normalizedStatus = normalizeStatusValue(status)
  const normalizedRunnerStatus = normalizeStatusValue(runnerStatus)
  const diagnostic = String(diagnosticMessage || '').trim()
  const errorMessage = String(error || '').trim()
  const actionCount = toCount(totalActions)
  const roundsCount = toCount(totalRounds)
  const hasRunTelemetry = Boolean(
    normalizedRunnerStatus
    || roundsCount > 0
    || actionCount > 0
  )

  let key = 'created'
  let note = getStatusMeta(key).note

  if (FAILED_STATUSES.has(normalizedRunnerStatus) || FAILED_STATUSES.has(normalizedStatus)) {
    key = 'failed'
    note = errorMessage || diagnostic || getStatusMeta(key).note
  } else if (RUNNING_STATUSES.has(normalizedRunnerStatus) || normalizedStatus === 'running') {
    key = 'running'
    note = diagnostic || getStatusMeta(key).note
  } else if (PREPARING_STATUSES.has(normalizedStatus)) {
    key = 'preparing'
    note = diagnostic || getStatusMeta(key).note
  } else if (
    COMPLETED_STATUSES.has(normalizedRunnerStatus)
    || WARNING_STATUSES.has(normalizedRunnerStatus)
    || COMPLETED_STATUSES.has(normalizedStatus)
    || WARNING_STATUSES.has(normalizedStatus)
  ) {
    const stoppedEarly =
      WARNING_STATUSES.has(normalizedRunnerStatus)
      || WARNING_STATUSES.has(normalizedStatus)
    const missingSignals = hasRunTelemetry && actionCount === 0
    const shouldWarn = stoppedEarly || Boolean(diagnostic) || missingSignals

    key = shouldWarn ? 'warning' : 'completed'

    if (stoppedEarly) {
      note = diagnostic || '사용자 중지 또는 조기 종료로 실행이 끝났습니다.'
    } else if (diagnostic) {
      note = diagnostic
    } else if (missingSignals) {
      note = '실행은 끝났지만 저장된 행동 신호가 없어 결과를 다시 확인해야 합니다.'
    } else {
      note = getStatusMeta(key).note
    }
  } else if (READY_STATUSES.has(normalizedStatus) || alreadyPrepared || configGenerated) {
    key = 'ready'
    note = diagnostic || getStatusMeta(key).note
  } else if (!CREATED_STATUSES.has(normalizedStatus)) {
    note = diagnostic || getStatusMeta(key).note
  }

  return {
    key,
    label: getStatusMeta(key).label,
    tone: getStatusMeta(key).tone,
    note,
    rawStatus: normalizedStatus,
    rawRunnerStatus: normalizedRunnerStatus,
    isTerminal: ['completed', 'warning', 'failed'].includes(key),
  }
}

export const resolvePlatformExecutionStatus = ({
  enabled = true,
  lifecycle = null,
  running = false,
  completed = false,
  currentRound = 0,
  totalRounds = 0,
  actionCount = 0,
  stalled = false,
} = {}) => {
  const lifecycleKey = lifecycle?.key || 'created'
  const rounds = toCount(currentRound)
  const total = toCount(totalRounds)
  const actions = toCount(actionCount)

  if (!enabled) {
    return {
      key: 'excluded',
      label: SIMULATION_STATUS_META.excluded.label,
      tone: SIMULATION_STATUS_META.excluded.tone,
      note: SIMULATION_STATUS_META.excluded.note,
    }
  }

  if (lifecycleKey === 'failed') {
    return {
      key: 'failed',
      label: SIMULATION_STATUS_META.failed.label,
      tone: SIMULATION_STATUS_META.failed.tone,
      note: lifecycle?.note || SIMULATION_STATUS_META.failed.note,
    }
  }

  if (completed) {
    const key = lifecycleKey === 'warning' ? 'warning' : 'completed'
    const roundSummary = total > 0 ? `${Math.max(rounds, total)}/${total}회차` : `${rounds}회차`
    const actionSummary = actions > 0 ? `행동 ${actions}건 기록` : '저장된 행동 없음'
    return {
      key,
      label: SIMULATION_STATUS_META[key].label,
      tone: SIMULATION_STATUS_META[key].tone,
      note: `${roundSummary} · ${actionSummary}`,
    }
  }

  if (running) {
    if (stalled && rounds > 0) {
      return {
        key: 'running',
        label: SIMULATION_STATUS_META.running.label,
        tone: 'warning',
        note: `${rounds}/${total || '-'}회차에서 응답을 기다리는 중입니다.`,
      }
    }

    if (actions > 0) {
      return {
        key: 'running',
        label: SIMULATION_STATUS_META.running.label,
        tone: SIMULATION_STATUS_META.running.tone,
        note: `${rounds || 0}/${total || '-'}회차 · 행동 ${actions}건`,
      }
    }

    return {
      key: 'running',
      label: SIMULATION_STATUS_META.running.label,
      tone: SIMULATION_STATUS_META.running.tone,
      note: rounds > 0
        ? `${rounds}/${total || '-'}회차를 진행 중입니다.`
        : '채널을 기동하는 중입니다.',
    }
  }

  if (lifecycleKey === 'ready') {
    return {
      key: 'ready',
      label: SIMULATION_STATUS_META.ready.label,
      tone: SIMULATION_STATUS_META.ready.tone,
      note: '실행 대기 상태입니다.',
    }
  }

  if (lifecycleKey === 'preparing') {
    return {
      key: 'preparing',
      label: SIMULATION_STATUS_META.preparing.label,
      tone: SIMULATION_STATUS_META.preparing.tone,
      note: '실행 조건을 준비하는 중입니다.',
    }
  }

  return {
    key: 'created',
    label: SIMULATION_STATUS_META.created.label,
    tone: SIMULATION_STATUS_META.created.tone,
    note: '실행을 아직 시작하지 않았습니다.',
  }
}
