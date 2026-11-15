import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateRewards } from '../dist/index.js';

const max = Number.MAX_SAFE_INTEGER;
const card = {
  id: 'synthetic-fee-waiver-max-boundary',
  name: 'Synthetic fee waiver boundary',
  annualFeePaise: 500,
  annualFeeWaiverThresholdPaise: max,
  feeWaiverExcludedCategories: ['rent'],
  rules: [{ id: 'base', category: '*', rateBps: 0 }]
};

test('fee waiver at maximum safe eligible spend is inclusive and order independent', () => {
  const transactions = [
    { id: 'jan', month: '2026-01', category: 'general', amountPaise: max - 1 },
    { id: 'feb', month: '2026-02', category: 'general', amountPaise: 1 }
  ];
  for (const input of [transactions, [...transactions].reverse()]) {
    const result = calculateRewards(card, input, 2026);
    assert.equal(result.totalSpendPaise, max);
    assert.equal(result.feeWaiverEligibleSpendPaise, max);
    assert.equal(result.annualFeeWaived, true);
    assert.equal(result.annualFeeChargedPaise, 0);
    assert.equal(result.netAnnualValuePaise, 0);
  }
});

test('excluded spend cannot bridge the maximum safe fee-waiver threshold', () => {
  const transactions = [
    { id: 'eligible', month: '2026-01', category: 'general', amountPaise: max - 1 },
    { id: 'excluded', month: '2026-02', category: 'rent', amountPaise: 1 }
  ];
  for (const input of [transactions, [...transactions].reverse()]) {
    const result = calculateRewards(card, input, 2026);
    assert.equal(result.totalSpendPaise, max);
    assert.equal(result.feeWaiverEligibleSpendPaise, max - 1);
    assert.equal(result.annualFeeWaived, false);
    assert.equal(result.annualFeeChargedPaise, 500);
    assert.equal(result.netAnnualValuePaise, -500);
  }
});
