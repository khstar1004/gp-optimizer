// @ts-nocheck
const SEMI_MAJOR_AXIS_M = 6378137
const ECCENTRICITY_SQUARED = 6.6943799901413165e-3

export const DEFAULT_PHYSICS_REFERENCE = Object.freeze({
  reference_frame_id: 'seungjin-enu-v1',
  terrain_package_id: 'seungjin',
  origin_wgs84: { longitude: 127.354386, latitude: 38.07775, altitude_m: 0 },
  axes: 'ENU',
  transform_version: 'warground-coordinate-v1',
  extent_m: 16384,
  grid_size: 513,
  bounds_enu_m: { east_min_m: -8192, east_max_m: 8192, north_min_m: -8192, north_max_m: 8192 },
  fixture_id: 'seungjin-heightfield-v1',
  fixture_sha256: '9bda78d0004048ea5cd20c1582a6462d7deefddf359a68546ad686ca0bf3a363',
})

function finite(value, fallback = 0) {
  const number = Number(value)
  return Number.isFinite(number) ? number : fallback
}

function radians(value) {
  return value * Math.PI / 180
}

function degrees(value) {
  return value * 180 / Math.PI
}

function ecef(point) {
  const latitude = radians(finite(point?.latitude))
  const longitude = radians(finite(point?.longitude))
  const altitude = finite(point?.altitude_m ?? point?.altitudeMeters)
  const sinLatitude = Math.sin(latitude)
  const cosLatitude = Math.cos(latitude)
  const radius = SEMI_MAJOR_AXIS_M / Math.sqrt(1 - ECCENTRICITY_SQUARED * sinLatitude ** 2)
  return {
    x: (radius + altitude) * cosLatitude * Math.cos(longitude),
    y: (radius + altitude) * cosLatitude * Math.sin(longitude),
    z: (radius * (1 - ECCENTRICITY_SQUARED) + altitude) * sinLatitude,
  }
}

export function referenceFromFrame(frame) {
  return frame?.reference_frame_detail || DEFAULT_PHYSICS_REFERENCE
}

export function enuFromWgs84(point, reference = DEFAULT_PHYSICS_REFERENCE) {
  const origin = reference?.origin_wgs84 || DEFAULT_PHYSICS_REFERENCE.origin_wgs84
  const originEcef = ecef(origin)
  const pointEcef = ecef(point)
  const latitude = radians(finite(origin.latitude))
  const longitude = radians(finite(origin.longitude))
  const deltaX = pointEcef.x - originEcef.x
  const deltaY = pointEcef.y - originEcef.y
  const deltaZ = pointEcef.z - originEcef.z
  return {
    east_m: -Math.sin(longitude) * deltaX + Math.cos(longitude) * deltaY,
    north_m: -Math.sin(latitude) * Math.cos(longitude) * deltaX
      - Math.sin(latitude) * Math.sin(longitude) * deltaY
      + Math.cos(latitude) * deltaZ,
    up_m: Math.cos(latitude) * Math.cos(longitude) * deltaX
      + Math.cos(latitude) * Math.sin(longitude) * deltaY
      + Math.sin(latitude) * deltaZ,
  }
}

