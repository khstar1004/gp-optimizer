// @ts-nocheck
/**
 * IPB — 적 이동경로 분석 + NAI/DP/TAI
 *
 * 원본을 그대로 호출하는 부분 (js/vendor/kairos/tacticalDecision.ts —
 * D:\VISTA_sudo 에서 함수 단위 추출, 타입 표기만 제거):
 *  - sudoDecisionEngine.scoreRouteOption   경로 점수 합성 (0.34/0.26/0.18/0.22)
 *  - SudoJangdoTacticalMap.destinationPoint / buildCirclePolygon(96각) / clipLineCoordinates
 *
 * 이 파일에 남은 GP 고유 로직:
 *  - coverage·gap·fireLink 를 타워 가시격자에서 산출 (원본은 수도권 시나리오 표에서 받음)
 *  - roadScore 는 국가교통정보센터(ITS) 실시간 소통정보를 쓴다 (js/roads.js). 원본
 *    assessRouteRoad 는 수도권 9-1 도로정보표 매칭이라 GP에 해당 표가 없어, 같은 자리에
 *    실측 도로 점수를 넣는다. ITS 조회 전이면 축선 경사 프로파일로 대체된다.
 *  - NAI 24% / DP 56% / TAI 82% 배치 규칙과 교전 링 반경(TAI 480m·DP 360m)은
 *    SudoScenarioVisual.tsx 의 규칙을 옮겨 적은 것 (원본은 React 컴포넌트에 박혀 있어
 *    함수 단위 추출이 불가)
 */
import { SITE, MOVE_MODES } from './data';
import { distM } from './geo';
import { lookupVisible } from './viewshed';
import {
  scoreRouteOption as kairosScoreRouteOption,
  buildCirclePolygon as kairosCirclePolygon,
  destinationPoint,
} from '../../js/vendor/kairos/tacticalDecision';
import { roadAssessment } from './roads';
import { allRouteData, routeFeasible } from './infiltration';
import { hostileSymbol, controlSymbol } from './milsym';

const D3 = Cesium.Cartesian3.fromDegrees;
const css = (c) => Cesium.Color.fromCssColorString(c);

// KAIROS SudoJangdoTacticalMap 톤 팔레트
const TONE = { blue: '#64dfff', green: '#67f29b', amber: '#ffc857', red: '#ff6969', highlight: '#f2ff2c' };
const KIND_STYLE = {
  NAI: { color: TONE.blue, shape: '⬠', ring: 300, sub: '감시집중구역' },   // 감시 = pentagon
  DP: { color: TONE.amber, shape: '★', ring: 360, sub: '결심지점' },       // 결심 = star (KAIROS DP 360m)
  TAI: { color: TONE.red, shape: '■', ring: 480, sub: '표적지역' },        // 타격 = square (KAIROS TAI 480m)
};

// destinationPoint / buildCirclePolygon 은 벤더링한 KAIROS 원본을 쓴다.
// (js/vendor/kairos/tacticalDecision.ts ← SudoJangdoTacticalMap.tsx)
// 원본 buildCirclePolygon 은 GeoJSON Feature 를 돌려주므로 링 좌표만 꺼내 쓴다.
function circleRing(center, radiusMeters, steps = 96) {
  return kairosCirclePolygon(center, radiusMeters, steps).geometry.coordinates[0];
}

// ═══ KAIROS clipLineCoordinates + easeOutCubic 원본 (드로우온 애니메이션) ═══
function distanceBetweenCoordinates(a, b) { return distM(a[0], a[1], b[0], b[1]); }
function interpolateCoordinate(a, b, t) { return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]; }
function easeOutCubic(progress) { return 1 - (1 - progress) ** 3; }

function clipLineCoordinates(coordinates, progress) {
  if (coordinates.length <= 1) return coordinates;
  const clampedProgress = Math.max(0, Math.min(1, progress));
  if (clampedProgress >= 1) return coordinates;
  const totalLength = coordinates.reduce((total, coordinate, index) => {
    const previous = coordinates[index - 1];
    return previous ? total + distanceBetweenCoordinates(previous, coordinate) : 0;
  }, 0);
  if (totalLength <= 0) return [coordinates[0], coordinates[0]];
  const targetLength = totalLength * clampedProgress;
  const clipped = [coordinates[0]];
  let traversedLength = 0;
  for (let index = 1; index < coordinates.length; index += 1) {
    const previous = coordinates[index - 1];
    const current = coordinates[index];
    const segmentLength = distanceBetweenCoordinates(previous, current);
    if (traversedLength + segmentLength >= targetLength) {
      const segmentRatio = segmentLength <= 0 ? 0 : (targetLength - traversedLength) / segmentLength;
      clipped.push(interpolateCoordinate(previous, current, segmentRatio));
      return clipped.length === 1 ? [coordinates[0], coordinates[0]] : clipped;
    }
    clipped.push(current);
    traversedLength += segmentLength;
  }
  return clipped;
}

