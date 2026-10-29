# webpack-dev-server (npm)

**Tier:** build (dev server only) — comes with laravel-mix.
**Fix path:** C — replace the parent: laravel-mix 6.0.49 is its final release and pins webpack-dev-server 4.

## Advisories

| Advisory | Severity | Vulnerable | Patched | Fix path |
|---|---|---|---|---|
| GHSA-4v9v-hfq4-rm2v — source code stolen via a malicious site | medium | <= 5.2.0 | 5.2.1 | C |
| GHSA-9jgg-88mc-972h — source code stolen with non-Chromium browsers | medium | <= 5.2.0 | 5.2.1 | C |
| GHSA-79cf-xcqc-c78w — cross-origin source exposure on non-HTTPS origins | medium | <= 5.2.3 | 5.2.4 | C |
| GHSA-mx8g-39q3-5c79 — HMR WebSocket interception via permissive proxies | medium | < 5.2.5 | 5.2.5 | C |
| GHSA-m28w-2pqf-7qgj — DoS via malformed Host or Origin header | medium | <= 5.2.5 | 5.2.6 | C |
| GHSA-f5vj-f2hx-8m93 — CSRF via internal developer endpoints | medium | <= 5.2.5 | 5.2.6 | C |

## How it reaches the tree

- `laravel-mix` 6 → `webpack-dev-server` 4

## Resolution procedure

1. Confirm the chain (`npm ls webpack-dev-server --all`) — if it hangs from laravel-mix, there is no in-place fix.
2. Ask whether to migrate the build to Vite (`platform-rollout/vite-migration.md`); the whole laravel-mix tree disappears with it.
3. If the migration is declined: residual (E), documented as laravel-mix's permanent floor (`npm-vuln-remediation`).
4. Expected frontend effect of the migration: the build is rewritten, so G4 and G5 run against the laravel-mix baseline and every difference is resolved before delivery.
