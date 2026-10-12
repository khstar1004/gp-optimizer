// @ts-nocheck
export const APP_SETTINGS_STORAGE_KEY = 'warground.llm-settings'
export const APP_SETTINGS_UPDATED_EVENT = 'warground:app-settings-updated'
export const GRAPH_BACKEND_OPTIONS = Object.freeze([
  {
    value: 'neo4j',
    eyebrow: 'LOCAL DB',
    label: '로컬 DB',
    description: 'Neo4j 미러와 Cognee 멀티모달 파이프라인을 함께 사용하는 기본 실행 모드입니다.',
  },
  {
    value: 'zep',
    eyebrow: 'ZEP',
    label: 'ZEP',
    description: 'ZEP를 우선 사용하고 Cognee는 끄며, 실패 시 로컬 DB 경로로 자동 fallback합니다.',
  },
])
const OPENROUTER_DEFAULT_MODEL = 'gemma4:e4b'
const KNOWN_INVALID_OPENROUTER_MODELS = new Set([
  'qwen/qwen3.5-72b-instruct'
])
const LEGACY_LOCAL_OLLAMA_MODELS = new Set([
  'qwen3.5:9b'
])
const VALID_GRAPH_BACKENDS = new Set(['auto', 'local', 'neo4j', 'zep'])

export const APP_SETTINGS_PRESETS = Object.freeze({
  A: {
    plan: 'A',
    provider: 'ollama',
    baseUrl: 'http://127.0.0.1:11434/v1',
    model: 'gemma4:e4b',
    graphFallback: 'neo4j',
    label: 'A',
    description: '로컬 Ollama'
  },
  B: {
    plan: 'B',
    provider: 'ollama',
    baseUrl: 'http://127.0.0.1:11434/v1',
    model: 'gemma4:e4b',
    graphFallback: 'zep',
    label: 'B',
    description: 'Zep + 로컬 Ollama'
  },
  C: {
    plan: 'C',
    provider: 'ollama',
    baseUrl: 'http://127.0.0.1:11434/v1',
    model: OPENROUTER_DEFAULT_MODEL,
    graphFallback: 'neo4j',
    label: 'C',
    description: '로컬 Ollama 직접 지정'
  },
  D: {
    plan: 'D',
    provider: 'ollama',
    baseUrl: 'http://127.0.0.1:11434/v1',
    model: OPENROUTER_DEFAULT_MODEL,
    graphFallback: 'zep',
    label: 'D',
    description: 'Zep 그래프 맥락 + 로컬 Ollama 직접 지정'
  }
})

function isLegacyOpenRouterDefaultModel(value) {
  return value.includes('/') && value.includes(':free')
}

const OPENROUTER_PLAN_KEYS = new Set(['C', 'D'])
const OPENROUTER_BASE_URL_DEFAULTS = Object.freeze(
  Array.from(OPENROUTER_PLAN_KEYS, (plan) => APP_SETTINGS_PRESETS[plan].baseUrl)
)
const OPENROUTER_MODEL_DEFAULTS = Object.freeze(
  Array.from(OPENROUTER_PLAN_KEYS, (plan) => APP_SETTINGS_PRESETS[plan].model)
)

export const DEFAULT_APP_SETTINGS = Object.freeze({
  ...APP_SETTINGS_PRESETS.C,
  graphBackend: APP_SETTINGS_PRESETS.C.graphFallback,
  audioEnabled: true,
  apiKey: '',
  customBaseUrl: APP_SETTINGS_PRESETS.C.baseUrl,
  customModel: APP_SETTINGS_PRESETS.C.model,
  customApiKey: '',
  isUserConfigured: false,
})

function normalizeText(value, fallback = '') {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback
}

function normalizeOptionalText(value) {
  return typeof value === 'string' ? value.trim() : ''
}

function normalizeBoolean(value, fallback = false) {
  return typeof value === 'boolean' ? value : fallback
}

function normalizeGraphBackend(value, fallback = 'neo4j') {
  const normalized = normalizeText(value, fallback).toLowerCase()
  return VALID_GRAPH_BACKENDS.has(normalized) ? normalized : fallback
}

