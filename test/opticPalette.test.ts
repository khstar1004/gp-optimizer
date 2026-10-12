import assert from 'node:assert/strict';
import test from 'node:test';

// opticFx 는 모듈 최상위에서 Cesium 을 만지지 않는다(셰이더 문자열과 프리셋뿐) —
// 그래서 극성 결정 규칙만 노드에서 그대로 시험할 수 있다.
import { NVG_SWITCH_LUX, resolvePalette } from '../src/runtime/opticFx';

const lwir = { band: 'lwir', nightNvg: false };
const eo = { band: 'vis', nightNvg: true };
const radar = { band: 'radar', nightNvg: false };
const eyeNoNvg = { band: 'eye', nightNvg: false };

test('열상은 조도와 무관하게 열상이다 — 밤낮으로 화면이 바뀌면 그건 열상이 아니다', () => {
  assert.equal(resolvePalette(lwir, { lux: 90_000 }), 'wh');
  assert.equal(resolvePalette(lwir, { lux: 0.0001 }), 'wh');
});

test('레이더는 인광 콘솔로 고정된다', () => {
  assert.equal(resolvePalette(radar, { lux: 90_000 }), 'radar');
});

test('EO 는 조도가 떨어지면 야시로 넘어간다 (I² 자동 전환)', () => {
  assert.equal(resolvePalette(eo, { lux: 20_000 }), 'vis');
  assert.equal(resolvePalette(eo, { lux: NVG_SWITCH_LUX }), 'vis');        // 문턱 자체는 아직 주간
  assert.equal(resolvePalette(eo, { lux: NVG_SWITCH_LUX - 0.1 }), 'nvg');  // 문턱을 넘는 순간 전환
  assert.equal(resolvePalette(eo, { lux: 0.2 }), 'nvg');
});

test('야시관이 없는 광학은 어두워도 주간 화면 그대로다 — 없는 기능을 켜 주면 거짓말이 된다', () => {
  assert.equal(resolvePalette(eyeNoNvg, { lux: 0.001 }), 'vis');
});

test('운용자가 극성을 직접 눌렀으면 그것이 이긴다', () => {
  assert.equal(resolvePalette(lwir, { manual: 'bh', lux: 90_000 }), 'bh');
  assert.equal(resolvePalette(eo, { manual: 'wh', lux: 0.1 }), 'wh');
});

test('조도를 모르면 주간으로 본다 — 모른다는 이유로 야시를 켜면 화면이 초록으로 잠긴다', () => {
  assert.equal(resolvePalette(eo, {}), 'vis');
});
