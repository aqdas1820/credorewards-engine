import test from 'node:test';
import assert from 'node:assert/strict';
import { readLocalScenario, MAX_SCENARIO_FILE_BYTES } from '../web/local-import.mjs';

const base = { year: 2026, cards: [{ id: 'fictional' }], transactions: [] };
const make = (text, size = Buffer.byteLength(text, 'utf8')) => ({
  size, text: async () => text
});

test('multi-byte UTF-8 payload is accepted at exact 128 KiB and rejected one byte beyond', async () => {
  const empty = JSON.stringify({ ...base, note: '' });
  const available = MAX_SCENARIO_FILE_BYTES - Buffer.byteLength(empty, 'utf8');
  // Use one 2-byte code point, then ASCII to fill an exact byte boundary.
  const note = 'é' + 'a'.repeat(available - 2);
  const exact = JSON.stringify({ ...base, note });
  assert.equal(Buffer.byteLength(exact, 'utf8'), MAX_SCENARIO_FILE_BYTES);
  assert.equal((await readLocalScenario(make(exact))).note, note);

  const tooLarge = JSON.stringify({ ...base, note: note + 'b' });
  assert.equal(Buffer.byteLength(tooLarge, 'utf8'), MAX_SCENARIO_FILE_BYTES + 1);
  await assert.rejects(() => readLocalScenario(make(tooLarge, 1)), /128 KiB/);
  await assert.rejects(() => readLocalScenario(make(tooLarge)), /128 KiB/);
});

test('a misleadingly large declared size is rejected before reading file content', async () => {
  let reads = 0;
  const candidate = {
    size: MAX_SCENARIO_FILE_BYTES + 1,
    text: async () => { reads++; return JSON.stringify(base); }
  };
  await assert.rejects(() => readLocalScenario(candidate), /128 KiB/);
  assert.equal(reads, 0);
});

test('local file is read once, with no mutation of the caller-owned payload', async () => {
  let reads = 0;
  const payload = JSON.stringify(base);
  const candidate = {
    size: Buffer.byteLength(payload),
    text: async () => { reads++; return payload; }
  };
  assert.deepEqual(await readLocalScenario(candidate), base);
  assert.equal(reads, 1);
  assert.equal(candidate.size, Buffer.byteLength(payload));
});

test('file reader rejection propagates without accepting an empty scenario', async () => {
  const failure = new Error('synthetic file read failed');
  await assert.rejects(
    () => readLocalScenario({ size: 8, text: async () => { throw failure; } }),
    error => error === failure
  );
});
