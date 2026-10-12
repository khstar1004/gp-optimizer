import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { draco } from '@gltf-transform/functions';
import draco3dgltf from 'draco3dgltf';
import fs from 'fs';
import path from 'path';

const SRC = 'assets/models/gp_terrain_real.glb';
const OUT = 'assets/models/gp_terrain_real_winter.glb';
const WINTER_DIR = 'data/blender_cache/winter_out';

const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({
  'draco3d.decoder': await draco3dgltf.createDecoderModule(),
  'draco3d.encoder': await draco3dgltf.createEncoderModule(),
});

const doc = await io.read(SRC);
const root = doc.getRoot();

// 원래는 `${material index}_${material name}.webp` 정확 매치였다 — 2026-09-07 근접
// 나무 LOD 추가(build_v5.py)로 pineScanNear/leafyA·B·CNear를 따로 import하면서 Blender가
// Bark/Leaf/Branch 등 5개 나무 재질을 재사용하지 않고 각각 별도 데이터블록으로 다시 만들어
// (동일 이름에 Blender가 `_001`,`_002`... 접미사를 붙임) 재질 수가 10→27로 늘었고, 인덱스가
// 밀려 winter_out(원래 10장)과의 1:1 매칭이 거의 다 깨졌다(4/27만 성공). 재질 이름의
// Blender 숫자 접미사를 떼고 베이스 이름으로만 매칭한다 — 어차피 같은 종(수피/잎)은
// 같은 겨울 텍스처를 써야 맞으므로, 접미사 무시 매칭이 우연한 인덱스 일치보다 정확하다.
const stripSuffix = (s) => s.replace(/_\d+$/, '');
const winterByBaseName = new Map();
if (fs.existsSync(WINTER_DIR)) {
  for (const file of fs.readdirSync(WINTER_DIR)) {
    const m = file.match(/^\d+_(.+)\.webp$/);
    if (!m) continue;
    winterByBaseName.set(stripSuffix(m[1]), path.join(WINTER_DIR, file));
  }
}

let swapped = 0;
root.listMaterials().forEach((m, i) => {
  const bc = m.getBaseColorTexture();
  if (!bc) return;
  const name = (m.getName() || `mat${i}`).replace(/[^\w-]/g, '_');
  const p = winterByBaseName.get(stripSuffix(name));
  if (!p) { console.warn('no winter texture for', name); return; }
  bc.setImage(fs.readFileSync(p));
  bc.setMimeType('image/webp');
  swapped += 1;
});
console.log('swapped textures:', swapped, '/', root.listMaterials().length);

// 'edgebreaker'는 837만 삼각형짜리 지형 메시를 깨뜨린다(2026-09-07 확인 —
// compress_terrain.mjs 참고, gp_terrain_real.glb를 여기서 다시 읽어 재압축하므로
// 같은 지형 메시가 그대로 들어온다). 'sequential'로 맞춘다.
await doc.transform(draco({ method: 'sequential' }));
await io.write(OUT, doc);
console.log('wrote', OUT, (fs.statSync(OUT).size / 1e6).toFixed(1), 'MB');
