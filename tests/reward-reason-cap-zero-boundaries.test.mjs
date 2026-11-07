import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateRewards, compareCards, createBatchReport } from '../dist/index.js';

const tx = (id, month, amountPaise) => ({
  id, month, amountPaise, category: 'groceries'
});

const capped = {
  id: 'capped', name: 'Synthetic capped cashback', annualFeePaise: 0,
  rules: [{ id: 'groceries', category: 'groceries', rateBps: 5000,
    monthlyCapPaise: 1, annualCapPaise: 2 }]
};

const zeroRate = {
  id: 'zero', name: 'Synthetic zero-rate card', annualFeePaise: 0,
  rules: [{ id: 'groceries', category: 'groceries', rateBps: 0,
    monthlyCapPaise: 0, annualCapPaise: 0 }]
};

test('zero-rate rules report zero_reward even when caps are zero', () => {
  const result = calculateRewards(zeroRate, [
    tx('a', '2026-01', 0), tx('b', '2026-01', 100)
  ], 2026);
  assert.deepEqual(result.transactions.map(row => [row.id, row.reason, row.earnedPaise]), [
    ['a', 'zero_reward', 0], ['b', 'zero_reward', 0]
  ]);
  assert.equal(result.totalRewardsPaise, 0);
  assert.equal(result.rewardEligibleSpendPaise, 100);
});

test('rounding, monthly cap and annual cap yield distinct audit reasons', () => {
  const transactions = [
    tx('feb-b', '2026-02', 4),
    tx('jan-c', '2026-01', 4),
    tx('jan-a', '2026-01', 1),
    tx('feb-a', '2026-02', 4),
    tx('jan-b', '2026-01', 4),
    tx('mar-a', '2026-03', 4)
  ];
  const before = structuredClone(transactions);
  const result = calculateRewards(capped, transactions, 2026);
  assert.deepEqual(result.transactions.map(row => [row.id, row.reason, row.earnedPaise]), [
    ['jan-a', 'rounded_to_zero', 0],
    ['jan-b', 'earned', 1],
    ['jan-c', 'reward_cap_reached', 0],
    ['feb-a', 'earned', 1],
    ['feb-b', 'reward_cap_reached', 0],
    ['mar-a', 'reward_cap_reached', 0]
  ]);
  assert.equal(result.totalRewardsPaise, 2);
  assert.equal(result.rewardEligibleSpendPaise, 21);
  assert.deepEqual(transactions, before);

  const comparison = compareCards([zeroRate, capped], transactions, 2026);
  assert.deepEqual(comparison.entries.map(entry => [entry.cardId, entry.totalRewardsPaise]),
    [['capped', 2], ['zero', 0]]);
  const batch = createBatchReport([{ id: 'synthetic-audit', year: 2026,
    cards: [zeroRate, capped], transactions }]);
  const monthly = batch.scenarios[0].monthlyByCard
    .find(row => row.cardId === 'capped').months;
  assert.deepEqual(monthly.slice(0, 3).map(row => row.totalRewardsPaise), [1, 1, 0]);
  assert.equal(monthly.reduce((sum, row) => sum + row.totalRewardsPaise, 0),
    result.totalRewardsPaise);
});
