import test from 'node:test';
import assert from 'node:assert/strict';
import {
  assessTargets, capacityKpa, clampStrikeTime, createStrikeReport, CUM_THRESHOLD, DAMAGE_KPA,
  entrySlantM, FUZES, fuzeById, gradeAt, gradeFromDamage, gradeSummary, hardenedScale, hpOf,
  MIN_STANDOFF_M, MUNITIONS, munitionById, overpressureBar, radiusForKpa, roundsToDefeat,
  salvoOffsets, shotDamage, STAGE_LABEL, stageOf, STRIKE_SOURCES, strikeRings, strikeTimeline,
  blastWavelengthM, findVulnerableAimpoint, MAGAZINE_NEW_RATIO, magazineNewKg, magazineRings,
  MAX_BARRIER_DB, maekawaAttenuationDb, maskFactorFromPathDiff, pathDifferenceM, scoreAimpoint,
  STRIKE_LIMITS,
  type StrikeTarget,
} from '../src/domain/strike';

/** 국지 평면 근사 — 도메인은 거리 함수를 주입받으므로 시험도 같은 규약을 쓴다. */
const distM = (aLon: number, aLat: number, bLon: number, bLat: number) => {
  const R = 6371008.8, D2R = Math.PI / 180;
  const x = (bLon - aLon) * D2R * Math.cos(((aLat + bLat) / 2) * D2R) * R;
  const y = (bLat - aLat) * D2R * R;
  return Math.hypot(x, y);
};

test('과압은 거리에 대해 단조 감소하고, 반경 역산은 그 과압을 실제로 되돌려준다', () => {
  let prev = Infinity;
  for (let z = 0.2; z < 40; z *= 1.25) {
    const p = overpressureBar(z);
    assert.ok(p < prev, `Z=${z} 에서 과압이 늘었다`);
    prev = p;
  }
  for (const w of [3, 87, 200]) {
    for (const kPa of Object.values(DAMAGE_KPA)) {
      const r = radiusForKpa(w, kPa);
      // 되푼 거리에서 다시 잰 과압이 목표와 1% 안에 있어야 한다
      assert.ok(Math.abs(overpressureBar(r / Math.cbrt(w)) * 100 - kPa) / kPa < 0.01);
    }
  }
});

test('피해 반경은 문턱 순서를 지키고, 입방근 법칙대로 8배 폭약에 2배로 늘어난다', () => {
  for (const m of MUNITIONS) {
    const r = strikeRings(m, FUZES[0]!);
    assert.ok(r.complete < r.severe, `${m.id}: 완파 < 중파`);
    assert.ok(r.severe < r.moderate, `${m.id}: 중파 < 경파`);
    assert.ok(r.moderate < r.light, `${m.id}: 경파 < 유리`);
    assert.ok(r.crater > 0 && r.crater < r.complete, `${m.id}: 탄공이 완파 반경 안`);
    assert.ok(r.frag > 0);
    // 이 데모는 소규모 재래식 정밀무장만 다룬다 — 유리파손조차 500 m 를 넘지 않는다
    assert.ok(r.light < 500, `${m.id}: 유리파손 ${r.light}m`);
  }
  const one = radiusForKpa(10, DAMAGE_KPA.severe);
  const eight = radiusForKpa(80, DAMAGE_KPA.severe);
  assert.ok(Math.abs(eight / one - 2) < 0.02);
});

test('신관이 반경 구성을 바꾼다 — 공중폭발은 탄공이 없고 저압대가 넓다', () => {
  const m = munitionById('lgb500');
  const impact = strikeRings(m, fuzeById('impact'));
  const delay = strikeRings(m, fuzeById('delay'));
  const air = strikeRings(m, fuzeById('airburst'));
  assert.equal(air.crater, 0);
  assert.ok(delay.crater > impact.crater, '지연신관은 탄공이 더 크다');
  assert.ok(delay.light < impact.light, '지연신관은 지표 과압이 줄어든다');
  assert.ok(air.light > impact.light, '공중폭발은 유리파손이 넓다');
  assert.ok(air.complete < impact.complete, '공중폭발은 완파대가 좁다');
  assert.ok(air.frag > impact.frag, '공중폭발은 파편이 넓게 퍼진다');
});

