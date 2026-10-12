// @ts-nocheck
function frameTick(frame, fallback = 0) {
  const tick = Number(frame?.tick)
  return Number.isFinite(tick) ? tick : fallback
}

function frameTime(frame, fallback = 0) {
  const time = Number(frame?.simulation_time_s)
  return Number.isFinite(time) ? time : fallback
}

function unitIds(frame) {
  return [...new Set(
    (Array.isArray(frame?.units) ? frame.units : [])
      .map((unit) => String(unit?.unit_id || unit?.id || '').trim())
      .filter(Boolean),
  )].sort()
}

export function frameIdentity(frame) {
  return unitIds(frame).join('|') || 'no-units'
}

function orderedFrames(frames) {
  return frames
    .filter((frame) => frame && typeof frame === 'object' && frame.frame_id)
    // The API appends independent runs to one store. Tick values restart for
    // each run, so global tick sorting would interleave unrelated evidence.
}

function splitSegments(frames) {
  const segments = []
  let current = []
  let identity = ''
  let previousTick = null

  for (const frame of frames) {
    const nextIdentity = frameIdentity(frame)
    const nextTick = frameTick(frame)
    const continuous = current.length > 0
      && nextIdentity === identity
      && nextTick > previousTick

    if (!continuous && current.length) segments.push(current)
    if (!continuous) {
      current = []
      identity = nextIdentity
    }

    current.push(frame)
    previousTick = nextTick
  }

  if (current.length) segments.push(current)
  return segments
}

function splitAdvancingSegments(segment) {
  const segments = []
  let current = []
  let previousTime = null

  for (const frame of segment) {
    const time = frameTime(frame)
    const continuous = current.length > 0 && time > previousTime
    if (!continuous && current.length) segments.push(current)
    if (!continuous) current = []
    current.push(frame)
    previousTime = time
  }

  if (current.length) segments.push(current)
  return segments
}

function describeSegment(segment, index) {
  const identity = frameIdentity(segment[0])
  const timeIncreases = segment.every((frame, frameIndex) => (
    frameIndex === 0 || frameTime(frame) > frameTime(segment[frameIndex - 1])
  ))
  const hasStableUnitIdentity = identity !== 'no-units'
  const playable = segment.length >= MINIMUM_REPLAY_FRAMES && timeIncreases && hasStableUnitIdentity
  const status = !hasStableUnitIdentity
    ? 'identity_warning'
    : !timeIncreases
      ? 'time_warning'
      : segment.length < MINIMUM_REPLAY_FRAMES
        ? 'insufficient'
        : 'continuous'

  return {
    id: `${segment[0]?.frame_id || `segment-${index}`}:${identity}`,
    index,
    frames: segment,
    identity,
    frameCount: segment.length,
    startTime: frameTime(segment[0]),
    endTime: frameTime(segment.at(-1)),
    timeIncreases,
    hasStableUnitIdentity,
    playable,
    status,
    message: playable
      ? '같은 단위의 연속 물리 프레임입니다.'
      : `검사 전용 구간: ${!timeIncreases ? '시뮬레이션 시간이 증가하지 않습니다.' : `연속 프레임 ${segment.length}/${MINIMUM_REPLAY_FRAMES}개입니다.`}`,
  }
}

const MINIMUM_REPLAY_FRAMES = 3

