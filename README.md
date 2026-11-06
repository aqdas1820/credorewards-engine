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
- Strict bundled catalog v1 schema validation and multi-scenario monthly batch reports (in the v0.2.0-alpha.3 GitHub prerelease; npm workflow succeeded, registry visibility unverified)
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

The previously independently verified public prerelease is `0.2.0-alpha.2`. GitHub prerelease `v0.2.0-alpha.3` exists and its npm publishing workflow succeeded, but public registry visibility and current dist-tags have not been independently verified. Check `npm view @credonomics/rewards-engine@0.2.0-alpha.3 version` and `npm dist-tag ls @credonomics/rewards-engine` before installing alpha.3.

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

See [BATCH-REPORTS.md](docs/BATCH-REPORTS.md) for batch report semantics, [SCHEMA-VALIDATION.md](docs/SCHEMA-VALIDATION.md) for strict catalog validation, and [RULE-SCHEMA.md](docs/RULE-SCHEMA.md) for cap semantics, [CARD-COMPARISON.md](docs/CARD-COMPARISON.md) for comparisons, [RULE-CATALOG.md](docs/RULE-CATALOG.md) for dated revisions, [CATALOG-GOVERNANCE.md](docs/CATALOG-GOVERNANCE.md) for catalog audit/JSON Schema checks and [ROADMAP.md](docs/ROADMAP.md) for planned work.


## v0.2.0-alpha.3 prerelease

Version `0.2.0-alpha.3` includes `createBatchReport(scenarios)`, the `credorewards-batch` CLI and catalog schema validation. These additions are not available in alpha.2. The [GitHub prerelease](https://github.com/aqdas1820/credorewards-engine/releases/tag/v0.2.0-alpha.3) exists, and the [tokenless npm workflow](https://github.com/aqdas1820/credorewards-engine/actions/runs/42113496665) succeeded with signed provenance. Independently verify registry visibility before claiming public installability.

From a source checkout:

```bash
npm ci
npm test
npm run test:package
npm run validate:catalog
npm run demo:batch
```

The schema evaluator covers every keyword currently used in the shipped catalog schema but does **not** process arbitrary JSON Schema documents. The batch report compares hypothetical cards independently per scenario and does not optimize card spend allocation. See the linked design docs for financial and provenance boundaries.

## npm package status

The previously independently verified npm prerelease was `0.2.0-alpha.2`. The alpha.3 npm publishing workflow succeeded on 2026-11-05 UTC, but registry visibility and the current `next`/`latest` dist-tags have not been independently checked. Check `npm view @credonomics/rewards-engine@0.2.0-alpha.3 version` and `npm dist-tag ls @credonomics/rewards-engine`. Never republish an immutable accepted version. See [npm publishing](docs/NPM-PUBLISHING.md).

## GitHub prerelease

GitHub prereleases are separate from npm publication. [`v0.2.0-alpha.3`](https://github.com/aqdas1820/credorewards-engine/releases/tag/v0.2.0-alpha.3) already exists at commit `41b83e165ac3cfc750cc0a4a79c202ac06b00686`; do not recreate or retarget it. The [GitHub prerelease workflow](https://github.com/aqdas1820/credorewards-engine/actions/workflows/release.yml) validates and packs new candidates.

**The GitHub prerelease workflow does not itself publish npm.** A separate guarded tokenless npm workflow runs downstream. Verify both its result and public registry state. See [release notes](docs/RELEASE-NOTES.md).

## Cloud automation (runs without a local PC)

GitHub Actions and Dependabot provide ongoing scheduled SDK checks and dependency-update PRs. The [cloud automation guide](docs/AUTOMATION.md) explains the six-hour maintenance validation, automatic failure/recovery issue tracking and the independently scheduled development task. The automation does **not** require Windows PowerShell to stay open, and cannot claim guaranteed uninterrupted 24/7 operation.

****Release safety:** The [guarded auto-release pipeline](docs/AUTOMATED-RELEASE.md) produced the alpha.3 prerelease and a successful npm workflow run. Consult live repository settings to determine whether it is currently enabled. [Issue #19](https://github.com/aqdas1820/credorewards-engine/issues/19) tracks an existing-tag no-op that can trigger a failed downstream npm run; strict SHA verification blocked publishing. Security-review workflow changes before merging.

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
