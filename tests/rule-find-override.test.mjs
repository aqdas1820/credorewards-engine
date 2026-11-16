import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateRewards } from '../dist/index.js';

const transaction = [{ id: 'tx', month: '2026-01', category: 'food', amountPaise: 10000 }];
const card = () => ({
  id: 'synthetic', name: 'Synthetic', annualFeePaise: 0,
  rules: [{ id: 'food', category: 'food', rateBps: 100 }]
});

test('caller-overridden rules.find cannot inject an unvalidated high-rate rule', () => {
  const terms = card();
  terms.rules.find = () => ({ id: 'injected', category: '*', rateBps: 10000 });
  const result = calculateRewards(terms, transaction, 2026);
  assert.equal(result.totalRewardsPaise, 100);
  assert.equal(result.transactions[0].matchedRuleId, 'food');
});

test('rule matching never invokes a throwing caller-defined find method', () => {
  const terms = card();
  terms.rules.find = () => { throw new Error('untrusted find invoked'); };
  const result = calculateRewards(terms, transaction, 2026);
  assert.equal(result.totalRewardsPaise, 100);
});

test('first matching rule still wins over a later wildcard fallback', () => {
  const terms = card();
  terms.rules.push({ id: 'fallback', category: '*', rateBps: 500 });
  const result = calculateRewards(terms, transaction, 2026);
  assert.equal(result.transactions[0].matchedRuleId, 'food');
  assert.equal(result.totalRewardsPaise, 100);
});
