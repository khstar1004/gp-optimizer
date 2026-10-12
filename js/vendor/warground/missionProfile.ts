// @ts-nocheck
export const MISSION_MODE_OPTIONS = [
  {
    value: 'war_ground_rehearsal',
    label: 'WAR GROUND 작전계획 리허설',
    brief: '작전계획, COA, 제약, 참모 판단을 한 그래프로 묶고 AI 참모 편성 후 수행 리허설로 실패경로와 결심조건을 뽑는 실전 흐름',
    focus: '실패경로와 지휘관 결심조건',
    reportTemplate: 'WarGroundDecisionCard',
    channels: {
      primary: '수행 리허설면',
      secondary: '참모 판단면'
    }
  },
  {
    value: 'contingency_response',
    label: '긴급상황 대응 결심',
    brief: '도발, 사고, 급변사태 초기 24~72시간에 어떤 대응 순서와 즉시 지시가 필요한지 정리하는 흐름',
    focus: '초동조치와 상황 안정',
    reportTemplate: 'InspectionReadinessReport',
    channels: {
      primary: '상황 보고면',
      secondary: '지휘 조정면'
    }
  },
  {
    value: 'coa_review',
    label: '대안 비교·경계조정 판단',
    brief: 'COA, 경계태세, 자산 운용안을 비교해 우세안과 취약 가정을 정리하는 기본 흐름',
    focus: '우세안과 취약 가정',
    reportTemplate: 'SafetyLevelAssessmentReport',
    channels: {
      primary: '전장 상황면',
      secondary: '참모 판단면'
    }
  },
  {
    value: 'operation_order',
    label: '단편명령 작성',
    brief: '군 관련 입력자료와 시뮬레이션 신호를 분석보고서로 정리한 뒤 작전명령 5대 항목 단편명령까지 작성하는 흐름',
    focus: '작전명령 5대 항목',
    reportTemplate: 'OperationOrderReport',
    channels: {
      primary: '상황 보고면',
      secondary: '명령 작성면'
    }
  },
  {
    value: 'policy_option_comparison',
    label: '운영평가·후속조치 점검',
    brief: '지시, 점검, 훈련, 후속조치를 일정 기간 기준으로 재분류해 실행 공백과 보완 과제를 정리하는 흐름',
    focus: '이행도와 보완과제',
    reportTemplate: 'ImprovementScenarioReport',
    channels: {
      primary: '운영 이력면',
      secondary: '평가·반응면'
    }
  }
]

export const AUDIENCE_OPTIONS = [
  {
    value: 'chief_of_staff',
    label: '지휘관·지휘부 보고',
    desk: '결심 승인',
    brief: '핵심 권고와 분기점 우선'
  },
  {
    value: 'staff_officer',
    label: '참모부 실무 검토',
    desk: '근거 정리',
    brief: '비교 근거와 실행성 우선'
  },
  {
    value: 'secretariat',
    label: '상급부대·정책 보고',
    desk: '점검·평가',
    brief: '평가 결과와 후속조치 우선'
  }
]

export const CLASSIFICATION_OPTIONS = [
  {
    value: 'internal',
    label: '내부 검토',
    badge: 'INTERNAL',
    brief: '참모 셀 검토용'
  },
  {
    value: 'restricted',
    label: '대내 한정',
    badge: 'RESTRICTED',
    brief: '지휘부·유관부서 한정'
  },
  {
    value: 'secret',
    label: '민감 검토',
    badge: 'SECRET',
    brief: '민감 현안 포함 제한 열람'
  }
]

export const TIME_HORIZON_OPTIONS = [
  { value: '24h', label: '24시간' },
  { value: '72h', label: '72시간' },
  { value: '7d', label: '7일' },
  { value: '6m', label: '6개월' }
]

const modeMap = Object.fromEntries(MISSION_MODE_OPTIONS.map((item) => [item.value, item]))
const audienceMap = Object.fromEntries(AUDIENCE_OPTIONS.map((item) => [item.value, item]))
const classificationMap = Object.fromEntries(CLASSIFICATION_OPTIONS.map((item) => [item.value, item]))
const timeHorizonMap = Object.fromEntries(TIME_HORIZON_OPTIONS.map((item) => [item.value, item]))

const MISSION_MODE_ALIASES = {
  war_ground: 'war_ground_rehearsal',
  'war ground': 'war_ground_rehearsal',
  war_ground_rehearsal: 'war_ground_rehearsal',
  battle_proof_k: 'war_ground_rehearsal',
  battleproofk: 'war_ground_rehearsal',
  'battle proof k': 'war_ground_rehearsal',
  warground: 'war_ground_rehearsal',
  워그라운드: 'war_ground_rehearsal',
  작전계획리허설: 'war_ground_rehearsal',
  integrated: 'contingency_response',
  decision_support: 'coa_review',
  policy_impact: 'policy_option_comparison',
  contingency_response: 'contingency_response',
  coa_review: 'coa_review',
  policy_option_comparison: 'policy_option_comparison',
  operation_order: 'operation_order',
  fragmentary_order: 'operation_order',
  opord: 'operation_order',
  단편명령: 'operation_order'
}

const REPORT_TEMPLATE_ALIASES = {
  WarGroundDecisionCard: 'WarGroundDecisionCard',
  CommanderDecisionCard: 'WarGroundDecisionCard',
  BattleProofDecisionCard: 'WarGroundDecisionCard',
  wargrounddecisioncard: 'WarGroundDecisionCard',
  commanderdecisioncard: 'WarGroundDecisionCard',
  IntegratedExecutiveBrief: 'InspectionReadinessReport',
  CommanderDecisionBrief: 'SafetyLevelAssessmentReport',
  PolicyImpactBrief: 'ImprovementScenarioReport',
  InspectionReadinessReport: 'InspectionReadinessReport',
  SafetyLevelAssessmentReport: 'SafetyLevelAssessmentReport',
  ImprovementScenarioReport: 'ImprovementScenarioReport',
  OperationOrderReport: 'OperationOrderReport',
  J5ContingencyPackage: 'InspectionReadinessReport',
  J5DecisionPackage: 'SafetyLevelAssessmentReport',
  J5PolicyPackage: 'ImprovementScenarioReport',
  J5OperationOrderPackage: 'OperationOrderReport'
}

