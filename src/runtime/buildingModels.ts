// @ts-nocheck
/**
 * 배치 시설 실물 3D — 헤드리스 Blender 제작 모듈형 GLB
 *   assets/blender/build_facilities3.py  (3차: 동 셸 11종 + 실척 단일형 + 대지·조경)
 *   assets/blender/build_facilities2.py  (2차: 야외 구획 프롭 키트 — 그대로 재사용)
 *
 * ══ 왜 다시 썼나 — 「부지 = 건물」이 만들던 납작한 덩어리 ══
 *
 * 예전 계약은 캐노니컬 12×8 셸 하나를 부지 크기로 통째로 늘리는 것이었다. 그런데 부지는
 * 정원에서 나온다 — 생활 구역 100 명이면 44.5 × 29.7 m 다. 층고는 3.2 m 로 고정이므로
 * 결과는 **44 × 30 × 6.4 m 짜리 납작한 덩어리**였다. 3.7 배로 늘어난 셸에서 파이프는
 * 타원이 되고 창문은 레터박스가 됐다. 폴리곤을 아무리 늘려도 이 비례는 고쳐지지 않는다.
 *
 * 그래서 부지를 **대지(垈地)** 로 다시 읽는다. 대지 위에 현실 비례의 **동(棟)** 을 앉히고,
 * 남는 곳은 앞마당·보도·조경이 채운다. 건폐율 개념 그대로다.
 *
 *   ① 동 깊이는 채광 한계 안에 가둔다 (8~14 m). 그 이상 깊은 건물은 실내가 어둡다.
 *   ② 동 길이는 종횡비 2.6 을 넘지 않게 끊는다. 넘으면 동을 하나 더 세운다.
 *   ③ 동 열은 이격 6 m(채광·화재), 동 사이는 4 m 를 띄운다.
 *   ④ 동은 대지 뒤쪽(+Y)부터 채운다 — 정면(−Y)이 진입 방향이므로 앞마당이 남는다.
 *
 * 그 결과 셸이 겪는 스케일은 0.65~1.45 배, 이방성(sx/sy)은 1.35 배 이내로 갇힌다.
 * 이 범위에서는 창·처마·선홈통을 셸에 구워 넣어도 형태가 무너지지 않는다.
 * **비용·토공 산식은 건드리지 않는다** — 그쪽은 여전히 부지(대지) 제원으로 계산한다.
 * 바뀐 것은 「그 대지 위에 무엇을 그리는가」 뿐이다.
 *
 * ══ 세 가지 조립 방식 ══
 *
 * ① 동 배치 (block)   건물형 11종. 위 규칙으로 동 격자를 짜고 각 동에 main + floor×(n−1)
 *                     + roof 를 쌓는다. 스케일은 동 크기 / 캐노니컬(14 × 11).
 * ② 야외 구획 (yard)  훈련·주차·군용주차. 바닥만 늘리고 그 위 물건은 실척 그대로.
 *                     (2차 스크립트의 프롭 키트 — 이미 이 원칙으로 만들어져 있다)
 * ③ 실척 단일 (mono)  탄약고 이글루·위병소. 늘리면 문짝이 4 m 가 된다. 실척으로 놓고,
 *                     대지가 넓으면 **크게 만드는 대신 개수를 늘린다**.
 *
 * 픽킹: 모든 Model 에 id={id: uid+'-box'} — 기존 /^b\d+-box$/ 픽 경로 호환.
 * 선택 하이라이트: 앰버 실루엣.
 */

import { trackEnvModel } from './environment';

const A = 'assets/models/';

/** 동 셸 캐노니컬 — build_facilities3.py 의 LEN/DEP/H 와 반드시 일치. */
export const CANON = { w: 14, d: 11, storey: 3.2 };
/** 대지 패드류(기초·앞마당·야외 바닥) 캐노니컬 — 기존 fac_yard_* 와 동일. */
export const CANON_PAD = { w: 12, d: 8 };

/** 한 시설이 만들 수 있는 프리미티브 상한 — 대지가 넓어도 지도를 삼키지 않도록. */
export const MAX_MODULES = 44;

export const MODEL_REGISTRY = {
  'command-zone': { main: A + 'fac_command_main.glb', roof: A + 'fac_command_roof.glb', floor: A + 'fac_floor.glb' },
  'office-zone': { main: A + 'fac_office_main.glb', roof: A + 'fac_office_roof.glb', floor: A + 'fac_office_floor.glb' },
  'security-zone': { main: A + 'fac_security_main.glb', roof: A + 'fac_security_roof.glb', floor: A + 'fac_security_floor.glb' },
  'living-zone': { main: A + 'fac_living_main.glb', roof: A + 'fac_living_roof.glb', floor: A + 'fac_floor.glb' },
  'welfare-zone': { main: A + 'fac_welfare_main.glb', roof: A + 'fac_welfare_roof.glb', floor: A + 'fac_floor.glb' },
  'hygiene-zone': { main: A + 'fac_hygiene_main.glb', roof: A + 'fac_hygiene_roof.glb', floor: A + 'fac_floor.glb' },
  'medical-zone': { main: A + 'fac_medical_main.glb', roof: A + 'fac_medical_roof.glb', floor: A + 'fac_floor.glb' },
  'education-zone': { main: A + 'fac_edu_main.glb', roof: A + 'fac_edu_roof.glb', floor: A + 'fac_floor.glb' },
  'maintenance-zone': { main: A + 'fac_maint_main.glb', roof: A + 'fac_maint_roof.glb', floor: A + 'fac_floor.glb' },
  'infrastructure-zone': { main: A + 'fac_infra_main.glb', roof: A + 'fac_infra_roof.glb', floor: A + 'fac_floor.glb' },
  'storage-zone': { mono: A + 'fac_storage.glb', monoW: 11.4, monoD: 12.6, pad: A + 'fac_yard_gravel.glb' },
  'entry-zone': { mono: A + 'fac_entry.glb', monoW: 11.0, monoD: 7.4, pad: A + 'fac_apron.glb' },
};

