// GLB 후처리: ① COLOR_0/COLOR_1 버텍스컬러 제거(glTF가 base color에 곱해 나무를 검게 만듦)
// ② 지형 베이크(검정 실패본)를 numpy 합성 알베도로 교체 ③ 재질 밝기 정리
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { prune } from '@gltf-transform/functions';
import draco3d from 'draco3dgltf';
import fs from 'node:fs';

const IN = 'assets/models/gp_terrain_real.glb';
const ALBEDO = 'data/blender_cache/terrain_albedo.jpg';

const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({
  'draco3d.decoder': await draco3d.createDecoderModule(),
  'draco3d.encoder': await draco3d.createEncoderModule(),
});
const doc = await io.read(IN);
const root = doc.getRoot();

let stripped = 0;
for (const mesh of root.listMeshes()) {
  for (const prim of mesh.listPrimitives()) {
    for (const sem of ['COLOR_0', 'COLOR_1']) {
      if (prim.getAttribute(sem)) { prim.setAttribute(sem, null); stripped++; }
    }
  }
}

// 지형 재질 찾기: TerrainExport 메시가 쓰는 재질
let terrainMat = null;
for (const mesh of root.listMeshes()) {
  if (mesh.getName() === 'TerrainExport') {
    terrainMat = mesh.listPrimitives()[0].getMaterial();
  }
}
if (!terrainMat) {
  // 폴백: 가장 큰 텍스처를 가진 재질
  console.log('TerrainExport mesh not found; materials:',
    root.listMaterials().map((m) => m.getName()));
}
if (terrainMat) {
  const tex = doc.createTexture('terrain_albedo')
    .setImage(fs.readFileSync(ALBEDO))
    .setMimeType('image/jpeg');
  terrainMat.setBaseColorTexture(tex);
  terrainMat.setBaseColorFactor([1, 1, 1, 1]);
  terrainMat.setMetallicFactor(0);
  terrainMat.setRoughnessFactor(0.95);
  console.log('terrain material replaced:', terrainMat.getName());
}

// 나무/바위 재질: metallic 0 보장 (Blender specular 추출 잔재 방지)
for (const mat of root.listMaterials()) {
  if (mat !== terrainMat) mat.setMetallicFactor(0);
}

await doc.transform(prune());
await io.write(IN, doc);
console.log('stripped COLOR attrs:', stripped,
  '| size:', (fs.statSync(IN).size / 1e6).toFixed(1), 'MB');
