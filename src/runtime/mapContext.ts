// @ts-nocheck
/**
 * 지도 우클릭 컨텍스트 메뉴 + 선택 시설 키보드 니지 — "지도 위 어디든 작업대"
 *
 *  우클릭(빈 지형):
 *   · 👁 여기서 1인칭 보기 — 일반화된 관측점(vantage) 계약으로 임시 마스트(2~25m)를 세워
 *     그 자리 시야를 봄. "이 능선에 부감시소를 두면 보일까"를 3초 만에 답한다.
 *   · 🎯 GP 기준 제원 — 거리·방위(도/밀)·표고 토스트 + 클립보드
 *   · 📋 MGRS 복사
 *   · 🏗 여기에 시설 배치 (핵심 4종 바로 배치, 검증 게이트 사유 표시)
 *   · ✈ 카메라 이동
 *
 *  키보드 니지 (배치 정밀 조정):
 *   · 시설 선택 상태에서 화살표 = 2m 이동(Shift=8m), R = 45° 회전
 *   · 이동마다 지형 재견적·검증(겹침이면 자동 복귀) — placer.move 경유
 *
 *  가드: 측정/스케치 작도 중(우클릭이 완성 동작), 1인칭/도보/드론 중엔 비활성.
 */
import { svgIcon } from './icons';
import { SITE } from './data';
import { offset, distM, azimuthDeg } from './geo';
import { toMGRS } from './mgrs';
import { degToMils } from './assets';
import { FACILITY_CATALOG } from './placement';
import { mapUiBusy } from './interactionMode';

const QUICK_SPECS = ['security-zone', 'living-zone', 'storage-zone', 'command-zone'];

