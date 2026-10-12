// @ts-nocheck
export function buildRehearsalTimeline(result, coaId) {
  const branch = (result?.branches || []).find((item) => item?.coa_id === coaId) || result?.branches?.[0]
  if (!branch) return []
  const failures = new Map((branch.failure_paths || []).map((path) => [path.failure_path_id, path]))
  return (branch.timeline || [])
    .map((event) => ({
      id: `${branch.coa_id}:${event.event_id}`,
      coa_id: branch.coa_id,
      event_id: event.event_id,
      time_minute: event.time_minute,
      failure_path_id: event.failure_path_id || null,
      evidence_ids: event.evidence_ids || [],
      location: event.location || failures.get(event.failure_path_id)?.location || null,
      source_locator: event.source_locator || null,
      state_transitions: event.state_transitions || [],
      decision_point: failures.get(event.failure_path_id)?.decision_point || null,
    }))
    .sort((left, right) => left.time_minute - right.time_minute || left.id.localeCompare(right.id))
}

export function visibleTimelineEvents(events, currentMinute) {
  return (events || []).filter((event) => event.time_minute <= currentMinute)
}

export function nextDecisionMinute(events, currentMinute) {
  const next = (events || []).find((event) => event.decision_point && event.time_minute >= currentMinute)
  return next?.time_minute ?? currentMinute
}
