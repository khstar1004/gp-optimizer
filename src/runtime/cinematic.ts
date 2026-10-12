// @ts-nocheck
/**
 * 시네마틱 오버레이 — 투어를 「토스트 한 줄」에서 영화적 연출로 끌어올린다.
 *
 *  · 레터박스 상하 바(슬라이드 인/아웃)
 *  · 샷마다 캡션 카드(번호 / 제목 / 부제) 페이드·슬라이드 전환
 *  · 하단 진행 막대 + 「건너뛰기」
 *
 * cinematicTour(onStage(title, {index,total,sub})) 의 onStage 를 이 컨트롤러가 받아
 * 화면을 갱신한다. 순수 DOM — 씬 렌더 부하 없음.
 */
export class CinematicOverlay {
  constructor(mountSelector = '#map-wrap') {
    this.mount = document.querySelector(mountSelector) || document.body;
    this.el = null;
    this.onSkip = null;
  }

  _build() {
    if (this.el) return;
    const el = document.createElement('div');
    el.id = 'cine';
    el.className = 'cine hidden';
    el.innerHTML = `
      <div class="cine-bar cine-top"></div>
      <div class="cine-bar cine-bot"></div>
      <div class="cine-cap">
        <div class="cine-idx"></div>
        <div class="cine-title"></div>
        <div class="cine-sub"></div>
      </div>
      <button class="cine-skip" type="button">건너뛰기 ✕</button>
      <div class="cine-prog"><i></i></div>`;
    this.mount.appendChild(el);
    el.querySelector('.cine-skip').onclick = () => this.onSkip?.();
    this.el = el;
  }

  show(onSkip) {
    this._build();
    this.onSkip = onSkip;
    this.el.classList.remove('hidden');
    // reflow 후 클래스 부여 → 레터박스 바가 슬라이드 인
    void this.el.offsetWidth;
    this.el.classList.add('on');
  }

  /** 샷 전환 — 캡션·진행 갱신 (title=null 이면 종료) */
  stage(title, meta = {}) {
    if (!this.el) return;
    if (title == null) { this.hide(); return; }
    const idx = this.el.querySelector('.cine-idx');
    const ttl = this.el.querySelector('.cine-title');
    const sub = this.el.querySelector('.cine-sub');
    const cap = this.el.querySelector('.cine-cap');
    const { index = 1, total = 1, sub: subtext = '' } = meta;
    idx.textContent = `${String(index).padStart(2, '0')} / ${String(total).padStart(2, '0')}`;
    ttl.textContent = title;
    sub.textContent = subtext;
    // 재-트리거 애니메이션
    cap.classList.remove('in'); void cap.offsetWidth; cap.classList.add('in');
    const bar = this.el.querySelector('.cine-prog i');
    if (bar) bar.style.width = `${Math.round((index / total) * 100)}%`;
  }

  hide() {
    if (!this.el) return;
    this.el.classList.remove('on');
    const el = this.el;
    setTimeout(() => el.classList.add('hidden'), 480);
  }
}
