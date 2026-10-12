// @ts-nocheck
/**
 * 명령 팔레트 (Ctrl+K) — VS Code/Linear 관례의 퀵 액션 런처
 *  - register()로 액션 등록 {label, group, hint?, run}
 *  - 부분일치 + 초성 아님(간단 부분문자열) 필터, ↑↓ 이동, Enter 실행, Esc 닫기
 *  - 시점 모드(FPV/도보/드론) 중엔 열지 않음 (키 충돌 방지 — 호출측 가드)
 */
export class CommandPalette {
  constructor() {
    this.items = [];
    this.filtered = [];
    this.sel = 0;
    this._build();
  }

  register(items) { this.items.push(...items); }

  _build() {
    const el = document.createElement('div');
    el.id = 'cmdk';
    el.className = 'hidden';
    el.innerHTML = `
      <div class="ck-box">
        <div class="ck-head">
          <span class="ck-glyph">⌘</span>
          <input id="ck-input" type="text" placeholder="명령 검색…  (탭 이동 · 시점 · 분석 · 레이어 · 내보내기)" autocomplete="off" />
          <span class="ck-esc">ESC</span>
        </div>
        <div class="ck-list" id="ck-list"></div>
      </div>`;
    document.getElementById('map-wrap').appendChild(el);
    this.el = el;
    this.input = el.querySelector('#ck-input');
    this.list = el.querySelector('#ck-list');

    el.addEventListener('click', (e) => { if (e.target === el) this.close(); });
    this.input.addEventListener('input', () => { this.sel = 0; this._render(); });
    this.input.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown') { e.preventDefault(); this.sel = Math.min(this.sel + 1, this.filtered.length - 1); this._render(); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); this.sel = Math.max(this.sel - 1, 0); this._render(); }
      else if (e.key === 'Enter') { e.preventDefault(); this._run(this.filtered[this.sel]); }
      else if (e.key === 'Escape') { e.preventDefault(); this.close(); }
    });
    this.list.addEventListener('click', (e) => {
      const row = e.target.closest('.ck-row');
      if (row) this._run(this.filtered[Number(row.dataset.i)]);
    });
    // 입력창 keydown 만으로는 부족하다 — 목록을 클릭해 포커스가 빠지면 ESC 가 먹지 않는다.
    // ESC 는 이 앱 전체에서 「지금 열린 것을 닫는다」는 약속이라 예외를 두지 않는다.
    document.addEventListener('keydown', (e) => {
      if (e.key !== 'Escape' || !this.isOpen) return;
      e.preventDefault();
      this.close();
    });
  }

  open() {
    this.el.classList.remove('hidden');
    this.input.value = '';
    this.sel = 0;
    this._render();
    this.input.focus();
  }

  close() { this.el.classList.add('hidden'); this.input.blur(); }
  get isOpen() { return !this.el.classList.contains('hidden'); }

  _run(item) {
    if (!item) return;
    this.close();
    try { item.run(); } catch (e) { console.warn('palette action failed', e); }
  }

  _render() {
    const q = this.input.value.trim().toLowerCase();
    this.filtered = !q
      ? this.items
      : this.items.filter((it) =>
        it.label.toLowerCase().includes(q) || it.group.toLowerCase().includes(q)
        || (it.keywords ?? '').toLowerCase().includes(q));
    if (this.sel >= this.filtered.length) this.sel = 0;
    let lastGroup = null;
    this.list.innerHTML = this.filtered.map((it, i) => {
      const head = it.group !== lastGroup ? `<div class="ck-group">${it.group}</div>` : '';
      lastGroup = it.group;
      return `${head}
        <div class="ck-row${i === this.sel ? ' sel' : ''}" data-i="${i}">
          <span class="ck-label">${it.label}</span>
          ${it.hint ? `<span class="ck-hint">${it.hint}</span>` : ''}
        </div>`;
    }).join('') || '<div class="ck-empty">일치하는 명령 없음</div>';
    this.list.querySelector('.ck-row.sel')?.scrollIntoView({ block: 'nearest' });
  }
}

