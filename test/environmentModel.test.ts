// @ts-nocheck
/**
 * 환경 모델 고정 시험.
 *
 * 이식 원본: ufs-physical-ai-operations-repo `tests/environment-model.test.ts`.
 * 모델을 1:1 로 옮겨왔으니 시험도 함께 옮겨온다 — 시험 없는 모델은 다음 편집
 * 한 번이면 아무도 믿을 수 없게 된다.
 *
 * 사이트만 GP-107(38.328°N, 128.125°E) 로 바꿨고, 그래서 **위도·경도에 딸린
 * 수치는 다시 계산한 것**이다. 양평(127.5°E)의 「정오 12:30」을 그대로 베끼면
 * 시험이 아니라 다른 사이트의 정답을 외운 것이 된다.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_ENVIRONMENT, WEATHER_ORDER,
  environmentState, fogDensityPerMeter, formatClock, formatSeasonDate,
  horizonCrossings, illuminanceLux, moonPhase, rgbToHex, seasonAt,
  skyDirection, solarNoonMinute, solarPosition,
} from '../src/runtime/environmentModel';

/** 모델은 순수 JS 라 타입을 들고 있지 않다 — 시험이 쓰는 모양만 여기서 못박는다. */
type EnvironmentSite = { latitude: number; longitude: number; utcOffsetHours: number };

/** GP-107 (합성 좌표). KST 는 서머타임이 없다. */
const GP: EnvironmentSite = { latitude: 38.328, longitude: 128.125, utcOffsetHours: 9 };
/** 후방 허브 — GP 보다 남쪽이고 경도는 거의 같다. */
const HUB: EnvironmentSite = { latitude: 38.262, longitude: 128.128, utcOffsetHours: 9 };

const SUMMER_SOLSTICE = 172;
const WINTER_SOLSTICE = 355;
const VERNAL_EQUINOX = 80;

const settings = (overrides = {}) => ({ ...DEFAULT_ENVIRONMENT, ...overrides });

test('GP-107 의 남중은 12:27 KST 근처다 — 사이트가 KST 자오선에서 서쪽으로 6.9° 있다', () => {
  // KST 는 135°E 기준. GP 는 128.125°E 라 시계가 정오라고 해도 태양은 아직
  // 자오선에 오지 않았고, 연중 내내 30분쯤 늦게 남중한다.
  for (const day of [VERNAL_EQUINOX, SUMMER_SOLSTICE, WINTER_SOLSTICE]) {
    const noon = solarNoonMinute(GP, day);
    assert.ok(noon > 12 * 60 + 10 && noon < 12 * 60 + 50, `day ${day}: 남중 ${formatClock(noon)}`);
    // 그리고 그 순간 태양은 실제로 정남에 있다 (1° 이내).
    const position = solarPosition(GP, day, noon);
    assert.ok(Math.abs(position.azimuthDeg - 180) < 1, `day ${day}: 방위 ${position.azimuthDeg.toFixed(2)}`);
  }
});

test('남중고도는 지·동지에 90 − 위도 ± 황도경사와 맞는다', () => {
  const lat = GP.latitude;
  const summer = solarPosition(GP, SUMMER_SOLSTICE, solarNoonMinute(GP, SUMMER_SOLSTICE));
  const winter = solarPosition(GP, WINTER_SOLSTICE, solarNoonMinute(GP, WINTER_SOLSTICE));
  const equinox = solarPosition(GP, VERNAL_EQUINOX, solarNoonMinute(GP, VERNAL_EQUINOX));
  assert.ok(Math.abs(summer.altitudeDeg - (90 - lat + 23.44)) < 1, `하지 ${summer.altitudeDeg.toFixed(2)}°`);
  assert.ok(Math.abs(winter.altitudeDeg - (90 - lat - 23.44)) < 1, `동지 ${winter.altitudeDeg.toFixed(2)}°`);
  assert.ok(Math.abs(equinox.altitudeDeg - (90 - lat)) < 1.5, `춘분 ${equinox.altitudeDeg.toFixed(2)}°`);
  // 계절 슬라이더가 있어야 하는 이유: 12월 예행의 태양은 8월의 절반도 못 올라간다.
  assert.ok(winter.altitudeDeg < summer.altitudeDeg / 2);
});