/** 경로 arc-length 비율 지점 (KAIROS 24/56/82% 규칙용) */
function pointAtRatio(pts, ratio) {
  const total = pts[pts.length - 1].cumM;
  const target = total * ratio;
  for (let i = 1; i < pts.length; i++) {
    if (pts[i].cumM >= target) return pts[i];
  }
  return pts[pts.length - 1];
}

let uidSeq = 0;

export class IPB {
  constructor(viewer, getGroundH) {
    this.viewer = viewer;
    this.getGroundH = getGroundH;
    this.ds = new Cesium.CustomDataSource('ipb');
    viewer.dataSources.add(this.ds);
    this.items = [];
    this.placingKind = null;
    this.counters = { NAI: 0, DP: 0, TAI: 0 };
    this.routeScores = [];
  }

  /** terrainIntel.ts classifyTerrain 이식 (경로 경사 프로파일 기반) */
  mobilityClass(rd) {
    const meanSlope = rd.slopes.reduce((a, b) => a + b, 0) / Math.max(1, rd.slopes.length);
    const steepRatio = rd.slopes.filter((s) => s >= 15).length / Math.max(1, rd.slopes.length);
    let label;
    if (steepRatio >= 0.38 || meanSlope >= 18) label = '험준 산지';
    else if (steepRatio >= 0.22 || meanSlope >= 10) label = '구릉-산지 혼합';
    else label = '완경사 지형';
    // 경사 프로파일 바 (구간별: 완경사 초록 / 구릉 앰버 / 급경사 적색)
    const n = Math.min(40, rd.slopes.length);
    const step = Math.floor(rd.slopes.length / n) || 1;
    let segsHtml = '';
    for (let i = 0; i < rd.slopes.length; i += step) {
      const s = rd.slopes[i];
      const c = s >= 17 ? '#ed5d5d' : s >= 10 ? '#e3b341' : '#3dd68c';
      segsHtml += `<div class="mob-seg" style="flex:1;background:${c}"></div>`;
    }
    return { label, meanSlope, steepRatio, segsHtml };
  }

  /**
   * KAIROS sudoDecisionEngine.scoreRouteOption 이식 —
   * coverage·gap·fireLink는 타워 가시격자에서, roadScore는 ITS 실도로(없으면 경사)에서 산출
   */
  scoreRoutes(grid, mode) {
    const m = MOVE_MODES[mode];
    return allRouteData().map((rd) => {
      const vis = rd.pts.map((p) => (lookupVisible(grid, p.lon, p.lat) ? 1 : 0));
      const coverage = (vis.reduce((a, b) => a + b, 0) / vis.length) * 100;
      // 감시 공백: 종말 25% 구간(목표 근접부)의 비가시율 — KAIROS "경로 종말부가 취약" 휴리스틱
      const tail = vis.slice(Math.floor(vis.length * 0.75));
      const gap = (1 - tail.reduce((a, b) => a + b, 0) / Math.max(1, tail.length)) * 100;
      // 화력연계: 가시 && 2.5km 이내 (교전 가능 구간 비율)
      const fireLink = (rd.pts.filter((p, i) =>
        vis[i] && distM(SITE.gp.lon, SITE.gp.lat, p.lon, p.lat) <= 2500).length / rd.pts.length) * 100;
      // 기동로 점수: 한계경사 여유 (KAIROS assessRoadInfo의 차선·교량 대신 경사 사용)
      const roadScore = Math.max(0, Math.min(100, 100 - (rd.slopeP95 / m.maxSlopeDeg) * 60
        - (routeFeasible(rd, mode) ? 0 : 40)));
      // 기동로 점수: ITS 실시간 소통정보가 있으면 실측 roadScore, 없으면 위 경사 대체값.
      const ra = roadAssessment(roadScore);
      // 점수 합성은 KAIROS 원본 scoreRouteOption 을 그대로 호출한다 (가중치 0.34/0.26/0.18/0.22).
      const score = kairosScoreRouteOption(
        { coverage, gap, fireLinkScore: fireLink }, ra);
      return {
        rd, coverage, gap, fireLink,
        roadScore: ra.roadScore, roadAssessment: ra,
        score, feasible: routeFeasible(rd, mode),
      };
    }).sort((l, r) => r.score !== l.score ? r.score - l.score : r.roadScore - l.roadScore);
  }

