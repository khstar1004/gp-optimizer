// @ts-nocheck
/**
 * 타격 사운드 — 거리 물리는 합성, 파열 질감은 녹음
 *
 * 왜 소리인가
 * ───────────
 * 폭발을 눈으로만 보면 「그림」이지만, 소리가 붙으면 **사건**이 된다. 게임이 타격감을
 * 만드는 방식이 그것이고, 이 화면도 결국 사람이 「저기서 터졌다」를 몸으로 알아야
 * 판단이 붙는다.
 *
 * 그런데 여기에 물리가 하나 더 있다. **빛은 즉시 오고 소리는 나중에 온다.** 300 m
 * 밖의 폭발은 화구가 뜬 뒤 0.9 초가 지나야 들린다. 이 지연은 연출이 아니라 실제이고,
 * 관측자가 거리를 가늠하는 방식 그 자체다(번개와 천둥). 그래서 소리는 **카메라에서
 * 폭심까지의 거리 ÷ 343 m/s** 만큼 늦게 낸다 — 카메라를 멀리 빼면 늦게 들린다.
 *
 * 뼈대는 합성, 질감은 녹음
 * ──────────────────────────
 * 폭발음을 통째로 녹음 샘플에 맡기면 저작권·용량·오프라인 문제가 한꺼번에 생긴다
 * (원래 이 파일이 전부 WebAudio 합성이었던 이유). 지금은 `data/sounds`(사용자가
 * 직접 골라 둔, 4개 다 100KB 안팎이라 오프라인 번들에 문제 없는 로컬 파일)의
 * 녹음 4종을 `assets/sounds/explosion/`(HTTP로 서빙되는 유일한 정적 경로 —
 * server.cts 의 PUBLIC_ROOT_MOUNTS 참고, `data/`는 서빙 대상이 아니다)에도 복사해
 * 두고 함께 쓴다. 다만 녹음 하나만으로는 「가까울 때 크랙, 멀 때 저역만 남고
 * 지연되어 들린다」는 거리별 물리를 표현할 수 없다 — 녹음은 특정 거리에서 딱 한 번
 * 찍힌 소리이지, 거리 함수가 아니다. 그래서 뼈대(거리별 지연·저역통과·감쇠)는
 * 여전히 아래 합성이 담당하고, 녹음은 그 위에 얹는 네 번째 층(질감)으로만 쓴다:
 *
 *   ① 저역 럼블   백색잡음 → 저역통과. 폭약량이 클수록 컷오프가 낮고 꼬리가 길다.
 *   ② 서브 붐     40~70 Hz 사인이 아래로 미끄러진다. 가슴을 치는 부분.
 *   ③ 크랙        고역 짧은 트랜지언트. 가까울 때만 들린다(멀면 공기가 먹는다).
 *   ④ 녹음 샘플   합성으로는 못 내는 파열·잔해 질감. ①③과 같은 t0/저역통과를
 *                 그대로 씌워 거리감에서 어긋나지 않게 한다. 유폭(secondary)은
 *                 네 파일 중 가장 무거운 것(`explode.mp3`)을, 직격탄은 나머지
 *                 세 개(`explosion-1~3.mp3`) 중 매번 무작위로 골라 반복 재생임을
 *                 숨긴다.
 *
 * 거리에 따라 ①의 컷오프가 내려가고 ③이 사라진다 — 멀리서 나는 폭발이 「먹먹한」
 * 이유가 그것이다(고주파가 대기에 먼저 흡수된다).
 *
 * 브라우저는 사용자가 뭔가를 누르기 전에는 소리를 못 내게 막는다. 그래서 `resume()`
 * 은 **재생 버튼을 누르는 그 순간** 불린다.
 */

const SOUND_MPS = 343;

/** 직격탄 질감 후보 — 매번 무작위로 하나를 골라 반복 재생 티를 없앤다. */
const IMPACT_SAMPLE_URLS = [
  '/assets/sounds/explosion/explosion-1.mp3',
  '/assets/sounds/explosion/explosion-2.mp3',
  '/assets/sounds/explosion/explosion-3.mp3',
];
/** 유폭(탄약고 등 2차 폭발) 전용 — 네 파일 중 가장 무겁게 들리는 것 하나. */
const SECONDARY_SAMPLE_URL = '/assets/sounds/explosion/explode.mp3';

/** 백색잡음 버퍼 하나를 만들어 두고 돌려 쓴다 (매번 만들면 GC 가 튄다). */
function noiseBuffer(ctx, seconds = 3) {
  const n = Math.floor(ctx.sampleRate * seconds);
  const buf = ctx.createBuffer(1, n, ctx.sampleRate);
  const d = buf.getChannelData(0);
  let last = 0;
  for (let i = 0; i < n; i++) {
    // 살짝 적분한 잡음(브라운 계열) — 순수 백색보다 폭발음의 몸통에 가깝다
    const w = Math.random() * 2 - 1;
    last = (last + 0.02 * w) / 1.02;
    d[i] = last * 3.2 + w * 0.35;
  }
  return buf;
}

