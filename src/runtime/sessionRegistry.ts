// @ts-nocheck
/**
 * 세션 레지스트리 — 「완전히 새로운 시작」인 여러 세션을 좌측 상단 스위처로 오가기
 * 위한 메타데이터 + 전환 오케스트레이션.
 *
 * 세션마다 지형(GP 위치·정밀지형 유무)이 다를 수 있는데, 이 앱은 지형·타워·부지조성을
 * 전부 부팅(boot()) 시 한 번만 구성한다 — 그래서 세션을 옮길 때 상태를 손으로 갈아
 * 끼우지 않고 **`switchTo()`가 활성 세션을 바꾼 뒤 페이지를 새로고침**한다. 새로고침된
 * 페이지는 data.ts가 이 레지스트리를 다시 읽어 그 세션의 지형으로 부팅하므로,
 * 미션·훈련근거·카메라 위치 등 이 앱 전역에 흩어진 상태가 전부 확실히 초기화된다
 * (개별 상태마다 리셋 로직을 따로 짜서 놓치는 것보다 훨씬 안전하다).
 *
 * 배치 내용(건물·감시자산)은 세션마다 이미 있는 저장 경로를 그대로 쓴다 — 세션
 * id를 SitePlanStore의 planId로 재사용해 서버 파일(data/plans/<id>.json)과
 * localStorage 키를 나눈다. 여기서는 그 id들에 이름·즐겨찾기·지형선택·시각을 붙이는
 * 얇은 색인 + 삭제 시 그 저장분 정리까지 관리한다. sitePlan.ts와 같은 패턴:
 * localStorage가 항상 동작하는 기준본이고, 서버 동기화는 있으면 좋은 best-effort다
 * (API가 없어도 스위처는 그대로 쓴다).
 */
const SESSIONS_KEY = 'gp-digital-twin:sessions';
const ACTIVE_KEY = 'gp-digital-twin:activeSessionId';
const LEGACY_PLAN_ID_KEY = 'gp-digital-twin:planId'; // 멀티세션 이전 단일 세션 사용자
const PLAN_STORAGE_KEY = 'gp-digital-twin:sitePlan';
const PLAN_SLOTS_KEY = 'gp-digital-twin:planSlots';
const POSTS_STORAGE_KEY = 'gp_sensor_posts_v1';
const DEFAULT_TERRAIN = { catalogId: 'gp-107' };

