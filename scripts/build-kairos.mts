/**
 * 벤더링한 KAIROS(수도) 로직 모듈을 브라우저 ESM 번들로 빌드한다.
 *
 *   js/vendor/kairos/sudo/*.ts  →  js/vendor/kairos/kairos.bundle.js
 *
 * 모듈 목록은 scripts/vendor-kairos.mts 가 전이 폐쇄로 만든 것이며,
 * 엔트리는 그 안에서 실제로 export 되는 심볼을 전부 재수출한다(수동 목록 없음).
 */
import { build } from 'esbuild';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname).replace(/^\/([A-Za-z]:)/, '$1'), '..');
const srcDir = path.join(root, 'js/vendor/kairos/src');
const entryPath = path.join(root, 'js/vendor/kairos/entry.generated.ts');

function walk(dir: string, base = ''): string[] {
  const out: string[] = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const rel = base ? base + '/' + e.name : e.name;
    if (e.isDirectory()) out.push(...walk(path.join(dir, e.name), rel));
    else if (e.name.endsWith('.ts')) out.push(rel);
  }
  return out;
}
const files = fs.existsSync(srcDir) ? walk(srcDir).sort() : [];
if (!files.length) {
  console.error('js/vendor/kairos/src 가 비어 있습니다. 먼저 `tsx scripts/vendor-kairos.mts` 를 실행하세요.');
  process.exit(1);
}

// 값(런타임) export 만 재수출한다. `export type` / `export interface` 는 번들에 남지 않는다.
const lines = ['// 생성물 — scripts/build-kairos.mts 가 만든다. 직접 수정하지 말 것.'];
let symbolCount = 0;
for (const file of files) {
  const src = fs.readFileSync(path.join(srcDir, file), 'utf8');
  const names = new Set();
  for (const m of src.matchAll(/^export\s+(?:async\s+)?(?:function|const|let|class|enum)\s+([A-Za-z0-9_]+)/gm)) {
    names.add(m[1]);
  }
  if (!names.size) continue;
  symbolCount += names.size;
  lines.push(`export { ${[...names].join(', ')} } from './src/${file.replace(/\.ts$/, '')}';`);
}
fs.writeFileSync(entryPath, lines.join('\n') + '\n');

const outfile = path.join(root, 'js/vendor/kairos/kairos.bundle.js');
await build({
  entryPoints: [entryPath],
  bundle: true,
  format: 'esm',
  platform: 'browser',
  target: 'es2020',
  outfile,
  nodePaths: [path.join(root, 'node_modules')],
  // KAIROS 원본도 Vite 환경변수를 읽는다 (VITE_SUDO_* 계열).
  define: { 'import.meta.env': 'globalThis.__KAIROS_ENV__' },
  logLevel: 'warning',
  legalComments: 'none',
  banner: {
    js: '// KAIROS(수도) 원본 번들 — 생성물. 직접 수정하지 말 것.\n'
      + '// 원본: D:\\VISTA_sudo\\client\\src\\gui\\sudo\\**  (npm run build:kairos)\n',
  },
});

const kb = (fs.statSync(outfile).size / 1024).toFixed(0);
console.log(`번들 완료: js/vendor/kairos/kairos.bundle.js  (${kb} KB)`);
console.log(`KAIROS 원본 모듈 ${files.length}개 · 런타임 심볼 ${symbolCount}개`);
