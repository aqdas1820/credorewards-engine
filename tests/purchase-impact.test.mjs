import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateRewards, comparePurchaseImpact } from '../dist/index.js';

const card = (id, rateBps, overrides = {}) => ({
  id, name: 'Fictional ' + id, annualFeePaise: 0,
  rules: [{ id: 'base', category: '*', rateBps }], ...overrides
});
const tx = (id, amountPaise, month = '2026-01', category = 'groceries') =>
  ({ id, month, category, amountPaise });

test('reports true marginal rewards when a new purchase displaces older capped rewards', () => {
  const capped = card('capped', 1000, {
    rules: [{ id: 'capped', category: '*', rateBps: 1000, monthlyCapPaise: 100 }]
  });
  const uncapped = card('uncapped', 200);
  const history = [tx('z-old', 900)];
  const proposed = tx('a-new', 300);
  const original = structuredClone({ cards: [capped, uncapped], history, proposed });
  const result = comparePurchaseImpact([uncapped, capped], history, proposed, 2026);
  assert.deepEqual(result.entries.map(e => e.cardId), ['capped', 'uncapped']);
  assert.deepEqual(result.entries.map(e => e.incrementalNetAnnualValuePaise), [10, 6]);
  assert.deepEqual(result.leaderCardIds, ['capped']);
  const capEntry = result.entries[0];
  assert.equal(capEntry.purchase.earnedPaise, 30);
  assert.equal(capEntry.purchase.reason, 'earned');
  assert.equal(capEntry.incrementalRewardsPaise, 10);
  assert.equal(capEntry.otherTransactionsRewardDeltaPaise, -20);
  assert.equal(capEntry.baseline.totalRewardsPaise, 90);
  assert.equal(capEntry.withPurchase.totalRewardsPaise, 100);
  assert.deepEqual(capEntry.withPurchase,
    calculateRewards(capped, [...history, proposed], 2026));
  assert.deepEqual({ cards: [capped, uncapped], history, proposed }, original);
});

test('keeps annual fee waiver effects distinct from purchase cashback', () => {
  const waiver = card('waiver', 0, {
    annualFeePaise: 100, annualFeeWaiverThresholdPaise: 1000
  });
  const cashback = card('cashback', 1000);
  const result = comparePurchaseImpact([cashback, waiver], [tx('old', 800)],
    tx('new', 200), 2026);
  assert.deepEqual(result.entries.map(e => e.cardId), ['waiver', 'cashback']);
  const first = result.entries[0];
  assert.equal(first.incrementalRewardsPaise, 0);
  assert.equal(first.purchase.earnedPaise, 0);
  assert.equal(first.feeSavingsPaise, 100);
  assert.equal(first.incrementalNetAnnualValuePaise, 100);
  assert.equal(first.baseline.annualFeeChargedPaise, 100);
  assert.equal(first.withPurchase.annualFeeChargedPaise, 0);
  assert.equal(result.entries[1].incrementalNetAnnualValuePaise, 20);
  assert.match(result.assumptions.join(' '), /complete-year/);
  assert.match(result.assumptions.join(' '), /not a real per-purchase/);
});

test('uses stable ID ordering and shared competition ranks on ties', () => {
  const cards = [card('z', 100), card('b', 0), card('a', 100)];
  const purchase = tx('new', 10000);
  const first = comparePurchaseImpact(cards, [], purchase, 2026);
  const reversed = comparePurchaseImpact([...cards].reverse(), [], purchase, 2026);
  assert.deepEqual(first, reversed);
  assert.deepEqual(first.entries.map(e => e.cardId), ['a', 'z', 'b']);
  assert.deepEqual(first.entries.map(e => e.rank), [1, 1, 3]);
  assert.deepEqual(first.leaderCardIds, ['a', 'z']);
});

test('fails closed on duplicate IDs, malformed inputs and unsafe annual totals', () => {
  const cards = [card('a', 100), card('b', 200)];
  assert.throws(() => comparePurchaseImpact(cards, [tx('same', 100)],
    tx('same', 100), 2026), /duplicate transaction id/);
  assert.throws(() => comparePurchaseImpact([card('a', 100), card('a', 100)],
    [], tx('new', 100), 2026), /duplicate card id/);
  assert.throws(() => comparePurchaseImpact(cards, [], tx('bad', 12.5), 2026),
    /safe integer/);
  assert.throws(() => comparePurchaseImpact(cards, [],
    tx('bad-date', 100, '2027-01'), 2026), /month/);
  assert.throws(() => comparePurchaseImpact(cards,
    [tx('huge', Number.MAX_SAFE_INTEGER)], tx('new', 1), 2026),
  /totalSpendPaise exceeds safe integer range/);
  assert.throws(() => comparePurchaseImpact([], [], tx('new', 1), 2026),
    /at least two/);
});

test('rejects an unsafe marginal net delta even if both annual net values fit', () => {
  const MAX = Number.MAX_SAFE_INTEGER;
  const full = card('full', 10000, {
    annualFeePaise: MAX, annualFeeWaiverThresholdPaise: MAX
  });
  assert.throws(() => comparePurchaseImpact([full, card('other', 0)],
    [], tx('new', MAX), 2026), /incrementalNetAnnualValuePaise exceeds safe integer range/);
});

test('never uses a shortcut that incorrectly credits reward-excluded purchases', () => {
  const excluded = card('excluded', 10000, { excludedCategories: ['groceries'] });
  const standard = card('standard', 100);
  const result = comparePurchaseImpact([excluded, standard],
    [tx('old', 10000)], tx('new', 10000), 2026);
  const excludedEntry = result.entries.find(e => e.cardId === 'excluded');
  assert.equal(excludedEntry.purchase.reason, 'excluded_category');
  assert.equal(excludedEntry.incrementalRewardsPaise, 0);
  assert.equal(excludedEntry.incrementalNetAnnualValuePaise, 0);
});
