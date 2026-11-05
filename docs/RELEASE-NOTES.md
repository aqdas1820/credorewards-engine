# CredoRewards Engine v0.1.0-alpha.1

First public **alpha** of CredoRewards Engine, a transparent TypeScript SDK for fictional credit-card cashback rules.

## Included
- Integer-paise calculations using explicit basis-point cashback rates.
- Category-specific rules with wildcard fallback.
- Monthly and annual reward caps, minimum transaction spend, and exclusions.
- Annual-fee waivers and fee-waiver spend exclusions.
- Explainable per-transaction results, CLI, TypeScript declarations, and tests.
- MIT-licensed source and zero core runtime dependencies.

## Install and try
Download the attached npm-style `.tgz` archive from this GitHub Release or clone the repository.

```bash
npm install
npm test
npm run demo
```

The `@credonomics/rewards-engine` name in `package.json` does **not** mean this package is published on npm.

## Important limitations
**No real issuer terms are included.** The sample card and transactions are fictional. This alpha does not support reward-point valuations, milestone offers, GST computations, fuel surcharges, MCC detection, merchant offers, foreign-exchange fees, or statement-cycle rules. Annual-fee calculations require a complete year of transactions. Do not use this alpha alone for financial decisions.

Found a bug or want to contribute? Please open a GitHub issue with synthetic reproducible inputs. Never upload real card numbers, statements, or other personal financial records.
