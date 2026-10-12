// @ts-nocheck
/**
 * 화력 탭 — KAIROS 교리 데이터 전시 + 위협권 표출 + 작전 보고서 생성.
 *
 * 표시하는 표는 전부 벤더링한 원본 데이터다 (js/vendor/kairos/):
 *   탄약효과표      sudoMunitionEffectIntel.SUDO_MUNITION_EFFECT_SOURCE_ROWS
 *   부수피해 CDE    sudoCollateralCdeTable.SUDO_COLLATERAL_CDE_ROWS
 *   사격부대 제원   sudoFiringUnitIntel.SUDO_FIRING_UNIT_SOURCE_ROWS
 *   사격계획·타격자산 sudoFirePlanIntel.*
 *   타격 6단계      sudoStrikeSequence.SUDO_STRIKE_SEQUENCE_STEPS
 *   무기체계 위협   utils/threatCoverage.FACILITY_THREAT_PROFILES
 * 보고서는 War ground 원본 renderReportMarkdown 으로 렌더한다.
 *
 * 맨 위에는 **정밀타격 효과 시뮬레이션**(strikeTab)이 선다. 아래 표들이 「무엇으로 쏠 수
 * 있는가」를 말한다면 그 패널은 「그 자리에 쏘면 어떻게 되는가」를 실제 3D 지도 위에서
 * 보여 준다 — 원래 별도의 「피해 시각화」 탭이었으나, 두 화면이 같은 표적을 보면서 서로를
 * 모르는 것이 이상해서 여기로 합쳤다. 탄착점은 아래 CDE 검증의 입력이 되고, CDE 표가
 * 권고하는 탄종은 위 카탈로그에서 그대로 고를 수 있다.
 */
import {
  SUDO_MUNITION_EFFECT_SOURCE_ROWS,
  SUDO_COLLATERAL_CDE_ROWS,
  SUDO_FIRING_UNIT_SOURCE_ROWS,
  SUDO_FIRE_PLAN_SOURCE_ROWS,
  SUDO_STRIKE_ASSET_SOURCE_ROWS,
  SUDO_STRIKE_SEQUENCE_STEPS,
  SUDO_SCALE_DOCTRINE_ROWS,
} from './fires';
import { GP_SCALE_PROFILES, sideOf } from './threatRings';
import {
  buildReportMarkdown, renderReportHtml, downloadMarkdown,
  MISSION_MODE_OPTIONS, AUDIENCE_OPTIONS, CLASSIFICATION_OPTIONS, TIME_HORIZON_OPTIONS,
} from './report';
import { renderStrikePanel } from './strikeTab';

const esc = (s) => String(s ?? '').replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));

/** 기본 선택 위협 체계 — GP 스케일 전량 */
export const DEFAULT_THREATS = GP_SCALE_PROFILES.map((p) => p.className);

const state = {
  model: null,
  threats: new Set(DEFAULT_THREATS),
  profile: {
    missionMode: 'operation_order',
    audience: 'chief_of_staff',
    classification: 'restricted',
    timeHorizon: '72h',
  },
  lastMarkdown: '',
};

export function firesState() { return state; }

function optionsHtml(opts, current) {
  return opts.map((o) => `<option value="${o.value}"${o.value === current ? ' selected' : ''}>${esc(o.label)}</option>`).join('');
}

