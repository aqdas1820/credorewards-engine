# Public static demo deployment (not a production financial service)

The hosted demo is a self-contained **static site**. Its only executable components are the compiled SDK in the browser and the human-readable ranking and what-if purchase UI. No server-side banking API, accounts, payments, uploads or transaction storage is deployed.

## Build and inspect

```bash
npm ci --ignore-scripts
npm run build:web
```

`site-dist/` is the **entire** deployable artifact. It contains only `index.html`, four allowlisted browser modules (`app.mjs`, `scoreboard.mjs`, `local-import.mjs`, `purchase-input.mjs`) and six compiled SDK modules (`index.js`, `purchase-impact.js`, `statement-cycles.js`, `batch.js`, `catalog.js`, `catalog-audit.js`). The static build tests verify that the SDK's transitive ESM imports are present, not just listed in a manifest. The offline localhost preview remains available via `npm run demo:web` but its HTTP server must **not** be hosted publicly.

The Vercel settings in `vercel.json` build only those static files and apply restrictive CSP, no-store and anti-framing headers. All input is processed locally in the visitor's browser using integer-paise synthetic examples. This is a non-personalized demonstration, not a recommendation service. A Vercel deployment may be protected by SSO or deployment authentication; a READY build alone does **not** prove anonymous public access.

## Release controls

A preview deployment can be used for technical review. Production promotion/custom domains require tested build checks, privacy/security assessment, explicit release authorization, and verified issuer data before being advertised as a real card recommendation tool. Never silently enable data collection, bank integrations, analytics, or remote APIs. No new npm package version, GitHub release tag or dist-tag is created by this build.
