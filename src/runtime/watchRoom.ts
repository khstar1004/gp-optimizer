// @ts-nocheck
/**
 * 관제실 — 감시 엔진을 앱에 붙이고, 사건을 사람에게 알린다
 *
 * `watchEngine.ts` 는 순수 계산이다. 이 파일은 그것을 **매초 돌리고**, 나온 사건을
 * 로그에 쌓고, 화면에 띄우는 일만 한다.
 *
 * 로그를 남기는 이유는 기록 취미가 아니다. 「이 배치가 작동했는가」는 지금 화면을
 * 보는 것으로는 답할 수 없고, **누가 언제 처음 잡았고 어디서 놓쳤는가**의 열로만
 * 답할 수 있다. 그래서 사건에는 반드시 시각(시뮬레이션 DTG)·자산·등급·거리가 붙는다.
 *
 * 경보는 세 단계로 구분한다 — 전부 같은 무게로 울리면 아무것도 울리지 않는 것과 같다:
 *   최초 탐지    붉게, 소리 없이 크게      (아무도 못 보던 것이 잡혔다)
 *   등급 상승    초록, 조용히               (더 확실해졌다)
 *   접촉 상실    회색, 그러나 로그에 남김   (놓친 것도 사실이다)
 */
import { detectionProbability } from './sensorPerformance';
import { losClear } from './siteOptimizer';
import { POST_TYPE } from './sensorPosts';
import { EVENT_COLOR, EVENT_LABEL, diffWatch, evaluateWatch } from './watchEngine';
import { formatClock, monthDayOf } from './environmentModel';

const MAX_LOG = 60;
const TICK_MS = 1000;

/** 초소 목록 → 감시 엔진이 아는 모양 */
export function watchAssetsOf(state) {
  // 발전기는 보는 장비가 아니다 — 감시 목록에 넣으면 없는 눈이 생긴다
  return (state.posts?.list() ?? []).filter((p) => !POST_TYPE[p.type]?.genW).map((p) => {
    const t = POST_TYPE[p.type] ?? {};
    return {
      uid: p.uid, name: p.name, short: t.short ?? p.type, type: p.type,
      color: t.color ?? '#9aa7b2',
      lon: p.lon, lat: p.lat, eyeH: state.posts.eyeH(p),
      aimAz: p.aimAz, fov: t.fov ?? 90,
    };
  });
}

/** 침투 유닛의 현재 지점 → 감시 엔진이 아는 모양 */
export function watchTargetsOf(state) {
  const out = [];
  for (const u of state.infil?.units ?? []) {
    let s;
    try { s = state.infil._state(u); } catch { continue; }
    if (!s?.p) continue;
    out.push({
      key: u.rd?.route?.id ?? '',
      name: u.rd?.route?.name?.split(' — ')[0] ?? '',
      lon: s.p.lon, lat: s.p.lat, h: s.p.h ?? 0,
    });
  }
  return out;
}

/**
 * 감시 엔진에 넘길 판정 함수 한 벌 — 화면과 같은 규칙을 쓴다는 보증이다.
 *
 * 초소가 아닌 자산(공중의 드론)은 `state.watch.extraPerf` 가 답한다 —
 * 떠 있는 드론도 감시자산이므로 같은 로그·같은 공백 분석에 들어가야 한다.
 */
export function watchOpts(state) {
  return {
    perfOf: (a) => {
      const post = state.posts?.get(a.uid);
      if (post) return state.posts.perfOf(post);
      return state.watch?.extraPerf?.(a) ?? null;
    },
    // 매설 센서·광망은 지형 가시선을 타지 않는다 — 땅과 철책을 통해 온다.
    // 공중의 드론도 마찬가지로 능선에 가리지 않는다(그게 띄우는 이유다).
    losOk: state.grid
      ? (a, lon, lat) => (a.drone || POST_TYPE[a.type]?.losFree
        ? true
        : losClear(state.grid, a.lon, a.lat, a.eyeH, lon, lat))
      : null,
    detectionProbability,
  };
}

