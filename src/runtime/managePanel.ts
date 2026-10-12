// @ts-nocheck
/**
 * 자산 관리 팝업 — 「목록에서 슬라이더를 만진다」에서 「그 자산을 관리한다」로
 *
 * 지금까지 감시자산을 손보려면 감시 탭 목록으로 돌아가야 했고, 지도를 보면서
 * 고칠 수는 없었다. 지도 팝업은 있었지만 손바닥만 해서 마스트와 지향 두 개가
 * 전부였다. 그런데 자산 하나를 앞에 두고 실제로 묻는 것은 그것보다 많다 —
 * **지금 무엇을 잡고 있고, 왜 그것밖에 못 보고, 얼마짜리이고, 어디로 옮길까.**
 *
 * 그래서 이 창은 **떠 있는 채로 지도를 조작할 수 있어야** 한다(끌어서 옮기고,
 * 닫지 않고 지도를 돌린다). 관제창(sensorFeed)과 같은 성격의 부유창이다.
 *
 * 두 종류를 같은 틀로 낸다:
 *   자산 관리   초소 하나 — 성능·위치·마스트·지향·현재 접촉·비용·조치
 *   편대 관리   드론 전체 — 상태·배터리·잔여 체공·고도·반경·페이로드·순찰 지점
 */
import { SITE } from './data';
import { azimuthDeg, distM } from './geo';
import { toMGRS } from './mgrs';
import { POST_TYPE } from './sensorPosts';
import { svgIcon } from './icons';
import { VERDICT_COLOR, VERDICT_TEXT, fmtM } from './sensorPerformance';
import {
  DRONE_SPEC, STATE_COLOR, STATE_LABEL, enduranceMin, fleetSummary,
} from './droneModel';
import { PAYLOAD_SPEC } from './droneFleet';
import { STATUS_COLOR, STATUS_LABEL, fmtFuelHours, shortfallW } from './powerGrid';

const pct = (v) => `${Math.round((v ?? 0) * 100)}%`;

export class ManagePanel {
  /**
   * @param ctx { state, toast, enterFpv, openFeed, flyTo, pickPatrol }
   */
  constructor(ctx) {
    this.ctx = ctx;
    this.mode = null;         // 'post' | 'fleet'
    this.uid = null;
    this._build();
  }

  get state() { return this.ctx.state; }

  _build() {
    const el = document.createElement('div');
    el.id = 'manage-panel';
    el.className = 'hidden';
    el.innerHTML = `
      <div class="mgp-head">
        <span class="mgp-icon"></span>
        <span class="mgp-title">자산 관리</span>
        <button class="mgp-btn mgp-close" title="닫기" aria-label="닫기">✕</button>
      </div>
      <div class="mgp-body"></div>`;
    document.querySelector('#map-wrap').appendChild(el);
    this.el = el;
    this.body = el.querySelector('.mgp-body');
    el.querySelector('.mgp-close').onclick = () => this.close();

    // 헤더를 잡아 끌면 창이 움직인다 — 지도를 보면서 손봐야 하므로 자리를 비켜 줄 수 있어야 한다.
    // 다만 포인터를 누른 즉시 캡처해 버리면, ✕ 바로 옆(헤더 배경)에서 눌러 살짝이라도
    // 움직인 뒤 ✕ 위에서 뗀 클릭까지 「드래그」로 먹혀 버려 닫기가 씹힌다(실측 재현됨) —
    // 그래서 이동 의도가 실제 움직임(4px)으로 확인된 뒤에야 캡처해 클릭과 드래그를 가른다.
    const head = el.querySelector('.mgp-head');
    let drag = null;
    head.addEventListener('pointerdown', (e) => {
      if (e.target.closest('.mgp-btn')) return;
      drag = {
        x: e.clientX - el.offsetLeft, y: e.clientY - el.offsetTop,
        startX: e.clientX, startY: e.clientY, pid: e.pointerId, moved: false,
      };
    });
    head.addEventListener('pointermove', (e) => {
      if (!drag) return;
      if (!drag.moved) {
        if (Math.abs(e.clientX - drag.startX) + Math.abs(e.clientY - drag.startY) < 4) return;
        drag.moved = true;
        head.setPointerCapture(drag.pid);
      }
      // 화면 밖으로 완전히 밀어내면 창이 「사라진 것」과 같아진다 — 헤더 한 조각은
      // 항상 지도 영역(offsetParent — style.left/top 가 실제로 놓이는 좌표계) 안에
      // 남겨 다시 잡을 수 있게 한다. window.innerWidth 는 사이드바까지 포함한 뷰포트
      // 전체 폭이라 이 좌표계와 안 맞는다(사이드바 폭만큼 어긋나 화면 밖으로 샌다).
      const parent = el.offsetParent ?? el.parentElement;
      const maxL = Math.max(0, parent.clientWidth - head.offsetWidth);
      const maxT = Math.max(0, parent.clientHeight - head.offsetHeight);
      el.style.left = `${Math.min(maxL, Math.max(0, e.clientX - drag.x))}px`;
      el.style.top = `${Math.min(maxT, Math.max(0, e.clientY - drag.y))}px`;
      el.style.right = 'auto';
    });
    head.addEventListener('pointerup', () => { drag = null; });
  }

