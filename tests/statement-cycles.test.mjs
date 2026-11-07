import test from 'node:test';
import assert from 'node:assert/strict';
import { summarizeStatementCycleSpend } from '../dist/index.js';

const tx = (id, date, amountPaise = 100) => ({ id, date, amountPaise });

test('groups transaction days into inclusive closing-day cycles', () => {
  const transactions = [
    tx('after', '2026-02-16', 40), tx('close', '2026-02-15', 200),
    tx('previous', '2026-01-15', 10), tx('open', '2026-01-16', 80)
  ];
  assert.deepEqual(summarizeStatementCycleSpend(transactions, 15), [
    { cycleStartDate: '2025-12-16', cycleCloseDate: '2026-01-15', transactionCount: 1, totalSpendPaise: 10, transactionIds: ['previous'] },
    { cycleStartDate: '2026-01-16', cycleCloseDate: '2026-02-15', transactionCount: 2, totalSpendPaise: 280, transactionIds: ['close', 'open'] },
    { cycleStartDate: '2026-02-16', cycleCloseDate: '2026-03-15', transactionCount: 1, totalSpendPaise: 40, transactionIds: ['after'] }
  ]);
});

test('clamps close day 31 at February end, including leap-year February 29', () => {
  assert.deepEqual(summarizeStatementCycleSpend([
    tx('leap-28', '2024-02-28'), tx('leap-29', '2024-02-29'),
    tx('next', '2024-03-01')
  ], 31), [
    { cycleStartDate: '2024-02-01', cycleCloseDate: '2024-02-29', transactionCount: 2, totalSpendPaise: 200, transactionIds: ['leap-28', 'leap-29'] },
    { cycleStartDate: '2024-03-01', cycleCloseDate: '2024-03-31', transactionCount: 1, totalSpendPaise: 100, transactionIds: ['next'] }
  ]);
  assert.equal(summarizeStatementCycleSpend([tx('normal', '2025-02-28')], 31)[0].cycleCloseDate,
    '2025-02-28');
});

test('supports a year boundary without evaluating any annual card fees', () => {
  assert.deepEqual(summarizeStatementCycleSpend([
    tx('dec', '2025-12-16', 0), tx('jan', '2026-01-15', 999)
  ], 15), [
    { cycleStartDate: '2025-12-16', cycleCloseDate: '2026-01-15', transactionCount: 2, totalSpendPaise: 999, transactionIds: ['dec', 'jan'] }
  ]);
});

test('cycle start is after previous close when shorter months clamp day 30', () => {
  const groups = summarizeStatementCycleSpend([
    tx('feb', '2025-02-28'), tx('march', '2025-03-01'),
    tx('april', '2025-04-01')
  ], 30);
  assert.deepEqual(groups.map(({ cycleStartDate, cycleCloseDate, transactionIds }) =>
    [cycleStartDate, cycleCloseDate, transactionIds]), [
    ['2025-01-31', '2025-02-28', ['feb']],
    ['2025-03-01', '2025-03-30', ['march']],
    ['2025-03-31', '2025-04-30', ['april']]
  ]);
});

test('day-one closing cycles start on the second day of the previous month', () => {
  const cycle = summarizeStatementCycleSpend([tx('first', '2026-01-01')], 1)[0];
  assert.equal(cycle.cycleStartDate, '2025-12-02');
  assert.equal(cycle.cycleCloseDate, '2026-01-01');
});

test('is independent of input order and does not mutate transactions', () => {
  const input = [tx('b', '2026-03-20', 30), tx('a', '2026-03-15', 20)];
  const original = structuredClone(input);
  assert.deepEqual(summarizeStatementCycleSpend(input, 15),
    summarizeStatementCycleSpend([...input].reverse(), 15));
  assert.deepEqual(input, original);
});

test('empty input creates no fabricated statement cycles', () => {
  assert.deepEqual(summarizeStatementCycleSpend([], 20), []);
});

test('rejects invalid closing days and transaction containers', () => {
  for (const day of [0, 32, 1.5, NaN, Infinity, '15', null]) {
    assert.throws(() => summarizeStatementCycleSpend([], day), /closingDay/);
  }
  for (const value of [null, undefined, {}, 'transactions']) {
    assert.throws(() => summarizeStatementCycleSpend(value, 15), /transactions must be an array/);
  }
});

test('rejects impossible and malformed dates rather than silently normalizing', () => {
  for (const date of [
    '2025-02-29', '2100-02-29', '2026-04-31', '2026-00-01',
    '2026-13-01', '2026-01-00', '2026-1-1', '1999-12-31',
    '2026-01-01T00:00:00Z', '2026-01-01 ', null
  ]) {
    assert.throws(() => summarizeStatementCycleSpend([tx('bad', date)], 15), /date must be/);
  }
});

test('rejects invalid amounts and IDs', () => {
  for (const amount of [-1, 0.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1]) {
    assert.throws(() => summarizeStatementCycleSpend([tx('bad', '2026-01-01', amount)], 15),
      /amountPaise must be/);
  }
  assert.throws(() => summarizeStatementCycleSpend([tx(' ', '2026-01-01')], 15),
    /id must be/);
  assert.throws(() => summarizeStatementCycleSpend([
    tx('same', '2026-01-01'), tx('same', '2026-01-02')
  ], 15), /duplicate transaction id/);
});

test('rejects per-cycle sums outside safe integer range', () => {
  assert.throws(() => summarizeStatementCycleSpend([
    tx('a', '2026-01-01', Number.MAX_SAFE_INTEGER),
    tx('b', '2026-01-02', 1)
  ], 15), /exceeds safe integer range/);
});
