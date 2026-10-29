# Known issues

One row per package: the tested fix, how to verify it, the trap to avoid, and the run that proved it.

- **Lookup (Phase 0):** `grep -i -e "<package>" -e "<GHSA-id>" known-issues.md`. A matching row is applied
  as written — no parent-range checks; a new advisory on a known package uses the same fix. Versions are not
  stored: the alert and the audit give them at run time.
- **Update (Phase 7):** add new advisory ids to their row, one row per new package, rewrite a row only when
  its fix changed, and set Ref to the run's PR URL (the commit URL until the PR exists). No run logs or
  statistics. Ref links are the only place where a repo may be named.

## npm

| Package | Advisories | Tested fix | Verify | Note | Ref |
|---|---|---|---|---|---|
| brace-expansion | GHSA-rgw5-rvv9-x895, GHSA-6j4f-fj2g-mc7p, GHSA-qhr7-859c-m2p7, GHSA-q2hr-2g5m-vwhr | `npm update brace-expansion` | `npm ls brace-expansion --all`: every copy patched | One alert per vulnerable line (1.x via eslint 9 → minimatch 3, 5.x via minimatch 10). An existing `brace-expansion` override is lifted within its own range: leave it. | [fh-law@a8ecacc](https://github.com/content-pilot/fh-law/commit/a8ecacc9be0ad9588c01c47f82527a4dd7aff34f) |
| braces | GHSA-vfj7-8cjw-p6xm (withdrawn) | nothing to apply | `npm audit` no longer lists it | Withdrawn 2026-10-23. A new braces advisory: check for a release above 3.0.3 or a stylelint that drops micromatch. | — |
| colord | GHSA-2wm5-q62r-hmrv | `npm update colord` | `npm ls colord --all` | Takes the newest 2.x (a minor); stylelint's `^2.9.3` accepts it. | [fh-law@a8ecacc](https://github.com/content-pilot/fh-law/commit/a8ecacc9be0ad9588c01c47f82527a4dd7aff34f) |
| elliptic | GHSA-848j-6mx2-7j84 | no patched release: migrate laravel-mix → Vite (`platform-rollout/vite-migration.md`), else residual | `npm ls elliptic --all` hangs from laravel-mix | laravel-mix → node-libs-browser → crypto-browserify. | — |
| fast-uri | GHSA-v2hh-gcrm-f6hx, GHSA-7p8r-x3mc-p8w7, GHSA-5jgf-p345-68v8, GHSA-fph4-wmhf-6fwf, GHSA-f65p-4m7j-42xc, GHSA-jqff-g426-hqxp, GHSA-qw65-cvwx-89v3, GHSA-hrr3-gc8f-f4qj, GHSA-w74x-v6f9-j3xg, GHSA-wjr9-j795-jxcr, GHSA-xhq7-xmqj-769h, GHSA-333x-w4r6-6crp | `npm update fast-uri` | `npm ls fast-uri --all` | Stays on 3.x (ajv 8 requires `^3`); never install 4.x. New advisories arrive every few weeks. | [fh-law@a8ecacc](https://github.com/content-pilot/fh-law/commit/a8ecacc9be0ad9588c01c47f82527a4dd7aff34f) |
| js-yaml | GHSA-2883-xcg3-v3hh | `npm update js-yaml` | `npm ls js-yaml --all` | One deduped copy for eslint's eslintrc and stylelint's cosmiconfig. | [fh-law@a8ecacc](https://github.com/content-pilot/fh-law/commit/a8ecacc9be0ad9588c01c47f82527a4dd7aff34f) |
| nanoid | GHSA-2v37-7h3g-55p8 | `npm update nanoid` | `npm ls nanoid --all` | Build tier through postcss, but the bundle stays identical. Never a later major (postcss 8 needs `^3`). | [fh-law@a8ecacc](https://github.com/content-pilot/fh-law/commit/a8ecacc9be0ad9588c01c47f82527a4dd7aff34f) |
| postcss-selector-parser | GHSA-rj75-hqrm-r3gf | `npm update postcss-selector-parser` | `npm ls postcss-selector-parser --all`: 6.x ≥ 6.1.5, 7.x ≥ 7.1.6 | 6.1.5 is a backport for `@stylistic/stylelint-plugin` 3, so no stylelint major. Before any parent major, look for an unannounced backport on the current line (`npm view "<pkg>@^<major>" version`). | [fh-law@a8ecacc](https://github.com/content-pilot/fh-law/commit/a8ecacc9be0ad9588c01c47f82527a4dd7aff34f) |
| source-map-js | GHSA-68fv-2mgg-jv7q | `npm update source-map-js` | `npm ls source-map-js --all` | Build tier (sass and postcss maps); the bundle stays identical, maps included. | [fh-law@a8ecacc](https://github.com/content-pilot/fh-law/commit/a8ecacc9be0ad9588c01c47f82527a4dd7aff34f) |
| uuid | GHSA-w5hq-g745-h8pq | migrate laravel-mix → Vite, else residual | `npm ls uuid --all` hangs from laravel-mix | laravel-mix 6 → node-notifier / sockjs. | — |
| vite | GHSA-9jrq-w75r-8gcw, GHSA-rq7h-c2jc-7f22, GHSA-698v-4r3x-3vcv, GHSA-r825-w8mm-5pxw, GHSA-587h-7wmj-h5pm, GHSA-vfpm-58rq-9qcg | `npm install -D vite@<patched release of the current minor>` (exact version) | `npm ls vite --all` | `^` would pull the newest minor; vite backports to the previous minor (`npm view "vite@>=<current> <<next major>" version`). It may drop a stale optional `yaml` peer record: harmless. | [fh-law@a8ecacc](https://github.com/content-pilot/fh-law/commit/a8ecacc9be0ad9588c01c47f82527a4dd7aff34f) |
| webpack-dev-server | GHSA-4v9v-hfq4-rm2v, GHSA-9jgg-88mc-972h, GHSA-79cf-xcqc-c78w, GHSA-mx8g-39q3-5c79, GHSA-m28w-2pqf-7qgj, GHSA-f5vj-f2hx-8m93 | migrate laravel-mix → Vite (ask first), else residual | `npm ls webpack-dev-server --all` hangs from laravel-mix | laravel-mix 6.0.49 is final and pins webpack-dev-server 4. | — |
| zod | GHSA-mrhx-c7xc-m3w5 | `npm update zod` | `npm ls zod --all`: one copy | Comes through `@wordpress/eslint-plugin` → eslint-plugin-react-hooks. | [fh-law@a8ecacc](https://github.com/content-pilot/fh-law/commit/a8ecacc9be0ad9588c01c47f82527a4dd7aff34f) |
| stylelint 16 → 17 (migration) | advisories pinned by `@stylistic/stylelint-plugin` 3 | `npm uninstall stylelint @wordpress/stylelint-config && npm install -D stylelint@^17 @wordpress/stylelint-config@^27` (add `stylelint-order` / `@^8` to both when it is on 6.x) | `npm run lint:css` and `sh -c 'npx stylelint <glob>'` clean | Maintenance, not a security fix, since the 6.1.5 backport. Needs Node ≥ 22.13. Autofix twice, only on the flagged files (`page-break-*` → `break-*`, `always` → `page`). Keep the theme's `.stylelintrc` overrides. | — |

## Composer

| Package | Advisories | Tested fix | Verify | Note | Ref |
|---|---|---|---|---|---|
| squizlabs/php_codesniffer | GHSA-hmqg-cxww-wqhq | `composer update squizlabs/php_codesniffer wp-coding-standards/wpcs phpcsstandards/phpcsutils --with-dependencies` (only the flagged ones) | `composer audit --locked`, `composer run lint` | The update also installs `vendor/`; a stale `vendor/` keeps running the old copy. | [fh-law@a8ecacc](https://github.com/content-pilot/fh-law/commit/a8ecacc9be0ad9588c01c47f82527a4dd7aff34f) |
| phpcsstandards/phpcsutils | GHSA-r6hr-vr92-vv28 | same command as php_codesniffer | `composer audit --locked`, `composer run lint` | Usually arrives together with the wpcs and php_codesniffer advisories. | [fh-law@a8ecacc](https://github.com/content-pilot/fh-law/commit/a8ecacc9be0ad9588c01c47f82527a4dd7aff34f) |
| wp-coding-standards/wpcs | GHSA-3pwp-g2mj-5p3v | same command as php_codesniffer | `composer audit --locked`, `composer run lint` | vipwpcs 3.0.x (`^3.1.0`) already allows 3.4.1; bump the vipwpcs pin only when its range is older. It pulls phpcsextra 1.5.1. | [fh-law@a8ecacc](https://github.com/content-pilot/fh-law/commit/a8ecacc9be0ad9588c01c47f82527a4dd7aff34f) |
