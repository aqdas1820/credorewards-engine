import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateRewards } from '../dist/index.js';

const terms = () => ({
  id: 'synthetic-first-match',
  name: 'Synthetic first-match card',
  annualFeePaise: 0,
  rules: [
    { id: 'specific', category: 'groceries', rateBps: 1000, minTransactionPaise: 10000 },
    { id: 'fallback', category: '*', rateBps: 500 }
  ]
});

test('below-minimum specific rule does not fall through to wildcard cashback', () => {
  const card = terms();
  const transactions = [
    { id: 'small', month: '2026-01', category: 'groceries', amountPaise: 9999 },
    { id: 'other', month: '2026-01', category: 'fuel', amountPaise: 9999 },
    { id: 'exact', month: '2026-01', category: 'groceries', amountPaise: 10000 }
  ];
  const original = structuredClone({ card, transactions });
  const result = calculateRewards(card, transactions, 2026);
  const byId = Object.fromEntries(result.transactions.map(tx => [tx.id, tx]));

  assert.deepEqual(
    [byId.small.matchedRuleId, byId.small.reason, byId.small.earnedPaise],
    ['specific', 'below_minimum', 0]
  );
  assert.deepEqual(
    [byId.other.matchedRuleId, byId.other.reason, byId.other.earnedPaise],
    ['fallback', 'earned', 499]
  );
  assert.deepEqual(
    [byId.exact.matchedRuleId, byId.exact.reason, byId.exact.earnedPaise],
    ['specific', 'earned', 1000]
  );
  assert.equal(result.totalRewardsPaise, 1499);
  assert.equal(result.rewardEligibleSpendPaise, 19999);
  assert.deepEqual({ card, transactions }, original);
});

test('specific-rule minimum and wildcard fallback are independent of input order', () => {
  const transactions = [
    { id: 'small', month: '2026-01', category: 'groceries', amountPaise: 9999 },
    { id: 'other', month: '2026-01', category: 'fuel', amountPaise: 9999 },
    { id: 'exact', month: '2026-01', category: 'groceries', amountPaise: 10000 }
  ];
  const forward = calculateRewards(terms(), transactions, 2026);
  const reverse = calculateRewards(terms(), [...transactions].reverse(), 2026);
  assert.deepEqual(reverse, forward);
});