  close() {
    this.el.classList.add('hidden');
    this.mode = null;
    this.uid = null;
    this.state.pickPatrolUid = null;
    this._reflow();
  }

  /** 이 창이 서거나 물러나면 관제벽이 차지할 수 있는 폭이 달라진다. */
  _reflow() {
    if (this.state.sensorFeed?.windows.length) this.state.sensorFeed.tile();
  }

  get isOpen() { return !this.el.classList.contains('hidden'); }

  openPost(uid) {
    const wasClosed = !this.isOpen;
    this.mode = 'post';
    this.uid = uid;
    this.state.posts?.select(uid);
    this.el.classList.remove('hidden');
    this.refresh();
    if (wasClosed) this._reflow();
  }

  openFleet() {
    const wasClosed = !this.isOpen;
    this.mode = 'fleet';
    this.uid = null;
    this.el.classList.remove('hidden');
    this.refresh();
    if (wasClosed) this._reflow();
  }

  /** 바깥에서 값이 바뀌면(감시 판정·배터리·지향 드래그) 다시 그린다. */
  refresh() {
    if (!this.isOpen) return;
    // 슬라이더를 잡고 있는 동안 다시 그리면 손에서 빠져나간다
    if (this._grabbing) return;
    if (this.mode === 'post') this._renderPost();
    else if (this.mode === 'fleet') this._renderFleet();
  }

