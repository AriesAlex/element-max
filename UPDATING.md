# Updating Element Max

This private repository keeps a small high-quality screen-sharing patch on top of stable Element Web tags.
`origin` is the private Element Max repository, `upstream` is `https://github.com/element-hq/element-web.git`,
and `element-call-upstream` is `https://github.com/element-hq/element-call.git`.

The current Element base is tag `v1.12.26`, commit `c43ef70b55030287677d884f8a3073808c4301d9`.
The vendored compatible Element Call base is tag `v0.22.0`, commit
`ae7ede32015de04662d0724a4d65b93fc175f65c`.
Its exact vendored Matrix JS SDK base is commit `8c95727b6278fe7942c20d0b9485f984dd0694b7`.

After a fresh clone, configure the public upstream remotes once:

```bash
git remote add upstream https://github.com/element-hq/element-web.git
git remote add element-call-upstream https://github.com/element-hq/element-call.git
git remote add matrix-js-sdk-upstream https://github.com/matrix-org/matrix-js-sdk.git
```

For a stable Element release:

```bash
git fetch upstream --tags
git merge --no-ff <new-stable-tag> -m "chore: merge Element Web <new-stable-tag>"
pushd vendor/matrix-js-sdk
corepack pnpm@11.2.2 install --frozen-lockfile
popd
pushd vendor/element-call
corepack pnpm@11.6.0 install --frozen-lockfile
corepack pnpm@11.6.0 build:full --config vite-embedded.config.js
popd
corepack pnpm@11.20.0 install --frozen-lockfile
corepack pnpm@11.20.0 --dir apps/desktop test:unit --run src/displayMediaCallback.test.ts src/ipc.test.ts
corepack pnpm@11.20.0 --dir apps/desktop lint:types:src
cp apps/desktop/element.max/config.json apps/web/config.json
corepack pnpm@11.20.0 --filter element-web build
git push origin main
```

Never rebase the private branch onto upstream and never force-push it. Keep an explicit two-parent merge
commit so each upstream integration remains auditable.

Do not update Element Call independently just because a newer package exists. First verify that its widget
API and MatrixRTC transport discovery remain compatible with the Element and homeserver versions in use.
When a compatible Element Call update is wanted, merge it as a subtree and then reapply the small quality
patch to the current upstream architecture:

```bash
git fetch element-call-upstream --tags
git subtree pull --prefix vendor/element-call element-call-upstream <compatible-tag> --squash
```

If that compatible Element Call changes its Matrix JS SDK commit, update the exact SDK subtree too:

```bash
git fetch matrix-js-sdk-upstream <compatible-commit>
git subtree pull --prefix vendor/matrix-js-sdk matrix-js-sdk-upstream <compatible-commit> --squash
```

After each update, revise the base tags and commits recorded above, review the complete diff, build the
embedded widget, run the focused desktop and Element Call tests, build the Windows installer, and test an
actual encrypted MatrixRTC screen share with system audio.
