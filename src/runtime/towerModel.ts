// @ts-nocheck
/**
 * 감시탑 실물 3D 모델 — Blender 제작 모듈형 GLB
 *  - assets/models/gp_tower_base.glb : 콘크리트 기초 + 장비셸터/발전기 (지반면)
 *  - assets/models/gp_tower_mast.glb : 4m 격자 트러스 세그먼트 (반복 스택)
 *  - assets/models/gp_tower_cab.glb  : 관측 캐빈 (데크·난간·유리 관측실·레이돔·서치라이트·비컨)
 *
 * 높이 슬라이더(6~40m)에 맞춰 세그먼트 수 n = round(H/4)를 재구성하고
 * 잔여분은 세그먼트 Z 스케일(H / 4n)로 흡수 — 재빌드 없이 modelMatrix만 갱신.
 *
 * 좌표 규약: Blender Z-up 제작 → glTF Y-up 내보내기 → Cesium이 다시 Z-up 재기립.
 * 결과적으로 Blender의 +X=동, +Y=북으로 그대로 통과한다 (승탑 사다리는 +Y면).
 */

import { trackEnvModel } from './environment';

const SEG_H = 4.0;
const URLS = {
  base: 'assets/models/gp_tower_base.glb',
  mast: 'assets/models/gp_tower_mast.glb',
  cab: 'assets/models/gp_tower_cab.glb',
};

export class TowerModel {
  /**
   * @param scene Cesium.Scene
   * @param site { lon, lat }
   * @param frontAz 관측 정면 방위각(도) — 캐빈 사다리(+Y면)가 그 반대편을 향한다
   */
  constructor(scene, site, frontAz = 0) {
    this.scene = scene;
    this.lon = site.lon;
    this.lat = site.lat;
    this.frontAz = frontAz;
    this.groundH = 0;
    this.height = 18;
    this.base = null;
    this.cab = null;
    this.segs = [];
    this._token = 0;
    this._syncing = false;
    this._visible = true;
    this.damage = null;   // 정밀타격 피해 연출 {collapse, tint, tintAmount}
  }

  /**
   * 피해 연출을 건다 (화력 탭 정밀타격 시뮬레이션). null 이면 원래대로.
   *
   * 판정표가 「감시탑 완파」라고 적어 놓고 화면의 탑은 멀쩡히 서 있으면, 둘 중
   * 하나는 거짓말이다. 탑은 이 GP 의 존재 이유이므로 가장 먼저 무너져야 한다.
   */
  setDamage(dmg) {
    this.damage = dmg;
    this.update();
  }

  /**
   * 기본 행렬 위에 붕괴를 덧곱한다 — **위에 있는 부재일수록 크게** 내려앉고 기운다.
   * 캐빈이 먼저 주저앉고 기둥이 마지막까지 버티는 순서가 실루엣에 나와야 한다.
   */
  _dmg(m, zOff) {
    const d = this.damage;
    if (!d || !(d.collapse > 0)) return m;
    const c = Math.min(1, d.collapse);
    const hi = Math.min(1, 0.30 + zOff / Math.max(4, this.height));
    const local = Cesium.Matrix4.fromTranslation(
      new Cesium.Cartesian3(0, 0, -c * hi * (0.6 + zOff * 0.55)));
    Cesium.Matrix4.multiply(local, Cesium.Matrix4.fromRotationTranslation(
      Cesium.Matrix3.multiply(
        Cesium.Matrix3.fromRotationX(c * hi * 0.30),
        Cesium.Matrix3.fromRotationY(c * hi * 0.18),
        new Cesium.Matrix3()),
      Cesium.Cartesian3.ZERO), local);
    return Cesium.Matrix4.multiply(m, local, new Cesium.Matrix4());
  }

  _tint(model) {
    const d = this.damage;
    if (!model) return;
    // 완전 붕괴에서는 상부(캐빈·상단 세그먼트)가 남아 있지 않다
    if (d?.stage === 'ruin' && model !== this.base) {
      model.show = false;
    } else if (this._visible) {
      model.show = true;
    }
    if (d?.tint) {
      model.color = Cesium.Color.fromCssColorString(d.tint);
      model.colorBlendMode = Cesium.ColorBlendMode.MIX;
      model.colorBlendAmount = d.tintAmount ?? 0.5;
    } else {
      model.color = Cesium.Color.WHITE;
      model.colorBlendAmount = 0;
    }
  }

