// @ts-nocheck
const SECTION_CONFIG = [
  { title: '분석 모드', key: 'missionMode', aliases: ['과업 유형'] },
  { title: '보고 대상', key: 'audience', aliases: [] },
  { title: '검토 등급', key: 'classificationLevel', aliases: ['보안 등급'] },
  { title: '리허설 범위', key: 'timeHorizon', aliases: ['예측 범위', '시간 범위'] },
  { title: '결심 질문', key: 'coreQuestion', aliases: ['핵심 판단 질문', '핵심 예측 질문', '의사결정 질문', '활동 평가 질문'] },
  { title: '비교 방책', key: 'interventionPlan', aliases: ['비교 시나리오', '비교대안', '개선 시나리오', '개선안', '활동 묶음/평가 구간'] },
  { title: '결심카드 포커스', key: 'reportFocus', aliases: ['리포트 포커스', '보고 핵심 쟁점', '종합보고 초점'] },
  { title: '결심 판단 기준', key: 'successMetrics', aliases: ['판단 기준', '평가 기준', '효과 판단 기준', '평가 축'] },
  { title: '제약 및 전제', key: 'constraints', aliases: ['제약·경계조건', '보고 원칙'] }
]

const titleToSection = new Map(
  SECTION_CONFIG.flatMap((section) => [
    [section.title, section],
    ...(section.aliases || []).map((alias) => [alias, section])
  ])
)

export function buildSimulationRequirement(brief = {}) {
  return SECTION_CONFIG
    .map((section) => ({
      title: section.title,
      content: (brief[section.key] || '').trim()
    }))
    .filter((section) => section.content !== '')
    .map((section) => `[${section.title}]\n${section.content}`)
    .join('\n\n')
}

export function parseSimulationRequirement(requirement = '') {
  const text = String(requirement || '').trim()
  const parsed = {
    coreQuestion: '',
    interventionPlan: '',
    reportFocus: '',
    missionMode: '',
    audience: '',
    classificationLevel: '',
    timeHorizon: '',
    successMetrics: '',
    constraints: '',
    raw: text
  }

  if (!text) {
    return parsed
  }

  const sectionPattern = /\[([^\]]+)\]\s*([\s\S]*?)(?=\n\s*\[[^\]]+\]\s*|$)/g
  let matchedSection = false

  for (const match of text.matchAll(sectionPattern)) {
    const title = match[1]?.trim()
    const content = match[2]?.trim() || ''

    if (!titleToSection.has(title) || !content) {
      continue
    }

    matchedSection = true

    const target = titleToSection.get(title)
    if (target) {
      parsed[target.key] = content
    }
  }

  if (!matchedSection) {
    parsed.coreQuestion = text
  }

  return parsed
}
