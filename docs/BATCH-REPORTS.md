# Structured batch comparison reports (experimental alpha.3 release candidate)

The **unpublished v0.2.0-alpha.3 release candidate** includes `createBatchReport(scenarios)`, a pure TypeScript API for evaluating **multiple independent fictional annual card comparisons** and producing deterministic JSON-serializable results. The API and CLI are **not** in the already published npm `v0.2.0-alpha.2`; alpha.3 must be released and verified separately.

## Example

```js
import { createBatchReport } from '@credonomics/rewards-engine';

const report = createBatchReport([
  {
    id: 'fictional-grocery-profile',
    year: 2026,
    cards: [
      { id: 'fictional-a', name: 'Synthetic Card A', annualFeePaise: 0,
        rules: [{ id: 'grocery', category: 'groceries', rateBps: 500 }] },
      { id: 'fictional-b', name: 'Synthetic Card B', annualFeePaise: 0,
        rules: [{ id: 'grocery', category: 'groceries', rateBps: 100 }] }
    ],
    transactions: [
      { id: 't1', month: '2026-01', category: 'groceries', amountPaise: 100000 }
    ]
  }
]);

console.log(report.scenarios[0].comparison.leaderCardIds);
console.log(report.scenarios[0].monthlyByCard[0].months[0]);
```

These are synthetic transactions illustrating the API, **not** full-year financial evidence or an actual card recommendation.

## Contract

- `createBatchReport(scenarios: BatchScenario[]): BatchReport` requires a non-empty array and unique, non-blank scenario IDs.
- Each scenario supplies its own `id`, `year`, `cards` (two or more) and `transactions`. The existing `compareCards()` implementation validates each card/transaction and calculates annual cashback **without any separate formula or new rate assumptions**.
- Scenarios sort by ID to make output independent of input order. Ranking inside each scenario uses the original net-annual-value comparison semantics, including deterministic ties.
- `reportVersion: 1`, `scenarioCount`, and `scenarios[]` are reported. Each item includes `scenarioId`, `year`, the original complete `comparison` with full transaction reasoning, and `monthlyByCard[]` in the same order as `comparison.entries`.
- Every card includes exactly **12 calendar-month rows** (`YYYY-MM`), even for zero-spend months. Each row contains transaction count, total spend paise and earned reward paise. The annual fee remains in the annual comparison; it is not apportioned across months.
- Input objects remain unchanged. One failed scenario rejects the **entire batch** with a scenario-specific error instead of silently returning partial results.

## CLI

From a repository checkout with a built `dist` folder:

```bash
npm run demo:batch
node bin/credorewards-batch.mjs examples/fictional-batch.json
```

The packaged `credorewards-batch <batch.json>` command reads `{ "scenarios": [ ... ] }` and prints JSON to stdout. Use shell redirection for a report file, e.g. `credorewards-batch batch.json > report.json`. The example fixture contains only fabricated cards.

## Financial limits

Every card is evaluated separately against the **same spend within a scenario**, not optimized per transaction. Across scenarios, fees, caps and qualifying spend are not shared. Do **not** sum competing card outcomes together or treat a cross-scenario total as an actual customer account. Calendar months are **not bank statement cycles**. The SDK still lacks reward-point valuations, MCC mapping, split-year rule recalculation and issuer authenticated datasets. Always supply complete-year spending for annual fee/waiver comparisons.
