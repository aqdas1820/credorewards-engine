import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateRewards, compareCards } from '../dist/index.js';

// These strings are valid caller-owned identifiers, not object property paths.
// Cap accounting, exclusions and comparison must not use prototype-backed maps.
test('prototype-like rule and transaction IDs retain independent capped ledgers', () => {
  const card = {
    id: '__proto__',
    name: 'Synthetic card',
    annualFeePaise: 0,
    excludedCategories: ['constructor'],
    feeWaiverExcludedCategories: ['toString'],
    annualFeeWaiverThresholdPaise: 30000,
    rules: [
      { id: '__proto__', category: 'groceries', rateBps: 1000, monthlyCapPaise: 600 },
      { id: 'constructor', category: '*', rateBps: 1000, monthlyCapPaise: 300 }
    ]
  };
  const transactions = [
    { id: '__proto__', month: '2026-01', category: 'groceries', amountPaise: 10000 },
    { id: 'constructor', month: '2026-01', category: 'groceries', amountPaise: 10000 },
    { id: 'toString', month: '2026-01', category: 'toString', amountPaise: 10000 },
    { id: 'hasOwnProperty', month: '2026-01', category: 'constructor', amountPaise: 10000 }
  ];
  const result = calculateRewards(card, transactions, 2026);
  assert.equal(result.totalRewardsPaise, 900);
  assert.equal(result.feeWaiverEligibleSpendPaise, 30000);
  assert.equal(result.annualFeeWaived, true);
  assert.deepEqual(result.transactions.map(t => [t.id, t.earnedPaise]), [
    ['__proto__', 600], ['constructor', 0], ['hasOwnProperty', 0], ['toString', 300]
  ]);
  assert.deepEqual(calculateRewards(card, [...transactions].reverse(), 2026), result);
});

test('comparison treats prototype-like card IDs as distinct ordinary strings', () => {
  const makeCard = id => ({
    id, name: id, annualFeePaise: 0,
    rules: [{ id: 'toString', category: '*', rateBps: 100 }]
  });
  const result = compareCards(
    [makeCard('constructor'), makeCard('__proto__')],
    [{ id: 'valueOf', month: '2026-01', category: 'other', amountPaise: 10000 }],
    2026
  );
  assert.deepEqual(result.leaderCardIds, ['__proto__', 'constructor']);
  assert.deepEqual(result.entries.map(entry => entry.rank), [1, 1]);
});
