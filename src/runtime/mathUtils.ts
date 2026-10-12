/**
 * 공용 수학 헬퍼 — clamp/lerp 계열이 여러 파일에 따로 정의돼 있던 것을 하나로 모음.
 */

export function clamp(value: number, min: number, max: number): number {
  return value < min ? min : value > max ? max : value;
}

export function clamp01(value: number): number {
  return clamp(value, 0, 1);
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function lerpClamped(a: number, b: number, t: number): number {
  return lerp(a, b, clamp01(t));
}
