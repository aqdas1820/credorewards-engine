import { compareCards } from '/dist/index.js';

const example = {
  year: 2026,
  cards: [
    { id: 'fictional-flat', name: 'Synthetic Flat', annualFeePaise: 0,
      rules: [{ id: 'base', category: '*', rateBps: 100 }] },
    { id: 'fictional-grocery', name: 'Synthetic Grocery', annualFeePaise: 1000,
      rules: [
        { id: 'grocery', category: 'groceries', rateBps: 500, monthlyCapPaise: 3000 },
        { id: 'base', category: '*', rateBps: 100 }
      ] }
  ],
  transactions: [
    { id: 'jan-food', month: '2026-01', category: 'groceries', amountPaise: 100000 },
    { id: 'feb-utility', month: '2026-02', category: 'utilities', amountPaise: 20000 }
  ]
};

const input = document.getElementById('payload');
const output = document.getElementById('result');
const status = document.getElementById('status');
input.value = JSON.stringify(example, null, 2);

document.getElementById('calculate').addEventListener('click', () => {
  output.textContent = '';
  try {
    const payload = JSON.parse(input.value);
    // The SDK itself performs strict card, transaction, year and paise validation.
    const result = compareCards(payload.cards, payload.transactions, payload.year);
    output.textContent = JSON.stringify({
      year: result.year,
      leaderCardIds: result.leaderCardIds,
      entries: result.entries.map(entry => ({
        rank: entry.rank,
        cardId: entry.cardId,
        cardName: entry.cardName,
        totalRewardsPaise: entry.totalRewardsPaise,
        annualFeeChargedPaise: entry.annualFeeChargedPaise,
        netAnnualValuePaise: entry.netAnnualValuePaise,
        differenceFromLeaderPaise: entry.differenceFromLeaderPaise,
        transactions: entry.calculation.transactions
      })),
      assumptions: result.assumptions
    }, null, 2);
    status.textContent = 'Calculated locally. No information was uploaded.';
  } catch (error) {
    status.textContent = 'Invalid scenario: ' + (error instanceof Error ? error.message : String(error));
    output.textContent = 'No results produced.';
  }
});
