import test from 'node:test';
import assert from 'node:assert/strict';
import { comparePurchaseImpact } from '../dist/index.js';

const card = (id, annualCapPaise) => ({
  id, name: 'Synthetic ' + id, annualFeePaise: 0,
  rules: [{ id: 'base', category: '*', rateBps: 1000, annualCapPaise }]
});
const tx = (id, month, amountPaise) => ({
  id, month, category: 'synthetic', amountPaise
});

test('an earlier purchase displaces later-month rewards under an annual cap', () => {
  const cards = [card('capped', 100), card('uncapped', 1000)];
  const history = [tx('z-old', '2026-12', 900)];
  const purchase = tx('a-new', '2026-01', 300);
  const before = structuredClone({ cards, history, purchase });
  const result = comparePurchaseImpact(cards, history, purchase, 2026);
  const capped = result.entries.find(entry => entry.cardId === 'capped');
  assert.equal(capped.baseline.totalRewardsPaise, 90);
  assert.equal(capped.purchase.earnedPaise, 30);
  assert.equal(capped.withPurchase.totalRewardsPaise, 100);
  assert.equal(capped.incrementalRewardsPaise, 10);
  assert.equal(capped.otherTransactionsRewardDeltaPaise, -20);
  assert.equal(capped.withPurchase.transactions.find(t => t.id === 'z-old').earnedPaise, 70);
  assert.deepEqual({ cards, history, purchase }, before);
});

test('a later purchase earns only the remaining annual cap without changing earlier rewards', () => {
  const cards = [card('capped', 100), card('uncapped', 1000)];
  const result = comparePurchaseImpact(cards, [tx('a-old', '2026-01', 900)],
    tx('z-new', '2026-12', 300), 2026);
  const capped = result.entries.find(entry => entry.cardId === 'capped');
  assert.equal(capped.purchase.earnedPaise, 10);
  assert.equal(capped.incrementalRewardsPaise, 10);
  assert.equal(capped.otherTransactionsRewardDeltaPaise, 0);
  assert.equal(capped.withPurchase.transactions.find(t => t.id === 'a-old').earnedPaise, 90);
});

test('a fully exhausted annual cap yields zero marginal reward across months', () => {
  const cards = [card('capped', 90), card('uncapped', 1000)];
  const result = comparePurchaseImpact(cards, [tx('a-old', '2026-01', 900)],
    tx('z-new', '2026-12', 300), 2026);
  const capped = result.entries.find(entry => entry.cardId === 'capped');
  assert.equal(capped.purchase.reason, 'reward_cap_reached');
  assert.equal(capped.purchase.earnedPaise, 0);
  assert.equal(capped.incrementalRewardsPaise, 0);
  assert.equal(capped.otherTransactionsRewardDeltaPaise, 0);
  assert.equal(capped.incrementalNetAnnualValuePaise, 0);
});
