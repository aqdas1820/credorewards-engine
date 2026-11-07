# Production readiness status and release preflight

The source tree contains a functioning **experimental SDK**, not a production-certified banking product. The GitHub release `v0.2.0-alpha.3` is a **prerelease**. Do not treat a green build as permission to publish a stable npm version, move npm dist-tags, or advertise verified Indian bank terms.

## Single-command source verification

After `npm ci --ignore-scripts`, run:

```bash
npm run verify:release
```

This command sequentially runs TypeScript typechecking, all Node.js tests, independent packed-and-installed npm package smoke tests, the fictional rule-catalog validator, and an npm dry-run pack with install scripts disabled. The command aborts on the first failure. The existing five-job Windows/Linux GitHub CI matrix remains the authoritative merge gate; this helper does not replace CI or repository protection.

## Release blockers requiring explicit review

- **Real issuer data:** no independently source-verified bank rules, rates or effective-date guarantees. Do not use synthetic fixtures as financial recommendations.
- **Financial semantics:** actual statement billing-cycle allocation, midyear split-rule evaluation, real MCC mapping governance and production reward-point valuations are not implemented or independently reviewed. Any related PR requires financial review.
- **Security and privacy:** no documented production architecture for private cardholder data, access controls, data retention, incident response or threat-model signoff. Avoid importing personal statements, PAN, CVV, credentials and OTPs into public fixtures or issues.
- **Operational readiness:** no production deployment, service uptime/SLO, monitoring or disaster-recovery evidence exists in this SDK repository. A library passing CI is not a deployed service.
- **Publishing authority:** npm/GitHub release and dist-tag changes require separate owner-authorized release gates; never equate `npm pack` with registry publication.

## What is ready

Deterministic synthetic-card calculations and comparisons, calendar-month batch reports, typed SDK exports, offline catalog metadata validation, three CLIs, runnable Node.js example, and existing CI regression coverage. These are suitable for development, demos, evaluation and integration testing with **fictional or externally verified caller-provided** inputs, with alpha compatibility expectations.

**Release decision:** alpha/demo **yes**, production financial-service launch **not yet**. Close and verify the above blockers through reviewable work before claiming otherwise.
