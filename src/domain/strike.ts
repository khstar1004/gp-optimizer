/**
 * 정밀타격 효과 모델 — 「반경을 그린다」가 아니라 「그 반경이 어디서 나왔는가」
 *
 * 이전 피해 시각화는 미리 지정해 둔 건물 상태를 재생하는 **연출**이었다. 별도의
 * 좌표계에 가짜 단지를 세워 두고, 원은 장식이었고, 무기 제원은 아예 없었다.
 * 그래서 화면을 보고 배치를 고칠 수가 없었다 — 「A2 가 붕괴한다」는 사실은
 * 시나리오 파일에 그렇게 적혀 있기 때문이지 그 자리에 있기 때문이 아니었다.
 *
 * 이 파일은 그 관계를 뒤집는다. 입력은 **탄두 순폭약량(NEW)** 하나이고, 나머지는
 * 전부 거기서 계산된다. 그러면 「탄종을 바꾸면 반경이 왜 저만큼 변하는가」와
 * 「이 시설이 왜 중파인가」에 같은 근거로 답할 수 있다.
 *
 * 모델 (전부 공개 문헌 · 비분류)
 * ──────────────────────────────
 * 입방근 법칙  같은 폭약이면 거리는 W^(1/3) 에 비례한다. 환산거리 Z = R / W^(1/3).
 * Brode(1955)  Z → 최대 정면과압. 근거리(>10 bar)와 원거리 가지를 나눠 쓴다.
 * 피해 임계     구조물 손상 등급별 과압 문턱 (완파 70 / 중파 34 / 경파 17 /
 *              유리·경상 3.4 kPa) — 폭발피해 평가에서 통용되는 공개 기준값.
 * 지표반사      지표폭발은 반구로 퍼지므로 자유공중 대비 유효 폭약량이 커진다.
 * 파편          케이싱 파편 위험반경은 탄체질량 입방근에 비례한다고 보고, 계수는
 *              이 저장소가 이미 들고 있는 KAIROS CDE 표(사거리별 탄종 안전거리)에
 *              맞춰 잡았다 — 같은 표를 화면 아래 부수피해 검증이 다시 쓴다.
 *
 * 무엇을 하지 않는가
 * ──────────────────
 * 사상자·금전손실·구조해석을 하지 않는다. 지형 차폐·건물 차폐에 의한 과압 감쇠를
 * 모델하지 않는다(개활 자유장 가정이라 **보수적으로 크게** 나온다). 실제 무장의
 * 분류 제원을 쓰지 않는다 — 아래 값은 전부 공개출처 근사이며 데모용이다.
 */

// ───────────────────────── 무장 카탈로그 ─────────────────────────

export type MunitionClass = '대전차유도탄' | '다목적유도탄' | '유도포탄' | '유도로켓'
  | '활공유도폭탄' | '레이저유도폭탄' | '관통유도폭탄' | '전술지대지유도탄';

export interface Munition {
  id: string;
  /** 화면 표기명 — 실제 제식명이 아니라 「그 급(級)」을 가리킨다. */
  name: string;
  short: string;
  cls: MunitionClass;
  /** 탄두 순폭약량 (TNT 환산 kg). 이 하나가 모든 반경의 입력이다. */
  newKg: number;
  /** 탄체 전체 질량 (kg) — 파편 위험반경의 입력. */
  bodyKg: number;
  /** 대표 사거리 (km) — 사격부대 가용 판정 표시용. */
  rangeKm: number;
  /** 원형공산오차 (m) — 탄착 산포 표시. */
  cepM: number;
  /** 종말속도 (m/s) — 종말유도 구간 비행시간을 정한다. */
  terminalMps: number;
  /** 종말 진입각 (도, 수평 기준 하강각). */
  dipDeg: number;
  /** 재장전·재조준 간격 (초) — 연속사격 시 탄착 사이의 시간이다. */
  reloadS: number;
  /** 관통탄두 — 지연신관에서 방호시설 이점을 무력화한다. */
  penetrator: boolean;
  /** 3D 형상 (assets/models/mun_*.glb) 과 실척 길이(m). */
  model: string;
  bodyLenM: number;
  note: string;
}

export const MUNITIONS: readonly Munition[] = [
  {
    id: 'atgm', name: '대전차유도탄 (현궁급)', short: 'ATGM', cls: '대전차유도탄',
    newKg: 3, bodyKg: 13, rangeKm: 2.5, cepM: 0.6, terminalMps: 190, dipDeg: 14,
    reloadS: 12, penetrator: true, model: 'assets/models/mun_atgm.glb', bodyLenM: 1.55,
    note: '개별 표적 한 점을 지운다. 인접 건물에는 유리 파손 정도만 남는다.',
  },
  {
    id: 'nlos', name: '비가시선 다목적유도탄 (NLOS급)', short: 'NLOS', cls: '다목적유도탄',
    newKg: 6, bodyKg: 71, rangeKm: 25, cepM: 1.5, terminalMps: 180, dipDeg: 32,
    reloadS: 20, penetrator: false, model: 'assets/models/mun_atgm.glb', bodyLenM: 1.75,
    note: '능선 너머에서 쏘고 종말에 내려꽂는다. 표적 한 동을 넘지 않는 규모.',
  },
  {
    id: 'pgm155', name: '155mm 정밀유도포탄', short: 'PGM', cls: '유도포탄',
    newKg: 9, bodyKg: 48, rangeKm: 40, cepM: 4, terminalMps: 260, dipDeg: 62,
    reloadS: 14, penetrator: false, model: 'assets/models/mun_shell.glb', bodyLenM: 0.99,
    note: '포병 자산으로 낼 수 있는 가장 작은 정밀타격. 파편 위험이 과압보다 넓다.',
  },
  {
    id: 'sdb', name: '소구경 정밀폭탄 (SDB급)', short: 'SDB', cls: '활공유도폭탄',
    newKg: 16, bodyKg: 130, rangeKm: 90, cepM: 3, terminalMps: 300, dipDeg: 55,
    reloadS: 6, penetrator: false, model: 'assets/models/mun_sdb.glb', bodyLenM: 1.80,
    note: '날개를 펴고 활공한다. 부수피해를 줄이려고 탄두를 일부러 작게 만든 계열.',
  },
  {
    id: 'gmlrs', name: '유도다연장로켓 (천무/GMLRS급)', short: 'GMLRS', cls: '유도로켓',
    newKg: 23, bodyKg: 90, rangeKm: 80, cepM: 5, terminalMps: 350, dipDeg: 70,
    reloadS: 5, penetrator: false, model: 'assets/models/mun_rocket.glb', bodyLenM: 3.90,
    note: '한 발로 한 동. 연속사격을 전제한 무장이라 재타격 간격이 짧다.',
  },
  {
    id: 'lgb500', name: '500lb 레이저유도폭탄 (GBU-12급)', short: 'LGB', cls: '레이저유도폭탄',
    newKg: 87, bodyKg: 227, rangeKm: 12, cepM: 3, terminalMps: 280, dipDeg: 58,
    reloadS: 22, penetrator: false, model: 'assets/models/mun_lgb.glb', bodyLenM: 3.33,
    note: '이 카탈로그에서 처음으로 인접 동까지 중파가 번지는 규모.',
  },
  {
    id: 'pen1000', name: '관통 유도폭탄 (벙커버스터급)', short: 'PEN', cls: '관통유도폭탄',
    newKg: 130, bodyKg: 430, rangeKm: 15, cepM: 3, terminalMps: 330, dipDeg: 72,
    reloadS: 26, penetrator: true, model: 'assets/models/mun_pen.glb', bodyLenM: 3.85,
    note: '지연신관으로 파고든 뒤 터진다. 지표 과압은 줄고 지중 파괴와 탄공이 커진다.',
  },
  {
    id: 'tbm', name: '전술지대지유도탄 (KTSSM급)', short: 'TBM', cls: '전술지대지유도탄',
    newKg: 200, bodyKg: 1000, rangeKm: 180, cepM: 8, terminalMps: 600, dipDeg: 80,
    reloadS: 90, penetrator: true, model: 'assets/models/mun_tbm.glb', bodyLenM: 3.90,
    note: '이 데모의 최대 규모. 그래도 전술 재래식이며 광역 파괴 무기가 아니다.',
  },
];

