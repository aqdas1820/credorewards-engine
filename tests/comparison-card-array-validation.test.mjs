import test from 'node:test';
import assert from 'node:assert/strict';
import { compareCards } from '../dist/index.js';

const card = id => ({
  id,
  name: 'Synthetic ' + id,
  annualFeePaise: 0,
  rules: [{ id: 'food', category: 'food', rateBps: 100 }]
});
const transactions = [{ id: 'tx1', month: '2026-01', category: 'food', amountPaise: 10000 }];

test('rejects inherited sparse comparison card entries', () => {
  const cards = [card('a'), card('b')];
  delete cards[1];
  const proto = Object.create(Array.prototype);
  proto[1] = card('inherited');
  Object.setPrototypeOf(cards, proto);
  assert.throws(() => compareCards(cards, transactions, 2026), /invalid card/);
});

test('does not allow custom card iterator to hide an invalid entry', () => {
  const cards = [card('a'), card('b'), null];
  Object.defineProperty(cards, Symbol.iterator, {
    value: function* () { yield this[0]; yield this[1]; }
  });
  assert.throws(() => compareCards(cards, transactions, 2026), /card is required/);
});

test('valid card arrays ignore custom iterators and retain deterministic ranking', () => {
  const cards = [card('b'), card('a')];
  Object.defineProperty(cards, Symbol.iterator, {
    value() { throw new Error('untrusted cards iterator invoked'); }
  });
  const result = compareCards(cards, transactions, 2026);
  assert.deepEqual(result.leaderCardIds, ['a', 'b']);
  assert.deepEqual(result.entries.map(entry => entry.cardId), ['a', 'b']);
});
