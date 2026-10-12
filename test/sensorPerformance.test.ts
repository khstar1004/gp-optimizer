/**
 * 센서 실효성능 시험.
 *
 * 「눈이 오면 얼마나 안 보이는가」에 데모가 내놓는 답은 화면이 아니라 이 숫자들이다.
 * 화면은 숫자를 보여줄 뿐이므로, 못박아야 하는 것은 여기다.
 *
 * 두 종류를 나눠 시험한다:
 *   공표식 — Koschmieder, Duntley, ITU-R P.838. 값을 문헌과 맞춘다.
 *   순위   — 파장대별 상대 우열. 데모가 말하려는 전훈이 이 순위 자체다.
 *            (악천후에 무엇을 믿을 것인가 → 레이더 > 열상 > 가시)
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { environmentState, DEFAULT_ENVIRONMENT } from '../src/runtime/environmentModel';
import {
  atmosphereOf, effectiveRanges, betaVisible, contrastRange, rainAttenDbPerKm,
  radarRange, detectionProbability,
} from '../src/runtime/sensorPerformance';

const GP = { latitude: 38.328, longitude: 128.125, utcOffsetHours: 9 };

const SPEC = {
  eo: { band: 'vis', dri: [3500, 1200, 600], fov: 90 },
  ir: { band: 'lwir', dri: [2800, 950, 480], fov: 60 },
  radar: { band: 'radar', dri: [5000, 3200, 1500], fov: 120 },
  acoustic: { band: 'acoustic', dri: [900, 600, 300], fov: 360 },
  cuas: { band: 'rf', dri: [800, 800, 800], fov: 360 },
  hmg: { band: 'eye', dri: [1800, 900, 450], fov: 150 },
} as const;

const atm = (overrides = {}) =>
  atmosphereOf(environmentState({ ...DEFAULT_ENVIRONMENT, ...overrides }, GP) as never);

const perf = (key: keyof typeof SPEC, a: ReturnType<typeof atm>, opts = {}) =>
  effectiveRanges(SPEC[key] as never, a, opts);

// 주간 기준 조건들 — 조도가 아니라 대기가 제한요인이 되도록 낮 시각을 쓴다.
const DAY = { minuteOfDay: 600, dayOfYear: 240 };
const CLEAR = atm({ ...DAY, weather: 'clear', intensity: 0.2 });
const SNOW = atm({ ...DAY, weather: 'snow', intensity: 1, dayOfYear: 20, windMps: 6 });
const FOG = atm({ ...DAY, weather: 'fog', intensity: 1 });
const RAIN = atm({ ...DAY, weather: 'rain', intensity: 1, windMps: 8 });
const NIGHT = atm({ weather: 'clear', intensity: 0.2, minuteOfDay: 60, dayOfYear: 240 });

// ── 공표식 ──────────────────────────────────────────────────────────────────

test('Koschmieder — 가시거리 V 에서 대비 2 % 임계, β = 3.912/V', () => {
  for (const V of [90, 700, 5000, 30000]) {
    const beta = betaVisible(V);
    assert.ok(Math.abs(beta - 3.912 / V) < 1e-12);
    // 고유대비 1.0 인 흑체는 V 에서 임계대비 0.02 로 떨어진다 (정의 그 자체).
    // 상수 3.912 자체가 ln 50 의 반올림이라 상대오차 0.02 % 가 남는다.
    assert.ok(Math.abs(contrastRange(beta, 1, 0.02) / V - 1) < 2e-4, `V=${V}`);
  }
});

test('Duntley — 과업이 어려울수록 임계대비가 높고 거리는 짧다', () => {
  const beta = betaVisible(2000);
  const d = contrastRange(beta, 0.3, 0.02);
  const r = contrastRange(beta, 0.3, 0.05);
  const i = contrastRange(beta, 0.3, 0.10);
  assert.ok(d > r && r > i, `${d} > ${r} > ${i}`);
  // 고유대비가 임계 아래면 아예 안 보인다 — 음수 거리가 나오면 안 된다
  assert.equal(contrastRange(beta, 0.02, 0.05), 0);
});

test('ITU-R P.838-3 — X대역(10 GHz) 강우 감쇠 γ = 0.01217·R^1.2571', () => {
  assert.ok(Math.abs(rainAttenDbPerKm(10) - 0.2200) < 0.002, `${rainAttenDbPerKm(10)}`);
  assert.equal(rainAttenDbPerKm(0), 0);
  // 초과선형 — 20 mm/h 는 10 mm/h 의 두 배보다 크게 먹는다
  assert.ok(rainAttenDbPerKm(20) > 2 * rainAttenDbPerKm(10));
  // 그래도 이 대역에서는 작다: 5 km 왕복에 2 dB 남짓
  assert.ok(2 * rainAttenDbPerKm(20) * 5 < 6);
});

test('레이더 방정식 — 감쇠·클러터가 없으면 기준거리 그대로, 있으면 단조 감소', () => {
  assert.equal(radarRange(5000, 0, 0), 5000);
  const a = radarRange(5000, 0.2, 1);
  const b = radarRange(5000, 0.2, 3);
  const c = radarRange(5000, 0.8, 3);
  assert.ok(a > b && b > c, `${a} > ${b} > ${c}`);
  assert.ok(c > 0);
  // R⁻⁴ 이라 6 dB 손실은 거리를 약 √2 만 깎는다 — 레이더가 악천후에 강한 이유
  assert.ok(radarRange(5000, 0, 6) > 5000 / 1.5);
});

// ── 순위: 이 데모가 말하려는 전훈 ───────────────────────────────────────────

test('맑은 주간에는 모든 광학이 청천 제원 그대로다', () => {
  for (const k of ['eo', 'ir', 'radar', 'hmg'] as const) {
    const p = perf(k, CLEAR);
    assert.equal(p.limiter, '제원', `${k}: ${p.limiter}`);
    assert.equal(p.range, p.specRange, k);
    assert.equal(p.verdict, 'GO', k);
  }
});

test('폭설 — 레이더만 남는다 (레이더 > 열상 ≳ 가시)', () => {
  const eo = perf('eo', SNOW), ir = perf('ir', SNOW), radar = perf('radar', SNOW);
  assert.ok(radar.factor > 0.7, `레이더 ${radar.factor}`);
  assert.ok(eo.factor < 0.35, `EO ${eo.factor}`);
  assert.ok(ir.factor < 0.45, `IR ${ir.factor}`);
  assert.ok(radar.factor > ir.factor && ir.factor > eo.factor,
    `${radar.factor} > ${ir.factor} > ${eo.factor}`);
  // 눈송이는 파장보다 훨씬 커서 기하산란 — 열상이 가시대비 크게 유리하지 못하다.
  // (안개에서와 달리 배율이 2배를 넘지 않아야 한다)
  assert.ok(ir.range / eo.range < 2, `눈 속 IR/EO 배율 ${ir.range / eo.range}`);
  assert.equal(radar.limiter, '강수감쇠');
});

test('안개 — 열상이 가시보다 뚜렷이 낫고, 레이더는 아예 영향이 없다', () => {
  const eo = perf('eo', FOG), ir = perf('ir', FOG), radar = perf('radar', FOG);
  assert.equal(radar.limiter, '제원');
  assert.equal(radar.range, radar.specRange);
  assert.ok(ir.range > eo.range, `IR ${ir.range} vs EO ${eo.range}`);
  // 안개 물방울은 LWIR 파장과 같은 급이라 열상도 결국 막힌다 — 무적이 아니다
  assert.ok(ir.factor < 0.2, `짙은 안개 IR ${ir.factor}`);
});

test('옅은 연무에서는 열상이 가시대비 크게 앞선다 — 입자가 파장보다 작다', () => {
  const haze = atm({ ...DAY, weather: 'overcast', intensity: 0.35 });
  assert.ok(haze.lwirRatio < 0.3, `연무 LWIR 소광비 ${haze.lwirRatio}`);
  const eo = perf('eo', haze), ir = perf('ir', haze);
  // 둘 다 제원에 걸릴 만큼 맑으므로 대기 한계 자체를 비교한다
  assert.ok(contrastRange(haze.betaLwir, 1, 0.02) > contrastRange(haze.betaVis, 1, 0.02) * 3);
  assert.equal(eo.limiter, '제원');
  assert.equal(ir.limiter, '제원');
});

test('야간 — EO 는 조도에 묶이고 열상·레이더는 그대로다', () => {
  const eo = perf('eo', NIGHT), ir = perf('ir', NIGHT), radar = perf('radar', NIGHT);
  assert.equal(eo.limiter, '조도');
  assert.ok(eo.factor < 0.4, `야간 EO ${eo.factor}`);
  assert.equal(ir.range, ir.specRange, '열상은 주야 무관');
  assert.equal(radar.range, radar.specRange);
  // 육안 조준은 EO 보다 훨씬 심하게 죽는다 — 증폭장치가 없다
  const eye = perf('hmg', NIGHT);
  assert.ok(eye.factor < eo.factor, `육안 ${eye.factor} < EO ${eo.factor}`);
  assert.equal(eye.verdict, 'NO_GO');
});

test('조명탄은 야간 가시대역만 되살린다 — 열상·레이더에는 무의미', () => {
  const eoDark = perf('eo', NIGHT), eoLit = perf('eo', NIGHT, { illuminated: true });
  const eyeDark = perf('hmg', NIGHT), eyeLit = perf('hmg', NIGHT, { illuminated: true });
  assert.ok(eoLit.range > eoDark.range * 2, `${eoDark.range} → ${eoLit.range}`);
  assert.ok(eyeLit.range > eyeDark.range * 3, `${eyeDark.range} → ${eyeLit.range}`);
  // 열상은 조명과 무관 — 인자를 넘겨도 값이 변하지 않아야 한다
  assert.equal(perf('ir', NIGHT, { illuminated: true }).range, perf('ir', NIGHT).range);
  assert.equal(perf('radar', NIGHT, { illuminated: true }).range, perf('radar', NIGHT).range);
});

test('제한요인은 실제로 더 많이 깎은 쪽이다 — 거리는 줄었는데 「제원」이라 적지 않는다', () => {
  // 야간 + 조명 지원: 대기는 제원 안이지만 조도가 여전히 30 % 를 깎는 구간
  const lit = perf('eo', NIGHT, { illuminated: true });
  assert.ok(lit.range < lit.specRange, `${lit.range} < ${lit.specRange}`);
  assert.equal(lit.limiter, '조도');
  // 폭설 주간: 조도는 충분하고 대기가 깎는다
  assert.equal(perf('eo', SNOW).limiter, '가시거리');
  // 맑은 주간: 어느 쪽도 깎지 않는다
  assert.equal(perf('eo', CLEAR).limiter, '제원');
  // limiter 가 '제원' 이라면 실제로 제원과 같아야 한다 (전 조합)
  for (const a of [CLEAR, SNOW, FOG, RAIN, NIGHT]) {
    for (const k of ['eo', 'ir', 'radar', 'hmg'] as const) {
      const p = perf(k, a);
      if (p.limiter === '제원') {
        assert.ok(p.factor > 0.97, `${a.weatherId}/${k}: 제원인데 ${p.factor}`);
      }
    }
  }
});

test('눈 덮인 배경은 대비를 키운다 — 같은 가시거리라면 눈 쪽이 더 멀리 본다', () => {
  const snowy = atm({ ...DAY, weather: 'snow', intensity: 0.55, dayOfYear: 20 });
  assert.ok(snowy.snowCover > 0.3, `적설 ${snowy.snowCover}`);
  assert.ok(snowy.c0 > CLEAR.c0, `C₀ ${snowy.c0} > ${CLEAR.c0}`);
  // 열대비도 오른다 — 차가운 균질 배경 위의 따뜻한 인원
  assert.ok(snowy.deltaT > CLEAR.deltaT, `ΔT ${snowy.deltaT} > ${CLEAR.deltaT}`);
});

test('음향은 적설 흡음과 풍잡음에 깎인다 — 비가시선이라 지형과는 무관', () => {
  const calm = atm({ ...DAY, weather: 'clear', intensity: 0.2, windMps: 0 });
  const windy = atm({ ...DAY, weather: 'clear', intensity: 0.2, windMps: 12 });
  assert.ok(perf('acoustic', calm).factor > 0.9, `정온 ${perf('acoustic', calm).factor}`);
  assert.ok(perf('acoustic', windy).factor < 0.3, `강풍 ${perf('acoustic', windy).factor}`);
  assert.ok(perf('acoustic', SNOW).factor < perf('acoustic', calm).factor);
  assert.equal(perf('acoustic', windy).limiter, '풍잡음');
});

test('C-UAS RF 는 어떤 날씨에도 사실상 그대로다', () => {
  for (const a of [CLEAR, SNOW, FOG, RAIN, NIGHT]) {
    const p = perf('cuas', a);
    assert.ok(p.factor > 0.95, `${a.weatherId}: ${p.factor}`);
    assert.equal(p.verdict, 'GO');
  }
});

test('화기 유효사거리는 관측이 먼저 막는다 — 사거리보다 짧아질 수 있다', () => {
  const p = perf('hmg', SNOW);
  assert.ok(p.range < p.specRange, `${p.range} < ${p.specRange}`);
  assert.ok(['가시거리', '조도'].includes(p.limiter), p.limiter);
});

// ── 전 조합 건전성 ──────────────────────────────────────────────────────────

test('모든 날씨 × 강도 × 자산에서 유한하고 단조로운 DRI 가 나온다', () => {
  const weathers = ['clear', 'cloudy', 'overcast', 'rain', 'snow', 'fog'] as const;
  for (const w of weathers) {
    for (const intensity of [0, 0.5, 1]) {
      for (const day of [20, 240]) {
        for (const minute of [60, 600]) {
          const a = atm({ weather: w, intensity, dayOfYear: day, minuteOfDay: minute });
          for (const k of Object.keys(SPEC) as (keyof typeof SPEC)[]) {
            const p = perf(k, a);
            const tag = `${w}/${intensity}/${day}/${minute}/${k}`;
            assert.ok(p.dri.every(Number.isFinite), tag);
            assert.ok(p.dri[0] >= p.dri[1] && p.dri[1] >= p.dri[2], `${tag} DRI 역전 ${p.dri}`);
            assert.ok(p.range >= 0 && p.range <= p.specRange + 1, `${tag} ${p.range}`);
            assert.ok(p.factor >= 0 && p.factor <= 1, tag);
            assert.ok(['GO', 'LIMITED', 'NO_GO'].includes(p.verdict), tag);
            assert.ok(typeof p.note === 'string' && p.note.length > 0, tag);
          }
        }
      }
    }
  }
});

test('탐지확률은 유효거리 안에서 단조 감소하고 밖에서는 0 이다', () => {
  const p = perf('eo', CLEAR);
  assert.equal(detectionProbability(p, p.range + 1), 0);
  assert.equal(detectionProbability(p, 0), 0);
  let prev = Infinity;
  for (let d = 10; d < p.range; d += 25) {
    const v = detectionProbability(p, d);
    assert.ok(v >= 0 && v <= 1, `d=${d} → ${v}`);
    assert.ok(v <= prev + 1e-9, `d=${d} 에서 증가 ${prev} → ${v}`);
    prev = v;
  }
  // 날씨가 나빠지면 같은 거리의 탐지확률이 떨어진다
  const bad = perf('eo', SNOW);
  assert.ok(detectionProbability(bad, 500) < detectionProbability(p, 500));
});

// ── 새 파장대: 빛과 무관한 자산들 ─────────────────────────────────────
/**
 * 광학이 전부 죽는 조건(무월광 + 짙은 안개)에서도 남는 눈이 있어야 GP 가 성립한다.
 * 그 「남는 눈」이 실제로 남는지를 여기서 못 박는다.
 */
