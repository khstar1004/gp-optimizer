// @ts-nocheck
/**
 * 작전계획 종합 보고서 — 인쇄용 A4 패키지 (실무 제출 문서 관례)
 *
 * 구성: 표지 헤더(부대·DTG·통제 배너) → 사업 개요 → (선택) 훈련근거 기반 소요
 *  → 배치계획도(A3 도면 축소판) → 시설 일람표 → 위협 축선 평가표 → 결심 타임라인(신규 분석: 축선별
 *  NAI/DP/TAI 도달 시각과 타격 결심 여유) → 작전분석 도식 → 자산 운용 → 서명란.
 *
 * 렌더는 iframe srcdoc(라이트 인쇄 테마, @page A4) — 팝업 차단과 무관하고
 * 인쇄(contentWindow.print)와 HTML 파일 저장을 모달에서 제공한다.
 */

import { svgIcon } from './icons';

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

function dtgNow() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${p(d.getDate())}${p(d.getHours())}${p(d.getMinutes())}K${MONTHS[d.getMonth()]}${String(d.getFullYear()).slice(2)}`;
}

/**
 * 결심 타임라인 — KAIROS 비율 규칙(NAI 24% / DP 56% / TAI 82%)을 시간축으로 환산.
 * 타격 결심 여유 = DP→TAI 소요 − 사격절차 소요(요청~탄착, 표준 절차 가정).
 */
export function computeDecisionTimeline(routeScores, moveModes, procedureMin = 6) {
  return (routeScores ?? []).slice(0, 4).map((r) => {
    const totalM = r.rd.totalM;
    const rows = Object.values(moveModes)
      .filter((m) => r.rd && (m.id !== 'vehicle' || r.feasible !== false))
      .map((m) => {
        const totalMin = totalM / m.speed / 60;
        const nai = totalMin * 0.24, dp = totalMin * 0.56, tai = totalMin * 0.82;
        const margin = (tai - dp) - procedureMin;
        return {
          mode: m.name.split(' ')[0], totalMin, naiMin: nai, dpMin: dp, taiMin: tai,
          marginMin: margin, ok: margin >= 0,
        };
      });
    return { route: r.rd.route.name, score: r.score, rows };
  });
}

/** ctx → 완결 HTML 문서 문자열 */
export function buildOpReportHtml(ctx) {
  const {
    siteName, towerHeight, groundH, stats, items, routeScores,
    ipbItems, coaItems, assets, optimization, blueprintDataUrl, timeline, trainingEvidence,
  } = ctx;
  const kfmt = (n) => (n >= 1e8 ? `${(n / 1e8).toFixed(1)}억` : `${Math.round(n / 1e4).toLocaleString()}만`);
  const min1 = (m) => (m >= 60 ? `${Math.floor(m / 60)}시간 ${Math.round(m % 60)}분` : `${Math.round(m)}분`);

  const facilityRows = items.map((it, i) => `
    <tr><td>${i + 1}</td><td>${esc(it.spec.name)}</td><td>${it.capacity}인</td>
      <td>${it.floors}층</td><td>${it.dims.widthM.toFixed(0)}×${it.dims.depthM.toFixed(0)}m</td>
      <td>${it.protection === 'hardened' ? '방호' : '일반'}</td>
      <td class="num">${kfmt(it.cost?.totalKrw ?? 0)}</td></tr>`).join('');

  const routeRows = (routeScores ?? []).map((r, i) => `
    <tr class="${i === 0 ? 'hl' : ''}"><td>${i + 1}</td><td>${esc(r.rd.route.name.split(' — ')[0])}</td>
      <td class="num">${r.coverage.toFixed(0)}%</td><td class="num">${r.gap.toFixed(0)}%</td>
      <td class="num">${r.fireLink.toFixed(0)}%</td><td class="num">${r.roadScore}</td>
      <td class="num"><b>${r.score}</b></td><td>${r.feasible ? '가능' : '제한'}</td></tr>`).join('');

  const tlBlocks = (timeline ?? []).map((t) => `
    <h3>${esc(t.route)} <span class="dim">(위협점수 ${t.score})</span></h3>
    <table><thead><tr><th>수단</th><th>총 소요</th><th>NAI 도달</th><th>DP 도달</th>
      <th>TAI 도달</th><th>타격 결심 여유</th></tr></thead><tbody>
      ${t.rows.map((r) => `<tr><td>${esc(r.mode)}</td><td class="num">${min1(r.totalMin)}</td>
        <td class="num">H+${Math.round(r.naiMin)}분</td><td class="num">H+${Math.round(r.dpMin)}분</td>
        <td class="num">H+${Math.round(r.taiMin)}분</td>
        <td class="num ${r.ok ? 'ok' : 'bad'}">${r.ok ? '+' : ''}${Math.round(r.marginMin)}분 ${r.ok ? '충분' : '⚠ 부족'}</td></tr>`).join('')}
    </tbody></table>`).join('');

  const ipbRows = (ipbItems ?? []).map((it) => `
    <tr><td>${it.kind} ${it.n}</td><td>${esc(it.note)}</td></tr>`).join('');
  const coaRows = (coaItems ?? []).map((it) => `
    <tr><td>${esc(it.label)}</td><td>${esc(it.toolName)} · ${it.points}점</td></tr>`).join('');

  const assetRows = (assets ?? []).map((a) => `
    <tr><td>${esc(a.name)}</td><td>${esc(a.group)}</td>
      <td class="num">${a.range ? (a.range / 1000).toFixed(1) + 'km' : '—'}</td></tr>`).join('');

  return `<!DOCTYPE html><html lang="ko"><head><meta charset="utf-8">
