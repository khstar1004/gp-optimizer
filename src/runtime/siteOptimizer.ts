// @ts-nocheck
/**
 * 부지 배치 최적화 엔진 v2 — 합동(팀) 최적화
 *
 * v1(자산별 독립 greedy·섹터 중심 고정 지향) → v2 업그레이드:
 *  ① 탐지확률 가중: 이진 LOS가 아니라 자산별 P(d) 프로파일(DRI 구간·레이더 R⁻⁴ 감쇠·
 *     화기 명중률 감쇠)로 표적 기여를 가중. 합동 커버는 확률 합성 1−∏(1−Pᵢ).
 *  ② 지향각 탐색: 팬틸트/어레이 지향(aim)을 섹터 중심 ±45° 범위에서 함께 최적화 —
 *     선순위 자산이 못 보는 사각을 후순위 자산이 지향을 틀어 메운다.
 *  ③ 한계기여(marginal-gain) greedy: 커버리지 함수는 submodular — 각 자산을
 *     "지금까지의 합동 커버에 가장 크게 더하는" (위치, 지향) 조합에 배치 (근사 최적 보장).
 *  ④ 사각지대 분석: 조기경보선(≤1.8km) 방위 빈별 합동 커버를 검사해 갭 구간 보고.
 *  ⑤ 커버리지 래스터: 최적 배치의 합동 커버를 지도 드레이프용 캔버스로 렌더.
 *
 * 지형은 기존 ViewshedGrid.terrainH를 DEM처럼 재사용 — 추가 지형 샘플 없이 순수 CPU.
 * 시설 스코어도 10종 역할 기반으로 확장 (전방 초소·게이트 위병소·의무/복지/정비 인접성).
 */
import { SITE } from './data';
import { offset, distM, azimuthDeg, azDelta } from './geo';

const R_EARTH = 6371008.8;

// ═══════════════ 지형 DEM 조회 + LOS ═══════════════
export function lookupTerrainH(grid, lon, lat) {
  const d = distM(grid.lon, grid.lat, lon, lat);
  if (d < grid.minR) return grid.groundH;
  if (d > grid.maxR) return null;
  const az = azimuthDeg(grid.lon, grid.lat, lon, lat);
  const span = grid.azEnd - grid.azStart;
  const rel = ((az - grid.azStart) % 360 + 360) % 360;
  if (rel > span) return null;
  const a = Math.round((rel / span) * (grid.nAz - 1));
  const r = Math.round((d - grid.minR) / grid.rStep);
  if (a < 0 || a >= grid.nAz || r < 0 || r >= grid.nR) return null;
  return grid.terrainH[a * grid.nR + r];
}

/** 관측점(절대고도)→표적(지형+1.7m) LOS — 그리드 DEM 레이마칭, 곡률 k=0.13 */
export function losClear(grid, fromLon, fromLat, fromH, toLon, toLat) {
  const total = distM(fromLon, fromLat, toLon, toLat);
  const toGround = lookupTerrainH(grid, toLon, toLat);
  if (toGround === null) return false;
  const targetH = toGround + 1.7 - (total * total) / (2 * R_EARTH) * 0.87;
  const step = Math.max(60, grid.rStep * 0.9);
  const n = Math.max(2, Math.floor(total / step));
  for (let i = 1; i < n; i++) {
    const t = i / n;
    const g = lookupTerrainH(grid, fromLon + (toLon - fromLon) * t, fromLat + (toLat - fromLat) * t);
    if (g === null) continue;
    const d = total * t;
    const curve = (d * d) / (2 * R_EARTH) * 0.87;
    const sight = fromH + (targetH - fromH) * t;
    if (g - curve > sight + 0.5) return false;
  }
  return true;
}