function atmOf(over = {}) {
  return atmosphereOf(environmentState({
    dayOfYear: 20, minuteOfDay: 60, weather: 'clear', intensity: 0.2, windMps: 2, ...over,
  }, { latitude: 38.33, longitude: 128.12, utcOffsetHours: 9 }));
}

test('지진동 감지는 조도·시정과 무관하다 — 무월광 짙은 안개에서도 제원을 지킨다', () => {
  const spec = { band: 'seismic', dri: [150, 100, 60], fov: 360 };
  const base = atmOf();
  // 안개 프리셋은 돌풍도 함께 올린다 — 여기서 보려는 것은 **시정·조도**뿐이므로
  // 풍속을 같게 맞춰 그 변수만 남긴다.
  const fogAtm = { ...atmOf({ weather: 'fog', intensity: 1 }), windMps: base.windMps };
  assert.ok(fogAtm.visibilityMeters < base.visibilityMeters / 10, '시정이 실제로 무너졌는지');
  assert.ok(base.lux < 1, '무월광 야간인지');
  const clear = effectiveRanges(spec, base);
  const fog = effectiveRanges(spec, fogAtm);
  // 같은 조건에서 EO 는 무너지고 지진동은 남는다 — 그 대비가 이 자산의 존재 이유다
  const eoClear = effectiveRanges(SPEC.eo, base);
  const eoFog = effectiveRanges(SPEC.eo, fogAtm);
  assert.ok(eoFog.range < eoClear.range * 0.2, `EO 가 안개에서 무너져야 한다: ${eoClear.range} → ${eoFog.range}`);
  assert.ok(Math.abs(clear.range - fog.range) / clear.range < 0.02,
    `지진동은 그대로여야 한다: ${clear.range} vs ${fog.range}`);
  assert.ok(clear.range > 140);
});