/** 등록되지 않은 시설이 「보이지 않는 건물」이 되지 않도록 하는 예비. */
export const DEFAULT_REGISTRY = {
  main: A + 'fac_generic_main.glb', roof: A + 'fac_generic_roof.glb', floor: A + 'fac_floor.glb',
};

/**
 * 건폐율 — 대지 면적 중 동이 덮는 비율.
 * 정비고는 차량 동선이 실내라 크게, 지휘·의무는 방호 이격이 필요해 작게 잡는다.
 */
const COVERAGE = {
  'command-zone': 0.46, 'medical-zone': 0.46, 'living-zone': 0.46,
  'security-zone': 0.50, 'welfare-zone': 0.50, 'office-zone': 0.50, 'infrastructure-zone': 0.50,
  'hygiene-zone': 0.48, 'education-zone': 0.48,
  'maintenance-zone': 0.55,
};
const COVERAGE_DEFAULT = 0.48;

// ── 동 배치 규칙 (m) ────────────────────────────────────────────
const BAY_MIN = 7.0;     // 동 최소 깊이 — 이보다 얇으면 복도 하나 폭이다
const BAY_MAX = 14.0;    // 동 최대 깊이 — 이보다 깊으면 실내에 빛이 안 든다
const GAP_ROW = 6.0;     // 동 열 사이 (채광·소방)
const GAP_COL = 4.0;     // 같은 열 안 동 사이 (신축 이격)
const LEN_MIN = 9.0;     // 동 최소 길이 — 이보다 짧게 쪼개면 오두막 여러 채가 된다
/**
 * 셸 이방성 상한 (sx/sy). 종횡비가 아니라 **이방성**으로 거는 것이 핵심이다.
 * 종횡비로 걸면 얇은 동(깊이 8.8m)에 긴 셸(16.4m)이 붙어 sx/sy 가 1.46 까지 벌어진다 —
 * 그 배율에서 선홈통은 눈에 띄게 타원이 된다. 캐노니컬 비(14/11)를 기준으로 잡는다.
 */
const ANISO_MAX = 1.35;

// ═══════════════════ 야외 구획 프롭 (2차 키트) ═══════════════════
const P = {
  apron: A + 'fac_apron.glb', tree: A + 'fac_tree.glb', bush: A + 'fac_bush.glb',
  stem: A + 'fac_stem.glb', planter: A + 'fac_planter.glb', arcade: A + 'fac_arcade.glb',
  sitesign: A + 'fac_sitesign.glb', bike: A + 'fac_bikerack.glb',
  asphalt: A + 'fac_yard_asphalt.glb', gravel: A + 'fac_yard_gravel.glb',
  stall: A + 'fac_stall.glb', carport: A + 'fac_carport.glb',
  sedan: A + 'veh_sedan.glb', truck: A + 'veh_truck.glb',
  revet: A + 'fac_revet.glb', camonet: A + 'fac_camonet.glb', pol: A + 'fac_polpoint.glb',
  tower: A + 'fac_rappel_tower.glb', wall: A + 'fac_obst_wall.glb', bars: A + 'fac_obst_bars.glb',
  beam: A + 'fac_obst_beam.glb', tires: A + 'fac_obst_tires.glb', pullup: A + 'fac_pullup.glb',
  stand: A + 'fac_stand.glb', mast: A + 'fac_lightmast.glb', shed: A + 'fac_shed.glb',
};

import { clamp } from './mathUtils';

/**
 * 기초 플린스 깊이 — 「뜬 건물」을 없애는 값.
 *
 * 시설은 `padTop`(풋프린트 최고 지반)에 놓인다. 경사지에서는 그 아래 내리막 쪽이 허공에
 * 뜬다 — Cesium 은 계산된 절토만큼 지형을 깎아 주지 않기 때문이다.
 *
 * **예전에는 이 값을 최대 40m 까지 늘렸다.** 그래서 급경사지 시설은 사방이 20m 짜리
 * 수직 콘크리트 벽인 상자 위에 얹혔다 — 화면에서 「떠 있는 판」으로 읽힌 원인이 이것이다.
 * 실제 토목은 그 높이를 옹벽으로 세우지 않는다. **비탈면을 깎고 쌓는다.**
 *
 * 그래서 플린스는 이제 진짜 기초가 하는 만큼(최대 3m)만 내려가고, 그 아래 지반까지의
 * 나머지는 `siteWorks.ts` 의 정지 비탈면이 흙으로 메운다. 순서가 반대였던 것을 바로잡은
 * 것이라 값 하나가 아니라 역할 분담이 바뀐 것이다.
 */
