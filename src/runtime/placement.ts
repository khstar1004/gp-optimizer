// @ts-nocheck
/**
 * 건축물 드래그앤드랍 배치 + 실시간 비용
 *
 * 비용·면적·좌표 모델은 Scaffolda 원본을 그대로 호출한다 (재구현 없음):
 *   js/vendor/scaffolda/scaffolda.bundle.js  ← Scaffolda-public/src/features/scaffolda/lib/**
 *     earthworkModel.computeEarthwork      절·성토 균형 pad·2m 격자 체적적분·옹벽/비탈면 변분류·난이도 밴딩
 *     projectCost.computeProjectCost       설계비(연면적×76,000)·인허가 수수료 구간표
 *     siteZoneProperties.*                 4평/인 원단위, 종횡비 1.5, capacity↔면적
 *     facilityCatalog.FACILITY_CATALOG     시설 19종 원본 제원
 *     localCoordinate.*                    lon/lat ↔ 로컬미터
 *
 * GP 고유 추가분은 방호 등급(hardened) 할증 하나뿐이며, 원본 EarthworkConfig의
 * buildingCostPerPyeong 을 배수 조정하는 방식으로 원본 산식을 건드리지 않고 반영한다.
 */
import { offset } from './geo';
import { slopeVerdict, SLOPE_LIMITS, roadGrade } from './siteEngineering';
import {
  DEFAULT_EARTHWORK_CONFIG, PROTECTION_MULTIPLIER, DIFFICULTY_LABELS,
  computeEarthwork, fmtKrw, footprintOf, computeProjectCost,
} from './projectCost';
import { BuildingStack, YARD_PLANS } from './buildingModels';
import {
  FACILITY_CATALOG as SCAFFOLDA_FACILITY_CATALOG,
  findFacilityTypeById,
  lngLatToLocalMeters,
  localMetersToLngLat,
  PYEONG_TO_SQUARE_METERS,
  RECOMMENDED_AREA_PYEONG_PER_CAPACITY,
  DEFAULT_AREA_PER_PERSON_M2,
  createRecommendedZoneDimensions as scaffoldaRecommendedDimensions,
  createDefaultZoneProperties,
  createZoneAreaMetrics,
} from '../../js/vendor/scaffolda/scaffolda.bundle';

const D = Cesium.Cartesian3.fromDegrees;
const css = (c) => Cesium.Color.fromCssColorString(c);

// ═══ 시설 비콘 아이콘 (항상 보이는 마커) — 카테고리 색 원판 + 시설명 첫 글자 ═══
const _iconCache = new Map();
function facilityIcon(color, glyph) {
  const key = color + '|' + glyph;
  if (_iconCache.has(key)) return _iconCache.get(key);
  const s = 72, c = document.createElement('canvas');
  c.width = c.height = s;
  const g = c.getContext('2d');
  // 핀 꼬리
  g.fillStyle = color; g.strokeStyle = 'rgba(0,0,0,0.55)'; g.lineWidth = 3;
  g.beginPath(); g.moveTo(s * 0.32, s * 0.62); g.lineTo(s * 0.68, s * 0.62);
  g.lineTo(s * 0.5, s * 0.96); g.closePath(); g.fill();
  // 원판
  g.beginPath(); g.arc(s / 2, s * 0.4, s * 0.32, 0, Math.PI * 2); g.fill(); g.stroke();
  // 안쪽 링
  g.strokeStyle = 'rgba(255,255,255,0.85)'; g.lineWidth = 2.5;
  g.beginPath(); g.arc(s / 2, s * 0.4, s * 0.26, 0, Math.PI * 2); g.stroke();
  // 글자
  g.fillStyle = '#fff'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = `700 ${Math.round(s * 0.3)}px "Pretendard GOV", sans-serif`;
  g.fillText(glyph, s / 2, s * 0.4);
  const url = c.toDataURL();
  _iconCache.set(key, url);
  return url;
}

export {
  PYEONG_TO_SQUARE_METERS, RECOMMENDED_AREA_PYEONG_PER_CAPACITY, DEFAULT_AREA_PER_PERSON_M2,
  lngLatToLocalMeters, localMetersToLngLat, createDefaultZoneProperties, createZoneAreaMetrics,
  findFacilityTypeById,
};

/** 원본 createRecommendedZoneDimensions 결과를 데모가 쓰던 짧은 필드명으로 옮긴다 */
export function createRecommendedZoneDimensions(capacity) {
  const d = scaffoldaRecommendedDimensions(capacity);
  return {
    areaM2: d.recommendedAreaSquareMeters,
    widthM: d.recommendedWidthMeters,
    depthM: d.recommendedDepthMeters,
    areaPyeong: d.recommendedAreaPyeong,
  };
}

// 토공·사업비 계산(computeEarthwork/computeProjectCost/fmtKrw/footprintOf,
// PROTECTION_MULTIPLIER/DIFFICULTY_LABELS)은 ./projectCost 에서 가져와 재수출만 한다
// — 그 파일 상단 주석 참고: evalReport.ts 가 이 셋만 필요한데도 Cesium 커플링된
// placement.ts 전체를 끌고 들어가 순수 함수인데 단위시험이 불가능했던 것을 분리로 해결.
export const EARTHWORK_CONFIG = DEFAULT_EARTHWORK_CONFIG;
export { PROTECTION_MULTIPLIER, DIFFICULTY_LABELS, computeEarthwork, fmtKrw, footprintOf, computeProjectCost };

// ═══ 시설 카탈로그 — Scaffolda facilityCatalog.ts 원본 19종 + GP 방호등급 오버레이 ═══
const GP_PROTECTION = {
  'command-zone': 'hardened', 'security-zone': 'hardened', 'living-zone': 'hardened',
  'storage-zone': 'hardened', 'infrastructure-zone': 'hardened',
};
const GP_COLOR = {
  'command-zone': '#5eb1ef', 'office-zone': '#5eb1ef', 'living-zone': '#3dd68c',
  'welfare-zone': '#63c9a8', 'hygiene-zone': '#7fd0e8', 'medical-zone': '#f2909a',
  'storage-zone': '#c9a86a', 'maintenance-zone': '#b18cff', 'infrastructure-zone': '#e3b341',
  'entry-zone': '#8494a6', 'security-zone': '#ed5d5d', 'education-zone': '#e8a2ff',
  'training-zone': '#c9b8ff', 'parking-zone': '#9aa7b5', 'vehicle-parking-zone': '#9aa7b5',
};
// 배치 UI에 노출하지 않는 비건축 요소
const HIDDEN_FACILITY_IDS = new Set(['road', 'fence', 'fence-boundary', 'other-zone']);

// ═══ 시설 세부 기능 (인스펙터 '기능' 드롭다운 — 카테고리별) ═══
export const FACILITY_FUNCTIONS = {
  command: ['지휘통제실', '통신실', '상황실', '작전실', '정보분석'],
  care: ['응급처치', '외래진료', '입원병동', '약제실', '방역/격리'],
  living: ['생활관', '간부숙소', '식당/취사', '샤워/세면'],
  logistics: ['탄약고', '유류고', '보급창고', '정비고', '장비고'],
  infrastructure: ['발전동', '급수/정수', '통신중계', '난방/보일러'],
  training: ['교육장', '실내사격장', '체력단련장'],
  vehicle: ['차량정비', '주차장', '유류주유'],
  entry: ['위병소', '검문소', '출입통제'],
  other: ['다목적동'],
};
// 규모 프리셋 (인원 → 면적 자동 산출) : 소대/중대/대대급
export const FACILITY_SIZE_PRESETS = [
  { key: 'sm', label: '소(소대급)', capacity: 12 },
  { key: 'md', label: '중(중대급)', capacity: 28 },
  { key: 'lg', label: '대(대대급)', capacity: 48 },
];

