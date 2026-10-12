// @ts-nocheck
const WEEKDAY_ALIASES = [
  { key: 'mon', label: '월', pattern: /(?:^|[^가-힣])(월)(?:요일)?(?:[^가-힣]|$)/u },
  { key: 'tue', label: '화', pattern: /(?:^|[^가-힣])(화)(?:요일)?(?:[^가-힣]|$)/u },
  { key: 'wed', label: '수', pattern: /(?:^|[^가-힣])(수)(?:요일)?(?:[^가-힣]|$)/u },
  { key: 'thu', label: '목', pattern: /(?:^|[^가-힣])(목)(?:요일)?(?:[^가-힣]|$)/u },
  { key: 'fri', label: '금', pattern: /(?:^|[^가-힣])(금)(?:요일)?(?:[^가-힣]|$)/u },
]

const ACTIVITY_KEYS = ['event', 'meeting', 'briefing', 'education', 'other']
const EMPTY_WEEKDAY = { briefing: 0, meeting: 0, field: 0, fitness: 0 }
const COUNT_PATTERN = /([0-9]+(?:\.[0-9]+)?)\s*회/u
const EXPLICIT_ACTIVITY_TABLE_PATTERN = /\|\s*횟\s*수\s*\|\s*([0-9]+(?:\.[0-9]+)?|00)\s*회\s*\|\s*([0-9]+(?:\.[0-9]+)?|00)\s*회\s*\|\s*([0-9]+(?:\.[0-9]+)?|00)\s*회\s*\|\s*([0-9]+(?:\.[0-9]+)?|00)\s*회\s*\|\s*([0-9]+(?:\.[0-9]+)?|00)\s*회\s*\|/u
const DATE_PATTERN = /(?:(20[0-9]{2})\s*[.\-/년]\s*)?(0?[1-9]|1[0-2])\s*[.\-/월]\s*(0?[1-9]|[12][0-9]|3[01])\s*(?:일)?\s*[.,，/]?/u
const SCHEDULE_DATE_HEADER_PATTERN = /^[<(\[]?\s*(?:(?:20[0-9]{2})\s*[.\-/년]\s*)?(?:[월화수목금토일]\s*)?(?:0?[1-9]|1[0-2])\s*[.\-/월]\s*(?:0?[1-9]|[12][0-9]|3[01])\s*(?:일)?\s*[.,，]?\s*(?:[월화수목금토일]\s*\.?)?(?:\s*음.*)?\s*[>)\]]?\s*$/u
const SCHEDULE_TIME_PATTERN = /^(?:[01]?[0-9]|2[0-3])[0-5][0-9]$/u

const CATEGORY_PATTERNS = {
  event: /(행사|기념식|착수식|개최|선포식|전역식|추모행사|입영식|진급식|환영행사|의장행사|방문|참석|워크숍|세미나|간담회)/u,
  meeting: /(회의(?!실)|토의|토론|협의|간담회)/u,
  briefing: /(업무\s*보고|현안\s*보고|보고(?!서|자료|문|체계|자))/u,
  education: /(교육|일깨움|훈시|강연|특강|워크숍)/u,
  field: /(현장\s*지도|현장지도|현장\s*점검|부대\s*방문|현장\s*확인)/u,
  fitness: /(체력\s*단련|체력단련|전투체력|체육활동)/u,
}

const OTHER_PATTERN = /(인터뷰|언론|보도자료|지휘서신|말씀|브리핑|간담|대담)/u

const toNumber = (value) => {
  const numeric = Number.parseFloat(String(value ?? '').replace(/,/g, ''))
  return Number.isFinite(numeric) ? numeric : null
}

const normalizeText = (value = '') => String(value || '')
  .replace(/\r\n/g, '\n')
  .replace(/\r/g, '\n')
  .replace(/\t/g, ' ')

