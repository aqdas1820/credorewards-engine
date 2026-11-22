import assert from 'node:assert/strict';
import test from 'node:test';
import { calculateRewards } from '../dist/index.js';

const card = {
  id: 'fictional-rounding-cap',
  name: 'Fictional rounding cap',
  annualFeePaise: 0,
  rules: [{ id: 'groceries-1pct', category: 'groceries', rateBps: 100, monthlyCapPaise: 1 }],
};

test('round down each transaction before applying a shared monthly cap', () => {
  const transactions = [
    { id: 'a-below', month: '2026-01', category: 'groceries', amountPaise: 99 },
    { id: 'b-exact', month: '2026-01', category: 'groceries', amountPaise: 100 },
    { id: 'c-capped', month: '2026-01', category: 'groceries', amountPaise: 100 },
    { id: 'd-next-month', month: '2026-02', category: 'groceries', amountPaise: 100 },
  ];
  const original = structuredClone(transactions);
  const terms = structuredClone(card);
  const forward = calculateRewards(card, transactions, 2026);
  const reversed = calculateRewards(card, [...transactions].reverse(), 2026);

  assert.equal(forward.totalSpendPaise, 399);
  assert.equal(forward.rewardEligibleSpendPaise, 399);
  assert.equal(forward.totalRewardsPaise, 2);
  assert.deepEqual(forward.transactions.map(({ id, earnedPaise, reason }) => [id, earnedPaise, reason]), [
    ['a-below', 0, 'rounded_to_zero'],
    ['b-exact', 1, 'earned'],
    ['c-capped', 0, 'reward_cap_reached'],
    ['d-next-month', 1, 'earned'],
  ]);
  assert.deepEqual(reversed, forward);
  assert.deepEqual(transactions, original);
  assert.deepEqual(card, terms);
});
