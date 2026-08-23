# Gap analysis — Palette Canvas Workspace (current state vs PDF V1)

Snapshot date: 2026-08-21. Scope reference: 27-page planning document, module
table in section 2. All capability statements in the PDF's roadmap table are
treated as the target surface; this document marks what has been built and
what is outstanding.

Current code footprint: **7,261 maintained LoC / 91 files**
(`bash scripts/loc.sh`). PDF V1 estimate: **225,000–285,000 LoC**
(includes tests + infrastructure + docs; excludes lockfiles/vendored deps).
Current coverage is ~3% of the planned V1 surface.

## Status legend

- ✔ built (MVP surface + e2e coverage where specified)
- ◑ partial — core flow present; advanced capabilities missing
- ✘ not started
- N/A — infrastructure choice deferred / owner is a human, not the agent

## 1. Identity, organisations, access (MVP priority)

| Capability | Status | What exists today | Gap |
| --- | --- | --- | --- |
| Email invitation | ✘ | none | invite links, acceptance flows, expiring access |
| SSO-ready authentication | ✘ | header auth (`x-user-email`) | OIDC/SAML; per PDF phase-5 hardening |
| MFA support | ✘ | none | TOTP/WebAuthn, recovery codes |
| Organisation hierarchy | ◑ | single org per user, tenancy scoped | parent/child orgs, agency-to-client links |
| Roles | ✔ | role_binding + capability map | fine-grained attributes per PDF §1 |
| Project sharing | ◑ | project_role assignment | guest access expiry, per-resource scopes |
| Expiring guest access | ✘ | none | time-bound access for third-party vendor |
| Audit trail | ✔ | audit_event + `/audit` controller | exportable audit explorer UI |

## 2. Agency & client relationship management (MVP)

| Capability | Status | Gap |
| --- | --- | --- |
| Agency profile | ✔ | — |
| Brands | ✔ | — |
| Key contacts | ✔ | — |
| Working agreements | ✘ | — |
| Service templates | ✔ | — |
| Confidentiality tier | ✘ | no data-class model; needs classification column + visibility |
| Account health | ✘ | — |

## 3. Intake & structured brief (MVP)

| Capability | Status | Gap |
| --- | --- | --- |
| Configurable brief forms | ✔ | — |
| Mandatory fields by service type | ✔ | — |
| Attachments | ✘ | — |
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
| Recurring work | ✘ | — |
| Custom fields | ◑ | stored as JSONB; no validation or views |
| Status model | ✔ | — |
| Saved views | ✘ | — |
| Swimlanes, drag-and-drop board | ✘ | — |
| Priority, filters, per-user/team workload | ◑ | priority exists; no filters or workload dashboard yet |
| Due-date risk markers | ✘ | — |
| Calendar | ✔ | — |

## 5. Creative asset & proofing (MVP)

| Capability | Status | Gap |
| --- | --- | --- |
| File versioning | ✔ | — |
| Source/final distinction | ✔ | — |
| Thumbnails | ✘ | no object storage yet (URI metadata only) |
| Proof links | ✘ | — |
| Annotated feedback | ✘ | coordinates on canvas, threaded |
| Side-by-side version comparison | ✘ | — |
| Approval history | ✔ | — |

## 6. Work-linked communications (MVP)

| Capability | Status | Gap |
| --- | --- | --- |
| Project/task/deliverable threads | ✔ | — |
| Mentions | ✔ | — |
| Internal/external visibility | ◑ | comments are target-scoped but not visibility-tagged |
| Message-to-task conversion | ✘ | — |
| Decision records | ✔ | — |
| Notification centre | ✔ | — |
| Reactions | ✘ | — |
| Attachments in comments | ✘ | — |
| Live updates (WebSocket/SSE) | ✘ | full page refresh today |

## 7. Reviews, approvals, change control (MVP)

| Capability | Status | Gap |
| --- | --- | --- |
| Sequential/parallel approval steps | ✘ | single-stage only |
| Review due dates | ✔ | — |
| Approve/reject/request changes | ✔ | — |
| E-sign integration point | ✘ | — |
| Scope-change record | ✔ | change requests linked to approvals |

## 8. Quality assurance (MVP)

| Capability | Status | Gap |
| --- | --- | --- |
| Template-specific checklists | ✔ | — |
| Automated technical checks | ✘ | no media pipeline |
| Reviewer assignment | ✘ | — |
| Non-conformance record | ✘ | — |
| Release gate | ✔ | QA must pass before client review (409) |

## 9. Capacity, time, service performance (V1)

