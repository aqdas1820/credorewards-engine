import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateRewards } from '../dist/index.js';

// Fee-waiver eligibility is a separate ledger from cashback eligibility.
// All values and categories here are fictional.
test('fee waiver threshold is inclusive and excludes only configured spend', () => {
  const card = {
    id: 'synthetic-boundary',
    name: 'Synthetic boundary card',
    annualFeePaise: 999,
    annualFeeWaiverThresholdPaise: 10000,
    feeWaiverExcludedCategories: ['rent'],
    excludedCategories: ['groceries'],
    rules: [{ id: 'fallback', category: '*', rateBps: 1000 }]
  };
  const transactions = [
    { id: 'a', month: '2026-01', category: 'rent', amountPaise: 100000 },
    { id: 'b', month: '2026-01', category: 'groceries', amountPaise: 9999 }
  ];
  const below = calculateRewards(card, transactions, 2026);
  assert.equal(below.feeWaiverEligibleSpendPaise, 9999);
  assert.equal(below.annualFeeWaived, false);
  assert.equal(below.annualFeeChargedPaise, 999);
  assert.equal(below.totalRewardsPaise, 10000);
  assert.equal(below.netAnnualValuePaise, 9001);

  const atThreshold = calculateRewards(card, [
    transactions[0],
    { ...transactions[1], amountPaise: 10000 }
  ], 2026);
  assert.equal(atThreshold.feeWaiverEligibleSpendPaise, 10000);
  assert.equal(atThreshold.annualFeeWaived, true);
  assert.equal(atThreshold.annualFeeChargedPaise, 0);
  assert.equal(atThreshold.totalRewardsPaise, 10000);
  assert.equal(atThreshold.netAnnualValuePaise, 10000);
});

test('zero fee-waiver threshold still respects explicitly supplied threshold', () => {
  const card = {
    id: 'synthetic-zero',
    name: 'Synthetic zero threshold',
    annualFeePaise: 500,
    annualFeeWaiverThresholdPaise: 0,
    rules: []
  };
  const result = calculateRewards(card, [], 2026);
  assert.equal(result.feeWaiverEligibleSpendPaise, 0);
  assert.equal(result.annualFeeWaived, true);
  assert.equal(result.annualFeeChargedPaise, 0);
  assert.equal(result.netAnnualValuePaise, 0);
});
