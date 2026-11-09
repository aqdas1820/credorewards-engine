import test from 'node:test';
import assert from 'node:assert/strict';
import { summarizeStatementCycleSpend } from '../dist/index.js';

const max = Number.MAX_SAFE_INTEGER;
const tx = (id, date, amountPaise) => ({ id, date, amountPaise });

test('independent cycles may each reach MAX_SAFE_INTEGER without a global overflow', () => {
  const input = Object.freeze([
    Object.freeze(tx('feb', '2026-02-01', max)),
    Object.freeze(tx('jan', '2026-01-01', max))
  ]);
  const expected = [
    { cycleStartDate: '2025-12-16', cycleCloseDate: '2026-01-15',
      transactionCount: 1, totalSpendPaise: max, transactionIds: ['jan'] },
    { cycleStartDate: '2026-01-16', cycleCloseDate: '2026-02-15',
      transactionCount: 1, totalSpendPaise: max, transactionIds: ['feb'] }
  ];
  assert.deepEqual(summarizeStatementCycleSpend(input, 15), expected);
  assert.deepEqual(summarizeStatementCycleSpend([...input].reverse(), 15), expected);
});

test('a cycle overflow fails even if adjacent cycles contain zero-spend transactions', () => {
  const input = [
    tx('jan-max', '2026-01-01', max),
    tx('jan-overflow', '2026-01-15', 1),
    tx('feb-zero', '2026-02-01', 0)
  ];
  assert.throws(() => summarizeStatementCycleSpend(input, 15),
    /totalSpendPaise exceeds safe integer range/);
  assert.throws(() => summarizeStatementCycleSpend([...input].reverse(), 15),
    /totalSpendPaise exceeds safe integer range/);
});

test('zero-spend cycles remain visible with deterministic counts and IDs', () => {
  const input = [
    tx('z', '2026-01-16', 0),
    tx('b', '2026-01-15', 0),
    tx('a', '2026-01-01', 0)
  ];
  assert.deepEqual(summarizeStatementCycleSpend(input, 15), [
    { cycleStartDate: '2025-12-16', cycleCloseDate: '2026-01-15',
      transactionCount: 2, totalSpendPaise: 0, transactionIds: ['a', 'b'] },
    { cycleStartDate: '2026-01-16', cycleCloseDate: '2026-02-15',
      transactionCount: 1, totalSpendPaise: 0, transactionIds: ['z'] }
  ]);
});
