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
- Catalog evolution audit, offline fixture checks and JSON Schema authoring contract (published in v0.2.0-alpha.2)
- Strict bundled catalog v1 schema validation and multi-scenario monthly batch reports (in the v0.2.0-alpha.3 release candidate, **not yet published**)
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

To install the **currently verified public** prerelease, use `npm install @credonomics/rewards-engine@0.2.0-alpha.2` or the current `@next` tag after checking npm. The source package **prepares `0.2.0-alpha.3`**, including `createBatchReport()`, strict schema validation and two new CLIs; these are not on npm until separate release and registry verification. Run `npm run test:package` in the repository to verify the installable candidate tarball.

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

See [BATCH-REPORTS.md](docs/BATCH-REPORTS.md) for candidate batch report semantics, [SCHEMA-VALIDATION.md](docs/SCHEMA-VALIDATION.md) for strict catalog validation, and [RULE-SCHEMA.md](docs/RULE-SCHEMA.md) for cap semantics, [CARD-COMPARISON.md](docs/CARD-COMPARISON.md) for comparisons, [RULE-CATALOG.md](docs/RULE-CATALOG.md) for dated revisions, [CATALOG-GOVERNANCE.md](docs/CATALOG-GOVERNANCE.md) for catalog audit/JSON Schema checks and [ROADMAP.md](docs/ROADMAP.md) for planned work.


## v0.2.0-alpha.3 release candidate (unpublished)

Source version `0.2.0-alpha.3` includes `createBatchReport(scenarios)`, a `credorewards-batch` CLI and purpose-built JSON Schema v1 validation via `@credonomics/rewards-engine/catalog-schema-validator` and `credorewards-catalog`. These additions are **not available from the published `0.2.0-alpha.2`** and will reach npm only after separately approved release actions and verification.

From a source checkout of this release candidate:

```bash
npm ci
npm test
npm run test:package
npm run validate:catalog
npm run demo:batch
```

The schema evaluator covers every keyword currently used in the shipped catalog schema but does **not** process arbitrary JSON Schema documents. The batch report compares hypothetical cards independently per scenario and does not optimize card spend allocation. See the linked design docs for financial and provenance boundaries.

## npm package status

The most recently **independently verified published** npm prerelease is `0.2.0-alpha.2` under `next`; `latest` remains `0.1.0-alpha.1`. The **unpublished candidate `0.2.0-alpha.3`** contains the new batch and schema features. Existing alpha.2 publication is complete; its GitHub tag and npm package version must not be reused. Check `npm dist-tag ls @credonomics/rewards-engine` and install a pinned version to verify later releases. See [npm publishing](docs/NPM-PUBLISHING.md).

## GitHub prerelease

GitHub prereleases are separate from npm publication. **`v0.2.0-alpha.2` is already released** and must never be recreated or retargeted. The proposed next tag is **`v0.2.0-alpha.3`**. Maintainers may run [Actions → Publish GitHub prerelease](https://github.com/aqdas1820/credorewards-engine/actions/workflows/release.yml) on reviewed, merged `main` only after confirming this tag is unused; the workflow validates and packs the candidate, refuses duplicate tags, and **does not publish npm**.

**This workflow does not publish to npm.** npm versions must be published and verified independently. See [release notes](docs/RELEASE-NOTES.md).

## Cloud automation (runs without a local PC)

GitHub Actions and Dependabot provide ongoing scheduled SDK checks and dependency-update PRs. The [cloud automation guide](docs/AUTOMATION.md) explains the six-hour maintenance validation, automatic failure/recovery issue tracking and the independently scheduled development task. The automation does **not** require Windows PowerShell to stay open, and cannot claim guaranteed uninterrupted 24/7 operation.

**Release safety:** no workflow added here automatically publishes npm, retags a GitHub release, changes financial rules or bypasses CI. Unattended npm publication requires a separately configured and security-reviewed npm Trusted Publisher (OIDC), not sharing GitHub or npm credentials in chat.

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
