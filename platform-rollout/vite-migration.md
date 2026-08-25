# Laravel-mix → Vite migration (optional Phase 4 step)

Controlled migration of a theme's bundler from laravel-mix (webpack) to Vite,
as executed on stokes-lawrence (Jul 2026). Only run this when the developer
answered YES to the Phase 4 migration question.

## Reference implementation

**The canonical reference is the standardized config shipped on
stokes-lawrence and bracewell-prg** (their `vite.config.js` files are
identical; Bracewell was aligned to them in Jul 2026). The goal is bundle
standardization: every migrated site gets EXACTLY this shape — static `base`
with the theme slug hardcoded, `quietDeps: true`, NO copy-images plugin, NO
dynamic base. The only allowed per-site deltas are the `rollupOptions.input`
entries (whatever the theme's PHP enqueues) and hand-added IIFE wraps for
extra JS entries (see below).

- References: `C:\Users\Manuel\Local Sites\stokes-lawrence\...\themes\stokes-lawrence`
  and `C:\Users\Manuel\Local Sites\bracewell-prg\...\themes\bracewell-prg`
- The starter theme's `main` keeps evolving its own config (copy-images
  plugin, dynamic `basename(process.cwd())` base, Vite 8) — those extras are
  NOT part of the team standard; do not fold them in unless the standard is
  explicitly changed. Diff against stokes-lawrence/bracewell-prg instead.

Note the **known gap** in the references (Font Awesome fonts, step 6 below)
that must be fixed on every site that bundles FA.

Requirements: Node >= 22 (Vite 7 needs `^20.19.0 || >=22.12.0`).

## Steps

### 1. Back up any pending work

If the working tree is dirty (e.g. an earlier remediation attempt), save
`git diff` patches and untracked build configs to the scratchpad before
touching anything.

### 2. package.json

- **Remove** laravel-mix and the whole webpack stack: `laravel-mix`,
  `webpack`, `webpack-cli`, `webpack-dev-server`, `@babel/*`, `babel-loader`,
  `css-loader`, `postcss`, `postcss-loader`, `autoprefixer`,
  `mini-css-extract-plugin`, `css-minimizer-webpack-plugin`,
  `terser-webpack-plugin`, `sass-loader`, `resolve-url-loader`,
  `webpack-remove-empty-scripts`, plus any `browserslist` field (Vite does
  not use it).
- **Keep** `sass` explicitly (Vite needs it for `.scss`) and all runtime
  libraries (bootstrap, select2, jQuery plugins, etc.).
- **Add** `"vite": "^7.2.7"` (or current 7.x).
- **Scripts**: `"watch": "vite build --watch"`, `"build": "vite build"`;
  drop the `start` script (matches the reference). Leave lint/format/clean
  scripts untouched.
- Majors of unrelated tooling (e.g. lefthook 1.x → 2.x in the reference)
  still need explicit developer approval — do not bump them as a side effect.

### 3. vite.config.js (delete webpack.mix.js / webpack.config.js)

Template — replace `<theme-slug>` and the entry names with the ones the
theme's PHP actually enqueues:

```js
import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
	base: '/wp-content/themes/<theme-slug>/dist/',
	plugins: [
		{
			/**
			 * Wrap the frontend bundle in an IIFE so top-level bindings don't
			 * leak onto window (WordPress loads it as a classic script).
			 * Real case: a minified var renamed to `_` clobbered Underscore
			 * and broke TinyMCE/ACF WYSIWYG. Rollup's `format: 'iife'` does
			 * this natively but does not support multiple inputs.
			 */
			name: "iife-wrap-frontend",
			generateBundle(_, bundle) {
				const chunk = bundle["frontend.js"];
				if (chunk && chunk.type === "chunk") {
					chunk.code = `(function(){\n${chunk.code}\n})();`;
				}
			},
		},
	],
	resolve: {
		alias: {
			jquery: resolve('assets/js/jquery.js'),
		},
	},
	build: {
		outDir: 'dist',
		emptyOutDir: true,
		sourcemap: true,
		rollupOptions: {
			input: {
				frontend: resolve('assets/js/frontend.js'),
				'frontend-style': resolve('assets/css/frontend-style.scss'),
			},
			output: {
				entryFileNames: '[name].js',
				assetFileNames: '[name][extname]',
			},
		},
	},
	css: {
		devSourcemap: true,
		preprocessorOptions: {
			scss: {
				outputStyle: 'expanded',
				quietDeps: true,
				silenceDeprecations: [
					'import',
					'color-functions',
					'global-builtin',
					'if-function',
				],
			},
		},
	},
});
```

