// @ts-nocheck
export function resolveTerrainMarker(terrain) {
  const longitude = Number(terrain?.center?.longitude)
  const latitude = Number(terrain?.center?.latitude)
  if (
    !terrain?.id
    || !terrain?.name
    || !Number.isFinite(longitude)
    || !Number.isFinite(latitude)
    || longitude < -180
    || longitude > 180
    || latitude < -90
    || latitude > 90
  ) return null

  return {
    id: `terrain-marker:${terrain.id}`,
    terrainId: terrain.id,
    name: terrain.name,
    longitude,
    latitude,
    enabled: terrain.simulationEnabled === true,
  }
}

export function resolveTerrainMarkers(terrains = []) {
  return terrains.map(resolveTerrainMarker).filter(Boolean)
}