export function munitionById(id: unknown): Munition {
  return MUNITIONS.find((m) => m.id === id) ?? MUNITIONS[3]!;
}

// ───────────────────────── 신관 ─────────────────────────

export type FuzeId = 'impact' | 'delay' | 'airburst';

export interface Fuze {
  id: FuzeId;
  name: string;
  detail: string;
  /** 지표에 결합되는 유효 폭약량 배율 (지표반사 포함). */
  coupling: number;
  /** 탄공 반경 배율. 0 이면 탄공이 생기지 않는다. */
  crater: number;
  /** 파편 위험반경 배율. */
  frag: number;
  /** 등급별 반경 배율 — 공중폭발은 낮은 과압대를 넓히고 높은 과압대를 좁힌다. */
  ring: { complete: number; severe: number; moderate: number; light: number };
  /** 폭심 고도 (지표 위 m). 공중폭발만 0 이 아니다. */
  burstAglM: number;
}

export const FUZES: readonly Fuze[] = [
  {
    id: 'impact', name: '순발신관 (지표폭발)',
    detail: '표면에서 즉시 기폭한다. 반구로 퍼지므로 자유공중보다 유효 폭약량이 커진다.',
    coupling: 1.8, crater: 1.0, frag: 1.0,
    ring: { complete: 1, severe: 1, moderate: 1, light: 1 }, burstAglM: 0,
  },
  {
    id: 'delay', name: '지연신관 (관통 후 기폭)',
    detail: '구조물·지반을 뚫고 들어가 터진다. 지표 과압은 줄고 탄공과 지중 파괴가 커진다.',
    coupling: 0.55, crater: 2.1, frag: 0.45,
    ring: { complete: 1.15, severe: 1, moderate: 0.92, light: 0.85 }, burstAglM: 0,
  },
  {
    id: 'airburst', name: '공중폭발 (근접신관)',
    detail: '지표 위에서 터진다. 탄공이 없고 파편이 넓게 퍼지며 저압대(유리 파손)가 커진다.',
    coupling: 1.0, crater: 0, frag: 1.55,
    ring: { complete: 0.7, severe: 0.9, moderate: 1.15, light: 1.35 }, burstAglM: 12,
  },
];

export function fuzeById(id: unknown): Fuze {
  return FUZES.find((f) => f.id === id) ?? FUZES[0]!;
}

// ───────────────────────── 폭발 물리 ─────────────────────────

/** 구조물 손상 등급별 최대 정면과압 문턱 (kPa) — 공개 폭발피해 평가 기준. */
export const DAMAGE_KPA = { complete: 70, severe: 34, moderate: 17, light: 3.4 } as const;

/**
 * Brode(1955) — 환산거리 Z (m·kg^-1/3) 에서의 최대 정면과압 (bar).
 * 근거리(10 bar 초과)와 원거리 가지를 나눠 쓴다. Z 가 커질수록 단조 감소한다.
 */
export function overpressureBar(z: number): number {
  const Z = Math.max(0.05, z);
  const near = 6.7 / (Z * Z * Z) + 1;
  if (near > 10) return near;
  // 원거리 가지의 상수항 −0.019 는 Z ≈ 47 을 넘으면 식을 **음수**로 만든다. 그대로
  // 두면 `(음수)^1.4` 가 NaN 이 되어 먼 표적 하나가 배치 전체의 손상 합을 NaN 으로
  // 오염시킨다(취약 조준점 탐색에서 실제로 그렇게 터졌다). 0 에서 잘라 둔다 —
  // 그 거리에서는 어차피 아무 일도 일어나지 않는다.
  return Math.max(0, 0.975 / Z + 1.455 / (Z * Z) + 5.85 / (Z * Z * Z) - 0.019);
}

/** 과압(kPa)을 그 값이 되는 거리(m)로 되돌린다 — 단조 감소이므로 이분법. */
export function radiusForKpa(chargeKg: number, kPa: number): number {
  const w = Math.max(0.01, chargeKg);
  const cube = Math.cbrt(w);
  const target = kPa / 100; // bar
  let lo = 0.05, hi = 4000;
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    if (overpressureBar(mid / cube) > target) lo = mid; else hi = mid;
  }
  return (lo + hi) / 2;
}

/**
 * 파편 위험반경 (m).
 *
 * 파편은 과압과 다른 물리다 — 작은 포탄에서는 파편 위험이 과압 피해보다 훨씬 넓다.
 * 케이싱 파편의 도달거리를 탄체질량 입방근에 비례한다고 두고, 계수 22 는 이 저장소가
 * 이미 들고 있는 KAIROS 부수피해평가(CDE) 표의 사거리별 안전거리(65~255 m)에 맞춘 값이다.
 * 화면 아래 부수피해 검증은 그 원본 표를 그대로 다시 조회한다.
 */
export function fragRadiusM(bodyKg: number, fuze: Fuze): number {
  return 22 * Math.cbrt(Math.max(0.5, bodyKg)) * fuze.frag;
}

