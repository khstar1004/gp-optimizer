// @ts-nocheck
export const WORKFLOW_AUTOMATION_QUERY_KEY = 'autoRun'
export const WORKFLOW_AUTOMATION_QUERY_VALUE = '1'
export const WORKFLOW_AUTOMATION_STORAGE_KEY = 'warground.workflow-automation.v1'

export const WORKFLOW_AUTOMATION_STAGES = {
  ONTOLOGY: 'ontology',
  AGENT_SETUP: 'agent_setup',
  SIMULATION: 'simulation',
  REPORT: 'report',
}

const STAGE_LABELS = {
  [WORKFLOW_AUTOMATION_STAGES.ONTOLOGY]: '작전 그래프',
  [WORKFLOW_AUTOMATION_STAGES.AGENT_SETUP]: 'AI 참모 편성',
  [WORKFLOW_AUTOMATION_STAGES.SIMULATION]: '수행 리허설',
  [WORKFLOW_AUTOMATION_STAGES.REPORT]: '실패경로/결심카드',
}

const getBrowserStorage = () => {
  try {
    return globalThis?.sessionStorage || null
  } catch {
    return null
  }
}

const safeJsonParse = (value) => {
  if (!value) return null
  try {
    const parsed = JSON.parse(value)
    return parsed && typeof parsed === 'object' ? parsed : null
  } catch {
    return null
  }
}

const createSessionId = (timestamp) => (
  `workflow-${timestamp}-${Math.random().toString(36).slice(2, 10)}`
)

export function hasWorkflowAutomationQuery(routeOrQuery = {}) {
  const query = routeOrQuery?.query || routeOrQuery || {}
  const value = query[WORKFLOW_AUTOMATION_QUERY_KEY]
  return value === WORKFLOW_AUTOMATION_QUERY_VALUE || value === true || value === 'true'
}

export function withWorkflowAutomationQuery(query = {}) {
  return {
    ...query,
    [WORKFLOW_AUTOMATION_QUERY_KEY]: WORKFLOW_AUTOMATION_QUERY_VALUE,
  }
}

export function formatWorkflowElapsed(milliseconds) {
  const totalSeconds = Math.max(0, Math.round(Number(milliseconds || 0) / 1000))
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  return `${hours}시간 ${minutes}분 ${seconds}초`
}

export function createWorkflowAutomationStore(storage = getBrowserStorage(), now = () => Date.now()) {
  const read = () => {
    if (!storage) return null
    return safeJsonParse(storage.getItem(WORKFLOW_AUTOMATION_STORAGE_KEY))
  }

  const write = (state) => {
    if (!storage) return state
    storage.setItem(WORKFLOW_AUTOMATION_STORAGE_KEY, JSON.stringify(state))
    return state
  }

  const update = (patch = {}) => {
    const current = read() || {}
    return write({
      ...current,
      ...patch,
      updatedAt: now(),
    })
  }

  const begin = (payload = {}) => {
    const timestamp = Number(payload.startedAt || now())
    const current = read()
    const currentIsRunning = current?.status === 'running'
    return write({
      id: currentIsRunning && current.id ? current.id : createSessionId(timestamp),
      startedAt: currentIsRunning && current.startedAt ? current.startedAt : timestamp,
      status: 'running',
      notifiedStages: currentIsRunning && Array.isArray(current?.notifiedStages) ? current.notifiedStages : [],
      ...payload,
      updatedAt: now(),
    })
  }

  const complete = (payload = {}) => {
    const completedAt = Number(payload.completedAt || now())
    const current = read() || {}
    const startedAt = Number(current.startedAt || completedAt)
    return write({
      ...current,
      ...payload,
      status: 'completed',
      completedAt,
      elapsedMs: Math.max(0, completedAt - startedAt),
      updatedAt: now(),
    })
  }

  const markStageNotified = (stageKey) => {
    const current = read()
    if (!current?.status) return true

    const notifiedStages = new Set(Array.isArray(current.notifiedStages) ? current.notifiedStages : [])
    if (notifiedStages.has(stageKey)) {
      return false
    }

    notifiedStages.add(stageKey)
    update({ notifiedStages: [...notifiedStages] })
    return true
  }

  const clear = () => {
    if (storage) {
      storage.removeItem(WORKFLOW_AUTOMATION_STORAGE_KEY)
    }
  }

  return {
    get: read,
    begin,
    update,
    complete,
    markStageNotified,
    clear,
  }
}

export const workflowAutomation = createWorkflowAutomationStore()

export function ensureWorkflowAutomationSession(payload = {}) {
  const current = workflowAutomation.get()
  if (current?.status === 'running') {
    return workflowAutomation.update(payload)
  }
  return workflowAutomation.begin(payload)
}

export async function requestWorkflowNotificationPermission() {
  if (typeof Notification === 'undefined') {
    return 'unsupported'
  }

  if (Notification.permission !== 'default') {
    return Notification.permission
  }

  try {
    return await Notification.requestPermission()
  } catch {
    return Notification.permission
  }
}

function playWorkflowChime() {
  if (typeof window === 'undefined') return

  const AudioContextCtor = window.AudioContext || window.webkitAudioContext
  if (!AudioContextCtor) return

  try {
    const context = new AudioContextCtor()
    const oscillator = context.createOscillator()
    const gain = context.createGain()

    oscillator.type = 'sine'
    oscillator.frequency.setValueAtTime(880, context.currentTime)
    oscillator.frequency.setValueAtTime(1174, context.currentTime + 0.08)
    gain.gain.setValueAtTime(0.0001, context.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.08, context.currentTime + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.24)

    oscillator.connect(gain)
    gain.connect(context.destination)
    oscillator.start()
    oscillator.stop(context.currentTime + 0.26)
    oscillator.addEventListener('ended', () => {
      context.close?.()
    })
  } catch {
    // Audio playback can be blocked by the browser; notification still proceeds.
  }
}

export function notifyWorkflow({ title, body = '', tag = 'warground-workflow' } = {}) {
  if (!title) return false

  playWorkflowChime()

  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') {
    return false
  }

  try {
    new Notification(title, {
      body,
      tag,
      renotify: true,
      silent: false,
    })
    return true
  } catch {
    return false
  }
}

export function notifyWorkflowStageComplete(stageKey, { body = '자동으로 다음 단계로 이동합니다.' } = {}) {
  if (!workflowAutomation.markStageNotified(stageKey)) {
    return false
  }

  const label = STAGE_LABELS[stageKey] || '단계'
  return notifyWorkflow({
    title: `${label} 완료`,
    body,
    tag: `warground-workflow-${stageKey}`,
  })
}

export function notifyWorkflowCompleted({ completedAt = Date.now() } = {}) {
  if (!workflowAutomation.markStageNotified(WORKFLOW_AUTOMATION_STAGES.REPORT)) {
    const current = workflowAutomation.get()
    return {
      state: current,
      elapsedText: formatWorkflowElapsed(current?.elapsedMs || 0),
      notified: false,
    }
  }

  const state = workflowAutomation.complete({ completedAt })
  const elapsedText = formatWorkflowElapsed(state.elapsedMs)
  const notified = notifyWorkflow({
    title: '자동 분석 완료',
    body: `결심카드 작성이 완료되었습니다. 총 소요 시간: ${elapsedText}`,
    tag: 'warground-workflow-complete',
  })

  return { state, elapsedText, notified }
}
