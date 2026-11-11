import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateRewards } from '../dist/index.js';

const card = () => ({
  id: 'synthetic-sparse-categories',
  name: 'Synthetic sparse category validation',
  annualFeePaise: 0,
  rules: [{ id: 'all', category: '*', rateBps: 100 }]
});

const transactions = Object.freeze([
  Object.freeze({ id: 'tx-1', month: '2026-01', category: 'groceries', amountPaise: 10000 })
]);

test('reject sparse reward-exclusion arrays rather than silently skipping holes', () => {
  const terms = card();
  terms.excludedCategories = ['groceries', , 'utilities'];
  assert.throws(() => calculateRewards(terms, transactions, 2026), /excludedCategories must be a string array/);
  assert.equal(1 in terms.excludedCategories, false);
});

test('reject sparse fee-waiver-exclusion arrays before annual spend calculation', () => {
  const terms = card();
  terms.annualFeeWaiverThresholdPaise = 10000;
  terms.feeWaiverExcludedCategories = new Array(2);
  assert.throws(() => calculateRewards(terms, transactions, 2026), /feeWaiverExcludedCategories must be a string array/);
  assert.equal(0 in terms.feeWaiverExcludedCategories, false);
});

test('dense valid exclusion arrays retain their existing behavior', () => {
  const terms = card();
  terms.excludedCategories = ['groceries'];
  terms.feeWaiverExcludedCategories = ['utilities'];
  const result = calculateRewards(terms, transactions, 2026);
  assert.equal(result.totalRewardsPaise, 0);
  assert.equal(result.feeWaiverEligibleSpendPaise, 10000);
  assert.equal(result.transactions[0].reason, 'excluded_category');
});