function uid() {
  return globalThis.crypto?.randomUUID?.() ?? `s-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function readLocal() {
  try {
    const parsed = JSON.parse(localStorage.getItem(SESSIONS_KEY) ?? '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch { return []; }
}

function writeLocal(sessions) {
  try { localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions)); } catch { /* noop */ }
}

function emitChange() {
  try { window.dispatchEvent(new CustomEvent('gp:sessions-changed')); } catch { /* noop */ }
}

async function request(path, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.timeoutMs ?? 2400);
  try { return await fetch(path, { ...options, signal: controller.signal }); }
  finally { clearTimeout(timer); }
}

class SessionRegistry {
  constructor() {
    this.sessions = readLocal();
    this._ensureDefault();
  }

  /** 최초 실행(또는 기존 단일 세션 사용자)엔 「기본 세션」 하나를 승격해 둔다.
   * 멀티세션 이전엔 GP-107이 유일한 지형이었으므로 그대로 지정. */
  _ensureDefault() {
    if (this.sessions.length) return;
    let legacyId = null;
    try { legacyId = localStorage.getItem(LEGACY_PLAN_ID_KEY); } catch { /* noop */ }
    const now = new Date().toISOString();
    const session = {
      id: legacyId || uid(), name: '기본 세션', favorite: false, createdAt: now, updatedAt: now,
      terrain: { ...DEFAULT_TERRAIN },
    };
    this.sessions = [session];
    writeLocal(this.sessions);
    try { localStorage.setItem(ACTIVE_KEY, session.id); } catch { /* noop */ }
    void this._remoteCreate(session);
  }

  list() {
    return [...this.sessions].sort((a, b) =>
      (Number(b.favorite) - Number(a.favorite)) || (Date.parse(b.updatedAt) - Date.parse(a.updatedAt)));
  }

  get(id) { return this.sessions.find((s) => s.id === id) ?? null; }

  getActiveId() {
    try {
      const id = localStorage.getItem(ACTIVE_KEY);
      if (id && this.get(id)) return id;
    } catch { /* noop */ }
    return this.list()[0]?.id ?? null;
  }

  setActiveId(id) {
    if (!this.get(id)) return;
    try { localStorage.setItem(ACTIVE_KEY, id); } catch { /* noop */ }
    emitChange();
  }

  /** 세션 전환의 유일한 진입점 — 활성 세션을 바꾸고 새로고침한다(위 클래스 설명 참고). */
  switchTo(id) {
    if (!this.get(id) || id === this.getActiveId()) return;
    this.setActiveId(id);
    window.location.reload();
  }

  /**
   * @param terrain {catalogId, gp?, hub?, name?} — gp-107 정밀지형 또는
   *   {catalogId:'custom', gp:{lon,lat}, hub?, name?}(위성영상만, 사용자 지정 위치).
   *   생성 후엔 안 바뀐다 — 그 GP는 그 자리다.
   */
  create(name = '', terrain = DEFAULT_TERRAIN) {
    const now = new Date().toISOString();
    const session = {
      id: uid(), name: (name ?? '').trim().slice(0, 60) || `세션 ${this.sessions.length + 1}`,
      favorite: false, createdAt: now, updatedAt: now, terrain,
    };
    this.sessions.push(session);
    writeLocal(this.sessions);
    emitChange();
    void this._remoteCreate(session);
    return session;
  }

  rename(id, name) {
    const trimmed = (name ?? '').trim();
    const session = this.get(id);
    if (!session || !trimmed) return;
    session.name = trimmed.slice(0, 60);
    session.updatedAt = new Date().toISOString();
    writeLocal(this.sessions);
    emitChange();
    void this._remotePatch(id, { name: session.name });
  }

  setFavorite(id, favorite) {
    const session = this.get(id);
    if (!session) return;
    session.favorite = !!favorite;
    session.updatedAt = new Date().toISOString();
    writeLocal(this.sessions);
    emitChange();
    void this._remotePatch(id, { favorite: session.favorite });
  }

  /** 스위처 목록용 요약 — 세션에 들어가 보지 않고도 무엇이 들어있는지 보여준다.
   * 이 브라우저에 로컬 사본이 없는(다른 브라우저에서 만든) 세션은 null(목록엔 '—'). */
  preview(id) {
    try {
      const rawPlan = localStorage.getItem(`${PLAN_STORAGE_KEY}:${id}`);
      const plan = rawPlan ? JSON.parse(rawPlan) : null;
      const rawPosts = localStorage.getItem(`${POSTS_STORAGE_KEY}:${id}`);
      const posts = rawPosts ? JSON.parse(rawPosts) : null;
      if (!plan && !posts) return null;
      return {
        items: Array.isArray(plan?.items) ? plan.items.length : 0,
        ipb: Array.isArray(plan?.ipb) ? plan.ipb.length : 0,
        towerHeight: Number.isFinite(plan?.towerHeight) ? plan.towerHeight : null,
        posts: Array.isArray(posts) ? posts.length : 0,
        updatedAt: typeof plan?.updatedAt === 'string' ? plan.updatedAt : null,
      };
    } catch { return null; }
  }

  /**
   * 세션 복제 — 「이 배치를 베이스로 변형을 만들고 싶다」용. 지형은 그대로 물려받는다
   * (좌표를 옮기려면 재배치가 필요해 복제로는 못 한다). 이 브라우저에 로컬 사본이
   * 없으면(다른 브라우저에서 만든 세션 등) 서버에서 한 번 받아와 복사한다 — best-effort,
   * 실패해도 메타데이터는 만들어지고(빈 세션) 배치만 못 물려받는다.
   */
  async duplicate(id) {
    const source = this.get(id);
    if (!source) return null;
    const now = new Date().toISOString();
    const newId = uid();
    const clone = {
      id: newId, name: `${source.name} 사본`.slice(0, 60), favorite: false,
      createdAt: now, updatedAt: now, terrain: source.terrain,
    };
    let planBody = null;
    try { planBody = localStorage.getItem(`${PLAN_STORAGE_KEY}:${id}`); } catch { /* noop */ }
    if (planBody) {
      try { localStorage.setItem(`${PLAN_STORAGE_KEY}:${newId}`, planBody); } catch { /* noop */ }
    } else {
      try {
        const response = await request(`/api/plans/${encodeURIComponent(id)}`);
        if (response.ok) {
          planBody = JSON.stringify(await response.json());
          try { localStorage.setItem(`${PLAN_STORAGE_KEY}:${newId}`, planBody); } catch { /* noop */ }
        }
      } catch (error) { console.warn('[session] duplicate: remote plan fetch failed', error); }
    }
    for (const key of [PLAN_SLOTS_KEY, POSTS_STORAGE_KEY]) {
      try {
        const value = localStorage.getItem(`${key}:${id}`);
        if (value) localStorage.setItem(`${key}:${newId}`, value);
      } catch { /* noop */ }
    }
    this.sessions.push(clone);
    writeLocal(this.sessions);
    emitChange();
    void this._remoteCreate(clone);
    if (planBody) {
      void request(`/api/plans/${encodeURIComponent(newId)}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: planBody,
      }).catch((error) => console.warn('[session] duplicate: remote plan push failed', error));
    }
    return clone;
  }

  /** 배치 저장 등 세션 내용이 바뀔 때 마지막 활동 시각만 갱신(이름·즐겨찾기는 그대로). */
  touch(id) {
    const session = this.get(id);
    if (!session) return;
    session.updatedAt = new Date().toISOString();
    writeLocal(this.sessions);
  }

  /**
   * 세션을 완전히 지운다 — 목록에서만 빼면 배치·감시자산 저장분이 localStorage에
   * 계속 쌓이므로 그 세션의 저장 경로(플랜/슬롯/감시자산 localStorage 3종 + 서버
   * plan 파일)까지 함께 정리한다. 지운 게 활성 세션이었으면 새로고침해 다음 활성
   * 세션으로 다시 부팅한다(호출부가 판단할 필요 없이 여기서 끝까지 처리).
   */
  remove(id) {
    const wasActive = this.getActiveId() === id;
    this.sessions = this.sessions.filter((s) => s.id !== id);
    if (!this.sessions.length) this._ensureDefault();
    writeLocal(this.sessions);
    const nextId = wasActive ? (this.list()[0]?.id ?? null) : null;
    if (nextId) this.setActiveId(nextId); else emitChange();
    try { localStorage.removeItem(`${PLAN_STORAGE_KEY}:${id}`); } catch { /* noop */ }
    try { localStorage.removeItem(`${PLAN_SLOTS_KEY}:${id}`); } catch { /* noop */ }
    try { localStorage.removeItem(`${POSTS_STORAGE_KEY}:${id}`); } catch { /* noop */ }
    void this._remoteDelete(id);
    void request(`/api/plans/${encodeURIComponent(id)}`, { method: 'DELETE' })
      .catch((error) => console.warn('[session] server plan delete failed', error));
    if (wasActive) window.location.reload();
  }

  /** 서버 사본과 병합 — API가 없으면 조용히 로컬만으로 계속 동작한다. */
  async hydrateRemote() {
    try {
      const response = await request('/api/sessions', { headers: { Accept: 'application/json' } });
      if (!response.ok) return;
      const remote = await response.json();
      if (!Array.isArray(remote)) return;
      const byId = new Map(this.sessions.map((s) => [s.id, s]));
      for (const r of remote) {
        if (!r?.id) continue;
        const local = byId.get(r.id);
        if (!local) { this.sessions.push(r); continue; }
        if (Date.parse(r.updatedAt) > Date.parse(local.updatedAt)) Object.assign(local, r);
      }
      for (const s of this.sessions) {
        if (!remote.some((r) => r.id === s.id)) void this._remoteCreate(s);
      }
      writeLocal(this.sessions);
      emitChange();
    } catch (error) {
      console.warn('[session] server sync unavailable; local registry retained', error);
    }
  }

  async _remoteCreate(session) {
    try {
      await request('/api/sessions', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(session),
      });
    } catch (error) { console.warn('[session] create sync failed', error); }
  }

  async _remotePatch(id, patch) {
    try {
      await request(`/api/sessions/${encodeURIComponent(id)}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(patch),
      });
    } catch (error) { console.warn('[session] update sync failed', error); }
  }

  async _remoteDelete(id) {
    try { await request(`/api/sessions/${encodeURIComponent(id)}`, { method: 'DELETE' }); }
    catch (error) { console.warn('[session] delete sync failed', error); }
  }
}

export const sessionRegistry = new SessionRegistry();
