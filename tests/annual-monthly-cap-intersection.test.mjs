import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateRewards } from '../dist/index.js';

// Synthetic boundary: the smaller remaining cap must win, across months.
const card = Object.freeze({
  id: 'synthetic-intersection',
  name: 'Synthetic cap intersection',
  annualFeePaise: 0,
  rules: Object.freeze([
    Object.freeze({
      id: 'base', category: '*', rateBps: 1000,
      monthlyCapPaise: 700, annualCapPaise: 1000
    })
  ])
});
const transactions = Object.freeze([
  Object.freeze({ id: 'march', month: '2026-03', category: 'groceries', amountPaise: 10000 }),
  Object.freeze({ id: 'february', month: '2026-02', category: 'groceries', amountPaise: 10000 }),
  Object.freeze({ id: 'january', month: '2026-01', category: 'groceries', amountPaise: 10000 })
]);

test('annual cap exhaustion intersects independent monthly caps without negative rewards', () => {
  const result = calculateRewards(card, transactions, 2026);
  assert.equal(result.totalSpendPaise, 30000);
  assert.equal(result.rewardEligibleSpendPaise, 30000);
  assert.equal(result.totalRewardsPaise, 1000);
  assert.equal(result.netAnnualValuePaise, 1000);
  assert.deepEqual(result.transactions.map(({ id, earnedPaise, reason }) => [
    id, earnedPaise, reason
  ]), [
    ['january', 700, 'earned'],
    ['february', 300, 'earned'],
    ['march', 0, 'reward_cap_reached']
  ]);
});

test('annual/monthly cap intersection is independent of caller transaction ordering', () => {
  const expected = calculateRewards(card, transactions, 2026);
  const reversed = calculateRewards(card, [...transactions].reverse(), 2026);
  assert.deepEqual(reversed, expected);
  assert.equal(transactions[0].id, 'march');
});
