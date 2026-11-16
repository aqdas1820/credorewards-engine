import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateRewards } from '../dist/index.js';

const transaction = (id, amountPaise, category) => ({
  id, amountPaise, category, month: '2026-01'
});
const card = (rateBps, cap) => ({
  id: 'fictional', name: 'Fictional test card', annualFeePaise: 0,
  rules: [{
    id: 'base', category: '*', rateBps,
    ...(cap === undefined ? {} : { monthlyCapPaise: cap })
  }]
});

test('zero-rate and zero-cap rules produce distinct audit reasons', () => {
  const zeroRate = calculateRewards(card(0), [transaction('a', 10000, 'general')], 2026);
  const zeroCap = calculateRewards(card(1000, 0), [transaction('a', 10000, 'general')], 2026);
  assert.equal(zeroRate.transactions[0].reason, 'zero_reward');
  assert.equal(zeroCap.transactions[0].reason, 'reward_cap_reached');
  for (const result of [zeroRate, zeroCap]) {
    assert.equal(result.totalRewardsPaise, 0);
    assert.equal(result.rewardEligibleSpendPaise, 10000);
    assert.equal(result.transactions[0].earnedPaise, 0);
    assert.equal(result.transactions[0].matchedRuleId, 'base');
  }
});

test('sub-paisa reward is rounded per transaction, not pooled', () => {
  const result = calculateRewards(card(1), [
    transaction('b', 9999, 'general'),
    transaction('a', 9999, 'general'),
    transaction('c', 10000, 'general')
  ], 2026);
  assert.deepEqual(result.transactions.map(tx => [tx.id, tx.earnedPaise, tx.reason]), [
    ['a', 0, 'rounded_to_zero'],
    ['b', 0, 'rounded_to_zero'],
    ['c', 1, 'earned']
  ]);
  assert.equal(result.totalRewardsPaise, 1);
  assert.equal(result.rewardEligibleSpendPaise, 29998);
});
