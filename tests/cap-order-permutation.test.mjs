import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateRewards, compareCards } from '../dist/index.js';

const capped = {
  id: 'fictional-capped', name: 'Fictional capped', annualFeePaise: 0,
  rules: [{ id: 'base', category: '*', rateBps: 10000, monthlyCapPaise: 300, annualCapPaise: 500 }]
};
const flat = {
  id: 'fictional-flat', name: 'Fictional flat', annualFeePaise: 0,
  rules: [{ id: 'base', category: '*', rateBps: 1000 }]
};
const transactions = [
  { id: 'feb-b', month: '2026-02', category: 'groceries', amountPaise: 100 },
  { id: 'jan-b', month: '2026-01', category: 'utilities', amountPaise: 200 },
  { id: 'feb-a', month: '2026-02', category: 'groceries', amountPaise: 250 },
  { id: 'jan-a', month: '2026-01', category: 'utilities', amountPaise: 200 }
];

test('monthly cap resets, annual cap persists and transactions use canonical month/id order', () => {
  const result = calculateRewards(capped, transactions, 2026);
  assert.deepEqual(result.transactions.map(tx => [tx.id, tx.earnedPaise, tx.reason]), [
    ['jan-a', 200, 'earned'],
    ['jan-b', 100, 'earned'],
    ['feb-a', 200, 'earned'],
    ['feb-b', 0, 'reward_cap_reached']
  ]);
  assert.equal(result.totalSpendPaise, 750);
  assert.equal(result.totalRewardsPaise, 500);
  assert.equal(result.netAnnualValuePaise, 500);
});

test('cap accounting and comparison ranks are invariant to card and transaction permutations', () => {
  const baseline = compareCards([capped, flat], transactions, 2026);
  assert.deepEqual(baseline.entries.map(x => [x.cardId, x.totalRewardsPaise, x.rank]), [
    ['fictional-capped', 500, 1],
    ['fictional-flat', 75, 2]
  ]);
  assert.deepEqual(baseline.entries.map(x => x.differenceFromLeaderPaise), [0, 425]);
  for (const reordered of [
    [...transactions].reverse(),
    [...transactions].sort((a, b) => b.id.localeCompare(a.id)),
    [transactions[2], transactions[0], transactions[3], transactions[1]]
  ]) {
    assert.deepEqual(calculateRewards(capped, reordered, 2026), baseline.entries[0].calculation);
    assert.deepEqual(compareCards([flat, capped], reordered, 2026), baseline);
  }
});
