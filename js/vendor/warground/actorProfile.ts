// @ts-nocheck
export const ACTOR_PROFILE_STORAGE_KEY = 'consafe-onto.governance.actor-profile'
export const ACTOR_PROFILE_UPDATED_EVENT = 'consafe-onto:actor-profile-updated'
const LEGACY_ACTOR_PROFILE_STORAGE_KEY = 'futureeye.governance.actor-profile'
const ENCODED_HEADER_SUFFIX = '-Encoded'

export const DEFAULT_ACTOR_PROFILE = Object.freeze({
  actorId: 'secretariat-controller',
  actorName: '비서실 검토 담당',
  actorUnit: '육군 비서실 분석셀'
})

export function normalizeActorProfile(profile = {}) {
  return {
    actorId: typeof profile.actorId === 'string' && profile.actorId.trim()
      ? profile.actorId.trim()
      : DEFAULT_ACTOR_PROFILE.actorId,
    actorName: typeof profile.actorName === 'string' && profile.actorName.trim()
      ? profile.actorName.trim()
      : DEFAULT_ACTOR_PROFILE.actorName,
    actorUnit: typeof profile.actorUnit === 'string' && profile.actorUnit.trim()
      ? profile.actorUnit.trim()
      : DEFAULT_ACTOR_PROFILE.actorUnit
  }
}

export function loadActorProfile() {
  if (typeof window === 'undefined') {
    return { ...DEFAULT_ACTOR_PROFILE }
  }

  try {
    const raw = window.localStorage.getItem(ACTOR_PROFILE_STORAGE_KEY)
      || window.localStorage.getItem(LEGACY_ACTOR_PROFILE_STORAGE_KEY)
    if (!raw) {
      return { ...DEFAULT_ACTOR_PROFILE }
    }
    const normalized = normalizeActorProfile(JSON.parse(raw))
    window.localStorage.setItem(ACTOR_PROFILE_STORAGE_KEY, JSON.stringify(normalized))
    return normalized
  } catch {
    return { ...DEFAULT_ACTOR_PROFILE }
  }
}

export function saveActorProfile(profile = {}) {
  const normalized = normalizeActorProfile(profile)
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(ACTOR_PROFILE_STORAGE_KEY, JSON.stringify(normalized))
    window.dispatchEvent(new CustomEvent(ACTOR_PROFILE_UPDATED_EVENT, { detail: normalized }))
  }
  return normalized
}

function isIso88591Compatible(value) {
  return Array.from(String(value ?? '')).every((char) => char.codePointAt(0) <= 0xff)
}

function appendActorHeader(headers, key, value) {
  const normalizedValue = typeof value === 'string' ? value.trim() : String(value ?? '').trim()
  if (!normalizedValue) {
    return
  }

  if (isIso88591Compatible(normalizedValue)) {
    headers[key] = normalizedValue
    return
  }

  headers[`${key}${ENCODED_HEADER_SUFFIX}`] = encodeURIComponent(normalizedValue)
}

export function buildActorHeaders(profile = null) {
  const normalized = normalizeActorProfile(profile || loadActorProfile())
  const headers = {}

  appendActorHeader(headers, 'X-Actor-ID', normalized.actorId)
  appendActorHeader(headers, 'X-Actor-Name', normalized.actorName)
  appendActorHeader(headers, 'X-Actor-Unit', normalized.actorUnit)

  return headers
}

export function subscribeActorProfile(callback) {
  if (typeof window === 'undefined' || typeof callback !== 'function') {
    return () => {}
  }

  const handleUpdated = (event) => {
    callback(normalizeActorProfile(event.detail || {}))
  }

  const handleStorage = (event) => {
    if (event.key === ACTOR_PROFILE_STORAGE_KEY) {
      callback(loadActorProfile())
    }
  }

  window.addEventListener(ACTOR_PROFILE_UPDATED_EVENT, handleUpdated)
  window.addEventListener('storage', handleStorage)

  return () => {
    window.removeEventListener(ACTOR_PROFILE_UPDATED_EVENT, handleUpdated)
    window.removeEventListener('storage', handleStorage)
  }
}
