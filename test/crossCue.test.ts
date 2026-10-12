import assert from 'node:assert/strict';
import test from 'node:test';

import { offset } from '../src/runtime/geo';
import { CUE_LABEL, cueSolution, cueSummary, cueable } from '../src/runtime/crossCue';

const GP = { lon: 128.12, lat: 38.35 };

function post(over: Partial<Record<string, unknown>> = {}) {
  return {
    uid: 'sp1', name: 'IR-01', type: 'ir', short: 'IR', color: '#f28dbb',
    lon: GP.lon, lat: GP.lat, eyeH: 1010, aimAz: 0, fov: 60, feed: 'ir',
    ...over,
  } as never;
}

const perf = (range: number) => () => ({ range, dri: [range, range * 0.34, range * 0.17] });

test('현 지향 안·실효거리 안·가시선 열림이면 즉시 관측', () => {
  const t = offset(GP.lon, GP.lat, 10, 800);            // 지향 0°, 시야 ±30° 안
  const [r] = cueSolution([post()], t, { perfOf: perf(2800) });
  assert.equal(r.verdict, 'READY');
  assert.equal(r.inFovNow, true);
  assert.equal(r.grade, '인지');   // 800m ≤ 인지거리 952m
});

test('시야 밖이면 「지향 전환 필요」— 부채꼴은 돌릴 수 있으니 불가가 아니다', () => {
  const t = offset(GP.lon, GP.lat, 120, 800);           // 지향 0°에서 120° 벗어남
  const [r] = cueSolution([post()], t, { perfOf: perf(2800) });
  assert.equal(r.verdict, 'SLEW');
  assert.ok(Math.abs(r.slewDeg - 120) < 1.5);
  assert.match(r.reason, /지향 12\d° 전환/);
});

test('전방위 자산은 언제나 시야 안이다', () => {
  const t = offset(GP.lon, GP.lat, 200, 500);
  const [r] = cueSolution([post({ fov: 360 })], t, { perfOf: perf(900) });
  assert.equal(r.verdict, 'READY');
});

test('실효거리를 넘으면 사거리 초과 — 청천 제원이 아니라 지금의 실효거리로 잰다', () => {
  const t = offset(GP.lon, GP.lat, 0, 3000);
  const clear = cueSolution([post()], t, { perfOf: perf(3500) })[0];
  const snow = cueSolution([post()], t, { perfOf: perf(1200) })[0];
  assert.equal(clear.verdict, 'READY');
  assert.equal(snow.verdict, 'FAR');
  assert.match(snow.reason, /실효 1200m < 표적 300\dm/);
});

test('능선에 막히면 지향을 돌려도 소용없다 — 사거리·시야보다 먼저 판정된다', () => {
  const t = offset(GP.lon, GP.lat, 120, 800);           // 시야 밖이기도 하다
  const [r] = cueSolution([post()], t, { perfOf: perf(2800), losOk: () => false });
  assert.equal(r.verdict, 'MASKED');
  assert.match(r.reason, /능선 차폐/);
  assert.equal(r.grade, '—');
});

test('화면 채널이 없는 자산은 인계 대상이 아니다', () => {
  const t = offset(GP.lon, GP.lat, 0, 400);
  const [r] = cueSolution([post({ type: 'acoustic', feed: 'none' })], t, { perfOf: () => null });
  assert.equal(r.verdict, 'BLIND');
  assert.equal(CUE_LABEL[r.verdict], '관측 불가');
});

test('등급은 거리에 따라 탐지·인지·식별로 갈린다', () => {
  const near = offset(GP.lon, GP.lat, 0, 300);
  const mid = offset(GP.lon, GP.lat, 0, 700);
  const far = offset(GP.lon, GP.lat, 0, 2000);
  const g = (t: { lon: number; lat: number }) => cueSolution([post()], t, { perfOf: perf(2800) })[0].grade;
  assert.equal(g(near), '식별');   // ≤ 476m
  assert.equal(g(mid), '인지');    // ≤ 952m
  assert.equal(g(far), '탐지');
});

test('좋은 판정이 먼저, 같은 판정이면 가까운 것이 먼저 온다', () => {
  const t = offset(GP.lon, GP.lat, 0, 1000);
  const near = post({ uid: 'a', name: 'IR-01', lon: offset(GP.lon, GP.lat, 0, 200).lon, lat: offset(GP.lon, GP.lat, 0, 200).lat });
  const farReady = post({ uid: 'b', name: 'IR-02' });
  const masked = post({ uid: 'c', name: 'IR-03' });
  const res = cueSolution([masked, farReady, near], t, {
    perfOf: perf(2800),
    losOk: (p) => p.uid !== 'c',
  });
  assert.deepEqual(res.map((r) => r.post.uid), ['a', 'b', 'c']);
});

test('요약문은 인계 가능 자산이 없을 때 그 이유를 적는다', () => {
  const t = offset(GP.lon, GP.lat, 0, 6000);
  const res = cueSolution([post(), post({ uid: 'sp2', name: 'IR-02' })], t, {
    perfOf: perf(2800), losOk: (p) => p.uid === 'sp1',
  });
  assert.equal(cueable(res).length, 0);
  const s = cueSummary(res);
  assert.match(s, /인계 가능 자산 없음/);
  assert.match(s, /차폐 1/);
  assert.match(s, /사거리 초과 1/);
});

test('요약문은 인계된 자산을 거리·등급과 함께 적는다', () => {
  const t = offset(GP.lon, GP.lat, 0, 800);
  const res = cueSolution([post(), post({ uid: 'sp2', name: 'EO-02', short: 'EO' })], t, { perfOf: perf(2800) });
  const s = cueSummary(res);
  assert.match(s, /2개 자산 인계/);
  assert.match(s, /0\.8km 인지/);
});
