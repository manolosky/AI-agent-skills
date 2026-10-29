# postcss-selector-parser (npm)

**Tier:** tooling — only stylelint and its plugins parse selectors with it.
**Fix path:** A — the 6.x line got a backport (6.1.5), accepted by every 6.x parent range.

## Advisories

| Advisory | Severity | Vulnerable | Patched | Fix path |
|---|---|---|---|---|
| GHSA-rj75-hqrm-r3gf — quadratic complexity in flat selector parsing (CPU exhaustion) | moderate | < 6.1.5; 7.0.0 – < 7.1.6 | 6.1.5; 7.1.6 | A |

## How it reaches the tree

- `@wordpress/stylelint-config` ≤ 24 → `@stylistic/stylelint-plugin` 3.x → `postcss-selector-parser` ^6.1.2
- `stylelint`, `stylelint-scss`, `@csstools/selector-specificity` → ^7

## Resolution procedure

1. `npm ls postcss-selector-parser --all` — usually two lines: 6.x under `@stylistic/stylelint-plugin` 3.x, 7.x under stylelint.
2. `npm update postcss-selector-parser` — lifts the 6.x copy to 6.1.5 and the 7.x copies to the newest 7.x
   within their ranges.
3. Verify: `npm ls postcss-selector-parser --all` shows only ≥ 6.1.5 (6.x) and ≥ 7.1.6 (7.x).
4. Expected frontend effect: none (tooling) — G4 identical.

The stylelint 16 → 17 migration (`../../migrations/stylelint-17.md`) also removes the 6.x copy, but it is
a linter major with lint fallout: maintenance, not a security fix, now that the backport exists.

## Traps

- The advisory lagged the backport: 6.1.5 was published a week before the advisory listed it, and until
  then `npm audit` and Dependabot reported 6.1.5 as vulnerable (`< 7.1.6`) and offered only the parent
  major. Before any path C, list the vulnerable package's releases in its current major with dates
  (`npm view "<pkg>@^<current major>" version`, `npm view <pkg> time --json`): a recent patch on that line
  may be an unannounced backport — check its changelog or the advisory's latest revision.
- When the advisory's ranges change, Dependabot drops the open alert and recalculates it; the alert can
  vanish from the listing for days.
