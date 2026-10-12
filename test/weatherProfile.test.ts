/**
 * 날씨 묘사 제원 시험.
 *
 * GLSL 은 화면으로만 검증되지만, 눈·비·안개가 실감나느냐를 실제로 정하는 것은
 * 셰이더 문법이 아니라 여기 나오는 숫자들이다. 그래서 그 숫자만 순수 함수로
 * 빼두고, 화면 없이 못박는다.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { environmentState, DEFAULT_ENVIRONMENT } from '../src/runtime/environmentModel';
import { fogProfile, precipitationProfile, groundSnowProfile } from '../src/runtime/weatherProfile';
import type { FogProfile } from '../src/runtime/weatherProfile';

const GP = { latitude: 38.328, longitude: 128.125, utcOffsetHours: 9 };
/** GP-107 은 표고 1,025m 능선 정상부이고 북측 저지대를 217m 감제한다. */
const RIDGE_M = 1025;
const VALLEY_M = RIDGE_M - 220;

const env = (overrides = {}) => environmentState({ ...DEFAULT_ENVIRONMENT, ...overrides }, GP);

// ── 안개 ────────────────────────────────────────────────────────────────────

/** 셰이더가 하는 수평 적분을 그대로 재현한다 — 그 고도에서 distanceM 를 볼 때의 소광. */
function opacityAt(p: FogProfile, heightM: number, distanceM: number) {
  const smoothstep = (e0: number, e1: number, x: number) => {
    const t = Math.max(0, Math.min(1, (x - e0) / (e1 - e0)));
    return t * t * (3 - 2 * t);
  };
  const capped = 1 - smoothstep(p.topHeightM - p.featherM, p.topHeightM + p.featherM, heightM);
  const rho = p.residualBetaPerMeter + (p.betaPerMeter - p.residualBetaPerMeter) * capped;
  return (1 - Math.exp(-rho * distanceM)) * p.maxOpacity;
}

test('안개는 뚜껑이 덮인 층이다 — 계곡 복사안개는 얕고, 연무는 사실상 균질하다', () => {
  const fog = fogProfile(env({ weather: 'fog', intensity: 0.9 }), VALLEY_M);
  const clear = fogProfile(env({ weather: 'clear', intensity: 0.3 }), VALLEY_M);
  // 계곡 안개층 두께는 능선 감제고(220m) 규모여야 한다. 그보다 훨씬 두꺼우면
  // 능선 초소가 안개 위로 머리를 내밀 수 없고, 그러면 층으로 만든 의미가 없다.
  const depth = fog.topHeightM - VALLEY_M;
  assert.ok(depth > 50 && depth < 260, `안개층 두께 ${depth}m`);
  // 그리고 그 뚜껑은 날카롭다 — 역전층은 수십 m 안에서 끝난다.
  assert.ok(fog.featherM < 60, `뚜껑 두께 ${fog.featherM}m`);
  // 연무는 반대다: 시야 안에 뚜껑이 없다.
  assert.ok(clear.topHeightM > VALLEY_M + 5000, `연무 상단 ${clear.topHeightM}m`);
  assert.equal(clear.residualBetaPerMeter, clear.betaPerMeter, '연무는 고도 구조가 없다');
});

test('안개만 뚜껑을 갖는다 — 강수·연무는 시야 전체를 고르게 채운다', () => {
  const fog = fogProfile(env({ weather: 'fog', intensity: 0.8 }), VALLEY_M);
  assert.ok(fog.residualBetaPerMeter < fog.betaPerMeter / 10, '안개 위는 맑은 공기다');
  for (const weather of ['clear', 'cloudy', 'overcast', 'rain', 'snow']) {
    const p = fogProfile(env({ weather, intensity: 0.8 }), VALLEY_M);
    assert.equal(p.residualBetaPerMeter, p.betaPerMeter, `${weather} 는 균질해야 한다`);
    assert.ok(p.topHeightM > VALLEY_M + 5000, `${weather} 상단 ${p.topHeightM}`);
  }
});

