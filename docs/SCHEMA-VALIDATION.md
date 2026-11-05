# Strict catalog schema validation (experimental development feature)

The feature branch adds `validateCatalogJsonSchema(value)` at the package subpath `@credonomics/rewards-engine/catalog-schema-validator` and a new `credorewards-catalog <catalog.json>` CLI.

**Source-only until a subsequent separately approved and publicly verified npm release.** The last verified npm release is `v0.2.0-alpha.2`, which does not include this validator or command.

## What is enforced

The validator reads the **shipped** [rule-catalog.v1.schema.json](../schemas/rule-catalog.v1.schema.json) and evaluates every validation keyword currently present in that schema: types, required fields, unknown properties, numeric bounds, patterns, lengths, enums, constants, array items, local definitions/references, `allOf`, and `if/then` conditions. This includes the reviewed-entry evidence and reviewer metadata requirements. Errors are structured objects with `instancePath` (JSON Pointer), `keyword`, and `message`.

```js
import { validateCatalogJsonSchema } from '@credonomics/rewards-engine/catalog-schema-validator';

const result = validateCatalogJsonSchema(parsedCatalog);
if (!result.valid) console.error(result.errors);
```

**Limit:** This is a purpose-built evaluator of the entire **bundled v1 authoring schema**, **not** a general-purpose JSON Schema Draft 2020-12 processor. Unsupported future schema keywords cause a startup error; arbitrary schemas or remote `$ref` URLs are not supported. There are no network requests or runtime npm dependencies.

## Runtime domain checks are still necessary

Schema patterns alone do not determine whether `2026-02-30` exists or whether two revisions overlap. After `validateCatalogJsonSchema()` succeeds, call `validateRuleCatalog()` to reject invalid Gregorian dates, duplicate revision IDs, overlapping validity windows and cashback-domain errors. The combined CLI runs both checks:

```bash
npm run validate:catalog
# after npm publication in a consumer project:
npx credorewards-catalog path/to/catalog.json
```

The CLI exits nonzero for malformed JSON, invalid schema or invalid domain constraints, and reports which file failed. It does not request remote issuer documents, check bank ownership, perform legal signoff, authenticate a reviewer or assert that supplied rates are genuine.

## Integration security

Validate **untrusted** JSON before using the SDK's typed catalog resolution methods. JSON Schema checks cannot certify issuer facts: source links, `reviewed` flags and retrieval dates are caller-maintained assertions. Financial terms remain fictional unless independently reviewed by a governed process.