test('해는 동에서 떠 서로 지고, 38°N 에서 남쪽을 지난다', () => {
  const day = VERNAL_EQUINOX;
  const morning = solarPosition(GP, day, 7 * 60);
  const evening = solarPosition(GP, day, 17 * 60);
  assert.ok(morning.azimuthDeg > 60 && morning.azimuthDeg < 120, `아침 방위 ${morning.azimuthDeg.toFixed(1)}`);
  assert.ok(evening.azimuthDeg > 240 && evening.azimuthDeg < 300, `저녁 방위 ${evening.azimuthDeg.toFixed(1)}`);
  // 그리고 렌더러 프레임에서 그것은 일출 +X, 일몰 −X 이고 남중한 해는 +Z(남)이다.
  assert.ok(morning.direction.x > 0.4, `아침 +X ${morning.direction.x.toFixed(2)}`);
  assert.ok(evening.direction.x < -0.4, `저녁 −X ${evening.direction.x.toFixed(2)}`);
  const noon = solarPosition(GP, day, solarNoonMinute(GP, day));
  assert.ok(noon.direction.z > 0, '북반구의 남중한 해는 남쪽, 곧 +Z 에 선다');
  assert.ok(noon.direction.y > 0.7, '그리고 높다');
});

test('skyDirection 은 방위 프레임을 지킨다 — 북이 −Z, 동이 +X', () => {
  const north = skyDirection(0, 0);
  const east = skyDirection(0, 90);
  const up = skyDirection(90, 0);
  assert.ok(north.z < -0.99 && Math.abs(north.x) < 1e-9);
  assert.ok(east.x > 0.99 && Math.abs(east.z) < 1e-9);
  assert.ok(up.y > 0.99);
});

test('GP-107 의 낮 길이는 6월 약 14시간 55분, 12월 약 9시간 25분', () => {
  // 양평(37.5°N)보다 0.8° 북쪽이라 여름은 더 길고 겨울은 더 짧다.
  const summer = horizonCrossings(GP, SUMMER_SOLSTICE, 90.833);
  const winter = horizonCrossings(GP, WINTER_SOLSTICE, 90.833);
  assert.ok(summer.rise !== undefined && summer.set !== undefined);
  assert.ok(winter.rise !== undefined && winter.set !== undefined);
  const summerLength = summer.set - summer.rise;
  const winterLength = winter.set - winter.rise;
  assert.ok(Math.abs(summerLength - 895) < 25, `하지 낮 ${(summerLength / 60).toFixed(2)}h`);
  assert.ok(Math.abs(winterLength - 565) < 25, `동지 낮 ${(winterLength / 60).toFixed(2)}h`);
  // 시민박명(BMNT/EENT)은 언제나 일출·일몰 바깥이지 안쪽이 아니다.
  const civil = horizonCrossings(GP, SUMMER_SOLSTICE, 96);
  assert.ok(civil.rise !== undefined && civil.set !== undefined);
  assert.ok(civil.rise < summer.rise);
  assert.ok(civil.set > summer.set);
});

test('허브는 GP 보다 남쪽이라 겨울 낮이 더 길다 (경도는 거의 같아 남중은 같다)', () => {
  const noonGap = Math.abs(solarNoonMinute(HUB, 240) - solarNoonMinute(GP, 240));
  assert.ok(noonGap < 1, `남중 차 ${noonGap.toFixed(2)}분`);
  const gpWinter = horizonCrossings(GP, WINTER_SOLSTICE, 90.833);
  const hubWinter = horizonCrossings(HUB, WINTER_SOLSTICE, 90.833);
  assert.ok(gpWinter.rise !== undefined && gpWinter.set !== undefined);
  assert.ok(hubWinter.rise !== undefined && hubWinter.set !== undefined);
  assert.ok((hubWinter.set - hubWinter.rise) > (gpWinter.set - gpWinter.rise));
});

