# wp-coding-standards/wpcs (composer)

**Tier:** composer tooling (`require-dev`) — never ships.
**Fix path:** A or B — update the coding-standards toolchain.

## Advisories

| Advisory | Severity | Vulnerable | Patched | Fix path |
|---|---|---|---|---|
| GHSA-3pwp-g2mj-5p3v — arbitrary code execution | high | >= 0.14.1, < 3.4.1 | 3.4.1 | A / B |

## How it reaches the tree

- `automattic/vipwpcs` → `wp-coding-standards/wpcs` (vipwpcs 3.0.1 requires ^3.1.0, 3.1.0 requires ^3.4.1)

## Resolution procedure

1. Check the pinned vipwpcs's range (`composer show automattic/vipwpcs` → requires). When it accepts
   3.4.1 (vipwpcs 3.0.x does), path A: `composer update wp-coding-standards/wpcs --with-dependencies` —
   together with `squizlabs/php_codesniffer` and `phpcsstandards/phpcsutils` when they are flagged too.
   wpcs 3.4.1 pulls `phpcsstandards/phpcsextra` 1.5.1 with it. Only when the range is too old, bump the
   vipwpcs pin in `require-dev` (path B).
2. `composer install`, then `composer run lint` — new sniffs may report code that needs fixing.
3. Expected frontend effect: none (tooling).