// ═══ 시설별 세부 제원 (시설 ID 단위) ═══
// 각 시설 고유의 기능 목록 + 도메인 속성(인스펙터에서 편집·라벨/보고서 반영).
// attr 타입: options 있으면 드롭다운(select), 없으면 range(min/max/step/unit).
//   { key, label, def, unit?, options?, min?, max?, step? }
// 속성은 서술적 제원이며 사업비(capacity/floors/방호)에는 영향을 주지 않는다.
export const FACILITY_DETAIL = {
  'command-zone': {
    functions: ['지휘통제실', '통신실', '상황실', '작전실', '정보분석실'],
    attrs: [
      { key: 'screens', label: '상황판', unit: '면', min: 1, max: 8, step: 1, def: 3 },
      { key: 'comms', label: '통신망', options: ['전술', '전술+위성', '전략지휘'], def: '전술+위성' },
      { key: 'emp', label: 'EMP 차폐', options: ['미적용', '적용'], def: '적용' },
    ],
  },
  'office-zone': {
    functions: ['대대장실', '행정실', '인사/보급실', '회의실'],
    attrs: [
      { key: 'rooms', label: '사무실', unit: '실', min: 2, max: 20, step: 1, def: 6 },
      { key: 'meeting', label: '회의실', unit: '실', min: 0, max: 4, step: 1, def: 1 },
    ],
  },
  'living-zone': {
    functions: ['병사 생활관', '간부 숙소', '독신간부 숙소'],
    attrs: [
      { key: 'beds', label: '침상', unit: '개', min: 12, max: 160, step: 4, def: 100 },
      { key: 'rank', label: '대상', options: ['병사', '간부', '독신간부'], def: '병사' },
      { key: 'heating', label: '난방', options: ['온수보일러', '전기', '지역난방'], def: '온수보일러' },
    ],
  },
  'welfare-zone': {
    functions: ['PX/매점', '사이버지식정보방', '종교시설', '이발/세탁'],
    attrs: [
      { key: 'seats', label: '좌석', unit: '석', min: 10, max: 120, step: 5, def: 40 },
    ],
  },
  'hygiene-zone': {
    functions: ['샤워장', '세탁장', '화장실동'],
    attrs: [
      { key: 'booths', label: '샤워부스', unit: '개', min: 4, max: 40, step: 2, def: 12 },
      { key: 'hotwater', label: '온수', options: ['상시', '시간제'], def: '상시' },
    ],
  },
  'education-zone': {
    functions: ['강의실', '정신교육장', '어학실'],
    attrs: [
      { key: 'seats', label: '좌석', unit: '석', min: 20, max: 200, step: 10, def: 40 },
      { key: 'av', label: 'AV 장비', options: ['기본', '스마트강의', '어학실'], def: '기본' },
    ],
  },
  'training-zone': {
    functions: ['실내사격장', '체력단련장', '각개전투장', '종합훈련장'],
    attrs: [
      { key: 'lanes', label: '사로/표적', unit: '개', min: 0, max: 25, step: 1, def: 10 },
      { key: 'distance', label: '사거리', unit: 'm', min: 25, max: 300, step: 25, def: 100 },
    ],
  },
  'storage-zone': {
    functions: ['탄약고', '유류고', '보급창고', '급식창고', '장비고'],
    attrs: [
      { key: 'capacityT', label: '저장용량', unit: '톤', min: 5, max: 500, step: 5, def: 50 },
      { key: 'hazard', label: '위험물등급', options: ['일반', '화기엄금', '폭발물'], def: '일반' },
      { key: 'climate', label: '온습도관리', options: ['자연', '항온항습'], def: '자연' },
    ],
  },
  'parking-zone': {
    functions: ['일반 주차', '전술차량 주차', '대기 공간'],
    attrs: [
      { key: 'slots', label: '수용대수', unit: '대', min: 5, max: 120, step: 5, def: 40 },
      { key: 'canopy', label: '캐노피', options: ['없음', '있음'], def: '없음' },
    ],
  },
  'vehicle-parking-zone': {
    functions: ['전술차량 주차', '장갑차량 주차', '혼합 주차'],
    attrs: [
      { key: 'slots', label: '수용대수', unit: '대', min: 5, max: 80, step: 5, def: 40 },
      { key: 'vclass', label: '차종', options: ['전술차량', '장갑차량', '혼합'], def: '전술차량' },
    ],
  },
  'maintenance-zone': {
    functions: ['차량정비고', '화기정비', '통신장비정비', '발전기정비'],
    attrs: [
      { key: 'bays', label: '정비베이', unit: '개', min: 1, max: 12, step: 1, def: 4 },
      { key: 'lift', label: '리프트/크레인', options: ['없음', '2주식리프트', '천장크레인'], def: '2주식리프트' },
    ],
  },
  'medical-zone': {
    functions: ['응급처치실', '외래진료', '입원병동', '약제실', '방역/격리실'],
    attrs: [
      { key: 'beds', label: '병상', unit: '개', min: 2, max: 40, step: 2, def: 8 },
      { key: 'surgery', label: '수술실', options: ['없음', '1실', '2실'], def: '1실' },
      { key: 'er', label: '응급 등급', options: ['응급처치', '응급실', '외상센터'], def: '응급처치' },
    ],
  },
  'entry-zone': {
    functions: ['위병소', '검문소', '방문자 통제소'],
    attrs: [
      { key: 'barrier', label: '차단기', options: ['수동', '자동바리케이드', '대형차단봉'], def: '자동바리케이드' },
      { key: 'scan', label: '차량검색', options: ['육안', '하부검색경', 'X-ray'], def: '하부검색경' },
    ],
  },
  'security-zone': {
    functions: ['초소', '관측소', '경계벙커', '5분대기조'],
    attrs: [
      { key: 'ports', label: '총안구', unit: '개', min: 0, max: 8, step: 1, def: 2 },
      { key: 'armor', label: '방호', options: ['방탄', '방호벽', '철근콘크리트'], def: '방호벽' },
    ],
  },
  'infrastructure-zone': {
    functions: ['발전동', '급수/정수', '보일러/난방', '통신중계', '정화조'],
    attrs: [
      { key: 'powerKw', label: '발전용량', unit: 'kW', min: 0, max: 1000, step: 50, def: 200 },
      { key: 'backup', label: '비상발전', options: ['없음', '자동절체'], def: '자동절체' },
      { key: 'fuel', label: '연료저장', options: ['소형', '지하탱크', '이중벽탱크'], def: '지하탱크' },
    ],
  },
};

/** 지반 경사각 → 건축 가부 판정 (인스펙터/보고서 공용). 정의는 ./siteEngineering —
 *  거기 옮긴 이유의 설명도 그 파일 상단 주석 참고. 여기서는 재수출만 한다. */
export { slopeVerdict, SLOPE_LIMITS };

/** 시설의 기능 목록 — 시설ID 우선, 없으면 카테고리, 최후엔 기타 */
export function functionsFor(spec) {
  return FACILITY_DETAIL[spec.id]?.functions
    ?? FACILITY_FUNCTIONS[spec.category]
    ?? FACILITY_FUNCTIONS.other;
}

/** 시설의 세부 속성 정의(스키마) 목록 */
export function attrsFor(specId) {
  return FACILITY_DETAIL[specId]?.attrs ?? [];
}

/** 시설 기본 세부 제원 — 각 attr의 def 로 초기화 */
export function defaultDetails(specId) {
  const out = {};
  for (const a of attrsFor(specId)) out[a.key] = a.def;
  return out;
}

