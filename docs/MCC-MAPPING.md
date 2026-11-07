# Explicit MCC-to-category mapping (experimental, source-only)

`mapMccTransactions(transactions, mappings)` transforms caller-provided merchant category codes into
the `Transaction` format accepted by `calculateRewards()` and `compareCards()`. It is a
**strict adapter**, not a live merchant classifier or credit-card eligibility engine.
This addition is not in the already published `0.2.0-alpha.3` package.

```js
import { mapMccTransactions, calculateRewards } from '@credonomics/rewards-engine';

const input = [{ id: 'synthetic-1', month: '2026-01', mcc: '0123', amountPaise: 10000 }];
const categories = [{ mcc: '0123', category: 'groceries' }]; // Fictional, not an official MCC mapping
const transactions = mapMccTransactions(input, categories);
const card = { id: 'demo', name: 'Fictional Card', annualFeePaise: 0,
  rules: [{ id: 'groceries', category: 'groceries', rateBps: 500 }] };
console.log(calculateRewards(card, transactions, 2026).totalRewardsPaise);
```

**Contract and safety:**

- MCCs must be strings of exactly four ASCII digits (leading zeros matter).
- Every mapping must have a nonblank category and unique MCC.
- Every dated-by-month transaction must have a nonblank unique ID, valid YYYY-MM
  within 2000–2100 and a nonnegative safe integer number of paise.
- Unknown or malformed MCCs reject the entire conversion. There is **no default
  guessed merchant category**, automatic lookup, remote fetch or network call.
- Output preserves caller ordering and is a fresh collection of `Transaction` objects.
- The original transactions and mapping rules are not mutated.


## End-to-end synthetic comparison and reporting

The mapped transactions can be handed directly to the **existing**
`compareCards()` and `createBatchReport()` functions. No additional
bank-specific rate lookup, card selection or statement-cycle inference occurs.

```js
import { mapMccTransactions, compareCards, createBatchReport } from '@credonomics/rewards-engine';

const mapped = mapMccTransactions(
  [{ id: 'sample', month: '2026-01', mcc: '0123', amountPaise: 10000 }],
  [{ mcc: '0123', category: 'groceries' }] // synthetic, not an issuer mapping
);
const cards = [
  { id: 'one', name: 'Fictional One', annualFeePaise: 0,
    rules: [{ id: 'base', category: '*', rateBps: 100 }] },
  { id: 'two', name: 'Fictional Two', annualFeePaise: 0,
    rules: [{ id: 'base', category: '*', rateBps: 200 }] }
];
const comparison = compareCards(cards, mapped, 2026);
const report = createBatchReport([{ id: 'example', year: 2026,
  cards, transactions: mapped }]);
console.log(comparison.leaderCardIds, report.scenarios[0].monthlyByCard);
```

The integration regression test verifies strict fail-closed handling of unknown
MCCs, per-rule caps, card ranking, and calendar-month/annual reconciliation.
This adapter cannot validate the truth, eligibility, or date applicability of
caller-supplied MCC assignments; that requires external issuer evidence.

**Important limitations:** Card networks, issuers, aggregators and acquiring banks
may classify the same merchant differently. This helper does not validate whether
an MCC was actually assigned or whether an issuer treats that code as eligible.
All example codes are synthetic. Only use issuer-verified, date-applicable and
independently reviewed mapping definitions for financial decision support.
Existing cashback rules, fee calculations, cap semantics and npm release gates
are unchanged.
