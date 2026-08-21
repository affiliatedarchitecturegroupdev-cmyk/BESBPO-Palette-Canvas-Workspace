# Permission Matrix — Palette Canvas Workspace

Per the planning document, permissions combine role-based access control (RBAC)
with attribute-based rules: a user's role grants capability; their organisation,
agency, account, brand, project assignment, client status, and confidentiality tier
determine where it applies.

## Four visibility levels

| Level | Meaning | Default exposure |
|---|---|---|
| Internal | Capacity, staff performance, costs, margin, internal QA, vendor negotiations | Internal roles only; never exposed externally |
| Agency shared | Work-related material shared with an agency partner | Agency and internal roles |
| Client shared | Proofs, briefs, decisions shared with a client/grantor | Client approver and above |
| Restricted third party | Time-bound tasks/files for vendors | Explicitly scoped only |

## Rules

- **Tenant isolation** — an agency must never discover another agency, its brands, projects,
  people, files, or activity (via search, notifications, URLs, reports, or autocomplete).
- Internal-classified data defaults to **Internal**; external proofs expose only the
  fields/comments/versions required for the approval decision.
- Any change that raises scope is a high-risk action and must be logged to the audit trail
  (see `AGENTS.md`).

## Role matrix (PDF section 1)

| Role | Default scope | Notes |
|---|---|---|
| Platform owner | All organisations | Full admin; all high-risk actions logged |
| Operations director | All assigned accounts | Portfolio/commercial oversight, exception approvals |
| Account manager / PM | Assigned agencies/brands/projects | Intake, plan, approvals, handover |
| Production lead / traffic | Assigned teams/workstreams | Assign work, change priorities |
| Creative contributor | Assigned work | Read/write assigned records, versions, comments |
| Quality reviewer | Assigned deliverables | Annotate, approve/reject QA, block handover if evidence incomplete |
| Agency admin | Own agency + delegated brands | Invite agency users, submit requests |
| Agency contributor | Explicitly shared workspaces | Read/comment/approve invited scopes |
| Client approver | Specific projects/deliverables | Proof review without internal staff/margin data |
| Third-party vendor | Time-bound tasks/deliverables | Restricted, expiring access, no portfolio discovery |
| Finance / commercial | Assigned accounts | Commercial data isolated from creative production |

## Implementation notes

The shared package `@palette-canvas/shared` exports `VisibilityLevel`, `Role`, and
`canSeeVisibility` used by the API in this foundation phase. In later phases these map
to a Postgres-organisation hierarchy (Organisation > Agency/Client Account > Brand >
Workspace > Project > Workstream > Deliverable > Task > Proof/Asset/Decision), enforced
server-side and covered by automated negative-access tests per the PDF's acceptance
criteria.
