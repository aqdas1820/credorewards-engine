import test from 'node:test';
import assert from 'node:assert/strict';
import { compareCards } from '../dist/index.js';

test('comparison preserves exact negative safe-integer net value from annual fees', () => {
  const max = Number.MAX_SAFE_INTEGER;
  const cards = Object.freeze([
    Object.freeze({
      id: 'fee', name: 'Synthetic maximum fee', annualFeePaise: max,
      rules: Object.freeze([])
    }),
    Object.freeze({
      id: 'free', name: 'Synthetic fee-free card', annualFeePaise: 0,
      rules: Object.freeze([])
    })
  ]);
  const transactions = Object.freeze([]);
  const forward = compareCards(cards, transactions, 2026);
  const reversed = compareCards(Object.freeze([...cards].reverse()), transactions, 2026);
  assert.deepEqual(forward, reversed);
  assert.deepEqual(forward.leaderCardIds, ['free']);
  assert.deepEqual(forward.entries.map(entry => entry.cardId), ['free', 'fee']);
  assert.deepEqual(forward.entries.map(entry => entry.netAnnualValuePaise), [0, -max]);
  assert.deepEqual(forward.entries.map(entry => entry.differenceFromLeaderPaise), [0, max]);
  assert.equal(forward.entries[1].calculation.annualFeeChargedPaise, max);
  assert.equal(forward.entries[1].calculation.totalRewardsPaise, 0);
});
