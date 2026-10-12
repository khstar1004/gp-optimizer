// @ts-nocheck
/**
 * 측정 도구 — 표면거리 측정 + 고도 프로파일 (ArcGIS Elevation Profile 패턴)
 */
import { distM } from './geo';
import { sampleTerrainDetailed } from './terrainSample';

const D = Cesium.Cartesian3.fromDegrees;
const css = (c) => Cesium.Color.fromCssColorString(c);

export class MeasureTool {
  constructor(viewer) {
    this.viewer = viewer;
    this.ds = new Cesium.CustomDataSource('measure');
    viewer.dataSources.add(this.ds);
    this.mode = null;          // 'distance' | 'profile'
    this.points = [];          // [{lon,lat,h}]
    this.onProfile = null;     // (profileData) => void
    this.onStatus = null;
    this.onMode = null;    // (mode|null) => void — 패널 버튼 활성 표시용
    this.realTerrain = null; // main.ts가 생성 직후 주입 — GP 블렌더 지형 표면 참조
    this._wire();
  }

  _pickLL(pos) {
    // GP 정밀지형(globe.show=false)에서는 globe.pick 이 안 보이는 라이브 지형과
    // 광선을 맞춰 클릭 지점·표고가 모두 어긋난다 — 실제로 그려진 표면(GLB 포함)의
    // 깊이버퍼를 그대로 읽는 pickPosition 을 우선한다(위경도·표고 둘 다 정확해짐).
    let cart = null;
    if (this.viewer.scene.pickPositionSupported) cart = this.viewer.scene.pickPosition(pos);
    if (!cart) {
      const ray = this.viewer.camera.getPickRay(pos);
      cart = ray && this.viewer.scene.globe.pick(ray, this.viewer.scene);
    }
    if (!cart) return null;
    const c = Cesium.Cartographic.fromCartesian(cart);
    return { lon: Cesium.Math.toDegrees(c.longitude), lat: Cesium.Math.toDegrees(c.latitude), h: c.height };
  }

