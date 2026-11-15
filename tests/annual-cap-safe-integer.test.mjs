import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateRewards } from '../dist/index.js';

const max = Number.MAX_SAFE_INTEGER;
const card = (annualCapPaise) => ({
  id: 'synthetic-annual-cap-boundary',
  name: 'Synthetic annual cap boundary',
  annualFeePaise: 0,
  rules: [{ id: 'all', category: '*', rateBps: 10000, annualCapPaise }]
});
const transactions = [
  { id: 'jan', month: '2026-01', category: 'general', amountPaise: max - 1 },
  { id: 'feb', month: '2026-02', category: 'general', amountPaise: 1 }
];

test('annual cap at maximum safe integer preserves exact cross-month rewards', () => {
  for (const input of [transactions, [...transactions].reverse()]) {
    const result = calculateRewards(card(max), input, 2026);
    assert.equal(result.totalSpendPaise, max);
    assert.equal(result.totalRewardsPaise, max);
    assert.equal(result.netAnnualValuePaise, max);
    assert.deepEqual(
      Object.fromEntries(result.transactions.map(t => [t.id, t.earnedPaise])),
      { jan: max - 1, feb: 1 }
    );
  }
});

test('annual cap one paisa below maximum stops the final transaction', () => {
  for (const input of [transactions, [...transactions].reverse()]) {
    const result = calculateRewards(card(max - 1), input, 2026);
    assert.equal(result.totalSpendPaise, max);
    assert.equal(result.totalRewardsPaise, max - 1);
    assert.equal(result.netAnnualValuePaise, max - 1);
    assert.deepEqual(
      Object.fromEntries(result.transactions.map(t => [t.id, t.earnedPaise])),
      { jan: max - 1, feb: 0 }
    );
    assert.equal(result.transactions.find(t => t.id === 'feb').reason, 'reward_cap_reached');
  }
});
