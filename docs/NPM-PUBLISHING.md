# Publishing CredoRewards Engine to npm (maintainer runbook)

> **Not published to npm as of this documentation update.** The GitHub prerelease and npm registry are separate distribution channels. Do not use the npm installation command in public instructions until npm registry publication has been verified.

## 1. Verify the npm namespace and account

The package name in `package.json` is `@credonomics/rewards-engine`. The `@credonomics` scope must be controlled by an npm user or npm organization named **credonomics**. Ownership of the GitHub repository does not create an npm namespace or grant npm publishing permissions.

- Sign in to [npmjs.com](https://www.npmjs.com/).
- Check whether you already own or belong to an npm organization called `credonomics`, with package publishing rights.
- If that organization doesn't exist and the name is available, create it on npm. If another party owns it, do **not** attempt to publish under their scope. Choose a namespace you legitimately control and update `package.json` and documentation accordingly before publication.
- Enable two-factor authentication (2FA) on your npm account.

Useful checks from the project root:

```bash
npm whoami
npm pkg get name version repository publishConfig
npm run typecheck
npm test
npm pack --dry-run
```

Do not paste npm passwords, one-time 2FA codes, session tokens or access tokens into GitHub issues, chats or repository files.

## 2. Review the alpha package

This version is `0.1.0-alpha.1`. It uses fictional example card rules and does not include real issuer terms. Confirm the packed output contains only the intended `dist/`, `bin/`, README and LICENSE files. Confirm CLI and programmatic imports work and that the CI tests have passed. Do not claim the SDK is production ready.

## 3. First npm publish — only when the scope is verified

If this package **has not previously been published** to npm and your user account has permission to publish under `@credonomics`, an authorized maintainer can use the local authenticated first-publish path:

```bash
npm login
npm whoami
npm ci
npm run typecheck
npm test
npm pack --dry-run
npm publish --access public --tag next
```

The final command **publishes publicly** and requires your explicit decision to run it. It is intentionally **not** run by GitHub CI or our GitHub prerelease workflow. 2FA or an appropriate npm authorization flow may be required.

The package's `publishConfig` defaults the version to public access under the `next` dist-tag; do not move this alpha onto `latest`. An npm package version cannot be reused once published. Use a new version for future changes.

After the publish, verify the package page and registry response, e.g.:

```bash
npm view @credonomics/rewards-engine@0.1.0-alpha.1 version
npm dist-tag ls @credonomics/rewards-engine
```

Only after this works should README installation examples say `npm install @credonomics/rewards-engine@next`.

## 4. Configure tokenless trusted publishing for future versions

After the first successful publication, configure an npm [Trusted Publisher](https://docs.npmjs.com/trusted-publishers/) from the package's npm settings. Match the GitHub identity exactly:

- GitHub account: `aqdas1820`
- Repository: `credorewards-engine`
- Workflow filename: the exact npm publishing workflow filename **once one is deployed** (not `release.yml`, which publishes GitHub prereleases only)

Prefer GitHub-hosted runners, Node.js 24+, npm >=11.5.1, OIDC permission `id-token: write`, and `actions/checkout@v7` / `actions/setup-node@v7`. Restrict token usage and disable dependency caching in a privileged publishing job. Explicitly approve any new workflow that is able to publish externally. Never store long-lived npm write tokens in the repository.

**No npm publishing workflow has been enabled by this runbook.**

Sources:
- https://docs.npmjs.com/creating-and-publishing-scoped-public-packages/
- https://docs.npmjs.com/trusted-publishers/
- https://github.com/actions/setup-node/blob/main/docs/advanced-usage.md
