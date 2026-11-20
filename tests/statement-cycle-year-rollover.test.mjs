import test from 'node:test';
import assert from 'node:assert/strict';
import { summarizeStatementCycleSpend } from '../dist/index.js';

test('December-to-January statement cycles use inclusive close and next-day start', () => {
  const transactions = Object.freeze([
    Object.freeze({ id: 'jan-close', date: '2027-01-15', amountPaise: 20 }),
    Object.freeze({ id: 'dec-after', date: '2026-12-16', amountPaise: 30 }),
    Object.freeze({ id: 'dec-close', date: '2026-12-15', amountPaise: 10 }),
    Object.freeze({ id: 'jan-after', date: '2027-01-16', amountPaise: 40 })
  ]);
  const expected = [
    {
      cycleStartDate: '2026-11-16', cycleCloseDate: '2026-12-15',
      transactionCount: 1, totalSpendPaise: 10, transactionIds: ['dec-close']
    },
    {
      cycleStartDate: '2026-12-16', cycleCloseDate: '2027-01-15',
      transactionCount: 2, totalSpendPaise: 50, transactionIds: ['dec-after', 'jan-close']
    },
    {
      cycleStartDate: '2027-01-16', cycleCloseDate: '2027-02-15',
      transactionCount: 1, totalSpendPaise: 40, transactionIds: ['jan-after']
    }
  ];
  assert.deepEqual(summarizeStatementCycleSpend(transactions, 15), expected);
  assert.deepEqual(summarizeStatementCycleSpend([...transactions].reverse(), 15), expected);
});

test('day-31 close clamps to Gregorian February and starts March on the next day', () => {
  const transactions = Object.freeze([
    Object.freeze({ id: 'leap-close', date: '2000-02-29', amountPaise: 11 }),
    Object.freeze({ id: 'march-start', date: '2000-03-01', amountPaise: 12 }),
    Object.freeze({ id: 'century-close', date: '2100-02-28', amountPaise: 13 }),
    Object.freeze({ id: 'century-march', date: '2100-03-01', amountPaise: 14 })
  ]);
  assert.deepEqual(summarizeStatementCycleSpend(transactions, 31), [
    {
      cycleStartDate: '2000-02-01', cycleCloseDate: '2000-02-29',
      transactionCount: 1, totalSpendPaise: 11, transactionIds: ['leap-close']
    },
    {
      cycleStartDate: '2000-03-01', cycleCloseDate: '2000-03-31',
      transactionCount: 1, totalSpendPaise: 12, transactionIds: ['march-start']
    },
    {
      cycleStartDate: '2100-02-01', cycleCloseDate: '2100-02-28',
      transactionCount: 1, totalSpendPaise: 13, transactionIds: ['century-close']
    },
    {
      cycleStartDate: '2100-03-01', cycleCloseDate: '2100-03-31',
      transactionCount: 1, totalSpendPaise: 14, transactionIds: ['century-march']
    }
  ]);
});
