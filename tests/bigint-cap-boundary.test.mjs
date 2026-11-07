import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateRewards, compareCards } from '../dist/index.js';

// Boundary regression: intermediate currency math must stay exact in bigint,
// including amounts too large for safe floating-point multiplication.
const MAX = Number.MAX_SAFE_INTEGER;
const card = (overrides = {}) => ({
  id: 'synthetic-max', name: 'Synthetic boundary card', annualFeePaise: 0,
  rules: [{ id: 'base', category: '*', rateBps: 10000 }],
  ...overrides
});
const tx = (id, amountPaise, month = '2026-01') =>
  ({ id, month, category: 'synthetic', amountPaise });

test('maximum safe paise at 100% is exact, never floating-point rounded', () => {
  const result = calculateRewards(card(), [tx('max', MAX)], 2026);
  assert.equal(result.totalSpendPaise, MAX);
  assert.equal(result.rewardEligibleSpendPaise, MAX);
  assert.equal(result.feeWaiverEligibleSpendPaise, MAX);
  assert.equal(result.totalRewardsPaise, MAX);
  assert.equal(result.netAnnualValuePaise, MAX);
  assert.deepEqual(result.transactions.map(t => t.earnedPaise), [MAX]);
});

test('monthly and annual caps remain exact at the safe integer boundary', () => {
  const terms = card({
    rules: [{ id: 'base', category: '*', rateBps: 10000,
      monthlyCapPaise: MAX - 2, annualCapPaise: MAX - 1 }]
  });
  const result = calculateRewards(terms, [tx('a', MAX - 2)], 2026);
  assert.equal(result.totalRewardsPaise, MAX - 2);
  assert.equal(result.transactions[0].earnedPaise, MAX - 2);
  // A separate transaction set stays safely within total spend limits.
  const small = calculateRewards(card({
    rules: [{ id: 'base', category: '*', rateBps: 10000,
      monthlyCapPaise: 7, annualCapPaise: 9 }]
  }), [tx('b', 5, '2026-02'), tx('a', 7), tx('c', 5, '2026-03')], 2026);
  assert.deepEqual(small.transactions.map(t => [t.id, t.earnedPaise]),
    [['a', 7], ['b', 2], ['c', 0]]);
  assert.equal(small.totalRewardsPaise, 9);
});

test('sum overflow rejects rather than emitting unsafe currency', () => {
  assert.throws(() => calculateRewards(card(), [tx('a', MAX), tx('b', 1)], 2026),
    /totalSpendPaise exceeds safe integer range/);
});

test('comparison preserves exact leader gap with negative net and safe reward', () => {
  const first = card({ id: 'zero', rules: [{ id: 'base', category: '*', rateBps: 0 }] });
  const second = card({ id: 'full', rules: [{ id: 'base', category: '*', rateBps: 10000 }] });
  const comparison = compareCards([first, second], [tx('large', MAX)], 2026);
  assert.deepEqual(comparison.leaderCardIds, ['full']);
  assert.equal(comparison.entries[0].netAnnualValuePaise, MAX);
  assert.equal(comparison.entries[1].differenceFromLeaderPaise, MAX);
});
