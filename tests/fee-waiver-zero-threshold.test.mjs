import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateRewards } from '../dist/index.js';

test('zero fee-waiver threshold waives fee without transactions', () => {
  const card = Object.freeze({
    id: 'synthetic-zero-threshold',
    name: 'Synthetic zero-threshold waiver',
    annualFeePaise: 125,
    annualFeeWaiverThresholdPaise: 0,
    rules: Object.freeze([])
  });
  const transactions = Object.freeze([]);
  const result = calculateRewards(card, transactions, 2026);
  assert.equal(result.totalSpendPaise, 0);
  assert.equal(result.rewardEligibleSpendPaise, 0);
  assert.equal(result.feeWaiverEligibleSpendPaise, 0);
  assert.equal(result.totalRewardsPaise, 0);
  assert.equal(result.annualFeeWaived, true);
  assert.equal(result.annualFeeChargedPaise, 0);
  assert.equal(result.netAnnualValuePaise, 0);
  assert.deepEqual(result.transactions, []);
});

test('omitted waiver threshold charges the annual fee on empty spend', () => {
  const card = Object.freeze({
    id: 'synthetic-no-threshold',
    name: 'Synthetic no-waiver card',
    annualFeePaise: 125,
    rules: Object.freeze([])
  });
  const result = calculateRewards(card, Object.freeze([]), 2026);
  assert.equal(result.annualFeeWaived, false);
  assert.equal(result.annualFeeChargedPaise, 125);
  assert.equal(result.netAnnualValuePaise, -125);
});
