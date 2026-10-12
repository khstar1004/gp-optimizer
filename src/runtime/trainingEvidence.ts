// @ts-nocheck
/**
 * Synthetic KCTC/Warrior Platform evidence workspace.
 *
 * This is intentionally a front-end mock seam: the map and recommendation
 * contracts are the same shape an authenticated adapter can populate later.
 * No person-level identities or raw tracks are displayed.
 */
import {
  DEFAULT_TRAINING_EVIDENCE,
  normalizeTrainingEvidence,
  trainingEvidenceFingerprint,
  validateTrainingEvidence,
} from '../domain/trainingEvidenceContract';
import { SITE } from './data';
import { offset, distM, resamplePath } from './geo';

const $ = (selector) => document.querySelector(selector);
const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmtSec = (seconds) => `${Math.floor(seconds / 60)}분 ${String(Math.round(seconds % 60)).padStart(2, '0')}초`;
const pct = (value) => `${Math.round(Number(value ?? 0))}%`;
const LAYERS = {
  loss: {
    label: '훈련손실 집중', color: '#ff4d6d', icon: '◉', hint: '노출·훈련손실이 반복된 격자',
    legend: '격자 기둥의 높이·색이 훈련손실률에 비례 · 흰 점 = 구역 내 최고 집중 지점',
    ramp: ['#2a2130', '#ffb020', '#ff4d6d', '#ff1f4b'],
  },
  assembly: {
    label: '집결·정체', color: '#ffb020', icon: '◆', hint: '인원이 모이고 오래 머문 격자',
    legend: '원 크기 = 최대 집결 인원 · 점 개수 = 인원 표식 · 파동 링 = 정체 반복도',
    ramp: ['#3a2f1a', '#ffb020'],
  },
  delay: {
    label: '대응·후송 지연', color: '#a78bfa', icon: '◇', hint: '대응 또는 후송 시간이 길어진 구간',
    legend: 'GP→구역 경로의 색·굵기가 후송 소요시간에 비례 · 점선 원 = GP 기준 대응시간대',
    ramp: ['#7cff6b', '#ffb020', '#ff4d6d'],
  },
  comms: {
    label: '통신 단절', color: '#33d6c5', icon: '⌁', hint: '훈련 중 연결이 끊긴 구간',
    legend: '반투명 돔 크기·끊긴 점선이 통신 단절시간에 비례',
    ramp: ['#173a37', '#33d6c5'],
  },
  routes: {
    label: '이동 경로 밀집', color: '#4da6ff', icon: '→', hint: '워리어플랫폼이 많이 오간 이동로',
    legend: '바닥 발광 = 커널 밀도 기반 실제 통행 밀도 · 선의 글로우 = 주요 이동로 반복 횟수 · 흐르는 점 = 이동 방향',
    ramp: ['#0a1626', '#1f6fae', '#33d6c5', '#ffd166', '#ffffff'],
  },
};

function color(value, alpha = 1) {
  return Cesium.Color.fromCssColorString(value).withAlpha(alpha);
}

/** Multi-stop linear color ramp, t in [0,1]. */
function rampColor(stops, t) {
  const clamped = Math.min(1, Math.max(0, Number(t) || 0));
  const n = stops.length - 1;
  const scaled = clamped * n;
  const i = Math.min(n - 1, Math.floor(scaled));
  const localT = scaled - i;
  const a = Cesium.Color.fromCssColorString(stops[i]);
  const b = Cesium.Color.fromCssColorString(stops[i + 1]);
  return Cesium.Color.lerp(a, b, localT, new Cesium.Color());
}

const _iconCache = new Map();
/** A small glowing circular badge with a glyph, canvas-rendered and cached so
 * repeated calls with the same (hex, glyph) reuse one data URL/billboard image. */
