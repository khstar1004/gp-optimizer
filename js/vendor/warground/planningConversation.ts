// @ts-nocheck
const BOARD_VERSION = 'war-ground-blackboard-v1'

function asArray(value) {
  return Array.isArray(value) ? value : []
}

function text(value, fallback = '') {
  const normalized = String(value ?? '').trim()
  return normalized || fallback
}

export function summarizePlanningConversation(board = {}) {
  const entries = asArray(board?.entries)
  const handoffs = asArray(board?.handoffs)
  const summary = board?.summary && typeof board.summary === 'object' ? board.summary : {}
  const readyEntries = entries.filter((entry) => entry?.status === 'ready')
  const heldEntries = entries.filter((entry) => entry?.status !== 'ready')
  return {
    version: text(board?.version, BOARD_VERSION),
    agentCount: Number(summary.agent_count ?? entries.length) || 0,
    readyCount: Number(summary.ready_count ?? readyEntries.length) || 0,
    holdCount: Number(summary.hold_count ?? heldEntries.length) || 0,
    handoffCount: Number(summary.handoff_count ?? handoffs.length) || 0,
    turnBudget: Math.max(1, Math.min(8, Number(board?.turn_budget || 1))),
    moderatorChecks: asArray(board?.moderator_checks).map((item) => text(item)).filter(Boolean),
    speakingOrder: asArray(board?.speaking_order).map((item, index) => ({
      turn: Number(item?.turn || index + 1),
      agentId: text(item?.agent_id),
      status: text(item?.status, 'hold'),
      action: text(item?.assessment_action, 'information_request'),
    })).filter((item) => item.agentId),
    readyEntries: readyEntries.map(normalizeConversationEntry),
    heldEntries: heldEntries.map(normalizeConversationEntry),
    handoffs: handoffs.map((item) => ({
      id: text(item?.handoff_id),
      fromAgentId: text(item?.from_agent_id),
      reasonCode: text(item?.reason_code),
      requestedEvidenceIds: asArray(item?.requested_evidence_ids).map((value) => text(value)).filter(Boolean),
      message: text(item?.message, '근거 연결 후 대화를 재개하세요.'),
    })).filter((item) => item.id),
  }
}

export function normalizeConversationEntry(entry = {}) {
  const prompt = entry?.prompt_contract && typeof entry.prompt_contract === 'object' ? entry.prompt_contract : {}
  return {
    agentId: text(entry?.agent_id),
    label: text(entry?.label, entry?.agent_id || '에이전트'),
    roleCategory: text(entry?.role_category, 'unknown'),
    status: text(entry?.status, 'hold'),
    holdReason: text(entry?.hold_reason),
    action: text(entry?.assessment_action, 'information_request'),
    evidenceIds: asArray(entry?.evidence_ids).map((value) => text(value)).filter(Boolean),
    missingEvidenceIds: asArray(entry?.missing_evidence_ids).map((value) => text(value)).filter(Boolean),
    allowedActions: asArray(entry?.allowed_actions).map((value) => text(value)).filter(Boolean),
    turnBudget: Math.max(1, Math.min(8, Number(entry?.turn_budget || 1))),
    promptContract: {
      id: text(prompt?.contract_id),
      systemPrompt: text(prompt?.system_prompt),
      rules: asArray(prompt?.rules).map((value) => text(value)).filter(Boolean),
      outputRequired: asArray(prompt?.output_schema?.required).map((value) => text(value)).filter(Boolean),
    },
  }
}

export function conversationReliabilityTone(summary = {}) {
  if (!summary.agentCount) return { tone: 'pending', label: '대화 보드 대기' }
  if (summary.holdCount > 0) return { tone: 'caution', label: `${summary.holdCount}명 근거 대기` }
  if (!summary.moderatorChecks?.length) return { tone: 'caution', label: '검토 규칙 없음' }
  return { tone: 'positive', label: '근거 기반 대화 가능' }
}
