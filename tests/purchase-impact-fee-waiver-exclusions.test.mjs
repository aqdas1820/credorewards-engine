import test from 'node:test';
import assert from 'node:assert/strict';
import { comparePurchaseImpact } from '../dist/index.js';

const card = (id, overrides = {}) => ({
  id, name: 'Synthetic ' + id, annualFeePaise: 500,
  annualFeeWaiverThresholdPaise: 1000,
  rules: [{ id: 'base', category: '*', rateBps: 0 }],
  ...overrides
});
const history = Object.freeze([
  Object.freeze({ id: 'old-utilities', month: '2026-01', category: 'utilities', amountPaise: 900 })
]);
const groceries = Object.freeze({
  id: 'new-groceries', month: '2026-01', category: 'groceries', amountPaise: 200
});

test('reward-excluded spend can still trigger a fee waiver when fee-eligible', () => {
  const rewardExcluded = card('reward-excluded', { excludedCategories: ['groceries'] });
  const feeExcluded = card('fee-excluded', { feeWaiverExcludedCategories: ['groceries'] });
  const result = comparePurchaseImpact([feeExcluded, rewardExcluded], history, groceries, 2026);
  assert.deepEqual(result.leaderCardIds, ['reward-excluded']);
  assert.deepEqual(result.entries.map(e => [e.cardId, e.rank, e.purchase.reason,
    e.purchase.earnedPaise, e.incrementalRewardsPaise, e.feeSavingsPaise,
    e.incrementalNetAnnualValuePaise]), [
    ['reward-excluded', 1, 'excluded_category', 0, 0, 500, 500],
    ['fee-excluded', 2, 'zero_reward', 0, 0, 0, 0]
  ]);
  assert.equal(result.entries[0].baseline.feeWaiverEligibleSpendPaise, 900);
  assert.equal(result.entries[0].withPurchase.feeWaiverEligibleSpendPaise, 1100);
  assert.equal(result.entries[1].withPurchase.feeWaiverEligibleSpendPaise, 900);
});

test('zero-paise purchase never crosses a positive fee waiver threshold', () => {
  const cards = [card('a'), card('b', { excludedCategories: ['groceries'] })];
  const zero = { ...groceries, amountPaise: 0 };
  const result = comparePurchaseImpact(cards, history, zero, 2026);
  assert.deepEqual(result.entries.map(e => e.incrementalNetAnnualValuePaise), [0, 0]);
  assert.deepEqual(result.entries.map(e => e.feeSavingsPaise), [0, 0]);
  assert.deepEqual(result.leaderCardIds, ['a', 'b']);
});

test('fee-waiver threshold equality is inclusive and independent of reward rate', () => {
  const threshold = card('threshold', { excludedCategories: ['groceries'] });
  const noWaiver = card('no-waiver', {
    feeWaiverExcludedCategories: ['groceries'],
    rules: [{ id: 'base', category: '*', rateBps: 100 }]
  });
  const purchase = { ...groceries, amountPaise: 100 };
  const result = comparePurchaseImpact([noWaiver, threshold], history, purchase, 2026);
  const waiver = result.entries.find(e => e.cardId === 'threshold');
  const other = result.entries.find(e => e.cardId === 'no-waiver');
  assert.equal(waiver.withPurchase.feeWaiverEligibleSpendPaise, 1000);
  assert.equal(waiver.withPurchase.annualFeeWaived, true);
  assert.equal(waiver.feeSavingsPaise, 500);
  assert.equal(other.feeSavingsPaise, 0);
  assert.equal(other.withPurchase.annualFeeWaived, false);
  assert.equal(other.purchase.earnedPaise, 1);
  assert.equal(other.incrementalNetAnnualValuePaise, 1);
  assert.deepEqual(result.leaderCardIds, ['threshold']);
});
