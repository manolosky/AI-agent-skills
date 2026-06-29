---
name: scss-bem-architecture
description: >-
  Write or edit CSS/SCSS the project's way: modular BEM inside an ITCSS layered
  Sass architecture (global / mixins / elements / components / blocks / plugins /
  utilities) over Bootstrap 5.3. Use ANY time you create or change styles in such
  a project — adding a component, a button/tab/card variation, a Gutenberg block
  override, plugin styling, an element default — or whenever someone says "style
  this section", "create the styles for X", "add a variation of this component",
  "code the SCSS for this", even without naming SCSS, BEM or ITCSS. Companion to
  bootstrap-markup: that skill handles the HTML and Bootstrap tokens (the helper
  rungs); THIS one handles the custom-class rung — which partial the styles live
  in, written to match the project. Defining rule: never spawn a file per
  variation; every variation of a type lives as a BEM modifier inside that type's
  existing partial, reusing existing files and conventions. Do NOT use for
  projects without this Sass/ITCSS structure, or for Tailwind / plain-CSS work.
---

# SCSS BEM Architecture

This skill enforces one consistent way of writing styles in a layered Sass
project: **modular, BEM, ITCSS, on top of Bootstrap 5.3**. The output should be
indistinguishable from what the project's own author would write — same folders,
same file names, same selector shapes, same formatting.

The single most important habit: **before writing a line of SCSS, read the
project.** Where styles go and how they're written is decided by the existing
architecture, not by a default template. A new file is almost always the wrong
move; the right move is usually opening the file that already owns this type of
thing and adding to it.

Why this matters: a layered BEM/ITCSS project stays lean because each type of
thing has exactly one home. The moment variations start spawning their own files,
or selectors stop following BEM, or styling that Bootstrap could express leaks
into bespoke rules, that single-home discipline is gone and the cascade becomes a
guessing game. This skill exists to keep that discipline.

## Relationship to bootstrap-markup

These two skills divide the work:

- **bootstrap-markup** produces the HTML and resolves visual values to Bootstrap
  helpers/components, adding Sass tokens + map merges when a value is genuinely
  new. It handles rungs 1–3 of its decision ladder.
- **This skill** owns rung 4: when Bootstrap genuinely cannot express something
  and a custom class is needed, this is *how and where* that custom SCSS is
  written — which layer, which partial, what selector, what formatting.

When a task involves both ("build this section"), use bootstrap-markup for the
markup and tokens and this skill for any custom partial the design forces.

## Step 1 — Locate and read the architecture (always first)

Do not assume the structure. Discover it:

1. **Find the styles root.** Look for an `assets/` folder (commonly at the
   theme/project root; search the project if it isn't obvious), then the CSS
   folder inside it. It is usually `css/` even though it contains `.scss`, but it
   may be `scss/` or `sass/` — confirm by listing.
2. **Confirm it's a layered ITCSS/BEM project.** The signature is a set of layer
   folders — typically `global/`, `mixins/`, `elements/`, `components/`,
   `blocks/`, `plugins/`, `utilities/` — plus a manifest partial at the CSS root
   (e.g. `frontend-style.scss`) that `@import`s everything in cascade order.
3. **Read the manifest and the relevant `__index.scss`.** The manifest tells you
   the import order and how Bootstrap is wired in (functions → settings →
   variables → `map-merge` of `$custom-*` maps → Bootstrap maps/utilities →
   project layers). Each layer folder has a `__index.scss` (imported as
   `@import "layer/_index"`) that lists its partials with bare `@import "name"`.
4. **Read one or two existing partials in the target layer** before writing, so
   your output matches the project's exact selector and formatting habits. The
   reference project's conventions always win over the defaults described here.

## Step 2 — Decide the layer (routing ladder)

Walk this ladder and stop at the first match. It decides which folder the styles
belong in:

1. **Gutenberg block override?** Styles targeting WordPress block markup
   (`.wp-block-*`) go in `blocks/`.
2. **Third-party plugin markup?** Styling a plugin's output (ACF, Gravity Forms,
   Algolia, Select2, etc.) goes in `plugins/`.