/** 세부 제원 요약 문자열 (라벨/칩용) — 상위 2개 속성 */
export function detailSummary(item) {
  const defs = attrsFor(item.spec.id);
  const d = item.details ?? {};
  const parts = [];
  for (const a of defs.slice(0, 2)) {
    const v = d[a.key] ?? a.def;
    parts.push(a.unit ? `${a.label} ${v}${a.unit}` : `${v}`);
  }
  return parts.join(' · ');
}

export const FACILITY_CATALOG = SCAFFOLDA_FACILITY_CATALOG
  .filter((f) => !HIDDEN_FACILITY_IDS.has(f.id))
  .map((f) => ({
    ...f,
    // 원본 필드(defaultCapacity/defaultFloors)를 데모가 쓰던 짧은 이름으로도 노출
    capacity: f.defaultCapacity,
    floors: f.defaultFloors,
    color: GP_COLOR[f.id] ?? f.color ?? '#8494a6',
    protection: GP_PROTECTION[f.id] ?? 'none',
    desc: f.description,
  }));

// ═══ 배치 관리자 ═══
let seq = 0;

// ═══ Scaffolda validateSiteZone 상수 이식 ═══
const WALKWAY_WIDTH_METERS = 4;      // 건물 주변 보행통로 (placementEngine WALKWAY_WIDTH_METERS)
const SITE_RADIUS_M = 450;           // GP 부지 반경 (경계 폴리곤 대체)
const TOWER_CLEAR_RADIUS_M = 16;     // 감시탑 기단 여유

// ═══ 토목 판정 — 지반 경사 기반 건축 가부 (정의는 ./siteEngineering) ═══
const SLOPE_MAX_DEG = SLOPE_LIMITS.max;
const SLOPE_VERDICT = slopeVerdict;

/** 회전 사각형 SAT 겹침 검사 (두 rect의 4축 투영) */
function orientedRectsOverlap(a, b, gap) {
  const rectAxes = (r) => {
    const rad = (r.headingDeg * Math.PI) / 180;
    return [
      { x: Math.sin(rad), y: Math.cos(rad) },
      { x: Math.cos(rad), y: -Math.sin(rad) },
    ];
  };
  const corners = (r) => {
    const rad = (r.headingDeg * Math.PI) / 180;
    const c = Math.cos(rad), s = Math.sin(rad);
    const hw = r.w / 2 + gap / 2, hd = r.d / 2 + gap / 2;
    return [[-hw, -hd], [hw, -hd], [hw, hd], [-hw, hd]].map(([x, y]) => ({
      x: r.cx + x * c + y * s, y: r.cy - x * s + y * c,
    }));
  };
  const ca = corners(a), cb = corners(b);
  for (const axis of [...rectAxes(a), ...rectAxes(b)]) {
    const proj = (pts) => {
      let lo = Infinity, hi = -Infinity;
      for (const p of pts) { const v = p.x * axis.x + p.y * axis.y; lo = Math.min(lo, v); hi = Math.max(hi, v); }
      return [lo, hi];
    };
    const [a0, a1] = proj(ca), [b0, b1] = proj(cb);
    if (a1 < b0 || b1 < a0) return false; // 분리축 존재 → 비겹침
  }
  return true;
}

export class PlacementManager {
  constructor(viewer, sampleBatch) {
    this.viewer = viewer;
    this.sampleBatch = sampleBatch; // async (Cartographic[]) — height 채워 반환
    this.ds = new Cesium.CustomDataSource('placed');
    viewer.dataSources.add(this.ds);
    this.items = [];
    this.selectedUid = null;
    this.onChange = null;
    this.stacks = new Map(); // uid → BuildingStack (실물 3D 모듈 스택)
    this.gpRef = null;       // {lon, lat} — 부지 경계·타워 여유 검증 기준 (main이 주입)
    this._ripple = null;     // 경계초소 700m 커버 리플 엔티티
    this._rippleT0 = 0;
    this._ghost = null;      // 드래그 라이브 유효성 고스트
    this._boundaryEnts = []; // 부지 경계·타워 여유 시각화
    this.autoOrient = true;  // 배치 시 등고선 자동 정렬(토공 최소화) — 명시 heading 없을 때만
    this.terrain = null;     // RealTerrainModel (main 주입) — 접지·경사·향 판정
    this._suitDs = null;     // (구) 건축적지 오버레이 데이터소스
    this._suitPrim = null;   // 건축적지 오버레이 — 단일 배치 프리미티브
    this._roadDs = null;     // 내부 접근로·순환망 데이터소스
    this._roadTotalM = 0;    // 접근로 총 연장(m)
  }

  // ═══ 드래그 라이브 고스트 — 유효(초록)/차단(빨강) 풋프린트 + 사유 라벨 ═══
  showGhost(cfg, lon, lat, headingDeg = 0, ignoreUid = null) {
    const dims = createRecommendedZoneDimensions(cfg.capacity);
    const blocked = this.validatePlacement(cfg, lon, lat, headingDeg, ignoreUid);
    const color = blocked ? '#ed5d5d' : '#3dd68c';
    const hw = dims.widthM / 2, hd = dims.depthM / 2;
    const rad = (headingDeg * Math.PI) / 180;
    const c = Math.cos(rad), s = Math.sin(rad);
    const origin = { lng: lon, lat };
    const corners = [[-hw, -hd], [hw, -hd], [hw, hd], [-hw, hd], [-hw, -hd]].map(([x, y]) => {
      const ll = localMetersToLngLat(x * c + y * s, -x * s + y * c, origin);
      return [ll.lng, ll.lat];
    });
    const e = this.ds.entities;
    if (!this._ghost) {
      this._ghost = {
        fill: e.add({
          id: 'ghost-fill',
          polygon: {
            hierarchy: new Cesium.CallbackProperty(() => new Cesium.PolygonHierarchy(
              Cesium.Cartesian3.fromDegreesArray(this._ghostState.corners.flat())), false),
            material: new Cesium.ColorMaterialProperty(new Cesium.CallbackProperty(
              () => css(this._ghostState.color).withAlpha(0.22 + 0.1 * Math.sin(performance.now() / 220)), false)),
            classificationType: Cesium.ClassificationType.TERRAIN,
          },
        }),
        line: e.add({
          id: 'ghost-line',
          polyline: {
            positions: new Cesium.CallbackProperty(
              () => Cesium.Cartesian3.fromDegreesArray(this._ghostState.corners.flat()), false),
            width: 3, clampToGround: true,
            material: new Cesium.PolylineDashMaterialProperty({
              color: new Cesium.CallbackProperty(() => css(this._ghostState.color), false),
              dashLength: 10,
            }),
          },
        }),
        label: e.add({
          id: 'ghost-label',
          position: new Cesium.CallbackProperty(() => D(this._ghostState.lon, this._ghostState.lat, this._ghostState.h + 8), false),
          label: {
            text: new Cesium.CallbackProperty(() => this._ghostState.text, false),
            font: '600 12px "Pretendard GOV", sans-serif',
            fillColor: new Cesium.CallbackProperty(() => css(this._ghostState.color), false),
            showBackground: true,
            backgroundColor: css('#0b1420').withAlpha(0.85),
            backgroundPadding: new Cesium.Cartesian2(9, 5),
            pixelOffset: new Cesium.Cartesian2(0, -14),
            disableDepthTestDistance: Number.POSITIVE_INFINITY,
          },
        }),
      };
    }
    const g = this._ground(lon, lat, dims, headingDeg);
    const okText = () => {
      let t = `✓ 배치 가능 · ${dims.widthM.toFixed(0)}×${dims.depthM.toFixed(0)}m`;
      if (g) {
        const v = SLOPE_VERDICT(g.slopeDeg);
        t += ` · 경사 ${g.slopeDeg.toFixed(0)}°(${v.label})`;
        const fill = g.padTop - g.gmin;
        if (fill > 1) t += ` · 정지 ${fill.toFixed(1)}m`;
      }
      return t;
    };
    this._ghostState = {
      corners, color, lon, lat,
      h: g ? g.padTop : (this.items.find((i) => i.uid === ignoreUid)?.groundH ?? this.groundHint ?? 0),
      text: blocked ? `⛔ ${blocked}` : okText(),
    };
    return { blocked, dims };
  }

