# Migration: stylelint 16 → 17 with @wordpress/stylelint-config 25+

**Resolves:** any advisory pinned by `@stylistic/stylelint-plugin` 3.x. It is no
longer needed for `postcss-selector-parser` GHSA-rj75-hqrm-r3gf, which has a 6.x
backport (6.1.5, path A). For that advisory this upgrade is maintenance, not a
security fix.
**Supersedes:** the "stylelint 17 is blocked upstream" note in
`npm-vuln-remediation` — `@wordpress/stylelint-config` 25.0.0 and later
require stylelint ^17.14.1.

## What moves together

| Package | From | To | Why |
|---|---|---|---|
| `@wordpress/stylelint-config` | 24.x | 25+ (27.0.0 at writing) | drops `@stylistic/stylelint-plugin` 3.x |
| `stylelint` | 16.x | ^17.14.1 | peer of the config |
| `stylelint-scss` | 6.x | ^7.2 | peer of the config (auto-installed) |
| `stylelint-order` | 6.x | 8.x | 6.x peers stylelint ≤ 16; **leave an installed 8.x alone** |

Config 27 requires Node ≥ 22.13 — check `.nvmrc` and the CI Node version.

`stylelint-order` 8.1.1+ already peers `^16.18.0 || ^17.0.0`. Reinstalling it
pulls the newest 8.x, and 8.1.2 needs `postcss` ^8.5.28, which drags the
build-tier `postcss` (and `nanoid`) forward for no advisory. Only move it when
it is on 6.x.

## Procedure

1. Confirm the theme's `.stylelintrc` extends `@wordpress/stylelint-config/scss`
   and which plugins it lists (`stylelint-order`). `npm view stylelint-order@<installed> peerDependencies`
   decides whether it joins the swap.
2. Install the set. In place, npm fails with `ERESOLVE … Conflicting peer
   dependency: stylelint@17`, so swap it in two steps — with `stylelint-order` 8.x already installed:
   ```bash
   npm uninstall stylelint @wordpress/stylelint-config
   npm install -D stylelint@^17 @wordpress/stylelint-config@^27
   ```
   With `stylelint-order` 6.x, add it to both commands (`stylelint-order@^8` on install).
   Then `lock-diff.mjs` against the previous step must show the swap in the tooling tier only
   (runtime 0, build 0). About 50 tooling packages move. Config 27 brings `@wordpress/theme` 3.x
   while `@wordpress/eslint-plugin` 25 keeps 2.x, so second copies of several `@wordpress/*`
   packages (compose, element, i18n, hooks…) appear next to the existing ones. They are expected.
   `npm ls --all` may exit 1 both before and after the swap: eslint 10 is an invalid peer for
   `@wordpress/eslint-plugin` 25's babel/import/jsdoc/react plugins, and react 19 for
   `use-memo-one`. Compare the `invalid:` lines before and after; the swap must add none.
3. `npm run lint:css` and expect up to two new kinds of errors, both autofixable. When
   `stylelint-order` 8 was already installed before the swap, the logical-property ordering is
   already enforced and only `property-no-deprecated` appears:
   - `order/properties-alphabetical-order`: stylelint-order 8 treats logical
     properties as shorthands of physical ones, so `padding-inline` /
     `margin-inline` must precede `padding-bottom` / `margin-bottom`.
     Semantically neutral in horizontal writing modes — confirm with
     `grep -rn "writing-mode" <scss dir>` that the theme never switches to a
     vertical one.
   - `property-no-deprecated`: `page-break-inside|after|before` →
     `break-inside|after|before`. `avoid` maps to `avoid`; `always` must
     become `page`.
4. Autofix **twice** (the rename leaves `break-*` out of alphabetical order,
   which the second pass fixes), and only on the files the new rules flagged:
   `npx stylelint <flagged files> --fix`. Prefer this over `npm run format:css`
   when the lint script has an unquoted glob (`stylelint assets/css/**/*.scss`):
   on Windows npm runs scripts through cmd, so stylelint expands `**`
   recursively, while CI's `sh` without globstar treats `**` as `*` (one
   level). `format:css` on Windows can then rewrite pre-existing violations in
   deeper folders CI never lints — scope creep that also changes `dist/`.
   Lint must be clean with the CI-style expansion
   (`sh -c 'npx stylelint assets/css/**/*.scss'`), and the Windows-style run
   must show only the errors already present in the baseline.
5. Review the SCSS diff: only reorderings inside the same rule and the
   `page-break-*` renames.
6. Gates: G4 — the JS is byte-identical and the CSS diff contains only those
   declarations (each `page-break-` → `break-` rename is −5 bytes, so the size
   delta is a quick cross-check); G5 — identical rendering at every viewport
   **and in print** (the renamed properties only act in print; Chromium
   computes `page-break-*` as aliases of `break-*`, so the computed-style
   comparison proves the equivalence).

## Rules not to touch

Keep the theme's existing overrides in `.stylelintrc` (e.g.
`scss/load-no-partial-leading-underscore: null`) — they protect the
platform's file layout.
