---
name: bootstrap-markup
description: >-
  Generate or convert HTML markup so it follows Bootstrap 5 (5.3+) conventions:
  Bootstrap helper/component classes first, zero inline styles, and a clean,
  semantic structure. Whenever a needed value (color, font, spacing, background,
  etc.) is not yet available as a helper, the value is added as a Sass variable
  and merged into the relevant Bootstrap map so a helper class is generated, then
  used in the markup. Use this skill ANY time you produce HTML for a Bootstrap 5
  project, integrate HTML from an external source, translate Figma nodes
  (e.g. read via the Figma MCP) into markup, or reproduce a shared screenshot /
  image / mockup as HTML — even if the user only says "build this section",
  "code this design", "turn this Figma frame into HTML", or "make this screenshot
  into a page" without naming Bootstrap. Do NOT use it for projects that don't
  use Bootstrap, or for Tailwind/plain-CSS work.
---

# Bootstrap 5 Markup

This skill enforces a single, consistent way of writing HTML in Bootstrap 5
(5.3+) projects. The goal is markup that any teammate would recognize as "the way
we do it here": expressed through Bootstrap's own components and utility helpers,
with no inline styles and no bespoke CSS unless the framework genuinely cannot
express the design. When the design needs a token that doesn't exist yet (a brand
color, a custom spacing step, a font), the token is added to the project's Sass
configuration so Bootstrap generates the helper class — rather than hardcoding it
into the HTML.

Why this matters: a project that leans on Bootstrap's tokens stays themeable,
consistent, dark-mode-ready (5.3 color modes), and trivial to maintain. The
moment styling leaks into inline `style=""` attributes or one-off classes, that
consistency is gone and every future change becomes manual.

## The core decision flow

For **every** visual value you need to express (a color, a font, a size, a
spacing, a radius, a shadow, a background…), walk this ladder and stop at the
first rung that works:

1. **Is there already a Bootstrap helper or component for it?**
   Use it. Lean fully into Bootstrap's components (grid, card, navbar, nav,
   button, badge, alert, modal, accordion…) and utilities (`.d-flex`, `.gap-*`,
   `.p-*`, `.m-*`, `.text-*`, `.bg-*`, `.fw-*`, `.fs-*`, `.rounded-*`,
   `.shadow-*`, `.align-items-*`…). Most designs are 90% expressible this way.

2. **Does the value already exist as a Bootstrap/Sass variable or token in this
   project?** (a `$brand` color, a `$spacer` step, a theme color, a CSS
   `--bs-*` custom property). If yes, use the helper that maps to it.

3. **The value is genuinely new.** Add it as a Sass variable and merge it into
   the relevant Bootstrap Sass map so the helper class is generated, then use
   that helper in the markup. See `references/value-to-bootstrap.md` for the
   value → helper → map mapping. This is the key move that keeps the HTML clean
   while still supporting the design.

4. **Last resort — Bootstrap cannot express it.** Only when no helper or
   combination of helpers can produce the result (genuinely component-specific
   styling), write a custom class following the project's **BEM** convention in
   the appropriate Sass partial. This should be rare; prefer rungs 1–3.

Never skip to inline styles. There is no rung for `style="..."`.

### Reuse before you create: snap to the nearest token

Rung 3 should not flood the project with near-duplicate tokens. Before adding
anything, check what already exists and reuse it — but the policy differs for
size-like values vs colors, because one is safe to approximate and the other
isn't.

- **Dimensional values** (font sizes, spacing, padding, margin, gaps, radii —
  anything that is a size): **snap to the nearest existing token**. If the source
  value is within ~1–2px of a token you already have, use the existing one. Only
  create a new token when it differs from the nearest existing value by at least
  ~2px, i.e. the difference is real and snapping would visibly distort the design.
  A 12px value sitting next to an existing 13px token reuses the 13px token — you
  do not spawn a one-pixel-off duplicate. (Treat ~2px as a tunable threshold, not
  a hard law; the intent is to avoid pointless near-duplicates.)
