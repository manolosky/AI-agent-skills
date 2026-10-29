# phpcsstandards/phpcsutils (composer)

**Tier:** composer tooling (`require-dev`) — never ships.
**Fix path:** A — every coding-standard package accepts the patch.

## Advisories

| Advisory | Severity | Vulnerable | Patched | Fix path |
|---|---|---|---|---|
| GHSA-r6hr-vr92-vv28 — remote code execution via `eval()` in `AbstractArrayDeclarationSniff::getActualArrayKey()` | high | >= 1.0.0-alpha1, < 1.2.3 | 1.2.3 | A |

## How it reaches the tree

- `automattic/vipwpcs` → `phpcsstandards/phpcsutils` (`^1.0.11`)
- `wp-coding-standards/wpcs`, `phpcsstandards/phpcsextra` → `phpcsstandards/phpcsutils`

## Resolution procedure

1. `composer update phpcsstandards/phpcsutils --with-dependencies` — or, as it usually arrives with
   `wpcs` and `php_codesniffer` advisories, all three in one command:
   `composer update squizlabs/php_codesniffer wp-coding-standards/wpcs phpcsstandards/phpcsutils --with-dependencies`.
   `composer.json` stays untouched.
2. Verify: `composer audit --locked`, then `composer run lint`.
3. Expected frontend effect: none (tooling).
