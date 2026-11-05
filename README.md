# CredoRewards Engine

[![TypeScript CI](https://github.com/aqdas1820/credorewards-engine/actions/workflows/ci.yml/badge.svg)](https://github.com/aqdas1820/credorewards-engine/actions/workflows/ci.yml) [![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

**A transparent, deterministic credit-card cashback rules SDK for India's fintech builders.**

Maintained by CredoNomics Investment Solutions · [credonomics.in](https://credonomics.in)

> **Experimental alpha, published to npm under the `next` dist-tag.** This starter is not connected to banks or payment networks. All sample card rules are fictional. Do not use the output for financial decisions without independently validating issuer terms and the complete calculation period.

## What this MVP does

- Integer-paise cashback (avoids floating-point currency errors)
- Category-based rewards and wildcard fallback
- Monthly and annual reward caps per rule
- Reward exclusions and minimum transaction amounts
- Annual-fee waivers with separate qualifying-spend exclusions
- Transaction-by-transaction explanations and a net annual value estimate
- Independent, deterministic multi-card comparisons with tied rankings and full calculation breakdowns
- Experimental dated rule-catalog metadata, provenance and review-gated version resolution (published in v0.2.0-alpha.1)
- Proposed source-only catalog evolution audit, offline fixture checker and JSON Schema authoring contract (not yet on npm)
- Pure TypeScript with **zero runtime dependencies**, CLI, tests and GitHub Actions CI

## What it does **not** do (yet)

Reward point valuations, MCC detection, accelerated tiers, merchant offers, GST calculation, fee reversals, spend thresholds within statement cycles, welcome/milestone benefits, international exchange charges, fuel surcharges, balance and redemption restrictions, or any live bank rules. Fees must be supplied inclusive of relevant taxes. Calculations assume **complete annual spending** for fee-waiver evaluations. Do not treat a partial year as complete.

## Quick start

Requires Node.js 20+ and TypeScript 5.8+ for building.

```bash
npm install
npm test
npm run validate:catalog
npm run demo
```

To use the published prerelease in another project: `npm install @credonomics/rewards-engine@next` (currently `0.2.0-alpha.1`). The new governance audit is **source-only** until a subsequent reviewed package release. Run `npm run test:package` from this source repository to check an independently installed tarball, CLI and ESM imports.

Or programmatic usage:

```ts
import { calculateRewards } from '@credonomics/rewards-engine';

const card = {
  id: 'fictional', name: 'Fictional Demo Card', annualFeePaise: 50000,
  excludedCategories: ['rent'],
  rules: [
    { id: 'grocery', category: 'groceries', rateBps: 500, monthlyCapPaise: 10000 },
    { id: 'base', category: '*', rateBps: 100 }
  ]
};
const transactions = [
  { id: '1', month: '2026-01', category: 'groceries', amountPaise: 100000 }
];
const result = calculateRewards(card, transactions, 2026);
console.log(result.totalRewardsPaise, result.netAnnualValuePaise);
```

Amounts are in **paise**: `100000` paise = ₹1,000; `rateBps: 500` = 5%.

CLI:

```bash
npm run build
node bin/credorewards.mjs examples/fictional-card.json
```

See [RULE-SCHEMA.md](docs/RULE-SCHEMA.md) for cap semantics, [CARD-COMPARISON.md](docs/CARD-COMPARISON.md) for comparisons, [RULE-CATALOG.md](docs/RULE-CATALOG.md) for dated revisions, [CATALOG-GOVERNANCE.md](docs/CATALOG-GOVERNANCE.md) for proposed audit/JSON Schema checks and [ROADMAP.md](docs/ROADMAP.md) for planned work.

## npm package status

The public registry package is [@credonomics/rewards-engine](https://www.npmjs.com/package/@credonomics/rewards-engine). The publicly verified npm prerelease is **`0.2.0-alpha.1`**, accessible via `@next`; `latest` is still `0.1.0-alpha.1`. The rule-catalog APIs are available in `0.2.0-alpha.1` (confirmed by clean public installation). This branch adds proposed governance checks but **does not bump or publish another version**. See [npm publishing](docs/NPM-PUBLISHING.md) for release gates.

## GitHub prerelease

Each new package version can be published as a **GitHub prerelease**, separate from npm publication. `v0.2.0-alpha.1` is already released; do not reuse that tag. A future prerelease requires a new version and separate release-preparation review. Maintainers can use [Actions → Publish GitHub prerelease](https://github.com/aqdas1820/credorewards-engine/actions/workflows/release.yml) and select **Run workflow** on `main`. The workflow runs the typecheck, the current unit test suite and independent package installation smoke tests, packs an installable `.tgz`, and creates tag `v${version}` only after validation. It refuses to reuse an existing release or version tag.

**This workflow does not publish to npm.** npm versions must be published and verified independently. See [release notes](docs/RELEASE-NOTES.md).

## Ground rules for contributors

- No unverified bank/card rewards tables or issuer logos.
- Cite first-party issuer terms, effective dates and applicability when real card rules are added later.
- Never commit card numbers, transaction statements, credentials or personal financial data.
- No scraping requiring bypassing paywalls, credentials or access controls.
- Prefer reproducible synthetic cases and clear tests for financial math.

## License

MIT for the original code in this starter. Actual issuer terms, trademarks and third-party datasets carry their own rights and restrictions.

## Security

Report vulnerabilities privately to support@credonomics.in. Read [SECURITY.md](SECURITY.md).
