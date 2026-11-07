import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateRewards, compareCards, createBatchReport } from '../dist/index.js';

const MAX = Number.MAX_SAFE_INTEGER;
const cards = [
  { id: 'waiver', name: 'Synthetic waiver', annualFeePaise: 100,
    annualFeeWaiverThresholdPaise: MAX,
    excludedCategories: ['excluded'], rules: [] },
  { id: 'baseline', name: 'Synthetic baseline', annualFeePaise: 0, rules: [] }
];
const transactions = [
  { id: 'large', month: '2026-01', category: 'excluded', amountPaise: MAX - 1 },
  { id: 'remainder', month: '2026-12', category: 'excluded', amountPaise: 1 }
];

test('split exact-safe-integer spend remains valid and permutation invariant across SDK entry points', () => {
  const snapshot = structuredClone({ cards, transactions });
  for (const ordered of [transactions, [...transactions].reverse()]) {
    const single = calculateRewards(cards[0], ordered, 2026);
    assert.equal(single.totalSpendPaise, MAX);
    assert.equal(single.rewardEligibleSpendPaise, 0);
    assert.equal(single.feeWaiverEligibleSpendPaise, MAX);
    assert.equal(single.annualFeeWaived, true);
    assert.equal(single.annualFeeChargedPaise, 0);
    assert.equal(single.netAnnualValuePaise, 0);

    const comparison = compareCards(cards, ordered, 2026);
    assert.deepEqual(comparison.entries.map(entry => [entry.cardId, entry.netAnnualValuePaise]),
      [['baseline', 0], ['waiver', 0]]);
    const batch = createBatchReport([{ id: 'split-limit', year: 2026, cards, transactions: ordered }]);
    assert.deepEqual(batch.scenarios[0].comparison.entries, comparison.entries);
  }
  assert.deepEqual({ cards, transactions }, snapshot);
});

test('one paise below a split waiver threshold still charges the annual fee', () => {
  const below = transactions.map(tx => tx.id === 'remainder' ? { ...tx, amountPaise: 0 } : tx);
  const result = calculateRewards(cards[0], below, 2026);
  assert.equal(result.totalSpendPaise, MAX - 1);
  assert.equal(result.annualFeeWaived, false);
  assert.equal(result.annualFeeChargedPaise, 100);
  assert.equal(result.netAnnualValuePaise, -100);
});