- **Colors**: stay **faithful to the source** (Figma / wherever the value comes
  from). Do not nudge a color to snap onto a nearby token — reproduce it exactly.
  The only time you reuse an existing color token instead of adding one is when it
  is an exact or visually indistinguishable match, purely to avoid a literal
  duplicate. A genuinely distinct brand color is added as its own faithful token.

Same spirit for font families: don't register a second family that's
effectively the same as one already configured.

## Hard rules

- **No inline styles, ever.** `style=""` attributes do not appear in the output.
  If you're tempted to write one, you've found a value that belongs in rung 3
  (add a token + helper) or rung 4 (BEM class).
- **Helpers and components before custom classes.** A new bespoke class is a
  signal to stop and check whether a helper, or a small stack of helpers, already
  does the job.
- **Keep the HTML clean and semantic.** Use the right elements (`<button>`,
  `<nav>`, `<section>`, headings in order, `<ul>`/`<li>` for lists). Don't add
  wrapper `<div>`s that exist only to carry styles a utility could carry on the
  real element. Don't pile on redundant classes.
- **Respect responsiveness.** Use Bootstrap's responsive variants
  (`.col-md-*`, `.d-lg-flex`, `.p-md-4`…) rather than fixed values when the
  design implies breakpoints.
- **5.3 color modes.** Prefer theme-color tokens and `--bs-*` variables over raw
  hex so light/dark modes keep working. Adding a color to `$theme-colors`
  (rung 3) gives you mode-aware utilities for free.
- **Edit existing config, don't create files.** The project already has its
  variables/config layer — put every token and merge there. Don't scaffold new
  `.scss` files (confirm with the user if you ever think you must).

## Layout & grid: emulate the design with the 12-column system

Express every layout and column distribution through Bootstrap's grid
(`.container` / `.container-fluid` → `.row` → `.col-{bp}-*`), not through custom
widths. The grid is 12 columns, so each column ≈ 8.333%. Map each region of the
design to the **nearest** column span:

- A full-width region → `.col-12`.
- A two-column 30% / 60% split → the closest grid ratio, e.g. `.col-4` + `.col-8`
  (33% / 66%) or `.col-5` + `.col-7` depending on which is visually closer.
- Prefer a combination whose spans **sum to 12** across the row so columns align
  without wrapping or overflow; when the design's percentages don't divide
  cleanly, pick the nearest set that still totals 12.

Use responsive breakpoints to match how the design reflows (stacked on small,
distributed at `md`/`lg`): `.col-12 .col-md-4` etc. Use grid gutters (`.g-*`,
`.gx-*`, `.gy-*`) for spacing between columns, and `.offset-*` for indented
layouts. Reach for sizing utilities or a custom width only when the grid
genuinely cannot express the layout (e.g. a fixed-pixel sidebar) — and even then,
keep the grid as the outer structure. The percentage → column table is in
`references/value-to-bootstrap.md`.

## When a token is missing: add it to the Sass config

When you reach rung 3, you modify the project's Sass directly and then report
exactly what you changed.

1. **Discover the project's setup first — never scaffold new Sass files.**
   In practice every Bootstrap project already ships its own configuration and
   variables layer (the basic/initial tokens are always there), so your job is to
   *find and extend it*, not to create files. Look in the project's asset/Sass
   folders (commonly `assets/`, `src/scss/`, `resources/sass/`, a theme's `scss/`
   directory, etc.) for where Bootstrap is imported and customized — files like
   `_variables.scss`, `_custom.scss`, `_theme.scss`, or wherever `$theme-colors`,
   `$spacers`, or `$utilities` are already overridden/merged — and add your tokens
   and merges **into those existing files**. **Match the project's existing
   pattern and placement** rather than imposing a new structure or import order.
   Avoid creating any new `.scss` file unless it's truly unavoidable; if you think
   it is, stop and confirm with the user first. If you genuinely can't locate the
   customization layer, ask the user where their Bootstrap overrides live before
   writing anything — don't guess by making a new file.
