import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateRewards } from '../dist/index.js';

const terms = () => ({
  id: 'fictional-waiver', name: 'Fictional waiver card',
  annualFeePaise: 501, annualFeeWaiverThresholdPaise: 20000,
  excludedCategories: ['rent'],
  feeWaiverExcludedCategories: ['fuel'],
  rules: [{ id: 'general', category: '*', rateBps: 100 }]
});
const tx = (id, category, amountPaise) => ({
  id, category, amountPaise, month: '2026-01'
});

test('fee waiver threshold is inclusive and independent of reward exclusions', () => {
  const card = terms();
  const transactions = [
    tx('rent', 'rent', 10000),
    tx('fuel', 'fuel', 10000),
    tx('grocery', 'grocery', 10000)
  ];
  const snapshot = structuredClone({ card, transactions });
  const result = calculateRewards(card, transactions, 2026);
  assert.equal(result.totalSpendPaise, 30000);
  assert.equal(result.feeWaiverEligibleSpendPaise, 20000);
  assert.equal(result.rewardEligibleSpendPaise, 20000);
  assert.equal(result.totalRewardsPaise, 200);
  assert.equal(result.annualFeeWaived, true);
  assert.equal(result.annualFeeChargedPaise, 0);
  assert.equal(result.netAnnualValuePaise, 200);
  assert.equal(result.transactions.find(item => item.id === 'rent').reason, 'excluded_category');
  assert.deepEqual({ card, transactions }, snapshot);
});

test('one paisa below fee waiver threshold retains full annual fee', () => {
  const card = terms();
  const transactions = [
    tx('rent', 'rent', 9999),
    tx('fuel', 'fuel', 10000),
    tx('grocery', 'grocery', 10000)
  ];
  const result = calculateRewards(card, transactions, 2026);
  assert.equal(result.feeWaiverEligibleSpendPaise, 19999);
  assert.equal(result.annualFeeWaived, false);
  assert.equal(result.annualFeeChargedPaise, 501);
  assert.equal(result.totalRewardsPaise, 200);
  assert.equal(result.netAnnualValuePaise, -301);
});

test('zero fee waiver threshold waives even with no transactions', () => {
  const card = { ...terms(), annualFeeWaiverThresholdPaise: 0 };
  const result = calculateRewards(card, [], 2026);
  assert.equal(result.feeWaiverEligibleSpendPaise, 0);
  assert.equal(result.annualFeeWaived, true);
  assert.equal(result.annualFeeChargedPaise, 0);
  assert.equal(result.netAnnualValuePaise, 0);
});
