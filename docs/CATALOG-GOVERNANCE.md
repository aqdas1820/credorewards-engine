# Rule catalog change governance (experimental)

This document describes the catalog governance additions packaged in the **v0.2.0-alpha.2 release candidate**. The last confirmed public npm prerelease remains v0.2.0-alpha.1 until alpha.2 publication is separately completed and verified; do not assume these additions are already in the registry.

The only bundled issuer fixture is examples/fictional-catalog.json, using synthetic draft rules. No actual bank sources, rates, or verified issuer terms are included.

## JSON authoring contract

[schemas/rule-catalog.v1.schema.json](../schemas/rule-catalog.v1.schema.json) is a JSON Schema Draft 2020-12 file for editor integrations and independent standards-compliant JSON Schema validators. It documents known catalog, revision, cashback, evidence and review keys, forbidding unsupported keys in this **authoring schema**. It constrains numeric ranges, shapes and basic dates.

**The JSON Schema file is not proof of issuer verification.** Date regexes alone cannot check leap years, overlaps, distinct IDs, issuer document ownership, or effective-rate truth. Existing runtime `validateRuleCatalog()` performs calendar and cross-revision checks. The offline CLI below calls that runtime validator; **it does not invoke an independent JSON Schema engine or enforce the schema's additionalProperties rules**. External validation consumers should run both validations for the complete contract.

## Offline catalog checks

From repository root:

```bash
npm run validate:catalog
```

This compiles the SDK and checks the checked-in fictional JSON fixture. For your own local JSON files:

```bash
npm run build
node scripts/check-catalog.mjs path/to/a-catalog.json
```

The process returns nonzero for malformed JSON or invalid runtime catalog metadata. It prints **review status declarations**; it cannot independently verify evidence, reviewers, issuer hosts, PDFs, or internet availability. The script never connects to evidence URLs.

## Audit before replacing a catalog snapshot

```ts
import { auditCatalogUpdate } from '@credonomics/rewards-engine';

const report = auditCatalogUpdate(previousCatalog, proposedCatalog);
console.log(report);
```

It validates both snapshots and blocks these otherwise easy-to-miss hazards:

- Removing old revision IDs or changing their terms, issuer, card variant or applicability start without a new revision ID.
- Overwriting or removing prior evidence records, downgrading reviewed status, or rewriting review notes.
- Reopening or moving an already closed effective interval.
- Appending unreviewed evidence to a reviewed revision.

Explicitly allowed transitions are **new** revision IDs, append-only evidence for **draft** revisions, one-time closure of an open-ended effective interval, and a recorded `draft` → `reviewed` promotion with the mandatory reviewer/date and source metadata. The returned arrays report added, closed, promoted, evidence-appended and unchanged revision IDs, sorted for deterministic review.

This is a **comparison of two caller-supplied snapshots**. It does not enforce a signed audit trail, authenticate maintainers, preserve old snapshots on your behalf, or prove that a review happened. Repos/processes integrating this SDK must preserve Git commit history, reviews and source artifacts separately.

## Recommended human verification gate

1. Retrieve exact first-party issuer disclosures through legitimate access and save original document version/date in a controlled archive; never trust a pasted URL as issuer-authenticated evidence.
2. Confirm the card variant, applicable customer terms and all rate/fee/cap exclusions, including tax and effective-date interpretations.
3. Record evidence URL, retrieval date, section/page, reviewer and review date in the catalog. A review flag by itself has no authority.
4. Review the previous/proposed JSON diffs using `auditCatalogUpdate()`, and separately require authorized peer approval of source content and calculations.
5. Add a new revision instead of silently changing previous cashback terms. Close the old interval once, with no overlapping period.
6. Confirm unit tests, offline fixture checks, CI and independent tarball consumer checks before shipping new prereleases.

No real card numbers, payments, financial statements, credentials, private bank documents or unsourced bank-rate claims belong in the public repo.

## Unimplemented

- Human authentication, trusted signoff, signature and content-addressed source archival.
- Actual automated first-party document verification and website crawlers.
- Transaction-day attribution, statement-cycle caps and split-year fee calculations.
- Full JSON Schema validation inside the SDK/CLI; currently only the schema document and runtime structural/domain checks are provided.