  // ══════════════════════════════════════════════════════════════════════
  // 자산(초소) 관리
  // ══════════════════════════════════════════════════════════════════════
  _renderPost() {
    const st = this.state;
    const p = st.posts?.get(this.uid);
    if (!p) return this.close();
    const t = POST_TYPE[p.type];
    const perf = st.posts.perfOf(p);
    if (!perf) return this._renderGenerator(p, t);
    const az = Math.round(azimuthDeg(SITE.gp.lon, SITE.gp.lat, p.lon, p.lat));
    const d = Math.round(distM(SITE.gp.lon, SITE.gp.lat, p.lon, p.lat));

    // 이 자산이 지금 잡고 있는 것 — 상시 감시가 이미 판정해 둔 값을 읽는다
    const contacts = [];
    for (const [, w] of st.watch?.snapshot ?? new Map()) {
      const h = w.holders.find((x) => x.assetUid === this.uid);
      if (h) contacts.push({ name: w.name, ...h });
    }
    contacts.sort((a, b) => a.distM - b.distM);

    this.el.querySelector('.mgp-icon').textContent = t.icon;
    this.el.querySelector('.mgp-icon').style.color = t.color;
    this.el.querySelector('.mgp-title').textContent = `${p.name} — ${t.name}`;

    this.body.innerHTML = `
      <div class="mgp-status" style="border-left-color:${perf.offline ? '#ed5d5d' : VERDICT_COLOR[perf.verdict]}">
        <div class="mgp-big" style="color:${perf.offline ? '#ed5d5d' : VERDICT_COLOR[perf.verdict]}">${
          perf.offline ? '정지' : fmtM(perf.range)}</div>
        <div class="mgp-sub">청천 ${fmtM(perf.specRange)} · ${pct(perf.factor)} ·
          <b style="color:${VERDICT_COLOR[perf.verdict]}">${VERDICT_TEXT[perf.verdict]}</b></div>
        <div class="mgp-sub">제한 <b>${perf.limiter}</b> — ${perf.note}</div>
        <div class="mgp-bar"><i style="width:${Math.round(Math.min(1, perf.factor) * 100)}%;
          background:${VERDICT_COLOR[perf.verdict]}"></i></div>
      </div>

      <div class="mgp-sec">위치 · 제원</div>
      <div class="mgp-kv">
        <span>좌표</span><b>${toMGRS(p.lon, p.lat)}</b>
        <span>지반고</span><b>${Math.round(p.groundH)}m</b>
        <span>GP 기준</span><b>${az}° / ${d}m</b>
        <span>관측고</span><b>${Math.round(st.posts.eyeH(p))}m</b>
        <span>시야각</span><b>${t.fov >= 360 ? '전방위' : `${t.fov}°`}</b>
        <span>D / R / I</span><b>${perf.dri.map(fmtM).join(' / ')}</b>
        <span>역할 · 인원</span><b>${t.role ?? '—'} · ${t.crew ?? 0}명</b>
        <span>전력</span><b style="color:${perf.offline ? '#ed5d5d' : 'var(--ink-2)'}">${
          t.powerW ? `${t.powerW}W${perf.offline ? ' · 차단됨' : ''}` : '불요'}</b>
        ${t.losFree ? '<span>가시선</span><b>불요 (지형 무관)</b>' : ''}
      </div>
      ${perf.offline ? `<p class="mgp-warn">⚠ 발전 용량이 모자라 이 자산이 꺼져 있습니다.
        차단 순위 ${t.powerPri}/5 — 발전기를 늘리거나 우선순위가 낮은 자산을 빼면 되살아납니다.</p>` : ''}

      <div class="mgp-sec">설정</div>
      <label class="mgp-name"><span>호칭</span>
        <input type="text" id="mgp-name" value="${p.name.replace(/"/g, '&quot;')}" maxlength="16"></label>
      <div class="mgp-slider"><span>마스트</span>
        <input type="range" id="mgp-mast" min="${t.mast[1]}" max="${t.mast[2]}" step="0.5" value="${p.mastH}">
        <b>${p.mastH.toFixed(1)}m</b></div>
      <div class="mgp-slider"><span>지향</span>
        <input type="range" id="mgp-aim" min="0" max="359" step="1" value="${Math.round(p.aimAz)}">
        <b>${Math.round(p.aimAz)}°</b></div>
      <div class="mgp-row">
        <button class="btn" id="mgp-aim-tgt" ${contacts.length ? '' : 'disabled'}
          title="지금 잡고 있는 가장 가까운 표적 쪽으로 부채꼴을 돌립니다">⇄ 표적 지향</button>
        <button class="btn" id="mgp-move" title="지도에서 이 자산을 끌어 옮길 수 있습니다">⌖ 지도에서 보기</button>
      </div>

      <div class="mgp-sec">현재 접촉 ${contacts.length ? `(${contacts.length})` : ''}</div>
      ${contacts.length ? `<div class="mgp-contacts">${contacts.map((c) => `
        <div class="mgp-contact">
          <b>${c.name}</b>
          <span style="color:${c.grade === '식별' ? '#3dd68c' : c.grade === '인지' ? '#e3b341' : '#ed5d5d'}">${c.grade}</span>
          <span>${fmtM(c.distM)}</span>
          <span class="muted">Pd ${c.pd.toFixed(2)}</span>
        </div>`).join('')}</div>`
      : '<p class="mgp-empty">지금 이 자산의 부채꼴 안에 판정된 표적이 없습니다.</p>'}

      <div class="mgp-sec">조치</div>
      <div class="mgp-actions">
        <button class="btn primary" id="mgp-fpv">${svgIcon('eye')} 이 자산 시점</button>
        ${t.feed !== 'none' ? `<button class="btn" id="mgp-feed">${svgIcon('video')} 화면</button>` : ''}
        <button class="btn" id="mgp-clone">⧉ 복제</button>
        <button class="btn" id="mgp-del">철거 · ${t.costEok}억</button>
      </div>`;

    // ── 배선 ──
    const name = this.body.querySelector('#mgp-name');
    name.onchange = () => {
      const v = name.value.trim();
      if (v) st.posts.update(this.uid, { name: v });
      this.refresh();
    };
    this._bindSlider('#mgp-mast', (v, el2) => {
      el2.nextElementSibling.textContent = `${v.toFixed(1)}m`;
      st.posts.update(this.uid, { mastH: v });
    });
    this._bindSlider('#mgp-aim', (v, el2) => {
      el2.nextElementSibling.textContent = `${Math.round(v)}°`;
      st.posts.update(this.uid, { aimAz: v });
    });
    this.body.querySelector('#mgp-aim-tgt').onclick = () => {
      const c = contacts[0];
      if (!c) return;
      // 접촉의 방위는 상시 감시가 아니라 지금 좌표에서 다시 잰다 (판정과 표시가 어긋나지 않게)
      const w = [...(st.watch?.snapshot ?? new Map())].find(([, x]) =>
        x.holders.some((h) => h.assetUid === this.uid) && x.name === c.name);
      const tgt = w ? st.infil?.units?.find((u) => (u.rd?.route?.id ?? '') === w[0]) : null;
      let bearing = null;
      if (tgt) {
        try {
          const s = st.infil._state(tgt);
          bearing = azimuthDeg(p.lon, p.lat, s.p.lon, s.p.lat);
        } catch { /* noop */ }
      }
      if (bearing == null) { this.ctx.toast?.('표적 방위를 풀 수 없습니다', 2600); return; }
      st.posts.update(this.uid, { aimAz: bearing });
      this.ctx.toast?.(`${p.name} 지향 ${Math.round(bearing)}° — ${c.name} 쪽`, 3200);
      this.refresh();
    };
    this.body.querySelector('#mgp-move').onclick = () => {
      this.ctx.flyTo?.(p.lon, p.lat, p.groundH);
      this.ctx.toast?.('지도에서 자산 모델을 끌어 옮길 수 있습니다', 3600);
    };
    this.body.querySelector('#mgp-fpv').onclick = () => this.ctx.enterFpv?.(`post:${this.uid}`);
    const fb = this.body.querySelector('#mgp-feed');
    if (fb) fb.onclick = () => this.ctx.openFeed?.({ kind: 'post', uid: this.uid });
    this.body.querySelector('#mgp-clone').onclick = async () => {
      // 바로 옆에 같은 제원으로 한 대 더 — 「하나 더 세우면 메워지나」를 즉시 시험한다
      const q = { lon: p.lon + 0.0016, lat: p.lat + 0.0016 };
      const made = await st.posts.add(p.type, q.lon, q.lat, { mastH: p.mastH, aimAz: p.aimAz });
      if (made) { this.ctx.toast?.(`${made.name} 복제 배치 — ${t.costEok}억`, 3200); this.openPost(made.uid); }
    };
    // 이 철거는 배치(SitePlanStore)와 달리 Ctrl+Z 로 안 돌아온다 — 두 번 눌러 확정한다.
    this.ctx.armDestructive?.(this.body.querySelector('#mgp-del'), `${p.name} 철거 — 되돌릴 수 없습니다`, () => {
      st.posts.remove(this.uid);
      st.sensorFeed?.syncPosts();
      this.ctx.toast?.(`${p.name} 철거됨`, 2600);
      this.close();
    });
  }

