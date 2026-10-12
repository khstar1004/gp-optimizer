/**
 * 판정 신호등 — 좋음/주의/나쁨 세 색.
 *
 * 이 세 값(#3dd68c/#e3b341/#ed5d5d)은 감시 커버리지·전원 여유·경사 판정·센서 실효성능 등
 * 도메인이 전혀 다른 19개 파일에서 각자 하드코딩해 왔다. 값이 전부 같았던 것은 지금까지
 * 우연이었을 뿐이다 — 대비(WCAG)를 손보거나 브랜드 톤을 바꿀 때 19곳을 손으로 찾아
 * 고쳐야 하고, 하나라도 놓치면 화면마다 「좋음」의 색이 미묘하게 달라진다.
 *
 * domain/strike.ts 의 GRADE_COLOR 가 이미 이 패턴을 올바르게 쓰고 있다(등급색을 한 곳에서
 * export 해서 판정표와 지도가 절대 어긋나지 않는다) — 이 상수는 같은 원칙을 등급이 셋뿐인
 * 더 단순한 판정(가/부, 원활/급/불가, 충분/여유/부족 등)에 적용한 것이다.
 */
export const STATUS_COLOR = {
  good: '#3dd68c',
  warn: '#e3b341',
  bad: '#ed5d5d',
} as const;

export type StatusLevel = keyof typeof STATUS_COLOR;

/** 임계값 두 개로 좋음/주의/나쁨을 고른다 — 값이 클수록 좋은 지표(커버리지·여유율 등)에 맞는 방향. */
export function statusColorByThreshold(value: number, goodAt: number, warnAt: number): string {
  return value >= goodAt ? STATUS_COLOR.good : value >= warnAt ? STATUS_COLOR.warn : STATUS_COLOR.bad;
}
