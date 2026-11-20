import test from 'node:test';
import assert from 'node:assert/strict';
import { summarizeStatementCycleSpend } from '../dist/index.js';

const spend = (id, date) => Object.freeze({ id, date, amountPaise: 1 });

test('closing day 1 assigns boundary dates to contiguous cycles', () => {
  const transactions = Object.freeze([
    spend('feb-after', '2024-02-02'),
    spend('jan-after', '2024-01-02'),
    spend('feb-close', '2024-02-01'),
    spend('jan-close', '2024-01-01')
  ]);
  assert.deepEqual(summarizeStatementCycleSpend(transactions, 1), [
    { cycleStartDate: '2023-12-02', cycleCloseDate: '2024-01-01', transactionCount: 1, totalSpendPaise: 1, transactionIds: ['jan-close'] },
    { cycleStartDate: '2024-01-02', cycleCloseDate: '2024-02-01', transactionCount: 2, totalSpendPaise: 2, transactionIds: ['feb-close', 'jan-after'] },
    { cycleStartDate: '2024-02-02', cycleCloseDate: '2024-03-01', transactionCount: 1, totalSpendPaise: 1, transactionIds: ['feb-after'] }
  ]);
});

test('Gregorian century rule rejects February 29 in year 2100', () => {
  assert.throws(
    () => summarizeStatementCycleSpend([spend('not-leap', '2100-02-29')], 31),
    /valid Gregorian date/
  );
  assert.deepEqual(summarizeStatementCycleSpend([spend('century', '2100-02-28')], 31), [
    { cycleStartDate: '2100-02-01', cycleCloseDate: '2100-02-28', transactionCount: 1, totalSpendPaise: 1, transactionIds: ['century'] }
  ]);
});
