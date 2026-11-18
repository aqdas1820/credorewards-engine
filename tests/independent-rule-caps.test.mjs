import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateRewards } from '../dist/index.js';

// All amounts and categories are synthetic; no issuer terms are implied.
const card = {
  id: 'independent-caps', name: 'Fictional two-category card',
  annualFeePaise: 0, excludedCategories: [],
  rules: [
    { id: 'groceries', category: 'grocery', rateBps: 10000, monthlyCapPaise: 5, annualCapPaise: 8 },
    { id: 'fuel', category: 'fuel', rateBps: 10000, monthlyCapPaise: 4, annualCapPaise: 6 }
  ]
};
const transaction = (id, amountPaise, month, category) => ({ id, amountPaise, month, category });

test('distinct rule caps do not consume one another across months', () => {
  const input = [
    transaction('g-jan', 10, '2026-01', 'grocery'),
    transaction('f-jan', 10, '2026-01', 'fuel'),
    transaction('g-feb', 10, '2026-02', 'grocery'),
    transaction('f-feb', 10, '2026-02', 'fuel')
  ];
  const snapshot = structuredClone(input);
  const forward = calculateRewards(card, input, 2026);
  const reverse = calculateRewards(card, [...input].reverse(), 2026);
  const byId = result => Object.fromEntries(result.transactions.map(t => [t.id, t.earnedPaise]));
  assert.deepEqual(byId(forward), { 'g-jan': 5, 'f-jan': 4, 'g-feb': 3, 'f-feb': 2 });
  assert.deepEqual(byId(reverse), byId(forward));
  assert.equal(forward.totalRewardsPaise, 14);
  assert.equal(reverse.totalRewardsPaise, 14);
  assert.equal(forward.netAnnualValuePaise, 14);
  assert.deepEqual(input, snapshot);
});

test('a capped category does not prevent an uncapped category from earning', () => {
  const uncapped = {
    ...card,
    rules: [...card.rules, { id: 'other', category: 'other', rateBps: 10000 }]
  };
  const result = calculateRewards(uncapped, [
    transaction('g', 100, '2026-01', 'grocery'),
    transaction('other', 7, '2026-01', 'other')
  ], 2026);
  assert.equal(result.totalRewardsPaise, 12);
  assert.equal(result.transactions.find(t => t.id === 'other').earnedPaise, 7);
});
