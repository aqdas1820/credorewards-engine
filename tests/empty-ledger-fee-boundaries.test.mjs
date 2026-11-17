import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateRewards } from '../dist/index.js';

// Synthetic cards only: no issuer-specific rates or product recommendations.
test('empty transaction ledger retains a non-waived annual fee', () => {
  const card = {
    id: 'synthetic-empty-ledger',
    name: 'Synthetic empty ledger',
    annualFeePaise: 700,
    annualFeeWaiverThresholdPaise: 1,
    rules: [{ id: 'fallback', category: '*', rateBps: 100 }]
  };
  const result = calculateRewards(card, [], 2026);
  assert.equal(result.totalRewardsPaise, 0);
  assert.equal(result.feeWaiverEligibleSpendPaise, 0);
  assert.equal(result.annualFeeWaived, false);
  assert.equal(result.annualFeeChargedPaise, 700);
  assert.equal(result.netAnnualValuePaise, -700);
});

test('spend excluded only from fee waiver cannot waive the annual fee', () => {
  const card = {
    id: 'synthetic-waiver-only-exclusion',
    name: 'Synthetic waiver exclusion',
    annualFeePaise: 700,
    annualFeeWaiverThresholdPaise: 1,
    feeWaiverExcludedCategories: ['rent'],
    rules: [{ id: 'fallback', category: '*', rateBps: 100 }]
  };
  const transactions = [
    { id: 'rent-1', month: '2026-01', category: 'rent', amountPaise: 10000 }
  ];
  const original = structuredClone(transactions);
  const result = calculateRewards(card, transactions, 2026);
  assert.equal(result.feeWaiverEligibleSpendPaise, 0);
  assert.equal(result.annualFeeWaived, false);
  assert.equal(result.annualFeeChargedPaise, 700);
  assert.equal(result.totalRewardsPaise, 100);
  assert.equal(result.netAnnualValuePaise, -600);
  assert.deepEqual(transactions, original);
});
