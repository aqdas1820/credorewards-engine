import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateRewards } from '../dist/index.js';

const card = {
  id: 'fictional-cap-calendar',
  name: 'Fictional cap calendar',
  annualFeePaise: 0,
  rules: [{
    id: 'base',
    category: '*',
    rateBps: 1000,
    monthlyCapPaise: 100,
    annualCapPaise: 250
  }]
};

const tx = (id, month, amountPaise = 2000) => ({
  id, month, amountPaise, category: 'general'
});

test('monthly reward cap resets at the calendar-month boundary', () => {
  const transactions = [
    tx('jan', '2026-01'),
    tx('feb', '2026-02')
  ];
  const snapshot = structuredClone(transactions);
  const result = calculateRewards(card, transactions, 2026);
  assert.deepEqual(result.transactions.map(({ id, earnedPaise, reason }) =>
    ({ id, earnedPaise, reason })), [
    { id: 'jan', earnedPaise: 100, reason: 'earned' },
    { id: 'feb', earnedPaise: 100, reason: 'earned' }
  ]);
  assert.equal(result.totalRewardsPaise, 200);
  assert.deepEqual(transactions, snapshot);
});

test('annual cap carries across months and limits the final month independently of input order', () => {
  const transactions = [
    tx('mar', '2026-03'),
    tx('jan', '2026-01'),
    tx('apr', '2026-04'),
    tx('feb', '2026-02')
  ];
  const snapshot = structuredClone(transactions);
  const forward = calculateRewards(card, transactions, 2026);
  const reverse = calculateRewards(card, [...transactions].reverse(), 2026);
  assert.deepEqual(forward, reverse);
  assert.deepEqual(forward.transactions.map(({ id, earnedPaise, reason }) =>
    ({ id, earnedPaise, reason })), [
    { id: 'jan', earnedPaise: 100, reason: 'earned' },
    { id: 'feb', earnedPaise: 100, reason: 'earned' },
    { id: 'mar', earnedPaise: 50, reason: 'earned' },
    { id: 'apr', earnedPaise: 0, reason: 'reward_cap_reached' }
  ]);
  assert.equal(forward.totalRewardsPaise, 250);
  assert.equal(forward.netAnnualValuePaise, 250);
  assert.deepEqual(transactions, snapshot);
});
