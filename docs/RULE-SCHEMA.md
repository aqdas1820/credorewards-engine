# Rule semantics (alpha)

The calculation is annual and uses `year`, `card` and `transactions`. All money is integer **paise**; no floats. Rate uses integer basis points (`100` = 1%, `500` = 5%). Reward amounts round down to whole paise per transaction. For each transaction, the **first** matching category or `*` rule is chosen. Therefore place specific rules before wildcard.

- `annualFeePaise`: complete annual fee, including taxes where applicable, provided by caller.
- `annualFeeWaiverThresholdPaise`: optional waiver if qualifying annual spend reaches threshold.
- `feeWaiverExcludedCategories`: separate exclusion list affecting the waiver only.
- `excludedCategories`: exclusions affecting rewards only.
- `minTransactionPaise`: below this, that selected rule does not earn, and no later rule is tried.
- `monthlyCapPaise`: cap on *reward* paise for a given rule and calendar month.
- `annualCapPaise`: cap on *reward* paise for that rule across the evaluated year.
- Transactions are processed in (month, id) order to give deterministic cap allocation, not billing time.
- `rewardEligibleSpendPaise`: reward-rule-matched transactions above minimum, even if the reward cap is exhausted.
- `feeWaiverEligibleSpendPaise`: sum of spend not excluded from fee-waiver thresholds, which may differ from rewards eligibility.

**Limitations:** This does not model banking statement cycles or issuer-specific definitions of an eligible transaction, and it assumes complete annual spending. Category strings are supplied by the caller; actual MCC mapping varies by issuer. Synthetic test inputs are the only included rules. Future versions should introduce statement cycles, tiered spending, points, audit citations, terms effective dates and verified rule packs.
