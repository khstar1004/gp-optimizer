// @ts-nocheck
export const SIDE_COLOR_MAP = {
  blue: "#7fe7ff",
  red: "#ff6b6b",
  silver: "#dce5f2",
  yellow: "#ffd166",
  green: "#80ed99",
  black: "#f1f5f9",
};

export const GROUND_CLUSTER_BUCKET_DEGREES = 0.0012;
export const GROUND_CLUSTER_BASE_ALTITUDE_METERS = 2.4;
export const GROUND_MODEL_BUDGET = 144;
export const GOLDEN_ANGLE_RADIANS = Math.PI * (3 - Math.sqrt(5));
export const WEAPON_ARC_SAMPLE_COUNT = 18;
export const WEAPON_TRANSIENT_EFFECT_LIMIT = 28;
export const RUNTIME_VISIBLE_UNIT_RENDER_LIMIT = 56;
export const RUNTIME_VISIBLE_WEAPON_RENDER_LIMIT = 28;
export const EVENT_EFFECT_KEY_LIMIT = 96;
export const WEAPON_LAUNCH_EFFECT_MS = 1450;
export const WEAPON_IMPACT_EFFECT_MS = 5200;
export const EVENT_TRACE_SAMPLE_COUNT = 24;
export const RUNTIME_POSITION_SMOOTH_MIN_DURATION_MS = 420;
export const RUNTIME_POSITION_SMOOTH_MAX_DURATION_MS = 1600;
export const RUNTIME_POSITION_COAST_MIN_DURATION_MS = 480;
export const RUNTIME_POSITION_COAST_MAX_DURATION_MS = 2200;
export const RUNTIME_POSITION_SMOOTH_DISTANCE_EPSILON_METERS = 0.35;
export const RUNTIME_UNIT_POSITION_SNAP_DISTANCE_METERS = 1800;
export const RUNTIME_WEAPON_POSITION_SNAP_DISTANCE_METERS = 12000;
export const MIN_WEAPON_DIRECTION_MAGNITUDE_SQUARED = 0.0001;
export const FOCUS_FIRE_IMPACT_EVENT_DISTANCE_METERS = 900;
export const DRONE_ROUTE_GROUP_BUCKET_DEGREES = 0.0035;
export const DRONE_FORMATION_BASE_RADIUS_METERS = 34;
export const DRONE_FORMATION_RING_SPACING_METERS = 22;
export const DRONE_FORMATION_BASE_ALTITUDE_METERS = 18;
export const DRONE_FORMATION_VERTICAL_STEP_METERS = 5;
export const DRONE_FORMATION_COLLAPSE_DISTANCE_METERS = 700;
export const AIRCRAFT_ROUTE_TARGET_REACHED_METERS = 120;
export const TERRAIN_BOUND_WEAPON_MAX_BASE_ALTITUDE_METERS = 900;
export const TERRAIN_ANCHOR_FALLBACK_GROUND_ALTITUDE_METERS = 760;
export const TERRAIN_ANCHOR_HEIGHT_CACHE_DECIMALS = 5;
export const TERRAIN_ANCHOR_REFRESH_DELAY_MS = 180;
export const TERRAIN_ANCHOR_REFRESH_MAX_ATTEMPTS = 8;
export const TERRAIN_UNIT_MODEL_MODE = "all";
export function resolveTerrainRuntimePublicPath(path) {
  const normalizedPath = String(path ?? "").trim();
  if (!normalizedPath.startsWith("/")) {
    return normalizedPath;
  }

  // Vite bundles this compatibility module into `/assets/*.js`, so resolving
  // relative to import.meta.url would incorrectly point at `/3d-bundles`.
  // The Node server intentionally mounts the external VISTA asset directory at
  // this stable public prefix for both bundled and unbundled consumers.
  if (typeof window !== "undefined" && window.location?.origin) {
    return `/js/vendor${normalizedPath}`;
  }

  return normalizedPath;
}

export function resolveTerrainRuntimeAssetValue(value) {
  if (typeof value === "string") {
    return value.startsWith("/3d-bundles/")
      ? resolveTerrainRuntimePublicPath(value)
      : value;
  }

  if (value instanceof RegExp || value === null || value === undefined) {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((entry) => resolveTerrainRuntimeAssetValue(entry));
  }

  if (typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [
        key,
        resolveTerrainRuntimeAssetValue(entry),
      ])
    );
  }

  return value;
}

