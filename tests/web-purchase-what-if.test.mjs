import test from 'node:test';
import assert from 'node:assert/strict';
import { parseRupeesToPaise, nextSyntheticPurchaseId } from '../web/purchase-input.mjs';
import { comparePurchaseImpact } from '../dist/index.js';
import { createPurchaseImpactRows } from '../web/scoreboard.mjs';

const card = (id, rateBps, annualFeePaise = 0) => ({
  id, name: '<unsafe> ' + id, annualFeePaise,
  rules: [{ id: 'base', category: '*', rateBps }]
});

test('human rupees parse to integer paise without IEEE754 decimal rounding', () => {
  for (const [entered, paise] of [
    ['0.01', 1], ['1', 100], ['1.2', 120], ['1.20', 120],
    ['001', null], ['500.99', 50099], [' 1250.50 ', 125050],
    ['90071992547409.91', Number.MAX_SAFE_INTEGER]
  ]) {
    if (paise === null) {
      assert.throws(() => parseRupeesToPaise(entered), /positive rupee amount/);
    } else {
      assert.equal(parseRupeesToPaise(entered), paise);
    }
  }
  for (const entered of ['0', '0.00', '-1', '+1', '1.234', '1e2', '1,000', '.50',
    '12.', 'Infinity', 'NaN', '', '  ', '₹12', '90071992547409.92']) {
    assert.throws(() => parseRupeesToPaise(entered));
  }
  assert.throws(() => parseRupeesToPaise(12.34), /Enter a rupee amount/);
});

test('deterministically picks a synthetic transaction id without clashing with history', () => {
  const history = [
    { id: 'what-if-1' }, { id: 'what-if-2' }, { id: 'purchase-a' }
  ];
  const snapshot = structuredClone(history);
  assert.equal(nextSyntheticPurchaseId(history), 'what-if-3');
  assert.equal(nextSyntheticPurchaseId([...history, { id: 'what-if-3' }]), 'what-if-4');
  assert.equal(nextSyntheticPurchaseId([]), 'what-if-1');
  assert.deepEqual(history, snapshot);
  assert.throws(() => nextSyntheticPurchaseId(null), /array/);
});

test('what-if scoreboard is an exact read-only rendering of SDK values', () => {
  const cards = [card('capped', 1000), card('fee', 0, 50)];
  const impact = comparePurchaseImpact(cards,
    [{ id: 'old', month: '2026-01', category: 'groceries', amountPaise: 500 }],
    { id: 'new', month: '2026-01', category: 'groceries', amountPaise: 200 }, 2026);
  const frozen = structuredClone(impact);
  const rows = createPurchaseImpactRows(impact);
  assert.deepEqual(rows, [
    { rank: 1, cardId: 'capped', name: '<unsafe> capped',
      purchaseRewards: '₹0.20', existingRewardsDelta: '₹0.00',
      feeSavings: '₹0.00', netDelta: '₹0.20', isLeader: true },
    { rank: 2, cardId: 'fee', name: '<unsafe> fee',
      purchaseRewards: '₹0.00', existingRewardsDelta: '₹0.00',
      feeSavings: '₹0.00', netDelta: '₹0.00', isLeader: false }
  ]);
  assert.deepEqual(impact, frozen);
});
