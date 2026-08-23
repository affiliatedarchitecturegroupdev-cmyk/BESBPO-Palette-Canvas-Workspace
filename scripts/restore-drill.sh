#!/usr/bin/env bash
# Phase 5: restore drill — backs up the live database, truncates key tables,
# restores from the backup, and diffs the row counts. Report lands in
# ops/restore-drill/restore-drill-<timestamp>.md.
set -e
: "${DATABASE_URL:=postgres://palette_canvas:devpassword@localhost:5432/palette_canvas}"
TS="$(date -u +%Y%m%dT%H%M%SZ)"
OUT_DIR="${1:-$(dirname "$0")/../ops/restore-drill}"
BACKUP_DIR="$(dirname "$0")/../ops/backups"
mkdir -p "$OUT_DIR" "$BACKUP_DIR"

TABLES=(organisation person role_binding agency brand brief project workstream deliverable task comment version approval qa_checklist handover_package handover_item change_request notification audit_event)

backup="$BACKUP_DIR/pre-drill-$TS.sql"
bash "$(dirname "$0")/backup.sh" "$BACKUP_DIR" > /dev/null
echo "backup written: $backup"

# Record row counts before
{
  echo "# Restore drill $TS"
  echo ""
  echo "database: $DATABASE_URL"
  echo ""
  echo "| table | before | after |"
  echo "| --- | --- | --- |"
} > "$OUT_DIR/restore-drill-$TS.md"

declare -A before
for t in "${TABLES[@]}"; do
  c=$(psql "$DATABASE_URL" -Atc "SELECT COUNT(*) FROM $t")
  before[$t]=$c
done

# Destructive step: clear the schema, then replay the backup.
psql "$DATABASE_URL" -c "TRUNCATE $(printf '%s,' "${TABLES[@]}" | sed 's/,$//') CASCADE" > /dev/null
psql "$DATABASE_URL" -f "$backup" > /dev/null

ok=true
for t in "${TABLES[@]}"; do
  c=$(psql "$DATABASE_URL" -Atc "SELECT COUNT(*) FROM $t")
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
