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
| A-02 | Email verification + login/session | done | PR #25 `b25e715` | e2e: unverified login 403, reuse 410, expired token 410, resend throttle, unknown-address non-disclosure; 354/354 | N1.2; delivery step still awaits the §0.2 provider decision (ADR-0002 D1) — the flow is complete and green against the outbox fallback |
| A-03 | Password reset/change + revocation | done | PR #25 `b25e715` | e2e: reset round-trip, weak 400, reuse/expired 410, unknown 401, sessions revoked, change-password keeps caller, revoke-others; 354/354 | N1.3; all paths audited |
| A-04 | Invite/member/roles admin | done | PR #25 `b25e715` | e2e: accept produced the promised binding; reuse 409; members list scoped to org; client cannot list members 403; self-revoke 403; pending invite revoke makes the token unusable 409; member revoke drops bindings + workspace access 403; revocation audited; 365 passed / 0 failed. Browser: `/settings/members` renders members + pending invites for `operations_director`, and shows a restricted notice (not an empty list) for a `creative_contributor` | N1.4; supersedes P8-01 UI. `GET /directory/members` + `DELETE /directory/members/:personId/roles`; the self-revoke guard exists because an admin who revokes themselves leaves the org with no administrator and no product path back |
| A-05 | MFA policy enforcement + session hardening | todo | — | — | depends A-02 |
| A-06 | Deactivation, export/delete, sessions manager, profile | todo | — | — | depends A-03 |
| A-07 | Org/personal settings + email branding | todo | — | — | depends A-04 |
| A-08 | Plan catalogue + trial assignment | todo | — | — | depends A-01 |
| A-09 | Billing gateway, seats, dunning, billing UI | todo | — | — | depends A-08, §0.3 |
| A-10 | Notification channels, digests, unsubscribe | todo | — | — | depends A-07, §0.2 |
| A-11 | Onboarding wizard, template marketplace, demo, help | todo | — | — | depends A-04 |
| A-12 | Public API versioning, importers, exporters | todo | — | — | depends P7-04 (keys), P8-11 |
| A-13 | Webhook hardening, rate limits, retention enforcement, health/status | todo | — | — | depends §0.5, P6-11 |
| A-14 | Collaboration parity blocks (timeline/DnD/subtasks/global search) | done | PR #26 `93a21f7` (moves + search); PR #27 merged as `727a1f3` (timeline/subtasks/swimlanes) | DnD moves + global search under N2.2 (374 passed / 0 failed). Subtasks, timeline/Gantt, and swimlanes under N2.2a (401 passed / 0 failed; browser pass incl. subtask persistence + timeline render; read-only role refused) | All four blocks shipped end-to-end; PR #27 merged to `main` as `727a1f3`. The §9 data model was already complete (`subitem`/`parent_item_id`, `ViewType.Gantt`, `assertViewConfig` `date_column_id`); N2.2a added the service + renderer code against it with no migration |
| A-15 | Mobile/PWA, whitelabel, widgets, L10N | todo | — | — | depends A-07, §9 |
| A-16 | Deliverability, vaulting, SOC2-ish, observability, DR drills | todo | — | — | continuous |
| UI-01 | Web UI/UX advancement — scalable + mobile-first | done | PR #21 `c76d68c` | CI "Build + tests + gates" green on PR #21; root build exit 0; e2e 239/239; drift 0; LoC 18,039; browser QA on work-1 (dashboard, calendar, settings, help, reports, workload, capacity, commercial, projects, audit all render with seeded data); DataTable server-safe fix (no event handlers across AppShell client boundary) | new `/` dashboard (KPIs + intake attention + project pulse + dispatch), `/calendar` delivery timeline, `/settings` hub, `/help`; shared PageHeader/Badge/DataTable/StatCard/Card/ProgressBar/EmptyState; mobile-first CSS (stacked card rows, compact header, bottom quick-nav); `agentRules:false` |
| V2-1.1 | Engagement entity + claims | done | PR #22 | e2e two engagements + cross-read blocked; build exit 0; e2e 326/326 | migration 010; `engagement_id` threaded through scope-bearing rows; `Me` carries resolved `engagementId` |
| V2-1.2–1.4 | Board model, column catalog, semantic roles | done | PR #22 | e2e board/column/item lifecycle, type catalog reject 400, semantic role set + invalid reject; e2e 326/326 | migration 010 `workspaces`/`boards`/`columns`/`groups`/`items`/`board_views`; 25-type catalog with `config` validation |
| V2-1.5 | Guest identity (§14.1/14.4) | done | PR #22 | e2e guest scoped read + expiry + guest 403 on list files; e2e 326/326 | `guest` role with `item_scope` + mandatory `expires_at`; resolved via `identity.service`; expired link denied |
| V2-1.6 | Capacity bridge (§9.7/§7.7) | done | PR #22 | e2e seat utilisation from board `duration` items vs 137.1 productive ceiling | 173.6 raw / 137.1 productive / 21% non-billable constants |
| V2-2.1 | `files` table + version chain (§13.1) | done | PR #22 | e2e upload → re-upload → version chain returns both; unknown source 400; e2e 326/326 | migration 011; `storage_key`, `source` enum, `external_ref`, `parent_file_id` |
| V2-2.2 | File references (column + comment + message) | done | PR #22 | e2e attach to item column 201 + read back 1 row | `/files/items/:itemId/attach` |
| V2-2.3 | Gallery view data (§9.5) | done | PR #22 | e2e gallery config resolves file rows | `files_column_id` config drives the grid |
| V2-3.1–3.3 | Channels, visibility boundary, messages | done | PR #22 | e2e join + post, internal channel never visible to client, conversion audited, thread reply + mention; e2e 326/326 | migration 011 `channels`/`channel_members`; `visibility` fixed at creation |
| V2-3.4 | Item comments + engagement RLS | done | PR #22 | comment inherits item access; e2e 326/326 | `engagement_id` denormalised onto comment |
| V2-3.5 | Meetings (§11.4) | done | PR #22 | e2e schedule + join with honest `joined_at` | `meetings` + `meeting_participants` |
| V2-4.1 | Dashboard schema (§10.3) | done | PR #22 | e2e widget CRUD; e2e 326/326 | migration 011 `dashboards`/`dashboard_widgets`/`dashboard_metrics` |
| V2-4.2 | Aggregation consumer (§10.4) | done | PR #22 | e2e metric row written per tagged column on item write; no-op when untagged | `BoardsService` calls `DashboardsService` in create/update item |
| V2-4.3 | Widget catalog (§10.6) | done | PR #22 | e2e pass-rate + capacity sum over metrics | capacity KPI, QA pass-rate, turnaround, engagement health, commercial rollup, leaderboard |
| V2-4.4 | Role-scoped dashboards (§10.5) | done | PR #22 | e2e client renders own engagement dashboard; client from another engagement refused | management unfiltered; account-manager owns own engagements; client scoped to one |
| V2-5.1 | Agent catalog (§12.2) | done | PR #22 | e2e catalog exposes six agents, every agent declares autonomy, only `kpi_reminder` skips approval | `AGENT_CATALOG` in `packages/shared` |
| V2-5.2 | Compliance Guard (§12.5) | done | PR #22 | e2e failed check blocks `qa_technical`; clearing is attributed | `compliance_checks`; metadata/filename/attribution scan |
| V2-5.3 | Brief Analysis Agent | done | PR #22 | e2e propose-only records a proposal (16–25 h range), does not apply; human confirm via `ai.review` (ops director) | set `propose-only`; storage blocked while org opted out |
| V2-5.4 | KPI/Reminder Agent | done | PR #22 | e2e act-and-log reminder applies without approval, raises notification, does not mutate the item | `recipient_id` notification write |
| V2-5.5 | LLM provider seam (§12.3) | done | PR #22 | e2e catalog reports provider unconfigured + name `none` without env keys; absent key is a graceful no-op | `apps/api/src/llm/llm.provider.ts`; OpenAI-compatible provider behind `PC_LLM_API_KEY`/`BASE_URL`/`MODEL`; provider choice is a human decision, left unconfigured |
| V2-6.1 | Visual language (§8.1) | done | PR #22 → corrected SPA-01 | `packages/design-tokens/test/tokens.test.ts` snapshot passes and fails on drift (verified by injecting `#4a74ed` → `brandRamp.cobalt drifted`); sample of `fig-8.1-landing-mockup.png` confirms `#131021`/`#1c1830`/`#4f7dff`/`#9471cb`/`#d66599`; web build exit 0 | additive to `packages/design-tokens`; app scales untouched. Note: `docs/roadmap-spec-v2.md` had cited `#4a74ed`/`#706ed0`/`#c65e8f` for cobalt/violet/magenta — corrected against the mockup |
| V2-6.2 | Landing page (§8.2) | done | PR #22 → corrected SPA-04 | public-surface check: all five sections present (`Every campaign`, `Built for the whole delivery`, `How it works`, `Two ways in`, `Follow along`); route 200; renders without the app shell | `/` moved to public landing; workspace overview moved to `/dashboard` |
| V2-6.3 | Sign-up branching (§8.3) | done | PR #22 → corrected SPA-05 | public-surface check: three paths present (Employee / Partner agency / Client or third party) and the page states there is no guest self-serve | guest has no self-serve path by design |
| V2-6.4 | Terms / Privacy / Accessibility (§15.1–15.3) | done | PR #22 → corrected SPA-03 | public-surface check: three routes 200 with spec content (terms incl. governing law; privacy incl. UK data location; accessibility incl. WCAG 2.2 target, known gaps, and an explicit not-yet-counsel-reviewed caveat) | explicit draft/legal-review caveats per roadmap rule "legal-finalisation is a human decision" |
| V2-6.5 | Resources / What's New (§15.4) | done | PR #22 → corrected SPA-05 | public-surface check: status + in-development + recently-shipped sections present, incl. `Not configured` for the unconfigured agent provider | honest status rather than aspirational |

