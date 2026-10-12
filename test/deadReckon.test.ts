import assert from 'node:assert/strict';
import test from 'node:test';

import { distM, offset } from '../src/runtime/geo';
import { deadReckon, weaponEntry } from '../src/runtime/tracking';

const GP = { lon: 128.125, lat: 38.328 };
const moving = (courseDeg: number, speedMps: number) => ({ ok: true, speedMps, courseDeg, spanS: 10, climbMps: 0 });

test('정지한 표적은 밀지 않는다 — 예측을 지어내면 그것이 곧 오보다', () => {
  assert.equal(deadReckon(GP, moving(180, 0), 60), null);
  assert.equal(deadReckon(GP, { ok: false } as never, 60), null);
});

test('등속 직선으로만 민다 — 60초 뒤 위치가 속도×시간만큼 떨어져 있다', () => {
  const p = deadReckon(GP, moving(180, 1.5), 60)!;
  const d = distM(GP.lon, GP.lat, p.lon, p.lat);
  assert.ok(Math.abs(d - 90) < 1.5, `${d}`);
  assert.ok(p.lat < GP.lat, '남쪽으로 갔어야 한다');
});

test('진로에 따라 방향이 맞는다', () => {
  const east = deadReckon(GP, moving(90, 2), 100)!;
  assert.ok(east.lon > GP.lon && Math.abs(east.lat - GP.lat) < 1e-4);
  const north = deadReckon(GP, moving(0, 2), 100)!;
  assert.ok(north.lat > GP.lat && Math.abs(north.lon - GP.lon) < 1e-4);
});

// ── 화기 사거리 진입 ──────────────────────────────────────────────────
const k6 = { uid: 'w1', name: 'K6-01', short: 'K6', color: '#f2a33c', lon: GP.lon, lat: GP.lat, rangeM: 1800 };

test('이미 사거리 안이면 진입까지 0초다', () => {
  const near = offset(GP.lon, GP.lat, 0, 1000);
  const [r] = weaponEntry(near, moving(180, 1.4), [k6]);
  assert.equal(r.inS, 0);
  assert.ok(Math.abs(r.atM - 1000) < 5);
});

test('접근 중이면 몇 초 뒤에 드는지가 답이다 — 「밖이다」로는 준비를 못 한다', () => {
  const far = offset(GP.lon, GP.lat, 0, 2200);        // 400m 밖
  const [r] = weaponEntry(far, moving(180, 2), [k6], { stepS: 5 });
  assert.ok(r.inS > 0 && r.inS <= 220, `${r.inS}`);   // 400m / 2m/s ≈ 200s
  assert.ok(Math.abs(r.inS - 200) <= 10, `${r.inS}`);
});

test('멀어지는 표적은 사거리에 들지 않는다 — 목록에서 빠진다', () => {
  const far = offset(GP.lon, GP.lat, 0, 2200);
  assert.equal(weaponEntry(far, moving(0, 2), [k6]).length, 0);
});

test('정지한 표적이 사거리 밖이면 진입 예측이 없다', () => {
  const far = offset(GP.lon, GP.lat, 0, 2200);
  assert.equal(weaponEntry(far, moving(180, 0), [k6]).length, 0);
});

test('지평선 밖(너무 먼 미래)은 답하지 않는다', () => {
  const far = offset(GP.lon, GP.lat, 0, 5000);
  assert.equal(weaponEntry(far, moving(180, 1), [k6], { horizonS: 600 }).length, 0);
  assert.equal(weaponEntry(far, moving(180, 1), [k6], { horizonS: 4000, stepS: 20 }).length, 1);
});

test('여러 화기는 빨리 드는 것부터 나온다', () => {
  const agl = { ...k6, uid: 'w2', name: 'K4-01', short: 'K4', rangeM: 2200 };
  const far = offset(GP.lon, GP.lat, 0, 2600);
  const res = weaponEntry(far, moving(180, 2), [k6, agl], { stepS: 5 });
  assert.equal(res.length, 2);
  assert.equal(res[0].short, 'K4');            // 사거리가 길어 먼저 든다
  assert.ok(res[0].inS < res[1].inS);
});