  /**
   * 발전기 관리.
   *
   * 보는 장비가 아니므로 실효거리도 부채꼴도 없다. 대신 이 창이 답해야 하는 것은
   * **「지금 이 GP 가 켤 수 있는 것이 무엇인가」**다 — 그래서 자기 제원이 아니라
   * 전원 수지 전체를 함께 낸다.
   */
  _renderGenerator(p, t) {
    const st = this.state;
    const bal = st.power;
    const az = Math.round(azimuthDeg(SITE.gp.lon, SITE.gp.lat, p.lon, p.lat));
    const d = Math.round(distM(SITE.gp.lon, SITE.gp.lat, p.lon, p.lat));
    const running = p.running !== false;
    const col = bal ? STATUS_COLOR[bal.status] : '#7f8c98';

    this.el.querySelector('.mgp-icon').textContent = t.icon;
    this.el.querySelector('.mgp-icon').style.color = t.color;
    this.el.querySelector('.mgp-title').textContent = `${p.name} — ${t.name}`;

    this.body.innerHTML = `
      <div class="mgp-status" style="border-left-color:${running ? '#3dd68c' : '#ed5d5d'}">
        <div class="mgp-big" style="color:${running ? '#3dd68c' : '#ed5d5d'}">${running ? '가동' : '정지'}</div>
        <div class="mgp-sub">정격 ${t.genW}W · 연료 ${t.fuelL}L</div>
        ${bal ? `<div class="mgp-sub">GP 전원 <b style="color:${col}">${STATUS_LABEL[bal.status]}</b> —
          ${bal.servedW}W / ${bal.supplyW}W · 잔량 ${fmtFuelHours(bal.fuelHours)}</div>
        <div class="mgp-bar"><i style="width:${Math.round(Math.min(1, bal.ratio) * 100)}%;background:${col}"></i></div>`
      : ''}
      </div>

      <div class="mgp-sec">위치 · 제원</div>
      <div class="mgp-kv">
        <span>좌표</span><b>${toMGRS(p.lon, p.lat)}</b>
        <span>GP 기준</span><b>${az}° / ${d}m</b>
        <span>발전 용량</span><b>${t.genW}W</b>
        <span>연료 소모</span><b>무부하 ${t.idleLph}L/h · 정격 ${t.fullLph}L/h</b>
        <span>역할 · 인원</span><b>${t.role} · ${t.crew}명</b>
      </div>

      <div class="mgp-sec">설정</div>
      <label class="mgp-name"><span>호칭</span>
        <input type="text" id="mgp-name" value="${p.name.replace(/"/g, '&quot;')}" maxlength="16"></label>
      <div class="mgp-row">
        <button class="btn ${running ? '' : 'primary'}" id="mgp-genrun">${running ? '■ 정지' : '▶ 가동'}</button>
        <button class="btn" id="mgp-move">⌖ 지도에서 보기</button>
      </div>

      ${bal ? `<div class="mgp-sec">GP 전원 수지</div>
      <div class="mgp-kv">
        <span>요구 (한랭 보정)</span><b>${bal.demandW}W</b>
        <span>카탈로그 합</span><b>${bal.nominalW}W</b>
        <span>공급</span><b>${bal.supplyW}W</b>
        <span>부하율</span><b>${Math.round(bal.ratio * 100)}%</b>
      </div>
      <p class="mgp-empty">${bal.note}</p>
      ${bal.offline.length ? `<p class="mgp-warn">⚠ 전원 차단 ${bal.offline.length}개 —
        ${bal.offline.map((o) => o.name).join(' · ')}<br>
        발전 ${shortfallW(bal)}W 를 더 확보하면 전부 되살아납니다.</p>` : ''}` : ''}

      <div class="mgp-sec">조치</div>
      <div class="mgp-actions">
        <button class="btn" id="mgp-clone">⧉ 복제</button>
        <button class="btn" id="mgp-del">철거 · ${t.costEok}억</button>
      </div>`;

    const name = this.body.querySelector('#mgp-name');
    name.onchange = () => {
      const v = name.value.trim();
      if (v) st.posts.update(this.uid, { name: v });
      this.refresh();
    };
    this.body.querySelector('#mgp-genrun').onclick = () => {
      st.posts.update(this.uid, { running: !running });
      this.ctx.toast?.(`${p.name} ${running ? '정지' : '가동'}`, 2600);
      this.refresh();
    };
    this.body.querySelector('#mgp-move').onclick = () => this.ctx.flyTo?.(p.lon, p.lat, p.groundH);
    this.body.querySelector('#mgp-clone').onclick = async () => {
      const made = await st.posts.add(p.type, p.lon + 0.0012, p.lat + 0.0012, {});
      if (made) { this.ctx.toast?.(`${made.name} 복제 배치 — 발전 ${t.genW}W 추가`, 3200); this.openPost(made.uid); }
    };
    this.ctx.armDestructive?.(this.body.querySelector('#mgp-del'), `${p.name} 철거 — 되돌릴 수 없습니다`, () => {
      st.posts.remove(this.uid);
      this.ctx.toast?.(`${p.name} 철거됨 — 발전 ${t.genW}W 감소`, 3200);
      this.close();
    });
  }