  _wire() {
    const handler = new Cesium.ScreenSpaceEventHandler(this.viewer.canvas);
    handler.setInputAction((ev) => {
      if (!this.mode) return;
      const ll = this._pickLL(ev.position);
      if (!ll) return;
      this.points.push(ll);
      this._redraw();
      if (this.mode === 'profile' && this.points.length === 2) {
        this._runProfile();
        this.mode = null;
      this.onMode?.(null);
        this.onStatus?.(null);
      }
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK);
    handler.setInputAction(() => {
      if (!this.mode) return;
      if (this.mode === 'area' && this.points.length >= 3) this._closeArea();
      this.mode = null;
      this.onMode?.(null);
      this.onStatus?.(null);
    }, Cesium.ScreenSpaceEventType.RIGHT_CLICK);
  }

  setMode(mode) {
    this.mode = mode;
    this.onMode?.(mode);
    this.points = [];
    this.ds.entities.removeAll();
    this.onStatus?.(mode === 'distance' ? '지도 클릭으로 구간 추가 · 우클릭 종료'
      : mode === 'profile' ? '시점과 종점을 클릭하세요 (2점)'
        : mode === 'area' ? '면적: 꼭짓점 클릭 · 우클릭으로 폐합' : null);
  }

  /** 면적 폐합 — 국지 미터 투영 shoelace (수 km 규모 오차 무시 가능) */
  _closeArea() {
    const pts = this.points;
    const lat0 = pts[0].lat * Math.PI / 180;
    const mx = (p) => (p.lon - pts[0].lon) * 111320 * Math.cos(lat0);
    const my = (p) => (p.lat - pts[0].lat) * 110540;
    let area2 = 0, perim = 0;
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i], b = pts[(i + 1) % pts.length];
      area2 += mx(a) * my(b) - mx(b) * my(a);
      perim += distM(a.lon, a.lat, b.lon, b.lat);
    }
    const areaM2 = Math.abs(area2) / 2;
    const cLon = pts.reduce((s, p) => s + p.lon, 0) / pts.length;
    const cLat = pts.reduce((s, p) => s + p.lat, 0) / pts.length;
    const e = this.ds.entities;
    e.add({
      polygon: {
        // classificationType 도 clampToGround 와 같은 이유로 GP 정밀지형에서 접지가
        // 안 된다 — 각 점의 실측 표고(pickPosition 기반)를 그대로 박아 평면으로 채운다.
        hierarchy: new Cesium.PolygonHierarchy(pts.map((p) => D(p.lon, p.lat, (p.h ?? 0) + 0.3))),
        perPositionHeight: true,
        material: css('#f2a33c').withAlpha(0.16),
      },
    });
    e.add({
      polyline: {
        // clampToGround 는 GP 정밀지형(globe.show=false)에서 접지가 안 되므로
        // 클릭 시 이미 정확히 잰 각 점의 표고(p.h, pickPosition 기반)를 그대로 쓴다.
        positions: [...pts, pts[0]].map((p) => D(p.lon, p.lat, (p.h ?? 0) + 0.5)),
        width: 2.6,
        material: css('#f2a33c').withAlpha(0.9),
      },
    });
    const areaTxt = areaM2 >= 1e6 ? `${(areaM2 / 1e6).toFixed(2)}k㎡`
      : areaM2 >= 3306 ? `${Math.round(areaM2).toLocaleString()}㎡ (${Math.round(areaM2 / 3.3058).toLocaleString()}평)`
        : `${Math.round(areaM2).toLocaleString()}㎡`;
    e.add({
      position: D(cLon, cLat, (pts[0].h ?? 0) + 6),
      label: {
        text: `면적 ${areaTxt}\n둘레 ${(perim / 1000).toFixed(2)}km · ${pts.length}각`,
        font: '600 12px "Chakra Petch", sans-serif',
        fillColor: css('#ffd89a'), showBackground: true,
        backgroundColor: css('#0b1420').withAlpha(0.85),
        backgroundPadding: new Cesium.Cartesian2(9, 6),
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
      },
    });
    this.onStatus?.(`면적 ${areaTxt} · 둘레 ${(perim / 1000).toFixed(2)}km`);
  }

  clear() {
    this.mode = null;
    this.points = [];
    this.ds.entities.removeAll();
    this.onMode?.(null);
    this.onStatus?.(null);
  }

  totalSurfaceM() {
    let sum = 0;
    for (let i = 1; i < this.points.length; i++) {
      const a = this.points[i - 1], b = this.points[i];
      sum += Math.hypot(distM(a.lon, a.lat, b.lon, b.lat), b.h - a.h);
    }
    return sum;
  }

  _redraw() {
    const e = this.ds.entities;
    e.removeAll();
    if (this.points.length >= 2) {
      e.add({
        polyline: {
          // clampToGround 는 GP 정밀지형에서 접지가 안 되므로 클릭 시 이미 정확히
          // 잰 각 점의 표고(p.h, pickPosition 기반)를 그대로 쓴다.
          positions: this.points.map((p) => D(p.lon, p.lat, (p.h ?? 0) + 0.5)),
          width: 3,
          material: new Cesium.PolylineDashMaterialProperty({ color: css('#f2a33c'), dashLength: 12 }),
        },
      });
    }
    let cum = 0;
    this.points.forEach((p, i) => {
      if (i > 0) {
        const a = this.points[i - 1];
        cum += Math.hypot(distM(a.lon, a.lat, p.lon, p.lat), p.h - a.h);
      }
      e.add({
        position: D(p.lon, p.lat, p.h + 2),
        point: { pixelSize: 7, color: css('#f2a33c'), outlineColor: css('#0b0f14'), outlineWidth: 2, disableDepthTestDistance: Number.POSITIVE_INFINITY },
        label: {
          text: i === 0 ? '기점' : `${(cum / 1000).toFixed(2)}km · ${Math.round(p.h)}m`,
          font: '600 11px "Chakra Petch", sans-serif',
          fillColor: css('#f2a33c'), showBackground: true,
          backgroundColor: css('#0b1420').withAlpha(0.8),
          pixelOffset: new Cesium.Cartesian2(0, -16),
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
        },
      });
    });
  }

  async _runProfile() {
    const [a, b] = this.points;
    const N = 140;
    const cartos = [];
    for (let i = 0; i <= N; i++) {
      const t = i / N;
      cartos.push(Cesium.Cartographic.fromDegrees(a.lon + (b.lon - a.lon) * t, a.lat + (b.lat - a.lat) * t));
    }
    // GP 정밀지형 표출 중이면 그 GLB 표면을 우선한다 — 라이브 지형만 보면 화면에
    // 보이는 능선과 다른 모양의 프로파일·가시선 판정이 나온다.
    const rt = this.realTerrain;
    const rtActive = rt?.active && rt?.surfaceReady;
    if (!rtActive) await sampleTerrainDetailed(this.viewer.terrainProvider, cartos);
    const totalD = distM(a.lon, a.lat, b.lon, b.lat);
    const samples = cartos.map((c, i) => {
      const lon = Cesium.Math.toDegrees(c.longitude);
      const lat = Cesium.Math.toDegrees(c.latitude);
      const h = rtActive ? (rt.surfaceHeightAt(lon, lat) ?? c.height ?? 0) : (c.height ?? 0);
      return { d: totalD * (i / N), h, lon, lat };
    });

    // LOS (관측고 2m → 표적고 2m, 곡률 보정)
    const obsH = samples[0].h + 2;
    const tgtH = samples[N].h + 2;
    let maxTan = -Infinity;
    let losBlockedFrom = null;
    for (let i = 1; i <= N; i++) {
      const s = samples[i];
      const curve = (s.d * s.d) / (2 * 6371008.8) * 0.87;
      const lineH = obsH + (tgtH - obsH) * (i / N);
      const tan = (s.h - curve - obsH) / s.d;
      s.losBlocked = (s.h - curve) > lineH + 0.5 ? false : false; // 프로파일선 대비 지형 돌출 여부는 아래에서
      s.vis = tan <= maxTan ? false : true;
      if (tan > maxTan) maxTan = tan;
    }
    const visible = samples[N].vis;

    // 지형선이 시선(직선)을 가리는 구간
    for (let i = 1; i < N; i++) {
      const s = samples[i];
      const lineH = obsH + (tgtH - obsH) * (i / N);
      s.aboveSight = s.h > lineH;
    }

    // 통계
    let gain = 0, surf = 0;
    for (let i = 1; i <= N; i++) {
      const dh = samples[i].h - samples[i - 1].h;
      if (dh > 0) gain += dh;
      surf += Math.hypot(samples[i].d - samples[i - 1].d, dh);
    }
    const minH = Math.min(...samples.map((s) => s.h));
    const maxH = Math.max(...samples.map((s) => s.h));

    // 지도에 시선 표시
    this.ds.entities.add({
      polyline: {
        positions: [D(a.lon, a.lat, obsH), D(b.lon, b.lat, tgtH)],
        width: 2,
        material: visible ? css('#3dd68c').withAlpha(0.9)
          : new Cesium.PolylineDashMaterialProperty({ color: css('#ed5d5d'), dashLength: 8 }),
      },
    });

    this.onProfile?.({ samples, totalD, surf, gain, minH, maxH, visible, obsH, tgtH });
  }
}

