# Frontend safety: proving nothing visible changed

What a visitor sees is a function of the HTML, CSS, JS and assets the server
sends. A dependency fix can touch the CSS/JS/assets (through `dist/`) and,
through Composer runtime packages, the HTML. Each gate below removes one way
for the frontend to change unnoticed.

## Tiers (from `lock-diff.mjs`)

| Tier | What it is | Expected effect | Gate that decides |
|---|---|---|---|
| runtime | dependency closure of what the sources import (`from 'x'`, `@import "x/..."`) | ships in `dist/` | changelog + G4 + G5 + feature QA |
| build | vite, rollup, esbuild, sass, postcss, webpack… and their closure | may change compiled output | G4 explains, G5 confirms |
| tooling | linters, formatters, hooks, type stubs | none | `dist/` must be byte-identical unless sources were edited |
| composer runtime | `packages` in `composer.lock` | PHP output, if `vendor/` ships | G6 smoke + G5 |
| composer tooling | `packages-dev` | none | — |

## G4 — Bundle comparison: acceptable causes

| Cause | Expected bundle effect | Accept only when |
|---|---|---|
| tooling-only change | IDENTICAL | always identical; any difference means investigate |
| lint autofix edited sources | diff limited to the edited rules | every hunk maps to an autofix edit and is semantically neutral |
| build-tier bump | possible codegen/minifier differences | the normalized diff is behavior-neutral; G5 confirms |
| runtime-tier bump | content differences | changelog read, G5 identical, features QA'd; otherwise ask the user |

`compare-bundles.mjs` prints IDENTICAL or DIFFERENT, a table of changed
files, and a `git diff` of the prettier-normalized CSS/JS in
`bundle-report/bundle.diff`. Read every hunk.

## Autofix review

An autofix is only acceptable when it cannot change the computed result.
Cases seen so far (the stylelint 17 row in `known-issues.md`):

- `order/properties-alphabetical-order` (stylelint-order 8) moves logical
  properties (`padding-inline`, `margin-inline`) before physical ones,
  treating them as shorthands. It is neutral in horizontal writing modes;
  check that the theme does not use `writing-mode` (in vertical modes the
  inline axis covers top/bottom and the order would matter).
- `property-no-deprecated` replaces `page-break-*` with `break-*`.
  `avoid → avoid` is equivalent; `always` must become `page`. Verify the
  output and run the print capture in G5.

## G5 — Visual gate (imperative)

Compares, element by element, the computed style (every property) and the
layout box of every rendered element and its `::before`/`::after`, between
the baseline and the candidate, in a real browser. Equal computed styles and
boxes mean the page renders the same; unlike pixel diffs, a difference names
the exact element and property.

It runs only when G4 reports a difference or a PHP file or Composer runtime
package changed. Otherwise the frontend is identical by construction and the
gate passes without captures.

**Validated with a negative control:** mutating one `margin-bottom` and one
`break-inside` was reported as exactly those root causes (plus the derived
layout ripples), and a mutation masked by a wider breakpoint did not show up
at desktop width — which is why the matrix covers several widths.

### Prerequisites

- The local site running (a `502` from the local router means the site is
  stopped — ask the user to start it).
- The Playwright MCP tools. Its file output is limited to the project
  folder, so captures go to `.playwright-mcp/visual/`. Exclude that folder
  locally first — this never touches a tracked file:
  `grep -qx '.playwright-mcp/' .git/info/exclude || echo '.playwright-mcp/' >> .git/info/exclude`

### Matrix

The gate proves the frontend does not break, not that every page is
unchanged: one page per template is enough.

- **Pages:** a fixed set of at most six, one per template:
  1. the home page;
  2. the archive of the people post type (e.g. `poa_person`);
  3. the posts page (the page set as "Posts page", rendered by `home.php`);
  4. one single of the people post type, picked at random;
  5. one single of the practices/services post type (e.g. `poa_practice`),
     picked at random;
  6. one single post.

  Pick the random singles from the REST API
  (`/wp-json/wp/v2/<rest_base>?per_page=100&_fields=link`) and check that
  every URL answers 200 — menu links can point to pages that no longer
  exist. A type with nothing published (`X-WP-Total: 0`) is skipped and
  reported, never replaced by another page. No other archives or pages:
  when `bundle.diff` touches selectors none of these render (a form, search
  results), tell the user and ask before swapping one in.
- **Viewports:** exactly three, never others: 414×896 (the most-used iPhone
  viewport), 1280×720 and 1440×900. The 768–1199 range is not covered.
- **Media:** screen at the three viewports; print only for the home page at
  1440, or for every page at 1440 when `bundle.diff` touches print CSS.
- **Time budget:** the visual gate is a check, not the goal of the run: at
  most 5 minutes. At ~3 s per capture, the full matrix (6 pages × 3
  viewports + home print, rechecks in the baseline only) is ~38 baseline and
  ~19 candidate captures, about 3 minutes. Never add pages, viewports or
  media beyond it.

### Capture (in batches)

Capturing one page per tool call costs four calls per capture; a batch
captures a whole plan in one call, with the same fingerprint function and
browser.

