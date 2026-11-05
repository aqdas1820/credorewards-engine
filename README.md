# CredoRewards Engine

**A transparent, deterministic credit-card cashback rules SDK for India's fintech builders.**

Maintained by CredoNomics Investment Solutions · [credonomics.in](https://credonomics.in)

> **Alpha / not published to npm yet.** This starter is not connected to banks or payment networks. All sample card rules are fictional. Do not use the output for financial decisions without independently validating issuer terms and the complete calculation period.

## What this MVP does

- Integer-paise cashback (avoids floating-point currency errors)
- Category-based rewards and wildcard fallback
- Monthly and annual reward caps per rule
- Reward exclusions and minimum transaction amounts
- Annual-fee waivers with separate qualifying-spend exclusions
- Transaction-by-transaction explanations and a net annual value estimate
- Pure TypeScript with **zero runtime dependencies**, CLI, tests and GitHub Actions CI

## What it does **not** do (yet)

Reward point valuations, MCC detection, accelerated tiers, merchant offers, GST calculation, fee reversals, spend thresholds within statement cycles, welcome/milestone benefits, international exchange charges, fuel surcharges, balance and redemption restrictions, or any live bank rules. Fees must be supplied inclusive of relevant taxes. Calculations assume **complete annual spending** for fee-waiver evaluations. Do not treat a partial year as complete.

## Quick start

Requires Node.js 20+ and TypeScript 5.8+ for building.

```bash
npm install
npm test
npm run demo
```

For this generated starter, the commands also work using a globally available `tsc` for building if npm install is not available.

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

See [RULE-SCHEMA.md](docs/RULE-SCHEMA.md) for cap semantics and [ROADMAP.md](docs/ROADMAP.md) for planned work.

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