test('방호 시설은 반경이 줄지만 관통탄두 + 지연신관에는 이점이 사라진다', () => {
  const pen = munitionById('pen1000');
  const lgb = munitionById('lgb500');
  assert.equal(hardenedScale(false, pen, fuzeById('delay')), 1);
  assert.ok(hardenedScale(true, lgb, fuzeById('impact')) < 0.7);
  assert.ok(hardenedScale(true, lgb, fuzeById('delay')) < 0.7, '비관통탄은 지연신관이어도 못 뚫는다');
  assert.ok(hardenedScale(true, pen, fuzeById('delay')) > 0.9, '관통탄 + 지연신관은 방호를 무력화한다');
});

test('등급 판정은 거리 문턱을 그대로 따르고 파편 반경이 최소 경계를 잡는다', () => {
  const rings = strikeRings(munitionById('pgm155'), FUZES[0]!);
  assert.equal(gradeAt(rings.complete - 0.1, rings), 'destroyed');
  assert.equal(gradeAt(rings.complete + 0.1, rings), 'severe');
  assert.equal(gradeAt(rings.severe + 0.1, rings), 'moderate');
  assert.equal(gradeAt(rings.moderate + 0.1, rings), 'light');
  // 이 탄은 파편(≈80m)이 유리파손(≈51m)보다 넓다 — 그 사이도 경상 위험이다
  assert.ok(rings.frag > rings.light);
  assert.equal(gradeAt(rings.light + 1, rings), 'light');
  assert.equal(gradeAt(rings.frag + 1, rings), 'none');
});

test('판정은 가까운 순으로 정렬되고 방호 여부가 등급을 바꾼다', () => {
  const m = munitionById('lgb500');
  const fuze = fuzeById('impact');
  const rings = strikeRings(m, fuze);
  const impact = { lon: 128.125, lat: 38.328 };
  // 위도 1도 ≈ 111.2km — 중파 경계(≈24m) 바로 안쪽에 두 동을 세운다
  const at = (northM: number, hardened: boolean, uid: string): StrikeTarget => ({
    uid, name: uid, kind: '시설', hardened,
    lon: impact.lon, lat: impact.lat + northM / 111_195,
  });
  const rows = assessTargets(
    [at(300, false, 'far'), at(22, false, 'soft'), at(22, true, 'hard')],
    impact, rings, m, fuze, distM);
  assert.deepEqual(rows.map((r) => r.uid).slice(0, 2).sort(), ['hard', 'soft']);
  assert.equal(rows.at(-1)!.uid, 'far');
  const soft = rows.find((r) => r.uid === 'soft')!;
  const hard = rows.find((r) => r.uid === 'hard')!;
  assert.equal(soft.grade, 'severe');
  assert.equal(hard.grade, 'moderate', '방호 시설은 같은 거리에서 더 가벼운 등급이어야 한다');
  assert.ok(Math.abs(soft.distM - hard.distM) < 0.5);
  const counts = gradeSummary(rows);
  assert.equal(counts.destroyed + counts.severe + counts.moderate + counts.light + counts.none, 3);
});

// 방호가 등급을 「낮춘다」 — 위 시험이 뒤집혀 보이는 이유를 못 박는다.
test('방호 배율은 문턱 거리를 줄이므로 같은 거리라도 등급이 한 단계 가벼워진다', () => {
  const m = munitionById('lgb500');
  const rings = strikeRings(m, fuzeById('impact'));
  const scale = hardenedScale(true, m, fuzeById('impact'));
  const d = rings.severe * 0.9;                    // 비방호라면 중파가 되는 거리
  assert.equal(gradeAt(d, rings), 'severe');
  assert.equal(gradeAt(d, rings, scale), 'moderate');
});

