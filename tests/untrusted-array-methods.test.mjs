import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateRewards } from '../dist/index.js';

const card = () => ({
  id: 'synthetic', name: 'Synthetic card', annualFeePaise: 0,
  rules: [{ id: 'base', category: '*', rateBps: 100 }]
});
const transaction = (id, amountPaise = 10000) => ({
  id, month: '2026-01', category: 'general', amountPaise
});

test('caller-overridden transaction array methods cannot replace validated spending', () => {
  const transactions = [transaction('a'), transaction('b')];
  const original = transactions.map(tx => ({ ...tx }));
  const trap = () => { throw new Error('untrusted array method invoked'); };
  transactions.slice = trap;
  transactions.map = trap;
  transactions[Symbol.iterator] = trap;
  const result = calculateRewards(card(), transactions, 2026);
  assert.equal(result.totalSpendPaise, 20000);
  assert.equal(result.totalRewardsPaise, 200);
  assert.deepEqual(result.transactions.map(tx => tx.id), ['a', 'b']);
  assert.deepEqual([transactions[0], transactions[1]], original);
});

test('caller-overridden rule array methods cannot substitute unvalidated cashback terms', () => {
  const terms = card();
  const trap = () => { throw new Error('untrusted rule array method invoked'); };
  terms.rules.find = trap;
  terms.rules[Symbol.iterator] = trap;
  const result = calculateRewards(terms, [transaction('a')], 2026);
  assert.equal(result.totalRewardsPaise, 100);
  assert.equal(result.transactions[0].matchedRuleId, 'base');
  assert.equal(terms.rules[0].rateBps, 100);
});

test('caller-overridden exclusion array iterators cannot bypass exclusions', () => {
  const terms = card();
  terms.excludedCategories = ['general'];
  terms.feeWaiverExcludedCategories = ['general'];
  terms.annualFeeWaiverThresholdPaise = 10000;
  terms.annualFeePaise = 500;
  const trap = () => { throw new Error('untrusted exclusion iterator invoked'); };
  terms.excludedCategories[Symbol.iterator] = trap;
  terms.feeWaiverExcludedCategories[Symbol.iterator] = trap;
  const result = calculateRewards(terms, [transaction('a')], 2026);
  assert.equal(result.totalRewardsPaise, 0);
  assert.equal(result.feeWaiverEligibleSpendPaise, 0);
  assert.equal(result.annualFeeChargedPaise, 500);
  assert.equal(result.transactions[0].reason, 'excluded_category');
});