  hideGhost() {
    if (!this._ghost) return;
    const e = this.ds.entities;
    for (const ent of Object.values(this._ghost)) e.remove(ent);
    this._ghost = null;
  }

  /** 부지 경계(450m)·타워 여유(16m) 시각화 — 드래그 중 자동 표시 */
  showBoundary(show) {
    const e = this.ds.entities;
    if (!show) {
      this._boundaryEnts.forEach((x) => e.remove(x));
      this._boundaryEnts = [];
      return;
    }
    if (this._boundaryEnts.length || !this.gpRef) return;
    const origin = this.gpRef;
    const ring = (radius) => {
      const pts = [];
      for (let a = 0; a <= 360; a += 4) {
        const rad = (a * Math.PI) / 180;
        const ll = localMetersToLngLat(Math.sin(rad) * radius, Math.cos(rad) * radius, origin);
        pts.push(ll.lng, ll.lat);
      }
      return Cesium.Cartesian3.fromDegreesArray(pts);
    };
    this._boundaryEnts.push(e.add({
      id: 'site-boundary',
      polyline: {
        positions: ring(450), width: 2.5, clampToGround: true,
        material: new Cesium.PolylineDashMaterialProperty({ color: css('#f2a33c').withAlpha(0.55), dashLength: 16 }),
      },
    }));
    this._boundaryEnts.push(e.add({
      id: 'tower-clear',
      polyline: {
        positions: ring(16), width: 1.8, clampToGround: true,
        material: css('#ed5d5d').withAlpha(0.5),
      },
    }));
  }

  /**
   * Scaffolda validateSiteZone 이식 — 배치/이동 전 차단 사유 반환 (null=통과)
   * ① 다른 건물과 보행통로(4m) 침범 겹침 ② 부지 반경 이탈 ③ 감시탑 기단 침범
   */
  validatePlacement(cfg, lon, lat, headingDeg = 0, ignoreUid = null) {
    const dims = createRecommendedZoneDimensions(cfg.capacity);
    const origin = this.gpRef ?? { lng: lon, lat };
    const me = lngLatToLocalMeters(lon, lat, { lng: origin.lon ?? origin.lng, lat: origin.lat });
    if (this.gpRef) {
      if (Math.hypot(me.x, me.y) > SITE_RADIUS_M) {
        return `부지 경계(반경 ${SITE_RADIUS_M}m)를 벗어납니다.`;
      }
      const clear = TOWER_CLEAR_RADIUS_M + Math.hypot(dims.widthM, dims.depthM) / 2;
      if (Math.hypot(me.x, me.y) < clear) {
        return '감시탑 기단과 겹칩니다. 타워에서 더 떨어뜨려 주세요.';
      }
    }
    const myRect = { cx: me.x, cy: me.y, w: dims.widthM, d: dims.depthM, headingDeg };
    for (const it of this.items) {
      if (it.uid === ignoreUid) continue;
      const p = lngLatToLocalMeters(it.lon, it.lat, { lng: origin.lon ?? origin.lng, lat: origin.lat });
      const other = { cx: p.x, cy: p.y, w: it.dims.widthM, d: it.dims.depthM, headingDeg: it.headingDeg };
      if (orientedRectsOverlap(myRect, other, WALKWAY_WIDTH_METERS)) {
        return `${it.spec.name}와(과) 보행통로(4m)를 침범해 겹칩니다.`;
      }
    }
    // 토목 경사 게이트 — 풋프린트 평균경사가 정지·옹벽 한계를 넘으면 건축 불가
    const g = this._ground(lon, lat, dims, headingDeg);
    if (g && g.slopeDeg > SLOPE_MAX_DEG) {
      return `지반 경사 ${g.slopeDeg.toFixed(0)}° — 정지·옹벽 한계(${SLOPE_MAX_DEG}°) 초과, 건축 불가.`;
    }
    return null;
  }

  /** 도보 내부 진입 시 해당 건물 껍데기 숨김 (uid=null → 전체 복원) */
  setShellVisible(uid) {
    for (const [k, st] of this.stacks) st.setVisible(k !== uid);
  }

  totalKrw() { return this.items.reduce((a, b) => a + b.cost.totalKrw, 0); }

  /** 지형 일괄 샘플 → 원본 computeEarthwork
   *
   * 원본 엔진이 내부에서 어느 좌표를 조회하는지(격자 셀 중심·변 중점·안쪽 프로브)를
   * 여기서 재현하지 않는다. 대신 footprint + 프로브 여유를 덮는 조밀 격자를 미리 샘플하고
   * 쌍선형 보간 sampleGround 를 넘긴다 — 원본이 무엇을 물어보든 답할 수 있다.
   *
   * cfg: {capacity, floors, protection} — 개별 건물 오버라이드 (Scaffolda 인스펙터 방식) */
  /** 회전 풋프린트의 경위도 코너 링 [[lng,lat]...] (닫힘) — 기초/고스트 공용 */
  _footprintCorners(lon, lat, dims, headingDeg = 0) {
    const hw = dims.widthM / 2, hd = dims.depthM / 2;
    const rad = (headingDeg * Math.PI) / 180, c = Math.cos(rad), s = Math.sin(rad);
    const origin = { lng: lon, lat };
    return [[-hw, -hd], [hw, -hd], [hw, hd], [-hw, hd], [-hw, -hd]].map(([x, y]) => {
      const ll = localMetersToLngLat(x * c + y * s, -x * s + y * c, origin);
      return [ll.lng, ll.lat];
    });
  }

