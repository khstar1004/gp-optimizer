import * as THREE from "./lib/three.module.js";
import { OrbitControls } from "./controls/OrbitControls.js";
import { GLTFLoader } from "./loaders/GLTFLoader.js";
import { applyMaterialOverrides } from "./utils/materialOverrides.js";
import { createBattleRuntime, getProfilePalette } from "./battleRuntime.js";
import {
  computeCameraPosition,
  computeFitDistance,
  computeFocusTarget,
  computeOrbitDistances,
  computeUniformScale,
  getModelRotationOffset,
  getViewFramingPreset,
} from "./utils/viewFraming.js";

const params = new URLSearchParams(window.location.search);
const modelPath = params.get("model") ?? "";
const bundle = params.get("bundle") ?? "aircraft";
const label = params.get("label") ?? "3D Model";
const assetName = params.get("asset") ?? "VISTA";
const note = params.get("note") ?? "";
const accent = params.get("accent") ?? "#9ccf7a";
const glow = params.get("glow") ?? "#dcedb4";
const mode = params.get("mode") ?? "detail";
const viewerChrome = params.get("chrome") ?? "default";
const contextMode = params.get("context") ?? "default";
const profile = params.get("profile") ?? "";
const operation = params.get("operation") ?? "";
const modelId = params.get("modelId") ?? "";
const className = params.get("className") ?? "";
const assetKind = params.get("assetKind") ?? "";
const minimalChrome = viewerChrome === "minimal";
const focusContext = contextMode === "focus";
const plainModelView = mode === "detail";
const parsedSceneProps = parseScenePropsParam(params.get("sceneProps"));
const parsedComparisonModels = parseComparisonModelsParam(
  params.get("compareModels")
);
const parsedLineup = parseLineupParam(params.get("lineup"));
const activeSceneProps = plainModelView ? [] : parsedSceneProps;
const activeComparisonModels = plainModelView ? [] : parsedComparisonModels;
const activeLineup = plainModelView ? [] : parsedLineup;
const showLineupMarkers =
  !plainModelView && params.get("lineupMarkers") !== "0";

function parseNumberParam(name) {
  const value = params.get(name);
  if (value === null || value === "") {
    return undefined;
  }

  const parsedValue = Number(value);
  return Number.isFinite(parsedValue) ? parsedValue : undefined;
}

const battlePalette = getProfilePalette(profile, accent);

const root = document.documentElement;
root.style.setProperty("--accent", accent);
root.style.setProperty("--glow", glow);
document.body.style.background = plainModelView
  ? "transparent"
  : battlePalette.background;

const viewport = document.getElementById("viewport");
const status = document.getElementById("status");
const titleBlock = document.getElementById("title-block");
const assetNameBlock = document.getElementById("asset-name");
const modelNameBlock = document.getElementById("model-name");
const lineupPanel = document.getElementById("lineup-panel");
const lineupTitle = document.getElementById("lineup-title");
const lineupSummary = document.getElementById("lineup-summary");
const lineupItems = document.getElementById("lineup-items");
const hint = document.getElementById("hint");
const actionPanel = document.getElementById("action-panel");
const actionModeBlock = document.getElementById("action-mode");
const actionStateBlock = document.getElementById("action-state");
const actionCountBlock = document.getElementById("action-counts");

assetNameBlock.textContent = assetName;
modelNameBlock.textContent = label;
status.hidden = minimalChrome;
titleBlock.hidden = minimalChrome;
lineupPanel.hidden = minimalChrome || activeLineup.length === 0;
hint.hidden = minimalChrome;
actionPanel.hidden = minimalChrome || profile.length === 0;

