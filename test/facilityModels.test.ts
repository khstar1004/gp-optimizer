/**
 * 「보이지 않는 시설」 회귀 시험.
 *
 * 카탈로그 15종 중 5종(사무·교육·훈련·주차·군용주차)에 GLB 가 없었고,
 * `BuildingStack._plan()` 이 null 을 돌려주면 `update()` 가 즉시 빠져나가
 * **지도에 아무 형체도 그리지 않았다**. 목록에는 있고 비용도 나오고 콘솔도 조용했다 —
 * 지도를 보지 않으면 알 수 없는 결함이었다.
 *
 * 그래서 세 가지를 못 박는다:
 *   ① 카탈로그의 모든 시설이 모듈을 하나 이상 낸다
 *   ② 그 모듈이 가리키는 GLB 가 디스크에 실재한다 (파일명 오타도 같은 증상을 낸다)
 *   ③ 야외 구획의 프롭이 부지 밖으로 나가지 않고 프리미티브 상한을 넘지 않는다
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const ROOT = new URL('../', import.meta.url);
const PLACEMENT = readFileSync(new URL('src/runtime/placement.ts', ROOT), 'utf8');

(globalThis as Record<string, unknown>).__SCAFFOLDA_ENV__ ??= {
  VITE_OLLAMA_MODEL: 'test', VITE_OLLAMA_BASE_URL: '/ollama',
  MODE: 'test', DEV: false, PROD: false,
};

// 최상위 await 은 이 시험 러너(cjs 변환)에서 못 쓴다 — 첫 사용 시 한 번만 싣는다.
let cache: Promise<{ catalog: any[]; mods: any }> | null = null;
const load = () => (cache ??= (async () => {
  const bundle: any = await import('../js/vendor/scaffolda/scaffolda.bundle.js' as string);
  const mods: any = await import('../src/runtime/buildingModels' as string);
  // placement.ts 가 UI 에서 감추는 비건축 요소는 배치되지 않으므로 모델도 필요 없다.
  const hidden = new Set(
    (PLACEMENT.match(/HIDDEN_FACILITY_IDS = new Set\(\[([^\]]*)\]/)?.[1] ?? '')
      .split(',').map((s) => s.trim().replace(/^'|'$/g, '')).filter(Boolean));
  assert.ok(hidden.size > 0, 'placement.ts 에서 HIDDEN_FACILITY_IDS 를 읽지 못했다');
  return { catalog: bundle.FACILITY_CATALOG.filter((f: any) => !hidden.has(f.id)), mods };
})());

/** 카탈로그 원본 스펙 → placement.ts 가 만드는 배치 아이템의 최소 형태 */
function itemOf(spec: any, over: Record<string, unknown> = {}) {
  return {
    uid: 'b1', spec: { ...spec, floors: spec.defaultFloors ?? 1 },
    lon: 128, lat: 38, groundH: 100, foundBottom: 96.5,
    floors: spec.defaultFloors ?? 1, headingDeg: 0,
    dims: { widthM: spec.defaultWidth ?? 12, depthM: spec.defaultDepth ?? 8 },
    ...over,
  };
}

test('카탈로그의 모든 시설이 3D 모듈을 낸다 — 「핀만 뜨는 시설」 금지', async () => {
  const { catalog, mods } = await load();
  assert.ok(catalog.length >= 10, `카탈로그가 비었다 (${catalog.length}종)`);
  for (const spec of catalog) {
    const plan = mods.BuildingStack._plan(itemOf(spec));
    assert.ok(Array.isArray(plan) && plan.length > 0,
      `${spec.id}(${spec.name}) 이 모듈을 하나도 내지 않는다 — 지도에 아무것도 안 그려진다`);
  }
});

test('등록되지 않은 시설도 예비 모델로 그려진다', async () => {
  const { mods } = await load();
  const plan = mods.BuildingStack._plan(itemOf({
    id: 'brand-new-zone', name: '새 구역', defaultFloors: 2, defaultWidth: 16, defaultDepth: 11,
  }));
  assert.ok(plan.length >= 3, '예비(DEFAULT_REGISTRY) 경로가 main/floor/roof 를 내지 않는다');
  assert.ok(plan.some((m: any) => m.uri.includes('fac_generic')),
    '미등록 시설이 범용 예비 모델로 떨어지지 않는다');
});

test('모듈이 가리키는 GLB 가 전부 디스크에 있다 — 파일명 오타도 같은 증상이다', async () => {
  const { catalog, mods } = await load();
  const uris = new Set<string>();
  for (const spec of catalog) {
    for (const floors of [1, 3]) {
      for (const m of mods.BuildingStack._plan(itemOf(spec, { floors }))) uris.add(m.uri);
    }
  }
  assert.ok(uris.size >= 15, `모듈 URI 가 너무 적다 (${uris.size})`);
  for (const uri of uris) {
    const path = fileURLToPath(new URL(uri, ROOT));
    assert.ok(existsSync(path), `${uri} 가 없다 — 이 모듈은 조용히 로드 실패하고 형체가 사라진다`);
  }
});

