import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateRewards } from '../dist/index.js';

test('monthly cap is shared across transactions before the annual cap is exhausted', () => {
  const card = {
    id: 'fictional-shared-cap',
    name: 'Fictional shared-cap card',
    annualFeePaise: 0,
    rules: [{ id: 'groceries', category: 'groceries', rateBps: 10000, monthlyCapPaise: 300, annualCapPaise: 500 }]
  };
  const transactions = [
    { id: 'feb-a', month: '2026-02', category: 'groceries', amountPaise: 200 },
    { id: 'jan-b', month: '2026-01', category: 'groceries', amountPaise: 200 },
    { id: 'jan-a', month: '2026-01', category: 'groceries', amountPaise: 200 },
    { id: 'feb-b', month: '2026-02', category: 'groceries', amountPaise: 200 },
    { id: 'mar-a', month: '2026-03', category: 'groceries', amountPaise: 200 }
  ];
  const snapshot = structuredClone(transactions);
  const result = calculateRewards(card, transactions, 2026);
  assert.equal(result.totalSpendPaise, 1000);
  assert.equal(result.totalRewardsPaise, 500);
  assert.equal(result.netAnnualValuePaise, 500);
  assert.deepEqual(result.transactions.map(({ id, earnedPaise, reason }) => [id, earnedPaise, reason]), [
    ['jan-a', 200, 'earned'],
    ['jan-b', 100, 'earned'],
    ['feb-a', 200, 'earned'],
    ['feb-b', 0, 'reward_cap_reached'],
    ['mar-a', 0, 'reward_cap_reached']
  ]);
  assert.deepEqual(transactions, snapshot);
});