### SPA — Authoritative specification-package alignment (2026-09-15)

Supersedes the V2-6.x content rows above. The authoritative package arrived
after PR #22 merged; V2-6.1–6.5 had been written from the PDF *summary*, and
several values and facts in them were reconstructed rather than sourced. These
rows record the correction. Branch `spec-package-assets-alignment`, PR #24.

| ID | Scope | Status | Commit | Gates | Notes |
| --- | --- | --- | --- | --- | --- |
| SPA-01 | Brand ramp corrected to the supplied mark (§8.1) | done | PR #24 | `tokens.test.ts` now derives the contract from the shipped SVG: it reads `/brand/palette-canvas-logo-mark.svg`, asserts every hex fill is a declared ramp colour, and requires indigo/magenta/accent to be present; negative-tested by injecting `#123456` into `brandRamp.indigo` → `brandRamp.indigo drifted`; 6 mark fills verified | authoritative 5-stop ramp `#7876e0 → #9471cb → #ba6aae → #cd67a0 → #d66599`; `#4f7dff` is the accent **centre dot**, not the gradient start. V2-6.1's 3-stop accent gradient and `cobalt` key were wrong. `brandDotsCompact` added for the mockup's compact lockup |
| SPA-02 | Logo assets from the package replace the hand-drawn mark | done | PR #24 | landings/legal/footer render `/brand/palette-canvas-logo-horizontal.svg`; public-surface check OK; build exit 0 | `palette-canvas-logo-mark.svg` + `palette-canvas-logo-horizontal.svg` in `apps/web/public/brand/`; `BrandDots` (inline spans) removed, `BrandLockup` (real asset) adopted |
| SPA-03 | Legal pages rebuilt from the authoritative drafts (§15.1–15.3) | done | PR #24 | public-surface check asserts `WCAG 2.1 Level AA`, `POPIA`, `Render`, the real contact address, and the UK-data open item; a fabrication guard scans all three pages for `England and Wales` / `WCAG 2.2` / `United Kingdom` / `Governed by the laws of` and fails the gate if any reappears (verified by injecting a governing-law clause → gate failed) | PR #22 shipped invented content: a governing law of England and Wales, a UK data location, and a WCAG 2.2 target. Authoritative drafts say **WCAG 2.1 AA**, POPIA-first, and — per the user directive to ignore the AWS instruction — **Render** hosting rather than AWS `af-south-1`. The UK GDPR/POPIA question is carried as an explicit open item, not silently decided |
| SPA-04 | Landing page aligned to §8.2 / `landing-page-mockup.html` | done | PR #24 | public-surface check asserts the six card titles (`Boards & views`, `Dashboards`, `Communication`, `AI agents`, `Compliance`, `Integrations`) plus `Intake to handover` / `How it works` / `Two ways in`; route 200; no app shell | §8.2 requires one card per core capability — exactly six. PR #22 shipped seven cards sized around generic marketing copy ("Every campaign…", "Know the floor…", "Agents propose…"). Meta description and `metadata.title` corrected from the app's internal wording to the public product positioning |
| SPA-05 | Sign-up corrected to §8.3 and fonts to the mockup; resources made honest | done | PR #24 | public-surface check asserts the two requestable paths and the Guest boundary, and still asserts no guest self-serve statement is missing; build exit 0 | §8.3 is explicit that Guest has **no** sign-up path — PR #22 shipped three cards including a Guest one. Now two requestable paths plus an explicit Guest boundary. Poppins added as `--font-display` for the public surface (mockup uses Poppins/Inter/IBM Plex Mono; the app keeps Fraunces/Manrope). `contact.ts` centralises the package's real contact address. `scripts/public-surface-check.sh` also gained a `body_of` helper: its old `$(fetch A; fetch B; cat file)` idiom clobbered the shared temp file and silently checked one page twice — the reason the fabrications passed CI in the first place |
| N1.1 | Email transport provider abstraction (§0.2) + dev outbox fallback | done | PR #25 `b25e715` | e2e: `/email/status` reports `transport: outbox`, `deliverable: false`; signup still succeeds; outbox row records `send_attempts`, `transport`, null `delivered_at`; 354 passed / 0 failed | `apps/api/src/email/{email.transport,email.service,email.controller}.ts`; `EmailTransport` is an abstract class so it doubles as the Nest token (the `LlmProvider` convention). Enqueue is transactional, dispatch is post-commit and never throws, so a mail outage cannot roll back a signup. SMTP selected by `PC_SMTP_HOST`/`PC_SMTP_FROM`; no provider chosen (human gate D1) |
| N1.2 | A-02 verification + login/session hardening | done | PR #25 `b25e715` | e2e: unverified login **403** (was 401), reuse **410**, expired token **410**, unknown token **401**, resend throttled inside 60 s window, resend for unknown address does not disclose existence; 354 passed / 0 failed | Credential tokens now carry `expires_at` (24 h) — previously valid forever until consumed. Failure codes split deliberately: unknown 401 vs already-used/expired 410, so a user whose click already worked is not told their token is invalid |
| N1.3 | A-03 password reset/change + session revocation, audited | done | PR #25 `b25e715` | e2e: reset round-trip, weak password 400, reuse 410, expired 410, unknown 401, pre-reset session revoked, no active sessions left behind, change-password wrong-current 401, changer's own session survives, revoke-others keeps caller, all audited; 354 passed / 0 failed | `consumed_at`/`email_outbox` single-use tokens; `person.password_changed_at` added; `revokeSessions(exceptToken?)` spared the caller's own session on change and revoked all on reset |
| N1.4 | A-04 members/invites/roles admin surface | done | PR #25 `b25e715` | e2e: binding created on accept, invite reuse 409, pending-invite revoke → token 409, member revoke drops bindings, revoked member 403 on `/projects`, self-revoke 403, client 403 on member list, revocation audited; 365 passed / 0 failed. Browser: admin sees members + invites; non-admin sees a restricted notice | `GET /directory/members`, `DELETE /directory/members/:personId/roles`; `/settings/members` + `MemberActions.tsx`. Invite tokens are surfaced in the UI because there is still no mail transport (ADR-0002 D1) — an admin has to hand the token over manually |
| N2.1 | Public-surface check moved into `npm test`; `body_of` clobbering documented | done | PR #25 `b25e715` | `npm test` now runs `test:public-surface` → `scripts/public-surface-gate.sh`, which boots the built app on an ephemeral port and rebuilds when sources are newer than `BUILD_ID`; negative-tested by removing `POPIA` from the privacy page → gate failed exit 1; green when restored; CI step for the standalone check removed as redundant | The check was a separate CI step nobody ran locally, which is how fabricated legal content reached `main`. Gate lives with the tests now, so a local `npm test` catches the same drift CI does |
| N2.2 | A-14 board moves + global search (API + web) | done | PR #26 `93a21f7` | e2e: move between groups lands in the destination; reorder before a sibling leaves a gap-free ordered list; `beforeItemId` outside the destination group 400; guest move 403; move audited; search finds by name, empty on no match, guest search returns nothing; 374 passed / 0 failed. Browser: `/boards` lists, `/boards/:id` renders groups + status labels, ⌘K search returns "Acme launch film" | `POST /boards/items/:itemId/move` (park-then-reorder) and `GET /boards/search`, hoisted above `@Get(':id')` so `search` is not read as a board id. `apps/web/app/boards/*` + `KanbanView.tsx` (optimistic reorder mirroring the server rule, rollback on rejection) + `GlobalSearch.tsx`. Timeline/Gantt and subtasks split to N2.2a. Correction: `subitem` + `parent_item_id` **do** exist in migration 010 — the gap is that no service or UI code reads them, not a missing migration |
| N2.2a | A-14 follow-up: subtasks, timeline/Gantt renderer, swimlanes | done | PR #27 merged as `727a1f3` | e2e: subitem round-trip with parent/engagement inheritance; subitem column validation (labels required, unknown type 400); subitem write scoped to parent (cross-board column rejected); guest subitem read/write 403; timeline 404 with no gantt/calendar view; bad `date_column_id` 400; date cell → one-day bar; `{from,to}` → spanned bar; unscheduled items reported with reason, not dropped; unparseable date yields no bar; guest timeline 403; `board.subitem_column_added` / `group.created` / `group.updated` audited; **401 passed / 0 failed**. Browser: kanban nests subtasks under parents; adding a subtask persists through reload; timeline tab renders swimlanes + date range + unscheduled list; read-only role sees no add form and a capability notice | Service + controller + web only, no migration (`subitem`/`subitem_column`/`board_group`/`board_view` already in 010). `readDateSpan` accepts both `date` (ISO string) and `timeline` (`{from,to}`) shapes and returns null for anything else, so the caller reports rather than guesses. Timeline resolves its date source from the view's `config.date_column_id` — it never picks a column itself |
| N2.4 | Visibility boundary for boards **and meetings** (internal/engagement-less never reaches an external role) | done | PR #28 merged as `495457f` | e2e: internal workspace + board created; client board list excludes the internal board; client `GET /boards/:id` on it 403; client workspace list excludes the internal workspace; staff (AM) still read it 200; engagement-less meeting invisible to the client list and `join` 403; client may still book + join on its own engagement (201); reviewer with `meetings.read` lists (200) but cannot book (403); shared tests assert the read/write split and that no role can book a meeting it cannot read; **414 passed / 0 failed**; permission tests + public-surface gate green | `Capability.MeetingsRead` added; `GET /meetings` re-gated from `MeetingsWrite` to it (a read-only role could not otherwise see the schedule). `canSeeEngagement(null)` now asks `canSeeVisibility(Internal)` instead of `!ctx.itemScope` — a client has no itemScope either, which was the leak. `requireBoard`/`listBoards` join `workspace.workspace_type`; `listWorkspaces` and `listMeetings` filter the same way; `scheduleMeeting` refuses to create a meeting the creator could not read back. The client-side case is guarded only for `internal`: `canSeeVisibility` reads `ctx.scopes`, which only agency/project bindings populate, so engagement-bound users are scoped by `ctx.engagementId` instead |
| N2.3 | Surface the V2 comms layer (§11) in the web app — channels, threads, mentions, meetings | in-review | branch `n2.3-comms-surface` | e2e: cross-engagement external channel is absent from the client list and 404 by id on read *and* write (was 200/201 — an access hole); client still reads its own engagement channel; a client mentioned on an internal channel raises no notification, while a staff mention on the same channel still notifies and a client mention on an external channel still notifies; **423 passed / 0 failed**; permission tests + public-surface gate + production build green; browser pass on both roles (`/comms`, `/comms/[id]`, `/meetings`) incl. internal-channel-by-URL refused for the client | Two access-control findings beyond the UI slice, both fixed here (see detail). Web renders whatever the API returns and never re-filters visibility client-side. `/comms` + `/meetings` added to the `connect` nav section on `channels.read` / `meetings.read`; badge tones use palette-supported tokens. Seed gained V2 comms fixtures (channels + meetings, both visibilities) so §11.2 is demonstrable on a seeded DB |

