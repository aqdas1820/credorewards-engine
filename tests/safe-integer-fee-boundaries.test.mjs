import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateRewards } from '../dist/index.js';

const MAX = Number.MAX_SAFE_INTEGER;
const transaction = { id: 'max-spend', month: '2026-12', category: 'synthetic', amountPaise: MAX };

test('100% cashback at maximum safe paise remains exact after annual fee', () => {
  const card = {
    id: 'max-card', name: 'Fictional maximum-boundary card',
    annualFeePaise: 1,
    rules: [{ id: 'full', category: '*', rateBps: 10000 }]
  };
  const originalCard = structuredClone(card);
  const originalTransaction = structuredClone(transaction);
  const result = calculateRewards(card, [transaction], 2026);

  assert.equal(result.totalSpendPaise, MAX);
  assert.equal(result.rewardEligibleSpendPaise, MAX);
  assert.equal(result.totalRewardsPaise, MAX);
  assert.equal(result.transactions[0].earnedPaise, MAX);
  assert.equal(result.annualFeeChargedPaise, 1);
  assert.equal(result.netAnnualValuePaise, MAX - 1);
  assert.deepEqual(card, originalCard);
  assert.deepEqual(transaction, originalTransaction);
});

test('maximum safe fee-waiver threshold is inclusive and independent of reward exclusion', () => {
  const card = {
    id: 'waiver-card', name: 'Fictional waiver boundary card',
    annualFeePaise: 123,
    annualFeeWaiverThresholdPaise: MAX,
    excludedCategories: ['synthetic'],
    rules: [{ id: 'base', category: '*', rateBps: 100 }]
  };
  const result = calculateRewards(card, [transaction], 2026);
  assert.equal(result.feeWaiverEligibleSpendPaise, MAX);
  assert.equal(result.rewardEligibleSpendPaise, 0);
  assert.equal(result.totalRewardsPaise, 0);
  assert.equal(result.annualFeeWaived, true);
  assert.equal(result.annualFeeChargedPaise, 0);
  assert.equal(result.netAnnualValuePaise, 0);
  assert.equal(result.transactions[0].reason, 'excluded_category');
});
