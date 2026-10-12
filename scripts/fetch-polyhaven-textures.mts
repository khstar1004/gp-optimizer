/**
 * Fetch a small set of CC0 PolyHaven PBR texture sets so
 * assets/blender/build_facilities3.py can optionally load real photographed
 * materials instead of its numpy-procedural ones (see `_load_pbr` there).
 * PolyHaven's REST API is public and unauthenticated — no API key needed.
 *
 * Each PolyHaven texture's "arm" map is already a combined AO(R)/Rough(G)/
 * Metal(B) image, matching this repo's own `orm_map()` glTF convention
 * (build_facilities3.py) exactly — so no channel-repacking is needed here.
 *
 * Usage: npm run fetch:polyhaven
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = path.join(ROOT, 'assets', 'textures', 'pbr');
const RESOLUTION = '1k';

// PolyHaven slug -> which build_facilities3.py texture function it backs.
const ASSETS: Record<string, string> = {
  concrete: 'backs tex_concrete()',
  corrugated_iron: 'backs tex_roofmetal()',
  // tex_panel() re-tints this one per building (luminance x hex tint) since a
  // single photo can't carry every building's paint color on its own. Picked
  // for being close to isotropic — a strongly-directional photo (corrugated
  // iron, ridged shutter panels) reads as mismatched seams once retinted and
  // tiled across many differently-angled wall faces.
  painted_plaster_wall: 'backs tex_panel() (retinted per building)',
  // tex_brick() layers this one's luminance under its own procedural coursing
  // (mortar joints/brick stagger) the same way tex_panel() does — the real
  // photo already has plausible per-brick color/mortar staining as fine grain.
  red_brick: 'backs tex_brick() (luminance-only detail layer)',
};

type PolyHavenFiles = Record<string, Record<string, Record<string, { url: string }>>>;

async function downloadFile(url: string, destPath: string): Promise<void> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`download failed (${res.status}): ${url}`);
  const buf = Buffer.from(await res.arrayBuffer());
  fs.mkdirSync(path.dirname(destPath), { recursive: true });
  fs.writeFileSync(destPath, buf);
}

async function fetchAsset(slug: string): Promise<void> {
  const filesRes = await fetch(`https://api.polyhaven.com/files/${slug}`);
  if (!filesRes.ok) throw new Error(`polyhaven /files/${slug} failed: ${filesRes.status}`);
  const files = (await filesRes.json()) as PolyHavenFiles;

  const pick = (mapKey: string): string => {
    const url = files[mapKey]?.[RESOLUTION]?.jpg?.url;
    if (!url) throw new Error(`polyhaven asset ${slug} has no ${mapKey}/${RESOLUTION}/jpg`);
    return url;
  };

  const destDir = path.join(OUT_DIR, slug);
  await downloadFile(pick('Diffuse'), path.join(destDir, 'color.jpg'));
  await downloadFile(pick('arm'), path.join(destDir, 'orm.jpg'));
  await downloadFile(pick('nor_gl'), path.join(destDir, 'normal.jpg'));
}

async function main() {
  const manifest: Array<Record<string, unknown>> = [];
  for (const [slug, usage] of Object.entries(ASSETS)) {
    console.log(`fetching ${slug} (${usage})...`);
    await fetchAsset(slug);
    manifest.push({ slug, usage, source: 'polyhaven.com', license: 'CC0', resolution: RESOLUTION, fetchedAt: new Date().toISOString() });
    console.log(`  ok -> assets/textures/pbr/${slug}/`);
  }
  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(path.join(OUT_DIR, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(`wrote ${manifest.length} texture set(s) to assets/textures/pbr/`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
