import test from 'node:test';
import assert from 'node:assert/strict';
import { compareCards } from '../dist/index.js';

test('comparison accepts the exact safe-integer leader gap and preserves its sign', () => {
  const cards = Object.freeze([
    Object.freeze({
      id: 'fee', name: 'Synthetic fee card',
      annualFeePaise: Number.MAX_SAFE_INTEGER,
      rules: Object.freeze([Object.freeze({ id: 'none', category: '*', rateBps: 0 })])
    }),
    Object.freeze({
      id: 'free', name: 'Synthetic free card',
      annualFeePaise: 0,
      rules: Object.freeze([Object.freeze({ id: 'none', category: '*', rateBps: 0 })])
    })
  ]);
  const history = Object.freeze([]);
  const forward = compareCards(cards, history, 2026);
  const reversed = compareCards(Object.freeze([...cards].reverse()), history, 2026);
  assert.deepEqual(forward, reversed);
  assert.deepEqual(forward.leaderCardIds, ['free']);
  assert.deepEqual(forward.entries.map(entry => entry.netAnnualValuePaise),
    [0, -Number.MAX_SAFE_INTEGER]);
  assert.deepEqual(forward.entries.map(entry => entry.differenceFromLeaderPaise),
    [0, Number.MAX_SAFE_INTEGER]);
});
