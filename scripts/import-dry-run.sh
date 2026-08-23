#!/usr/bin/env bash
# P5-06: legacy-import dry run.
#
# Validates a JSON import file against the expected shape and reports what
# WOULD be inserted — but never writes to the database. Use this to vet a
# legacy export before running the real (future) importer.
#
# Usage:
#   scripts/import-dry-run.sh <file.json>
#
# File shape (all sections optional):
#   {
#     "agencies":  [{ "name": "…", "brands": ["…", …] }, …],
#     "people":    [{ "email": "…", "name": "…", "role": "<role key>" }, …],
#     "projects":  [{ "title": "…", "client": "<brand name>", "template": "<template key>" }, …]
#   }
#
# Exit 0 = file is valid (dry run report printed). Exit 1 = validation errors.
set -u
FILE="${1:-}"
if [ -z "$FILE" ] || [ ! -f "$FILE" ]; then
  echo "usage: $0 <file.json>" >&2
  exit 1
fi

node - "$FILE" <<'EOF'
const fs = require('fs');
const file = process.argv[2];
const ROLES = new Set([
  'platform_owner','operations_director','account_manager','production_lead',
  'creative_contributor','quality_reviewer','agency_admin','agency_contributor',
  'client_approver','third_party_vendor','finance_user',
]);

let doc;
try {
  doc = JSON.parse(fs.readFileSync(file, 'utf8'));
} catch (e) {
  console.error(`FAIL: not valid JSON — ${e.message}`);
  process.exit(1);
}
if (typeof doc !== 'object' || doc === null || Array.isArray(doc)) {
  console.error('FAIL: top level must be an object');
  process.exit(1);
}

const errors = [];
const counts = { agencies: 0, brands: 0, people: 0, projects: 0 };
const emails = new Set();
const brandNames = new Set();

const agencies = doc.agencies ?? [];
if (!Array.isArray(agencies)) errors.push('agencies must be an array');
else agencies.forEach((a, i) => {
  if (!a || typeof a.name !== 'string' || !a.name.trim()) errors.push(`agencies[${i}]: name required`);
  counts.agencies++;
  (a.brands ?? []).forEach((b, j) => {
    if (typeof b !== 'string' || !b.trim()) errors.push(`agencies[${i}].brands[${j}]: must be a non-empty string`);
    else brandNames.add(b);
    counts.brands++;
  });
});

const people = doc.people ?? [];
if (!Array.isArray(people)) errors.push('people must be an array');
else people.forEach((p, i) => {
  if (!p || typeof p.email !== 'string' || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(p.email))
    errors.push(`people[${i}]: valid email required`);
  else {
    const e = p.email.toLowerCase();
    if (emails.has(e)) errors.push(`people[${i}]: duplicate email ${e}`);
    emails.add(e);
  }
  if (!p || typeof p.name !== 'string' || !p.name.trim()) errors.push(`people[${i}]: name required`);
  if (!p || !ROLES.has(p.role)) errors.push(`people[${i}]: role must be one of ${[...ROLES].join(', ')}`);
  counts.people++;
});

const projects = doc.projects ?? [];
if (!Array.isArray(projects)) errors.push('projects must be an array');
else projects.forEach((p, i) => {
  if (!p || typeof p.title !== 'string' || !p.title.trim()) errors.push(`projects[${i}]: title required`);
  if (p && p.client && !brandNames.has(p.client)) errors.push(`projects[${i}]: client '${p.client}' not among imported brands`);
  if (!p || typeof p.template !== 'string' || !p.template.trim()) errors.push(`projects[${i}]: template key required`);
  counts.projects++;
});

console.log('=== import dry run (zero writes) ===');
console.log(`file:      ${file}`);
console.log(`agencies:  ${counts.agencies}`);
console.log(`brands:    ${counts.brands}`);
console.log(`people:    ${counts.people}`);
console.log(`projects:  ${counts.projects}`);
if (errors.length) {
  console.log(`\n${errors.length} validation error(s):`);
  errors.forEach((e) => console.log(`  - ${e}`));
  process.exit(1);
}
console.log('\nOK: file is valid; no rows were inserted (dry run).');
EOF
