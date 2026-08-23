# Runbook 02 — backup & restore drill

## Backup
```
scripts/backup.sh
```
- Produces a timestamped dump under `ops/backups/` and exits 0 on success.
- Schedule daily (cron) during the pilot; retain per the retention policy.

## Restore drill (verify a backup actually restores)
```
scripts/restore-drill.sh ops/backups/<file>.dump
```
- Restores into a throwaway database, diffs the 27-table row counts against the
  source, and exits non-zero on any mismatch.
- Run after every schema change and at least weekly.

## If a restore is needed for real
1. Stop the API (`kill <api pid>`).
2. `pg_restore --clean --if-exists -d "$DATABASE_URL" ops/backups/<file>.dump`
3. Restart the API, then run the e2e suite (`npm test`) as a smoke check.

## Notes
- The drill is the safety net: a backup that has never been restored is not a backup.
- Drill evidence from P5-01 is in `ops/backup/`.
