// @ts-nocheck
/**
 * 결심 탭 — KAIROS 원본 결심엔진 14개 시나리오를 GP 상황으로 돌려 전시한다.
 *
 * 출력(제목·서술·지표·판단단계·근거표)은 전부 원본 `getSudoDecisionOutput` 이 만든 것이고,
 * 이 파일은 그 구조를 그대로 렌더한다.
 */
import { DECISION_SCENARIOS, buildInputs, runScenario } from './decision';

const esc = (s) => String(s ?? '').replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));

const TONE_CLASS = {
  green: 'tone-ok', blue: 'tone-info', amber: 'tone-warn', red: 'tone-ng', gray: '',
};

const state = { scenarioId: 7, damage: 30, inputs: null, last: null };
export function decisionState() { return state; }

function renderMetrics(metrics) {
  if (!Array.isArray(metrics) || !metrics.length) return '';
  return `<div class="dm-grid">${metrics.map((m) => `
    <div class="dm ${TONE_CLASS[m.tone] ?? ''}">
      <span class="dm-l">${esc(m.label)}</span>
      <b class="dm-v">${esc(m.value)}</b>
    </div>`).join('')}</div>`;
}

function renderSteps(steps) {
  if (!Array.isArray(steps) || !steps.length) return '';
  return `<ol class="d-steps">${steps.map((s) => `<li>${esc(s)}</li>`).join('')}</ol>`;
}

function renderTable(table) {
  if (!table?.columns?.length || !table?.rows?.length) return '';
  return `
    <div class="d-tbl-title">${esc(table.title ?? '')}</div>
    <div class="tbl-scroll"><table class="dtbl"><thead><tr>${
      table.columns.map((c) => `<th>${esc(c.label ?? c.key)}</th>`).join('')
    }</tr></thead><tbody>${
      table.rows.map((row) => `<tr>${
        table.columns.map((c) => {
          const v = row[c.key];
          return `<td>${esc(typeof v === 'object' && v !== null ? (v.value ?? JSON.stringify(v)) : v)}</td>`;
        }).join('')
      }</tr>`).join('')
    }</tbody></table></div>`;
}

function renderOutput(out) {
  if (!out) return '<p class="muted">이 시나리오는 현재 입력으로 산출되지 않았습니다.</p>';
  if (out.error) return `<p class="muted">산출 실패: ${esc(out.error)}</p>`;
  return `
    <div class="d-title">${esc(out.title)}</div>
    ${out.summary ? `<p class="d-summary">${esc(out.summary)}</p>` : ''}
    ${renderMetrics(out.metrics)}
    ${renderSteps(out.steps)}
    ${renderTable(out.table)}
    ${Array.isArray(out.sourceTables) && out.sourceTables.length
      ? `<p class="muted" style="margin-top:5px">근거 원표 ${out.sourceTables.length}종 —
         ${out.sourceTables.map((t) => esc(t.title ?? t.name ?? '')).filter(Boolean).join(' · ')}</p>` : ''}`;
}

export function renderDecisionTab(mount, ctx) {
  mount.innerHTML = `
    <div class="sec"><div class="sec-title">참모 결심 판단 (KAIROS 결심엔진)</div>
      <p class="muted" style="margin-bottom:6px">원본 <code>sudoDecisionEngine</code> 14개 시나리오를
      현재 GP 상황(지형분석·침투·IPB·배치·ITS 도로)으로 구동합니다. 판단근거·원표까지 원본 출력입니다.</p>
      <select id="d-scenario" class="sel">${DECISION_SCENARIOS.map((s) =>
    `<option value="${s.id}"${s.id === state.scenarioId ? ' selected' : ''}>${s.id}. ${s.label}</option>`).join('')}</select>
      <div class="slider-row" style="margin-top:6px"><label>요망효과</label>
        <input type="range" id="d-damage" min="10" max="30" step="10" value="${state.damage}">
        <b id="d-damage-val">${state.damage}%</b></div>
      <div class="btn-row" style="margin-top:6px">
        <button class="btn primary" id="d-run">판단 산출 ▶</button>
        <button class="btn" id="d-runall">14개 전체</button>
      </div>
      <div id="d-input-note" class="muted" style="margin-top:5px"></div></div>
    <div class="sec" id="d-out-sec" style="display:none">
      <div id="d-out"></div></div>`;

  const damage = mount.querySelector('#d-damage');
  damage.oninput = () => {
    state.damage = Number(damage.value);
    mount.querySelector('#d-damage-val').textContent = `${state.damage}%`;
  };
  mount.querySelector('#d-scenario').onchange = (e) => { state.scenarioId = Number(e.target.value); };

  const prepare = () => {
    const c = ctx.decisionContext();
    state.inputs = buildInputs({ ...c, desiredDamagePercent: state.damage });
    mount.querySelector('#d-input-note').innerHTML = `
      입력 — 표적 <b>${esc(state.inputs.targetLabel)}</b> ·
      지형 산림 ${state.inputs.forestPercent}% / 개활 ${state.inputs.openTerrainPercent}% ·
      최근접 아군 ${state.inputs.nearestCivilianM}m ·
      기동로 후보 ${state.inputs.routeOptions.length} ·
      도로정보 ${state.inputs.roadInfoRows.length}행${c.roadInfo ? ' (ITS 실측)' : ''}`;
    return state.inputs;
  };

  mount.querySelector('#d-run').onclick = () => {
    const inputs = prepare();
    const out = runScenario(state.scenarioId, inputs);
    state.last = out;
    mount.querySelector('#d-out-sec').style.display = '';
    mount.querySelector('#d-out').innerHTML = renderOutput(out);
    ctx.toast(out?.title ? `결심 산출 — ${out.title}` : '산출 결과 없음');
  };

  mount.querySelector('#d-runall').onclick = () => {
    const inputs = prepare();
    const all = DECISION_SCENARIOS.map((s) => ({ ...s, output: runScenario(s.id, inputs) }));
    const ok = all.filter((s) => s.output && !s.output.error);
    mount.querySelector('#d-out-sec').style.display = '';
    mount.querySelector('#d-out').innerHTML = all.map((s) => `
      <details class="d-acc"${s.id === state.scenarioId ? ' open' : ''}>
        <summary>${s.id}. ${esc(s.label)}${s.output?.error ? ' — 실패' : ''}</summary>
        <div class="d-acc-body">${renderOutput(s.output)}</div>
      </details>`).join('');
    ctx.toast(`결심 14개 중 ${ok.length}개 산출`);
  };
}

