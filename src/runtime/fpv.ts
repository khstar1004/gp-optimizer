// @ts-nocheck
/**
 * 1인칭 관측 (First-Person View) — 「그 자산의 눈」
 *
 * 1인칭은 **큰 개념**이다 — 감시탑만의 것이 아니다. 관측점(vantage) 하나를 받아
 * 그 자리에 눈을 두는 것이 전부이고, 그 관측점이 감시탑이든 부감시소든 배치한
 * 초소·위병소의 3층이든 지도에서 방금 찍은 능선의 한 점이든 상관하지 않는다.
 *
 * 다만 **자리를 옮기는 것만으로는 그 자산이 되지 않는다.** 카메라를 TOD 거치대
 * 좌표에 놓아도 화면이 컬러 위성사진이고 계기가 하나도 없으면, 그것은 TOD 시점이
 * 아니라 그냥 지도를 낮은 데서 본 것이다. 그래서 여기서는 관측점에 붙은
 * **광학 프로파일**(opticProfile)을 함께 받아 세 가지를 같이 바꾼다:
 *
 *   ① 화면 자체    — 열상은 색을 버리고 복사온도 램프로, 야시는 초록 증폭관으로
 *                    (opticFx: 깊이 인식 포스트프로세스)
 *   ② 접안 광학    — 접안경 마스크 · 배율 단계(연속 줌이 아니다) · 시야각
 *   ③ 계기         — 방위 테이프 · 부앙 사다리 · 조준선 · LRF · 유효거리 막대 ·
 *                    자산별 계기(드론 비행계기 / 레이더 PPI / 음향 워터폴)
 *                    (opticHud: 캔버스 한 장)
 *
 * 관측점 계약 (vantage):
 *   { id, kind, name, sub, tag, lon, lat, groundH, height,
 *     adjustable, minH, maxH, heightLabel, setHeight(h), costText(h),
 *     headingDeg, optic, feedSource, onEnter(), onExit() }
 *
 *   optic       opticProfile 의 프로파일 (없으면 육안)
 *   feedSource  이 관측점에 대응하는 센서 피드 창 소스 (없으면 피드 버튼 숨김)
 */
import { SITE } from './data';
import { distM, azimuthDeg, azDelta } from './geo';
import { humanOptic, fovAtZoom, OPTICS } from './opticProfile';
import { formatClock, monthDayOf } from './environmentModel';
import { OpticFx, resolvePalette } from './opticFx';
import { OpticHud } from './opticHud';
import { atmosphereOf, effectiveRanges, detectionProbability } from './sensorPerformance';
import { losClear } from './siteOptimizer';
import { superElevationMil, timeOfFlightS, windDriftMil } from './ballistics';
import { closingRateMps, deadReckon, etaSeconds, kinematics, weaponEntry } from './tracking';
import { cueSolution, cueSummary, cueable } from './crossCue';
import { BURN_S, ILLUM_RADIUS_M, burnIntensity, flareAglM } from './fireSupport';
import { POST_TYPE } from './sensorPosts';
import { toMGRS } from './mgrs';
import { buildSpotrep } from './spotrep';
import { svgIcon } from './icons';

const $ = (s) => document.querySelector(s);
const rad = Cesium.Math.toRadians;
const deg = Cesium.Math.toDegrees;

/** 눈높이 보정 — 데크 바닥이 아니라 사람 눈이 보는 높이. */
const EYE_OFFSET_M = 1.6;
/** 열상 NUC 자동 주기 (초) — 실물은 수십 초마다 셔터를 닫는다. */
const NUC_PERIOD_S = 52;
const NUC_DURATION_S = 0.7;

const az360 = (a) => ((a % 360) + 360) % 360;

export class FirstPersonView {
  /**
   * @param opts {
   *   defaultVantage: () => vantage,
   *   resolveVantage: (id) => vantage,
   *   onVantageChange: (vantage) => void,
   *   state: 런타임 상태 (침투 유닛·가시격자·환경을 읽는다),
   *   renderGuard, toast, openFeed: (source) => void,
   * }
   */
  constructor(viewer, opts = {}) {
    this.viewer = viewer;
    this.opts = opts;
    this.active = false;
    this.vantage = null;
    this.optic = humanOptic();
    this.zoomIdx = 0;
    this.heading = 0;      // rad
    this.pitch = -0.04;
    this.fov = 60;         // deg — 배율 단계에서 계산된다
    this.manualPalette = null;
    this.lrf = null;
    this.nuc = 0;
    this._nucAt = 0;
    this._drag = null;
    this._enteredAt = 0;
    // ── 표적 추적 · 인계 ──
    this.lock = null;          // { key, id, name, lockedAt, lostAt }
    this.cueResults = null;    // 마지막 인계 판정
    this.cueSummaryText = null;
    this._cueRestore = null;   // 인계 전 지향각 (복원용)
    this._lastFrame = null;    // 관측보고가 읽을 마지막 프레임 값
    this.fx = new OpticFx(viewer, { renderGuard: opts.renderGuard });
    this.hud = null;
    this._raf = null;
    this._bind();
  }

  get state() { return this.opts.state ?? {}; }

  // ══════════════════════════════════════════════════════════════════════
  // 입력
  // ══════════════════════════════════════════════════════════════════════
  _bind() {
    const canvas = this.viewer.canvas;
    canvas.addEventListener('pointerdown', (e) => {
      if (!this.active) return;
      this._drag = { x: e.clientX, y: e.clientY, h: this.heading, p: this.pitch, moved: 0 };
      canvas.setPointerCapture(e.pointerId);
    });
    canvas.addEventListener('pointermove', (e) => {
      if (!this.active || !this._drag) return;
      const dx = e.clientX - this._drag.x, dy = e.clientY - this._drag.y;
      this._drag.moved = Math.max(this._drag.moved, Math.abs(dx) + Math.abs(dy));
      // 사람이 잡으면 자동추적은 끊긴다 — 실물 짐벌의 수동 개입이 그렇다
      if (this._drag.moved > 6 && this.lock) this.unlock('수동 슬루');
      // 배율이 높을수록 감도 낮게 (실물 슬루의 조작감)
      const sens = 0.0022 * (this.fov / 60);
      this.heading = this._drag.h + dx * sens;
      this.pitch = Math.max(rad(-85), Math.min(rad(60), this._drag.p - dy * sens));
      this._apply();
    });
    canvas.addEventListener('pointerup', (e) => {
      const d = this._drag;
      this._drag = null;
      // 끌지 않고 눌렀다 뗀 것은 「표적 지정」이다
      if (this.active && d && d.moved <= 6) this._lockAtScreen(e.clientX, e.clientY);
    });
    // 휠은 배율 「단」을 넘긴다 — 실물 광학은 연속 줌이 아니다
    canvas.addEventListener('wheel', (e) => {
      if (!this.active) return;
      e.preventDefault();
      this.stepZoom(e.deltaY > 0 ? -1 : 1);
    }, { passive: false });

    window.addEventListener('keydown', (e) => {
      if (!this.active) return;
      if (e.target.matches?.('input,textarea,select')) return;
      // ESC 는 도보(walk.ts)·드론(walk.ts DroneCam)과 동일하게 시점 탈출구다 —
      // 다른 조합키 검사보다 먼저 잡아야, 갇혔다고 느끼는 순간 무조건 빠져나간다.
      if (e.key === 'Escape') { this.exit(); e.preventDefault(); return; }
      // Ctrl+Z(실행취소) 같은 조합키까지 광학 조작으로 먹으면 안 된다
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const k = e.key.toLowerCase();
      if (k === 'p') { this.togglePolarity(); e.preventDefault(); }
      else if (k === 'l') { this.fireLrf(); e.preventDefault(); }
      else if (k === 'n' && this.optic.nuc) { this.runNuc(); e.preventDefault(); }
      else if (k === 'b') { this.toggleBino(); e.preventDefault(); }
      else if (k === 'z') { this.stepZoom(1); e.preventDefault(); }
      else if (k === 'f') { this.openFeed(); e.preventDefault(); }
      else if (k === 't') { this.lock ? this.unlock('운용자 해제') : this.lockNearest(); e.preventDefault(); }
      else if (k === 'c') { this.crossCue(); e.preventDefault(); }
      else if (k === 'i') { this.requestIllumination(); e.preventDefault(); }
      else if (k === 's') { this.captureSpotrep(); e.preventDefault(); }
    });

    $('#fpv-exit').onclick = () => this.exit();
    $('#fpv-height').oninput = (e) => {
      const v = this.vantage;
      if (!v?.adjustable) return;
      const h = +e.target.value;
      v.height = h;
      v.setHeight?.(h);
      this.lrf = null;             // 눈높이가 바뀌면 방금 잰 거리는 낡은 값이다
      this._apply();
      this._chrome();
    };
  }

