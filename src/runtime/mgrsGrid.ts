// @ts-nocheck
/**
 * MGRS/UTM 군사 격자 오버레이 — 실무 군사지도(1:25,000/1:50,000) 격자 표현
 *
 * 참조 구현: ArcGIS Military Grid Overlay, Cesium-mgrs-graticule 계열.
 *  - 카메라 고도에 따라 격자 간격 자동 전환 (1km ↔ 10km), 너무 높으면 숨김
 *  - 100km(MGRS 100k 구역) 경계는 굵은 앰버선
 *  - 격자 라벨은 군사지도 관례대로 주기(principal digits) 2자리 강조
 *  - 지형 위 클램프 폴리라인, moveEnd마다 뷰 범위만 재생성 (라인 수 상한)
 */
import { LLtoUTM, UTMtoLL } from './mgrs';

const MAX_LINES = 64;

export class MgrsGrid {
  constructor(viewer) {
    this.viewer = viewer;
    this.enabled = false;
    this.ds = new Cesium.CustomDataSource('mgrs-grid');
    viewer.dataSources.add(this.ds);
    this.realTerrain = null; // main.ts가 생성 직후 주입 — GP 블렌더 지형 표면 참조
    this._rebuild = this._rebuild.bind(this);
    this.viewer.camera.moveEnd.addEventListener(this._rebuild);
    this.onInfo = null;   // (텍스트) => void — 현재 격자 간격 표시용
  }

  setEnabled(on) {
    this.enabled = on;
    if (!on) { this.ds.entities.removeAll(); this.onInfo?.(null); }
    else this._rebuild();
  }

  _viewRect() {
    const rect = this.viewer.camera.computeViewRectangle(this.viewer.scene.globe.ellipsoid);
    if (!rect) return null;
    return {
      west: Cesium.Math.toDegrees(rect.west), east: Cesium.Math.toDegrees(rect.east),
      south: Cesium.Math.toDegrees(rect.south), north: Cesium.Math.toDegrees(rect.north),
    };
  }

