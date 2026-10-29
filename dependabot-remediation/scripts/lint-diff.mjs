#!/usr/bin/env node
// Compare two lint reports (baseline vs candidate) and list new violations.
//
// Usage:
//   node lint-diff.mjs <before.json> <after.json> [--root-before <dir>] [--root-after <dir>]
//
// Accepts stylelint (`-f json -o <file>`) or ESLint (`-f json -o <file>`) JSON
// reports. Violations are compared by file + rule + message, ignoring line and
// column numbers (they shift with any edit), as a multiset: a rule reported
// twice in a file before and three times after is one new violation. Paths are
// made relative to each report's root (default: the current directory), so a
// baseline linted in a worktree compares with the main checkout.
// Prints the verdict first — NO NEW VIOLATIONS or NEW VIOLATIONS: <n> — and
// exits with 1 when there are new ones.

import { readFileSync } from 'node:fs';
import { relative, resolve } from 'node:path';

const argv = process.argv.slice(2);
const option = (name, fallback) => {
	const index = argv.indexOf(`--${name}`);
	return -1 === index ? fallback : argv[index + 1];
};
const positional = argv.filter((arg, index) => !arg.startsWith('--') && !argv[index - 1]?.startsWith('--'));
if (2 !== positional.length) {
	console.error('usage: node lint-diff.mjs <before.json> <after.json> [--root-before <dir>] [--root-after <dir>]');
	process.exit(2);
}
const [beforePath, afterPath] = positional;

const load = (file, root) => {
	const report = JSON.parse(readFileSync(file, 'utf8'));
	const counts = new Map();
	for (const result of report) {
		// stylelint: { source, warnings[] } · ESLint: { filePath, messages[] }
		const source = result.source ?? result.filePath ?? '';
		const path = relative(resolve(root), resolve(source)).replaceAll('\\', '/');
		for (const entry of result.warnings ?? result.messages ?? []) {
			const rule = entry.rule ?? entry.ruleId ?? 'parse-error';
			const severity = 'number' === typeof entry.severity ? (2 === entry.severity ? 'error' : 'warning') : entry.severity;
			const message = (entry.text ?? entry.message ?? '').replace(/\s+/g, ' ').trim();
			const key = `${path} | ${rule} | ${severity} | ${message}`;
			counts.set(key, (counts.get(key) ?? 0) + 1);
		}
	}
	return counts;
};

const before = load(beforePath, option('root-before', '.'));
const after = load(afterPath, option('root-after', '.'));

const added = [];
const resolved = [];
let unchanged = 0;
for (const key of new Set([...before.keys(), ...after.keys()])) {
	const delta = (after.get(key) ?? 0) - (before.get(key) ?? 0);
	unchanged += Math.min(after.get(key) ?? 0, before.get(key) ?? 0);
	if (0 < delta) {
		added.push([key, delta]);
	} else if (0 > delta) {
		resolved.push([key, -delta]);
	}
}
const total = (list) => list.reduce((sum, [, count]) => sum + count, 0);

console.log(0 === added.length ? 'NO NEW VIOLATIONS' : `NEW VIOLATIONS: ${total(added)}`);
console.log(`\n${unchanged} pre-existing (unchanged), ${total(added)} new, ${total(resolved)} resolved\n`);
for (const [title, list] of [['New', added], ['Resolved', resolved]]) {
	if (0 === list.length) {
		continue;
	}
	console.log(`### ${title}\n`);
	for (const [key, count] of list.sort()) {
		console.log(`- ${1 < count ? `${count}× ` : ''}${key}`);
	}
	console.log('');
}
process.exit(0 === added.length ? 0 : 1);
