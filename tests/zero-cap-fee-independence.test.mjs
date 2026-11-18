import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateRewards } from '../dist/index.js';

// Synthetic boundary: a zero cashback cap must not suppress qualifying fee-waiver spend.
test('zero monthly reward cap preserves fee-waiver spend and charges no fee at threshold', () => {
  const card = {
    id: 'zero-monthly', name: 'Fictional zero monthly cap',
    annualFeePaise: 500, annualFeeWaiverThresholdPaise: 10000,
    rules: [{ id: 'base', category: '*', rateBps: 1000, monthlyCapPaise: 0 }]
  };
  const transactions = [{ id: 'a', month: '2026-01', category: 'general', amountPaise: 10000 }];
  const before = structuredClone({ card, transactions });
  const result = calculateRewards(card, transactions, 2026);
  assert.equal(result.totalSpendPaise, 10000);
  assert.equal(result.rewardEligibleSpendPaise, 10000);
  assert.equal(result.feeWaiverEligibleSpendPaise, 10000);
  assert.equal(result.totalRewardsPaise, 0);
  assert.equal(result.transactions[0].reason, 'reward_cap_reached');
  assert.equal(result.annualFeeWaived, true);
  assert.equal(result.annualFeeChargedPaise, 0);
  assert.equal(result.netAnnualValuePaise, 0);
  assert.deepEqual({ card, transactions }, before);
});

test('zero annual reward cap across months does not waive a fee below threshold', () => {
  const card = {
    id: 'zero-annual', name: 'Fictional zero annual cap',
    annualFeePaise: 500, annualFeeWaiverThresholdPaise: 10001,
    rules: [{ id: 'base', category: '*', rateBps: 1000, annualCapPaise: 0 }]
  };
  const transactions = [
    { id: 'a', month: '2026-01', category: 'general', amountPaise: 4000 },
    { id: 'b', month: '2026-02', category: 'general', amountPaise: 6000 }
  ];
  const result = calculateRewards(card, transactions, 2026);
  assert.equal(result.totalRewardsPaise, 0);
  assert.deepEqual(result.transactions.map(t => t.reason), ['reward_cap_reached', 'reward_cap_reached']);
  assert.equal(result.feeWaiverEligibleSpendPaise, 10000);
  assert.equal(result.annualFeeWaived, false);
  assert.equal(result.annualFeeChargedPaise, 500);
  assert.equal(result.netAnnualValuePaise, -500);
});
