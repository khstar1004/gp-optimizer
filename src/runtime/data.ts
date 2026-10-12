/**
 * GP Digital Twin 도메인 데이터 (슬림) — 합성 데모 데이터. 실좌표·실기준 아님.
 */
import { svgIcon } from './icons';
import { resolveActiveSite } from './terrainCatalog';

// ───────── 사이트 ─────────
// 활성 세션이 고른 지형(terrainCatalog)에서 만든다 — 지형 선택이 없으면(구버전 세션·
// 이 기능 미사용) 과거 유일 기본값이던 GP-107(지형 탐색으로 선정한 능선 정상부,
// 표고 ~1,025m, 북측 217m 감제)로 그대로 폴백한다.
export const SITE = resolveActiveSite();

// ───────── 환경 프리셋 (자주 쓰는 조합 바로가기) ─────────
// 조명·안개를 직접 켜고 끄는 스위치가 아니다 — 환경 모델의 입력(연중일자·분·
// 날씨·강도·풍속)만 지정하고, 하늘·조도·안개·임무영향은 모델이 계산한다.
// 그래야 「야간」 프리셋의 일몰 시각이 계절 슬라이더를 따라 움직인다.
export const ENV_PRESETS = [
  { id: 'clear-day', name: '주간 · 청명', patch: { minuteOfDay: 600, weather: 'clear', intensity: 0.3 } },
  { id: 'dusk', name: '일몰 · EENT', patch: { minuteOfDay: 1130, weather: 'clear', intensity: 0.35 } },
  { id: 'night', name: '야간', patch: { minuteOfDay: 60, weather: 'clear', intensity: 0.2 } },
  { id: 'fog', name: '짙은 안개', patch: { minuteOfDay: 400, weather: 'fog', intensity: 0.85 } },
  { id: 'night-fog', name: '야간 + 안개', patch: { minuteOfDay: 90, weather: 'fog', intensity: 0.8 } },
  { id: 'winter-snow', name: '동계 강설', patch: { dayOfYear: 20, minuteOfDay: 840, weather: 'snow', intensity: 0.75, windMps: 6 } },
  { id: 'monsoon', name: '우기 호우', patch: { dayOfYear: 195, minuteOfDay: 900, weather: 'rain', intensity: 0.85, windMps: 8 } },
];

// ───────── 침투 축선 (합성) ─────────
// 이동 수단별 속도(m/s): walk 급속행군(산악), run 구보, vehicle 야지 차량
export const MOVE_MODES = {
  walk: { id: 'walk', name: '도보 침투 (급속행군)', speed: 1.4, model: 'assets/soldier.glb', scale: 1.7, maxSlopeDeg: 38, icon: svgIcon('walk') },
  run: { id: 'run', name: '구보 돌파', speed: 3.2, model: 'assets/soldier.glb', scale: 1.7, maxSlopeDeg: 30, icon: svgIcon('run') },
  vehicle: { id: 'vehicle', name: '차량 침투 (야지기동)', speed: 8.5, model: 'assets/enemy_tank.glb', scale: 1.0, maxSlopeDeg: 24, icon: svgIcon('truck') },
};

export const INFIL_ROUTES = [
  {
    id: 'r1', name: '축선 1 — 계곡 은폐접근', color: '#ff5252',
    waypoints: [
      [128.1105, 38.3565], [128.1128, 38.3488], [128.1162, 38.3421],
      [128.1190, 38.3352], [128.1218, 38.3315], [128.1240, 38.3300],
    ],
  },
  {
    id: 'r2', name: '축선 2 — 능선 직진접근', color: '#ff7043',
    waypoints: [
      [128.1252, 38.3580], [128.1250, 38.3500], [128.1251, 38.3420],
      [128.1250, 38.3350], [128.1250, 38.3305],
    ],
  },
  {
    id: 'r3', name: '축선 3 — 동측 사면 우회', color: '#ffab40',
    waypoints: [
      [128.1400, 38.3555], [128.1372, 38.3470], [128.1348, 38.3390],
      [128.1315, 38.3345], [128.1282, 38.3308],
    ],
  },
  {
    id: 'r4', name: '축선 4 — 서측 저지대 침투', color: '#ffd740',
    waypoints: [
      [128.1050, 38.3520], [128.1077, 38.3440], [128.1105, 38.3360],
      [128.1150, 38.3322], [128.1200, 38.3298],
    ],
  },
];

