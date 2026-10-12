// @ts-nocheck
/**
 * SitePlan 영속화 + Undo/Redo — Scaffolda 상태 모델 이식
 *
 * 원본 패턴 (Scaffolda-public):
 *  - SitePlan은 localStorage에 저장되어 새로고침 후 유지 (브라우저 로컬 상태가 원본의 저장소)
 *  - applyDraftSitePlan: 모든 변이마다 스냅샷 히스토리 → Ctrl+Z/Y
 *  - writeStoredEarthwork: 토공 결과도 함께 저장해 재계산 없이 복원
 */
import {
  normalizePlanSnapshot,
  PLAN_SOURCES,
  planFingerprint,
  planContentKey,
  copyPlanSnapshot,
} from '../domain/planContract';
import { loadRemotePlan, saveRemotePlan, deleteRemotePlan } from './planRemote';

const STORAGE_KEY = 'gp-digital-twin:sitePlan';
const SLOTS_KEY = 'gp-digital-twin:planSlots';
const PLAN_ID_KEY = 'gp-digital-twin:planId';
const HISTORY_MAX = 30;   // Scaffolda 히스토리 상한 계열

function getPlanId() {
  try {
    const existing = localStorage.getItem(PLAN_ID_KEY);
    if (existing) return existing;
    const id = globalThis.crypto?.randomUUID?.() ?? `local-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    localStorage.setItem(PLAN_ID_KEY, id);
    return id;
  } catch {
    return 'local-session';
  }
}

export class SitePlanStore {
  /**
   * deps: { placer, getTowerHeight, setTowerHeight, ipb, getMission, getTrainingEvidence }
   */
  constructor(deps) {
    this.deps = deps;
    this.planId = deps.planId ?? getPlanId();
    this._migrateLegacyStorage();
    this.undoStack = [];
    this.redoStack = [];
    this.lastSnapshot = null;   // 직전 확정 상태 (undo 후보)
    this.restoring = false;     // 복원 중 히스토리 push 억제
    this._saveTimer = null;
    this._pendingSnapshot = null;
    this._remoteQueue = Promise.resolve();
    this.remoteEtag = null;
    this.remoteStatus = 'unknown';
    this.onStatus = null;        // (msg) => void
    this.onHistoryChange = null; // (undoCount, redoCount) => void
  }

  _notifyHistory() { this.onHistoryChange?.(this.undoStack.length, this.redoStack.length); }

  /** 세션(= planId)마다 로컬 저장 키를 분리 — 세션을 바꿔도 다른 세션의 배치가 섞이지 않는다. */
  _storageKey() { return `${STORAGE_KEY}:${this.planId}`; }

  _slotsKey() { return `${SLOTS_KEY}:${this.planId}`; }

  /** 멀티세션 도입 이전 단일 저장 키를 쓰던 사용자를 「기본 세션」으로 승격할 때만 1회 복사. */
  _migrateLegacyStorage() {
    try {
      const legacyId = localStorage.getItem(PLAN_ID_KEY);
      if (!legacyId || legacyId !== this.planId) return;
      if (!localStorage.getItem(this._storageKey())) {
        const legacy = localStorage.getItem(STORAGE_KEY);
        if (legacy) localStorage.setItem(this._storageKey(), legacy);
      }
      if (!localStorage.getItem(this._slotsKey())) {
        const legacySlots = localStorage.getItem(SLOTS_KEY);
        if (legacySlots) localStorage.setItem(this._slotsKey(), legacySlots);
      }
    } catch { /* noop */ }
  }

  serialize() {
    const { placer, getTowerHeight, ipb, getMission, getTrainingEvidence } = this.deps;
    const mission = getMission?.();
    const trainingEvidence = getTrainingEvidence?.();
    return copyPlanSnapshot(normalizePlanSnapshot({
      updatedAt: new Date().toISOString(),
      towerHeight: getTowerHeight(),
      items: placer.serializeItems(),
      ipb: ipb.items.map((it) => ({ kind: it.kind, lon: it.lon, lat: it.lat, h: it.h, note: it.note })),
      ...(mission ? { mission } : {}),
      ...(trainingEvidence ? { trainingEvidence } : {}),
    }, { source: PLAN_SOURCES.LOCAL }));
  }

  /** 변이 훅 — onChange마다 호출. 상태가 실제로 바뀌었을 때만 히스토리 push + 자동저장 */
  commit() {
    if (this.restoring) return;
    const snap = this.serialize();
    const key = planContentKey(snap);
    if (this._lastKey === key) return;
    if (this.lastSnapshot) {
      this.undoStack.push(this.lastSnapshot);
      if (this.undoStack.length > HISTORY_MAX) this.undoStack.shift();
      this.redoStack.length = 0;
    }
    this.lastSnapshot = snap;
    this.lastFingerprint = planFingerprint(snap);
    this._lastKey = key;
    this._notifyHistory();
    this._scheduleSave(snap);
  }

  /** 초기 기준 스냅샷 (부트 직후 — undo가 빈 화면으로 돌아가게) */
  prime() {
    this.lastSnapshot = this.serialize();
    this.lastFingerprint = planFingerprint(this.lastSnapshot);
    this._lastKey = planContentKey(this.lastSnapshot);
  }

  _scheduleSave(snap) {
    clearTimeout(this._saveTimer);
    this._pendingSnapshot = copyPlanSnapshot(snap);
    this._saveTimer = setTimeout(() => this.flushPendingSave(), 800);
  }

  /** Flush local storage synchronously before the page leaves; remote delivery is best-effort. */
  flushPendingSave({ remote = true } = {}) {
    clearTimeout(this._saveTimer);
    this._saveTimer = null;
    const snap = this._pendingSnapshot;
    if (!snap) return;
    try {
      localStorage.setItem(this._storageKey(), JSON.stringify(snap));
      this._pendingSnapshot = null;
      this.onStatus?.(`자동저장 ${new Date().toLocaleTimeString('ko-KR', { hour12: false })}`);
    } catch (e) {
      console.warn('sitePlan save failed', e);
      this.onStatus?.('로컬 저장 실패 — 계획 파일을 내보내 보관하세요');
    }
    if (remote) this._enqueueRemoteSave(snap);
  }

  /**
   * Server sync is deliberately best-effort.  The local plan remains the
   * offline fallback, while the API gives us a seam for authenticated
   * Postgres/PostGIS persistence later without coupling the UI to a database.
   */
  _enqueueRemoteSave(snap) {
    const save = async () => {
      try {
        const result = await saveRemotePlan(this.planId, snap, this.remoteEtag);
        this.remoteEtag = result.etag;
        this.remoteStatus = 'synced';
        this.onStatus?.(`자동저장 ${new Date().toLocaleTimeString('ko-KR', { hour12: false })} · 서버 동기화`);
      } catch (error) {
        this.remoteStatus = 'local-only';
        console.warn('[plan] server sync unavailable; local copy retained', error);
      }
    };
    this._remoteQueue = this._remoteQueue.then(save, save);
  }

  /** Load the server copy when it is newer; otherwise retain local state. */
  async hydrateRemote() {
    try {
      const remote = await loadRemotePlan(this.planId);
      if (!remote) { this.remoteStatus = 'empty'; return null; }
      this.remoteEtag = remote.etag;
      this.remoteStatus = 'synced';
      const remoteSnapshot = normalizePlanSnapshot(remote.snapshot, { source: PLAN_SOURCES.SERVER });
      const localSnapshot = this.loadSaved();
      if (!localSnapshot) return remoteSnapshot;
      const remoteTime = Date.parse(remoteSnapshot.updatedAt) || 0;
      const localTime = Date.parse(localSnapshot.updatedAt) || 0;
      if (remoteTime > localTime) return remoteSnapshot;
      if (localTime > remoteTime) this._enqueueRemoteSave(localSnapshot);
      return null;
    } catch (error) {
      this.remoteStatus = 'local-only';
      console.warn('[plan] server load unavailable; local copy retained', error);
      return null;
    }
  }

  hasSaved() {
    try { return !!localStorage.getItem(this._storageKey()); } catch { return false; }
  }

  loadSaved() {
    try {
      const raw = localStorage.getItem(this._storageKey());
      return raw ? normalizePlanSnapshot(JSON.parse(raw), { source: PLAN_SOURCES.LOCAL }) : null;
    } catch { return null; }
  }

  clearSaved() {
    clearTimeout(this._saveTimer);
    this._saveTimer = null;
    this._pendingSnapshot = null;
    try { localStorage.removeItem(this._storageKey()); } catch { /* noop */ }
    this.remoteEtag = null;
    this.remoteStatus = 'empty';
    void deleteRemotePlan(this.planId).catch((error) => {
      console.warn('[plan] server delete unavailable; local copy removed', error);
    });
  }

  // ─── 계획안 슬롯 (안 A/B 비교 — 이름 붙인 스냅샷 다중 저장) ───
  listSlots() {
    try {
      const slots = JSON.parse(localStorage.getItem(this._slotsKey()) ?? '{}');
      return Object.fromEntries(Object.entries(slots).map(([name, snap]) => [
        name, normalizePlanSnapshot(snap, { source: PLAN_SOURCES.SLOT }),
      ]));
    } catch { return {}; }
  }

  saveSlot(name) {
    const slots = this.listSlots();
    slots[name] = normalizePlanSnapshot(this.serialize(), { source: PLAN_SOURCES.SLOT });
    try { localStorage.setItem(this._slotsKey(), JSON.stringify(slots)); return true; }
    catch (e) { console.warn('slot save failed', e); return false; }
  }

  loadSlot(name) { return this.listSlots()[name] ?? null; }

  deleteSlot(name) {
    const slots = this.listSlots();
    delete slots[name];
    try { localStorage.setItem(this._slotsKey(), JSON.stringify(slots)); } catch { /* noop */ }
  }

  /** 스냅샷 → 씬 반영 (재산출 없이 restoreItem — 원본 writeStoredEarthwork 복원 방식) */
  applySnapshot(snap) {
    const { placer, setTowerHeight, ipb, setMission, setTrainingEvidence } = this.deps;
    const normalized = copyPlanSnapshot(snap);
    clearTimeout(this._saveTimer);
    this._saveTimer = null;
    this._pendingSnapshot = null;
    this.restoring = true;
    try {
      [...placer.items].forEach((it) => placer.remove(it.uid));
      for (const d of normalized.items ?? []) placer.restoreItem(d);
      placer.select(null);
      setTowerHeight(normalized.towerHeight ?? 18);
      if (normalized.mission && setMission) setMission(normalized.mission);
      if (normalized.trainingEvidence && setTrainingEvidence) setTrainingEvidence(normalized.trainingEvidence);
      ipb.clear();
      for (const p of normalized.ipb ?? []) ipb.addManual(p.kind, p.lon, p.lat, { h: p.h, note: p.note });
      this.lastSnapshot = this.serialize();
      this.lastFingerprint = planFingerprint(this.lastSnapshot);
      this._lastKey = planContentKey(this.lastSnapshot);
      placer.onChange?.();
    } finally {
      this.restoring = false;
    }
  }

  /** 스냅샷 적용 + 직전 상태를 히스토리에 push (슬롯 전환용 — Ctrl+Z로 복귀 가능) */
  applySnapshotWithHistory(snap) {
    const prev = this.serialize();
    this.undoStack.push(prev);
    if (this.undoStack.length > HISTORY_MAX) this.undoStack.shift();
    this.redoStack.length = 0;
    this.applySnapshot(snap);
    this._notifyHistory();
    this._scheduleSave(this.lastSnapshot);
  }

  undo() {
    if (!this.undoStack.length) return false;
    this.redoStack.push(this.serialize());
    this.applySnapshot(this.undoStack.pop());
    this._notifyHistory();
    this._scheduleSave(this.lastSnapshot);
    return true;
  }

  redo() {
    if (!this.redoStack.length) return false;
    this.undoStack.push(this.serialize());
    this.applySnapshot(this.redoStack.pop());
    this._notifyHistory();
    this._scheduleSave(this.lastSnapshot);
    return true;
  }
}

