# Experimental statement-cycle spend grouping (source-only)

`summarizeStatementCycleSpend(transactions, closingDay)` is an optional,
**non-reward** reporting utility for grouping dated, caller-supplied spending
by an **assumed** statement closing day. It is not included in the already
published `0.2.0-alpha.3` artifact until a later, separately verified release.

```js
import { summarizeStatementCycleSpend } from '@credonomics/rewards-engine';

const groups = summarizeStatementCycleSpend([
  { id: 'fictional-jan', date: '2026-01-16', amountPaise: 100000 },
  { id: 'fictional-feb', date: '2026-02-15', amountPaise: 25000 }
], 15);

// Both transactions are assigned to the cycle closing 2026-02-15.
// [{ cycleCloseDate: '2026-02-15', transactionCount: 2,
//    totalSpendPaise: 125000, transactionIds: ['fictional-feb', 'fictional-jan'] }]
```

- `closingDay` must be an integer 1–31, and the close day is inclusive.
  If it is absent in a short month, the cycle closes on the final calendar
  day of that month (including leap-year February 29).
- Transactions use strict Gregorian `YYYY-MM-DD` dates (2000–2100),
  non-negative integer paise, and distinct, non-empty transaction IDs.
- Only non-empty groups appear. Groups sort by closing date and transaction
  IDs sort lexicographically, independent of input ordering.
- Malformed dates, duplicate IDs, unsafe values and per-cycle totals over
  the JavaScript safe-integer limit cause explicit errors.
- Inputs are not mutated. No network access or bank data is used.

**Not a statement or rewards calculator:** Each bank can use different
posting dates, holidays, grace rules, billing arrangements, transaction
eligibility or late postings. This helper does not infer those rules and
does not calculate cashback, change `calculateRewards()` calendar-month
caps, convert loyalty points, model fees, or change annual fee waivers.
Do not pass these cycle totals as a substitute for complete-year
transactions without independently checking issuer terms and timing.
