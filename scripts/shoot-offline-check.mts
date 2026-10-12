/**
 * 진짜 오프라인 검증 — 랜선을 물리적으로 뽑을 수 없으니 CDP 로 외부 도메인을
 * 전부 net::ERR_INTERNET_DISCONNECTED 로 실패시켜 같은 상황을 재현한다.
 * localhost(8917)만 통과. Cesium/폰트가 로컬 vendor 라우트에서 뜨는지,
 * 디오라마(GP 격리) 모드가 인터넷 없이도 뜨는지 확인한다.
 *   npx tsx scripts/shoot-offline-check.mts
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
const PORT = 9335;

const chrome = spawn(CHROME, [
  '--headless=new', `--remote-debugging-port=${PORT}`,
  '--window-size=1760,1080', '--hide-scrollbars',
  '--use-angle=swiftshader', '--enable-unsafe-swiftshader',
  '--user-data-dir=' + process.env.TEMP + '\\gp-offline-check-profile',
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
  await send('Network.enable');

  // CDP Network.setBlockedURLs 는 특정 호스트로 가는 요청만 막을 뿐 navigator.onLine 은
  // 안 건드린다(OS 네트워크 인터페이스는 계속 떠 있으므로) — 그런데 map.ts 의 온라인/오프라인
  // 지형 자동전환(pickTerrainProvider)이 바로 그 navigator.onLine 으로 판단한다. 실제
  // 랜선 뽑힘을 재현하려면 이것도 false 로 강제해야 앱이 ArcGIS(오프라인 캐시) 분기를 탄다
  // — 안 그러면 MapTiler(온라인 분기, 타일 캐시 없음)를 골라 지형이 안 뜬다.
  await send('Page.addScriptToEvaluateOnNewDocument', {
    source: `
      Object.defineProperty(navigator, 'onLine', { get: () => false, configurable: true });
    `,
  });

  // localhost 를 제외한 모든 외부 호스트를 차단 — 랜선 뽑힘 재현.
  await send('Network.setBlockedURLs', {
    urls: [
      '*cdn.jsdelivr.net*', '*fonts.googleapis.com*', '*fonts.gstatic.com*',
      '*api.vworld.kr*', '*xdworld.vworld.kr*', '*services.arcgisonline.com*',
      '*elevation3d.arcgis.com*', '*api.maptiler.com*', '*tile.opentopomap.org*',
      '*openapi.its.go.kr*',
    ],
  });

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
  await sleep(4000);
  try { await evaluate(`localStorage.clear()`); } catch { /* 첫 로드가 늦으면 그냥 넘어간다 */ }
  await send('Page.navigate', { url: URL });
  await sleep(3000);

  const diag = await evaluate(`({
    readyState: document.readyState,
    title: document.title,
    htmlLen: document.documentElement.outerHTML.length,
    hasCesiumScript: !!document.querySelector('script[src*="cesium"]'),
    href: location.href,
  })`);
  console.log('진단:', JSON.stringify(diag, null, 2));

  const ready = await evaluate(`(async () => {
    const t0 = Date.now();
    while (!window.__gp?.placer && Date.now() - t0 < 45000) await new Promise(r => setTimeout(r, 500));
    return {
      viewer: !!window.__gp?.viewer,
      placer: !!window.__gp?.placer,
      cesiumLoaded: typeof window.Cesium !== 'undefined',
      errs: (window.__errs || []).slice(0, 10),
    };
  })()`);
  console.log('부팅 상태(외부 도메인 전부 차단):', JSON.stringify(ready, null, 2));

  if (ready.viewer) {
    // 기본 뷰(위성+지형, 캐시로 오프라인 렌더되는지 확인) — 혹시 이전 세션 localStorage 가
    // 디오라마 모드로 복원됐을 수 있으니 강제로 'nation'(위성 보이는 모드)으로 되돌린다.
    await evaluate(`(async () => {
      const rt = window.__gp.placer?.terrain ?? window.__gp.realTerrain;
      if (rt && rt.mode !== 'nation') await rt.setMode('nation');
    })()`);
    await sleep(500);
    await evaluate(`(() => {
      const v = window.__gp.viewer;
      v.camera.flyTo({
        destination: Cesium.Cartesian3.fromDegrees(128.125, 38.324, 4000),
        orientation: { heading: 0, pitch: Cesium.Math.toRadians(-55) },
        duration: 0,
      });
    })()`);
    await sleep(9000);
    const terrainDiag = await evaluate(`(() => {
      const v = window.__gp.viewer;
      const tp = v.terrainProvider;
      const carto = Cesium.Cartographic.fromDegrees(128.125, 38.324);
      const heightSampled = v.scene.globe.getHeight(carto);
      return {
        terrainId: v.__gpTerrainId,
        terrainCtor: tp?.constructor?.name,
        navigatorOnLine: navigator.onLine,
        sampledHeight: heightSampled,
        tilesLoaded: v.scene.globe.tilesLoaded,
      };
    })()`);
    console.log('지형 진단:', JSON.stringify(terrainDiag));
    const shot1 = (await send('Page.captureScreenshot', { format: 'png' })).result;
    writeFileSync('assets/renders/app_offline_default.png', Buffer.from(shot1.data, 'base64'));
    console.log('스크린샷 -> assets/renders/app_offline_default.png');

    // GP 격리(디오라마) 모드로 전환 — globe.show=false, 로컬 GLB 만 사용.
    const rt = await evaluate(`(async () => {
      const rt = window.__gp.placer?.terrain ?? window.__gp.realTerrain;
      if (!rt) return 'no-realTerrain-handle';
      await rt.setMode('gp');
      const t0 = Date.now();
      while (!(rt.active) && Date.now() - t0 < 30000) await new Promise(r => setTimeout(r, 500));
      await new Promise(r => setTimeout(r, 500));
      rt.focusCamera?.(0);
      return { active: rt.active, surfaceReady: rt.surfaceReady };
    })()`);
    console.log('디오라마 모드:', JSON.stringify(rt));
    await sleep(4000);
    const { data } = (await send('Page.captureScreenshot', { format: 'png' })).result;
    writeFileSync('assets/renders/app_offline_diorama.png', Buffer.from(data, 'base64'));
    console.log('스크린샷 -> assets/renders/app_offline_diorama.png');
  }
} finally {
  ws.close();
  chrome.kill();
}