  /**
   * 자동 도출: 최우선 위협축선에 NAI 24% / DP 56% / TAI 82% (KAIROS 규칙),
   * 종말 3정점 = 감시 취약구간, 대안축은 후보선으로 전시
   */
  autoSuggest(grid, mode) {
    this.clear();
    const ranked = this.scoreRoutes(grid, mode).filter((r) => r.feasible);
    this.routeScores = ranked;
    if (!ranked.length) return 0;
    const best = ranked[0];
    const pts = best.rd.pts;
    const m = MOVE_MODES[mode];

    // KAIROS 규칙: NAI 24% / DP 56% / TAI 82%
    const naiP = pointAtRatio(pts, 0.24);
    const dpP = pointAtRatio(pts, 0.56);
    const taiP = pointAtRatio(pts, 0.82);
    // DP→TAI 도달시간 = 거리/속도 (KAIROS 기동 모델)
    const dpToTaiMin = (taiP.cumM - dpP.cumM) / m.speed / 60;

    this.addManual('NAI', naiP.lon, naiP.lat, {
      h: naiP.h,
      note: `${best.rd.route.name.split(' — ')[0]} 진입 감시 · 커버 ${best.coverage.toFixed(0)}%`,
    });
    this.addManual('DP', dpP.lon, dpP.lat, {
      h: dpP.h,
      note: `타격 결심 · TAI 도달 ${dpToTaiMin.toFixed(0)}분 전 (${m.name.split(' ')[0]})`,
    });
    this.addManual('TAI', taiP.lon, taiP.lat, {
      h: taiP.h,
      note: `화집점 · GP ${(distM(SITE.gp.lon, SITE.gp.lat, taiP.lon, taiP.lat) / 1000).toFixed(1)}km · H+${Math.round(taiP.cumM / m.speed / 60)}분`,
    });

    // 적 기동축 (KAIROS enemy-route: NAI→DP→TAI 적색 점선) — 드로우온 애니메이션
    this._addAnimatedLine('enemy-axis',
      pts.filter((_, i) => i % 4 === 0).map((p) => [p.lon, p.lat, p.h]),
      TONE.red, `적 기동축 — ${best.rd.route.name} (점수 ${best.score})`, true);

    // 적 침투부대 부호 (MIL-STD 적성 마름모 + 병과·제대) — 축선 출발점
    const origin = pts[0];
    this.ds.entities.add({
      id: 'ipb-enemy-unit',
      position: D3(origin.lon, origin.lat, (origin.h ?? this.getGroundH()) + 16),
      billboard: {
        image: hostileSymbol(mode === 'vehicle' ? 'motorized' : 'infantry',
          mode === 'run' ? 'team' : 'squad'),
        scale: 0.5,
        verticalOrigin: Cesium.VerticalOrigin.CENTER,
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
        scaleByDistance: new Cesium.NearFarScalar(2000, 1, 40000, 0.6),
      },
      label: {
        text: `적 침투조 · ${m.name.split(' ')[0]}`,
        font: '500 11px "Pretendard GOV", sans-serif',
        fillColor: css(TONE.red),
        showBackground: true,
        backgroundColor: css('#04161d').withAlpha(0.82),
        backgroundPadding: new Cesium.Cartesian2(7, 4),
        pixelOffset: new Cesium.Cartesian2(0, 30),
        verticalOrigin: Cesium.VerticalOrigin.TOP,
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
        scaleByDistance: new Cesium.NearFarScalar(2000, 1, 30000, 0.55),
      },
    });

    // 감시 취약구간 = 경로 종말 3정점 (KAIROS route-watch-gap 원본 규칙)
    const wps = best.rd.route.waypoints;
    const gapCoords = wps.slice(-3).map(([lon, lat]) => {
      const near = pts.reduce((a, b) => (distM(b.lon, b.lat, lon, lat) < distM(a.lon, a.lat, lon, lat) ? b : a));
      return [lon, lat, near.h];
    });
    this._addAnimatedLine('watch-gap', gapCoords, TONE.amber, `감시 취약구간 (공백 ${best.gap.toFixed(0)}%)`, true, 5);

    // 대안축 후보선 (KAIROS routeCandidateLines: 파랑)
    ranked.slice(1).forEach((r, i) => {
      this._addAnimatedLine(`alt-${i}`,
        r.rd.pts.filter((_, j) => j % 8 === 0).map((p) => [p.lon, p.lat, p.h]),
        TONE.blue, `대안축 ${r.rd.route.name.split(' — ')[0]} (점수 ${r.score})`, false, 2);
    });

    return this.items.length;
  }

