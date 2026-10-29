---
name: npm-vuln-remediation
description: >
  Remediate npm audit vulnerability findings in WordPress themes built with
  laravel-mix. The input is an initial `npm audit` run, which becomes the
  baseline report the whole process works from. Use when asked to fix npm audit
  vulnerabilities or update vulnerable dependencies in one of these themes.
  Core strategy: replace the monolithic `@wordpress/scripts` with only the
  individual @wordpress/* packages the theme actually consumes (shrinking the
  dependency tree is the fix), then update/remediate WITHOUT `"overrides"` —
  overrides are restricted to a last resort for otherwise-unfixable
  high/critical advisories. Residual vulnerabilities are documented in the
  final report with their provenance (which dependency tree they come from).
  Not for themes whose build actually runs on wp-scripts, plain webpack apps,
  or Tailwind setups without laravel-mix.
---

# npm vulnerability remediation (laravel-mix themes)

Phased, measurable process to take a theme from an initial `npm audit` report
to the **lowest achievable count without `"overrides"`**, keeping the toolchain
green. The input is the baseline `npm audit` captured in Phase 0 — that report
is the source of truth for what needs remediating.

## Purpose and philosophy

1. **Shrink the tree instead of patching it.** The single highest-impact move
   is replacing the monolithic `@wordpress/scripts` (~1,900-package lock) with
   only the individual packages the theme's configs actually consume. Most
   advisories in these themes live in wp-scripts' unused tooling (jest,
   playwright, puppeteer, lighthouse/@sentry/@opentelemetry, markdownlint…);
   removing the tree kills them at the root. Validated on one theme
   (2026-07): 56 → 11 vulnerabilities and 1,899 → 1,171 packages (−38%) with
   zero overrides. Re-validated on another (2026-07): ~1,900 → 1,184
   packages, a 7-entry overrides block removed entirely, 0 high/critical,
   same 11-residual floor.
2. **Overrides are restricted.** The goal is to fix the maximum number of
   issues WITHOUT `"overrides"`. Pins go in as **direct devDependencies** when
   the parent's semver range accepts the pinned version (npm dedupes the tree
   to the direct pin — same effect, no override block to rot). An override is
   allowed ONLY as a last resort for a **high/critical** advisory that cannot
   be resolved any other way, and must be justified in the report. Never add
   overrides for low/moderate residuals.
3. **Residuals are reported, not hidden.** Whatever remains after the cycle is
   listed in the final report with its provenance: which dependency tree it
   comes from, why it has no fix, and why it is acceptable (severity, dev-only,
   build-time only).

## Operating rules

- **Severity policy.** Resolving every **high** and **critical** advisory is
  **mandatory** — the cycle is not done while any remain (a last-resort
  override is acceptable for these, documented). Residual **low** and
  **moderate** advisories are acceptable when they have no override-free fix:
  they go to the report with provenance instead of being overridden away.
- Work on a `fix/<ticket>` branch. **Do NOT commit per phase.** Keep all work
  uncommitted until the user confirms the final state; then a single commit.
  Commit format: `chore: ...`, single line, no AI attribution.
- **Never invent or "upgrade" a version pin from memory.** Every pin below was
  found empirically on a real cycle and every "CVE-clean" claim drifts over
  time. Before applying any pin, confirm the current safe version at run time
  with `npm view <pkg> versions`, the package changelog, and `npm audit`.

## Phase 0 — Baseline (do NOT skip)

First read the `"scripts"` block in `package.json` to learn this theme's real
script names. The commands below assume `build`, `lint:js`, and `lint:css` —
substitute the theme's actual scripts if they differ, and skip any that don't
exist.

```bash
npm audit > audit-baseline.txt   # count + full report
npm run build                    # must pass BEFORE touching anything
npm run lint:js && npm run lint:css
```

If the baseline is already red, fix or note that first; otherwise you cannot
attribute later breakage to your updates. Record the vulnerability count in the
form `N vulnerabilities (X low, Y moderate, Z high, W critical)`.

## Phase 1 — Replace `@wordpress/scripts` with the individual packages

This is the core of the skill. Skip it only if the theme has no
`@wordpress/scripts` (already migrated) — and abort the skill entirely if any
npm script actually runs `wp-scripts` for building (that theme is out of
scope).

1. **Inventory what the theme actually consumes.** Read `eslint.config.*`
   (or `.eslintrc*`), `.stylelintrc*`, `.babelrc`/`webpack.mix.js`, `lefthook`
   config, and the `"scripts"` block. Grep for `@wordpress/` requires/extends.
   The typical set for these themes is only:
   - `@wordpress/eslint-plugin` (eslint flat config rules)
   - `@wordpress/prettier-config` (prettier/prettier rule options)
   - `@wordpress/stylelint-config` (stylelint extends, `/scss` variant)
   - `globals` (jQuery/browser globals in the eslint flat config)
   - `sass` + `sass-loader` — REQUIRED for any theme using `mix.sass()`: both
     came transitively from wp-scripts. If omitted, laravel-mix auto-installs
     them **mid-build** on the first `npm run build` (`npm install --save-dev`
     behind your back), mutating package.json, failing that build, and often
     triggering the corrupted-`.bin` trap below. Add them up front at the
     versions mix expects (`sass-loader` ^12, `sass` latest 1.x).
   A theme may consume more (e.g. `@wordpress/babel-preset-default` if the
   eslint flat config references it in `babelOptions`) — include exactly what
   the configs reference, nothing else.
2. **Swap.** Remove `@wordpress/scripts`; add each consumed package as a direct
   devDependency at its latest version. Verify peers first at run time
   (`npm view <pkg> peerDependencies`) — e.g. `@wordpress/eslint-plugin` peers
   specific eslint and prettier majors, so align those in the same install.
   No lint-config changes should be needed —
   the configs already reference these package names. If the theme still uses
   a legacy `.eslintrc`, migrate to a flat `eslint.config.cjs` using the
   **team's minimal shape** (validated on several themes and adopted as the
   standard, 2026-07). Do NOT spread the full
   flat preset (`...wordpress.configs.recommended`): it drags in
   `eslint-plugin-import` whose typescript resolver needs
   `eslint-import-resolver-typescript` hoisted as a direct devDependency plus
   a `typescript` pin, and fails otherwise with "Resolve error: typescript
   with invalid interface loaded as resolver". The team pattern instead
   registers the plugin and applies only formatting rules — effective lint is
   `prettier/prettier` (with `@wordpress/prettier-config`) + `curly` + jQuery
   globals, scoped to `assets/js/**/*.js`:

   ```js
   const globals = require("globals");
   const prettierPlugin = require("eslint-plugin-prettier");
   const wpPrettierConfig = require("@wordpress/prettier-config");

   module.exports = [
   	{ ignores: [".git/**", ".github/**", ".vscode/**", "build/**",
   		"dist/**", "node_modules/**", "tests/**", "vendor/**"] },
   	{
   		files: ["assets/js/**/*.js"],
   		languageOptions: { globals: { ...globals.jquery } },
   		plugins: { prettier: prettierPlugin },
   		rules: {
   			"prettier/prettier": ["error", wpPrettierConfig],
   			curly: ["error", "all"],
   		},
   	},
   ];
   ```

   This requires `eslint-plugin-prettier` and `@wordpress/prettier-config` as
   direct devDependencies — and NOT `@wordpress/eslint-plugin`: the sibling
   files register that plugin and spread `configs.recommended.rules`, but on
   plugin v25+ `recommended` is a flat array so the spread is a no-op — the
   only effective rules are prettier/prettier and curly (which the siblings
   get from the legacy spread; here it is declared explicitly). Dropping the
   plugin entirely is equivalent lint-wise and removes ~170 packages plus its
   nested minimatch/brace-expansion advisory paths (2026-07:
   1,184 → 1,011 packages, 20 → 16 vulns). Two consequences to expect and
   accept: (a) `@wordpress/prettier-config` 4.x dropped the `wp-prettier`
   fork and its paren-spacing — the current WP style has NO spaces inside
   parens, so the first `format:js` run reformats every theme JS file
   (one-time diff; do not pin the frozen `wp-prettier` fork); (b) rules like
   `no-unused-vars` are no longer active, so `--fix` removes now-unused
   `eslint-disable` directives.
   **Node engines**: after the swap, check the node requirement of the bumped
   tooling (`npm view eslint@<v> engines`) and update the theme's
   `"engines".node` if it falls short. Team convention: declare a **single
   simple range** (e.g. `"node": ">=22"`) — never a multi-version expression
   like `"^20.19.0 || ^22.13.0 || >=24"`, even if that is what the tool
   declares. If the tool's real floor inside a major is stricter than the
   declared range (e.g. eslint 10 supports 22.x only from 22.13), note that
   caveat in the report instead of encoding it in `engines`.
3. **Remove any existing `"overrides"` block** — the new smaller tree gets to
   re-resolve freely; overrides only come back per the last-resort rule.
4. **Clean install**: `rm -rf node_modules package-lock.json && npm install`.
5. Record the new `npm audit` count and verify build + lints. Expect the build
   to fail on the webpack/SizeFormatHelpers trap — fixed in Phase 2 with a
   direct pin, not an override.

## Phase 2 — Direct pins and updates (no overrides)

1. **webpack**: laravel-mix requires `webpack/lib/SizeFormatHelpers`, removed
   in webpack 5.105+. Pin the newest 5.10x that still ships it AND is CVE-clean
   (was `~5.104.1` at last cycle — reverify) as a **direct devDependency**.
   laravel-mix accepts `^5.60`, so npm dedupes the whole tree to the direct
   pin — no override needed.
2. Update every remaining direct dep to the latest patch/minor within its
   current major (`npm outdated`). Risk-check runtime (browser-shipped) jumps
   against changelogs — see "Runtime update traps".
3. `npm update` first, then `npm audit fix` (this order matters: `npm update`
   re-resolves pinned transitives and can UNDO what `npm audit fix` fixed).
4. Verify build + lints. Record the audit count.

## Phase 3 — Major-version bumps for remaining high/critical advisories

If high/critical advisories remain and only clear by moving a **direct**
dependency up a major:

1. Identify them from the current `npm audit`.
2. **Ask before bumping** — present package, current → latest major, and the
   advisories it resolves. Wait for the go-ahead; skip declined ones.
3. Bump approved packages to the newest published major (`npm view <pkg>
   version` at run time — never hard-code), update required peers, repair
   whatever breaks, re-validate, re-run `npm audit fix`.
4. **Last resort only**: if a high/critical still cannot be resolved (parent
   pins it and no major helps), a targeted override is permitted — scoped as
   narrowly as possible (e.g. `"parent": { "dep": "^x.y.z" }`), with the
   justification recorded in the report. This is the ONLY case where an
   override may be added.

## Phase 4 — Residuals report + close

No high or critical advisory may reach this phase unresolved. What remains is
low/moderate with no override-free fix. Do NOT override them — document them:

- For each residual: package, severity, advisory, and **provenance** — the
  dependency chain it hangs from and why it is frozen (e.g. the permanent
  laravel-mix residuals below).
- Expected floor on these themes (all dev-only, build-time):
  - `elliptic` tree (~5 low): elliptic → browserify-sign/create-ecdh →
    crypto-browserify → node-libs-browser → **laravel-mix**. No upstream fix;
    laravel-mix 6.0.49 is the final release ever.
  - laravel-mix's own tooling (~6 moderate): uuid/node-notifier/sockjs/
    webpack-dev-server 4/webpack-notifier → **laravel-mix**. Unfixable without
    overrides; the dev-server never runs in hot mode on these themes.
- Final verification matrix run; record the final `npm audit` count (confirm
  zero high/critical). Present the report; **only after the user confirms,
  make the single final commit**.

## Known traps & pins (verify current-safe versions at run time)

General npm traps:

- **NEVER rename theme source files to satisfy new lint rules.** The theme
  file layout is part of the platform baseline and must not be modified by
  this skill — e.g. the `__index.scss` double-underscore partials (imported
  as `@import "x/_index"`, which sass resolves to `__index.scss`). When a
  bumped linter flags them (stylelint 16's
  `scss/load-no-partial-leading-underscore`, 2026-07), the fix
  is to disable that rule in `.stylelintrc`
  (`"scss/load-no-partial-leading-underscore": null`), NOT to rename files or
  rewrite the imports. Renaming also breaks the sass build resolution chain
  (`x/index` does not resolve to `__index.scss`). Content fixes inside
  existing files (formatting via `--fix`) are fine; file renames are not.
- **Corrupted `node_modules/.bin` after incremental installs** — an
  `npm install --save-dev <pkg>` right after removing a large dependency can
  leave `.bin` shims missing (`npx mix` → "could not determine executable to
  run"; `npx prettier` silently downloading the registry version instead of
  using the local one) even though the package is present. laravel-mix's own
  mid-build dependency auto-install (see `sass` above) is a common trigger.
  Fix: `rm -rf node_modules && npm install` (keep the lock). Confirmed
  (2026-07) exactly as described.

Runtime (browser-shipped) update traps — the general pattern: front-end
libraries can ship breaking HTML/CSS or SASS changes inside a minor bump. Read
the changelog before accepting and confirm compiled output still works:

- **select2** (example) — `4.0.13 → 4.1.0` was a breaking release disguised as
  a minor (broke select2-bootstrap-5-theme). Skipped.
- **tabulator-tables** (example) — minors generally safe, but its SASS was
  overhauled in 6.4; theme `@import`s had to be reverified.

Build-toolchain pins (direct devDependencies, NOT overrides):

- **webpack** — see Phase 2. The pin is possible as a direct dep because
  laravel-mix's own range (`^5.60`) accepts it.

## Verification matrix (every phase)

First discover the theme's actual scripts in `package.json` — never assume.

- `npm audit` — count by severity; save the report per phase.
- `npm run build` (or equivalent) — exit 0, AND compare warning count vs
  baseline.
- `npm run lint:js` and `npm run lint:css` (or equivalents).
- `npx lefthook run pre-commit` after any tooling change, if lefthook exists.
- End of cycle: load the local site and smoke-test the front-end libraries the
  theme actually uses (sliders, selects, video…), or at minimum confirm those
  runtime libs are present in `dist/*.js`.

## Known blockers to NOT attempt

- **stylelint 17 / @wordpress/stylelint-config** — no longer blocked:
  config 25+ peers stylelint ^17.14.1. It is no longer needed for the
  `postcss-selector-parser` advisory pinned by config 24 (6.1.5 backport,
  lockfile-only). As maintenance it is a Phase 3 major (ask first): follow
  the stylelint 17 row in `dependabot-remediation/known-issues.md`.
- **Runtime libs with a breaking major behind a small bump** (e.g. select2
  4.1.0) — separate, QA'd task, not part of a security bump.
- **laravel-mix** — 6.0.49 is the last version ever; migrating off it is a
  separate project and the permanent root of the residual trees documented in
  Phase 4. Accept and document.

## Capture new learnings (improve this skill over time)

This guide covers the cases seen so far — it is not exhaustive. On every run,
stay alert to anything that falls **outside** these instructions: a new trap or
error not documented here, a package the tree-shrink inventory didn't
anticipate, a migration step the guide doesn't cover, a theme whose structure
breaks an assumption, or a pin/peer that behaved differently than described. At
the end of the cycle, briefly note each such learning to the user — what
happened, what resolved it, and where in this skill it would belong — as a
proposed addition. The goal is that the skill keeps improving with use, so
don't silently work around gaps; surface them so they can be folded in.

## Deliverable

A report capturing, per phase: the audit count before/after (by severity),
what was replaced/updated and why, any errors and their fixes, and — centrally
— the **residuals table**: each remaining advisory with severity, the
dependency chain it comes from (provenance), why no override-free fix exists,
and why it is acceptable. If a last-resort override was used for a
high/critical, its justification appears here. Attach the per-phase `npm
audit` reports.
