# Changelog

## 0.2.0-alpha.1 (release candidate; not yet published)

- Add an experimental versioned credit-card rule catalog with explicit issuer/card-variant labels, evidence URLs, retrieval dates, effective periods and recorded review status.
- Add `validateRuleCatalog()`, `resolveCardTerms()`, `resolveAnnualCardTerms()` and `compareCatalogCards()` API exports.
- Block draft catalog terms by default; allow them only with explicit `allowDraft: true` for synthetic experiments.
- Reject overlapping revisions and full-year calculations that span mid-year rule changes rather than silently assuming a single rate.
- Add a fictional catalog fixture, documentation and 16 catalog unit tests (45 existing tests before release-manifest checks).
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
