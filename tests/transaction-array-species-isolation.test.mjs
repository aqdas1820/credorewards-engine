import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateRewards } from '../dist/index.js';

const card = {
  id: 'synthetic-array-copy',
  name: 'Synthetic array copy',
  annualFeePaise: 0,
  rules: [{ id: 'all', category: '*', rateBps: 100 }]
};
const transaction = (id, amountPaise) => ({
  id, month: '2026-01', category: 'food', amountPaise
});

test('transaction array subclass species constructor is never executed', () => {
  let speciesCalls = 0;
  class CallerTransactions extends Array {
    static get [Symbol.species]() {
      speciesCalls++;
      throw new Error('untrusted species constructor');
    }
  }
  const transactions = new CallerTransactions();
  transactions.push(transaction('a', 10000));
  const result = calculateRewards(card, transactions, 2026);
  assert.equal(result.totalRewardsPaise, 100);
  assert.equal(result.transactions.length, 1);
  assert.equal(speciesCalls, 0);
});

test('transaction array method overrides cannot alter validated calculation entries', () => {
  const transactions = [transaction('b', 20000), transaction('a', 10000)];
  transactions.slice = () => { throw new Error('untrusted slice'); };
  transactions.sort = () => { throw new Error('untrusted sort'); };
  Object.defineProperty(transactions, Symbol.iterator, {
    value() { throw new Error('untrusted iterator'); }
  });
  const result = calculateRewards(card, transactions, 2026);
  assert.deepEqual(result.transactions.map(({ id, earnedPaise }) => [id, earnedPaise]), [
    ['a', 100],
    ['b', 200]
  ]);
  assert.equal(result.totalRewardsPaise, 300);
  assert.equal(transactions[0].id, 'b');
});
