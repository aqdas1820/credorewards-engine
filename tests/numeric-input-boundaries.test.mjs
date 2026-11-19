import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateRewards } from '../dist/index.js';

const card = () => ({
  id: 'numeric-boundary-card',
  name: 'Fictional numeric boundary card',
  annualFeePaise: 0,
  rules: [{ id: 'base', category: '*', rateBps: 100 }]
});
const transaction = amountPaise => ({
  id: 'synthetic-transaction',
  month: '2026-01',
  category: 'general',
  amountPaise
});

test('rejects non-finite and fractional transaction amounts before financial arithmetic', () => {
  for (const amountPaise of [NaN, Infinity, -Infinity, 0.5, -0.5]) {
    assert.throws(
      () => calculateRewards(card(), [transaction(amountPaise)], 2026),
      undefined,
      `amountPaise=${String(amountPaise)} must fail closed`
    );
  }
});

test('rejects non-finite and fractional reward rates before financial arithmetic', () => {
  for (const rateBps of [NaN, Infinity, -Infinity, 0.5, -0.5]) {
    const invalidCard = card();
    invalidCard.rules[0].rateBps = rateBps;
    assert.throws(
      () => calculateRewards(invalidCard, [transaction(10000)], 2026),
      undefined,
      `rateBps=${String(rateBps)} must fail closed`
    );
  }
});