test('중간 세기 안개에서 능선 초소는 안개 바다 위로 머리를 내민다', () => {
  const p = fogProfile(env({ weather: 'fog', intensity: 0.55 }), VALLEY_M);
  const inValley = opacityAt(p, VALLEY_M + 10, 1000);
  const onRidge = opacityAt(p, RIDGE_M + 18, 1000);   // 탑 위 관측고
  assert.ok(inValley > 0.75, `계곡 1km 소광 ${inValley.toFixed(2)}`);
  assert.ok(onRidge < 0.2, `능선 1km 소광 ${onRidge.toFixed(2)}`);
  assert.ok(inValley - onRidge > 0.55, '층이 보이려면 둘 사이가 벌어져야 한다');
});

test('가장 짙은 안개에서는 초소까지 잠긴다 — 슬라이더가 양쪽 끝을 다 낸다', () => {
  const p = fogProfile(env({ weather: 'fog', intensity: 1 }), VALLEY_M);
  assert.ok(p.topHeightM > RIDGE_M, `상단 ${p.topHeightM} 이 능선 ${RIDGE_M} 아래면 GP 는 절대 안개에 잠기지 않는다`);
  assert.ok(opacityAt(p, RIDGE_M + 18, 1000) > 0.8, '최대 세기에서는 능선도 지워져야 한다');
});

test('맑은 날 원경은 옅어지기만 하고 지워지지는 않는다', () => {
  const p = fogProfile(env({ weather: 'clear', intensity: 0.3 }), VALLEY_M);
  assert.ok(p.maxOpacity < 0.35, `맑은 날 상한 ${p.maxOpacity}`);
  // 5km 밖 능선도 형태는 남아야 한다.
  const tau = p.betaPerMeter * 5000;
  assert.ok((1 - Math.exp(-tau)) * p.maxOpacity < 0.3);
});

test('가시거리가 1km 아래로 떨어지면 하늘도 같은 회색이 된다', () => {
  const thick = fogProfile(env({ weather: 'fog', intensity: 1 }), VALLEY_M);
  const clear = fogProfile(env({ weather: 'clear', intensity: 0 }), VALLEY_M);
  assert.ok(thick.skyBlend > 0.85, `짙은 안개 하늘 ${thick.skyBlend}`);
  assert.ok(clear.skyBlend < 0.02, `맑은 날 하늘 ${clear.skyBlend}`);
});

test('Cesium 내장 안개는 LOD 완화용 값만 받는다 — 보이는 소광은 포스트프로세스가 맡는다', () => {
  for (const weather of ['clear', 'fog', 'snow', 'rain', 'overcast', 'cloudy']) {
    for (const intensity of [0, 0.5, 1]) {
      const p = fogProfile(env({ weather, intensity }), VALLEY_M);
      assert.ok(p.cesiumDensity >= 5e-5 && p.cesiumDensity <= 1e-3,
        `${weather}/${intensity}: ${p.cesiumDensity}`);
      // 실제 소광은 언제나 내장 안개보다 크다 — 그래야 넘겨받은 의미가 있다.
      assert.ok(p.betaPerMeter >= p.cesiumDensity);
    }
  }
});

// ── 강수 ────────────────────────────────────────────────────────────────────

test('안 내릴 때는 아무 층도 만들지 않는다', () => {
  for (const weather of ['clear', 'cloudy', 'overcast', 'fog']) {
    const p = precipitationProfile(env({ weather, intensity: 1 }));
    assert.equal(p.kind, 'none');
    assert.equal(p.layers.length, 0);
    assert.equal(p.strength, 0);
  }
});

test('세 겹은 시차를 이룬다 — 가까울수록 크고 빠르고 성기다', () => {
  const p = precipitationProfile(env({ weather: 'snow', intensity: 0.8, dayOfYear: 20 }));
  assert.equal(p.layers.length, 3);
  const [far, mid, near] = p.layers;
  assert.ok(far.distanceM > mid.distanceM && mid.distanceM > near.distanceM, '먼→가까운 순서');
  assert.ok(near.radius > mid.radius && mid.radius > far.radius, '가까울수록 크다');
  assert.ok(near.fallSpeed > mid.fallSpeed && mid.fallSpeed > far.fallSpeed, '가까울수록 빠르다');
  assert.ok(near.cellScale < mid.cellScale && mid.cellScale < far.cellScale, '가까울수록 성기다');
});

