# npm prerelease runbook

The public package is [@credonomics/rewards-engine](https://www.npmjs.com/package/@credonomics/rewards-engine). The last independently verified public prerelease is **0.2.0-alpha.2**, published under the npm `next` dist-tag, with matching GitHub prerelease. **0.2.0-alpha.3 is a NEW release candidate; preparing or merging this PR does not publish it.** Never republish alpha.2 or reuse its Git tag.

The GitHub prerelease and npm publication are **separate**, deliberately manual release gates. Only an authorized maintainer, after reviewed CI, should initiate them. The GitHub workflow never publishes npm.

## Optional unattended cloud publishing (OFF by default)

A separately reviewed [guarded tokenless release setup](AUTOMATED-RELEASE.md) provides two **disabled-by-default** workflows:

- `auto-github-release.yml` creates a GitHub prerelease only for an unused alpha version on the exact green `main` CI commit.
- `npm-trusted-publish.yml` can then publish the immutable GitHub release tarball to npm under `next` using GitHub-hosted OIDC, **without local PowerShell or long-lived npm credentials**.

They remain inactive until the authorized npm package owner separately configures the exact Trusted Publisher and enables the named GitHub repository variables. Follow the [activation and security guide](AUTOMATED-RELEASE.md); do not claim this account-level authorization happened merely because the workflow files exist. The manual release instructions below remain a fallback. **Never use both release paths for the same GitHub tag or npm version.**

## 1. Release gates for alpha.3

1. Review and merge the alpha.3 release-preparation PR **only if all five CI jobs pass**. This covers Linux and Windows, Node 24/26, bundled npm and npm 12, and the inherited `allow-scripts` regression.
2. Confirm `package.json`, `package-lock.json` (top-level and `packages[""]`) and `docs/RELEASE-NOTES.md` identify **0.2.0-alpha.3**. The npm `publishConfig.tag` must remain `next`.
3. From a clean, updated `main` checkout, require **100 automated tests**, `npm run typecheck`, `npm run test:package`, `npm run validate:catalog`, `npm run demo:batch` and `npm pack --dry-run --ignore-scripts` to pass. Packed-package checks must import the batch SDK API, the strict schema validator subpath, and run all three CLI tools, including rejection of invalid input.
4. Verify `v0.2.0-alpha.3` does **not** exist as a GitHub Release or Git tag. Before npm publication, verify npm `0.2.0-alpha.3` is not published **or staged/processing**. An `E404` immediately after a successful publish is never sufficient to justify retrying.
5. Keep synthetic fixtures clearly fictional. Neither JSON Schema correctness nor a catalog's `reviewed` label authenticates an issuer or makes these hypothetical annual calculations personalized financial advice.

### Local source verification (Windows PowerShell)

```powershell
Set-Location "C:\Users\Aqdas Shaikh\Downloads\credorewards-engine-starter\credorewards-engine"
git pull --ff-only origin main
git status --short
npm ci
npm run typecheck
npm test
npm run test:package
npm run validate:catalog
npm run demo:batch
npm pack --dry-run --ignore-scripts
npm pkg get version
npm whoami
```

Expect a **clean working tree**, package version `0.2.0-alpha.3`, and 100 passing tests. Only publish with the authorized `credonomics` npm account/package privileges. Never paste OTPs, tokens or authentication URLs into issues.

## 2. GitHub prerelease (never npm)

Check GitHub Releases/tags for `v0.2.0-alpha.3`. After merge and local verification, initiate [Publish GitHub prerelease](https://github.com/aqdas1820/credorewards-engine/actions/workflows/release.yml) **once** on branch `main`. With authenticated GitHub CLI:

```powershell
gh workflow run release.yml --repo aqdas1820/credorewards-engine --ref main
```

Verify the workflow succeeds, the new release tag points to the reviewed `main` commit, release notes match `docs/RELEASE-NOTES.md`, and a `.tgz` file is attached. The workflow refuses duplicates. **Do not rerun after success.**

## 3. npm publish (separate authorized action)

Only after a completed GitHub prerelease, check npm:

```powershell
npm view @credonomics/rewards-engine@0.2.0-alpha.3 version --prefer-online
npm dist-tag ls @credonomics/rewards-engine
npm stage list @credonomics/rewards-engine
```

Proceed only if the version is **never previously published** and there is no accepted/staged in-progress publish. A first `E404` before any publishing can be expected. Only the authorized maintainer may run this command **once**:

```powershell
npm publish --access public --tag next
```

Finish browser authentication/2FA privately. A successful accepted response such as `+ @credonomics/rewards-engine@0.2.0-alpha.3` may precede public availability by several minutes. A temporary `E404` or stale `next` tag while processing does **not** mean publishing failed. Never repeat `npm publish` for the staged version, even if a retry would return `E409`.

## 4. Verify public npm installation after processing

```powershell
npm view @credonomics/rewards-engine@0.2.0-alpha.3 version --prefer-online
npm dist-tag ls @credonomics/rewards-engine
npm stage list @credonomics/rewards-engine
```

Only when npm reports `0.2.0-alpha.3`, the `next` tag is `0.2.0-alpha.3`, and the version is no longer staged, create a fresh consumer project:

```powershell
$testDir = Join-Path $env:TEMP ("credorewards-public-" + [guid]::NewGuid().ToString("N"))
New-Item -ItemType Directory -Path $testDir | Out-Null
Push-Location $testDir
npm init -y
npm install @credonomics/rewards-engine@0.2.0-alpha.3 --save-exact
node --input-type=module -e "import * as sdk from '@credonomics/rewards-engine'; const names=['calculateRewards','compareCards','validateRuleCatalog','resolveCardTerms','resolveAnnualCardTerms','compareCatalogCards','auditCatalogUpdate','createBatchReport']; console.log(Object.fromEntries(names.map(name=>[name,typeof sdk[name]])));"
node --input-type=module -e "import {validateCatalogJsonSchema} from '@credonomics/rewards-engine/catalog-schema-validator'; console.log('Strict schema validator:', typeof validateCatalogJsonSchema);"
node -e "const s=require('@credonomics/rewards-engine/schemas/rule-catalog.v1.schema.json'); console.log('Catalog Schema:',s.properties.schemaVersion.const)"
.\node_modules\.bin\credorewards.cmd --help
.\node_modules\.bin\credorewards-batch.cmd --help
.\node_modules\.bin\credorewards-catalog.cmd --help
Pop-Location
```

Expected: eight core SDK function exports, one `validateCatalogJsonSchema` function through the dedicated subpath, schema version `1`, and usage text for all three CLIs. Keep npm `latest` unchanged unless an explicit stable-release decision is separately approved.

## Future publishing improvements

npm Trusted Publishers/OIDC should only be considered after security review of the repository/workflow identity, least-privilege tokens, protected GitHub environments, release gates and npm account permissions. The existing GitHub prerelease workflow intentionally cannot publish to npm.
