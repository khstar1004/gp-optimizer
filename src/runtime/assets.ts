// @ts-nocheck
/**
 * 감시·화기 자산 계층 — 가시거리/사거리의 층위를 분리해 표출
 *
 * 근거 관행:
 *  - 카메라·열상은 단일 '가시거리'가 아니라 DRI(Detection/Recognition/Identification)
 *    3거리로 표기 (FLIR·군 광학장비 스펙 규약, Johnson criteria 기반)
 *  - 화기는 유효사거리 링 (한국군 제식 화기 공개 제원 근사치)
 *  - C-UAS 재머는 반구 돔 (우크라이나전 대드론 방어 전훈)
 * 수치는 공개 자료 기반 근사·합성 — 실제 제원 아님.
 */
import { SITE } from './data';
import { offset, distM, azimuthDeg, azDelta } from './geo';
import { lookupVisible } from './viewshed';
import { SensorModelLayer, MOUNTS } from './sensorModels';
import { fmtM } from './sensorPerformance';
import { optimizeMountPlacements } from './siteOptimizer';
import { sampleTerrainDetailed } from './terrainSample';

const D = Cesium.Cartesian3.fromDegrees;
const css = (c) => Cesium.Color.fromCssColorString(c);

export const ASSET_CATALOG = [
  // ── 화기 (유효사거리 링) ──
  { id: 'rifle', group: '화기', name: 'K2 소총', icon: '▸', kind: 'ring', range: 460, color: '#ed5d5d' },
  { id: 'mg', group: '화기', name: 'K3 기관총', icon: '▸', kind: 'ring', range: 800, color: '#f2795d' },
  { id: 'hmg', group: '화기', name: 'K6 중기관총', icon: '▸', kind: 'ring', range: 1800, color: '#f2a33c' },
  { id: 'agl', group: '화기', name: 'K4 고속유탄', icon: '▸', kind: 'ring', range: 2200, color: '#e3b341' },
  // ── 광학 (DRI 3중 링: 탐지/인지/식별) ──
  { id: 'eo', group: '광학', name: 'EO 주간카메라', icon: '◉', kind: 'dri', dri: [3500, 1200, 600], color: '#5eb1ef', fov: 90 },
  { id: 'ir', group: '광학', name: 'IR 열상 (TOD)', icon: '◉', kind: 'dri', dri: [2800, 950, 480], color: '#f28dbb', fov: 60 },
  // ── 센서 (웨지/원) ──
  { id: 'radar', group: '센서', name: '지상감시레이더', icon: '◬', kind: 'wedge', range: 5000, fov: 120, color: '#b18cff' },
  { id: 'acoustic', group: '센서', name: '음향탐지 어레이', icon: '◬', kind: 'ring', range: 900, color: '#ffd54f' },
  // ── 대드론 (반구 돔) ──
  { id: 'cuas', group: 'C-UAS', name: '대드론 재머 돔', icon: '⌓', kind: 'dome', range: 800, color: '#63dfff' },
  // ── 조명 (야간 조명 지원 반경) ──
  { id: 'flare', group: '화기', name: '조명탄 발사대 (81mm 조명)', icon: '✸', kind: 'ring', range: 2000, color: '#ffe08a' },
];

export const WEAPON_IDS = ['rifle', 'mg', 'hmg', 'agl'];

/** 방위각(deg) → 밀(6400분법, 한국군 표준) */
export function degToMils(deg) {
  return Math.round(((deg % 360 + 360) % 360) * 6400 / 360) % 6400;
}

export class AssetLayer {
  constructor(viewer, ents) {
    this.viewer = viewer;
    this.ents = ents;               // groundH, towerHeight
    this.ds = new Cesium.CustomDataSource('assets');
    viewer.dataSources.add(this.ds);
    this.active = new Set();
    this.mounts = new SensorModelLayer(viewer);  // 실물 거치 3D (토글 연동)
  }

  isOn(id) { return this.active.has(id); }

  toggle(id, on) {
    if (on) this.active.add(id);
    else this.active.delete(id);
    this.redraw();
  }

  clearAll() { this.active.clear(); this.redraw(); }

