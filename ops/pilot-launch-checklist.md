# Pilot launch checklist (P5-07)

Twelve readiness items to clear before the pilot goes live. Each item names its
evidence. Do not launch with an unticked box.

| # | Item | Evidence / how to verify |
|---|---|---|
| 1 | Backup tooling runs green | `scripts/backup.sh` exits 0; dump in `ops/backups/` |
| 2 | Restore drill passes | `scripts/restore-drill.sh` exits 0; 27-table diff equal |
| 3 | Migrations apply cleanly on a fresh DB | `npm run migrate -w apps/api` on empty DB, exit 0 |
| 4 | Load test within budget | `scripts/load-test.sh` p95 < 1000 ms, exit 0 |
| 5 | Security headers present | Runbook 05 header check passes |
| 6 | Error wrapper hides internals | 5xx returns uniform JSON, no stack (Runbook 05) |
| 7 | Accessibility sweep done | `ops/accessibility/` audit; 26/26 controls named |
| 8 | Permission tests pass | `npm test` (e2e + permission suite) all green |
| 9 | Support runbooks in place | `ops/runbooks/` covers the 5 topics |
| 10 | Import dry-run validates pilot data | `scripts/import-dry-run.sh <file>` exits 0 |
| 11 | Pilot users + agencies seeded | `GET /identity/users` lists the pilot cohort |
| 12 | Rollback plan agreed | Last-good backup identified; Runbook 02 restore path rehearsed |
