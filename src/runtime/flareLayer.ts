// @ts-nocheck
/**
 * 조명탄 표출 — 계산된 조명이 지도 위에 실제로 뜬다
 *
 * `fireSupport.ts` 가 조명을 시간을 가진 상태로 만들었으니, 지도에서도 그 30초가
 * 보여야 한다. 숫자만 바뀌고 화면이 그대로면 「조명을 쐈다」가 성립하지 않는다.
 *
 * 세 가지를 그린다:
 *   ① 조명탄 자체 — 낙하산으로 내려오는 밝은 점. 연소 곡선대로 밝아졌다 사그라든다.
 *   ② 조명 반경 — 지표에 깔리는 원. 이 안이 「지금 관측이 되살아난 구역」이다.
 *   ③ 강하 흔적 — 점화 고도에서 현재 고도까지의 가는 선.
 *
 * 값은 전부 `FireSupport` 에서 온다 — 여기서는 아무것도 계산하지 않는다.
 */
import { BURN_S, burnIntensity, flareAglM, IGNITE_AGL_M } from './fireSupport';
import { offset } from './geo';

const D = Cesium.Cartesian3.fromDegrees;
const css = (c) => Cesium.Color.fromCssColorString(c);

export class FlareLayer {
  /**
   * @param viewer
   * @param fireSupport FireSupport 인스턴스
   */
  constructor(viewer, fireSupport) {
    this.viewer = viewer;
    this.fs = fireSupport;
    this.ds = new Cesium.CustomDataSource('flares');
    viewer.dataSources.add(this.ds);
    this.entities = new Map();   // shotId → [entity…]
    this._tick = viewer.scene.preRender.addEventListener(() => this._sync());
  }

  _sync() {
    const now = performance.now();
    const live = new Set();
    for (const shot of this.fs.shots) {
      const elapsedS = (now - shot.firedAt) / 1000;
      if (elapsedS > BURN_S) continue;
      live.add(shot.id);
      if (!this.entities.has(shot.id)) this._create(shot);
    }
    // 다 탄 것은 걷어낸다
    for (const [id, ents] of this.entities) {
      if (live.has(id)) continue;
      for (const e of ents) this.ds.entities.remove(e);
      this.entities.delete(id);
    }
  }

  _create(shot) {
    const now = () => (performance.now() - shot.firedAt) / 1000;
    const alpha = () => burnIntensity(now());

    // ① 조명탄 — 강하하며 타는 점광
    const flare = this.ds.entities.add({
      position: new Cesium.CallbackProperty(
        () => D(shot.lon, shot.lat, shot.groundH + flareAglM(now())), false),
      point: {
        pixelSize: new Cesium.CallbackProperty(() => 10 + 26 * alpha(), false),
        color: new Cesium.CallbackProperty(
          () => css('#fff3c4').withAlpha(Math.min(1, 0.35 + 0.65 * alpha())), false),
        outlineColor: new Cesium.CallbackProperty(
          () => css('#ffb347').withAlpha(0.7 * alpha()), false),
        outlineWidth: new Cesium.CallbackProperty(() => 4 + 10 * alpha(), false),
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
      },
      label: {
        text: new Cesium.CallbackProperty(
          () => `✸ ${Math.max(0, BURN_S - now()).toFixed(0)}s`, false),
        font: '600 12px "Chakra Petch", monospace',
        fillColor: css('#ffe08a'),
        outlineColor: css('#000'),
        outlineWidth: 3,
        style: Cesium.LabelStyle.FILL_AND_OUTLINE,
        pixelOffset: new Cesium.Cartesian2(0, -26),
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
      },
    });

    // ② 지표 조명 반경 — 「지금 관측이 되살아난 구역」
    //
    // 지형에 깔리는 면(classificationType TERRAIN)에는 outline 을 줄 수 없다
    // (Cesium 이 경고하고 무시한다). 그래서 채움과 테두리를 나눠 — 면은 ellipse,
    // 테두리는 지형에 붙는 폴리라인으로 그린다.
    const ring = this.ds.entities.add({
      position: D(shot.lon, shot.lat, shot.groundH),
      ellipse: {
        semiMajorAxis: shot.radiusM,
        semiMinorAxis: shot.radiusM,
        material: new Cesium.ColorMaterialProperty(new Cesium.CallbackProperty(
          () => css('#ffe08a').withAlpha(0.1 * alpha()), false)),
        classificationType: Cesium.ClassificationType.TERRAIN,
      },
    });
    const rim = this.ds.entities.add({
      polyline: {
        positions: (() => {
          const pts = [];
          for (let a = 0; a <= 360; a += 6) {
            const q = offset(shot.lon, shot.lat, a, shot.radiusM);
            pts.push(q.lon, q.lat);
          }
          return Cesium.Cartesian3.fromDegreesArray(pts);
        })(),
        width: 2,
        clampToGround: true,
        material: new Cesium.ColorMaterialProperty(new Cesium.CallbackProperty(
          () => css('#ffe08a').withAlpha(0.75 * alpha()), false)),
      },
    });

    // ③ 강하 흔적 — 점화점에서 지금까지
    const trail = this.ds.entities.add({
      polyline: {
        positions: new Cesium.CallbackProperty(() => [
          D(shot.lon, shot.lat, shot.groundH + IGNITE_AGL_M),
          D(shot.lon, shot.lat, shot.groundH + flareAglM(now())),
        ], false),
        width: 1.5,
        material: new Cesium.ColorMaterialProperty(new Cesium.CallbackProperty(
          () => css('#ffe08a').withAlpha(0.28 * alpha()), false)),
      },
    });

    this.entities.set(shot.id, [flare, ring, rim, trail]);
  }

  destroy() {
    this._tick?.();
    try { this.viewer.dataSources.remove(this.ds, true); } catch { /* 이미 제거됨 */ }
    this.entities.clear();
  }
}
