import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateRewards, compareCards, createBatchReport } from '../dist/index.js';

const card = {
  id: 'synthetic-capped', name: 'Synthetic Capped Card', annualFeePaise: 300,
  rules: [
    { id: 'grocery', category: 'groceries', rateBps: 1000,
      monthlyCapPaise: 600, annualCapPaise: 1000 },
    { id: 'fallback', category: '*', rateBps: 200, monthlyCapPaise: 200 }
  ]
};
const tx = (id, month, category, amountPaise) =>
  ({ id, month, category, amountPaise });
const transactions = [
  tx('g-jan-1', '2026-01', 'groceries', 4000),
  tx('g-jan-2', '2026-01', 'groceries', 4000),
  tx('g-feb-1', '2026-02', 'groceries', 5000),
  tx('g-feb-2', '2026-02', 'groceries', 5000),
  tx('g-mar', '2026-03', 'groceries', 1000),
  tx('u-jan', '2026-01', 'utilities', 10000),
  tx('u-feb', '2026-02', 'utilities', 10000)
];

test('independent rule caps reconcile exactly with earned transaction audit rows', () => {
  const result = calculateRewards(card, transactions, 2026);
  assert.equal(result.totalSpendPaise, 39000);
  assert.equal(result.rewardEligibleSpendPaise, 39000);
  assert.equal(result.totalRewardsPaise, 1400);
  assert.equal(result.annualFeeChargedPaise, 300);
  assert.equal(result.netAnnualValuePaise, 1100);
  assert.deepEqual(result.transactions.map(row => [
    row.id, row.matchedRuleId, row.earnedPaise, row.reason
  ]), [
    ['g-jan-1', 'grocery', 400, 'earned'],
    ['g-jan-2', 'grocery', 200, 'earned'],
    ['u-jan', 'fallback', 200, 'earned'],
    ['g-feb-1', 'grocery', 400, 'earned'],
    ['g-feb-2', 'grocery', 0, 'reward_cap_reached'],
    ['u-feb', 'fallback', 200, 'earned'],
    ['g-mar', 'grocery', 0, 'reward_cap_reached']
  ]);
  assert.equal(result.transactions.reduce((sum, row) => sum + row.earnedPaise, 0),
    result.totalRewardsPaise);
  assert.equal(result.transactions.filter(row => row.matchedRuleId === 'grocery')
    .reduce((sum, row) => sum + row.earnedPaise, 0), 1000);
  assert.equal(result.transactions.filter(row => row.matchedRuleId === 'fallback')
    .reduce((sum, row) => sum + row.earnedPaise, 0), 400);
});

test('fully exhausted specific rule never falls through to wildcard cashback', () => {
  const result = calculateRewards(card, transactions, 2026);
  for (const id of ['g-feb-2', 'g-mar']) {
    const row = result.transactions.find(entry => entry.id === id);
    assert.equal(row?.matchedRuleId, 'grocery');
    assert.equal(row?.earnedPaise, 0);
    assert.equal(row?.reason, 'reward_cap_reached');
  }
});

test('comparison and monthly batch reporting preserve independent rule totals', () => {
  const other = {
    id: 'synthetic-flat', name: 'Synthetic Flat Card', annualFeePaise: 0,
    rules: [{ id: 'base', category: '*', rateBps: 100 }]
  };
  const comparison = compareCards([other, card], transactions, 2026);
  const capped = comparison.entries.find(entry => entry.cardId === card.id);
  assert.equal(capped?.calculation.totalRewardsPaise, 1400);
  assert.equal(capped?.netAnnualValuePaise, 1100);
  const report = createBatchReport([{
    id: 'cap-audit', year: 2026, cards: [card, other], transactions
  }]);
  const months = report.scenarios[0].monthlyByCard.find(entry =>
    entry.cardId === card.id)?.months;
  assert.ok(months);
  assert.deepEqual(months.slice(0, 3).map(month => month.totalRewardsPaise),
    [800, 600, 0]);
  assert.equal(months.reduce((sum, month) => sum + month.totalRewardsPaise, 0),
    capped.calculation.totalRewardsPaise);
  assert.equal(months.reduce((sum, month) => sum + month.totalSpendPaise, 0),
    capped.calculation.totalSpendPaise);
});

test('permuted inputs produce identical cap attribution, ranking and reports', () => {
  const reordered = [...transactions].reverse();
  assert.deepEqual(calculateRewards(card, reordered, 2026),
    calculateRewards(card, transactions, 2026));
  const other = {
    id: 'synthetic-flat', name: 'Synthetic Flat Card', annualFeePaise: 0,
    rules: [{ id: 'base', category: '*', rateBps: 100 }]
  };
  assert.deepEqual(compareCards([other, card], reordered, 2026),
    compareCards([card, other], transactions, 2026));
  assert.deepEqual(createBatchReport([{
    id: 'cap-audit', year: 2026, cards: [other, card], transactions: reordered
  }]), createBatchReport([{
    id: 'cap-audit', year: 2026, cards: [card, other], transactions
  }]));
});