// ═══════════════ 자산 프로파일 (탐지확률 P(d)) ═══════════════
// eo/ir: DRI 3구간 (식별=1 / 인지 / 탐지 감쇠), radar: R⁻⁴ 힌트 감쇠, weapon: 명중률 감쇠
const PROFILES = {
  eo: {
    kind: 'los', eyeCls: 'high', fov: 90, range: 3500,
    p: (d) => (d <= 600 ? 1 : d <= 1200 ? 0.85 : d <= 3500 ? 0.85 - 0.6 * (d - 1200) / 2300 : 0),
  },
  ir: {
    kind: 'los', eyeCls: 'high', fov: 60, range: 2800,
    p: (d) => (d <= 480 ? 1 : d <= 950 ? 0.8 : d <= 2800 ? 0.8 - 0.58 * (d - 950) / 1850 : 0),
  },
  radar: {
    kind: 'los', eyeCls: 'mid', fov: 120, range: 5000,
    p: (d) => (d <= 5000 ? 0.9 * (1 - 0.35 * (d / 5000) ** 4) : 0),
  },
  weapon: {
    kind: 'los', eyeCls: 'low', fov: 150, range: 1800,
    p: (d) => (d <= 1800 ? Math.max(0, (1 - d / 1800)) ** 1.2 : 0),
  },
  acoustic: {  // 비가시선 — 음향 전달손실 감쇠, LOS 불필요
    kind: 'nolos', range: 900,
    p: (d) => (d <= 900 ? 0.25 + 0.6 * (1 - d / 900) : 0),
  },
  cuas: { kind: 'elev', maxDist: 30 },
  flare: { kind: 'elev', maxDist: 90 },
};
const EYE_H = { high: 9.5, mid: 2.6, low: 1.2 };

// ═══════════════ 표적 격자 / 후보 링 ═══════════════
function sectorTargets(grid) {
  const { sector } = SITE;
  const targets = [];
  for (let da = -sector.halfAngle; da <= sector.halfAngle; da += 6) {
    for (const d of [300, 500, 750, 1050, 1400, 1800, 2300, 2900, 3600]) {
      if (d < sector.minR || d > sector.maxR) continue;
      const p = offset(grid.lon, grid.lat, sector.centerAz + da, d);
      const g = lookupTerrainH(grid, p.lon, p.lat);
      if (g === null) continue;
      targets.push({ lon: p.lon, lat: p.lat, az: sector.centerAz + da, d, w: d, g });
    }
  }
  return targets;
}

function candidateRing() {
  const cands = [];
  for (let az = 0; az < 360; az += 12) {
    for (const dist of [12, 20, 32, 50, 70, 90]) {
      const p = offset(SITE.gp.lon, SITE.gp.lat, az, dist);
      cands.push({ az, dist, lon: p.lon, lat: p.lat, h: null });
    }
  }
  return cands;
}

// ═══════════════ 합동 최적화 ═══════════════
/**
 * @returns {
 *   placements: Map key→{az,dist,lon,lat,h,aimAz,coverage,marginal},
 *   report: { jointBefore, jointAfter, perAsset:[{key,aimAz,az,dist,coverage,marginal}],
 *             gaps:[{from,to}], nTargets, nCands }
 * }
 */
