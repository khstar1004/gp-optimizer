// @ts-nocheck
/**
 * 예측 탭 — 보수소요 예측·투자조합 결과를 트윈 위에 얹는다.
 *
 * 입력은 예측·처방 파이프라인(Python, twinbuild_synthetic_experiment.py)이 낸 결과 파일
 * `/assets/forecast/analysis_results.json` 하나다. 이 탭은 그 파일을 읽어
 *   ① 홀드아웃 지표(KPI) ② 위험도 상위 부재 표 ③ 선정 근거(특징 중요도·추적 예시)
 * 를 그리고, 표의 행을 현재 배치된 시설에 순서대로 대응시켜 3D 화면에 위험도 마커를 올린다.
 * 실자료가 반입되면 같은 파일 형식으로 교체하면 된다.
 *
 * ※ 동봉 결과 파일은 합성 패널 실험이며 실제 국방 성과가 아니다.
 */

const esc = (s) => String(s ?? '').replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
const pct = (v) => `${Math.round(v * 100)}%`;
const RESULT_URL = '/assets/forecast/analysis_results.json';

const state = { data: null, markers: [], shown: false, error: null };
export function forecastState() { return state; }

async function load() {
  if (state.data) return state.data;
  const r = await fetch(RESULT_URL, { cache: 'no-store' });
  if (!r.ok) throw new Error(`${RESULT_URL} ${r.status}`);
  state.data = await r.json();
  return state.data;
}

function riskColor(p) {
  if (p >= 0.8) return '#ef4444';
  if (p >= 0.5) return '#f59e0b';
  return '#9ca3af';
}

function kpiGrid(R) {
  const pm = R.port_model, pr = R.port_rep;
  const cut = 1 - R.k80_model / R.k80_ma;
  const cards = [
    ['소요 재현율 (답습→모델)', `${pct(R.recall_k10_rep)} → ${pct(R.recall_k10_model)}`, 'tone-ok'],
    ['보수비 WAPE (현행→모델)', `${pct(R.wape_ma)} → ${pct(R.wape_model)}`, 'tone-ok'],
    ['80% 재현 확인 부재 (현행→모델)', `${R.k80_ma} → ${R.k80_model}개 (−${Math.round(cut * 100)}%)`, 'tone-info'],
    ['배타 제약 위반 (현행→모델)', `${pr.exclusive_viol} → ${pm.exclusive_viol}건`, 'tone-ok'],
  ];
  return `<div class="dm-grid">${cards.map(([l, v, t]) => `
    <div class="dm ${t}"><span class="dm-l">${esc(l)}</span><b class="dm-v">${esc(v)}</b></div>`).join('')}</div>`;
}

function rollingTable(R) {
  const ro = R.rolling; const yrs = Object.keys(ro).sort();
  return `<div class="d-tbl-title">연도별 롤링 홀드아웃 (현행 → 모델)</div>
  <div class="tbl-scroll"><table class="dtbl"><thead><tr><th>연도</th><th>학습</th><th>중대 Top-30</th><th>80% 부재</th><th>WAPE</th></tr></thead><tbody>${
    yrs.map((y, i) => `<tr><td>${y}</td><td>${i + 2}년</td><td>${pct(ro[y].top30_ma)} → <b>${pct(ro[y].top30_model)}</b></td><td>${ro[y].k80_ma} → <b>${ro[y].k80_model}</b></td><td>${pct(ro[y].wape_ma)} → <b>${pct(ro[y].wape_model)}</b></td></tr>`).join('')
  }</tbody></table></div>`;
}

