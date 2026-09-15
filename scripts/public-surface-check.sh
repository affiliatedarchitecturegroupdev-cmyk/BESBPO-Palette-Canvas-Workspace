#!/usr/bin/env bash
# Public-surface route check (spec §8, §15).
#
# Verifies the routes that must render for a visitor with no session: the
# landing page, the three legal pages, resources, and sign-up branching. Unlike
# the API e2e suite this only asserts that a server-rendered page returns 200
# and carries its expected content, so it can run against `next start` without
# a browser.
#
# Usage: scripts/public-surface-check.sh [base-url]
#   default base-url: http://localhost:3000
#
# Exits non-zero if the server is unreachable or any page is missing content.
set -uo pipefail

BASE="${1:-http://localhost:3000}"
fail=0

fetch() {
  curl -s -o /tmp/pc-public-body.html -w '%{http_code}' --max-time 20 "$BASE$1"
}

# assert_page <path> <label> <marker> [<marker>...]
assert_page() {
  local path="$1" label="$2"; shift 2
  local code
  code="$(fetch "$path")"
  if [ "$code" != "200" ]; then
    echo "  FAIL: $path $label — HTTP $code" >&2
    fail=1
    return
  fi
  local body
  body="$(cat /tmp/pc-public-body.html)"
  local marker ok=1
  for marker in "$@"; do
    if ! printf '%s' "$body" | grep -q -- "$marker"; then
      echo "  FAIL: $path $label — missing marker: $marker" >&2
      ok=0
      fail=1
    fi
  done
  [ "$ok" = 1 ] && echo "  ok: $path ($label)"
}

if ! curl -s -o /dev/null --max-time 10 "$BASE/"; then
  echo "Server unreachable at $BASE — start the web app first (npm run start -w @palette-canvas/web)." >&2
  exit 1
fi

echo "== Public surface ($BASE) =="

assert_page "/" "landing" \
  "Every campaign" "Built for the whole delivery" "How it works" "Two ways in" "Follow along"

# Landing runs without the application chrome (spec §8.2 vs §9).
if printf '%s' "$(fetch "/"; cat /tmp/pc-public-body.html)" | grep -q "Intake inbox"; then
  echo "  FAIL: / — public page rendered the authenticated navigation shell" >&2
  fail=1
else
  echo "  ok: / renders without the app shell"
fi

assert_page "/legal/terms" "terms" "Terms of service" "Governing law" "England and Wales"
assert_page "/legal/privacy" "privacy" "Privacy notice" "Where it is kept" "United Kingdom"
assert_page "/legal/accessibility" "accessibility" "Accessibility" "Known gaps" "WCAG 2.2"
assert_page "/resources" "resources" "Current status" "In development" "Recently shipped"

# Sign-up branching (spec §8.3): three paths, and no guest self-serve.
assert_page "/signup" "sign-up branching" "Employee" "Partner agency" "Client or third party"
if printf '%s' "$(fetch "/signup"; cat /tmp/pc-public-body.html)" | grep -q "self-serve"; then
  echo "  ok: /signup states there is no guest self-serve"
else
  echo "  FAIL: /signup — missing the no-guest-self-serve statement" >&2
  fail=1
fi

rm -f /tmp/pc-public-body.html

if [ "$fail" -ne 0 ]; then
  echo "Public surface check FAILED" >&2
  exit 1
fi
echo "Public surface check OK"