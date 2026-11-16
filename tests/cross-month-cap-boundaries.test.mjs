import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateRewards } from '../dist/index.js';

const card = {
  id: 'synthetic-cross-month-caps',
  name: 'Synthetic cross-month caps',
  annualFeePaise: 0,
  rules: [{ id: 'food', category: 'food', rateBps: 1000, monthlyCapPaise: 600, annualCapPaise: 1000 }]
};
const transactions = [
  { id: 'march', month: '2026-03', category: 'food', amountPaise: 10000 },
  { id: 'february', month: '2026-02', category: 'food', amountPaise: 10000 },
  { id: 'january', month: '2026-01', category: 'food', amountPaise: 10000 }
];

test('monthly cap resets across months while annual cap remains shared', () => {
  const result = calculateRewards(card, transactions, 2026);
  assert.equal(result.totalRewardsPaise, 1000);
  assert.deepEqual(result.transactions.map(({ id, earnedPaise, reason }) => ({ id, earnedPaise, reason })), [
    { id: 'january', earnedPaise: 600, reason: 'earned' },
    { id: 'february', earnedPaise: 400, reason: 'earned' },
    { id: 'march', earnedPaise: 0, reason: 'reward_cap_reached' }
  ]);
  assert.equal(result.netAnnualValuePaise, 1000);
});

test('cross-month cap allocation is independent of caller transaction order', () => {
  const original = structuredClone(transactions);
  const forward = calculateRewards(card, transactions, 2026);
  const reverse = calculateRewards(card, [...transactions].reverse(), 2026);
  assert.deepEqual(reverse.transactions, forward.transactions);
  assert.equal(reverse.totalRewardsPaise, forward.totalRewardsPaise);
  assert.deepEqual(transactions, original);
});
