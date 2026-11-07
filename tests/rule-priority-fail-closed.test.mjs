import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateRewards } from '../dist/index.js';

const card = {
  id: 'synthetic-priority', name: 'Synthetic Priority', annualFeePaise: 0,
  rules: [
    { id: 'specific', category: 'groceries', rateBps: 10000, minTransactionPaise: 100, monthlyCapPaise: 50 },
    { id: 'fallback', category: '*', rateBps: 10000 }
  ]
};

const transactions = [
  { id: 'below-minimum', month: '2026-01', category: 'groceries', amountPaise: 99 },
  { id: 'cap-first', month: '2026-01', category: 'groceries', amountPaise: 100 },
  { id: 'cap-second', month: '2026-01', category: 'groceries', amountPaise: 100 },
  { id: 'wildcard-other', month: '2026-01', category: 'utilities', amountPaise: 100 },
  { id: 'next-month', month: '2026-02', category: 'groceries', amountPaise: 100 }
];

test('specific rule minimum and exhausted cap never fall through to wildcard', () => {
  const result = calculateRewards(card, [...transactions].reverse(), 2026);
  assert.deepEqual(result.transactions.map(t => [t.id, t.matchedRuleId, t.earnedPaise, t.reason]), [
    ['below-minimum', 'specific', 0, 'below_minimum'],
    ['cap-first', 'specific', 50, 'earned'],
    ['cap-second', 'specific', 0, 'reward_cap_reached'],
    ['wildcard-other', 'fallback', 100, 'earned'],
    ['next-month', 'specific', 50, 'earned']
  ]);
  assert.equal(result.totalSpendPaise, 499);
  assert.equal(result.totalRewardsPaise, 200);
  assert.equal(result.rewardEligibleSpendPaise, 400);
});

test('wildcard-first configuration deliberately wins first-match precedence', () => {
  const wildcardFirst = { ...card, rules: [...card.rules].reverse() };
  const result = calculateRewards(wildcardFirst, transactions, 2026);
  assert.equal(result.totalRewardsPaise, 499);
  assert.ok(result.transactions.every(t => t.matchedRuleId === 'fallback'));
  assert.ok(result.transactions.every(t => t.reason === 'earned'));
});