3. **A base HTML element default?** Class-less or near-class-less styling of base
   elements (`typography`, `table`, `form`, the base `button`/`blockquote`/
   `media`) goes in `elements/`. These often just `@extend` Bootstrap classes so
   un-classed markup inherits the design.
4. **A small reusable helper/override class?** Goes in `utilities/`.
5. **Otherwise it's a reusable site component** — the default and the bulk of the
   work. It goes in `components/` as a BEM block. When in doubt, it's a component.

## Step 3 — One file per type, never per variation

This is the rule the project lives by. Each layer holds partials named for a
**type** of thing (`_tabs.scss`, `_button.scss`, `_accordion.scss`), and **every
variation of that type lives inside that one partial**.

So before writing:

- **Identify the partial that owns this type.** A custom tab for the `practice`
  CPT or a "relationship insights" blog belongs to the *tabs* type → its home is
  `components/_tabs.scss`. A new button treatment belongs to the *button* type,
  not to a new file.
- **If that partial exists → open it and add the variation inside.** Do not
  create a parallel file for the specific case.
- **If it genuinely does not exist** (a brand-new type), create
  `_name.scss` in the layer chosen in Step 2 **and register it** by adding
  `@import "name"` to that layer's `__index.scss`, matching the existing entry
  order/format. You do not touch the manifest — it imports the index, not
  individual partials.
- **Never** create a file per variation. `_tabs-practice.scss` is wrong;
  `.tabs--practice` inside `_tabs.scss` is right.

The point of one-file-per-type is that the file stays the single, growable home
for all of that type's modifiers — easy to find, easy to extend.

## Step 4 — Express the variation in BEM

Map the design to Block / Element / Modifier:

- **Block** = the component/type class (`.tabs`, `.feature-image`).
- **Element** = a part of it, written nested as `&__name` (`&__link`,
  `&__action`).
- **Modifier** = a variation, written nested as `&--name` (`&--practice`,
  `&--person`). Modifiers can sit on the block *or* on an element
  (`&__action` → `&--linkedin`).

Concretely, a tabs variation for "relationship insights" is a `&--relationship-insights`
modifier inside `_tabs.scss`, producing `.tabs--relationship-insights` — not a new
block, not a new file.

When a modifier needs to restyle a **descendant element**, re-state the full
element class nested inside the modifier (e.g. inside `&--person`, write
`.feature-image__img { … }`), because `&` at that point resolves to the modifier
(`.feature-image--person`), not the block.

## Step 5 — Match the writing conventions

Mirror the reference project exactly. The conventions observed in the canonical
project (verify against the actual files, they win if they differ):

- **Indent with tabs.**
- **Main comment only.** The only comment allowed in a style partial is a
  three-line banner at the very top:

  ```scss
  //
  // Tabs.
  //
  ```

  Title-case, trailing period. **No other comments anywhere** — not above a rule,
  not inline, not explaining a value. If a rule needs explaining, the selector
  name and BEM structure should already explain it. (The one exception is the
  settings layer — see Step 7.)
- **Alphabetical property order** within every rule. `align-items` before
  `display` before `transition`. This makes diffs predictable and properties
  findable.
- **Blank line to separate nested rules** from each other and from the
  declarations above them. Direct declarations sit immediately under the opening
  brace; the first nested rule is preceded by a blank line.