export function preparePhysicsReplay(frames) {
  const ordered = orderedFrames(Array.isArray(frames) ? frames : [])
  if (!ordered.length) {
    return { frames: [], status: 'empty', message: '확정 물리 프레임이 없습니다.' }
  }

  const segments = splitSegments(ordered)
  const advancingSegments = segments.flatMap(splitAdvancingSegments)
  const playableCandidates = advancingSegments.filter((segment) => segment.length >= MINIMUM_REPLAY_FRAMES)
  const candidateSegments = playableCandidates.length ? advancingSegments : segments
  const describedSegments = candidateSegments.map(describeSegment)
  const selected = describedSegments
    .slice()
    .sort((left, right) => right.frameCount - left.frameCount || right.endTime - left.endTime)[0]
  const selectedSegmentIndex = describedSegments.findIndex((segment) => segment.id === selected.id)
  const selectedFrames = selected.frames
  const discardedCount = ordered.length - selectedFrames.length
  const timeIncreases = selectedFrames.every((frame, index) => (
    index === 0 || frameTime(frame) > frameTime(selectedFrames[index - 1])
  ))
  const identity = frameIdentity(selectedFrames[0])
  const hasStableUnitIdentity = identity !== 'no-units'
  const playable = selectedFrames.length >= MINIMUM_REPLAY_FRAMES && timeIncreases && hasStableUnitIdentity
  const diagnostics = []

  if (!hasStableUnitIdentity) diagnostics.push('단위 식별자가 없는 프레임은 재생할 수 없습니다.')
  if (!timeIncreases) diagnostics.push('시뮬레이션 시간이 증가하지 않습니다.')
  if (selectedFrames.length < MINIMUM_REPLAY_FRAMES) diagnostics.push(`연속 프레임 ${selectedFrames.length}/${MINIMUM_REPLAY_FRAMES}개입니다.`)
  if (discardedCount) diagnostics.push(`${discardedCount}개 프레임은 다른 단위 또는 구간이라 제외했습니다.`)

  let status = 'continuous'
  if (!hasStableUnitIdentity) status = 'identity_warning'
  else if (!timeIncreases) status = 'time_warning'
  else if (selectedFrames.length < MINIMUM_REPLAY_FRAMES) status = 'insufficient'
  else if (discardedCount) status = 'mixed'

  return {
    frames: selectedFrames,
    segments: describedSegments,
    selectedSegmentIndex,
    totalFrameCount: ordered.length,
    status,
    message: playable ? (discardedCount
      ? `${discardedCount}개 프레임을 제외한 연속 물리 프레임입니다.`
      : '같은 단위의 연속 물리 프레임입니다.')
      : `재생 보류: ${diagnostics.join(' ')}`,
    identity,
    discardedCount,
    timeIncreases,
    hasStableUnitIdentity,
    playable,
    minimumFrameCount: MINIMUM_REPLAY_FRAMES,
  }
}

export function physicsFrameDelta(frame, previousFrame, selectedUnitId = '') {
  const units = Array.isArray(frame?.units) ? frame.units : []
  const unit = units.find((item) => String(item?.unit_id || item?.id || '') === String(selectedUnitId || '')) || units[0]
  const unitId = String(unit?.unit_id || unit?.id || '')
  const previous = new Map(
    (Array.isArray(previousFrame?.units) ? previousFrame.units : [])
      .map((item) => [String(item?.unit_id || item?.id || ''), item]),
  ).get(unitId)
  const position = unit?.position_enu_m || {}
  const previousPosition = previous?.position_enu_m || {}
  const east = Number(position.east_m) - Number(previousPosition.east_m)
  const north = Number(position.north_m) - Number(previousPosition.north_m)
  const up = Number(position.up_m) - Number(previousPosition.up_m)
  const time = Number(frame?.simulation_time_s)
  const previousTime = Number(previousFrame?.simulation_time_s)
  const timeDeltaS = Number.isFinite(time) && Number.isFinite(previousTime) ? time - previousTime : null
  return {
    unitId,
    eastM: Number.isFinite(east) ? east : null,
    northM: Number.isFinite(north) ? north : null,
    upM: Number.isFinite(up) ? up : null,
    distanceM: [east, north, up].every(Number.isFinite) ? Math.hypot(east, north, up) : null,
    hasPrevious: Boolean(previous),
    timeDeltaS,
    timeAdvances: timeDeltaS !== null && timeDeltaS > 0,
  }
}
