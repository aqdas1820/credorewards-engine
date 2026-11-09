import test from 'node:test';
import assert from 'node:assert/strict';
import { summarizeStatementCycleSpend } from '../dist/index.js';

const tx = (id, date, amountPaise = 1) => ({ id, date, amountPaise });

test('December and January close-day boundaries reconcile across calendar years', () => {
  const input = [
    tx('jan-next', '2026-01-16', 40),
    tx('dec-end', '2025-12-31', 30),
    tx('dec-close', '2025-12-15', 10),
    tx('jan-close', '2026-01-15', 20),
    tx('dec-after', '2025-12-16', 50)
  ];
  const expected = [
    { cycleStartDate: '2025-11-16', cycleCloseDate: '2025-12-15',
      transactionCount: 1, totalSpendPaise: 10, transactionIds: ['dec-close'] },
    { cycleStartDate: '2025-12-16', cycleCloseDate: '2026-01-15',
      transactionCount: 3, totalSpendPaise: 100,
      transactionIds: ['dec-after', 'dec-end', 'jan-close'] },
    { cycleStartDate: '2026-01-16', cycleCloseDate: '2026-02-15',
      transactionCount: 1, totalSpendPaise: 40, transactionIds: ['jan-next'] }
  ];
  assert.deepEqual(summarizeStatementCycleSpend(input, 15), expected);
  assert.deepEqual(summarizeStatementCycleSpend([...input].reverse(), 15), expected);
});

test('close day 31 clamps February in leap and non-leap years without shifting March', () => {
  const input = [
    tx('leap-feb', '2024-02-29', 29),
    tx('leap-mar', '2024-03-01', 1),
    tx('regular-feb', '2025-02-28', 28),
    tx('regular-mar', '2025-03-01', 2)
  ];
  const groups = summarizeStatementCycleSpend(input, 31);
  assert.deepEqual(groups.map(group => [
    group.cycleStartDate, group.cycleCloseDate, group.totalSpendPaise
  ]), [
    ['2024-02-01', '2024-02-29', 29],
    ['2024-03-01', '2024-03-31', 1],
    ['2025-02-01', '2025-02-28', 28],
    ['2025-03-01', '2025-03-31', 2]
  ]);
});

test('out-of-order year boundary inputs retain exact safe-integer cycle sums', () => {
  const max = Number.MAX_SAFE_INTEGER;
  const input = [
    tx('second', '2026-01-01', 1),
    tx('first', '2025-12-31', max - 1)
  ];
  const result = summarizeStatementCycleSpend(input, 15);
  assert.equal(result.length, 1);
  assert.equal(result[0].totalSpendPaise, max);
  assert.deepEqual(result[0].transactionIds, ['first', 'second']);
  assert.throws(
    () => summarizeStatementCycleSpend([...input, tx('third', '2026-01-15', 1)], 15),
    /totalSpendPaise exceeds safe integer range/
  );
});
