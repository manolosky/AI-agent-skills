---
name: pr-format
description: >
  The team's pull request format — the only format for any PR text: short,
  precise and always the same structure. Use it every time PR information
  is requested or a PR is being prepared, every time the user asks for a
  PR, its title, description, message or
  comment ("dame el PR", "mensaje para el PR", "info para crear el PR",
  "descripción del pull request"), and whenever another skill
  (git-commit-format, dependabot-remediation, platform-rollout) reaches its PR
  step — even if nobody says "format". Title: `<type>: <ticket> <short
  description>` (feature, fix, hotfix, chore); description: a `## Summary`
  with one bullet per change and a `## Test plan` checklist of what was
  verified. It only returns text for the user to paste — Claude never
  creates a pull request.
---

# Pull request format

**Every PR text uses this format, whoever asks for it** — the user,
`git-commit-format`, `dependabot-remediation`, `platform-rollout` or any
other skill. Three rules hold every time:

- **Short:** a title, a Summary of 2–6 bullets and a Test plan, nothing else.
- **Precise:** each bullet names one change and the identifier it touches;
  each Test plan item names one check and its result. No filler, no
  restating the ticket.
- **Same structure:** title, `## Summary`, `## Test plan`, in that order,
  for every PR. A skill may add content inside these sections (a table, a
  residual bullet), never new sections.

The problem is already written down in the ticket, task or email; the PR
only tells the reviewer what this branch does about it and how it was
verified.

**Claude never creates pull requests, under any scenario.** Not with `gh`,
not through the GitHub API, not from a browser, not when asked to "open",
"create" or "submit" one, and the same goes for editing or commenting on an
existing PR. This skill returns the title and the description as text; the
user creates the PR and pastes them in. If a request would require creating
or changing a PR, return the text and say that the user does that step.

## Title

```
<type>: <ticket> <short description>
```

| Type | Use it for | Branch prefix |
|---|---|---|
| `feature` | new functionality | `feature/` |
| `fix` | correcting broken or incorrect behavior, security fixes included | `fix/` |
| `hotfix` | urgent production fix | `hotfix/` |
| `chore` | maintenance with no behavior change: tooling, config, refactors, docs | — |

- **Type** follows the branch prefix. PR titles say `feature`, while commit
  messages say `feat` (`git-commit-format`) — different artifacts, different
  conventions.
- **Ticket**: the number as it is, no `#`, right after the colon. Take it
  from the branch name (`fix/1234-mobile-menu`), otherwise from the
  conversation; if neither has it, ask once. When there is no ticket, the
  title has none — never invent one.
- **Short description**: English, lowercase, imperative ("add", "fix",
  "prevent"), no trailing period, about 72 characters at most. It names the
  solution, not the symptom.

```
fix: 1234 prevent the mobile menu from overlapping the hero
feature: 1250 add csv export to the members list
hotfix: 1301 restore contact form submissions
fix: update stylelint toolchain and vite to resolve vulnerabilities
```

Avoid: `[#1234] Fix menu` (old format), `Fix: 1234 Fixed the menu.`
(capitalized, past tense, period), `feat: 1234 …` (commit type, not PR
type), `fix: #1234 …` (no `#`), `fix: 1234 menu bug` (symptom, not
solution).

## Description

Two sections, in this order, in English:

```markdown
## Summary

<Optional lead sentence: what the branch does, in one line.>

- <One change per bullet, present tense ("Adds", "Fixes", "Removes"), naming the key file, package, hook or constant in backticks.>
- <The reason goes after a colon in the same bullet, only when the change does not make it obvious.>
- <A compatibility or risk bullet when there is one: what existing sites keep, what would change for them.>

## Test plan

- [x] <The automated checks that passed (`composer lint`, `composer static`, `npm run lint`, the build).>
- [x] <Each verification that was done, written as the expected result.>
- [ ] <A check the reviewer or QA still has to do.>
```

- **Summary:** 2–6 bullets, one change each, at most two lines per bullet.
  Do not restate the bug or the request; the reviewer has the ticket, task
  or email.
- **Test plan:** one line per item. Tick (`[x]`) only what was actually run
  on this branch, with numbers when there are any (`417 tests passed`); an
  unticked item is a check still owed. Never tick a check that did not run.

Nothing else: no extra headings, labels or screenshot sections. A skill
that owns the task may add content inside the two sections (for example
`dependabot-remediation` adds its statistics table at the end of the
Summary); the user may ask for more. No AI attribution, and no agency or
client names in the prose.

If the repository has its own PR template (`.github/pull_request_template.md`),
ask the user which one to follow.

## What to return

The title in one code block and the description in another, ready to paste.
After them, at most one line about anything that could not be confirmed
(e.g. no ticket number found). Before returning, check: the title matches
`<type>: [<ticket> ]<description>`, the description has exactly the Summary
and Test plan sections, every bullet is one change, and every ticked item
was really run.

## Example

```
fix: 1234 prevent the mobile menu from overlapping the hero
```

```markdown
## Summary

Fixes how the off-canvas menu stacks on small screens and restores the menu toggle's focus ring. Styles only.

- Switches the header height from `100vh` to `100dvh` (with a `100vh` fallback) in `_header.scss`: `100vh` ignores Safari's dynamic toolbar, so the open menu overlapped the hero.
- Scopes the global button reset and adds a `:focus-visible` style in `_buttons.scss`, so keyboard users see the focus ring again.

## Test plan

- [x] `npm run lint` and `composer lint` pass
- [x] iOS Safari at 390 px: the open menu no longer overlaps the hero
- [x] Tabbing to the menu toggle shows the focus ring; a mouse click does not
```