export interface StrikeRings {
  /** 탄공(크레이터) 반경 (m). 공중폭발이면 0. */
  crater: number;
  complete: number;
  severe: number;
  moderate: number;
  light: number;
  frag: number;
  /** 계산에 실제로 쓰인 유효 폭약량 (TNT 환산 kg). */
  effectiveKg: number;
}

/** 탄종·신관 조합의 피해 반경 일습. 화면의 모든 원과 판정이 이 한 함수에서 나온다. */
export function strikeRings(munition: Munition, fuze: Fuze): StrikeRings {
  const eff = munition.newKg * fuze.coupling;
  const r = (kPa: number) => radiusForKpa(eff, kPa);
  return {
    crater: fuze.crater > 0 ? 0.9 * Math.cbrt(eff) * fuze.crater : 0,
    complete: r(DAMAGE_KPA.complete) * fuze.ring.complete,
    severe: r(DAMAGE_KPA.severe) * fuze.ring.severe,
    moderate: r(DAMAGE_KPA.moderate) * fuze.ring.moderate,
    light: r(DAMAGE_KPA.light) * fuze.ring.light,
    frag: fragRadiusM(munition.bodyKg, fuze),
    effectiveKg: eff,
  };
}

// ───────────────────────── 피해 판정 ─────────────────────────

export type DamageGrade = 'destroyed' | 'severe' | 'moderate' | 'light' | 'none';

export const GRADE_LABEL: Record<DamageGrade, string> = {
  destroyed: '완파', severe: '중파', moderate: '경파', light: '외벽·유리 손상', none: '피해 없음',
};
export const GRADE_COLOR: Record<DamageGrade, string> = {
  destroyed: '#ec6a63', severe: '#ef9a52', moderate: '#e9c766', light: '#8fc7d8', none: '#63c7a4',
};
export const GRADE_ORDER: readonly DamageGrade[] = ['destroyed', 'severe', 'moderate', 'light', 'none'];

/**
 * 방호(hardened) 시설의 저항.
 *
 * 방호 구조는 같은 등급에 이르는 데 더 큰 과압을 요구한다 — 문턱을 3.2 배로 잡으면
 * 입방근 법칙에 따라 반경이 그 세제곱근분의 1 로 줄어든다. 다만 관통탄두 + 지연신관은
 * 그 방호를 뚫고 안에서 터지므로 이점이 거의 사라진다.
 */
export const HARDENED_FACTOR = 1 / Math.cbrt(3.2);

export function hardenedScale(hardened: boolean, munition: Munition, fuze: Fuze): number {
  if (!hardened) return 1;
  const defeated = munition.penetrator && fuze.id === 'delay';
  return defeated ? 0.94 : HARDENED_FACTOR;
}

/** 탄착점에서 거리 distM 인 구조물의 피해 등급. */
export function gradeAt(distM: number, rings: StrikeRings, scale = 1): DamageGrade {
  if (distM <= rings.complete * scale) return 'destroyed';
  if (distM <= rings.severe * scale) return 'severe';
  if (distM <= rings.moderate * scale) return 'moderate';
  if (distM <= Math.max(rings.light * scale, rings.frag)) return 'light';
  return 'none';
}

// ───────────────────────── 다발 타격 · 누적 손상 ─────────────────────────

/**
 * 「몇 발까지 버티는가」
 * ─────────────────────
 * 한 발로 안 무너지는 표적을 두 발, 세 발 때리면 결국 무너진다. 그런데 그것은
 * 「같은 피해를 두 번 더한다」가 아니다 — 첫 발이 구조를 이미 상하게 해 두었으므로
 * 두 번째 발은 더 쉽게 무너뜨린다.
 *
 * 이 저장소는 그 관계를 **Palmgren–Miner 선형 누적손상 법칙**으로 쓴다: 한 발이 주는
 * 손상을 `D = (P/P_cap)^n` 으로 놓고(P 는 그 거리에서의 최대 정면과압, P_cap 은 그
 * 구조의 완파 문턱), 발마다 그것을 더해 **ΣD ≥ 1 이면 완파**로 본다. 재료·구조
 * 분야에서 반복하중 누적을 다루는 가장 표준적인 규칙이고, 무엇보다 **한 발만 쏘면
 * 기존의 반경 판정과 정확히 같은 답이 나온다** — 아래 임계값을 그렇게 잡았기 때문이다.
 *
 * 지수 n 은 1.4 다. 과압이 두 배면 손상은 2.6 배 — 폭발 손상이 과압에 대해 초선형으로
 * 커진다는 관찰과 맞고, n=1 (단순 비례)이면 먼 거리의 약한 발까지 과대평가된다.
 */
export const DAMAGE_EXPONENT = 1.4;

/** 그 거리에서의 최대 정면과압 (kPa). `radiusForKpa` 의 역방향. */
export function overpressureKpaAt(distM: number, chargeKg: number): number {
  const cube = Math.cbrt(Math.max(0.01, chargeKg));
  return overpressureBar(Math.max(0.05, distM) / cube) * 100;
}

/**
 * 이 구조가 완파에 이르는 과압 (kPa).
 *
 * 방호 구조는 3.2 배를 요구한다 — `hardenedScale` 이 반경을 줄이는 것과 **같은 사실**을
 * 반대편에서 쓴 것이다(반경 축소 = 문턱 상승). 관통탄두 + 지연신관은 그 방호를 뚫고
 * 안에서 터지므로 이점이 사라진다.
 */
export function capacityKpa(hardened: boolean, munition: Munition, fuze: Fuze): number {
  if (!hardened) return DAMAGE_KPA.complete;
  const defeated = munition.penetrator && fuze.id === 'delay';
  return DAMAGE_KPA.complete * (defeated ? 1.2 : 3.2);
}

/**
 * 폭심에서 이보다 가까운 거리는 쓰지 않는다 (m).
 *
 * Brode 식은 Z→0 에서 발산한다. 구조물은 점이 아니라 부피를 가지므로 「중심에서
 * 0 m」라는 입력 자체가 성립하지 않는다 — 그대로 두면 손상률이 1 억 %로 찍힌다
 * (실제로 감시탑이 그렇게 나왔다). 어차피 이 거리 안쪽은 전부 완파라 결론은 같다.
 */
export const MIN_STANDOFF_M = 2;

/**
 * 한 발이 그 거리의 구조에 주는 손상 지수 (0~). 1 이면 그 한 발로 완파.
 * 상한 20 은 표시용이다 — 1 을 넘으면 어차피 한 발로 무너진다.
 */
export function shotDamage(
  distM: number, effectiveKg: number, capKpa: number, mask = 1,
): number {
  const p = overpressureKpaAt(Math.max(MIN_STANDOFF_M, distM), effectiveKg) * mask;
  return Math.min(20, (p / capKpa) ** DAMAGE_EXPONENT);
}

