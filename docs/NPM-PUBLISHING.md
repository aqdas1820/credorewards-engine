# npm prerelease runbook

The public package is [@credonomics/rewards-engine](https://www.npmjs.com/package/@credonomics/rewards-engine). Prior published versions: `0.1.0-alpha.1` and `0.1.0-alpha.2`. The new **candidate** is `0.2.0-alpha.1`; preparing this branch or merging its PR does **not** publish it.

**Do not reuse an npm version or move an existing Git tag.** GitHub prereleases and npm releases are distinct, manually initiated operations. Publishing must be performed by an authorized maintainer from a verified `main` checkout.

## Candidate release gates

1. Review and merge the release-preparation PR **only after CI passes**. Verify `main` is clean and contains the intended release notes.
2. Check the installed build source: `package.json`, root `package-lock.json` and `docs/RELEASE-NOTES.md` must refer to `0.2.0-alpha.1`.
3. Confirm no GitHub release/tag `v0.2.0-alpha.1` already exists. Do not rerun a successful release workflow.
4. Confirm npm `0.2.0-alpha.1` is unused. An immediate `E404` is not sufficient evidence if npm is processing a recently accepted publish.
5. Require a clean local build, TypeScript typecheck, **47 unit tests**, independent CLI/ESM/catalog tarball smoke tests and `npm pack --dry-run`.
6. Keep all fictional rules marked draft. Do not claim official issuer rates, actual reviewer verification, split-year rewards or statement-cycle support.

## Check locally (from the repository, not Windows System32)

```powershell
git pull --ff-only origin main
git status --short
npm ci
npm run typecheck
npm test
npm run test:package
npm pack --dry-run --ignore-scripts
npm pkg get version
npm whoami
```

Expected package version: `0.2.0-alpha.1`. Git status should have no changes. The npm account needs publisher permissions on the `credonomics` organization/package and its configured authentication policy.

## 1. Publish GitHub prerelease (not npm)

1. Inspect [Releases](https://github.com/aqdas1820/credorewards-engine/releases) and check for tag `v0.2.0-alpha.1`.
2. In [Actions → Publish GitHub prerelease](https://github.com/aqdas1820/credorewards-engine/actions/workflows/release.yml), select `main` and **Run workflow** only if unused.
3. Confirm the workflow successfully creates release `v0.2.0-alpha.1` at the intended commit, with `.tgz` asset and the correct release notes.

The workflow checks existing tags/releases before creation and **never publishes to npm**.

## 2. Manually publish npm prerelease

Check the exact registry version and tags before attempting a publish:

```powershell
npm view @credonomics/rewards-engine@0.2.0-alpha.1 version --prefer-online
npm dist-tag ls @credonomics/rewards-engine
```

If the version already exists, **do not publish again**. If `E404`, also review npm package versions and publishing/account status, especially if any publish was recently accepted. Only an authorized maintainer who has verified the version is unused should run:

```powershell
npm publish --access public --tag next
```

The command is an irreversible public release of that exact version. Complete any browser/2FA steps privately; never paste credentials, tokens or OTPs.

## 3. Verify public npm artifact, then public APIs

npm may return a successful publish response while the registry is still processing the package. Do not retry publishing during that interval. Wait for registry availability and verify:

```powershell
npm view @credonomics/rewards-engine@0.2.0-alpha.1 version --prefer-online
npm view @credonomics/rewards-engine@0.2.0-alpha.1 bin --json --prefer-online
npm dist-tag ls @credonomics/rewards-engine
```

Expected `next`: `0.2.0-alpha.1`. Keep `latest` unchanged unless a separate stable-release decision is made.

From a fresh directory outside the repo, install the exact version and verify its exports:

```powershell
$testDir = Join-Path $env:TEMP ("credorewards-public-" + [guid]::NewGuid().ToString("N"))
New-Item -ItemType Directory -Path $testDir | Out-Null
Push-Location $testDir
npm init -y
npm install @credonomics/rewards-engine@0.2.0-alpha.1 --save-exact
node --input-type=module -e "import { calculateRewards, compareCards, validateRuleCatalog, resolveCardTerms, resolveAnnualCardTerms, compareCatalogCards } from '@credonomics/rewards-engine'; console.log([calculateRewards, compareCards, validateRuleCatalog, resolveCardTerms, resolveAnnualCardTerms, compareCatalogCards].every(x => typeof x === 'function'))"
.\node_modules\.bin\credorewards.cmd --help
Pop-Location
```

The export-check command should output `true`. Never claim a new version is publicly available from GitHub success alone.

## Future trusted publishing

Before configuring npm [Trusted Publishers](https://docs.npmjs.com/trusted-publishers/), independently review the exact GitHub owner/repository/workflow filename, npm-side access, `id-token: write`, protected environment approvals, and release trigger. The current GitHub `release.yml` deliberately lacks npm publishing access.

References: [npm scoped public packages](https://docs.npmjs.com/creating-and-publishing-scoped-public-packages/), [npm trusted publishers](https://docs.npmjs.com/trusted-publishers/).
