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

## v0.2.0-alpha.2 — published prerelease
- JSON Schema authoring contract for catalogs; still requires runtime cross-revision validation
- Offline fictional catalog fixture verification in CI and GitHub prerelease workflow
- Audit history transitions: block silent term overwrites, evidence rewrites, period reopenings and review downgrades
- Document explicit first-party issuer verification and peer-review process (no issuer terms automatically verified)

## v0.2.0-alpha.3 — GitHub prerelease created; npm publication accepted (2026-11-05 UTC)
- Enforce every validation keyword used by the bundled catalog v1 JSON Schema from a zero-runtime-dependency schema checker and catalog CLI
- Keep calendar, overlapping revision and evidence provenance domain checks separate from schema shape validation
- Produce deterministic batch card-comparison reports with per-calendar-month summaries for multiple independent fictional spending scenarios
- Test both APIs and CLIs via independently installed npm tarballs; publish only as a new alpha.3 version, never over the already-published alpha.2

The guarded cloud release workflow created [GitHub prerelease `v0.2.0-alpha.3`](https://github.com/aqdas1820/credorewards-engine/releases/tag/v0.2.0-alpha.3) from commit `41b83e165ac3cfc750cc0a4a79c202ac06b00686`. The [tokenless npm workflow](https://github.com/aqdas1820/credorewards-engine/actions/runs/42113496665) completed successfully and npm accepted `@credonomics/rewards-engine@0.2.0-alpha.3` with the `next` tag and signed provenance. npm reported that registry processing might take a few minutes; independently confirm registry visibility and the resolved `next` dist-tag before claiming public installability. Never retry publishing this immutable version merely because registry propagation is delayed.

## v0.2 — remaining planned work
- General-purpose JSON Schema Draft 2020-12 compatibility or use of a vetted schema validation dependency (current implementation supports only the bundled schema contract)
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
