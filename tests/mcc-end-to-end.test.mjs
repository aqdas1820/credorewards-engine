import test from 'node:test';
import assert from 'node:assert/strict';
import {
  mapMccTransactions, calculateRewards, compareCards, createBatchReport
} from '../dist/index.js';

const mappings = Object.freeze([
  Object.freeze({ mcc: '0123', category: 'groceries' }),
  Object.freeze({ mcc: '5678', category: 'utilities' })
]);
const raw = Object.freeze([
  Object.freeze({ id: 'feb-utility', month: '2026-02', mcc: '5678', amountPaise: 10000 }),
  Object.freeze({ id: 'jan-grocery', month: '2026-01', mcc: '0123', amountPaise: 10000 })
]);
const cards = [
  { id: 'a', name: 'Fictional A', annualFeePaise: 0,
    rules: [
      { id: 'grocery', category: 'groceries', rateBps: 500, monthlyCapPaise: 300 },
      { id: 'default', category: '*', rateBps: 100 }
    ]
  },
  { id: 'b', name: 'Fictional B', annualFeePaise: 50,
    rules: [{ id: 'default', category: '*', rateBps: 200 }]
  }
];

test('MCC adapter output feeds comparison and monthly batch reporting without rate inference', () => {
  const mapped = mapMccTransactions(raw, mappings);
  assert.deepEqual(mapped, [
    { id: 'feb-utility', month: '2026-02', category: 'utilities', amountPaise: 10000 },
    { id: 'jan-grocery', month: '2026-01', category: 'groceries', amountPaise: 10000 }
  ]);
  const direct = calculateRewards(cards[0], mapped, 2026);
  assert.deepEqual(direct.transactions.map(({ id, earnedPaise, matchedRuleId }) =>
    [id, earnedPaise, matchedRuleId]), [
    ['jan-grocery', 300, 'grocery'], ['feb-utility', 100, 'default']
  ]);
  const comparison = compareCards(cards, mapped, 2026);
  assert.deepEqual(comparison.leaderCardIds, ['a']);
  assert.equal(comparison.entries[0].netAnnualValuePaise, 400);
  assert.equal(comparison.entries[1].netAnnualValuePaise, 350);
  const batch = createBatchReport([{
    id: 'mcc-synthetic', year: 2026, cards, transactions: mapped
  }]);
  assert.deepEqual(batch.scenarios[0].comparison, comparison);
  const a = batch.scenarios[0].monthlyByCard.find(entry => entry.cardId === 'a');
  assert.ok(a);
  assert.deepEqual(a.months.slice(0, 3).map(m =>
    [m.transactionCount, m.totalSpendPaise, m.totalRewardsPaise]), [
    [1, 10000, 300], [1, 10000, 100], [0, 0, 0]
  ]);
  assert.equal(a.months.reduce((sum, month) => sum + month.totalRewardsPaise, 0),
    direct.totalRewardsPaise);
  assert.equal(raw[0].mcc, '5678');
  assert.equal(mappings[0].mcc, '0123');
});

test('unknown MCC rejects the entire comparison input before financial evaluation', () => {
  const unmapped = [...raw, { id: 'unknown', month: '2026-03', mcc: '9999', amountPaise: 1 }];
  assert.throws(() => mapMccTransactions(unmapped, mappings),
    /transaction\\[unknown\\] has unmapped MCC: 9999/);
  assert.deepEqual(raw.map(tx => tx.id), ['feb-utility', 'jan-grocery']);
});
