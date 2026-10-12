// @ts-nocheck
/**
 * 시점 모드 — 도보 정찰(WASD) · 건물 내부 · 드론 정찰(짐벌)
 * 지형 밀착은 VISTA 패턴: globe.getHeight → sampleHeight → 직전값 캐시
 */
import { SITE } from './data';
import { offset, distM, azimuthDeg } from './geo';
import { toMGRS } from './mgrs';
import { computeViewshed, rasterize } from './viewshed';
import { degToMils } from './assets';
import { sampleTerrainDetailed } from './terrainSample';
import { OpticHud } from './opticHud';
import { OPTICS, fovAtZoom } from './opticProfile';
import { OpticFx, resolvePalette } from './opticFx';
import { atmosphereOf, effectiveRanges, detectionProbability } from './sensorPerformance';
import { closingRateMps, etaSeconds, kinematics } from './tracking';
import { isOnStation, orbitPoint } from './droneModel';
import { losClear } from './siteOptimizer';
import { formatClock, monthDayOf } from './environmentModel';

const D = Cesium.Cartesian3.fromDegrees;
const rad = Cesium.Math.toRadians;
const deg = Cesium.Math.toDegrees;
import { clamp } from './mathUtils';

/**
 * GP 블렌더 정밀지형이 표출 중이면 그 GLB 표면(rt.surfaceHeightAt)을 우선한다 —
 * globe.getHeight/sampleHeight 는 (globe.show=false 라도) 라이브 DEM 공급자를 계속
 * 읽으므로, 렌더되는 GLB 지형과 표고 기준이 달라(수십 m 차) 도보·드론 시점이 실제
 * 표면 위/아래에서 붕 뜬 채로 움직이게 된다 (placement.ts _ground 와 같은 규약).
 */
function groundHeightAt(viewer, lon, lat, fallback, rt) {
  if (rt?.active && rt?.surfaceReady) {
    const gh = rt.surfaceHeightAt(lon, lat);
    if (Number.isFinite(gh)) return gh;
  }
  const carto = Cesium.Cartographic.fromDegrees(lon, lat);
  let h = viewer.scene.globe.getHeight?.(carto);
  if (!Number.isFinite(h) && viewer.scene.sampleHeightSupported) {
    try { h = viewer.scene.sampleHeight(carto); } catch (_) { h = undefined; }
  }
  return Number.isFinite(h) ? h : fallback;
}

function lockControls(viewer, locked) {
  const c = viewer.scene.screenSpaceCameraController;
  c.enableRotate = c.enableTranslate = c.enableZoom = c.enableTilt = c.enableLook = !locked;
}

const overlay = () => document.querySelector('#walk-overlay');
const hudMode = () => document.querySelector('#wk-mode');
const hudInfo = () => document.querySelector('#wk-info');
const hudHint = () => document.querySelector('#wk-hint');

/** ─── 도보 정찰 + 건물 내부 ─── */
export class WalkController {
  constructor(viewer, opts) {
    this.viewer = viewer;
    this.opts = opts; // { getGroundH, getTowerH, getBuildings:()=>items, onEnterTower }
    this.active = false;
    this.pos = { lon: SITE.gp.lon, lat: SITE.gp.lat };
    this.heading = 0; this.pitch = 0;
    this.eyeH = 1.7;
    this.lastGround = 0;
    this.keys = new Set();
    this.interior = null; // { item, floor }
    this._drag = null;
    this._tick = null;
    this._lastT = 0;
    // ── 현장점검 도구 상태 ──
    this.bino = false;           // B 쌍안경 (FOV 12° + 표적 판독)
    this._binoT = 0;
    this.track = [];             // 순찰 트랙 [{lon,lat,h}]
    this.trackDistM = 0;
    this._spotLayer = null;      // T 스팟 가시영역 오버레이
    this._checkDs = new Cesium.CustomDataSource('walk-check');
    viewer.dataSources.add(this._checkDs);
    this._wire();
  }

  _wire() {
    const canvas = this.viewer.canvas;
    canvas.addEventListener('pointerdown', (e) => {
      if (!this.active) return;
      this._drag = { x: e.clientX, y: e.clientY, h: this.heading, p: this.pitch };
      canvas.setPointerCapture(e.pointerId);
    });
    canvas.addEventListener('pointermove', (e) => {
      if (!this.active || !this._drag) return;
      this.heading = this._drag.h + (e.clientX - this._drag.x) * 0.0026;
      this.pitch = clamp(this._drag.p - (e.clientY - this._drag.y) * 0.0026, rad(-80), rad(70));
    });
    canvas.addEventListener('pointerup', () => { this._drag = null; });
    canvas.addEventListener('wheel', (e) => {
      if (!this.active) return;
      if (this._binoZoom(e.deltaY)) e.preventDefault();
    }, { passive: false });
    window.addEventListener('keydown', (e) => {
      if (!this.active) return;
      if (e.key === 'Escape') { this.exit(); return; }
      const k = e.key.toLowerCase();
      if (k === 'e') { this._interact(); return; }
      if (k === 'b') { this._toggleBino(); return; }
      if (k === 't') { this._spotViewshed(); return; }
      if (k === 'f') { this._exposureCheck(); return; }
      if (k === 'c') { this._clearTrack(); return; }
      if (this.interior && (k === 'q' || k === 'r')) { this._floor(k === 'r' ? 1 : -1); return; }
      this.keys.add(k);
      if (['w', 'a', 's', 'd', 'shift', ' '].includes(k)) e.preventDefault();
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.key.toLowerCase()));
  }

