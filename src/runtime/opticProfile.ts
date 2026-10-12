// @ts-nocheck
/**
 * 광학 프로파일 — 「어느 자산의 눈으로 보는가」를 한 곳에 적는다.
 *
 * 1인칭(fpv.ts)과 센서 피드 창(sensorFeed.ts)은 서로 다른 화면이지만, 같은 자산을
 * 보고 있다면 같은 것을 보여 줘야 한다. TOD 로 들어갔는데 1인칭은 컬러이고 피드
 * 창만 열상이면 그 둘 중 하나는 거짓말이다. 그래서 「이 자산의 눈이 어떤 눈인가」
 * — 파장대·배율 단계·접안 마스크·조준선 모양·화면에 뜨는 계기 — 를 여기 한 벌만
 * 두고 양쪽이 같이 읽는다.
 *
 * 프로파일이 들고 있는 것:
 *   band      sensorPerformance 파장대. 실효거리와 화면 색조가 여기서 갈린다.
 *   fov0      ×1 배율에서의 수평 시야각(도). 열상은 좁고 육안은 넓다.
 *   zooms     배율 단계 — 실물 광학은 연속 줌이 아니라 단계 전환이다(딸깍).
 *   mask      접안 마스크: 원형 접안경 / 쌍안경 8자 / 사각 프레임 / 없음
 *   reticle   조준선: 밀 격자 / 열상 십자 / 탄도 사다리 / 짐벌 크로스
 *   palette   기본 화면 극성: vis(컬러) · wh(백열) · bh(흑열) · nvg(야시)
 *   gauges    HUD 에 띄울 계기 묶음 (opticHud 가 해석)
 *   tracker   자동추적 가능 여부 — 표적을 물면 짐벌이 스스로 따라간다
 *   slewDegS  최대 슬루 속도(°/s). 무한대가 아니어야 「놓친다」가 성립한다 —
 *             빠른 표적이 화면 밖으로 벗어나는 것이 곧 그 장비의 한계다.
 */
import { POST_TYPE } from './sensorPosts';

/** POST_TYPES 의 청천 제원을 그대로 빌려 쓴다 — 숫자를 두 군데 적지 않기 위해. */
const specOf = (postTypeId, fallback) => {
  const t = POST_TYPE[postTypeId];
  return t ? { band: t.band, dri: t.dri, fov: t.fov } : fallback;
};

