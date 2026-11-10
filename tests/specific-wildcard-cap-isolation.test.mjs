import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateRewards } from '../dist/index.js';

test('specific and fallback rules maintain independent caps across months', () => {
  const card = Object.freeze({
    id: 'synthetic-rule-isolation', name: 'Synthetic rule isolation', annualFeePaise: 0,
    rules: Object.freeze([
      Object.freeze({ id: 'groceries', category: 'groceries', rateBps: 10000, monthlyCapPaise: 30, annualCapPaise: 40 }),
      Object.freeze({ id: 'fallback', category: '*', rateBps: 10000, monthlyCapPaise: 50, annualCapPaise: 60 })
    ])
  });
  const transactions = Object.freeze([
    Object.freeze({ id: 'feb-fuel', month: '2026-02', category: 'fuel', amountPaise: 50 }),
    Object.freeze({ id: 'jan-fuel', month: '2026-01', category: 'fuel', amountPaise: 50 }),
    Object.freeze({ id: 'feb-grocery', month: '2026-02', category: 'groceries', amountPaise: 50 }),
    Object.freeze({ id: 'jan-grocery', month: '2026-01', category: 'groceries', amountPaise: 50 })
  ]);
  const first = calculateRewards(card, transactions, 2026);
  const reversed = calculateRewards(card, Object.freeze([...transactions].reverse()), 2026);
  assert.deepEqual(first, reversed);
  assert.deepEqual(first.transactions.map(tx => [tx.id, tx.matchedRuleId, tx.earnedPaise, tx.reason]), [
    ['jan-fuel', 'fallback', 50, 'earned'],
    ['jan-grocery', 'groceries', 30, 'earned'],
    ['feb-fuel', 'fallback', 10, 'earned'],
    ['feb-grocery', 'groceries', 10, 'earned']
  ]);
  assert.equal(first.totalSpendPaise, 200);
  assert.equal(first.rewardEligibleSpendPaise, 200);
  assert.equal(first.totalRewardsPaise, 100);
  assert.equal(first.netAnnualValuePaise, 100);
});
