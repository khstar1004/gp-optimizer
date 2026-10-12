/**
 * KAIROS(수도) 로직 모듈을 vendor 로 가져온다.
 *
 * 원본 트리 구조를 그대로 미러링한다 (원본: D:\VISTA_sudo\client\src):
 *   client/src/gui/sudo/*.ts   →  js/vendor/kairos/src/gui/sudo/*.ts
 *   client/src/utils/*.ts      →  js/vendor/kairos/src/utils/*.ts
 *
 * 본문은 무수정이고, 경로 별칭 `@/` 만 상대경로로 바꾼다 (Vite tsconfig paths 없이 번들하기 위해).
 * import 그래프가 닫힐 때까지 참조 모듈을 전이적으로 따라간다.
 * React 컴포넌트(.tsx)는 제외한다 — 브라우저 데모에 React 런타임을 들이지 않는다.
 *
 * 번들: tsx scripts/build-kairos.mts
 */
import fs from 'node:fs';
import path from 'node:path';

const SRC_ROOT = process.env.KAIROS_SRC || 'D:/VISTA_sudo/client/src';
const OUT_ROOT = path.resolve('js/vendor/kairos/src');

// 진입점 — GP 데모에 쓸 수 있는 순수 로직 (경로는 src 기준)
const SEEDS = [
  // 수도 시나리오 결심·화력·탐지 로직
  'gui/sudo/sudoDecisionEngine',
  'gui/sudo/sudoDetector',
  'gui/sudo/sudoFirePlanIntel',
  'gui/sudo/sudoFiringUnitIntel',
  'gui/sudo/sudoMunitionEffectIntel',
  'gui/sudo/sudoCollateralCdeTable',
  'gui/sudo/sudoStrikeSequence',
  'gui/sudo/sudoTargetClassificationIntel',
  'gui/sudo/sudoTargetLabels',
  'gui/sudo/sudoDetectionTimeline',
  'gui/sudo/sudoDetectionMerge',
  'gui/sudo/sudoPerceptionComparison',
  'gui/sudo/sudoRdAssessmentIntel',
  'gui/sudo/sudoBdaIntel',
  'gui/sudo/sudoGisIntel',
  'gui/sudo/sudoScaleIntel',
  'gui/sudo/sudoOperationalData',
  'gui/sudo/sudoDataIntel',
  'gui/sudo/sudoSituationAnalysisIntel',
  'gui/sudo/sudoSituationAnalysisControlRoads',
  'gui/sudo/sudoDroneTargetIntel',
  'gui/sudo/sudoAssistantVulnerabilityIntel',
  'gui/sudo/sudoOrderCandidateIntel',
  'gui/sudo/sudoRealtimeDetections',
  'gui/sudo/sudoFtxReport',
  // VISTA 공통 전술 유틸 — 방공 교전권·위협 커버리지·자산 카탈로그
  'utils/airDefenseModeling',
  'utils/threatCoverage',
  'utils/assetTypeCatalog',
  'utils/mapFunctions',
  'utils/koreanCatalog',
  'utils/dateTimeFunctions',
  'utils/constants',
  'utils/generateUUID',
];

function resolveSpec(spec: string, fromModule: string): string | null {
  // '@/x/y' → 'x/y' (src 기준), './x' → fromModule 디렉터리 기준
  if (spec.startsWith('@/')) return spec.slice(2);
  if (spec.startsWith('./') || spec.startsWith('../')) {
    return path.posix.normalize(path.posix.join(path.posix.dirname(fromModule), spec));
  }
  return null; // npm 패키지 — 번들러가 해석
}

/** fromModule 에서 targetModule 로 가는 상대 import 경로 */
function relativeSpec(fromModule: string, targetModule: string): string {
  let rel = path.posix.relative(path.posix.dirname(fromModule), targetModule);
  if (!rel.startsWith('.')) rel = './' + rel;
  return rel;
}

const seen = new Set();
const queue = [...SEEDS];
const copied = [];
const skipped = [];

while (queue.length) {
  const mod = queue.shift();
  if (!mod) break;
  if (seen.has(mod)) continue;
  seen.add(mod);

  const tsPath = path.join(SRC_ROOT, mod + '.ts');
  if (!fs.existsSync(tsPath)) {
    const isTsx = fs.existsSync(path.join(SRC_ROOT, mod + '.tsx'));
    skipped.push(mod + (isTsx ? '  (.tsx — React 컴포넌트, 제외)' : '  (없음)'));
    continue;
  }

  const raw = fs.readFileSync(tsPath, 'utf8');
  const deps: string[] = [];
  // 본문은 그대로 두고 import/export 의 모듈 지정자만 상대경로로 정규화
  const rewritten = raw.replace(
    /(from\s+|import\s+)(["'])([^"']+)\2/g,
    (whole: string, kw: string, q: string, spec: string) => {
      const target = resolveSpec(spec, mod);
      if (!target) return whole;
      deps.push(target);
      return `${kw}${q}${relativeSpec(mod, target)}${q}`;
    },
  );

  const outPath = path.join(OUT_ROOT, mod + '.ts');
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, rewritten);
  copied.push({ mod, lines: raw.split('\n').length });
  for (const d of deps) if (!seen.has(d)) queue.push(d);
}

copied.sort((a, b) => b.lines - a.lines);
const total = copied.reduce((a, b) => a + b.lines, 0);
console.log(`가져온 모듈 ${copied.length}개 (총 ${total.toLocaleString()}줄) → js/vendor/kairos/src/`);
copied.slice(0, 14).forEach((c) => console.log('  ' + String(c.lines).padStart(6) + '  ' + c.mod));
if (copied.length > 14) console.log(`  … 외 ${copied.length - 14}개`);
if (skipped.length) {
  console.log('\n제외:');
  skipped.forEach((m) => console.log('  - ' + m));
}
