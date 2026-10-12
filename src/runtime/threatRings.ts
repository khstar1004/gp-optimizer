// @ts-nocheck
/**
 * 위협권 레이어 — VISTA/KAIROS 원본 무기체계 프로파일로 사거리·탐지호를 그린다.
 *
 * 원본: js/vendor/kairos/src/utils/threatCoverage.ts (무수정 벤더링)
 *   FACILITY_THREAT_PROFILES  실무기체계 27종 — className / range(km) / detectionArcDegrees
 *                             + sourceUrl·sourceNote (제조사·방사청 공개 페이지)
 *   getFacilityThreatProfile / getFacilityThreatRange
 *
 * 원의 반경·탐지호 각도는 전부 원본 값이다. 이 파일은 Cesium 도형으로 옮기기만 한다.
 * 배치 방위는 GP 데모 상황(적은 북측 축선, 아군은 GP 본체)으로 이쪽에서 정한다.
 */
import { FACILITY_THREAT_PROFILES } from '../../js/vendor/kairos/kairos.bundle';
import { offset, distM } from './geo';
import { SITE } from './data';

const css = (c) => Cesium.Color.fromCssColorString(c);

/** GP 스케일(≤12km)에서 의미 있는 체계만 — 원본 행을 그대로 들고 있는다 */
export const GP_SCALE_PROFILES = FACILITY_THREAT_PROFILES
  .filter((p) => p.range <= 12)
  .sort((a, b) => a.range - b.range);

/** 적/아군 구분 — 원본에는 진영 필드가 없어 체계명으로 GP 데모에서 나눈다 */
const RED_SYSTEMS = new Set(['Tor-M2', 'Pantsir-S1', 'HQ-17', 'HQ-7']);
export function sideOf(profile) {
  return RED_SYSTEMS.has(profile.className) ? 'red' : 'blue';
}

const TONE = {
  red: { fill: 'rgba(237, 93, 93, 0.10)', line: '#ed5d5d' },
  blue: { fill: 'rgba(94, 177, 239, 0.10)', line: '#5eb1ef' },
};

/** 원점 + 방위 + 사거리로 부채꼴(탐지호) 폴리곤 좌표 */
function wedgeDegrees(lon, lat, rangeM, centerAzDeg, arcDeg, steps = 48) {
  const pts = [lon, lat];
  const half = arcDeg / 2;
  for (let i = 0; i <= steps; i++) {
    const az = centerAzDeg - half + (arcDeg * i) / steps;
    const p = offset(lon, lat, az, rangeM);
    pts.push(p.lon, p.lat);
  }
  return pts;
}

export class ThreatRingLayer {
  constructor(viewer, getGroundH) {
    this.viewer = viewer;
    this.getGroundH = getGroundH ?? (() => 0);
    this.ds = new Cesium.CustomDataSource('threat-rings');
    viewer.dataSources.add(this.ds);
    this.placed = [];   // [{ profile, lon, lat, azDeg, side }]
  }

  clear() {
    this.ds.entities.removeAll();
    this.placed = [];
  }

  show(v) { this.ds.show = v; }

  /**
   * 기본 배치 시나리오 — 적 방공은 북측 접근로 상단, 아군 자산은 GP 본체.
   * 위치는 데모 구성이고, 사거리·탐지호는 원본 프로파일 값 그대로다.
   */
  applyDefaultLayout(selectedClassNames) {
    this.clear();
    const chosen = GP_SCALE_PROFILES.filter((p) => selectedClassNames.includes(p.className));
    const reds = chosen.filter((p) => sideOf(p) === 'red');
    const blues = chosen.filter((p) => sideOf(p) === 'blue');

    reds.forEach((p, i) => {
      // 북측 6~9km, 부채꼴로 벌려 배치. 탐지호는 남향(GP 방향).
      const az = 340 + i * 15;
      const at = offset(SITE.gp.lon, SITE.gp.lat, az, 6000 + i * 900);
      this.add(p, at.lon, at.lat, 180, 'red', i);
    });
    // 아군은 GP 후방 배치(탐지호 북향). 예전에는 260~860m 안에 몰아넣어서, 조감 고도에서
    // 라벨이 한 덩어리로 겹쳐 어느 체계가 어디 있는지 읽히지 않았다. 방위·거리를 더 벌리고
    // 라벨은 층으로 쌓아 올린다.
    blues.forEach((p, i) => {
      const at = offset(SITE.gp.lon, SITE.gp.lat, 120 + i * 38, 380 + i * 210);
      this.add(p, at.lon, at.lat, 0, 'blue', i);
    });
    return this.placed.length;
  }

