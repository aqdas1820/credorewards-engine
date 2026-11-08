import test from 'node:test';
import assert from 'node:assert/strict';
import { comparePurchaseImpact } from '../dist/index.js';

// Independent small-paise reference: no imports from the SDK's cap, waiver or
// purchase-impact helpers. Fixed seeds reproduce failures on Windows/Linux.
function random(seed) {
  let state = seed >>> 0;
  return () => (state = Math.imul(state, 1664525) + 1013904223 >>> 0);
}

function reference(card, transactions) {
  const rule = card.rules[0];
  const monthlyUsed = new Map();
  const earnedById = new Map();
  let annualUsed = 0;
  let rewards = 0;
  let spend = 0;
  for (const tx of [...transactions].sort((a, b) =>
    a.month < b.month ? -1 : a.month > b.month ? 1 :
    a.id < b.id ? -1 : a.id > b.id ? 1 : 0)) {
    spend += tx.amountPaise;
    const raw = Math.floor(tx.amountPaise * rule.rateBps / 10000);
    const monthUsed = monthlyUsed.get(tx.month) ?? 0;
    const earned = Math.min(raw,
      rule.monthlyCapPaise - monthUsed, rule.annualCapPaise - annualUsed);
    monthlyUsed.set(tx.month, monthUsed + earned);
    annualUsed += earned;
    rewards += earned;
    earnedById.set(tx.id, earned);
  }
  const fee = spend >= card.annualFeeWaiverThresholdPaise ? 0 : card.annualFeePaise;
  return { rewards, spend, fee, net: rewards - fee, earnedById };
}

const transaction = (id, month, amountPaise) =>
  ({ id, month, category: 'fictional', amountPaise });

test('purchase impact matches an independent seeded cap and waiver ledger', () => {
  for (let seed = 1; seed <= 60; seed++) {
    const next = random(seed);
    const cards = ['a', 'b', 'c'].map(id => ({
      id, name: 'Fictional ' + id,
      annualFeePaise: next() % 1000,
      annualFeeWaiverThresholdPaise: 10000 + next() % 40000,
      rules: [{ id: 'base', category: '*', rateBps: next() % 10001,
        monthlyCapPaise: next() % 500, annualCapPaise: next() % 1700 }]
    }));
    const history = Array.from({ length: 18 }, (_, index) =>
      transaction('h-' + String(index).padStart(2, '0'),
        '2026-' + String(1 + next() % 6).padStart(2, '0'), next() % 3000));
    const purchase = transaction('a-proposed',
      '2026-' + String(1 + next() % 6).padStart(2, '0'), next() % 3000);
    const snapshot = structuredClone({ cards, history, purchase });
    const actual = comparePurchaseImpact(cards, history, purchase, 2026);
    const expectedRanked = [];
    for (const card of cards) {
      const baseline = reference(card, history);
      const after = reference(card, [...history, purchase]);
      const row = actual.entries.find(entry => entry.cardId === card.id);
      assert.ok(row, 'missing card ' + card.id + ', seed ' + seed);
      assert.equal(row.baseline.totalRewardsPaise, baseline.rewards);
      assert.equal(row.withPurchase.totalRewardsPaise, after.rewards);
      assert.equal(row.baseline.totalSpendPaise, baseline.spend);
      assert.equal(row.withPurchase.totalSpendPaise, after.spend);
      assert.equal(row.baseline.annualFeeChargedPaise, baseline.fee);
      assert.equal(row.withPurchase.annualFeeChargedPaise, after.fee);
      assert.equal(row.purchase.earnedPaise, after.earnedById.get(purchase.id));
      assert.equal(row.incrementalRewardsPaise, after.rewards - baseline.rewards);
      assert.equal(row.otherTransactionsRewardDeltaPaise,
        after.rewards - baseline.rewards - after.earnedById.get(purchase.id));
      assert.equal(row.feeSavingsPaise, baseline.fee - after.fee);
      assert.equal(row.incrementalNetAnnualValuePaise, after.net - baseline.net);
      expectedRanked.push({ id: card.id, net: after.net - baseline.net });
    }
    expectedRanked.sort((a, b) => b.net - a.net ||
      (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
    assert.deepEqual(actual.entries.map(row => row.cardId),
      expectedRanked.map(row => row.id), 'ranking seed ' + seed);
    assert.deepEqual(actual.leaderCardIds,
      expectedRanked.filter(row => row.net === expectedRanked[0].net).map(row => row.id));
    assert.deepEqual(comparePurchaseImpact([...cards].reverse(),
      [...history].reverse(), purchase, 2026), actual, 'permutation seed ' + seed);
    assert.deepEqual({ cards, history, purchase }, snapshot,
      'caller inputs changed for seed ' + seed);
  }
});

test('purchase can displace prior cap rewards while saving a fee', () => {
  const card = {
    id: 'capped', name: 'Synthetic capped', annualFeePaise: 125,
    annualFeeWaiverThresholdPaise: 2100,
    rules: [{ id: 'base', category: '*', rateBps: 10000,
      monthlyCapPaise: 200, annualCapPaise: 250 }]
  };
  const free = { id: 'free', name: 'Synthetic free', annualFeePaise: 0,
    rules: [{ id: 'base', category: '*', rateBps: 0 }] };
  const history = [transaction('h-jan', '2026-01', 1000),
    transaction('h-feb', '2026-02', 1000)];
  const purchase = transaction('a-new', '2026-01', 150);
  const result = comparePurchaseImpact([free, card], history, purchase, 2026);
  const row = result.entries.find(entry => entry.cardId === 'capped');
  assert.equal(row.purchase.earnedPaise, 150);
  assert.equal(row.incrementalRewardsPaise, 0);
  assert.equal(row.otherTransactionsRewardDeltaPaise, -150);
  assert.equal(row.feeSavingsPaise, 125);
  assert.equal(row.incrementalNetAnnualValuePaise, 125);
  assert.deepEqual(row.withPurchase.transactions.map(tx => [tx.id, tx.earnedPaise]),
    [['a-new', 150], ['h-jan', 50], ['h-feb', 50]]);
});