const renderer = new THREE.WebGLRenderer({
  antialias: true,
  alpha: true,
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const baseToneMappingExposure = mode === "immersive" ? 1.1 : 1.02;
renderer.toneMappingExposure = baseToneMappingExposure;
viewport.appendChild(renderer.domElement);

const scene = new THREE.Scene();
if (!plainModelView) {
  scene.fog = new THREE.FogExp2(
    battlePalette.fog,
    profile.length > 0 ? 0.027 : mode === "immersive" ? 0.03 : 0.022
  );
}

const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 200);
camera.position.set(5, 3.2, 7.4);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.enablePan = false;
// `spin=1`: a plain model that still turns - the 시연모드 hangar shows one
// asset at a time, large, on its own stage.
const forceSpin = params.get("spin") === "1";
controls.autoRotate = !plainModelView || forceSpin;
controls.autoRotateSpeed = forceSpin
  ? 0.7
  : profile.length > 0
    ? 0.46
    : mode === "immersive"
      ? 0.9
      : 1.15;
controls.minDistance = 2.8;
controls.maxDistance = profile.length > 0 ? 24 : 18;
controls.maxPolarAngle = Math.PI * 0.48;
controls.target.set(0, 0.6, 0);

const ambientLight = new THREE.HemisphereLight(0xffffff, 0x22301d, 1.55);
const baseAmbientLightIntensity = ambientLight.intensity;
scene.add(ambientLight);

const keyLight = new THREE.DirectionalLight(0xfff2d6, 2.2);
keyLight.position.set(4.8, 7.2, 6.4);
keyLight.castShadow = true;
keyLight.shadow.mapSize.set(1024, 1024);
keyLight.shadow.bias = -0.00018;
keyLight.shadow.normalBias = 0.012;
keyLight.shadow.camera.near = 1;
keyLight.shadow.camera.far = 28;
keyLight.shadow.camera.left = -9;
keyLight.shadow.camera.right = 9;
keyLight.shadow.camera.top = 9;
keyLight.shadow.camera.bottom = -9;
const baseKeyLightIntensity = keyLight.intensity;
scene.add(keyLight);

const rimLight = new THREE.DirectionalLight(0xb8e7ff, 1.6);
rimLight.position.set(-6.5, 5.4, -5.8);
const baseRimLightIntensity = rimLight.intensity;
scene.add(rimLight);

const groundLevel = -1.35;
if (!plainModelView) {
  const ground = new THREE.Mesh(
    new THREE.CircleGeometry(7.5, 72),
    new THREE.MeshStandardMaterial({
      color: new THREE.Color(battlePalette.ground),
      transparent: true,
      opacity: focusContext
        ? battlePalette.groundOpacity * 0.7
        : battlePalette.groundOpacity,
      roughness: 0.95,
      metalness: 0.05,
    })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = groundLevel;
  ground.receiveShadow = true;
  scene.add(ground);

  const shadowCatcher = new THREE.Mesh(
    new THREE.CircleGeometry(6.4, 72),
    new THREE.ShadowMaterial({
      transparent: true,
      opacity: focusContext ? 0.12 : profile.length > 0 ? 0.22 : 0.18,
    })
  );
  shadowCatcher.rotation.x = -Math.PI / 2;
  shadowCatcher.position.y = groundLevel + 0.02;
  shadowCatcher.receiveShadow = true;
  scene.add(shadowCatcher);

  const grid = new THREE.GridHelper(
    14,
    28,
    battlePalette.grid,
    battlePalette.grid
  );
  (Array.isArray(grid.material) ? grid.material : [grid.material]).forEach(
    (material) => {
      material.transparent = true;
      material.opacity = focusContext
        ? battlePalette.gridOpacity * 0.45
        : battlePalette.gridOpacity;
    }
  );
  grid.position.y = groundLevel + 0.01;
  scene.add(grid);

  const halo = new THREE.Mesh(
    new THREE.RingGeometry(3.7, 4.55, 64),
    new THREE.MeshBasicMaterial({
      color: glow,
      transparent: true,
      opacity: focusContext ? 0.05 : 0.12,
      side: THREE.DoubleSide,
    })
  );
  halo.rotation.x = -Math.PI / 2;
  halo.position.y = groundLevel + 0.05;
  scene.add(halo);
} else {
  const shadowCatcher = new THREE.Mesh(
    new THREE.CircleGeometry(6.1, 72),
    new THREE.ShadowMaterial({
      transparent: true,
      opacity: 0.12,
    })
  );
  shadowCatcher.rotation.x = -Math.PI / 2;
  shadowCatcher.position.y = groundLevel + 0.02;
  shadowCatcher.receiveShadow = true;
  scene.add(shadowCatcher);

  const grid = new THREE.GridHelper(
    13.5,
    26,
    battlePalette.grid,
    battlePalette.grid
  );
  (Array.isArray(grid.material) ? grid.material : [grid.material]).forEach(
    (material) => {
      material.transparent = true;
      material.opacity = 0.12;
    }
  );
  grid.position.y = groundLevel + 0.01;
  scene.add(grid);

  const halo = new THREE.Mesh(
    new THREE.RingGeometry(3.9, 4.75, 64),
    new THREE.MeshBasicMaterial({
      color: glow,
      transparent: true,
      opacity: 0.08,
      side: THREE.DoubleSide,
    })
  );
  halo.rotation.x = -Math.PI / 2;
  halo.position.y = groundLevel + 0.05;
  scene.add(halo);
}
const lineupMarkerLayer = new THREE.Group();
scene.add(lineupMarkerLayer);

const battleRuntime = createBattleRuntime({
  THREE,
  scene,
  profile,
  operation,
  label,
  accent,
  glow,
  stats: {
    range: parseNumberParam("range"),
    heading: parseNumberParam("heading"),
    speed: parseNumberParam("speed"),
    weaponCount: parseNumberParam("weaponCount"),
    aircraftCount: parseNumberParam("aircraftCount"),
    compareCount: parseNumberParam("compareCount"),
  },
  actionElements: {
    mode: actionModeBlock,
    state: actionStateBlock,
    counts: actionCountBlock,
  },
});

hint.textContent = battleRuntime.hint;
actionModeBlock.textContent = battleRuntime.modeLabel;
actionStateBlock.textContent =
  profile.length > 0 ? "실시간 교전 장면 초기화 중" : "";
actionCountBlock.textContent = profile.length > 0 ? "AUTO ON" : "";

let currentObject = null;
let currentDisplayRoot = null;
let currentSceneProps = [];
let currentComparisonModels = [];
let currentLineupMarkers = [];
let mixer = null;
let activeViewConfig = null;
const clock = new THREE.Clock();
const objectBasePosition = new THREE.Vector3();
const objectBaseRotation = new THREE.Euler();
const scratchBounds = new THREE.Box3();
const scratchSize = new THREE.Vector3();
const scratchCenter = new THREE.Vector3();
const scratchSphere = new THREE.Sphere();
const scratchTarget = new THREE.Vector3();
const scratchTranslationMatrix = new THREE.Matrix4();
const scratchScaleMatrix = new THREE.Matrix4();
const scratchRotationMatrix = new THREE.Matrix4();
const scratchOffsetMatrix = new THREE.Matrix4();
const scratchNormalizationMatrix = new THREE.Matrix4();
const scratchWorldMatrix = new THREE.Matrix4();
const scratchBakeMatrix = new THREE.Matrix4();
const scratchEuler = new THREE.Euler();

function setStatus(message) {
  if (minimalChrome) {
    status.hidden = true;
    return;
  }

  status.hidden = false;
  status.textContent = message;
}

function parseScenePropsParam(value) {
  if (!value) {
    return [];
  }

  try {
    const parsedValue = JSON.parse(value);
    if (!Array.isArray(parsedValue)) {
      return [];
    }

    return parsedValue
      .filter((entry) => entry && typeof entry.path === "string")
      .slice(0, 8)
      .map((entry, index) => ({
        id:
          typeof entry.id === "string" && entry.id.length > 0
            ? entry.id
            : `scene-prop-${index}`,
        path: entry.path,
        position: Array.isArray(entry.position)
          ? [
              Number(entry.position[0]) || 0,
              Number(entry.position[1]) || 0,
              Number(entry.position[2]) || 0,
            ]
          : [0, 0, 0],
        rotationY: Number.isFinite(Number(entry.rotationY))
          ? Number(entry.rotationY)
          : 0,
        targetSize: Number.isFinite(Number(entry.targetSize))
          ? Number(entry.targetSize)
          : 2.5,
        opacity: Number.isFinite(Number(entry.opacity))
          ? Math.min(1, Math.max(0.2, Number(entry.opacity)))
          : 1,
      }));
  } catch (_error) {
    return [];
  }
}

function parseComparisonModelsParam(value) {
  if (!value) {
    return [];
  }

  try {
    const parsedValue = JSON.parse(value);
    if (!Array.isArray(parsedValue)) {
      return [];
    }

    return parsedValue
      .filter((entry) => entry && typeof entry.path === "string")
      .slice(0, 4)
      .map((entry, index) => ({
        id:
          typeof entry.id === "string" && entry.id.length > 0
            ? entry.id
            : `compare-model-${index}`,
        bundle:
          typeof entry.bundle === "string" && entry.bundle.length > 0
            ? entry.bundle
            : bundle,
        path: entry.path,
        label:
          typeof entry.label === "string" && entry.label.length > 0
            ? entry.label
            : `Linked Model ${index + 1}`,
      }));
  } catch (_error) {
    return [];
  }
}

function parseLineupParam(value) {
  if (!value) {
    return [];
  }

  try {
    const parsedValue = JSON.parse(value);
    if (!Array.isArray(parsedValue)) {
      return [];
    }

    return parsedValue
      .filter((entry) => entry && typeof entry.id === "string")
      .slice(0, 5)
      .map((entry) => ({
        id: entry.id,
        label: entry.label ?? entry.id,
        section: entry.section ?? "UNIT",
        role: entry.role ?? "",
        task: entry.task ?? "",
        status: entry.status ?? "",
        readinessPct: clamp(Number(entry.readinessPct) || 0, 0, 100),
        fuelPct: clamp(Number(entry.fuelPct) || 0, 0, 100),
        ordnancePct: clamp(Number(entry.ordnancePct) || 0, 0, 100),
        coveragePct: clamp(Number(entry.coveragePct) || 0, 0, 100),
        primary: Boolean(entry.primary),
      }));
  } catch (_error) {
    return [];
  }
}

function applyShadowSettings(object) {
  object.traverse((child) => {
    if (!child.isMesh) {
      return;
    }

    child.castShadow = true;
    child.receiveShadow = true;
  });
}

function resize() {
  const width = Math.max(1, viewport.clientWidth);
  const height = Math.max(1, viewport.clientHeight);
  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();

  if (activeViewConfig) {
    applyViewConfig(activeViewConfig);
  }
}

function clearCurrentObject() {
  if (!currentDisplayRoot) {
    battleRuntime.reset();
    return;
  }

  disposeRenderableObject(currentDisplayRoot);

  currentDisplayRoot = null;
  currentObject = null;
  currentComparisonModels = [];
  clearLineupMarkers();
  mixer = null;
  activeViewConfig = null;
  battleRuntime.reset();
}

function clearSceneProps() {
  currentSceneProps.forEach((sceneProp) => {
    disposeRenderableObject(sceneProp);
  });
  currentSceneProps = [];
}

function clearLineupMarkers() {
  currentLineupMarkers.forEach((marker) => disposeRenderableObject(marker));
  currentLineupMarkers = [];
}

function disposeRenderableObject(object) {
  object.removeFromParent();
  object.traverse((child) => {
    if (!child.isMesh) {
      return;
    }

    if (child.geometry) {
      child.geometry.dispose();
    }

    const { material } = child;
    if (Array.isArray(material)) {
      material.forEach((entry) => entry.dispose());
      return;
    }

    material?.dispose?.();
  });
}

function canNormalizeModelGeometry(object, animations = []) {
  if (animations.length > 0) {
    return false;
  }

  let hasMesh = false;
  let hasUnsupportedRig = false;

  object.traverse((child) => {
    if (child.isBone || child.isSkinnedMesh) {
      hasUnsupportedRig = true;
      return;
    }

    if (child.isMesh) {
      hasMesh = true;
    }
  });

  return hasMesh && !hasUnsupportedRig;
}

function normalizeStaticModelGeometry(object, framingPreset) {
  object.updateMatrixWorld(true);

  const sourceBounds = scratchBounds.setFromObject(object);
  const size = sourceBounds.getSize(scratchSize);
  const maxAxis = Math.max(size.x, size.y, size.z, 0.001);
  const scale = computeUniformScale(maxAxis, framingPreset.targetSize);
  const center = sourceBounds.getCenter(scratchCenter);

  scratchEuler.set(
    framingPreset.modelRotation[0] ?? 0,
    (framingPreset.modelRotation[1] ?? 0) +
      framingPreset.rotationY +
      getModelRotationOffset(modelId),
    framingPreset.modelRotation[2] ?? 0
  );

  scratchTranslationMatrix.makeTranslation(-center.x, -center.y, -center.z);
  scratchScaleMatrix.makeScale(scale, scale, scale);
  scratchRotationMatrix.makeRotationFromEuler(scratchEuler);
  scratchOffsetMatrix.makeTranslation(
    framingPreset.modelOffset[0] ?? 0,
    framingPreset.modelOffset[1] ?? 0,
    framingPreset.modelOffset[2] ?? 0
  );

  scratchNormalizationMatrix.identity();
  scratchNormalizationMatrix.multiply(scratchOffsetMatrix);
  scratchNormalizationMatrix.multiply(scratchRotationMatrix);
  scratchNormalizationMatrix.multiply(scratchScaleMatrix);
  scratchNormalizationMatrix.multiply(scratchTranslationMatrix);

  object.traverse((child) => {
    if (!child.isMesh || !child.geometry) {
      return;
    }

    scratchWorldMatrix.copy(child.matrixWorld);
    scratchBakeMatrix
      .copy(scratchNormalizationMatrix)
      .multiply(scratchWorldMatrix);

    child.geometry = child.geometry.clone();
    child.geometry.applyMatrix4(scratchBakeMatrix);
    child.geometry.computeBoundingBox();
    child.geometry.computeBoundingSphere();
  });

  object.traverse((child) => {
    child.position.set(0, 0, 0);
    child.rotation.set(0, 0, 0);
    child.scale.set(1, 1, 1);
    child.updateMatrix();
  });
  object.updateMatrixWorld(true);
  object.userData.viewerGeometryNormalized = true;
}

function prepareObjectForViewing(object, framingPreset, animations = []) {
  if (object.userData.viewerPrepared) {
    return;
  }

  if (canNormalizeModelGeometry(object, animations)) {
    normalizeStaticModelGeometry(object, framingPreset);
  } else {
    object.userData.viewerGeometryNormalized = false;
  }

  object.userData.viewerPrepared = true;
}

function makeBodyMaterial(hexColor, metalness = 0.3) {
  return new THREE.MeshStandardMaterial({
    color: hexColor,
    roughness: 0.55,
    metalness,
  });
}

function readinessColor(readinessPct) {
  if (readinessPct >= 84) {
    return "#72f0d0";
  }
  if (readinessPct >= 66) {
    return "#ffd768";
  }
  return "#ff8462";
}

function renderLineupPanel(lineup) {
  if (!lineupPanel || !lineupTitle || !lineupSummary || !lineupItems) {
    return;
  }

  const shouldHide = minimalChrome || lineup.length === 0;
  lineupPanel.hidden = shouldHide;
  if (shouldHide) {
    lineupItems.replaceChildren();
    return;
  }

  const readinessAverage =
    lineup.reduce((sum, entry) => sum + entry.readinessPct, 0) / lineup.length;
  lineupTitle.textContent = "DIGITAL TWIN LINEUP";
  lineupSummary.textContent = `RDY ${Math.round(
    readinessAverage
  )}%  |  ${lineup.length} UNIT LINKED`;
  lineupItems.replaceChildren(
    ...lineup.map((entry) => {
      const item = document.createElement("div");
      item.className = `lineup-item${entry.primary ? " primary" : ""}`;

      const head = document.createElement("div");
      head.className = "lineup-item-head";

      const labelNode = document.createElement("div");
      labelNode.className = "lineup-item-label";
      labelNode.textContent = `${entry.section} · ${entry.label}`;

      const statusNode = document.createElement("div");
      statusNode.className = "lineup-item-status";
      statusNode.textContent = entry.status;

      const roleNode = document.createElement("div");
      roleNode.className = "lineup-item-role";
      roleNode.textContent = `${entry.role} / ${entry.task}`;

      const metrics = document.createElement("div");
      metrics.className = "lineup-item-metrics";
      [
        `RDY ${entry.readinessPct}%`,
        `FUEL ${entry.fuelPct}%`,
        `ORD ${entry.ordnancePct}%`,
        `COV ${entry.coveragePct}%`,
      ].forEach((value) => {
        const metric = document.createElement("span");
        metric.textContent = value;
        metrics.append(metric);
      });

      head.append(labelNode, statusNode);
      item.append(head, roleNode, metrics);
      return item;
    })
  );
}

function ensureDisplayRoot() {
  if (currentDisplayRoot) {
    return currentDisplayRoot;
  }

  currentDisplayRoot = new THREE.Group();
  scene.add(currentDisplayRoot);
  return currentDisplayRoot;
}

function placePreparedObject(object, framingPreset, targetModelId = modelId) {
  if (
    object.userData.viewerGeometryNormalized ||
    object.userData.viewerPlaced
  ) {
    return;
  }

  const bounds = scratchBounds.setFromObject(object);
  const size = bounds.getSize(scratchSize);
  const maxAxis = Math.max(size.x, size.y, size.z, 0.001);
  const scale = computeUniformScale(maxAxis, framingPreset.targetSize);

  object.scale.multiplyScalar(scale);
  object.updateMatrixWorld(true);

  const scaledBounds = scratchBounds.setFromObject(object);
  const scaledCenter = scaledBounds.getCenter(scratchCenter);
  object.position.sub(scaledCenter);
  object.rotation.x += framingPreset.modelRotation[0] ?? 0;
  object.rotation.y += framingPreset.modelRotation[1] ?? 0;
  object.rotation.z += framingPreset.modelRotation[2] ?? 0;
  object.rotation.y +=
    framingPreset.rotationY + getModelRotationOffset(targetModelId);
  object.position.x += framingPreset.modelOffset[0] ?? 0;
  object.position.y += framingPreset.modelOffset[1] ?? 0;
  object.position.z += framingPreset.modelOffset[2] ?? 0;
  object.updateMatrixWorld(true);
  object.userData.viewerPlaced = true;
}

function getComparisonLayoutSlot(index) {
  const profileLayouts = {
    base: [
      { position: [-8.6, 0, -1.6], rotationY: Math.PI * 0.02 },
      { position: [8.6, 0, -1.6], rotationY: -Math.PI * 0.02 },
      { position: [-8.2, 0, 4.4], rotationY: Math.PI * 0.05 },
      { position: [8.2, 0, 4.4], rotationY: -Math.PI * 0.05 },
    ],
    maritime: [
      { position: [-12.8, 0, 6.8], rotationY: Math.PI * 0.03 },
      { position: [12.8, 0, 6.8], rotationY: -Math.PI * 0.03 },
      { position: [-12.4, 0, -6.8], rotationY: Math.PI * 0.03 },
      { position: [12.4, 0, -6.8], rotationY: -Math.PI * 0.03 },
    ],
    defense: [
      { position: [-8.4, 0, 5.2], rotationY: Math.PI * 0.08 },
      { position: [8.4, 0, 5.2], rotationY: -Math.PI * 0.08 },
      { position: [-8.2, 0, -4.8], rotationY: Math.PI * 0.08 },
      { position: [8.2, 0, -4.8], rotationY: -Math.PI * 0.08 },
    ],
    fires: [
      { position: [-8.2, 0, 5.6], rotationY: Math.PI * 0.08 },
      { position: [8.2, 0, 5.6], rotationY: -Math.PI * 0.08 },
      { position: [-7.8, 0, -4.6], rotationY: Math.PI * 0.08 },
      { position: [7.8, 0, -4.6], rotationY: -Math.PI * 0.08 },
    ],
    ground: [
      { position: [-7.2, 0, 4.8], rotationY: Math.PI * 0.08 },
      { position: [7.2, 0, 4.8], rotationY: -Math.PI * 0.08 },
      { position: [-7.2, 0, -4.4], rotationY: Math.PI * 0.08 },
      { position: [7.2, 0, -4.4], rotationY: -Math.PI * 0.08 },
    ],
  };
  const fallbackLayout = profileLayouts[bundle] ?? profileLayouts.ground;
  const targetLayout =
    profileLayouts[profile] ?? profileLayouts[bundle] ?? fallbackLayout;

  return targetLayout[index] ?? targetLayout[targetLayout.length - 1];
}

function addContextDecor() {
  const contextRoot = new THREE.Group();
  const surfaceY = groundLevel + 0.012;

  if (profile === "base" || bundle === "aircraft" || bundle === "drone") {
    const runway = new THREE.Mesh(
      new THREE.PlaneGeometry(26, 6.4),
      new THREE.MeshStandardMaterial({
        color: 0x34383d,
        transparent: true,
        opacity: 0.86,
        roughness: 0.96,
        metalness: 0.04,
      })
    );
    runway.rotation.x = -Math.PI / 2;
    runway.position.set(0, surfaceY, 0.4);
    contextRoot.add(runway);

    const centerLineMaterial = new THREE.MeshBasicMaterial({
      color: new THREE.Color(glow),
      transparent: true,
      opacity: 0.34,
    });
    [-8, -4, 0, 4, 8].forEach((x) => {
      const stripe = new THREE.Mesh(
        new THREE.PlaneGeometry(1.8, 0.18),
        centerLineMaterial
      );
      stripe.rotation.x = -Math.PI / 2;
      stripe.position.set(x, surfaceY + 0.01, 0.4);
      contextRoot.add(stripe);
    });
  } else if (profile === "maritime" || bundle === "ship") {
    const water = new THREE.Mesh(
      new THREE.CircleGeometry(12.8, 72),
      new THREE.MeshStandardMaterial({
        color: 0x103f58,
        transparent: true,
        opacity: 0.64,
        roughness: 0.4,
        metalness: 0.04,
      })
    );
    water.rotation.x = -Math.PI / 2;
    water.position.set(0, surfaceY, 0);
    contextRoot.add(water);
  } else {
    const tacticalPad = new THREE.Mesh(
      new THREE.PlaneGeometry(18, 10.8),
      new THREE.MeshStandardMaterial({
        color: 0x2e3027,
        transparent: true,
        opacity: 0.42,
        roughness: 0.96,
        metalness: 0.02,
      })
    );
    tacticalPad.rotation.x = -Math.PI / 2;
    tacticalPad.position.set(0, surfaceY, 0);
    contextRoot.add(tacticalPad);

    [-4.8, 0, 4.8].forEach((x) => {
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(1.2, 1.45, 32),
        new THREE.MeshBasicMaterial({
          color: new THREE.Color(accent),
          transparent: true,
          opacity: 0.18,
          side: THREE.DoubleSide,
        })
      );
      ring.rotation.x = -Math.PI / 2;
      ring.position.set(x, surfaceY + 0.01, profile === "ground" ? 3.2 : 0);
      contextRoot.add(ring);
    });
  }

  scene.add(contextRoot);
}

function buildLineupMarker(entry, anchorPosition) {
  const marker = new THREE.Group();
  const color = readinessColor(entry.readinessPct);
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(
      entry.primary ? 1.2 : 0.9,
      entry.primary ? 1.45 : 1.1,
      40
    ),
    new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: entry.primary ? 0.34 : 0.24,
      side: THREE.DoubleSide,
    })
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = groundLevel + 0.02;

  const mast = new THREE.Mesh(
    new THREE.CylinderGeometry(0.03, 0.03, entry.primary ? 1.8 : 1.2, 10),
    new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.42,
    })
  );
  mast.position.y = groundLevel + (entry.primary ? 0.95 : 0.66);

  const orb = new THREE.Mesh(
    new THREE.SphereGeometry(entry.primary ? 0.12 : 0.09, 14, 14),
    new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.9,
    })
  );
  orb.position.y = groundLevel + (entry.primary ? 1.82 : 1.24);
  orb.userData.baseScale = entry.primary ? 1.18 : 1;

  marker.position.set(anchorPosition.x, 0, anchorPosition.z);
  marker.userData.orb = orb;
  marker.userData.readinessPct = entry.readinessPct;
  marker.add(ring, mast, orb);
  return marker;
}