- **`@extend` Bootstrap component classes** when the markup is generated and you
  can't add classes to it (e.g. `.wp-block-button__link { @extend .btn; @extend
  .btn-primary; }`). Place any `@extend` lines first, at the top of the rule
  (right under the opening brace), before the alphabetical declarations — the
  alphabetical order applies to property declarations, not to `@extend`/`@include`.
- **Use mixins**: Bootstrap's (`@include media-breakpoint-up(lg)`) and the
  project's own (`@include hover-focus-active`).
- **Tokens over raw values for anything reused or brand-level.** Use the
  project's tokens (`$color-*`, `$font-size-NN`, `$font-weight-*`, `$spacing-*`)
  and Bootstrap's (`$dark`, `$spacer`, `$primary`). Reuse before adding: snap
  dimensional values to the nearest existing token, keep brand colors faithful. A
  genuinely one-off, component-local color (e.g. a social-brand hex) may be
  written as a raw hex inside its modifier — that's acceptable and already in the
  codebase.

### Prefer an existing helper class over a raw declaration

Reuse goes one step further than tokens. Before writing a raw property at all,
check whether the value is already available as a Bootstrap (or project-extended)
**utility class** — and if it is, `@extend` that class instead of declaring the
property. The point is to reuse what already exists rather than re-expressing it.

The clearest case is font size. The project merges `$custom-font-sizes` into
Bootstrap's `$font-sizes`, so a `.fs-12` … `.fs-120` utility scale already exists.
When an element needs 12px type, do this:

```scss
.some-element {

	@extend .fs-12;
}
```

not this:

```scss
.some-element {
	font-size: $font-size-12;
}
```

Both resolve to the same value, but the first reuses the existing helper and keeps
the styling expressed in the project's shared vocabulary. The same applies to any
value that already has a utility behind it — spacing, colors exposed as
`.text-*` / `.bg-*`, font family, etc.: reach for `@extend .utility` before a raw
property.

Order of preference for expressing a value, then, is: an existing utility/helper
class (`@extend`) → an existing token (`$variable`) → a faithful raw value only
when neither exists (and for genuinely one-off, component-local values). When a
helper genuinely doesn't exist for the value, fall back to the token; when even
the token is new and the value will recur or is brand-level, that's a
bootstrap-markup rung-3 job (add the token + map merge so the helper gets
generated) rather than something to hardcode here.

## Step 6 — Sass module system

**Always `@import`, following the project's legacy style.** This kind of project
uses `@import` (often with `~` package resolution) throughout the manifest and the
`__index.scss` files. Do **not** introduce `@use` / `@forward` — it would break
the global availability of Bootstrap variables/mixins the partials rely on and
clash with the established pattern.

## Step 7 — The comments exception: the settings layer

The no-comments rule governs **style partials** (`elements/`, `components/`,
`blocks/`, `plugins/`, `utilities/`) — files that output CSS rules. The
**settings/variables layer** (`global/_variables.scss` and friends) is the one
place where annotations earn their keep: documenting a token's source (`// Figma:
Midnight`), its pixel equivalent (`// 18px`), or why a map is shaped a certain
way. Leave those, and follow the same habit when adding tokens there.

## Output

- **Write directly into the right partial** in the project. If you created a new
  partial, say so and confirm you registered it in the layer's `__index.scss`.
- **Report what landed**: the file(s) edited, the BEM block/modifier added, and
  any tokens you introduced (with the file and map). The user wants to see exactly
  what changed in their Sass.
- If the target layer or partial is genuinely ambiguous, confirm with the user
  before writing rather than guessing.

## Worked example

Task: "Create the tabs variation for the relationship-insights blog."

Resolution:
- It's a variation of the **tabs** type → Step 2 routes it to `components/`,
  Step 3 routes it into the existing `components/_tabs.scss` (the file exists, so
  no new file, no index change).
- It's a **modifier** on the `.tabs` block → `&--relationship-insights`.
- Follow the file's conventions: tabs indentation, alphabetical properties, tokens
  for reused values, no comments inside the rule.

Added inside `components/_tabs.scss`:

```scss
.tabs {

	// …existing tabs styles…

	&--relationship-insights {

		.tabs__link {

			@extend .fs-20;
			color: $color-accent-purple;
			font-weight: $font-weight-regular;

			&.active,
			&:active {
				color: $color-accent-purple;
			}
		}
	}
}
```

Report: "Added the `.tabs--relationship-insights` modifier inside
`components/_tabs.scss`. No new files, no `__index.scss` change. Reused the
`.fs-20` utility (via `@extend`) plus the `$color-accent-purple` and
`$font-weight-regular` tokens; no new tokens needed."
