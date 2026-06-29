---
name: acf-custom-block
description: >
  Create a custom Gutenberg block using ACF (Advanced Custom Fields) 6.2+ with JSON as the source
  of truth. Use this skill whenever the user asks to create, add, or build a new ACF block, Gutenberg
  block, or custom block in a WordPress project — even if they just say "make a block for X" or
  "add a new block". This skill handles the full workflow: reading the project structure, generating
  block.json, markup.php, the ACF field group JSON, and registering constants in fields.php.
---

# ACF Custom Block Skill

## Overview

Build a Gutenberg block with ACF using JSON as the single source of truth, following the project's
existing conventions. The output is always three files + two file updates:

1. `includes/blocks/<block-slug>/block.json` — Gutenberg + ACF block registration
2. `includes/blocks/<block-slug>/markup.php` — server-side render template
3. `acf-json/<field-group-name>.json` — ACF Field Group definition
4. `includes/fields.php` — append new constants for every new field and subfield
5. `includes/blocks.php` — register the block in `ALLOWED_BLOCKS` and `register_blocks()`

---

## Step 1 — Verify project compatibility

Before doing anything else, confirm this project uses the expected structure. Check for the presence
of all the following:

| Path | Purpose |
|------|---------|
| `phpcs.xml` | Project prefix source |
| `includes/blocks/` | Block folder structure |
| `includes/blocks/example-block/block.json` | Confirms JSON-based block registration (ACF 6.2+) |
| `acf-json/` | ACF JSON sync folder |
| `includes/fields.php` | Constants file |

**If any of these paths is missing, stop immediately.** Do not generate any files. Tell the user
clearly what was not found, and explain that this skill expects:
- ACF blocks registered via `block.json` (ACF 6.2+ metadata style)
- Blocks located under `includes/blocks/<block-slug>/`
- ACF field groups synced as JSON in `acf-json/`
- A `phpcs.xml` at the project root with a defined prefix
- A `fields.php` constants file at `includes/fields.php`

Suggest the user check their project structure, or update the skill if their setup differs.

---

## Step 2 — Gather project context

Before writing any code, read the project to understand its conventions. Do all of this before asking
the user anything.

### 2a. Read the project prefix

Open `phpcs.xml` and extract the short project prefix (e.g. `gb_` for Graham & Bell). This prefix
must be used for all PHP variables in `markup.php` and all field name prefixes.

### 2b. Read the example block

Read every file inside `includes/blocks/example-block/` to understand:
- The exact keys and structure of `block.json`
- How the PHP template uses ACF field constants
- Yoda conditions, variable naming, Bootstrap classes usage

### 2c. Scan all existing blocks

List all folders in `includes/blocks/` (skip `example-block`). For each block, read:
- `block.json` — to learn the pattern for `name`, `title`, `category`, `icon`, `acf` settings
- `markup.php` — to reinforce PHP coding conventions

### 2d. Read the ACF JSON reference

List all files in `acf-json/`. Read one or two existing field group JSON files to learn:
- Key naming pattern (e.g. `group_XXXXXXXXXX`, `field_XXXXXXXXXX`)
- The length and format of the trailing alphanumeric suffix — keep the same length
- Location rules structure: `"block" "==" "gb/<block-slug>"`
- Field structure: label, name, type, prefix conventions

### 2e. Read fields.php

Read `includes/fields.php` to understand:
- How constants are defined (`define( 'CONST_NAME', 'field_name' )`)
- Naming convention for constants (usually `UPPERCASED_BLOCK_SLUG_FIELD_NAME`)
- Where to append the new constants

---

## Step 3 — Interview the user (one question at a time)

Collect all required information through a guided conversation before generating anything. Ask each
question individually and wait for the answer before moving to the next. Never ask multiple questions
at once.

Follow this exact sequence:

1. **Block name** — Ask: "What is the name of the block? (e.g. Team Member Card)"
   - Derive the block slug automatically from the name. Show it to the user and confirm.

