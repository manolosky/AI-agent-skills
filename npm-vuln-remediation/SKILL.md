---
name: npm-vuln-remediation
description: >
  Remediate npm audit vulnerability findings in WordPress themes built with
  laravel-mix + @wordpress/scripts. The input is an initial `npm
  audit` run, which becomes the baseline report the whole process works from.
  Use when asked to fix npm audit vulnerabilities or update vulnerable
  dependencies in one of these themes. Runs a phased process — baseline, direct
  updates, npm update + audit fix, latest-major bumps for any package still
  carrying high-risk advisories (update, validate, repair, re-validate — e.g.
  @wordpress/scripts + its ESLint flat-config migration), and targeted
  overrides — verifying build and lints stay green after every step. Not for
  plain webpack apps or Tailwind setups without laravel-mix + @wordpress/scripts.
---

# npm vulnerability remediation (laravel-mix + @wordpress/scripts themes)

Phased, measurable process to take a theme from an initial `npm audit` report
to a clean (or residual-documented) `npm audit`, keeping the toolchain green.
The input is the baseline `npm audit` captured in Phase 0 — that report is the
source of truth for what needs remediating.

## Operating rules

- **Severity policy.** Resolving every **high** and **critical** advisory is
  **mandatory** — the cycle is not done while any remain. Residual **low** and
  **moderate** advisories are **acceptable**: fix them when cheap and safe, but
  they may be documented and accepted rather than chased (especially when the
  only fix is a breaking change to unused/dev-only code).
- Work on a `fix/<ticket>` branch. **Do NOT commit per phase.** Keep all work
  uncommitted while progressing through the phases. Make a **single commit only
  at the very end**, after the user has reviewed and confirmed that everything is
  fixed and working (clean audit of high/critical, green build + lints, site OK).
  Commit format: `chore: ...`, single line, no AI attribution.
- **Never invent or "upgrade" a version pin from memory.** Every pin below was
  found empirically on a real cycle and every "CVE-clean" claim drifts over
  time. Before applying any pin, confirm the current safe version at run time
  with `npm view <pkg> versions`, the package changelog, and `npm audit`.
  Treat the pins in this skill as *starting points and known traps*, not as
  eternally-correct values.

## Phase 0 — Baseline (do NOT skip)

First read the `"scripts"` block in `package.json` to learn this theme's real
script names. The commands below assume `build`, `lint:js`, and `lint:css`
(Bracewell / ~80% of sites) — substitute the theme's actual build/lint scripts
if they differ, and skip any that don't exist.

```bash
npm audit > audit-baseline.txt   # count + full report
npm run build                    # must pass BEFORE touching anything
npm run lint:js && npm run lint:css
```

If the baseline is already red, fix or note that first; otherwise you cannot
attribute later breakage to your updates. Record the vulnerability count in the
form `N vulnerabilities (X low, Y moderate, Z high, W critical)`.

## Phase 1 — Direct minors, then `npm update`, then `npm audit fix`

**Ordering lesson (the single most important rule here):** `npm update`
re-resolves pinned transitive deps and can UNDO what `npm audit fix` fixed.
Always run `npm update` first and `npm audit fix` last.

1. Inventory: `npm outdated`, plus `npm view <pkg>@<major> version` for
   exact-pinned deps. Update every direct dep to the latest patch/minor
   **within its current major**.
2. Risk-check each runtime (browser-shipped) jump against its changelog before
   accepting it — whatever front-end libraries this specific theme ships. A
   minor bump can hide breaking HTML/CSS or SASS changes. See "Runtime update
   traps" for the general pattern and example libraries.
3. `npm update` to refresh ranged transitives, then `npm audit fix`.
4. Verify build + lints. Add any required pins to `"overrides"` in
   package.json (see "Known traps & pins").
5. Leave changes uncommitted (final commit happens at the end — see Operating
   rules).

## Phase 2 — Overrides for in-tree-unfixable advisories

`npm audit` claims "fix available" for some packages it cannot actually move
because parents pin exact/older ranges. Apply overrides for these (all in
dev-only trees). Use the versions `npm audit fix` itself selects where
possible, and re-verify each against current advisories — see "Known traps &
pins" for the recurring set.

Verify build + lints (do not commit yet).

## Phase 3 — Major-version bumps for packages with remaining high-risk advisories

After Phases 1–2, some high/critical advisories only clear by moving a package
up a MAJOR version — a breaking jump `npm audit fix` will not make on its own.
Handle **every** such package, not just `@wordpress/scripts`, with the same
repeatable loop:

1. **Identify.** From the current `npm audit`, list the packages whose remaining
   advisories are high/critical and whose only available fix is a new major.
   Include direct deps and dev tooling alike (build, lint, test).