## Recently completed detail

### N2.3 — V2 comms surface in the web app (§11) (2026-09-17)

- Branch: `n2.3-comms-surface`, based on `main` at `495457f` (PR #28, which was
  the precondition — N2.4 had to land first so the "hidden from client" claim
  this slice makes is one the server actually enforces).
- Web (new routes, no migration — the comms API and schema were already there):
  - `apps/web/app/comms/page.tsx` — channel list with visibility badge and the
    engagement/division scope, read from the API payload.
  - `apps/web/app/comms/[id]/page.tsx` + `ChannelView.tsx` — channel detail:
    composer, threaded replies, mention picker, and the audited
    convert-to-external action. A channel the caller cannot see renders the
    "Channel unavailable" state rather than a partial page.
  - `apps/web/app/meetings/page.tsx` + `MeetingActions.tsx` — meeting list with
    the read/write split driven by capability, plus join recording attendance.
  - Nav entries in the `connect` section (`nav.ts`), gated on `channels.read`
    and `meetings.read`; icons registered in `AppShell.iconFor`.
- **The web layer does not filter visibility.** `listChannels` pins a client to
  `external` in SQL and `requireChannel` refuses an internal channel; every page
  renders whatever the API returned and lets a 403/404 stand. Re-filtering in
  the browser would be a security bug wearing a UI costume, and the N2.3
  planning notes flagged it as the slice's main risk.