  /**
   * 센서·화기 합동 배치 최적화 (v2) — 위치 × 지향각 동시 탐색, 한계기여 greedy.
   * 전 마운트를 최적화해 이후 토글도 최적 위치·지향을 쓴다.
   * @returns { placements, report } (siteOptimizer.optimizeMountPlacements 참조)
   */
  async optimizeMounts(grid) {
    const keys = ['eo', 'ir', 'radar', 'acoustic', 'cuas', 'flare', 'weapon'];
    const sampler = async (positions) => {
      // GP 정밀지형 표출 중이면 그 GLB 표면을 우선한다 — 라이브 지형만 보면 최적화가
      // 실제로 렌더되는 표면과 다른 표고 기준으로 LOS·거치고를 계산하게 된다.
      const rt = this.ents?.realTerrain;
      if (rt?.active && rt?.surfaceReady) {
        const heights = positions.map((p) => rt.surfaceHeightAt(p.lon, p.lat));
        if (heights.every((h) => Number.isFinite(h))) return heights;
      }
      const cartos = positions.map((p) => Cesium.Cartographic.fromDegrees(p.lon, p.lat));
      try {
        await sampleTerrainDetailed(this.viewer.terrainProvider, cartos);
      } catch (e) { console.warn('optimizer terrain sample failed', e); }
      return cartos.map((c) => c.height);
    };
    const { placements, report } = await optimizeMountPlacements(grid, keys, sampler, MOUNTS);
    await this.mounts.applyPlacements(placements);
    this.lastOptimization = { placements, report };
    return { placements, report };
  }