export const EFFECT_TEXTURES = resolveTerrainRuntimeAssetValue({
  headGlow: "/3d-bundles/effects/textures/focus-fire/head_glow.png",
  launchMuzzle: "/3d-bundles/effects/textures/focus-fire/launch_muzzle.png",
  trailTrace: "/3d-bundles/effects/textures/focus-fire/trail_trace.png",
  trailSmoke: "/3d-bundles/effects/textures/focus-fire/trail_smoke.png",
  impactFlash: "/3d-bundles/effects/textures/focus-fire/impact_flash.png",
  impactSmoke: "/3d-bundles/effects/textures/focus-fire/impact_smoke.png",
  impactDust: "/3d-bundles/effects/textures/focus-fire/impact_dust.png",
  explosionFrames: Array.from(
    { length: 9 },
    (_item, index) =>
      `/3d-bundles/effects/libraries/kenney_smoke_particles/PNG/Explosion/explosion0${index}.png`
  ),
  flashFrames: Array.from(
    { length: 9 },
    (_item, index) =>
      `/3d-bundles/effects/libraries/kenney_smoke_particles/PNG/Flash/flash0${index}.png`
  ),
});

export const DEFAULT_WEAPON_MODEL_URI = resolveTerrainRuntimePublicPath(
  "/3d-bundles/artillery/models/artillery_shell.glb"
);
export const MISSILE_WEAPON_MODEL_URI = resolveTerrainRuntimePublicPath(
  "/3d-bundles/missile/aim-120c_amraam.glb"
);
export const WEAPON_MODEL_URI_BY_ID = {
  "weapon-air-to-air-missile": MISSILE_WEAPON_MODEL_URI,
  "weapon-surface-missile": MISSILE_WEAPON_MODEL_URI,
  "weapon-artillery-shell": DEFAULT_WEAPON_MODEL_URI,
};
export const WEAPON_MODEL_MAP = [
  [
    /\b(aim-|agm-|asm|sam|aam|atgm|jassm|tomahawk|missile|interceptor|patriot|thaad|nasams)\b/i,
    MISSILE_WEAPON_MODEL_URI,
  ],
  [
    /\b(shell|round|rocket|mortar|ksm|ksm120|artillery|howitzer|mlrs|ballistic|hyunmoo|k9|m109|d-30|paladin|cannon|gun|20mm|30mm|120mm|155mm)\b/i,
    DEFAULT_WEAPON_MODEL_URI,
  ],
];

