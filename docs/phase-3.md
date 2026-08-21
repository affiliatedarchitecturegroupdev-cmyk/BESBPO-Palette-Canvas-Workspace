# Phase 3 — production workspace

Real-persistence implementation of planning-document Phase 3: the production
workspace where creative delivery actually happens — tasks, boards,
dependencies, comments, notifications, and workload basics — layered on the
Phase 2 project home.

## API modules added to `apps/api`

| module | routes | notes |
| --- | --- | --- |
| workstreams | `GET /workstreams/:projectId`, `POST /workstreams/:projectId` | per-project groupings under milestones |
| tasks | `GET /tasks/:projectId`, `POST /tasks/:projectId`, `GET /tasks/:id/detail`, `PATCH /tasks/:id`, `POST /tasks/:id/dependencies`, `POST /tasks/:id/checklist`, `POST /tasks/:id/checklist/:itemId/toggle`, `GET /tasks/:projectId/calendar`, `POST /tasks/:id/collaborators` | one task model feeding board/list/calendar; closing a task with unfinished finish-to-start dependencies returns 400 |
| deliverables | `GET /deliverables/project/:projectId`, `POST /deliverables/project/:projectId` | linked tasks inherit `deliverable_id` |
| comments | `GET /comments/:targetType/:targetId`, `POST /comments`, `POST /comments/:id/resolve` | `@FirstName` body tokens resolve to org people; explicit person ids merge in |
| notifications | `GET /notifications` (inbox + unread), `POST /notifications/mark-read` | emitted on task assignment, `mention` resolution, and status change |
| workload | `GET /workload`, `POST /workload/tasks/:id/time` | per-person open tasks + estimated/logged hours; visible to ops/finance only |

## Data layer

`migrations/002_phase3_schema.sql` — workstream, task, deliverable,
task_dependency, task_checklist, task_collaborator, comment, notification,
time_entry. Reseed with:

```bash
npm run seed -w @palette-canvas/api   # adds the "Nimbus rebrand" demo project
```

## Capability matrix changes (`packages/shared`)

New capabilities `tasks.read`, `tasks.write`, `deliverables.read`,
`deliverables.write`, `comments.write`, `comments.resolve`,
`notifications.read`, `workload.read`, `time.log`. Internal production roles
write tasks; external roles (client approver, agency admin) read client-shared
work and comment but cannot write tasks or see workload. Comment resolution is
restricted to internal review roles. Tests in
`packages/shared/test/permissions.test.ts` pin the matrix.

## Web surface (`apps/web`)

- Project home: **Work** section with board / list / calendar toggle (status
  columns + cards, task move via select, client-side state)
- Task drawer: checklist add/toggle, dependencies (titles), time logging,
  comments thread + composer
- `/workload` — per-person open tasks, estimated and logged hours (ops/finance)
- `/notifications` — consolidated inbox with unread counter and mark-all-read
- Nav: unread badge on **Inbox**; browser calls go through same-origin
  `/pc-api` rewrite (works behind a single hosted tunnel port)

## Verification

- `packages/shared` permission tests — capability matrix + tenancy scoping
- `apps/api/test/e2e.test.ts` — 41 checks: tenant isolation, intake → project
  conversion, Phase 3 task lifecycle, dependency-block gate (400), assignment +
  status notifications, comment mention parse, notification read/resolve
  paths, time-log aggregation, cross-tenant negatives
- LoC gate: `bash scripts/loc.sh`