  /**
   * 토목 접지 해석 — 렌더되는 GLB 지형 표면을 풋프린트 9점(코너·변중점·중심) 샘플해
   * 최저/최고 지반고와 평균경사각을 구한다. 반환:
   *   padTop      정지 마감고(최고지반+여유) = 건물 바닥·기단 상단
   *   foundBottom 기단 하단(최저지반−근입) — 이 사이가 절·성토 기단(옹벽) 높이
   *   slopeDeg    풋프린트 평균경사각 (건축 가부 판정용)
   * 지형 미준비(전역모드 등)면 null → 호출부가 기존 DEM 패드로 폴백.
   */
  _ground(lon, lat, dims, headingDeg = 0) {
    const rt = this.terrain;
    if (!rt?.active || !rt.surfaceReady) return null;    // GP 정밀지형 표출 중일 때만
    const hw = dims.widthM / 2, hd = dims.depthM / 2;
    const rad = (headingDeg * Math.PI) / 180, c = Math.cos(rad), s = Math.sin(rad);
    const origin = { lng: lon, lat };
    const surfLocal = (x, y) => {                          // 로컬(동x·북y) → GLB 표면고
      const ll = localMetersToLngLat(x * c + y * s, -x * s + y * c, origin);
      return rt.surfaceHeightAt(ll.lng, ll.lat);
    };
    // ① 풋프린트 격자로 최저·최고 지반 + 성토(fill) 체적 적분 (padTop 평판 기준)
    const NX = 7, NY = 7;
    let gmin = Infinity, gmax = -Infinity, ok = false;
    const cell = (dims.widthM / (NX - 1)) * (dims.depthM / (NY - 1));
    const hs = [];
    for (let j = 0; j < NY; j++) {
      for (let i = 0; i < NX; i++) {
        const x = -hw + (dims.widthM * i) / (NX - 1);
        const y = -hd + (dims.depthM * j) / (NY - 1);
        const h = surfLocal(x, y);
        hs.push(h);
        if (Number.isFinite(h)) { ok = true; gmin = Math.min(gmin, h); gmax = Math.max(gmax, h); }
      }
    }
    if (!ok) return null;
    const padTop = gmax + 0.25;                            // 성토 평판 마감고
    let fillM3 = 0;
    for (const h of hs) if (Number.isFinite(h)) fillM3 += (padTop - h) * cell;
    const diag = Math.hypot(dims.widthM, dims.depthM) || 1;
    const slopeDeg = (Math.atan2(gmax - gmin, diag) * 180) / Math.PI;
    // ② 경사 방위 — 중심 ±dm 표면고 기울기 → 내리막(fall line) 방위각(0=북,시계+)
    const dm = 12;
    const gE = surfLocal(dm, 0) - surfLocal(-dm, 0);       // 동쪽 표고 증분
    const gN = surfLocal(0, dm) - surfLocal(0, -dm);       // 북쪽 표고 증분
    let downhillDeg = null;
    if (Number.isFinite(gE) && Number.isFinite(gN) && (Math.abs(gE) + Math.abs(gN)) > 1e-3) {
      downhillDeg = (Math.atan2(-gE, -gN) * 180) / Math.PI;
      if (downhillDeg < 0) downhillDeg += 360;
    }
    return {
      gmin, gmax, slopeDeg, padTop, foundBottom: gmin - 0.5,
      fillM3, wallMaxM: padTop - gmin, downhillDeg,
    };
  }

  /** 렌더 지형 표면의 내리막 방위(도) — 자동 정렬용. 준비 안 됐으면 null */
  downhillHeadingAt(lon, lat, dims) {
    const g = this._ground(lon, lat, dims, 0);
    return g?.downhillDeg ?? null;
  }

  /** item 을 렌더 지형에 접지 — padTop·기단하단·경사를 item 에 갱신 (지형 준비 시에만) */
  _reground(item) {
    const g = this._ground(item.lon, item.lat, item.dims, item.headingDeg);
    if (!g) return;
    item.groundH = g.padTop;
    item.foundBottom = g.foundBottom;
    item.slopeDeg = g.slopeDeg;
    item.gmin = g.gmin;
    item.gmax = g.gmax;
    item.fillM3 = g.fillM3;
    item.wallMaxM = g.wallMaxM;
  }

  async _priceAt(cfg, lon, lat) {
    const dims = createRecommendedZoneDimensions(cfg.capacity);
    const origin = { lng: lon, lat };
    const footprint = footprintOf(dims);
    const C = EARTHWORK_CONFIG;

    // 변 프로브(edgeProbeM)와 보간 여유를 포함한 샘플 영역
    const margin = C.edgeProbeM + C.gridSpacingM * 2;
    const minX = -dims.widthM / 2 - margin, maxX = dims.widthM / 2 + margin;
    const minY = -dims.depthM / 2 - margin, maxY = dims.depthM / 2 + margin;
    const step = C.gridSpacingM / 2;                   // 원본 격자보다 촘촘하게
    const nx = Math.max(2, Math.ceil((maxX - minX) / step) + 1);
    const ny = Math.max(2, Math.ceil((maxY - minY) / step) + 1);
    const cx = (maxX - minX) / (nx - 1);
    const cy = (maxY - minY) / (ny - 1);

    const cartos = [];
    for (let iy = 0; iy < ny; iy++) {
      for (let ix = 0; ix < nx; ix++) {
        const ll = localMetersToLngLat(minX + ix * cx, minY + iy * cy, origin);
        cartos.push(Cesium.Cartographic.fromDegrees(ll.lng, ll.lat));
      }
    }
    await this.sampleBatch(cartos);
    const H = cartos.map((c) => (Number.isFinite(c.height) ? c.height : NaN));

    const sampleGround = (p) => {
      const fx = (p.x - minX) / cx, fy = (p.y - minY) / cy;
      if (fx < 0 || fy < 0 || fx > nx - 1 || fy > ny - 1) return null;
      const ix = Math.min(nx - 2, Math.floor(fx)), iy = Math.min(ny - 2, Math.floor(fy));
      const tx = fx - ix, ty = fy - iy;
      const h00 = H[iy * nx + ix], h10 = H[iy * nx + ix + 1];
      const h01 = H[(iy + 1) * nx + ix], h11 = H[(iy + 1) * nx + ix + 1];
      if (!Number.isFinite(h00) || !Number.isFinite(h10)
        || !Number.isFinite(h01) || !Number.isFinite(h11)) return null;
      return (h00 * (1 - tx) + h10 * tx) * (1 - ty) + (h01 * (1 - tx) + h11 * tx) * ty;
    };

    const cost = computeEarthwork(footprint, cfg.floors, cfg.capacity, sampleGround, cfg.protection);

    // 정지고는 **풋프린트 최고 지반**으로 잡는다 (`_reground` 와 같은 규약).
    //
    // 예전에는 `cost.pad`(절·성토 균형고)를 썼다. 계산으로는 맞지만 화면에서는 틀린다 —
    // Cesium 은 계산된 절토만큼 지형을 깎아 주지 않으므로, 균형고에 놓은 바닥판은 경사지에서
    // **지형에 대각선으로 잘려 절반이 언덕 속에 묻혔다**. 주차·훈련장처럼 넓고 납작한
    // 구획에서 특히 심했다. 최고 지반에 놓으면 아무것도 묻히지 않고, 내리막 쪽에 생기는
    // 빈 공간은 `foundBottom` 까지 늘어나는 기초 플린스가 메운다 (buildingModels stemDepth).
    // 비용은 그대로 원본 computeEarthwork 결과를 쓴다 — 바뀐 것은 표시고뿐이다.
    const hw = dims.widthM / 2, hd = dims.depthM / 2;
    let gmin = Infinity, gmax = -Infinity;
    for (let iy = 0; iy < ny; iy++) {
      if (Math.abs(minY + iy * cy) > hd) continue;
      for (let ix = 0; ix < nx; ix++) {
        if (Math.abs(minX + ix * cx) > hw) continue;
        const h = H[iy * nx + ix];
        if (!Number.isFinite(h)) continue;
        if (h < gmin) gmin = h;
        if (h > gmax) gmax = h;
      }
    }
    const measured = Number.isFinite(gmin) && Number.isFinite(gmax);
    const groundH = measured ? gmax + 0.25 : (cost?.pad ?? 0);
    const diag = Math.hypot(dims.widthM, dims.depthM) || 1;
    return {
      dims, cost, groundH,
      foundBottom: measured ? gmin - 0.5 : groundH,
      gmin: measured ? gmin : null,
      gmax: measured ? gmax : null,
      slopeDeg: measured ? (Math.atan2(gmax - gmin, diag) * 180) / Math.PI : null,
    };
  }

