import test from 'node:test';
import assert from 'node:assert/strict';
import { summarizeStatementCycleSpend } from '../dist/index.js';

test('statement closing day rejects invalid values without coercion', () => {
  const transactions = Object.freeze([
    Object.freeze({ id: 'valid', date: '2026-03-01', amountPaise: 100 })
  ]);
  for (const closingDay of [0, 32, -1, 1.5, NaN, Infinity, '15', null, undefined]) {
    assert.throws(() => summarizeStatementCycleSpend(transactions, closingDay),
      /closingDay must be an integer from 1 to 31/);
  }
});

test('date validation accepts Gregorian year 2000 leap day and rejects out-of-range dates', () => {
  const valid = Object.freeze([
    Object.freeze({ id: 'leap', date: '2000-02-29', amountPaise: 25 })
  ]);
  assert.deepEqual(summarizeStatementCycleSpend(valid, 29), [{
    cycleStartDate: '2000-01-30',
    cycleCloseDate: '2000-02-29',
    transactionCount: 1,
    totalSpendPaise: 25,
    transactionIds: ['leap']
  }]);
  for (const date of ['1999-12-31', '2101-01-01', '2001-02-29', '2026-04-31']) {
    assert.throws(() => summarizeStatementCycleSpend([
      { id: 'invalid', date, amountPaise: 25 }
    ], 29), /date must be/);
  }
});
