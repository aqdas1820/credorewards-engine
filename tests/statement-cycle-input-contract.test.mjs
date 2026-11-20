import test from 'node:test';
import assert from 'node:assert/strict';
import { summarizeStatementCycleSpend } from '../dist/index.js';

test('statement-cycle paise rejects coercion, fractions, negatives and unsafe integers', () => {
  for (const amountPaise of ['100', null, undefined, 1n, NaN, Infinity, -Infinity, -1, 0.5, Number.MAX_SAFE_INTEGER + 1]) {
    assert.throws(
      () => summarizeStatementCycleSpend([{ id: 'bad-amount', date: '2026-06-15', amountPaise }], 15),
      /amountPaise must be a non-negative safe integer/
    );
  }
});

test('statement-cycle rejects duplicate and empty transaction identifiers', () => {
  const valid = { id: 'same', date: '2026-06-15', amountPaise: 100 };
  assert.throws(
    () => summarizeStatementCycleSpend([valid, { ...valid, date: '2026-07-15' }], 15),
    /duplicate transaction id: same/
  );
  for (const id of ['', '   ', null, 123]) {
    assert.throws(
      () => summarizeStatementCycleSpend([{ id, date: '2026-06-15', amountPaise: 100 }], 15),
      /transaction.id must be a non-empty string/
    );
  }
});

test('zero-paise transactions remain auditable and caller inputs are not mutated', () => {
  const transactions = Object.freeze([
    Object.freeze({ id: 'z', date: '2026-06-15', amountPaise: 0 }),
    Object.freeze({ id: 'a', date: '2026-06-14', amountPaise: 25 })
  ]);
  const expected = [{
    cycleStartDate: '2026-05-16',
    cycleCloseDate: '2026-06-15',
    transactionCount: 2,
    totalSpendPaise: 25,
    transactionIds: ['a', 'z']
  }];
  assert.deepEqual(summarizeStatementCycleSpend(transactions, 15), expected);
  assert.deepEqual(summarizeStatementCycleSpend([...transactions].reverse(), 15), expected);
});
