import assert from 'node:assert/strict';
import test from 'node:test';

import { distM } from '../src/runtime/geo';
import {
  DRONE_SPEC, STATE_LABEL, enduranceMin, fleetSummary, gimbalAimDeg, isOnStation, launch,
  makeDrone, orbitPoint, orbitRateDegS, recall, resetDroneSeq, retargetPatrol, stepDrone,
} from '../src/runtime/droneModel';

const GP = { lon: 128.125, lat: 38.328 };
const mk = (over = {}) => makeDrone({
  patrolLon: GP.lon, patrolLat: GP.lat + 0.012, homeLon: GP.lon, homeLat: GP.lat, ...over,
});

/** dtS 초씩 totalS 초를 흘려보낸다 (실제 틱과 같은 잘게 쪼갠 적분) */
function run(d: ReturnType<typeof mk>, totalS: number, dtS = 1) {
  const events: string[] = [];
  for (let t = 0; t < totalS; t += dtS) {
    const e = stepDrone(d, dtS);
    if (e) events.push(e);
  }
  return events;
}

test('번호는 순서대로 발급된다', () => {
  resetDroneSeq(0);
  assert.equal(mk().name, 'UAS-01');
  assert.equal(mk().name, 'UAS-02');
});

test('지상 대기는 배터리를 쓰지도 채우지도 않는다', () => {
  const d = mk({ battery: 0.6 });
  run(d, 600);
  assert.equal(d.battery, 0.6);
  assert.equal(d.state, 'READY');
  assert.equal(isOnStation(d), false);
});

test('출격하면 상승하고, 지정 고도에 닿으면 임무로 바뀐다', () => {
  const d = mk({ aglM: 300 });
  assert.equal(launch(d).ok, true);
  assert.equal(d.state, 'LAUNCH');
  const ev = run(d, 300 / DRONE_SPEC.climbMps + 3);
  assert.equal(d.state, 'PATROL');
  assert.ok(Math.abs(d.curAglM - 300) < 1);
  assert.ok(ev.some((e) => e.includes('감시 개시')));
  assert.equal(isOnStation(d), true);
});

test('이미 떠 있으면 다시 출격하지 않고, 이유를 말한다', () => {
  const d = mk();
  launch(d);
  const r = launch(d);
  assert.equal(r.ok, false);
  assert.match(r.reason!, new RegExp(STATE_LABEL.LAUNCH));
});

test('배터리가 복귀 문턱 이하면 출격을 거절한다', () => {
  const d = mk({ battery: DRONE_SPEC.rtbBattery });
  const r = launch(d);
  assert.equal(r.ok, false);
  assert.match(r.reason!, /복귀 문턱/);
});

test('체공은 유한하다 — 만충 40분에서 25%면 스스로 복귀한다', () => {
  const d = mk({ aglM: 200 });
  launch(d);
  run(d, 60);                                   // 상승 완료
  assert.equal(d.state, 'PATROL');
  // 100% → 25% 까지 30분. 조금 넉넉히 돌린다.
  const ev = run(d, 32 * 60);
  assert.ok(ev.some((e) => e.includes('자동 복귀')), '사람이 잊어도 기체는 돌아와야 한다');
  // assert.equal above narrows the mutable state to PATROL in TS 7; widen
  // this read before checking the state transition produced by the simulator.
  const finalState = d.state as string;
  assert.ok(finalState === 'RTB' || finalState === 'CHARGE');
});

test('복귀하면 착륙하고 충전에 들어가며 소티가 쌓인다', () => {
  const d = mk({ aglM: 150 });
  launch(d);
  run(d, 40);
  recall(d);
  assert.equal(d.state, 'RTB');
  const ev = run(d, 150 / DRONE_SPEC.climbMps + 5);
  assert.equal(d.state, 'CHARGE');
  assert.equal(d.sorties, 1);
  assert.ok(d.flownMin > 0);
  assert.ok(ev.some((e) => e.includes('착륙')));
});

