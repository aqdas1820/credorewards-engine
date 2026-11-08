import test from 'node:test';
import assert from 'node:assert/strict';
import { summarizeStatementCycleSpend } from '../dist/index.js';

// Independent UTC calendar oracle: locate the first monthly closing date at
// or after each transaction, rather than reproducing the SDK's branch logic.
const iso = date => date.toISOString().slice(0, 10);
function closeFor(year, monthIndex, closingDay) {
  const last = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
  return new Date(Date.UTC(year, monthIndex, Math.min(last, closingDay)));
}
function expected(transactions, closingDay) {
  const groups = new Map();
  for (const tx of transactions) {
    const date = new Date(tx.date + 'T00:00:00.000Z');
    let year = date.getUTCFullYear();
    let month = date.getUTCMonth();
    let close = closeFor(year, month, closingDay);
    if (date > close) {
      month += 1;
      if (month === 12) { month = 0; year += 1; }
      close = closeFor(year, month, closingDay);
    }
    const previous = closeFor(month === 0 ? year - 1 : year,
      month === 0 ? 11 : month - 1, closingDay);
    const start = new Date(previous.getTime() + 86400000);
    const key = iso(close);
    const bucket = groups.get(key) ?? {
      cycleStartDate: iso(start), cycleCloseDate: key,
      transactionCount: 0, totalSpendPaise: 0, transactionIds: []
    };
    bucket.transactionCount++;
    bucket.totalSpendPaise += tx.amountPaise;
    bucket.transactionIds.push(tx.id);
    groups.set(key, bucket);
  }
  return [...groups.values()].sort((a, b) =>
    a.cycleCloseDate.localeCompare(b.cycleCloseDate)).map(group => ({
      ...group, transactionIds: group.transactionIds.sort()
    }));
}
function random(seed) {
  let state = seed >>> 0;
  return () => (state = (Math.imul(state, 1664525) + 1013904223) >>> 0);
}

test('seeded statement cycles reconcile with independent UTC closing-date oracle', () => {
  for (const closingDay of [1, 2, 15, 28, 29, 30, 31]) {
    for (let seed = 1; seed <= 80; seed++) {
      const next = random(seed * 37 + closingDay);
      const transactions = Array.from({ length: 18 }, (_, i) => {
        const year = [2000, 2024, 2025, 2026, 2099, 2100][next() % 6];
        const month = next() % 12;
        const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
        const day = 1 + next() % lastDay;
        return {
          id: 'tx-' + String(i).padStart(2, '0'),
          date: iso(new Date(Date.UTC(year, month, day))),
          amountPaise: next() % 100000
        };
      });
      const original = structuredClone(transactions);
      const oracle = expected(transactions, closingDay);
      assert.deepEqual(summarizeStatementCycleSpend(transactions, closingDay),
        oracle, 'closingDay ' + closingDay + ' seed ' + seed);
      assert.deepEqual(summarizeStatementCycleSpend([...transactions].reverse(),
        closingDay), oracle, 'permutation closingDay ' + closingDay + ' seed ' + seed);
      assert.deepEqual(transactions, original, 'input mutation seed ' + seed);
      assert.equal(oracle.reduce((sum, group) => sum + group.totalSpendPaise, 0),
        transactions.reduce((sum, tx) => sum + tx.amountPaise, 0));
      assert.equal(oracle.reduce((sum, group) => sum + group.transactionCount, 0),
        transactions.length);
    }
  }
});
