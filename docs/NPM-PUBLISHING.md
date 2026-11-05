# npm release runbook

The public npm package is [`@credonomics/rewards-engine`](https://www.npmjs.com/package/@credonomics/rewards-engine). Its first published version is `0.1.0-alpha.1`, under the `next` dist-tag. Future releases require an unused version number; **npm package versions cannot be overwritten**.

## Release gates

1. Review the pull request and ensure GitHub CI passes on the candidate commit.
2. Check the expected `package.json` name, version, license, public access, `next` dist-tag and repository URL.
3. Run `npm ci`, `npm run typecheck`, `npm test`, `npm run test:package`, and `npm pack --dry-run`.
4. Check the installed CLI mapping and ESM import from a freshly packed tarball; source-tree tests alone are insufficient.
5. Confirm the release notes document changes and limitations.
6. Confirm the npm account has 2FA, the `credonomics` organization is authorized and the proposed package version is not already present.

## Verify registry state

```bash
npm view @credonomics/rewards-engine@0.1.0-alpha.1 version
npm view @credonomics/rewards-engine@0.1.0-alpha.1 bin --json
npm dist-tag ls @credonomics/rewards-engine
```

A warning like `bin[credorewards] script name bin/credorewards.mjs was invalid and removed` can be an npm normalization diagnostic when a manifest uses `./bin/credorewards.mjs`. **Do not infer that the CLI exists or is missing from the warning alone.** Inspect the published `bin` field and install the exact version into a clean project. The normalized local manifest uses `bin/credorewards.mjs` to avoid ambiguity.

## Subsequent npm releases (manual, until trusted publishing is configured)

Only an authorized maintainer should run the following from the reviewed release commit:

```bash
npm whoami
npm ci
npm run typecheck
npm test
npm run test:package
npm pack --dry-run
npm view @credonomics/rewards-engine@0.1.0-alpha.2 version
# Confirm the proposed version does not exist before continuing.
npm publish --access public --tag next
```

**The last command publishes publicly and is not reversible by reusing the same version.** npm may require browser/2FA authentication. Never share npm credentials, OTPs, personal statements, or tokens in chat or issues. After publishing, verify:

```bash
npm view @credonomics/rewards-engine@0.1.0-alpha.2 version
npm view @credonomics/rewards-engine@0.1.0-alpha.2 bin --json
npm dist-tag ls @credonomics/rewards-engine
```

The GitHub prerelease workflow creates GitHub releases only; it never publishes to the npm registry.

## Future tokenless trusted publishing

Configure an npm [Trusted Publisher](https://docs.npmjs.com/trusted-publishers/) for this existing package, matching the **exact** GitHub owner `aqdas1820`, repository `credorewards-engine`, and a dedicated npm publication workflow filename. Use GitHub-hosted runners, `id-token: write`, and currently supported npm/Node versions. Require protected environments or explicit maintainer approval before granting a workflow publish authority.

Do not enable a new npm publishing workflow before its npm-side trusted publisher settings, GitHub environment permissions and release trigger have been reviewed. The existing `release.yml` is intentionally GitHub-only.

References: https://docs.npmjs.com/creating-and-publishing-scoped-public-packages/ and https://docs.npmjs.com/trusted-publishers/
