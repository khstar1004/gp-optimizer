/**
 * 부지 종합 진단 — 현재 배치를 토목·군 시설배치 교리 기준으로 채점한다.
 *
 * 앞서 만든 데이터(GLB 표면 접지·경사·성토량·옹벽고, 접근로 MST·종단경사)를 그대로 읽어
 * ① 토공 적정성 ② 건축적지 활용 ③ 순환(차량 후송) ④ 위험물 이격 ⑤ C2·의무 배치 를
 * 평가하고, 구체적 개선 소견과 종합 점수를 낸다. 순수 함수 — placer 상태만 읽는다.
 *
 * `slopeVerdict`/`SLOPE_LIMITS`를 `./siteEngineering`에서 가져온다(`./placement`가
 * 아니다) — 그 이유는 그 파일 상단 주석 참고: 이 모듈이 Cesium 없이도 단위시험이
 * 가능해야 하는데 `placement.ts`는 전역 Cesium 을 즉시 참조해서 Node 에서 못 불러온다.
 */
import { distM } from './geo';
import { SLOPE_LIMITS } from './siteEngineering';

/** diagnoseSite 가 실제로 읽는 배치 항목의 최소 형태 — PlacementManager.items 의 부분집합. */
export interface DiagnosticItem {
  uid: string;
  spec: { id: string; name: string; category: string };
  lon: number;
  lat: number;
  functionTag?: string | null;
  details?: { hazard?: string } | null;
  fillM3?: number | null;
  wallMaxM?: number | null;
  slopeDeg?: number | null;
}

interface RoadEdge {
  toUid: string;
  maxDeg: number;
  grade: { key: string };
}

interface RoadGraph {
  edges: RoadEdge[];
  totalM: number;
}

/** diagnoseSite 가 실제로 읽는 PlacementManager 의 부분집합. */
export interface DiagnosticPlacer {
  items?: DiagnosticItem[];
  gpRef?: { lon?: number; lng?: number; lat: number } | null;
  terrain?: { surfaceReady?: boolean } | null;
  _computeRoadGraph?: () => RoadGraph;
}

type Severity = 'high' | 'med' | 'low';
interface Finding { sev: Severity; text: string }

export interface SiteDiagnosis {
  ready: true;
  terrainReady: boolean;
  score: number;
  grade: { min: number; letter: string; label: string; color: string };
  metrics: {
    count: number;
    fillTot: number;
    wallMax: number;
    roadTotalM: number;
    footEdges: number;
    edgeCount: number;
    nEasy: number;
    nGrade: number;
    nUnfit: number;
    sepViol: number;
    medBlocked: number;
    cmdFar: number;
  };
  findings: Finding[];
}

export interface SiteDiagnosisNotReady {
  ready: false;
  reason: string;
}

// 교리 상수 (단순화된 군 시설기준 가정치)
const HAZARD_SEP_M = 80;        // 탄약·유류 위험물 ↔ 인원밀집/지휘 최소 이격
const COMMAND_HUB_M = 150;      // 지휘시설 ↔ 감시탑(C2) 근접 권장
const CLUSTER_M = 130;          // 생활권 집적 권장 반경

const GRADE_BANDS = [
  { min: 85, letter: 'A', label: '우수', color: '#3dd68c' },
  { min: 70, letter: 'B', label: '양호', color: '#8bd450' },
  { min: 55, letter: 'C', label: '보통', color: '#e3b341' },
  { min: 40, letter: 'D', label: '미흡', color: '#ef9a3c' },
  { min: 0, letter: 'E', label: '부적합', color: '#ed5d5d' },
] as const;
const gradeOf = (s: number) => GRADE_BANDS.find((b) => s >= b.min) ?? GRADE_BANDS[GRADE_BANDS.length - 1];

const isHazard = (it: DiagnosticItem) =>
  it.spec.id === 'storage-zone'
  && ((it.functionTag != null && ['탄약고', '유류고'].includes(it.functionTag))
    || (!!it.details?.hazard && it.details.hazard !== '일반'));
const SENSITIVE_CATS = new Set(['living', 'care', 'command']);

