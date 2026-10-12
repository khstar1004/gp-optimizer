import assert from 'node:assert/strict';
import test from 'node:test';

import { azDelta, azimuthDeg, distM, offset } from '../src/runtime/geo';
import {
  BURN_S, FireSupport, IGNITE_AGL_M, burnIntensity, flareAglM, flareRadiusM,
} from '../src/runtime/fireSupport';

const GP = { lon: 128.12, lat: 38.35 };

test('연소는 점화 직후 최대가 아니고 마지막에 사그라든다', () => {
  assert.equal(burnIntensity(-1), 0);
  assert.ok(burnIntensity(0.2) < 0.3);          // 아직 오르는 중
  assert.ok(burnIntensity(5) > 0.98);           // 최성기
  assert.ok(burnIntensity(BURN_S - 2) < 0.5);   // 꺼져 가는 중
  assert.equal(burnIntensity(BURN_S + 0.1), 0);
});

test('조명탄은 낙하산으로 내려온다 — 고도가 시간에 따라 준다', () => {
  assert.equal(flareAglM(0), IGNITE_AGL_M);
  assert.ok(flareAglM(BURN_S) < flareAglM(0));
  assert.ok(flareAglM(BURN_S) > 0);             // 다 타기 전에 땅에 닿지는 않는다
  assert.equal(flareAglM(10_000), 0);           // 음수 고도는 없다
});

test('안개 속 조명은 역산란으로 스스로를 가린다 — 반경이 가시거리에 묶인다', () => {
  assert.equal(flareRadiusM(2000, 26_000), 2000);   // 청천이면 제원 그대로
  assert.equal(flareRadiusM(2000, 1000), 850);      // 가시거리 1km → 850m
  assert.equal(flareRadiusM(2000, 50), 120);        // 바닥값 아래로는 안 내려간다
});

test('조명은 시간을 가진 사건이다 — 쏘면 켜지고 타면 꺼진다', () => {
  const fs = new FireSupport();
  const t0 = 1_000_000;
  fs.fire({ lon: GP.lon, lat: GP.lat, groundH: 1000, specRadiusM: 2000, visibilityMeters: 26_000, nowMs: t0 });

  assert.equal(fs.active(t0 + 5000).length, 1);
  assert.equal(fs.active(t0 + (BURN_S + 1) * 1000).length, 0);

  assert.equal(fs.prune(t0 + 5000), false);     // 아직 타는 중이면 그대로
  assert.equal(fs.prune(t0 + (BURN_S + 1) * 1000), true);
  assert.equal(fs.shots.length, 0);
});

test('조명 반경 밖은 조명받지 않는다', () => {
  const fs = new FireSupport();
  const t0 = 0;
  fs.fire({ lon: GP.lon, lat: GP.lat, groundH: 1000, specRadiusM: 2000, visibilityMeters: 26_000, nowMs: t0 });
  const inside = offset(GP.lon, GP.lat, 90, 1500);
  const outside = offset(GP.lon, GP.lat, 90, 2500);
  assert.equal(fs.isIlluminated(inside.lon, inside.lat, t0 + 5000, distM), true);
  assert.equal(fs.isIlluminated(outside.lon, outside.lat, t0 + 5000, distM), false);
});

test('꺼져 가는 조명은 관측을 되살리지 못한다 — 밝기 절반이 문턱', () => {
  const fs = new FireSupport();
  const t0 = 0;
  fs.fire({ lon: GP.lon, lat: GP.lat, groundH: 1000, specRadiusM: 2000, visibilityMeters: 26_000, nowMs: t0 });
  assert.equal(fs.isIlluminated(GP.lon, GP.lat, t0 + 5000, distM), true);
  // 마지막 2초는 밝기 0.4 아래 — 조명 지원으로 치지 않는다
  assert.equal(fs.isIlluminated(GP.lon, GP.lat, t0 + (BURN_S - 1) * 1000, distM), false);
});

test('저시정에서 발사하면 역산란 경고가 붙는다', () => {
  const fs = new FireSupport();
  const clear = fs.fire({ lon: GP.lon, lat: GP.lat, groundH: 1000, specRadiusM: 2000, visibilityMeters: 26_000, nowMs: 0 })!;
  const fog = fs.fire({ lon: GP.lon, lat: GP.lat, groundH: 1000, specRadiusM: 2000, visibilityMeters: 800, nowMs: 0 })!;
  assert.equal(clear.backscatter, false);
  assert.equal(fog.backscatter, true);
  assert.ok(fog.radiusM < clear.radiusM);
});

test('여러 발이 동시에 떠 있으면 밝은 것부터 나온다', () => {
  const fs = new FireSupport();
  fs.fire({ lon: GP.lon, lat: GP.lat, groundH: 1000, specRadiusM: 2000, visibilityMeters: 26_000, nowMs: 0 });
  fs.fire({ lon: GP.lon, lat: GP.lat, groundH: 1000, specRadiusM: 2000, visibilityMeters: 26_000, nowMs: 20_000 });
  const act = fs.active(21_000);          // 첫 발은 사그라드는 중, 둘째는 막 오름
  assert.equal(act.length, 2);
  assert.ok(act[0].intensity >= act[1].intensity);
});

// ── 감시 부채꼴 기준 조명 판정 ────────────────────────────────────────
const geo = { distM, azimuthDeg, azDelta };
const fan = (over = {}) => ({ lon: GP.lon, lat: GP.lat, aimAz: 0, fovDeg: 90, rangeM: 3500, ...over });

function litAt(azDeg: number, distMeters: number) {
  const fs = new FireSupport();
  const q = offset(GP.lon, GP.lat, azDeg, distMeters);
  fs.fire({ lon: q.lon, lat: q.lat, groundH: 900, specRadiusM: 520, visibilityMeters: 26_000, nowMs: 0 });
  return fs;
}

test('내가 보는 땅이 밝으면 조명 지원을 받는다 — 관측점 자신이 아니라', () => {
  assert.equal(litAt(0, 1500).illuminatesFan(fan(), 5000, geo), true);
});

test('부채꼴 밖에 뜬 조명은 도움이 되지 않는다', () => {
  assert.equal(litAt(180, 1500).illuminatesFan(fan(), 5000, geo), false);
});

test('사거리 밖에 뜬 조명도 도움이 되지 않는다', () => {
  assert.equal(litAt(0, 9000).illuminatesFan(fan(), 5000, geo), false);
});

test('부채꼴 경계에 걸친 조명은 반경만큼의 여유를 받는다 — 원은 경계를 가로지른다', () => {
  // 정확히 ±45° 밖(50°)이어도, 가까이 뜬 520m 짜리 원은 부채꼴 안까지 걸친다
  assert.equal(litAt(50, 900).illuminatesFan(fan(), 5000, geo), true);
  // 같은 각도라도 멀리 뜨면 그 여유가 사라진다
  assert.equal(litAt(50, 6000).illuminatesFan(fan({ rangeM: 9000 }), 5000, geo), false);
});

test('전방위 자산은 방위와 무관하게 조명을 받는다', () => {
  assert.equal(litAt(180, 800).illuminatesFan(fan({ fovDeg: 360 }), 5000, geo), true);
});

test('꺼져 가는 조명은 부채꼴 판정에서도 빠진다', () => {
  const fs = litAt(0, 1500);
  assert.equal(fs.illuminatesFan(fan(), 5000, geo), true);
  assert.equal(fs.illuminatesFan(fan(), (BURN_S - 1) * 1000, geo), false);
});
