/**
 * Per-model material fixes, shared by the showroom viewer (viewer.js) and
 * the card thumbnailer (thumbs.js) so a model looks the same in both. The
 * K2 GLB ships without usable textures; untinted it renders white.
 */
export const MODEL_MATERIAL_OVERRIDES = {
  "tank-k2": {
    defaultColor: "#2f3c2d",
    materialColors: {
      material: "#26351f",
      material_1: "#111411",
      Material: "#32422f",
      material_3: "#080b0a",
      material_4: "#58624f",
      material_5: "#20261f",
    },
    roughness: 0.82,
    metalness: 0.04,
    envMapIntensity: 0.45,
  },
};

export function applyMaterialOverrides(object, targetModelId) {
  const override = MODEL_MATERIAL_OVERRIDES[targetModelId];
  if (!override) {
    return;
  }

  object.traverse((child) => {
    if (!child.isMesh || !child.material) {
      return;
    }

    const isMaterialArray = Array.isArray(child.material);
    const materialEntries = isMaterialArray ? child.material : [child.material];
    const nextMaterials = materialEntries.map((material) => {
      const nextMaterial = material.clone();
      const materialColor =
        override.materialColors?.[nextMaterial.name] ?? override.defaultColor;

      if (nextMaterial.color) {
        nextMaterial.color.set(materialColor);
      }
      if (nextMaterial.emissive) {
        nextMaterial.emissive.set("#000000");
        nextMaterial.emissiveIntensity = 0;
      }
      if (typeof nextMaterial.roughness === "number") {
        nextMaterial.roughness = override.roughness;
      }
      if (typeof nextMaterial.metalness === "number") {
        nextMaterial.metalness = override.metalness;
      }
      if (typeof nextMaterial.envMapIntensity === "number") {
        nextMaterial.envMapIntensity = override.envMapIntensity;
      }

      nextMaterial.needsUpdate = true;
      return nextMaterial;
    });

    child.material = isMaterialArray ? nextMaterials : nextMaterials[0];
  });
}
