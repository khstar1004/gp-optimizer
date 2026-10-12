// @ts-nocheck
/**
 * 정밀타격 효과 시뮬레이션 — **실제 3D 지도 위에서** 일어난다
 *
 * 예전 피해 시각화는 자기만의 뷰어를 하나 더 띄우고, 그 안에 좌표 없는 가짜 단지를
 * 세워 두고 재생했다. 화면은 그럴듯했지만 아무 데도 이어지지 않았다 — 그 A2 동은
 * 여기 배치한 어떤 건물도 아니었고, 그 원은 어떤 탄종에서도 나오지 않았다.
 *
 * 그래서 뷰어를 없앴다. 타격은 이제 VWorld 위성영상 + MapTiler 지형 위, 사용자가
 * 실제로 배치해 둔 시설과 감시자산 사이에서 일어난다. 지도를 클릭해 탄착점을 찍고,
 * 탄종을 고르면 그 탄의 순폭약량이 반경을 정하고, 그 반경 안에 **실제로 들어 있는**
 * 건물이 등급을 받는다. 배치를 고치면 판정이 따라 바뀐다 — 그게 이 화면의 목적이다.
 *
 * 화면을 구성하는 것들
 * ────────────────────
 *  정적 (계획이 바뀔 때만 다시 만든다)
 *    · 지형 클램프 피해 원반 5 겹 + 지형 클램프 폴리라인 테두리 + 반경 라벨
 *    · CEP 산포원 · 종말유도 진입 경로 · 탄착점 표주(폴 + 십자선 + 라벨)
 *    · 판정 대상(시설·감시자산)마다 등급 고리와 라벨
 *  동적 (매 프레임 t 로부터 계산 — 되감아도 같은 그림이 나온다)
 *    · 탄체 GLB · 항적 · 섬광 · 화구 · 충격파 돔 · 지표 먼지 링
 *    · 연기 기둥 · 파편 · 탄공 GLB · 잔해 GLB · 건물 붕괴 · 화면 섬광/진동
 *
 * 지형 클램프 규약
 * ────────────────
 * Cesium 에서 **지형에 붙는 테두리 선**은 `polyline{clampToGround:true}` 뿐이다
 * (클램프된 `ellipse` 의 `outline` 은 그려지지 않는다 — 지반 프리미티브에는 테두리
 * 지오메트리가 없다). 그래서 면은 클램프 ellipse, 선은 클램프 polyline 으로 나눠 만든다.
 *
 * 매 프레임 지오메트리를 다시 만들지 않는다
 * ─────────────────────────────────────────
 * 반경이 변하는 것(충격파)은 지반 프리미티브로 만들면 프레임마다 타일을 다시 굽는다.
 * 그래서 확장하는 것들은 전부 **지표 위 프리미티브**(ellipsoid 돔 · 빌보드)로 두고,
 * 지반에 붙는 것들은 전부 **정적**으로 둔다.
 */
import {
  assessTargets, capacityKpa, createStrikeReport, entrySlantM, GRADE_COLOR, GRADE_LABEL,
  CUM_THRESHOLD, findVulnerableAimpoint, gradeFromDamage, hpOf, magazineNewKg, magazineRings,
  MAGAZINE_DELAY_S, maskFactorFromPathDiff, pathDifferenceM, roundsToDefeat, salvoOffsets,
  shotDamage, STAGE_LABEL, stageOf,
  strikeRings, strikeTimeline,
  type DamageGrade, type Fuze, type Munition, type StrikeAssessment, type StrikeTarget,
} from '../domain/strike';
import { azimuthDeg, distM, offset } from './geo';
import { BlastParticles } from './strikeParticles';
import { Shockwave } from './strikeShockwave';
import { StrikeAudio } from './strikeAudio';
import { DamageNumbers, KillFeed } from './strikeFeedback';

const D = (lon, lat, h) => Cesium.Cartesian3.fromDegrees(lon, lat, h);
const css = (h) => Cesium.Color.fromCssColorString(h);
const R2D = 180 / Math.PI;
const D2R = Math.PI / 180;

/** 피해 등급별 원반 색 — 도메인의 등급색을 그대로 쓴다(범례와 지도가 어긋나지 않게). */
const ZONE_STYLE = [
  { key: 'frag', label: '파편 위험', color: '#9db4c0', fill: 0.09, width: 2.4, zIndex: 1 },
  { key: 'light', label: '외벽·유리', color: GRADE_COLOR.light, fill: 0.12, width: 2.6, zIndex: 2 },
  { key: 'moderate', label: '경파', color: GRADE_COLOR.moderate, fill: 0.16, width: 3.0, zIndex: 3 },
  { key: 'severe', label: '중파', color: GRADE_COLOR.severe, fill: 0.21, width: 3.6, zIndex: 4 },
  { key: 'complete', label: '완파', color: GRADE_COLOR.destroyed, fill: 0.28, width: 4.4, zIndex: 5 },
];

const STEM_N = 34;       // 연기 기둥 몸통
const CAP_N = 20;        // 기둥 머리 (퍼지는 갓)
const DUST_N = 34;       // 폭심 둘레 먼지 치마
const SHOCK_N = 56;      // 지표 충격파 고리 조각
const FRAG_N = 44;       // 파편·불티 궤적
const FIRE_N = 10;       // 잔류 화재
const RUBBLE_N = 5;      // 탄착점 둘레 잔해 더미

/**
 * 화면에서 이만큼(px)보다 작아지면 「아무 일도 안 일어난 것」이 된다.
 *
 * 대전차유도탄의 화구는 실척으로 반경 6 m 다. 1 km 밖에서 그것은 3 px 이고, 화면에는
 * 정말 아무것도 안 보인다 — 물리는 맞지만 화면은 거짓말을 한다(폭발이 있었는데 없다).
 * 그래서 **연무·후광 같은 연출 요소에만** 화면 최소 크기를 보장한다. 피해 반경과
 * 등급은 절대 건드리지 않는다 — 그쪽은 여전히 순폭약량이 정하는 실측값이다.
 */
const FX_MIN_PX = { glow: 62, stem: 34, cap: 46, dust: 26, shock: 20, fire: 16 };

/**
 * VISTA 원본 폭발 텍스처.
 *
 * 프로시저럴 캔버스 퍼프로도 형태는 나오지만, 실제로 그린 스프라이트 시트를 프레임
 * 애니메이션으로 돌리면 「연기가 피어오르는 결」이 나온다 — 원 여러 개를 겹친 것과는
 * 다른 그림이다. VISTA 배치 런타임(`placementRuntime.ts`)이 쓰던 그 자산을 그대로 쓴다.
 * server.cts 가 `/js/vendor/3d-bundles/` 로 마운트하며, 번들이 없는 환경에서는
 * 아래 캔버스 스프라이트로 조용히 되돌아간다(기능은 그대로, 그림만 단순해진다).
 */
const VISTA_FX = '/js/vendor/3d-bundles/effects/';
const FX_URL = {
  explosion: Array.from({ length: 9 }, (_v, i) =>
    `${VISTA_FX}libraries/kenney_smoke_particles/PNG/Explosion/explosion0${i}.png`),
  flash: Array.from({ length: 9 }, (_v, i) =>
    `${VISTA_FX}libraries/kenney_smoke_particles/PNG/Flash/flash0${i}.png`),
  smoke: `${VISTA_FX}textures/focus-fire/impact_smoke.png`,
  dust: `${VISTA_FX}textures/focus-fire/impact_dust.png`,
  glow: `${VISTA_FX}textures/focus-fire/head_glow.png`,
};

/** 스프라이트 시트 한 장 고르기 — 0~1 진행도를 프레임 번호로. */
function frameAt(list, u) {
  return list[Math.max(0, Math.min(list.length - 1, Math.floor(u * list.length)))];
}

/** 한 발이 시간축 위에서 차지하는 자리. */
const MAX_ROUNDS = 12;
/** 연속사격 연출 간격 상한 (초) — 실제 재장전이 90 초여도 화면은 이만큼만 기다린다. */
const SALVO_GAP_CAP = 15;

// ───────────────────────── 스프라이트 ─────────────────────────

function radialSprite(stops, size = 128) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  for (const [at, color] of stops) grad.addColorStop(at, color);
  g.fillStyle = grad;
  g.fillRect(0, 0, size, size);
  return c;
}

/** 연기·먼지 퍼프 — 가장자리를 난수로 물어뜯어 원판으로 보이지 않게 한다. */
function puffSprite(seed = 1) {
  const size = 128;
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');
  let s = seed * 9301 + 49297;
  const rnd = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
  for (let i = 0; i < 9; i++) {
    const r = size * (0.16 + rnd() * 0.17);
    const x = size / 2 + (rnd() - 0.5) * size * 0.42;
    const y = size / 2 + (rnd() - 0.5) * size * 0.42;
    const grad = g.createRadialGradient(x, y, 0, x, y, r);
    grad.addColorStop(0, 'rgba(255,255,255,0.92)');
    grad.addColorStop(0.5, 'rgba(255,255,255,0.44)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grad;
    g.beginPath();
    g.arc(x, y, r, 0, Math.PI * 2);
    g.fill();
  }
  return c;
}

/** 퍼지는 고리 — 안이 빈 원. 대기 중 표적 핑에 쓴다(지오메트리 대신 빌보드). */
function ringSprite(color = '#ffcf80') {
  const size = 256;
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');
  const r = size * 0.42;
  const grad = g.createRadialGradient(size / 2, size / 2, r * 0.72, size / 2, size / 2, r);
  grad.addColorStop(0, 'rgba(255,255,255,0)');
  grad.addColorStop(0.55, color);
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.strokeStyle = grad;
  g.lineWidth = size * 0.075;
  g.beginPath();
  g.arc(size / 2, size / 2, r, 0, Math.PI * 2);
  g.stroke();
  return c;
}

/** 화구 후광 — 코어보다 넓고 부드럽게 퍼지는 빛. 블룸이 이것을 물어 번지게 한다. */
function glowSprite() {
  return radialSprite([
    [0, 'rgba(255,252,240,0.95)'], [0.16, 'rgba(255,214,150,0.72)'],
    [0.38, 'rgba(255,150,60,0.36)'], [0.66, 'rgba(214,80,28,0.14)'],
    [1, 'rgba(150,40,10,0)'],
  ], 192);
}

/** 잔류 화재 — 위로 갈수록 좁아지는 불꽃 한 자락. */
function flameSprite() {
  const size = 128;
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');
  const grad = g.createLinearGradient(0, size, 0, 0);
  grad.addColorStop(0, 'rgba(255,238,190,0.95)');
  grad.addColorStop(0.35, 'rgba(255,150,50,0.72)');
  grad.addColorStop(0.72, 'rgba(200,60,20,0.28)');
  grad.addColorStop(1, 'rgba(120,30,10,0)');
  g.fillStyle = grad;
  g.beginPath();
  g.moveTo(size * 0.5, size * 0.03);
  g.bezierCurveTo(size * 0.86, size * 0.44, size * 0.80, size * 0.82, size * 0.5, size * 0.99);
  g.bezierCurveTo(size * 0.20, size * 0.82, size * 0.14, size * 0.44, size * 0.5, size * 0.03);
  g.fill();
  return c;
}

/** 종말유도 진입점 웨이포인트 — 후광 마름모. 계획 단계의 평면 점선을 HUD 톤으로 잇는다. */
function waypointSprite() {
  const size = 96;
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');
  const cx = size / 2, cy = size / 2;
  const glow = g.createRadialGradient(cx, cy, 0, cx, cy, size * 0.48);
  glow.addColorStop(0, 'rgba(180,236,255,0.85)');
  glow.addColorStop(0.42, 'rgba(120,200,240,0.36)');
  glow.addColorStop(1, 'rgba(80,160,210,0)');
  g.fillStyle = glow;
  g.fillRect(0, 0, size, size);
  g.strokeStyle = 'rgba(190,238,255,0.8)';
  g.lineWidth = 1.6;
  g.beginPath();
  g.arc(cx, cy, size * 0.3, 0, Math.PI * 2);
  g.stroke();
  g.save();
  g.translate(cx, cy);
  g.rotate(Math.PI / 4);
  g.fillStyle = 'rgba(224,248,255,0.95)';
  g.fillRect(-6, -6, 12, 12);
  g.restore();
  return c;
}

/** 표적 락온 브래킷 — 모서리만 남은 사각 조준틀. VISTA 타격 HUD의 「목표」 박스를 참조. */
function lockBracketSprite() {
  const size = 160;
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');
  const cx = size / 2, cy = size / 2, half = size * 0.34, arm = half * 0.62;
  const glow = g.createRadialGradient(cx, cy, 0, cx, cy, size * 0.5);
  glow.addColorStop(0, 'rgba(255,196,110,0.28)');
  glow.addColorStop(1, 'rgba(255,196,110,0)');
  g.fillStyle = glow;
  g.fillRect(0, 0, size, size);
  g.strokeStyle = 'rgba(255,221,150,0.95)';
  g.lineWidth = 3.4;
  g.lineCap = 'round';
  g.beginPath();
  g.moveTo(cx - half, cy - half + arm); g.lineTo(cx - half, cy - half); g.lineTo(cx - half + arm, cy - half);
  g.moveTo(cx + half - arm, cy - half); g.lineTo(cx + half, cy - half); g.lineTo(cx + half, cy - half + arm);
  g.moveTo(cx + half, cy + half - arm); g.lineTo(cx + half, cy + half); g.lineTo(cx + half - arm, cy + half);
  g.moveTo(cx - half + arm, cy + half); g.lineTo(cx - half, cy + half); g.lineTo(cx - half, cy + half - arm);
  g.stroke();
  return c;
}

/**
 * 지도 위 HP 막대.
 *
 * 내구 판정 표는 왼쪽 패널 안쪽에 있어서, 지도를 보고 있는 동안에는 **HP 가 보이지
 * 않는다**. 「몇 발까지 버티는가」가 이 화면의 핵심인데 그 수가 화면 밖에 있으면
 * 없는 것과 같다. 그래서 구조물마다 머리 위에 막대를 띄운다 — 게임의 체력바처럼
 * 한눈에 「저 동은 아직 절반 남았고 저 동은 무너졌다」가 읽혀야 한다.
 *
 * 캔버스는 HP 1 % 단위로만 다시 그린다(그 아래는 눈에 보이지 않는 차이인데
 * 매 프레임 텍스처를 새로 올리면 그것만으로 프레임이 깎인다).
 */
function hpSprite(o) {
  const W = 460, H = 132, S = 2;           // S = 논리 픽셀당 캔버스 픽셀
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const g = c.getContext('2d');
  const r = 10 * S;
  const w = W - 6, h = H - 6;
  // 판
  g.beginPath();
  g.moveTo(3 + r, 3);
  g.arcTo(3 + w, 3, 3 + w, 3 + h, r);
  g.arcTo(3 + w, 3 + h, 3, 3 + h, r);
  g.arcTo(3, 3 + h, 3, 3, r);
  g.arcTo(3, 3, 3 + w, 3, r);
  g.closePath();
  g.fillStyle = 'rgba(5,9,13,0.94)';
  g.fill();
  g.strokeStyle = o.color;
  g.lineWidth = 2.5 * S;
  g.stroke();

  // 이름
  g.textBaseline = 'middle';
  g.font = `700 ${13 * S}px "Pretendard GOV", sans-serif`;
  g.fillStyle = '#e9eff2';
  g.fillText(o.name, 14 * S, 17 * S);
  if (o.hardened) {
    g.font = `600 ${9 * S}px "Pretendard GOV", sans-serif`;
    g.fillStyle = '#f2a33c';
    const nw = g.measureText(o.name).width;
    g.fillText('방호', 14 * S + nw + 8 * S, 17 * S);
  }

  // 막대
  const bx = 14 * S, by = 30 * S, bw = W - 28 * S - 46 * S, bh = 13 * S;
  g.fillStyle = 'rgba(255,255,255,0.10)';
  g.fillRect(bx, by, bw, bh);
  const fill = Math.max(0, Math.min(1, o.hp));
  if (fill > 0) {
    g.fillStyle = o.color;
    g.fillRect(bx, by, bw * fill, bh);
  }
  // 눈금 — 등급이 바뀌는 자리에 금을 그어 「어디서 무너지는가」를 보이게 한다
  g.strokeStyle = 'rgba(255,255,255,0.35)';
  g.lineWidth = 1 * S;
  for (const m of o.marks) {
    const mx = bx + bw * m;
    g.beginPath(); g.moveTo(mx, by); g.lineTo(mx, by + bh); g.stroke();
  }
  g.strokeStyle = 'rgba(255,255,255,0.22)';
  g.strokeRect(bx, by, bw, bh);

  // HP %
  g.font = `700 ${15 * S}px "Chakra Petch", sans-serif`;
  g.fillStyle = o.color;
  g.textAlign = 'right';
  g.fillText(`${Math.round(fill * 100)}%`, W - 14 * S, by + bh / 2);
  g.textAlign = 'left';

  // 아랫줄 — 단계 · 거리 · 필요 발수
  g.font = `600 ${11 * S}px "Pretendard GOV", sans-serif`;
  g.fillStyle = o.color;
  g.fillText(o.stage, 14 * S, 53 * S);
  g.fillStyle = '#8fa0ad';
  const sw = g.measureText(o.stage).width;
  g.fillText(o.sub, 14 * S + sw + 8 * S, 53 * S);
  return c;
}

/** 탄착점 십자선 — 언제나 보여야 하므로 깊이검사를 끄고 띄운다. */
function crosshairSprite(color = '#f6c76a') {
  const size = 96;
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');
  g.strokeStyle = color;
  g.lineWidth = 2.4;
  g.beginPath();
  g.arc(size / 2, size / 2, 26, 0, Math.PI * 2);
  g.stroke();
  g.lineWidth = 1.4;
  g.beginPath();
  g.arc(size / 2, size / 2, 38, 0, Math.PI * 2);
  g.stroke();
  g.lineWidth = 2.4;
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    g.beginPath();
    g.moveTo(size / 2 + dx * 14, size / 2 + dy * 14);
    g.lineTo(size / 2 + dx * 44, size / 2 + dy * 44);
    g.stroke();
  }
  g.fillStyle = color;
  g.beginPath();
  g.arc(size / 2, size / 2, 3.2, 0, Math.PI * 2);
  g.fill();
  return c;
}