function refreshLineupMarkers() {
  clearLineupMarkers();

  if (!showLineupMarkers || !currentObject || activeLineup.length === 0) {
    return;
  }

  const anchors = [currentObject, ...currentComparisonModels.filter(Boolean)]
    .slice(0, activeLineup.length)
    .map((object) => object.position.clone());

  activeLineup.slice(0, anchors.length).forEach((entry, index) => {
    const marker = buildLineupMarker(entry, anchors[index]);
    lineupMarkerLayer.add(marker);
    currentLineupMarkers.push(marker);
  });
}

function applyScenePropMaterialSettings(object, opacity = 1) {
  if (opacity >= 0.999) {
    return;
  }

  object.traverse((child) => {
    if (!child.isMesh) {
      return;
    }

    const isMaterialArray = Array.isArray(child.material);
    const materialEntries = isMaterialArray ? child.material : [child.material];
    const nextMaterials = materialEntries.map((material) => {
      const nextMaterial = material.clone();
      nextMaterial.transparent = true;
      nextMaterial.opacity *= opacity;
      return nextMaterial;
    });

    child.material = isMaterialArray ? nextMaterials : nextMaterials[0];
  });
}

function applyModelMaterialOverrides(object, targetModelId = modelId) {
  applyMaterialOverrides(object, targetModelId);
}

