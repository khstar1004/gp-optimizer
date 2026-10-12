// @ts-nocheck
/**
 * 실도로 정보 — 국가교통정보센터(ITS) 실시간 소통정보.
 *
 * KAIROS 원본 `assessRouteRoad` 는 수도권 시나리오의 9-1 도로정보표를 매칭해
 * roadScore 를 만든다. GP 합성 부지에는 그 표가 없어 그동안 경사 프로파일로 대체했는데,
 * ITS 공개 API 가 이 지역(금강산로·삼팔선로 등) 실제 링크의 제한속도 대비 주행속도를
 * 돌려주므로, 그 값으로 roadScore 를 만들어 원본 scoreRouteOption 에 넘긴다.
 *
 * 서버가 `/its/*` 로 프록시하며 apiKey 는 서버에서 주입한다(프런트 미노출).
 * 엔드포인트: trafficInfo(소통) · eventInfo(돌발). 링크 지오메트리는 제공되지 않아
 * 도로명·속도 집계까지만 쓴다.
 */
import { SITE } from './data';

/** 자유속도 가정 (km/h) — 지방부 2차선 기준. roadScore 정규화에만 쓴다. */
const FREE_FLOW_KMH = 60;

let cache = null;

function bboxAround(center, halfDeg = 0.25) {
  return {
    minX: (center.lon - halfDeg).toFixed(4), maxX: (center.lon + halfDeg).toFixed(4),
    minY: (center.lat - halfDeg).toFixed(4), maxY: (center.lat + halfDeg).toFixed(4),
  };
}

async function itsFetch(endpoint, params) {
  const q = new URLSearchParams({ ...params, getType: 'json', type: 'all' });
  const res = await fetch(`/its/${endpoint}?${q}`);
  if (!res.ok) throw new Error(`ITS ${endpoint} ${res.status}`);
  const json = await res.json();
  if (json?.header?.resultCode !== 0) {
    throw new Error(json?.header?.resultMsg || `ITS ${endpoint} 오류`);
  }
  return json.body ?? { totalCount: 0, items: [] };
}

/**
 * GP 주변 실시간 소통정보 조회 + 도로명별 집계.
 * @returns { totalLinks, roads: [{ roadName, links, avgSpeed, minSpeed, roadScore }], events, roadScore }
 */
export async function loadRoadInfo(center = SITE.gp, halfDeg = 0.25) {
  const bbox = bboxAround(center, halfDeg);
  const [traffic, events] = await Promise.all([
    itsFetch('trafficInfo', bbox),
    itsFetch('eventInfo', { ...bbox, eventType: 'all' }).catch(() => ({ totalCount: 0, items: [] })),
  ]);

  const byRoad = new Map();
  for (const item of traffic.items ?? []) {
    const name = item.roadName || '(무명)';
    const speed = Number(item.speed);
    if (!Number.isFinite(speed)) continue;
    if (!byRoad.has(name)) byRoad.set(name, { roadName: name, links: 0, sum: 0, minSpeed: Infinity });
    const r = byRoad.get(name);
    r.links += 1;
    r.sum += speed;
    r.minSpeed = Math.min(r.minSpeed, speed);
  }

  const roads = [...byRoad.values()].map((r) => {
    const avgSpeed = r.sum / r.links;
    // roadScore: 자유속도 대비 주행속도 (0~100). KAIROS scoreRouteOption 의 roadScore 자리에 들어간다.
    const roadScore = Math.max(0, Math.min(100, Math.round((avgSpeed / FREE_FLOW_KMH) * 100)));
    return {
      roadName: r.roadName, links: r.links,
      avgSpeed: Math.round(avgSpeed * 10) / 10,
      minSpeed: r.minSpeed === Infinity ? null : r.minSpeed,
      roadScore,
    };
  }).sort((a, b) => b.links - a.links);

  // 지역 대표 roadScore = 링크 가중 평균
  const totalLinks = roads.reduce((a, r) => a + r.links, 0);
  const roadScore = totalLinks
    ? Math.round(roads.reduce((a, r) => a + r.roadScore * r.links, 0) / totalLinks)
    : null;

  cache = {
    totalLinks,
    roads,
    events: events.items ?? [],
    eventCount: events.totalCount ?? 0,
    roadScore,
    fetchedAt: new Date(),
  };
  return cache;
}

export function cachedRoadInfo() { return cache; }
export function clearRoadInfo() { cache = null; }

/**
 * KAIROS scoreRouteOption 에 넘길 roadAssessment.
 * 실도로 데이터가 있으면 그 값을, 없으면 호출부가 준 경사 기반 대체값을 쓴다.
 */
export function roadAssessment(fallbackRoadScore) {
  if (cache?.roadScore != null) {
    const top = cache.roads[0];
    return {
      roadScore: cache.roadScore,
      roadLabel: top ? `${top.roadName} 외 ${Math.max(0, cache.roads.length - 1)}개` : 'ITS 실시간',
      roadStatus: '실측',
      roadBasis: `국가교통정보센터 실시간 소통정보 ${cache.totalLinks}개 링크 · 평균 대비 자유속도 ${FREE_FLOW_KMH}km/h`,
      live: true,
    };
  }
  return {
    roadScore: fallbackRoadScore,
    roadLabel: '경사 대체',
    roadStatus: '미확인',
    roadBasis: '실도로 데이터 없음 — 축선 경사 프로파일로 대체',
    live: false,
  };
}

