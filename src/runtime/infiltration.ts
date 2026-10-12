// @ts-nocheck
/**
 * 적 침투 시각화 — VISTA 배치 런타임을 그대로 구동한다.
 *
 * 이전 버전은 VISTA 로직을 손으로 재작성했으나, 현재는 원본 소스를 벤더링해
 * (js/vendor/vista/, D:\VISTA_sudo\client\public\terrain-3d 무수정 사본)
 * `createTerrainPlacementRuntime()`에 스냅샷을 그대로 밀어 넣는다.
 *
 * 원본이 담당하는 것 (여기서 다시 구현하지 않음):
 *  - installTerrainModelAxisResolver: Model.fromGltfAsync 축 보정 몽키패치
 *  - resolveUnitModel / MEASURED_UNIT_SCALE_ENTRIES: 실측 기반 모델·스케일 결정
 *  - resolveUnitModelHeadingDeg: y-forward 모델 −90° 헤딩 오프셋
 *  - createRuntimeMotionState: 위치 스무딩(420~1600ms) + 1800m 스냅
 *  - 지면 그림자·선택 링·기동 먼지·차체 방향선·라벨·경로 폴리라인
 *
 * GP Digital Twin 고유 로직만 이 파일에 남는다: 지형 클램프 경로 준비, 경사 P95 기동판정,
 * 가시권(관측) 세그먼트 오버레이, 궤도 추적캠.
 */
import { SITE, INFIL_ROUTES, MOVE_MODES } from './data';
import { resamplePath, distM, azimuthDeg } from './geo';
import { lookupVisible } from './viewshed';
import { sampleTerrainDetailed } from './terrainSample';
import {
  createTerrainPlacementRuntime,
  installTerrainModelAxisResolver as vistaInstallTerrainModelAxisResolver,
  GROUND_CLUSTER_BASE_ALTITUDE_METERS,
} from '../../js/vendor/vista/placementRuntime';

const D = Cesium.Cartesian3.fromDegrees;
const css = (c) => Cesium.Color.fromCssColorString(c);
const rad = Cesium.Math.toRadians;
import { clamp } from './mathUtils';

const STEP_M = 12;

/** VISTA 원본 축 보정 리졸버를 그대로 재노출 (runtime/main.ts 호출부 호환) */
export function installTerrainModelAxisResolver(CesiumRef) {
  vistaInstallTerrainModelAxisResolver(CesiumRef);
}

/** 이동 모드 → VISTA 유닛 모델 ID (placementRuntimeAssets.UNIT_MODEL_URI_BY_ID) */
const VISTA_MODEL_ID = {
  walk: 'personnel-soldier',
  run: 'personnel-soldier',
  vehicle: 'tank-t80u',
};

// ═══ 경로 준비 (지형 클램프 + 경사 프로파일) ═══
const routeCache = new Map();

// GP 정밀지형(GLB) 참조 — main.ts가 생성 직후 setActiveTerrain()으로 주입한다.
// (environment.ts 의 setActiveEnvironment 와 같은 모듈 싱글턴 패턴: 이 파일 호출부가
// routeSketch.ts 등 여러 곳에 흩어져 있어 매 호출마다 realTerrain 을 넘기지 않는다.)
let _rt = null;
export function setActiveTerrain(rt) { _rt = rt; }