const REPORT_TEMPLATE_BACKEND_KEYS = {
  WarGroundDecisionCard: 'WarGroundDecisionCard',
  InspectionReadinessReport: 'J5ContingencyPackage',
  SafetyLevelAssessmentReport: 'J5DecisionPackage',
  ImprovementScenarioReport: 'J5PolicyPackage',
  OperationOrderReport: 'J5OperationOrderPackage'
}

export function normalizeMissionMode(value = 'coa_review') {
  const normalized = String(value || '').trim()
  const lower = normalized.toLowerCase()
  return MISSION_MODE_ALIASES[normalized] || MISSION_MODE_ALIASES[lower] || 'war_ground_rehearsal'
}

export function normalizeReportTemplateKey(value = 'SafetyLevelAssessmentReport') {
  const normalized = String(value || '').trim()
  const lower = normalized.toLowerCase()
  return REPORT_TEMPLATE_ALIASES[normalized] || REPORT_TEMPLATE_ALIASES[lower] || 'WarGroundDecisionCard'
}

export function getBackendReportTemplateKey(value = 'SafetyLevelAssessmentReport') {
  const normalized = normalizeReportTemplateKey(value)
  return REPORT_TEMPLATE_BACKEND_KEYS[normalized] || REPORT_TEMPLATE_BACKEND_KEYS.WarGroundDecisionCard
}

export function getMissionModeMeta(value = 'coa_review') {
  const normalized = normalizeMissionMode(value)
  return modeMap[normalized] || modeMap.coa_review
}

export function getMissionChannelMeta(value = 'coa_review') {
  return getMissionModeMeta(value).channels
}

export function getAudienceMeta(value = 'chief_of_staff') {
  return audienceMap[value] || audienceMap.chief_of_staff
}

export function getAudienceLabel(value = 'chief_of_staff') {
  return getAudienceMeta(value).label
}

export function getClassificationMeta(value = 'internal') {
  return classificationMap[value] || classificationMap.internal
}

export function getClassificationLabel(value = 'internal') {
  return getClassificationMeta(value).label
}

export function getTimeHorizonLabel(value = '72h') {
  return timeHorizonMap[value]?.label || timeHorizonMap['72h'].label
}

export function getReportTemplateLabel(value = 'SafetyLevelAssessmentReport') {
  const normalized = normalizeReportTemplateKey(value)
  const labels = {
    WarGroundDecisionCard: '지휘관 결심카드',
    SafetyLevelAssessmentReport: '대안 비교 판단보고서',
    ImprovementScenarioReport: '운영평가 및 후속조치 보고서',
    InspectionReadinessReport: '위기대응 판단보고서',
    OperationOrderReport: '다영역 통합작전 판단보고서'
  }
  return labels[normalized] || labels.WarGroundDecisionCard
}

export function getEnvironmentPhaseLabels() {
  return [
    '작전 기준선',
    'AI 참모 편성',
    '리허설 규칙 설계',
    '초기 상황 주입',
    '실행 승인'
  ]
}

export function getEnvironmentHeadline(phase = 0) {
  const headlines = {
    0: '작전계획, COA, 제약, 자산, 지휘 의도를 하나의 리허설 기준선으로 묶는 단계입니다.',
    1: '작전·정보·군수·통신·민사 등 AI 참모와 예하부대 역할을 편성하고 있습니다.',
    2: '시간축, 적 반응, 제약, 실패 트리거, 결심 조건을 반영할 리허설 규칙을 설계하고 있습니다.',
    3: '초기 상황, 핵심 질문, 확인 요구, 위험 징후를 배치해 리허설 출발점을 정렬하고 있습니다.',
    4: '준비가 끝났습니다. 실행 강도와 라운드 수를 검토한 뒤 작전 리허설로 이동할 수 있습니다.'
  }
  return headlines[phase] || headlines[0]
}

export function buildEnvironmentSummaryCards({
  phase = 0,
  phaseLabels = getEnvironmentPhaseLabels(),
  profileCount = 0,
  expectedTotal = null,
  totalHours = null,
  minutesPerRound = null,
  initialPostsCount = 0,
  hotTopicsCount = 0
} = {}) {
  return [
    {
      label: '데이터 준비',
      value: phaseLabels[phase] || phaseLabels[0],
      note: phase >= 4 ? '실행 승인 가능' : '시뮬레이션 준비 진행 중'
    },
    {
      label: '가상 행위자',
      value: profileCount > 0 ? `${profileCount}명` : '대기',
      note: expectedTotal ? `예상 총원 ${expectedTotal}명` : '지식 그래프 기반 선별'
    },
    {
      label: '예측 시간축',
      value: totalHours ? `${totalHours}시간` : '설계 중',
      note: minutesPerRound ? `라운드당 ${minutesPerRound}분` : '운용 시간축 생성 대기'
    },
    {
      label: '초기 사건',
      value: initialPostsCount ? `${initialPostsCount}건` : '준비 중',
      note: hotTopicsCount ? `핵심 의제 ${hotTopicsCount}개` : '핫토픽 정렬 대기'
    }
  ]
}

