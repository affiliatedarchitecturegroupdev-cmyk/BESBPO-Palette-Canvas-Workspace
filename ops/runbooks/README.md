# Support runbooks

Operational runbooks for the Palette Canvas pilot. Each is a short, copy-pasteable
procedure. They assume the stack from `README.md` (Postgres + API on :3001 + web on :3000).

| Runbook | When to use |
|---|---|
| [01 — Service won't start](01-service-wont-start.md) | API or web fails to boot / health check fails |
| [02 — Backup & restore drill](02-backup-restore.md) | Scheduled or ad-hoc backup; verify a restore |
| [03 — Pilot user onboarding](03-user-onboarding.md) | Add a new pilot user / agency / brand |
| [04 — Performance triage](04-performance-triage.md) | Slow responses; run the load test and read it |
| [05 — Security headers & error audit](05-security-headers.md) | Verify headers + error behaviour after changes |
