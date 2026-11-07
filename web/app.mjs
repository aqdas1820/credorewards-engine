import { compareCards, comparePurchaseImpact } from '/dist/index.js';
import { createScoreboardRows, createPurchaseImpactRows } from '/web/scoreboard.mjs';
import { parseRupeesToPaise, nextSyntheticPurchaseId } from '/web/purchase-input.mjs';
import { readLocalScenario } from '/web/local-import.mjs';

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
const purchaseScoreboard = document.getElementById('purchase-scoreboard');
const purchaseStatus = document.getElementById('purchase-status');
const purchaseMonth = document.getElementById('purchase-month');

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

function showPurchaseImpact(impact) {
  // User-controlled card names are ALWAYS text nodes, never HTML.
  const table = document.createElement('table');
  const heading = document.createElement('thead');
  const headerRow = document.createElement('tr');
  for (const label of ['Rank', 'Card', 'New purchase cashback', 'Existing rewards change', 'Annual fee saved', 'Net annual change']) {
    const cell = document.createElement('th');
    cell.scope = 'col';
    cell.textContent = label;
    headerRow.append(cell);
  }
  heading.append(headerRow);
  table.append(heading);
  const body = document.createElement('tbody');
  for (const row of createPurchaseImpactRows(impact)) {
    const tr = document.createElement('tr');
    for (const value of [row.rank, row.name, row.purchaseRewards, row.existingRewardsDelta, row.feeSavings, row.netDelta]) {
      const cell = document.createElement('td');
      cell.textContent = String(value);
      tr.append(cell);
    }
    body.append(tr);
  }
  table.append(body);
  purchaseScoreboard.replaceChildren(table);
}

const exampleJson = JSON.stringify(example, null, 2);
input.value = exampleJson;

function calculate() {
  output.textContent = '';
  scoreboard.replaceChildren();
  purchaseScoreboard.replaceChildren();
  purchaseStatus.textContent = '';
  try {
    const payload = JSON.parse(input.value);
    // The SDK itself performs strict card, transaction, year and paise validation.
    const result = compareCards(payload.cards, payload.transactions, payload.year);
    if (purchaseMonth.value.slice(0, 4) !== String(payload.year)) {
      purchaseMonth.value = String(payload.year) + '-01';
    }
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

function calculatePurchaseImpact() {
  purchaseScoreboard.replaceChildren();
  try {
    const scenario = JSON.parse(input.value);
    const purchase = {
      id: nextSyntheticPurchaseId(scenario.transactions),
      month: purchaseMonth.value,
      category: document.getElementById('purchase-category').value.trim(),
      amountPaise: parseRupeesToPaise(document.getElementById('purchase-rupees').value)
    };
    const impact = comparePurchaseImpact(
      scenario.cards, scenario.transactions, purchase, scenario.year
    );
    showPurchaseImpact(impact);
    purchaseStatus.textContent =
      'Hypothetical impact calculated locally. Every card assumes the entire prior history. ' +
      'A complete year is required for annual fee-waiver interpretation.';
  } catch (error) {
    purchaseStatus.textContent = 'Purchase impact unavailable: ' +
      (error instanceof Error ? error.message : String(error));
  }
}

document.getElementById('compare-purchase').addEventListener('click', calculatePurchaseImpact);

document.getElementById('scenario-file').addEventListener('change', async event => {
  const picker = event.currentTarget;
  const file = picker.files?.[0];
  if (!file) return;
  try {
    const payload = await readLocalScenario(file);
    // Preserve existing input if an imported file fails SDK validation.
    compareCards(payload.cards, payload.transactions, payload.year);
    input.value = JSON.stringify(payload, null, 2);
    calculate();
  } catch (error) {
    status.textContent = 'Local import rejected: ' + (error instanceof Error ? error.message : String(error));
  } finally {
    picker.value = '';
  }
});

document.getElementById('calculate').addEventListener('click', calculate);
document.getElementById('reset').addEventListener('click', () => {
  input.value = exampleJson;
  calculate();
});
// Display a real SDK comparison immediately; user should not face an empty dashboard.
calculate();