// ───────────────────────── 보간 ─────────────────────────

import { clamp01 } from './mathUtils';
/**
 * 대기 연출의 값은 **끊어서** 돌려준다.
 *
 * `CallbackProperty` 는 매 프레임 불리고, 값이 조금이라도 다르면 Cesium 이 갱신 경로를
 * 탄다. 눈에 보이지도 않는 0.01 m 차이 때문에 그 일을 60 번/초 하게 두지 않는다 —
 * 같은 값을 돌려주면 세터가 `if (this._x !== value)` 에서 곧바로 빠져나간다.
 */
/** 락온 브래킷의 숨쉬는 크기 (px) — 정수로 끊는다. */
const bracketSize = () => Math.round(44 + Math.sin(performance.now() / 480) * 5);
const PING_PERIOD_MS = 2400;
const pingPhase = (offset) => ((performance.now() / PING_PERIOD_MS + offset) % 1);
/** 지름 (m) — 0.5 m 단위. */
function pingSize(offset) {
  return Math.round((12 + pingPhase(offset) * 60) * 2) / 2;
}
const PING_COLORS = Array.from({ length: 24 }, (_v, i) =>
  Cesium.Color.fromCssColorString('#ffcf80').withAlpha(0.34 * (1 - i / 24)));
/** 색 — 24 단계로 미리 만들어 두고 고른다(프레임마다 Color 를 새로 만들지 않는다). */
function pingColor(offset) {
  return PING_COLORS[Math.min(23, Math.floor(pingPhase(offset) * 24))];
}

const smooth = (v) => { const t = clamp01(v); return t * t * (3 - 2 * t); };

/** 원(중심·반경)을 지형 클램프 폴리라인용 좌표열로. */
function circlePositions(lon, lat, radiusM, groundH, n = 96) {
  const out = [];
  for (let i = 0; i <= n; i++) {
    const p = offset(lon, lat, (i / n) * 360, radiusM);
    out.push(D(p.lon, p.lat, groundH));
  }
  return out;
}

// ───────────────────────── 본체 ─────────────────────────

export class StrikeScene {
  /**
   * @param viewer 본 지도 뷰어 (VWorld + MapTiler). 새로 만들지 않는다.
   * @param ctx { state, toast, onPick, onTick, onPlanChange }
   */
  constructor(viewer, ctx = {}) {
    this.viewer = viewer;
    this.ctx = ctx;
    this.ds = new Cesium.CustomDataSource('strike');
    viewer.dataSources.add(this.ds);
    this.models = { munition: null, craters: [], rubble: [] };
    this.modelToken = 0;
    this.plan = null;         // { munition, fuze, azDeg, impact }
    this.rings = null;
    this.timeline = null;
    this.rows = [];           // StrikeAssessment[]
    this.t = 0;
    this.playing = false;
    this.speed = 1;
    this.cameraMode = 'free';
    this.slowmo = ctx.slowmo !== false;   // 탄착 순간 시간 늘이기
    this.designating = false;
    this._raf = 0;
    this._last = 0;
    this._touched = new Set();  // 피해를 입혀 둔 시설 uid — 복원 대상
    this._revived = new Set();  // 즉시 복구로 되살린 시설 uid — 이후 시각에도 손상 제외
    this.shots = [];            // 연속사격 — 발마다 {lon, lat, at, offset}
    this.secondaries = [];      // 탄약고 2차 유폭
    this._assessFp = null;      // 마지막 판정에 쓴 배치 지문
    this.missionBase = new Map();  // 화력 임무 — 이전 발들이 이 시설에 이미 낸 누적손상
    this._designateKind = 'impact'; // 다음 지도 클릭이 무엇을 지정하는지 — 타격지점 | 발사대
    this._designateContinuous = false; // true 면 계획 모드 — 클릭해도 무장이 풀리지 않는다
    this.vistaFx = false;       // VISTA 원본 스프라이트 사용 가능 여부
    // 결정적 빌보드가 형태를, 파티클이 질감을, 포스트프로세스가 공기의 굴절을 맡는다
    this.particles = new BlastParticles(viewer.scene);
    this.shockwave = new Shockwave(viewer.scene);
    this.audio = new StrikeAudio();
    this.audio.setEnabled(ctx.sound !== false);
    this.numbers = new DamageNumbers(this.ds);
    this.feed = new KillFeed(document.getElementById('map-wrap'));
    this.hits = [];             // 데미지 넘버 — 계획이 정해질 때 통째로 계산해 둔다
    this.logEvents = [];        // 전투 로그 — 같은 규약
    this._fired = new Set();    // 이미 터뜨린 발 번호 (되감으면 비운다)
    this._beamEnts = [];        // 유도빔 — 마지막 탄착 뒤에는 끈다
    this._lastT = 0;
    this.sprites = {
      core: radialSprite([[0, 'rgba(255,255,255,1)'], [0.28, 'rgba(255,236,190,0.95)'],
        [0.62, 'rgba(255,168,74,0.42)'], [1, 'rgba(255,120,40,0)']]),
      glow: glowSprite(),
      flame: flameSprite(),
      puff: [puffSprite(3), puffSprite(11), puffSprite(29), puffSprite(53)],
      cross: crosshairSprite(),
      waypoint: waypointSprite(),
      lockBracket: lockBracketSprite(),
      ring: ringSprite(),
    };
    this.fxScale = ctx.fxScale ?? 'auto';   // 연출 배율 — 피해 반경·판정과 무관하다
    this._buildDynamic();
    this._installPicker();
    this._flashEl = null;
    void this._loadVistaFx();
  }

  /** VISTA 이펙트 자산을 미리 물어 둔다. 하나라도 없으면 캔버스 스프라이트로 남는다. */
  async _loadVistaFx() {
    const urls = [...FX_URL.explosion, ...FX_URL.flash, FX_URL.smoke, FX_URL.dust, FX_URL.glow];
    const ok = await Promise.all(urls.map((u) => new Promise((res) => {
      const im = new Image();
      im.onload = () => res(true);
      im.onerror = () => res(false);
      im.src = u;
    })));
    this.vistaFx = ok.every(Boolean);
    if (this.vistaFx) {
      this.particles.setTextures({
        fire: FX_URL.explosion[3], smoke: FX_URL.smoke, dust: FX_URL.dust,
      });
    } else {
      console.warn('[strike] VISTA 이펙트 번들 없음 — 캔버스 스프라이트로 표시합니다');
    }
    this.update(this.t);
  }

  /** 빌보드 이미지 교체 — 같은 값이면 건드리지 않는다(프레임마다 텍스처를 새로 물지 않게). */
  _img(e, src) {
    if (e._imgSrc === src) return;
    e._imgSrc = src;
    e.billboard.image = src;
  }

  // ═══════════════ 계획 ═══════════════

  /**
   * 타격 계획을 건다. 탄착점이 있으면 정적 도형과 판정을 전부 다시 만든다.
   * @param plan { munition, fuze, azDeg, impact:{lon,lat,groundH,mgrs} | null }
   */
  setPlan(plan) {
    this.plan = plan;
    this.rings = plan?.munition ? strikeRings(plan.munition, plan.fuze) : null;
    this.timeline = this.rings ? strikeTimeline(plan.munition, plan.fuze, this.rings) : null;
    this._revived = new Set();   // 새 계획 — 이전 복구 기록은 의미가 없다
    this._buildSalvo();
    this._rebuildStatic();
    this._assessFp = this._inputFingerprint();
    this._assess();
    this.seek(Math.min(this.t, this.timeline?.totalS ?? 0));
    return this.rows;
  }

  /**
   * 연속사격 구성 — 발마다 **자기 탄착점과 자기 시각**을 갖는다.
   *
   * 같은 조준점에 쏴도 탄착은 매번 다르다(CEP). 그 산포를 결정적 난수로 뽑아 두면
   * 재생 막대를 되감아도 같은 자리에 같은 순서로 떨어진다 — 「이 계획을 이렇게 쏘면
   * 이렇게 된다」가 매번 재현되어야 판단의 근거가 된다.
   */
  _buildSalvo() {
    this.shots = [];
    const plan = this.plan;
    if (!plan?.impact || !this.timeline) return;
    const rounds = Math.max(1, Math.min(MAX_ROUNDS, plan.rounds ?? 1));
    const gapS = Math.min(plan.munition.reloadS, SALVO_GAP_CAP);
    const offs = salvoOffsets(plan.munition, rounds, plan.seed ?? 1);
    for (let i = 0; i < rounds; i++) {
      const o = offs[i];
      const p1 = offset(plan.impact.lon, plan.impact.lat, 0, o.northM);
      const p2 = offset(p1.lon, p1.lat, 90, o.eastM);
      this.shots.push({
        n: i + 1,
        lon: p2.lon, lat: p2.lat,
        at: this.timeline.impactS + i * gapS,   // 탄착 시각
        missM: o.missM,
      });
    }
    // 마지막 탄착 뒤의 잔류 연출까지 담도록 전체 길이를 늘린다.
    // 화력 임무에서 잇달아 쏘는 중간 발은 이 잔류를 plan.tailS 로 짧게 줄일 수 있다 —
    // 그러지 않으면 발마다 30 초 넘게 기다리게 된다(strikeTab.ts missionFireNext 참조).
    const tailS = plan.tailS ?? 26;
    const last = this.shots[this.shots.length - 1].at;
    this.timeline = { ...this.timeline, totalS: Math.round((last + tailS) * 10) / 10, gapS, rounds };
  }

  /** 시각 t 까지 떨어진 발들. */
  _landed(t) { return this.shots.filter((sh) => t >= sh.at); }

  /**
   * 배치 변화의 지문 — 판정에 실제로 들어가는 값만 모은다.
   *
   * `placer.onChange` 는 시설을 **선택**하기만 해도 불린다. 선택은 판정에 아무 영향이
   * 없는데도 그때마다 지형을 다시 읽고 몬테카를로를 500 회 돌리고 패널을 통째로 다시
   * 그리고 있었다(약 20 ms). 들어가는 값이 그대로면 그 일을 하지 않는다.
   */
  _inputFingerprint() {
    const st = this.ctx.state ?? {};
    const parts = [];
    for (const it of st.placer?.items ?? []) {
      parts.push(`${it.uid}:${it.lon.toFixed(6)},${it.lat.toFixed(6)}:${it.protection}`
        + `:${it.spec?.id}:${it.floors}:${it.details?.['저장용량'] ?? ''}`);
    }
    for (const q of st.posts?.posts ?? []) {
      parts.push(`${q.uid}:${q.lon.toFixed(6)},${q.lat.toFixed(6)}`);
    }
    parts.push(`tower:${st.ents?.towerHeight ?? 0}:${(st.ents?.groundH ?? 0).toFixed(2)}`);
    return parts.join('|');
  }

  /** 배치가 바뀌었을 때 판정만 다시 — 도형은 그대로 둔다. */
  reassess(force = false) {
    const fp = this._inputFingerprint();
    if (!force && fp === this._assessFp) return this.rows;
    this._assessFp = fp;
    this._assess();
    this.update(this.t);
    return this.rows;
  }

  /**
   * 화력 임무 — 새 임무를 시작할 때 이전 누적손상을 지운다.
   *
   * 단발/단일 계획 모드에서는 아무도 부르지 않으므로 그 화면은 지금과 똑같이 동작한다.
   */
  resetMission() { this.missionBase = new Map(); this._revived = new Set(); }

  /**
   * 이번 발(사격)이 낸 피해를 임무 누적치로 접어 넣는다.
   *
   * `_assess()` 가 이미 `r.cumulative` 에 이전 누적치를 더해 두었으므로, 그 값을
   * 그대로 다음 발의 기준선으로 저장하면 된다 — 다른 지점을 쏴도 이 시설이 입은
   * 피해는 지워지지 않는다. 화력 임무를 순차 실행하는 쪽(strikeTab)이 한 발의
   * 재생이 끝날 때마다, 다음 발을 걸기 전에 부른다.
   */
  commitMissionShot() {
    for (const r of this.rows) this.missionBase.set(r.uid, r.cumulative);
  }

  targets() { return this.rows; }
  ringsOf() { return this.rings; }
  timelineOf() { return this.timeline; }

  /** 판정 대상 수집 — 배치 시설 · 감시자산 · 감시탑. */
  _collectTargets(): StrikeTarget[] {
    const state = this.ctx.state ?? {};
    const out: StrikeTarget[] = [];
    for (const it of state.placer?.items ?? []) {
      out.push({
        uid: it.uid,
        name: it.spec?.name ?? '시설',
        kind: '시설',
        lon: it.lon, lat: it.lat,
        groundH: it.groundH ?? 0,
        // HP 막대를 띄울 높이 — 그 구조물 꼭대기 위
        // 시설 이름표(placement.ts)가 groundH+벽체+22 에 있으므로 그보다 위에 띄운다
        topH: (it.groundH ?? 0) + (it.floors ?? it.spec?.floors ?? 1) * 3.2 + 34,
        hardened: it.protection === 'hardened',
        detail: `${it.dims?.widthM ?? '?'}×${it.dims?.depthM ?? '?'}m · ${it.floors ?? 1}층 · ${it.capacity ?? 0}명`,
      });
    }
    for (const p of state.posts?.posts ?? []) {
      out.push({
        uid: p.uid, name: p.name ?? p.type ?? '감시자산', kind: '감시자산',
        lon: p.lon, lat: p.lat, hardened: false,
        groundH: p.groundH ?? 0,
        topH: (p.groundH ?? 0) + (p.mastH ?? 6) + 16,
        detail: p.short ? `${p.short} · 관측고 ${Math.round(p.mastH ?? 0)}m` : undefined,
      });
    }
    const gp = state.ents;
    if (gp && Number.isFinite(gp.groundH)) {
      const site = this.ctx.site;
      if (site) {
        out.push({
          uid: 'gp-tower', name: 'GP 감시탑', kind: '감시탑',
          lon: site.lon, lat: site.lat, hardened: true,
          groundH: gp.groundH ?? 0,
          topH: (gp.groundH ?? 0) + (gp.towerHeight ?? 18) + 22,
          detail: `탑고 ${Math.round(gp.towerHeight ?? 0)}m`,
        });
      }
    }
    return out;
  }

