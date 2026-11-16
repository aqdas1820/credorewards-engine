import test from 'node:test';
import assert from 'node:assert/strict';
import { compareCards } from '../dist/index.js';

const card = (id, rateBps) => ({
  id,
  name: `Synthetic ${id}`,
  annualFeePaise: 0,
  rules: [{ id: 'all', category: '*', rateBps }]
});
const transactions = [{ id: 'purchase', month: '2026-01', category: 'food', amountPaise: 10000 }];

test('comparison does not execute caller-supplied card array iterator or map', () => {
  const cards = [card('low', 100), card('high', 200)];
  Object.defineProperty(cards, Symbol.iterator, {
    value() { throw new Error('untrusted card iterator'); }
  });
  cards.map = () => { throw new Error('untrusted card map'); };
  const result = compareCards(cards, transactions, 2026);
  assert.deepEqual(result.entries.map(entry => [entry.cardId, entry.totalRewardsPaise]), [
    ['high', 200],
    ['low', 100]
  ]);
  assert.deepEqual(result.leaderCardIds, ['high']);
});

test('comparison does not invoke custom array species constructor', () => {
  let speciesCalls = 0;
  class CallerCards extends Array {
    static get [Symbol.species]() {
      speciesCalls++;
      throw new Error('untrusted species constructor');
    }
  }
  const cards = new CallerCards();
  cards.push(card('a', 100), card('b', 100));
  const result = compareCards(cards, transactions, 2026);
  assert.deepEqual(result.leaderCardIds, ['a', 'b']);
  assert.equal(speciesCalls, 0);
});
