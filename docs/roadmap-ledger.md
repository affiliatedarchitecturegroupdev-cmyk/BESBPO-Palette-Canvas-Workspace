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
| P5-01 | Backup + restore drill tooling | todo | — | script runs + table diff | next after PR #2 merges |
| P5-02 | Load test script | todo | — | p95 < 1000 ms | pilot traffic profile |
| P5-03 | Accessibility remediation | todo | — | audit + label sweep | inputs + landmarks |
| P5-04 | Security remediation | todo | — | headers + error wrapper | manual audit |
| P5-05 | Support runbooks (ops/) | todo | — | docs list covers 5 topics | — |
| P5-06 | Import dry-run script | todo | — | schema validation + zero insert | — |
| P5-07 | Pilot launch checklist | todo | — | 12-item readiness list | — |
| P6-01 | Capacity planning | todo | — | skills + thresholds | V1 |
| P6-02 | Time/effort reporting | todo | — | utilisation dashboard | V1 |
| P6-03 | Advanced dashboards | todo | — | portfolio/WIP/ageing/SLA | V1 |
| P6-04 | Integrations hub | todo | — | rules + webhooks | V1 |
| P6-05 | Richer proofing | todo | — | annotated feedback + compare | V1 |
| P6-06 | SSO/SCIM | todo | — | OIDC + SCIM + MFA | V1 |
| P6-07 | Commercial controls | todo | — | rate cards + PO + invoice | V1 |
| P6-08 | Automation builder | todo | — | rules DSL | V1 |
| P6-09 | Live updates (SSE) | todo | — | authenticated channel | infra |
| P6-10 | Object storage | todo | — | S3 signed URLs | infra |
| P6-11 | Worker queue | todo | — | Redis queue + DLQ | infra |
| P6-12 | Media workers | todo | — | thumbnail/transcode | infra |
| P6-13 | AI opt-in guards | todo | — | per-tenant opt-in | infra |
| P6-14 | Legal holds + retention | todo | — | legal_hold blocks purge | infra |
| B-01 | Audit explorer UI | todo | — | searchable audit table | backlog |
| B-02 | Permissions reviews | todo | — | review workflow | backlog |
| B-03 | Agent-attribution audit | todo | — | agent_tag column | backlog |
| B-04 | Drift detection | todo | — | daily ledger diff | backlog |
| B-05 | Knowledge library | todo | — | guideline landing | backlog |
| B-06 | Account health | todo | — | engagement dashboard | backlog |

## Recently completed detail

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
