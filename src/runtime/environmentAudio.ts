// @ts-nocheck
/**
 * 환경 배경음 — 바람은 늘, 비는 비가 올 때만, 눈은 「눈 자체가 아니라 눈보라의
 * 먹먹한 바람」으로, 천둥은 번개와 함께.
 *
 * 왜 화면만으론 부족한가
 * ───────────────────────
 * `weatherFx.ts`가 안개·강수를 3D로 그려도, 소리가 없으면 디지털트윈은 여전히
 * 무음의 유리병 속처럼 느껴진다. 실제 GP 능선은 맑은 날에도 바람 소리가 절대
 * 끊기지 않고, 비가 오면 그 바람 위에 빗소리가 얹히고, 폭풍이면 천둥이 번개
 * 뒤를 쫓아온다 — 이 계층적 구조(상시 바람 위에 날씨가 얹힌다)를 그대로
 * 오디오 믹스로 옮긴다.
 *
 * 자산: `mixkit.co` 무료 SFX(가입·저작권 표기 불필요 라이선스)에서 고른 세 트랙을
 * `assets/sounds/`(HTTP로 서빙되는 유일한 정적 경로 — server.cts 의
 * PUBLIC_ROOT_MOUNTS 참고)에 받아 두고 그대로 쓴다:
 *   wind-ridge.wav     — 산 정상부 바람(GP 능선과 같은 지형) 상시 루프
 *   rain-loop.wav      — 천둥 없는 순수 빗소리 루프
 *   thunder-rumble.wav — 번개 섬광에 붙는 단발 천둥
 *
 * 눈에는 전용 트랙을 넣지 않았다 — 떨어지는 눈송이 자체는 소리가 없다(강수
 * 소리원이 없다). 눈보라에서 실제로 들리는 건 바람이 눈에 막혀 저역만 남고
 * 먹먹해지는 것이므로, 별도 자산 대신 바람 트랙의 저역통과 컷오프를 눈일 때만
 * 크게 낮춰 흉내 낸다 — 그게 오히려 물리적으로 더 정확하다.
 *
 * 볼륨·필터는 전부 `AudioParam.setTargetAtTime`(지수 접근)으로 옮긴다 — 이 모듈의
 * `apply()`는 시간 배속이 걸린 동안 매 프레임(최대 60Hz) 불릴 수 있는데, 그때마다
 * `linearRampToValueAtTime`로 값을 다시 잡으면 램프가 매번 끊겨 클릭·계단음이
 * 난다. 지수 접근은 몇 초에 걸쳐 스스로 목표를 뒤쫓으므로 매 프레임 다시
 * 불러도 안전하다.
 *
 * 브라우저 자동재생 정책 때문에 `AudioContext`는 사용자 제스처 없이 못 켠다.
 * `strikeAudio.ts`처럼 명시적 재생 버튼이 없는 배경음이라, 이 클래스가 직접
 * 화면 아무 곳의 첫 클릭/키입력을 기다렸다가 스스로 깨어난다.
 */

const SOUND_BASE = '/assets/sounds/';
const SOURCES = {
  wind: SOUND_BASE + 'wind-ridge.wav',
  rain: SOUND_BASE + 'rain-loop.wav',
  thunder: SOUND_BASE + 'thunder-rumble.wav',
};

const lerp = (a, b, t) => a + (b - a) * Math.max(0, Math.min(1, t));

export class EnvironmentAudio {
  constructor() {
    this.ctx = null;
    this.enabled = true;
    this.volume = 0.5;
    this.master = null;

    this._buffers = {};      // name -> AudioBuffer
    this._loading = {};      // name -> Promise<AudioBuffer|null>

    this._windSrc = null; this._windGain = null; this._windFilter = null;
    this._rainSrc = null; this._rainGain = null;

    // apply()가 세팅하는 목표값 — 실제 AudioParam은 _tickParams()가 뒤쫓는다.
    this._windVolTarget = 0;
    this._windCutoffTarget = 3000;
    this._rainVolTarget = 0;
    this._snowHush = false;

    // 사용자 제스처 한 번으로 깨어난다(브라우저 자동재생 정책).
    this._unlock = () => this.resume();
    window.addEventListener('pointerdown', this._unlock, { once: true });
    window.addEventListener('keydown', this._unlock, { once: true });
  }

