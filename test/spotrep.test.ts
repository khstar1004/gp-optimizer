import assert from 'node:assert/strict';
import test from 'node:test';

import { buildSpotrep, spotrepFilename, type SpotrepInput } from '../src/runtime/spotrep';

function base(over: Partial<SpotrepInput> = {}): SpotrepInput {
  return {
    dtg: 'DTG 0828 22:14:07K',
    observer: {
      name: 'IR-01', optic: '열상감시장비 (TOD)', tag: 'IR-2',
      mgrs: '52S DH 23511 42582', eyeH: 1028, azDeg: 355, elDeg: -2.4, zoom: 4, palette: 'wh',
    },
    target: {
      trackId: 'T01', name: '축선 2', mgrs: '52S DH 23570 47059',
      distM: 2340, bearingDeg: 7, elevationM: 828, grade: '인지', pd: 0.71,
      speedMps: 1.4, courseDeg: 183, observedS: 96, etaToGpS: 1500, distToGpM: 2100,
      source: 'track',
    },
    conditions: {
      weather: '눈', tempC: -6, windMps: 7.2, visibilityM: 900,
      lux: 0.19, deltaT: 1.1, illuminated: false, snowCover: 0.62,
    },
    performance: {
      rangeM: 980, specRangeM: 2800, limiter: '열대비', verdict: 'NO_GO',
      note: '열대비 ΔT 1.1K · 습윤 세척',
    },
    ...over,
  };
}

test('SALUTE 여섯 항목이 모두 있고 순서가 지켜진다', () => {
  const s = buildSpotrep(base());
  for (const tag of ['S 규모', 'A 활동', 'L 위치', 'U 부대', 'T 시각', 'E 장비']) {
    assert.ok(s.includes(tag), `${tag} 누락`);
  }
  assert.ok(s.indexOf('S 규모') < s.indexOf('A 활동'));
  assert.ok(s.indexOf('T 시각') < s.indexOf('E 장비'));
});

test('활동은 속도·진로에서 사람이 읽는 문장으로 나온다', () => {
  const s = buildSpotrep(base());
  assert.match(s, /도보 · 남\(183°\)로 이동 · 1\.4 m\/s/);
});

test('모르는 것은 빈칸이 아니라 「미상」이다 — 빈칸은 0 으로 읽힌다', () => {
  const s = buildSpotrep(base({
    target: { ...base().target, speedMps: null, courseDeg: null, observedS: null, etaToGpS: null, distToGpM: null },
  }));
  assert.match(s, /A 활동 +미상/);
  assert.match(s, /E 장비 +미상/);
  assert.ok(!/A 활동 +\n/.test(s));
});

test('접근하지 않는 표적에는 도달시간 대신 이격만 적는다', () => {
  const s = buildSpotrep(base({
    target: { ...base().target, etaToGpS: null, distToGpM: 2100 },
  }));
  assert.match(s, /GP 이격 2\.10km · 접근 아님/);
  assert.ok(!s.includes('GP 도달 예상'));
});

test('관측 조건 절이 반드시 붙는다 — 등급만 오는 보고는 검증할 수 없다', () => {
  const s = buildSpotrep(base());
  assert.ok(s.includes('관측 조건'));
  assert.match(s, /조도 0\.190 lx/);
  assert.match(s, /시정 900m/);
  assert.match(s, /열대비 ΔT 1\.1K/);
  assert.match(s, /적설 62%/);
  assert.match(s, /실효 980m \/ 청천 2\.80km \(35%\)/);
  assert.match(s, /제한 요인 +열대비/);
});

test('조명 지원 중이면 조도 옆에 그 사실이 남는다', () => {
  const s = buildSpotrep(base({ conditions: { ...base().conditions, illuminated: true } }));
  assert.match(s, /조도 .* \(조명 지원 중\)/);
});

test('LRF 단독 측거는 이동 판단을 지어내지 않는다', () => {
  const s = buildSpotrep(base({
    target: {
      ...base().target, trackId: null, name: null, source: 'lrf',
      speedMps: null, courseDeg: null, pd: null, grade: '—',
    },
  }));
  assert.match(s, /레이저 측거점 \(이동 판단 없음\)/);
  assert.match(s, /S 규모 +단일 접촉/);
  assert.ok(!s.includes('P(d)'));
});

test('인계가 있었으면 그 결과가 보고에 남는다', () => {
  const withCue = buildSpotrep(base({ cue: '3개 자산 인계 — IR 2.3km 인지 · EO 2.4km 탐지' }));
  assert.ok(withCue.includes('교차표적지정'));
  assert.match(withCue, /3개 자산 인계/);
  assert.ok(!buildSpotrep(base()).includes('교차표적지정'));
});

test('합성 데모 고지가 빠지지 않는다', () => {
  assert.match(buildSpotrep(base()), /합성 데모 자료 — 실기준 아님/);
});

test('파일명은 DTG·채널·항적으로 정렬 가능하게 만들어진다', () => {
  assert.equal(spotrepFilename(base()), 'SPOTREP_0828221407_IR-2_T01');
  const lrf = spotrepFilename(base({ target: { ...base().target, trackId: null } }));
  assert.match(lrf, /_LRF$/);
});
