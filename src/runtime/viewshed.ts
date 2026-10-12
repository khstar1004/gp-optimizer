// @ts-nocheck
/**
 * 가시영역(Viewshed) 엔진
 * - 관측점에서 극좌표 격자(방위×거리)로 지형을 샘플링하고,
 *   각 방위 레이를 따라 고도각 상한을 추적해 가시/차폐를 판정한다.
 * - 결과 격자는 (1) 지도 드레이프용 캔버스 래스터, (2) 커버리지 지표,
 *   (3) 침투 시뮬레이션의 탐지 판정 조회에 공용으로 쓰인다.
 */
import { offset, distM, azimuthDeg, azDelta } from './geo';
import { sampleTerrainDetailed } from './terrainSample';

const grids = new Map(); // cacheKey → ViewshedGrid

export function cacheKey(lon, lat, eyeH, maxR) {
  return `${lon.toFixed(6)}_${lat.toFixed(6)}_${eyeH}_${maxR}`;
}

/**
 * @returns ViewshedGrid {
 *   lon, lat, groundH, eyeH, maxR,
 *   azStart, azEnd, nAz, nR, rStep,
 *   vis: Uint8Array(nAz*nR),  terrainH: Float32Array(nAz*nR)
 * }
 */
export async function computeViewshed(viewer, opts) {
  const {
    lon, lat, eyeH,
    azStart = 0, azEnd = 360,
    nAz = 144, nR = 64,
    minR = 30, maxR = 5000,
    onProgress,
    realTerrain = null,
  } = opts;

  const key = cacheKey(lon, lat, eyeH, maxR) + `_${azStart}_${azEnd}_${nAz}_${nR}`;
  if (grids.has(key)) return grids.get(key);

  const azSpan = azEnd - azStart;
  const rStep = (maxR - minR) / (nR - 1);

  // 샘플 위치 생성 (관측점 + 극좌표 격자)
  const positions = [Cesium.Cartographic.fromDegrees(lon, lat)];
  for (let a = 0; a < nAz; a++) {
    const az = azStart + (azSpan * a) / (nAz - 1);
    for (let r = 0; r < nR; r++) {
      const d = minR + rStep * r;
      const p = offset(lon, lat, az, d);
      positions.push(Cesium.Cartographic.fromDegrees(p.lon, p.lat));
    }
  }

  // GP 정밀지형(GLB) 표출 중이면 그 표면을 우선한다 — 라이브 지형만 보면 이
  // 가시선 판정이 화면에 실제로 보이는 능선과 다른 모양을 기준으로 나온다
  // (감시탑에서 보이는데 가시영역엔 안 잡히는/그 반대의 불일치가 생김).
  const rtReady = !!(realTerrain?.active && realTerrain?.surfaceReady);
  if (rtReady) {
    for (const c of positions) {
      const h = realTerrain.surfaceHeightAt(Cesium.Math.toDegrees(c.longitude), Cesium.Math.toDegrees(c.latitude));
      c.height = Number.isFinite(h) ? h : NaN;
    }
  }
  const missing = rtReady ? positions.filter((c) => !Number.isFinite(c.height)) : positions;
  // 지형 고도 일괄 샘플링 (배치 분할로 진행률 표시) — GP 표면 범위 밖(NaN)이거나
  // GP 미표출이면 라이브 지형으로 채운다.
  const BATCH = 2048;
  for (let i = 0; i < missing.length; i += BATCH) {
    const chunk = missing.slice(i, i + BATCH);
    await sampleTerrainDetailed(viewer.terrainProvider, chunk);
    if (onProgress) onProgress(Math.min(1, (i + BATCH) / missing.length));
  }
  const sampled = positions;
  if (onProgress) onProgress(1);

  const groundH = sampled[0].height ?? 0;
  const obsH = groundH + eyeH;

  const vis = new Uint8Array(nAz * nR);
  const terrainH = new Float32Array(nAz * nR);

  for (let a = 0; a < nAz; a++) {
    let maxTan = -Infinity;
    for (let r = 0; r < nR; r++) {
      const idx = 1 + a * nR + r;
      const h = sampled[idx].height ?? 0;
      const d = minR + rStep * r;
      terrainH[a * nR + r] = h;
      // 지구 곡률 보정 (k=0.13 표준 굴절 반영)
      const curveDrop = (d * d) / (2 * 6371008.8) * 0.87;
      const tan = (h - curveDrop - obsH) / d;
      // 표적 높이 1.7m(사람) 가정: 표적 상단 기준으로 가시 판정
      const tanTarget = (h + 1.7 - curveDrop - obsH) / d;
      vis[a * nR + r] = tanTarget > maxTan ? 1 : 0;
      if (tan > maxTan) maxTan = tan;
    }
  }

  const grid = { lon, lat, groundH, eyeH, maxR, minR, azStart, azEnd, nAz, nR, rStep, vis, terrainH };
  grids.set(key, grid);
  return grid;
}

