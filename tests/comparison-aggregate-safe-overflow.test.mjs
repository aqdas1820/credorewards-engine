import test from 'node:test';
import assert from 'node:assert/strict';
import { compareCards } from '../dist/index.js';

test('comparison fails closed when individually safe purchases overflow annual reward total', () => {
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
    Object.freeze({ id: 'first', month: '2026-01', category: 'synthetic', amountPaise: max }),
    Object.freeze({ id: 'second', month: '2026-02', category: 'synthetic', amountPaise: 1 })
  ]);
  for (const orderedCards of [cards, Object.freeze([...cards].reverse())]) {
    assert.throws(
      () => compareCards(orderedCards, history, 2026),
      /safe integer range/
    );
  }
});
