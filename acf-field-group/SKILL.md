---
name: acf-field-group
description: >
  Create a standalone ACF Field Group via JSON (ACF 6.2+) with a matching PHP partial template.
  Use this skill whenever the user asks to create, add, or generate a new ACF field group, a new
  group of custom fields, or a new partial template for a post type — even if they say "add fields
  to X", "create a field group for Y", or "make a partial for Z". This skill handles the full
  workflow: reading project conventions, generating the ACF JSON field group, registering constants
  in fields.php, and creating the PHP partial template.
---

# ACF Field Group Skill

## Overview

Generate a standalone ACF field group using JSON as the single source of truth, plus a PHP partial
template that renders the fields. The output is always three artifacts:

1. `acf-json/<field-group-name>.json` — ACF Field Group definition
2. `includes/fields.php` — append new constants for every new field and subfield
3. `partials/<partial-folder>/<partial-name>.php` — PHP partial template using the new fields

---

## Step 1 — Verify project compatibility

Before doing anything else, confirm this project uses the expected structure. Check for the presence
of all the following:

| Path | Purpose |
|------|---------|
| `phpcs.xml` | Project prefix source |
| `acf-json/` | ACF JSON sync folder — confirms ACF 6.2+ JSON workflow |
| `includes/fields.php` | Constants file |
| `partials/` | Partials folder (create it if missing — see Step 4) |

**If `phpcs.xml`, `acf-json/`, or `includes/fields.php` are missing, stop immediately.** Do not
generate any files. Tell the user clearly what was not found, and explain that this skill expects:
- ACF field groups synced as JSON in `acf-json/`
- A `phpcs.xml` at the project root with a defined prefix
- A `fields.php` constants file at `includes/fields.php`

The `partials/` folder is the only optional path — if it doesn't exist, create it in Step 4.

Suggest the user check their project structure, or update the skill if their setup differs.

---

## Step 2 — Gather project context

Before writing any code, read the project to understand its conventions. Do all of this before
asking the user anything.

### 2a. Read the project prefix

Open `phpcs.xml` and extract the short project prefix (e.g. `gb_` for Graham & Bell). This prefix
must be used for all PHP variables in partial templates and all field name prefixes.

### 2b. Read the ACF JSON reference

List all files in `acf-json/`. Read one or two existing field group JSON files to learn:
- Key naming pattern (e.g. `group_XXXXXXXXXX`, `field_XXXXXXXXXX`)
- The length and format of the trailing alphanumeric suffix — keep the same length
- Location rules structure for post types: `"post_type" "==" "<post-type>"`
- Field structure: label, name, type, instructions, required, wrapper, etc.
- JSON key ordering and formatting conventions

### 2c. Read fields.php

Read `includes/fields.php` to understand:
- How constants are defined (`define( 'CONST_NAME', 'field_XXXXXXXXXX' )`)
- Naming convention for constants (usually `UPPERCASED_GROUP_SLUG_FIELD_NAME`)
- Where to append the new constants

### 2d. Read existing partials

If `partials/` exists, read one or two existing partial files to understand:
- How fields are retrieved (`get_field()` with constants)
- Variable naming and prefixing conventions
- HTML structure and Bootstrap usage patterns

---

## Step 3 — Interview the user (one question at a time)

Collect all required information through a guided conversation before generating anything. Ask each
question individually and wait for the answer before moving to the next. Never ask multiple questions
at once.

Follow this exact sequence:

1. **Group name** — Ask: "What is the name of the field group? (e.g. Person Details)"
   - Derive the group slug automatically from the name. Show it to the user and confirm.

2. **Post type** — Ask: "Which post type(s) should this field group be available for? (e.g. `post`, `page`, `poa_person`)"

3. **Partial folder** — Ask: "Which subfolder inside `partials/` should the template go into? (e.g. `person`)"

4. **First field** — Ask: "Describe the first field. Include: name, type, and any other attributes
   (label, required, placeholder, instructions, default value, etc.) — all in one message."
   - Suggest common types if helpful: `text`, `textarea`, `image`, `repeater`, `relationship`,
     `true_false`, `select`, `wysiwyg`
   - Parse all attributes from the single answer. Do not ask follow-up questions about this field
     unless something is genuinely ambiguous.

5. **Subfields (only if repeater)** — If the field type is `repeater`:
   - Ask: "Describe the first subfield: name, type, and any other attributes — all in one message."
   - After each subfield, ask: "Another subfield for this repeater, or are you done with it?"
   - Repeat until the user says they're done with subfields.

