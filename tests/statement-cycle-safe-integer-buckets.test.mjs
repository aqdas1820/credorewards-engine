import test from 'node:test';
import assert from 'node:assert/strict';
import { summarizeStatementCycleSpend } from '../dist/index.js';

test('statement-cycle totals accept the safe-integer limit without rounding', () => {
  const max = Number.MAX_SAFE_INTEGER;
  const transactions = Object.freeze([
    Object.freeze({ id: 'large', date: '2026-03-14', amountPaise: max - 1 }),
    Object.freeze({ id: 'remainder', date: '2026-03-15', amountPaise: 1 })
  ]);
  assert.deepEqual(summarizeStatementCycleSpend(transactions, 15), [{
    cycleStartDate: '2026-02-16',
    cycleCloseDate: '2026-03-15',
    transactionCount: 2,
    totalSpendPaise: max,
    transactionIds: ['large', 'remainder']
  }]);
});

test('statement-cycle rejects aggregate overflow even when each transaction is safe', () => {
  const max = Number.MAX_SAFE_INTEGER;
  const transactions = [
    { id: 'large', date: '2026-03-14', amountPaise: max },
    { id: 'extra', date: '2026-03-15', amountPaise: 1 }
  ];
  assert.throws(() => summarizeStatementCycleSpend(transactions, 15),
    /totalSpendPaise exceeds safe integer range/);
});

test('statement-cycle enforces safe-integer totals per cycle, not across cycles', () => {
  const max = Number.MAX_SAFE_INTEGER;
  const transactions = Object.freeze([
    Object.freeze({ id: 'march', date: '2026-03-15', amountPaise: max }),
    Object.freeze({ id: 'april', date: '2026-03-16', amountPaise: max })
  ]);
  const summaries = summarizeStatementCycleSpend(transactions, 15);
  assert.deepEqual(summaries.map(({ cycleCloseDate, totalSpendPaise, transactionIds }) =>
    ({ cycleCloseDate, totalSpendPaise, transactionIds })), [
    { cycleCloseDate: '2026-03-15', totalSpendPaise: max, transactionIds: ['march'] },
    { cycleCloseDate: '2026-04-15', totalSpendPaise: max, transactionIds: ['april'] }
  ]);
});
