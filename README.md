# Element Max

[![Windows build](https://github.com/AriesAlex/element-max/actions/workflows/build-element-max-windows.yaml/badge.svg)](https://github.com/AriesAlex/element-max/actions/workflows/build-element-max-windows.yaml)
[![Published](https://img.shields.io/github/release-date/AriesAlex/element-max?label=published)](https://github.com/AriesAlex/element-max/releases/tag/element-max-latest)
[![GitHub Pages](https://img.shields.io/website?url=https%3A%2F%2Fariesalex.github.io%2Felement-max%2F&label=landing)](https://ariesalex.github.io/element-max/)
[![License: AGPL-3.0](https://img.shields.io/badge/license-AGPL--3.0-74f6b8)](LICENSE-AGPL-3.0)

Element Max is a Windows-focused [Element Web](https://github.com/element-hq/element-web) fork for Matrix installations that deliberately use unencrypted rooms and need better screen sharing.

[Download the latest Windows x64 installer](https://github.com/AriesAlex/element-max/releases/download/element-max-latest/Element-Max-Setup.exe)

## What changes

- Arbitrary screen-share width, height, frame rate, and bitrate instead of fixed presets.
- Live display of the resolution, FPS, and bitrate that are actually being sent.
- Windows system-audio capture alongside the shared screen.
- Matrix E2EE is not initialized; encryption setup, device verification, lock badges, and unencrypted-message warnings are removed from the product UI.
- Every active CSS color token can be edited in real time under **Settings → Appearance**, saved as a preset, and imported or exported as JSON.
- The installed app checks this repository's rolling Squirrel feed and offers in-app updates.

> [!WARNING]
> Element Max sends room messages without Matrix end-to-end encryption. Use it only with a homeserver where that is an intentional policy. Use official Element for normal public Matrix accounts.

## Releases

Windows releases are built locally from a clean, pushed `main` with `./scripts/release-element-max.ps1`. The script replaces the three assets in the `element-max-latest` prerelease and dispatches a lightweight Pages workflow for the landing and Squirrel feed. The full GitHub-hosted build remains available as a manual fallback and never runs on pushes or merges.

## Upstream

The fork follows stable Element tags through explicit merge commits. Exact subtree versions, update commands, and verification steps are documented in [UPDATING.md](UPDATING.md).

## Development

Use Node 24 and pnpm 11.20.0. The focused fork build is:

```powershell
pnpm install --frozen-lockfile
Copy-Item apps/desktop/element.max/config.json apps/web/config.json
pnpm --filter element-web build
```

See [AGENTS.md](AGENTS.md) for repository-specific architecture and delivery rules.

## License

Element Max keeps Element's multi-license source files. This public fork is distributed under [AGPL-3.0](LICENSE-AGPL-3.0) or [GPL-3.0](LICENSE-GPL-3.0), subject to the notices in each source file.
