import test from 'node:test';
import assert from 'node:assert/strict';
import { summarizeStatementCycleSpend } from '../dist/index.js';

test('statement-cycle grouping rejects sparse and inherited transaction slots', () => {
  const sparse = new Array(1);
  assert.throws(() => summarizeStatementCycleSpend(sparse, 15), /invalid dated transaction/);

  const inherited = new Array(1);
  const prototype = Object.create(Array.prototype);
  prototype[0] = { id: 'inherited', date: '2026-03-15', amountPaise: 100 };
  Object.setPrototypeOf(inherited, prototype);
  assert.throws(() => summarizeStatementCycleSpend(inherited, 15), /invalid dated transaction/);
});

test('statement-cycle grouping ignores caller-overridden array iteration and sorting', () => {
  const transactions = [
    Object.freeze({ id: 'z', date: '2026-03-15', amountPaise: 100 }),
    Object.freeze({ id: 'a', date: '2026-03-14', amountPaise: 200 })
  ];
  Object.defineProperty(transactions, Symbol.iterator, {
    value() { throw new Error('untrusted iterator invoked'); }
  });
  Object.defineProperty(transactions, 'sort', {
    value() { throw new Error('untrusted sort invoked'); }
  });
  Object.freeze(transactions);

  assert.deepEqual(summarizeStatementCycleSpend(transactions, 15), [{
    cycleStartDate: '2026-02-16',
    cycleCloseDate: '2026-03-15',
    transactionCount: 2,
    totalSpendPaise: 300,
    transactionIds: ['a', 'z']
  }]);
});
