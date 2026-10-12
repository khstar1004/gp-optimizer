/**
 * 부지 종합 진단(diagnoseSite) 단위시험.
 *
 * 이 함수는 순수 함수(placer 상태만 읽는다)인데도 지금까지 단위시험이 하나도
 * 없었다 — 원인은 `slopeVerdict`/`SLOPE_LIMITS`를 `./placement`에서 가져오고
 * 있었고, `placement.ts`는 Scaffolda 번들을 통해 전역 `Cesium`을 즉시 참조해
 * 브라우저 밖(Node)에서 임포트하면 무조건 죽었기 때문이다(`./siteEngineering`
 * 로 그 상수를 분리한 리팩터로 지금은 가능해졌다).
 *
 * placer는 실제 PlacementManager를 흉내 낸 최소 이중체(fake)를 쓴다 —
 * diagnoseSite가 읽는 필드(items·gpRef·terrain·_computeRoadGraph)만 채운다.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { diagnoseSite, type DiagnosticItem, type DiagnosticPlacer } from '../src/runtime/siteDiagnostics';
import { offset } from '../src/runtime/geo';

/** 기준점 — 임의의 GP 감시탑 근사 좌표. */
const HUB = { lon: 127.245, lat: 38.312 };

/** 기준점에서 방위각 azDeg 로 distM 만큼 이동한 좌표. */
function at(azDeg: number, distM: number) {
  return offset(HUB.lon, HUB.lat, azDeg, distM);
}

let uidSeq = 0;
function item(overrides: Partial<DiagnosticItem> = {}): DiagnosticItem {
  uidSeq += 1;
  return {
    uid: `it-${uidSeq}`,
    spec: { id: 'living-zone', name: '시설', category: 'living' },
    functionTag: undefined,
    details: undefined,
    lon: HUB.lon,
    lat: HUB.lat,
    fillM3: undefined,
    wallMaxM: undefined,
    slopeDeg: undefined,
    ...overrides,
  };
}

function placerOf(
  items: DiagnosticItem[],
  opts: { gpRef?: DiagnosticPlacer['gpRef']; terrain?: DiagnosticPlacer['terrain']; roadGraph?: { edges: unknown[]; totalM: number } } = {},
): DiagnosticPlacer {
  return {
    items,
    gpRef: 'gpRef' in opts ? opts.gpRef : { lon: HUB.lon, lat: HUB.lat },
    terrain: opts.terrain ?? { surfaceReady: true },
    _computeRoadGraph: opts.roadGraph ? () => opts.roadGraph as any : undefined,
  };
}

// ── 준비 상태 ────────────────────────────────────────────────────────────

test('배치된 시설이 없으면 준비되지 않은 상태를 반환한다', () => {
  const r: any = diagnoseSite(placerOf([]));
  assert.equal(r.ready, false);
  assert.match(r.reason, /배치된 시설이 없습니다/);
});

test('placer 자체가 없어도 죽지 않고 같은 미준비 응답을 낸다', () => {
  const r: any = diagnoseSite(undefined);
  assert.equal(r.ready, false);
});

test('위반이 없으면 만점 A 등급과 안내 소견 하나만 남긴다', () => {
  const r: any = diagnoseSite(placerOf([item()]));
  assert.equal(r.ready, true);
  assert.equal(r.score, 100);
  assert.equal(r.grade.letter, 'A');
  assert.equal(r.findings.length, 1);
  assert.equal(r.findings[0].sev, 'low');
  assert.match(r.findings[0].text, /위반 없음/);
});

test('메타 정보(시설수·지형 준비 여부·도로 총연장)를 있는 그대로 전달한다', () => {
  const r: any = diagnoseSite(placerOf([item(), item()], {
    terrain: { surfaceReady: false },
    roadGraph: { edges: [], totalM: 123.6 },
  }));
  assert.equal(r.metrics.count, 2);
  assert.equal(r.terrainReady, false);
  assert.equal(r.metrics.roadTotalM, 124);
});

// ── 위험물 이격 ──────────────────────────────────────────────────────────

test('탄약고가 생활동에서 80m 이내면 위험물 이격 위반을 잡는다', () => {
  const ammo = item({ spec: { id: 'storage-zone', name: '탄약고', category: 'storage' }, functionTag: '탄약고' });
  const barracks = item({ spec: { id: 'living-zone', name: '생활관', category: 'living' }, ...at(90, 60) });
  const r: any = diagnoseSite(placerOf([ammo, barracks]));
  assert.equal(r.metrics.sepViol, 1);
  assert.equal(r.findings[0].sev, 'high');
  assert.match(r.findings[0].text, /탄약고\(탄약고\)↔생활관 60m — 위험물 이격 80m 미달/);
});

