#!/usr/bin/env node
// Split batch captures into one fingerprint file per capture.
//
// Usage: node split-batch.mjs <batch.json> [...more batches]
//
// A batch is the `window.__dump` object written by the batch capture in
// references/frontend-safety.md: { "<state>-<page>-<width>-<media>[-recheck]": fingerprint }.
// Each entry is written as <name>.json next to the batch file, which is then
// removed. Prints one line per capture with the theme dist files it was served
// (bytes@ver): 0 bytes means the browser served it from memory cache, so check
// that its ?ver= matches the intended build (a filemtime-versioned enqueue
// changes it on every build).

import { readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

const batches = process.argv.slice(2);
if (0 === batches.length) {
	console.error('usage: node split-batch.mjs <batch.json> [...more batches]');
	process.exit(1);
}

for (const batchPath of batches) {
	const batch = JSON.parse(readFileSync(batchPath, 'utf8'));
	for (const [name, capture] of Object.entries(batch)) {
		const served = capture.meta.resources
			.filter((entry) => /\/themes\/[^/]+\/dist\//.test(entry.url))
			.map((entry) => {
				const [path, query = ''] = entry.url.split('?');
				const version = new URLSearchParams(query).get('ver') || '-';
				return `${path.split('/').pop()}=${entry.bytes}@${version}`;
			})
			.join(' ');
		writeFileSync(join(dirname(batchPath), `${name}.json`), JSON.stringify(capture));
		console.log(`${name}: ${capture.meta.viewport} ${capture.meta.media} ${Object.keys(capture.elements).length} el | ${served}`);
	}
	rmSync(batchPath);
}