export class WatchRoom {
  /**
   * @param ctx { state, toast, onEvent, onLog, openFeed, flyTo }
   */
  constructor(ctx) {
    this.ctx = ctx;
    this.state = ctx.state;
    this.snapshot = null;
    this.everSeen = new Set();
    this.log = [];              // 최근 사건 (새 것이 앞)
    this.alert = null;          // 화면에 띄울 최근 경보 { ...event, until }
    this.enabled = true;
    this._timer = null;
    /** 초소 밖의 감시자산 (공중의 드론) — 주입해 두면 함께 판정한다 */
    this.extraAssets = null;
    this.extraPerf = null;
  }

  start() {
    if (this._timer) return;
    this._timer = setInterval(() => this.tick(), TICK_MS);
  }

  stop() { clearInterval(this._timer); this._timer = null; }

  /** 배치·리허설이 갈아엎어지면 상태를 새로 시작한다 (없던 사건이 생기지 않게) */
  reset() {
    this.snapshot = null;
    this.everSeen.clear();
    this.log = [];
    this.alert = null;
    this.ctx.onLog?.(this.log);
  }

  /** 지금 이 표적을 잡고 있는 자산들 (HUD·감시 탭이 읽는다) */
  holdersOf(key) { return this.snapshot?.get(key)?.holders ?? []; }

  tick() {
    if (!this.enabled) return;
    const st = this.state;
    if (!st.posts || !st.infil) return;
    const assets = [...watchAssetsOf(st), ...(this.extraAssets?.() ?? [])];
    const targets = watchTargetsOf(st);
    if (!assets.length || !targets.length) {
      // 자산이나 표적이 없으면 판정 자체가 없다 — 「전부 놓쳤다」로 오해되지 않게
      if (this.snapshot && this.snapshot.size) {
        const ev = diffWatch(this.snapshot, new Map(), performance.now(), this.everSeen);
        this._push(ev);
      }
      this.snapshot = new Map();
      return;
    }
    const next = evaluateWatch(assets, targets, watchOpts(st));
    const events = diffWatch(this.snapshot, next, performance.now(), this.everSeen);
    this.snapshot = next;
    if (events.length) this._push(events);
  }

  _push(events) {
    const dtg = this._dtg();
    for (const e of events) {
      const row = { ...e, dtg, label: EVENT_LABEL[e.kind], color: EVENT_COLOR[e.kind] };
      this.log.unshift(row);
      this.ctx.onEvent?.(row);
      // 경보는 「처음 잡혔다」와 「식별로 올라갔다」만 — 나머지는 로그로 족하다
      if (e.kind === 'ACQUIRE' || (e.kind === 'UPGRADE' && e.grade === '식별')) {
        this.alert = { ...row, until: performance.now() + 6000 };
        this.ctx.toast?.(
          `${e.kind === 'ACQUIRE' ? '⚠ 최초 탐지' : '◉ 식별'} — ${e.name} · `
          + `${e.assetName ?? '?'} ${e.grade ?? ''} ${Math.round(e.distM ?? 0)}m`, 5200);
      }
    }
    if (this.log.length > MAX_LOG) this.log.length = MAX_LOG;
    this.ctx.onLog?.(this.log);
  }

  /** 지금 살아 있는 경보 (없으면 null) */
  activeAlert(nowMs = performance.now()) {
    if (!this.alert) return null;
    if (nowMs > this.alert.until) { this.alert = null; return null; }
    return this.alert;
  }

  /** 시뮬레이션 DTG — 로그의 시각은 벽시계가 아니라 그 상황의 시각이어야 한다 */
  _dtg() {
    const s = this.state.env?.state;
    if (!s) return '—';
    const md = monthDayOf(s.settings.dayOfYear);
    const sec = Math.floor((performance.now() / 1000) % 60);
    return `${String(md.month).padStart(2, '0')}${String(md.day).padStart(2, '0')} `
      + `${formatClock(s.settings.minuteOfDay)}:${String(sec).padStart(2, '0')}`;
  }
}
