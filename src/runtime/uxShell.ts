// @ts-nocheck
/**
 * 커맨드 브리지 셸 — 낑긴 사이드바 UX 전면 개편 (자체 완결 모듈)
 *
 *  ① 아이콘 레일: 가로 8탭 텍스트 스트립 → 세로 아이콘 레일 (호버 라벨, 공간 2배 확보)
 *  ② 섹션 아코디언: 모든 .sec 제목 클릭으로 접기/펴기 + 상태 기억 — 한 화면에 다 안 낑김
 *     (튜토리얼 스포트라이트 타깃이 접힌 섹션 안이면 자동으로 펼침)
 *  ③ 패널 폭 그립: 패널 오른쪽 모서리 드래그로 폭 조절(280~560px), 더블클릭 초기화
 *  ④ 섹션 제목 sticky: 길게 스크롤해도 지금 어느 섹션인지 항상 보임 (CSS)
 *
 * (예전에 있던 「퀵 액션 독」 — 지도 하단 중앙의 단축 버튼 6종 — 은 각 탭 안의
 *  실제 버튼과 똑같은 동작을 하나 더 띄워 둔 것이라 걷어냈다. 탭 안 버튼 하나로 충분하다.)
 *
 * runtime/main.ts 에서 initUxShell({...}) 한 번 호출로 전부 장착.
 */

import { svgIcon } from './icons';

const LS_COLLAPSED = 'gp_sec_collapsed_v1';
const LS_PANEL_W = 'gp_panel_w_v1';

// App.tsx(TSX)가 실제 탭 레일을 렌더링하므로 이 표는 React 가 아직 못 그린 초기 프레임의
// 폴백일 뿐이다 — 아이콘 이름은 icons.ts 와 반드시 같은 세트를 가리켜야 한다.
const TAB_ICONS = {
  twin: ['twin', '트윈'],
  gis: ['map', '지도'],
  training: ['training', '훈련근거'],
  damage: ['fires', '피해 시각화'],
  build: ['build', '배치'],
  watch: ['watch', '감시'],
  infil: ['infil', '침투'],
  ipb: ['ipb', '분석'],
  fires: ['fires', '화력'],
  decision: ['decision', '결심'],
  guide: ['guide', '설명서'],
};

export function initUxShell() {
  _railTabs();
  _accordion();
  _panelGrip();
}

// ── ① 아이콘 레일 ──
function _railTabs() {
  const panel = document.querySelector('#panel');
  const tabs = document.querySelectorAll('#tabs .tab');
  if (!panel || !tabs.length) return;
  panel.classList.add('rail-mode');
  tabs.forEach((t) => {
    const [icon, label] = TAB_ICONS[t.dataset.tab] ?? [null, t.textContent.trim()];
    if (t.querySelector('.rt-ic')) return;
    t.innerHTML = `<span class="rt-ic">${icon ? svgIcon(icon) : ''}</span><span class="rt-lb">${label}</span>`;
  });
}

// ── ② 섹션 아코디언 ──
function _collapsedSet() {
  try { return new Set(JSON.parse(localStorage.getItem(LS_COLLAPSED) || '[]')); } catch { return new Set(); }
}
function _saveCollapsed(set) {
  try { localStorage.setItem(LS_COLLAPSED, JSON.stringify([...set])); } catch { /* noop */ }
}
function _secKey(sec) {
  const t = sec.querySelector('.sec-title');
  return t ? (t.childNodes[0]?.textContent?.trim() ?? t.textContent.trim()) : '';
}

function _applyCollapsedStates(root) {
  const set = _collapsedSet();
  root.querySelectorAll('.sec').forEach((sec) => {
    const key = _secKey(sec);
    if (key && set.has(key)) sec.classList.add('collapsed');
  });
}

/**
 * 첫 방문 기본 접힘 프리셋.
 *
 * 기능이 쌓이면서 감시 탭 하나가 4,200px 이 됐다 — 열 개의 섹션이 전부 펴진 채로.
 * 그러면 정작 자주 쓰는 배치 목록을 보려고 매번 스크롤을 굴려야 한다.
 * **한 번 쓰고 마는 분석 도구는 접어 두고**, 늘 보는 것만 펴 둔다(접힘은 저장된다).
 */
const DEFAULT_COLLAPSED = [
  // 트윈 · 배치 · 침투
  '카메라', '환경', '계획 관리 (SitePlan)', '계획안 슬롯 — 안(案) 비교',
  '타워 관측 이벤트', '조작 요약', '새로 추가된 기능',
  '부지 종합 진단', '자동 배치', '시설 상세 설정 (인스펙터)',
  '선택 시설 비용 내역 (Scaffolda 산식)',
  // 감시 — 한 번 돌려 보는 분석 도구들
  '어디까지 보이는가 — 합동 커버리지',
  '언제 잡히고 어디가 비나 — 축선 시간축',
  '어디에 세워야 하나 — 자동 배치',
  '눈이 오면 얼마나 안 보이나 — 날씨 스윕',
  // 화력 — 원표는 필요할 때만 편다
  '탄약·발수 판단표 (원본 16행)', '부수피해평가 CDE (원본 27행)',
  '사격부대 제원 (원본 5개 부대)', '타격자산 · 사격계획 원표',
  // 지도
  '지형 소스', '렌더링 품질', '내보내기', '블렌더 3D 정밀지형',
  // 트윈 — GP 기준 사거리 층위 표출(감시 탭의 실배치와 다른 물음이라 늘 펴 둘 이유가 없다)
  '감시·화기 자산 가시거리', '가시영역',
];

