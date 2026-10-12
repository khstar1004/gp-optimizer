const test = require('node:test');
const assert = require('node:assert/strict');
const { readPlan, writePlan, deletePlan } = require('../server/planStore.cts');

test('file adapter provides atomic versioned writes with ETag concurrency', () => {
  const id = `contract-test-${process.pid}`;
  const plan = {
    schema: 'gp-digital-twin.plan',
    version: 2,
    towerHeight: 18,
    items: [],
    ipb: [],
    provenance: {
      source: 'browser-local', algorithmVersion: 'gp-digital-twin-optimizer-v2',
      terrainSource: 'test', capturedAt: new Date().toISOString(),
    },
  };
  try {
    const first = writePlan(id, plan);
    assert.equal(first.status, 200);
    const current = readPlan(id);
    assert.equal(current.status, 200);
    assert.equal(writePlan(id, plan, '"stale"').status, 409);
    assert.equal(writePlan(id, plan, current.etag).status, 200);
  } finally {
    assert.equal(deletePlan(id).status, 204);
  }
});