function resolveKnowledgeEngine(graphBackend) {
  return normalizeGraphBackend(graphBackend, 'neo4j') === 'zep' ? 'native' : 'cognee'
}

function isOpenRouterPlan(plan) {
  return OPENROUTER_PLAN_KEYS.has(plan)
}

function resolveOpenRouterEditableValue(value, defaults, fallback) {
  const normalized = normalizeText(value, '')
  if (!normalized || defaults.includes(normalized)) {
    return fallback
  }
  return normalized
}

function normalizeOpenRouterModel(value, fallback) {
  const normalized = normalizeText(value, fallback)
  if (KNOWN_INVALID_OPENROUTER_MODELS.has(normalized)) {
    return OPENROUTER_DEFAULT_MODEL
  }
  if (LEGACY_LOCAL_OLLAMA_MODELS.has(normalized.toLowerCase())) {
    return OPENROUTER_DEFAULT_MODEL
  }
  if (isLegacyOpenRouterDefaultModel(normalized)) {
    return OPENROUTER_DEFAULT_MODEL
  }
  return normalized
}

export function normalizeAppSettings(settings = {}) {
  const plan = normalizeText(settings.plan, DEFAULT_APP_SETTINGS.plan).toUpperCase()
  const activePlan = plan in APP_SETTINGS_PRESETS ? plan : DEFAULT_APP_SETTINGS.plan
  const preset = APP_SETTINGS_PRESETS[activePlan] || DEFAULT_APP_SETTINGS
  const usesOpenRouter = isOpenRouterPlan(activePlan)
  const graphBackend = normalizeGraphBackend(
    settings.graphBackend ?? settings.graphFallback,
    preset.graphFallback
  )
  const customBaseUrl = normalizeText(
    settings.customBaseUrl ?? (usesOpenRouter ? settings.baseUrl : ''),
    preset.baseUrl
  )
  const customModel = normalizeOpenRouterModel(
    settings.customModel ?? (usesOpenRouter ? settings.model : ''),
    preset.model
  )
  const customApiKey = normalizeOptionalText(
    settings.customApiKey ?? (usesOpenRouter ? settings.apiKey : '')
  )

  return {
    plan: activePlan,
    provider: preset.provider,
    baseUrl: usesOpenRouter ? customBaseUrl : preset.baseUrl,
    model: usesOpenRouter ? customModel : preset.model,
    apiKey: usesOpenRouter ? customApiKey : '',
    graphBackend,
    graphFallback: graphBackend,
    audioEnabled: normalizeBoolean(settings.audioEnabled, DEFAULT_APP_SETTINGS.audioEnabled),
    customBaseUrl,
    customModel,
    customApiKey,
    isUserConfigured: settings.isUserConfigured === true,
  }
}

export function loadAppSettings() {
  if (typeof window === 'undefined') {
    return { ...DEFAULT_APP_SETTINGS }
  }

  try {
    const raw = window.localStorage.getItem(APP_SETTINGS_STORAGE_KEY)
    if (!raw) {
      return { ...DEFAULT_APP_SETTINGS }
    }
    const parsed = JSON.parse(raw)
    const normalized = normalizeAppSettings(parsed)
    const rawNormalized = JSON.stringify(normalized)
    if (rawNormalized !== raw) {
      window.localStorage.setItem(APP_SETTINGS_STORAGE_KEY, rawNormalized)
    }
    return normalized
  } catch {
    return { ...DEFAULT_APP_SETTINGS }
  }
}

export function saveAppSettings(settings = {}) {
  const normalized = normalizeAppSettings({
    ...settings,
    isUserConfigured: true,
  })
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(APP_SETTINGS_STORAGE_KEY, JSON.stringify(normalized))
    window.dispatchEvent(new CustomEvent(APP_SETTINGS_UPDATED_EVENT, { detail: normalized }))
  }
  return normalized
}

export function hasAppSettingsOverrides(settings = null) {
  return hasGraphAppSettingsOverrides(settings) || hasLlmAppSettingsOverrides(settings)
}

export function hasGraphAppSettingsOverrides(settings = null) {
  const normalized = normalizeAppSettings(settings || loadAppSettings())
  return normalized.isUserConfigured === true && Boolean(normalized.graphBackend)
}

