// @ts-nocheck
/**
 * 작전 브리핑 모드 — 현 계획 데이터 기반 카메라 스텝 프레젠테이션
 *
 * 참모 브리핑 관례(상황→지형→위협→방책→자산→결심) 순서로, 각 스텝이
 * 카메라 플라이 + 캡션 카드(제목/본문)를 구성한다. 스텝 데이터는 호출측
 * (runtime/main.ts buildBriefingSteps)이 라이브 상태에서 생성해 넘긴다.
 *  - ◀▶/스텝 점 이동, Space 다음, Esc 종료, ▶자동재생(스텝당 9s)
 */
export class Briefing {
  constructor(viewer) {
    this.viewer = viewer;
    this.steps = [];
    this.idx = 0;
    this.active = false;
    this._timer = null;
    this.onExit = null;
    this._build();
  }

  _build() {
    const el = document.createElement('div');
    el.id = 'brief-overlay';
    el.className = 'hidden';
    el.innerHTML = `
      <div class="bf-card">
        <div class="bf-head">
          <span class="bf-eyebrow">작전 브리핑</span>
          <span class="bf-step" id="bf-stepno"></span>
          <button id="bf-close" title="종료 (Esc)" aria-label="브리핑 종료">✕</button>
        </div>
        <div class="bf-title" id="bf-title"></div>
        <div class="bf-body" id="bf-body"></div>
        <div class="bf-nav">
          <button id="bf-prev">◀ 이전</button>
          <div class="bf-dots" id="bf-dots"></div>
          <button id="bf-next">다음 ▶</button>
          <button id="bf-auto" title="자동 재생">▶ 자동</button>
        </div>
      </div>`;
    document.getElementById('map-wrap').appendChild(el);
    this.el = el;
    el.querySelector('#bf-close').onclick = () => this.exit();
    el.querySelector('#bf-prev').onclick = () => this.go(this.idx - 1);
    el.querySelector('#bf-next').onclick = () => this.go(this.idx + 1);
    el.querySelector('#bf-auto').onclick = () => this._toggleAuto();
    el.querySelector('#bf-dots').addEventListener('click', (e) => {
      const d = e.target.closest('.bf-dot');
      if (d) this.go(Number(d.dataset.i));
    });
    window.addEventListener('keydown', (e) => {
      if (!this.active) return;
      if (e.key === 'Escape') { e.preventDefault(); this.exit(); }
      else if (e.key === ' ' || e.key === 'ArrowRight') { e.preventDefault(); this.go(this.idx + 1); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); this.go(this.idx - 1); }
    });
  }

  present(steps) {
    if (!steps.length) return;
    this.steps = steps;
    this.active = true;
    this.el.classList.remove('hidden');
    this.el.querySelector('#bf-dots').innerHTML = steps.map((_, i) =>
      `<span class="bf-dot" data-i="${i}"></span>`).join('');
    this.go(0);
  }

  go(i) {
    if (i < 0) return;
    if (i >= this.steps.length) { this.exit(); return; }
    this.idx = i;
    const st = this.steps[i];
    this.el.querySelector('#bf-stepno').textContent = `${i + 1} / ${this.steps.length}`;
    this.el.querySelector('#bf-title').textContent = st.title;
    this.el.querySelector('#bf-body').innerHTML = st.html;
    this.el.querySelector('#bf-prev').disabled = i === 0;
    this.el.querySelector('#bf-next').textContent = i === this.steps.length - 1 ? '종료 ■' : '다음 ▶';
    this.el.querySelectorAll('.bf-dot').forEach((d, j) => d.classList.toggle('on', j === i));
    if (st.fly) {
      this.viewer.camera.flyTo({
        destination: Cesium.Cartesian3.fromDegrees(st.fly.lon, st.fly.lat, st.fly.h),
        orientation: {
          heading: Cesium.Math.toRadians(st.fly.heading ?? 0),
          pitch: Cesium.Math.toRadians(st.fly.pitch ?? -35),
          roll: 0,
        },
        duration: st.fly.duration ?? 2.2,
      });
    }
    try { st.on?.(); } catch (e) { console.warn('brief step hook', e); }
  }

  _toggleAuto() {
    const btn = this.el.querySelector('#bf-auto');
    if (this._timer) {
      clearInterval(this._timer);
      this._timer = null;
      btn.classList.remove('on');
      btn.textContent = '▶ 자동';
    } else {
      this._timer = setInterval(() => this.go(this.idx + 1), 9000);
      btn.classList.add('on');
      btn.textContent = '⏸ 정지';
    }
  }

  exit() {
    this.active = false;
    if (this._timer) { clearInterval(this._timer); this._timer = null; }
    const btn = this.el.querySelector('#bf-auto');
    btn.classList.remove('on'); btn.textContent = '▶ 자동';
    this.el.classList.add('hidden');
    this.onExit?.();
  }
}