export const MODEL_ROOT_NODE_NAME = "Sketchfab_model";
export const MODEL_AXIS_CORRECTION_BY_URI = new Map(
  resolveTerrainRuntimeAssetValue([
    [
      "/3d-bundles/aircraft/models/boeing_ah-64d_apache_combat_helicopter.glb",
      "gltf-y-up-x-forward",
    ],
    [
      "/3d-bundles/aircraft/models/f-35_lightning_ii_-_fighter_jet_-_free.glb",
      "gltf-y-up-x-forward",
    ],
    [
      "/3d-bundles/aircraft/models/kf-21a_boramae_fighter_jet.glb",
      "gltf-y-up-y-forward",
    ],
    [
      "/3d-bundles/aircraft/models/lockheed_martin_f-16ef_fighting_falcon.glb",
      "gltf-y-up-x-forward",
    ],
    ["/3d-bundles/aircraft/models/e-737_peace_eye.glb", "gltf-y-up-y-forward"],
    ["/3d-bundles/aircraft/models/kc-330_mrtt.glb", "gltf-y-up-y-forward"],
    [
      "/3d-bundles/aircraft/models/mcdonnell_douglas_f-15_strike_eagle.glb",
      "gltf-y-up-y-forward",
    ],
    [
      "/3d-bundles/aircraft/models/sikorsky_uh-60m_blackhawk.glb",
      "gltf-y-up-x-forward",
    ],
    ["/3d-bundles/artillery/models/d-30_howitzer.glb", "gltf-y-up-y-forward"],
    [
      "/3d-bundles/artillery/models/howitzer_artillery_tank.glb",
      "gltf-y-up-x-forward",
    ],
    [
      "/3d-bundles/artillery/models/hyunmoo5irbmlauncher.glb",
      "gltf-y-up-x-forward",
    ],
    [
      "/3d-bundles/artillery/models/k9_thunder_artillery.glb",
      "gltf-y-up-y-forward",
    ],
    [
      "/3d-bundles/artillery/models/k9_thunder_artillery (1).glb",
      "gltf-y-up-y-forward",
    ],
    [
      "/3d-bundles/artillery/models/m109a6_paladin_self-propelled_howitzer.glb",
      "gltf-y-up-y-forward",
    ],
    [
      "/3d-bundles/artillery/models/mim-104_patriot_surface-to-air_missile_sam.glb",
      "gltf-y-up-x-forward",
    ],
    ["/3d-bundles/artillery/models/nasams_battery.glb", "gltf-y-up-x-forward"],
    ["/3d-bundles/artillery/models/thaad-2.glb", "gltf-y-up-x-forward"],
    ["/3d-bundles/drone/models/animated_drone.glb", "gltf-y-up-y-forward"],
    ["/3d-bundles/drone/models/drone.glb", "gltf-y-up-y-forward"],
    [
      "/3d-bundles/drone/models/80_followers_iranian_shahed-136_drone.glb",
      "gltf-y-up-y-forward",
    ],
    ["/3d-bundles/tank/models/m1150_abv.glb", "gltf-y-up-x-forward"],
    ["/3d-bundles/artillery/models/m48_chaparral.glb", "gltf-y-up-x-forward"],
    ["/3d-bundles/robotics/models/mini_dron_ugv.glb", "gltf-y-up-y-forward"],
    ["/3d-bundles/tank/models/oshkosh_m-atv.glb", "gltf-y-up-x-forward"],
    [
      "/3d-bundles/ships/hms_queen_elizabeth_r08_aircraft_carrier.glb",
      "gltf-y-up-y-forward",
    ],
    ["/3d-bundles/ships/type-45_destroyer_class.glb", "gltf-y-up-y-forward"],
    [
      "/3d-bundles/ships/uss_texas_ssn-775_submarine.glb",
      "gltf-y-up-x-forward",
    ],
    ["/3d-bundles/tank/models/k21_armored_warfare.glb", "gltf-y-up-y-forward"],
    ["/3d-bundles/tank/models/m1126_stryker_50_cal.glb", "gltf-y-up-x-forward"],
    ["/3d-bundles/tank/models/m113a1.glb", "gltf-y-up-x-forward"],
    ["/3d-bundles/tank/models/m577_command_vehicle.glb", "gltf-y-up-x-forward"],
    [
      "/3d-bundles/tank/models/south_korean_km900_apc.glb",
      "gltf-y-up-x-forward",
    ],
    ["/3d-bundles/tank/models/t-50_war_thunder.glb", "gltf-y-up-y-forward"],
    ["/3d-bundles/tank/models/t-80u_tank.glb", "gltf-y-up-y-forward"],
    [
      "/3d-bundles/personnel/models/soldier_character.glb",
      "gltf-y-up-y-forward",
    ],
    [
      "/3d-bundles/robotics/models/quadruped_ground_robot.glb",
      "gltf-y-up-y-forward",
    ],
    [
      "/3d-bundles/infrastructure/models/target_mannequin_cluster.glb",
      "gltf-y-up-y-forward",
    ],
  ])
);

export const MODEL_MATERIAL_CORRECTION_BY_URI = new Map(
  resolveTerrainRuntimeAssetValue([
    [
      "/3d-bundles/tank/models/k2_black_panther_tank.glb",
      "remove-uniform-white-emissive",
    ],
  ])
);

export const MODEL_LOADER_AXIS_BY_CONVENTION = {
  "gltf-y-up-x-forward": { upAxis: "Y", forwardAxis: "X" },
  "gltf-y-up-y-forward": { upAxis: "Y", forwardAxis: "Y" },
  "z-up-x-forward": { upAxis: "Z", forwardAxis: "X" },
  "z-up-y-forward": { upAxis: "Z", forwardAxis: "Y" },
  "y-up-x-forward": { upAxis: "Y", forwardAxis: "X" },
};

export const DEFAULT_UNIT_MODEL = resolveTerrainRuntimeAssetValue({
  aircraft: "/3d-bundles/aircraft/models/f-15.glb",
  ship: "/3d-bundles/ships/type-45_destroyer_class.glb",
  facility: "/3d-bundles/tank/models/t-50_war_thunder.glb",
});

