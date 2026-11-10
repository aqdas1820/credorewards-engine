import test from 'node:test';
import assert from 'node:assert/strict';
import { compareCards } from '../dist/index.js';

test('comparison accepts annual cashback exactly at the safe-integer boundary', () => {
  const max = Number.MAX_SAFE_INTEGER;
  const cards = Object.freeze([
    Object.freeze({
      id: 'full', name: 'Synthetic full cashback', annualFeePaise: 0,
      rules: Object.freeze([Object.freeze({ id: 'all', category: '*', rateBps: 10000 })])
    }),
    Object.freeze({
      id: 'zero', name: 'Synthetic zero cashback', annualFeePaise: 0,
      rules: Object.freeze([Object.freeze({ id: 'none', category: '*', rateBps: 0 })])
    })
  ]);
  const history = Object.freeze([
    Object.freeze({ id: 'first', month: '2026-01', category: 'synthetic', amountPaise: max - 1 }),
    Object.freeze({ id: 'second', month: '2026-02', category: 'synthetic', amountPaise: 1 })
  ]);
  const forward = compareCards(cards, history, 2026);
  const reversed = compareCards(Object.freeze([...cards].reverse()), history, 2026);
  assert.deepEqual(forward, reversed);
  assert.deepEqual(forward.entries.map(entry => entry.netAnnualValuePaise), [max, 0]);
  assert.deepEqual(forward.entries.map(entry => entry.differenceFromLeaderPaise), [0, max]);
});
