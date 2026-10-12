// @ts-nocheck
/**
 * 광학 HUD — 「그 자산의 시점으로 본다」를 화면 위에 성립시키는 계기판
 *
 * 시점을 옮기는 것만으로는 그 자산이 되지 않는다. 카메라를 TOD 자리에 놓아도
 * 화면에 아무 계기가 없으면 그것은 그냥 지도를 낮게 본 것이다. 실제로 그 장비를
 * 들여다볼 때 눈에 들어오는 것은 풍경이 아니라 **풍경 위에 겹친 숫자들**이다 —
 * 접안경 테두리, 방위 테이프, 부앙 사다리, 밀 눈금 조준선, 우하단의 유효거리
 * 막대, 좌상단의 채널·극성·REC, 그리고 표적에 걸리는 브래킷.
 *
 * 그래서 이 파일은 캔버스 하나에 그 전부를 그린다. 자산 종류(opticProfile)가
 * 무엇을 그릴지 고르고, 값은 전부 바깥에서 계산돼 들어온다 — 여기서는 아무것도
 * 지어내지 않는다. 유효거리는 sensorPerformance 가, 표적 판정은 지형 LOS 가,
 * 거리는 지형 광선 교차가 준 값이다.
 *
 * 좌표계는 CSS 픽셀이다(setSize 가 dpr 을 흡수한다).
 */
import { fmtM, VERDICT_COLOR } from './sensorPerformance';
import { toMGRS } from './mgrs';
import { compassKo, fmtDuration, motionLabel } from './tracking';
import { CUE_LABEL } from './crossCue';

const MIL_PER_DEG = 17.7778;
const pad2 = (n) => String(Math.floor(n)).padStart(2, '0');
const az360 = (a) => ((a % 360) + 360) % 360;
const DIRS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];

/** 화면 극성에 따른 계기 잉크 — 흑열 화면에 흰 글씨를 쓰면 사라진다. */
const INK = {
  vis:   { ink: '#f2a33c', text: '#e8f0f6', dim: 'rgba(232,240,246,0.55)', halo: 'rgba(0,0,0,0.8)' },
  wh:    { ink: '#ffffff', text: '#ffffff', dim: 'rgba(255,255,255,0.6)',  halo: 'rgba(0,0,0,0.85)' },
  bh:    { ink: '#ffd24a', text: '#ffe9a8', dim: 'rgba(255,233,168,0.6)',  halo: 'rgba(0,0,0,0.85)' },
  nvg:   { ink: '#8ef0a8', text: '#b6ffc9', dim: 'rgba(142,240,168,0.55)', halo: 'rgba(0,0,0,0.8)' },
  radar: { ink: '#3dd68c', text: '#9dffcf', dim: 'rgba(61,214,140,0.6)',   halo: 'rgba(0,0,0,0.8)' },
};

const POLARITY_LABEL = { wh: 'WHITE HOT', bh: 'BLACK HOT', nvg: 'I² NVG', radar: 'PPI', vis: 'DAY EO' };

export class OpticHud {
  constructor(canvas) {
    this.cv = canvas;
    this.w = 0; this.h = 0; this.dpr = 1;
    this._t0 = performance.now();
    this._wf = [];        // 음향 워터폴 이력
    this._sweep = 0;      // PPI 스윕각
    this._blips = [];
  }

  setSize(w, h) {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    if (this.w === w && this.h === h && this.dpr === dpr) return;
    this.w = w; this.h = h; this.dpr = dpr;
    this.cv.width = Math.round(w * dpr);
    this.cv.height = Math.round(h * dpr);
    this.cv.style.width = `${w}px`;
    this.cv.style.height = `${h}px`;
  }

  clear() {
    const g = this.cv.getContext('2d');
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.clearRect(0, 0, this.cv.width, this.cv.height);
  }

  /**
   * @param f {
   *   optic, palette, zoom, fov, dtg,
   *   cam:{ lon, lat, eyeH, az, el },
   *   vantage:{ name, sub, tag, groundH, height },
   *   perf, atm, lrf, targets, nuc, rec, sector,
   *   extra:{ flight, link, ppi, rf, audio, ballistic }
   * }
   */
  draw(f) {
    const g = this.cv.getContext('2d');
    g.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    g.clearRect(0, 0, this.w, this.h);
    const P = INK[f.palette] ?? INK.vis;
    const t = (performance.now() - this._t0) / 1000;
    const ctx = { g, P, t, f, W: this.w, H: this.h, cx: this.w / 2, cy: this.h / 2 };

    this._mask(ctx);
    if (f.nuc > 0) { this._nuc(ctx); return; }   // NUC 중엔 셔터가 닫힌다 — 아무것도 안 보인다

    this._headingTape(ctx);
    this._elevLadder(ctx);
    this._reticle(ctx);
    this._targets(ctx);
    this._cueArrow(ctx);
    this._topLeft(ctx);
    this._topRight(ctx);
    this._gauges(ctx);
    this._perfBar(ctx);
    this._flareBanner(ctx);
    this._cuePanel(ctx);
    this._alertBanner(ctx);
  }

  /**
   * 상시 감시 경보 — **내가 이 화면을 보고 있지 않아도** 자산은 판정한다.
   * 다른 자산이 처음 잡은 것을 여기서 알려 주지 않으면, 화면 하나에 매인 사람은
   * 옆에서 벌어지는 일을 끝까지 모른다.
   */
  _alertBanner({ g, W, cx, f, t }) {
    const a = f.alert;
    if (!a) return;
    const w = 380, h = 40, x = cx - w / 2, y = 8;
    const blink = Math.floor(t * 2.5) % 2 === 0;
    g.fillStyle = 'rgba(60,12,12,0.92)';
    g.fillRect(x, y, w, h);
    g.strokeStyle = blink ? '#ed5d5d' : 'rgba(237,93,93,0.35)';
    g.lineWidth = 2;
    g.strokeRect(x + 1, y + 1, w - 2, h - 2);
    g.font = '700 13px "Chakra Petch", monospace';
    g.fillStyle = '#ed5d5d';
    g.fillText(`⚠ ${a.label}`, x + 12, y + 18);
    g.font = '600 11.5px "Chakra Petch", monospace';
    g.fillStyle = '#ffd9d9';
    g.fillText(`${a.name}${a.assetName ? ` · ${a.assetName}` : ''}`, x + 96, y + 18);
    g.font = '600 10px "Chakra Petch", monospace';
    g.fillStyle = 'rgba(255,217,217,0.8)';
    g.fillText(`${a.dtg} · ${a.grade ?? ''} ${a.distM != null ? `${Math.round(a.distM)}m` : ''}`
      + `${a.holders ? ` · ${a.holders}개 자산 접촉` : ''}`, x + 12, y + 33);
  }

  /**
   * 지시선 — 잠긴 표적이 화면 밖에 있을 때 어느 쪽으로 돌려야 하는지.
   * 자동추적이 없는 광학(조준경·쌍안경)에서는 이것이 추적의 전부다.
   */
  _cueArrow({ g, P, W, H, cx, cy, f }) {
    const c = f.cue;
    if (!c || c.onScreen) return;
    const R = Math.min(W, H) * 0.3;
    const a = (c.screenAzDeg * Math.PI) / 180;
    const x = cx + Math.sin(a) * R;
    const y = cy - Math.sin((c.screenElDeg * Math.PI) / 180) * R * 0.8;
    g.save();
    g.translate(x, Math.max(64, Math.min(H - 120, y)));
    g.rotate(a);
    g.fillStyle = '#3dd68c';
    g.beginPath();
    g.moveTo(0, -14); g.lineTo(9, 8); g.lineTo(0, 3); g.lineTo(-9, 8);
    g.closePath(); g.fill();
    g.restore();
    g.font = '700 10px "Chakra Petch", monospace';
    g.textAlign = 'center';
    this._label(g, P, `${c.trackId ?? '표적'} ${Math.abs(Math.round(c.screenAzDeg))}° ${c.screenAzDeg > 0 ? '우' : '좌'}`,
      Math.max(60, Math.min(W - 60, x)), Math.max(64, Math.min(H - 120, y)) + 24, '#3dd68c');
    g.textAlign = 'left';
  }