export const UNIT_MODEL_SCALE_PRESET = {
  ship: {
    default: 0.24,
    submarine: 0.16,
    minimumPixelSize: 12,
    maximumScale: 52,
  },
  aircraft: {
    default: 0.22,
    drone: 3,
    minimumPixelSize: 10,
    maximumScale: 36,
  },
  ground: {
    default: 0.16,
    launcher: 0.2,
    minimumPixelSize: 8,
    maximumScale: 24,
  },
};

export const UNIT_MARKER_IMAGE_SIZE = 72;
export const UNIT_MARKER_IMAGE_CACHE = new Map();
export const OBJECTIVE_MARKER_IMAGE_SIZE = 84;
export const OBJECTIVE_MARKER_IMAGE_CACHE = new Map();
export const GROUND_MARKER_CANVAS_SIZE = 256;
export const GROUND_MARKER_IMAGE_CACHE = new Map();
export const GROUND_UNIT_LAUNCH_EFFECT_MS = 1850;
export const GROUND_UNIT_ROUTE_SAMPLE_LIMIT = 8;

export const UNIT_MODEL_URI_BY_ID = resolveTerrainRuntimeAssetValue({
  "aircraft-apache":
    "/3d-bundles/aircraft/models/boeing_ah-64d_apache_combat_helicopter.glb",
  "aircraft-blackhawk":
    "/3d-bundles/aircraft/models/sikorsky_uh-60m_blackhawk.glb",
  "aircraft-f15-basic": "/3d-bundles/aircraft/models/f-15.glb",
  "aircraft-f15-lowpoly": "/3d-bundles/aircraft/models/low_poly_f-15.glb",
  "aircraft-f15-strike":
    "/3d-bundles/aircraft/models/mcdonnell_douglas_f-15_strike_eagle.glb",
  "aircraft-f16":
    "/3d-bundles/aircraft/models/lockheed_martin_f-16ef_fighting_falcon.glb",
  "aircraft-e737": "/3d-bundles/aircraft/models/e-737_peace_eye.glb",
  "aircraft-f35":
    "/3d-bundles/aircraft/models/f-35_lightning_ii_-_fighter_jet_-_free.glb",
  "aircraft-kc330": "/3d-bundles/aircraft/models/kc-330_mrtt.glb",
  "aircraft-kf21": "/3d-bundles/aircraft/models/kf-21a_boramae_fighter_jet.glb",
  "artillery-d30": "/3d-bundles/artillery/models/d-30_howitzer.glb",
  "artillery-howitzer":
    "/3d-bundles/artillery/models/howitzer_artillery_tank.glb",
  "artillery-hyunmoo": "/3d-bundles/artillery/models/hyunmoo5irbmlauncher.glb",
  "artillery-k9": "/3d-bundles/artillery/models/k9_thunder_artillery.glb",
  "artillery-k9-variant":
    "/3d-bundles/artillery/models/k9_thunder_artillery (1).glb",
  "artillery-nasams":
    "/3d-bundles/artillery/models/nasams_1_surface-to-air_missile_system.glb",
  "artillery-nasams-battery": "/3d-bundles/artillery/models/nasams_battery.glb",
  "artillery-paladin":
    "/3d-bundles/artillery/models/m109a6_paladin_self-propelled_howitzer.glb",
  "artillery-patriot":
    "/3d-bundles/artillery/models/mim-104_patriot_surface-to-air_missile_sam.glb",
  "artillery-chaparral": "/3d-bundles/artillery/models/m48_chaparral.glb",
  "artillery-roketsan": "/3d-bundles/artillery/models/roketsan_missiles.glb",
  "artillery-thaad": "/3d-bundles/artillery/models/thaad-2.glb",
  "drone-animated": "/3d-bundles/drone/models/drone.glb",
  "drone-quad": "/3d-bundles/drone/models/drone.glb",
  "drone-shahed": "/3d-bundles/drone/models/drone.glb",
  "infrastructure-container":
    "/3d-bundles/infrastructure/models/low_poly_cargo_container.glb",
  "infrastructure-tent":
    "/3d-bundles/infrastructure/models/military_tent_hangar.glb",
  "personnel-soldier": "/3d-bundles/personnel/models/soldier_character.glb",
  "robotics-quadruped":
    "/3d-bundles/robotics/models/quadruped_ground_robot.glb",
  "ship-carrier":
    "/3d-bundles/ships/hms_queen_elizabeth_r08_aircraft_carrier.glb",
  "ship-destroyer": "/3d-bundles/ships/type-45_destroyer_class.glb",
  "ship-submarine": "/3d-bundles/ships/uss_texas_ssn-775_submarine.glb",
  "tank-k2": "/3d-bundles/tank/models/k2_black_panther_tank.glb",
  "tank-k21": "/3d-bundles/tank/models/k21_armored_warfare.glb",
  "tank-km900": "/3d-bundles/tank/models/south_korean_km900_apc.glb",
  "tank-m113": "/3d-bundles/tank/models/m113a1.glb",
  "tank-m577": "/3d-bundles/tank/models/m577_command_vehicle.glb",
  "tank-m1150-abv": "/3d-bundles/tank/models/m1150_abv.glb",
  "tank-oshkosh-matv": "/3d-bundles/tank/models/oshkosh_m-atv.glb",
  "tank-stryker": "/3d-bundles/tank/models/m1126_stryker_50_cal.glb",
  "tank-ugv-mini": "/3d-bundles/robotics/models/mini_dron_ugv.glb",
  "tank-t80u": "/3d-bundles/tank/models/t-80u_tank.glb",
  "tank-tracked-armor": "/3d-bundles/tank/models/t-50_war_thunder.glb",
  "target-mannequin-cluster":
    "/3d-bundles/infrastructure/models/target_mannequin_cluster.glb",
});

