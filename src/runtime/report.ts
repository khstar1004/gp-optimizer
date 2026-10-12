// @ts-nocheck
/**
 * 작전 보고서 생성 — War ground 원본 보고서 유틸을 그대로 호출한다.
 *
 * 원본 (js/vendor/warground/ ← Desktop\War ground\frontend\src\utils, 무수정 사본):
 *   reportMarkdown.js        sanitizeReportMarkdownSource / renderReportMarkdown  (마크다운 → HTML)
 *   missionProfile.js        임무모드·대상·비밀등급·시계 메타, 준비도 카드/체크리스트 빌더
 *   workflowStages.js        WORKFLOW_STAGE_DEFINITIONS — 작전 워크플로 단계 정의
 *   operationalAssurance.js  buildOperationalAssuranceRequirements — 결심 입력 요구사항
 *
 * 이 파일은 GP 데모의 현재 상태(배치·비용·침투·IPB·지형분석·화력)를 원본이 기대하는
 * 형태로 모아 마크다운을 만들고, 렌더링은 원본 renderReportMarkdown 에 맡긴다.
 */
import { renderReportMarkdown, sanitizeReportMarkdownSource } from '../../js/vendor/warground/reportMarkdown';
import {
  MISSION_MODE_OPTIONS, AUDIENCE_OPTIONS, CLASSIFICATION_OPTIONS, TIME_HORIZON_OPTIONS,
  getMissionModeMeta, getAudienceLabel, getClassificationLabel, getTimeHorizonLabel,
  getReadinessPercent, getReadinessHeadline, buildReadinessChecklist,
} from '../../js/vendor/warground/missionProfile';
import { WORKFLOW_STAGE_DEFINITIONS, WORKFLOW_TOTAL_STEPS } from '../../js/vendor/warground/workflowStages';
import { SITE, MOVE_MODES } from './data';
import { fmtKrw, computeProjectCost, DIFFICULTY_LABELS } from './projectCost';
import { toMGRS } from './mgrs';

export {
  MISSION_MODE_OPTIONS, AUDIENCE_OPTIONS, CLASSIFICATION_OPTIONS, TIME_HORIZON_OPTIONS,
  WORKFLOW_STAGE_DEFINITIONS, WORKFLOW_TOTAL_STEPS,
  renderReportMarkdown, getReadinessPercent, getReadinessHeadline, buildReadinessChecklist,
};

const pct = (v) => `${Math.round((v ?? 0) * 100)}%`;
const fmtSecReport = (seconds) => `${Math.floor((seconds ?? 0) / 60)}분 ${String(Math.round((seconds ?? 0) % 60)).padStart(2, '0')}초`;

