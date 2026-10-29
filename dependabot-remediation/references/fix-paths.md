# Fix paths, commands and traps

Pick the lowest path that resolves the advisory. Re-run the audit after each
step: one change often resolves several advisories, and later steps may turn
out unnecessary.

## Severity policy

- **High / critical:** must be resolved through paths A–D. Path E only when
  no patched version exists at all, with the user explicitly accepting the
  residual.
- **Low / moderate:** paths A–C. No overrides; when nothing else works, it is
  a documented residual (E).
- Dependabot says `medium` where npm says `moderate` — same level.

## A — Lockfile-only

The parents' ranges already accept the patched version; only the lockfile
moves.

```bash
npm update <pkg>              # re-resolves every copy within existing ranges
npm audit fix                 # then, for nested copies npm update left behind (never --force)
npm ls <pkg> --all            # every copy must be >= patched
composer update <vendor/pkg> --with-dependencies   # composer.json constraints untouched
```

Order matters: `npm update` after `npm audit fix` can undo the fix.

## B — Direct dependency within its major

```bash
npm install -D <pkg>@^<patched>      # raises the floor so a reinstall cannot go back
composer require --dev <vendor/pkg>:<patched>   # keep the repo's constraint style (exact pins vs ranges)
```

## C — Parent major bump (needs approval)

The vulnerable copy is pinned by a parent whose next major is the only fix.

1. Walk the chain up to the direct dependency that pins it.
2. `npm view <parent>@latest dependencies peerDependencies engines` — list
   the whole peer set that has to move together, and check `engines` against
   `.nvmrc` and CI.
3. Ask the user, stating what moves and what may break (configs, lint rules).
4. Install the whole set in one command. If npm answers `ERESOLVE …
   Conflicting peer dependency`, arborist cannot swap a peer set in place:
   `npm uninstall <set>` then `npm install -D <set at new versions>`. The
   rest of the lockfile stays as it was.
5. Repair the fallout (lint autofix with semantic review, see
   `frontend-safety.md`) and record the migration as one row in
   `known-issues.md`.

## D — Override (last resort, high/critical only, needs approval)

Only when A–C cannot work. Scope it to the parent:

```json
"overrides": { "<parent>": { "<pkg>": "^<patched>" } }
```

Justify it in the PR, record it in `known-issues.md`, and remove it as soon
as upstream ships the fix.

## E — Residual

No patched version exists, or every fix breaks the platform. Document in the
PR and `known-issues.md`: the chain, why there is no fix, the exposure in
our context (dev-only? is attacker-controlled input reachable?), and what
would unblock it. Dependabot may already show it as auto-dismissed.

## Known traps

- **Peer-set swap fails with ERESOLVE** → uninstall the set, reinstall it (C.4).
- **Never `rm package-lock.json`** to get a clean resolution: it re-resolves
  every runtime library too.
- **Temporary worktrees:** `npm ci --ignore-scripts`, so `prepare` hooks
  (lefthook install) do not touch the main checkout's git hooks. When the
  worktree is built for a comparison, name its last folder like the theme
  folder (`$SP/wt-base/<theme-folder>`): a bundler `base` derived from the
  folder name otherwise rewrites every asset URL in the CSS.
- **Raised floors and plain `npm install`:** with `"pkg": "^x.y.z"` in
  `package.json` and an older version in the lockfile (typical when another
  branch's lockfile is taken in a merge), `npm install` resolves the newest
  matching **minor**, not `x.y.z`. Re-apply security bumps with the exact
  version (`npm install -D pkg@x.y.z`), replaying the fix's steps on the
  other lockfile instead of merging lockfile hunks by hand.
- **`composer audit` without `vendor/`** prints nothing useful; use
  `--locked` to audit the lockfile itself.
- **Auto-dismissed alerts** are still real advisories; `npm audit` keeps
  reporting them.
- **Raise floors** in `package.json` for direct deps bumped for security.
- **Engines:** a bumped tool may need a newer Node minor than the one
  declared (e.g. `>=22.13`); keep the team's single simple range in
  `engines` and note the real floor in the PR.
- **Linter majors bring new rules:** autofix them, review every autofix
  semantically, and never rename theme files to satisfy a rule (disable the
  rule instead when it fights the platform layout).
- **Two autofix passes:** a rule that renames a property can leave it out of
  order for the ordering rule; run `--fix` again until clean.