/** 축선 1개 준비 — 지형 클램프 + 경사 프로파일 (사용자 작도 축선도 같은 길) */
export async function prepareOneRoute(viewer, route) {
  const pts = resamplePath(route.waypoints, STEP_M);
  const cartos = pts.map((p) => Cesium.Cartographic.fromDegrees(p.lon, p.lat));
  // GP 정밀지형 표출 중이면 그 GLB 표면을 우선한다 — 라이브 지형만 보면 침투
  // 유닛이 실제로 렌더되는 능선과 다른 표고를 따라 걷게 되고(공중부양/침하),
  // 경사 P95 기동판정도 화면에 보이는 지형과 어긋난 값이 나온다.
  const rtReady = !!(_rt?.active && _rt?.surfaceReady);
  if (rtReady) {
    for (let i = 0; i < pts.length; i++) {
      const h = _rt.surfaceHeightAt(pts[i].lon, pts[i].lat);
      cartos[i].height = Number.isFinite(h) ? h : NaN;
    }
  }
  const missing = rtReady ? cartos.filter((c) => !Number.isFinite(c.height)) : cartos;
  if (missing.length) await sampleTerrainDetailed(viewer.terrainProvider, missing);
  pts.forEach((p, i) => { p.h = cartos[i].height ?? 0; });
  let maxSlope = 0;
  const slopes = [];
  for (let i = 1; i < pts.length; i++) {
    const run = Math.max(1, pts[i].cumM - pts[i - 1].cumM);
    const s = Math.abs(Math.atan2(pts[i].h - pts[i - 1].h, run)) * 180 / Math.PI;
    slopes.push(s);
    if (s > maxSlope) maxSlope = s;
  }
  const sorted = [...slopes].sort((a, b) => a - b);
  const rd = {
    route, pts, slopes, maxSlope,
    slopeP95: sorted[Math.floor(sorted.length * 0.95)] ?? 0,
    totalM: pts[pts.length - 1].cumM,
  };
  routeCache.set(route.id, rd);
  return rd;
}

export async function prepareRoutes(viewer) {
  if (routeCache.size) return routeCache;
  for (const route of INFIL_ROUTES) await prepareOneRoute(viewer, route);
  return routeCache;
}

/** 사용자 작도 축선 등록 — 등록 즉시 리허설·IPB·워게임·보고서가 함께 소비한다 */
export async function addRoute(viewer, route) {
  return prepareOneRoute(viewer, route);
}

export function removeRoute(id) { return routeCache.delete(id); }
export function getRouteData(id) { return routeCache.get(id); }
export function allRouteData() { return [...routeCache.values()]; }
export function clearRoutes() { routeCache.clear(); }

/** 기동 가능 판정 (경사 P95 vs 모드 한계경사) */
export function routeFeasible(rd, mode) {
  return rd.slopeP95 <= MOVE_MODES[mode].maxSlopeDeg;
}

/** VISTA 런타임이 스냅샷을 재평가하는 주기 — 원본은 라이브 텔레메트리를 이 대역에서 받는다 */
const SNAPSHOT_INTERVAL_MS = 100;

export class InfilSim {
  constructor(viewer, ents) {
    this.viewer = viewer;
    this.ents = ents;
    // 가시권 오버레이(GP Digital Twin 고유)만 자체 데이터소스에 그린다.
    this.ds = new Cesium.CustomDataSource('infil-overlay');
    viewer.dataSources.add(this.ds);

    this.mode = 'walk';
    this.tNorm = 0;
    this.units = [];
    this.maxDur = 1;
    this.grid = null;
    this.onDetect = null;
    this._loggedIdx = new Set();
    this._lastSnapshotAt = 0;
    this._visible = true;

    // ═══ VISTA 배치 런타임 (원본) ═══
    const b = 0.06; // 침투 축선 전체를 덮는 경계
    this.runtime = createTerrainPlacementRuntime({
      Cesium,
      bounds: {
        west: SITE.gp.lon - b, east: SITE.gp.lon + b,
        south: SITE.gp.lat - b, north: SITE.gp.lat + b,
      },
      widthMeters: 12000,
      heightMeters: 12000,
      liveRuntimeEnabled: true,
      notifyReadyOnAttach: false,
      setStatusMessage: () => {},
      setPlacementBadge: () => {},
    });
    this.runtimeReady = this.runtime.attach(viewer);

    this.orbit = {
      routeId: null, headingDeg: 138, pitchDeg: -24, range: 130,
      minRange: 40, maxRange: 600, dragging: false, lastX: 0, lastY: 0,
    };
    this._chaseCb = null;
    this._wireOrbitInput();
    this._tickCb = viewer.scene.preRender.addEventListener(() => this._pumpSnapshot());
  }

