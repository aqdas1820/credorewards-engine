import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateRewards } from '../dist/index.js';

const max = Number.MAX_SAFE_INTEGER;
const card = (monthlyCapPaise) => ({
  id: 'synthetic-monthly-cap-max-boundary',
  name: 'Synthetic monthly cap boundary',
  annualFeePaise: 0,
  rules: [{ id: 'all', category: '*', rateBps: 10000, monthlyCapPaise }]
});
const transactions = [
  { id: 'a', month: '2026-01', category: 'general', amountPaise: max - 1 },
  { id: 'b', month: '2026-01', category: 'general', amountPaise: 1 }
];

test('monthly cap at maximum safe integer preserves exact rewards', () => {
  for (const input of [transactions, [...transactions].reverse()]) {
    const result = calculateRewards(card(max), input, 2026);
    assert.equal(result.totalSpendPaise, max);
    assert.equal(result.totalRewardsPaise, max);
    assert.equal(result.netAnnualValuePaise, max);
    assert.deepEqual(Object.fromEntries(result.transactions.map(t => [t.id, t.earnedPaise])),
      { a: max - 1, b: 1 });
  }
});

test('monthly cap one paisa below maximum stops the last transaction', () => {
  for (const input of [transactions, [...transactions].reverse()]) {
    const result = calculateRewards(card(max - 1), input, 2026);
    assert.equal(result.totalSpendPaise, max);
    assert.equal(result.totalRewardsPaise, max - 1);
    assert.deepEqual(Object.fromEntries(result.transactions.map(t => [t.id, t.earnedPaise])),
      { a: max - 1, b: 0 });
    assert.equal(result.transactions.find(t => t.id === 'b').reason, 'reward_cap_reached');
  }
});
