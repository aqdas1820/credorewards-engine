import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateRewards } from '../dist/index.js';

const transaction = (id, amountPaise, month = '2026-01') =>
  ({ id, month, category: 'synthetic', amountPaise });
const card = (rule) => ({
  id: 'synthetic-card', name: 'Fictional card', annualFeePaise: 0,
  rules: [{ id: 'synthetic-rule', category: '*', ...rule }]
});

test('zero monthly and annual caps explain positive raw rewards as cap exhaustion', () => {
  for (const cap of ['monthlyCapPaise', 'annualCapPaise']) {
    const terms = card({ rateBps: 10000, [cap]: 0 });
    const transactions = [transaction('b', 100, '2026-02'), transaction('a', 100)];
    const before = structuredClone({ terms, transactions });
    const result = calculateRewards(terms, transactions, 2026);
    assert.equal(result.totalSpendPaise, 200);
    assert.equal(result.rewardEligibleSpendPaise, 200);
    assert.equal(result.totalRewardsPaise, 0);
    assert.deepEqual(result.transactions.map(({ id, earnedPaise, reason }) =>
      ({ id, earnedPaise, reason })), [
      { id: 'a', earnedPaise: 0, reason: 'reward_cap_reached' },
      { id: 'b', earnedPaise: 0, reason: 'reward_cap_reached' }
    ]);
    assert.deepEqual({ terms, transactions }, before);
  }
});

test('zero rate and sub-paisa rounding retain their distinct audit reasons under zero caps', () => {
  const cases = [
    { rule: { rateBps: 0, monthlyCapPaise: 0 }, amount: 10000, reason: 'zero_reward' },
    { rule: { rateBps: 1, annualCapPaise: 0 }, amount: 9999, reason: 'rounded_to_zero' },
    { rule: { rateBps: 1, annualCapPaise: 0 }, amount: 10000, reason: 'reward_cap_reached' }
  ];
  for (const { rule, amount, reason } of cases) {
    const result = calculateRewards(card(rule), [transaction('one', amount)], 2026);
    assert.equal(result.totalRewardsPaise, 0);
    assert.equal(result.transactions[0].earnedPaise, 0);
    assert.equal(result.transactions[0].matchedRuleId, 'synthetic-rule');
    assert.equal(result.transactions[0].reason, reason);
  }
});

test('separate zero-capped category rules preserve matching and order invariance', () => {
  const terms = {
    id: 'fictional-zero-caps', name: 'Fictional zero caps', annualFeePaise: 0,
    rules: [
      { id: 'monthly', category: 'groceries', rateBps: 10000, monthlyCapPaise: 0 },
      { id: 'annual', category: 'fuel', rateBps: 10000, annualCapPaise: 0 }
    ]
  };
  const transactions = [
    { id: 'b', month: '2026-02', category: 'fuel', amountPaise: 100 },
    { id: 'a', month: '2026-01', category: 'groceries', amountPaise: 100 }
  ];
  const before = structuredClone({ terms, transactions });
  const result = calculateRewards(terms, transactions, 2026);
  assert.equal(result.totalRewardsPaise, 0);
  assert.deepEqual(result.transactions.map(({ id, matchedRuleId, earnedPaise, reason }) =>
    ({ id, matchedRuleId, earnedPaise, reason })), [
    { id: 'a', matchedRuleId: 'monthly', earnedPaise: 0, reason: 'reward_cap_reached' },
    { id: 'b', matchedRuleId: 'annual', earnedPaise: 0, reason: 'reward_cap_reached' }
  ]);
  assert.deepEqual(calculateRewards(terms, [...transactions].reverse(), 2026), result);
  assert.deepEqual({ terms, transactions }, before);
});
