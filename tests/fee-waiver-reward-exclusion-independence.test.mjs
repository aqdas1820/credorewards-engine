import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateRewards } from '../dist/index.js';

test('reward exclusions and fee-waiver exclusions use independent spend ledgers', () => {
  const card = Object.freeze({
    id: 'synthetic-independent-exclusions',
    name: 'Synthetic independent exclusions',
    annualFeePaise: 80,
    annualFeeWaiverThresholdPaise: 100,
    excludedCategories: Object.freeze(['rent']),
    feeWaiverExcludedCategories: Object.freeze(['groceries']),
    rules: Object.freeze([
      Object.freeze({ id: 'fallback', category: '*', rateBps: 10000 })
    ])
  });
  const transactions = Object.freeze([
    Object.freeze({ id: 'grocery', month: '2026-02', category: 'groceries', amountPaise: 50 }),
    Object.freeze({ id: 'rent', month: '2026-01', category: 'rent', amountPaise: 100 })
  ]);

  const result = calculateRewards(card, transactions, 2026);
  assert.deepEqual(result, calculateRewards(card, Object.freeze([...transactions].reverse()), 2026));
  assert.deepEqual(result.transactions.map(tx => [tx.id, tx.reason, tx.earnedPaise]), [
    ['rent', 'excluded_category', 0],
    ['grocery', 'earned', 50]
  ]);
  assert.equal(result.totalSpendPaise, 150);
  assert.equal(result.rewardEligibleSpendPaise, 50);
  assert.equal(result.feeWaiverEligibleSpendPaise, 100);
  assert.equal(result.totalRewardsPaise, 50);
  assert.equal(result.annualFeeWaived, true);
  assert.equal(result.annualFeeChargedPaise, 0);
  assert.equal(result.netAnnualValuePaise, 50);

  const withoutRent = calculateRewards(card, Object.freeze([transactions[0]]), 2026);
  assert.equal(withoutRent.rewardEligibleSpendPaise, 50);
  assert.equal(withoutRent.feeWaiverEligibleSpendPaise, 0);
  assert.equal(withoutRent.annualFeeWaived, false);
  assert.equal(withoutRent.annualFeeChargedPaise, 80);
  assert.equal(withoutRent.netAnnualValuePaise, -30);
});
