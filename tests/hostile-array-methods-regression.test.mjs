import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateRewards } from '../dist/index.js';

test('reward calculation ignores caller-overridden array iteration and lookup methods', () => {
  const card = {
    id: 'synthetic', name: 'Synthetic', annualFeePaise: 100,
    annualFeeWaiverThresholdPaise: 10000,
    excludedCategories: ['excluded'],
    feeWaiverExcludedCategories: ['excluded'],
    rules: [{ id: 'base', category: '*', rateBps: 1000 }]
  };
  const transactions = [
    { id: 'b', month: '2026-01', category: 'groceries', amountPaise: 10000 },
    { id: 'a', month: '2026-01', category: 'excluded', amountPaise: 5000 }
  ];
  const reject = () => { throw new Error('caller array method must not run'); };
  for (const array of [card.rules, card.excludedCategories, card.feeWaiverExcludedCategories, transactions]) {
    Object.defineProperty(array, Symbol.iterator, { value: reject });
    Object.defineProperty(array, 'slice', { value: reject });
    Object.defineProperty(array, 'find', { value: reject });
  }

  const result = calculateRewards(card, transactions, 2026);
  assert.equal(result.totalSpendPaise, 15000);
  assert.equal(result.rewardEligibleSpendPaise, 10000);
  assert.equal(result.feeWaiverEligibleSpendPaise, 10000);
  assert.equal(result.totalRewardsPaise, 1000);
  assert.equal(result.annualFeeWaived, true);
  assert.deepEqual(result.transactions.map(({ id, reason, earnedPaise }) => [id, reason, earnedPaise]), [
    ['a', 'excluded_category', 0],
    ['b', 'earned', 1000]
  ]);
  assert.equal(transactions[0].id, 'b');
  assert.equal(transactions[1].id, 'a');
});
