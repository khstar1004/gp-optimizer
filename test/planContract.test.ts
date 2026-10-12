import test from 'node:test';
import assert from 'node:assert/strict';
import {
  PLAN_SCHEMA, PLAN_SCHEMA_VERSION, normalizePlanSnapshot, validatePlanSnapshot, planFingerprint,
} from '../src/domain/planContract';
import { DEFAULT_MISSION_SCENARIO } from '../src/domain/missionContract';

test('normalizes v1 snapshots into a versioned, reproducible contract', () => {
  const plan = normalizePlanSnapshot({
    version: 1,
    towerHeight: '21',
    items: [{ specId: 'GUARD_POST', lon: 128.1, lat: 38.3, headingDeg: '45' }],
    ipb: [{ kind: 'NAI', lon: 128.11, lat: 38.31, note: 7 }],
  });
  assert.equal(plan.schema, PLAN_SCHEMA);
  assert.equal(plan.version, PLAN_SCHEMA_VERSION);
  assert.equal(plan.towerHeight, 21);
  assert.equal(plan.items[0].headingDeg, 45);
  assert.equal(plan.ipb[0].note, '7');
  assert.equal(plan.provenance.source, 'browser-local');
  assert.equal(validatePlanSnapshot(plan).ok, true);
});

test('fingerprint is stable for equivalent plans', () => {
  const a = normalizePlanSnapshot({ towerHeight: 18, items: [], ipb: [] });
  const b = normalizePlanSnapshot({ ...a, updatedAt: 'not relevant' });
  assert.equal(planFingerprint(a), planFingerprint(b));
});

test('rejects an untraceable plan payload', () => {
  const result = validatePlanSnapshot({
    schema: PLAN_SCHEMA, version: PLAN_SCHEMA_VERSION, towerHeight: 18, items: [], ipb: [],
  });
  assert.equal(result.ok, false);
  assert.match(result.errors.join(' '), /provenance/);
});

test('keeps a versioned mission with the plan for reproducible alternatives', () => {
  const plan = normalizePlanSnapshot({
    towerHeight: 18, items: [], ipb: [], mission: DEFAULT_MISSION_SCENARIO,
  });
  assert.equal(plan.mission?.schema, 'gp-digital-twin.mission');
  assert.equal(validatePlanSnapshot(plan).ok, true);
  const changed = normalizePlanSnapshot({
    ...plan,
    mission: { ...DEFAULT_MISSION_SCENARIO, environment: { ...DEFAULT_MISSION_SCENARIO.environment, weather: 'snow' } },
  });
  assert.notEqual(planFingerprint(plan), planFingerprint(changed));
});
