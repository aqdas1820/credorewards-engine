import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateRewards } from '../dist/index.js';

const card = Object.freeze({
  id: 'fictional-fee-boundary',
  name: 'Fictional fee boundary',
  annualFeePaise: 200,
  annualFeeWaiverThresholdPaise: 1000,
  feeWaiverExcludedCategories: ['utilities'],
  excludedCategories: ['rent'],
  rules: [{ id: 'all', category: '*', rateBps: 1000 }]
});

const tx = (id, category, amountPaise) => ({ id, month: '2026-01', category, amountPaise });

test('fee waiver threshold is inclusive and independent of cashback eligibility', () => {
  const transactions = [
    tx('utility', 'utilities', 2000),
    tx('grocery', 'groceries', 999),
    tx('rent', 'rent', 1)
  ];
  const result = calculateRewards(card, transactions, 2026);
  assert.equal(result.totalSpendPaise, 3000);
  assert.equal(result.rewardEligibleSpendPaise, 2999);
  assert.equal(result.feeWaiverEligibleSpendPaise, 1000);
  assert.equal(result.totalRewardsPaise, 299);
  assert.equal(result.annualFeeWaived, true);
  assert.equal(result.annualFeeChargedPaise, 0);
  assert.equal(result.netAnnualValuePaise, 299);
  assert.equal(transactions[0].amountPaise, 2000);
});

test('one paisa below waiver threshold charges the fee despite cashback', () => {
  const result = calculateRewards(card, [
    tx('utility', 'utilities', 2000),
    tx('grocery', 'groceries', 999)
  ], 2026);
  assert.equal(result.feeWaiverEligibleSpendPaise, 999);
  assert.equal(result.totalRewardsPaise, 299);
  assert.equal(result.annualFeeWaived, false);
  assert.equal(result.annualFeeChargedPaise, 200);
  assert.equal(result.netAnnualValuePaise, 99);
});