test('신설은 발걸음을 덮고, 강풍은 바닥잡음을 올린다', () => {
  const spec = { band: 'seismic', dri: [150, 100, 60], fov: 360 };
  const calm = effectiveRanges(spec, atmOf());
  const snow = effectiveRanges(spec, atmOf({ weather: 'snow', intensity: 1 }));
  const windy = effectiveRanges(spec, atmOf({ windMps: 16 }));
  assert.ok(snow.range < calm.range, '신설이 흡수해야 한다');
  assert.ok(windy.range < calm.range, '풍잡음이 깎아야 한다');
  assert.equal(windy.limiter, '풍잡음');
});

test('광망은 접촉식이라 날씨가 거리를 깎지 않는다 — 오경보만 문제다', () => {
  const spec = { band: 'fence', dri: [40, 40, 40], fov: 360 };
  const calm = effectiveRanges(spec, atmOf());
  const storm = effectiveRanges(spec, atmOf({ weather: 'snow', intensity: 1, windMps: 18 }));
  assert.equal(calm.limiter, '제원');
  assert.match(calm.note, /시정·조도와 무관/);
  assert.equal(storm.limiter, '오경보');
  assert.ok(storm.range < calm.range, '오경보가 잦으면 경보가 무뎌진다');
  assert.ok(storm.range > calm.range * 0.6, '그래도 접촉은 접촉이다 — 통째로 죽지 않는다');
});

