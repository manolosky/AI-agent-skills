---
name: platform-rollout
description: >
  Platform update & maintenance roll-out for our **PHP WordPress** sites
  (Genesis and non-Genesis). NOT for vanilla JS sites or headless/pnpm
  projects — abort if the project is not a PHP WordPress site with npm. Use
  when asked to run the platform roll-out, update GitHub Actions workflow
  refs, enable PHPCompatibilityWP checks, or bring a site up to the current
  maintenance baseline. Covers: branch setup from updated main, workflow ref
  bump, PHPCompatibilityWP in phpcs.xml, JavaScript dependency updates
  (asking first whether to migrate the bundler from laravel-mix to Vite —
  see vite-migration.md — and delegating remaining vulnerabilities to the
  npm-vuln-remediation skill), full
  composer/npm script verification plus a curl smoke test (visual QA stays
  manual in the local environment), and — as the deliverable — a prepared
  commit message and PR description. Single commit at the end, only after
  developer approval.
---

# Platform roll-out (update & maintenance) — PHP WordPress sites only

Repeatable maintenance cycle to apply the current platform baseline to one
of our **PHP WordPress** sites (Genesis or non-Genesis). **Scope
guard:** this skill is NOT for vanilla JS sites or headless (pnpm) projects —
if Phase 0 discovery shows the project is not a PHP WordPress site using npm,
stop and tell the developer the project is out of scope. **Nothing is committed per phase** — all work stays
uncommitted until the developer approves the final state; then one commit.
The deliverables are the **commit message** and the **PR description**, prepared
for the developer.

## Current roll-out parameters (update these each cycle)

| Parameter | Value |
|---|---|
| Roll-out branch | `feat/maroon-roll-out` |
| GitHub Actions workflows ref | `@1.10.0` |
| PHP compatibility `testVersion` | `8.2-` |

## Phase 0 — Repo discovery (structure varies per project)

Identify the project layout BEFORE touching anything; Genesis and headless
projects place things differently:

1. Locate `.github/workflows/*.yml` — usually at the repo root, which may be
   above the theme directory you were opened in (`git rev-parse
   --show-toplevel` gives the root).
2. Locate the PHP tooling: `composer.json` + `phpcs.xml` (or
   `phpcs.xml.dist`). In Genesis projects these may live in the child theme
   directory rather than the root.
3. Locate the JS tooling: `package.json` (theme dir or root). Read its
   `"scripts"` block — never assume script names.
4. **Scope guard**: confirm this is a PHP WordPress site using npm
   (`package-lock.json` + `composer.json` + WP theme/plugin structure). If
   you find `pnpm-lock.yaml` (headless) or no PHP/WordPress at all (vanilla
   JS), STOP — the project is out of this skill's scope; report it and do
   nothing else. A third out-of-scope case (found in Jul
   2026): a legacy PHP WordPress site (e.g. an old Genesis child theme) with
   NO `.github/workflows`, NO `composer.json` and NO `package.json` — a site
   never onboarded to the platform baseline. STOP there too, report the
   finding, and do NOT propose or start a platform onboarding (workflows,
   Composer, npm bootstrap): team policy is that on these old sites the only
   maintenance done is updating WordPress core and plugins — no code or
   tooling changes at all.
5. Note whether the theme is Genesis-based (e.g. `genesis` in composer/theme
   metadata or a child-theme structure) — record it in the report; it changes
   where files live, not what is done.

## Phase 1 — Branch setup

```bash
git gcupdate main                     # team alias: update local main
git checkout -b feat/maroon-roll-out main
```

If the `gcupdate` alias is not available in the environment, fall back to
`git checkout main && git pull origin main`, and note it. Confirm the working
tree is clean before starting.

**Unpublished sites branch from `staging`, not `main`** (found in
Jul 2026): on a site that has not launched yet, `main` may hold
only the initial setup commit while all real work lives in `staging`. Check
`git log main..origin/staging --oneline | head` first — if `main` is clearly
stale, base the roll-out branch on `staging` and say so in the PR description.
When in doubt, ask the developer which base to use before starting.

## Phase 2 — GitHub Actions

Update every workflow ref in every `.github/workflows/*.yml` to the current
ref (e.g. `content-pilot/github-actions/.github/workflows/<wf>.yml@1.10.0`).
The version tag bump is the ONLY change — do not touch anything else in the
workflow files, with ONE exception: newer shared-workflow versions may
require secrets that older callers don't pass, and GitHub rejects the whole
workflow file with "Secret <NAME> is required, but not provided while
calling" (found in Jul 2026: `coding-standards.yml` came from
`@1.1.8` and lacked `CONTENT_PILOT_USER_TOKEN`, which `build-with-cache`,
`php-coding-standards`, and `php-static-analysis` require at `@1.10.0`).
After bumping, compare each caller's `secrets:` blocks against a sibling
workflow already on a recent ref (the deploy workflows are usually the most
complete) and add any missing secret to the SAME jobs that pass it there —
do not add secrets to jobs that don't need them. This cannot be validated
locally; it only surfaces when Actions parse the file on push.

## Phase 3 — PHPCompatibilityWP

1. Ensure `composer.json` (require-dev) includes
   `phpcompatibility/phpcompatibility-wp`; if missing:
   `composer require --dev phpcompatibility/phpcompatibility-wp`.
2. Ensure `phpcs.xml` contains BOTH lines — without both, the sniffs simply
   don't run:

```xml
<rule ref="PHPCompatibilityWP" />
<config name="testVersion" value="8.2-"/>
```

