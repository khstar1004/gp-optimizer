// @ts-nocheck
/**
 * COA 전술 스케치 — 방책(Course of Action) 도식 작도 도구
 *
 * 실무 참모 계획 도구(ArcGIS Military Overlay / KAIROS 사격계획 도식) 관례:
 *  - 공격축(AXIS): 폭 있는 화살표 폴리라인 (적색=적, 청색=아군)
 *  - 방어선(LINE): 굵은 실선 + 짧은 수직 틱 (전방 표시)
 *  - 통제선(PL): 점선 + "PL 이름" 라벨 (phase line)
 *  - 장애물지대(OBSTACLE): 지그재그 라인 (철조망/대전차 장애물 관례)
 *  - 목표(OBJ): 원 + "OBJ 이름" (objective)
 * 클릭으로 꼭짓점 추가, 우클릭 완성. localStorage 영속 + undo 대상 아님(별도 레이어).
 */
import { distM, offset, azimuthDeg } from './geo';

const D = Cesium.Cartesian3.fromDegrees;
const css = (c) => Cesium.Color.fromCssColorString(c);
const STORE_KEY = 'gp-digital-twin:coaSketch';

export const COA_TOOLS = {
  'axis-enemy': { name: '적 공격축', color: '#ff5252', kind: 'axis', min: 2 },
  'axis-friendly': { name: '아군 반격축', color: '#4fc3f7', kind: 'axis', min: 2 },
  line: { name: '방어선 (FEBA)', color: '#4fc3f7', kind: 'line', min: 2 },
  pl: { name: '통제선 (PL)', color: '#ffc857', kind: 'pl', min: 2 },
  obstacle: { name: '장애물지대', color: '#67f29b', kind: 'obstacle', min: 2 },
  obj: { name: '목표 (OBJ)', color: '#ff5252', kind: 'obj', min: 1 },
};

let seq = 0;

export class CoaSketch {
  constructor(viewer, getGroundH) {
    this.viewer = viewer;
    this.getGroundH = getGroundH;
    this.ds = new Cesium.CustomDataSource('coa-sketch');
    viewer.dataSources.add(this.ds);
    this.tool = null;          // 활성 도구 id
    this.points = [];          // 작도 중 꼭짓점
    this.items = [];           // {uid, tool, points:[{lon,lat,h}], label}
    this.onChange = null;
    this.onStatus = null;
    this.realTerrain = null; // main.ts가 생성 직후 주입 — GP 블렌더 지형 표면 참조
    this._wire();
    this._restore();
  }

