import test from 'node:test';
import assert from 'node:assert/strict';
import { summarizeStatementCycleSpend } from '../dist/index.js';

test('closing day 1 preserves inclusive month boundaries and stable audit order', () => {
  const transactions = Object.freeze([
    Object.freeze({ id: 'feb-close', date: '2027-02-01', amountPaise: 4 }),
    Object.freeze({ id: 'jan-after', date: '2027-01-02', amountPaise: 3 }),
    Object.freeze({ id: 'jan-close', date: '2027-01-01', amountPaise: 2 })
  ]);
  const expected = [
    { cycleStartDate: '2026-12-02', cycleCloseDate: '2027-01-01',
      transactionCount: 1, totalSpendPaise: 2, transactionIds: ['jan-close'] },
    { cycleStartDate: '2027-01-02', cycleCloseDate: '2027-02-01',
      transactionCount: 2, totalSpendPaise: 7, transactionIds: ['feb-close', 'jan-after'] }
  ];
  assert.deepEqual(summarizeStatementCycleSpend(transactions, 1), expected);
  assert.deepEqual(summarizeStatementCycleSpend([...transactions].reverse(), 1), expected);
});

test('closing day 30 clamps non-leap February without skipping January 31 or March 1', () => {
  const transactions = Object.freeze([
    Object.freeze({ id: 'march-start', date: '2027-03-01', amountPaise: 5 }),
    Object.freeze({ id: 'feb-close', date: '2027-02-28', amountPaise: 4 }),
    Object.freeze({ id: 'jan-after', date: '2027-01-31', amountPaise: 3 }),
    Object.freeze({ id: 'jan-close', date: '2027-01-30', amountPaise: 2 })
  ]);
  assert.deepEqual(summarizeStatementCycleSpend(transactions, 30), [
    { cycleStartDate: '2026-12-31', cycleCloseDate: '2027-01-30',
      transactionCount: 1, totalSpendPaise: 2, transactionIds: ['jan-close'] },
    { cycleStartDate: '2027-01-31', cycleCloseDate: '2027-02-28',
      transactionCount: 2, totalSpendPaise: 7, transactionIds: ['feb-close', 'jan-after'] },
    { cycleStartDate: '2027-03-01', cycleCloseDate: '2027-03-30',
      transactionCount: 1, totalSpendPaise: 5, transactionIds: ['march-start'] }
  ]);
});