export async function optimizeMountPlacements(grid, keys, candHeights, defaults = null) {
  const cands = candidateRing();
  const hs = await candHeights(cands.map((c) => ({ lon: c.lon, lat: c.lat })));
  cands.forEach((c, i) => { c.h = Number.isFinite(hs[i]) ? hs[i] : grid.groundH; });

  const targets = sectorTargets(grid);
  const nT = targets.length;
  const wTotal = targets.reduce((s, t) => s + t.w, 0);
  const { sector } = SITE;

  // eyeH 클래스별 가시행렬 V[cls][cand*nT + t] 사전계산 (순수 CPU)
  const V = {};
  for (const cls of ['high', 'mid', 'low']) {
    const m = new Uint8Array(cands.length * nT);
    for (let ci = 0; ci < cands.length; ci++) {
      const c = cands[ci];
      const eyeAbs = c.h + EYE_H[cls];
      for (let ti = 0; ti < nT; ti++) {
        const t = targets[ti];
        if (losClear(grid, c.lon, c.lat, eyeAbs, t.lon, t.lat)) m[ci * nT + ti] = 1;
      }
    }
    V[cls] = m;
  }
  // 표적별 (후보→표적) 거리·방위 캐시
  const dCT = new Float32Array(cands.length * nT);
  const azCT = new Float32Array(cands.length * nT);
  for (let ci = 0; ci < cands.length; ci++) {
    for (let ti = 0; ti < nT; ti++) {
      dCT[ci * nT + ti] = distM(cands[ci].lon, cands[ci].lat, targets[ti].lon, targets[ti].lat);
      azCT[ci * nT + ti] = azimuthDeg(cands[ci].lon, cands[ci].lat, targets[ti].lon, targets[ti].lat);
    }
  }

  const AIMS = [-45, -30, -15, 0, 15, 30, 45].map((a) => sector.centerAz + a);

  /** (자산, 후보, 지향)의 표적별 P 배열 */
  const contrib = (key, ci, aim, out) => {
    const pr = PROFILES[key];
    for (let ti = 0; ti < nT; ti++) {
      out[ti] = 0;
      const d = dCT[ci * nT + ti];
      if (d > pr.range) continue;
      if (pr.kind === 'los') {
        if (!V[pr.eyeCls][ci * nT + ti]) continue;
        if (Math.abs(azDelta(azCT[ci * nT + ti], aim)) > pr.fov / 2) continue;
      }
      out[ti] = pr.p(d);
    }
  };

  const jointOf = (cov) => {
    let s = 0;
    for (let ti = 0; ti < nT; ti++) s += cov[ti] * targets[ti].w;
    return s / wTotal;
  };

  // ── 기준선(현 배치) 합동 커버 ──
  let jointBefore = 0;
  if (defaults) {
    const cov0 = new Float32Array(nT);
    const tmp = new Float32Array(nT);
    for (const key of keys) {
      const pr = PROFILES[key];
      if (!pr || pr.kind === 'elev' || !defaults[key]) continue;
      const dp = defaults[key];
      const p0 = offset(SITE.gp.lon, SITE.gp.lat, dp.az, dp.dist);
      const h0 = lookupTerrainH(grid, p0.lon, p0.lat) ?? grid.groundH;
      // 임시 후보로 등록해 동일 경로 평가
      const pseudo = { lon: p0.lon, lat: p0.lat, h: h0 };
      for (let ti = 0; ti < nT; ti++) {
        const t = targets[ti];
        const d = distM(pseudo.lon, pseudo.lat, t.lon, t.lat);
        tmp[ti] = 0;
        if (d > pr.range) continue;
        if (pr.kind === 'los') {
          if (!losClear(grid, pseudo.lon, pseudo.lat, pseudo.h + EYE_H[pr.eyeCls], t.lon, t.lat)) continue;
          if (Math.abs(azDelta(azimuthDeg(pseudo.lon, pseudo.lat, t.lon, t.lat), sector.centerAz)) > pr.fov / 2) continue;
        }
        tmp[ti] = pr.p(d);
      }
      for (let ti = 0; ti < nT; ti++) cov0[ti] = 1 - (1 - cov0[ti]) * (1 - tmp[ti]);
    }
    jointBefore = jointOf(cov0);
  }

  // ── 한계기여 greedy: (위치 × 지향) 동시 탐색 ──
  const ORDER = ['radar', 'eo', 'ir', 'weapon', 'acoustic', 'flare', 'cuas'];
  const cov = new Float32Array(nT);
  const tmp = new Float32Array(nT);
  const placements = new Map();
  const perAsset = [];

  for (const key of ORDER) {
    if (!keys.includes(key)) continue;
    const pr = PROFILES[key];
    if (pr.kind === 'elev') {
      let best = null;
      for (const c of cands) {
        if (c.dist < 9 || c.dist > pr.maxDist) continue;
        if ([...placements.values()].some((x) => distM(x.lon, x.lat, c.lon, c.lat) < 10)) continue;
        if (!best || c.h > best.h) best = c;
      }
      if (best) {
        placements.set(key, { ...best, aimAz: sector.centerAz, coverage: null, marginal: null });
        perAsset.push({ key, az: best.az, dist: best.dist, aimAz: sector.centerAz, coverage: null, marginal: null });
      }
      continue;
    }
    let best = null;
    const aims = pr.kind === 'los' ? AIMS : [sector.centerAz];
    for (let ci = 0; ci < cands.length; ci++) {
      const c = cands[ci];
      if (c.dist < 9) continue;
      if ([...placements.values()].some((x) => distM(x.lon, x.lat, c.lon, c.lat) < 10)) continue;
      for (const aim of aims) {
        contrib(key, ci, aim, tmp);
        let gain = 0, own = 0;
        for (let ti = 0; ti < nT; ti++) {
          const w = targets[ti].w;
          own += tmp[ti] * w;
          gain += (1 - (1 - cov[ti]) * (1 - tmp[ti]) - cov[ti]) * w;
        }
        if (!best || gain > best.gain) best = { ...c, ci, aimAz: aim, gain, own };
      }
    }
    if (!best) continue;
    contrib(key, best.ci, best.aimAz, tmp);
    for (let ti = 0; ti < nT; ti++) cov[ti] = 1 - (1 - cov[ti]) * (1 - tmp[ti]);
    const rec = {
      az: best.az, dist: best.dist, lon: best.lon, lat: best.lat, h: best.h,
      aimAz: ((best.aimAz % 360) + 360) % 360,
      coverage: best.own / wTotal, marginal: best.gain / wTotal,
    };
    placements.set(key, rec);
    perAsset.push({ key, az: rec.az, dist: rec.dist, aimAz: rec.aimAz, coverage: rec.coverage, marginal: rec.marginal });
  }
  const jointAfter = jointOf(cov);

  // ── 사각지대: 조기경보선(≤1.8km) 방위 빈별 평균 커버 < 0.22 구간 병합 ──
  const bins = new Map();
  for (let ti = 0; ti < nT; ti++) {
    const t = targets[ti];
    if (t.d > 1800) continue;
    const b = Math.round(t.az / 6) * 6;
    const e = bins.get(b) ?? { s: 0, n: 0 };
    e.s += cov[ti]; e.n++;
    bins.set(b, e);
  }
  const gapBins = [...bins.entries()].filter(([, e]) => e.s / e.n < 0.22).map(([b]) => b).sort((a, b) => a - b);
  const gaps = [];
  for (const b of gapBins) {
    const last = gaps[gaps.length - 1];
    if (last && b - last.to <= 6) last.to = b;
    else gaps.push({ from: b, to: b });
  }

  return {
    placements,
    report: { jointBefore, jointAfter, perAsset, gaps, nTargets: nT, nCands: cands.length },
  };
}

