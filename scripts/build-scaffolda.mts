/**
 * Scaffolda 원본(TypeScript)을 브라우저 ESM 번들로 빌드한다.
 *
 *   orca/Scaffolda-public/src/features/scaffolda/lib/**  →  js/vendor/scaffolda/scaffolda.bundle.js
 *
 * 원본 소스를 리포에 복사하지 않고 그 자리에서 번들한다. Scaffolda 쪽이 갱신되면
 * `npm run build:scaffolda` 만 다시 돌리면 된다.
 *
 * 원본 경로는 SCAFFOLDA_DIR 환경변수로 덮어쓸 수 있다.
 */
import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const scaffoldaDir = process.env.SCAFFOLDA_DIR
  || path.resolve(root, '../../Scaffolda-public');

const outfile = path.join(root, 'js/vendor/scaffolda/scaffolda.bundle.js');

if (!fs.existsSync(path.join(scaffoldaDir, 'src/features/scaffolda/lib/earthworkModel.ts'))) {
  // 저장소만 받은 환경: 커밋된 번들을 그대로 쓴다. 원본을 고쳐 다시 묶을 때만 원본이 필요하다.
  if (fs.existsSync(outfile)) {
    console.log(`Scaffolda 원본 없음(${scaffoldaDir}) — 커밋된 번들을 그대로 사용합니다.`);
    process.exit(0);
  }
  console.error(`Scaffolda 원본을 찾을 수 없습니다: ${scaffoldaDir}`);
  console.error('SCAFFOLDA_DIR 환경변수로 경로를 지정하세요.');
  process.exit(1);
}

const result = await build({
  entryPoints: [path.join(root, 'js/vendor/scaffolda/entry.ts')],
  bundle: true,
  format: 'esm',
  platform: 'browser',
  target: 'es2020',
  outfile,
  // Scaffolda 소스가 import 하는 npm 패키지(delaunator, martinez-polygon-clipping)는
  // 이 프로젝트의 node_modules 에서 해석한다.
  nodePaths: [path.join(root, 'node_modules')],
  // Scaffolda 원본은 Vite 환경변수(import.meta.env)를 읽는다. Vite 없이 번들하므로
  // 런타임 전역(globalThis.__SCAFFOLDA_ENV__)으로 치환하고, 값은 index.html에서 주입한다.
  define: { 'import.meta.env': 'globalThis.__SCAFFOLDA_ENV__' },
  logLevel: 'warning',
  metafile: true,
  legalComments: 'none',
  banner: {
    js: '// Scaffolda 원본 번들 — 생성물. 직접 수정하지 말 것.\n'
      + '// 원본: Scaffolda-public/src/features/scaffolda/lib/**  (npm run build:scaffolda)\n',
  },
});

const inputs = Object.keys(result.metafile.inputs)
  .filter((f) => f.includes('scaffolda/lib'));
const bytes = fs.statSync(outfile).size;
console.log(`번들 완료: js/vendor/scaffolda/scaffolda.bundle.js  (${(bytes / 1024).toFixed(0)} KB)`);
console.log(`Scaffolda 원본 모듈 ${inputs.length}개 포함`);
