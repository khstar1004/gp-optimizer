// @ts-nocheck
/**
 * 트윈 기본 엔티티 — 감시탑(높이 가변), 책임구역, 후방허브, 상시 레이더 스윕
 */
import { SITE } from './data';
import { offset } from './geo';
import { TowerModel } from './towerModel';
import { sampleTerrainDetailed } from './terrainSample';

const D = Cesium.Cartesian3.fromDegrees;
const css = (c) => Cesium.Color.fromCssColorString(c);

export class SiteEntities {
  constructor(viewer) {
    this.viewer = viewer;
    this.ds = new Cesium.CustomDataSource('site');
    viewer.dataSources.add(this.ds);
    this.groundH = 0;
    this.hubGroundH = 0;
    this._towerH = 18;
    this.tower = null; // Blender 제작 모듈형 GLB (towerModel.js)
    this.realTerrain = null; // main.ts가 생성 직후 주입 — GP 블렌더 지형 표면 참조
  }

  /**
   * GP 정밀지형이 표출 중이면 그 GLB 표면고를, 아니면 null 을 반환한다.
   * `Cesium.HeightReference`/`polyline.clampToGround` 는 내부적으로
   * `globe.show===true` 일 때만 지형고를 반환해(Scene.getHeight 소스 확인,
   * walk.ts/trainingEvidence.ts 와 같은 결함) GP 디오라마(globe.show=false)에서는
   * 절대 접지되지 않는다 — 그래서 부채꼴·거리링은 접지가 필요할 때 이 값으로
   * 명시적 절대고도를 박아 넣는다.
   */
  _surfZ(lon, lat) {
    const rt = this.realTerrain;
    if (rt?.active && rt?.surfaceReady) {
      const h = rt.surfaceHeightAt(lon, lat);
      if (Number.isFinite(h)) return h;
    }
    return null;
  }

  /** runtime/main.ts가 `ents.towerHeight = h`로 대입 — 실물 모델도 함께 갱신 */
  get towerHeight() { return this._towerH; }
  set towerHeight(h) {
    this._towerH = h;
    this.tower?.setHeight(h);
  }

  _rm(prefix) {
    const e = this.ds.entities;
    [...e.values].filter((x) => x.id.startsWith(prefix)).forEach((x) => e.remove(x));
  }

  /** 감시탑 — Blender 제작 모듈형 GLB (베이스 + 4m 트러스 × n + 관측 캐빈) */
  buildTower() {
    this._rm('tower-');
    const e = this.ds.entities;
    const { lon, lat } = SITE.gp;
    const g = () => this.groundH;
    const H = () => this.towerHeight;

    // 실물 모델 — 관측 정면을 책임구역 중심 방위로
    if (!this.tower) {
      this.tower = new TowerModel(this.viewer.scene, SITE.gp, SITE.sector.centerAz);
    }
    this.tower.groundH = this.groundH;
    this.tower.height = this.towerHeight;
    this.tower.build().then(() => this.tower.update());

    e.add({
      id: 'tower-base',
      position: new Cesium.CallbackProperty(() => D(lon, lat, g() + 0.5), false),
      ellipse: {
        semiMajorAxis: 14, semiMinorAxis: 14,
        material: css('#f2a33c').withAlpha(0.08),
        outline: true, outlineColor: css('#f2a33c').withAlpha(0.55),
        height: new Cesium.CallbackProperty(() => g() + 0.5, false),
      },
    });
    const t0 = performance.now();
    // 캐빈 지붕 비컨 구체 위치에 점멸 포인트 중첩 (원거리 시인성)
    e.add({
      id: 'tower-beacon',
      position: new Cesium.CallbackProperty(() => D(lon, lat, g() + H() + 4.75), false),
      point: {
        pixelSize: new Cesium.CallbackProperty(() => (Math.floor(performance.now() / 700) % 2 ? 7 : 3), false),
        color: css('#ff5252'),
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
      },
    });
    // 상시 레이더 스윕 (책임구역 왕복) — 발원점: 캐빈 지붕 레이돔 높이
    e.add({
      id: 'tower-sweep',
      polyline: {
        positions: new Cesium.CallbackProperty(() => {
          const t = (performance.now() - t0) / 1000;
          const az = SITE.sector.centerAz + Math.sin(t * 0.55) * SITE.sector.halfAngle;
          const p = offset(lon, lat, az, 3600);
          return [D(lon, lat, g() + H() + 3.3), D(p.lon, p.lat, g() - 120)];
        }, false),
        width: 3,
        material: new Cesium.PolylineGlowMaterialProperty({
          glowPower: 0.32, taperPower: 0.55, color: css('#f2a33c').withAlpha(0.75),
        }),
      },
    });
    e.add({
      id: 'tower-label',
      position: new Cesium.CallbackProperty(() => D(lon, lat, g() + H() + 15), false),
      label: {
        text: new Cesium.CallbackProperty(
          () => `${SITE.name}\n감시탑 ${this.towerHeight}m · 표고 ${Math.round(this.groundH)}m`, false),
        font: '600 13px "Pretendard GOV", sans-serif',
        fillColor: Cesium.Color.WHITE,
        showBackground: true,
        backgroundColor: css('#0b1420').withAlpha(0.82),
        backgroundPadding: new Cesium.Cartesian2(10, 6),
        pixelOffset: new Cesium.Cartesian2(0, -12),
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
        scaleByDistance: new Cesium.NearFarScalar(1000, 1.0, 30000, 0.55),
      },
    });
  }