  enter(lon, lat) {
    if (this.active) return;
    this.active = true;
    this.interior = null;
    this.pos = { lon: lon ?? SITE.gp.lon + 0.00018, lat: lat ?? SITE.gp.lat - 0.00022 };
    this.heading = 0; this.pitch = 0;
    this.lastGround = this.opts.getGroundH();
    lockControls(this.viewer, true);
    overlay().classList.remove('hidden');
    hudMode().textContent = '도보 정찰';
    hudHint().textContent = this._defaultHint();
    this.track = [{ ...this.pos, h: this.lastGround }];
    this.trackDistM = 0;
    this._drawTrack();
    this._lastT = performance.now();
    this._tick = this.viewer.scene.preRender.addEventListener(() => this._update());
  }

  _defaultHint() {
    return 'WASD 이동·Shift 질주 · E 진입 · B 쌍안경 · T 가시영역 · F 피탐체크 · C 트랙삭제 · ESC 종료';
  }

  exit() {
    if (!this.active) return;
    this.active = false;
    this.interior = null;
    this.opts.onInterior?.(null);
    this._cleanupTools();
    if (this._tick) { this._tick(); this._tick = null; }
    lockControls(this.viewer, false);
    overlay().classList.add('hidden');
    this.viewer.camera.flyTo({
      destination: D(SITE.gp.lon, SITE.gp.lat - 0.012, this.opts.getGroundH() + 1400),
      orientation: { heading: 0, pitch: rad(-35), roll: 0 },
      duration: 1.4,
    });
    this.onExit?.();
  }

  _interact() {
    // 타워 근접 → 타워 1인칭
    const dTower = distM(this.pos.lon, this.pos.lat, SITE.gp.lon, SITE.gp.lat);
    if (!this.interior && dTower < 28) {
      this.exitSilent();
      this.opts.onEnterTower?.();
      return;
    }
    if (this.interior) { this._exitBuilding(); return; }
    // 건물 근접 → 내부 진입
    const items = this.opts.getBuildings();
    let best = null, bestD = 24;
    for (const it of items) {
      const d = distM(this.pos.lon, this.pos.lat, it.lon, it.lat);
      if (d < bestD) { bestD = d; best = it; }
    }
    if (best) this._enterBuilding(best);
    else this._toast?.('근처에 진입할 시설이 없습니다 (E: 타워/건물 20m 이내)');
  }

  _enterBuilding(item) {
    this.interior = { item, floor: 1, returnPos: { ...this.pos } };
    this.opts.onInterior?.(item); // 실물 모델 껍데기 숨김 → 층별 시야 확인 가능
    hudMode().textContent = `${item.spec.name} 내부 · 1층/${item.floors ?? item.spec.floors}층`;
    hudHint().textContent = 'R 위층 · Q 아래층 · 드래그 시선 · E 퇴장 — 층별 외부 조망(총안구 시야) 확인';
    this._toast?.(`${item.spec.name} 진입 — 벽이 투명하게 표현되어 층별 시야를 확인할 수 있습니다`);
  }

  _exitBuilding() {
    const it = this.interior.item;
    const out = offset(it.lon, it.lat, 180, it.dims.depthM / 2 + 4);
    this.pos = { lon: out.lon, lat: out.lat };
    this.interior = null;
    this.opts.onInterior?.(null); // 껍데기 복원
    hudMode().textContent = '도보 정찰';
    hudHint().textContent = this._defaultHint();
  }

  _floor(dir) {
    const it = this.interior.item;
    const maxFl = it.floors ?? it.spec.floors;
    this.interior.floor = clamp(this.interior.floor + dir, 1, maxFl);
    hudMode().textContent = `${it.spec.name} 내부 · ${this.interior.floor}층/${maxFl}층`;
  }

  // ═══ B: 쌍안경 — FOV 12° + 중앙 크로스헤어 표적 판독 ═══
  _toggleBino() {
    this.bino = !this.bino;
    const cam = this.viewer.camera;
    if (this.bino) {
      this._savedFov = cam.frustum.fov;
      cam.frustum.fov = rad(12);
      hudMode().textContent = '쌍안경 관측 (7×)';
      hudHint().textContent = '크로스헤어 표적 판독중 — 휠 배율 · B 해제';
    } else {
      cam.frustum.fov = this._savedFov ?? rad(60);
      hudMode().textContent = this.interior ? hudMode().textContent : '도보 정찰';
      hudHint().textContent = this._defaultHint();
    }
  }

  /** 크로스헤어 지형 판독: 거리·방위밀·MGRS·표고 (사격지휘 형식) */
  _binoReadout() {
    const canvas = this.viewer.canvas;
    const center = new Cesium.Cartesian2(canvas.clientWidth / 2, canvas.clientHeight / 2);
    const ray = this.viewer.camera.getPickRay(center);
    const cart = ray && this.viewer.scene.globe.pick(ray, this.viewer.scene);
    if (!cart) return '표적 없음 (하늘)';
    const c = Cesium.Cartographic.fromCartesian(cart);
    const tLon = deg(c.longitude), tLat = deg(c.latitude);
    const dist = distM(this.pos.lon, this.pos.lat, tLon, tLat);
    const az = azimuthDeg(this.pos.lon, this.pos.lat, tLon, tLat);
    return `⌖ ${Math.round(dist).toLocaleString()}m · ${degToMils(az).toLocaleString()}밀 · ` +
      `${toMGRS(tLon, tLat)} · 표고 ${Math.round(c.height)}m`;
  }

