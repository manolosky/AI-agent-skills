---
name: dependabot-remediation
description: >
  Resolve Dependabot security alerts (npm and Composer) in our PHP WordPress
  theme/plugin repos with a safe, repeatable procedure backed by a list of
  known issues with tested fixes. Use it whenever the user
  shares a GitHub Dependabot or security-alerts URL, says there are new
  Dependabot issues or alerts or asks to review them ("revisa los issues de
  Dependabot", "nuevas incidencias de Dependabot", "alertas de seguridad",
  "issues reportados por Dependabot"), pastes a GHSA/CVE id, or
  asks to fix vulnerable dependencies reported on a repo — even if they only
  paste the link. Covers read-only alert intake, known-issues lookup,
  per-advisory triage, the minimal fix (no overrides unless last resort),
  mandatory gates proving the frontend is unchanged (bundle diff plus a
  computed-style comparison in a real browser, screen and print), the quality
  suite, and the deliverables: a commit message (asking before committing)
  and, after approval, a short PR title and body in the pr-format
  structure with before/after statistics. Ends by recording each issue and a reference to
  its fix in the known-issues list. For laravel-mix themes still on @wordpress/scripts, the npm
  tree-shrink itself is delegated to npm-vuln-remediation.
---

# Dependabot remediation

A security fix should be boring: the smallest change that closes the
advisory, proven not to alter what visitors see, and resolved the same way
in every project. This file is the procedure; `known-issues.md` lists every
issue already solved, with its tested fix and a link to the run that proved
it, so a known issue is fixed the same way everywhere. `SKILL_DIR` below is
the base directory shown when this skill loads; `SP` is the session
scratchpad, where every intermediate file goes (audits, lock copies, dist
snapshots, visual captures) — nothing from this process stays in the project.

## Non-negotiable rules

1. **The frontend must not change.** A dependency fix ships only when the
   site renders exactly as before — screen and print, at every tested
   viewport. Gates G4 (bundle) and G5 (visual) are the proof. If a difference
   is unavoidable (the patched library itself changes its output), stop and
   present it to the user; it is never shipped by default.
2. **No client information in this skill, except the Ref links.** Nothing
   written under `SKILL_DIR` (known-issues rows, references, scripts,
   examples) may name or identify a client: no client, site, repo or org
   names, domains, URLs, alert numbers, project file paths, or
   project-specific selectors and content. The one exception is the Ref
   column of `known-issues.md`: a link to the PR or commit that proved the
   fix. The anonymity check in Phase 7 enforces it. Commit messages and PR
   prose never mention the agency or the client either.
3. **GitHub access is read-only.** Alerts are read only through
   `scripts/fetch-dependabot-alerts.sh`, which accepts nothing but a
   fine-grained read-only token (see Setup). Never use Git Credential
   Manager or `gh` tokens for API calls — they can write, and GCM opens an
   account picker when several accounts are stored. Never call a write
   endpoint (dismiss or reopen alerts, comment, open PRs) and never push:
   the user pushes and opens the PR.
4. **Git goes through `git-commit-format`.** Invoke that skill for the
   branch, the commit and its message: protected branches stay untouched,
   the base-branch question is always asked, staging uses explicit paths,
   the message is one English line with no AI attribution, no `--no-verify`.
5. **Minimal, reviewable change.** No `npm audit fix --force`, no
   `--force`/`--legacy-peer-deps` installs, no deleting the lockfile to
   regenerate it (that silently bumps runtime libraries and makes the diff
   unreviewable). Major bumps only after the user approves them. Overrides
   only as a last resort for high/critical advisories — narrow, justified,
   approved (see `references/fix-paths.md`).
6. **Known issues first and last.** Look every package up before triage and
   apply a matching row's tested fix; update the list at the end of every
   run, including abandoned attempts (the Note says why).

## Setup (once per machine): read-only GitHub token

1. GitHub → Settings → Developer settings → Personal access tokens →
   **Fine-grained tokens** → Generate new token.
2. Resource owner: the organization that owns the repos — not the personal
   account: a token owned by the personal account only reaches personal repos
   and gets 404 on the organization's, even for a member. If the organization
   requires approval, the token stays pending until an owner approves it
   (Organization settings → Personal access tokens → Pending requests); if it
   is missing from the owner list, the organization blocks fine-grained tokens.
