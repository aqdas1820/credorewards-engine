import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateRewards } from '../dist/index.js';

const transactions = [
  { id: 'grocery', month: '2026-01', category: 'groceries', amountPaise: 10000 },
  { id: 'rent', month: '2026-02', category: 'rent', amountPaise: 20000 }
];

function iteratorHostile(values) {
  const categories = [...values];
  Object.defineProperty(categories, Symbol.iterator, {
    value() { throw new Error('caller array iterator must not run'); }
  });
  return categories;
}

function card(overrides = {}) {
  return {
    id: 'synthetic-exclusion-iterator',
    name: 'Synthetic exclusion iterator',
    annualFeePaise: 500,
    annualFeeWaiverThresholdPaise: 10000,
    rules: [{ id: 'all', category: '*', rateBps: 1000 }],
    ...overrides
  };
}

test('reward exclusions use indexed category values without executing caller iterators', () => {
  const result = calculateRewards(card({
    excludedCategories: iteratorHostile(['rent'])
  }), transactions, 2026);
  assert.equal(result.totalSpendPaise, 30000);
  assert.equal(result.rewardEligibleSpendPaise, 10000);
  assert.equal(result.totalRewardsPaise, 1000);
  assert.deepEqual(result.transactions.map(tx => [tx.id, tx.earnedPaise, tx.reason]), [
    ['grocery', 1000, 'earned'],
    ['rent', 0, 'excluded_category']
  ]);
});

test('fee waiver exclusions use indexed category values without executing caller iterators', () => {
  const result = calculateRewards(card({
    feeWaiverExcludedCategories: iteratorHostile(['rent']),
    annualFeeWaiverThresholdPaise: 10001
  }), [...transactions].reverse(), 2026);
  assert.equal(result.feeWaiverEligibleSpendPaise, 10000);
  assert.equal(result.annualFeeWaived, false);
  assert.equal(result.annualFeeChargedPaise, 500);
  assert.equal(result.totalRewardsPaise, 3000);
  assert.equal(result.netAnnualValuePaise, 2500);
});
