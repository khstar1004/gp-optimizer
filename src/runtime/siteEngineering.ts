/**
 * 토목 판정 — 지반 경사 기반 건축 가부.
 *
 * `placement.ts`(PlacementManager)에서 분리했다: 이 파일은 순수 상수·함수뿐이라
 * Cesium 이 전혀 필요 없는데, `placement.ts`는 `../../js/vendor/scaffolda/scaffolda.bundle`
 * 를 임포트하고 그 번들이 전역 `Cesium`을 즉시 참조하는 게터를 갖고 있어 — 브라우저
 * 밖(Node `tsx --test`)에서 `placement.ts`를 임포트하면 그 이유만으로 무조건
 * `ReferenceError: Cesium is not defined`가 난다. `siteDiagnostics.ts`(diagnoseSite)는
 * 이 판정 하나만 필요한데도 그 전체를 끌고 들어가 있었고, 그래서 순수 함수인데도
 * 단위시험이 하나도 없었다 — 여기로 옮기고 `placement.ts`는 재수출만 해서 기존
 * 임포터(mapInspector.ts 등)는 그대로 두고, `siteDiagnostics.ts`는 여기서 직접
 * 가져와 Cesium 의존을 끊는다(동작은 100% 동일 — 이동일 뿐 로직 변경 없음).
 *
 * 풋프린트 대각선에 걸친 지반 표고차로 평균경사각을 산출한다. 정지(整地)·옹벽으로
 * 극복 가능한 경사에는 한계가 있다(절·성토량·옹벽고가 급증). 군 시설기준·건축 실무의
 * 통상 밴딩을 단순화해 적용: 완경사 양호 / 중경사 정지필요 / 급경사 건축불가.
 */

export const SLOPE_EASY_DEG = 10;    // 이하: 경미한 정지로 건축 양호
export const SLOPE_MAX_DEG = 20;     // 초과: 정지·옹벽 한계 초과 → 건축 불가

export type SlopeVerdict = { key: 'ok' | 'warn' | 'block'; label: string; color: string };

export function slopeVerdict(deg: number): SlopeVerdict {
  return deg <= SLOPE_EASY_DEG ? { key: 'ok', label: '양호', color: '#3dd68c' }
    : deg <= SLOPE_MAX_DEG ? { key: 'warn', label: '정지 필요', color: '#e3b341' }
      : { key: 'block', label: '건축 불가', color: '#ed5d5d' };
}

export const SLOPE_LIMITS = { easy: SLOPE_EASY_DEG, max: SLOPE_MAX_DEG };

/**
 * 도로 구간 종단경사 → 통행 등급 (차량 원활/차량 급/도보 전용).
 *
 * 원래 `placement.ts`의 `PlacementManager._roadGrade` static 메서드였다 — 같은
 * 이유(순수 임계값 분류인데 Cesium 커플링 파일에 갇혀 있었다)로 여기 옮겼다.
 * `PlacementManager._roadGrade`는 이 함수로 위임하는 얇은 래퍼로 남는다.
 */
export const ROAD_GRADE_VEHICLE_DEG = 10;   // 이하: 차량 원활
export const ROAD_GRADE_STEEP_DEG = 17;     // 이하: 차량 가능(급구배), 초과: 도보 전용

export type RoadGrade = { key: 'veh' | 'veh-steep' | 'foot'; label: string; color: string };

export function roadGrade(deg: number): RoadGrade {
  return deg <= ROAD_GRADE_VEHICLE_DEG ? { key: 'veh', label: '차량 원활', color: '#3dd68c' }
    : deg <= ROAD_GRADE_STEEP_DEG ? { key: 'veh-steep', label: '차량 가능(급)', color: '#e3b341' }
      : { key: 'foot', label: '도보 전용', color: '#ed5d5d' };
}
