import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateRewards } from '../dist/index.js';

const card = () => ({
  id: 'fictional-waiver-boundary',
  name: 'Fictional waiver boundary',
  annualFeePaise: 700,
  annualFeeWaiverThresholdPaise: 10000,
  feeWaiverExcludedCategories: ['rent'],
  rules: [{ id: 'all', category: '*', rateBps: 1000 }]
});
const tx = (id, category, amountPaise) => ({
  id, month: '2026-01', category, amountPaise
});

test('fee waiver threshold excludes rent even when rent earns cashback', () => {
  const result = calculateRewards(card(), [
    tx('rent', 'rent', 50000),
    tx('food', 'food', 9999)
  ], 2026);
  assert.equal(result.totalSpendPaise, 59999);
  assert.equal(result.feeWaiverEligibleSpendPaise, 9999);
  assert.equal(result.totalRewardsPaise, 5999);
  assert.equal(result.annualFeeWaived, false);
  assert.equal(result.annualFeeChargedPaise, 700);
  assert.equal(result.netAnnualValuePaise, 5299);
});

test('fee waiver occurs at exact qualifying-spend threshold regardless of rent spend', () => {
  const result = calculateRewards(card(), [
    tx('rent', 'rent', 50000),
    tx('food', 'food', 10000)
  ], 2026);
  assert.equal(result.feeWaiverEligibleSpendPaise, 10000);
  assert.equal(result.annualFeeWaived, true);
  assert.equal(result.annualFeeChargedPaise, 0);
  assert.equal(result.totalRewardsPaise, 6000);
  assert.equal(result.netAnnualValuePaise, 6000);
});

test('reward exclusion does not implicitly exclude spending from fee-waiver qualification', () => {
  const terms = card();
  terms.excludedCategories = ['food'];
  const result = calculateRewards(terms, [
    tx('rent', 'rent', 50000),
    tx('food', 'food', 10000)
  ], 2026);
  assert.equal(result.feeWaiverEligibleSpendPaise, 10000);
  assert.equal(result.rewardEligibleSpendPaise, 50000);
  assert.equal(result.totalRewardsPaise, 5000);
  assert.equal(result.annualFeeWaived, true);
  assert.equal(result.transactions.find(item => item.id === 'food').reason, 'excluded_category');
});
