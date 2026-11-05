# Guarded tokenless release automation (disabled by default)

This repository includes two optional **GitHub-hosted** workflows that can remove the need to run `gh workflow run` and `npm publish` from a local Windows PC. They are **deliberately disabled until the package owner completes the one-time security setup**. Merely merging these workflow files does **not** publish anything.

## How the unattended chain works (after activation)

1. The ordinary five-job `TypeScript CI` completes successfully on a **push to main**.
2. If `CREDOREWARDS_AUTO_GITHUB_RELEASE=true`, `.github/workflows/auto-github-release.yml` checks the **exact green CI commit** is still current `main`, verifies that `package.json` is a new alpha prerelease with matching release notes, and checks that the GitHub tag/release is unused. It then reruns the core tests and package smoke before attaching the verified `.tgz` to a new GitHub prerelease. If that version is already released, it skips.
3. If `CREDOREWARDS_AUTO_NPM_PUBLISH=true` **and npm Trusted Publisher is correctly configured**, `.github/workflows/npm-trusted-publish.yml` runs after a successful GitHub prerelease workflow. It validates the release tag, source commit and downloaded tarball package name/version before publishing the exact release asset to npm under `next` using ephemeral OIDC credentials. No npm publishing token or local machine is needed.
4. Both workflows use narrow permissions, GitHub-hosted runners, serialized concurrency and immutable version/tag checks. No workflow advances `latest`, alters issuer data, runs code from an unmerged PR, or accesses a Windows PC.

Note: `workflow_run` uses privileges granted to the triggered workflow. This design checks source repository, event type, main branch, exact SHA, tag and packaged asset and avoids executing downloaded artifact code in the privileged npm job. PR review and repository branch-protection rules remain important. Do not enable unattended release for untrusted contributors.

## One-time configuration the npm package owner must do

**Do not send passwords, personal access tokens, OTPs or private keys to ChatGPT.** The npm account owner must authorize this specific trust relationship themselves.

On [npmjs.com](https://www.npmjs.com/package/@credonomics/rewards-engine) open the package's **Settings → Trusted Publishing → Add trusted publisher** and choose **GitHub Actions**:

| Field | Exact value |
| --- | --- |
| GitHub organization or user | `aqdas1820` |
| Repository | `credorewards-engine` |
| Workflow filename | `npm-trusted-publish.yml` |
| Environment name | Leave blank unless the repository's protected environment is separately configured |
| Allowed actions | Allow **direct npm publish**. Do not grant dist-tag management unless separately needed |

The workflow must exist on default `main` before creating the trust configuration. npm currently requires a new trusted publisher's first successful publish **within two days**; therefore perform this setup shortly before the next real prerelease, not months ahead.

After first reviewing and configuring branch protection and the trust relationship, enable the two repository variables at **Settings → Secrets and variables → Actions → Variables**:

- `CREDOREWARDS_AUTO_GITHUB_RELEASE` = `true`
- `CREDOREWARDS_AUTO_NPM_PUBLISH` = `true`

Both variables are **OFF by default** (unset/any other value). You can deactivate the corresponding workflow simply by setting the variable to `false`—no secrets or tokens need to be revoked for an emergency pause.

If preferred, an already authenticated administrator can set them with GitHub CLI:

```powershell
gh variable set CREDOREWARDS_AUTO_GITHUB_RELEASE --body true --repo aqdas1820/credorewards-engine
gh variable set CREDOREWARDS_AUTO_NPM_PUBLISH --body true --repo aqdas1820/credorewards-engine
```

These are **one-time privileged account configuration actions**. The GitHub connector available to an assistant may not be authorized to change repository variables or configure npm Trusted Publishing; no one should pretend those steps have happened without checking the account settings.

## Activation and first-release verification

- First configure the exact npm trust relationship, then enable the repository flags near a planned **new** alpha release. `0.2.0-alpha.2` is already published and cannot be republished. The currently prepared source candidate is `0.2.0-alpha.3`; independently verify whether it has been published by the time you enable automation.
- Test on the next **approved release version**: merge a reviewed version-bump/release-notes PR after all matrix CI checks pass. The automatic GitHub release job should create a new, unique tag and asset; the npm job should publish to `next`.
- Confirm `npm view`, npm `next` dist-tag, published provenance and fresh installation of all eight SDK APIs, strict schema validator and three CLIs. npm may temporarily process accepted publishes before version lookups become available. Do not rerun publishing for a staged version.
- If a GitHub release already exists from a previous manual workflow but npm was not published yet, the `npm-trusted-publish.yml` workflow also supports **manual workflow_dispatch** with the exact approved version, without recreating the GitHub tag. This must be done by an authorized GitHub operator after confirming the account trust.
- Keep the existing `release.yml` for a deliberate manual emergency fallback. Avoid triggering it in parallel with automatic release: GitHub release jobs share the same concurrency group.

## Why this is not unconditional 24/7 access

GitHub Actions jobs start for triggers; they are not permanent remote-desktop sessions. Schedules can be delayed or deactivated after prolonged inactivity, and accounts may hit quotas. ChatGPT does not gain background Windows shell access or access to npm account settings from these files. The independently scheduled cloud development task can inspect the repository and prepare PRs only when its GitHub connection is available.

Automatic publishing is a security-sensitive change. Before enabling it, confirm repository branch protection, required CI checks, npm Trusted Publisher settings, artifact integrity and access rights. This setup intentionally keeps release permissions switched off until those one-time checks are complete.

Official guidance: [npm Trusted Publishers](https://docs.npmjs.com/trusted-publishers/), [GitHub workflow_run event](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#workflow_run) and [GitHub Actions security](https://docs.github.com/en/actions/reference/security/secure-use).
