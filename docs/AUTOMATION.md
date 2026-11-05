# Autonomous maintenance architecture

CredoRewards Engine uses **cloud-hosted, event-triggered CI** instead of relying on anyone's Windows PowerShell staying open. This design provides ongoing coverage, not an uninterrupted always-running machine or guaranteed real-time scheduling.

## Already working

- `.github/workflows/ci.yml`: executes the existing 5-job Linux/Windows, Node 24/26 and npm bundled/12 matrix on repository changes and pull requests. Includes unit tests, packaged consumer API/CLI checks, catalog fixture validation and npm packing.
- `.github/workflows/release.yml`: manually dispatched **GitHub-only** prerelease workflow. It never publishes npm and will not reuse a version tag.
- ChatGPT's separately scheduled CredoRewards Autonomous Development task reviews GitHub activity and works through scoped, reviewable changes when its GitHub connection is available. It is an independent scheduled service, not a repository workflow or local Windows service.

## New automatic cloud tasks

- `.github/workflows/cloud-maintenance.yml` uses GitHub-hosted Ubuntu runners with locked dependencies and no local PC. It runs every **six hours**, at UTC minute 17, and supports manual diagnostic dispatch.
- Each run checks TypeScript, the complete SDK test suite, an independently installed npm package tarball, bundled schema and fictional catalog, synthetic batch structure, npm package contents and high-severity npm audit results.
- On failure, it creates **one** GitHub issue entitled `[automation] Scheduled SDK checks failing`, or comments with subsequent failed run links. On a later successful run, it closes that same issue. It does not publish releases, merge code, set credentials or restart your PC.
- `.github/dependabot.yml` asks GitHub to check npm dependencies daily and GitHub Actions dependencies weekly and create reviewable update PRs. These are **not** automatically merged or published.

## Why there is no permanent Windows connection

This GitHub-hosted system works even if a Windows desktop is shut down. ChatGPT does **not** have an always-on authenticated shell on the owner's Windows installation, access to local files outside uploads, or persistent remote-control permission. To automate a task that specifically requires Windows desktop apps, a dedicated Windows host, self-hosted GitHub runner or managed remote-desktop environment must first be installed and secured separately. That machine must stay online, and its setup must avoid credential sharing.

**Do not** open Windows Remote Desktop to the public internet, disable account security, give a broad personal access token to a chat, or put npm/GitHub credentials in `package.json`, source code or workflow YAML. Prefer GitHub App / short-lived job tokens with least privilege.

## Publishing without a local PowerShell

The recommended future way to remove `npm publish` from the owner's PC is npm **Trusted Publishing** via GitHub Actions OIDC from GitHub-hosted runners. This eliminates permanent npm publishing tokens.

The **npm account owner** must first configure the exact GitHub repository, workflow filename and (if desired) protected GitHub environment as an allowed Trusted Publisher on npmjs.com. This is an account-side security decision and cannot be inferred from repository access. After an explicit release-security review, add a separate workflow with `id-token: write` and a tightly controlled release trigger. Confirm provenance, correct dist-tags, tag immutability, a clean installed consumer, and permission boundaries. Do not combine untrusted PR execution with OIDC publishing credentials.

**Neither this PR nor the newly scheduled ChatGPT task changes the established release gate.** GitHub prerelease tags and npm versions remain intentionally separately authorized. Do not use `latest` for experimental alpha releases.

## Operational limits

- GitHub scheduled events are best-effort: they can be delayed or dropped, and public-repository schedules may be disabled after 60 days without repository activity. These limits prevent promising zero downtime.
- GitHub-hosted runners and scheduled agents incur usage according to provider plans and limits; monitor costs, quota, artifact retention and failure noise.
- A scheduled ChatGPT task can inspect and work with only the connector permissions/environment available to that execution. It is not a standalone always-on machine; verify its delivered task history and created PRs before assuming continuous autonomous development.
- On a safety-critical or breaking change, open a PR and require review. The monitoring workflow never bypasses CI, never alters financial rules or imports actual bank data.

## Operational links

- [Cloud maintenance workflow](https://github.com/aqdas1820/credorewards-engine/actions/workflows/cloud-maintenance.yml)
- [CI workflow](https://github.com/aqdas1820/credorewards-engine/actions/workflows/ci.yml)
- [Repository issues](https://github.com/aqdas1820/credorewards-engine/issues)
- [Dependabot docs](https://docs.github.com/en/code-security/concepts/supply-chain-security/about-the-dependabot-yml-file)
- [npm Trusted Publisher documentation](https://docs.npmjs.com/trusted-publishers/)
