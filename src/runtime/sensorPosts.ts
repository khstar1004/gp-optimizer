// @ts-nocheck
/**
 * 감시자산 직접 배치 레이어
 *
 * 기존 `sensorModels.js` 의 MOUNTS 는 GP 기준 방위/거리 한 벌짜리 **기본 거치**이고
 * 최적화기가 그 한 벌을 옮긴다. 여기서 다루는 것은 그것과 다른 것 — 운용자가
 * 지도 위 아무 데나, 몇 대든, 마스트 높이와 지향을 직접 잡아 세우는 **배치**다.
 * 능선 너머 감제고지에 EO를 하나 더 올려 보는 일이 여기서 가능해진다.
 *
 * 각 초소가 스스로 아는 것:
 *   위치·지반고·마스트고 → 관측고    (지형 샘플 1회)
 *   지향·시야각                        (지도에서 회전)
 *   청천 제원 → 현재 날씨의 실효 DRI  (sensorPerformance)
 *
 * 그래서 지도에 그려지는 부채꼴은 **지금 이 날씨에서 실제로 보는 범위**이고,
 * 그 뒤에 점선으로 남는 부채꼴이 **맑았으면 봤을 범위**다. 눈이 오면 앞의 것이
 * 뒤의 것 안으로 줄어드는 게 눈으로 보인다.
 */
import { SITE } from './data';
import { offset, distM, azimuthDeg, azDelta } from './geo';
import { effectiveRanges, atmosphereOf, fmtM } from './sensorPerformance';
import { trackEnvModel } from './environment';

// 함수 참조를 즉시 평가(`= Cesium.Cartesian3.fromDegrees`)하면 모듈 로드 시점에
// 전역 Cesium 이 있어야 한다 — POST_TYPES/POST_TYPE(순수 데이터)만 필요한 임포터
// (postCoverage.ts 등)까지 Node 밖에서 못 돌게 막는다. 호출 시점까지 미룬다.
const D = (...args) => Cesium.Cartesian3.fromDegrees(...args);
const css = (c) => Cesium.Color.fromCssColorString(c);
const A = 'assets/models/';

/**
 * 배치 가능 자산 카탈로그.
 *
 *  band  : sensorPerformance 파장대
 *          vis/lwir/radar/acoustic/rf/flare/seismic/fence/indirect/eye
 *  dri   : 청천 [탐지, 인지, 식별] m — 단일 사거리 자산은 range 로 준다
 *  fov   : 시야각(도). 360 = 전방위
 *  mast  : [기본, 최소, 최대] 마스트/거치 높이 m
 *  feed  : 센서 피드 종류 (eo/ir/gun/ppi/none)
 *
 *  ── 여기서부터는 「살 수 있나」 옆에 「**운용할 수 있나**」를 놓는 값들이다 ──
 *  powerW   : 정격 소비전력. 0 이면 전원이 필요 없다(화기·크레모아·박격포).
 *             GP 에서 자산 수를 실제로 정하는 것은 돈보다 발전기인 경우가 많다.
 *  powerPri : 정전 시 차단 우선순위. **클수록 마지막까지 남긴다.**
 *             5 기반 · 4 야간 유일 관측 · 3 전천후 탐지 · 2 주간 광학 · 1 부가
 *  crew     : 운용 인원(명). GP 정원은 유한하고, 사람이 없으면 자산은 껍데기다.
 *  role     : 탐지 / 식별 / 타격 / 지원 / 기반 — 「무엇이 모자란가」를 묻기 위한 축
 *  losFree  : 지형 가시선이 필요 없는가 (곡사 화기·지진동·광망)
 *  genW     : 발전 용량(W). 발전기만 갖는다.
 */
