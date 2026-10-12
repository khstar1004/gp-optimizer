// @ts-nocheck
/**
 * 화력 탭 — 정밀타격 효과 시뮬레이션 패널
 *
 * 예전에는 이것이 별도의 「피해 시각화」 탭이었고, 자기만의 뷰어에 좌표 없는 가짜
 * 단지를 세워 놓고 재생했다. 화력 탭은 그 옆에서 KAIROS 교리 표만 보여 주고 있었다 —
 * 「어느 탄으로 쏠 수 있는가」(표)와 「쏘면 어떻게 되는가」(연출)가 서로 모르는 채로.
 *
 * 두 화면이 원래 한 화면이었어야 했으므로 합쳤다. 이제 이 패널은 화력 탭 맨 위에
 * 서고, 아래의 탄약효과표·부수피해 CDE·사격부대 제원과 **같은 표적**을 본다.
 * 여기서 찍은 탄착점은 아래 CDE 검증의 입력이 되고, 아래 표가 권고하는 탄종은
 * 여기 카탈로그에서 고를 수 있다.
 *
 * 화면 분담
 * ─────────
 * 왼쪽 패널   계획을 **세우는** 곳 — 지점·탄종·신관·방위, 그리고 판정 결과 표.
 * 지도 위 HUD 계획을 **보는** 곳 — 재생 막대·등급 요약·장면 기록·시점 전환.
 *             (재생 막대가 패널에 있으면 재생 중에 지도를 보려고 눈을 옮겨야 한다.)
 */
import {
  CUM_THRESHOLD, DAMAGE_EXPONENT, FUZES, GRADE_COLOR, GRADE_LABEL, MUNITIONS,
  MAGAZINE_NEW_RATIO, MAX_BARRIER_DB, STAGE_LABEL, STRIKE_LIMITS, STRIKE_SOURCES,
  fuzeById, gradeSummary, hpOf, munitionById, stageOf,
} from '../domain/strike';
import { StrikeScene } from './strikeScene';
import { collateralCheck, SUDO_COLLATERAL_REQUIRED_SAFETY_MARGIN_M } from './fires';
import { azimuthDeg, distM } from './geo';
import { toMGRS } from './mgrs';

const esc = (s) => String(s ?? '').replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
const clock = (s) => `${Math.floor(s / 60).toString().padStart(2, '0')}:${Math.floor(s % 60).toString().padStart(2, '0')}`;
const GRADES = ['destroyed', 'severe', 'moderate', 'light', 'none'];

/** 위협 방위 빠른 선택 — 이 GP 의 위협은 북측에서 온다. */
const THREAT_AZ = [
  { deg: 315, name: '북서' }, { deg: 350, name: '북북서' },
  { deg: 0, name: '정북' }, { deg: 45, name: '북동' },
];
const COMPASS_16 = ['북', '북북동', '북동', '동북동', '동', '동남동', '남동', '남남동',
  '남', '남남서', '남서', '서남서', '서', '서북서', '북서', '북북서'];
const compass = (deg) => COMPASS_16[Math.round((((deg % 360) + 360) % 360) / 22.5) % 16];

/** 방위 슬라이더 아래 안내문 — 발사대 위치 유무에 따라 다르다. */
function azNoteText() {
  return state.platform
    ? '발사대 위치로 <b>자동 계산</b>되었습니다 — 해제하면 방위를 직접 설정할 수 있습니다.'
    : `탄이 <b>날아오는 쪽</b>입니다. GP-107 의 책임구역 정면이 북(0°)이므로
      위협은 북측에서 옵니다 — 기본값이 350°인 이유입니다. 진입 축선과 아군 배치가
      겹치면 비행 중 피격 위험을, 반대편에 서면 파편 방향을 각각 다르게 읽어야 합니다.`;
}

/**
 * 지형 차폐 한 칸.
 *
 * 1.00 이면 폭심이 그대로 보이는 자리(자유장), 작을수록 능선 뒤에 들어가 있다.
 * 배치를 고칠 때 가장 값싼 수단이 「반사면으로 옮기는 것」이라, 이 수가 눈에 보여야
 * 그 선택지가 떠오른다.
 */
function maskCell(mask) {
  if (mask === undefined || mask === null) return '<span class="muted">—</span>';
  const m = Math.max(0, Math.min(1, mask));
  if (m > 0.97) return '<span class="muted">노출</span>';
  const db = -20 * Math.log10(Math.max(1e-6, m));
  const color = m < 0.2 ? 'var(--ok)' : m < 0.55 ? '#9fd6b4' : 'var(--warn)';
  return `<b style="color:${color}">×${m.toFixed(2)}</b>`
    + `<br><small class="muted">−${db.toFixed(0)}dB</small>`;
}

/** 탭을 다시 그려도 살아남아야 하는 것들 — 계획은 화면이 아니라 여기 있다. */
const state = {
  scene: null,
  munitionId: 'lgb500',
  fuzeId: 'impact',
  azDeg: 350,   // 위협 방위 — GP 책임구역 정면이 북(0°)이므로 기본은 북측
  impact: null,        // {lon, lat, groundH, mgrs}
  platform: null,      // {lon, lat, groundH, mgrs} — 발사대(무기) 위치, 지정하면 방위를 대신 계산한다
  notes: '',
  rounds: 1,           // 한 발(사격)당 연속사격 발수
  speed: 1,
  cameraMode: 'overview',
  fxScale: 'auto',     // 폭발 연출 크기 — 피해 반경·판정과 무관
  sound: true,         // 폭발음 (브라우저 정책상 재생 버튼을 눌러야 실제로 난다)
  slowmo: true,        // 탄착 순간 시간 늘이기
  delayS: 3,           // 화력 임무 — 발과 발 사이에 둘 간격(초). 계획 중 지도를 몇 번 찍었든 동일하게 적용된다
  planning: false,     // 계획 모드 — 켜져 있는 동안은 지도 클릭마다 한 발씩 목록에 쌓인다
  mission: [],         // 화력 임무 목록 — [{id, munitionId, fuzeId, azDeg, rounds, impact, platform}]
  missionRunning: false,
  missionIdx: 0,
  missionLog: [],      // 임무 실행 결과 — 발마다 [{item, outcome}]
};

let missionSeq = 0;

export function strikeState() { return state; }

/**
 * 화력 탭을 떠날 때 지도에서 물러난다 — **계획은 지우지 않는다.**
 *
 * 다만 무너뜨려 둔 건물은 세운다. 배치 탭으로 넘어갔는데 시설이 주저앉아 있으면
 * 거기서는 그것이 「지금의 배치」로 읽히고, 그 상태로 비용과 정원을 보게 된다.
 * 돌아오면 그 시점(t)을 그대로 다시 그리므로 이어서 보던 장면이 복원된다.
 */
export function strikeSetActive(active) {
  const hud = document.getElementById('strike-hud');
  if (hud) hud.classList.toggle('hidden', !active || !state.impact);
  const scene = state.scene;
  if (!scene) return;
  if (active) {
    if (state.impact) scene.update(scene.t);
  } else {
    scene.pause();
    scene.cancelDesignate();
    scene.restoreBuildings();
    // 임무 도중 탭을 떠나면 대기 중이던 다음 발 예약(setTimeout)이 나중에 배경에서
    // 튀어나오지 않도록 여기서 끊는다. 이미 낸 피해(missionBase)는 그대로 남는다.
    state.missionRunning = false;
  }
}

/** 배치·감시자산이 바뀌었다 — 도형은 그대로 두고 판정만 다시 매긴다. */
export function strikeReassess() {
  if (!state.scene || !state.impact) return;
  const before = state.scene._assessFp;
  state.scene.reassess();
  // 지문이 그대로면 판정도 그대로다 — 패널을 다시 그릴 이유가 없다
  if (before === state.scene._assessFp) return;
  const mount = document.getElementById('strike-panel');
  if (mount) syncAll(mount, lastCtx);
}

export function strikeDispose() {
  state.scene?.destroy();
  state.scene = null;
}

// ═════════════════════ 패널 ═════════════════════

/** 마지막으로 받은 탭 컨텍스트 — 외부(배치 변경)에서 다시 그릴 때 쓴다. */
let lastCtx = null;

