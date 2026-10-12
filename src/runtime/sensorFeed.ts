// @ts-nocheck
/**
 * 센서 피드 — 감시자산의 「눈」을 여러 창으로 동시에
 *
 *  ufs-physical-ai-operations-repo 의 DigitalTwinMap 온보드 리그(자산별 카메라 +
 *  드래그 슬루 + HUD)를 Cesium 문법으로 옮긴 뒤, GP Digital Twin 쪽에서 세 가지를 더했다:
 *
 *  ① **다중 창** — 최대 4창. 관제실처럼 EO·IR·레이더를 나란히 놓고 같은 표적이
 *     어느 채널에서 보이고 어느 채널에서 사라지는지 한눈에 비교한다. 2×2 타일링.
 *  ② **날씨가 화면에 산다** — 피드 뷰어를 환경 컨트롤러에 붙여 안개·조도·태양을
 *     본 화면과 동일하게 받고, 그 위에 파장대별 감쇠 베일과 강수 입자를 얹는다.
 *     EO 는 눈 속에서 하얗게 지워지고 IR 은 덜 지워진다 — 같은 순간, 옆 창에서.
 *  ③ **자동 표적 판정** — 침투 유닛이 시야각·유효거리·지형 LOS 를 모두 통과하면
 *     브래킷이 걸리고 D/R/I 등급과 탐지확률이 붙는다. 「보인다」가 주장이 아니라
 *     화면 위의 판정이 된다.
 *
 *  레이더는 PPI 스코프(2D)로 남는다 — 강수 체적클러터가 링으로 들어온다.
 *
 *  진입점: 감시 탭 목록의 📹, 지도 자산 클릭 팝업, 그리고 창 하단 소스 칩.
 */
import { SITE } from './data';
import { offset, distM, azimuthDeg, azDelta } from './geo';
import { MOUNTS } from './sensorModels';
import { losClear } from './siteOptimizer';
import { POST_TYPE } from './sensorPosts';
import { detectionProbability, atmosphereOf, fmtM, VERDICT_COLOR } from './sensorPerformance';
import { VWORLD_KEY } from './map';
import { opticForPostType, opticForMount, fovAtZoom } from './opticProfile';
import { toMGRS } from './mgrs';
import { formatClock, monthDayOf } from './environmentModel';
import { svgIcon } from './icons';

const MAX_WINDOWS = 6;   // 관제벽 — 3×2
const SLEW_YAW = 60, SLEW_UP = 12, SLEW_DN = 25;

/** 피드 종류별 표현 규약 */
const FEED_KIND = {
  eo: { cls: 'sf-eo', fov: 42, label: 'EO', band: 'vis', optic: 'eo' },
  ir: { cls: 'sf-ir', fov: 30, label: 'TOD', band: 'lwir', optic: 'tod' },
  gun: { cls: 'sf-gun', fov: 24, label: '조준경', band: 'eye', reticle: true, optic: 'gun' },
  ppi: { ppi: true, label: 'PPI', band: 'radar', optic: 'gsr' },
  drone: { cls: 'sf-eo', fov: 50, label: '드론', band: 'vis', drone: true, optic: 'drone' },
};

/** 화면 극성 — CSS 필터 한 줄로 채널 성격이 바뀐다 (창은 작고 여러 개다) */
const PALETTE_CLASS = { wh: 'pal-wh', bh: 'pal-bh', nvg: 'pal-nvg', vis: '' };
const PALETTE_LABEL = { wh: 'W-HOT', bh: 'B-HOT', nvg: 'I²', vis: 'DAY' };

/** 레거시 진입점(mapInspector 의 MOUNTS 키) → 피드 종류 */
const LEGACY_FEED = { eo: 'eo', ir: 'ir', weapon: 'gun', radar: 'ppi', drone: 'drone' };

let WSEQ = 0;

// ═══════════════════════════════════════════════════════════════════════════
// 창 하나
// ═══════════════════════════════════════════════════════════════════════════
class FeedWindow {
  constructor(mgr, source) {
    this.mgr = mgr;
    this.id = `fw${++WSEQ}`;
    this.viewerFeed = null;
    this.yaw = 0; this.pitch = -6; this.fov = 42;
    this.orbit = 0;
    this.scan = false;
    this.scanDir = 1;
    this.flakes = [];
    this._buildDom();
    this.setSource(source);
  }

  get state() { return this.mgr.ctx.state; }

