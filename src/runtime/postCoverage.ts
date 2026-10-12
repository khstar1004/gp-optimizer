// @ts-nocheck
/**
 * 배치 감시자산 합동 커버리지 엔진
 *
 * 「어디까지 볼 수 있는가」를 격자 한 장으로 답한다. 두 계산이 섞여 있는데, 둘의
 * 수명이 다르다는 것이 이 파일의 설계 전부다:
 *
 *   지형 가시선(LOS)  ← 초소 위치·관측고가 바뀔 때만 변한다.  **캐시**
 *   탐지확률 P(d)     ← 날씨가 바뀔 때마다 변한다.            **매번**
 *
 * 그래서 LOS 마스크를 초소별로 한 번 굽고, 날씨 스윕(6종 × 강도 3단 = 18회)은
 * 그 위에서 곱셈만 한다. 이 분리가 없으면 「눈이 오면 얼마나 줄어드나」를 보려고
 * 광선추적을 18번 다시 돌려야 한다.
 *
 * LOS 는 기존 마스터 가시격자(state.grid)를 DEM 으로 재사용한다 — 추가 지형
 * 샘플링 없이 순수 CPU. 음향·RF 는 비가시선 자산이라 LOS 를 묻지 않는다.
 */
import { SITE } from './data';
import { offset, distM, azimuthDeg, azDelta } from './geo';
import { losClear } from './siteOptimizer';
import { detectionProbability, atmosphereOf, effectiveRanges } from './sensorPerformance';
import { POST_TYPE } from './sensorPosts';
import { environmentState, WEATHER_ORDER, WEATHER_LABELS } from './environmentModel';

const NOLOS_BANDS = new Set(['acoustic', 'rf']);
const EARLY_WARNING_M = 1800;   // 조기경보선 — 여기 뚫리면 대응시간이 없다

/** 초소별 LOS 마스크 — 픽셀마다 (보이는가, 거리, 방위). */
interface LosMask {
  los: Uint8Array;
  dist: Float32Array;
  az: Float32Array;
}

/** SensorPostLayer.snapshot() 이 내는 배치 초소 하나 — 이 파일이 실제로 읽는 필드만. */
export interface SensorPostLike {
  uid: string;
  type: string;
  band: string;
  lon: number;
  lat: number;
  eyeH: number;
  fov: number;
  aimAz: number;
  perf?: { range: number; dri: [number, number, number] } | null;
}

interface ScoreResult {
  p: Float32Array;
  joint: number;
  covered: number;
  perPost: Array<{ uid: string; solo: number }>;
  cells: number;
}

export class CoverageEngine {
  // 필드 타입 선언 — 이 파일은 @ts-nocheck(아래 본문은 검사 안 함)라 클래스 인스턴스
  // 모양이 생성자 본문만으로는(TS 는 생성자에서 호출한 다른 메서드의 `this.x=` 대입까지는
  // 안 따라간다) 추론되지 않는다. 그러면 이 클래스를 쓰는 (검사되는) 다른 파일에서
  // `engine.masks`/`engine.n` 등에 전부 "Property does not exist" 가 난다 — 선언만
  // 얹어서 외부 소비자에게는 정확한 타입을 주고, 내부 구현은 그대로 느슨하게 둔다.
  grid: unknown;
  size: number;
  masks: Map<string, LosMask>;
  n: number;
  idx: Int32Array;
  lon: Float64Array;
  lat: Float64Array;
  d0: Float32Array;
  az0: Float32Array;
  feather: Float32Array;
  north: number;
  south: number;
  east: number;
  west: number;

  /**
   * @param grid  ViewshedGrid (DEM 겸용)
   * @param size  격자 한 변 픽셀 수 (LOS 광선추적 비용이 여기에 제곱으로 붙는다)
   */
  constructor(grid, size = 176) {
    this.grid = grid;
    this.size = size;
    this.masks = new Map();      // sig → { los: Uint8Array, dist: Float32Array, az: Float32Array }
    this._buildPixels();
  }

  static sigOf(post) {
    return `${post.type}|${post.lon.toFixed(6)}|${post.lat.toFixed(6)}|${post.eyeH.toFixed(1)}`;
  }

