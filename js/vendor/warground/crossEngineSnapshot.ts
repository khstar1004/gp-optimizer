// @ts-nocheck
import {
  authoritativeEnu,
  enuFromWgs84,
  referenceFromFrame,
  scenePositionFromUnit,
  wgs84FromEnu,
} from './physicsReference'

function finite(value, fallback = 0) {
  const number = Number(value)
  return Number.isFinite(number) ? number : fallback
}

function distance3d(a, b) {
  return Math.hypot(
    finite(a?.east_m) - finite(b?.east_m),
    finite(a?.north_m) - finite(b?.north_m),
    finite(a?.up_m) - finite(b?.up_m),
  )
}

/**
 * Use the first authoritative unit as the local scene origin.  This is the
 * same origin consumed by the browser replay and the Filament replay, so a
 * camera can be re-entered without changing the world coordinate basis.
 */
export function sceneOriginFromUnits(units, frame) {
  const first = Array.isArray(units) ? units.find(Boolean) : null
  const reference = referenceFromFrame(frame)
  return wgs84FromEnu(authoritativeEnu(first || {}, frame), reference)
}

export function cesiumPositionFromUnit(unit, frame) {
  const reference = referenceFromFrame(frame)
  return wgs84FromEnu(authoritativeEnu(unit, frame), reference)
}

export function canonicalCameraFromSceneOrigin(sceneOriginWgs84, frame, camera = {}) {
  const reference = referenceFromFrame(frame)
  const originEnu = enuFromWgs84(sceneOriginWgs84, reference)
  const yaw = finite(camera.yaw_deg, 38) * Math.PI / 180
  const pitch = finite(camera.pitch_deg, 34) * Math.PI / 180
  const distance = Math.max(1, finite(camera.distance_m, 90))
  const horizontal = Math.cos(pitch) * distance
  return {
    target_enu_m: originEnu,
    position_enu_m: {
      east_m: originEnu.east_m + Math.sin(yaw) * horizontal,
      north_m: originEnu.north_m + Math.cos(yaw) * horizontal,
      up_m: originEnu.up_m + Math.sin(pitch) * distance,
    },
    yaw_deg: finite(camera.yaw_deg, 38),
    pitch_deg: finite(camera.pitch_deg, 34),
    distance_m: distance,
  }
}

/**
 * Compare the authoritative ENU value, its WGS84/Cesium projection, and the
 * local scene value consumed by Three/Filament.  This is deliberately pure so
 * it can run in unit tests, browser fixtures, and CI without a renderer.
 */
export function buildCrossEngineSnapshot(frame, units, camera = {}, toleranceM = 0.05) {
  const safeUnits = (Array.isArray(units) ? units : []).filter(Boolean)
  const sceneOriginWgs84 = sceneOriginFromUnits(safeUnits, frame)
  const rows = safeUnits.map((unit) => {
    const authoritative = authoritativeEnu(unit, frame)
    const cesium = cesiumPositionFromUnit(unit, frame)
    const scene = scenePositionFromUnit(unit, frame, sceneOriginWgs84)
    const projected = enuFromWgs84(cesium, referenceFromFrame(frame))
    const projectionErrorM = distance3d(authoritative, projected)
    return {
      unit_id: String(unit.unit_id || unit.id || ''),
      authoritative_enu_m: authoritative,
      cesium_wgs84: cesium,
      filament_scene_m: { x: scene.x, y: scene.y, z: scene.z },
      projection_error_m: projectionErrorM,
    }
  })
  const maxProjectionErrorM = rows.reduce((max, row) => Math.max(max, row.projection_error_m), 0)
  const canonicalCamera = canonicalCameraFromSceneOrigin(sceneOriginWgs84, frame, camera)
  return {
    schema_version: 'warground-cross-engine-snapshot-v1',
    reference_frame_id: referenceFromFrame(frame).reference_frame_id,
    scene_origin_wgs84: sceneOriginWgs84,
    camera: canonicalCamera,
    units: rows,
    max_projection_error_m: maxProjectionErrorM,
    tolerance_m: toleranceM,
    status: maxProjectionErrorM <= toleranceM ? 'verified' : 'misaligned',
  }
}