  // ── DOM ───────────────────────────────────────────────────────────────
  _buildDom() {
    const el = document.createElement('div');
    el.className = 'fw';
    el.dataset.id = this.id;
    el.innerHTML = `
      <div class="fw-head">
        <span class="fw-ch"></span>
        <span class="fw-band"></span>
        <span class="fw-title">센서 피드</span>
        <span class="fw-rec">● REC</span>
        <button class="fw-btn fw-max" title="이 채널만 크게">⤢</button>
        <button class="fw-btn fw-tile" title="관제벽 정렬">⌗</button>
        <button class="fw-btn fw-close" title="닫기" aria-label="닫기">✕</button>
      </div>
      <div class="fw-body">
        <div class="fw-view"></div>
        <canvas class="fw-ppi" width="360" height="230"></canvas>
        <canvas class="fw-hud"></canvas>
        <div class="fw-cross">+</div>
        <div class="fw-ret hidden"></div>
        <div class="fw-info">—</div>
        <div class="fw-perf">—</div>
      </div>
      <div class="fw-foot">
        <button class="fw-sbtn fw-zoom" title="배율 단 (휠로도 됩니다)">×1</button>
        <button class="fw-sbtn fw-pol" title="화면 극성 (백열/흑열)">W-HOT</button>
        <span class="fw-chips"></span>
        <button class="fw-sbtn fw-scan" title="지향 자동 주사">↔ 스캔</button>
        <button class="fw-sbtn fw-reset" title="더블클릭도 됩니다">초기화</button>
      </div>
      <div class="fw-grip"></div>`;
    this.el = el;
    this.mgr.deck.appendChild(el);

    this.viewEl = el.querySelector('.fw-view');
    this.ppiEl = el.querySelector('.fw-ppi');
    this.hudEl = el.querySelector('.fw-hud');
    this.infoEl = el.querySelector('.fw-info');
    this.perfEl = el.querySelector('.fw-perf');

    el.querySelector('.fw-close').onclick = () => this.mgr.closeWindow(this.id);
    el.querySelector('.fw-tile').onclick = () => this.mgr.tile();
    el.querySelector('.fw-max').onclick = () => this.mgr.maximize(this.id);
    el.querySelector('.fw-reset').onclick = () => this.resetView();
    el.querySelector('.fw-zoom').onclick = () => this.stepZoom(1);
    el.querySelector('.fw-pol').onclick = () => this.togglePolarity();
    const scanBtn = el.querySelector('.fw-scan');
    scanBtn.onclick = () => {
      this.scan = !this.scan;
      scanBtn.classList.toggle('on', this.scan);
    };
    el.addEventListener('pointerdown', () => this.mgr.focus(this.id), true);

    // 헤더 드래그 이동 — 누르자마자 캡처하면 ✕ 바로 옆에서 눌러 살짝 움직인 뒤 ✕ 위에서
    // 뗀 클릭까지 드래그로 먹혀 창이 안 닫힌다(managePanel과 같은 실측 재현) — 실제
    // 움직임(4px)이 확인된 뒤에야 캡처해 클릭과 드래그를 가른다.
    const head = el.querySelector('.fw-head');
    let drag = null;
    head.addEventListener('pointerdown', (e) => {
      if (e.target.closest('.fw-btn')) return;
      drag = {
        x: e.clientX - el.offsetLeft, y: e.clientY - el.offsetTop,
        startX: e.clientX, startY: e.clientY, pid: e.pointerId, moved: false,
      };
    });
    head.addEventListener('pointermove', (e) => {
      if (!drag) return;
      if (!drag.moved) {
        if (Math.abs(e.clientX - drag.startX) + Math.abs(e.clientY - drag.startY) < 4) return;
        drag.moved = true;
        head.setPointerCapture(drag.pid);
      }
      // 화면 밖으로 완전히 밀어내면 창이 「사라진 것」과 같아진다 — 헤더 한 조각은
      // 항상 지도 영역(offsetParent — style.left/top 가 실제로 놓이는 좌표계) 안에
      // 남겨 다시 잡을 수 있게 한다. window.innerWidth 는 사이드바까지 포함한 뷰포트
      // 전체 폭이라 이 좌표계와 안 맞는다(사이드바 폭만큼 어긋나 화면 밖으로 샌다).
      const parent = el.offsetParent ?? el.parentElement;
      const maxL = Math.max(0, parent.clientWidth - head.offsetWidth);
      const maxT = Math.max(0, parent.clientHeight - head.offsetHeight);
      el.style.left = `${Math.min(maxL, Math.max(0, e.clientX - drag.x))}px`;
      el.style.top = `${Math.min(maxT, Math.max(0, e.clientY - drag.y))}px`;
      el.style.right = 'auto'; el.style.bottom = 'auto';
    });
    head.addEventListener('pointerup', () => { drag = null; });

    // 우하단 그립 리사이즈
    const grip = el.querySelector('.fw-grip');
    let rz = null;
    grip.addEventListener('pointerdown', (e) => {
      rz = { x: e.clientX, y: e.clientY, w: el.offsetWidth, h: el.offsetHeight };
      grip.setPointerCapture(e.pointerId);
      e.stopPropagation();
    });
    grip.addEventListener('pointermove', (e) => {
      if (!rz) return;
      el.style.width = `${Math.max(240, rz.w + e.clientX - rz.x)}px`;
      el.style.height = `${Math.max(200, rz.h + e.clientY - rz.y)}px`;
      this.resize();
    });
    grip.addEventListener('pointerup', () => { rz = null; this.resize(); });

    // 슬루 · 배율 · 초기화
    const v = el.querySelector('.fw-body');
    let slew = null;
    v.addEventListener('pointerdown', (e) => {
      if (e.target === grip) return;
      slew = { x: e.clientX, y: e.clientY, yaw: this.yaw, pitch: this.pitch };
      v.setPointerCapture(e.pointerId);
    });
    v.addEventListener('pointermove', (e) => {
      if (!slew) return;
      this.scan = false;
      el.querySelector('.fw-scan').classList.remove('on');
      const s = 0.16 * (this.fov / 42);
      this.yaw = Math.max(-SLEW_YAW, Math.min(SLEW_YAW, slew.yaw + (e.clientX - slew.x) * s));
      this.pitch = Math.max(-SLEW_DN, Math.min(SLEW_UP, slew.pitch - (e.clientY - slew.y) * s));
    });
    v.addEventListener('pointerup', () => { slew = null; });
    v.addEventListener('dblclick', () => this.resetView());
    // 실물 광학은 연속 줌이 아니다 — 단을 넘긴다(딸깍). 배율이 화면에 숫자로 남는다.
    v.addEventListener('wheel', (e) => {
      e.preventDefault();
      this.stepZoom(e.deltaY > 0 ? -1 : 1);
    }, { passive: false });
  }

  /**
   * source: { kind:'post', uid } | { kind:'drone' }
   */
  setSource(source) {
    this.source = source;
    const info = this.resolve();
    this.kind = FEED_KIND[info.feed] ?? FEED_KIND.eo;
    this.optic = info.optic;
    this.manualPalette = null;
    this.zoomIdx = 0;
    this.resetView();
    this.el.querySelector('.fw-title').innerHTML = info.title;
    this.el.querySelector('.fw-ch').textContent = info.tag;
    const band = this.el.querySelector('.fw-band');
    band.textContent = this.kind.label;
    band.style.color = info.color;
    band.style.borderColor = info.color;
    const focused = this.el.classList.contains('focus');
    this.el.className = `fw ${this.kind.cls ?? ''}${focused ? ' focus' : ''}`;
    this._paintControls();
    this.viewEl.style.display = this.kind.ppi ? 'none' : '';
    this.ppiEl.style.display = this.kind.ppi ? '' : 'none';
    // 조준선은 캔버스가 광학별로 그린다 — DOM 십자는 남겨 두면 두 겹이 된다
    this.el.querySelector('.fw-ret').classList.add('hidden');
    this.el.querySelector('.fw-cross').classList.add('hidden');
    this.el.querySelector('.fw-scan').style.display = this.kind.ppi || this.kind.drone ? 'none' : '';
    if (!this.kind.ppi) this._ensureViewer();
    this._renderChips();
    this.resize();
  }