function prepareScenePropObject(object, propConfig) {
  const targetSize = Math.max(0.6, propConfig.targetSize ?? 2.5);

  object.updateMatrixWorld(true);
  const sourceBounds = scratchBounds.setFromObject(object);
  const size = sourceBounds.getSize(scratchSize);
  const maxAxis = Math.max(size.x, size.y, size.z, 0.001);
  const scale = computeUniformScale(maxAxis, targetSize);
  const center = sourceBounds.getCenter(scratchCenter);

  object.position.sub(center);
  object.scale.multiplyScalar(scale);
  object.rotation.y += propConfig.rotationY ?? 0;
  object.updateMatrixWorld(true);

  const normalizedBounds = scratchBounds.setFromObject(object);
  const lift =
    groundLevel -
    normalizedBounds.min.y +
    ((Array.isArray(propConfig.position) ? propConfig.position[1] : 0) ?? 0);
  const [x = 0, _y = 0, z = 0] = Array.isArray(propConfig.position)
    ? propConfig.position
    : [0, 0, 0];

  object.position.set(x, lift, z);
  object.updateMatrixWorld(true);
  applyShadowSettings(object);
  applyScenePropMaterialSettings(object, propConfig.opacity);
}

function prepareComparisonModelObject(
  object,
  modelConfig,
  slotIndex,
  animations
) {
  const framingPreset = getViewFramingPreset({
    bundle: modelConfig.bundle,
    profile,
    mode,
    modelId: modelConfig.id,
  });
  const slot = getComparisonLayoutSlot(slotIndex);

  prepareObjectForViewing(object, framingPreset, animations);
  placePreparedObject(object, framingPreset, modelConfig.id);
  object.position.x += slot.position[0] ?? 0;
  object.position.y += slot.position[1] ?? 0;
  object.position.z += slot.position[2] ?? 0;
  object.rotation.y += slot.rotationY ?? 0;
  object.updateMatrixWorld(true);
  applyModelMaterialOverrides(object, modelConfig.id);
  applyShadowSettings(object);
  applyScenePropMaterialSettings(object, 0.92);
}