  /**
   * 판정 — 한 발이면 반경 판정, 여러 발이면 누적 손상 판정.
   *
   * 두 판정은 어긋나지 않는다. 누적 임계값을 「그 등급의 문턱 거리에서 한 발이 주는
   * 손상」으로 잡아 두었기 때문에, 1 발일 때 두 방식은 반드시 같은 답을 낸다
   * (domain/strike.ts 의 CUM_THRESHOLD 주석 참조).
   *
   * 여기에 **몇 발까지 버티는가**를 함께 매긴다 — CEP 산포를 반영한 몬테카를로라
   * 하나의 수가 아니라 중앙값과 90 % 값으로 나온다. 사격계획이 실제로 필요한 것은
   * 「절반은 이 발수면 된다」가 아니라 「열 번 중 아홉 번은 이 발수면 된다」다.
   */
  _assess() {
    if (!this.plan?.impact || !this.rings) { this.rows = []; this._drawTargetRings(); return; }
    const { munition, fuze, impact } = this.plan;
    const R = this.rings;
    const base = assessTargets(this._collectTargets(), impact, R, munition, fuze, distM);
    const rows = base.map((r) => {
      const capKpa = capacityKpa(r.hardened, munition, fuze);
      // 지형 차폐는 **조준점 기준으로 한 번만** 잰다.
      //
      // 처음에는 발마다 그 탄착점에서 다시 쟀는데, 그것이 이 계산의 거의 전부였다:
      // `globe.getHeight` 가 호출당 20 µs 인데 12 발 × 9 대상 × 25 표본이면 2,700 번,
      // 곧 54 ms 다. 발수 슬라이더를 놓을 때마다 그만큼 멈춘다.
      //
      // 그리고 그렇게 잴 필요가 없다. 탄착은 CEP(0.6~8 m) 안에서 흩어지는데, 그 정도
      // 이동으로는 **폭심과 표적 사이에 어느 능선이 있는지가 바뀌지 않는다** — 경로차
      // δ 는 수십 m 떨어진 마루의 기하가 정하지, 폭심이 몇 m 움직인 것이 정하지 않는다.
      const mask = this._maskBetween(impact, r, R.effectiveKg, fuze.burstAglM);
      const perShot = this.shots.map((sh) =>
        shotDamage(distM(sh.lon, sh.lat, r.lon, r.lat), R.effectiveKg, capKpa, mask));
      // 화력 임무 — 이전 발들이 이 시설에 이미 낸 누적손상을 기준선으로 더한다.
      // 단발/단일 계획에서는 missionBase 가 비어 있으므로 이 항은 0이다.
      const prior = this.missionBase.get(r.uid) ?? 0;
      return {
        ...r, capKpa, perShot, mask,
        cumulative: perShot.reduce((a, b) => a + b, 0) + prior,
        endurance: roundsToDefeat({
          munition, fuze, rings: R, targetDistM: r.distM, hardened: r.hardened, mask,
        }),
      };
    });

    // ── 탄약고 유폭 ──
    // 탄약고가 완파되면 저장 탄약이 함께 터진다. 그 2차 폭발은 1차보다 훨씬 크고,
    // 그래서 「탄약고를 어디 두는가」가 이 배치에서 가장 값비싼 결정이 된다.
    this.secondaries = this._findSecondaries(rows);
    for (const sec of this.secondaries) {
      for (const r of rows) {
        if (r.uid === sec.uid) continue;
        const d = distM(sec.lon, sec.lat, r.lon, r.lat);
        const mask = this._maskBetween(sec, r, sec.rings.effectiveKg);
        r.secondary = (r.secondary ?? 0) + shotDamage(d, sec.rings.effectiveKg, r.capKpa, mask);
      }
    }
    for (const r of rows) {
      r.cumulative += r.secondary ?? 0;
      r.grade = gradeFromDamage(r.cumulative);
    }
    this.rows = rows;
    this._buildFeedback();
    this._drawTargetRings();
  }

  /**
   * 유폭할 탄약고를 찾는다.
   *
   * 조건은 **완파**다(누적 손상 1 이상). 중파에서도 화재로 유폭할 수 있지만, 그것을
   * 기준으로 삼으면 판정이 지나치게 공격적이 된다 — 보수적으로 잡아 두는 편이
   * 「이 정도면 유폭한다」는 진술을 믿게 만든다.
   *
   * 연쇄는 한 단계에서 끊는다. 2차 폭발이 다른 탄약고를 또 터뜨리는 계산까지 하면
   * 결과가 어디서 왔는지 사람이 따라갈 수 없다.
   */
  _findSecondaries(rows) {
    const placer = this.ctx.state?.placer;
    if (!placer) return [];
    const out = [];
    for (const r of rows) {
      if (r.kind !== '시설' || r.cumulative < 1) continue;
      // 이 탄약고가 화력 임무의 이전 발에서 이미 완파(≥1) 상태였다면 이미 유폭했다 —
      // 여기서 또 터뜨리면 뒤 발마다 같은 2차 폭발이 옆 동에 거듭 쌓인다.
      if ((this.missionBase.get(r.uid) ?? 0) >= 1) continue;
      const item = placer.items?.find((x) => x.uid === r.uid);
      if (!item || item.spec?.id !== 'storage-zone') continue;
      const tons = Number(item.details?.['저장용량'] ?? item.details?.capacityTon ?? 50);
      const newKg = magazineNewKg(Number.isFinite(tons) ? tons : 50);
      if (!(newKg > 0)) continue;
      // 완파에 이른 시각 = 누적이 1 을 넘긴 그 발의 탄착 시각.
      // 화력 임무에서는 이전 발이 이미 낸 손상(missionBase)에서부터 더해 나가야
      // 「이번 발 몇 번째에 마저 부서졌는가」가 정확해진다.
      let acc = this.missionBase.get(r.uid) ?? 0;
      let atS = this.timeline.impactS;
      for (let i = 0; i < this.shots.length; i++) {
        acc += r.perShot[i] ?? 0;
        if (acc >= 1) { atS = this.shots[i].at; break; }
      }
      out.push({
        uid: r.uid, name: r.name, lon: r.lon, lat: r.lat, tons, newKg,
        atS: atS + MAGAZINE_DELAY_S, rings: magazineRings(newKg),
      });
    }
    return out;
  }

  /**
   * 지형 표고 한 점 — 렌더된 지형에서 동기로 읽는다.
   *
   * `globe.getHeight` 는 **지금 메모리에 올라온 타일**에서만 답한다. 카메라가 그
   * 지역을 보고 있으면 늘 있고, 없으면 null 이다. 없을 때는 차폐를 계산하지 않는다 —
   * 모르는 것을 「가림 없음」으로 두는 쪽이, 없는 능선을 지어내는 것보다 안전하다
   * (자유장은 언제나 보수적으로 큰 답을 낸다).
   */
  _groundAt(lon, lat) {
    const rt = this.ctx.state?.realTerrain;
    if (rt?.active && rt.surfaceReady) {
      const h = rt.surfaceHeightAt(lon, lat);
      if (Number.isFinite(h)) return h;
    }
    const c = Cesium.Cartographic.fromDegrees(lon, lat);
    const h = this.viewer.scene.globe.getHeight(c);
    return Number.isFinite(h) ? h : null;
  }

  /**
   * 폭심 → 표적 사이 지형 차폐의 **압력 배율** (0.063 ~ 1).
   *
   * 능선 반대 사면에 둔 시설이 정면에 둔 시설과 같은 피해를 받는다면 이 화면을 보고
   * 배치를 고칠 이유가 없다. 두 점을 잇는 직선 아래로 지형이 솟아 있으면 그 마루를
   * 돌아가는 경로차를 재어 Maekawa 회절 감쇠를 먹인다.
   */
  _maskBetween(from, to, effectiveKg, burstAgl = 0) {
    const span = distM(from.lon, from.lat, to.lon, to.lat);
    if (!(span > 8)) return 1;
    const n = Math.max(8, Math.min(24, Math.round(span / 12)));
    const samples = [];
    for (let i = 0; i <= n; i++) {
      const f = i / n;
      const g = this._groundAt(from.lon + (to.lon - from.lon) * f,
        from.lat + (to.lat - from.lat) * f);
      if (g === null) return 1;                 // 타일이 없으면 자유장(보수적)
      samples.push(g);
    }
    const burstH = samples[0] + burstAgl + 0.8;         // 폭심은 지표 바로 위
    const targetH = samples[n] + 3.0;                    // 표적은 구조물 중간 높이쯤
    const delta = pathDifferenceM(samples, burstH, targetH, span);
    return maskFactorFromPathDiff(delta, effectiveKg);
  }

  /**
   * 데미지 넘버와 전투 로그를 **미리 전부 계산해 둔다.**
   *
   * 발이 떨어질 때 이벤트를 「발생시키는」 방식이면 재생 막대를 되감았을 때 다시
   * 나오지 않거나 두 번 나온다. 계획이 정해지는 순간 전체 목록을 만들어 두고 t 로
   * 잘라 보여 주면, 어디로 감아도 같은 화면이 나온다.
   */
  _buildFeedback() {
    this.hits = [];
    this.logEvents = [];
    if (!this.rows.length || !this.shots.length) {
      this.feed.setEvents([]);
      return;
    }
    const order = { intact: 0, scarred: 1, heavy: 2, ruin: 3 };
    const STAGE_KIND = { scarred: 'light', heavy: 'severe', ruin: 'destroyed' };

    for (const r of this.rows) {
      let acc = 0;
      let stage = 'intact';
      const topH = r.topH ?? ((this.plan.impact.groundH ?? 0) + 20);
      // ── 발마다: 이 표적이 얼마를 맞았는가 ──
      for (let i = 0; i < this.shots.length; i++) {
        const d = r.perShot[i] ?? 0;
        if (d > 0.008) {
          const pct = Math.min(999, Math.round(d * 100));
          this.hits.push({
            at: this.shots[i].at + 0.25, lon: r.lon, lat: r.lat, h: topH,
            text: `−${pct}%`,
            color: d >= 0.5 ? GRADE_COLOR.destroyed : d >= 0.2 ? GRADE_COLOR.severe
              : d >= 0.06 ? GRADE_COLOR.moderate : GRADE_COLOR.light,
            big: d >= 0.35,
          });
        }
        acc += d;
        const next = stageOf(acc);
        if (order[next] > order[stage]) {
          stage = next;
          this.logEvents.push({
            at: this.shots[i].at + 0.4,
            kind: STAGE_KIND[stage] ?? 'light',
            color: GRADE_COLOR[gradeFromDamage(acc)],
            text: `${r.name} — ${STAGE_LABEL[stage]} (HP ${Math.round(hpOf(acc) * 100)}%)`,
          });
        }
      }
      // ── 유폭이 준 몫 ──
      for (const sec of this.secondaries ?? []) {
        if (sec.uid === r.uid || !(r.secondary > 0.008)) continue;
        const pct = Math.min(999, Math.round(r.secondary * 100));
        this.hits.push({
          at: sec.atS + 0.3, lon: r.lon, lat: r.lat, h: topH,
          text: `−${pct}%`, color: '#d98cff', big: r.secondary >= 0.35,
        });
        acc += r.secondary;
        const next = stageOf(acc);
        if (order[next] > order[stage]) {
          stage = next;
          this.logEvents.push({
            at: sec.atS + 0.5, kind: STAGE_KIND[stage] ?? 'light',
            color: '#d98cff',
            text: `${r.name} — ${STAGE_LABEL[stage]} (유폭 여파)`,
          });
        }
      }
    }

    // ── 탄착과 유폭 그 자체 ──
    for (const sh of this.shots) {
      this.logEvents.push({
        at: sh.at, kind: 'impact', color: '#ffd08a',
        text: `${this.plan.munition.short} ${sh.n}발째 탄착 — 편차 ${sh.missM.toFixed(1)}m`,
      });
    }
    for (const sec of this.secondaries ?? []) {
      this.logEvents.push({
        at: sec.atS, kind: 'magazine', color: '#d98cff',
        text: `탄약고 유폭 — ${sec.name} · TNT 환산 ${Math.round(sec.newKg).toLocaleString()}kg`,
      });
    }
    this.logEvents.push({
      at: this.timeline.impactS + 6, kind: 'done', color: '#9fb4c2',
      text: '피해 판정 확정',
    });
    this.feed.setEvents(this.logEvents);
  }

  /** 시각 t 까지의 누적 손상 (대상 uid → 0~). 발마다 1.7 초에 걸쳐 차오른다. */
  _damageAt(t) {
    const out = new Map();
    for (const r of this.rows) {
      // 화력 임무 — 이전 발들이 낸 손상은 이미 벌어진 일이므로 시각과 무관하게 그대로 유지한다.
      let d = this.missionBase.get(r.uid) ?? 0;
      for (let i = 0; i < this.shots.length; i++) {
        const age = t - this.shots[i].at;
        if (age <= 0) continue;
        d += (r.perShot[i] ?? 0) * smooth(Math.min(1, (age - 0.1) / 1.7));
      }
      // 2차 유폭은 그 시각이 지나야 더해진다 — 그래야 화면에서 「탄약고가 터지면서
      // 옆 동이 같이 무너지는」 순서가 눈에 보인다.
      for (const sec of this.secondaries ?? []) {
        if (sec.uid === r.uid) continue;
        const age = t - sec.atS;
        if (age <= 0) continue;
        d += (r.secondary ?? 0) * smooth(Math.min(1, (age - 0.1) / 1.7));
      }
      out.set(r.uid, d);
    }
    return out;
  }

  // ═══════════════ 탄착점 지정 ═══════════════

  _installPicker() {
    this.handler = new Cesium.ScreenSpaceEventHandler(this.viewer.canvas);
    this.handler.setInputAction((ev) => {
      if (!this.designating) return;
      const p = this._pickGround(ev.position);
      if (!p) { this.ctx.toast?.('지형을 찍지 못했습니다 — 지도 안쪽을 다시 눌러 주세요'); return; }
      // 계획 모드(연속 지정)에서는 클릭할 때마다 무장을 풀지 않는다 — 다음 클릭도 바로 받는다.
      if (!this._designateContinuous) {
        this.designating = false;
        this.viewer.canvas.style.cursor = '';
      }
      this.ctx.onPick?.({ ...p, kind: this._designateKind });
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK);
    this.handler.setInputAction((mv) => {
      if (!this.designating) return;
      const p = this._pickGround(mv.endPosition);
      if (p) this.ctx.onHover?.(p);
    }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);
  }

  /** 화면 좌표 → 지형 위 한 점 (렌더 지형 우선, 없으면 지구 표면). */
  _pickGround(windowPos) {
    const scene = this.viewer.scene;
    const rt = this.ctx.state?.realTerrain;
    let cart = null;
    if (rt?.active && scene.pickPositionSupported) {
      // globe.pick 은 보이지도 않는 라이브 지형과 광선을 맞춰 위경도 자체가
      // 어긋난다(경사면일수록 커짐) — 실제로 그려진 표면(GLB 포함)의 깊이버퍼를
      // 그대로 읽는 pickPosition 이라야 화면에서 가리킨 지점과 일치한다.
      cart = scene.pickPosition(windowPos);
    } else {
      const ray = this.viewer.camera.getPickRay(windowPos);
      cart = ray && scene.globe.pick(ray, scene);
    }
    if (!cart) return null;
    const c = Cesium.Cartographic.fromCartesian(cart);
    const lon = Cesium.Math.toDegrees(c.longitude);
    const lat = Cesium.Math.toDegrees(c.latitude);
    // GP 정밀지형(GLB)이 켜져 있으면 그 표면고가 진짜 지면이다
    let h = c.height;
    if (rt?.active && rt.surfaceReady) {
      const sh = rt.surfaceHeightAt(lon, lat);
      if (Number.isFinite(sh)) h = sh;
    }
    return { lon, lat, groundH: h };
  }

  /**
   * @param kind 'impact'(타격 지점, 기본) | 'platform'(발사대·무기 위치) — 다음 클릭이 무엇을 지정하는지
   * @param opts.continuous true 면 클릭해도 무장이 풀리지 않는다 — 타격 계획 모드(여러 발을 잇달아 찍을 때) 용.
   */
  beginDesignate(kind = 'impact', opts = {}) {
    this._designateKind = kind;
    this._designateContinuous = !!opts.continuous;
    this.designating = true;
    this.viewer.canvas.style.cursor = 'crosshair';
  }

  cancelDesignate() {
    this.designating = false;
    this._designateContinuous = false;
    this.viewer.canvas.style.cursor = '';
  }

  // ═══════════════ 정적 도형 ═══════════════

  _clearStatic() {
    for (const e of [...this.ds.entities.values]) {
      if (String(e.id).startsWith('sk-static-')) this.ds.entities.remove(e);
    }
  }

  _rebuildStatic() {
    this._clearStatic();
    const plan = this.plan;
    if (!plan?.impact || !this.rings) return;
    const { lon, lat, groundH } = plan.impact;
    const R = this.rings;
    let n = 0;
    const add = (o) => this.ds.entities.add({ id: `sk-static-${n++}`, ...o });
    // GP 정밀지형(globe.show=false)에서는 classificationType/clampToGround 가
    // (globe.pick 과 같은 이유로) 아예 접지되지 않는다 — 이미 계산해 둔 groundH를
    // 그대로 평평하게 박아 넣는 쪽으로 대체한다(피해원반 반경대엔 절대오차가 문제되지 않음).
    const rtActive = !!(this.ctx.state?.realTerrain?.active && this.ctx.state?.realTerrain?.surfaceReady);

    // ── 발사대(무기) 위치 — 지정했으면 표적까지 점선으로 잇는다 ──
    // 실제 발사거리(수~수백 km)를 그대로 그리면 화면이 의미 없어지므로, 표시는
    // 지도 축척 그대로 두고 진입 방위(azDeg)만 이 위치에서 계산해 둔다.
    if (plan.platform) {
      const pg = plan.platform.groundH ?? groundH;
      add({
        billboard: {
          image: this.sprites.waypoint, width: 28, height: 28,
          color: css('#ffcf5c'),
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
        },
        position: D(plan.platform.lon, plan.platform.lat, pg + 1),
        label: {
          text: '발사대',
          font: '700 11px "Pretendard GOV", sans-serif',
          fillColor: css('#ffcf5c'),
          showBackground: true, backgroundColor: css('#1a1204').withAlpha(0.85),
          backgroundPadding: new Cesium.Cartesian2(6, 3),
          pixelOffset: new Cesium.Cartesian2(0, -20),
          verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
          scaleByDistance: new Cesium.NearFarScalar(400, 1.0, 9000, 0.55),
          distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 14000),
        },
      });
      add({
        polyline: {
          positions: [D(plan.platform.lon, plan.platform.lat, pg + 1), D(lon, lat, groundH + 1)],
          width: 1.6, clampToGround: false,
          material: new Cesium.PolylineDashMaterialProperty({
            color: css('#ffcf5c').withAlpha(0.6), dashLength: 14,
          }),
        },
      });
    }

    // ── 피해 원반 (지형 클램프 면) — 큰 것부터 깔고 zIndex 로 순서를 못 박는다 ──
    for (const z of ZONE_STYLE) {
      const r = z.key === 'frag' ? R.frag : R[z.key];
      if (!(r > 0.5)) continue;
      add({
        position: D(lon, lat, groundH),
        ellipse: {
          semiMajorAxis: r, semiMinorAxis: r,
          material: css(z.color).withAlpha(z.fill),
          ...(rtActive ? {} : { classificationType: Cesium.ClassificationType.TERRAIN }),
          zIndex: z.zIndex,
        },
      });
      add({
        polyline: {
          positions: circlePositions(lon, lat, r, groundH),
          width: z.width,
          clampToGround: !rtActive,
          material: new Cesium.PolylineOutlineMaterialProperty({
            color: css(z.color).withAlpha(0.92),
            outlineColor: css('#05090d').withAlpha(0.55),
            outlineWidth: 1,
          }),
        },
      });
      // 반경 라벨은 진입 방위 반대쪽(탄이 오지 않는 쪽)에 세워 항적과 겹치지 않게
      const lp = offset(lon, lat, (plan.azDeg + 118) % 360, r);
      add({
        position: D(lp.lon, lp.lat, groundH + 2),
        label: {
          text: `${z.label} ${Math.round(r)}m`,
          font: '600 11px "Pretendard GOV", sans-serif',
          fillColor: css(z.color),
          showBackground: true,
          backgroundColor: css('#070d12').withAlpha(0.78),
          backgroundPadding: new Cesium.Cartesian2(6, 3),
          verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
          scaleByDistance: new Cesium.NearFarScalar(400, 1.0, 9000, 0.55),
          distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 14000),
        },
      });
    }

