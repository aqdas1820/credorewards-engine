import test from 'node:test';
import assert from 'node:assert/strict';
import { comparePurchaseImpact } from '../dist/index.js';

const card = (id, cap) => ({
  id, name: 'Synthetic ' + id, annualFeePaise: 0,
  rules: [{ id: 'base', category: '*', rateBps: 1000, monthlyCapPaise: cap }]
});
const tx = (id, month, amountPaise) => ({ id, month, category: 'synthetic', amountPaise });

test('purchase-impact reward ledger reconciles when earlier purchase displaces capped history', () => {
  const result = comparePurchaseImpact(
    [card('capped', 100), card('uncapped', 1000)],
    [tx('z-old', '2026-07', 900)],
    tx('a-new', '2026-07', 300), 2026
  );
  for (const entry of result.entries) {
    assert.equal(
      entry.incrementalRewardsPaise,
      entry.withPurchase.totalRewardsPaise - entry.baseline.totalRewardsPaise
    );
    assert.equal(
      entry.incrementalRewardsPaise,
      entry.purchase.earnedPaise + entry.otherTransactionsRewardDeltaPaise
    );
    assert.equal(
      entry.incrementalNetAnnualValuePaise,
      entry.incrementalRewardsPaise + entry.feeSavingsPaise
    );
  }
  assert.equal(result.entries.find(e => e.cardId === 'capped').otherTransactionsRewardDeltaPaise, -20);
});

test('purchase-impact ledger reconciles with a zero-reward purchase after cap exhaustion', () => {
  const result = comparePurchaseImpact(
    [card('capped', 50), card('uncapped', 1000)],
    [tx('a-old', '2026-07', 900)],
    tx('z-new', '2026-07', 300), 2026
  );
  const capped = result.entries.find(e => e.cardId === 'capped');
  assert.equal(capped.purchase.earnedPaise, 0);
  assert.equal(capped.incrementalRewardsPaise, 0);
  assert.equal(capped.otherTransactionsRewardDeltaPaise, 0);
  assert.equal(capped.incrementalNetAnnualValuePaise, 0);
});

test('equal marginal value produces stable alphabetical leaders and competition ranks', () => {
  const result = comparePurchaseImpact(
    [card('zeta', 1000), card('alpha', 1000)],
    [], tx('new', '2026-07', 100), 2026
  );
  assert.deepEqual(result.leaderCardIds, ['alpha', 'zeta']);
  assert.deepEqual(result.entries.map(e => [e.cardId, e.rank]), [['alpha', 1], ['zeta', 1]]);
  assert.equal(result.entries[0].incrementalNetAnnualValuePaise, 10);
});