test('상태의 태양과 원 해석기가 일치한다 — 씬은 하나의 답만 읽는다', () => {
  const state = environmentState(settings({ dayOfYear: 240, minuteOfDay: 615 }), GP);
  const direct = solarPosition(GP, 240, 615);
  assert.equal(state.sun.altitudeDeg, direct.altitudeDeg);
  assert.equal(state.sun.azimuthDeg, direct.azimuthDeg);
  assert.equal(state.sun.aboveHorizon, true);
});

test('자정은 밤이다 — 해는 지평선 아래, 별이 뜨고, 주광원은 월광이다', () => {
  const state = environmentState(settings({ dayOfYear: 240, minuteOfDay: 60 }), GP);
  assert.ok(state.sun.altitudeDeg < -10, `고도 ${state.sun.altitudeDeg.toFixed(1)}`);
  assert.equal(state.sun.aboveHorizon, false);
  assert.equal(state.daylight.phase, 'night');
  assert.ok(state.sky.starIntensity > 0.9);
  assert.ok(state.illuminanceLux < 1, `01:00 에 ${state.illuminanceLux} lx`);
  // 야간은 검은 프레임이 아니라 노출을 여는 쪽으로 처리된다.
  assert.ok(state.light.exposure > 1.6);
  assert.ok(state.light.hemisphereIntensity > 0);
});

test('조도는 해가 지는 내내 단조 감소한다 — 박명 이음매를 건너서도', () => {
  const marks = [30, 15, 5, 0, -3, -6, -12, -18];
  let previous = Infinity;
  for (const altitude of marks) {
    const lux = illuminanceLux(altitude, 0, -20, 0);
    assert.ok(lux < previous, `${altitude}° 에서 ${lux} lx — ${previous} 아래가 아니다`);
    previous = lux;
  }
  // 공표된 표식: 시민박명은 수 lux, 한낮은 수만 lux.
  assert.ok(illuminanceLux(-6, 0, -20, 0) > 1 && illuminanceLux(-6, 0, -20, 0) < 12);
  assert.ok(illuminanceLux(60, 0, -20, 0) > 50000);
  // 흐림은 한 자릿수 배쯤을 먹고, 보름달은 바닥값이 된다.
  assert.ok(illuminanceLux(45, 1, -20, 0) < illuminanceLux(45, 0, -20, 0) / 5);
  assert.ok(illuminanceLux(-20, 0, 45, 1) > illuminanceLux(-20, 0, -45, 1));
});

test('Koschmieder 가 안개 농도를 가시거리에 묶는다 — 아무도 두 번 타이핑하지 않는다', () => {
  // 이 씬이 원래 쓰던 안개 농도 리터럴은 0.00012 (맑은 날), 즉 가시거리 33km.
  // 맑은 날 계산값이 그 근처에 떨어져야 한다.
  const clear = environmentState(settings({ weather: 'clear', intensity: 0.5 }), GP);
  assert.ok(clear.weather.fogDensityPerMeter > 0.00008 && clear.weather.fogDensityPerMeter < 0.00026,
    `맑은 날 안개 ${clear.weather.fogDensityPerMeter.toExponential(2)} /m`);
  assert.ok(fogDensityPerMeter(1000) > fogDensityPerMeter(20000));
  const fog = environmentState(settings({ weather: 'fog', intensity: 1 }), GP);
  assert.ok(fog.weather.visibilityMeters < 200);
  assert.ok(fog.weather.fogDensityPerMeter > clear.weather.fogDensityPerMeter * 50);
});

