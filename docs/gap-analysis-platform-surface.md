# Platform-surface gap analysis — features needed to make Palette Canvas a real product

Companion to `gap-analysis.md` (PDF surface). That document tracks the 27-page planning document's
module table. This document tracks a **different, larger surface**: everything a working, self-serve,
commercial product needs but that the planning document does **not** list — the "product surface" (account
creation, account/workspace management, settings, security, commerce, onboarding, support…) that
rivals like **Asana** and **Monday.com** treat as table stakes.

**Scope rule:** a row belongs here if (a) it is required for the application to be usable bya martian
customer end-to-end, and (b) it is not already tracked as a `✘`/`◑` in `gap-analysis.md` or as a roadmap step
(P1–P8, B.1–B.6). Where the two overlaps (e.g. permissions already partly tracked) we reference the existing
tracker and mark only the residual delta.



## Status legend

- **✘ not started** — no implementation exists at all
- **◑ partial** — exists but not product-grade (dev scaffold, stub, or single-purpose)
- **N/A / human choice** — depends on infrastructure/product/business decisions outside code
- **PRIORITY** — blocker for pilot-launch usability or for scaling to multiple customers

## 0. Platform-service prerequisites

Every row later in this document depends on a thin service foundation that existing today
(**✘**): the API has no email transport, no password hashing, no session/token
management, no CSP/CSRF, no scheduler/lib for recurring jobs, and no validation harness.

| # | Service | Status | Today | Needed for | Notes |
| --- | --- | --- | --- | --- | --- |
| 0.1 | AuthN core (password hashing + session/token) | ✘ | header auth `x-user-email`, cookie `pc_user_email` (plaintext email swither) | every §1–§9 credential flow | `argon2id`+ secure httpOnly cookie; fallback signed-state JWT for APIs |
| 0.2 | Email transport | ✘ | none | invites, verification, magic links, password reset, notifications, billing | provider abstraction (SMTP/Resend/SES); dev fallback logs to console |
| 0.3 | Token/one-time-code primitives | ◑ | TOTP MFA (P7-01) | invites, email verification, magic links, password reset, API-key scopes | expire, single-use, hashed-at-rest; audit every issue/consume |
| 0.4 | Web security/CSRF + CSP | ✘ | security headers (P5-04)) | session cookies, form posts, iframe-free admin | cookie-binding CSRF tokens; strict CSP on all pages |
| 0.5 | Scheduler + job/queue harness | ◑ | PG SKIP-LOCKED queue (P6-11) | recurring jobs, SLA escalations, digest emails, trial expiry | extend queue with due-at + worker loop; no Redis dependency |
| 0.6 | ORM/validation layer | ◑ | raw `pg`; JSONB custom fields | form inputs, admin settings, invite/payment payloads | validation lib + typed repositories for new tables |
| 0.7 | Audit SDK (write-once, context-enriched) | ◑ | `audit_event` + `/audit` endpoint | compliance rows (§7), billing, invites, admin | centralize actor/scope/agent_tag; index by person+target+date |

