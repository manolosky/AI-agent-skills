---
name: run-tests
description: >
  Run the full quality suite for this WordPress theme project: PHP CodeSniffer,
  Stylelint, ESLint, PHPStan, and Rector dry-run. Fix all issues autonomously
  and leave every check passing. Use this skill whenever the user asks to "run
  tests", "check quality", "run the suite", or "fix lint errors".
---

# Run Tests Skill

## Overview

This skill runs five quality checks in sequence, fixes every issue it can
automatically, and keeps looping until all five pass clean. It never asks the
user to fix anything — resolve every error autonomously.

---

## Step 1 — PHP CodeSniffer (style)

```bash
npm run lint:php
```

- If it passes (exit 0, no errors listed): move to Step 2.
- If it fails: run the auto-fixer, then re-run the linter.

```bash
npm run format:php   # runs phpcbf
npm run lint:php     # must pass before continuing
```

If errors remain after the auto-fix (phpcbf cannot fix everything):
- Read the error output carefully.
- Open each reported file, identify the violation, and fix it manually using
  the Edit tool.
- Re-run `npm run lint:php` after every file fix.
- Do NOT continue to Step 2 until this passes clean.

---

## Step 2 — Stylelint (CSS / SCSS)

```bash
npm run lint:css
```

- If it passes (no output, exit 0): move to Step 3.
- If it fails: run the auto-fixer, then re-run.

```bash
npm run format:css   # runs stylelint --fix
npm run lint:css     # must pass before continuing
```

If errors remain after the auto-fix:
- Read the error output carefully.
- Open each reported file and fix the violation manually.
- Re-run `npm run lint:css` after every fix.
- Do NOT continue to Step 3 until this passes clean.

---

## Step 3 — ESLint (JavaScript)

```bash
npm run lint:js
```

- If it passes (no output, exit 0): move to Step 4.
- If it fails: run the auto-fixer, then re-run.

```bash
npm run format:js assets/js   # runs eslint --fix on JS files
npm run lint:js               # must pass before continuing
```

If errors remain after the auto-fix:
- Read the error output carefully.
- Open each reported file and fix the violation manually.
- Re-run `npm run lint:js` after every fix.
- Do NOT continue to Step 4 until this passes clean.

---

## Step 4 — PHPStan (static analysis)

```bash
composer run static
```

- If it shows `[OK] No errors`: move to Step 5.
- If it reports errors: read each one and fix the root cause in the PHP file.
  - PHPStan cannot auto-fix — every fix must be done manually with the Edit tool.
  - Re-run `composer run static` after every fix.
  - Do NOT continue to Step 5 until this passes clean.

Common PHPStan error patterns and fixes:
- **Variable might be undefined**: initialise the variable before use.
- **Function does not exist**: check the correct WP/ACF function name or add a stub.
- **Method called on mixed/null**: add a null-check or type-check before the call.
- **Return type mismatch**: update the return type annotation or the return value.

---

## Step 5 — Rector (refactor dry-run)

```bash
composer run refactor
```

- If it shows `[OK] Rector is done!` with no changes listed: all checks pass — proceed to Step 6.
- If it lists files to be changed: apply the refactors automatically.

```bash
composer run refactor-fix   # applies rector changes
composer run refactor       # re-run dry-run to confirm clean
```

After applying rector fixes, **re-run the full suite from Step 1** to ensure
rector's changes did not introduce new CodeSniffer or PHPStan violations.

---

## Step 6 — Final verification

Run the entire suite once more in sequence to confirm all five checks pass:

```bash
npm run lint:php && npm run lint:css && npm run lint:js && composer run static && composer run refactor
```

If any check fails, go back to the relevant step and fix it.

---

## Step 7 — Report

Once all five pass, present a structured report with two sections.

### Section A — Check results

| Check | Status | Issues found |
|-------|--------|--------------|
| PHP CodeSniffer | ✅ Passed | N issues |
| Stylelint | ✅ Passed | N issues |
| ESLint | ✅ Passed | N issues |
| PHPStan | ✅ Passed | N issues |
| Rector | ✅ Passed | N issues |

If a check had zero issues, write "None" in the issues column.
If the project was already clean when the skill ran, say so explicitly.

### Section B — Issues found and how they were fixed

For every issue that was found and resolved during this run, list it in this format:

---
**File:** `path/to/file.php` (or `.scss`, `.js`)
**Check:** PHP CodeSniffer / Stylelint / ESLint / PHPStan / Rector
**Issue:** Short description of the violation (e.g. "Missing space after opening parenthesis", "Variable `$foo` might be undefined")
**Fix:** How it was resolved — auto-fixed by phpcbf / auto-fixed by stylelint / auto-fixed by eslint / auto-fixed by rector / manually edited (describe what changed)

---

If there were no issues at all, write a single line:
> No issues found — the project was already clean.

Do NOT invent or pad issues. Only report what was actually found during this run.

---

## Rules

| Rule | Detail |
|------|--------|
| Order | Always run checks in sequence (1 → 5); never skip ahead |
| Auto-fix first | Always try the auto-fixer before manually editing |
| No user delegation | Never ask the user to fix an error — resolve autonomously |
| Re-run after fix | Always re-run the same check after fixing before moving on |
| Rector regression | After `refactor-fix`, restart from Step 1 |
| Exit condition | Only report success after the Step 6 combined run passes |
