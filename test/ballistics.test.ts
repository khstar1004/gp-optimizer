import assert from 'node:assert/strict';
import test from 'node:test';

import { MIL_PER_RAD, superElevationMil, timeOfFlightS, windDriftMil } from '../src/runtime/ballistics';

test('밀 환산은 NATO 밀이다 — 1 rad = 6400/2π', () => {
  assert.ok(Math.abs(MIL_PER_RAD - 1018.59) < 0.01);
});

test('비행시간은 거리보다 빨리 늘어난다 — 항력이 잔존속도를 깎기 때문', () => {
  const t400 = timeOfFlightS(400);
  const t1600 = timeOfFlightS(1600);
  // 거리는 4배인데 시간은 4배보다 더 걸린다
  assert.ok(t1600 > t400 * 4, `${t1600} vs ${t400 * 4}`);
  // 그렇다고 무한히 늘지는 않는다 — 1600m 를 3초 안에 간다
  assert.ok(t1600 < 3, `${t1600}`);
});

test('0m 의 비행시간은 0 이고 음수 사거리도 0 으로 눌린다', () => {
  assert.equal(timeOfFlightS(0), 0);
  assert.equal(timeOfFlightS(-500), 0);
});

test('고각은 사거리에 따라 단조 증가한다 — 눈금 순서가 뒤집히면 사다리가 거짓말이 된다', () => {
  let prev = 0;
  for (const r of [200, 400, 800, 1200, 1600, 1800, 2200]) {
    const mil = superElevationMil(r);
    assert.ok(mil > prev, `${r}m 에서 ${mil} ≤ ${prev}`);
    prev = mil;
  }
});

test('눈금 간격은 위로 갈수록 좁아진다 — 낙차가 거리의 제곱으로 늘기 때문', () => {
  // 400m 구간마다의 증분이 계속 커진다 = 화면에서는 눈금이 아래로 벌어진다
  const d1 = superElevationMil(800) - superElevationMil(400);
  const d2 = superElevationMil(1200) - superElevationMil(800);
  const d3 = superElevationMil(1600) - superElevationMil(1200);
  assert.ok(d2 > d1, `${d2} ≤ ${d1}`);
  assert.ok(d3 > d2, `${d3} ≤ ${d2}`);
});

test('K6 유효사거리대의 고각이 실물 사격표 자릿수 안에 든다', () => {
  // 800m 에서 한 자릿수 밀, 1800m 에서 스무 밀 안팎 — 수십·수백 밀이면 모델이 틀린 것
  const m800 = superElevationMil(800);
  const m1800 = superElevationMil(1800);
  assert.ok(m800 > 3 && m800 < 12, `800m: ${m800}`);
  assert.ok(m1800 > 12 && m1800 < 35, `1800m: ${m1800}`);
});

test('편류는 횡풍과 비행시간에 함께 비례하고, 무풍이면 0 이다', () => {
  assert.equal(windDriftMil(1000, 0), 0);
  const w5 = windDriftMil(1000, 5);
  const w10 = windDriftMil(1000, 10);
  assert.ok(Math.abs(w10 - w5 * 2) < 1e-9);
  // 같은 바람이라도 멀수록 더 밀린다
  assert.ok(windDriftMil(1800, 5) > w5);
});

test('맞바람 부호는 그대로 살아 나온다 — 좌우 편류가 한쪽으로만 나면 조준이 틀어진다', () => {
  assert.ok(windDriftMil(1200, -6) < 0);
  assert.ok(Math.abs(windDriftMil(1200, -6) + windDriftMil(1200, 6)) < 1e-9);
});
