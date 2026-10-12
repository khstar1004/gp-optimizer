// @ts-nocheck
/**
 * 드론 편대 — 모델을 지도 위에 띄우고, **감시자산으로 등록한다**
 *
 * 여기서 중요한 것은 표출이 아니다. 떠 있는 드론은 **감시자산**이라는 것 —
 * 상시 감시 엔진이 초소와 똑같이 물어야 하고, 탐지 로그와 축선 공백 분석에
 * 함께 들어가야 한다. 그러지 않으면 드론은 화면 장식으로 남는다.
 *
 * 그래서 `watchAssets()` 가 이 파일의 핵심 출력이다. 공중에 있는 기체만,
 * 그 순간의 짐벌 지향과 페이로드(EO/IR) 제원으로 등록한다 — 착륙해 충전 중인
 * 기체가 계속 감시하고 있다고 적으면 그건 편대 관리가 아니다.
 */
import { SITE } from './data';
import { offset } from './geo';
import {
  DRONE_SPEC, STATE_COLOR, STATE_LABEL, gimbalAimDeg, isOnStation, launch, makeDrone,
  orbitPoint, recall, retargetPatrol, stepDrone,
} from './droneModel';

const D = Cesium.Cartesian3.fromDegrees;
const css = (c) => Cesium.Color.fromCssColorString(c);

/** 페이로드별 청천 제원 — 초소 카탈로그와 같은 규약(band·dri·fov). */
export const PAYLOAD_SPEC = {
  eo: { band: 'vis', dri: [2600, 900, 450], fov: 50, label: 'EO 주간', color: '#63dfff' },
  ir: { band: 'lwir', dri: [2100, 720, 360], fov: 42, label: 'IR 열상', color: '#f28dbb' },
};

export class DroneFleet {
  /**
   * @param ctx { state, toast, onChange }
   */
  constructor(viewer, ctx) {
    this.viewer = viewer;
    this.ctx = ctx;
    this.drones = [];
    this.log = [];
    this.ds = new Cesium.CustomDataSource('drone-fleet');
    viewer.dataSources.add(this.ds);
    this.ents = new Map();
    this._lastT = performance.now();
    this._timer = setInterval(() => this.tick(), 250);
  }

  get state() { return this.ctx.state; }

  /** 기본 편대 — 처음 여는 사람이 빈 격납고를 보지 않도록 */
  seed(n = 2) {
    for (let i = 0; i < n; i += 1) {
      const c = offset(SITE.gp.lon, SITE.gp.lat, i === 0 ? 0 : 340, 1400);
      this.add({ patrolLon: c.lon, patrolLat: c.lat, payload: i === 0 ? 'eo' : 'ir' });
    }
  }

  add(over = {}) {
    const d = makeDrone({
      homeLon: SITE.gp.lon, homeLat: SITE.gp.lat,
      patrolLon: SITE.gp.lon, patrolLat: SITE.gp.lat + 0.012,
      ...over,
    });
    this.drones.push(d);
    this._event(d, '편대 편입');
    this.ctx.onChange?.();
    return d;
  }

  remove(uid) {
    const i = this.drones.findIndex((d) => d.uid === uid);
    if (i < 0) return;
    const [d] = this.drones.splice(i, 1);
    const e = this.ents.get(uid);
    if (e) { e.forEach((x) => this.ds.entities.remove(x)); this.ents.delete(uid); }
    this._event(d, '편대 제외');
    this.ctx.onChange?.();
  }

  get(uid) { return this.drones.find((d) => d.uid === uid) ?? null; }

  launch(uid) {
    const d = this.get(uid);
    if (!d) return;
    const r = launch(d);
    if (!r.ok) { this.ctx.toast?.(`${d.name} — ${r.reason}`, 3200); return; }
    this._event(d, '출격');
    this.ctx.toast?.(`${d.name} 출격 — 순찰 고도 ${Math.round(d.aglM)}m`, 3200);
    this.ctx.onChange?.();
  }

  recall(uid) {
    const d = this.get(uid);
    if (!d) return;
    const r = recall(d);
    if (!r.ok) { this.ctx.toast?.(`${d.name} — ${r.reason}`, 2800); return; }
    this._event(d, '복귀 지시');
    this.ctx.onChange?.();
  }

  setPatrol(uid, lon, lat) {
    const d = this.get(uid);
    if (!d) return;
    retargetPatrol(d, lon, lat);
    this._event(d, '순찰 지점 변경');
    this.ctx.onChange?.();
  }

  update(uid, patch) {
    const d = this.get(uid);
    if (!d) return;
    Object.assign(d, patch);
    this.ctx.onChange?.();
  }

  /** 이 기체의 지금 위치 (해발) — 지형고는 순찰 중심의 지반고로 근사한다. */
  positionOf(d) {
    const p = orbitPoint(d);
    const groundH = this.state.ents?.groundH ?? 0;
    return { lon: p.lon, lat: p.lat, h: groundH + d.curAglM };
  }

