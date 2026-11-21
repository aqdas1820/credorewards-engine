import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateRewards } from '../dist/index.js';

test('independent rule caps do not consume each other across months', () => {
  const card = Object.freeze({
    id: 'fictional-independent-caps', name: 'Fictional independent caps', annualFeePaise: 0,
    rules: Object.freeze([
      Object.freeze({ id: 'groceries', category: 'grocery', rateBps: 10000, monthlyCapPaise: 3, annualCapPaise: 5 }),
      Object.freeze({ id: 'utilities', category: 'utility', rateBps: 10000, monthlyCapPaise: 4, annualCapPaise: 6 })
    ])
  });
  const transactions = Object.freeze([
    Object.freeze({ id: 'u2', month: '2026-02', category: 'utility', amountPaise: 4 }),
    Object.freeze({ id: 'g1', month: '2026-01', category: 'grocery', amountPaise: 4 }),
    Object.freeze({ id: 'u1', month: '2026-01', category: 'utility', amountPaise: 5 }),
    Object.freeze({ id: 'g2', month: '2026-02', category: 'grocery', amountPaise: 4 })
  ]);
  const result = calculateRewards(card, transactions, 2026);
  assert.equal(result.totalSpendPaise, 17);
  assert.equal(result.rewardEligibleSpendPaise, 17);
  assert.equal(result.totalRewardsPaise, 11);
  assert.equal(result.netAnnualValuePaise, 11);
  assert.deepEqual(result.transactions.map(({ id, matchedRuleId, earnedPaise }) => [id, matchedRuleId, earnedPaise]), [
    ['g1', 'groceries', 3], ['u1', 'utilities', 4],
    ['g2', 'groceries', 2], ['u2', 'utilities', 2]
  ]);
  assert.deepEqual(calculateRewards(card, [...transactions].reverse(), 2026), result);
});
