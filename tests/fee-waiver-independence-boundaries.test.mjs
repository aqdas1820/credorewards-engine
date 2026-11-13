import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateRewards } from '../dist/index.js';

const transaction = (id, category, amountPaise) => ({
  id, category, amountPaise, month: '2026-01'
});

test('reward-excluded spend still qualifies for fee waiver at exact threshold', () => {
  const card = {
    id: 'synthetic', name: 'Synthetic', annualFeePaise: 700,
    annualFeeWaiverThresholdPaise: 1000,
    excludedCategories: ['rent'],
    feeWaiverExcludedCategories: ['cash'],
    rules: [{ id: 'base', category: '*', rateBps: 10000, monthlyCapPaise: 2 }]
  };
  const transactions = [
    transaction('rent', 'rent', 998),
    transaction('grocery', 'grocery', 2),
    transaction('cash', 'cash', 5000)
  ];
  const original = structuredClone({ card, transactions });
  const result = calculateRewards(card, transactions, 2026);

  assert.equal(result.totalSpendPaise, 6000);
  assert.equal(result.rewardEligibleSpendPaise, 5002);
  assert.equal(result.feeWaiverEligibleSpendPaise, 1000);
  assert.equal(result.totalRewardsPaise, 2);
  assert.equal(result.annualFeeWaived, true);
  assert.equal(result.annualFeeChargedPaise, 0);
  assert.equal(result.netAnnualValuePaise, 2);
  assert.deepEqual(result.transactions.map(({ id, earnedPaise, reason }) =>
    ({ id, earnedPaise, reason })), [
    { id: 'cash', earnedPaise: 2, reason: 'earned' },
    { id: 'grocery', earnedPaise: 0, reason: 'reward_cap_reached' },
    { id: 'rent', earnedPaise: 0, reason: 'excluded_category' }
  ]);
  assert.deepEqual({ card, transactions }, original);
});

test('fee waiver remains unearned one paisa below threshold even if cashback cap is reached', () => {
  const card = {
    id: 'synthetic', name: 'Synthetic', annualFeePaise: 700,
    annualFeeWaiverThresholdPaise: 1000,
    excludedCategories: ['rent'],
    feeWaiverExcludedCategories: ['cash'],
    rules: [{ id: 'base', category: '*', rateBps: 10000, monthlyCapPaise: 2 }]
  };
  const result = calculateRewards(card, [
    transaction('rent', 'rent', 997),
    transaction('grocery', 'grocery', 2),
    transaction('cash', 'cash', 5000)
  ], 2026);
  assert.equal(result.feeWaiverEligibleSpendPaise, 999);
  assert.equal(result.totalRewardsPaise, 2);
  assert.equal(result.annualFeeWaived, false);
  assert.equal(result.annualFeeChargedPaise, 700);
  assert.equal(result.netAnnualValuePaise, -698);
});
