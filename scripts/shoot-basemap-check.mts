/**
 * 베이스맵 검증 — 저장된 계획 없이 순수 부팅 상태만 스크린샷.
 * GP(DMZ 인근)에서 VWorld 위성이 z13+ 부터 블러 업스케일되는 문제 확인용
 * (assets/blender 파이프라인이 ESRI 를 텍스처 소스로 쓴 이유와 동일).
 *   npx tsx scripts/shoot-basemap-check.mts   (서버가 이미 8917 에 떠 있어야 한다)
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
const PORT = 9334;

const chrome = spawn(CHROME, [
  '--headless=new', `--remote-debugging-port=${PORT}`,
  '--window-size=1760,1080', '--hide-scrollbars',
  '--use-angle=swiftshader', '--enable-unsafe-swiftshader',
  '--user-data-dir=' + process.env.TEMP + '\\gp-basemap-check-profile-v2',
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
  if (process.env.GP_OFFLINE) {
    await send('Network.enable');
    await send('Network.setBlockedURLs', {
      urls: [
        '*cdn.jsdelivr.net*', '*fonts.googleapis.com*', '*fonts.gstatic.com*',
        '*api.vworld.kr*', '*xdworld.vworld.kr*', '*services.arcgisonline.com*',
        '*server.arcgisonline.com*', '*ibasemaps-api.arcgis.com*',
        '*elevation3d.arcgis.com*', '*api.maptiler.com*', '*tile.opentopomap.org*',
        '*openapi.its.go.kr*',
      ],
    });
    console.log('[오프라인 재현] 외부 도메인 전부 차단');
  }
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
  await evaluate(`localStorage.clear()`);
  await send('Page.navigate', { url: URL });
  await sleep(2000);

  const ready = await evaluate(`(async () => {
    const t0 = Date.now();
    while (!window.__gp?.viewer && Date.now() - t0 < 60000) await new Promise(r => setTimeout(r, 500));
    return window.__gp?.viewer ? 'viewer-ready' : 'no-viewer';
  })()`);
  console.log('상태:', ready);
  await sleep(6000);

  const bm = await evaluate(`window.__gp.layers?.basemapId`);
  console.log('basemapId:', bm);

  const { data } = (await send('Page.captureScreenshot', { format: 'png' })).result;
  writeFileSync('assets/renders/app_basemap_home.png', Buffer.from(data, 'base64'));
  console.log('스크린샷 -> assets/renders/app_basemap_home.png');
} finally {
  ws.close();
  chrome.kill();
}
