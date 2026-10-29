#!/usr/bin/env node
// Build the before/after vulnerability statistics for a remediation run.
//
// Usage:
//   node audit-stats.mjs --npm-before a.json --npm-after b.json \
//     [--composer-before c.json --composer-after d.json] [--dependabot alerts.json]
//
// Inputs are `npm audit --json`, `composer audit --format=json` and the output
// of fetch-dependabot-alerts.sh (open alerts at the start of the run).
// Prints Markdown: a stats table, resolved/remaining advisories, and the status
// each Dependabot alert will have once the branch is merged.

import { readFileSync, existsSync } from 'node:fs';

const SEVERITY_ORDER = ['critical', 'high', 'moderate', 'medium', 'low', 'info'];

const args = parseArgs(process.argv.slice(2));
if (!args['npm-before'] && !args['composer-before'] && !args.dependabot) {
	console.error('usage: audit-stats.mjs --npm-before a.json --npm-after b.json [--composer-before c.json --composer-after d.json] [--dependabot alerts.json]');
	process.exit(1);
}

const npmBefore = loadNpm(args['npm-before']);
const npmAfter = loadNpm(args['npm-after']);
const composerBefore = loadComposer(args['composer-before']);
const composerAfter = loadComposer(args['composer-after']);
const dependabot = args.dependabot ? readJson(args.dependabot).filter((alert) => 'open' === alert.state) : null;

const rows = [];
if (dependabot) {
	const stillPresent = dependabot.filter((alert) => isPresentAfter(alert.security_advisory.ghsa_id, alert.dependency.package.name));
	rows.push([
		'Dependabot open alerts',
		formatCount(dependabot.length, countBy(dependabot, (alert) => alert.security_vulnerability.severity)),
		`${stillPresent.length} expected after merge`,
	]);
}
if (npmBefore || npmAfter) {
	rows.push(['npm audit — vulnerable packages', formatNpmPackages(npmBefore), formatNpmPackages(npmAfter)]);
	rows.push(['npm audit — distinct advisories', formatAdvisories(npmBefore), formatAdvisories(npmAfter)]);
}
if (composerBefore || composerAfter) {
	rows.push(['composer audit — advisories', formatAdvisories(composerBefore), formatAdvisories(composerAfter)]);
}

console.log('| Source | Before | After |');
console.log('|---|---|---|');
for (const row of rows) {
	console.log(`| ${row.join(' | ')} |`);
}

printAdvisoryDelta('npm', npmBefore, npmAfter);
printAdvisoryDelta('composer', composerBefore, composerAfter);

if (dependabot) {
	console.log('\n### Dependabot alerts (open at start)\n');
	console.log('| Alert | Package | Severity | Advisory | After this branch |');
	console.log('|---|---|---|---|---|');
	for (const alert of dependabot) {
		const ghsa = alert.security_advisory.ghsa_id;
		const status = isPresentAfter(ghsa, alert.dependency.package.name) ? 'STILL PRESENT' : 'resolved locally — closes on merge';
		console.log(`| #${alert.number} | ${alert.dependency.package.name} | ${alert.security_vulnerability.severity} | ${ghsa} | ${status} |`);
	}
}

function parseArgs(argv) {
	const parsed = {};
	for (let i = 0; i < argv.length; i += 2) {
		parsed[argv[i].replace(/^--/, '')] = argv[i + 1];
	}
	return parsed;
}

function readJson(path) {
	if (!existsSync(path)) {
		throw new Error(`file not found: ${path}`);
	}
	return JSON.parse(readFileSync(path, 'utf8'));
}

function loadNpm(path) {
	if (!path) {
		return null;
	}
	const report = readJson(path);
	const advisories = new Map();
	for (const vulnerability of Object.values(report.vulnerabilities || {})) {
		for (const via of vulnerability.via) {
			// String entries are "depends on vulnerable X" links, not advisories.
			if ('object' === typeof via) {
				const id = via.url ? via.url.split('/').pop() : String(via.source);
				advisories.set(`${id}|${via.name}`, { id, name: via.name, severity: via.severity, title: via.title });
			}
		}
	}
	return { meta: report.metadata ? report.metadata.vulnerabilities : {}, advisories };
}

function loadComposer(path) {
	if (!path) {
		return null;
	}
	const report = readJson(path);
	const advisories = new Map();
	// composer prints `"advisories": []` when clean and an object keyed by package otherwise.
	for (const [name, list] of Object.entries(Array.isArray(report.advisories) ? {} : report.advisories || {})) {
		for (const advisory of list) {
			const github = (advisory.sources || []).find((source) => 'GitHub' === source.name);
			const id = github ? github.remoteId : advisory.cve || advisory.advisoryId;
			advisories.set(`${id}|${name}`, { id, name, severity: advisory.severity || 'unknown', title: advisory.title });
		}
	}
	return { meta: null, advisories };
}

function isPresentAfter(ghsa, packageName) {
	return [npmAfter, composerAfter].some((report) => report && report.advisories.has(`${ghsa}|${packageName}`));
}

function countBy(items, keyFn) {
	const counts = {};
	for (const item of items) {
		const key = keyFn(item);
		counts[key] = (counts[key] || 0) + 1;
	}
	return counts;
}

function formatCount(total, counts) {
	const parts = SEVERITY_ORDER.filter((severity) => counts[severity]).map((severity) => `${counts[severity]} ${severity}`);
	return parts.length ? `${total} (${parts.join(', ')})` : `${total}`;
}

function formatNpmPackages(report) {
	if (!report) {
		return '—';
	}
	const { total = 0, ...counts } = report.meta;
	return formatCount(total, counts);
}

function formatAdvisories(report) {
	if (!report) {
		return '—';
	}
	const list = [...report.advisories.values()];
	return formatCount(list.length, countBy(list, (advisory) => advisory.severity));
}

function printAdvisoryDelta(label, before, after) {
	if (!before || !after) {
		return;
	}
	const resolved = [...before.advisories].filter(([key]) => !after.advisories.has(key)).map(([, advisory]) => advisory);
	const remaining = [...after.advisories.values()];
	const introduced = [...after.advisories].filter(([key]) => !before.advisories.has(key)).map(([, advisory]) => advisory);
	const line = (advisory) => `- \`${advisory.name}\` — ${advisory.id} (${advisory.severity}): ${advisory.title}`;
	console.log(`\n### ${label} advisories resolved (${resolved.length})\n`);
	console.log(resolved.length ? resolved.map(line).join('\n') : '- none');
	console.log(`\n### ${label} advisories remaining (${remaining.length})\n`);
	console.log(remaining.length ? remaining.map(line).join('\n') : '- none');
	if (introduced.length) {
		console.log(`\n### ${label} advisories INTRODUCED by this branch (${introduced.length}) — investigate before shipping\n`);
		console.log(introduced.map(line).join('\n'));
	}
}
