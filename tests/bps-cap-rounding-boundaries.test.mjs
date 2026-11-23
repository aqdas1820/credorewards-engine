import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateRewards } from '../dist/index.js';

test('one-basis-point rounding cannot consume a capped reward before one paisa is earned', () => {
  const card = {
    id: 'fictional-bps-cap', name: 'Fictional boundary card',
    annualFeePaise: 0,
    rules: [{
      id: 'base', category: '*', rateBps: 1,
      monthlyCapPaise: 1, annualCapPaise: 2
    }]
  };
  const transactions = [
    { id: 'a-below', month: '2026-01', category: 'other', amountPaise: 9999 },
    { id: 'b-exact', month: '2026-01', category: 'other', amountPaise: 10000 },
    { id: 'c-capped', month: '2026-01', category: 'other', amountPaise: 10000 },
    { id: 'd-reset', month: '2026-02', category: 'other', amountPaise: 10000 },
    { id: 'e-annual', month: '2026-03', category: 'other', amountPaise: 10000 }
  ];
  const original = structuredClone({ card, transactions });
  const forward = calculateRewards(card, transactions, 2026);
  const reverse = calculateRewards(card, [...transactions].reverse(), 2026);
  assert.equal(forward.totalRewardsPaise, 2);
  assert.equal(forward.rewardEligibleSpendPaise, 49999);
  assert.deepEqual(forward.transactions.map(({ id, earnedPaise, reason }) =>
    [id, earnedPaise, reason]), [
    ['a-below', 0, 'rounded_to_zero'],
    ['b-exact', 1, 'earned'],
    ['c-capped', 0, 'reward_cap_reached'],
    ['d-reset', 1, 'earned'],
    ['e-annual', 0, 'reward_cap_reached']
  ]);
  assert.deepEqual(reverse, forward);
  assert.deepEqual({ card, transactions }, original);
});
