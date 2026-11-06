import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateRewards } from '../dist/index.js';

const card = (overrides = {}) => ({
  id: 'synthetic-boundary',
  name: 'Synthetic boundary card',
  annualFeePaise: 250,
  annualFeeWaiverThresholdPaise: 100,
  rules: [{ id: 'base', category: '*', rateBps: 10000, monthlyCapPaise: 50 }],
  ...overrides
});
const tx = (id, amountPaise, month = '2026-01') => ({
  id, amountPaise, month, category: 'general'
});

test('zero-amount transaction earns nothing but remains auditable and does not consume a cap', () => {
  const result = calculateRewards(card(), [tx('a', 0), tx('b', 50)], 2026);
  assert.deepEqual(result.transactions.map(t => t.earnedPaise), [0, 50]);
  assert.deepEqual(result.transactions.map(t => t.reason), ['rounded_to_zero', 'earned']);
  assert.equal(result.totalSpendPaise, 50);
  assert.equal(result.rewardEligibleSpendPaise, 50);
  assert.equal(result.annualFeeWaived, false);
  assert.equal(result.netAnnualValuePaise, -200);
});

test('minimum threshold is inclusive, and a zero-value transaction below it does not earn', () => {
  const terms = card({
    rules: [{ id: 'base', category: '*', rateBps: 10000, minTransactionPaise: 1 }]
  });
  const result = calculateRewards(terms, [tx('a', 0), tx('b', 1)], 2026);
  assert.deepEqual(result.transactions.map(t => t.reason), ['below_minimum', 'earned']);
  assert.equal(result.rewardEligibleSpendPaise, 1);
  assert.equal(result.totalRewardsPaise, 1);
});

test('zero annual fee-waiver threshold waives the fee even without transactions', () => {
  const result = calculateRewards(card({ annualFeeWaiverThresholdPaise: 0 }), [], 2026);
  assert.equal(result.annualFeeWaived, true);
  assert.equal(result.annualFeeChargedPaise, 0);
  assert.equal(result.netAnnualValuePaise, 0);
});

test('monthly cap resets after an empty month and input objects remain unchanged', () => {
  const terms = card();
  const transactions = [tx('feb', 70, '2026-02'), tx('jan', 70, '2026-01')];
  const originalTerms = structuredClone(terms);
  const originalTransactions = structuredClone(transactions);
  const result = calculateRewards(terms, transactions, 2026);
  assert.deepEqual(result.transactions.map(t => [t.id, t.earnedPaise]), [['jan', 50], ['feb', 50]]);
  assert.equal(result.totalRewardsPaise, 100);
  assert.equal(result.annualFeeWaived, true);
  assert.deepEqual(terms, originalTerms);
  assert.deepEqual(transactions, originalTransactions);
});