export const POST_TYPES = [
  {
    id: 'eo', name: 'EO 주간카메라', short: 'EO', icon: '◉', color: '#5eb1ef', group: '광학',
    band: 'vis', dri: [3500, 1200, 600], fov: 90, mast: [9, 3, 30], model: A + 'sns_cam_mast.glb',
    feed: 'eo', costEok: 3.4,
    powerW: 220, powerPri: 2, crew: 1, role: '식별',
    blurb: '주간 고배율 관측. 조도와 가시거리 양쪽에 묶인다 — 야간·안개에 가장 먼저 죽는다.',
  },
  {
    id: 'ir', name: 'IR 열상 (TOD)', short: 'IR', icon: '◉', color: '#f28dbb', group: '광학',
    band: 'lwir', dri: [2800, 950, 480], fov: 60, mast: [9, 3, 30], model: A + 'sns_cam_mast_ir.glb',
    feed: 'ir', costEok: 7.8,
    powerW: 420, powerPri: 4, crew: 1, role: '탐지',
    blurb: '주야 무관. 연무는 뚫지만 눈·안개는 기하산란이라 열상도 함께 깎인다.',
  },
  {
    id: 'radar', name: '지상감시레이더 (X)', short: 'GSR', icon: '◬', color: '#b18cff', group: '센서',
    band: 'radar', dri: [5000, 3200, 1500], fov: 120, mast: [4.2, 2, 12], model: A + 'sns_radar_trailer.glb',
    feed: 'ppi', costEok: 12.5,
    powerW: 900, powerPri: 3, crew: 2, role: '탐지',
    blurb: '전천후. 강수 감쇠·체적클러터만 반영 — 악천후 감시의 기준선.',
  },
  {
    id: 'acoustic', name: '음향탐지 어레이', short: 'ACU', icon: '◬', color: '#ffd54f', group: '센서',
    band: 'acoustic', dri: [900, 600, 300], fov: 360, mast: [2.4, 1, 8], model: A + 'sns_acoustic.glb',
    feed: 'none', costEok: 2.1,
    powerW: 90, powerPri: 3, crew: 0, role: '탐지',
    blurb: '비가시선 탐지. 신설 흡음과 풍잡음 마스킹에 취약.',
  },
  {
    id: 'cuas', name: '대드론 재머', short: 'CUAS', icon: '⌓', color: '#63dfff', group: 'C-UAS',
    band: 'rf', dri: [800, 800, 800], fov: 360, mast: [5.2, 2, 14], model: A + 'sns_cuas_jammer.glb',
    feed: 'none', costEok: 9.6,
    powerW: 1100, powerPri: 2, crew: 1, role: '타격',
    blurb: 'RF 차단 반구. 강우 감쇠 무시 가능 — 사실상 전천후.',
  },
  {
    id: 'flare', name: '조명탄 발사대', short: 'ILL', icon: '✸', color: '#ffe08a', group: '지원',
    band: 'flare', dri: [2000, 2000, 2000], fov: 360, mast: [2.0, 1, 6], model: A + 'sns_flare.glb',
    feed: 'none', costEok: 1.2,
    powerW: 0, powerPri: 3, crew: 1, role: '지원',
    blurb: '야간 EO·육안 조준을 되살린다. 다만 안개 속에서는 역산란으로 스스로를 가린다.',
  },
  {
    id: 'hmg', name: 'K6 중기관총 진지', short: 'K6', icon: '▸', color: '#f2a33c', group: '화기',
    band: 'eye', dri: [1800, 900, 450], fov: 150, mast: [1.4, 1, 6], model: A + 'sns_weapon_mount.glb',
    feed: 'gun', costEok: 1.8,
    powerW: 0, powerPri: 5, crew: 2, role: '타격',
    blurb: '유효사거리 1.8km. 관측이 막히면 사거리는 의미가 없다 — 조명 지원과 함께 본다.',
  },
  {
    id: 'agl', name: 'K4 고속유탄 진지', short: 'K4', icon: '▸', color: '#e3b341', group: '화기',
    band: 'eye', dri: [2200, 1100, 550], fov: 150, mast: [1.4, 1, 6], model: A + 'sns_weapon_agl.glb',
    feed: 'gun', costEok: 2.4,
    powerW: 0, powerPri: 5, crew: 2, role: '타격',
    blurb: '곡사 유탄 2.2km. 관측수 지시사격이 전제 — 관측자산과 짝지어 배치.',
  },
  // ── 여기부터: 광학이 전부 죽는 조건에서도 남는 것들 ──────────────────
  {
    id: 'ugs', name: '지진동 감지센서 (UGS)', short: 'UGS', icon: '◍', color: '#8fd66a', group: '근접',
    band: 'seismic', dri: [180, 120, 70], fov: 360, mast: [0.2, 0, 1], model: A + 'sns_acoustic.glb',
    feed: 'none', costEok: 0.6,
    powerW: 4, powerPri: 4, crew: 0, role: '탐지', losFree: true,
    blurb: '매설형. 발걸음을 땅으로 듣는다 — 빛도 안개도 상관없다. '
      + '무월광 짙은 안개에서 광학이 전부 죽었을 때 남는 몇 안 되는 눈. 신설과 강풍에만 약하다.',
  },
  {
    id: 'fence', name: '광망 감지선', short: 'FIB', icon: '⌗', color: '#a0c4e8', group: '근접',
    band: 'fence', dri: [60, 60, 60], fov: 360, mast: [2.4, 1.5, 4], model: A + 'sns_acoustic.glb',
    feed: 'none', costEok: 0.9,
    powerW: 25, powerPri: 4, crew: 0, role: '탐지', losFree: true,
    blurb: '철책 접촉 감지. 거리가 아니라 선이라 날씨가 유효거리를 깎지 않는다. '
      + '대신 강풍·착설이 오경보를 만들고, 잦은 오경보는 경보를 무디게 한다.',
  },
  {
    id: 'cctv', name: '근접 감시 CCTV', short: 'CCTV', icon: '▣', color: '#7fb3d5', group: '근접',
    band: 'vis', dri: [420, 220, 120], fov: 110, mast: [4, 2, 10], model: A + 'sns_cam_mast.glb',
    feed: 'eo', costEok: 0.8,
    powerW: 60, powerPri: 1, crew: 0, role: '식별',
    blurb: '울타리 안쪽·사각지대를 메우는 고정 카메라. 싸고 여러 대 세울 수 있지만 '
      + '야간에는 조명이 없으면 아무것도 아니다.',
  },
  {
    id: 'light', name: '탐조등 (서치라이트)', short: 'SL', icon: '☀', color: '#ffd27f', group: '지원',
    band: 'flare', dri: [900, 900, 900], fov: 30, mast: [3.5, 2, 10], model: A + 'sns_flare.glb',
    feed: 'none', costEok: 1.6,
    powerW: 1500, powerPri: 1, crew: 1, role: '지원',
    blurb: '조명탄과 달리 끊기지 않는다 — 대신 전기를 크게 먹고, 켜는 순간 '
      + '자기 위치를 상대에게 알려 준다. 그 맞바꿈이 이 자산의 전부다.',
  },
  {
    id: 'drd', name: '드론탐지 레이더 (RF)', short: 'DRD', icon: '◇', color: '#b39ddb', group: 'C-UAS',
    band: 'rf', dri: [3500, 2400, 1200], fov: 360, mast: [4.5, 2, 12], model: A + 'sns_cuas_jammer.glb',
    feed: 'none', costEok: 8.4,
    powerW: 700, powerPri: 3, crew: 1, role: '탐지', losFree: true,
    blurb: '재머는 막는 장비이고 이것은 찾는 장비다. 조종 링크와 기체 RF 를 잡아 '
      + '방위와 대략 거리를 준다 — 무엇이 오는지 알아야 재밍을 켤 시점을 정한다.',
  },
  {
    id: 'mortar', name: '60mm 박격포 진지', short: '60M', icon: '⌃', color: '#e8a33c', group: '화기',
    band: 'indirect', dri: [2800, 2800, 2800], fov: 360, mast: [1.2, 1, 3], model: A + 'sns_weapon_agl.glb',
    feed: 'none', costEok: 2.2,
    powerW: 0, powerPri: 5, crew: 3, role: '타격', losFree: true,
    blurb: '곡사. 가시선이 필요 없다 — 직사화기가 닿지 못하는 능선 뒤 사각으로 '
      + '떨어뜨릴 수 있는 것이 존재 이유다. 관측자산의 좌표 지시가 전제.',
  },
  {
    id: 'claymore', name: '지향성 지뢰 (크레모아)', short: 'CLM', icon: '▲', color: '#d97a6c', group: '화기',
    band: 'eye', dri: [180, 120, 60], fov: 60, mast: [0.4, 0, 1], model: A + 'sns_weapon_mount.glb',
    feed: 'none', costEok: 0.2,
    powerW: 0, powerPri: 5, crew: 0, role: '타격', losFree: true,
    blurb: '통제격발. 마지막 50~180m 를 맡는다 — 그 거리에서는 관측도 조준도 이미 늦다. '
      + '싸지만 한 번뿐이고, 방향을 잘못 잡으면 아무 데도 닿지 않는다.',
  },
  {
    id: 'genset', name: '발전기 (5kW)', short: 'GEN', icon: '⚡', color: '#f2c94c', group: '기반',
    band: 'none', dri: [0, 0, 0], fov: 0, mast: [1.5, 1, 3], model: A + 'sns_radar_trailer.glb',
    feed: 'none', costEok: 1.4,
    powerW: 0, powerPri: 5, crew: 1, role: '기반',
    genW: 5000, fuelL: 60, idleLph: 0.9, fullLph: 2.4,
    blurb: '감시자산 수를 실제로 정하는 것은 돈보다 이것인 경우가 많다. 5kW · 연료 60L. '
      + '용량이 모자라면 우선순위가 낮은 자산부터 꺼진다 — 야간에 열상을 끄지는 않는다.',
  },
];

