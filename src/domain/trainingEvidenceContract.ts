/**
 * Versioned, privacy-preserving training evidence contract.
 *
 * The demo uses synthetic KCTC/Warrior Platform records.  The contract keeps
 * only aggregated, repeatable patterns suitable for facility planning; it does
 * not contain individual identities or raw person-level tracks.
 */
export const TRAINING_EVIDENCE_SCHEMA = 'gp-digital-twin.training-evidence';
export const TRAINING_EVIDENCE_VERSION = 1;

export type TrainingEvidenceLayerId = 'loss' | 'assembly' | 'delay' | 'comms';
export type FacilityCapabilityId =
  | 'medical-response'
  | 'protected-staging'
  | 'communications'
  | 'resupply-recovery'
  | 'observation';

export type TrainingEvidenceSource = {
  id: string;
  label: string;
  status: 'synthetic' | 'verified' | 'estimated' | 'unavailable';
  capturedAt: string | null;
  aggregation: string;
};

export type TrainingCandidate = {
  id: string;
  label: string;
  lon: number;
  lat: number;
  fit: number;
  terrainFit: number;
  accessFit: number;
  costBand: 'low' | 'medium' | 'high';
  note: string;
};

export type FacilityNeed = {
  id: string;
  capabilityId: FacilityCapabilityId;
  label: string;
  facilityTypeId: string;
  priority: number;
  confidence: number;
  reason: string;
  expectedEffect: string;
  candidates: TrainingCandidate[];
};

/**
 * An aggregated, repeated movement corridor — "how much this stretch of
 * ground got walked", not who walked it. Traversals/sessions are summed
 * across the whole training population, the same privacy posture as the
 * hotspot grid above (no per-person track, no timestamps).
 */
export type MovementSegment = {
  id: string;
  label: string;
  waypoints: { lon: number; lat: number }[];
  traversals: number;
  sessions: number;
};

export type EvidenceHotspot = {
  id: string;
  label: string;
  lon: number;
  lat: number;
  radiusM: number;
  recurrence: { sessions: number; total: number };
  trainingLossRate: number;
  maxAssembly: number;
  dwellP90Sec: number;
  responseP90Sec: number;
  commsGapSec: number;
  terrainExposurePercent: number;
  confidence: number;
  evidence: string[];
  facilityNeeds: FacilityNeed[];
};

export type TrainingEvidenceDataset = {
  schema: typeof TRAINING_EVIDENCE_SCHEMA;
  version: typeof TRAINING_EVIDENCE_VERSION;
  datasetId: string;
  name: string;
  synthetic: boolean;
  sessions: number;
  participants: number;
  positionRecordCount: number;
  gridSizeM: number;
  source: TrainingEvidenceSource;
  eventCounts: {
    trainingCasualty: number;
    concentration: number;
    communicationLoss: number;
    evacuation: number;
    resupplyDelay: number;
  };
  hotspots: EvidenceHotspot[];
  movementSegments: MovementSegment[];
};

export type TrainingEvidenceValidation = { ok: boolean; errors: string[] };

const now = new Date().toISOString();

const candidate = (
  id: string,
  label: string,
  lon: number,
  lat: number,
  fit: number,
  terrainFit: number,
  accessFit: number,
  costBand: TrainingCandidate['costBand'],
  note: string,
): TrainingCandidate => ({ id, label, lon, lat, fit, terrainFit, accessFit, costBand, note });

const wp = (lon: number, lat: number) => ({ lon, lat });

/**
 * Synthetic "desire path" corridors for the same 12-session mock dataset:
 * a base perimeter patrol (walked every session) plus the approach corridors
 * feeding each hotspot above and the ridge/valley links between them.
 */