/**
 * 누적 손상 → 등급.
 *
 * 임계값은 **한 발 판정과 어긋나지 않도록** 도출했다. 중파 문턱 거리에서는 과압이
 * 34 kPa 이므로 그 한 발의 손상은 (34/70)^1.4 다 — 그 값을 그대로 중파 임계로 쓴다.
 * 그래서 1 발만 쏘면 `gradeAt`(반경 기준)과 같은 답이 나오고, 2 발부터 비로소
 * 누적이 의미를 갖는다.
 */
export const CUM_THRESHOLD = {
  destroyed: 1,
  severe: (DAMAGE_KPA.severe / DAMAGE_KPA.complete) ** DAMAGE_EXPONENT,
  moderate: (DAMAGE_KPA.moderate / DAMAGE_KPA.complete) ** DAMAGE_EXPONENT,
  light: (DAMAGE_KPA.light / DAMAGE_KPA.complete) ** DAMAGE_EXPONENT,
} as const;

export function gradeFromDamage(d: number): DamageGrade {
  if (d >= CUM_THRESHOLD.destroyed) return 'destroyed';
  if (d >= CUM_THRESHOLD.severe) return 'severe';
  if (d >= CUM_THRESHOLD.moderate) return 'moderate';
  if (d >= CUM_THRESHOLD.light) return 'light';
  return 'none';
}

/**
 * 구조물 HP — 「얼마나 남았는가」
 *
 * 누적 손상 D 는 0 에서 시작해 1 에서 완파다. 사람이 읽기에는 반대가 편하다:
 * **HP = 1 − D**, 100 % 에서 시작해 0 % 에서 무너진다. 계산은 D 로 하고 표시만 HP 로
 * 뒤집는다 — 둘은 같은 수의 앞뒤일 뿐이라 어긋날 수가 없다.
 */
export function hpOf(cumulativeDamage: number): number {
  return Math.max(0, 1 - cumulativeDamage);
}

/**
 * 3D 형상 단계. HP 구간마다 **다른 모델**을 쓴다 — 가라앉은 건물과 무너진 건물은
 * 다른 물건이기 때문이다(assets/blender/build_damage.py 가 굽는 세 단계).
 *
 *   intact   HP 100~86 %   원본 셸 그대로
 *   scarred  HP  86~64 %   원본 + `fac_dmg_light` 오버레이 (깨진 창·그을음·파편)
 *   heavy    HP  64~ 0 %   `fac_dmg_heavy` 로 대체 (두 면 붕괴·기둥·노출 슬래브)
 *   ruin     HP      0 %   `fac_ruin` 으로 대체 (완전 붕괴 잔해)
 *
 * 경계는 등급 임계(CUM_THRESHOLD)와 같은 자리에 둔다. 그래야 패널의 「중파」와
 * 화면의 「반파 형상」이 같은 순간에 바뀐다 — 표와 그림이 어긋나면 둘 다 못 믿는다.
 */
export type DamageStage = 'intact' | 'scarred' | 'heavy' | 'ruin';

export function stageOf(cumulativeDamage: number): DamageStage {
  if (cumulativeDamage >= CUM_THRESHOLD.destroyed) return 'ruin';
  if (cumulativeDamage >= CUM_THRESHOLD.severe) return 'heavy';
  if (cumulativeDamage >= CUM_THRESHOLD.moderate) return 'scarred';
  return 'intact';
}

export const STAGE_LABEL: Record<DamageStage, string> = {
  intact: '원형', scarred: '외피 손상', heavy: '구조 반파', ruin: '완전 붕괴',
};

/** 결정적 난수 — 같은 계획은 몇 번을 되감아도 같은 탄착 산포를 낸다. */
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export type ShotOffset = { northM: number; eastM: number; missM: number };

/**
 * 발마다의 탄착 산포 (조준점 기준 m).
 *
 * CEP 는 「절반이 이 원 안에 든다」는 반경이고, 원형 정규분포에서
 * `CEP = 1.1774 σ` 다. 그래서 σ 를 그렇게 되풀고 두 축에 정규난수를 넣는다.
 * 1 발째는 조준점 그대로 두지 않는다 — 그러면 산포가 있다는 사실이 화면에서 사라진다.
 */
export function salvoOffsets(munition: Munition, rounds: number, seed = 1): ShotOffset[] {
  const sigma = munition.cepM / 1.1774;
  const rnd = mulberry32(seed * 2654435761 + munition.id.length * 97 + rounds);
  const out: ShotOffset[] = [];
  for (let i = 0; i < rounds; i++) {
    // Box–Muller
    const u1 = Math.max(1e-9, rnd());
    const u2 = rnd();
    const r = sigma * Math.sqrt(-2 * Math.log(u1));
    const northM = r * Math.cos(2 * Math.PI * u2);
    const eastM = r * Math.sin(2 * Math.PI * u2);
    out.push({ northM, eastM, missM: Math.hypot(northM, eastM) });
  }
  return out;
}

export interface EnduranceResult {
  /** 조준점에 정확히 맞았을 때 한 발이 주는 손상. */
  perShot: number;
  /** 산포 없이 계산한 필요 발수 (∞면 null). */
  direct: number | null;
  /** CEP 산포를 반영한 필요 발수 — 중앙값 / 90 % 신뢰. */
  p50: number | null;
  p90: number | null;
  /** 시행에서 한 번도 완파되지 않은 비율. */
  survivedRatio: number;
  /** 계산에 쓴 상한 발수. */
  cap: number;
}

/**
 * **몇 발까지 버티는가** — CEP 산포를 반영한 몬테카를로.
 *
 * 조준점은 같아도 탄착은 매번 다르다. 그래서 발수는 하나의 수가 아니라 분포다.
 * 중앙값(절반의 경우 이 발수 안에 무너진다)과 90 % 값(열 번 중 아홉 번은 이 발수면
 * 무너진다)을 함께 낸다 — 사격계획에서 실제로 필요한 것은 뒤쪽이다.
 *
 * @param targetDistM 조준점에서 그 구조까지의 거리 (m)
 */