export function hasLlmAppSettingsOverrides(settings = null) {
  const normalized = normalizeAppSettings(settings || loadAppSettings())
  return (
    normalized.plan !== DEFAULT_APP_SETTINGS.plan ||
    normalized.customBaseUrl !== DEFAULT_APP_SETTINGS.customBaseUrl ||
    normalized.customModel !== DEFAULT_APP_SETTINGS.customModel ||
    normalized.customApiKey !== DEFAULT_APP_SETTINGS.customApiKey
  )
}

export function setAppSettingsPlan(plan, currentSettings = null) {
  const normalizedPlan = normalizeText(plan, DEFAULT_APP_SETTINGS.plan).toUpperCase()
  const current = normalizeAppSettings(currentSettings || loadAppSettings())
  const nextPlan = normalizedPlan in APP_SETTINGS_PRESETS ? normalizedPlan : DEFAULT_APP_SETTINGS.plan
  const preset = APP_SETTINGS_PRESETS[nextPlan] || DEFAULT_APP_SETTINGS
  const usesOpenRouter = isOpenRouterPlan(nextPlan)
  const graphBackend = normalizeGraphBackend(
    current.graphBackend ?? current.graphFallback,
    preset.graphFallback
  )
  const customBaseUrl = usesOpenRouter
    ? resolveOpenRouterEditableValue(
        current.customBaseUrl || current.baseUrl,
        OPENROUTER_BASE_URL_DEFAULTS,
        preset.baseUrl
      )
    : normalizeText(current.customBaseUrl, APP_SETTINGS_PRESETS.C.baseUrl)
  const customModel = usesOpenRouter
    ? resolveOpenRouterEditableValue(
        current.customModel || current.model,
        OPENROUTER_MODEL_DEFAULTS,
        preset.model
      )
    : normalizeText(current.customModel, APP_SETTINGS_PRESETS.C.model)
  const customApiKey = normalizeOptionalText(current.customApiKey || current.apiKey)
  const merged = normalizeAppSettings(
    usesOpenRouter
      ? {
          ...current,
          plan: nextPlan,
          provider: preset.provider,
          graphBackend,
          graphFallback: graphBackend,
          baseUrl: customBaseUrl,
          model: customModel,
          apiKey: customApiKey,
          customBaseUrl,
          customModel,
          customApiKey,
        }
      : {
          ...current,
          ...preset,
          plan: nextPlan,
          graphBackend,
          graphFallback: graphBackend,
          apiKey: '',
          customBaseUrl,
          customModel,
          customApiKey,
        }
  )
  return saveAppSettings(merged)
}

export function setAppSettingsGraphBackend(graphBackend, currentSettings = null) {
  const current = normalizeAppSettings(currentSettings || loadAppSettings())
  const nextGraphBackend = normalizeGraphBackend(graphBackend, current.graphBackend || current.graphFallback || 'neo4j')
  return saveAppSettings({
    ...current,
    graphBackend: nextGraphBackend,
    graphFallback: nextGraphBackend,
  })
}

export function setAppSettingsAudioEnabled(audioEnabled, currentSettings = null) {
  const current = normalizeAppSettings(currentSettings || loadAppSettings())
  return saveAppSettings({
    ...current,
    audioEnabled: normalizeBoolean(audioEnabled, DEFAULT_APP_SETTINGS.audioEnabled),
  })
}

export function buildAppSettingsHeaders(settings = null) {
  const normalized = normalizeAppSettings(settings || loadAppSettings())
  const headers = {}

  if (hasLlmAppSettingsOverrides(normalized)) {
    headers['X-LLM-Plan'] = normalized.plan
    headers['X-LLM-Provider'] = normalized.provider
    headers['X-LLM-Base-Url'] = normalized.baseUrl
    headers['X-LLM-Model'] = normalized.model
    if (normalized.apiKey) {
      headers['X-LLM-Api-Key'] = normalized.apiKey
    }
  }

  if (hasGraphAppSettingsOverrides(normalized)) {
    headers['X-LLM-Graph-Fallback'] = normalized.graphBackend
    headers['X-LLM-Knowledge-Engine'] = resolveKnowledgeEngine(normalized.graphBackend)
  }

  return headers
}