  /** ENU 로컬 변환: rotZ(180−frontAz) → z 오프셋 → z 스케일 */
  _matrix(zOff, zScale = 1) {
    const origin = Cesium.Cartesian3.fromDegrees(this.lon, this.lat, this.groundH);
    const enu = Cesium.Transforms.eastNorthUpToFixedFrame(origin);
    const rot = Cesium.Matrix3.fromRotationZ(Cesium.Math.toRadians(180 - this.frontAz));
    const local = Cesium.Matrix4.fromRotationTranslation(rot, new Cesium.Cartesian3(0, 0, zOff));
    if (zScale !== 1) {
      Cesium.Matrix4.multiplyByScale(local, new Cesium.Cartesian3(1, 1, zScale), local);
    }
    return Cesium.Matrix4.multiply(enu, local, new Cesium.Matrix4());
  }

  async _load(url, matrix) {
    const model = await Cesium.Model.fromGltfAsync({
      url,
      modelMatrix: matrix,
      // 근접(FPV/도보)에서도 실루엣이 뭉개지지 않도록
      scale: 1.0,
      id: { id: 'gp-tower' },        // 맵 다이렉트 인스펙터 픽킹용
    });
    // 블룸(brightness −0.42)+HDR 환경에서 PBR 모델 어둡게 눌림 보정 — 실제 밝기는
    // env(시간·계절·날씨)가 매 프레임 다시 정한다.
    model.lightColor = new Cesium.Cartesian3(2.2, 2.2, 2.2);
    model.imageBasedLighting.imageBasedLightingFactor = new Cesium.Cartesian2(1.8, 1.8);
    trackEnvModel(model, { baseColor: [2.2, 2.2, 2.2], baseIBL: [1.8, 1.8], surfaceWeather: true });
    model.show = this._visible;
    this.scene.primitives.add(model);
    return model;
  }

  async build() {
    if (this.base) return;
    const token = ++this._token;
    const [base, cab] = await Promise.all([
      this._load(URLS.base, this._matrix(0)),
      this._load(URLS.cab, this._matrix(this.height)),
    ]);
    if (token !== this._token) return; // destroy됨
    this.base = base;
    this.cab = cab;
    await this._syncSegments();
  }

  /** 슬라이더/FPV 증고 — 세그먼트 수 조정 + 행렬 갱신 */
  setHeight(h) {
    if (!Number.isFinite(h) || h === this.height) return;
    this.height = h;
    this.update();
  }

  update() {
    if (!this.base) return;
    const { n, s } = this._layout();
    this.base.modelMatrix = this._dmg(this._matrix(0), 0);
    this.cab.modelMatrix = this._dmg(this._matrix(this.height), this.height);
    this.segs.forEach((m, i) => {
      const z = i * SEG_H * s;
      m.modelMatrix = this._dmg(this._matrix(z, s), z);
    });
    for (const m of [this.base, this.cab, ...this.segs]) this._tint(m);
    if (n !== this.segs.length) this._syncSegments();
  }

  _layout() {
    const n = Math.max(1, Math.round(this.height / SEG_H));
    return { n, s: this.height / (n * SEG_H) };
  }

  async _syncSegments() {
    if (this._syncing) return;
    this._syncing = true;
    const token = this._token;
    try {
      for (;;) {
        const { n, s } = this._layout();
        if (this.segs.length === n) break;
        if (this.segs.length > n) {
          const m = this.segs.pop();
          this.scene.primitives.remove(m);
        } else {
          const i = this.segs.length;
          const m = await this._load(URLS.mast, this._matrix(i * SEG_H * s, s));
          if (token !== this._token) { this.scene.primitives.remove(m); return; }
          this.segs.push(m);
        }
      }
      // 수렴 후 최종 행렬 일괄 정합
      const { s } = this._layout();
      this.segs.forEach((m, i) => { m.modelMatrix = this._matrix(i * SEG_H * s, s); });
    } finally {
      this._syncing = false;
    }
  }

  /** FPV 승탑 등 내부 시점에서 자기 몸체 숨김 */
  setVisible(v) {
    this._visible = v;
    for (const m of [this.base, this.cab, ...this.segs]) if (m) m.show = v;
  }

  destroy() {
    this._token++;
    for (const m of [this.base, this.cab, ...this.segs]) {
      if (m) this.scene.primitives.remove(m);
    }
    this.base = this.cab = null;
    this.segs = [];
  }
}