2. **Post type** — Ask: "Which post type(s) should this block be available for? (e.g. `post`, `page`, `poa_person`)"

3. **First field** — Ask: "Describe the first field. Include: name, type, and any other attributes
   (label, required, placeholder, instructions, default value, etc.) — all in one message."
   - Suggest common types if helpful: `text`, `textarea`, `image`, `repeater`, `relationship`,
     `true_false`, `select`, `wysiwyg`
   - Parse all attributes from the single answer. Do not ask follow-up questions about this field
     unless something is genuinely ambiguous.

4. **Subfields (only if repeater)** — If the field type is `repeater`:
   - Ask: "Describe the first subfield: name, type, and any other attributes — all in one message."
   - After each subfield, ask: "Another subfield for this repeater, or are you done with it?"
   - Repeat until the user says they're done with subfields.

5. **Next field** — After completing each field (and its subfields if any), always ask:
   "Do you need another field, or are you ready to define the layout?"
   - If another field: repeat from step 3 for the new field.
   - If done: proceed to step 6 (layout).

6. **Layout** — Once all fields are collected, ask three sub-questions in sequence.
   Present the options listed below for each one; the user may pick an option, combine options,
   or describe something not on the list — all are valid.

   **6a. Main container** — Ask:
   "How should the main container of the block behave? (Pick one or describe your own)"

   Present these options:
   - **A** — Full-width background, boxed content (`container-fluid` wrapper + inner `container`)
   - **B** — Full-width background, full-width content (`container-fluid` only)
   - **C** — Boxed/contained block (`container` only, no full-bleed background)
   - **D** — Full-width background with a background image or video (`position-relative`, overlay layer)
   - **E** — Card / panel style (bordered, rounded, with inner padding)
   - **F** — Something else (user describes it)

   Also ask as part of the same message:
   - Background: none / solid color / gradient / image / video?
   - Any section padding, min-height, or vertical rhythm to note?

   Derive Bootstrap container and utility classes from the answer.

   **6b. Content layout** — Ask:
   "How is the content arranged inside the block? (Pick one or describe your own)"

   Present these options:
   - **A** — Single column, stacked vertically (no grid needed)
   - **B** — Two equal columns (`col-md-6 / col-md-6`)
   - **C** — Content + sidebar (`col-md-8 / col-md-4` or `col-md-4 / col-md-8`)
   - **D** — Three equal columns (`col-md-4` × 3)
   - **E** — Four equal columns (`col-md-3` × 4)
   - **F** — Asymmetric split (user specifies widths, e.g. 5/7, 3/9)
   - **G** — Card grid / repeater loop (specify how many cards per row per breakpoint)
   - **H** — Stacked sections / multiple rows (user describes each row separately)
   - **I** — Something else (user describes it)

   Clarify breakpoint behaviour if not obvious (e.g. stacks to single column on mobile).
   Derive the Bootstrap grid structure (`row`, `col-*`, `col-md-*`, `g-*`, etc.) from the answer.

   **6c. Content per area** — For each column, row, or card identified in 6b, ask in turn:
   "What goes inside [Area N — e.g. 'left column' / 'card' / 'top row']?
   Here are the fields available: [list the fields defined in the interview].
   List them in the order they should appear, and add any static elements
   (e.g. decorative icons, dividers, hardcoded labels) that are not ACF fields."

   For each element the user places, also determine:
   - HTML tag (`<h2>`, `<p>`, `<a>`, `<img>`, `<ul>`, etc.)
   - Bootstrap utility classes if mentioned or implied
   - Whether it is conditionally rendered (only shown if the field has a value)
   - Whether it needs an ARIA attribute or accessibility consideration

   After all three sub-questions are answered, show a full layout summary
   (container type → grid structure → content map per area) and ask for confirmation
   before proceeding to Step 4.

