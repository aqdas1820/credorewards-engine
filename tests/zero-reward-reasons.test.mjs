import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateRewards } from '../dist/index.js';

const transaction = (amountPaise) => [{
  id: 'synthetic-transaction',
  month: '2026-01',
  category: 'groceries',
  amountPaise
}];

const card = (rateBps, monthlyCapPaise) => ({
  id: 'synthetic-reason-card',
  name: 'Synthetic reason card',
  annualFeePaise: 0,
  rules: [{
    id: 'groceries',
    category: 'groceries',
    rateBps,
    ...(monthlyCapPaise === undefined ? {} : { monthlyCapPaise })
  }]
});

test('zero cashback rate reports zero_reward rather than cap exhaustion', () => {
  const result = calculateRewards(card(0, 0), transaction(10000), 2026);
  assert.equal(result.totalRewardsPaise, 0);
  assert.equal(result.transactions[0].earnedPaise, 0);
  assert.equal(result.transactions[0].reason, 'zero_reward');
});

test('positive raw cashback with zero monthly cap reports reward_cap_reached', () => {
  const result = calculateRewards(card(10000, 0), transaction(10000), 2026);
  assert.equal(result.totalRewardsPaise, 0);
  assert.equal(result.transactions[0].earnedPaise, 0);
  assert.equal(result.transactions[0].reason, 'reward_cap_reached');
});

test('sub-paisa cashback reports rounded_to_zero before cap exhaustion', () => {
  const result = calculateRewards(card(1, 0), transaction(1), 2026);
  assert.equal(result.totalRewardsPaise, 0);
  assert.equal(result.transactions[0].earnedPaise, 0);
  assert.equal(result.transactions[0].reason, 'rounded_to_zero');
});
