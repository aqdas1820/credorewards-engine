# Changelog

## 0.2.0-alpha.2 (release candidate; not yet published)

- Add `auditCatalogUpdate(previousCatalog, proposedCatalog)` for deterministic review of catalog snapshot transitions.
- Protect prior revision IDs and cashback terms from silent overwrites, forbid evidence rewrites and review downgrades, and disallow reopening a closed validity period.
- Support append-only evidence on draft revisions, recorded draft-to-reviewed promotion, one-time period closure and new revisions, with sorted audit summaries.
- Ship a JSON Schema Draft 2020-12 catalog authoring contract through an exported npm package subpath; full schema evaluation is left to an external JSON Schema validator.
- Add an offline `validate:catalog` command for fictional fixture runtime validation; no issuer authenticity check or network fetch is performed.
- Add 19 tests for audit transitions, schema metadata and fixture CLI checks (66 total), plus packed npm schema/API smoke tests and CI validation.
- Prepare the next reviewed GitHub prerelease and manual npm `next` publication without changing existing calculation semantics or adding bank data.

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
