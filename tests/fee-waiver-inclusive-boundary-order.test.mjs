import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateRewards } from '../dist/index.js';

const card = {
  id: 'synthetic-waiver-boundary',
  name: 'Synthetic fee waiver boundary',
  annualFeePaise: 25,
  annualFeeWaiverThresholdPaise: 100,
  feeWaiverExcludedCategories: ['rent'],
  rules: [{ id: 'zero', category: '*', rateBps: 0 }]
};

const transactions = [
  { id: 'a', month: '2026-01', category: 'groceries', amountPaise: 60 },
  { id: 'b', month: '2026-02', category: 'utilities', amountPaise: 40 },
  { id: 'c', month: '2026-03', category: 'rent', amountPaise: 1000 }
];

test('fee waiver threshold is inclusive and excludes nonqualifying spend in either order', () => {
  const originalCard = structuredClone(card);
  const originalTransactions = structuredClone(transactions);
  for (const input of [transactions, [...transactions].reverse()]) {
    const result = calculateRewards(card, input, 2026);
    assert.equal(result.totalSpendPaise, 1100);
    assert.equal(result.feeWaiverEligibleSpendPaise, 100);
    assert.equal(result.annualFeeWaived, true);
    assert.equal(result.annualFeeChargedPaise, 0);
    assert.equal(result.netAnnualValuePaise, 0);
  }
  assert.deepEqual(card, originalCard);
  assert.deepEqual(transactions, originalTransactions);
});

test('one paisa below qualifying threshold does not waive the fee', () => {
  const below = transactions.map(tx => tx.id === 'b' ? { ...tx, amountPaise: 39 } : { ...tx });
  const snapshot = structuredClone(below);
  for (const input of [below, [...below].reverse()]) {
    const result = calculateRewards(card, input, 2026);
    assert.equal(result.totalSpendPaise, 1099);
    assert.equal(result.feeWaiverEligibleSpendPaise, 99);
    assert.equal(result.annualFeeWaived, false);
    assert.equal(result.annualFeeChargedPaise, 25);
    assert.equal(result.netAnnualValuePaise, -25);
  }
  assert.deepEqual(below, snapshot);
});