export function initMapContext(viewer, ctx) {
  // ctx: { state, toast, switchTab }
  const wrap = document.querySelector('#map-wrap');
  const menu = document.createElement('div');
  menu.id = 'ctx-menu';
  menu.className = 'hidden';
  wrap.appendChild(menu);

  const st = ctx.state;
  // 예전엔 여기서 st.coa.mode / st.sketch.mode 를 봤는데 실제 필드는 coa.tool / routeSketch.active 라
  // 늘 false 였다 — 작도 중 우클릭이 「완성」 대신 컨텍스트 메뉴를 열었다. 판정은 한 곳에서만 한다.
  const busy = () => mapUiBusy(st);

  const close = () => menu.classList.add('hidden');
  document.addEventListener('click', (e) => { if (!e.target.closest('#ctx-menu')) close(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });

  const pickLL = (pos) => {
    // GP 정밀지형(globe.show=false) 표출 중엔 globe.pick 이 보이지도 않는 라이브
    // 지형과 광선을 맞춰 우클릭한 화면 지점과 다른 위경도를 반환한다(경사면일수록
    // 어긋남이 커짐) — 실제로 그려진 표면(GLB 포함)을 그대로 잡는 pickPosition 우선.
    const rt = ctx.state?.realTerrain;
    let cart = null;
    if (rt?.active && viewer.scene.pickPositionSupported) {
      cart = viewer.scene.pickPosition(pos);
    } else {
      const ray = viewer.camera.getPickRay(pos);
      cart = ray && viewer.scene.globe.pick(ray, viewer.scene);
    }
    if (!cart) return null;
    const c = Cesium.Cartographic.fromCartesian(cart);
    return { lon: Cesium.Math.toDegrees(c.longitude), lat: Cesium.Math.toDegrees(c.latitude), h: c.height };
  };

  const openAt = (winPos) => {
    const ll = pickLL(winPos);
    if (!ll) return;
    const mgrs = toMGRS(ll.lon, ll.lat);
    const d = distM(SITE.gp.lon, SITE.gp.lat, ll.lon, ll.lat);
    const az = azimuthDeg(SITE.gp.lon, SITE.gp.lat, ll.lon, ll.lat);
    menu.innerHTML = `
      <div class="cm-head">${mgrs}<br><span class="muted">GP ${(d / 1000).toFixed(2)}km · ${Math.round(az)}° · 표고 ${Math.round(ll.h)}m</span></div>
      <button class="cm-item" data-act="fpv">${svgIcon('eye')} 여기서 1인칭 보기</button>
      <button class="cm-item" data-act="spec">${svgIcon('target')} GP 기준 제원 복사</button>
      <button class="cm-item" data-act="mgrs">${svgIcon('clipboard')} MGRS 복사</button>
      <div class="cm-sub">${svgIcon('build')} 여기에 시설 배치</div>
      ${QUICK_SPECS.map((id) => {
    const s = FACILITY_CATALOG.find((x) => x.id === id);
    return `<button class="cm-item cm-spec" data-spec="${id}">
      <span class="c-chip" style="background:${s.color};width:8px;height:8px;display:inline-block;margin-right:6px"></span>${s.name}</button>`;
  }).join('')}
      <button class="cm-item" data-act="fly">${svgIcon('plane')} 여기로 카메라</button>`;
    menu.classList.remove('hidden');
    const r = menu.getBoundingClientRect();
    const wr = wrap.getBoundingClientRect();
    menu.style.left = `${Math.min(winPos.x, wr.width - r.width - 8)}px`;
    menu.style.top = `${Math.min(winPos.y, wr.height - r.height - 8)}px`;

    menu.querySelectorAll('[data-act]').forEach((b) => {
      b.onclick = () => {
        close();
        if (b.dataset.act === 'fpv') enterSpotFpv(ll, mgrs);
        else if (b.dataset.act === 'mgrs') {
          navigator.clipboard?.writeText(mgrs);
          ctx.toast(`복사됨 — ${mgrs}`);
        } else if (b.dataset.act === 'spec') {
          const txt = `MGRS ${mgrs} · GP ${(d / 1000).toFixed(2)}km · 방위 ${Math.round(az)}° (${degToMils(az).toLocaleString()}밀) · 표고 ${Math.round(ll.h)}m`;
          navigator.clipboard?.writeText(txt);
          ctx.toast(`제원 복사 — ${txt}`, 5200);
        } else if (b.dataset.act === 'fly') {
          viewer.camera.flyTo({
            destination: Cesium.Cartesian3.fromDegrees(ll.lon, ll.lat - 0.004, ll.h + 420),
            orientation: { heading: 0, pitch: Cesium.Math.toRadians(-38), roll: 0 },
            duration: 1.4,
          });
        }
      };
    });
    menu.querySelectorAll('[data-spec]').forEach((b) => {
      b.onclick = async () => {
        close();
        const spec = FACILITY_CATALOG.find((x) => x.id === b.dataset.spec);
        const it = await st.placer.place(b.dataset.spec, ll.lon, ll.lat)
          .catch((e) => { console.warn(e); return null; });
        if (it && !it.blocked) {
          ctx.switchTab('build');
          ctx.toast(`${spec.name} 배치 — ${(it.cost.totalKrw / 1e8).toFixed(1)}억 (화살표 키로 미세 이동, R 회전)`, 5200);
        } else {
          ctx.toast(it?.blocked ? `배치 불가: ${it.blocked}` : '배치 실패 — 지형 견적을 낼 수 없는 지점입니다', 5200);
        }
      };
    });
  };

  const enterSpotFpv = async (ll, mgrs) => {
    // 임시 관측점 — 일반화된 vantage 계약 (fpv.js)
    let mastH = 4;
    const vantage = {
      id: `spot-${Date.now()}`, kind: 'spot',
      name: '임시 관측점 (우클릭 지점)',
      sub: `${mgrs} · 표고 ${Math.round(ll.h)}m — 마스트를 올려 부감시소 후보를 검토하세요`,
      lon: ll.lon, lat: ll.lat, groundH: ll.h,
      height: mastH, adjustable: true, minH: 2, maxH: 25,
      heightLabel: '마스트고',
      setHeight: (h) => { mastH = h; },
      headingDeg: SITE.sector.centerAz,
    };
    st.walk?.active && st.walk.exitSilent();
    st.drone?.active && st.drone.exit();
    st.fpv.enter(vantage);
    ctx.toast('임시 관측점 — 휠 배율 · 슬라이더로 마스트 증고 · ESC 종료', 4600);
  };

  const handler = new Cesium.ScreenSpaceEventHandler(viewer.canvas);
  handler.setInputAction((ev) => {
    if (busy()) return;
    openAt(ev.position);
  }, Cesium.ScreenSpaceEventType.RIGHT_CLICK);

  // ── 키보드 니지 ──
  let moving = false;
  document.addEventListener('keydown', async (e) => {
    if (busy()) return;
    if (e.target.closest?.('input, textarea, select') || e.target.isContentEditable) return;
    const uid = st.placer?.selectedUid;
    if (!uid) return;
    const item = st.placer.items.find((i) => i.uid === uid);
    if (!item) return;
    const AZ = { ArrowUp: 0, ArrowRight: 90, ArrowDown: 180, ArrowLeft: 270 };
    if (e.key in AZ) {
      e.preventDefault();
      if (moving) return;                       // 지형 재견적 직렬화 (연타 드롭)
      moving = true;
      try {
        const p = offset(item.lon, item.lat, AZ[e.key], e.shiftKey ? 8 : 2);
        await st.placer.move(uid, p.lon, p.lat);
      } finally { moving = false; }
    } else if (e.key === 'r' || e.key === 'R') {
      e.preventDefault();
      item.headingDeg = (item.headingDeg + 45) % 360;
      st.placer._draw(item);
    }
  });

  return { openAt };
}

