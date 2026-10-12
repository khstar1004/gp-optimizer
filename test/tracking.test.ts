import assert from 'node:assert/strict';
import test from 'node:test';

import { offset } from '../src/runtime/geo';
import {
  MAX_JUMP_M, MAX_PLAUSIBLE_MPS, MIN_SPAN_S, TrackBook, closingRateMps, compassKo, etaSeconds,
  fmtDuration, kinematics, motionLabel,
} from '../src/runtime/tracking';

const GP = { lon: 128.12, lat: 38.35 };

/** 시작점에서 방위 az 로 speed m/s 로 걸어간 항적을 만든다. */
function walk(startLon: number, startLat: number, azDeg: number, speedMps: number, seconds: number, stepS = 1) {
  const hist = [];
  for (let s = 0; s <= seconds; s += stepS) {
    const p = offset(startLon, startLat, azDeg, speedMps * s);
    hist.push({ t: 1_000_000 + s * 1000, lon: p.lon, lat: p.lat, h: 500 });
  }
  return hist;
}

test('표본이 모자라면 속도를 지어내지 않는다', () => {
  assert.equal(kinematics([]).ok, false);
  const short = walk(GP.lon, GP.lat, 180, 1.4, MIN_SPAN_S - 1);
  assert.equal(kinematics(short).ok, false);
});

test('속도와 진로가 실제 이동에서 나온다', () => {
  const hist = walk(GP.lon, GP.lat + 0.03, 180, 1.4, 20);   // 남쪽으로 도보
  const k = kinematics(hist);
  assert.ok(k.ok);
  assert.ok(Math.abs(k.speedMps - 1.4) < 0.05, `${k.speedMps}`);
  assert.ok(Math.abs(((k.courseDeg - 180 + 540) % 360) - 180) < 1.5, `${k.courseDeg}`);
  assert.ok(Math.abs(k.spanS - 20) < 0.01);
});

test('제자리 걸음은 진로를 만들지 않는다 — 지터가 방위로 둔갑하면 안 된다', () => {
  const hist = walk(GP.lon, GP.lat, 90, 0, 10);
  const k = kinematics(hist);
  assert.ok(k.ok);
  assert.ok(k.speedMps < 0.01);
  assert.equal(k.courseDeg, 0);
});

test('접근률은 전체 속도가 아니라 그 지점을 향한 성분이다', () => {
  const start = offset(GP.lon, GP.lat, 0, 3000);            // GP 북쪽 3km
  const toward = kinematics(walk(start.lon, start.lat, 180, 2, 20));   // 곧장 남하 = GP 로
  const across = kinematics(walk(start.lon, start.lat, 90, 2, 20));    // 동쪽으로 횡단
  const away = kinematics(walk(start.lon, start.lat, 0, 2, 20));       // 북상 = 이탈

  const cToward = closingRateMps(toward, start.lon, start.lat, GP.lon, GP.lat);
  const cAcross = closingRateMps(across, start.lon, start.lat, GP.lon, GP.lat);
  const cAway = closingRateMps(away, start.lon, start.lat, GP.lon, GP.lat);

  assert.ok(Math.abs(cToward - 2) < 0.05, `${cToward}`);
  assert.ok(Math.abs(cAcross) < 0.05, `${cAcross}`);        // 스쳐 지나가면 접근률 0
  assert.ok(Math.abs(cAway + 2) < 0.05, `${cAway}`);        // 멀어지면 음수
});

test('멀어지거나 스쳐 가는 표적에는 도달시간이 없다 — 큰 수를 적으면 거짓말이다', () => {
  assert.equal(etaSeconds(3000, -2), null);
  assert.equal(etaSeconds(3000, 0), null);
  assert.equal(etaSeconds(3000, 0.05), null);
  assert.equal(etaSeconds(3000, 2), 1500);
});

test('지속시간은 시계로 읽힌다', () => {
  assert.equal(fmtDuration(0), '0:00');
  assert.equal(fmtDuration(65), '1:05');
  assert.equal(fmtDuration(3725), '1:02:05');
});

test('방위는 8방위 한글로도 읽힌다', () => {
  assert.equal(compassKo(0), '북');
  assert.equal(compassKo(359), '북');
  assert.equal(compassKo(46), '북동');
  assert.equal(compassKo(180), '남');
  assert.equal(compassKo(-90), '서');
});

test('이동 양상은 침투 판단의 언어를 쓴다', () => {
  assert.equal(motionLabel(0), '정지');
  assert.equal(motionLabel(0.5), '포복·은밀');
  assert.equal(motionLabel(1.3), '도보');
  assert.equal(motionLabel(2.5), '급속도보');
  assert.equal(motionLabel(12), '차량');
});

test('항적부는 번호를 발급하고 재사용하지 않는다', () => {
  const book = new TrackBook();
  const a = book.observe('r1', '축선 1', { t: 0, lon: GP.lon, lat: GP.lat, h: 1 });
  const b = book.observe('r2', '축선 2', { t: 0, lon: GP.lon, lat: GP.lat, h: 1 });
  assert.equal(a.id, 'T01');
  assert.equal(b.id, 'T02');
  assert.equal(book.observe('r1', '축선 1', { t: 1000, lon: GP.lon, lat: GP.lat, h: 1 }).id, 'T01');
  book.prune(999_999);
  assert.equal(book.tracks.size, 0);
  assert.equal(book.observe('r1', '축선 1', { t: 1_000_000, lon: GP.lon, lat: GP.lat, h: 1 }).id, 'T03');
});

