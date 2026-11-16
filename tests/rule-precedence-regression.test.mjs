import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateRewards } from '../dist/index.js';

const transaction = [{ id: 'synthetic-1', month: '2026-03', category: 'groceries', amountPaise: 10000 }];
const rule = (id, category, rateBps, extras = {}) => ({ id, category, rateBps, ...extras });
const card = rules => ({
  id: 'synthetic-precedence',
  name: 'Synthetic rule precedence',
  annualFeePaise: 0,
  rules
});

test('specific rule before wildcard wins even when wildcard has a higher rate', () => {
  const result = calculateRewards(card([
    rule('specific', 'groceries', 100),
    rule('fallback', '*', 1000)
  ]), transaction, 2026);
  assert.equal(result.totalRewardsPaise, 100);
  assert.equal(result.transactions[0].matchedRuleId, 'specific');
});

test('wildcard before specific rule takes precedence under first-match-wins semantics', () => {
  const result = calculateRewards(card([
    rule('fallback', '*', 1000),
    rule('specific', 'groceries', 100)
  ]), transaction, 2026);
  assert.equal(result.totalRewardsPaise, 1000);
  assert.equal(result.transactions[0].matchedRuleId, 'fallback');
});

test('exhausted specific-rule cap never falls through to an uncapped wildcard', () => {
  const result = calculateRewards(card([
    rule('specific', 'groceries', 1000, { monthlyCapPaise: 0 }),
    rule('fallback', '*', 1000)
  ]), transaction, 2026);
  assert.equal(result.totalRewardsPaise, 0);
  assert.equal(result.transactions[0].matchedRuleId, 'specific');
  assert.equal(result.transactions[0].reason, 'reward_cap_reached');
});
