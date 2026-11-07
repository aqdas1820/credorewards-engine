# Offline browser dashboard — experimental demo

The SDK now includes a **local-only** browser interface for testing fictional card comparisons without editing source code. The browser imports the same compiled engine as the CLI; it does not recalculate rewards with a second implementation.

```bash
npm ci --ignore-scripts
npm run demo:web
```

Visit `http://127.0.0.1:4173` in your browser. The command builds the SDK before starting the preview. Set `CREDOREWARDS_DEMO_PORT` to another valid port when necessary. Use Ctrl+C to exit.

- The ranked results table shows card name, rank, cashback, fees and net annual value in rupees. Ties remain tied; the exact SDK audit JSON stays underneath. Card names are displayed as text, never interpreted as HTML.
- Paste or edit JSON containing `year`, two or more `cards`, and `transactions` in **integer paise**; click **Compare cards**.
- The initial scenario uses two completely fictional cards. It is an annual, all-spend-on-one-card comparison and does not import, upload, or authenticate statements or bank data.
- The HTTP server binds exclusively to `127.0.0.1` and only serves the listed dashboard files and built SDK modules. It has no write/upload endpoints, stores no scenarios, and sends a restrictive CSP with `connect-src 'none'` to prevent page-initiated API calls.
- Browser display uses `textContent`, not HTML injection. No external CSS, scripts, fonts, analytics, or network dependencies are required for the dashboard itself.

**Important:** This is a **developer preview, not a publicly hosted production service**. The server assumes a trusted local computer and is not hardened for remote multiuser hosting. Do not expose it to the public Internet or paste PAN, CVV, OTP, real statements or customer data. Neither the synthetic example nor the engine validates issuer terms, computes statement cycles, or guarantees financial recommendations. Annual fee waivers assume complete-year spending.

Before a public service launch, complete threat modeling, issuer-rule verification, deployment isolation, authentication, access logging/privacy assessment, monitoring and security review; see [Production Readiness](PRODUCTION-READINESS.md).
