import test from 'node:test';
import assert from 'node:assert/strict';
import { summarizeStatementCycleSpend } from '../dist/index.js';

test('safe-integer limits apply per statement cycle, not across independent cycles', () => {
  const transactions = [
    { id: 'jan', date: '2026-01-15', amountPaise: Number.MAX_SAFE_INTEGER },
    { id: 'feb', date: '2026-01-16', amountPaise: Number.MAX_SAFE_INTEGER }
  ];
  const snapshot = structuredClone(transactions);
  assert.deepEqual(summarizeStatementCycleSpend(transactions, 15), [
    { cycleStartDate: '2025-12-16', cycleCloseDate: '2026-01-15', transactionCount: 1,
      totalSpendPaise: Number.MAX_SAFE_INTEGER, transactionIds: ['jan'] },
    { cycleStartDate: '2026-01-16', cycleCloseDate: '2026-02-15', transactionCount: 1,
      totalSpendPaise: Number.MAX_SAFE_INTEGER, transactionIds: ['feb'] }
  ]);
  assert.deepEqual(transactions, snapshot);
});

test('duplicate IDs remain invalid even when assigned to separate statement cycles', () => {
  assert.throws(() => summarizeStatementCycleSpend([
    { id: 'duplicate', date: '2026-01-15', amountPaise: 1 },
    { id: 'duplicate', date: '2026-01-16', amountPaise: 1 }
  ], 15), /duplicate transaction id/);
});