export function roundsToDefeat(opts: {
  munition: Munition; fuze: Fuze; rings: StrikeRings;
  targetDistM: number; hardened: boolean;
  /** 지형 차폐 압력 배율 (1 = 가림 없음). */
  mask?: number;
  trials?: number; cap?: number; seed?: number;
}): EnduranceResult {
  const { munition, fuze, rings, targetDistM, hardened } = opts;
  const mask = opts.mask ?? 1;
  const cap = opts.cap ?? 40;
  const trials = opts.trials ?? 500;
  const capKpa = capacityKpa(hardened, munition, fuze);
  const aimDist = Math.max(MIN_STANDOFF_M, targetDistM);
  const perShot = shotDamage(aimDist, rings.effectiveKg, capKpa, mask);
  const direct = perShot > 0 ? Math.min(cap + 1, Math.ceil(1 / perShot)) : null;

  const sigma = munition.cepM / 1.1774;
  const rnd = mulberry32(opts.seed ?? 20260906);
  const counts: number[] = [];
  let survived = 0;
  for (let t = 0; t < trials; t++) {
    let acc = 0;
    let n = 0;
    while (n < cap) {
      n++;
      const u1 = Math.max(1e-9, rnd());
      const u2 = rnd();
      const r = sigma * Math.sqrt(-2 * Math.log(u1));
      const dn = r * Math.cos(2 * Math.PI * u2);
      const de = r * Math.sin(2 * Math.PI * u2);
      // 표적은 조준점에서 북쪽으로 targetDistM 에 있다고 두고 산포를 더한다 —
      // 방향은 통계에 영향이 없다(산포가 등방이므로).
      const d = Math.hypot(aimDist - dn, de);
      acc += shotDamage(d, rings.effectiveKg, capKpa, mask);
      if (acc >= 1) break;
    }
    if (acc >= 1) counts.push(n); else survived++;
  }
  counts.sort((a, b) => a - b);
  const at = (q: number) => (counts.length ? counts[Math.min(counts.length - 1, Math.floor(counts.length * q))]! : null);
  return {
    perShot,
    direct: direct !== null && direct <= cap ? direct : null,
    p50: at(0.5), p90: at(0.9),
    survivedRatio: survived / trials,
    cap,
  };
}

// ───────────────────────── 지형 차폐 (defilade) ─────────────────────────

/**
 * 능선 뒤는 왜 덜 맞는가
 * ──────────────────────
 * 여태 이 모델은 **개활 자유장**이었다. 폭심과 표적 사이에 산이 있어도 없는 것처럼
 * 계산했고, 그래서 문서에 「반경이 보수적으로 크게 나옵니다」라고 적어 두어야 했다.
 * 그런데 이 저장소가 다루는 것은 **능선 위의 GP** 다 — 반사면에 둔 시설이 정면에 둔
 * 시설과 같은 피해를 받는다면, 이 화면을 보고 배치를 고칠 이유가 없다.
 *
 * 폭풍파는 소리와 같은 파동이라 장애물을 만나면 **회절**로 돌아 들어간다. 방벽 뒤의
 * 감쇠는 음향에서 Maekawa 의 회절식으로 다룬다: 파가 장애물 끝을 돌아가느라 더 간
 * 거리 δ(경로차)를 파장 λ 로 잰 **프레넬 수** `N = 2δ/λ` 가 크면 감쇠가 크다.
 *
 *   δ = (폭심→마루) + (마루→표적) − (폭심→표적 직선)
 *   λ = c · t_d            (t_d = 양압 지속시간, c = 음속)
 *   ΔL(dB) = 5 + 20·log₁₀( √(2πN) / tanh√(2πN) )        (N > 0)
 *
 * 폭풍파는 순음이 아니라 펄스이므로 λ 를 **양압 지속시간이 만드는 파장**으로 잡는다.
 * 폭약량이 클수록 펄스가 길고(λ 가 크고) 회절로 더 잘 돌아 들어간다 — 큰 탄일수록
 * 능선이 덜 막아 준다는 뜻이고, 실제로 그렇다.
 *
 * 감쇠 상한은 24 dB(압력 1/16)로 묶는다. 실제 방벽도 지면·대기 산란 때문에 그보다
 * 더 조용해지지 않는다는 것이 음향 쪽의 통상적인 실무 한계다.
 */
export const SOUND_MPS = 340;
/** 방벽 회절 감쇠의 실무 상한 (dB). */
export const MAX_BARRIER_DB = 24;

/** 양압 지속시간 (초) — 폭약량 입방근에 비례한다. */
export function positivePhaseS(chargeKg: number): number {
  return 1.5e-3 * Math.cbrt(Math.max(0.01, chargeKg));
}

/** 그 폭발이 만드는 펄스의 유효 파장 (m). */
export function blastWavelengthM(chargeKg: number): number {
  return SOUND_MPS * positivePhaseS(chargeKg);
}

/** Maekawa 회절 감쇠 (dB). 경로차가 0 이하면(가림 없음) 0. */
export function maekawaAttenuationDb(pathDiffM: number, wavelengthM: number): number {
  if (!(pathDiffM > 0) || !(wavelengthM > 0)) return 0;
  const N = (2 * pathDiffM) / wavelengthM;
  const x = Math.sqrt(2 * Math.PI * N);
  const db = 5 + 20 * Math.log10(x / Math.tanh(x));
  // Maekawa 식은 스치듯 가려도(δ→0) 곧장 5 dB 를 준다 — 그대로 쓰면 직선이 지형에
  // 1 cm 닿는 순간 압력이 절반으로 뚝 떨어진다. 실제로는 프레넬 영역을 지나며
  // 서서히 그늘로 들어가므로, 첫 λ/4 구간에 걸쳐 감쇠를 올린다.
  const ramp = Math.min(1, pathDiffM / (wavelengthM / 4));
  return Math.max(0, Math.min(MAX_BARRIER_DB, db * ramp));
}

/**
 * 지형 차폐에 의한 **압력 배율** (0.063 ~ 1).
 * 1 이면 가림 없음(자유장), 작을수록 능선 뒤에 깊이 들어가 있다.
 */
export function maskFactorFromPathDiff(pathDiffM: number, chargeKg: number): number {
  const db = maekawaAttenuationDb(pathDiffM, blastWavelengthM(chargeKg));
  return 10 ** (-db / 20);
}

/**
 * 지형 표본으로 경로차 δ 를 낸다.
 *
 * @param samples 폭심→표적 직선을 등간격으로 나눈 지형 표고 (양 끝 포함)
 * @param burstH  폭심 고도 (해발 m)
 * @param targetH 표적 고도 (해발 m)
 * @param spanM   두 점 사이 수평거리 (m)
 * @returns 경로차 (m). 0 이면 직선이 지형 위를 지난다(가림 없음).
 */
export function pathDifferenceM(
  samples: readonly number[], burstH: number, targetH: number, spanM: number,
): number {
  const n = samples.length;
  if (n < 3 || !(spanM > 0)) return 0;
  let best = 0;
  for (let i = 1; i < n - 1; i++) {
    const f = i / (n - 1);
    const ground = samples[i]!;
    const line = burstH + (targetH - burstH) * f;
    if (!(ground > line)) continue;
    // 마루를 넘어가는 꺾인 경로 − 직선 경로
    const a = Math.hypot(spanM * f, ground - burstH);
    const b = Math.hypot(spanM * (1 - f), ground - targetH);
    const d = Math.hypot(spanM, targetH - burstH);
    best = Math.max(best, a + b - d);
  }
  return best;
}