Exit for §0: `npm run build` clean; e2e covers authN core (wrong password 401, logout, session expiry),
email-outbox (send captures row), token single-use (second use 410/401), CSRF (no token 403>.

## 1. Account model, sign-up,, self-service lifecycle

Nothing here exists today: users are hand-seeded rows; there is no concept of "my account", registration,
email verification, recovery, deactivation/export/delete. This is the single largest unplanned surface.

| # | Feature | Status | Scope | Acceptance (e2e or test) |
| --- | --- | --- | --- | --- |
| 1.1 | Workspace/account model (upgrade `organisation` schema) | ✘ | `organisation`: id, slug, display_name, owner_person_id, plan_tier, trial_ends_at, status (active/suspended), default_timezone, default_locale; org-wide settings JSONB | create org → defaults seeded (roles, starter template pack), owner binding; slug uniqueness |
| 1.2 | Sign-up / org bootstrap (first-run onboarding) | ✘ | POST /auth/signup captures name/email/password → creates org + owner (agency_admin); verification email; trial start | sign-up 201→ org+owner rows, owner role_binding; duplicate email 409; bad email 422 |
| 1.3 | Email verification | ✘ | 6-digit code or signed link; person.verified_at; resend throttle | unverified cannot log in (403`, verified flips person; wrong code 401; resend limit |
| 1.4 | Login / logout (session) | ✘ | email+password → httpOnly session; remember-me (30d vs 8h); logout revokes | wrong password 401 uniform; concurrent sessions revoked on password change; logout invalidates |
| 1.5 | Password reset (self-service) | ✘ | request → email token (15m); reset form; reuse detection | reset works; token 1-use; expired token 410 |
| 1.6 | Password change + session revocation | ✘ | require current password; revoke other sessions; audit | wrong current 400; old session 401 |
| 1.7 | Account deactivation | ✘ | soft-delete, disables login, admin/owner can restore | deactivated cannot log in; restore re-enables |
| 1.8 | Account deletion / data export | ✘ | GDPR-style export (person/org data JSON), permanent delete requires signed confirm | export zip includes own rows; delete purges org+person+auth rows (audit kept)) |
| 1.9 | Login devices/sessions manager | ✘ | list sessions (device/IP/age), revoke any | revoke kills session server-side |
| 1.10 | Avatar/profile (name, title, timezone, locale) | ✘ | person.profile fields + upload avatar (asset) | PATCH profile; avatar round-trip |

Exit §1: fresh signup→verify→login→reset→deactivate→export→delete all green in e2e; no
plaintext passwords at rest; all auth events audited.

## 2. Workspace, member, admin management

| # | Feature | Status | Scope | Acceptance |
| --- | --- | --- | --- | --- |
| 2.1 | Member invites (self-serve) | ◑ | `invite` table exists (P8-01 rows): email, role, scopes, expires_at, single-use | invite round-trip; resend; revoke; accept redeems+creates person+role_binding |
| 2.2 | Member directory (list, role, status, last-active) | ✘ | paginated, filterable, sortable; active/invited/suspended badges | directory renders; count matches DB |
| 2.3 | Role assignment (owner/admin approves) | ◑ | role_binding CRUD exists; needs admin UI + SoD guardrails | admin reassign; self-demote blocked (400) |
| 2.4 | Member deactivation/removal | ✘ | suspend (blocks login), remove (), transfer of work ownership or close-out | suspended 401; removed loses access; work reassigned |
| 2.5 | Owner transfer + emergency access | ✘ | transfer ownership (2-step confirm); org-level recovery (SSO + backup owner) | transfer flips owner; both fail-closed |
| 2.6 | Admin console (org settings, audit explorer, retention, billing) | ✘ | `/admin` scope-gated; landing for §6–§9 | console 403 for non-admin; each section works |
| 2.7 | Audit explorer UI (self-serve) | ◑ | endpoint exists (B-01 API); no UI yet | search/filter/export audit; staff see own-org rows only |

## 3. Security, privacy, governance (account-scale)

| # | Feature | Status | Scope | Acceptance |
| --- | --- | --- | --- | --- |
| 3.1 | Multi-factor (TOTP) enforced per-org policy | ◑ | TOTP exists (P7-01); needs policy flags (required/optional), recovery codes, backup re-auth | policy enforced at login; recovery code single-use |
| 3.2 | Password policy + breach check | ✘ | min length/entropy, block common/leaked passwords, rotation suggestion | weak rejected 422; breached rejected |
| 3.3 | Session hardening | ✘ | httpOnly+SameSite+Secure; absolute+idle timeout; IP geofence optional | flags honored in e2e |
| 3.4 | SSO/SAML+SCIM admin | ◑ | OIDC config + SCIM (P6-06), dev-stub | provider wizard, just-in-time provisioning, SCIM groups → role scopes |
| 3.5 | Granular personal data controls (GDPR/CCPA type) | ✘ | export (§1.8), delete request, consent audit, data-retention policy enforcement | consent rows recorded; retention enforcement tested |
| 3.6 | IP allowlist / geo policy | ✘ | org-level network policy, enforced at auth | blocked region 403 |
| 3.7 | Deprovisioning (offboarding runbook) | ✘ | revoke sessions, archive work, reassign, handover, retention start | runbook executes via admin button |

## 4. Settings, preferences, customization

| # | Feature | Status | Scope | Acceptance |
| --- | --- | --- | --- | --- |
| 4.1 | Org settings (name, slug, branding, timezone, locale, defaults) | ✘ | only `settings/sso` exists | PATCH persisted; branding affects emails/login |
| 4.2 | Personal preferences (theme, density, default view, notifications digest) | ✘ | none | persisted per person; default view applied |
| 4.3 | Notification preferences (per-channel, per-type) | ✘ | notifications exist (inbox)); need email/SSE/digest toggles | per-type toggle honored in dispatch |
| 4.4 | Email branding (logo,, colors, footer) | ✘ | none | template render uses branding; DMARC-ready |
| 4.5 | Workspace customization (project/status/task-field dictionaries) | ✘ | templates/custom fields per template only | org-level dictionaries flow into boards |

## 5. Plans, billing, licensing (commercial self-serve)

Unplanned entirely: no subscription concept in schema. Needed before multi-tenant public launch.

| # | Feature | Status | Scope | Acceptance |
| --- | --- | --- | --- | --- |
| 5.1 | Plan/catalogue model | ✘ | plan_rows (stripe_id, name, price, seats_min/max, limits JSONB: projects, agents, storage, integrations) | catalogue API; limits enforced |
| 5.2 | Trial + plan assignment | ✘ | signup defaults trial; admin upgrades/downgrades | trial days counted; upgrade flips org.plan_tier |
| 5.3 | Billing gateway integration (Stripe) | ✘ | checkout, subscription, webhooks (invoice.paid, subscription.updated/deleted) | test-mode checkout completes; webhook updates plan |
| 5.4 | Invoicing + payment history | ✘ | invoice table mirror, -> export (§8.6) | history renders; export consistent |
| 5.5 | Seat management + overage | ✘ | count active seats vs plan; block invite when at cap; prorate on change | invite at-cap 402/422; downgrade warns |
| 5.6 | Dunning / failed-payment handling | ✘ | retry, grace period, suspend on persistent fail; emails | suspend blocks login; grace honoured |
| 5.7 | Plans/usage UI (billing portal, usage meters) | ✘ | `/settings/billing`: plan, seats, storage/integrations usage, upgrade path | portal renders real usage; change flow works |

Exit §5: stripe test-mode end-to-end (checkout→webhook→plan flip), seat cap enforced,
dunning suspension tested  

## 6. Notification, email, activity surface

| # | Feature | Status | Scope | Acceptance |
| --- | --- | --- | --- | --- |
| 6.1 | Outbound email service | ✘ | §0.2 transport + templates; per-event opts (§4.3) | emails render+sent via outbox; digest mode |
| 6.2 | Email digests (daily/weekly) | ✘ | scheduled job aggregates unread/mentions/assignments | digest generated on schedule; respects opts |
| 6.3 | In-app activity feed (personal dashboard) | ✘ | per-user recent activity (added to existing SSE notifications) | feed matches audit/notifications events |
| 6.4 | Email+SMS+Slack/Teams channel adapters | ✘ | pluggable channel per notification type | adapter mocked as stub in e2e |
| 6.5 | Unsubscribe + spam-compliant footer | ✘ | one-click; suppression outbox | unsubscribe suppressed thereafter |

## 7. Onboarding, adoption, templates

| # | Feature | Status | Scope | Acceptance |
| --- | --- | --- | --- | --- |
| 7.1 | First-run onboarding wizard | ✘ | org name/branding, invite team, import-or-create project, tour tips | wizard completes → usable workspace |
| 7.2 | Template marketplace / gallery | ✘ | curated templates per industry/case type; clone-to-project | gallery renders; clone round-trip |
| 7.3 | Sample/demo workspace | ✘ | one-click demo data (seed), one-click clear | demo spins matching seed; clear empties |
| 7.4 | In-product help + keyboard shortcuts | ✘ | shortcut cheat-sheet, contextual help panels | shortcuts trigger actions |
| 7.5 | Localization/I18N base | ✘ | locale strings catalog + timezone-aware dates | locale switch persists; dates shift |

## 8. Platform, data, API surface (product-grade)

| # | Feature | Status | Scope | Acceptance |
| --- | --- | --- | --- | --- |
| 8.1 | Public REST API + versioning + docs | ◑ | internal endpoints exist; no versioning/docs/auth tokens scoping | documented versioned API; token-scoped (§P7-04 extension) |
| 8.2 | Importers (Asana/Monday/CSV/Basecamp) | ✘ | none | fixture import → projects/tasks match |
| 8.3 | Exporters (CSV, Excel, JSON, audit, report) | ✘ | export_log exists (P8-11) | export files match row counts; permissioned |
| 8.4 | Webhooks outbound (event-driven) | ◑ | P6-04 exists; needs retry backoff (P6-11 queue), signing, dashboard | signed payload; retry verified; delivery logs visible |
| 8.5 | API rate limiting + abuse protection | ✘ | none | burst 429; per-key limits |
| 8.6 | Data retention/lifecycle policies enforcement | ◑ | retention P6-14 config exists | org policies enforced on purge job |
| 8.7 | Backup + restore as a service | ◑ | scripts exist (P5-01)); needs scheduled + restorable SLA | scheduled backup artifact; restore drill passes |
| 8.8 | Status/health page | ✘ | integration health exists (P7-06) | public health page reflects components |
| 8.9 | Audit + compliance exports (SOC2-friendly) | ✘ | audit rows exist; no packaged export | export zip complete + immutable |

## 9. Collaboration parity — Asana / Monday benchmarks

| Benchmark | Asana | Monday | Palette today | Gap (must close pre-GA) |
| --- | --- | --- | --- | --- |
| Boards: multi-view (board/list/calendar/timeline/Gantt) | ✔ | ✔ | board/list/calendar exist; **no timeline/Gantt** | timeline/Gantt view |
| Drag-and-drop + swimlanes | ✔ | ✔ | ✘ | DnD board, swimlane grouping by assignee/status |
| Task depth: custom fields, subtasks, dependencies, recurrence | ✔ | ✔ | custom JSONB, no subtasks, deps exist (400 gate), no recurrence (P8-03) | subtasks, recurrence, validated custom fields |
| Search: global, instant, filtered | ✔ | ✔ | ✘ global search | elastic/DB search across projects/tasks/comments |
| Mentions, reactions, attachments, threads | ✔ | ✔ | reactions (P8-05), comment assets (P8-06), threads exist; mentions partial | full mentions autocomplete, emoji picker, attachment preview |
| Automation: rules/triggers/actions | ✔ | ✔ | P6-08 rules engine exists; no visual builder or public recipes | recipe gallery, trigger debugger |
| Time tracking + estimates | ✔ | ✔ | time_log exists (6.13); no estimates UI mass entry | stopwatch, per-task estimates, timesheet approval |
| Dashboard widgets + saved views | ✔ | ✔ | reports (P6-02/03), saved views (P8-04) | per-user dashboard, widget library, shareable views |
| Guest/limited access | ✔ | ✔ | project_role; no expiry | expiring guests, guest workspace shell |
| Notifications: multi-channel, digest, priority | ✔ | ✔ | inbox exists; no channels | §6 surface |
| Bulk actions + keyboard | ✔ | ✔ | ✘ | bulk select/edit/move/delete, kbd |
| Templates + blueprints | ✔ | ✔ | templates exist | marketplace (§7.2) |
| Mobile/responsive PWA | ✔ | ✔ | web is desktop-first | responsive shell + PWA offline |
| Audit + admin console | ✔ | ✔ | partial | §2.6 console |
| Import from competitors | ✔ | ✔ | ✘ | §8.2 importers |
| Public API + webhooks | ✔ | ✔ | partial | §8.1/8.4 |
| Goals/OKRs, workload balancing | ✔ | ✔ | workload partial (P6-01) | goals, capacity-aware assignment |

**Palette differentiators to protect** (do not regress): agency-to-client trust fabric (brief→project→proof→handover), capability-based
permissions, deep audit/agent-attribution, legal holds + retention, e-sign integration point.

## 10. Mobile, API consumer, whitelabel (scale)

| # | Feature | Status | Scope | Acceptance |
| --- | --- | --- | --- | --- |
| 10.1 | Responsive app shell | ✘ | breakpoint-based layouts for all core views | tablet/mobile renders critical flows |
| 10.2 | PWA offline shell | ✘ | service worker, offline board cache, sync queue | offline create syncs on reconnect |
| 10.3 | Mobile notifications (APNs/FCM) | ✘ | push transport bridging to §0.2 channels | device token round-trip |
| 10.4 | Whitelabel/agency-branded workspaces | ✘ | org theming tokens, custom domain, logo in emails | brand theme applies to UI + emails |
| 10.5 | Embeddable widgets (client status portal) | ✘ | signed iframe widget (client sees delivery status only) | widget loads signed;, scoped read-only |
| 10.6 | Internationalization complete (L10N) | ✘ | full locale coverage + RTL | switch renders RTL-safe |

## 11. Ops, compliance, scale readiness

| # | Feature | Status | Scope | Acceptance |
| --- | --- | --- | --- | --- |
| 11.1 | Production email deliverability (SPF/DKIM/DMARC, bounce handling) | ✘ | domain auth, bounce webhook→suppression | deliverability checklist passes |
| 11.2 | Secret/credentials vaulting + key rotation | ◑ | env-based config only | vault provider, rotation runbook, agent never holds prod creds (per AGENTS.md) |
| 11.3 | SOC-2-ish audit trails + access reviews | ◑ | audit_event + B-02 permission review | quarterly access review workflow, immutable export |
| 11.4 | SLAs, uptime, observability (metrics, logs, traces) | ◑ | integration health, load test (P5-02) | SLO dashboard, structured logs, error budgets |
| 11.5 | Data residency / regional isolation | N/A | single region | human/infra decision (PDF §15) |
| 11.6 | Disaster recovery runbook + drill schedule | ◑ | restore drill exists (P5-01) | scheduled drills, RTO/RPO targets documented |

## Sequencing into the existing roadmap

The PDF roadmap (P1–P8) + backlog (B.*) remains the **feature spine**. This surface rides **on top**:

- **Before pilot-launch usability (must):** §0 (foundation), §1.1–1.6 (account model→login→reset), §2.1–2.3
  (invite+directory+roles — extends P8-01), §3.1/3.3 (MFA policy, sessions), §4.1
- **Parallel with P8 (recommended interleave):** §1.7–1.10, §2.4–2.7, §3.2/3.4/3.7,
  §6, §7 — each is a small slice like P8 items; ship as its own PR with e2e
- **Pre-public GA (must before marketing/sell):** §5 (billing), §3.5/3.6, §8 (API
  import/export), §9 parity items, §10, §11.
- **Never complete (track like backlog B.*):** §3.5, §6.5, §10.6, §11.3 —
  ongoing compliance + localization chips.

### Suggested roadmap annex (new IDs, ledger-tracked)
| ID | Section | Title | Dependency |
| --- | --- | --- | --- |
| A-01 | §0.1+§1.1–1.2 | AuthN core + sign-up/org bootstrap | — |
| A-02 | §1.3–1.4 | Email verification + login/session | A-01, §0.2 |
| A-03 | §1.5–1.6 | Password reset/change + revocation | A-02 |
| A-04 | §2.1–2.3 | Invite/member/roles admin (supercedes P8-01 UI) | A-02 |
| A-05 | §3.1/3.3 | MFA policy enforcement + session hardening | A-02 |
| A-06 | §1.7–1.10 | Deactivation, export/delete, sessions manager, profile | A-03 |
| A-07 | §4 | Org/personal settings + email branding | A-04 |
| A-08 | §5.1–5.2 | Plan catalogue + trial assignment | A-01 |
| A-09 | §5.3–5.7 | Billing gateway, seats, dunning, billing UI | A-08, §0.3 |
| A-10 | §6 | Notification channels, digests, unsubscribe | A-07, §0.2 |
| A-11 | §7 | Onboarding wizard, template marketplace, demo, help | A-04 |
| A-12 | §8.1–8.3 | Public API versioning, importers, exporters | P7-04 (keys), P8-11 |
| A-13 | §8.4–8.9 | Webhook hardening, rate limits, retention enforcement, health/status | §0.5, P6-11 |
| A-14 | §9 | Collaboration parity blocks (timeline/DnD/subtasks/global search) | P8-03..P8-06 |
| A-15 | §10 | Mobile/PWA, whitelabel, widgets, L10N | A-07, §9 |
| A-16 | §11 | Deliverability, vaulting, SOC2-ish, observability, DR drills | continuous |

## Global exit gates (applies to every section)
- **Tests are the gate:** each row lands withits e2e/permission checks in the same PR — no follow-up (per roadmap rules).
- **No regressions:** `npm run build` + `npm run test` stay green at each step; e2e count only grows.
.
- **Permission discipline:** everything self-serve is per-org scoped; admin/owner gated; safe from other orgs (403` tested).
- **Human decisions flagged:** infrastructure (email provider, Stripe mode, vault, SMPT relay, region), plan catalogue, pricing) are owned by humans; agents implement against a provider abstraction and a test-mode fixture.
.
.
- **Legend maintenance:** this doc + `gap-analysis.md` ages together; each landed row flips to ✔ and moves to the ledger.