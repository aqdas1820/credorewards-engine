import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateRewards, compareCards } from '../dist/index.js';

function seeded(seed) {
  let state = seed >>> 0;
  return () => (state = (Math.imul(state, 1664525) + 1013904223) >>> 0);
}

test('independent seeded annual-fee waiver ledger reconciles excluded spend', () => {
  const random = seeded(0xfee2026);
  for (let scenario = 0; scenario < 80; scenario++) {
    const annualFeePaise = 1 + random() % 20000;
    const threshold = 1 + random() % 120000;
    const card = {
      id: 'fee-' + scenario, name: 'Fictional waiver reference',
      annualFeePaise, annualFeeWaiverThresholdPaise: threshold,
      feeWaiverExcludedCategories: ['rent', 'fuel'],
      rules: [{ id: 'zero', category: '*', rateBps: 0 }]
    };
    const transactions = Array.from({ length: 24 }, (_, index) => ({
      id: String(index).padStart(3, '0'),
      month: '2026-' + String(1 + random() % 12).padStart(2, '0'),
      category: ['rent', 'fuel', 'groceries', 'utilities'][random() % 4],
      amountPaise: random() % 20000
    }));
    const original = structuredClone(transactions);
    // Independent simple integer sums: no SDK helper or engine result as oracle.
    const total = transactions.reduce((sum, tx) => sum + tx.amountPaise, 0);
    const eligible = transactions.reduce((sum, tx) =>
      sum + (tx.category === 'rent' || tx.category === 'fuel' ? 0 : tx.amountPaise), 0);
    const waived = eligible >= threshold;
    const expectedFee = waived ? 0 : annualFeePaise;
    const result = calculateRewards(card, transactions, 2026);
    assert.equal(result.totalSpendPaise, total, 'total scenario ' + scenario);
    assert.equal(result.feeWaiverEligibleSpendPaise, eligible, 'eligible scenario ' + scenario);
    assert.equal(result.annualFeeWaived, waived, 'waiver scenario ' + scenario);
    assert.equal(result.annualFeeChargedPaise, expectedFee, 'fee scenario ' + scenario);
    assert.equal(result.totalRewardsPaise, 0, 'zero-rate scenario ' + scenario);
    assert.equal(result.netAnnualValuePaise, expectedFee === 0 ? 0 : -expectedFee, 'net scenario ' + scenario);
    assert.deepEqual(result, calculateRewards(card, [...transactions].reverse(), 2026));
    assert.deepEqual(transactions, original, 'mutated input scenario ' + scenario);
  }
});

test('fee-waiver boundary is inclusive and excludes rent even when rewards allow rent', () => {
  const card = {
    id: 'boundary', name: 'Synthetic threshold', annualFeePaise: 999,
    annualFeeWaiverThresholdPaise: 1000, feeWaiverExcludedCategories: ['rent'],
    rules: [{ id: 'zero', category: '*', rateBps: 0 }]
  };
  const tx = (id, category, amountPaise) =>
    ({ id, category, amountPaise, month: '2026-01' });
  const before = calculateRewards(card, [tx('rent', 'rent', 5000), tx('eligible', 'food', 999)], 2026);
  const exact = calculateRewards(card, [tx('rent', 'rent', 5000), tx('eligible', 'food', 1000)], 2026);
  assert.equal(before.annualFeeChargedPaise, 999);
  assert.equal(before.annualFeeWaived, false);
  assert.equal(exact.annualFeeChargedPaise, 0);
  assert.equal(exact.annualFeeWaived, true);
  const comparison = compareCards([card, { ...card, id: 'always-fee', annualFeeWaiverThresholdPaise: 10000 }],
    [tx('rent', 'rent', 5000), tx('eligible', 'food', 1000)], 2026);
  assert.deepEqual(comparison.entries.map(e => [e.cardId, e.netAnnualValuePaise]),
    [['boundary', 0], ['always-fee', -999]]);
});
