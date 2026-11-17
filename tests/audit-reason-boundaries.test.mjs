import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateRewards } from '../dist/index.js';

test('zero-reward audit reasons remain distinguishable across synthetic rule boundaries', () => {
  const card = {
    id: 'synthetic-audit',
    name: 'Synthetic audit card',
    annualFeePaise: 0,
    excludedCategories: ['excluded'],
    rules: [
      { id: 'minimum', category: 'minimum', rateBps: 10000, minTransactionPaise: 101 },
      { id: 'fraction', category: 'fraction', rateBps: 1 },
      { id: 'zero-rate', category: 'zero-rate', rateBps: 0 },
      { id: 'zero-cap', category: 'zero-cap', rateBps: 10000, monthlyCapPaise: 0 }
    ]
  };
  const transactions = [
    { id: 'a', month: '2026-01', category: 'excluded', amountPaise: 10000 },
    { id: 'b', month: '2026-01', category: 'unmatched', amountPaise: 10000 },
    { id: 'c', month: '2026-01', category: 'minimum', amountPaise: 100 },
    { id: 'd', month: '2026-01', category: 'fraction', amountPaise: 1 },
    { id: 'e', month: '2026-01', category: 'zero-rate', amountPaise: 10000 },
    { id: 'f', month: '2026-01', category: 'zero-cap', amountPaise: 10000 }
  ];
  const original = structuredClone(transactions);
  const result = calculateRewards(card, transactions, 2026);
  assert.deepEqual(result.transactions.map(({ id, matchedRuleId, earnedPaise, reason }) =>
    [id, matchedRuleId, earnedPaise, reason]), [
    ['a', null, 0, 'excluded_category'],
    ['b', null, 0, 'no_matching_rule'],
    ['c', 'minimum', 0, 'below_minimum'],
    ['d', 'fraction', 0, 'rounded_to_zero'],
    ['e', 'zero-rate', 0, 'zero_reward'],
    ['f', 'zero-cap', 0, 'reward_cap_reached']
  ]);
  assert.equal(result.totalRewardsPaise, 0);
  assert.deepEqual(transactions, original);
});
