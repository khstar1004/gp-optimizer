// @ts-nocheck
const MAX_LIVE_MESSAGE_LENGTH = 600

export function normalizeLiveRehearsalMessage({ text = '', agentId = '' } = {}) {
  const normalizedText = String(text || '').replace(/\s+/g, ' ').trim()
  const normalizedAgentId = String(agentId || '').trim()
  return {
    valid: normalizedText.length > 0 && normalizedText.length <= MAX_LIVE_MESSAGE_LENGTH,
    text: normalizedText.slice(0, MAX_LIVE_MESSAGE_LENGTH),
    agent_id: normalizedAgentId || undefined,
    error: !normalizedText
      ? '대화 명령을 입력하세요.'
      : normalizedText.length > MAX_LIVE_MESSAGE_LENGTH
        ? `대화 명령은 ${MAX_LIVE_MESSAGE_LENGTH}자 이내로 입력하세요.`
        : '',
    maxLength: MAX_LIVE_MESSAGE_LENGTH,
  }
}