    // ── 탄공 그을음: 클램프 원반 3 겹으로 방사 감쇠를 낸다 ──
    if (R.crater > 0) {
      const shades = [[1.0, 0.80], [1.95, 0.44], [3.3, 0.18]];
      for (let i = shades.length - 1; i >= 0; i--) {
        const [k, a] = shades[i];
        add({
          position: D(lon, lat, groundH),
          ellipse: {
            semiMajorAxis: R.crater * k, semiMinorAxis: R.crater * k,
            material: css('#14100c').withAlpha(a),
            ...(rtActive ? {} : { classificationType: Cesium.ClassificationType.TERRAIN }),
            zIndex: 10 + (shades.length - i),
          },
        });
      }
    }

    // ── CEP 산포원 — 부드럽게 번지는 HUD 링 + 회전하는 스캔 바늘 ──
    const cepR = Math.max(1.5, plan.munition.cepM);
    add({
      polyline: {
        positions: circlePositions(lon, lat, cepR, groundH, 64),
        width: 2.4, clampToGround: !rtActive,
        material: new Cesium.PolylineGlowMaterialProperty({
          glowPower: 0.22, taperPower: 1.0, color: css('#ffd984').withAlpha(0.88),
        }),
      },
    });
    // 레이더 스캔처럼 원 안을 도는 바늘 — 「이 안 어딘가에 떨어진다」는 확률 표현에 생동감을 준다
    add({
      polyline: {
        positions: new Cesium.CallbackProperty(() => {
          const ang = ((performance.now() / 2600) % 1) * 360;
          const p = offset(lon, lat, ang, cepR);
          return [D(lon, lat, groundH + 0.6), D(p.lon, p.lat, groundH + 0.6)];
        }, false),
        width: 2, arcType: Cesium.ArcType.NONE,
        material: new Cesium.PolylineGlowMaterialProperty({
          glowPower: 0.32, color: css('#ffe9b8').withAlpha(0.6),
        }),
      },
    });

