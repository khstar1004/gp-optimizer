// @ts-nocheck
/**
 * KAIROS/VISTA 지형분석 뷰어 함수 — 원본에서 함수 단위로 그대로 추출 (본문 무수정).
 * 원본: D:\VISTA_sudo\client\public\terrain-3d\viewer.js
 *   getCenter                    viewer.js:1080-1085
 *   formatPercent                viewer.js:1119-1121
 *   formatScore                  viewer.js:1123-1125
 *   clearMarkerEntities          viewer.js:4859-4864
 *   clearAnalysisOverlayEntities viewer.js:4866-4871
 *   clearAssetRecommendationEntities viewer.js:4873-4878
 *   sampleTerrainGrid            viewer.js:5887-5937
 *   sampleTerrainCartographics   viewer.js:5939-5974
 *   calculateSampleSlopes        viewer.js:5976-6009
 *   addTerrainMarkers            viewer.js:6011-6049
 *   addAnalysisOverlays          viewer.js:6051-6058
 *   addHeatmapOverlay            viewer.js:6060-6098
 *   addLosOverlay                viewer.js:6100-6138
 *   addAssetRecommendationOverlay viewer.js:6140-6182
 *
 * 원본은 모듈 전역 viewerState에 엔티티 핸들을 쌓는다. viewer.js 전체(6,682줄)를 들고 오지
 * 않기 위해 참조되는 필드만 최소 shim으로 제공한다. 함수 본문은 한 줄도 고치지 않았다.
 */
const viewerState = {
  markerEntities: [],
  analysisOverlayEntities: [],
  assetRecommendationEntities: [],
};

export {
  getCenter,
  clearMarkerEntities,
  clearAnalysisOverlayEntities,
  sampleTerrainGrid,
  sampleTerrainCartographics,
  calculateSampleSlopes,
  addTerrainMarkers,
  addAnalysisOverlays,
  clearAssetRecommendationEntities,
  addHeatmapOverlay,
  addLosOverlay,
  addAssetRecommendationOverlay,
  formatScore,
};

function getCenter(bounds) {
  return {
    lon: (bounds.west + bounds.east) / 2,
    lat: (bounds.south + bounds.north) / 2,
  };
}

function formatPercent(value) {
  return `${Math.round(value * 100)}%`;
}

function formatScore(value) {
  return formatPercent(Math.min(Math.max(value, 0), 1));
}

function clearMarkerEntities(viewer) {
  viewerState.markerEntities.forEach((entity) => {
    viewer.entities.remove(entity);
  });
  viewerState.markerEntities = [];
}

function clearAnalysisOverlayEntities(viewer) {
  viewerState.analysisOverlayEntities.forEach((entity) => {
    viewer.entities.remove(entity);
  });
  viewerState.analysisOverlayEntities = [];
}

function clearAssetRecommendationEntities(viewer) {
  viewerState.assetRecommendationEntities.forEach((entity) => {
    viewer.entities.remove(entity);
  });
  viewerState.assetRecommendationEntities = [];
}

async function sampleTerrainGrid(viewer, bounds, columns = 10, rows = 10) {
  const center = getCenter(bounds);
  const lonStep = (bounds.east - bounds.west) / columns;
  const latStep = (bounds.north - bounds.south) / rows;
  const samples = [];
  const terrainProvider = viewer.terrainProvider;
  const supportsTerrain =
    terrainProvider &&
    !(terrainProvider instanceof Cesium.EllipsoidTerrainProvider);

  for (let rowIndex = 0; rowIndex < rows; rowIndex += 1) {
    for (let columnIndex = 0; columnIndex < columns; columnIndex += 1) {
      const lon = bounds.west + lonStep * (columnIndex + 0.5);
      const lat = bounds.south + latStep * (rowIndex + 0.5);
      samples.push({
        rowIndex,
        columnIndex,
        lon,
        lat,
        cartographic: Cesium.Cartographic.fromDegrees(lon, lat),
      });
    }
  }

  if (supportsTerrain) {
    await sampleTerrainCartographics(
      terrainProvider,
      samples.map((sample) => sample.cartographic)
    );
  }

  const metersPerLongitude = 111320 * Math.cos((center.lat * Math.PI) / 180);
  const enrichedSamples = samples.map((sample) => {
    const sampledHeight = Number.isFinite(sample.cartographic.height)
      ? sample.cartographic.height
      : 0;
    const localX = (sample.lon - center.lon) * metersPerLongitude;
    const localY = (sample.lat - center.lat) * 111320;

    return {
      ...sample,
      heightMeters: sampledHeight,
      localX,
      localY,
      distanceFromCenterMeters: Math.hypot(localX, localY),
      slopeDegrees: 0,
    };
  });

  return calculateSampleSlopes(enrichedSamples);
}

