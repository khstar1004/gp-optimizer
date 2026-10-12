// @ts-nocheck
/**
 * 감시자산 자동 배치 — 「어디가 사각인지」에서 「그럼 어디에 세우나」까지.
 *
 * 감시 탭은 지금까지 세 가지를 답했다: 어디에 세웠나 · 어디까지 보이나 · 날씨가 얼마나
 * 깎나. 그런데 사각 방위를 알려주고는 거기서 끝났다 — 정작 **그 사각을 어떻게 메우나**는
 * 운용자가 초소를 하나씩 끌어다 놓으며 손으로 찾아야 했다. 이 파일이 그 마지막 칸을 채운다.
 *
 * 방법은 커버리지 엔진이 이미 쓰는 것과 같다. 다른 점은 **평가 대상이 배치가 아니라
 * 후보**라는 것뿐이다:
 *
 *   ① 후보 격자   GP 중심 방위 × 거리 링으로 후보점을 깔고 지반고를 한 번에 잰다.
 *   ② LOS 마스크  후보마다 한 장. **유형이 아니라 자리**가 가시선을 정하므로 유형 수만큼
 *                 다시 굽지 않는다(관측고는 대표값 하나로 근사 — 마스트 4~9m 차이가
 *                 능선 차폐를 뒤집는 일은 드물다).
 *   ③ 그리디      매 스텝 (후보 × 유형 × 지향) 전수에서 **한계이득/취득비**가 가장 큰 하나를
 *                 고른다. 합동 탐지확률은 1−∏(1−Pᵢ) 이라 이득이 체감하므로, 그리디가
 *                 (1−1/e) 보장을 갖는 열등해가 된다 — 이 문제에서 실용적으로 충분하다.
 *
 * 예산(억원)과 개수를 동시에 받는다. 「4개까지, 30억 안에서」가 실제 질문의 형태다.
 */
import { SITE } from './data';
import { offset, distM, azimuthDeg, azDelta } from './geo';
import { losClear } from './siteOptimizer';
import { CoverageEngine } from './postCoverage';
import { POST_TYPE } from './sensorPosts';
import { atmosphereOf, effectiveRanges, detectionProbability } from './sensorPerformance';

/** LOS 를 묻지 않는 대역 — 음향·RF 는 지형 뒤도 듣는다/막는다. */
const NOLOS_BANDS = new Set(['acoustic', 'rf']);

/** 마스크를 구울 때 쓰는 대표 관측고(m). 유형별 마스트 차이는 여기서 흡수한다. */
const REPRESENTATIVE_EYE_M = 7;

/** 후보끼리 이만큼은 떨어져야 한다 — 같은 능선 위에 두 대를 겹쳐 세우지 않는다. */
const MIN_SPACING_M = 55;

/** 지향 후보 — FOV 60~150° 자산이라 45° 간격이면 사각을 놓치지 않는다. */
const AIM_STEP_DEG = 45;

/**
 * 후보점 격자. 방위는 전 방위를 훑되(뒤쪽 능선에서 앞을 내려다보는 자리가 답일 때가 있다)
 * 거리는 GP 근접부에 촘촘하다 — 멀리 나갈수록 방호·통신·급전이 비싸진다.
 */
export function buildCandidates({ azStepDeg = 20, rings = [45, 110, 210, 360, 560, 820] } = {}) {
  const out = [];
  for (let az = 0; az < 360; az += azStepDeg) {
    for (const d of rings) {
      const p = offset(SITE.gp.lon, SITE.gp.lat, az, d);
      out.push({ lon: p.lon, lat: p.lat, az, dist: d, groundH: 0 });
    }
  }
  return out;
}

/**
 * 후보 하나의 LOS 마스크 — 엔진 픽셀마다 (보이는가, 거리, 방위).
 * 엔진 픽셀은 책임구역 안으로 이미 걸러져 있어 전 화면을 훑지 않는다.
 */
function bakeMask(engine, grid, cand) {
  const n = engine.n;
  const los = new Uint8Array(n);
  const dist = new Float32Array(n);
  const az = new Float32Array(n);
  const eye = cand.groundH + REPRESENTATIVE_EYE_M;
  for (let i = 0; i < n; i++) {
    const d = distM(cand.lon, cand.lat, engine.lon[i], engine.lat[i]);
    dist[i] = d;
    az[i] = azimuthDeg(cand.lon, cand.lat, engine.lon[i], engine.lat[i]);
    if (d > 5200) continue;                       // 어떤 자산도 이보다 멀리 보지 않는다
    los[i] = losClear(grid, cand.lon, cand.lat, eye, engine.lon[i], engine.lat[i]) ? 1 : 0;
  }
  return { los, dist, az };
}

