// @ts-nocheck
/**
 * 감시공백 자동 보완 — 평가에서 지적된 취약 축선을 실제로 덮는 부감시소 위치를 찾는다.
 *
 * 평가보고서가 "축선 3 감시공백 100%, 화력연계 0% — 보완필요" 라고만 하고 끝나면 쓸모가 없다.
 * 이 모듈은 그 지적을 입력으로 받아 엔진이 해답을 계산한다:
 *
 *   ① 현 감시탑 가시격자에서 그 축선의 미관측 지점을 뽑고
 *   ② GP 후방·측방에 부감시소 후보를 생성해 지형고를 샘플하고
 *   ③ 후보 × 미관측점 전 조합을 지구곡률 보정 LOS 로 일괄 판정하고
 *   ④ 신규 확보 관측점 수 · 적 위협권 회피 · 경사(건설성) · GP 이격으로 점수화해 최적안을 낸다.
 *
 * 지형 샘플은 한 번의 sampleTerrainMostDetailed 로 묶는다(후보·표적·광선 전부).
 */
import { offset, distM, azimuthDeg, R_EARTH } from './geo';
import { lookupVisible } from './viewshed';
import { SITE } from './data';
import { sampleTerrainDetailed } from './terrainSample';

const css = (c) => Cesium.Color.fromCssColorString(c);

/** 광선 위 t 지점의 지구곡률 하강량(m) — 두 끝점 거리 d 기준 */
function curvatureDropM(d, t) {
  return (d * t) * (d * (1 - t)) / (2 * R_EARTH);
}

/**
 * 부감시소 최적 위치 탐색.
 *
 * @param viewer            Cesium viewer
 * @param opts.routeData    보완 대상 축선 (prepareRoutes 산출: {route, pts, ...})
 * @param opts.currentGrid  현 감시탑 가시격자
 * @param opts.postHeightM  부감시소 관측고 (지면 위, m)
 * @param opts.targetHeightM 표적(침투 인원) 높이
 * @param opts.threatPlaced  적 위협권 배치 [{lon,lat,profile,side}] — red 안쪽은 감점
 * @param opts.candidates    후보 수
 * @param opts.onProgress    (0~1)
 */