export function buildEnvironmentChannelCards({
  primaryLabel = '상황 보고면',
  secondaryLabel = '참모 판단면'
} = {}) {
  return [
    {
      label: '1차 관찰면',
      value: primaryLabel,
      note: '상황 보고, 경보, 즉시 반응이 먼저 드러나는 면입니다.'
    },
    {
      label: '2차 관찰면',
      value: secondaryLabel,
      note: '승인, 조정, 평가, 메시지 관리 관점의 지연과 파장을 확인하는 면입니다.'
    }
  ]
}

export function getReadinessPercent(phase = 0) {
  return Math.round((Math.min(Math.max(phase, 0), 4) / 4) * 100)
}

export function getReadinessHeadline(phase = 0) {
  if (phase >= 4) return '시뮬레이션 실행 기준 충족'
  if (phase >= 2) return '시뮬레이션 규칙 검토 중'
  if (phase >= 1) return '이해관계자 모델링 진행 중'
  return '세션 기준선 정렬 중'
}

export function getReadinessNarrative(phase = 0) {
  if (phase >= 4) {
    return '세션, 행위자, 시간축, 초기 사건이 모두 정렬되었습니다. 실행 강도와 라운드 수를 마지막으로 확인한 뒤 승인할 수 있습니다.'
  }
  if (phase >= 2) {
    return '핵심 질문을 뒷받침할 시간축과 상호작용 규칙이 설계되고 있습니다. 실행 전 현재 병목, 누락 근거, 조정 필요사항을 먼저 확인합니다.'
  }
  if (phase >= 1) {
    return '핵심 이해관계자와 주변 영향 주체를 모델링해 결심 시뮬레이션의 관찰면을 세우는 단계입니다.'
  }
  return '근거 입력, 그래프, 시뮬레이션 세션을 하나의 기준선으로 묶어 이후 예측 오차를 줄입니다.'
}

export function buildReadinessCards({
  phase = 0,
  phaseLabels = getEnvironmentPhaseLabels(),
  readinessPercent = getReadinessPercent(phase),
  simulationId = '',
  profileCount = 0,
  expectedTotal = null,
  hasSimulationConfig = false
} = {}) {
  return [
    {
      label: '준비 진척',
      value: `${readinessPercent}%`,
      note: phase >= 4 ? '실행 승인 대기' : `${phaseLabels[phase] || phaseLabels[0]} 진행`
    },
    {
      label: '세션 기준',
      value: simulationId ? '고정 완료' : '정렬 중',
      note: simulationId ? `세션 ${simulationId}` : '프로젝트/그래프/세션 묶음 생성 전'
    },
    {
      label: '행위자 총원',
      value: profileCount > 0 ? `${profileCount}/${expectedTotal || '?'}` : '집계 중',
      note: profileCount > 0 ? '행위자 프로필 수집 완료분' : '실시간 모델링 대기'
    },
    {
      label: '실행 조건',
      value: hasSimulationConfig ? '검토 가능' : '초안 생성 중',
      note: hasSimulationConfig ? '시간축·초기 사건·상호작용 규칙 확인' : '시뮬레이션 초안 생성 대기'
    }
  ]
}

export function buildReadinessChecklist({
  phase = 0,
  simulationId = '',
  profileCount = 0,
  expectedTotal = null,
  hasSimulationConfig = false
} = {}) {
  return [
    {
      code: 'G1',
      label: '세션 기준선',
      note: '프로젝트 ID, 그래프 ID, 시뮬레이션 세션이 서로 맞물려야 합니다.',
      done: !!simulationId,
      current: phase === 0,
      status: simulationId ? '정렬 완료' : '정렬 중'
    },
    {
      code: 'G2',
      label: '행위자 모델링',
      note: '핵심 이해관계자와 주변 영향 주체가 최소한의 대표성을 확보해야 합니다.',
      done: phase > 1 || (expectedTotal && profileCount >= expectedTotal),
      current: phase === 1,
      status: profileCount > 0 ? `${profileCount}명 확보` : '모델링 대기'
    },
    {
      code: 'G3',
      label: '시뮬레이션 규칙',
      note: '라운드, 활동 시간대, 관찰면 규칙이 예측 질문에 맞게 고정되어야 합니다.',
      done: hasSimulationConfig,
      current: phase === 2 || phase === 3,
      status: hasSimulationConfig ? '검토 가능' : '설계 중'
    },
    {
      code: 'G4',
      label: '실행 승인',
      note: '초기 사건과 유도 방향을 확인한 뒤 수행 리허설로 넘깁니다.',
      done: phase >= 4,
      current: phase >= 4,
      status: phase >= 4 ? '승인 가능' : '대기'
    }
  ]
}

export function buildTimelineChannelFilters({
  totalCount = 0,
  primaryLabel = '전장 상황면',
  primaryCount = 0,
  secondaryLabel = '참모 판단면',
  secondaryCount = 0
} = {}) {
  return [
    { id: 'all', label: '전체', count: totalCount },
    { id: 'twitter', label: primaryLabel, count: primaryCount },
    { id: 'reddit', label: secondaryLabel, count: secondaryCount }
  ]
}

export function buildActionTypeFilters(actionTypeCounts = new Map(), getActionTypeLabel = (value) => value, totalCount = 0, limit = 5) {
  const topTypes = [...actionTypeCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([id, count]) => ({
      id,
      label: getActionTypeLabel(id),
      count
    }))

  return [
    { id: 'all', label: '전체 행동', count: totalCount },
    ...topTypes
  ]
}

export function getMissionReportActionLabel(missionMode) {
  const normalizedMissionMode = normalizeMissionMode(missionMode)
  if (normalizedMissionMode === 'war_ground_rehearsal') return '이 결과로 지휘관 결심카드 작성'
  if (normalizedMissionMode === 'coa_review') return '이 결과로 대안 비교·경계판단 패키지 작성'
  if (normalizedMissionMode === 'operation_order') return '이 결과로 분석보고서와 단편명령 작성'
  if (normalizedMissionMode === 'policy_option_comparison') return '이 결과로 운영평가·후속조치 패키지 작성'
  return '이 결과로 긴급상황 대응 패키지 작성'
}

