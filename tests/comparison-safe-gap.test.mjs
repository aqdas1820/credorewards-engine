import test from 'node:test';
import assert from 'node:assert/strict';
import { compareCards } from '../dist/index.js';

const card = (id, rateBps, annualFeePaise = 0) => ({
  id, name: `Synthetic ${id}`, annualFeePaise,
  rules: [{ id: 'base', category: '*', rateBps }]
});
const transaction = Object.freeze({
  id: 'only', month: '2026-01', category: 'synthetic',
  amountPaise: Number.MAX_SAFE_INTEGER
});

test('card comparison rejects an unsafe leader gap even when both individual net values fit', () => {
  const cards = Object.freeze([
    Object.freeze(card('reward', 10000)),
    Object.freeze(card('fee', 0, Number.MAX_SAFE_INTEGER))
  ]);
  assert.throws(
    () => compareCards(cards, Object.freeze([transaction]), 2026),
    /differenceFromLeaderPaise exceeds safe integer range/
  );
});

test('card comparison preserves exact maximum-safe-integer rewards and stable ties', () => {
  const cards = Object.freeze([
    Object.freeze(card('z', 10000)),
    Object.freeze(card('a', 10000))
  ]);
  const history = Object.freeze([transaction]);
  const first = compareCards(cards, history, 2026);
  const second = compareCards(Object.freeze([...cards].reverse()), history, 2026);
  assert.deepEqual(first, second);
  assert.deepEqual(first.leaderCardIds, ['a', 'z']);
  assert.deepEqual(first.entries.map(entry => entry.rank), [1, 1]);
  assert.deepEqual(first.entries.map(entry => entry.netAnnualValuePaise),
    [Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER]);
  assert.deepEqual(first.entries.map(entry => entry.differenceFromLeaderPaise), [0, 0]);
});
