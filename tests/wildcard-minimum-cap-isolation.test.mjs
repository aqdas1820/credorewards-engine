import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateRewards } from '../dist/index.js';

test('specific rule below minimum never falls through to wildcard cashback', () => {
  const card = {
    id: 'fictional-minimum', name: 'Fictional Minimum', annualFeePaise: 0,
    rules: [
      { id: 'specific', category: 'groceries', rateBps: 1000, minTransactionPaise: 10001 },
      { id: 'fallback', category: '*', rateBps: 500 }
    ]
  };
  const transactions = [
    { id: 'a', month: '2026-01', category: 'groceries', amountPaise: 10000 },
    { id: 'b', month: '2026-01', category: 'utilities', amountPaise: 10000 },
    { id: 'c', month: '2026-01', category: 'groceries', amountPaise: 10001 }
  ];
  const result = calculateRewards(card, transactions, 2026);
  assert.deepEqual(result.transactions.map(({ id, matchedRuleId, earnedPaise, reason }) =>
    ({ id, matchedRuleId, earnedPaise, reason })), [
    { id: 'a', matchedRuleId: 'specific', earnedPaise: 0, reason: 'below_minimum' },
    { id: 'b', matchedRuleId: 'fallback', earnedPaise: 500, reason: 'earned' },
    { id: 'c', matchedRuleId: 'specific', earnedPaise: 1000, reason: 'earned' }
  ]);
  assert.equal(result.rewardEligibleSpendPaise, 20001);
  assert.equal(result.totalRewardsPaise, 1500);
});

test('monthly cap resets across months while annual cap remains shared', () => {
  const card = {
    id: 'fictional-caps', name: 'Fictional Caps', annualFeePaise: 0,
    rules: [{ id: 'cashback', category: '*', rateBps: 10000, monthlyCapPaise: 3, annualCapPaise: 5 }]
  };
  const transactions = [
    { id: 'mar', month: '2026-03', category: 'other', amountPaise: 10 },
    { id: 'jan', month: '2026-01', category: 'other', amountPaise: 10 },
    { id: 'feb', month: '2026-02', category: 'other', amountPaise: 10 }
  ];
  const result = calculateRewards(card, transactions, 2026);
  assert.deepEqual(result.transactions.map(({ id, earnedPaise, reason }) => ({ id, earnedPaise, reason })), [
    { id: 'jan', earnedPaise: 3, reason: 'earned' },
    { id: 'feb', earnedPaise: 2, reason: 'earned' },
    { id: 'mar', earnedPaise: 0, reason: 'reward_cap_reached' }
  ]);
  assert.equal(result.totalRewardsPaise, 5);
  assert.deepEqual(calculateRewards(card, [...transactions].reverse(), 2026), result);
});