export function getScenarioOperationHeadline(phase = 0, actionCount = 0) {
  if (phase === 2) {
    return '리허설이 종료되었습니다. 실패경로, 분기 조건, 보완 지시를 검토한 뒤 결심카드 작성으로 넘어갈 수 있습니다.'
  }
  if (actionCount === 0) {
    return '초기 리허설 이벤트를 생성하는 중입니다. 첫 상황보고와 참모 판단 패턴이 쌓일 때까지 기다립니다.'
  }
  return '수행 리허설면과 참모 판단면의 상호작용을 동시에 추적하며 실패경로와 결심 분기점을 읽는 단계입니다.'
}

export function buildScenarioOperationCards({
  currentRound = 0,
  totalRounds = '-',
  phase = 0,
  dominantPlatform = '관찰 중',
  primaryCount = 0,
  secondaryCount = 0,
  mostActiveAgent = '집계 중',
  actionCount = 0,
  missionBrief = ''
} = {}) {
  return [
    {
      label: '현재 라운드',
      value: `${currentRound || 0}/${totalRounds}회`,
      note: phase === 2 ? '시뮬레이션 종료' : '실시간 진행 중'
    },
    {
      label: '우세 관찰면',
      value: dominantPlatform,
      note: `${primaryCount} / ${secondaryCount}건 관측`
    },
    {
      label: '핵심 이해관계자',
      value: mostActiveAgent,
      note: actionCount > 0 ? '최근 분기점에 크게 관여한 주체입니다.' : '행동 집계 대기'
    },
    {
      label: '누적 사건',
      value: `${actionCount}건`,
      note: missionBrief
    }
  ]
}

export function buildScenarioSummaryCards({
  currentRound = 0,
  totalRounds = '-',
  dominantPlatform = '관찰 중',
  mostActiveAgent = '집계 중',
  actionCount = 0
} = {}) {
  return [
    {
      label: '현재 진행',
      value: `${currentRound || 0}/${totalRounds}회`
    },
    {
      label: '우세 관찰면',
      value: dominantPlatform
    },
    {
      label: '가장 많이 움직인 행위자',
      value: mostActiveAgent
    },
    {
      label: '누적 사건',
      value: `${actionCount}건`
    }
  ]
}

export function buildTimelineFocusTitle({
  channelFilter = 'all',
  typeFilter = 'all',
  primaryLabel = '전장 상황면',
  secondaryLabel = '참모 판단면',
  getActionTypeLabel = (value) => value
} = {}) {
  const channelLabel = channelFilter === 'all'
    ? '전체 관찰면'
    : channelFilter === 'twitter'
      ? primaryLabel
      : secondaryLabel

  const actionLabel = typeFilter === 'all'
    ? '전체 행동'
    : getActionTypeLabel(typeFilter)

  return `${channelLabel} · ${actionLabel}`
}

export function buildTimelineFocusNote({
  filteredCount = 0,
  latestAction = null,
  getActionTypeLabel = (value) => value
} = {}) {
  if (filteredCount === 0) {
    return '선택한 조건과 일치하는 운영 이벤트가 없습니다. 필터를 풀면 전체 흐름으로 복귀합니다.'
  }

  const actor = latestAction?.agent_name || `행위자 ${latestAction?.agent_id ?? '-'}`
  return `${filteredCount}건의 운영 이벤트가 표시됩니다. 최근 표본은 ${actor}의 ${getActionTypeLabel(latestAction?.action_type)}입니다.`
}

export function buildLatestNarrative({
  latestAction = null,
  getActionTypeLabel = (value) => value,
  truncateContent = (value) => value
} = {}) {
  if (!latestAction) {
    return '첫 운영 이벤트를 생성하는 중입니다. 신호가 쌓이면 어떤 판단 서사가 우세한지 여기서 바로 확인할 수 있습니다.'
  }

  const actor = latestAction.agent_name || `행위자 ${latestAction.agent_id ?? '-'}`
  const actionLabel = getActionTypeLabel(latestAction.action_type)
  const content = latestAction.action_args?.content
    || latestAction.action_args?.quote_content
    || latestAction.action_args?.query
    || latestAction.action_args?.post_content

  if (content) {
    return `${actor}가 ${actionLabel} 이벤트를 남겼습니다. 최근 내용: ${truncateContent(content, 90)}`
  }

  return `${actor}가 ${actionLabel} 이벤트를 남겼습니다. 현재 행동 흐름과 누적 반응을 계속 관찰하는 중입니다.`
}

export function getScenarioDecisionHint(phase = 0, actionCount = 0) {
  if (phase === 2) {
    return '주요 실패경로가 충분히 드러났습니다. 지금 결과로 결심카드를 작성하거나 가정을 바꿔 다시 리허설할 수 있습니다.'
  }
  if (actionCount < 10) {
    return '아직 초기 리허설 수집 구간입니다. 첫 패턴이 안정될 때까지 조금 더 관찰하는 편이 좋습니다.'
  }
  return '관찰면별 반응 차이와 핵심 행위자 움직임이 누적되고 있습니다. 결심 조건이 드러나면 결심카드 작성으로 넘어가도 됩니다.'
}

export const VERIFICATION_SURVEY_PROMPTS = [
  '리포트 결론을 가장 크게 뒤집을 수 있는 변수는 무엇인가요?',
  '보고 대상이 추가로 확인해야 할 빠진 근거는 무엇입니까?',
  '정상 이행 항목과 지연 항목을 가른 기준은 무엇입니까?'
]

