import test from 'node:test';
import assert from 'node:assert/strict';
import { comparePurchaseImpact } from '../dist/index.js';

const year = 2026;
const capped = Object.freeze({
  id: 'capped', name: 'Synthetic Capped', annualFeePaise: 0,
  rules: Object.freeze([Object.freeze({
    id: 'all', category: '*', rateBps: 10000, monthlyCapPaise: 5000
  })])
});
const uncapped = Object.freeze({
  id: 'uncapped', name: 'Synthetic Uncapped', annualFeePaise: 0,
  rules: Object.freeze([Object.freeze({
    id: 'all', category: '*', rateBps: 1000
  })])
});
const cards = Object.freeze([capped, uncapped]);
const history = Object.freeze([Object.freeze({
  id: 'z-existing', month: '2026-01', category: 'groceries', amountPaise: 10000
})]);
const purchase = Object.freeze({
  id: 'a-new', month: '2026-01', category: 'groceries', amountPaise: 10000
});

test('purchase consuming a shared cap displaces existing rewards without increasing total', () => {
  const result = comparePurchaseImpact(cards, history, purchase, year);
  const row = result.entries.find(entry => entry.cardId === 'capped');
  assert.ok(row);
  assert.equal(row.purchase.earnedPaise, 5000);
  assert.equal(row.incrementalRewardsPaise, 0);
  assert.equal(row.otherTransactionsRewardDeltaPaise, -5000);
  assert.equal(row.feeSavingsPaise, 0);
  assert.equal(row.incrementalNetAnnualValuePaise, 0);
  assert.equal(row.baseline.totalRewardsPaise, 5000);
  assert.equal(row.withPurchase.totalRewardsPaise, 5000);
  assert.equal(row.withPurchase.transactions.find(tx => tx.id === 'z-existing').earnedPaise, 0);
});

test('marginal ranking uses total annual delta rather than new purchase reward', () => {
  const result = comparePurchaseImpact(cards, history, purchase, year);
  assert.deepEqual(result.leaderCardIds, ['uncapped']);
  assert.deepEqual(result.entries.map(row => [row.cardId, row.rank,
    row.purchase.earnedPaise, row.incrementalRewardsPaise,
    row.otherTransactionsRewardDeltaPaise, row.incrementalNetAnnualValuePaise]), [
    ['uncapped', 1, 1000, 1000, 0, 1000],
    ['capped', 2, 5000, 0, -5000, 0]
  ]);
});

test('displacement audit is stable across historical input order and frozen inputs', () => {
  const secondHistory = Object.freeze(Object.freeze({
    id: 'zz-zero', month: '2026-02', category: 'groceries', amountPaise: 0
  }));
  const forward = comparePurchaseImpact(cards, [history[0], secondHistory], purchase, year);
  const reverse = comparePurchaseImpact(cards, [secondHistory, history[0]], purchase, year);
  assert.deepEqual(reverse, forward);
  assert.equal(history[0].amountPaise, 10000);
  assert.equal(purchase.id, 'a-new');
});

test('duplicate hypothetical purchase ID fails closed for every card', () => {
  assert.throws(() => comparePurchaseImpact(cards, history, {
    ...purchase, id: 'z-existing'
  }, year), /duplicate transaction id/);
});