  async place(specId, lon, lat, overrides = {}) {
    const spec = FACILITY_CATALOG.find((s) => s.id === specId);
    if (!spec) return null;
    const cfg = {
      capacity: overrides.capacity ?? spec.capacity,
      floors: overrides.floors ?? spec.floors,
      protection: overrides.protection ?? spec.protection,
    };
    // Scaffolda 검증 게이트: 차단 사유가 있으면 배치하지 않는다 (skipValidation: AI 엔진 결과)
    if (!overrides.skipValidation) {
      const blocked = this.validatePlacement(cfg, lon, lat, overrides.headingDeg ?? 0);
      if (blocked) return { blocked };
    }
    const ground = await this._priceAt(cfg, lon, lat);
    const { dims, cost } = ground;
    if (!cost) return null;
    const defFn = functionsFor(spec)[0];
    // 등고선 자동 정렬 — 명시 heading 이 없고 자동정렬이 켜져 있으면 내리막을 향하게
    // (긴 변이 등고선을 따라 → 절·성토 최소). 야외 구획(주차·훈련)은 정렬 무의미.
    let headingDeg = overrides.headingDeg ?? 0;
    if (overrides.headingDeg == null && this.autoOrient && !YARD_PLANS[spec.id]) {
      const dh = this.downhillHeadingAt(lon, lat, dims);
      if (Number.isFinite(dh)) headingDeg = Math.round(dh);
    }
    const item = {
      uid: `b${++seq}`, spec, lon, lat, dims, cost,
      headingDeg,
      groundH: ground.groundH, foundBottom: ground.foundBottom,
      slopeDeg: ground.slopeDeg, gmin: ground.gmin, gmax: ground.gmax,
      functionTag: overrides.functionTag ?? defFn,
      details: { ...defaultDetails(spec.id), ...(overrides.details ?? {}) },
      ...cfg,
    };
    this._reground(item);   // 렌더 GLB 지형에 접지 (padTop·기단·경사)
    this.items.push(item);
    this._draw(item);
    this.select(item.uid);
    this._maybeRebuildRoads();
    this.onChange?.();
    return item;
  }

  async move(uid, lon, lat) {
    const item = this.items.find((i) => i.uid === uid);
    if (!item) return;
    // Scaffolda handleUpdateZone 이식: 검증 실패 시 기존 위치 유지(revert)
    const blocked = this.validatePlacement(item, lon, lat, item.headingDeg, uid);
    if (blocked) {
      this._draw(item); // 드래그 고스트 위치 → 원위치 복원
      this.onChange?.();
      return { blocked };
    }
    const ground = await this._priceAt(item, lon, lat);
    const { dims, cost } = ground;
    if (!cost) return;
    Object.assign(item, { lon, lat, dims, cost, groundH: ground.groundH,
      foundBottom: ground.foundBottom, gmin: ground.gmin, gmax: ground.gmax,
      slopeDeg: ground.slopeDeg });
    this._reground(item);
    this._draw(item);
    this._maybeRebuildRoads();
    this.onChange?.();
    return item;
  }

  /** 저장 스냅샷에서 항목 복원 — 재산출 없이 즉시 그린다 (undo/불러오기용) */
  restoreItem(data) {
    const spec = FACILITY_CATALOG.find((s) => s.id === data.specId) ?? data.spec;
    if (!spec) return null;
    const item = {
      uid: `b${++seq}`, spec,
      lon: data.lon, lat: data.lat, groundH: data.groundH,
      dims: data.dims, cost: data.cost, headingDeg: data.headingDeg ?? 0,
      capacity: data.capacity, floors: data.floors, protection: data.protection,
      functionTag: data.functionTag,
      details: { ...defaultDetails(spec.id), ...(data.details ?? {}) },
      foundBottom: data.foundBottom ?? data.groundH,
      slopeDeg: data.slopeDeg ?? null, gmin: null, gmax: null,
    };
    this.items.push(item);
    this._reground(item);   // 현재 지형에 맞춰 접지 재계산 (지형 준비 시)
    this._draw(item);
    return item;
  }

  /** 직렬화 (SitePlan 저장·undo 스냅샷용) */
  serializeItems() {
    return this.items.map((it) => ({
      specId: it.spec.id, lon: it.lon, lat: it.lat, groundH: it.groundH,
      dims: it.dims, cost: it.cost, headingDeg: it.headingDeg,
      capacity: it.capacity, floors: it.floors, protection: it.protection,
      functionTag: it.functionTag, details: it.details,
      foundBottom: it.foundBottom, slopeDeg: it.slopeDeg,
    }));
  }

  /** 지형 하이트필드 로드 후 전 시설 재접지 (저장본 복원·지형 토글 대응) */
  regroundAll() {
    for (const it of this.items) { this._reground(it); this._draw(it); }
    this._maybeRebuildRoads();
  }

  /** 선택 시설을 등고선에 맞춰 재정렬 (긴 변이 등고선을 따르게 → 토공 최소) */
  async alignToTerrain(uid) {
    const item = this.items.find((i) => i.uid === uid);
    if (!item) return null;
    const dh = this.downhillHeadingAt(item.lon, item.lat, item.dims);
    if (!Number.isFinite(dh)) return null;
    item.headingDeg = Math.round(dh);
    this._reground(item);
    this._draw(item);
    this._maybeRebuildRoads();
    this.onChange?.();
    return item;
  }

  /**
   * 건축적지 오버레이 — GP 지형 표면을 격자로 경사분류해 지형 위에 색칠한다.
   * 초록(양호 ≤10°)·주황(정지필요 ≤20°)·빨강(건축불가 >20°). 배치 전에 벤치·안부가
   * 어디인지 한눈에 보이게 한다. on=false 면 제거.
   */
  showSuitability(on, opts = {}) {
    // 구버전 엔티티 방식 정리 + 프리미티브 제거
    if (this._suitDs) { this.viewer.dataSources.remove(this._suitDs, true); this._suitDs = null; }
    if (this._suitPrim) { this.viewer.scene.primitives.remove(this._suitPrim); this._suitPrim = null; }
    if (!on) return;
    const rt = this.terrain;
    if (!rt?.surfaceReady || !this.gpRef) return;
    const origin = { lng: this.gpRef.lon ?? this.gpRef.lng, lat: this.gpRef.lat };
    const R = opts.radiusM ?? SITE_RADIUS_M;     // 부지 반경 내만
    const step = opts.stepM ?? 16;               // 격자 간격(m) — 셀 크기
    const half = step / 2;
    // 2,478개 개별 엔티티는 프레임마다 갱신비용이 커 렉을 유발했다. 셀 전부를
    // GeometryInstance 로 만들어 **단일 Primitive(PerInstanceColorAppearance)** 로 합친다 —
    // 드로우콜 1회, 지오메트리 결합은 워커 스레드(asynchronous)에서 처리해 토글이 매끄럽다.
    // GP 격리모드는 globe.show=false 라 TERRAIN 분류 대신 표면고에 띄운 쿼드로 드레이프.
    const cache = new Map();
    const surf = (dx, dy) => {
      const k = dx + ',' + dy;
      if (cache.has(k)) return cache.get(k);
      const ll = localMetersToLngLat(dx, dy, origin);
      const h = rt.surfaceHeightAt(ll.lng, ll.lat);
      cache.set(k, h);
      return h;
    };
    const cornPos = (dx, dy, h) => {
      const ll = localMetersToLngLat(dx, dy, origin);
      return Cesium.Cartesian3.fromDegrees(ll.lng, ll.lat, h + 0.6);
    };
    const VF = Cesium.PerInstanceColorAppearance.VERTEX_FORMAT;
    const instances = [];
    for (let dx = -R; dx <= R; dx += step) {
      for (let dy = -R; dy <= R; dy += step) {
        if (Math.hypot(dx, dy) > R) continue;
        const hE = surf(dx + half, dy), hW = surf(dx - half, dy);
        const hN = surf(dx, dy + half), hS = surf(dx, dy - half);
        const h00 = surf(dx - half, dy - half), h10 = surf(dx + half, dy - half);
        const h11 = surf(dx + half, dy + half), h01 = surf(dx - half, dy + half);
        if (![hE, hW, hN, hS, h00, h10, h11, h01].every(Number.isFinite)) continue;
        const gx = (hE - hW) / step, gy = (hN - hS) / step;
        const deg = (Math.atan(Math.hypot(gx, gy)) * 180) / Math.PI;
        const v = SLOPE_VERDICT(deg);
        instances.push(new Cesium.GeometryInstance({
          geometry: new Cesium.PolygonGeometry({
            polygonHierarchy: new Cesium.PolygonHierarchy([
              cornPos(dx - half, dy - half, h00), cornPos(dx + half, dy - half, h10),
              cornPos(dx + half, dy + half, h11), cornPos(dx - half, dy + half, h01)]),
            perPositionHeight: true,
            vertexFormat: VF,
          }),
          attributes: {
            color: Cesium.ColorGeometryInstanceAttribute.fromColor(css(v.color).withAlpha(0.4)),
          },
        }));
      }
    }
    if (!instances.length) return;
    this._suitPrim = this.viewer.scene.primitives.add(new Cesium.Primitive({
      geometryInstances: instances,
      appearance: new Cesium.PerInstanceColorAppearance({ flat: true, translucent: true }),
      asynchronous: true,
    }));
  }