- Two access-control findings, found by probing the running API rather than by
  reading the plan. Both are in the comms service and both were reachable
  *before* this slice — the UI only made them relevant:
  1. **The by-id gate did not match the list.** `listChannels` narrowed by
     `ctx.engagementId` and pinned a client to `external`, but `requireChannel`
     checked only org and visibility. So an external channel belonging to
     *another* engagement was absent from the client's list yet readable by id
     (`GET .../messages` 200) and writable (`POST` 201) — the list was
     decorative. Worse, the gap cut both ways: a scoped staff member could read
     by id a channel their own list omitted. Fixed by `canReachChannel`, which
     resolves the same predicate the list uses (external role → `external`;
     scoped caller → its own engagement, with `platform_owner` /
     `operations_director` explicitly exempt as division-wide). A scope mismatch
     answers **404**, so an invisible channel stays indistinguishable from one
     that does not exist. The pre-existing internal-channel refusal keeps its
     tested **403** rather than being quietly reshaped to fit the new helper.
  2. **A mention notified a client about an internal message.**
     `postMessage` fanned `mentions` straight into `notification` rows without
     asking whether the recipient could read the channel. A lead mentioning a
     client on an internal channel raised "You were mentioned in *Nimbus
     production*" in that client's inbox — the channel name leaked even though
     the message itself stayed behind the 403. Now `visibleMentionRecipients`
     drops mentions addressed to someone who cannot read the channel, resolving
     agency/project bindings through their engagement exactly as
     `IdentityService.resolve` does. The message still posts and the mention is
     still recorded *on* it; only the notification — the part that reaches
     outside the channel — is withheld. Staff-to-staff mentions on an internal
     channel and client mentions on an external channel both still notify, which
     the e2e asserts so the filter cannot silently become "suppress mentions".
- Gates: `npm run build` exit 0 (route manifest includes `/comms`,
  `/comms/[id]`, `/meetings`); **e2e 423 passed / 0 failed**; permission tests
  and the public-surface gate green via root `npm test` exit 0.
- Browser QA, on a re-seeded dev DB (the e2e suite truncates every domain table,
  so a browser pass recorded before the last `npm test` is describing rows that
  no longer exist — re-seed first, then browse):
  - Lead: `/comms` lists channels with visibility badges and scope;
    `/comms/[id]` renders composer, threads, mentions and the convert action;
    a posted internal message persisted and was attributed correctly; convert
    on a throwaway internal channel recorded
    `channel.converted_external {reason: "client asked to join this thread (QA probe)"}`.
  - Client: `/comms` limited to external channels; the internal channel by URL
    renders "Channel unavailable"; a cross-engagement external channel is 404
    on read and write; the client inbox stays empty when mentioned on an
    internal channel.
  - Meetings: read-only role sees the schedule without the booking form; lead
    books and joins; attendance recorded (`Nimbus weekly review | joined=t`).
- Disclosure: the N2.3 planning notes claimed `ThirdPartyVendor` holds
  `channels.read`. It does not — `packages/shared` grants that role only
  `ProjectsRead`, `NotificationsRead`, `EventsStream`, `BoardsRead` and
  `ItemsRead`, so the vendor paths remain unreachable. The permissions test pins
  the real matrix (`vendor has no channel access`); no vendor-shaped branch was
  built to satisfy a claim the matrix contradicts.
- Residual, deliberately unchanged: `channel_member` is still written and never
  read, so a channel remains org-wide within its engagement and the UI draws no
  member list or privacy affordance (the planning notes call silently implying
  privacy "the worst of the three options"). Wiring membership into
  `listChannels`/`requireChannel` changes access for every existing channel and
  belongs in its own reviewed slice with its own tests.

### N2.2a — A-14 subtasks, timeline/Gantt, swimlanes (2026-09-16)