<title>작전계획 보고서 — ${esc(siteName)}</title>
<style>
  @page { size: A4; margin: 16mm 14mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Pretendard GOV', 'Malgun Gothic', sans-serif; color: #17202b;
    font-size: 11px; line-height: 1.6; background: #fff; padding: 24px 28px; }
  .banner { text-align: center; font-weight: 800; letter-spacing: 0.35em; font-size: 11px;
    color: #b3261e; border: 1.6px solid #b3261e; padding: 3px 0; margin-bottom: 14px; }
  header.doc { display: flex; justify-content: space-between; align-items: flex-end;
    border-bottom: 2.5px solid #17202b; padding-bottom: 8px; margin-bottom: 14px; }
  header.doc h1 { font-size: 21px; letter-spacing: 0.02em; }
  header.doc .meta { text-align: right; font-size: 10.5px; color: #47535f; }
  h2 { font-size: 13px; margin: 16px 0 6px; padding: 4px 8px; background: #eef2f7;
    border-left: 3.5px solid #1f6feb; page-break-after: avoid; }
  h3 { font-size: 11.5px; margin: 10px 0 4px; page-break-after: avoid; }
  table { width: 100%; border-collapse: collapse; margin: 4px 0 8px; page-break-inside: avoid; }
  th, td { border: 1px solid #c6cfd9; padding: 3.5px 7px; text-align: left; }
  th { background: #f2f5f9; font-size: 10px; letter-spacing: 0.04em; }
  td.num { text-align: right; font-variant-numeric: tabular-nums; }
  tr.hl td { background: #fff6ec; font-weight: 600; }
  .ok { color: #0f7b40; font-weight: 700; } .bad { color: #b3261e; font-weight: 700; }
  .dim { color: #7a8794; font-weight: 400; font-size: 10px; }
  .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 0 18px; }
  .bp { width: 100%; border: 1px solid #c6cfd9; margin: 4px 0 6px; page-break-inside: avoid; }
  .note { color: #7a8794; font-size: 10px; margin: 2px 0 6px; }
  .sig { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; margin-top: 22px;
    text-align: center; page-break-inside: avoid; }
  .sig div { border-top: 1px solid #17202b; padding-top: 5px; font-size: 10.5px; }
  footer { margin-top: 18px; text-align: center; font-size: 9.5px; color: #98a4b0; }
</style></head><body>
<div class="banner">합성 데모 — 실기준 아님 · FOR EXERCISE ONLY</div>
<header class="doc">
  <div><h1>작전계획 종합 보고서</h1><div class="dim">GP Digital Twin 산출</div></div>
  <div class="meta">진지: <b>${esc(siteName)}</b><br>작성: ${dtgNow()}<br>기준표고 ${Math.round(groundH)}m · 감시탑 ${towerHeight}m</div>
</header>

<h2>1. 사업 개요</h2>
<div class="grid2">
  <table><tbody>
    <tr><th>배치 시설</th><td class="num">${items.length}동</td></tr>
    <tr><th>연면적</th><td class="num">${Math.round(stats.floorAreaM2).toLocaleString()}㎡</td></tr>
    <tr><th>공사비</th><td class="num">${kfmt(stats.constructionKrw)}</td></tr>
  </tbody></table>
  <table><tbody>
    <tr><th>설계비</th><td class="num">${kfmt(stats.designFeeKrw)}</td></tr>
    <tr><th>인허가</th><td class="num">${kfmt(stats.permitFeeKrw)}</td></tr>
    <tr><th>총사업비</th><td class="num"><b>${kfmt(stats.totalKrw)}</b></td></tr>
  </tbody></table>
</div>

${trainingEvidence?.hotspot ? `<h2>2. 훈련근거 기반 시설 소요 <span class="dim">합성 목업</span></h2>
<p class="note">데이터세트 ${esc(trainingEvidence.dataset?.name ?? trainingEvidence.datasetId ?? '-')} · fingerprint ${esc(trainingEvidence.fingerprint ?? '-')} · 분석 범위 01–${String(trainingEvidence.sessionLimit ?? trainingEvidence.dataset?.sessions ?? trainingEvidence.hotspot.recurrence.total).padStart(2, '0')}회 · 개인식별정보 제거 · ${trainingEvidence.hotspot.recurrence.sessions}/${trainingEvidence.hotspot.recurrence.total}회 반복</p>
<table><thead><tr><th>선택 구역</th><th>훈련손실률</th><th>집결 P90</th><th>후송 P90</th><th>통신 단절</th><th>신뢰도</th></tr></thead><tbody><tr class="hl"><td>${esc(trainingEvidence.hotspot.id)} · ${esc(trainingEvidence.hotspot.label)}</td><td class="num">${trainingEvidence.hotspot.trainingLossRate.toFixed(1)}/100 인시</td><td class="num">${Math.floor(trainingEvidence.hotspot.dwellP90Sec / 60)}분 ${Math.round(trainingEvidence.hotspot.dwellP90Sec % 60)}초</td><td class="num">${Math.floor(trainingEvidence.hotspot.responseP90Sec / 60)}분 ${Math.round(trainingEvidence.hotspot.responseP90Sec % 60)}초</td><td class="num">${Math.floor(trainingEvidence.hotspot.commsGapSec / 60)}분 ${Math.round(trainingEvidence.hotspot.commsGapSec % 60)}초</td><td class="num">${trainingEvidence.hotspot.confidence}%</td></tr></tbody></table>
<table><thead><tr><th>도출 기능</th><th>우선도</th><th>연결 시설</th><th>선정 후보</th></tr></thead><tbody>${(trainingEvidence.needs ?? []).map((need) => { const c = need.selectedCandidate ?? need.candidates?.[0]; return `<tr><td>${esc(need.label)}</td><td class="num">${need.priority}</td><td>${esc(need.facilityTypeId)}</td><td>${esc(c?.label ?? '-')}</td></tr>`; }).join('')}</tbody></table>
<p class="note">훈련근거·예상 효과는 합성 목업이며, 실제 KCTC 연결 전에는 설계·운용 기준으로 사용할 수 없습니다.</p>` : ''}

${blueprintDataUrl ? `<h2>${trainingEvidence?.hotspot ? 3 : 2}. 배치계획도</h2><img class="bp" src="${blueprintDataUrl}" alt="배치계획도">` : ''}

<h2>${(blueprintDataUrl ? 3 : 2) + (trainingEvidence?.hotspot ? 1 : 0)}. 시설 일람</h2>
${items.length ? `<table><thead><tr><th>#</th><th>시설명</th><th>수용</th><th>층수</th>
  <th>규격</th><th>방호</th><th>사업비</th></tr></thead><tbody>${facilityRows}</tbody></table>`
    : '<p class="note">배치된 시설 없음.</p>'}

<h2>위협 축선 평가 (KAIROS scoreRouteOption)</h2>
${routeRows ? `<table><thead><tr><th>순위</th><th>축선</th><th>감시커버</th><th>종말공백</th>
  <th>화력연계</th><th>기동로</th><th>위협점수</th><th>차량</th></tr></thead><tbody>${routeRows}</tbody></table>
  <p class="note">가중치 0.34/0.26/0.18/0.22 — 1순위(음영)가 최우선 경계 축선.</p>`
    : '<p class="note">축선 분석 미실행 — 작전분석 탭에서 「기동로 분석」 실행 후 재출력 권장.</p>'}

<h2>결심 타임라인</h2>
${tlBlocks || '<p class="note">축선 분석 미실행으로 산출 불가.</p>'}
<p class="note">H = 적 축선 진입 시각. 타격 결심 여유 = (TAI 도달 − DP 도달) − 표준 사격절차 6분.
음수(⚠)는 해당 수단 속도에서 DP 관측 즉시 결심해도 TAI 화력운용이 늦음을 의미 — 전방 NAI 감시 강화 필요.</p>

<h2>작전분석 도식</h2>
<div class="grid2">
  <div>${ipbRows ? `<h3>NAI · DP · TAI</h3><table><tbody>${ipbRows}</tbody></table>` : '<p class="note">IPB 도식 없음.</p>'}</div>
  <div>${coaRows ? `<h3>COA 스케치</h3><table><tbody>${coaRows}</tbody></table>` : '<p class="note">COA 스케치 없음.</p>'}</div>
</div>

<h2>감시 · 화력 자산 운용</h2>
${assetRows ? `<table><thead><tr><th>자산</th><th>구분</th><th>유효거리</th></tr></thead><tbody>${assetRows}</tbody></table>` : '<p class="note">가동 자산 없음.</p>'}
${optimization ? `<p class="note">합동 배치 최적화: 커버리지 ${Math.round((optimization.jointBefore ?? 0) * 100)}% → <b>${Math.round((optimization.jointAfter ?? 0) * 100)}%</b>${optimization.gaps?.length ? ` · 조기경보선 사각 ${optimization.gaps.length}개 방위` : ' · 조기경보선 사각 없음'}</p>` : ''}

<div class="sig"><div>작성 (계획담당)</div><div>검토 (작전과장)</div><div>승인 (지휘관)</div></div>
<footer>GP Digital Twin · 본 문서는 합성 지형·가상 제원 기반 데모 산출물로 실제 작전 문서가 아님 · ${dtgNow()}</footer>
</body></html>`;
}

/** 보고서 모달 (iframe srcdoc + 인쇄/저장) */
export function openOpReport(html) {
  let modal = document.getElementById('op-report-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'op-report-modal';
    modal.innerHTML = `
      <div class="opr-sheet">
        <div class="opr-head">
          <span>작전계획 종합 보고서</span>
          <div class="opr-actions">
            <button class="btn primary" id="opr-print">${svgIcon('printer')} 인쇄</button>
            <button class="btn" id="opr-save">HTML 저장</button>
            <button class="btn" id="opr-close">닫기</button>
          </div>
        </div>
        <iframe id="opr-frame" title="작전계획 보고서"></iframe>
      </div>`;
    document.getElementById('map-wrap').appendChild(modal);
    modal.addEventListener('click', (e) => { if (e.target === modal) modal.classList.add('hidden'); });
    modal.querySelector('#opr-close').onclick = () => modal.classList.add('hidden');
    modal.querySelector('#opr-print').onclick = () => {
      modal.querySelector('#opr-frame').contentWindow?.print();
    };
    modal.querySelector('#opr-save').onclick = () => {
      const blob = new Blob([modal.querySelector('#opr-frame').srcdoc], { type: 'text/html' });
      const a = document.createElement('a');
      const d = new Date();
      const p = (n) => String(n).padStart(2, '0');
      a.download = `GP-Digital-Twin_작전계획보고서_${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}.html`;
      a.href = URL.createObjectURL(blob);
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    };
  }
  modal.querySelector('#opr-frame').srcdoc = html;
  modal.classList.remove('hidden');
}

