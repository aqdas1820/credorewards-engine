# CredoRewards Engine v0.1.0-alpha.2

Second public alpha release candidate, following `0.1.0-alpha.1`. GitHub prerelease and npm publication are independent actions: verify availability on each channel separately.

## Highlights

- **New: `compareCards(cards, transactions, year)`** ranks two or more fictional or independently verified cashback cards by estimated **net annual value** (rewards minus supplied annual fees).
- Equal-value cards share first place, with deterministic ordering and `leaderCardIds` listing all tied winners.
- Each ranking entry includes the full `calculateRewards` breakdown, fee-waiver result, cap/exclusion reasons and difference from the leader in integer paise.
- The comparison uses the *same complete-year transactions for each card independently*; it does not optimize per-purchase card allocation.

## Quality and distribution

- 29 automated unit tests, including 10 for card comparison.
- npm tarball installation smoke tests for CLI, `calculateRewards` and `compareCards` exports.
- Normalized npm CLI binary path and Git repository metadata.
- Package-test compatibility fixes for npm 12 and inherited `allow-scripts` settings; CI coverage across Windows/Linux and Node 24/26.
- Zero core runtime dependencies.

## Installation

Once the version is available on npm:

```bash
npm install @credonomics/rewards-engine@0.1.0-alpha.2
```

From source:

```bash
npm ci
npm test
npm run test:package
```

Documentation: [Card comparison](docs/CARD-COMPARISON.md) · [npm publishing](docs/NPM-PUBLISHING.md)

## Important limitations

This alpha includes **no real issuer card terms**. Example data is fictional; there are no verified live bank rules. Reward-point valuations, statement-cycle rules, MCC detection, fuel surcharges, merchant offers, GST calculation and per-transaction card allocation are unsupported. Annual-fee calculations assume a complete year of transactions, with applicable taxes already included in supplied fees. Do not treat calculated rankings as financial advice.

For bugs, use synthetic inputs only. Never upload card numbers, account records, financial statements, API keys or authentication credentials.
