/**
 * 조명 지원 — 「조명 자산이 있다」와 「지금 조명이 떠 있다」는 다르다
 *
 * 지금까지 실효거리 계산은 `조명탄 발사대가 배치되어 있으면 조명 지원 있음`
 * 이었다. 계획 단계(커버리지 분석·자동배치)에서는 그것이 맞다 — 그 자산을
 * 세우면 그 능력을 갖는다는 **능력 진술**이니까. 그러나 화면에 지금 보이는
 * 부채꼴과 1인칭의 유효거리 막대까지 그 규칙을 쓰면, 발사대를 한 기 세워 둔
 * 것만으로 **밤새도록 조명이 떠 있는 GP** 가 된다. 조명탄은 30초짜리 사건이다.
 *
 * 그래서 여기서는 조명을 **시간을 가진 상태**로 만든다. 쏘면 켜지고, 타면서
 * 밝기가 오르내리고, 꺼지면 EO·육안 유효거리는 원래의 밤으로 돌아간다.
 * 화면에서 그 왕복이 보이는 것이 이 파일의 존재 이유다.
 *
 * 물리는 최소한만: 조명탄은 낙하산으로 내려오며 타고(하강), 안개·강설 속에서는
 * 역산란으로 스스로를 가린다(효과 반경 축소). 숫자는 `sensorPerformance` 의
 * 조명 보정과 `POST_TYPES.flare` 제원을 그대로 쓴다.
 */

/**
 * 조명이 실제로 땅을 밝히는 반경 (m).
 *
 * **사거리와 조명 반경은 다른 수다.** `POST_TYPES.flare` 의 2 km 는 「어디까지
 * 조명을 올려 줄 수 있는가」(사거리)이고, 그 조명탄 하나가 밝히는 원은 그보다
 * 훨씬 작다 — 81 mm 조명탄이 400~800 m 다. 둘을 같은 수로 쓰면 발사대 한 기가
 * 전방 2 km 를 통째로 밝히는 것이 되어, 어디에 쏠지를 고르는 일이 사라진다.
 */
export const ILLUM_RADIUS_M = 520;

/** 연소시간 (초) — 155mm 조명탄 계열의 통상 체공. */
export const BURN_S = 32;
/** 점화 고도 (지표 위 m) 와 낙하 속도 — 낙하산 강하. */
export const IGNITE_AGL_M = 600;
export const DESCENT_MPS = 5.5;

export type FlareShot = {
  id: number;
  lon: number;
  lat: number;
  groundH: number;
  firedAt: number;      // ms
  byUid: string | null;
  byName: string;
  radiusM: number;      // 이 날씨에서의 유효 조명 반경
  backscatter: boolean; // 역산란 경고 (안개·강설)
};

/**
 * 연소 곡선 0~1.
 *
 * 점화 직후 최대가 아니라 1.5초쯤 올라갔다가, 마지막 5초에 사그라든다.
 * 화면에서 「지금 켜졌다 / 곧 꺼진다」가 읽혀야 조명 요청 타이밍이 의미를 갖는다.
 */
export function burnIntensity(elapsedS: number): number {
  if (elapsedS < 0 || elapsedS > BURN_S) return 0;
  const rise = Math.min(1, elapsedS / 1.5);
  const fade = Math.min(1, (BURN_S - elapsedS) / 5);
  return Math.max(0, rise * fade);
}

/** 점화 후 경과에 따른 조명탄 자체의 고도 (지표 위 m). */
export function flareAglM(elapsedS: number): number {
  return Math.max(0, IGNITE_AGL_M - DESCENT_MPS * Math.max(0, elapsedS));
}

/**
 * 이 날씨에서의 유효 조명 반경.
 *
 * 안개·강설 속 조명은 역산란으로 스스로를 가린다 — 반경이 줄 뿐 아니라 근거리가
 * 하얗게 뜬다. `POST_TYPES.flare` 의 청천 반경에 가시거리 한계를 씌운다.
 */
export function flareRadiusM(specRadiusM: number, visibilityMeters: number): number {
  return Math.max(120, Math.min(specRadiusM, 0.85 * visibilityMeters));
}

/**
 * 조명 지원 상태 하나.
 *
 * 「지금 이 지점이 조명받고 있는가」 하나만 답하면 되고, 그 답을 실효거리 계산과
 * 화면(카운트다운·따뜻한 색조·부채꼴 회복)이 함께 읽는다.
 */
export class FireSupport {
  shots: FlareShot[] = [];
  private seq = 0;
  onChange: (() => void) | null = null;

