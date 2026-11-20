import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateRewards } from '../dist/index.js';

const card = () => ({
  id: 'fictional-waiver-boundary',
  name: 'Fictional waiver boundary card',
  annualFeePaise: 500,
  annualFeeWaiverThresholdPaise: 10000,
  feeWaiverExcludedCategories: ['rent'],
  rules: [{ id: 'base', category: '*', rateBps: 100 }]
});
const tx = (id, amountPaise, category = 'general') =>
  ({ id, month: '2026-01', category, amountPaise });

test('fee waiver remains unearned one paisa below threshold even with excluded spend', () => {
  const transactions = [tx('eligible', 9999), tx('excluded', 50000, 'rent')];
  const before = structuredClone(transactions);
  const terms = card();
  const result = calculateRewards(terms, transactions, 2026);
  assert.equal(result.feeWaiverEligibleSpendPaise, 9999);
  assert.equal(result.annualFeeWaived, false);
  assert.equal(result.annualFeeChargedPaise, 500);
  assert.equal(result.totalRewardsPaise, 599);
  assert.equal(result.netAnnualValuePaise, 99);
  assert.deepEqual(transactions, before);
  assert.deepEqual(terms, card());
});

test('fee waiver applies at exact threshold across separate eligible transactions', () => {
  const transactions = [tx('first', 9999), tx('last', 1), tx('excluded', 50000, 'rent')];
  const result = calculateRewards(card(), transactions, 2026);
  assert.equal(result.feeWaiverEligibleSpendPaise, 10000);
  assert.equal(result.annualFeeWaived, true);
  assert.equal(result.annualFeeChargedPaise, 0);
  assert.equal(result.totalRewardsPaise, 600);
  assert.equal(result.netAnnualValuePaise, 600);
});