const DEFAULT_MOVEMENT_SEGMENTS: MovementSegment[] = [
  {
    id: 'M-loop', label: 'GP 기지 순찰로', traversals: 58, sessions: 12,
    waypoints: [
      wp(128.1250, 38.3280), wp(128.1275, 38.3265), wp(128.1285, 38.3230),
      wp(128.1255, 38.3200), wp(128.1225, 38.3230), wp(128.1235, 38.3265),
      wp(128.1250, 38.3280),
    ],
  },
  {
    id: 'M-gp-H-07', label: 'GP → H-07 동측 접근로', traversals: 46, sessions: 8,
    waypoints: [wp(128.1250, 38.3280), wp(128.1280, 38.3310), wp(128.1322, 38.3341)],
  },
  {
    id: 'M-gp-H-03', label: 'GP → H-03 북측 능선 접근로', traversals: 27, sessions: 6,
    waypoints: [wp(128.1250, 38.3280), wp(128.1245, 38.3350), wp(128.1235, 38.3410), wp(128.1241, 38.3452)],
  },
  {
    id: 'M-gp-H-11', label: 'GP → H-11 서측 계곡 접근로', traversals: 19, sessions: 5,
    waypoints: [wp(128.1250, 38.3280), wp(128.1200, 38.3295), wp(128.1160, 38.3320), wp(128.1135, 38.3348)],
  },
  {
    id: 'M-H-07-H-03', label: 'H-07 ↔ H-03 능선 연결로', traversals: 14, sessions: 4,
    waypoints: [wp(128.1322, 38.3341), wp(128.1290, 38.3385), wp(128.1260, 38.3420), wp(128.1241, 38.3452)],
  },
  {
    id: 'M-H-03-H-11', label: 'H-03 ↔ H-11 계곡 연결로', traversals: 7, sessions: 2,
    waypoints: [wp(128.1241, 38.3452), wp(128.1190, 38.3400), wp(128.1135, 38.3348)],
  },
  // Short unnamed spurs off the trunk corridors — a real desire-path network
  // is never just clean lines between named points; these give the density
  // field the branching texture that comes from people fanning out near a
  // hotspot instead of walking a single perfect track.
  {
    id: 'M-H-07-spur-a', label: 'H-07 관측 스퍼', traversals: 11, sessions: 4,
    waypoints: [wp(128.1310, 38.3325), wp(128.1322, 38.3341), wp(128.1332, 38.3352)],
  },
  {
    id: 'M-H-03-spur-a', label: 'H-03 능선 정찰 스퍼', traversals: 8, sessions: 3,
    waypoints: [wp(128.1220, 38.3438), wp(128.1241, 38.3452), wp(128.1258, 38.3465)],
  },
  {
    id: 'M-H-11-spur-a', label: 'H-11 계곡 하류 스퍼', traversals: 6, sessions: 2,
    waypoints: [wp(128.1135, 38.3348), wp(128.1118, 38.3330), wp(128.1108, 38.3312)],
  },
  {
    id: 'M-loop-spur-a', label: 'GP 남측 관측로', traversals: 17, sessions: 6,
    waypoints: [wp(128.1255, 38.3200), wp(128.1262, 38.3175), wp(128.1268, 38.3150)],
  },
];

