#!/usr/bin/env node
// Diff two lockfiles and classify every changed package by how much it can
// affect what the site ships.
//
// Usage:
//   node lock-diff.mjs <before.lock> <after.lock> [--src assets/js --src assets/css ...]
//
// Works with package-lock.json (v2/v3) and composer.lock.
// npm tiers (highest wins):
//   runtime  — bundled into dist: dependency closure of the packages the theme
//              sources import (bare specifiers found under each --src directory).
//   build    — build pipeline that can change the compiled output (vite, sass,
//              postcss, esbuild, webpack...), plus their dependency closure.
//   tooling  — linters, formatters, hooks: cannot change dist.
// composer tiers: runtime (`packages`) vs tooling (`packages-dev`).

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';

const BUILD_SEEDS = [
	'vite', 'rollup', 'esbuild', 'sass', 'sass-embedded', 'postcss', 'autoprefixer', 'lightningcss',
	'terser', 'cssnano', 'browserslist', 'caniuse-lite', 'webpack', 'laravel-mix', '@babel/core',
	'@vitejs/plugin-legacy',
];
const SOURCE_EXTENSIONS = new Set(['.js', '.mjs', '.cjs', '.jsx', '.ts', '.tsx', '.scss', '.sass', '.css']);

const positional = [];
const srcDirs = [];
const argv = process.argv.slice(2);
for (let i = 0; i < argv.length; i++) {
	if ('--src' === argv[i]) {
		srcDirs.push(argv[++i]);
	} else {
		positional.push(argv[i]);
	}
}
if (2 !== positional.length) {
	console.error('usage: lock-diff.mjs <before.lock> <after.lock> [--src <dir> ...]');
	process.exit(1);
}

const [beforePath, afterPath] = positional;
const before = JSON.parse(readFileSync(beforePath, 'utf8'));
const after = JSON.parse(readFileSync(afterPath, 'utf8'));

if (after.packages && !Array.isArray(after.packages)) {
	reportNpm(before, after);
} else {
	reportComposer(before, after);
}

function reportNpm(beforeLock, afterLock) {
	const specifiers = collectSpecifiers(srcDirs);
	const tiers = new Map();
	for (const lock of [beforeLock, afterLock]) {
		const rootDeps = rootDependencyNames(lock);
		const runtimeRoots = [...specifiers].filter((name) => rootDeps.has(name));
		mergeTier(tiers, closure(lock, runtimeRoots), 'runtime');
		mergeTier(tiers, closure(lock, BUILD_SEEDS), 'build');
	}

	const beforeVersions = versionsByName(beforeLock);
	const afterVersions = versionsByName(afterLock);
	const names = new Set([...beforeVersions.keys(), ...afterVersions.keys()]);
	const changes = [];
	for (const name of names) {
		const oldSet = beforeVersions.get(name) || new Set();
		const newSet = afterVersions.get(name) || new Set();
		if (sameSet(oldSet, newSet)) {
			continue;
		}
		const kind = 0 === oldSet.size ? 'added' : 0 === newSet.size ? 'removed' : 'changed';
		changes.push({ name, kind, from: [...oldSet].join(', '), to: [...newSet].join(', '), tier: tiers.get(name) || 'tooling' });
	}

	console.log(`runtime roots detected from sources: ${srcDirs.length ? [...specifiers].filter((name) => rootDependencyNames(afterLock).has(name)).sort().join(', ') || 'none' : '(no --src given: runtime tier NOT computed)'}\n`);
	printTiers(changes, ['runtime', 'build', 'tooling'], {
		runtime: 'ships in dist — read changelogs, QA the features that use it',
		build: 'can change compiled output — the bundle comparison decides',
		tooling: 'lint/format/hooks only — dist must stay byte-identical (unless sources were edited)',
	});
}

function reportComposer(beforeLock, afterLock) {
	const tierOf = new Map();
	const versions = (lock) => {
		const map = new Map();
		for (const [key, tier] of [['packages', 'runtime'], ['packages-dev', 'tooling']]) {
			for (const pkg of lock[key] || []) {
				map.set(pkg.name, pkg.version);
				tierOf.set(pkg.name, tier);
			}
		}
		return map;
	};
	const beforeVersions = versions(beforeLock);
	const afterVersions = versions(afterLock);
	const changes = [];
	for (const name of new Set([...beforeVersions.keys(), ...afterVersions.keys()])) {
		const from = beforeVersions.get(name) || '';
		const to = afterVersions.get(name) || '';
		if (from !== to) {
			changes.push({ name, kind: !from ? 'added' : !to ? 'removed' : 'changed', from, to, tier: tierOf.get(name) });
		}
	}
	printTiers(changes, ['runtime', 'tooling'], {
		runtime: 'loaded by PHP at runtime if vendor/ is deployed — smoke-test the site',
		tooling: 'require-dev (phpcs, phpstan, rector...) — never ships',
	});
}

