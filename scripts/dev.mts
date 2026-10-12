/**
 * 개발 모드 원커맨드 실행: 백엔드(server.cts, 8917)와 Vite 프런트(5173)를
 * 한 터미널에서 동시에 띄운다. 어느 한쪽이 죽거나 Ctrl+C 하면 나머지도 함께 종료한다.
 *   npm run dev:all
 */
import { spawn, type ChildProcess } from 'node:child_process';

function run(name: string, npmScript: string): ChildProcess {
  const child = spawn(`npm run ${npmScript}`, {
    stdio: 'inherit',
    shell: true,
  });
  child.on('exit', (code) => {
    console.log(`[dev] ${name} exited (${code}) — shutting down the other process`);
    shutdown();
  });
  return child;
}

const server = run('server', 'dev:server');
const vite = run('vite', 'dev');

let shuttingDown = false;
function shutdown(): void {
  if (shuttingDown) return;
  shuttingDown = true;
  for (const child of [server, vite]) {
    if (!child.killed) child.kill();
  }
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