  // ═══ T: 스팟 가시영역 — 현 위치 눈높이에서 반경 2km 즉석 관측권 ═══
  async _spotViewshed() {
    if (this.interior) { this._toast?.('실외에서만 가능합니다'); return; }
    this._toast?.('현 위치 가시영역 광선추적 (눈높이 1.7m · 반경 2km)…');
    const grid = await computeViewshed(this.viewer, {
      lon: this.pos.lon, lat: this.pos.lat, eyeH: 1.7,
      nAz: 96, nR: 40, minR: 15, maxR: 2000,
      realTerrain: this.opts.getRealTerrain?.(),
    });
    // 가시율 (면적가중)
    let wT = 0, wV = 0;
    for (let a = 0; a < grid.nAz; a++) {
      for (let r = 0; r < grid.nR; r++) {
        const d = grid.minR + grid.rStep * r;
        wT += d;
        if (grid.vis[a * grid.nR + r]) wV += d;
      }
    }
    const spotSector = { centerAz: 0, halfAngle: 180, minR: 15, maxR: 2000 };
    const { canvas, rectangle } = rasterize(grid, [], spotSector, 'terrain', 640);
    if (this._spotLayer) this.viewer.imageryLayers.remove(this._spotLayer, true);
    this._spotLayer = this.viewer.imageryLayers.addImageryProvider(
      new Cesium.SingleTileImageryProvider({ url: canvas.toDataURL(), rectangle, tileWidth: canvas.width, tileHeight: canvas.height }));
    this._toast?.(`이 지점 가시율 ${(wV / wT * 100).toFixed(0)}% (2km 반경) — 초록=관측가능 · 빨강=사각. T 재실행으로 갱신`);
  }

  // ═══ F: 피탐 체크 — 현 위치가 GP 타워에서 관측되는가 (은폐 검증) ═══
  async _exposureCheck() {
    const towerTop = this.opts.getGroundH() + this.opts.getTowerH() + 3;
    const N = 120;
    const cartos = [];
    for (let i = 0; i <= N; i++) {
      const t = i / N;
      cartos.push(Cesium.Cartographic.fromDegrees(
        SITE.gp.lon + (this.pos.lon - SITE.gp.lon) * t,
        SITE.gp.lat + (this.pos.lat - SITE.gp.lat) * t));
    }
    await sampleTerrainDetailed(this.viewer.terrainProvider, cartos);
    const myH = (cartos[N].height ?? this.lastGround) + 1.7;
    let blocked = null;
    for (let i = 1; i < N; i++) {
      const lineH = towerTop + (myH - towerTop) * (i / N);
      const terr = cartos[i].height ?? 0;
      if (terr > lineH + 0.5) {
        blocked = { frac: i / N, h: terr };
        break;
      }
    }
    // 체크선 표시 (5초 후 자동 제거)
    const e = this._checkDs.entities;
    const old = e.getById('exposure-line');
    if (old) e.remove(old);
    const totalD = distM(SITE.gp.lon, SITE.gp.lat, this.pos.lon, this.pos.lat);
    const ent = e.add({
      id: 'exposure-line',
      polyline: {
        positions: [
          Cesium.Cartesian3.fromDegrees(SITE.gp.lon, SITE.gp.lat, towerTop),
          Cesium.Cartesian3.fromDegrees(this.pos.lon, this.pos.lat, myH),
        ],
        width: 2.5,
        material: blocked
          ? new Cesium.PolylineDashMaterialProperty({ color: Cesium.Color.fromCssColorString('#3dd68c'), dashLength: 10 })
          : Cesium.Color.fromCssColorString('#ed5d5d').withAlpha(0.9),
      },
    });
    setTimeout(() => { try { e.remove(ent); } catch (_) {} }, 6000);
    this._toast?.(blocked
      ? `✓ 은폐됨 — ${(totalD * blocked.frac / 1000).toFixed(2)}km 지점 능선(${Math.round(blocked.h)}m)이 타워 시선 차단 (녹색 점선)`
      : `⚠ 피탐! 이 위치는 타워 ${this.opts.getTowerH()}m에서 직접 관측됨 (${(totalD / 1000).toFixed(2)}km · 적색 실선)`);
  }

  // ═══ 순찰 트랙 (브레드크럼) ═══
  _drawTrack() {
    const e = this._checkDs.entities;
    const old = e.getById('patrol-track');
    if (old) e.remove(old);
    e.add({
      id: 'patrol-track',
      polyline: {
        positions: new Cesium.CallbackProperty(() =>
          this.track.map((p) => Cesium.Cartesian3.fromDegrees(p.lon, p.lat)), false),
        width: 2.5, clampToGround: true,
        material: new Cesium.PolylineDashMaterialProperty({
          color: Cesium.Color.fromCssColorString('#5eb1ef').withAlpha(0.85), dashLength: 8,
        }),
      },
    });
  }

