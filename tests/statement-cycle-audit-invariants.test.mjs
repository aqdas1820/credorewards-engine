import test from 'node:test';
import assert from 'node:assert/strict';
import { summarizeStatementCycleSpend } from '../dist/index.js';

test('zero-paise transactions remain auditable without fabricating spend', () => {
  const transactions = Object.freeze([
    Object.freeze({ id: 'zero-b', date: '2026-05-15', amountPaise: 0 }),
    Object.freeze({ id: 'paid', date: '2026-05-14', amountPaise: 125 }),
    Object.freeze({ id: 'zero-a', date: '2026-05-01', amountPaise: 0 })
  ]);
  assert.deepEqual(summarizeStatementCycleSpend(transactions, 15), [{
    cycleStartDate: '2026-04-16',
    cycleCloseDate: '2026-05-15',
    transactionCount: 3,
    totalSpendPaise: 125,
    transactionIds: ['paid', 'zero-a', 'zero-b']
  }]);
});

test('duplicate IDs across different cycles are rejected before reporting', () => {
  const transactions = [
    { id: 'same', date: '2026-05-15', amountPaise: 10 },
    { id: 'same', date: '2026-05-16', amountPaise: 20 }
  ];
  assert.throws(() => summarizeStatementCycleSpend(transactions, 15),
    /duplicate transaction id: same/);
  assert.deepEqual(transactions, [
    { id: 'same', date: '2026-05-15', amountPaise: 10 },
    { id: 'same', date: '2026-05-16', amountPaise: 20 }
  ]);
});
