# npm prerelease runbook

The public package [@credonomics/rewards-engine](https://www.npmjs.com/package/@credonomics/rewards-engine) is independently verified at **`0.2.0-alpha.2` under `next`**. The corresponding [GitHub prerelease](https://github.com/aqdas1820/credorewards-engine/releases/tag/v0.2.0-alpha.2) is also published. The `latest` npm dist-tag still points to `0.1.0-alpha.1`. A fresh installation verified seven SDK exports, catalog JSON Schema v1, the Windows CLI and an npm audit with zero reported vulnerabilities.

**NEVER rerun the GitHub release workflow or npm publish for `0.2.0-alpha.2`.** npm package versions and Git release tags are immutable. The prior release is complete; the steps below apply **only after preparing a NEW version** in a separately reviewed release PR.

## Future release gate (new versions only)

1. Create a feature/release PR, bump `package.json` and both lockfile version fields, update `docs/RELEASE-NOTES.md`, changelog, README and the runbook for the **new, unused** version.
2. Review tests, package metadata, issuer-data boundaries and package contents. Wait for all five Windows/Linux CI matrix jobs to pass, including npm 12 compatibility, TypeScript, unit tests, offline fictional catalog validation and independently installed tarball smoke tests.
3. Merge the approved PR into `main`, check a clean source checkout, and verify the new version's Git tag and npm version are **both unused**. Check npm staged/processing status too; an `E404` immediately after an accepted publish is not permission to republish.
4. Start [Publish GitHub prerelease](https://github.com/aqdas1820/credorewards-engine/actions/workflows/release.yml) **once** on `main` with the approved new version. Confirm its tag points to the intended commit, the run passes and the `.tgz` asset exists. This workflow never publishes npm.
5. The authorized maintainer separately publishes the **new** version to npm under `next` once, completes browser/2FA authentication privately, then verifies public registry availability and a fresh consumer install. Do not alter `latest` during experimental alpha releases.

## Local validation before a new prerelease

From a PowerShell checkout of this repository (not System32):

```powershell
git pull --ff-only origin main
git status --short
npm ci
npm run typecheck
npm test
npm run test:package
npm run validate:catalog
npm pack --dry-run --ignore-scripts
npm pkg get version
npm whoami
```

Confirm a clean working tree and that the version refers to the **new** release candidate. At `0.2.0-alpha.2` there are 66 automated tests, seven JavaScript APIs, a JSON Schema export and the Windows CLI. These counts may change in later releases; do not hardcode them as future guarantees.

## Registry-state and stage checks for a future version

Replace `<NEW_VERSION>` in the following commands with the separately reviewed candidate version; **do not substitute an already published version**:

```powershell
npm view '@credonomics/rewards-engine@<NEW_VERSION>' version --prefer-online
npm dist-tag ls @credonomics/rewards-engine
npm stage list @credonomics/rewards-engine
```

The new candidate must be absent from published versions **and** from pending staging before any publish. A previously successful publish can print `+ @credonomics/rewards-engine@...` while the registry still processes the package; never rerun it during this interval even if `npm view` temporarily returns `E404` or a retry gives `E409`. If and only if a genuinely new release has been approved and its registry state verified, the authorized maintainer may run **once**:

```powershell
npm publish --access public --tag next
```

Complete browser authentication privately. Never paste credentials, account tokens, OTPs or browser login URLs into public issues or release notes. After the version is available, use a new temporary directory to install the exact version, import all documented APIs, check the catalog Schema package subpath and execute the CLI.

## Verified release: v0.2.0-alpha.2

These **read-only** commands recheck the already completed release:

```powershell
npm view @credonomics/rewards-engine@0.2.0-alpha.2 version --prefer-online
npm dist-tag ls @credonomics/rewards-engine
npm stage list @credonomics/rewards-engine
```

Expected from the independently verified publication: `0.2.0-alpha.2`, `next: 0.2.0-alpha.2`, and no staged versions. `latest` remains `0.1.0-alpha.1` until an explicitly approved dist-tag decision.

## Issuer and financial correctness boundary

The SDK bundles fictional draft rules only. Neither `reviewed` metadata, evidence URLs, an exported JSON Schema nor the runtime fixture checker authenticates bank documents, reviewers, actual issuer rates, statement-cycle caps or split-year calculations. Do not claim personalized card recommendations based on these fixtures.

## Future trusted publishing

Before configuring npm [Trusted Publishers](https://docs.npmjs.com/trusted-publishers/), independently review the exact GitHub repository/workflow identity, npm organization/package access, explicit release triggers, `id-token: write` permissions and protected environment approvals. The existing GitHub workflow deliberately has no npm publishing authorization.

References: [npm scoped public packages](https://docs.npmjs.com/creating-and-publishing-scoped-public-packages/) and [npm trusted publishers](https://docs.npmjs.com/trusted-publishers/).
