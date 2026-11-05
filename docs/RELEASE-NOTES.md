# CredoRewards Engine v0.1.0-alpha.2 (proposed)

This is the **next alpha release candidate**, not yet published. It follows the first npm-published version `0.1.0-alpha.1`.

## Changes
- Normalize the npm CLI binary path so npm publish does not warn about a leading `./`.
- Normalize the Git repository URL in npm package metadata.
- Add a fresh-directory package installation test for both ESM imports and CLI wiring.
- Run the package smoke test in CI and before GitHub prereleases.
- Correct documentation to reflect the existing npm package.

## What remains intentionally unsupported
This alpha uses **fictional** issuer/card rules only. No live bank integration, reward-points conversion, fuel surcharge, milestone awards, GST calculations, merchant-specific offers or statement-cycle caps. Annual-fee calculations require a complete year's transaction data. Do not rely on this alpha alone for financial decisions.

## Install after the npm release is published
```bash
npm install @credonomics/rewards-engine@next
```

For source development:
```bash
npm ci
npm test
npm run test:package
```

Do not disclose real card statements, card numbers, API secrets or financial account records in bug reports.