export const AIRCRAFT_MODEL_MAP = resolveTerrainRuntimeAssetValue([
  [
    /\b(kf-21|boramae)\b/i,
    "/3d-bundles/aircraft/models/kf-21a_boramae_fighter_jet.glb",
  ],
  [
    /\b(e-737|e-7|wedgetail|peace eye|aew|aew&c|awacs)\b/i,
    "/3d-bundles/aircraft/models/e-737_peace_eye.glb",
  ],
  [
    /\b(kc-330|a330|mrtt|mrt|tanker)\b/i,
    "/3d-bundles/aircraft/models/kc-330_mrtt.glb",
  ],
  [
    /\b(f-35|lightning|stealth|raptor)\b/i,
    "/3d-bundles/aircraft/models/f-35_lightning_ii_-_fighter_jet_-_free.glb",
  ],
  [
    /\b(f-16|kf-16|falcon|fa-50|ta-50|t-50)\b/i,
    "/3d-bundles/aircraft/models/lockheed_martin_f-16ef_fighting_falcon.glb",
  ],
  [
    /\b(f-15|strike eagle|eagle)\b/i,
    "/3d-bundles/aircraft/models/mcdonnell_douglas_f-15_strike_eagle.glb",
  ],
  [
    /\b(apache|ah-64)\b/i,
    "/3d-bundles/aircraft/models/boeing_ah-64d_apache_combat_helicopter.glb",
  ],
  [
    /\b(black hawk|blackhawk|uh-60|helicopter|helo|chinook)\b/i,
    "/3d-bundles/aircraft/models/sikorsky_uh-60m_blackhawk.glb",
  ],
  [
    /\b(shahed|shahid|suicide|loitering|자폭)\b/i,
    "/3d-bundles/drone/models/drone.glb",
  ],
  [
    /\b(drone|uav|fpv|vtol|loitering|robin|pandion|canister|sword|mq-|rq-|reaper|predator|global hawk|recon)\b|리퍼|드론|무인기/i,
    "/3d-bundles/drone/models/drone.glb",
  ],
]);

export const SHIP_MODEL_MAP = resolveTerrainRuntimeAssetValue([
  [
    /\b(submarine|ssn|sss|sub)\b/i,
    "/3d-bundles/ships/uss_texas_ssn-775_submarine.glb",
  ],
  [
    /\b(carrier|dokdo|amphibious|lhd)\b/i,
    "/3d-bundles/ships/hms_queen_elizabeth_r08_aircraft_carrier.glb",
  ],
]);

