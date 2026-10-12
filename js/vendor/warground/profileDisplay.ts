// @ts-nocheck
const SLUG_SEPARATOR_RE = /[_-]+/g
const MULTI_SPACE_RE = /\s+/g
const NUMERIC_SUFFIX_RE = /^\d+$/

const normalizeProfileRecord = (profile) => (
  profile && typeof profile === 'object'
    ? profile
    : {}
)

export function formatProfileDisplayName(value, fallback = '') {
  const raw = String(value ?? '').trim()
  if (!raw) {
    return fallback
  }

  let text = raw.replace(SLUG_SEPARATOR_RE, ' ').replace(MULTI_SPACE_RE, ' ').trim()
  if (!text) {
    return fallback
  }

  const tokens = text.split(' ')
  if (tokens.length >= 3 && NUMERIC_SUFFIX_RE.test(tokens[tokens.length - 1])) {
    const head = tokens.slice(0, -1)
    if (head.some((token) => /[A-Za-z가-힣]/.test(token))) {
      text = head.join(' ').trim()
    }
  }

  return text || fallback
}

export function getProfileDisplayName(profile = {}, fallback = '미식별 주체') {
  const safeProfile = normalizeProfileRecord(profile)
  const candidates = [
    safeProfile.display_name,
    safeProfile.realname,
    safeProfile.name,
    safeProfile.username,
    safeProfile.user_name,
  ]

  for (const candidate of candidates) {
    const formatted = formatProfileDisplayName(candidate)
    if (formatted) {
      return formatted
    }
  }

  return fallback
}

export function getProfileIdentifier(profile = {}, fallback = '') {
  const safeProfile = normalizeProfileRecord(profile)
  const candidates = [
    safeProfile.username,
    safeProfile.user_name,
    safeProfile.name,
  ]

  for (const candidate of candidates) {
    const formatted = String(candidate ?? '').trim()
    if (formatted) {
      return formatted
    }
  }

  return fallback
}
