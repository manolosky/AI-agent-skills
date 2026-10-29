#!/usr/bin/env bash
# Fetch Dependabot alerts for a GitHub repository, save them as one JSON array
# and print a triage table.
#
# Usage: fetch-dependabot-alerts.sh <owner/repo | github-url> <out.json> [state]
#   state: open (default) | fixed | dismissed | auto_dismissed | all
#
# Auth: ONLY a read-only fine-grained personal access token taken from the
# GITHUB_READONLY_TOKEN environment variable (permissions: Dependabot alerts
# read-only + Metadata read-only). On Windows, when the shell did not inherit
# it (the editor was not fully restarted after `setx`), it is read from the
# user environment. The script deliberately never falls back to Git Credential
# Manager or `gh`: those hold the user's push-capable credentials, and GCM
# opens an account picker when several accounts exist.
# Every request is an explicit GET; the script never writes to GitHub.
set -euo pipefail

input="${1:?usage: fetch-dependabot-alerts.sh <owner/repo|github-url> <out.json> [state]}"
out="${2:?missing output path for the alerts JSON}"
state="${3:-open}"

# Accept a full GitHub URL (e.g. https://github.com/org/repo/security/dependabot) or owner/repo.
repo="$(printf '%s' "$input" | sed -E 's#^https?://github\.com/##; s#\.git$##' | cut -d/ -f1-2)"

token="${GITHUB_READONLY_TOKEN:-}"
# A token stored with `setx` lives in the Windows user environment; editors that
# were only reloaded keep the old environment, so read it from there directly.
if [ -z "$token" ] && command -v powershell.exe >/dev/null 2>&1; then
	token="$(powershell.exe -NoProfile -Command "[Environment]::GetEnvironmentVariable('GITHUB_READONLY_TOKEN','User')" 2>/dev/null | tr -d '\r\n')"
fi
if [ -z "$token" ]; then
	echo "error: GITHUB_READONLY_TOKEN is not set (neither in this shell nor in the Windows user environment)." >&2
	echo "Create a fine-grained token (Dependabot alerts: read-only, Metadata: read-only) and export it." >&2
	exit 1
fi
# Fine-grained tokens start with github_pat_. Classic (ghp_) and OAuth (gho_, the
# kind GCM and gh store) tokens carry repo-wide write scopes, so they are refused.
case "$token" in
github_pat_*) ;;
*)
	echo "error: GITHUB_READONLY_TOKEN must be a fine-grained token (github_pat_...); classic/OAuth tokens are write-capable." >&2
	exit 1
	;;
esac

query="per_page=100"
if [ "all" != "$state" ]; then
	query="$query&state=$state"
fi
url="https://api.github.com/repos/$repo/dependabot/alerts?$query"

tmp_dir="$(mktemp -d)"
trap 'rm -rf "$tmp_dir"' EXIT

# The alerts endpoint paginates with an `after` cursor exposed in the Link header.
page=0
while [ -n "$url" ]; do
	page=$((page + 1))
	page_file="$tmp_dir/page-$(printf '%03d' "$page").json"
	status="$(curl -sS --request GET --max-time 60 -o "$page_file" -D "$tmp_dir/headers" -w '%{http_code}' \
		-H "Authorization: Bearer $token" \
		-H 'Accept: application/vnd.github+json' \
		-H 'X-GitHub-Api-Version: 2022-11-28' \
		"$url")"
	if [ "200" != "$status" ]; then
		echo "error: GitHub API returned HTTP $status for $url" >&2
		cat "$page_file" >&2
		exit 1
	fi
	url="$(grep -i '^link:' "$tmp_dir/headers" | tr ',' '\n' | grep 'rel="next"' | sed -E 's/.*<([^>]+)>.*/\1/' || true)"
done

node - "$out" "$repo" "$state" "$tmp_dir"/page-*.json <<'NODE'
const fs = require('fs');
const [out, repo, state, ...pages] = process.argv.slice(2);
const alerts = pages.flatMap((file) => JSON.parse(fs.readFileSync(file, 'utf8')));
fs.writeFileSync(out, JSON.stringify(alerts, null, 2));

const bySeverity = {};
for (const alert of alerts) {
	const severity = alert.security_vulnerability.severity;
	bySeverity[severity] = (bySeverity[severity] || 0) + 1;
}
const severities = Object.entries(bySeverity).map(([name, count]) => `${count} ${name}`).join(', ');
console.log(`${repo} — ${alerts.length} alert(s) [state: ${state}]${severities ? ` (${severities})` : ''}`);
console.log(`saved to ${out}\n`);
if (0 === alerts.length) {
	process.exit(0);
}

const rows = alerts.map((alert) => {
	const { dependency, security_vulnerability: vuln, security_advisory: advisory } = alert;
	return [
		`#${alert.number}`,
		alert.state,
		dependency.package.ecosystem,
		dependency.package.name,
		dependency.manifest_path,
		`${dependency.scope || '?'}/${dependency.relationship || '?'}`,
		vuln.severity,
		vuln.vulnerable_version_range,
		vuln.first_patched_version ? vuln.first_patched_version.identifier : 'NO PATCH',
		advisory.ghsa_id,
		advisory.summary,
		alert.created_at.slice(0, 10),
	];
});
const header = ['#', 'state', 'ecosystem', 'package', 'manifest', 'scope/relation', 'severity', 'vulnerable', 'patched', 'advisory', 'summary', 'created'];
console.log(`| ${header.join(' | ')} |`);
console.log(`|${header.map(() => '---').join('|')}|`);
for (const row of rows) {
	console.log(`| ${row.join(' | ')} |`);
}
NODE