function topTable(R, placerItems) {
  const rows = R.top_rows ?? [];
  return `<div class="d-tbl-title">위험도 상위 부재 — 12개월 내 보수소요 확률 (행을 누르면 대응 시설로 이동)</div>
  <div class="tbl-scroll"><table class="dtbl fc-tbl"><thead><tr><th>#</th><th>부재</th><th>발생</th><th>중대</th><th>비용</th><th>현행순위</th><th>조합</th></tr></thead><tbody>${
    rows.map((r, i) => {
      const it = placerItems[i];
      const link = it ? `data-uid="${esc(it.uid)}" title="트윈 시설: ${esc(it.spec?.name ?? '')}"` : '';
      return `<tr class="fc-row" ${link} style="cursor:${it ? 'pointer' : 'default'}">
        <td>${i + 1}</td><td title="${esc(r.ftype)} · ${esc(r.comp)} · 점검등급 ${r.grade.toFixed(1)}"><span style="font-family:var(--mono,monospace);color:var(--accent)">${esc(r.id.replace(/-[^-]+$/, ''))}</span><br><span class="p-sub">${esc(r.comp)}</span></td>
        <td><span class="fc-bar"><i style="width:${Math.round(r.p * 100)}%;background:${riskColor(r.p)}"></i></span>${r.p.toFixed(2)}</td>
        <td>${r.ps.toFixed(2)}</td><td>${r.cost}억</td><td>${r.rank_ma}위</td>
        <td>${r.sel ? '<span class="fc-sel">선정</span>' : '<span class="fc-hold">보류</span>'}</td></tr>`;
    }).join('')
  }</tbody></table></div>`;
}

function reasonBox(R) {
  const ex = R.example; const tf = (R.top_features ?? []).slice(0, 6);
  return `<div class="fc-why">
    <div class="d-tbl-title">선정 근거 — 설명가능</div>
    <p><b>${esc(ex.id)}</b> (${esc(ex.ftype)} · ${esc(ex.comp)}, 준공 ${ex.age}년차) — 점검등급 <b>${ex.grade_last}</b>(양호)이지만
    배수취약 ${ex.drainage_weak} · 경사 ${ex.slope_deg}° · 여름 월강수 ${ex.precip_summer_clim}mm · 등급 상승 ${ex.grade_slope}/년
    → 발생 <b>${ex.p_event}</b> · 중대 <b>${ex.p_severe}</b>, 예상비용 ${ex.cost_if}억. 현행 <b>${ex.rank_ma}위</b> → 모델 <b>${ex.rank_model}위</b>.</p>
    <div class="fc-feat">${tf.map(([n, v]) => `<span class="chip" title="특징 중요도 ${(v * 100).toFixed(1)}%">${esc(n)} <b>${(v * 100).toFixed(0)}</b></span>`).join('')}</div>
  </div>`;
}

function clearMarkers(viewer) {
  for (const e of state.markers) viewer.entities.remove(e);
  state.markers = []; state.shown = false;
}

function showMarkers(viewer, R, placerItems, Cesium) {
  clearMarkers(viewer);
  const rows = R.top_rows ?? [];
  rows.forEach((r, i) => {
    const it = placerItems[i]; if (!it) return;
    const color = Cesium.Color.fromCssColorString(riskColor(r.p));
    const e = viewer.entities.add({
      position: Cesium.Cartesian3.fromDegrees(it.lon, it.lat, (it.groundH ?? 0) + 52),
      point: { pixelSize: 11, color, outlineColor: Cesium.Color.WHITE, outlineWidth: 2, disableDepthTestDistance: Number.POSITIVE_INFINITY },
      label: {
        text: `${r.id}\np=${r.p.toFixed(2)} · ${r.cost}억 · ${r.sel ? '선정' : '보류'}`,
        font: '600 12px "Malgun Gothic", sans-serif', fillColor: Cesium.Color.WHITE, outlineColor: Cesium.Color.BLACK, outlineWidth: 3,
        style: Cesium.LabelStyle.FILL_AND_OUTLINE, verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
        pixelOffset: new Cesium.Cartesian2(0, -14), showBackground: true,
        backgroundColor: new Cesium.Color(0.62, 0.36, 0.02, 0.92), backgroundPadding: new Cesium.Cartesian2(6, 4),
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
      },
    });
    state.markers.push(e);
  });
  state.shown = true;
}

