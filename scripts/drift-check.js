#!/usr/bin/env node
/**
 * B-04 drift detection. Compares the roadmap ledger to the repository rules:
 *  1. every `done` row must carry a merge reference (PR #n) and evidence;
 *  2. every `in-review` row must carry a branch/PR reference and evidence
 *     (work is complete but not yet merged — the human merge gate is pending);
 *  3. every `todo` row must have no commit reference;
 *  4. AGENTS.md must still state the branch+PR gate (never commit to main).
 * Writes a dated report to ops/drift/latest.md and exits 1 on drift.
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const ledger = fs.readFileSync(path.join(root, 'docs/roadmap-ledger.md'), 'utf8');
const agents = fs.readFileSync(path.join(root, 'AGENTS.md'), 'utf8');

const findings = [];
const rows = ledger.split('\n').filter((l) => /^\| (P|B|V2|A|UI)[\d\-.\u2013]/.test(l));
for (const line of rows) {
  const cells = line.split('|').map((c) => c.trim());
  const [id, , status, commit, evidence] = cells.slice(1);
  if (status === 'done') {
    // pre-PR-workflow rows may reference a commit sha on main instead of a PR
    if (!/PR #\d+/.test(commit) && !/`(main|[0-9a-f]{7,})/.test(commit)) {
      findings.push(`${id}: done but no merge reference (${commit})`);
    }
    if (!evidence || evidence === '—') findings.push(`${id}: done but no evidence recorded`);
  } else if (status === 'in-review') {
    // Work is complete on a branch but the human merge gate has not been passed
    // yet, so a branch name (or PR) is the correct reference, not a merge.
    if (!commit || commit === '—') findings.push(`${id}: in-review but no branch/PR reference`);
    if (!evidence || evidence === '—') findings.push(`${id}: in-review but no evidence recorded`);
  } else if (status === 'todo') {
    if (commit !== '—') findings.push(`${id}: todo but has commit reference (${commit})`);
  } else {
    findings.push(`${id}: unknown status "${status}"`);
  }
}
if (!/commit or push directly to `main`/i.test(agents)) {
  findings.push('AGENTS.md no longer states the branch+PR gate');
}

const report = [
  `# Drift report — ${new Date().toISOString()}`,
  '',
  `- ledger rows checked: ${rows.length}`,
  `- findings: ${findings.length}`,
  ...findings.map((f) => `- DRIFT: ${f}`),
  '',
].join('\n');

fs.mkdirSync(path.join(root, 'ops/drift'), { recursive: true });
fs.writeFileSync(path.join(root, 'ops/drift/latest.md'), report);
process.stdout.write(report);
process.exit(findings.length ? 1 : 0);
