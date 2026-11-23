import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateRewards } from '../dist/index.js';

test('a matched category rule below minimum does not fall through to wildcard cashback', () => {
  const card = {
    id: 'fictional-minimum-priority', name: 'Fictional minimum priority',
    annualFeePaise: 0,
    rules: [
      { id: 'specific', category: 'groceries', rateBps: 10000, minTransactionPaise: 101 },
      { id: 'fallback', category: '*', rateBps: 10000 }
    ]
  };
  const transactions = [
    { id: 'z', month: '2026-01', category: 'utilities', amountPaise: 100 },
    { id: 'a', month: '2026-01', category: 'groceries', amountPaise: 100 },
    { id: 'b', month: '2026-01', category: 'groceries', amountPaise: 101 }
  ];
  const original = structuredClone({ card, transactions });
  const actual = calculateRewards(card, transactions, 2026);
  assert.deepEqual(actual.transactions.map(({ id, matchedRuleId, earnedPaise, reason }) =>
    ({ id, matchedRuleId, earnedPaise, reason })), [
    { id: 'a', matchedRuleId: 'specific', earnedPaise: 0, reason: 'below_minimum' },
    { id: 'b', matchedRuleId: 'specific', earnedPaise: 101, reason: 'earned' },
    { id: 'z', matchedRuleId: 'fallback', earnedPaise: 100, reason: 'earned' }
  ]);
  assert.equal(actual.totalRewardsPaise, 201);
  assert.equal(actual.rewardEligibleSpendPaise, 201);
  assert.equal(actual.feeWaiverEligibleSpendPaise, 301);
  assert.deepEqual(calculateRewards(card, [...transactions].reverse(), 2026), actual);
  assert.deepEqual({ card, transactions }, original);
});