  _clearTrack() {
    this.track = [{ ...this.pos, h: this.lastGround }];
    this.trackDistM = 0;
    this._toast?.('순찰 트랙 초기화');
  }

  _recordTrack() {
    const last = this.track[this.track.length - 1];
    if (!last) return;
    const d = distM(last.lon, last.lat, this.pos.lon, this.pos.lat);
    if (d >= 3) {
      this.track.push({ ...this.pos, h: this.lastGround });
      this.trackDistM += d;
      if (this.track.length > 2000) this.track.splice(0, 500);
    }
  }

  exitSilent() {
    this.active = false;
    this.interior = null;
    this.opts.onInterior?.(null);
    this._cleanupTools();
    if (this._tick) { this._tick(); this._tick = null; }
    lockControls(this.viewer, false);
    overlay().classList.add('hidden');
  }

  _update() {
    const now = performance.now();
    const dt = Math.min(0.25, (now - this._lastT) / 1000);
    this._lastT = now;

    let h;
    if (this.interior) {
      const it = this.interior.item;
      h = it.groundH + (this.interior.floor - 1) * 3.2 + 1.6;
      this.pos = { lon: it.lon, lat: it.lat };
    } else {
      // 이동
      const speed = this.keys.has('shift') ? 5.4 : 1.8;
      let fwd = 0, strafe = 0;
      if (this.keys.has('w')) fwd += 1;
      if (this.keys.has('s')) fwd -= 1;
      if (this.keys.has('d')) strafe += 1;
      if (this.keys.has('a')) strafe -= 1;
      if (fwd || strafe) {
        const hd = deg(this.heading);
        const moveAz = hd + deg(Math.atan2(strafe, fwd));
        const dist = speed * dt * Math.hypot(fwd, strafe);
        const p = offset(this.pos.lon, this.pos.lat, moveAz, dist);
        this.pos = { lon: p.lon, lat: p.lat };
      }
      this.lastGround = groundHeightAt(
        this.viewer, this.pos.lon, this.pos.lat, this.lastGround, this.opts.getRealTerrain?.(),
      );
      h = this.lastGround + this.eyeH;
      this._recordTrack();
    }

    this.viewer.camera.setView({
      destination: D(this.pos.lon, this.pos.lat, h),
      orientation: { heading: this.heading, pitch: this.pitch, roll: 0 },
    });
    if (this.bino) this.viewer.camera.frustum.fov = this.viewer.camera.frustum.fov; // setView가 fov 유지

    // HUD
    const now2 = performance.now();
    if (this.bino && now2 - this._binoT > 180) {
      this._binoT = now2;
      hudInfo().textContent = this._binoReadout();
    } else if (!this.bino) {
      const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
      const az = ((deg(this.heading) % 360) + 360) % 360;
      hudInfo().textContent =
        `${dirs[Math.round(az / 45) % 8]} ${az.toFixed(0).padStart(3, '0')}° · ` +
        `MGRS ${toMGRS(this.pos.lon, this.pos.lat)} · 표고 ${Math.round(this.interior ? this.interior.item.groundH : this.lastGround)}m` +
        (this.interior ? '' : ` · GP ${(distM(this.pos.lon, this.pos.lat, SITE.gp.lon, SITE.gp.lat) / 1000).toFixed(2)}km` +
          (this.trackDistM > 5 ? ` · 순찰 ${(this.trackDistM / 1000).toFixed(2)}km` : ''));
    }
  }

  /** 쌍안경 배율 (휠) — FPV와 동일 조작감 */
  _binoZoom(deltaY) {
    if (!this.bino) return false;
    const cam = this.viewer.camera;
    const cur = deg(cam.frustum.fov);
    cam.frustum.fov = rad(clamp(cur * (deltaY > 0 ? 1.12 : 0.89), 4, 30));
    return true;
  }

  _cleanupTools() {
    if (this.bino) {
      this.viewer.camera.frustum.fov = this._savedFov ?? rad(60);
      this.bino = false;
    }
    if (this._spotLayer) {
      this.viewer.imageryLayers.remove(this._spotLayer, true);
      this._spotLayer = null;
    }
    this._checkDs.entities.removeAll();
  }
}

/**
 * ─── 드론 정찰 (궤도 + 짐벌) ───
 *
 * 드론 시점은 「높은 데서 내려다보기」가 아니다. 조종석에서 보는 것은 영상 위에
 * 겹친 **계기**다 — 지금 몇 미터 위에 있고, 짐벌이 어디를 물고 있고, 배터리로
 * 몇 분을 더 떠 있을 수 있고, 통제소와의 링크가 살아 있는지. 그 숫자들이 없으면
 * 그 화면은 드론 화면이 아니라 그냥 항공사진이다.
 *
 * 그래서 여기서도 1인칭과 같은 HUD 엔진(opticHud)을 쓴다. 계기 묶음만 드론 것
 * (flight/link/lrf)으로 바뀔 뿐, 방위 테이프·짐벌 조준선·표적 브래킷·유효거리
 * 막대는 TOD 화면과 같은 규약이다.
 */
