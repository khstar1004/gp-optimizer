// @ts-nocheck
/**
 * 폭발 파티클 — Cesium 내장 `ParticleSystem` 을 쓴다
 *
 * 왜 빌보드 풀만으로 부족한가
 * ───────────────────────────
 * `strikeScene` 의 연기·먼지는 **고정 개수의 빌보드를 시각 t 의 함수로 배치**한다.
 * 그 방식의 장점은 결정성이다 — 재생 막대를 어디로 옮겨도 같은 그림이 나온다.
 * 대신 개수가 고정이라 「끓어오르는 결」이 안 나온다. 퍼프 하나하나가 자기 수명과
 * 회전과 색 곡선을 갖고 태어났다 사라져야 연기처럼 보이는데, 고정 풀은 그럴 수 없다.
 *
 * 그래서 두 층을 겹친다. 결정적 빌보드가 **형태**(기둥이 어디까지 자랐는가, 고리가
 * 어디까지 나갔는가)를 맡고, 이 파티클이 **질감**(끓는 연기, 튀는 불티, 날리는 먼지)을
 * 맡는다. 파티클은 실시간 프레임 시간으로 흐르므로 되감기와 맞지 않는데, 그래서
 * 되감거나 크게 건너뛰면 `reset()` 으로 통째로 지우고 다시 뿜는다.
 *
 * 구성 (Cesium 공식 파티클 시스템 튜토리얼의 화염·연기 조합을 폭발용으로 조정)
 *   fire   원뿔 방출 · 짧은 수명 · 밝은 주황 → 검은 그을음
 *   smoke  구 방출 · 긴 수명 · 부력으로 상승하며 커진다
 *   dust   원판 방출 · 지표를 따라 밖으로 · 중력으로 가라앉는다
 *   spark  빠르고 작은 불티 · 중력 낙하
 */

/** 파티클 텍스처 — VISTA 번들이 있으면 그것, 없으면 캔버스로 만든 부드러운 퍼프. */
function softPuff(size = 64) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grad.addColorStop(0, 'rgba(255,255,255,0.95)');
  grad.addColorStop(0.45, 'rgba(255,255,255,0.5)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, size, size);
  return c;
}

const css = (h) => Cesium.Color.fromCssColorString(h);

export class BlastParticles {
  /**
   * @param scene Cesium.Scene — 본 지도의 장면. 새로 만들지 않는다.
   * @param textures { fire, smoke, dust } 이미지 URL 또는 canvas. 없으면 캔버스 퍼프.
   */
  constructor(scene, textures = {}) {
    this.scene = scene;
    this.puff = softPuff();
    this.tex = {
      fire: textures.fire ?? this.puff,
      smoke: textures.smoke ?? this.puff,
      dust: textures.dust ?? this.puff,
    };
    this.systems = new Set();
    this.visible = true;
  }

  setTextures(tex) {
    this.tex = { fire: tex.fire ?? this.puff, smoke: tex.smoke ?? this.puff, dust: tex.dust ?? this.puff };
  }

  setVisible(v) {
    this.visible = v;
    for (const ps of this.systems) ps.show = v;
  }

  /** 살아 있는 파티클을 전부 걷어낸다 — 되감기·큰 점프에서 부른다. */
  reset() {
    for (const ps of this.systems) {
      try { this.scene.primitives.remove(ps); } catch { /* 이미 제거됨 */ }
    }
    this.systems.clear();
  }

  _add(ps) {
    ps.show = this.visible;
    this.scene.primitives.add(ps);
    this.systems.add(ps);
    ps.complete.addEventListener(() => {
      this.systems.delete(ps);
      try { this.scene.primitives.remove(ps); } catch { /* 장면이 먼저 사라짐 */ }
    });
    return ps;
  }