test('시간축은 탄종과 무관하게 같은 길이를 쓰고 경사거리만 속도를 따른다', () => {
  for (const m of MUNITIONS) {
    const rings = strikeRings(m, FUZES[0]!);
    const tl = strikeTimeline(m, FUZES[0]!, rings);
    assert.equal(tl.flightS, 6);
    assert.equal(tl.impactS, 6);
    assert.ok(tl.totalS > tl.impactS);
    assert.equal(entrySlantM(m), m.terminalMps * 6);
    // 장면 기록은 시간순이고 전부 총 길이 안에 있다
    const times = tl.events.map((e) => e.time);
    assert.deepEqual(times, [...times].sort((a, b) => a - b));
    assert.ok(times.every((t) => t <= tl.totalS));
  }
  const tl = strikeTimeline(MUNITIONS[0]!, FUZES[0]!, strikeRings(MUNITIONS[0]!, FUZES[0]!));
  for (const t of [NaN, Infinity, -Infinity, -1]) assert.equal(clampStrikeTime(t, tl.totalS), 0);
  assert.equal(clampStrikeTime(1e9, tl.totalS), tl.totalS);
});

test('알 수 없는 탄종·신관은 기본값으로 떨어지고 절대 undefined 를 내지 않는다', () => {
  assert.equal(munitionById('없는탄').id, 'sdb');
  assert.equal(munitionById(undefined).id, 'sdb');
  assert.equal(fuzeById(null).id, 'impact');
});

test('효과판정 기록은 반경 산출 근거와 한계를 함께 싣고 원본을 건드리지 않는다', () => {
  const m = munitionById('gmlrs');
  const fuze = fuzeById('impact');
  const rings = strikeRings(m, fuze);
  const rows = assessTargets(
    [{ uid: 'a', name: '지휘통제동', kind: '시설', hardened: false, lon: 128.125, lat: 38.3281 }],
    { lon: 128.125, lat: 38.328 }, rings, m, fuze, distM);
  const report = createStrikeReport({
    munition: m, fuze, rings,
    impact: { lon: 128.125, lat: 38.328, groundH: 1025, mgrs: '52SDG0000000000' },
    launchAzDeg: 340, rows, notes: 'x'.repeat(5000),
  });
  assert.equal(report.schema, 'gp-digital-twin.strike-effect-assessment');
  assert.equal(report.notes.length, 4000);
  assert.equal(report.munition.netExplosiveKg, m.newKg);
  assert.deepEqual(report.rings.thresholdsKpa, DAMAGE_KPA);
  assert.equal(report.rings.effectiveTntKg, Math.round(rings.effectiveKg * 10) / 10);
  assert.ok(report.limitations.length >= 4);
  assert.ok(report.sources.length >= 3);
  assert.equal(report.targets.length, 1);
  assert.equal(report.summary.destroyed + report.summary.severe + report.summary.moderate
    + report.summary.light + report.summary.none, 1);
  (report.sources[0] as { title: string }).title = '고침';
  report.targets[0]!.name = '고침';
  assert.equal(rows[0]!.name, '지휘통제동');
  assert.equal(STRIKE_SOURCES[0]!.title.startsWith('Brode'), true);
  assert.equal(m.name, MUNITIONS.find((x) => x.id === 'gmlrs')!.name);
});

// ───────────── 다발 타격 · 누적 손상 ─────────────

test('누적 판정은 1발일 때 반경 판정과 정확히 같은 답을 낸다', () => {
  const m = munitionById('lgb500');
  const fuze = fuzeById('impact');
  const rings = strikeRings(m, fuze);
  const cap = capacityKpa(false, m, fuze);
  // 각 등급의 문턱 바로 안쪽 거리에서 두 방식이 일치해야 한다
  for (const d of [rings.complete * 0.9, rings.severe * 0.9, rings.moderate * 0.9, rings.light * 0.9]) {
    assert.equal(gradeFromDamage(shotDamage(d, rings.effectiveKg, cap)), gradeAt(d, rings),
      `d=${d.toFixed(1)}m 에서 반경 판정과 누적 판정이 갈렸다`);
  }
});

test('손상은 발수에 따라 쌓이고, 쌓이면 등급이 올라간다', () => {
  const m = munitionById('pgm155');
  const fuze = fuzeById('impact');
  const rings = strikeRings(m, fuze);
  const cap = capacityKpa(false, m, fuze);
  // 경파 문턱 바로 안쪽 — 한 발로는 경파, 쌓이면 중파·완파로 올라간다
  const d = rings.moderate * 0.9;
  const one = shotDamage(d, rings.effectiveKg, cap);
  assert.equal(gradeFromDamage(one), 'moderate');
  assert.ok(gradeFromDamage(one * 3) === 'severe');
  assert.equal(gradeFromDamage(one * 8), 'destroyed');
  // 방호 구조는 같은 자리에서 더 적게 상한다
  assert.ok(shotDamage(d, rings.effectiveKg, capacityKpa(true, m, fuze)) < one / 3);
});