test('곡사 화기는 날씨에 거의 흔들리지 않고, 강풍만 산포를 키운다', () => {
  const spec = { band: 'indirect', dri: [2800, 2800, 2800], fov: 360 };
  const calm = effectiveRanges(spec, atmOf());
  const fog = effectiveRanges(spec, atmOf({ weather: 'fog', intensity: 1 }));
  const windy = effectiveRanges(spec, atmOf({ windMps: 18 }));
  assert.equal(calm.range, fog.range, '가시선이 필요 없으므로 안개가 깎지 않는다');
  assert.match(calm.note, /가시선 불요/);
  assert.ok(windy.range < calm.range && windy.range > calm.range * 0.85);
});

test('새 파장대도 판정·비율 규약을 지킨다', () => {
  for (const band of ['seismic', 'fence', 'indirect']) {
    const r = effectiveRanges({ band, dri: [500, 300, 150], fov: 360 }, atmOf());
    assert.ok(r.range > 0, band);
    assert.ok(r.factor > 0 && r.factor <= 1, `${band} factor ${r.factor}`);
    assert.ok(['GO', 'LIMITED', 'NO_GO'].includes(r.verdict), band);
    assert.equal(r.dri.length, 3);
    assert.ok(r.dri[0] >= r.dri[1] && r.dri[1] >= r.dri[2], `${band} DRI 순서`);
  }
});
