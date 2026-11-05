# Versioned credit-card rule catalog (experimental)

The catalog is a **metadata and review gate** around the existing integer-paise cashback engine. It records which rule revision applies on which date, which sources a reviewer relied upon, and who recorded review.

**No real issuer terms are bundled.** The only catalog fixture, examples/fictional-catalog.json, is synthetic and marked draft.

## Data contract

Each RuleCatalog includes schemaVersion: 1 and an array of CardRuleRevision entries.

| Field | Meaning |
|---|---|
| revisionId | Globally unique immutable revision identifier |
| issuer, cardVariant | Issuer name and exact applicable card variant as entered by the catalog maintainer |
| effectiveFrom, effectiveThrough? | Inclusive YYYY-MM-DD validity dates; omitted end means open-ended |
| terms | The existing CardTerms cashback rule schema, with a stable card ID across versions |
| evidence[] | HTTPS document URLs, titles, retrieval dates, optional sections or page references |
| review | draft or reviewed, with recorded reviewer and date for reviewed entries |

The API rejects calendar-invalid dates, inverted or overlapping card validity periods, duplicate revision IDs, invalid cashback rule shapes, malformed evidence URLs and missing review metadata.

**Security and truth boundary:** It does not fetch URLs or authenticate bank ownership, check PDF contents, prove effective dates, or guarantee that the data was human-reviewed. The reviewed status is an **assertion supplied by a catalog maintainer**, not external certification. Enforce actual first-party document checks, authorization and human signoff outside this SDK before setting it.

## Resolving dates safely

- validateRuleCatalog(catalog) checks metadata and structural invariants.
- resolveCardTerms(catalog, cardId, asOf) selects the one version active on that **calendar date**.
- resolveAnnualCardTerms(catalog, cardId, year) only selects a version that covers **January 1 through December 31**.
- compareCatalogCards(catalog, cardIds, transactions, year) resolves year-wide versions for all candidate cards and delegates cashback calculation to the existing compareCards API. Its result includes both the comparison and a revisions/evidence audit selection.

Draft revisions are **blocked by default**. Set allowDraft: true only for clearly labeled fictional experiments.

If a rule changes on July 1, this initial API **refuses to calculate a whole-year result** from one version. Statement-cycle-aware, split-year evaluation must be implemented and tested separately; pretending a December snapshot was valid all year would produce misleading fees and capped rewards.

## Synthetic example

Run from the repository root after building:

```js
import { readFileSync } from 'node:fs';
import { compareCatalogCards } from './dist/index.js';

const catalog = JSON.parse(readFileSync('./examples/fictional-catalog.json', 'utf8'));
const transactions = [
  { id: 'demo-1', month: '2026-01', category: 'groceries', amountPaise: 100000 },
  { id: 'demo-2', month: '2026-01', category: 'utilities', amountPaise: 50000 }
];
const { comparison, selections } = compareCatalogCards(
  catalog, ['fictional-grocery', 'fictional-simple'], transactions, 2026,
  { allowDraft: true } // REQUIRED: these are synthetic, unreviewed rules
);
console.log(comparison.leaderCardIds, selections.map(x => x.revisionId));
```

These are **not real full-year spending data** or a personal card recommendation; this is a small test of deterministic selection and calculation plumbing. Transactions represent YYYY-MM periods, not dates within the month, and the current calculator's cashback caps reset on calendar months rather than issuer statement cycles.

## Required issuer-data review workflow (future integration)

1. Identify the exact bank product, card variant and applicable customer segment.
2. Collect the **official first-party** source document, including URL, dated copy, pages/sections, effective date and retrieval date.
3. Manually check every rate, excluded MCC/category, cap, fee/tax treatment, fee waiver and statement-cycle rule against the source. Mark unsupported clauses or models explicitly; do not silently approximate.
4. Conduct independent review, record reviewer/date, then mark reviewed. The SDK records that assertion but does not verify the reviewer.
5. On terms changes, close the old revision's effectiveThrough date and create a new revision. Never overwrite a released historical record without traceability.
6. Re-run fixture, regression and integration tests; reject annual calculations when terms change during that year until a real period-aware engine is designed.

Avoid using customer statements or real card numbers in source fixtures, tests or bug reports.

## Limitations and follow-up

This is **not** an automated verified issuer database, crawler, scraper, legal review, or production eligibility determination. It does not value reward points, assign purchases to different cards, model statements, reconcile refunds, or infer card terms from a brand name. Evidence URLs alone are not proof.

Next engineering tasks: signed/approved review workflow outside the SDK, official issuer dataset curation, effective-date migrations, statement-cycle modeling and split-year replay with explicit cap and fee semantics.
