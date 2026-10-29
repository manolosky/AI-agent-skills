# uuid (npm)

**Tier:** tooling — laravel-mix's dev tooling (notifier / sockjs).
**Fix path:** C — removed together with laravel-mix.

## Advisories

| Advisory | Severity | Vulnerable | Patched | Fix path |
|---|---|---|---|---|
| GHSA-w5hq-g745-h8pq — missing buffer bounds check in v3/v5/v6 when `buf` is provided | medium | < 11.1.1 | 11.1.1 | C |

## How it reaches the tree

- `laravel-mix` 6 → node-notifier / sockjs → `uuid` (old majors)

## Resolution procedure

Same as `webpack-dev-server.md`: confirm the laravel-mix chain, then migrate
the build or document the residual.