export const FACILITY_MODEL_MAP = resolveTerrainRuntimeAssetValue([
  [
    /\b(tent|hangar|지휘소 텐트)\b/i,
    "/3d-bundles/infrastructure/models/military_tent_hangar.glb",
  ],
  [
    /\b(mannequin|target dummy|target cluster|dummy target|마네킹)\b/i,
    "/3d-bundles/infrastructure/models/target_mannequin_cluster.glb",
  ],
  [
    /\b(container|컨테이너)\b/i,
    "/3d-bundles/infrastructure/models/low_poly_cargo_container.glb",
  ],
  [
    /\b(soldier|rifle team|infantry team|보병|소총수)\b/i,
    "/3d-bundles/personnel/models/soldier_character.glb",
  ],
  [
    /\b(quadruped|ground robot|robot dog|unitree|다족보행)\b/i,
    "/3d-bundles/robotics/models/quadruped_ground_robot.glb",
  ],
  [
    /\b(patriot|mim-104|cheongung|km-sam|m-sam|천궁)\b/i,
    "/3d-bundles/artillery/models/mim-104_patriot_surface-to-air_missile_sam.glb",
  ],
  [
    /\b(nasams)\b/i,
    "/3d-bundles/artillery/models/nasams_1_surface-to-air_missile_system.glb",
  ],
  [/\b(thaad|l-sam)\b/i, "/3d-bundles/artillery/models/thaad-2.glb"],
  [
    /\b(biho|pegasus|k-sam|shorad|short range|비호|천마)\b/i,
    "/3d-bundles/artillery/models/m48_chaparral.glb",
  ],
  [
    /\b(m1150|abv|miclic|mine clearing|obstacle breacher|장애물|개척)\b/i,
    "/3d-bundles/tank/models/m1150_abv.glb",
  ],
  [
    /\b(rcws|crows|m-atv|matv|oshkosh|light tactical vehicle|소형전술차량)\b/i,
    "/3d-bundles/tank/models/oshkosh_m-atv.glb",
  ],
  [
    /\b(hyunmoo|ballistic|surface-to-surface|surface to surface|launcher)\b/i,
    "/3d-bundles/artillery/models/hyunmoo5irbmlauncher.glb",
  ],
  [
    /\b(chunmoo|kooryong|k136|mlrs|himars|rocket)\b/i,
    "/3d-bundles/artillery/models/hyunmoo5irbmlauncher.glb",
  ],
  [
    /\b(mortar|ksm|ksm120)\b/i,
    "/3d-bundles/artillery/models/d-30_howitzer.glb",
  ],
  [
    /\b(k55a1|k55|paladin|m109)\b/i,
    "/3d-bundles/artillery/models/m109a6_paladin_self-propelled_howitzer.glb",
  ],
  [
    /\b(k9|howitzer|artillery)\b/i,
    "/3d-bundles/artillery/models/k9_thunder_artillery.glb",
  ],
  [
    /\b(command vehicle|command post|m577)\b/i,
    "/3d-bundles/tank/models/m577_command_vehicle.glb",
  ],
  [
    /\b(k808|m1126|stryker|lav|wheeled apc|wheeled ifv|8x8)\b/i,
    "/3d-bundles/tank/models/m1126_stryker_50_cal.glb",
  ],
  [
    /\b(km900|humvee|hmmwv|wheeled)\b/i,
    "/3d-bundles/tank/models/south_korean_km900_apc.glb",
  ],
  [
    /\b(ugv|unmanned ground vehicle|무인지상|무인차량)\b/i,
    "/3d-bundles/robotics/models/mini_dron_ugv.glb",
  ],
  [
    /\b(kaav|aavp|amphibious assault vehicle|상륙장갑)\b/i,
    "/3d-bundles/tank/models/m113a1.glb",
  ],
  [
    /\b(k21|infantry fighting vehicle|ifv)\b/i,
    "/3d-bundles/tank/models/k21_armored_warfare.glb",
  ],
  [/\b(m113|apc)\b/i, "/3d-bundles/tank/models/m113a1.glb"],
  [/\b(t-80u|t80u)\b/i, "/3d-bundles/tank/models/t-80u_tank.glb"],
  [
    /\b(k2|tank|armor|tracked)\b/i,
    "/3d-bundles/tank/models/k2_black_panther_tank.glb",
  ],
]);

