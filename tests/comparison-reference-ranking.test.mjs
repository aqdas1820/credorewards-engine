import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateRewards, compareCards, createBatchReport } from '../dist/index.js';

const cards = [
  { id: 'z-tie', name: 'Synthetic Z', annualFeePaise: 0,
    rules: [{ id: 'base', category: '*', rateBps: 100 }] },
  { id: 'a-tie', name: 'Synthetic A', annualFeePaise: 0,
    rules: [{ id: 'base', category: '*', rateBps: 100 }] },
  { id: 'm-lower', name: 'Synthetic M', annualFeePaise: 0,
    rules: [{ id: 'base', category: '*', rateBps: 50 }] },
  { id: 'f-fee', name: 'Synthetic F', annualFeePaise: 1000,
    rules: [{ id: 'base', category: '*', rateBps: 100 }] }
];
const transactions = [
  { id: 'one', month: '2026-02', category: 'synthetic', amountPaise: 6000 },
  { id: 'two', month: '2026-01', category: 'synthetic', amountPaise: 4000 }
];

test('competition ranking preserves ties, alphabetical tie order and negative net values', () => {
  const actual = compareCards(cards, transactions, 2026);
  assert.deepEqual(actual.leaderCardIds, ['a-tie', 'z-tie']);
  assert.deepEqual(actual.entries.map(({ rank, cardId, netAnnualValuePaise,
    differenceFromLeaderPaise }) =>
    [rank, cardId, netAnnualValuePaise, differenceFromLeaderPaise]), [
    [1, 'a-tie', 100, 0],
    [1, 'z-tie', 100, 0],
    [3, 'm-lower', 50, 50],
    [4, 'f-fee', -900, 1000]
  ]);
  for (const entry of actual.entries) {
    assert.deepEqual(entry.calculation,
      calculateRewards(cards.find(card => card.id === entry.cardId), transactions, 2026));
    assert.equal(entry.netAnnualValuePaise,
      entry.totalRewardsPaise - entry.annualFeeChargedPaise);
  }
});

test('card permutations and transaction order never change comparisons or inputs', () => {
  const originalCards = structuredClone(cards);
  const originalTransactions = structuredClone(transactions);
  const baseline = compareCards(cards, transactions, 2026);
  for (const permuted of [
    [...cards].reverse(), [cards[2], cards[0], cards[3], cards[1]],
    [cards[1], cards[3], cards[0], cards[2]]
  ]) {
    assert.deepEqual(compareCards(permuted, [...transactions].reverse(), 2026), baseline);
  }
  assert.deepEqual(cards, originalCards);
  assert.deepEqual(transactions, originalTransactions);
  const batch = createBatchReport([{
    id: 'comparison-reference', year: 2026, cards, transactions
  }]);
  assert.deepEqual(batch.scenarios[0].comparison, baseline);
  for (const entry of batch.scenarios[0].monthlyByCard) {
    const expected = baseline.entries.find(e => e.cardId === entry.cardId);
    assert.equal(entry.months.reduce((sum, m) => sum + m.totalRewardsPaise, 0),
      expected.totalRewardsPaise);
  }
});

test('duplicate card IDs fail closed even when terms and names differ', () => {
  assert.throws(() => compareCards([cards[0], {
    ...cards[0], name: 'Different name', annualFeePaise: 500
  }], transactions, 2026), /duplicate card id/);
});
