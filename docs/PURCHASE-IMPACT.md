# Experimental purchase-impact comparison

`comparePurchaseImpact(cards, historicalTransactions, purchase, year)` is a
**reporting-only, source SDK API** for hypothetical cashback analysis. It adds
one proposed transaction to an annual scenario and calculates the difference
between two runs of the existing `calculateRewards()` engine. No new reward,
fee, cap or waiver calculation rules are introduced.

This is intended to make competitor-style "what happens if I add a purchase?"
calculations **auditable**, not to market an unverified real-card recommendation.

## Example (fictional terms only)

```js
import { comparePurchaseImpact } from '@credonomics/rewards-engine';

const cards = [
  { id: 'capped', name: 'Fictional Capped', annualFeePaise: 0,
    rules: [{ id: 'base', category: '*', rateBps: 1000, monthlyCapPaise: 100 }] },
  { id: 'flat', name: 'Fictional Flat', annualFeePaise: 0,
    rules: [{ id: 'base', category: '*', rateBps: 200 }] }
];
const history = [
  { id: 'z-old', month: '2026-01', category: 'groceries', amountPaise: 900 }
];
const purchase = {
  id: 'a-new', month: '2026-01', category: 'groceries', amountPaise: 300
};

const impact = comparePurchaseImpact(cards, history, purchase, 2026);
for (const entry of impact.entries) {
  console.log(entry.cardId, entry.purchase.earnedPaise,
    entry.incrementalRewardsPaise, entry.incrementalNetAnnualValuePaise);
}
// capped: purchase earns 30 paise, annual rewards increase by only 10 paise
// flat: purchase earns 6 paise, annual rewards increase by 6 paise
```

## Why purchase cashback and incremental rewards can differ

A transaction inserted earlier by the engine's deterministic month/ID ordering
can consume a shared cap that would otherwise have been used by an older
transaction. In the example, the new transaction earns 30 paise, but reduces
the older transaction's reward by 20 paise. So the actual increase in the
scenario's annual rewards is **10 paise**, not 30.

- `purchase`: exact transaction result/reason from the **with-purchase** run.
- `incrementalRewardsPaise`: after minus before annual reward totals.
- `otherTransactionsRewardDeltaPaise`: the portion of the change attributable
  to the reallocation of previously modeled transactions; can be negative.
- `feeSavingsPaise`: annual fee charged before minus after; may reflect an
  inclusive annual fee-waiver threshold.
- `incrementalNetAnnualValuePaise`: difference in net annual values. The
  ranking sorts by this, with stable card-ID ties and competition ranks.
- `baseline` and `withPurchase`: the full underlying calculation ledgers,
  so callers can audit every number.

## Boundaries and required inputs

- **Not a real per-purchase wallet optimizer.** The same historical spend is
  assumed to have been charged to EACH candidate card separately. The method
  does not allocate past or future transactions across multiple cards and
  does not know which card the customer actually used.
- **A complete year is required** for annual-fee/waiver interpretation. Using
  partial-year history can cause misleading marginal fee impacts.
- All terms and categories are caller-provided. No source-verified Indian bank
  catalog, merchant offers, MCC detection, loyalty point valuation, statement
  billing periods, or approval of customer financial recommendations.
- Purchase ID must be new; duplicated IDs, invalid months/amounts and unsafe
  integer sums are rejected by the existing engine. Incremental differences
  are computed with `bigint` and also reject out-of-range paise results.
- This API is experimental source functionality until a separately authorized
  package release. It does not modify existing `calculateRewards` or
  `compareCards` behavior.

Any transition from hypothetical card analysis to issuer-specific purchase
recommendations needs first-party terms evidence, dated effective rules,
reviewed card-data governance, security/privacy review, and tests against
actual applicable issuer restrictions.
