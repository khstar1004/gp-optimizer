import test, { type TestContext } from 'node:test';
import assert from 'node:assert/strict';
import { SitePlanStore } from '../src/runtime/sitePlan';
import { DEFAULT_MISSION_SCENARIO } from '../src/domain/missionContract';
import { copyPlanSnapshot, planContentKey, type PlanSnapshot } from '../src/domain/planContract';

// The legacy runtime class does not declare its instance fields yet.
type StoreState = {
  _saveTimer: ReturnType<typeof setTimeout> | null;
  _pendingSnapshot: PlanSnapshot | null;
  undoStack: PlanSnapshot[];
  lastSnapshot: PlanSnapshot;
};
const costOf = (plan: PlanSnapshot) => (plan.items[0].cost as { totalKrw: number }).totalKrw;

function fixture(t: TestContext) {
  const storage = new Map<string, string>();
  t.mock.method(globalThis, 'fetch', async () => new Response('{}', { status: 200 }));
  const previousStorage = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => storage.set(key, value),
    removeItem: (key: string) => storage.delete(key),
  } });
  let mission = structuredClone(DEFAULT_MISSION_SCENARIO);
  let height = 18;
  const placer = {
    items: [{ uid: 'building-1', specId: 'office', lon: 1, lat: 2, groundH: 0,
      headingDeg: 0, cost: { totalKrw: 100 } }],
    serializeItems() { return this.items; },
    remove(uid: string) { this.items = this.items.filter((item) => item.uid !== uid); },
    restoreItem(item: typeof this.items[number]) { this.items.push(item); },
    select() {},
  };
  const store = new SitePlanStore({
    planId: 'persistence-test', placer,
    getTowerHeight: () => height, setTowerHeight: (value: number) => { height = value; },
    getMission: () => mission,
    setMission: (value: typeof mission) => { mission = value; },
    ipb: { items: [], clear() {}, addManual() {} },
  }) as SitePlanStore & StoreState;
  store.prime();
  t.after(() => {
    if (store._saveTimer) clearTimeout(store._saveTimer);
    if (previousStorage) Object.defineProperty(globalThis, 'localStorage', previousStorage);
    else Reflect.deleteProperty(globalThis, 'localStorage');
  });
  return { store, placer, storage, getMission: () => mission };
}

test('mission-only edits persist and survive undo, redo and reload', (t) => {
  const f = fixture(t);
  f.getMission().requirements.maxBudgetKrw = 123456;
  f.store.commit();
  assert.equal(f.store.undoStack.length, 1);
  f.store.flushPendingSave({ remote: false });
  assert.equal(f.store.loadSaved()?.mission?.requirements.maxBudgetKrw, 123456);
  assert.equal(f.store.undo(), true);
  assert.equal(f.getMission().requirements.maxBudgetKrw, null);
  assert.equal(f.store.redo(), true);
  assert.equal(f.getMission().requirements.maxBudgetKrw, 123456);
  f.store.flushPendingSave({ remote: false });
  f.store.applySnapshot(f.store.loadSaved());
  assert.equal(f.getMission().requirements.maxBudgetKrw, 123456);
});

test('nested live mutations do not rewrite earlier history or saved slots', (t) => {
  const f = fixture(t);
  f.store.saveSlot('A');
  f.placer.items[0].cost.totalKrw = 200;
  f.store.commit();
  f.store.saveSlot('B');
  assert.equal(costOf(f.store.undoStack[0]), 100);
  assert.equal(costOf(f.store.loadSlot('A')!), 100);
  assert.equal(costOf(f.store.loadSlot('B')!), 200);
  f.store.undo();
  assert.equal(f.placer.items[0].cost.totalKrw, 100);
  f.placer.items[0].cost.totalKrw = 300;
  assert.equal(costOf(f.store.lastSnapshot), 100);
});

test('applying a snapshot cancels an older pending autosave', (t) => {
  const f = fixture(t);
  const original = f.store.serialize();
  f.getMission().name = 'New project name';
  f.store.commit();
  f.store.applySnapshot(original);
  f.store.flushPendingSave({ remote: false });
  assert.equal(f.storage.has('gp-digital-twin:sitePlan'), false);
  assert.equal(f.getMission().name, original.mission?.name);
});

test('page-exit flush saves pending work locally without a network request', (t) => {
  const f = fixture(t);
  f.getMission().description = 'Unsaved edit';
  f.store.commit();
  f.store.flushPendingSave({ remote: false });
  assert.equal(f.store.loadSaved()?.mission?.description, 'Unsaved edit');
  assert.equal(f.store._pendingSnapshot, null);
  assert.equal((fetch as unknown as { mock: { callCount(): number } }).mock.callCount(), 0);
});

test('unchanged commits do not add history or schedule another save', (t) => {
  const { store } = fixture(t);
  store.commit();
  store.commit();
  assert.equal(store.undoStack.length, 0);
  assert.equal(store._pendingSnapshot, null);
});

test('failed local writes retain pending work for a later retry', (t) => {
  const f = fixture(t);
  t.mock.method(console, 'warn', () => {});
  const failingWrite = t.mock.method(localStorage, 'setItem', () => { throw new Error('quota'); });
  f.getMission().description = 'Keep this edit';
  f.store.commit();
  f.store.flushPendingSave({ remote: false });
  assert.notEqual(f.store._pendingSnapshot, null);
  failingWrite.mock.restore();
  f.store.flushPendingSave({ remote: false });
  assert.equal(f.store.loadSaved()?.mission?.description, 'Keep this edit');
  assert.equal(f.store._pendingSnapshot, null);
});

test('content keys preserve extension inputs and ignore object-key ordering', () => {
  const a = copyPlanSnapshot({ items: [], ipb: [], extension: { first: 1, second: 2 } });
  const b = { ...a, updatedAt: '2020-01-01', extension: { second: 2, first: 1 } };
  assert.equal(planContentKey(a), planContentKey(b));
  assert.notEqual(planContentKey(a), planContentKey({ ...b, extension: { first: 3, second: 2 } }));
});
