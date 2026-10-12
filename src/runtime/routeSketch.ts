// @ts-nocheck
/**
 * 위협 축선 작도기 — 계획관이 직접 그리는 적 침투 축선
 *
 * 고정 4개 축선(INFIL_ROUTES)과 완전히 같은 계약으로 routeCache에 등록되므로,
 * 작도 즉시 침투 리허설(VISTA 유닛)·IPB 채점·워게임 판정·결심 타임라인·
 * 작전계획 보고서가 전부 이 축선을 함께 소비한다 — 통합 지점은 addRoute 하나다.
 *
 * 조작: 시작점부터 웨이포인트 클릭(북→남, GP 방향 순서) → 우클릭 완성 · Esc 취소.
 * localStorage 영속(gp-digital-twin:customRoutes) — 지형 소스 교체로 routeCache가
 * 재구축될 때는 restoreAll()이 다시 등록한다.
 */
import { SITE } from './data';
import { distM } from './geo';
import { addRoute, removeRoute } from './infiltration';

const D = Cesium.Cartesian3.fromDegrees;
const css = (c) => Cesium.Color.fromCssColorString(c);
const STORE_KEY = 'gp-digital-twin:customRoutes';
const COLORS = ['#ff8a65', '#ba68c8', '#4db6ac', '#f06292', '#a1887f', '#7986cb'];
const MIN_POINTS = 2;
const MAX_ROUTES = 6;

export class RouteSketch {
  constructor(viewer) {
    this.viewer = viewer;
    this.ds = new Cesium.CustomDataSource('route-sketch');
    viewer.dataSources.add(this.ds);
    this.active = false;
    this.points = [];        // [[lon,lat], ...]
    this.defs = [];          // 저장된 사용자 축선 정의
    this.onStatus = null;    // (msg|null) => void
    this.onDone = null;      // (routeData) => void — 등록 완료 (재렌더 훅)
    this._seq = 0;
    this.realTerrain = null; // main.ts가 생성 직후 주입 — GP 블렌더 지형 표면 참조(작도선 접지)
    this._wire();
    this._load();
  }

