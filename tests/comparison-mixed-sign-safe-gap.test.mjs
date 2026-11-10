import test from 'node:test';
import assert from 'node:assert/strict';
import { compareCards } from '../dist/index.js';

test('mixed-sign leader gap is exact at the inclusive safe-integer boundary', () => {
  const max = Number.MAX_SAFE_INTEGER;
  const cards = Object.freeze([
    Object.freeze({
      id: 'fee', name: 'Synthetic fee card', annualFeePaise: max - 1,
      rules: Object.freeze([Object.freeze({ id: 'none', category: '*', rateBps: 0 })])
    }),
    Object.freeze({
      id: 'reward', name: 'Synthetic reward card', annualFeePaise: 0,
      rules: Object.freeze([Object.freeze({ id: 'all', category: '*', rateBps: 10000 })])
    })
  ]);
  const history = Object.freeze([
    Object.freeze({ id: 'one', month: '2026-01', category: 'synthetic', amountPaise: 1 })
  ]);
  const forward = compareCards(cards, history, 2026);
  const reversed = compareCards(Object.freeze([...cards].reverse()), history, 2026);
  assert.deepEqual(forward, reversed);
  assert.deepEqual(forward.leaderCardIds, ['reward']);
  assert.deepEqual(forward.entries.map(entry => entry.netAnnualValuePaise), [1, -(max - 1)]);
  assert.deepEqual(forward.entries.map(entry => entry.differenceFromLeaderPaise), [0, max]);
});