export class DroneCam {
  /**
   * @param ctx { state, renderGuard, toast } — 계기 값은 전부 여기서 읽는다
   */
  constructor(viewer, getGroundH, ctx = {}) {
    this.viewer = viewer;
    this.getGroundH = getGroundH;
    this.ctx = ctx;
    this.active = false;
    this.angle = 180;       // 궤도 각 (deg)
    this.radius = 900;
    this.aglM = 300;
    this.gimbalPitch = -38; // deg
    this.gimbalYaw = 0;     // 궤도 접선 대비 오프셋
    // 궤도 각속도는 곧 대지속도다 — R900m 에서 3.2°/s 는 181km/h 로, 정찰드론이
    // 낼 속도가 아니다. 계기에 속도를 띄우는 순간 그 숫자는 검증 가능해진다.
    this.speedDegS = 1.15;   // R900 기준 약 18m/s (65km/h)
    this.optic = OPTICS.drone;
    this.zoomIdx = 0;
    this.manualPalette = null;
    this.lrf = null;
    this.lock = null;          // 짐벌이 물고 있는 항적
    this.bound = null;         // 편대의 특정 기체 (관리 팝업에서 고른 그 기체)
    this._lastFrame = null;
    this.pos = { lon: SITE.gp.lon, lat: SITE.gp.lat, h: 0 };
    this._launchAt = 0;
    this.hud = null;
    this.fx = null;
    this._drag = null;
    this._tick = null;
    this._lastT = 0;
    this._wire();
  }

  get state() { return this.ctx.state ?? {}; }

  /**
   * 편대의 이 기체로 들어간다.
   *
   * 드론 시점은 「어딘가의 드론」이 아니라 **이 기체**여야 한다 — 관리 팝업에서
   * 정한 고도·반경·순찰 중심·페이로드를 그대로 물고 들어가지 않으면, 관리한 것과
   * 보는 것이 다른 화면이 된다.
   */
  attachTo(drone, fleet) {
    this.bound = drone ? { drone, fleet } : null;
    if (drone) {
      this.aglM = drone.curAglM || drone.aglM;
      this.radius = drone.radiusM;
      // 극성은 여기서 정하지 않는다 — 페이로드가 곧 파장대이고, 그 규칙은 _palette 에 있다.
      // (여기서 한 번 정해 두면 enter() 가 그것을 지워 버려 화면과 편대가 어긋난다)
      this.manualPalette = null;
    }
  }

  detach() { this.bound = null; }
  get zoom() { return this.optic.zooms[this.zoomIdx] ?? 1; }

  stepZoom(dir) {
    const n = this.optic.zooms.length;
    this.zoomIdx = Math.max(0, Math.min(n - 1, this.zoomIdx + (dir > 0 ? 1 : -1)));
  }

  /**
   * EO ↔ IR 채널 전환 — 야간 정찰의 핵심 조작.
   *
   * 편대 기체에 물려 있으면 **그 기체의 페이로드를 바꾼다.** 화면만 열상으로
   * 칠하고 편대 관리에는 EO 라고 적혀 있으면, 둘 중 하나는 거짓말이다.
   */
  togglePayload() {
    if (this.bound) {
      const next = this.bound.drone.payload === 'eo' ? 'ir' : 'eo';
      this.bound.fleet?.update(this.bound.drone.uid, { payload: next });
      this.ctx.toast?.(`${this.bound.drone.name} 페이로드 — ${next === 'ir' ? 'IR 열상' : 'EO 주간'}`, 2400);
      return;
    }
    const cur = this._palette();
    this.manualPalette = cur === 'wh' || cur === 'bh' ? null : 'wh';
    this.ctx.toast?.(`짐벌 페이로드 — ${this.manualPalette ? 'IR (열상)' : 'EO (주간)'}`, 2000);
  }

  fireLrf() {
    const cam = this.viewer.camera;
    const ray = new Cesium.Ray(Cesium.Cartesian3.clone(cam.positionWC), Cesium.Cartesian3.clone(cam.directionWC));
    const hit = this.viewer.scene.globe.pick(ray, this.viewer.scene);
    if (!hit) { this.lrf = null; return; }
    const c = Cesium.Cartographic.fromCartesian(hit);
    this.lrf = {
      dist: Cesium.Cartesian3.distance(cam.positionWC, hit),
      lon: deg(c.longitude), lat: deg(c.latitude), h: c.height,
    };
  }

  /**
   * 짐벌 추적 — 드론은 스스로 도는 기체 위에 얹힌 카메라라서, 물어 두지 않으면
   * 표적이 궤도를 도는 동안 화면에서 계속 흘러 나간다. 추적이 있어야 관측이 된다.
   */
  lockNearest() {
    const list = this._lastFrame?.targets ?? [];
    if (!list.length) { this.ctx.toast?.('짐벌 시야에 판정된 표적이 없습니다', 2400); return; }
    const cx = this.hud.w / 2, cy = this.hud.h / 2;
    const best = list
      .map((t) => ({ t, d2: (t.x - cx) ** 2 + (t.y - cy) ** 2 }))
      .sort((a, b) => a.d2 - b.d2)[0];
    this.lock = { key: best.t.key, id: best.t.trackId, name: best.t.label, lockedAt: performance.now(), lostAt: null };
    this.ctx.toast?.(`${best.t.trackId} 짐벌 추적 — ${best.t.grade} ${Math.round(best.t.d)}m`, 3200);
  }

  unlock(why) {
    if (!this.lock) return;
    const id = this.lock.id;
    this.lock = null;
    if (why) this.ctx.toast?.(`${id} 추적 해제 — ${why}`, 2200);
  }