  /** 현재 소스의 위치·지향·성능을 푼다 */
  resolve() {
    const st = this.state;
    if (this.source.kind === 'drone') {
      return {
        feed: 'drone', title: `${svgIcon('drone')} 정찰드론 짐벌`, color: '#63dfff',
        lon: SITE.gp.lon, lat: SITE.gp.lat, eyeH: (st.ents?.groundH ?? 0) + 260,
        aimAz: SITE.sector.centerAz, fov: 50, perf: null, post: null,
        optic: opticForMount('drone'), tag: 'UAS-01',
      };
    }
    const post = st.posts?.get(this.source.uid);
    // 발전기에는 화면이 없다 — 피드 소스가 될 수 없다
    if (post && POST_TYPE[post.type]?.genW) {
      return {
        feed: 'eo', title: '채널 없음 (발전기)', color: '#5c6b7a',
        lon: post.lon, lat: post.lat, eyeH: st.posts.eyeH(post),
        aimAz: 0, fov: 90, perf: null, post: null,
        optic: opticForMount('eo'), tag: 'CH—',
      };
    }
    if (post) {
      const t = POST_TYPE[post.type];
      const perf = st.posts.perfOf(post);
      return {
        feed: t.feed === 'none' ? 'eo' : t.feed,
        title: `${t.icon} ${post.name} — ${t.name}`,
        color: t.color,
        lon: post.lon, lat: post.lat, eyeH: st.posts.eyeH(post),
        aimAz: post.aimAz, fov: t.fov, perf, post, type: t,
        optic: opticForPostType(post.type), tag: `${t.short}-${post.uid.replace('sp', '')}`,
      };
    }
    // 레거시: MOUNTS 키
    const key = this.source.uid;
    const mk = MOUNTS[key];
    if (mk) {
      const q = offset(SITE.gp.lon, SITE.gp.lat, mk.az, mk.dist);
      return {
        feed: LEGACY_FEED[key] ?? 'eo', title: `${svgIcon('video')} ${key.toUpperCase()} 거치대`, color: '#f2a33c',
        lon: q.lon, lat: q.lat,
        eyeH: (st.assets?.mounts?.heights?.get(key) ?? st.ents.groundH) + 9,
        aimAz: mk.aimAz ?? mk.heading?.() ?? SITE.sector.centerAz,
        fov: 90, perf: null, post: null,
        optic: opticForMount(key), tag: key.toUpperCase(),
      };
    }
    return {
      feed: 'eo', title: '센서 피드 (소스 없음)', color: '#5c6b7a',
      lon: SITE.gp.lon, lat: SITE.gp.lat, eyeH: (st.ents?.groundH ?? 0) + 12,
      aimAz: SITE.sector.centerAz, fov: 90, perf: null, post: null,
      optic: opticForMount('eo'), tag: 'CH—',
    };
  }

  _renderChips() {
    const wrap = this.el.querySelector('.fw-chips');
    const st = this.state;
    const items = [];
    for (const p of st.posts?.list() ?? []) {
      const t = POST_TYPE[p.type];
      if (!t || t.feed === 'none') continue;
      items.push({ key: `post:${p.uid}`, label: p.name, color: t.color,
        on: this.source.kind === 'post' && this.source.uid === p.uid });
    }
    items.push({ key: 'drone', label: '드론', color: '#63dfff', on: this.source.kind === 'drone' });
    wrap.innerHTML = items.map((i) =>
      `<button class="fw-chip ${i.on ? 'on' : ''}" data-src="${i.key}"
        style="${i.on ? `color:${i.color};border-color:${i.color}` : ''}">${i.label}</button>`).join('');
    wrap.querySelectorAll('.fw-chip').forEach((b) => {
      b.onclick = () => {
        const v = b.dataset.src;
        this.setSource(v === 'drone' ? { kind: 'drone' } : { kind: 'post', uid: v.slice(5) });
      };
    });
  }

  resetView() {
    this.yaw = 0; this.pitch = -6;
    this.zoomIdx = 0;
    this.fov = this.optic ? fovAtZoom(this.optic, this.optic.zooms[0]) : (this.kind?.fov ?? 42);
    this._paintControls?.();
  }

  get zoom() { return this.optic?.zooms?.[this.zoomIdx] ?? 1; }

  stepZoom(dir) {
    const zs = this.optic?.zooms ?? [1];
    const next = Math.max(0, Math.min(zs.length - 1, this.zoomIdx + (dir > 0 ? 1 : -1)));
    if (next === this.zoomIdx) return;
    this.zoomIdx = next;
    this.fov = fovAtZoom(this.optic, this.zoom);
    this._paintControls();
  }

  /** 화면 극성 — 열상은 백열/흑열, 그 밖의 채널은 주간/야시 */
  togglePolarity() {
    const cur = this.palette();
    if (this.optic?.band === 'lwir' || this.optic?.polarity) {
      this.manualPalette = cur === 'wh' ? 'bh' : cur === 'bh' ? 'wh' : 'wh';
    } else {
      this.manualPalette = cur === 'nvg' ? 'vis' : 'nvg';
    }
    this._paintControls();
  }

  /** 지금 이 창이 내보내는 극성 — 운용자 선택 > 파장대 > 조도 */
  palette() {
    if (this.manualPalette) return this.manualPalette;
    if (this.optic?.band === 'lwir') return 'wh';
    const lux = this.state.env?.state?.illuminanceLux ?? 1e4;
    if (this.optic?.nightNvg && lux < 8) return 'nvg';
    return 'vis';
  }

  /** 배율·극성 버튼과 화면 필터를 한 번에 맞춘다 */
  _paintControls() {
    const zb = this.el.querySelector('.fw-zoom');
    const pb = this.el.querySelector('.fw-pol');
    const single = (this.optic?.zooms?.length ?? 1) <= 1;
    if (zb) { zb.textContent = `×${this.zoom}`; zb.style.display = single || this.kind?.ppi ? 'none' : ''; }
    const pal = this.palette();
    if (pb) {
      pb.textContent = PALETTE_LABEL[pal] ?? pal;
      pb.style.display = this.kind?.ppi ? 'none' : '';
      pb.classList.toggle('on', !!this.manualPalette);
    }
    for (const c of ['pal-wh', 'pal-bh', 'pal-nvg']) this.el.classList.remove(c);
    const cls = PALETTE_CLASS[pal];
    if (cls) this.el.classList.add(cls);
  }

  resize() {
    const b = this.el.querySelector('.fw-body');
    this.hudEl.width = b.clientWidth;
    this.hudEl.height = b.clientHeight;
    this.ppiEl.width = b.clientWidth;
    this.ppiEl.height = b.clientHeight;
    try { this.viewerFeed?.resize(); } catch (_) {}
  }

  // ── 제2 뷰어 ──────────────────────────────────────────────────────────
  _ensureViewer() {
    if (this.viewerFeed) return this.viewerFeed;
    const main = this.mgr.main;
    const v = new Cesium.Viewer(this.viewEl, {
      baseLayerPicker: false, geocoder: false, homeButton: false, sceneModePicker: false,
      navigationHelpButton: false, animation: false, timeline: false, fullscreenButton: false,
      infoBox: false, selectionIndicator: false, creditContainer: document.createElement('div'),
      baseLayer: new Cesium.ImageryLayer(new Cesium.UrlTemplateImageryProvider({
        url: `/vworld/req/wmts/1.0.0/${VWORLD_KEY}/Satellite/{z}/{y}/{x}.jpeg`,
        minimumLevel: 6, maximumLevel: 19,
        rectangle: Cesium.Rectangle.fromDegrees(124.5, 33.0, 132.5, 39.5),
      })),
      terrainProvider: main.terrainProvider,     // 지형 공유 — 능선 차폐가 본 화면과 동일
    });
    const sc = v.scene;
    sc.globe.depthTestAgainstTerrain = true;
    sc.globe.enableLighting = true;
    sc.screenSpaceCameraController.enableInputs = false;   // 슬루는 우리가 그린다
    // 관제벽은 뷰어를 여러 개 동시에 돌린다 — 창 하나가 300×200 인데 본 화면과 같은
    // 해상도·지형 정밀도로 그리면 6채널에서 GPU 가 먼저 무릎을 꿇는다.
    v.resolutionScale = 0.85;
    sc.globe.maximumScreenSpaceError = 4;
    this.viewerFeed = v;
    this._addSceneProps(v);
    // 환경(태양·안개·영상보정·강수)을 본 화면과 같은 권한 아래로
    this.mgr.ctx.state.env?.attachViewer?.(v);
    return v;
  }