Key constraints:

- `base` makes emitted asset URLs absolute to the theme's `dist/` — required
  for fonts/images referenced from CSS (and for PDF/vCard crawlers, per the
  reference's `e141b49`).
- Output names have NO hashes because the PHP enqueue uses fixed file names +
  `filemtime()` cache busting — check `includes/assets.php` (or equivalent)
  and match the entry names to what is enqueued.
- `outputStyle: 'expanded'` is required so Font Awesome icon glyphs encode
  correctly (same rule as under mix).
- **Multi-entry themes** (Bracewell: 2 JS + 3 SCSS entries): add every
  enqueued entry to `rollupOptions.input`, and wrap EACH additional classic
  JS entry by hand inside the same `iife-wrap-frontend` plugin block
  (duplicate the `const chunk = bundle["<name>.js"] …` lookup — keep the
  reference block's shape, do not generalize into a loop). Extra SCSS
  entries need nothing special.

### 4. jQuery shim (WordPress's jQuery stays external)

Replaces webpack's `externals`. Create `assets/js/jquery.js`:

```js
/**
 * This file is needed for Vite to work properly.
 * This allows us to use `import $ from 'jquery'` in our modules while still using WordPress's jQuery.
 * @see https://github.com/vitejs/vite/discussions/3744
 */
const $ = window.jQuery || window.$;
export default $;
export { $ as jQuery };
```

The PHP enqueue must list `jquery` as a dependency of the frontend script and
load it in the footer (it already does on our themes).

Then update every JS module that used the `jQuery` global
(`grep -rn "jQuery(" assets/js`):

- `jQuery(function ($) {` → `import $ from 'jquery';` + `$(function () {`
- `require('some-jquery-plugin');` → `import 'some-jquery-plugin';`
- jQuery plugins that attach to the global (jq-accordion,
  jquery-popup-overlay, @contentpilot/*) keep working through the shim,
  because the shim returns the same `window.jQuery` instance.

### 5. select2 needs a special hack

select2's UMD build does not bind to the aliased jQuery under Vite. Use the
reference's raw-source workaround in the module that initializes it:

```js
import jQuery from 'jquery';
import src from 'select2?raw';

const $ = (window.$ = window.jQuery = jQuery);

new Function('module', 'require', 'window', 'jQuery', src)(
	{},
	() => jQuery,
	window,
	jQuery
);
```

### 6. SCSS

- Strip every webpack `~` prefix: `@import "~pkg/..."` → `@import "pkg/..."`
  (search all of `assets/css`, plugins partials included).
- Plain CSS files from packages (flickity, aos) imported **without** the
  `.css` extension get inlined by sass — leave those imports extensionless,
  and if a theme imports one WITH the extension (Bracewell:
  `@import "~flickity/dist/flickity.css"`), **drop the `.css`** too:
  with the extension sass emits a plain CSS `@import` instead of inlining.
- **Font Awesome fix (NOT in the reference — the reference has this bug
  latent)**: FA's `$fa-font-path` default (`../webfonts`) is built via
  interpolation, so Vite cannot rebase it; the build warns
  `"didn't resolve at build time"` and icons 404 in production. Before the
  FA imports in the entry SCSS, set the path relative to the entry file:

```scss
$fa-font-path: "../../node_modules/@fortawesome/fontawesome-free/webfonts";
```

  **Vendored FA variant (Bracewell, Jul 2026)**: some themes bundle FA inside
  the theme (`assets/css/plugins/fontawesome-free/` with its own `webfonts/`)
  instead of the npm package. Same fix, different path — relative to the
  entry SCSS:

```scss
$fa-font-path: "plugins/fontawesome-free/webfonts";
```

  Also add the vendored directory to the eslint `ignores` (its bundled JS
  references plugins we don't install):
  `"assets/css/plugins/fontawesome-free/**"`.

  After rebuilding, the `fa-*.woff2/ttf` files must appear in `dist/` and the
  CSS must reference them through the `base` URL. Report this gap upstream if
  the starter theme still has it.

### 7. Regenerate the npm tree

```bash
rm -rf node_modules package-lock.json dist && npm install
```

The lock MUST be regenerated (the old one holds the entire webpack tree).
Expect a dramatic shrink (stokes-lawrence: thousands of packages → 298,
`npm audit` 0; bracewell-prg Jul 2026: ~1,900 → 344 packages, 71 → 0
vulnerabilities, zero overrides). This is also what closes most npm
Dependabot alerts — webpack-dev-server / uuid / elliptic / old fast-uri
disappear with the tree.

**CI trap — platform optional dependencies (npm bug #4828, hit on Bracewell
`development`, Jul 2026):** running `npm i` while `node_modules` already
exists (typical when resolving a package-lock merge conflict by deleting the
lock and reinstalling) records ONLY the platform binaries installed on the
current machine — on Windows the lock ends up with 2 `@rollup/*` and 1
`@esbuild/*` entries instead of the full ~25/26 matrix, and Linux CI then
dies at `vite build` with `Cannot find module @rollup/rollup-linux-x64-gnu`.
Rules:

- Resolve package-lock merge conflicts by **taking the branch's complete
  lock** (`git checkout --theirs/--ours`) + `npm ci`, or by regenerating
  with `rm -rf node_modules package-lock.json && npm install` — never with
  a bare `npm i` over an existing `node_modules`.
- Before pushing, verify the matrix:
  `grep -oc 'node_modules/@rollup/rollup-' package-lock.json` (~25) and
  `grep -oc 'node_modules/@esbuild/' package-lock.json` (~26), and that
  `@rollup/rollup-linux-x64-gnu` is present.

### 8. Verify

- `npm run build` — no unresolved-URL warnings; check `dist/` contains the
  JS/CSS entries with the exact names PHP enqueues, plus all fonts.
- IIFE wrap: the built JS must start with `(function(){` and end with
  `})();`. Team decision (stokes-lawrence, Jul 2026): keep exact parity with
  the starter's block. Two known caveats were accepted knowingly — the
  `//# sourceMappingURL` comment ends up inside the wrapper (browsers then
  ignore the sourcemap), and only the entries listed by hand in the plugin
  are wrapped — verify EVERY classic JS entry starts with `(function(){`
  (Bracewell wraps `frontend.js` + `key-contacts.js`). If the caveats ever
  become a problem, the fix is a generalized wrapper that loops all chunks
  and re-appends the sourcemap comment after `})();` — propose it upstream
  to the starter first so parity is preserved.
- `npm audit` — fold results into the roll-out's residuals report; if
  vulnerabilities remain, hand off to the `npm-vuln-remediation` skill.
  Known post-migration leftovers and their fixes (Bracewell, Jul 2026 —
  reached **0 vulnerabilities** applying both):
  - Advisories nested under `@wordpress/eslint-plugin` (its
    eslint-plugin-import pins minimatch 3 → old brace-expansion with no
    fixed 1.x): the fix is adopting the team's minimal eslint config from
    the `npm-vuln-remediation` skill (drop the plugin entirely, plain
    `prettier` + `@wordpress/prettier-config` + `eslint-plugin-prettier` +
    `globals`; `lint:js`/`format:js` become bare `eslint`/`eslint --fix`).
    Expect the one-time reformat.
  - `esbuild` flagged as a peerOptional under `@wordpress/stylelint-config`
    23.x: bump the config to `^24` (still peers stylelint ^16). A direct
    `esbuild` devDependency pin (vite accepts `^0.27 || ^0.28`) covers
    vite's own copy if audit flags it.
- `npm run lint:js` / `lint:css` (the `?raw` import and `new Function` pass
  our eslint config).
- Grep the built CSS for font URLs: `grep -o "url([^)]*fa-[^)]*)"
  dist/frontend-style.css` — they must point at the theme `dist/`.
- Manual visual QA list for the PR comment: Font Awesome icons, select2
  selects, jQuery-plugin widgets (accordions, popups), carousels.
