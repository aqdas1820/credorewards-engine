import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateRewards } from '../dist/index.js';

const card = {
  id: 'synthetic-tx-array',
  name: 'Synthetic transaction array',
  annualFeePaise: 0,
  rules: [{ id: 'food', category: 'food', rateBps: 100 }]
};
const tx = () => ({ id: 't1', month: '2026-01', category: 'food', amountPaise: 10000 });

test('rejects sparse transaction slots even with inherited valid-looking entries', () => {
  const transactions = new Array(1);
  const prototype = Object.create(Array.prototype);
  prototype[0] = tx();
  Object.setPrototypeOf(transactions, prototype);
  assert.throws(() => calculateRewards(card, transactions, 2026), /invalid transaction/);
  assert.equal(Object.hasOwn(transactions, 0), false);
});

test('validates actual transactions even when an overridden iterator hides an invalid entry', () => {
  const transactions = [tx(), { ...tx(), id: 'bad', amountPaise: -1 }];
  Object.defineProperty(transactions, Symbol.iterator, {
    value: function* () { yield this[0]; }
  });
  assert.throws(() => calculateRewards(card, transactions, 2026), /amountPaise/);
});

test('valid dense transaction arrays calculate without executing caller-defined iterators', () => {
  const transactions = [tx()];
  Object.defineProperty(transactions, Symbol.iterator, {
    value() { throw new Error('untrusted transaction iterator invoked'); }
  });
  const result = calculateRewards(card, transactions, 2026);
  assert.equal(result.totalRewardsPaise, 100);
  assert.equal(result.transactions.length, 1);
});
