import test from 'node:test';
import assert from 'node:assert/strict';
import { comparePurchaseImpact } from '../dist/index.js';

const card = (id, annualCapPaise) => ({
  id, name: 'Synthetic ' + id, annualFeePaise: 0,
  rules: [{
    id: 'base', category: '*', rateBps: 1000, monthlyCapPaise: 100,
    ...(annualCapPaise === undefined ? {} : { annualCapPaise })
  }]
});
const history = Object.freeze([
  Object.freeze({ id: 'z-jan', month: '2026-01', category: 'groceries', amountPaise: 900 }),
  Object.freeze({ id: 'z-feb', month: '2026-02', category: 'groceries', amountPaise: 900 })
]);
const purchase = Object.freeze({
  id: 'a-jan', month: '2026-01', category: 'groceries', amountPaise: 300
});

test('monthly cap displacement does not consume rewards from a different month', () => {
  const result = comparePurchaseImpact([card('monthly'), card('annual', 150)], history, purchase, 2026);
  const monthly = result.entries.find(entry => entry.cardId === 'monthly');
  assert.equal(monthly.baseline.totalRewardsPaise, 180);
  assert.equal(monthly.withPurchase.totalRewardsPaise, 190);
  assert.equal(monthly.purchase.earnedPaise, 30);
  assert.equal(monthly.incrementalRewardsPaise, 10);
  assert.equal(monthly.otherTransactionsRewardDeltaPaise, -20);
  assert.deepEqual(monthly.withPurchase.transactions.map(tx => [tx.id, tx.earnedPaise]), [
    ['a-jan', 30], ['z-jan', 70], ['z-feb', 90]
  ]);
});

test('annual cap can displace later-month rewards after earlier-month purchase', () => {
  const result = comparePurchaseImpact([card('monthly'), card('annual', 150)], history, purchase, 2026);
  const annual = result.entries.find(entry => entry.cardId === 'annual');
  assert.equal(annual.baseline.totalRewardsPaise, 150);
  assert.equal(annual.withPurchase.totalRewardsPaise, 150);
  assert.equal(annual.purchase.earnedPaise, 30);
  assert.equal(annual.incrementalRewardsPaise, 0);
  assert.equal(annual.otherTransactionsRewardDeltaPaise, -30);
  assert.deepEqual(annual.withPurchase.transactions.map(tx => [tx.id, tx.earnedPaise]), [
    ['a-jan', 30], ['z-jan', 70], ['z-feb', 50]
  ]);
  assert.deepEqual(result.entries.map(entry => [entry.cardId, entry.rank]), [
    ['monthly', 1], ['annual', 2]
  ]);
});

test('cross-month cap accounting is deterministic under reversed frozen input order', () => {
  const cards = Object.freeze([Object.freeze(card('monthly')), Object.freeze(card('annual', 150))]);
  const forward = comparePurchaseImpact(cards, history, purchase, 2026);
  const reverse = comparePurchaseImpact([...cards].reverse(), [...history].reverse(), purchase, 2026);
  assert.deepEqual(reverse, forward);
  assert.deepEqual(history.map(tx => tx.id), ['z-jan', 'z-feb']);
});