  suitabilityActive() { return !!this._suitPrim; }

  // ═══ 내부 접근로·순환망 (토목 종단경사 → 차량 통행 판정) ═══
  // 감시탑을 허브로 시설을 최소신장트리(MST)로 연결한다. 각 구간을 지형 표면에 드레이프하고
  // 종단경사를 재어 차량 통행 가부를 색으로 판정한다. GP 능선은 급경사가 많아 상당수 구간이
  // 도보 전용으로 나오는데, 그것이 곧 「이 GP 는 도보 접근 위주」라는 사실적 결과다.
  roadNetworkActive() { return !!this._roadDs; }

  showRoads(on) {
    if (this._roadTimer) { clearTimeout(this._roadTimer); this._roadTimer = null; }
    if (this._roadDs) { this.viewer.dataSources.remove(this._roadDs, true); this._roadDs = null; }
    this._roadTotalM = 0;
    if (!on) return;
    this._roadDs = new Cesium.CustomDataSource('site-roads');
    this.viewer.dataSources.add(this._roadDs);
    this._rebuildRoads();
  }

  /** 활성 상태에서 배치가 바뀌면 도로망을 다시 그린다 (버스트 배치는 debounce 로 1회 병합) */
  _maybeRebuildRoads() {
    if (!this._roadDs || this._roadTimer) return;
    this._roadTimer = setTimeout(() => {
      this._roadTimer = null;
      if (this._roadDs) this._rebuildRoads();
    }, 140);
  }

  /** 도로 구간 종단경사 → 통행 등급 (차량 원활/차량 급/도보 전용). 정의는 ./siteEngineering. */
  static _roadGrade(deg) { return roadGrade(deg); }

  /**
   * 접근로 그래프 계산 (그리지 않음) — 감시탑 허브+시설 Prim MST, 각 간선을 지형에
   * 드레이프해 3D연장·최대 종단경사·통행등급 산출. diagnose()·_rebuildRoads() 공용.
   * 반환 { edges:[{aIdx,bIdx,fromName,toName,toUid,pos[],lengthM,maxDeg,grade}], totalM }
   */
  _computeRoadGraph() {
    const rt = this.terrain;
    if (!rt?.surfaceReady || !this.gpRef) return { edges: [], totalM: 0 };
    const hub = { lon: this.gpRef.lon ?? this.gpRef.lng, lat: this.gpRef.lat, name: '감시탑', uid: null };
    const nodes = [hub, ...this.items.map((it) => ({ lon: it.lon, lat: it.lat, name: it.spec.name, uid: it.uid }))];
    if (nodes.length < 2) return { edges: [], totalM: 0 };
    const origin = { lng: hub.lon, lat: hub.lat };
    const P = nodes.map((n) => { const m = lngLatToLocalMeters(n.lon, n.lat, origin); return { ...n, x: m.x, y: m.y }; });
    const N = P.length;
    const inTree = new Array(N).fill(false), best = new Array(N).fill(Infinity), parent = new Array(N).fill(-1);
    best[0] = 0;
    const mst = [];
    for (let k = 0; k < N; k++) {
      let u = -1;
      for (let v = 0; v < N; v++) if (!inTree[v] && (u < 0 || best[v] < best[u])) u = v;
      if (u < 0) break;
      inTree[u] = true;
      if (parent[u] >= 0) mst.push([parent[u], u]);
      for (let v = 0; v < N; v++) {
        if (inTree[v]) continue;
        const d = Math.hypot(P[u].x - P[v].x, P[u].y - P[v].y);
        if (d < best[v]) { best[v] = d; parent[v] = u; }
      }
    }
    const edges = []; let totalM = 0;
    for (const [a, b] of mst) {
      const A = P[a], B = P[b];
      const distH = Math.hypot(A.x - B.x, A.y - B.y);
      const steps = Math.max(2, Math.ceil(distH / 8));
      const pos = []; const hs = []; let okAll = true;
      for (let s = 0; s <= steps; s++) {
        const t = s / steps;
        const lon = A.lon + (B.lon - A.lon) * t, lat = A.lat + (B.lat - A.lat) * t;
        const h = rt.surfaceHeightAt(lon, lat);
        if (!Number.isFinite(h)) { okAll = false; break; }
        hs.push(h); pos.push(D(lon, lat, h + 0.8));
      }
      if (!okAll || pos.length < 2) continue;
      let maxDeg = 0, len3d = 0;
      const segH = distH / steps;
      for (let s = 1; s < hs.length; s++) {
        const dh = Math.abs(hs[s] - hs[s - 1]);
        maxDeg = Math.max(maxDeg, (Math.atan2(dh, segH) * 180) / Math.PI);
        len3d += Math.hypot(segH, hs[s] - hs[s - 1]);
      }
      totalM += len3d;
      edges.push({
        aIdx: a, bIdx: b, fromName: A.name, toName: B.name, toUid: B.uid,
        pos, lengthM: len3d, maxDeg, grade: PlacementManager._roadGrade(maxDeg),
      });
    }
    return { edges, totalM };
  }

