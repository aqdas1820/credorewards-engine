# npm prerelease runbook

The public package is [@credonomics/rewards-engine](https://www.npmjs.com/package/@credonomics/rewards-engine). The last verified published prerelease is `0.2.0-alpha.1`. The next **release candidate** is `0.2.0-alpha.2`. This PR and any merge **do not publish the candidate**.

**Version immutability:** Do not publish twice, reuse an npm version or retarget an existing Git tag. The GitHub prerelease workflow and manual npm publish are separate events. Only an authorized maintainer should execute publishing actions on reviewed `main`.

## 1. Release gates — after PR review and merge

1. Require all five Windows/Linux CI matrix jobs to pass, including Node.js 24/26, npm 12, the inherited `allow-scripts` regression, TypeScript checks, all **66 automated tests**, offline catalog validation and packed-package API/schema/CLI smoke tests.
2. Review `package.json`, root `package-lock.json` and `docs/RELEASE-NOTES.md`; all should say `0.2.0-alpha.2`. Keep `publishConfig.tag` at `next`.
3. Check `v0.2.0-alpha.2` is absent from GitHub Releases **and** Git tags. Check `0.2.0-alpha.2` is absent from npm versions, including any recently staged/processing release. An `E404` immediately after a successful publish does **not** mean it is safe to publish again.
4. Do not claim official bank rates or real issuer verification: fictional catalog fixtures are still draft, evidence URLs are metadata, and the schema CLI does not execute a full JSON Schema validator.

From the existing repository working directory on Windows:

```powershell
Set-Location "C:\Users\Aqdas Shaikh\Downloads\credorewards-engine-starter\credorewards-engine"
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

Expect: no uncommitted changes, version `0.2.0-alpha.2`, 66 tests passing, packaged JSON Schema and `auditCatalogUpdate` import passing. Confirm the logged-in account has permission to publish the scoped package and that 2FA/browser authentication works privately.

## 2. Publish the GitHub prerelease (never npm)

First confirm no release or tag `v0.2.0-alpha.2` exists.

In [Actions → Publish GitHub prerelease](https://github.com/aqdas1820/credorewards-engine/actions/workflows/release.yml), choose `main` and select **Run workflow**, only after branch review/merge and local checks. Confirm a successful run creates `v0.2.0-alpha.2` at the reviewed commit, an installable `.tgz` artifact and this version's release notes.

The workflow refuses to overwrite existing tags/releases and **does not publish to npm**. Do not rerun it after a successful release.

## 3. Manually publish to npm under `next`

Before publishing, inspect current registry state:

```powershell
npm view @credonomics/rewards-engine@0.2.0-alpha.2 version --prefer-online
npm dist-tag ls @credonomics/rewards-engine
npm stage list @credonomics/rewards-engine
```

The new version must not be published or pending in npm staging. If it already exists (or a prior publish was accepted and is processing), **stop**.

Only an authorized maintainer who has confirmed the version is unused should run **once**:

```powershell
npm publish --access public --tag next
```

A successful accepted publish may print `+ @credonomics/rewards-engine@0.2.0-alpha.2` while the registry still processes the version. Subsequent `E404` on `npm view` or `E409` when attempting an accidental republish does **not** authorize a new attempt. Never retry `npm publish` while processing; confirm registry status instead. Do not reveal credentials, tokens, OTPs or browser-login links in issues.

## 4. Confirm registry availability and fresh public installation

When the registry has finished processing:

```powershell
npm view @credonomics/rewards-engine@0.2.0-alpha.2 version --prefer-online
npm view @credonomics/rewards-engine@0.2.0-alpha.2 bin --json --prefer-online
npm dist-tag ls @credonomics/rewards-engine
npm stage list @credonomics/rewards-engine
```

Expected `next` is `0.2.0-alpha.2`. **Do not change `latest`** as part of this prerelease.

Test an independently installed public package in a fresh temporary directory:

```powershell
$testDir = Join-Path $env:TEMP ("credorewards-public-" + [guid]::NewGuid().ToString("N"))
New-Item -ItemType Directory -Path $testDir | Out-Null
Push-Location $testDir
npm init -y
npm install @credonomics/rewards-engine@0.2.0-alpha.2 --save-exact
node --input-type=module -e "import * as sdk from '@credonomics/rewards-engine'; const keys=['calculateRewards','compareCards','validateRuleCatalog','resolveCardTerms','resolveAnnualCardTerms','compareCatalogCards','auditCatalogUpdate']; console.log(Object.fromEntries(keys.map(k=>[k,typeof sdk[k]])));"
node -e "const s=require('@credonomics/rewards-engine/schemas/rule-catalog.v1.schema.json'); console.log(s.properties.schemaVersion.const)"
.\node_modules\.bin\credorewards.cmd --help
Pop-Location
```

All seven JavaScript API entries should say `function`, schema version should print `1`, and the CLI should print its usage. If the registry takes time to show the new package, repeat **read-only verification commands**, not `npm publish`.

## Future tokenless trusted publishing

Before enabling an npm [Trusted Publisher](https://docs.npmjs.com/trusted-publishers/) verify the exact `aqdas1820/credorewards-engine` repository/workflow identity, npm organization permissions, explicit release triggers, runner identity and GitHub environment approvals. The current `release.yml` is intentionally **GitHub-only**.

References: [npm scoped public packages](https://docs.npmjs.com/creating-and-publishing-scoped-public-packages/) and [npm trusted publishers](https://docs.npmjs.com/trusted-publishers/).
