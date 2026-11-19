import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateRewards } from '../dist/index.js';

const card = {
  id: 'fictional-fee-boundary',
  name: 'Fictional fee boundary card',
  annualFeePaise: 700,
  annualFeeWaiverThresholdPaise: 10_000,
  feeWaiverExcludedCategories: ['rent'],
  excludedCategories: ['groceries'],
  rules: [{ id: 'base', category: '*', rateBps: 100 }]
};

const tx = (id, amountPaise, category) => ({
  id, amountPaise, category, month: '2026-01'
});

test('fee waiver is inclusive at the exact qualifying-spend boundary', () => {
  const below = calculateRewards(card, [tx('a', 9_999, 'general')], 2026);
  const exact = calculateRewards(card, [tx('a', 10_000, 'general')], 2026);
  assert.equal(below.feeWaiverEligibleSpendPaise, 9_999);
  assert.equal(below.annualFeeWaived, false);
  assert.equal(below.annualFeeChargedPaise, 700);
  assert.equal(exact.feeWaiverEligibleSpendPaise, 10_000);
  assert.equal(exact.annualFeeWaived, true);
  assert.equal(exact.annualFeeChargedPaise, 0);
});

test('fee-waiver exclusions remain independent of cashback exclusions and input order', () => {
  const transactions = [
    tx('rent', 50_000, 'rent'),
    tx('groceries', 9_999, 'groceries'),
    tx('general', 1, 'general')
  ];
  const snapshot = structuredClone(transactions);
  const forward = calculateRewards(card, transactions, 2026);
  const reverse = calculateRewards(card, [...transactions].reverse(), 2026);
  assert.equal(forward.feeWaiverEligibleSpendPaise, 10_000);
  assert.equal(forward.annualFeeWaived, true);
  assert.equal(forward.annualFeeChargedPaise, 0);
  assert.deepEqual(forward, reverse);
  assert.deepEqual(transactions, snapshot);
});
