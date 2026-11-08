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

test('local JSON import checks actual UTF-8 bytes even if file metadata underreports size', async () => {
  const ascii = JSON.stringify({ ...good, note: 'x'.repeat(MAX_SCENARIO_FILE_BYTES) });
  await assert.rejects(() => readLocalScenario(file(ascii, 64)), /128 KiB/);

  // JavaScript string length counts UTF-16 code units, not UTF-8 file bytes.
  const unicode = JSON.stringify({ ...good, note: 'é'.repeat(70000) });
  assert.ok(unicode.length < MAX_SCENARIO_FILE_BYTES);
  assert.ok(Buffer.byteLength(unicode, 'utf8') > MAX_SCENARIO_FILE_BYTES);
  await assert.rejects(() => readLocalScenario(file(unicode, 64)), /128 KiB/);

  for (const size of [NaN, Infinity, 0.5, -1, Number.MAX_SAFE_INTEGER + 1]) {
    await assert.rejects(() => readLocalScenario(file('{}', size)), /Select a local JSON file|128 KiB/);
  }
  await assert.rejects(() => readLocalScenario(file({ not: 'text' }, 4)), /128 KiB/);
  await assert.rejects(() => readLocalScenario(file('', 4)), /128 KiB/);
});

test('exact 128 KiB UTF-8 JSON remains importable when the payload is valid', async () => {
  const base = JSON.stringify({ ...good, note: '' });
  const note = 'x'.repeat(MAX_SCENARIO_FILE_BYTES - Buffer.byteLength(base));
  const json = JSON.stringify({ ...good, note });
  assert.equal(Buffer.byteLength(json), MAX_SCENARIO_FILE_BYTES);
  const result = await readLocalScenario(file(json));
  assert.equal(result.year, 2026);
  assert.equal(result.note, note);
  assert.deepEqual(result.cards, good.cards);
});
