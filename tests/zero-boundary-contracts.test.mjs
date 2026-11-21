import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateRewards } from '../dist/index.js';

const card = (overrides = {}) => ({
  id: 'synthetic', name: 'Synthetic card', annualFeePaise: 500,
  rules: [{ id: 'base', category: '*', rateBps: 10000 }],
  ...overrides
});

test('zero-paise fee-waiver threshold is inclusive with no transactions', () => {
  const terms = Object.freeze(card({ annualFeeWaiverThresholdPaise: 0 }));
  const result = calculateRewards(terms, Object.freeze([]), 2026);
  assert.equal(result.totalSpendPaise, 0);
  assert.equal(result.feeWaiverEligibleSpendPaise, 0);
  assert.equal(result.annualFeeWaived, true);
  assert.equal(result.annualFeeChargedPaise, 0);
  assert.equal(result.netAnnualValuePaise, 0);
  assert.deepEqual(result.transactions, []);
});

test('zero monthly cap suppresses rewards without suppressing eligible spend or fee waiver', () => {
  const terms = card({
    annualFeeWaiverThresholdPaise: 100,
    rules: [{ id: 'base', category: '*', rateBps: 10000, monthlyCapPaise: 0 }]
  });
  const transactions = Object.freeze([
    Object.freeze({ id: 'feb', month: '2026-02', category: 'grocery', amountPaise: 100 }),
    Object.freeze({ id: 'jan', month: '2026-01', category: 'grocery', amountPaise: 100 })
  ]);
  const result = calculateRewards(terms, transactions, 2026);
  assert.equal(result.totalSpendPaise, 200);
  assert.equal(result.rewardEligibleSpendPaise, 200);
  assert.equal(result.feeWaiverEligibleSpendPaise, 200);
  assert.equal(result.totalRewardsPaise, 0);
  assert.equal(result.annualFeeWaived, true);
  assert.equal(result.annualFeeChargedPaise, 0);
  assert.deepEqual(result.transactions.map(tx => [tx.id, tx.earnedPaise, tx.reason]), [
    ['jan', 0, 'reward_cap_reached'],
    ['feb', 0, 'reward_cap_reached']
  ]);
});