6. **Next field** — After completing each field (and its subfields if any), always ask:
   "Do you need another field, or shall I go ahead and build everything now?"
   - If another field: repeat from step 4 for the new field.
   - If done: proceed to Step 4.

**Rules for the interview:**
- Never skip ahead or batch questions together.
- If the user provides multiple fields upfront in their initial request, acknowledge them, show a
  summary, and ask: "Is this everything, or do you want to add more fields before I start building?"
- Do NOT ask about prefix, key format, or file structure — those come from the project.
- Before starting the build, always show a final summary of the group name, post type(s), partial
  folder, and full field structure, and ask for confirmation.

---

## Step 4 — Generate the files

### acf-json field group JSON

- Generate a unique key: `group_` + alphanumeric suffix of the same length as existing keys
- Generate unique field keys: `field_` + alphanumeric suffix, same length as existing
- Field `name` = `<project-prefix-without-underscore>_<field_name>` (e.g. `gb_person_name`)
- Subfield `name` = `<parent_field_name>_<subfield_name>`
- Location rule: Post type is equal to the specified post type(s)
- Match the JSON structure (key order, `hide_on_screen`, `active`, `position`, `style`, etc.) exactly from the reference files
- Filename: follow the existing naming convention in `acf-json/` — same format, unique suffix

### fields.php additions

Add a clearly-commented block of constants for the new group:
```php
// Group: Group Name
define( 'GROUP_SLUG_FIELD_NAME', 'field_XXXXXXXXXX' );
define( 'GROUP_SLUG_SUBFIELD_NAME', 'field_XXXXXXXXXX' );
```

### partials template

- Path: `partials/<partial-folder>/<partial-name>.php`
- Create `partials/<partial-folder>/` if it does not exist
- Use `<?php` opening, no closing tag
- Follow **WordPress Coding Standards** throughout:
  - Space after control structure keywords: `if (`, `foreach (`, `while (`
  - Spaces inside parentheses for conditions: `if ( $condition )`
  - Spaces around operators
  - Single quotes for strings unless interpolation is needed
  - Tabs for indentation, not spaces
  - Opening braces on the same line
  - `snake_case` for all variable and function names
- Prefix all variables with the project prefix from `phpcs.xml` (e.g. `$gb_`)
- Use `get_field()` with PHP constants, never raw strings
- Use Bootstrap 5 helper classes for the HTML structure
- Use Yoda conditions (`if ( 'value' === $gb_var )`)
- Never use short ternaries — always the full assignment pattern:
  ```php
  $gb_permalink = get_permalink( $gb_post_id );
  $gb_permalink = $gb_permalink ? (string) $gb_permalink : '';
  ```
- Never shadow WordPress global variables (`$post`, `$wp_query`, etc.)
- Always sanitize output: `esc_html()`, `esc_url()`, `esc_attr()`, `wp_kses_post()` as appropriate

---

## Step 5 — Validate with PHP linter and static analysis

After writing all files, run both checks in sequence:

```bash
npm run lint:php
```

Then:

```bash
composer run static
```

If either produces errors, read them carefully, fix the relevant file(s), and re-run **both** until
they both pass clean. Do not ask the user to fix errors — resolve them autonomously. Always re-run
both after any fix to ensure nothing regressed.

---

## Step 6 — Report to the user

Once both checks pass, summarise what was created:
- List all files generated/modified
- Show the group name, slug, post type(s), and field structure
- Note the ACF field group key and any conventions inferred from the project

---

## Coding rules (summary)

| Rule | Detail |
|------|--------|
| Coding standard | WordPress Coding Standards |
| Variable prefix | From `phpcs.xml` |
| Field name prefix | `<project-prefix>_<field>` |
| Subfield name prefix | `<field_name>_<subfield>` |
| Ternaries | Always full, never short |
| Conditions | Yoda style |
| Indentation | Tabs, not spaces |
| Strings | Single quotes unless interpolation needed |
| Output escaping | `esc_html()`, `esc_url()`, `esc_attr()`, `wp_kses_post()` |
| CSS framework | Bootstrap 5 |
| Constants | Always, never raw field strings in templates |
| PHP globals | Never override (`$post`, `$wp_query`, etc.) |
| Validation | `npm run lint:php` + `composer run static`, both must pass |