// ───────────────────────── 탄약고 2차 유폭 ─────────────────────────

/**
 * 탄약고가 완파되면 **저장 탄약이 함께 터진다.**
 *
 * 이것을 넣지 않으면 배치 판단이 반쪽이 된다. 탄약고 한 동이 무너지는 사건은
 * 그 동 하나로 끝나지 않고 둘레를 통째로 지운다 — 그래서 실제 배치에서 탄약고는
 * 다른 시설과 크게 이격하고 토제(berm)로 둘러싼다. 화면이 그 이유를 보여 주지
 * 못하면 「탄약고를 지휘소 옆에 두면 왜 안 되는가」에 답할 수 없다.
 *
 * 포장 탄약의 **순폭약량비(NEW/총중량)** 는 탄종·포장에 따라 넓게 흩어지지만
 * 통상 10~25 % 다. 여기서는 보수적으로 15 % 를 쓴다.
 */
export const MAGAZINE_NEW_RATIO = 0.15;

/** 저장 톤수 → 2차 폭발의 TNT 환산 순폭약량 (kg). */
export function magazineNewKg(storedTons: number): number {
  return Math.max(0, storedTons) * 1000 * MAGAZINE_NEW_RATIO;
}

export interface SecondaryBlast {
  /** 유폭한 시설 */
  uid: string;
  name: string;
  lon: number;
  lat: number;
  /** TNT 환산 순폭약량 (kg) */
  newKg: number;
  /** 그 시설이 완파된 시각 (초) — 유폭은 여기서 조금 뒤에 일어난다 */
  atS: number;
  rings: StrikeRings;
}

/** 유폭까지의 지연 (초) — 화재가 번져 유폭에 이르는 시간. */
export const MAGAZINE_DELAY_S = 4.5;

/**
 * 2차 유폭의 반경 일습. 지표폭발이며 케이싱이 없으므로 파편은 잔해 기준으로 잡는다.
 */
export function magazineRings(newKg: number): StrikeRings {
  const eff = newKg * 1.8;                     // 지표반사
  const r = (kPa: number) => radiusForKpa(eff, kPa);
  return {
    crater: 0.9 * Math.cbrt(eff),
    complete: r(DAMAGE_KPA.complete),
    severe: r(DAMAGE_KPA.severe),
    moderate: r(DAMAGE_KPA.moderate),
    light: r(DAMAGE_KPA.light),
    // 탄약고 유폭의 파편은 탄체 케이싱이 아니라 저장 탄약과 구조물 잔해다
    frag: 26 * Math.cbrt(Math.max(1, newKg)),
    effectiveKg: eff,
  };
}

// ───────────────────────── 취약 조준점 분석 ─────────────────────────

export interface AimCandidate {
  lon: number;
  lat: number;
  /** 한 발이 이 배치 전체에 주는 손상의 합 */
  score: number;
  /** 전 구조물 완파에 필요한 발수 (상한 안에 못 넘기면 null) */
  rounds: number | null;
}

/**
 * **적이 어디를 때리면 가장 효율적인가.**
 *
 * 이 화면은 여태 「내가 고른 한 점」만 답했다. 그런데 배치를 고치려면 반대쪽 질문이
 * 필요하다 — 이 배치의 **가장 약한 자리**는 어디인가. 후보 격자를 훑어 발마다의
 * 손상 합이 가장 큰 점을 찾는다. 그 점이 곧 「적이 노릴 자리」이고, 배치를 고쳐
 * 그 점의 점수를 떨어뜨리는 것이 이 도구가 있는 이유다.
 *
 * 점수는 **한 발이 주는 손상의 합**이다. 발수로 바로 재지 않는 이유는, 이미 완파된
 * 시설에 더 넣은 손상이 점수를 부풀리기 때문이다 — 그래서 대상마다 1 로 자른다.
 */
export function scoreAimpoint(
  targets: readonly { lon: number; lat: number; capKpa: number }[],
  aim: { lon: number; lat: number },
  effectiveKg: number,
  distFn: (aLon: number, aLat: number, bLon: number, bLat: number) => number,
  maskFn?: (aim: { lon: number; lat: number }, t: { lon: number; lat: number }) => number,
): number {
  let sum = 0;
  for (const t of targets) {
    const d = distFn(aim.lon, aim.lat, t.lon, t.lat);
    const mask = maskFn ? maskFn(aim, t) : 1;
    sum += Math.min(1, shotDamage(d, effectiveKg, t.capKpa, mask));
  }
  return sum;
}

/**
 * 후보 격자를 훑어 취약 조준점을 찾는다.
 *
 * @param halfSpanM 격자 반경 (m) — 이만큼 사방을 본다
 * @param steps     한 변의 표본 수 (홀수면 정중앙이 후보에 들어간다)
 */
export function findVulnerableAimpoint(
  targets: readonly { lon: number; lat: number; capKpa: number }[],
  center: { lon: number; lat: number },
  effectiveKg: number,
  distFn: (aLon: number, aLat: number, bLon: number, bLat: number) => number,
  opts: { halfSpanM?: number; steps?: number; maskFn?: (a: { lon: number; lat: number }, t: { lon: number; lat: number }) => number } = {},
): { best: AimCandidate; grid: AimCandidate[] } {
  const halfSpan = opts.halfSpanM ?? 140;
  const steps = Math.max(3, opts.steps ?? 21);
  const mPerDegLat = 111_195;
  const mPerDegLon = mPerDegLat * Math.cos((center.lat * Math.PI) / 180);
  const grid: AimCandidate[] = [];
  let best: AimCandidate | null = null;
  for (let iy = 0; iy < steps; iy++) {
    for (let ix = 0; ix < steps; ix++) {
      const dn = (iy / (steps - 1) - 0.5) * 2 * halfSpan;
      const de = (ix / (steps - 1) - 0.5) * 2 * halfSpan;
      const aim = { lon: center.lon + de / mPerDegLon, lat: center.lat + dn / mPerDegLat };
      const score = scoreAimpoint(targets, aim, effectiveKg, distFn, opts.maskFn);
      const cand: AimCandidate = { ...aim, score, rounds: null };
      grid.push(cand);
      if (!best || score > best.score) best = cand;
    }
  }
  return { best: best!, grid };
}

// ───────────────────────── 시나리오 시간축 ─────────────────────────

