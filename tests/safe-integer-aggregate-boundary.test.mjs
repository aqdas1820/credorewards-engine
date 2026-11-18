import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateRewards } from '../dist/index.js';

test('aggregate spend exceeding safe integer range fails closed', () => {
  const card = {
    id: 'synthetic-overflow',
    name: 'Fictional overflow guard',
    annualFeePaise: 0,
    excludedCategories: [],
    rules: [{ id: 'base', category: '*', rateBps: 0 }]
  };
  const transactions = [
    { id: 'a', month: '2026-01', category: 'general', amountPaise: Number.MAX_SAFE_INTEGER },
    { id: 'b', month: '2026-02', category: 'general', amountPaise: 1 }
  ];
  const original = structuredClone(transactions);
  assert.throws(
    () => calculateRewards(card, transactions, 2026),
    /totalSpendPaise exceeds safe integer range/
  );
  assert.deepEqual(transactions, original);
});

test('safe integer boundary remains representable without overflow', () => {
  const card = {
    id: 'synthetic-boundary',
    name: 'Fictional boundary guard',
    annualFeePaise: 0,
    rules: [{ id: 'base', category: '*', rateBps: 0 }]
  };
  const transactions = [
    { id: 'a', month: '2026-01', category: 'general', amountPaise: Number.MAX_SAFE_INTEGER - 1 },
    { id: 'b', month: '2026-02', category: 'general', amountPaise: 1 }
  ];
  const result = calculateRewards(card, transactions, 2026);
  assert.equal(result.totalSpendPaise, Number.MAX_SAFE_INTEGER);
  assert.equal(result.rewardEligibleSpendPaise, Number.MAX_SAFE_INTEGER);
  assert.equal(result.feeWaiverEligibleSpendPaise, Number.MAX_SAFE_INTEGER);
  assert.equal(result.totalRewardsPaise, 0);
});


test('comparison gap exceeding safe integer range fails closed', async () => {
  const { compareCards } = await import('../dist/index.js');
  const card = (id, annualFeePaise, rateBps) => ({
    id, name: `Fictional ${id}`, annualFeePaise,
    rules: [{ id: 'base', category: '*', rateBps }]
  });
  const cards = [card('full-reward', 0, 10000), card('full-fee', Number.MAX_SAFE_INTEGER, 0)];
  const transactions = [{ id: 'synthetic', month: '2026-01', category: 'general', amountPaise: Number.MAX_SAFE_INTEGER }];
  const originalCards = structuredClone(cards);
  const originalTransactions = structuredClone(transactions);
  assert.throws(() => compareCards(cards, transactions, 2026), /differenceFromLeaderPaise exceeds safe integer range/);
  assert.deepEqual(cards, originalCards);
  assert.deepEqual(transactions, originalTransactions);
});

test('comparison gap at exact safe integer boundary remains representable', async () => {
  const { compareCards } = await import('../dist/index.js');
  const card = (id, annualFeePaise) => ({
    id, name: `Fictional ${id}`, annualFeePaise,
    rules: [{ id: 'base', category: '*', rateBps: 0 }]
  });
  const result = compareCards([card('zero-fee', 0), card('maximum-fee', Number.MAX_SAFE_INTEGER)], [], 2026);
  assert.deepEqual(result.leaderCardIds, ['zero-fee']);
  assert.equal(result.entries[0].differenceFromLeaderPaise, 0);
  assert.equal(result.entries[1].differenceFromLeaderPaise, Number.MAX_SAFE_INTEGER);
  assert.equal(result.entries[1].netAnnualValuePaise, -Number.MAX_SAFE_INTEGER);
});