test('81m 이면 이격 위반이 아니다', () => {
  const ammo = item({ spec: { id: 'storage-zone', name: '탄약고', category: 'storage' }, functionTag: '탄약고' });
  const barracks = item({ spec: { id: 'living-zone', name: '생활관', category: 'living' }, ...at(90, 81) });
  const r: any = diagnoseSite(placerOf([ammo, barracks]));
  assert.equal(r.metrics.sepViol, 0);
});

test('일반 보급창고는 위험물로 취급하지 않는다', () => {
  const supply = item({ spec: { id: 'storage-zone', name: '보급창고', category: 'storage' }, functionTag: '보급창고' });
  const barracks = item({ spec: { id: 'living-zone', name: '생활관', category: 'living' }, ...at(0, 10) });
  const r: any = diagnoseSite(placerOf([supply, barracks]));
  assert.equal(r.metrics.sepViol, 0);
});

test('functionTag이 탄약고·유류고가 아니어도 details.hazard가 일반이 아니면 위험물로 본다', () => {
  const chem = item({
    spec: { id: 'storage-zone', name: '보급창고', category: 'storage' },
    functionTag: '보급창고',
    details: { hazard: '화학물질' },
  });
  const barracks = item({ spec: { id: 'living-zone', name: '생활관', category: 'living' }, ...at(0, 10) });
  const r: any = diagnoseSite(placerOf([chem, barracks]));
  assert.equal(r.metrics.sepViol, 1);
});

test('details.hazard가 "일반"이면 위험물로 보지 않는다', () => {
  const normal = item({
    spec: { id: 'storage-zone', name: '보급창고', category: 'storage' },
    functionTag: '보급창고',
    details: { hazard: '일반' },
  });
  const barracks = item({ spec: { id: 'living-zone', name: '생활관', category: 'living' }, ...at(0, 10) });
  const r: any = diagnoseSite(placerOf([normal, barracks]));
  assert.equal(r.metrics.sepViol, 0);
});

test('탄약고 하나가 여러 민감시설과 가까우면 위반이 그 수만큼 쌓인다', () => {
  const ammo = item({ spec: { id: 'storage-zone', name: '탄약고', category: 'storage' }, functionTag: '탄약고' });
  const near1 = item({ spec: { id: 'living-zone', name: '생활관1', category: 'living' }, ...at(0, 10) });
  const near2 = item({ spec: { id: 'command-zone', name: '지휘소', category: 'command' }, ...at(90, 20) });
  const far = item({ spec: { id: 'living-zone', name: '생활관2', category: 'living' }, ...at(180, 500) });
  const r: any = diagnoseSite(placerOf([ammo, near1, near2, far]));
  assert.equal(r.metrics.sepViol, 2);
});

// ── C2 근접 ─────────────────────────────────────────────────────────────

test('지휘시설이 허브(감시탑)에서 150m 넘게 떨어지면 C2 근접 위반', () => {
  const cmd = item({ spec: { id: 'command-zone', name: '지휘소', category: 'command' }, ...at(45, 200) });
  const r: any = diagnoseSite(placerOf([cmd]));
  assert.equal(r.metrics.cmdFar, 1);
  assert.ok(r.findings.some((f: any) => f.sev === 'med' && /C2 근접/.test(f.text)));
});

test('지휘시설이 150m 이내면 위반이 없다', () => {
  const cmd = item({ spec: { id: 'command-zone', name: '지휘소', category: 'command' }, ...at(45, 100) });
  const r: any = diagnoseSite(placerOf([cmd]));
  assert.equal(r.metrics.cmdFar, 0);
});

test('허브(gpRef)가 없으면 C2 근접 판정 자체를 하지 않는다', () => {
  const cmd = item({ spec: { id: 'command-zone', name: '지휘소', category: 'command' }, ...at(45, 5000) });
  const r: any = diagnoseSite(placerOf([cmd], { gpRef: null }));
  assert.equal(r.metrics.cmdFar, 0);
});

test('gpRef가 lng로만 와도 lon처럼 읽는다', () => {
  const cmd = item({ spec: { id: 'command-zone', name: '지휘소', category: 'command' }, ...at(45, 200) });
  const r: any = diagnoseSite(placerOf([cmd], { gpRef: { lng: HUB.lon, lat: HUB.lat } }));
  assert.equal(r.metrics.cmdFar, 1);
});

// ── 순환·의무 후송 ───────────────────────────────────────────────────────

