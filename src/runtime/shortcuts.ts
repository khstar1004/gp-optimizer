// @ts-nocheck
/**
 * 단축키 안내 오버레이 (`?`)
 *
 * 이 앱은 지도 위에서 할 수 있는 일이 많은데, 그 목록이 설명서 탭 맨 아래 표에만 있었다.
 * 지도를 보고 있는 사람은 그 표를 못 본다 — 그래서 Ctrl+Z 도, 도보 중 B(쌍안경)도,
 * 우클릭 컨텍스트 메뉴도 있는 줄 모른 채 쓰였다.
 *
 * 목록은 **여기 한 곳**에만 적는다. 설명서 탭도 이 표를 읽어 그린다 — 두 벌로 두면
 * 하나가 반드시 낡는다.
 */
import { svgIcon } from './icons';

export const SHORTCUT_GROUPS = [
  {
    title: '지도 · 카메라',
    rows: [
      ['좌드래그 / 휠 / 우드래그', '이동 / 줌 / 회전·틸트'],
      ['우클릭 (지도)', '컨텍스트 메뉴 — 여기서 1인칭 · 제원 복사 · 시설 배치'],
      ['Ctrl + K', '명령 팔레트 (탭 이동·시점·측정·보고서 전부)'],
      ['1 ~ 6', '퀵독 — 투어 · 1인칭 · 도보 · 드론 · 자산최적화 · 자동배치'],
      ['?', '이 도움말'],
    ],
  },
  {
    title: '시점 모드 — 광학 (1인칭)',
    rows: [
      ['드래그 / 휠 · Z', '슬루(둘러보기) / 배율 단 전환 — 연속 줌이 아니다'],
      ['P', '화면 극성 — 열상 백열↔흑열 · 드론 짐벌 EO↔IR'],
      ['L', '레이저 거리측정 — 조준점 실거리·표고·MGRS'],
      ['N', 'NUC (비균일성 보정) — 열상 셔터 강제'],
      ['B', '맨눈 ↔ 쌍안경 (사람이 서는 관측점)'],
      ['F', '이 자산의 관제 화면(피드 창) 열기'],
      ['ESC', '모든 시점·작도 모드 종료'],
    ],
  },
  {
    title: '시점 모드 — 작전 (추적 → 인계 → 조명 → 보고)',
    rows: [
      ['T · 표적 클릭', '표적 추적 — 항적 번호를 붙이고 짐벌이 따라간다(드래그하면 끊긴다)'],
      ['C', '교차표적지정 — 볼 수 있는 자산의 부채꼴을 실제로 돌리고 화면을 연다 (다시 누르면 복원)'],
      ['I', '조명 요청 — 표적 위로 조명탄. 32초 동안 EO·육안 유효거리가 되살아난다'],
      ['S', '관측보고(SPOTREP) — 화면 캡처 + SALUTE 보고문 생성'],
    ],
  },
  {
    title: '상시 감시',
    rows: [
      ['(자동)', '배치된 자산은 화면을 안 열어도 매초 판정한다 — 최초 탐지·등급 상승·접촉 상실'],
      ['좌하단 로그', '사건 한 줄 = 언제·무엇을·어느 자산이·어떤 등급으로. 눌러서 그 자산 화면 열기'],
      ['감시 탭', '「축선별 감시 공백 분석」 — 침투 전 구간에서 몇 %를 잡았고 어디가 비는가'],
    ],
  },
  {
    title: '자산 · 편대 관리',
    rows: [
      ['지도에서 자산 클릭 → ⚙ 관리', '떠 있는 관리 창 — 성능·좌표·호칭·마스트·지향·현재 접촉·복제·철거'],
      [`감시 탭 → ${svgIcon('drone')} 편대 관리`, '드론 편대 — 출격/복귀 · 고도 · 궤도 반경 · EO/IR · 순찰 지점 · 그 기체 시점'],
      ['Ctrl+K → 「편대」/「자산 관리」', '같은 창을 명령 팔레트에서도 연다'],
      ['드론 시점 중 P · [ ] · 휠', '페이로드 전환 · 궤도 반경 · 고도 — 전부 그 기체에 되돌아간다'],
      ['감시 탭 → 전원 · 인원', '발전 용량이 모자라면 우선순위가 낮은 자산부터 꺼진다 — 꺼진 자산은 탐지에서도 빠진다'],
    ],
  },
  {
    title: '시점 모드 — 도보 · 드론',
    rows: [
      ['W A S D · Shift (도보)', '이동 · 질주'],
      ['E (도보)', '근처 관측점 승탑 · 건물 내부 진입'],
      ['R / Q (건물 내부)', '위층 / 아래층'],
      ['B · T · F · C (도보)', '쌍안경 · 현위치 가시영역 · 피탐 체크 · 트랙 삭제'],
      ['드래그 / 휠 (드론)', '짐벌 슬루 / 고도 (Shift+휠 · Z·X 는 배율 단)'],
      ['P · L · [ ] (드론)', 'EO↔IR 페이로드 · 측거 · 궤도 반경'],
    ],
  },
  {
    title: '배치 편집',
    rows: [
      ['카탈로그 → 지도 드래그', '시설 배치 (놓는 순간 그 지형의 토공비 산출)'],
      ['건물 클릭 / 클릭 후 드래그', '선택 / 이동 (이동 시 재견적, 검증 실패 시 원위치)'],
      ['방향키 · Shift+방향키', '선택 시설 2m / 8m 미세 이동'],
      ['R', '선택 시설 45° 회전'],
      ['Delete', '선택 시설 철거'],
      ['Ctrl + C / V', '복사 / 붙여넣기'],
      ['Ctrl + Z / Y', '실행취소 / 다시실행 (계획 슬롯 전환도 되돌릴 수 있음)'],
    ],
  },
  {
    title: '작도 · 측정',
    rows: [
      ['클릭 → 우클릭', '측정 · COA 도식 · 침투 축선 작도의 공통 규칙 (완성=우클릭)'],
      ['감시자산 팔레트 → 지도', '초소 배치. 「＋ 클릭 배치」를 켜면 클릭으로 연속 배치'],
      ['초소 마스트 클릭 후 드래그', '초소 이동 (지반고 재측량 · LOS 캐시 폐기)'],
      ['부채꼴 클릭', '그 초소의 설정 팝업 (부채꼴은 끌 수 없다 — 지도 회전을 위해)'],
    ],
  },
];

