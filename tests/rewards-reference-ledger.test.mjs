import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateRewards } from '../dist/index.js';

// Independent small-integer reference ledger for one wildcard rule.
// This deliberately does not call the SDK's reward/cap accounting helpers.
function reference(transactions, rateBps, monthlyCap, annualCap, minimum) {
  const usedByMonth = new Map();
  let yearUsed = 0;
  const entries = [];
  for (const tx of [...transactions].sort((a, b) =>
    a.month < b.month ? -1 : a.month > b.month ? 1 :
    a.id < b.id ? -1 : a.id > b.id ? 1 : 0)) {
    const raw = tx.amountPaise < minimum
      ? 0 : Math.floor(tx.amountPaise * rateBps / 10000);
    const monthUsed = usedByMonth.get(tx.month) ?? 0;
    const award = Math.min(raw, monthlyCap - monthUsed, annualCap - yearUsed);
    usedByMonth.set(tx.month, monthUsed + award);
    yearUsed += award;
    entries.push({ id: tx.id, month: tx.month, earnedPaise: award });
  }
  return { entries, yearUsed };
}

// Seeded synthetic inputs make failures reproducible on every Node/OS matrix.
function generator(seed) {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state;
  };
}

test('deterministic independent ledger reconciles monthly and annual cap interactions', () => {
  const random = generator(0xc0ed0206);
  for (let scenario = 0; scenario < 60; scenario++) {
    const rateBps = random() % 10001;
    const monthlyCapPaise = random() % 5000;
    const annualCapPaise = random() % 12000;
    const minTransactionPaise = random() % 1500;
    const card = {
      id: 'synthetic-' + scenario,
      name: 'Synthetic reference ledger',
      annualFeePaise: 0,
      rules: [{
        id: 'base', category: '*', rateBps,
        monthlyCapPaise, annualCapPaise, minTransactionPaise
      }]
    };
    const transactions = Array.from({ length: 36 }, (_, index) => ({
      id: String(index).padStart(3, '0'),
      month: '2026-' + String(1 + random() % 12).padStart(2, '0'),
      category: 'synthetic',
      amountPaise: random() % 12000
    }));
    const snapshot = structuredClone(transactions);
    const expected = reference(
      transactions, rateBps, monthlyCapPaise, annualCapPaise, minTransactionPaise
    );
    const result = calculateRewards(card, transactions, 2026);
    assert.deepEqual(result.transactions.map(({ id, month, earnedPaise }) =>
      ({ id, month, earnedPaise })), expected.entries, 'scenario ' + scenario);
    assert.equal(result.totalRewardsPaise, expected.yearUsed, 'scenario ' + scenario);
    assert.equal(result.netAnnualValuePaise, expected.yearUsed, 'scenario ' + scenario);
    assert.deepEqual(result, calculateRewards(card, [...transactions].reverse(), 2026),
      'input ordering changed ledger in scenario ' + scenario);
    assert.deepEqual(transactions, snapshot, 'SDK mutated transaction inputs');
    assert.ok(result.totalRewardsPaise <= annualCapPaise);
    const totals = new Map();
    for (const entry of result.transactions) {
      totals.set(entry.month, (totals.get(entry.month) ?? 0) + entry.earnedPaise);
    }
    for (const total of totals.values()) assert.ok(total <= monthlyCapPaise);
  }
});