export const POST_TYPE = Object.fromEntries(POST_TYPES.map((t) => [t.id, t]));

/** 발전기 유형인가 — 탐지 자산과 규약이 다르다(부채꼴도 실효거리도 없다). */
export const isGenerator = (typeId) => !!POST_TYPE[typeId]?.genW;


/**
 * 지도에서 초소를 집을 때 쓰는 두 규칙 — 한 곳에만 적는다.
 *
 *  ENTITY  이 초소에 속한 **모든** 엔티티(부채꼴 fill·edge·DRI 호·지향축·돔·제원링·마스트·라벨).
 *          「클릭 = 선택/설정」은 이 넓은 규칙을 쓴다 — 화면에서 가장 크게 보이는 부채꼴을
 *          눌렀는데 아무 일도 안 일어나면 그건 없는 기능이다.
 *  HANDLE  끌어서 옮길 수 있는 **작은 손잡이**만(모델 본체·마스트·라벨). 드래그까지 부채꼴에
 *          허용하면 그 위에서 지도를 돌리려던 조작이 전부 초소 이동이 돼 버린다.
 */
export const POST_ENTITY_RE = /^post-(sp\d+)(?:-[a-z0-9]+)?$/;
export const POST_HANDLE_RE = /^post-(sp\d+)(?:-(?:mast|label))?$/;

