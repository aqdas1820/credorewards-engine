import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateRewards } from '../dist/index.js';

const baseCard = {
  id: 'synthetic-reason-boundaries',
  name: 'Synthetic reason boundaries',
  annualFeePaise: 0
};

const tx = (id, amountPaise) => ({
  id, month: '2026-01', category: 'groceries', amountPaise
});

test('zero rate remains zero_reward even with a zero monthly cap', () => {
  const result = calculateRewards({
    ...baseCard,
    rules: [{ id: 'zero', category: '*', rateBps: 0, monthlyCapPaise: 0 }]
  }, [tx('one', 10000)], 2026);
  assert.equal(result.totalRewardsPaise, 0);
  assert.equal(result.rewardEligibleSpendPaise, 10000);
  assert.equal(result.transactions[0].matchedRuleId, 'zero');
  assert.equal(result.transactions[0].reason, 'zero_reward');
});

test('positive rate distinguishes sub-paisa rounding from exhausted cap', () => {
  const card = {
    ...baseCard,
    rules: [{ id: 'capped', category: '*', rateBps: 1, monthlyCapPaise: 0 }]
  };
  const result = calculateRewards(card, [tx('tiny', 1), tx('large', 10000)], 2026);
  assert.equal(result.totalRewardsPaise, 0);
  assert.equal(result.rewardEligibleSpendPaise, 10001);
  assert.deepEqual(
    result.transactions.map(({ id, earnedPaise, reason }) => ({ id, earnedPaise, reason })),
    [
      { id: 'large', earnedPaise: 0, reason: 'reward_cap_reached' },
      { id: 'tiny', earnedPaise: 0, reason: 'rounded_to_zero' }
    ]
  );
});