export const OPTICS = {
  // ── 열상감시장비 (TOD) ─────────────────────────────────────────────────
  tod: {
    id: 'tod', short: 'TOD', name: '열상감시장비 (TOD)', color: '#f28dbb',
    band: 'lwir', fov0: 24, zooms: [1, 2, 4, 8], mask: 'eyepiece', reticle: 'thermal',
    palette: 'wh', polarity: true, lrf: true, nuc: true, scanline: true,
    spec: specOf('ir', { band: 'lwir', dri: [2800, 950, 480], fov: 60 }),
    gauges: ['track', 'lrf', 'perf', 'thermal', 'env', 'plan'],
    tracker: true, slewDegS: 18,
    hint: '드래그 슬루 · 휠 배율단 · T 추적 · C 인계 · I 조명 · S 보고 · P 극성 · L 측거 · N NUC · ESC 종료',
  },
  // ── 주간 EO 카메라 ─────────────────────────────────────────────────────
  eo: {
    id: 'eo', short: 'EO', name: 'EO 주간관측카메라', color: '#5eb1ef',
    band: 'vis', fov0: 42, zooms: [1, 2, 4, 8, 16], mask: 'rect', reticle: 'mil',
    palette: 'vis', polarity: false, lrf: true, nightNvg: true, scanline: false,
    spec: specOf('eo', { band: 'vis', dri: [3500, 1200, 600], fov: 90 }),
    gauges: ['track', 'lrf', 'perf', 'light', 'env', 'plan'],
    tracker: true, slewDegS: 26,
    hint: '드래그 슬루 · 휠 배율단 · T 추적 · C 인계 · I 조명 · S 보고 · L 측거 · 저조도 자동 야시 · ESC 종료',
  },
  // ── 지상감시레이더 콘솔 ────────────────────────────────────────────────
  gsr: {
    id: 'gsr', short: 'GSR', name: '지상감시레이더 (X-band)', color: '#b18cff',
    band: 'radar', fov0: 60, zooms: [1, 2], mask: 'rect', reticle: 'gate',
    palette: 'radar', polarity: false, lrf: false, scanline: true,
    spec: specOf('radar', { band: 'radar', dri: [5000, 3200, 1500], fov: 120 }),
    gauges: ['track', 'ppi', 'perf', 'env'],
    tracker: true, slewDegS: 40,
    hint: '드래그 슬루 · T 추적 · C 인계 · S 보고 · PPI 스코프에 스윕·블립이 함께 돈다 · ESC 종료',
  },
  // ── 음향탐지 어레이 ────────────────────────────────────────────────────
  acu: {
    id: 'acu', short: 'ACU', name: '음향탐지 어레이', color: '#ffd54f',
    band: 'acoustic', fov0: 70, zooms: [1, 2], mask: 'none', reticle: 'bearing',
    palette: 'vis', polarity: false, lrf: false, scanline: false,
    spec: specOf('acoustic', { band: 'acoustic', dri: [900, 600, 300], fov: 360 }),
    gauges: ['audio', 'perf', 'env'],
    tracker: false,
    hint: '비가시선 탐지 — 방위 로즈와 대역 워터폴로 표적을 잡는다 · ESC 종료',
  },
  // ── 대드론 재머 ────────────────────────────────────────────────────────
  cuas: {
    id: 'cuas', short: 'CUAS', name: '대드론 재머 콘솔', color: '#63dfff',
    band: 'rf', fov0: 55, zooms: [1, 2], mask: 'rect', reticle: 'dome',
    palette: 'vis', polarity: false, lrf: false, scanline: false,
    spec: specOf('cuas', { band: 'rf', dri: [800, 800, 800], fov: 360 }),
    gauges: ['rf', 'perf', 'env'],
    tracker: false,
    hint: 'RF 차단 반구 — 대역별 재밍 출력과 링크 차단 상태 · ESC 종료',
  },
  // ── 조명탄 발사대 ──────────────────────────────────────────────────────
  ill: {
    id: 'ill', short: 'ILL', name: '조명탄 발사대 관측구', color: '#ffe08a',
    band: 'eye', fov0: 50, zooms: [1, 2, 4], mask: 'rect', reticle: 'mil',
    palette: 'vis', polarity: false, lrf: true, nightNvg: true, scanline: false,
    spec: specOf('flare', { band: 'flare', dri: [2000, 2000, 2000], fov: 360 }),
    gauges: ['lrf', 'light', 'env', 'plan'],
    tracker: false, slewDegS: 30,
    hint: 'I 조명 발사 — 반경 안의 EO·육안 유효거리가 그 30초 동안 되살아난다 · ESC 종료',
  },
  // ── 중화기 조준경 ──────────────────────────────────────────────────────
  gun: {
    id: 'gun', short: 'SCOPE', name: '중화기 조준경', color: '#f2a33c',
    band: 'eye', fov0: 24, zooms: [1, 4], mask: 'eyepiece', reticle: 'bdc',
    palette: 'vis', polarity: false, lrf: true, nightNvg: true, scanline: false,
    spec: specOf('hmg', { band: 'eye', dri: [1800, 900, 450], fov: 150 }),
    gauges: ['track', 'lrf', 'ballistic', 'perf', 'env', 'plan'],
    // 화기는 스스로 표적을 쫓지 않는다 — 사람이 조준한다. 추적은 지시선으로만 돕는다.
    tracker: false, slewDegS: 45,
    hint: '탄도 사다리 · T 표적 지시 · I 조명 요청 · S 보고 · L 측거 후 해당 눈금에 얹는다 · ESC 종료',
  },
  // ── 정찰드론 짐벌 ──────────────────────────────────────────────────────
  drone: {
    id: 'drone', short: 'UAS', name: '정찰드론 짐벌 (EO/IR)', color: '#63dfff',
    band: 'vis', fov0: 50, zooms: [1, 2, 4, 8], mask: 'rect', reticle: 'gimbal',
    palette: 'vis', polarity: true, lrf: true, nightNvg: true, scanline: false,
    spec: { band: 'vis', dri: [2600, 900, 450], fov: 50 },
    gauges: ['track', 'flight', 'lrf', 'link', 'env'],
    tracker: true, slewDegS: 34,
    hint: '드래그 짐벌 · 휠 고도 · P EO/IR 전환 · L 거리측정 · Z 배율단 · ESC 종료',
  },
  // ── 감시탑·초소 쌍안경 ─────────────────────────────────────────────────
  bino: {
    id: 'bino', short: 'M22', name: '쌍안경 관측', color: '#f2a33c',
    band: 'eye', fov0: 60, zooms: [1, 2, 4, 7, 10], mask: 'bino', reticle: 'mil',
    palette: 'vis', polarity: false, lrf: true, nightNvg: true, scanline: false,
    spec: { band: 'eye', dri: [2400, 1100, 550], fov: 120 },
    gauges: ['track', 'lrf', 'light', 'env', 'plan'],
    tracker: false, slewDegS: 60,
    hint: '휠 배율단(1×~10×) · T 표적 지시 · C 인계 · I 조명 · S 보고 · L 측거 · B 맨눈 · ESC 종료',
  },
  // ── 맨눈 (마스크 없음) ─────────────────────────────────────────────────
  naked: {
    id: 'naked', short: 'EYE', name: '육안 관측', color: '#d9e3ea',
    band: 'eye', fov0: 62, zooms: [1], mask: 'none', reticle: 'none',
    palette: 'vis', polarity: false, lrf: false, nightNvg: true, scanline: false,
    spec: { band: 'eye', dri: [1600, 700, 320], fov: 120 },
    gauges: ['light', 'env', 'plan'],
    tracker: false, slewDegS: 60,
    hint: '드래그 둘러보기 · B 쌍안경 들기 · S 관측보고 · ESC 종료',
  },
};