**Rules for the interview:**
- Never skip ahead or batch questions together.
- If the user provides multiple fields upfront in their initial request, acknowledge them, show a
  summary, and ask: "Is this everything, or do you want to add more fields before I define the layout?"
- Do NOT ask about prefix, key format, file structure, or Bootstrap grid classes — derive those from
  the project and the layout description.
- Before starting the build, always show a final summary of the block name, slug, post type(s),
  full field structure, and the interpreted layout, and ask for confirmation.

---

## Step 4 — Generate the files

### block.json

Follow the exact key order and values from the example block. Always include:
- `"name": "gb/<block-slug>"` (use the `gb/` namespace or whatever the example uses)
- `"acf": { "mode": "...", "renderTemplate": "markup.php" }` matching the example
- `"supports"` and other keys exactly as in the example unless the user specifies otherwise
- Restrict to the specified post types

### markup.php

- Use `<?php` opening, no closing tag
- Follow **WordPress Coding Standards** throughout:
  - Space after control structure keywords: `if (`, `foreach (`, `while (`
  - Space inside parentheses for conditions: `if ( $condition )`
  - Spaces around operators: `$a = $b + $c`
  - Single quotes for strings unless interpolation is needed
  - Tabs for indentation, not spaces
  - Opening braces on the same line: `if ( $condition ) {`
  - `snake_case` for all variable and function names
- Prefix all variables with the project prefix from `phpcs.xml` (e.g. `$gb_`)
- Use `get_field()` with PHP constants, never raw strings
- Use Bootstrap 5 helper classes
- Use Yoda conditions (`if ( 'value' === $gb_var )`)
- Never use short ternaries — always use the full assignment pattern:
  ```php
  $gb_permalink = get_permalink( $gb_post_id );
  $gb_permalink = $gb_permalink ? (string) $gb_permalink : '';
  ```
- Never shadow WordPress global variables (`$post`, `$wp_query`, etc.)
- Always sanitize output with `esc_html()`, `esc_url()`, `esc_attr()`, or `wp_kses_post()` as appropriate

### ACF Field Group JSON

- Generate a unique key: `group_` + alphanumeric suffix of the same length as existing keys
- Generate unique field keys: `field_` + alphanumeric suffix, same length as existing
- Field `name` = `<project-prefix-without-underscore>_<field_name>` (e.g. `gb_team_name`)
- Subfield `name` = `<parent_field_name>_<subfield_name>`
- Location rule: Block is equal to `gb/<block-slug>`
- Match the JSON structure (key order, `hide_on_screen`, `active`, etc.) from the reference files
- Filename: follow the existing naming convention in `acf-json/`

### fields.php additions

Add a clearly-commented block of constants for the new block:
```php
// Block: Block Name
define( 'BLOCK_SLUG_FIELD_NAME', 'field_XXXXXXXXXX' );
define( 'BLOCK_SLUG_SUBFIELD_NAME', 'field_XXXXXXXXXX' );
```

### blocks.php updates

`includes/blocks.php` must be updated in **two places**:

1. **`ALLOWED_BLOCKS` constant** — append the new block slug:
   ```php
   'namespace/block-slug',
   ```
   Use the same namespace prefix as the existing custom blocks (e.g. `bracewell-prg/`, `gb/`).

2. **`register_blocks()` function** — append a `register_block_type()` call:
   ```php
   register_block_type( THEME_BLOCKS_PATH . 'block-slug' );
   ```
   Use the exact path constant already used by the other blocks in the same function.

Read `includes/blocks.php` before editing to determine the correct namespace prefix and path constant name.

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

If either produces errors, read them carefully, fix the relevant file(s), and re-run **both** until they both pass clean. Do not ask the user to fix errors — resolve them autonomously. Always re-run both after any fix to ensure nothing regressed.

---

## Step 6 — Report to the user

Once lint passes, summarise what was created:
- List all files generated/modified
- Show the block name, slug, and field structure
- Note the ACF field group key and any conventions you inferred from the project

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
