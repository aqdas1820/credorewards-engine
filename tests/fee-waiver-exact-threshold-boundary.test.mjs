import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateRewards } from '../dist/index.js';

test('fee waiver requires exact qualifying spend, not excluded spend', () => {
  const card = Object.freeze({
    id: 'synthetic-fee-threshold-boundary',
    name: 'Synthetic fee threshold boundary',
    annualFeePaise: 75,
    annualFeeWaiverThresholdPaise: 100,
    feeWaiverExcludedCategories: Object.freeze(['rent']),
    rules: Object.freeze([
      Object.freeze({ id: 'all', category: '*', rateBps: 10000 })
    ])
  });
  const rent = Object.freeze({ id: 'rent', month: '2026-01', category: 'rent', amountPaise: 500 });
  const groceries = Object.freeze({ id: 'groceries', month: '2026-02', category: 'groceries', amountPaise: 99 });
  const topup = Object.freeze({ id: 'topup', month: '2026-03', category: 'groceries', amountPaise: 1 });

  const below = calculateRewards(card, Object.freeze([groceries, rent]), 2026);
  assert.equal(below.totalSpendPaise, 599);
  assert.equal(below.feeWaiverEligibleSpendPaise, 99);
  assert.equal(below.totalRewardsPaise, 599);
  assert.equal(below.annualFeeWaived, false);
  assert.equal(below.annualFeeChargedPaise, 75);
  assert.equal(below.netAnnualValuePaise, 524);

  const at = calculateRewards(card, Object.freeze([topup, rent, groceries]), 2026);
  assert.deepEqual(at, calculateRewards(card, Object.freeze([groceries, topup, rent]), 2026));
  assert.equal(at.totalSpendPaise, 600);
  assert.equal(at.feeWaiverEligibleSpendPaise, 100);
  assert.equal(at.totalRewardsPaise, 600);
  assert.equal(at.annualFeeWaived, true);
  assert.equal(at.annualFeeChargedPaise, 0);
  assert.equal(at.netAnnualValuePaise, 600);
});