function loadSceneProps(sceneProps) {
  clearSceneProps();

  if (plainModelView || !Array.isArray(sceneProps) || sceneProps.length === 0) {
    return;
  }

  sceneProps.forEach((sceneProp) => {
    loader.load(
      sceneProp.path,
      (gltf) => {
        const propObject = gltf.scene;
        prepareScenePropObject(propObject, sceneProp);
        scene.add(propObject);
        currentSceneProps.push(propObject);
      },
      undefined,
      (error) => {
        console.warn("Failed to load scene prop.", sceneProp.path, error);
      }
    );
  });
}

function loadComparisonModels(compareModels) {
  currentComparisonModels = [];

  if (!Array.isArray(compareModels) || compareModels.length === 0) {
    frameDisplayRoot();
    return;
  }

  const displayRoot = ensureDisplayRoot();

  compareModels.forEach((compareModel, index) => {
    loader.load(
      compareModel.path,
      (gltf) => {
        const compareObject = gltf.scene;
        prepareComparisonModelObject(
          compareObject,
          compareModel,
          index,
          gltf.animations
        );
        displayRoot.add(compareObject);
        currentComparisonModels[index] = compareObject;
        frameDisplayRoot();
        refreshLineupMarkers();
      },
      undefined,
      (error) => {
        console.warn(
          "Failed to load comparison model.",
          compareModel.path,
          error
        );
      }
    );
  });
}