/** 배치 하나가 각 픽셀에 주는 탐지확률 — 마스크 위에서 곱셈만. */
function coverageOf(mask, n, { perf, fov, aimAz, noLos }) {
  const out = new Float32Array(n);
  if (!perf || perf.range <= 0) return out;
  const half = fov / 2;
  for (let i = 0; i < n; i++) {
    if (!noLos && !mask.los[i]) continue;
    const d = mask.dist[i];
    if (d > perf.range) continue;
    if (fov < 360 && Math.abs(azDelta(mask.az[i], aimAz)) > half) continue;
    const pd = detectionProbability(perf, d);
    if (pd > 0) out[i] = pd;
  }
  return out;
}

const meanOf = (arr) => {
  let s = 0;
  for (let i = 0; i < arr.length; i++) s += arr[i];
  return arr.length ? s / arr.length : 0;
};

/**
 * 자동 배치 계획 산출.
 *
 * @param opts {
 *   grid          ViewshedGrid (감시탑 가시격자 — DEM 겸용)
 *   envState      EnvironmentController.state (실효거리 산출용)
 *   typeIds       후보 자산 유형 id 배열
 *   maxPosts      최대 개수
 *   budgetEok     취득비 상한(억). null 이면 무제한
 *   existing      유지할 기존 배치 snapshot (없으면 빈 배열 — 백지에서 설계)
 *   sampleHeights async (cartographics) => void
 *   searchSize    탐색 격자 해상도 (기본 96 — 본 화면 176 보다 성기게 훑는다)
 *   onProgress    (0~1, 문구) => void
 * }
 * @returns { picks, report }
 */