  /**
   * @param stackIndex 같은 구역에 여러 체계가 겹칠 때 라벨을 세로로 층지게 한다 —
   *   지도에서 겹친 라벨은 없는 것과 같다.
   */
  add(profile, lon, lat, azDeg, side = null, stackIndex = 0) {
    const s = side ?? sideOf(profile);
    const tone = TONE[s];
    const rangeM = profile.range * 1000;
    const id = `threat-${profile.className.replace(/\s+/g, '-')}-${this.placed.length}`;
    const h = this.getGroundH();

    // 최대 사거리 원 (지형 클램프)
    this.ds.entities.add({
      id: `${id}-ring`,
      position: Cesium.Cartesian3.fromDegrees(lon, lat),
      ellipse: {
        semiMajorAxis: rangeM, semiMinorAxis: rangeM,
        material: css(tone.fill),
        outline: true, outlineColor: css(tone.line).withAlpha(0.75), outlineWidth: 2,
        classificationType: Cesium.ClassificationType.TERRAIN,
      },
    });
    // 탐지호 부채꼴 (원본 detectionArcDegrees)
    this.ds.entities.add({
      id: `${id}-arc`,
      polygon: {
        hierarchy: Cesium.Cartesian3.fromDegreesArray(
          wedgeDegrees(lon, lat, rangeM, azDeg, profile.detectionArcDegrees)),
        material: css(tone.line).withAlpha(0.16),
        classificationType: Cesium.ClassificationType.TERRAIN,
      },
    });
    // 체계 라벨
    this.ds.entities.add({
      id: `${id}-label`,
      position: Cesium.Cartesian3.fromDegrees(lon, lat, h + 40),
      point: { pixelSize: 9, color: css(tone.line), outlineColor: css('#0b1420'), outlineWidth: 2,
        disableDepthTestDistance: Number.POSITIVE_INFINITY },
      label: {
        text: `${profile.className}\n${profile.range}km · 탐지호 ${profile.detectionArcDegrees}°`,
        font: '600 11px "Pretendard GOV", sans-serif',
        fillColor: css(tone.line),
        showBackground: true, backgroundColor: css('#0b1420').withAlpha(0.8),
        backgroundPadding: new Cesium.Cartesian2(7, 4),
        pixelOffset: new Cesium.Cartesian2(0, -26 - (stackIndex % 5) * 30),
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
        scaleByDistance: new Cesium.NearFarScalar(3000, 1.0, 40000, 0.5),
      },
    });

    this.placed.push({ profile, lon, lat, azDeg, side: s });
    return id;
  }

  /**
   * GP 상공 드론 운용 가능 여부 — 적 위협권과의 교차 판정.
   * 원본 사거리 값만 쓰고, 판정은 단순 거리 비교다.
   */
  droneEnvelope(fromLon = SITE.gp.lon, fromLat = SITE.gp.lat, stepM = 250, maxM = 8000) {
    const reds = this.placed.filter((p) => p.side === 'red');
    if (!reds.length) return { limitedByM: maxM, threat: null, unrestricted: true, originInside: false };

    // 발진점(GP)이 이미 적 위협권 안이면 진출 한계가 아니라 상시 피탐/피격 상태다.
    const covering = reds.filter((r) => distM(r.lon, r.lat, fromLon, fromLat) <= r.profile.range * 1000);
    if (covering.length) {
      const worst = covering.sort((a, b) => b.profile.range - a.profile.range)[0];
      return {
        limitedByM: 0, threat: worst.profile, unrestricted: false, originInside: true,
        coveringCount: covering.length,
      };
    }

    let limit = maxM;
    let culprit = null;
    for (let d = stepM; d <= maxM; d += stepM) {
      const p = offset(fromLon, fromLat, 0, d);   // 북쪽 진출 축
      const hit = reds.find((r) => distM(r.lon, r.lat, p.lon, p.lat) <= r.profile.range * 1000);
      if (hit) { limit = d - stepM; culprit = hit; break; }
    }
    return {
      limitedByM: limit,
      threat: culprit ? culprit.profile : null,
      unrestricted: !culprit,
      originInside: false,
    };
  }
}

