# Production roadmap — Palette Canvas to V1

Ordered per the PDF's MVP route (phases 0–5) then V1 (phase 6). Every step
lists: **scope** → **exit criteria** → **tests/gates**. Each step should land
behind a PR; the tracking ledger (`docs/roadmap-ledger.md`) is what an agent or
human uses to pick up work later.

Phases already complete (2, 3, 4) are skipped; the ordering assumes the
gap analysis (`docs/gap-analysis.md`) scope.

## Phase 5 — pilot hardening and launch (3–4 weeks PDF)

| # | Scope | Exit criteria | Tests |
| --- | --- | --- | --- |
| 5.1 | Backup + restore drill tooling | `scripts/backup.sh` + `scripts/restore-drill.sh` run to completion in CI; report in `ops/restore-drill/` | script exit 0; table diff equality |
| 5.2 | Load test | `scripts/load-test.js` p95 < 1000 ms on seeded pilot data; report persisted | p95 + pass rate |
| 5.3 | Accessibility remediation | every form input carries an `aria-label` or `<label htmlFor>`; nav landmarks (banner/main/nav) | jest/axe if wired, else audit list |
| 5.4 | Security remediation | headers (CSP, X-Content-Type-Options, X-Frame-Options, HSTS), email redirected from `x-user-email` only in dev, error wrapper | manual audit + e2e |
| 5.5 | Support runbooks | `ops/incident.md`, `ops/restore.md`, `ops/release.md`, `ops/support.md`, `ops/pilot-launch.md` | docs list covers PDF's 5 topics |
| 5.6 | Import dry run | `scripts/import-dry.js` validates brief CSV without DB writes; report lands in `ops/import/` | schema validation + zero insert |
| 5.7 | Pilot launch checklist | 12-item readiness list referenced in docs; forgiven N/A for non-executables | e2e + permission gates |

Exit: **LoC ≥ 25k**, **e2e ≥ 75 checks**, runbooks in repo, drill reports committed.

## Phase 6 — V1 operations and scale (10–14 weeks PDF)

| # | Scope | Exit criteria | Tests |
| --- | --- | --- | --- |
| 6.1 | Capacity planning | skills, availability, threshold alerts, per-user and team-assignee views | e2e: workload thresholds rejected |
| 6.2 | Time/effort reporting | utilisation dashboard, SLA clocks, delivery risk markers | e2e: utilisation computation |
| 6.3 | Advanced dashboards | portfolio health, WIP, ageing, rework, approval cycle time, account scorecard, drill-down | snapshot + e2e |
| 6.4 | Integrations hub | rules engine, webhooks, scheduled reminders, API keys, import/export, integration health | e2e: webhook dispatch, rules fire |
| 6.5 | Richer proofing | annotated feedback coordinates, side-by-side compare, e-sign integration point stub | e2e: annotation model |
| 6.6 | SSO/SCIM | OIDC, SCIM provisioning, MFA TOTP | e2e: token exchange |
| 6.7 | Commercial controls | rate cards, estimate versions, budget vs effort, PO fields, invoice-ready milestones | e2e: financial controls |
| 6.8 | Automation builder | rules → triggers → actions DSL | e2e: rule evaluation |

Exit: **LoC ≥ 80k**, **e2e ≥ 200 checks**, integrations sandboxed.

## Phase 6 continued — infrastructure + non-functional (long tail)

| # | Scope | Exit criteria | Tests |
| --- | --- | --- | --- |
| 6.9 | Live updates | authenticated SSE channel for notifications/board | e2e: channel subscribe |
| 6.10 | Object storage | S3-backed asset upload/serve with signed URLs | e2e: asset upload round-trip |
| 6.11 | Worker queue | Redis-compatible queue, retry + DLQ + idempotency keys | e2e: queue processing |
| 6.12 | Media workers | thumbnail/transcode orchestration, metadata extraction | e2e: media inspect job |
| 6.13 | AI opt-in guards | per-tenant opt-in flag + human review before external change | permission-test flag |
| 6.14 | Legal holds + retention | legal_hold flag blocks purge, retention policy | e2e: blocked purge |

## Backlog (never complete but must be tracked)

| # | Scope | Exit criteria | Tests |
| --- | --- | --- | --- |
| B.1 | Audit explorer UI | searchable audit table | build + snapshot |
| B.2 | Permissions reviews | review workflow for capability changes | approval chain |
| B.3 | Agent-attribution audit | `audit_event.agent_tag` recorded for agent-driven ops | e2e |
| B.4 | Drift detection | daily agent runs compare CI gate history to AGENTS.md | ledger entry |
| B.5 | Knowledge library | guideline/brief/QA/handover pack landing page | snapshot |
| B.6 | Account health | ran-book dashboard of agency engagement | snapshot |

## Roadmap rules

- **Numbers first**. The numeric `#` above is the canonical ordering; if a task
  is blocked, the next one with an unblocked owner is next.
- **Ledger threads everything**. `docs/roadmap-ledger.md` records the status
  of each #. At session start, read the ledger, identify the top `todo`
  entry, execute, flip status, commit.
- **Exit criteria before scope**. Do not call a step done until its exit
  criteria say so; ambiguous criteria loop back to the user.
- **Tests are the gate**. Each roadmap step should add e2e or permission
  checks in the same PR (never a follow-up).
- **Human approvals**. Platform/N/A entries are only closable by a human;
  the agent records them in the ledger but does not choose infrastructure.
