import * as THREE from "./lib/three.module.js";
import { GLTFLoader } from "./loaders/GLTFLoader.js";
import {
  getModelRotationOffset,
  getViewFramingPreset,
} from "./utils/viewFraming.js";
import { applyMaterialOverrides } from "./utils/materialOverrides.js";

/**
 * One renderer, many stills.
 *
 * The 시연모드 asset cards show every unit as its 3D model. Seventy live
 * viewers would be seventy WebGL contexts (browsers stop at ~16), so the
 * host page keeps this one hidden frame and asks it for pictures: each
 * request loads one GLB, turns it the way the showroom viewer turns it
 * (`viewFraming.js`), renders a single frame with a transparent background
 * and posts the PNG back. No animation loop - a still needs one render.
 *
 * Protocol (same-origin only):
 *   host -> frame  { type: "thumb:request", id, model, bundle, modelId }
 *   frame -> host  { type: "thumb:result", id, dataUrl | null }
 *   frame -> host  { type: "thumb:ready" } once, on load
 */

const WIDTH = 320;
const HEIGHT = 220;

const renderer = new THREE.WebGLRenderer({
  antialias: true,
  alpha: true,
  preserveDrawingBuffer: true,
});
renderer.setPixelRatio(1);
renderer.setSize(WIDTH, HEIGHT);
renderer.setClearColor(0x000000, 0);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;

const scene = new THREE.Scene();
scene.add(new THREE.HemisphereLight(0xf2f5ff, 0x3a3226, 1.6));
const key = new THREE.DirectionalLight(0xffffff, 2.4);
key.position.set(4, 6, 5);
scene.add(key);
const rim = new THREE.DirectionalLight(0xc8d8ff, 1.1);
rim.position.set(-5, 3, -4);
scene.add(rim);

const camera = new THREE.PerspectiveCamera(30, WIDTH / HEIGHT, 0.01, 1000);
const loader = new GLTFLoader();

function render(gltf, bundle, modelId) {
  const object = gltf.scene;
  const preset = getViewFramingPreset({
    bundle,
    profile: "",
    mode: "detail",
    modelId,
  });
  applyMaterialOverrides(object, modelId);
  const pivot = new THREE.Group();
  pivot.add(object);
  object.rotation.set(
    preset.modelRotation[0] ?? 0,
    (preset.modelRotation[1] ?? 0) +
      preset.rotationY +
      getModelRotationOffset(modelId),
    preset.modelRotation[2] ?? 0
  );
  object.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(object);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  object.position.sub(center);
  scene.add(pivot);

  // A three-quarter view from the front-left and a little above - the
  // angle a model on a card is read from.
  const radius = Math.max(size.length() / 2, 0.001);
  const fov = (camera.fov * Math.PI) / 180;
  const fitH = radius / Math.sin(fov / 2);
  const fitW = radius / Math.sin(Math.atan(Math.tan(fov / 2) * camera.aspect));
  const distance = Math.max(fitH, fitW) * 0.92;
  const direction = new THREE.Vector3(1, 0.55, 1.25).normalize();
  camera.position.copy(direction.multiplyScalar(distance));
  camera.near = distance / 100;
  camera.far = distance * 100;
  camera.updateProjectionMatrix();
  camera.lookAt(0, 0, 0);

  renderer.render(scene, camera);
  const dataUrl = renderer.domElement.toDataURL("image/png");

  scene.remove(pivot);
  object.traverse((child) => {
    if (child.isMesh) {
      child.geometry?.dispose();
      const materials = Array.isArray(child.material)
        ? child.material
        : [child.material];
      materials.forEach((material) => {
        if (!material) return;
        Object.values(material).forEach((value) => {
          if (value && value.isTexture) value.dispose();
        });
        material.dispose();
      });
    }
  });
  return dataUrl;
}

// One at a time: the GPU and the network both prefer it, and the host
// asks for the visible shelf first.
const queue = [];
let busy = false;

function pump() {
  if (busy || queue.length === 0) return;
  busy = true;
  const job = queue.shift();
  const done = (dataUrl) => {
    window.parent.postMessage(
      { type: "thumb:result", id: job.id, dataUrl },
      window.location.origin
    );
    busy = false;
    pump();
  };
  loader.load(
    job.model,
    (gltf) => {
      try {
        done(render(gltf, job.bundle, job.modelId));
      } catch (error) {
        console.warn("thumbnail render failed", job.model, error);
        done(null);
      }
    },
    undefined,
    (error) => {
      console.warn("thumbnail load failed", job.model, error);
      done(null);
    }
  );
}

window.addEventListener("message", (event) => {
  if (event.origin !== window.location.origin) return;
  const data = event.data;
  if (!data || data.type !== "thumb:request") return;
  if (typeof data.id !== "string" || typeof data.model !== "string") return;
  queue.push({
    id: data.id,
    model: data.model,
    bundle: typeof data.bundle === "string" ? data.bundle : "aircraft",
    modelId: typeof data.modelId === "string" ? data.modelId : "",
  });
  pump();
});

window.parent.postMessage({ type: "thumb:ready" }, window.location.origin);
