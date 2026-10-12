// gp_terrain_real_raw.glb → assets/models/gp_terrain_real.glb
// 첫 시도(draco만)는 110.9MB — raw 안 텍스처만 67.7MB(그중 25.9MB는 Blender glTF
// exporter가 Graminea 그래스 diffuse+alpha를 하나로 합치며 만든 무손실 PNG)라 지오메트리를
// 아무리 눌러도 거기서 안 줄었다. build_winter_glb.mjs가 이미 텍스처를 webp로 바꿔치기해
// 쓰는 것과 같은 이유로, 여기서도 textureCompress(webp)를 draco 전에 넣는다.
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { draco, prune, textureCompress, simplifyPrimitive, instance } from '@gltf-transform/functions';
import draco3dgltf from 'draco3dgltf';
import { MeshoptSimplifier } from 'meshoptimizer';
import sharp from 'sharp';
import fs from 'node:fs';

const SRC = 'assets/models/gp_terrain_real_raw.glb';
const OUT = 'assets/models/gp_terrain_real.glb';

const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({
  'draco3d.decoder': await draco3dgltf.createDecoderModule(),
  'draco3d.encoder': await draco3dgltf.createEncoderModule(),
});

const doc = await io.read(SRC);
const root = doc.getRoot();

// fix_glb.mts와 같은 이유: COLOR_0/COLOR_1이 남으면 glTF가 base color에 곱해 나무가 검게 뜬다.
let stripped = 0;
for (const mesh of root.listMeshes()) {
  for (const prim of mesh.listPrimitives()) {
    for (const sem of ['COLOR_0', 'COLOR_1']) {
      if (prim.getAttribute(sem)) { prim.setAttribute(sem, null); stripped++; }
    }
  }
}
for (const mat of root.listMaterials()) mat.setMetallicFactor(0);

// draco 'sequential'로 안전하게 돌긴 했지만 837만 삼각형 지형을 그대로 압축하면
// (연결성 인코딩 없이 정점을 거의 그대로 담아) 168MB나 되고, 브라우저 디코드도
// 수 분씩 걸린다(원래 27MB짜리는 "최초 1회 수십 초"였다). 지형 표면은 이미
// 2.44m 격자라 지오메트리가 애초에 미세 굴곡을 못 담고, 근접 디테일은 이제
// realTerrain.ts의 CustomShader(알베도)가 맡으므로 — 굳이 837만 삼각형을 다
// 들고 있을 이유가 없다. meshoptimizer로 지형 primitive만 먼저 줄인다
// (나무·바위·풀은 이미 수백~수천 tri라 손대지 않음). 능선·경사는 곡률 기반이라
// 그대로 남고 평탄한 구간만 정리된다.
// 0.15(정점 63만개)로도 71.7MB가 나왔는데 뜯어보니 텍스처는 21.8MB뿐, 나머지
// ~49MB가 sequential 인코딩된 지오메트리였다 — 그래서 0.08로 한 번 더 낮춘다
// (정점 약 34만개, 삼각형 약 63만개. 여전히 원래 5m 도로 리본·시설 배치보다
// 조밀해 배치 판정엔 지장 없음) + webp quality도 82→78로 살짝 더 눌러 텍스처도 같이 줄인다.
const TERRAIN_SIMPLIFY_RATIO = 0.08;
for (const mesh of root.listMeshes()) {
  if (mesh.getName() !== 'Terrain') continue;
  for (const prim of mesh.listPrimitives()) {
    const before = prim.getAttribute('POSITION').getCount();
    await simplifyPrimitive(prim, {
      ratio: TERRAIN_SIMPLIFY_RATIO, error: 0.01,
      simplifier: MeshoptSimplifier, lockBorder: true,
    });
    const after = prim.getAttribute('POSITION').getCount();
    console.log('Terrain simplified:', before, '->', after, 'verts');
  }
}

// Blender glTF exporter는 파티클로 흩뿌린 나무·풀·바위를 EXT_mesh_gpu_instancing이
// 아니라 각각 별도 노드로 내보낸다(2026-09-07 확인: 이 raw 파일에 155,367개 노드,
// instancedNodes:0 — 주석 상단의 "EXT_mesh_gpu_instancing 15만 그루" 설명은 의도였을 뿐
// 실제 산출물엔 반영된 적이 없었다). Cesium이 노드 15만 개를 개별 순회하며 트랜스폼을
// 만드는 데 첫 로드 시 수 분간 메인스레드를 막아 "정밀지형이 안 뜬다"로 보였다.
// instance()가 같은 메시를 참조하는 노드들을 EXT_mesh_gpu_instancing 배치 하나로 묶어
// 노드 수를 13개 안팎(고유 메시 수)으로 줄인다 — draco는 그 배치가 참조하는 실제
// 지오메트리(나무 1그루분)만 압축하면 되므로 draco 앞에 둔다.
await doc.transform(
  instance({ min: 5 }),
  prune(),
  textureCompress({ encoder: sharp, targetFormat: 'webp', quality: 78 }),
  draco({ method: 'sequential' }),
);
await io.write(OUT, doc);
console.log('stripped COLOR attrs:', stripped);
console.log('wrote', OUT, (fs.statSync(OUT).size / 1e6).toFixed(1), 'MB',
  '(raw was', (fs.statSync(SRC).size / 1e6).toFixed(1), 'MB)');
