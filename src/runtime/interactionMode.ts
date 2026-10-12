// @ts-nocheck
/**
 * 「지금 지도 클릭은 누구 것인가」 — 한 곳에서 정한다.
 *
 * 지도 위에는 클릭을 원하는 주인이 여럿이다: 맵 인스펙터 팝업, 우클릭 컨텍스트 메뉴,
 * 측정, COA 스케치, 축선 작도, IPB 수동 배치, 감시자산 클릭 배치, 관측점 지정.
 * 이들이 각자 자기만의 「지금 바쁜가」 판정을 들고 있으면 반드시 어긋난다 —
 * 실제로 어긋나 있었다:
 *
 *  · MapInspector 는 도보/1인칭/드론만 봤다. 그래서 COA 작도 첫 클릭에 초소 팝업이 열리고,
 *    그 팝업이 두 번째 클릭을 삼켜 **작도가 한 점에서 영영 끝나지 않았다**.
 *  · mapContext 는 `state.coa.mode` 와 `state.sketch.mode` 를 봤는데 실제 필드는
 *    `coa.tool` 과 `routeSketch.active` 다. 늘 false 였으니 작도 중에도 우클릭 메뉴가 떴고,
 *    그 우클릭이 「작도 완성」 대신 메뉴를 열었다.
 *
 * 그래서 판정을 여기 한 번만 적는다. 새 작도 도구가 생기면 이 파일만 고친다.
 */

/** 카메라를 독점하는 시점 모드 — 지도 픽 자체가 의미 없다. */
export function isViewMode(state) {
  return !!(state?.walk?.active || state?.fpv?.active || state?.drone?.active);
}

/** 지도 클릭을 소비하는 작도·배치 모드. 켜져 있으면 팝업·메뉴가 끼어들면 안 된다. */
export function isDrawingMode(state) {
  if (!state) return false;
  return !!(
    state.measure?.mode
    || state.coa?.tool
    || state.routeSketch?.active
    || state.ipb?.placingKind
    || state.postPickType
    || state.pickingVantage
  );
}

/** 지도 위 보조 UI(팝업·컨텍스트 메뉴·호버 칩)가 물러서야 하는 상황. */
export function mapUiBusy(state) {
  return isViewMode(state) || isDrawingMode(state);
}

/** 지금 무엇이 클릭을 가져가는지 — 배너·안내 문구용. */
export function activeModeLabel(state) {
  if (!state) return null;
  if (state.fpv?.active) return '1인칭 관측';
  if (state.walk?.active) return '도보 정찰';
  if (state.drone?.active) return '드론 정찰';
  if (state.measure?.mode) {
    return { distance: '표면거리 측정', profile: '고도 프로파일', area: '면적 측정' }[state.measure.mode] ?? '측정';
  }
  if (state.coa?.tool) return 'COA 전술 스케치';
  if (state.routeSketch?.active) return '침투 축선 작도';
  if (state.ipb?.placingKind) return `${state.ipb.placingKind} 배치`;
  if (state.postPickType) return '감시자산 클릭 배치';
  if (state.pickingVantage) return '관측점 지정';
  return null;
}
