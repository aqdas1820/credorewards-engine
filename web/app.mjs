import { compareCards } from '/dist/index.js';
import { createScoreboardRows } from '/web/scoreboard.mjs';

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
const scoreboard = document.getElementById('scoreboard');

function showScoreboard(comparison) {
  // Construct text nodes only; never interpret user-supplied names as HTML.
  const table = document.createElement('table');
  const heading = document.createElement('thead');
  const headerRow = document.createElement('tr');
  for (const label of ['Rank', 'Card', 'Rewards', 'Fee', 'Net value']) {
    const cell = document.createElement('th');
    cell.scope = 'col';
    cell.textContent = label;
    headerRow.append(cell);
  }
  heading.append(headerRow);
  table.append(heading);
  const body = document.createElement('tbody');
  for (const row of createScoreboardRows(comparison)) {
    const tr = document.createElement('tr');
    for (const value of [row.rank, row.name, row.rewards, row.fee, row.net]) {
      const cell = document.createElement('td');
      cell.textContent = String(value);
      tr.append(cell);
    }
    body.append(tr);
  }
  table.append(body);
  scoreboard.replaceChildren(table);
}

const exampleJson = JSON.stringify(example, null, 2);
input.value = exampleJson;

function calculate() {
  output.textContent = '';
  scoreboard.replaceChildren();
  try {
    const payload = JSON.parse(input.value);
    // The SDK itself performs strict card, transaction, year and paise validation.
    const result = compareCards(payload.cards, payload.transactions, payload.year);
    showScoreboard(result);
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
}

document.getElementById('calculate').addEventListener('click', calculate);
document.getElementById('reset').addEventListener('click', () => {
  input.value = exampleJson;
  calculate();
});
// Display a real SDK comparison immediately; user should not face an empty dashboard.
calculate();