async function sampleTerrainCartographics(terrainProvider, cartographics) {
  const supportsMostDetailedSampling =
    typeof Cesium.sampleTerrainMostDetailed === "function" &&
    typeof terrainProvider?.availability?.computeMaximumLevelAtPosition ===
      "function";

  if (supportsMostDetailedSampling) {
    try {
      await Cesium.sampleTerrainMostDetailed(terrainProvider, cartographics);
      return;
    } catch (error) {
      console.warn(
        "Most detailed terrain sampling failed. Falling back to fixed-level sampling.",
        error
      );
    }
  }

  if (typeof Cesium.sampleTerrain !== "function") {
    return;
  }

  const sampleLevel = Math.max(
    0,
    Math.floor(Number(terrainProvider?.__vistaOfflineTerrainSampleLevel) || 12)
  );

  try {
    await Cesium.sampleTerrain(terrainProvider, sampleLevel, cartographics);
  } catch (error) {
    console.warn(
      "Fixed-level terrain sampling failed. Continuing analysis with flat heights.",
      error
    );
  }
}

function calculateSampleSlopes(samples) {
  const sampleLookup = new Map(
    samples.map((sample) => [
      `${sample.rowIndex}:${sample.columnIndex}`,
      sample,
    ])
  );

  return samples.map((sample) => {
    const left =
      sampleLookup.get(`${sample.rowIndex}:${sample.columnIndex - 1}`) ??
      sample;
    const right =
      sampleLookup.get(`${sample.rowIndex}:${sample.columnIndex + 1}`) ??
      sample;
    const down =
      sampleLookup.get(`${sample.rowIndex - 1}:${sample.columnIndex}`) ??
      sample;
    const up =
      sampleLookup.get(`${sample.rowIndex + 1}:${sample.columnIndex}`) ??
      sample;
    const deltaX = right.localX - left.localX || 1;
    const deltaY = up.localY - down.localY || 1;
    const dzdx = (right.heightMeters - left.heightMeters) / deltaX;
    const dzdy = (up.heightMeters - down.heightMeters) / deltaY;
    const slopeDegrees =
      Math.atan(Math.sqrt(dzdx * dzdx + dzdy * dzdy)) * (180 / Math.PI);

    return {
      ...sample,
      slopeDegrees: Number.isFinite(slopeDegrees) ? slopeDegrees : 0,
    };
  });
}

function addTerrainMarkers(viewer, markers) {
  clearMarkerEntities(viewer);

  markers.forEach((marker) => {
    const markerColor =
      marker.type === "artillery"
        ? Cesium.Color.fromCssColorString("#ffd26d")
        : marker.type === "crossing"
          ? Cesium.Color.fromCssColorString("#71d9ff")
          : Cesium.Color.fromCssColorString("#58d17e");
    const entity = viewer.entities.add({
      position: Cesium.Cartesian3.fromDegrees(
        marker.lon,
        marker.lat,
        marker.heightMeters + 12
      ),
      point: {
        pixelSize: 9,
        color: markerColor,
        outlineColor: Cesium.Color.fromCssColorString("#051117"),
        outlineWidth: 2,
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
      },
      label: {
        text: marker.id,
        font: "700 11px 'Segoe UI', 'Noto Sans KR', sans-serif",
        fillColor: Cesium.Color.fromCssColorString("#ecfffb"),
        showBackground: true,
        backgroundColor:
          Cesium.Color.fromCssColorString("#04161d").withAlpha(0.8),
        pixelOffset: new Cesium.Cartesian2(0, -18),
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
        verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
      },
      description: `${marker.reason}\n점수 ${formatScore(marker.score ?? 0)}`,
    });
    viewerState.markerEntities.push(entity);
  });
}

