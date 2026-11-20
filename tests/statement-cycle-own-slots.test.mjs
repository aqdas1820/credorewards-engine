import test from 'node:test';
import assert from 'node:assert/strict';
import { summarizeStatementCycleSpend } from '../dist/index.js';

const transaction = (id, amountPaise = 100) => ({
  id, date: '2026-03-17', amountPaise
});

test('statement-cycle grouping rejects inherited transaction slots', () => {
  const transactions = [transaction('first'), transaction('second')];
  delete transactions[0];
  const prototype = Object.create(Array.prototype);
  prototype[0] = transaction('inherited');
  Object.setPrototypeOf(transactions, prototype);

  assert.throws(
    () => summarizeStatementCycleSpend(transactions, 15),
    /invalid dated transaction/
  );
  assert.equal(Object.hasOwn(transactions, 0), false);
  assert.equal(transactions[1].id, 'second');
});

test('statement-cycle grouping rejects holes without prototype values', () => {
  const transactions = [transaction('first'), transaction('second')];
  delete transactions[1];
  assert.throws(
    () => summarizeStatementCycleSpend(transactions, 15),
    /invalid dated transaction/
  );
});

test('statement-cycle grouping retains ordinary frozen caller arrays', () => {
  const transactions = Object.freeze([
    Object.freeze(transaction('first', 101)),
    Object.freeze(transaction('second', 202))
  ]);
  assert.deepEqual(summarizeStatementCycleSpend(transactions, 15), [{
    cycleStartDate: '2026-03-16',
    cycleCloseDate: '2026-04-15',
    transactionCount: 2,
    totalSpendPaise: 303,
    transactionIds: ['first', 'second']
  }]);
});
