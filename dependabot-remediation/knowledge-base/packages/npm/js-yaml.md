# js-yaml (npm)

**Tier:** tooling — YAML config loading inside stylelint's cosmiconfig.
**Fix path:** A — cosmiconfig's range accepts the patch.

## Advisories

| Advisory | Severity | Vulnerable | Patched | Fix path |
|---|---|---|---|---|
| GHSA-2883-xcg3-v3hh — `maxTotalMergeKeys` does not limit CPU use for empty merge sources (DoS) | high | >= 4.0.0, < 4.3.2 | 4.3.2 | A |

## How it reaches the tree

- `stylelint` (16.x and 17.x) → `cosmiconfig` 9 → `js-yaml` 4
- `eslint` 9 → `@eslint/eslintrc` 3 → `js-yaml` 4 (deduped with the copy above)

## Resolution procedure

1. `npm update js-yaml` (then `npm audit fix` if a nested copy remains).
2. Verify: `npm ls js-yaml --all` shows only ≥ 4.3.2. The lockfile diff is a single entry.
3. Expected frontend effect: none (tooling) — G4 identical.

## Traps

- It only parses the project's own config files, so the exposure is nil, but it is a high advisory:
  fix it rather than leaving it as a residual.
