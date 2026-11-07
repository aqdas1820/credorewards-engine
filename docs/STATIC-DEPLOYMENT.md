# Public static demo deployment (not a production financial service)

The hosted demo is a self-contained **static site**. Its only executable components are the existing compiled SDK in the browser and the human-readable ranking UI. No server-side banking API, accounts, payments, uploads or transaction storage is deployed.

## Build and inspect

```bash
npm ci --ignore-scripts
npm run build:web
```

`site-dist/` is the **entire** deployable artifact. It contains only `index.html`, the two browser JS modules, and four compiled SDK JS modules required by imports. The offline localhost preview remains available via `npm run demo:web` but its HTTP server must **not** be hosted publicly.

The Vercel settings in `vercel.json` build only those static files and apply restrictive CSP, no-store and anti-framing headers. All input is processed locally in the visitor's browser using integer-paise synthetic examples. This is a public, non-personalized demonstration, not a recommendation service.

## Release controls

A preview deployment can be used for technical review. Production promotion/custom domains require tested build checks, privacy/security assessment, explicit release authorization, and verified issuer data before being advertised as a real card recommendation tool. Never silently enable data collection, bank integrations, analytics, or remote APIs. No new npm package version, GitHub release tag or dist-tag is created by this build.
