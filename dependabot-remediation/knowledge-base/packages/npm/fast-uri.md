# fast-uri (npm)

**Tier:** tooling — URI parsing inside ajv, used by stylelint's `table` dependency.
**Fix path:** A — the most frequent alert; ajv's range has always accepted the patch.

## Advisories

| Advisory | Severity | Vulnerable | Patched | Fix path |
|---|---|---|---|---|
| GHSA-v2hh-gcrm-f6hx — host confusion via literal backslash authority delimiter | high | >= 3.0.0, <= 3.1.3 | 3.1.4 | A |
| GHSA-7p8r-x3mc-p8w7 — host confusion via backslash authority introducer | high | >= 3.0.0, < 3.1.5 | 3.1.5 | A |
| GHSA-5jgf-p345-68v8 — host confusion via skipped IDN canonicalization | high | >= 3.1.3, < 3.1.6 | 3.1.6 | A |
| GHSA-fph4-wmhf-6fwf — SSRF via repeated hostname percent-decoding | high | >= 3.1.2, < 3.1.6 | 3.1.6 | A |
| GHSA-f65p-4m7j-42xc — SSRF via malformed IPv6 normalization | high | >= 3.0.0, < 3.1.6 | 3.1.6 | A |
| GHSA-jqff-g426-hqxp — host confusion via percent-encoded scheme normalization | high | >= 3.0.0, < 3.1.6 | 3.1.6 | A |
| GHSA-qw65-cvwx-89v3 — authority injection via an unvalidated port in serialize | high | >= 3.0.0, < 3.1.7 | 3.1.7 | A |
| GHSA-hrr3-gc8f-f4qj — inconsistent host case normalization via percent-encoded octets | moderate | 3.0.0 – 3.1.7 | 3.1.8 | A |
| GHSA-w74x-v6f9-j3xg — URI scheme spoofing via percent-encoded scheme decoding | moderate | >= 3.0.0, < 3.1.9 | 3.1.9 | A |
| GHSA-wjr9-j795-jxcr — host confusion via unchecked WHATWG host canonicalization | moderate | >= 3.1.3, < 3.1.9 | 3.1.9 | A |
| GHSA-xhq7-xmqj-769h — improper path equivalence in relative reference normalization | low | >= 3.0.0, < 3.1.9 | 3.1.9 | A |
| GHSA-333x-w4r6-6crp — scheme injection via an unescaped first-segment colon in suffix references | low | >= 3.0.0, < 3.1.9 | 3.1.9 | A |

## How it reaches the tree

- `stylelint` → `table` → `ajv` 8 → `fast-uri` 3

## Resolution procedure

1. `npm update fast-uri` (or `npm audit fix`).
2. Verify: `npm ls fast-uri --all` shows only the patched version.
3. Expected frontend effect: none (tooling) — G4 identical.

## Traps

- New advisories arrive every few weeks; keep each fix lockfile-only.
- `npm view fast-uri version` shows the 4.x line, but ajv 8 requires `^3.0.1`: `npm update fast-uri`
  correctly stays on the newest 3.x. Never install 4.x directly.
