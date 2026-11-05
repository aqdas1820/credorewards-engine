# Roadmap

## v0.1 — current starter
- Pure deterministic TypeScript rules library + CLI
- Reward exclusions, caps and annual fee waivers
- Synthetic test suite and GitHub CI

## v0.2.0-alpha.1 — published prerelease
- Experimental versioned rule-catalog schema, date applicability checks, provenance metadata and explicit draft/reviewed gate
- Year-safe catalog-backed card comparison (refuses mid-year rule changes until period-aware math exists)
- Deterministic net-annual-value comparison across two or more hypothetical cards, with tied rankings and audit details (introduced in v0.1.0-alpha.2)
- Expanded release validation: 47 automated tests and independently installed npm tarball API smoke tests

## v0.2.0-alpha.2 — development proposal (not yet released)
- JSON Schema authoring contract for catalogs; still requires runtime cross-revision validation
- Offline fictional catalog fixture verification in CI and GitHub prerelease workflow
- Audit history transitions: block silent term overwrites, evidence rewrites, period reopenings and review downgrades
- Document explicit first-party issuer verification and peer-review process (no issuer terms automatically verified)

## v0.2 — remaining work after alpha.1
- JSON schema + input validation contract and batch report output
- Statement billing cycles and spend tiers
- Better rate/cap attribution and per-month summaries
- Actual split-year rewards evaluation with explicitly defined cap and fee semantics

## v0.3
- Separately governed human review workflow and actually source-verified issuer datasets (no unverified bank rules)
- Reward points with explicit, dated valuation assumptions
- Source-backed issuer rules as a **separate**, reviewable and dated dataset
- Rules versioning, effective dates and provenance

## v1.0 target
- Stable npm release with defined compatibility guarantees (public alpha already exists)
- Integration examples for web apps and Node.js
- External contributor tests, documentation, security review

## Adoption plan
- 3–5 fintech developer interviews before prioritizing v0.2
- Public issues and clear `good first issue` tasks
- Sample TypeScript/Next.js consumer integration
- Track real package usage, reproducible bug reports and external PRs; no artificial stars
