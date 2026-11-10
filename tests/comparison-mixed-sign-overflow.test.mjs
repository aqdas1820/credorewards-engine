import test from 'node:test';
import assert from 'node:assert/strict';
import { compareCards } from '../dist/index.js';

test('mixed-sign leader gap one paise above safe integer fails closed', () => {
  const max = Number.MAX_SAFE_INTEGER;
  const cards = Object.freeze([
    Object.freeze({
      id: 'fee', name: 'Synthetic fee card', annualFeePaise: max,
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
  assert.throws(
    () => compareCards(cards, history, 2026),
    /differenceFromLeaderPaise exceeds safe integer range/
  );
  assert.throws(
    () => compareCards(Object.freeze([...cards].reverse()), history, 2026),
    /differenceFromLeaderPaise exceeds safe integer range/
  );
});
