import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateRewards } from '../dist/index.js';

test('wildcard cashback cap is shared across categories and resets only monthly usage', () => {
  const card = Object.freeze({
    id: 'synthetic-wildcard-cap', name: 'Synthetic wildcard card', annualFeePaise: 0,
    rules: Object.freeze([Object.freeze({
      id: 'fallback', category: '*', rateBps: 10000,
      monthlyCapPaise: 60, annualCapPaise: 100
    })])
  });
  const history = Object.freeze([
    Object.freeze({ id: 'feb-b', month: '2026-02', category: 'fuel', amountPaise: 50 }),
    Object.freeze({ id: 'jan-b', month: '2026-01', category: 'travel', amountPaise: 50 }),
    Object.freeze({ id: 'feb-a', month: '2026-02', category: 'groceries', amountPaise: 50 }),
    Object.freeze({ id: 'jan-a', month: '2026-01', category: 'groceries', amountPaise: 50 })
  ]);
  const forward = calculateRewards(card, history, 2026);
  const reverse = calculateRewards(card, Object.freeze([...history].reverse()), 2026);
  assert.deepEqual(forward, reverse);
  assert.deepEqual(forward.transactions.map(tx => [tx.id, tx.matchedRuleId, tx.earnedPaise, tx.reason]), [
    ['jan-a', 'fallback', 50, 'earned'],
    ['jan-b', 'fallback', 10, 'earned'],
    ['feb-a', 'fallback', 40, 'earned'],
    ['feb-b', 'fallback', 0, 'reward_cap_reached']
  ]);
  assert.equal(forward.totalSpendPaise, 200);
  assert.equal(forward.rewardEligibleSpendPaise, 200);
  assert.equal(forward.totalRewardsPaise, 100);
  assert.equal(forward.netAnnualValuePaise, 100);
});