test('의무시설 접근로가 도보 등급이면 MEDEVAC 제한 위반', () => {
  const care = item({ uid: 'care1', spec: { id: 'medical-zone', name: '의무실', category: 'care' } });
  const r: any = diagnoseSite(placerOf([care], {
    roadGraph: { edges: [{ toUid: 'care1', lengthM: 120, maxDeg: 22, grade: { key: 'foot' } }], totalM: 120 },
  }));
  assert.equal(r.metrics.medBlocked, 1);
  assert.ok(r.findings.some((f: any) => f.sev === 'high' && /MEDEVAC/.test(f.text)));
});

test('의무시설 접근로가 차량 등급이면 위반이 아니다', () => {
  const care = item({ uid: 'care1', spec: { id: 'medical-zone', name: '의무실', category: 'care' } });
  const r: any = diagnoseSite(placerOf([care], {
    roadGraph: { edges: [{ toUid: 'care1', lengthM: 120, maxDeg: 6, grade: { key: 'car' } }], totalM: 120 },
  }));
  assert.equal(r.metrics.medBlocked, 0);
});

test('의무시설에 접근로 자체가 없으면 위반으로 세지 않는다', () => {
  const care = item({ uid: 'care1', spec: { id: 'medical-zone', name: '의무실', category: 'care' } });
  const r: any = diagnoseSite(placerOf([care], { roadGraph: { edges: [], totalM: 0 } }));
  assert.equal(r.metrics.medBlocked, 0);
});

test('_computeRoadGraph가 없는 placer도 죽지 않고 빈 그래프로 취급한다', () => {
  const care = item({ uid: 'care1', spec: { id: 'medical-zone', name: '의무실', category: 'care' } });
  const r: any = diagnoseSite(placerOf([care]));
  assert.equal(r.metrics.medBlocked, 0);
  assert.equal(r.metrics.edgeCount, 0);
  assert.equal(r.metrics.roadTotalM, 0);
});

test('도보 등급 접근로 비율만큼 점수가 깎인다', () => {
  const a = item({ uid: 'a' });
  const b = item({ uid: 'b' });
  const r: any = diagnoseSite(placerOf([a, b], {
    roadGraph: {
      edges: [
        { toUid: 'a', lengthM: 50, maxDeg: 5, grade: { key: 'car' } },
        { toUid: 'b', lengthM: 60, maxDeg: 25, grade: { key: 'foot' } },
      ],
      totalM: 110,
    },
  }));
  assert.equal(r.metrics.footEdges, 1);
  assert.equal(r.metrics.edgeCount, 2);
  assert.equal(r.score, 95); // 100 - round(1/2 * 10)
});

// ── 생활권 집적 ──────────────────────────────────────────────────────────

test('생활권 시설이 130m 넘게 흩어지면 집적 권장 소견을 남긴다', () => {
  const l1 = item({ spec: { id: 'living-zone', name: '생활관A', category: 'living' } });
  const l2 = item({ spec: { id: 'living-zone', name: '생활관B', category: 'living' }, ...at(90, 200) });
  const r: any = diagnoseSite(placerOf([l1, l2]));
  assert.ok(r.findings.some((f: any) => f.sev === 'low' && /산개/.test(f.text)));
});

test('생활권 시설이 하나뿐이면 집적 판정을 하지 않는다', () => {
  const l1 = item({ spec: { id: 'living-zone', name: '생활관A', category: 'living' } });
  const r: any = diagnoseSite(placerOf([l1]));
  assert.ok(!r.findings.some((f: any) => /산개/.test(f.text)));
});

// ── 토공·건축적지 ─────────────────────────────────────────────────────────

test('경사 10도는 양호로, 20도는 정지필요로, 20도 초과는 건축불가로 센다', () => {
  const easy = item({ slopeDeg: 10 });
  const grade = item({ slopeDeg: 20 });
  const unfit = item({ slopeDeg: 20.5 });
  const r: any = diagnoseSite(placerOf([easy, grade, unfit]));
  assert.equal(r.metrics.nEasy, 1);
  assert.equal(r.metrics.nGrade, 1);
  assert.equal(r.metrics.nUnfit, 1);
  assert.ok(r.findings.some((f: any) => f.sev === 'high' && /건축 부적합/.test(f.text)));
  assert.ok(r.findings.some((f: any) => f.sev === 'low' && /정지 필요/.test(f.text)));
});

test('slopeDeg가 없는 시설은 경사 집계에서 빠진다', () => {
  const noSlope = item({ slopeDeg: undefined });
  const r: any = diagnoseSite(placerOf([noSlope]));
  assert.equal(r.metrics.nEasy, 0);
  assert.equal(r.metrics.nGrade, 0);
  assert.equal(r.metrics.nUnfit, 0);
});