  _rebuild() {
    if (!this.enabled) return;
    const ents = this.ds.entities;
    ents.removeAll();
    const camH = this.viewer.camera.positionCartographic.height;
    // 군사지도 축척 관례: 근접 1km 방안, 광역 10km 방안
    let step = null;
    if (camH < 22000) step = 1000;
    else if (camH < 160000) step = 10000;
    // 켰는데 아무것도 안 나오면 「고장」으로 읽힌다 — 왜 안 그리는지를 배지에 적는다.
    if (!step) { this.onInfo?.('격자 — 고도 160km 아래에서 표시'); return; }

    const r = this._viewRect();
    if (!r || r.east - r.west > 3 || r.north - r.south > 3) {
      this.onInfo?.('격자 — 화면 범위 3° 아래에서 표시');
      return;
    }

    // 뷰 중심 기준 UTM 존 고정 (한반도 동부 52 — 존 경계 걸치면 중심 존으로 통일)
    const cLat = (r.south + r.north) / 2, cLon = (r.west + r.east) / 2;
    const zone = Math.floor((cLon + 180) / 6) + 1;
    const corners = [
      LLtoUTM(r.south, r.west), LLtoUTM(r.south, r.east),
      LLtoUTM(r.north, r.west), LLtoUTM(r.north, r.east),
    ];
    let eMin = Math.min(...corners.map((c) => c.easting));
    let eMax = Math.max(...corners.map((c) => c.easting));
    let nMin = Math.min(...corners.map((c) => c.northing));
    let nMax = Math.max(...corners.map((c) => c.northing));
    eMin = Math.floor(eMin / step) * step; nMin = Math.floor(nMin / step) * step;
    eMax = Math.ceil(eMax / step) * step; nMax = Math.ceil(nMax / step) * step;

    const nE = Math.round((eMax - eMin) / step) + 1;
    const nN = Math.round((nMax - nMin) / step) + 1;
    if (nE + nN > MAX_LINES) { this.onInfo?.(null); return; }

    const seg = Math.max(step / 4, 250);   // 곡률 반영 세그먼트
    const thin = Cesium.Color.WHITE.withAlpha(0.34);
    const thick = Cesium.Color.fromCssColorString('#f2a33c').withAlpha(0.85);
    // GP 정밀지형(globe.show=false)에서는 clampToGround 가 접지되지 않는다
    // (entities.ts _surfZ 주석 참고) — 점마다 GLB 표면고를 직접 박아 넣는다.
    const rt = this.realTerrain;
    const rtActive = !!(rt?.active && rt?.surfaceReady);
    let lastZ = 0;
    const cart = (lon, lat) => {
      const h = rtActive ? (rt.surfaceHeightAt(lon, lat) ?? lastZ) : 0;
      if (rtActive && Number.isFinite(h)) lastZ = h;
      return Cesium.Cartesian3.fromDegrees(lon, lat, h);
    };

    // 세로선 (easting 상수)
    for (let e = eMin; e <= eMax; e += step) {
      const pts = [];
      for (let n = nMin; n <= nMax; n += seg) {
        const ll = UTMtoLL(n, e, zone);
        pts.push(rtActive ? cart(ll.lon, ll.lat) : ll);
      }
      const major = e % 100000 === 0;
      ents.add({
        polyline: {
          positions: rtActive ? pts : Cesium.Cartesian3.fromDegreesArray(pts.flatMap((p) => [p.lon, p.lat])),
          clampToGround: !rtActive,
          width: major ? 2.2 : 1.1,
          material: major ? thick : thin,
        },
      });
    }
    // 가로선 (northing 상수)
    for (let n = nMin; n <= nMax; n += step) {
      const pts = [];
      for (let e = eMin; e <= eMax; e += seg) {
        const ll = UTMtoLL(n, e, zone);
        pts.push(rtActive ? cart(ll.lon, ll.lat) : ll);
      }
      const major = n % 100000 === 0;
      ents.add({
        polyline: {
          positions: rtActive ? pts : Cesium.Cartesian3.fromDegreesArray(pts.flatMap((p) => [p.lon, p.lat])),
          clampToGround: !rtActive,
          width: major ? 2.2 : 1.1,
          material: major ? thick : thin,
        },
      });
    }

    // 격자 라벨 — 군사지도 주기: 1km 격자는 1000단위 2자리(00~99), 교차점이 아닌 선상 표기
    const labelEvery = step;   // 모든 선에 라벨 (상한이 있어 안전)
    const latBottom = r.south + (r.north - r.south) * 0.045;
    const lonLeft = r.west + (r.east - r.west) * 0.05;
    for (let e = eMin + step; e < eMax; e += labelEvery) {
      const digits = String(Math.round(e / (step === 1000 ? 1000 : 10000)) % 100).padStart(2, '0');
      const ll = UTMtoLL(LLtoUTM(latBottom, cLon).northing, e, zone);
      const z = rtActive ? (rt.surfaceHeightAt(ll.lon, latBottom) ?? lastZ) : 0;
      ents.add({
        position: Cesium.Cartesian3.fromDegrees(ll.lon, latBottom, z),
        label: this._labelGraphics(digits, rtActive),
      });
    }
    for (let n = nMin + step; n < nMax; n += labelEvery) {
      const digits = String(Math.round(n / (step === 1000 ? 1000 : 10000)) % 100).padStart(2, '0');
      const ll = UTMtoLL(n, LLtoUTM(cLat, lonLeft).easting, zone);
      const z = rtActive ? (rt.surfaceHeightAt(lonLeft, ll.lat) ?? lastZ) : 0;
      ents.add({
        position: Cesium.Cartesian3.fromDegrees(lonLeft, ll.lat, z),
        label: this._labelGraphics(digits, rtActive),
      });
    }
    this.onInfo?.(step === 1000 ? 'GRID 1km' : 'GRID 10km');
  }

  _labelGraphics(text, rtActive = false) {
    return {
      text,
      font: '600 13px "Chakra Petch", monospace',
      fillColor: Cesium.Color.fromCssColorString('#ffd89a'),
      outlineColor: Cesium.Color.BLACK.withAlpha(0.85),
      outlineWidth: 3,
      style: Cesium.LabelStyle.FILL_AND_OUTLINE,
      heightReference: rtActive ? Cesium.HeightReference.NONE : Cesium.HeightReference.CLAMP_TO_GROUND,
      disableDepthTestDistance: Number.POSITIVE_INFINITY,
      scaleByDistance: new Cesium.NearFarScalar(3000, 1.0, 120000, 0.6),
    };
  }
}

