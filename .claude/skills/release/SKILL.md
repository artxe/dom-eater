---
name: release
description: Cut a dom-eater release - fold the commits into one version commit, then hand the owner the publish and deprecate commands. Use when the owner asks to release, publish or deprecate a version.
---
# Release

1. `package.json` `version` and the top `## <version>` section of `CHANGELOG.md` name the new version, and the full check passes.
2. The commits since the last version commit fold into one (`git reset --soft <last version commit>`, then commit): `v<version>  - <one-line summary> https://github.com/Artxe/dom-eater/blob/main/CHANGELOG.md#<version without dots>`.
3. Publishing is the owner's unless they ask the session to run it: `pnpm publish` (an `E404` on `PUT` means npm is not logged in: `npm login`), then the version before is deprecated with `npm deprecate dom-eater@<old version> "Not supported: upgrade to <version>."`.