  /** KAIROS 드로우온: clipLineCoordinates + easeOutCubic, 1150ms */
  _addAnimatedLine(id, coords3, color, label, dashed, width = 3.5) {
    const startedAt = performance.now();
    const durationMs = 1150;
    const coords2 = coords3.map((c) => [c[0], c[1]]);
    const hByKey = new Map(coords3.map((c) => [`${c[0]}:${c[1]}`, c[2]]));
    const mat = dashed
      ? new Cesium.PolylineDashMaterialProperty({ color: css(color).withAlpha(0.9), dashLength: 14 })
      : css(color).withAlpha(0.65);
    this.ds.entities.add({
      id: `ipb-line-${id}`,
      polyline: {
        positions: new Cesium.CallbackProperty(() => {
          const progress = easeOutCubic(Math.min(1, (performance.now() - startedAt) / durationMs));
          const clipped = clipLineCoordinates(coords2, progress);
          return clipped.map(([lon, lat]) => {
            const h = hByKey.get(`${lon}:${lat}`);
            return D3(lon, lat, (h ?? this.getGroundH()) + 4);
          });
        }, false),
        width,
        material: mat,
      },
    });
    // 라벨 (중점)
    const mid = coords3[Math.floor(coords3.length / 2)];
    this.ds.entities.add({
      id: `ipb-linelbl-${id}`,
      position: D3(mid[0], mid[1], (mid[2] ?? this.getGroundH()) + 40),
      label: {
        text: label, font: '500 11px "Pretendard GOV", sans-serif',
        fillColor: css(color), showBackground: true,
        backgroundColor: css('#04161d').withAlpha(0.8),
        backgroundPadding: new Cesium.Cartesian2(7, 4),
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
        scaleByDistance: new Cesium.NearFarScalar(3000, 1, 30000, 0.5),
        distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 20000),
      },
    });
  }

  /** 수동/자동 공용 배치 — KAIROS 마커 스타일 (점+도식 라벨+교전 링) */
  addManual(kind, lon, lat, opts = {}) {
    const st = KIND_STYLE[kind];
    if (!st) return null;
    const n = ++this.counters[kind];
    const uid = `ipb${++uidSeq}`;
    const h = opts.h ?? this.getGroundH();
    const item = { uid, kind, n, lon, lat, h, note: opts.note ?? st.sub };
    this.items.push(item);
    const e = this.ds.entities;

    // 교전 링 (KAIROS buildCirclePolygon: TAI 480 / DP 360 / NAI 300)
    const ringCoords = circleRing([lon, lat], st.ring);
    e.add({
      id: `${uid}-ring`,
      polyline: {
        positions: ringCoords.map(([x, y]) => D3(x, y)),
        width: 2, clampToGround: true,
        material: new Cesium.PolylineDashMaterialProperty({ color: css(st.color).withAlpha(0.75), dashLength: 12 }),
      },
    });
    // MIL-STD-2525 통제도식 부호 (NAI/TAI 구역 박스 · DP 마름모) + 비고 라벨
    e.add({
      id: `${uid}-pt`,
      position: D3(lon, lat, h + 12),
      billboard: {
        image: controlSymbol(kind, n),
        scale: 0.5,
        verticalOrigin: Cesium.VerticalOrigin.CENTER,
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
        scaleByDistance: new Cesium.NearFarScalar(2000, 1, 30000, 0.55),
      },
      label: {
        text: item.note,
        font: '500 11px "Pretendard GOV", sans-serif',
        fillColor: css(st.color),
        showBackground: true,
        backgroundColor: css('#04161d').withAlpha(0.82),
        backgroundPadding: new Cesium.Cartesian2(8, 5),
        pixelOffset: new Cesium.Cartesian2(0, 24),
        verticalOrigin: Cesium.VerticalOrigin.TOP,
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
        scaleByDistance: new Cesium.NearFarScalar(2000, 1, 30000, 0.55),
        distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 16000),
      },
    });
    return item;
  }

  remove(uid) {
    const idx = this.items.findIndex((i) => i.uid === uid);
    if (idx < 0) return;
    [`${uid}-ring`, `${uid}-pt`].forEach((id) => {
      const x = this.ds.entities.getById(id);
      if (x) this.ds.entities.remove(x);
    });
    this.items.splice(idx, 1);
  }

  clear() {
    this.ds.entities.removeAll();
    this.items = [];
    this.counters = { NAI: 0, DP: 0, TAI: 0 };
    this.routeScores = [];
  }
}