/** A deliberately fictional dataset for demonstrations and browser smoke tests. */
export const DEFAULT_TRAINING_EVIDENCE: TrainingEvidenceDataset = {
  schema: TRAINING_EVIDENCE_SCHEMA,
  version: TRAINING_EVIDENCE_VERSION,
  datasetId: 'kctc-mock-mountain-defense-v1',
  name: '산악방어 반복훈련 · 12회 목업',
  synthetic: true,
  sessions: 12,
  participants: 96,
  positionRecordCount: 86420,
  gridSizeM: 50,
  source: {
    id: 'kctc-warrior-mock',
    label: 'KCTC 훈련기록 + Warrior Platform (합성)',
    status: 'synthetic',
    capturedAt: now,
    aggregation: '50m 격자 · 개인식별자 제거 · 3회 이상 반복 패턴만 표출',
  },
  eventCounts: {
    trainingCasualty: 143,
    concentration: 38,
    communicationLoss: 21,
    evacuation: 37,
    resupplyDelay: 19,
  },
  movementSegments: DEFAULT_MOVEMENT_SEGMENTS,
  hotspots: [
    {
      id: 'H-07',
      label: '동측 사면 · 집결·후송 병목',
      lon: 128.1322,
      lat: 38.3341,
      radiusM: 125,
      recurrence: { sessions: 8, total: 12 },
      trainingLossRate: 5.8,
      maxAssembly: 18,
      dwellP90Sec: 402,
      responseP90Sec: 680,
      commsGapSec: 424,
      terrainExposurePercent: 78,
      confidence: 84,
      evidence: [
        '12회 중 8회 동일 격자에서 훈련손실 패턴 반복',
        '집결 지속시간 P90 6분 42초 · 최대 18명',
        '응급 대응·후송 시간 P90 11분 20초',
      ],
      facilityNeeds: [
        {
          id: 'H-07-medical',
          capabilityId: 'medical-response',
          label: '응급처치·후송 연결',
          facilityTypeId: 'medical-zone',
          priority: 91,
          confidence: 86,
          reason: '훈련손실 반복과 후송 P90 11분 20초가 함께 관측됨',
          expectedEffect: '후송 대기시간과 초기 대응 공백을 줄이는 기능',
          candidates: [
            candidate('H-07-med-a', 'A · 접근 우선', 128.1271, 38.3304, 92, 86, 96, 'medium', '후방 접근회랑과 연결'),
            candidate('H-07-med-b', 'B · 지형 균형', 128.1283, 38.3312, 88, 94, 84, 'low', '평탄한 후보지'),
            candidate('H-07-med-c', 'C · 분산형', 128.1262, 38.3297, 80, 78, 88, 'low', '기존 생활동과 분리'),
          ],
        },
        {
          id: 'H-07-stage',
          capabilityId: 'protected-staging',
          label: '분산 대기·방호',
          facilityTypeId: 'security-zone',
          priority: 86,
          confidence: 82,
          reason: '노출도 78% 구역에 최대 18명이 반복 집결',
          expectedEffect: '집결 집중과 노출 시간을 낮추는 대기 기능',
          candidates: [
            candidate('H-07-stage-a', 'A · 방호 우선', 128.1266, 38.3302, 90, 82, 84, 'high', '후방 분산 배치'),
            candidate('H-07-stage-b', 'B · 비용 균형', 128.1279, 38.3294, 83, 91, 80, 'medium', '기존 동선과 연결'),
            candidate('H-07-stage-c', 'C · 최소 개량', 128.1293, 38.3305, 76, 88, 72, 'low', '기존 구역 일부 재사용'),
          ],
        },
        {
          id: 'H-07-comms',
          capabilityId: 'communications',
          label: '통신·비상전력',
          facilityTypeId: 'infrastructure-zone',
          priority: 72,
          confidence: 78,
          reason: '동일 구역 통신 단절이 평균 7분 04초 반복',
          expectedEffect: '훈련 중 지휘·보고 연결의 연속성 보강',
          candidates: [
            candidate('H-07-comms-a', 'A · 연결 우선', 128.1268, 38.3311, 81, 88, 90, 'medium', '지휘동 인접'),
            candidate('H-07-comms-b', 'B · 지형 우선', 128.1287, 38.3318, 78, 96, 76, 'medium', '고도 확보'),
            candidate('H-07-comms-c', 'C · 모듈형', 128.1276, 38.3300, 74, 84, 86, 'low', '기반시설 모듈'),
          ],
        },
      ],
    },
    {
      id: 'H-03',
      label: '북측 능선 · 탐지·통신 공백',
      lon: 128.1241,
      lat: 38.3452,
      radiusM: 105,
      recurrence: { sessions: 6, total: 12 },
      trainingLossRate: 3.1,
      maxAssembly: 9,
      dwellP90Sec: 284,
      responseP90Sec: 510,
      commsGapSec: 690,
      terrainExposurePercent: 61,
      confidence: 76,
      evidence: ['12회 중 6회 통신 공백 반복', '능선 뒤쪽 탐지 지연 패턴', '후속 보고 지연 P90 8분 30초'],
      facilityNeeds: [
        {
          id: 'H-03-comms', capabilityId: 'communications', label: '통신 중계', facilityTypeId: 'infrastructure-zone',
          priority: 83, confidence: 79, reason: '통신 단절 11분 30초가 반복됨', expectedEffect: '지휘·보고 연결의 연속성 보강',
          candidates: [candidate('H-03-comms-a', 'A · 능선 확보', 128.1260, 38.3318, 89, 96, 62, 'high', '고도 우선 후보'), candidate('H-03-comms-b', 'B · 접근 균형', 128.1268, 38.3308, 80, 84, 85, 'medium', '기존 동선 연결')],
        },
        {
          id: 'H-03-observation', capabilityId: 'observation', label: '관측 보강', facilityTypeId: 'security-zone',
          priority: 68, confidence: 71, reason: '탐지 지연과 지형 차폐가 중첩됨', expectedEffect: '관측 공백을 줄이는 전방 관측 기능',
          candidates: [candidate('H-03-obs-a', 'A · 관측 우선', 128.1264, 38.3314, 86, 93, 65, 'high', '능선 전면 후보')],
        },
      ],
    },
    {
      id: 'H-11',
      label: '서측 계곡 · 보급·장비 회수 지연',
      lon: 128.1135,
      lat: 38.3348,
      radiusM: 115,
      recurrence: { sessions: 5, total: 12 },
      trainingLossRate: 2.2,
      maxAssembly: 12,
      dwellP90Sec: 510,
      responseP90Sec: 430,
      commsGapSec: 260,
      terrainExposurePercent: 44,
      confidence: 69,
      evidence: ['12회 중 5회 동일 보급 지연', '장비 회수 평균 9분 10초', '계곡 도로 접근성 저하'],
      facilityNeeds: [
        {
          id: 'H-11-resupply', capabilityId: 'resupply-recovery', label: '보급·장비 회수', facilityTypeId: 'maintenance-zone',
          priority: 74, confidence: 73, reason: '보급 지연과 장비 회수 지연이 반복됨', expectedEffect: '마지막 구간 보급·정비 대기시간 단축',
          candidates: [candidate('H-11-resupply-a', 'A · 접근 우선', 128.1270, 38.3290, 87, 74, 92, 'medium', '후방 허브 연결'), candidate('H-11-resupply-b', 'B · 분산형', 128.1288, 38.3288, 79, 82, 78, 'low', '모듈형 창고 후보')],
        },
      ],
    },
  ],
};

