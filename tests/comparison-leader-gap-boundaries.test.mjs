import test from 'node:test';
import assert from 'node:assert/strict';
import { compareCards } from '../dist/index.js';

const max = Number.MAX_SAFE_INTEGER;
const transactions = Object.freeze([
  Object.freeze({ id: 'synthetic-max', month: '2026-01', category: 'test', amountPaise: max })
]);

function card(id, rateBps, annualFeePaise = 0) {
  return {
    id,
    name: id,
    annualFeePaise,
    rules: [{ id: `${id}-rule`, category: 'test', rateBps }]
  };
}

test('comparison preserves an exactly safe leader gap without rounding', () => {
  const cards = [card('full', 10000), card('none', 0)];
  const result = compareCards(cards, transactions, 2026);
  assert.deepEqual(result.leaderCardIds, ['full']);
  assert.deepEqual(result.entries.map(({ cardId, differenceFromLeaderPaise }) =>
    [cardId, differenceFromLeaderPaise]), [['full', 0], ['none', max]]);
  assert.equal(result.entries[0].calculation.totalRewardsPaise, max);
  assert.equal(transactions[0].amountPaise, max);
});

test('comparison rejects a leader gap exceeding safe integer range even when each card result is safe', () => {
  const cards = [card('full', 10000), card('fee', 0, max)];
  assert.throws(
    () => compareCards(cards, transactions, 2026),
    /differenceFromLeaderPaise exceeds safe integer range/
  );
});