  /** 사용자 제스처 안에서(또는 그 신호를 받아) 부른다. */
  resume() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      try {
        this.ctx = new AC();
        this.master = this.ctx.createGain();
        this.master.gain.value = this.enabled ? this.volume : 0;
        this.master.connect(this.ctx.destination);
        this._startWind();
        this._startRain();
      } catch (error) {
        console.warn('환경음 초기화 실패 — 배경음 없이 진행', error);
        this.ctx = null;
        return;
      }
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
  }

  /** 한 번만 내려받아 디코드하고, 이후 호출은 같은 프라미스를 공유한다. */
  _ensureBuffer(name) {
    if (this._buffers[name]) return Promise.resolve(this._buffers[name]);
    if (this._loading[name]) return this._loading[name];
    if (!this.ctx) return Promise.resolve(null);
    const p = fetch(SOURCES[name])
      .then((r) => r.arrayBuffer())
      .then((ab) => this.ctx.decodeAudioData(ab))
      .then((buf) => { this._buffers[name] = buf; return buf; })
      .catch((error) => { console.warn(`환경음 로드 실패: ${name}`, error); return null; });
    this._loading[name] = p;
    return p;
  }

  _startWind() {
    this._ensureBuffer('wind').then((buf) => {
      if (!buf || !this.ctx) return;
      const ctx = this.ctx;
      const src = ctx.createBufferSource();
      src.buffer = buf; src.loop = true;
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = this._windCutoffTarget;
      filter.Q.value = 0.4;
      const gain = ctx.createGain();
      gain.gain.value = 0;   // apply()가 이미 불렸다면 다음 _tickParams가 곧 뒤쫓는다
      src.connect(filter); filter.connect(gain); gain.connect(this.master);
      src.start(0);
      this._windSrc = src; this._windGain = gain; this._windFilter = filter;
      this._tickParams();
    });
  }

  _startRain() {
    this._ensureBuffer('rain').then((buf) => {
      if (!buf || !this.ctx) return;
      const ctx = this.ctx;
      const src = ctx.createBufferSource();
      src.buffer = buf; src.loop = true;
      const gain = ctx.createGain();
      gain.gain.value = 0;
      src.connect(gain); gain.connect(this.master);
      src.start(0);
      this._rainSrc = src; this._rainGain = gain;
      this._tickParams();
    });
  }

  /** 목표값을 실제 AudioParam으로 지수 접근시킨다 — 매 프레임 다시 불러도 안전. */
  _tickParams() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const GAIN_TC = 1.6;    // 볼륨이 목표에 닿기까지 체감 몇 초
    const FILTER_TC = 2.4;  // 필터는 더 천천히 — 눈↔비 전환에서 훅 걸리지 않게
    if (this._windGain) this._windGain.gain.setTargetAtTime(this._windVolTarget, now, GAIN_TC);
    if (this._windFilter) this._windFilter.frequency.setTargetAtTime(this._windCutoffTarget, now, FILTER_TC);
    if (this._rainGain) this._rainGain.gain.setTargetAtTime(this._rainVolTarget, now, GAIN_TC);
  }

  /**
   * 환경 상태 하나로 바람·비·(바람을 통한) 눈을 한 번에 맞춘다.
   * `environmentModel.environmentState()`가 준 것과 같은 상태 — 실제 값 판단은
   * 여기서 다시 하지 않는다(무엇이 내리는지·풍속은 이미 그 모델이 정했다).
   */
  apply(state) {
    if (!state?.weather) return;
    const w = state.weather;

    // 바람 — 무풍에도 완전 무음으로 두지 않는다(실제 능선도 완전한 정적은 드물고,
    // 화면이 소리 없이 멈춰 보이면 그것도 거짓말이다). 풍속이 오를수록 크고
    // 밝아진다(고역이 늘어야 「휘파람」 같은 강풍 소리가 난다).
    const windMps = Math.max(0, w.windMps ?? 0);
    const windT = Math.min(1, windMps / 16);
    const snowHush = w.precipitation === 'snow';
    this._snowHush = snowHush;
    // 눈보라는 바람이 눈에 막혀 저역만 남고 먹먹해진다 — 컷오프를 크게 낮춘다.
    // 강수가 없을 때·비일 때는 정상적으로 풍속을 따라 밝아진다.
    this._windCutoffTarget = snowHush ? lerp(450, 1500, windT) : lerp(900, 7200, windT);
    const snowGain = snowHush ? 1.15 : 1;   // 눈보라는 체감 바람이 조금 더 세다
    const baseWindVol = this.enabled ? lerp(0.045, 0.34, windT) * snowGain : 0;
    this._windVolTarget = Math.min(0.55, baseWindVol);

    // 비 — 비가 올 때만 켜고, mm/h 로 세기를 낸다(약한 이슬비와 폭우가 같은
    // 소리면 그것도 거짓말이다).
    const raining = w.precipitation === 'rain' && (w.precipitationRateMmPerHour ?? 0) > 0;
    const rainT = Math.min(1, (w.precipitationRateMmPerHour ?? 0) / 16);
    this._rainVolTarget = this.enabled && raining ? lerp(0.16, 0.66, rainT) : 0;

    this._tickParams();
  }

  /**
   * 번개 섬광과 함께 부른다(`weatherFx.ts`의 onLightning 훅). 화면 전체를 밝히는
   * 포스트프로세스라 특정 폭심 거리가 없으므로, 실제 뇌우 대부분을 차지하는
   * 「멀리서 치는 번개」를 기본으로 두고 — 매번 지연·피치를 조금씩 흔들어 같은
   * 샘플의 반복 재생임을 숨긴다.
   * @param strength 0~1 — 그 순간 섬광의 밝기(weatherFx._lightningFlash)
   */
  thunder(strength = 0.7) {
    if (!this.enabled || !this.ctx) return;
    this._ensureBuffer('thunder').then((buf) => {
      if (!buf || !this.ctx) return;
      const ctx = this.ctx;
      const delay = 0.6 + Math.random() * 2.4;   // 번개는 빛, 이건 그보다 늦게 오는 소리
      const t0 = ctx.currentTime + delay;
      const rate = 0.85 + Math.random() * 0.3;
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.playbackRate.value = rate;
      const amp = Math.min(0.85, 0.32 + strength * 0.5);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(amp, t0 + 0.06);
      const dur = buf.duration / rate;
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      src.connect(g); g.connect(this.master);
      src.start(t0); src.stop(t0 + dur + 0.2);
    });
  }

  setEnabled(v) {
    this.enabled = v;
    if (this.master && this.ctx) {
      this.master.gain.setTargetAtTime(v ? this.volume : 0, this.ctx.currentTime, 0.25);
    }
    if (!v) { this._windVolTarget = 0; this._rainVolTarget = 0; }
  }

  setVolume(v) {
    this.volume = Math.max(0, Math.min(1, v));
    if (this.master && this.ctx && this.enabled) {
      this.master.gain.setTargetAtTime(this.volume, this.ctx.currentTime, 0.25);
    }
  }

  destroy() {
    window.removeEventListener('pointerdown', this._unlock);
    window.removeEventListener('keydown', this._unlock);
    try { this._windSrc?.stop(); } catch { /* 이미 끝났다 */ }
    try { this._rainSrc?.stop(); } catch { /* 이미 끝났다 */ }
    try { void this.ctx?.close(); } catch { /* 이미 닫혔다 */ }
    this.ctx = null;
  }
}
