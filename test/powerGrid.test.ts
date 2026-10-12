import assert from 'node:assert/strict';
import test from 'node:test';

import {
  STATUS_LABEL, coldFactor, fmtFuelHours, offlineSet, powerBalance, shortfallW,
  type Generator, type PowerAsset,
} from '../src/runtime/powerGrid';

const asset = (uid: string, powerW: number, priority: number): PowerAsset =>
  ({ uid, name: uid.toUpperCase(), short: uid.slice(0, 2).toUpperCase(), powerW, priority });

const gen = (over: Partial<Generator> = {}): Generator => ({
  uid: 'g1', name: '발전기-01', capacityW: 5000, fuelL: 60, idleLph: 0.9, fullLph: 2.4,
  running: true, ...over,
});

test('영상 15℃ 에서는 보정이 없고, 추울수록 소모가 는다', () => {
  assert.equal(coldFactor(15), 1);
  assert.ok(coldFactor(0) > 1.1 && coldFactor(0) < 1.2);
  assert.ok(coldFactor(-20) > 1.4 && coldFactor(-20) < 1.5);
});

test('용량이 넉넉하면 아무것도 끊지 않는다', () => {
  const b = powerBalance([asset('tod', 400, 4), asset('eo', 180, 2)], [gen()], { tempC: 15 });
  assert.equal(b.status, 'OK');
  assert.equal(b.offline.length, 0);
  assert.equal(b.demandW, 580);
  assert.equal(b.marginW, 5000 - 580);
  assert.match(b.note, /여유 4420W/);
});

test('전원이 필요 없는 자산(화기)은 수지에 들어가지 않는다', () => {
  const b = powerBalance([asset('k6', 0, 4), asset('tod', 400, 4)], [gen()]);
  assert.equal(b.nominalW, 400);
  assert.equal(b.offline.length, 0);
});

test('한랭 보정이 요구 전력에 실제로 붙는다', () => {
  const warm = powerBalance([asset('tod', 400, 4)], [gen()], { tempC: 15 });
  const cold = powerBalance([asset('tod', 400, 4)], [gen()], { tempC: -20 });
  assert.ok(cold.demandW > warm.demandW);
  assert.equal(cold.demandW, Math.round(400 * coldFactor(-20)));
});

test('모자라면 우선순위가 낮은 것부터 끊는다 — 야간에 열상을 끄는 부대는 없다', () => {
  const b = powerBalance([
    asset('tod', 900, 4),      // 야간 유일 관측
    asset('radar', 900, 3),    // 전천후 탐지
    asset('eo', 900, 2),       // 주간 광학
    asset('cctv', 900, 1),     // 부가
  ], [gen({ capacityW: 2000 })], { tempC: 15 });
  assert.equal(b.status, 'SHED');
  assert.deepEqual(b.offline.map((o) => o.uid), ['cctv', 'eo']);
  assert.ok(offlineSet(b).has('cctv'));
  assert.ok(!offlineSet(b).has('tod'));
  assert.ok(b.servedW <= b.supplyW);
});

test('같은 우선순위면 큰 부하부터 끊는다 — 하나를 끊어 여럿을 살린다', () => {
  const b = powerBalance([
    asset('big', 1200, 2), asset('small1', 200, 2), asset('small2', 200, 2),
  ], [gen({ capacityW: 800 })], { tempC: 15 });
  assert.deepEqual(b.offline.map((o) => o.uid), ['big']);
  assert.equal(b.servedW, 400);
});

test('발전기가 꺼져 있으면 정전이고, 전원 자산은 전부 멈춘다', () => {
  const b = powerBalance([asset('tod', 400, 4), asset('eo', 180, 2)],
    [gen({ running: false })]);
  assert.equal(b.status, 'BLACKOUT');
  assert.equal(b.supplyW, 0);
  assert.equal(b.offline.length, 2);
  assert.equal(b.servedW, 0);
  assert.match(b.note, /가동 중인 발전기가 없습니다/);
});

test('전원 자산이 아예 없으면 정전이 아니다 — 끊을 것이 없다', () => {
  const b = powerBalance([asset('k6', 0, 4)], []);
  assert.equal(b.status, 'OK');
  assert.equal(b.demandW, 0);
});

test('부하율이 높으면 「빠듯함」으로 미리 말한다', () => {
  const b = powerBalance([asset('tod', 900, 4)], [gen({ capacityW: 1000 })], { tempC: 15 });
  assert.equal(b.status, 'TIGHT');
  assert.equal(b.offline.length, 0);
  assert.equal(STATUS_LABEL[b.status], '빠듯함');
  assert.match(b.note, /한 대만 더 붙여도/);
});

test('발전기는 켜져 있기만 해도 연료를 먹고, 부하가 크면 더 먹는다', () => {
  const light = powerBalance([asset('a', 100, 3)], [gen()], { tempC: 15 });
  const heavy = powerBalance([asset('a', 4500, 3)], [gen()], { tempC: 15 });
  assert.ok(light.fuelHours! > heavy.fuelHours!);
  // 무부하에서도 60L / 0.9Lph ≈ 66시간을 넘지 않는다
  assert.ok(light.fuelHours! < 70);
  assert.ok(heavy.fuelHours! > 20 && heavy.fuelHours! < 30);
});

test('발전기가 없으면 연료 시간을 지어내지 않는다', () => {
  assert.equal(powerBalance([asset('a', 100, 3)], []).fuelHours, null);
  assert.equal(fmtFuelHours(null), '—');
});

test('부족분은 「발전기를 얼마나 더」로 답한다', () => {
  const b = powerBalance([asset('a', 3000, 3), asset('b', 3000, 3)],
    [gen({ capacityW: 5000 })], { tempC: 15 });
  assert.equal(shortfallW(b), 1000);
  assert.equal(shortfallW(powerBalance([asset('a', 100, 3)], [gen()])), 0);
});

test('연료 잔량은 근무 교대가 읽는 시계로 나온다', () => {
  assert.equal(fmtFuelHours(4.2), '4시간 12분');
  assert.equal(fmtFuelHours(0), '0시간 00분');
});

test('여러 발전기를 병렬로 돌리면 용량이 합쳐진다', () => {
  const b = powerBalance([asset('a', 6000, 3)], [
    gen({ uid: 'g1', capacityW: 5000 }), gen({ uid: 'g2', capacityW: 5000 }),
  ], { tempC: 15 });
  assert.equal(b.supplyW, 10_000);
  assert.equal(b.offline.length, 0);
});
