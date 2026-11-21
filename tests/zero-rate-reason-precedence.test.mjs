import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateRewards } from '../dist/index.js';

test('zero-rate matching rule reports zero_reward even when both reward caps are zero', () => {
  const card = Object.freeze({
    id: 'fictional-zero-rate',
    name: 'Fictional Zero Rate',
    annualFeePaise: 0,
    rules: Object.freeze([Object.freeze({
      id: 'zero', category: 'groceries', rateBps: 0,
      monthlyCapPaise: 0, annualCapPaise: 0
    })])
  });
  const transactions = Object.freeze([
    Object.freeze({ id: 'tx-a', month: '2026-01', category: 'groceries', amountPaise: 12345 })
  ]);
  const result = calculateRewards(card, transactions, 2026);
  assert.equal(result.totalSpendPaise, 12345);
  assert.equal(result.rewardEligibleSpendPaise, 12345);
  assert.equal(result.totalRewardsPaise, 0);
  assert.equal(result.transactions[0].matchedRuleId, 'zero');
  assert.equal(result.transactions[0].reason, 'zero_reward');
  assert.equal(result.transactions[0].earnedPaise, 0);
});

test('exclusion and minimum-spend reasons take precedence over a zero cashback rate', () => {
  const card = {
    id: 'fictional-zero-precedence', name: 'Fictional Zero Precedence',
    annualFeePaise: 0,
    excludedCategories: ['rent'],
    rules: [{ id: 'zero', category: '*', rateBps: 0, minTransactionPaise: 100 }]
  };
  const result = calculateRewards(card, [
    { id: 'excluded', month: '2026-01', category: 'rent', amountPaise: 1000 },
    { id: 'minimum', month: '2026-01', category: 'groceries', amountPaise: 99 },
    { id: 'eligible', month: '2026-01', category: 'groceries', amountPaise: 100 }
  ], 2026);
  assert.deepEqual(result.transactions.map(({ id, reason, matchedRuleId }) =>
    ({ id, reason, matchedRuleId })), [
    { id: 'eligible', reason: 'zero_reward', matchedRuleId: 'zero' },
    { id: 'excluded', reason: 'excluded_category', matchedRuleId: null },
    { id: 'minimum', reason: 'below_minimum', matchedRuleId: 'zero' }
  ].sort((a, b) => a.id.localeCompare(b.id)));
  assert.equal(result.totalSpendPaise, 1199);
  assert.equal(result.rewardEligibleSpendPaise, 100);
  assert.equal(result.feeWaiverEligibleSpendPaise, 1199);
  assert.equal(result.totalRewardsPaise, 0);
});
