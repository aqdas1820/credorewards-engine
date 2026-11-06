import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateRewards, compareCards, createBatchReport } from '../dist/index.js';

const terms = {
  id: 'synthetic-reasons',
  name: 'Synthetic reason attribution',
  annualFeePaise: 0,
  excludedCategories: ['excluded'],
  rules: [
    { id: 'minimum', category: 'minimum', rateBps: 100, minTransactionPaise: 100 },
    { id: 'zero', category: 'zero', rateBps: 0 },
    { id: 'round', category: 'round', rateBps: 1 },
    { id: 'capped', category: 'capped', rateBps: 10000, monthlyCapPaise: 10 }
  ]
};
const transactions = [
  { id: '01-excluded', month: '2026-01', category: 'excluded', amountPaise: 100 },
  { id: '02-unmatched', month: '2026-01', category: 'unknown', amountPaise: 100 },
  { id: '03-minimum', month: '2026-01', category: 'minimum', amountPaise: 99 },
  { id: '04-zero', month: '2026-01', category: 'zero', amountPaise: 100 },
  { id: '05-rounded', month: '2026-01', category: 'round', amountPaise: 1 },
  { id: '06-earned', month: '2026-01', category: 'capped', amountPaise: 10 },
  { id: '07-capped', month: '2026-01', category: 'capped', amountPaise: 10 }
];
const reasons = [
  'excluded_category', 'no_matching_rule', 'below_minimum', 'zero_reward',
  'rounded_to_zero', 'earned', 'reward_cap_reached'
];

test('all seven transaction reasons retain their exact rule attribution and paise totals', () => {
  const result = calculateRewards(terms, transactions, 2026);
  assert.deepEqual(result.transactions.map(tx => tx.reason), reasons);
  assert.deepEqual(result.transactions.map(tx => tx.matchedRuleId),
    [null, null, 'minimum', 'zero', 'round', 'capped', 'capped']);
  assert.deepEqual(result.transactions.map(tx => tx.earnedPaise), [0, 0, 0, 0, 0, 10, 0]);
  assert.equal(result.totalRewardsPaise, 10);
  assert.equal(result.totalSpendPaise, 420);
  assert.equal(result.rewardEligibleSpendPaise, 121);
});

test('comparison and batch preserve reason-level audit records without changing inputs', () => {
  const cards = [terms, { ...terms, id: 'synthetic-other', name: 'Synthetic other' }];
  const snapshot = structuredClone({ cards, transactions });
  const compared = compareCards(cards, transactions, 2026);
  assert.deepEqual(compared.leaderCardIds, ['synthetic-other', 'synthetic-reasons']);
  for (const entry of compared.entries) {
    assert.deepEqual(entry.calculation.transactions.map(tx => tx.reason), reasons);
    assert.equal(entry.calculation.totalRewardsPaise, 10);
  }
  const report = createBatchReport([{ id: 'reason-audit', year: 2026, cards, transactions }]);
  for (const entry of report.scenarios[0].comparison.entries) {
    assert.deepEqual(entry.calculation.transactions.map(tx => tx.reason), reasons);
  }
  for (const summary of report.scenarios[0].monthlyByCard) {
    assert.equal(summary.months[0].totalRewardsPaise, 10);
    assert.equal(summary.months[0].transactionCount, 7);
  }
  assert.deepEqual({ cards, transactions }, snapshot);
});
