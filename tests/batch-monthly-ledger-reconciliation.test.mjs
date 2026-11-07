import test from 'node:test';
import assert from 'node:assert/strict';
import { createBatchReport } from '../dist/index.js';

const card = (id, overrides = {}) => ({
  id, name: 'Synthetic ' + id, annualFeePaise: 300,
  annualFeeWaiverThresholdPaise: 15000,
  excludedCategories: ['excluded'],
  rules: [{ id: 'base', category: '*', rateBps: 10000,
    monthlyCapPaise: 80, annualCapPaise: 120 }],
  ...overrides
});
const tx = (id, month, category, amountPaise) => ({ id, month, category, amountPaise });

test('batch calendar ledger reconciles every card and retains empty months', () => {
  const transactions = [
    tx('dec', '2026-12', 'general', 100),
    tx('jan-b', '2026-01', 'general', 50),
    tx('jan-a', '2026-01', 'general', 100),
    tx('excluded', '2026-01', 'excluded', 15000)
  ];
  const report = createBatchReport([{
    id: 'synthetic-ledger', year: 2026,
    cards: [card('capped'), card('uncapped', {
      annualFeeWaiverThresholdPaise: undefined,
      rules: [{ id: 'base', category: '*', rateBps: 10000 }]
    })],
    transactions
  }]);
  assert.equal(report.reportVersion, 1);
  assert.equal(report.scenarioCount, 1);
  const scenario = report.scenarios[0];
  for (const entry of scenario.comparison.entries) {
    const ledger = scenario.monthlyByCard.find(monthly => monthly.cardId === entry.cardId);
    assert.ok(ledger);
    assert.equal(ledger.months.length, 12);
    assert.deepEqual(ledger.months.map(month => month.month),
      Array.from({ length: 12 }, (_, index) => `2026-${String(index + 1).padStart(2, '0')}`));
    assert.equal(ledger.months.reduce((sum, month) => sum + month.totalSpendPaise, 0),
      entry.calculation.totalSpendPaise);
    assert.equal(ledger.months.reduce((sum, month) => sum + month.totalRewardsPaise, 0),
      entry.totalRewardsPaise);
    assert.equal(ledger.months.reduce((sum, month) => sum + month.transactionCount, 0),
      transactions.length);
    assert.deepEqual(ledger.months.slice(1, 11).map(month => [
      month.transactionCount, month.totalSpendPaise, month.totalRewardsPaise
    ]), Array.from({ length: 10 }, () => [0, 0, 0]));
    assert.equal(ledger.months[0].transactionCount, 3);
    assert.equal(ledger.months[11].transactionCount, 1);
  }
  const capped = scenario.comparison.entries.find(entry => entry.cardId === 'capped');
  const uncapped = scenario.comparison.entries.find(entry => entry.cardId === 'uncapped');
  assert.equal(capped.totalRewardsPaise, 120);
  assert.equal(capped.calculation.annualFeeChargedPaise, 0);
  assert.equal(uncapped.totalRewardsPaise, 250);
  assert.equal(uncapped.calculation.annualFeeChargedPaise, 300);
  assert.equal(uncapped.netAnnualValuePaise, -50);
  assert.equal(scenario.comparison.leaderCardIds[0], 'capped');
});

test('batch rejects a malformed later scenario without returning a partial report', () => {
  const valid = {
    id: 'first', year: 2026, cards: [card('a'), card('b')], transactions: []
  };
  const invalid = {
    id: 'second', year: 2026, cards: [card('a'), card('b')],
    transactions: [tx('wrong-year', '2027-01', 'general', 100)]
  };
  assert.throws(() => createBatchReport([valid, invalid]),
    /scenario second: transaction\[wrong-year\]\.month must be YYYY-MM in 2026/);
});
