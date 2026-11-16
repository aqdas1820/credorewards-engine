import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateRewards } from '../dist/index.js';

const card = (rule) => ({
  id: 'synthetic-zero-reasons',
  name: 'Synthetic zero-reward reasons',
  annualFeePaise: 0,
  rules: [rule]
});
const tx = (id, amountPaise) => ({
  id, month: '2026-01', category: 'food', amountPaise
});

test('zero-rate and sub-paisa rewards have distinct stable reasons', () => {
  const zeroRate = calculateRewards(
    card({ id: 'food', category: 'food', rateBps: 0 }),
    [tx('zero-rate', 10000)], 2026
  );
  assert.equal(zeroRate.transactions[0].reason, 'zero_reward');
  assert.equal(zeroRate.transactions[0].earnedPaise, 0);
  assert.equal(zeroRate.rewardEligibleSpendPaise, 10000);

  const rounded = calculateRewards(
    card({ id: 'food', category: 'food', rateBps: 1 }),
    [tx('sub-paisa', 9999)], 2026
  );
  assert.equal(rounded.transactions[0].reason, 'rounded_to_zero');
  assert.equal(rounded.transactions[0].earnedPaise, 0);
  assert.equal(rounded.rewardEligibleSpendPaise, 9999);
});

test('exhausted cap is distinct from rounding and below-minimum', () => {
  const terms = card({
    id: 'food', category: 'food', rateBps: 10000,
    monthlyCapPaise: 1, minTransactionPaise: 2
  });
  const transactions = [tx('c', 2), tx('a', 1), tx('b', 2)];
  const snapshot = structuredClone(transactions);
  const result = calculateRewards(terms, transactions, 2026);
  const byId = Object.fromEntries(result.transactions.map(item => [item.id, item]));
  assert.equal(byId.a.reason, 'below_minimum');
  assert.equal(byId.a.earnedPaise, 0);
  assert.equal(byId.b.reason, 'earned');
  assert.equal(byId.b.earnedPaise, 1);
  assert.equal(byId.c.reason, 'reward_cap_reached');
  assert.equal(byId.c.earnedPaise, 0);
  assert.equal(result.totalRewardsPaise, 1);
  assert.equal(result.rewardEligibleSpendPaise, 4);
  assert.deepEqual(transactions, snapshot);
});
