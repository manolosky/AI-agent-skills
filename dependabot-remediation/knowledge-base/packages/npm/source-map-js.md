# source-map-js (npm)

**Tier:** build — sass, postcss and css-tree use it to generate source maps.
**Fix path:** A — every parent range accepts the patch.

## Advisories

| Advisory | Severity | Vulnerable | Patched | Fix path |
|---|---|---|---|---|
| GHSA-68fv-2mgg-jv7q — event-loop DoS through indexed source-map section offsets | high | >= 1.0.0, < 1.2.2 | 1.2.2 | A |

## How it reaches the tree

- `sass` → `source-map-js`
- `postcss` (via vite, stylelint, stylelint-order) → `source-map-js`
- `stylelint` → `css-tree` → `source-map-js`

## Resolution procedure

1. `npm update source-map-js` (then `npm audit fix` if a nested copy remains).
2. Verify: `npm ls source-map-js --all` shows only ≥ 1.2.2.
3. Expected frontend effect: none — it only affects map generation. G4 must report the CSS/JS output unchanged; any content difference means something else moved.
