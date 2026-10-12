import fs from 'node:fs';
import { transform } from 'esbuild';

const SOURCES: Record<'engine' | 'map', string> = {
  engine: 'D:/VISTA_sudo/client/src/gui/sudo/sudoDecisionEngine.ts',
  map: 'D:/VISTA_sudo/client/src/gui/sudo/SudoJangdoTacticalMap.tsx',
};

function extract(file: string, name: string) {
  const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
  const re = new RegExp('^(?:export )?(?:async )?(?:function|const) ' + name + '[(:= ]');
  let start = -1;
  for (let i = 0; i < lines.length; i++) if (re.test(lines[i])) { start = i; break; }
  if (start < 0) throw new Error('not found: ' + name + ' in ' + file);
  let depth = 0, started = false, end = -1;
  for (let i = start; i < lines.length; i++) {
    for (const ch of lines[i]) {
      if (ch === '{') { depth++; started = true; }
      else if (ch === '}') { depth--; }
    }
    if (started && depth === 0) { end = i; break; }
  }
  return { name, file, start: start + 1, end: end + 1, text: lines.slice(start, end + 1).join('\n') };
}

const picks: Array<['engine' | 'map', string]> = [
  ['engine', 'scoreRouteOption'],
  ['map', 'destinationPoint'],
  ['map', 'buildCirclePolygon'],
  ['map', 'clipLineCoordinates'],
];

const fns = picks.map(([src, name]) => ({ src, ...extract(SOURCES[src], name) }));
fns.forEach((f) => console.log(
  f.name.padEnd(22), (f.src === 'engine' ? 'sudoDecisionEngine.ts' : 'SudoJangdoTacticalMap.tsx') + ':' + f.start + '-' + f.end,
  (f.end - f.start + 1) + ' lines'));

const body = fns.map((f) => f.text).join('\n\n');
// TypeScript 타입 표기만 제거한다 (esbuild ts loader). 로직은 그대로.
const out = await transform(body, { loader: 'ts', format: 'esm', target: 'es2020' });

const header = `/**
 * KAIROS(수도) 전술 결심·도식 함수 — 원본에서 함수 단위로 추출.
 * TypeScript 타입 표기만 esbuild 로 제거했고 로직은 원본 그대로다.
 *
 * 원본:
${fns.map((f) => ` *   ${f.name.padEnd(20)} ${f.src === 'engine' ? 'client/src/gui/sudo/sudoDecisionEngine.ts' : 'client/src/gui/sudo/SudoJangdoTacticalMap.tsx'}:${f.start}-${f.end}`).join('\n')}
 *   (D:\\VISTA_sudo)
 *
 * scoreRouteOption 의 가중치 0.34 / 0.26 / 0.18 / 0.22 는 원본 값이다.
 * 원본에서 이 함수에 넘어오는 roadAssessment 는 수도권 도로정보표(9-1) 매칭 결과인데,
 * GP 합성 부지에는 해당 도로 데이터가 없어 ipb.js 가 지형 경사 여유로 roadScore 를 만든다.
 * 그 부분만 GP 고유이고, 점수 합성 규칙 자체는 원본이다.
 */

`;

fs.writeFileSync('C:/Users/USER/orca/projects/gp-optimizer/js/vendor/kairos/tacticalDecision.ts',
  header + out.code.replace(/^function /gm, 'export function ') + '\n');
console.log('\nwritten js/vendor/kairos/tacticalDecision.ts');