/**
 * 화면에 보여 주는 종말유도 구간의 길이 (초).
 *
 * 거리를 고정하면(예: 2.6 km) 느린 대전차유도탄은 14 초를 날아오고 전술지대지탄은
 * 4 초 만에 닿는다 — 같은 화면을 보면서 「기다리는 시간」이 탄종마다 세 배 넘게
 * 달라진다. 그래서 **시간을 고정하고 거리를 종말속도에서 뽑는다**: 어느 탄종이든
 * 「탄착 6 초 전」부터 보여 주고, 그때의 경사거리는 그 탄의 속도가 정한다.
 */
export const ENTRY_FLIGHT_S = 6;

/** 그 6 초 동안 이 탄이 실제로 지나오는 경사거리 (m). */
export function entrySlantM(munition: Munition): number {
  return munition.terminalMps * ENTRY_FLIGHT_S;
}
/** 탄착 이후 잔류 연출 길이 (초). */
export const AFTER_S = 26;

export interface StrikeTimeline {
  /** 종말유도 비행시간 (초) — 경사거리 ÷ 종말속도. */
  flightS: number;
  /** 탄착 시각 (초). */
  impactS: number;
  /** 전체 길이 (초). */
  totalS: number;
  events: readonly { time: number; title: string; detail: string }[];
}

export function strikeTimeline(munition: Munition, fuze: Fuze, rings: StrikeRings): StrikeTimeline {
  const flightS = ENTRY_FLIGHT_S;
  const slantKm = entrySlantM(munition) / 1000;
  const impact = flightS;
  const events = [
    { time: 0, title: '종말유도 진입', detail: `${munition.short} 이 경사거리 ${slantKm.toFixed(1)}km · 진입각 ${munition.dipDeg}° · 종말속도 ${munition.terminalMps}m/s 로 들어옵니다.` },
    { time: impact - 1.2, title: '최종 조준 수정', detail: `CEP ${munition.cepM}m — 이 시점에 표시되는 산포원이 실제 탄착 가능 범위입니다.` },
    { time: impact, title: fuze.id === 'airburst' ? `공중폭발 (지표 +${fuze.burstAglM}m)` : fuze.id === 'delay' ? '관통 후 기폭' : '탄착·기폭', detail: `유효 폭약량 ${Math.round(rings.effectiveKg)}kg TNT 환산으로 과압이 퍼집니다.` },
    { time: impact + 0.9, title: '화구 최대', detail: '화구가 최대 반경에 이르고 충격파가 화구를 앞질러 나갑니다.' },
    { time: impact + 3.2, title: '충격파 통과', detail: `완파 ${Math.round(rings.complete)}m · 중파 ${Math.round(rings.severe)}m · 경파 ${Math.round(rings.moderate)}m 경계를 지납니다.` },
    { time: impact + 6, title: '피해 판정 확정', detail: '배치된 시설·감시자산의 등급이 확정됩니다. 이 시점 기록을 저장하십시오.' },
    { time: impact + 14, title: '연진 상승·정체', detail: '연기 기둥이 상승을 멈추고 옆으로 흐릅니다. 후속 관측·BDA 구간입니다.' },
  ];
  return { flightS, impactS: impact, totalS: Math.round((impact + AFTER_S) * 10) / 10, events };
}

export function clampStrikeTime(value: number, total: number): number {
  return Number.isFinite(value) ? Math.max(0, Math.min(total, value)) : 0;
}

// ───────────────────────── 판정 대상·보고서 ─────────────────────────

/** 지도 위에서 판정을 받는 대상 하나 (배치 시설 · 감시자산 · 감시탑). */
export interface StrikeTarget {
  uid: string;
  name: string;
  kind: '시설' | '감시자산' | '감시탑';
  lon: number;
  lat: number;
  hardened: boolean;
  /** 참고 표시용 — 없으면 생략. */
  detail?: string;
}

export interface StrikeAssessment extends StrikeTarget {
  distM: number;
  grade: DamageGrade;
  /** 이 대상에 적용된 방호 배율. */
  scale: number;
}

export function assessTargets(
  targets: readonly StrikeTarget[],
  impact: { lon: number; lat: number },
  rings: StrikeRings,
  munition: Munition,
  fuze: Fuze,
  distFn: (aLon: number, aLat: number, bLon: number, bLat: number) => number,
): StrikeAssessment[] {
  return targets
    .map((t) => {
      const scale = hardenedScale(t.hardened, munition, fuze);
      const d = distFn(impact.lon, impact.lat, t.lon, t.lat);
      return { ...t, distM: d, scale, grade: gradeAt(d, rings, scale) };
    })
    .sort((a, b) => a.distM - b.distM);
}

export function gradeSummary(rows: readonly StrikeAssessment[]): Record<DamageGrade, number> {
  const counts: Record<DamageGrade, number> = { destroyed: 0, severe: 0, moderate: 0, light: 0, none: 0 };
  for (const r of rows) counts[r.grade]++;
  return counts;
}

export const STRIKE_SOURCES = [
  {
    title: 'Brode, Numerical Solutions of Spherical Blast Waves (1955)',
    url: 'https://doi.org/10.1063/1.1722018',
    use: '환산거리 → 최대 정면과압 관계식. 이 화면의 모든 피해 반경이 이 식을 거리에 대해 되푼 결과입니다.',
  },
  {
    title: 'UFC 3-340-02 · Structures to Resist the Effects of Accidental Explosions',
    url: 'https://www.wbdg.org/FFC/DOD/UFC/ufc_3_340_02_2008_c2.pdf',
    use: '입방근 환산법과 구조물 손상 등급별 과압 문턱의 공개 근거입니다. 설계 상세나 보정계수는 쓰지 않았습니다.',
  },
  {
    title: 'KAIROS 부수피해평가(CDE) 표 — 이 저장소 내 이식본',
    url: 'js/vendor/kairos/kairos.bundle.js',
    use: '파편 위험반경 계수를 이 표의 사거리별 안전거리에 맞춰 잡았고, 화면 아래 부수피해 검증은 이 표를 그대로 조회합니다.',
  },
  {
    title: 'CesiumJS · 지형 클램프 도형과 모델',
    url: 'https://cesium.com/learn/cesiumjs-learn/cesiumjs-creating-entities/',
    use: 'VWorld 위성영상·MapTiler 지형 위에 피해 반경과 3D 탄체를 올리는 방식입니다.',
  },
] as const;

export const STRIKE_LIMITS = [
  '지형 차폐는 Maekawa 회절식으로 계산하지만, 건물에 의한 차폐와 건물 사이 반사에 의한 과압 증폭은 다루지 않습니다.',
  '지형 표고는 화면에 올라온 타일에서만 읽습니다. 타일이 없는 구간은 감쇠 없이(자유장) 두므로 그쪽 반경은 보수적으로 크게 나옵니다.',
  '사상자·금전손실·구조해석을 하지 않습니다. 등급은 과압 문턱과 거리만으로 매깁니다.',
  '무장 제원은 공개출처 근사값이며 실제 제식 제원이 아닙니다. 좌표 역시 합성 부지입니다.',
  '파편 위험반경은 케이싱 파편의 도달 가능 범위이며 그 안이 균일하게 위험하다는 뜻이 아닙니다.',
  '탄약고 유폭은 순폭약량비 15% 를 가정한 값이며, 실제 유폭 여부는 탄약 종류·포장·격벽에 크게 좌우됩니다.',
];

