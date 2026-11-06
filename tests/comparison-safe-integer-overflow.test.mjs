import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateRewards, compareCards, createBatchReport } from '../dist/index.js';

const max = Number.MAX_SAFE_INTEGER;
const tx = (id, amountPaise, month = '2026-01') => ({
  id, month, category: 'synthetic', amountPaise
});
const card = (id, rateBps, annualFeePaise = 0) => ({
  id, name: 'Synthetic ' + id, annualFeePaise,
  rules: [{ id: 'base', category: '*', rateBps }]
});

test('maximum safe integer reward remains exact', () => {
  const result = calculateRewards(card('full', 10000), [tx('one', max)], 2026);
  assert.equal(result.totalSpendPaise, max);
  assert.equal(result.totalRewardsPaise, max);
  assert.equal(result.netAnnualValuePaise, max);
  assert.equal(result.transactions[0].earnedPaise, max);
});

test('annual spend exceeding safe integer fails closed across engine and batch', () => {
  const transactions = [tx('one', max), tx('two', 1)];
  assert.throws(
    () => calculateRewards(card('zero', 0), transactions, 2026),
    /totalSpendPaise exceeds safe integer range/
  );
  assert.throws(
    () => createBatchReport([{ id: 'overflow', year: 2026,
      cards: [card('a', 0), card('b', 0)], transactions }]),
    /scenario overflow: totalSpendPaise exceeds safe integer range/
  );
});

test('comparison rejects unsafe leader gap even when individual values are safe', () => {
  const transactions = [tx('one', max)];
  const winner = card('winner', 10000);
  const loser = card('loser', 0, max);
  assert.equal(calculateRewards(winner, transactions, 2026).netAnnualValuePaise, max);
  assert.equal(calculateRewards(loser, transactions, 2026).netAnnualValuePaise, -max);
  assert.throws(
    () => compareCards([loser, winner], transactions, 2026),
    /differenceFromLeaderPaise exceeds safe integer range/
  );
});

test('safe negative net values preserve exact leader gaps and ordering', () => {
  const result = compareCards([card('z', 0, 3), card('a', 0, 2)], [tx('one', 1)], 2026);
  assert.deepEqual(result.entries.map(entry => [entry.cardId, entry.netAnnualValuePaise,
    entry.differenceFromLeaderPaise, entry.rank]), [
    ['a', -2, 0, 1], ['z', -3, 1, 2]
  ]);
  assert.deepEqual(result.leaderCardIds, ['a']);
});
