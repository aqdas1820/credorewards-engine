import test from 'node:test';
import assert from 'node:assert/strict';
import { summarizeStatementCycleSpend } from '../dist/index.js';

const iso = date => date.toISOString().slice(0, 10);
const utc = (year, month, day) => new Date(Date.UTC(year, month - 1, day));
const nextDay = date => iso(new Date(Date.parse(date + 'T00:00:00Z') + 86400000));
const tx = (id, date, amountPaise = 1) => ({ id, date, amountPaise });

test('all 31 closing days partition leap February and March without gaps or overlap', () => {
  for (let closingDay = 1; closingDay <= 31; closingDay++) {
    const dates = [];
    for (let day = 1; day <= 29; day++) dates.push(iso(utc(2024, 2, day)));
    for (let day = 1; day <= 31; day++) dates.push(iso(utc(2024, 3, day)));
    const transactions = dates.map((date, index) => tx(String(index), date));
    const groups = summarizeStatementCycleSpend(transactions, closingDay);
    assert.equal(groups.reduce((total, group) => total + group.transactionCount, 0), dates.length);
    assert.equal(groups.reduce((total, group) => total + group.totalSpendPaise, 0), dates.length);
    const byId = new Map(transactions.map(item => [item.id, item.date]));
    for (const group of groups) {
      assert.ok(group.cycleStartDate <= group.cycleCloseDate);
      assert.deepEqual(group.transactionIds, [...group.transactionIds].sort());
      for (const id of group.transactionIds) {
        const date = byId.get(id);
        assert.ok(date >= group.cycleStartDate && date <= group.cycleCloseDate,
          'date ' + date + ' outside ' + group.cycleStartDate + '..' + group.cycleCloseDate);
      }
    }
    for (let i = 1; i < groups.length; i++) {
      assert.equal(groups[i].cycleStartDate, nextDay(groups[i - 1].cycleCloseDate),
        'gap or overlap for close day ' + closingDay);
    }
    assert.deepEqual(summarizeStatementCycleSpend([...transactions].reverse(), closingDay), groups);
  }
});

test('Gregorian century boundary accepts year 2000 leap day but not 2100', () => {
  assert.deepEqual(summarizeStatementCycleSpend([
    tx('leap', '2000-02-29', 9), tx('march', '2000-03-01', 2)
  ], 31).map(group => [group.cycleStartDate, group.cycleCloseDate, group.totalSpendPaise]), [
    ['2000-02-01', '2000-02-29', 9],
    ['2000-03-01', '2000-03-31', 2]
  ]);
  assert.throws(() => summarizeStatementCycleSpend([tx('invalid', '2100-02-29')], 31), /date/);
});

test('a cycle may equal MAX_SAFE_INTEGER but a single extra paisa fails closed', () => {
  const max = Number.MAX_SAFE_INTEGER;
  const valid = summarizeStatementCycleSpend([
    tx('a', '2026-05-01', max - 1), tx('b', '2026-05-02', 1)
  ], 15);
  assert.equal(valid[0].totalSpendPaise, max);
  assert.throws(() => summarizeStatementCycleSpend([
    tx('a', '2026-05-01', max), tx('b', '2026-05-02', 1)
  ], 15), /totalSpendPaise exceeds safe integer range/);
});