export function renderFiresTab(mount, ctx) {
  const munitionRows = SUDO_MUNITION_EFFECT_SOURCE_ROWS;
  const bands = [...new Set(munitionRows.map((r) => r.rangeBand))];

  mount.innerHTML = `
    <div id="strike-panel"></div>

    <div class="sec"><div class="sec-title">위협권 표출 (실무기체계)</div>
      <p class="muted" style="margin-bottom:6px">VISTA <code>threatCoverage</code> 원본 프로파일 —
      사거리·탐지호는 제조사·방사청 공개 출처값입니다. GP 스케일(≤12km) ${GP_SCALE_PROFILES.length}종.</p>
      <div id="threat-list"></div>
      <div class="btn-row" style="margin-top:6px">
        <button class="btn primary" id="threat-apply">위협권 표출 ▶</button>
        <button class="btn" id="threat-clear">해제</button>
      </div>
      <div id="threat-out" style="margin-top:6px"></div></div>

    <div class="sec"><div class="sec-title">타격 절차 (KAIROS ${SUDO_STRIKE_SEQUENCE_STEPS.length}단계)</div>
      <div class="strike-steps">${SUDO_STRIKE_SEQUENCE_STEPS.map((s) => `
        <div class="strike-step${s.firesArtillery ? ' fires' : ''}">
          <div class="ss-head"><b>${esc(s.label)}</b><span>${esc(s.time)}</span></div>
          <div class="ss-title">${esc(s.title)}</div>
          <div class="ss-detail">${esc(s.munition)} · ${esc(s.rounds)}</div>
        </div>`).join('')}</div></div>

    <div class="sec"><div class="sec-title">탄약·발수 판단표 (원본 ${munitionRows.length}행)</div>
      <p class="muted" style="margin-bottom:4px">사거리대 × 지형 × 사격단위 → 요망효과 10/20/30% 탄종·발수</p>
      <select id="mun-band" class="sel">${bands.map((b) => `<option>${esc(b)}</option>`).join('')}</select>
      <div id="mun-table" style="margin-top:6px"></div></div>

    <div class="sec"><div class="sec-title">부수피해평가 CDE (원본 ${SUDO_COLLATERAL_CDE_ROWS.length}행)</div>
      <div class="tbl-scroll"><table class="dtbl"><thead><tr>
        <th>사거리</th><th>HE</th><th>HEBB</th><th>DPICM</th><th>DPBB</th><th>유도</th><th>확산</th>
      </tr></thead><tbody>${SUDO_COLLATERAL_CDE_ROWS.map((r) => `<tr>
        <td>${esc(r.range)}</td><td>${esc(r.he)}</td><td>${esc(r.hebb)}</td><td>${esc(r.dpicm)}</td>
        <td>${esc(r.dpbb)}</td><td>${esc(r.guided)}</td><td>${esc(r.cluster)}</td></tr>`).join('')}
      </tbody></table></div>
      <p class="muted" style="margin-top:4px">단위 m — 탄종별 부수피해 안전거리</p></div>

    <div class="sec"><div class="sec-title">사격부대 제원 (원본 ${SUDO_FIRING_UNIT_SOURCE_ROWS.length}개 부대)</div>
      ${SUDO_FIRING_UNIT_SOURCE_ROWS.map((u) => `
        <div class="card" style="padding:7px 10px;margin-bottom:5px">
          <div class="kv" style="border:none;padding:0"><span>${esc(u.unit)}</span>
            <span class="badge ${u.combatReady ? 'pass' : 'fail'}">${esc(u.combatStatus)}</span></div>
          <div class="ss-detail">최대사거리 ${u.maxRangeKm}km · ${esc(u.ammoSummary)} · CSR ${u.csr}%</div>
          <div class="ss-detail ${u.civilianSafe ? '' : 'warn'}">${esc(u.civilianImpact)} · 생존성 ${esc(u.survival)}</div>
        </div>`).join('')}</div>

    <div class="sec"><div class="sec-title">타격자산 · 사격계획 원표</div>
      <div class="tbl-scroll"><table class="dtbl"><thead><tr>${
        Object.keys(SUDO_STRIKE_ASSET_SOURCE_ROWS[0] ?? {}).map((k) => `<th>${esc(k)}</th>`).join('')
      }</tr></thead><tbody>${SUDO_STRIKE_ASSET_SOURCE_ROWS.map((r) => `<tr>${
        Object.values(r).map((v) => `<td>${esc(typeof v === 'object' ? JSON.stringify(v) : v)}</td>`).join('')
      }</tr>`).join('')}</tbody></table></div>
      <p class="muted" style="margin-top:4px">사격계획 ${SUDO_FIRE_PLAN_SOURCE_ROWS.length}행 · 규모교리 ${SUDO_SCALE_DOCTRINE_ROWS.length}행 동봉</p></div>

    <div class="sec"><div class="sec-title">종합 평가보고서 (LLM)</div>
      <p class="muted" style="margin-bottom:6px">가시영역 → 적 이동경로 채점 → 지형분석 → 위협권 →
      화력판단을 순서대로 산출한 뒤, 그 결과를 로컬 LLM이 평가해 지도 위에 브리핑 카드로 띄웁니다.
      수치는 엔진이 계산하고 LLM은 해석·권고만 합니다.</p>
      <select id="ev-model" class="sel"><option>모델 조회 중…</option></select>
      <button class="btn primary full" id="ev-run" style="margin-top:6px">종합 분석 + 평가 ▶</button>
      <div class="btn-row" style="margin-top:6px">
        <button class="btn" id="ev-gap">취약 축선 자동 보완</button>
        <button class="btn" id="ev-gap-clear">해제</button>
      </div>
      <div id="ev-gap-out" style="margin-top:6px"></div>
      <p class="muted" id="ev-note" style="margin-top:4px"></p></div>

    <div class="sec"><div class="sec-title">작전 보고서</div>
      <p class="muted" style="margin-bottom:6px">현재 배치·비용·축선·IPB·지형분석·화력 판단을 묶어
      War ground 원본 <code>renderReportMarkdown</code> 으로 렌더합니다.</p>
      <div class="rp-grid">
        <label>임무<select id="rp-mode" class="sel">${optionsHtml(MISSION_MODE_OPTIONS, state.profile.missionMode)}</select></label>
        <label>대상<select id="rp-aud" class="sel">${optionsHtml(AUDIENCE_OPTIONS, state.profile.audience)}</select></label>
        <label>등급<select id="rp-cls" class="sel">${optionsHtml(CLASSIFICATION_OPTIONS, state.profile.classification)}</select></label>
        <label>시계<select id="rp-th" class="sel">${optionsHtml(TIME_HORIZON_OPTIONS, state.profile.timeHorizon)}</select></label>
      </div>
      <div class="btn-row" style="margin-top:6px">
        <button class="btn primary" id="rp-build">보고서 생성 ▶</button>
        <button class="btn" id="rp-dl" disabled>.md 내려받기</button>
      </div>
      <div id="rp-out" class="rp-out"></div></div>`;

  // ─── 정밀타격 효과 시뮬레이션 (지도 위에서 도는 유일한 섹션) ───
  renderStrikePanel(mount.querySelector('#strike-panel'), ctx);

  // ─── 위협 체계 목록 ───
  mount.querySelector('#threat-list').innerHTML = GP_SCALE_PROFILES.map((p) => `
    <div class="layer-row">
      <span class="l-name"><span class="th-dot ${sideOf(p)}"></span>${esc(p.className)}
        <span class="muted">${p.range}km · ${p.detectionArcDegrees}°</span></span>
      <input type="checkbox" data-threat="${esc(p.className)}" ${state.threats.has(p.className) ? 'checked' : ''}>
    </div>`).join('');
  mount.querySelectorAll('[data-threat]').forEach((cb) => {
    cb.onchange = () => {
      if (cb.checked) state.threats.add(cb.dataset.threat);
      else state.threats.delete(cb.dataset.threat);
    };
  });

  mount.querySelector('#threat-apply').onclick = () => {
    const n = ctx.threatLayer.applyDefaultLayout([...state.threats]);
    ctx.threatLayer.show(true);
    const env = ctx.threatLayer.droneEnvelope();
    const envText = env.originInside
      ? `GP 자체가 위협권 내 (${env.coveringCount}종 중첩)`
      : env.unrestricted ? '제한 없음 (8km 이상)' : `${(env.limitedByM / 1000).toFixed(1)}km`;
    mount.querySelector('#threat-out').innerHTML = `
      <div class="kv"><span>표출 체계</span><b>${n}종</b></div>
      <div class="kv"><span>북측 드론 진출</span>
        <span class="badge ${env.originInside ? 'fail' : env.unrestricted ? 'pass' : ''}">${esc(envText)}</span></div>
      ${env.threat ? `<p class="muted" style="margin-top:2px">${env.originInside ? '최대 위협' : '제한 요인'}: ${esc(env.threat.className)}
        (${env.threat.range}km · 탐지호 ${env.threat.detectionArcDegrees}°)${env.threat.sourceUrl
          ? ` — <a href="${esc(env.threat.sourceUrl)}" target="_blank" rel="noreferrer">공개출처</a>` : ''}</p>` : ''}`;
    ctx.toast(`위협권 ${n}종 표출 — ${envText}`);
  };
  mount.querySelector('#threat-clear').onclick = () => {
    ctx.threatLayer.clear();
    mount.querySelector('#threat-out').innerHTML = '';
  };

  // ─── 탄약효과표 ───
  const drawMun = () => {
    const band = mount.querySelector('#mun-band').value;
    const rows = munitionRows.filter((r) => r.rangeBand === band);
    mount.querySelector('#mun-table').innerHTML = `
      <div class="tbl-scroll"><table class="dtbl"><thead><tr>
        <th>표적</th><th>지형</th><th>사격단위</th><th>10%</th><th>20%</th><th>30%</th>
      </tr></thead><tbody>${rows.map((r) => `<tr>
        <td>${esc(r.targetType)}</td><td>${esc(r.terrainLabel)}</td><td>${esc(r.fireUnit)}</td>
        <td>${esc(r.effectCells['10'])}</td><td>${esc(r.effectCells['20'])}</td><td>${esc(r.effectCells['30'])}</td>
      </tr>`).join('')}</tbody></table></div>`;
  };
  mount.querySelector('#mun-band').onchange = drawMun;
  drawMun();

  // ─── 종합 평가보고서 (LLM) ───
  const modelSel = mount.querySelector('#ev-model');
  ctx.listOllamaModels().then((models) => {
    if (!models.length) {
      modelSel.innerHTML = '<option value="">Ollama 미가동</option>';
      mount.querySelector('#ev-note').textContent = '로컬 Ollama가 응답하지 않습니다. `ollama serve` 실행 후 탭을 다시 여세요.';
      return;
    }
    // 평가는 추론 품질이 중요해 가장 큰 모델을 기본 선택한다 (임베딩 모델 제외).
    const usable = models.filter((m) => !/embed/i.test(m));
    const preferred = usable.find((m) => /gemma4|qwen3\.5|llama3\.[13]/i.test(m)) ?? usable[0];
    state.model = preferred;
    modelSel.innerHTML = usable.map((m) =>
      `<option value="${esc(m)}"${m === preferred ? ' selected' : ''}>${esc(m)}</option>`).join('');
  });
  modelSel.onchange = () => { state.model = modelSel.value; };

  mount.querySelector('#ev-gap').onclick = async () => {
    const r = await ctx.runGapClosure();
    const out = mount.querySelector('#ev-gap-out');
    if (!r) { out.innerHTML = ''; return; }
    const c = r.coverage;
    out.innerHTML = `
      <div class="kv"><span>보완 대상 축선</span><b>${esc(r.route.name.split(' — ')[0])}</b></div>
      <div class="kv"><span>부감시소 위치</span><b>GP 후방 ${r.post.rangeM}m · 표고 ${r.post.elevationM}m</b></div>
      <div class="kv"><span>축선 관측률</span>
        <b>${c.beforePercent}% → <span style="color:#3dd68c">${c.afterPercent}%</span></b></div>
      <div class="kv"><span>공백 해소</span><b>${c.gapPointsClosedEstimate}/${c.gapPointsTotal} 지점</b></div>
      <p class="muted" style="margin-top:3px">후보 ${r.candidates.length}곳을 지구곡률 보정 LOS로 평가한 최적안입니다${
      r.post.inThreat ? ' · <span style="color:#ed5d5d">적 위협권 내 — 방호 보강 필요</span>' : ''}.
      이후 평가에 개선폭이 함께 들어갑니다.</p>`;
  };
  mount.querySelector('#ev-gap-clear').onclick = () => {
    ctx.clearGapClosure();
    mount.querySelector('#ev-gap-out').innerHTML = '';
  };

  mount.querySelector('#ev-run').onclick = () => {
    if (!state.model) { ctx.toast('사용 가능한 Ollama 모델이 없습니다'); return; }
    ctx.runEvaluation({ model: state.model });
  };

  // ─── 보고서 ───
  const readProfile = () => {
    state.profile = {
      missionMode: mount.querySelector('#rp-mode').value,
      audience: mount.querySelector('#rp-aud').value,
      classification: mount.querySelector('#rp-cls').value,
      timeHorizon: mount.querySelector('#rp-th').value,
    };
  };
  mount.querySelector('#rp-build').onclick = () => {
    readProfile();
    const md = buildReportMarkdown({ profile: state.profile, ...ctx.reportContext() });
    state.lastMarkdown = md;
    mount.querySelector('#rp-out').innerHTML = renderReportHtml(md);
    mount.querySelector('#rp-dl').disabled = false;
    ctx.toast('작전 보고서 생성 완료');
  };
  mount.querySelector('#rp-dl').onclick = () => {
    if (state.lastMarkdown) downloadMarkdown(state.lastMarkdown);
  };
}