  /** 조명 지원 배너 — 남은 시간이 곧 관측이 되살아 있는 시간이다 */
  _flareBanner({ g, P, W, cx, f }) {
    const fl = f.flare;
    if (!fl?.active) return;
    const w = 268, h = 34, x = cx - w / 2, y = 60;
    const k = fl.intensity;
    g.fillStyle = `rgba(60,44,10,${(0.55 + 0.3 * k).toFixed(2)})`;
    g.fillRect(x, y, w, h);
    g.strokeStyle = `rgba(255,224,138,${(0.5 + 0.5 * k).toFixed(2)})`;
    g.lineWidth = 1;
    g.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
    g.font = '700 12px "Chakra Petch", monospace';
    g.fillStyle = '#ffe08a';
    g.fillText(`✸ 조명 지원 — 잔여 ${Math.max(0, fl.remainS).toFixed(0)}s`, x + 10, y + 15);
    g.font = '600 9.5px "Chakra Petch", monospace';
    g.fillStyle = fl.backscatter ? '#ed5d5d' : 'rgba(255,224,138,0.75)';
    g.fillText(fl.backscatter
      ? `역산란 — 반경 ${fmtM(fl.radiusM)} 로 축소, 근거리 백화`
      : `반경 ${fmtM(fl.radiusM)} · 조명고 ${Math.round(fl.aglM)}m`, x + 10, y + 28);
    // 연소 게이지
    g.fillStyle = 'rgba(255,224,138,0.85)';
    g.fillRect(x, y + h - 2, w * Math.max(0, fl.remainS / fl.burnS), 2);
  }

  /**
   * 인계 결과 — 「누가 이걸 같이 볼 수 있는가」.
   * 안 되는 자산도 적는다. 「안 보인다」가 아니라 「능선에 막혔다」여야 배치를 고친다.
   */
  _cuePanel({ g, P, W, H, f }) {
    const list = f.cueResults;
    if (!list?.length) return;
    const rows = list.slice(0, 5);
    // 좌측 열 — 계기 아래에 이어 붙인다. 우측에 두면 관제벽 창(z 48)이 서는 순간
    // 그 밑으로 들어가, 정작 인계한 직후에 결과가 보이지 않는다.
    const w = 300, x = 14, h = 26 + rows.length * 17;
    const y = Math.min(H - 120 - h, this._col?.left ?? 200);
    this._panel(g, x, y, w, h);
    g.font = '600 10px "Chakra Petch", monospace';
    g.fillStyle = P.dim;
    g.fillText(`교차표적지정 — ${f.cue?.trackId ?? '표적'}`, x + 10, y + 15);
    rows.forEach((r, i) => {
      const yy = y + 32 + i * 17;
      const ok = r.verdict === 'READY' || r.verdict === 'SLEW';
      g.font = '700 10.5px "Chakra Petch", monospace';
      g.fillStyle = ok ? r.color : 'rgba(232,240,246,0.4)';
      g.fillText(r.name, x + 10, yy);
      g.font = '600 9.5px "Chakra Petch", monospace';
      g.fillStyle = ok ? 'rgba(232,240,246,0.85)' : 'rgba(232,240,246,0.35)';
      g.fillText(`${fmtM(r.distM)} ${r.grade}`, x + 92, yy);
      g.fillStyle = r.verdict === 'READY' || r.moved ? '#3dd68c'
        : r.verdict === 'SLEW' ? '#e3b341' : '#ed5d5d';
      g.textAlign = 'right';
      g.fillText(r.moved ? '지향 전환함 ✓' : CUE_LABEL[r.verdict], x + w - 10, yy);
      g.textAlign = 'left';
    });
  }