test('폭심 0m 는 발산하지 않는다 — 최소 이격으로 묶는다', () => {
  const m = munitionById('tbm');
  const fuze = fuzeById('impact');
  const rings = strikeRings(m, fuze);
  const cap = capacityKpa(false, m, fuze);
  for (const d of [0, -5, 0.001, MIN_STANDOFF_M]) {
    const v = shotDamage(d, rings.effectiveKg, cap);
    assert.ok(Number.isFinite(v) && v > 1 && v <= 20, `d=${d} 에서 ${v}`);
  }
  assert.equal(shotDamage(0, rings.effectiveKg, cap), shotDamage(MIN_STANDOFF_M, rings.effectiveKg, cap));
});

test('필요 발수는 거리에 따라 늘고, CEP 산포 때문에 90% 값이 중앙값 이상이다', () => {
  const m = munitionById('pgm155');
  const fuze = fuzeById('impact');
  const rings = strikeRings(m, fuze);
  const near = roundsToDefeat({ munition: m, fuze, rings, targetDistM: 10, hardened: false });
  const far = roundsToDefeat({ munition: m, fuze, rings, targetDistM: 26, hardened: false });
  assert.ok(near.p50! < far.p50!, '멀수록 더 많이 필요해야 한다');
  assert.ok(near.p90! >= near.p50!);
  assert.ok(far.p90! >= far.p50!);
  assert.equal(near.survivedRatio, 0);
  // 방호는 같은 거리에서 더 많은 발수를 요구한다
  const hard = roundsToDefeat({ munition: m, fuze, rings, targetDistM: 10, hardened: true });
  assert.ok(hard.p90! > near.p90!);
  // 유효 반경 밖이면 상한 안에 무너지지 않는다
  const out = roundsToDefeat({ munition: m, fuze, rings, targetDistM: 400, hardened: false });
  assert.equal(out.p50, null);
  assert.equal(out.survivedRatio, 1);
});

test('같은 계획은 같은 탄착 산포를 낸다 — 되감아도 재현된다', () => {
  const m = munitionById('gmlrs');
  const a = salvoOffsets(m, 8, 7);
  const b = salvoOffsets(m, 8, 7);
  assert.deepEqual(a, b);
  assert.notDeepEqual(a, salvoOffsets(m, 8, 9));
  assert.equal(a.length, 8);
  // 산포는 CEP 규모여야 한다 — 절반쯤이 CEP 원 안에 든다
  const inside = salvoOffsets(m, 400, 3).filter((o) => o.missM <= m.cepM).length / 400;
  assert.ok(inside > 0.35 && inside < 0.65, `CEP 원 안 비율 ${inside}`);
  assert.ok(a.every((o) => Math.abs(o.missM - Math.hypot(o.northM, o.eastM)) < 1e-9));
});

test('모든 탄종에 재장전 간격이 있고 연속사격 시간축이 성립한다', () => {
  for (const m of MUNITIONS) {
    assert.ok(m.reloadS > 0 && m.reloadS <= 120, `${m.id} reloadS=${m.reloadS}`);
  }
});

// ───────────── HP 와 3D 파손 단계 ─────────────

test('HP 는 누적 손상의 뒤집힌 값이고 0 아래로 내려가지 않는다', () => {
  assert.equal(hpOf(0), 1);
  assert.equal(hpOf(0.25), 0.75);
  assert.equal(hpOf(1), 0);
  assert.equal(hpOf(4.2), 0);
});