  // ══════════════════════════════════════════════════════════════════════
  // 진입 / 해제
  // ══════════════════════════════════════════════════════════════════════
  enter(vantage) {
    const v = vantage ?? this.opts.defaultVantage?.();
    if (!v) return;
    const wasActive = this.active;
    if (wasActive && this.vantage && this.vantage.id !== v.id) this.vantage.onExit?.();
    this.active = true;
    this.vantage = v;
    this.optic = v.optic ?? humanOptic();
    this.zoomIdx = 0;
    this.manualPalette = null;
    this.lrf = null;
    this.nuc = 0;
    this._nucAt = performance.now();
    this._enteredAt = performance.now();
    const c = this.viewer.scene.screenSpaceCameraController;
    c.enableRotate = c.enableTranslate = c.enableZoom = c.enableTilt = c.enableLook = false;
    if (!wasActive) this._savedFov = this.viewer.camera.frustum.fov;
    this.heading = rad(v.headingDeg ?? 0);
    this.pitch = rad(this.optic.reticle === 'gimbal' ? -18 : -2.5);
    this.fov = fovAtZoom(this.optic, this.zoom);
    $('#fpv-overlay').classList.remove('hidden');
    this._ensureHud();
    this._chrome();
    this._apply();
    this._startLoop();
    v.onEnter?.();
    this.onEnter?.(v);
    this.opts.onVantageChange?.(v);
  }

  /** 관측점만 갈아끼운다 (1인칭 상태 유지) */
  switchTo(vantage) { this.enter(vantage); }

  _release() {
    this.active = false;
    // 인계로 돌려 둔 부채꼴을 그대로 두고 나가면, 나중에 계획을 열었을 때
    // 자기가 언제 바꿨는지 모르는 지향이 남는다.
    if (this._cueRestore) this.restoreAims();
    this.lock = null;
    this.cueResults = null;
    this.cueSummaryText = null;
    this._lastFrame = null;
    this._stopLoop();
    this.fx.set(null);
    const c = this.viewer.scene.screenSpaceCameraController;
    c.enableRotate = c.enableTranslate = c.enableZoom = c.enableTilt = c.enableLook = true;
    this.viewer.camera.frustum.fov = this._savedFov ?? rad(60);
    $('#fpv-overlay').classList.add('hidden');
    this.hud?.clear();
    const v = this.vantage;
    this.vantage = null;
    v?.onExit?.();
    this.onExit?.(v);
  }

  /** 카메라는 그대로 두고 시점만 해제 (도보/드론 전환용) */
  exitSilent() {
    if (!this.active) return;
    this._release();
  }

