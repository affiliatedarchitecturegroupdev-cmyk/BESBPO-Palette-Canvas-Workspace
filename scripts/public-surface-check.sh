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

# Fetch a path into a file and echo the status code.
fetch() {
  curl -s -o /tmp/pc-public-body.html -w '%{http_code}' --max-time 20 "$BASE$1"
}

# Echo the response body for a path. Uses its own request rather than sharing
# the temp file, so sequential calls in one pipeline cannot clobber each other
# (an earlier revision did exactly that and silently checked one page twice).
body_of() {
  curl -s --max-time 20 "$BASE$1" 2>/dev/null
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
  "Intake to handover" "How it works" "Two ways in" "Boards &amp; views" "Dashboards" \
  "Communication" "AI agents" "Compliance" "Integrations"

# Landing runs without the application chrome (spec §8.2 vs §9).
if body_of "/" | grep -q "Intake inbox"; then
  echo "  FAIL: / — public page rendered the authenticated navigation shell" >&2
  fail=1
else
  echo "  ok: / renders without the app shell"
fi

# The legal pages must carry the specification package's drafted content, and
# the contact address the package says is the real one. Earlier revisions of
# these pages invented a governing law (England and Wales), a data location
# (United Kingdom) and a WCAG version (2.2); assert the real facts instead.
assert_page "/legal/terms" "terms" \
  "Terms of service" "Professional Services Agreement" "agencies@palettecanvas.work"
assert_page "/legal/privacy" "privacy" \
  "Privacy policy" "POPIA" "Render" "agencies@palettecanvas.work"
assert_page "/legal/accessibility" "accessibility" \
  "Accessibility statement" "WCAG 2.1 Level AA" "agencies@palettecanvas.work"
assert_page "/resources" "resources" "Platform status" "Specified, in development" "Recently shipped" "Guides"

# Guard against the specific fabrications that shipped once. Every legal page is
# checked individually: the earlier version of this guard collapsed three pages
# into one clobbered fetch and missed the very text it was written to catch.
for invented in "England and Wales" "WCAG 2.2" "Governed by the laws of" "United Kingdom"; do
  for legal_path in "/legal/terms" "/legal/privacy" "/legal/accessibility"; do
    if body_of "$legal_path" | grep -q -- "$invented"; then
      echo "  FAIL: $legal_path contains invented content: $invented" >&2
      fail=1
    fi
  done
done
if ! body_of "/legal/privacy" | grep -q "UK data"; then
  echo "  FAIL: /legal/privacy — missing the UK-data open item" >&2
  fail=1
else
  echo "  ok: /legal/privacy flags the UK-data open item"
fi

# Sign-up branching (spec §8.3): the two requestable paths, and Guest stated as
# a boundary with no sign-up card at all.
assert_page "/signup" "sign-up branching" "Palette Canvas team" "Partner Agency" "You will be invited"
if body_of "/signup" | grep -q "self-serve"; then
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