export async function optimizePostLayout(opts) {
  const {
    grid, envState, typeIds, maxPosts = 4, budgetEok = null,
    existing = [], sampleHeights, searchSize = 96, onProgress,
  } = opts;
  if (!grid) throw new Error('가시격자가 없습니다 — 먼저 가시영역을 계산하세요');
  const types = typeIds.map((id) => POST_TYPE[id]).filter(Boolean);
  if (!types.length) throw new Error('자산 유형을 하나 이상 선택하세요');

  const engine = new CoverageEngine(grid, searchSize);
  const n = engine.n;
  const atm = envState ? atmosphereOf(envState) : null;

  // 조명탄이 이미 서 있으면 야간 EO·육안이 되살아난다 — 그 전제를 그대로 이어받는다.
  const illuminated = existing.some((p) => p.type === 'flare')
    || typeIds.includes('flare');

  const perfOf = (t) => (atm
    ? effectiveRanges({ band: t.band, dri: t.dri, fov: t.fov }, atm,
      { illuminated: illuminated && (t.band === 'vis' || t.band === 'eye') })
    : { dri: t.dri, range: t.dri[0], specRange: t.dri[0], factor: 1, verdict: 'GO', limiter: '제원' });

  // ── ① 후보 지반고 일괄 측량 ──
  onProgress?.(0.02, '후보점 지반고 측량…');
  const cands = buildCandidates();
  const cartos = cands.map((c) => Cesium.Cartographic.fromDegrees(c.lon, c.lat));
  await sampleHeights?.(cartos);
  cands.forEach((c, i) => { c.groundH = cartos[i].height ?? 0; });

  // ── ② 기존 배치의 현재 커버 (그리디의 출발선) ──
  onProgress?.(0.08, '기존 배치 가시선 재구성…');
  const p = new Float32Array(n);
  for (const post of existing) {
    const mask = bakeMask(engine, grid, { lon: post.lon, lat: post.lat, groundH: post.groundH ?? 0 });
    const t = POST_TYPE[post.type];
    if (!t) continue;
    const cov = coverageOf(mask, n, {
      perf: perfOf(t), fov: post.fov ?? t.fov, aimAz: post.aimAz ?? SITE.sector.centerAz,
      noLos: NOLOS_BANDS.has(t.band),
    });
    for (let i = 0; i < n; i++) p[i] = 1 - (1 - p[i]) * (1 - cov[i]);
    await new Promise((r) => setTimeout(r, 0));
  }
  const jointBefore = meanOf(p);

  // ── ③ 후보 마스크 굽기 ──
  const masks = [];
  for (let k = 0; k < cands.length; k++) {
    masks.push(bakeMask(engine, grid, cands[k]));
    if (k % 6 === 0) {
      onProgress?.(0.1 + 0.6 * (k / cands.length), `후보 가시선 광선추적 ${k + 1}/${cands.length}`);
      await new Promise((r) => setTimeout(r, 0));
    }
  }

  // ── ④ 그리디 선택 ──
  const perfCache = new Map(types.map((t) => [t.id, perfOf(t)]));
  const picks = [];
  let spent = 0;
  const taken = [...existing.map((e) => ({ lon: e.lon, lat: e.lat }))];

  for (let step = 0; step < maxPosts; step++) {
    onProgress?.(0.72 + 0.26 * (step / maxPosts), `한계기여 최대 자리 탐색 ${step + 1}/${maxPosts}`);
    let best = null;
    for (let k = 0; k < cands.length; k++) {
      const c = cands[k];
      if (taken.some((q) => distM(q.lon, q.lat, c.lon, c.lat) < MIN_SPACING_M)) continue;
      const mask = masks[k];
      for (const t of types) {
        const cost = t.costEok ?? 0;
        if (budgetEok != null && spent + cost > budgetEok + 1e-9) continue;
        const perf = perfCache.get(t.id);
        const noLos = NOLOS_BANDS.has(t.band);
        const aims = t.fov >= 360 ? [SITE.sector.centerAz] : [];
        if (!aims.length) {
          for (let a = 0; a < 360; a += AIM_STEP_DEG) aims.push(a);
        }
        for (const aimAz of aims) {
          const cov = coverageOf(mask, n, { perf, fov: t.fov, aimAz, noLos });
          let gain = 0;
          for (let i = 0; i < n; i++) {
            if (cov[i] <= 0) continue;
            gain += (1 - (1 - p[i]) * (1 - cov[i])) - p[i];
          }
          gain /= n;
          if (gain <= 1e-6) continue;
          // 취득비 대비 이득이 기준이다 — 12.5억 레이더가 1.8억 K6 두 대를 못 이기면 안 세운다.
          const value = cost > 0 ? gain / cost : gain * 1e3;
          if (!best || value > best.value) {
            best = { value, gain, cost, cand: c, candIndex: k, type: t, aimAz, cov };
          }
        }
      }
      if (k % 12 === 0) await new Promise((r) => setTimeout(r, 0));
    }
    if (!best) break;
    for (let i = 0; i < n; i++) p[i] = 1 - (1 - p[i]) * (1 - best.cov[i]);
    spent += best.cost;
    taken.push({ lon: best.cand.lon, lat: best.cand.lat });
    picks.push({
      typeId: best.type.id, typeName: best.type.name, short: best.type.short,
      icon: best.type.icon, color: best.type.color,
      lon: best.cand.lon, lat: best.cand.lat, groundH: best.cand.groundH,
      az: best.cand.az, dist: best.cand.dist,
      aimAz: best.aimAz, mastH: best.type.mast[0],
      costEok: best.cost, marginal: best.gain,
      effRange: perfCache.get(best.type.id)?.range ?? null,
    });
    await new Promise((r) => setTimeout(r, 0));
  }

  const jointAfter = meanOf(p);
  let covered = 0;
  for (let i = 0; i < n; i++) if (p[i] >= 0.3) covered++;

  // 사각 방위 비교는 같은 엔진의 규칙(조기경보선 1.8km · 5° 빈)으로 낸다.
  const gapsAfter = engine.gaps({ p });
  const pBefore = new Float32Array(n);
  for (const post of existing) {
    const mask = bakeMask(engine, grid, { lon: post.lon, lat: post.lat, groundH: post.groundH ?? 0 });
    const t = POST_TYPE[post.type];
    if (!t) continue;
    const cov = coverageOf(mask, n, {
      perf: perfOf(t), fov: post.fov ?? t.fov, aimAz: post.aimAz ?? SITE.sector.centerAz,
      noLos: NOLOS_BANDS.has(t.band),
    });
    for (let i = 0; i < n; i++) pBefore[i] = 1 - (1 - pBefore[i]) * (1 - cov[i]);
  }
  const gapsBefore = engine.gaps({ p: pBefore });

  onProgress?.(1, '완료');
  return {
    picks,
    report: {
      jointBefore, jointAfter, covered: n ? covered / n : 0,
      costEok: spent, budgetEok, maxPosts,
      gapsBefore, gapsAfter,
      candidateCount: cands.length,
      combinationCount: cands.length * types.length * Math.max(1, Math.round(360 / AIM_STEP_DEG)),
      searchSize, cells: n,
      weatherLabel: envState?.weather?.label ?? '청천',
      approximation: `LOS 는 대표 관측고 ${REPRESENTATIVE_EYE_M}m 로 한 번만 구웠습니다 — 유형별 마스트 차이는 유효거리·시야각으로만 반영됩니다.`,
    },
  };
}
