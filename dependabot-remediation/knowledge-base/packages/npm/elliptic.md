# elliptic (npm)

**Tier:** build — webpack 4-era Node polyfills pulled by laravel-mix.
**Fix path:** C by migrating off laravel-mix; E while staying on it (no patched release).

## Advisories

| Advisory | Severity | Vulnerable | Patched | Fix path |
|---|---|---|---|---|
| GHSA-848j-6mx2-7j84 — risky cryptographic primitive implementation | low | <= 6.6.1 | none | C / E |

## How it reaches the tree

- `laravel-mix` → node-libs-browser → crypto-browserify → browserify-sign / create-ecdh → `elliptic`

## Resolution procedure

Same as `webpack-dev-server.md`: migrate the build to Vite, or document it as
part of laravel-mix's permanent residual floor.
