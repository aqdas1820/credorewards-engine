import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateRewards } from '../dist/index.js';

test('one-basis-point monthly and annual caps compose without affecting fee waiver', () => {
  const card = {
    id: 'synthetic-low-bps',
    name: 'Fictional low-rate capped card',
    annualFeePaise: 75,
    annualFeeWaiverThresholdPaise: 50000,
    excludedCategories: [],
    rules: [{
      id: 'base', category: '*', rateBps: 1,
      monthlyCapPaise: 1, annualCapPaise: 2
    }]
  };
  const transactions = [
    { id: 'jan-a', month: '2026-01', category: 'general', amountPaise: 10000 },
    { id: 'jan-b', month: '2026-01', category: 'general', amountPaise: 20000 },
    { id: 'feb-a', month: '2026-02', category: 'general', amountPaise: 10000 },
    { id: 'mar-a', month: '2026-03', category: 'general', amountPaise: 10000 }
  ];
  const originalCard = structuredClone(card);
  const originalTransactions = structuredClone(transactions);
  for (const input of [transactions, [...transactions].reverse()]) {
    const result = calculateRewards(card, input, 2026);
    assert.equal(result.totalSpendPaise, 50000);
    assert.equal(result.rewardEligibleSpendPaise, 50000);
    assert.equal(result.feeWaiverEligibleSpendPaise, 50000);
    assert.equal(result.totalRewardsPaise, 2);
    assert.equal(result.annualFeeWaived, true);
    assert.equal(result.annualFeeChargedPaise, 0);
    assert.equal(result.netAnnualValuePaise, 2);
    assert.deepEqual(
      Object.fromEntries(result.transactions.map(({ id, earnedPaise, reason }) =>
        [id, { earnedPaise, reason }])),
      {
        'jan-a': { earnedPaise: 1, reason: 'earned' },
        'jan-b': { earnedPaise: 0, reason: 'reward_cap_reached' },
        'feb-a': { earnedPaise: 1, reason: 'earned' },
        'mar-a': { earnedPaise: 0, reason: 'reward_cap_reached' }
      }
    );
  }
  assert.deepEqual(card, originalCard);
  assert.deepEqual(transactions, originalTransactions);
});
