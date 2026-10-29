# vite (npm)

**Tier:** build — bundles `dist/`. Its advisories so far affect only the dev server.
**Fix path:** B — patch release within the current minor line, floor raised in `package.json`.

## Advisories

| Advisory | Severity | Vulnerable | Patched | Fix path |
|---|---|---|---|---|
| GHSA-9jrq-w75r-8gcw — cross-origin script execution through custom middleware | low | 7.0.0 – 7.3.6; 8.2.0 – 8.2.3 | 7.3.7; 8.2.4 | B |
| GHSA-rq7h-c2jc-7f22 — files outside `server.fs.allow` served when paths match system paths | moderate | 7.0.0 – 7.3.6; 8.2.0 – 8.2.3 | 7.3.7; 8.2.4 | B |
| GHSA-698v-4r3x-3vcv — launch-editor: `%` not escaped on Windows | moderate | 7.0.0 – 7.3.6; 8.2.0 – 8.2.3 | 7.3.7; 8.2.4 | B |
| GHSA-r825-w8mm-5pxw — launch-editor: editor CLI flag misinterpretation | moderate | 7.0.0 – 7.3.6; 8.2.0 – 8.2.3 | 7.3.7; 8.2.4 | B |
| GHSA-587h-7wmj-h5pm — launch-editor: `fs.existsSync()` check bypass on Windows | high | 7.0.0 – 7.3.6; 8.2.0 – 8.2.3 | 7.3.7; 8.2.4 | B |
| GHSA-vfpm-58rq-9qcg — first 4 bytes of files outside `server.fs` exposed by `?vite-wasm-instance` | moderate | 8.2.0 – 8.2.3 | 8.2.4 | B |

## How it reaches the tree

- Direct devDependency (also a peer, deduped, of `@wordpress/theme`, pulled by `@wordpress/eslint-plugin` and `@wordpress/stylelint-config`).

## Resolution procedure

1. `npm view "vite@>=<current> <<next major>" version` and `npm view vite time --json` — vite backports
   fixes to the previous minor (e.g. 8.2.4 shipped after 8.3.3). Take the patched release of the
   **current minor line** when it exists; a minor bump is only needed when no backport exists.
2. `npm view vite@<current> dependencies` vs `npm view vite@<patched> dependencies` — a backport usually
   declares the same set (rolldown, lightningcss, postcss), so nothing else moves.
3. `npm install -D vite@<patched>` with the **exact** version: npm installs that version and saves
   `^<patched>` (floor raised). Verify with `npm ls vite --all`.
4. Expected frontend effect: none for dev-server fixes, but vite builds `dist/`, so G4 must report the output unchanged (or every hunk explained) and G5 must report identical rendering.

## Traps

- `npm audit` reports these before Dependabot raises them.
- `npm install -D vite@^<patched>` resolves the newest matching release, i.e. the newest **minor**
  (8.2.4 → 8.3.x): an unreviewed minor bump of the bundler. Pass the exact version instead.
- A new vite major is a separate, reviewed task — not part of a security fix.
- Reinstalling vite can drop a stale lockfile record of its optional peer `yaml` 2.x (`"peer": true,
  "optional": true`, nothing depends on it). `lock-diff.mjs` lists it under build as `yaml` losing a
  version; confirm with `npm ls yaml --all` that no package needs 2.x — G4 must still be identical.
