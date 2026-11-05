# CredoRewards Engine v0.2.0-alpha.1

Third alpha release candidate, following the publicly released `v0.1.0-alpha.2`. The GitHub prerelease workflow and npm publishing are **separate** actions; neither channel should be described as published until its respective release completes.

## New: dated, review-gated card rule catalog

- `validateRuleCatalog(catalog)` validates schema version, distinct revision IDs, rule data, evidence metadata, date ranges, and non-overlapping effective periods for the same card.
- `resolveCardTerms(catalog, cardId, asOf)` returns the applicable card-rule revision on a calendar date.
- `resolveAnnualCardTerms(catalog, cardId, year)` requires **one unchanged revision covering the entire calendar year**. It rejects mid-year changes rather than applying inaccurate year-wide rates.
- `compareCatalogCards(catalog, cardIds, transactions, year)` calculates the existing annual cashback ranking from eligible revisions and returns the chosen revision IDs, review records and evidence metadata.
- Draft entries are excluded by default and require an explicit `{ allowDraft: true }` option for clearly labeled hypothetical tests.

The versioned catalog is *infrastructure for source governance*, **not** a validated bank-rate database. A `reviewed` flag is supplied by catalog maintainers; the library neither authenticates reviewers nor fetches/validates the underlying issuer documents.

## Compatibility and validation

- Existing `calculateRewards()`, `compareCards()` and CLI remain available.
- Integer-paise arithmetic and annual cap/fee semantics remain unchanged.
- 45 unit tests (29 previously available + 16 catalog tests), with installed-tarball checks for reward, comparison, catalog APIs and CLI.
- CI covers Linux and Windows, npm 12, and Node.js 24/26, including the inherited npm `allow-scripts` configuration regression.
- A new release-manifest consistency test checks version metadata, lockfile and release notes.
- Zero runtime dependencies.

## Use after npm publication

```bash
npm install @credonomics/rewards-engine@0.2.0-alpha.1
```

`@next` will refer to this version **only after** the npm registry reflects a successful authorized publish.

From the source checkout:

```bash
npm ci
npm run typecheck
npm test
npm run test:package
```

See [Rule Catalog](https://github.com/aqdas1820/credorewards-engine/blob/main/docs/RULE-CATALOG.md), [Card Comparison](https://github.com/aqdas1820/credorewards-engine/blob/main/docs/CARD-COMPARISON.md) and [npm publishing runbook](https://github.com/aqdas1820/credorewards-engine/blob/main/docs/NPM-PUBLISHING.md).

## Financial and security limitations

Only fictional rule fixtures are bundled. This alpha has **no independently authenticated real issuer rates**, merchant/MCC mapping, bank integrations, reward-point valuation, GST computation, statement-cycle caps, split-year recalculation, or per-purchase card-allocation optimization. Reviewed metadata is not external certification.

Annual-fee calculations assume complete-year transaction inputs and supplied fees inclusive of applicable taxes. Do not use hypothetical results as personalized financial advice. Never include account records, card numbers, statements, OTPs or access credentials in bug reports.

**Release gate:** Confirm that `0.2.0-alpha.1` is unused on npm and that `v0.2.0-alpha.1` does not already exist as a Git tag or release. Never reuse an existing published version.