let SEQ = 0;
const nextUid = () => `sp${++SEQ}`;

/** 기본 배치 세트 — 처음 여는 사람이 빈 지도를 보지 않도록. GP 기준 오프셋. */
/**
 * 기본 배치 세트 — 처음 여는 사람이 빈 지도를 보지 않도록. GP 기준 오프셋.
 *
 * **발전기가 먼저다.** 전원 없이 EO·TOD·레이더를 세워 두면 첫 화면이 통째로
 * 정전이 되어, 처음 여는 사람이 「고장난 앱」을 본다.
 */
const SEED = [
  { type: 'genset', az: 200, dist: 18, aim: 0 },
  { type: 'eo', az: 38, dist: 15, aim: 0 },
  { type: 'ir', az: 322, dist: 15, aim: 0 },
  { type: 'radar', az: 272, dist: 24, aim: 0 },
  { type: 'hmg', az: 18, dist: 24, aim: 0 },
  { type: 'ugs', az: 4, dist: 120, aim: 0 },
];

export class SensorPostLayer {
  /**
   * @param viewer
   * @param ctx {
   *   sampleHeights: async (Cartographic[]) => void,
   *   getEnvState: () => environmentState,
   *   onChange: () => void,
   * }
   */
  constructor(viewer, ctx = {}) {
    this.viewer = viewer;
    this.ctx = ctx;
    this.posts = [];
    this.ds = new Cesium.CustomDataSource('sensor-posts');
    viewer.dataSources.add(this.ds);
    this.models = new Map();     // uid → Cesium.Model
    this.selectedUid = null;
    this.showGhostRings = true;  // 청천 대비 점선
    this._ghost = null;
  }

  // ═══ 조회 ═══
  get(uid) { return this.posts.find((p) => p.uid === uid) ?? null; }
  list() { return this.posts; }
  countOf(typeId) { return this.posts.filter((p) => p.type === typeId).length; }
  totalCostEok() { return this.posts.reduce((s, p) => s + (POST_TYPE[p.type]?.costEok ?? 0), 0); }

  _atm() {
    const env = this.ctx.getEnvState?.();
    return env ? atmosphereOf(env) : null;
  }

  /** 초소 하나의 현재 실효 성능. atm 을 넘기면 재계산을 아낀다. */
  perfOf(post, atm = this._atm()) {
    const t = POST_TYPE[post.type];
    if (!t) return null;
    // 발전기는 보는 장비가 아니다 — 부채꼴도 실효거리도 없다
    if (t.genW) return null;
    // 전원이 끊긴 자산은 **아무것도 보지 않는다.** 전력 계기가 숫자로만 있고
    // 탐지가 그대로면, 그건 계기가 아니라 장식이다.
    if (t.powerW > 0 && this.ctx.isOffline?.(post.uid)) {
      return {
        dri: [0, 0, 0], spec: [...t.dri], range: 0, specRange: t.dri[0],
        factor: 0, limiter: '전원', verdict: 'NO_GO',
        note: '전원 차단 — 발전 용량 부족으로 정지 (전원 여유를 확보하면 되살아납니다)',
        offline: true,
      };
    }
    if (!atm) {
      return { dri: [...t.dri], spec: [...t.dri], range: t.dri[0], specRange: t.dri[0],
        factor: 1, limiter: '제원', note: '환경 미적용', verdict: 'GO' };
    }
    // 조명 지원은 **지금 이 초소 앞이 밝은가**로 판정한다.
    //
    // 예전에는 「조명탄 발사대가 배치되어 있으면 조명 지원 있음」이었다. 계획
    // 단계(커버리지 분석·자동배치)에서는 그것이 능력 진술로서 맞지만, 지도에
    // 지금 그려지는 부채꼴까지 그 규칙을 쓰면 발사대 한 기를 세워 둔 것만으로
    // **밤새도록 조명이 떠 있는 GP** 가 된다. 조명탄은 30초짜리 사건이다.
    const needsLight = t.band === 'vis' || t.band === 'eye';
    const illuminated = needsLight && !!this.ctx.isIlluminated?.(post, t);
    return effectiveRanges({ band: t.band, dri: t.dri, fov: t.fov }, atm, { illuminated });
  }

  /** 관측고(해발) = 지반고 + 마스트고 */
  eyeH(post) { return (post.groundH ?? 0) + (post.mastH ?? 2); }