test('층마다 명목 거리가 있다 — 그래야 캐빈 안에서 눈이 내리지 않는다', () => {
  const p = precipitationProfile(env({ weather: 'snow', intensity: 1, dayOfYear: 20 }));
  // 가장 가까운 층도 손 닿는 거리보다는 멀리 둔다: 관측실 유리(2~3m)는 그 층을
  // 지우고, 100m 밖 사면은 세 층을 모두 통과시킨다.
  const near = p.layers[p.layers.length - 1];
  assert.ok(near.distanceM > 4 && near.distanceM < 12, `근층 거리 ${near.distanceM}m`);
  assert.ok(p.layers[0].distanceM > 50, `원층 거리 ${p.layers[0].distanceM}m`);
});

test('눈은 같은 바람에 비보다 훨씬 크게 눕는다 — 종단속도가 다르기 때문이다', () => {
  // 약풍에서 재야 한다. 강풍에서는 눈이 포화에 붙어(거의 수평) 비와의 비가
  // 눌리는데, 그건 모델이 틀린 게 아니라 실제로 그렇게 되기 때문이다.
  const snow = precipitationProfile(env({ weather: 'snow', intensity: 0, dayOfYear: 20, windMps: 0 }));
  const rain = precipitationProfile(env({ weather: 'rain', intensity: 0, dayOfYear: 200, windMps: 0 }));
  assert.equal(snow.snowiness, 1);
  assert.equal(rain.snowiness, 0);
  // 종단속도 1.2 m/s 대 9 m/s — 같은 바람에 눈이 7배 넘게 눕는다.
  assert.ok(Math.abs(snow.lean) > Math.abs(rain.lean) * 5, `눈 ${snow.lean} vs 비 ${rain.lean}`);

  // 강풍에서는 눈이 거의 수평으로 날리고, 비는 여전히 긋는다.
  const blizzard = precipitationProfile(env({ weather: 'snow', intensity: 0.7, dayOfYear: 20, windMps: 8 }));
  const squall = precipitationProfile(env({ weather: 'rain', intensity: 0.7, dayOfYear: 200, windMps: 8 }));
  assert.ok(Math.abs(blizzard.lean) > 1.4, `폭설 lean ${blizzard.lean}`);
  assert.ok(Math.abs(squall.lean) < 0.9, `호우 lean ${squall.lean}`);
});

test('약한 바람에는 거의 수직으로 떨어진다', () => {
  // windMps 0 이어도 눈 프리셋 자체가 1~5 m/s 돌풍을 얹는다 — 「무풍」은
  // 설정값이 아니라 상태값으로 봐야 한다.
  const calm = precipitationProfile(env({ weather: 'snow', intensity: 0, dayOfYear: 20, windMps: 0 }));
  assert.ok(calm.layers.length === 3);
  assert.ok(Math.abs(calm.lean) < 0.5, `약풍 lean ${calm.lean}`);
  // 그리고 바람이 세지면 단조롭게 눕는다.
  const breeze = precipitationProfile(env({ weather: 'snow', intensity: 0, dayOfYear: 20, windMps: 6 }));
  const gale = precipitationProfile(env({ weather: 'snow', intensity: 0, dayOfYear: 20, windMps: 14 }));
  assert.ok(Math.abs(breeze.lean) > Math.abs(calm.lean));
  assert.ok(Math.abs(gale.lean) > Math.abs(breeze.lean));
});

test('세기는 버튼이 아니라 mm/h 가 정한다', () => {
  const drizzle = precipitationProfile(env({ weather: 'rain', intensity: 0.05, dayOfYear: 200 }));
  const downpour = precipitationProfile(env({ weather: 'rain', intensity: 1, dayOfYear: 200 }));
  assert.ok(drizzle.strength < 0.2, `이슬비 ${drizzle.strength}`);
  assert.equal(downpour.strength, 1);
  // 이슬비에 함박눈만 한 알갱이가 코앞에서 날리면 그것대로 거짓말이다.
  const nearDrizzle = drizzle.layers[2];
  const nearDownpour = downpour.layers[2];
  assert.ok(nearDrizzle.opacity < nearDownpour.opacity * 0.45,
    `근층 기여 ${nearDrizzle.opacity} vs ${nearDownpour.opacity}`);
  assert.ok(nearDrizzle.radius < nearDownpour.radius);
});

