# zod (npm)

**Tier:** tooling — schema validation inside eslint-plugin-react-hooks (rule options).
**Fix path:** A — the parents accept any 3.25+ or 4.x release.

## Advisories

| Advisory | Severity | Vulnerable | Patched | Fix path |
|---|---|---|---|---|
| GHSA-mrhx-c7xc-m3w5 — memory exhaustion while validating oversized constrained collections | high | < 4.6.6 | 4.6.6 | A |

## How it reaches the tree

- `@wordpress/eslint-plugin` → `eslint-plugin-react-hooks` 7 → `zod` (`^3.25.0 || ^4.0.0`)
- `eslint-plugin-react-hooks` 7 → `zod-validation-error` 4 → `zod` (same range, deduped)

## Resolution procedure

1. `npm update zod` — moves to the newest 4.x within the parents' range.
2. Verify: `npm ls zod --all` shows a single copy ≥ 4.6.6.
3. Expected frontend effect: none (tooling) — G4 identical.

## Traps

- `npm audit` reports it before Dependabot raises an alert; fix it in the same run.