  setGrid(grid) {
    this.grid = grid;
    if (this.units.length) this.rebuild();
  }

  setMode(mode) {
    this.mode = mode;
    this.orbit.range = mode === 'vehicle' ? 180 : 90;
    this.rebuild();
  }

  rebuild() {
    const e = this.ds.entities;
    e.removeAll();
    this._loggedIdx.clear();
    const m = MOVE_MODES[this.mode];
    this.units = allRouteData()
      .filter((rd) => routeFeasible(rd, this.mode))
      .map((rd) => ({
        rd,
        dur: rd.totalM / m.speed,
        visArr: this.grid
          ? rd.pts.map((p) => (lookupVisible(this.grid, p.lon, p.lat) ? 1 : 0))
          : rd.pts.map(() => 0),
      }));
    this.maxDur = Math.max(1, ...this.units.map((u) => u.dur));

    // 가시권 세그먼트 오버레이 — 관측권 앰버 글로우 / 사각 적색점선 (GP Digital Twin 분석 산출)
    for (const u of this.units) {
      const { rd } = u;
      const segs = [];
      let cur = { vis: !!u.visArr[0], pts: [rd.pts[0]] };
      for (let i = 1; i < rd.pts.length; i++) {
        cur.pts.push(rd.pts[i]);
        const v = !!u.visArr[i];
        if (v !== cur.vis || i === rd.pts.length - 1) { segs.push(cur); cur = { vis: v, pts: [rd.pts[i]] }; }
      }
      segs.forEach((seg, si) => {
        if (seg.pts.length < 2) return;
        e.add({
          id: `path-${rd.route.id}-${si}`,
          polyline: {
            positions: seg.pts.map((p) => D(p.lon, p.lat)),
            width: seg.vis ? 4 : 2.6,
            clampToGround: true,
            material: seg.vis
              ? new Cesium.PolylineGlowMaterialProperty({ glowPower: 0.22, taperPower: 0.84, color: css('#f2a33c').withAlpha(0.65) })
              : new Cesium.PolylineDashMaterialProperty({ color: css('#ed5d5d').withAlpha(0.85), dashLength: 10 }),
          },
        });
      });
    }

    this._lastSnapshotAt = 0;
    this._pumpSnapshot(true);
  }

  /** GP Digital Twin 상태 → VISTA 스냅샷 유닛 (placementRuntime 계약: longitude/latitude/altitudeMeters/headingDeg/route) */
  _buildSnapshot() {
    const m = MOVE_MODES[this.mode];
    const modelId = VISTA_MODEL_ID[this.mode];
    const units = this.units.map((u) => {
      const { p, vis, distToGP } = this._state(u);
      const heading = this._heading(u);
      return {
        id: u.rd.route.id,
        name: `${u.rd.route.name.split(' — ')[0]} · ${(distToGP / 1000).toFixed(1)}km${vis ? ' ⚠관측중' : ''}`,
        className: m.name,
        side: 'red',
        entityType: 'army',
        groundUnit: true,
        modelId,
        longitude: p.lon,
        latitude: p.lat,
        altitudeMeters: GROUND_CLUSTER_BASE_ALTITUDE_METERS,
        headingDeg: heading,
        speedMetersPerSecond: m.speed,
        // 원본 경로 렌더러가 소비하는 [lat, lon, alt] 배열
        route: u.rd.pts.filter((_, i) => i % 6 === 0).map((q) => [q.lat, q.lon, 0]),
      };
    });
    return {
      units,
      weapons: [],
      events: [],
      referencePoints: [{
        id: 'gp', name: SITE.name, kind: 'objective',
        longitude: SITE.gp.lon, latitude: SITE.gp.lat, altitudeMeters: 0,
      }],
    };
  }

  _pumpSnapshot(force = false) {
    if (!this._visible || !this.units.length) return;
    const now = performance.now();
    if (!force && now - this._lastSnapshotAt < SNAPSHOT_INTERVAL_MS) return;
    this._lastSnapshotAt = now;
    this.runtime.applySnapshot(this._buildSnapshot());
  }

