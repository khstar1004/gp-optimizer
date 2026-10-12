import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import draco3dgltf from 'draco3dgltf';
import fs from 'fs';

const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({
  'draco3d.decoder': await draco3dgltf.createDecoderModule(),
});
const doc = await io.read('assets/models/gp_terrain_real.glb');
const root = doc.getRoot();
root.listMaterials().forEach((m, i) => {
  const bc = m.getBaseColorTexture();
  if (!bc) return;
  const img = bc.getImage();
  const name = (m.getName() || `mat${i}`).replace(/[^\w-]/g, '_');
  fs.writeFileSync(`data/blender_cache/winter_src/${i}_${name}.webp`, Buffer.from(img));
  console.log(i, name, img.byteLength, bc.getSize());
});