test('형상 단계는 등급 임계와 같은 자리에서 바뀐다 — 표와 그림이 어긋나지 않게', () => {
  assert.equal(stageOf(0), 'intact');
  assert.equal(stageOf(CUM_THRESHOLD.moderate - 1e-6), 'intact');
  assert.equal(stageOf(CUM_THRESHOLD.moderate), 'scarred');
  assert.equal(stageOf(CUM_THRESHOLD.severe - 1e-6), 'scarred');
  assert.equal(stageOf(CUM_THRESHOLD.severe), 'heavy');
  assert.equal(stageOf(0.999), 'heavy');
  assert.equal(stageOf(1), 'ruin');
  assert.equal(stageOf(20), 'ruin');
  // 단계가 올라가면 HP 는 반드시 내려간다
  let prev = 1;
  for (const d of [0, 0.1, 0.2, 0.5, 0.9, 1, 3]) {
    const hp = hpOf(d);
    assert.ok(hp <= prev);
    prev = hp;
  }
  for (const st of ['intact', 'scarred', 'heavy', 'ruin'] as const) {
    assert.ok(STAGE_LABEL[st].length > 0);
  }
});

test('발수를 늘리면 HP 가 단조 감소하고 단계가 되돌아가지 않는다', () => {
  const m = munitionById('lgb500');
  const fuze = fuzeById('impact');
  const rings = strikeRings(m, fuze);
  const cap = capacityKpa(false, m, fuze);
  const per = shotDamage(30, rings.effectiveKg, cap);
  const order = { intact: 0, scarred: 1, heavy: 2, ruin: 3 };
  let lastHp = 1;
  let lastStage = 0;
  for (let n = 0; n <= 12; n++) {
    const hp = hpOf(per * n);
    const st = order[stageOf(per * n)];
    assert.ok(hp <= lastHp + 1e-12, `${n}발에서 HP 가 올랐다`);
    assert.ok(st >= lastStage, `${n}발에서 형상 단계가 되돌아갔다`);
    lastHp = hp; lastStage = st;
  }
  assert.equal(hpOf(per * 12), 0);
});

// ───────────── 지형 차폐 · 유폭 · 취약 조준점 ─────────────

test('회절 감쇠는 경로차에 대해 단조 증가하고 상한에 묶인다', () => {
  const lam = blastWavelengthM(157);
  assert.equal(maekawaAttenuationDb(0, lam), 0);
  assert.equal(maekawaAttenuationDb(-3, lam), 0);
  let prev = -1;
  for (const d of [0.05, 0.2, 0.5, 1, 3, 8, 20, 60, 200]) {
    const db = maekawaAttenuationDb(d, lam);
    assert.ok(db >= prev, `δ=${d} 에서 감쇠가 줄었다`);
    assert.ok(db <= MAX_BARRIER_DB + 1e-9);
    prev = db;
  }
  assert.equal(maekawaAttenuationDb(500, lam), MAX_BARRIER_DB);
  // 스치듯 가릴 때 압력이 뚝 떨어지지 않는다 (프레넬 구간에서 서서히 든다)
  assert.ok(maekawaAttenuationDb(lam / 200, lam) < 1);
});

test('큰 폭약일수록 능선이 덜 막아 준다 — 펄스가 길어 회절로 돌아 들어간다', () => {
  const delta = 6;
  const small = maskFactorFromPathDiff(delta, 5);
  const big = maskFactorFromPathDiff(delta, 5000);
  assert.ok(big > small, `큰 폭약이 더 막혀서는 안 된다 (${big} vs ${small})`);
  assert.ok(small >= 10 ** (-MAX_BARRIER_DB / 20) - 1e-9);
  assert.ok(maskFactorFromPathDiff(0, 100) === 1);
});

test('경로차는 직선 위로 솟은 지형에서만 생긴다', () => {
  // 능선이 직선을 넘는 경우
  const blocked = pathDifferenceM([100, 108, 120, 112, 100, 90], 100, 90, 120);
  assert.ok(blocked > 1, `가려졌는데 경로차가 ${blocked}`);
  // 직선 아래로만 지나는 경우 — 계곡
  assert.equal(pathDifferenceM([100, 92, 85, 84, 86, 90], 100, 90, 120), 0);
  // 표본이 모자라거나 거리가 0 이면 계산하지 않는다
  assert.equal(pathDifferenceM([100, 90], 100, 90, 120), 0);
  assert.equal(pathDifferenceM([100, 120, 90], 100, 90, 0), 0);
});