/**
 * 설명 문단은 기본 2줄만 보인다.
 *
 * 이 앱의 문단은 「왜 이 숫자가 이렇게 나오는가」를 적어 둔 것이라 지울 수는 없다.
 * 그러나 늘 펼쳐 두면 그것이 화면의 대부분이 된다 — 감시 탭 한 곳에만 1,278자다.
 * 그래서 접어 두고, 궁금해진 순간에만 편다.
 */
function _clampNotes() {
  const body = document.querySelector('#panel-body');
  if (!body) return;
  body.addEventListener('click', (e) => {
    const para = e.target.closest('.sec > p.muted');
    if (!para || e.target.closest('a,button,input,select')) return;
    para.classList.toggle('open');
    _markClamped(body);
  });
}

/**
 * 실제로 잘린 문단에만 표식을 단다.
 *
 * 눌러지는 줄 모르면 그건 접은 것이 아니라 **지운 것**이다. 그렇다고 두 줄짜리
 * 짧은 문단에까지 「더보기」를 달면 그것대로 잡음이므로, 진짜 넘친 것만 표시한다.
 */
function _markClamped(root) {
  root.querySelectorAll('.sec > p.muted').forEach((el) => {
    if (el.classList.contains('open')) {
      el.classList.add('clamped');
      el.title = '눌러서 접기';
      return;
    }
    const over = el.scrollHeight - el.clientHeight > 2;
    el.classList.toggle('clamped', over);
    if (over) el.title = '눌러서 전문 보기';
    else el.removeAttribute('title');
  });
}

function _accordion() {
  const body = document.querySelector('#panel-body');
  if (!body) return;
  _clampNotes();
  try {
    if (!localStorage.getItem('gp_sec_preset_v2')) {
      localStorage.setItem('gp_sec_preset_v2', '1');
      const set = _collapsedSet();
      DEFAULT_COLLAPSED.forEach((k) => set.add(k));
      _saveCollapsed(set);
    }
  } catch { /* noop */ }
  _applyCollapsedStates(body);
  // 탭 리렌더 대응: 새로 그려진 섹션에도 저장된 접힘 상태 적용
  new MutationObserver(() => {
    clearTimeout(_accordion._t);
    _accordion._t = setTimeout(() => {
      _applyCollapsedStates(body);
      _markClamped(body);
    }, 200);
  }).observe(body, { childList: true, subtree: true });
  setTimeout(() => _markClamped(body), 400);

  document.addEventListener('click', (e) => {
    if (e.target.closest('.help-q')) return;          // 도움말 뱃지는 아코디언과 무관
    const title = e.target.closest('.sec-title');
    if (!title || !body.contains(title)) return;
    const sec = title.parentElement;
    if (!sec?.classList.contains('sec')) return;
    sec.classList.toggle('collapsed');
    const key = _secKey(sec);
    if (!key) return;
    const set = _collapsedSet();
    if (sec.classList.contains('collapsed')) set.add(key);
    else set.delete(key);
    _saveCollapsed(set);
  });

  // 솔로 모드: 제목 더블클릭 → 이 섹션만 펴고 같은 탭의 나머지는 접기 (다시 더블클릭 = 전체 펴기)
  document.addEventListener('dblclick', (e) => {
    const title = e.target.closest('.sec-title');
    if (!title || !body.contains(title)) return;
    const sec = title.parentElement;
    const page = sec?.closest('.tab-page');
    if (!page) return;
    const siblings = [...page.querySelectorAll('.sec')].filter((x) => x !== sec);
    const soloAlready = !sec.classList.contains('collapsed')
      && siblings.every((x) => x.classList.contains('collapsed'));
    const set = _collapsedSet();
    if (soloAlready) {                                  // 전체 펴기
      siblings.forEach((x) => { x.classList.remove('collapsed'); set.delete(_secKey(x)); });
    } else {                                            // 솔로
      sec.classList.remove('collapsed');
      set.delete(_secKey(sec));
      siblings.forEach((x) => { x.classList.add('collapsed'); const k = _secKey(x); if (k) set.add(k); });
    }
    _saveCollapsed(set);
  });

  // 튜토리얼 스포트라이트 타깃이 접힌 섹션 안이면 자동 펼침
  setInterval(() => {
    const glow = document.querySelector('.tut-glow');
    const sec = glow?.closest('.sec.collapsed');
    if (sec) sec.classList.remove('collapsed');
  }, 500);
}

// ── ③ 패널 폭 그립 ──
function _panelGrip() {
  const panel = document.querySelector('#panel');
  const app = document.querySelector('#app');
  if (!panel || !app || panel.querySelector('#panel-grip')) return;

  const apply = (w) => { app.style.setProperty('--panel-w', `${w}px`); };
  const saved = parseInt(localStorage.getItem(LS_PANEL_W) || '', 10);
  if (saved >= 280 && saved <= 560) apply(saved);

  const grip = document.createElement('div');
  grip.id = 'panel-grip';
  grip.title = '드래그: 패널 폭 조절 · 더블클릭: 초기화';
  panel.appendChild(grip);

  let drag = null;
  grip.addEventListener('pointerdown', (e) => {
    if (window.innerWidth <= 900) return;           // 세로 스택 레이아웃에선 비활성
    drag = { x: e.clientX, w: panel.getBoundingClientRect().width };
    grip.setPointerCapture(e.pointerId);
    e.preventDefault();
  });
  grip.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const w = Math.max(280, Math.min(560, drag.w + (e.clientX - drag.x)));
    apply(w);
  });
  grip.addEventListener('pointerup', () => {
    if (!drag) return;
    drag = null;
    const w = Math.round(panel.getBoundingClientRect().width);
    try { localStorage.setItem(LS_PANEL_W, String(w)); } catch { /* noop */ }
  });
  grip.addEventListener('dblclick', () => {
    app.style.removeProperty('--panel-w');
    try { localStorage.removeItem(LS_PANEL_W); } catch { /* noop */ }
  });
}

