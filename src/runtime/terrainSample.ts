// @ts-nocheck
/**
 * 지형 표고 샘플 — 지형 공급자가 무엇이든 같은 약속을 지키는 한 곳.
 *
 * `Cesium.sampleTerrainMostDetailed` 는 공급자의 `availability` 를 곧바로 만진다.
 * 그런데 「타원체 (지형 없음)」로 바꾸면 `EllipsoidTerrainProvider` 에는 그 필드가
 * 아예 없어서 `computeMaximumLevelAtPosition of undefined` 로 터진다 — 그리고 이
 * 함수는 배치·가시영역·축선·측정·도보 등 앱의 거의 모든 곳에서 불린다. 즉 지형
 * 소스 하나를 바꾸면 그 뒤의 모든 조작이 조용히 실패한다.
 *
 * 호출부마다 try/catch 를 뿌리는 대신 여기서 한 번 막는다. 계약은 하나다:
 * **돌아온 Cartographic 의 height 는 언제나 유한한 수다.** 지형이 없으면 0
 * (타원체면 = 해수면), 조회가 실패하면 부르는 쪽이 준 대체값.
 */

/** 이 공급자에게 표고를 물어볼 수 있는가 (타원체·미초기화 공급자는 못 묻는다). */
export function hasTerrainHeights(terrainProvider) {
  return !!terrainProvider?.availability;
}

/**
 * @param terrainProvider Cesium TerrainProvider
 * @param cartographics   Cesium.Cartographic[] — 제자리에서 height 가 채워진다
 * @param fallbackHeight  조회 불가/실패 시 채울 표고 (기본 0 = 타원체면)
 */
export async function sampleTerrainDetailed(terrainProvider, cartographics, fallbackHeight = 0) {
  if (!Array.isArray(cartographics) || !cartographics.length) return cartographics ?? [];
  const fill = () => {
    for (const c of cartographics) {
      if (!Number.isFinite(c?.height)) c.height = fallbackHeight;
    }
    return cartographics;
  };
  if (!hasTerrainHeights(terrainProvider)) {
    // 타원체 지형 — 표고는 정의상 0 이다. 이건 실패가 아니라 그 공급자의 답이다.
    for (const c of cartographics) c.height = 0;
    return cartographics;
  }
  try {
    await Cesium.sampleTerrainMostDetailed(terrainProvider, cartographics);
    return fill();
  } catch (error) {
    console.warn('[terrainSample] 표고 조회 실패 — 대체값으로 진행', error);
    return fill();
  }
}