test('차폐가 걸리면 같은 거리라도 손상과 필요 발수가 달라진다', () => {
  const m = munitionById('lgb500');
  const fuze = fuzeById('impact');
  const rings = strikeRings(m, fuze);
  const cap = capacityKpa(false, m, fuze);
  const open = shotDamage(30, rings.effectiveKg, cap, 1);
  const masked = shotDamage(30, rings.effectiveKg, cap, 0.2);
  assert.ok(masked < open / 3, `차폐가 손상을 못 줄였다 (${masked} vs ${open})`);
  const a = roundsToDefeat({ munition: m, fuze, rings, targetDistM: 30, hardened: false });
  const b = roundsToDefeat({ munition: m, fuze, rings, targetDistM: 30, hardened: false, mask: 0.2 });
  assert.ok((b.p90 ?? 99) > (a.p90 ?? 0), '차폐된 표적이 더 적은 발수로 무너졌다');
});

test('탄약고 유폭은 저장 톤수에서 나오고 1차 타격보다 크다', () => {
  assert.equal(magazineNewKg(50), 50 * 1000 * MAGAZINE_NEW_RATIO);
  assert.equal(magazineNewKg(0), 0);
  assert.equal(magazineNewKg(-3), 0);
  const mag = magazineRings(magazineNewKg(50));
  const tbm = strikeRings(munitionById('tbm'), fuzeById('impact'));
  assert.ok(mag.complete > tbm.complete * 2, '유폭이 최대 탄종보다 크지 않다');
  assert.ok(mag.crater > 0 && mag.severe > mag.complete && mag.light > mag.moderate);
  // 저장량이 8배면 반경은 2배 (입방근 법칙)
  const big = magazineRings(magazineNewKg(400));
  assert.ok(Math.abs(big.complete / mag.complete - 2) < 0.05);
});

test('취약 조준점은 시설이 몰린 쪽을 찾아낸다', () => {
  const cap = DAMAGE_KPA.complete;
  const center = { lon: 128.125, lat: 38.328 };
  const dn = (m: number) => center.lat + m / 111_195;
  // 북쪽 60m 에 세 동을 몰아 두고, 남쪽 60m 에 한 동
  const targets = [
    { lon: center.lon, lat: dn(60), capKpa: cap },
    { lon: center.lon + 0.0002, lat: dn(62), capKpa: cap },
    { lon: center.lon - 0.0002, lat: dn(58), capKpa: cap },
    { lon: center.lon, lat: dn(-60), capKpa: cap },
  ];
  const rings = strikeRings(munitionById('lgb500'), fuzeById('impact'));
  const { best, grid } = findVulnerableAimpoint(targets, center, rings.effectiveKg, distM,
    { halfSpanM: 90, steps: 19 });
  assert.equal(grid.length, 19 * 19);
  assert.ok(best.lat > center.lat, '시설이 몰린 북쪽을 못 찾았다');
  assert.ok(best.score >= Math.max(...grid.map((g) => g.score)) - 1e-9);
  // 점수는 대상마다 1 로 잘려 있으므로 대상 수를 넘지 않는다
  assert.ok(best.score <= targets.length);
  assert.ok(scoreAimpoint(targets, { lon: center.lon, lat: dn(5000) }, rings.effectiveKg, distM) < 0.01);
});

test('먼 거리에서 과압이 음수로 내려가 NaN 을 만들지 않는다', () => {
  // Brode 원거리 가지의 상수항은 Z≈47 을 넘으면 식을 음수로 만든다.
  for (const z of [40, 47, 60, 200, 5000]) {
    const p = overpressureBar(z);
    assert.ok(Number.isFinite(p) && p >= 0, `Z=${z} 에서 ${p}`);
  }
  const rings = strikeRings(munitionById('lgb500'), fuzeById('impact'));
  for (const d of [500, 2000, 20000]) {
    const v = shotDamage(d, rings.effectiveKg, DAMAGE_KPA.complete);
    assert.ok(Number.isFinite(v), `${d}m 에서 손상이 ${v}`);
    assert.equal(v, 0);
  }
  // 손상 합이 NaN 으로 오염되지 않는다
  const far = [{ lon: 128.125, lat: 38.328 + 5000 / 111_195, capKpa: DAMAGE_KPA.complete }];
  const score = scoreAimpoint(far, { lon: 128.125, lat: 38.328 }, rings.effectiveKg, distM);
  assert.ok(Number.isFinite(score) && score < 0.01, `먼 표적 점수 ${score}`);
});