  /** 짐벌을 표적 쪽으로 돌린다 (최대 각속도 제한 안에서). */
  _autoSlew(track, cam, dtS) {
    if (!track || track.lostS != null) return;
    const maxStep = (this.optic.slewDegS ?? 30) * Math.min(0.2, dtS);
    // 짐벌 요는 기체 진행방향 기준 오프셋이라, 원하는 절대방위에서 기수를 뺀다
    const wantYaw = track.bearingDeg - (cam.heading - this.gimbalYaw);
    let dYaw = ((wantYaw - this.gimbalYaw + 540) % 360) - 180;
    dYaw = Math.max(-maxStep, Math.min(maxStep, dYaw));
    this.gimbalYaw += dYaw;
    const dPitch = clamp(track.elevationDeg - this.gimbalPitch, -maxStep, maxStep);
    this.gimbalPitch = clamp(this.gimbalPitch + dPitch, -88, -8);
  }

  /**
   * 화면 극성. 편대 기체에 물려 있으면 **페이로드가 곧 파장대**다 —
   * 그 기체가 IR 을 달고 있는데 화면이 컬러면 관리한 것과 보는 것이 어긋난다.
   */
  _palette() {
    const payload = this.bound?.drone.payload;
    return resolvePalette(this.optic, {
      manual: this.manualPalette ?? (payload === 'ir' ? 'wh' : null),
      lux: this.state.env?.state?.illuminanceLux,
    });
  }

  _wire() {
    const canvas = this.viewer.canvas;
    canvas.addEventListener('pointerdown', (e) => {
      if (!this.active) return;
      this._drag = { x: e.clientX, y: e.clientY, y0: this.gimbalYaw, p0: this.gimbalPitch };
      canvas.setPointerCapture(e.pointerId);
    });
    canvas.addEventListener('pointermove', (e) => {
      if (!this.active || !this._drag) return;
      // 조종수가 짐벌을 잡으면 자동추적은 끊긴다 (수동 개입)
      if (this.lock && Math.abs(e.clientX - this._drag.x) + Math.abs(e.clientY - this._drag.y) > 6) {
        this.unlock('수동 짐벌');
      }
      this.gimbalYaw = this._drag.y0 + (e.clientX - this._drag.x) * 0.18;
      this.gimbalPitch = clamp(this._drag.p0 - (e.clientY - this._drag.y) * 0.14, -88, -8);
    });
    canvas.addEventListener('pointerup', () => { this._drag = null; });
    canvas.addEventListener('wheel', (e) => {
      if (!this.active) return;
      e.preventDefault();
      // Shift 를 누르면 배율단, 아니면 고도 — 조종간의 두 축을 한 휠에 나눠 준다
      if (e.shiftKey) this.stepZoom(e.deltaY > 0 ? -1 : 1);
      else {
        this.aglM = clamp(this.aglM + (e.deltaY > 0 ? 25 : -25), 120, 900);
        // 편대 기체라면 고도는 그 기체의 지정 고도다 (관리 팝업과 같은 값을 본다)
        if (this.bound) this.bound.fleet?.update(this.bound.drone.uid, { aglM: this.aglM });
      }
    }, { passive: false });
    window.addEventListener('keydown', (e) => {
      if (!this.active) return;
      if (e.target.matches?.('input,textarea,select')) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const k = e.key.toLowerCase();
      if (e.key === 'Escape') this.exit();
      else if (k === 'p') { this.togglePayload(); e.preventDefault(); }
      else if (k === 'l') { this.fireLrf(); e.preventDefault(); }
      else if (k === 'z') { this.stepZoom(1); e.preventDefault(); }
      else if (k === 'x') { this.stepZoom(-1); e.preventDefault(); }
      else if (k === 't') { this.lock ? this.unlock() : this.lockNearest(); e.preventDefault(); }
      else if (k === '[' || k === ']') {
        this.radius = clamp(this.radius + (k === ']' ? 100 : -100), 300, 2200);
        if (this.bound) this.bound.fleet?.update(this.bound.drone.uid, { radiusM: this.radius });
        e.preventDefault();
      }
    });
  }

  enter() {
    if (this.active) return;
    this.active = true;
    this.zoomIdx = 0;
    this.manualPalette = null;
    this.lrf = null;
    this.lock = null;
    this._launchAt = performance.now();
    this._savedFov = this.viewer.camera.frustum.fov;
    lockControls(this.viewer, true);
    overlay().classList.remove('hidden');
    overlay().classList.add('uas');
    hudMode().textContent = 'UAS-01 정찰 (자동 선회)';
    hudHint().textContent = '드래그 짐벌 · 휠 고도 · Shift+휠/Z·X 배율 · T 추적 · P EO/IR · L 측거 · [ ] 궤도 · ESC 종료';
    if (!this.hud) {
      const cv = document.querySelector('#uas-hud');
      if (cv) this.hud = new OpticHud(cv);
    }
    if (!this.fx) this.fx = new OpticFx(this.viewer, { renderGuard: this.ctx.renderGuard });
    this._lastT = performance.now();
    this._tick = this.viewer.scene.preRender.addEventListener(() => this._update());
  }