- Branch: `n2.2a-timeline-subtasks-swimlanes` (PR #27), branched from `main` at `93a21f7`
  (PR #26). No migration: `subitem`, `subitem_column`, `board_group`, and
  `board_view` all shipped in `010_v2_core_model.sql`; the gap N2.2 disclosed was
  service + renderer code, and that is all this slice adds.
- API (`boards.service.ts` / `boards.controller.ts`):
  - Subitems are read through `getItem(parentItemId)`, so the parent's
    engagement boundary applies to its children. A subitem is not a side door
    around `canSeeEngagement`.
  - `createSubitem` inherits `engagement_id` from the parent rather than
    accepting it from the caller — otherwise a subitem could be stamped into an
    engagement the writer cannot see.
  - `validateSubitemValues` rejects any column id not on the board's
    `subitem_column` set, so a parent's board column cannot be used as a subitem
    column. Subitem columns are their own smaller set per §9.3, not a copy.
  - `moveSubitem` reuses the park-then-reorder shape from `moveItem` and
    requires `beforeSubitemId` to share the parent — a sibling in another list
    would order against the wrong sequence.
  - Guests (`ctx.itemScope`) are refused subitem writes explicitly; reads go
    through the parent's `getItem`, which already gates them.
  - `timeline` prefers an explicit `?viewId`, else falls back to the first
    `gantt` then `calendar` view; no such view is 404, a non-timeline view 400,
    and a `date_column_id` outside the board 400.
- `readDateSpan` — the one genuinely non-obvious piece. Both shapes the spec
  allows are accepted: a `date` cell is a single ISO string (one-day bar), a
  `timeline` cell is `{from,to}`. Anything else — a number, free text, a
  malformed object — returns null so the item lands in `unscheduled` with a
  reason. Reversed ranges collapse to the start rather than drawing a negative
  bar. Silently dropping undated work would make the timeline look emptier than
  the board is.
- Audit: `subitem.created/updated/moved/deleted`, plus `group.created`,
  `group.updated`, and `board.subitem_column_added`. The last two were added
  during review — `addColumn` and `board.created` already audit, so creating a
  group or a subitem column without one would have been an inconsistency, not a
  judgement call.
- Web: `SubtaskList.tsx` (subtasks under each card, `onDragStart` prevented so
  the card's drag does not hijack the input), `TimelineView.tsx` (swimlanes as
  horizontal bands on one shared time axis, so a date sits at the same x in
  every lane; one-day bars get a 1.5% floor width; unscheduled list below),
  `BoardViews.tsx` (Kanban/Timeline switcher). The Timeline tab only renders
  when the server produced a payload — offering a tab that 400s on click is
  worse than not offering it.
- Board page fetches `subitems()` per item and `timeline()` once, tolerating
  404 as "no timeline configured" rather than an error.
- Gates: `npm run build` exit 0; **e2e 401 passed / 0 failed**; public-surface
  gate OK; drift 0 findings across 106 rows; `scripts/loc.sh` 25,052 LoC of
  code (apps + packages + scripts; 27,104 including `docs/`). The doc figure is
  not stable — `loc.sh` walks `docs/`, so every ledger edit moves it without any
  code changing, which is why the code-only number is quoted first here.
- Browser QA, re-run against a freshly seeded dev DB (the earlier pass was
  recorded against identities and fixtures that do not exist: the dev seed is
  all `@besbpo.example`, and the run order was `npm test` *then* browse, so the
  e2e suite's truncate had already wiped anything a browser had created).
  Verified this time with cookie `pc_user_email` on the tunnel host:
  - `am@besbpo.example` (account_manager) → `/boards` lists the board; kanban
    renders `subtasks (1)` nested under its parent; typing "UI-added subtask"
    and pressing **add** persisted it — visible through reload *and* present in
    `subitem` joined to the correct `parent_item_id`, attributed to `am`.
  - Timeline tab rendered `Gantt view · positioned by **Due** · 2026-03-20 →
    2026-03-21`, the swimlane `Lane one` with its one scheduled bar, and
    `Not scheduled (2)` listing "Undated item · no date set" and
    "Bad date item · date not parseable" — i.e. undated work is reported, not
    silently dropped.
  - `qa@besbpo.example` (quality_reviewer, `items.read` but not `items.write`)
    on the same board: no add form, and the notice "You can read this board.
    Moving items requires the items.write capability." Nav also collapsed to
    the capability-gated subset. `POST .../subitems` as `qa` → **403
    `missing items.write`**.
- **Security finding — external roles can read internal boards (pre-existing,
  not introduced by this slice).** Verified on the dev DB: a board with
  `engagement_id IS NULL` in an `internal` workspace is readable by
  `client-a@nimbus.example` (`client_approver`) — `GET /boards/:id`,
  `/boards/:id/timeline`, and `/items/:id/subitems` all return **200**, and the
  client sees the board's item names and columns. `boards.service.ts` consults
  neither `workspace_type` nor `canSeeVisibility`; `requireBoard` only checks
  org, `itemScope`, and `canSeeEngagement`, and `canSeeEngagement` returns
  `!ctx.itemScope` for `engagement_id === null`, which is **true** for a
  client_approver (`itemScope: null`, bounded by a `scopes[].workspaceId`,
  not by `itemScope`). The same shape was confirmed on `main` @ `93a21f7`, so
  it is not a regression from this branch — but `/timeline` and `/subitems` are
  new surfaces that inherit it, which is why it is recorded here rather than
  left to the audit. An engagement-scoped board *is* correctly refused (404).
  The fix is a visibility check in `requireBoard`/`listBoards` and an e2e case
  asserting a client cannot read an engagement-less internal board; it is not
  attempted in this slice because it changes existing board access for every
  role and belongs in a reviewed N2.4 with its own test.
- Earlier recorded claims that browser QA used `ops@besbpo.example` and created
  "Browser QA subtask" on "Final lockups", and that a cross-org
  `client-a@nimbus.example` read "returned the board-unavailable state", were
  wrong on all three counts and have been replaced by the above.

## Recently completed detail

### N2.2 — A-14 board DnD moves + cross-board search (2026-09-15)

- Branch: `n2-board-ui-dnd-search`, merged to `main` as `93a21f7`. PR #26 was retargeted from the N1 branch to `main` once PR #25 landed as `b25e715`; the post-retarget diff was N2.2-only (14 files).
- API work that had to land before any UI:
  - `POST /boards/items/:itemId/move` — public surface for kanban DnD. The
    reorder is two statements, not one: the item is parked at position `-1`,
    the destination list closes the gap (`position = position + 1 WHERE
    position >= index AND id <> :itemId`), then the item is placed. A single
    statement cannot do this because the mover's own old position sits inside
    the range being shifted. `position` has no unique constraint in migration
    010, so the intermediate parked state is legal.
  - `beforeItemId` must resolve to a row in the *destination* group; anything
    else is 400 rather than silently ordered against the wrong list.
  - `GET /boards/search` — cross-board item search over `name` and
    `column_values::text`, archived boards excluded, `LIMIT 50`. Declared
    **above** `@Get(':id')`: Nest matches in declaration order, so a later
    declaration would have been captured as a board id and returned
    `board not found`.
  - Moves write an `item.moved` audit row with the destination group + index.
- Visibility: a guest (`ctx.itemScope`) gets `[]` from search and 403 from move.
  Search filters `canSeeEngagement` after the query, matching how `getItem`
  already gates reads.
- Web: `/boards` (list) and `/boards/[id]` with `KanbanView.tsx` — HTML5 DnD,
  optimistic reorder that mirrors the server's index rule and rolls back on
  rejection. `GlobalSearch.tsx` sits in the app-shell top bar and calls
  `boards/search` through the same-origin `/pc-api` prefix. Types/helpers in
  `lib/api.ts`; `Boards` added to `nav.ts`.
- Gates: e2e **374 passed / 0 failed** (board move, beforeItemId rejection,
  guest move rejection, search, audit search); `npm run build` exit 0;
  public-surface check OK; drift 0 findings.
- Browser pass (dev identity `am@test.example`, cookie `pc_user_email`):
  `/boards` lists four seeded boards; `/boards/:id` renders both groups with
  status labels; ⌘K search for "Acme" returns the cross-board hit
  "Acme launch film". A stale `dist/main` server had to be killed before the
  new `search` route answered — the watch process was serving an old build.
- Unrelated fix carried in this branch: `apps/api/tsconfig.json` had
  `"removeCompiler": true`, which is not a real option. `nest build` ignores the
  unknown key (so CI stayed green), but a direct `tsc -p apps/api/tsconfig.json`
  fails with TS5023. Corrected to `removeComments`. It was a pre-existing
  uncommitted edit that a `git add -A` swept into the N2.2 commit; disclosed here
  rather than left looking like part of the board work.
- Deliberately **not** in this slice: the Gantt/timeline renderer, subtasks,
  and swimlanes (N2.2a). The schema for those already exists — `subitem` +
  `parent_item_id` in migration 010, `ViewType.Gantt`, and
  `assertViewConfig`'s `date_column_id` requirement — so the remaining work is
  service + renderer code, not a migration. Claiming all four in one PR would
  have overstated coverage. **Landed in N2.2a (see that entry):** subitems,
  timeline/Gantt, and swimlanes all shipped against this same schema with no new
  migration.

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
- Gates: `npm run build` exit 0 (all workspaces); `npm test` → design-token snapshot + permission tests pass, API e2e **326/326**; drift 0 findings; public-surface check OK; LoC 22,990.
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

Superseded for *new* work by `docs/roadmap-spec-v2.md` (Phases 0–6, all done,
then corrected by the SPA rows) and the A-block. Retained for the pre-V2 backlog
still genuinely open:

1. **Object storage backend** — the V2 `files` model and version chains are
   built (PR #22) and the API exposes S3-shaped `put`/`read` plus HMAC signed
   URLs, but the backend is still local disk. Raster thumbnailing records
   `pending-external-worker`; producing real raster renditions, and serving
   asset bytes from a bucket rather than the API's disk, hang on this decision.
2. **Queue + notifications** — ~~notifications emit synchronously; a queue is
   needed~~ **stale: P6-11 (PR #12) added a PG `SKIP LOCKED` queue with backoff
   retry, DLQ and idempotency, and P7-03 delivers reminders through it.** What
   remains open is *outbound delivery transport* (see item 5).
3. **Skills/availability workload** — the workload page is totals only; PDF V1
   wants thresholds, skills, availability, auto-balance. Genuinely open.
4. **Integrations + automation hub** — ~~none built~~ **stale: P6-04 added
   webhook CRUD, P6-08 a rules DSL on the event bus, P7-04 API keys, P7-06
   integration health, and P8-11 an export log — all in PRs #12/#14/#18.** Open
   work is limited to third-party OAuth connectors (Adobe/Canva/Dropbox, §13.4)
   and import/export *fidelity* beyond the dry-run validator (A-12).
5. **Identity hardening** — header auth remains, and the A-block still stacks
   on it, but the top of the stack moved in N1: A-02 (verification +
   login/session) and A-03 (reset/change + revocation) are now code-complete
   and green on branch `n1-email-transport-auth-chain` (PR #25) against the outbox
   fallback. What still gates real delivery is the email-provider decision
   (`docs/decisions/ADR-0002.md` D1); A-04/A-05/A-10 sit behind A-02 but are no
   longer blocked on code. Separately, `GET /identity/users` returns every
   `person` row across **all** orgs to any caller — it is the documented
   dev-mode switcher, not a product endpoint, so it is tracked as a
   Phase-5-hardening item rather than fixed here.
6. **Hosting region** — `render.yaml` exists with no region pinned. Every
   residency claim in §15.2 the privacy page is now tied to this decision (the
   page says Render and flags the UK question as open rather than asserting a
   location).
7. **~~Visibility boundary on boards and meetings~~** — **fixed in N2.4 (PR #28)**.
   `boards.service.ts` enforced org, guest (`itemScope`) and engagement scope but
   never `workspace_type`/`canSeeVisibility`, so an external role could read an
   `engagement_id IS NULL` board in an `internal` workspace, including its items,
   columns, timeline and subtasks; `listMeetings` filtered only by org and
   engagement, so a client was returned an engagement-less internal meeting and
   `joinMeeting` let it join. N2.4 `requireBoard`/`listBoards`/`listWorkspaces`
   now join `workspace.workspace_type`, `listMeetings`/`joinMeeting`/`scheduleMeeting`
   apply the same predicate, `canSeeEngagement(null)` asks the visibility question
   rather than testing `itemScope`, and `GET /meetings` is gated on the new
   `Capability.MeetingsRead`. Covered by an e2e case that exercises the client
   (board 403, workspace omitted, meeting omitted, join 403) *and* the staff
   positive case, plus a read-only reviewer that can list but not book. The
   engagement-less meeting in that test is booked by a division-wide actor, since
   an engagement-bound AM would have its own `engagementId` stamped on it.

~~Dashboards~~ — delivered by V2 Phase 4 (PR #22), per the V2 rows above.
~~Legal/resource pages~~ — delivered V2 Phase 6 (PR #22), corrected by SPA-03/05.

## Next phases

Priorities here are ordered by *leverage* — what unblocks the most downstream
work — rather than by roadmap number. P8, A-01 and V2 Phases 1–6 are all done;
what remains is the A-block (A-02…A-16), the platform-surface long tail, and the
V1 scale targets from `docs/roadmap.md` Phase 6.

### Current position (2026-09-17)

N1 (`b25e715`), N2.1/N2.2/N2.2a (`93a21f7` / `727a1f3`) and N2.4 (`495457f`) are
merged. **N2.3 is the only open slice**, in review as PR #29 on
`n2.3-comms-surface`. Everything in the N2 band is therefore either merged or
awaiting review; the next agent should not start new work until N2.3 merges, but
the queue behind it is decided and does not depend on it:

1. **N3.2 — webhook hardening** (rate limits + retention enforcement). This is
   the highest-leverage open item because it is *unblocked*: the outbound HMAC
   signing and the P6-11 queue already exist, and `N1.1` (the transport seam it
   was waiting on) is merged. Its remaining scope is narrower than the row
   wording — see the scoping note below.
2. **N3.3 — API versioning + importer apply**, equally unblocked (`P7-04` API
   keys and the P8-11 dry run are both merged).
3. **N3.4 — DR drill refresh**, which is cheap but was last run at 55 e2e checks
   and its quoted evidence is stale; keep it here rather than quoting the old
   numbers.
4. **A-05 → A-07** (MFA enforcement, deactivation/export/sessions, settings) —
   the A-block tail, all with their dependencies (A-02/A-03/A-04) merged.

**Still gated on a human decision, do not start:** **N3.1 / A-16** depend on the
storage-provider choice, and the email-provider choice (`ADR-0002` D1) remains
open even though the transport seam is built. Neither is a coding decision and
an agent picking a provider to "unblock" would be inventing a product decision.

**One diagnostic worth handing over.** The N2.3 findings were both access
holes that the *planning notes did not predict* — the notes actually asserted
the comms boundary was already correct, and the capability claim in them
(`ThirdPartyVendor` holds `channels.read`) was wrong. Both were found by probing
the running API with a scoped identity, not by reading code. N3.2 and N3.3
touch the same kind of surface (webhook secrets, API keys), so probe them with a
low-privilege caller before trusting the notes.

### Immediate — N1: unblock the identity chain (A-02 → A-03 → A-04) — **done**

The whole remaining A-block stacked on one missing piece. Delivered as
`b25e715` (PR #25); the slices below are kept for the record.

| Slice | Scope | Depends on | Test shape |
| --- | --- | --- | --- |
| N1.1 | Email transport provider abstraction (§0.2) with a dev fallback that logs to `email_outbox`; **no real provider selected** | human provider decision | e2e: outbox row written, send is a no-op without config |
| N1.2 | A-02 verification + login/session hardening: enforce `verified_at` at login, single-use token (410 on reuse), resend throttle, session expiry | N1.1 | e2e: verify flips, reuse 410, unverified login 403, expired session 401 |
| N1.3 | A-03 password reset/change + session revocation, all audited | N1.2 | e2e: reset round-trip, expired token 410, old session 401 |
| N1.4 | A-04 member invites/directory/roles admin UI over the A-01/A-02 API (supersedes the P8-01 API-only invite) | N1.3 | e2e: invite→accept→binding, revoke, admin-only 403; browser pass |

**Human gate:** which email provider (SMTP relay / Resend / SES) and whether the
dev-log fallback is acceptable for the pilot. The agent builds against the
abstraction either way and records the decision in `docs/decisions/`.

### Next — N2: test-harness determinism, then the frontend board surface

| Slice | Scope | Depends on | Test shape |
| --- | --- | --- | --- |
| N2.1 | Make `public-surface-check.sh` part of `npm test` rather than an optional script, and document the `body_of` clobbering class of bug in `AGENTS.md` so it is not reintroduced | — | `npm test` fails when a public page drifts |
| N2.2 | A-14 board UI: DnD board moves, global search over the V2 §9 model. Timeline/Gantt + subtasks are **not** in this slice | SPA-01 tokens | e2e: moves persist, reorder is gap-free, guest 403; browser: K search returns cross-board hits |
| N2.2a | A-14 follow-up: timeline/Gantt renderer, subtasks, swimlanes | N2.2 | e2e: subtask parent/child round-trip; Gantt view renders off `date_column_id` |
| N2.3 | Surface the V2 comms layer (§11) in the web app — channels, threads, mentions, meetings | N2.2 | browser pass; internal channel hidden from client |
| N2.4 | Visibility boundary for boards **and meetings**: enforce `workspace_type`/`canSeeVisibility` in `requireBoard` + `listBoards` so external roles cannot read `internal`, engagement-less boards; make `listMeetings`/`joinMeeting` refuse a client an engagement-less or internal meeting; add `Capability.MeetingsRead` and gate `GET /meetings` on it | N2.2a | e2e: client_approver and third_party_vendor get 403/404 on an internal board and on its items/timeline/subitems, and are not returned an engagement-less meeting; internal roles unaffected |

Status: N2.1, N2.2, N2.2a and N2.4 are **done** (PR #27 merged as `727a1f3`;
PR #28 merged as `495457f`). N2.3 is **in review** on branch
`n2.3-comms-surface`. N2.4 closed the pre-existing board visibility gap found
during the N2.2a browser pass, widened it to cover meetings, and was a
prerequisite for trusting the "hidden from client" claims that N2.3 and later
surfaces make.
**N2.3 follows N2.4.** Its API existed, so the slice was mostly web routes; but
it was *not* purely UI — probing the running API surfaced two comms-service
access holes (by-id gate narrower than the list; mention fan-out ignoring
visibility), both fixed in the same slice because a UI that renders the list
makes them reachable in practice. The visibility filter stayed server-side.

**Why N2.4 came before N2.3 despite the number.** N2.3 adds the first
external-facing comms surface. The channels layer's *visibility* rule was the
one part that held (`requireChannel` refused a client any non-`external`
channel, and `listChannels` pinned a client to `external` in SQL) — though N2.3
later found that rule had a companion hole: the by-id gate did not narrow by
engagement the way the list did, and mention fan-out ignored visibility
entirely. What was unambiguously broken was the two
surfaces N2.3 sits next to: boards leaked engagement-less internal
boards to clients (gap 7, now fixed), and `listMeetings`/`joinMeeting` leaked
engagement-less internal meetings to clients the same way. Building an
external-facing comms UI on top of unfixed boundaries would widen the blast
radius of an existing issue, and it was not safe to keep making "hidden from
client" claims — the exact claim N2.3's test shape asserts — while a known
boundary gap was open. N2.4 was small, well-bounded, and had a clear test, so it
closed first.

### Then — N3: honesty and operational maturity

| Slice | Scope | Depends on | Test shape |
| --- | --- | --- | --- |
| N3.1 | Storage backend behind the existing S3-shaped seam; real raster thumbnails | human storage decision | e2e: asset round-trip from bucket, thumbnail rendition produced |
| N3.2 | A-13 webhook hardening (HMAC verify), rate limits, retention enforcement | N1.1 | e2e: bad signature 401, 429 on burst, retention purge |
| N3.3 | A-12 public API versioning + importer apply (beyond the dry run) | P7-04, P8-11 | e2e: versioned key call; dry-run then apply |
| N3.4 | A-16 observability + DR drill refresh; re-run the backup/restore and load drills against the current schema (they were last run at 55 e2e checks) | N3.1 | drill reports committed; p95 < 1000 ms |

### Scoping notes for the next three slices (read before starting)

Derived from reading the code, not just the plan — the gaps below are what the
test shape in each row actually requires.

**N1.4 — A-04 members admin.** The invite API is complete and tested
(`apps/api/src/invites/*`, e2e "invites (P8-01)"); what is missing is the
product surface and the directory side of it:
- No web route renders members, pending invites, or role bindings. Add
  `/settings/members` and link it from the settings hub (the `SettingLink`
  pattern already there), plus a nav item gated on `invites.manage`.
- `directory.service.ts` has agencies/brands/contacts but **no member listing**.
  Add `listMembers(orgId)` joining `person` + `role_binding`; revoke needs a
  binding-delete path that does not exist yet.
- The e2e "invite→accept→binding, revoke, admin-only 403" shape is *partly*
  covered already (create/list/accept/403-asserter exist). The genuinely new
  assertions are: revoke makes the token unusable, and an accepted invite
  actually produced the `role_binding` row.
- Client-side mutations must follow `ProjectActions.tsx`: `'use client'`,
  `fetch(`${apiUrl}/...`)` with the `x-user-email` header, `router.refresh()`.

**N2.2 — A-14 board UI.** The API is broader than the UI:
- `boards.service.ts` has no reorder/move operation and no global search.
  DnD persistence needs a `PATCH` that moves an item between groups and rewrites
  `position`; "global search" needs a cross-board item query. Both are API work
  *before* any UI work, and both need their own e2e.
- Existing UI is `apps/web/app/projects/[id]/BoardView.tsx` (204 lines) — a
  read-oriented view. Extend it rather than starting a second board surface.
- **Correction (2026-09-15):** an earlier version of this note claimed
  timeline/Gantt and subtasks "have no schema at all in `010_v2_core_model.sql`;
  subtasks need a migration." That is wrong. Migration 010 already defines
  `subitem_column` + `subitem` with `parent_item_id`, `ViewType.Gantt` exists in
  `packages/shared`, and `assertViewConfig` already requires `date_column_id`
  for both `gantt` and `calendar`. The real gap is that no service method or web
  renderer reads any of it — that is code work, not a migration. N2.2 shipped
  moves + search only; **N2.2a closed that gap** — subitems, the timeline/Gantt
  renderer, and swimlanes all landed there against the existing schema, so no
  part of the §9 collaboration surface remains unimplemented.

**N2.3 — V2 comms surface.** *(Done — see the completed-detail entry above. The
notes below are the pre-work scoping read; the two access holes they did not
predict — the by-id gate narrower than the list, and mention fan-out ignoring
visibility — were found by probing the running API and are recorded there.)*
The API exists (`comms.controller.ts`, channels +
`channel_members`, internal-visibility boundary already e2e-tested as
"internal channel never visible to client"). This slice is mostly web routes;
the risk is re-implementing the visibility filter client-side instead of relying
on the server, which would be a security bug, not a UI bug. Concretely:

- Routes present: `POST/GET /channels`, `POST/GET /channels/:id/messages`
  (the GET takes `parentMessageId` for thread replies), and
  `POST /channels/:id/convert-external`, plus
  `POST/GET /meetings` and `POST /meetings/:id/join`.
- Capabilities already defined: `channels.read`, `channels.write`,
  `meetings.write` (shared `Capability` enum). Nav has no comms entry yet, so
  the work is a new route plus a `Connect`-section nav item gated on
  `channels.read`.
- Threads and mentions are server-side already: `postMessage` takes
  `parentMessageId` and `mentions`, rejects a reply whose parent is in another
  channel, and fans each mention out to a `notifications` row. The UI should
  surface `mentions` as-is rather than resolving them itself.
- The one thing the UI must **not** do is filter internal vs external on the
  client. `requireChannel` refuses a client (`isClient`) any channel that is not
  `external`, and `listChannels` filters by visibility in SQL. The web layer
  should render whatever the API returns and let a 403 stand.
- `convertToExternal` is the only path that ever changes a channel's visibility
  and it is audited ("explicit, audited internal→external conversion") — do not
  add a second, quieter path just to make a UI control convenient.

Gaps the code does **not** close, found by reading it rather than the plan.
Each is small, but a UI built without deciding them will either ship a lie or a
bug:

- **`channel_member` is written and never read.** `join()` inserts rows on
  create and `createChannel` accepts `memberIds`, but no query anywhere reads
  the table — `listChannels` selects every non-archived channel in the org
  (further filtered only by engagement and visibility), and `requireChannel`
  checks org + visibility + engagement, never membership. So a channel is
  effectively org-wide today, and the N2.3 UI must not draw a member list or a
  "private to members" affordance that the server does not enforce. Either
  wire membership into `listChannels`/`requireChannel` (its own slice with
  tests, since it changes existing access) or render the channel as org-wide
  and say so. Silently implying privacy that does not exist is the worst of the
  three options.
- **~~There is no `meetings.read` capability~~ — closed in N2.4 (PR #28).**
  `Capability.MeetingsRead` now exists, `GET /meetings` is gated on it (so a
  read-only role can be given the schedule without booking rights), and the
  visibility filter is fixed: engagement-less (internal) meetings no longer
  reach a client through `listMeetings` or `joinMeeting`, and `scheduleMeeting`
  refuses to create one the creator could not read back. The guest path was
  already fine (`listMeetings` special-cases `ctx.itemScope` to meetings the
  person participates in), so this was never a guest leak. N2.3 can now lean on
  `GET /meetings` as the read it claims to be. The residual is unchanged: the
  UI must still render whatever the API returns rather than re-filtering
  client-side.
  <details><summary>Original finding (kept for the record)</summary>

  - The capability was misnamed for the operation: a read gated on a write cap,
    so any future read-only role could not be granted meeting visibility
    without also granting it the ability to schedule and join.
  - `listMeetings` did not consult visibility or client status at all. Unlike
    `listChannels`, which pins a client to `visibility = 'external'`, the
    meeting query filtered only by org and (optionally) engagement, so an
    external `client_approver` was returned an `engagement_id IS NULL` meeting —
    e.g. an internal staffing sync — verbatim. Reproduced on the dev DB:
    `am` created "Internal staffing sync" (no engagement) and
    `client-a@nimbus.example`, same org, listed it.
  - `joinMeeting` looked up the meeting by org only, so the same client could
    join it too. Attendance was recorded honestly (§11.4) but the boundary was
    absent.

  </details>
- **~~Every channel in the dev DB is `external`,~~ including one named
  "Internal production".** *Closed in N2.3:* the cause was an e2e artefact —
  the suite creates "Internal production" with `visibility: 'internal'` and then
  the "conversion is audited" test converts it to external, and the e2e suite
  truncates every domain table besides. The seed now writes both visibilities
  (`Nimbus production` and `Studio leadership` internal, `Nimbus client
  updates` external), so §11.2 is demonstrable on a freshly seeded DB — which
  is also the only order that works: `npm test` first, then `npm run seed`,
  then browse. The N2.3 browser evidence asserted the internal-channel refusal
  against a seeded `visibility='internal'` row, not against whatever the DB held.
- Nav is `NAV_SECTIONS` in `apps/web/app/components/nav.ts`; the comms entry
  went in the `connect` section gated on `channels.read`. (The `ThirdPartyVendor`
  half of this note was wrong: that role holds no `channels.read` at all — see
  the N2.3 disclosure.) The web API client is
  `apps/web/lib/api.ts` (`api<T>(path, email, init)` returns `{ error }` rather
  than throwing, so every new call must branch on that shape).

**N3.1 — storage backend.** The file service exists (`files.service.ts`) with an
S3-shaped seam; what is missing is the real backend behind it and raster
thumbnails. Blocked on the human storage decision already flagged in N1; do not
pick a provider to unblock it.

**N3.2 — A-13 webhook hardening.** Outbound webhooks are **already** HMAC-signed
(`integrations.service.ts` sets `x-palette-signature` with sha256 over the
body) and delivered through the P6-11 job queue with retries. So the remaining
work is narrower than the row's wording suggests: inbound signature
*verification* where applicable, plus rate limits (only the auth resend throttle
exists today — `RESEND_THROTTLE_MS`) and retention *enforcement* (the
`/legal/retention` + `/legal/purge` endpoints exist and are audited, but nothing
schedules them — there is no `@Cron` anywhere, and `jobs.service.ts` runs a
polling `setInterval`, so a purge job would be enqueued onto that queue rather
than adding a scheduler dependency).

**N3.3 — public API versioning + importer apply.** API keys exist
(`identity/api-keys.controller.ts`) but routes are unversioned. The import
dry-run tooling is `scripts/import-dry-run.sh`; "apply" needs the write path
behind the same validation the dry run already enforces, so the dry run's checks
should move into shared code rather than being duplicated.

**N3.4 — observability + DR drills.** The backup/restore and load drills exist
as scripts (`scripts/backup.sh`, `restore-drill.sh`, `load-test.js`) but their
last recorded runs were at 55 e2e checks; they must be re-run against the current
schema before their evidence is quoted again. Health endpoints are per-module
(`/email/status`, `/integrations/health`) rather than one aggregate probe.

### Explicitly deferred, and why

- **A-09 billing (Stripe)** and **A-08 plan catalogue** — both sit behind the
  human pricing/plan decisions flagged in `docs/gap-analysis-platform-surface.md`
  §0.3. No agent progress is possible until those are made.
- **A-15 mobile/PWA and L10N** — depends on A-07, which depends on A-04.
- **Real identity-provider exchange** (Keycloak brokering, §8.4) — the seam and
  the dev stub exist (P6-06, P7-02). Replacing the stub is an infrastructure
  decision, not a coding one.
- **LLM provider host** (§12.3) — the seam is built and no-ops without a key;
  the page correctly reports `Not configured`.

### Phase gates still unmet (from `docs/roadmap.md`)

| Gate | Target | Actual | Status |
| --- | --- | --- | --- |
| LoC | ≥ 80k (Phase 6 exit) | 25,052 code (27,104 with `docs/`, `scripts/loc.sh`, 228 files) | not met — Phase 6 exit was written for the PDF's full build-out, not the V2 net-new. Do not pad code to close a volume gate. (An earlier row cited ~37.6k from a looser ts/tsx/sql/sh/js count; `loc.sh` is the gate's own measure and is used here. `loc.sh` counts `docs/`, so the headline figure drifts with ledger edits; the code-only subtotal is the meaningful one) |
| e2e | ≥ 320 checks | 414 (N2.4) | met |
| Permission tests | pass | pass | met |
| Drift | 0 findings | 0 | met |


> **Correction.** An earlier note in this file listed 15 pre-V2 backlog items as
> still open, including "Integrations + automation hub — none built". That was
> wrong: P6-04/P6-08/P7-04/P7-06/P8-11 shipped them across PRs #12/#14/#18 and
> the ledger rows above say so. The stale list is annotated inline above rather
> than deleted, so the correction itself is visible.
