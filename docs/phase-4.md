# Phase 4 — proofing, approvals, and handover

Real-persistence implementation of the planning-document Phase 4: versions flow
through internal QA → client approval → handover delivery, with change-control
records attached to rejected decisions.

## API modules added to `apps/api`

| module | routes | notes |
| --- | --- | --- |
| proofing (versions) | `GET/POST /proofing/versions/:deliverableId` | numbered versions per deliverable |
| qa checklists | `GET/POST /proofing/versions/:id/qa`, `PATCH /proofing/versions/:id/qa/:itemId` | internal gate before client review |
| approvals | `GET/POST /proofing/approvals/:versionId`, `POST /proofing/approvals/:id/decide` | request requires QA complete (409 before); decision is client-only (`approvals.decide`) |
| change requests | `GET/POST /proofing/projects/:id/changes`, `POST /proofing/changes/:id/decide` | proposed off a `changes_requested` decision; account owner accepts/declines |
| handover | `GET/POST /proofing/projects/:id/handover`, `POST /proofing/handover/:id/items`, `POST /proofing/handover/:id/status` | package only accepts `approved` versions |

## Data layer

`migrations/003_phase4_schema.sql` — version, qa_checklist, approval,
change_request, handover_package, handover_item.

## Status flow

`draft` → `under_qa` (first QA item added) → `in_review` (approval requested)
→ `approved | changes_requested` → `handover_item` on the assembled package.
Rejected decisions notify the requester so change control can convene.

## Capability matrix additions (`packages/shared`)

`versions.write` (creative/lead/ops), `qa.write` (QA/ops),
`approvals.request` (account manager/ops), `approvals.decide` (client approver only),
`change.write` (account manager/ops), `handover.write` (production lead/ops).
Client approver also gains `deliverables.read` so the proofing surface is navigable.

## Web surface (`apps/web`)

- `projects/[id]/deliverables/[deliverableId]/page.tsx` — versions + approvals
  per deliverable, handover package, change-request list and proposal form
- `ProofingView.tsx` — client interaction for approval decisions, QA pass marks,
  version upload, handover assignment (all capability-gated)
- Project sidebar: deliverable names now link to the proofing page

## Verification

- e2e: 55 checks — QA→client gate (409 before QA passes), AM cannot decide (403),
  client decision updates version status, unapproved version rejected from
  handover (409), delivered handover manifest readable by client, role-gating
  for every write
- permission tests cover the new matrix entries
- LoC gate: `bash scripts/loc.sh`
