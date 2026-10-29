#!/usr/bin/env node
// Compare visual fingerprints captured with visual-fingerprint.js.
//
// Usage:
//   node compare-fingerprints.mjs <baseline.json> <candidate.json> [--noise <baseline-recheck.json>] [--limit 40]
//
// --noise is a second capture of the baseline (page reloaded): any element that
// differs between the two baseline captures is unstable (carousels, JS-driven
// motion, lazy content) and is excluded from the verdict, but listed.
// Prints the served CSS/JS builds, then the verdict: VISUALLY IDENTICAL or DIFFERENT.

import { readFileSync } from 'node:fs';

// Computed values that only follow from layout (they move when a neighbour changes).
const DERIVED_PROPERTIES = new Set([
	'height', 'width', 'block-size', 'inline-size', 'perspective-origin', 'transform-origin',
	'top', 'left', 'right', 'bottom', 'inset-block-start', 'inset-block-end', 'inset-inline-start', 'inset-inline-end',
]);

const argv = process.argv.slice(2);
const option = (name, fallback) => {
	const index = argv.indexOf(`--${name}`);
	return -1 === index ? fallback : argv[index + 1];
};
const positional = argv.filter((arg, index) => !arg.startsWith('--') && !argv[index - 1]?.startsWith('--'));
if (2 !== positional.length) {
	console.error('usage: compare-fingerprints.mjs <baseline.json> <candidate.json> [--noise <baseline-recheck.json>] [--limit 40]');
	process.exit(1);
}

const limit = Number(option('limit', 40));
const baseline = load(positional[0]);
const candidate = load(positional[1]);
const noiseCapture = option('noise') ? load(option('noise')) : null;

for (const field of ['viewport', 'media']) {
	if (baseline.meta[field] !== candidate.meta[field]) {
		console.error(`error: captures are not comparable — ${field} ${baseline.meta[field]} vs ${candidate.meta[field]}`);
		process.exit(1);
	}
}

console.log(`${baseline.meta.url} @ ${baseline.meta.viewport} ${baseline.meta.media}`);
console.log(`served builds (bytes) — confirm each capture got the build it was meant to:`);
printResources(baseline.meta.resources, candidate.meta.resources);

const unstable = new Set();
if (noiseCapture) {
	for (const key of diffKeys(baseline, noiseCapture)) {
		unstable.add(key);
	}
}

const differences = diffKeys(baseline, candidate).filter((key) => !unstable.has(key));
const total = Object.keys(baseline.elements).length;
console.log(`\n${total} element/pseudo entries compared; ${unstable.size} unstable (excluded)${noiseCapture ? '' : ' — no noise capture given'}`);
if (total && unstable.size / total > 0.05) {
	console.log('warning: more than 5% of the page is unstable — freeze the moving parts or pick a quieter page before trusting this verdict');
}
if (baseline.meta.documentHeight !== candidate.meta.documentHeight) {
	console.log(`document height: ${baseline.meta.documentHeight} → ${candidate.meta.documentHeight}`);
}

console.log(`\n${differences.length ? 'DIFFERENT' : 'VISUALLY IDENTICAL'}`);

// Root causes first: entries where a real style value changed. Entries whose only
// changes are geometry derived from a neighbour (sizes, origins, boxes) are ripples.
const isRipple = (key) => {
	const left = baseline.elements[key];
	const right = candidate.elements[key];
	if (!left || !right) {
		return false;
	}
	const before = left.style();
	const after = right.style();
	return [...new Set([...before.keys(), ...after.keys()])]
		.filter((name) => before.get(name) !== after.get(name))
		.every((name) => DERIVED_PROPERTIES.has(name));
};
const rootCauses = differences.filter((key) => !isRipple(key));
const ripples = differences.filter(isRipple);
if (differences.length) {
	console.log(`${rootCauses.length} root-cause entr${1 === rootCauses.length ? 'y' : 'ies'}, ${ripples.length} layout ripple(s)`);
}
for (const key of rootCauses.slice(0, limit)) {
	console.log(`\n- ${key}`);
	for (const line of describe(baseline.elements[key], candidate.elements[key])) {
		console.log(`    ${line}`);
	}
}
if (rootCauses.length > limit) {
	console.log(`\n… ${rootCauses.length - limit} more root causes (raise --limit to see them)`);
}
if (ripples.length) {
	console.log(`\nlayout ripples (geometry only, first 10): ${ripples.slice(0, 10).join(' | ')}`);
}
if (unstable.size) {
	console.log(`\nunstable entries (first 10): ${[...unstable].slice(0, 10).join(' | ')}`);
}

function load(path) {
	const raw = JSON.parse(readFileSync(path, 'utf8'));
	// browser_evaluate may wrap the returned value; accept both shapes.
	const capture = raw.result ?? raw;
	const decodeStyle = (id) => {
		const map = new Map();
		for (const pairId of capture.styles[id].split(',')) {
			const pair = capture.pairs[Number(pairId)];
			const colon = pair.indexOf(':');
			map.set(pair.slice(0, colon), pair.slice(colon + 1));
		}
		return map;
	};
	const elements = {};
	for (const [key, [styleId, box]] of Object.entries(capture.elements)) {
		// Style ids are local to each capture, so entries are compared by their decoded text.
		const text = capture.styles[styleId].split(',').map((id) => capture.pairs[Number(id)]).join(';');
		elements[key] = { box, text, style: () => decodeStyle(styleId) };
	}
	return { meta: capture.meta, elements };
}

function diffKeys(a, b) {
	const keys = new Set([...Object.keys(a.elements), ...Object.keys(b.elements)]);
	return [...keys].filter((key) => {
		const left = a.elements[key];
		const right = b.elements[key];
		return !left || !right || left.text !== right.text || JSON.stringify(left.box) !== JSON.stringify(right.box);
	});
}

function describe(left, right) {
	if (!left) {
		return ['only in candidate'];
	}
	if (!right) {
		return ['only in baseline'];
	}
	const lines = [];
	if (JSON.stringify(left.box) !== JSON.stringify(right.box)) {
		lines.push(`box [x, y, w, h]: ${JSON.stringify(left.box)} → ${JSON.stringify(right.box)}`);
	}
	const before = left.style();
	const after = right.style();
	for (const name of new Set([...before.keys(), ...after.keys()])) {
		if (before.get(name) !== after.get(name)) {
			lines.push(`${name}: ${before.get(name) ?? '∅'} → ${after.get(name) ?? '∅'}`);
		}
	}
	return lines;
}

function printResources(before, after) {
	const name = (url) => url.replace(/^[a-z]+:\/\/[^/]+/i, '');
	const rows = new Map();
	for (const entry of before) {
		rows.set(name(entry.url).split('?')[0], [entry.bytes, '—']);
	}
	for (const entry of after) {
		const key = name(entry.url).split('?')[0];
		rows.set(key, [rows.get(key)?.[0] ?? '—', entry.bytes]);
	}
	for (const [path, [a, b]] of rows) {
		console.log(`  ${path}: ${a} → ${b}`);
	}
}
