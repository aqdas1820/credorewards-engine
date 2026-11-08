import test from 'node:test';
import assert from 'node:assert/strict';
import { summarizeStatementCycleSpend } from '../dist/index.js';

const tx = (id, date, amountPaise = 1) => ({ id, date, amountPaise });

test('Gregorian century leap rules distinguish year 2000 from year 2100', () => {
  const leap = summarizeStatementCycleSpend([
    tx('feb-28', '2000-02-28', 10),
    tx('feb-29', '2000-02-29', 20),
    tx('mar-01', '2000-03-01', 30)
  ], 31);
  assert.deepEqual(leap, [
    {
      cycleStartDate: '2000-02-01', cycleCloseDate: '2000-02-29',
      transactionCount: 2, totalSpendPaise: 30,
      transactionIds: ['feb-28', 'feb-29']
    },
    {
      cycleStartDate: '2000-03-01', cycleCloseDate: '2000-03-31',
      transactionCount: 1, totalSpendPaise: 30, transactionIds: ['mar-01']
    }
  ]);
  assert.throws(() => summarizeStatementCycleSpend([
    tx('invalid', '2100-02-29')
  ], 31), /valid Gregorian date/);
  assert.equal(summarizeStatementCycleSpend([
    tx('century-end', '2100-02-28')
  ], 31)[0].cycleCloseDate, '2100-02-28');
});

test('supported date boundaries can report cycle endpoints outside input year range', () => {
  const early = summarizeStatementCycleSpend([
    tx('earliest', '2000-01-01', 1)
  ], 1);
  assert.deepEqual(early, [{
    cycleStartDate: '1999-12-02', cycleCloseDate: '2000-01-01',
    transactionCount: 1, totalSpendPaise: 1, transactionIds: ['earliest']
  }]);

  const late = summarizeStatementCycleSpend([
    tx('latest', '2100-12-31', 7)
  ], 15);
  assert.deepEqual(late, [{
    cycleStartDate: '2100-12-16', cycleCloseDate: '2101-01-15',
    transactionCount: 1, totalSpendPaise: 7, transactionIds: ['latest']
  }]);
});

test('close-day clamping on century February remains deterministic under permutation', () => {
  const input = [
    tx('after-feb', '2100-03-01', 9),
    tx('feb-close', '2100-02-28', 8),
    tx('before-feb', '2100-02-27', 7)
  ];
  const original = structuredClone(input);
  for (const closingDay of [29, 30, 31]) {
    const expected = [
      {
        cycleStartDate: '2100-01-30',
        cycleCloseDate: '2100-02-28',
        transactionCount: 2, totalSpendPaise: 15,
        transactionIds: ['before-feb', 'feb-close']
      },
      {
        cycleStartDate: '2100-03-01',
        cycleCloseDate: '2100-03-' + closingDay,
        transactionCount: 1, totalSpendPaise: 9,
        transactionIds: ['after-feb']
      }
    ];
    // Previous January close is January 29/30/31 respectively.
    expected[0].cycleStartDate = '2100-01-' + String(closingDay + 1).padStart(2, '0');
    if (closingDay === 31) expected[0].cycleStartDate = '2100-02-01';
    assert.deepEqual(summarizeStatementCycleSpend(input, closingDay), expected);
    assert.deepEqual(summarizeStatementCycleSpend([...input].reverse(), closingDay), expected);
  }
  assert.deepEqual(input, original);
});
