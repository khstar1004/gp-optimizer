// @ts-nocheck
/**
 * 맵 다이렉트 인스펙터 — 3D 오브젝트를 클릭하면 그 자리에 앵커된 설정 팝업
 *
 *  · 감시탑 클릭  → 높이 슬라이더(실시간 증고/감고)·관측고·공사비·승탑/가시영역 버튼
 *  · 시설 클릭    → 인원/층수/회전/철거를 팝업에서 바로 (사이드바 안 열어도 됨)
 *  · 자산 거치 클릭 → 이름·위치·지향·커버 기여, 끄기/재최적화
 *  · 호버        → 커서 옆 이름 칩 (뭘 클릭할 수 있는지 미리 보임)
 *
 * 팝업은 지형 위 3D 앵커에 붙어 카메라를 따라다닌다 (postRender 투영 갱신).
 * 픽킹 id: 'gp-tower' / 'b\d+-box' / 'mount-<key>' (towerModel·buildingModels·sensorModels).
 */
import { SITE } from './data';
import { offset } from './geo';
import { MOUNTS } from './sensorModels';
import { svgIcon } from './icons';
import { WEAPON_IDS } from './assets';
import { POST_TYPE, POST_ENTITY_RE, POST_HANDLE_RE } from './sensorPosts';
import { functionsFor, attrsFor, FACILITY_SIZE_PRESETS, slopeVerdict } from './placement';
import { fmtM, VERDICT_COLOR, VERDICT_TEXT } from './sensorPerformance';
import { mapUiBusy } from './interactionMode';

const MOUNT_NAMES = {
  eo: 'EO 카메라 마스트', ir: 'IR 열상 마스트', radar: '지상감시레이더',
  acoustic: '음향탐지 어레이', cuas: '대드론 재머', flare: '조명탄 발사대', weapon: '중화기 진지',
};

export class MapInspector {
  /**
   * ctx: { state, setTowerHeight(h), towerCost(h)→억, toast, switchTab }
   */
  constructor(viewer, ctx) {
    this.viewer = viewer;
    this.ctx = ctx;
    this.anchor = null;        // () => Cartesian3
    this.current = null;       // {type, ...}
    this._buildDom();
    this._wirePick();
    viewer.scene.postRender.addEventListener(() => this._track());
  }

  _buildDom() {
    this.pop = document.createElement('div');
    this.pop.id = 'map-pop';
    this.pop.className = 'hidden';
    document.querySelector('#map-wrap').appendChild(this.pop);
    this.chip = document.createElement('div');
    this.chip.id = 'hover-chip';
    this.chip.className = 'hidden';
    document.querySelector('#map-wrap').appendChild(this.chip);
  }

  /**
   * 작도 중에는 팝업이 열려서도, 열린 채로 남아서도 안 된다 — 팝업은 DOM 이라
   * 캔버스 위에 떠서 **다음 클릭을 삼킨다**. 그러면 두 점째부터 찍히지 않는다.
   */
  _busy() {
    return mapUiBusy(this.ctx.state);
  }

