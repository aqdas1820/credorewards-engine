import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateRewards } from '../dist/index.js';

// Fictional zero-boundary inputs; no issuer terms or API changes.
const card = Object.freeze({
  id: 'synthetic-zero-boundaries',
  name: 'Synthetic zero boundaries',
  annualFeePaise: 199,
  annualFeeWaiverThresholdPaise: 0,
  excludedCategories: Object.freeze(['excluded']),
  rules: Object.freeze([
    Object.freeze({ id: 'zero-cap', category: 'capped', rateBps: 10000, monthlyCapPaise: 0 }),
    Object.freeze({ id: 'zero-rate', category: 'no-rate', rateBps: 0 }),
    Object.freeze({ id: 'fraction', category: 'tiny', rateBps: 1 })
  ])
});
const transactions = Object.freeze([
  Object.freeze({ id: 'd', month: '2026-02', category: 'excluded', amountPaise: 100 }),
  Object.freeze({ id: 'c', month: '2026-01', category: 'tiny', amountPaise: 1 }),
  Object.freeze({ id: 'b', month: '2026-01', category: 'no-rate', amountPaise: 100 }),
  Object.freeze({ id: 'a', month: '2026-01', category: 'capped', amountPaise: 100 })
]);

test('zero cap, zero rate, and sub-paisa rounding have distinct audit reasons', () => {
  const result = calculateRewards(card, transactions, 2026);
  assert.equal(result.totalSpendPaise, 301);
  assert.equal(result.rewardEligibleSpendPaise, 201);
  assert.equal(result.feeWaiverEligibleSpendPaise, 301);
  assert.equal(result.totalRewardsPaise, 0);
  assert.equal(result.annualFeeWaived, true);
  assert.equal(result.annualFeeChargedPaise, 0);
  assert.equal(result.netAnnualValuePaise, 0);
  assert.deepEqual(result.transactions.map(({ id, earnedPaise, reason }) => [id, earnedPaise, reason]), [
    ['a', 0, 'reward_cap_reached'],
    ['b', 0, 'zero_reward'],
    ['c', 0, 'rounded_to_zero'],
    ['d', 0, 'excluded_category']
  ]);
});

test('zero-boundary results are order-independent and do not mutate frozen inputs', () => {
  const expected = calculateRewards(card, transactions, 2026);
  assert.deepEqual(calculateRewards(card, [...transactions].reverse(), 2026), expected);
  assert.equal(transactions[0].id, 'd');
  assert.equal(card.rules[0].monthlyCapPaise, 0);
});
