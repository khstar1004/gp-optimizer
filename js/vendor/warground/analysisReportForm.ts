// @ts-nocheck
export const DIRECTIVE_SLOT_COUNT = 10

const normalizeText = (value = '') => String(value || '')
  .replace(/\r\n/g, '\n')
  .replace(/\r/g, '\n')

export const stripNarrativeMarkdown = (value = '') => normalizeText(value)
  .replace(/```[\s\S]*?```/g, ' ')
  .replace(/!\[[^\]]*]\([^)]*\)/g, ' ')
  .replace(/\[([^\]]+)]\([^)]*\)/g, '$1')
  .replace(/^\s*#{1,6}\s+/gm, '')
  .replace(/[*_`>]/g, '')
  .replace(/[|]/g, ' ')
  .replace(/[ \t]+/g, ' ')
  .trim()

export const splitNarrativeLines = (value = '') => stripNarrativeMarkdown(value)
  .replace(/\s*(?:[-*]|\d+[.)]|ㅇ|○)\s*/g, ' ')
  .replace(/([.!?]|다\.|요\.|함\.|음\.|됨\.)\s+/g, '$1\n')
  .split(/\n+/)
  .map((line) => line.replace(/\s+/g, ' ').trim())
  .filter((line) => (
    line
    && !/^(?:전반기\s*)?지휘활동\s*총평$/u.test(line)
    && !/^후반기\s*지휘활동\s*방향\s*제시$/u.test(line)
  ))

export const cleanDirectiveCandidate = (value = '') => {
  const text = normalizeText(value)
    .replace(/\[([^\]]+)]\([^)]*\)/g, '$1')
    .replace(/^#{1,6}\s+/u, '')
    .replace(/^[ \t]*(?:[-*]|\d+[.)]|[①-⑩]|ㅇ|○)\s*/u, '')
    .replace(/[*_`>|]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[.,;:!?，、]+$/u, '')
    .trim()

  if (!text) return ''

  const compact = text.replace(/\s+/g, '')
  if (/^지시\/?강조사항(?:\(많은빈도순,?10가지\))?$/u.test(compact)) return ''
  if (/^사항(?:\(많은빈도순,?10가지\))?$/u.test(compact)) return ''
  if (/^[①-⑩]$/u.test(compact)) return ''
  if (/(해야|하여야|즉시|로드맵|최우선)/u.test(compact)) return ''
  if (text.length < 8) return ''

  const directiveSignal = /(지시|강조|확인|점검|관리|검토|정착|제고|확립|혁신|개선|정예화|확보|강화|유지|포함|함)/u
  return directiveSignal.test(text) ? text : ''
}

export const extractDirectiveItems = (value = '', { limit = DIRECTIVE_SLOT_COUNT } = {}) => {
  const items = []
  normalizeText(value).split(/\n+/).forEach((rawLine) => {
    if (/^\s*#{1,6}\s+/u.test(rawLine)) return
    const item = cleanDirectiveCandidate(rawLine)
    if (item && !items.includes(item)) {
      items.push(item)
    }
  })
  return items.slice(0, limit)
}

export const chooseDirectiveSlots = (sources = [], count = DIRECTIVE_SLOT_COUNT) => {
  const sourceList = Array.isArray(sources) ? sources : [sources]
  const itemSets = sourceList
    .map((source) => extractDirectiveItems(source, { limit: count }))
    .filter((items) => items.length)

  const complete = itemSets.find((items) => items.length >= count)
  const selected = complete ? [...complete] : []

  if (!selected.length) {
    itemSets.flat().forEach((item) => {
      if (!selected.includes(item)) {
        selected.push(item)
      }
    })
  }

  return [
    ...selected.slice(0, count),
    ...Array.from({ length: count }, () => ''),
  ].slice(0, count)
}