  /** 책임구역 부채꼴 + 거리 링 */
  buildSector() {
    this._rm('sector');
    const e = this.ds.entities;
    const { gp, sector } = SITE;
    // GP 표출 중이면 점마다 GLB 표면고를 재 박아 넣는다 — clampToGround 는
    // globe.show=false 인 디오라마에서 아예 동작하지 않는다(_surfZ 주석 참고).
    const gpZ = this._surfZ(gp.lon, gp.lat);
    const abs = gpZ != null;
    const cart = (lon, lat) => (abs ? D(lon, lat, this._surfZ(lon, lat) ?? gpZ) : Cesium.Cartesian3.fromDegrees(lon, lat));
    const pts = [cart(gp.lon, gp.lat)];
    for (let a = -sector.halfAngle; a <= sector.halfAngle; a += 3) {
      const p = offset(gp.lon, gp.lat, sector.centerAz + a, sector.maxR);
      pts.push(cart(p.lon, p.lat));
    }
    pts.push(cart(gp.lon, gp.lat));
    e.add({
      id: 'sector',
      polyline: {
        positions: pts,
        width: 2.5, clampToGround: !abs,
        material: new Cesium.PolylineDashMaterialProperty({ color: css('#f2a33c').withAlpha(0.7), dashLength: 14 }),
      },
    });
    for (const rKm of [1, 2, 3]) {
      const ring = [];
      for (let a = -sector.halfAngle; a <= sector.halfAngle; a += 4) {
        const p = offset(gp.lon, gp.lat, sector.centerAz + a, rKm * 1000);
        ring.push(cart(p.lon, p.lat));
      }
      e.add({
        id: `sector-ring-${rKm}`,
        polyline: {
          positions: ring,
          width: 1.2, clampToGround: !abs,
          material: css('#f2a33c').withAlpha(0.18),
        },
      });
      const lp = offset(gp.lon, gp.lat, sector.centerAz - sector.halfAngle + 6, rKm * 1000);
      e.add({
        id: `sector-ringlbl-${rKm}`,
        position: abs ? D(lp.lon, lp.lat, this._surfZ(lp.lon, lp.lat) ?? gpZ) : D(lp.lon, lp.lat, this.groundH),
        label: {
          text: `${rKm}km`, font: '500 10px "Chakra Petch", sans-serif',
          fillColor: css('#f2a33c').withAlpha(0.7),
          heightReference: abs ? Cesium.HeightReference.NONE : Cesium.HeightReference.CLAMP_TO_GROUND,
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
          scaleByDistance: new Cesium.NearFarScalar(3000, 1.0, 30000, 0.4),
          distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 9000),
        },
      });
    }
  }

  /** 후방 지휘통제 허브 — 실물 에셋 야드 (VISTA Sketchfab 번들) + 데이터링크 */
  async buildHub() {
    const e = this.ds.entities;
    const alreadyBuilt = !!e.getById('hub');
    const { hub } = SITE;
    const g = this.hubGroundH;

    // 배치 계획: [id, uri, scale, headingDeg, az, distM, zOff]
    // zOff: 모델 원점이 바닥이 아닌 경우 보정 (행거 zmin=-14.67 × 0.45배)
    const plan = [
      ['hub', 'assets/models/hub_hangar.glb', 0.45, 25, 0, 0, 14.67 * 0.45],
      ['hub-m577a', 'assets/models/hub_m577.glb', 1.0, 205, 115, 30, 0],
      ['hub-m577b', 'assets/models/hub_m577.glb', 1.0, 340, 245, 26, 0],
      ['hub-cont-0', 'assets/models/hub_container.glb', 1.0, 25, 178, 34, 0],
      ['hub-cont-1', 'assets/models/hub_container.glb', 1.0, 115, 182, 41, 0],
      ['hub-cont-2', 'assets/models/hub_container.glb', 1.0, 25, 186, 48, 0],
    ].map(([id, uri, scale, headingDeg, az, distM, zOff]) => {
      const p = distM ? offset(hub.lon, hub.lat, az, distM) : hub;
      return { id, uri, scale, headingDeg, lon: p.lon, lat: p.lat, zOff, groundH: g };
    });

    // heightReference 클램핑이 이 지형 구성에서 불안정 → 지형고를 직접 샘플해 절대고도 배치.
    // GP 정밀지형 표출 중이면 그 GLB 표면(_surfZ)을 우선한다 — 라이브 지형만 보면
    // walk.ts/placement.ts 와 같은 결함으로 허브 건물들이 블렌더 지형 위에서 공중부양한다.
    const rtActive = this.realTerrain?.active && this.realTerrain?.surfaceReady;
    if (rtActive) {
      plan.forEach((p) => { const h = this._surfZ(p.lon, p.lat); if (h != null) p.groundH = h; });
    } else {
      try {
        const cartos = plan.map((p) => Cesium.Cartographic.fromDegrees(p.lon, p.lat));
        await sampleTerrainDetailed(this.viewer.terrainProvider, cartos);
        plan.forEach((p, i) => { if (Number.isFinite(cartos[i].height)) p.groundH = cartos[i].height; });
      } catch (err) { console.warn('hub terrain sample failed — hubGroundH 사용', err); }
    }

    if (alreadyBuilt) {
      // 이미 지어진 뒤 지형 소스만 바뀐 경우(GP 토글) — 모델을 다시 로드하지 않고
      // 새로 잰 표면고로 위치만 재계산한다(그렇지 않으면 최초 빌드 당시 지형 기준에
      // 영구히 고정돼 블렌더 지형 토글 시 공중부양/침하가 고쳐지지 않는다).
      for (const p of plan) {
        const ent = e.getById(p.id);
        if (!ent) continue;
        const pos = D(p.lon, p.lat, p.groundH + p.zOff);
        ent.position = pos;
        ent.orientation = Cesium.Transforms.headingPitchRollQuaternion(
          pos, new Cesium.HeadingPitchRoll(Cesium.Math.toRadians(p.headingDeg), 0, 0));
      }
      const hubLabel = e.getById('hub-label');
      if (hubLabel) hubLabel.position = D(hub.lon, hub.lat, g + 40);
      return;
    }
    for (const p of plan) {
      const pos = D(p.lon, p.lat, p.groundH + p.zOff);
      e.add({
        id: p.id,
        position: pos,
        orientation: Cesium.Transforms.headingPitchRollQuaternion(
          pos, new Cesium.HeadingPitchRoll(Cesium.Math.toRadians(p.headingDeg), 0, 0)),
        model: {
          uri: p.uri, scale: p.scale,
          lightColor: new Cesium.Cartesian3(2.2, 2.2, 2.2), // 블룸+HDR 눌림 보정
        },
      });
    }
    e.add({
      id: 'hub-label',
      position: D(hub.lon, hub.lat, g + 40),
      label: {
        text: '후방 지휘통제허브',
        font: '600 12px "Pretendard GOV", sans-serif',
        fillColor: css('#7dd3fc'),
        showBackground: true,
        backgroundColor: css('#0b1420').withAlpha(0.82),
        backgroundPadding: new Cesium.Cartesian2(10, 6),
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
        scaleByDistance: new Cesium.NearFarScalar(1000, 1.0, 40000, 0.5),
        distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 35000),
      },
    });
    for (let k = 0; k < 3; k++) {
      e.add({
        id: `comms-pulse-${k}`,
        position: new Cesium.CallbackProperty(() => {
          const t = ((performance.now() / 2200) + k / 3) % 1;
          const lon = SITE.gp.lon + (hub.lon - SITE.gp.lon) * t;
          const lat = SITE.gp.lat + (hub.lat - SITE.gp.lat) * t;
          const h = (this.groundH + 22) + ((this.hubGroundH + 16) - (this.groundH + 22)) * t + Math.sin(t * Math.PI) * 260;
          return D(lon, lat, h);
        }, false),
        point: { pixelSize: 5, color: css('#3dd68c'), disableDepthTestDistance: Number.POSITIVE_INFINITY },
      });
    }
    e.add({
      id: 'comms-link',
      polyline: {
        positions: new Cesium.CallbackProperty(() => [
          D(SITE.gp.lon, SITE.gp.lat, this.groundH + 22),
          D(hub.lon, hub.lat, this.hubGroundH + 16),
        ], false),
        width: 1.4,
        material: new Cesium.PolylineDashMaterialProperty({ color: css('#3dd68c').withAlpha(0.45), dashLength: 20 }),
      },
    });
  }
}