test('모든 날씨 id 가 유한하고 범위 안인 상태를 낸다', () => {
  for (const weather of WEATHER_ORDER) {
    for (const intensity of [0, 0.5, 1]) {
      const state = environmentState(settings({ weather, intensity, minuteOfDay: 780 }), GP);
      assert.ok(Number.isFinite(state.illuminanceLux), `${weather}: lux`);
      assert.ok(state.weather.cloudCover >= 0 && state.weather.cloudCover <= 1, `${weather}: cloud`);
      assert.ok(state.ground.snowCover >= 0 && state.ground.snowCover <= 1, `${weather}: snow`);
      assert.ok(state.ground.wetness >= 0 && state.ground.wetness <= 1, `${weather}: wetness`);
      assert.ok(state.light.sunIntensity >= 0, `${weather}: sun`);
      assert.equal(state.impacts.length, 4, `${weather}: impacts`);
      for (const impact of state.impacts) {
        assert.ok(impact.factor >= 0 && impact.factor <= 1, `${weather}/${impact.id}: factor ${impact.factor}`);
        assert.ok(impact.note.length > 0);
      }
      for (const channel of [...state.sky.top, ...state.sky.horizon, ...state.light.sunColor]) {
        assert.ok(channel >= 0 && channel <= 1, `${weather}: 채널 ${channel}`);
      }
      assert.ok(Number.isInteger(rgbToHex(state.sky.top)));
    }
  }
});

test('구름은 직사광을 가져가고 그만큼을 주변광으로 돌려준다', () => {
  const clear = environmentState(settings({ weather: 'clear', intensity: 0, minuteOfDay: 780 }), GP);
  const overcast = environmentState(settings({ weather: 'overcast', intensity: 1, minuteOfDay: 780 }), GP);
  assert.ok(overcast.light.sunIntensity < clear.light.sunIntensity * 0.25);
  assert.ok(overcast.light.hemisphereIntensity > clear.light.hemisphereIntensity);
  // 운용자가 알아채는 것은 그림자다 — 흐린 정오가 맑은 정오와 같은 그림자를
  // 드리우면 안 된다.
  assert.ok(overcast.light.shadowStrength < 0.2);
  assert.ok(clear.light.shadowStrength > 0.9);
});

test('무엇이 내리는지는 버튼이 아니라 기온이 정한다', () => {
  // 1월의 「비」는 눈이고 8월의 「비」는 비다. 같은 버튼이다.
  const januaryRain = environmentState(settings({ weather: 'rain', intensity: 0.8, dayOfYear: 15, minuteOfDay: 420 }), GP);
  const augustRain = environmentState(settings({ weather: 'rain', intensity: 0.8, dayOfYear: 220, minuteOfDay: 840 }), GP);
  assert.ok(januaryRain.temperatureC < 0, `1월 ${januaryRain.temperatureC.toFixed(1)}°C`);
  assert.equal(januaryRain.weather.precipitation, 'snow');
  assert.equal(augustRain.weather.precipitation, 'rain');
  // 「눈」은 철이 아니어도 존중된다 — 운용자가 그것을 골랐다.
  const summerSnow = environmentState(settings({ weather: 'snow', intensity: 1, dayOfYear: 200 }), GP);
  assert.equal(summerSnow.weather.precipitation, 'snow');
  // 다만 적설을 두고 거짓말하지는 않는다: 27°C 오후에는 녹는다.
  assert.ok(summerSnow.ground.snowCover < 0.05, `여름 적설 ${summerSnow.ground.snowCover}`);
  const winterSnow = environmentState(settings({ weather: 'snow', intensity: 1, dayOfYear: 20, minuteOfDay: 600 }), GP);
  assert.ok(winterSnow.ground.snowCover > 0.6, `겨울 적설 ${winterSnow.ground.snowCover}`);
});

