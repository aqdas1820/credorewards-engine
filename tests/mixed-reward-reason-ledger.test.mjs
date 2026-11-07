import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateRewards, compareCards, createBatchReport } from '../dist/index.js';

const card = {
  id: 'synthetic-ledger', name: 'Synthetic Mixed Ledger', annualFeePaise: 250,
  annualFeeWaiverThresholdPaise: 1000,
  feeWaiverExcludedCategories: ['fuel'],
  excludedCategories: ['rent'],
  rules: [
    { id: 'capped', category: 'groceries', rateBps: 100, minTransactionPaise: 100,
      monthlyCapPaise: 3, annualCapPaise: 4 },
    { id: 'zero', category: 'fuel', rateBps: 0 },
    { id: 'fallback', category: '*', rateBps: 100 }
  ]
};
const transactions = [
  { id: '09-fuel', month: '2026-02', category: 'fuel', amountPaise: 100 },
  { id: '07-cap-annual', month: '2026-02', category: 'groceries', amountPaise: 200 },
  { id: '02-below', month: '2026-01', category: 'groceries', amountPaise: 99 },
  { id: '05-cap-exhausted', month: '2026-01', category: 'groceries', amountPaise: 200 },
  { id: '08-no-match', month: '2026-02', category: 'utilities', amountPaise: 0 },
  { id: '04-cap-partial', month: '2026-01', category: 'groceries', amountPaise: 200 },
  { id: '06-rent', month: '2026-01', category: 'rent', amountPaise: 500 },
  { id: '01-round', month: '2026-01', category: 'groceries', amountPaise: 100 },
  { id: '03-cap-full', month: '2026-01', category: 'groceries', amountPaise: 200 }
];

test('mixed reason ledger keeps minimum, rounding, caps and exclusion precedence', () => {
  const result = calculateRewards(card, transactions, 2026);
  assert.deepEqual(result.transactions.map(t => [t.id, t.matchedRuleId, t.earnedPaise, t.reason]), [
    ['01-round', 'capped', 1, 'earned'],
    ['02-below', 'capped', 0, 'below_minimum'],
    ['03-cap-full', 'capped', 2, 'earned'],
    ['04-cap-partial', 'capped', 0, 'reward_cap_reached'],
    ['05-cap-exhausted', 'capped', 0, 'reward_cap_reached'],
    ['06-rent', null, 0, 'excluded_category'],
    ['07-cap-annual', 'capped', 1, 'earned'],
    ['08-no-match', 'fallback', 0, 'rounded_to_zero'],
    ['09-fuel', 'zero', 0, 'zero_reward']
  ]);
  assert.equal(result.totalSpendPaise, 1599);
  assert.equal(result.rewardEligibleSpendPaise, 1200);
  assert.equal(result.feeWaiverEligibleSpendPaise, 1499);
  assert.equal(result.totalRewardsPaise, 4);
  assert.equal(result.annualFeeWaived, true);
  assert.equal(result.netAnnualValuePaise, 4);
  assert.equal(result.transactions.reduce((sum, t) => sum + t.earnedPaise, 0), 4);
  assert.deepEqual(calculateRewards(card, [...transactions].reverse(), 2026), result);
});

test('comparison and batch reuse the identical capped transaction ledger', () => {
  const alternative = { ...card, id: 'synthetic-fee', annualFeeWaiverThresholdPaise: 2000 };
  const comparison = compareCards([alternative, card], transactions, 2026);
  assert.deepEqual(comparison.entries.map(e => [e.cardId, e.netAnnualValuePaise]),
    [['synthetic-ledger', 4], ['synthetic-fee', -246]]);
  const batch = createBatchReport([{ id: 'mixed-ledger', year: 2026,
    cards: [alternative, card], transactions }]);
  assert.deepEqual(batch.scenarios[0].comparison, comparison);
  for (const entry of comparison.entries) {
    assert.equal(entry.calculation.totalRewardsPaise, 4);
    assert.equal(entry.calculation.transactions.reduce((s, t) => s + t.earnedPaise, 0), 4);
  }
});