/** 격자에서 특정 지점의 가시 여부 조회 (침투 시뮬레이션용) */
export function lookupVisible(grid, lon, lat) {
  const d = distM(grid.lon, grid.lat, lon, lat);
  if (d < grid.minR) return true; // 초근접은 가시로 간주
  if (d > grid.maxR) return false;
  let az = azimuthDeg(grid.lon, grid.lat, lon, lat);
  const span = grid.azEnd - grid.azStart;
  let rel = ((az - grid.azStart) % 360 + 360) % 360;
  if (rel > span) return false;
  const a = Math.round((rel / span) * (grid.nAz - 1));
  const r = Math.round((d - grid.minR) / grid.rStep);
  if (a < 0 || a >= grid.nAz || r < 0 || r >= grid.nR) return false;
  return grid.vis[a * grid.nR + r] === 1;
}

/**
 * 센서 유효범위·시야각을 반영한 감시구역 커버리지 계산.
 * sensors: [{az, fov, effRange, grid}] — grid는 해당 마운트의 ViewshedGrid
 * sector: {centerAz, halfAngle, minR, maxR} (기준점 = refGrid 원점)
 * @returns {covered, visible, cells} 비율(면적가중)
 */
export function sectorCoverage(refGrid, sensors, sector) {
  const { nAz, nR, minR, rStep, azStart, azEnd } = refGrid;
  const span = azEnd - azStart;
  let wTotal = 0, wVisible = 0, wCovered = 0;
  for (let a = 0; a < nAz; a++) {
    const az = azStart + (span * a) / (nAz - 1);
    if (Math.abs(azDelta(az, sector.centerAz)) > sector.halfAngle) continue;
    for (let r = 0; r < nR; r++) {
      const d = minR + rStep * r;
      if (d < sector.minR || d > sector.maxR) continue;
      const w = d; // 면적가중 (환형 셀 면적 ∝ r)
      wTotal += w;
      const idx = a * nR + r;
      if (refGrid.vis[idx]) wVisible += w;
      // 센서 커버: 하나라도 (가시 && 범위내 && FOV내)
      const p = offset(refGrid.lon, refGrid.lat, az, d);
      for (const s of sensors) {
        const sd = distM(s.grid.lon, s.grid.lat, p.lon, p.lat);
        if (sd > s.effRange) continue;
        if (s.fov < 360) {
          const saz = azimuthDeg(s.grid.lon, s.grid.lat, p.lon, p.lat);
          if (Math.abs(azDelta(saz, s.az)) > s.fov / 2) continue;
        }
        if (lookupVisible(s.grid, p.lon, p.lat)) { wCovered += w; break; }
      }
    }
  }
  return {
    visible: wTotal ? wVisible / wTotal : 0,
    covered: wTotal ? wCovered / wTotal : 0,
  };
}

