#!/usr/bin/env bash
# Public-surface gate (N2.1).
#
# Runs `scripts/public-surface-check.sh` against a freshly-started web server so
# the check is part of `npm test` rather than an optional script nobody runs.
# It was optional before, which is exactly how three fabricated legal pages
# reached `main`: the script could catch the drift, but nothing invoked it.
#
# The server is rebuilt when the build is missing or older than the sources, so
# the gate renders the tree as it is now. In CI the build step already ran, so
# the staleness check is satisfied and nothing is rebuilt twice.
#
# Usage: scripts/public-surface-gate.sh   (run from the repository root)
set -uo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

NEXT_DIR="apps/web/.next"
LOG="/tmp/pc-web-gate.log"

need_build=0
if [ ! -f "$NEXT_DIR/BUILD_ID" ]; then
  need_build=1
elif [ -n "$(find apps/web/app apps/web/lib packages -type f -newer "$NEXT_DIR/BUILD_ID" -print -quit 2>/dev/null)" ]; then
  need_build=1
fi

if [ "$need_build" = 1 ]; then
  echo "== Building web app for the public-surface gate =="
  if ! npm run build -w @palette-canvas/web > "$LOG" 2>&1; then
    echo "web build failed — see $LOG" >&2
    tail -30 "$LOG" >&2
    exit 1
  fi
fi

# An ephemeral port keeps the gate runnable while a dev server is already up.
PORT="$(node -e "const s=require('net').createServer();s.listen(0,()=>{console.log(s.address().port);s.close();})")"
BASE="http://127.0.0.1:$PORT"

cleanup() {
  if [ -n "${SERVER_PID:-}" ] && kill -0 "$SERVER_PID" 2>/dev/null; then
    kill "$SERVER_PID" 2>/dev/null
    wait "$SERVER_PID" 2>/dev/null
  fi
}
trap cleanup EXIT INT TERM

echo "== Starting web app on $BASE =="
( cd apps/web && PORT="$PORT" npx next start -p "$PORT" > "$LOG" 2>&1 ) &
SERVER_PID=$!

ready=0
for _ in $(seq 1 60); do
  if curl -s -o /dev/null --max-time 5 "$BASE/"; then ready=1; break; fi
  if ! kill -0 "$SERVER_PID" 2>/dev/null; then break; fi
  sleep 1
done

if [ "$ready" != 1 ]; then
  echo "web app did not become ready on $BASE — see $LOG" >&2
  tail -30 "$LOG" >&2
  exit 1
fi

bash scripts/public-surface-check.sh "$BASE"