  _wire() {
    const handler = new Cesium.ScreenSpaceEventHandler(this.viewer.canvas);
    handler.setInputAction((ev) => {
      if (!this.active) return;
      // GP 정밀지형에서는 globe.pick 이 안 보이는 라이브 지형과 광선을 맞춰
      // 클릭 지점이 어긋난다 — 실제로 그려진 표면을 pickPosition 으로 우선 잡는다.
      let cart = null;
      if (this.viewer.scene.pickPositionSupported) cart = this.viewer.scene.pickPosition(ev.position);
      if (!cart) {
        const ray = this.viewer.camera.getPickRay(ev.position);
        cart = ray && this.viewer.scene.globe.pick(ray, this.viewer.scene);
      }
      if (!cart) return;
      const c = Cesium.Cartographic.fromCartesian(cart);
      this.points.push([Cesium.Math.toDegrees(c.longitude), Cesium.Math.toDegrees(c.latitude)]);
      this._drawDraft();
      const [lon, lat] = this.points[this.points.length - 1];
      this.onStatus?.(`${this.points.length}점 — GP까지 ${(distM(lon, lat, SITE.gp.lon, SITE.gp.lat) / 1000).toFixed(1)}km · 우클릭으로 완성`);
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK);
    handler.setInputAction(() => {
      if (!this.active) return;
      if (this.points.length >= MIN_POINTS) void this._finish();
      else this.cancel();
    }, Cesium.ScreenSpaceEventType.RIGHT_CLICK);
  }

  begin() {
    if (this.defs.length >= MAX_ROUTES) {
      this.onStatus?.(`작도 축선은 최대 ${MAX_ROUTES}개 — 기존 축선을 삭제 후 다시 그리세요`);
      return false;
    }
    this.active = true;
    this.points = [];
    this.onStatus?.('침투 시작점부터 클릭 (적 방향 → GP 방향 순서) · 우클릭 완성 · Esc 취소');
    return true;
  }

  cancel() {
    this.active = false;
    this.points = [];
    this._clearDraft();
    this.onStatus?.(null);
  }

  _clearDraft() {
    ['rs-draft', 'rs-draft-pts'].forEach((id) => {
      const e = this.ds.entities.getById(id);
      if (e) this.ds.entities.remove(e);
    });
    // 번호 점들
    this.ds.entities.values
      .filter((e) => e.id.startsWith('rs-p'))
      .forEach((e) => this.ds.entities.remove(e));
  }

  /** GP 정밀지형 표출 중이면 그 GLB 표면고를, 아니면 null(호출부가 clampToGround 폴백). */
  _z(lon, lat) {
    const rt = this.realTerrain;
    if (rt?.active && rt?.surfaceReady) {
      const h = rt.surfaceHeightAt(lon, lat);
      if (Number.isFinite(h)) return h;
    }
    return null;
  }

  _drawDraft() {
    this._clearDraft();
    // clampToGround/HeightReference.CLAMP_TO_GROUND 는 GP 정밀지형(globe.show=false)
    // 에서 접지되지 않는다(entities.ts _surfZ 주석 참고) — 점마다 절대고도를 직접 박는다.
    const rtActive = !!(this.realTerrain?.active && this.realTerrain?.surfaceReady);
    if (this.points.length >= 2) {
      this.ds.entities.add({
        id: 'rs-draft',
        polyline: {
          positions: this.points.map(([lon, lat]) => D(lon, lat, rtActive ? (this._z(lon, lat) ?? 0) + 0.5 : 0)),
          width: 3, clampToGround: !rtActive,
          material: new Cesium.PolylineDashMaterialProperty({ color: css('#e8edf2').withAlpha(0.85), dashLength: 10 }),
        },
      });
    }
    this.points.forEach(([lon, lat], i) => {
      this.ds.entities.add({
        id: `rs-p${i}`,
        position: D(lon, lat, rtActive ? (this._z(lon, lat) ?? 0) + 0.5 : 0),
        point: {
          pixelSize: 8, color: css('#f2a33c'),
          outlineColor: css('#0b0f14'), outlineWidth: 2,
          heightReference: rtActive ? Cesium.HeightReference.NONE : Cesium.HeightReference.CLAMP_TO_GROUND,
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
        },
        label: {
          text: String(i + 1),
          font: '700 11px "Chakra Petch"',
          fillColor: css('#ffd89a'),
          pixelOffset: new Cesium.Cartesian2(0, -16),
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
        },
      });
    });
  }

  async _finish() {
    this.active = false;
    const n = ++this._seq;
    const def = {
      id: `c${Date.now() % 100000}-${n}`,
      name: `작도축선 ${this.defs.length + 1} — 사용자 지정`,
      color: COLORS[this.defs.length % COLORS.length],
      waypoints: this.points.slice(),
      custom: true,
    };
    this._clearDraft();
    this.points = [];
    this.onStatus?.('지형 클램프 · 경사 분석 중…');
    const rd = await addRoute(this.viewer, def);
    this.defs.push(def);
    this._save();
    this.onStatus?.(null);
    this.onDone?.(rd);
    return rd;
  }

  remove(id) {
    const idx = this.defs.findIndex((d) => d.id === id);
    if (idx < 0) return;
    this.defs.splice(idx, 1);
    removeRoute(id);
    this._save();
  }

  _save() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(this.defs)); } catch { /* noop */ }
  }

  _load() {
    try {
      this.defs = JSON.parse(localStorage.getItem(STORE_KEY) ?? '[]');
      if (!Array.isArray(this.defs)) this.defs = [];
    } catch { this.defs = []; }
  }

  /** 부트 및 지형 소스 교체 후 — 저장된 작도 축선을 routeCache에 재등록 */
  async restoreAll() {
    for (const def of this.defs) {
      try { await addRoute(this.viewer, def); } catch (e) { console.warn('custom route restore failed', def.id, e); }
    }
    return this.defs.length;
  }
}