  /** @returns 발사된 조명탄 (제약에 걸리면 null) */
  fire(opts: {
    lon: number; lat: number; groundH: number;
    byUid?: string | null; byName?: string;
    specRadiusM: number; visibilityMeters: number;
    nowMs: number;
  }): FlareShot | null {
    const radiusM = flareRadiusM(opts.specRadiusM, opts.visibilityMeters);
    const shot: FlareShot = {
      id: (this.seq += 1),
      lon: opts.lon, lat: opts.lat, groundH: opts.groundH,
      firedAt: opts.nowMs,
      byUid: opts.byUid ?? null,
      byName: opts.byName ?? '조명탄 발사대',
      radiusM,
      backscatter: opts.visibilityMeters < 2500,
    };
    this.shots.push(shot);
    this.onChange?.();
    return shot;
  }

  /** 다 탄 조명탄을 걷어낸다. @returns 목록이 바뀌었으면 true */
  prune(nowMs: number): boolean {
    const before = this.shots.length;
    this.shots = this.shots.filter((s) => (nowMs - s.firedAt) / 1000 <= BURN_S);
    const changed = this.shots.length !== before;
    if (changed) this.onChange?.();
    return changed;
  }

  /** 지금 타고 있는 조명탄들 (밝은 것부터). */
  active(nowMs: number): Array<FlareShot & { elapsedS: number; intensity: number; remainS: number }> {
    return this.shots
      .map((s) => {
        const elapsedS = (nowMs - s.firedAt) / 1000;
        return { ...s, elapsedS, intensity: burnIntensity(elapsedS), remainS: BURN_S - elapsedS };
      })
      .filter((s) => s.intensity > 0)
      .sort((a, b) => b.intensity - a.intensity);
  }

  /**
   * 이 지점이 지금 조명받고 있는가. 실효거리 계산의 `illuminated` 가 이 값이다.
   * @param distFn 두 지점 사이 거리 (m) — geo.distM 을 주입해 이 파일을 순수하게 둔다
   */
  isIlluminated(
    lon: number, lat: number, nowMs: number,
    distFn: (aLon: number, aLat: number, bLon: number, bLat: number) => number,
  ): boolean {
    for (const s of this.active(nowMs)) {
      // 밝기가 절반 아래로 떨어진 조명은 관측을 되살리지 못한다
      if (s.intensity < 0.5) continue;
      if (distFn(lon, lat, s.lon, s.lat) <= s.radiusM) return true;
    }
    return false;
  }

  /**
   * 이 **감시 부채꼴**이 지금 조명 지원을 받고 있는가.
   *
   * 「관측점이 밝은가」가 아니다 — 관측점은 어두운 편이 낫다. 중요한 것은
   * **내가 보고 있는 땅**이 밝은가이고, 그 땅이 곧 이 자산의 감시 부채꼴이다.
   * 그래서 조명탄이 그 부채꼴 안(청천 제원 사거리·시야각)에 떠 있으면
   * 이 자산의 EO·육안 유효거리가 되살아난다.
   *
   * (모델이 내놓는 유효거리는 방향 하나짜리 스칼라라 「조명 쪽으로만 길어진다」를
   *  표현할 수 없다. 그 한계 안에서 가장 정직한 규칙이 이것이다.)
   *
   * @param geo { distM, azimuthDeg, azDelta } — 이 파일을 순수하게 두기 위한 주입
   */
  illuminatesFan(
    sensor: { lon: number; lat: number; aimAz: number; fovDeg: number; rangeM: number },
    nowMs: number,
    geo: {
      distM: (aLon: number, aLat: number, bLon: number, bLat: number) => number;
      azimuthDeg: (aLon: number, aLat: number, bLon: number, bLat: number) => number;
      azDelta: (a: number, b: number) => number;
    },
  ): boolean {
    const half = Math.min(180, (sensor.fovDeg ?? 360) / 2);
    for (const s of this.active(nowMs)) {
      if (s.intensity < 0.5) continue;
      const d = geo.distM(sensor.lon, sensor.lat, s.lon, s.lat);
      // 조명탄이 부채꼴 밖이어도, 밝힌 원이 부채꼴 안까지 걸치면 도움이 된다
      if (d > sensor.rangeM + s.radiusM) continue;
      if (half < 180) {
        const bearing = geo.azimuthDeg(sensor.lon, sensor.lat, s.lon, s.lat);
        // 가까운 조명일수록 각도 여유가 크다 (반경이 부채꼴을 가로지르므로)
        const slack = Math.min(90, (Math.atan2(s.radiusM, Math.max(1, d)) * 180) / Math.PI);
        if (Math.abs(geo.azDelta(bearing, sensor.aimAz)) > half + slack) continue;
      }
      return true;
    }
    return false;
  }

  clear(): void {
    if (!this.shots.length) return;
    this.shots = [];
    this.onChange?.();
  }
}
