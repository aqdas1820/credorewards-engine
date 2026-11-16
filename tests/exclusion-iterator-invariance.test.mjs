import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateRewards } from '../dist/index.js';

test('reward and fee-waiver exclusion arrays do not execute caller iterators', () => {
  const excludedCategories = ['rent'];
  const feeWaiverExcludedCategories = ['rent'];
  for (const categories of [excludedCategories, feeWaiverExcludedCategories]) {
    Object.defineProperty(categories, Symbol.iterator, {
      value() { throw new Error('untrusted category iterator executed'); }
    });
  }
  const card = {
    id: 'synthetic-exclusion-iterator',
    name: 'Synthetic exclusion iterator',
    annualFeePaise: 100,
    annualFeeWaiverThresholdPaise: 10000,
    excludedCategories,
    feeWaiverExcludedCategories,
    rules: [{ id: 'all', category: '*', rateBps: 100 }]
  };
  const transactions = [
    { id: 'a-rent', month: '2026-01', category: 'rent', amountPaise: 10000 },
    { id: 'b-food', month: '2026-01', category: 'food', amountPaise: 5000 }
  ];
  const before = structuredClone(transactions);
  const result = calculateRewards(card, transactions, 2026);
  assert.equal(result.totalSpendPaise, 15000);
  assert.equal(result.rewardEligibleSpendPaise, 5000);
  assert.equal(result.feeWaiverEligibleSpendPaise, 5000);
  assert.equal(result.totalRewardsPaise, 50);
  assert.equal(result.annualFeeWaived, false);
  assert.equal(result.annualFeeChargedPaise, 100);
  assert.equal(result.netAnnualValuePaise, -50);
  assert.deepEqual(result.transactions.map(tx => [tx.id, tx.earnedPaise, tx.reason]), [
    ['a-rent', 0, 'excluded_category'],
    ['b-food', 50, 'earned']
  ]);
  assert.deepEqual(transactions, before);
  assert.deepEqual([...Array.from({ length: excludedCategories.length }, (_, i) => excludedCategories[i])], ['rent']);
  assert.deepEqual([...Array.from({ length: feeWaiverExcludedCategories.length }, (_, i) => feeWaiverExcludedCategories[i])], ['rent']);
});