test('충전은 유한한 시간이 걸리고, 끝나면 대기로 돌아온다', () => {
  const d = mk({ battery: 0.5, state: 'CHARGE' });
  run(d, DRONE_SPEC.chargeMin * 60 * 0.4);      // 절반쯤
  assert.ok(d.battery > 0.5 && d.battery < 1);
  assert.equal(d.state, 'CHARGE');
  const ev = run(d, DRONE_SPEC.chargeMin * 60);
  assert.equal(d.state, 'READY');
  assert.equal(d.battery, 1);
  assert.ok(ev.some((e) => e.includes('충전 완료')));
});

test('지상에 있는 기체에 복귀를 지시해도 아무 일도 없다', () => {
  const d = mk();
  const r = recall(d);
  assert.equal(r.ok, false);
  assert.equal(d.state, 'READY');
});

test('궤도는 반경만큼 떨어져 돌고, 반경이 크면 천천히 돈다', () => {
  const d = mk({ radiusM: 900 });
  const p = orbitPoint(d);
  assert.ok(Math.abs(distM(d.patrolLon, d.patrolLat, p.lon, p.lat) - 900) < 5);
  assert.ok(orbitRateDegS(mk({ radiusM: 300 })) > orbitRateDegS(mk({ radiusM: 1800 })));
});

test('짐벌은 늘 순찰 중심을 문다 — 궤도 어디에 있든', () => {
  const d = mk({ radiusM: 900, angleDeg: 0 });     // 중심의 북쪽에 있다
  assert.ok(Math.abs(gimbalAimDeg(d) - 180) < 2, '북쪽에서는 남쪽(중심)을 본다');
  d.angleDeg = 90;                                  // 동쪽
  assert.ok(Math.abs(gimbalAimDeg(d) - 270) < 2, '동쪽에서는 서쪽(중심)을 본다');
});

test('임무 중에는 궤도가 실제로 돈다', () => {
  const d = mk({ radiusM: 600 });
  launch(d); run(d, 60);
  const a0 = d.angleDeg;
  run(d, 30);
  assert.notEqual(d.angleDeg, a0);
});

test('지정 고도를 바꾸면 순간이동이 아니라 상승률대로 따라간다', () => {
  const d = mk({ aglM: 200 });
  launch(d); run(d, 60);
  d.aglM = 600;
  run(d, 10);
  assert.ok(d.curAglM > 200 && d.curAglM < 600, `${d.curAglM}`);
  run(d, 120);
  assert.ok(Math.abs(d.curAglM - 600) < 1);
});

test('순찰 중심을 옮겨도 기체는 순간이동하지 않는다', () => {
  const d = mk({ radiusM: 900, angleDeg: 45 });
  const before = orbitPoint(d);
  retargetPatrol(d, GP.lon + 0.01, GP.lat + 0.03);
  const after = orbitPoint(d);
  assert.ok(distM(before.lon, before.lat, after.lon, after.lat) < 5,
    '중심을 옮기면 각·반경을 다시 맞춰 제자리에 있어야 한다');
});

test('잔여 체공은 배터리에 비례한다', () => {
  assert.equal(enduranceMin(1), DRONE_SPEC.enduranceMin);
  assert.equal(enduranceMin(0.5), DRONE_SPEC.enduranceMin / 2);
  assert.equal(enduranceMin(0), 0);
});

test('편대 요약은 공중·대기·충전과 최단 잔여를 말한다', () => {
  resetDroneSeq(0);
  const a = mk(); launch(a); run(a, 60);
  const b = mk({ battery: 0.4, state: 'CHARGE' });
  const c = mk();
  const s = fleetSummary([a, b, c]);
  assert.match(s, /공중 1/);
  assert.match(s, /대기 1/);
  assert.match(s, /충전 1/);
  assert.match(s, /최단 잔여 \d+분/);
  assert.equal(fleetSummary([]), '편대 없음');
});
