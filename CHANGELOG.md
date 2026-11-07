# Changelog

User-visible changes merged after the `v0.2.0-alpha.3` tag are recorded under **Unreleased**. Source changes are not automatically published to npm.

## Unreleased (source on `main`; not a new npm release)

- Add experimental `comparePurchaseImpact()` reporting to compare annual cashback and fee-waiver changes from one hypothetical extra transaction, including shared-cap displacement.
- Add a local-first browser what-if purchase form with exact rupee-to-paise conversion, collision-free synthetic transaction IDs and before/after impact summaries.
- Harden static browser builds by shipping all required SDK ESM modules and verifying import closure before deployment.
- Display INR values with Indian thousands/lakhs/crores grouping without floating-point conversions.
- Extend deterministic validation and safe-integer financial regression coverage across reward, comparison and batch APIs.
- Improve developer onboarding, architecture documentation and GitHub contribution/report templates.

## 0.2.0-alpha.3 (GitHub prerelease; npm workflow accepted 2026-11-05; registry visibility unverified)

- Add deterministic `createBatchReport(scenarios)` with independent annual comparisons and 12 calendar-month summaries per card; keep existing annual reward/fee calculations and ranking semantics.
- Add `credorewards-batch` CLI and fictional multi-scenario JSON example; reject invalid batches instead of quietly producing partial reports.
- Add `validateCatalogJsonSchema(value)` through a typed public package subpath, enforcing every validation keyword used by the shipped catalog v1 authoring schema.
- Combine strict shape checks with runtime Gregorian-date, revision-overlap, uniqueness and domain checks via `credorewards-catalog` CLI and `npm run validate:catalog`.
- Extend packed npm distribution smoke to exercise new SDK/API/CLI paths and invalid-input failures.
- Increase automated test coverage from 66 to **100** tests, with the same five Windows/Linux CI matrix jobs and npm 12 compatibility regression.
- Preserve zero runtime dependencies and fictional-only data; independent issuer verification, statement-cycle math and full generic JSON Schema support remain out of scope.
- Prepare release metadata for separately authorized GitHub prerelease and npm `next` publication.

## 0.2.0-alpha.2 (published GitHub and npm prerelease)

- Add `auditCatalogUpdate(previousCatalog, proposedCatalog)` for deterministic review of catalog snapshot transitions.
- Protect prior revision IDs and cashback terms from silent overwrites, forbid evidence rewrites and review downgrades, and disallow reopening a closed validity period.
- Support append-only evidence on draft revisions, recorded draft-to-reviewed promotion, one-time period closure and new revisions, with sorted audit summaries.
- Ship a JSON Schema Draft 2020-12 catalog authoring contract through an exported npm package subpath; full schema evaluation is left to an external JSON Schema validator.
- Add an offline `validate:catalog` command for fictional fixture runtime validation; no issuer authenticity check or network fetch is performed.
- Add 19 tests for audit transitions, schema metadata and fixture CLI checks (66 total), plus packed npm schema/API smoke tests and CI validation.
- Published GitHub prerelease and manual npm `next` version, with independently verified seven API imports, JSON Schema and Windows CLI; financial calculation semantics and synthetic data unchanged.

## 0.2.0-alpha.1 (published GitHub and npm prerelease)

- Add an experimental versioned credit-card rule catalog with explicit issuer/card-variant labels, evidence URLs, retrieval dates, effective periods and recorded review status.
- Add `validateRuleCatalog()`, `resolveCardTerms()`, `resolveAnnualCardTerms()` and `compareCatalogCards()` API exports.
- Block draft catalog terms by default; allow them only with explicit `allowDraft: true` for synthetic experiments.
- Reject overlapping revisions and full-year calculations that span mid-year rule changes rather than silently assuming a single rate.
- Add a fictional catalog fixture, documentation, 16 catalog unit tests and 2 release-manifest checks (47 tests total).
- Extend installed-package smoke tests to cover the catalog API without changing existing cashback calculations.
- Prepare version and documentation updates for a separately approved GitHub prerelease and npm `next` publication.

## 0.1.0-alpha.2 (release candidate)

- Add deterministic `compareCards()` API with audited annual net-value ranking, ties and gap-to-leader values.
- Add 10 multi-card comparison tests (29 total unit tests).
- Normalize npm CLI binary path and repository metadata.
- Add packed-package CLI and public API smoke tests to CI and release validation.
- Fix npm 12 package smoke test compatibility (including inherited `allow-scripts` settings), with Windows/Linux CI coverage.
- Update publishing documentation after the first public npm release.

## 0.1.0-alpha.1 (first npm alpha)

- Implemented deterministic cashback calculations in integer paise.
- Added category rules, reward caps, exclusions, fee waivers and CLI.
- Added fictional sample and 19 automated unit tests.
- Published as public `@credonomics/rewards-engine` with npm `next` tag.
