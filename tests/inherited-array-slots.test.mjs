import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateRewards } from '../dist/index.js';

const card = () => ({
  id: 'synthetic', name: 'Fictional card', annualFeePaise: 0,
  rules: [{ id: 'base', category: '*', rateBps: 100 }]
});
const transaction = () => ({
  id: 'tx', month: '2026-01', category: 'general', amountPaise: 10000
});

// Keep Array.prototype untouched: simulate an inherited numeric property
// only on the specific caller-owned array.
function withInheritedSlot(value) {
  const array = new Array(1);
  const prototype = Object.create(Array.prototype);
  Object.defineProperty(prototype, '0', { value, configurable: true });
  Object.setPrototypeOf(array, prototype);
  return array;
}

test('rejects inherited cashback rules rather than evaluating prototype entries', () => {
  const terms = card();
  terms.rules = withInheritedSlot({ id: 'inherited', category: '*', rateBps: 10000 });
  assert.equal(Object.hasOwn(terms.rules, 0), false);
  assert.throws(() => calculateRewards(terms, [transaction()], 2026), /invalid rule/);
  assert.equal(Object.hasOwn(terms.rules, 0), false);
});

test('rejects inherited transactions rather than including unowned spend', () => {
  const transactions = withInheritedSlot(transaction());
  assert.equal(Object.hasOwn(transactions, 0), false);
  assert.throws(() => calculateRewards(card(), transactions, 2026), /invalid transaction/);
  assert.equal(Object.hasOwn(transactions, 0), false);
});

test('rejects inherited exclusion entries rather than changing eligibility', () => {
  for (const field of ['excludedCategories', 'feeWaiverExcludedCategories']) {
    const terms = card();
    terms[field] = withInheritedSlot('general');
    assert.equal(Object.hasOwn(terms[field], 0), false);
    assert.throws(() => calculateRewards(terms, [transaction()], 2026), /must be a string array/);
    assert.equal(Object.hasOwn(terms[field], 0), false);
  }
});