test('같은 프레임에 여러 창이 보고해도 항적은 한 번만 자란다', () => {
  const book = new TrackBook();
  for (let i = 0; i < 5; i += 1) book.observe('r1', '축선 1', { t: 0, lon: GP.lon, lat: GP.lat, h: 1 });
  assert.equal(book.get('r1')!.hist.length, 1);
  book.observe('r1', '축선 1', { t: 300, lon: GP.lon, lat: GP.lat, h: 1 });
  assert.equal(book.get('r1')!.hist.length, 2);
});

test('항적은 보관 구간을 넘겨도 최소 두 점은 남긴다 — 속도를 잃지 않기 위해', () => {
  const book = new TrackBook();
  for (let s = 0; s <= 200; s += 1) {
    const p = offset(GP.lon, GP.lat, 180, 1.4 * s);
    book.observe('r1', '축선 1', { t: s * 1000, lon: p.lon, lat: p.lat, h: 500 });
  }
  const tr = book.get('r1')!;
  assert.ok(tr.hist.length >= 2);
  const spanS = (tr.hist[tr.hist.length - 1].t - tr.hist[0].t) / 1000;
  assert.ok(spanS <= 46 && spanS >= 40, `${spanS}`);
  assert.ok(Math.abs(kinematics(tr.hist).speedMps - 1.4) < 0.05);
});

test('순간이동은 이동이 아니다 — 시간축을 끌면 항적을 새로 시작한다', () => {
  const book = new TrackBook();
  // 5초 동안 1.4 m/s 로 걷다가
  for (let s = 0; s <= 5; s += 1) {
    const p = offset(GP.lon, GP.lat, 180, 1.4 * s);
    book.observe('r1', '축선 1', { t: s * 1000, lon: p.lon, lat: p.lat, h: 500 });
  }
  assert.equal(book.get('r1')!.hist.length, 6);

  // 사용자가 리허설 슬라이더를 끌어 2km 를 1초 만에 건너뛴다
  const jump = offset(GP.lon, GP.lat, 180, 2000);
  book.observe('r1', '축선 1', { t: 6000, lon: jump.lon, lat: jump.lat, h: 500 });
  assert.equal(book.get('r1')!.hist.length, 1, '섞어 두면 그 뒤 수십 초가 거짓이 된다');
  assert.equal(kinematics(book.get('r1')!.hist).ok, false);

  // 그 뒤 정상 이동은 다시 정상으로 읽힌다
  for (let s = 7; s <= 12; s += 1) {
    const p = offset(jump.lon, jump.lat, 180, 1.4 * (s - 6));
    book.observe('r1', '축선 1', { t: s * 1000, lon: p.lon, lat: p.lat, h: 500 });
  }
  const k = kinematics(book.get('r1')!.hist);
  assert.ok(k.ok);
  assert.ok(Math.abs(k.speedMps - 1.4) < 0.1, `${k.speedMps}`);
});

test('한계 속도 바로 아래의 빠른 차량은 항적이 끊기지 않는다', () => {
  const book = new TrackBook();
  const v = MAX_PLAUSIBLE_MPS - 5;
  for (let s = 0; s <= 6; s += 1) {
    const p = offset(GP.lon, GP.lat, 180, v * s);
    book.observe('r1', '축선 1', { t: s * 1000, lon: p.lon, lat: p.lat, h: 500 });
  }
  assert.equal(book.get('r1')!.hist.length, 7);
  assert.ok(Math.abs(kinematics(book.get('r1')!.hist).speedMps - v) < 0.5);
});

test('축선 표본 한 칸씩 튀는 것은 순간이동이 아니다 — 그렇게 보면 항적이 영원히 안 쌓인다', () => {
  // 리허설 표적은 12m 간격 표본에 물려 있어 한 프레임에 12m 를 건너뛴다(=60 m/s).
  // 속도만 보면 전부 순간이동이지만, 절대 변위가 작으므로 항적은 이어져야 한다.
  const book = new TrackBook();
  let m = 0;
  for (let s = 0; s <= 20; s += 1) {
    if (s % 3 === 0) m += 12;                       // 3초에 한 칸씩 딸깍
    const p = offset(GP.lon, GP.lat, 180, m);
    book.observe('r1', '축선 1', { t: s * 1000, lon: p.lon, lat: p.lat, h: 500 });
  }
  const tr = book.get('r1')!;
  assert.equal(tr.hist.length, 21, '표본 딸깍을 순간이동으로 보면 안 된다');
  const k = kinematics(tr.hist);
  assert.ok(k.ok);
  assert.ok(k.speedMps > 3 && k.speedMps < 5, `${k.speedMps}`);   // 12m / 3s = 4 m/s
});

test('스크럽 판별은 변위와 속도를 함께 본다 — 하나만으로는 갈리지 않는다', () => {
  const book = new TrackBook();
  const base = { t: 0, lon: GP.lon, lat: GP.lat, h: 0 };
  book.observe('slow', '느린 큰 이동', base);
  // 변위는 크지만 시간도 충분하다 (차량 이동) → 끊지 않는다
  const farSlow = offset(GP.lon, GP.lat, 180, MAX_JUMP_M + 100);
  book.observe('slow', '느린 큰 이동', { t: 60_000, lon: farSlow.lon, lat: farSlow.lat, h: 0 });
  assert.equal(book.get('slow')!.hist.length, 2);

  // 변위도 크고 속도도 불가능하다 → 스크럽
  book.observe('jump', '스크럽', base);
  const farFast = offset(GP.lon, GP.lat, 180, 3000);
  book.observe('jump', '스크럽', { t: 1000, lon: farFast.lon, lat: farFast.lat, h: 0 });
  assert.equal(book.get('jump')!.hist.length, 1);
  assert.ok(MAX_PLAUSIBLE_MPS > 0);
});
