import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateRewards } from '../dist/index.js';

const card = {
  id: 'synthetic-exclusions', name: 'Synthetic exclusions',
  annualFeePaise: 900, annualFeeWaiverThresholdPaise: 10000,
  rules: [{ id: 'all', category: '*', rateBps: 1000 }],
  excludedCategories: ['rent']
};
const transactions = [
  { id: 'grocery', month: '2026-01', category: 'groceries', amountPaise: 10000 },
  { id: 'rent', month: '2026-01', category: 'rent', amountPaise: 10000 }
];

test('reward-excluded spend independently qualifies for fee waiver', () => {
  const result = calculateRewards({ ...card, feeWaiverExcludedCategories: ['groceries'] }, transactions, 2026);
  assert.equal(result.totalSpendPaise, 20000);
  assert.equal(result.rewardEligibleSpendPaise, 10000);
  assert.equal(result.feeWaiverEligibleSpendPaise, 10000);
  assert.equal(result.totalRewardsPaise, 1000);
  assert.equal(result.annualFeeWaived, true);
  assert.equal(result.annualFeeChargedPaise, 0);
  assert.equal(result.netAnnualValuePaise, 1000);
  assert.equal(result.transactions.find(tx => tx.id === 'rent').reason, 'excluded_category');
});

test('reward-eligible spend can independently fail fee waiver eligibility', () => {
  const result = calculateRewards({ ...card, feeWaiverExcludedCategories: ['groceries', 'rent'] }, transactions, 2026);
  assert.equal(result.rewardEligibleSpendPaise, 10000);
  assert.equal(result.feeWaiverEligibleSpendPaise, 0);
  assert.equal(result.totalRewardsPaise, 1000);
  assert.equal(result.annualFeeWaived, false);
  assert.equal(result.annualFeeChargedPaise, 900);
  assert.equal(result.netAnnualValuePaise, 100);
});
