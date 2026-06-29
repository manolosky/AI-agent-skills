---
name: git-commit-format
description: >-
  Enforce this project's commit-message convention every time a Git commit is
  created. Use this skill whenever you are about to write a commit message, run
  `git commit`, or stage-and-commit changes — even if the user just says "commit
  this", "save my work", or "push these changes". Two things matter most: the
  message follows the short `type: description` format (in English, within the
  length limit), and the commit is attributed ONLY to the user's own Git identity
  — never co-authored by Claude or any AI, and never carrying an AI-generated
  trailer. Apply it for single commits and for each commit in a batch.
---

# Git commit format

This skill keeps every commit in the repo looking the same: a short, English,
Conventional-Commits-style subject, authored by the user alone. Consistency here
makes history readable and `git log` skimmable, and — just as important — keeps
any AI attribution out of the project's permanent record.

## Authorship — the non-negotiable rule

The commit must be attributed **only to the user's configured Git identity**.

- **Never** add a `Co-Authored-By: Claude <noreply@anthropic.com>` trailer (or a
  co-author line for any AI/assistant).
- **Never** add a "🤖 Generated with Claude Code" line, a tool/credit footer, or
  any text in the message that mentions Claude, an AI, an assistant, or how the
  change was produced.
- **Never** override the author with `--author`; let the commit use the user's
  own `user.name` / `user.email` from their Git config.

The message contains the commit content and nothing about its origin. If you
catch yourself appending any attribution or "generated with" footer, stop and
remove it — that is exactly what this skill exists to prevent.

## Format

One single line, no body:

```
<type>: <short description>
```

- **`type`** is one of:
  - `feat` — a new feature.
  - `fix` — a bug fix.
  - `chore` — a task: maintenance, tooling, config, deps, build, refactors,
    docs, or anything that isn't a user-facing feature or a bug fix.
- **`description`**:
  - **English only**, never Spanish or any other language.
  - Short and to the point. Hard limit: **250 characters** for the whole subject
    line; aim well under that — concise is the goal.
  - Imperative present tense ("add", "fix", "update", "remove"), lowercase first
    word, no trailing period.
- Lowercase the `type`, with a space after the colon.

Keep it to that single subject line. Don't add a body, bullet list, or extended
description unless the user explicitly asks for one.

## Mapping changes to a type

- New capability, endpoint, component, option the user can use → `feat`.
- Correcting broken or incorrect behavior → `fix`.
- Everything else (dependency bumps, config, CI, refactors with no behavior
  change, formatting, docs, renames, chores) → `chore`.

If a change set genuinely spans more than one type, prefer splitting it into
separate commits, each with its own correct `type`. If it can't be split, pick
the type that best represents the primary intent of the change.

## Examples

```
feat: add CSV export to the recognition list
fix: correct timezone offset in invoice dates
chore: bump laravel framework to 11.9
fix: prevent duplicate submissions on double-click
chore: rename helper functions for clarity
feat: support dark mode in the dashboard header
```

Avoid:

```
Feat: Added a new feature.            # capitalized type, past tense, vague, period
fix(login): arreglar el error         # Spanish, and scope not used here
update stuff                          # no type prefix
feat: add export

🤖 Generated with Claude Code         # forbidden AI trailer
Co-Authored-By: Claude <noreply@anthropic.com>   # forbidden co-author
```

## When committing

Write the message with a plain `git commit -m "<type>: <description>"`. Do not use
a here-doc or multi-line construction that appends trailers, and do not add any
`--author` flag. Verify the final message is a single English line in the
`type: description` form before committing.
