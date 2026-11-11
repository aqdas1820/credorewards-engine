import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateRewards } from '../dist/index.js';

const tx = [{ id: 't1', month: '2026-01', category: 'food', amountPaise: 10000 }];
const card = () => ({
  id: 'synthetic-rule-array',
  name: 'Synthetic rule array',
  annualFeePaise: 0,
  rules: [{ id: 'food', category: 'food', rateBps: 100 }]
});

test('rejects sparse cashback rule slots even with inherited valid-looking rules', () => {
  const terms = card();
  const rules = new Array(1);
  const prototype = Object.create(Array.prototype);
  prototype[0] = { id: 'inherited', category: '*', rateBps: 100 };
  Object.setPrototypeOf(rules, prototype);
  terms.rules = rules;
  assert.throws(() => calculateRewards(terms, tx, 2026), /invalid rule/);
  assert.equal(Object.hasOwn(rules, 0), false);
});

test('does not trust a caller-supplied rule iterator that hides invalid rules', () => {
  const terms = card();
  terms.rules.push({ id: 'invalid', category: 'food', rateBps: -1 });
  Object.defineProperty(terms.rules, Symbol.iterator, {
    value: function* () { yield this[0]; }
  });
  assert.throws(() => calculateRewards(terms, tx, 2026), /rateBps/);
});

test('valid dense rules retain existing cashback behavior without invoking custom iterators', () => {
  const terms = card();
  Object.defineProperty(terms.rules, Symbol.iterator, {
    value() { throw new Error('untrusted rule iterator invoked'); }
  });
  const result = calculateRewards(terms, tx, 2026);
  assert.equal(result.totalRewardsPaise, 100);
});