/**
 * 가시영역 + 센서커버리지를 캔버스로 래스터화 → Cesium SingleTileImageryProvider 드레이프용
 * mode: 'terrain'(지형가시성) | 'sensor'(센서커버)
 */
export function rasterize(refGrid, sensors, sector, mode = 'sensor', size = 1024) {
  const { lon, lat, maxR } = refGrid;
  // 경계 사각형 (도 단위)
  const north = offset(lon, lat, 0, maxR).lat;
  const south = offset(lon, lat, 180, maxR).lat;
  const east = offset(lon, lat, 90, maxR).lon;
  const west = offset(lon, lat, 270, maxR).lon;

  const canvas = document.createElement('canvas');
  canvas.width = size; canvas.height = size;
  const ctx = canvas.getContext('2d');
  const img = ctx.createImageData(size, size);
  const data = img.data;

  for (let py = 0; py < size; py++) {
    const plat = north + (south - north) * (py / (size - 1));
    for (let px = 0; px < size; px++) {
      const plon = west + (east - west) * (px / (size - 1));
      const d = distM(lon, lat, plon, plat);
      const o = (py * size + px) * 4;
      if (d < refGrid.minR || d > maxR) continue;
      const az = azimuthDeg(lon, lat, plon, plat);
      const inSector = Math.abs(azDelta(az, sector.centerAz)) <= sector.halfAngle
        && d >= sector.minR && d <= sector.maxR;
      if (!inSector) continue;

      const visTerrain = lookupVisible(refGrid, plon, plat);
      let coveredBy = null;
      for (const s of sensors) {
        const sd = distM(s.grid.lon, s.grid.lat, plon, plat);
        if (sd > s.effRange) continue;
        if (s.fov < 360) {
          const saz = azimuthDeg(s.grid.lon, s.grid.lat, plon, plat);
          if (Math.abs(azDelta(saz, s.az)) > s.fov / 2) continue;
        }
        if (lookupVisible(s.grid, plon, plat)) { coveredBy = s; break; }
      }

      // 페더링: 부채꼴 각도·반경 경계에서 부드럽게 소멸
      const angEdge = sector.halfAngle - Math.abs(azDelta(az, sector.centerAz));
      const radEdge = Math.min(d - sector.minR, sector.maxR - d);
      const feather = Math.min(1, angEdge / 6) * Math.min(1, radEdge / 220);
      // 거리 그라데이션 (원점에서 멀수록 옅게)
      const distFade = 1 - 0.35 * Math.min(1, (d - sector.minR) / (sector.maxR - sector.minR));
      const A = (base) => Math.round(base * feather * distFade);

      if (mode === 'terrain') {
        if (visTerrain) { data[o] = 52; data[o + 1] = 222; data[o + 2] = 150; data[o + 3] = A(115); }
        else { data[o] = 225; data[o + 1] = 56; data[o + 2] = 72; data[o + 3] = A(105); }
      } else {
        if (coveredBy) { data[o] = 34; data[o + 1] = 214; data[o + 2] = 238; data[o + 3] = A(130); }
        else if (visTerrain) { data[o] = 252; data[o + 1] = 196; data[o + 2] = 48; data[o + 3] = A(85); }
        else { data[o] = 225; data[o + 1] = 52; data[o + 2] = 68; data[o + 3] = A(105); }
      }
    }
  }
  ctx.putImageData(img, 0, 0);
  // 소프트 블러 패스 (격자 계단 완화)
  const tmp = document.createElement('canvas');
  tmp.width = size; tmp.height = size;
  tmp.getContext('2d').drawImage(canvas, 0, 0);
  ctx.clearRect(0, 0, size, size);
  ctx.filter = 'blur(2px)';
  ctx.drawImage(tmp, 0, 0);
  ctx.filter = 'none';
  return { canvas, rectangle: Cesium.Rectangle.fromDegrees(west, south, east, north) };
}

export function clearCache() { grids.clear(); }

