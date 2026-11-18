import test from 'node:test';
import assert from 'node:assert/strict';
import { summarizeStatementCycleSpend } from '../dist/index.js';

test('statement-cycle audit IDs use deterministic UTF-16 ordering without locale collation', () => {
  const transactions = [
    { id: 'z', date: '2026-03-16', amountPaise: 1 },
    { id: 'ä', date: '2026-03-17', amountPaise: 2 },
    { id: 'A', date: '2026-03-18', amountPaise: 3 },
    { id: 'a', date: '2026-03-19', amountPaise: 4 },
    { id: 'Z', date: '2026-03-20', amountPaise: 5 }
  ];
  const snapshot = structuredClone(transactions);
  const expected = [{
    cycleStartDate: '2026-03-16',
    cycleCloseDate: '2026-04-15',
    transactionCount: 5,
    totalSpendPaise: 15,
    transactionIds: ['A', 'Z', 'a', 'z', 'ä']
  }];

  assert.deepEqual(summarizeStatementCycleSpend(transactions, 15), expected);
  assert.deepEqual(summarizeStatementCycleSpend([...transactions].reverse(), 15), expected);
  assert.deepEqual(transactions, snapshot);
});

test('statement-cycle grouping never invokes caller ID localeCompare overrides', () => {
  const id = new String('unsafe');
  id.localeCompare = () => { throw new Error('localeCompare must not run'); };
  // Boxed strings are not valid IDs: reject rather than coerce or compare them.
  assert.throws(() => summarizeStatementCycleSpend([
    { id, date: '2026-04-01', amountPaise: 1 }
  ], 15), /transaction.id must be a non-empty string/);
});
