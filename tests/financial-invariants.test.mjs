import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateRewards, compareCards } from '../dist/index.js';

const tx = (id, month, category, amountPaise) =>
  ({ id, month, category, amountPaise });
const card = (id, rules, overrides = {}) => ({
  id, name: 'Synthetic ' + id, annualFeePaise: 0, rules, ...overrides
});

test('zero monthly cap blocks earning in every month without excluding eligible spend', () => {
  const terms = card('zero-monthly', [
    { id: 'base', category: '*', rateBps: 10000, monthlyCapPaise: 0 }
  ]);
  const result = calculateRewards(terms, [
    tx('jan', '2026-01', 'general', 100),
    tx('feb', '2026-02', 'general', 200)
  ], 2026);
  assert.equal(result.totalRewardsPaise, 0);
  assert.equal(result.rewardEligibleSpendPaise, 300);
  assert.deepEqual(result.transactions.map(entry => entry.reason),
    ['reward_cap_reached', 'reward_cap_reached']);
});

test('zero annual cap blocks earning across months without changing waiver eligibility', () => {
  const terms = card('zero-annual', [
    { id: 'base', category: '*', rateBps: 500, annualCapPaise: 0 }
  ], { annualFeePaise: 500, annualFeeWaiverThresholdPaise: 1000 });
  const result = calculateRewards(terms, [
    tx('first', '2026-01', 'groceries', 500),
    tx('second', '2026-12', 'groceries', 500)
  ], 2026);
  assert.equal(result.totalRewardsPaise, 0);
  assert.equal(result.rewardEligibleSpendPaise, 1000);
  assert.equal(result.feeWaiverEligibleSpendPaise, 1000);
  assert.equal(result.annualFeeWaived, true);
  assert.equal(result.netAnnualValuePaise, 0);
});

test('minimum transaction threshold prevents wildcard fallback even when wildcard earns', () => {
  const terms = card('first-match', [
    { id: 'special', category: 'groceries', rateBps: 1000, minTransactionPaise: 10000 },
    { id: 'fallback', category: '*', rateBps: 10000 }
  ]);
  const result = calculateRewards(terms, [
    tx('below', '2026-01', 'groceries', 9999),
    tx('other', '2026-01', 'utilities', 100)
  ], 2026);
  assert.deepEqual(result.transactions.map(entry => entry.matchedRuleId),
    ['special', 'fallback']);
  assert.deepEqual(result.transactions.map(entry => entry.reason),
    ['below_minimum', 'earned']);
  assert.deepEqual(result.transactions.map(entry => entry.earnedPaise), [0, 100]);
});

test('reward exclusion does not prevent fee waiver eligibility unless independently excluded', () => {
  const terms = card('waiver', [
    { id: 'base', category: '*', rateBps: 10000 }
  ], {
    excludedCategories: ['rent'],
    annualFeePaise: 100,
    annualFeeWaiverThresholdPaise: 1000
  });
  const result = calculateRewards(terms, [
    tx('rent', '2026-01', 'rent', 1000)
  ], 2026);
  assert.equal(result.rewardEligibleSpendPaise, 0);
  assert.equal(result.feeWaiverEligibleSpendPaise, 1000);
  assert.equal(result.totalRewardsPaise, 0);
  assert.equal(result.annualFeeWaived, true);
});

test('comparison rankings stay deterministic with negative net values and ties', () => {
  const cards = [
    card('z', [], { annualFeePaise: 100 }),
    card('a', [], { annualFeePaise: 100 }),
    card('b', [], { annualFeePaise: 200 })
  ];
  const result = compareCards(cards, [], 2026);
  assert.deepEqual(result.entries.map(entry => entry.cardId), ['a', 'z', 'b']);
  assert.deepEqual(result.entries.map(entry => entry.netAnnualValuePaise), [-100, -100, -200]);
  assert.deepEqual(result.entries.map(entry => entry.rank), [1, 1, 3]);
  assert.deepEqual(result.entries.map(entry => entry.differenceFromLeaderPaise), [0, 0, 100]);
  assert.deepEqual(result.leaderCardIds, ['a', 'z']);
  assert.deepEqual(compareCards([...cards].reverse(), [], 2026), result);
});

test('same rule ID uses independent monthly caps per card, not shared state', () => {
  const cards = [
    card('a', [{ id: 'shared-name', category: '*', rateBps: 10000, monthlyCapPaise: 100 }]),
    card('b', [{ id: 'shared-name', category: '*', rateBps: 10000, monthlyCapPaise: 200 }])
  ];
  const transactions = [
    tx('one', '2026-01', 'general', 300),
    tx('two', '2026-02', 'general', 300)
  ];
  const result = compareCards(cards, transactions, 2026);
  assert.equal(result.entries.find(entry => entry.cardId === 'a').totalRewardsPaise, 200);
  assert.equal(result.entries.find(entry => entry.cardId === 'b').totalRewardsPaise, 400);
  assert.deepEqual(result.entries.map(entry => entry.cardId), ['b', 'a']);
});
