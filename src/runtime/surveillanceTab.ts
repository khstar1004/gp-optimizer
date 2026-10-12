// @ts-nocheck
/**
 * 감시 탭 — 「직접 세우고 · 어디까지 보이는지 · 날씨가 얼마나 깎는지」
 *
 * 세 가지 질문을 한 화면에서 순서대로 답한다:
 *
 *   ① 어디에 세울 것인가   팔레트에서 끌어다 지도에 놓는다. 마스트고·지향·시야를
 *                          그 자리에서 돌린다. 능선 하나 넘기면 관측고가 통째로 바뀐다.
 *   ② 어디까지 보이는가     지형 LOS × 실효 유효거리로 합동 탐지확률 격자를 굽고
 *                          지도에 드레이프한다. 사각 방위와 축선별 노출률이 함께 나온다.
 *   ③ 날씨가 얼마나 깎는가  같은 배치를 6종 날씨 × 강도 3단으로 돌린 스윕 표.
 *                          LOS 는 다시 계산하지 않으므로 즉답이다.
 *
 * 계산은 전부 다른 모듈 것이다 — 여기는 그 결과를 사람이 읽는 순서로 늘어놓는 곳.
 */
import { SITE } from './data';
import { distM, azimuthDeg } from './geo';
import { POST_TYPES, POST_TYPE } from './sensorPosts';
import { FINAL_GAP_WARN_M, describeGap, routeCoverage } from './watchEngine';
import { toMGRS } from './mgrs';
import { svgIcon } from './icons';
import { watchAssetsOf, watchOpts } from './watchRoom';
import { CoverageEngine, routeExposure } from './postCoverage';
import { allRouteData } from './infiltration';
import { STATE_COLOR, STATE_LABEL, enduranceMin, fleetSummary } from './droneModel';
import { PAYLOAD_SPEC } from './droneFleet';
import { STATUS_COLOR, STATUS_LABEL, fmtFuelHours, shortfallW } from './powerGrid';
import {
  atmosphereOf, fmtM, fmtLux, VERDICT_COLOR, VERDICT_TEXT,
} from './sensorPerformance';
import { WEATHER_LABELS } from './environmentModel';
import { optimizePostLayout } from './postOptimizer';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const pct = (v) => `${Math.round((v ?? 0) * 100)}%`;

// environmentModel.ts clear 프리셋 상한(30km)과 동일 — 가시거리 히어로의 「맑음 기준」 눈금.
const CLEAR_SKY_VIS_M = 30000;

/** 날씨 스윕 셀 색 — 커버리지 히트맵 */
function heat(v) {
  if (v >= 0.7) return '#3dd68c';
  if (v >= 0.5) return '#8fd66a';
  if (v >= 0.32) return '#e3b341';
  if (v >= 0.15) return '#f2793c';
  return '#ed5d5d';
}