test('옹벽고는 합이 아니라 최댓값을 취한다', () => {
  const a = item({ spec: { id: 'living-zone', name: 'A동', category: 'living' }, wallMaxM: 3 });
  const b = item({ spec: { id: 'living-zone', name: 'B동', category: 'living' }, wallMaxM: 9 });
  const r: any = diagnoseSite(placerOf([a, b]));
  assert.equal(r.metrics.wallMax, 9);
  assert.ok(r.findings.some((f: any) => f.sev === 'med' && /B동: 옹벽고 9\.0m/.test(f.text)));
});

test('성토량은 시설별로 합산되고, 값이 없는 시설은 건너뛴다', () => {
  const a = item({ fillM3: 100 });
  const b = item({ fillM3: 50.4 });
  const c = item({ fillM3: undefined });
  const r: any = diagnoseSite(placerOf([a, b, c]));
  assert.equal(r.metrics.fillTot, 150);
});

// ── 점수·등급 ────────────────────────────────────────────────────────────

function hazardScenario(nSensitive: number) {
  const ammo = item({ spec: { id: 'storage-zone', name: '탄약고', category: 'storage' }, functionTag: '탄약고' });
  const sensitives = Array.from({ length: nSensitive }, (_, i) => item({
    spec: { id: 'living-zone', name: `생활관${i}`, category: 'living' },
    ...at(i * 30, 5),
  }));
  return placerOf([ammo, ...sensitives]);
}

test('위반 2건(-24점)은 B, 5건(정확히 40점)은 D 등급이다', () => {
  const r2: any = diagnoseSite(hazardScenario(2));
  assert.equal(r2.score, 76);
  assert.equal(r2.grade.letter, 'B');

  const r5: any = diagnoseSite(hazardScenario(5));
  assert.equal(r5.score, 40);
  assert.equal(r5.grade.letter, 'D');
});

test('점수는 0 밑으로 내려가지 않고 등급은 E로 바닥난다', () => {
  const r: any = diagnoseSite(hazardScenario(10));
  assert.equal(r.score, 0);
  assert.equal(r.grade.letter, 'E');
});

test('여러 종류의 위반이 동시에 있으면 감점이 모두 합산된다', () => {
  const ammo = item({ spec: { id: 'storage-zone', name: '탄약고', category: 'storage' }, functionTag: '탄약고' });
  const barracks = item({ spec: { id: 'living-zone', name: '생활관', category: 'living' }, ...at(0, 10) }); // -12
  const cmd = item({ spec: { id: 'command-zone', name: '지휘소', category: 'command' }, ...at(90, 300) }); // -6
  const care = item({ uid: 'care1', spec: { id: 'medical-zone', name: '의무실', category: 'care' }, ...at(180, 300) }); // -10
  const unfit = item({ spec: { id: 'infrastructure-zone', name: '부적합동', category: 'infrastructure' }, slopeDeg: 25 }); // -8

  const r: any = diagnoseSite(placerOf([ammo, barracks, cmd, care, unfit], {
    roadGraph: { edges: [{ toUid: 'care1', lengthM: 80, maxDeg: 24, grade: { key: 'foot' } }], totalM: 80 }, // 추가로 -10 (foot 비율 100%)
  }));

  // 100 - 12(이격) - 10(MEDEVAC) - 6(C2) - 8(부적합경사) - 10(도보비율 1/1) = 54
  assert.equal(r.score, 54);
  assert.equal(r.grade.letter, 'D');
});

test('소견은 심각도 순(high→med→low)으로, 같은 등급 안에서는 발생 순서를 지킨다', () => {
  const ammo = item({ spec: { id: 'storage-zone', name: '탄약고', category: 'storage' }, functionTag: '탄약고' });
  const barracks = item({ spec: { id: 'living-zone', name: '생활관', category: 'living' }, ...at(0, 10) }); // high
  const cmd = item({ spec: { id: 'command-zone', name: '지휘소', category: 'command' }, ...at(90, 300) }); // med
  const wallItem = item({ spec: { id: 'infrastructure-zone', name: '옹벽동', category: 'infrastructure' }, wallMaxM: 9 }); // med
  const gradeItem = item({ spec: { id: 'infrastructure-zone', name: '정지동', category: 'infrastructure' }, slopeDeg: 15 }); // low

  const r: any = diagnoseSite(placerOf([ammo, barracks, cmd, wallItem, gradeItem]));

  assert.deepEqual(r.findings.map((f: any) => f.sev), ['high', 'med', 'med', 'low']);
  assert.match(r.findings[0].text, /탄약고\(탄약고\)↔생활관/);
  assert.match(r.findings[1].text, /옹벽동: 옹벽고 9\.0m/);
  assert.match(r.findings[2].text, /지휘소.*C2 근접/);
  assert.match(r.findings[3].text, /정지 필요 경사.*1동/);
});
