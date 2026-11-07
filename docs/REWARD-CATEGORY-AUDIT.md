# Category-level reward audit summary (experimental source-only)

`summarizeRewardCategories(calculation)` creates a deterministic reporting
view from a complete existing `calculateRewards()` output. It **does not**
change reward rates, calculate cashback, interpret MCCs, apply fees, or infer
any card issuer's terms. It is proposed for a **future release** and is not
part of the already published `0.2.0-alpha.3` package.

```js
import { calculateRewards, summarizeRewardCategories } from '@credonomics/rewards-engine';

const card = {
  id: 'fictional', name: 'Synthetic', annualFeePaise: 0,
  rules: [{ id: 'base', category: '*', rateBps: 100 }]
};
const result = calculateRewards(card, [
  { id: 'one', month: '2026-01', category: 'utilities', amountPaise: 10000 }
], 2026);
const audit = summarizeRewardCategories(result);
// audit.categories: [{ category: 'utilities', transactionCount: 1,
//   totalSpendPaise: 10000, totalRewardsPaise: 100 }]
```

The report preserves integer-paise totals and sorts categories by their
literal identifiers, independent of source transaction order. Categories
with excluded/non-earning transactions remain visible with zero rewards.
It rejects invalid transaction identities, duplicated IDs, unsafe paise,
invalid evaluation months, and calculated annual spend/reward totals that
cannot be reconciled to the transaction ledger. Inputs are not mutated.

**Limitations:** This view cannot independently confirm that the underlying
card rules or original transaction classifications are correct. Always use
independently verified issuer terms when making real financial decisions.
The current calculation engine assumes complete-year spending for annual
fee-waiver evaluation; this summary does not alter that assumption.