  /** 책임구역 안의 픽셀만 추려 평평한 배열로 — 부채꼴 밖은 계산하지 않는다. */
  _buildPixels() {
    const { sector } = SITE;
    const g = this.grid;
    const maxR = sector.maxR + 200;
    this.north = offset(g.lon, g.lat, 0, maxR).lat;
    this.south = offset(g.lon, g.lat, 180, maxR).lat;
    this.east = offset(g.lon, g.lat, 90, maxR).lon;
    this.west = offset(g.lon, g.lat, 270, maxR).lon;

    const S = this.size;
    const idx = [], lonA = [], latA = [], d0A = [], az0A = [], featherA = [];
    for (let py = 0; py < S; py++) {
      const plat = this.north + (this.south - this.north) * (py / (S - 1));
      for (let px = 0; px < S; px++) {
        const plon = this.west + (this.east - this.west) * (px / (S - 1));
        const d0 = distM(g.lon, g.lat, plon, plat);
        if (d0 < sector.minR || d0 > sector.maxR) continue;
        const az0 = azimuthDeg(g.lon, g.lat, plon, plat);
        const angEdge = sector.halfAngle - Math.abs(azDelta(az0, sector.centerAz));
        if (angEdge < 0) continue;
        const radEdge = Math.min(d0 - sector.minR, sector.maxR - d0);
        idx.push(py * S + px);
        lonA.push(plon); latA.push(plat); d0A.push(d0); az0A.push(az0);
        featherA.push(Math.min(1, angEdge / 6) * Math.min(1, radEdge / 220));
      }
    }
    this.n = idx.length;
    this.idx = Int32Array.from(idx);
    this.lon = Float64Array.from(lonA);
    this.lat = Float64Array.from(latA);
    this.d0 = Float32Array.from(d0A);
    this.az0 = Float32Array.from(az0A);
    this.feather = Float32Array.from(featherA);
  }

  /**
   * 초소별 LOS 마스크를 굽는다 (없는 것만). 무거우므로 진행률을 흘린다.
   * @param posts SensorPostLayer.snapshot()
   */
  async build(posts: SensorPostLike[], onProgress?: (frac: number) => void): Promise<void> {
    const live = new Set();
    for (let k = 0; k < posts.length; k++) {
      const p = posts[k];
      const sig = CoverageEngine.sigOf(p);
      live.add(sig);
      if (this.masks.has(sig)) continue;
      const los = new Uint8Array(this.n);
      const dist = new Float32Array(this.n);
      const az = new Float32Array(this.n);
      const noLos = NOLOS_BANDS.has(p.band);
      const specMax = POST_TYPE[p.type]?.dri?.[0] ?? 3000;
      for (let i = 0; i < this.n; i++) {
        const d = distM(p.lon, p.lat, this.lon[i], this.lat[i]);
        dist[i] = d;
        az[i] = azimuthDeg(p.lon, p.lat, this.lon[i], this.lat[i]);
        if (d > specMax) continue;                       // 청천 제원 밖은 영원히 밖이다
        los[i] = noLos || losClear(this.grid, p.lon, p.lat, p.eyeH, this.lon[i], this.lat[i]) ? 1 : 0;
      }
      this.masks.set(sig, { los, dist, az });
      onProgress?.((k + 1) / posts.length);
      await new Promise((r) => setTimeout(r, 0));         // UI 양보
    }
    // 사라진 초소의 마스크는 버린다
    for (const sig of [...this.masks.keys()]) if (!live.has(sig)) this.masks.delete(sig);
  }

  /**
   * 현재(또는 임의) 성능표로 합동 탐지확률 격자를 만든다.
   * @param posts  snapshot (perf 를 override 하려면 perfBy 사용)
   * @param perfBy uid → perf (없으면 posts[i].perf)
   * @returns { p: Float32Array(n), perPost: [{uid, solo}] }
   */
  score(posts: SensorPostLike[], perfBy: Record<string, { range: number; dri: [number, number, number] }> | null = null): ScoreResult {
    const p = new Float32Array(this.n);
    const solo = posts.map(() => 0);
    for (let k = 0; k < posts.length; k++) {
      const post = posts[k];
      const m = this.masks.get(CoverageEngine.sigOf(post));
      if (!m) continue;
      const perf = perfBy?.[post.uid] ?? post.perf;
      if (!perf || perf.range <= 0) continue;
      const half = post.fov / 2;
      let acc = 0;
      for (let i = 0; i < this.n; i++) {
        if (!m.los[i]) continue;
        const d = m.dist[i];
        if (d > perf.range) continue;
        if (post.fov < 360 && Math.abs(azDelta(m.az[i], post.aimAz)) > half) continue;
        const pd = detectionProbability(perf, d);
        if (pd <= 0) continue;
        acc += pd;
        p[i] = 1 - (1 - p[i]) * (1 - pd);
      }
      solo[k] = acc;
    }
    let sum = 0, cov = 0;
    for (let i = 0; i < this.n; i++) { sum += p[i]; if (p[i] >= 0.3) cov++; }
    return {
      p,
      joint: this.n ? sum / this.n : 0,
      covered: this.n ? cov / this.n : 0,
      perPost: posts.map((post, k) => ({ uid: post.uid, solo: this.n ? solo[k] / this.n : 0 })),
      cells: this.n,
    };
  }

