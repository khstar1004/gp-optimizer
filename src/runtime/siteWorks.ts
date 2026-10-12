// @ts-nocheck
/**
 * 부지 일체화 — 정지 비탈면 · 접근로 · 외곽 울타리 · 축척 피규어
 *
 * ══ 왜 필요했나 ══
 *
 * 시설 3D 를 세 번 고도화했는데도 넓은 시야에서 「만든 티」가 가시지 않았다. 근접에서
 * 확인해 보니 셸·재질·조명은 멀쩡했다. 문제는 건물이 아니라 **건물 사이**였다.
 *
 *   ① 시설마다 직각 콘크리트 판이 지형 위에 **떠 있었다**. `fac_stem.glb` 는 정지
 *      마감고에서 최저 지반까지 통째로 내려가는 상자다. 경사지에서는 그게 4~20m 짜리
 *      수직 옹벽 네 면이 된다 — 실제 토목은 그렇게 하지 않는다. 그 높이면 **비탈면을
 *      깎고 쌓지**, 콘크리트로 세우지 않는다.
 *   ② 시설을 잇는 것이 없었다. 접근로 기능은 있었지만 **분석용 폴리라인**이라
 *      화면에서는 공중에 뜬 색 선이었다.
 *   ③ 사람도 차도 없었다. 14m 짜리 동과 40m 짜리 동이 눈으로 구분되지 않는다.
 *
 * ══ 무엇을 하는가 ══
 *
 * 정지 비탈면  풋프린트 둘레를 따라 바깥으로 행진하며 **1:1.5 배수경사가 자연 지반과
 *              만나는 점(비탈끝)** 을 찾아 스커트 메시를 만든다. 절토 쪽은 지반이 이미
 *              높으므로 스커트가 0 이 되고, 성토 쪽만 흘러내린다. 12m 를 행진해도 못
 *              만나면 그 구간만 수직 옹벽으로 처리한다. 즉 **옹벽은 예외이고 비탈면이
 *              기본** — 순서가 반대였던 것이 원인이었다.
 * 접근로      MST 간선을 지형에 드레이프한 중심선에서 폭 4m 리본 메시를 뜬다. 노면
 *              텍스처(노견·차선·중앙 파선)를 진행 방향으로 반복시킨다.
 * 외곽 울타리  부지 경계 링을 지형 높이로 샘플해 WallGeometry 로 세우고 철망 알파
 *              텍스처를 입힌다. 접근로가 링을 지나는 지점에서 끊고 정문을 앉힌다.
 * 축척 피규어  현관·앞마당에 사람 몇, 앞마당에 차량 몇.
 *
 * 지형 높이는 GP 정밀지형(GLB 표면)이 켜져 있으면 그것을, 아니면 Cesium 전역 지형을
 * 쓴다. 둘 다 없으면 아무것도 그리지 않는다 — 높이를 모르면 접지도 도로도 거짓말이다.
 */
import { localMetersToLngLat, lngLatToLocalMeters } from '../../js/vendor/scaffolda/scaffolda.bundle';

const D = Cesium.Cartesian3.fromDegrees;

/** 배수경사 1:BATTER (수직 1 : 수평 BATTER). 1.5 는 성토 비탈면 상식값(약 34°). */
const BATTER = 1.5;
/** 비탈끝을 찾아 행진하는 최대 수평 거리. 이걸 넘으면 그 구간은 옹벽이다. */
const MAX_RUN_M = 26.0;
/** 옹벽으로 처리할 최대 높이 — 이보다 높으면 그냥 거기서 끊는다(지형에 묻힌다). */
const MAX_WALL_M = 9.0;
const ROAD_HALF_W = 2.1;          // 차도 반폭 (총 4.2m)
const FOOT_HALF_W = 0.9;          // 도보 전용 구간 반폭
const FENCE_H = 2.4;

const TEX = 'assets/textures/';
const MODELS = 'assets/models/';

/** 색 → Cesium.Color */
const css = (c) => Cesium.Color.fromCssColorString(c);

// ═══════════════════ 메시 조립 헬퍼 ═══════════════════

