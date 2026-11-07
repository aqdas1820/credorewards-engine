import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateRewards, summarizeRewardCategories, compareCards, createBatchReport } from '../dist/index.js';

const card = {
  id: 'synthetic', name: 'Synthetic Card', annualFeePaise: 100,
  excludedCategories: ['rent'],
  rules: [
    { id: 'groceries', category: 'groceries', rateBps: 500, monthlyCapPaise: 300 },
    { id: 'fallback', category: '*', rateBps: 100 }
  ]
};
const transactions = [
  { id: 'feb-grocery', month: '2026-02', category: 'groceries', amountPaise: 10000 },
  { id: 'jan-rent', month: '2026-01', category: 'rent', amountPaise: 1000 },
  { id: 'feb-utility', month: '2026-02', category: 'utilities', amountPaise: 2000 },
  { id: 'jan-grocery', month: '2026-01', category: 'groceries', amountPaise: 10000 }
];

test('groups exact earned paise by category without recomputing caps or fees', () => {
  const calculation = calculateRewards(card, transactions, 2026);
  const summary = summarizeRewardCategories(calculation);
  assert.deepEqual(summary, {
    year: 2026, cardId: 'synthetic', totalSpendPaise: 23000, totalRewardsPaise: 620,
    categories: [
      { category: 'groceries', transactionCount: 2, totalSpendPaise: 20000, totalRewardsPaise: 600 },
      { category: 'rent', transactionCount: 1, totalSpendPaise: 1000, totalRewardsPaise: 0 },
      { category: 'utilities', transactionCount: 1, totalSpendPaise: 2000, totalRewardsPaise: 20 }
    ]
  });
  assert.equal(calculation.netAnnualValuePaise, 520);
  const comparison = compareCards([card, { ...card, id: 'other' }], transactions, 2026);
  assert.deepEqual(summarizeRewardCategories(comparison.entries[0].calculation).categories,
    summary.categories);
  const batch = createBatchReport([{
    id: 'scenario', year: 2026, cards: [card, { ...card, id: 'other' }],
    transactions
  }]);
  assert.equal(batch.scenarios[0].monthlyByCard[0].months.reduce(
    (total, month) => total + month.totalRewardsPaise, 0), summary.totalRewardsPaise);
});

test('category audit is order-independent and does not mutate frozen calculations', () => {
  const result = calculateRewards(card, transactions, 2026);
  const frozen = Object.freeze({ ...result,
    transactions: Object.freeze(result.transactions.map(tx => Object.freeze({ ...tx })))
  });
  assert.deepEqual(summarizeRewardCategories(frozen),
    summarizeRewardCategories({ ...result, transactions: [...result.transactions].reverse() }));
});

test('empty annual transaction set produces empty reconciled category groups', () => {
  assert.deepEqual(summarizeRewardCategories(calculateRewards(card, [], 2026)), {
    year: 2026, cardId: 'synthetic', categories: [],
    totalSpendPaise: 0, totalRewardsPaise: 0
  });
});

test('rejects tampered totals, duplicate transaction IDs and invalid paise', () => {
  const original = calculateRewards(card, transactions, 2026);
  assert.throws(() => summarizeRewardCategories({ ...original, totalRewardsPaise: 619 }),
    /do not reconcile/);
  assert.throws(() => summarizeRewardCategories({ ...original, totalSpendPaise: 22999 }),
    /do not reconcile/);
  assert.throws(() => summarizeRewardCategories({ ...original,
    transactions: [...original.transactions, original.transactions[0]]
  }), /duplicate calculated transaction id/);
  assert.throws(() => summarizeRewardCategories({ ...original,
    transactions: [{ ...original.transactions[0], amountPaise: -1 }]
  }), /invalid calculated transaction paise/);
  assert.throws(() => summarizeRewardCategories({ ...original,
    transactions: [{ ...original.transactions[0], month: '2027-01' }]
  }), /invalid calculated transaction identity or month/);
  assert.throws(() => summarizeRewardCategories(null), /calculation result/);
});