3. Repository access: the repos you maintain (or all).
4. Repository permissions: **Dependabot alerts → Read-only**. Metadata →
   Read-only is added automatically. Nothing else.
5. Pick an expiration and renew it when it lapses.
6. The user stores it themselves as the environment variable
   `GITHUB_READONLY_TOKEN` — never pasted into the conversation. On Windows,
   `setx GITHUB_READONLY_TOKEN "github_pat_..."` in their own terminal, then
   quit the editor completely (File → Exit; Reload Window keeps the old
   environment) so new shells inherit it. If a shell still lacks it, the
   script reads it from the Windows user environment itself.

The script refuses any token that is not `github_pat_...` (classic `ghp_`
and OAuth `gho_` tokens carry write scopes). Without a token, stop and give
the user these steps; the fallback is the user pasting the alert list from
the Security tab.

## Workflow

Track these phases as a checklist and do not skip any:

0. Intake · 1. Baseline · 2. Triage · 3. Apply · 4. Gates G1–G7 ·
5. Commit message → ask → commit · 6. PR title + body ·
7. Known issues, anonymity check, cleanup, procedure review

### Phase 0 — Intake

1. Repo from the URL or `git remote get-url origin`.
2. Fetch alerts:
   ```bash
   bash "$SKILL_DIR/scripts/fetch-dependabot-alerts.sh" <url|owner/repo> "$SP/alerts-open.json"
   bash "$SKILL_DIR/scripts/fetch-dependabot-alerts.sh" <url|owner/repo> "$SP/alerts-all.json" all
   ```
   The `all` listing exposes `auto_dismissed` alerts: Dependabot's
   auto-triage silently dismisses some development-scope alerts that
   `npm audit` still reports.
3. Known-issues lookup for every package:
   `grep -i -e "<package>" -e "<GHSA-id>" "$SKILL_DIR/known-issues.md"`.
   A matching row is the fix to apply in Phase 3, and its Note is the trap
   to avoid. Versions come from the alert, not from the row.
4. Project shape: `package.json` and `composer.json` scripts; bundler config
   (`vite.config.*` → `build.outDir`, or `webpack.mix.js`); `.nvmrc` vs
   `node -v` — when they differ and the `.nvmrc` version is installed, prepend
   it to `PATH` in every command of the run (nvm-windows:
   `export PATH="$NVM_HOME/v<version>:$PATH"`; nvm:
   `~/.nvm/versions/node/v<version>/bin`) instead of `nvm use`, which switches
   Node for the whole machine; if it is not installed, say so and run on the
   current one; how the theme enqueues assets (a `filemtime` version busts
   caches); whether `vendor/` ships (`.deployignore`, deploy workflow). If
   the build is laravel-mix with `@wordpress/scripts`, the npm remediation
   follows `npm-vuln-remediation` (its tree-shrink removes most advisories
   at the root); this skill still owns intake, gates, deliverables and the
   known-issues list.
5. Branch through `git-commit-format` (ask the base). Name it after the fix:
   `fix/dependabot-<slug>`, slug of at most four words.

### Phase 1 — Baseline (before touching anything)

`dist/` is git-ignored, so `git diff` never shows what ships; this snapshot
(and, when G4 finds a difference, the visual captures) is the only evidence
that the frontend did not change. `npm ci` first, because `node_modules` may have drifted from the
lockfile.

```bash
npm ci
npm audit --json > "$SP/npm-audit-before.json"
composer audit --locked --format=json > "$SP/composer-audit-before.json"
cp package-lock.json "$SP/package-lock.before.json"
cp composer.lock "$SP/composer.lock.before"
npm run build && cp -r <outDir> "$SP/dist-baseline"
```

Then run the quality suite once (a red baseline must be known up front, or
later failures are ambiguous). Only when it is red, or the fix will move
stylelint, its config or its plugins, keep its lint reports so G3 can tell a
new violation from an old one (`<css glob>` is the one in the project's lint
script):

```bash
npx stylelint "<css glob>" -f json -o "$SP/stylelint-before.json" 2> "$SP/stylelint-before.log"
sh -c 'npx stylelint <css glob> -f json -o "$1"' _ "$SP/stylelint-before-ci.json" 2>> "$SP/stylelint-before.log"
npx eslint -f json -o "$SP/eslint-before.json"
```