function glyphBadge(hex, glyph, size = 64) {
  const key = `${hex}:${glyph}:${size}`;
  if (_iconCache.has(key)) return _iconCache.get(key);
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const c = size / 2;
  const glow = ctx.createRadialGradient(c, c, 0, c, c, c);
  glow.addColorStop(0, hex);
  glow.addColorStop(0.6, hex);
  glow.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(c, c, c * 0.95, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(c, c, c * 0.56, 0, Math.PI * 2);
  ctx.fillStyle = '#0b0f14';
  ctx.fill();
  ctx.lineWidth = size * 0.05;
  ctx.strokeStyle = hex;
  ctx.stroke();
  ctx.fillStyle = '#ffffff';
  ctx.font = `700 ${size * 0.42}px "Segoe UI", "Pretendard GOV", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(glyph, c, c + size * 0.02);
  const url = canvas.toDataURL('image/png');
  _iconCache.set(key, url);
  return url;
}

let _glowDiscTexture = null;
/** Soft white radial-gradient disc, fully transparent at the edge — the one
 * shared texture behind every movement-density glow cell. Each cell tints it
 * via ImageMaterialProperty.color instead of generating its own bitmap, so
 * hundreds of glow cells cost one canvas draw, not hundreds. */
function glowDiscTexture() {
  if (_glowDiscTexture) return _glowDiscTexture;
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const c = size / 2;
  const gradient = ctx.createRadialGradient(c, c, 0, c, c, c);
  gradient.addColorStop(0, 'rgba(255,255,255,1)');
  gradient.addColorStop(0.35, 'rgba(255,255,255,0.65)');
  gradient.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  _glowDiscTexture = canvas.toDataURL('image/png');
  return _glowDiscTexture;
}

/** Position at fraction t (0..1) along a 2-segment lon/lat route, weighted by
 * each segment's true ground distance so travel along it reads at a roughly
 * constant pace rather than jumping proportionally to raw coordinate deltas. */
function pointAlongRoute(a, b, c, t) {
  const d1 = distM(a.lon, a.lat, b.lon, b.lat);
  const d2 = distM(b.lon, b.lat, c.lon, c.lat);
  const total = d1 + d2;
  if (!(total > 0)) return { lon: c.lon, lat: c.lat };
  const target = Math.min(1, Math.max(0, t)) * total;
  if (target <= d1) {
    const segT = d1 > 0 ? target / d1 : 0;
    return { lon: a.lon + (b.lon - a.lon) * segT, lat: a.lat + (b.lat - a.lat) * segT };
  }
  const segT = d2 > 0 ? (target - d1) / d2 : 0;
  return { lon: b.lon + (c.lon - b.lon) * segT, lat: b.lat + (c.lat - b.lat) * segT };
}

/** Same idea as pointAlongRoute() but for an arbitrary-length waypoint chain
 * (a movement segment's full walked path, not just a 2-leg GP route). */
function pointAlongPath(points, t) {
  if (points.length < 2) return points[0] ?? { lon: 0, lat: 0 };
  const segLens = [];
  let total = 0;
  for (let i = 0; i < points.length - 1; i += 1) {
    const d = distM(points[i].lon, points[i].lat, points[i + 1].lon, points[i + 1].lat);
    segLens.push(d);
    total += d;
  }
  if (!(total > 0)) return points[points.length - 1];
  let remaining = Math.min(1, Math.max(0, t)) * total;
  for (let i = 0; i < segLens.length; i += 1) {
    if (remaining <= segLens[i] || i === segLens.length - 1) {
      const segT = segLens[i] > 0 ? remaining / segLens[i] : 0;
      const a = points[i];
      const b = points[i + 1];
      return { lon: a.lon + (b.lon - a.lon) * segT, lat: a.lat + (b.lat - a.lat) * segT };
    }
    remaining -= segLens[i];
  }
  return points[points.length - 1];
}

export class TrainingEvidenceLayer {
  constructor(viewer, opts = {}) {
    this.viewer = viewer;
    this.toast = opts.toast ?? (() => {});
    this.switchTab = opts.switchTab ?? (() => {});
    this.onGeneratePlan = opts.onGeneratePlan ?? (() => {});
    this.onChange = opts.onChange ?? (() => {});
    this.isBlocked = opts.isBlocked ?? (() => false);
    this.flyTo = opts.flyTo ?? (() => {});
    this.getRealTerrain = opts.getRealTerrain ?? (() => null);
    this.data = normalizeTrainingEvidence(DEFAULT_TRAINING_EVIDENCE);
    this.loaded = false;
    this.layerId = 'loss';
    this.sessionLimit = this.data.sessions;
    this.selectedHotspotId = null;
    this.selectedCandidates = new Map();
    this.derived = false;
    this.appliedPlan = null;
    this.ds = new Cesium.CustomDataSource('training-evidence');
    viewer.dataSources.add(this.ds);
    this.handler = new Cesium.ScreenSpaceEventHandler(viewer.canvas);
    this.handler.setInputAction((event) => this._pick(event.position), Cesium.ScreenSpaceEventType.LEFT_CLICK);
    // The scene uses requestRenderMode (renders only on demand). Every layer
    // now carries at least one live CallbackProperty element (ripples, a
    // breathing dead-zone, a crawling response marker, the selection
    // reticle), so pump renders whenever training data is loaded and its
    // page is actually visible; stop the moment either stops being true.
    this._animHandle = null;
    window.addEventListener('gp:tab-active', (event) => {
      if (event.detail === 'training') {
        this._ensureAnimationPump();
        this._updateMapLegend();
      } else {
        // #map-legend is a shared HUD element other map features also write
        // to — leaving the training tab releases it instead of leaving our
        // stale numbers showing over whatever the operator looks at next.
        document.querySelector('#map-legend')?.classList.add('hidden');
      }
    });
  }

  _updateMapLegend() {
    // #map-legend is shared with other map features (GIS coverage, viewshed).
    // Only touch it while the training page is the one actually on screen,
    // so a background _draw() (e.g. restoring a saved plan on load) can't
    // clobber whatever another tab is currently showing there.
    const page = document.getElementById('page-training');
    if (!page?.classList.contains('active')) return;
    const el = document.querySelector('#map-legend');
    if (!el) return;
    if (!this.loaded) {
      el.classList.add('hidden');
      return;
    }
    const layer = LAYERS[this.layerId];
    const isRoutes = this.layerId === 'routes';
    const metric = this.layerId === 'loss'
      ? (h) => h.trainingLossRate
      : this.layerId === 'assembly'
        ? (h) => h.maxAssembly
        : this.layerId === 'delay'
          ? (h) => h.responseP90Sec
          : isRoutes
            ? (segment) => segment.traversals
            : (h) => h.commsGapSec;
    const values = (isRoutes ? this.data.movementSegments : this.data.hotspots).map(metric);
    const lo = Math.min(...values);
    const hi = Math.max(...values);
    const fmtValue = this.layerId === 'loss'
      ? (v) => `${v.toFixed(1)}/100인시`
      : this.layerId === 'assembly'
        ? (v) => `${Math.round(v)}명`
        : isRoutes
          ? (v) => `${Math.round(v)}회 통행`
          : fmtSec;
    el.innerHTML = `<div class="lg-head">${esc(layer.icon)} ${esc(layer.label)}</div>
      <div class="lg-body">
        <div class="lg-row"><span class="lg-sw" style="background:${layer.ramp[0]}"></span>낮음 · ${esc(fmtValue(lo))}</div>
        <div class="lg-row"><span class="lg-sw" style="background:${layer.ramp[layer.ramp.length - 1]}"></span>높음 · ${esc(fmtValue(hi))}</div>
        <div class="lg-row" style="color:var(--muted)">${esc(layer.legend)}</div>
      </div>`;
    el.classList.remove('hidden');
  }

  _ensureAnimationPump() {
    if (!this.loaded || this._animHandle != null) return;
    const tick = () => {
      const page = document.getElementById('page-training');
      if (page?.classList.contains('active') && this.loaded) {
        this.viewer.scene.requestRender();
        this._animHandle = requestAnimationFrame(tick);
      } else {
        this._animHandle = null;
      }
    };
    this._animHandle = requestAnimationFrame(tick);
  }

  /**
   * 이 레이어의 모든 지물은 Cesium 의 `HeightReference.CLAMP/RELATIVE_TO_GROUND` 로
   * 표고를 잡아 왔다. 그런데 Cesium `Scene.prototype.getHeight()`(라이브러리 소스 확인)는
   * `globe.show === true` 일 때만 지형고를 반환하고, 3D Tileset 이 아닌 일반 `Model`
   * (GP 블렌더 GLB)은 애초에 후보로 보지도 않는다 — GP 정밀지형(diorama, globe.show=false)
   * 표출 중에는 이 레이어 전체가 절대 갱신되지 않고 마지막 값(최악의 경우 최초 지정한
   * 타원체 기준 리터럴 고도, 즉 지표 위 2~8m)에 멈춘 채 붕 뜬다 — placement.ts _ground,
   * walk.ts groundHeightAt 와 같은 계열의 결함이다. 그래서 GP 표출 중에는 heightReference
   * 에 기대지 않고 `realTerrain.surfaceHeightAt()` 로 직접 절대고도를 계산해 박아 넣는다.
   */
  _z(lon, lat, relH = 0) {
    const rt = this.getRealTerrain?.();
    if (rt?.active && rt?.surfaceReady) {
      const h = rt.surfaceHeightAt(lon, lat);
      if (Number.isFinite(h)) return h + relH;
    }
    return relH;
  }

  /** point/billboard/label/ellipse 용 heightReference — _z() 와 항상 짝을 맞춰 쓴다. */
  _href() {
    const rt = this.getRealTerrain?.();
    return (rt?.active && rt?.surfaceReady) ? Cesium.HeightReference.NONE : Cesium.HeightReference.RELATIVE_TO_GROUND;
  }

  /** rectangle 기저면용 heightReference (CLAMP_TO_GROUND 대응). */
  _hrefClamp() {
    const rt = this.getRealTerrain?.();
    return (rt?.active && rt?.surfaceReady) ? Cesium.HeightReference.NONE : Cesium.HeightReference.CLAMP_TO_GROUND;
  }

  /** polyline.clampToGround 대응 — 절대고도를 직접 넣을 땐 GPU 지형 클램프가 필요 없다. */
  _clampPoly() {
    const rt = this.getRealTerrain?.();
    return !(rt?.active && rt?.surfaceReady);
  }

  get selectedHotspot() {
    return this.data.hotspots.find((hotspot) => hotspot.id === this.selectedHotspotId) ?? null;
  }

  get selectedNeeds() {
    return this.selectedHotspot?.facilityNeeds ?? [];
  }

  getPlanReference() {
    if (!this.loaded) return null;
    return {
      datasetId: this.data.datasetId,
      fingerprint: trainingEvidenceFingerprint(this.data),
      synthetic: this.data.synthetic,
      hotspotId: this.selectedHotspotId,
      derivedNeedIds: this.derived ? this.selectedNeeds.map((need) => need.id) : [],
      sessionLimit: this.sessionLimit,
    };
  }

  getReportContext() {
    if (!this.loaded || !this.selectedHotspot || !this.derived) return null;
    return {
      dataset: this.data,
      datasetId: this.data.datasetId,
      fingerprint: trainingEvidenceFingerprint(this.data),
      sessionLimit: this.sessionLimit,
      hotspot: this.selectedHotspot,
      needs: this.selectedNeeds.map((need) => ({
        ...need,
        selectedCandidate: this.selectedCandidates.get(need.id) ?? need.candidates[0],
      })),
    };
  }

  restorePlanReference(reference) {
    if (!reference || reference.datasetId !== this.data.datasetId) return;
    this.loaded = true;
    this.selectedHotspotId = reference.hotspotId ?? this.data.hotspots[0]?.id ?? null;
    this.sessionLimit = Math.min(this.data.sessions, Math.max(1, Number(reference.sessionLimit) || this.data.sessions));
    this.derived = Array.isArray(reference.derivedNeedIds) && reference.derivedNeedIds.length > 0;
    this._draw();
    this.render();
  }

  _applyDataset(input, preferredHotspotId = null) {
    this.data = normalizeTrainingEvidence(input);
    this.loaded = true;
    this.sessionLimit = this.data.sessions;
    const ids = this.data.hotspots.map((hotspot) => hotspot.id);
    this.selectedHotspotId = ids.includes(preferredHotspotId) ? preferredHotspotId : (ids[0] ?? null);
    this.derived = false;
    this.selectedCandidates.clear();
    this._draw();
    this.render();
    this.onChange();
  }

  loadMock() {
    this._applyDataset(DEFAULT_TRAINING_EVIDENCE, 'H-07');
    this.toast(`합성 KCTC 데이터 수신 완료 · ${this.data.sessions}회 훈련 · 반복 취약구역 ${this.data.hotspots.length}곳`, 5200);
  }

  async importFile(file) {
    if (!file) return;
    try {
      const parsed = JSON.parse(await file.text());
      const payload = parsed?.dataset && typeof parsed.dataset === 'object' ? parsed.dataset : parsed;
      const validation = validateTrainingEvidence(payload);
      if (!validation.ok) {
        this.toast(`훈련근거 JSON 거부 · ${validation.errors.slice(0, 2).join(' · ')}`, 5600);
        return;
      }
      this._applyDataset(payload);
      this.toast(`훈련근거 JSON 적용 · ${this.data.sessions}회 훈련 · ${this.data.hotspots.length}곳`, 5200);
    } catch (error) {
      console.warn('[training-evidence] import failed', error);
      this.toast(`훈련근거 JSON 읽기 실패 · ${error?.message ?? 'JSON 형식을 확인하세요'}`, 5200);
    }
  }

  exportCurrent() {
    if (!this.loaded) return;
    const blob = new Blob([JSON.stringify(this.data, null, 2)], { type: 'application/json' });
    const anchor = document.createElement('a');
    anchor.href = URL.createObjectURL(blob);
    anchor.download = `gp-digital-twin-training-evidence-${this.data.datasetId}.json`;
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(anchor.href), 4000);
    this.toast(`훈련근거 JSON 내보내기 · fingerprint ${trainingEvidenceFingerprint(this.data)}`, 4600);
  }

  clear() {
    this.loaded = false;
    this.selectedHotspotId = null;
    this.derived = false;
    this.selectedCandidates.clear();
    this.ds.entities.removeAll();
    this.render();
    this.onChange();
  }

  selectHotspot(id, focus = true) {
    const hotspot = this.data.hotspots.find((item) => item.id === id);
    if (!hotspot) return;
    this.selectedHotspotId = hotspot.id;
    this.derived = false;
    this.selectedCandidates.clear();
    if (focus) this.flyTo(hotspot.lon, hotspot.lat, hotspot.radiusM);
    this._draw();
    this.render();
  }

  setLayer(id) {
    if (!LAYERS[id]) return;
    this.layerId = id;
    this._draw();
    this.render();
  }

  setSessionLimit(limit) {
    if (!this.loaded) return;
    this.sessionLimit = Math.min(this.data.sessions, Math.max(1, Math.round(Number(limit) || this.data.sessions)));
    this._draw();
    this.render();
  }

  deriveNeeds() {
    if (!this.selectedHotspot) return;
    this.derived = true;
    for (const need of this.selectedNeeds) {
      if (!this.selectedCandidates.has(need.id)) this.selectedCandidates.set(need.id, need.candidates[0]);
    }
    this._draw();
    this.render();
    this.toast(`시설 소요 도출 · ${this.selectedNeeds.length}개 기능 · 목업 추정`, 4200);
    this.onChange();
  }

  chooseCandidate(needId, candidateId) {
    const need = this.selectedNeeds.find((item) => item.id === needId);
    const candidate = need?.candidates.find((item) => item.id === candidateId);
    if (!candidate) return;
    this.selectedCandidates.set(needId, candidate);
    this._draw();
    this.render();
  }

  generatePlan() {
    if (!this.selectedHotspot || !this.derived) return;
    const needs = this.selectedNeeds.map((need) => ({
      ...need,
      selectedCandidate: this.selectedCandidates.get(need.id) ?? need.candidates[0],
    }));
    this.onGeneratePlan({
      dataset: this.data,
      hotspot: this.selectedHotspot,
      needs,
      fingerprint: trainingEvidenceFingerprint(this.data),
    });
  }

  _pick(position) {
    if (!this.loaded || this.isBlocked() || !position) return;
    const picked = this.viewer.scene.pick(position);
    const rawId = picked?.id?.id ?? picked?.id;
    if (typeof rawId !== 'string') return;
    if (rawId.startsWith('training-hotspot:')) {
      this.selectHotspot(rawId.slice('training-hotspot:'.length));
    }
  }

  _drawHotspotAnchor(hotspot, active, observedRepeats, scope, layer) {
    // A small anchor marker keeps every hotspot locatable regardless of which
    // analysis layer is active; the layer-specific geometry carries the meaning.
    const href = this._href();
    this.ds.entities.add({
      id: `training-hotspot:${hotspot.id}`,
      position: Cesium.Cartesian3.fromDegrees(hotspot.lon, hotspot.lat, this._z(hotspot.lon, hotspot.lat, 2)),
      point: {
        heightReference: href,
        pixelSize: active ? 11 : 6,
        color: color(layer.color, active ? 1 : 0.75),
        outlineColor: Cesium.Color.WHITE.withAlpha(active ? 0.95 : 0.45),
        outlineWidth: active ? 2 : 1,
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
      },
      label: {
        heightReference: href,
        text: `${hotspot.id} · ${observedRepeats}/${scope}회`,
        font: active ? '700 12px "Pretendard GOV", sans-serif' : '700 10.5px "Pretendard GOV", sans-serif',
        pixelOffset: new Cesium.Cartesian2(0, -18),
        fillColor: active ? Cesium.Color.WHITE : color(layer.color, 0.92),
        showBackground: true,
        backgroundColor: Cesium.Color.fromCssColorString('#0b0f14').withAlpha(0.78),
        backgroundPadding: new Cesium.Cartesian2(6, 4),
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
        distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 30000),
      },
    });
    if (active) {
      // A breathing target reticle marks "this is the one you're inspecting"
      // the same way in every layer, independent of that layer's own glyphs.
      this.ds.entities.add({
        id: `training-reticle:${hotspot.id}`,
        position: Cesium.Cartesian3.fromDegrees(hotspot.lon, hotspot.lat, this._z(hotspot.lon, hotspot.lat, 2)),
        ellipse: {
          heightReference: this._href(),
          height: this._z(hotspot.lon, hotspot.lat, 2),
          semiMajorAxis: new Cesium.CallbackProperty(() => 16 + Math.sin(Date.now() / 480) * 3, false),
          semiMinorAxis: new Cesium.CallbackProperty(() => 16 + Math.sin(Date.now() / 480) * 3, false),
          fill: false,
          outline: true,
          outlineWidth: 2,
          outlineColor: Cesium.Color.WHITE.withAlpha(0.8),
        },
      });
    }
  }

  // Training-loss concentration: a 7x7 synthetic 50m cell field rendered as
  // ground-clamped extruded bars (height + color ramp both carry intensity),
  // with a marker calling out the single most concentrated cell.
  _drawLossLayer(hotspot, active, repeatFactor, layer) {
    const cellSize = this.data.gridSizeM;
    const strength = hotspot.trainingLossRate / 6;
    let peak = null;
    for (let row = -3; row <= 3; row += 1) {
      for (let col = -3; col <= 3; col += 1) {
        const eastM = col * cellSize;
        const northM = row * cellSize;
        const distanceM = Math.hypot(eastM, northM);
        const bearing = distanceM ? ((Math.atan2(eastM, northM) * 180 / Math.PI) + 360) % 360 : 0;
        const center = distanceM ? offset(hotspot.lon, hotspot.lat, bearing, distanceM) : hotspot;
        const west = offset(center.lon, center.lat, 270, cellSize / 2);
        const east = offset(center.lon, center.lat, 90, cellSize / 2);
        const south = offset(center.lon, center.lat, 180, cellSize / 2);
        const north = offset(center.lon, center.lat, 0, cellSize / 2);
        const radial = Math.max(0, 1 - distanceM / (cellSize * 4.6));
        const jitter = ((((row + 7) * 13 + (col + 7) * 17 + hotspot.id.charCodeAt(2)) % 9) - 4) * 0.018;
        const intensity = Math.min(1, Math.max(0, strength * repeatFactor * radial + jitter));
        const cellColor = rampColor(layer.ramp, intensity);
        const barHeight = 1.5 + intensity * (active ? 130 : 78);
        this.ds.entities.add({
          id: `training-cell:${hotspot.id}:${row}:${col}`,
          rectangle: {
            coordinates: Cesium.Rectangle.fromDegrees(west.lon, south.lat, east.lon, north.lat),
            material: cellColor.withAlpha(Math.min(0.92, (active ? 0.3 : 0.18) + intensity * 0.58)),
            height: this._z(center.lon, center.lat, 0),
            heightReference: this._hrefClamp(),
            extrudedHeight: this._z(center.lon, center.lat, barHeight),
            extrudedHeightReference: this._href(),
            outline: intensity > 0.5,
            outlineColor: cellColor.withAlpha(0.85),
            outlineWidth: 1,
          },
        });
        if (!peak || intensity > peak.intensity) peak = { intensity, center, barHeight };
      }
    }
    if (peak && peak.intensity > 0.12) {
      // The badge sits on the terrain-relative extruded bar it belongs to —
      // same RELATIVE_TO_GROUND reference frame as the bar's own extrusion,
      // so it lands on top of the bar instead of floating at the wrong depth.
      const badgeHeight = peak.barHeight + 6;
      const peakHref = this._href();
      this.ds.entities.add({
        id: `training-peak:${hotspot.id}`,
        position: Cesium.Cartesian3.fromDegrees(peak.center.lon, peak.center.lat, this._z(peak.center.lon, peak.center.lat, badgeHeight)),
        billboard: {
          heightReference: peakHref,
          image: glyphBadge(rampColor(layer.ramp, peak.intensity).toCssHexString(), '!'),
          width: active ? 26 : 20,
          height: active ? 26 : 20,
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
        },
        label: {
          heightReference: peakHref,
          text: `손실률 ${hotspot.trainingLossRate.toFixed(1)}/100인시`,
          font: '700 10px "Pretendard GOV", sans-serif',
          pixelOffset: new Cesium.Cartesian2(0, -16),
          verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
          fillColor: Cesium.Color.WHITE,
          showBackground: true,
          backgroundColor: color(layer.color, 0.82),
          backgroundPadding: new Cesium.Cartesian2(5, 3),
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
          distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 20000),
        },
      });
      // A quick recurring ping at the peak cell — reads as "loss events keep
      // happening here" rather than a single frozen intensity value.
      const sparkPeriod = 1100;
      const sparkColor = rampColor(layer.ramp, peak.intensity);
      this.ds.entities.add({
        id: `training-spark:${hotspot.id}`,
        position: Cesium.Cartesian3.fromDegrees(peak.center.lon, peak.center.lat, this._z(peak.center.lon, peak.center.lat, badgeHeight - 2)),
        ellipse: {
          heightReference: this._href(),
          height: this._z(peak.center.lon, peak.center.lat, badgeHeight - 2),
          semiMajorAxis: new Cesium.CallbackProperty(() => 4 + ((Date.now() / sparkPeriod) % 1) * 16, false),
          semiMinorAxis: new Cesium.CallbackProperty(() => 4 + ((Date.now() / sparkPeriod) % 1) * 16, false),
          fill: false,
          outline: true,
          outlineWidth: 2,
          outlineColor: new Cesium.CallbackProperty(() => {
            const grow = (Date.now() / sparkPeriod) % 1;
            return sparkColor.withAlpha(Math.max(0, (1 - grow) * 0.85));
          }, false),
        },
      });
    }
  }

  // Assembly/stagnation: a dense core disc sized by peak headcount, three
  // static ripple rings standing in for "people keep re-gathering here", and
  // a ring of per-person dots so the count reads as a pictograph, not a color.
  _drawAssemblyLayer(hotspot, active, repeatFactor, layer, maxAssembly) {
    const baseRadius = 12 + (hotspot.maxAssembly / Math.max(1, maxAssembly)) * 55;
    const period = 2600;
    const ringCount = 3;
    const assemblyHref = this._href();
    const assemblyZ2 = this._z(hotspot.lon, hotspot.lat, 2);
    // Live outward ripple (CallbackProperty re-evaluates every frame) reads as
    // "people keep re-gathering here" instead of a frozen colored disc.
    for (let i = 0; i < ringCount; i += 1) {
      const phase = i / ringCount;
      this.ds.entities.add({
        id: `training-pulse:${hotspot.id}:${i}`,
        position: Cesium.Cartesian3.fromDegrees(hotspot.lon, hotspot.lat, assemblyZ2),
        ellipse: {
          heightReference: assemblyHref,
          height: assemblyZ2,
          semiMajorAxis: new Cesium.CallbackProperty(() => {
            const growth = ((Date.now() / period) + phase) % 1;
            return baseRadius * (0.55 + growth * 0.85);
          }, false),
          semiMinorAxis: new Cesium.CallbackProperty(() => {
            const growth = ((Date.now() / period) + phase) % 1;
            return baseRadius * 0.86 * (0.55 + growth * 0.85);
          }, false),
          fill: false,
          outline: true,
          outlineWidth: 1.5,
          outlineColor: new Cesium.CallbackProperty(() => {
            const growth = ((Date.now() / period) + phase) % 1;
            const alpha = (1 - growth) * (active ? 0.5 : 0.26) * (0.45 + repeatFactor * 0.55);
            return color(layer.color, Math.max(0.03, alpha));
          }, false),
        },
      });
    }
    this.ds.entities.add({
      id: `training-core:${hotspot.id}`,
      position: Cesium.Cartesian3.fromDegrees(hotspot.lon, hotspot.lat, assemblyZ2),
      ellipse: {
        heightReference: assemblyHref,
        height: assemblyZ2,
        semiMajorAxis: baseRadius * 0.5,
        semiMinorAxis: baseRadius * 0.43,
        material: color(layer.color, active ? 0.48 : 0.28),
        outline: true,
        outlineWidth: active ? 2 : 1,
        outlineColor: color(layer.color, 0.9),
      },
    });
    const dotCount = Math.min(20, Math.max(1, Math.round(hotspot.maxAssembly)));
    for (let i = 0; i < dotCount; i += 1) {
      const angle = (i / dotCount) * 360;
      const p = offset(hotspot.lon, hotspot.lat, angle, baseRadius * 0.32);
      this.ds.entities.add({
        id: `training-person:${hotspot.id}:${i}`,
        position: Cesium.Cartesian3.fromDegrees(p.lon, p.lat, this._z(p.lon, p.lat, 3)),
        point: {
          heightReference: this._href(),
          pixelSize: active ? 4.5 : 3.5,
          color: color('#ffe9b0', active ? 0.95 : 0.72),
          outlineColor: color(layer.color, 0.9),
          outlineWidth: 1,
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
        },
      });
    }
    this.ds.entities.add({
      id: `training-assembly-badge:${hotspot.id}`,
      position: Cesium.Cartesian3.fromDegrees(hotspot.lon, hotspot.lat, assemblyZ2),
      billboard: {
        heightReference: assemblyHref,
        image: glyphBadge(layer.color, layer.icon),
        width: active ? 22 : 16,
        height: active ? 22 : 16,
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
      },
      label: {
        heightReference: assemblyHref,
        text: `최대 ${hotspot.maxAssembly}명 · 집결 지속 ${fmtSec(hotspot.dwellP90Sec)}`,
        font: '700 10px "Pretendard GOV", sans-serif',
        pixelOffset: new Cesium.Cartesian2(0, active ? 16 : 12),
        verticalOrigin: Cesium.VerticalOrigin.TOP,
        fillColor: color(layer.color, 0.95),
        showBackground: true,
        backgroundColor: Cesium.Color.fromCssColorString('#0b0f14').withAlpha(0.78),
        backgroundPadding: new Cesium.Cartesian2(5, 3),
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
        distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 20000),
      },
    });
  }

  // Response/evacuation delay: draws once per redraw (not per hotspot) — a
  // set of dashed isochrone rings around the GP so slow hotspots visibly sit
  // in the outer band, using the worst observed hotspot as the pace reference.
  _drawDelayIsochrones(maxResponseP90) {
    const reference = this.data.hotspots.reduce((a, b) => (b.responseP90Sec > a.responseP90Sec ? b : a));
    const referenceDistM = distM(SITE.gp.lon, SITE.gp.lat, reference.lon, reference.lat);
    const paceMPerSec = referenceDistM / Math.max(1, reference.responseP90Sec);
    for (const band of [0.34, 0.67, 1]) {
      const radius = paceMPerSec * maxResponseP90 * band;
      if (!(radius > 5)) continue;
      this.ds.entities.add({
        id: `training-isochrone:${Math.round(band * 100)}`,
        position: Cesium.Cartesian3.fromDegrees(SITE.gp.lon, SITE.gp.lat, this._z(SITE.gp.lon, SITE.gp.lat, 2)),
        ellipse: {
          heightReference: this._href(),
          height: this._z(SITE.gp.lon, SITE.gp.lat, 2),
          semiMajorAxis: radius,
          semiMinorAxis: radius,
          fill: false,
          outline: true,
          outlineWidth: 1.5,
          outlineColor: color('#a78bfa', 0.4),
        },
      });
      const tick = offset(SITE.gp.lon, SITE.gp.lat, 62, radius);
      this.ds.entities.add({
        id: `training-isochrone-label:${Math.round(band * 100)}`,
        position: Cesium.Cartesian3.fromDegrees(tick.lon, tick.lat, this._z(tick.lon, tick.lat, 2)),
        label: {
          heightReference: this._href(),
          text: `≈${Math.round((maxResponseP90 * band) / 60)}분대`,
          font: '600 9.5px "Pretendard GOV", sans-serif',
          fillColor: color('#a78bfa', 0.78),
          showBackground: true,
          backgroundColor: Cesium.Color.fromCssColorString('#0b0f14').withAlpha(0.6),
          backgroundPadding: new Cesium.Cartesian2(4, 2),
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
          distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 25000),
        },
      });
    }
  }

  // Response/evacuation delay: the actual GP→hotspot route, colored and
  // widened by how slow that particular route has proven to be.
  _drawDelayLayer(hotspot, active, layer, maxResponseP90) {
    const mid = offset(SITE.gp.lon, SITE.gp.lat, 180, 120);
    const t = hotspot.responseP90Sec / Math.max(1, maxResponseP90);
    const routeColor = rampColor(layer.ramp, t);
    const points = [
      Cesium.Cartesian3.fromDegrees(SITE.gp.lon, SITE.gp.lat, this._z(SITE.gp.lon, SITE.gp.lat, 6)),
      Cesium.Cartesian3.fromDegrees(mid.lon, mid.lat, this._z(mid.lon, mid.lat, 6)),
      Cesium.Cartesian3.fromDegrees(hotspot.lon, hotspot.lat, this._z(hotspot.lon, hotspot.lat, 6)),
    ];
    this.ds.entities.add({
      id: `training-route:${hotspot.id}`,
      polyline: {
        positions: points,
        width: active ? 7 : 3 + t * 4,
        material: routeColor.withAlpha(active ? 0.95 : 0.55),
        clampToGround: this._clampPoly(),
      },
    });
    // A marker literally crawls GP→hotspot; slower crawl = worse P90, so the
    // delay is felt as elapsed travel time, not just read off a color scale.
    const crawlPeriodMs = 3000 + t * 5500;
    this.ds.entities.add({
      id: `training-route-crawl:${hotspot.id}`,
      position: new Cesium.CallbackProperty(() => {
        const phase = (Date.now() / crawlPeriodMs) % 1;
        const p = pointAlongRoute(SITE.gp, mid, hotspot, phase);
        return Cesium.Cartesian3.fromDegrees(p.lon, p.lat, this._z(p.lon, p.lat, 3));
      }, false),
      point: {
        heightReference: this._href(),
        pixelSize: active ? 9 : 6,
        color: Cesium.Color.WHITE,
        outlineColor: routeColor,
        outlineWidth: 2,
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
      },
    });
    const routeEndHref = this._href();
    this.ds.entities.add({
      id: `training-route-end:${hotspot.id}`,
      position: Cesium.Cartesian3.fromDegrees(hotspot.lon, hotspot.lat, this._z(hotspot.lon, hotspot.lat, 3)),
      billboard: {
        heightReference: routeEndHref,
        image: glyphBadge(routeColor.toCssHexString(), layer.icon),
        width: active ? 24 : 18,
        height: active ? 24 : 18,
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
      },
      label: {
        heightReference: routeEndHref,
        text: `후송 P90 ${fmtSec(hotspot.responseP90Sec)}`,
        font: '700 10px "Pretendard GOV", sans-serif',
        pixelOffset: new Cesium.Cartesian2(0, active ? 18 : 14),
        verticalOrigin: Cesium.VerticalOrigin.TOP,
        fillColor: routeColor,
        showBackground: true,
        backgroundColor: Cesium.Color.fromCssColorString('#0b0f14').withAlpha(0.8),
        backgroundPadding: new Cesium.Cartesian2(5, 3),
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
        distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 25000),
      },
    });
  }

  // Communications cutoff: a rotating "searching for signal" sweep from the
  // GP, drawn once per redraw (not per hotspot) — a fading multi-line trail
  // standing in for a radar/relay repeatedly scanning and failing to connect.
  _drawCommsSweep() {
    const sweepPeriodMs = 4200;
    const trailCount = 6;
    for (let i = 0; i < trailCount; i += 1) {
      const trailOffsetDeg = i * 7;
      this.ds.entities.add({
        id: `training-sweep:${i}`,
        polyline: {
          positions: new Cesium.CallbackProperty(() => {
            const angle = (((Date.now() / sweepPeriodMs) * 360 - trailOffsetDeg) % 360 + 360) % 360;
            const tip = offset(SITE.gp.lon, SITE.gp.lat, angle, 300);
            return [
              Cesium.Cartesian3.fromDegrees(SITE.gp.lon, SITE.gp.lat, this._z(SITE.gp.lon, SITE.gp.lat, 6)),
              Cesium.Cartesian3.fromDegrees(tip.lon, tip.lat, this._z(tip.lon, tip.lat, 6)),
            ];
          }, false),
          width: 2,
          material: color('#33d6c5', Math.max(0.02, 0.38 - i * 0.06)),
          clampToGround: this._clampPoly(),
        },
      });
    }
  }

  // Communications cutoff: a dead-zone dome sized by outage duration and a
  // deliberately broken (dashed) link back to the GP, instead of a solid line.
  _drawCommsLayer(hotspot, active, layer, maxCommsGap) {
    const t = hotspot.commsGapSec / Math.max(1, maxCommsGap);
    const zoneColor = rampColor(layer.ramp, t);
    const radius = hotspot.radiusM * (0.5 + t * 0.55);
    // A slow "breathing" alpha on the dead-zone dome reads as a lost signal
    // still being searched for, rather than a static tinted patch of ground.
    const commsZ2 = this._z(hotspot.lon, hotspot.lat, 2);
    this.ds.entities.add({
      id: `training-deadzone:${hotspot.id}`,
      position: Cesium.Cartesian3.fromDegrees(hotspot.lon, hotspot.lat, commsZ2),
      ellipse: {
        heightReference: this._href(),
        height: commsZ2,
        semiMajorAxis: radius,
        semiMinorAxis: radius * 0.86,
        material: new Cesium.CallbackProperty(() => {
          const breathe = 0.5 + 0.5 * Math.sin(Date.now() / 900);
          return zoneColor.withAlpha((active ? 0.2 : 0.11) + breathe * (active ? 0.18 : 0.11));
        }, false),
        outline: true,
        outlineWidth: active ? 2 : 1,
        outlineColor: zoneColor.withAlpha(0.7),
      },
    });
    const mid = offset(SITE.gp.lon, SITE.gp.lat, 180, 120);
    const points = [
      Cesium.Cartesian3.fromDegrees(SITE.gp.lon, SITE.gp.lat, this._z(SITE.gp.lon, SITE.gp.lat, 8)),
      Cesium.Cartesian3.fromDegrees(mid.lon, mid.lat, this._z(mid.lon, mid.lat, 8)),
      Cesium.Cartesian3.fromDegrees(hotspot.lon, hotspot.lat, this._z(hotspot.lon, hotspot.lat, 8)),
    ];
    // The link blinks on/off rather than staying solid-dashed, so "cut off"
    // reads as an active fault, not just a different line style.
    this.ds.entities.add({
      id: `training-commslink:${hotspot.id}`,
      polyline: {
        positions: points,
        width: active ? 4 : 2,
        material: new Cesium.PolylineDashMaterialProperty({
          color: new Cesium.CallbackProperty(() => {
            const on = Math.floor(Date.now() / 420) % 2 === 0;
            return zoneColor.withAlpha(on ? (active ? 0.92 : 0.48) : 0.06);
          }, false),
          dashLength: 22,
        }),
        clampToGround: this._clampPoly(),
      },
    });
    const signalHref = this._href();
    this.ds.entities.add({
      id: `training-signal:${hotspot.id}`,
      position: Cesium.Cartesian3.fromDegrees(hotspot.lon, hotspot.lat, this._z(hotspot.lon, hotspot.lat, 3)),
      billboard: {
        heightReference: signalHref,
        image: glyphBadge(zoneColor.toCssHexString(), '✕'),
        width: active ? 24 : 18,
        height: active ? 24 : 18,
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
      },
      label: {
        heightReference: signalHref,
        text: `단절 ${fmtSec(hotspot.commsGapSec)}`,
        font: '700 10px "Pretendard GOV", sans-serif',
        pixelOffset: new Cesium.Cartesian2(0, active ? 18 : 14),
        verticalOrigin: Cesium.VerticalOrigin.TOP,
        fillColor: zoneColor,
        showBackground: true,
        backgroundColor: Cesium.Color.fromCssColorString('#0b0f14').withAlpha(0.8),
        backgroundPadding: new Cesium.Cartesian2(5, 3),
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
        distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 25000),
      },
    });
  }

  // Movement-path density, stage 1: bin every corridor's resampled walk into
  // a fine local grid with a Gaussian kernel splat (not a single hard cell
  // per sample), so nearby/parallel corridors merge into one continuous
  // "worn ground" glow instead of reading as separate ruled lines. Aggregated
  // counts only, scaled by the session-range scope — no per-person track.
  _computeMovementDensityGrid(scope) {
    const empty = { cells: [], max: 1 };
    const segments = this.data.movementSegments;
    if (!segments.length) return empty;
    const cellSizeM = 40;
    const stepM = 14;
    const kernel = 1;
    const sigma = cellSizeM * 0.9;

    let minLon = Infinity;
    let maxLon = -Infinity;
    let minLat = Infinity;
    let maxLat = -Infinity;
    for (const segment of segments) {
      for (const p of segment.waypoints) {
        if (p.lon < minLon) minLon = p.lon;
        if (p.lon > maxLon) maxLon = p.lon;
        if (p.lat < minLat) minLat = p.lat;
        if (p.lat > maxLat) maxLat = p.lat;
      }
    }
    if (!Number.isFinite(minLon)) return empty;

    const marginM = 120;
    const midLat = (minLat + maxLat) / 2;
    const mPerDegLat = 111320;
    const mPerDegLon = 111320 * Math.cos((midLat * Math.PI) / 180);
    const originLon = minLon - marginM / mPerDegLon;
    const originLat = minLat - marginM / mPerDegLat;

    const grid = new Map();
    for (const segment of segments) {
      const observedSessions = Math.max(0, Math.round(segment.sessions * scope / this.data.sessions));
      const trafficFactor = segment.sessions ? observedSessions / segment.sessions : 0;
      const weight = segment.traversals * trafficFactor;
      if (!(weight > 0)) continue;
      const waypoints = segment.waypoints.map((p) => [p.lon, p.lat]);
      for (const sample of resamplePath(waypoints, stepM)) {
        const xM = (sample.lon - originLon) * mPerDegLon;
        const yM = (sample.lat - originLat) * mPerDegLat;
        const col0 = Math.round(xM / cellSizeM);
        const row0 = Math.round(yM / cellSizeM);
        for (let dr = -kernel; dr <= kernel; dr += 1) {
          for (let dc = -kernel; dc <= kernel; dc += 1) {
            const col = col0 + dc;
            const row = row0 + dr;
            const dM = Math.hypot((col + 0.5) * cellSizeM - xM, (row + 0.5) * cellSizeM - yM);
            const falloff = Math.exp(-(dM * dM) / (2 * sigma * sigma));
            if (falloff < 0.03) continue;
            const key = `${col}:${row}`;
            grid.set(key, (grid.get(key) || 0) + weight * falloff);
          }
        }
      }
    }

    const cells = [];
    for (const [key, value] of grid) {
      const [col, row] = key.split(':').map(Number);
      cells.push({
        lon: originLon + ((col + 0.5) * cellSizeM) / mPerDegLon,
        lat: originLat + ((row + 0.5) * cellSizeM) / mPerDegLat,
        value,
      });
    }
    cells.sort((a, b) => b.value - a.value);
    const max = cells.length ? cells[0].value : 1;
    const threshold = max * 0.05;
    return { cells: cells.filter((cell) => cell.value >= threshold).slice(0, 320), max };
  }

  // Movement-path density, stage 2: the ground-glow field carries the actual
  // "where did people walk" read; a thin neon trunk line over the top keeps
  // named corridors legible, and only the single hottest cell gets a callout
  // — a real heatmap should be read by its glow, not by a caption on every line.
  _drawMovementLayer(layer, scope) {
    const segments = this.data.movementSegments;
    if (!segments.length) return;

    const { cells, max } = this._computeMovementDensityGrid(scope);
    const glowTex = glowDiscTexture();
    const heatHref = this._href();
    cells.forEach((cell, index) => {
      const t = max > 0 ? cell.value / max : 0;
      if (t <= 0) return;
      const cellColor = rampColor(layer.ramp, t);
      const radius = 16 + t * 40;
      const z = this._z(cell.lon, cell.lat, 1.5);
      this.ds.entities.add({
        id: `training-heat:${index}`,
        position: Cesium.Cartesian3.fromDegrees(cell.lon, cell.lat, z),
        ellipse: {
          heightReference: heatHref,
          height: z,
          semiMajorAxis: radius,
          semiMinorAxis: radius,
          material: new Cesium.ImageMaterialProperty({ image: glowTex, color: cellColor.withAlpha(0.14 + t * 0.5), transparent: true }),
        },
      });
    });

    const maxTraversals = Math.max(...segments.map((segment) => segment.traversals), 1);
    const clamp = this._clampPoly();
    let busiest = segments[0];
    for (const segment of segments) {
      if (segment.traversals > busiest.traversals) busiest = segment;
      const observedSessions = Math.max(0, Math.round(segment.sessions * scope / this.data.sessions));
      const trafficFactor = segment.sessions ? observedSessions / segment.sessions : 0;
      const observedTraversals = Math.round(segment.traversals * trafficFactor);
      const intensity = segment.traversals / maxTraversals;
      const routeColor = rampColor(layer.ramp, intensity);
      const touchesSelected = this.selectedHotspotId && segment.id.includes(this.selectedHotspotId);
      const points = segment.waypoints.map((p) => Cesium.Cartesian3.fromDegrees(p.lon, p.lat, this._z(p.lon, p.lat, 3)));
      this.ds.entities.add({
        id: `training-flow:${segment.id}`,
        polyline: {
          positions: points,
          width: 2 + intensity * 4 + (touchesSelected ? 2 : 0),
          material: new Cesium.PolylineGlowMaterialProperty({
            glowPower: 0.1 + intensity * 0.16,
            taperPower: 0.85,
            color: routeColor.withAlpha(Math.min(1, 0.5 + intensity * 0.42 + (touchesSelected ? 0.15 : 0))),
          }),
          clampToGround: clamp,
        },
      });
      // A flowing convoy only on the busier corridors — every segment
      // glowing and crawling at once would read as noise, not traffic.
      if (observedTraversals <= 0 || intensity < 0.18) continue;
      const dotCount = Math.min(6, Math.max(2, Math.round(2 + intensity * 5)));
      const crawlPeriodMs = 5200 - intensity * 3400;
      for (let i = 0; i < dotCount; i += 1) {
        const phase = i / dotCount;
        this.ds.entities.add({
          id: `training-flow-dot:${segment.id}:${i}`,
          position: new Cesium.CallbackProperty(() => {
            const t = ((Date.now() / crawlPeriodMs) + phase) % 1;
            const p = pointAlongPath(segment.waypoints, t);
            return Cesium.Cartesian3.fromDegrees(p.lon, p.lat, this._z(p.lon, p.lat, 4));
          }, false),
          point: {
            heightReference: this._href(),
            pixelSize: 3 + intensity * 3.5,
            color: Cesium.Color.WHITE.withAlpha(0.92),
            outlineColor: routeColor,
            outlineWidth: 1.5,
            disableDepthTestDistance: Number.POSITIVE_INFINITY,
          },
        });
      }
    }

    const peak = cells[0];
    if (peak && busiest) {
      const peakT = max > 0 ? peak.value / max : 0;
      const peakColor = rampColor(layer.ramp, peakT);
      const peakHref = this._href();
      const observedSessions = Math.max(0, Math.round(busiest.sessions * scope / this.data.sessions));
      const trafficFactor = busiest.sessions ? observedSessions / busiest.sessions : 0;
      const observedTraversals = Math.round(busiest.traversals * trafficFactor);
      this.ds.entities.add({
        id: 'training-heat-peak',
        position: Cesium.Cartesian3.fromDegrees(peak.lon, peak.lat, this._z(peak.lon, peak.lat, 26)),
        billboard: {
          heightReference: peakHref,
          image: glyphBadge(peakColor.toCssHexString(), '★'),
          width: 22,
          height: 22,
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
        },
        label: {
          heightReference: peakHref,
          text: `가장 붐빈 구간 · ${busiest.label} · ${observedTraversals}회`,
          font: '700 10.5px "Pretendard GOV", sans-serif',
          pixelOffset: new Cesium.Cartesian2(0, -18),
          verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
          fillColor: Cesium.Color.WHITE,
          showBackground: true,
          backgroundColor: Cesium.Color.fromCssColorString('#0b0f14').withAlpha(0.82),
          backgroundPadding: new Cesium.Cartesian2(6, 4),
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
          distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 22000),
        },
      });
    }
  }

  _focusRoute(id) {
    const segment = this.data.movementSegments.find((item) => item.id === id);
    if (!segment) return;
    const mid = pointAlongPath(segment.waypoints, 0.5);
    this.flyTo(mid.lon, mid.lat, 220);
  }

  _draw() {
    this.ds.entities.removeAll();
    this._updateMapLegend();
    if (!this.loaded) return;
    this._ensureAnimationPump();
    const layer = LAYERS[this.layerId];
    const selected = this.selectedHotspot;
    const scope = this.sessionLimit || this.data.sessions;
    const maxResponseP90 = Math.max(...this.data.hotspots.map((h) => h.responseP90Sec), 1);
    const maxCommsGap = Math.max(...this.data.hotspots.map((h) => h.commsGapSec), 1);
    const maxAssembly = Math.max(...this.data.hotspots.map((h) => h.maxAssembly), 1);

    if (this.layerId === 'delay') this._drawDelayIsochrones(maxResponseP90);
    if (this.layerId === 'comms') this._drawCommsSweep();
    if (this.layerId === 'routes') this._drawMovementLayer(layer, scope);

    // Each analysis layer renders geometry shaped by its own metric — a
    // recolored copy of the same blob would not explain what changed.
    for (const hotspot of this.data.hotspots) {
      const active = hotspot.id === this.selectedHotspotId;
      const observedRepeats = Math.max(0, Math.round(hotspot.recurrence.sessions * scope / this.data.sessions));
      const repeatFactor = hotspot.recurrence.sessions ? observedRepeats / hotspot.recurrence.sessions : 0;

      if (this.layerId === 'loss') this._drawLossLayer(hotspot, active, repeatFactor, layer);
      else if (this.layerId === 'assembly') this._drawAssemblyLayer(hotspot, active, repeatFactor, layer, maxAssembly);
      else if (this.layerId === 'delay') this._drawDelayLayer(hotspot, active, layer, maxResponseP90);
      else if (this.layerId === 'comms') this._drawCommsLayer(hotspot, active, layer, maxCommsGap);

      this._drawHotspotAnchor(hotspot, active, observedRepeats, scope, layer);
    }

    // Candidate facility footprints appear only after the operator asks for
    // facility requirements; this makes the causal transition visible.
    if (selected && this.derived) {
      for (const need of selected.facilityNeeds) {
        const chosen = this.selectedCandidates.get(need.id) ?? need.candidates[0];
        if (!chosen) continue;
        const candHref = this._href();
        const candZ = this._z(chosen.lon, chosen.lat, 3);
        this.ds.entities.add({
          id: `training-candidate:${need.id}`,
          position: Cesium.Cartesian3.fromDegrees(chosen.lon, chosen.lat, candZ),
          ellipse: {
            heightReference: candHref,
            height: candZ,
            semiMajorAxis: 22,
            semiMinorAxis: 14,
            material: color('#7cff6b', 0.12),
            outline: true,
            outlineWidth: 2,
            outlineColor: color('#7cff6b', 0.96),
          },
          label: {
            heightReference: candHref,
            text: `${need.label}\n${chosen.label}`,
            font: '600 10px "Pretendard GOV", sans-serif',
            pixelOffset: new Cesium.Cartesian2(0, -20),
            fillColor: color('#b8ffab', 0.98),
            showBackground: true,
            backgroundColor: Cesium.Color.fromCssColorString('#0b0f14').withAlpha(0.86),
            backgroundPadding: new Cesium.Cartesian2(5, 3),
            disableDepthTestDistance: Number.POSITIVE_INFINITY,
          },
        });
      }
    }
  }

  _renderHotspotCard(hotspot) {
    if (!hotspot) return '<p class="muted">지도에서 반복 취약구역을 선택하세요.</p>';
    const dataBadge = this.data.synthetic ? 'MOCK' : 'SOURCE';
    const scope = this.sessionLimit || this.data.sessions;
    const observedRepeats = Math.max(0, Math.round(hotspot.recurrence.sessions * scope / this.data.sessions));
    return `
      <div class="training-hotspot-head"><span class="training-code">${esc(hotspot.id)}</span><b>${esc(hotspot.label)}</b><span class="training-mock">${dataBadge}</span></div>
      <div class="training-metric-grid">
        <div><span>반복 발생 (현재 범위)</span><b>${observedRepeats}/${scope}회</b></div>
        <div><span>훈련손실률</span><b>${hotspot.trainingLossRate.toFixed(1)} / 100 인시</b></div>
        <div><span>최대 집결</span><b>${hotspot.maxAssembly}명</b></div>
        <div><span>집결 지속 P90</span><b>${fmtSec(hotspot.dwellP90Sec)}</b></div>
        <div><span>후송·대응 P90</span><b>${fmtSec(hotspot.responseP90Sec)}</b></div>
        <div><span>통신 단절</span><b>${fmtSec(hotspot.commsGapSec)}</b></div>
      </div>
      <div class="training-evidence-list">${hotspot.evidence.map((item) => `<div>· ${esc(item)}</div>`).join('')}</div>
      <div class="training-confidence"><span>근거 신뢰도</span><b>${hotspot.confidence}%</b><span class="training-progress"><i style="width:${hotspot.confidence}%"></i></span></div>
      <button class="btn primary full" id="training-derive">시설 소요 도출 ▶</button>`;
  }

  _renderNeedCards(hotspot) {
    if (!this.derived || !hotspot) return '';
    return `<div class="sec training-needs-sec"><div class="sec-title">도출된 시설 소요 <span class="training-mock">목업 추정</span></div>
      ${hotspot.facilityNeeds.map((need) => {
        const selected = this.selectedCandidates.get(need.id) ?? need.candidates[0];
        return `<div class="training-need-card">
          <div class="training-need-top"><b>${esc(need.label)}</b><strong>${need.priority}</strong></div>
          <div class="training-need-meta"><span>연결 시설 · ${esc(need.facilityTypeId)}</span><span>신뢰도 ${need.confidence}%</span></div>
          <p>${esc(need.reason)}</p><div class="muted">예상 효과 · ${esc(need.expectedEffect)}</div>
          <div class="training-candidates">${need.candidates.map((candidate) => `<button class="training-candidate ${candidate.id === selected?.id ? 'selected' : ''}" data-need="${esc(need.id)}" data-candidate="${esc(candidate.id)}"><b>${esc(candidate.label)}</b><span>적합 ${candidate.fit} · 지형 ${candidate.terrainFit} · 접근 ${candidate.accessFit}</span><em>${candidate.costBand === 'low' ? '저비용' : candidate.costBand === 'medium' ? '중간비용' : '고비용'}</em></button>`).join('')}</div>
        </div>`;
      }).join('')}
      <button class="btn primary full" id="training-send-build">선택 소요를 배치안으로 보내기 →</button>
      <p class="muted training-note">선택한 위치는 기존 배치 엔진이 다시 지형 샘플링하고 토공·공사비를 계산합니다.</p>
    </div>`;
  }

  _renderMovementList(scope) {
    const segments = [...this.data.movementSegments].sort((a, b) => b.traversals - a.traversals).slice(0, 5);
    if (!segments.length) return '';
    const maxTraversals = segments[0].traversals || 1;
    return `<div class="sec training-route-sec"><div class="sec-title">가장 붐빈 이동로 <span class="muted">Top ${segments.length}</span></div><div class="training-hotspot-list">${segments.map((segment) => {
      const observedSessions = Math.max(0, Math.round(segment.sessions * scope / this.data.sessions));
      const trafficFactor = segment.sessions ? observedSessions / segment.sessions : 0;
      const observedTraversals = Math.round(segment.traversals * trafficFactor);
      const barPct = Math.round((segment.traversals / maxTraversals) * 100);
      return `<button class="training-hotspot-row" data-route="${esc(segment.id)}">
        <span class="training-row-dot" style="background:${LAYERS.routes.color}"></span>
        <span><b>${esc(segment.label)}</b><small>현재 범위 ${observedTraversals}회 · 전체 ${segment.traversals}회 · ${segment.sessions}/${this.data.sessions}세션</small>
        <span class="training-progress"><i style="width:${barPct}%;background:${LAYERS.routes.color}"></i></span></span>
        <strong>${observedTraversals}</strong>
      </button>`;
    }).join('')}</div></div>`;
  }

  render() {
    const page = $('#page-training');
    if (!page) return;
    const fingerprint = this.loaded ? trainingEvidenceFingerprint(this.data) : '';
    const sourceBadge = this.loaded && !this.data.synthetic ? '외부 데이터' : '합성 목업';
    const scope = this.sessionLimit || this.data.sessions;
    page.innerHTML = `
      <div class="sec training-source-sec"><div class="sec-title">훈련데이터 수신 <span class="training-mock">${sourceBadge}</span></div>
        <div class="training-source"><div class="training-source-led"><i></i><span>${this.loaded ? '데이터 세트 적용됨' : '수신 대기'}</span></div><b>${this.loaded ? esc(this.data.source.label) : 'KCTC + Warrior Platform'}</b></div>
        <p class="muted">KCTC는 훈련 사건·결과, Warrior Platform은 익명화된 위치·상태 로그를 제공합니다. 개인 식별정보는 저장하지 않고 반복 패턴만 50m 격자로 표출합니다.</p>
        <button class="btn ${this.loaded ? '' : 'primary'} full" id="training-load">${this.loaded ? '↻ 목업 데이터 다시 수신' : '▶ 목업 데이터 수신'}</button>
        <div class="training-action-row"><button class="btn" id="training-import">⬆ JSON 가져오기</button><button class="btn" id="training-export" ${this.loaded ? '' : 'disabled'}>⬇ JSON 내보내기</button></div>
        <input id="training-file" type="file" accept=".json,application/json" hidden>
        ${this.loaded ? `<div class="training-ingest"><span>위치·상태 로그 <b>${this.data.positionRecordCount.toLocaleString()}</b></span><span>훈련 세션 <b>${this.data.sessions}회</b></span><span>반복 구역 <b>${this.data.hotspots.length}곳</b></span><span>이동 경로 <b>${this.data.movementSegments.length}개</b></span><span>fingerprint <b>${fingerprint}</b></span></div>` : '<div class="training-empty">실제 KCTC 연결 전시용 · 현재는 재현 가능한 합성 데이터입니다.</div>'}
      </div>
      ${this.loaded ? `<div class="sec"><div class="sec-title">분석 레이어 <span class="training-mock">50m 집계 히트맵</span></div><div class="training-layer-list">${Object.entries(LAYERS).map(([id, meta]) => `<button class="training-layer ${id === this.layerId ? 'selected' : ''}" data-layer="${id}" style="--layer-color:${meta.color}"><span>${meta.icon}</span><b>${meta.label}</b><small>${meta.hint}</small></button>`).join('')}</div><div class="training-heat-legend" style="--legend-a:${LAYERS[this.layerId].ramp[0]};--legend-b:${LAYERS[this.layerId].ramp[LAYERS[this.layerId].ramp.length - 1]}"><i></i><span>${esc(LAYERS[this.layerId].legend)}</span></div><div class="training-session-control"><label for="training-session">훈련 회차 범위</label><input id="training-session" type="range" min="1" max="${this.data.sessions}" value="${scope}" step="1"><b id="training-session-value">01–${String(scope).padStart(2, '0')}회</b></div><div class="training-range"><span>누적 분석</span><b>01–${String(scope).padStart(2, '0')}회 / ${String(this.data.sessions).padStart(2, '0')}회</b><span class="training-pill">${this.data.gridSizeM}m 격자</span></div></div>
      ${this.layerId === 'routes' ? this._renderMovementList(scope) : ''}
      <div class="sec"><div class="sec-title">반복 취약구역 <span class="muted">${this.loaded ? `${this.data.hotspots.length}곳` : ''}</span></div><div class="training-hotspot-list">${this.data.hotspots.map((hotspot) => { const observed = Math.max(0, Math.round(hotspot.recurrence.sessions * scope / this.data.sessions)); return `<button class="training-hotspot-row ${hotspot.id === this.selectedHotspotId ? 'selected' : ''}" data-hotspot="${hotspot.id}"><span class="training-row-dot" style="background:${LAYERS[this.layerId].color}"></span><span><b>${esc(hotspot.id)} · ${esc(hotspot.label)}</b><small>현재 ${observed}/${scope}회 · 전체 ${hotspot.recurrence.sessions}/${hotspot.recurrence.total}회 · 신뢰도 ${hotspot.confidence}%</small></span><strong>${hotspot.facilityNeeds.length}개</strong></button>`; }).join('')}</div></div>
      <div class="sec training-evidence-sec"><div class="sec-title">선택 구역 근거</div><div id="training-selected-card">${this._renderHotspotCard(this.selectedHotspot)}</div></div>
      ${this._renderNeedCards(this.selectedHotspot)}
      <div class="sec"><div class="sec-title">표출 원칙</div><p class="muted">단일 사건의 위치를 시설 위치로 복사하지 않습니다. 반복성·노출·대응지연·지형 적합도를 함께 보고, 근거와 예상효과를 남긴 뒤 배치 엔진에 전달합니다.</p></div>` : ''}`;

    $('#training-load')?.addEventListener('click', () => this.loadMock());
    $('#training-import')?.addEventListener('click', () => $('#training-file')?.click());
    $('#training-export')?.addEventListener('click', () => this.exportCurrent());
    $('#training-file')?.addEventListener('change', (event) => {
      const file = event.target.files?.[0];
      event.target.value = '';
      this.importFile(file);
    });
    $('#training-session')?.addEventListener('input', (event) => {
      const value = Math.round(Number(event.target.value));
      this.setSessionLimit(value);
    });
    page.querySelectorAll('[data-layer]').forEach((button) => button.addEventListener('click', () => this.setLayer(button.dataset.layer)));
    page.querySelectorAll('[data-hotspot]').forEach((button) => button.addEventListener('click', () => this.selectHotspot(button.dataset.hotspot)));
    page.querySelectorAll('[data-route]').forEach((button) => button.addEventListener('click', () => this._focusRoute(button.dataset.route)));
    $('#training-derive')?.addEventListener('click', () => this.deriveNeeds());
    page.querySelectorAll('[data-candidate]').forEach((button) => button.addEventListener('click', () => this.chooseCandidate(button.dataset.need, button.dataset.candidate)));
    $('#training-send-build')?.addEventListener('click', () => this.generatePlan());
    this._draw();
  }
}