function addAnalysisOverlays(viewer, analysis) {
  clearAnalysisOverlayEntities(viewer);
  clearAssetRecommendationEntities(viewer);

  addHeatmapOverlay(viewer, analysis.concealmentCells);
  addLosOverlay(viewer, analysis.losSegments);
  addAssetRecommendationOverlay(viewer, analysis.assetRecommendations);
}

function addHeatmapOverlay(viewer, cells) {
  if (!Array.isArray(cells)) {
    return;
  }

  cells.forEach((cell) => {
    const dominantScore =
      cell.dominantType === "concealment"
        ? cell.concealmentScore
        : cell.exposureScore;
    if (dominantScore < 0.4) {
      return;
    }

    const alpha = 0.08 + dominantScore * 0.2;
    const fillColor =
      cell.dominantType === "concealment"
        ? Cesium.Color.fromCssColorString("#58d17e").withAlpha(alpha)
        : Cesium.Color.fromCssColorString("#ff8b7c").withAlpha(alpha * 0.92);
    const entity = viewer.entities.add({
      polygon: {
        hierarchy: Cesium.Cartesian3.fromDegreesArray([
          cell.west,
          cell.south,
          cell.east,
          cell.south,
          cell.east,
          cell.north,
          cell.west,
          cell.north,
        ]),
        material: fillColor,
        outline: false,
        classificationType: Cesium.ClassificationType.TERRAIN,
      },
    });
    viewerState.analysisOverlayEntities.push(entity);
  });
}

function addLosOverlay(viewer, losSegments) {
  if (!Array.isArray(losSegments)) {
    return;
  }

  losSegments.forEach((segment) => {
    if (
      !Number.isFinite(segment.startLon) ||
      !Number.isFinite(segment.startLat) ||
      !Number.isFinite(segment.endLon) ||
      !Number.isFinite(segment.endLat)
    ) {
      return;
    }

    const isOpenSegment = segment.type === "open";
    const entity = viewer.entities.add({
      polyline: {
        positions: Cesium.Cartesian3.fromDegreesArrayHeights([
          segment.startLon,
          segment.startLat,
          (segment.startHeightMeters ?? 0) + 28,
          segment.endLon,
          segment.endLat,
          (segment.endHeightMeters ?? 0) + 20,
        ]),
        width: isOpenSegment ? 2.2 : 1.8,
        clampToGround: false,
        material: isOpenSegment
          ? Cesium.Color.fromCssColorString("#8cff9f").withAlpha(0.9)
          : new Cesium.PolylineDashMaterialProperty({
              color: Cesium.Color.fromCssColorString("#ff8b7c").withAlpha(0.88),
              dashLength: 14,
            }),
      },
    });
    viewerState.analysisOverlayEntities.push(entity);
  });
}

function addAssetRecommendationOverlay(viewer, recommendations) {
  if (!Array.isArray(recommendations)) {
    return;
  }

  recommendations.slice(0, 4).forEach((recommendation) => {
    if (
      !Number.isFinite(recommendation.unitLon) ||
      !Number.isFinite(recommendation.unitLat) ||
      !Number.isFinite(recommendation.markerLon) ||
      !Number.isFinite(recommendation.markerLat)
    ) {
      return;
    }

    const color =
      recommendation.markerType === "artillery"
        ? Cesium.Color.fromCssColorString("#ffd26d")
        : recommendation.markerType === "concealment"
          ? Cesium.Color.fromCssColorString("#7de9a8")
          : Cesium.Color.fromCssColorString("#71d9ff");
    const entity = viewer.entities.add({
      polyline: {
        positions: Cesium.Cartesian3.fromDegreesArrayHeights([
          recommendation.unitLon,
          recommendation.unitLat,
          (recommendation.unitHeightMeters ?? 0) + 36,
          recommendation.markerLon,
          recommendation.markerLat,
          (recommendation.markerHeightMeters ?? 0) + 32,
        ]),
        width: recommendation.selectedUnit ? 3.2 : 2.4,
        clampToGround: false,
        material: new Cesium.PolylineDashMaterialProperty({
          color: color.withAlpha(recommendation.selectedUnit ? 0.95 : 0.74),
          dashLength: recommendation.selectedUnit ? 18 : 24,
        }),
      },
      description: recommendation.summary,
    });
    viewerState.assetRecommendationEntities.push(entity);
  });
}