/**
 * 사각형 스트립(quad strip) → Primitive 하나.
 * rows: [[p0,p1,...], [q0,q1,...]] 두 줄의 Cartesian3. 같은 길이여야 한다.
 * st: 각 열의 (s) 값과 각 줄의 (t) 값을 주면 텍스처가 길이 방향으로 반복된다.
 */
function stripPrimitive(rowA, rowB, sVals, material, { tA = 0, tB = 1, twoSided = true } = {}) {
  const n = Math.min(rowA.length, rowB.length);
  if (n < 2) return null;
  const pos = new Float64Array(n * 6);
  const st = new Float32Array(n * 4);
  for (let i = 0; i < n; i++) {
    const a = rowA[i], b = rowB[i];
    pos[i * 6 + 0] = a.x; pos[i * 6 + 1] = a.y; pos[i * 6 + 2] = a.z;
    pos[i * 6 + 3] = b.x; pos[i * 6 + 4] = b.y; pos[i * 6 + 5] = b.z;
    st[i * 4 + 0] = tA; st[i * 4 + 1] = sVals[i];
    st[i * 4 + 2] = tB; st[i * 4 + 3] = sVals[i];
  }
  const idx = new Uint32Array((n - 1) * 6);
  for (let i = 0, k = 0; i < n - 1; i++) {
    const a0 = i * 2, b0 = i * 2 + 1, a1 = i * 2 + 2, b1 = i * 2 + 3;
    idx[k++] = a0; idx[k++] = b0; idx[k++] = b1;
    idx[k++] = a0; idx[k++] = b1; idx[k++] = a1;
  }
  const geometry = new Cesium.Geometry({
    attributes: {
      position: new Cesium.GeometryAttribute({
        componentDatatype: Cesium.ComponentDatatype.DOUBLE,
        componentsPerAttribute: 3, values: pos,
      }),
      st: new Cesium.GeometryAttribute({
        componentDatatype: Cesium.ComponentDatatype.FLOAT,
        componentsPerAttribute: 2, values: st,
      }),
    },
    indices: idx,
    primitiveType: Cesium.PrimitiveType.TRIANGLES,
    boundingSphere: Cesium.BoundingSphere.fromVertices(Array.from(pos)),
  });
  Cesium.GeometryPipeline.computeNormal(geometry);
  return new Cesium.Primitive({
    geometryInstances: new Cesium.GeometryInstance({ geometry }),
    appearance: new Cesium.MaterialAppearance({
      material,
      faceForward: twoSided,
      closed: false,
      translucent: material.translucent ?? false,
    }),
    asynchronous: false,
  });
}

/**
 * 여러 줄(row)을 한 장의 격자 메시로 — 프리미티브 하나.
 * rows: [[p...], [p...], ...] 바깥으로 내려가는 순서. 모두 같은 길이.
 * sVals: 열마다의 s(둘레 실거리) 값. t 는 줄 인덱스를 0..1 로 편다.
 */
