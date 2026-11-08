import test from 'node:test';
import assert from 'node:assert/strict';
import { summarizeStatementCycleSpend } from '../dist/index.js';

// Independent calendar oracle: generate all close dates and locate each
// transaction's first inclusive close, instead of duplicating SDK logic.
const iso = date => date.toISOString().slice(0, 10);
function closeDate(year, month, day) {
  const last = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return new Date(Date.UTC(year, month - 1, Math.min(day, last)));
}
function reference(transactions, closingDay) {
  const closes = [];
  for (let year = 2023; year <= 2027; year++) {
    for (let month = 1; month <= 12; month++) {
      closes.push(closeDate(year, month, closingDay));
    }
  }
  const groups = new Map();
  for (const tx of transactions) {
    const closingIndex = closes.findIndex(date => iso(date) >= tx.date);
    assert.ok(closingIndex > 0, 'reference date outside generated calendar');
    const close = closes[closingIndex];
    const start = new Date(closes[closingIndex - 1].getTime() + 86400000);
    const key = iso(close);
    const bucket = groups.get(key) ?? {
      cycleStartDate: iso(start), cycleCloseDate: key,
      transactionCount: 0, totalSpendPaise: 0n, transactionIds: []
    };
    bucket.transactionCount += 1;
    bucket.totalSpendPaise += BigInt(tx.amountPaise);
    bucket.transactionIds.push(tx.id);
    groups.set(key, bucket);
  }
  return [...groups.values()].sort((a, b) =>
    a.cycleCloseDate.localeCompare(b.cycleCloseDate)).map(bucket => ({
    ...bucket,
    totalSpendPaise: Number(bucket.totalSpendPaise),
    transactionIds: bucket.transactionIds.sort()
  }));
}
function randomGenerator(seed) {
  let state = seed >>> 0;
  return () => (state = (Math.imul(state, 1664525) + 1013904223) >>> 0);
}

test('statement-cycle dates and spend match an independent calendar ledger', () => {
  const random = randomGenerator(0x20261108);
  const transactions = [];
  for (let year = 2024; year <= 2026; year++) {
    for (let month = 1; month <= 12; month++) {
      const days = new Date(Date.UTC(year, month, 0)).getUTCDate();
      const sampleDays = [1, 2, 15, 28, days, 1 + random() % days];
      for (let i = 0; i < sampleDays.length; i++) {
        const date = new Date(Date.UTC(year, month - 1, sampleDays[i]));
        transactions.push({
          id: String(transactions.length).padStart(4, '0'),
          date: iso(date),
          amountPaise: random() % 100000
        });
      }
    }
  }
  const original = structuredClone(transactions);
  for (const day of [1, 2, 15, 28, 29, 30, 31]) {
    const expected = reference(transactions, day);
    const actual = summarizeStatementCycleSpend(transactions, day);
    assert.deepEqual(actual, expected, 'closing day ' + day);
    assert.deepEqual(summarizeStatementCycleSpend([...transactions].reverse(), day),
      expected, 'input order ' + day);
    assert.equal(actual.reduce((n, bucket) => n + bucket.transactionCount, 0),
      transactions.length);
    assert.equal(actual.reduce((n, bucket) => n + bucket.totalSpendPaise, 0),
      transactions.reduce((n, tx) => n + tx.amountPaise, 0));
  }
  assert.deepEqual(transactions, original);
});

test('statement-cycle boundary accepts MAX_SAFE_INTEGER and rejects overflow', () => {
  const MAX = Number.MAX_SAFE_INTEGER;
  const sameCycle = [
    { id: 'a', date: '2026-01-01', amountPaise: MAX - 1 },
    { id: 'b', date: '2026-01-15', amountPaise: 1 }
  ];
  const actual = summarizeStatementCycleSpend(sameCycle, 15);
  assert.equal(actual[0].totalSpendPaise, MAX);
  assert.deepEqual(actual[0].transactionIds, ['a', 'b']);
  assert.throws(() => summarizeStatementCycleSpend([
    ...sameCycle, { id: 'c', date: '2026-01-15', amountPaise: 1 }
  ], 15), /exceeds safe integer range/);
  assert.deepEqual(summarizeStatementCycleSpend([
    sameCycle[0], { id: 'other', date: '2026-01-16', amountPaise: MAX }
  ], 15).map(bucket => bucket.totalSpendPaise), [MAX - 1, MAX]);
});
