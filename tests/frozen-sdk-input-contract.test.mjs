import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateRewards, compareCards, createBatchReport } from '../dist/index.js';

// Consumers may reuse immutable application state across multiple SDK calls.
// Freeze every nested object to detect accidental mutation, not just changed
// values that a post-call deep equality check might miss.
function deepFreeze(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    for (const child of Object.values(value)) deepFreeze(child);
    Object.freeze(value);
  }
  return value;
}

const cards = deepFreeze([
  {
    id: 'synthetic-capped', name: 'Synthetic capped', annualFeePaise: 250,
    annualFeeWaiverThresholdPaise: 10000,
    excludedCategories: ['excluded'],
    feeWaiverExcludedCategories: ['fee-excluded'],
    rules: [
      { id: 'specific', category: 'groceries', rateBps: 500,
        monthlyCapPaise: 60, annualCapPaise: 100 },
      { id: 'fallback', category: '*', rateBps: 100 }
    ]
  },
  {
    id: 'synthetic-flat', name: 'Synthetic flat', annualFeePaise: 0,
    rules: [{ id: 'flat', category: '*', rateBps: 150 }]
  }
]);
const transactions = deepFreeze([
  { id: 'feb', month: '2026-02', category: 'groceries', amountPaise: 10000 },
  { id: 'jan', month: '2026-01', category: 'groceries', amountPaise: 10000 },
  { id: 'excluded', month: '2026-01', category: 'excluded', amountPaise: 500 }
]);

test('calculateRewards accepts deeply frozen cards and transactions without mutating them', () => {
  const first = calculateRewards(cards[0], transactions, 2026);
  const again = calculateRewards(cards[0], transactions, 2026);
  assert.deepEqual(first, again);
  assert.deepEqual(first.transactions.map(t => t.id), ['excluded', 'jan', 'feb']);
  assert.equal(first.totalRewardsPaise, 200);
  assert.equal(first.annualFeeWaived, true);
});

test('compareCards preserves immutable inputs and stable results across candidate ordering', () => {
  const first = compareCards(cards, transactions, 2026);
  const reverse = compareCards(deepFreeze([...cards].reverse()), transactions, 2026);
  assert.deepEqual(first, reverse);
  for (const entry of first.entries) {
    const source = cards.find(card => card.id === entry.cardId);
    assert.ok(source);
    assert.deepEqual(entry.calculation, calculateRewards(source, transactions, 2026));
  }
});

test('createBatchReport supports frozen scenarios and repeated independent evaluations', () => {
  const scenarios = deepFreeze([
    { id: 'z-synthetic', year: 2026, cards, transactions },
    { id: 'a-synthetic', year: 2026, cards, transactions }
  ]);
  const first = createBatchReport(scenarios);
  assert.deepEqual(createBatchReport(scenarios), first);
  assert.deepEqual(first.scenarios.map(s => s.scenarioId), ['a-synthetic', 'z-synthetic']);
  assert.deepEqual(first.scenarios[0].comparison, first.scenarios[1].comparison);
  for (const scenario of first.scenarios) {
    for (const monthly of scenario.monthlyByCard) {
      const entry = scenario.comparison.entries.find(e => e.cardId === monthly.cardId);
      assert.ok(entry);
      assert.equal(
        monthly.months.reduce((sum, month) => sum + month.totalRewardsPaise, 0),
        entry.totalRewardsPaise
      );
    }
  }
});