  // ═══ 편집 ═══
  async add(typeId, lon, lat, patch = {}) {
    const t = POST_TYPE[typeId];
    if (!t) return null;
    const carto = [Cesium.Cartographic.fromDegrees(lon, lat)];
    try { await this.ctx.sampleHeights?.(carto); } catch (e) { console.warn('post terrain sample', e); }
    const post = {
      uid: nextUid(),
      type: typeId,
      name: `${t.short}-${String(this.countOf(typeId) + 1).padStart(2, '0')}`,
      lon, lat,
      groundH: carto[0].height ?? 0,
      mastH: t.mast[0],
      aimAz: Number.isFinite(patch.aimAz) ? patch.aimAz : SITE.sector.centerAz,
      fov: t.fov,
      ...patch,
    };
    this.posts.push(post);
    await this._ensureModel(post);
    this.redraw();
    this.ctx.onChange?.();
    return post;
  }

  remove(uid) {
    const i = this.posts.findIndex((p) => p.uid === uid);
    if (i < 0) return;
    this.posts.splice(i, 1);
    const m = this.models.get(uid);
    if (m) { try { this.viewer.scene.primitives.remove(m); } catch (_) {} this.models.delete(uid); }
    if (this.selectedUid === uid) this.selectedUid = null;
    this.redraw();
    this.ctx.onChange?.();
  }

  clear() {
    [...this.posts].forEach((p) => this.remove(p.uid));
  }

  update(uid, patch) {
    const p = this.get(uid);
    if (!p) return null;
    Object.assign(p, patch);
    this._applyMatrix(p);
    this.redraw();
    this.ctx.onChange?.();
    return p;
  }

  /** 위치 이동 — 지반고를 다시 잰다 (능선을 넘기면 관측고가 통째로 바뀐다). */
  async move(uid, lon, lat) {
    const p = this.get(uid);
    if (!p) return null;
    const carto = [Cesium.Cartographic.fromDegrees(lon, lat)];
    try { await this.ctx.sampleHeights?.(carto); } catch (e) { console.warn('post move sample', e); }
    p.lon = lon; p.lat = lat;
    p.groundH = carto[0].height ?? p.groundH;
    this._applyMatrix(p);
    this.redraw();
    this.ctx.onChange?.();
    return p;
  }

  select(uid) {
    this.selectedUid = uid;
    this.redraw();
  }

  async seedDefaults() {
    if (this.posts.length) return;
    for (const s of SEED) {
      const q = offset(SITE.gp.lon, SITE.gp.lat, s.az, s.dist);
      await this.add(s.type, q.lon, q.lat, { aimAz: s.aim || SITE.sector.centerAz });
    }
  }

  // ═══ 영속화 ═══
  serialize() {
    return this.posts.map((p) => ({
      type: p.type, name: p.name, lon: p.lon, lat: p.lat,
      mastH: p.mastH, aimAz: p.aimAz, fov: p.fov,
    }));
  }

  async restore(rows) {
    if (!Array.isArray(rows) || !rows.length) return false;
    this.clear();
    for (const r of rows) {
      if (!POST_TYPE[r.type]) continue;
      const p = await this.add(r.type, r.lon, r.lat, {
        aimAz: r.aimAz, fov: r.fov, mastH: r.mastH,
      });
      if (p && r.name) p.name = r.name;
    }
    this.redraw();
    return true;
  }

  // ═══ 3D 실물 ═══
  _matrix(post) {
    const origin = D(post.lon, post.lat, post.groundH);
    const enu = Cesium.Transforms.eastNorthUpToFixedFrame(origin);
    // sensorModels 와 동일 규약: rotZ(180−heading) → 정면(−Y)이 지향 방위
    const rot = Cesium.Matrix3.fromRotationZ(Cesium.Math.toRadians(180 - post.aimAz));
    const local = Cesium.Matrix4.fromRotationTranslation(rot, Cesium.Cartesian3.ZERO);
    return Cesium.Matrix4.multiply(enu, local, new Cesium.Matrix4());
  }

  _applyMatrix(post) {
    const m = this.models.get(post.uid);
    if (!m) return;
    const base = this._matrix(post);
    const d = this._damage?.get(post.uid);
    if (d?.collapse > 0) {
      // 마스트는 잘려 넘어간다 — 아래로 가라앉히면서 한쪽으로 크게 기울인다
      const c = Math.min(1, d.collapse);
      const seed = (post.uid.charCodeAt(0) % 7) * 0.9;
      const local = Cesium.Matrix4.fromTranslation(new Cesium.Cartesian3(0, 0, -c * 1.2));
      Cesium.Matrix4.multiply(local, Cesium.Matrix4.fromRotationTranslation(
        Cesium.Matrix3.multiply(
          Cesium.Matrix3.fromRotationZ(seed),
          Cesium.Matrix3.fromRotationY(c * 1.15),
          new Cesium.Matrix3()),
        Cesium.Cartesian3.ZERO), local);
      Cesium.Matrix4.multiplyByScale(local, new Cesium.Cartesian3(1, 1, 1 - c * 0.25), local);
      m.modelMatrix = Cesium.Matrix4.multiply(base, local, new Cesium.Matrix4());
    } else {
      m.modelMatrix = base;
    }
    if (d?.tint) {
      m.color = Cesium.Color.fromCssColorString(d.tint);
      m.colorBlendMode = Cesium.ColorBlendMode.MIX;
      m.colorBlendAmount = d.tintAmount ?? 0.5;
    } else {
      m.color = Cesium.Color.WHITE;
      m.colorBlendAmount = 0;
    }
    // HP 가 바닥나면 마스트는 서 있지 않는다 — 넘어진 것도 아니고 남아 있지 않다.
    // (잔해는 타격 장면이 탄공 둘레에 따로 뿌린다)
    m.show = !(d?.stage === 'ruin');
  }