  /** 슬라이더는 잡고 있는 동안 다시 그리지 않는다 — 손에서 빠져나가면 못 쓴다. */
  _bindSlider(sel, onInput) {
    const el = this.body.querySelector(sel);
    if (!el) return;
    el.addEventListener('pointerdown', () => { this._grabbing = true; });
    el.oninput = () => onInput(+el.value, el);
    const release = () => { this._grabbing = false; this.refresh(); };
    el.addEventListener('pointerup', release);
    el.addEventListener('change', release);
  }

  // ══════════════════════════════════════════════════════════════════════
  // 편대(드론) 관리
  // ══════════════════════════════════════════════════════════════════════
  _renderFleet() {
    const fleet = this.state.fleet;
    if (!fleet) return this.close();
    this.el.querySelector('.mgp-icon').innerHTML = svgIcon('drone');
    this.el.querySelector('.mgp-icon').style.color = '#63dfff';
    this.el.querySelector('.mgp-title').textContent = '드론 편대 관리';

    const picking = this.state.pickPatrolUid;
    // 요약·추가 버튼은 스크롤 밖으로 밀려나면 안 된다 — 기체가 늘어나 목록이
    // 길어질수록 「몇 대나 남았나」·「한 대 더 넣기」를 가장 자주 다시 찾게 되는
    // 자리이기 때문이다. 카드 목록만 그 아래에서 따로 스크롤되게 나눈다.
    this.body.innerHTML = `
      <div class="mgp-sticky-top">
        <div class="mgp-status" style="border-left-color:#63dfff">
          <div class="mgp-sub"><b>${fleetSummary(fleet.drones)}</b></div>
          <div class="mgp-sub">체공 ${DRONE_SPEC.enduranceMin}분 · 충전 ${DRONE_SPEC.chargeMin}분 ·
            배터리 ${pct(DRONE_SPEC.rtbBattery)} 이하면 <b>자동 복귀</b></div>
        </div>
        <div class="mgp-row"><button class="btn primary" id="mgp-add" style="flex:1">＋ 드론 추가</button></div>
        ${picking ? '<p class="mgp-pick">지도에서 순찰 중심으로 쓸 지점을 클릭하세요 (ESC 취소)</p>' : ''}
      </div>
      <div class="mgp-scroll">
        ${fleet.drones.length ? fleet.drones.map((d) => this._droneCard(d)).join('')
          : '<p class="mgp-empty">편대가 비어 있습니다 — 「＋ 드론 추가」로 기체를 편입하세요.</p>'}
        ${fleet.log.length ? `<div class="mgp-sec">편대 기록</div>
          <div class="mgp-flog">${fleet.log.slice(0, 6).map((l) =>
            `<div><b>${l.name}</b> ${l.text}</div>`).join('')}</div>` : ''}
      </div>`;

    this.body.querySelector('#mgp-add').onclick = () => {
      const d = fleet.add();
      this.ctx.toast?.(`${d.name} 편대 편입 — 출격 대기`, 3200);
      this.refresh();
    };
    for (const d of fleet.drones) this._bindDrone(d);
  }