  /**
   * 한 발의 폭발을 그 자리에 터뜨린다.
   *
   * @param o.effectiveKg 유효 폭약량(TNT 환산). 모든 크기·속도·수명이 이 하나의
   *   입방근에서 나온다 — 3 kg 짜리와 200 kg 짜리가 같은 그림이 되면 안 된다.
   */
  burst(o) {
    const { lon, lat, groundH, burstAglM = 0, effectiveKg, windAz = 0, scale = 1 } = o;
    const cw = Math.cbrt(Math.max(0.5, effectiveKg));
    const R = 3.6 * cw * scale;                  // 화구 반경 규모 (m)
    const origin = Cesium.Cartesian3.fromDegrees(lon, lat, groundH + burstAglM);
    const enu = Cesium.Transforms.eastNorthUpToFixedFrame(origin);
    const up = Cesium.Cartesian3.normalize(origin, new Cesium.Cartesian3());

    // 바람 방향 단위벡터 (ENU 평면 위)
    const az = (windAz * Math.PI) / 180;
    const east = new Cesium.Cartesian3(Math.sin(az), Math.cos(az), 0);
    const windEcef = Cesium.Matrix4.multiplyByPointAsVector(enu, east, new Cesium.Cartesian3());
    Cesium.Cartesian3.normalize(windEcef, windEcef);

    const accel = (vec, a) => {
      const tmp = new Cesium.Cartesian3();
      return (particle, dt) => {
        Cesium.Cartesian3.multiplyByScalar(vec, a * dt, tmp);
        Cesium.Cartesian3.add(particle.velocity, tmp, particle.velocity);
      };
    };
    /**
     * 부력 + 바람 + 항력을 한 콜백으로 — 파티클마다 매 프레임 불린다.
     *
     * **buoy 는 가속도(m/s²)다.** 처음에 이것을 화구 반경에 비례시켰더니(R*0.55 ≈ 10 m/s²)
     * 13 초짜리 연기가 900 m/s 로 솟아 화면을 가르는 흰 광선이 됐다. 실제 연기는 몇 m/s²
     * 로 떠오르다 항력에 잡혀 곧 종단 상승속도(≈ buoy/drag)에 든다 — 그래서 부력은
     * 폭약량과 무관한 상수로 두고, 규모는 **초기 속도와 크기**로만 낸다.
     */
    const drift = (buoy, wind, drag) => {
      const tmp = new Cesium.Cartesian3();
      return (particle, dt) => {
        if (buoy) {
          Cesium.Cartesian3.multiplyByScalar(up, buoy * dt, tmp);
          Cesium.Cartesian3.add(particle.velocity, tmp, particle.velocity);
        }
        if (wind) {
          Cesium.Cartesian3.multiplyByScalar(windEcef, wind * dt, tmp);
          Cesium.Cartesian3.add(particle.velocity, tmp, particle.velocity);
        }
        if (drag) {
          Cesium.Cartesian3.multiplyByScalar(particle.velocity, Math.max(0, 1 - drag * dt), particle.velocity);
        }
      };
    };

    // ── 화염: 짧고 밝다. 원뿔로 위쪽 반구에 뿜는다 ──
    this._add(new Cesium.ParticleSystem({
      image: this.tex.fire,
      startColor: css('#fff0c8').withAlpha(0.95),
      endColor: css('#7a2b0a').withAlpha(0),
      startScale: 0.7, endScale: 3.2,
      minimumParticleLife: 0.25, maximumParticleLife: 0.75 + cw * 0.06,
      minimumSpeed: R * 0.8, maximumSpeed: R * 2.2,
      imageSize: new Cesium.Cartesian2(R * 0.55, R * 0.55),
      sizeInMeters: true,
      emissionRate: 0,
      lifetime: 0.9,
      loop: false,
      bursts: [
        new Cesium.ParticleBurst({ time: 0.0, minimum: 55, maximum: 80 }),
        new Cesium.ParticleBurst({ time: 0.06, minimum: 30, maximum: 50 }),
      ],
      // ConeEmitter 는 **+Z 축을 중심으로** 뿜는다. ENU 에서 +Z 가 이미 위이므로
      // emitterModelMatrix 로 돌릴 필요가 없다 — 돌렸더니 화염이 옆으로 누웠다.
      emitter: new Cesium.ConeEmitter(Cesium.Math.toRadians(72)),
      modelMatrix: enu,
      updateCallback: drift(9, 0, 3.0),
    }));

    // ── 연기: 오래 살고 부력으로 오르며 바람에 눕는다 ──
    this._add(new Cesium.ParticleSystem({
      image: this.tex.smoke,
      startColor: css('#241f19').withAlpha(0.85),
      endColor: css('#7d7466').withAlpha(0),
      startScale: 1.0, endScale: 7.0,
      minimumParticleLife: 5, maximumParticleLife: 11 + cw * 0.5,
      minimumSpeed: R * 0.35, maximumSpeed: R * 1.1,
      imageSize: new Cesium.Cartesian2(R * 0.9, R * 0.9),
      sizeInMeters: true,
      emissionRate: 26,
      lifetime: 5.5,
      loop: false,
      bursts: [new Cesium.ParticleBurst({ time: 0.05, minimum: 40, maximum: 60 })],
      emitter: new Cesium.SphereEmitter(R * 0.45),
      modelMatrix: enu,
      // 종단 상승속도 ≈ 2.6 / 0.38 ≈ 7 m/s — 10 초면 70 m 쯤 오른다
      updateCallback: drift(2.6, 1.1, 0.38),
    }));

    // ── 먼지: 지표를 따라 밖으로 밀려 나갔다가 중력으로 가라앉는다 ──
    const ground = Cesium.Transforms.eastNorthUpToFixedFrame(
      Cesium.Cartesian3.fromDegrees(lon, lat, groundH + 0.5));
    this._add(new Cesium.ParticleSystem({
      image: this.tex.dust,
      startColor: css('#9a8a69').withAlpha(0.7),
      endColor: css('#6a5f4c').withAlpha(0),
      startScale: 1.2, endScale: 6.5,
      minimumParticleLife: 2.5, maximumParticleLife: 6.5,
      minimumSpeed: R * 1.1, maximumSpeed: R * 2.8,
      imageSize: new Cesium.Cartesian2(R * 0.8, R * 0.8),
      sizeInMeters: true,
      emissionRate: 0,
      lifetime: 1.2,
      loop: false,
      bursts: [new Cesium.ParticleBurst({ time: 0.02, minimum: 70, maximum: 110 })],
      // 거의 눕힌 원뿔(82°) — 지표를 따라 사방으로 낮게 퍼진다.
      // CircleEmitter 를 눕히면 +Z 가 한 방향으로 고정돼 먼지가 한쪽으로만 날아간다.
      emitter: new Cesium.ConeEmitter(Cesium.Math.toRadians(82)),
      modelMatrix: ground,
      updateCallback: drift(-1.8, 0.7, 1.3),
    }));

    // ── 불티: 작고 빠르고 중력에 진다 ──
    this._add(new Cesium.ParticleSystem({
      image: this.puff,
      startColor: css('#ffd68a').withAlpha(1),
      endColor: css('#8a3a10').withAlpha(0),
      startScale: 0.5, endScale: 0.12,
      minimumParticleLife: 0.7, maximumParticleLife: 2.0,
      minimumSpeed: R * 1.5, maximumSpeed: R * 4.5,
      imageSize: new Cesium.Cartesian2(R * 0.16, R * 0.16),
      sizeInMeters: true,
      emissionRate: 0,
      lifetime: 0.5,
      loop: false,
      bursts: [new Cesium.ParticleBurst({ time: 0, minimum: 60, maximum: 110 })],
      emitter: new Cesium.SphereEmitter(R * 0.3),
      modelMatrix: enu,
      updateCallback: accel(up, -9.81),
    }));
  }

  destroy() {
    this.reset();
  }
}