  /** 한계기여 — 그 초소 하나를 빼면 합동 커버가 얼마나 떨어지는가. */
  marginal(posts: SensorPostLike[], perfBy: Record<string, { range: number; dri: [number, number, number] }> | null = null): Array<{ uid: string; marginal: number }> {
    const base = this.score(posts, perfBy).joint;
    return posts.map((post) => {
      const without = posts.filter((q) => q.uid !== post.uid);
      const j = without.length ? this.score(without, perfBy).joint : 0;
      return { uid: post.uid, marginal: Math.max(0, base - j) };
    });
  }

  /** 조기경보선(≤1.8km) 방위 5° 빈별 합동 커버 — 사각 구간 보고. */
  gaps(scored: { p: Float32Array }, threshold = 0.25): Array<{ from: number; to: number }> {
    const bins = new Map();
    for (let i = 0; i < this.n; i++) {
      if (this.d0[i] > EARLY_WARNING_M) continue;
      const b = Math.round(azDelta(this.az0[i], SITE.sector.centerAz) / 5) * 5;
      const cur = bins.get(b) ?? { s: 0, c: 0 };
      cur.s += scored.p[i]; cur.c++;
      bins.set(b, cur);
    }
    const weak = [...bins.entries()]
      .filter(([, v]) => v.c > 0 && v.s / v.c < threshold)
      .map(([b]) => (SITE.sector.centerAz + b + 360) % 360)
      .sort((a, b) => a - b);
    // 연속 방위를 구간으로 접는다
    const out = [];
    for (const a of weak) {
      const last = out[out.length - 1];
      if (last && (a - last.to + 360) % 360 <= 6) last.to = a;
      else out.push({ from: a, to: a });
    }
    return out;
  }

  /** 합동 커버 격자 → 지도 드레이프 캔버스 */
  raster(scored, upscale = 3) {
    const S = this.size;
    const small = document.createElement('canvas');
    small.width = S; small.height = S;
    const sctx = small.getContext('2d');
    const img = sctx.createImageData(S, S);
    const data = img.data;
    for (let i = 0; i < this.n; i++) {
      const o = this.idx[i] * 4;
      const v = scored.p[i];
      const A = (base) => Math.round(base * this.feather[i]);
      if (v >= 0.65) { data[o] = 34; data[o + 1] = 214; data[o + 2] = 238; data[o + 3] = A(140); }
      else if (v >= 0.35) { data[o] = 61; data[o + 1] = 214; data[o + 2] = 140; data[o + 3] = A(118); }
      else if (v >= 0.12) { data[o] = 252; data[o + 1] = 196; data[o + 2] = 48; data[o + 3] = A(96); }
      else { data[o] = 225; data[o + 1] = 52; data[o + 2] = 68; data[o + 3] = A(104); }
    }
    sctx.putImageData(img, 0, 0);
    const big = document.createElement('canvas');
    big.width = S * upscale; big.height = S * upscale;
    const bctx = big.getContext('2d');
    bctx.imageSmoothingEnabled = true;
    bctx.imageSmoothingQuality = 'high';
    bctx.filter = 'blur(1.5px)';
    bctx.drawImage(small, 0, 0, big.width, big.height);
    bctx.filter = 'none';
    return {
      canvas: big,
      rectangle: Cesium.Rectangle.fromDegrees(this.west, this.south, this.east, this.north),
    };
  }

