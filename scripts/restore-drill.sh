#!/usr/bin/env bash
# Phase 5: restore drill — backs up the live database, drops the schema,
# restores from the backup, and diffs the row counts. Report lands in
# ops/restore-drill/restore-drill-<timestamp>.md.
set -e
: "${DATABASE_URL:=postgres://palette_canvas:devpassword@localhost:5432/palette_canvas}"
TS="$(date -u +%Y%m%dT%H%M%SZ)"
OUT_DIR="${1:-$(dirname "$0")/../ops/restore-drill}"
BACKUP_DIR="$(dirname "$0")/../ops/backups"
mkdir -p "$OUT_DIR" "$BACKUP_DIR"

# All application tables; schema_migrations is bookkeeping, excluded from the diff.
TABLES=$(psql "$DATABASE_URL" -Atc "SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename <> 'schema_migrations' ORDER BY tablename")

backup="$BACKUP_DIR/pre-drill-$TS.sql"
bash "$(dirname "$0")/backup.sh" "$BACKUP_DIR" "pre-drill-$TS" > /dev/null
echo "backup written: $backup"

{
  echo "# Restore drill $TS"
  echo ""
  echo "database: $DATABASE_URL"
  echo ""
  echo "| table | before | after |"
  echo "| --- | --- | --- |"
} > "$OUT_DIR/restore-drill-$TS.md"

declare -A before
for t in $TABLES; do
  c=$(psql "$DATABASE_URL" -Atc "SELECT COUNT(*) FROM $t")
  before[$t]=$c
done

# Destructive step: drop the schema, then replay the full backup (pg_dump
# output recreates every table, so all tables round-trip — not just a
# hardcoded subset).
psql "$DATABASE_URL" -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public" > /dev/null
psql "$DATABASE_URL" -f "$backup" > /dev/null

ok=true
for t in $TABLES; do
  c=$(psql "$DATABASE_URL" -Atc "SELECT COUNT(*) FROM $t" 2>/dev/null || echo MISSING)
  echo "| $t | ${before[$t]} | $c |" >> "$OUT_DIR/restore-drill-$TS.md"
  if [[ "${before[$t]}" != "$c" ]]; then
    ok=false
  fi
done

if $ok; then
  echo "" >> "$OUT_DIR/restore-drill-$TS.md"
  echo "**result**: restore drill passed — all tables round-tripped." >> "$OUT_DIR/restore-drill-$TS.md"
  echo "drill passed: $OUT_DIR/restore-drill-$TS.md"
else
  echo "drill failed: see $OUT_DIR/restore-drill-$TS.md" >&2
  exit 1
fi
