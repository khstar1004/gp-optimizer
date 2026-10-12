/**
 * 토목 판정 순수 함수 단위시험 — `slopeVerdict`(지반 경사→건축 가부),
 * `roadGrade`(접근로 종단경사→통행 등급). 둘 다 `placement.ts`에서 분리됐다
 * (그 파일 상단 주석 참고: Cesium 커플링 때문에 원래 위치에서는 Node 단위시험이
 * 불가능했다).
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { slopeVerdict, SLOPE_LIMITS, roadGrade } from '../src/runtime/siteEngineering';

test('경사 10도 이하는 양호다', () => {
  assert.equal(slopeVerdict(0).key, 'ok');
  assert.equal(slopeVerdict(10).key, 'ok');
});

test('경사 10도 초과 20도 이하는 정지 필요다', () => {
  assert.equal(slopeVerdict(10.1).key, 'warn');
  assert.equal(slopeVerdict(20).key, 'warn');
});

test('경사 20도 초과는 건축 불가다', () => {
  assert.equal(slopeVerdict(20.1).key, 'block');
  assert.equal(slopeVerdict(90).key, 'block');
});

test('SLOPE_LIMITS 가 슬로프벨더의 실제 문턱과 일치한다', () => {
  assert.equal(slopeVerdict(SLOPE_LIMITS.easy).key, 'ok');
  assert.equal(slopeVerdict(SLOPE_LIMITS.easy + 0.01).key, 'warn');
  assert.equal(slopeVerdict(SLOPE_LIMITS.max).key, 'warn');
  assert.equal(slopeVerdict(SLOPE_LIMITS.max + 0.01).key, 'block');
});

test('도로 종단경사 10도 이하는 차량 원활이다', () => {
  assert.equal(roadGrade(0).key, 'veh');
  assert.equal(roadGrade(10).key, 'veh');
});

test('도로 종단경사 10도 초과 17도 이하는 차량 가능(급)이다', () => {
  assert.equal(roadGrade(10.1).key, 'veh-steep');
  assert.equal(roadGrade(17).key, 'veh-steep');
});

test('도로 종단경사 17도 초과는 도보 전용이다', () => {
  assert.equal(roadGrade(17.1).key, 'foot');
  assert.equal(roadGrade(45).key, 'foot');
});