export function renderStrikePanel(mount, ctx) {
  lastCtx = ctx;
  const m = munitionById(state.munitionId);
  mount.innerHTML = `
    <div class="sec sk-sec">
      <div class="sec-title">정밀타격 효과 시뮬레이션 <span class="sk-tag">실지도</span></div>
      <p class="muted" style="margin-bottom:7px">지도에서 탄착점을 찍고 탄종을 고르면,
      <b>탄두 순폭약량</b> 하나에서 계산한 피해 반경이 지형에 그려지고 그 안에 실제로 들어 있는
      배치 시설·감시자산이 등급을 받습니다. 배치를 고치면 판정이 따라 바뀝니다.
      공개 폭발 스케일링(입방근 · Brode)만 씁니다 — 합성 부지 데모이며 교전 판단 근거가 아닙니다.</p>

      <div class="sk-step">① 발사대(무기) 위치 <span class="muted">선택 · 방위 자동계산</span></div>
      <div class="btn-row">
        <button class="btn" id="sk-pick-platform">지도에서 지정 ▶</button>
        <button class="btn" id="sk-clear-platform">해제</button>
      </div>
      <div id="sk-platform" class="sk-impact"></div>

      <div class="sk-step">② 타격 계획 <span class="muted">계획 시작 → 지도 반복 클릭 → 계획 중지로 포격</span></div>
      <p class="muted" style="margin-bottom:7px"><b>계획 시작</b>을 누른 뒤 아래 ③에서 무기를 고르고
      지도를 클릭하세요 — 클릭할 때마다 그 자리에 한 발이 계획에 쌓입니다. 무기를 바꿔 가며 여러 번
      찍은 뒤 <b>계획 중지 · 포격 시작</b>을 누르면, 쌓은 순서대로 자동으로 발사됩니다.</p>
      <div class="btn-row">
        <button class="btn primary${state.planning ? ' sk-planning' : ''}" id="sk-plan-toggle">${state.planning ? '■ 계획 중지 · 포격 시작' : '▶ 계획 시작'}</button>
        <button class="btn" id="sk-pick-gp">GP 중심으로 한 발</button>
        <button class="btn" id="sk-clear">전체 지우기</button>
      </div>
      <div id="sk-impact" class="sk-impact"></div>

      <div class="sk-step">③ 타격 자산 <span class="muted">공개출처 근사 · 재래식 정밀무장</span></div>
      <div class="sk-muns" id="sk-muns">${MUNITIONS.map((x) => `
        <button class="sk-mun${x.id === state.munitionId ? ' on' : ''}" data-mun="${x.id}"
          aria-pressed="${x.id === state.munitionId}">
          <span class="sk-mun-top"><b>${esc(x.short)}</b><i>${esc(x.cls)}</i></span>
          <span class="sk-mun-name">${esc(x.name)}</span>
          <span class="sk-mun-spec">순폭약량 ${x.newKg}kg · CEP ${x.cepM}m · ${x.rangeKm}km</span>
        </button>`).join('')}</div>
      <p class="muted sk-note" id="sk-mun-note">${esc(m.note)}</p>

      <div class="sk-step">④ 신관 · 진입 축선</div>
      <select id="sk-fuze" class="sel">${FUZES.map((f) => `
        <option value="${f.id}"${f.id === state.fuzeId ? ' selected' : ''}>${esc(f.name)}</option>`).join('')}</select>
      <p class="muted sk-note" id="sk-fuze-note">${esc(fuzeById(state.fuzeId).detail)}</p>
      <label class="sk-range${state.platform ? ' sk-az-locked' : ''}">
        <span>위협 방위 <b id="sk-az-val">${state.azDeg}° ${compass(state.azDeg)}</b></span>
        <input type="range" id="sk-az" min="0" max="359" step="1" value="${state.azDeg}"${state.platform ? ' disabled' : ''}></label>
      <div class="btn-row sk-azrow">${THREAT_AZ.map((a) => `
        <button class="btn" data-az="${a.deg}"${state.platform ? ' disabled' : ''}>${esc(a.name)}</button>`).join('')}</div>
      <p class="muted sk-note" id="sk-az-note">${azNoteText()}</p>

      <div class="sk-step">⑤ 사격 발수 <span class="muted">누적 손상 · 몇 발까지 버티는가</span></div>
      <label class="sk-range"><span>연속사격 <b id="sk-rounds-val">${state.rounds}발</b></span>
        <input type="range" id="sk-rounds" min="1" max="12" step="1" value="${state.rounds}"></label>
      <p class="muted sk-note" id="sk-salvo-note"></p>

      <div class="sk-step">⑥ 화력 임무 목록 <span class="muted">계획 중 지도를 찍은 순서</span></div>
      <label class="sk-range"><span>발 사이 간격 <b id="sk-delay-val">${state.delayS}초</b></span>
        <input type="range" id="sk-delay" min="0" max="60" step="1" value="${state.delayS}"></label>
      <div class="btn-row" style="margin-top:8px">
        <button class="btn" id="sk-mission-clear">목록 비우기</button>
      </div>
      <div id="sk-mission-list" class="sk-mission-list"></div>
      <p class="muted sk-note" id="sk-mission-note"></p>

      <div class="sk-step">⑦ 피해 반경 <span class="muted">순폭약량에서 계산</span></div>
      <div id="sk-rings"></div>

      <div class="sk-step">⑧ 내구 판정 <span class="muted">Palmgren–Miner 누적손상 · 지형 차폐</span></div>
      <div class="btn-row">
        <button class="btn" id="sk-vuln">취약 조준점 분석 ▶</button>
        <button class="btn" id="sk-vuln-clear">해제</button>
      </div>
      <p class="muted sk-note" id="sk-vuln-out">이 배치에서 <b>적이 노릴 자리</b>를 격자로 훑습니다.
      한 발이 주는 총손상이 가장 큰 점을 찾아 지도에 히트맵으로 깔고, 그 점으로 조준점을 옮깁니다.</p>
      <div id="sk-endure"></div>

      <div class="sk-step">⑨ 피해 판정 <span class="muted">배치 시설 · 감시자산</span></div>
      <div id="sk-assess"></div>

      <div class="sk-step">⑩ 부수피해 검증 <span class="muted">KAIROS CDE 원표</span></div>
      <div id="sk-cde"></div>

      <div class="sk-step">⑪ 기록</div>
      <textarea id="sk-notes" maxlength="4000" rows="3"
        placeholder="관찰 내용·재타격 판단·배치 보완 의견을 적습니다…">${esc(state.notes)}</textarea>
      <div class="btn-row" style="margin-top:6px">
        <button class="btn primary" id="sk-save">↓ 효과판정 기록 · JSON</button>
      </div>
      <details class="sk-src"><summary>모델 근거와 표현 범위</summary>
        <p class="muted">지형 차폐는 Maekawa 회절식으로 계산합니다 —
        폭심과 표적을 잇는 직선 아래로 지형이 솟아 있으면 그 마루를 돌아가는 경로차를 재어
        최대 ${MAX_BARRIER_DB}dB(압력 1/16)까지 감쇠시킵니다. 지형 타일이 아직 안 올라온
        구간은 감쇠 없이(자유장, 보수적으로 크게) 둡니다.</p>
        <ul>${STRIKE_LIMITS.map((l) => `<li>${esc(l)}</li>`).join('')}</ul>
        ${STRIKE_SOURCES.map((s) => `<p><a href="${esc(s.url)}" target="_blank" rel="noreferrer">${esc(s.title)} ↗</a><br>
          <span class="muted">${esc(s.use)}</span></p>`).join('')}
      </details>
    </div>`;

  ensureHud(ctx);
  wirePanel(mount, ctx);
  renderMissionList(mount, ctx);
  syncAll(mount, ctx);
}

