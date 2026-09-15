# Roadmap ledger — work history and current position

**Purpose**: any agent or human picking up Palette Canvas work starts here.
The ledger records every step: what was done, which commit, which gate passed,
who (or which agent) did it, and what remains. For scope definitions see
`docs/roadmap.md`; for the module-level status see `docs/gap-analysis.md`.

## How to read

- **ID** — unique roadmap identifier (`P5-01`, `P6-02`, etc.)
- **Status** — `done` | `in-progress` | `blocked` | `todo` | `n/a`
- **Commit** — the sha or branch that holds the change
- **Gates** — evidence that the step's exit criteria were met
- **Notes** — context that doesn't fit the column set

## Ledger

| ID | Scope | Status | Commit | Gates | Notes |
| --- | --- | --- | --- | --- | --- |
| P1-01 | Phase 1 foundation skeleton (monorepo, shared, tokens) | done | `main` pre-`bcd0a7e` | n/a | already in history |
| P2-01 | Phase 2 intake + project setup | done | `bcd0a7e` | e2e 30 → permission tests pass | converted brief → project |
| P3-01 | Phase 3 production workspace | done | `e99e99e` → PR #1 | e2e 41 → permission tests pass | board, drawer, notifications, workload |
| P4-01 | Phase 4 proofing, approvals, handover | done | `eb9cec9` → PR #2 | e2e 55 → permission tests pass | QA gate, client decision, handover |
| P5-01 | Backup + restore drill tooling | done | PR #4 | backup exit 0; drill exit 0; 27-table diff equality; e2e 55 → permission tests pass | full-schema restore; build-order fix |
| P5-02 | Load test script | done | PR #6 | 320/320 ok, p95 14 ms (< 1000 ms), exit 0; e2e 55 → permission tests pass | report committed; fails non-zero when API down |
| P5-03 | Accessibility remediation | done | PR #8 | 26/26 controls named; banner+main+nav landmarks; build clean; e2e 55 → permission tests pass | audit in ops/accessibility/ |
| P5-04 | Security remediation | done | PR #10 | headers on every response (nosniff/DENY/CSP); 5xx returns uniform JSON, no stack; e2e 80 → permission tests pass | Nest `SecurityModule` (APP_FILTER + middleware) |
| P5-05 | Support runbooks (ops/) | done | PR #10 | `ops/runbooks/` covers 5 topics (start, backup/restore, onboarding, perf, security) | — |
| P5-06 | Import dry-run script | done | PR #10 | `scripts/import-dry-run.sh` validates shape, exits 0/1, zero writes | — |
| P5-07 | Pilot launch checklist | done | PR #10 | `ops/pilot-launch-checklist.md` 12-item readiness list | — |
| P6-01 | Capacity planning | done | PR #10 | capacity profiles + skills + coverage API; `/capacity` page; e2e 80 → permission tests pass | V1 |
| P6-02 | Time/effort reporting | done | PR #10 | utilisation + effort-by-project APIs; `/reports` page; e2e 80 → permission tests pass | V1 |
| P6-03 | Advanced dashboards | done | PR #10 | portfolio roll-up + SLA report APIs; `/reports` page; e2e 80 → permission tests pass | V1 |
| P6-04 | Integrations hub | done | PR #10 | webhook CRUD + fire-and-forget emit on approval events; `/integrations` page; e2e 80 → permission tests pass | V1; retries/DLQ deferred to P6-11 |
| P6-05 | Richer proofing | done | PR #10 | annotations + resolve + version compare APIs; e2e 80 → permission tests pass | V1 |
| P6-06 | SSO/SCIM | done | PR #10 | SSO config CRUD + SCIM user provisioning (token-gated); `/settings/sso` page; e2e 80 → permission tests pass | V1; OIDC dance deferred |
| P6-07 | Commercial controls | done | PR #12 | rate cards, estimates v1+v2 supersede, budget vs effort (delta-verified), PO fields, invoice-ready listing; `/commercial` page; e2e 132/132 | V1 |
| P6-08 | Automation builder | done | PR #12 | rules DSL + evaluation on event bus, condition matching, notify action, automation_run recorded; e2e 132/132 | V1 |
| P6-09 | Live updates (SSE) | done | PR #12 | authenticated `/events/stream` (org-scoped, recipient-filtered, 25s heartbeat); LiveFeed inbox client; sse frame received in e2e; anon 401 | infra |
| P6-10 | Object storage | done | PR #12 | asset upload/list, HMAC signed URLs + expiry; round-trip byte equality + tamper 403 in e2e | disk backend V1 (S3-compatible shape) |
| P6-11 | Worker queue | done | PR #12 | PG SKIP LOCKED queue, backoff retry, DLQ + retry, idempotent enqueue (same key returns same job); webhook delivery on queue; e2e 132/132 | fulfills P6-04 deferral; PG not Redis |
| P6-12 | Media workers | done | PR #12 | media.inspect records PNG/JPEG/GIF/SVG dimensions into asset metadata, enqueues media.thumbnail (rendition recorded); e2e-verified | transcode deferred (external worker) |
| P6-13 | AI opt-in guards | done | PR #12 | org ai_opt_in flag; proposals blocked while opted out (403); execute only after human decide; e2e 132/132 | V1 |
| P6-14 | Legal holds + retention | done | PR #12 | active hold blocks purge (409), release then purge runs; retention_days policy; all audited; e2e 132/132 | V1 |
| P7-01 | MFA TOTP | done | PR #14 | RFC 6238 enroll/activate/verify; wrong code 401; e2e 159/159 | closes roadmap 6.6 gap |
| P7-02 | OIDC login flow | done | PR #14 | authorize URL with HMAC-signed state, dev-stub code exchange, tampered state 401, audited sso.oidc_login; e2e 159/159 | closes 6.6 gap; real IdP exchange replaces stub |
| P7-03 | Scheduled reminders | done | PR #14 | reminders on P6-11 queue, delivered via handler; e2e 159/159 | closes 6.4 gap |
| P7-04 | API keys | done | PR #14 | issue/list/revoke, sha256-stored, x-api-key middleware auth; revoked 401 in e2e | closes 6.4 gap |
| P7-05 | E-sign stub | done | PR #14 | envelope send/latest/complete on approvals; signer-role completion; e2e 159/159 | closes 6.5 gap; provider webhook replaces stub |
| P7-06 | Integration health | done | PR #14 | per-integration delivery roll-up from job table; e2e 159/159 | closes 6.4 gap |
| B-01 | Audit explorer UI | done | PR #12 | audit search API (action/actor/target/date/q) + `/audit` page; filter + free-text verified in e2e | backlog |
| B-02 | Permissions reviews | done | PR #12 | propose/decide with separation of duties (proposer 404 on own), approved grant/revoke takes effect via role_capability_override in authz; e2e 132/132 | AccountManager gained permissions.review |
| B-03 | Agent-attribution audit | done | PR #14 | audit_event.agent_tag from x-agent-tag via request context; agent filter on audit search; tagged + null rows verified in e2e 159/159 | backlog |
| B-04 | Drift detection | done | PR #14 | scripts/drift-check.js exit 0, 31 rows checked; report committed ops/drift/latest.md; exit 1 on drift | backlog |
| B-05 | Knowledge library | done | PR #14 | /library landing page with guideline/brief/QA/handover packs; web build exit 0 | backlog |
| B-06 | Account health | done | PR #14 | per-agency engagement roll-up API + /account-health page; e2e 159/159 incl. client 403 | backlog |
| P8-00 | Phase 8 schema + capability matrix (foundation for 8.01–8.15) | done | PR #16 | migrations 001–007 apply clean on fresh postgres; pos-check no non-ascii; slice-check OK; npm build exit 0; shared permission tests pass; e2e 159/159 | 12 new tables + 13 new capabilities + task.risk/risk_reason + comment.visibility + service_template.task_field_schema; API module wiring per-step still todo |
| P8-01 | Invitations (invite/accept) | done | PR #18 | e2e invite accept + revoke + negative; root build exit 0; e2e 212/212 | token-only self-service accept (no pre-existing person required) |
| P8-02 | Confidentiality tiers | done | PR #18 | e2e invite accept + revoke + negative; root build exit 0; e2e 212/212 | external roles (client_approver, third_party_vendor) never see internal versions |
| P8-03 | Scheduled recurrence | done | PR #18 | e2e invite accept + revoke + negative; root build exit 0; e2e 212/212 | `recurrence` module + `active` toggle |
| P8-04 | Saved views | done | PR #18 | e2e invite accept + revoke + negative; root build exit 0; e2e 212/212 | `views` module |
| P8-05 | Comment reactions | done | PR #18 | e2e invite accept + revoke + negative; root build exit 0; e2e 212/212 | controller route order fixed so `:id/reactions` is not shadowed |
| P8-06 | Attachments in comments | done | PR #18 | e2e invite accept + revoke + negative; root build exit 0; e2e 212/212 | detach `RETURNING comment_id, asset_id` (composite PK)) |
| P8-07 | Message-to-task conversion | done | PR #18 | e2e invite accept + revoke + negative; root build exit 0; e2e 212/212 | conversion applies to non-task-scoped comments |
| P8-08 | Sequential/parallel approval steps | done | PR #18 | e2e invite accept + revoke + negative; root build exit 0; e2e 212/212 | `approval-steps` module (ORDER BY) |
| P8-09 | Automated technical checks | done | PR #18 | e2e invite accept + revoke + negative; root build exit 0; e2e 212/212 | `quality` module `check_name`/`created_by` schema alignment |
| P8-10 | QA reviewer assignment | done | PR #18 | e2e invite accept + revoke + negative; root build exit 0; e2e 212/212 | `qa_reviewer.created_by` insert fixed |
| P8-11 | Export log | done | PR #18 | e2e invite accept + revoke + negative; root build exit 0; e2e 212/212 | `exports` module |
| P8-12 | Reporting deep-dive | done | PR #18 | e2e invite accept + revoke + negative; root build exit 0; e2e 212/212 | uses `time_entry` (time_log did not exist) + `change_request.status` |
| P8-13 | Risk fields on tasks | done | PR #18 | e2e invite accept + revoke + negative; root build exit 0; e2e 212/212 | `risk` module `risk_reason` kept |
| P8-14 | Comment visibility tagging | done | PR #18 | e2e invite accept + revoke + negative; root build exit 0; e2e 212/212 | `comment.visibility` + controller role filter |
| P8-15 | Service-template task-field schema | done | PR #18 | e2e invite accept + revoke + negative; root build exit 0; e2e 212/212 | `template-schemas` module |
| A-01 | AuthN core + sign-up/org bootstrap | done | PR #20 | e2e 239/239 (27 new auth checks); root build clean; drift 0 findings | migration 009: `organisation` upgrade (slug/owner/plan/trial), argon2id via `@node-rs/argon2`, httpOnly sessions, `POST /auth/signup` + `/auth/verify` + `/auth/login` + `/auth/logout` + `/auth/session` |
| A-02 | Email verification + login/session | todo | — | — | depends A-01 + email transport (§0.2) |
| A-03 | Password reset/change + revocation | todo | — | — | depends A-02 |
| A-04 | Invite/member/roles admin | todo | — | — | supersedes P8-01 UI; depends A-02 |
| A-05 | MFA policy enforcement + session hardening | todo | — | — | depends A-02 |
| A-06 | Deactivation, export/delete, sessions manager, profile | todo | — | — | depends A-03 |
| A-07 | Org/personal settings + email branding | todo | — | — | depends A-04 |
| A-08 | Plan catalogue + trial assignment | todo | — | — | depends A-01 |
| A-09 | Billing gateway, seats, dunning, billing UI | todo | — | — | depends A-08, §0.3 |
| A-10 | Notification channels, digests, unsubscribe | todo | — | — | depends A-07, §0.2 |
| A-11 | Onboarding wizard, template marketplace, demo, help | todo | — | — | depends A-04 |
| A-12 | Public API versioning, importers, exporters | todo | — | — | depends P7-04 (keys), P8-11 |
| A-13 | Webhook hardening, rate limits, retention enforcement, health/status | todo | — | — | depends §0.5, P6-11 |
| A-14 | Collaboration parity blocks (timeline/DnD/subtasks/global search) | todo | — | — | depends P8-03..P8-06 |
| A-15 | Mobile/PWA, whitelabel, widgets, L10N | todo | — | — | depends A-07, §9 |
| A-16 | Deliverability, vaulting, SOC2-ish, observability, DR drills | todo | — | — | continuous |
| UI-01 | Web UI/UX advancement — scalable + mobile-first | done | PR #21 `c76d68c` | CI "Build + tests + gates" green on PR #21; root build exit 0; e2e 239/239; drift 0; LoC 18,039; browser QA on work-1 (dashboard, calendar, settings, help, reports, workload, capacity, commercial, projects, audit all render with seeded data); DataTable server-safe fix (no event handlers across AppShell client boundary) | new `/` dashboard (KPIs + intake attention + project pulse + dispatch), `/calendar` delivery timeline, `/settings` hub, `/help`; shared PageHeader/Badge/DataTable/StatCard/Card/ProgressBar/EmptyState; mobile-first CSS (stacked card rows, compact header, bottom quick-nav); `agentRules:false` |
| V2-1.1 | Engagement entity + claims | in-review | `v2-boards-comms-public-surface` | e2e two engagements + cross-read blocked; build exit 0; e2e 326/326 | migration 010; `engagement_id` threaded through scope-bearing rows; `Me` carries resolved `engagementId` |
| V2-1.2–1.4 | Board model, column catalog, semantic roles | in-review | `v2-boards-comms-public-surface` | e2e board/column/item lifecycle, type catalog reject 400, semantic role set + invalid reject; e2e 326/326 | migration 010 `workspaces`/`boards`/`columns`/`groups`/`items`/`board_views`; 25-type catalog with `config` validation |
| V2-1.5 | Guest identity (§14.1/14.4) | in-review | `v2-boards-comms-public-surface` | e2e guest scoped read + expiry + guest 403 on list files; e2e 326/326 | `guest` role with `item_scope` + mandatory `expires_at`; resolved via `identity.service`; expired link denied |
| V2-1.6 | Capacity bridge (§9.7/§7.7) | in-review | `v2-boards-comms-public-surface` | e2e seat utilisation from board `duration` items vs 137.1 productive ceiling | 173.6 raw / 137.1 productive / 21% non-billable constants |
| V2-2.1 | `files` table + version chain (§13.1) | in-review | `v2-boards-comms-public-surface` | e2e upload → re-upload → version chain returns both; unknown source 400; e2e 326/326 | migration 011; `storage_key`, `source` enum, `external_ref`, `parent_file_id` |
| V2-2.2 | File references (column + comment + message) | in-review | `v2-boards-comms-public-surface` | e2e attach to item column 201 + read back 1 row | `/files/items/:itemId/attach` |
| V2-2.3 | Gallery view data (§9.5) | in-review | `v2-boards-comms-public-surface` | e2e gallery config resolves file rows | `files_column_id` config drives the grid |
| V2-3.1–3.3 | Channels, visibility boundary, messages | in-review | `v2-boards-comms-public-surface` | e2e join + post, internal channel never visible to client, conversion audited, thread reply + mention; e2e 326/326 | migration 011 `channels`/`channel_members`; `visibility` fixed at creation |
| V2-3.4 | Item comments + engagement RLS | in-review | `v2-boards-comms-public-surface` | comment inherits item access; e2e 326/326 | `engagement_id` denormalised onto comment |
| V2-3.5 | Meetings (§11.4) | in-review | `v2-boards-comms-public-surface` | e2e schedule + join with honest `joined_at` | `meetings` + `meeting_participants` |
| V2-4.1 | Dashboard schema (§10.3) | in-review | `v2-boards-comms-public-surface` | e2e widget CRUD; e2e 326/326 | migration 011 `dashboards`/`dashboard_widgets`/`dashboard_metrics` |
| V2-4.2 | Aggregation consumer (§10.4) | in-review | `v2-boards-comms-public-surface` | e2e metric row written per tagged column on item write; no-op when untagged | `BoardsService` calls `DashboardsService` in create/update item |
| V2-4.3 | Widget catalog (§10.6) | in-review | `v2-boards-comms-public-surface` | e2e pass-rate + capacity sum over metrics | capacity KPI, QA pass-rate, turnaround, engagement health, commercial rollup, leaderboard |
| V2-4.4 | Role-scoped dashboards (§10.5) | in-review | `v2-boards-comms-public-surface` | e2e client renders own engagement dashboard; client from another engagement refused | management unfiltered; account-manager owns own engagements; client scoped to one |
| V2-5.1 | Agent catalog (§12.2) | in-review | `v2-boards-comms-public-surface` | e2e catalog exposes six agents, every agent declares autonomy, only `kpi_reminder` skips approval | `AGENT_CATALOG` in `packages/shared` |
| V2-5.2 | Compliance Guard (§12.5) | in-review | `v2-boards-comms-public-surface` | e2e failed check blocks `qa_technical`; clearing is attributed | `compliance_checks`; metadata/filename/attribution scan |
| V2-5.3 | Brief Analysis Agent | in-review | `v2-boards-comms-public-surface` | e2e propose-only records a proposal (16–25 h range), does not apply; human confirm via `ai.review` (ops director) | set `propose-only`; storage blocked while org opted out |
| V2-5.4 | KPI/Reminder Agent | in-review | `v2-boards-comms-public-surface` | e2e act-and-log reminder applies without approval, raises notification, does not mutate the item | `recipient_id` notification write |
| V2-5.5 | LLM provider seam (§12.3) | in-review | `v2-boards-comms-public-surface` | e2e catalog reports provider unconfigured + name `none` without env keys; absent key is a graceful no-op | `apps/api/src/llm/llm.provider.ts`; OpenAI-compatible provider behind `PC_LLM_API_KEY`/`BASE_URL`/`MODEL`; provider choice is a human decision, left unconfigured |
| V2-6.1 | Visual language (§8.1) | in-review | `v2-boards-comms-public-surface` | `brandRamp` + `brandDots` tokens mirror the mockup ramp (cobalt #4f7dff → violet #9471cb → magenta #d66599, ink #131021, raise #1c1830); web build exit 0 | additive to `packages/design-tokens`; app scales untouched |
| V2-6.2 | Landing page (§8.2) | in-review | `v2-boards-comms-public-surface` | public-surface check: all five sections present (`Every campaign`, `Built for the whole delivery`, `How it works`, `Two ways in`, `Follow along`); route 200; renders without the app shell | `/` moved to public landing; workspace overview moved to `/dashboard` |
| V2-6.3 | Sign-up branching (§8.3) | in-review | `v2-boards-comms-public-surface` | public-surface check: three paths present (Employee / Partner agency / Client or third party) and the page states there is no guest self-serve | guest has no self-serve path by design |
| V2-6.4 | Terms / Privacy / Accessibility (§15.1–15.3) | in-review | `v2-boards-comms-public-surface` | public-surface check: three routes 200 with spec content (terms incl. governing law; privacy incl. UK data location; accessibility incl. WCAG 2.2 target, known gaps, and an explicit not-yet-counsel-reviewed caveat) | explicit draft/legal-review caveats per roadmap rule "legal-finalisation is a human decision" |
| V2-6.5 | Resources / What's New (§15.4) | in-review | `v2-boards-comms-public-surface` | public-surface check: status + in-development + recently-shipped sections present, incl. `Not configured` for the unconfigured agent provider | honest status rather than aspirational |

## Recently completed detail

### V2 Phases 1–6 — boards, comms, dashboards, agents, public surface (2026-09-15)

- Branch: `v2-boards-comms-public-surface` (PR pending human review)
- Source of truth: `docs/roadmap-spec-v2.md` (V2-1.x … V2-6.x), ordered by the
  spec's own dependency graph (§16.3). Work was resumed mid-flight: migrations,
  services, controllers and module wiring existed but the e2e suite was red.
- Migrations: `010_v2_core_model.sql` (engagements, workspaces/boards/columns/
  groups/items/subitems/board_views, guest role + `role_binding.scope_type`
  widening), `011_v2_files_comms_dashboards.sql` (`files`, `channels`,
  `channel_members`, `messages`, `meetings`, `meeting_participants`,
  `dashboards`, `dashboard_widgets`, `dashboard_metrics`, `compliance_checks`).
- API modules: `boards`, `files`, `comms`, `dashboards`, `agents`,
  `compliance`, `llm` (provider seam). All controllers/services registered in
  `app.module.ts`; `DashboardsService` aggregation is invoked from
  `BoardsService.createItem/updateItem`.
- **e2e repairs (the red suite):** the V2 test block had been damaged by an
  earlier automated rename — three template-literal route paths had been
  rewritten to `/v2Attach` and `/v2Agents`, and two type assertions read
  `v2Agents`/`v2Metrics` as JSON keys. Restored the real paths
  (`/files/items/:id/attach`, `/agents`) and the real payload keys. Also moved
  the agent-proposal decision to the ops director, which is who holds
  `ai.review`; granting that capability to the production lead would have broken
  the existing negative check `production lead cannot decide ai action (403)`.
- Web: public surface added (`/`, `/legal/terms`, `/legal/privacy`,
  `/legal/accessibility`, `/resources`, `/signup`) with its own
  `PublicChrome` (nav + footer, no product navigation). The authenticated
  dashboard moved from `/` to `/dashboard`; `nav.ts` and `AppShell` carry the
  new `isPublicPath` gate so public routes render outside the app shell.
  `brandRamp`/`brandDots` added to `packages/design-tokens` for the spec §8.1
  palette without touching the app colour scales.
- New gate: `scripts/public-surface-check.sh` asserts each public route renders
  its expected content and that the landing page does **not** leak the app
  shell; wired into CI after the test step.
- Gates: `npm run build` exit 0 (all workspaces); `npm test` → permission tests
  pass, API e2e **326/326**; drift 0 findings; public-surface check OK;
  LoC 22,990.
- Human decisions left open (recorded, not decided): LLM provider host, real
  identity-provider exchange, S3-compatible backend, and legal finalisation of
  the terms/privacy/accessibility copy — all three legal pages carry an explicit
  "not yet reviewed by counsel" caveat.

### A-01 — AuthN core + sign-up/org bootstrap (2026-09-14)

- Branch: `b1-authn-signup`, PR #20 (on top of PR #19 CI/A-2 doc work)
- Migration `009_phase9_auth.sql`: `organisation` account model upgrade
  (slug unique, display_name, owner_person_id, plan_tier, status,
  trial_ends_at, timezone, locale, settings JSONB), `person.password_hash` +
  `verified_at` + `deactivated_at`, `session` (SHA-256 hashed tokens,
  8h/30d expiry, remember-me), `email_outbox` (verification + future mail).
- AuthN core: argon2id password hashing (`@node-rs/argon2`), httpOnly session
  cookie, `POST /auth/signup` (org+owner+binding+starter templates in one
  transaction), `POST /auth/verify` (single-use outbox token), `POST
  /auth/login` (8h/30d), `POST /auth/logout` (server-side revoke), `GET
  /auth/session`.
- Owner role per §§1.1–1.2 is `agency_admin` bound at organisation scope;
  signup seeds the two starter service templates (brand_identity,
  social_retainer).
- Gates: `npm run build` clean; e2e **239/239** (27 new authN checks:
  signup 201, duplicate email 409, duplicate slug 409, bad email 400, weak
  password 400, argon2id at rest, verify flips + single-use, wrong password
  401, httpOnly cookie, session resolves, logout revokes, expiry rejected,
  auth lifecycle audited); drift 0 findings.
- Deferred to A-02: email transport (outbox exists, dev-log only), resend
  throttle, unverified-login enforcement is already wired for login.

### UI-01 — Web UI/UX advancement: scalable + mobile-first (2026-09-14)

- Directive: advance the web interface UI/UX — scalable and mobile-first,
  better organized, more pages. Implemented on top of `main` (after PR #19/#20).
- New `/` dashboard: KPI StatCards (intake backlog, active projects, agencies,
  unread), intake-attention panel, project-pulse panel, dispatch quick actions.
- New `/calendar` page: delivery timeline across the portfolio (overdue banner,
  upcoming due dates), added to Operate nav.
- New `/settings` hub: identity card from `me`, plan summary, governance +
  workspace links. New `/help` page: keyboard shortcuts, role guide, quick-start.
- Shared component refactor: `PageHeader`, `Badge`, `StatCard`, `Card`,
  `ProgressBar`, `EmptyState`, `DataTable` (generic `rowKey` + index fallback)
  adopted across Projects, Intake, Workload, Capacity, Directory, Templates,
  Account-health, Integrations, Library, Reports, Commercial, Audit,
  Notifications, SSO.
- Mobile-first CSS: grid tables stack to cards ≤720px, compact brand/header
  ≤480px, bottom quick-nav; desktop table form retained.
- Fix: `DataTable` no longer attaches row event handlers — server-component safe
  across the AppShell client boundary (`/reports` was 500ing on
  "Event handlers cannot be passed to Client Component props").
- Gates: `npm run build` clean; e2e 239/239; browser QA on work-1 with seeded
  `pc-pg` (dashboard/calendar/settings/help/reports/workload/capacity/
  commercial/projects/audit all render). `next.config.js` sets `agentRules: false`.

### P8-01…P8-15 — Collaboration & governance module set (2026-09-14)

- Branch: `p8-collab-governance`, merged via PR #18 (`dd99648` + `3a5b83c`)
- 15 modules wired into the API: invitations (token accept), confidentiality
  tiers, scheduled recurrence, saved views, comment reactions, comment
  attachments, message-to-task conversion, seq/parallel approval steps,
  automated technical checks, QA reviewer assignment, export log, reporting
  deep-dive, risk register (migration 008), comment visibility, service
  template task-field schema (migration 008).
- Determinism fix: disable the background queue poller in the e2e harness
  (`PC_QUEUE_POLL=0`, explicit `/jobs/process` drives), and poll briefly for
  the async automation evaluation + notification delivery. This eliminates
  the timing flakes seen under load (previously surfaced as P6-11 DLQ /
  P6-08 automation).
- Gates: `npm run build` clean; e2e **212/212** stable (6+/6+ consecutive
  runs, including under CPU load); shared permission tests pass;
  `node scripts/drift-check.js` 0 findings.
- Deferred: P8 has no web UI yet (API-only) — board columns for saved views,
  recurrence, risk, export log, approval steps to land with the platform
  annex (A-14 / A-04).

### P5-03 — Accessibility remediation (2026-08-23)

- Branch: `p5-03-accessibility`, merged via PR #8
- Landmarks: root layout `<nav>` → `<header>` + `<nav aria-label="Primary">`
  (banner was missing); board view switcher labelled `aria-label="Work view"`.
- Form controls: audited all 26 — 17 already compliant via `<label>` wrappers
  or P4-era `aria-label`s; 9 unlabeled (user switcher, per-card status,
  checklist/time/comment inputs, QA-item/version inputs) now carry
  `aria-label`s. Drawer close button also named.
- Audit evidence: `ops/accessibility/accessibility-2026-08-23.md`.
- Gates: `npm run build` clean, e2e 55/55, permission tests pass, `next build`
  0 warnings. Colour-contrast / focus sweep deferred (needs a rendered-browser
  tool) — noted in the report, non-blocking for pilot.

### P5-02 — Load test script (2026-08-23)

- Branch: `p5-02-load-test`, merged via PR #6
- `scripts/load-test.js` fixes over the PR #3 scaffold:
  1. the scaffold hit `/workload` as `design@besbpo.example`, but the
     capability matrix gates `workload.read` to ops/finance/lead — every
     such request returned 403 and the drill could never pass. Swapped to
     `finance@besbpo.example`; all five profile routes are now permitted, so
     the drill measures latency of successful pilot traffic.
  2. the scaffold only logged results to stdout; the roadmap requires a
     persisted report. It now writes
     `ops/load-test/load-test-<timestamp>.json` (override with `REPORT_DIR`).
- Report committed: `ops/load-test/load-test-2026-08-23T17-15-09-346Z.json`
  — 320 requests (40 rounds × 8 concurrency), 320 ok / 0 failed,
  p50 8 ms, **p95 14 ms**, p99 41 ms, max 56 ms.
- Negative check: with the API stopped the drill exits non-zero (2), so the
  gate can't pass vacuously.
- Gates: `node scripts/load-test.js` exit 0, e2e 55/55, permission tests
  pass, `npm run build` clean.

### P5-01 — Backup + restore drill tooling (2026-08-23)

- Branch: `p5-01-backup-restore-drill`, merged via PR #4
- `scripts/backup.sh` — optional output-name argument so callers can predict
  the dump path; default behaviour unchanged (`pg_dump` → `ops/backups/`)
- `scripts/restore-drill.sh` — two fixes over the PR #3 scaffold:
  1. the drill previously restored from `pre-drill-$TS.sql`, a file
     `backup.sh` never wrote (it wrote `palette_canvas-$TS.sql`) — the drill
     could never have passed; it now requests the backup under the exact name
  2. the drill truncated only a hardcoded 19-table list but restored a full
     `pg_dump` (28 tables), which would duplicate-key on the 9 unlisted
     tables; it now drops and recreates the `public` schema and diffs every
     application table (27, excluding `schema_migrations`)
- Report committed: `ops/restore-drill/restore-drill-20260823T160606Z.md`
  (27/27 tables round-tripped); raw dumps kept out of git via
  `ops/backups/` in `.gitignore`
- Also fixed: root `package.json` workspace order (`packages/*` before
  `apps/*`) — a fresh clone could not pass `npm run build` because the API
  compiled before `@palette-canvas/shared` emitted `dist/`
- Gates: `npm run build` clean from a fresh install, e2e 55/55 against the
  restored database, permission tests pass, `bash scripts/backup.sh` exit 0,
  `bash scripts/restore-drill.sh` exit 0 with full table-diff equality

### P4-01 — Phase 4 proofing, approvals, handover (2026-08-21)

- Branches: `phase-4-proofing-approvals` (PR #2)
- Migration: `apps/api/migrations/003_phase4_schema.sql`
  (`version`, `qa_checklist`, `approval`, `change_request`, `handover_package`,
  `handover_item`)
- Modules: `apps/api/src/proofing/{versions,approvals,handovers}.service.ts` +
  `proofing.controller.ts`
- Shared: `versions.write`, `qa.write`, `approvals.request/decide`,
  `change.write`, `handover.write`; ClientApprover + `deliverables.read`
- Web: `projects/[id]/deliverables/[deliverableId]/` + `ProofingView.tsx`,
  `apps/web/lib/api-proofing.ts`
- Gates: e2e 55/55, permission tests pass, `npm run build` clean, LoC 7,261
- Browser-verified: as client approver the pending approval shows decision
  buttons; as production lead the handover panel assembles approved versions.

### P3-01 — Phase 3 production workspace (2026-08-21)

- Branch: `phase-3-production-workspace` (PR #1, merged)
- Modules: `tasks`, `deliverables`, `comments`, `notifications`, `workload`,
  `workstreams`
- Migration: `apps/api/migrations/002_phase3_schema.sql`
- Web: board/list/calendar toggle, task drawer, workload page, notifications
  page, same-origin `/pc-api` proxy
- Gates: e2e 41/41, permission tests pass, LoC 5,922

### P2-01 — Phase 2 intake and project setup (2026-08-21)

- Modules: `intake`, `triage`, `projects`, `directory`, `templates`
- Migration: `apps/api/migrations/001_phase2_schema.sql`
- Gates: e2e 30/30, permission tests pass

## Open gaps (module-level, excerpt)

Per `docs/gap-analysis.md`, the highest-leverage unfinished surface is:

1. **Object storage / asset pipeline** — URIs only today; thumbnails,
   signed URLs, comparison views all hang on this.
2. **Queue + notifications** — Phase 4 emits notification rows synchronously;
   V1 needs a queue so delivery is reliable.
3. **Skills/availability workload** — the current workload page is totals
   only; PDF V1 wants thresholds, skills, availability, auto-balance.
4. **Dashboards** — portfolio health, WIP, ageing, rework, approval cycle
   time, account scorecard — none built.
5. **Integrations + automation hub** — rules, webhooks, API keys, import,
   export — none built.
6. **Identity hardening** — header auth remains; SSO/SCIM/MFA are V1.