  /**
   * 정밀타격 피해 연출 (화력 탭). dmg 가 null 이면 그 자산을 원래대로 되돌린다.
   *
   * 판정표에 「EO-01 완파」라고 적히면 지도의 그 마스트도 넘어가 있어야 한다.
   * 상태는 여기 들고 있고 실제 적용은 `_applyMatrix` 한 곳에서만 한다 — 그래야
   * 자산을 옮기거나 다시 그려도 피해가 유지된다.
   */
  setDamage(uid, dmg) {
    if (!this._damage) this._damage = new Map();
    if (dmg) this._damage.set(uid, dmg); else this._damage.delete(uid);
    const post = this.get(uid);
    if (post) this._applyMatrix(post);
  }

  async _ensureModel(post) {
    const t = POST_TYPE[post.type];
    if (!t?.model || this.models.get(post.uid)) return;
    try {
      const model = await Cesium.Model.fromGltfAsync({
        url: t.model,
        modelMatrix: this._matrix(post),
        id: { id: `post-${post.uid}` },
      });
      model.lightColor = new Cesium.Cartesian3(2.2, 2.2, 2.2);
      model.imageBasedLighting.imageBasedLightingFactor = new Cesium.Cartesian2(1.8, 1.8);
      trackEnvModel(model, { baseColor: [2.2, 2.2, 2.2], baseIBL: [1.8, 1.8], surfaceWeather: true });
      this.viewer.scene.primitives.add(model);
      this.models.set(post.uid, model);
    } catch (e) {
      console.warn('sensor post model load fail', post.type, e);
    }
  }

  // ═══ 배치 고스트 (팔레트 드래그 중) ═══
  showDropGhost(typeId, lon, lat) {
    const t = POST_TYPE[typeId];
    if (!t) return;
    const atm = this._atm();
    const perf = atm
      ? effectiveRanges({ band: t.band, dri: t.dri, fov: t.fov }, atm, { illuminated: false })
      : { range: t.dri[0], specRange: t.dri[0], factor: 1 };
    const h = this.ctx.groundHint ?? 0;
    const state = {
      lon, lat, h,
      eff: this._fanPositions(lon, lat, SITE.sector.centerAz, t.fov, perf.range),
      spec: this._fanPositions(lon, lat, SITE.sector.centerAz, t.fov, perf.specRange),
      text: `${t.name} · 실효 ${fmtM(perf.range)} (청천 ${fmtM(perf.specRange)})`,
      color: t.color,
    };
    this._ghostState = state;
    if (!this._ghost) {
      const e = this.ds.entities;
      this._ghost = {
        specLine: e.add({
          id: 'post-ghost-spec',
          polyline: {
            positions: new Cesium.CallbackProperty(() => this._ghostState.spec, false),
            width: 1.6, clampToGround: true,
            material: new Cesium.PolylineDashMaterialProperty({
              color: new Cesium.CallbackProperty(() => css(this._ghostState.color).withAlpha(0.4), false),
              dashLength: 14,
            }),
          },
        }),
        effFill: e.add({
          id: 'post-ghost-fill',
          polygon: {
            hierarchy: new Cesium.CallbackProperty(
              () => new Cesium.PolygonHierarchy(this._ghostState.eff), false),
            material: new Cesium.ColorMaterialProperty(new Cesium.CallbackProperty(
              () => css(this._ghostState.color).withAlpha(0.13 + 0.05 * Math.sin(performance.now() / 240)), false)),
            classificationType: Cesium.ClassificationType.TERRAIN,
          },
        }),
        label: e.add({
          id: 'post-ghost-label',
          position: new Cesium.CallbackProperty(
            () => D(this._ghostState.lon, this._ghostState.lat, this._ghostState.h + 10), false),
          label: {
            text: new Cesium.CallbackProperty(() => this._ghostState.text, false),
            font: '600 12px "Pretendard GOV", sans-serif',
            fillColor: new Cesium.CallbackProperty(() => css(this._ghostState.color), false),
            showBackground: true,
            backgroundColor: css('#0b1420').withAlpha(0.86),
            backgroundPadding: new Cesium.Cartesian2(9, 5),
            pixelOffset: new Cesium.Cartesian2(0, -14),
            disableDepthTestDistance: Number.POSITIVE_INFINITY,
          },
        }),
      };
    }
  }

