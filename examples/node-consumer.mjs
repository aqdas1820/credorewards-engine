// Standalone, offline synthetic Node.js consumer example after `npm run build`.
// All terms are fictional; this is NOT an issuer recommendation.
import { calculateRewards, compareCards, createBatchReport } from '../dist/index.js';

const transactions = [
  { id: 'groceries', month: '2026-01', category: 'groceries', amountPaise: 100000 },
  { id: 'utilities', month: '2026-02', category: 'utilities', amountPaise: 20000 }
];
const cards = [
  {
    id: 'fictional-flat', name: 'Synthetic Flat', annualFeePaise: 0,
    rules: [{ id: 'flat', category: '*', rateBps: 100 }]
  },
  {
    id: 'fictional-grocery', name: 'Synthetic Grocery', annualFeePaise: 1000,
    rules: [
      { id: 'groceries', category: 'groceries', rateBps: 500, monthlyCapPaise: 3000 },
      { id: 'base', category: '*', rateBps: 100 }
    ]
  }
];

const single = calculateRewards(cards[1], transactions, 2026);
const comparison = compareCards(cards, transactions, 2026);
const batch = createBatchReport([{
  id: 'fictional-example', year: 2026, cards, transactions
}]);

console.log(JSON.stringify({
  cardId: single.cardId,
  totalRewardsPaise: single.totalRewardsPaise,
  netAnnualValuePaise: single.netAnnualValuePaise,
  winnerCardIds: comparison.leaderCardIds,
  januaryGroceryRewardsPaise: batch.scenarios[0].monthlyByCard
    .find(card => card.cardId === 'fictional-grocery').months[0].totalRewardsPaise
}, null, 2));
