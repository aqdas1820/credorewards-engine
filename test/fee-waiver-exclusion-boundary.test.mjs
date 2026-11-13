import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateRewards } from '../dist/index.js';

const terms = () => ({
  id: 'synthetic-fee-waiver-boundary',
  name: 'Synthetic fee-waiver boundary',
  annualFeePaise: 500,
  annualFeeWaiverThresholdPaise: 10000,
  feeWaiverExcludedCategories: ['fuel'],
  rules: [{ id: 'groceries', category: 'groceries', rateBps: 1000 }]
});

test('excluded spending cannot complete an annual fee waiver threshold', () => {
  const card = terms();
  const transactions = [
    { id: 'groceries', month: '2026-01', category: 'groceries', amountPaise: 9999 },
    { id: 'fuel', month: '2026-01', category: 'fuel', amountPaise: 1 }
  ];
  const before = structuredClone({ card, transactions });
  const result = calculateRewards(card, transactions, 2026);
  assert.equal(result.totalSpendPaise, 10000);
  assert.equal(result.feeWaiverEligibleSpendPaise, 9999);
  assert.equal(result.rewardEligibleSpendPaise, 9999);
  assert.equal(result.totalRewardsPaise, 999);
  assert.equal(result.annualFeeWaived, false);
  assert.equal(result.annualFeeChargedPaise, 500);
  assert.equal(result.netAnnualValuePaise, 499);
  assert.deepEqual({ card, transactions }, before);
});

test('fee waiver triggers exactly at the eligible threshold, regardless of transaction order', () => {
  const transactions = [
    { id: 'groceries', month: '2026-01', category: 'groceries', amountPaise: 10000 },
    { id: 'fuel', month: '2026-01', category: 'fuel', amountPaise: 1 }
  ];
  const forward = calculateRewards(terms(), transactions, 2026);
  const reversed = calculateRewards(terms(), [...transactions].reverse(), 2026);
  assert.equal(forward.totalSpendPaise, 10001);
  assert.equal(forward.feeWaiverEligibleSpendPaise, 10000);
  assert.equal(forward.totalRewardsPaise, 1000);
  assert.equal(forward.annualFeeWaived, true);
  assert.equal(forward.annualFeeChargedPaise, 0);
  assert.equal(forward.netAnnualValuePaise, 1000);
  assert.deepEqual(reversed, forward);
});