// ═══════════════ 합동 커버리지 래스터 (지도 드레이프) ═══════════════
export function coverageRaster(grid, placements, size = 384) {
  const { sector } = SITE;
  const maxR = sector.maxR + 200;
  const north = offset(grid.lon, grid.lat, 0, maxR).lat;
  const south = offset(grid.lon, grid.lat, 180, maxR).lat;
  const east = offset(grid.lon, grid.lat, 90, maxR).lon;
  const west = offset(grid.lon, grid.lat, 270, maxR).lon;

  const mounts = [...placements.entries()]
    .map(([key, p]) => ({ key, pr: PROFILES[key], ...p }))
    .filter((m) => m.pr && m.pr.kind !== 'elev');

  const canvas = document.createElement('canvas');
  canvas.width = size; canvas.height = size;
  const ctx = canvas.getContext('2d');
  const img = ctx.createImageData(size, size);
  const data = img.data;

  for (let py = 0; py < size; py++) {
    const plat = north + (south - north) * (py / (size - 1));
    for (let px = 0; px < size; px++) {
      const plon = west + (east - west) * (px / (size - 1));
      const d0 = distM(grid.lon, grid.lat, plon, plat);
      if (d0 < sector.minR || d0 > sector.maxR) continue;
      const az0 = azimuthDeg(grid.lon, grid.lat, plon, plat);
      const angEdge = sector.halfAngle - Math.abs(azDelta(az0, sector.centerAz));
      if (angEdge < 0) continue;

      let cov = 0;
      for (const m of mounts) {
        const d = distM(m.lon, m.lat, plon, plat);
        if (d > m.pr.range) continue;
        if (m.pr.kind === 'los') {
          if (Math.abs(azDelta(azimuthDeg(m.lon, m.lat, plon, plat), m.aimAz)) > m.pr.fov / 2) continue;
          if (!losClear(grid, m.lon, m.lat, m.h + EYE_H[m.pr.eyeCls], plon, plat)) continue;
        }
        cov = 1 - (1 - cov) * (1 - m.pr.p(d));
        if (cov > 0.93) break;
      }
      const o = (py * size + px) * 4;
      const feather = Math.min(1, angEdge / 6) * Math.min(1, Math.min(d0 - sector.minR, sector.maxR - d0) / 220);
      const A = (base) => Math.round(base * feather);
      if (cov >= 0.6) { data[o] = 34; data[o + 1] = 214; data[o + 2] = 238; data[o + 3] = A(135); }
      else if (cov >= 0.3) { data[o] = 61; data[o + 1] = 214; data[o + 2] = 140; data[o + 3] = A(110); }
      else if (cov > 0.06) { data[o] = 252; data[o + 1] = 196; data[o + 2] = 48; data[o + 3] = A(90); }
      else { data[o] = 225; data[o + 1] = 52; data[o + 2] = 68; data[o + 3] = A(100); }
    }
  }
  ctx.putImageData(img, 0, 0);
  const tmp = document.createElement('canvas');
  tmp.width = size; tmp.height = size;
  tmp.getContext('2d').drawImage(canvas, 0, 0);
  ctx.clearRect(0, 0, size, size);
  ctx.filter = 'blur(2px)';
  ctx.drawImage(tmp, 0, 0);
  ctx.filter = 'none';
  return { canvas, rectangle: Cesium.Rectangle.fromDegrees(west, south, east, north) };
}