  _ring(idPrefix, radius, color, label, dashed = true, width = 2) {
    const { gp } = SITE;
    // GP 정밀지형(globe.show=false)에서는 clampToGround/HeightReference.CLAMP_TO_GROUND
    // 가 접지되지 않는다(entities.ts _surfZ 주석 참고) — 점마다 GLB 표면고를 직접 박는다.
    const gpZ = this.ents?._surfZ?.(gp.lon, gp.lat) ?? null;
    const abs = gpZ != null;
    const pts = [];
    for (let a = 0; a <= 360; a += 4) {
      const p = offset(gp.lon, gp.lat, a, radius);
      if (abs) pts.push(D(p.lon, p.lat, this.ents._surfZ(p.lon, p.lat) ?? gpZ));
      else pts.push(p.lon, p.lat);
    }
    this.ds.entities.add({
      id: `${idPrefix}-ring-${radius}`,
      polyline: {
        positions: abs ? pts : Cesium.Cartesian3.fromDegreesArray(pts),
        width, clampToGround: !abs,
        material: dashed
          ? new Cesium.PolylineDashMaterialProperty({ color: css(color).withAlpha(0.8), dashLength: 12 })
          : css(color).withAlpha(0.7),
      },
    });
    const lp = offset(gp.lon, gp.lat, 45, radius);
    this.ds.entities.add({
      id: `${idPrefix}-lbl-${radius}`,
      position: abs ? D(lp.lon, lp.lat, this.ents._surfZ(lp.lon, lp.lat) ?? gpZ) : D(lp.lon, lp.lat, this.ents.groundH),
      label: {
        text: label, font: '600 10px "Chakra Petch", sans-serif',
        fillColor: css(color), showBackground: true,
        backgroundColor: css('#0b1420').withAlpha(0.78),
        backgroundPadding: new Cesium.Cartesian2(6, 3),
        heightReference: abs ? Cesium.HeightReference.NONE : Cesium.HeightReference.CLAMP_TO_GROUND,
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
        scaleByDistance: new Cesium.NearFarScalar(2000, 1, 25000, 0.45),
        distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 16000),
      },
    });
  }

  redraw() {
    this.ds.entities.removeAll();
    this.mounts.sync(this.active, WEAPON_IDS);
    const { gp, sector } = SITE;
    for (const a of ASSET_CATALOG) {
      if (!this.active.has(a.id)) continue;
      if (a.kind === 'ring') {
        this._ring(a.id, a.range, a.color, `${a.name} ${fmtM(a.range)}`);
      } else if (a.kind === 'dri') {
        const names = ['탐지 D', '인지 R', '식별 I'];
        a.dri.forEach((r, i) => {
          this._ring(`${a.id}-${i}`, r, a.color, `${a.name.split(' ')[0]} ${names[i]} ${(r / 1000).toFixed(1)}km`, true, i === 0 ? 2.4 : 1.4);
        });
      } else if (a.kind === 'wedge') {
        const half = a.fov / 2;
        const gpZ = this.ents?._surfZ?.(gp.lon, gp.lat) ?? null;
        const abs = gpZ != null;
        const cart = (lon, lat) => (abs ? D(lon, lat, this.ents._surfZ(lon, lat) ?? gpZ) : [lon, lat]);
        const pts = [cart(gp.lon, gp.lat)];
        for (let az = sector.centerAz - half; az <= sector.centerAz + half; az += 4) {
          const p = offset(gp.lon, gp.lat, az, a.range);
          pts.push(cart(p.lon, p.lat));
        }
        pts.push(cart(gp.lon, gp.lat));
        this.ds.entities.add({
          id: `${a.id}-wedge`,
          polyline: {
            positions: abs ? pts : Cesium.Cartesian3.fromDegreesArray(pts.flat()),
            width: 2, clampToGround: !abs,
            material: css(a.color).withAlpha(0.65),
          },
        });
        const lp = offset(gp.lon, gp.lat, sector.centerAz, a.range * 0.96);
        this.ds.entities.add({
          id: `${a.id}-wlbl`,
          position: abs ? D(lp.lon, lp.lat, this.ents._surfZ(lp.lon, lp.lat) ?? gpZ) : D(lp.lon, lp.lat, this.ents.groundH),
          label: {
            text: `${a.name} ${(a.range / 1000).toFixed(0)}km/${a.fov}°`,
            font: '600 10px "Chakra Petch", sans-serif',
            fillColor: css(a.color), showBackground: true,
            backgroundColor: css('#0b1420').withAlpha(0.78),
            heightReference: abs ? Cesium.HeightReference.NONE : Cesium.HeightReference.CLAMP_TO_GROUND,
            disableDepthTestDistance: Number.POSITIVE_INFINITY,
            scaleByDistance: new Cesium.NearFarScalar(2000, 1, 25000, 0.45),
          },
        });
      } else if (a.kind === 'dome') {
        // C-UAS 반구 돔
        const g = this.ents.groundH;
        this.ds.entities.add({
          id: `${a.id}-dome`,
          position: D(gp.lon, gp.lat, g),
          ellipsoid: {
            radii: new Cesium.Cartesian3(a.range, a.range, a.range),
            maximumCone: Cesium.Math.PI_OVER_TWO,
            material: css(a.color).withAlpha(0.08),
            outline: true,
            outlineColor: css(a.color).withAlpha(0.45),
            slicePartitions: 24, stackPartitions: 12,
          },
        });
        this.ds.entities.add({
          id: `${a.id}-dlbl`,
          position: D(gp.lon, gp.lat, g + a.range + 60),
          label: {
            text: `${a.name} R${a.range}m`, font: '600 11px "Chakra Petch", sans-serif',
            fillColor: css(a.color), showBackground: true,
            backgroundColor: css('#0b1420').withAlpha(0.78),
            disableDepthTestDistance: Number.POSITIVE_INFINITY,
            scaleByDistance: new Cesium.NearFarScalar(2000, 1, 30000, 0.5),
          },
        });
      }
    }
  }

  /**
   * 자산별 실효 커버리지: 사거리·FOV ∩ 지형 가시영역 (책임구역 면적가중)
   */
  coverage(asset, grid) {
    if (!grid) return null;
    const { sector, gp } = SITE;
    const range = asset.kind === 'dri' ? asset.dri[0] : asset.range;
    const fovHalf = asset.fov ? asset.fov / 2 : 180;
    let wTot = 0, wCov = 0;
    const { nAz, nR, minR, rStep, azStart, azEnd } = grid;
    const span = azEnd - azStart;
    for (let ai = 0; ai < nAz; ai += 2) {
      const az = azStart + (span * ai) / (nAz - 1);
      if (Math.abs(azDelta(az, sector.centerAz)) > sector.halfAngle) continue;
      for (let ri = 0; ri < nR; ri += 2) {
        const d = minR + rStep * ri;
        if (d < sector.minR || d > sector.maxR) continue;
        wTot += d;
        if (d > range) continue;
        if (Math.abs(azDelta(az, sector.centerAz)) > fovHalf) continue;
        if (grid.vis[ai * nR + ri]) wCov += d;
      }
    }
    return wTot ? wCov / wTot : 0;
  }
}

/**
 * 교전 제원 계산 (관측소 → 표적): 한국군 사격지휘 관행 형식
 */
export function fireMission(obs, obsH, target, targetH) {
  const dist = distM(obs.lon, obs.lat, target.lon, target.lat);
  const azDeg = azimuthDeg(obs.lon, obs.lat, target.lon, target.lat);
  const dH = (targetH ?? 0) - obsH;
  const elevMils = degToMils(Math.atan2(dH, dist) * 180 / Math.PI + 360) % 6400;
  const weapons = ASSET_CATALOG.filter((a) => WEAPON_IDS.includes(a.id) && a.range >= dist);
  return {
    distM: dist,
    azDeg,
    azMils: degToMils(azDeg),
    dH,
    elevMils: elevMils > 3200 ? elevMils - 6400 : elevMils,
    weapons,
  };
}