  /** 피드 안에서도 감시탑과 침투 유닛이 보여야 한다 */
  _addSceneProps(v) {
    const st = this.state;
    v.entities.add({
      position: new Cesium.CallbackProperty(() => Cesium.Cartesian3.fromDegrees(
        SITE.gp.lon, SITE.gp.lat, st.ents.groundH + st.ents.towerHeight / 2), false),
      cylinder: {
        length: new Cesium.CallbackProperty(() => st.ents.towerHeight, false),
        topRadius: 1.5, bottomRadius: 2.2,
        material: Cesium.Color.fromCssColorString('#3c4348'),
      },
    });
    for (let i = 0; i < 4; i++) {
      v.entities.add({
        position: new Cesium.CallbackProperty(() => {
          const p = this.mgr.unitAt(i);
          return p ? Cesium.Cartesian3.fromDegrees(p.lon, p.lat, p.h + 0.9)
            : Cesium.Cartesian3.fromDegrees(0, 0, -1000);
        }, false),
        cylinder: {
          length: 1.8, topRadius: 0.28, bottomRadius: 0.32,
          material: Cesium.Color.fromCssColorString('#c8493f'),
        },
      });
    }
  }

  destroy() {
    if (this.viewerFeed) {
      this.mgr.ctx.state.env?.detachViewer?.(this.viewerFeed);
      try { this.viewerFeed.destroy(); } catch (_) {}
      this.viewerFeed = null;
    }
    this.el.remove();
  }

  // ── 프레임 ────────────────────────────────────────────────────────────
  tick(atm) {
    const info = this.resolve();
    if (this.kind.ppi) return this._drawPPI(info, atm);
    if (!this.viewerFeed) return;
    const st = this.state;
    this.viewerFeed.clock.currentTime = this.mgr.main.clock.currentTime;

    let lon = info.lon, lat = info.lat, h = info.eyeH, baseAim = info.aimAz, pitchBase = 0;
    if (this.kind.drone) {
      this.orbit += 0.0035;
      const q = offset(SITE.gp.lon, SITE.gp.lat, (this.orbit * 180 / Math.PI) % 360, 420);
      lon = q.lon; lat = q.lat; h = st.ents.groundH + 260;
      baseAim = azimuthDeg(lon, lat, SITE.gp.lon, SITE.gp.lat);
      pitchBase = -22;
    }
    // 자동 주사 — 시야각 안을 왕복
    if (this.scan) {
      const limit = Math.min(SLEW_YAW, Math.max(8, (info.fov - this.fov) / 2));
      this.yaw += this.scanDir * 0.55;
      if (this.yaw > limit) { this.yaw = limit; this.scanDir = -1; }
      if (this.yaw < -limit) { this.yaw = -limit; this.scanDir = 1; }
    }

    const heading = baseAim + this.yaw;
    const cam = this.viewerFeed.camera;
    cam.setView({
      destination: Cesium.Cartesian3.fromDegrees(lon, lat, h),
      orientation: {
        heading: Cesium.Math.toRadians(heading),
        pitch: Cesium.Math.toRadians(pitchBase + this.pitch),
        roll: 0,
      },
    });
    cam.frustum.fov = Cesium.Math.toRadians(this.fov);
    try { this.viewerFeed.scene.render(); } catch (_) { return; }

    const dets = this._drawHud(info, atm, { lon, lat, h, heading });
    const az = Math.round(((heading % 360) + 360) % 360);
    this.infoEl.textContent =
      `AZ ${String(az).padStart(3, '0')}° · EL ${(pitchBase + this.pitch).toFixed(0)}° · ×${this.zoom}`
      + (dets ? ` · 표적 ${dets}` : '');
    this._burn = { az, el: pitchBase + this.pitch, lon, lat, h };
  }

