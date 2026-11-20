import test from 'node:test';
import assert from 'node:assert/strict';
import { summarizeStatementCycleSpend } from '../dist/index.js';

const tx = (id, date, amountPaise) => ({ id, date, amountPaise });

test('statement-cycle sum accepts the exact safe-integer ceiling', () => {
  const input = Object.freeze([
    Object.freeze(tx('large', '2026-01-14', Number.MAX_SAFE_INTEGER - 1)),
    Object.freeze(tx('one', '2026-01-15', 1))
  ]);
  assert.deepEqual(summarizeStatementCycleSpend(input, 15), [{
    cycleStartDate: '2025-12-16',
    cycleCloseDate: '2026-01-15',
    transactionCount: 2,
    totalSpendPaise: Number.MAX_SAFE_INTEGER,
    transactionIds: ['large', 'one']
  }]);
});

test('safe-integer limit applies per statement cycle, not across independent cycles', () => {
  const result = summarizeStatementCycleSpend([
    tx('feb', '2026-02-15', Number.MAX_SAFE_INTEGER),
    tx('jan', '2026-01-15', Number.MAX_SAFE_INTEGER)
  ], 15);
  assert.deepEqual(result.map(({ cycleCloseDate, totalSpendPaise }) =>
    [cycleCloseDate, totalSpendPaise]), [
    ['2026-01-15', Number.MAX_SAFE_INTEGER],
    ['2026-02-15', Number.MAX_SAFE_INTEGER]
  ]);
});

test('statement-cycle overflow rejects even when another cycle has zero spend', () => {
  const input = [
    tx('zero', '2026-02-16', 0),
    tx('large', '2026-01-14', Number.MAX_SAFE_INTEGER),
    tx('one', '2026-01-15', 1)
  ];
  assert.throws(() => summarizeStatementCycleSpend(input, 15),
    /exceeds safe integer range/);
  assert.deepEqual(input.map(({ id, amountPaise }) => [id, amountPaise]), [
    ['zero', 0], ['large', Number.MAX_SAFE_INTEGER], ['one', 1]
  ]);
});
