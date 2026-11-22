import assert from 'node:assert/strict';
import test from 'node:test';
import { calculateRewards } from '../dist/index.js';

test('annual cap persists across months while monthly cap resets', () => {
  const card = {
    id: 'fictional-dual-cap',
    name: 'Fictional dual cap',
    annualFeePaise: 0,
    rules: [{
      id: 'grocery-reward',
      category: 'groceries',
      rateBps: 10000,
      monthlyCapPaise: 2,
      annualCapPaise: 3,
    }],
  };
  const transactions = [
    { id: 'jan-a', month: '2026-01', category: 'groceries', amountPaise: 2 },
    { id: 'jan-b', month: '2026-01', category: 'groceries', amountPaise: 1 },
    { id: 'feb-a', month: '2026-02', category: 'groceries', amountPaise: 2 },
    { id: 'mar-a', month: '2026-03', category: 'groceries', amountPaise: 2 },
  ];
  const originalCard = structuredClone(card);
  const originalTransactions = structuredClone(transactions);
  const forward = calculateRewards(card, transactions, 2026);
  const reversed = calculateRewards(card, [...transactions].reverse(), 2026);

  assert.equal(forward.totalSpendPaise, 7);
  assert.equal(forward.rewardEligibleSpendPaise, 7);
  assert.equal(forward.totalRewardsPaise, 3);
  assert.deepEqual(forward.transactions.map(({ id, earnedPaise, reason }) => [id, earnedPaise, reason]), [
    ['jan-a', 2, 'earned'],
    ['jan-b', 0, 'reward_cap_reached'],
    ['feb-a', 1, 'earned'],
    ['mar-a', 0, 'reward_cap_reached'],
  ]);
  assert.deepEqual(reversed, forward);
  assert.deepEqual(card, originalCard);
  assert.deepEqual(transactions, originalTransactions);
});