// ═══════════════ 시설 배치 스코어 v2 — 10종 역할 기반 ═══════════════
/**
 * c: {lon,lat,az,d,h,slopeDeg}, gpH: 능선고, placedSoFar: [{id,lon,lat}], ctx: {hubAz}
 */
export function facilityScore(specId, c, gpH, placedSoFar, ctx = {}) {
  const slopeScore = Math.max(0, 1 - c.slopeDeg / 12);
  const defilade = Math.max(0, Math.min(1, (gpH - c.h) / 25));
  const { sector } = SITE;
  const fwd = Math.max(0, 1 - Math.abs(azDelta(c.az, sector.centerAz)) / 90);   // 전방성
  const rear = 1 - fwd;

  const at = (id) => placedSoFar.find((p) => p.id === id);
  const dTo = (p) => distM(c.lon, c.lat, p.lon, p.lat);
  const near = (id, ideal, hard) => {
    const p = at(id);
    if (!p) return 0;
    const dd = dTo(p);
    if (hard && dd > hard) return -Infinity;
    return Math.max(0, 1 - dd / ideal);
  };

  let score = slopeScore * 0.5 + defilade * 0.28 + rear * 0.08;
  switch (specId) {
    case 'command-zone':
      if (c.d > 75) return -Infinity;
      score += (1 - c.d / 75) * 0.25;
      break;
    case 'living-zone':
      score += Math.min(1, c.d / 90) * 0.1;                     // 타워 소음·표적성 이격
      break;
    case 'hygiene-zone': {
      const n = near('living-zone', 45, 60);
      if (n === -Infinity) return -Infinity;
      score += n * 0.25;
      break;
    }
    case 'welfare-zone': {
      const n = near('living-zone', 55, 90);
      if (n === -Infinity) return -Infinity;
      score += n * 0.22;
      break;
    }
    case 'medical-zone': {
      const n = near('living-zone', 60, 100);
      if (n === -Infinity) return -Infinity;
      score += n * 0.18 + slopeScore * 0.1;                     // 들것 동선 평탄 가중
      break;
    }
    case 'infrastructure-zone': {
      if (placedSoFar.length) {
        const avg = placedSoFar.reduce((s, p) => s + dTo(p), 0) / placedSoFar.length;
        score += Math.max(0, 1 - avg / 120) * 0.2;              // 급전·급수 거리합 최소
      }
      break;
    }
    case 'storage-zone': {
      for (const id of ['living-zone', 'command-zone', 'welfare-zone', 'medical-zone']) {
        const p = at(id);
        if (p && dTo(p) < 50) return -Infinity;                  // 탄약 안전이격
      }
      score += Math.min(1, c.d / 130) * 0.15;
      break;
    }
    case 'maintenance-zone': {
      const n = Math.max(near('storage-zone', 80), near('infrastructure-zone', 80));
      score += n * 0.18 + Math.min(1, c.d / 110) * 0.08;
      break;
    }
    case 'security-zone':
      // 전방 초소: 관측이 목적 — 은폐보다 전방·능선 노출 우선
      score = slopeScore * 0.35 + fwd * 0.45 + (1 - defilade) * 0.12 + Math.min(1, c.d / 80) * 0.08;
      break;
    case 'entry-zone': {
      // 위병소: 후방 접근로(허브 방향) 회랑 + 부지 외곽
      const hubAlign = ctx.hubAz === undefined ? 0 : Math.max(0, 1 - Math.abs(azDelta(c.az, ctx.hubAz)) / 40);
      if (ctx.hubAz !== undefined && hubAlign === 0) return -Infinity;
      score = slopeScore * 0.3 + hubAlign * 0.45 + Math.min(1, c.d / 130) * 0.25;
      break;
    }
    default:
      break;
  }
  return score;
}