3. Verify with `composer lint` (or the project's phpcs script — check
   `composer.json` scripts). Fix or report any new compatibility findings:
   real PHP-compat errors in theme code are part of this roll-out's work,
   not something to silence.

## Phase 4 — JavaScript dependencies (fully delegated)

**Vite migration question (ALWAYS ask BEFORE remediating)**: if the theme
still builds with laravel-mix (a `webpack.mix.js` exists), ask the developer
whether this cycle should also migrate the bundler to **Vite**. This is a
blocking question — do not start any dependency work until answered.

- **YES** → follow `vite-migration.md` in this skill's directory (procedure
  distilled from the starter theme's `feat/vite` branch plus the first
  production roll-out, Jul 2026). The migration replaces most of the
  remediation: dropping laravel-mix/webpack shrinks the tree so much that the
  npm vulnerabilities usually vanish with it (first roll-out: thousands of
  packages → ~300, `npm audit` 0). After migrating, run `npm audit`; only if
  vulnerabilities remain, delegate the leftovers to the
  `npm-vuln-remediation` skill. The migration's build/lint verification
  replaces that skill's for this cycle.
- **NO** → proceed with the delegation below, unchanged.

**Check for pre-existing work first**: if the npm remediation already exists
in another branch or open PR (e.g. merged into `development` but not yet in
`main` — compare `git log main..development -- package.json`), do NOT re-run
it: re-doing it on this branch duplicates work and guarantees package-lock
merge conflicts. Ask the developer, and by default reference the existing
PR/branch in this roll-out's PR description instead.

Otherwise, do NOT update JS dependencies from this skill. This entire phase
is handled by **invoking the `npm-vuln-remediation` skill**, which owns the
whole process: dependency updates (patch/minor with risk review, majors only with
approval), audit remediation, pins without overrides, and the residuals
report. Its no-commit rule aligns with this skill: its changes stay
uncommitted and its residuals table is folded into this roll-out's PR
comment instead of producing two reports.

## Phase 5 — Verification

Run everything; a failing step blocks the roll-out until fixed or explained:

1. **Reinstall composer packages first**: the tests must run against the
   updated packages and versions, not a stale `vendor/`. Check whether a full
   reinstall is warranted (composer.json or composer.lock changed in this
   cycle → yes): `rm -rf vendor && composer install`. If nothing
   composer-related changed, `composer install` to sync with the lock is
   enough — state which one was done. Known non-blocking warning on these
   sites: `Class Dealerdirect\...\PHPCodeSniffer\Plugin is not autoloadable`
   during install — pre-existing, does not affect the lint scripts; do not
   treat it as a failure.
2. **Composer scripts**: every relevant script in `composer.json`
   (`composer lint`, analysis, etc.) exits 0.
3. **npm/JS verification is NOT repeated here** — it is owned by Phase 4's
   delegated `npm-vuln-remediation` skill (build, lint:js, lint:css, hooks).
   Just confirm that skill reported its verification green.
4. **Site smoke test with curl (no MCP, no extra setup)**: the local site
   must respond without errors. `curl` the homepage and 1–2 key templates,
   checking HTTP 200 and that the HTML contains no PHP errors/warnings/
   notices (`grep -iE "fatal error|warning:|notice:|deprecated"`), and that
   the theme's dist assets are referenced. If the local site is not running,
   report it as a pending check — do not set up browser tooling. **Visual
   testing is done by the developer in the local environment**; note it as a
   manual step in the PR description.
   **Stale-rewrite-rules trap** (Jul 2026): if pretty
   permalinks 404 while the `?post_type=x&name=y` query form returns 200, the
   rewrite rules went stale (switching the working tree between branches with
   different CPT/rewrite code while the site is being served can cause this).
   Fix by flushing permalinks; when wp-cli is not on PATH (Local on Windows)
   and the system PHP cannot reach Local's DB, drop a temporary mu-plugin
   into `wp-content/mu-plugins/` that calls `flush_rewrite_rules()` on
   `init`, curl the homepage once, delete the file, and re-test.
5. Git hooks still pass (`npx lefthook run pre-commit` if lefthook exists).

## Phase 6 — Deliverables + final commit (developer approval required)

Prepare and present BOTH deliverables, then wait for approval:

**Writing rule for both deliverables:** never mention the agency name
("Content Pilot") in the commit message, PR title, or PR body prose. Literal
code references that contain it (e.g. workflow `uses:` paths) are code and
stay as-is.

1. **Commit message** (single line, team format, no AI attribution):
   `chore: update github actions workflow refs to 1.10.0`
   (adjust to what actually changed).
2. **PR title and description** following the `pr-format` skill (type
   `chore`). One Summary bullet per roll-out area this run actually
   touched — GitHub Actions (refs <old> → <new> across <N> workflow files),
   PHPCompatibilityWP (enabled, or already configured and where),
   JavaScript dependencies (remediation summary, or the branch/PR that
   handles it) — plus one bullet per extra change. The Test plan lists the
   checks that passed, one line each; detailed results go to the developer
   in the conversation, not into the PR.

**Only after the developer approves: make the single final commit** on
`feat/maroon-roll-out`. Never push unless asked, and never create the PR —
the user creates it and pastes the `pr-format` text.

## Capture new learnings (improve this skill over time)

This guide covers the cases seen so far. On every run, watch for anything
outside these instructions — a project layout neither Genesis nor standard, a
workflow that needs more than the ref bump, a composer script name not
covered, a pnpm hoist pattern missing from the reference. At the end of the
cycle, report each such gap to the developer with where it belongs in this
skill, so it can be folded in.
