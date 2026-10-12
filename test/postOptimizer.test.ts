/**
 * 감시자산 자동 배치(postOptimizer.ts) 단위시험.
 *
 * `optimizePostLayout`는 후보 지반고를 재는 자리에서만(`Cesium.Cartographic.fromDegrees`)
 * Cesium 을 쓴다 — 그 값은 곧바로 주입받은 `sampleHeights` 콜백이 채우는 `.height` 필드로만
 * 쓰이므로, 여기서는 `{lon,lat,height}` 평범한 객체를 돌려주는 최소 스텁만 전역에 얹는다.
 * 이 파일이 실제 브라우저에서 쓰는 진짜 `Cesium.Cartographic` 을 흉내 낼 필요는 없다 —
 * 소비하는 필드(`.height`)만 맞으면 된다.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { SITE } from '../src/runtime/data';
import { distM } from '../src/runtime/geo';
import { buildCandidates, optimizePostLayout } from '../src/runtime/postOptimizer';

// `optimizePostLayout`는 후보 지반고를 재는 자리에서만 `Cesium.Cartographic.fromDegrees`를
// 쓰고(호출 시점에만 평가되므로 임포트 자체는 이미 안전하다), 그 결과는 곧바로 주입받은
// `sampleHeights` 콜백이 채우는 `.height` 필드로만 소비된다 — 그 필드만 맞는 최소 스텁.
(globalThis as any).Cesium = {
  Cartographic: { fromDegrees: (lon: number, lat: number) => ({ lon, lat, height: undefined }) },
};

// ── buildCandidates ─────────────────────────────────────────────────────

test('기본 후보 격자는 방위 20도×6개 링 = 108개다', () => {
  const cands = buildCandidates();
  assert.equal(cands.length, (360 / 20) * 6);
  for (const c of cands) {
    assert.ok(Number.isFinite(c.lon) && Number.isFinite(c.lat));
    assert.equal(c.groundH, 0);
  }
});

test('링 반경을 바꾸면 그만큼 후보가 는다', () => {
  const cands = buildCandidates({ azStepDeg: 90, rings: [50, 100, 150] });
  assert.equal(cands.length, 4 * 3);
});

// ── optimizePostLayout ──────────────────────────────────────────────────

/** siteOptimizer.test.ts 와 같은 규약의 평탄 지형 합성 격자. */
function makeGrid() {
  const nR = 20, minR = 100, maxR = SITE.sector.maxR + 200;
  return {
    lon: SITE.gp.lon, lat: SITE.gp.lat, groundH: 550,
    minR, maxR, azStart: 0, azEnd: 360, nAz: 36, nR,
    rStep: (maxR - minR) / (nR - 1),
    terrainH: new Float32Array(36 * nR).fill(550),
  };
}
const flatSampleHeights = async (cartos: Array<{ height?: number }>) => {
  for (const c of cartos) c.height = 550;
};

test('가시격자가 없으면 명시적으로 던진다', async () => {
  await assert.rejects(
    () => optimizePostLayout({ grid: null, typeIds: ['eo'], sampleHeights: flatSampleHeights }),
    /가시영역/,
  );
});

test('자산 유형을 하나도 안 주면 던진다', async () => {
  await assert.rejects(
    () => optimizePostLayout({ grid: makeGrid(), typeIds: [], sampleHeights: flatSampleHeights }),
    /자산 유형/,
  );
});

test('평탄 지형·백지 상태에서 예산 없이 돌리면 maxPosts만큼 골라 담고 합동 커버가 개선된다', async () => {
  const grid = makeGrid();
  const { picks, report } = await optimizePostLayout({
    grid, typeIds: ['eo'], maxPosts: 2, searchSize: 40, sampleHeights: flatSampleHeights,
  });
  assert.equal(picks.length, 2);
  assert.equal(report.jointBefore, 0); // 백지 상태
  assert.ok(report.jointAfter > report.jointBefore);
  assert.ok(report.jointAfter <= 1);
  assert.equal(report.costEok, picks.reduce((s, p) => s + p.costEok, 0));
  // 후보끼리 최소 이격(55m)을 지킨다
  for (let i = 0; i < picks.length; i++) {
    for (let j = i + 1; j < picks.length; j++) {
      assert.ok(distM(picks[i].lon, picks[i].lat, picks[j].lon, picks[j].lat) >= 55);
    }
  }
});

test('예산을 0으로 주면 아무것도 못 세운다', async () => {
  const grid = makeGrid();
  const { picks, report } = await optimizePostLayout({
    grid, typeIds: ['eo'], maxPosts: 3, searchSize: 40, budgetEok: 0, sampleHeights: flatSampleHeights,
  });
  assert.equal(picks.length, 0);
  assert.equal(report.costEok, 0);
  assert.equal(report.jointAfter, 0);
});

test('예산이 한 대 값만 되면 딱 한 대만 세운다', async () => {
  const grid = makeGrid();
  const one = await optimizePostLayout({
    grid, typeIds: ['eo'], maxPosts: 5, searchSize: 40, sampleHeights: flatSampleHeights,
  });
  assert.ok(one.picks.length >= 1);
  const unitCost = one.picks[0].costEok;
  const capped = await optimizePostLayout({
    grid, typeIds: ['eo'], maxPosts: 5, searchSize: 40, budgetEok: unitCost, sampleHeights: flatSampleHeights,
  });
  assert.equal(capped.picks.length, 1);
  assert.ok(capped.report.costEok <= unitCost + 1e-9);
});

test('기존 배치를 넘기면 그 커버가 출발선(jointBefore)에 반영된다', async () => {
  const grid = makeGrid();
  const withoutExisting = await optimizePostLayout({
    grid, typeIds: ['eo'], maxPosts: 1, searchSize: 40, sampleHeights: flatSampleHeights,
  });
  const [firstPick] = withoutExisting.picks;
  assert.ok(firstPick);
  const withExisting = await optimizePostLayout({
    grid, typeIds: ['eo'], maxPosts: 1, searchSize: 40, sampleHeights: flatSampleHeights,
    existing: [{ type: 'eo', lon: firstPick.lon, lat: firstPick.lat, groundH: 550, fov: 90, aimAz: firstPick.aimAz }],
  });
  assert.ok(withExisting.report.jointBefore > 0, '기존 배치가 있는데 출발선 커버가 0이다');
});

test('사각지대(gapsAfter)는 배치 후 원소 수가 배치 전(gapsBefore) 이하다', async () => {
  const grid = makeGrid();
  const { report } = await optimizePostLayout({
    grid, typeIds: ['eo', 'ir'], maxPosts: 3, searchSize: 40, sampleHeights: flatSampleHeights,
  });
  assert.ok(Array.isArray(report.gapsBefore));
  assert.ok(Array.isArray(report.gapsAfter));
  assert.ok(report.gapsAfter.length <= report.gapsBefore.length);
});