function gridPrimitive(rows, sVals, material) {
  const R = rows.length, N = rows[0]?.length ?? 0;
  if (R < 2 || N < 2) return null;
  const pos = new Float64Array(R * N * 3);
  const st = new Float32Array(R * N * 2);
  for (let r = 0; r < R; r++) {
    for (let i = 0; i < N; i++) {
      const p = rows[r][i];
      const k = (r * N + i);
      pos[k * 3] = p.x; pos[k * 3 + 1] = p.y; pos[k * 3 + 2] = p.z;
      // (s, t) 순서에 주의. site_slope.png 는 **t 를 비탈면 종단**으로 그렸다
      // (t=0 어깨 연석, t=1 비탈끝 배수구, 아래로 갈수록 식생이 짙어진다).
      // 처음엔 s 에 줄 인덱스를 넣어서 그 종단 그라데이션이 비탈면을 타고 내려가는 대신
      // **둘레를 따라 돌았다** — 그래서 스커트가 흙이 아니라 균일한 회색 계단으로 보였다.
      st[k * 2] = sVals[i];          // s = 둘레 실거리
      st[k * 2 + 1] = r / (R - 1);   // t = 비탈면 종단 (어깨 → 비탈끝)
    }
  }
  const idx = new Uint32Array((R - 1) * (N - 1) * 6);
  let k = 0;
  for (let r = 0; r < R - 1; r++) {
    for (let i = 0; i < N - 1; i++) {
      const a = r * N + i, b = a + 1, c = a + N, d = c + 1;
      idx[k++] = a; idx[k++] = c; idx[k++] = d;
      idx[k++] = a; idx[k++] = d; idx[k++] = b;
    }
  }
  const geometry = new Cesium.Geometry({
    attributes: {
      position: new Cesium.GeometryAttribute({
        componentDatatype: Cesium.ComponentDatatype.DOUBLE,
        componentsPerAttribute: 3, values: pos,
      }),
      st: new Cesium.GeometryAttribute({
        componentDatatype: Cesium.ComponentDatatype.FLOAT,
        componentsPerAttribute: 2, values: st,
      }),
    },
    indices: idx,
    primitiveType: Cesium.PrimitiveType.TRIANGLES,
    boundingSphere: Cesium.BoundingSphere.fromVertices(Array.from(pos)),
  });
  Cesium.GeometryPipeline.computeNormal(geometry);
  return new Cesium.Primitive({
    geometryInstances: new Cesium.GeometryInstance({ geometry }),
    appearance: new Cesium.MaterialAppearance({
      material, faceForward: true, closed: false, translucent: false,
    }),
    asynchronous: false,
  });
}

// ═══════════════════ 본체 ═══════════════════

export class SiteWorks {
  /**
   * @param viewer  Cesium Viewer
   * @param deps    { placer, terrain, gpRef, siteRadiusM }
   */
  constructor(viewer, deps) {
    this.viewer = viewer;
    this.scene = viewer.scene;
    this.placer = deps.placer;
    this.terrain = deps.terrain;
    this.gpRef = deps.gpRef;
    this.siteRadiusM = deps.siteRadiusM ?? 450;
    this.prims = [];        // 생성한 Primitive
    this.models = [];       // 생성한 Model (피규어·정문)
    this.visible = { grading: true, roads: true, fence: true, figures: true };
    this._timer = null;
    this._token = 0;
    this._materials = null;
    this.ready = false;                 // 마지막 rebuild 가 끝났는가 (검증 하네스용)
    this.stats = { grading: 0, roads: 0, fence: 0, figures: 0, gate: 0 };
  }

  // ── 지형 높이 (GP 정밀지형 우선, 없으면 전역 지형) ──
  heightAt(lon, lat) {
    const rt = this.terrain;
    if (rt?.active && rt.surfaceReady) {
      const h = rt.surfaceHeightAt(lon, lat);
      if (Number.isFinite(h)) return h;
    }
    const g = this.scene.globe?.getHeight(Cesium.Cartographic.fromDegrees(lon, lat));
    return Number.isFinite(g) ? g : null;
  }

  hasTerrain() {
    return this.heightAt(this.gpRef.lon, this.gpRef.lat) !== null;
  }

  _mats() {
    if (this._materials) return this._materials;
    this._materials = {
      slope: new Cesium.Material({
        fabric: {
          type: 'DiffuseMap',
          uniforms: { image: TEX + 'site_slope.png', repeat: new Cesium.Cartesian2(1, 1) },
        },
      }),
      road: new Cesium.Material({
        fabric: {
          type: 'DiffuseMap',
          uniforms: { image: TEX + 'site_road.png', repeat: new Cesium.Cartesian2(1, 1) },
        },
      }),
      fence: new Cesium.Material({
        fabric: {
          type: 'DiffuseMap',
          uniforms: { image: TEX + 'site_chainlink.png', repeat: new Cesium.Cartesian2(1, 1) },
        },
        translucent: true,
      }),
    };
    return this._materials;
  }

  // ═══ ① 정지 비탈면 ═══