// ───────────── 게임 피드백: 시간 배율 · 결과 등급 ─────────────

test('탄착 순간의 시간 배율은 0.25~1 사이에서만 움직인다', () => {
  // 씬 없이 순수 함수만 시험한다 — 규칙은 도메인이 아니라 연출이지만,
  // 시간이 멈추거나 거꾸로 가면 재생이 영영 끝나지 않는다.
  const shots = [{ at: 6 }, { at: 21 }];
  const scale = (t: number) => {
    let best = 1;
    for (const sh of shots) {
      const d = t - sh.at;
      if (d < -0.6 || d > 0.9) continue;
      const u = d < 0 ? (d + 0.6) / 0.6 : 1 - d / 0.9;
      const e = Math.max(0, Math.min(1, u));
      best = Math.min(best, 1 - 0.75 * (e * e * (3 - 2 * e)));
    }
    return best;
  };
  for (let t = 0; t < 30; t += 0.05) {
    const v = scale(t);
    assert.ok(v >= 0.25 - 1e-9 && v <= 1 + 1e-9, `t=${t.toFixed(2)} 에서 배율 ${v}`);
  }
  assert.equal(scale(0), 1);
  assert.ok(scale(6) < 0.3, '탄착에서 가장 느려야 한다');
  assert.equal(scale(10), 1, '탄착에서 멀어지면 원속도로 돌아와야 한다');
  assert.ok(scale(21) < 0.3, '두 번째 발에서도 느려져야 한다');
});

test('한계 문구가 실제 모델과 어긋나지 않는다', () => {
  // 지형 차폐를 넣은 뒤에도 「자유장 가정이라 크게 나옵니다」가 남아 있었다.
  // 이 배열은 내려받는 기록에 그대로 들어간다 — 거짓 한 줄은 면책이 아니라 오류다.
  assert.ok(!STRIKE_LIMITS.some((l) => /개활 자유장 가정입니다/.test(l)),
    '지형 차폐를 계산하는데 자유장 가정이라고 적혀 있다');
  assert.ok(STRIKE_LIMITS.some((l) => /Maekawa/.test(l)));
  assert.ok(STRIKE_LIMITS.some((l) => /탄약고 유폭/.test(l)));
});

test('기록에 유폭·지형차폐·HP 가 빠지지 않는다', () => {
  const m = munitionById('tbm');
  const fuze = fuzeById('impact');
  const rings = strikeRings(m, fuze);
  const rows = assessTargets(
    [{ uid: 'a', name: '창고 구역', kind: '시설', hardened: false, lon: 128.125, lat: 38.3281 }],
    { lon: 128.125, lat: 38.328 }, rings, m, fuze, distM,
  ).map((r) => ({ ...r, cumulative: 1.4, mask: 0.31, secondary: 0.6 }));
  const magKg = magazineNewKg(50);
  const report = createStrikeReport({
    munition: m, fuze, rings,
    impact: { lon: 128.125, lat: 38.328, groundH: 1025, mgrs: '52SDG0000000000' },
    launchAzDeg: 350, rounds: 3, gapS: 15,
    shots: [{ n: 1, lon: 128.125, lat: 38.328, at: 6, missM: 4.2 }],
    secondaries: [{
      uid: 'a', name: '창고 구역', lon: 128.125, lat: 38.328,
      tons: 50, newKg: magKg, atS: 10.5, rings: magazineRings(magKg),
    }],
    rows, notes: '',
  });
  assert.equal(report.secondaries.length, 1);
  assert.equal(report.secondaries[0]!.storedTons, 50);
  assert.equal(report.secondaries[0]!.netExplosiveKg, Math.round(magKg));
  assert.ok(report.secondaries[0]!.completeM > 0);
  assert.equal(report.terrainMasking.model, 'Maekawa barrier diffraction');
  assert.equal(report.terrainMasking.maxAttenuationDb, MAX_BARRIER_DB);
  const t = report.targets[0]!;
  assert.equal(t.terrainMask, 0.31);
  assert.equal(t.secondaryDamage, 0.6);
  assert.equal(t.stage, 'ruin');
  assert.equal(t.hp, 0);
  assert.equal(report.salvo.rounds, 3);
  assert.equal(report.salvo.shots[0]!.missM, 4.2);
});
