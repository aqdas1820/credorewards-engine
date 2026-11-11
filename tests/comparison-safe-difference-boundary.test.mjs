import test from 'node:test';
import assert from 'node:assert/strict';
import { compareCards } from '../dist/index.js';

const max = Number.MAX_SAFE_INTEGER;
const transactions = Object.freeze([
  Object.freeze({ id: 'large', month: '2026-01', category: 'synthetic', amountPaise: max })
]);

function card(id, rateBps, annualFeePaise = 0) {
  return {
    id,
    name: `Synthetic ${id}`,
    annualFeePaise,
    rules: [{ id: 'all', category: '*', rateBps }]
  };
}

test('comparison rejects an unsafe leader gap even when both net values are individually safe', () => {
  const best = card('best', 10000);
  const worst = card('worst', 0, max);
  assert.throws(
    () => compareCards([worst, best], transactions, 2026),
    /differenceFromLeaderPaise exceeds safe integer range/
  );
  assert.equal(transactions[0].amountPaise, max);
  assert.equal(best.rules[0].rateBps, 10000);
});

test('comparison preserves the exact safe-integer gap at the boundary', () => {
  const result = compareCards([card('zero', 0), card('best', 10000)], transactions, 2026);
  assert.deepEqual(result.entries.map(entry => entry.cardId), ['best', 'zero']);
  assert.deepEqual(result.entries.map(entry => entry.differenceFromLeaderPaise), [0, max]);
  assert.deepEqual(result.entries.map(entry => entry.rank), [1, 2]);
});
