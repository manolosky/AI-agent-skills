# Deliverables

Two deliverables, in this order. The second only exists once the first is
approved and committed.

## 1. Commit message, then the question

One commit for the whole remediation: every package moved and every source
edit it required (lint autofixes included) go in the same commit — never one
commit per package. Its message names the whole fix.

Rules come from `git-commit-format`: one line, English, imperative,
lowercase, no trailing period, no body, no AI attribution, no ticket
trailer. Security fixes on these repos use `fix:`.

```
fix: update <what moved> to resolve vulnerabilities
```

Examples: `fix: update fast-uri to resolve vulnerability`,
`fix: update stylelint toolchain and vite to resolve vulnerabilities`,
`fix: update composer dev toolchain to resolve vulnerabilities`.

Present to the user, in their language: a short summary of what changed,
one line per gate (G1–G7), the message in a code block, and close with
**"¿Hago el commit?"**. Commit only after an explicit yes.

## 2. PR title and description (after the commit)

Follow the `pr-format` skill — short, precise, same structure: title,
`## Summary`, `## Test plan`. Applied to Dependabot:

- **Title:** type `fix`, the ticket number if there is one, and the commit
  subject's description: `fix: update stylelint toolchain and vite to resolve vulnerabilities`.
- **Summary:** a lead sentence with the alerts it closes (plus any
  advisories found only by the audits) and whether overrides were needed.
  Then the bullets:
  - one per package that needed its own decision (direct bump, parent
    major, override, migration): `` `<package>` <old> → <new> (#<alerts>):
    <how>, <side effect if any> ``;
  - one per ecosystem for every lockfile-only package, listing each as
    `` `<package>` <new> `` with the alert numbers;
  - one `Residual:` bullet per advisory left unresolved — package,
    advisory, why no fix exists, exposure.

  Then this skill's extension, at the end of the Summary: the statistics
  table printed by `audit-stats.mjs`.
- **Test plan:** the gates that passed, one line each — audits, lockfile
  blast radius, quality suite, bundle, visual (or identical by
  construction), smoke.

## Worked example (anonymized)

Two open alerts — `source-map-js` (high) and `postcss-selector-parser`
(medium, before its 6.x backport existed) — plus vite, brace-expansion and
fast-uri found by `npm audit`.

```
fix: update stylelint toolchain and vite to resolve vulnerabilities
```

```markdown
## Summary

Closes Dependabot alerts #<a> and #<b> plus three advisories found only by `npm audit`; no overrides.

- `@wordpress/stylelint-config` 24 → 27 with `stylelint` 16 → 17 and `stylelint-order` 6 → 8 (#<b>): the only way off `@stylistic/stylelint-plugin` 3; the autofix reordered 12 declarations and renamed 6 `page-break-*` to `break-*`, both rendering-neutral.
- `vite` 7.3.6 → 7.3.7: direct patch bump with the floor raised to `^7.3.7`; build output unchanged.
- Lockfile-only npm updates: `source-map-js` 1.2.2 (#<a>), `brace-expansion` 5.0.12, `fast-uri` 3.1.9.
- Residual: `braces` 3.0.3 — GHSA-vfj7-8cjw-p6xm (high): no patched release; dev-only via `stylelint → micromatch`, reached only by the project's own lint globs.

| Source | Before | After |
|---|---|---|
| Dependabot open alerts | 2 (1 high, 1 medium) | 0 expected after merge |
| npm audit — vulnerable packages | 17 (15 high, 2 moderate) | 12 (12 high) |
| npm audit — distinct advisories | 12 (5 high, 6 moderate, 1 low) | 1 (1 high) |
| composer audit — advisories | 0 | 0 |

## Test plan

- [x] `npm audit` and `composer audit --locked`: only the documented residual remains
- [x] Lockfile diff: no runtime package moved
- [x] PHPCS, PHPStan, Rector, Stylelint and ESLint pass
- [x] JS byte-identical to the base build; CSS differs only by the autofix declarations
- [x] Visual gate: identical rendering at 414, 1280 and 1440, home print included
- [x] Home and key templates return 200 with no PHP notices
```
