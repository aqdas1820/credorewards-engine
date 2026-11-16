import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateRewards } from '../dist/index.js';

const card = (overrides = {}) => ({
  id: 'synthetic-boundaries',
  name: 'Synthetic boundary card',
  annualFeePaise: 0,
  rules: [{ id: 'groceries', category: 'groceries', rateBps: 3333 }],
  ...overrides
});
const tx = (id, amountPaise, month = '2026-01') => ({
  id, month, category: 'groceries', amountPaise
});

test('fractional-paisa cashback always floors per transaction, not after aggregation', () => {
  const result = calculateRewards(card(), [tx('a', 1), tx('b', 1), tx('c', 1), tx('d', 3)], 2026);
  assert.deepEqual(result.transactions.map(row => row.earnedPaise), [0, 0, 0, 0]);
  assert.equal(result.totalRewardsPaise, 0);
  assert.equal(result.totalSpendPaise, 6);
  assert.equal(result.netAnnualValuePaise, 0);
});

test('zero monthly cap never earns even when the uncapped rate is positive', () => {
  const terms = card({ rules: [{ id: 'groceries', category: 'groceries', rateBps: 10000, monthlyCapPaise: 0 }] });
  const result = calculateRewards(terms, [tx('a', 10000)], 2026);
  assert.equal(result.transactions[0].earnedPaise, 0);
  assert.equal(result.transactions[0].reason, 'reward_cap_reached');
  assert.equal(result.totalRewardsPaise, 0);
});

test('fee waiver threshold is inclusive and independent of cashback caps', () => {
  const terms = card({
    annualFeePaise: 500,
    annualFeeWaiverThresholdPaise: 10000,
    rules: [{ id: 'groceries', category: 'groceries', rateBps: 10000, annualCapPaise: 0 }]
  });
  const below = calculateRewards(terms, [tx('a', 9999)], 2026);
  const at = calculateRewards(terms, [tx('a', 10000)], 2026);
  assert.equal(below.annualFeeWaived, false);
  assert.equal(below.annualFeeChargedPaise, 500);
  assert.equal(below.netAnnualValuePaise, -500);
  assert.equal(at.annualFeeWaived, true);
  assert.equal(at.annualFeeChargedPaise, 0);
  assert.equal(at.totalRewardsPaise, 0);
  assert.equal(at.netAnnualValuePaise, 0);
});