  /**
   * HUD 캔버스: 파장대별 감쇠 베일 · 강수 입자 · 유효거리 티커 · 표적 브래킷
   * @returns 탐지된 표적 수
   */
  _drawHud(info, atm, cam) {
    const cv = this.hudEl;
    const g = cv.getContext('2d');
    const W = cv.width, H = cv.height;
    g.clearRect(0, 0, W, H);
    if (!atm) return 0;

    const perf = info.perf;
    const band = this.kind.band;

    // ① 대기 감쇠 베일 — 화면 중앙거리(유효거리의 60 %)에서의 투과율로 두께를 정한다.
    const probe = Math.max(200, (perf?.range ?? 2000) * 0.6);
    const beta = band === 'lwir' ? atm.betaLwir : band === 'radar' ? 0 : atm.betaVis;
    const veil = 1 - Math.exp(-beta * probe);
    if (veil > 0.02) {
      const fc = atm.weatherId === 'snow' || atm.precipitation === 'snow'
        ? '235,242,248' : atm.weatherId === 'fog' ? '214,222,228' : '186,196,206';
      // IR 은 회색 열상 베일, 가시대역은 하늘색 산란 베일
      const gr = g.createLinearGradient(0, 0, 0, H);
      const a0 = Math.min(0.82, veil * (band === 'lwir' ? 0.55 : 0.92));
      gr.addColorStop(0, `rgba(${band === 'lwir' ? '150,150,150' : fc},${(a0 * 0.75).toFixed(3)})`);
      gr.addColorStop(0.55, `rgba(${band === 'lwir' ? '140,140,140' : fc},${a0.toFixed(3)})`);
      gr.addColorStop(1, `rgba(${band === 'lwir' ? '120,120,120' : fc},${(a0 * 0.6).toFixed(3)})`);
      g.fillStyle = gr;
      g.fillRect(0, 0, W, H);
    }

    // ② 강수 입자 (레이더 제외)
    if (band !== 'radar' && atm.precipitation !== 'none') {
      this._drawPrecip(g, W, H, atm);
    }

    // ③ 저조도 그레인 — EO·육안만. 열상은 조도와 무관하다.
    if ((band === 'vis' || band === 'eye') && atm.lux < 30) {
      const grain = Math.min(0.3, 0.3 * (1 - Math.log10(Math.max(atm.lux, 0.001) / 0.001) / Math.log10(30000)));
      g.globalAlpha = grain;
      for (let i = 0; i < 260; i++) {
        g.fillStyle = i % 3 ? '#8fa' : '#fff';
        g.fillRect(Math.random() * W, Math.random() * H, 1.4, 1.4);
      }
      g.globalAlpha = 1;
    }

    // ④ 표적 브래킷
    let dets = 0;
    if (perf && info.post) {
      const scene = this.viewerFeed.scene;
      for (let i = 0; i < 4; i++) {
        const u = this.mgr.unitAt(i);
        if (!u) continue;
        const d = distM(info.lon, info.lat, u.lon, u.lat);
        if (d > perf.range) continue;
        if (info.fov < 360
          && Math.abs(azDelta(azimuthDeg(info.lon, info.lat, u.lon, u.lat), info.aimAz)) > info.fov / 2) continue;
        // 가시격자가 아직 없으면 지형 차폐는 씬 깊이에 맡긴다 (브래킷만 관대해진다)
        if (this.state.grid
          && !losClear(this.state.grid, info.lon, info.lat, info.eyeH, u.lon, u.lat)) continue;
        const p3 = Cesium.Cartesian3.fromDegrees(u.lon, u.lat, u.h + 0.9);
        const win = (Cesium.SceneTransforms.worldToWindowCoordinates
          ?? Cesium.SceneTransforms.wgs84ToWindowCoordinates)(scene, p3);
        if (!win) continue;
        // 화면 밖 / 카메라 뒤
        if (win.x < -40 || win.x > W + 40 || win.y < -40 || win.y > H + 40) continue;
        const pd = detectionProbability(perf, d);
        const grade = d <= perf.dri[2] ? '식별' : d <= perf.dri[1] ? '인지' : '탐지';
        const col = grade === '식별' ? '#3dd68c' : grade === '인지' ? '#e3b341' : '#ed5d5d';
        const s = Math.max(14, Math.min(72, 2600 / Math.max(60, d)));
        this._bracket(g, win.x, win.y, s, col);
        g.fillStyle = col;
        g.font = '600 10px "Chakra Petch", monospace';
        g.fillText(`${grade} ${fmtM(d)} · P${pd.toFixed(2)}`, win.x + s / 2 + 5, win.y - s / 2 + 9);
        dets++;
      }
    }

    // ⑤ 유효거리 티커 (하단 우측)
    if (perf) {
      const bar = { x: W - 132, y: H - 46, w: 118, h: 5 };
      g.fillStyle = 'rgba(0,0,0,0.55)';
      g.fillRect(bar.x - 6, bar.y - 13, bar.w + 12, 30);
      g.fillStyle = 'rgba(255,255,255,0.18)';
      g.fillRect(bar.x, bar.y, bar.w, bar.h);
      g.fillStyle = VERDICT_COLOR[perf.verdict];
      g.fillRect(bar.x, bar.y, bar.w * perf.factor, bar.h);
      g.fillStyle = 'rgba(230,240,246,0.92)';
      g.font = '600 9.5px "Chakra Petch", monospace';
      g.fillText(`유효 ${fmtM(perf.range)} / 청천 ${fmtM(perf.specRange)}`, bar.x, bar.y - 4);
      g.fillStyle = VERDICT_COLOR[perf.verdict];
      g.fillText(perf.limiter, bar.x, bar.y + 14);
    }

    // ⑥ 화면 번인 — 채널·DTG·좌표·배율. 이 화면을 캡처하면 그대로 보고 자료가 된다.
    this._burnIn(g, W, H, info);
    // ⑦ 광학별 조준선
    this._reticle(g, W, H);
    return dets;
  }

  /** 관제 화면의 서명 — 우상단 번인 블록 */
  _burnIn(g, W, H, info) {
    const b = this._burn;
    if (!b) return;
    const env = this.state.env?.state;
    const md = env ? monthDayOf(env.settings.dayOfYear) : null;
    const sec = Math.floor((performance.now() / 1000) % 60);
    const dtg = env
      ? `${String(md.month).padStart(2, '0')}${String(md.day).padStart(2, '0')} `
        + `${formatClock(env.settings.minuteOfDay)}:${String(sec).padStart(2, '0')}K`
      : '—';
    const rows = [
      [`${info.tag} · ${this.kind.label}`, info.color, '700 10.5px'],
      [dtg, 'rgba(232,240,246,0.92)', '700 10px'],
      [toMGRS(b.lon, b.lat), 'rgba(232,240,246,0.62)', '600 9.5px'],
      [`AZ${String(b.az).padStart(3, '0')} EL${b.el >= 0 ? '+' : ''}${b.el.toFixed(0)} ×${this.zoom}`,
        'rgba(232,240,246,0.62)', '600 9.5px'],
    ];
    g.save();
    // 백열 화면의 하늘은 새하얗다 — 그림자만으로는 흰 글씨가 사라진다.
    // 번인 블록 뒤에 실제로 어두운 판을 깐다(실물 관제 화면의 OSD 도 그렇다).
    const bw = 158, bh = 8 + rows.length * 13;
    const grd = g.createLinearGradient(W - bw - 6, 0, W, 0);
    grd.addColorStop(0, 'rgba(4,7,10,0)');
    grd.addColorStop(0.22, 'rgba(4,7,10,0.86)');
    grd.addColorStop(1, 'rgba(4,7,10,0.9)');
    g.fillStyle = grd;
    g.fillRect(W - bw - 6, 0, bw + 6, bh);
    g.textAlign = 'right';
    g.shadowColor = 'rgba(0,0,0,0.9)';
    g.shadowBlur = 3;
    let y = 15;
    for (const [t, c, f] of rows) {
      g.font = `${f} "Chakra Petch", monospace`;
      g.fillStyle = c;
      g.fillText(t, W - 7, y);
      y += 13;
    }
    g.restore();
  }

