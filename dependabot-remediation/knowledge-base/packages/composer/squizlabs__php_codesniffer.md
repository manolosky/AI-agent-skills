# squizlabs/php_codesniffer (composer)

**Tier:** composer tooling (`require-dev`) — never ships.
**Fix path:** A — every coding-standard package accepts the patch.

## Advisories

| Advisory | Severity | Vulnerable | Patched | Fix path |
|---|---|---|---|---|
| GHSA-hmqg-cxww-wqhq — gitblame report command injection via crafted filename | high | < 3.13.6; >= 4.0.0, < 4.0.2 | 3.13.6; 4.0.2 | A |

## How it reaches the tree

- `automattic/vipwpcs`, `phpcompatibility/phpcompatibility-wp`, `dealerdirect/phpcodesniffer-composer-installer` → `squizlabs/php_codesniffer`
- `wp-coding-standards/wpcs`, `phpcsstandards/phpcsextra`, `phpcsstandards/phpcsutils` → `squizlabs/php_codesniffer`

## Resolution procedure

1. `composer update squizlabs/php_codesniffer --with-dependencies`. When `wpcs` and `phpcsutils` are
   flagged too, update the three in one command:
   `composer update squizlabs/php_codesniffer wp-coding-standards/wpcs phpcsstandards/phpcsutils --with-dependencies`.
2. `composer install` so `vendor/` matches the lock — a stale `vendor/` keeps running the old copy.
3. Verify: `composer audit --locked`, then `composer run lint`.
4. Expected frontend effect: none (tooling).
