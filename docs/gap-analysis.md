# Gap analysis — Palette Canvas Workspace (current state vs PDF V1)

Snapshot date: 2026-09-14. Scope reference: 27-page planning document, module
table in section 2. All capability statements in the PDF's roadmap table are
treated as the target surface; this document marks what has been built and
what is outstanding. Last refreshed after A-01 (PR #20) merged.

Current code footprint: **15,734 maintained LoC / 181 files**
(`bash scripts/loc.sh`). PDF V1 estimate: **225,000–285,000 LoC**
(includes tests + infrastructure + docs; excludes lockfiles/vendored deps).
Current coverage is ~5% of the planned V1 surface.

## Status legend

- ✔ built (MVP surface + e2e coverage where specified)
- ◑ partial — core flow present; advanced capabilities missing
- ✘ not started
- N/A — infrastructure choice deferred / owner is a human, not the agent

## 1. Identity, organisations, access (MVP priority)

| Capability | Status | What exists today | Gap |
| --- | --- | --- | --- |
| Email invitation | ✔ | P8-01 `/invitations` (invite/accept/revoke, token-based) | self-service UI; recovery/expiry policy on the token |
| SSO-ready authentication | ◑ | OIDC metadata + SCIM provisioning (`/identity/sso`), header dev auth, **real password authN (A-01): argon2id + httpOnly sessions + signup/login/logout at `/auth`** | enforcement across API routes, SSO/OIDC real dance (annex **A-02…A-06**) |
| MFA support | ◑ | TOTP enrollment + verify (`/identity/mfa`) | policy enforcement + recovery codes (annex **A-05**) |
| Organisation hierarchy | ◑ | single org per user, tenancy scoped | parent/child orgs, agency-to-client links |
| Roles | ✔ | role_binding + capability map | fine-grained attributes per PDF §1 |
| Project sharing | ◑ | project_role assignment | guest access expiry, per-resource scopes |
| Expiring guest access | ◑ | P8-02 confidentiality tiers restrict external roles | time-bound access for third-party vendor |
| Audit trail | ✔ | P7-06 audit explorer UI + audit_event + `/audit` controller | exportable audit explorer/retention |

## 1a. Platform foundation annex (from PR #17 surface analysis)

Forward work is tracked in `docs/gap-analysis-platform-surface.md` (annex
**A-01…A-16**): real account/session authN, email transport, billing, admin
console, collaboration parity, and mobile — see `docs/roadmap.md` Phase 9.

## 2. Agency & client relationship management (MVP)

| Capability | Status | Gap |
| --- | --- | --- |
| Agency profile | ✔ | — |
| Brands | ✔ | — |
| Key contacts | ✔ | — |
| Working agreements | ◑ | org-level profile fields (working agreements surface) | dedicated agreement object + renewal workflow |
| Service templates | ✔ | P8-15 task-field schema per workstream | template marketplace UI (annex A-11) |
| Confidentiality tier | ✔ | P8-02 version.confidentiality filters external roles | org-level data-class model |
| Account health | ✔ | B-06 `/reports/account-health` (projects, completion, at-risk) | — |

## 3. Intake & structured brief (MVP)

| Capability | Status | Gap |
| --- | --- | --- |
| Configurable brief forms | ✔ | — |
| Mandatory fields by service type | ✔ | — |
| Attachments | ✔ | P6-10 signed-URL object storage + P6-12 media pipeline | gallery/asset selection UI |
| Duplicate detection | ✔ | — |
| Intake inbox | ✔ | — |
| Triage SLA | ◑ | captured but not timed |
| Conversion to project | ✔ | — |

## 4. Project & delivery management (MVP)

| Capability | Status | Gap |
| --- | --- | --- |
| Project charter | ✔ | — |
| Milestones | ✔ | — |
| Templates | ✔ | — |
| Task lists | ✔ | — |
| Dependencies | ✔ | close-blocking 400 gate |
| Recurring work | ✔ | P8-03 `/recurrence` (series + next_run_at + active) | recurrence UI + DnD (annex A-14) |
| Custom fields | ◑ | stored as JSONB; no validation or views | field validation + board columns (annex A-14) |
| Status model | ✔ | — |
| Saved views | ✔ | P8-04 `/views` (CRUD) | board UI integration (annex A-14) |
| Swimlanes, drag-and-drop board | ✘ | — | annex A-14 |
| Priority, filters, per-user/team workload | ◑ | priority exists + P6-08 automation rules | workload dashboard UI |
| Due-date risk markers | ◑ | B-06 at-risk tasks + scheduling reports | board-level visual markers (annex A-14) |
| Calendar | ✔ | — |

## 5. Creative asset & proofing (MVP)

| Capability | Status | Gap |
| --- | --- | --- |
| File versioning | ✔ | — |
| Source/final distinction | ✔ | — |
| Thumbnails | ✔ | P6-12 media pipeline (`media.thumbnail` renditions) | render on upload for all mime types |
| Proof links | ✔ | P6-10 signed URLs with tamper-reject | expiring/channel-specific links |
| Annotated feedback | ✔ | P6-05 annotation coordinates on canvas, threaded | collaboration cursor/mention in annotations |
| Side-by-side version comparison | ✔ | P6-05 `/proofing/compare` (QA + annotations) | pixel-diff overlay |
| Approval history | ✔ | — |

## 6. Work-linked communications (MVP)

| Capability | Status | Gap |
| --- | --- | --- |
| Project/task/deliverable threads | ✔ | — |
| Mentions | ✔ | — |
| Internal/external visibility | ✔ | P8-14 `visibility` tags filter external roles |
| Message-to-task conversion | ✔ | P8-07 `POST /comments/:id/convert` |
| Decision records | ✔ | — |
| Notification centre | ✔ | — |
| Reactions | ✔ | P8-05 `/comments/:id/reactions` |
| Attachments in comments | ✔ | P8-06 `/comments/:id/attachments` |
| Live updates (WebSocket/SSE) | ✔ | P6-09 `/events/stream` SSE + heartbeat | webhook delivery via queue |

## 7. Reviews, approvals, change control (MVP)

| Capability | Status | Gap |
| --- | --- | --- |
| Sequential/parallel approval steps | ✔ | P8-08 `/approval-steps` (ordered steps + progress) | step-level due dates |
| Review due dates | ✔ | — |
| Approve/reject/request changes | ✔ | — |
| E-sign integration point | ◑ | P7-05 signature placeholder stub + reminders | real e-sign provider integration |
| Scope-change record | ✔ | change requests linked to approvals |

## 8. Quality assurance (MVP)

| Capability | Status | Gap |
| --- | --- | --- |
| Template-specific checklists | ✔ | — |
| Automated technical checks | ✔ | P8-09 `/quality/checks` (run + record) | check library expansion |
| Reviewer assignment | ✔ | P8-10 `/quality/reviewers` | review workload visibility |
| Non-conformance record | ◑ | P8-13 risk register + mitigation | full NCR object |
| Release gate | ✔ | QA must pass before client review (409) |

## 9. Capacity, time, service performance (V1)

| Capability | Status | Gap |
| --- | --- | --- |
| Skills | ✔ | `/capacity` (skills on people + matching) | skills marketplace (annex A-14) |
| Availability | ◑ | capacity headroom from utilisation | leave/absence calendar |
| Workload | ◑ | capacity + per-user workload | thresholds + skills matching |
| Time/effort | ✔ | — |
| Utilisation | ✔ | `/reports/utilisation` |
| SLA clocks | ◑ | SLA report + triage SLA | live SLA clocks in UI |
| Delivery risk | ◑ | deep-dive + account health | board-level risk markers |
| Team queue | ◑ | `/capacity` org view | per-person queue UI |

## 10. Commercial controls (V1)

| Capability | Status | Gap |
| --- | --- | --- |
| Rate-card references | ✔ | `/commercial/rate-cards` |
| Estimate versions | ✔ | `/commercial/.../estimates` |
| Budget vs effort | ✔ | `/commercial/.../budget` |
| Purchase order fields | ◑ | PO fields on projects | PO-centric invoicing |
| Change-order values | ✔ | impact_hours/impact_cost |
| Invoice-ready milestones | ✔ | `/commercial/invoice-ready` |

## 11. Reporting & management control tower (MVP exec, V1 drill-down)

| Capability | Status | Gap |
| --- | --- | --- |
| Portfolio health | ✔ | `/reports/portfolio` |
| On-time rate | ✔ | portfolio/sla reports |
| WIP | ◑ | portfolio + capacity | explicit WIP control |
| Ageing | ◑ | deep-dive | ageing buckets UI |
| Rework | ◑ | deep-dive | rework-loop tracking |
| Approval cycle time | ◑ | deep-dive | per-step SLA |
| SLA attainment | ✔ | `/reports/sla` |
| Capacity | ✔ | `/capacity` |
| Account scorecard | ✔ | `/reports/account-health` + B-06 |

## 12. Automation & integration hub (MVP foundations)

| Capability | Status | Gap |
| --- | --- | --- |
| Rules | ✔ | P6-08 `/automations` (conditions + notify/webhook actions) |
| Webhooks | ✔ | P6-04 `/integrations` + queue-delivered `webhook.deliver` |
| Scheduled reminders | ✔ | P7-03 `/notifications/reminders` (queue-scheduled) |
| Email/Slack/Teams notifications | ◑ | in-app/notification centre + reminders | channel delivery (annex A-10) |
| API keys | ✔ | P7-04 `/identity/api-keys` (hashed + scoped) | usage quotas |
| Import/export | ◑ | export log (P8-11); import dry-run (P5-07) | public importers/exporters (annex A-12) |
| Integration health | ✔ | P7-06 `/integrations/health` (deliveries + status) |

## 13. Knowledge & template library (MVP)

| Capability | Status | Gap |
| --- | --- | --- |
| Brand guidelines | ◑ | P6-10 asset library | guidelines object + approval (annex A-14) |
| Brief templates | ✔ | — |
| QA standards | ◑ | B-05 knowledge library (QA packs landing) | standard library + approvals |
| Reusable checklists | ◑ | P8-09 technical checks + P8-15 template task schemas | copyable checklists |
| Handover packs | ✔ | — |
| Decision archive | ✔ | decision records library |

## 14. Administration, security, governance (MVP foundations)

| Capability | Status | Gap |
| --- | --- | --- |
| Retention | ✔ | P6-14 legal holds + retention policy |
| Audit explorer | ✔ | B-01 audit explorer UI |
| Permission reviews | ✔ | B-02 permission reviews (role/capability audit) |
| Legal holds | ✔ | P6-14 `/legal-holds` (active hold blocks purge 409) |
| Export controls | ◑ | P8-11 export log records data exports | enforcement at export-time (annex A-12) |
| Incident support tools | ◑ | B-06 account health + logs | incident runbook integration (annex A-16) |
| Environment configuration | ◑ | Render blueprint + env vars | staging/preview parity (annex A-16) |

## 15. Infrastructure, deployment, observability (PDF phase-1/5)

| Capability | Status | Gap |
| --- | --- | --- |
| CI/CD | ◑ | **now enforced by `.github/workflows/ci.yml`** (build + tests + gates) | deploy pipeline + previews (annex A-16) |
| Migrations in CI | ✔ | `npm run build` invoked by CI; app runs migrations at boot (verified in CI test run) | explicit migration-gate job |
| Encrypted transport | N/A | human choice (Render per PDF) | — |
| Backups | ✔ | P5-01 `scripts/backup.sh` + drill (27-table diff) | scheduled/AWS |
| Restore drills | ✔ | P5-01 `scripts/restore-drill.sh` exit 0 with table-diff equality | CI off-cycle drill (annex A-16) |
| High availability | N/A | — |
| Queue/cache | ◑ | P6-11 PG `SKIP LOCKED` worker queue + DLQ | Redis broker for multi-instance (deferred by design) |
| Asset storage (S3) | ◑ | P6-10 disk backend (S3-compatible shape) + signed URLs | swap to real S3 |

## 16. Agentic delivery governance (PDF section 4)

| Capability | Status | Gap |
| --- | --- | --- |
| Issue-driven branches/PRs | ✔ | — |
| Protected merge/release gates | ◑ | repo rules are manual today **but CI now enforces build/test/drift on PRs** (`ci.yml`) | required checks + CODEOWNERS review |
| LoC gate (`scripts/loc.sh`) | ✔ | wired into CI | — |
| Audit logging for agent changes | ✔ | B-03 `agent_tag` attribution on audit rows (P7 set) | — |
| Rollback / drift detection | ✔ | B-04 `scripts/drift-check.js` in CI + ops/drift report | deploy rollback runbook |

---

## Line-of-code reconciliation

| Bucket | PDF estimate | Current | Remaining | Coverage |
| --- | --- | --- | --- | --- |
| Domain API (NestJS) | ~80k | 9,476 | ~70,524 | ~12% |
| Web UI (Next.js) | ~90k | 3,309 | ~86,691 | ~4% |
| Shared types + tests | ~20k | 861 | ~19,139 | ~4% |
| Infra, migrations, ops, docs | ~35k | 1,404 | ~33,596 | ~4% |
| Tests (e2e/unit/integration) | ~60k | ~2,400 (in API+web tallies) | ~57,600 | ~4% |
| **Total** | **~285k** | **~15,050** | **~269,950** | **~5%** |

Notes on sizing:

- The PDF estimate assumes a staffed 3–6 person team delivering over
  105–135 person-weeks (MVP) or 170–225 person-weeks (V1). The agent can
  deliver much faster on the code-generation axis but should still sequence
  work in the PDF's order so pilots see features in the intended hierarchy.
- The e2e file is currently ~1,220 LoC and sits inside `apps/api/test/`; the PDF
  asks for dedicated test packages at scale.
- A 200k+ target is realistic only when the remaining infrastructure choices
  (real S3, Redis broker, email/notification providers, billing, mobile) are
  live — much of that lands in the platform annex **A-01…A-16** (PR #17).