test('야외 구획 프롭이 부지 안에 서고 프리미티브 상한을 지킨다', async () => {
  const { mods } = await load();
  const cases = [
    ['parking-zone', 28.2, 18.8], ['parking-zone', 44, 30], ['parking-zone', 14, 9],
    ['vehicle-parking-zone', 28.2, 18.8], ['vehicle-parking-zone', 46, 32],
    ['training-zone', 44.5, 29.7], ['training-zone', 22, 15], ['training-zone', 60, 34],
  ] as const;
  for (const [id, w, d] of cases) {
    const plan = mods.BuildingStack._plan(itemOf(
      { id, name: id, defaultFloors: 1 }, { dims: { widthM: w, depthM: d } }));
    assert.ok(plan.length > 3, `${id} ${w}×${d} 의 프롭이 너무 적다 (${plan.length})`);
    assert.ok(plan.length <= mods.MAX_MODULES,
      `${id} ${w}×${d} 가 프리미티브 상한을 넘었다 (${plan.length}/${mods.MAX_MODULES})`);
    for (const m of plan) {
      if (m.fit) continue;                       // 바닥·기초는 부지 크기로 늘어난다
      assert.ok(Math.abs(m.x ?? 0) <= w / 2 + 0.01 && Math.abs(m.y ?? 0) <= d / 2 + 0.01,
        `${id} ${w}×${d}: ${m.uri.split('/').pop()} 가 부지 밖(${m.x}, ${m.y})에 선다`);
    }
  }
});

test('부지가 넓어지면 조각이 커지는 게 아니라 개수가 는다', async () => {
  const { mods } = await load();
  const count = (w: number, d: number, needle: string) =>
    mods.BuildingStack._plan(itemOf({ id: 'parking-zone', name: 'p', defaultFloors: 1 },
      { dims: { widthM: w, depthM: d } })).filter((m: any) => m.uri.includes(needle)).length;
  assert.ok(count(44, 30, 'fac_stall') > count(20, 14, 'fac_stall'),
    '주차장을 넓혔는데 주차면 수가 늘지 않았다 — 모델을 늘이고 있다는 뜻이다');
});

// 이 시험은 예전 계약(플린스가 foundBottom 까지 통째로 내려간다)을 못 박고 있었다.
// 그 계약이 급경사지에서 사방 20m 짜리 수직 콘크리트 벽을 만들었고, 화면에서
// 「떠 있는 판」으로 읽힌 원인이었다. 이제 플린스는 진짜 기초가 하는 만큼(≤3m)만
// 내려가고 나머지 높이는 siteWorks 의 정지 비탈면이 흙으로 메운다.
test('기초 플린스는 기초 깊이만 담당하고 옹벽 노릇을 하지 않는다', async () => {
  const { mods } = await load();
  const stemOf = (item: any) => mods.BuildingStack._plan(item).find((m: any) => m.uri.includes('fac_stem'));
  const flat = stemOf(itemOf({ id: 'command-zone', name: 'c', defaultFloors: 1 },
    { groundH: 100, foundBottom: 99.6 }));
  const slope = stemOf(itemOf({ id: 'command-zone', name: 'c', defaultFloors: 1 },
    { groundH: 100, foundBottom: 88 }));
  assert.ok(flat && slope, '기초 플린스 모듈이 계획에 없다');
  assert.equal(flat.sz, 1.2, '평지에서도 최소 근입(1.2m)은 있어야 한다');
  assert.equal(slope.sz, 3.0,
    '경사지에서 플린스가 3m 를 넘었다 — 그 높이는 옹벽이 아니라 비탈면이 맡아야 한다');
});

// ═══════════════════════════════════════════════════════════════════
// 「대지 = 건물」 회귀 — 늘어난 덩어리로 되돌아가지 않게 못 박는다
//
// 예전에는 캐노니컬 12×8 셸 하나를 대지 크기로 통째로 늘렸다. 생활 구역 100명이면
// 44.5×29.7m 대지라 3.7배로 부풀었고, 층고는 3.2m 고정이라 납작한 덩어리가 됐다.
// 이제는 대지 위에 현실 비례의 동을 앉힌다. 아래 세 가지가 그 계약이다.
// ═══════════════════════════════════════════════════════════════════

/** 동 셸(main/floor/roof) 모듈만 골라낸다 — 패드·조명·조경은 규칙이 다르다. */
const shellsOf = (plan: any[]) => plan.filter((m) => /_(main|roof|floor)\.glb$/.test(m.uri));

