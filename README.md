# CredoRewards Engine

[![TypeScript CI](https://github.com/aqdas1820/credorewards-engine/actions/workflows/ci.yml/badge.svg)](https://github.com/aqdas1820/credorewards-engine/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Status: Experimental Alpha](https://img.shields.io/badge/status-experimental%20alpha-amber)](docs/PRODUCTION-READINESS.md)
[![Node.js 20+](https://img.shields.io/badge/Node.js-20%2B-339933)](package.json)

**Explainable credit-card cashback calculations for India-focused fintech developers.**

CredoRewards is a dependency-free TypeScript runtime library for deterministic, integer-paise cashback calculations, auditable card comparisons and hypothetical purchase-impact analysis. It also includes CLI tooling, catalog validation, synthetic examples and a browser demo.

**Maintained by [CredoNomics Investment Solutions](https://credonomics.in)** · [Issues](https://github.com/aqdas1820/credorewards-engine/issues) · [Changelog](CHANGELOG.md) · [Roadmap](docs/ROADMAP.md)

> [!IMPORTANT]
> **Experimental SDK and fictional examples—not a bank integration or financial recommendation service.** No verified issuer rates, MCC inference, bank connectivity or payment credentials are bundled. Actual annual-fee comparisons require **complete-year spending** and independently validated card terms. See [production readiness](docs/PRODUCTION-READINESS.md).

## At a glance

| What is available | What's not available yet |
| --- | --- |
| Cashback rules, minimum spends, exclusions and monthly/annual caps | Verified real-bank rewards catalog and live bank connections |
| Annual fee/waiver modeling and independent multi-card ranking | Real wallet spend allocation or merchant-specific card recommendations |
| Auditable purchase what-if analysis using before/after calculations | Loyalty-point redemption valuation, offers, full issuer statement-cycle math |
| Versioned rule-catalog metadata and validation | General-purpose JSON Schema support and source-authenticated issuer terms |
| Offline CLI, synthetic browser dashboard, automated cross-platform tests | Production-certified service, account storage or customer-data processing |

**Design principles:** deterministic outputs, explicit assumptions, immutable caller inputs, fail-closed validation and integer-paise arithmetic. See [architecture](docs/ARCHITECTURE.md) for component boundaries.

## Quick start

Requires **Node.js 20+** and npm. To run the latest source version without assuming an npm prerelease is publicly available:

```bash
git clone https://github.com/aqdas1820/credorewards-engine.git
cd credorewards-engine
npm ci --ignore-scripts
npm test
npm run demo
```

**SDK example — fictional cashback**

```ts
import { calculateRewards } from '@credonomics/rewards-engine';

const card = {
  id: 'sample-card',
  name: 'Fictional Cashback Card',
  annualFeePaise: 0,
  rules: [{ id: 'groceries', category: 'groceries', rateBps: 500 }]
};

const transactions = [
  { id: 't-001', month: '2026-01', category: 'groceries', amountPaise: 100000 }
];

const result = calculateRewards(card, transactions, 2026);
console.log(result.totalRewardsPaise); // 5000 paise = ₹50.00
```

Money is always represented in **integer paise**. `rateBps: 500` means 5% (500 basis points). The code above is a minimal illustration, **not a full-year personal recommendation**.

For an independently packaged npm consumer, verify the registry version and dist-tags first:

```bash
npm view @credonomics/rewards-engine versions --json
npm dist-tag ls @credonomics/rewards-engine
```

See [npm publishing notes](docs/NPM-PUBLISHING.md) before choosing an experimental package version. Source code on `main` may contain unreleased APIs.

## APIs and tools

| Component | Purpose | Documentation |
| --- | --- | --- |
| `calculateRewards()` | Per-transaction cashback, caps, reasons and net annual value | [Reward rules](docs/RULE-SCHEMA.md) |
| `compareCards()` | Rank candidate cards using **independent** full-year scenarios | [Card comparison](docs/CARD-COMPARISON.md) |
| `comparePurchaseImpact()` | Compare changes caused by one hypothetical additional transaction | [Purchase impact](docs/PURCHASE-IMPACT.md) |
| `createBatchReport()` | Independent scenario reports and calendar-month summaries | [Batch reports](docs/BATCH-REPORTS.md) |
| Rule-catalog APIs | Validate dated revisions, audit updates, resolve annual terms | [Catalog governance](docs/CATALOG-GOVERNANCE.md) |
| `summarizeStatementCycleSpend()` | Assumed statement-cycle **spend grouping only**; no rewards math | [Statement cycles](docs/STATEMENT-CYCLES.md) |
| Three CLI commands | Single-card, catalog and batch workflows | [Examples](examples/) |

The browser dashboard uses the same SDK calculations as the CLI; it is not a second rewards engine.

### Browser demo

```bash
npm run demo:web
```

Open **http://127.0.0.1:4173** for a local synthetic-card comparison, JSON scenario import and hypothetical purchase form. No bank credentials or real customer statements should be entered. A static Vercel deployment is also configured, but access may require Vercel authentication; **deployment success is not proof of public access**.

Learn more: [Browser demo](docs/WEB-DEMO.md) · [Static deployment](docs/STATIC-DEPLOYMENT.md).

### Development checks

```bash
npm run typecheck
npm test
npm run test:package
npm run validate:catalog
npm run build:web
```

PRs are validated by a **five-job Windows/Linux GitHub Actions matrix**, including installed-package smoke tests. Check the [latest CI results](https://github.com/aqdas1820/credorewards-engine/actions/workflows/ci.yml) rather than assuming a green badge verifies a particular commit.

## Architecture

```text
Caller-provided, fictional or independently verified card terms
                            +
              Transaction history (integer paise)
                            |
                            v
            TypeScript validation and rules engine
                            |
             +--------------+---------------+
             |              |               |
       Annual results  Card comparison  Purchase impact
             |              |               |
             +--------------+---------------+
                            |
             CLI / local browser demo / SDK consumer
```

This repository has **no production banking backend**. For directory layout, financial invariants, security boundaries and release architecture, read [Architecture](docs/ARCHITECTURE.md).

## Documentation

| For | Start here |
| --- | --- |
| Developers integrating the SDK | [Architecture](docs/ARCHITECTURE.md), [Card comparison](docs/CARD-COMPARISON.md), [Purchase impact](docs/PURCHASE-IMPACT.md) |
| Catalog authors | [Rule catalog](docs/RULE-CATALOG.md), [Schema validation](docs/SCHEMA-VALIDATION.md), [Governance](docs/CATALOG-GOVERNANCE.md) |
| Contributors | [Contributing](CONTRIBUTING.md), [Code of conduct](CODE_OF_CONDUCT.md), [Security policy](SECURITY.md) |
| Maintainers | [CI and automation](docs/AUTOMATION.md), [Release notes](docs/RELEASE-NOTES.md), [Production readiness](docs/PRODUCTION-READINESS.md) |

## Project status and roadmap

- **Current source package version:** `0.2.0-alpha.3` (see `package.json`).
- **GitHub release:** [`v0.2.0-alpha.3`](https://github.com/aqdas1820/credorewards-engine/releases/tag/v0.2.0-alpha.3) is a **prerelease**. The npm trusted-publishing workflow reported success, but public registry visibility and the `next` tag should be checked independently.
- **Source-only additions:** Some functionality merged after the prerelease is available from the repository but **must not** be assumed to exist in the tagged npm artifact.
- **Upcoming work:** independently verified issuer data, complete billing and points semantics, security review, and a stable compatibility contract. See [roadmap](docs/ROADMAP.md).

**Release verdict:** useful for experimentation, synthetic demos and controlled integration testing; **not approved as a live financial-advice or banking product**.

## Contributing, security and licensing

We welcome [bug reports](https://github.com/aqdas1820/credorewards-engine/issues/new/choose), reproducible synthetic test cases and scoped pull requests. Follow [CONTRIBUTING.md](CONTRIBUTING.md) and keep changes to financial rules reviewable. **Never upload real statements, card numbers, credentials, personal data or unaudited issuer tables.**

Report vulnerabilities **privately** to [support@credonomics.in](mailto:support@credonomics.in), not through public issues. See [SECURITY.md](SECURITY.md).

Original project code is released under the [MIT License](LICENSE). Bank terms, third-party datasets, logos and trademarks are not granted by that license.