  _wirePick() {
    const h = new Cesium.ScreenSpaceEventHandler(this.viewer.canvas);
    h.setInputAction((ev) => {
      if (this._busy()) { this.close(); return; }
      // 장식 엔티티(파티클·라벨)가 최상위를 가로챌 수 있어 drillPick으로 알려진 대상 탐색
      let hits = [];
      try { hits = this.viewer.scene.drillPick(ev.position, 4); } catch { /* noop */ }
      for (const p of hits) {
        const id = p?.id?.id;
        if (typeof id !== 'string') continue;
        if (id === 'gp-tower') return this.openTower();
        const b = id.match(/^(b\d+)-box$/);
        if (b) return this.openBuilding(b[1]);
        const m = id.match(/^mount-(\w+)$/);
        if (m) return this.openMount(m[1]);
        const sp = id.match(POST_ENTITY_RE);
        if (sp) return this.openPost(sp[1]);
      }
      this.close();
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

    // 호버 칩 (120ms 스로틀 픽)
    let last = 0;
    h.setInputAction((ev) => {
      const now = performance.now();
      if (now - last < 120) return;
      last = now;
      if (this._busy()) { this.chip.classList.add('hidden'); this.close(); return; }
      let name = null;
      try {
        const picked = this.viewer.scene.pick(ev.endPosition);
        const id = picked?.id?.id;
        if (typeof id === 'string') {
          if (id === 'gp-tower') name = `${svgIcon('tower')} 감시탑 ${this.ctx.state.ents.towerHeight}m — 클릭: 설정`;
          else if (/^b\d+-box$/.test(id)) {
            const it = this.ctx.state.placer.items.find((x) => id.startsWith(x.uid));
            if (it) name = `${it.spec.name} — 클릭: 설정`;
          } else {
            const mm = id.match(/^mount-(\w+)$/);
            if (mm && MOUNT_NAMES[mm[1]]) name = `${MOUNT_NAMES[mm[1]]} — 클릭: 정보`;
            const sp = id.match(POST_ENTITY_RE);
            const pp = sp && this.ctx.state.posts?.get(sp[1]);
            if (pp) {
              const perf = this.ctx.state.posts.perfOf(pp);
              const pt = POST_TYPE[pp.type];
              // 끌 수 있는 것은 손잡이(모델·마스트·라벨)뿐 — 부채꼴 위에서는 그렇게 안내하지 않는다
              const draggable = POST_HANDLE_RE.test(id);
              // 발전기는 실효거리가 없다 — 발전 용량으로 말한다
              const what = perf ? `실효 ${fmtM(perf.range)}` : `발전 ${pt.genW}W`;
              name = `${pt.icon} ${pp.name} · ${what} — 클릭: 설정`
                + (draggable ? ' / 끌기: 이동' : '');
            }
          }
        }
      } catch { /* pick 실패 무시 */ }
      if (name) {
        this.chip.innerHTML = name;
        this.chip.classList.remove('hidden');
        this.chip.style.left = `${ev.endPosition.x + 14}px`;
        this.chip.style.top = `${ev.endPosition.y + 10}px`;
        this.viewer.canvas.style.cursor = 'pointer';
      } else {
        this.chip.classList.add('hidden');
        this.viewer.canvas.style.cursor = '';
      }
    }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);
  }

  // ── 팝업 앵커 추적 ──
  _track() {
    if (!this.anchor || this.pop.classList.contains('hidden')) return;
    const st = Cesium.SceneTransforms.wgs84ToWindowCoordinates ?? Cesium.SceneTransforms.worldToWindowCoordinates;
    const win = st(this.viewer.scene, this.anchor());
    if (!win) { this.pop.style.opacity = '0'; return; }
    this.pop.style.opacity = '1';
    const r = this.pop.getBoundingClientRect();
    const wrap = document.querySelector('#map-wrap').getBoundingClientRect();
    const x = Math.max(8, Math.min(wrap.width - r.width - 8, win.x - r.width / 2));
    const y = Math.max(8, Math.min(wrap.height - r.height - 8, win.y - r.height - 18));
    this.pop.style.left = `${x}px`;
    this.pop.style.top = `${y}px`;
  }

  close() {
    this.pop.classList.add('hidden');
    this.anchor = null;
    this.current = null;
  }

  _show(html, anchorFn) {
    this.pop.innerHTML = `<button class="mp-close" title="닫기" aria-label="닫기">✕</button>${html}`;
    this.pop.querySelector('.mp-close').onclick = () => this.close();
    this.anchor = anchorFn;
    this.pop.classList.remove('hidden');
    this._track();
  }

  // ── ① 감시탑 ──
  openTower() {
    const { state, setTowerHeight, towerCost } = this.ctx;
    const render = () => {
      const h = state.ents.towerHeight;
      this._show(`
        <div class="mp-head">${svgIcon('tower')} 감시탑 GP-107</div>
        <div class="mp-row"><span>높이</span>
          <input type="range" id="mp-th" min="6" max="40" step="1" value="${h}">
          <b id="mp-th-v">${h}m</b></div>
        <div class="mp-kv"><span>관측고</span><b>${Math.round(state.ents.groundH + h + 2)}m</b>
          <span>공사비</span><b>${towerCost(h).toFixed(1)}억</b></div>
        <div class="mp-actions">
          <button class="btn" id="mp-fpv">승탑</button>
          <button class="btn" id="mp-vs">가시영역 갱신</button>
        </div>`,
      () => Cesium.Cartesian3.fromDegrees(SITE.gp.lon, SITE.gp.lat,
        state.ents.groundH + state.ents.towerHeight + 6));
      const sl = this.pop.querySelector('#mp-th');
      sl.oninput = () => {                       // 실시간 증고 — 팝업 리렌더 없이 값만 갱신
        setTowerHeight(+sl.value);
        this.pop.querySelector('#mp-th-v').textContent = `${sl.value}m`;
      };
      sl.onchange = () => render();              // 놓으면 비용/관측고 갱신
      this.pop.querySelector('#mp-fpv').onclick = () => { this.close(); this.ctx.enterFpv?.('tower'); };
      this.pop.querySelector('#mp-vs').onclick = () => { document.querySelector('#run-viewshed')?.click(); };
    };
    render();
    this.current = { type: 'tower' };
  }

  // ── ② 시설 ──
  openBuilding(uid) {
    const { state, switchTab, toast } = this.ctx;
    const item = state.placer.items.find((i) => i.uid === uid);
    if (!item) return this.close();
    state.placer.select(uid);
    const fmtEok = (krw) => `${(krw / 1e8).toFixed(1)}억`;
    const render = () => {
      const it = state.placer.items.find((i) => i.uid === uid);
      if (!it) return this.close();
      const fns = functionsFor(it.spec);
      const curFn = it.functionTag ?? fns[0];
      const sizeBtns = FACILITY_SIZE_PRESETS.map((p) =>
        `<button class="btn ${it.capacity === p.capacity ? 'primary' : ''}" data-sz="${p.capacity}">${p.label}</button>`).join('');
      // 시설별 세부 제원 — attr 정의를 순회해 select(옵션형)/range(수치형) 컨트롤 생성
      const selStyle = 'flex:1;min-width:0;background:var(--band,#161e27);color:var(--ink,#e8edf2);border:1px solid var(--line,#263140);padding:3px 6px;font-family:inherit;font-size:12px';
      const attrs = attrsFor(it.spec.id);
      const dv = it.details ?? {};
      const attrRows = attrs.map((a) => {
        const v = dv[a.key] ?? a.def;
        if (a.options) {
          return `<div class="mp-row"><span>${a.label}</span>
            <select class="mp-attr" data-k="${a.key}" style="${selStyle}">
              ${a.options.map((o) => `<option ${o === v ? 'selected' : ''}>${o}</option>`).join('')}
            </select></div>`;
        }
        return `<div class="mp-row"><span>${a.label}</span>
          <input type="range" class="mp-attr" data-k="${a.key}" data-unit="${a.unit ?? ''}" min="${a.min}" max="${a.max}" step="${a.step}" value="${v}">
          <b class="mp-attr-v" data-for="${a.key}">${v}${a.unit ?? ''}</b></div>`;
      }).join('');
      this._show(`
        <div class="mp-head"><span class="mp-dot" style="background:${it.spec.color}"></span>${it.spec.name}</div>
        <div class="mp-kv"><span>규모</span><b>${it.dims.widthM}×${it.dims.depthM}m · ${it.floors}층</b>
          <span>사업비</span><b>${fmtEok(it.cost.totalKrw)}</b></div>
        ${(() => {
          if (!Number.isFinite(it.slopeDeg)) return '';
          const sv = slopeVerdict(it.slopeDeg);
          const wall = Number.isFinite(it.wallMaxM) ? it.wallMaxM
            : (Number.isFinite(it.foundBottom) ? it.groundH - it.foundBottom : 0);
          const fill = Number.isFinite(it.fillM3) ? Math.round(it.fillM3) : null;
          return `<div class="mp-kv"><span>지반경사</span>
            <b style="color:${sv.color}">${it.slopeDeg.toFixed(0)}° · ${sv.label}</b>
            <span>최대 옹벽고</span><b>${wall.toFixed(1)}m</b></div>
          ${fill != null ? `<div class="mp-kv"><span>성토량</span><b>${fill.toLocaleString()}㎥</b>
            <span>토공 난이도</span><b style="color:${sv.color}">${sv.label}</b></div>` : ''}`;
        })()}
        <div class="mp-row"><span>기능</span>
          <select id="mp-fn" style="${selStyle}">
            ${fns.map((f) => `<option ${f === curFn ? 'selected' : ''}>${f}</option>`).join('')}
          </select></div>
        <div class="mp-row" style="gap:4px"><span>규모</span>${sizeBtns}</div>
        <div class="mp-row"><span>인원</span>
          <input type="range" id="mp-cap" min="4" max="60" step="2" value="${it.capacity}">
          <b id="mp-cap-v">${it.capacity}명</b></div>
        ${attrs.length ? `<div class="mp-sub">세부 제원</div>${attrRows}` : ''}
        <div class="mp-actions">
          <button class="btn" id="mp-fl-dn" ${it.floors <= 1 ? 'disabled' : ''}>−층</button>
          <b style="align-self:center">${it.floors}층</b>
          <button class="btn" id="mp-fl-up" ${it.floors >= 5 ? 'disabled' : ''}>+층</button>
          <button class="btn" id="mp-rot">↻45°</button>
          <button class="btn" id="mp-del">철거</button>
        </div>
        <div class="mp-actions">
          <button class="btn" id="mp-align" title="긴 변을 등고선에 맞춰 토공 최소화">⛰ 지형 정렬</button>
          <button class="btn" id="mp-fpv-b">${svgIcon('eye')} 1인칭</button>
          <button class="btn" id="mp-detail">상세</button>
        </div>`,
      () => {
        const cur = state.placer.items.find((i) => i.uid === uid);
        return Cesium.Cartesian3.fromDegrees(
          cur?.lon ?? it.lon, cur?.lat ?? it.lat,
          (cur?.groundH ?? it.groundH) + (cur?.floors ?? 1) * 3.2 + 4);
      });
      const fnSel = this.pop.querySelector('#mp-fn');
      if (fnSel) fnSel.onchange = () => {
        const cur = state.placer.items.find((i) => i.uid === uid);
        if (cur) { cur.functionTag = fnSel.value; state.placer._draw(cur); state.placer.onChange?.(); render(); }
      };
      this.pop.querySelectorAll('[data-sz]').forEach((b) => {
        b.onclick = async () => { await state.placer.reprice(uid, { capacity: +b.dataset.sz }); render(); };
      });
      // 시설별 세부 제원 — 값 변경 시 item.details 갱신 + 라벨 재그림 (사업비 불변 → reprice 불필요)
      this.pop.querySelectorAll('.mp-attr').forEach((el) => {
        const setVal = (redraw) => {
          const cur = state.placer.items.find((i) => i.uid === uid);
          if (!cur) return;
          if (!cur.details) cur.details = {};
          const isRange = el.type === 'range';
          cur.details[el.dataset.k] = isRange ? +el.value : el.value;
          if (isRange) {
            const vb = this.pop.querySelector(`.mp-attr-v[data-for="${el.dataset.k}"]`);
            if (vb) vb.textContent = `${el.value}${el.dataset.unit || ''}`;
          }
          state.placer._draw(cur);
          state.placer.onChange?.();
          if (redraw) render();
        };
        if (el.type === 'range') { el.oninput = () => setVal(false); el.onchange = () => setVal(true); }
        else el.onchange = () => setVal(true);
      });
      const cap = this.pop.querySelector('#mp-cap');
      cap.oninput = () => { this.pop.querySelector('#mp-cap-v').textContent = `${cap.value}명`; };
      cap.onchange = async () => { await state.placer.reprice(uid, { capacity: +cap.value }); render(); };
      this.pop.querySelector('#mp-fl-up').onclick = async () => { await state.placer.reprice(uid, { floors: it.floors + 1 }); render(); };
      this.pop.querySelector('#mp-fl-dn').onclick = async () => { await state.placer.reprice(uid, { floors: it.floors - 1 }); render(); };
      this.pop.querySelector('#mp-rot').onclick = () => {
        const cur = state.placer.items.find((i) => i.uid === uid);
        if (cur) { cur.headingDeg = (cur.headingDeg + 45) % 360; state.placer._draw(cur); state.placer.onChange?.(); render(); }
      };
      const alignBtn = this.pop.querySelector('#mp-align');
      if (alignBtn) alignBtn.onclick = async () => {
        const r = await state.placer.alignToTerrain(uid);
        toast(r ? '등고선에 맞춰 정렬 — 토공 최소화' : '정렬할 지형 정보가 없습니다 (정밀지형 필요)');
        render();
      };
      this.pop.querySelector('#mp-del').onclick = () => {
        state.placer.remove(uid);
        this.close();
        toast(`${it.spec.name} 철거 — Ctrl+Z 로 되돌릴 수 있습니다`);
      };
      this.pop.querySelector('#mp-fpv-b').onclick = () => { this.close(); this.ctx.enterFpv?.(`fac:${uid}`); };
      this.pop.querySelector('#mp-detail').onclick = () => { switchTab('build'); };
    };
    render();
    this.current = { type: 'building', uid };
  }

  // ── ③ 자산 거치 ──
  openMount(key) {
    const { state, toast } = this.ctx;
    const m = MOUNTS[key];
    if (!m) return this.close();
    const opt = state.assets.lastOptimization?.report?.perAsset?.find((r) => r.key === key);
    const pct = (v) => (v == null ? '—' : `${Math.round(v * 100)}%`);
    this._show(`
      <div class="mp-head">${MOUNT_NAMES[key] ?? key}</div>
      <div class="mp-kv"><span>위치</span><b>${m.az}° / ${m.dist}m</b>
        <span>지향</span><b>${Math.round(m.aimAz ?? m.heading?.() ?? 0)}°</b></div>
      ${opt ? `<div class="mp-kv"><span>합동 기여</span><b>+${pct(opt.marginal)}</b>
        <span>단독 커버</span><b>${pct(opt.coverage)}</b></div>` : ''}
      <div class="mp-actions">
        <button class="btn" id="mp-fpv-m">${svgIcon('eye')} 1인칭</button>
        ${['eo', 'ir', 'weapon', 'radar'].includes(key) ? `<button class="btn" id="mp-feed">${svgIcon('video')} 뷰</button>` : ''}
        <button class="btn" id="mp-off">끄기</button>
        <button class="btn" id="mp-reopt">재최적화</button>
      </div>`,
    () => {
      const p = offset(SITE.gp.lon, SITE.gp.lat, m.az, m.dist);
      const hh = state.assets.mounts.heights?.get(key) ?? state.ents.groundH;
      return Cesium.Cartesian3.fromDegrees(p.lon, p.lat, hh + 8);
    });
    this.pop.querySelector('#mp-fpv-m').onclick = () => { this.close(); this.ctx.enterFpv?.(`asset:${key}`); };
    const feedBtn = this.pop.querySelector('#mp-feed');
    if (feedBtn) feedBtn.onclick = () => { this.close(); state.sensorFeed?.open(key); };
    this.pop.querySelector('#mp-off').onclick = () => {
      if (key === 'weapon') WEAPON_IDS.forEach((id) => state.assets.toggle(id, false));
      else state.assets.toggle(key, false);
      this.close();
      toast(`${MOUNT_NAMES[key] ?? key} 표시 해제`);
    };
    this.pop.querySelector('#mp-reopt').onclick = () => { this.close(); document.querySelector('#asset-optimize')?.click(); };
    this.current = { type: 'mount', key };
  }

  // ── ④ 직접 배치 감시초소 ──
  openPost(uid) {
    const { state, toast } = this.ctx;
    const post = state.posts?.get(uid);
    if (!post) return this.close();
    const t = POST_TYPE[post.type];
    // 발전기는 실효거리·마스트·지향이 없다 — 작은 팝업으로 낼 것이 없으니 관리 창으로.
    if (t.genW) {
      this.close();
      state.posts.select(uid);
      state.manage?.openPost(uid);
      return;
    }
    const render = () => {
      const p = state.posts.get(uid);
      if (!p) return this.close();
      const perf = state.posts.perfOf(p);
      this._show(`
        <div class="mp-head" style="color:${t.color}">${t.icon} ${p.name} — ${t.name}</div>
        <div class="mp-kv"><span>실효 탐지</span>
          <b style="color:${VERDICT_COLOR[perf.verdict]}">${fmtM(perf.range)} (${Math.round(perf.factor * 100)}%)</b>
          <span>청천 제원</span><b>${fmtM(perf.specRange)}</b></div>
        <div class="mp-kv"><span>제한 요인</span>
          <b style="color:${VERDICT_COLOR[perf.verdict]}">${perf.limiter} · ${VERDICT_TEXT[perf.verdict]}</b>
          <span>D/R/I</span><b>${perf.dri.map(fmtM).join(' / ')}</b></div>
        <div class="mp-row"><span>마스트</span>
          <input type="range" id="mp-mast" min="${t.mast[1]}" max="${t.mast[2]}" step="0.5" value="${p.mastH}">
          <b id="mp-mast-v">${p.mastH.toFixed(1)}m</b></div>
        <div class="mp-row"><span>지향</span>
          <input type="range" id="mp-aim" min="0" max="359" step="1" value="${Math.round(p.aimAz)}">
          <b id="mp-aim-v">${Math.round(p.aimAz)}°</b></div>
        <div class="mp-actions">
          <button class="btn primary" id="mp-p-manage">⚙ 관리</button>
          <button class="btn" id="mp-p-fpv">${svgIcon('eye')} 1인칭</button>
          ${t.feed !== 'none' ? `<button class="btn" id="mp-p-feed">${svgIcon('video')} 피드</button>` : ''}
          <button class="btn" id="mp-p-del">철거</button>
        </div>
        <p class="mp-note">${perf.note}</p>`,
      () => {
        const cur = state.posts.get(uid) ?? p;
        return Cesium.Cartesian3.fromDegrees(cur.lon, cur.lat, cur.groundH + cur.mastH + 4);
      });
      const mast = this.pop.querySelector('#mp-mast');
      mast.oninput = () => {
        this.pop.querySelector('#mp-mast-v').textContent = `${(+mast.value).toFixed(1)}m`;
        state.posts.update(uid, { mastH: +mast.value });
      };
      mast.onchange = () => render();
      const aim = this.pop.querySelector('#mp-aim');
      aim.oninput = () => {
        this.pop.querySelector('#mp-aim-v').textContent = `${aim.value}°`;
        state.posts.update(uid, { aimAz: +aim.value });
      };
      aim.onchange = () => render();
      // 지도 팝업은 손바닥만 하다 — 제대로 손볼 것은 관리 창으로 넘긴다
      this.pop.querySelector('#mp-p-manage').onclick = () => {
        this.close();
        state.manage?.openPost(uid);
      };
      this.pop.querySelector('#mp-p-fpv').onclick = () => { this.close(); this.ctx.enterFpv?.(`post:${uid}`); };
      const fb = this.pop.querySelector('#mp-p-feed');
      if (fb) fb.onclick = () => { this.close(); state.sensorFeed?.open({ kind: 'post', uid }); };
      // 시설(mp-del)과 달리 감시자산 철거는 SitePlanStore 이력 밖이라 Ctrl+Z 로 안 돌아온다 —
      // 그래서 「전체 철거」와 같은 두 번 눌러 확정하는 무장 확인을 쓴다.
      this.ctx.armDestructive?.(this.pop.querySelector('#mp-p-del'), `${p.name} 철거 — 되돌릴 수 없습니다`, () => {
        state.posts.remove(uid);
        state.sensorFeed?.syncPosts();
        this.close();
        toast(`${p.name} 철거됨`);
      });
    };
    state.posts.select(uid);
    render();
    this.current = { type: 'post', uid };
  }
}

