# Knowledge base

The standard for resolving each advisory: what the issue is and the
procedure that resolves it. The same advisory showing up in another project
is resolved the same way, starting from what is written here; every run
refines the procedure.

It records **issues and procedures, not run results**: no per-site test
outcomes, statistics or run logs — those live in the PR of each run.

## Anonymity rule (strict)

Entries describe the issue and how to resolve it, never a project:

- Never: client, site, repo or org names; domains or URLs of a project;
  Dependabot alert numbers (they are per repo); project file paths;
  project-specific selectors, class names, page names or content.
- Allowed: package names, versions, advisory ids (GHSA/CVE), severities,
  generic dependency chains (`stylelint → micromatch → braces`), project
  types (`WordPress theme, Vite build`), tool and rule names.
- The anonymity check in `SKILL.md` Phase 7 greps this whole skill for the
  project's identifiers before a run ends. It must print nothing.

## Layout

```
knowledge-base/
├── INDEX.md                         every package: advisories, fix path, playbook
├── packages/npm/<name>.md           one playbook per package (scoped: @scope__name.md)
├── packages/composer/<vendor>__<name>.md
└── migrations/<topic>.md            upgrades that move several packages together
```

Search before triage: `grep -rli -e "<package>" -e "<GHSA-id>" knowledge-base/`.

## Package playbook

```markdown
# <package> (<npm|composer>)

**Tier:** tooling | build | runtime — <why>
**Fix path:** <A–E> — <one line>

## Advisories

| Advisory | Severity | Vulnerable | Patched | Fix path |
|---|---|---|---|---|

## How it reaches the tree

- `<direct dep> → … → <package>`

## Resolution procedure

1. <command>
2. Verify: <command and what it must show>
3. Expected frontend effect: <none | what changes> — <which gate confirms it>

## Traps

- <what surprised us and how to avoid it>
```

When a new advisory hits a known package, add its row; when the procedure
changes, rewrite the steps (the playbook always reflects the current best
procedure, not its history). Add the package to `INDEX.md`.

## Migration note

For an upgrade that moves several packages together (a linter major, a
bundler switch): which advisories it resolves, what moves together and why,
the install procedure, every lint/build fallout and how to fix it, and what
the bundle and visual gates must show.
