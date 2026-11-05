# Comparing hypothetical credit cards

`compareCards(cards, transactions, year)` ranks two or more cards by the **net annual cashback value** from the existing `calculateRewards` engine. It is designed for explainable what-if analysis using caller-provided terms.

**No real issuer rates, bank-specific logic or live card catalog are included.** All examples below are fictional.

## Example

```js
import { compareCards } from '@credonomics/rewards-engine';

const cards = [
  {
    id: 'fictional-a', name: 'Fictional Premium Card',
    annualFeePaise: 2000,
    rules: [{ id: 'base', category: '*', rateBps: 500 }]
  },
  {
    id: 'fictional-b', name: 'Fictional No-Fee Card',
    annualFeePaise: 0,
    rules: [{ id: 'base', category: '*', rateBps: 200 }]
  }
];

const transactions = [{
  id: 'sample-1',
  month: '2026-01',
  category: 'groceries',
  amountPaise: 100000
}];

const result = compareCards(cards, transactions, 2026);
console.table(result.entries.map(({ rank, cardName, netAnnualValuePaise }) => ({
  rank, cardName, netAnnualValuePaise
})));
```

For this deliberately minimal input, the premium card earns 5,000 paise and charges a 2,000-paise annual fee, resulting in a 3,000-paise net value. The no-fee card earns 2,000 paise. This is **not a realistic complete-year scenario**; a real annual comparison needs full-year transactions and validated fees.

## Contract

- `cards` must be an array containing at least **two** cards with unique, non-empty IDs.
- Each card is calculated independently against the **same** transactions and year. No spend is divided between cards.
- Entries sort by `netAnnualValuePaise` descending; ties sort by card ID ascending so input order does not change results.
- Tied cards share the best rank, and `leaderCardIds` includes all leaders. Competition ranking is used (1, 1, 3).
- `differenceFromLeaderPaise` is the non-negative gap from the best net value. Values are checked against the JavaScript safe-integer limit.
- `entry.calculation` contains the entire original `calculateRewards` result, including transaction-level reasons and assumptions.
- Input arrays and objects are not mutated.
- No “best card for each purchase” or multi-card allocation algorithm is performed.

## Financial and data limitations

This package only supports basic cashback in integer paise. It does not calculate loyalty points, redemption value, merchant-specific offers, GST, statement cycles, issuer-specific MCC lists, minimum redemption thresholds or eligibility conditions outside the current rules model. Reported annual fees must already include applicable taxes and calculations need a complete annual history.

Before adding **real** card terms, the source-data layer must independently record issuer document URL, the terms' effective date, retrieval timestamp, applicable card variant, exclusions, cap reset semantics, and a human review status. A link or date alone does **not** prove a rule has been verified. Do not ship scraped or guessed real card terms as production-grade calculations.

This method intentionally does not claim that a top-ranked entry is the best financial decision for any user.
