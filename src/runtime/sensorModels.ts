// @ts-nocheck
/**
 * 감시·화기 자산 실물 거치 모델 — 자산 토글 시 GP 주변에 배치 (build_sensors.py 산출)
 *
 * 배치 규약: GP 기준 방위/거리 오프셋, 지형고는 최초 1회 일괄 샘플(sampleTerrainMostDetailed).
 * heading은 정면(−Y)이 향할 방위각. 화기 4종은 중화기 진지 1기를 공유(하나라도 켜지면 표시).
 */
import { SITE } from './data';
import { offset } from './geo';
import { sampleTerrainDetailed } from './terrainSample';
import { trackEnvModel } from './environment';

const A = 'assets/models/';

// assetId → 거치 스펙 (기본값 — optimizeMountPlacements 결과로 갱신 가능). weapon은 가상 id(화기 공유)
export const MOUNTS = {
  eo: { uri: A + 'sns_cam_mast.glb', az: 38, dist: 15, heading: () => SITE.sector.centerAz },
  ir: { uri: A + 'sns_cam_mast_ir.glb', az: 322, dist: 15, heading: () => SITE.sector.centerAz },
  radar: { uri: A + 'sns_radar_trailer.glb', az: 272, dist: 24, heading: () => SITE.sector.centerAz },
  acoustic: { uri: A + 'sns_acoustic.glb', az: 0, dist: 30, heading: () => 0 },
  cuas: { uri: A + 'sns_cuas_jammer.glb', az: 182, dist: 19, heading: () => SITE.sector.centerAz },
  flare: { uri: A + 'sns_flare.glb', az: 145, dist: 21, heading: () => SITE.sector.centerAz },
  weapon: { uri: A + 'sns_weapon_mount.glb', az: 18, dist: 24, heading: () => SITE.sector.centerAz },
};

export class SensorModelLayer {
  constructor(viewer) {
    this.viewer = viewer;
    this.records = new Map();   // key → { model|null, loading }
    this.heights = null;        // key → 지형고
    this._heightsPromise = null;
  }

  async _sampleHeights() {
    if (this.heights) return this.heights;
    if (!this._heightsPromise) {
      this._heightsPromise = (async () => {
        const keys = Object.keys(MOUNTS);
        const cartos = keys.map((k) => {
          const m = MOUNTS[k];
          const p = offset(SITE.gp.lon, SITE.gp.lat, m.az, m.dist);
          return Cesium.Cartographic.fromDegrees(p.lon, p.lat);
        });
        try {
          await sampleTerrainDetailed(this.viewer.terrainProvider, cartos);
        } catch (e) { console.warn('sensor mount terrain sample failed', e); }
        this.heights = new Map(keys.map((k, i) => [k, cartos[i].height ?? 0]));
        return this.heights;
      })();
    }
    return this._heightsPromise;
  }

  _matrix(key) {
    const m = MOUNTS[key];
    const p = offset(SITE.gp.lon, SITE.gp.lat, m.az, m.dist);
    const h = this.heights?.get(key) ?? 0;
    const origin = Cesium.Cartesian3.fromDegrees(p.lon, p.lat, h);
    const enu = Cesium.Transforms.eastNorthUpToFixedFrame(origin);
    // towerModel/buildingModels와 동일 규약: rotZ(180−heading) → 정면(−Y)이 heading 방위
    // 최적화가 산출한 지향각(aimAz)이 있으면 그쪽을 향한다
    const rot = Cesium.Matrix3.fromRotationZ(Cesium.Math.toRadians(180 - (m.aimAz ?? m.heading())));
    const local = Cesium.Matrix4.fromRotationTranslation(rot, Cesium.Cartesian3.ZERO);
    return Cesium.Matrix4.multiply(enu, local, new Cesium.Matrix4());
  }

  async _ensure(key) {
    let rec = this.records.get(key);
    if (rec) return rec;
    rec = { model: null, loading: true };
    this.records.set(key, rec);
    await this._sampleHeights();
    try {
      const model = await Cesium.Model.fromGltfAsync({
        url: MOUNTS[key].uri,
        modelMatrix: this._matrix(key),
        id: { id: `mount-${key}` },   // 맵 다이렉트 인스펙터 픽킹용
      });
      model.lightColor = new Cesium.Cartesian3(2.2, 2.2, 2.2);       // 블룸+HDR 눌림 보정
      model.imageBasedLighting.imageBasedLightingFactor = new Cesium.Cartesian2(1.8, 1.8);
      trackEnvModel(model, { baseColor: [2.2, 2.2, 2.2], baseIBL: [1.8, 1.8], surfaceWeather: true });
      model.show = false;
      this.viewer.scene.primitives.add(model);
      rec.model = model;
    } catch (e) {
      console.warn('sensor model load fail', key, e);
    }
    rec.loading = false;
    return rec;
  }

  /**
   * 최적화 결과 적용: MOUNTS 갱신 → 지형고 재샘플 → 적재된 모델 행렬 이동
   * placements: Map key → {az, dist}
   */
  async applyPlacements(placements) {
    const keys = [...placements.keys()].filter((k) => MOUNTS[k]);
    if (!keys.length) return;
    for (const k of keys) {
      const p = placements.get(k);
      MOUNTS[k].az = p.az;
      MOUNTS[k].dist = p.dist;
      if (Number.isFinite(p.aimAz)) MOUNTS[k].aimAz = p.aimAz;
    }
    const cartos = keys.map((k) => {
      const m = MOUNTS[k];
      const p = offset(SITE.gp.lon, SITE.gp.lat, m.az, m.dist);
      return Cesium.Cartographic.fromDegrees(p.lon, p.lat);
    });
    try {
      await sampleTerrainDetailed(this.viewer.terrainProvider, cartos);
    } catch (e) { console.warn('mount re-sample failed', e); }
    if (!this.heights) this.heights = new Map();
    keys.forEach((k, i) => this.heights.set(k, cartos[i].height ?? this.heights.get(k) ?? 0));
    for (const k of keys) {
      const rec = this.records.get(k);
      if (rec?.model) rec.model.modelMatrix = this._matrix(k);
    }
  }

  /** activeIds: 현재 켜진 자산 id Set — 화기(rifle/mg/hmg/agl)는 weapon으로 합산 */
  async sync(activeIds, weaponIds) {
    const want = new Set();
    for (const id of activeIds) {
      if (weaponIds.includes(id)) want.add('weapon');
      else if (MOUNTS[id]) want.add(id);
    }
    for (const key of want) {
      const rec = await this._ensure(key);
      if (rec.model) rec.model.show = true;
    }
    for (const [key, rec] of this.records) {
      if (!want.has(key) && rec.model) rec.model.show = false;
    }
  }
}

