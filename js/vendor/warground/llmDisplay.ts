// @ts-nocheck
const OPENROUTER_HOST_RE = /(^|\/\/)([^/]*\.)?openrouter\.ai(\/|$)/i
const OLLAMA_HOST_RE = /(^|\/\/)(localhost|127\.0\.0\.1):11434(\/|$)/i

function normalizeText(value) {
  return typeof value === 'string' ? value.trim() : ''
}

export function isOpenRouterLlm({ provider = '', baseUrl = '', model = '' } = {}) {
  const normalizedProvider = normalizeText(provider).toLowerCase()
  const normalizedBaseUrl = normalizeText(baseUrl)
  const normalizedModel = normalizeText(model).toLowerCase()

  if (normalizedProvider === 'openrouter') {
    return true
  }

  if (OPENROUTER_HOST_RE.test(normalizedBaseUrl)) {
    return true
  }

  if (!normalizedModel) {
    return false
  }

  if (normalizedModel.includes(':free')) {
    return true
  }

  return normalizedProvider === 'openai' && normalizedModel.includes('/')
}

export function isOllamaLlm({ provider = '', baseUrl = '' } = {}) {
  const normalizedProvider = normalizeText(provider).toLowerCase()
  const normalizedBaseUrl = normalizeText(baseUrl)
  return normalizedProvider === 'ollama' || OLLAMA_HOST_RE.test(normalizedBaseUrl)
}

export function getMaskedLlmLabel(llm = {}, fallback = '-') {
  if (isOllamaLlm(llm)) {
    return 'Ollama'
  }

  if (isOpenRouterLlm(llm)) {
    return 'OpenRouter'
  }

  const model = normalizeText(llm.model)
  return model || fallback
}

export function formatLlmRunDisplay(llm = {}, fallback = '') {
  const label = getMaskedLlmLabel(llm, fallback)
  if (!label) {
    return fallback
  }

  if (label === 'OpenRouter') {
    return label
  }

  const reasoningEffort = normalizeText(llm.reasoningEffort || llm.reasoning_effort)
  if (!reasoningEffort) {
    return label
  }

  return `${label} / ${reasoningEffort}`
}