/** 프로파일 차트 렌더 (다크 콘솔 스타일) */
export function drawProfileChart(canvas, prof) {
  const dpr = window.devicePixelRatio || 1;
  const W = canvas.clientWidth || 420, H = 170;
  canvas.width = W * dpr; canvas.height = H * dpr;
  canvas.style.height = H + 'px';
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);
  const pad = { l: 44, r: 10, t: 12, b: 22 };
  const { samples, totalD, minH, maxH, obsH, tgtH } = prof;
  const span = Math.max(20, maxH - minH);
  const X = (d) => pad.l + (d / totalD) * (W - pad.l - pad.r);
  const Y = (h) => H - pad.b - ((h - minH + span * 0.08) / (span * 1.25)) * (H - pad.t - pad.b);

  ctx.clearRect(0, 0, W, H);
  // 격자
  ctx.strokeStyle = '#1c2530'; ctx.fillStyle = '#8494a6';
  ctx.font = '9px "Chakra Petch", sans-serif'; ctx.lineWidth = 1;
  for (let i = 0; i <= 4; i++) {
    const h = minH + (span * 1.1 * i) / 4;
    ctx.beginPath(); ctx.moveTo(pad.l, Y(h)); ctx.lineTo(W - pad.r, Y(h)); ctx.stroke();
    ctx.fillText(`${Math.round(h)}m`, 6, Y(h) + 3);
  }
  for (let km = 0; km <= totalD / 1000; km += 1) {
    ctx.fillText(`${km}km`, X(km * 1000) - 6, H - 8);
  }
  // 지형 채움
  ctx.beginPath();
  ctx.moveTo(X(0), Y(samples[0].h));
  for (const s of samples) ctx.lineTo(X(s.d), Y(s.h));
  ctx.lineTo(X(totalD), H - pad.b); ctx.lineTo(X(0), H - pad.b); ctx.closePath();
  const grd = ctx.createLinearGradient(0, pad.t, 0, H - pad.b);
  grd.addColorStop(0, 'rgba(242,163,60,0.35)');
  grd.addColorStop(1, 'rgba(242,163,60,0.05)');
  ctx.fillStyle = grd; ctx.fill();
  // 지형선
  ctx.beginPath();
  ctx.moveTo(X(0), Y(samples[0].h));
  for (const s of samples) ctx.lineTo(X(s.d), Y(s.h));
  ctx.strokeStyle = '#f2a33c'; ctx.lineWidth = 2; ctx.stroke();
  // 시선 (직선) + 차폐 구간 강조
  ctx.beginPath();
  ctx.moveTo(X(0), Y(obsH)); ctx.lineTo(X(totalD), Y(tgtH));
  ctx.strokeStyle = prof.visible ? '#3dd68c' : '#ed5d5d';
  ctx.setLineDash([5, 4]); ctx.lineWidth = 1.6; ctx.stroke(); ctx.setLineDash([]);
  // 시선 위로 돌출한 지형 (차폐 능선)
  ctx.fillStyle = 'rgba(237,93,93,0.45)';
  for (let i = 1; i < samples.length; i++) {
    const s = samples[i];
    if (s.aboveSight) {
      const lineH = obsH + (tgtH - obsH) * (i / samples.length);
      ctx.fillRect(X(s.d) - 1.2, Y(s.h), 2.4, Math.max(1, Y(lineH) - Y(s.h)));
    }
  }
}

