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

## Phase 8 — collaboration + governance deep-dive (PDF long tail, 15 steps)

| # | Scope | Exit criteria | Tests |
| --- | --- | --- | --- |
| 8.01 | Invitations (org-scoped invite/accept) | invite rows, unique token, accept sets person+role+binding; revoke | e2e: invite round-trip |
| 8.02 | Confidentiality tiers | version.confidentiality + client-shared default; tiered visibility | permission test: tier enforcement |
| 8.03 | Scheduled recurrence (weekly/biweekly/monthly/custom) | recurrence rows, next_run_at scheduling, generated tasks | e2e: recurrence tick |
| 8.04 | Saved views (board/list/calendar filters) | saved_view rows, owner + project scoping, shared toggle | e2e: view CRUD |
| 8.05 | Comment reactions | reaction rows (unique comment+person+emoji), emoji feed | e2e: react round-trip |
| 8.06 | Attachments in comments | comment_asset join, asset lifecycle on delete cascade | e2e: attach + detach |
| 8.07 | Message-to-task conversion | task_source rows (task_id, source_type, source_id), typed sources | e2e: convert thread to task |
| 8.08 | Sequential/parallel approval steps | approval_step rows, position ordering, required_role | e2e: multi-stage approval |
| 8.09 | Automated technical checks | technical_check rows (version-scoped, passed flag), run_at | e2e: check run + fail gate |
| 8.10 | QA reviewer assignment | qa_reviewer rows, due_at/completed_at, assign capability | e2e: assign + complete |
| 8.11 | Export log | export_log rows (kind, format, row_count), exports.manage gate | e2e: export recorded |
| 8.12 | Reporting deep-dive | reports.deep_dive capability; drill-down metrics APIs | permission + snapshot |
| 8.13 | Risk fields on tasks | task.risk + task.risk_reason columns | e2e: risk set + shown |
| 8.14 | Comment visibility tagging | comment.visibility (internal default), target-scoped enforcement | permission test: internal hidden |
| 8.15 | Service-template task-field schema | service_template.task_field_schema JSONB for dynamic forms | e2e: schema round-trip |

Exit: **e2e ≥ 320 checks** (delta 159 → next cap), migrations idempotent, LoC
continues upward.

✅ **Complete 2026-09-14 (PR #18)** — all 8.01–8.15 API modules merged; e2e
**212/212** stable on main. Web UI across the P8 surface (saved views board
columns, recurrence, risk, export log, approval steps) lands with Phase 9
annex slices (A-04 / A-14).

## Phase 9 — platform foundation (PR #17 surface annex A-01…A-16)

Next development phase after P8. Source of truth for the annex breakdown is
`docs/gap-analysis-platform-surface.md`; acceptance criteria must always be
re-validated against that document's diagnostics. Slice by heap-ordered,
small PRs per AGENTS.md (each with e2e/permission evidence).

| # | Scope | Depends on | Test shape |
| --- | --- | --- | --- |
| A-01 | AuthN core: `organisation` upgrade (slug/owner/trial), argon2id hashing, httpOnly sessions, `POST /auth/signup` bootstrap (org+owner+binding) | — | e2e: signup 201, duplicate 409, wrong password 401 |
| A-02 | Email verification (single-use token) + login/logout/session + email transport outbox | A-01, §0.2 | e2e: verify, 410 reuse, session expiry; dev logs to outbox |
| A-03 | Password reset/change + session revocation (audited) | A-02 | e2e: reset round-trip, expired token 410, old session 401 |
| A-04 | Member invites/directory/roles admin (supersedes P8-01 UI) | A-02 | e2e: invite→accept→binding, revoke, admin-only 403 |
| A-05 | MFA policy enforcement (required/optional) + recovery codes + session hardening | A-02 | e2e: policy enforced at login, single-use recovery |
| A-06 | Deactivation, GDPR export/delete, device/session manager, profile | A-03 | e2e: deactivate blocks login; export contains own rows; delete purges |
| A-07 | Org/personal settings + email branding | A-04 | e2e: settings CRUD + branding applied |
| A-08 | Plan catalogue + trial assignment | A-01 | e2e: trial org provisioned; seat limits enforced |
| A-09 | Billing gateway, seats, dunning, billing UI | A-08, §0.3 | e2e: checkout→webhook→subscription; dunning email |
| A-10 | Notification channels (email/Slack/Teams), digests, unsubscribe | A-07, §0.2 | e2e: per-channel delivery + digest + opt-out |
| A-11 | Onboarding wizard, template marketplace, demo org, help/docs | A-04 | snapshot + e2e: wizard completes |
| A-12 | Public API versioning, importers, exporters | P7-04, P8-11 | e2e: versioned key call; import dry-run → apply |
| A-13 | Webhook hardening, rate limits, retention enforcement | §0.5, P6-11 | e2e: HMAC verify, rate-limit 429, retention purge |
| A-14 | Collaboration parity: timeline/Gantt, DnD board, subtasks, global search | P8-03…P8-06 | e2e + browser: board moves, highlight search |
| A-15 | Mobile/PWA, whitelabel, widgets, L10N | A-07, §9 | snapshot + Lighthouse ≥ 90 mobile |
| A-16 | Deliverability, vaulting, SOC2-ish, observability, DR drills | continuous | CI: off-cycle drill, uptime monitors |

Exit: **e2e ≥ 320 checks**, real session auth with password hashing verified
in e2e, drift + CI gates green on every PR, LoC continues upward.

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
