import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateRewards } from '../dist/index.js';

test('annual reward cap carries across months regardless of caller transaction order', () => {
  const card = Object.freeze({
    id: 'synthetic-cap', name: 'Synthetic capped card', annualFeePaise: 0,
    rules: Object.freeze([Object.freeze({
      id: 'groceries', category: 'groceries', rateBps: 10000,
      monthlyCapPaise: 70, annualCapPaise: 100
    })])
  });
  const transactions = Object.freeze([
    Object.freeze({ id: 'feb-b', month: '2026-02', category: 'groceries', amountPaise: 10 }),
    Object.freeze({ id: 'feb-a', month: '2026-02', category: 'groceries', amountPaise: 80 }),
    Object.freeze({ id: 'jan-a', month: '2026-01', category: 'groceries', amountPaise: 80 })
  ]);
  const forward = calculateRewards(card, transactions, 2026);
  const reversed = calculateRewards(card, Object.freeze([...transactions].reverse()), 2026);
  assert.deepEqual(forward, reversed);
  assert.deepEqual(forward.transactions.map(tx => [tx.id, tx.earnedPaise, tx.reason]), [
    ['jan-a', 70, 'earned'],
    ['feb-a', 30, 'earned'],
    ['feb-b', 0, 'reward_cap_reached']
  ]);
  assert.equal(forward.totalSpendPaise, 170);
  assert.equal(forward.totalRewardsPaise, 100);
  assert.equal(forward.netAnnualValuePaise, 100);
});