  hideDropGhost() {
    if (!this._ghost) return;
    for (const ent of Object.values(this._ghost)) this.ds.entities.remove(ent);
    this._ghost = null;
  }

  // ═══ 그리기 ═══
  _fanPositions(lon, lat, aimAz, fov, radius) {
    const pts = [];
    if (fov >= 360) {
      for (let a = 0; a <= 360; a += 5) {
        const q = offset(lon, lat, a, radius);
        pts.push(q.lon, q.lat);
      }
    } else {
      pts.push(lon, lat);
      const half = fov / 2;
      for (let a = -half; a <= half; a += Math.max(2, fov / 48)) {
        const q = offset(lon, lat, aimAz + a, radius);
        pts.push(q.lon, q.lat);
      }
      pts.push(lon, lat);
    }
    return Cesium.Cartesian3.fromDegreesArray(pts);
  }

  /**
   * 시간 배속 재생은 이 함수를 4 Hz 로 부른다. 실효거리가 10 m 단위로 같고 배치도
   * 그대로면 엔티티를 다시 세울 이유가 없다 — 서명이 같으면 그냥 돌아간다.
   */
  redraw(force = false) {
    const atm = this._atm();
    const sig = this.posts.map((p) => {
      const perf = this.perfOf(p, atm);
      // 발전기는 보는 장비가 아니라 실효거리가 없다 — 가동 여부만 서명에 넣는다
      if (!perf) {
        return `${p.uid}:${p.lon.toFixed(6)},${p.lat.toFixed(6)},gen${p.running === false ? 0 : 1}`;
      }
      return `${p.uid}:${p.lon.toFixed(6)},${p.lat.toFixed(6)},${p.mastH},${Math.round(p.aimAz)},`
        + `${Math.round(perf.range / 10)},${Math.round(perf.dri[1] / 10)},${Math.round(perf.dri[2] / 10)}`;
    }).join('|') + `#${this.selectedUid ?? ''}#${this.showGhostRings ? 1 : 0}`;
    if (!force && sig === this._sig) return;
    this._sig = sig;

    this.ds.entities.removeAll();
    this._ghost = null;
    for (const p of this.posts) {
      const t = POST_TYPE[p.type];
      if (!t) continue;
      const perf = this.perfOf(p, atm);
      const sel = this.selectedUid === p.uid;
      const e = this.ds.entities;
      const col = css(t.color);

      // 발전기 — 부채꼴도 DRI 호도 없다. 모델과 라벨만 세운다.
      if (!perf) {
        // 실물 모델은 _ensureModel 이 프리미티브로 이미 세워 두었다 — 여기서는 라벨만.
        e.add({
          id: `post-${p.uid}-label`,
          position: D(p.lon, p.lat, (p.groundH ?? 0) + (p.mastH ?? 1.5) + 2),
          label: {
            text: `${t.icon} ${p.name}\n${t.genW}W · ${p.running === false ? '정지' : '가동'}`,
            font: '600 12px "Chakra Petch", monospace',
            fillColor: p.running === false ? css('#ed5d5d') : col,
            outlineColor: css('#000'), outlineWidth: 3,
            style: Cesium.LabelStyle.FILL_AND_OUTLINE,
            pixelOffset: new Cesium.Cartesian2(0, -18),
            disableDepthTestDistance: Number.POSITIVE_INFINITY,
          },
        });
        continue;
      }

      // 부채꼴·호·축선은 선택된 자산에서만 그린다 — 여러 자산을 동시에 세우면
      // 겹친 반투명 폴리곤이 뭉개져 아무것도 안 보인다. 선택 안 한 자산은
      // 모델·마스트·이름표만 남긴다.
      if (sel) {
        // ① 청천 제원 부채꼴 (점선) — 「맑았으면 여기까지」
        if (this.showGhostRings && perf.specRange > perf.range * 1.02) {
          e.add({
            id: `post-${p.uid}-spec`,
            polyline: {
              positions: this._fanPositions(p.lon, p.lat, p.aimAz, t.fov, perf.specRange),
              width: 1.4, clampToGround: true,
              material: new Cesium.PolylineDashMaterialProperty({
                color: col.withAlpha(0.34), dashLength: 14,
              }),
            },
          });
        }

        // ② 현재 실효 부채꼴 — 채움 + 외곽선
        const eff = this._fanPositions(p.lon, p.lat, p.aimAz, t.fov, Math.max(40, perf.range));
        e.add({
          id: `post-${p.uid}-fill`,
          polygon: {
            hierarchy: new Cesium.PolygonHierarchy(eff),
            material: col.withAlpha(0.20),
            classificationType: Cesium.ClassificationType.TERRAIN,
          },
        });
        e.add({
          id: `post-${p.uid}-edge`,
          polyline: {
            positions: eff, width: 3, clampToGround: true,
            material: col.withAlpha(0.95),
          },
        });

        // ③ 인지·식별 호 (광학·화기만) — 「보이는 것」과 「누구인지 아는 것」의 차이
        if (t.band === 'vis' || t.band === 'lwir' || t.band === 'eye') {
          [1, 2].forEach((i) => {
            if (perf.dri[i] < 60) return;
            e.add({
              id: `post-${p.uid}-dri${i}`,
              polyline: {
                positions: this._fanPositions(p.lon, p.lat, p.aimAz, t.fov, perf.dri[i]),
                width: 1.1, clampToGround: true,
                material: col.withAlpha(0.42),
              },
            });
          });
        }

        // ④ 지향 축선
        const tip = offset(p.lon, p.lat, p.aimAz, Math.max(60, perf.range));
        if (t.fov < 360) {
          e.add({
            id: `post-${p.uid}-axis`,
            polyline: {
              positions: Cesium.Cartesian3.fromDegreesArray([p.lon, p.lat, tip.lon, tip.lat]),
              width: 1.2, clampToGround: true,
              material: new Cesium.PolylineDashMaterialProperty({ color: col.withAlpha(0.5), dashLength: 20 }),
            },
          });
        }
      }

      // 마스트 기둥
      e.add({
        id: `post-${p.uid}-mast`,
        position: D(p.lon, p.lat, p.groundH + p.mastH / 2),
        cylinder: {
          length: p.mastH, topRadius: 0.25, bottomRadius: 0.4,
          material: col.withAlpha(sel ? 0.85 : 0.5),
        },
      });

      // ⑤ 라벨 — 이름 · 실효/청천 · 제한요인
      //
      // 기본 4종을 GP 옆에 붙여 세우면(감시탑 반경 수십 m 안) 자산마다 2줄짜리 라벨이
      // 같은 화면 자리에 겹쳐 뭉개진다. 선택된 자산만 전체 제원을 보여주고, 나머지는
      // 이름 한 줄로 줄여 겹침을 줄인다 — 자세한 값은 목록 패널에도 그대로 있다.
      const dim = perf.factor < 0.98;
      e.add({
        id: `post-${p.uid}-label`,
        position: D(p.lon, p.lat, p.groundH + p.mastH + 6),
        label: {
          text: sel
            ? `${t.icon} ${p.name}  ${fmtM(perf.range)}`
              + (dim ? ` (${Math.round(perf.factor * 100)}%)` : '')
              + `\n${Math.round(p.aimAz)}° / ${t.fov}° · 마스트 ${p.mastH.toFixed(0)}m`
            : `${t.icon} ${p.name}`,
          font: `${sel ? 700 : 600} 11px "Chakra Petch", sans-serif`,
          fillColor: dim ? css(perf.factor < 0.4 ? '#ed5d5d' : '#e3b341') : col,
          showBackground: true,
          backgroundColor: css('#0b1420').withAlpha(sel ? 0.92 : 0.76),
          backgroundPadding: new Cesium.Cartesian2(7, 4),
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
          scaleByDistance: new Cesium.NearFarScalar(1200, 1, 22000, 0.4),
          distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 26000),
          pixelOffset: new Cesium.Cartesian2(0, -10),
        },
      });

      // ⑥ C-UAS 반구 돔
      if (sel && t.band === 'rf') {
        e.add({
          id: `post-${p.uid}-dome`,
          position: D(p.lon, p.lat, p.groundH),
          ellipsoid: {
            radii: new Cesium.Cartesian3(perf.range, perf.range, perf.range),
            maximumCone: Cesium.Math.PI_OVER_TWO,
            material: col.withAlpha(0.06),
            outline: true, outlineColor: col.withAlpha(0.4),
            slicePartitions: 20, stackPartitions: 10,
          },
        });
      }
    }
  }

  /** 커버리지·피드가 쓰는 정규화 스냅샷 */
  snapshot() {
    const atm = this._atm();
    return this.posts.map((p) => {
      const t = POST_TYPE[p.type];
      const perf = this.perfOf(p, atm);
      return {
        uid: p.uid, name: p.name, type: p.type, typeName: t.name, color: t.color,
        band: t.band, feed: t.feed, fov: t.fov,
        lon: p.lon, lat: p.lat, groundH: p.groundH, mastH: p.mastH,
        eyeH: this.eyeH(p), aimAz: p.aimAz, perf,
      };
    });
  }

  /** 특정 지점이 이 초소의 시야각·유효거리 안인가 (지형 LOS 는 호출자 몫) */
  static inFovRange(post, lon, lat, range = post.perf.range) {
    const d = distM(post.lon, post.lat, lon, lat);
    if (d > range) return null;
    if (post.fov < 360 && Math.abs(azDelta(azimuthDeg(post.lon, post.lat, lon, lat), post.aimAz)) > post.fov / 2) {
      return null;
    }
    return d;
  }
}
