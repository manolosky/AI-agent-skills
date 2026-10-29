# braces (npm)

**Tier:** tooling — glob expansion inside stylelint.
**Fix path:** none needed — the only advisory was withdrawn.

## Advisories

| Advisory | Severity | Vulnerable | Patched | Fix path |
|---|---|---|---|---|
| GHSA-vfj7-8cjw-p6xm — stack exhaustion through deeply nested brace patterns (**withdrawn** 2026-10-23: "not a practically exploitable vulnerability") | high | <= 3.0.3 | none | — |

## How it reaches the tree

- `stylelint` (16.x through 17.16.0) → `micromatch` 4 → `braces` 3.0.3
- While the advisory was active, `npm audit` also listed every dependent (`fast-glob`, `globby`, `stylelint`
  and each stylelint plugin/config) — about a dozen entries for this single advisory.

## Resolution procedure

1. Nothing to apply: `npm audit` no longer reports the withdrawn advisory, and Dependabot shows it as
   "Withdrawn Advisory" (auto-dismissed). It leaves no residual to document.
2. If a new braces advisory appears, check `npm view braces version` (a release above 3.0.3?) and
   `npm view stylelint@latest dependencies` (micromatch dropped?) to pick the path.
3. Expected frontend effect: none (tooling).

## Traps

- Dependabot auto-dismissed the alert (development scope) before the withdrawal, so it never showed in the
  open list while `npm audit` still reported it.