The second stylelint run expands the glob the way CI's `sh` does: an
unquoted `**` in a lint script is recursive on Windows (npm runs scripts
through cmd and stylelint expands it) but a single level in CI, so the two
can lint different files. stylelint also echoes the report on stderr — keep
it in the log, never discard it.

No visual capture here: `dist-baseline` is enough. G5 captures the visual
baseline only when G4 reports a difference, so the local site is needed only
at G5/G6. If a quick `curl` shows it down, ask the user to start it now so
it is up by then.

### Phase 2 — Triage

One row per advisory — the Dependabot alerts plus any `npm audit` /
`composer audit` finding Dependabot has not raised:

- **Chain:** `npm ls <pkg> --all`, `npm explain <pkg>`; `composer why <pkg>`.
- **Patched version** and whether every parent's range accepts it:
  `npm view <parent>@<version> dependencies.<pkg> peerDependencies`. Only
  for packages with no known-issues row; a known row is applied as written
  and checked with its Verify command.
- **Tier:** runtime / build / tooling (`references/frontend-safety.md`).
  Dependabot's "development" scope says nothing about exposure: themes
  declare bundled libraries (Bootstrap, sliders, selects) as devDependencies.
- **Fix path:** A–E (`references/fix-paths.md`).

Present the table to the user with a recommendation. Stop for an answer
only for: the scope when the audits show extra fixable advisories
(recommend fixing them — they arrive as alerts days later), and approval for
every path C (major bump — say what it requires: peers, engines, config) and
path D (override). With only paths A/B and no extra advisories, continue
straight to Phase 3.

### Phase 3 — Apply

Known rows first, with their tested commands (all lockfile-only rows in one
`npm update <pkg> <pkg>…`), then the new ones by path A → B → C → D,
re-auditing after each step; commands and traps for new packages in
`references/fix-paths.md`. Keep a running list of every package changed and
why — it feeds the PR.

### Phase 4 — Gates (all mandatory; one red gate stops the delivery)

- **G1 Advisories.** Re-run both audits into `$SP/*-after.json`, then
  ```bash
  node "$SKILL_DIR/scripts/audit-stats.mjs" --npm-before "$SP/npm-audit-before.json" \
    --npm-after "$SP/npm-audit-after.json" --composer-before "$SP/composer-audit-before.json" \
    --composer-after "$SP/composer-audit-after.json" --dependabot "$SP/alerts-open.json"
  ```
  Every alert is "resolved locally" or a documented residual, and there is
  no "INTRODUCED" section.
- **G2 Blast radius.** `node "$SKILL_DIR/scripts/lock-diff.mjs"
  "$SP/package-lock.before.json" package-lock.json --src <js dir> --src
  <scss dir>` (and the same for `composer.lock`). The runtime tier is empty,
  or each runtime change is the advisory's own package with its changelog
  read.
- **G3 Quality suite.** Invoke `run-tests`; with a green baseline its green
  result is the gate. When Phase 1 kept lint reports, re-run them into
  `$SP/*-after.json` and compare each pair with
  `node "$SKILL_DIR/scripts/lint-diff.mjs" "$SP/<report>-before.json"
  "$SP/<report>-after.json"`: every pair prints NO NEW VIOLATIONS.
  Pre-existing violations are out of scope: when the baseline is red, apply
  `run-tests`' autofix only to the files the fix changed
  (`npx stylelint <files> --fix`), never repo-wide — it would edit files the
  fix does not touch and change `dist/`. Autofix lint fallout, but give
  every autofix a semantic review (`references/frontend-safety.md`
  § Autofix review). Never rename files to satisfy a linter.
- **G4 Bundle.** Build, copy the output to `$SP/dist-candidate`, run
  `node "$SKILL_DIR/scripts/compare-bundles.mjs" "$SP/dist-baseline"
  "$SP/dist-candidate" --out "$SP/bundle-report"` from the project root.
  IDENTICAL, or every changed line traced to an expected cause.
- **G5 Visual — imperative, at most 5 minutes.** When G4 is IDENTICAL and
  no PHP file or Composer runtime package changed, the frontend is identical
  by construction and G5 passes without captures. Otherwise put the baseline
  build back in `dist/`, capture the baseline matrix, rebuild, and capture
  the candidate (`references/frontend-safety.md` § Visual gate); every
  comparison VISUALLY IDENTICAL. If the local site cannot run, the gate is
  pending and no commit message is delivered — tell the user what is needed.