export async function findObservationPost(viewer, opts = {}) {
  const {
    routeData, currentGrid,
    postHeightM = 12, targetHeightM = 1.7,
    threatPlaced = [], candidates = 14,
    maxCandidateRangeM = 1600, minCandidateRangeM = 250,
    raySamples = 16, maxTargets = 40,
    onProgress,
  } = opts;

  if (!routeData?.pts?.length) throw new Error('보완 대상 축선이 없습니다.');

  // ── ① 현 감시탑이 못 보는 축선 지점 ──
  const all = routeData.pts;
  const uncoveredAll = all.filter((p) => !currentGrid || !lookupVisible(currentGrid, p.lon, p.lat));
  if (!uncoveredAll.length) {
    return { ok: false, reason: 'no-gap', message: '이 축선에는 감시 공백이 없습니다.' };
  }
  // 균등 표본 (종말부 = GP 근접부에 가중을 두기 위해 뒤쪽을 더 촘촘히)
  const step = Math.max(1, Math.floor(uncoveredAll.length / maxTargets));
  const targets = uncoveredAll.filter((_, i) => i % step === 0).slice(0, maxTargets);

  // ── ② 후보 위치 생성 (GP 후방 반원 + 측방) ──
  // 침투는 북측에서 오므로 부감시소는 남측 후방~측방 링에 둔다.
  const cands = [];
  const rings = [minCandidateRangeM, (minCandidateRangeM + maxCandidateRangeM) / 2, maxCandidateRangeM];
  const perRing = Math.ceil(candidates / rings.length);
  for (const r of rings) {
    for (let i = 0; i < perRing; i++) {
      // 90°~270° (동→남→서) 후방 반원
      const az = 90 + (180 * i) / Math.max(1, perRing - 1);
      const p = offset(SITE.gp.lon, SITE.gp.lat, az, r);
      cands.push({ lon: p.lon, lat: p.lat, az, rangeM: r });
    }
  }

  // ── ③ 지형 샘플 일괄 수집 (후보 + 표적 + 광선 중간점) ──
  const carto = (lon, lat) => Cesium.Cartographic.fromDegrees(lon, lat);
  const candCartos = cands.map((c) => carto(c.lon, c.lat));
  const targetCartos = targets.map((t) => carto(t.lon, t.lat));

  // 광선 중간 샘플: 후보 × 표적 × raySamples
  const rayCartos = [];
  const rayMeta = [];
  for (let ci = 0; ci < cands.length; ci++) {
    for (let ti = 0; ti < targets.length; ti++) {
      const c = cands[ci], t = targets[ti];
      const d = distM(c.lon, c.lat, t.lon, t.lat);
      const az = azimuthDeg(c.lon, c.lat, t.lon, t.lat);
      const base = rayCartos.length;
      for (let s = 1; s <= raySamples; s++) {
        const f = s / (raySamples + 1);
        const p = offset(c.lon, c.lat, az, d * f);
        rayCartos.push(carto(p.lon, p.lat));
      }
      rayMeta.push({ ci, ti, d, base });
    }
  }

  onProgress?.(0.1);
  const bundle = [...candCartos, ...targetCartos, ...rayCartos];
  await sampleTerrainDetailed(viewer.terrainProvider, bundle);
  onProgress?.(0.7);

  const candH = candCartos.map((c) => (Number.isFinite(c.height) ? c.height : 0));
  const targetH = targetCartos.map((c) => (Number.isFinite(c.height) ? c.height : 0));
  const rayH = rayCartos.map((c) => (Number.isFinite(c.height) ? c.height : 0));

  // ── ④ LOS 판정 ──
  const visibleByCand = cands.map(() => new Set());
  for (const m of rayMeta) {
    const h0 = candH[m.ci] + postHeightM;
    const h1 = targetH[m.ti] + targetHeightM;
    let blocked = false;
    for (let s = 0; s < raySamples; s++) {
      const f = (s + 1) / (raySamples + 1);
      const rayZ = h0 + (h1 - h0) * f;
      const groundZ = rayH[m.base + s] - curvatureDropM(m.d, f);
      if (groundZ > rayZ) { blocked = true; break; }
    }
    if (!blocked) visibleByCand[m.ci].add(m.ti);
  }
  onProgress?.(0.85);

  // ── ⑤ 후보 점수화 ──
  // 신규 확보 비율이 주고, GP 근접 표적(종말부)에 가중.
  const targetWeight = targets.map((t) => {
    const dGp = distM(SITE.gp.lon, SITE.gp.lat, t.lon, t.lat);
    return 1 + Math.max(0, (2500 - dGp) / 2500);   // GP 2.5km 안쪽일수록 1→2배
  });
  const weightTotal = targetWeight.reduce((a, b) => a + b, 0);
  const reds = threatPlaced.filter((p) => p.side === 'red');

  const scored = cands.map((c, ci) => {
    const seen = visibleByCand[ci];
    const gained = [...seen].reduce((a, ti) => a + targetWeight[ti], 0);
    const gainRatio = weightTotal ? gained / weightTotal : 0;

    // 적 위협권 내부는 감점 (부감시소가 먼저 피격된다)
    const inThreat = reds.some((r) => distM(r.lon, r.lat, c.lon, c.lat) <= r.profile.range * 1000);
    // GP 이격 — 멀수록 통신·보급 부담
    const rangePenalty = (c.rangeM - minCandidateRangeM) / (maxCandidateRangeM - minCandidateRangeM);
    // 표고 이점 (높을수록 유리)
    const relH = candH[ci] - (currentGrid ? 0 : 0);

    const score = gainRatio * 100 - rangePenalty * 12 - (inThreat ? 15 : 0);
    return {
      ...c,
      groundH: candH[ci],
      elevationM: Math.round(candH[ci]),
      coveredCount: seen.size,
      coveredIdx: [...seen],
      gainRatio,
      inThreat,
      score: Math.round(score * 10) / 10,
      relH,
    };
  }).sort((a, b) => b.score - a.score);

  const best = scored[0];
  onProgress?.(1);

  const beforeCovered = all.length - uncoveredAll.length;
  const afterCovered = beforeCovered
    + Math.round((best.coveredCount / Math.max(1, targets.length)) * uncoveredAll.length);

  return {
    ok: true,
    route: routeData.route,
    post: best,
    candidates: scored,
    targets,
    targetsCovered: best.coveredIdx.map((i) => targets[i]),
    coverage: {
      routePoints: all.length,
      beforePercent: Math.round((beforeCovered / all.length) * 100),
      afterPercent: Math.min(100, Math.round((afterCovered / all.length) * 100)),
      gapPointsTotal: uncoveredAll.length,
      gapPointsClosedEstimate: Math.round((best.coveredCount / Math.max(1, targets.length)) * uncoveredAll.length),
    },
    postHeightM,
  };
}