  _droneCard(d) {
    const spec = PAYLOAD_SPEC[d.payload];
    const air = d.state === 'PATROL' || d.state === 'LAUNCH' || d.state === 'RTB';
    const low = d.battery <= DRONE_SPEC.criticalBattery;
    const bcol = low ? '#ed5d5d' : d.battery <= DRONE_SPEC.rtbBattery ? '#e3b341' : '#3dd68c';
    return `
      <div class="mgp-drone" data-uas="${d.uid}">
        <div class="mgp-drone-head">
          <b>${d.name}</b>
          <span class="mgp-chip" style="color:${STATE_COLOR[d.state]};border-color:${STATE_COLOR[d.state]}">
            ${STATE_LABEL[d.state]}</span>
          <span class="mgp-chip" style="color:${spec.color};border-color:${spec.color}">${spec.label}</span>
        </div>
        <div class="mgp-bar"><i style="width:${Math.round(d.battery * 100)}%;background:${bcol}"></i></div>
        <div class="mgp-sub">배터리 <b style="color:${bcol}">${Math.round(d.battery * 100)}%</b> ·
          ${air ? `잔여 체공 ${enduranceMin(d.battery).toFixed(0)}분` : `만충 시 ${DRONE_SPEC.enduranceMin}분`} ·
          소티 ${d.sorties}회 · 누적 ${d.flownMin.toFixed(0)}분</div>
        <div class="mgp-sub">AGL <b>${Math.round(d.curAglM)}m</b> / 지정 ${Math.round(d.aglM)}m ·
          궤도 R${Math.round(d.radiusM)}m · 순찰 ${toMGRS(d.patrolLon, d.patrolLat)}</div>
        <div class="mgp-slider"><span>고도</span>
          <input type="range" data-uas-agl="${d.uid}" min="${DRONE_SPEC.minAglM}" max="${DRONE_SPEC.maxAglM}"
            step="10" value="${Math.round(d.aglM)}"><b>${Math.round(d.aglM)}m</b></div>
        <div class="mgp-slider"><span>반경</span>
          <input type="range" data-uas-r="${d.uid}" min="${DRONE_SPEC.minRadiusM}" max="${DRONE_SPEC.maxRadiusM}"
            step="50" value="${Math.round(d.radiusM)}"><b>${Math.round(d.radiusM)}m</b></div>
        <div class="mgp-actions">
          <button class="btn ${air ? '' : 'primary'}" data-uas-go="${d.uid}">${air ? '복귀' : '출격'}</button>
          <button class="btn" data-uas-pay="${d.uid}">${d.payload === 'eo' ? 'IR 로' : 'EO 로'}</button>
          <button class="btn" data-uas-pat="${d.uid}">순찰 지점</button>
          <button class="btn" data-uas-view="${d.uid}" ${air ? '' : 'disabled'}>시점</button>
          <button class="btn" data-uas-del="${d.uid}">제외</button>
        </div>
      </div>`;
  }