  /**
   * 시설 한 채의 정지 스커트.
   *
   * 풋프린트 둘레를 N 등분해, 각 점에서 **바깥 법선 방향으로 행진**하며 1:BATTER
   * 배수경사가 자연 지반과 만나는 곳을 찾는다. 절토 쪽은 첫 걸음에 이미 지반이
   * 높으므로 런이 0 이 되어 스커트가 생기지 않는다 — 그게 맞다. 성토 쪽만 흘러내린다.
   */
  _gradingFor(item) {
    const w = item.dims.widthM, d = item.dims.depthM;
    const padTop = item.groundH;
    const rad = ((item.headingDeg ?? 0) * Math.PI) / 180;
    const c = Math.cos(rad), s = Math.sin(rad);
    const origin = { lng: item.lon, lat: item.lat };
    // 시설 로컬(x,y) → 경위도. buildingModels/_matrix 와 같은 규약(정면 −Y).
    const toLL = (x, y) => localMetersToLngLat(x * c + y * s, -x * s + y * c, origin);

    const NPER = 12;                              // 한 변당 분할 수
    const ring = [];
    const push = (x, y, nx, ny) => ring.push({ x, y, nx, ny });
    for (let i = 0; i < NPER; i++) push(-w / 2 + (w * i) / NPER, -d / 2, 0, -1);
    for (let i = 0; i < NPER; i++) push(w / 2, -d / 2 + (d * i) / NPER, 1, 0);
    for (let i = 0; i < NPER; i++) push(w / 2 - (w * i) / NPER, d / 2, 0, 1);
    for (let i = 0; i < NPER; i++) push(-w / 2, d / 2 - (d * i) / NPER, -1, 0);
    ring.push({ ...ring[0] });

    /**
     * 한 점의 비탈면 종단 — (수평런 r, 표고 z) 폴리라인.
     *
     * 실무 그대로: 배수경사 1:1.5 로 내려가다 BENCH_H(5m) 마다 **소단** 1.5m 를 둔다.
     * 소단 없이 20m 를 한 면으로 흘리면 그건 비탈면이 아니라 그냥 벽이다 —
     * 첫 시도에서 실제로 그렇게 나왔고, 화면에서 검은 덩어리로 읽혔다.
     */
    const BENCH_H = 5.0, BENCH_W = 1.6, STEP = 0.5;
    const profileAt = (p) => {
      const pts = [{ r: 0, z: padTop }];
      let r = 0, z = padTop, sinceBench = 0;
      for (let guard = 0; guard < 400; guard++) {
        const ll = toLL(p.x + p.nx * r, p.y + p.ny * r);
        const h = this.heightAt(ll.lng, ll.lat);
        if (h === null) break;
        if (z <= h + 0.05) { pts.push({ r, z: h }); return pts; }   // 비탈끝 도달
        if (r >= MAX_RUN_M) {
          // 26m 를 나가도 못 만났다 = 급경사. 여기서 수직으로 지반까지 떨어뜨려 닫는다.
          // 안 닫으면 스커트 끝이 공중에 뜬 절벽이 되어 아래가 뚫려 보인다.
          pts.push({ r, z });
          pts.push({ r: r + 0.01, z: h });
          return pts;
        }
        if (sinceBench >= BENCH_H) {                                // 소단 (5m 마다)
          r += BENCH_W;
          sinceBench = 0;
          pts.push({ r, z });
          continue;
        }
        r += STEP;
        z -= STEP / BATTER;
        sinceBench += STEP / BATTER;
        pts.push({ r, z });
      }
      return pts;
    };

    // 모든 점의 종단을 같은 줄 수로 리샘플한다 (격자 메시를 만들려면 열 길이가 같아야 한다)
    const ROWS = 7;
    const profs = ring.map(profileAt);
    let maxDrop = 0;
    for (const pf of profs) maxDrop = Math.max(maxDrop, padTop - pf[pf.length - 1].z);
    if (maxDrop < 0.4) return null;                                 // 평지 — 스커트가 필요 없다

    const rows = [];
    for (let k = 0; k < ROWS; k++) rows.push([]);
    const sVal = [];
    let run = 0, prevLL = null;
    for (let i = 0; i < ring.length; i++) {
      const p = ring[i], pf = profs[i];
      const last = pf[pf.length - 1];
      for (let k = 0; k < ROWS; k++) {
        const t = k / (ROWS - 1);
        // 종단을 수평런 기준으로 균등 분할 — 소단이 있으면 그 구간이 자연히 완만해진다
        const rr = last.r * t;
        let z = last.z;
        for (let j = 1; j < pf.length; j++) {
          if (pf[j].r >= rr) {
            const a0 = pf[j - 1], b0 = pf[j];
            const u = b0.r > a0.r ? (rr - a0.r) / (b0.r - a0.r) : 0;
            z = a0.z + (b0.z - a0.z) * u;
            break;
          }
        }
        const ll = toLL(p.x + p.nx * rr, p.y + p.ny * rr);
        rows[k].push(D(ll.lng, ll.lat, z));
      }
      const llTop = toLL(p.x, p.y);
      if (prevLL) {
        const a0 = lngLatToLocalMeters(prevLL.lng, prevLL.lat, origin);
        const b0 = lngLatToLocalMeters(llTop.lng, llTop.lat, origin);
        run += Math.hypot(a0.x - b0.x, a0.y - b0.y);
      }
      prevLL = llTop;
      sVal.push(run / 6.0);                       // 6m 마다 텍스처 1 반복
    }
    return gridPrimitive(rows, sVal, this._mats().slope);
  }

