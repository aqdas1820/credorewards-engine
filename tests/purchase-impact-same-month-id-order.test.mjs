import test from 'node:test';
import assert from 'node:assert/strict';
import { comparePurchaseImpact } from '../dist/index.js';

const card = (id, monthlyCapPaise) => ({
  id, name: 'Synthetic ' + id, annualFeePaise: 0,
  rules: [{ id: 'base', category: '*', rateBps: 1000, monthlyCapPaise }]
});
const tx = (id, amountPaise) => ({
  id, month: '2026-07', category: 'synthetic', amountPaise
});

test('same-month purchase with earlier ID displaces later historical rewards', () => {
  const cards = [card('capped', 100), card('uncapped', 1000)];
  const history = [tx('z-old', 900)];
  const purchase = tx('a-new', 300);
  const snapshot = structuredClone({ cards, history, purchase });
  const result = comparePurchaseImpact(cards, history, purchase, 2026);
  const capped = result.entries.find(e => e.cardId === 'capped');
  assert.equal(capped.purchase.earnedPaise, 30);
  assert.equal(capped.baseline.totalRewardsPaise, 90);
  assert.equal(capped.withPurchase.totalRewardsPaise, 100);
  assert.equal(capped.otherTransactionsRewardDeltaPaise, -20);
  assert.equal(capped.incrementalRewardsPaise, 10);
  assert.equal(capped.withPurchase.transactions.find(t => t.id === 'z-old').earnedPaise, 70);
  assert.deepEqual({ cards, history, purchase }, snapshot);
});

test('same-month purchase with later ID receives only unspent cap', () => {
  const cards = [card('capped', 100), card('uncapped', 1000)];
  const result = comparePurchaseImpact(cards, [tx('a-old', 900)], tx('z-new', 300), 2026);
  const capped = result.entries.find(e => e.cardId === 'capped');
  assert.equal(capped.purchase.earnedPaise, 10);
  assert.equal(capped.incrementalRewardsPaise, 10);
  assert.equal(capped.otherTransactionsRewardDeltaPaise, 0);
  assert.equal(capped.withPurchase.transactions.find(t => t.id === 'a-old').earnedPaise, 90);
});

test('reversing historical input order does not change same-month purchase impact', () => {
  const cards = [card('capped', 100), card('uncapped', 1000)];
  const history = [tx('z-old', 400), tx('m-old', 500)];
  const purchase = tx('a-new', 300);
  const first = comparePurchaseImpact(cards, history, purchase, 2026);
  const reversed = comparePurchaseImpact([...cards].reverse(), [...history].reverse(), purchase, 2026);
  assert.deepEqual(first, reversed);
  const capped = first.entries.find(e => e.cardId === 'capped');
  assert.equal(capped.purchase.earnedPaise, 30);
  assert.equal(capped.incrementalRewardsPaise, 10);
  assert.equal(capped.otherTransactionsRewardDeltaPaise, -20);
});