const stripMarkdownLine = (line = '') => {
  let cleaned = String(line || '').replace(/^#{1,6}\s+/, '')
  if (!SCHEDULE_DATE_HEADER_PATTERN.test(cleaned.trim())) {
    cleaned = cleaned.replace(/^\s*(?:[-*]|\d+[.)]|[①-⑩]|ㅇ|○)\s*/, '')
  }
  return cleaned
    .replace(/[|*_`>]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

const splitSourceLines = (source = '') => normalizeText(source)
  .split('\n')
  .map(stripMarkdownLine)
  .filter(Boolean)
  .filter((line) => !/^\s*:?-{3,}:?\s*$/.test(line))

const createEmptyWeekdayStats = () => Object.fromEntries(
  WEEKDAY_ALIASES.map((weekday) => [weekday.key, { ...EMPTY_WEEKDAY }])
)

const hasMeaningfulCount = (counts) => ACTIVITY_KEYS.some((key) => Number(counts?.[key] || 0) > 0)

const parseExplicitActivityCounts = (source = '') => {
  const match = normalizeText(source).match(EXPLICIT_ACTIVITY_TABLE_PATTERN)
  if (!match) return null

  const values = match.slice(1, 6).map(toNumber)
  return {
    event: values[0] ?? 0,
    meeting: values[1] ?? 0,
    briefing: values[2] ?? 0,
    education: values[3] ?? 0,
    other: values[4] ?? 0,
  }
}

const countLineMatches = (line, pattern) => pattern.test(line) ? 1 : 0

const countActivityLines = (lines = []) => {
  const counts = { event: 0, meeting: 0, briefing: 0, education: 0, other: 0 }

  lines.forEach((line) => {
    counts.event += countLineMatches(line, CATEGORY_PATTERNS.event)
    counts.meeting += countLineMatches(line, CATEGORY_PATTERNS.meeting)
    counts.briefing += countLineMatches(line, CATEGORY_PATTERNS.briefing)
    counts.education += countLineMatches(line, CATEGORY_PATTERNS.education)
    counts.other += countLineMatches(line, OTHER_PATTERN)
  })

  return counts
}

const findWeekdayKey = (line = '') => {
  const dateWeekday = String(line).match(/\([^)]*([월화수목금])[^)]*\)/u)
  const weekdayLabel = dateWeekday?.[1]
  const fromParentheses = WEEKDAY_ALIASES.find((weekday) => weekday.label === weekdayLabel)
  if (fromParentheses) return fromParentheses.key

  return WEEKDAY_ALIASES.find((weekday) => weekday.pattern.test(line))?.key || ''
}

const getWeekdayKeyFromDate = (date) => {
  if (!(date instanceof Date)) return ''
  const dayIndex = date.getUTCDay() - 1
  return WEEKDAY_ALIASES[dayIndex]?.key || ''
}

const countWeekdayLines = (items = []) => {
  const weekdayStats = createEmptyWeekdayStats()

  items.forEach((item) => {
    const line = typeof item === 'string' ? item : item?.line
    const weekdayKey = findWeekdayKey(line) || getWeekdayKeyFromDate(item?.date)
    if (!weekdayKey) return

    weekdayStats[weekdayKey].briefing += countLineMatches(line, CATEGORY_PATTERNS.briefing)
    weekdayStats[weekdayKey].meeting += countLineMatches(line, CATEGORY_PATTERNS.meeting)
    weekdayStats[weekdayKey].field += countLineMatches(line, CATEGORY_PATTERNS.field)
    weekdayStats[weekdayKey].fitness += countLineMatches(line, CATEGORY_PATTERNS.fitness)
  })

  return weekdayStats
}

const parseExplicitDailyAverage = (source = '') => {
  const match = normalizeText(source).match(/일일\s*평균\s*일정\s*횟수\s*[:：]?\s*([0-9]+(?:\.[0-9]+)?)\s*회/u)
  return toNumber(match?.[1])
}

const parseExplicitFitnessAverage = (source = '') => {
  const match = normalizeText(source).match(/체력\s*단련\s*시행\s*횟수\s*[:：]?\s*(?:주\s*)?([0-9]+(?:\.[0-9]+)?)\s*회/u)
  return toNumber(match?.[1])
}

const countActiveWeekdays = (weekdayStats) => Object.values(weekdayStats || {})
  .filter((stats) => Object.values(stats || {}).some((value) => Number(value || 0) > 0))
  .length

const lineHasActivity = (line = '') => (
  ['event', 'meeting', 'briefing', 'education'].some((key) => countLineMatches(line, CATEGORY_PATTERNS[key]))
  || countLineMatches(line, CATEGORY_PATTERNS.field)
  || countLineMatches(line, CATEGORY_PATTERNS.fitness)
  || countLineMatches(line, OTHER_PATTERN)
)

const extractDefaultYear = (source = '') => {
  const longMatch = normalizeText(source).match(/(20[0-9]{2})\s*년/u)
  if (longMatch?.[1]) return Number(longMatch[1])
  const shortMatch = normalizeText(source).match(/['‘’]?\s*([0-9]{2})\s*년/u)
  if (shortMatch?.[1]) return 2000 + Number(shortMatch[1])
  return 2026
}

const parseActivityDate = (line = '', defaultYear = 2026) => {
  const match = String(line || '').match(DATE_PATTERN)
  if (!match) return null

  const year = Number(match[1] || defaultYear)
  const month = Number(match[2])
  const day = Number(match[3])
  const date = new Date(Date.UTC(year, month - 1, day))
  if (
    date.getUTCFullYear() !== year
    || date.getUTCMonth() !== month - 1
    || date.getUTCDate() !== day
  ) {
    return null
  }
  return date
}

const parseScheduleContextDate = (line = '', defaultYear = 2026) => {
  if (!SCHEDULE_DATE_HEADER_PATTERN.test(String(line || '').trim())) return null
  return parseActivityDate(line, defaultYear)
}

const parseScheduleTime = (line = '') => {
  const text = String(line || '').trim()
  if (!SCHEDULE_TIME_PATTERN.test(text)) return null
  const hour = Number(text.slice(0, -2))
  const minute = Number(text.slice(-2))
  return hour * 60 + minute
}

const normalizeActivityDedupeText = (line = '') => String(line || '')
  .replace(/\([^)]*\)/gu, ' ')
  .replace(/[^0-9A-Za-z가-힣]+/gu, ' ')
  .replace(/\s+/gu, ' ')
  .trim()
  .toLowerCase()

const getActivityDedupeKey = (date, scheduleTime, line = '') => [
  date.toISOString().slice(0, 10),
  scheduleTime === null || scheduleTime === undefined ? '' : String(scheduleTime).padStart(4, '0'),
  normalizeActivityDedupeText(line),
].join('|')

const getIsoWeekKey = (date) => {
  const target = new Date(date.valueOf())
  const dayNumber = (target.getUTCDay() + 6) % 7
  target.setUTCDate(target.getUTCDate() - dayNumber + 3)

  const firstThursday = new Date(Date.UTC(target.getUTCFullYear(), 0, 4))
  const firstDayNumber = (firstThursday.getUTCDay() + 6) % 7
  firstThursday.setUTCDate(firstThursday.getUTCDate() - firstDayNumber + 3)

  const week = 1 + Math.round((target - firstThursday) / 604800000)
  return `${target.getUTCFullYear()}-${week}`
}

export const extractCommandActivityMetrics = (source = '') => {
  const normalizedSource = normalizeText(source)
  const lines = splitSourceLines(normalizedSource)
  const tableCounts = parseExplicitActivityCounts(normalizedSource)
  const defaultYear = extractDefaultYear(normalizedSource)
  const datedActivityLines = []
  let contextDate = null
  let contextDateTtl = 0
  let contextDateActive = false
  let lastScheduleTime = null
  let currentScheduleTime = null
  const seenActivityKeys = new Set()

  lines.forEach((line) => {
    if (contextDateTtl > 0) contextDateTtl -= 1
    const nextContextDate = parseScheduleContextDate(line, defaultYear)
    if (nextContextDate) {
      contextDate = nextContextDate
      contextDateTtl = 260
      contextDateActive = true
      lastScheduleTime = null
      currentScheduleTime = null
    }

    const scheduleTime = parseScheduleTime(line)
    if (scheduleTime !== null && contextDateTtl > 0) {
      if (
        contextDateActive
        && lastScheduleTime !== null
        && lastScheduleTime >= 12 * 60
        && scheduleTime < lastScheduleTime
      ) {
        contextDateActive = false
        currentScheduleTime = null
      }
      if (contextDateActive) {
        lastScheduleTime = scheduleTime
        currentScheduleTime = scheduleTime
      }
    }
    if (!lineHasActivity(line)) return

    const explicitDate = parseActivityDate(line, defaultYear)
    const usedContextDate = !explicitDate && contextDateTtl > 0 && contextDateActive
    const date = explicitDate || (usedContextDate ? contextDate : null)
    if (date) {
      const dedupeKey = getActivityDedupeKey(
        date,
        usedContextDate ? currentScheduleTime : null,
        line,
      )
      if (seenActivityKeys.has(dedupeKey)) return
      seenActivityKeys.add(dedupeKey)
      datedActivityLines.push({ line, date })
    }
  })
  const inferredCounts = countActivityLines(datedActivityLines.map((item) => item.line))
  const activityCounts = tableCounts || inferredCounts
  const weekdayStats = countWeekdayLines(datedActivityLines)
  const datedActivityDates = datedActivityLines.map((item) => item.date)
  const activeWeekdayCount = countActiveWeekdays(weekdayStats)
  const totalScheduledActivities = Object.values(activityCounts)
    .reduce((sum, value) => sum + Number(value || 0), 0)
  const uniqueDates = new Set(datedActivityDates.map((date) => date.toISOString().slice(0, 10)))
  const fitnessCount = Object.values(weekdayStats).reduce((sum, stats) => sum + Number(stats.fitness || 0), 0)
  const fitnessWeeks = new Set(
    datedActivityDates
      .filter((date) => {
        const day = date.getUTCDay()
        return day >= 1 && day <= 5
      })
      .map(getIsoWeekKey)
  )

  return {
    activityCounts,
    weekdayStats,
    dailyAverage: parseExplicitDailyAverage(normalizedSource)
      ?? (uniqueDates.size > 0
        ? Number((totalScheduledActivities / uniqueDates.size).toFixed(1))
        : (activeWeekdayCount > 0 ? Number((totalScheduledActivities / activeWeekdayCount).toFixed(1)) : null)),
    fitnessAverage: parseExplicitFitnessAverage(normalizedSource)
      ?? (fitnessWeeks.size > 0 ? Number((fitnessCount / fitnessWeeks.size).toFixed(1)) : null),
  }
}

export const formatActivityCount = (value) => {
  const numeric = toNumber(value)
  if (numeric === null || numeric <= 0) return '00회'
  if (Number.isInteger(numeric)) return `${String(numeric).padStart(2, '0')}회`
  return `${numeric.toFixed(1)}회`
}

export const formatDecimalCount = (value) => {
  const numeric = toNumber(value)
  if (numeric === null || numeric < 0) return '0.0'
  return numeric.toFixed(1)
}

export const formatWeekdayActivityText = (stats = {}) => (
  `보고 ${formatDecimalCount(stats.briefing)}회, `
  + `회의 ${formatDecimalCount(stats.meeting)}회, `
  + `현장지도 ${formatDecimalCount(stats.field)}회, `
  + `체력단련 ${formatDecimalCount(stats.fitness)}회`
)

export const WEEKDAY_ACTIVITY_ROWS = WEEKDAY_ALIASES.map(({ key, label }) => ({ key, day: label }))
