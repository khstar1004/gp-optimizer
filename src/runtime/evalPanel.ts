// @ts-nocheck
/**
 * 작전 평가보고서 패널 — VISTA 지형 브리핑 카드 방식으로 지도 위에 띄운다.
 *
 * 원본 참고: VISTA_sudo/client/public/terrain-3d/viewer.js `renderVlmReport` /
 * `renderReportListCard` — 요약 카드 + 항목별 리스트 카드 구성을 그대로 따른다.
 * GP 확장분은 판정 배지(verdict)와 권고 카드(priority)다.
 */
const $ = (sel) => document.querySelector(sel);
const esc = (s) => String(s ?? '').replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));

export function showEvalPanel() {
  const panel = $('#eval-panel');
  if (!panel) return;
  panel.classList.remove('hidden');
  $('#eval-body').innerHTML = `
    <div class="ev-loading" id="eval-loading">
      <div class="loader-ring"></div>
      <div id="eval-stage">분석 준비…</div>
    </div>`;
}

export function hideEvalPanel() {
  $('#eval-panel')?.classList.add('hidden');
}

export function setEvalStage(text) {
  const el = $('#eval-stage');
  if (el) el.textContent = text;
}

function listCard(title, items) {
  const list = Array.isArray(items) ? items.filter(Boolean) : [];
  if (!list.length) return '';
  return `
    <article class="ev-card">
      <h3>${esc(title)}</h3>
      <ul class="ev-list">${list.map((i) => `<li>${esc(i)}</li>`).join('')}</ul>
    </article>`;
}

function recommendationsCard(recs) {
  const list = Array.isArray(recs) ? recs.filter(Boolean) : [];
  if (!list.length) return '';
  return `
    <article class="ev-card">
      <h3>권고</h3>
      ${list.map((r) => `
        <div class="ev-rec">
          <div class="ev-rec-head">
            <span class="ev-rec-title">${esc(r.title)}</span>
            <span class="ev-pri ${esc(r.priority)}">${esc(r.priority)}</span>
          </div>
          <div class="ev-rec-action">${esc(r.action)}</div>
        </div>`).join('')}
    </article>`;
}

/** 평가에 실제로 들어간 근거 규모 — LLM이 뭘 보고 썼는지 밝힌다 */
function basisLine(payload) {
  if (!payload) return '';
  const bits = [];
  if (payload.placement) {
    bits.push(`배치 ${payload.placement.placedCount}/${payload.placement.unitCount}동 · 규칙 ${
      (payload.placement.rules ?? []).filter((r) => r.ok).length}/${(payload.placement.rules ?? []).length} 충족`);
  }
  if (payload.buildings?.length) bits.push(`동별 토공 ${payload.buildings.length}건`);
  if (payload.routeAnalysis?.routes?.length) bits.push(`축선 ${payload.routeAnalysis.routes.length}개`);
  if (payload.terrain) bits.push(`지형 ${payload.terrain.terrainClass}`);
  if (payload.threatEnvelope?.placedSystems?.length) bits.push(`위협체계 ${payload.threatEnvelope.placedSystems.length}종`);
  if (payload.fires?.firingUnits?.length) {
    bits.push(`사격부대 ${payload.fires.firingUnits.filter((u) => u.firable).length}/${payload.fires.firingUnits.length} 가용`);
  }
  return bits.join(' · ');
}

export function renderEvalReport(report, meta = {}) {
  const body = $('#eval-body');
  const modelEl = $('#eval-model');
  if (!body) return;

  if (meta.error) {
    body.innerHTML = `<article class="ev-card"><h3>평가 실패</h3>
      <p class="ev-copy">${esc(meta.error)}</p>
      <p class="ev-basis">로컬 Ollama가 필요합니다. <code>ollama serve</code> 로 띄운 뒤 다시 실행하세요.</p></article>`;
    return;
  }
  if (!report) { body.innerHTML = ''; return; }

  if (modelEl) modelEl.textContent = meta.model ? `${meta.model}` : '';
  const grade = report.verdict?.grade ?? '';

  body.innerHTML = `
    ${report.verdict ? `
      <div class="ev-verdict g${esc(grade)}">
        <span class="ev-grade">${esc(grade)}</span>
        <span class="ev-rationale">${esc(report.verdict.rationale)}</span>
      </div>` : ''}
    <article class="ev-card">
      <h3>상황 요약</h3>
      <p class="ev-copy">${esc(report.executiveSummary ?? '')}</p>
    </article>
    ${listCard('배치 최적화 평가', report.placementAssessment)}
    ${listCard('적 이동경로 위협 평가', report.routeThreatAssessment)}
    ${listCard('화력운용 결과 평가', report.firesAssessment)}
    ${listCard('위험 요소', report.risks)}
    ${recommendationsCard(report.recommendations)}
    <p class="ev-basis">근거: ${esc(basisLine(meta.payload))}${
  meta.promptChars ? ` · 입력 ${meta.promptChars.toLocaleString()}자` : ''}<br>
      수치는 엔진(Scaffolda 배치 · KAIROS 경로·교리 · VISTA 위협권)이 계산한 값이고,
      LLM은 해석·연결·권고만 수행합니다.</p>`;
}

