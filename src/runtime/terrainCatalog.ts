// @ts-nocheck
/**
 * 지형 목록 — 세션을 새로 만들 때 「어느 GP」로 시작할지 고르는 카탈로그.
 *
 * 지금은 실사 블렌더 정밀지형(수목·도로·건물 디오라마)이 구축된 GP가 GP-107
 * 한 곳뿐이다. 그 GLB는 이 좌표로만 구운 것이라 다른 위치에 켜면 엉뚱한 자리에
 * 지형이 뜬다 — 그래서 다른 위치 세션은 「정밀지형 없음, 위성영상만」으로 시작하고
 * 좌표를 직접 지정한다. 나중에 정밀지형을 더 구우면 TERRAIN_CATALOG에 항목만
 * 추가하면 된다(구조는 이미 목록 기반).
 *
 * data.ts의 SITE는 모듈 로드 시 이 파일의 resolveActiveSite()를 1회 호출해 만든다 —
 * 세션마다 「완전히 새로운 시작」이 되려면 지형·타워·부지조성이 전부 부팅 시 한 번만
 * 구성되는 이 앱 구조상 지형이 다른 세션으로 넘어갈 때 페이지를 새로고침해야 한다
 * (sessionRegistry.switchTo 참고) — 그래서 SITE는 "부팅 시점의 활성 세션"만 안다.
 */
const SESSIONS_KEY = 'gp-digital-twin:sessions';
const ACTIVE_KEY = 'gp-digital-twin:activeSessionId';

export const CUSTOM_TERRAIN_ID = 'custom';

export const TERRAIN_CATALOG = [
  {
    id: 'gp-107',
    name: 'GP-107 정밀지형',
    hasPrecision: true,
    blurb: '실사 3D 디오라마(한국 수종 숲·3D 도로·감시탑)가 구축된 유일한 GP. 「블렌더 3D 정밀지형」 토글을 쓸 수 있습니다.',
  },
  {
    id: CUSTOM_TERRAIN_ID,
    name: '다른 위치 (정밀지형 없음)',
    hasPrecision: false,
    blurb: '위성영상·기본 지형만 사용합니다. 좌표를 직접 입력하세요 — 그 GP만의 완전히 새로운 세션입니다.',
  },
];

const GP107_SITE = {
  name: 'GP-107 (합성)',
  gp: { lon: 128.125, lat: 38.328 },
  hub: { lon: 128.128, lat: 38.262 },
  sector: { centerAz: 0, halfAngle: 75, minR: 150, maxR: 4000 },
  camera: { home: { lon: 128.125, lat: 38.277, height: 8200, heading: 0, pitch: -38 } },
};

export function findTerrain(id) {
  return TERRAIN_CATALOG.find((t) => t.id === id) ?? null;
}

/** 사용자 지정 좌표로 하나 만든다 — hub·조망 카메라는 GP-107과 같은 상대 오프셋을 재사용. */
function buildCustomSite(gp, hub, name) {
  const hubPoint = (hub && Number.isFinite(hub.lon) && Number.isFinite(hub.lat))
    ? hub : { lon: gp.lon + 0.003, lat: gp.lat - 0.066 };
  return {
    name: (name ?? '').trim() || '사용자 지정 GP',
    gp, hub: hubPoint,
    sector: { centerAz: 0, halfAngle: 75, minR: 150, maxR: 4000 },
    camera: { home: { lon: gp.lon, lat: gp.lat - 0.049, height: 8200, heading: 0, pitch: -38 } },
  };
}

function readSessions() {
  try {
    const parsed = JSON.parse(localStorage.getItem(SESSIONS_KEY) ?? '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch { return []; }
}

/**
 * data.ts가 모듈 로드 시 딱 1회 호출한다. 활성 세션에 지형 선택이 없거나 읽기에
 * 실패하면 항상 GP-107(과거 유일 기본값)로 안전 폴백 — 이 기능을 쓰지 않는
 * 사용자·구버전 세션엔 아무 영향이 없어야 한다.
 */
export function resolveActiveSite() {
  try {
    const activeId = localStorage.getItem(ACTIVE_KEY);
    const session = readSessions().find((s) => s?.id === activeId);
    const terrain = session?.terrain;
    if (terrain?.catalogId === CUSTOM_TERRAIN_ID && terrain.gp
      && Number.isFinite(terrain.gp.lon) && Number.isFinite(terrain.gp.lat)) {
      return { ...buildCustomSite(terrain.gp, terrain.hub, terrain.name), hasPrecisionTerrain: false };
    }
  } catch { /* noop — 아래 기본값으로 폴백 */ }
  return { ...GP107_SITE, hasPrecisionTerrain: true };
}
