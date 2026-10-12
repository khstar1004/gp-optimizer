import assert from 'node:assert/strict';
import test from 'node:test';
import {
  DEFAULT_MISSION_SCENARIO,
  MISSION_SCHEMA,
  MISSION_SCHEMA_VERSION,
  missionFingerprint,
  normalizeMissionScenario,
  validateMissionScenario,
} from '../src/domain/missionContract';

test('normalizes a mission into a versioned, bounded scenario', () => {
  const mission = normalizeMissionScenario({
    id: 'pilot-1',
    name: 'Pilot',
    siteId: 'SITE-1',
    siteCenter: { lon: 181, lat: 91 },
    sectorCenterAz: -30,
    requirements: { personnel: 12.6, residentPersonnel: 99, coverageTargetPercent: 140 },
    environment: { dayOfYear: 0, minuteOfDay: 1500, intensity: 2, windMps: -4 },
  });

  assert.equal(mission.schema, MISSION_SCHEMA);
  assert.equal(mission.version, MISSION_SCHEMA_VERSION);
  assert.equal(mission.requirements.personnel, 13);
  assert.equal(mission.requirements.residentPersonnel, 13);
  assert.equal(mission.requirements.coverageTargetPercent, 100);
  assert.equal(mission.environment.dayOfYear, 365);
  assert.equal(mission.environment.minuteOfDay, 60);
  assert.equal(mission.environment.intensity, 1);
  assert.equal(mission.environment.windMps, 0);
  assert.equal(mission.sectorCenterAz, 330);
});

test('validates a complete mission and reports missing data sources', () => {
  const valid = validateMissionScenario(DEFAULT_MISSION_SCENARIO);
  assert.equal(valid.ok, true);
  const invalid = validateMissionScenario({
    ...DEFAULT_MISSION_SCENARIO,
    dataSources: [],
    requirements: { ...DEFAULT_MISSION_SCENARIO.requirements, requiredMobilityModes: [] },
  });
  assert.equal(invalid.ok, false);
  assert.ok(invalid.errors.includes('at least one data source is required'));
  assert.ok(invalid.errors.includes('at least one mobility mode is required'));
});

test('mission fingerprint changes when decision inputs change but ignores timestamps', () => {
  const first = missionFingerprint(DEFAULT_MISSION_SCENARIO);
  const sameInputs = missionFingerprint({ ...DEFAULT_MISSION_SCENARIO, updatedAt: '2030-01-01T00:00:00.000Z' });
  const changed = missionFingerprint({
    ...DEFAULT_MISSION_SCENARIO,
    environment: { ...DEFAULT_MISSION_SCENARIO.environment, weather: 'snow' },
  });
  assert.equal(first, sameInputs);
  assert.notEqual(first, changed);
});