  _rebuildRoads() {
    const ds = this._roadDs;
    if (!ds) return;
    ds.entities.removeAll();
    const { edges, totalM } = this._computeRoadGraph();
    this._roadTotalM = totalM;
    for (const ed of edges) {
      const g = ed.grade;
      ds.entities.add({
        polyline: {
          positions: ed.pos, width: 5, arcType: Cesium.ArcType.NONE,
          material: new Cesium.PolylineOutlineMaterialProperty({
            color: css(g.color).withAlpha(0.95), outlineColor: css('#20160c').withAlpha(0.9), outlineWidth: 2,
          }),
          distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 24000),
        },
      });
      const mid = ed.pos[Math.floor(ed.pos.length / 2)];
      ds.entities.add({
        position: mid,
        label: {
          text: `${Math.round(ed.lengthM)}m · ${ed.maxDeg.toFixed(0)}° ${g.label}`,
          font: '600 10px "Pretendard GOV", sans-serif',
          fillColor: css(g.color), showBackground: true,
          backgroundColor: css('#0b1420').withAlpha(0.8),
          backgroundPadding: new Cesium.Cartesian2(5, 3),
          scaleByDistance: new Cesium.NearFarScalar(400, 1.0, 6000, 0.45),
          distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 6000),
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
        },
      });
    }
  }

  /** 접근로 총 연장(m) — 요약 패널용 */
  roadTotalM() { return this._roadTotalM ?? 0; }

  /** 인스펙터 설정 변경 후 재산출 (인원→면적, 층수→기초단가, 방호→건물비) */
  async reprice(uid, changes = {}) {
    const item = this.items.find((i) => i.uid === uid);
    if (!item) return null;
    Object.assign(item, changes);
    const ground = await this._priceAt(item, item.lon, item.lat);
    const { dims, cost } = ground;
    if (!cost) return null;
    Object.assign(item, { dims, cost, groundH: ground.groundH,
      foundBottom: ground.foundBottom, gmin: ground.gmin, gmax: ground.gmax,
      slopeDeg: ground.slopeDeg });
    this._reground(item);
    this._draw(item);
    this.onChange?.();
    return item;
  }

  /** 선택 건물 복제 (동측 폭+8m 오프셋) */
  async duplicate(uid) {
    const src = this.items.find((i) => i.uid === uid);
    if (!src) return null;
    const p = offset(src.lon, src.lat, 90, src.dims.widthM + 8);
    return this.place(src.spec.id, p.lon, p.lat, {
      capacity: src.capacity, floors: src.floors,
      protection: src.protection, headingDeg: src.headingDeg,
    });
  }

  remove(uid) {
    const idx = this.items.findIndex((i) => i.uid === uid);
    if (idx < 0) return;
    this._erase(this.items[idx]);
    this.items.splice(idx, 1);
    if (this.selectedUid === uid) this.selectedUid = null;
    this._syncGuardRipple();
    this._maybeRebuildRoads();
    this.onChange?.();
  }

  select(uid) {
    this.selectedUid = uid;
    for (const it of this.items) this._draw(it);
    this._syncGuardRipple();
    this.onChange?.();
  }

  /**
   * Scaffolda guardRipple.ts 이식 — 경계초소 선택 시 700m 커버 리플 반복 재생
   * 원본 상수: 반경 700m · 1회 2400ms · ease-out · fill α×0.12 · line α×0.8
   */
  _syncGuardRipple() {
    const e = this.ds.entities;
    const sel = this.items.find((i) => i.uid === this.selectedUid);
    const isGuard = sel && sel.spec.id === 'security-zone';
    if (!isGuard) {
      if (this._ripple) { e.remove(this._ripple); this._ripple = null; }
      return;
    }
    if (this._ripple) e.remove(this._ripple);
    const GUARD_RIPPLE_RADIUS_M = 700;
    const GUARD_RIPPLE_DURATION_MS = 2400;
    this._rippleT0 = performance.now();
    // 원본 rippleFrame: eased = 1-(1-t)², radius = eased×700, opacity = 1-t
    const frame = () => {
      const t = ((performance.now() - this._rippleT0) % GUARD_RIPPLE_DURATION_MS) / GUARD_RIPPLE_DURATION_MS;
      const eased = 1 - (1 - t) * (1 - t);
      return { radiusM: Math.max(1, eased * GUARD_RIPPLE_RADIUS_M), opacity: Math.max(0, 1 - t) };
    };
    this._ripple = e.add({
      id: 'guard-ripple',
      position: new Cesium.CallbackProperty(
        () => D(sel.lon, sel.lat, sel.groundH + 0.5), false),
      ellipse: {
        semiMajorAxis: new Cesium.CallbackProperty(() => frame().radiusM, false),
        semiMinorAxis: new Cesium.CallbackProperty(() => frame().radiusM, false),
        material: new Cesium.ColorMaterialProperty(new Cesium.CallbackProperty(
          () => css('#8494a6').withAlpha(frame().opacity * 0.12), false)),
        outline: true,
        outlineColor: new Cesium.CallbackProperty(
          () => css('#8494a6').withAlpha(frame().opacity * 0.8), false),
        height: new Cesium.CallbackProperty(() => sel.groundH + 0.5, false),
      },
    });
  }

  _erase(item) {
    for (const suf of ['-label', '-pin', '-pole', '-found']) {
      const x = this.ds.entities.getById(item.uid + suf);
      if (x) this.ds.entities.remove(x);
    }
    const st = this.stacks.get(item.uid);
    if (st) { st.destroy(); this.stacks.delete(item.uid); }
  }

  _draw(item) {
    const e = this.ds.entities;
    this._reground(item);                    // 렌더 지형에 접지 (회전·복원·지형준비 반영)
    const { spec, dims } = item;
    const wallH = (item.floors ?? spec.floors) * 3.2;
    const sel = this.selectedUid === item.uid;
    // 실물 3D 모듈 스택 (Blender 제작 GLB) — 재적재 최소화, 행렬/실루엣 갱신
    let st = this.stacks.get(item.uid);
    if (!st) { st = new BuildingStack(this.viewer.scene); this.stacks.set(item.uid, st); }
    st.update(item, sel);
    // 기초 플린스(옹벽)는 이제 buildingModels 의 fac_stem.glb(실물 콘크리트)가 그린다.
    // 예전의 사각 폴리곤 기단은 중복이라 제거 — 남아 있던 엔티티가 있으면 지운다.
    const found = e.getById(item.uid + '-found');
    if (found) e.remove(found);

    // ── 항상 보이는 비콘: 수직 폴 + 카테고리 아이콘 + 라벨 ──
    // 작은 시설(의료·지휘 등)이 5km 조망에서 픽셀로 사라지는 문제 해결.
    const color = spec.color || '#8494a6';
    const glyph = (spec.name || '?').trim().charAt(0);
    const markH = item.groundH + wallH + 22;    // 지면 위 마커 높이(건물보다 확실히 위)
    const fn = item.functionTag ? ` · ${item.functionTag}` : '';

    const pole = e.getById(item.uid + '-pole');
    if (pole) e.remove(pole);
    e.add({
      id: item.uid + '-pole',
      polyline: {
        positions: [D(item.lon, item.lat, item.groundH + wallH * 0.5), D(item.lon, item.lat, markH)],
        width: sel ? 3 : 2,
        material: css(color).withAlpha(0.9),
        arcType: Cesium.ArcType.NONE,
        distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 40000),
      },
    });

    const pin = e.getById(item.uid + '-pin');
    if (pin) e.remove(pin);
    e.add({
      id: item.uid + '-pin',
      position: D(item.lon, item.lat, markH),
      billboard: {
        image: facilityIcon(color, glyph),
        verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
        scale: sel ? 0.62 : 0.5,
        scaleByDistance: new Cesium.NearFarScalar(600, 1.0, 14000, 0.5),
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
        distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 40000),
      },
    });

    const lbl = e.getById(item.uid + '-label');
    if (lbl) e.remove(lbl);
    e.add({
      id: item.uid + '-label',
      position: D(item.lon, item.lat, markH),
      label: {
        text: (() => {
          const ds = detailSummary(item);
          return `${spec.name}${fn}\n${item.dims.widthM}×${item.dims.depthM}m·${item.floors}층·${item.capacity}명`
            + (ds ? `\n${ds}` : '');
        })(),
        font: '600 11px "Pretendard GOV", sans-serif',
        pixelOffset: new Cesium.Cartesian2(0, 20),
        fillColor: sel ? css('#f2a33c') : Cesium.Color.WHITE,
        showBackground: true,
        backgroundColor: css('#0b1420').withAlpha(0.8),
        backgroundPadding: new Cesium.Cartesian2(7, 4),
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
        scaleByDistance: new Cesium.NearFarScalar(800, 1.0, 16000, 0.5),
        distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 20000),
      },
    });
  }
}

