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

**Important limitations:** Card networks, issuers, aggregators and acquiring banks
may classify the same merchant differently. This helper does not validate whether
an MCC was actually assigned or whether an issuer treats that code as eligible.
All example codes are synthetic. Only use issuer-verified, date-applicable and
independently reviewed mapping definitions for financial decision support.
Existing cashback rules, fee calculations, cap semantics and npm release gates
are unchanged.
