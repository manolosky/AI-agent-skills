#!/usr/bin/env node
// Compare two build outputs (baseline vs candidate) file by file.
//
// Usage: node compare-bundles.mjs <baseline-dir> <candidate-dir> --out <report-dir>
//
// Run it from the project root: changed CSS/JS files are pretty-printed with
// the project's own prettier (fallback: a naive line splitter) so minified
// output becomes diffable, then compared with `git diff --no-index`.
// Writes <report-dir>/bundle.diff and prints a Markdown summary whose first
// line is the verdict: IDENTICAL or DIFFERENT.

import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, extname, join, relative, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const argv = process.argv.slice(2);
const outIndex = argv.indexOf('--out');
if (3 > argv.length || -1 === outIndex) {
	console.error('usage: compare-bundles.mjs <baseline-dir> <candidate-dir> --out <report-dir>');
	process.exit(1);
}
const outDir = resolve(argv[outIndex + 1]);
const [baselineDir, candidateDir] = argv.filter((_, i) => i !== outIndex && i !== outIndex + 1).map((dir) => resolve(dir));

const PARSERS = { '.css': 'css', '.js': 'babel', '.mjs': 'babel', '.cjs': 'babel' };

const baseline = inventory(baselineDir);
const candidate = inventory(candidateDir);
const paths = [...new Set([...baseline.keys(), ...candidate.keys()])].sort();

const rows = [];
for (const path of paths) {
	const a = baseline.get(path);
	const b = candidate.get(path);
	const status = !a ? 'added' : !b ? 'removed' : a.hash === b.hash ? 'identical' : 'changed';
	rows.push({ path, status, before: a ? a.size : null, after: b ? b.size : null });
}
const different = rows.filter((row) => 'identical' !== row.status);

console.log(different.length ? 'DIFFERENT' : 'IDENTICAL');
console.log(`\n${rows.length} file(s): ${rows.length - different.length} identical, ${different.length} differ\n`);
if (0 === different.length) {
	process.exit(0);
}

console.log('| File | Status | Before | After | Δ bytes |');
console.log('|---|---|---|---|---|');
for (const row of different) {
	const delta = null !== row.before && null !== row.after ? row.after - row.before : '';
	console.log(`| ${row.path} | ${row.status} | ${row.before ?? '—'} | ${row.after ?? '—'} | ${delta} |`);
}

// Normalize changed CSS/JS so the diff is reviewable; source maps and binaries are only listed.
const prettier = await loadPrettier();
let normalizer = prettier ? 'prettier' : 'naive line split (prettier not found in the project)';
const normalizedRoot = join(outDir, 'normalized');
const diffable = different.filter((row) => 'changed' === row.status && PARSERS[extname(row.path)]);
for (const row of diffable) {
	for (const [label, dir] of [['baseline', baselineDir], ['candidate', candidateDir]]) {
		const source = readFileSync(join(dir, row.path), 'utf8');
		const target = join(normalizedRoot, label, row.path);
		mkdirSync(dirname(target), { recursive: true });
		writeFileSync(target, await normalize(source, PARSERS[extname(row.path)]));
	}
}

mkdirSync(outDir, { recursive: true });
const diffFile = join(outDir, 'bundle.diff');
if (diffable.length) {
	const base = join(normalizedRoot, 'baseline');
	const cand = join(normalizedRoot, 'candidate');
	const stat = gitDiff(['--stat=160', base, cand]);
	writeFileSync(diffFile, gitDiff(['-U2', base, cand]));
	console.log(`\nNormalized diff (${normalizer}):\n\n\`\`\`\n${stat.trim()}\n\`\`\``);
	console.log(`\nFull diff: ${diffFile}`);
} else {
	console.log('\nNo CSS/JS content changed (only maps, assets, or added/removed files).');
}

function inventory(root) {
	const map = new Map();
	const walk = (dir) => {
		for (const entry of readdirSync(dir)) {
			const full = join(dir, entry);
			const stats = statSync(full);
			if (stats.isDirectory()) {
				walk(full);
			} else {
				const content = readFileSync(full);
				map.set(relative(root, full).split('\\').join('/'), {
					size: stats.size,
					hash: createHash('sha256').update(content).digest('hex'),
				});
			}
		}
	};
	walk(root);
	return map;
}

async function loadPrettier() {
	try {
		const require = createRequire(join(process.cwd(), 'package.json'));
		const module = await import(pathToFileURL(require.resolve('prettier')).href);
		// prettier's CJS entry exposes its API on `default` when loaded via import().
		return 'function' === typeof module.format ? module : module.default;
	} catch {
		return null;
	}
}

async function normalize(source, parser) {
	const withoutMapComment = source.replace(/\/[*/]# sourceMappingURL=.*$/gm, '');
	if (prettier) {
		try {
			return await prettier.format(withoutMapComment, { parser, printWidth: 120 });
		} catch (error) {
			normalizer = 'naive line split (prettier failed on at least one file)';
			console.error(`prettier failed (${parser}), falling back to naive split: ${error.message}`);
		}
	}
	return withoutMapComment.replace(/([{};])/g, '$1\n');
}

function gitDiff(extra) {
	try {
		return execFileSync('git', ['diff', '--no-index', '--no-color', ...extra], { encoding: 'utf8', maxBuffer: 512 * 1024 * 1024 });
	} catch (error) {
		// `git diff --no-index` exits 1 when the inputs differ; that is the expected path.
		if (1 === error.status) {
			return error.stdout;
		}
		throw error;
	}
}