/**
 * 배치 초소 유형 → 광학 프로파일.
 *
 * 화면이 없는 자산(매설 센서·광망·크레모아·발전기)도 1인칭에 들어갈 수는 있다 —
 * 그 자리에 서서 자기 부채꼴을 눈으로 확인하는 일이므로, 사람의 눈(쌍안경)을 준다.
 * 없는 화면을 지어내지 않는 것이 규칙이다.
 */
const BY_POST_TYPE = {
  eo: 'eo', ir: 'tod', radar: 'gsr', acoustic: 'acu',
  cuas: 'cuas', flare: 'ill', hmg: 'gun', agl: 'gun',
  cctv: 'eo', drd: 'gsr', light: 'ill', mortar: 'gun',
  ugs: 'bino', fence: 'bino', claymore: 'gun', genset: 'bino',
};

/** 기본 거치대(MOUNTS) 키 → 광학 프로파일 */
const BY_MOUNT = {
  eo: 'eo', ir: 'tod', radar: 'gsr', acoustic: 'acu',
  cuas: 'cuas', flare: 'ill', weapon: 'gun', drone: 'drone',
};

export const opticById = (id) => OPTICS[id] ?? OPTICS.bino;
export const opticForPostType = (typeId) => OPTICS[BY_POST_TYPE[typeId] ?? 'eo'];
export const opticForMount = (key) => OPTICS[BY_MOUNT[key] ?? 'eo'];

/** 배율 단계 목록에서 현재 단계의 시야각 */
export const fovAtZoom = (optic, zoom) => optic.fov0 / Math.max(0.01, zoom);

/**
 * 자산이 아닌 관측점(감시탑·시설 층·가설 관측점)의 기본 광학.
 * 사람이 서 있는 자리이므로 맨눈에서 시작하고 B 로 쌍안경을 든다.
 */
export const humanOptic = () => OPTICS.naked;
