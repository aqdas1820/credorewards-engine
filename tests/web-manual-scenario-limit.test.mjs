import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  parseScenarioText, readLocalScenario, MAX_SCENARIO_FILE_BYTES
} from '../web/local-import.mjs';

const base = { year: 2026, cards: [{ id: 'synthetic' }], transactions: [] };

test('pasted JSON accepts the exact UTF-8 byte boundary', () => {
  const empty = JSON.stringify({ ...base, note: '' });
  const room = MAX_SCENARIO_FILE_BYTES - Buffer.byteLength(empty, 'utf8');
  const note = 'é' + 'a'.repeat(room - 2);
  const text = JSON.stringify({ ...base, note });
  assert.equal(Buffer.byteLength(text, 'utf8'), MAX_SCENARIO_FILE_BYTES);
  assert.equal(parseScenarioText(text).note, note);
});

test('pasted JSON rejects oversized ASCII and multibyte payloads before parsing', () => {
  const ascii = JSON.stringify({ ...base, note: 'x'.repeat(MAX_SCENARIO_FILE_BYTES) });
  assert.throws(() => parseScenarioText(ascii), /128 KiB/);
  const multibyte = JSON.stringify({ ...base, note: 'é'.repeat(70000) });
  assert.ok(multibyte.length < MAX_SCENARIO_FILE_BYTES);
  assert.ok(Buffer.byteLength(multibyte, 'utf8') > MAX_SCENARIO_FILE_BYTES);
  assert.throws(() => parseScenarioText(multibyte), /128 KiB/);
  assert.throws(() => parseScenarioText(''), /128 KiB/);
  assert.throws(() => parseScenarioText(null), /128 KiB/);
});

test('manual and local-file parsing share structural validation', async () => {
  const valid = JSON.stringify(base);
  assert.deepEqual(parseScenarioText(valid), base);
  assert.deepEqual(await readLocalScenario({
    size: Buffer.byteLength(valid), text: async () => valid
  }), base);
  for (const malformed of ['{', '{}', 'null', '[]', '{"year":2026,"cards":[]}' ]) {
    assert.throws(() => parseScenarioText(malformed), /JSON|Scenario must include/);
  }
});

test('both browser calculation buttons use the bounded parser', () => {
  const app = readFileSync(new URL('../web/app.mjs', import.meta.url), 'utf8');
  assert.equal((app.match(/parseScenarioText\(input\.value\)/g) ?? []).length, 2);
  assert.doesNotMatch(app, /JSON\.parse\(input\.value\)/);
});
