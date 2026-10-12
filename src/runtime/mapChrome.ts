// @ts-nocheck
/**
 * 지도 전문 크롬 — 실무 GIS 콘솔 표준 요소 (ArcGIS/Terria 관례 카피)
 *  - 좌상단 세로 도구 툴바: 홈 / 정사 탑다운 / 북 정렬 / MGRS 격자 / 미니맵 / 스크린샷 / 전체화면
 *  - 나침반 로즈 (카메라 헤딩 실시간 회전, 클릭 = 북 정렬)
 *  - 동적 축척바 (지면 픽 기반 m/px 실측 → 표준 눈금 스냅)
 *  - 미니맵 (ESRI 위성 z12 3×3 스티치 + 뷰 풋프린트 + 클릭 이동)
 *  - 상태바 군사 일시각 DTG (031452KSEP26 형식)
 */

import { svgIcon } from './icons';

const NICE_STEPS = [10, 20, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000, 50000, 100000];
const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

export function initMapChrome(viewer, opts) {
  const wrap = document.getElementById('map-wrap');
  const site = opts.site;

  // ─── DOM 주입 ───
  const tools = document.createElement('div');
  tools.id = 'map-tools';
  tools.innerHTML = `
    <button data-act="home" title="기준 시점 (Home)" aria-label="기준 시점">⌂</button>
    <button data-act="topdown" title="정사 탑다운 전환" aria-label="정사 탑다운 전환">◱</button>
    <button data-act="north" title="북 정렬 (N)" aria-label="북 정렬">N↑</button>
    <div class="mt-sep"></div>
    <button data-act="grid" title="MGRS 군사격자" aria-label="MGRS 군사격자">▦</button>
    <button data-act="minimap" title="상황도 미니맵" aria-label="상황도 미니맵">◰</button>
    <div class="mt-sep"></div>
    <button data-act="shot" title="화면 캡처 PNG" aria-label="화면 캡처">${svgIcon('camera')}</button>
    <button data-act="full" title="전체화면" aria-label="전체화면">⛶</button>`;
  wrap.appendChild(tools);

  const compass = document.createElement('div');
  compass.id = 'compass';
  compass.title = '클릭: 북 정렬';
  compass.innerHTML = `
    <svg viewBox="0 0 44 44">
      <circle cx="22" cy="22" r="20" fill="rgba(11,15,20,.78)" stroke="#263140" stroke-width="1"/>
      <g id="compass-rose">
        <path d="M22 5 L25.4 22 L22 19 L18.6 22 Z" fill="#f2a33c"/>
        <path d="M22 39 L25.4 22 L22 25 L18.6 22 Z" fill="#5c6b7a"/>
      </g>
      <text x="22" y="12.5" text-anchor="middle" font-size="7" fill="#e8edf2"
        font-family="Chakra Petch" font-weight="700">N</text>
    </svg>
    <div id="compass-hdg">000°</div>`;
  wrap.appendChild(compass);

  const scalebar = document.createElement('div');
  scalebar.id = 'scalebar';
  scalebar.innerHTML = `<div class="sb-bar"></div><div class="sb-txt">—</div><div class="sb-grid"></div>`;
  wrap.appendChild(scalebar);

  const minimap = document.createElement('div');
  minimap.id = 'minimap';
  minimap.className = 'hidden';
  minimap.innerHTML = `<canvas width="352" height="352"></canvas><div class="mm-tag">상황도 · ESRI</div>`;
  wrap.appendChild(minimap);

  // DTG는 상태바 맨 앞에
  const sb = document.getElementById('status-bar');
  const dtg = document.createElement('span');
  dtg.id = 'sb-dtg';
  sb.insertBefore(dtg, sb.firstChild);
  const tickDtg = () => {
    const d = new Date();
    const p = (n) => String(n).padStart(2, '0');
    dtg.textContent = `DTG ${p(d.getDate())}${p(d.getHours())}${p(d.getMinutes())}K${MONTHS[d.getMonth()]}${String(d.getFullYear()).slice(2)}`;
  };
  tickDtg();
  setInterval(tickDtg, 5000);

  // ─── 나침반 + 축척바 (camera.changed) ───
  const rose = compass.querySelector('#compass-rose');
  const hdgTxt = compass.querySelector('#compass-hdg');
  const sbBar = scalebar.querySelector('.sb-bar');
  const sbTxt = scalebar.querySelector('.sb-txt');
  const sbGrid = scalebar.querySelector('.sb-grid');

  function metersPerPixel() {
    const canvas = viewer.canvas;
    const cx = canvas.clientWidth / 2, cy = canvas.clientHeight * 0.62;
    const p1 = pickGlobe(cx - 60, cy), p2 = pickGlobe(cx + 60, cy);
    if (p1 && p2) return Cesium.Cartesian3.distance(p1, p2) / 120;
    // 폴백: 카메라고도 근사 (fovy 기반)
    const h = viewer.camera.positionCartographic.height;
    const fovy = viewer.camera.frustum.fovy ?? 1.05;
    return (2 * h * Math.tan(fovy / 2)) / canvas.clientHeight;
  }
  function pickGlobe(x, y) {
    // GP 정밀지형에서는 globe.pick 이 안 보이는 라이브 지형을 잡아 축척이 어긋난다
    // (mapContext.ts pickLL 과 같은 결함) — 실제로 그려진 표면을 pickPosition 으로.
    const rt = opts.getRealTerrain?.();
    const screenPos = new Cesium.Cartesian2(x, y);
    if (rt?.active && viewer.scene.pickPositionSupported) {
      return viewer.scene.pickPosition(screenPos);
    }
    const ray = viewer.camera.getPickRay(screenPos);
    return ray ? viewer.scene.globe.pick(ray, viewer.scene) : null;
  }
  function updateChrome() {
    const hdg = Cesium.Math.toDegrees(viewer.camera.heading);
    rose.setAttribute('transform', `rotate(${-hdg} 22 22)`);
    hdgTxt.textContent = `${String(Math.round(hdg) % 360).padStart(3, '0')}°`;
    const mpp = metersPerPixel();
    if (mpp > 0 && Number.isFinite(mpp)) {
      const target = mpp * 110;
      const step = NICE_STEPS.find((s) => s >= target) ?? NICE_STEPS[NICE_STEPS.length - 1];
      sbBar.style.width = `${Math.round(step / mpp)}px`;
      sbTxt.textContent = step >= 1000 ? `${step / 1000} km` : `${step} m`;
    }
    drawFootprint();
  }
  viewer.camera.changed.addEventListener(updateChrome);
  viewer.camera.percentageChanged = 0.01;
  setTimeout(updateChrome, 1200);

  // ─── 미니맵 ───
  const mmCanvas = minimap.querySelector('canvas');
  const mmCtx = mmCanvas.getContext('2d');
  const MM_Z = 12, MM_N = 3;
  const t2lon = (x, z) => (x / Math.pow(2, z)) * 360 - 180;
  const t2lat = (y, z) => {
    const n = Math.PI - (2 * Math.PI * y) / Math.pow(2, z);
    return (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
  };
  const cxTile = Math.floor(((site.lon + 180) / 360) * Math.pow(2, MM_Z));
  const cyTile = Math.floor(((1 - Math.log(Math.tan((site.lat * Math.PI) / 180)
    + 1 / Math.cos((site.lat * Math.PI) / 180)) / Math.PI) / 2) * Math.pow(2, MM_Z));
  const x0 = cxTile - 1, y0 = cyTile - 1;
  const mmWest = t2lon(x0, MM_Z), mmEast = t2lon(x0 + MM_N, MM_Z);
  const mmNorth = t2lat(y0, MM_Z), mmSouth = t2lat(y0 + MM_N, MM_Z);
  const base = document.createElement('canvas');
  base.width = base.height = 256 * MM_N;
  const baseCtx = base.getContext('2d');
  let baseReady = false;
  let loaded = 0;
  for (let dy = 0; dy < MM_N; dy++) {
    for (let dx = 0; dx < MM_N; dx++) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        baseCtx.drawImage(img, dx * 256, dy * 256);
        if (++loaded === MM_N * MM_N) { baseReady = true; drawFootprint(); }
      };
      img.onerror = () => { if (++loaded === MM_N * MM_N) { baseReady = true; drawFootprint(); } };
      img.src = `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${MM_Z}/${y0 + dy}/${x0 + dx}`;
    }
  }
  // 위도 → 미니맵 y (mercator)
  const merc = (lat) => Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360));
  const mercN = merc(mmNorth), mercS = merc(mmSouth);
  const toPx = (lon, lat) => [
    ((lon - mmWest) / (mmEast - mmWest)) * mmCanvas.width,
    ((mercN - merc(lat)) / (mercN - mercS)) * mmCanvas.height,
  ];
  function drawFootprint() {
    if (minimap.classList.contains('hidden') || !baseReady) return;
    mmCtx.drawImage(base, 0, 0, mmCanvas.width, mmCanvas.height);
    mmCtx.fillStyle = 'rgba(11,15,20,0.32)';
    mmCtx.fillRect(0, 0, mmCanvas.width, mmCanvas.height);
    // 뷰 풋프린트
    const rect = viewer.camera.computeViewRectangle(viewer.scene.globe.ellipsoid);
    if (rect) {
      const w = Cesium.Math.toDegrees(rect.west), e = Cesium.Math.toDegrees(rect.east);
      const s = Cesium.Math.toDegrees(rect.south), n = Cesium.Math.toDegrees(rect.north);
      const [px0, py0] = toPx(w, n), [px1, py1] = toPx(e, s);
      mmCtx.strokeStyle = '#f2a33c';
      mmCtx.lineWidth = 2;
      mmCtx.strokeRect(px0, py0, Math.max(px1 - px0, 5), Math.max(py1 - py0, 5));
    }
    // GP 마커
    const [gx, gy] = toPx(site.lon, site.lat);
    mmCtx.fillStyle = '#3dd68c';
    mmCtx.beginPath(); mmCtx.arc(gx, gy, 5, 0, Math.PI * 2); mmCtx.fill();
    mmCtx.strokeStyle = '#0b0f14'; mmCtx.lineWidth = 1.6; mmCtx.stroke();
    mmCtx.fillStyle = '#e8edf2';
    mmCtx.font = '600 13px "Chakra Petch"';
    mmCtx.fillText('GP', gx + 8, gy + 4);
  }
  mmCanvas.addEventListener('click', (ev) => {
    const r = mmCanvas.getBoundingClientRect();
    const lon = mmWest + ((ev.clientX - r.left) / r.width) * (mmEast - mmWest);
    const yFrac = (ev.clientY - r.top) / r.height;
    const lat = (Math.atan(Math.sinh(mercN - yFrac * (mercN - mercS))) * 180) / Math.PI;
    viewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(lon, lat - 0.02, 3200),
      orientation: { heading: 0, pitch: Cesium.Math.toRadians(-42), roll: 0 },
      duration: 1.1,
    });
  });

  // ─── 액션 ───
  let savedView = null;
  const api = {
    home() { opts.home?.(); },
    northUp() {
      const c = viewer.camera;
      viewer.camera.flyTo({
        destination: c.position.clone(),
        orientation: { heading: 0, pitch: c.pitch, roll: 0 },
        duration: 0.7,
      });
    },
    topDown() {
      const btn = tools.querySelector('[data-act="topdown"]');
      if (!savedView) {
        const c = viewer.camera;
        savedView = { dest: c.position.clone(), heading: c.heading, pitch: c.pitch };
        const range = Math.max(c.positionCartographic.height, 1800);
        viewer.camera.flyTo({
          destination: Cesium.Cartesian3.fromDegrees(site.lon, site.lat, site.groundH + range),
          orientation: { heading: 0, pitch: Cesium.Math.toRadians(-89.5), roll: 0 },
          duration: 1.0,
        });
        btn.classList.add('on');
      } else {
        viewer.camera.flyTo({
          destination: savedView.dest,
          orientation: { heading: savedView.heading, pitch: savedView.pitch, roll: 0 },
          duration: 1.0,
        });
        savedView = null;
        btn.classList.remove('on');
      }
    },
    toggleGrid() {
      const on = !opts.grid.enabled;
      opts.grid.setEnabled(on);
      tools.querySelector('[data-act="grid"]').classList.toggle('on', on);
      return on;
    },
    toggleMinimap() {
      const on = minimap.classList.toggle('hidden') === false;
      tools.querySelector('[data-act="minimap"]').classList.toggle('on', on);
      if (on) drawFootprint();
      return on;
    },
    screenshot() {
      viewer.render();
      viewer.canvas.toBlob((blob) => {
        if (!blob) return;
        const a = document.createElement('a');
        const d = new Date();
        const p = (n) => String(n).padStart(2, '0');
        a.download = `GP-Digital-Twin_${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}.png`;
        a.href = URL.createObjectURL(blob);
        a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 4000);
      });
      opts.toast?.('화면 캡처 저장');
    },
    fullscreen() {
      if (document.fullscreenElement) document.exitFullscreen();
      else wrap.requestFullscreen?.();
    },
  };
  tools.addEventListener('click', (e) => {
    const act = e.target.closest('button')?.dataset.act;
    if (!act) return;
    ({ home: api.home, topdown: api.topDown, north: api.northUp, grid: api.toggleGrid,
      minimap: api.toggleMinimap, shot: api.screenshot, full: api.fullscreen })[act]?.();
  });
  compass.addEventListener('click', api.northUp);

  // 격자 간격 배지 (축척바 옆)
  opts.grid.onInfo = (txt) => { sbGrid.textContent = txt ?? ''; };

  return api;
}