| Capability | Status | Gap |
| --- | --- | --- |
| Skills | ✘ | — |
| Availability | ✘ | — |
| Workload | ◑ | basic; no thresholds or skills |
| Time/effort | ✔ | — |
| Utilisation | ✘ | — |
| SLA clocks | ✘ | — |
| Delivery risk | ✘ | — |
| Team queue | ✘ | — |

## 10. Commercial controls (V1)

| Capability | Status | Gap |
| --- | --- | --- |
| Rate-card references | ✘ | — |
| Estimate versions | ✘ | — |
| Budget vs effort | ✘ | — |
| Purchase order fields | ✘ | — |
| Change-order values | ✔ | impact_hours/impact_cost |
| Invoice-ready milestones | ✘ | — |

## 11. Reporting & management control tower (MVP exec, V1 drill-down)

| Capability | Status | Gap |
| --- | --- | --- |
| Portfolio health | ✘ | — |
| On-time rate | ✘ | — |
| WIP | ✘ | — |
| Ageing | ✘ | — |
| Rework | ✘ | — |
| Approval cycle time | ✘ | — |
| SLA attainment | ✘ | — |
| Capacity | ✘ | — |
| Account scorecard | ✘ | — |

## 12. Automation & integration hub (MVP foundations)

| Capability | Status | Gap |
| --- | --- | --- |
| Rules | ✘ | — |
| Webhooks | ✘ | — |
| Scheduled reminders | ✘ | — |
| Email/Slack/Teams notifications | ✘ | — |
| API keys | ✘ | — |
| Import/export | ✘ | — |
| Integration health | ✘ | — |

## 13. Knowledge & template library (MVP)

| Capability | Status | Gap |
| --- | --- | --- |
| Brand guidelines | ✘ | — |
| Brief templates | ✔ | — |
| QA standards | ◑ | per-version QA; no library |
| Reusable checklists | ✘ | — |
| Handover packs | ✔ | — |
| Decision archive | ✘ | — |

## 14. Administration, security, governance (MVP foundations)

| Capability | Status | Gap |
| --- | --- | --- |
| Retention | ✘ | — |
| Audit explorer | ◑ | endpoint only, no UI |
| Permission reviews | ✘ | — |
| Legal holds | ✘ | — |
| Export controls | ✘ | — |
| Incident support tools | ✘ | — |
| Environment configuration | ✘ | — |

## 15. Infrastructure, deployment, observability (PDF phase-1/5)

| Capability | Status | Gap |
| --- | --- | --- |
| CI/CD | N/A | human choice (Render per PDF) |
| Migrations in CI | N/A | — |
| Encrypted transport | N/A | — |
| Backups | ✘ | script ready; drill pending |
| Restore drills | ◑ | `scripts/restore-drill.sh` written but un-run in CI |
| High availability | N/A | — |
| Queue/cache (Redis) | ✘ | no queue layer; notifications sync |
| Asset storage (S3) | ✘ | URIs only; no upload/serve |

## 16. Agentic delivery governance (PDF section 4)

| Capability | Status | Gap |
| --- | --- | --- |
| Issue-driven branches/PRs | ✔ | — |
| Protected merge/release gates | ◑ | repo rules are manual today |
| LoC gate (`scripts/loc.sh`) | ✔ | — |
| Audit logging for agent changes | ◑ | audit_event exists; no agent-attribution column |
| Rollback / drift detection | ✘ | — |

---

## Line-of-code reconciliation

| Bucket | PDF estimate | Current | Remaining | Coverage |
| --- | --- | --- | --- | --- |
| Domain API (NestJS) | ~80k | 3,139 | ~76,861 | ~4% |
| Web UI (Next.js) | ~90k | 2,018 | ~87,982 | ~2% |
| Shared types + tests | ~20k | 472 | ~19,528 | ~2% |
| Infra, migrations, ops, docs | ~35k | 196 | ~34,804 | ~1% |
| Tests (e2e/unit/integration) | ~60k | ~1,450 (in API+web tallies) | ~58,550 | ~2% |
| **Total** | **~285k** | **~7,261** | **~277,739** | **~3%** |

Notes on sizing:

- The PDF estimate assumes a staffed 3–6 person team delivering over
  105–135 person-weeks (MVP) or 170–225 person-weeks (V1). The agent can
  deliver much faster on the code-generation axis but should still sequence
  work in the PDF's order so pilots see features in the intended hierarchy.
- The e2e file is currently 730 LoC and sits inside `apps/api/test/`; the PDF
  asks for dedicated test packages at scale.
- A 200k+ target is realistic only when the infrastructure choices (queue,
  object store, queue-driven notifications, WebSocket, workers) are live —
  the PDF assigns them to phases 5–6.
