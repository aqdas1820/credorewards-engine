import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateRewards } from '../dist/index.js';

test('fractional cashback rounds per transaction before consuming monthly and annual caps', () => {
  const card = Object.freeze({
    id: 'synthetic-rounding-cap',
    name: 'Synthetic rounding and cap ledger',
    annualFeePaise: 0,
    rules: Object.freeze([
      Object.freeze({ id: 'tiny-rate', category: '*', rateBps: 3333, monthlyCapPaise: 2, annualCapPaise: 3 })
    ])
  });
  const transactions = Object.freeze([
    Object.freeze({ id: 'feb-1', month: '2026-02', category: 'groceries', amountPaise: 4 }),
    Object.freeze({ id: 'jan-3', month: '2026-01', category: 'fuel', amountPaise: 4 }),
    Object.freeze({ id: 'jan-2', month: '2026-01', category: 'groceries', amountPaise: 4 }),
    Object.freeze({ id: 'jan-1', month: '2026-01', category: 'fuel', amountPaise: 2 }),
    Object.freeze({ id: 'feb-2', month: '2026-02', category: 'fuel', amountPaise: 4 })
  ]);
  const result = calculateRewards(card, transactions, 2026);
  assert.deepEqual(result.transactions.map(({ id, earnedPaise, reason }) => [id, earnedPaise, reason]), [
    ['jan-1', 0, 'rounded_to_zero'],
    ['jan-2', 1, 'earned'],
    ['jan-3', 1, 'earned'],
    ['feb-1', 1, 'earned'],
    ['feb-2', 0, 'reward_cap_reached']
  ]);
  assert.equal(result.totalSpendPaise, 18);
  assert.equal(result.rewardEligibleSpendPaise, 18);
  assert.equal(result.totalRewardsPaise, 3);
  assert.equal(result.netAnnualValuePaise, 3);
  assert.deepEqual(calculateRewards(card, Object.freeze([...transactions].reverse()), 2026), result);
});