export function getVerificationRecommendedPrompts({
  chatTarget = 'report_agent',
  selectedAgentName = '이 주체'
} = {}) {
  if (chatTarget === 'report_agent') {
    return [
      '이 결론을 뒤집을 수 있는 가장 강한 반례는 무엇인가?',
      '어떤 활동이나 지시가 실제 평가를 갈랐는가?',
      '정상 이행과 지연을 나눈 기준을 근거 중심으로 설명해줘.',
      '다음 보완 우선순위를 다시 정렬해줘.'
    ]
  }

  return [
    `${selectedAgentName}는 왜 이런 판단을 했나?`,
    `${selectedAgentName}가 가장 민감하게 반응한 쟁점은 무엇인가?`,
    `${selectedAgentName}가 판단을 바꿀 가능성이 있는 조건은 무엇인가?`,
    `${selectedAgentName}의 다음 반응을 예측해줘.`
  ]
}

export function getVerificationHeadline({
  activeTab = 'chat',
  chatTarget = 'report_agent',
  selectedAgentName = ''
} = {}) {
  if (activeTab === 'survey') {
    return '집단 질의로 리포트 결론의 수용성과 실행 저항 요인을 동시에 점검하는 구간입니다.'
  }
  if (chatTarget === 'agent' && selectedAgentName) {
    return `${selectedAgentName} 면담을 통해 리포트 결론과 실제 인식 사이의 간극을 확인합니다.`
  }
  return '리포트 결론의 취약 가정, 반례, 추가 근거를 빠르게 교차 점검하는 검증 구간입니다.'
}

export function buildVerificationCards({
  activeTab = 'chat',
  chatTarget = 'report_agent',
  profileCount = 0,
  selectedAgentName = '',
  surveyResultCount = 0,
  surveyQuestion = '',
  classificationLabel = '내부 검토',
  reportTagLabel = ''
} = {}) {
  return [
    {
      label: '검증 모드',
      value: activeTab === 'survey' ? '집단 질의' : chatTarget === 'agent' ? '역할 면담' : '결심카드 검증',
      note: activeTab === 'survey' ? '동시 질의 기준' : '대화형 검증 기준'
    },
    {
      label: '면담 가능 역할',
      value: `${profileCount}명`,
      note: selectedAgentName ? `선택 대상 ${selectedAgentName}` : '대상 선택 가능'
    },
    {
      label: '회수 의견',
      value: `${surveyResultCount}건`,
      note: surveyQuestion ? '가장 최근 질의 기준' : '집단 질의 미실행'
    },
    {
      label: '검토 등급',
      value: classificationLabel || '내부 검토',
      note: reportTagLabel
    }
  ]
}

export function getVerificationCommandTitle({
  activeTab = 'chat',
  chatTarget = 'report_agent',
  selectedAgentName = ''
} = {}) {
  if (activeTab === 'survey') return '집단 질의 동시 검증'
  if (chatTarget === 'agent' && selectedAgentName) return `${selectedAgentName} 면담 검증`
  return '리포트 반례 검증'
}

export function getVerificationCommandNote({
  activeTab = 'chat',
  chatTarget = 'report_agent',
  selectedAgentName = ''
} = {}) {
  if (activeTab === 'survey') {
    return '여러 행위자의 응답을 한 번에 비교해 리포트 결론의 수용성, 실행 저항 요인, 조치 수정 필요성을 파악합니다.'
  }
  if (chatTarget === 'agent' && selectedAgentName) {
    return `${selectedAgentName}의 실제 관점과 감정선을 점검해 리포트의 취약 가정이 무엇인지 확인합니다.`
  }
  return '반례, 보강 근거, 우선 대응 순서를 빠르게 캐내는 검증 질의 모드입니다.'
}

export function buildVerificationCommandCards({
  activeTab = 'chat',
  commandTitle = '리포트 반례 검증',
  selectedAgentsCount = 0,
  selectedAgentName = '',
  selectedAgentProfession = '',
  surveyPromptCount = 0,
  recommendedPromptCount = 0,
  surveyResultCount = 0,
  assistantResponseCount = 0
} = {}) {
  return [
    {
      label: '활성 모드',
      value: commandTitle,
      note: activeTab === 'survey' ? '동시 회수 기반 비교' : '대화형 검증'
    },
    {
      label: '선택 대상',
      value: activeTab === 'survey'
        ? `${selectedAgentsCount || 0}명`
        : selectedAgentName || '리포트 셀',
      note: activeTab === 'survey'
        ? '질의 대상 동시 선택'
        : selectedAgentProfession || '결론 검증 중심'
    },
    {
      label: '질문 큐',
      value: activeTab === 'survey'
        ? `${surveyPromptCount}개`
        : `${recommendedPromptCount}개`,
      note: activeTab === 'survey' ? '사전 질의 프리셋' : '즉시 투입 질문'
    },
    {
      label: '회수 상태',
      value: activeTab === 'survey'
        ? `${surveyResultCount}건`
        : `${assistantResponseCount}건`,
      note: activeTab === 'survey' ? '집단 응답 누적' : '대화 응답 누적'
    }
  ]
}

export function buildVerificationRules({
  activeTab = 'chat',
  chatTarget = 'report_agent',
  surveyResultCount = 0
} = {}) {
  return [
    {
      title: '반례 우선',
      note: chatTarget === 'report_agent'
        ? '현재 결론을 뒤집을 수 있는 가장 강한 사례부터 확인합니다.'
        : '선택 행위자가 결론과 어긋나는 지점을 먼저 묻습니다.'
    },
    {
      title: '누락 근거 점검',
      note: activeTab === 'survey'
        ? '응답 편차가 큰 질문은 리포트의 취약 가정으로 간주합니다.'
        : '입장, 이해관계, 반응 계기와 빠진 근거를 분리해 질문합니다.'
    },
    {
      title: '보강 지시',
      note: surveyResultCount > 0
        ? '회수된 응답을 근거 보강 또는 개선 우선순위 수정으로 연결합니다.'
        : '검증 후 바로 리포트 수정을 위한 보강 포인트를 남깁니다.'
    }
  ]
}