function stemDepth(item) {
  const bottom = Number.isFinite(item.foundBottom) ? item.foundBottom
    : (Number.isFinite(item.gmin) ? item.gmin - 0.5 : null);
  const d = bottom === null ? 2.0 : (item.groundH ?? 0) - bottom;
  return clamp(d, 1.2, 3.0);
}

/** uid → 정수 시드. 같은 시설은 언제나 같은 조경을 갖는다. */
function uidSeed(uid) {
  let h = 0;
  for (let i = 0; i < (uid ?? '').length; i++) h = (h * 31 + uid.charCodeAt(i)) % 100000;
  return h;
}

/** 결정적 난수 — 같은 배치는 언제나 같은 그림이어야 한다 (다시 그릴 때마다 나무가 옮겨 다니면 안 된다). */
function hash01(n) {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

/** 대지 네 귀퉁이에 조명탑 — 넓으면 네 개, 아니면 두 개. */
function lightMasts(w, d, mods) {
  const mx = w / 2 - 1.6;
  const my = d / 2 - 1.6;
  mods.push({ uri: P.mast, x: -mx, y: my }, { uri: P.mast, x: mx, y: -my });
  if (w >= 34 && d >= 24) mods.push({ uri: P.mast, x: mx, y: my }, { uri: P.mast, x: -mx, y: -my });
}

// ═══════════════════ ① 동 배치 (건폐율) ═══════════════════

/**
 * 대지 w×d 에 들어갈 동 격자를 푼다.
 *
 * 반환 {rows, cols, len, dep, rowY[], colX[], frontY}
 *   frontY  가장 앞 동의 앞면 y — 이 앞이 앞마당이다 (조경·조명이 들어갈 자리).
 *
 * 순서가 중요하다. 「필요 면적 ÷ 대지 폭」으로 깊이를 먼저 정하면 지휘 구역(19.9×13.3)
 * 처럼 폭이 넉넉한 대지에서 깊이 7 m 짜리 얇은 판이 나온다 — 셸이 세로로 0.64 배
 * 눌린다. 그래서 **깊이는 대지가 허락하는 만큼(0.85) 먼저 잡고**, 길이를 면적으로
 * 맞춘다. 그러면 동은 대지를 닮은 비례가 되고 셸은 거의 등방으로 늘어난다.
 */
function blockGrid(w, d, coverage) {
  const set = clamp(Math.min(w, d) * 0.09, 1.2, 4.5);     // 대지 경계 이격
  const uW = Math.max(6, w - set * 2);
  const uD = Math.max(5, d - set * 2);
  const target = w * d * coverage;

  // 앞마당을 **먼저 떼어 둔다**. 이걸 안 하면 동 열이 대지 깊이를 끝까지 먹어서
  // 정면에 이격 폭(1~4m)만 남는다 — 화단도 표지석도 들어갈 자리가 없고, 화면에는
  // 건물이 대지에 꽉 낀 채로 보인다. 다만 그 때문에 동이 9m 보다 얇아지면
  // 마당을 도로 줄인다. 얇은 판보다는 좁은 마당이 낫다.
  let yard = clamp(uD * 0.16, 3.4, 6.5);
  if (uD - yard < 9.0) yard = Math.max(0, uD - 9.0);
  const buildD = uD - yard;

  let rows = 1;
  let dep = Math.min(buildD, Math.max(BAY_MIN, Math.min(BAY_MAX, buildD * 0.95)));
  for (const r of [3, 2]) {                               // 깊은 대지는 동을 여러 겹으로
    const cand = (buildD - (r - 1) * GAP_ROW) / r;
    if (cand >= 8.5) { rows = r; dep = Math.min(cand, BAY_MAX); break; }
  }

  const rowLen = clamp(target / (rows * dep), Math.min(LEN_MIN, uW), uW);
  const lenMax = dep * (CANON.w / CANON.d) * ANISO_MAX;
  // 반대쪽 한계: 너무 잘게 쪼개면 이번엔 세로로 긴 셸이 되어 이방성이 다시 벌어진다
  const lenMin = Math.max(LEN_MIN, dep * (CANON.w / CANON.d) / ANISO_MAX);
  let cols = clamp(Math.ceil(rowLen / lenMax), 1, 3);
  let len = (rowLen - (cols - 1) * GAP_COL) / cols;
  while (cols > 1 && len < lenMin) { cols -= 1; len = (rowLen - (cols - 1) * GAP_COL) / cols; }
  len = Math.min(len, lenMax);        // 열이 3개에 걸리면 길이를 잘라 이방성을 지킨다

  // 뒤(+Y)부터 채운다 — 정면(−Y)이 진입 방향이라 앞마당이 남아야 한다
  const backY = uD / 2;
  const rowY = [];
  for (let r = 0; r < rows; r++) rowY.push(backY - dep / 2 - r * (dep + GAP_ROW));
  const colX = [];
  for (let c = 0; c < cols; c++) colX.push((c - (cols - 1) / 2) * (len + GAP_COL));
  return { rows, cols, len, dep, rowY, colX, frontY: rowY[rows - 1] - dep / 2, set };
}

/**
 * 대지 조성 — 앞마당 화단 열 · 조경수 · 부대 표지석 · 자전거 거치대.
 *
 * 동을 아무리 잘 지어도 그 앞이 텅 빈 회색 포장이면 「배치했다」로 보이지 않는다.
 * 사람이 쓰는 물건(거치대·벤치·표지석)이 하나라도 있어야 축척이 읽히고, 화단 띠가
 * 있어야 포장이 「마당」이 된다. 전부 실척이므로 대지가 커지면 개수가 늘 뿐이다.
 */
function sitework(w, d, g, mods, seed, spec) {
  const yardD = g.frontY - (-d / 2 + g.set);              // 앞마당 깊이
  const front = -d / 2 + g.set;

  // ① 진입부 표지석 — 정면 좌측 모서리. 대지가 좁으면 넣지 않는다.
  if (yardD >= 4.5 && w >= 18) {
    mods.push({ uri: P.sitesign, x: -(w / 2) + g.set + 2.6, y: front + 1.2 });
  }
  // ② 화단 띠 — 앞마당 앞쪽 경계를 따라. 4m 짜리를 실척으로 늘어놓는다.
  if (yardD >= 3.6) {
    const n = clamp(Math.floor((w - g.set * 2 - 7.0) / 4.6), 0, 4);
    for (let i = 0; i < n; i++) {
      mods.push({
        uri: P.planter,
        x: (i - (n - 1) / 2) * 4.6 + (w >= 18 ? 2.4 : 0),
        y: front + Math.min(1.0, yardD * 0.22),
      });
    }
  }
  // ③ 자전거 거치대 — 사람이 상주하는 시설에만
  if (yardD >= 5.5 && BIKE_ZONES.has(spec.id)) {
    mods.push({ uri: P.bike, x: (w / 2) - g.set - 2.2, y: front + 1.4, rz: Math.PI / 2 });
  }
  // ④ 조경수 — 측면 여백과 동 사이. 다 심으면 가로수길이 되므로 솎는다.
  const slots = [];
  const sideX = w / 2 - g.set - 1.5;
  if (sideX > g.len / 2 + 2.6) {
    for (const s of [-1, 1]) {
      slots.push({ x: s * sideX, y: g.rowY[0], tree: true });
      if (g.rows > 1) slots.push({ x: s * sideX, y: (g.rowY[0] + g.rowY[1]) / 2, tree: false });
    }
  }
  if (yardD >= 7.0) {
    slots.push({ x: -(w / 2) + g.set + 1.8, y: front + yardD * 0.62, tree: true });
    slots.push({ x: (w / 2) - g.set - 1.8, y: front + yardD * 0.62, tree: true });
  }
  slots.forEach((s, i) => {
    if (hash01(seed + i * 17) < 0.22) return;
    mods.push({
      uri: s.tree ? P.tree : P.bush,
      x: s.x + (hash01(seed + i * 31) - 0.5) * 1.4,
      y: s.y + (hash01(seed + i * 53) - 0.5) * 1.2,
      rz: hash01(seed + i * 7) * Math.PI * 2,
    });
  });
}

/**
 * 동 사이 연결 회랑 — 비 맞지 않고 건너가는 통로. 실척 3.6m 스팬을 이어 붙인다
 * (늘리면 기둥이 굵어진다). 같은 열 안 동 사이(X 방향)와 열 사이(Y 방향) 둘 다 잇는다.
 */
function linkArcade(g, mods) {
  if (g.cols > 1) {                                       // 나란한 두 동 사이 — X 방향
    for (let c = 0; c + 1 < g.colX.length; c++) {
      const gapX = (g.colX[c + 1] - g.len / 2) - (g.colX[c] + g.len / 2);
      if (gapX < 3.0) continue;
      const n = clamp(Math.round(gapX / 3.6), 1, 2);
      const x0 = g.colX[c] + g.len / 2;
      for (let i = 0; i < n; i++) {
        mods.push({ uri: P.arcade, x: x0 + (i + 0.5) * (gapX / n), y: g.rowY[0] });
      }
    }
  }
  if (g.rows > 1) {                                       // 앞뒤 열 사이 — Y 방향
    const gapY = (g.rowY[0] - g.dep / 2) - (g.rowY[1] + g.dep / 2);
    if (gapY < 3.0) return;
    const n = clamp(Math.round(gapY / 3.6), 1, 3);
    const x = g.colX[0];
    const y0 = g.rowY[1] + g.dep / 2;
    for (let i = 0; i < n; i++) {
      mods.push({ uri: P.arcade, x, y: y0 + (i + 0.5) * (gapY / n), rz: Math.PI / 2 });
    }
  }
}

/** 상주 인원이 있어 자전거가 서는 구역 */
const BIKE_ZONES = new Set(['living-zone', 'welfare-zone', 'education-zone', 'office-zone']);

/**
 * 건물형 대지 계획 — 앞마당 포장 + 동 격자 + 조명 + 조경.
 * mods 의 sx/sy 는 각 GLB 의 캐노니컬 대비 실제 크기 비율이다.
 */
function planBlocks(item, reg, floors) {
  const w = item.dims.widthM;
  const d = item.dims.depthM;
  const g = blockGrid(w, d, COVERAGE[item.spec.id] ?? COVERAGE_DEFAULT);
  const mods = [{ uri: P.apron, sx: w / CANON_PAD.w, sy: d / CANON_PAD.d }];
  const sx = g.len / CANON.w;
  const sy = g.dep / CANON.d;
  for (let r = 0; r < g.rows; r++) {
    for (let c = 0; c < g.cols; c++) {
      const at = { x: g.colX[c], y: g.rowY[r], sx, sy };
      mods.push({ uri: reg.main, zOff: 0, ...at });
      for (let f = 1; f < floors; f++) {
        mods.push({ uri: reg.floor, zOff: f * CANON.storey, ...at });
      }
      mods.push({ uri: reg.roof, zOff: floors * CANON.storey, ...at });
    }
  }
  lightMasts(w, d, mods);
  linkArcade(g, mods);
  sitework(w, d, g, mods, uidSeed(item.uid) + Math.round(w * 7), item.spec);
  return mods;
}

/**
 * 실척 단일형 — 탄약고·위병소. 늘리지 않는다.
 * 대지가 넓으면 「크게」가 아니라 「여러 채」다. 창고 대지가 두 배면 이글루가 두 기 선다.
 */
function planMono(item, reg) {
  const w = item.dims.widthM;
  const d = item.dims.depthM;
  const mods = [{ uri: reg.pad ?? P.apron, sx: w / CANON_PAD.w, sy: d / CANON_PAD.d }];
  const uW = w - 3.0;
  const n = clamp(Math.floor((uW + GAP_COL) / (reg.monoW + GAP_COL)), 1, 3);
  const pitch = reg.monoW + GAP_COL;
  for (let i = 0; i < n; i++) {
    mods.push({ uri: reg.mono, x: (i - (n - 1) / 2) * pitch, y: Math.max(0, (d - reg.monoD) / 2 - 0.6) });
  }
  lightMasts(w, d, mods);
  return mods;
}

// ═══════════════════ ② 야외 구획 배치 계획 ═══════════════════

/**
 * 주차 구역 — 양측 주차열 + 중앙 차로. 열은 5m, 차로는 6m 를 먹는다.
 * 주차면은 2.5m 고정이므로 대지가 넓어지면 「면이 굵어지는」 게 아니라 「면이 는다」.
 */
function planParking({ w, d }) {
  const mods = [{ uri: P.asphalt, fit: true }];
  const rows = clamp(Math.floor((d + 6) / 11), 1, 3);
  const bays = clamp(Math.floor((w - 2.4) / 5.0), 1, 6);
  const rowY = rows === 1 ? [0]
    : rows === 2 ? [-(d / 2 - 3.4), d / 2 - 3.4]
      : [-(d / 2 - 3.4), 0, d / 2 - 3.4];
  const stalls = [];
  const cars = [];
  rowY.forEach((y, r) => {
    const faceOut = y <= 0;
    for (let b = 0; b < bays; b++) {
      const x = (b - (bays - 1) / 2) * 5.0;
      stalls.push({ uri: P.stall, x, y, rz: faceOut ? 0 : Math.PI });
      for (const dx of [-1.25, 1.25]) {
        const seed = r * 97 + b * 13 + (dx > 0 ? 1 : 0);
        if (hash01(seed) < 0.55) {
          cars.push({ uri: P.sedan, x: x + dx, y: y + (faceOut ? 0.2 : -0.2), rz: faceOut ? Math.PI : 0 });
        }
      }
    }
  });
  if (w >= 20 && d >= 16) {
    const nb = clamp(Math.floor((w - 2) / 5.6), 1, 4);
    for (let i = 0; i < nb; i++) {
      mods.push({ uri: P.carport, x: (i - (nb - 1) / 2) * 5.6, y: d / 2 - 3.2, rz: Math.PI });
    }
  }
  lightMasts(w, d, mods);
  mods.push(...stalls, ...cars);
  return mods;
}

/**
 * 군용 주차 구역 — 방호벽(게비온) 뒤에 차량 열, 뒤편에 위장망 주기와 유류점.
 */
function planVehicleParking({ w, d }) {
  const mods = [{ uri: P.gravel, fit: true }];
  const rows = d >= 26 ? 2 : 1;
  const nRev = clamp(Math.round(w / 12.4), 1, 3);
  for (let r = 0; r < rows; r++) {
    const yRev = -d / 2 + 2.2 + r * 11.0;
    for (let i = 0; i < nRev; i++) {
      mods.push({ uri: P.revet, x: (i - (nRev - 1) / 2) * 12.4, y: yRev });
    }
    const nT = clamp(Math.floor((w - 3) / 4.6), 1, 5);
    for (let i = 0; i < nT; i++) {
      const seed = r * 31 + i * 7;
      if (hash01(seed) < 0.2) continue;
      mods.push({ uri: P.truck, x: (i - (nT - 1) / 2) * 4.6, y: yRev + 5.4,
        rz: Math.PI + (hash01(seed + 3) - 0.5) * 0.12 });
    }
  }
  if (w >= 20 && d >= 16) {
    mods.push({ uri: P.camonet, x: Math.min(0, w / 2 - 7.0), y: d / 2 - 5.0 });
    mods.push({ uri: P.truck, x: -2.2, y: d / 2 - 5.4, rz: 0.14 });
  }
  mods.push({ uri: P.pol, x: -(w / 2 - 3.0), y: d / 2 - 2.6 });
  if (w >= 24) mods.push({ uri: P.shed, x: w / 2 - 3.2, y: d / 2 - 2.4, rz: Math.PI });
  lightMasts(w, d, mods);
  return mods;
}

/**
 * 훈련 구역 — 레펠탑 + 장애물 코스 + 사열대.
 * 대지가 길수록 레인에 장애물이 더 들어간다 (같은 장애물이 커지는 게 아니라).
 */
function planTraining({ w, d }) {
  const mods = [{ uri: P.gravel, fit: true }];
  mods.push({ uri: P.tower, x: -(w / 2) + 6.0, y: d / 2 - 7.5 });
  mods.push({ uri: P.stand, x: w / 2 - 5.0, y: d / 2 - 3.0, rz: Math.PI });
  mods.push({ uri: P.shed, x: -(w / 2) + 3.4, y: -(d / 2) + 2.6 });
  const lane = [
    { uri: P.wall, span: 5.0 }, { uri: P.bars, span: 7.0 }, { uri: P.tires, span: 8.0 },
    { uri: P.beam, span: 7.0 }, { uri: P.pullup, span: 6.0 },
  ];
  const yLane = -(d / 2) + 5.0;
  let cursor = -(w / 2) + 2.0;
  for (const o of lane) {
    if (cursor + o.span > w / 2 - 2.0) break;
    mods.push({ uri: o.uri, x: cursor + o.span / 2, y: yLane, rz: Math.PI / 2 });
    cursor += o.span + 1.2;
  }
  if (d >= 30) {
    let c2 = -(w / 2) + 3.0;
    for (const o of [lane[2], lane[0], lane[1]]) {
      if (c2 + o.span > w / 2 - 8.0) break;
      mods.push({ uri: o.uri, x: c2 + o.span / 2, y: yLane + 9.0, rz: Math.PI / 2 });
      c2 += o.span + 1.2;
    }
  }
  lightMasts(w, d, mods);
  return mods;
}

export const YARD_PLANS = {
  'parking-zone': planParking,
  'vehicle-parking-zone': planVehicleParking,
  'training-zone': planTraining,
};

const AMBER = () => Cesium.Color.fromCssColorString('#f2a33c');

/**
 * HP 구간별 파손 셸 (assets/blender/build_damage.py).
 * `intact` 는 원본 그대로라 모델이 없다.
 */
const STAGE_MODEL = {
  intact: null,
  scarred: A + 'fac_dmg_light.glb',
  heavy: A + 'fac_dmg_heavy.glb',
  ruin: A + 'fac_ruin.glb',
};
const css = (h) => Cesium.Color.fromCssColorString(h);

export class BuildingStack {
  constructor(scene) {
    this.scene = scene;
    this.models = [];      // [{model, mod}]
    this.key = null;       // 모듈 구성 키 — 바뀌면 재적재
    this._token = 0;
    this.visible = true;
    this.damage = null;    // 정밀타격 피해 연출 {collapse, tint, tintAmount, stage}
    this.stage = 'intact';   // 현재 3D 형상 단계
    this.stageModels = [];   // 그 단계 전용 프리미티브 (원본과 별도)
    this._stageToken = 0;
  }

  /**
   * 모듈 목록 산출.
   *   { uri, x=0, y=0, zOff=0, rz=0, sx=1, sy=1, sz=1 }
   *   x·y·rz  시설 좌표계(정면 −Y) 안의 위치·방위 — heading 이 바뀌면 함께 돈다
   *   sx·sy   해당 GLB 캐노니컬 대비 배율. 붙이지 않으면 **실척**이다.
   *   fit     (야외 구획 바닥 전용) 대지 크기를 CANON_PAD 로 나눈 배율로 채운다
   */
  static _plan(item) {
    const w = item.dims.widthM;
    const d = item.dims.depthM;
    const base = [{ uri: P.stem, zOff: 0, sx: w / CANON_PAD.w, sy: d / CANON_PAD.d, sz: stemDepth(item) }];

    const yard = YARD_PLANS[item.spec.id];
    if (yard) {
      const mods = yard({ w, d }).map((m) => (m.fit
        ? { ...m, sx: w / CANON_PAD.w, sy: d / CANON_PAD.d }
        : m));
      return base.concat(mods).slice(0, MAX_MODULES);
    }

    const reg = MODEL_REGISTRY[item.spec.id] ?? DEFAULT_REGISTRY;
    if (reg.mono) return base.concat(planMono(item, reg)).slice(0, MAX_MODULES);

    const floors = Math.max(1, item.floors ?? item.spec.floors);
    return base.concat(planBlocks(item, reg, floors)).slice(0, MAX_MODULES);
  }

  _matrix(item, mod) {
    const origin = Cesium.Cartesian3.fromDegrees(item.lon, item.lat, item.groundH);
    const enu = Cesium.Transforms.eastNorthUpToFixedFrame(origin);
    // 감시탑(towerModel.ts)과 동일 규약: rotZ(180−heading) → 정면(−Y)이 heading 방위를 향함
    const head = Cesium.Matrix4.fromRotationTranslation(
      Cesium.Matrix3.fromRotationZ(Cesium.Math.toRadians(180 - (item.headingDeg ?? 0))),
      Cesium.Cartesian3.ZERO);
    // 모듈은 시설 좌표계 안에서 평행이동·회전한다 — heading 이 바뀌면 함께 돈다.
    const local = Cesium.Matrix4.fromTranslation(
      new Cesium.Cartesian3(mod.x ?? 0, mod.y ?? 0, mod.zOff ?? 0));
    if (mod.rz) {
      Cesium.Matrix4.multiply(local,
        Cesium.Matrix4.fromRotationTranslation(Cesium.Matrix3.fromRotationZ(mod.rz),
          Cesium.Cartesian3.ZERO), local);
    }
    const sx = mod.sx ?? 1, sy = mod.sy ?? 1, sz = mod.sz ?? 1;
    if (sx !== 1 || sy !== 1 || sz !== 1) {
      Cesium.Matrix4.multiplyByScale(local, new Cesium.Cartesian3(sx, sy, sz), local);
    }
    const m = Cesium.Matrix4.multiply(enu, head, new Cesium.Matrix4());
    return Cesium.Matrix4.multiply(m, local, m);
  }

  /**
   * 피해 연출 상태를 건다 (화력 탭 정밀타격 시뮬레이션).
   *
   * `null` 이면 원래대로 돌아간다. 여기서 행렬을 **직접** 덮지 않고 상태만 들고 있는
   * 이유는, 배치를 건드리면 `update()` 가 다시 돌면서 행렬을 새로 잡기 때문이다 —
   * 그때도 피해가 유지되려면 적용 시점이 `update()` 안이어야 한다.
   *
   * dmg: { collapse 0~1, tint '#rrggbb'|null, tintAmount 0~1 }
   */
  setDamage(item, dmg) {
    this.damage = dmg;
    const stage = dmg?.stage ?? 'intact';
    if (stage !== this.stage) void this._swapStage(item, stage);
    this._applyDamage(item);
  }

  /**
   * 형상 단계를 갈아 끼운다.
   *
   * 원본 셸을 가라앉히는 것만으로는 「무너졌다」가 안 된다 — 멀쩡한 건물이 땅에 반쯤
   * 박혀 있을 뿐이다. 그래서 HP 구간이 넘어가면 **다른 메시**를 올린다.
   *   scarred  원본 위에 파손 오버레이를 덧댄다 (원본은 그대로 보인다)
   *   heavy    원본을 감추고 반파 셸로 대체한다
   *   ruin     원본을 감추고 잔해 더미로 대체한다
   * 파손 셸은 시설 셸과 같은 캐노니컬(14×11)이라 같은 sx·sy 배율로 자리가 맞는다.
   */
  async _swapStage(item, stage) {
    this.stage = stage;
    const token = ++this._stageToken;
    for (const m of this.stageModels) {
      try { this.scene.primitives.remove(m); } catch { /* 이미 제거됨 */ }
    }
    this.stageModels = [];
    const uri = STAGE_MODEL[stage];
    if (!uri) { this._applyDamage(item); return; }
    try {
      const m = await Cesium.Model.fromGltfAsync({
        url: uri, modelMatrix: Cesium.Matrix4.IDENTITY, id: { id: item.uid + '-box' },
      });
      if (token !== this._stageToken) { m.destroy?.(); return; }
      // 파손 셸은 파단면과 그을음이 많아 원본보다 훨씬 어둡게 눌린다 — 조명을 더 준다
      m.lightColor = new Cesium.Cartesian3(3.1, 3.1, 3.1);
      m.imageBasedLighting.imageBasedLightingFactor = new Cesium.Cartesian2(2.4, 2.4);
      this.scene.primitives.add(m);
      this.stageModels.push(m);
    } catch (e) {
      console.warn('facility damage stage load fail', uri, e);
    }
    this._applyDamage(item);
  }

  /** 파손 셸의 배치 행렬 — 시설 좌표계에 캐노니컬 배율로 앉힌다. */
  _stageMatrix(item, zOff = 0) {
    return this._matrix(item, {
      zOff,
      sx: item.dims.widthM / CANON.w,
      sy: item.dims.depthM / CANON.d,
    });
  }

  /**
   * 붕괴는 「가라앉으며 기운다」로 낸다.
   *
   * 모듈 스택은 층(zOff)으로 쌓여 있으므로, **위에 있는 모듈일수록 더 많이 내려앉고
   * 더 많이 기운다**. 그래야 지붕이 먼저 주저앉고 1 층부가 마지막까지 버티는, 실제
   * 붕괴의 순서가 실루엣에 나온다. 모듈마다 위상을 달리해 한 덩어리로 기울지 않게 한다.
   */
  _applyDamage(item) {
    const dmg = this.damage;
    const stage = this.stage;
    // 반파·붕괴에서는 원본 셸을 감춘다 — 그 자리를 파손 셸이 대신한다
    const baseVisible = this.visible && (stage === 'intact' || stage === 'scarred');
    for (const m of this.stageModels) {
      m.show = this.visible;
      // 오버레이(scarred)는 층마다 붙이지 않는다 — 1 층 벽면 하나면 인상이 전달된다
      m.modelMatrix = this._stageMatrix(item, 0);
      if (dmg?.tint && stage !== 'ruin') {
        m.color = css(dmg.tint);
        m.colorBlendMode = Cesium.ColorBlendMode.MIX;
        m.colorBlendAmount = Math.min(0.35, dmg.tintAmount ?? 0);
      } else {
        m.color = Cesium.Color.WHITE;
        m.colorBlendAmount = 0;
      }
    }
    for (const rec of this.models) {
      const base = this._matrix(item, rec.mod);
      if (dmg && dmg.collapse > 0) {
        const c = Math.max(0, Math.min(1, dmg.collapse));
        const z = rec.mod.zOff ?? 0;
        // 높이 가중 — 지면 모듈 0.55, 3 층 지붕이면 1.0 에 가깝다
        const hi = Math.min(1, 0.55 + z / 14);
        const seed = ((rec.pi ?? 0) * 2.399) % Math.PI;
        const drop = -c * hi * (0.9 + (z || 0) * 0.34);
        const tilt = c * hi * 0.22;
        const local = Cesium.Matrix4.fromTranslation(new Cesium.Cartesian3(0, 0, drop));
        Cesium.Matrix4.multiply(local, Cesium.Matrix4.fromRotationTranslation(
          Cesium.Matrix3.multiply(
            Cesium.Matrix3.fromRotationX(tilt * Math.sin(seed)),
            Cesium.Matrix3.fromRotationY(tilt * Math.cos(seed * 1.7)),
            new Cesium.Matrix3()),
          Cesium.Cartesian3.ZERO), local);
        Cesium.Matrix4.multiplyByScale(local,
          new Cesium.Cartesian3(1 + c * 0.10, 1 + c * 0.10, Math.max(0.14, 1 - c * 0.72)), local);
        rec.model.modelMatrix = Cesium.Matrix4.multiply(base, local, new Cesium.Matrix4());
      } else {
        rec.model.modelMatrix = base;
      }
      if (dmg?.tint) {
        rec.model.color = css(dmg.tint);
        rec.model.colorBlendMode = Cesium.ColorBlendMode.MIX;
        rec.model.colorBlendAmount = dmg.tintAmount ?? 0.55;
      } else {
        rec.model.color = Cesium.Color.WHITE;
        rec.model.colorBlendAmount = 0;
      }
      rec.model.show = baseVisible;
    }
  }

  /** 구성 변경 시 재적재, 아니면 행렬·실루엣만 갱신 */
  async update(item, selected) {
    const plan = BuildingStack._plan(item);
    if (!plan || !plan.length) return;
    // 모듈 구성(=uri 순서)이 같으면 재적재하지 않는다. 대지 크기를 조금 바꿔도
    // 동 개수가 그대로면 행렬만 다시 잡으면 된다.
    const key = plan.map((p) => p.uri).join('|');
    if (key !== this.key) {
      this.key = key;
      const token = ++this._token;
      const old = this.models;
      this.models = [];
      const loaded = await Promise.all(plan.map((p) =>
        Cesium.Model.fromGltfAsync({
          url: p.uri,
          modelMatrix: this._matrix(item, p),
          id: { id: item.uid + '-box' },
        }).catch((e) => { console.warn('facility model load fail', p.uri, e); return null; })));
      if (token !== this._token) {            // 경합: 이후 update가 이김
        loaded.forEach((m) => m && !m.isDestroyed?.() && m.destroy?.());
        return;
      }
      old.forEach((rec) => this.scene.primitives.remove(rec.model));
      loaded.forEach((m, i) => {
        if (!m) return;
        // 데모 씬은 블룸(brightness −0.42)+HDR로 PBR 모델이 어둡게 눌림 → 라이팅 부스트.
        // 아래 등록으로 실제 밝기는 시간·계절·날씨(env)가 매 프레임 다시 정한다.
        m.lightColor = new Cesium.Cartesian3(2.2, 2.2, 2.2);
        m.imageBasedLighting.imageBasedLightingFactor = new Cesium.Cartesian2(1.8, 1.8);
        trackEnvModel(m, { baseColor: [2.2, 2.2, 2.2], baseIBL: [1.8, 1.8], surfaceWeather: true });
        this.scene.primitives.add(m);
        // 계획 인덱스를 같이 들고 간다 — 일부 GLB 로드가 실패하면 models 와 plan 의
        // 인덱스가 어긋나서, 그 뒤 모듈들이 남의 자리에 가서 선다.
        this.models.push({ model: m, mod: plan[i], pi: i });
      });
    } else {
      // 크기·방위만 달라진 경우 — 저장해 둔 모듈 서술을 새 계획으로 갈아 끼운다.
      this.models.forEach((rec) => { if (plan[rec.pi]) rec.mod = plan[rec.pi]; });
    }
    for (const rec of this.models) {
      rec.model.silhouetteColor = AMBER();
      rec.model.silhouetteSize = selected ? 1.5 : 0;
    }
    // 행렬은 피해 상태를 아는 쪽이 잡는다 — 여기서 먼저 덮으면 재배치 한 번에
    // 무너져 있던 건물이 멀쩡히 일어선다.
    this._applyDamage(item);
  }

  setVisible(v) {
    this.visible = v;
    const baseVisible = v && (this.stage === 'intact' || this.stage === 'scarred');
    for (const rec of this.models) rec.model.show = baseVisible;
    for (const m of this.stageModels) m.show = v;
  }

  destroy() {
    this._token++;
    this._stageToken++;
    for (const rec of this.models) this.scene.primitives.remove(rec.model);
    for (const m of this.stageModels) {
      try { this.scene.primitives.remove(m); } catch { /* 이미 제거됨 */ }
    }
    this.models = [];
    this.stageModels = [];
    this.stage = 'intact';
    this.key = null;
  }
}