    // ── 종말유도 진입 경로 — 탄착점 쪽으로 가늘어지는 유도빔 ──
    //
    // 이 빔은 **조준 보조**다. 마지막 탄이 떨어지고 나면 가리켜야 할 것이 없으므로
    // 꺼진다 — 남겨 두면 폭발 뒤 화면을 세로로 가르는 흰 기둥이 되어, 실제로
    // 「저 광선이 뭐냐」는 물음을 먼저 받게 된다.
    this._beamEnts = [];
    const beam = (o) => { const e = add(o); this._beamEnts.push(e); return e; };
    const slant = entrySlantM(plan.munition);
    const dip = plan.munition.dipDeg * D2R;
    const ground = Math.cos(dip) * slant;
    const up = Math.sin(dip) * slant;
    // `azDeg` 는 **탄이 날아오는 쪽**(위협 방위)이다. 그러므로 진입점은 탄착점에서
    // 그 방위로 떨어진 자리에 있다. 예전에는 여기에 +180 을 넣어 두어, 「위협 방위
    // 340°(북서)」로 잡아도 탄이 남쪽(아군 후방)에서 날아왔다 — 화면과 글이 정반대였다.
    const entry = offset(lon, lat, plan.azDeg, ground);
    this._entry = { lon: entry.lon, lat: entry.lat, h: groundH + up };
    // 후광(굵고 흐림) + 코어(가늘고 밝음) 두 겹 — 얇은 단색 점선보다 훨씬 「빔」답게 읽힌다
    beam({
      polyline: {
        positions: [D(entry.lon, entry.lat, groundH + up), D(lon, lat, groundH + 1)],
        width: 9, arcType: Cesium.ArcType.NONE,
        material: new Cesium.PolylineGlowMaterialProperty({
          glowPower: 0.35, taperPower: 0.38, color: css('#6fd6f2').withAlpha(0.35),
        }),
      },
    });
    beam({
      polyline: {
        positions: [D(entry.lon, entry.lat, groundH + up), D(lon, lat, groundH + 1)],
        width: 2.6, arcType: Cesium.ArcType.NONE,
        material: new Cesium.PolylineGlowMaterialProperty({
          glowPower: 0.22, taperPower: 0.45, color: css('#d7f4ff').withAlpha(0.95),
        }),
      },
    });
    // 진입점에서 탄착점으로 흘러가는 에너지 펄스 — 하나가 아니라 꼬리를 끄는 혜성 무리로
    // 흘려보낸다. 재생 전에도 「이쪽에서 온다」가 정적인 점선보다 훨씬 또렷하게 읽힌다.
    const PULSE_N = 5;
    for (let i = 0; i < PULSE_N; i++) {
      const phase = i / PULSE_N;
      const sz = 17 - i * 2.2;
      beam({
        position: new Cesium.CallbackProperty(() => {
          // 33 ms 단위로 끊는다 — 30 Hz 면 흐르는 것으로 보이고, 그 사이 프레임에는
          // 같은 좌표가 나가 Cesium 이 아무 일도 하지 않는다
          const u = ((Math.round(performance.now() / 33) * 33 / 1500) + phase) % 1;
          return D(
            entry.lon + (lon - entry.lon) * u,
            entry.lat + (lat - entry.lat) * u,
            (groundH + up) + ((groundH + 1) - (groundH + up)) * u,
          );
        }, false),
        billboard: {
          image: this.sprites.core, width: sz, height: sz,
          color: css('#c8f0ff').withAlpha(0.92 - i * 0.16),
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
        },
      });
    }
    // 유도 회랑 — 진입점 좌우로 살짝 벌린 보조선 두 가닥이 탄착점에서 모인다.
    // 선 하나가 아니라 「폭이 있는 통로」로 읽히게 하는 것이 목적이다.
    const corridorAz = (plan.azDeg + 90) % 360;
    const corridorSpread = Math.max(9, ground * 0.045);
    for (const side of [-1, 1]) {
      const flank = offset(entry.lon, entry.lat, corridorAz, side * corridorSpread);
      beam({
        polyline: {
          positions: [D(flank.lon, flank.lat, groundH + up), D(lon, lat, groundH + 1)],
          width: 1.2, arcType: Cesium.ArcType.NONE,
          material: new Cesium.PolylineGlowMaterialProperty({
            glowPower: 0.15, taperPower: 0.28, color: css('#7fd4e8').withAlpha(0.3),
          }),
        },
      });
    }
    beam({
      position: D(entry.lon, entry.lat, groundH + up),
      billboard: {
        image: this.sprites.waypoint, width: 30, height: 30,
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
        scaleByDistance: new Cesium.NearFarScalar(500, 1.0, 16000, 0.5),
      },
      label: {
        text: `종말유도 진입 · 위협방위 ${Math.round(plan.azDeg)}° · 고도 ${Math.round(up)}m`,
        font: '600 11px "Pretendard GOV", sans-serif',
        fillColor: css('#c8f0ff'),
        showBackground: true, backgroundColor: css('#07131a').withAlpha(0.82),
        backgroundPadding: new Cesium.Cartesian2(7, 4),
        pixelOffset: new Cesium.Cartesian2(0, -18),
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
        distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 30000),
      },
    });

    // ── 탄약고 유폭 반경 ──
    //
    // 1 차 타격의 원과 **다른 색·다른 선**으로 그린다. 둘이 같아 보이면 「저 큰 원은
    // 어느 탄에서 나왔나」를 화면만 보고 알 수 없다. 유폭은 내가 쏜 것이 아니라
    // 내 배치가 만든 결과이므로, 그 사실이 눈에 구분되어야 배치를 고칠 생각이 든다.
    for (const sec of this.secondaries ?? []) {
      const SEC = [
        ['light', sec.rings.light, 0.07], ['moderate', sec.rings.moderate, 0.10],
        ['severe', sec.rings.severe, 0.14], ['complete', sec.rings.complete, 0.20],
      ];
      for (const [key, rad, fill] of SEC) {
        if (!(rad > 1)) continue;
        add({
          position: D(sec.lon, sec.lat, groundH),
          ellipse: {
            semiMajorAxis: rad, semiMinorAxis: rad,
            material: css('#c964f0').withAlpha(fill),
            ...(rtActive ? {} : { classificationType: Cesium.ClassificationType.TERRAIN }),
            zIndex: key === 'complete' ? 9 : 6,
          },
        });
        add({
          polyline: {
            positions: circlePositions(sec.lon, sec.lat, rad, groundH),
            width: 2.2, clampToGround: !rtActive,
            material: new Cesium.PolylineDashMaterialProperty({
              color: css('#d98cff').withAlpha(0.9), dashLength: 12,
            }),
          },
        });
      }
      add({
        position: D(sec.lon, sec.lat, groundH + 34),
        billboard: {
          image: this.sprites.cross, scale: 0.5, color: css('#d98cff'),
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
        },
        label: {
          text: `⚠ 탄약고 유폭 — ${String(sec.name ?? '')}\n저장 ${Math.round(sec.tons)}t`
            + ` → TNT 환산 ${Math.round(sec.newKg).toLocaleString()}kg\n`
            + `완파 ${Math.round(sec.rings.complete)}m · 유리 ${Math.round(sec.rings.light)}m`,
          font: '700 12px "Pretendard GOV", sans-serif',
          fillColor: css('#efc8ff'),
          showBackground: true, backgroundColor: css('#1b0a24').withAlpha(0.9),
          backgroundPadding: new Cesium.Cartesian2(9, 6),
          pixelOffset: new Cesium.Cartesian2(0, 20),
          verticalOrigin: Cesium.VerticalOrigin.TOP,
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
          distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 24000),
        },
      });
    }

    // ── 발마다의 실제 탄착점 ──
    //
    // 조준점(가운데 표주)과 **탄착점**은 다르다. CEP 만큼 흩어진 그 점들이 화면에
    // 찍혀야 「한 점에 몇 발을 넣는다」는 계획이 실제로 어떤 모양인지 보인다.
    if (this.shots.length > 1) {
      for (const sh of this.shots) {
        add({
          position: D(sh.lon, sh.lat, groundH + 1),
          point: {
            pixelSize: 6, color: css('#ffd08a').withAlpha(0.9),
            outlineColor: css('#2a1607'), outlineWidth: 1.5,
            heightReference: rtActive ? Cesium.HeightReference.NONE : Cesium.HeightReference.CLAMP_TO_GROUND,
            disableDepthTestDistance: Number.POSITIVE_INFINITY,
            distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 9000),
          },
          label: {
            text: `${sh.n}`,
            font: '700 10px "Chakra Petch", sans-serif',
            fillColor: css('#ffe3a8'),
            pixelOffset: new Cesium.Cartesian2(9, -8),
            disableDepthTestDistance: Number.POSITIVE_INFINITY,
            distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 4000),
          },
        });
      }
    }

    // ── 탄착점 표주 ──
    const poleTop = groundH + Math.max(45, R.light * 0.42);
    add({
      polyline: {
        positions: [D(lon, lat, groundH), D(lon, lat, poleTop)],
        width: 2.6, arcType: Cesium.ArcType.NONE,
        material: new Cesium.PolylineGlowMaterialProperty({
          glowPower: 0.28, color: css('#f6c76a').withAlpha(0.9),
        }),
      },
    });
    add({
      position: D(lon, lat, poleTop),
      billboard: {
        image: this.sprites.cross, scale: 0.62,
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
        scaleByDistance: new Cesium.NearFarScalar(500, 0.85, 16000, 0.42),
      },
      label: {
        text: `탄착 지정점\n${plan.impact.mgrs ?? ''}\n표고 ${Math.round(groundH)}m · ${plan.munition.short}/${plan.fuze.name.split(' ')[0]}`,
        font: '600 11px "Pretendard GOV", sans-serif',
        fillColor: css('#ffe3a8'),
        showBackground: true, backgroundColor: css('#120c05').withAlpha(0.86),
        backgroundPadding: new Cesium.Cartesian2(8, 5),
        pixelOffset: new Cesium.Cartesian2(0, 22),
        verticalOrigin: Cesium.VerticalOrigin.TOP,
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
        distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 30000),
      },
    });

    // ── 지표 락온 브래킷 — 숨쉬듯 커졌다 작아지는 사각 조준틀로 「고정된 표적」을 말한다 ──
    add({
      position: D(lon, lat, groundH + 0.4),
      billboard: {
        image: this.sprites.lockBracket,
        // 1 px 단위로 끊는다 — 그 아래 차이는 안 보이는데 갱신 비용은 그대로 든다
        width: new Cesium.CallbackProperty(() => bracketSize(), false),
        height: new Cesium.CallbackProperty(() => bracketSize(), false),
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
        scaleByDistance: new Cesium.NearFarScalar(300, 1.0, 12000, 0.4),
      },
    });
    // 표적 핑 — 탄착점에서 잔잔히 퍼져 나가는 두 겹의 고리. 레이더 조준을 유지하고
    // 있다는 느낌을 준다 (재생과 무관 — 순수 대기 상태 연출).
    //
    // **빌보드로 그린다.** 전에는 반경이 콜백인 `ellipse` 두 개였는데, 그러면 Cesium 이
    // 매 프레임 지오메트리를 다시 굽는다 — 탄착점을 찍기만 해도 60 fps 가 21 fps 로
    // 떨어졌다. 빌보드는 사각형 하나라 크기를 아무리 흔들어도 다시 굽지 않는다.
    // 크기는 0.5 m 단위로 끊는다: 그 아래는 눈에 안 보이는데, 값이 바뀔 때마다
    // Cesium 이 갱신 경로를 한 번씩 더 탄다.
    for (let i = 0; i < 2; i++) {
      const phase = i * 0.5;
      add({
        position: D(lon, lat, groundH + 0.5),
        billboard: {
          image: this.sprites.ring,
          sizeInMeters: true,
          width: new Cesium.CallbackProperty(() => pingSize(phase), false),
          height: new Cesium.CallbackProperty(() => pingSize(phase), false),
          color: new Cesium.CallbackProperty(() => pingColor(phase), false),
          distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 14000),
        },
      });
    }
  }

  /** 판정 대상 고리 — 등급이 바뀌면 색과 글이 같이 바뀐다. */
  _drawTargetRings() {
    for (const e of [...this.ds.entities.values]) {
      const id = String(e.id);
      if (id.startsWith('sk-tgt-') || id.startsWith('sk-hp-')) this.ds.entities.remove(e);
    }
    this._hpCache = new Map();
    if (!this.plan?.impact) return;
    const rtActive = !!(this.ctx.state?.realTerrain?.active && this.ctx.state?.realTerrain?.surfaceReady);
    for (const r of this.rows) {
      if (r.grade === 'none') continue;
      const color = GRADE_COLOR[r.grade];
      const ringR = r.kind === '시설' ? 11 : 7;
      this.ds.entities.add({
        id: `sk-tgt-${r.uid}`,
        polyline: {
          positions: circlePositions(r.lon, r.lat, ringR, r.groundH ?? this.plan.impact.groundH ?? 0, 40),
          width: 2.4, clampToGround: !rtActive,
          material: new Cesium.PolylineOutlineMaterialProperty({
            color: css(color).withAlpha(0.95),
            outlineColor: css('#04080b').withAlpha(0.6), outlineWidth: 1,
          }),
        },
      });
      // ── 머리 위 HP 막대 ──
      // 패널 표 안에만 HP 가 있으면 지도를 보는 동안에는 보이지 않는다. 「몇 발까지
      // 버티는가」가 이 화면의 핵심이므로 그 수는 구조물 위에 떠 있어야 한다.
      this.ds.entities.add({
        id: `sk-hp-${r.uid}`,
        position: D(r.lon, r.lat, r.topH ?? ((this.plan.impact.groundH ?? 0) + 26)),
        billboard: {
          image: this.sprites.core,          // 첫 프레임에 _updateBuildings 가 갈아 끼운다
          width: 206, height: 59,
          verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
          scaleByDistance: new Cesium.NearFarScalar(260, 1.0, 7000, 0.40),
          distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 9000),
        },
      });

      // 라벨을 전부 붙이면 탄착점 둘레가 글씨로 덮여 정작 폭발이 안 보인다.
      // 중파 이상만 이름을 달고, 경파·유리는 색 고리로만 말한다(표는 패널에 있다).
      if (r.grade !== 'destroyed' && r.grade !== 'severe') continue;
      this.ds.entities.add({
        id: `sk-tgt-${r.uid}-l`,
        position: D(r.lon, r.lat, (this.plan.impact.groundH ?? 0) + 26),
        label: {
          text: `${r.name}\n${GRADE_LABEL[r.grade]} · ${Math.round(r.distM)}m`
            + (r.endurance?.p90 ? ` · ${r.endurance.p90}발` : ''),
          font: '700 11px "Pretendard GOV", sans-serif',
          fillColor: css(color),
          showBackground: true, backgroundColor: css('#060b0f').withAlpha(0.86),
          backgroundPadding: new Cesium.Cartesian2(7, 4),
          verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
          scaleByDistance: new Cesium.NearFarScalar(400, 1.0, 9000, 0.5),
          distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 12000),
        },
      });
    }
  }

  // ═══════════════ 동적 도형 ═══════════════

  _buildDynamic() {
    const hidden = { show: false };
    // 연기·먼지는 지형 뒤에 숨어야 한다 — 능선 너머 폭발이 능선을 뚫고 보이면 안 된다.
    // 그래서 깊이검사를 끄지 않는다(라벨만 끈다).
    const bill = (image, color) => ({
      billboard: { image, sizeInMeters: true, width: 1, height: 1, color },
      ...hidden,
    });
    const many = (n, image, color) => {
      const out = [];
      for (let i = 0; i < n; i++) out.push(this.ds.entities.add(bill(image, color)));
      return out;
    };

    // ── 섬광 · 후광 ──
    this.flash = this.ds.entities.add(bill(this.sprites.core, css('#ffd9a0')));
    // 후광은 화구를 **찾게** 해 주는 연출 요소다. 실척 화구는 멀리서 사라지지만
    // 후광에는 화면 최소 크기가 걸려 있어 어느 거리에서도 「저기서 터졌다」가 읽힌다.
    this.glow = this.ds.entities.add(bill(this.sprites.glow, css('#ffb257')));

    // ── 화구 2 겹: 안쪽 고온 코어 + 바깥 냉각 껍질 ──
    this.fireball = this.ds.entities.add({
      ellipsoid: { radii: new Cesium.Cartesian3(1, 1, 1), material: css('#ffb457').withAlpha(0.85) },
      show: false,
    });
    this.fireshell = this.ds.entities.add({
      ellipsoid: {
        radii: new Cesium.Cartesian3(1, 1, 1), material: css('#c2481a').withAlpha(0.4),
        slicePartitions: 20, stackPartitions: 12,
      },
      show: false,
    });

    // ── 충격파 돔 ──
    // 테두리를 넣지 않는다 — 와이어프레임 구가 능선을 덮어 화면이 뿌옇게 된다.
    // 「지금 충격파가 어디까지 갔는가」는 아래 지표 고리가 훨씬 정확히 말해 준다.
    this.shock = this.ds.entities.add({
      ellipsoid: {
        radii: new Cesium.Cartesian3(1, 1, 1), material: css('#dfefff').withAlpha(0.07),
        slicePartitions: 24, stackPartitions: 14,
      },
      show: false,
    });

    // ── 지표 충격파 고리 ──
    //
    // Cesium 의 `ellipse.outlineWidth` 는 대부분의 장비(ANGLE)에서 1 px 로 잘린다.
    // 그래서 확장하는 굵은 고리는 **원둘레에 빌보드를 늘어놓아** 만든다 — 조각 크기를
    // 둘레/개수보다 크게 잡아 서로 겹치게 하면 끊긴 데 없는 띠가 된다. 앞이 압축된
    // 흰 전선(前線), 뒤가 말려 올라오는 흙먼지다.
    this.shockRing = many(SHOCK_N, this.sprites.puff[0], css('#e9f3ff'));
    this.dragRing = many(SHOCK_N, this.sprites.puff[2], css('#8a7a5e'));

    // ── 연기 기둥: 몸통 + 퍼지는 갓 ──
    this.stem = many(STEM_N, this.sprites.puff[1], css('#3d372f'));
    this.cap = many(CAP_N, this.sprites.puff[3], css('#4a4239'));

    // ── 폭심 둘레 먼지 치마 ──
    this.dust = many(DUST_N, this.sprites.puff[2], css('#8a7c62'));

    // ── 잔류 화재 ──
    this.fires = many(FIRE_N, this.sprites.flame, css('#ff8a2a'));

    // ── 파편·불티 ──
    this.frags = [];
    for (let i = 0; i < FRAG_N; i++) {
      this.frags.push(this.ds.entities.add({
        point: { pixelSize: 3.4, color: css('#ffcf8a') },
        show: false,
      }));
    }

    // ── 탄체 항적·화염·계기 ──
    this.trail = this.ds.entities.add({
      polyline: {
        positions: [], width: 3, arcType: Cesium.ArcType.NONE,
        material: new Cesium.PolylineGlowMaterialProperty({
          color: css('#ffb271').withAlpha(0.85), glowPower: 0.28,
        }),
      },
      show: false,
    });
    // 모터 화염 — 탄체는 실척(3 m)이라 100 m 밖에서는 40 px 짜리 점이다. 그 점을
    // 눈으로 찾을 수 있게 하는 것이 이 빌보드다.
    this.plume = this.ds.entities.add(bill(this.sprites.core, css('#ffbe6a')));
    // 그리고 어느 거리에서도 「지금 탄이 어디쯤인가」는 읽혀야 한다 — 계기 표시.
    this.munMark = this.ds.entities.add({
      point: {
        pixelSize: 9, color: css('#ffd08a'), outlineColor: css('#2a1607'), outlineWidth: 2,
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
      },
      label: {
        text: '', font: '600 11px "Pretendard GOV", sans-serif',
        fillColor: css('#ffd9a4'),
        showBackground: true, backgroundColor: css('#170d03').withAlpha(0.85),
        backgroundPadding: new Cesium.Cartesian2(6, 3),
        pixelOffset: new Cesium.Cartesian2(14, -12),
        horizontalOrigin: Cesium.HorizontalOrigin.LEFT,
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
      },
      show: false,
    });
  }

  /** 카메라에서 그 지점까지의 거리 (m) — 소리의 지연과 감쇠가 여기서 나온다. */
  _camDistTo(lon, lat, h) {
    return Cesium.Cartesian3.distance(
      D(lon, lat, h), this.viewer.camera.positionWC);
  }

  /** 이 프레임에서 화면 1 px 이 몇 m 인가 — 연출 요소의 최소 크기를 정하는 데 쓴다. */
  _metersPerPixel(worldPos) {
    const cam = this.viewer.camera;
    const d = Cesium.Cartesian3.distance(worldPos, cam.position);
    const h = this.viewer.scene.canvas.clientHeight || 800;
    const fovy = cam.frustum?.fovy ?? 1.05;
    return (2 * Math.tan(fovy / 2) * d) / Math.max(1, h);
  }

  /**
   * 연출 요소의 크기 (m).
   *
   * `fxScale` 이 숫자면 그 배수를 곱하고(사용자가 고른 과장), 'real' 이면 실척 그대로,
   * 'auto'(기본)면 **실척과 화면 최소 크기 중 큰 쪽**을 쓴다. 가까이서는 실척이 이기고,
   * 멀어지면 최소 크기가 이긴다 — 그래서 어느 거리에서도 폭발이 화면에 남는다.
   */
  _fx(worldPos, meters, minPx) {
    const mode = this.fxScale ?? 'auto';
    if (mode === 'real') return meters;
    if (typeof mode === 'number') return meters * mode;
    return Math.max(meters, this._metersPerPixel(worldPos) * minPx);
  }

  /** 연출 배율 — 'auto' | 'real' | 숫자 배수. 피해 반경·판정에는 영향이 없다. */
  setFxScale(mode) {
    this.fxScale = mode;
    this.particles.reset();
    this._fired.clear();
    this.update(this.t);
  }

  // ═══════════════ 3D 모델 ═══════════════

  async _ensureModels() {
    const token = ++this.modelToken;
    const scene = this.viewer.scene;
    const kill = (m) => { if (m && !m.isDestroyed?.()) scene.primitives.remove(m); };
    kill(this.models.munition);
    this.models.munition = null;
    const url = this.plan?.munition?.model;
    if (!url) return;
    try {
      const m = await Cesium.Model.fromGltfAsync({
        url, modelMatrix: Cesium.Matrix4.IDENTITY, id: { id: 'strike-munition' },
      });
      if (token !== this.modelToken) { kill(m); return; }
      m.show = false;
      // 데모 씬은 블룸(brightness −0.42) + HDR 로 PBR 이 눌린다 — 시설 스택과 같은 보정
      m.lightColor = new Cesium.Cartesian3(2.2, 2.2, 2.2);
      m.imageBasedLighting.imageBasedLightingFactor = new Cesium.Cartesian2(1.8, 1.8);
      scene.primitives.add(m);
      this.models.munition = m;
    } catch (e) { console.warn('[strike] 탄체 모델 로드 실패', url, e); }

    // 탄공은 **발수만큼** 필요하다 — 연속사격의 결과는 흩어진 탄공 무리다
    while (this.models.craters.length < MAX_ROUNDS) {
      try {
        const c = await Cesium.Model.fromGltfAsync({
          url: 'assets/models/mun_crater.glb', modelMatrix: Cesium.Matrix4.IDENTITY,
          id: { id: `strike-crater-${this.models.craters.length}` },
        });
        c.show = false;
        c.lightColor = new Cesium.Cartesian3(1.9, 1.9, 1.9);
        scene.primitives.add(c);
        this.models.craters.push(c);
      } catch (e) { console.warn('[strike] 탄공 모델 로드 실패', e); break; }
    }
    if (!this.models.rubble.length) {
      for (let i = 0; i < RUBBLE_N; i++) {
        try {
          const r = await Cesium.Model.fromGltfAsync({
            url: 'assets/models/mun_rubble.glb', modelMatrix: Cesium.Matrix4.IDENTITY,
            id: { id: `strike-rubble-${i}` },
          });
          r.show = false;
          r.lightColor = new Cesium.Cartesian3(1.9, 1.9, 1.9);
          scene.primitives.add(r);
          this.models.rubble.push(r);
        } catch (e) { console.warn('[strike] 잔해 모델 로드 실패', e); break; }
      }
    }
  }

  /**
   * 탄체 자세 — ENU 에서 rotZ(90°−방위) · rotY(진입각).
   *
   * 모델은 **탄두가 +X**, 상방이 +Z 인 실척으로 구워져 있다(build_munitions.py 계약).
   * ENU 의 X 는 동(東)이므로 방위 az 를 향하려면 Z 축으로 (90°−az) 만큼 돌리고,
   * 진입각만큼 Y 축으로 더 돌리면 코가 내려간다.
   */
  _munitionMatrix(lon, lat, h, azDeg, dipDeg) {
    const enu = Cesium.Transforms.eastNorthUpToFixedFrame(D(lon, lat, h));
    const rot = Cesium.Matrix3.multiply(
      Cesium.Matrix3.fromRotationZ((90 - azDeg) * D2R),
      Cesium.Matrix3.fromRotationY(dipDeg * D2R),
      new Cesium.Matrix3());
    return Cesium.Matrix4.multiply(enu,
      Cesium.Matrix4.fromRotationTranslation(rot, Cesium.Cartesian3.ZERO), new Cesium.Matrix4());
  }

  // ═══════════════ 재생 ═══════════════

  seek(t) {
    this.t = Math.max(0, Math.min(this.timeline?.totalS ?? 0, t));
    this.update(this.t);
    this.ctx.onTick?.(this.t);
  }

  /**
   * 탄착 순간의 **시간 배율** (0.25 ~ 1).
   *
   * 6 초를 날아온 탄이 0.2 초 만에 모든 것을 끝내면, 정작 봐야 할 순간이 프레임 몇
   * 장으로 지나간다. 게임이 결정적인 순간에 시간을 늘이는 이유가 그것이다 —
   * 탄착 직전 0.6 초부터 직후 0.9 초까지 느리게 흐르고, 그 뒤 원속도로 돌아온다.
   * 재생 막대의 시각 t 자체는 그대로이므로 판정·물리는 아무 영향을 받지 않는다.
   */
  _timeScale(t) {
    if (!this.slowmo || !this.shots.length) return 1;
    let best = 1;
    for (const sh of this.shots) {
      const d = t - sh.at;
      if (d < -0.6 || d > 0.9) continue;
      // 탄착에서 가장 느리고, 앞뒤로 부드럽게 풀린다
      const u = d < 0 ? (d + 0.6) / 0.6 : 1 - d / 0.9;
      best = Math.min(best, 1 - 0.75 * smooth(u));
    }
    return best;
  }

  play() {
    if (!this.timeline) return;
    if (this.t >= this.timeline.totalS) this.t = 0;
    this.playing = true;
    this._last = performance.now();
    this.audio.resume();
    const tick = (now) => {
      if (!this.playing) return;
      const dt = document.hidden ? 0 : Math.min((now - this._last) / 1000, 0.1);
      this._last = now;
      this.t = Math.min(this.timeline.totalS, this.t + dt * this.speed * this._timeScale(this.t));
      this.update(this.t);
      this.ctx.onTick?.(this.t);
      if (this.t >= this.timeline.totalS) { this.playing = false; this.ctx.onEnd?.(); return; }
      this._raf = requestAnimationFrame(tick);
    };
    this._raf = requestAnimationFrame(tick);
  }

  pause() {
    this.playing = false;
    if (this._raf) cancelAnimationFrame(this._raf);
    this._raf = 0;
  }

  setSpeed(v) { this.speed = v; }

  /** 계획이 걸린 뒤 한 번은 모델을 준비해야 한다 — 재생 시작 전에 부른다. */
  async prepare() {
    await this._ensureModels();
    this.update(this.t);
  }

  // ═══════════════ 프레임 ═══════════════

  update(t) {
    const plan = this.plan;
    if (!plan?.impact || !this.rings || !this.timeline || !this.shots.length) { this._hideAll(); return; }
    const { groundH } = plan.impact;
    const R = this.rings;

    // 폭발 연출은 **가장 최근에 떨어진 발**을 그린다. 발마다 별도의 퍼프 풀을 두면
    // 12 발에 2,000 개가 넘고, 실제로 겹쳐 보이는 것은 마지막 한두 발뿐이다.
    const landed = this._landed(t);
    const last = landed[landed.length - 1] ?? this.shots[0];
    const a = landed.length ? t - last.at : -1;
    const burstH = groundH + plan.fuze.burstAglM;

    // 유도빔은 마지막 탄이 떨어지기 전까지만 — 그 뒤로는 가리킬 것이 없다
    const lastAt = this.shots[this.shots.length - 1].at;
    const beamOn = t < lastAt + 0.2;
    for (const e of this._beamEnts) e.show = beamOn;

    this._syncParticles(t, R, plan, groundH);
    this._updateMunition(t, plan, groundH);
    this._updateBlast(a, R, plan, last.lon, last.lat, groundH, burstH);
    this._updateCrater(t, R, groundH);
    this._updateBuildings(t);
    this._updateCamera(t, plan, groundH);
    this._updateShockwave(a, R, last, groundH, plan);
    this._screenFx(a, R);
    this.numbers.update(t, this.hits);
    this.feed.syncTo(t);
    this._lastT = t;
  }

  /**
   * 파티클은 실시간으로 흐른다 — 시각 t 를 따라가지 못한다.
   *
   * 그래서 「지금 막 떨어진 발」만 터뜨리고, 재생 막대를 되감거나 크게 건너뛰면 통째로
   * 지운다. 이미 한참 전에 떨어진 발을 뒤늦게 터뜨리면(막대를 앞으로 던졌을 때) 없던
   * 폭발이 생기므로, 그런 발은 **터뜨린 것으로 표시만** 하고 넘어간다.
   */
  _syncParticles(t, R, plan, groundH) {
    // 되감기 또는 큰 점프 → 살아 있는 파티클을 걷어내고 처음부터 다시 센다
    if (t < this._lastT - 0.05 || t > this._lastT + 2.5) {
      this.particles.reset();
      this.audio.clear();
      this._fired.clear();
      for (const sh of this.shots) if (t - sh.at > 2) this._fired.add(sh.n);
      this._lastT = t;
      return;
    }
    const fxScale = this.fxScale === 'real' ? 1
      : (typeof this.fxScale === 'number' ? this.fxScale : 1.25);
    for (const sh of this.shots) {
      if (this._fired.has(sh.n)) continue;
      const age = t - sh.at;
      if (age < 0) continue;
      this._fired.add(sh.n);
      if (age > 2) continue;                     // 이미 지나간 발은 소리 없이 넘긴다
      this.particles.burst({
        lon: sh.lon, lat: sh.lat, groundH,
        burstAglM: plan.fuze.burstAglM,
        effectiveKg: R.effectiveKg,
        windAz: (plan.azDeg + 244) % 360,
        scale: fxScale,
      });
      this.audio.boom({
        distanceM: this._camDistTo(sh.lon, sh.lat, groundH),
        effectiveKg: R.effectiveKg,
      });
    }
    // 탄약고 유폭 — 1 차 탄착과 같은 방식으로 한 번만 터뜨린다
    for (const sec of this.secondaries ?? []) {
      const key = `sec:${sec.uid}`;
      if (this._fired.has(key)) continue;
      const age = t - sec.atS;
      if (age < 0) continue;
      this._fired.add(key);
      if (age > 2) continue;
      this.particles.burst({
        lon: sec.lon, lat: sec.lat, groundH,
        burstAglM: 0,
        effectiveKg: sec.rings.effectiveKg,
        windAz: (plan.azDeg + 244) % 360,
        scale: fxScale,
      });
      const d = this._camDistTo(sec.lon, sec.lat, groundH);
      this.audio.boom({ distanceM: d, effectiveKg: sec.rings.effectiveKg, secondary: true });
      this.audio.collapse({ distanceM: d });
    }
    // 접근음 — 다음 발의 탄착 2.2 초 전에 한 번
    const next = this.shots.find((sh) => t < sh.at);
    if (next) {
      const lead = next.at - t;
      const key = `in:${next.n}`;
      if (lead <= 2.2 && lead > 0.15 && !this._fired.has(key)) {
        this._fired.add(key);
        this.audio.incoming({
          distanceM: this._camDistTo(next.lon, next.lat, groundH), leadS: lead,
        });
      }
    }
  }

  /**
   * 화면 왜곡 충격파.
   *
   * 전선의 반경을 픽셀로 환산하려면 「폭심에서 그 반경만큼 떨어진 지표의 한 점」을 함께
   * 투영해야 한다 — 그래야 원근이 그대로 반영된다(멀리서 보면 얇은 띠, 가까이서 보면
   * 화면을 가로지르는 띠).
   */
  _updateShockwave(a, R, last, groundH, plan) {
    if (!(a >= 0) || a > 8) { this.shockwave.disable(); return; }
    const fbMax = 3.6 * Math.cbrt(R.effectiveKg);
    const limit = Math.max(R.light, R.frag) * 1.15;
    const radius = (340 * a) / (1 + a * 0.55) + fbMax;
    if (radius > limit) { this.shockwave.disable(); return; }
    const strength = Math.max(0, 1 - radius / limit) ** 1.2;
    const center = D(last.lon, last.lat, groundH + fbMax * 0.4);
    // 카메라 쪽 어깨로 반경을 재면 화면에서의 크기가 가장 정직하다
    const p = offset(last.lon, last.lat, (plan.azDeg + 90) % 360, radius);
    this.shockwave.update(center, D(p.lon, p.lat, groundH), strength);
  }

  _hideAll() {
    for (const e of [this.flash, this.glow, this.fireball, this.fireshell, this.shock,
      this.trail, this.plume, this.munMark]) if (e) e.show = false;
    for (const arr of [this.shockRing, this.dragRing, this.stem, this.cap,
      this.dust, this.fires, this.frags]) for (const e of arr ?? []) e.show = false;
    if (this.models.munition) this.models.munition.show = false;
    for (const c of this.models.craters) c.show = false;
    for (const r of this.models.rubble) r.show = false;
  }

  /**
   * 종말유도 구간 — 진입점에서 탄착점까지 직선으로 내려온다.
   *
   * 연속사격에서는 **다음에 떨어질 발**을 그린다. 그 발의 탄착 6 초 전부터 하늘에
   * 나타나므로, 재장전 간격이 길면 그 사이 하늘은 비어 있다 — 그게 맞다.
   */
  _updateMunition(t, plan, groundH) {
    const m = this.models.munition;
    const flightS = this.timeline.flightS;
    const next = this.shots.find((sh) => t < sh.at);
    const flying = Boolean(next) && t >= next.at - flightS;
    if (m) m.show = flying;
    this.trail.show = flying;
    this.plume.show = flying;
    this.munMark.show = flying;
    if (!flying || !this._entry) { this.trail.polyline.positions = []; return; }
    const lon = next.lon, lat = next.lat;
    const imp = next.at;
    const u = clamp01(1 - (imp - t) / Math.max(0.001, flightS));
    const p = {
      lon: this._entry.lon + (lon - this._entry.lon) * u,
      lat: this._entry.lat + (lat - this._entry.lat) * u,
      h: this._entry.h + (groundH + 0.5 - this._entry.h) * u,
    };
    this._munitionPos = p;
    // 탄이 **가는** 방향은 위협 방위의 반대다 (북에서 오면 남쪽을 향해 난다)
    const headingDeg = (plan.azDeg + 180) % 360;
    if (m) m.modelMatrix = this._munitionMatrix(p.lon, p.lat, p.h, headingDeg, -plan.munition.dipDeg);
    // 항적은 뒤로 200 m 만 — 전 구간을 그리면 하늘에 줄 하나만 남는다
    const back = Math.max(0, u - 0.09);
    const q = {
      lon: this._entry.lon + (lon - this._entry.lon) * back,
      lat: this._entry.lat + (lat - this._entry.lat) * back,
      h: this._entry.h + (groundH + 0.5 - this._entry.h) * back,
    };
    this.trail.polyline.positions = [D(q.lon, q.lat, q.h), D(p.lon, p.lat, p.h)];
    this.trail.polyline.width = 2 + 4 * u;

    // 화염은 탄체 꼬리에 — 탄체 길이의 절반만큼 뒤로 물린다
    const len = plan.munition.bodyLenM;
    const tail = offset(p.lon, p.lat, plan.azDeg,
      Math.cos(plan.munition.dipDeg * D2R) * len * 0.55);
    this.plume.position = D(tail.lon, tail.lat,
      p.h + Math.sin(plan.munition.dipDeg * D2R) * len * 0.55);
    this.plume.billboard.width = this.plume.billboard.height = len * (1.5 + u * 1.4);
    this.plume.billboard.color = css('#ffc471').withAlpha(0.55 + 0.3 * u);

    this.munMark.position = D(p.lon, p.lat, p.h);
    this.munMark.label.text = `${plan.munition.short} · 잔여 ${(imp - t).toFixed(1)}s
`
      + `고도 ${Math.round(p.h - groundH)}m · ${plan.munition.terminalMps}m/s`;
  }

  /**
   * 폭발.
   *
   * 화구는 순간에 최대가 되지 않는다 — 부풀었다가 부력으로 떠오르며 식는다.
   * 충격파는 화구를 앞질러 나가고, 지표에서는 먼지 고리로 보인다. 연기 기둥은
   * 그 뒤에 남아 위로 자라다가 상승을 멈추고 옆으로 흐른다. 시간축을 되감아도
   * 같은 그림이 나오도록 전부 t 의 함수로만 쓴다 (누적 상태 없음).
   */
  _updateBlast(a, R, plan, lon, lat, groundH, burstH) {
    const on = a >= 0;
    const cw = Math.cbrt(R.effectiveKg);
    const fbMax = 3.6 * cw;                      // 화구 최대 반경 (m)
    // 화구는 폭약량이 클수록 오래 탄다. 2.6 초로 못 박아 두었더니 500 lb 폭탄의 화구가
    // 3 초 가까이 하늘을 덮었다 — 수명도 입방근에서 뽑는다.
    const fbLife = 0.30 + 0.13 * cw;

    // ── 섬광: 짧고 아주 밝다 ──
    this.flash.show = on && a < 0.55;
    if (this.flash.show) {
      const u = a / 0.55;
      const pos = D(lon, lat, burstH + fbMax * 0.4);
      const phys = fbMax * 8 * Math.sin(Math.min(1, u) * Math.PI) ** 0.4;
      this.flash.position = pos;
      this.flash.billboard.width = this.flash.billboard.height =
        Math.max(1, this._fx(pos, phys, FX_MIN_PX.glow * 1.7 * (1 - u)));
      this.flash.billboard.color = css('#fff6e2').withAlpha(0.98 * (1 - u * u));
      this._img(this.flash, this.vistaFx ? frameAt(FX_URL.flash, u) : this.sprites.core);
    }

    // ── 후광: 화구가 식은 뒤에도 잔불로 조금 더 남는다 ──
    const glowLife = fbLife * 3.2;
    this.glow.show = on && a < glowLife;
    if (this.glow.show) {
      const u = a / glowLife;
      const pos = D(lon, lat, burstH + fbMax * (0.5 + a * 0.5));
      this.glow.position = pos;
      this.glow.billboard.width = this.glow.billboard.height =
        Math.max(1, this._fx(pos, fbMax * (2.4 - u * 1.1), FX_MIN_PX.glow * (1 - u * 0.55)));
      const hue = u < 0.2 ? '#ffe6bb' : u < 0.5 ? '#ff9f45' : '#cf5a1e';
      this.glow.billboard.color = css(hue).withAlpha(0.9 * (1 - u) ** 1.3);
      // 스프라이트 시트를 돌린다 — 같은 원판이 커지는 것과 「끓어오르는 것」은 다르다
      this._img(this.glow, this.vistaFx ? frameAt(FX_URL.explosion, u) : this.sprites.glow);
    }

    // ── 화구 2 겹 ──
    this.fireball.show = on && a < fbLife;
    if (this.fireball.show) {
      const u = a / fbLife;
      const grow = 1 - Math.exp(-a * (5.5 / fbLife));
      const r = Math.max(0.6, fbMax * (0.35 + 0.65 * grow));
      this.fireball.position = D(lon, lat, burstH + fbMax * (0.45 + a * 0.55));
      this.fireball.ellipsoid.radii = new Cesium.Cartesian3(r, r, r * (0.86 + a * 0.16));
      // 흰 화구는 블룸을 만나면 그냥 흰 원이 된다 — 식는 순서를 색으로 낸다
      const hot = css(u < 0.22 ? '#fff0cd' : u < 0.55 ? '#ffa63c' : u < 0.8 ? '#df6a1c' : '#8b3a12');
      this.fireball.ellipsoid.material = hot.withAlpha(0.95 * (1 - u) ** 0.55);
    }
    // 껍질은 코어보다 늦게 부풀고 늦게 꺼진다 — 화구가 「한 겹 원」으로 보이지 않게
    const shLife = fbLife * 1.9;
    this.fireshell.show = on && a < shLife;
    if (this.fireshell.show) {
      const u = a / shLife;
      const r = fbMax * (0.5 + 1.25 * (1 - Math.exp(-a * (3.2 / fbLife))));
      this.fireshell.position = D(lon, lat, burstH + fbMax * (0.5 + a * 0.75));
      this.fireshell.ellipsoid.radii = new Cesium.Cartesian3(r, r, r * (0.8 + a * 0.2));
      this.fireshell.ellipsoid.material =
        css(u < 0.4 ? '#ff8a34' : '#8f3a14').withAlpha(0.42 * (1 - u) ** 1.2);
    }

    // ── 충격파: 돔 + 지표 고리 ──
    //
    // 340 m/s 로 나가 감속한다. 유리파손(또는 파편) 반경 언저리에서 사라지는데, 그
    // 지점이 곧 「여기까지가 이 탄의 영향권」이라 경계가 눈으로 읽힌다.
    const shockLimit = Math.max(R.light, R.frag) * 1.15;
    const shockR = on ? (340 * a) / (1 + a * 0.55) + fbMax : 0;
    const shockU = shockR / shockLimit;
    const shockOn = on && shockU < 1 && a < 14;
    this.shock.show = shockOn;
    if (shockOn) {
      const fade = 1 - shockU;
      this.shock.position = D(lon, lat, groundH);
      this.shock.ellipsoid.radii = new Cesium.Cartesian3(shockR, shockR, shockR * 0.62);
      this.shock.ellipsoid.material = css('#dfefff').withAlpha(0.085 * fade * fade);
    }
    this._ringOf(this.shockRing, shockOn, lon, lat, groundH + 1.5, shockR, shockU,
      '#f2f8ff', '#cfe4f7', 1.55, 0.62, FX_MIN_PX.shock);
    // 뒤따르는 흙먼지 고리 — 전선보다 느리고, 낮고, 오래 남는다
    const dragR = shockR * 0.72;
    const dragOn = on && dragR < shockLimit * 0.95 && a < 16;
    this._ringOf(this.dragRing, dragOn, lon, lat, groundH + 0.8, dragR, dragR / shockLimit,
      '#9b8a6b', '#6f6250', 2.1, 0.55, FX_MIN_PX.dust);

    // ── 연기 기둥 ──
    //
    // 상승량은 **그 퍼프의 나이**가 정한다. 처음에는 계수에 인덱스를 곱해 두었는데,
    // 그러면 나중에 태어난 연기가 더 높이 올라가 기둥이 위아래로 뒤집힌다.
    // 색도 밝은 회색은 블룸 걸린 지형 위에서 안 보여 그을음 색으로 내렸다.
    const windAz = (plan.azDeg + 244) % 360;
    const colTop = fbMax * 3.4;                  // 기둥이 도달하는 대략적 높이
    for (let i = 0; i < this.stem.length; i++) {
      const e = this.stem[i];
      const age = a - i * 0.17;
      const alive = on && age > 0 && age < 24;
      e.show = alive;
      if (!alive) continue;
      const buoy = 0.85 + (i % 5) * 0.09;
      const rise = colTop * buoy * (1 - Math.exp(-age * 0.30));
      const drift = Math.max(0, age - 2.5) * (1.5 + (i % 4) * 0.45);
      const swirl = Math.sin(i * 2.399 + age * 0.5) * (fbMax * 0.5 + age * 0.6);
      const p1 = offset(lon, lat, windAz, drift);
      const p2 = offset(p1.lon, p1.lat, (windAz + 90) % 360, swirl);
      const pos = D(p2.lon, p2.lat, burstH + fbMax * 0.5 + rise);
      e.position = pos;
      e.billboard.width = e.billboard.height =
        this._fx(pos, fbMax * (0.9 + age * 0.22), FX_MIN_PX.stem);
      const soot = i % 3 === 0 ? '#1e1a15' : i % 3 === 1 ? '#3a342c' : '#584f45';
      e.billboard.color = css(soot).withAlpha(0.82 * Math.max(0, 1 - age / 24) * Math.min(1, age * 2.5));
      this._img(e, this.vistaFx ? FX_URL.smoke : this.sprites.puff[1]);
    }

    // ── 기둥 머리: 위에서 상승을 멈추고 옆으로 퍼진다 ──
    //
    // 재래식 탄에서는 버섯이 아니라 「부풀어 눕는 머리」다. 그래도 이 갓이 있어야
    // 기둥이 하늘로 무한히 뻗는 대신 어디선가 멈춘 것으로 읽힌다.
    for (let i = 0; i < this.cap.length; i++) {
      const e = this.cap[i];
      const age = a - 1.6;
      const alive = on && age > 0 && age < 26;
      e.show = alive;
      if (!alive) continue;
      const spread = fbMax * (0.5 + 1.5 * (1 - Math.exp(-age * 0.22))) * (0.6 + (i % 4) * 0.28);
      const az = (i * 360) / this.cap.length + age * 3;
      const p1 = offset(lon, lat, az, spread);
      const p2 = offset(p1.lon, p1.lat, windAz, Math.max(0, age - 2) * 1.8);
      const lift = colTop * (0.72 + 0.28 * (1 - Math.exp(-age * 0.26))) + (i % 3) * fbMax * 0.25;
      const pos = D(p2.lon, p2.lat, burstH + lift);
      e.position = pos;
      e.billboard.width = e.billboard.height =
        this._fx(pos, fbMax * (1.2 + age * 0.16), FX_MIN_PX.cap);
      e.billboard.color = css(i % 2 ? '#4a4238' : '#655b4e')
        .withAlpha(0.62 * Math.max(0, 1 - age / 26) * Math.min(1, age * 1.4));
      this._img(e, this.vistaFx ? FX_URL.smoke : this.sprites.puff[3]);
    }

    // ── 폭심 둘레 먼지 치마 ──
    //
    // 먼지는 **가라앉는다.** 처음에는 17 초 동안 계속 부풀게 써 두었더니, 마지막에는
    // 63 m 짜리 퍼프 34 개가 화면 아래 절반을 회색 천처럼 덮었다 — 폭발이 아니라
    // 텍스처 오류로 보였다. 커지는 것은 위로 올라가는 기둥이고, 지표 먼지는 퍼지다가
    // 이내 내려앉아 사라진다.
    const dustLife = 12;
    for (let i = 0; i < this.dust.length; i++) {
      const e = this.dust[i];
      const age = a - (i % 6) * 0.08;
      const alive = on && age > 0 && age < dustLife;
      e.show = alive;
      if (!alive) continue;
      const az = (i * 137.5) % 360;
      const reach = Math.min(R.moderate * 1.4 + 8, (30 + (i % 5) * 7) * age / (1 + age * 0.55));
      const p = offset(lon, lat, az, reach + fbMax * 0.5);
      const settle = Math.max(0, Math.min(fbMax * 1.4, age * 3.0) - Math.max(0, age - 4) * 1.5);
      const pos = D(p.lon, p.lat, groundH + 1.5 + settle);
      e.position = pos;
      e.billboard.width = e.billboard.height =
        this._fx(pos, fbMax * (0.8 + age * 0.11) + (i % 4), FX_MIN_PX.dust);
      e.billboard.color = css(i % 2 ? '#6d6047' : '#8a7c62')
        .withAlpha(0.55 * Math.max(0, 1 - age / dustLife) ** 1.7 * Math.min(1, age * 3));
      this._img(e, this.vistaFx ? FX_URL.dust : this.sprites.puff[2]);
    }

    // ── 파편·불티: 탄도 궤적. 파편 위험반경 안에서만 날아간다 ──
    for (let i = 0; i < this.frags.length; i++) {
      const e = this.frags[i];
      const alive = on && a < 4.2;
      e.show = alive;
      if (!alive) continue;
      const az = (i * 222.49) % 360;
      const el = 0.10 + (i % 7) * 0.11;                    // 사출 앙각
      const v = (R.frag / 2.2) * (0.5 + ((i * 37) % 100) / 130);
      const h = v * Math.sin(el) * a - 4.9 * a * a;
      if (h < -2) { e.show = false; continue; }
      const p = offset(lon, lat, az, v * Math.cos(el) * a);
      e.position = D(p.lon, p.lat, burstH + Math.max(0, h));
      // 갓 사출된 파편은 달궈져 있다가 식으면서 회색으로 간다
      e.point.color = css(a < 1 ? '#ffe0a8' : a < 2 ? '#e08a44' : '#a8998a')
        .withAlpha(Math.max(0, 1 - a / 4.2));
      e.point.pixelSize = 4.2 * Math.max(0.35, 1 - a / 4.2);
    }

    // ── 잔류 화재: 폭발이 끝난 뒤 탄공 둘레에 남아 흔들린다 ──
    for (let i = 0; i < this.fires.length; i++) {
      const e = this.fires[i];
      const age = a - (0.5 + (i % 4) * 0.35);
      const alive = on && age > 0 && age < 30 && R.crater > 0;
      e.show = alive;
      if (!alive) continue;
      const az = (i * 111 + 37) % 360;
      const p = offset(lon, lat, az, R.crater * (0.9 + (i % 3) * 0.7));
      const flick = 0.72 + 0.28 * Math.sin(age * (5 + i) + i);
      const pos = D(p.lon, p.lat, groundH + fbMax * 0.16 * flick);
      e.position = pos;
      e.billboard.width = e.billboard.height =
        this._fx(pos, fbMax * 0.42 * flick, FX_MIN_PX.fire);
      e.billboard.color = css(i % 2 ? '#ff9a33' : '#ffc061')
        .withAlpha(0.85 * Math.max(0, 1 - age / 30) * Math.min(1, age * 2));
    }
  }

  /**
   * 확장하는 지표 고리 하나를 빌보드 띠로 그린다.
   *
   * `ellipse.outlineWidth` 는 대부분의 장비(ANGLE)에서 1 px 로 잘려 굵은 고리를 만들 수
   * 없다. 대신 원둘레에 빌보드를 늘어놓고, 조각 크기를 **둘레 ÷ 개수보다 크게** 잡아
   * 서로 겹치게 한다. 반경이 작을 때는 조각이 지나치게 커지므로 반경으로도 한 번 묶는다.
   */
  _ringOf(list, on, lon, lat, h, radius, u, head, tail, sizeK, alpha, minPx) {
    if (!on || !(radius > 0.5)) {
      for (const e of list) e.show = false;
      return;
    }
    const n = list.length;
    const fade = Math.max(0, 1 - u) ** 1.15;
    const seg = Math.min(((2 * Math.PI * radius) / n) * sizeK, radius * 0.85);
    for (let i = 0; i < n; i++) {
      const e = list[i];
      e.show = true;
      const p = offset(lon, lat, (i * 360) / n, radius * (1 + 0.045 * Math.sin(i * 2.7)));
      const pos = D(p.lon, p.lat, h);
      e.position = pos;
      e.billboard.width = e.billboard.height = this._fx(pos, seg, minPx);
      e.billboard.color = css(i % 2 ? head : tail).withAlpha(alpha * fade);
      this._img(e, this.vistaFx ? FX_URL.dust : this.sprites.puff[0]);
    }
  }

  /**
   * 탄공 립 GLB + 잔해 — **떨어진 발마다 하나씩** 지표에 앉는다.
   *
   * 연속사격의 결과는 탄공 한 개가 아니라 CEP 만큼 흩어진 탄공 무리다. 그 무리의
   * 퍼짐이 곧 「이 탄의 정밀도」이고, 화면에서 그것이 보여야 조준점 하나에 몇 발을
   * 넣는 계획이 말이 되는지 판단할 수 있다.
   */
  _updateCrater(t, R, groundH) {
    const landed = this._landed(t);
    for (let i = 0; i < this.models.craters.length; i++) {
      const c = this.models.craters[i];
      const sh = landed[i];
      const age = sh ? t - sh.at : -1;
      const on = Boolean(sh) && age >= 0.12 && R.crater > 0;
      c.show = on;
      if (!on) continue;
      const scale = R.crater * smooth((age - 0.12) / 0.4);
      const enu = Cesium.Transforms.eastNorthUpToFixedFrame(D(sh.lon, sh.lat, groundH + 0.05));
      c.modelMatrix = Cesium.Matrix4.multiplyByScale(enu,
        new Cesium.Cartesian3(Math.max(0.01, scale), Math.max(0.01, scale),
          Math.max(0.01, Math.cbrt(scale))),
        new Cesium.Matrix4());
    }
    // 잔해는 마지막 탄공 둘레에만 — 12 발마다 흩으면 지면이 잔해로 덮인다
    const last = landed[landed.length - 1];
    const rubbleAge = last ? t - last.at : -1;
    const rubbleOn = rubbleAge >= 0.7;
    for (let i = 0; i < this.models.rubble.length; i++) {
      const r = this.models.rubble[i];
      r.show = rubbleOn;
      if (!rubbleOn) continue;
      const az = (i * 72 + 23) % 360;
      const p = offset(last.lon, last.lat, az, R.crater * (1.5 + (i % 3) * 0.45));
      const sc = Math.max(0.4, R.crater * 0.42) * smooth((rubbleAge - 0.7) / 0.6);
      const enu = Cesium.Transforms.eastNorthUpToFixedFrame(D(p.lon, p.lat, groundH));
      const rot = Cesium.Matrix4.fromRotationTranslation(
        Cesium.Matrix3.fromRotationZ(az * D2R), Cesium.Cartesian3.ZERO);
      const m = Cesium.Matrix4.multiply(enu, rot, new Cesium.Matrix4());
      r.modelMatrix = Cesium.Matrix4.multiplyByScale(m, new Cesium.Cartesian3(sc, sc, sc * 0.8), m);
    }
  }

  /**
   * 피해 표현 — **누적 손상**이 곧 붕괴량이다.
   *
   * 한 발 맞고 버틴 건물은 반쯤 주저앉은 채로 서 있다가, 두 발째에 마저 무너진다.
   * 그 「반쯤」이 화면에 남아 있어야 「몇 발까지 버티는가」가 눈으로 읽힌다 — 그래서
   * 붕괴량을 등급이 아니라 **누적 손상 지수 D 자체**에서 뽑는다(D=1 이 완전 붕괴).
   *
   * 판정을 받은 세 종류 모두에 건다: 배치 시설(모듈 스택), 감시자산(마스트),
   * GP 감시탑. 판정표가 「완파」라고 적어 놓고 그 물건이 서 있으면 둘 중 하나는
   * 거짓말이다. 전부 시각 t 의 함수라 되감으면 그대로 다시 선다.
   */
  _updateBuildings(t) {
    const st = this.ctx.state ?? {};
    const placer = st.placer;
    const posts = st.posts;
    const tower = st.ents?.tower;
    const dmgMap = this._damageAt(t);

    const clearOne = (row) => {
      if (!this._touched.has(row.uid)) return;
      this._touched.delete(row.uid);
      if (row.kind === '시설') {
        const stack = placer?.stacks?.get(row.uid);
        const item = placer?.items?.find((x) => x.uid === row.uid);
        if (stack && item) stack.setDamage(item, null);
      } else if (row.kind === '감시자산') {
        posts?.setDamage?.(row.uid, null);
      } else {
        tower?.setDamage?.(null);
      }
    };

    // 등급 문턱을 HP 축(왼쪽이 0 %)에서의 위치로 — 막대 위 눈금이 될 자리다
    if (!this._hpMarks) {
      this._hpMarks = [CUM_THRESHOLD.severe, CUM_THRESHOLD.moderate, CUM_THRESHOLD.light]
        .map((v) => 1 - v);
    }
    if (!this._hpCache) this._hpCache = new Map();

    for (const row of this.rows) {
      // 즉시 복구로 되살린 대상은 시각이 흘러도 계속 무피해로 취급한다.
      const d = this._revived.has(row.uid) ? 0 : (dmgMap.get(row.uid) ?? 0);
      const grade = gradeFromDamage(d);
      this._paintHp(row, d, grade);
      if (grade === 'none') { clearOne(row); continue; }
      // 붕괴량은 손상 지수를 그대로 쓴다 — D=1 에서 완전 붕괴, 그 아래는 비례.
      // 다만 경파·유리 단계에서 이미 눈에 띄게 기울면 과장이라, 등급별 상한을 씌운다.
      const capBy = { destroyed: 1, severe: 0.5, moderate: 0.18, light: 0.05, none: 0 };
      // 형상 단계는 HP 가 정한다 — 반파·붕괴에서는 아예 다른 메시로 바뀐다.
      // 그때는 원본을 가라앉히던 기울임을 크게 줄인다(파손 셸 자체가 낮으므로,
      // 거기에 침하까지 더하면 잔해가 땅속으로 들어간다).
      const stage = stageOf(d);
      const sunk = stage === 'heavy' || stage === 'ruin' ? Math.min(0.12, d * 0.06) : capBy[grade];
      const dmg = {
        hp: hpOf(d),
        stage,
        collapse: Math.min(sunk, d),
        tint: GRADE_COLOR[grade],
        tintAmount: Math.min(0.62, 0.18 + d * 0.5),
      };
      if (row.kind === '시설') {
        const stack = placer?.stacks?.get(row.uid);
        const item = placer?.items?.find((x) => x.uid === row.uid);
        if (!stack || !item) continue;
        stack.setDamage(item, dmg);
      } else if (row.kind === '감시자산') {
        if (!posts?.setDamage) continue;
        posts.setDamage(row.uid, dmg);
      } else {
        if (!tower?.setDamage) continue;
        tower.setDamage(dmg);
      }
      this._touched.add(row.uid);
    }
  }

  /**
   * 머리 위 HP 막대 한 개를 갱신한다.
   *
   * 캔버스는 **HP 1 % 가 바뀔 때만** 다시 그린다. 매 프레임 새 캔버스를 만들면
   * 그 텍스처 업로드만으로 프레임이 깎이는데, 1 % 아래는 눈에 보이지도 않는다.
   */
  _paintHp(row, damage, grade) {
    const e = this.ds.entities.getById(`sk-hp-${row.uid}`);
    if (!e) return;
    const hp = hpOf(damage);
    const pct = Math.round(hp * 100);
    const stage = stageOf(damage);
    const key = `${pct}|${stage}`;
    if (e._hpKey === key) return;
    e._hpKey = key;
    const cacheKey = `${row.uid}|${key}`;
    let img = this._hpCache.get(cacheKey);
    if (!img) {
      const need = row.endurance?.p90;
      img = hpSprite({
        name: row.name,
        hardened: row.hardened,
        hp,
        color: pct > 0 ? GRADE_COLOR[grade] : GRADE_COLOR.destroyed,
        stage: STAGE_LABEL[stage],
        sub: `${Math.round(row.distM)}m` + (need ? ` · 완파 ${need}발` : ' · 완파 불가'),
        marks: this._hpMarks,
      });
      this._hpCache.set(cacheKey, img);
      // 캐시가 무한정 자라지 않게 — 한 대상당 101 단계면 충분하다
      if (this._hpCache.size > 900) this._hpCache.clear();
    }
    e.billboard.image = img;
  }

  /**
   * 즉시 복구 — 지금 이 순간 손상돼 있는 시설·감시자산·감시탑을 전부 되살린다.
   *
   * 되감기·재재생이 아니라 **그 자리에서** 되돌린다. 재생을 계속하거나 되감았다
   * 다시 넘어와도 `_damageAt` 이 매기는 손상에서 이 uid 들을 제외하도록 기억해
   * 두므로(`_revived`), 클릭한 순간의 「복구됨」이 그대로 유지된다. 새 타격 계획을
   * 걸거나(setPlan) 새 화력 임무를 시작하면(resetMission) 풀린다.
   */
  reviveAll() {
    const dmgMap = this._damageAt(this.t);
    let n = 0;
    for (const row of this.rows) {
      if ((dmgMap.get(row.uid) ?? 0) <= 0) continue;
      this._revived.add(row.uid);
      n++;
    }
    if (n) this._updateBuildings(this.t);
    return n;
  }

  /** 지금 시각 기준으로 (복구 처리되지 않은) 손상 시설이 하나라도 있는가 — 복구 버튼 활성화 판단용. */
  hasDamageNow() {
    const dmgMap = this._damageAt(this.t);
    for (const row of this.rows) {
      if (this._revived.has(row.uid)) continue;
      if ((dmgMap.get(row.uid) ?? 0) > 0) return true;
    }
    return false;
  }

  /** 배치·감시 화면으로 돌아갈 때 무너뜨려 둔 것을 전부 세운다. */
  restoreBuildings() {
    const st = this.ctx.state ?? {};
    for (const uid of this._touched) {
      const stack = st.placer?.stacks?.get(uid);
      const item = st.placer?.items?.find((x) => x.uid === uid);
      if (stack && item) { stack.setDamage(item, null); continue; }
      if (st.posts?.get?.(uid)) { st.posts.setDamage(uid, null); continue; }
      if (uid === 'gp-tower') st.ents?.tower?.setDamage?.(null);
    }
    this._touched.clear();
  }

  /**
   * **적이 어디를 때리면 가장 효율적인가** — 취약 조준점 분석.
   *
   * 이 화면은 여태 「내가 고른 한 점」만 답했다. 배치를 고치려면 반대쪽 질문이
   * 필요하다: 이 배치의 가장 약한 자리는 어디인가. 후보 격자를 훑어 한 발이 주는
   * 손상의 합이 가장 큰 점을 찾고, 그 분포를 지형 위에 색으로 깔아 준다.
   *
   * 격자마다 지형 차폐를 다시 재면 21×21×대상수 만큼 지형을 읽어야 해서 화면이
   * 멈춘다. 그래서 **탐색에서는 자유장**으로 훑고, 최종 후보 한 점만 차폐를 넣어
   * 다시 잰다 — 순위는 거의 바뀌지 않고 답은 정확해진다.
   */
  analyzeVulnerability(opts = {}) {
    if (!this.plan?.impact || !this.rings) return null;
    const { munition, fuze } = this.plan;
    const targets = this.rows
      .filter((r) => r.kind !== '감시자산')
      .map((r) => ({ lon: r.lon, lat: r.lat, capKpa: r.capKpa ?? capacityKpa(r.hardened, munition, fuze) }));
    if (targets.length < 1) return null;
    const center = opts.center ?? this.plan.impact;
    const halfSpanM = opts.halfSpanM ?? Math.max(90, this.rings.moderate * 3.4);
    const steps = opts.steps ?? 21;
    const { best, grid } = findVulnerableAimpoint(
      targets, center, this.rings.effectiveKg, distM, { halfSpanM, steps });
    this._drawVulnerability(grid, best, halfSpanM, steps);
    return { best, grid, halfSpanM, steps, targets: targets.length };
  }

  /** 취약도 히트맵 — 격자마다 지형에 클램프한 작은 사각 원반. */
  _drawVulnerability(grid, best, halfSpanM, steps) {
    this.clearVulnerability();
    if (!grid.length) return;
    const groundH = this.plan.impact.groundH ?? 0;
    const rtActive = !!(this.ctx.state?.realTerrain?.active && this.ctx.state?.realTerrain?.surfaceReady);
    const cell = (2 * halfSpanM) / (steps - 1);
    const max = Math.max(...grid.map((g) => g.score)) || 1;
    for (const g of grid) {
      const u = g.score / max;
      if (u < 0.12) continue;                       // 거의 아무 피해도 못 주는 자리는 비워 둔다
      this.ds.entities.add({
        id: `sk-vuln-${g.lon.toFixed(6)}-${g.lat.toFixed(6)}`,
        position: D(g.lon, g.lat, groundH),
        ellipse: {
          semiMajorAxis: cell * 0.62, semiMinorAxis: cell * 0.62,
          material: css(u > 0.85 ? '#ff4d4d' : u > 0.6 ? '#ff9a3c' : u > 0.35 ? '#ffd452' : '#7fd4a8')
            .withAlpha(0.10 + u * 0.34),
          ...(rtActive ? {} : { classificationType: Cesium.ClassificationType.TERRAIN }),
          zIndex: 2,
        },
      });
    }
    this.ds.entities.add({
      id: 'sk-vuln-best',
      position: D(best.lon, best.lat, groundH + 46),
      billboard: {
        image: this.sprites.cross, scale: 0.8, color: css('#ff5f5f'),
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
      },
      label: {
        text: `취약 조준점\n1발당 총손상 ${(best.score * 100).toFixed(0)}%`,
        font: '700 12px "Pretendard GOV", sans-serif',
        fillColor: css('#ffb4b4'),
        showBackground: true, backgroundColor: css('#230a0a').withAlpha(0.9),
        backgroundPadding: new Cesium.Cartesian2(8, 5),
        pixelOffset: new Cesium.Cartesian2(0, 18),
        verticalOrigin: Cesium.VerticalOrigin.TOP,
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
      },
    });
    this.ds.entities.add({
      id: 'sk-vuln-ring',
      polyline: {
        positions: circlePositions(best.lon, best.lat, cell * 1.1, groundH, 48),
        width: 3, clampToGround: !rtActive,
        material: new Cesium.PolylineOutlineMaterialProperty({
          color: css('#ff5f5f'), outlineColor: css('#2a0606').withAlpha(0.7), outlineWidth: 1,
        }),
      },
    });
  }

  clearVulnerability() {
    for (const e of [...this.ds.entities.values]) {
      if (String(e.id).startsWith('sk-vuln')) this.ds.entities.remove(e);
    }
  }

  // ═══════════════ 카메라 ═══════════════

  /**
   * 시점은 「무엇을 보려는가」로 두 개다.
   *
   * 어깨 시점은 **폭발을 본다** — 그러니 프레임을 잡는 기준은 유리파손 반경(108 m)이
   * 아니라 실제로 무언가 일어나는 경파 반경(37 m)이어야 한다. 유리 반경으로 잡으면
   * 500 lb 폭탄의 화구(반경 18 m)가 화면에서 점이 된다 — 실제로 그랬다.
   * 위에서 보기는 **반경을 읽는다** — 그래서 가장 바깥 원(유리·파편)을 다 담는다.
   */
  _frame() {
    const R = this.rings;
    return {
      near: Math.max(38, (R?.moderate ?? 40) * 2.3),
      wide: Math.max(120, Math.max(R?.light ?? 100, R?.frag ?? 100) * 1.35),
    };
  }

  setCamera(mode) {
    this.cameraMode = mode;
    const plan = this.plan;
    if (!plan?.impact) return;
    const { lon, lat, groundH } = plan.impact;
    const { near, wide } = this._frame();
    if (mode === 'top') {
      this.viewer.camera.flyTo({
        destination: D(lon, lat, groundH + wide * 2.1),
        orientation: { heading: 0, pitch: -Cesium.Math.PI_OVER_TWO, roll: 0 },
        duration: 1.4,
      });
    } else if (mode === 'overview') {
      // 탄이 오는 쪽 어깨에서 본다 — 진입 축선과 폭발이 한 화면에 들어온다
      const back = offset(lon, lat, plan.azDeg, near * 1.7);
      this.viewer.camera.flyTo({
        destination: D(back.lon, back.lat, groundH + near * 0.78),
        orientation: {
          heading: azimuthDeg(back.lon, back.lat, lon, lat) * D2R,
          pitch: -22 * D2R, roll: 0,
        },
        duration: 1.6,
      });
    } else if (mode === 'chase') {
      this.pause();
      this.seek(0);
    }
  }

  /** 탄 추적 시점 — 재생 중에만 카메라를 잡는다. */
  _updateCamera(t, plan, groundH) {
    if (this.cameraMode !== 'chase' || !this._munitionPos || !this.shots.length) return;
    const flightS = this.timeline.flightS;
    const next = this.shots.find((sh) => t < sh.at);
    const last = this._landed(t).pop();
    const imp = next ? next.at : (last?.at ?? 0);
    const lon = (next ?? last).lon;
    const lat = (next ?? last).lat;
    if (next && t >= imp - flightS) {
      const p = this._munitionPos;
      const back = offset(p.lon, p.lat, plan.azDeg, 42);
      this.viewer.camera.setView({
        destination: D(back.lon, back.lat, p.h + 16),
        orientation: {
          heading: ((plan.azDeg + 180) % 360) * D2R,
          pitch: -(plan.munition.dipDeg - 6) * D2R,
          roll: 0,
        },
      });
    } else if (last && t - last.at < 0.4) {
      // 탄착 순간에 시점을 어깨로 넘긴다 — 그대로 두면 카메라가 땅속에 들어간다
      const { near } = this._frame();
      const back = offset(last.lon, last.lat, plan.azDeg, near * 1.5);
      this.viewer.camera.setView({
        destination: D(back.lon, back.lat, groundH + near * 0.7),
        orientation: {
          heading: azimuthDeg(back.lon, back.lat, last.lon, last.lat) * D2R,
          pitch: -26 * D2R, roll: 0,
        },
      });
    }
  }

  // ═══════════════ 화면 효과 ═══════════════

  /** 섬광·진동은 지도 캔버스에 건다 — 패널 글씨까지 흔들리면 읽을 수 없다. */
  _screenFx(a, R) {
    const wrap = document.getElementById('cesiumContainer');
    if (!wrap) return;
    if (!this._flashEl) {
      const el = document.createElement('div');
      el.id = 'strike-flash';
      wrap.parentElement?.appendChild(el);
      this._flashEl = el;
    }
    // 화면 전체를 덮는 섬광은 짧고 옅어야 한다 — 길면 그 사이 폭발이 안 보인다
    const on = a >= 0 && a < 0.45;
    const u = on ? a / 0.45 : 1;
    this._flashEl.style.opacity = on ? String(0.40 * (1 - u) ** 1.7) : '0';
    const shake = a >= 0 && a < 0.9 ? (1 - a / 0.9) ** 2 * Math.min(9, Math.cbrt(R.effectiveKg) * 1.8) : 0;
    if (shake > 0.05) {
      const s = Math.sin(a * 92) * shake;
      const c = Math.cos(a * 74) * shake;
      wrap.style.transform = `translate(${s.toFixed(2)}px, ${c.toFixed(2)}px)`;
    } else if (wrap.style.transform) {
      wrap.style.transform = '';
    }
  }

  /**
   * 전투 결과 — 게임의 결과 화면에 해당한다.
   *
   * 숫자를 늘어놓는 것이 목적이 아니라 **한 문장으로 판정**하는 것이 목적이다:
   * 「이 사격은 잘한 사격인가」. 기준은 두 개다.
   *   효율   전 구조물을 무력화하는 데 필요한 최소 발수(90 % 신뢰) 대비 실제 사용 발수
   *   안전   부수피해 안전거리를 지켰는가 (KAIROS 요구 여유 300 m)
   *
   * 등급은 그 둘에서만 나온다. 「많이 부순 쪽이 이긴다」가 아니라 「적은 발수로
   * 필요한 것만 부순 쪽이 이긴다」 — 그게 사격계획의 기준이다.
   */
  outcome() {
    if (!this.rows.length || !this.shots.length || !this.timeline) return null;
    const rounds = this.shots.length;
    const structural = this.rows.filter((r) => r.kind !== '감시자산');
    const counts = { destroyed: 0, severe: 0, moderate: 0, light: 0, none: 0 };
    for (const r of this.rows) counts[r.grade]++;
    const downed = structural.filter((r) => r.grade === 'destroyed').length;
    const holdouts = structural.filter((r) => r.grade !== 'destroyed');
    const needList = structural.map((r) => r.endurance?.p90).filter((v) => v);
    const need = needList.length === structural.length && needList.length
      ? Math.max(...needList) : null;

    const avgMiss = this.shots.reduce((a, b) => a + b.missM, 0) / rounds;
    const secondary = (this.secondaries ?? []).length;
    // **효율은 임무를 마쳤을 때만 뜻이 있다.** 두 발만 쏘고 그만두면 「필요 13발을
    // 2발로 끝냈다(650 %)」가 되는데, 실제로는 세 동이 멀쩡히 서 있다. 미완수는
    // 효율이 좋은 것이 아니라 **평가할 수 없는** 것이다.
    const efficiency = holdouts.length || !need ? null : need / rounds;

    let grade = 'C';
    let verdict;
    if (holdouts.length) {
      const share = downed / Math.max(1, structural.length);
      grade = share >= 0.6 ? 'C' : 'D';
      verdict = `${holdouts.length}개 구조물이 남았습니다 — ${holdouts.map((r) => r.name).join(' · ')}`;
      if (need) verdict += ` (전부 무력화하려면 ${need}발이 필요합니다)`;
    } else if (!need) {
      grade = 'B';
      verdict = '전 구조물 무력화. 최소 필요 발수를 산출할 수 없어 효율은 평가하지 않았습니다.';
    } else if (rounds <= need) {
      grade = rounds <= Math.ceil(need * 0.7) ? 'S' : 'A';
      verdict = `전 구조물 무력화 — 필요 ${need}발을 ${rounds}발로 끝냈습니다.`;
    } else if (rounds <= need * 1.5) {
      grade = 'B';
      verdict = `전 구조물 무력화 — 필요 ${need}발보다 ${rounds - need}발 더 썼습니다.`;
    } else {
      grade = 'C';
      verdict = `전 구조물 무력화 — 필요 ${need}발의 ${(rounds / need).toFixed(1)}배를 썼습니다.`;
    }
    if (secondary) {
      verdict += ` 탄약고 ${secondary}건이 유폭해 둘레를 함께 지웠습니다.`;
    }
    return {
      grade, verdict, rounds, need, efficiency, avgMiss, counts, downed,
      structural: structural.length, holdouts: holdouts.map((r) => r.name), secondary,
      munition: this.plan.munition.short, fuze: this.plan.fuze.name,
      effectiveKg: Math.round(this.rings.effectiveKg),
    };
  }

  // ═══════════════ 보고서 ═══════════════

  report(notes, collateral) {
    if (!this.plan?.impact || !this.rings) return null;
    return createStrikeReport({
      munition: this.plan.munition, fuze: this.plan.fuze, rings: this.rings,
      impact: this.plan.impact, launchAzDeg: this.plan.azDeg,
      rounds: this.shots.length, gapS: this.timeline?.gapS ?? 0, shots: this.shots,
      secondaries: this.secondaries,
      rows: this.rows, collateral, notes: notes ?? '',
    });
  }

  // ═══════════════ 정리 ═══════════════

  clear() {
    this.pause();
    this.plan = null; this.rings = null; this.timeline = null; this.rows = []; this.shots = []; this.secondaries = []; this.t = 0;
    this.missionBase = new Map();
    this._revived = new Set();
    this._clearStatic();
    this.clearVulnerability();
    this._beamEnts = [];
    for (const e of [...this.ds.entities.values]) {
      if (String(e.id).startsWith('sk-tgt-')) this.ds.entities.remove(e);
    }
    this._hideAll();
    this.particles.reset();
    this.audio.clear();
    this.numbers.clear();
    this.feed.clear();
    this.hits = [];
    this.logEvents = [];
    this.shockwave.disable();
    this._fired.clear();
    this.restoreBuildings();
    if (this._flashEl) this._flashEl.style.opacity = '0';
    const wrap = document.getElementById('cesiumContainer');
    if (wrap) wrap.style.transform = '';
  }

  destroy() {
    this.clear();
    this.cancelDesignate();
    this.modelToken++;
    const scene = this.viewer.scene;
    for (const m of [this.models.munition, ...this.models.craters, ...this.models.rubble]) {
      if (m && !m.isDestroyed?.()) scene.primitives.remove(m);
    }
    this.models = { munition: null, craters: [], rubble: [] };
    this.particles.destroy();
    this.shockwave.destroy();
    this.audio.destroy();
    this.feed.destroy();
    this.handler?.destroy();
    this.viewer.dataSources.remove(this.ds, true);
    this._flashEl?.remove();
    this._flashEl = null;
  }
}
