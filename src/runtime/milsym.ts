// @ts-nocheck
/**
 * MIL-STD-2525 / APP-6 계열 군대부호 캔버스 생성기
 *  - 적 부대: 적색 마름모 프레임 + 병과 기호(보병 X / 차량화 X+타원 / 정찰 사선) + 제대 표시
 *  - 통제도식: NAI·TAI 구역 표기(직사각 라벨 박스), DP 결심지점(마름모 + 번호)
 * 실제 군용 심볼 서버(milsymbol.js) 표기 관례를 캔버스로 재현 — 외부 의존성 없음.
 * 반환은 dataURL (Cesium billboard.image). 키 캐시로 중복 생성 방지.
 */
const cache = new Map();

function mk(w, h) {
  const c = document.createElement('canvas');
  c.width = w * 2; c.height = h * 2;           // 레티나 선명도: 2배 렌더 + billboard scale 0.5
  const ctx = c.getContext('2d');
  ctx.scale(2, 2);
  return { c, ctx };
}

const HOSTILE_RED = '#ff4d4d';
const FRAME_FILL = 'rgba(255, 77, 77, 0.18)';

/**
 * 적 부대 부호 — frame: 마름모(적성), icon: 병과
 * type: 'infantry' | 'motorized' | 'recon'
 * echelon: 'team'(Ø) | 'squad'(●) | 'platoon'(●●●) | null
 */
export function hostileSymbol(type = 'infantry', echelon = 'squad') {
  const key = `h:${type}:${echelon}`;
  if (cache.has(key)) return cache.get(key);
  const W = 64, H = 72;
  const { c, ctx } = mk(W, H);
  const cx = W / 2, cy = H / 2 + 6, r = 24;

  // 마름모 프레임 (적성 = diamond)
  ctx.beginPath();
  ctx.moveTo(cx, cy - r); ctx.lineTo(cx + r, cy); ctx.lineTo(cx, cy + r); ctx.lineTo(cx - r, cy);
  ctx.closePath();
  ctx.fillStyle = FRAME_FILL; ctx.fill();
  ctx.lineWidth = 2.6; ctx.strokeStyle = HOSTILE_RED;
  ctx.shadowColor = 'rgba(0,0,0,0.9)'; ctx.shadowBlur = 3;
  ctx.stroke();
  ctx.shadowBlur = 0;

  // 병과 기호 (프레임 내접 사각 기준)
  const s = r * 0.52;
  ctx.lineWidth = 2.2; ctx.strokeStyle = HOSTILE_RED;
  if (type === 'infantry' || type === 'motorized') {
    // 보병 = 대각 교차선
    ctx.beginPath();
    ctx.moveTo(cx - s, cy - s * 0.72); ctx.lineTo(cx + s, cy + s * 0.72);
    ctx.moveTo(cx + s, cy - s * 0.72); ctx.lineTo(cx - s, cy + s * 0.72);
    ctx.stroke();
  }
  if (type === 'motorized') {
    // 차량화 = 하단 타원(기동 플랫폼)
    ctx.beginPath();
    ctx.ellipse(cx, cy + s * 0.55, s * 0.85, s * 0.34, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  if (type === 'recon') {
    // 정찰 = 단일 사선 (좌하→우상)
    ctx.beginPath();
    ctx.moveTo(cx - s, cy + s * 0.72); ctx.lineTo(cx + s, cy - s * 0.72);
    ctx.stroke();
  }

  // 제대 표시 (프레임 상단)
  ctx.fillStyle = HOSTILE_RED;
  const ey = cy - r - 8;
  if (echelon === 'team') {
    ctx.beginPath(); ctx.arc(cx, ey, 4, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx - 6, ey + 6); ctx.lineTo(cx + 6, ey - 6); ctx.stroke();
  } else if (echelon === 'squad') {
    ctx.beginPath(); ctx.arc(cx, ey, 3.4, 0, Math.PI * 2); ctx.fill();
  } else if (echelon === 'platoon') {
    [-9, 0, 9].forEach((dx) => {
      ctx.beginPath(); ctx.arc(cx + dx, ey, 3.4, 0, Math.PI * 2); ctx.fill();
    });
  }

  const url = c.toDataURL();
  cache.set(key, url);
  return url;
}

const CP_STYLE = {
  NAI: { color: '#64dfff', shape: 'rect' },
  TAI: { color: '#ff6969', shape: 'rect' },
  DP: { color: '#ffc857', shape: 'diamond' },
};

/** 통제도식 부호 — NAI/TAI 구역 박스, DP 마름모 */
export function controlSymbol(kind, n) {
  const key = `c:${kind}:${n}`;
  if (cache.has(key)) return cache.get(key);
  const st = CP_STYLE[kind] ?? CP_STYLE.NAI;
  const W = 84, H = 56;
  const { c, ctx } = mk(W, H);
  ctx.font = '700 17px "Chakra Petch", monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = 'rgba(0,0,0,0.9)'; ctx.shadowBlur = 3;

  if (st.shape === 'rect') {
    // MIL-STD 구역 표기: 라벨 박스 (NAI 1 / TAI 2)
    ctx.strokeStyle = st.color; ctx.lineWidth = 2.6;
    ctx.fillStyle = 'rgba(5, 12, 18, 0.78)';
    ctx.fillRect(6, 12, W - 12, 32);
    ctx.strokeRect(6, 12, W - 12, 32);
    ctx.shadowBlur = 0;
    ctx.fillStyle = st.color;
    ctx.fillText(`${kind} ${n}`, W / 2, 28.5);
  } else {
    // DP: 마름모 + 내부 번호 (결심지점 관례)
    const cx = W / 2, cy = H / 2, r = 24;
    ctx.beginPath();
    ctx.moveTo(cx, cy - r); ctx.lineTo(cx + r * 1.15, cy); ctx.lineTo(cx, cy + r); ctx.lineTo(cx - r * 1.15, cy);
    ctx.closePath();
    ctx.fillStyle = 'rgba(5, 12, 18, 0.78)'; ctx.fill();
    ctx.strokeStyle = st.color; ctx.lineWidth = 2.6; ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.fillStyle = st.color;
    ctx.font = '700 14px "Chakra Petch", monospace';
    ctx.fillText(`DP${n}`, cx, cy + 0.5);
  }

  const url = c.toDataURL();
  cache.set(key, url);
  return url;
}

