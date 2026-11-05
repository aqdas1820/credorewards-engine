import test from 'node:test';
import assert from 'node:assert/strict';
import { compareCards, calculateRewards } from '../dist/index.js';

const makeCard = (id, rateBps, overrides = {}) => ({
  id, name: 'Fictional ' + id, annualFeePaise: 0, excludedCategories: [],
  rules: [{ id: 'base', category: '*', rateBps }], ...overrides
});
const spend = (id, amountPaise, month = '2026-01', category = 'groceries') => ({
  id, amountPaise, month, category
});

test('ranks cards by net annual value, after annual fees', () => {
  const cards = [
    makeCard('base', 100),
    makeCard('premium', 500, { annualFeePaise: 2000 }),
    makeCard('no-fee', 200)
  ];
  const transactions = [spend('tx', 100000)];
  const result = compareCards(cards, transactions, 2026);
  assert.deepEqual(result.entries.map(entry => entry.cardId), ['premium', 'no-fee', 'base']);
  assert.deepEqual(result.entries.map(entry => entry.netAnnualValuePaise), [3000, 2000, 1000]);
  assert.deepEqual(result.entries.map(entry => entry.differenceFromLeaderPaise), [0, 1000, 2000]);
  assert.deepEqual(result.entries.map(entry => entry.rank), [1, 2, 3]);
  assert.deepEqual(result.leaderCardIds, ['premium']);
});

test('ties share rank and are ordered deterministically by card id', () => {
  const cards = [makeCard('z', 100), makeCard('b', 0), makeCard('a', 100)];
  const result = compareCards(cards, [spend('tx', 10000)], 2026);
  assert.deepEqual(result.entries.map(entry => entry.cardId), ['a', 'z', 'b']);
  assert.deepEqual(result.entries.map(entry => entry.rank), [1, 1, 3]);
  assert.deepEqual(result.leaderCardIds, ['a', 'z']);
  assert.deepEqual(compareCards([...cards].reverse(), [spend('tx', 10000)], 2026), result);
});

test('uses identical cap calculations as the existing single-card engine', () => {
  const capped = makeCard('capped', 1000, {
    rules: [{ id: 'base', category: '*', rateBps: 1000, monthlyCapPaise: 200 }]
  });
  const uncapped = makeCard('uncapped', 100);
  const transactions = [spend('jan', 10000), spend('feb', 10000, '2026-02')];
  const comparison = compareCards([capped, uncapped], transactions, 2026);
  for (const card of [capped, uncapped]) {
    const entry = comparison.entries.find(item => item.cardId === card.id);
    assert.deepEqual(entry?.calculation, calculateRewards(card, transactions, 2026));
  }
  assert.equal(comparison.entries[0].netAnnualValuePaise, 400);
});

test('annual fee waivers are evaluated independently for each card', () => {
  const waived = makeCard('waived', 100, {
    annualFeePaise: 5000, annualFeeWaiverThresholdPaise: 100000
  });
  const charged = makeCard('charged', 100, { annualFeePaise: 5000 });
  const result = compareCards([charged, waived], [spend('tx', 100000)], 2026);
  assert.deepEqual(result.entries.map(x => x.cardId), ['waived', 'charged']);
  assert.equal(result.entries[0].calculation.annualFeeWaived, true);
  assert.equal(result.entries[1].calculation.annualFeeChargedPaise, 5000);
});

test('does not mutate caller cards or transactions', () => {
  const cards = [makeCard('b', 200), makeCard('a', 100)];
  const transactions = [spend('later', 10000, '2026-12'), spend('early', 10000, '2026-01')];
  const originalCards = structuredClone(cards);
  const originalTransactions = structuredClone(transactions);
  compareCards(cards, transactions, 2026);
  assert.deepEqual(cards, originalCards);
  assert.deepEqual(transactions, originalTransactions);
});

test('requires at least two candidate cards', () => {
  assert.throws(() => compareCards([], [], 2026), /at least two/);
  assert.throws(() => compareCards([makeCard('only', 100)], [], 2026), /at least two/);
  assert.throws(() => compareCards(null, [], 2026), /at least two/);
});

test('rejects duplicate card ids and validates source card terms', () => {
  assert.throws(
    () => compareCards([makeCard('duplicate', 100), makeCard('duplicate', 200)], [], 2026),
    /duplicate card id/
  );
  assert.throws(
    () => compareCards([makeCard('valid', 100), makeCard('invalid', 10001)], [], 2026),
    /rateBps/
  );
});

test('rejects invalid transaction dates instead of ranking incomplete inputs', () => {
  assert.throws(() => compareCards([makeCard('a', 100), makeCard('b', 200)],
    [spend('tx', 1000, '2025-01')], 2026), /month/);
});

test('explicitly warns that comparison is not card-spend optimization', () => {
  const result = compareCards([makeCard('a', 100), makeCard('b', 200)], [], 2026);
  assert.match(result.assumptions.join(' '), /complete-year/);
  assert.match(result.assumptions.join(' '), /not a per-purchase/);
  assert.match(result.assumptions.join(' '), /reward-point/);
});

test('rejects comparison gaps that overflow safe paise integer range', () => {
  const huge = Number.MAX_SAFE_INTEGER;
  const cards = [
    makeCard('full-cashback', 10000),
    makeCard('large-fee', 0, { annualFeePaise: huge })
  ];
  assert.throws(
    () => compareCards(cards, [spend('tx', huge)], 2026),
    /differenceFromLeaderPaise exceeds safe integer range/
  );
});
