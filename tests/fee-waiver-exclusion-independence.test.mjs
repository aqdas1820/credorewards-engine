import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateRewards, compareCards, createBatchReport } from '../dist/index.js';

const transactions = [
  { id: 'fuel', month: '2026-01', category: 'fuel', amountPaise: 10000 },
  { id: 'grocery', month: '2026-02', category: 'groceries', amountPaise: 10000 }
];
const card = (id, overrides = {}) => ({
  id, name: 'Synthetic ' + id, annualFeePaise: 300,
  annualFeeWaiverThresholdPaise: 10000,
  excludedCategories: ['fuel'],
  feeWaiverExcludedCategories: ['groceries'],
  rules: [{ id: 'base', category: '*', rateBps: 100 }],
  ...overrides
});

test('reward exclusions and fee-waiver exclusions remain independent', () => {
  const result = calculateRewards(card('independent'), transactions, 2026);
  assert.equal(result.totalSpendPaise, 20000);
  assert.equal(result.rewardEligibleSpendPaise, 10000);
  assert.equal(result.feeWaiverEligibleSpendPaise, 10000);
  assert.equal(result.totalRewardsPaise, 100);
  assert.equal(result.annualFeeWaived, true);
  assert.equal(result.annualFeeChargedPaise, 0);
  assert.equal(result.netAnnualValuePaise, 100);
  assert.deepEqual(result.transactions.map(t => [t.id, t.reason, t.earnedPaise]), [
    ['fuel', 'excluded_category', 0], ['grocery', 'earned', 100]
  ]);
});

test('fee-waiver threshold is based on eligible spend, not rewarded spend', () => {
  const terms = card('unwaived', { feeWaiverExcludedCategories: ['fuel'] });
  const result = calculateRewards(terms, [transactions[0]], 2026);
  assert.equal(result.totalRewardsPaise, 0);
  assert.equal(result.feeWaiverEligibleSpendPaise, 0);
  assert.equal(result.annualFeeWaived, false);
  assert.equal(result.netAnnualValuePaise, -300);

  const eligible = calculateRewards(card('waived'), [transactions[0]], 2026);
  assert.equal(eligible.totalRewardsPaise, 0);
  assert.equal(eligible.feeWaiverEligibleSpendPaise, 10000);
  assert.equal(eligible.annualFeeWaived, true);
  assert.equal(eligible.netAnnualValuePaise, 0);
});

test('comparison and batch retain each card\'s independent fee-waiver attribution', () => {
  const waived = card('waived');
  const charged = card('charged', { feeWaiverExcludedCategories: ['fuel', 'groceries'] });
  const comparison = compareCards([charged, waived], transactions, 2026);
  assert.deepEqual(comparison.entries.map(e => [e.cardId, e.netAnnualValuePaise]), [
    ['waived', 100], ['charged', -200]
  ]);
  const report = createBatchReport([
    { id: 'waiver-check', year: 2026, cards: [charged, waived], transactions }
  ]);
  assert.deepEqual(report.scenarios[0].comparison.entries.map(e => [
    e.cardId, e.calculation.feeWaiverEligibleSpendPaise, e.calculation.annualFeeChargedPaise
  ]), [['waived', 10000, 0], ['charged', 0, 300]]);
});