2. **Ask before bumping.** A major is a breaking change, so do NOT apply it
   automatically. For each candidate, present to the user: the package, the
   current → latest major version, and the specific advisories/errors that major
   resolves (CVE IDs / advisory titles + severity from the audit). Wait for the
   user's go-ahead before proceeding, and skip any the user declines.
3. **Update to the latest major.** For approved packages, bump each to its newest
   published major — `npm view <pkg> version` for the current latest. Do NOT pin
   to a fixed number from this document; "latest" moves over time, and
   hard-coding a version would leave the theme stuck on an old one. Also update
   the peer deps the new major requires.
4. **Validate.** `npm run build`, `npm run lint:js`, and `npm run lint:css` must
   all pass; compare build warnings vs the Phase 0 baseline.
5. **Repair.** Fix whatever the major broke — config migrations, renamed APIs,
   new peer deps, new lint defaults (see the worked example below for the kind of
   breakage to expect).
6. **Re-validate + audit.** Re-run build + both lints (and `npx lefthook run
   pre-commit`) until green, then `npm audit fix` again — the new tree often
   unlocks more fixes.

Do this **per package** (or per coherent group), validating after each so any
breakage is attributable to a specific bump. Do not commit between packages —
everything lands in the single final commit.

### Worked example — `@wordpress/scripts` to its latest major (ESLint flat config)

Relevant when the theme still uses a legacy `.eslintrc`. Recent wp-scripts majors
require a modern ESLint with flat config, which makes this the most involved case
of the loop above.

1. Bump `@wordpress/scripts` to its **latest** major and `eslint` to the version
   that major peers on. Read the current values from `npm view @wordpress/scripts
   version` and the wp-scripts release notes — do not hard-code a version here.
2. Add **both** of these as direct devDependencies (required — see the trap in
   step 4): `@wordpress/eslint-plugin` and `eslint-import-resolver-typescript`,
   each at the version the new wp-scripts / eslint expects.
3. Replace `.eslintrc` + `.eslintignore` with `eslint.config.js`:

```js
const wpPlugin = require( '@wordpress/eslint-plugin' );

module.exports = [
	{
		ignores: [ '**/build/**', '**/dist/**', '**/node_modules/**',
			'**/vendor/**', '**/tests/**', '.github/**', '.vscode/**' ],
	},
	...wpPlugin.configs.recommended,
	{
		languageOptions: {
			globals: { jQuery: 'readonly', $: 'readonly' }, // if theme uses jQuery
			parserOptions: {
				requireConfigFile: false,
				babelOptions: {
					presets: [ require.resolve( '@wordpress/babel-preset-default' ) ],
				},
			},
		},
	},
];
```

4. **Known trap — `Resolve error: typescript with invalid interface loaded as
   resolver`:** eslint-plugin-import 2.x has no modern-eslint peer entry, so
   npm nests it (and the typescript resolver) under
   `@wordpress/eslint-plugin/`, while the hoisted eslint-module-utils then
   `require()`s the literal `typescript` package as a resolver. Fix = the two
   direct devDependencies in step 2. If node_modules looks corrupted after
   incremental installs, `npm run clean` (fresh lock + node_modules) and
   re-check.
5. Expected new lint errors: modern ESLint defaults `no-unused-vars` with
   `caughtErrors: 'all'` → replace `catch ( err ) {}` with an optional catch
   binding `catch {}`. Then `eslint --fix` removes stale disable directives.
6. Re-run `npm audit fix` (the new tree unlocks more fixes), verify
   build + lint:js + lint:css + `npx prettier --version` (lefthook needs it).
   Do not commit yet.

## Phase 4 — Residual overrides + accepted risks

Apply targeted overrides for what remains (dev-only, unused code paths) — see
"Known traps & pins". Then document anything that has no upstream fix instead of
chasing it.

Per the severity policy, only **low/moderate** advisories may be left as
accepted residuals here. **No high or critical advisory may reach this phase
unresolved** — if one still remains, go back and resolve it (override, major
bump, or replace the dependency) before closing the cycle.

Final: record the `npm audit` count (confirm zero high/critical) and verify
everything. Then present the summary to the user (audit before/after, what was
changed, residual low/moderate accepted). **Only after the user confirms it's
all fixed and working, make the single final commit** (see Operating rules).
Do not commit before that confirmation.

## Known traps & pins (verify current-safe versions at run time)

These are recurring, empirically-found issues in this toolchain. The **problem**
descriptions are stable; the **exact versions are not** — confirm each against
current advisories and changelogs before pinning.

Runtime (browser-shipped) update traps:

The **general pattern:** front-end libraries can ship breaking HTML/CSS or SASS
changes inside a minor version bump. For any such library a given theme uses,
read the changelog before accepting the update and confirm the compiled output
(markup, theme integration, SASS `@import`s) still works — don't trust semver
alone. The libraries below are examples seen on one project; a theme may use
these, none of them, or completely different ones — treat them as illustrations
of the pattern, not a required checklist.

