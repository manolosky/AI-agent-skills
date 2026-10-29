# Index

Fix paths: A lockfile-only · B direct bump within major · C parent major or
replacement · D override (last resort) · E residual. Details in
`../references/fix-paths.md`.

## npm

| Package | Tier | Advisories | Fix path | Playbook |
|---|---|---|---|---|
| brace-expansion | tooling | GHSA-rgw5-rvv9-x895, GHSA-6j4f-fj2g-mc7p, GHSA-qhr7-859c-m2p7, GHSA-q2hr-2g5m-vwhr | A | [brace-expansion](packages/npm/brace-expansion.md) |
| braces | tooling | GHSA-vfj7-8cjw-p6xm (withdrawn) | — | [braces](packages/npm/braces.md) |
| colord | tooling | GHSA-2wm5-q62r-hmrv | A | [colord](packages/npm/colord.md) |
| elliptic | build | GHSA-848j-6mx2-7j84 | C / E (laravel-mix) | [elliptic](packages/npm/elliptic.md) |
| fast-uri | tooling | GHSA-v2hh-gcrm-f6hx, GHSA-7p8r-x3mc-p8w7, GHSA-5jgf-p345-68v8, GHSA-fph4-wmhf-6fwf, GHSA-f65p-4m7j-42xc, GHSA-jqff-g426-hqxp, GHSA-qw65-cvwx-89v3, GHSA-hrr3-gc8f-f4qj, GHSA-w74x-v6f9-j3xg, GHSA-wjr9-j795-jxcr, GHSA-xhq7-xmqj-769h, GHSA-333x-w4r6-6crp | A | [fast-uri](packages/npm/fast-uri.md) |
| js-yaml | tooling | GHSA-2883-xcg3-v3hh | A | [js-yaml](packages/npm/js-yaml.md) |
| nanoid | build | GHSA-2v37-7h3g-55p8 | A | [nanoid](packages/npm/nanoid.md) |
| postcss-selector-parser | tooling | GHSA-rj75-hqrm-r3gf | A (6.1.5 backport) | [postcss-selector-parser](packages/npm/postcss-selector-parser.md) |
| source-map-js | build | GHSA-68fv-2mgg-jv7q | A | [source-map-js](packages/npm/source-map-js.md) |
| uuid | tooling | GHSA-w5hq-g745-h8pq | C (laravel-mix) | [uuid](packages/npm/uuid.md) |
| vite | build | GHSA-9jrq-w75r-8gcw, GHSA-rq7h-c2jc-7f22, GHSA-698v-4r3x-3vcv, GHSA-r825-w8mm-5pxw, GHSA-587h-7wmj-h5pm, GHSA-vfpm-58rq-9qcg | B | [vite](packages/npm/vite.md) |
| zod | tooling | GHSA-mrhx-c7xc-m3w5 | A | [zod](packages/npm/zod.md) |
| webpack-dev-server | build | GHSA-4v9v-hfq4-rm2v, GHSA-9jgg-88mc-972h, GHSA-79cf-xcqc-c78w, GHSA-mx8g-39q3-5c79, GHSA-m28w-2pqf-7qgj, GHSA-f5vj-f2hx-8m93 | C (laravel-mix) | [webpack-dev-server](packages/npm/webpack-dev-server.md) |

## composer

| Package | Tier | Advisories | Fix path | Playbook |
|---|---|---|---|---|
| phpcsstandards/phpcsutils | tooling | GHSA-r6hr-vr92-vv28 | A | [phpcsutils](packages/composer/phpcsstandards__phpcsutils.md) |
| squizlabs/php_codesniffer | tooling | GHSA-hmqg-cxww-wqhq | A | [php_codesniffer](packages/composer/squizlabs__php_codesniffer.md) |
| wp-coding-standards/wpcs | tooling | GHSA-3pwp-g2mj-5p3v | A / B | [wpcs](packages/composer/wp-coding-standards__wpcs.md) |

## Migrations

| Migration | Resolves | Note |
|---|---|---|
| stylelint 16 → 17, `@wordpress/stylelint-config` 25+ | advisories pinned by `@stylistic/stylelint-plugin` 3.x (maintenance for postcss-selector-parser since 6.1.5) | [stylelint-17](migrations/stylelint-17.md) |
| laravel-mix → Vite | webpack-dev-server, uuid, elliptic | `platform-rollout/vite-migration.md` |
