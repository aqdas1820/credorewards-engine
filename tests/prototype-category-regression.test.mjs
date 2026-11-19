import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateRewards } from '../dist/index.js';

test('prototype-like category names are matched as literal data', () => {
  const card = {
    id: 'synthetic', name: 'Synthetic', annualFeePaise: 0,
    rules: [
      { id: 'literal', category: '__proto__', rateBps: 1000 },
      { id: 'fallback', category: '*', rateBps: 100 }
    ]
  };
  const transactions = [
    { id: 'a', month: '2026-01', category: '__proto__', amountPaise: 10000 },
    { id: 'b', month: '2026-01', category: 'constructor', amountPaise: 10000 }
  ];
  const before = structuredClone({ card, transactions });
  const result = calculateRewards(card, transactions, 2026);
  assert.deepEqual(result.transactions.map(({ matchedRuleId, earnedPaise }) => [matchedRuleId, earnedPaise]), [
    ['literal', 1000], ['fallback', 100]
  ]);
  assert.equal(result.totalRewardsPaise, 1100);
  assert.deepEqual({ card, transactions }, before);
});

test('prototype-like exclusion names do not exclude unrelated categories', () => {
  const card = {
    id: 'synthetic', name: 'Synthetic', annualFeePaise: 0,
    excludedCategories: ['constructor'],
    feeWaiverExcludedCategories: ['__proto__'],
    annualFeeWaiverThresholdPaise: 10000,
    rules: [{ id: 'base', category: '*', rateBps: 1000 }]
  };
  const transactions = [
    { id: 'a', month: '2026-01', category: '__proto__', amountPaise: 10000 },
    { id: 'b', month: '2026-01', category: 'constructor', amountPaise: 10000 }
  ];
  const result = calculateRewards(card, transactions, 2026);
  assert.deepEqual(result.transactions.map(({ reason, earnedPaise }) => [reason, earnedPaise]), [
    ['earned', 1000], ['excluded_category', 0]
  ]);
  assert.equal(result.feeWaiverEligibleSpendPaise, 10000);
  assert.equal(result.annualFeeWaived, true);
});