test('진눈깨비는 비와 눈 사이에 놓인다', () => {
  // 1~2°C 사이의 「비」는 모델이 진눈깨비로 바꾼다.
  let sleet = null;
  for (let day = 1; day <= 365 && !sleet; day += 1) {
    for (const minute of [420, 600, 840, 1080]) {
      const state = env({ weather: 'rain', intensity: 0.8, dayOfYear: day, minuteOfDay: minute });
      if (state.weather.precipitation === 'sleet') { sleet = precipitationProfile(state); break; }
    }
  }
  assert.ok(sleet, '연중 어딘가에는 진눈깨비 조건이 있어야 한다');
  assert.equal(sleet.kind, 'sleet');
  assert.equal(sleet.snowiness, 0.5);
  assert.equal(sleet.layers.length, 3);
});

test('모든 강수 상태가 유한하고 범위 안인 제원을 낸다', () => {
  for (const weather of ['rain', 'snow']) {
    for (const day of [20, 110, 200, 300]) {
      for (const intensity of [0.1, 0.5, 1]) {
        for (const windMps of [0, 6, 18]) {
          const p = precipitationProfile(env({ weather, intensity, dayOfYear: day, windMps }));
          assert.ok(p.strength >= 0 && p.strength <= 1, `${weather}/${day}: strength`);
          assert.ok(Number.isFinite(p.lean) && Math.abs(p.lean) <= 1.6, `${weather}: lean ${p.lean}`);
          for (const layer of p.layers) {
            for (const [key, value] of Object.entries(layer)) {
              assert.ok(Number.isFinite(value) && value > 0, `${weather} ${key}=${value}`);
            }
            assert.ok(layer.opacity <= 1, `기여도 ${layer.opacity}`);
          }
          for (const channel of p.tint) assert.ok(channel >= 0 && channel <= 1);
        }
      }
    }
  }
});

// ── 적설 ────────────────────────────────────────────────────────────────────

test('눈은 급사면에 붙지 않는다', () => {
  const p = groundSnowProfile(env({ weather: 'snow', intensity: 1, dayOfYear: 20, minuteOfDay: 600 }));
  assert.ok(p.cover > 0.6, `적설 ${p.cover}`);
  // 도보 한계경사(38°)와 차량 한계(24°) 사이에서 눈이 사라지기 시작해야
  // 능선·암벽이 검게 남고 지형이 오히려 또렷해진다.
  assert.ok(p.holdSlopeDeg > 24 && p.holdSlopeDeg < 40, `유지경사 ${p.holdSlopeDeg}`);
  assert.ok(p.shedSlopeDeg > p.holdSlopeDeg && p.shedSlopeDeg < 70, `탈락경사 ${p.shedSlopeDeg}`);
});

test('적설 색은 순백이 아니라 그 시각 하늘빛을 받는다', () => {
  const dawn = groundSnowProfile(env({ weather: 'snow', intensity: 1, dayOfYear: 20, minuteOfDay: 400 }));
  const noon = groundSnowProfile(env({ weather: 'snow', intensity: 1, dayOfYear: 20, minuteOfDay: 720 }));
  const luma = (c: readonly [number, number, number]) => c[0] * 0.2126 + c[1] * 0.7152 + c[2] * 0.0722;
  assert.ok(luma(dawn.color) < luma(noon.color), '새벽 적설은 정오보다 어둡다');
  // 새벽 눈은 푸른 쪽으로 기운다.
  assert.ok(dawn.color[2] > dawn.color[0], `새벽 적설 ${dawn.color}`);
  for (const p of [dawn, noon]) {
    for (const channel of p.color) assert.ok(channel >= 0 && channel <= 1);
  }
});

test('여름에는 적설이 없다 — 눈을 골라도 녹는다', () => {
  const p = groundSnowProfile(env({ weather: 'snow', intensity: 1, dayOfYear: 200, minuteOfDay: 840 }));
  assert.ok(p.cover < 0.05, `여름 적설 ${p.cover}`);
});