/** @param placer PlacementManager (items·gpRef·terrain·_computeRoadGraph 사용) */
export function diagnoseSite(placer: DiagnosticPlacer | null | undefined): SiteDiagnosis | SiteDiagnosisNotReady {
  const items = placer?.items ?? [];
  if (!items.length) return { ready: false, reason: '배치된 시설이 없습니다.' };
  const hub = placer!.gpRef ? { lon: placer!.gpRef.lon ?? placer!.gpRef.lng!, lat: placer!.gpRef.lat } : null;
  const terrainReady = !!placer!.terrain?.surfaceReady;
  const findings: Finding[] = [];
  const add = (sev: Severity, text: string) => findings.push({ sev, text });

  // ── 토공·건축적지 ──
  let fillTot = 0, wallMax = 0, nEasy = 0, nGrade = 0, nUnfit = 0;
  for (const it of items) {
    if (Number.isFinite(it.fillM3)) fillTot += it.fillM3!;
    if (Number.isFinite(it.wallMaxM)) wallMax = Math.max(wallMax, it.wallMaxM!);
    if (Number.isFinite(it.slopeDeg)) {
      const deg = it.slopeDeg!;
      if (deg <= SLOPE_LIMITS.easy) nEasy++;
      else if (deg <= SLOPE_LIMITS.max) { nGrade++; }
      else { nUnfit++; }
    }
    if (Number.isFinite(it.wallMaxM) && it.wallMaxM! > 8) {
      add('med', `${it.spec.name}: 옹벽고 ${it.wallMaxM!.toFixed(1)}m — 과도한 성토(대체 부지 검토)`);
    }
  }
  if (nUnfit) add('high', `건축 부적합 경사(>${SLOPE_LIMITS.max}°)에 놓인 시설 ${nUnfit}동 — 재배치 필요`);
  if (nGrade) add('low', `정지 필요 경사(≤${SLOPE_LIMITS.max}°) 시설 ${nGrade}동 — 절·성토 수반`);

  // ── 위험물 이격 ──
  const hazards = items.filter(isHazard);
  const sensitive = items.filter((it) => SENSITIVE_CATS.has(it.spec.category) && !isHazard(it));
  let sepViol = 0;
  for (const h of hazards) {
    for (const s of sensitive) {
      const d = distM(h.lon, h.lat, s.lon, s.lat);
      if (d < HAZARD_SEP_M) {
        sepViol++;
        add('high', `${h.spec.name}(${h.functionTag})↔${s.spec.name} ${Math.round(d)}m — 위험물 이격 ${HAZARD_SEP_M}m 미달`);
      }
    }
  }

  // ── 지휘 C2 근접 ──
  let cmdFar = 0;
  if (hub) {
    for (const it of items.filter((x) => x.spec.category === 'command')) {
      const d = distM(hub.lon, hub.lat, it.lon, it.lat);
      if (d > COMMAND_HUB_M) { cmdFar++; add('med', `${it.spec.name}: 감시탑에서 ${Math.round(d)}m — C2 근접(${COMMAND_HUB_M}m) 권장 초과`); }
    }
  }

  // ── 순환·의무 후송 (접근로 그래프) ──
  const graph: RoadGraph = placer!._computeRoadGraph ? placer!._computeRoadGraph() : { edges: [], totalM: 0 };
  const footEdges = graph.edges.filter((e) => e.grade.key === 'foot').length;
  const gradeByUid = new Map(graph.edges.map((e) => [e.toUid, e]));
  let medBlocked = 0;
  for (const it of items.filter((x) => x.spec.category === 'care')) {
    const ed = gradeByUid.get(it.uid);
    if (ed && ed.grade.key === 'foot') {
      medBlocked++;
      add('high', `${it.spec.name}: 접근로 종단경사 ${ed.maxDeg.toFixed(0)}° — 차량 후송(MEDEVAC) 제한, 도보 전용`);
    }
  }

  // ── 생활권 집적 (soft) ──
  const living = items.filter((x) => x.spec.category === 'living');
  if (living.length >= 2) {
    let maxPair = 0;
    for (let i = 0; i < living.length; i++) for (let j = i + 1; j < living.length; j++) {
      maxPair = Math.max(maxPair, distM(living[i].lon, living[i].lat, living[j].lon, living[j].lat));
    }
    if (maxPair > CLUSTER_M) add('low', `생활권 시설이 최대 ${Math.round(maxPair)}m 산개 — ${CLUSTER_M}m 내 집적 권장(동선·난방 효율)`);
  }

  // ── 점수 ──
  let score = 100;
  score -= sepViol * 12;
  score -= medBlocked * 10;
  score -= cmdFar * 6;
  score -= nUnfit * 8;
  score -= nGrade * 3;
  if (graph.edges.length) score -= Math.round((footEdges / graph.edges.length) * 10);
  score = Math.max(0, Math.min(100, Math.round(score)));
  const grade = gradeOf(score);
  if (!findings.length) add('low', '주요 교리·토목 기준 위반 없음 — 양호한 배치입니다.');
  // 심각도 정렬
  const rank: Record<Severity, number> = { high: 0, med: 1, low: 2 };
  findings.sort((a, b) => rank[a.sev] - rank[b.sev]);

  return {
    ready: true,
    terrainReady,
    score, grade,
    metrics: {
      count: items.length,
      fillTot: Math.round(fillTot),
      wallMax: +wallMax.toFixed(1),
      roadTotalM: Math.round(graph.totalM),
      footEdges, edgeCount: graph.edges.length,
      nEasy, nGrade, nUnfit,
      sepViol, medBlocked, cmdFar,
    },
    findings,
  };
}