function wirePanel(mount, ctx) {
  const $ = (sel) => mount.querySelector(sel);

  $('#sk-plan-toggle').onclick = () => {
    if (state.planning) stopPlanning(mount, ctx);
    else startPlanning(mount, ctx);
  };
  $('#sk-pick-gp').onclick = () => {
    const site = ctx.site;
    const h = ctx.state?.ents?.groundH ?? 0;
    addPointToMission(mount, ctx, { lon: site.lon, lat: site.lat, groundH: h });
  };
  $('#sk-clear').onclick = () => {
    state.impact = null;
    state.mission = [];
    state.missionLog = [];
    if (state.planning) { state.planning = false; state.scene?.cancelDesignate(); }
    state.scene?.clear();
    strikeSetActive(true);
    renderStrikePanel(mount, ctx);
    ctx.toast('타격 계획을 전부 지웠습니다 — 건물도 원래대로 복원했습니다');
  };

  $('#sk-pick-platform').onclick = () => {
    const scene = ensureScene(ctx);
    scene.beginDesignate('platform');
    ctx.toast('지도에서 발사대(무기) 위치를 클릭하세요', 4200);
    $('#sk-pick-platform').textContent = '지도 클릭 대기…';
  };
  $('#sk-clear-platform').onclick = () => {
    state.platform = null;
    renderStrikePanel(mount, ctx);   // 방위 슬라이더 잠금을 풀어야 하므로 패널을 다시 그린다
    pushPlan(mount, ctx);
    ctx.toast('발사대 위치를 해제했습니다 — 방위를 직접 설정할 수 있습니다');
  };

  mount.querySelectorAll('[data-mun]').forEach((b) => {
    b.onclick = () => {
      state.munitionId = b.dataset.mun;
      mount.querySelectorAll('[data-mun]').forEach((x) => {
        const on = x === b;
        x.classList.toggle('on', on);
        x.setAttribute('aria-pressed', String(on));
      });
      $('#sk-mun-note').textContent = munitionById(state.munitionId).note;
      pushPlan(mount, ctx, { reloadModel: true });
    };
  });

  $('#sk-fuze').onchange = (e) => {
    state.fuzeId = e.target.value;
    $('#sk-fuze-note').textContent = fuzeById(state.fuzeId).detail;
    pushPlan(mount, ctx);
  };
  $('#sk-az').oninput = (e) => {
    state.azDeg = Number(e.target.value);
    $('#sk-az-val').textContent = `${state.azDeg}° ${compass(state.azDeg)}`;
  };
  $('#sk-az').onchange = () => pushPlan(mount, ctx);
  mount.querySelectorAll('[data-az]').forEach((b) => {
    b.onclick = () => {
      state.azDeg = Number(b.dataset.az);
      $('#sk-az').value = String(state.azDeg);
      $('#sk-az-val').textContent = `${state.azDeg}° ${compass(state.azDeg)}`;
      pushPlan(mount, ctx);
    };
  });
  $('#sk-rounds').oninput = (e) => {
    state.rounds = Number(e.target.value);
    $('#sk-rounds-val').textContent = `${state.rounds}발`;
  };
  $('#sk-rounds').onchange = () => pushPlan(mount, ctx);

  $('#sk-delay').oninput = (e) => {
    state.delayS = Number(e.target.value);
    $('#sk-delay-val').textContent = `${state.delayS}초`;
  };
  $('#sk-mission-clear').onclick = () => {
    if (!state.mission.length) return;
    state.mission = [];
    renderMissionList(mount, ctx);
    ctx.toast('화력 임무 목록을 비웠습니다');
  };

  $('#sk-vuln').onclick = () => {
    const scene = state.scene;
    if (!scene || !state.impact) { ctx.toast('먼저 타격 지점을 지정하세요'); return; }
    const res = scene.analyzeVulnerability();
    if (!res) { ctx.toast('판정할 시설이 없습니다 — 배치 탭에서 시설을 세우세요'); return; }
    const cell = (2 * res.halfSpanM) / (res.steps - 1);
    $('#sk-vuln-out').innerHTML = `격자 ${res.steps}×${res.steps} (${Math.round(res.halfSpanM)}m 반경 ·
      ${Math.round(cell)}m 간격) 에서 시설 ${res.targets}개를 훑었습니다.
      가장 약한 자리는 <b>1발당 총손상 ${(res.best.score * 100).toFixed(0)}%</b> —
      지도의 붉은 십자선입니다. <b>취약 조준점으로 이동</b>을 누르면 그 자리로 조준점을 옮깁니다.
      <button class="btn" id="sk-vuln-go" style="margin-top:6px">취약 조준점으로 이동 ▶</button>`;
    const go = $('#sk-vuln-go');
    if (go) {
      go.onclick = () => {
        const h = scene._groundAt(res.best.lon, res.best.lat) ?? state.impact.groundH;
        const p = { lon: res.best.lon, lat: res.best.lat, groundH: h };
        if (state.planning) addPointToMission(mount, ctx, p); else applyImpact(mount, ctx, p);
      };
    }
    ctx.toast(`취약 조준점 분석 — 1발당 총손상 ${(res.best.score * 100).toFixed(0)}%`, 4200);
  };
  $('#sk-vuln-clear').onclick = () => {
    state.scene?.clearVulnerability();
    $('#sk-vuln-out').textContent = '히트맵을 지웠습니다.';
  };
  $('#sk-notes').oninput = (e) => { state.notes = e.target.value; };
  $('#sk-save').onclick = () => {
    const scene = state.scene;
    if (!scene || !state.impact) { ctx.toast('먼저 타격 지점을 지정하세요'); return; }
    const report = scene.report(state.notes, cdeRows());
    if (!report) return;
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `strike-assessment-${state.munitionId}-${state.fuzeId}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 30_000);
    ctx.toast('효과판정 기록을 저장했습니다 — 반경 산출 근거와 대상별 등급이 함께 들어 있습니다');
  };
}

function ensureScene(ctx) {
  if (state.scene) return state.scene;
  state.scene = new StrikeScene(ctx.viewer, {
    fxScale: state.fxScale,
    sound: state.sound,
    slowmo: state.slowmo,
    state: ctx.state,
    toast: ctx.toast,
    site: ctx.site,
    onPick: (p) => {
      const mount = document.getElementById('strike-panel');
      if (!mount) return;
      if (p.kind === 'platform') applyPlatform(mount, ctx, p);
      else if (state.planning) addPointToMission(mount, ctx, p);
      else applyImpact(mount, ctx, p);
    },
    onTick: (t) => paintPlayer(t),
    onEnd: () => {
      paintPlayer(state.scene?.timelineOf()?.totalS ?? 0);
      if (state.missionRunning) advanceMissionStep(ctx);
      else showOutcome(ctx);
    },
  });
  return state.scene;
}

/** 발사대·타격지점이 둘 다 있으면 위협 방위는 발사대 쪽에서 자동으로 정해진다. */
function syncPlatformAz() {
  if (state.platform && state.impact) {
    state.azDeg = Math.round(azimuthDeg(
      state.impact.lon, state.impact.lat, state.platform.lon, state.platform.lat));
  }
}

/** 계획 없이 미리보기 지점만 옮긴다 — 취약 조준점 분석처럼 목록에 쌓을 필요가 없을 때. */
function applyImpact(mount, ctx, p) {
  state.impact = { ...p, mgrs: toMGRS(p.lon, p.lat) };
  syncPlatformAz();
  pushPlan(mount, ctx, { reloadModel: true, fly: true });
  ctx.toast(`탄착점 지정 — ${state.impact.mgrs} · 표고 ${Math.round(p.groundH)}m`);
}

/**
 * 화력 계획 모드 — 켜져 있는 동안은 지도를 클릭할 때마다 지금 골라 둔 무기·신관·
 * 발수로 한 발이 목록에 추가된다. 새 계획을 시작하는 것이므로 이전 목록은 비운다
 * (이미 지형에 낸 피해는 지우지 않는다 — missionBase 는 scene.clear() 때만 지워진다).
 */
function startPlanning(mount, ctx) {
  if (state.missionRunning) { ctx.toast('포격이 진행 중입니다 — 끝난 뒤에 다시 계획하세요'); return; }
  const scene = ensureScene(ctx);
  state.planning = true;
  state.mission = [];
  state.missionLog = [];
  scene.beginDesignate('impact', { continuous: true });
  renderStrikePanel(mount, ctx);
  ctx.toast('계획 모드 — ③에서 무기를 고르고 지도를 클릭하세요. 클릭마다 한 발씩 쌓입니다.', 5200);
}

/** 계획 중지 — 무장을 풀고, 쌓아 둔 순서 그대로 포격을 시작한다. */
function stopPlanning(mount, ctx) {
  const scene = state.scene;
  state.planning = false;
  scene?.cancelDesignate();
  renderStrikePanel(mount, ctx);
  if (!state.mission.length) {
    ctx.toast('계획된 사격이 없습니다 — 지도를 클릭해 표적을 추가하세요');
    return;
  }
  runMission(mount, ctx);
}

/** 지도 클릭(계획 모드) 또는 「GP 중심으로」 — 지금 설정으로 한 발을 목록에 담는다. */
function addPointToMission(mount, ctx, p) {
  state.impact = { ...p, mgrs: toMGRS(p.lon, p.lat) };
  syncPlatformAz();
  missionSeq += 1;
  state.mission.push({
    id: missionSeq,
    munitionId: state.munitionId,
    fuzeId: state.fuzeId,
    azDeg: state.azDeg,
    rounds: state.rounds,
    impact: state.impact,
    platform: state.platform,
  });
  // 계획 중에는 카메라를 고정해 둔다 — 클릭할 때마다 시점이 튀면 다음 자리를 찍기 어렵다.
  pushPlan(mount, ctx, { reloadModel: true, fly: false });
  renderMissionList(mount, ctx);
  ctx.toast(`${state.mission.length}번째 사격 추가 — ${munitionById(state.munitionId).short} · ${state.impact.mgrs}`, 2600);
}

function applyPlatform(mount, ctx, p) {
  state.platform = { ...p, mgrs: toMGRS(p.lon, p.lat) };
  syncPlatformAz();
  renderStrikePanel(mount, ctx);   // 방위 슬라이더를 잠가야 하므로 패널을 통째로 다시 그린다(기본 문구로도 복원된다)
  pushPlan(mount, ctx, { reloadModel: true });
  ctx.toast(`발사대 위치 지정 — ${state.platform.mgrs}`);
}

/** 패널 상태 → 장면. 화면에 보이는 모든 수는 여기서 한 번에 갱신된다. */
function pushPlan(mount, ctx, opts = {}) {
  hideOutcome();
  if (!state.impact) { syncAll(mount, ctx); return; }
  const scene = ensureScene(ctx);
  scene.setPlan({
    munition: munitionById(state.munitionId),
    fuze: fuzeById(state.fuzeId),
    azDeg: state.azDeg,
    rounds: state.rounds,
    impact: state.impact,
    platform: state.platform,
    tailS: opts.tailS,   // 생략하면 scene 기본값(26초) — 화력 임무의 중간 발에서만 짧게 준다
  });
  if (opts.reloadModel) void scene.prepare();
  scene.seek(0);
  strikeSetActive(true);
  if (opts.fly) scene.setCamera(state.cameraMode === 'chase' ? 'overview' : state.cameraMode);
  syncAll(mount, ctx);
}

// ═════════════════════ 화력 임무 목록 ═════════════════════

function removeMissionShot(mount, ctx, id) {
  state.mission = state.mission.filter((x) => x.id !== id);
  renderMissionList(mount, ctx);
}

function moveMissionShot(mount, ctx, id, dir) {
  const i = state.mission.findIndex((x) => x.id === id);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= state.mission.length) return;
  [state.mission[i], state.mission[j]] = [state.mission[j], state.mission[i]];
  renderMissionList(mount, ctx);
}

/** 목록 칸 하나 — 이 발이 무엇을·어디에 쏘는지 한 줄로. */
function missionRowHtml(item, idx) {
  const mun = munitionById(item.munitionId);
  return `<div class="sk-mission-row" data-id="${item.id}">
    <span class="sk-mission-n">${idx + 1}</span>
    <span class="sk-mission-mun" title="${esc(mun.name)}">${esc(mun.short)}${item.rounds > 1 ? ` ×${item.rounds}` : ''}</span>
    <span class="sk-mission-tgt">${esc(item.impact.mgrs)}${item.platform ? ' <i title="발사대 지정됨">▲</i>' : ''}</span>
    <span class="sk-mission-btns">
      <button data-up="${item.id}" title="위로" ${idx === 0 ? 'disabled' : ''}>▲</button>
      <button data-down="${item.id}" title="아래로">▼</button>
      <button data-del="${item.id}" title="삭제">✕</button>
    </span>
  </div>`;
}

/** `#sk-mission-list` 만 다시 그린다 — 패널 전체를 다시 그릴 필요는 없다. */
function renderMissionList(mount, ctx) {
  const list = mount.querySelector('#sk-mission-list');
  const note = mount.querySelector('#sk-mission-note');
  if (!list) return;
  list.innerHTML = state.mission.map((it, i) => missionRowHtml(it, i)).join('');
  if (note) {
    note.innerHTML = state.mission.length
      ? `${state.mission.length}발 계획됨 — 발 사이 ${state.delayS}초 간격 + 각 발 재생시간.
         ${state.planning ? '지도를 더 클릭해 발을 더하거나, <b>계획 중지</b>를 눌러 포격을 시작하세요.'
    : '<b>계획 시작</b>으로 다시 편집하거나, 타격 재생으로 이 순서를 다시 실행할 수 있습니다.'}`
      : (state.planning
        ? '지도를 클릭해 표적을 추가하세요 — 클릭마다 한 발씩 쌓입니다.'
        : '계획된 사격이 없습니다 — <b>계획 시작</b>을 누르고 지도를 클릭하세요.');
  }
  list.querySelectorAll('[data-up]').forEach((b) => {
    b.onclick = () => moveMissionShot(mount, ctx, Number(b.dataset.up), -1);
  });
  list.querySelectorAll('[data-down]').forEach((b) => {
    b.onclick = () => moveMissionShot(mount, ctx, Number(b.dataset.down), 1);
  });
  list.querySelectorAll('[data-del]').forEach((b) => {
    b.onclick = () => removeMissionShot(mount, ctx, Number(b.dataset.del));
  });
  paintHud();
}

/**
 * 화력 임무 실행 — 목록 맨 앞부터 순서대로, 발 사이 간격을 두고 자동 발사한다.
 *
 * 이전에 낸 피해(scene.missionBase)는 여기서 지우지 않는다 — 계획→포격을 여러 번
 * 반복해도 앞서 부순 시설은 계속 부서진 채로 남는다. 전부 되돌리려면 「전체 지우기」다.
 */
function runMission(mount, ctx) {
  if (!state.mission.length) { ctx.toast('화력 임무 목록이 비어 있습니다 — 먼저 표적을 추가하세요'); return; }
  const scene = ensureScene(ctx);
  hideOutcome();
  state.missionRunning = true;
  state.missionIdx = 0;
  state.missionLog = [];
  if (state.sound) scene.audio.resume();
  missionFireNext(mount, ctx);
}

/** 큐의 다음 한 발을 건다 — 지연 뒤 재생하고, 끝나면(onEnd) 다시 이 함수가 불린다. */
function missionFireNext(mount, ctx) {
  const scene = state.scene;
  const i = state.missionIdx;
  if (!state.missionRunning || !scene || i >= state.mission.length) {
    state.missionRunning = false;
    showMissionOutcome(ctx);
    paintHud();
    return;
  }
  const item = state.mission[i];
  const isLast = i === state.mission.length - 1;
  state.munitionId = item.munitionId;
  state.fuzeId = item.fuzeId;
  state.azDeg = item.azDeg;
  state.rounds = item.rounds;
  state.impact = item.impact;
  state.platform = item.platform;
  // 중간 발은 잔류 연출(원래 탄착 후 26 초)을 짧게 줄인다 — 여러 발을 쭉 이어 쏠 때
  // 발마다 30 초 넘게 기다리게 되면 「화력 임무」가 아니라 「기다림 임무」가 된다.
  // 마지막 발만 원래 길이로 두어 결과를 제대로 지켜볼 수 있게 한다.
  pushPlan(mount, ctx, { reloadModel: true, fly: true, tailS: isLast ? undefined : 4 });
  ctx.toast(`화력 임무 ${i + 1}/${state.mission.length} — ${munitionById(item.munitionId).short} · ${item.impact.mgrs}`, 3200);
  const delayMs = Math.max(0, i === 0 ? 0 : state.delayS) * 1000;
  setTimeout(() => {
    if (!state.missionRunning || state.scene !== scene) return;
    void scene.prepare().then(() => scene.play());
    paintPlayer(scene.t);
  }, delayMs);
}

/** 지금 이 발의 재생을 끝맺고 다음 발로 넘긴다 — 자연 종료(onEnd)와 「다음 발」 버튼이 함께 쓴다. */
function advanceMissionStep(ctx) {
  state.scene?.commitMissionShot();
  state.missionLog.push({ item: state.mission[state.missionIdx], outcome: state.scene?.outcome() });
  state.missionIdx += 1;
  const mount = document.getElementById('strike-panel');
  if (mount) missionFireNext(mount, ctx);
}

/** 임무 전체가 끝난 뒤의 결과 — 발마다 등급과 최종(누적) 판정을 함께 보여 준다. */
function showMissionOutcome(ctx) {
  const log = state.missionLog;
  if (!log.length) return;
  const last = log[log.length - 1].outcome;
  if (!last) return;
  let box = document.getElementById('strike-outcome');
  if (!box) {
    box = document.createElement('div');
    box.id = 'strike-outcome';
    box.lang = 'ko';
    document.getElementById('map-wrap')?.appendChild(box);
  }
  const G = { S: '#7fe3b0', A: '#9fd6ff', B: '#ffd452', C: '#ff9a3c', D: '#ff5f5f' };
  const rows = log.map((l, i) => `<div class="so-mission-row">
    <b>${i + 1}</b><span>${esc(munitionById(l.item.munitionId).short)} · ${esc(l.item.impact.mgrs)}</span>
    <span style="color:${G[l.outcome?.grade ?? 'C']}">${esc(l.outcome?.grade ?? '—')}</span></div>`).join('');
  box.innerHTML = `
    <div class="so-head">
      <div class="so-grade" style="--g:${G[last.grade]}">${last.grade}</div>
      <div class="so-title"><span>화력 임무 결과 · 총 ${log.length}발</span>
        <b>${esc(last.verdict)}</b>
        <small>목록 순서대로 실행 — 각 발의 피해는 다음 발에도 그대로 누적되었습니다</small></div>
      <button class="so-close" id="so-close">✕</button>
    </div>
    <div class="so-mission-list">${rows}</div>
    <div class="so-grid">
      ${[
        ['완파 · 중파', `${last.counts.destroyed} · ${last.counts.severe}`],
        ['구조물', `${last.downed}/${last.structural}`],
        ['탄약고 유폭', last.secondary ? `${last.secondary}건` : '없음'],
      ].map(([label, value]) => `<div class="so-cell"><span>${label}</span><b>${value}</b></div>`).join('')}
    </div>
    <div class="so-foot">
      <button class="btn" id="so-replay">↻ 처음부터 다시 실행</button>
      <button class="btn primary" id="so-save">↓ 효과판정 기록 · JSON</button>
    </div>`;
  box.classList.remove('hidden');
  box.querySelector('#so-close').onclick = () => hideOutcome();
  box.querySelector('#so-replay').onclick = () => {
    hideOutcome();
    const mount = document.getElementById('strike-panel');
    if (mount) runMission(mount, ctx);
  };
  box.querySelector('#so-save').onclick = () => {
    hideOutcome();
    document.getElementById('sk-save')?.click();
  };
  ctx?.toast?.(`화력 임무 종료 — ${log.length}발 · 최종 ${last.grade}`, 5200);
}

// ═════════════════════ 패널 표 ═════════════════════

function cdeRows() {
  if (!state.impact) return [];
  const rows = state.scene?.targets() ?? [];
  const nearest = rows.length ? rows[0].distM : Infinity;
  return collateralCheck(nearest);
}

function syncAll(mount, ctx) {
  if (!mount || !ctx) return;
  const $ = (s) => mount.querySelector(s);
  const scene = state.scene;
  const rings = scene?.ringsOf();
  const rows = scene?.targets() ?? [];

  // ① 지점
  $('#sk-impact').innerHTML = state.impact ? (() => {
    const site = ctx.site;
    const d = distM(site.lon, site.lat, state.impact.lon, state.impact.lat);
    const az = azimuthDeg(site.lon, site.lat, state.impact.lon, state.impact.lat);
    return `<div class="kv"><span>MGRS</span><b>${esc(state.impact.mgrs)}</b></div>
      <div class="kv"><span>경위도 · 표고</span><b>${state.impact.lat.toFixed(5)}°N ${state.impact.lon.toFixed(5)}°E · ${Math.round(state.impact.groundH)}m</b></div>
      <div class="kv"><span>GP 기준</span><b>${(d / 1000).toFixed(2)}km · 방위 ${Math.round(az)}°</b></div>`;
  })() : '<p class="muted sk-empty">지정된 타격 지점이 없습니다. <b>지도에서 지정</b>을 누르고 지형을 클릭하세요.</p>';

  // ① 발사대 위치
  const skPlatform = $('#sk-platform');
  if (skPlatform) {
    skPlatform.innerHTML = state.platform ? (() => {
      const d = state.impact
        ? distM(state.platform.lon, state.platform.lat, state.impact.lon, state.impact.lat) : null;
      return `<div class="kv"><span>MGRS</span><b>${esc(state.platform.mgrs)}</b></div>
        <div class="kv"><span>경위도</span><b>${state.platform.lat.toFixed(5)}°N ${state.platform.lon.toFixed(5)}°E</b></div>
        ${d != null ? `<div class="kv"><span>표적까지</span><b>${(d / 1000).toFixed(2)}km · 방위 ${Math.round(state.azDeg)}°</b></div>` : ''}`;
    })() : '<p class="muted sk-empty">지정하지 않으면 위협 방위를 아래에서 직접 설정합니다.</p>';
  }

  // ③ 방위 — 발사대·타격지점 어느 쪽이 바뀌어도 여기서 표시값을 다시 맞춘다
  const azEl = $('#sk-az');
  if (azEl) azEl.value = String(state.azDeg);
  const azVal = $('#sk-az-val');
  if (azVal) azVal.textContent = `${state.azDeg}° ${compass(state.azDeg)}`;

  // ④ 반경
  $('#sk-rings').innerHTML = rings ? `
    <div class="kv"><span>유효 폭약량 <span class="muted">TNT 환산 · 신관 결합계수 반영</span></span>
      <b>${Math.round(rings.effectiveKg)}kg</b></div>
    <div class="sk-rings">
      ${ringRow('탄공', rings.crater, '#b9a58a', '지표에 남는 립·그을음 반경')}
      ${ringRow('완파', rings.complete, GRADE_COLOR.destroyed, '과압 70kPa — 구조 붕괴')}
      ${ringRow('중파', rings.severe, GRADE_COLOR.severe, '과압 34kPa — 주요 구조 손상')}
      ${ringRow('경파', rings.moderate, GRADE_COLOR.moderate, '과압 17kPa — 비구조 손상')}
      ${ringRow('유리·경상', rings.light, GRADE_COLOR.light, '과압 3.4kPa — 창호 파손')}
      ${ringRow('파편 위험', rings.frag, '#9db4c0', '케이싱 파편 도달 가능 범위')}
    </div>` : '<p class="muted sk-empty">타격 지점을 지정하면 반경이 계산됩니다.</p>';

  // ④ 연속사격 안내
  const tl = scene?.timelineOf();
  const m = munitionById(state.munitionId);
  $('#sk-salvo-note').innerHTML = state.rounds === 1
    ? '한 발입니다. 발수를 올리면 누적 손상으로 판정하고, 발마다 CEP 만큼 흩어진 자리에 떨어집니다.'
    : `${state.rounds}발을 <b>${tl?.gapS ?? Math.min(m.reloadS, 15)}초 간격</b>으로 넣습니다`
      + `(실제 재장전 ${m.reloadS}초 — 연출은 15초로 압축). 탄착은 CEP ${m.cepM}m 원형 정규분포로 흩어집니다.`;

  // ⑥ 내구 판정 — 몇 발까지 버티는가
  const endureRows = rows.filter((r) => r.endurance && (r.endurance.p90 || r.endurance.direct)).slice(0, 12);
  // 「몇 방이면 다 무너지는가」 — 시설·감시탑 중 가장 오래 버티는 것이 답이다
  const structural = rows.filter((r) => r.kind !== '감시자산' && r.endurance);
  const defeatable = structural.filter((r) => r.endurance.p90);
  const allDown = defeatable.length === structural.length && structural.length
    ? Math.max(...defeatable.map((r) => r.endurance.p90))
    : null;
  const holdouts = structural.filter((r) => !r.endurance.p90);
  const worst = defeatable.length ? Math.max(...defeatable.map((r) => r.endurance.p90)) : null;
  const headline = !structural.length ? ''
    : allDown
      ? `<div class="sk-headline"><span>이 조준점이면 전 시설 완파까지</span>
          <b>${allDown}발</b>
          <small>90% 신뢰 · ${esc(munitionById(state.munitionId).short)} · 가장 오래 버티는 것은
          ${esc(defeatable.find((r) => r.endurance.p90 === allDown)?.name ?? '')}</small></div>`
      : `<div class="sk-headline warn">
          <span>${worst ? `대부분은 ${worst}발이면 무너지지만` : '이 조준점에서는'}</span>
          <b>${holdouts.length}개 버팀</b>
          <small>${esc(holdouts.map((r) => `${r.name} ${Math.round(r.distM)}m`).join(' · '))}
          — 40발 안에 완파되지 않습니다. 조준점을 옮기거나 더 큰 탄종을 쓰세요.</small></div>`;

  // ── 탄약고 유폭 경고 ──
  // 이 배치에서 가장 값비싼 사건이므로, 표 위에 따로 세워 먼저 읽히게 한다.
  const secs = scene?.secondaries ?? [];
  const magBox = secs.length ? `<div class="sk-mag">
      <div class="sk-mag-head">⚠ 탄약고 유폭 ${secs.length}건</div>
      ${secs.map((x) => `<div class="sk-mag-row"><b>${esc(x.name)}</b>
        <span>저장 ${Math.round(x.tons)}t → TNT 환산 ${Math.round(x.newKg).toLocaleString()}kg</span>
        <span>완파 ${Math.round(x.rings.complete)}m · 유리 ${Math.round(x.rings.light)}m
          · 탄착 +${Math.round(x.atS - (tl?.impactS ?? 0))}초</span></div>`).join('')}
      <p class="muted sk-note">탄약고가 완파되면 저장 탄약이 함께 터집니다
      (순폭약량비 ${Math.round(MAGAZINE_NEW_RATIO * 100)}% 가정). 위 표의 손상에 이 2차 폭발이
      이미 더해져 있습니다 — 탄약고를 다른 시설에서 떼어 놓는 것이 이 배치에서 가장 값싼 보완입니다.</p>
    </div>` : '';

  $('#sk-endure').innerHTML = !state.impact
    ? '<p class="muted sk-empty">타격 지점을 지정하면 계산합니다.</p>'
    : !endureRows.length
      ? '<p class="muted sk-empty">이 탄종으로는 40발 안에 완파되는 대상이 없습니다 — 전부 유효 반경 밖입니다.</p>'
      : headline + magBox + `<div class="tbl-scroll"><table class="dtbl"><thead><tr>
          <th>대상</th><th>거리</th><th>차폐</th><th>1발 손상</th>
          <th>필요 발수<br><small>중앙 / 90%</small></th>
          <th>${state.rounds}발 후 HP</th><th>형상</th></tr></thead><tbody>${endureRows.map((r) => {
        const e = r.endurance;
        const cum = r.cumulative ?? 0;
        const hp = Math.round(hpOf(cum) * 100);
        const stage = stageOf(cum);
        return `<tr>
          <td>${esc(r.name)}${r.hardened ? ' <span class="sk-hard">방호</span>' : ''}</td>
          <td>${Math.round(r.distM)}m</td>
          <td>${maskCell(r.mask)}</td>
          <td>${e.perShot >= 1 ? '<b style="color:' + GRADE_COLOR.destroyed + '">1발 완파</b>'
            : `${(e.perShot * 100).toFixed(1)}%`}</td>
          <td><b>${e.p50 ?? '—'}</b> / <b style="color:var(--accent)">${e.p90 ?? '—'}</b></td>
          <td><span class="sk-bar"><i style="width:${hp}%;background:${
            hp > 64 ? 'var(--ok)' : hp > 0 ? GRADE_COLOR[r.grade] : GRADE_COLOR.destroyed}"></i></span>
            <b style="color:${hp > 64 ? 'var(--ok)' : GRADE_COLOR[r.grade]}">${hp}%</b></td>
          <td style="color:${GRADE_COLOR[r.grade]}">${STAGE_LABEL[stage]}</td></tr>`;
      }).join('')}</tbody></table></div>
      <p class="muted sk-note">한 발이 주는 손상을 <code>(과압/완파문턱)^${DAMAGE_EXPONENT}</code> 로 놓고
      발마다 더해, 합이 100%가 되면 완파로 봅니다(Palmgren–Miner 선형 누적손상).
      중파 ${Math.round(CUM_THRESHOLD.severe * 100)}% · 경파 ${Math.round(CUM_THRESHOLD.moderate * 100)}% ·
      외벽 ${(CUM_THRESHOLD.light * 100).toFixed(1)}% 에서 등급이 바뀝니다 —
      1발일 때는 위 반경 판정과 정확히 같은 답이 나옵니다.
      필요 발수는 CEP 산포를 넣은 500회 시행의 중앙값과 90% 값입니다.</p>`;

  // ⑦ 판정
  const counts = gradeSummary(rows);
  const hit = rows.filter((r) => r.grade !== 'none');
  $('#sk-assess').innerHTML = !state.impact
    ? '<p class="muted sk-empty">타격 지점을 지정하면 판정이 나옵니다.</p>'
    : !rows.length
      ? '<p class="muted sk-empty">배치된 시설·감시자산이 없습니다. <b>배치</b> 탭에서 시설을 세우면 그 시설이 판정 대상이 됩니다.</p>'
      : `<div class="sk-counts">${GRADES.map((g) => `
          <div${counts[g] ? '' : ' class="off"'}><b style="color:${GRADE_COLOR[g]}">${String(counts[g]).padStart(2, '0')}</b>
          <span>${GRADE_LABEL[g]}</span></div>`).join('')}</div>
        ${hit.length ? `<div class="tbl-scroll"><table class="dtbl"><thead><tr>
          <th>대상</th><th>구분</th><th>거리</th><th>등급</th></tr></thead><tbody>${hit.map((r) => `<tr>
          <td>${esc(r.name)}${r.hardened ? ' <span class="sk-hard">방호</span>' : ''}</td>
          <td>${esc(r.kind)}</td><td>${Math.round(r.distM)}m</td>
          <td style="color:${GRADE_COLOR[r.grade]}"><b>${GRADE_LABEL[r.grade]}</b></td></tr>`).join('')}
          </tbody></table></div>`
        : (() => {
          // 「아무 일도 안 일어난다」의 이유를 말해 준다 — 대개 조준점이 멀 뿐이다
          const near = rows[0];
          const need = Math.max(rings?.light ?? 0, rings?.frag ?? 0);
          return `<p class="muted sk-empty">피해 반경 안에 든 대상이 없습니다 —
            가장 가까운 <b>${esc(near.name)}</b> 이 <b>${Math.round(near.distM)}m</b> 로,
            이 탄의 최외곽 영향권 <b>${Math.round(need)}m</b> 밖입니다.
            탄착점을 시설 쪽으로 옮기거나 더 큰 탄종을 고르세요.</p>`;
        })()}
        <p class="muted sk-note">방호 시설은 같은 등급에 이르는 데 3.2배의 과압을 요구합니다
        (반경 ${Math.round((1 - 1 / Math.cbrt(3.2)) * 100)}% 축소). 다만 관통탄두 + 지연신관에는 그 이점이 사라집니다.</p>`;

  // ⑥ CDE
  const cde = cdeRows();
  const nearest = rows.length ? rows[0] : null;
  $('#sk-cde').innerHTML = !nearest
    ? '<p class="muted sk-empty">최근접 아군 대상이 있어야 안전거리를 검증할 수 있습니다.</p>'
    : `<div class="kv"><span>최근접 아군</span><b>${esc(nearest.name)} · ${Math.round(nearest.distM)}m</b></div>
       <div class="kv"><span>요구 안전여유</span><b>${SUDO_COLLATERAL_REQUIRED_SAFETY_MARGIN_M}m</b></div>
       <div class="tbl-scroll"><table class="dtbl"><thead><tr>
         <th>탄종</th><th>피해반경</th><th>요구이격</th><th>판정</th></tr></thead><tbody>${cde.map((c) => `<tr>
         <td>${esc(c.munition)}</td><td>${c.radiusM}m</td><td>${c.requiredM}m</td>
         <td><span class="badge ${c.safe ? 'pass' : 'fail'}">${c.safe ? '충족' : `미달 ${Math.round(c.shortfallM)}m`}</span></td>
       </tr>`).join('')}</tbody></table></div>
       <p class="muted sk-note">아래 <b>부수피해평가 CDE</b> 원표와 같은 데이터입니다 —
       위 시뮬레이션의 파편 위험반경 계수도 이 표에 맞춰 잡혀 있습니다.</p>`;

  paintHud();
}

function ringRow(label, value, color, why) {
  if (!(value > 0)) {
    return `<div class="sk-ring off"><i></i><span>${label}</span><b>—</b><small>${esc(why)}</small></div>`;
  }
  return `<div class="sk-ring"><i style="background:${color}"></i><span>${label}</span>
    <b>${value >= 100 ? Math.round(value) : value.toFixed(1)}m</b><small>${esc(why)}</small></div>`;
}

// ═════════════════════ 지도 위 HUD ═════════════════════

function ensureHud(ctx) {
  let hud = document.getElementById('strike-hud');
  if (hud) { wireHud(hud, ctx); return hud; }
  hud = document.createElement('div');
  hud.id = 'strike-hud';
  hud.className = 'hidden';
  hud.lang = 'ko';
  hud.innerHTML = `
    <div class="sk-hud-head">
      <span class="sk-hud-title"><i></i> 정밀타격 효과 시뮬레이션</span>
      <span class="sk-hud-sub" id="sk-hud-sub">—</span>
      <div class="sk-views" role="group" aria-label="시점">
        <button data-view="overview">어깨 시점</button>
        <button data-view="chase">탄 추적</button>
        <button data-view="top">위에서</button>
      </div>
      <button class="sk-tog" id="sk-sound" title="폭발음 (소리는 빛보다 늦게 옵니다 — 거리 ÷ 343m/s)">♪</button>
      <button class="sk-tog" id="sk-slow" title="탄착 순간 시간 늘이기">◐</button>
      <label class="sk-fx" title="폭발 연출의 크기만 바꿉니다 — 피해 반경과 등급은 그대로입니다">
        <span>효과</span>
        <select id="sk-fx" aria-label="폭발 효과 크기">
          <option value="auto" selected>자동</option>
          <option value="real">실척</option>
          <option value="2">×2</option>
          <option value="4">×4</option>
        </select>
      </label>
      <button class="sk-hud-close" id="sk-hud-close" title="숨기기" aria-label="타격 HUD 숨기기">✕</button>
    </div>
    <div class="sk-counts" id="sk-hud-counts"></div>
    <div class="sk-player">
      <button class="sk-run" id="sk-run">▶ 타격 재생</button>
      <button class="sk-tog" id="sk-mission-skip" title="이 발의 남은 연출을 건너뛰고 바로 다음 발로 넘어갑니다">⏭ 다음 발</button>
      <input type="range" id="sk-time" min="0" max="30" step="0.05" value="0" aria-label="재생 시점">
      <span class="sk-clock" id="sk-clock">00:00</span>
      <select id="sk-speed" class="sk-speed" aria-label="재생 속도">
        <option value="0.25">0.25×</option><option value="0.5">0.5×</option>
        <option value="1" selected>1×</option><option value="2">2×</option>
      </select>
      <button class="sk-tog" id="sk-revive" title="지금 파손·파괴된 시설을 전부 되살립니다 (되감기·재생과 무관)">↻ 즉시 복구</button>
    </div>
    <div class="sk-marks" id="sk-marks"></div>
    <div class="sk-events" id="sk-events"></div>`;
  document.getElementById('map-wrap')?.appendChild(hud);
  wireHud(hud, ctx);
  return hud;
}

function wireHud(hud, ctx) {
  const $ = (s) => hud.querySelector(s);
  $('#sk-run').onclick = () => {
    const scene = state.scene;
    if (state.missionRunning) {
      // 임무 도중에 같은 버튼을 다시 누르면 중단이다 — 재생 재개가 아니다.
      state.missionRunning = false;
      scene?.pause();
      ctx.toast('화력 임무를 중단했습니다', 3000);
      paintPlayer(scene?.t ?? 0);
      return;
    }
    if (state.mission.length) {
      const mount = document.getElementById('strike-panel');
      if (mount) runMission(mount, ctx);
      return;
    }
    if (!scene?.timelineOf()) { ctx.toast('먼저 타격 지점을 지정하세요'); return; }
    if (scene.playing) { scene.pause(); paintPlayer(scene.t); return; }
    // 처음부터 재생할 때는 시점을 다시 잡아 준다. 카메라가 5 km 밖에 있으면 화구가
    // 몇 px 이라 「아무 일도 안 일어났다」로 보인다 — 실제로 그런 제보가 있었다.
    hideOutcome();
    if (state.sound) scene.audio.resume();     // 브라우저 자동재생 정책 — 이 클릭이 그 제스처다
    if (scene.t <= 0.01 && state.cameraMode !== 'chase') scene.setCamera(state.cameraMode);
    void scene.prepare().then(() => scene.play());
    paintPlayer(scene.t);
  };
  $('#sk-mission-skip').onclick = () => {
    const scene = state.scene;
    if (!state.missionRunning || !scene?.timelineOf()) return;
    // 이 발의 남은 연출(충격파 통과·판정 확정 뒤 잔류)을 건너뛴다 — 판정 자체는
    // 시각과 무관하게 이미 정해져 있으므로(setPlan 때 계산), 그냥 끝으로 감아도 안전하다.
    scene.pause();
    scene.seek(scene.timelineOf().totalS);
    advanceMissionStep(ctx);
  };
  $('#sk-time').oninput = (e) => {
    const scene = state.scene;
    if (!scene?.timelineOf()) return;
    scene.pause();
    scene.seek(Number(e.target.value));
  };
  $('#sk-speed').onchange = (e) => {
    state.speed = Number(e.target.value);
    state.scene?.setSpeed(state.speed);
  };
  $('#sk-revive').onclick = () => {
    const scene = state.scene;
    const n = scene?.reviveAll() ?? 0;
    ctx.toast(n ? `${n}개 시설을 즉시 복구했습니다` : '복구할 손상 시설이 없습니다', 3000);
    paintHud();
  };
  $('#sk-sound').onclick = () => {
    state.sound = !state.sound;
    const scene = state.scene;
    if (scene) { scene.audio.setEnabled(state.sound); if (state.sound) scene.audio.resume(); }
    $('#sk-sound').classList.toggle('on', state.sound);
    ctx.toast(state.sound
      ? '폭발음 켜짐 — 소리는 빛보다 늦게 옵니다(거리 ÷ 343m/s). 카메라를 멀리 빼면 늦게 들립니다.'
      : '폭발음 꺼짐', 3600);
  };
  $('#sk-sound').classList.toggle('on', state.sound);
  $('#sk-slow').onclick = () => {
    state.slowmo = !state.slowmo;
    if (state.scene) state.scene.slowmo = state.slowmo;
    $('#sk-slow').classList.toggle('on', state.slowmo);
    ctx.toast(state.slowmo ? '탄착 순간을 느리게 재생합니다' : '실시간 재생', 2600);
  };
  $('#sk-slow').classList.toggle('on', state.slowmo);
  $('#sk-fx').onchange = (e) => {
    const v = e.target.value;
    state.fxScale = v === 'auto' || v === 'real' ? v : Number(v);
    state.scene?.setFxScale(state.fxScale);
    ctx.toast(v === 'real'
      ? '실척 연출 — 소형 탄은 멀리서 보이지 않습니다'
      : v === 'auto' ? '자동 — 거리에 따라 연출 요소의 최소 크기를 보장합니다'
        : `연출 ×${v} — 화면 표현만 커집니다. 피해 반경과 등급은 그대로입니다`, 3600);
  };
  $('#sk-fx').value = String(state.fxScale ?? 'auto');
  $('#sk-hud-close').onclick = () => hud.classList.add('hidden');
  hud.querySelectorAll('[data-view]').forEach((b) => {
    b.onclick = () => {
      state.cameraMode = b.dataset.view;
      hud.querySelectorAll('[data-view]').forEach((x) => x.classList.toggle('on', x === b));
      state.scene?.setCamera(state.cameraMode);
      if (state.cameraMode === 'chase') ctx.toast('탄 추적 시점 — 재생을 누르면 탄을 따라갑니다', 3200);
    };
  });
  hud.querySelectorAll('[data-view]').forEach((x) => x.classList.toggle('on', x.dataset.view === state.cameraMode));
}

/**
 * 전투 결과 — 게임의 결과 화면.
 *
 * 재생이 끝나면 뜬다. 「무엇이 부서졌는가」가 아니라 **「이 사격은 잘한 사격인가」**를
 * 한 줄로 답하는 것이 목적이다. 등급은 효율(최소 필요 발수 대비 사용 발수)에서만
 * 나온다 — 많이 부순 쪽이 아니라 적은 발수로 필요한 것만 부순 쪽이 이긴다.
 */
function showOutcome(ctx) {
  const scene = state.scene;
  const res = scene?.outcome();
  if (!res) return;
  let box = document.getElementById('strike-outcome');
  if (!box) {
    box = document.createElement('div');
    box.id = 'strike-outcome';
    box.lang = 'ko';
    document.getElementById('map-wrap')?.appendChild(box);
  }
  const G = { S: '#7fe3b0', A: '#9fd6ff', B: '#ffd452', C: '#ff9a3c', D: '#ff5f5f' };
  const cell = (label, value, sub) => `<div class="so-cell"><span>${label}</span>
    <b>${value}</b>${sub ? `<small>${sub}</small>` : ''}</div>`;
  box.innerHTML = `
    <div class="so-head">
      <div class="so-grade" style="--g:${G[res.grade]}">${res.grade}</div>
      <div class="so-title"><span>전투 결과 · BDA</span>
        <b>${esc(res.verdict)}</b>
        <small>${esc(res.munition)} · ${esc(res.fuze)} · 유효 ${res.effectiveKg.toLocaleString()}kg TNT</small></div>
      <button class="so-close" id="so-close">✕</button>
    </div>
    <div class="so-grid">
      ${cell('사용 발수', `${res.rounds}발`, res.need ? `최소 필요 ${res.need}발` : '최소 필요 —')}
      ${cell('효율', res.efficiency ? `${Math.round(res.efficiency * 100)}%` : '—',
    res.efficiency ? (res.efficiency >= 1 ? '최소 발수 이내' : '과잉 사격')
      : res.holdouts.length ? '미완수 — 평가 불가' : '최소 필요 발수 미산출')}
      ${cell('평균 탄착 편차', `${res.avgMiss.toFixed(1)}m`, `CEP ${munitionById(state.munitionId).cepM}m`)}
      ${cell('구조물', `${res.downed}/${res.structural}`, '완파')}
      ${cell('완파 · 중파', `${res.counts.destroyed} · ${res.counts.severe}`, '감시자산 포함')}
      ${cell('탄약고 유폭', res.secondary ? `${res.secondary}건` : '없음',
    res.secondary ? '둘레를 함께 지웠습니다' : '')}
    </div>
    <div class="so-foot">
      <button class="btn" id="so-replay">↻ 다시 재생</button>
      <button class="btn" id="so-vuln">취약 조준점 분석 ▶</button>
      <button class="btn primary" id="so-save">↓ 효과판정 기록 · JSON</button>
    </div>`;
  box.classList.remove('hidden');
  box.querySelector('#so-close').onclick = () => hideOutcome();
  box.querySelector('#so-replay').onclick = () => {
    hideOutcome();
    scene.seek(0);
    void scene.prepare().then(() => scene.play());
  };
  box.querySelector('#so-vuln').onclick = () => {
    hideOutcome();
    document.getElementById('sk-vuln')?.click();
  };
  box.querySelector('#so-save').onclick = () => {
    hideOutcome();
    document.getElementById('sk-save')?.click();
  };
  ctx?.toast?.(`전투 결과 ${res.grade} — ${res.verdict}`, 5200);
}

function hideOutcome() {
  document.getElementById('strike-outcome')?.classList.add('hidden');
}

function paintHud() {
  const hud = document.getElementById('strike-hud');
  if (!hud) return;
  const scene = state.scene;
  const tl = scene?.timelineOf();
  const rings = scene?.ringsOf();
  const rows = scene?.targets() ?? [];
  const counts = gradeSummary(rows);
  const m = munitionById(state.munitionId);

  {
    const subText = state.planning
      ? `계획 모드 — ${m.short} · 지도를 클릭해 표적 추가 (${state.mission.length}발 쌓임)`
      : state.missionRunning
        ? `화력 임무 ${state.missionIdx + 1}/${state.mission.length} 진행 중 — ${m.short} · ${state.impact?.mgrs ?? ''}`
        : state.impact
          ? `${m.short} × ${state.rounds}발 · ${fuzeById(state.fuzeId).name.split(' ')[0]}`
            + ` · 유효 ${Math.round(rings?.effectiveKg ?? 0)}kg TNT · ${state.impact.mgrs}`
            + (state.mission.length ? ` · 임무 ${state.mission.length}발 대기중` : '')
          : state.mission.length ? `화력 임무 ${state.mission.length}발 대기중 — 계획 중지로 시작` : '타격 계획 없음';
    const subEl = hud.querySelector('#sk-hud-sub');
    subEl.textContent = subText;
    // 좁은 화면에서는 이 줄이 통째로 잘린다 — 마우스오버로 전체(유효 폭약량·MGRS)를 복구할 수 있게 한다.
    subEl.title = subText;
  }
  hud.querySelector('#sk-hud-counts').innerHTML = GRADES.map((g) => `
    <div${counts[g] ? '' : ' class="off"'}><b style="color:${GRADE_COLOR[g]}">${String(counts[g]).padStart(2, '0')}</b>
    <span>${GRADE_LABEL[g]}</span></div>`).join('');

  const slider = hud.querySelector('#sk-time');
  slider.max = String(tl?.totalS ?? 30);
  hud.querySelector('#sk-run').disabled = state.planning || (!tl && !state.mission.length);
  hud.querySelector('#sk-revive').disabled = !scene?.hasDamageNow();
  const skip = hud.querySelector('#sk-mission-skip');
  skip.classList.toggle('hidden', !state.missionRunning);
  skip.disabled = !state.missionRunning;

  hud.querySelector('#sk-marks').innerHTML = tl
    ? `<span>00:00 진입</span><span>${clock(tl.impactS)} 탄착</span>
       <span>${clock(tl.impactS + 6)} 판정</span><span>${clock(tl.totalS)} 종료</span>`
    : '';
  hud.querySelector('#sk-events').innerHTML = tl ? tl.events.map((e) => `
    <button data-ev="${e.time}" class="${(scene?.t ?? 0) >= e.time ? 'done' : ''}" title="${esc(e.detail)}">
      <time>${clock(Math.max(0, e.time))}</time><span>${esc(e.title)}</span></button>`).join('') : '';
  hud.querySelectorAll('[data-ev]').forEach((b) => {
    b.onclick = () => { state.scene?.pause(); state.scene?.seek(Number(b.dataset.ev) + 0.05); };
  });
  paintPlayer(scene?.t ?? 0);
}

function paintPlayer(t) {
  const hud = document.getElementById('strike-hud');
  if (!hud) return;
  const scene = state.scene;
  const tl = scene?.timelineOf();
  hud.querySelector('#sk-time').value = String(t);
  hud.querySelector('#sk-clock').textContent = tl
    ? `${clock(t)} / ${clock(tl.totalS)}${t >= tl.impactS ? ' · 탄착 후' : ' · 비행 중'}`
    : '00:00';
  const run = hud.querySelector('#sk-run');
  run.textContent = state.planning ? '계획 중…'
    : state.missionRunning ? 'Ⅱ 임무 중단'
      : scene?.playing ? 'Ⅱ 일시 정지'
        : state.mission.length ? `▶ 화력 임무 실행 (${state.mission.length}발)`
          : tl && t >= tl.totalS ? '↻ 다시 재생' : '▶ 타격 재생';
  hud.querySelectorAll('[data-ev]').forEach((b) => {
    b.classList.toggle('done', t >= Number(b.dataset.ev));
  });
  hud.querySelector('#sk-revive').disabled = !scene?.hasDamageNow();
  const skip = hud.querySelector('#sk-mission-skip');
  skip.classList.toggle('hidden', !state.missionRunning);
  skip.disabled = !state.missionRunning;
  // 판정은 탄착 후에 확정된다 — 재생 중에도 패널 표가 그 순간을 따라가야 한다
  const panel = document.getElementById('strike-panel');
  if (panel && scene) {
    const rows = scene.targets();
    const counts = gradeSummary(rows);
    const box = hud.querySelector('#sk-hud-counts');
    if (box && t >= (tl?.impactS ?? 0)) {
      box.innerHTML = GRADES.map((g) => `
        <div${counts[g] ? '' : ' class="off"'}><b style="color:${GRADE_COLOR[g]}">${String(counts[g]).padStart(2, '0')}</b>
        <span>${GRADE_LABEL[g]}</span></div>`).join('');
    }
  }
}
