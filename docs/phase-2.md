# Phase 2 — intake and project setup

Real-persistence implementation of planning-document Phase 2 (structured
briefs, dotted-line triage, and the project home extension).

## Services added to `apps/api`

| module | routes | notes |
| --- | --- | --- |
| identity | `GET /identity/users`, `GET /identity/me` | header-based dev auth (`x-user-email`) resolved against `person` + `role_binding` |
| audit | `GET /audit/:projectId` | Capability `audit.read` (ops/supervisor only) |
| directory | `/directory/agencies`, `/directory/brands`, `/directory/agencies/:id/contacts` | queries scoped via role-binding scopes |
| templates | `GET /templates`, `POST /templates` | phases, required fields, deliverables, QA checks, SLA, approvals, handover |
| intake | `GET/POST /intake`, `GET /intake/:id` | structured builder + {"duplicate detection"} on title+brand fallback |
| triage | `POST /triage/:briefId` | decision + estimate + capability/risk notes recorded on brief |
| projects | `/projects`, `/projects/:id`, `/projects/convert`, `/projects/:id/milestones`, `/projects/:id/status`, `/projects/:id/roles` | project home aggregates charter, milestones, roles |

## Data layer

`migrations/001_phase2_schema.sql` — organisation, person, role_binding,
agency, brand, contact, template, brief, audit_event, project, project_role,
milestone. Seed demo data via:

```bash
docker run -d -p 5432:5432 --name pc-pg \
  -e POSTGRES_USER=palette_canvas -e POSTGRES_PASSWORD=devpassword \
  -e POSTGRES_DB=palette_canvas postgres:17

npm run seed -w @palette-canvas/api
npm run start -w @palette-canvas/api   # API on :3001
npm run start -w @palette-canvas/web   # web on :12000
```

## Testing

- `npm run test -w @palette-canvas/shared` — provider/type predicate tests
- `npm run test -w @palette-canvas/api` — 23 e2e checks against real Postgres
  (intake → triage → conversion → project home + permission negatives)

The e2e suite truncates all domain tables for a clean run; re-run
`npm run seed -w @palette-canvas/api` afterward to restore demo data.

## Role-aware web shell

`apps/web` uses server components that forward the user cookie
(`pc_user_email`) as the API auth header. Dev-only switcher lives in the nav;

`Phase 5 hardening` replaces it with SSO. Households:

| route | UI |
| --- | --- |
| `/` | counts overview |
| `/intake` | inbox |
| `/intake/new` | structured brief builder (template-driven required fields) |
| `/intake/[id]` | brief detail + triage + convert |
| `/directory` | agencies + brands |
| `/templates` | template definitions |
| `/projects` | project list |
| `/projects/[id]` | phase stepper, milestones, charter, roles, status actions |

## Checklist mapping (PDF Phase 2 outputs)

- [x] Intake UI — template fields, attachments, confidentiality
- [x] Client/agency records — agencies, brands, contacts with tier health
- [x] Service/project templates — phases, deliverables, checks, SLA, approvals, handover
- [x] Roles assigned — person/role_binding + `project_role`
- [x] Basic project home — status, charter summary, team, checklist (phase stepper)
- [x] Brief triage — accept with estimate, reject with reason, duplicates flagged
- [x] Permission gates — capability checks per role + scope filters
- [x] Duplicate detection — inline `duplicate_of` link on identical title+brand
- [x] Migrated data — Postgres migration + rollback-free idempotent runner