function createFallbackObject() {
  const fallback = new THREE.Group();
  const dark = makeBodyMaterial(0x2a3327, 0.18);
  const body = makeBodyMaterial(0x617552, 0.28);
  const bright = makeBodyMaterial(0xa9b79a, 0.1);

  if (bundle === "drone") {
    const hull = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.18, 0.46), body);
    fallback.add(hull);

    const crossA = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.05, 0.14), body);
    const crossB = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.05, 2.2), body);
    fallback.add(crossA, crossB);

    const offsets = [
      [1.05, 0.04, 1.05],
      [-1.05, 0.04, 1.05],
      [1.05, 0.04, -1.05],
      [-1.05, 0.04, -1.05],
    ];

    offsets.forEach(([x, y, z]) => {
      const rotor = new THREE.Mesh(
        new THREE.CylinderGeometry(0.26, 0.26, 0.03, 24),
        dark
      );
      rotor.rotation.x = Math.PI / 2;
      rotor.position.set(x, y, z);
      fallback.add(rotor);
    });

    applyShadowSettings(fallback);
    return fallback;
  }

  if (bundle === "tank") {
    const base = new THREE.Mesh(new THREE.BoxGeometry(4.4, 1.1, 6.2), body);
    const turret = new THREE.Mesh(
      new THREE.BoxGeometry(2.5, 0.95, 2.9),
      bright
    );
    turret.position.set(0, 1, -0.1);
    const cannon = new THREE.Mesh(
      new THREE.CylinderGeometry(0.12, 0.12, 4.8),
      dark
    );
    cannon.rotation.z = Math.PI / 2;
    cannon.position.set(0, 1.1, 2.25);
    fallback.add(base, turret, cannon);
    applyShadowSettings(fallback);
    return fallback;
  }

  if (bundle === "artillery") {
    const truck = new THREE.Mesh(new THREE.BoxGeometry(3.8, 1.05, 6), body);
    const launcher = new THREE.Mesh(
      new THREE.BoxGeometry(2.4, 0.3, 3.4),
      bright
    );
    launcher.position.set(0, 1.2, -0.4);
    const tubeA = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.36, 2.8), dark);
    const tubeB = tubeA.clone();
    tubeA.position.set(-0.5, 1.45, -0.4);
    tubeB.position.set(0.5, 1.45, -0.4);
    fallback.add(truck, launcher, tubeA, tubeB);
    applyShadowSettings(fallback);
    return fallback;
  }

  if (bundle === "ship") {
    const hull = new THREE.Mesh(new THREE.BoxGeometry(2.1, 1, 8.6), body);
    hull.position.y = -0.3;
    const deck = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.18, 7.4), bright);
    deck.position.y = 0.35;
    const bridge = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.1, 2.2), dark);
    bridge.position.set(0, 1, -1.2);
    fallback.add(hull, deck, bridge);
    applyShadowSettings(fallback);
    return fallback;
  }

  const fuselage = new THREE.Mesh(
    new THREE.CylinderGeometry(0.5, 0.28, 5.9, 24),
    body
  );
  fuselage.rotation.x = Math.PI / 2;
  const wing = new THREE.Mesh(new THREE.BoxGeometry(4.7, 0.12, 1.6), dark);
  const tail = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.1, 0.9), dark);
  tail.position.set(0, 0.18, -2.2);
  fallback.add(fuselage, wing, tail);
  applyShadowSettings(fallback);
  return fallback;
}

