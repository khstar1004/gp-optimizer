#!/usr/bin/env node
/**
 * MCP server wrapping the existing headless-Blender asset pipeline
 * (assets/blender/build_*.py). It does not execute arbitrary code — only a
 * fixed whitelist of scripts that already ship in this repo — and exposes
 * their QA contact-sheet renders (assets/blender/render_*.png) as images so
 * an MCP client can visually verify a build before it lands in
 * assets/models/.
 *
 * Usage: npm run mcp:blender
 * Register with an MCP client (e.g. Claude Code) by pointing it at
 * `tsx scripts/mcp-blender-pipeline.mts` from the repo root. See README.md.
 */
import { McpServer } from '@modelcontextprotocol/server';
import { StdioServerTransport } from '@modelcontextprotocol/server/stdio';
import * as z from 'zod/v4';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const execFileAsync = promisify(execFile);

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BLENDER_DIR = path.join(ROOT, 'assets', 'blender');
const MODELS_DIR = path.join(ROOT, 'assets', 'models');

const DEFAULT_BLENDER_EXE_WIN = String.raw`C:\Program Files\Blender Foundation\Blender 5.2\blender.exe`;

// build_facilities2.py is superseded by build_facilities3.py (see README) and
// intentionally left out of the whitelist. Render filenames are read verbatim
// from each script's own shoot()/render.filepath calls (RND is assets/blender).
const BUILD_SCRIPTS: Record<string, { file: string; renderFiles: string[] }> = {
  facilities: { file: 'build_facilities.py', renderFiles: ['render_fac_a.png', 'render_fac_b.png'] },
  facilities3: {
    file: 'build_facilities3.py',
    renderFiles: ['render_fac3_a.png', 'render_fac3_b.png', 'render_fac3_c.png', 'render_fac3_d.png'],
  },
  tower: { file: 'build_tower.py', renderFiles: ['render_full.png', 'render_cab.png', 'render_base.png'] },
  sensors: { file: 'build_sensors.py', renderFiles: ['render_sns.png'] },
  munitions: {
    file: 'build_munitions.py',
    renderFiles: ['render_mun_a.png', 'render_mun_b.png', 'render_mun_c.png'],
  },
  damage: { file: 'build_damage.py', renderFiles: ['render_dmg_a.png', 'render_dmg_b.png'] },
  scatter: { file: 'build_scatter.py', renderFiles: ['render_scat.png'] },
};
const BUILD_KEYS = Object.keys(BUILD_SCRIPTS) as [string, ...string[]];

function resolveBlenderExe(): string {
  const fromEnv = process.env.BLENDER_EXE;
  if (fromEnv && fs.existsSync(fromEnv)) return fromEnv;
  if (fs.existsSync(DEFAULT_BLENDER_EXE_WIN)) return DEFAULT_BLENDER_EXE_WIN;
  throw new Error(
    `Blender executable not found (checked BLENDER_EXE=${fromEnv ?? '(unset)'} and default ` +
      `${DEFAULT_BLENDER_EXE_WIN}). Set the BLENDER_EXE env var to your blender.exe path.`,
  );
}

function extractDocSummary(scriptPath: string): string {
  if (!fs.existsSync(scriptPath)) return '';
  const src = fs.readFileSync(scriptPath, 'utf8');
  const match = src.match(/"""([\s\S]*?)"""/);
  if (!match) return '';
  const body = match[1]!.trim();
  const firstPara = body.split(/\r?\n\s*\r?\n/)[0] ?? body;
  return firstPara.replace(/\s+/g, ' ').trim();
}

function globMtimes(dir: string, pattern: RegExp): Map<string, number> {
  const out = new Map<string, number>();
  if (!fs.existsSync(dir)) return out;
  for (const name of fs.readdirSync(dir)) {
    if (!pattern.test(name)) continue;
    out.set(name, fs.statSync(path.join(dir, name)).mtimeMs);
  }
  return out;
}

function diffChanged(before: Map<string, number>, after: Map<string, number>): string[] {
  const changed: string[] = [];
  for (const [name, mtime] of after) {
    if (before.get(name) !== mtime) changed.push(name);
  }
  return changed.sort();
}

function tail(s: string, max = 4000): string {
  return s.length > max ? `…${s.slice(-max)}` : s;
}

const server = new McpServer({ name: 'gp-digital-twin-blender-pipeline', version: '1.0.0' });

