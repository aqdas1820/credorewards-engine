import assert from 'node:assert/strict';
import test from 'node:test';
import { compareCards } from '../dist/index.js';

const MAX = Number.MAX_SAFE_INTEGER;
const card = (id, annualFeePaise, rateBps) => ({
  id,
  name: `Fictional ${id}`,
  annualFeePaise,
  rules: [{ id: 'all', category: '*', rateBps }]
});
const oneTransaction = [
  { id: 'synthetic-1', month: '2026-01', category: 'fictional', amountPaise: MAX }
];

test('comparison permits an exact maximum-safe-integer leader gap', () => {
  const cards = [card('no-fee', 0, 0), card('max-fee', MAX, 0)];
  const result = compareCards(cards, [], 2026);
  assert.deepEqual(result.entries.map(entry => entry.differenceFromLeaderPaise), [0, MAX]);
  assert.deepEqual(result.entries.map(entry => entry.rank), [1, 2]);
});

test('comparison rejects a leader gap overflowing safe integer paise even when individual results are safe', () => {
  const cards = [card('full-reward', 0, 10000), card('max-fee', MAX, 0)];
  const original = structuredClone({ cards, oneTransaction });
  assert.throws(
    () => compareCards(cards, oneTransaction, 2026),
    /differenceFromLeaderPaise exceeds safe integer range/
  );
  assert.deepEqual({ cards, oneTransaction }, original);
});