function applyViewConfig(viewConfig) {
  const viewportWidth = Math.max(1, viewport.clientWidth);
  const viewportHeight = Math.max(1, viewport.clientHeight);
  const aspect = Math.max(1 / 3, viewportWidth / viewportHeight);
  const distance = computeFitDistance({
    radius: viewConfig.radius,
    fovDegrees: camera.fov,
    aspect,
    padding: viewConfig.padding,
  });
  const cameraPosition = computeCameraPosition({
    target: viewConfig.target,
    direction: viewConfig.cameraVector,
    distance,
  });
  const orbitDistances = computeOrbitDistances({
    distance,
    radius: viewConfig.radius,
    minDistanceFactor: viewConfig.minDistanceFactor,
    maxDistanceFactor: viewConfig.maxDistanceFactor,
  });

  camera.position.set(cameraPosition.x, cameraPosition.y, cameraPosition.z);
  camera.near = Math.max(0.1, distance - viewConfig.radius * 2.6);
  camera.far = Math.max(60, distance + viewConfig.radius * 6);
  camera.updateProjectionMatrix();

  controls.minDistance = orbitDistances.minDistance;
  controls.maxDistance = orbitDistances.maxDistance;
  controls.target.set(
    viewConfig.target.x,
    viewConfig.target.y,
    viewConfig.target.z
  );
  controls.update();
}