export const MEASURED_UNIT_SCALE_ENTRIES = resolveTerrainRuntimeAssetValue([
  {
    keys: ["tank-m1150-abv", "/3d-bundles/tank/models/m1150_abv.glb"],
    sourceLongestAxisMeters: 1010.4101257324219,
    targetLongestAxisMeters: 0.56,
    minimumPixelSize: 0,
    maximumScale: 0.4,
  },
  {
    keys: [
      "artillery-chaparral",
      "/3d-bundles/artillery/models/m48_chaparral.glb",
    ],
    sourceLongestAxisMeters: 5.633000135421753,
    targetLongestAxisMeters: 6.1,
    minimumPixelSize: 3,
    maximumScale: 8,
  },
  {
    keys: ["tank-ugv-mini", "/3d-bundles/robotics/models/mini_dron_ugv.glb"],
    sourceLongestAxisMeters: 2,
    targetLongestAxisMeters: 1.8,
    minimumPixelSize: 4,
    maximumScale: 10,
  },
  {
    keys: ["tank-oshkosh-matv", "/3d-bundles/tank/models/oshkosh_m-atv.glb"],
    sourceLongestAxisMeters: 671.8661804199219,
    targetLongestAxisMeters: 6.3,
    minimumPixelSize: 2,
    maximumScale: 6,
  },
  {
    keys: [
      "infrastructure-container",
      "/3d-bundles/infrastructure/models/low_poly_cargo_container.glb",
    ],
    sourceLongestAxisMeters: 1,
    targetLongestAxisMeters: 3.1,
    minimumPixelSize: 2,
    maximumScale: 5,
  },
  {
    keys: [
      "infrastructure-tent",
      "/3d-bundles/infrastructure/models/military_tent_hangar.glb",
    ],
    sourceLongestAxisMeters: 85.32406616210938,
    targetLongestAxisMeters: 14.4,
    minimumPixelSize: 3,
    maximumScale: 12,
  },
  {
    keys: [
      "target-mannequin-cluster",
      "/3d-bundles/infrastructure/models/target_mannequin_cluster.glb",
    ],
    sourceLongestAxisMeters: 180.605,
    targetLongestAxisMeters: 2.4,
    minimumPixelSize: 8,
    maximumScale: 14,
  },
  {
    keys: [
      "personnel-soldier",
      "/3d-bundles/personnel/models/soldier_character.glb",
    ],
    sourceLongestAxisMeters: 9.997,
    targetLongestAxisMeters: 1.85,
    minimumPixelSize: 8,
    maximumScale: 14,
  },
  {
    keys: [
      "robotics-quadruped",
      "/3d-bundles/robotics/models/quadruped_ground_robot.glb",
    ],
    sourceLongestAxisMeters: 0.431,
    targetLongestAxisMeters: 1.25,
    minimumPixelSize: 8,
    maximumScale: 14,
  },
  {
    keys: ["aircraft-e737", "/3d-bundles/aircraft/models/e-737_peace_eye.glb"],
    sourceLongestAxisMeters: 35.704,
    targetLongestAxisMeters: 36,
    minimumPixelSize: 10,
    maximumScale: 42,
  },
  {
    keys: ["aircraft-kc330", "/3d-bundles/aircraft/models/kc-330_mrtt.glb"],
    sourceLongestAxisMeters: 1.752,
    targetLongestAxisMeters: 59,
    minimumPixelSize: 10,
    maximumScale: 48,
  },
  {
    keys: ["artillery-d30", "/3d-bundles/artillery/models/d-30_howitzer.glb"],
    sourceLongestAxisMeters: 27.466859817504883,
    targetLongestAxisMeters: 5.4,
    minimumPixelSize: 2,
    maximumScale: 6,
  },
  {
    keys: [
      "artillery-howitzer",
      "/3d-bundles/artillery/models/howitzer_artillery_tank.glb",
    ],
    sourceLongestAxisMeters: 8.00000037997961,
    targetLongestAxisMeters: 8,
    minimumPixelSize: 2,
    maximumScale: 6,
  },
  {
    keys: [
      "artillery-hyunmoo",
      "/3d-bundles/artillery/models/hyunmoo5irbmlauncher.glb",
    ],
    sourceLongestAxisMeters: 1,
    targetLongestAxisMeters: 16,
    minimumPixelSize: 3,
    maximumScale: 10,
  },
  {
    keys: [
      "artillery-k9",
      "/3d-bundles/artillery/models/k9_thunder_artillery.glb",
    ],
    sourceLongestAxisMeters: 256509.45312500003,
    targetLongestAxisMeters: 12,
    minimumPixelSize: 2,
    maximumScale: 4,
  },
  {
    keys: [
      "artillery-k9-variant",
      "/3d-bundles/artillery/models/k9_thunder_artillery (1).glb",
    ],
    sourceLongestAxisMeters: 256509.45312500003,
    targetLongestAxisMeters: 12,
    minimumPixelSize: 2,
    maximumScale: 4,
  },
  {
    keys: [
      "artillery-nasams",
      "/3d-bundles/artillery/models/nasams_1_surface-to-air_missile_system.glb",
    ],
    sourceLongestAxisMeters: 17.79428291320801,
    targetLongestAxisMeters: 7,
    minimumPixelSize: 3,
    maximumScale: 8,
  },
  {
    keys: [
      "artillery-nasams-battery",
      "/3d-bundles/artillery/models/nasams_battery.glb",
    ],
    sourceLongestAxisMeters: 0.99273681640625,
    targetLongestAxisMeters: 8.5,
    minimumPixelSize: 3,
    maximumScale: 10,
  },
  {
    keys: [
      "artillery-paladin",
      "/3d-bundles/artillery/models/m109a6_paladin_self-propelled_howitzer.glb",
    ],
    sourceLongestAxisMeters: 9.378000445431098,
    targetLongestAxisMeters: 9.1,
    minimumPixelSize: 2,
    maximumScale: 6,
  },
  {
    keys: [
      "artillery-patriot",
      "/3d-bundles/artillery/models/mim-104_patriot_surface-to-air_missile_sam.glb",
    ],
    sourceLongestAxisMeters: 22.567099571228027,
    targetLongestAxisMeters: 10.5,
    minimumPixelSize: 3,
    maximumScale: 8,
  },
  {
    keys: [
      "artillery-roketsan",
      "/3d-bundles/artillery/models/roketsan_missiles.glb",
    ],
    sourceLongestAxisMeters: 7.48924720287323,
    targetLongestAxisMeters: 7.5,
    minimumPixelSize: 2,
    maximumScale: 6,
  },
  {
    keys: ["artillery-thaad", "/3d-bundles/artillery/models/thaad-2.glb"],
    sourceLongestAxisMeters: 1,
    targetLongestAxisMeters: 12.3,
    minimumPixelSize: 3,
    maximumScale: 10,
  },
  {
    keys: ["tank-k2", "/3d-bundles/tank/models/k2_black_panther_tank.glb"],
    sourceLongestAxisMeters: 1.4704020619392395,
    targetLongestAxisMeters: 10.8,
    minimumPixelSize: 2,
    maximumScale: 6,
  },
  {
    keys: ["tank-k21", "/3d-bundles/tank/models/k21_armored_warfare.glb"],
    sourceLongestAxisMeters: 7.628900051116943,
    targetLongestAxisMeters: 6.9,
    minimumPixelSize: 2,
    maximumScale: 6,
  },
  {
    keys: ["tank-km900", "/3d-bundles/tank/models/south_korean_km900_apc.glb"],
    sourceLongestAxisMeters: 913.0614013671875,
    targetLongestAxisMeters: 6.95,
    minimumPixelSize: 2,
    maximumScale: 4,
  },
  {
    keys: ["tank-m113", "/3d-bundles/tank/models/m113a1.glb"],
    sourceLongestAxisMeters: 4.740999831087889,
    targetLongestAxisMeters: 4.86,
    minimumPixelSize: 2,
    maximumScale: 6,
  },
  {
    keys: ["tank-m577", "/3d-bundles/tank/models/m577_command_vehicle.glb"],
    sourceLongestAxisMeters: 5.1360997005678755,
    targetLongestAxisMeters: 4.86,
    minimumPixelSize: 2,
    maximumScale: 6,
  },
  {
    keys: ["tank-stryker", "/3d-bundles/tank/models/m1126_stryker_50_cal.glb"],
    sourceLongestAxisMeters: 7.598799774077536,
    targetLongestAxisMeters: 6.95,
    minimumPixelSize: 2,
    maximumScale: 6,
  },
  {
    keys: [
      "tank-tracked-armor",
      "/3d-bundles/tank/models/t-50_war_thunder.glb",
    ],
    sourceLongestAxisMeters: 5.188339948654175,
    targetLongestAxisMeters: 9.75,
    minimumPixelSize: 2,
    maximumScale: 6,
  },
  {
    keys: ["tank-t80u", "/3d-bundles/tank/models/t-80u_tank.glb"],
    sourceLongestAxisMeters: 24.625,
    targetLongestAxisMeters: 9.7,
    minimumPixelSize: 2,
    maximumScale: 6,
  },
]);
