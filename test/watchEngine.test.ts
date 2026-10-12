import assert from 'node:assert/strict';
import test from 'node:test';

import { offset } from '../src/runtime/geo';
import {
  EVENT_LABEL, FINAL_GAP_WARN_M, GRADE_RANK, describeGap, diffWatch, evaluateWatch, routeCoverage,
  type WatchAsset,
} from '../src/runtime/watchEngine';

const GP = { lon: 128.125, lat: 38.328 };

function asset(over: Partial<WatchAsset> = {}): WatchAsset {
  return {
    uid: 'sp1', name: 'IR-01', short: 'IR', type: 'ir', color: '#f28dbb',
    lon: GP.lon, lat: GP.lat, eyeH: 1030, aimAz: 0, fov: 60,
    ...over,
  };
}
const perf = (range: number) => () => ({ range, dri: [range, range * 0.34, range * 0.17] });
const at = (azDeg: number, d: number, key = 't1', name = '축선 1') => {
  const q = offset(GP.lon, GP.lat, azDeg, d);
  return { key, name, lon: q.lon, lat: q.lat };
};

// ── 지금 무엇을 잡고 있는가 ────────────────────────────────────────────
test('부채꼴·실효거리·가시선을 모두 통과한 자산만 표적을 잡는다', () => {
  const w = evaluateWatch([asset()], [at(10, 1000)], { perfOf: perf(2800) }).get('t1')!;
  assert.equal(w.holders.length, 1);
  assert.equal(w.best!.grade, '탐지');
  assert.equal(w.rank, GRADE_RANK.탐지);
});

test('감시는 지향을 돌리지 않는다 — 인계와 다른 물음이다', () => {
  // crossCue 였다면 「지향 전환하면 가능」이지만, 감시는 지금 그대로를 묻는다
  const w = evaluateWatch([asset()], [at(120, 1000)], { perfOf: perf(2800) }).get('t1')!;
  assert.equal(w.rank, 0);
  assert.equal(w.best, null);
});

test('전방위 자산은 방위와 무관하게 본다', () => {
  const w = evaluateWatch([asset({ fov: 360 })], [at(200, 500)], { perfOf: perf(900) }).get('t1')!;
  assert.equal(w.rank, GRADE_RANK.탐지);   // 500m > 인지거리 306m
  assert.equal(w.holders.length, 1);
});

test('능선에 막히면 사거리 안이어도 못 본다', () => {
  const w = evaluateWatch([asset()], [at(0, 800)], { perfOf: perf(2800), losOk: () => false }).get('t1')!;
  assert.equal(w.rank, 0);
});

test('여러 자산이 잡으면 가장 좋은 등급이 그 표적의 판정이 된다', () => {
  const far = asset({ uid: 'a', name: 'IR-01', short: 'IR' });
  const near = asset({ uid: 'b', name: 'EO-02', short: 'EO', ...offsetPos(0, 700) });
  const w = evaluateWatch([far, near], [at(0, 800)], { perfOf: perf(2800) }).get('t1')!;
  assert.equal(w.holders.length, 2);
  assert.equal(w.best!.assetShort, 'EO');     // 100m 앞 → 식별
  assert.equal(w.best!.grade, '식별');
  assert.ok(w.holders[0].rank >= w.holders[1].rank);
});

function offsetPos(azDeg: number, d: number) {
  const q = offset(GP.lon, GP.lat, azDeg, d);
  return { lon: q.lon, lat: q.lat };
}

test('아무도 못 보면 rank 0 이고 목록은 비어 있다', () => {
  const w = evaluateWatch([asset()], [at(0, 9000)], { perfOf: perf(2800) }).get('t1')!;
  assert.equal(w.rank, 0);
  assert.equal(w.holders.length, 0);
});

// ── 바뀐 순간만 사건이 된다 ────────────────────────────────────────────
test('처음 잡히면 최초 탐지, 놓쳤다 다시 잡으면 재획득', () => {
  const seen = new Set<string>();
  const none = evaluateWatch([asset()], [at(0, 9000)], { perfOf: perf(2800) });
  const held = evaluateWatch([asset()], [at(0, 1500)], { perfOf: perf(2800) });

  const e1 = diffWatch(none, held, 1000, seen);
  assert.equal(e1.length, 1);
  assert.equal(e1[0].kind, 'ACQUIRE');
  assert.equal(EVENT_LABEL[e1[0].kind], '최초 탐지');
  assert.equal(e1[0].assetShort, 'IR');

  const e2 = diffWatch(held, none, 2000, seen);
  assert.equal(e2[0].kind, 'LOST');
  assert.equal(e2[0].grade, null);
  assert.equal(e2[0].prevGrade, '탐지');

  const e3 = diffWatch(none, held, 3000, seen);
  assert.equal(e3[0].kind, 'REACQUIRE');
});

test('상태가 그대로면 사건이 없다 — 매초 찍기만 하면 로그가 아니라 잡음이다', () => {
  const seen = new Set<string>();
  const a = evaluateWatch([asset()], [at(0, 1500)], { perfOf: perf(2800) });
  const b = evaluateWatch([asset()], [at(0, 1520)], { perfOf: perf(2800) });
  diffWatch(null, a, 0, seen);
  assert.equal(diffWatch(a, b, 1000, seen).length, 0);
});