  // ══════════════════════════════════════════════════════════════════════
  // 접안 마스크 — 화면의 테두리가 곧 「무엇을 들여다보고 있는가」다
  // ══════════════════════════════════════════════════════════════════════
  _mask({ g, P, W, H, cx, cy, f }) {
    const mask = f.optic.mask;
    g.save();
    if (mask === 'eyepiece' || mask === 'bino') {
      const R = Math.min(W, H) * (mask === 'bino' ? 0.44 : 0.44);
      const dx = mask === 'bino' ? R * 0.5 : 0;
      const rings = mask === 'bino' ? [[cx - dx, cy], [cx + dx, cy]] : [[cx, cy]];
      // 두 통이 겹치는 부분은 **뚫려야** 한다. 짝수-홀수 규칙으로 구멍 둘을 겹치면
      // 교집합이 도로 메워져 화면 한가운데가 검게 남는다 — 그래서 덮개를 칠한 뒤
      // destination-out 으로 원을 파낸다(겹쳐 파도 한 번 파인 것과 같다).
      g.fillStyle = 'rgba(2,4,6,0.97)';
      g.fillRect(0, 0, W, H);
      g.globalCompositeOperation = 'destination-out';
      for (const [x, y] of rings) {
        g.beginPath(); g.arc(x, y, R, 0, Math.PI * 2); g.fill();
      }
      g.globalCompositeOperation = 'source-over';

      // 렌즈 테두리. 두 통의 안쪽 호까지 그으면 화면 한가운데에 X 자가 생긴다 —
      // 그어 놓고 원 안쪽을 다시 지워 **바깥 윤곽만** 남긴다.
      g.strokeStyle = 'rgba(0,0,0,0.85)'; g.lineWidth = 3;
      for (const [x, y] of rings) { g.beginPath(); g.arc(x, y, R, 0, Math.PI * 2); g.stroke(); }
      if (rings.length > 1) {
        g.globalCompositeOperation = 'destination-out';
        for (const [x, y] of rings) { g.beginPath(); g.arc(x, y, R - 2.6, 0, Math.PI * 2); g.fill(); }
        g.globalCompositeOperation = 'source-over';
      }

      // 주변부 감광은 시야 **전체**에 한 번만. 통마다 걸면 두 통이 겹치는 한가운데가
      // 가장 어두워지는데, 실제로는 그 겹침이 가장 밝은 자리다.
      g.beginPath();
      for (const [x, y] of rings) { g.moveTo(x + R, y); g.arc(x, y, R, 0, Math.PI * 2); }
      g.clip();
      const outer = R + (rings.length > 1 ? dx : 0);
      const gr = g.createRadialGradient(cx, cy, outer * 0.66, cx, cy, outer);
      gr.addColorStop(0, 'rgba(0,0,0,0)');
      gr.addColorStop(1, 'rgba(0,0,0,0.55)');
      g.fillStyle = gr;
      g.fillRect(0, 0, W, H);
      this._maskR = R;
      this._maskShape = mask;
      this._maskLeft = cx - R - dx;
    } else if (mask === 'rect') {
      // 카메라 프레임 — 4:3 활성영역 밖은 어둡게, 모서리에 프레임 브래킷
      const mw = Math.min(W * 0.9, H * 1.34) / 2, mh = Math.min(H * 0.86, mw * 0.75);
      g.fillStyle = 'rgba(2,4,6,0.9)';
      g.beginPath();
      g.rect(0, 0, W, H);
      g.rect(cx - mw, cy - mh, mw * 2, mh * 2);
      g.fill('evenodd');
      g.strokeStyle = P.dim; g.lineWidth = 1;
      const a = 22;
      for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
        g.beginPath();
        g.moveTo(cx + sx * mw - sx * a, cy + sy * mh);
        g.lineTo(cx + sx * mw, cy + sy * mh);
        g.lineTo(cx + sx * mw, cy + sy * mh - sy * a);
        g.stroke();
      }
      this._maskR = null;
      this._frame = { mw, mh };
      this._maskLeft = cx - mw;
    } else {
      // 맨눈 — 마스크는 없지만 시야 주변부는 어둡다
      const gr = g.createRadialGradient(cx, cy, Math.min(W, H) * 0.3, cx, cy, Math.max(W, H) * 0.72);
      gr.addColorStop(0, 'rgba(0,0,0,0)');
      gr.addColorStop(1, 'rgba(0,0,0,0.5)');
      g.fillStyle = gr;
      g.fillRect(0, 0, W, H);
      this._maskR = null;
      this._frame = null;
      this._maskLeft = W * 0.13;
    }
    g.restore();
  }

  /** NUC(비균일성 보정) — 셔터가 닫히고 화면이 얼어붙는 0.6초. 열상의 서명이다. */
  _nuc({ g, P, W, H, cx, cy, f }) {
    g.fillStyle = f.palette === 'bh' ? 'rgba(232,236,240,0.94)' : 'rgba(28,32,36,0.94)';
    g.fillRect(0, 0, W, H);
    g.fillStyle = f.palette === 'bh' ? '#12171c' : '#e8f0f6';
    g.font = '700 15px "Chakra Petch", monospace';
    g.textAlign = 'center';
    g.fillText('NUC — 비균일성 보정 중', cx, cy - 6);
    g.font = '600 11px "Chakra Petch", monospace';
    g.fillText('SHUTTER CLOSED', cx, cy + 14);
    const bw = 160;
    g.strokeStyle = f.palette === 'bh' ? '#12171c' : '#e8f0f6';
    g.strokeRect(cx - bw / 2, cy + 26, bw, 4);
    g.fillRect(cx - bw / 2, cy + 26, bw * (1 - f.nuc), 4);
    g.textAlign = 'left';
  }

  // ══════════════════════════════════════════════════════════════════════
  // 방위 테이프 — 상단. 어디를 보고 있는지가 숫자 하나가 아니라 눈금으로 흐른다
  // ══════════════════════════════════════════════════════════════════════
  _headingTape({ g, P, W, f, cx }) {
    const az = az360(f.cam.az);
    const fov = f.fov;
    const y = 34;
    const halfW = Math.min(W * 0.34, 320);
    const pxPerDeg = halfW / (fov / 2);

    g.save();
    g.beginPath(); g.rect(cx - halfW, y - 22, halfW * 2, 34); g.clip();
    g.strokeStyle = P.dim; g.lineWidth = 1;
    g.font = '600 10px "Chakra Petch", monospace';
    g.textAlign = 'center';
    const from = Math.floor((az - fov / 2) / 5) * 5;
    for (let a = from; a <= az + fov / 2 + 5; a += 5) {
      const x = cx + (a - az) * pxPerDeg;
      const major = az360(a) % 15 === 0;
      g.strokeStyle = major ? P.ink : P.dim;
      g.beginPath(); g.moveTo(x, y); g.lineTo(x, y - (major ? 9 : 5)); g.stroke();
      if (major) {
        const v = az360(a);
        const lbl = v % 90 === 0 ? DIRS[(v / 45) % 8] : String(v).padStart(3, '0');
        g.fillStyle = P.text;
        g.fillText(lbl, x, y - 12);
      }
    }
    // 책임구역 한계 — 이 밖을 보고 있으면 그건 우리 섹터가 아니다
    if (f.sector) {
      for (const edge of [f.sector.from, f.sector.to]) {
        const d = ((edge - az + 540) % 360) - 180;
        if (Math.abs(d) > fov / 2 + 4) continue;
        const x = cx + d * pxPerDeg;
        g.strokeStyle = '#ed5d5d'; g.lineWidth = 1.6;
        g.beginPath(); g.moveTo(x, y + 1); g.lineTo(x, y - 11); g.stroke();
      }
    }
    g.restore();

    // 현재 방위 카툿
    g.fillStyle = P.ink;
    g.beginPath();
    g.moveTo(cx, y + 3); g.lineTo(cx - 6, y + 11); g.lineTo(cx + 6, y + 11);
    g.closePath(); g.fill();
    g.font = '700 13px "Chakra Petch", monospace';
    g.textAlign = 'center';
    this._label(g, P, `${String(Math.round(az)).padStart(3, '0')}°`, cx, y + 25);
    g.textAlign = 'left';
  }

  /** 부앙 사다리 — 좌측 세로. 내려다보는 각이 곧 감제 정도다. */
  _elevLadder({ g, P, H, W, f, cy }) {
    // 사다리는 접안 테두리 바로 안쪽에 붙는다 — 화면 왼쪽 끝에 떨어져 있으면
    // 시선이 조준선과 사다리 사이를 너무 멀리 오간다.
    const x = Math.max(56, Math.min(W * 0.3, (this._maskLeft ?? W * 0.11) + 26));
    const vfov = f.fov * 0.62;
    const halfH = Math.min(H * 0.3, 190);
    const pxPerDeg = halfH / (vfov / 2);
    const el = f.cam.el;
    g.save();
    g.beginPath(); g.rect(x - 30, cy - halfH, 74, halfH * 2); g.clip();
    g.font = '600 9.5px "Chakra Petch", monospace';
    const from = Math.ceil((el - vfov / 2) / 5) * 5;
    for (let a = from; a <= el + vfov / 2; a += 5) {
      const y = cy - (a - el) * pxPerDeg;
      const major = a % 10 === 0;
      g.strokeStyle = a === 0 ? '#3dd68c' : major ? P.ink : P.dim;
      g.lineWidth = a === 0 ? 1.6 : 1;
      g.beginPath(); g.moveTo(x, y); g.lineTo(x + (major ? 14 : 8), y); g.stroke();
      if (major) {
        g.fillStyle = a === 0 ? '#3dd68c' : P.text;
        g.fillText(`${a > 0 ? '+' : ''}${a}`, x + 18, y + 3);
      }
    }
    g.restore();
    g.fillStyle = P.ink;
    g.beginPath();
    g.moveTo(x - 3, cy); g.lineTo(x - 11, cy - 5); g.lineTo(x - 11, cy + 5);
    g.closePath(); g.fill();
    g.font = '600 9.5px "Chakra Petch", monospace';
    this._label(g, P, `EL ${el >= 0 ? '+' : ''}${el.toFixed(1)}°`, x - 46, cy + 20);
  }

  // ══════════════════════════════════════════════════════════════════════
  // 조준선
  // ══════════════════════════════════════════════════════════════════════
  _reticle(ctx) {
    const { g, P, f, cx, cy, W } = ctx;
    const kind = f.optic.reticle;
    g.strokeStyle = P.ink;
    g.fillStyle = P.ink;
    g.lineWidth = 1.2;
    const pxPerMil = (W * 0.72) / (f.fov * MIL_PER_DEG);

    if (kind === 'none') {
      g.globalAlpha = 0.5;
      g.beginPath(); g.arc(cx, cy, 2, 0, Math.PI * 2); g.fill();
      g.globalAlpha = 1;
      return;
    }
    if (kind === 'mil') {
      // 밀 격자 — 5밀마다 눈금, 10밀마다 길게. 표적 크기로 거리를 재는 그 눈금.
      const arm = Math.min(W * 0.22, 40 * Math.max(1, pxPerMil * 5));
      g.beginPath();
      g.moveTo(cx - arm, cy); g.lineTo(cx - 8, cy);
      g.moveTo(cx + 8, cy); g.lineTo(cx + arm, cy);
      g.moveTo(cx, cy - arm); g.lineTo(cx, cy - 8);
      g.moveTo(cx, cy + 8); g.lineTo(cx, cy + arm);
      g.stroke();
      // 눈금 간격은 배율에 따라 성긴다 — ×1 광각에서 5밀 간격을 다 그리면
      // 조준선이 빗살이 되어 표적을 덮는다.
      const step = Math.max(5, Math.ceil(12 / Math.max(0.2, pxPerMil) / 5) * 5);
      for (let m = step; m <= step * 8; m += step) {
        const d = m * pxPerMil;
        if (d > arm) break;
        const len = m % (step * 2) === 0 ? 6 : 3;
        g.beginPath();
        g.moveTo(cx - d, cy - len); g.lineTo(cx - d, cy + len);
        g.moveTo(cx + d, cy - len); g.lineTo(cx + d, cy + len);
        g.moveTo(cx - len, cy - d); g.lineTo(cx + len, cy - d);
        g.moveTo(cx - len, cy + d); g.lineTo(cx + len, cy + d);
        g.stroke();
      }
      g.beginPath(); g.arc(cx, cy, 1.4, 0, Math.PI * 2); g.fill();
      g.font = '600 9px "Chakra Petch", monospace';
      this._label(g, P, `${step} MIL`, cx + step * pxPerMil + 4, cy + 14);
      return;
    }
    if (kind === 'thermal') {
      // 열상 조준선 — 중앙을 비워 표적 실루엣을 가리지 않는다 + 추적 게이트
      const gap = 12, arm = 46;
      g.beginPath();
      for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
        g.moveTo(cx + dx * gap, cy + dy * gap);
        g.lineTo(cx + dx * arm, cy + dy * arm);
      }
      g.stroke();
      const s = 34;
      g.lineWidth = 1.4;
      for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
        g.beginPath();
        g.moveTo(cx + sx * s - sx * 9, cy + sy * s);
        g.lineTo(cx + sx * s, cy + sy * s);
        g.lineTo(cx + sx * s, cy + sy * s - sy * 9);
        g.stroke();
      }
      g.globalAlpha = 0.75;
      g.fillRect(cx - 1, cy - 1, 2, 2);
      g.globalAlpha = 1;
      return;
    }
    if (kind === 'bdc') {
      // 탄도 사다리 — 거리별 조준점. 측정거리에 해당하는 눈금이 밝아진다.
      const marks = f.extra?.ballistic ?? [];
      g.beginPath();
      g.moveTo(cx - 60, cy); g.lineTo(cx - 10, cy);
      g.moveTo(cx + 10, cy); g.lineTo(cx + 60, cy);
      g.moveTo(cx, cy - 46); g.lineTo(cx, cy - 10);
      g.stroke();
      g.font = '600 9px "Chakra Petch", monospace';
      for (const m of marks) {
        const y = cy + m.drop * pxPerMil;
        const on = m.active;
        g.strokeStyle = on ? '#3dd68c' : P.ink;
        g.fillStyle = on ? '#3dd68c' : P.dim;
        g.lineWidth = on ? 1.8 : 1;
        const half = on ? 11 : 7;
        g.beginPath(); g.moveTo(cx - half, y); g.lineTo(cx + half, y); g.stroke();
        g.fillText(m.label, cx + half + 4, y + 3);
      }
      g.strokeStyle = P.ink; g.fillStyle = P.ink; g.lineWidth = 1.2;
      return;
    }
    if (kind === 'gimbal') {
      // 짐벌 추적 박스 + 진행방향 벡터
      const s = 26;
      g.strokeRect(cx - s, cy - s, s * 2, s * 2);
      g.beginPath();
      g.moveTo(cx - s - 10, cy); g.lineTo(cx - s, cy);
      g.moveTo(cx + s, cy); g.lineTo(cx + s + 10, cy);
      g.moveTo(cx, cy - s - 10); g.lineTo(cx, cy - s);
      g.moveTo(cx, cy + s); g.lineTo(cx, cy + s + 10);
      g.stroke();
      g.beginPath(); g.arc(cx, cy, 2, 0, Math.PI * 2); g.fill();
      return;
    }
    if (kind === 'gate') {
      // 레이더 거리게이트 — 지금 스윕이 훑고 있는 구간
      const gw = 120, gh = 54;
      g.setLineDash([5, 4]);
      g.strokeRect(cx - gw / 2, cy - gh / 2, gw, gh);
      g.setLineDash([]);
      g.font = '600 9px "Chakra Petch", monospace';
      this._label(g, P, 'RANGE GATE', cx - gw / 2, cy - gh / 2 - 5);
      return;
    }
    if (kind === 'bearing') {
      // 음향 방위 로즈 — 카메라가 아니라 「귀」다. 조준선 대신 방위 부채꼴.
      const R = 54;
      g.globalAlpha = 0.75;
      g.beginPath(); g.arc(cx, cy, R, 0, Math.PI * 2); g.stroke();
      for (let a = 0; a < 360; a += 30) {
        const r = (a * Math.PI) / 180;
        g.beginPath();
        g.moveTo(cx + Math.sin(r) * (R - 6), cy - Math.cos(r) * (R - 6));
        g.lineTo(cx + Math.sin(r) * R, cy - Math.cos(r) * R);
        g.stroke();
      }
      g.globalAlpha = 1;
      return;
    }
    if (kind === 'dome') {
      const R = 62;
      g.globalAlpha = 0.7;
      g.setLineDash([4, 4]);
      g.beginPath(); g.arc(cx, cy + R * 0.4, R, Math.PI, 0); g.stroke();
      g.setLineDash([]);
      g.globalAlpha = 1;
      g.beginPath(); g.arc(cx, cy, 2, 0, Math.PI * 2); g.fill();
    }
  }

  // ══════════════════════════════════════════════════════════════════════
  // 표적 브래킷
  // ══════════════════════════════════════════════════════════════════════
  _targets({ g, P, f, t: now }) {
    for (const t of f.targets ?? []) {
      const col = t.grade === '식별' ? '#3dd68c' : t.grade === '인지' ? '#e3b341' : '#ed5d5d';
      const s = Math.max(16, Math.min(96, 3200 / Math.max(60, t.d)));
      const h = s / 2, arm = Math.max(5, s / 4);

      // 잠긴 표적은 브래킷이 아니라 **게이트**가 걸린다 — 맥동하는 이중 사각과
      // 항적 번호. 나머지와 한눈에 구분되지 않으면 「무엇을 물고 있는지」가 흐려진다.
      if (t.locked) {
        const pulse = 1 + 0.06 * Math.sin(now * 6);
        const lh = h * 1.5 * pulse;
        g.strokeStyle = '#3dd68c'; g.lineWidth = 2;
        g.strokeRect(t.x - lh, t.y - lh, lh * 2, lh * 2);
        g.setLineDash([3, 3]); g.lineWidth = 1;
        g.strokeRect(t.x - lh - 5, t.y - lh - 5, lh * 2 + 10, lh * 2 + 10);
        g.setLineDash([]);
        g.beginPath();
        g.moveTo(t.x - lh - 12, t.y); g.lineTo(t.x - lh - 3, t.y);
        g.moveTo(t.x + lh + 3, t.y); g.lineTo(t.x + lh + 12, t.y);
        g.stroke();
        if (t.trackId) {
          g.font = '700 11px "Chakra Petch", monospace';
          g.fillStyle = '#3dd68c';
          g.textAlign = 'center';
          this._label(g, P, t.trackId, t.x, t.y - lh - 10, '#3dd68c');
          g.textAlign = 'left';
        }
      }

      g.strokeStyle = col; g.lineWidth = 1.7;
      for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
        g.beginPath();
        g.moveTo(t.x + sx * h - sx * arm, t.y + sy * h);
        g.lineTo(t.x + sx * h, t.y + sy * h);
        g.lineTo(t.x + sx * h, t.y + sy * h - sy * arm);
        g.stroke();
      }
      // 판정 라벨은 밝은 지형·백열 화면 위에 얹힌다 — 그림자만으로는 사라진다.
      const l1 = `${t.grade} ${fmtM(t.d)}`;
      const l2 = `Pd ${t.pd.toFixed(2)}${t.label ? ` · ${t.label}` : ''}`;
      g.font = '700 11px "Chakra Petch", monospace';
      const w1 = g.measureText(l1).width;
      g.font = '600 10px "Chakra Petch", monospace';
      const lw = Math.max(w1, g.measureText(l2).width) + 10;
      const lx = t.x + h + 6, ly = t.y - h - 2;
      g.fillStyle = 'rgba(4,7,10,0.72)';
      g.fillRect(lx - 4, ly, lw, 28);
      g.fillStyle = col;
      g.fillRect(lx - 4, ly, 2, 28);
      g.font = '700 11px "Chakra Petch", monospace';
      g.fillText(l1, lx + 2, ly + 12);
      g.font = '600 10px "Chakra Petch", monospace';
      g.fillStyle = 'rgba(232,240,246,0.85)';
      g.fillText(l2, lx + 2, ly + 24);
    }
  }

  // ══════════════════════════════════════════════════════════════════════
  // 좌상단 — 채널 식별. 「지금 어느 눈으로 보고 있는가」
  // ══════════════════════════════════════════════════════════════════════
  _topLeft({ g, P, f, t }) {
    const o = f.optic;
    const x = 14, y = 14;
    const lines = [
      { s: `${o.short} · ${f.vantage.tag ?? 'CH1'}`, c: o.color, w: '700 13px' },
      { s: f.vantage.name, c: P.text, w: '600 11.5px' },
      { s: POLARITY_LABEL[f.palette] ?? f.palette, c: P.dim, w: '600 10px' },
    ];
    this._panel(g, x, y, 224, 58);
    let yy = y + 17;
    for (const l of lines) {
      g.font = `${l.w} "Chakra Petch", monospace`;
      g.fillStyle = l.c;
      g.fillText(this._ellipsis(g, l.s, 200), x + 10, yy);
      yy += l.w.startsWith('700 13') ? 17 : 14;
    }
    // REC — 실제로 도는 초시계. 깜빡이는 점 하나가 「살아 있는 화면」을 만든다
    if (f.rec) {
      const on = Math.floor(t * 1.4) % 2 === 0;
      g.fillStyle = on ? '#ed5d5d' : 'rgba(237,93,93,0.25)';
      g.beginPath(); g.arc(x + 232, y + 12, 4.5, 0, Math.PI * 2); g.fill();
      g.font = '700 10px "Chakra Petch", monospace';
      g.fillStyle = '#ed5d5d';
      g.fillText('REC', x + 240, y + 16);
      g.fillStyle = P.dim;
      g.font = '600 10px "Chakra Petch", monospace';
      const s = Math.floor(t);
      g.fillText(`${pad2(s / 60)}:${pad2(s % 60)}`, x + 240, y + 29);
    }
  }

  /** 우상단 — 시각·좌표·관측고·배율. 사진 한 장으로 보고서가 되는 값들. */
  _topRight({ g, P, W, f }) {
    const x = W - 14, y = 14;
    g.textAlign = 'right';
    const rows = [
      [f.dtg, P.text, '700 12px'],
      [`MGRS ${toMGRS(f.cam.lon, f.cam.lat)}`, P.dim, '600 10.5px'],
      [`관측고 ${Math.round(f.cam.eyeH)}m (지반 ${Math.round(f.vantage.groundH)}m)`, P.dim, '600 10.5px'],
      [`FOV ${f.fov.toFixed(1)}° · ×${f.zoom}`, P.ink, '700 12px'],
    ];
    this._panelRight(g, x, y, 232, 4 + rows.length * 15);
    let yy = y + 17;
    for (const [s, c, w] of rows) {
      g.font = `${w} "Chakra Petch", monospace`;
      g.fillStyle = c;
      g.fillText(s, x - 10, yy);
      yy += 15;
    }
    g.textAlign = 'left';
  }

  // ══════════════════════════════════════════════════════════════════════
  // 자산별 계기 — 여기서 드론과 TOD 와 레이더가 서로 다른 화면이 된다
  // ══════════════════════════════════════════════════════════════════════
  /**
   * 계기는 **두 열**로 쌓인다 — 왼쪽은 상태(항적·열대비·조도·비행), 오른쪽은
   * 측정값(LRF). 한 카운터로 두 열을 굴리면 왼쪽 계기가 길어질수록 오른쪽
   * LRF 가 화면 한가운데까지 밀려 내려온다.
   */
  _gauges(ctx) {
    const { f } = ctx;
    const col = { left: 96, right: 96 };
    for (const gauge of f.optic.gauges ?? []) {
      const fn = this[`_g_${gauge}`];
      if (typeof fn === 'function') fn.call(this, ctx, col);
    }
    this._col = col;
  }

  /**
   * 항적 계기 — 「보인다」가 아니라 「무엇이 어디로 가고 있다」.
   *
   * 잡은 것이 없으면 잡는 법을 적는다. 계기 자리를 비워 두면 그 기능이 없는 것과
   * 같아진다 — 실물 콘솔도 대기 상태에서 「TRACK: STANDBY」를 띄운다.
   */
  _g_track({ g, P, f, t: nowS }, col) {
    const x = 14;
    const y = col.left;
    const tr = f.track;
    if (!tr) {
      this._panel(g, x, y, 268, 30);
      g.font = '600 10px "Chakra Petch", monospace';
      g.fillStyle = P.dim;
      g.fillText(f.optic.tracker ? 'TRACK · STANDBY — T 추적 개시' : 'TRACK · 수동 — T 표적 지시', x + 10, y + 14);
      g.font = '600 9px "Chakra Petch", monospace';
      g.fillText('조준선 근처 표적 클릭 또는 T', x + 10, y + 25);
      col.left = y + 38;
      return;
    }

    const lost = tr.lostS != null;
    const h = 106;
    this._panel(g, x, y, 268, h);
    // 왼쪽 색띠 — 추적 중이면 초록, 놓치는 중이면 붉게 맥동
    g.fillStyle = lost ? (Math.floor(nowS * 4) % 2 ? '#ed5d5d' : 'rgba(237,93,93,0.3)') : '#3dd68c';
    g.fillRect(x, y, 3, h);

    g.font = '700 13px "Chakra Petch", monospace';
    g.fillStyle = lost ? '#ed5d5d' : '#3dd68c';
    g.fillText(`${tr.id} ${lost ? 'LOST' : 'LOCK'}`, x + 12, y + 17);
    g.font = '600 10px "Chakra Petch", monospace';
    g.fillStyle = P.dim;
    g.fillText(lost ? `가시선 상실 ${tr.lostS.toFixed(1)}s` : `추적 ${fmtDuration(tr.holdS)}`, x + 84, y + 17);
    g.textAlign = 'right';
    g.fillText(tr.name ?? '', x + 258, y + 17);
    g.textAlign = 'left';

    const cells = [
      ['방위/거리', `${String(Math.round(tr.bearingDeg)).padStart(3, '0')}° ${fmtM(tr.distM)}`, P.text],
      ['등급', `${tr.grade}${tr.pd != null ? ` P${tr.pd.toFixed(2)}` : ''}`,
        tr.grade === '식별' ? '#3dd68c' : tr.grade === '인지' ? '#e3b341' : '#ed5d5d'],
      ['이동', tr.speedMps != null ? `${motionLabel(tr.speedMps)} ${tr.speedMps.toFixed(1)}m/s` : '판단 중', P.text],
      ['진로', tr.courseDeg != null
        ? `${compassKo(tr.courseDeg)} ${String(Math.round(tr.courseDeg)).padStart(3, '0')}°` : '—', P.text],
    ];
    cells.forEach(([k, v, c], i) => {
      const cx2 = x + 12 + (i % 2) * 130;
      const cy2 = y + 42 + Math.floor(i / 2) * 26;
      g.font = '600 9px "Chakra Petch", monospace';
      g.fillStyle = P.dim;
      g.fillText(k, cx2, cy2 - 9);
      g.font = '700 12px "Chakra Petch", monospace';
      g.fillStyle = c;
      g.fillText(v, cx2, cy2 + 5);
    });

    // GP 도달 — 이 한 줄이 「관측」을 「경보」로 바꾼다
    g.font = '600 10px "Chakra Petch", monospace';
    const eta = tr.etaToGpS;
    g.fillStyle = eta != null && eta < 600 ? '#ed5d5d' : eta != null ? '#e3b341' : P.dim;
    g.fillText(eta != null
      ? `▲ GP 도달 예상 ${fmtDuration(eta)} · 이격 ${fmtM(tr.distToGpM)}`
      : `GP 이격 ${fmtM(tr.distToGpM)} · 접근 아님`, x + 12, y + h - 8);
    col.left = y + h + 8;

    // 지금 몇 개 자산이 이 표적을 함께 잡고 있는가 — 인계의 결과가 여기 남는다
    if (tr.holders?.length) {
      const hh = 30;
      this._panel(g, x, col.left, 268, hh);
      g.font = '600 9.5px "Chakra Petch", monospace';
      g.fillStyle = P.dim;
      g.fillText('동시 접촉', x + 10, col.left + 13);
      let hx = x + 66;
      for (const hd of tr.holders.slice(0, 5)) {
        g.font = '700 10px "Chakra Petch", monospace';
        g.fillStyle = hd.color;
        g.fillText(hd.assetShort, hx, col.left + 13);
        g.font = '600 9px "Chakra Petch", monospace';
        g.fillStyle = P.dim;
        g.fillText(hd.grade, hx, col.left + 24);
        hx += 42;
      }
      col.left += hh + 8;
    }

    // 화기 사거리 진입 — 「밖이다」로는 준비를 못 한다. 몇 초 뒤에 드는지가 답이다.
    const we = f.weaponEntry;
    if (we?.length) {
      const hh = 20 + we.length * 15;
      this._panel(g, x, col.left, 268, hh);
      g.font = '600 9.5px "Chakra Petch", monospace';
      g.fillStyle = P.dim;
      g.fillText('화기 사거리', x + 10, col.left + 13);
      we.slice(0, 3).forEach((r, i) => {
        const yy = col.left + 26 + i * 15;
        g.font = '700 10.5px "Chakra Petch", monospace';
        g.fillStyle = r.color;
        g.fillText(r.name, x + 10, yy);
        g.font = '600 10px "Chakra Petch", monospace';
        g.fillStyle = r.inS === 0 ? '#3dd68c' : '#e3b341';
        g.textAlign = 'right';
        g.fillText(r.inS === 0 ? `사거리 내 ${fmtM(r.atM)}` : `${fmtDuration(r.inS)} 뒤 진입`,
          x + 258, yy);
        g.textAlign = 'left';
      });
      col.left += hh + 8;
    }
  }

  /**
   * 평면 미니맵 — 접안경 안에서는 방향 감각을 잃는다.
   *
   * 지금 이 자산이 어디를 향하고 있고, 그 부채꼴이 실효거리로 어디까지 닿고,
   * 표적과 GP 가 그 안 어디에 있는지를 위에서 한 장으로 보여 준다.
   * (레이더는 PPI 스코프가 이미 평면도라 겹치지 않는다)
   */
  _g_plan({ g, P, W, H, f }, col) {
    const R = 74, cx = W - 14 - R, cy = H - 58 - 36 - R;
    const perf = f.perf;
    const scaleM = Math.max(600, (perf?.specRange ?? 3000) * 1.1);
    const px = (m) => (m / scaleM) * R;
    const toXY = (bearingDeg, distM) => {
      const a = (bearingDeg * Math.PI) / 180;
      return [cx + Math.sin(a) * px(distM), cy - Math.cos(a) * px(distM)];
    };

    g.save();
    g.fillStyle = 'rgba(6,10,14,0.72)';
    g.strokeStyle = 'rgba(255,255,255,0.12)';
    g.beginPath(); g.arc(cx, cy, R + 8, 0, Math.PI * 2); g.fill(); g.stroke();

    // 거리환 — 1km 마다
    g.strokeStyle = 'rgba(255,255,255,0.1)';
    for (let m = 1000; m <= scaleM; m += 1000) {
      g.beginPath(); g.arc(cx, cy, px(m), 0, Math.PI * 2); g.stroke();
    }
    // 실효거리 부채꼴 — 지금 보고 있는 방향과 그 도달 범위
    if (perf) {
      const half = Math.min(180, (f.optic.spec?.fov ?? 90) / 2);
      const a0 = ((f.cam.az - half - 90) * Math.PI) / 180;
      const a1 = ((f.cam.az + half - 90) * Math.PI) / 180;
      g.fillStyle = `${f.optic.color}22`;
      g.beginPath(); g.moveTo(cx, cy); g.arc(cx, cy, px(perf.range), a0, a1); g.closePath(); g.fill();
      g.strokeStyle = f.optic.color;
      g.setLineDash([3, 3]);
      g.beginPath(); g.arc(cx, cy, px(perf.specRange), a0, a1); g.stroke();
      g.setLineDash([]);
    }
    // 현재 시야 (배율에 따라 좁아진다)
    const hf = f.fov / 2;
    g.strokeStyle = 'rgba(255,255,255,0.75)'; g.lineWidth = 1;
    for (const d of [-hf, hf]) {
      const a = ((f.cam.az + d) * Math.PI) / 180;
      g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + Math.sin(a) * R, cy - Math.cos(a) * R); g.stroke();
    }
    // GP
    if (f.plan?.gp) {
      const [gx, gy] = toXY(f.plan.gp.bearingDeg, Math.min(scaleM, f.plan.gp.distM));
      g.fillStyle = '#f2a33c';
      g.beginPath(); g.moveTo(gx, gy - 5); g.lineTo(gx + 4, gy + 3); g.lineTo(gx - 4, gy + 3);
      g.closePath(); g.fill();
    }
    // 표적들 — 잠긴 것은 크게
    for (const t of f.plan?.contacts ?? []) {
      if (t.distM > scaleM) continue;
      const [tx, ty] = toXY(t.bearingDeg, t.distM);
      g.fillStyle = t.locked ? '#3dd68c' : '#ed5d5d';
      g.beginPath(); g.arc(tx, ty, t.locked ? 4 : 2.6, 0, Math.PI * 2); g.fill();
      if (t.courseDeg != null && t.speedMps > 0.2) {
        const a = (t.courseDeg * Math.PI) / 180;
        const len = 8 + Math.min(14, t.speedMps * 3);
        g.strokeStyle = g.fillStyle; g.lineWidth = 1.4;
        g.beginPath(); g.moveTo(tx, ty);
        g.lineTo(tx + Math.sin(a) * len, ty - Math.cos(a) * len); g.stroke();
      }
    }
    // 예측 진로 — 지금 속도로 계속 가면 60초 뒤 어디
    const pr = f.plan?.predict;
    if (pr) {
      const [px0, py0] = toXY(pr.fromBearingDeg, pr.fromDistM);
      const [px1, py1] = toXY(pr.toBearingDeg, Math.min(scaleM, pr.toDistM));
      g.strokeStyle = 'rgba(237,93,93,0.85)';
      g.lineWidth = 1.4;
      g.setLineDash([4, 3]);
      g.beginPath(); g.moveTo(px0, py0); g.lineTo(px1, py1); g.stroke();
      g.setLineDash([]);
      g.fillStyle = 'rgba(237,93,93,0.85)';
      g.beginPath(); g.arc(px1, py1, 2.4, 0, Math.PI * 2); g.fill();
      g.font = '600 8px "Chakra Petch", monospace';
      g.fillText('+60s', px1 + 4, py1 + 3);
    }

    // 조명 반경
    for (const fl of f.plan?.flares ?? []) {
      const [fx, fy] = toXY(fl.bearingDeg, fl.distM);
      g.strokeStyle = `rgba(255,224,138,${(0.35 + 0.5 * fl.intensity).toFixed(2)})`;
      g.setLineDash([2, 3]);
      g.beginPath(); g.arc(fx, fy, px(fl.radiusM), 0, Math.PI * 2); g.stroke();
      g.setLineDash([]);
      g.fillStyle = '#ffe08a';
      g.beginPath(); g.arc(fx, fy, 2.4, 0, Math.PI * 2); g.fill();
    }
    // 자기 자신 + 북
    g.fillStyle = P.ink;
    g.beginPath(); g.arc(cx, cy, 2.6, 0, Math.PI * 2); g.fill();
    g.font = '700 9px "Chakra Petch", monospace';
    g.fillStyle = P.dim;
    g.textAlign = 'center';
    g.fillText('N', cx, cy - R - 12);
    g.fillText(`${(scaleM / 1000).toFixed(1)}km`, cx, cy + R + 18);
    g.textAlign = 'left';
    g.restore();
  }

  /** 레이저 거리측정 — 조준선이 닿은 지점까지의 실제 지형 거리 */
  _g_lrf({ g, P, f, W }, col) {
    const l = f.lrf;
    const x = W - 14;
    const y = col.right;
    g.textAlign = 'right';
    this._panelRight(g, x, y, 232, l ? 62 : 30);
    g.font = '600 10px "Chakra Petch", monospace';
    g.fillStyle = P.dim;
    g.fillText(l ? 'LRF · 조준점 실측' : 'LRF · READY (L)', x - 10, y + 15);
    if (l) {
      g.font = '700 20px "Chakra Petch", monospace';
      g.fillStyle = '#3dd68c';
      g.fillText(fmtM(l.dist), x - 10, y + 37);
      g.font = '600 10px "Chakra Petch", monospace';
      g.fillStyle = P.dim;
      g.fillText(`표고 ${Math.round(l.h)}m · Δ${l.h - f.cam.eyeH >= 0 ? '+' : ''}${Math.round(l.h - f.cam.eyeH)}m`,
        x - 10, y + 52);
      g.fillText(toMGRS(l.lon, l.lat), x - 118, y + 52);
    }
    g.textAlign = 'left';
    col.right = y + (l ? 70 : 38);
  }

  /** 열상 전용 — 열대비·이득·NUC 잔여 */
  _g_thermal({ g, P, f }, col) {
    const a = f.atm;
    if (!a) return;
    const x = 14;
    const y = col.left;
    this._panel(g, x, y, 224, 46);
    g.font = '600 10px "Chakra Petch", monospace';
    g.fillStyle = P.dim;
    g.fillText('열대비 ΔT / LWIR 소광비', x + 10, y + 15);
    g.font = '700 13px "Chakra Petch", monospace';
    const cold = a.deltaT < 1.4;
    g.fillStyle = cold ? '#ed5d5d' : a.deltaT < 2.6 ? '#e3b341' : '#3dd68c';
    g.fillText(`ΔT ${a.deltaT.toFixed(1)}K`, x + 10, y + 32);
    g.fillStyle = P.text;
    g.font = '600 11px "Chakra Petch", monospace';
    g.fillText(`k ${a.lwirRatio.toFixed(2)} · AGC ${cold ? 'HIGH' : 'AUTO'}`, x + 92, y + 32);
    g.font = '600 9.5px "Chakra Petch", monospace';
    g.fillStyle = P.dim;
    g.fillText(cold ? '열평형 — 표적 대비 소실 위험' : '열대비 확보', x + 10, y + 43);
    col.left = y + 54;
  }

  /** EO·육안 전용 — 조도와 증폭단 */
  _g_light({ g, P, f }, col) {
    const a = f.atm;
    if (!a) return;
    const x = 14;
    const y = col.left;
    this._panel(g, x, y, 224, 44);
    g.font = '600 10px "Chakra Petch", monospace';
    g.fillStyle = P.dim;
    g.fillText('조도 / 가시거리', x + 10, y + 15);
    const lux = a.lux;
    const lvl = lux < 0.01 ? '무월광' : lux < 1 ? '월광' : lux < 100 ? '박명' : lux < 5000 ? '흐림' : '주간';
    g.font = '700 13px "Chakra Petch", monospace';
    g.fillStyle = lux < 1 ? '#ed5d5d' : lux < 200 ? '#e3b341' : '#3dd68c';
    g.fillText(`${lux < 1 ? lux.toFixed(3) : Math.round(lux)} lx`, x + 10, y + 32);
    g.fillStyle = P.text;
    g.font = '600 11px "Chakra Petch", monospace';
    g.fillText(`${lvl} · 시정 ${fmtM(a.visibilityMeters)}`, x + 92, y + 32);
    col.left = y + 52;
  }

  /** 드론 전용 — 비행 계기 한 줄. 고도·속도·배터리·짐벌 */
  _g_flight({ g, P, f }, col) {
    const fl = f.extra?.flight;
    if (!fl) return;
    const x = 14;
    const y = col.left;
    this._panel(g, x, y, 268, 92);
    g.font = '600 10px "Chakra Petch", monospace';
    g.fillStyle = P.dim;
    g.fillText('비행 계기 · UAS-01', x + 10, y + 15);
    const cells = [
      ['AGL', `${Math.round(fl.aglM)}m`, P.ink],
      ['해발', `${Math.round(fl.mslM)}m`, P.text],
      ['대지속도', `${fl.gsMps.toFixed(1)}m/s`, P.text],
      ['궤도R', `${Math.round(fl.orbitR)}m`, P.dim],
      ['짐벌', `${fl.gimbal.toFixed(0)}°`, P.text],
      ['기수', `${String(Math.round(az360(fl.heading))).padStart(3, '0')}°`, P.text],
    ];
    cells.forEach(([k, v, c], i) => {
      const cx2 = x + 10 + (i % 3) * 86;
      const cy2 = y + 34 + Math.floor(i / 3) * 26;
      g.font = '600 9px "Chakra Petch", monospace';
      g.fillStyle = P.dim;
      g.fillText(k, cx2, cy2 - 10);
      g.font = '700 13px "Chakra Petch", monospace';
      g.fillStyle = c;
      g.fillText(v, cx2, cy2 + 4);
    });
    // 배터리 — 남은 체공이 곧 남은 관측시간이다
    const bx = x + 10, by = y + 82, bw = 248;
    g.fillStyle = 'rgba(255,255,255,0.14)';
    g.fillRect(bx, by, bw, 4);
    const bcol = fl.battery > 0.4 ? '#3dd68c' : fl.battery > 0.18 ? '#e3b341' : '#ed5d5d';
    g.fillStyle = bcol;
    g.fillRect(bx, by, bw * fl.battery, 4);
    g.font = '600 9px "Chakra Petch", monospace';
    g.fillStyle = bcol;
    g.fillText(`BATT ${Math.round(fl.battery * 100)}% · 잔여체공 ${Math.round(fl.endureMin)}분`, bx, by - 3);
    col.left = y + 100;
  }

  /** 드론 전용 — 데이터링크 품질 */
  _g_link({ g, P, f }, col) {
    const l = f.extra?.link;
    if (!l) return;
    const x = 14;
    const y = col.left;
    this._panel(g, x, y, 268, 34);
    g.font = '600 9.5px "Chakra Petch", monospace';
    g.fillStyle = P.dim;
    g.fillText('DATALINK', x + 10, y + 14);
    const bars = 5;
    for (let i = 0; i < bars; i++) {
      const on = i < Math.round(l.quality * bars);
      g.fillStyle = on ? (l.quality > 0.5 ? '#3dd68c' : '#e3b341') : 'rgba(255,255,255,0.15)';
      g.fillRect(x + 74 + i * 8, y + 16 - i * 2.4 - 2, 5, 4 + i * 2.4);
    }
    g.font = '600 10px "Chakra Petch", monospace';
    g.fillStyle = P.text;
    g.fillText(`${l.latencyMs}ms · ${l.mbps.toFixed(1)}Mbps · ${l.jam ? '재밍 감지' : 'CLEAR'}`, x + 124, y + 15);
    g.font = '600 9px "Chakra Petch", monospace';
    g.fillStyle = P.dim;
    g.fillText(`통제소 이격 ${fmtM(l.rangeM)}`, x + 10, y + 28);
    col.left = y + 42;
  }

  /** 레이더 전용 — 화면 안에 PPI 스코프를 띄운다 */
  _g_ppi({ g, P, f, W, H }, col) {
    const p = f.extra?.ppi;
    if (!p) return;
    // 스코프 원점(cy)은 부채꼴의 **아래 꼭짓점**이다 — 스코프는 여기서 위로 자란다.
    const R = 96, cx = 24 + R, cy = H - 110;
    g.save();
    g.fillStyle = 'rgba(4,18,10,0.88)';
    g.strokeStyle = 'rgba(61,214,140,0.35)';
    g.beginPath(); g.arc(cx, cy, R + 10, Math.PI, 0); g.closePath(); g.fill(); g.stroke();
    const half = Math.min(90, p.fov / 2);
    g.strokeStyle = 'rgba(61,214,140,0.3)';
    for (let i = 1; i <= 4; i++) {
      g.beginPath();
      g.arc(cx, cy, (R * i) / 4, ((p.aim - half - 90) * Math.PI) / 180, ((p.aim + half - 90) * Math.PI) / 180);
      g.stroke();
    }
    // 실효거리 한계호 — 청천 제원 대비 지금 어디까지인지
    if (p.effR < p.specR * 0.99) {
      g.strokeStyle = '#e3b341'; g.setLineDash([5, 4]);
      g.beginPath();
      g.arc(cx, cy, R * (p.effR / p.specR), ((p.aim - half - 90) * Math.PI) / 180,
        ((p.aim + half - 90) * Math.PI) / 180);
      g.stroke(); g.setLineDash([]);
    }
    this._sweep += 1.9;
    if (this._sweep > half) this._sweep = -half;
    const sw = ((p.aim + this._sweep - 90) * Math.PI) / 180;
    const grad = g.createLinearGradient(cx, cy, cx + R * Math.cos(sw), cy + R * Math.sin(sw));
    grad.addColorStop(0, 'rgba(61,214,140,0.05)');
    grad.addColorStop(1, 'rgba(61,214,140,0.95)');
    g.strokeStyle = grad; g.lineWidth = 2;
    g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + R * Math.cos(sw), cy + R * Math.sin(sw)); g.stroke();
    // 블립 — 스윕이 지나갈 때만 새로 찍히고 서서히 사라진다
    this._blips = this._blips.filter((b) => (b.a -= 0.01) > 0);
    for (const t of p.contacts ?? []) {
      if (Math.abs(((t.az - (p.aim + this._sweep) + 540) % 360) - 180) < 3) {
        this._blips.push({ az: t.az, d: t.d, a: 1 });
      }
    }
    for (const b of this._blips) {
      const r = ((b.az - 90) * Math.PI) / 180;
      const rr = R * Math.min(1, b.d / p.specR);
      g.fillStyle = `rgba(140,255,190,${b.a.toFixed(2)})`;
      g.beginPath(); g.arc(cx + rr * Math.cos(r), cy + rr * Math.sin(r), 3.2, 0, Math.PI * 2); g.fill();
    }
    g.font = '600 9.5px "Chakra Petch", monospace';
    g.fillStyle = '#3dd68c';
    g.fillText(`PPI ${(p.specR / 1000).toFixed(0)}km · ${Math.round(p.aim)}° ±${Math.round(half)}°`, cx - R, cy + 20);
    g.fillStyle = p.clutterDb > 1 ? '#e3b341' : 'rgba(61,214,140,0.65)';
    g.fillText(p.clutterDb > 0.3
      ? `클러터 +${p.clutterDb.toFixed(1)}dB · 감쇠 ${p.gammaDbPerKm.toFixed(3)}dB/km`
      : '전천후 — 대기 영향 없음', cx - R, cy + 33);
    g.restore();
  }

  /** 음향 전용 — 방위별 수신강도 워터폴 */
  _g_audio({ g, P, f, H }, col) {
    const a = f.extra?.audio;
    if (!a) return;
    const x = 14, w = 268, h = 74, top = H - 196;
    this._panel(g, x, top, w, h + 18);
    g.font = '600 9.5px "Chakra Petch", monospace';
    g.fillStyle = P.dim;
    g.fillText('음향 방위 워터폴 · 풍잡음 마스킹', x + 10, top + 14);
    this._wf.push(a.bins);
    if (this._wf.length > h) this._wf.shift();
    for (let r = 0; r < this._wf.length; r++) {
      const row = this._wf[this._wf.length - 1 - r];
      for (let c = 0; c < row.length; c++) {
        const v = row[c];
        if (v < 0.05) continue;
        g.fillStyle = v > 0.65 ? `rgba(255,213,79,${v.toFixed(2)})` : `rgba(120,190,255,${(v * 0.8).toFixed(2)})`;
        g.fillRect(x + 10 + (c * (w - 20)) / row.length, top + 20 + r, (w - 20) / row.length, 1);
      }
    }
    g.fillStyle = P.dim;
    g.font = '600 9px "Chakra Petch", monospace';
    g.fillText('000°', x + 10, top + h + 15);
    g.fillText('180°', x + w / 2 - 10, top + h + 15);
    g.fillText('359°', x + w - 34, top + h + 15);
  }

  /** 재머 전용 — 대역별 출력 */
  _g_rf({ g, P, f }, col) {
    const r = f.extra?.rf;
    if (!r) return;
    const x = 14;
    const y = col.left;
    this._panel(g, x, y, 240, 62);
    g.font = '600 9.5px "Chakra Petch", monospace';
    g.fillStyle = P.dim;
    g.fillText('RF 재밍 대역 · 차단 반구', x + 10, y + 14);
    r.bands.forEach((b, i) => {
      const bx = x + 12 + i * 56;
      g.fillStyle = 'rgba(255,255,255,0.12)';
      g.fillRect(bx, y + 22, 44, 22);
      g.fillStyle = b.on ? '#63dfff' : 'rgba(99,223,255,0.2)';
      g.fillRect(bx, y + 22 + 22 * (1 - b.level), 44, 22 * b.level);
      g.font = '600 9px "Chakra Petch", monospace';
      g.fillStyle = P.text;
      g.fillText(b.label, bx + 2, y + 55);
    });
    col.left = y + 70;
  }

  /** 조준경 전용 — 탄도 제원 요약 */
  _g_ballistic({ g, P, f }, col) {
    const b = f.extra?.fire;
    if (!b) return;
    const x = 14;
    const y = col.left;
    this._panel(g, x, y, 224, 46);
    g.font = '600 9.5px "Chakra Petch", monospace';
    g.fillStyle = P.dim;
    g.fillText('사격 제원', x + 10, y + 14);
    g.font = '700 13px "Chakra Petch", monospace';
    g.fillStyle = b.inRange ? '#3dd68c' : '#ed5d5d';
    g.fillText(b.inRange ? '사거리 내' : '사거리 초과', x + 10, y + 31);
    g.font = '600 10px "Chakra Petch", monospace';
    g.fillStyle = P.text;
    g.fillText(`고각 ${b.mil}밀 · 편류 ${b.drift}밀`, x + 96, y + 31);
    g.fillStyle = P.dim;
    g.font = '600 9px "Chakra Petch", monospace';
    g.fillText(`유효사거리 ${fmtM(b.maxM)} · 비행 ${b.tofS}s`, x + 10, y + 42);
    col.left = y + 54;
  }

  /** 환경 한 줄 — 지금 이 화면이 왜 이렇게 보이는지의 이유 */
  _g_env({ g, P, f, H }, col) {
    const a = f.atm;
    if (!a) return;
    // 좌하단은 PPI 스코프·음향 워터폴이 쓰는 자리다 — 있으면 그 옆으로 비켜선다
    const wide = f.optic.gauges?.some((g2) => g2 === 'ppi' || g2 === 'audio');
    const x = wide ? 246 : 14;
    const yy = H - 62;
    g.font = '600 10.5px "Chakra Petch", monospace';
    const s = `${a.weatherLabel} · ${a.temperatureC.toFixed(0)}℃ · 풍 ${a.windMps.toFixed(1)}m/s`
      + `${a.precipitation !== 'none' ? ` · 강수 ${a.precipitationRate.toFixed(1)}mm/h` : ''}`
      + `${a.snowCover > 0.05 ? ` · 적설 ${Math.round(a.snowCover * 100)}%` : ''}`;
    this._label(g, P, s, x, yy, P.dim);
  }

  /** 우하단 유효거리 막대 — 「청천이었으면 봤을 거리」와 지금의 차이 */
  _perfBar({ g, P, f, W, H }) {
    const p = f.perf;
    if (!p) return;
    const w = 250, x = W - w - 14, y = H - 58;
    this._panel(g, x, y, w, 46);
    const bx = x + 12, bw = w - 24, by = y + 26;
    g.fillStyle = 'rgba(255,255,255,0.14)';
    g.fillRect(bx, by, bw, 5);
    g.fillStyle = VERDICT_COLOR[p.verdict];
    g.fillRect(bx, by, bw * Math.min(1, p.factor), 5);
    g.font = '600 10px "Chakra Petch", monospace';
    g.fillStyle = P.text;
    g.fillText(`실효 ${fmtM(p.range)}`, bx, y + 17);
    g.fillStyle = P.dim;
    g.textAlign = 'right';
    g.fillText(`청천 ${fmtM(p.specRange)} (${Math.round(p.factor * 100)}%)`, bx + bw, y + 17);
    g.textAlign = 'left';
    g.font = '600 9.5px "Chakra Petch", monospace';
    g.fillStyle = VERDICT_COLOR[p.verdict];
    g.fillText(`제한: ${p.limiter}`, bx, y + 42);
    g.fillStyle = P.dim;
    g.textAlign = 'right';
    g.fillText(`D${fmtM(p.dri[0])} R${fmtM(p.dri[1])} I${fmtM(p.dri[2])}`, bx + bw, y + 42);
    g.textAlign = 'left';
  }

  // ── 잔손질 ────────────────────────────────────────────────────────────
  _panel(g, x, y, w, h) {
    g.fillStyle = 'rgba(6,10,14,0.62)';
    g.fillRect(x, y, w, h);
    g.strokeStyle = 'rgba(255,255,255,0.1)';
    g.lineWidth = 1;
    g.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
  }

  _panelRight(g, x, y, w, h) { this._panel(g, x - w, y, w, h); }

  /** 배경이 무엇이든 읽히는 글자 — 열상 화면은 밝기가 매 프레임 뒤집힌다 */
  _label(g, P, s, x, y, color) {
    g.save();
    g.shadowColor = P.halo ?? 'rgba(0,0,0,0.85)';
    g.shadowBlur = 4;
    g.fillStyle = color ?? P.text ?? '#fff';
    g.fillText(s, x, y);
    g.restore();
  }

  _ellipsis(g, s, max) {
    if (g.measureText(s).width <= max) return s;
    let out = s;
    while (out.length > 4 && g.measureText(`${out}…`).width > max) out = out.slice(0, -1);
    return `${out}…`;
  }
}
