# brace-expansion (npm)

**Tier:** tooling — glob expansion inside eslint's minimatch.
**Fix path:** A — recurring; minimatch's range has always accepted the patch.

## Advisories

| Advisory | Severity | Vulnerable | Patched | Fix path |
|---|---|---|---|---|
| GHSA-rgw5-rvv9-x895 — DoS via unbounded intermediate arrays | high | >= 4.0.0, < 5.0.9 | 5.0.9 | A |
| GHSA-6j4f-fj2g-mc7p — stack exhaustion via recursion in parseCommaParts | high | < 1.1.19; >= 4.0.0, < 5.0.10 | 1.1.19; 5.0.10 | A |
| GHSA-qhr7-859c-m2p7 — stack exhaustion on nested brace groups | high | < 1.1.20; >= 4.0.0, < 5.0.11 | 1.1.20; 5.0.11 | A |
| GHSA-q2hr-2g5m-vwhr — quadratic-time `{a},b}` rewrite (CPU DoS) | moderate | < 1.1.21; >= 4.0.0, < 5.0.12 | 1.1.21; 5.0.12 | A |

The 1.x line gets backports: each advisory opens one Dependabot alert per vulnerable line in the tree.

## How it reaches the tree

- `eslint` 10 → `minimatch` 10 → `brace-expansion` 5
- `eslint` 9 → `minimatch` 3 → `brace-expansion` 1.x
- `@wordpress/eslint-plugin` → `typescript-eslint` → `@typescript-eslint/typescript-estree` → `minimatch` 10 →
  `brace-expansion` 5
- `@wordpress/eslint-plugin` → `eslint-plugin-import` → `minimatch` 3 → `brace-expansion` (1.x by range;
  5.x when the project carries a `"brace-expansion": "^5.x"` override from an earlier fix — `npm update`
  still lifts it within that override's range, so the override stays untouched)

## Resolution procedure

1. `npm audit fix` (or `npm update brace-expansion`).
2. Verify: `npm ls brace-expansion --all` shows only patched versions — one per line (1.x and 5.x).
3. Expected frontend effect: none (tooling) — G4 identical.

## Traps

- Dependabot may auto-dismiss these alerts (development scope); fix them anyway when `npm audit` reports them.
