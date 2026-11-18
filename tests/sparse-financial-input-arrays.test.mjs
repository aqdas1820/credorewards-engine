import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateRewards, compareCards } from '../dist/index.js';

const card = () => ({
  id: 'fictional', name: 'Synthetic card', annualFeePaise: 0,
  rules: [{ id: 'base', category: '*', rateBps: 100 }]
});
const transaction = (id) => ({
  id, month: '2026-01', category: 'general', amountPaise: 10000
});

test('reject sparse transactions even when an inherited slot appears valid', () => {
  const transactions = [transaction('first'), transaction('second')];
  delete transactions[0];
  const prototype = Object.create(Array.prototype);
  prototype[0] = transaction('inherited');
  Object.setPrototypeOf(transactions, prototype);
  assert.throws(() => calculateRewards(card(), transactions, 2026), /invalid transaction/);
  assert.equal(Object.hasOwn(transactions, 0), false);
});

test('reject sparse card rules rather than using inherited rules', () => {
  const terms = card();
  delete terms.rules[0];
  const prototype = Object.create(Array.prototype);
  prototype[0] = { id: 'inherited', category: '*', rateBps: 100 };
  Object.setPrototypeOf(terms.rules, prototype);
  assert.throws(() => calculateRewards(terms, [transaction('first')], 2026), /invalid rule/);
  assert.equal(Object.hasOwn(terms.rules, 0), false);
});

test('reject sparse comparison cards without treating inherited cards as candidates', () => {
  const cards = [card(), { ...card(), id: 'second' }];
  delete cards[1];
  const prototype = Object.create(Array.prototype);
  prototype[1] = { ...card(), id: 'inherited' };
  Object.setPrototypeOf(cards, prototype);
  const transactions = [transaction('first')];
  const before = structuredClone(transactions);
  assert.throws(() => compareCards(cards, transactions, 2026), /invalid card/);
  assert.deepEqual(transactions, before);
  assert.equal(Object.hasOwn(cards, 1), false);
});
