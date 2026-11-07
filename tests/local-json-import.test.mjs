import test from 'node:test';
import assert from 'node:assert/strict';
import { readLocalScenario, MAX_SCENARIO_FILE_BYTES } from '../web/local-import.mjs';

const good = { year: 2026, cards: [{ id: 'synthetic' }], transactions: [] };
const file = (content, size = Buffer.byteLength(content)) => ({
  size,
  text: async () => content
});

test('JSON import parses locally with preserved scenario structure', async () => {
  assert.deepEqual(await readLocalScenario(file(JSON.stringify(good))), good);
  assert.equal(MAX_SCENARIO_FILE_BYTES, 131072);
});
test('JSON import rejects absent, oversized, invalid and malformed inputs', async () => {
  await assert.rejects(() => readLocalScenario(null), /Select a local JSON file/);
  await assert.rejects(() => readLocalScenario(file('', 0)), /128 KiB/);
  await assert.rejects(() => readLocalScenario(file('{}', MAX_SCENARIO_FILE_BYTES + 1)), /128 KiB/);
  await assert.rejects(() => readLocalScenario(file('{')), /JSON/);
  for (const candidate of [null, [], {}, { year: '2026', cards: [], transactions: [] },
    { year: 2026, cards: {}, transactions: [] }, { year: 2026, cards: [], transactions: {} }]) {
    await assert.rejects(() => readLocalScenario(file(JSON.stringify(candidate))), /Scenario must include/);
  }
});