test('가까워지면 등급 상승, 멀어지면 등급 하락이 남는다', () => {
  const seen = new Set<string>();
  const far = evaluateWatch([asset()], [at(0, 2000)], { perfOf: perf(2800) });   // 탐지
  const mid = evaluateWatch([asset()], [at(0, 800)], { perfOf: perf(2800) });    // 인지
  diffWatch(null, far, 0, seen);
  const up = diffWatch(far, mid, 1000, seen);
  assert.equal(up[0].kind, 'UPGRADE');
  assert.equal(up[0].prevGrade, '탐지');
  assert.equal(up[0].grade, '인지');
  const down = diffWatch(mid, far, 2000, seen);
  assert.equal(down[0].kind, 'DOWNGRADE');
});

test('표적이 목록에서 사라져도 접촉 상실로 닫힌다', () => {
  const seen = new Set<string>();
  const held = evaluateWatch([asset()], [at(0, 1500)], { perfOf: perf(2800) });
  diffWatch(null, held, 0, seen);
  const ev = diffWatch(held, new Map(), 1000, seen);
  assert.equal(ev.length, 1);
  assert.equal(ev[0].kind, 'LOST');
});

// ── 시간축 감시 공백 ──────────────────────────────────────────────────
/** GP 북쪽 3km 에서 GP 로 곧장 남하하는 축선 */
function southRoute(totalM = 3000, step = 50) {
  const pts = [];
  for (let m = 0; m <= totalM; m += step) {
    const start = offset(GP.lon, GP.lat, 0, totalM);
    const q = offset(start.lon, start.lat, 180, m);
    pts.push({ lon: q.lon, lat: q.lat, cumM: m });
  }
  return { id: 'r1', name: '축선 1', pts, totalM };
}

test('축선 전 구간을 걸으며 관측 비율과 최초 탐지를 낸다', () => {
  const cov = routeCoverage(southRoute(), [asset()], GP, { perfOf: perf(2000) });
  assert.ok(cov.steps.length > 10);
  // 2km 실효거리 → 뒤쪽 1km 는 못 보고 앞쪽 2km 는 본다
  assert.ok(cov.coveredRatio > 0.6 && cov.coveredRatio < 0.72, `${cov.coveredRatio}`);
  assert.ok(cov.firstDetect);
  assert.ok(Math.abs(cov.firstDetect!.distToGpM - 2000) < 120, `${cov.firstDetect!.distToGpM}`);
  assert.equal(cov.firstDetect!.assetShort, 'IR');
});

test('아무 자산도 없으면 전 구간이 공백이고 최초 탐지가 없다', () => {
  const cov = routeCoverage(southRoute(), [], GP, { perfOf: () => null });
  assert.equal(cov.coveredRatio, 0);
  assert.equal(cov.firstDetect, null);
  assert.equal(cov.gaps.length, 1);
  assert.ok(Math.abs(cov.longestGap!.lengthM - 3000) < 60);
  assert.ok(cov.finalGapM > 2900);
});

test('GP 코앞에서 놓치는 마지막 공백이 따로 잡힌다 — 가장 비싼 구간이다', () => {
  // 최소거리 800m 짜리 자산: 800m 안쪽으로 들어오면 부채꼴 밖(뒤)으로 빠진다고 보고
  // 여기서는 아주 짧은 사거리로 마지막 구간만 비게 만든다
  const cov = routeCoverage(southRoute(), [asset({ lat: GP.lat + 0.02 })], GP, { perfOf: perf(1200) });
  assert.ok(cov.finalGapM > 0, '마지막 공백이 0 이면 끝까지 관측된 것');
  assert.ok(cov.longestGap);
  assert.ok(Number.isFinite(cov.longestGap!.nearestGpM));
});

test('공백 설명은 「어디가」를 GP 이격으로 말한다', () => {
  const s = describeGap({ fromCumM: 0, toCumM: 1200, lengthM: 1200, nearestGpM: 640, midLon: 0, midLat: 0 });
  assert.match(s, /1\.2km 구간/);
  assert.match(s, /GP 640m 지점까지 접근/);
});

test('빈 축선은 계산을 지어내지 않는다', () => {
  const cov = routeCoverage({ id: 'x', name: '빈', pts: [], totalM: 500 }, [asset()], GP, { perfOf: perf(2800) });
  assert.equal(cov.steps.length, 0);
  assert.equal(cov.coveredRatio, 0);
  assert.equal(cov.finalGapM, 500);
});

test('공백에는 좌표가 붙는다 — 「어디가 비었나」는 좌표로 답해야 고칠 수 있다', () => {
  const cov = routeCoverage(southRoute(), [asset()], GP, { perfOf: perf(1500) });
  assert.ok(cov.longestGap);
  assert.ok(Number.isFinite(cov.longestGap!.midLon));
  assert.ok(Number.isFinite(cov.longestGap!.midLat));
  // 공백 중심은 그 공백 구간 안에 있어야 한다
  assert.ok(cov.longestGap!.midLat > GP.lat, '북쪽 구간이 비었어야 한다');
});

test('경고 문턱이 있어야 진짜 경고가 묻히지 않는다', () => {
  assert.ok(FINAL_GAP_WARN_M >= 100, '표본 한 칸(50m)보다는 커야 한다');
});