  _state(u) {
    const t = this.tNorm * this.maxDur;
    const dist = Math.min(u.rd.totalM, t * MOVE_MODES[this.mode].speed);
    const i = Math.min(u.rd.pts.length - 1, Math.max(1, Math.round(dist / STEP_M)));
    const p = u.rd.pts[i];
    const vis = !!u.visArr[i];
    if (vis && !this._loggedIdx.has(u.rd.route.id)) {
      this._loggedIdx.add(u.rd.route.id);
      this.onDetect?.(u.rd.route, distM(SITE.gp.lon, SITE.gp.lat, p.lon, p.lat), p);
    }
    return { i, p, vis, distToGP: distM(SITE.gp.lon, SITE.gp.lat, p.lon, p.lat) };
  }

  _heading(u) {
    const { i, p } = this._state(u);
    const q = u.rd.pts[Math.min(u.rd.pts.length - 1, i + 1)];
    return azimuthDeg(p.lon, p.lat, q.lon, q.lat);
  }

  setTime(tNorm) {
    this.tNorm = tNorm;
    if (tNorm < 0.02) this._loggedIdx.clear();
  }

  // ═══ 궤도 추적캠 (VISTA tactical-sim 감도값) ═══
  _wireOrbitInput() {
    const canvas = this.viewer.canvas;
    canvas.addEventListener('pointerdown', (e) => {
      if (!this.orbit.routeId) return;
      this.orbit.dragging = true;
      this.orbit.lastX = e.clientX;
      this.orbit.lastY = e.clientY;
      canvas.setPointerCapture?.(e.pointerId);
    });
    window.addEventListener('pointermove', (e) => {
      if (!this.orbit.dragging || !this.orbit.routeId) return;
      const deltaX = e.clientX - this.orbit.lastX;
      const deltaY = e.clientY - this.orbit.lastY;
      this.orbit.lastX = e.clientX;
      this.orbit.lastY = e.clientY;
      this.orbit.headingDeg = ((this.orbit.headingDeg - deltaX * 0.32) % 360 + 360) % 360;
      this.orbit.pitchDeg = clamp(this.orbit.pitchDeg + deltaY * 0.18, -68, -6);
    });
    window.addEventListener('pointerup', () => { this.orbit.dragging = false; });
    canvas.addEventListener('wheel', (e) => {
      if (!this.orbit.routeId) return;
      e.preventDefault();
      const zoomDelta = clamp(e.deltaY * 0.06, -18, 18);
      this.orbit.range = clamp(this.orbit.range + zoomDelta, this.orbit.minRange, this.orbit.maxRange);
    }, { passive: false });
  }

  chase(routeId) {
    this.orbit.routeId = routeId;
    const c = this.viewer.scene.screenSpaceCameraController;
    c.enableRotate = c.enableTranslate = c.enableZoom = c.enableTilt = c.enableLook = false;
    if (this._chaseCb) return;
    this._chaseCb = this.viewer.scene.preRender.addEventListener(() => {
      if (!this.orbit.routeId) return;
      const u = this.units.find((x) => x.rd.route.id === this.orbit.routeId);
      if (!u) return;
      const { p } = this._state(u);
      const heading = this._heading(u);
      const focus = D(p.lon, p.lat, p.h + 6);
      this.viewer.camera.lookAt(focus, new Cesium.HeadingPitchRange(
        rad(this.orbit.headingDeg + heading),
        rad(this.orbit.pitchDeg),
        this.orbit.range,
      ));
    });
  }

  stopChase() {
    this.orbit.routeId = null;
    if (this._chaseCb) { this._chaseCb(); this._chaseCb = null; }
    this.viewer.camera.lookAtTransform(Cesium.Matrix4.IDENTITY);
    const c = this.viewer.scene.screenSpaceCameraController;
    c.enableRotate = c.enableTranslate = c.enableZoom = c.enableTilt = c.enableLook = true;
  }

  show(v) {
    this._visible = v;
    this.ds.show = v;
    if (v) this._pumpSnapshot(true);
    else this.runtime.clearPlacement();
  }
}

