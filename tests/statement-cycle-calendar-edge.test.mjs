import test from 'node:test';
import assert from 'node:assert/strict';
import { summarizeStatementCycleSpend } from '../dist/index.js';

const spend = (id, date) => Object.freeze({ id, date, amountPaise: 1 });

test('day-31 cycles remain contiguous across December and January', () => {
  const input = Object.freeze([
    spend('dec', '2025-12-31'),
    spend('jan', '2026-01-01'),
    spend('jan-end', '2026-01-31'),
    spend('feb', '2026-02-01')
  ]);
  assert.deepEqual(summarizeStatementCycleSpend(input, 31), [
    { cycleStartDate: '2025-12-01', cycleCloseDate: '2025-12-31', transactionCount: 1, totalSpendPaise: 1, transactionIds: ['dec'] },
    { cycleStartDate: '2026-01-01', cycleCloseDate: '2026-01-31', transactionCount: 2, totalSpendPaise: 2, transactionIds: ['jan', 'jan-end'] },
    { cycleStartDate: '2026-02-01', cycleCloseDate: '2026-02-28', transactionCount: 1, totalSpendPaise: 1, transactionIds: ['feb'] }
  ]);
});

test('supported final transaction year can close in following year', () => {
  const summary = summarizeStatementCycleSpend([
    spend('last', '2100-12-31')
  ], 15);
  assert.deepEqual(summary, [
    { cycleStartDate: '2100-12-16', cycleCloseDate: '2101-01-15', transactionCount: 1, totalSpendPaise: 1, transactionIds: ['last'] }
  ]);
});

test('February clamping preserves non-leap and leap cycle starts', () => {
  const result = summarizeStatementCycleSpend([
    spend('ordinary', '2023-02-28'),
    spend('leap', '2024-02-29')
  ], 31);
  assert.deepEqual(result.map(({ cycleStartDate, cycleCloseDate }) => [cycleStartDate, cycleCloseDate]), [
    ['2023-02-01', '2023-02-28'],
    ['2024-02-01', '2024-02-29']
  ]);
});
