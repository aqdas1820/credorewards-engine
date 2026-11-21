import test from 'node:test';
import assert from 'node:assert/strict';
import { compareCards } from '../dist/index.js';

function card(id, annualFeePaise) {
  return Object.freeze({
    id,
    name: id,
    annualFeePaise,
    rules: Object.freeze([])
  });
}

test('empty full-year comparison ranks zero-fee card ahead of charged-fee card', () => {
  const cards = Object.freeze([card('paid', 12345), card('free', 0)]);
  const transactions = Object.freeze([]);
  const result = compareCards(cards, transactions, 2026);
  assert.deepEqual(result.leaderCardIds, ['free']);
  assert.deepEqual(
    result.entries.map(({ cardId, differenceFromLeaderPaise, calculation }) => ({
      cardId,
      differenceFromLeaderPaise,
      totalSpendPaise: calculation.totalSpendPaise,
      totalRewardsPaise: calculation.totalRewardsPaise,
      annualFeeChargedPaise: calculation.annualFeeChargedPaise,
      netAnnualValuePaise: calculation.netAnnualValuePaise
    })),
    [
      { cardId: 'free', differenceFromLeaderPaise: 0, totalSpendPaise: 0,
        totalRewardsPaise: 0, annualFeeChargedPaise: 0, netAnnualValuePaise: 0 },
      { cardId: 'paid', differenceFromLeaderPaise: 12345, totalSpendPaise: 0,
        totalRewardsPaise: 0, annualFeeChargedPaise: 12345, netAnnualValuePaise: -12345 }
    ]
  );
  assert.equal(cards[0].annualFeePaise, 12345);
  assert.equal(transactions.length, 0);
});

test('empty full-year comparison reports equal zero-fee cards as tied leaders', () => {
  const result = compareCards([card('z', 0), card('a', 0)], [], 2026);
  assert.deepEqual(result.leaderCardIds, ['a', 'z']);
  assert.deepEqual(result.entries.map(({ differenceFromLeaderPaise }) => differenceFromLeaderPaise), [0, 0]);
});
