import test from 'node:test';
import assert from 'node:assert/strict';
import { compareCards } from '../dist/index.js';
import { formatPaiseAsRupees, createScoreboardRows } from '../web/scoreboard.mjs';

test('rupee display is exact for positive, negative and safe-integer boundaries', () => {
  const samples = [
    [0, '₹0.00'], [1, '₹0.01'], [99, '₹0.99'], [100, '₹1.00'],
    [123456789, '₹12,34,567.89'], [12345678, '₹1,23,456.78'],
    [99999, '₹999.99'], [100000, '₹1,000.00'], [10000000, '₹1,00,000.00'],
    [-123456789, '-₹12,34,567.89'], [-100, '-₹1.00'],
    [-1, '-₹0.01'], [Number.MAX_SAFE_INTEGER, '₹9,00,71,99,25,47,409.91']
  ];
  for (const [value, expected] of samples) {
    assert.equal(formatPaiseAsRupees(value), expected);
  }
  for (const invalid of [NaN, Infinity, 1.5, '100', Number.MAX_SAFE_INTEGER + 1]) {
    assert.throws(() => formatPaiseAsRupees(invalid), /safe integer/);
  }
});

test('scoreboard retains tied leaders and net fees without changing comparisons', () => {
  const cards = [
    { id: 'z', name: '<img src=x onerror=alert(1)>', annualFeePaise: 0,
      rules: [{ id: 'base', category: '*', rateBps: 100 }] },
    { id: 'a', name: 'A card', annualFeePaise: 0,
      rules: [{ id: 'base', category: '*', rateBps: 100 }] },
    { id: 'b', name: 'Fee card', annualFeePaise: 250,
      rules: [{ id: 'base', category: '*', rateBps: 0 }] }
  ];
  const tx = [{ id: 'one', month: '2026-01', category: 'groceries', amountPaise: 10000 }];
  const comparison = compareCards(cards, tx, 2026);
  const unchanged = structuredClone(comparison);
  assert.deepEqual(createScoreboardRows(comparison), [
    { rank: 1, cardId: 'a', name: 'A card', rewards: '₹1.00', fee: '₹0.00', net: '₹1.00', isLeader: true },
    { rank: 1, cardId: 'z', name: '<img src=x onerror=alert(1)>', rewards: '₹1.00', fee: '₹0.00', net: '₹1.00', isLeader: true },
    { rank: 3, cardId: 'b', name: 'Fee card', rewards: '₹0.00', fee: '₹2.50', net: '-₹2.50', isLeader: false }
  ]);
  assert.deepEqual(comparison, unchanged);
});
