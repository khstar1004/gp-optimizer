/**
 * 시설 3D 육안 검증 — 헤드리스 Chrome + CDP.
 *
 * Playwright 패키지는 이 저장소에 없다(브라우저 바이너리만 캐시에 있다). 그래서 CDP 를
 * 직접 문다 — Node 24 의 내장 WebSocket 이면 충분하고 의존성이 늘지 않는다.
 *
 *   npx tsx scripts/shoot-facilities.mts            (서버가 이미 8917 에 떠 있어야 한다)
 *
 * 하는 일: GP 정밀지형이 준비되길 기다렸다가 시설 몇 종을 실제 배치 API 로 놓고,
 * 카메라를 그 위로 옮겨 스크린샷을 남긴다. 「모듈이 로드되는가」가 아니라 「어떻게
 * 보이는가」를 확인하는 것이 목적이다.
 */
import { spawn } from 'node:child_process';
import { writeFileSync, existsSync } from 'node:fs';
import { setTimeout as sleep } from 'node:timers/promises';

const CHROME = [
  `${process.env.LOCALAPPDATA}\\ms-playwright\\chromium-1228\\chrome-win64\\chrome.exe`,
  `${process.env.LOCALAPPDATA}\\ms-playwright\\chromium-1208\\chrome-win64\\chrome.exe`,
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
].find((p) => existsSync(p));
if (!CHROME) throw new Error('헤드리스로 쓸 Chrome 을 찾지 못했습니다.');

const URL = process.env.GP_URL ?? 'http://localhost:8917';
const PORT = 9333;

const chrome = spawn(CHROME, [
  '--headless=new', `--remote-debugging-port=${PORT}`,
  '--window-size=1760,1080', '--hide-scrollbars',
  '--use-angle=swiftshader', '--enable-unsafe-swiftshader',
  '--user-data-dir=' + process.env.TEMP + '\\gp-shoot-profile',
  'about:blank',
], { stdio: 'ignore' });

async function endpoint(): Promise<string> {
  for (let i = 0; i < 60; i++) {
    try {
      const r = await fetch(`http://127.0.0.1:${PORT}/json/list`);
      const tabs = await r.json();
      const page = tabs.find((t: any) => t.type === 'page');
      if (page?.webSocketDebuggerUrl) return page.webSocketDebuggerUrl;
    } catch { /* 아직 안 떴다 */ }
    await sleep(300);
  }
  throw new Error('CDP 엔드포인트를 열지 못했습니다.');
}

const ws = new WebSocket(await endpoint());
await new Promise((res) => { ws.onopen = res; });
let seq = 0;
const pending = new Map<number, (v: any) => void>();
ws.onmessage = (e) => {
  const msg = JSON.parse(String(e.data));
  if (msg.id && pending.has(msg.id)) { pending.get(msg.id)!(msg); pending.delete(msg.id); }
};
function send(method: string, params: any = {}): Promise<any> {
  const id = ++seq;
  return new Promise((res) => { pending.set(id, res); ws.send(JSON.stringify({ id, method, params })); });
}
async function evaluate(expr: string, awaitPromise = true) {
  const r = await send('Runtime.evaluate', {
    expression: expr, awaitPromise, returnByValue: true, allowUnsafeEvalBlocklistedAPI: true,
  });
  if (r.result?.exceptionDetails) {
    throw new Error(r.result.exceptionDetails.exception?.description ?? 'eval 실패');
  }
  return r.result?.result?.value;
}

