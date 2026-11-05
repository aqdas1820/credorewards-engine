# CredoRewards Engine v0.2.0-alpha.2

This experimental alpha advances the catalog governance features introduced by `v0.2.0-alpha.1`. It does **not** include real bank rewards datasets or verified issuer terms. GitHub prerelease and npm publication are separate steps, verified independently.

## New: catalog change audit

- **`auditCatalogUpdate(previousCatalog, proposedCatalog)`** checks both snapshots and returns deterministic, sorted sets of added, closed, promoted, evidence-appended and unchanged revision IDs.
- Rejects deleting historical revisions or editing a revision's card/issuer identity, start date or cashback terms under an existing revision ID. Changed terms must use a new revision ID.
- Rejects replacing/removing existing evidence metadata, downgrading recorded review status, rewriting review records or reopening/changing a previously closed effective period.
- Allows append-only evidence on draft records, one-time closure of an open-ended period and recorded draft-to-reviewed promotion subject to the existing metadata requirements.
- The audit compares caller-provided snapshots; it is **not** a cryptographically immutable audit log, access-control service, reviewer authenticator or issuer document verification.

## New: JSON Schema and offline fixture validation

- Ship `schemas/rule-catalog.v1.schema.json`, a Draft 2020-12 authoring schema for catalog v1, cashback rules, evidence fields and review metadata.
- The JSON Schema is included in the npm tarball and published under package export `@credonomics/rewards-engine/schemas/rule-catalog.v1.schema.json`.
- Add `npm run validate:catalog` for the checked-in **fictional draft** catalog. It uses the SDK's runtime `validateRuleCatalog()`, including cross-revision overlaps and calendar validation.
- **Important distinction:** the offline CLI does not run a full JSON Schema validator; using the exported schema in an external schema validator enables additional authoring constraints such as rejecting unknown fields. Neither validation method confirms that an issuer document is authentic or its terms are correct.

## Compatibility and quality

- Preserve the existing `calculateRewards()`, `compareCards()`, `validateRuleCatalog()`, `resolveCardTerms()`, `resolveAnnualCardTerms()`, `compareCatalogCards()` and CLI behavior.
- Add the new `auditCatalogUpdate()` export without introducing a runtime dependency.
- **66 automated tests** (47 previous + 15 catalog audit + 4 fixture/schema/CLI tests).
- Validate TypeScript, tests, fictional catalog, independent installed-package API/CLI/schema smoke test and npm packing across 5 Windows/Linux, npm 12 and Node.js 24/26 CI jobs.
- Financial math remains deterministic in integer paise. There is no statement-cycle, split-year or real-time issuer-rate calculation.

## Installation (after npm publication)

```bash
npm install @credonomics/rewards-engine@0.2.0-alpha.2
```

Or install the `next` dist-tag **after** verifying that it points to this version.

From the source checkout:

```bash
npm ci
npm run typecheck
npm test
npm run test:package
npm run validate:catalog
npm pack --dry-run
```

Documentation: [Catalog Governance](https://github.com/aqdas1820/credorewards-engine/blob/main/docs/CATALOG-GOVERNANCE.md), [Rule Catalog](https://github.com/aqdas1820/credorewards-engine/blob/main/docs/RULE-CATALOG.md), and [npm release runbook](https://github.com/aqdas1820/credorewards-engine/blob/main/docs/NPM-PUBLISHING.md).

## Limitations and release safety

All bundled card examples are synthetic and remain drafts. Evidence URLs, a `reviewed` label and schema conformance **do not independently verify issuer sources or the economic correctness of rates, eligibility, taxes or fees**. Annual-fee and reward evaluation still assumes a complete calendar year and cannot safely apply mid-year rule changes as one full-year revision. These results are not personalized financial advice.

Avoid account numbers, credentials, payment statements or real customer data in issues and fixtures. An approved maintainer must confirm that GitHub tag `v0.2.0-alpha.2` and npm version `0.2.0-alpha.2` are unused before publishing to each channel; never overwrite or republish an existing version. GitHub prerelease automation does **not** publish to npm.
