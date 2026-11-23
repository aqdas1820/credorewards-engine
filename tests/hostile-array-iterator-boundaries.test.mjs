import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateRewards } from '../dist/index.js';

// Synthetic regression: validated indexed data must not be replaced by
// caller-controlled Array iterators or overridden array methods.
const card = () => ({
  id: 'synthetic-array', name: 'Synthetic array card', annualFeePaise: 0,
  excludedCategories: ['rent'],
  feeWaiverExcludedCategories: ['rent'],
  rules: [{ id: 'base', category: '*', rateBps: 1000, monthlyCapPaise: 1000 }]
});
const transaction = (id, category = 'groceries') => ({
  id, month: '2026-01', category, amountPaise: 10000
});

test('validated arrays do not execute caller-controlled iterators or slice', () => {
  const terms = card();
  const transactions = [transaction('b'), transaction('a'), transaction('r', 'rent')];
  const fail = () => { throw new Error('caller array hook must not execute'); };
  for (const array of [
    transactions, terms.rules, terms.excludedCategories, terms.feeWaiverExcludedCategories
  ]) {
    Object.defineProperty(array, Symbol.iterator, { value: fail });
    Object.defineProperty(array, 'slice', { value: fail });
  }
  const result = calculateRewards(terms, transactions, 2026);
  assert.equal(result.totalSpendPaise, 30000);
  assert.equal(result.totalRewardsPaise, 1000);
  assert.equal(result.rewardEligibleSpendPaise, 20000);
  assert.equal(result.feeWaiverEligibleSpendPaise, 20000);
  assert.deepEqual(result.transactions.map(t => [t.id, t.earnedPaise]), [
    ['a', 1000], ['b', 0], ['r', 0]
  ]);
});

test('sparse indexed arrays fail closed even if their iterators conceal holes', () => {
  const transactions = [transaction('a'), transaction('b')];
  delete transactions[0];
  Object.defineProperty(transactions, Symbol.iterator, {
    value: function* () { yield transaction('safe'); }
  });
  assert.throws(() => calculateRewards(card(), transactions, 2026), /invalid transaction/);

  const terms = card();
  delete terms.rules[0];
  Object.defineProperty(terms.rules, Symbol.iterator, {
    value: function* () { yield { id: 'fake', category: '*', rateBps: 100 }; }
  });
  assert.throws(() => calculateRewards(terms, [], 2026), /invalid rule/);

  const exclusions = card();
  exclusions.excludedCategories.length = 2;
  Object.defineProperty(exclusions.excludedCategories, Symbol.iterator, {
    value: function* () { yield 'rent'; yield 'groceries'; }
  });
  assert.throws(() => calculateRewards(exclusions, [], 2026), /string array/);
});
