import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateRewards } from '../dist/index.js';

// Synthetic terms only. First-match precedence is part of the public SDK contract.
const card = {
  id: 'minimum-boundary', name: 'Fictional minimum-spend card',
  annualFeePaise: 0, excludedCategories: [],
  rules: [
    { id: 'specific', category: 'grocery', rateBps: 10000, minTransactionPaise: 101 },
    { id: 'fallback', category: '*', rateBps: 10000 }
  ]
};
const tx = (id, amountPaise) => ({ id, month: '2026-06', category: 'grocery', amountPaise });

test('below-minimum specific match does not fall through to wildcard', () => {
  const input = [tx('below', 100), tx('exact', 101), tx('above', 102)];
  const snapshot = structuredClone(input);
  const result = calculateRewards(card, input, 2026);
  const byId = Object.fromEntries(result.transactions.map(t => [t.id, t]));
  assert.equal(byId.below.matchedRuleId, 'specific');
  assert.equal(byId.below.reason, 'below_minimum');
  assert.equal(byId.below.earnedPaise, 0);
  assert.equal(byId.exact.reason, 'earned');
  assert.equal(byId.exact.earnedPaise, 101);
  assert.equal(byId.above.earnedPaise, 102);
  assert.equal(result.totalRewardsPaise, 203);
  assert.deepEqual(input, snapshot);
});

test('minimum boundary and matched rule remain invariant under caller ordering', () => {
  const input = [tx('z', 101), tx('a', 100), tx('m', 102)];
  const forward = calculateRewards(card, input, 2026);
  const reverse = calculateRewards(card, [...input].reverse(), 2026);
  const summary = result => Object.fromEntries(result.transactions.map(t =>
    [t.id, { rule: t.matchedRuleId, reason: t.reason, earned: t.earnedPaise }]));
  assert.deepEqual(summary(forward), summary(reverse));
  assert.equal(forward.totalRewardsPaise, reverse.totalRewardsPaise);
});
