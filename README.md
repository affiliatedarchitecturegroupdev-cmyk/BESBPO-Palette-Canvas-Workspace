# Palette Canvas Workspace

Monorepo for the Palette Canvas production workspace (see `Instructions.txt` and `docs/`).

## Phase 3 — production workspace (current)

Real-persistence implementation of the planning-document Phase 3: task boards
with list/calendar views, dependencies with close-blocking, deliverables,
workstream grouping, comments with @mentions, a notification inbox, and
workload basics (time logging + per-person load). See
[`docs/phase-3.md`](docs/phase-3.md).

- `apps/api` — NestJS domain API backed by Postgres (pg driver + runner-managed migrations)
- `apps/web` — role-aware Next.js workspace shell (dev user switcher)
- Postgres 17 in Docker is required; seed via `npm run seed -w @palette-canvas/api`

## Phase 2 — intake and project setup

Structured brief builder, triage with duplicates detection, client/agency
records, service templates, milestones, role assignment, and project home. See
[`docs/phase-2.md`](docs/phase-2.md).

## Phase 1 — foundation skeleton

- Monorepo with `apps/web` (Next.js workspace shell), `apps/api` (NestJS foundation), and shared packages.
- `packages/design-tokens` — color/typography/spacing as single source of truth for UI.
- `packages/shared` — shared TypeScript types, permission matrix, and visibility rules aligned to the planning PDF.
- `docs/` — permission matrix, hierarchical work-model notes, and decision records.
- `prototypes/color-tool` — the earlier Phase 1 color-canvas clickable prototype, retained for reference.

## Workspace layout

- `apps/web` — role-aware Next.js workspace shell using design tokens
- `apps/api` — NestJS domain API with Postgres persistence and capability-gated routes
- `packages/design-tokens` — design tokens for Palette Canvas UI
- `packages/shared` — permission matrix, hierarchy types, and core dtos
- `prototypes/color-tool` — preserved prototype (React + Vite) as reference

## Run

```sh
npm install
npm run build            # build all workspaces

docker run -d -p 5432:5432 --name pc-pg \
  -e POSTGRES_USER=palette_canvas -e POSTGRES_PASSWORD=devpassword \
  -e POSTGRES_DB=palette_canvas postgres:17

npm run seed -w @palette-canvas/api
npm run start -w @palette-canvas/api     # API on :3001
npm run start -w @palette-canvas/web     # web on :12000
```

## Tests

```sh
npm run test            # shared predicate tests + api e2e (needs Postgres)
```

## Documents

- [`Instructions.txt`](Instructions.txt)
- [`docs/phase-2.md`](docs/phase-2.md)
- [`docs/permissions.md`](docs/permissions.md)
- [`docs/work-hierarchy.md`](docs/work-hierarchy.md)
- [`docs/decisions/ADR-0001.md`](docs/decisions/ADR-0001.md)