server.registerTool(
  'list_builds',
  {
    title: 'List Blender build scripts',
    description:
      'List the whitelisted headless-Blender build scripts (assets/blender/build_*.py) with their ' +
      'docstring summary, and whether their GLB/QA-render output looks stale relative to the script.',
    inputSchema: z.object({}),
  },
  async () => {
    const allRenders = globMtimes(BLENDER_DIR, /^render_.*\.png$/i);
    const rows = Object.entries(BUILD_SCRIPTS).map(([key, { file, renderFiles }]) => {
      const scriptPath = path.join(BLENDER_DIR, file);
      const exists = fs.existsSync(scriptPath);
      const scriptMtime = exists ? fs.statSync(scriptPath).mtimeMs : null;
      const presentRenders = renderFiles.filter((name) => allRenders.has(name));
      const latestRenderMtime = presentRenders.length
        ? Math.max(...presentRenders.map((name) => allRenders.get(name)!))
        : null;
      const stale =
        scriptMtime != null && latestRenderMtime != null ? scriptMtime > latestRenderMtime : null;
      return {
        key,
        file,
        exists,
        summary: extractDocSummary(scriptPath),
        renderFiles: presentRenders,
        missingRenderFiles: renderFiles.filter((name) => !allRenders.has(name)),
        stale, // true = script is newer than its last QA render (likely needs a rebuild); null = unknown
      };
    });
    return { content: [{ type: 'text', text: JSON.stringify(rows, null, 2) }] };
  },
);

server.registerTool(
  'run_build',
  {
    title: 'Run a Blender build script',
    description:
      'Run one whitelisted headless Blender build script: ' +
      '`blender --background --factory-startup --python <script> [-- ...extraArgs]`. ' +
      'Reports the exit code and which assets/models/*.glb and assets/blender/render_*.png files ' +
      'changed. Can take several minutes (facilities3 is the slowest); only run scripts you actually ' +
      'intend to rebuild, and call this tool with a request timeout of at least 10 minutes — the ' +
      "MCP client's default request timeout (60s) is shorter than a real build.",
    inputSchema: z.object({
      script: z.enum(BUILD_KEYS).describe('Which whitelisted build script to run'),
      extraArgs: z
        .array(z.string())
        .default([])
        .describe('Extra args passed after `--` to the script, e.g. ["--only=mun_lgb.glb"]'),
    }),
  },
  async ({ script, extraArgs }) => {
    const entry = BUILD_SCRIPTS[script]!;
    const scriptPath = path.join(BLENDER_DIR, entry.file);
    if (!fs.existsSync(scriptPath)) {
      return { content: [{ type: 'text', text: `script not found: ${scriptPath}` }], isError: true };
    }
    const blenderExe = resolveBlenderExe();

    const beforeModels = globMtimes(MODELS_DIR, /\.glb$/i);
    const beforeRenders = globMtimes(BLENDER_DIR, /^render_.*\.png$/i);

    const args = ['--background', '--factory-startup', '--python', scriptPath];
    if (extraArgs.length) args.push('--', ...extraArgs);

    let stdout = '';
    let stderr = '';
    let exitCode = 0;
    try {
      const result = await execFileAsync(blenderExe, args, {
        timeout: 10 * 60 * 1000,
        maxBuffer: 32 * 1024 * 1024,
      });
      stdout = result.stdout;
      stderr = result.stderr;
    } catch (err) {
      const e = err as { code?: number; stdout?: string; stderr?: string; message?: string };
      exitCode = typeof e.code === 'number' ? e.code : 1;
      stdout = e.stdout ?? '';
      stderr = e.stderr ?? String(e.message ?? err);
    }

    const changedGlbFiles = diffChanged(beforeModels, globMtimes(MODELS_DIR, /\.glb$/i));
    const changedRenderFiles = diffChanged(beforeRenders, globMtimes(BLENDER_DIR, /^render_.*\.png$/i));

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            { exitCode, changedGlbFiles, changedRenderFiles, stdoutTail: tail(stdout), stderrTail: tail(stderr) },
            null,
            2,
          ),
        },
      ],
      isError: exitCode !== 0,
    };
  },
);

server.registerTool(
  'list_qa_renders',
  {
    title: 'List Blender QA renders',
    description:
      'List QA contact-sheet PNGs produced by the build scripts (assets/blender/render_*.png) with ' +
      'their last-modified time, newest first.',
    inputSchema: z.object({}),
  },
  async () => {
    const rows = [...globMtimes(BLENDER_DIR, /^render_.*\.png$/i).entries()]
      .map(([file, mtimeMs]) => ({ file, mtimeMs }))
      .sort((a, b) => b.mtimeMs - a.mtimeMs);
    return { content: [{ type: 'text', text: JSON.stringify(rows, null, 2) }] };
  },
);

const RENDER_FILE_RE = /^render_[a-z0-9_]+\.png$/i;

server.registerTool(
  'get_qa_render',
  {
    title: 'Get a Blender QA render image',
    description:
      'Read one QA render PNG from assets/blender/ (render_*.png only) and return it as an image ' +
      'so it can be visually inspected — e.g. to check window recesses or texture seams after a build.',
    inputSchema: z.object({
      file: z.string().regex(RENDER_FILE_RE).describe('Filename, e.g. render_fac3_a.png'),
    }),
  },
  async ({ file }) => {
    const full = path.join(BLENDER_DIR, file);
    if (!fs.existsSync(full)) {
      return { content: [{ type: 'text', text: `render not found: ${file}` }], isError: true };
    }
    const data = fs.readFileSync(full).toString('base64');
    return { content: [{ type: 'image', data, mimeType: 'image/png' }] };
  },
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('gp-digital-twin-blender-pipeline MCP server running on stdio');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