test('수관은 계절 이름이 아니라 연중일자를 따라 돈다', () => {
  const spring = environmentState(settings({ dayOfYear: 120 }), GP).ground;
  const summer = environmentState(settings({ dayOfYear: 200 }), GP).ground;
  const autumn = environmentState(settings({ dayOfYear: 295 }), GP).ground;
  const winter = environmentState(settings({ dayOfYear: 20 }), GP).ground;
  // 가을은 적색 채널의 해다 — 어느 계절보다 붉다.
  assert.ok(autumn.foliageTint[0] > summer.foliageTint[0]);
  assert.ok(autumn.foliageTint[0] > spring.foliageTint[0]);
  // 여름은 자기 적색 대비 가장 푸르다.
  assert.ok(summer.foliageTint[1] / summer.foliageTint[0] > autumn.foliageTint[1] / autumn.foliageTint[0]);
  // 겨울은 헐벗었다.
  assert.ok(winter.foliageDensity < 0.45);
  assert.ok(summer.foliageDensity > 0.95);
  // 그리고 그 변화는 점진적이다 — 어느 날짜든 하루 차이는 작은 걸음이다.
  for (const day of [100, 180, 290, 320]) {
    const before = environmentState(settings({ dayOfYear: day }), GP).ground.foliageTint;
    const after = environmentState(settings({ dayOfYear: day + 1 }), GP).ground.foliageTint;
    const step = Math.max(...before.map((channel: number, index: number) => Math.abs(channel - after[index])));
    assert.ok(step < 0.03, `${day}일 → ${day + 1}일 이 ${step.toFixed(3)} 만큼 뛰었다`);
  }
});

test('계절은 한 해를 빈틈도 겹침도 없이 나눈다', () => {
  const counts: Record<string, number> = {};
  for (let day = 1; day <= 365; day += 1) {
    const season = seasonAt(day);
    assert.ok(season.progress >= 0 && season.progress <= 1, `${day}일: progress ${season.progress}`);
    counts[season.id] = (counts[season.id] ?? 0) + 1;
  }
  assert.deepEqual(Object.keys(counts).sort(), ['autumn', 'spring', 'summer', 'winter']);
  assert.equal(Object.values(counts).reduce((total, value) => total + value, 0), 365);
});

test('임무 영향은 파생값이다 — 같은 환경은 언제나 같은 답을 낸다', () => {
  const night = environmentState(settings({ minuteOfDay: 120, weather: 'clear' }), GP);
  const optical = night.impacts.find((impact) => impact.id === 'optical');
  assert.ok(optical);
  assert.ok(optical.factor < 0.3, `야간 영상 계수 ${optical.factor}`);
  assert.ok(optical.note.includes('열영상') || optical.note.includes('저조도'));

  const blizzard = environmentState(settings({ weather: 'snow', intensity: 1, dayOfYear: 20, minuteOfDay: 720, windMps: 12 }), GP);
  const mobility = blizzard.impacts.find((impact) => impact.id === 'mobility');
  const flight = blizzard.impacts.find((impact) => impact.id === 'flight');
  assert.ok(mobility && mobility.factor < 0.6, `폭설 기동 ${mobility?.factor}`);
  assert.equal(flight?.verdict, 'NO_GO', `폭설 비행 ${flight?.verdict}`);

  // 비는 UHF 에 없는 RF 감쇠를 지어내지 않고, 그렇다고 말한다.
  const rain = environmentState(settings({ weather: 'rain', intensity: 1, dayOfYear: 200, minuteOfDay: 720 }), GP);
  const comms = rain.impacts.find((impact) => impact.id === 'comms');
  assert.ok(comms);
  assert.ok(comms.factor > 0.5, `강우 통신 ${comms.factor}`);
  assert.ok(comms.note.length > 0);
});