export class StrikeAudio {
  constructor() {
    this.ctx = null;
    this.enabled = true;
    this.volume = 0.7;
    this.noise = null;
    this.master = null;
    this.live = new Set();      // 예약해 둔 소스 — 되감으면 전부 끊는다
    this._impactBuffers = [];   // 디코드된 직격탄 녹음 (로딩 실패분은 제외)
    this._secondaryBuffer = null;
    this._samplesLoading = false;
  }

  /** 녹음 샘플을 한 번만 내려받아 디코드한다 — 실패해도 합성음(①②③)은 그대로 난다. */
  _loadSamples() {
    if (this._samplesLoading || !this.ctx) return;
    this._samplesLoading = true;
    const ctx = this.ctx;
    const decode = (url) => fetch(url)
      .then((r) => r.arrayBuffer())
      .then((buf) => ctx.decodeAudioData(buf))
      .catch((error) => { console.warn(`폭발음 샘플 로드 실패: ${url}`, error); return null; });
    Promise.all(IMPACT_SAMPLE_URLS.map(decode)).then((bufs) => {
      this._impactBuffers = bufs.filter(Boolean);
    });
    decode(SECONDARY_SAMPLE_URL).then((buf) => { this._secondaryBuffer = buf; });
  }

  /** 사용자 제스처 안에서 부른다 (브라우저 자동재생 정책). */
  resume() {
    if (!this.enabled) return;
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.noise = noiseBuffer(this.ctx);
      this.master = this.ctx.createGain();
      this.master.gain.value = this.volume;
      // 마지막에 얕은 컴프레서를 물려 여러 발이 겹쳐도 찢어지지 않게 한다
      const comp = this.ctx.createDynamicsCompressor();
      comp.threshold.value = -14;
      comp.knee.value = 22;
      comp.ratio.value = 5;
      comp.attack.value = 0.004;
      comp.release.value = 0.25;
      this.master.connect(comp);
      comp.connect(this.ctx.destination);
    }
    this._loadSamples();
    if (this.ctx.state === 'suspended') void this.ctx.resume();
  }

  setEnabled(v) {
    this.enabled = v;
    if (!v) this.clear();
    if (this.master) this.master.gain.value = v ? this.volume : 0;
  }

  setVolume(v) {
    this.volume = Math.max(0, Math.min(1, v));
    if (this.master) this.master.gain.value = this.enabled ? this.volume : 0;
  }

  /** 예약된 소리를 전부 끊는다 — 재생 막대를 되감거나 계획을 지울 때. */
  clear() {
    for (const node of this.live) {
      try { node.stop(); } catch { /* 이미 끝났다 */ }
    }
    this.live.clear();
  }

  _track(node, endsAt) {
    this.live.add(node);
    node.onended = () => this.live.delete(node);
    // 안전망 — onended 가 안 오는 브라우저가 있다
    setTimeout(() => this.live.delete(node), Math.max(0, endsAt * 1000) + 400);
  }

  /**
   * 폭발음.
   *
   * @param o.distanceM   카메라 ↔ 폭심 거리. 지연·감쇠·음색을 전부 이 하나가 정한다.
   * @param o.effectiveKg 유효 폭약량 — 꼬리 길이와 저역의 무게.
   * @param o.secondary   탄약고 유폭이면 더 낮고 길게.
   */
  boom(o) {
    if (!this.enabled || !this.ctx) return;
    const ctx = this.ctx;
    const dist = Math.max(1, o.distanceM ?? 200);
    const cw = Math.cbrt(Math.max(1, o.effectiveKg ?? 100));
    const secondary = Boolean(o.secondary);

    // 소리는 빛보다 늦게 온다 — 이 지연이 거리감의 거의 전부다
    const t0 = ctx.currentTime + dist / SOUND_MPS;
    // 거리 감쇠: 구면 확산 + 대기 흡수. 아주 멀면 들리지 않는다.
    const amp = Math.min(1, (secondary ? 1.6 : 1) * 60 / (60 + dist)) * (0.55 + cw * 0.05);
    if (amp < 0.008) return;
    // 멀수록 고역이 먼저 죽는다 — 「먹먹한 먼 폭발」의 정체
    const cutoff = Math.max(140, Math.min(9000, 5200 / (1 + dist / 90)));
    const tail = (secondary ? 2.6 : 1.0) + cw * 0.16;

    // ── ① 저역 럼블 ──
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    src.playbackRate.value = secondary ? 0.55 : 0.8;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(cutoff * 2.4, t0);
    lp.frequency.exponentialRampToValueAtTime(Math.max(80, cutoff * 0.4), t0 + tail);
    lp.Q.value = 0.7;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(amp, t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + tail);
    src.connect(lp); lp.connect(g); g.connect(this.master);
    src.start(t0); src.stop(t0 + tail + 0.1);
    this._track(src, dist / SOUND_MPS + tail);

    // ── ② 서브 붐 — 가슴을 치는 부분 ──
    const sub = ctx.createOscillator();
    sub.type = 'sine';
    const f0 = secondary ? 46 : 62 - cw * 1.6;
    sub.frequency.setValueAtTime(Math.max(28, f0 * 1.8), t0);
    sub.frequency.exponentialRampToValueAtTime(Math.max(24, f0 * 0.55), t0 + tail * 0.7);
    const sg = ctx.createGain();
    sg.gain.setValueAtTime(0.0001, t0);
    sg.gain.exponentialRampToValueAtTime(amp * 0.9, t0 + 0.02);
    sg.gain.exponentialRampToValueAtTime(0.0001, t0 + tail * 0.8);
    sub.connect(sg); sg.connect(this.master);
    sub.start(t0); sub.stop(t0 + tail);
    this._track(sub, dist / SOUND_MPS + tail);

    // ── ③ 크랙 — 가까울 때만. 멀면 공기가 먼저 먹는다 ──
    if (dist < 420) {
      const near = 1 - dist / 420;
      const cr = ctx.createBufferSource();
      cr.buffer = this.noise;
      cr.playbackRate.value = 2.4;
      const hp = ctx.createBiquadFilter();
      hp.type = 'highpass';
      hp.frequency.value = 1400;
      const cg = ctx.createGain();
      cg.gain.setValueAtTime(amp * 0.85 * near, t0);
      cg.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.16);
      cr.connect(hp); hp.connect(cg); cg.connect(this.master);
      cr.start(t0); cr.stop(t0 + 0.2);
      this._track(cr, dist / SOUND_MPS + 0.2);
    }

    // ── ④ 녹음 샘플 — 합성이 못 내는 파열·잔해 질감. ①③과 같은 t0·저역통과를
    // 그대로 씌워, 거리가 멀수록 이 층도 같이 먹먹해지고 늦게 온다 ──
    const impactBuf = secondary
      ? this._secondaryBuffer
      : this._impactBuffers[Math.floor(Math.random() * this._impactBuffers.length)];
    if (impactBuf) {
      const rec = ctx.createBufferSource();
      rec.buffer = impactBuf;
      rec.playbackRate.value = (secondary ? 0.8 : 0.92) + Math.random() * 0.16;
      const rlp = ctx.createBiquadFilter();
      rlp.type = 'lowpass';
      rlp.frequency.value = Math.max(300, cutoff * 1.6);
      rlp.Q.value = 0.5;
      const rg = ctx.createGain();
      rg.gain.value = amp * 0.9;
      rec.connect(rlp); rlp.connect(rg); rg.connect(this.master);
      const recDur = impactBuf.duration / rec.playbackRate.value;
      rec.start(t0); rec.stop(t0 + recDur + 0.1);
      this._track(rec, dist / SOUND_MPS + recDur);
    }
  }

  /**
   * 탄체 접근음 — 내려오는 동안의 휘슬.
   *
   * 다가오는 물체는 파면이 압축되어 음이 올라간다(도플러). 탄착 직전에 가장 높고
   * 크며, 탄착과 함께 끊긴다. `leadS` 초 동안 낸다.
   */
  incoming(o) {
    if (!this.enabled || !this.ctx) return;
    const ctx = this.ctx;
    const lead = Math.max(0.4, o.leadS ?? 2.2);
    const t0 = ctx.currentTime;
    const t1 = t0 + lead;
    const amp = Math.min(0.5, 40 / (40 + Math.max(1, o.distanceM ?? 150)));
    if (amp < 0.01) return;

    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(340, t0);
    osc.frequency.exponentialRampToValueAtTime(1250, t1);
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(700, t0);
    bp.frequency.exponentialRampToValueAtTime(2100, t1);
    bp.Q.value = 3.4;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(amp, t1 - 0.05);
    g.gain.exponentialRampToValueAtTime(0.0001, t1 + 0.05);
    osc.connect(bp); bp.connect(g); g.connect(this.master);
    osc.start(t0); osc.stop(t1 + 0.1);
    this._track(osc, lead + 0.1);
  }

  /** 붕괴음 — 콘크리트가 무너져 내리는 저역 잡음. 폭발음보다 늦게, 길게. */
  collapse(o) {
    if (!this.enabled || !this.ctx) return;
    const ctx = this.ctx;
    const dist = Math.max(1, o.distanceM ?? 150);
    const amp = Math.min(0.55, 70 / (70 + dist)) * 0.7;
    if (amp < 0.01) return;
    const t0 = ctx.currentTime + dist / SOUND_MPS + 0.35;
    const dur = 1.9;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    src.playbackRate.value = 0.42;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(900, t0);
    lp.frequency.exponentialRampToValueAtTime(180, t0 + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(amp, t0 + 0.18);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(lp); lp.connect(g); g.connect(this.master);
    src.start(t0); src.stop(t0 + dur + 0.1);
    this._track(src, dist / SOUND_MPS + dur + 0.4);
  }

  destroy() {
    this.clear();
    try { void this.ctx?.close(); } catch { /* 이미 닫혔다 */ }
    this.ctx = null;
  }
}
