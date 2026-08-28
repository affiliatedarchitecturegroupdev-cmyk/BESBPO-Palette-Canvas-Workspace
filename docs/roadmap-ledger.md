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

## Recently completed detail

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
