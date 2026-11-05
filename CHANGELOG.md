# Changelog

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