const ID = 'shortcut-overlay';

function html() {
  return `
    <div class="sc-sheet" role="dialog" aria-label="단축키 안내">
      <div class="sc-head"><span>조작 · 단축키</span>
        <span class="sc-hint">ESC 또는 바깥 클릭으로 닫기</span>
        <button class="btn sc-x" id="sc-close">✕</button></div>
      <div class="sc-body">
        ${SHORTCUT_GROUPS.map((g) => `
          <section class="sc-group">
            <h4>${g.title}</h4>
            <table>${g.rows.map(([k, v]) => `
              <tr><td class="sc-k">${k}</td><td class="sc-v">${v}</td></tr>`).join('')}
            </table>
          </section>`).join('')}
      </div>
    </div>`;
}

export function initShortcutHelp({ isBlocked } = {}) {
  const wrap = document.querySelector('#map-wrap');
  if (!wrap || document.getElementById(ID)) return null;
  const el = document.createElement('div');
  el.id = ID;
  el.className = 'hidden';
  el.innerHTML = html();
  wrap.appendChild(el);

  const api = {
    open() { el.classList.remove('hidden'); },
    close() { el.classList.add('hidden'); },
    toggle() { el.classList.toggle('hidden'); return !el.classList.contains('hidden'); },
    get isOpen() { return !el.classList.contains('hidden'); },
  };
  el.querySelector('#sc-close').onclick = api.close;
  el.addEventListener('click', (e) => { if (e.target === el) api.close(); });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && api.isOpen) { e.preventDefault(); api.close(); return; }
    if (e.key !== '?' || e.ctrlKey || e.metaKey || e.altKey) return;
    // 입력 중에는 물음표가 글자다.
    if (e.target.closest?.('input, textarea, select') || e.target.isContentEditable) return;
    if (isBlocked?.()) return;
    e.preventDefault();
    api.toggle();
  });
  return api;
}