try {
  await send('Page.enable');
  await send('Runtime.enable');
  // 부팅이 조용히 죽으면 'boot-incomplete' 만 보이고 원인을 알 수 없다 — 예외를 받아 둔다.
  ws.addEventListener('message', (e: any) => {
    const m = JSON.parse(String(e.data));
    if (m.method === 'Runtime.exceptionThrown') {
      const d = m.params?.exceptionDetails;
      console.error('페이지 예외:', d?.exception?.description ?? d?.text);
    }
  });
  // 계획 저장 API 를 막는다 — 막지 않으면 검증용으로 놓은 시설이 data/plans 에
  // 새 계획으로 눌러앉는다(실제로 한 번 그랬다). 읽기는 404 로 흘려 빈 계획에서 시작한다.
  await send('Fetch.enable', { patterns: [{ urlPattern: '*/api/plans/*' }] });
  ws.addEventListener('message', (e: any) => {
    const m = JSON.parse(String(e.data));
    if (m.method === 'Fetch.requestPaused') {
      send('Fetch.fulfillRequest', {
        requestId: m.params.requestId, responseCode: 404,
        body: Buffer.from('{}').toString('base64'),
      });
    }
  });
  await send('Page.navigate', { url: URL });
  await sleep(2000);

  // 앱 부팅 + GP 정밀지형 표면 준비 대기
  const ready = await evaluate(`(async () => {
    const t0 = Date.now();
    // placer 는 부팅 중반에 생긴다. 그 뒤로도 접근로 준비·지형 모델 생성이 남아 있어
    // 여기서 멈추면 realTerrain 이 아직 없다(실제로 'realTerrain 없음' 이 나왔다).
    // 부팅 끝까지 기다린다 — siteWorks 는 마지막에 만들어진다.
    while (!window.__gp?.siteWorks && Date.now() - t0 < 240000) await new Promise(r => setTimeout(r, 500));
    if (!window.__gp?.siteWorks) return 'boot-incomplete';
    const rt = window.__gp.placer.terrain;
    while (rt && !(rt.active && rt.surfaceReady) && Date.now() - t0 < 240000) {
      await new Promise(r => setTimeout(r, 700));
    }
    return (rt?.active && rt?.surfaceReady) ? 'terrain-ready' : 'no-terrain';
  })()`);
  console.log('상태:', ready);

  // GP 정밀지형을 켠다 — 접지 비탈면·접근로가 의미를 갖는 것은 이 모드다.
  // (위성 지형에서는 패드 표고가 실제 표면과 어긋나 스커트가 거짓으로 커진다.)
  const gp = await evaluate(`(async () => {
    const rt = window.__gp.realTerrain;
    if (!rt) return 'realTerrain 없음';
    if (rt.mode !== 'gp') await rt.setMode('gp');
    const t0 = Date.now();
    while (!(rt.active && rt.surfaceReady) && Date.now() - t0 < 240000) {
      await new Promise(r => setTimeout(r, 800));
    }
    return rt.active && rt.surfaceReady ? 'GP 정밀지형 준비됨' : 'GP 지형 대기 실패';
  })()`, true);
  console.log('지형:', gp);
  await sleep(9000);        // GLB 지형 표면이 GPU 에 올라올 때까지 (소프트웨어 렌더는 느리다)
  // 표면이 바뀌었으니 시설 접지를 다시 잰다 (main 의 remeasure 와 같은 일)
  await evaluate(`(async () => {
    const p = window.__gp.placer;
    for (const it of p.items) { p._reground(it); p._draw(it); }
    return true;
  })()`);

  // 대표 시설 6 종 배치 — 대지 크기가 서로 다른 것들로 고른다
  const placed = await evaluate(`(async () => {
    const p = window.__gp.placer;
    const base = { lon: 128.125, lat: 38.328 };   // data.ts SITE.gp
    const M = 1 / 111320;
    const spec = [
      ['living-zone',        -170,  120],
      ['command-zone',        -40,  130],
      ['maintenance-zone',     70,  120],
      ['welfare-zone',       -170,   10],
      ['storage-zone',        -40,   10],
      ['education-zone',       80,    5],
    ];
    const out = [];
    for (const [id, dx, dy] of spec) {
      const lon = base.lon + dx * M / Math.cos(base.lat * Math.PI / 180);
      const lat = base.lat + dy * M;
      const r = await p.place(id, lon, lat, { skipValidation: true, headingDeg: 180 });
      out.push(id + ': ' + (r?.uid ?? JSON.stringify(r)) +
        (r?.dims ? ' 대지 ' + r.dims.widthM.toFixed(1) + '×' + r.dims.depthM.toFixed(1) : ''));
    }
    p.select(null);
    return out;
  })()`);
  console.log((placed as string[]).join('\n'));

  // 모든 스택이 GLB 를 다 실을 때까지 기다린다 — 마지막에 놓은 시설은 아직 로드 중이라
  // 곧바로 세면 「모듈 0」 으로 잡힌다 (모델이 없는 게 아니라 아직 안 온 것이다).
  await evaluate(`(async () => {
    const p = window.__gp.placer;
    for (let i = 0; i < 60; i++) {
      const pending = p.items.filter(it => (p.stacks.get(it.uid)?.models.length ?? 0) === 0);
      if (!pending.length) break;
      await new Promise(r => setTimeout(r, 500));
    }
    return true;
  })()`);

  // 부지 조성(정지 비탈면·접근로·울타리·피규어) 결과 확인
  const site = await evaluate(`(async () => {
    const sw = window.__gp.siteWorks;
    if (!sw) return 'siteWorks 없음';
    await sw.rebuild();
    const s2 = sw.stats;
    return '지형=' + (sw.hasTerrain() ? 'O' : 'X') +
      '  비탈면 ' + s2.grading + '  도로 ' + s2.roads + '  울타리 ' + s2.fence +
      '  피규어 ' + s2.figures + '  정문 ' + s2.gate;
  })()`);
  console.log('부지 조성:', site);
  const diag = await evaluate(`(async () => {
    const out = [];
    for (const u of ['assets/models/fac_person_a.glb', 'assets/models/site_gate.glb',
                     'assets/textures/site_slope.png']) {
      try { const r = await fetch(u); out.push(u + ' → ' + r.status); }
      catch (e) { out.push(u + ' → ' + e.message); }
    }
    const sw = window.__gp.siteWorks;
    out.push('정문 방위 ' + sw._gateAzimuth().toFixed(0) + '°');
    const az = sw._gateAzimuth() * Math.PI / 180;
    out.push('정문 지점 높이 ' + String(sw.heightAt(
      window.__gp.placer.items[0].lon, window.__gp.placer.items[0].lat)));
    return out;
  })()`);
  for (const line of diag as string[]) console.log('  ' + line);

  // 모듈 계획 요약 — 동이 몇 개, 어떤 배율로 앉았는지 숫자로 확인
  const plan = await evaluate(`(() => {
    const p = window.__gp.placer;
    return p.items.map(it => {
      const st = p.stacks.get(it.uid);
      const mods = st ? st.models.length : 0;
      const shells = st ? st.models.filter(m => /_(main|roof|floor)\\.glb$/.test(m.mod.uri)) : [];
      const s = shells[0]?.mod;
      return it.spec.name + '  모듈 ' + mods +
        '  셸배율 ' + (s ? s.sx.toFixed(2) + '×' + s.sy.toFixed(2) : '-') +
        '  동 ' + shells.filter(m => /_main\\.glb$/.test(m.mod.uri)).length + '개';
    });
  })()`);
  console.log('\n' + (plan as string[]).join('\n'));

  async function shoot(setView: string, file: string) {
    await evaluate(`(() => { const v = window.__gp.viewer; ${setView} })()`);
    await sleep(6000);
    const { data } = (await send('Page.captureScreenshot', { format: 'png' })).result;
    writeFileSync(file, Buffer.from(data, 'base64'));
    console.log('스크린샷 ->', file);
  }

  /** 시설 하나를 화면에 꽉 채워 본다 — lookAt 은 대지 중심을 기준으로 거리를 잡는다.
   *  uid 가 아니라 **인덱스**로 찾는다: 계획 동기화가 items 를 갈아끼우면 uid 가 바뀐다. */
  const look = (idx: number, rangeM: number, pitch: number, heading = 200) => `
    // 지형 모드를 바꾸면 뷰어가 자체 flyTo 를 건다. 취소하지 않으면 그 비행이
    // setView 를 덮어써서 엉뚱한 고도에서 찍힌다 (3,416m 짜리 빈 화면이 그것이었다).
    v.camera.cancelFlight && v.camera.cancelFlight();
    const its = window.__gp.placer.items;
    const it = its[${idx}] ?? its[0];
    if (!it) throw new Error('배치된 시설이 없다');
    v.camera.lookAt(
      Cesium.Cartesian3.fromDegrees(it.lon, it.lat, it.groundH),
      new Cesium.HeadingPitchRange(Cesium.Math.toRadians(${heading}),
                                   Cesium.Math.toRadians(${pitch}), ${rangeM}));
    v.camera.lookAtTransform(Cesium.Matrix4.IDENTITY);`;

  // heading 0 = 시설 정면(−Y, 진입 방향) 쪽에서 본다. 180 이면 뒷면만 나온다.
  await shoot(look(0, 72, -20, 0), 'assets/renders/app_fac_living.png');
  // 결정적 비교컷 — Blender render_fac3_c 와 같은 거리·각도로 한 동을 본다.
  await shoot(look(0, 26, -8, 20), 'assets/renders/app_fac_closeup.png');
  await shoot(look(1, 40, -11, 20), 'assets/renders/app_fac_command.png');
  await shoot(look(3, 42, -10, 340), 'assets/renders/app_fac_welfare.png');
  await shoot(look(5, 44, -12, 15), 'assets/renders/app_fac_edu.png');
} finally {
  ws.close();
  chrome.kill();
}