test('강수 버튼 둘만 강수한다', () => {
  // 흐림·안개가 이슬비율을 들고 있으면 운용자가 고르지 않은 비를 예보하고
  // 안개 속에 빗줄기를 그린다. 구름층과 부유 물방울은 떨어지는 물이 아니다.
  for (const weather of ['clear', 'cloudy', 'overcast', 'fog']) {
    const state = environmentState(settings({ weather, intensity: 1, dayOfYear: 200, minuteOfDay: 720 }), GP);
    assert.equal(state.weather.precipitation, 'none', `${weather} 가 강수했다`);
    assert.equal(state.weather.precipitationRateMmPerHour, 0, `${weather} 가 강수율을 보고했다`);
  }
  for (const weather of ['rain', 'snow']) {
    const state = environmentState(settings({ weather, intensity: 1, dayOfYear: 200, minuteOfDay: 720 }), GP);
    assert.notEqual(state.weather.precipitation, 'none', `${weather} 가 강수하지 않았다`);
    assert.ok(state.weather.precipitationRateMmPerHour > 0, `${weather} 가 강수율 0 을 보고했다`);
  }
});

test('완전한 흐림은 그림자를 전혀 만들지 않는다', () => {
  const solid = environmentState(settings({ weather: 'overcast', intensity: 1, minuteOfDay: 720, dayOfYear: 200 }), GP);
  assert.ok(solid.light.shadowStrength < 0.06, `흐림 그림자 ${solid.light.shadowStrength}`);
  const heavyRain = environmentState(settings({ weather: 'rain', intensity: 1, minuteOfDay: 720, dayOfYear: 200 }), GP);
  assert.ok(heavyRain.light.shadowStrength < 0.06, `호우 그림자 ${heavyRain.light.shadowStrength}`);
  // 그렇다고 주변광까지 따라 내려가지는 않는다 — 흐린 정오는 밝다.
  assert.ok(solid.illuminanceLux > 3000, `흐린 정오 ${solid.illuminanceLux} lx`);
});

test('기본 환경은 상수이며, 맑은 8월 말 오전이다', () => {
  assert.equal(DEFAULT_ENVIRONMENT.weather, 'clear');
  const state = environmentState(DEFAULT_ENVIRONMENT, GP);
  assert.equal(state.season.id, 'summer');
  assert.equal(state.daylight.phase, 'day');
  assert.ok(state.sun.altitudeDeg > 40, `기본 고도 ${state.sun.altitudeDeg.toFixed(1)}`);
  assert.ok(state.light.shadowStrength > 0.9);
});

test('범위 밖 설정은 NaN 이 아니라 감아 돈다', () => {
  const wrapped = environmentState(settings({ dayOfYear: 0, minuteOfDay: -30 }), GP);
  assert.ok(wrapped.season.dayOfYear >= 1 && wrapped.season.dayOfYear <= 365);
  assert.equal(wrapped.settings.minuteOfDay, 1410);
  assert.ok(Number.isFinite(wrapped.sun.altitudeDeg));
  const over = environmentState(settings({ dayOfYear: 400, minuteOfDay: 2000, intensity: 4 }), GP);
  assert.ok(over.settings.intensity <= 1);
  assert.ok(Number.isFinite(over.sun.azimuthDeg));
});

test('달 위상은 삭망월마다 한 바퀴 돌고 그만큼 밤을 밝힌다', () => {
  assert.ok(moonPhase(18) < 0.02, '기준일은 삭이다');
  assert.ok(Math.abs(moonPhase(18 + 14.77) - 0.5) < 0.02, '삭망월의 절반 뒤는 보름이다');
  const full = environmentState(settings({ dayOfYear: 33, minuteOfDay: 0 }), GP);
  const dark = environmentState(settings({ dayOfYear: 18, minuteOfDay: 0 }), GP);
  assert.ok(full.moon.illuminatedFraction > dark.moon.illuminatedFraction);
});

test('시각·날짜 표기는 작전명령서가 쓰는 대로 읽힌다', () => {
  assert.equal(formatClock(0), '00:00');
  assert.equal(formatClock(615), '10:15');
  assert.equal(formatClock(1439), '23:59');
  assert.equal(formatSeasonDate(1), '1월 1일');
  assert.equal(formatSeasonDate(32), '2월 1일');
  assert.equal(formatSeasonDate(240), '8월 28일');
  assert.equal(formatSeasonDate(365), '12월 31일');
});