function printTiers(changes, order, notes) {
	console.log(`${changes.length} package(s) changed\n`);
	for (const tier of order) {
		const list = changes.filter((change) => tier === change.tier).sort((a, b) => a.name.localeCompare(b.name));
		console.log(`### ${tier} (${list.length}) — ${notes[tier]}\n`);
		if (0 === list.length) {
			console.log('- none\n');
			continue;
		}
		for (const change of list) {
			console.log(`- \`${change.name}\` ${change.kind}: ${change.from || '∅'} → ${change.to || '∅'}`);
		}
		console.log('');
	}
}

function collectSpecifiers(dirs) {
	const found = new Set();
	const patterns = [
		/\bfrom\s+['"]([^'"]+)['"]/g,
		/\bimport\s+['"]([^'"]+)['"]/g,
		/\bimport\(\s*['"]([^'"]+)['"]\s*\)/g,
		/\brequire\(\s*['"]([^'"]+)['"]\s*\)/g,
		/@(?:use|import|forward)\s+['"]([^'"]+)['"]/g,
	];
	for (const dir of dirs) {
		for (const file of walk(dir)) {
			const source = readFileSync(file, 'utf8');
			for (const pattern of patterns) {
				for (const match of source.matchAll(pattern)) {
					const name = packageName(match[1]);
					if (name) {
						found.add(name);
					}
				}
			}
		}
	}
	return found;
}

function packageName(specifier) {
	let spec = specifier.split('?')[0].replace(/^~/, '');
	if (!spec || spec.startsWith('.') || spec.startsWith('/') || /^[a-z]+:/i.test(spec)) {
		return null;
	}
	// Relative-looking node_modules paths, e.g. "../../node_modules/bootstrap/scss/x".
	const nodeModulesIndex = spec.lastIndexOf('node_modules/');
	if (-1 !== nodeModulesIndex) {
		spec = spec.slice(nodeModulesIndex + 'node_modules/'.length);
	}
	const parts = spec.split('/');
	return spec.startsWith('@') ? parts.slice(0, 2).join('/') : parts[0];
}

function walk(dir) {
	const files = [];
	for (const entry of readdirSync(dir)) {
		const full = join(dir, entry);
		if (statSync(full).isDirectory()) {
			files.push(...walk(full));
		} else if (SOURCE_EXTENSIONS.has(extname(entry))) {
			files.push(full);
		}
	}
	return files;
}

function rootDependencyNames(lock) {
	const root = lock.packages[''] || {};
	return new Set(Object.keys({ ...root.dependencies, ...root.devDependencies, ...root.optionalDependencies }));
}

function nameFromPath(path) {
	const index = path.lastIndexOf('node_modules/');
	return path.slice(index + 'node_modules/'.length);
}

function versionsByName(lock) {
	const map = new Map();
	for (const [path, meta] of Object.entries(lock.packages)) {
		if ('' === path || meta.link || !meta.version) {
			continue;
		}
		const name = meta.name || nameFromPath(path);
		if (!map.has(name)) {
			map.set(name, new Set());
		}
		map.get(name).add(meta.version);
	}
	return map;
}

// Resolve `dep` the way Node does from the package installed at `fromPath`.
function resolveInLock(lock, fromPath, dep) {
	let base = fromPath;
	while (true) {
		const candidate = base ? `${base}/node_modules/${dep}` : `node_modules/${dep}`;
		if (lock.packages[candidate]) {
			return candidate;
		}
		if (!base) {
			return null;
		}
		const index = base.lastIndexOf('/node_modules/');
		base = -1 === index ? '' : base.slice(0, index);
	}
}

function closure(lock, seeds) {
	const names = new Set();
	const queue = seeds.map((seed) => resolveInLock(lock, '', seed)).filter(Boolean);
	const seen = new Set();
	while (queue.length) {
		const path = queue.shift();
		if (seen.has(path)) {
			continue;
		}
		seen.add(path);
		const meta = lock.packages[path];
		names.add(meta.name || nameFromPath(path));
		const deps = { ...meta.dependencies, ...meta.optionalDependencies, ...meta.peerDependencies };
		for (const dep of Object.keys(deps)) {
			const resolved = resolveInLock(lock, path, dep);
			if (resolved) {
				queue.push(resolved);
			}
		}
	}
	return names;
}

function mergeTier(tiers, names, tier) {
	const rank = { runtime: 3, build: 2, tooling: 1 };
	for (const name of names) {
		if (!tiers.has(name) || rank[tier] > rank[tiers.get(name)]) {
			tiers.set(name, tier);
		}
	}
}

function sameSet(a, b) {
	return a.size === b.size && [...a].every((value) => b.has(value));
}