  _bindDrone(d) {
    const fleet = this.state.fleet;
    const q = (s) => this.body.querySelector(s);
    const agl = q(`[data-uas-agl="${d.uid}"]`);
    if (agl) {
      agl.addEventListener('pointerdown', () => { this._grabbing = true; });
      agl.oninput = () => { agl.nextElementSibling.textContent = `${agl.value}m`; fleet.update(d.uid, { aglM: +agl.value }); };
      const rel = () => { this._grabbing = false; this.refresh(); };
      agl.addEventListener('pointerup', rel); agl.addEventListener('change', rel);
    }
    const r = q(`[data-uas-r="${d.uid}"]`);
    if (r) {
      r.addEventListener('pointerdown', () => { this._grabbing = true; });
      r.oninput = () => { r.nextElementSibling.textContent = `${r.value}m`; fleet.update(d.uid, { radiusM: +r.value }); };
      const rel = () => { this._grabbing = false; this.refresh(); };
      r.addEventListener('pointerup', rel); r.addEventListener('change', rel);
    }
    const go = q(`[data-uas-go="${d.uid}"]`);
    if (go) {
      go.onclick = () => {
        const air = d.state === 'PATROL' || d.state === 'LAUNCH' || d.state === 'RTB';
        if (air) fleet.recall(d.uid); else fleet.launch(d.uid);
        this.refresh();
      };
    }
    q(`[data-uas-pay="${d.uid}"]`).onclick = () => {
      fleet.update(d.uid, { payload: d.payload === 'eo' ? 'ir' : 'eo' });
      this.ctx.toast?.(`${d.name} 페이로드 — ${PAYLOAD_SPEC[d.payload].label}`, 2600);
      this.refresh();
    };
    q(`[data-uas-pat="${d.uid}"]`).onclick = () => {
      this.state.pickPatrolUid = d.uid;
      this.ctx.toast?.(`${d.name} 순찰 중심 — 지도에서 지점을 클릭하세요 (ESC 취소)`, 4200);
      this.refresh();
    };
    const view = q(`[data-uas-view="${d.uid}"]`);
    if (view) view.onclick = () => this.ctx.enterDroneView?.(d.uid);
    q(`[data-uas-del="${d.uid}"]`).onclick = () => {
      fleet.remove(d.uid);
      this.ctx.toast?.(`${d.name} 편대 제외`, 2600);
      this.refresh();
    };
  }
}