  /**
   * 날씨 스윕 — 같은 배치를 6종 날씨 × 강도 3단으로 돌려 유효거리와 합동 커버를 표로.
   * LOS 마스크를 재사용하므로 광선추적은 한 번도 다시 돌지 않는다.
   *
   * @param posts snapshot
   * @param site  { latitude, longitude, utcOffsetHours }
   * @param base  현재 environment settings (dayOfYear/minuteOfDay/windMps 유지)
   */
  weatherSweep(
    posts: SensorPostLike[],
    site: { latitude: number; longitude: number; utcOffsetHours: number },
    base: Record<string, unknown>,
    intensities: number[] = [0.25, 0.6, 1.0],
  ) {
    const rows = [];
    for (const w of WEATHER_ORDER) {
      for (const it of intensities) {
        const env = environmentState({ ...base, weather: w, intensity: it }, site);
        const atm = atmosphereOf(env);
        const illuminated = posts.some((p) => p.type === 'flare');
        const perfBy = {};
        for (const p of posts) {
          const t = POST_TYPE[p.type];
          // 발전기는 보는 장비가 아니다 — 커버리지 합에 넣으면 없는 눈이 생긴다
          if (!t || t.genW) continue;
          perfBy[p.uid] = effectiveRanges({ band: t.band, dri: t.dri, fov: t.fov }, atm, {
            illuminated: illuminated && (t.band === 'vis' || t.band === 'eye'),
          });
        }
        const sc = this.score(posts, perfBy);
        // 레이더·재머를 뺀 커버 — 합동 수치는 전천후 자산 하나에 떠받쳐져 둔감해진다.
        // 「눈이 오면 얼마나 안 보이나」의 체감은 광학·화기 쪽에서 나온다.
        const optical = posts.filter((p) => p.band !== 'radar' && p.band !== 'rf');
        const scOpt = optical.length ? this.score(optical, perfBy) : { joint: 0 };
        rows.push({
          weather: w, label: WEATHER_LABELS[w], intensity: it,
          visibilityMeters: env.weather.visibilityMeters,
          lux: env.illuminanceLux,
          snowCover: env.ground.snowCover,
          temperatureC: env.temperatureC,
          joint: sc.joint, covered: sc.covered,
          jointOptical: scOpt.joint, nOptical: optical.length,
          perfBy,
        });
      }
    }
    return rows;
  }
}

/**
 * 침투 축선이 커버 밖으로 지나는 구간 — 「어디로 들어오면 안 보이는가」.
 * @param engine CoverageEngine (마스크 완료)
 * @param scored score() 결과
 * @param routes [{ id, name, color, pts:[{lon,lat,cumM}] }]
 */
export function routeExposure(
  engine: CoverageEngine,
  scored: { p: Float32Array },
  routes: Array<{ id: string; name: string; color: string; pts?: Array<{ lon: number; lat: number; cumM?: number }> }>,
) {
  const S = engine.size;
  // 픽셀 → 격자 조회를 위한 역인덱스
  const lookup = new Float32Array(S * S).fill(-1);
  for (let i = 0; i < engine.n; i++) lookup[engine.idx[i]] = scored.p[i];
  const gW = engine.east - engine.west, gH = engine.south - engine.north;
  const at = (lon, lat) => {
    const px = Math.round(((lon - engine.west) / gW) * (S - 1));
    const py = Math.round(((lat - engine.north) / gH) * (S - 1));
    if (px < 0 || px >= S || py < 0 || py >= S) return -1;
    return lookup[py * S + px];
  };
  return routes.map((r) => {
    const pts = r.pts ?? [];
    let seen = 0, tot = 0, darkM = 0;
    let firstDetectM = null, firstDetectRangeM = null, lastDarkM = 0, worstDark = 0;
    let prevCum = pts[0]?.cumM ?? 0;
    for (const q of pts) {
      const seg = Math.max(0, (q.cumM ?? 0) - prevCum);
      prevCum = q.cumM ?? 0;
      const v = at(q.lon, q.lat);
      if (v < 0) continue;
      tot += seg;
      if (v >= 0.3) {
        seen += seg;
        if (firstDetectM === null) {
          firstDetectM = q.cumM ?? 0;
          // 축선 진행거리보다 **GP 까지 남은 거리**가 대응시간을 정한다
          firstDetectRangeM = distM(SITE.gp.lon, SITE.gp.lat, q.lon, q.lat);
        }
        lastDarkM = 0;
      } else {
        darkM += seg;
        lastDarkM += seg;
        // 가장 긴 연속 사각 구간 — 여기가 침투자가 붙는 자리다
        if (lastDarkM > worstDark) worstDark = lastDarkM;
      }
    }
    return {
      id: r.id, name: r.name, color: r.color,
      exposure: tot ? seen / tot : 0,
      darkM, totalM: tot, worstDarkM: worstDark,
      firstDetectM, firstDetectRangeM,
    };
  });
}