  exit() {
    if (!this.active) return;
    this.active = false;
    if (this._tick) { this._tick(); this._tick = null; }
    this.lock = null;
    this._lastFrame = null;
    this.fx?.set(null);
    this.hud?.clear();
    // 배율단을 걸어 둔 채 나가면 궤도 시점이 망원경처럼 좁아진 채로 남는다
    this.viewer.camera.frustum.fov = this._savedFov ?? rad(60);
    lockControls(this.viewer, false);
    overlay().classList.remove('uas');
    overlay().classList.add('hidden');
    this.bound = null;
    this.viewer.camera.flyTo({
      destination: D(SITE.gp.lon, SITE.gp.lat - 0.012, this.getGroundH() + 1400),
      orientation: { heading: 0, pitch: rad(-35), roll: 0 },
      duration: 1.4,
    });
    this.onExit?.();
  }

  _update() {
    const now = performance.now();
    const dt = Math.min(0.25, (now - this._lastT) / 1000);
    this._lastT = now;

    // 편대 기체에 물려 있으면 궤도는 그 기체가 정한다 — 여기서 따로 돌리면
    // 지도 위의 아이콘과 화면이 서로 다른 자리에 있게 된다.
    let center; let p; let tangent;
    const b = this.bound?.drone;
    if (b) {
      if (!isOnStation(b)) { this.exit(); return; }
      center = { lon: b.patrolLon, lat: b.patrolLat };
      this.angle = b.angleDeg;
      this.radius = b.radiusM;
      this.aglM = b.curAglM;
      p = orbitPoint(b);
      tangent = b.angleDeg + 90;
    } else {
      this.angle = (this.angle + this.speedDegS * dt) % 360;
      center = offset(SITE.gp.lon, SITE.gp.lat, 0, 1400); // 책임구역 중심 상공
      p = offset(center.lon, center.lat, this.angle, this.radius);
      tangent = this.angle + 90;
    }
    const g = groundHeightAt(this.viewer, p.lon, p.lat, this.getGroundH(), this.state?.realTerrain);
    const h = g + this.aglM;
    const heading = tangent + this.gimbalYaw + 90; // 짐벌 기본: 중심 지향
    const fov = fovAtZoom(this.optic, this.zoom);
    this.viewer.camera.setView({
      destination: D(p.lon, p.lat, h),
      orientation: { heading: rad(heading), pitch: rad(this.gimbalPitch), roll: 0 },
    });
    this.viewer.camera.frustum.fov = rad(fov);
    this.pos = { lon: p.lon, lat: p.lat, h };

    hudInfo().textContent =
      `AGL ${Math.round(this.aglM)}m · 궤도 R${this.radius}m · 짐벌 ${this.gimbalPitch.toFixed(0)}° · `
      + `×${this.zoom} · MGRS ${toMGRS(p.lon, p.lat)}`;
    this._drawHud({ lon: p.lon, lat: p.lat, h, heading, fov, groundH: g });
  }

  /** 조종석 계기 — 1인칭과 같은 HUD 엔진, 계기 묶음만 드론 것 */
  _drawHud(cam) {
    if (!this.hud) return;
    const wrap = document.querySelector('#map-wrap');
    this.hud.setSize(wrap.clientWidth, wrap.clientHeight);

    const st = this.state;
    const env = st.env?.state ?? null;
    const atm = env ? atmosphereOf(env) : null;
    const palette = this._palette();
    this.fx?.set(palette, { deltaT: atm?.deltaT, lux: atm?.lux });

    // 열상으로 바꾸면 짐벌의 유효거리 자체가 달라진다 — 제원도 같이 갈아탄다
    const spec = palette === 'wh' || palette === 'bh'
      ? { band: 'lwir', dri: [2200, 800, 400], fov: this.optic.spec.fov }
      : this.optic.spec;
    const perf = atm ? effectiveRanges(spec, atm) : null;

    const camInfo = { lon: cam.lon, lat: cam.lat, eyeH: cam.h, az: ((cam.heading % 360) + 360) % 360,
      el: this.gimbalPitch };
    const nowMs = performance.now();
    const targets = this._targets(perf, camInfo, cam.fov, nowMs);
    const track = this._trackState(targets, nowMs);
    const flightMin = (performance.now() - this._launchAt) / 60000;
    const battery = Math.max(0.05, 1 - flightMin / 38);
    const rangeM = distM(SITE.gp.lon, SITE.gp.lat, cam.lon, cam.lat);

    const frame = {
      optic: this.optic,
      palette,
      zoom: this.zoom,
      fov: cam.fov,
      dtg: this._dtg(env),
      cam: camInfo,
      vantage: {
        name: this.bound ? `정찰드론 ${this.bound.drone.name}` : '정찰드론 (임시)',
        tag: this.bound?.drone.name ?? 'UAS',
        groundH: cam.groundH, height: this.aglM,
      },
      perf,
      atm,
      lrf: this.lrf,
      targets,
      track,
      cue: track ? {
        trackId: track.id,
        screenAzDeg: ((track.bearingDeg - camInfo.az + 540) % 360) - 180,
        screenElDeg: track.elevationDeg - camInfo.el,
        onScreen: Math.abs(((track.bearingDeg - camInfo.az + 540) % 360) - 180) < cam.fov * 0.45,
      } : null,
      flare: this._flareState(nowMs),
      plan: null,
      nowS: nowMs / 1000,
      nuc: 0,
      rec: true,
      sector: {
        from: ((SITE.sector.centerAz - SITE.sector.halfAngle) % 360 + 360) % 360,
        to: ((SITE.sector.centerAz + SITE.sector.halfAngle) % 360 + 360) % 360,
      },
      extra: {
        flight: {
          aglM: this.aglM,
          mslM: cam.h,
          gsMps: (this.speedDegS * Math.PI / 180) * this.radius,
          orbitR: this.radius,
          gimbal: this.gimbalPitch,
          heading: camInfo.az,
          battery,
          endureMin: Math.round(battery * 38),
        },
        link: {
          quality: Math.max(0.12, 1 - rangeM / 9000 - (atm?.precipitationRate ?? 0) / 60),
          latencyMs: Math.round(38 + rangeM / 120),
          mbps: Math.max(1.2, 12 - rangeM / 900),
          jam: false,
          rangeM,
        },
      },
    };
    this._lastFrame = frame;
    this.hud.draw(frame);
    // 추적은 본 뒤에 돌린다 — 이번 프레임의 판정으로 다음 프레임을 겨눈다
    if (this.lock && track) this._autoSlew(track, cam, 1 / 30);
  }