  exit() {
    if (!this.active) return;
    const v = this.vantage;
    this._release();
    // 궤도 시점 복귀 — 관측점 상공
    const lon = v?.lon ?? SITE.gp.lon;
    const lat = v?.lat ?? SITE.gp.lat;
    const groundH = v?.groundH ?? 0;
    this.viewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(lon, lat - 0.012, groundH + 1500),
      orientation: { heading: 0, pitch: rad(-35), roll: 0 },
      duration: 1.6,
    });
  }

  // ══════════════════════════════════════════════════════════════════════
  // 광학 조작
  // ══════════════════════════════════════════════════════════════════════
  get zoom() { return this.optic.zooms[this.zoomIdx] ?? 1; }

  stepZoom(dir) {
    const n = this.optic.zooms.length;
    const next = Math.max(0, Math.min(n - 1, this.zoomIdx + (dir > 0 ? 1 : -1)));
    if (next === this.zoomIdx) return;
    this.zoomIdx = next;
    this.fov = fovAtZoom(this.optic, this.zoom);
    this._apply();
    this._chrome();
  }

  setZoomIdx(i) {
    this.zoomIdx = Math.max(0, Math.min(this.optic.zooms.length - 1, i));
    this.fov = fovAtZoom(this.optic, this.zoom);
    this._apply();
    this._chrome();
  }

  /** 극성 전환 — 열상 백열/흑열, 드론 EO/IR */
  togglePalette() { this.togglePolarity(); }

  togglePolarity() {
    const cur = this._palette();
    if (this.optic.band === 'lwir') {
      this.manualPalette = cur === 'wh' ? 'bh' : 'wh';
    } else if (this.optic.polarity) {
      // 드론 짐벌 — EO ↔ IR 채널 전환
      this.manualPalette = cur === 'wh' || cur === 'bh' ? null : 'wh';
    } else {
      this.opts.toast?.('이 광학은 극성 전환을 지원하지 않습니다', 2200);
      return;
    }
    this._chrome();
    this.opts.toast?.(`화면 극성 — ${this._palette().toUpperCase()}`, 1800);
  }

  /** 맨눈 ↔ 쌍안경 (사람이 서 있는 관측점에서만) */
  toggleBino() {
    if (!['naked', 'bino'].includes(this.optic.id)) return;
    this.optic = this.optic.id === 'naked' ? OPTICS.bino : OPTICS.naked;
    this.zoomIdx = 0;
    this.fov = fovAtZoom(this.optic, this.zoom);
    this._apply();
    this._chrome();
    this.opts.toast?.(this.optic.id === 'bino' ? '쌍안경 — 휠로 배율단' : '맨눈 관측', 2000);
  }

  /** 레이저 거리측정 — 조준선이 실제로 닿는 지형 지점까지 */
  fireLrf() {
    if (!this.optic.lrf) { this.opts.toast?.('이 광학에는 거리측정기가 없습니다', 2200); return; }
    const cam = this.viewer.camera;
    const ray = new Cesium.Ray(Cesium.Cartesian3.clone(cam.positionWC), Cesium.Cartesian3.clone(cam.directionWC));
    const hit = this.viewer.scene.globe.pick(ray, this.viewer.scene);
    if (!hit) { this.lrf = null; this.opts.toast?.('LRF — 반사 없음 (하늘)', 1800); return; }
    const carto = Cesium.Cartographic.fromCartesian(hit);
    this.lrf = {
      dist: Cesium.Cartesian3.distance(cam.positionWC, hit),
      lon: deg(carto.longitude), lat: deg(carto.latitude), h: carto.height,
    };
    this._chrome();
  }

  /** 비균일성 보정 — 셔터가 닫히는 0.7초 */
  runNuc() {
    if (!this.optic.nuc) return;
    this.nuc = 1;
    this._nucAt = performance.now();
  }

  /** 이 관측점의 센서 피드 창을 연다 — 1인칭과 관제창을 오갈 수 있게 */
  openFeed() {
    const src = this.vantage?.feedSource;
    if (!src) { this.opts.toast?.('이 관측점에는 피드 채널이 없습니다', 2200); return; }
    this.opts.openFeed?.(src);
  }

  // ══════════════════════════════════════════════════════════════════════
  // 표적 추적 — 「보인다」에서 「무엇이 어디로 가고 있다」로
  // ══════════════════════════════════════════════════════════════════════

  /** 화면 좌표에서 가장 가까운 표적을 문다 (관용 반경 안). */
  _lockAtScreen(clientX, clientY) {
    const rect = this.viewer.canvas.getBoundingClientRect();
    const x = clientX - rect.left, y = clientY - rect.top;
    const cand = (this._lastFrame?.targets ?? [])
      .map((t) => ({ t, d2: (t.x - x) ** 2 + (t.y - y) ** 2 }))
      .filter((c) => c.d2 < 90 * 90)
      .sort((a, b) => a.d2 - b.d2)[0];
    if (cand) this._setLock(cand.t);
  }

  /**
   * 조준선에 각도상 가장 가까운 탐지를 문다 (T).
   *
   * 화면 안이 아니라 **부채꼴 안**에서 고른다 — ×8 로 당겨 놓고도 옆에 잡힌 것을
   * 물 수 있어야 자동추적이 의미를 갖는다(물면 짐벌이 그쪽으로 돌아간다).
   */
  lockNearest() {
    const list = this._lastFrame?.detections ?? [];
    if (!list.length) { this.opts.toast?.('감시 부채꼴 안에 판정된 표적이 없습니다', 2600); return; }
    const best = list
      .map((t) => ({
        t,
        off: Math.abs(azDelta(t.bearingDeg, deg(this.heading))) + Math.abs(t.elevationDeg - deg(this.pitch)),
      }))
      .sort((a, b) => a.off - b.off)[0];
    this._setLock(best.t);
  }

  _setLock(t) {
    this.lock = { key: t.key, id: t.trackId, name: t.label, lockedAt: performance.now(), lostAt: null };
    this.opts.toast?.(
      `${t.trackId} 추적 개시 — ${t.grade} ${Math.round(t.d)}m`
      + (this.optic.tracker ? ` · 자동추적 ${this.optic.slewDegS}°/s` : ' · 수동 (지시선 표시)'), 3400);
    this._chrome();
  }

  unlock(why) {
    if (!this.lock) return;
    const id = this.lock.id;
    this.lock = null;
    this.cueResults = null;
    if (why) this.opts.toast?.(`${id} 추적 해제 — ${why}`, 2400);
    this._chrome();
  }

  /**
   * 자동추적 슬루. 무한히 빠르지 않다 — 최대 각속도가 있어야 「빠른 표적을
   * 놓친다」가 성립하고, 그 한계가 곧 그 장비의 성능이다.
   */
  _autoSlew(target, dtS) {
    if (!this.optic.tracker || !target) return;
    const maxStep = rad(this.optic.slewDegS ?? 20) * Math.min(0.2, dtS);
    const dH = ((rad(target.bearingDeg) - this.heading + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
    const dP = rad(target.elevationDeg) - this.pitch;
    this.heading += Math.max(-maxStep, Math.min(maxStep, dH));
    this.pitch = Math.max(rad(-85), Math.min(rad(60), this.pitch + Math.max(-maxStep, Math.min(maxStep, dP))));
    this._apply();
  }

  // ══════════════════════════════════════════════════════════════════════
  // 교차표적지정 — 내가 본 것을 우리가 보는 것으로
  // ══════════════════════════════════════════════════════════════════════

  /**
   * 인계 대상 목록 — 배치 초소 **와 떠 있는 드론**.
   *
   * 공중의 기체를 빼놓으면 인계가 반쪽이 된다. 드론에게 「지향을 돌린다」는
   * 부채꼴 회전이 아니라 **순찰 중심을 그 표적 위로 옮기는 것**이고, 그것이
   * 이 편대가 표적을 인계받는 방식이다.
   */
  _cuePosts() {
    const posts = (this.state.posts?.list() ?? []).map((p) => {
      const t = POST_TYPE[p.type] ?? {};
      return {
        uid: p.uid, name: p.name, type: p.type, short: t.short ?? p.type,
        color: t.color ?? '#9aa7b2', lon: p.lon, lat: p.lat,
        eyeH: this.state.posts.eyeH(p), aimAz: p.aimAz, fov: t.fov ?? 90, feed: t.feed ?? 'none',
        drone: false,
      };
    });
    const drones = (this.state.fleet?.watchAssets() ?? []).map((a) => ({
      uid: a.uid, name: a.name, type: a.type, short: a.short, color: a.color,
      lon: a.lon, lat: a.lat, eyeH: a.eyeH, aimAz: a.aimAz, fov: a.fov,
      feed: 'drone', drone: true,
    }));
    return [...posts, ...drones];
  }

  /**
   * 잡고 있는 표적을 다른 자산에 넘긴다.
   *
   * 넘긴다는 것은 목록을 보여 주는 일이 아니라 **부채꼴을 실제로 돌리는 일**이다.
   * 그래서 지도의 부채꼴이 그 자리에서 움직이고, 되돌릴 수 있도록 이전 지향을 기억한다.
   */
  crossCue() {
    const tgt = this._lockedPoint();
    if (!tgt) { this.opts.toast?.('먼저 표적을 잡으세요 (T 또는 표적 클릭)', 2800); return; }
    if (this._cueRestore) { this.restoreAims(); return; }

    const posts = this._cuePosts();
    if (!posts.length) { this.opts.toast?.('배치된 감시자산이 없습니다', 2800); return; }
    const st = this.state;
    const results = cueSolution(posts, tgt, {
      perfOf: (p) => {
        if (p.drone) return st.watch?.extraPerf?.(p) ?? null;
        return POST_TYPE[p.type]?.feed === 'none' ? null : st.posts.perfOf(st.posts.get(p.uid));
      },
      // 공중의 기체에는 능선 차폐가 사실상 없다 — 그것이 드론을 띄우는 이유다
      losOk: st.grid ? (p, lon, lat) => (p.drone
        ? true
        : losClear(st.grid, p.lon, p.lat, p.eyeH, lon, lat)) : null,
    });
    this.cueResults = results;
    this.cueSummaryText = cueSummary(results);

    // 실제로 돌린다 — 되돌릴 수 있게 이전 지향을 기억해 두고
    const movers = cueable(results).filter((r) => r.verdict === 'SLEW');
    if (movers.length) {
      this._cueRestore = movers.map((r) => (r.post.drone
        ? { uid: r.post.uid, drone: true, patrol: (() => {
          const d = st.fleet.get(r.post.uid);
          return { lon: d.patrolLon, lat: d.patrolLat, radiusM: d.radiusM };
        })() }
        : { uid: r.post.uid, aimAz: r.post.aimAz }));
      for (const r of movers) {
        if (r.post.drone) {
          // 드론에게 「지향 전환」은 순찰 중심을 그 표적 위로 옮기는 일이다
          st.fleet.setPatrol(r.post.uid, tgt.lon, tgt.lat);
          r.reason = '순찰 중심을 표적 위로 이동';
        } else {
          st.posts.update(r.post.uid, { aimAz: r.bearingDeg });
          // 「지향 전환 필요」는 돌리기 전의 판정이다 — 돌린 뒤에는 그렇게 적으면 안 된다
          r.reason = `지향 ${Math.round(r.slewDeg)}° 전환함`;
        }
        r.moved = true;
      }
    }
    // 가장 좋은 두 채널을 관제창으로 띄운다
    for (const r of cueable(results).slice(0, 2)) {
      if (r.post.drone) this.opts.openFeed?.({ kind: 'drone' });
      else if (r.post.feed !== 'none') this.opts.openFeed?.({ kind: 'post', uid: r.post.uid });
    }
    this.opts.toast?.(`${this.lock.id} 인계 — ${this.cueSummaryText}`
      + (movers.length ? ` · ${movers.length}개 지향 전환 (C 다시 누르면 복원)` : ''), 6000);
    this._chrome();
  }

  /** 인계로 돌린 지향을 원래대로 — 계획을 실수로 바꿔 두고 나가지 않게. */
  restoreAims() {
    if (!this._cueRestore?.length) { this._cueRestore = null; return; }
    for (const r of this._cueRestore) {
      if (r.drone) {
        this.state.fleet?.setPatrol(r.uid, r.patrol.lon, r.patrol.lat);
        this.state.fleet?.update(r.uid, { radiusM: r.patrol.radiusM });
      } else {
        this.state.posts?.update(r.uid, { aimAz: r.aimAz });
      }
    }
    this.opts.toast?.(`지향 복원 — ${this._cueRestore.length}개 자산`, 2800);
    this._cueRestore = null;
    this.cueResults = null;
    this._chrome();
  }

  // ══════════════════════════════════════════════════════════════════════
  // 조명 지원 — 밤을 30초 동안 되돌린다
  // ══════════════════════════════════════════════════════════════════════

  /** 조준선이 지금 닿는 지형 지점 (하늘을 보고 있으면 null). */
  _boresightPoint() {
    const cam = this.viewer.camera;
    const ray = new Cesium.Ray(Cesium.Cartesian3.clone(cam.positionWC), Cesium.Cartesian3.clone(cam.directionWC));
    const hit = this.viewer.scene.globe.pick(ray, this.viewer.scene);
    if (!hit) return null;
    const c = Cesium.Cartographic.fromCartesian(hit);
    return { lon: deg(c.longitude), lat: deg(c.latitude), h: c.height };
  }

  requestIllumination() {
    const fs = this.state.fireSupport;
    if (!fs) return;
    // 조명은 「저기」라고 가리키면 되는 것이다 — 표적을 물고 있으면 그 표적 위로,
    // 아니면 측거점, 그것도 없으면 **지금 조준선이 닿는 땅** 위로 올린다.
    const tgt = this._lockedPoint()
      ?? (this.lrf ? { lon: this.lrf.lon, lat: this.lrf.lat, h: this.lrf.h } : null)
      ?? this._boresightPoint();
    if (!tgt) { this.opts.toast?.('조명 지점을 정할 수 없습니다 — 지형을 겨누세요', 3200); return; }

    const launcher = (this.state.posts?.list() ?? []).find((p) => p.type === 'flare');
    if (!launcher) { this.opts.toast?.('조명탄 발사대가 배치되어 있지 않습니다 (감시 탭)', 3600); return; }
    const t = POST_TYPE.flare;
    // 사거리(어디까지 올려 줄 수 있는가)와 조명 반경(그 한 발이 밝히는 원)은 다르다
    const d = distM(launcher.lon, launcher.lat, tgt.lon, tgt.lat);
    if (d > t.dri[0]) {
      this.opts.toast?.(`조명 사거리 초과 — ${launcher.name} 에서 ${Math.round(d)}m (최대 ${t.dri[0]}m)`, 4000);
      return;
    }
    const env = this.state.env?.state;
    const shot = fs.fire({
      lon: tgt.lon, lat: tgt.lat, groundH: tgt.h ?? this.state.ents?.groundH ?? 0,
      byUid: launcher.uid, byName: launcher.name,
      specRadiusM: ILLUM_RADIUS_M, visibilityMeters: env?.weather?.visibilityMeters ?? 20000,
      nowMs: performance.now(),
    });
    this.opts.toast?.(
      `${launcher.name} 조명 발사 — 반경 ${Math.round(shot.radiusM)}m · ${BURN_S}초`
      + (shot.backscatter ? ' · 역산란 주의 (저시정)' : ''), 4200);
  }

  // ══════════════════════════════════════════════════════════════════════
  // 관측보고 — 화면 한 장을 보고문 한 장으로
  // ══════════════════════════════════════════════════════════════════════

  captureSpotrep() {
    const f = this._lastFrame;
    if (!f) return;
    const atm = f.atm;
    const tr = f.track;
    const point = this._lockedPoint()
      ?? (this.lrf ? { lon: this.lrf.lon, lat: this.lrf.lat, h: this.lrf.h } : null);

    const input = {
      dtg: this._dtg(),
      observer: {
        name: this.vantage.name, optic: this.optic.name, tag: this.vantage.tag ?? 'CH1',
        mgrs: toMGRS(f.cam.lon, f.cam.lat), eyeH: f.cam.eyeH,
        azDeg: f.cam.az, elDeg: f.cam.el, zoom: this.zoom, palette: f.palette,
      },
      target: {
        trackId: tr?.id ?? null,
        name: tr?.name ?? null,
        mgrs: point ? toMGRS(point.lon, point.lat) : '미상',
        distM: tr?.distM ?? this.lrf?.dist ?? 0,
        bearingDeg: tr?.bearingDeg ?? f.cam.az,
        elevationM: point?.h ?? null,
        grade: tr?.grade ?? '—',
        pd: tr?.pd ?? null,
        speedMps: tr?.speedMps ?? null,
        courseDeg: tr?.courseDeg ?? null,
        observedS: tr ? tr.holdS : null,
        etaToGpS: tr?.etaToGpS ?? null,
        distToGpM: tr?.distToGpM ?? (point ? distM(point.lon, point.lat, SITE.gp.lon, SITE.gp.lat) : null),
        source: tr ? 'track' : this.lrf ? 'lrf' : 'aim',
      },
      conditions: {
        weather: atm?.weatherLabel ?? '—',
        tempC: atm?.temperatureC ?? 0,
        windMps: atm?.windMps ?? 0,
        visibilityM: atm?.visibilityMeters ?? 0,
        lux: atm?.lux ?? 0,
        deltaT: atm?.deltaT ?? 0,
        illuminated: !!f.illuminated,
        snowCover: atm?.snowCover ?? 0,
      },
      performance: f.perf ? {
        rangeM: f.perf.range, specRangeM: f.perf.specRange,
        limiter: f.perf.limiter, verdict: f.perf.verdict, note: f.perf.note,
      } : null,
      cue: this.cueSummaryText,
    };
    this.opts.onSpotrep?.({ text: buildSpotrep(input), input });
  }

  /** 지금 잡고 있는 표적의 지상 좌표 (없으면 null) */
  _lockedPoint() {
    if (!this.lock) return null;
    const u = (this.state.infil?.units ?? []).find((x) => x.rd?.route?.id === this.lock.key);
    if (!u) return null;
    try {
      const p = this.state.infil._state(u).p;
      return { lon: p.lon, lat: p.lat, h: p.h ?? this.state.ents?.groundH ?? 0 };
    } catch { return null; }
  }

  _palette() {
    return resolvePalette(this.optic, {
      manual: this.manualPalette,
      lux: this.state.env?.state?.illuminanceLux,
    });
  }

  // ══════════════════════════════════════════════════════════════════════
  // 카메라
  // ══════════════════════════════════════════════════════════════════════
  _eyeH() {
    const v = this.vantage;
    return (v?.groundH ?? 0) + (v?.height ?? 0) + EYE_OFFSET_M;
  }

  _apply() {
    const v = this.vantage;
    if (!v) return;
    this.viewer.camera.setView({
      destination: Cesium.Cartesian3.fromDegrees(v.lon, v.lat, this._eyeH()),
      orientation: { heading: this.heading, pitch: this.pitch, roll: 0 },
    });
    this.viewer.camera.frustum.fov = rad(this.fov);
  }

  // ══════════════════════════════════════════════════════════════════════
  // 프레임 루프 — HUD 는 매 프레임 다시 그린다
  // ══════════════════════════════════════════════════════════════════════
  _ensureHud() {
    if (!this.hud) {
      const cv = $('#fpv-hud');
      if (!cv) return;
      this.hud = new OpticHud(cv);
    }
    const wrap = $('#map-wrap');
    this.hud.setSize(wrap.clientWidth, wrap.clientHeight);
  }

  _startLoop() {
    if (this._raf) return;
    const step = () => {
      if (!this.active) { this._raf = null; return; }
      // 프레임 예외를 통째로 삼키면 계기가 빈 채로 조용히 돌아간다 — 뷰어 파괴
      // 경합은 무시하되, 처음 한 번은 반드시 남긴다.
      try {
        this._frame();
      } catch (e) {
        if (!this._frameErrLogged) {
          this._frameErrLogged = true;
          console.warn('[fpv] HUD 프레임 오류 — 계기가 갱신되지 않습니다', e);
        }
      }
      this._raf = requestAnimationFrame(step);
    };
    this._raf = requestAnimationFrame(step);
  }

  _stopLoop() {
    if (this._raf) cancelAnimationFrame(this._raf);
    this._raf = null;
  }

  _frame() {
    const v = this.vantage;
    if (!v || !this.hud) return;
    this._ensureHud();

    const env = this.state.env?.state ?? null;
    const atm = env ? atmosphereOf(env) : null;
    const palette = this._palette();

    // NUC 진행
    const now = performance.now();
    const dtS = Math.min(0.25, (now - (this._lastFrameAt ?? now)) / 1000);
    this._lastFrameAt = now;
    if (this.optic.nuc && this.nuc <= 0 && (now - this._nucAt) / 1000 > NUC_PERIOD_S) this.runNuc();
    if (this.nuc > 0) {
      this.nuc = Math.max(0, 1 - (now - this._nucAt) / 1000 / NUC_DURATION_S);
      if (this.nuc <= 0) this._nucAt = now;
    }

    // 화면 변환 (열상/야시/레이더 인광)
    this.fx.set(palette, { deltaT: atm?.deltaT, lux: atm?.lux });

    // 조명 지원은 「자산이 있다」가 아니라 「내가 보는 땅이 지금 밝은가」로 판정한다.
    // 판정 기준은 이 광학의 감시 부채꼴 — 지도의 초소 부채꼴과 같은 규칙을 쓴다.
    const illuminated = !!this.state.fireSupport?.illuminatesFan(
      {
        lon: v.lon, lat: v.lat,
        aimAz: v.headingDeg ?? deg(this.heading),
        fovDeg: this.optic.spec?.fov ?? 90,
        rangeM: this.optic.spec?.dri?.[0] ?? 2000,
      },
      now, { distM, azimuthDeg, azDelta });

    const perf = atm && this.optic.spec
      ? effectiveRanges(this.optic.spec, atm, { illuminated })
      : null;

    const az = az360(deg(this.heading));
    const el = deg(this.pitch);
    const cam = { lon: v.lon, lat: v.lat, eyeH: this._eyeH(), az, el };

    const dets = this._detections(perf, cam, now);
    const targets = dets.filter((t) => t.onScreen);
    // 추적은 **탐지 목록**에서 찾는다 — 화면 밖으로 나갔다고 놓친 것이 아니다
    const track = this._trackState(dets, cam, now);
    // 자동추적은 표적을 「본 뒤」에 돌린다 — 이번 프레임의 판정으로 다음 프레임을 겨눈다
    if (this.lock && track && !track.lostS) this._autoSlew(track, dtS);

    const frame = {
      optic: this.optic,
      palette,
      zoom: this.zoom,
      fov: this.fov,
      dtg: this._dtg(),
      cam,
      vantage: { name: v.name, sub: v.sub, tag: v.tag, groundH: v.groundH ?? 0, height: v.height ?? 0 },
      perf,
      atm,
      lrf: this.lrf,
      targets,
      detections: dets,
      track,
      cue: this._cueState(track, cam),
      cueResults: this.cueResults?.map((r) => ({
        name: r.post.name, color: r.post.color, distM: r.distM, grade: r.grade,
        verdict: r.verdict, moved: !!r.moved,
      })) ?? null,
      flare: this._flareState(now),
      alert: this.state.watch?.activeAlert(now) ?? null,
      weaponEntry: this._weaponEntry(track),
      plan: this._planState(dets, cam, now),
      illuminated,
      nowS: now / 1000,
      nuc: this.nuc,
      rec: true,
      sector: {
        from: az360(SITE.sector.centerAz - (SITE.sector.halfAngle ?? 0)),
        to: az360(SITE.sector.centerAz + (SITE.sector.halfAngle ?? 0)),
      },
      extra: this._extra(perf, atm, cam),
    };
    this._lastFrame = frame;
    this.hud.draw(frame);
  }

  /**
   * 잠긴 표적의 지금 상태. 항적부(TrackBook)가 시간을 들고 있으므로 속도·진로·
   * 도달시간은 거기서 나온다 — 이 함수는 계기가 읽을 모양으로 옮길 뿐이다.
   */
  _trackState(targets, cam, nowMs) {
    if (!this.lock) return null;
    const hit = targets.find((t) => t.key === this.lock.key);
    if (!hit) {
      // 놓치는 중 — 3초 안에 다시 잡히지 않으면 해제한다
      this.lock.lostAt ??= nowMs;
      const lostS = (nowMs - this.lock.lostAt) / 1000;
      if (lostS > 3) { this.unlock('가시선 상실'); return null; }
      const last = this._lastFrame?.track;
      return last ? { ...last, lostS } : null;
    }
    this.lock.lostAt = null;

    const book = this.state.tracks;
    const rec = book?.get(this.lock.key);
    const k = rec ? kinematics(rec.hist) : { ok: false };
    const p = this._lockedPoint();
    const distToGpM = p ? distM(p.lon, p.lat, SITE.gp.lon, SITE.gp.lat) : 0;
    const closing = p && k.ok ? closingRateMps(k, p.lon, p.lat, SITE.gp.lon, SITE.gp.lat) : 0;

    return {
      id: this.lock.id,
      key: this.lock.key,
      name: this.lock.name,
      // 이 표적을 지금 함께 잡고 있는 자산 — 상시 감시가 이미 판정해 둔 값을 읽는다
      holders: this.state.watch?.holdersOf(this.lock.key) ?? [],
      holdS: (nowMs - this.lock.lockedAt) / 1000,
      lostS: null,
      bearingDeg: hit.bearingDeg,
      elevationDeg: hit.elevationDeg,
      distM: hit.d,
      grade: hit.grade,
      pd: hit.pd,
      speedMps: k.ok ? k.speedMps : null,
      courseDeg: k.ok && k.speedMps > 0.1 ? k.courseDeg : null,
      distToGpM,
      etaToGpS: etaSeconds(distToGpM, closing),
    };
  }

  /**
   * 이 항적이 배치된 화기 사거리에 언제 드는가.
   *
   * 「사거리 밖」은 정지한 표적의 말이다. 움직이는 표적에는 **몇 초 뒤에 든다**가
   * 답이고, 그 숫자가 있어야 조명 요청·사격 준비 시점을 정할 수 있다.
   */
  _weaponEntry(track) {
    if (!track || track.lostS != null) return null;
    const st = this.state;
    const p = this._lockedPoint();
    if (!p) return null;
    const weapons = (st.posts?.list() ?? [])
      .filter((q) => POST_TYPE[q.type]?.band === 'eye')
      .map((q) => {
        const t = POST_TYPE[q.type];
        const perf = st.posts.perfOf(q);
        return {
          uid: q.uid, name: q.name, short: t.short, color: t.color,
          lon: q.lon, lat: q.lat, rangeM: perf?.range ?? t.dri[0],
        };
      });
    if (!weapons.length) return null;
    const rec = st.tracks?.get(track.key);
    return weaponEntry(p, rec ? kinematics(rec.hist) : null, weapons, { horizonS: 900, stepS: 10 });
  }

  /** 잠긴 표적이 화면 밖이면 지시선을 띄운다 (자동추적이 없는 광학에서 특히). */
  _cueState(track, cam) {
    if (!track) return null;
    const dAz = azDelta(track.bearingDeg, cam.az);
    const dEl = track.elevationDeg - cam.el;
    return {
      trackId: track.id,
      screenAzDeg: dAz,
      screenElDeg: dEl,
      onScreen: Math.abs(dAz) < this.fov * 0.45 && Math.abs(dEl) < this.fov * 0.3,
    };
  }

  /** 지금 타고 있는 조명탄 중 가장 밝은 것 */
  _flareState(nowMs) {
    const act = this.state.fireSupport?.active(nowMs) ?? [];
    if (!act.length) return null;
    const s = act[0];
    return {
      active: true, intensity: s.intensity, remainS: s.remainS, burnS: BURN_S,
      radiusM: s.radiusM, aglM: flareAglM(s.elapsedS), backscatter: s.backscatter,
    };
  }

  /** 평면 미니맵에 넣을 것 — 접안경 안에서 방향을 잃지 않도록 */
  _planState(targets, cam, nowMs) {
    const bearing = (lon, lat) => azimuthDeg(cam.lon, cam.lat, lon, lat);
    const book = this.state.tracks;
    return {
      gp: {
        bearingDeg: bearing(SITE.gp.lon, SITE.gp.lat),
        distM: distM(cam.lon, cam.lat, SITE.gp.lon, SITE.gp.lat),
      },
      contacts: targets.map((t) => {
        const k = book?.get(t.key) ? kinematics(book.get(t.key).hist) : { ok: false };
        return {
          bearingDeg: t.bearingDeg, distM: t.d, locked: !!t.locked,
          courseDeg: k.ok ? k.courseDeg : null, speedMps: k.ok ? k.speedMps : 0,
        };
      }),
      predict: this._predictState(cam),
      flares: (this.state.fireSupport?.active(nowMs) ?? []).map((s) => ({
        bearingDeg: bearing(s.lon, s.lat),
        distM: distM(cam.lon, cam.lat, s.lon, s.lat),
        radiusM: s.radiusM, intensity: s.intensity,
      })),
    };
  }

  /**
   * 화면에 타는 시각은 **시뮬레이션 시각**이어야 한다 — 화면이 어두운 이유가
   * 그 시각의 태양고도인데 벽시계를 찍어 놓으면 그 둘이 어긋난다.
   */
  _dtg() {
    const s = this.state.env?.state;
    if (!s) return 'DTG —';
    const md = monthDayOf(s.settings.dayOfYear);
    const sec = Math.floor((performance.now() / 1000) % 60);
    return `DTG ${String(md.month).padStart(2, '0')}${String(md.day).padStart(2, '0')} `
      + `${formatClock(s.settings.minuteOfDay)}:${String(sec).padStart(2, '0')}K`;
  }

  /**
   * 탐지 목록 — 「이 자산이 지금 무엇을 잡고 있는가」.
   *
   * **화면에 보이는 것과 센서가 잡은 것은 다르다.** ×8 로 당긴 TOD 의 화면은 3°
   * 남짓이지만, 그 거치대의 감시 부채꼴은 60° 다. 부채꼴 안에서 유효거리·지형
   * 가시선을 통과한 것은 화면 밖에 있어도 **탐지된 것**이고, 그래서 추적을 걸면
   * 짐벌이 그쪽으로 돌아갈 수 있다. 실물 추적기도 화면이 아니라 표적파일에서 문다.
   *
   * 화면에 브래킷으로 뜨는 것은 이 목록에서 **투영이 화면 안에 떨어진 부분집합**뿐이다.
   */
  _detections(perf, cam, nowMs = performance.now()) {
    const st = this.state;
    const units = st.infil?.units;
    if (!perf || !units?.length) return [];
    const scene = this.viewer.scene;
    const toWindow = Cesium.SceneTransforms.worldToWindowCoordinates
      ?? Cesium.SceneTransforms.wgs84ToWindowCoordinates;
    // 감시 부채꼴 = 거치대가 맡은 구역. 배율을 당겨도 이 구역이 좁아지지는 않는다.
    const regardHalf = Math.min(180, (this.optic.spec?.fov ?? 90) / 2);
    const regardAz = this.vantage.headingDeg ?? cam.az;
    const out = [];
    for (const u of units) {
      let sState;
      try { sState = st.infil._state(u); } catch { continue; }
      const p = sState?.p;
      if (!p) continue;
      const d = distM(cam.lon, cam.lat, p.lon, p.lat);
      if (d > perf.range) continue;
      const bearing = azimuthDeg(cam.lon, cam.lat, p.lon, p.lat);
      if (Math.abs(azDelta(bearing, regardAz)) > regardHalf) continue;
      if (st.grid && !losClear(st.grid, cam.lon, cam.lat, cam.eyeH, p.lon, p.lat)) continue;

      // 관측된 것에는 번호가 붙는다 — 번호가 있어야 인계도 보고도 성립한다
      const key = u.rd?.route?.id ?? `u${out.length}`;
      const name = u.rd?.route?.name?.split(' — ')[0] ?? '';
      const rec = st.tracks?.observe(key, name, { t: nowMs, lon: p.lon, lat: p.lat, h: p.h ?? 0 });

      const targetH = (p.h ?? st.ents?.groundH ?? 0) + 0.9;
      const curve = (d * d) / (2 * 6371008.8) * 0.87;
      const p3 = Cesium.Cartesian3.fromDegrees(p.lon, p.lat, targetH);
      const win = toWindow(scene, p3);
      const onScreen = !!win
        && win.x > -60 && win.x < this.hud.w + 60
        && win.y > -60 && win.y < this.hud.h + 60;

      out.push({
        key,
        trackId: rec?.id ?? null,
        locked: this.lock?.key === key,
        d,
        bearingDeg: bearing,
        elevationDeg: deg(Math.atan2(targetH - curve - cam.eyeH, Math.max(1, d))),
        grade: d <= perf.dri[2] ? '식별' : d <= perf.dri[1] ? '인지' : '탐지',
        pd: detectionProbability(perf, d),
        label: name,
        onScreen,
        x: win?.x ?? 0,
        y: win?.y ?? 0,
      });
    }
    return out;
  }

  /** 화면에 브래킷으로 그릴 것만 — 「보인다」가 주장이 아니라 판정이 되는 자리. */
  _targets(perf, cam, nowMs) {
    return this._detections(perf, cam, nowMs).filter((t) => t.onScreen);
  }

  /** 자산별 계기에 넣을 값 — 값이 없으면 계기도 뜨지 않는다 */
  _extra(perf, atm, cam) {
    const o = this.optic;
    const st = this.state;
    const extra = {};

    if (o.gauges.includes('ppi') && perf) {
      const contacts = [];
      for (const u of st.infil?.units ?? []) {
        let s; try { s = st.infil._state(u); } catch { continue; }
        if (!s?.p) continue;
        const d = distM(cam.lon, cam.lat, s.p.lon, s.p.lat);
        if (d > perf.range) continue;
        if (st.grid && !losClear(st.grid, cam.lon, cam.lat, cam.eyeH, s.p.lon, s.p.lat)) continue;
        contacts.push({ az: azimuthDeg(cam.lon, cam.lat, s.p.lon, s.p.lat), d });
      }
      extra.ppi = {
        aim: cam.az, fov: o.spec.fov ?? 120,
        specR: perf.specRange, effR: perf.range,
        clutterDb: atm?.clutterDb ?? 0, gammaDbPerKm: atm?.gammaDbPerKm ?? 0,
        contacts,
      };
    }

    if (o.gauges.includes('audio')) {
      // 방위 24구간 수신강도 — 풍잡음이 바닥을 들어올리고, 표적이 그 위로 솟는다
      const bins = new Array(36).fill(0);
      const floor = Math.min(0.5, (atm?.windMps ?? 0) / 18);
      for (let i = 0; i < bins.length; i++) bins[i] = floor * (0.6 + Math.random() * 0.4);
      for (const u of st.infil?.units ?? []) {
        let s; try { s = st.infil._state(u); } catch { continue; }
        if (!s?.p) continue;
        const d = distM(cam.lon, cam.lat, s.p.lon, s.p.lat);
        if (!perf || d > perf.range) continue;
        const b = Math.floor(az360(azimuthDeg(cam.lon, cam.lat, s.p.lon, s.p.lat)) / 10) % 36;
        bins[b] = Math.min(1, bins[b] + 0.9 * (1 - d / perf.range));
      }
      extra.audio = { bins };
    }

    if (o.gauges.includes('rf')) {
      extra.rf = {
        bands: [
          { label: '2.4G', on: true, level: 0.86 },
          { label: '5.8G', on: true, level: 0.78 },
          { label: 'GNSS', on: true, level: 0.62 },
          { label: '900M', on: false, level: 0.12 },
        ],
      };
    }

    if (o.gauges.includes('ballistic') && perf) {
      const d = this.lrf?.dist ?? null;
      const maxM = perf.specRange;
      const wind = atm?.windMps ?? 0;
      extra.fire = d ? {
        inRange: d <= maxM,
        mil: Math.round(superElevationMil(Math.min(d, maxM * 1.4))),
        // 측풍 편류 — 비행시간 × 횡풍. 조준경 눈금이 곧 이 값이다.
        drift: Math.round(windDriftMil(d, wind)),
        maxM, tofS: timeOfFlightS(d).toFixed(1),
      } : null;
      // 조준선 사다리 — 400m 단위. 눈금 간격이 위로 갈수록 좁아지는 것은
      // 낙차가 거리의 제곱으로 늘기 때문이지, 보기 좋으라고 그런 것이 아니다.
      extra.ballistic = [400, 800, 1200, 1600, 2000]
        .filter((r) => r <= maxM * 1.05)
        .map((r) => ({
          label: r >= 1000 ? `${r / 1000}k` : `${r}`,
          drop: superElevationMil(r),
          active: d != null && Math.abs(d - r) < 200,
        }));
    }

    if (o.gauges.includes('flight')) {
      const dr = st.drone;
      const groundH = st.ents?.groundH ?? 0;
      extra.flight = {
        aglM: dr?.aglM ?? (this.vantage.height ?? 0),
        mslM: groundH + (dr?.aglM ?? 0),
        gsMps: ((dr?.speedDegS ?? 3.2) * Math.PI / 180) * (dr?.radius ?? 900),
        orbitR: dr?.radius ?? 900,
        gimbal: dr?.gimbalPitch ?? deg(this.pitch),
        heading: cam.az,
        battery: this._battery(),
        endureMin: Math.round(this._battery() * 38),
      };
      const rangeM = distM(SITE.gp.lon, SITE.gp.lat, cam.lon, cam.lat);
      extra.link = {
        quality: Math.max(0.15, 1 - rangeM / 9000 - (atm?.precipitationRate ?? 0) / 60),
        latencyMs: Math.round(38 + rangeM / 120),
        mbps: Math.max(1.2, 12 - rangeM / 900),
        jam: false,
        rangeM,
      };
    }
    return extra;
  }

  /** 잠긴 표적의 60초 뒤 예측 위치 — 미니맵에 점선으로 눕힌다 (등속 직선만). */
  _predictState(cam) {
    if (!this.lock) return null;
    const p = this._lockedPoint();
    const rec = this.state.tracks?.get(this.lock.key);
    if (!p || !rec) return null;
    const q = deadReckon(p, kinematics(rec.hist), 60);
    if (!q) return null;
    return {
      fromBearingDeg: azimuthDeg(cam.lon, cam.lat, p.lon, p.lat),
      fromDistM: distM(cam.lon, cam.lat, p.lon, p.lat),
      toBearingDeg: azimuthDeg(cam.lon, cam.lat, q.lon, q.lat),
      toDistM: distM(cam.lon, cam.lat, q.lon, q.lat),
    };
  }

  /** 체공 배터리 — 진입 후 경과로 단조 감소. 관측시간이 무한하지 않다는 압박. */
  _battery() {
    const min = (performance.now() - this._enteredAt) / 60000;
    return Math.max(0.05, 1 - min / 38);
  }

  // ══════════════════════════════════════════════════════════════════════
  // 하단 조작 스트립 — 관측점 종류에 따라 구성 자체가 달라진다
  // ══════════════════════════════════════════════════════════════════════
  _chrome() {
    const v = this.vantage;
    if (!v) return;
    const o = this.optic;

    const badge = $('#fpv-optic');
    if (badge) {
      badge.textContent = o.short;
      badge.style.color = o.color;
      badge.style.borderColor = o.color;
    }
    const title = $('#fpv-title');
    if (title) title.textContent = v.name ?? '1인칭 관측';
    const sub = $('#fpv-sub');
    if (sub) sub.textContent = `${o.name}${v.sub ? ` · ${v.sub}` : ''}`;

    // 배율 단 칩
    const zr = $('#fpv-zooms');
    if (zr) {
      zr.innerHTML = o.zooms.map((z, i) =>
        `<button class="fpv-zchip ${i === this.zoomIdx ? 'is-active' : ''}" data-z="${i}">×${z}</button>`).join('');
      zr.querySelectorAll('[data-z]').forEach((b) => { b.onclick = () => this.setZoomIdx(+b.dataset.z); });
    }

    // 광학 조작 버튼 — 지원하지 않는 것은 아예 없다
    const tools = $('#fpv-tools');
    if (tools) {
      const pal = this._palette();
      const btns = [];
      if (o.band === 'lwir' || o.polarity) {
        btns.push(`<button class="fpv-tool" data-act="pol">${
          pal === 'bh' ? '흑열' : pal === 'wh' ? '백열' : 'EO'} <em>P</em></button>`);
      }
      if (o.lrf) btns.push(`<button class="fpv-tool ${this.lrf ? 'is-on' : ''}" data-act="lrf">측거 <em>L</em></button>`);
      if (o.nuc) btns.push('<button class="fpv-tool" data-act="nuc">NUC <em>N</em></button>');
      if (['naked', 'bino'].includes(o.id)) {
        btns.push(`<button class="fpv-tool ${o.id === 'bino' ? 'is-on' : ''}" data-act="bino">쌍안경 <em>B</em></button>`);
      }
      if (v.feedSource) btns.push('<button class="fpv-tool" data-act="feed">피드창 <em>F</em></button>');
      tools.innerHTML = btns.join('');
      tools.querySelectorAll('[data-act]').forEach((b) => {
        b.onclick = () => ({
          pol: () => this.togglePolarity(),
          lrf: () => this.fireLrf(),
          nuc: () => this.runNuc(),
          bino: () => this.toggleBino(),
          feed: () => this.openFeed(),
        })[b.dataset.act]?.();
      });
    }

    // ── 작전 조작 줄: 잡고 → 넘기고 → 밝히고 → 보고한다 ──
    const ops = $('#fpv-ops');
    if (ops && o.gauges?.includes('track')) {
      ops.style.display = '';
      const locked = !!this.lock;
      const cued = !!this._cueRestore;
      ops.innerHTML = [
        `<button class="fpv-op ${locked ? 'is-on' : ''}" data-op="track">`
          + `${locked ? `◉ ${this.lock.id} 추적 해제` : '◎ 표적 추적'} <em>T</em></button>`,
        `<button class="fpv-op ${cued ? 'is-on' : ''}" data-op="cue"`
          + `${locked ? '' : ' disabled'}>${cued ? '↩ 지향 복원' : '⇄ 자산 인계'} <em>C</em></button>`,
        '<button class="fpv-op" data-op="ill">✸ 조명 요청 <em>I</em></button>',
        `<button class="fpv-op" data-op="rep">${svgIcon('clipboard')} 관측보고 <em>S</em></button>`,
      ].join('');
      ops.querySelectorAll('[data-op]').forEach((b) => {
        b.onclick = () => ({
          track: () => (this.lock ? this.unlock('운용자 해제') : this.lockNearest()),
          cue: () => this.crossCue(),
          ill: () => this.requestIllumination(),
          rep: () => this.captureSpotrep(),
        })[b.dataset.op]?.();
      });
    } else if (ops) {
      ops.style.display = 'none';
      ops.innerHTML = '';
    }

    const row = $('#fpv-height-row');
    if (row) row.style.display = v.adjustable ? '' : 'none';
    const label = $('#fpv-height-label');
    if (label) label.textContent = v.heightLabel ?? '관측고';
    const slider = $('#fpv-height');
    if (slider && v.adjustable) {
      slider.min = v.minH ?? 2;
      slider.max = v.maxH ?? 40;
      slider.value = v.height;
    }
    const hv = $('#fpv-height-val');
    if (hv) hv.textContent = `${Math.round(v.height ?? 0)}m`;
    const cost = $('#fpv-cost');
    if (cost) {
      cost.style.display = v.costText ? '' : 'none';
      if (v.costText) cost.textContent = v.costText(v.height);
    }
    const hint = $('#fpv-hint');
    if (hint) hint.textContent = o.hint;
  }

  /** 높이·지반고가 바깥에서 바뀌었을 때 동기화 */
  sync() {
    if (!this.active || !this.vantage) return;
    const fresh = this.opts.resolveVantage?.(this.vantage.id);
    if (fresh) {
      // 운용자가 지금 들고 있는 광학(맨눈↔쌍안경 전환 등)은 재조회로 되돌리지 않는다
      const held = this.optic;
      this.vantage = fresh;
      if (['naked', 'bino'].includes(held.id) && ['naked', 'bino'].includes((fresh.optic ?? humanOptic()).id)) {
        this.optic = held;
      } else {
        this.optic = fresh.optic ?? humanOptic();
      }
    }
    const slider = $('#fpv-height');
    if (slider && this.vantage.adjustable) slider.value = this.vantage.height;
    this._apply();
    this._chrome();
  }
}

// 하위호환 별칭 — 예전 이름으로 import 하던 곳이 남아 있어도 깨지지 않는다.
export { FirstPersonView as TowerFPV };
