import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateRewards } from '../dist/index.js';

test('below-minimum matched transactions do not consume a shared wildcard cap', () => {
  const card = {
    id: 'fictional-shared-minimum', name: 'Fictional shared minimum',
    annualFeePaise: 75,
    annualFeeWaiverThresholdPaise: 300,
    rules: [{
      id: 'shared', category: '*', rateBps: 10000,
      minTransactionPaise: 100, monthlyCapPaise: 150
    }]
  };
  const transactions = [
    { id: 'c', month: '2026-01', category: 'fuel', amountPaise: 100 },
    { id: 'a', month: '2026-01', category: 'groceries', amountPaise: 99 },
    { id: 'b', month: '2026-01', category: 'utilities', amountPaise: 100 },
    { id: 'd', month: '2026-02', category: 'fuel', amountPaise: 100 }
  ];
  const original = structuredClone({ card, transactions });
  const result = calculateRewards(card, transactions, 2026);
  assert.deepEqual(result.transactions.map(({ id, matchedRuleId, earnedPaise, reason }) =>
    ({ id, matchedRuleId, earnedPaise, reason })), [
    { id: 'a', matchedRuleId: 'shared', earnedPaise: 0, reason: 'below_minimum' },
    { id: 'b', matchedRuleId: 'shared', earnedPaise: 100, reason: 'earned' },
    { id: 'c', matchedRuleId: 'shared', earnedPaise: 50, reason: 'earned' },
    { id: 'd', matchedRuleId: 'shared', earnedPaise: 100, reason: 'earned' }
  ]);
  assert.equal(result.totalSpendPaise, 399);
  assert.equal(result.rewardEligibleSpendPaise, 300);
  assert.equal(result.feeWaiverEligibleSpendPaise, 399);
  assert.equal(result.totalRewardsPaise, 250);
  assert.equal(result.annualFeeWaived, true);
  assert.equal(result.annualFeeChargedPaise, 0);
  assert.equal(result.netAnnualValuePaise, 250);
  assert.deepEqual(calculateRewards(card, [...transactions].reverse(), 2026), result);
  assert.deepEqual({ card, transactions }, original);
});
