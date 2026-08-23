#!/usr/bin/env bash
# Phase 5: production backup for the Postgres system of record.
# Real tool: pg_dump against DATABASE_URL; output land in ops/backups/.
set -e
: "${DATABASE_URL:=postgres://palette_canvas:devpassword@localhost:5432/palette_canvas}"
TS="$(date -u +%Y%m%dT%H%M%SZ)"
OUT_DIR="${1:-$(dirname "$0")/../ops/backups}"
mkdir -p "$OUT_DIR"
OUT="$OUT_DIR/palette_canvas-$TS.sql"
echo "backing up $DATABASE_URL → $OUT"
PGPASSWORD='' pg_dump "$DATABASE_URL" > "$OUT"
bytes=$(wc -c < "$OUT")
echo "backup: $OUT ($bytes bytes)"
