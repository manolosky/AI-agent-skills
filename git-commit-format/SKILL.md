---
name: git-commit-format
description: >-
  Govern this project's whole Git workflow: never commit on a protected branch,
  create and name work branches from the right base, write commit messages in the
  project's convention, push, prepare PR text (the user creates every PR), and
  clean up. Use this skill whenever any
  Git operation comes up — even if the user just says "commit this", "save my
  work", "push these changes", "let's start ticket X", "sube esto", or "haz el
  commit" — and also when you finish writing code and committing is the natural
  next step. Two things matter most and are never negotiable: work never lands
  directly on main/master/staging/development, and commits are attributed ONLY to
  the user's own Git identity — never co-authored by Claude or any AI, never
  carrying an AI-generated trailer. Apply it for single commits and for each
  commit in a batch.
---

# Git workflow: branches, commits, PRs

This skill keeps the repo's history predictable: work happens on traceable
branches, integration branches only change through reviewed pull requests, and
every commit is a short, English, Conventional-Commits-style subject authored by
the user alone. Consistency here makes `git log` skimmable, keeps any AI
attribution out of the project's permanent record, and stops unreviewed code from
reaching a deployed branch.

## The two non-negotiable rules

**1. Protected branches are never written to directly.**

`main` · `master` · `staging` · `development` · `develop` · `production` · `prod`

No commit, push, merge, rebase or reset lands on these. They change through pull
requests only. If a command you are about to run writes to one of them, stop and
say so — do not run it because the user asked. If the user insists, explain the
risk and ask them to run it themselves.

**2. The commit is attributed only to the user's configured Git identity.**

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

## Preflight — run this before any commit

```bash
git branch --show-current
git status --short
```

| What you find | What you do |
|---|---|
| Protected branch, no local commits | Create the work branch before committing |
| Protected branch, local commits not yet pushed | Go to "Recovery" below |
| Valid work branch matching the task | Go straight to the commit |
| Work branch, but from a different task | Ask whether to continue there or open a new one |

Never `git add .` blindly. Read `git status --short` and stage explicit paths —
env files, builds, `node_modules` and dumps the user never mentioned do not
belong in the commit.

## Choosing the base branch

Where the new branch is cut from depends on the state of the project, not on the
ticket. **Always ask the user before cutting a branch — every time, without
exception**, even when you believe you already know the answer:

> Is this a ticket on the published site, or part of the current sprint?

Do not infer it from `CLAUDE.md`, from the branch you happen to be standing on,
from what was decided earlier in the conversation, or from the shape of the
ticket. A project can be live and mid-sprint at the same time, so a confident
guess here is exactly how sprint work ends up cut from `main`. The question costs
one line; getting it wrong costs a bad PR base and a messy merge.

**A) A ticket on an already-published project** → base is `main`.

```bash
git checkout main
git fetch origin
git pull origin main
git checkout -b feature/0000-short-title
```

**B) A project under active development (sprint work)** → base is the most
up-to-date integration branch. Preference order: `staging` → `development` /
`develop`. `staging` wins unless the project is just starting and it doesn't
exist yet.

```bash
git fetch origin
git checkout staging          # or development / develop, whichever exists
git pull origin staging
git checkout -b feature/0000-short-title
```

Check what integration branches actually exist with `git branch -r` rather than
assuming — ask the question first, then confirm against the real branch list. If
the user answers "sprint" but only `main` exists on the remote, say so instead of
silently falling back.

## Branch naming

```
<type>/<ticket>-<slug of max 4 words>
```

- **type**: `feature` for new functionality, `fix` for a correction.
- **ticket**: the ticket number or label. If it isn't in the context, ask for it.
- **slug**: English, lowercase, kebab-case, no accents, four words maximum.

With no ticket attached, the branch simply carries no number — don't invent a
filler `0000`:

```
feature/0000-change-labels      OK, with ticket
fix/0000-color-contrast         OK, with ticket
feature/newsletter-signup       OK, no ticket
fix/mobile-menu-overlap         OK, no ticket
```

Avoid:

```
feature/0000-change-the-labels-on-the-contact-form   # slug too long
Feature/0000-Change-Labels                           # capitals
feature/cambiar-etiquetas                            # Spanish
0000-change-labels                                   # no type prefix
```

Optional variant: `hotfix/` for production urgencies, always cut from an updated
`main` even when the project is mid-sprint.

## Commit message format

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
description unless the user explicitly asks for one. The ticket lives in the
branch name, so no `Refs:` or issue trailer goes in the message.

### Mapping changes to a type

- New capability, endpoint, component, option the user can use → `feat`.
- Correcting broken or incorrect behavior → `fix`.
- Everything else (dependency bumps, config, CI, refactors with no behavior
  change, formatting, docs, renames, chores) → `chore`.

If a change set genuinely spans more than one type, prefer splitting it into
separate commits, each with its own correct `type`. If it can't be split, pick
the type that best represents the primary intent of the change.

### Examples

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

### Committing

Write the message with a plain `git commit -m "<type>: <description>"`. Do not use
a here-doc or multi-line construction that appends trailers, and do not add any
`--author` flag. Verify the final message is a single English line in the
`type: description` form before committing. Never use `--no-verify`: the hooks
exist for a reason, and skipping them lets through exactly what the team wanted
blocked.

## Push

```bash
git push -u origin feature/0000-short-title
```

Never `--force` onto a shared branch. If history on your own already-pushed
branch genuinely needs rewriting, use `--force-with-lease`, which aborts if
someone else pushed in the meantime.

## Pull request

The PR targets **the same branch the work was cut from**: `main` for tickets on a
published project, `staging`/`development` for sprint work. Sending sprint work
at `main` is the classic mistake — tell the user which base the PR must target.

Never create, open, edit or comment on a pull request — no `gh pr create`, no
API call, under any scenario. The user creates every PR. Invoke the
`pr-format` skill to return its title and description as text, ready to paste.

## Merge and cleanup

Merging happens in the GitHub interface after review, not from the CLI. When the
merge is a squash, the resulting subject still follows the commit format above.
After merging:

```bash
git checkout staging        # or whichever base applies
git pull origin staging
git branch -d feature/0000-short-title
git fetch --prune
```

`git branch -d` (lowercase) fails if the branch isn't merged, which is exactly
what you want. Don't reach for `-D` unless the user confirms they are discarding
that work on purpose.

## Recovery: commits already sitting on a protected branch

If preflight finds unpushed local commits on a protected branch, nothing is lost.
Move them onto a new branch and put the protected one back:

```bash
git branch feature/0000-short-title      # bookmark the current commits
git reset --hard origin/main             # return main to the remote's state
git checkout feature/0000-short-title
```

`reset --hard` is destructive, so before running it show the user which commits
are being moved (`git log origin/main..HEAD --oneline`) and wait for their
confirmation.

If the commits were **already pushed** to the protected branch, stop. Rewriting
published history breaks everyone else's clone. Explain the situation and let the
team choose between a revert commit and a manual fix.

## Commands never run without explicit confirmation

`push --force` on a shared branch · `reset --hard` · `clean -fd` · `checkout -f` ·
`rebase` of published history · `branch -D` · `commit --no-verify` · any direct
write to a protected branch