export async function renderForecastTab(root, { viewer, placerItems, flyTo, Cesium, toast }) {
  if (!root) return;
  root.innerHTML = `<div class="sec"><div class="sec-title">예측·처방 — 보수소요 12개월 예측 · 예산 제약 투자조합</div>
    <p class="muted">불러오는 중…</p></div>`;
  let R;
  try { R = await load(); } catch (err) {
    root.innerHTML = `<div class="sec"><div class="sec-title">예측·처방</div><p class="muted">결과 파일을 읽지 못했습니다: ${esc(err.message)}</p></div>`;
    return;
  }
  const items = placerItems();
  root.innerHTML = `
    <div class="sec">
      <div class="sec-title">예측·처방 — 보수소요 12개월 예측 · 예산 제약 투자조합</div>
      <p class="muted" style="margin-top:2px">기준일 2024-12-31 · 학습 2021–2024 · 검증 2025 홀드아웃 · 부재 ${R.n_units}개 · 월별 로그 ${Number(R.n_log_rows).toLocaleString()}행
        <span class="chip" style="margin-left:6px;color:var(--warn)">합성 패널 실험 — 실제 국방 성과 아님</span></p>
      ${kpiGrid(R)}
      ${rollingTable(R)}
    </div>
    <div class="sec">
      <div class="sec-title">투자조합 — 편성 예산 ${Math.round(R.budget)}억 (실소요 ${Math.round(R.actual_total)}억의 45%)</div>
      <div class="dm-grid">
        <div class="dm tone-info"><span class="dm-l">선정 · 보류</span><b class="dm-v">${R.port_model.n}건 · ${R.n_units - R.port_model.n}건</b></div>
        <div class="dm tone-ok"><span class="dm-l">실제 발생·중대 적중</span><b class="dm-v">${R.port_model.events}건 · ${R.port_model.severe}건</b></div>
        <div class="dm tone-ok"><span class="dm-l">필수 누락 · 배타 위반</span><b class="dm-v">${R.port_model.mandatory_missed} · ${R.port_model.exclusive_viol}건</b></div>
        <div class="dm"><span class="dm-l">현행 편성 (등급 순)</span><b class="dm-v">${R.port_rep.feasible_events}건 적중 · 배타 위반 ${R.port_rep.exclusive_viol}건</b></div>
      </div>
      ${topTable(R, items)}
      <div class="btn-row">
        <button class="btn primary full" id="fc-markers">◈ 트윈에 위험도 마커 표시</button>
        <button class="btn" id="fc-clear">지우기</button>
      </div>
      <p class="muted" style="font-size:11px">표의 부재는 현재 배치된 시설에 순서대로 대응시켜 표시한다(합성 ID → 트윈 시설 매핑은 시범에서 실제 facility_id로 교체).</p>
    </div>
    <div class="sec">${reasonBox(R)}</div>
    <div class="sec">
      <div class="sec-title">실자료 적용</div>
      <p class="muted">필수 13개 필드(시설대장 5·점검 4·집행 4)를 비식별 CSV로 넣으면 같은 코드가 같은 형식의 결과 파일을 내고, 이 탭은 그 파일을 그대로 읽는다.
        전체 파이프라인(패널→특징→3개년 홀드아웃→특징 제거→투자조합→그림) 재실행 29초(2026-09-18 측정).</p>
    </div>`;
  root.querySelectorAll('.fc-row[data-uid]').forEach((row) => {
    row.onclick = () => {
      const it = placerItems().find((x) => x.uid === row.dataset.uid);
      if (it) flyTo(viewer, it.lon, it.lat - 0.0035, (it.groundH ?? 0) + 260, 0, -32, 1.2);
    };
  });
  root.querySelector('#fc-markers').onclick = () => {
    const now = placerItems();
    if (!now.length) { toast?.('배치된 시설이 없습니다 — 배치 탭에서 자동배치를 먼저 실행하세요.'); return; }
    showMarkers(viewer, R, now, Cesium);
    const cx = now.reduce((a, x) => a + x.lon, 0) / now.length, cy = now.reduce((a, x) => a + x.lat, 0) / now.length;
    const gh = Math.max(...now.map((x) => x.groundH ?? 0));
    flyTo(viewer, cx, cy - 0.0032, gh + 420, 0, -58, 1.6);
    toast?.(`위험도 마커 ${state.markers.length}개 표시`);
  };
  root.querySelector('#fc-clear').onclick = () => clearMarkers(viewer);
}
