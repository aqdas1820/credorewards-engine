# CredoRewards Engine v0.2.0-alpha.3

Experimental prerelease candidate following the publicly verified `v0.2.0-alpha.2`. This document is prepared **before** separate GitHub and npm publication; a source version alone does not confirm that either release channel is live.

## New: deterministic batch comparison reports

- `createBatchReport(scenarios)` produces a JSON-serializable report for multiple independent fictional annual comparison scenarios.
- Each scenario has a unique ID, year, at least two caller-supplied card terms, and a complete-year transaction history. The result keeps the existing `compareCards()` annual calculations, tied rankings, assumptions and transaction explanations **without recalculating rewards using a second algorithm**.
- Reports sort scenarios by ID and include exactly twelve calendar-month summaries per card (including zero-activity months), with transaction counts, spend in integer paise and earned rewards.
- Annual fees and waivers remain in full-year calculations. Different scenarios **do not share** caps, fees or spending; this feature is not a per-purchase card-selection optimizer.
- New `credorewards-batch <batch.json>` CLI and `examples/fictional-batch.json` with entirely synthetic scenarios. An invalid scenario rejects the entire batch instead of emitting a potentially misleading partial report.

## New: bundled catalog v1 JSON Schema validation

- New `validateCatalogJsonSchema(value)` API at `@credonomics/rewards-engine/catalog-schema-validator` returns `{ valid, errors }` with JSON Pointer paths and violated keywords.
- Evaluates **all validation keywords used by the bundled catalog v1 schema**, including nested required fields, unknown properties, ranges, strings, local definitions and conditional reviewer/evidence requirements.
- New `credorewards-catalog <catalog.json> [more.json]` CLI and existing `npm run validate:catalog` now perform **both** the bundled authoring-schema checks **and** `validateRuleCatalog()` domain checks (actual Gregorian dates, duplicate revision IDs, overlapping effective periods).
- No new runtime dependencies, remote schema resolution, network requests, file uploads or issuer-document fetching.
- This purpose-built evaluator is **not** a general-purpose JSON Schema Draft 2020-12 engine and cannot validate arbitrary custom schemas. Neither schema conformance nor supplied `reviewed` metadata authenticates bank documents, rates or human review.

## Backward compatibility and verification

- Existing public APIs `calculateRewards()`, `compareCards()`, `validateRuleCatalog()`, `resolveCardTerms()`, `resolveAnnualCardTerms()`, `compareCatalogCards()` and `auditCatalogUpdate()` remain available. Existing `credorewards` CLI behavior remains unchanged.
- New installed-package smoke tests verify the batch API, exported JSON Schema validator, valid/invalid new CLI inputs and the original API and CLI.
- **100 automated unit tests** (previously 66), with CI coverage on Linux/Windows, Node.js 24/26, npm bundled/12 and the inherited npm `allow-scripts` regression.
- Integer-paise cashback calculations, annual reward caps and fee-waiver math continue to reuse the existing deterministic engine.

## Installation (only after authorized npm publication)

```bash
npm install @credonomics/rewards-engine@0.2.0-alpha.3
```

The `next` tag refers to this version **only if** the npm registry independently confirms it. The stable `latest` tag must not be moved as part of this alpha release.

To check the source candidate:

```bash
npm ci
npm run typecheck
npm test
npm run test:package
npm run validate:catalog
npm run demo:batch
npm pack --dry-run --ignore-scripts
```

Guides: [Batch Reports](https://github.com/aqdas1820/credorewards-engine/blob/main/docs/BATCH-REPORTS.md), [Strict Schema Validation](https://github.com/aqdas1820/credorewards-engine/blob/main/docs/SCHEMA-VALIDATION.md), [Catalog Governance](https://github.com/aqdas1820/credorewards-engine/blob/main/docs/CATALOG-GOVERNANCE.md) and [npm publishing runbook](https://github.com/aqdas1820/credorewards-engine/blob/main/docs/NPM-PUBLISHING.md).

## Financial and release safety

Only fictional draft fixtures ship. There are **no independently authenticated issuer rates**, statement billing-cycle or midyear revision-spanning reward calculations, MCC mapping, card allocation optimization, points valuation or GST computation. Full-year transaction data and properly verified external card terms are required for meaningful financial interpretation; alpha output is not personalized financial advice.

Never commit personal card numbers, bank statements, OTPs, tokens or customer financial data. The approved maintainer must confirm `v0.2.0-alpha.3` does not exist as a GitHub tag/release and npm `0.2.0-alpha.3` is not published or processing before attempting **one** release in each independent channel. GitHub Actions prerelease workflow **does not publish npm**.
