// @ts-nocheck
const mojibakePattern = /(?:Ã.|Â.|[à-ÿ][\x80-\xBF]?|�)/
const hangulPattern = /[\u3131-\u318e\uac00-\ud7a3]/

function decodeLatin1Utf8(value) {
  if ([...value].some((char) => char.codePointAt(0) > 255)) return value
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(
      Uint8Array.from([...value].map((char) => char.codePointAt(0))),
    )
  } catch {
    return value
  }
}

export function normalizeMojibakeText(value) {
  if (typeof value !== 'string' || !mojibakePattern.test(value) || hangulPattern.test(value)) return value
  const decoded = decodeLatin1Utf8(value)
  return hangulPattern.test(decoded) ? decoded : value
}

export function normalizeMojibakeDeep(value) {
  if (typeof value === 'string') return normalizeMojibakeText(value)
  if (Array.isArray(value)) return value.map(normalizeMojibakeDeep)
  if (!value || typeof value !== 'object') return value
  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [key, normalizeMojibakeDeep(item)]),
  )
}