  /** 잠긴 항적의 지금 상태 (fpv 와 같은 규약) */
  _trackState(targets, nowMs) {
    if (!this.lock) return null;
    const hit = targets.find((t) => t.key === this.lock.key);
    if (!hit) {
      this.lock.lostAt ??= nowMs;
      const lostS = (nowMs - this.lock.lostAt) / 1000;
      if (lostS > 3) { this.unlock('가시선 상실'); return null; }
      const last = this._lastFrame?.track;
      return last ? { ...last, lostS } : null;
    }
    this.lock.lostAt = null;
    const rec = this.state.tracks?.get(this.lock.key);
    const k = rec ? kinematics(rec.hist) : { ok: false };
    const p = hit.point;
    const distToGpM = distM(p.lon, p.lat, SITE.gp.lon, SITE.gp.lat);
    const closing = k.ok ? closingRateMps(k, p.lon, p.lat, SITE.gp.lon, SITE.gp.lat) : 0;
    return {
      id: this.lock.id, key: this.lock.key, name: this.lock.name,
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

  /** 지금 타고 있는 조명탄 (조종석에도 그 30초가 보여야 한다) */
  _flareState(nowMs) {
    const act = this.state.fireSupport?.active(nowMs) ?? [];
    if (!act.length) return null;
    const s = act[0];
    return {
      active: true, intensity: s.intensity, remainS: s.remainS, burnS: 32,
      radiusM: s.radiusM, aglM: 0, backscatter: s.backscatter,
    };
  }

  _dtg(env) {
    if (!env) return 'DTG —';
    const md = monthDayOf(env.settings.dayOfYear);
    const sec = Math.floor((performance.now() / 1000) % 60);
    return `DTG ${String(md.month).padStart(2, '0')}${String(md.day).padStart(2, '0')} `
      + `${formatClock(env.settings.minuteOfDay)}:${String(sec).padStart(2, '0')}K`;
  }

  /** 짐벌 시야에 든 침투 유닛 — 상공에서는 능선 차폐가 거의 없다는 것도 여기서 드러난다 */
  _targets(perf, cam, fov, nowMs = performance.now()) {
    const st = this.state;
    if (!perf || !st.infil?.units?.length || !this.hud) return [];
    const scene = this.viewer.scene;
    const toWindow = Cesium.SceneTransforms.worldToWindowCoordinates
      ?? Cesium.SceneTransforms.wgs84ToWindowCoordinates;
    const out = [];
    for (const u of st.infil.units) {
      let s; try { s = st.infil._state(u); } catch { continue; }
      const p = s?.p;
      if (!p) continue;
      const d = distM(cam.lon, cam.lat, p.lon, p.lat);
      if (d > perf.range) continue;
      if (st.grid && !losClear(st.grid, cam.lon, cam.lat, cam.eyeH, p.lon, p.lat)) continue;
      const p3 = D(p.lon, p.lat, (p.h ?? this.getGroundH()) + 0.9);
      const win = toWindow(scene, p3);
      if (!win) continue;
      if (win.x < -60 || win.x > this.hud.w + 60 || win.y < -60 || win.y > this.hud.h + 60) continue;
      const key = u.rd?.route?.id ?? `u${out.length}`;
      const name = u.rd?.route?.name?.split(' — ')[0] ?? '';
      const rec = st.tracks?.observe(key, name, { t: nowMs, lon: p.lon, lat: p.lat, h: p.h ?? 0 });
      const targetH = (p.h ?? this.getGroundH()) + 0.9;
      out.push({
        x: win.x, y: win.y, d, key,
        trackId: rec?.id ?? null,
        locked: this.lock?.key === key,
        point: { lon: p.lon, lat: p.lat, h: targetH },
        bearingDeg: azimuthDeg(cam.lon, cam.lat, p.lon, p.lat),
        elevationDeg: deg(Math.atan2(targetH - cam.eyeH, Math.max(1, d))),
        grade: d <= perf.dri[2] ? '식별' : d <= perf.dri[1] ? '인지' : '탐지',
        pd: detectionProbability(perf, d),
        label: name,
      });
    }
    return out;
  }
}

