import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateRewards } from '../dist/index.js';

test('monthly and annual caps compose across months without carrying a monthly cap forward', () => {
  const card = {
    id: 'fictional-cap-composition',
    name: 'Fictional capped cashback',
    annualFeePaise: 0,
    rules: [{ id: 'groceries', category: 'groceries', rateBps: 10000, monthlyCapPaise: 300, annualCapPaise: 500 }]
  };
  const transactions = [
    { id: 'feb', month: '2026-02', category: 'groceries', amountPaise: 400 },
    { id: 'jan', month: '2026-01', category: 'groceries', amountPaise: 400 },
    { id: 'mar', month: '2026-03', category: 'groceries', amountPaise: 400 }
  ];
  const result = calculateRewards(card, transactions, 2026);
  assert.equal(result.totalSpendPaise, 1200);
  assert.equal(result.rewardEligibleSpendPaise, 1200);
  assert.equal(result.totalRewardsPaise, 500);
  assert.equal(result.netAnnualValuePaise, 500);
  assert.deepEqual(result.transactions.map(({ id, earnedPaise, reason }) => [id, earnedPaise, reason]), [
    ['jan', 300, 'earned'],
    ['feb', 200, 'earned'],
    ['mar', 0, 'reward_cap_reached']
  ]);
  assert.deepEqual(transactions.map(({ id, amountPaise }) => [id, amountPaise]), [
    ['feb', 400], ['jan', 400], ['mar', 400]
  ]);
});
