// @ts-nocheck
import { buildTerrainSnapshot } from './terrainRuntimeBridge'
import { referenceFromFrame } from './physicsReference'

function finiteNumber(value, fallback = 0) {
  const number = Number(value)
  return Number.isFinite(number) ? number : fallback
}

function unitIdOf(unit) {
  return String(unit?.unit_id || unit?.id || '').trim()
}

function sideForUnit(unit) {
  const side = String(unit?.side_id || unit?.sideId || 'blue').toLowerCase()
  return side === 'red' || side === 'enemy' ? 'red' : 'blue'
}

function modelForUnit(unit) {
  const source = `${unit?.model_id || unit?.modelId || ''} ${unit?.unit_id || ''}`.toLowerCase()
  if (source.includes('k2')) return 'tank-k2'
  if (source.includes('k21')) return 'tank-k21'
  return 'tank-k21'
}

export function buildRealisticReplaySnapshot(frame, selectedUnitId = '') {
  const sourceUnits = Array.isArray(frame?.units) ? frame.units : []
  const firstUnitId = unitIdOf(sourceUnits[0])
  const selectedId = String(selectedUnitId || firstUnitId).trim()
  const seenUnitIds = new Set()

  const units = sourceUnits
    .map((unit) => {
      const id = unitIdOf(unit)
      if (!id || seenUnitIds.has(id)) return null
      seenUnitIds.add(id)
      const point = unit?.position_wgs84 || {}
      const enu = unit?.position_enu_m || {}
      const sideColor = sideForUnit(unit)
      const modelId = modelForUnit(unit)
      const physicsAltitudeMeters = finiteNumber(enu.up_m ?? point.altitude_m ?? point.altitudeMeters)
      const velocity = unit?.linear_velocity_mps || {}
      const angularVelocity = unit?.angular_velocity_radps || {}
      return {
        id,
        unit_id: id,
        name: unit?.name || '소대 1호 차량',
        className: unit?.class_name || unit?.className || (modelId === 'tank-k2' ? 'K2 전차' : 'K21 장갑차'),
        modelId,
        entityType: 'army',
        groundUnit: true,
        sideId: sideColor,
        sideName: sideColor === 'red' ? '적군' : '아군',
        sideColor,
        longitude: finiteNumber(point.longitude),
        latitude: finiteNumber(point.latitude),
        altitudeMeters: physicsAltitudeMeters,
        positionEnuM: {
          east_m: finiteNumber(enu.east_m),
          north_m: finiteNumber(enu.north_m),
          up_m: physicsAltitudeMeters,
        },
        heading: finiteNumber(unit?.heading_deg),
        heading_deg: finiteNumber(unit?.heading_deg),
        status: unit?.status || '확인 중',
        mobility_state: unit?.mobility_state || 'stationary',
        model_fidelity: unit?.model_fidelity || 'physics-frame',
        render_alignment: unit?.render_alignment || null,
        selected: id === selectedId,
        route: [],
        motionState: {
          linearVelocityMps: {
            east_mps: finiteNumber(velocity.east_mps),
            north_mps: finiteNumber(velocity.north_mps),
            up_mps: finiteNumber(velocity.up_mps),
          },
          angularVelocityRadps: {
            x: finiteNumber(angularVelocity.x),
            y: finiteNumber(angularVelocity.y),
            z: finiteNumber(angularVelocity.z),
          },
        },
        physics: {
          frameId: frame?.frame_id || '',
          frameHash: frame?.frame_hash || '',
          altitudeMeters: physicsAltitudeMeters,
        },
      }
    })
    .filter((unit) => unit?.id && Number.isFinite(unit.longitude) && Number.isFinite(unit.latitude))

  return {
    ...buildTerrainSnapshot({
      units,
      weapons: [],
      groundMarkers: [],
      referencePoints: [],
      routes: [],
      messages: [],
      recentEvents: Array.isArray(frame?.events) ? frame.events : [],
      selectedUnitId: selectedId,
      currentTime: finiteNumber(frame?.simulation_time_s),
      stats: {
        unitsVisible: units.length,
        unitsTotal: units.length,
        weaponsInFlight: 0,
      },
    }),
    frameId: frame?.frame_id || '',
    frameHash: frame?.frame_hash || '',
    referenceFrame: frame?.reference_frame || 'WGS84+ENU',
    referenceFrameDetail: frame?.reference_frame_detail || referenceFromFrame(frame),
    terrainPackageId: frame?.terrain_package_id || '',
    renderAlignment: frame?.render_alignment || null,
    warnings: Array.isArray(frame?.warnings) ? frame.warnings : [],
  }
}