2. **Add the variable**, give it a clear name (`$brand-primary`, `$spacer-7`…),
   and **merge it into the correct map** so the helper class is generated
   (`map-merge` into `$theme-colors`, `$spacers`, `$font-sizes`, `$utilities`,
   etc.). The mapping is in `references/value-to-bootstrap.md`.
3. **Use the generated helper** in the markup (e.g. you added `brand` to
   `$theme-colors`, so the HTML uses `.bg-brand` / `.text-brand`).
4. **Report the change**: name the file you edited, the variable/merge you added,
   and the helper class it now enables. The user wants to see what landed in
   their Sass.

If the same value recurs, define it once and reuse the helper everywhere — don't
re-add it.

## Translating Figma nodes, screenshots, and external HTML

A very common trigger is reproducing a design as project markup: a Figma node
(read via the Figma MCP), a screenshot/image/mockup the user shares, or a chunk
of external/third-party HTML. The translation is the same decision flow, applied
to whatever the source hands you:

- **From Figma:** read the node's structure and visual properties (fills, fonts,
  spacing, radii, layout). Map each property through the ladder above. Figma will
  hand you raw hex, px paddings, font names — your job is to resolve each to a
  Bootstrap helper, creating tokens (rung 3) only for what's genuinely new. Use
  Auto Layout cues to pick the right flex/grid utilities.
- **From a screenshot / image / mockup:** interpret the image and rebuild it as
  Bootstrap markup. Infer the layout and translate it through the **12-column
  grid** (a side-by-side split → `.row` with the nearest `col-*` spans; stacked
  blocks → stacked rows). Identify components (cards, navbars, buttons, badges…)
  and use the real Bootstrap component. Read colors, spacing, and fonts as
  faithfully as the image allows, then apply the ladder: sample colors as
  precisely as you can and keep them faithful (they're estimates from pixels, so
  say so if you're unsure); snap sizes/spacing to the nearest existing token.
  Because pixel-exact values aren't recoverable from an image, lean on Bootstrap's
  scale and note any value you approximated so the user can correct it.
- **From external HTML:** treat its classes and inline styles as throwaway.
  Strip every inline style and bespoke class, then rebuild the structure with
  Bootstrap components and helpers. Keep the semantics, drop the styling cruft.

In all cases the deliverable is clean Bootstrap markup plus any Sass token
additions the design required.

## Output

- **Write the markup to the project** (the target file or partial implied by the
  task — a Blade/PHP template, an HTML partial, a component file). If the target
  location is ambiguous, confirm it with the user before writing.
- **Apply Sass changes directly** in the project's customization layer, and list
  them back to the user.
- Keep the user's stack conventions in mind: PHP/Laravel/WordPress markup,
  Sass + BEM for any custom class, Bootstrap 5+ for everything it can cover.

## Example (abbreviated)

Source (Figma node / raw): a card with background `#0B5FFF`, 24px padding all
around, a 20px-radius, white bold title.

Resolution:
- `#0B5FFF` isn't a known token → add `$brand-primary: #0B5FFF;` and
  `$theme-colors: map-merge($theme-colors, ("brand": $brand-primary));` in
  `_variables.scss` → use `.bg-brand`.
- 24px padding → Bootstrap's `$spacer * 1.5` = `.p-4` (1.5rem). Use `.p-4`.
- 20px radius isn't a default step → either `.rounded-4` if it matches, or merge
  a value into the radius utility; here `.rounded-4` (Bootstrap `$border-radius`
  scale) fits → use `.rounded-4`.
- White bold title → `.text-white .fw-bold`.

Output markup (no inline styles, all helpers):

```html
<div class="card bg-brand text-white rounded-4 p-4 border-0">
  <h3 class="card-title fw-bold mb-0">Title</h3>
</div>
```

Plus a report: "Added `$brand-primary` and merged `brand` into `$theme-colors`
in `assets/scss/_variables.scss`, enabling `.bg-brand`/`.text-brand`."

See `references/value-to-bootstrap.md` for the full value → helper → Sass map
reference.
