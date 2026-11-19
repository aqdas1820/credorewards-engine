import test from 'node:test';
import assert from 'node:assert/strict';
import { compareCards } from '../dist/index.js';

const max = Number.MAX_SAFE_INTEGER;
const card = (id, annualFeePaise, rateBps) => ({
  id,
  name: `Synthetic ${id}`,
  annualFeePaise,
  rules: [{ id: 'all', category: '*', rateBps }]
});
const transactions = [
  { id: 'spend', month: '2026-01', category: 'general', amountPaise: max }
];

test('comparison gap at maximum safe integer remains exact', () => {
  const result = compareCards([
    card('full', 0, 10000),
    card('zero', 0, 0)
  ], transactions, 2026);
  assert.deepEqual(result.entries.map(entry => [entry.cardId, entry.differenceFromLeaderPaise]), [
    ['full', 0],
    ['zero', max]
  ]);
});

test('comparison rejects a leader gap exceeding safe integer range', () => {
  const beforeTransactions = structuredClone(transactions);
  for (const cards of [
    [card('full', 0, 10000), card('fee', max, 0)],
    [card('fee', max, 0), card('full', 0, 10000)]
  ]) {
    const beforeCards = structuredClone(cards);
    assert.throws(() => compareCards(cards, transactions, 2026),
      /differenceFromLeaderPaise exceeds safe integer range/);
    assert.deepEqual(cards, beforeCards);
    assert.deepEqual(transactions, beforeTransactions);
  }
});
