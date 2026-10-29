# colord (npm)

**Tier:** tooling — color parsing inside stylelint's color rules.
**Fix path:** A — stylelint's range accepts the patch.

## Advisories

| Advisory | Severity | Vulnerable | Patched | Fix path |
|---|---|---|---|---|
| GHSA-2wm5-q62r-hmrv — slow rejection of oversized malformed color strings (CPU DoS) | moderate | < 2.9.4 | 2.9.4 | A |

## How it reaches the tree

- `stylelint` (16.x and 17.x) → `colord` 2

## Resolution procedure

1. `npm update colord` — it takes the newest 2.x (a minor such as 2.10.0), which stylelint's `^2.9.3`
   accepts; fine for a tooling package.
2. Verify: `npm ls colord --all` shows only ≥ 2.9.4. The lockfile diff is a single entry.
3. Expected frontend effect: none (tooling) — G4 identical. colord is not a runtime dependency of the
   theme even when its name looks like a color library the CSS could use; `lock-diff.mjs` confirms it.
