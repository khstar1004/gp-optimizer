export function humanizeLabel(value) {
  if (!value) {
    return "Immersive";
  }

  return value
    .split("-")
    .map((token) =>
      token.length > 0 ? `${token[0].toUpperCase()}${token.slice(1)}` : token
    )
    .join(" ");
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function toRadians(degrees) {
  return (degrees * Math.PI) / 180;
}

export function deriveBattleStatTuning(stats = {}) {
  const compareFactor = clamp(stats.compareCount ?? 1, 1, 5);
  const aircraftFactor = clamp((stats.aircraftCount ?? 0) + 1, 1, 6);
  const normalizedHeading = ((stats.heading ?? 0) % 360 + 360) % 360;
  const headingRadians = toRadians(normalizedHeading);

  return {
    headingRadians,
    rangeFactor: clamp((stats.range ?? 60) / 120, 0.8, 1.35),
    weaponFactor: clamp((stats.weaponCount ?? 1) / 4, 0.8, 2.2),
    motionFactor: clamp(
      ((stats.speed ?? 18) / 28) * (1 + (compareFactor - 1) * 0.08),
      0.72,
      1.7
    ),
    compareFactor,
    aircraftFactor,
    formationSpread: 1 + (compareFactor - 1) * 0.14,
    extraTargetCount: clamp(
      Math.max(
        Math.round(compareFactor - 1),
        Math.round(((stats.aircraftCount ?? 0) * 0.5) / 2)
      ),
      0,
      2
    ),
    escortDensity: clamp(1 + ((aircraftFactor - 1) * 0.16), 1, 1.8),
  };
}

export function getProfilePalette(profile, accent) {
  switch (profile) {
    case "ground":
      return {
        background:
          "radial-gradient(circle at top, rgba(126, 184, 94, 0.18), transparent 28%), linear-gradient(180deg, #10180d 0%, #081007 52%, #040704 100%)",
        fog: 0x081007,
        ground: "#5b7249",
        grid: "#8ecf6d",
        groundOpacity: 0.14,
        gridOpacity: 0.18,
      };
    case "fires":
      return {
        background:
          "radial-gradient(circle at top, rgba(255, 177, 90, 0.18), transparent 28%), linear-gradient(180deg, #1a130d 0%, #120907 52%, #060403 100%)",
        fog: 0x100907,
        ground: "#8d5c31",
        grid: "#ffb15a",
        groundOpacity: 0.12,
        gridOpacity: 0.2,
      };
    case "defense":
      return {
        background:
          "radial-gradient(circle at top, rgba(114, 240, 208, 0.18), transparent 28%), linear-gradient(180deg, #081614 0%, #071111 52%, #030606 100%)",
        fog: 0x071111,
        ground: "#3d6d63",
        grid: "#72f0d0",
        groundOpacity: 0.08,
        gridOpacity: 0.16,
      };
    case "maritime":
      return {
        background:
          "radial-gradient(circle at top, rgba(116, 216, 255, 0.16), transparent 28%), linear-gradient(180deg, #091826 0%, #07121b 52%, #03070c 100%)",
        fog: 0x07121b,
        ground: "#355b70",
        grid: "#74d8ff",
        groundOpacity: 0.06,
        gridOpacity: 0.12,
      };
    case "base":
      return {
        background:
          "radial-gradient(circle at top, rgba(217, 193, 129, 0.14), transparent 28%), linear-gradient(180deg, #17120e 0%, #110d0a 52%, #050403 100%)",
        fog: 0x110d0a,
        ground: "#7f6a42",
        grid: "#d9c181",
        groundOpacity: 0.08,
        gridOpacity: 0.14,
      };
    default:
      return {
        background:
          "radial-gradient(circle at top, rgba(115, 153, 86, 0.18), transparent 28%), linear-gradient(180deg, #0f1710 0%, #081008 52%, #040704 100%)",
        fog: 0x071008,
        ground: accent,
        grid: accent,
        groundOpacity: 0.12,
        gridOpacity: 0.18,
      };
  }
}

export function createBattleRuntime({
  THREE,
  scene,
  profile,
  operation,
  label,
  accent,
  glow,
  stats,
  actionElements,
}) {
  const enabled = profile.length > 0;
  const upAxis = new THREE.Vector3(0, 1, 0);
  const environmentLayer = new THREE.Group();
  const contactLayer = new THREE.Group();
  const effectLayer = new THREE.Group();
  scene.add(environmentLayer, contactLayer, effectLayer);

  const state = {
    config: null,
    contacts: [],
    projectiles: [],
    explosions: [],
    autoFire: enabled,
    nextFireAt: 0.8,
    shots: 0,
    hits: 0,
    message: enabled ? "교전 준비" : "",
    recoil: 0,
    sweep: null,
  };

  function projectileLabel(kind) {
    switch (kind) {
      case "shell":
        return "Gun Round";
      case "rocket":
        return "Rocket Salvo";
      case "missile":
        return "Missile";
      case "interceptor":
        return "Interceptor";
      default:
        return "Round";
    }
  }

  function refresh() {
    if (!enabled || !state.config || !actionElements) {
      return;
    }

    const liveTargets = state.contacts.filter((contact) => contact.active).length;
    const headingLabel =
      stats.heading !== undefined
        ? `AXIS ${Math.round(((stats.heading % 360) + 360) % 360)}`
        : null;
    const speedLabel =
      stats.speed !== undefined ? `SPD ${Math.round(stats.speed)}` : null;
    const compareLabel =
      stats.compareCount !== undefined
        ? `FORM ${Math.round(stats.compareCount)}`
        : null;
    actionElements.mode.textContent = `${humanizeLabel(operation)} / ${label}`;
    actionElements.state.textContent = state.message;
    actionElements.counts.textContent = [
      state.autoFire ? "AUTO ON" : "AUTO HOLD",
      projectileLabel(state.config.projectileKind),
      `SHOTS ${state.shots}`,
      `HITS ${state.hits}`,
      `TARGETS ${liveTargets}/${state.contacts.length}`,
      headingLabel,
      speedLabel,
      compareLabel,
    ]
      .filter(Boolean)
      .join("  |  ");
  }

  function disposeObject(object) {
    object.traverse((child) => {
      if (child.geometry) {
        child.geometry.dispose();
      }

      const { material } = child;
      if (Array.isArray(material)) {
        material.forEach((entry) => entry?.dispose?.());
        return;
      }

      material?.dispose?.();
    });
    object.removeFromParent();
  }

  function clearGroup(group) {
    [...group.children].forEach((child) => disposeObject(child));
  }

  function glowMaterial(color, opacity) {
    return new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
  }

  function targetMesh(type, color, scale) {
    const group = new THREE.Group();
    const baseMaterial = new THREE.MeshStandardMaterial({
      color: new THREE.Color(color).multiplyScalar(0.72),
      roughness: 0.48,
      metalness: 0.18,
    });
    const body =
      type === "aircraft" || type === "missile"
        ? new THREE.Mesh(
            new THREE.CylinderGeometry(0.08 * scale, 0.08 * scale, 0.86 * scale, 12),
            baseMaterial
          )
        : new THREE.Mesh(
            new THREE.BoxGeometry(0.75 * scale, 0.24 * scale, 1.02 * scale),
            baseMaterial
          );

    if (type === "aircraft" || type === "missile") {
      body.rotation.x = Math.PI / 2;
    } else {
      body.position.y = 0.12 * scale;
    }
    body.castShadow = true;
    body.receiveShadow = true;

    const reticle = new THREE.Mesh(
      new THREE.RingGeometry(0.22 * scale, 0.34 * scale, 24),
      glowMaterial(color, 0.26)
    );
    reticle.rotation.x = -Math.PI / 2;
    reticle.position.y = -0.1 * scale;

    const glowOrb = new THREE.Mesh(
      new THREE.SphereGeometry(0.12 * scale, 14, 14),
      glowMaterial(color, 0.32)
    );
    glowOrb.position.y = 0.32 * scale;

    group.add(body, reticle, glowOrb);
    return { group, reticle, glowOrb };
  }

  function projectileMesh(kind, color) {
    const group = new THREE.Group();
    const body = new THREE.Mesh(
      new THREE.CylinderGeometry(0.055, 0.055, kind === "rocket" ? 0.7 : 0.5, 16),
      new THREE.MeshStandardMaterial({
        color,
        emissive: new THREE.Color(color).multiplyScalar(0.28),
        roughness: 0.24,
        metalness: 0.12,
      })
    );
    const tip = new THREE.Mesh(
      new THREE.ConeGeometry(0.08, 0.18, 16),
      new THREE.MeshStandardMaterial({
        color: new THREE.Color(color).lerp(new THREE.Color(0xffffff), 0.25),
        emissive: new THREE.Color(color).multiplyScalar(0.18),
        roughness: 0.18,
        metalness: 0.05,
      })
    );
    tip.position.y = kind === "rocket" ? 0.42 : 0.32;
    const tailGlow = new THREE.Mesh(
      new THREE.SphereGeometry(0.08, 12, 12),
      glowMaterial(color, 0.4)
    );
    tailGlow.position.y = -0.18;
    body.castShadow = true;
    body.receiveShadow = true;
    tip.castShadow = true;
    tip.receiveShadow = true;
    group.add(body, tip, tailGlow);
    return group;
  }

  function samplePath(projectile, t, target = new THREE.Vector3()) {
    target.lerpVectors(projectile.start, projectile.end, t);
    target.addScaledVector(projectile.upVector, Math.sin(Math.PI * t) * projectile.arcHeight);
    if (projectile.kind === "interceptor" || projectile.kind === "missile") {
      target.y += projectile.extraClimb * t * (1 - t * 0.25);
    }
    if (projectile.kind === "rocket") {
      target.addScaledVector(projectile.sideAxis, Math.sin(Math.PI * t) * projectile.lateral);
    }
    return target;
  }

  function rotatePointByHeading(point, headingRadians) {
    const cosine = Math.cos(headingRadians);
    const sine = Math.sin(headingRadians);
    const rotatedPoint = point.clone();
    const rotatedX = point.x * cosine - point.z * sine;
    const rotatedZ = point.x * sine + point.z * cosine;
    rotatedPoint.x = rotatedX;
    rotatedPoint.z = rotatedZ;
    return rotatedPoint;
  }

  function buildFormationTargets(baseTargets, tuning, radius) {
    if (tuning.extraTargetCount <= 0) {
      return baseTargets;
    }

    const forwardAxis = new THREE.Vector3(
      Math.sin(tuning.headingRadians),
      0,
      Math.cos(tuning.headingRadians)
    );
    const lateralAxis = new THREE.Vector3(forwardAxis.z, 0, -forwardAxis.x);
    const expandedTargets = [...baseTargets];

    for (let index = 0; index < tuning.extraTargetCount; index += 1) {
      const anchor = baseTargets[index % baseTargets.length];
      const lane = index % 2 === 0 ? -1 : 1;
      const position = anchor.position
        .clone()
        .addScaledVector(
          lateralAxis,
          radius * (0.85 + index * 0.16) * tuning.formationSpread * lane
        )
        .addScaledVector(forwardAxis, radius * (0.34 + index * 0.12));

      if (anchor.type === "aircraft" || anchor.type === "missile") {
        position.y += radius * 0.14;
      }

      expandedTargets.push({
        ...anchor,
        position,
        speed: anchor.speed * (0.94 + index * 0.05),
        motion: anchor.motion === "idle" ? "advance" : anchor.motion,
        scale: Math.max(0.72, anchor.scale * 0.9),
      });
    }

    return expandedTargets;
  }

  function buildConfig(object) {
    const bounds = new THREE.Box3().setFromObject(object);
    const size = bounds.getSize(new THREE.Vector3());
    const radius = Math.max(size.x, size.y, size.z, 2.2) * 0.72;
    const groundLevel = -1.12;
    const guidedGround = /m577|km900|command/.test(label.toLowerCase());
    const tuning = deriveBattleStatTuning(stats);
    const cadenceFactor = clamp(
      tuning.weaponFactor * (1 + (tuning.compareFactor - 1) * 0.06),
      0.84,
      1.55
    );
    const durationFactor = clamp(
      0.94 + tuning.rangeFactor * 0.12 + tuning.compareFactor * 0.03,
      0.96,
      1.28
    );
    const origin = rotatePointByHeading(
      new THREE.Vector3(
        0,
        Math.max(bounds.max.y * (profile === "defense" ? 0.9 : 0.76), 0.78),
        Math.max(bounds.max.z * (profile === "ground" ? 0.7 : 0.28), 0.24) +
          radius * (tuning.compareFactor - 1) * 0.05
      ),
      tuning.headingRadians
    );

    function point(x, y, z) {
      return rotatePointByHeading(
        new THREE.Vector3(
          radius * x * tuning.formationSpread,
          groundLevel + radius * y,
          radius * z * tuning.formationSpread
        ),
        tuning.headingRadians
      );
    }

    function finalizeConfig(config) {
      return {
        ...config,
        origin,
        targets: buildFormationTargets(config.targets, tuning, radius),
        motionFactor: tuning.motionFactor,
        headingRadians: tuning.headingRadians,
        compareFactor: tuning.compareFactor,
        escortDensity: tuning.escortDensity,
      };
    }

    if (profile === "ground") {
      return finalizeConfig({
        projectileKind: guidedGround ? "missile" : "shell",
        projectileColor: guidedGround ? glow : "#ffb15a",
        blastColor: "#ff9052",
        fireInterval:
          (operation === "convoy-guard" ? 2.2 : 2.8) /
          clamp(cadenceFactor, 0.9, 1.32),
        salvoSize: clamp(
          (operation === "breakthrough" ? 2 : 1) +
            Math.round(tuning.weaponFactor - 1.15),
          1,
          3
        ),
        arcHeight: guidedGround ? radius * 0.75 : radius * 0.34,
        duration: (guidedGround ? 1.35 : 0.95) * durationFactor,
        impactRadius: guidedGround ? 1.08 : 0.9,
        context: "ground",
        targets: [
          { position: point(-1.0, 0.02, 1.62), type: "armor", speed: 0.58, motion: "strafe", scale: 1 },
          { position: point(0.2, 0.02, 2.18), type: "armor", speed: 0.48, motion: "advance", scale: 1.08 },
          { position: point(1.1, 0.02, 1.5), type: "battery", speed: 0.52, motion: "idle", scale: 1 },
        ],
      });
    }

    if (profile === "fires") {
      return finalizeConfig({
        projectileKind: operation === "saturation" ? "rocket" : "shell",
        projectileColor: "#ffb15a",
        blastColor: "#ff9966",
        fireInterval:
          (operation === "saturation" ? 1.75 : 2.45) /
          clamp(cadenceFactor, 0.9, 1.45),
        salvoSize: clamp(
          operation === "saturation"
            ? Math.round(tuning.weaponFactor * (1.6 + (tuning.compareFactor - 1) * 0.12))
            : 1 + Math.round((tuning.compareFactor - 1) * 0.35),
          1,
          5
        ),
        arcHeight:
          radius * (operation === "deep-strike" ? 1.8 : 1.35) * tuning.rangeFactor,
        duration: (operation === "deep-strike" ? 2.05 : 1.6) * durationFactor,
        impactRadius:
          (operation === "deep-strike" ? 1.55 : 1.2) *
          clamp(1 + (tuning.compareFactor - 1) * 0.06, 1, 1.24),
        context: "fires",
        targets: [
          { position: point(-1.25, 0.02, 2.6), type: "battery", speed: 0.36, motion: "idle", scale: 1.06 },
          { position: point(0.05, 0.02, 3.02), type: "battery", speed: 0.44, motion: "advance", scale: 1.1 },
          { position: point(1.2, 0.02, 2.38), type: "armor", speed: 0.56, motion: "strafe", scale: 0.96 },
        ],
      });
    }

    if (profile === "defense") {
      return finalizeConfig({
        projectileKind: "interceptor",
        projectileColor: glow,
        blastColor: "#9cdfff",
        fireInterval:
          (operation === "point-defense" ? 1.35 : 1.9) /
          clamp(1 + (tuning.compareFactor - 1) * 0.1, 1, 1.35),
        salvoSize: clamp(
          (operation === "point-defense" ? 1 : 2) +
            Math.round((tuning.compareFactor - 1) * 0.45),
          1,
          4
        ),
        arcHeight: radius * 1.1 * clamp(0.96 + tuning.rangeFactor * 0.18, 1, 1.26),
        duration: 1.2 * durationFactor,
        impactRadius: 1 * clamp(1 + (tuning.compareFactor - 1) * 0.05, 1, 1.18),
        context: "defense",
        targets: [
          { position: point(-1.1, 1.32, 1.9), type: "aircraft", speed: 0.56, motion: "orbit", scale: 0.9 },
          { position: point(0.2, 1.55, 2.42), type: "missile", speed: 0.84, motion: "dive", scale: 0.82 },
          { position: point(1.05, 1.2, 1.75), type: "aircraft", speed: 0.68, motion: "hover", scale: 0.84 },
        ],
      });
    }

    if (profile === "maritime") {
      return finalizeConfig({
        projectileKind: operation === "silent-patrol" ? "missile" : "rocket",
        projectileColor: "#75f0dd",
        blastColor: "#9effd8",
        fireInterval: 2.05 / clamp(cadenceFactor * 0.92, 0.9, 1.32),
        salvoSize: clamp(
          (operation === "carrier-screen" ? 2 : 1) +
            Math.round((tuning.aircraftFactor - 1) * 0.28),
          1,
          4
        ),
        arcHeight: radius * 0.62 * clamp(1 + (tuning.compareFactor - 1) * 0.04, 1, 1.18),
        duration: 1.4 * durationFactor,
        impactRadius: 1.18,
        context: "maritime",
        targets: [
          { position: point(-1.2, 0.08, 2.28), type: "ship", speed: 0.28, motion: "wake", scale: 1 },
          { position: point(0.12, 0.14, 2.88), type: "missile", speed: 0.76, motion: "wake", scale: 0.84 },
          { position: point(1.22, 0.08, 2.1), type: "ship", speed: 0.32, motion: "wake", scale: 0.94 },
        ],
      });
    }

    return finalizeConfig({
      projectileKind: operation === "drone-watch" ? "interceptor" : "rocket",
      projectileColor: operation === "drone-watch" ? "#8fd9ff" : "#d9c181",
      blastColor: "#ffd089",
      fireInterval:
        (operation === "drone-watch" ? 1.6 : 2.15) /
        clamp(cadenceFactor * 0.92, 0.9, 1.36),
      salvoSize: clamp(
        (operation === "rotary-lift" ? 2 : 1) +
          Math.round((tuning.aircraftFactor - 1) * 0.34),
        1,
        4
      ),
      arcHeight: radius * 0.58 * clamp(1 + (tuning.aircraftFactor - 1) * 0.05, 1, 1.24),
      duration: 1.35 * durationFactor,
      impactRadius: 1.02,
      context: "base",
      targets: [
        { position: point(-1.08, 0.04, 1.6), type: "armor", speed: 0.58, motion: "strafe", scale: 0.96 },
        { position: point(0.12, 0.95, 1.98), type: "aircraft", speed: 0.72, motion: "hover", scale: 0.82 },
        { position: point(1.0, 0.04, 1.72), type: "battery", speed: 0.52, motion: "advance", scale: 1 },
      ],
    });
  }

  function addContext(config) {
    const headingAxisLength = 3.6 + config.compareFactor * 0.55;
    const headingAxisPoints = [
      new THREE.Vector3(0, -1.23, 0),
      rotatePointByHeading(
        new THREE.Vector3(0, -1.23, headingAxisLength),
        config.headingRadians
      ),
    ];
    const headingAxis = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(headingAxisPoints),
      new THREE.LineBasicMaterial({
        color: accent,
        transparent: true,
        opacity: 0.26,
      })
    );
    environmentLayer.add(headingAxis);

    if (config.context === "defense") {
      const sweep = new THREE.Mesh(
        new THREE.CircleGeometry(config.impactRadius + 3.8, 48, 0, Math.PI / 6),
        glowMaterial(glow, 0.12)
      );
      sweep.rotation.x = -Math.PI / 2;
      sweep.position.y = -1.25;
      sweep.rotation.z = config.headingRadians;
      environmentLayer.add(sweep);
      state.sweep = sweep;
    } else if (config.context === "maritime") {
      const water = new THREE.Mesh(
        new THREE.CircleGeometry(8.6, 72),
        new THREE.MeshBasicMaterial({
          color: "#2a6f9d",
          transparent: true,
          opacity: 0.16,
          side: THREE.DoubleSide,
          depthWrite: false,
        })
      );
      water.rotation.x = -Math.PI / 2;
      water.position.y = -1.28;
      environmentLayer.add(water);

      const wakeLane = new THREE.Mesh(
        new THREE.PlaneGeometry(1.6 * config.escortDensity, 8.8),
        new THREE.MeshBasicMaterial({
          color: "#7de8ff",
          transparent: true,
          opacity: 0.08,
          side: THREE.DoubleSide,
          depthWrite: false,
        })
      );
      wakeLane.rotation.x = -Math.PI / 2;
      wakeLane.rotation.z = config.headingRadians;
      wakeLane.position.set(0, -1.27, 1.8);
      environmentLayer.add(wakeLane);
    } else if (config.context === "base") {
      const runway = new THREE.Mesh(
        new THREE.PlaneGeometry(2.2, 8.6),
        new THREE.MeshBasicMaterial({
          color: "#56504b",
          transparent: true,
          opacity: 0.3,
          side: THREE.DoubleSide,
          depthWrite: false,
        })
      );
      runway.rotation.x = -Math.PI / 2;
      runway.rotation.z = config.headingRadians;
      runway.position.set(0, -1.25, 3.2);
      environmentLayer.add(runway);

      const runwayCenterLine = new THREE.Mesh(
        new THREE.PlaneGeometry(0.18, 7.6),
        new THREE.MeshBasicMaterial({
          color: "#d9c181",
          transparent: true,
          opacity: 0.22,
          side: THREE.DoubleSide,
          depthWrite: false,
        })
      );
      runwayCenterLine.rotation.x = -Math.PI / 2;
      runwayCenterLine.rotation.z = config.headingRadians;
      runwayCenterLine.position.set(0, -1.24, 3.2);
      environmentLayer.add(runwayCenterLine);
    }
  }

  function attach(object) {
    reset();
    if (!enabled) {
      return;
    }

    state.config = buildConfig(object);
    addContext(state.config);
    state.contacts = state.config.targets.map((target, index) => {
      const contact = targetMesh(
        target.type,
        profile === "defense" ? "#ff8266" : "#ff7159",
        target.scale
      );
      contact.group.position.copy(target.position);
      contactLayer.add(contact.group);
      return {
        ...target,
        group: contact.group,
        reticle: contact.reticle,
        glowOrb: contact.glowOrb,
        basePosition: target.position.clone(),
        seed: index * 1.17,
        active: true,
        respawnTimer: 0,
        engagementCount: 0,
      };
    });
    state.message = `${projectileLabel(state.config.projectileKind)} 체계 준비`;
    refresh();
  }

  function fireVolley(source) {
    if (!state.config) {
      return;
    }

    const targets = state.contacts
      .filter((contact) => contact.active)
      .sort((left, right) => left.engagementCount - right.engagementCount);

    if (targets.length === 0) {
      return;
    }

    const volleySize = clamp(state.config.salvoSize, 1, Math.max(1, targets.length));

    for (let index = 0; index < volleySize; index += 1) {
      const target = targets[(state.shots + index) % targets.length];
      const start = state.config.origin.clone();
      const end = target.group.position.clone();
      const direction = end.clone().sub(start).normalize();
      const sideAxis = new THREE.Vector3().crossVectors(direction, upAxis);
      if (sideAxis.lengthSq() < 1e-4) {
        sideAxis.set(1, 0, 0);
      } else {
        sideAxis.normalize();
      }

      const projectile = {
        kind: state.config.projectileKind,
        start,
        end,
        upVector: upAxis.clone(),
        sideAxis,
        age: 0,
        duration: state.config.duration,
        arcHeight: state.config.arcHeight,
        extraClimb:
          state.config.projectileKind === "interceptor"
            ? 1
            : state.config.projectileKind === "missile"
              ? 0.5
              : 0,
        lateral: state.config.projectileKind === "rocket" ? (index % 2 === 0 ? -0.45 : 0.45) : 0,
        target,
        mesh: projectileMesh(state.config.projectileKind, state.config.projectileColor),
        trail: null,
      };

      const points = [];
      for (let step = 0; step <= 24; step += 1) {
        points.push(samplePath(projectile, step / 24));
      }

      projectile.trail = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(points),
        new THREE.LineBasicMaterial({
          color: state.config.projectileColor,
          transparent: true,
          opacity: 0.85,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        })
      );
      projectile.mesh.position.copy(start);
      effectLayer.add(projectile.trail, projectile.mesh);
      state.projectiles.push(projectile);
      target.engagementCount += 1;
      state.shots += 1;
    }

    state.recoil = Math.min(1.1, state.recoil + 0.7);
    state.message =
      source === "manual"
        ? `${projectileLabel(state.config.projectileKind)} 수동 발사`
        : `${projectileLabel(state.config.projectileKind)} 자동 교전`;
    refresh();
  }

  function spawnExplosion(position) {
    const group = new THREE.Group();
    group.position.copy(position);
    const core = new THREE.Mesh(
      new THREE.SphereGeometry(0.18, 14, 14),
      glowMaterial(state.config.blastColor, 0.72)
    );
    const shell = new THREE.Mesh(
      new THREE.SphereGeometry(0.3, 14, 14),
      glowMaterial(state.config.blastColor, 0.24)
    );
    group.add(core, shell);
    effectLayer.add(group);
    state.explosions.push({ group, core, shell, age: 0, duration: 0.75 });
  }

  function reset() {
    clearGroup(environmentLayer);
    clearGroup(contactLayer);
    clearGroup(effectLayer);
    state.config = null;
    state.contacts = [];
    state.projectiles = [];
    state.explosions = [];
    state.nextFireAt = 0.8;
    state.shots = 0;
    state.hits = 0;
    state.recoil = 0;
    state.sweep = null;
    state.message = enabled ? "교전 준비" : "";
    refresh();
  }

  function toggleAutoFire(now) {
    if (!enabled) {
      return;
    }

    state.autoFire = !state.autoFire;
    state.nextFireAt = now + 0.35;
    state.message = state.autoFire ? "자동 교전 재개" : "자동 교전 일시정지";
    refresh();
  }

  function fireManual(now) {
    if (!enabled || !state.config) {
      return;
    }

    fireVolley("manual");
    state.nextFireAt = now + state.config.fireInterval * 0.58;
  }

  function updateContacts(elapsed, delta) {
    state.contacts.forEach((contact) => {
      if (!contact.active) {
        contact.respawnTimer -= delta;
        if (contact.respawnTimer <= 0) {
          contact.active = true;
          contact.group.visible = true;
          contact.engagementCount = 0;
        }
        return;
      }

      const phase =
        elapsed * contact.speed * state.config.motionFactor + contact.seed;
      const lateralScale = clamp(
        0.92 + (state.config.motionFactor - 1) * 0.26,
        0.88,
        1.26
      );
      const verticalScale = clamp(
        0.96 + (state.config.motionFactor - 1) * 0.2,
        0.92,
        1.22
      );
      const xOffset =
        contact.motion === "orbit"
          ? Math.cos(phase) * 0.45 * lateralScale
          : Math.sin(phase) *
            (contact.motion === "strafe" ? 0.36 : 0.18) *
            lateralScale;
      const yOffset =
        contact.motion === "hover" || contact.motion === "orbit"
          ? Math.sin(phase * 1.4) * 0.18 * verticalScale
          : contact.motion === "dive"
            ? Math.cos(phase * 1.2) * 0.16 * verticalScale
            : 0;
      const zOffset =
        contact.motion === "advance" || contact.motion === "dive"
          ? -Math.sin(phase) * 0.28 * lateralScale
          : Math.cos(phase * 0.45) * 0.12 * lateralScale;

      contact.group.position.set(
        contact.basePosition.x + xOffset,
        contact.basePosition.y + yOffset,
        contact.basePosition.z + zOffset
      );
      contact.group.rotation.y += delta * (0.78 + state.config.motionFactor * 0.24);
      const pulse = 0.9 + Math.sin(phase * 1.9) * 0.12;
      contact.glowOrb.scale.setScalar(pulse);
      contact.glowOrb.material.opacity = 0.2 + Math.sin(phase * 1.6) * 0.08;
      contact.reticle.material.opacity = 0.16 + Math.sin(phase * 1.3) * 0.08;
    });
  }

  function updateProjectiles(delta) {
    for (let index = state.projectiles.length - 1; index >= 0; index -= 1) {
      const projectile = state.projectiles[index];
      projectile.age += delta;
      const t = clamp(projectile.age / projectile.duration, 0, 1);
      const position = samplePath(projectile, t);
      const forward = samplePath(projectile, Math.min(1, t + 0.02));
      const direction = forward.sub(position).normalize();

      projectile.mesh.position.copy(position);
      projectile.mesh.quaternion.setFromUnitVectors(upAxis, direction);
      projectile.trail.material.opacity = 0.82 * (1 - t * 0.18);

      if (t >= 1) {
        projectile.target.engagementCount = Math.max(
          0,
          projectile.target.engagementCount - 1
        );
        if (projectile.target.active) {
          projectile.target.active = false;
          projectile.target.group.visible = false;
          projectile.target.respawnTimer =
            (1.6 + projectile.target.seed * 0.08) /
            clamp(1 + (state.config.compareFactor - 1) * 0.08, 1, 1.3);
        }

        spawnExplosion(projectile.end);
        state.hits += 1;
        state.message = `${projectileLabel(projectile.kind)} 명중 확인`;
        refresh();
        disposeObject(projectile.mesh);
        disposeObject(projectile.trail);
        state.projectiles.splice(index, 1);
      }
    }
  }

  function updateExplosions(delta) {
    for (let index = state.explosions.length - 1; index >= 0; index -= 1) {
      const explosion = state.explosions[index];
      explosion.age += delta;
      const t = clamp(explosion.age / explosion.duration, 0, 1);
      const spread = 1 + t * 3.8;
      explosion.core.scale.setScalar(spread * 0.8);
      explosion.shell.scale.setScalar(spread * 1.18);
      explosion.core.material.opacity = 0.68 * (1 - t);
      explosion.shell.material.opacity = 0.22 * (1 - t);

      if (t >= 1) {
        disposeObject(explosion.group);
        state.explosions.splice(index, 1);
      }
    }
  }

  function update(delta, elapsed, object, basePosition, baseRotation) {
    if (!enabled || !state.config) {
      return;
    }

    if (state.sweep) {
      state.sweep.rotation.z =
        state.config.headingRadians + elapsed * (0.4 + state.config.motionFactor * 0.08);
    }

    updateContacts(elapsed, delta);
    updateProjectiles(delta);
    updateExplosions(delta);

    state.recoil = Math.max(0, state.recoil - delta * 2.6);
    if (object) {
      object.position.copy(basePosition);
      object.rotation.copy(baseRotation);
      object.position.y +=
        Math.sin(
          elapsed *
            (profile === "maritime" ? 0.85 : 1.1) *
            clamp(state.config.motionFactor, 0.85, 1.35)
        ) * (profile === "maritime" ? 0.08 : 0.02);
      object.position.z -= state.recoil * 0.16;
      if (profile === "maritime") {
        object.rotation.z +=
          Math.sin(elapsed * 0.72 * clamp(state.config.motionFactor, 0.9, 1.22)) *
          0.03;
      }
    }

    if (state.autoFire && elapsed >= state.nextFireAt) {
      fireVolley("auto");
      state.nextFireAt = elapsed + state.config.fireInterval;
    }
  }

  return {
    enabled,
    hint: enabled ? "Enter/F 발사, Space 자동교전, R 시점복구" : "Drag 회전, Wheel 확대",
    modeLabel: enabled ? `${humanizeLabel(profile)} / ${humanizeLabel(operation)}` : "",
    attach,
    reset,
    update,
    toggleAutoFire,
    fireManual,
  };
}
