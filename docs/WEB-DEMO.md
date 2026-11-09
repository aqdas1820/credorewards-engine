# Offline browser dashboard — experimental demo

The SDK now includes a **local-only** browser interface for testing fictional card comparisons without editing source code. The browser imports the same compiled engine as the CLI; it does not recalculate rewards with a second implementation.

```bash
npm ci --ignore-scripts
npm run demo:web
```

Visit `http://127.0.0.1:4173` in your browser. The command builds the SDK before starting the preview. Set `CREDOREWARDS_DEMO_PORT` to another valid port when necessary. Use Ctrl+C to exit.

- The ranked results table shows card name, rank, cashback, fees and net annual value in rupees. Ties remain tied; the exact SDK audit JSON stays underneath. Card names are displayed as text, never interpreted as HTML.
- Paste or edit JSON containing `year`, two or more `cards`, and `transactions` in **integer paise**; click **Compare cards**. Pasted JSON and the what-if purchase form enforce the same **128 KiB UTF-8** scenario limit as local file imports before parsing.
- The initial scenario uses two completely fictional cards. You can load a local JSON scenario (maximum 128 KiB) using the file picker; parsing and SDK validation happen entirely in your browser, without uploads or network requests. Do not load real banking statements or credentials. It remains an annual, all-spend-on-one-card comparison.
- **What-if purchase form:** enter a synthetic purchase month, category and rupee amount (two decimal places maximum) without editing JSON. The browser converts INR text to integer paise exactly, assigns a non-conflicting transaction ID, and calls the SDK's `comparePurchaseImpact()` twice-per-card ledger analysis. It displays reward on the new transaction, changes to existing rewards (such as shared-cap displacement), annual fee savings, and net annual value change. Card names are rendered as text nodes, not HTML. The existing comparison data is never mutated or uploaded. See [Purchase Impact](PURCHASE-IMPACT.md).
- **Important what-if limitations:** the same full historical spending is assumed independently on every candidate card. This is *not* an allocation among a wallet's cards, a real merchant recommendation or verification of any Indian issuer. Annual-fee impact requires a complete-year scenario and otherwise can be misleading.
- The HTTP server binds exclusively to `127.0.0.1` and only serves the listed dashboard files and built SDK modules. It has no write/upload endpoints, stores no scenarios, and sends a restrictive CSP with `connect-src 'none'` to prevent page-initiated API calls.
- Browser display uses `textContent`, not HTML injection. No external CSS, scripts, fonts, analytics, or network dependencies are required for the dashboard itself.

**Important:** This is a **developer preview, not a publicly hosted production service**. The server assumes a trusted local computer and is not hardened for remote multiuser hosting. Do not expose it to the public Internet or paste PAN, CVV, OTP, real statements or customer data. Neither the synthetic example nor the engine validates issuer terms, computes statement cycles, or guarantees financial recommendations. Annual fee waivers assume complete-year spending.

Before a public service launch, complete threat modeling, issuer-rule verification, deployment isolation, authentication, access logging/privacy assessment, monitoring and security review; see [Production Readiness](PRODUCTION-READINESS.md).
