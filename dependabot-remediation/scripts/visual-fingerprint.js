// Visual fingerprint of the current page, for the frontend-unchanged gate.
//
// Init script: defines window.__visualFingerprint() in every page the browser
// context opens. Register it once per browser session (again after
// browser_close) with the Playwright MCP `browser_run_code_unsafe` tool:
//   async (page) => { await page.context().addInitScript({ path: '<SKILL_DIR>/scripts/visual-fingerprint.js' }); }
// then capture in batches as described in references/frontend-safety.md.
// window.__visualFingerprint() records, for every rendered element and its
// ::before/::after, the full computed style plus the layout box, and which
// CSS/JS build was served. It only defines a function: it changes no style.
// Compare captures with compare-fingerprints.mjs.
window.__visualFingerprint = async () => {
	const settle = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

	// Let fonts, images and late layout settle so captures are comparable.
	await document.fonts.ready;
	await Promise.all(
		[...document.images]
			.filter((image) => !image.complete)
			.map((image) => new Promise((resolve) => {
				image.addEventListener('load', resolve, { once: true });
				image.addEventListener('error', resolve, { once: true });
			})),
	);
	window.scrollTo(0, 0);
	await settle(1500);

	// Freeze CSS animations/transitions at t=0; JS-driven motion is caught by the noise capture.
	for (const animation of document.getAnimations()) {
		try {
			animation.pause();
			animation.currentTime = 0;
		} catch (error) {
			// Some animations cannot be seeked; the noise capture covers them.
		}
	}

	const pairs = [];
	const pairIndex = new Map();
	const styles = [];
	const styleIndex = new Map();
	const intern = (index, list, value) => {
		if (!index.has(value)) {
			index.set(value, list.length);
			list.push(value);
		}
		return index.get(value);
	};
	const serialize = (computed) => {
		const ids = [];
		for (let i = 0; i < computed.length; i++) {
			const name = computed[i];
			ids.push(intern(pairIndex, pairs, `${name}:${computed.getPropertyValue(name)}`));
		}
		return intern(styleIndex, styles, ids.join(','));
	};
	const pathOf = (element) => {
		const parts = [];
		for (let node = element; node && 1 === node.nodeType; node = node.parentElement) {
			let position = 1;
			for (let sibling = node.previousElementSibling; sibling; sibling = sibling.previousElementSibling) {
				if (sibling.tagName === node.tagName) {
					position++;
				}
			}
			parts.unshift(`${node.tagName.toLowerCase()}:${position}`);
		}
		return parts.join('>');
	};
	const round = (value) => Math.round(value * 10) / 10;

	const skip = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEMPLATE']);
	const elements = {};
	for (const element of [document.documentElement, document.body, ...document.body.querySelectorAll('*')]) {
		if (skip.has(element.tagName)) {
			continue;
		}
		const key = pathOf(element);
		const box = element.getBoundingClientRect();
		elements[key] = [
			serialize(getComputedStyle(element)),
			[round(box.left + window.scrollX), round(box.top + window.scrollY), round(box.width), round(box.height)],
		];
		for (const pseudo of ['::before', '::after']) {
			const computed = getComputedStyle(element, pseudo);
			if ('none' !== computed.content && 'normal' !== computed.content) {
				elements[key + pseudo] = [serialize(computed), null];
			}
		}
	}

	const resources = performance
		.getEntriesByType('resource')
		.filter((entry) => /\.(css|js)(\?|$)/.test(entry.name))
		.map((entry) => ({ url: entry.name, bytes: entry.decodedBodySize }));

	return {
		meta: {
			url: location.href,
			viewport: `${window.innerWidth}x${window.innerHeight}`,
			media: window.matchMedia('print').matches ? 'print' : 'screen',
			documentHeight: document.documentElement.scrollHeight,
			capturedAt: new Date().toISOString(),
			resources,
		},
		pairs,
		styles,
		elements,
	};
};