test('대지가 아무리 커져도 동 셸 배율은 갇혀 있다 — 늘어난 덩어리 금지', async () => {
  const { catalog, mods } = await load();
  const yardOrMono = new Set(['parking-zone', 'vehicle-parking-zone', 'training-zone',
    'storage-zone', 'entry-zone']);
  let checked = 0;
  for (const spec of catalog) {
    if (yardOrMono.has(spec.id)) continue;
    for (const [w, d] of [[14.1, 9.4], [19.9, 13.3], [28.2, 18.8], [44.5, 29.7], [70, 47]]) {
      const plan = mods.BuildingStack._plan(itemOf(spec, { dims: { widthM: w, depthM: d } }));
      const shells = shellsOf(plan);
      assert.ok(shells.length > 0, `${spec.id} ${w}×${d}: 동 셸이 하나도 없다`);
      for (const m of shells) {
        const [sx, sy] = [m.sx ?? 1, m.sy ?? 1];
        assert.ok(sx >= 0.6 && sx <= 1.6 && sy >= 0.6 && sy <= 1.6,
          `${spec.id} ${w}×${d}: 셸 배율 ${sx.toFixed(2)}×${sy.toFixed(2)} 이 한계를 벗어났다`);
        const aniso = Math.max(sx / sy, sy / sx);
        assert.ok(aniso <= 1.36,
          `${spec.id} ${w}×${d}: 이방성 ${aniso.toFixed(2)} — 파이프가 타원이 된다`);
        checked++;
      }
    }
  }
  assert.ok(checked > 40, `검사한 셸이 너무 적다 (${checked})`);
});

test('동은 대지 경계 안에 서고, 대지가 커지면 동 수가 는다', async () => {
  const { mods } = await load();
  const at = (w: number, d: number) => mods.BuildingStack._plan(
    itemOf({ id: 'living-zone', name: 'l', defaultFloors: 2 }, { dims: { widthM: w, depthM: d } }));
  for (const [w, d] of [[14.1, 9.4], [28.2, 18.8], [44.5, 29.7], [70, 47]]) {
    const plan = at(w, d);
    for (const m of shellsOf(plan)) {
      // 셸 캐노니컬(CANON) × 배율 = 실제 동 크기. 그 절반이 대지 반폭을 넘으면 밖으로 나간다.
      const halfW = (mods.CANON.w * (m.sx ?? 1)) / 2;
      const halfD = (mods.CANON.d * (m.sy ?? 1)) / 2;
      assert.ok(Math.abs(m.x ?? 0) + halfW <= w / 2 + 0.01,
        `${w}×${d}: 동이 대지 밖으로 나간다 (x=${(m.x ?? 0).toFixed(1)}, 반폭 ${halfW.toFixed(1)})`);
      assert.ok(Math.abs(m.y ?? 0) + halfD <= d / 2 + 0.01,
        `${w}×${d}: 동이 대지 밖으로 나간다 (y=${(m.y ?? 0).toFixed(1)}, 반깊이 ${halfD.toFixed(1)})`);
    }
  }
  const blocks = (w: number, d: number) =>
    at(w, d).filter((m: any) => /_main\.glb$/.test(m.uri)).length;
  assert.ok(blocks(44.5, 29.7) > blocks(19.9, 13.3),
    '대지를 두 배로 넓혔는데 동 수가 그대로다 — 동을 늘이고 있다는 뜻이다');
});

test('건폐율이 상식 범위를 지킨다 — 대지를 다 덮지도, 텅 비우지도 않는다', async () => {
  const { mods } = await load();
  for (const [id, floors] of [['living-zone', 2], ['command-zone', 1], ['maintenance-zone', 1],
    ['welfare-zone', 1], ['office-zone', 1]] as const) {
    for (const [w, d] of [[19.9, 13.3], [28.2, 18.8], [44.5, 29.7]]) {
      const plan = mods.BuildingStack._plan(itemOf({ id, name: id, defaultFloors: floors },
        { dims: { widthM: w, depthM: d } }));
      const covered = plan
        .filter((m: any) => /_main\.glb$/.test(m.uri))
        .reduce((a: number, m: any) => a + mods.CANON.w * (m.sx ?? 1) * mods.CANON.d * (m.sy ?? 1), 0);
      const ratio = covered / (w * d);
      assert.ok(ratio >= 0.22 && ratio <= 0.68,
        `${id} ${w}×${d}: 건폐율 ${(ratio * 100).toFixed(0)}% 가 상식 범위를 벗어났다`);
    }
  }
});

test('실척 단일형(탄약고·위병소)은 늘리지 않고 개수로 늘린다', async () => {
  const { mods } = await load();
  const monos = (w: number, d: number, id: string) => mods.BuildingStack._plan(
    itemOf({ id, name: id, defaultFloors: 1 }, { dims: { widthM: w, depthM: d } }))
    .filter((m: any) => /fac_(storage|entry)\.glb$/.test(m.uri));
  for (const id of ['storage-zone', 'entry-zone']) {
    for (const [w, d] of [[14.1, 9.4], [19.9, 13.3], [44.5, 29.7]]) {
      for (const m of monos(w, d, id)) {
        assert.equal(m.sx ?? 1, 1, `${id} ${w}×${d}: 실척이어야 할 단일형이 늘어났다`);
        assert.equal(m.sy ?? 1, 1, `${id} ${w}×${d}: 실척이어야 할 단일형이 늘어났다`);
      }
    }
    assert.ok(monos(44.5, 29.7, id).length > monos(14.1, 9.4, id).length,
      `${id}: 대지를 넓혔는데 채 수가 늘지 않았다`);
  }
});