export function createSurveillanceTab(ctx) {
  // ctx: { state, toast, setLoading, ensureGrid, enterFpv, switchTab,
  //        drawPostCoverage, clearOverlay, renderEnv }
  const { state } = ctx;
  let sweepRows = null;
  let lastAnalysis = null;
  // 자동 배치: 제안 → (적용) → 되돌리기. 적용 전에는 지도에 손대지 않는다.
  let autoPlan = null;        // { picks, report }
  let autoUndo = null;        // 적용 직전 배치 스냅샷(직렬화 형식)
  const autoCfg = { count: 4, budget: 40, types: new Set(['eo', 'ir', 'radar', 'hmg']), keep: true };

  // ═══ 렌더 ═══
  function render() {
    const page = $('#page-watch');
    if (!page) return;
    page.innerHTML = `
      <div class="sec"><div class="sec-title">지금 대기 상태</div>
        <div id="watch-atm" class="card"></div>
        <div class="btn-row" style="margin-top:6px" id="watch-presets"></div>
        <p class="muted" style="margin-top:4px">카탈로그 사거리는 <b>청천 제원</b>이다. 아래 목록의
        「실효」는 지금 이 대기에서 실제로 보는 거리 — Koschmieder 대비감쇠(가시), LWIR 소광비(열상),
        ITU-R P.838 강수 감쇠(레이더)를 각각 통과시킨 값이다.</p></div>

      <div class="sec"><div class="sec-title">감시자산 배치</div>
        <p class="muted" style="margin-bottom:6px">카드를 지도로 끌어다 놓으면 그 자리에 선다.
        「＋ 클릭 배치」를 켜면 지도를 눌러서도 세울 수 있다. 지도의 초소를 끌면 이동한다.</p>
        <div id="watch-palette" class="wp-grid"></div>
        <div class="btn-row" style="margin-top:6px">
          <button class="btn${state.postPickType ? ' active' : ''}" id="watch-pick">＋ 클릭 배치</button>
          <button class="btn" id="watch-seed">기본 4종 세우기</button>
          <button class="btn" id="watch-clear">전부 철거</button>
        </div></div>

      <div class="sec"><div class="sec-title">전원 · 인원</div>
        <p class="muted" style="margin-bottom:6px">「몇 개를 살 수 있나」 옆에는 「몇 개를
        <b>켤 수 있나</b>」가 있다 — GP 에서 자산 수를 실제로 정하는 것은 돈보다 발전기인
        경우가 많다. 용량이 모자라면 <b>우선순위가 낮은 것부터 꺼지고</b>, 꺼진 자산은
        부채꼴도 탐지도 사라진다. 한랭 보정(열선·히터)은 기온을 따라 붙는다.</p>
        <div id="watch-power"></div></div>

      <div class="sec"><div class="sec-title">배치 목록 · 실효 성능</div>
        <div id="watch-list"></div>
        <div class="kv" style="margin-top:6px"><span>자산 취득비 (합성 단가)</span>
          <b id="watch-cost">—</b></div></div>

      <div class="sec"><div class="sec-title">어디까지 보이는가 — 합동 커버리지</div>
        <div class="btn-row">
          <button class="btn primary" id="watch-analyze" style="flex:2">◈ 가시성 분석 실행 ▶</button>
          <button class="btn" id="watch-clear-drape" style="flex:1">드레이프 지우기</button>
        </div>
        <div id="watch-coverage"></div></div>

      <div class="sec"><div class="sec-title">드론 편대</div>
        <p class="muted" style="margin-bottom:6px">드론이 감시자산으로서 값어치가 있는 이유는 그
        <b>유한함</b>이다 — 40분 뜨고 25분 충전한다. 그래서 「지금 몇 대가 떠 있고 몇 분 남았고
        다음 기체는 언제 뜨는가」가 계획의 일부가 된다. 떠 있는 기체는 초소와 <b>같은 규칙</b>으로
        판정되어 탐지 로그와 축선 공백 분석에 함께 들어간다.</p>
        <div id="watch-fleet"></div>
        <button class="btn full primary" id="watch-fleet-manage">${svgIcon('drone')} 편대 관리 열기 ▶</button></div>

      <div class="sec"><div class="sec-title">언제 잡히고 어디가 비나 — 축선 시간축</div>
        <p class="muted" style="margin-bottom:6px">합동 커버리지는 <b>어디가 보이는가</b>를 묻는다.
        그런데 침투 부대는 한 점에 머물지 않는다 — <b>그 부대가 지나가는 동안 몇 %의 구간에서
        잡혀 있었고, 어디서 끊겼는가</b>가 이 배치의 성적표다. 특히 <b>GP 코앞에서 놓치는
        마지막 공백</b>이 가장 비싸다.</p>
        <button class="btn full primary" id="watch-timeline">◈ 축선별 감시 공백 분석 ▶</button>
        <div id="watch-timeline-out"></div></div>

      <div class="sec"><div class="sec-title">어디에 세워야 하나 — 자동 배치</div>
        <p class="muted" style="margin-bottom:6px">사각 방위를 알려주고 끝내지 않는다. GP 둘레
        <b>후보 108곳 × 유형 × 지향 8방위</b>를 지형 가시선으로 훑어 <b>한계기여 / 취득비</b>가 가장 큰
        자리부터 차례로 고른다. 지금 날씨의 실효거리로 계산하므로 <b>눈 오는 날의 답과 맑은 날의 답이 다르다.</b></p>
        <div class="auto-cfg">
          <div class="slider-row"><label>세울 개수</label>
            <input type="range" id="auto-count" min="1" max="8" step="1" value="${autoCfg.count}">
            <span class="val" id="auto-count-val">${autoCfg.count}개</span></div>
          <div class="slider-row"><label>취득비 상한</label>
            <input type="range" id="auto-budget" min="5" max="120" step="5" value="${autoCfg.budget}">
            <span class="val" id="auto-budget-val">${autoCfg.budget}억</span></div>
          <div class="toggle-row"><span>기존 배치 유지 (끄면 백지에서 설계)</span>
            <input type="checkbox" id="auto-keep" ${autoCfg.keep ? 'checked' : ''}></div>
          <div class="auto-types" id="auto-types"></div>
        </div>
        <div class="btn-row" style="margin-top:6px">
          <button class="btn primary" id="auto-run" style="flex:2">◈ 자동 배치안 산출 ▶</button>
          <button class="btn" id="auto-undo" style="flex:1" ${autoUndo ? '' : 'disabled'}>되돌리기</button>
        </div>
        <div id="auto-out"></div></div>

      <div class="sec"><div class="sec-title">눈이 오면 얼마나 안 보이나 — 날씨 스윕</div>
        <p class="muted" style="margin-bottom:6px">같은 배치를 6종 날씨 × 강도 3단으로 돌린다.
        지형 가시선은 날씨와 무관하므로 다시 계산하지 않는다 — 표는 즉시 나온다.</p>
        <div class="btn-row">
          <button class="btn" id="watch-sweep" style="flex:2">◈ 날씨 스윕 계산</button>
          <button class="btn" id="watch-snow" style="flex:1">❄ 폭설 적용</button>
        </div>
        <div id="watch-sweep-out"></div></div>

      <div class="sec"><div class="sec-title">관제 화면 (CCTV 벽)</div>
        <p class="muted" style="margin-bottom:6px"><b>배치한 자산의 화면을 한 번에 — 최대 6채널.</b>
        같은 순간 EO 는 눈 속에서 하얗게 지워지는데 TOD 에는 아직 사람이 남고 레이더 PPI 에는
        블립이 찍힌다 — 그 대비는 나란히 놓았을 때만 보인다.
        창마다 배율단 · 극성(백열/흑열) · 스캔 · ⤢ 확대.
        <br><br>조명탄 발사대를 배치했다면 조명은 <b>사건</b>이다 — 1인칭에서 <b>I</b> 를 누르면 표적 위로
        32초 동안 조명이 뜨고 그 사이에만 EO·육안 부채꼴이 커진다. 실효거리와 지도 부채꼴이
        그 32초 동안 늘었다가 되돌아온다.</p>
        <button class="btn full primary" id="watch-wall">${svgIcon('desktop')} 관제벽 열기 — 배치 자산 전 채널 ▶</button>
        <div class="btn-row">
          <button class="btn" id="watch-feed-tile">⌗ 벽 정렬</button>
          <button class="btn" id="watch-feed-close">전 창 닫기</button>
        </div></div>`;

    renderPalette();
    renderAtm();
    renderPower();
    renderFleet();
    renderList();
    renderPresets();
    renderAutoTypes();
    if (autoPlan) renderAutoPlan(autoPlan);
    if (lastAnalysis) renderCoverage(lastAnalysis);
    if (sweepRows) renderSweep(sweepRows);
    wire();
  }

  function wire() {
    $('#watch-pick').onclick = () => {
      const next = state.postPickType ? null : (state.dragPostType ?? 'eo');
      ctx.setPostPickType(next);
      ctx.toast(next
        ? `클릭 배치 켜짐 — ${POST_TYPE[next].name}. 지도를 누르면 세웁니다 (ESC 해제)`
        : '클릭 배치 해제', 4000);
    };
    $('#watch-seed').onclick = async () => {
      ctx.setLoading(true, '기본 감시자산 거치 지형 샘플…');
      await state.posts.seedDefaults();
      ctx.setLoading(false);
      refresh();
      ctx.toast('EO · IR · 레이더 · K6 기본 배치', 3200);
    };
    $('#watch-clear').onclick = () => {
      state.posts.clear();
      lastAnalysis = null; sweepRows = null;
      ctx.clearOverlay();
      refresh();
    };
    $('#watch-analyze').onclick = runAnalysis;
    $('#watch-clear-drape').onclick = () => { ctx.clearOverlay(); };
    $('#watch-sweep').onclick = runSweep;
    $('#watch-snow').onclick = () => {
      state.env.set({ weather: 'snow', intensity: 1, windMps: 7, dayOfYear: 20 });
      ctx.renderEnv?.();
      state.posts.redraw();
      refresh();
      ctx.toast('폭설 적용 — 목록의 실효거리와 지도 부채꼴이 줄어듭니다', 4200);
    };
    $('#watch-fleet-manage').onclick = () => state.manage?.openFleet();
    $('#watch-timeline').onclick = () => {
      runTimeline().catch((e) => {
        console.warn(e);
        const out = $('#watch-timeline-out');
        if (out) out.innerHTML = `<p class="muted" style="color:#ed5d5d">분석 실패 — ${e?.message ?? '지형 가시선 격자를 굽지 못했습니다'}</p>`;
        ctx.toast('시간축 분석 실패 — 콘솔을 확인하세요', 4200);
      });
    };
    $('#watch-wall').onclick = () => state.sensorFeed.openWall();
    $('#watch-feed-tile').onclick = () => state.sensorFeed.tile();
    $('#watch-feed-close').onclick = () => state.sensorFeed.close();

    // ── 자동 배치 ──
    const cnt = $('#auto-count');
    cnt.oninput = () => { autoCfg.count = +cnt.value; $('#auto-count-val').textContent = `${autoCfg.count}개`; };
    const bud = $('#auto-budget');
    bud.oninput = () => { autoCfg.budget = +bud.value; $('#auto-budget-val').textContent = `${autoCfg.budget}억`; };
    $('#auto-keep').onchange = (e) => { autoCfg.keep = e.target.checked; };
    $('#auto-run').onclick = runAutoLayout;
    $('#auto-undo').onclick = undoAutoLayout;
  }

  // ═══ 축선 시간축 감시 공백 ═══
  /**
   * 침투 축선 전 구간을 50m 씩 걸으며 「그때 누가 보고 있었나」를 남긴다.
   *
   * 렌더링 없이 순수 계산이라 즉시 끝난다 — 리허설을 재생해 눈으로 좇는 것과 달리
   * 전 구간을 한 번에 볼 수 있고, 그래서 **공백의 위치**가 숫자로 나온다.
   */
  async function runTimeline() {
    const routes = allRouteData();
    const out = $('#watch-timeline-out');
    if (!routes.length) {
      out.innerHTML = '<p class="muted">침투 축선이 없습니다 — 침투 탭에서 축선을 확인하세요.</p>';
      return;
    }
    const assets = watchAssetsOf(state);
    if (!assets.length) {
      out.innerHTML = '<p class="muted">배치된 감시자산이 없습니다.</p>';
      return;
    }
    // 지형 가시선 없이 돌리면 능선 뒤도 보인다고 나온다 — 공백이 0 인 분석은
    // 분석이 아니라 위안이다. 격자를 먼저 굽는다(한 번 구우면 재사용).
    await ctx.ensureGrid();
    const opts = watchOpts(state);
    const gp = SITE.gp;
    const results = routes.map((rd) => routeCoverage(
      { id: rd.route.id, name: rd.route.name.split(' — ')[0], pts: rd.pts, totalM: rd.totalM },
      assets, gp, opts,
    ));
    state.routeCover = results;
    renderTimeline(results);
    const worst = results.reduce((a, b) => (a && a.coveredRatio <= b.coveredRatio ? a : b), null);
    ctx.toast(`시간축 분석 — 최약 축선 「${worst.routeName}」 관측 ${pct(worst.coveredRatio)}`
      + (worst.finalGapM > 0 ? ` · GP 직전 ${Math.round(worst.finalGapM)}m 공백` : ''), 5200);
  }

  function renderTimeline(results) {
    const out = $('#watch-timeline-out');
    out.innerHTML = results.map((r, i) => {
      const first = r.firstDetect;
      // 표본 한 칸짜리 공백까지 경고하면 2.8km 가 빈 축선의 경고가 같은 무게로 묻힌다
      const bad = r.finalGapM >= FINAL_GAP_WARN_M;
      const g = r.longestGap;
      return `<div class="tl">
        <div class="tl-head">
          <b>${r.routeName}</b>
          <span class="muted">${(r.totalM / 1000).toFixed(1)}km</span>
          <span class="tl-v" style="color:${r.coveredRatio >= 0.7 ? '#3dd68c'
        : r.coveredRatio >= 0.4 ? '#e3b341' : '#ed5d5d'}">관측 ${pct(r.coveredRatio)}</span>
        </div>
        <canvas class="tl-bar" data-tl="${i}" height="26"></canvas>
        <div class="tl-note">
          ${first
        ? `최초 탐지 <b>${first.assetShort}</b> · GP ${Math.round(first.distToGpM)}m 지점 (${first.grade})`
        : '<b style="color:#ed5d5d">전 구간 미탐지</b>'}
          ${g ? ` · 최장 공백 ${describeGap(g)}` : ''}
        </div>
        ${bad ? `<div class="tl-note" style="color:#ed5d5d">⚠ GP 직전 ${Math.round(r.finalGapM)}m 를
          아무도 보지 못한다 — 마지막 접근 구간이 비어 있다</div>` : ''}
        ${g && Number.isFinite(g.midLon) ? `<div class="tl-act">
          <span class="muted">공백 중심 ${toMGRS(g.midLon, g.midLat)}</span>
          <button class="btn" data-gapfly="${i}">⌖ 그 지점 보기</button>
        </div>` : ''}
      </div>`;
    }).join('');
    // 캔버스는 DOM 이 붙은 뒤에 그린다 (clientWidth 가 필요하다)
    requestAnimationFrame(() => {
      $$('#watch-timeline-out [data-tl]').forEach((cv) => drawTimelineBar(cv, results[+cv.dataset.tl]));
    });
    // 「어디가 비었나」는 좌표로 답해야 고칠 수 있다 — 눌러서 그 자리로 간다
    $$('#watch-timeline-out [data-gapfly]').forEach((b) => {
      b.onclick = () => {
        const g = results[+b.dataset.gapfly]?.longestGap;
        if (!g || !Number.isFinite(g.midLon)) return;
        state.viewer.camera.flyTo({
          destination: Cesium.Cartesian3.fromDegrees(g.midLon, g.midLat - 0.006, 1900),
          orientation: { heading: 0, pitch: Cesium.Math.toRadians(-45) },
          duration: 1.6,
        });
        ctx.toast(`감시 공백 중심 — ${toMGRS(g.midLon, g.midLat)} · ${describeGap(g)}`, 5200);
      };
    });
  }

  /** 축선을 왼쪽(출발)→오른쪽(GP)으로 눕히고 매 구간의 최고 등급으로 칠한다. */
  function drawTimelineBar(cv, r) {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = cv.clientWidth || 280;
    cv.width = Math.round(w * dpr);
    cv.height = Math.round(26 * dpr);
    const g = cv.getContext('2d');
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, w, 26);
    g.fillStyle = 'rgba(255,255,255,0.06)';
    g.fillRect(0, 6, w, 14);
    const COLOR = { 식별: '#3dd68c', 인지: '#e3b341', 탐지: '#ed5d5d' };
    for (let k = 0; k < r.steps.length; k += 1) {
      const s = r.steps[k];
      const nextCum = k + 1 < r.steps.length ? r.steps[k + 1].cumM : r.totalM;
      const x0 = (s.cumM / r.totalM) * w;
      const x1 = (nextCum / r.totalM) * w;
      if (s.rank === 0) continue;
      g.fillStyle = COLOR[s.grade] ?? '#ed5d5d';
      g.fillRect(x0, 6, Math.max(1, x1 - x0), 14);
    }
    // 최초 탐지 표식
    if (r.firstDetect) {
      const x = (r.firstDetect.cumM / r.totalM) * w;
      g.strokeStyle = '#e8f0f6'; g.lineWidth = 1.4;
      g.beginPath(); g.moveTo(x, 2); g.lineTo(x, 24); g.stroke();
    }
    g.font = '600 8.5px "Chakra Petch", monospace';
    g.fillStyle = 'rgba(232,240,246,0.5)';
    g.fillText('출발', 1, 5);
    g.textAlign = 'right';
    g.fillText('GP', w - 1, 5);
    g.textAlign = 'left';
  }

  // ═══ 자동 배치 ═══
  function renderAutoTypes() {
    const el = $('#auto-types');
    if (!el) return;
    // 자동 배치는 **탐지 커버를 넓히는** 도구다 — 발전기는 그 최적화의 대상이 아니라
    // 결과에 따라오는 것이므로 후보에서 뺀다(대신 전원 수지가 부족분을 알려 준다).
    el.innerHTML = POST_TYPES.filter((t) => !t.genW).map((t) => `
      <label class="at-chip${autoCfg.types.has(t.id) ? ' on' : ''}" data-at="${t.id}">
        <input type="checkbox" ${autoCfg.types.has(t.id) ? 'checked' : ''}>
        <span style="color:${t.color}">${t.icon}</span>${t.short}
        <em>${t.costEok}억</em></label>`).join('');
    el.querySelectorAll('[data-at]').forEach((lab) => {
      lab.querySelector('input').onchange = (e) => {
        if (e.target.checked) autoCfg.types.add(lab.dataset.at);
        else autoCfg.types.delete(lab.dataset.at);
        lab.classList.toggle('on', e.target.checked);
      };
    });
  }

  async function runAutoLayout() {
    if (!autoCfg.types.size) return ctx.toast('자산 유형을 하나 이상 고르세요');
    await ctx.ensureGrid();
    ctx.setLoading(true, '자동 배치 탐색 준비…');
    try {
      const existing = autoCfg.keep ? state.posts.snapshot() : [];
      const result = await optimizePostLayout({
        grid: state.grid,
        envState: state.env?.state ?? null,
        typeIds: [...autoCfg.types],
        maxPosts: autoCfg.count,
        budgetEok: autoCfg.budget,
        existing,
        sampleHeights: (cartos) => state.posts.ctx.sampleHeights(cartos),
        onProgress: (f, msg) => {
          const el = document.querySelector('#loading-text');
          if (el) el.textContent = `${msg} (${Math.round(f * 100)}%)`;
        },
      });
      autoPlan = result;
      renderAutoPlan(result);
      ctx.toast(result.picks.length
        ? `자동 배치안 ${result.picks.length}개 — 합동 커버 ${pct(result.report.jointBefore)} → ${pct(result.report.jointAfter)}`
        : '더 세울 자리가 없습니다 (예산·개수·유형을 넓혀 보세요)', 5200);
    } catch (error) {
      console.warn('[auto] 자동 배치 실패', error);
      $('#auto-out').innerHTML = `<p class="muted">산출 실패: ${error.message}</p>`;
      ctx.toast(`자동 배치 실패: ${error.message}`, 4600);
    } finally { ctx.setLoading(false); }
  }

  function renderAutoPlan(plan) {
    const el = $('#auto-out');
    if (!el) return;
    const { picks, report } = plan;
    if (!picks.length) {
      el.innerHTML = '<p class="muted" style="margin-top:6px">조건 안에서 커버를 늘리는 자리를 찾지 못했습니다.</p>';
      return;
    }
    const gapTxt = (gs) => (gs.length
      ? gs.map((g) => (Math.round(g.from) === Math.round(g.to)
        ? `${Math.round(g.from)}°` : `${Math.round(g.from)}~${Math.round(g.to)}°`)).join(', ')
      : '없음');
    const rows = picks.map((p, i) => `
      <div class="ap-row">
        <span class="ap-n">${i + 1}</span>
        <span class="ap-ic" style="color:${p.color}">${p.icon}</span>
        <span class="ap-body"><b>${p.short}</b> GP ${p.az}° / ${p.dist}m · 지향 ${Math.round(p.aimAz)}°
          <em>지반 ${Math.round(p.groundH)}m · 실효 ${fmtM(p.effRange ?? 0)}</em></span>
        <span class="ap-gain">+${pct(p.marginal)}<em>${p.costEok}억</em></span>
      </div>`).join('');
    el.innerHTML = `
      <div class="card" style="margin-top:8px">
        <div class="kv"><span><b>합동 탐지확률</b> (${report.weatherLabel} 기준)</span>
          <b><span style="color:var(--muted)">${pct(report.jointBefore)}</span>
            → <span style="color:var(--accent);font-size:15px">${pct(report.jointAfter)}</span></b></div>
        <div class="kv"><span>취득비 (상한 ${report.budgetEok ?? '—'}억)</span><b>${report.costEok.toFixed(1)}억</b></div>
        <div class="kv"><span>조기경보선 사각</span>
          <b><span style="color:${report.gapsBefore.length ? '#ed5d5d' : '#3dd68c'}">${gapTxt(report.gapsBefore)}</span>
            → <span style="color:${report.gapsAfter.length ? '#e3b341' : '#3dd68c'}">${gapTxt(report.gapsAfter)}</span></b></div>
        <div class="sec-sub" style="margin-top:8px">선정 순서 — 한계기여 / 취득비 최대순</div>
        ${rows}
        <div class="btn-row" style="margin-top:8px">
          <button class="btn primary" id="auto-apply" style="flex:2">이 안으로 배치 ▶</button>
          <button class="btn" id="auto-discard" style="flex:1">버리기</button>
        </div>
        <p class="muted" style="margin-top:5px">${report.approximation}
        후보 ${report.candidateCount}곳 · 조합 ${report.combinationCount.toLocaleString()} · 탐색격자 ${report.searchSize}²(${report.cells}셀).
        적용 후 「가시성 분석」을 다시 돌리면 본 해상도로 검증됩니다.</p>
      </div>`;
    $('#auto-apply').onclick = () => applyAutoPlan(plan);
    $('#auto-discard').onclick = () => { autoPlan = null; $('#auto-out').innerHTML = ''; };
  }

  async function applyAutoPlan(plan) {
    autoUndo = state.posts.serialize();          // 적용 직전 배치 — 되돌리기 한 칸
    ctx.setLoading(true, '자동 배치 적용…');
    try {
      if (!autoCfg.keep) state.posts.clear();
      for (const p of plan.picks) {
        await state.posts.add(p.typeId, p.lon, p.lat, { aimAz: p.aimAz, mastH: p.mastH });
      }
    } finally { ctx.setLoading(false); }
    autoPlan = null;
    lastAnalysis = null; sweepRows = null;
    state.covEngine = null;                      // 배치가 바뀌었으니 LOS 캐시는 버린다
    render();
    ctx.toast(`자동 배치 적용 — ${plan.picks.length}개소 · ${plan.report.costEok.toFixed(1)}억. `
      + '「가시성 분석 실행」으로 본 해상도 검증을 권합니다.', 6000);
  }

  async function undoAutoLayout() {
    if (!autoUndo) return ctx.toast('되돌릴 자동 배치가 없습니다');
    const rows = autoUndo;
    autoUndo = null;
    ctx.setLoading(true, '이전 배치 복원…');
    try {
      state.posts.clear();
      await state.posts.restore(rows);
    } finally { ctx.setLoading(false); }
    lastAnalysis = null; sweepRows = null;
    state.covEngine = null;
    render();
    ctx.toast(`이전 배치로 되돌렸습니다 — ${rows.length}개소`, 4200);
  }

  // ═══ 대기 상태 카드 ═══
  function renderAtm() {
    const el = $('#watch-atm');
    if (!el) return;
    const env = state.env?.state;
    if (!env) { el.textContent = '환경 준비 중…'; return; }
    const a = atmosphereOf(env);
    const row = (k, v, color) =>
      `<div class="kv"><span>${k}</span><b${color ? ` style="color:${color}"` : ''}>${v}</b></div>`;
    // 가시거리는 이 카드 전체를 좌우하는 단일 숫자다 — kv 한 줄에 묻히면
    // 「비 오니 26→4.8km」 같은 핵심 낙차가 안 읽힌다. 별도 히어로로 뺀다.
    const visRatio = Math.min(1, Math.max(0, a.visibilityMeters / CLEAR_SKY_VIS_M));
    const visColor = heat(visRatio);
    const heroHtml = `
      <div class="atm-hero" style="border-left-color:${visColor}">
        <div class="ah-label">지금 가시거리 <span class="muted">(맑음 ${fmtM(CLEAR_SKY_VIS_M)} 기준)</span></div>
        <div class="ah-row">
          <span class="ah-val" style="color:${visColor}">${fmtM(a.visibilityMeters)}</span>
          <span class="ah-sub">청천 대비 <b style="color:${visColor}">${pct(visRatio)}</b></span>
        </div>
        <div class="ah-bar"><i style="width:${Math.round(visRatio * 100)}%;background:${visColor}"></i></div>
      </div>`;
    el.innerHTML = heroHtml
      + row('날씨 · 강도', `${a.weatherLabel} · ${Math.round(a.intensity * 100)}%`)
      + row('조도 · 기온', `${fmtLux(a.lux)} · ${a.temperatureC.toFixed(1)}°C`)
      + row('적설 · 노면습윤', `${pct(a.snowCover)} · ${pct(a.wetness)}`)
      + `<div class="wp-band">
          <div><span>가시 β</span><b>${(a.betaVis * 1000).toFixed(2)}/km</b></div>
          <div><span>LWIR β</span><b>${(a.betaLwir * 1000).toFixed(2)}/km</b>
            <em>가시의 ${pct(a.lwirRatio)}</em></div>
          <div><span>X대역 γ</span><b>${a.gammaDbPerKm.toFixed(3)} dB/km</b>
            <em>클러터 +${a.clutterDb.toFixed(1)}dB</em></div>
        </div>`
      + row('표적 고유대비 C₀ · 열대비 ΔT', `${a.c0.toFixed(2)} · ${a.deltaT.toFixed(1)}K`);
  }

  function renderPresets() {
    const el = $('#watch-presets');
    if (!el) return;
    const quick = [
      { id: 'clear', label: `${svgIcon('weather-clear')} 맑음`, patch: { weather: 'clear', intensity: 0.2, minuteOfDay: 600 } },
      { id: 'fog', label: `${svgIcon('weather-fog')} 짙은안개`, patch: { weather: 'fog', intensity: 0.9, minuteOfDay: 420 } },
      { id: 'snow', label: `${svgIcon('weather-snow')} 강설`, patch: { weather: 'snow', intensity: 0.8, dayOfYear: 20, windMps: 6 } },
      { id: 'rain', label: `${svgIcon('weather-rain')} 호우`, patch: { weather: 'rain', intensity: 0.9, windMps: 8 } },
      { id: 'night', label: `${svgIcon('weather-night')} 야간`, patch: { weather: 'clear', intensity: 0.2, minuteOfDay: 60 } },
    ];
    el.innerHTML = quick.map((q) =>
      `<button class="btn" data-wq="${q.id}" style="flex:1 1 30%">${q.label}</button>`).join('');
    el.querySelectorAll('[data-wq]').forEach((b) => {
      b.onclick = () => {
        state.env.set(quick.find((q) => q.id === b.dataset.wq).patch);
        ctx.renderEnv?.();
        state.posts.redraw();
        refresh();
      };
    });
  }

  // ═══ 팔레트 ═══
  /**
   * 자산 팔레트. 16종이 한 줄로 흘러가면 고를 수 없으므로 **역할 묶음**으로 나눈다.
   * 카드에 적는 거리는 언제나 「지금 이 날씨의 실효 / 청천」이고, 전원이나
   * 발전 용량처럼 거리로 답할 수 없는 자산은 그 자리에 자기 제원을 적는다.
   */
  function renderPaletteCard(t, atm) {
    const n = state.posts.countOf(t.id);
    const armed = state.postPickType === t.id;
    // 발전기는 거리로 답할 수 없다 — 그 자리에 발전 용량을 적는다
    const body = t.genW
      ? `<div class="wp-r"><b style="color:${t.color}">${t.genW}W</b><s>${t.fuelL}L</s></div>`
      : (() => {
        const perf = atm
          ? state.posts.perfOf({ type: t.id, uid: `__cat_${t.id}` }, atm)
          : { range: t.dri[0], specRange: t.dri[0], factor: 1, verdict: 'GO' };
        return `<div class="wp-r">
          <b style="color:${VERDICT_COLOR[perf.verdict]}">${fmtM(perf.range)}</b>
          <s>${fmtM(perf.specRange)}</s></div>`;
      })();
    const power = t.genW ? '' : t.powerW ? `${t.powerW}W` : '무전원';
    // 전체 이름·설명은 툴팁으로 — 카드에서 늘 읽는 것은 「무엇·얼마나·얼마」다
    return `<div class="wp-card${armed ? ' on' : ''}" draggable="true" data-ptype="${t.id}"
      title="${t.name} — ${t.blurb}">
      <div class="wp-top"><span style="color:${t.color}">${t.icon}</span>
        <span class="wp-name">${t.short}</span>
        ${n ? `<span class="wp-n">×${n}</span>` : ''}</div>
      ${body}
      <div class="wp-meta">${t.costEok}억${power ? ` · ${power}` : ''}${t.crew ? ` · ${t.crew}명` : ''}</div>
    </div>`;
  }

  function renderPalette() {
    const el = $('#watch-palette');
    if (!el) return;
    const atm = state.env?.state ? atmosphereOf(state.env.state) : null;
    // 손이 가는 순서로 고정한다 — 카탈로그 선언 순서는 사람이 고르는 순서가 아니다.
    // 멀리 보는 것 → 가까이 막는 것 → 그것들을 돌아가게 하는 것.
    const ORDER = ['광학', '센서', '근접', '화기', '지원', 'C-UAS', '기반'];
    const seen = [...new Set(POST_TYPES.map((t) => t.group))];
    const groups = [...ORDER.filter((g) => seen.includes(g)), ...seen.filter((g) => !ORDER.includes(g))];
    el.innerHTML = groups.map((g) => `
      <div class="wp-group">${g}</div>
      ${POST_TYPES.filter((t) => t.group === g).map((t) => renderPaletteCard(t, atm)).join('')}`).join('');
    $$('#watch-palette .wp-card').forEach((c) => {
      c.addEventListener('dragstart', (e) => {
        state.dragPostType = c.dataset.ptype;
        e.dataTransfer.setData('text/plain', `post:${c.dataset.ptype}`);
        e.dataTransfer.effectAllowed = 'copy';
      });
      c.addEventListener('dragend', () => { state.posts.hideDropGhost(); });
      c.addEventListener('click', () => {
        state.dragPostType = c.dataset.ptype;
        ctx.setPostPickType(c.dataset.ptype);
        ctx.toast(`${POST_TYPE[c.dataset.ptype].name} — 지도를 클릭해 배치하세요 (ESC 해제)`, 4000);
      });
    });
  }

  // ═══ 전원 · 인원 ═══
  /**
   * 전원 수지. 「부족합니다」로 끝내지 않고 **얼마나 모자라고 무엇이 꺼졌는지**를
   * 적는다 — 그래야 발전기를 한 대 더 놓을지, 자산을 하나 뺄지 정할 수 있다.
   */
  function renderPower() {
    const el = $('#watch-power');
    if (!el) return;
    const bal = state.power;
    if (!bal) { el.innerHTML = '<p class="muted">전원 수지 계산 전</p>'; return; }
    const posts = state.posts.list();
    const crew = posts.reduce((s2, p) => s2 + (POST_TYPE[p.type]?.crew ?? 0), 0);
    const gens = posts.filter((p) => POST_TYPE[p.type]?.genW);
    const short = shortfallW(bal);
    const col = STATUS_COLOR[bal.status];

    el.innerHTML = `
      <div class="pw-head">
        <b style="color:${col}">${STATUS_LABEL[bal.status]}</b>
        <span class="pw-num">${bal.servedW}W <s>/ ${bal.demandW}W 요구</s></span>
        <span class="muted">발전 ${bal.supplyW}W</span>
      </div>
      <div class="wl-bar"><i style="width:${Math.round(Math.min(1, bal.ratio) * 100)}%;background:${col}"></i></div>
      <div class="pw-note">${bal.note}</div>
      <div class="pw-kv">
        <span>카탈로그 합</span><b>${bal.nominalW}W</b>
        <span>한랭 보정 후</span><b>${bal.demandW}W (${state.env?.state?.temperatureC?.toFixed(0) ?? '—'}℃)</b>
        <span>발전기</span><b>${gens.length}대 · ${bal.supplyW}W</b>
        <span>연료 잔량</span><b>${fmtFuelHours(bal.fuelHours)}</b>
        <span>운용 인원</span><b>${crew}명</b>
      </div>
      ${bal.offline.length ? `<div class="pw-off">
        <div class="pw-off-t">전원 차단 ${bal.offline.length}개 — 이 자산들은 지금 아무것도 보지 않습니다</div>
        ${bal.offline.map((o) => `<div class="pw-off-r" data-pwoff="${o.uid}">
          <b>${o.name}</b><span class="muted">${o.short} · ${o.powerW}W</span></div>`).join('')}
        <div class="pw-off-t" style="color:${col}">발전 ${short}W 를 더 확보하면 전부 되살아납니다
          (발전기 ${Math.ceil(short / 5000)}대)</div>
      </div>` : ''}`;

    $$('#watch-power [data-pwoff]').forEach((r) => {
      r.onclick = () => state.manage?.openPost(r.dataset.pwoff);
    });
  }

  // ═══ 드론 편대 ═══
  /** 편대 한눈 요약 — 자세한 조작은 관리 팝업이 맡는다. */
  function renderFleet() {
    const el = $('#watch-fleet');
    if (!el) return;
    const fleet = state.fleet;
    if (!fleet?.drones.length) {
      el.innerHTML = '<p class="muted">편대가 비어 있습니다.</p>';
      return;
    }
    el.innerHTML = `<div class="fl-sum">${fleetSummary(fleet.drones)}</div>`
      + fleet.drones.map((d) => {
        const spec = PAYLOAD_SPEC[d.payload];
        const air = d.state === 'PATROL' || d.state === 'LAUNCH' || d.state === 'RTB';
        const bcol = d.battery <= 0.1 ? '#ed5d5d' : d.battery <= 0.25 ? '#e3b341' : '#3dd68c';
        return `<div class="fl" data-uas="${d.uid}">
          <div class="fl-head">
            <b>${d.name}</b>
            <span style="color:${STATE_COLOR[d.state]}">${STATE_LABEL[d.state]}</span>
            <span style="color:${spec.color}">${spec.label}</span>
            <span class="fl-b" style="color:${bcol}">${Math.round(d.battery * 100)}%</span>
          </div>
          <div class="wl-bar"><i style="width:${Math.round(d.battery * 100)}%;background:${bcol}"></i></div>
          <div class="fl-note muted">${air
            ? `AGL ${Math.round(d.curAglM)}m · 궤도 R${Math.round(d.radiusM)}m · 잔여 ${enduranceMin(d.battery).toFixed(0)}분`
            : `지상 대기 · 만충 시 ${enduranceMin(1).toFixed(0)}분 · 소티 ${d.sorties}회`}</div>
        </div>`;
      }).join('');
    $$('#watch-fleet [data-uas]').forEach((row) => {
      row.onclick = () => state.manage?.openFleet();
    });
  }

  // ═══ 배치 목록 ═══
  function renderList() {
    const el = $('#watch-list');
    if (!el) return;
    const posts = state.posts.list();
    if (!posts.length) {
      el.innerHTML = '<p class="muted">배치된 자산이 없습니다. 위 카드를 지도로 끌어다 놓으세요.</p>';
      $('#watch-cost').textContent = '—';
      return;
    }
    const atm = state.env?.state ? atmosphereOf(state.env.state) : null;
    el.innerHTML = posts.map((p) => {
      const t = POST_TYPE[p.type];
      const az0 = Math.round(azimuthDeg(SITE.gp.lon, SITE.gp.lat, p.lon, p.lat));
      const d0 = Math.round(distM(SITE.gp.lon, SITE.gp.lat, p.lon, p.lat));
      const az = az0; const d = d0; const sel = state.posts.selectedUid === p.uid;
      const perf = state.posts.perfOf(p, atm);
      if (!perf) {
        // 발전기 — 보는 장비가 아니므로 실효거리 줄 대신 발전 제원을 적는다
        return `<div class="wl ${sel ? 'sel' : ''}" data-uid="${p.uid}">
          <div class="wl-head">
            <span style="color:${t.color}">${t.icon}</span>
            <b class="wl-name">${p.name}</b>
            <span class="muted">${t.short} · GP ${az}° / ${d}m</span>
            <span class="wl-v" style="color:${p.running === false ? '#ed5d5d' : '#3dd68c'}">${
              p.running === false ? '정지' : '가동'}</span>
          </div>
          <div class="wl-note muted">발전 ${t.genW}W · 연료 ${t.fuelL}L · 무부하 ${t.idleLph}L/h
            ${state.power ? ` · GP 부하 ${state.power.servedW}W / ${state.power.supplyW}W` : ''}</div>
          <div class="wl-act">
            <button class="btn primary" data-manage="${p.uid}">⚙ 관리</button>
            <button class="btn" data-genrun="${p.uid}">${p.running === false ? '가동' : '정지'}</button>
          </div>
        </div>`;
      }
      const solo = lastAnalysis?.perPost?.find((x) => x.uid === p.uid);
      return `<div class="wl ${sel ? 'sel' : ''}" data-uid="${p.uid}">
        <div class="wl-head">
          <span style="color:${t.color}">${t.icon}</span>
          <b class="wl-name">${p.name}</b>
          <span class="muted">${t.short} · GP ${az}° / ${d}m</span>
          <span class="wl-v" style="color:${perf.offline ? '#ed5d5d' : VERDICT_COLOR[perf.verdict]}">${
            perf.offline ? '전원 차단' : VERDICT_TEXT[perf.verdict]}</span>
        </div>
        <div class="wl-bar"><i style="width:${Math.round(perf.factor * 100)}%;background:${VERDICT_COLOR[perf.verdict]}"></i></div>
        <div class="wl-r">
          <span>실효 <b style="color:${VERDICT_COLOR[perf.verdict]}">${fmtM(perf.range)}</b>
            / 청천 <s>${fmtM(perf.specRange)}</s> (${pct(perf.factor)})</span>
          <span class="muted">제한: ${perf.limiter}</span>
        </div>
        <div class="wl-note muted one" title="${perf.note}">${perf.note}</div>
        ${solo ? `<div class="wl-note" style="color:var(--accent)">단독 기여 ${pct(solo.solo)}${
          solo.marginal !== undefined ? ` · 한계기여 +${pct(solo.marginal)}` : ''}</div>` : ''}
        <div class="wl-act">
          <button class="btn primary" data-manage="${p.uid}">⚙ 관리</button>
          <button class="btn" data-fpv="${p.uid}">${svgIcon('eye')} ${t.feed === 'ir' ? 'TOD' : t.short} 시점</button>
        </div>
      </div>`;
    }).join('');
    $('#watch-cost').textContent = `${state.posts.totalCostEok().toFixed(1)}억`;

    $$('#watch-list .wl').forEach((row) => {
      row.addEventListener('click', (e) => {
        if (e.target.closest('button') || e.target.closest('input')) return;
        state.posts.select(row.dataset.uid);
        renderList();
      });
    });
    $$('#watch-list [data-genrun]').forEach((b) => {
      b.onclick = () => {
        const p = state.posts.get(b.dataset.genrun);
        state.posts.update(p.uid, { running: p.running === false });
        ctx.toast(`${p.name} ${p.running === false ? '가동' : '정지'}`, 2600);
        refresh();
      };
    });
    $$('#watch-list [data-manage]').forEach((b) => {
      b.onclick = () => state.manage?.openPost(b.dataset.manage);
    });
    $$('#watch-list [data-fpv]').forEach((b) => {
      b.onclick = () => ctx.enterFpv(`post:${b.dataset.fpv}`);
    });
    $$('#watch-list [data-del]').forEach((b) => {
      b.onclick = () => {
        state.posts.remove(b.dataset.del);
        lastAnalysis = null;
        state.sensorFeed.syncPosts();
        refresh();
      };
    });
  }

  // ═══ 커버리지 분석 ═══
  async function runAnalysis() {
    const posts = state.posts.snapshot();
    if (!posts.length) return ctx.toast('배치된 자산이 없습니다');
    await ctx.ensureGrid();
    ctx.setLoading(true, '초소별 지형 가시선 광선추적…');
    try {
      if (!state.covEngine || state.covEngine.grid !== state.grid) {
        state.covEngine = new CoverageEngine(state.grid);
      }
      const eng = state.covEngine;
      await eng.build(posts, (p) => {
        $('#loading-text').textContent = `지형 가시선 ${Math.round(p * 100)}% (${posts.length}개 초소)`;
      });
      const scored = eng.score(posts);
      const marg = eng.marginal(posts);
      const gaps = eng.gaps(scored);
      const routes = (state.infil?.units ?? []).map((u) => ({
        id: u.rd.route.id, name: u.rd.route.name.split(' — ')[0],
        color: u.rd.route.color, pts: u.rd.pts,
      }));
      const exposure = routes.length ? routeExposure(eng, scored, routes) : [];
      lastAnalysis = {
        joint: scored.joint, covered: scored.covered, gaps, exposure,
        perPost: scored.perPost.map((x) => ({
          ...x, marginal: marg.find((m) => m.uid === x.uid)?.marginal ?? 0,
        })),
        nPosts: posts.length,
      };
      ctx.drawPostCoverage(eng, scored, lastAnalysis);
      renderCoverage(lastAnalysis);
      renderList();
      ctx.toast(`합동 커버 ${pct(scored.joint)} · 사각 ${gaps.length}구간 — 지도에 드레이프`, 5000);
    } finally { ctx.setLoading(false); }
  }

  function renderCoverage(a) {
    const el = $('#watch-coverage');
    if (!el) return;
    const gapsTxt = a.gaps.length
      ? a.gaps.map((g) => (g.from === g.to ? `${Math.round(g.from)}°` : `${Math.round(g.from)}~${Math.round(g.to)}°`)).join(', ')
      : '없음';
    const posts = state.posts.list();
    const rows = a.perPost.map((x) => {
      const p = posts.find((q) => q.uid === x.uid);
      if (!p) return '';
      const t = POST_TYPE[p.type];
      return `<div class="kv" style="font-size:11px">
        <span><span style="color:${t.color}">${t.icon}</span> ${p.name}</span>
        <b>단독 ${pct(x.solo)} · 한계 +${pct(x.marginal)}</b></div>`;
    }).join('');
    const expo = a.exposure.length
      ? `<div class="sec-sub" style="margin-top:8px">침투 축선 노출</div>`
        + a.exposure.map((e) => `<div class="kv" style="font-size:11px">
            <span style="color:${e.color}">${e.name}</span>
            <b style="color:${e.exposure >= 0.6 ? '#3dd68c' : e.exposure >= 0.3 ? '#e3b341' : '#ed5d5d'}">
              노출 ${pct(e.exposure)} · 최장사각 ${fmtM(e.worstDarkM)}${
                e.firstDetectRangeM !== null
                  ? ` · 최초탐지 GP ${fmtM(e.firstDetectRangeM)} 전`
                  : ' · 끝까지 미탐지'}</b></div>`).join('')
        + `<p class="muted" style="margin-top:4px">최초탐지는 <b>GP 까지 남은 거리</b>다 —
          대응시간을 정하는 것은 얼마나 왔느냐가 아니라 얼마나 남았느냐다. 최장사각은 연속으로
          안 보이는 최대 구간, 침투자가 붙어 오는 자리다.</p>`
      : '';
    el.innerHTML = `<div class="card" style="margin-top:8px">
      <div class="kv"><span><b>합동 탐지확률 평균</b> (책임구역 면적가중)</span>
        <b style="color:var(--accent);font-size:15px">${pct(a.joint)}</b></div>
      <div class="kv"><span>P ≥ 0.3 커버 면적</span><b>${pct(a.covered)}</b></div>
      <div class="kv"><span>조기경보선(1.8km) 사각 방위</span>
        <b style="color:${a.gaps.length ? '#ed5d5d' : '#3dd68c'}">${gapsTxt}</b></div>
      <div class="sec-sub" style="margin-top:8px">초소별 기여</div>
      ${rows}
      ${expo}
      <p class="muted" style="margin-top:6px">한계기여 = 그 초소를 빼면 잃는 커버. 0 % 에 가까우면
      다른 자산이 이미 같은 구역을 보고 있다는 뜻 — 옮기거나 지향을 틀 자리다.</p>
    </div>`;
  }

  // ═══ 날씨 스윕 ═══
  function runSweep() {
    const posts = state.posts.snapshot();
    if (!posts.length) return ctx.toast('배치된 자산이 없습니다');
    if (!state.covEngine || !state.covEngine.masks.size) {
      return ctx.toast('먼저 「가시성 분석 실행」으로 지형 가시선을 구워 주세요', 4200);
    }
    const site = { latitude: SITE.gp.lat, longitude: SITE.gp.lon, utcOffsetHours: 9 };
    sweepRows = state.covEngine.weatherSweep(posts, site, state.env.settings);
    renderSweep(sweepRows);
    ctx.toast('날씨 스윕 완료 — 셀을 누르면 그 조건을 씬에 적용합니다', 4600);
  }

  function renderSweep(rows) {
    const el = $('#watch-sweep-out');
    if (!el) return;
    const posts = state.posts.list();
    const byW = new Map();
    for (const r of rows) {
      if (!byW.has(r.weather)) byW.set(r.weather, []);
      byW.get(r.weather).push(r);
    }
    const clear = rows.find((r) => r.weather === 'clear' && r.intensity <= 0.3);
    const head = `<tr><th>날씨</th><th>약</th><th>중</th><th>강</th><th>강(V·조건)</th></tr>`;
    const body = [...byW.entries()].map(([w, rs]) => {
      const cells = rs.map((r) => `<td class="ws-cell" data-w="${r.weather}" data-i="${r.intensity}"
        style="background:${heat(r.joint)}22;color:${heat(r.joint)}">${pct(r.joint)}</td>`).join('');
      const worst = rs[rs.length - 1];
      return `<tr><th>${WEATHER_LABELS[w]}</th>${cells}
        <td class="muted">${fmtM(worst.visibilityMeters)}${
          worst.snowCover > 0.05 ? ` · 적설 ${pct(worst.snowCover)}` : ''}</td></tr>`;
    }).join('');

    // 자산별 유효거리: 청천(약) vs 폭설(강) vs 짙은안개(강)
    const snow = rows.find((r) => r.weather === 'snow' && r.intensity === 1);
    const fog = rows.find((r) => r.weather === 'fog' && r.intensity === 1);
    const cmp = posts.map((p) => {
      const t = POST_TYPE[p.type];
      const c = clear?.perfBy[p.uid], s = snow?.perfBy[p.uid], f = fog?.perfBy[p.uid];
      if (!c) return '';
      const cell = (x) => `<td style="color:${VERDICT_COLOR[x.verdict]}">${fmtM(x.range)}
        <em>${pct(x.factor)}</em></td>`;
      return `<tr><th style="color:${t.color}">${t.icon} ${p.name}</th>
        <td>${fmtM(c.range)}</td>${cell(s)}${cell(f)}</tr>`;
    }).join('');

    const drop = (clear && snow) ? 1 - (snow.joint / Math.max(1e-6, clear.joint)) : 0;
    const dropOpt = (clear && snow) ? 1 - (snow.jointOptical / Math.max(1e-6, clear.jointOptical)) : 0;
    const delta = (a, b, d) => `<b><span style="color:${heat(a ?? 0)}">${pct(a)}</span>
      → <span style="color:${heat(b ?? 0)}">${pct(b)}</span>
      <span style="color:#ed5d5d">(−${pct(d)})</span></b>`;
    el.innerHTML = `
      <div class="card" style="margin-top:8px">
        <div class="kv"><span><b>맑음 → 폭설</b> 합동 커버 (전 자산)</span>
          ${delta(clear?.joint, snow?.joint, drop)}</div>
        <div class="kv"><span>같은 조건 · <b>광학·화기만</b> (레이더·재머 제외, ${clear?.nOptical ?? 0}개소)</span>
          ${delta(clear?.jointOptical, snow?.jointOptical, dropOpt)}</div>
        <p class="muted" style="margin-top:4px">두 줄이 다른 이유가 결론이다 — 전천후 자산 한 대가
        합동 수치를 떠받치는 동안 광학은 그 아래에서 무너진다. 레이더가 빠지면 폭설의 GP 는
        아래 줄만큼만 본다.</p>
      </div>
      <table class="ws-tab"><thead>${head}</thead><tbody>${body}</tbody></table>
      <div class="sec-sub" style="margin-top:10px">자산별 실효 탐지거리</div>
      <table class="ws-tab ws-tab2"><thead>
        <tr><th>자산</th><th>맑음</th><th>폭설</th><th>짙은안개</th></tr></thead>
        <tbody>${cmp}</tbody></table>
      <p class="muted" style="margin-top:6px">눈은 송이가 파장보다 훨씬 커서 기하산란이 된다 —
      가시와 열상을 가리지 않고 함께 깎는다. 안개는 물방울이 LWIR 파장과 같은 급이라 열상이 절반쯤
      버티고, 레이더는 두 경우 모두 거의 그대로다. 악천후 감시의 기준선이 레이더인 이유다.</p>`;

    $$('#watch-sweep-out .ws-cell').forEach((c) => {
      c.onclick = () => {
        state.env.set({ weather: c.dataset.w, intensity: +c.dataset.i });
        ctx.renderEnv?.();
        state.posts.redraw();
        refresh();
        ctx.toast(`${WEATHER_LABELS[c.dataset.w]} 강도 ${Math.round(+c.dataset.i * 100)}% 적용`, 3200);
      };
    });
  }

  /** 환경·배치가 바뀔 때 값만 다시 그린다 (탭 전체 재렌더보다 싸다) */
  function refresh() {
    if (!$('#page-watch')) return;
    if (!$('#watch-list')) { render(); return; }
    renderPower();
    renderFleet();
    renderAtm();
    renderPalette();
    renderList();
    if (lastAnalysis) renderCoverage(lastAnalysis);
  }

  return {
    render,
    refresh,
    invalidate() { lastAnalysis = null; sweepRows = null; },
    get analysis() { return lastAnalysis; },
  };
}