export function getReportExecutiveTitle(reportTemplate) {
  const normalizedTemplate = normalizeReportTemplateKey(reportTemplate)
  if (normalizedTemplate === 'WarGroundDecisionCard') return '지휘관 결심카드'
  if (normalizedTemplate === 'SafetyLevelAssessmentReport') return '대안 비교 판단보고서'
  if (normalizedTemplate === 'OperationOrderReport') return '다영역 통합작전 판단보고서'
  if (normalizedTemplate === 'ImprovementScenarioReport') return '운영평가 및 후속조치 보고서'
  return '위기대응 판단보고서'
}

export function getComparisonAxisScore(option, axisId) {
  return option?.axis_scores?.[axisId]?.score ?? '-'
}

export function getComparisonAxisSummary(option, axisId) {
  return option?.axis_scores?.[axisId]?.summary || '근거 요약 없음'
}

export function getComparisonScoreClass(score) {
  const numeric = Number(score)
  if (numeric >= 5) return 'is-excellent'
  if (numeric >= 4) return 'is-good'
  if (numeric <= 2) return 'is-poor'
  return 'is-neutral'
}

export function getComparisonDeltaClass(delta) {
  const numeric = Number(delta || 0)
  if (numeric > 0) return 'is-up'
  if (numeric < 0) return 'is-down'
  return 'is-flat'
}

export function formatComparisonDelta(delta) {
  const numeric = Number(delta || 0)
  if (numeric > 0) return `+${numeric}`
  return `${numeric}`
}

export function getSensitivityTypeLabel(type) {
  if (type === 'success_metric') return '평가 기준'
  if (type === 'constraint') return '제약'
  if (type === 'assumption') return '가정'
  return '조건 변화'
}

export const REPORT_TOOL_CONFIG = {
  insight_forge: {
    name: '결심 인사이트 분석',
    color: 'purple',
    icon: 'lightbulb'
  },
  panorama_search: {
    name: '상황 지형 탐색',
    color: 'blue',
    icon: 'globe'
  },
  interview_agents: {
    name: '역할 면담',
    color: 'green',
    icon: 'users'
  },
  quick_search: {
    name: '즉시 사실 조회',
    color: 'orange',
    icon: 'zap'
  },
  get_graph_statistics: {
    name: '그래프 통계',
    color: 'cyan',
    icon: 'chart'
  },
  get_entities_by_type: {
    name: '엔티티 조회',
    color: 'pink',
    icon: 'database'
  }
}

export function getReportToolDisplayName(toolName) {
  return REPORT_TOOL_CONFIG[toolName]?.name || toolName
}

export function getReportToolColor(toolName) {
  return REPORT_TOOL_CONFIG[toolName]?.color || 'gray'
}

export function getReportToolIcon(toolName) {
  return REPORT_TOOL_CONFIG[toolName]?.icon || 'tool'
}

function toNumber(value, fallback = 0) {
  const parsed = Number.parseInt(value, 10)
  return Number.isFinite(parsed) ? parsed : fallback
}

function parseNumberedItems(text = '') {
  return text
    .split('\n')
    .filter((line) => /^\d+\./.test(line))
    .map((line) => line.replace(/^\d+\.\s*/, '').replace(/^"|"$/g, '').trim())
    .filter(Boolean)
}

function parseBulletItems(text = '') {
  return text
    .split('\n')
    .filter((line) => line.trim().startsWith('-'))
}

