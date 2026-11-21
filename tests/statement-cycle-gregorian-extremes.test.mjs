import test from 'node:test';
import assert from 'node:assert/strict';
import { summarizeStatementCycleSpend } from '../dist/index.js';

test('Gregorian century leap rules preserve February 2000 and February 2100 boundaries', () => {
  const cases = [
    {
      date: '2000-02-29',
      expected: {
        cycleStartDate: '2000-02-01',
        cycleCloseDate: '2000-02-29',
        transactionCount: 1,
        totalSpendPaise: 1,
        transactionIds: ['century-leap']
      },
      id: 'century-leap'
    },
    {
      date: '2100-02-28',
      expected: {
        cycleStartDate: '2100-02-01',
        cycleCloseDate: '2100-02-28',
        transactionCount: 1,
        totalSpendPaise: 1,
        transactionIds: ['century-common']
      },
      id: 'century-common'
    }
  ];
  for (const { date, expected, id } of cases) {
    assert.deepEqual(
      summarizeStatementCycleSpend([{ id, date, amountPaise: 1 }], 31),
      [expected]
    );
  }
});

test('latest supported transaction date can close in following year without date truncation', () => {
  const input = Object.freeze([
    Object.freeze({ id: 'year-end', date: '2100-12-31', amountPaise: 7 })
  ]);
  assert.deepEqual(summarizeStatementCycleSpend(input, 15), [{
    cycleStartDate: '2100-12-16',
    cycleCloseDate: '2101-01-15',
    transactionCount: 1,
    totalSpendPaise: 7,
    transactionIds: ['year-end']
  }]);
});
