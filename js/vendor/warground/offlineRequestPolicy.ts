// @ts-nocheck
const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '::1', '[::1]'])

const normalizeHost = (hostname) => String(hostname || '').trim().toLowerCase()

export const isOfflineRequestAllowed = (rawUrl, currentOrigin = '') => {
  const value = String(rawUrl || '').trim()
  if (!value || /^(?:data|blob|file|javascript):/i.test(value)) {
    return false
  }

  let target
  try {
    target = new URL(value, currentOrigin || 'http://localhost')
  } catch {
    return false
  }

  if (!['http:', 'https:'].includes(target.protocol)) {
    return false
  }

  let current = null
  try {
    current = currentOrigin ? new URL(currentOrigin) : null
  } catch {
    current = null
  }

  if (current && target.origin === current.origin) {
    return true
  }

  return LOOPBACK_HOSTS.has(normalizeHost(target.hostname))
}