function applyLightingPreset(framingPreset) {
  renderer.toneMappingExposure =
    baseToneMappingExposure * framingPreset.exposureMultiplier;
  ambientLight.intensity =
    baseAmbientLightIntensity * framingPreset.ambientLightMultiplier;
  keyLight.intensity = baseKeyLightIntensity * framingPreset.keyLightMultiplier;
  rimLight.intensity = baseRimLightIntensity * framingPreset.rimLightMultiplier;
}

function frameObject(object, framingTarget = object) {
  const framingPreset = getViewFramingPreset({
    bundle,
    profile,
    mode,
    modelId,
  });
  applyLightingPreset(framingPreset);
  placePreparedObject(object, framingPreset);

  const framedBounds = scratchBounds.setFromObject(framingTarget);
  const focusTarget = computeFocusTarget(
    {
      minX: framedBounds.min.x,
      minY: framedBounds.min.y,
      minZ: framedBounds.min.z,
      maxX: framedBounds.max.x,
      maxY: framedBounds.max.y,
      maxZ: framedBounds.max.z,
    },
    framingPreset.focusHeight
  );
  const sphere = framedBounds.getBoundingSphere(scratchSphere);

  activeViewConfig = {
    cameraVector: framingPreset.cameraVector,
    minDistanceFactor: framingPreset.minDistanceFactor,
    maxDistanceFactor: framingPreset.maxDistanceFactor,
    padding: framingPreset.padding,
    radius: Math.max(sphere.radius, framingPreset.targetSize * 0.32),
    target: scratchTarget
      .set(focusTarget.x, focusTarget.y, focusTarget.z)
      .clone(),
  };

  applyViewConfig(activeViewConfig);

  objectBasePosition.copy(object.position);
  objectBaseRotation.copy(object.rotation);
}

function frameDisplayRoot() {
  if (!currentObject) {
    return;
  }

  frameObject(currentObject, currentDisplayRoot ?? currentObject);
  refreshLineupMarkers();
}

function resetCamera() {
  if (!activeViewConfig) {
    return;
  }

  applyViewConfig(activeViewConfig);
}

function showFallback(message) {
  clearCurrentObject();
  clearSceneProps();
  const fallback = createFallbackObject();
  const framingPreset = getViewFramingPreset({
    bundle,
    profile,
    mode,
    modelId,
  });
  prepareObjectForViewing(fallback, framingPreset);
  ensureDisplayRoot().add(fallback);
  currentObject = fallback;
  frameDisplayRoot();
  battleRuntime.attach(fallback);
  loadSceneProps(activeSceneProps);
  loadComparisonModels(activeComparisonModels);
  setStatus(message);
}

const loader = new GLTFLoader();
if (!focusContext && !plainModelView) {
  addContextDecor();
}
renderLineupPanel(activeLineup);

if (!modelPath) {
  showFallback("등록된 모델이 없어 기본 3D 형상을 보여줍니다.");
} else {
  loader.load(
    modelPath,
    (gltf) => {
      clearCurrentObject();
      clearSceneProps();

      currentObject = gltf.scene;
      const framingPreset = getViewFramingPreset({
        bundle,
        profile,
        mode,
        modelId,
      });
      prepareObjectForViewing(currentObject, framingPreset, gltf.animations);
      applyModelMaterialOverrides(currentObject, modelId);
      applyShadowSettings(currentObject);
      ensureDisplayRoot().add(currentObject);
      frameDisplayRoot();
      battleRuntime.attach(currentObject);

      if (gltf.animations && gltf.animations.length > 0) {
        mixer = new THREE.AnimationMixer(currentObject);
        gltf.animations.forEach((clip) => {
          const action = mixer.clipAction(clip);
          action.play();
        });
      }

      loadSceneProps(activeSceneProps);
      loadComparisonModels(activeComparisonModels);
      setStatus(note || "가장 가까운 3D 모델을 연결했습니다.");
    },
    undefined,
    (error) => {
      console.warn("Failed to load bundle model.", error);
      showFallback("모델을 찾지 못해 기본 3D 형상으로 대체했습니다.");
    }
  );
}

window.addEventListener("resize", resize);
window.addEventListener("keydown", (event) => {
  if (event.repeat) {
    return;
  }

  if (event.code === "Space") {
    event.preventDefault();
    battleRuntime.toggleAutoFire(clock.getElapsedTime());
    return;
  }

  if (event.code === "Enter" || event.code === "KeyF") {
    event.preventDefault();
    battleRuntime.fireManual(clock.getElapsedTime());
    return;
  }

  if (event.code === "KeyR") {
    event.preventDefault();
    resetCamera();
  }
});
resize();

function animate() {
  requestAnimationFrame(animate);

  const delta = clock.getDelta();
  const elapsed = clock.getElapsedTime();
  controls.update();

  if (mixer) {
    mixer.update(delta);
  }

  battleRuntime.update(
    delta,
    elapsed,
    currentObject,
    objectBasePosition,
    objectBaseRotation
  );

  currentLineupMarkers.forEach((marker, index) => {
    const orb = marker.userData.orb;
    if (!orb) {
      return;
    }

    const baseScale = orb.userData.baseScale ?? 1;
    const pulse = 1 + Math.sin(elapsed * 2.2 + index * 0.7) * 0.16;
    orb.scale.setScalar(baseScale * pulse);
  });

  renderer.render(scene, camera);
}

animate();
