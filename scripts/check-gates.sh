#!/usr/bin/env bash
# CI quality gate for Palette Canvas monorepo.
# Runs build + permission tests; blocks merge on failure per AGENTS.md.
set -uo pipefail

fail=0

echo "== Building all workspaces =="
npm run build || fail=1

echo "== Permission tests =="
npm test || fail=1

if [ "$fail" -ne 0 ]; then
  echo "Quality gates FAILED" >&2
  exit 1
fi
echo "Quality gates OK"