function record(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function numberOr(value: unknown, fallback: number): number {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

/** Normalize imported/mock data while retaining forward-compatible fields. */
export function normalizeTrainingEvidence(input: unknown): TrainingEvidenceDataset {
  const source = record(input) ?? {};
  const fallback = DEFAULT_TRAINING_EVIDENCE;
  return {
    ...fallback,
    ...source,
    schema: TRAINING_EVIDENCE_SCHEMA,
    version: TRAINING_EVIDENCE_VERSION,
    datasetId: String(source.datasetId ?? fallback.datasetId),
    name: String(source.name ?? fallback.name),
    synthetic: source.synthetic !== false,
    sessions: Math.max(1, Math.round(numberOr(source.sessions, fallback.sessions))),
    participants: Math.max(0, Math.round(numberOr(source.participants, fallback.participants))),
    positionRecordCount: Math.max(0, Math.round(numberOr(source.positionRecordCount, fallback.positionRecordCount))),
    gridSizeM: Math.max(1, numberOr(source.gridSizeM, fallback.gridSizeM)),
    source: { ...fallback.source, ...(record(source.source) ?? {}) },
    eventCounts: { ...fallback.eventCounts, ...(record(source.eventCounts) ?? {}) },
    hotspots: Array.isArray(source.hotspots) && source.hotspots.length ? source.hotspots as EvidenceHotspot[] : fallback.hotspots,
    movementSegments: Array.isArray(source.movementSegments) && source.movementSegments.length
      ? source.movementSegments as MovementSegment[]
      : fallback.movementSegments,
  } as TrainingEvidenceDataset;
}

/** Validate an imported dataset before it is allowed to replace the active feed. */
export function validateTrainingEvidence(input: unknown): TrainingEvidenceValidation {
  const source = record(input);
  if (!source) return { ok: false, errors: ['training evidence must be an object'] };
  const errors: string[] = [];
  if (source.schema !== TRAINING_EVIDENCE_SCHEMA) errors.push(`schema must be ${TRAINING_EVIDENCE_SCHEMA}`);
  if (source.version !== TRAINING_EVIDENCE_VERSION) errors.push(`version must be ${TRAINING_EVIDENCE_VERSION}`);
  if (!String(source.datasetId ?? '').trim()) errors.push('datasetId is required');
  if (!String(source.name ?? '').trim()) errors.push('name is required');
  if (!record(source.source)) errors.push('source is required');
  if (!Number.isFinite(Number(source.sessions)) || Number(source.sessions) < 1) errors.push('sessions must be positive');
  if (!Number.isFinite(Number(source.gridSizeM)) || Number(source.gridSizeM) < 1) errors.push('gridSizeM must be positive');
  const rawHotspots = source.hotspots;
  if (!Array.isArray(rawHotspots) || !rawHotspots.length) {
    errors.push('at least one hotspot is required');
  } else {
    rawHotspots.forEach((rawHotspot, index) => {
      const hotspot = record(rawHotspot);
      if (!hotspot) {
        errors.push(`hotspots[${index}] must be an object`);
        return;
      }
      if (!String(hotspot.id ?? '').trim()) errors.push(`hotspots[${index}].id is required`);
      if (!Number.isFinite(Number(hotspot.lon)) || Number(hotspot.lon) < -180 || Number(hotspot.lon) > 180) {
        errors.push(`hotspots[${index}].lon must be between -180 and 180`);
      }
      if (!Number.isFinite(Number(hotspot.lat)) || Number(hotspot.lat) < -90 || Number(hotspot.lat) > 90) {
        errors.push(`hotspots[${index}].lat must be between -90 and 90`);
      }
      if (!Array.isArray(hotspot.facilityNeeds) || !hotspot.facilityNeeds.length) {
        errors.push(`hotspots[${index}].facilityNeeds must not be empty`);
      } else {
        hotspot.facilityNeeds.forEach((rawNeed, needIndex) => {
          const need = record(rawNeed);
          if (!need) {
            errors.push(`hotspots[${index}].facilityNeeds[${needIndex}] must be an object`);
            return;
          }
          if (!String(need.id ?? '').trim()) errors.push(`hotspots[${index}].facilityNeeds[${needIndex}].id is required`);
          if (!String(need.facilityTypeId ?? '').trim()) {
            errors.push(`hotspots[${index}].facilityNeeds[${needIndex}].facilityTypeId is required`);
          }
          if (!Array.isArray(need.candidates) || !need.candidates.length) {
            errors.push(`hotspots[${index}].facilityNeeds[${needIndex}].candidates must not be empty`);
          } else {
            need.candidates.forEach((rawCandidate, candidateIndex) => {
              const candidate = record(rawCandidate);
              if (!candidate) {
                errors.push(`hotspots[${index}].facilityNeeds[${needIndex}].candidates[${candidateIndex}] must be an object`);
                return;
              }
              if (!String(candidate.id ?? '').trim()) {
                errors.push(`hotspots[${index}].facilityNeeds[${needIndex}].candidates[${candidateIndex}].id is required`);
              }
              if (!Number.isFinite(Number(candidate.lon)) || Number(candidate.lon) < -180 || Number(candidate.lon) > 180) {
                errors.push(`hotspots[${index}].facilityNeeds[${needIndex}].candidates[${candidateIndex}].lon is invalid`);
              }
              if (!Number.isFinite(Number(candidate.lat)) || Number(candidate.lat) < -90 || Number(candidate.lat) > 90) {
                errors.push(`hotspots[${index}].facilityNeeds[${needIndex}].candidates[${candidateIndex}].lat is invalid`);
              }
            });
          }
        });
      }
    });
  }
  return { ok: errors.length === 0, errors };
}

/** Stable digest for plan/replay correlation. */
export function trainingEvidenceFingerprint(input: unknown): string {
  const dataset = normalizeTrainingEvidence(input);
  const text = JSON.stringify({
    schema: dataset.schema,
    version: dataset.version,
    datasetId: dataset.datasetId,
    sessions: dataset.sessions,
    gridSizeM: dataset.gridSizeM,
    hotspots: dataset.hotspots.map((hotspot) => ({
      id: hotspot.id,
      recurrence: hotspot.recurrence,
      trainingLossRate: hotspot.trainingLossRate,
      maxAssembly: hotspot.maxAssembly,
      responseP90Sec: hotspot.responseP90Sec,
      commsGapSec: hotspot.commsGapSec,
      facilityNeeds: hotspot.facilityNeeds.map((need) => ({ id: need.id, priority: need.priority, facilityTypeId: need.facilityTypeId })),
    })),
    movementSegments: dataset.movementSegments.map((segment) => ({
      id: segment.id, traversals: segment.traversals, sessions: segment.sessions,
    })),
  });
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}