- **G6 Smoke.** `curl` the home page and key templates: HTTP 200, no PHP
  errors/warnings/notices, dist assets referenced.
- **G7 Hooks.** When the project uses lefthook, run each pre-commit command
  on the files the commit will stage (e.g. `npx prettier --check
  package.json package-lock.json`, `npx stylelint <changed css files>`).
  `npx lefthook run pre-commit` with nothing staged checks nothing, and
  `--all-files` runs the `--fix`/`--write` commands over the whole repo —
  never use it. The real hook then runs on the commit itself.

### Phase 5 — Deliverable 1: commit message, then ask

Summarize for the user (in their language): what changed and one line per
gate. The remediation is **one commit** — every package moved and every
source edit it required — never one commit per package. Then the commit
message in a code block (format in
`references/deliverables.md`, rules from `git-commit-format`) and the
question: **"¿Hago el commit?"**. Only after approval: preflight, stage the
explicit paths, commit, show the hash. Never push.

### Phase 6 — Deliverable 2: PR title and body (after the commit)

Return the PR title and description following the `pr-format` skill —
short, precise, same structure. The Summary opens with the alerts closed,
then one bullet per package that needed its own decision, one bullet per
ecosystem for the lockfile-only updates and one `Residual:` bullet per
unresolved advisory, and ends with this skill's extension: the before/after
statistics table from `audit-stats.mjs`. The Test plan lists the gates that
passed. Details and a worked example in `references/deliverables.md`.
Return it as text only: the user creates the PR and pastes it — never
create one.

### Phase 7 — Known issues, anonymity check, cleanup

1. Update `known-issues.md` (rules in its header) in one edit: new advisory
   ids on their rows, one row per new package (a migration that moved
   several packages is one row), a row rewritten only when its fix changed,
   and Ref set to this run's PR URL — the commit URL until the PR exists.
2. **Anonymity check** — list the project's identifiers (repo, org, theme
   slug, domain, site title, client name); both commands must print nothing:
   ```bash
   grep -rniE "<id1>|<id2>|..." "$SKILL_DIR" --exclude=known-issues.md
   sed -E 's/\[[^]]*\]\([^)]*\)//g' "$SKILL_DIR/known-issues.md" | grep -niE "<id1>|<id2>|..."
   ```
   The second one drops the Ref links, the only place a repo may appear.
3. Cleanup: remove temporary worktrees (`git worktree remove`), rebuild the
   candidate so `dist/` is current, move `.playwright-mcp/visual/` captures
   to `$SP` and delete `.playwright-mcp/` from the project, stop helper
   servers.
4. Tell the user what was recorded and where.

## References

- `references/fix-paths.md` — fix paths A–E, npm/Composer commands, severity
  policy, known traps.
- `references/frontend-safety.md` — tiers, bundle gate causes, autofix
  review, the visual gate step by step (matrix, time budget, baseline
  build), smoke test.
- `references/deliverables.md` — commit message, the question, and how the
  `pr-format` PR is filled for Dependabot (with its statistics extension and
  a worked example).
- `known-issues.md` — every issue already solved: tested fix, verify
  command, trap, and the PR or commit that proved it.
- `scripts/` — `fetch-dependabot-alerts.sh`, `audit-stats.mjs`,
  `lock-diff.mjs`, `lint-diff.mjs`, `compare-bundles.mjs`,
  `visual-fingerprint.js`, `split-batch.mjs`, `compare-fingerprints.mjs`;
  each documents its usage in its header.

## Continuous improvement (every run)

At the end of every run, review this procedure itself against what just
happened: which steps were unnecessary or out of place, which risk or
failure no gate covered, and which new control would have caught a problem
earlier or made the proof stronger. Propose each change to the user
concretely — what to change and where it belongs (a section of this file, a
reference, a script, the known-issues list) — and apply it once approved.
Every refinement stays inside this skill's framework: minimal fixes, a
frontend proven unchanged, read-only GitHub access, no client information
outside the Ref links, the user's approval before committing, and the
known-issues list as the shared memory. Never relax a rule to make a run pass; tighten or clarify it
instead.
