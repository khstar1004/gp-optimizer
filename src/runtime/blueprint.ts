// @ts-nocheck
/**
 * A3 배치도면 내보내기 — Scaffolda의 A3 도면 출력 기능 이식 (캔버스 렌더 → PNG)
 * 도면 스타일은 Scaffolda 라이트 CAD 크롬: 흰 지면, 밴드 표제란(#e8eef7),
 * 헤어라인(#d3dae4), 악센트(#1f6feb), tabular 수치.
 */
import { SITE } from './data';
import { lngLatToLocalMeters, computeProjectCost, fmtKrw, DIFFICULTY_LABELS } from './placement';
import { toMGRS } from './mgrs';

const INK = '#0f172a';
const LABEL = '#475569';
const MUTED = '#64748b';
const LINE = '#d3dae4';
const LINE_SOFT = '#e3e9f1';
const BAND = '#e8eef7';
const ACCENT = '#1f6feb';

/**
 * A3 가로 (420×297mm @ ~141dpi = 2339×1654px) 배치도면을 그려 PNG 다운로드
 */
export function renderBlueprint({ placer, towerHeight, towerCostKrw, ipbItems = [] }) {
  const W = 2339, H = 1654;
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, W, H);

  const origin = { lng: SITE.gp.lon, lat: SITE.gp.lat };
  const items = placer.items;

  // ── 도면 범위 (로컬미터): 타워+시설+IPB 포함, 최소 240m 스팬 ──
  let minX = -60, maxX = 60, minY = -60, maxY = 60;
  const grow = (x, y, m = 30) => {
    minX = Math.min(minX, x - m); maxX = Math.max(maxX, x + m);
    minY = Math.min(minY, y - m); maxY = Math.max(maxY, y + m);
  };
  for (const it of items) {
    const p = lngLatToLocalMeters(it.lon, it.lat, origin);
    grow(p.x, p.y, Math.max(it.dims.widthM, it.dims.depthM) / 2 + 24);
  }
  // 도면 작도 영역
  const M = 46;                       // 외곽 여백
  const sheetW = W - M * 2, sheetH = H - M * 2;
  const planX = M + 18, planY = M + 74;
  const planW = Math.round(sheetW * 0.66), planH = sheetH - 74 - 60;
  // 미터→픽셀 축척 (등방)
  const spanX = maxX - minX, spanY = maxY - minY;
  const scale = Math.min(planW / spanX, planH / spanY);
  const scaleDenom = Math.round(1000 / (scale * (25.4 / 141))); // 1px=25.4/141mm → 1:N
  const X = (x) => planX + (x - minX) * scale + (planW - spanX * scale) / 2;
  const Y = (y) => planY + (maxY - y) * scale + (planH - spanY * scale) / 2;

  // ── 외곽 테두리 + 표제 밴드 ──
  ctx.strokeStyle = INK; ctx.lineWidth = 2.4;
  ctx.strokeRect(M, M, sheetW, sheetH);
  ctx.fillStyle = BAND;
  ctx.fillRect(M, M, sheetW, 56);
  ctx.strokeStyle = LINE; ctx.lineWidth = 1;
  ctx.strokeRect(M, M, sheetW, 56);
  ctx.fillStyle = INK;
  ctx.font = '700 30px "Pretendard GOV", sans-serif';
  ctx.fillText('GP-107 시설 배치계획도', M + 24, M + 38);
  ctx.font = '500 17px "Chakra Petch", sans-serif';
  ctx.fillStyle = LABEL;
  const dateStr = new Date().toISOString().slice(0, 10);
  ctx.fillText(`SCALE 1:${scaleDenom}  ·  A3  ·  ${dateStr}  ·  기준점 MGRS ${toMGRS(SITE.gp.lon, SITE.gp.lat)}  ·  합성 데모 — 실좌표 아님`,
    M + 24 + ctx.measureText('').width + 470, M + 36);

  // ── 작도 영역 격자 (10m) ──
  ctx.save();
  ctx.beginPath();
  ctx.rect(planX, planY, planW, planH);
  ctx.clip();
  ctx.strokeStyle = LINE_SOFT; ctx.lineWidth = 0.7;
  const gridStep = scale * 10 < 14 ? 50 : 10;
  for (let gx = Math.ceil(minX / gridStep) * gridStep; gx <= maxX; gx += gridStep) {
    ctx.beginPath(); ctx.moveTo(X(gx), planY); ctx.lineTo(X(gx), planY + planH); ctx.stroke();
  }
  for (let gy = Math.ceil(minY / gridStep) * gridStep; gy <= maxY; gy += gridStep) {
    ctx.beginPath(); ctx.moveTo(planX, Y(gy)); ctx.lineTo(planX + planW, Y(gy)); ctx.stroke();
  }

  // ── 감시탑 심볼 + 책임구역 방위 ──
  ctx.strokeStyle = ACCENT; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(X(0), Y(0), 7 * scale, 0, Math.PI * 2); ctx.stroke();
  ctx.beginPath(); ctx.arc(X(0), Y(0), 2.4 * scale, 0, Math.PI * 2);
  ctx.fillStyle = ACCENT; ctx.fill();
  // 책임구역 부채꼴 (북 ±75°) 지시선
  ctx.setLineDash([8, 6]);
  for (const az of [-75, 75]) {
    const rad = (az * Math.PI) / 180;
    ctx.beginPath();
    ctx.moveTo(X(0), Y(0));
    ctx.lineTo(X(Math.sin(rad) * 90), Y(Math.cos(rad) * 90));
    ctx.stroke();
  }
  ctx.setLineDash([]);
  ctx.fillStyle = ACCENT;
  ctx.font = '600 15px "Pretendard GOV", sans-serif';
  ctx.fillText(`감시탑 H=${towerHeight}m`, X(0) + 10, Y(0) - 10);

  // ── 시설 사각형 (회전 반영) ──
  ctx.font = '600 13px "Pretendard GOV", sans-serif';
  for (const it of items) {
    const p = lngLatToLocalMeters(it.lon, it.lat, origin);
    const cx = X(p.x), cy = Y(p.y);
    const w = it.dims.widthM * scale, d = it.dims.depthM * scale;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate((-it.headingDeg * Math.PI) / 180);
    ctx.fillStyle = (it.spec.color ?? '#8494a6') + '33';
    ctx.strokeStyle = it.spec.color ?? '#8494a6';
    ctx.lineWidth = 1.6;
    ctx.fillRect(-w / 2, -d / 2, w, d);
    ctx.strokeRect(-w / 2, -d / 2, w, d);
    // 방호시설 해치 (대각선)
    if (it.protection === 'hardened') {
      ctx.save();
      ctx.beginPath(); ctx.rect(-w / 2, -d / 2, w, d); ctx.clip();
      ctx.lineWidth = 0.8;
      for (let hx = -w; hx < w + d; hx += 8) {
        ctx.beginPath(); ctx.moveTo(-w / 2 + hx, -d / 2); ctx.lineTo(-w / 2 + hx - d, d / 2); ctx.stroke();
      }
      ctx.restore();
    }
    ctx.restore();
    // 라벨 (비회전)
    ctx.fillStyle = INK;
    ctx.fillText(it.spec.name, cx - ctx.measureText(it.spec.name).width / 2, cy - 4);
    ctx.fillStyle = MUTED;
    ctx.font = '500 11.5px "Chakra Petch", sans-serif';
    const dim = `${it.dims.widthM.toFixed(0)}×${it.dims.depthM.toFixed(0)}m·${it.floors}F`;
    ctx.fillText(dim, cx - ctx.measureText(dim).width / 2, cy + 12);
    ctx.font = '600 13px "Pretendard GOV", sans-serif';
  }

  // ── IPB 도식 (⬠★■) ──
  ctx.font = '700 16px "Pretendard GOV", sans-serif';
  for (const it of ipbItems) {
    const p = lngLatToLocalMeters(it.lon, it.lat, origin);
    if (p.x < minX || p.x > maxX || p.y < minY || p.y > maxY) continue;
    const shape = it.kind === 'NAI' ? '⬠' : it.kind === 'DP' ? '★' : '■';
    ctx.fillStyle = it.kind === 'TAI' ? '#dc2626' : it.kind === 'DP' ? '#d97706' : ACCENT;
    ctx.fillText(`${shape} ${it.kind}`, X(p.x), Y(p.y));
  }
  ctx.restore(); // clip 해제

  ctx.strokeStyle = LINE; ctx.lineWidth = 1;
  ctx.strokeRect(planX, planY, planW, planH);

  // ── 방위표 + 축척바 ──
  const naX = planX + planW - 52, naY = planY + 56;
  ctx.strokeStyle = INK; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(naX, naY); ctx.lineTo(naX, naY - 40); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(naX, naY - 40); ctx.lineTo(naX - 7, naY - 24);
  ctx.lineTo(naX + 7, naY - 24); ctx.closePath();
  ctx.fillStyle = INK; ctx.fill();
  ctx.font = '700 18px "Chakra Petch", sans-serif';
  ctx.fillText('N', naX - 6, naY - 48);
  const sbM = gridStep * 2, sbPx = sbM * scale;
  const sbX = planX + 22, sbY = planY + planH - 26;
  ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(sbX, sbY); ctx.lineTo(sbX + sbPx, sbY); ctx.stroke();
  ctx.lineWidth = 1.4;
  for (const t of [0, 0.5, 1]) {
    ctx.beginPath(); ctx.moveTo(sbX + sbPx * t, sbY - 6); ctx.lineTo(sbX + sbPx * t, sbY + 6); ctx.stroke();
  }
  ctx.font = '500 14px "Chakra Petch", sans-serif';
  ctx.fillText(`0        ${sbM / 2}        ${sbM}m`, sbX, sbY - 12);

  // ── 우측: 사업개요표 + 시설 일람 + 범례 ──
  const tX = planX + planW + 22, tW = W - M - 18 - tX;
  let ty = planY;
  const band = (title) => {
    ctx.fillStyle = BAND; ctx.fillRect(tX, ty, tW, 34);
    ctx.strokeStyle = LINE; ctx.strokeRect(tX, ty, tW, 34);
    ctx.fillStyle = INK; ctx.font = '700 17px "Pretendard GOV", sans-serif';
    ctx.fillText(title, tX + 12, ty + 23);
    ty += 34;
  };
  const row = (k, v, strong = false) => {
    ctx.strokeStyle = LINE_SOFT; ctx.strokeRect(tX, ty, tW, 30);
    ctx.fillStyle = LABEL; ctx.font = '500 14.5px "Pretendard GOV", sans-serif';
    ctx.fillText(k, tX + 12, ty + 20);
    ctx.fillStyle = strong ? ACCENT : INK;
    ctx.font = `${strong ? 700 : 600} 15px "Chakra Petch", sans-serif`;
    ctx.fillText(v, tX + tW - 12 - ctx.measureText(v).width, ty + 20);
    ty += 30;
  };

  band('사업개요');
  const pc = computeProjectCost(items, towerCostKrw);
  const totalCap = items.reduce((a, b) => a + b.capacity, 0);
  row('시설 동수 / 수용인원', `${items.length}동 / ${totalCap}인`);
  row('연면적', `${pc.floorAreaM2.toFixed(0)}㎡`);
  row('공사비 (타워 포함)', fmtKrw(pc.constructionKrw));
  row('설계비 (76,000₩/㎡)', fmtKrw(pc.designFeeKrw));
  row('인허가 수수료', fmtKrw(pc.permitFeeKrw));
  row('총사업비', fmtKrw(pc.totalKrw), true);
  ty += 14;

  band('시설 일람');
  ctx.font = '600 13px "Pretendard GOV", sans-serif';
  for (const it of items.slice(0, 16)) {
    ctx.strokeStyle = LINE_SOFT; ctx.strokeRect(tX, ty, tW, 27);
    ctx.fillStyle = it.spec.color ?? '#8494a6';
    ctx.fillRect(tX + 10, ty + 8, 11, 11);
    ctx.strokeStyle = LINE; ctx.strokeRect(tX + 10, ty + 8, 11, 11);
    ctx.fillStyle = INK; ctx.font = '600 13.5px "Pretendard GOV", sans-serif';
    ctx.fillText(`${it.spec.name} ${it.capacity}인·${it.floors}F${it.protection === 'hardened' ? '·방호' : ''}`, tX + 30, ty + 19);
    ctx.fillStyle = MUTED; ctx.font = '500 13px "Chakra Petch", sans-serif';
    const cost = `${fmtKrw(it.cost.totalKrw)}·${DIFFICULTY_LABELS[it.cost.difficulty]}`;
    ctx.fillText(cost, tX + tW - 12 - ctx.measureText(cost).width, ty + 19);
    ty += 27;
  }
  if (items.length > 16) {
    ctx.fillStyle = MUTED;
    ctx.fillText(`외 ${items.length - 16}동`, tX + 12, ty + 18);
    ty += 27;
  }
  ty += 14;

  band('범례');
  ctx.font = '500 13.5px "Pretendard GOV", sans-serif';
  const legends = [
    ['◯ 감시탑 (H=' + towerHeight + 'm)', ACCENT],
    ['▨ 사선 해치 = 방호시설 기준 적용 (×4.2)', INK],
    ['⬠ NAI 감시집중 · ★ DP 결심 · ■ TAI 표적', INK],
    [`격자 ${gridStep}m · 좌표계 GP 중심 로컬미터`, MUTED],
  ];
  for (const [txt, color] of legends) {
    ctx.strokeStyle = LINE_SOFT; ctx.strokeRect(tX, ty, tW, 27);
    ctx.fillStyle = color;
    ctx.fillText(txt, tX + 12, ty + 18);
    ty += 27;
  }

  // ── 하단 표제란 (Scaffolda 표제 블록) ──
  ctx.fillStyle = BAND;
  ctx.fillRect(M, H - M - 44, sheetW, 44);
  ctx.strokeStyle = LINE; ctx.strokeRect(M, H - M - 44, sheetW, 44);
  ctx.fillStyle = LABEL;
  ctx.font = '500 14px "Pretendard GOV", sans-serif';
  ctx.fillText('GP Digital Twin 자동생성 · Scaffolda 산식(절성토 균형·4평/인·설계비·인허가) · 시공난이도는 1인당 부지비용 밴딩 · 본 도면은 합성 데모이며 실시설계 문서가 아님',
    M + 24, H - M - 17);

  return { canvas, scaleDenom, items: items.length, dateStr };
}

export function downloadBlueprint(result) {
  result.canvas.toBlob((blob) => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `gp-digital-twin-배치계획도-${result.dateStr}.png`;
    a.click();
    URL.revokeObjectURL(a.href);
  }, 'image/png');
}

/** 구버전 호환: 렌더 후 즉시 다운로드 */
export function exportBlueprint(opts) {
  const r = renderBlueprint(opts);
  downloadBlueprint(r);
  return r;
}

