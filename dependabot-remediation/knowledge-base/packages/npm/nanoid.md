# nanoid (npm)

**Tier:** build — postcss uses `nanoid/non-secure` only to label inputs that have no file path
(`<input css xxxxxx>`); the bundler always passes one, so the compiled CSS does not depend on it.
**Fix path:** A — postcss 8's range accepts the patch.

## Advisories

| Advisory | Severity | Vulnerable | Patched | Fix path |
|---|---|---|---|---|
| GHSA-2v37-7h3g-55p8 — custom generators can loop indefinitely when size is zero | high | < 3.3.18 | 3.3.18 | A |

## How it reaches the tree

- `postcss` 8 (one copy shared by vite, stylelint and stylelint-order) → `nanoid` 3 (`^3.3.16` in postcss 8.5.25)

## Resolution procedure

1. `npm update nanoid` — moves to the newest 3.x within postcss's range.
2. Verify: `npm ls nanoid --all` shows only ≥ 3.3.18.
3. Expected frontend effect: none — G4 identical (the `lock-diff.mjs` build tier lists it because postcss
   is vite's CSS pipeline).

## Traps

- `npm view nanoid version` shows a newer major (6.x at writing), but postcss 8 requires `^3`: never
  install a later major directly.