/** 현재 데모 상태 → 작전 보고서 마크다운 */
export function buildReportMarkdown(ctx) {
  const {
    profile = {}, placerItems = [], routes = [], infilMode = 'walk',
    ipbItems = [], intel = null, towerHeight = 0, coveragePct = null, fires = null,
    decisions = [], trainingEvidence = null,
  } = ctx;

  const missionMeta = getMissionModeMeta(profile.missionMode);
  const cost = placerItems.length ? computeProjectCost(placerItems) : null;
  const now = new Date().toLocaleString('ko-KR', { hour12: false });

  const lines = [];
  lines.push(`# ${SITE.name} 작전 보고서`);
  lines.push('');
  lines.push(`- 작성 ${now}`);
  lines.push(`- 임무 유형: ${missionMeta?.label ?? profile.missionMode ?? '-'}`);
  lines.push(`- 보고 대상: ${getAudienceLabel(profile.audience)} · 비밀등급: ${getClassificationLabel(profile.classification)} · 시계: ${getTimeHorizonLabel(profile.timeHorizon)}`);
  lines.push(`- 기준 좌표: ${toMGRS(SITE.gp.lon, SITE.gp.lat)} (${SITE.gp.lat.toFixed(5)}N ${SITE.gp.lon.toFixed(5)}E)`);
  lines.push('');
  lines.push('> 합성 데모 데이터 — 실좌표·실기준 아님.');
  lines.push('');

  lines.push('## 1. 감시 태세');
  lines.push('');
  lines.push(`- 감시탑 높이: **${Math.round(towerHeight)}m**`);
  if (coveragePct != null) lines.push(`- 관측 커버리지: **${coveragePct}%**`);
  lines.push('');

  const trainingOffset = trainingEvidence?.hotspot ? 1 : 0;
  if (trainingEvidence?.hotspot) {
    const hotspot = trainingEvidence.hotspot;
    lines.push('## 2. 훈련근거 기반 시설 소요 (합성 목업)');
    lines.push('');
    lines.push(`- 데이터세트: **${trainingEvidence.dataset?.name ?? trainingEvidence.datasetId ?? '-'}** · fingerprint **${trainingEvidence.fingerprint ?? '-'}**`);
    lines.push(`- 분석 범위: **01–${String(trainingEvidence.sessionLimit ?? trainingEvidence.dataset?.sessions ?? hotspot.recurrence.total).padStart(2, '0')}회** · 선택 구역: **${hotspot.id} ${hotspot.label}** · 반복 ${hotspot.recurrence.sessions}/${hotspot.recurrence.total}회 · 근거 신뢰도 ${hotspot.confidence}%`);
    lines.push(`- 훈련손실률 ${hotspot.trainingLossRate.toFixed(1)}/100 인시 · 집결 P90 ${fmtSecReport(hotspot.dwellP90Sec)} · 후송 P90 ${fmtSecReport(hotspot.responseP90Sec)} · 통신 단절 ${fmtSecReport(hotspot.commsGapSec)}`);
    lines.push('');
    lines.push('| 도출 기능 | 우선도 | 연결 시설 | 선정 후보 |');
    lines.push('| --- | ---: | --- | --- |');
    for (const need of trainingEvidence.needs ?? []) {
      const candidate = need.selectedCandidate ?? need.candidates?.[0];
      lines.push(`| ${need.label} | ${need.priority} | ${need.facilityTypeId} | ${candidate?.label ?? '-'} |`);
    }
    lines.push('');
    lines.push('> 훈련근거와 효과 수치는 합성 목업입니다. 실제 KCTC 연결 전에는 설계·운용 기준으로 사용할 수 없습니다.');
    lines.push('');
  }

  lines.push(`## ${2 + trainingOffset}. 시설 배치 · 사업비`);
  lines.push('');
  if (!placerItems.length) {
    lines.push('배치된 시설이 없습니다.');
  } else {
    lines.push('| 시설 | 인원 | 층 | 면적(㎡) | 시공 난이도 | 공사비 |');
    lines.push('| --- | ---: | ---: | ---: | --- | ---: |');
    for (const it of placerItems) {
      lines.push(`| ${it.spec.name} | ${it.capacity} | ${it.floors} | ${it.dims.areaM2} | ${DIFFICULTY_LABELS[it.cost.difficulty] ?? it.cost.difficulty} | ${fmtKrw(it.cost.totalKrw)} |`);
    }
    lines.push('');
    lines.push(`- 공사비 합계 **${fmtKrw(cost.constructionKrw)}** · 설계비 ${fmtKrw(cost.designFeeKrw)} · 인허가 ${fmtKrw(cost.permitFeeKrw)}`);
    lines.push(`- **총사업비 ${fmtKrw(cost.totalKrw)}** (연면적 ${cost.floorAreaM2.toLocaleString()}㎡)`);
  }
  lines.push('');

  lines.push(`## ${3 + trainingOffset}. 침투 축선 판단`);
  lines.push('');
  if (!routes.length) {
    lines.push('축선 분석 결과가 없습니다.');
  } else {
    lines.push(`이동수단: **${MOVE_MODES[infilMode]?.name ?? infilMode}** (한계경사 ${MOVE_MODES[infilMode]?.maxSlopeDeg}°)`);
    lines.push('');
    lines.push('| 축선 | 총연장 | 경사 P95 | 최대경사 | 기동 판정 |');
    lines.push('| --- | ---: | ---: | ---: | --- |');
    for (const rd of routes) {
      const ok = rd.slopeP95 <= (MOVE_MODES[infilMode]?.maxSlopeDeg ?? 90);
      lines.push(`| ${rd.route.name} | ${(rd.totalM / 1000).toFixed(2)}km | ${rd.slopeP95.toFixed(1)}° | ${rd.maxSlope.toFixed(1)}° | ${ok ? '가능' : '불가'} |`);
    }
  }
  lines.push('');

  lines.push(`## ${4 + trainingOffset}. 전장정보분석 (IPB)`);
  lines.push('');
  if (!ipbItems.length) {
    lines.push('도출된 전술 도식이 없습니다.');
  } else {
    lines.push('| 구분 | 번호 | 비고 | MGRS |');
    lines.push('| --- | ---: | --- | --- |');
    for (const it of ipbItems) {
      lines.push(`| ${it.kind} | ${it.n} | ${it.note ?? '-'} | ${toMGRS(it.lon, it.lat)} |`);
    }
  }
  lines.push('');

  if (intel) {
    lines.push(`## ${5 + trainingOffset}. 지형정보 분석 (KAIROS)`);
    lines.push('');
    lines.push(`- 지형 분류: **${intel.terrainClass}**`);
    lines.push(`- 표고 ${Math.round(intel.minElevation)}~${Math.round(intel.maxElevation)}m · 기복 ${Math.round(intel.reliefMeters)}m`);
    lines.push(`- 평균 경사 ${intel.meanSlopeDegrees.toFixed(1)}° · 급경사(≥15°) 비율 ${pct(intel.steepSampleRatio)}`);
    lines.push(`- 평균 가시율 ${pct(intel.meanVisibilityRatio)} · 은폐도 ${pct(intel.meanConcealmentScore)} · 노출도 ${pct(intel.meanExposureScore)}`);
    lines.push(`- 전술 마커 ${intel.markers.length} · 사격계획 ${intel.firePlans.length} · LOS 사선 ${intel.losSegments.length}`);
    lines.push('');
  }

  if (fires) {
    lines.push(`## ${6 + trainingOffset}. 화력운용 판단 (KAIROS 교리)`);
    lines.push('');
    lines.push(`- 종합 판단: **${fires.verdict}**`);
    lines.push(`- 사거리대 ${fires.rangeBand ?? '-'} · 지형 ${fires.terrainLabel}`);
    if (fires.options?.length) {
      lines.push('');
      lines.push('| 사격단위 | 요망효과 10% | 20% | 30% |');
      lines.push('| --- | --- | --- | --- |');
      for (const o of fires.options) {
        lines.push(`| ${o.fireUnit} | ${o.effects['10'] ?? '-'} | ${o.effects['20'] ?? '-'} | ${o.effects['30'] ?? '-'} |`);
      }
    }
    lines.push('');
    lines.push(`- 부수피해 안전여유 ${fires.safetyMarginM}m 기준: ` +
      fires.collateral.map((c) => `${c.munition} ${c.requiredM}m(${c.safe === false ? '미달' : '충족'})`).join(' · '));
    lines.push('');
  }

  if (decisions.length) {
    lines.push(`## ${7 + trainingOffset}. 참모 결심 판단 (KAIROS 결심엔진)`);
    lines.push('');
    lines.push(`현재 GP 상황을 입력해 원본 결심엔진 ${decisions.length}개 시나리오를 산출했습니다.`);
    lines.push('');
    for (const d of decisions) {
      if (!d.output || d.output.error) continue;
      lines.push(`### ${d.id}. ${d.output.title}`);
      lines.push('');
      if (d.output.summary) { lines.push(d.output.summary); lines.push(''); }
      const key = (d.output.metrics ?? []).slice(0, 6)
        .map((m) => `${m.label} **${m.value}**`).join(' · ');
      if (key) { lines.push(`- ${key}`); lines.push(''); }
    }
  }

  lines.push('## 부록 — 작전 워크플로 단계');
  lines.push('');
  for (const stage of WORKFLOW_STAGE_DEFINITIONS) {
    lines.push(`${stage.id}. ${stage.label}`);
  }
  lines.push('');
  lines.push(`총 ${WORKFLOW_TOTAL_STEPS}단계`);

  return lines.join('\n');
}

/** 원본 sanitize + render 로 HTML 생성 */
export function renderReportHtml(markdown) {
  return renderReportMarkdown(sanitizeReportMarkdownSource(markdown));
}

/** 마크다운 파일 다운로드 */
export function downloadMarkdown(markdown, filename = 'gp-operation-report.md') {
  const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

