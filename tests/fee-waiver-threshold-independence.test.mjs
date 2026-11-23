import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateRewards } from '../dist/index.js';

const card = Object.freeze({
  id: 'synthetic-fee-boundary',
  name: 'Synthetic fee waiver boundary',
  annualFeePaise: 101,
  annualFeeWaiverThresholdPaise: 10000,
  excludedCategories: Object.freeze(['rent']),
  feeWaiverExcludedCategories: Object.freeze(['utilities']),
  rules: Object.freeze([Object.freeze({ id: 'all', category: '*', rateBps: 1000 })])
});
const tx = (id, category, amountPaise) =>
  Object.freeze({ id, month: '2026-02', category, amountPaise });

test('fee waiver triggers at exact threshold independently of reward exclusions', () => {
  const transactions = Object.freeze([
    tx('rent', 'rent', 5000),
    tx('groceries', 'groceries', 5000),
    tx('utilities', 'utilities', 1000)
  ]);
  const snapshot = JSON.stringify(transactions);
  const result = calculateRewards(card, transactions, 2026);
  assert.equal(result.totalSpendPaise, 11000);
  assert.equal(result.rewardEligibleSpendPaise, 6000);
  assert.equal(result.feeWaiverEligibleSpendPaise, 10000);
  assert.equal(result.totalRewardsPaise, 600);
  assert.equal(result.annualFeeWaived, true);
  assert.equal(result.annualFeeChargedPaise, 0);
  assert.equal(result.netAnnualValuePaise, 600);
  assert.equal(result.transactions.find(t => t.id === 'rent').reason, 'excluded_category');
  assert.equal(JSON.stringify(transactions), snapshot);
});

test('one paisa below fee threshold charges fee despite reward eligibility', () => {
  const transactions = Object.freeze([
    tx('rent', 'rent', 4999),
    tx('groceries', 'groceries', 5000),
    tx('utilities', 'utilities', 1000)
  ]);
  const result = calculateRewards(card, transactions, 2026);
  assert.equal(result.feeWaiverEligibleSpendPaise, 9999);
  assert.equal(result.rewardEligibleSpendPaise, 6000);
  assert.equal(result.totalRewardsPaise, 600);
  assert.equal(result.annualFeeWaived, false);
  assert.equal(result.annualFeeChargedPaise, 101);
  assert.equal(result.netAnnualValuePaise, 499);
  assert.deepEqual(
    calculateRewards(card, [...transactions].reverse(), 2026),
    result
  );
});
