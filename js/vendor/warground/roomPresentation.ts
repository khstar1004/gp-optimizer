// @ts-nocheck
const dateFormatter = new Intl.DateTimeFormat('ko-KR', {
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
})

export const classificationLabels = {
  internal: '대내',
  restricted: '제한',
  confidential: '기밀',
  secret: '비밀',
  top_secret: '극비',
}

export const graphStatusLabels = {
  standby: '대기',
  queued: '대기열',
  ready: '준비',
  processing: '갱신 중',
  refreshing: '갱신 중',
  running: '가동 중',
  completed: '완료',
  succeeded: '완료',
  cancelled: '중지됨',
  canceled: '중지됨',
  failed: '실패',
  error: '오류',
}

export const sourceTypeLabels = {
  file: '문서',
  url: '링크',
  web: '링크',
  note: '메모',
}

export const sourceStatusLabels = {
  ready: '반입 완료',
  completed: '반입 완료',
  processing: '반입 중',
  uploading: '업로드 중',
  queued: '대기열',
  failed: '반입 실패',
  error: '오류',
}

export const formatRoomTimestamp = (value) => {
  if (!value) return '기록 없음'

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }

  return dateFormatter.format(date)
}

export const formatClassification = (value) => {
  const key = String(value || '').trim().toLowerCase()
  return classificationLabels[key] || (value ? String(value) : '미지정')
}

export const formatGraphStatus = (value) => {
  const key = String(value || '').trim().toLowerCase()
  return graphStatusLabels[key] || (value ? String(value) : '대기')
}

export const formatSourceType = (value) => {
  const key = String(value || '').trim().toLowerCase()
  return sourceTypeLabels[key] || (value ? String(value) : '자료')
}

export const formatSourceStatus = (value) => {
  const key = String(value || '').trim().toLowerCase()
  return sourceStatusLabels[key] || (value ? String(value) : '반입 완료')
}

export const formatCount = (value, suffix = '건') => {
  const count = Number(value || 0)
  if (!Number.isFinite(count)) return `0${suffix}`
  return `${count.toLocaleString('ko-KR')}${suffix}`
}

export const formatByteSize = (value) => {
  const size = Number(value || 0)
  if (!Number.isFinite(size) || size <= 0) return '크기 미상'

  if (size >= 1024 * 1024) {
    return `${(size / (1024 * 1024)).toFixed(1)} MB`
  }

  if (size >= 1024) {
    return `${Math.round(size / 1024)} KB`
  }

  return `${size} B`
}
