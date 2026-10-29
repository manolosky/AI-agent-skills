# AI Agent Skills

A personal collection of [Claude Code](https://claude.com/claude-code) **skills** — reusable, model-invoked instruction packages that teach the agent how to perform specific engineering tasks following a consistent set of conventions.

Each skill lives in its own folder containing a `SKILL.md` file. The frontmatter (`name` + `description`) tells Claude Code *when* the skill applies; the body tells it *how* to execute the task.

These skills are tailored to a **WordPress + Bootstrap 5** development workflow (ACF blocks, ITCSS/BEM SCSS, quality tooling) plus a couple of general-purpose Git helpers.

> The `.skill` packaged bundles (zipped exports of a skill folder) are **not** versioned here — they are generated artifacts and the `SKILL.md` files are the source of truth. They are git-ignored; build them only when you need to share or import a skill elsewhere.

## Available skills

| Skill | Purpose |
| ----- | ------- |
| [`acf-custom-block`](acf-custom-block/SKILL.md) | Create a custom Gutenberg block using ACF (Advanced Custom Fields) 6.2+ with JSON as the source of truth — generates `block.json`, `markup.php`, the ACF field group JSON, and registers constants in `fields.php`. |
| [`acf-field-group`](acf-field-group/SKILL.md) | Create a standalone ACF Field Group via JSON (ACF 6.2+) with a matching PHP partial template, following project conventions. |
| [`bootstrap-markup`](bootstrap-markup/SKILL.md) | Generate or convert HTML so it follows Bootstrap 5.3+ conventions: helper/component classes first, zero inline styles, and clean semantic structure. Missing tokens become Sass variables merged into the relevant Bootstrap map. |
| [`scss-bem-architecture`](scss-bem-architecture/SKILL.md) | Write or edit CSS/SCSS the project's way: modular BEM inside an ITCSS layered Sass architecture over Bootstrap 5.3. Companion to `bootstrap-markup`. |
| [`run-tests`](run-tests/SKILL.md) | Run the full quality suite for a WordPress theme — PHP CodeSniffer, Stylelint, ESLint, PHPStan, and Rector dry-run — and fix issues until every check passes. |
| [`npm-vuln-remediation`](npm-vuln-remediation/SKILL.md) | Remediate `npm audit` findings in WordPress themes built with laravel-mix + `@wordpress/scripts`, through a phased process (direct updates, `npm update`/`audit fix`, major bumps, targeted overrides) that keeps the build and lints green. |
| [`git-commit-format`](git-commit-format/SKILL.md) | Enforce the project's commit-message convention (`type: description`, in English) and attribute commits only to the user's Git identity — never co-authored by an AI. |
| [`pr-format`](pr-format/SKILL.md) | The team's pull request format: `<type>: <ticket> <short description>` title, a `## Summary` with one bullet per change, and a `## Test plan` checklist of what was verified. |
| [`dependabot-remediation`](dependabot-remediation/SKILL.md) | Resolve Dependabot alerts (npm + Composer) with read-only alert intake, minimal fixes, mandatory gates proving the frontend is unchanged (bundle diff + computed-style visual comparison), commit/PR deliverables, and a known-issues list of tested fixes, each linked to the PR or commit that proved it. |

## Repository layout

```
.
├── acf-custom-block/
│   └── SKILL.md
├── acf-field-group/
│   └── SKILL.md
├── bootstrap-markup/
│   └── SKILL.md
├── dependabot-remediation/
│   ├── SKILL.md
│   ├── references/
│   ├── scripts/
│   └── known-issues.md
├── git-commit-format/
│   └── SKILL.md
├── npm-vuln-remediation/
│   └── SKILL.md
├── pr-format/
│   └── SKILL.md
├── run-tests/
│   └── SKILL.md
└── scss-bem-architecture/
    └── SKILL.md
```

## Usage

Claude Code discovers personal skills under `~/.claude/skills/`. To use these skills on a machine:

```bash
# Clone into the Claude Code skills directory
git clone https://github.com/manolosky/AI-agent-skills.git ~/.claude/skills
```

Or clone anywhere and symlink / copy the individual skill folders into `~/.claude/skills/`.

Once in place, Claude Code loads each skill's `name` and `description` automatically and invokes the relevant one when a request matches — no manual activation required. You can also trigger a skill explicitly by typing `/<skill-name>`.

## Authoring conventions

- Every skill folder contains a `SKILL.md` with YAML frontmatter (`name`, `description`) followed by the instructions.
- `description` is written so Claude Code can decide *when* to apply the skill, including the kinds of phrasing that should trigger it.
- A `.skill` file is a zipped export of a skill folder, useful for sharing or importing into other environments. These are generated on demand and kept out of version control (see `.gitignore`); the `SKILL.md` sources are authoritative.

## License

Personal use. Feel free to adapt these skills to your own workflow.