export function wgs84FromEnu(enu, reference = DEFAULT_PHYSICS_REFERENCE) {
  const origin = reference?.origin_wgs84 || DEFAULT_PHYSICS_REFERENCE.origin_wgs84
  const originEcef = ecef(origin)
  const latitude = radians(finite(origin.latitude))
  const longitude = radians(finite(origin.longitude))
  const east = finite(enu?.east_m)
  const north = finite(enu?.north_m)
  const up = finite(enu?.up_m)
  const deltaX = -Math.sin(latitude) * Math.cos(longitude) * north
    - Math.sin(longitude) * east
    + Math.cos(latitude) * Math.cos(longitude) * up
  const deltaY = -Math.sin(latitude) * Math.sin(longitude) * north
    + Math.cos(longitude) * east
    + Math.cos(latitude) * Math.sin(longitude) * up
  const deltaZ = Math.cos(latitude) * north + Math.sin(latitude) * up
  const x = originEcef.x + deltaX
  const y = originEcef.y + deltaY
  const z = originEcef.z + deltaZ
  const longitudeResult = Math.atan2(y, x)
  const distance = Math.sqrt(x * x + y * y)
  let latitudeResult = Math.atan2(z, distance * (1 - ECCENTRICITY_SQUARED))
  for (let index = 0; index < 6; index += 1) {
    const sinLatitude = Math.sin(latitudeResult)
    const radius = SEMI_MAJOR_AXIS_M / Math.sqrt(1 - ECCENTRICITY_SQUARED * sinLatitude ** 2)
    latitudeResult = Math.atan2(z + ECCENTRICITY_SQUARED * radius * sinLatitude, distance)
  }
  const sinLatitude = Math.sin(latitudeResult)
  const radius = SEMI_MAJOR_AXIS_M / Math.sqrt(1 - ECCENTRICITY_SQUARED * sinLatitude ** 2)
  return {
    longitude: degrees(longitudeResult),
    latitude: degrees(latitudeResult),
    altitude_m: distance / Math.cos(latitudeResult) - radius,
  }
}

export function pointInsideReference(enu, reference = DEFAULT_PHYSICS_REFERENCE) {
  const bounds = reference?.bounds_enu_m || {}
  const east = finite(enu?.east_m, Number.NaN)
  const north = finite(enu?.north_m, Number.NaN)
  return Number.isFinite(east) && Number.isFinite(north)
    && east >= finite(bounds.east_min_m, -Infinity)
    && east <= finite(bounds.east_max_m, Infinity)
    && north >= finite(bounds.north_min_m, -Infinity)
    && north <= finite(bounds.north_max_m, Infinity)
}

export function coordinateConsistency(unit, frame, tolerance = {}) {
  const wgs84 = unit?.position_wgs84
  const enu = unit?.position_enu_m
  const horizontalToleranceM = Number(tolerance.horizontal_tolerance_m ?? unit?.render_alignment?.horizontal_tolerance_m ?? 0.5)
  const verticalToleranceM = Number(tolerance.vertical_tolerance_m ?? unit?.render_alignment?.vertical_tolerance_m ?? 0.5)
  const values = [
    wgs84?.longitude,
    wgs84?.latitude,
    wgs84?.altitude_m,
    enu?.east_m,
    enu?.north_m,
    enu?.up_m,
    horizontalToleranceM,
    verticalToleranceM,
  ]
  if (!values.every((value) => Number.isFinite(Number(value))) || horizontalToleranceM <= 0 || verticalToleranceM <= 0) {
    return { status: 'invalid', horizontalErrorM: null, verticalErrorM: null }
  }
  const projected = enuFromWgs84(wgs84, referenceFromFrame(frame))
  const horizontalErrorM = Math.hypot(projected.east_m - Number(enu.east_m), projected.north_m - Number(enu.north_m))
  const verticalErrorM = Math.abs(projected.up_m - Number(enu.up_m))
  return {
    status: horizontalErrorM <= horizontalToleranceM && verticalErrorM <= verticalToleranceM ? 'verified' : 'misaligned',
    horizontalErrorM,
    verticalErrorM,
  }
}

export function authoritativeEnu(unit, frame) {
  const direct = unit?.position_enu_m
  if (direct && Number.isFinite(Number(direct.east_m)) && Number.isFinite(Number(direct.north_m))) {
    return {
      east_m: finite(direct.east_m),
      north_m: finite(direct.north_m),
      up_m: finite(direct.up_m),
    }
  }
  return enuFromWgs84(unit?.position_wgs84 || unit || {}, referenceFromFrame(frame))
}

export function scenePositionFromUnit(unit, frame, sceneOriginWgs84) {
  const reference = referenceFromFrame(frame)
  const point = authoritativeEnu(unit, frame)
  const sceneOrigin = sceneOriginWgs84 ? enuFromWgs84(sceneOriginWgs84, reference) : { east_m: 0, north_m: 0, up_m: 0 }
  return {
    x: point.east_m - sceneOrigin.east_m,
    y: point.up_m - sceneOrigin.up_m,
    z: -(point.north_m - sceneOrigin.north_m),
  }
}