1. **Register once per browser session** (again after `browser_close`) with
   `browser_run_code_unsafe`:
   ```js
   async (page) => { await page.context().addInitScript({ path: '<SKILL_DIR>/scripts/visual-fingerprint.js' }); }
   ```
   Every page the context opens then defines `window.__visualFingerprint()`.
2. **Capture a batch** with `browser_run_code_unsafe` — at most ~20
   captures per call (each takes a few seconds), i.e. two pages of the
   matrix with their rechecks — and park the result on
   `about:blank`, because the run_code sandbox cannot write files:
   ```js
   async (page) => {
   	const base = 'https://<site>/';
   	const state = 'baseline'; // or 'candidate'
   	const rechecks = true; // baseline only
   	const plan = [ // [page, path, width, height, media]
   		['home', '', 414, 896, 'screen'],
   		['home', '', 1280, 720, 'screen'],
   		['home', '', 1440, 900, 'screen'],
   		['home', '', 1440, 900, 'print'],
   	];
   	const out = {};
   	for (const [name, path, width, height, media] of plan) {
   		await page.setViewportSize({ width, height });
   		await page.emulateMedia({ media });
   		for (const suffix of rechecks ? ['', '-recheck'] : ['']) {
   			const response = await page.goto(base + path, { waitUntil: 'load' });
   			if (200 !== response.status()) {
   				throw new Error(`${path} -> HTTP ${response.status()}`);
   			}
   			out[`${state}-${name}-${width}-${media}${suffix}`] = await page.evaluate(() => window.__visualFingerprint());
   		}
   	}
   	await page.goto('about:blank');
   	await page.evaluate((data) => { window.__dump = data; }, out);
   	return Object.keys(out).length;
   }
   ```
3. **Write it** with `browser_evaluate`: `function` = `() => window.__dump`,
   `filename` = `.playwright-mcp/visual/batch-<state>-<n>.json`.
4. **Split it**: `node "$SKILL_DIR/scripts/split-batch.mjs" .playwright-mcp/visual/batch-*.json`
   writes `<state>-<page>-<width>-<media>[-recheck].json` per capture and
   prints the dist files each one was served.

The `-recheck` captures (baseline only) reload the page: elements that differ
between the two baseline captures are unstable (carousels, JS motion) and are
excluded.

States, both captured in G5: **baseline** (the baseline build put back in
`dist/`, see § Baseline build) and **candidate** (after the final build). `split-batch.mjs` prints the served CSS/JS
as `bytes@ver`; confirm they match the intended build's file sizes
(`compare-bundles.mjs` table). `0` bytes means the browser served it from
memory cache — then its `ver` must be the intended build's (a
`filemtime`-versioned enqueue changes it on every build); otherwise a cache
served the wrong build. Optionally take full-page screenshots at 414 and
1440 as evidence for human review.

### Compare

```bash
node "$SKILL_DIR/scripts/compare-fingerprints.mjs" baseline-<p>-<w>-<m>.json candidate-<p>-<w>-<m>.json \
  --noise baseline-<p>-<w>-<m>-recheck.json
```

Pass: every comparison prints **VISUALLY IDENTICAL**. Otherwise it lists the
root-cause entries first (a real style value changed), then the layout
ripples they caused. Any root cause stops the delivery: trace it to its
source change, choose a fix that keeps the frontend identical, re-run. More
than 5 % unstable entries makes the verdict unreliable: re-capture with
`reducedMotion: 'reduce'` in both states, or pick a quieter page.

### Baseline build

Put the baseline build in the project's `dist/`
(`cp -r "$SP/dist-baseline/." <outDir>/`; a `filemtime`-versioned enqueue
busts caches), capture the baseline, then rebuild and capture the
candidate. Only valid when the branch changes no PHP and no Composer
runtime package; otherwise check out the base branch for the baseline
captures.

When `dist-baseline` is missing (Phase 1 was skipped), build it from a
worktree of the base branch:

```bash
git worktree add --detach "$SP/wt-base/<theme-folder>" <base-branch>
cd "$SP/wt-base/<theme-folder>" && npm ci --ignore-scripts && npm run build && cp -r <outDir> "$SP/dist-baseline"
```

The worktree's last folder must have the **same name as the theme folder**:
bundler configs often derive the public path from it (Vite
``base: `/wp-content/themes/${basename(process.cwd())}/dist/` ``), and a
different name rewrites every font and image URL in the CSS, so G4 reports
differences that do not exist. An existing worktree can be renamed in place
with `git worktree move "$SP/<old>" "$SP/wt-base/<theme-folder>"`.

Remove the worktree afterwards
with `git worktree remove --force "$SP/wt-base/<theme-folder>"`; on Windows its
`node_modules` can exceed the path-length limit ("Filename too long") —
then delete the folder with `node -e "require('fs').rmSync(process.argv[1],
{recursive:true,force:true})" "$SP/wt-base"` and run `git worktree prune`.

## G6 — Smoke test

```bash
for url in <home> <template-1> <template-2>; do
  curl -sk -o "$SP/page.html" -w "$url -> %{http_code}\n" "$url"
  grep -iE "fatal error|warning:|notice:|deprecated" "$SP/page.html" && echo "PHP output found on $url"
  grep -c "<outDir>/" "$SP/page.html"
done
```

HTTP 200, no PHP output, dist assets referenced. A site that is not running
is a pending gate, not a pass.
