import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateRewards, compareCards, createBatchReport } from '../dist/index.js';

const MAX = Number.MAX_SAFE_INTEGER;
const card = (id, fee = MAX) => ({
  id, name: 'Synthetic exact-boundary ' + id, annualFeePaise: fee,
  rules: [{ id: 'zero', category: '*', rateBps: 0 }]
});
const tx = (id, amountPaise) => ({
  id, month: '2026-12', category: 'synthetic', amountPaise
});

test('exact safe-integer annual fee remains negative net value across all public entry points', () => {
  const cards = [card('expensive'), card('free', 0)];
  const transactions = [tx('one', MAX)];
  const snapshot = structuredClone({ cards, transactions });
  const single = calculateRewards(cards[0], transactions, 2026);
  assert.equal(single.totalSpendPaise, MAX);
  assert.equal(single.rewardEligibleSpendPaise, MAX);
  assert.equal(single.feeWaiverEligibleSpendPaise, MAX);
  assert.equal(single.totalRewardsPaise, 0);
  assert.equal(single.annualFeeChargedPaise, MAX);
  assert.equal(single.netAnnualValuePaise, -MAX);
  assert.equal(single.transactions[0].reason, 'zero_reward');
  const comparison = compareCards(cards, transactions, 2026);
  assert.deepEqual(comparison.entries.map(e => [e.cardId, e.netAnnualValuePaise]),
    [['free', 0], ['expensive', -MAX]]);
  const batch = createBatchReport([{ id: 'exact-limit', year: 2026, cards, transactions }]);
  assert.deepEqual(batch.scenarios[0].comparison.entries, comparison.entries);
  assert.deepEqual({ cards, transactions }, snapshot);
});

test('waiver at exact maximum safe spend is inclusive, and excluded rewards do not affect waiver', () => {
  const terms = {
    ...card('waiver'),
    annualFeeWaiverThresholdPaise: MAX,
    excludedCategories: ['synthetic'],
    rules: []
  };
  const result = calculateRewards(terms, [tx('one', MAX)], 2026);
  assert.equal(result.rewardEligibleSpendPaise, 0);
  assert.equal(result.feeWaiverEligibleSpendPaise, MAX);
  assert.equal(result.annualFeeWaived, true);
  assert.equal(result.annualFeeChargedPaise, 0);
  assert.equal(result.netAnnualValuePaise, 0);
});

test('overflow is rejected even for excluded transactions that earn no rewards', () => {
  const terms = { ...card('excluded'), excludedCategories: ['synthetic'], rules: [] };
  const transactions = [tx('a', MAX), tx('b', 1)];
  assert.throws(() => calculateRewards(terms, transactions, 2026), /totalSpendPaise exceeds safe integer range/);
  assert.throws(() => compareCards([terms, card('other')], transactions, 2026),
    /totalSpendPaise exceeds safe integer range/);
  assert.throws(() => createBatchReport([
    { id: 'valid', year: 2026, cards: [terms, card('other')], transactions: [] },
    { id: 'overflow', year: 2026, cards: [terms, card('other')], transactions }
  ]), /totalSpendPaise exceeds safe integer range/);
});