export interface StrikeReportInput {
  munition: Munition;
  fuze: Fuze;
  rings: StrikeRings;
  impact: { lon: number; lat: number; groundH: number; mgrs: string };
  launchAzDeg: number;
  /** 연속사격 발수와 탄착 간격 (초). */
  rounds?: number;
  gapS?: number;
  /** 발마다의 실제 탄착점 (CEP 산포 반영). */
  shots?: readonly { n: number; lon: number; lat: number; at: number; missM: number }[];
  /** 탄약고 2차 유폭 — 이 판정에서 가장 큰 사건일 수 있다. */
  secondaries?: readonly {
    uid: string; name: string; lon: number; lat: number;
    tons: number; newKg: number; atS: number; rings: StrikeRings;
  }[];
  rows: readonly StrikeAssessment[];
  collateral?: readonly { munition: string; radiusM: number; requiredM: number; safe: boolean | null; shortfallM: number | null }[];
  notes: string;
}

export function createStrikeReport(input: StrikeReportInput) {
  const { munition, fuze, rings, impact, rows } = input;
  return {
    schema: 'gp-digital-twin.strike-effect-assessment',
    version: 2,
    createdAt: new Date().toISOString(),
    provenance: '합성 부지 위의 공개 폭발 스케일링 모델 산출입니다. 실제 교전 판단 근거가 아닙니다.',
    munition: {
      id: munition.id, name: munition.name, class: munition.cls,
      netExplosiveKg: munition.newKg, bodyMassKg: munition.bodyKg,
      cepM: munition.cepM, rangeKm: munition.rangeKm,
    },
    fuze: { id: fuze.id, name: fuze.name, couplingFactor: fuze.coupling, burstAglM: fuze.burstAglM },
    impact: { ...impact, launchAzimuthDeg: input.launchAzDeg },
    salvo: {
      rounds: input.rounds ?? 1,
      intervalS: input.gapS ?? 0,
      reloadS: munition.reloadS,
      cepM: munition.cepM,
      shots: (input.shots ?? []).map((sh) => ({
        n: sh.n, lon: sh.lon, lat: sh.lat, atS: sh.at,
        missM: Math.round(sh.missM * 10) / 10,
      })),
    },
    // 유폭은 「내가 쏜 것」이 아니라 「내 배치가 만든 결과」다. 판정의 절반이 여기서
    // 나올 수도 있으므로 기록에 반드시 남는다 — 넣어 주고도 버리고 있었다.
    secondaries: (input.secondaries ?? []).map((x) => ({
      uid: x.uid, name: x.name, lon: x.lon, lat: x.lat,
      storedTons: x.tons, netExplosiveKg: Math.round(x.newKg),
      newRatio: MAGAZINE_NEW_RATIO, atS: Math.round(x.atS * 10) / 10,
      completeM: Math.round(x.rings.complete), severeM: Math.round(x.rings.severe),
      lightM: Math.round(x.rings.light), craterM: Math.round(x.rings.crater * 10) / 10,
    })),
    terrainMasking: {
      model: 'Maekawa barrier diffraction',
      soundMps: SOUND_MPS,
      maxAttenuationDb: MAX_BARRIER_DB,
      note: '폭심→표적 직선 아래로 솟은 지형의 경로차 δ 와 펄스 파장 λ 로 프레넬 수를 내어 감쇠시킨다. 지형 타일이 없는 구간은 감쇠 0(자유장).',
    },
    cumulativeModel: {
      rule: 'Palmgren-Miner linear damage accumulation',
      exponent: DAMAGE_EXPONENT,
      thresholds: CUM_THRESHOLD,
      minStandoffM: MIN_STANDOFF_M,
      note: '한 발의 손상 D=(P/P_cap)^n 을 발마다 더해 ΣD≥1 이면 완파로 본다. 1발이면 반경 판정과 같은 답이 나온다.',
    },
    rings: {
      effectiveTntKg: Math.round(rings.effectiveKg * 10) / 10,
      craterM: Math.round(rings.crater * 10) / 10,
      completeM: Math.round(rings.complete),
      severeM: Math.round(rings.severe),
      moderateM: Math.round(rings.moderate),
      lightM: Math.round(rings.light),
      fragM: Math.round(rings.frag),
      thresholdsKpa: DAMAGE_KPA,
    },
    summary: gradeSummary(rows),
    targets: rows.map((r) => {
      const extra = r as StrikeAssessment & {
        cumulative?: number;
        mask?: number;
        secondary?: number;
        endurance?: { perShot: number; direct: number | null; p50: number | null; p90: number | null; survivedRatio: number };
      };
      return {
        uid: r.uid, name: r.name, kind: r.kind, hardened: r.hardened,
        distanceM: Math.round(r.distM * 10) / 10, grade: r.grade, gradeLabel: GRADE_LABEL[r.grade],
        // 「몇 발까지 버티는가」 — 이 계획으로 쌓인 손상과, 완파에 필요한 발수
        cumulativeDamage: extra.cumulative === undefined ? null : Math.round(extra.cumulative * 1000) / 1000,
        hp: extra.cumulative === undefined ? null : Math.round(hpOf(extra.cumulative) * 1000) / 1000,
        stage: extra.cumulative === undefined ? null : stageOf(extra.cumulative),
        // 지형 차폐 압력 배율 (1 = 노출). 왜 이 시설만 덜 맞았는지는 여기서 나온다.
        terrainMask: extra.mask === undefined ? null : Math.round(extra.mask * 1000) / 1000,
        // 그 중 탄약고 유폭이 준 몫
        secondaryDamage: extra.secondary === undefined ? null : Math.round(extra.secondary * 1000) / 1000,
        roundsToDefeat: extra.endurance
          ? {
            perShotDamage: Math.round(extra.endurance.perShot * 1000) / 1000,
            direct: extra.endurance.direct,
            median: extra.endurance.p50,
            p90: extra.endurance.p90,
            survivedRatio: extra.endurance.survivedRatio,
          }
          : null,
      };
    }),
    collateral: input.collateral ?? [],
    limitations: STRIKE_LIMITS,
    sources: STRIKE_SOURCES.map((s) => ({ ...s })),
    notes: input.notes.slice(0, 4000),
  };
}