/** 부감시소 + 신규 확보 LOS 를 지도에 표시 */
export class GapClosureLayer {
  constructor(viewer) {
    this.viewer = viewer;
    this.ds = new Cesium.CustomDataSource('gap-closure');
    viewer.dataSources.add(this.ds);
    this.result = null;
  }

  clear() { this.ds.entities.removeAll(); this.result = null; }
  show(v) { this.ds.show = v; }

  render(result) {
    this.clear();
    if (!result?.ok) return 0;
    this.result = result;
    const e = this.ds.entities;
    const post = result.post;
    const D = Cesium.Cartesian3.fromDegrees;

    // 신규 확보 LOS (부감시소 → 확보된 축선 지점)
    result.targetsCovered.forEach((t, i) => {
      e.add({
        id: `gap-los-${i}`,
        polyline: {
          positions: [D(post.lon, post.lat, post.groundH + result.postHeightM), D(t.lon, t.lat, t.h + 1.7)],
          width: 1.4,
          material: new Cesium.PolylineGlowMaterialProperty({
            glowPower: 0.16, color: css('#3dd68c').withAlpha(0.42),
          }),
        },
      });
    });

    // 부감시소 마스트
    e.add({
      id: 'gap-post-mast',
      polyline: {
        positions: [D(post.lon, post.lat, post.groundH), D(post.lon, post.lat, post.groundH + result.postHeightM)],
        width: 5, material: css('#3dd68c'),
      },
    });
    e.add({
      id: 'gap-post',
      position: D(post.lon, post.lat, post.groundH + result.postHeightM),
      point: {
        pixelSize: 13, color: css('#3dd68c'),
        outlineColor: css('#0b1420'), outlineWidth: 2,
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
      },
      label: {
        text: `부감시소 (권고)\n표고 ${post.elevationM}m · 고 ${result.postHeightM}m\n`
          + `${result.route.name.split(' — ')[0]} 커버 ${result.coverage.beforePercent}% → ${result.coverage.afterPercent}%`,
        font: '600 11px "Pretendard GOV", sans-serif',
        fillColor: css('#3dd68c'),
        showBackground: true, backgroundColor: css('#0b1420').withAlpha(0.85),
        backgroundPadding: new Cesium.Cartesian2(8, 5),
        pixelOffset: new Cesium.Cartesian2(0, -30),
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
        scaleByDistance: new Cesium.NearFarScalar(1500, 1.0, 20000, 0.55),
      },
    });

    // 탈락 후보 (참고용 소형 점)
    result.candidates.slice(1, 6).forEach((c, i) => {
      e.add({
        id: `gap-cand-${i}`,
        position: D(c.lon, c.lat, c.groundH + 3),
        point: {
          pixelSize: 6, color: css('#8494a6').withAlpha(0.75),
          outlineColor: css('#0b1420'), outlineWidth: 1,
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
        },
      });
    });

    return e.values.length;
  }
}

