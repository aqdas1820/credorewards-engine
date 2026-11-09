import test from 'node:test';
import assert from 'node:assert/strict';
import { comparePurchaseImpact } from '../dist/index.js';

const card = (id, rule) => ({
  id, name: 'Synthetic ' + id, annualFeePaise: 0,
  rules: [{ id: 'base', category: '*', ...rule }]
});
const tx = (id, amountPaise, month = '2026-01') => ({
  id, month, category: 'synthetic', amountPaise
});

test('rounding occurs independently for each transaction, not on combined spend', () => {
  const cards = [card('one-bps', { rateBps: 1 }), card('zero', { rateBps: 0 })];
  const history = [tx('old', 9999)];
  const result = comparePurchaseImpact(cards, history, tx('new', 9999), 2026);
  const entry = result.entries.find(row => row.cardId === 'one-bps');
  assert.equal(entry.baseline.totalRewardsPaise, 0);
  assert.equal(entry.withPurchase.totalRewardsPaise, 0);
  assert.equal(entry.purchase.reason, 'rounded_to_zero');
  assert.equal(entry.purchase.earnedPaise, 0);
  assert.equal(entry.incrementalRewardsPaise, 0);
  assert.equal(entry.otherTransactionsRewardDeltaPaise, 0);
  assert.equal(entry.incrementalNetAnnualValuePaise, 0);
  assert.deepEqual(result.leaderCardIds, ['one-bps', 'zero']);
});

test('one-paisa rounding threshold is exact and does not borrow fractions', () => {
  const cards = [card('one-bps', { rateBps: 1 }), card('zero', { rateBps: 0 })];
  const result = comparePurchaseImpact(cards, [tx('old', 9999)],
    tx('new', 10000), 2026);
  const entry = result.entries.find(row => row.cardId === 'one-bps');
  assert.equal(entry.baseline.totalRewardsPaise, 0);
  assert.equal(entry.purchase.earnedPaise, 1);
  assert.equal(entry.withPurchase.totalRewardsPaise, 1);
  assert.equal(entry.incrementalRewardsPaise, 1);
  assert.equal(entry.otherTransactionsRewardDeltaPaise, 0);
  assert.equal(entry.incrementalNetAnnualValuePaise, 1);
  assert.deepEqual(result.leaderCardIds, ['one-bps']);
});

test('minimum transaction threshold applies to proposed purchase independently', () => {
  const cards = [
    card('minimum', { rateBps: 1000, minTransactionPaise: 1000 }),
    card('zero', { rateBps: 0 })
  ];
  const history = [tx('old', 1000)];
  const below = comparePurchaseImpact(cards, history, tx('new', 999), 2026);
  const belowEntry = below.entries.find(row => row.cardId === 'minimum');
  assert.equal(belowEntry.purchase.reason, 'below_minimum');
  assert.equal(belowEntry.purchase.earnedPaise, 0);
  assert.equal(belowEntry.incrementalRewardsPaise, 0);
  assert.equal(belowEntry.baseline.totalRewardsPaise, 100);
  assert.equal(belowEntry.withPurchase.totalRewardsPaise, 100);

  const at = comparePurchaseImpact(cards, history, tx('new', 1000), 2026);
  const atEntry = at.entries.find(row => row.cardId === 'minimum');
  assert.equal(atEntry.purchase.earnedPaise, 100);
  assert.equal(atEntry.incrementalRewardsPaise, 100);
  assert.equal(atEntry.withPurchase.totalRewardsPaise, 200);
});
