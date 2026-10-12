import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_TRAINING_EVIDENCE,
  normalizeTrainingEvidence,
  trainingEvidenceFingerprint,
  validateTrainingEvidence,
} from '../src/domain/trainingEvidenceContract';

test('training evidence contract ships a clearly synthetic, aggregated training dataset', () => {
    const dataset = normalizeTrainingEvidence(DEFAULT_TRAINING_EVIDENCE);
    assert.equal(dataset.synthetic, true);
    assert.equal(dataset.source.status, 'synthetic');
    assert.equal(dataset.gridSizeM, 50);
    assert.ok(dataset.hotspots.length >= 3);
    assert.equal(dataset.hotspots.every((hotspot) => hotspot.recurrence.sessions >= 3), true);
});

test('training evidence contract keeps the fingerprint stable for the same evidence content', () => {
    const first = trainingEvidenceFingerprint(DEFAULT_TRAINING_EVIDENCE);
    const second = trainingEvidenceFingerprint({ ...DEFAULT_TRAINING_EVIDENCE, name: '표시명 변경' });
    const changed = trainingEvidenceFingerprint({
      ...DEFAULT_TRAINING_EVIDENCE,
      sessions: DEFAULT_TRAINING_EVIDENCE.sessions + 1,
    });
    assert.equal(first, second);
  assert.notEqual(changed, first);
});

test('training evidence validation rejects an untraceable import', () => {
  const invalid = { ...DEFAULT_TRAINING_EVIDENCE, schema: 'unknown.schema', hotspots: [] };
  const check = validateTrainingEvidence(invalid);
  assert.equal(check.ok, false);
  assert.match(check.errors.join(' '), /schema/);
  assert.match(check.errors.join(' '), /hotspot/);
});

test('training evidence validation rejects a need without candidate geometry', () => {
  const firstHotspot = DEFAULT_TRAINING_EVIDENCE.hotspots[0];
  const firstNeed = firstHotspot.facilityNeeds[0];
  const invalid = {
    ...DEFAULT_TRAINING_EVIDENCE,
    hotspots: [{ ...firstHotspot, facilityNeeds: [{ ...firstNeed, candidates: [] }] }],
  };
  const check = validateTrainingEvidence(invalid);
  assert.equal(check.ok, false);
  assert.match(check.errors.join(' '), /candidates/);
});

test('training evidence validation accepts the exported synthetic contract', () => {
  const check = validateTrainingEvidence(DEFAULT_TRAINING_EVIDENCE);
  assert.deepEqual(check, { ok: true, errors: [] });
});