export function parseInsightForgeResult(text = '') {
  const result = {
    query: '',
    simulationRequirement: '',
    stats: { facts: 0, entities: 0, relationships: 0 },
    subQueries: [],
    facts: [],
    entities: [],
    relations: []
  }

  try {
    const queryMatch = text.match(/분석질문:\s*(.+?)(?:\n|$)/)
    if (queryMatch) result.query = queryMatch[1].trim()

    const reqMatch = text.match(/예측 시나리오:\s*(.+?)(?:\n|$)/)
    if (reqMatch) result.simulationRequirement = reqMatch[1].trim()

    const factMatch = text.match(/관련 예측 사실:\s*(\d+)/)
    const entityMatch = text.match(/관련 엔티티:\s*(\d+)/)
    const relMatch = text.match(/관계 체인:\s*(\d+)/)
    if (factMatch) result.stats.facts = toNumber(factMatch[1])
    if (entityMatch) result.stats.entities = toNumber(entityMatch[1])
    if (relMatch) result.stats.relationships = toNumber(relMatch[1])

    const subQSection = text.match(/### 분석 하위 질문\n([\s\S]*?)(?=\n###|$)/)
    if (subQSection) {
      result.subQueries = parseNumberedItems(subQSection[1])
    }

    const factsSection = text.match(/### 【핵심사실】[\s\S]*?\n([\s\S]*?)(?=\n###|$)/)
    if (factsSection) {
      result.facts = parseNumberedItems(factsSection[1]).map((line) => line.replace(/^"|"$/g, '').trim())
    }

    const entitySection = text.match(/### 【핵심 엔티티】\n([\s\S]*?)(?=\n###|$)/)
    if (entitySection) {
      const entityBlocks = entitySection[1]
        .split(/\n(?=- \*\*)/)
        .filter((block) => block.trim().startsWith('- **'))

      result.entities = entityBlocks.map((block) => {
        const nameMatch = block.match(/^-\s*\*\*(.+?)\*\*\s*\((.+?)\)/)
        const summaryMatch = block.match(/요약:\s*"?(.+?)"?(?:\n|$)/)
        const relatedMatch = block.match(/관련 사실:\s*(\d+)/)
        return {
          name: nameMatch ? nameMatch[1].trim() : '',
          type: nameMatch ? nameMatch[2].trim() : '',
          summary: summaryMatch ? summaryMatch[1].trim() : '',
          relatedFactsCount: relatedMatch ? toNumber(relatedMatch[1]) : 0
        }
      }).filter((entity) => entity.name)
    }

    const relSection = text.match(/### 【관계 체인】\n([\s\S]*?)(?=\n###|$)/)
    if (relSection) {
      result.relations = parseBulletItems(relSection[1]).map((line) => {
        const match = line.match(/^-\s*(.+?)\s*--\[(.+?)\]-->\s*(.+)$/)
        if (!match) return null
        return {
          source: match[1].trim(),
          relation: match[2].trim(),
          target: match[3].trim()
        }
      }).filter(Boolean)
    }
  } catch (error) {
    console.warn('Parse insight_forge failed:', error)
  }

  return result
}

export function parsePanoramaResult(text = '') {
  const result = {
    query: '',
    stats: { nodes: 0, edges: 0, activeFacts: 0, historicalFacts: 0 },
    activeFacts: [],
    historicalFacts: [],
    entities: []
  }

  try {
    const queryMatch = text.match(/조회:\s*(.+?)(?:\n|$)/)
    if (queryMatch) result.query = queryMatch[1].trim()

    const nodesMatch = text.match(/총 노드 수:\s*(\d+)/)
    const edgesMatch = text.match(/총 엣지 수:\s*(\d+)/)
    const activeMatch = text.match(/현재 유효 사실:\s*(\d+)/)
    const histMatch = text.match(/이력\/만료 사실:\s*(\d+)/)
    if (nodesMatch) result.stats.nodes = toNumber(nodesMatch[1])
    if (edgesMatch) result.stats.edges = toNumber(edgesMatch[1])
    if (activeMatch) result.stats.activeFacts = toNumber(activeMatch[1])
    if (histMatch) result.stats.historicalFacts = toNumber(histMatch[1])

    const activeSection = text.match(/### 【현재 유효 사실】[\s\S]*?\n([\s\S]*?)(?=\n###|$)/)
    if (activeSection) {
      result.activeFacts = parseNumberedItems(activeSection[1])
    }

    const histSection = text.match(/### 【이력\/만료 사실】[\s\S]*?\n([\s\S]*?)(?=\n###|$)/)
    if (histSection) {
      result.historicalFacts = parseNumberedItems(histSection[1])
    }

    const entitySection = text.match(/### 【관련 엔티티】\n([\s\S]*?)(?=\n###|$)/)
    if (entitySection) {
      result.entities = parseBulletItems(entitySection[1]).map((line) => {
        const match = line.match(/^-\s*\*\*(.+?)\*\*\s*\((.+?)\)/)
        if (!match) return null
        return {
          name: match[1].trim(),
          type: match[2].trim()
        }
      }).filter(Boolean)
    }
  } catch (error) {
    console.warn('Parse panorama failed:', error)
  }

  return result
}

function parseInterviewSelectionReasons(reasonText = '') {
  const reasons = {}
  if (!reasonText) return reasons

  const lines = reasonText.split(/\n+/)
  let currentName = null
  let currentReason = []

  for (const line of lines) {
    let headerMatch = null
    let name = null
    let reasonStart = null

    headerMatch = line.match(/^\d+\.\s*\*\*([^*（(]+)(?:[（(]index\s*=?\s*\d+[)）])?\*\*[：:]\s*(.*)/)
    if (headerMatch) {
      name = headerMatch[1].trim()
      reasonStart = headerMatch[2]
    }

    if (!headerMatch) {
      headerMatch = line.match(/^-\s*선택([^（(]+)(?:[（(]index\s*=?\s*\d+[)）])?[：:]\s*(.*)/)
      if (headerMatch) {
        name = headerMatch[1].trim()
        reasonStart = headerMatch[2]
      }
    }

    if (!headerMatch) {
      headerMatch = line.match(/^-\s*\*\*([^*（(]+)(?:[（(]index\s*=?\s*\d+[)）])?\*\*[：:]\s*(.*)/)
      if (headerMatch) {
        name = headerMatch[1].trim()
        reasonStart = headerMatch[2]
      }
    }

    if (name) {
      if (currentName && currentReason.length > 0) {
        reasons[currentName] = currentReason.join(' ').trim()
      }
      currentName = name
      currentReason = reasonStart ? [reasonStart.trim()] : []
    } else if (currentName && line.trim() && !/^미선택|^종합하면|^최종선택/.test(line)) {
      currentReason.push(line.trim())
    }
  }

  if (currentName && currentReason.length > 0) {
    reasons[currentName] = currentReason.join(' ').trim()
  }

  return reasons
}

export function parseInterviewResult(text = '') {
  const result = {
    topic: '',
    agentCount: '',
    successCount: 0,
    totalCount: 0,
    selectionReason: '',
    interviews: [],
    summary: ''
  }

  try {
    const topicMatch = text.match(/\*\*인터뷰주제:\*\*\s*(.+?)(?:\n|$)/)
    if (topicMatch) result.topic = topicMatch[1].trim()

    const countMatch = text.match(/\*\*인터뷰 인원 수:\*\*\s*(\d+)\s*\/\s*(\d+)/)
    if (countMatch) {
      result.successCount = toNumber(countMatch[1])
      result.totalCount = toNumber(countMatch[2])
      result.agentCount = `${countMatch[1]} / ${countMatch[2]}`
    }

    const reasonMatch = text.match(/### 인터뷰 대상 선택 이유\n([\s\S]*?)(?=\n---\n|\n### 인터뷰 실록)/)
    if (reasonMatch) {
      result.selectionReason = reasonMatch[1].trim()
    }

    const individualReasons = parseInterviewSelectionReasons(result.selectionReason)
    const interviewBlocks = text.split(/#### 인터뷰 #\d+:/).slice(1)

    interviewBlocks.forEach((block, index) => {
      const interview = {
        num: index + 1,
        title: '',
        name: '',
        role: '',
        bio: '',
        selectionReason: '',
        questions: [],
        twitterAnswer: '',
        redditAnswer: '',
        quotes: []
      }

      const titleMatch = block.match(/^(.+?)\n/)
      if (titleMatch) interview.title = titleMatch[1].trim()

      const nameRoleMatch = block.match(/\*\*(.+?)\*\*\s*\((.+?)\)/)
      if (nameRoleMatch) {
        interview.name = nameRoleMatch[1].trim()
        interview.role = nameRoleMatch[2].trim()
        interview.selectionReason = individualReasons[interview.name] || ''
      }

      const bioMatch = block.match(/_소개:\s*([\s\S]*?)_\n/)
      if (bioMatch) {
        interview.bio = bioMatch[1].trim().replace(/\.\.\.$/, '...')
      }

      const qMatch = block.match(/\*\*Q:\*\*\s*([\s\S]*?)(?=\n\n\*\*A:\*\*|\*\*A:\*\*)/)
      if (qMatch) {
        const questionText = qMatch[1].trim()
        const questions = questionText.split(/\n\d+\.\s+/).filter((question) => question.trim())
        if (questions.length > 0) {
          const firstQuestion = questionText.match(/^1\.\s+(.+)/)
          if (firstQuestion) {
            interview.questions = [firstQuestion[1].trim(), ...questions.slice(1).map((question) => question.trim())]
          } else {
            interview.questions = questions.map((question) => question.trim())
          }
        }
      }

      const answerMatch = block.match(/\*\*A:\*\*\s*([\s\S]*?)(?=\*\*핵심 인용문|$)/)
      if (answerMatch) {
        const answerText = answerMatch[1].trim()
        const twitterMatch = answerText.match(/【Twitter플랫폼응답】\n?([\s\S]*?)(?=【Reddit플랫폼응답】|$)/)
        const redditMatch = answerText.match(/【Reddit플랫폼응답】\n?([\s\S]*?)$/)

        if (twitterMatch) {
          interview.twitterAnswer = twitterMatch[1].trim()
        }
        if (redditMatch) {
          interview.redditAnswer = redditMatch[1].trim()
        }

        if (!twitterMatch && redditMatch) {
          if (interview.redditAnswer && interview.redditAnswer !== '(해당 플랫폼의 응답 없음)') {
            interview.twitterAnswer = interview.redditAnswer
          }
        } else if (twitterMatch && !redditMatch) {
          if (interview.twitterAnswer && interview.twitterAnswer !== '(해당 플랫폼의 응답 없음)') {
            interview.redditAnswer = interview.twitterAnswer
          }
        } else if (!twitterMatch && !redditMatch) {
          interview.twitterAnswer = answerText
        }
      }

      const quotesMatch = block.match(/\*\*핵심 인용문:\*\*\n([\s\S]*?)(?=\n---|\n####|$)/)
      if (quotesMatch) {
        const quotesText = quotesMatch[1]
        let quoteMatches = quotesText.match(/> "([^"]+)"/g)
        if (!quoteMatches) {
          quoteMatches = quotesText.match(/> [\u201C""]([^\u201D""]+)[\u201D""]/g)
        }
        if (quoteMatches) {
          interview.quotes = quoteMatches
            .map((quote) => quote.replace(/^> [\u201C""]|[\u201D""]$/g, '').trim())
            .filter(Boolean)
        }
      }

      if (interview.name || interview.title) {
        result.interviews.push(interview)
      }
    })

    const summaryMatch = text.match(/### 인터뷰 요약 및 핵심 관점\n([\s\S]*?)$/)
    if (summaryMatch) {
      result.summary = summaryMatch[1].trim()
    }
  } catch (error) {
    console.warn('Parse interview failed:', error)
  }

  return result
}

export function parseQuickSearchResult(text = '') {
  const result = {
    query: '',
    count: 0,
    facts: [],
    edges: [],
    nodes: []
  }

  try {
    const queryMatch = text.match(/검색조회:\s*(.+?)(?:\n|$)/)
    if (queryMatch) result.query = queryMatch[1].trim()

    const countMatch = text.match(/찾은\s*(\d+)\s*개/)
    if (countMatch) result.count = toNumber(countMatch[1])

    const factsSection = text.match(/### 관련 사실:\n([\s\S]*)$/)
    if (factsSection) {
      result.facts = parseNumberedItems(factsSection[1])
    }

    const edgesSection = text.match(/### 관련 엣지:\n([\s\S]*?)(?=\n###|$)/)
    if (edgesSection) {
      result.edges = parseBulletItems(edgesSection[1]).map((line) => {
        const match = line.match(/^-\s*(.+?)\s*--\[(.+?)\]-->\s*(.+)$/)
        if (!match) return null
        return {
          source: match[1].trim(),
          relation: match[2].trim(),
          target: match[3].trim()
        }
      }).filter(Boolean)
    }

    const nodesSection = text.match(/### 관련 노드:\n([\s\S]*?)(?=\n###|$)/)
    if (nodesSection) {
      result.nodes = parseBulletItems(nodesSection[1]).map((line) => {
        const match = line.match(/^-\s*\*\*(.+?)\*\*\s*\((.+?)\)/)
        if (match) {
          return {
            name: match[1].trim(),
            type: match[2].trim()
          }
        }
        const simpleMatch = line.match(/^-\s*(.+)$/)
        if (!simpleMatch) return null
        return {
          name: simpleMatch[1].trim(),
          type: ''
        }
      }).filter(Boolean)
    }
  } catch (error) {
    console.warn('Parse quick_search failed:', error)
  }

  return result
}
