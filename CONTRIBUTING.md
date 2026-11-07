# Contributing to CredoRewards Engine

Thanks for helping make cashback calculations more transparent and reproducible.

CredoRewards is an **experimental financial-adjacent SDK**. Correctness, clear contracts, privacy and independently reproducible tests matter more than the number of features.

## Before you begin

- Read [README.md](README.md), [Architecture](docs/ARCHITECTURE.md), [Security policy](SECURITY.md) and [Code of conduct](CODE_OF_CONDUCT.md).
- Check [open issues](https://github.com/aqdas1820/credorewards-engine/issues) and [pull requests](https://github.com/aqdas1820/credorewards-engine/pulls) to avoid duplicate changes.
- For a significant financial-rule or public-API change, open a scoped feature proposal before writing code.
- **Only use fictional transaction and card data in issues, tests, screenshots and examples.** No PAN/CVV, statements, credentials, cardholder details or unverified issuer tables.
- Report vulnerabilities privately to **support@credonomics.in**, never through a public issue.

## Local development

**Prerequisites:** Node.js 20+ and npm.

```bash
git clone https://github.com/aqdas1820/credorewards-engine.git
cd credorewards-engine
npm ci --ignore-scripts
npm run typecheck
npm test
npm run test:package
npm run validate:catalog
```

To run the fictional browser demo locally:

```bash
npm run demo:web
```

The demo server is loopback-only (`127.0.0.1:4173` by default). For the allowlisted static deployment build:

```bash
npm run build:web
```

Other useful commands: `npm run demo` (single-card CLI), `npm run demo:batch` (multi-scenario CLI) and `npm run verify:release` (source/package verification; **not** authorization to publish).

## Contribution workflow

1. Pick one meaningful issue or narrow improvement; branch from the latest `main`.
2. Document current versus expected behavior using synthetic examples and integer paise.
3. Implement the smallest change consistent with the existing public SDK contracts.
4. Add regression tests for success and rejection paths, including financial edge conditions where relevant.
5. Update documentation and `CHANGELOG.md` under **Unreleased** for user-visible changes.
6. Open a pull request using the [PR template](.github/PULL_REQUEST_TEMPLATE.md). Include intended behavior, risks and evidence.
7. Resolve review comments and use GitHub CI to validate the **exact final head SHA**. Maintainers enforce branch-protection gates and prefer small squash merges.

Do not push directly to protected `main`; do not force merge or bypass required checks.

## Engineering guidelines

- **Financial correctness:** Use integer paise, explicit `bigint` arithmetic where needed, safe-number checks and deterministic result ordering. Preserve the meaning of monthly/annual caps, first-match-wins rules, exclusions, and annual fee waivers.
- **No hidden fallbacks:** Reject malformed/duplicate inputs rather than silently inventing values. Add tests for integer boundaries, transaction permutations, duplicate IDs and complete-year assumptions.
- **One calculation source:** Do not duplicate cashback math in the UI, a different SDK API or a separate package. Reuse `calculateRewards()` and keep explanations consistent.
- **Compatibility:** Treat published exports and financial semantics as review-sensitive even during alpha. Do not alter them unintentionally.
- **Privacy:** The browser demo must remain static/local-only, with no client uploads or analytics introduced without explicit privacy/security review. Render untrusted card names as text nodes, never injected HTML.
- **Financial facts:** Do not bundle real issuer terms without first-party evidence, effective dates, card variant applicability, governance review and legal reuse checks. Metadata alone does not prove verification.
- **Release safety:** Changes to npm publishing, trusted OIDC, release tags, dist-tags, secrets, permissions or GitHub workflow privileges are **separate security-sensitive reviews**. Routine PRs must not publish a package.

For system boundaries and file ownership, read [Architecture](docs/ARCHITECTURE.md). For planned work, read [Roadmap](docs/ROADMAP.md).

## Tests and CI

The GitHub Actions [TypeScript CI workflow](.github/workflows/ci.yml) runs **five Ubuntu/Windows combinations** across Node and npm versions. CI verifies TypeScript, deterministic Node tests, installed tarball consumer APIs/CLIs, catalog fixture/schema checks and package manifests.

A passing local run is useful but **not sufficient for merging**. Wait for every required check on the current PR commit. If a test flakes, capture the failing job and determine the cause; do not weaken assertions just to make the badge green.

## Pull request review expectations

A good PR should answer:

- What user/developer problem does this solve?
- What changed, what deliberately did **not** change, and what may break?
- Which synthetic test proves the intended behavior, and which rejects invalid inputs?
- Could this change affect financial calculations, issuer-data provenance, security or release processes?
- Are the README, architecture, API documentation and changelog still truthful?

We value specific, professional feedback. See the [Code of conduct](CODE_OF_CONDUCT.md).

## License

Unless stated otherwise, contributions to original project code are licensed under [MIT](LICENSE). Third-party card data, bank logos, source documents and trademarks have their own rights; do not assume they may be copied into this repository.