  // ═══ ② 접근로 ═══

  /**
   * 접근로 그래프 — 감시탑을 허브로 시설을 최소신장트리(MST)로 잇고, 각 간선을
   * 지형에 드레이프한다.
   *
   * placement.ts 에도 같은 계산이 있지만 그쪽은 **GP 정밀지형이 켜져 있을 때만** 돈다
   * (통행 등급 판정이 GLB 표면 기준이라 그렇다). 물리 도로는 위성 지형에서도 깔려야
   * 하므로 여기서 자체 계산한다 — `heightAt` 이 두 지형을 모두 받아 준다.
   */
  _roadGraph() {
    const items = this.placer.items ?? [];
    const hub = { lon: this.gpRef.lon, lat: this.gpRef.lat };
    const nodes = [hub, ...items.map((it) => ({ lon: it.lon, lat: it.lat }))];
    if (nodes.length < 2) return [];
    const origin = { lng: hub.lon, lat: hub.lat };
    const P = nodes.map((n) => {
      const m = lngLatToLocalMeters(n.lon, n.lat, origin);
      return { ...n, x: m.x, y: m.y };
    });
    const N = P.length;
    const inTree = new Array(N).fill(false);
    const best = new Array(N).fill(Infinity);
    const parent = new Array(N).fill(-1);
    best[0] = 0;
    const mst = [];
    for (let k = 0; k < N; k++) {
      let u = -1;
      for (let v = 0; v < N; v++) if (!inTree[v] && (u < 0 || best[v] < best[u])) u = v;
      if (u < 0) break;
      inTree[u] = true;
      if (parent[u] >= 0) mst.push([parent[u], u]);
      for (let v = 0; v < N; v++) {
        if (inTree[v]) continue;
        const dd = Math.hypot(P[u].x - P[v].x, P[u].y - P[v].y);
        if (dd < best[v]) { best[v] = dd; parent[v] = u; }
      }
    }
    const edges = [];
    for (const [a, b] of mst) {
      const A = P[a], B = P[b];
      const distH = Math.hypot(A.x - B.x, A.y - B.y);
      if (distH < 2) continue;
      const steps = Math.max(2, Math.ceil(distH / 6));
      const pos = [];
      let maxDeg = 0, prevH = null, prevD = 0;
      let ok = true;
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const lon = A.lon + (B.lon - A.lon) * t;
        const lat = A.lat + (B.lat - A.lat) * t;
        const h = this.heightAt(lon, lat);
        if (h === null) { ok = false; break; }
        // 노면은 지반보다 살짝 위 — 0 이면 지형과 Z 다툼(z-fighting)으로 깜빡인다
        pos.push(D(lon, lat, h + 0.14));
        const seg = distH / steps;
        if (prevH !== null && seg > 0.01) {
          maxDeg = Math.max(maxDeg, (Math.atan2(Math.abs(h - prevH), seg) * 180) / Math.PI);
        }
        prevH = h; prevD += seg;
      }
      if (!ok || pos.length < 2) continue;
      edges.push({ pos, maxDeg, grade: { key: maxDeg > 17 ? 'foot' : 'veh' } });
    }
    return edges;
  }

  /** MST 간선 중심선 → 폭 4.2m 리본. 지형에 드레이프한 좌표를 그대로 쓴다. */
  _roadRibbon(edge) {
    const pos = edge.pos;
    if (!pos || pos.length < 2) return null;
    const half = edge.grade?.key === 'foot' ? FOOT_HALF_W : ROAD_HALF_W;
    const L = [], R = [], sV = [];
    let run = 0;
    for (let i = 0; i < pos.length; i++) {
      const p = pos[i];
      const a = pos[Math.max(0, i - 1)];
      const b = pos[Math.min(pos.length - 1, i + 1)];
      // 진행 방향과 지표 법선(ENU up)의 외적 = 노폭 방향
      const fwd = Cesium.Cartesian3.normalize(
        Cesium.Cartesian3.subtract(b, a, new Cesium.Cartesian3()), new Cesium.Cartesian3());
      const up = Cesium.Ellipsoid.WGS84.geodeticSurfaceNormal(p, new Cesium.Cartesian3());
      const side = Cesium.Cartesian3.normalize(
        Cesium.Cartesian3.cross(fwd, up, new Cesium.Cartesian3()), new Cesium.Cartesian3());
      const off = Cesium.Cartesian3.multiplyByScalar(side, half, new Cesium.Cartesian3());
      L.push(Cesium.Cartesian3.subtract(p, off, new Cesium.Cartesian3()));
      R.push(Cesium.Cartesian3.add(p, off, new Cesium.Cartesian3()));
      if (i > 0) run += Cesium.Cartesian3.distance(pos[i - 1], p);
      sV.push(run / 8.0);                          // 8m 마다 노면 텍스처 1 반복
    }
    return stripPrimitive(L, R, sV, this._mats().road, { tA: 0, tB: 1, twoSided: false });
  }

  // ═══ ③ 외곽 울타리 ═══

  _fence(gapAzDeg) {
    const { lon, lat } = this.gpRef;
    const N = 220;
    const pts = [], minH = [], maxH = [];
    const gapHalf = 6.0;                           // 정문 구간(도) — 여기서 링을 끊는다
    const runs = [];
    let cur = null;
    for (let i = 0; i <= N; i++) {
      const azDeg = (i / N) * 360;
      let dz = Math.abs(azDeg - gapAzDeg);
      if (dz > 180) dz = 360 - dz;
      const inGap = gapAzDeg !== null && dz < gapHalf;
      if (inGap) { if (cur) { runs.push(cur); cur = null; } continue; }
      const az = (azDeg * Math.PI) / 180;
      const ll = localMetersToLngLat(
        Math.sin(az) * this.siteRadiusM, Math.cos(az) * this.siteRadiusM, { lng: lon, lat });
      const h = this.heightAt(ll.lng, ll.lat);
      if (h === null) { if (cur) { runs.push(cur); cur = null; } continue; }
      if (!cur) cur = { pos: [], min: [], max: [] };
      cur.pos.push(Cesium.Cartesian3.fromDegrees(ll.lng, ll.lat, 0));
      cur.min.push(h - 0.4);                       // 지반에 살짝 박는다
      cur.max.push(h + FENCE_H);
    }
    if (cur) runs.push(cur);
    const out = [];
    for (const r of runs) {
      if (r.pos.length < 2) continue;
      const geom = Cesium.WallGeometry.createGeometry(new Cesium.WallGeometry({
        positions: r.pos, minimumHeights: r.min, maximumHeights: r.max,
        vertexFormat: Cesium.MaterialAppearance.MaterialSupport.TEXTURED.vertexFormat,
      }));
      if (!geom) continue;
      out.push(new Cesium.Primitive({
        geometryInstances: new Cesium.GeometryInstance({ geometry: geom }),
        appearance: new Cesium.MaterialAppearance({
          material: this._mats().fence, faceForward: true, translucent: true, closed: false,
        }),
        asynchronous: false,
      }));
    }
    return out;
  }

  // ═══ ④ 축척 피규어 ═══

  async _figures() {
    const out = [];
    const items = this.placer.items ?? [];
    const add = async (uri, lon, lat, h, headingDeg, scale = 1) => {
      const origin = Cesium.Cartesian3.fromDegrees(lon, lat, h);
      const enu = Cesium.Transforms.eastNorthUpToFixedFrame(origin);
      const rot = Cesium.Matrix4.fromRotationTranslation(
        Cesium.Matrix3.fromRotationZ(Cesium.Math.toRadians(180 - headingDeg)), Cesium.Cartesian3.ZERO);
      const m = Cesium.Matrix4.multiply(enu, rot, new Cesium.Matrix4());
      if (scale !== 1) Cesium.Matrix4.multiplyByUniformScale(m, scale, m);
      try {
        const model = await Cesium.Model.fromGltfAsync({ url: uri, modelMatrix: m });
        model.lightColor = new Cesium.Cartesian3(2.2, 2.2, 2.2);
        if (model.imageBasedLighting) {
          model.imageBasedLighting.imageBasedLightingFactor = new Cesium.Cartesian2(1.8, 1.8);
        }
        out.push(model);
      } catch (e) { console.warn('site figure load fail', uri, e); }
    };
    for (const it of items) {
      const rad = ((it.headingDeg ?? 0) * Math.PI) / 180;
      const c = Math.cos(rad), s = Math.sin(rad);
      const toLL = (x, y) => localMetersToLngLat(
        x * c + y * s, -x * s + y * c, { lng: it.lon, lat: it.lat });
      const seed = (it.uid ?? '').length * 7 + Math.round(it.dims.widthM);
      const rnd = (k) => {
        const v = Math.sin((seed + k) * 127.1 + 311.7) * 43758.5453;
        return v - Math.floor(v);
      };
      // 앞마당 두 사람 — 정면(−Y) 쪽, 대지 안
      const n = it.dims.widthM >= 24 ? 2 : 1;
      for (let i = 0; i < n; i++) {
        const x = (rnd(i * 3) - 0.5) * (it.dims.widthM * 0.5);
        const y = -it.dims.depthM / 2 + 2.0 + rnd(i * 5) * 2.5;
        const ll = toLL(x, y);
        await add(MODELS + (rnd(i * 11) < 0.5 ? 'fac_person_a.glb' : 'fac_person_b.glb'),
          ll.lng, ll.lat, it.groundH, (it.headingDeg ?? 0) + rnd(i * 13) * 340);
      }
      // 앞마당 차량 — 큰 대지에만
      if (it.dims.widthM >= 26 && rnd(31) < 0.75) {
        const ll = toLL(it.dims.widthM / 2 - 4.0, -it.dims.depthM / 2 + 4.0);
        await add(MODELS + (rnd(37) < 0.5 ? 'veh_sedan.glb' : 'veh_truck.glb'),
          ll.lng, ll.lat, it.groundH, (it.headingDeg ?? 0) + 90);
      }
    }
    return out;
  }

  // ═══ 조립 ═══

  /** 배치가 바뀌면 다시 만든다 (버스트는 debounce 로 1회 병합) */
  schedule() {
    if (this._timer) return;
    this._timer = setTimeout(() => { this._timer = null; this.rebuild(); }, 220);
  }

  async rebuild() {
    const token = ++this._token;
    this.ready = false;
    this._clear();
    this.stats = { grading: 0, roads: 0, fence: 0, figures: 0, gate: 0 };
    if (!this.hasTerrain()) { this.ready = true; return; }   // 높이를 모르면 그리지 않는다

    // ① 정지 비탈면
    if (this.visible.grading) {
      for (const it of this.placer.items ?? []) {
        const p = this._gradingFor(it);
        if (p) { this.scene.primitives.add(p); this.prims.push(p); this.stats.grading++; }
      }
    }
    // ② 접근로 — placer 가 이미 계산해 둔 MST 그래프를 그대로 쓴다
    let gateAz = null;
    if (this.visible.roads) {
      for (const e of this._roadGraph()) {
        const p = this._roadRibbon(e);
        if (p) { this.scene.primitives.add(p); this.prims.push(p); this.stats.roads++; }
      }
    }
    gateAz = this._gateAzimuth();
    // ③ 외곽 울타리 + 정문
    if (this.visible.fence) {
      for (const p of this._fence(gateAz)) {
        this.scene.primitives.add(p); this.prims.push(p); this.stats.fence++;
      }
      if (gateAz !== null) await this._placeGate(gateAz, token);
    }
    // ④ 축척 피규어
    if (this.visible.figures) {
      const figs = await this._figures();
      if (token !== this._token) { figs.forEach((m) => m.destroy?.()); return; }
      for (const m of figs) { this.scene.primitives.add(m); this.models.push(m); }
      this.stats.figures = figs.length;
    }
    if (token === this._token) this.ready = true;
  }

  /** 정문 방위 — 시설 무게중심의 반대편(바깥으로 나가는 쪽)에 낸다. */
  _gateAzimuth() {
    const items = this.placer.items ?? [];
    if (!items.length) return 180;
    const origin = { lng: this.gpRef.lon, lat: this.gpRef.lat };
    let sx = 0, sy = 0;
    for (const it of items) {
      const m = lngLatToLocalMeters(it.lon, it.lat, origin);
      sx += m.x; sy += m.y;
    }
    const az = (Math.atan2(sx, sy) * 180) / Math.PI;
    return ((az + 180) % 360 + 360) % 360;
  }

  async _placeGate(azDeg, token) {
    const az = (azDeg * Math.PI) / 180;
    const ll = localMetersToLngLat(
      Math.sin(az) * this.siteRadiusM, Math.cos(az) * this.siteRadiusM,
      { lng: this.gpRef.lon, lat: this.gpRef.lat });
    const h = this.heightAt(ll.lng, ll.lat);
    if (h === null) return;
    const origin = Cesium.Cartesian3.fromDegrees(ll.lng, ll.lat, h);
    const enu = Cesium.Transforms.eastNorthUpToFixedFrame(origin);
    // 정문 정면(−Y)이 바깥(방위 azDeg)을 보게 — 시설 규약과 동일
    const rot = Cesium.Matrix4.fromRotationTranslation(
      Cesium.Matrix3.fromRotationZ(Cesium.Math.toRadians(180 - azDeg)), Cesium.Cartesian3.ZERO);
    const m = Cesium.Matrix4.multiply(enu, rot, new Cesium.Matrix4());
    try {
      const model = await Cesium.Model.fromGltfAsync({ url: MODELS + 'site_gate.glb', modelMatrix: m });
      if (token !== this._token) { model.destroy?.(); return; }
      model.lightColor = new Cesium.Cartesian3(2.2, 2.2, 2.2);
      if (model.imageBasedLighting) {
        model.imageBasedLighting.imageBasedLightingFactor = new Cesium.Cartesian2(1.8, 1.8);
      }
      this.scene.primitives.add(model);
      this.models.push(model);
      this.stats.gate = 1;
    } catch (e) { console.warn('site gate load fail', e); }
  }

  setVisible(key, on) {
    this.visible[key] = on;
    this.schedule();
  }

  _clear() {
    for (const p of this.prims) { try { this.scene.primitives.remove(p); } catch { /* 이미 제거 */ } }
    for (const m of this.models) { try { this.scene.primitives.remove(m); } catch { /* 이미 제거 */ } }
    this.prims = [];
    this.models = [];
  }

  destroy() {
    this._token++;
    if (this._timer) { clearTimeout(this._timer); this._timer = null; }
    this._clear();
  }
}
