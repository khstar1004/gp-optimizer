// @ts-nocheck
export const INITIAL_SETUP_PRESETS = [
  {
    id: 'quick',
    label: '빠른 초안',
    description: '핵심 참모만 빠르게 구성합니다.',
    maxProfileCount: 60,
    parallelProfileCount: 8,
    useLlmForProfiles: true,
  },
  {
    id: 'standard',
    label: '표준 리허설',
    description: '권장 규모로 균형 있게 구성합니다.',
    maxProfileCount: 120,
    parallelProfileCount: 5,
    useLlmForProfiles: true,
  },
  {
    id: 'detailed',
    label: '정밀 분석',
    description: '더 많은 주체를 포함해 세밀하게 구성합니다.',
    maxProfileCount: 180,
    parallelProfileCount: 3,
    useLlmForProfiles: true,
  },
]

export const INITIAL_SETUP_CUSTOM_ID = 'custom'

export const getInitialSetupPreset = (presetId) => (
  INITIAL_SETUP_PRESETS.find((preset) => preset.id === presetId) || null
)

export const getInitialSetupPresetForCount = (count) => (
  INITIAL_SETUP_PRESETS.find((preset) => preset.maxProfileCount === Number(count)) || null
)

export const getInitialSetupRequest = ({ presetId, maxProfileCount }) => {
  const preset = getInitialSetupPreset(presetId)
  return {
    maxProfileCount: Number(maxProfileCount),
    parallelProfileCount: preset?.parallelProfileCount || 5,
    useLlmForProfiles: preset?.useLlmForProfiles ?? true,
  }
}
