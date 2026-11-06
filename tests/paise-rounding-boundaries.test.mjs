import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateRewards, compareCards, createBatchReport } from '../dist/index.js';

const card = (id, rateBps, overrides = {}) => ({
  id, name: 'Synthetic ' + id, annualFeePaise: 0,
  rules: [{ id: 'base', category: '*', rateBps }], ...overrides
});
const tx = (id, amountPaise, month = '2026-01') => ({
  id, amountPaise, month, category: 'synthetic'
});

test('basis-point rounding uses floor per transaction, not aggregate spend', () => {
  const result = calculateRewards(card('fractional', 3333), [
    tx('a', 3), tx('b', 4), tx('c', 7)
  ], 2026);
  assert.deepEqual(result.transactions.map(row => row.earnedPaise), [0, 1, 2]);
  assert.deepEqual(result.transactions.map(row => row.reason),
    ['rounded_to_zero', 'earned', 'earned']);
  assert.equal(result.totalRewardsPaise, 3);
  assert.equal(result.totalSpendPaise, 14);
});

test('bigint intermediate arithmetic preserves exact 1-bps rewards at safe-integer boundary', () => {
  const amount = Number.MAX_SAFE_INTEGER;
  const result = calculateRewards(card('large', 1), [tx('large', amount)], 2026);
  const expected = Number(BigInt(amount) / 10000n);
  assert.equal(result.totalRewardsPaise, expected);
  assert.equal(result.totalSpendPaise, amount);
  assert.equal(result.transactions[0].earnedPaise, expected);
});

test('full-rate reward and annual fee remain exact at safe-integer boundary', () => {
  const amount = Number.MAX_SAFE_INTEGER;
  const result = calculateRewards(card('full', 10000, {
    annualFeePaise: 1
  }), [tx('large', amount)], 2026);
  assert.equal(result.totalRewardsPaise, amount);
  assert.equal(result.annualFeeChargedPaise, 1);
  assert.equal(result.netAnnualValuePaise, amount - 1);
});

test('a cap below raw reward is applied after per-transaction rounding', () => {
  const capped = card('capped', 3333, {
    rules: [{ id: 'base', category: '*', rateBps: 3333,
      monthlyCapPaise: 2, annualCapPaise: 3 }]
  });
  const transactions = [tx('a', 7), tx('b', 7), tx('c', 7, '2026-02')];
  const result = calculateRewards(capped, transactions, 2026);
  assert.deepEqual(result.transactions.map(row => row.earnedPaise), [2, 0, 1]);
  assert.equal(result.totalRewardsPaise, 3);
  const report = createBatchReport([{
    id: 'synthetic-rounding', year: 2026,
    cards: [capped, card('flat', 100)], transactions
  }]);
  const months = report.scenarios[0].monthlyByCard.find(row => row.cardId === 'capped').months;
  assert.deepEqual(months.slice(0, 2).map(row => row.totalRewardsPaise), [2, 1]);
  assert.equal(months.reduce((sum, row) => sum + row.totalRewardsPaise, 0), 3);
});

test('comparison ranks rounded net annual values and preserves exact ties', () => {
  const transactions = [tx('a', 3), tx('b', 4), tx('c', 7)];
  const cards = [
    card('z', 3333), card('a', 3333),
    card('low', 100, { annualFeePaise: 1 })
  ];
  const result = compareCards(cards, transactions, 2026);
  assert.deepEqual(result.entries.map(row => [row.cardId, row.rank, row.netAnnualValuePaise]),
    [['a', 1, 3], ['z', 1, 3], ['low', 3, -1]]);
  assert.deepEqual(result.leaderCardIds, ['a', 'z']);
});
