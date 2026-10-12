/**
 * 화력 탭 정밀타격 효과 시뮬레이션 — 헤드리스 검증.
 *   npx tsx scripts/check-strike.mts <path-to-playwright> [base-url]
 *
 * 예전 check-damage-lab 은 「연출이 재생되는가」만 봤다. 이제 확인해야 하는 것은
 * **지도와 계산이 이어져 있는가**다: 지도에 실제로 세운 건물이 반경 안에 들면 등급을
 * 받는가, 탄종을 바꾸면 그 등급이 따라 바뀌는가, 기록에 근거가 함께 나가는가.
 */
import { createRequire } from 'node:module';
import { mkdir, readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';

const require = createRequire(import.meta.url);
const { chromium } = require(process.argv[2] || 'playwright');
const base = process.argv[3] || 'http://localhost:8917';
const output = 'artifacts/strike';
await mkdir(output, { recursive: true });

const browser = await chromium.launch({ channel: 'chrome', headless: true });
let page: any;
try {
  page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  const errors: string[] = [];
  page.on('pageerror', (e: Error) => errors.push(e.message));
  // 격리 컨텍스트 — 사용자의 저장 계획을 읽지도 덮지도 않는다.
  await page.route('**/api/plans/**', (route: any) =>
    route.fulfill({ status: 404, body: '{}' }));

  // 예전 주소는 화력 탭으로 옮겨 갔다 (링크를 깨지 않는다)
  await page.goto(`${base}/?demo=damage`, { waitUntil: 'domcontentloaded' });
  await page.locator('[data-tab="fires"].active').waitFor({ timeout: 30_000 });
  await page.waitForFunction('Boolean(window.__gp && window.__gp.placer)', null, { timeout: 120_000 });
  await page.locator('#strike-panel .sk-muns').waitFor({ timeout: 30_000 });

  // ── 판정 대상을 실제로 세운다 — 지도 위 시설이 없으면 판정할 것도 없다 ──
  // tsx/esbuild 가 화살표 함수에 keepNames 래퍼(__name)를 씌우므로, 브라우저로
  // 넘기는 코드는 **문자열**로 준다 — 번들러가 손대지 않는 유일한 형태다.
  const placed = await page.evaluate(`(async () => {
    const gp = window.__gp;
    const site = { lon: 128.125, lat: 38.328 };
    const mPerDegE = 111195 * Math.cos(site.lat * Math.PI / 180);
    const spots = [['command-zone', 18, 0], ['living-zone', 60, 20], ['storage-zone', 220, 40]];
    let n = 0;
    for (const s of spots) {
      const lon = site.lon + s[2] / mPerDegE;
      const lat = site.lat + s[1] / 111195;
      const r = await gp.placer.place(s[0], lon, lat, { skipValidation: true });
      if (r && !r.blocked) n++;
    }
    return n;
  })()`);
  assert.ok(placed >= 2, `판정 대상 배치 실패 (${placed}동)`);

  // locator.evaluate 에 문자열 화살표를 주면 Playwright 가 그것을 「호출」하지 않고
  // 식으로만 평가한다 — 조용히 아무 일도 안 일어난다. 그래서 DOM 조회까지 통째로
  // page.evaluate 식 하나에 담는다.
  const seek = (expr: string) => page.evaluate(
    `(() => { const el = document.querySelector('#sk-time');`
    + ` el.value = ${expr}; el.dispatchEvent(new Event('input', { bubbles: true }));`
    + ` return el.value; })()`);

  const rings = async (): Promise<string[]> => page.locator('#sk-rings .sk-ring b').allTextContents();
  const counts = async (): Promise<number[]> =>
    (await page.locator('#sk-assess .sk-counts b').allTextContents() as string[]).map(Number);

  // ── ① 탄착점 지정 ──
  assert.match(await page.locator('#sk-impact').innerText(), /지정된 타격 지점이 없습니다/);
  await page.getByRole('button', { name: 'GP 중심으로' }).click();
  await page.locator('#sk-impact .kv').first().waitFor({ timeout: 10_000 });
  assert.match(await page.locator('#sk-impact').innerText(), /MGRS/);
  assert.equal(await page.locator('#strike-hud').isVisible(), true, 'HUD 가 화력 탭에서 보여야 한다');

  // ── ①-2 위협 방위: 탄은 「그 방위에서」 온다 (아군 후방이 아니라) ──
  // 기본 350°(북) — 진입점은 탄착점보다 **북쪽**에 있어야 한다.
  const entry = await page.evaluate(`(() => {
    const v = window.__gp.viewer, C = Cesium;
    const ds = v.dataSources.getByName('strike')[0];
    const now = v.clock.currentTime;
    for (const e of ds.entities.values) {
      const t = e.label && e.label.text && e.label.text.getValue(now);
      if (t && /종말유도 진입/.test(String(t))) {
        const c = C.Cartographic.fromCartesian(e.position.getValue(now));
        return { lat: C.Math.toDegrees(c.latitude), lon: C.Math.toDegrees(c.longitude) };
      }
    }
    return null;
  })()`);
  assert.ok(entry, '종말유도 진입점을 찾지 못했다');
  assert.ok(entry.lat > 38.328, `위협 방위 350°인데 진입점이 남쪽이다 (lat ${entry.lat})`);
  assert.match(await page.locator('#sk-az-val').innerText(), /^350°/);

  // ── ② 반경이 실제 수로 나온다 ──
  const lgb = await rings();
  assert.equal(lgb.length, 6);
  assert.ok(lgb.every((v) => /^[\d.]+m$/.test(v)), `반경 표기 이상: ${lgb.join(' / ')}`);
  const meters = lgb.map((v) => Number(v.replace('m', '')));
  // 탄공 < 완파 < 중파 < 경파 < 유리 (파편은 별도 물리라 순서에서 뺀다)
  for (let i = 1; i < 5; i++) assert.ok(meters[i] > meters[i - 1], `반경 순서 역전 ${i}`);

  // ── ③ 판정이 붙는다 ──
  const c0 = await counts();
  assert.equal(c0.length, 5);
  assert.ok(c0.slice(0, 4).reduce((a, b) => a + b, 0) > 0, '피해 반경 안에 든 대상이 없다');
  assert.match(await page.locator('#sk-cde').innerText(), /최근접 아군/);

  // ── ④ 탄종을 바꾸면 반경과 판정이 함께 바뀐다 ──
  await page.locator('[data-mun="atgm"]').click();
  const atgm = (await rings()).map((v) => Number(v.replace('m', '')));
  assert.ok(atgm[4] < meters[4], `작은 탄이 더 좁아야 한다 (${atgm[4]} vs ${meters[4]})`);
  await page.locator('[data-mun="tbm"]').click();
  const tbm = (await rings()).map((v) => Number(v.replace('m', '')));
  assert.ok(tbm[4] > meters[4], `큰 탄이 더 넓어야 한다 (${tbm[4]} vs ${meters[4]})`);
  const cTbm = await counts();
  assert.ok(cTbm[0] + cTbm[1] >= c0[0] + c0[1], '큰 탄인데 중파 이상이 줄었다');

  // ── ⑤ 신관 — 공중폭발은 탄공이 없다 ──
  await page.locator('#sk-fuze').selectOption('airburst');
  assert.equal((await rings())[0], '—', '공중폭발은 탄공이 생기지 않아야 한다');
  await page.locator('#sk-fuze').selectOption('impact');
  assert.notEqual((await rings())[0], '—');

  // ── ⑤-2 연속사격 — 누적 손상으로 등급이 올라간다 ──
  await page.locator('[data-mun="pgm155"]').click();
  const one = await counts();
  const setRounds = (n: number) => page.evaluate(
    `(() => { const el = document.querySelector('#sk-rounds'); el.value = ${n};`
    + ` el.dispatchEvent(new Event('input', { bubbles: true }));`
    + ` el.dispatchEvent(new Event('change', { bubbles: true })); return el.value; })()`);
  await setRounds(8);
  await page.waitForTimeout(1200);
  const eight = await counts();
  assert.ok(eight[0] + eight[1] > one[0] + one[1],
    `8발이 1발보다 중파 이상이 많아야 한다 (${eight} vs ${one})`);
  const endure = await page.locator('#sk-endure').innerText();
  assert.match(endure, /필요 발수/);
  assert.match(endure, /Palmgren/);
  assert.match(endure, /HP/, 'HP 열이 있어야 한다');
  assert.match(endure, /원형|외피 손상|구조 반파|완전 붕괴/, '형상 단계가 표시돼야 한다');
  assert.equal(await page.locator('#sk-endure .sk-headline').count(), 1,
    '「몇 발이면 다 무너지는가」 한 줄이 있어야 한다');
  // HP 구간에 따라 실제로 다른 3D 메시가 걸린다 — 8발이 다 떨어진 뒤에 본다
  await seek('el.max');
  await page.waitForTimeout(1500);
  const staged = await page.evaluate(`(() => {
    const st = [...window.__gp.placer.stacks.values()];
    return { stages: st.map(s => s.stage), models: st.map(s => s.stageModels.length) };
  })()`);
  assert.ok(staged.stages.some((v: string) => v !== 'intact'), '파손 단계로 바뀐 시설이 없다');
  assert.ok(staged.models.some((n: number) => n > 0), '파손 셸이 하나도 안 붙었다');
  // 지도 위 HP 막대 — 패널 표 안에만 있으면 지도를 보는 동안 HP 가 보이지 않는다
  const hpBars = await page.evaluate(`(() => {
    const ds = window.__gp.viewer.dataSources.getByName('strike')[0];
    const bars = ds.entities.values.filter(e => String(e.id).startsWith('sk-hp-'));
    return { count: bars.length, keys: bars.map(e => e._hpKey).filter(Boolean) };
  })()`);
  assert.ok(hpBars.count >= 3, `지도 위 HP 막대가 없다 (${hpBars.count}개)`);
  assert.ok(hpBars.keys.length >= 3, 'HP 막대가 그려지지 않았다');
  assert.ok(hpBars.keys.some((k: string) => k.startsWith('0|')), '완파된 대상의 HP 가 0% 가 아니다');
  // 필요 발수가 실제 수로 나온다
  // 열 순서: 대상 · 거리 · 차폐 · 1발손상 · 필요발수 · HP · 형상
  const rounds = (await page.locator('#sk-endure tbody tr td:nth-child(5)').allTextContents() as string[]);
  assert.ok(rounds.length > 0);
  assert.ok(rounds.some((r) => /\d+\s*\/\s*\d+/.test(r)), `필요 발수 표기 이상: ${rounds.join(' | ')}`);
  assert.equal(await page.evaluate('/135050073|Infinity|NaN/.test(document.querySelector("#sk-endure").innerText)'),
    false, '폭심 0m 에서 손상률이 발산했다');
  // 시간축이 8발을 담도록 늘어난다
  const totalS = Number(await page.evaluate('document.querySelector("#sk-time").max'));
  assert.ok(totalS > 60, `연속사격 시간축이 짧다 (${totalS}s)`);
  await page.screenshot({ path: `${output}/06-salvo.png` });
  // ── ⑤-3 지형 차폐 · 취약 조준점 ──
  assert.match(endure, /차폐/, '지형 차폐 열이 있어야 한다');
  const masks = await page.evaluate(
    '[...window.__gp.viewer.dataSources.getByName("strike")[0].entities.values].length > 0');
  assert.equal(masks, true);
  await page.getByRole('button', { name: '취약 조준점 분석' }).click();
  await page.waitForTimeout(2500);
  const vuln = await page.locator('#sk-vuln-out').innerText();
  assert.match(vuln, /1발당 총손상\s+\d+%/, `취약 조준점 결과 이상: ${vuln.slice(0, 120)}`);
  const heat = await page.evaluate(`(() => {
    const ds = window.__gp.viewer.dataSources.getByName('strike')[0];
    const cells = ds.entities.values.filter(e => String(e.id).startsWith('sk-vuln-'));
    return { cells: cells.length, best: Boolean(ds.entities.getById('sk-vuln-best')) };
  })()`);
  assert.ok(heat.cells > 10, `취약도 히트맵이 비어 있다 (${heat.cells}칸)`);
  assert.equal(heat.best, true, '취약 조준점 표시가 없다');
  await page.screenshot({ path: `${output}/07-vulnerability.png` });
  // 화력 탭에는 「해제」 버튼이 여럿(위협권·취약보완·히트맵)이라 id 로 집는다
  await page.locator('#sk-vuln-clear').click();
  await page.waitForTimeout(400);
  assert.equal(await page.evaluate(
    '[...window.__gp.viewer.dataSources.getByName("strike")[0].entities.values]'
    + '.filter(e => String(e.id).startsWith("sk-vuln")).length'), 0, '히트맵이 안 지워졌다');

  await setRounds(1);
  await page.waitForTimeout(800);

  // ── ⑥ 재생 — 시간이 흐르고 되감기면 원래대로 돌아온다 ──
  await page.locator('[data-mun="lgb500"]').click();
  await page.screenshot({ path: `${output}/01-plan.png` });
  await page.getByRole('button', { name: '타격 재생' }).click();
  await page.waitForFunction(
    'Number(document.querySelector("#sk-time").value) > 7', null, { timeout: 60_000 });
  await page.screenshot({ path: `${output}/02-impact.png` });
  await seek('el.max');
  await page.screenshot({ path: `${output}/03-after.png` });
  const played = await page.locator('#sk-clock').innerText();
  assert.match(played, /탄착 후/);

  // ── ⑥-2 게임 피드백: 전투 로그 · 데미지 넘버 · 결과 화면 ──
  const feedback = await page.evaluate(`(() => {
    const ds = window.__gp.viewer.dataSources.getByName('strike')[0];
    return {
      pool: ds.entities.values.filter(e => String(e.id).startsWith('sk-dmg-')).length,
      feedEl: Boolean(document.getElementById('strike-feed')),
      rows: document.querySelectorAll('#strike-feed .sf-row').length,
      toggles: Boolean(document.getElementById('sk-sound') && document.getElementById('sk-slow')),
    };
  })()`);
  assert.ok(feedback.pool > 10, `데미지 넘버 풀이 없다 (${feedback.pool})`);
  assert.equal(feedback.feedEl, true, '전투 로그 요소가 없다');
  assert.ok(feedback.rows > 0, '전투 로그가 비어 있다');
  assert.equal(feedback.toggles, true, '소리·슬로모 토글이 없다');
  // 되감으면 로그도 되감긴다
  await seek('"0"');
  await page.waitForTimeout(300);
  assert.equal(await page.evaluate('document.querySelectorAll("#strike-feed .sf-row").length'), 0,
    '되감았는데 전투 로그가 남아 있다');
  await seek('el.max');
  await page.waitForTimeout(400);

  // ── ⑦ 시점 전환 — 잔류 화면에서 반경이 다 보이는가 ──
  await page.getByRole('button', { name: '위에서' }).click();
  await page.waitForTimeout(2200);
  await page.screenshot({ path: `${output}/04-top.png` });
  await page.getByRole('button', { name: '어깨 시점' }).click();
  await page.waitForTimeout(2200);

  // 판정을 받은 셋(시설·감시자산·감시탑)이 전부 실제로 무너져 있어야 한다
  const damaged = await page.evaluate(`(() => {
    const gp = window.__gp;
    return {
      facility: [...gp.placer.stacks.values()].some(s => s.damage && s.damage.collapse > 0),
      post: [...(gp.posts._damage ? gp.posts._damage.values() : [])].some(d => d.collapse > 0),
      tower: Boolean(gp.ents.tower && gp.ents.tower.damage && gp.ents.tower.damage.collapse > 0),
    };
  })()`);
  assert.equal(damaged.tower, true, '감시탑이 완파 판정인데 서 있다');
  assert.ok(damaged.facility || damaged.post, '판정을 받았는데 아무것도 무너지지 않았다');

  // 되감으면 무너진 것이 전부 다시 선다
  await seek('"0"');
  const restored = await page.evaluate(`(() => {
    const gp = window.__gp;
    const facility = [...gp.placer.stacks.values()].every(s =>
      (!s.damage || s.damage.collapse === 0) && s.stage === 'intact' && s.stageModels.length === 0);
    const post = [...(gp.posts._damage ? gp.posts._damage.values() : [])].every(d => !d || d.collapse === 0);
    const tower = !gp.ents.tower || !gp.ents.tower.damage;
    return facility && post && tower;
  })()`);
  assert.equal(restored, true, '되감았는데 붕괴 상태가 남아 있다');

  // ── ⑧ 기록 ──
  await page.locator('#sk-notes').fill('검증 실행에서 남긴 메모입니다.');
  const dl = page.waitForEvent('download');
  await page.getByRole('button', { name: /효과판정 기록/ }).click();
  const report = JSON.parse(await readFile(await (await dl).path(), 'utf8'));
  assert.equal(report.schema, 'gp-digital-twin.strike-effect-assessment');
  assert.equal(report.notes, '검증 실행에서 남긴 메모입니다.');
  assert.equal(report.munition.id, 'lgb500');
  assert.ok(report.rings.effectiveTntKg > 0);
  assert.deepEqual(Object.keys(report.rings.thresholdsKpa).sort(),
    ['complete', 'light', 'moderate', 'severe']);
  assert.ok(report.targets.length >= 2);
  assert.ok(report.collateral.length > 0, 'CDE 검증이 기록에 함께 나가야 한다');
  assert.equal(report.salvo.rounds, 1);
  assert.equal(report.cumulativeModel.rule, 'Palmgren-Miner linear damage accumulation');
  assert.ok(report.targets.every((t: any) => t.roundsToDefeat !== undefined));
  assert.ok(report.targets.some((t: any) => t.roundsToDefeat?.p90 !== null),
    '필요 발수가 기록에 실려야 한다');
  assert.ok(report.limitations.some((l: string) => /Maekawa 회절식/.test(l)),
    '지형 차폐 모델의 한계가 기록에 있어야 한다');
  assert.ok(report.limitations.some((l: string) => /사상자·금전손실/.test(l)));
  // 유폭·차폐가 기록에서 조용히 빠지지 않는다
  assert.ok(Array.isArray(report.secondaries), '탄약고 유폭 항목이 기록에 없다');
  assert.equal(report.terrainMasking.model, 'Maekawa barrier diffraction');
  assert.ok(report.targets.every((t: any) => t.terrainMask !== undefined),
    '대상별 지형 차폐가 기록에 없다');
  assert.ok(report.targets.every((t: any) => t.hp !== undefined && t.stage !== undefined),
    'HP·형상 단계가 기록에 없다');

  // ── ⑨ 다른 탭으로 나가면 HUD 가 물러난다 · 「피해 시각화」 탭은 사라졌다 ──
  // 탭 레일은 좁은 창에서 「더보기」 뒤로 접힐 수 있다 — 버튼을 직접 누르는 대신
  // 런타임이 듣는 탭 전환 이벤트를 쏜다(main.ts wireTabs 의 gp:tab-change).
  const goTab = (name: string) => page.evaluate(
    `window.dispatchEvent(new CustomEvent('gp:tab-change', { detail: '${name}' }))`);
  await goTab('build');
  await page.waitForTimeout(400);
  assert.equal(await page.locator('#strike-hud').isVisible(), false);
  assert.equal(await page.locator('[data-tab="damage"]').count(), 0, '피해 시각화 탭이 남아 있다');
  await goTab('fires');
  await page.waitForTimeout(400);
  assert.equal(await page.locator('#strike-hud').isVisible(), true);
  assert.match(await page.locator('#sk-impact').innerText(), /MGRS/, '탭을 옮겨도 계획은 남아야 한다');

  // ── ⑩ 지우기 ──
  await page.getByRole('button', { name: '지우기' }).click();
  assert.match(await page.locator('#sk-impact').innerText(), /지정된 타격 지점이 없습니다/);

  // 좁은 창에서도 가로 스크롤이 생기지 않는다
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.waitForTimeout(300);
  assert.equal(await page.evaluate('document.documentElement.scrollWidth > window.innerWidth'), false);
  await page.screenshot({ path: `${output}/05-compact.png` });

  const fatal = errors.filter((e) => !/ResizeObserver|Cesium.*credit/i.test(e));
  assert.deepEqual(fatal, []);
  console.log(JSON.stringify({
    result: 'passed', placed, screenshots: output,
    radii: { lgb500: meters, atgm, tbm }, grades: c0, errors,
  }));
} catch (error) {
  if (page) {
    await page.screenshot({ path: `${output}/failure.png` }).catch(() => {});
    console.error('panel:', await page.locator('#strike-panel').innerText().catch(() => '—'));
  }
  throw error;
} finally {
  await browser.close();
}
