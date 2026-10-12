// @ts-nocheck
import { ROOM_CREATION_PRESETS } from './commandWorkspacePresets'

const palette = {
  core: '#f0d38a',
  room: '#f0d38a',
  version: '#7ec8ff',
  source: '#9fb2c2',
  analysis: '#ff8f70',
  report: '#8fe3c0',
  scenario: '#7ec8ff',
  function: '#8fe3c0',
  artifact: '#ff8f70',
}

export const buildOverviewOntologyGraph = (stage = 'hero') => {
  const activeNodeIdsByStage = {
    hero: ['core', 'sources', 'version', 'analysis', 'report'],
    intake: ['sources', 'version'],
    decision: ['version', 'analysis', 'report'],
    rooms: ['core', 'analysis', 'report', ...ROOM_CREATION_PRESETS.map((preset) => `preset-${preset.code}`)],
  }
  const activeLinkIdsByStage = {
    hero: ['core:sources', 'sources:version', 'version:analysis', 'analysis:report'],
    intake: ['core:sources', 'sources:version'],
    decision: ['sources:version', 'version:analysis', 'analysis:report'],
    rooms: ROOM_CREATION_PRESETS.flatMap((preset) => [
      `core:preset-${preset.code}`,
      `preset-${preset.code}:analysis`,
    ]).concat('analysis:report'),
  }

  const activeNodeIds = new Set(activeNodeIdsByStage[stage] || activeNodeIdsByStage.hero)
  const activeLinkIds = new Set(activeLinkIdsByStage[stage] || activeLinkIdsByStage.hero)

  const nodes = [
    { id: 'core', label: '지휘결심 지원', kind: 'core', size: 10, color: palette.core, meta: '작전실 단일 워크플로' },
    { id: 'sources', label: '자료 반영', kind: 'function', size: 7, color: palette.function, meta: '문서, 링크, 상황보고' },
    { id: 'version', label: '활성 버전', kind: 'version', size: 7, color: palette.version, meta: '기준 그래프 확정' },
    { id: 'analysis', label: '분석 시작', kind: 'analysis', size: 7, color: palette.analysis, meta: '결심 브리프/평가 패키지' },
    { id: 'report', label: '종합 보고서', kind: 'report', size: 7, color: palette.report, meta: '총장 보고 및 비서실 재활용' },
    ...ROOM_CREATION_PRESETS.map((preset, index) => ({
      id: `preset-${preset.code}`,
      label: preset.title,
      kind: 'scenario',
      size: 6 + (index % 2),
      color: palette.scenario,
      meta: preset.summary,
    })),
  ].map((node) => ({
    ...node,
    active: activeNodeIds.has(node.id),
    dim: !activeNodeIds.has(node.id),
    size: activeNodeIds.has(node.id) ? node.size + 1.2 : node.size,
  }))

  const links = [
    { source: 'core', target: 'sources', active: true },
    { source: 'sources', target: 'version', emphasis: true },
    { source: 'version', target: 'analysis', active: true },
    { source: 'analysis', target: 'report', emphasis: true },
    ...ROOM_CREATION_PRESETS.flatMap((preset) => ([
      { source: 'core', target: `preset-${preset.code}`, emphasis: true },
      { source: `preset-${preset.code}`, target: 'analysis' },
    ])),
  ].map((link) => {
    const key = `${link.source}:${link.target}`
    const isActive = activeLinkIds.has(key)
    return {
      ...link,
      active: isActive,
      emphasis: isActive || link.emphasis,
      color: isActive ? 'rgba(240, 211, 138, 0.9)' : undefined,
    }
  })

  return { nodes, links }
}

export const buildRoomOntologyGraph = (room, versions = []) => {
  if (!room) return { nodes: [], links: [] }

  const nodes = []
  const links = []
  const pushNode = (node) => {
    if (!nodes.some((item) => item.id === node.id)) nodes.push(node)
  }
  const pushLink = (link) => {
    if (!links.some((item) => item.source === link.source && item.target === link.target)) links.push(link)
  }

  const roomNodeId = `room-${room.roomId || 'current'}`
  const activeVersionId = room.activeVersion?.versionId || versions.find((item) => item.isActive)?.versionId || ''

  pushNode({
    id: roomNodeId,
    label: room.name || '작전실',
    kind: 'room',
    size: 10,
    color: palette.room,
    meta: room.description || room.roomFocus || '현재 room',
  })

  ;(versions || []).slice(0, 6).forEach((version) => {
    const versionId = version.versionId || version.label
    pushNode({
      id: versionId,
      label: version.label || '버전',
      kind: 'version',
      size: version.isActive ? 8 : 6,
      color: palette.version,
      meta: version.summary || `${version.sourceCount || 0}개 자료 기반`,
      routeName: version.projectId ? 'Process' : version.reportId ? 'Report' : version.simulationId ? 'Simulation' : '',
      routeParamName: version.projectId ? 'projectId' : version.reportId ? 'reportId' : version.simulationId ? 'simulationId' : '',
      routeParamValue: version.projectId || version.reportId || version.simulationId || '',
    })
    pushLink({
      source: roomNodeId,
      target: versionId,
      active: versionId === activeVersionId,
      emphasis: versionId === activeVersionId,
    })

    if (version.projectId) {
      pushNode({
        id: `project-${version.projectId}`,
        label: 'Process',
        kind: 'analysis',
        size: 5,
        color: palette.analysis,
        routeName: 'Process',
        routeParamName: 'projectId',
        routeParamValue: version.projectId,
      })
      pushLink({ source: versionId, target: `project-${version.projectId}`, emphasis: true })
    }

    if (version.simulationId) {
      pushNode({
        id: `simulation-${version.simulationId}`,
        label: 'Simulation',
        kind: 'analysis',
        size: 5,
        color: palette.analysis,
        routeName: 'Simulation',
        routeParamName: 'simulationId',
        routeParamValue: version.simulationId,
      })
      pushLink({ source: versionId, target: `simulation-${version.simulationId}` })
    }

    if (version.reportId) {
      pushNode({
        id: `report-${version.reportId}`,
        label: 'Report',
        kind: 'report',
        size: 5,
        color: palette.report,
        routeName: 'Report',
        routeParamName: 'reportId',
        routeParamValue: version.reportId,
      })
      pushLink({ source: versionId, target: `report-${version.reportId}`, active: versionId === activeVersionId })
    }
  })

  ;(room.sources || []).slice(0, 10).forEach((source, index) => {
    const sourceId = source.sourceId || `source-${index}`
    pushNode({
      id: sourceId,
      label: source.name || `자료 ${index + 1}`,
      kind: 'source',
      size: 4.5,
      color: palette.source,
      meta: source.summary || source.origin || source.status || '근거자료',
    })
    pushLink({
      source: roomNodeId,
      target: sourceId,
      emphasis: index < 3,
    })
  })

  return { nodes, links }
}