  /** 점의 실제 표고 — GP 정밀지형 표출 중이면 그 GLB 표면을 우선한다(저장된 h는
   * 다른 지형 모드에서 잰 값일 수 있어 복원·모드 전환 시 어긋날 수 있다). */
  _h(p) {
    const rt = this.realTerrain;
    if (rt?.active && rt?.surfaceReady) {
      const h = rt.surfaceHeightAt(p.lon, p.lat);
      if (Number.isFinite(h)) return h;
    }
    return p.h ?? this.getGroundH();
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
      if (!this.tool) return;
      const ll = this._pickLL(ev.position);
      if (!ll) return;
      this.points.push(ll);
      const t = COA_TOOLS[this.tool];
      if (t.kind === 'obj' && this.points.length >= 1) { this._finish(); return; }
      this._drawDraft();
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK);
    handler.setInputAction(() => {
      if (!this.tool) return;
      const t = COA_TOOLS[this.tool];
      if (this.points.length >= t.min) this._finish();
      else this.cancel();
    }, Cesium.ScreenSpaceEventType.RIGHT_CLICK);
  }

  setTool(tool) {
    this.cancel();
    this.tool = tool;
    if (tool) {
      const t = COA_TOOLS[tool];
      this.onStatus?.(t.kind === 'obj'
        ? `${t.name}: 지도 클릭 1회로 배치`
        : `${t.name}: 꼭짓점 클릭 · 우클릭으로 완성`);
    }
  }

  cancel() {
    this.tool = null;
    this.points = [];
    this._clearDraft();
    this.onStatus?.(null);
  }

  _clearDraft() {
    const d = this.ds.entities.getById('coa-draft');
    if (d) this.ds.entities.remove(d);
  }

  _drawDraft() {
    this._clearDraft();
    if (this.points.length < 2) return;
    // clampToGround 는 GP 정밀지형(globe.show=false)에서 접지되지 않는다 — 클릭 시
    // 이미 정확히 잰 각 점의 표고(p.h, pickPosition 기반)를 그대로 쓴다.
    this.ds.entities.add({
      id: 'coa-draft',
      polyline: {
        positions: this.points.map((p) => D(p.lon, p.lat, (p.h ?? 0) + 0.5)),
        width: 2,
        material: new Cesium.PolylineDashMaterialProperty({ color: css('#e8edf2').withAlpha(0.7), dashLength: 8 }),
      },
    });
  }

  _finish() {
    const t = COA_TOOLS[this.tool];
    const n = ++seq;
    const item = {
      uid: `coa${Date.now()}-${n}`,
      tool: this.tool,
      points: this.points.slice(),
      label: t.kind === 'pl' ? `PL ${String.fromCharCode(64 + ((n - 1) % 26) + 1)}`
        : t.kind === 'obj' ? `OBJ ${n}` : t.name,
    };
    this.items.push(item);
    this._drawItem(item);
    this._clearDraft();
    this.points = [];
    this.tool = null;
    this.onStatus?.(null);
    this._save();
    this.onChange?.();
  }

  _drawItem(item) {
    const t = COA_TOOLS[item.tool];
    const e = this.ds.entities;
    const pts = item.points;
    const col = css(t.color);

    // clampToGround 는 GP 정밀지형(globe.show=false)에서 접지되지 않는다 — 작도 시
    // 잰 표고(p.h)나, 저장분 복원·모드 전환 뒤라면 그 시점의 GLB 표면(_h)을 쓴다.
    const z = (p) => this._h(p) + 0.5;
    if (t.kind === 'axis') {
      // 공격축: 굵은 화살표 (PolylineArrow — 종점에 화살촉)
      e.add({
        id: `${item.uid}-l`,
        polyline: {
          positions: pts.map((p) => D(p.lon, p.lat, z(p))),
          width: 16,
          material: new Cesium.PolylineArrowMaterialProperty(col.withAlpha(0.85)),
        },
      });
    } else if (t.kind === 'line') {
      e.add({
        id: `${item.uid}-l`,
        polyline: {
          positions: pts.map((p) => D(p.lon, p.lat, z(p))),
          width: 4.5, material: col.withAlpha(0.95),
        },
      });
      // 전방 틱 (선분 중앙마다 수직 짧은 선)
      for (let i = 1; i < pts.length; i++) {
        const a = pts[i - 1], b = pts[i];
        const mid = { lon: (a.lon + b.lon) / 2, lat: (a.lat + b.lat) / 2 };
        const midH = (this._h(a) + this._h(b)) / 2;
        const az = azimuthDeg(a.lon, a.lat, b.lon, b.lat);
        const tick = offset(mid.lon, mid.lat, az - 90, 60);
        e.add({
          id: `${item.uid}-t${i}`,
          polyline: {
            positions: [D(mid.lon, mid.lat, midH + 0.5), D(tick.lon, tick.lat, midH + 0.5)],
            width: 3, material: col.withAlpha(0.95),
          },
        });
      }
    } else if (t.kind === 'pl') {
      e.add({
        id: `${item.uid}-l`,
        polyline: {
          positions: pts.map((p) => D(p.lon, p.lat, z(p))),
          width: 3,
          material: new Cesium.PolylineDashMaterialProperty({ color: col.withAlpha(0.9), dashLength: 18 }),
        },
      });
    } else if (t.kind === 'obstacle') {
      // 지그재그 (철조망 관례): 세그먼트를 60m 간격 톱니로 재생성
      const zig = [];
      for (let i = 1; i < pts.length; i++) {
        const a = pts[i - 1], b = pts[i];
        const len = distM(a.lon, a.lat, b.lon, b.lat);
        const az = azimuthDeg(a.lon, a.lat, b.lon, b.lat);
        const nSeg = Math.max(2, Math.round(len / 60));
        const aH = this._h(a), bH = this._h(b);
        for (let s = 0; s <= nSeg; s++) {
          const base = offset(a.lon, a.lat, az, (len * s) / nSeg);
          const side = s % 2 === 0 ? 0 : 40;
          const p = side ? offset(base.lon, base.lat, az - 90, side) : base;
          zig.push({ ...p, h: aH + (bH - aH) * (s / nSeg) });
        }
      }
      e.add({
        id: `${item.uid}-l`,
        polyline: {
          positions: zig.map((p) => D(p.lon, p.lat, p.h + 0.5)),
          width: 2.6, material: col.withAlpha(0.95),
        },
      });
    } else if (t.kind === 'obj') {
      const c = pts[0];
      const ring = [];
      for (let a = 0; a <= 360; a += 6) ring.push(offset(c.lon, c.lat, a, 180));
      e.add({
        id: `${item.uid}-l`,
        polyline: {
          positions: ring.map((p) => D(p.lon, p.lat, z(c))),
          width: 3.2, material: col.withAlpha(0.95),
        },
      });
    }

    // 라벨 (도식 이름) — 중점/중심
    const mid = pts[Math.floor((pts.length - 1) / 2)];
    e.add({
      id: `${item.uid}-lb`,
      position: D(mid.lon, mid.lat, this._h(mid) + 26),
      label: {
        text: item.label,
        font: '700 12px "Chakra Petch", monospace',
        fillColor: col,
        outlineColor: css('#04161d'), outlineWidth: 3,
        style: Cesium.LabelStyle.FILL_AND_OUTLINE,
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
        scaleByDistance: new Cesium.NearFarScalar(3000, 1, 40000, 0.55),
      },
    });
  }

  remove(uid) {
    const idx = this.items.findIndex((i) => i.uid === uid);
    if (idx < 0) return;
    const ids = this.ds.entities.values.filter((e) => e.id.startsWith(uid)).map((e) => e.id);
    ids.forEach((id) => {
      const x = this.ds.entities.getById(id);
      if (x) this.ds.entities.remove(x);
    });
    this.items.splice(idx, 1);
    this._save();
    this.onChange?.();
  }

  clear() {
    this.ds.entities.removeAll();
    this.items = [];
    this._save();
    this.onChange?.();
  }

  /** 지형 소스가 바뀐 뒤(GP 토글 등) 기존 도식을 새 표면 기준으로 다시 그린다. */
  redrawAll() {
    this.ds.entities.removeAll();
    for (const item of this.items) this._drawItem(item);
  }

  _save() {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(
        this.items.map((i) => ({ tool: i.tool, points: i.points, label: i.label }))));
    } catch { /* noop */ }
  }

  _restore() {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (!raw) return;
      for (const d of JSON.parse(raw)) {
        const item = { uid: `coa${Date.now()}-${++seq}`, tool: d.tool, points: d.points, label: d.label };
        if (!COA_TOOLS[item.tool]) continue;
        this.items.push(item);
        this._drawItem(item);
      }
    } catch { /* noop */ }
  }
}