  /** 채널 성격에 맞는 조준선 — TOD 는 중앙을 비운 열상 십자, 조준경은 탄도 사다리 */
  _reticle(g, W, H) {
    const kind = this.optic?.reticle;
    if (!kind || kind === 'none' || this.kind?.ppi) return;
    const cx = W / 2, cy = H / 2;
    g.save();
    g.strokeStyle = 'rgba(255,255,255,0.82)';
    g.fillStyle = 'rgba(255,255,255,0.82)';
    g.lineWidth = 1.1;
    if (kind === 'thermal') {
      const gap = 9, arm = 30;
      g.beginPath();
      for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
        g.moveTo(cx + dx * gap, cy + dy * gap);
        g.lineTo(cx + dx * arm, cy + dy * arm);
      }
      g.stroke();
      const sq = 24;
      for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
        g.beginPath();
        g.moveTo(cx + sx * sq - sx * 7, cy + sy * sq);
        g.lineTo(cx + sx * sq, cy + sy * sq);
        g.lineTo(cx + sx * sq, cy + sy * sq - sy * 7);
        g.stroke();
      }
    } else if (kind === 'bdc') {
      g.beginPath();
      g.moveTo(cx - 40, cy); g.lineTo(cx - 8, cy);
      g.moveTo(cx + 8, cy); g.lineTo(cx + 40, cy);
      g.moveTo(cx, cy - 30); g.lineTo(cx, cy - 8);
      g.stroke();
      g.font = '600 8px "Chakra Petch", monospace';
      [[10, '4'], [22, '8'], [36, '12']].forEach(([d, lab]) => {
        g.beginPath(); g.moveTo(cx - 7, cy + d); g.lineTo(cx + 7, cy + d); g.stroke();
        g.fillText(lab, cx + 10, cy + d + 3);
      });
    } else {
      g.beginPath();
      g.moveTo(cx - 26, cy); g.lineTo(cx - 6, cy);
      g.moveTo(cx + 6, cy); g.lineTo(cx + 26, cy);
      g.moveTo(cx, cy - 26); g.lineTo(cx, cy - 6);
      g.moveTo(cx, cy + 6); g.lineTo(cx, cy + 26);
      g.stroke();
    }
    g.restore();
  }

  _bracket(g, x, y, s, col) {
    const h = s / 2, arm = Math.max(4, s / 4);
    g.strokeStyle = col; g.lineWidth = 1.6;
    const corners = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
    for (const [sx, sy] of corners) {
      g.beginPath();
      g.moveTo(x + sx * h - sx * arm, y + sy * h);
      g.lineTo(x + sx * h, y + sy * h);
      g.lineTo(x + sx * h, y + sy * h - sy * arm);
      g.stroke();
    }
  }

  _drawPrecip(g, W, H, atm) {
    const snow = atm.precipitation === 'snow';
    const want = Math.round((snow ? 130 : 220) * Math.min(1, atm.precipitationRate / 8 + 0.25));
    while (this.flakes.length < want) {
      this.flakes.push({ x: Math.random() * W, y: Math.random() * H, z: 0.35 + Math.random() * 0.9 });
    }
    if (this.flakes.length > want) this.flakes.length = want;
    const drift = atm.windMps * (snow ? 0.9 : 0.4);
    g.save();
    for (const f of this.flakes) {
      f.y += (snow ? 1.1 : 7.5) * f.z * (1 + atm.precipitationRate / 14);
      f.x += drift * f.z * (snow ? 0.55 : 0.22);
      if (f.y > H) { f.y = -6; f.x = Math.random() * W; }
      if (f.x > W) f.x -= W; if (f.x < 0) f.x += W;
      if (snow) {
        g.fillStyle = `rgba(255,255,255,${(0.35 + 0.5 * f.z).toFixed(2)})`;
        g.beginPath(); g.arc(f.x, f.y, 0.9 + f.z * 1.3, 0, Math.PI * 2); g.fill();
      } else {
        g.strokeStyle = `rgba(190,215,235,${(0.18 + 0.3 * f.z).toFixed(2)})`;
        g.lineWidth = 1;
        g.beginPath(); g.moveTo(f.x, f.y); g.lineTo(f.x - drift * 0.5, f.y - 9 * f.z); g.stroke();
      }
    }
    g.restore();
  }

  // ── 레이더 PPI ────────────────────────────────────────────────────────
  _drawPPI(info, atm) {
    const cv = this.ppiEl;
    const g = cv.getContext('2d');
    const W = cv.width, H = cv.height;
    if (!W || !H) return;
    const cx = W / 2, cy = H - 16, R = H - 30;
    const aim = info.aimAz;
    const half = (info.fov ?? 120) / 2;
    const perf = info.perf;
    const specR = perf?.specRange ?? 5000;
    const effR = perf?.range ?? specR;

    g.fillStyle = '#04120a'; g.fillRect(0, 0, W, H);

    // 강수 클러터 — 근거리 잡음 밴드
    if (atm && atm.clutterDb > 0.3) {
      const cR = R * Math.min(0.85, 0.22 + atm.clutterDb / 8);
      const cg = g.createRadialGradient(cx, cy, 0, cx, cy, cR);
      cg.addColorStop(0, `rgba(120,255,170,${Math.min(0.3, atm.clutterDb / 14).toFixed(3)})`);
      cg.addColorStop(1, 'rgba(120,255,170,0)');
      g.fillStyle = cg;
      g.beginPath(); g.moveTo(cx, cy);
      g.arc(cx, cy, cR, Math.PI / 180 * (aim - half - 90), Math.PI / 180 * (aim + half - 90));
      g.fill();
    }

    // 거리환 + 방위선
    g.strokeStyle = 'rgba(61,214,140,0.32)'; g.lineWidth = 1;
    for (let i = 1; i <= 5; i++) {
      g.beginPath();
      g.arc(cx, cy, R * i / 5, Math.PI / 180 * (aim - half - 90), Math.PI / 180 * (aim + half - 90));
      g.stroke();
    }
    for (const a of [-half, -half / 2, 0, half / 2, half]) {
      const rad = Math.PI / 180 * (aim + a - 90);
      g.beginPath(); g.moveTo(cx, cy);
      g.lineTo(cx + R * Math.cos(rad), cy + R * Math.sin(rad)); g.stroke();
    }

    // 유효거리 한계 호 — 청천 제원 대비 어디까지 줄었는지
    if (effR < specR * 0.99) {
      const rr = R * (effR / specR);
      g.strokeStyle = 'rgba(252,196,48,0.85)'; g.lineWidth = 1.6;
      g.setLineDash([5, 4]);
      g.beginPath();
      g.arc(cx, cy, rr, Math.PI / 180 * (aim - half - 90), Math.PI / 180 * (aim + half - 90));
      g.stroke();
      g.setLineDash([]);
      g.fillStyle = 'rgba(252,196,48,0.9)';
      g.font = '600 9.5px "Chakra Petch", monospace';
      g.fillText(`실효 ${fmtM(effR)}`, cx + rr * Math.cos(Math.PI / 180 * (aim - 90)) + 4,
        cy + rr * Math.sin(Math.PI / 180 * (aim - 90)) + 10);
    }

    // 스윕
    this._sweep = ((this._sweep ?? -half) + 1.6);
    if (this._sweep > half) this._sweep = -half;
    const sw = Math.PI / 180 * (aim + this._sweep - 90);
    const grad = g.createLinearGradient(cx, cy, cx + R * Math.cos(sw), cy + R * Math.sin(sw));
    grad.addColorStop(0, 'rgba(61,214,140,0.05)'); grad.addColorStop(1, 'rgba(61,214,140,0.9)');
    g.strokeStyle = grad; g.lineWidth = 2;
    g.beginPath(); g.moveTo(cx, cy);
    g.lineTo(cx + R * Math.cos(sw), cy + R * Math.sin(sw)); g.stroke();

    // 블립
    this._blips = (this._blips ?? []).filter((b) => (b.a -= 0.008) > 0);
    for (let i = 0; i < 4; i++) {
      const u = this.mgr.unitAt(i);
      if (!u) continue;
      const d = distM(info.lon, info.lat, u.lon, u.lat);
      if (d > effR) continue;
      const az = azimuthDeg(info.lon, info.lat, u.lon, u.lat);
      const da = azDelta(az, aim);
      if (Math.abs(da) > half) continue;
      if (this.state.grid && !losClear(this.state.grid, info.lon, info.lat, info.eyeH, u.lon, u.lat)) continue;
      if (Math.abs(azDelta(az, aim + this._sweep)) < 2.5) {
        this._blips.push({ da, d, a: 1, p: perf ? detectionProbability(perf, d) : 1 });
      }
    }
    for (const b of this._blips) {
      const rad = Math.PI / 180 * (aim + b.da - 90);
      const rr = R * Math.min(1, b.d / specR);
      g.fillStyle = `rgba(120,255,170,${(b.a * Math.max(0.25, b.p)).toFixed(2)})`;
      g.beginPath();
      g.arc(cx + rr * Math.cos(rad), cy + rr * Math.sin(rad), 3, 0, Math.PI * 2);
      g.fill();
    }

    // 스코프 라벨은 아래쪽에 — 상단 좌측은 fw-info(스윕·블립)가 이미 쓰고 있다
    g.fillStyle = 'rgba(61,214,140,0.9)';
    g.font = '600 10px "Chakra Petch", monospace';
    g.fillText(`PPI · ${(specR / 1000).toFixed(0)}km · ${Math.round(aim)}° ±${half}°`, 8, H - 36);
    if (atm) {
      g.fillStyle = atm.clutterDb > 1 ? 'rgba(252,196,48,0.95)' : 'rgba(61,214,140,0.6)';
      g.fillText(atm.clutterDb > 0.3
        ? `클러터 +${atm.clutterDb.toFixed(1)}dB · 감쇠 ${atm.gammaDbPerKm.toFixed(3)}dB/km`
        : '전천후 — 대기 영향 없음', 8, H - 23);
    }
    this.infoEl.textContent = `스윕 ${(aim + this._sweep).toFixed(0)}° · 블립 ${this._blips.length}`;
  }

  /** 하단 성능 요약 줄 */
  paintPerf(info) {
    if (!info.perf) { this.perfEl.textContent = ''; return; }
    const p = info.perf;
    this.perfEl.innerHTML =
      `<b style="color:${VERDICT_COLOR[p.verdict]}">${p.limiter}</b> · `
      + `D ${fmtM(p.dri[0])} / R ${fmtM(p.dri[1])} / I ${fmtM(p.dri[2])} · ${p.note}`;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// 창 관리자 (main.js 는 이 이름만 안다)
// ═══════════════════════════════════════════════════════════════════════════
export class SensorFeed {
  constructor(mainViewer, ctx) {
    this.main = mainViewer;
    this.ctx = ctx;                       // { state, toast }
    this.windows = [];
    this.deck = document.createElement('div');
    this.deck.id = 'feed-deck';
    document.querySelector('#map-wrap').appendChild(this.deck);
    this._timer = null;
  }

  /** 침투 유닛 i 의 현재 지점 (없으면 null) */
  unitAt(i) {
    try {
      const st = this.ctx.state;
      const u = st.infil?.units?.[i];
      if (!u) return null;
      const s = st.infil._state(u);
      return { lon: s.p.lon, lat: s.p.lat, h: s.p.h ?? st.ents.groundH };
    } catch { return null; }
  }

  /**
   * 창을 연다.
   *  open('eo')                 레거시 MOUNTS 키
   *  open({ kind:'post', uid }) 배치 초소
   *  open({ kind:'drone' })
   */
  open(source) {
    const src = typeof source === 'string'
      ? (source === 'drone' ? { kind: 'drone' } : { kind: 'post', uid: source })
      : source;
    // 확대 중이었다면 숨겨 둔 창들을 되살리고, 새 창까지 포함해 다시 정렬한다
    // (여기서 바로 tile() 하면 아직 없는 새 창의 자리가 비어 어긋난다)
    const wasMax = this._unmaximize();
    // 이미 같은 소스를 보고 있으면 그 창을 앞으로
    const dup = this.windows.find((w) => w.source.kind === src.kind && w.source.uid === src.uid);
    if (dup) { if (wasMax) this.tile(); this.focus(dup.id); return dup; }
    if (this.windows.length >= MAX_WINDOWS) {
      // 가장 오래된 창을 이 소스로 갈아 끼운다 — 창이 무한히 늘지 않게
      const w = this.windows[0];
      w.setSource(src);
      if (wasMax) this.tile();
      this.focus(w.id);
      this.ctx.toast?.(`피드 창 최대 ${MAX_WINDOWS}개 — 가장 오래된 창을 전환했습니다`, 3200);
      return w;
    }
    const w = new FeedWindow(this, src);
    this.windows.push(w);
    if (wasMax) this.tile(); else this._place(w, this.windows.length - 1);
    this._start();
    this.ctx.toast?.('드래그 슬루 · 휠 배율 · 더블클릭 초기화 · ⌗ 2×2 정렬', 3600);
    this.refreshChips();
    return w;
  }

  closeWindow(id) {
    const i = this.windows.findIndex((w) => w.id === id);
    if (i < 0) return;
    const wasMax = this.windows[i].el.dataset.max === '1';
    this.windows[i].destroy();
    this.windows.splice(i, 1);
    if (wasMax && this.windows.length) { this._unmaximize(); this.tile(); }
    if (!this.windows.length) this._stop();
    this.refreshChips();
  }

  /** 레거시 호환 — 전부 닫기 */
  close() {
    [...this.windows].forEach((w) => this.closeWindow(w.id));
  }

  /**
   * 관제벽 — 배치된 감시자산의 화면을 한 번에 띄운다.
   *
   * 자산 하나씩 열어 보는 것과 전부를 나란히 놓고 보는 것은 다른 일이다.
   * 같은 순간 EO 는 눈 속에서 하얗게 지워지는데 TOD 에는 아직 사람이 보이고
   * 레이더 PPI 에는 블립이 남아 있다 — 그 대비는 한 화면에서만 보인다.
   */
  openWall() {
    const st = this.ctx.state;
    const posts = (st.posts?.list() ?? []).filter((p) => POST_TYPE[p.type]?.feed !== 'none');
    if (!posts.length) {
      this.ctx.toast?.('피드 채널을 가진 배치 자산이 없습니다 — 감시 탭에서 먼저 배치하세요', 4200);
      return 0;
    }
    // 열상 → 광학 → 레이더 → 조준경 순으로 채운다 (야간 관제 우선순위)
    const rank = { ir: 0, eo: 1, radar: 2, hmg: 3, agl: 4 };
    const ordered = [...posts].sort((a, b) => (rank[a.type] ?? 9) - (rank[b.type] ?? 9));
    const want = ordered.slice(0, MAX_WINDOWS);
    // 이미 떠 있는 창은 재사용하고, 남는 창은 닫는다
    for (const w of [...this.windows]) {
      if (!want.some((p) => w.source.kind === 'post' && w.source.uid === p.uid)) this.closeWindow(w.id);
    }
    for (const p of want) this.open({ kind: 'post', uid: p.uid });
    this.tile();
    this.ctx.toast?.(`관제벽 ${this.windows.length}채널${
      ordered.length > MAX_WINDOWS ? ` (최대 ${MAX_WINDOWS} — ${ordered.length - MAX_WINDOWS}채널 대기)` : ''}`, 3600);
    return this.windows.length;
  }

  /** 확대 상태를 푼다 — 창을 열거나 닫으면 숨겨 둔 창들이 되돌아와야 한다 */
  _unmaximize() {
    if (!this.windows.some((w) => w.el.dataset.max === '1')) return false;
    this.windows.forEach((w) => { w.el.dataset.max = ''; w.el.style.display = ''; });
    return true;
  }

  /** 한 채널만 크게 — 표적을 붙잡았을 때 그 화면만 남긴다 */
  maximize(id) {
    const w = this.windows.find((x) => x.id === id);
    if (!w) return;
    const wrap = document.querySelector('#map-wrap');
    const big = w.el.dataset.max === '1';
    if (big) {
      this._unmaximize();
      this.tile();
      return;
    }
    this.windows.forEach((x) => { x.el.dataset.max = ''; x.el.style.display = x === w ? '' : 'none'; });
    w.el.dataset.max = '1';
    const W = Math.floor(wrap.clientWidth * 0.62), H = Math.floor(wrap.clientHeight * 0.72);
    w.el.style.width = `${W}px`;
    w.el.style.height = `${H}px`;
    w.el.style.left = `${Math.round((wrap.clientWidth - W) / 2)}px`;
    w.el.style.top = `${Math.round((wrap.clientHeight - H) / 2) - 10}px`;
    w.el.style.right = 'auto'; w.el.style.bottom = 'auto';
    w.resize();
    this.focus(id);
  }

  focus(id) {
    this.windows.forEach((w) => w.el.classList.toggle('focus', w.id === id));
    const w = this.windows.find((x) => x.id === id);
    if (w) this.deck.appendChild(w.el);
  }

  refreshChips() { this.windows.forEach((w) => w._renderChips()); }

  /** 배치가 바뀌면(초소 삭제 등) 죽은 소스를 정리한다 */
  syncPosts() {
    const st = this.ctx.state;
    for (const w of [...this.windows]) {
      if (w.source.kind !== 'post') continue;
      if (st.posts?.get(w.source.uid)) continue;
      if (MOUNTS[w.source.uid]) continue;
      this.closeWindow(w.id);
    }
    this.refreshChips();
  }

  _place(w, i) {
    const gap = 12, W = 348, H = 268;
    w.el.style.width = `${W}px`;
    w.el.style.height = `${H}px`;
    w.el.style.right = 'auto'; w.el.style.bottom = 'auto';
    const wrap = document.querySelector('#map-wrap');
    const cols = 2;
    const x = wrap.clientWidth - this._rightReserve() - (W + gap) * (1 + (i % cols));
    const y = 60 + Math.floor(i / cols) * (H + gap);
    w.el.style.left = `${Math.max(gap, x)}px`;
    w.el.style.top = `${y}px`;
    w.resize();
  }

  /** 2×2 타일 정렬 */
  /**
   * 오른쪽에 자리를 잡고 있는 창(자산 관리·관측보고)의 폭.
   *
   * 이것을 빼지 않고 벽을 세우면 마지막 채널이 관리 창 **밑으로 들어간다** —
   * 화면이 두 장 겹쳐 있는데 한 장은 영원히 안 보이는 상태가 된다.
   */
  _rightReserve() {
    const wrap = document.querySelector('#map-wrap');
    let reserve = 0;
    for (const sel of ['#manage-panel', '#spot-card']) {
      const el = document.querySelector(sel);
      if (!el || el.classList.contains('hidden')) continue;
      const r = el.getBoundingClientRect();
      const w = wrap.getBoundingClientRect();
      // 오른쪽 가장자리에 붙어 있는 창만 자리를 차지한 것으로 본다(끌어 옮겼으면 비켜 준 것)
      if (w.right - r.right < 40) reserve = Math.max(reserve, r.width + 14);
    }
    return reserve;
  }

  /** 관제벽 정렬 — 창 수에 따라 2열/3열. 지도 좌측은 비워 둔다(계획을 같이 본다). */
  tile() {
    const wrap = document.querySelector('#map-wrap');
    const gap = 10;
    const n = this.windows.length;
    if (!n) return;
    const reserve = this._rightReserve();
    const avail = wrap.clientWidth - reserve;
    const cols = n <= 1 ? 1 : n <= 4 ? 2 : 3;
    const rows = Math.ceil(n / cols);
    const deckW = avail * (cols >= 3 ? 0.78 : 0.58);
    const W = Math.max(232, Math.floor((deckW - gap * (cols + 1)) / cols));
    const H = Math.max(190, Math.floor((wrap.clientHeight - 78 - gap * (rows + 1)) / rows));
    const left0 = avail - (W + gap) * cols;
    this.windows.forEach((w, i) => {
      w.el.dataset.max = '';
      w.el.style.display = '';
      w.el.style.width = `${W}px`;
      w.el.style.height = `${H}px`;
      w.el.style.right = 'auto'; w.el.style.bottom = 'auto';
      w.el.style.left = `${Math.max(gap, left0 + (i % cols) * (W + gap))}px`;
      w.el.style.top = `${58 + Math.floor(i / cols) * (H + gap)}px`;
      w.resize();
    });
  }

  // rAF 는 백그라운드/스로틀 웹뷰에서 멎는다 — 인터벌 루프로 항상 동작
  _start() {
    if (this._timer) return;
    this._timer = setInterval(() => this._loop(), 40);
  }
  _stop() { clearInterval(this._timer); this._timer = null; }

  _loop() {
    const env = this.ctx.state.env?.state;
    const atm = env ? atmosphereOf(env) : null;
    for (const w of this.windows) {
      // 한 채널을 확대하면 나머지는 숨는다 — 숨은 창의 뷰어를 계속 그리면
      // 크기 0 캔버스에 매 40ms 렌더를 거는 셈이라 프레임을 통째로 잡아먹는다.
      if (w.el.style.display === 'none') continue;
      try {
        w.tick(atm);
        w.paintPerf(w.resolve());
      } catch (e) { /* 뷰어 파괴 경합 무시 */ }
    }
  }
}