  /**
   * **감시 엔진이 읽는 모양.** 공중에 있는 기체만, 그 순간의 짐벌 지향으로.
   * 착륙해 충전 중인 기체가 계속 감시한다고 적으면 편대 관리가 아니다.
   */
  watchAssets() {
    return this.drones.filter(isOnStation).map((d) => {
      const p = orbitPoint(d);
      const spec = PAYLOAD_SPEC[d.payload];
      return {
        uid: d.uid, name: d.name, short: 'UAS', type: `drone-${d.payload}`,
        color: spec.color,
        lon: p.lon, lat: p.lat,
        eyeH: (this.state.ents?.groundH ?? 0) + d.curAglM,
        aimAz: gimbalAimDeg(d), fov: spec.fov,
        drone: true, payload: d.payload,
      };
    });
  }

  /** 페이로드 제원 — 감시 엔진의 perfOf 가 이 값을 실효거리로 바꾼다. */
  specOf(uid) {
    const d = this.get(uid);
    return d ? PAYLOAD_SPEC[d.payload] : null;
  }

  tick() {
    const now = performance.now();
    const dtS = Math.min(2, (now - this._lastT) / 1000);
    this._lastT = now;
    let changed = false;
    for (const d of this.drones) {
      const ev = stepDrone(d, dtS);
      if (ev) { this._event(d, ev); changed = true; }
    }
    this._sync();
    if (changed) this.ctx.onChange?.();
  }

  _event(d, text) {
    this.log.unshift({ at: performance.now(), uid: d.uid, name: d.name, text });
    if (this.log.length > 40) this.log.length = 40;
  }

  // ── 표출 ──────────────────────────────────────────────────────────────
  _sync() {
    for (const d of this.drones) {
      if (!this.ents.has(d.uid)) this._create(d);
      // 지상에 있는 기체는 지도에서 사라진다 — 격납고에 있는 것을 하늘에 그리면 거짓말이다
      const air = d.state !== 'READY' && d.state !== 'CHARGE';
      for (const e of this.ents.get(d.uid)) e.show = air;
    }
  }

  _create(d) {
    const pos = () => {
      const p = this.positionOf(d);
      return D(p.lon, p.lat, p.h);
    };
    const body = this.ds.entities.add({
      id: `drone-${d.uid}`,
      position: new Cesium.CallbackProperty(pos, false),
      point: {
        pixelSize: 11,
        color: new Cesium.CallbackProperty(() => css(STATE_COLOR[d.state]), false),
        outlineColor: css('#0b0f14'),
        outlineWidth: 2,
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
      },
      label: {
        text: new Cesium.CallbackProperty(
          () => `🛸 ${d.name} · ${Math.round(d.battery * 100)}%\n${STATE_LABEL[d.state]} · AGL ${Math.round(d.curAglM)}m`,
          false),
        font: '600 11px "Chakra Petch", monospace',
        fillColor: new Cesium.CallbackProperty(
          () => css(d.battery <= DRONE_SPEC.criticalBattery ? '#ed5d5d' : '#e8f0f6'), false),
        outlineColor: css('#000'), outlineWidth: 3,
        style: Cesium.LabelStyle.FILL_AND_OUTLINE,
        pixelOffset: new Cesium.Cartesian2(0, -22),
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
      },
    });
    // 지면까지의 수직선 — 고도가 눈에 보여야 「300m 위」가 성립한다
    const drop = this.ds.entities.add({
      polyline: {
        positions: new Cesium.CallbackProperty(() => {
          const p = this.positionOf(d);
          return [D(p.lon, p.lat, p.h), D(p.lon, p.lat, this.state.ents?.groundH ?? 0)];
        }, false),
        width: 1,
        material: new Cesium.ColorMaterialProperty(
          new Cesium.CallbackProperty(() => css(STATE_COLOR[d.state]).withAlpha(0.35), false)),
      },
    });
    // 순찰 궤도 — 이 기체가 도는 원
    const ring = this.ds.entities.add({
      polyline: {
        positions: new Cesium.CallbackProperty(() => {
          const pts = [];
          for (let a = 0; a <= 360; a += 8) {
            const q = offset(d.patrolLon, d.patrolLat, a, d.radiusM);
            pts.push(q.lon, q.lat, (this.state.ents?.groundH ?? 0) + d.curAglM);
          }
          return Cesium.Cartesian3.fromDegreesArrayHeights(pts);
        }, false),
        width: 1.4,
        material: new Cesium.ColorMaterialProperty(
          new Cesium.CallbackProperty(() => css(PAYLOAD_SPEC[d.payload].color).withAlpha(0.3), false)),
      },
    });
    // 짐벌 시선 — 지금 무엇을 보고 있는지
    const los = this.ds.entities.add({
      polyline: {
        positions: new Cesium.CallbackProperty(() => {
          const p = this.positionOf(d);
          return [D(p.lon, p.lat, p.h), D(d.patrolLon, d.patrolLat, this.state.ents?.groundH ?? 0)];
        }, false),
        width: 1.2,
        material: new Cesium.ColorMaterialProperty(
          new Cesium.CallbackProperty(() => css(PAYLOAD_SPEC[d.payload].color).withAlpha(0.5), false)),
      },
    });
    this.ents.set(d.uid, [body, drop, ring, los]);
  }

  destroy() {
    clearInterval(this._timer);
    try { this.viewer.dataSources.remove(this.ds, true); } catch { /* 이미 제거됨 */ }
    this.ents.clear();
  }
}