- **select2** (example) — `4.0.13 → 4.1.0` was a breaking release disguised as a
  minor (HTML/CSS structure changes; broke select2-bootstrap-5-theme). Skipped.
- **tabulator-tables** (example) — minor jumps were generally safe, but its SASS
  was overhauled in 6.4, so the theme's
  `@import "~tabulator-tables/src/scss/tabulator.scss"` had to be reverified
  (new sass deprecation warnings expected and harmless).

Build-toolchain pins (add to `"overrides"`):

- **webpack** — recent 5.10x releases removed `lib/SizeFormatHelpers` (which
  laravel-mix 6.0.49 requires) and changed ProgressPlugin options in ways that
  break webpackbar 5. Pin webpack to the newest 5.10x that still ships
  `SizeFormatHelpers` AND is CVE-clean (was `~5.104.1` at last cycle — reverify).
- **typescript** — a new TypeScript major breaks @typescript-eslint 6 /
  ts-api-utils (`Cannot read properties of undefined (reading 'Intrinsic')`).
  Pin to the latest 5.x (`~5.9.3` at last cycle — reverify).
- **@sentry/node** — 8.x–10.x are vulnerable via @opentelemetry. Pin to the
  version `npm audit fix` selects (was `7.120.4`; lighthouse tree, unused
  telemetry).
- **serialize-javascript** — the fixed release exists but terser-webpack-plugin
  5.x pins an older major; override to the fixed version (`^7.0.5` at last
  cycle).

Residual overrides (Phase 4, dev-only unused paths):

- **markdownlint-cli** — wp-scripts pins an old 0.31 (old markdown-it/minimatch
  tree); override forward (`^0.49.1` at last cycle).
- **uuid** — node-notifier/sockjs pin uuid 8; v11 keeps the v4 API, so override
  forward.
- **webpack-dev-server** — mix + wp-scripts pin 4.x; overriding to 5.x is ONLY
  safe because `mix watch` (non-hot) never starts the dev-server. Flag that
  `mix watch --hot` may break; it is unused in these themes.

Example consolidated `"overrides"` block (adjust every version to current-safe):

```json
"overrides": {
  "@sentry/node": "7.120.4",
  "serialize-javascript": "^7.0.5",
  "typescript": "~5.9.3",
  "webpack": "~5.104.1",
  "markdownlint-cli": "^0.49.1",
  "uuid": "^11.1.1",
  "webpack-dev-server": "^5.2.6"
}
```

## Verification matrix (every phase)

**First, discover the theme's actual scripts.** Read the `"scripts"` block in
`package.json` before running anything. The names below (`build`, `lint:js`,
`lint:css`) are what Bracewell and ~80% of sites use, but they are not
guaranteed. Use whichever of them actually exist; if a site names them
differently (or has extra build/lint/test scripts), run that site's equivalent
scripts instead. Never assume a script exists — confirm it in `package.json`
first.

- `npm audit` — count by severity; save the report per phase.
- `npm run build` (or the theme's build script) — exit 0, AND compare warning
  count vs baseline.
- `npm run lint:js` and `npm run lint:css` (or the theme's lint scripts).
- `npx lefthook run pre-commit` after any tooling change, if lefthook is present.
- End of cycle: load the local site and smoke-test whatever front-end libraries
  this theme actually uses (e.g. sliders, selects, tables, charts, video), or at
  minimum confirm those runtime libs are present in `dist/*.js`.
- If the repo uses shared CI workflows, the PR validates them.

## Known blockers to NOT attempt

- **stylelint 17 / @wordpress/stylelint-config 24** — the WP config only peers
  stylelint ^16; blocked upstream and fixes no CVE.
- **Runtime libs with a breaking major behind a small bump** (example:
  select2 4.1.0) — skip; handle as a separate, QA'd task, not part of a security
  bump.
- **video.js 7 → 8** (example, only if the theme uses video.js) — separate task
  with manual video QA (its xmldom / min-document CVEs are already fixed in-range
  by audit fix on v7).
- **laravel-mix** — 6.0.49 is the last version ever; migrating off it is a
  separate project. It is also the permanent root of the residual `elliptic`
  tree (elliptic → browserify-sign/create-ecdh → crypto-browserify →
  node-libs-browser → laravel-mix): no upstream fix, low severity, build-time
  only. Accept and document it.

## Deliverable

A short report per phase capturing what changed: the audit count before/after
(by severity), which packages were updated or overridden and why, any errors
encountered and the fix applied, and the residual advisories that were accepted
and documented. Attach the per-phase `npm audit` reports.