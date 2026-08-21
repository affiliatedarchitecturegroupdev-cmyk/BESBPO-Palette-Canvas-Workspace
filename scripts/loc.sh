#!/usr/bin/env bash
# Count meaningful lines of code in source artifacts (excludes deps/build output and prototypes).
set -u
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

CODE=(-name '*.ts' -o -name '*.tsx' -o -name '*.js' -o -name '*.css' -o -name '*.sql' -o -name '*.json' -o -name '*.md' -o -name '*.sh')
NOGEN=(-not -path '*/node_modules/*' -not -path '*/.next/*' -not -path '*/dist/*' -not -path '*/.test-dist/*' -not -path '*/.seed-dist/*' -not -path '*/.git/*' -not -path '*/prototypes/*')

total=0
echo '--- by area ---'
for area in apps/web apps/api packages docs scripts; do
  if [[ -d "$area" ]]; then
    cnt=$(find "$area" \( "${CODE[@]}" \) "${NOGEN[@]}" -type f -print0 | xargs -0 cat | wc -l)
    echo "$area: $cnt"
    total=$((total + cnt))
  fi
done
echo '---'
FILES=$(find . \( "${CODE[@]}" \) "${NOGEN[@]}" -type f | wc -l)
echo "files: $FILES"
echo "TOTAL LOC: $total"
