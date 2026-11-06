import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createBatchReport } from '../dist/index.js';

const fixture = JSON.parse(readFileSync(new URL('../examples/fictional-batch.json', import.meta.url), 'utf8'));
const scenario = () => structuredClone(fixture.scenarios[0]);

test('monthly capped rewards are attributed to the earning month and card', () => {
  const input = scenario();
  input.id = 'cap-attribution';
  input.transactions = [
    { id: 'jan-1', month: '2026-01', category: 'groceries', amountPaise: 200000 },
    { id: 'jan-2', month: '2026-01', category: 'groceries', amountPaise: 200000 },
    { id: 'feb-1', month: '2026-02', category: 'groceries', amountPaise: 100000 }
  ];
  const report = createBatchReport([input]).scenarios[0];
  const capped = report.monthlyByCard.find(card => card.cardId === 'fictional-grocery');
  const uncapped = report.monthlyByCard.find(card => card.cardId === 'fictional-simple');

  assert.deepEqual(capped.months.slice(0, 2).map(month => ({
    count: month.transactionCount,
    spend: month.totalSpendPaise,
    rewards: month.totalRewardsPaise
  })), [
    { count: 2, spend: 400000, rewards: 15000 },
    { count: 1, spend: 100000, rewards: 5000 }
  ]);
  assert.deepEqual(uncapped.months.slice(0, 2).map(month => month.totalRewardsPaise),
    [8000, 2000]);

  for (const card of report.monthlyByCard) {
    const annual = report.comparison.entries.find(entry => entry.cardId === card.cardId);
    assert.equal(card.months.reduce((sum, month) => sum + month.totalRewardsPaise, 0),
      annual.calculation.totalRewardsPaise);
    assert.equal(card.months.reduce((sum, month) => sum + month.transactionCount, 0), 3);
    assert.ok(card.months.slice(2).every(month => month.totalRewardsPaise === 0));
  }
});

test('monthly caps reset independently for distinct batch scenarios', () => {
  const first = scenario();
  first.id = 'first';
  first.transactions = [
    { id: 'a', month: '2026-01', category: 'groceries', amountPaise: 400000 }
  ];
  const second = structuredClone(first);
  second.id = 'second';
  second.transactions[0].id = 'b';
  const report = createBatchReport([second, first]);
  assert.deepEqual(report.scenarios.map(item => item.scenarioId), ['first', 'second']);
  for (const item of report.scenarios) {
    const capped = item.monthlyByCard.find(card => card.cardId === 'fictional-grocery');
    assert.equal(capped.months[0].totalRewardsPaise, 15000);
    assert.equal(capped.months[0].transactionCount, 1);
  }
});
