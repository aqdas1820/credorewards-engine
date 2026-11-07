## Summary

Explain what changed and why. Link an issue if one exists (`Closes #...`).

## Scope and risk

- **Component(s):**
- **Financial semantics affected?** No / Yes (explain caps, fees, rounding, ranking and required domain review)
- **Public API / compatibility affected?** No / Yes
- **Issuer data / security / privacy / permissions / publishing affected?** No / Yes (explain approval and evidence)

## Verification

- [ ] Changes are focused and include or update deterministic tests as appropriate.
- [ ] `npm run typecheck`
- [ ] `npm test`
- [ ] `npm run test:package`
- [ ] `npm run validate:catalog`
- [ ] Browser or static output reviewed when applicable.
- [ ] Exact PR head SHA passes all required Windows/Linux GitHub CI jobs **before merge** (maintainer gate, not an author claim).

## Review and documentation

- [ ] New behavior and limitations are documented or existing docs are still accurate.
- [ ] Only synthetic test data is included; no bank credentials, real customer statements or unverified issuer rates.
- [ ] Backwards compatibility, invalid-input behavior and integer-paise invariants are considered.
- [ ] No release tags, npm dist-tags, secrets or production security settings were changed without separate authorization.

### Evidence / screenshots (optional)

Attach sanitized output or a fictional UI screenshot if it helps review. Never expose real financial information.
