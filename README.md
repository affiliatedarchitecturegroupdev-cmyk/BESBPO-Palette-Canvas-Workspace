# Palette Canvas Workspace

Monorepo for the Palette Canvas production workspace (see `Instructions.txt` and `docs/`).

## Phase 1 — foundation skeleton

This phase delivers a secure, deployable workspace skeleton per the planning document:

- Monorepo with `apps/web` (Next.js workspace shell), `apps/api` (NestJS foundation), and shared packages.
- `packages/design-tokens` — color/typography/spacing as single source of truth for UI.
- `packages/shared` — shared TypeScript types, permission matrix, and visibility rules aligned to the planning PDF.
- `docs/` — permission matrix, hierarchical work-model notes, and decision records.
- `prototypes/color-tool` — the earlier Phase 1 color-canvas clickable prototype, retained for reference.

## Workspace layout

- `apps/web` — minimal Next.js workspace shell using design tokens
- `apps/api` — NestJS skeleton with in-memory audit + tenancy/permission rules
- `packages/design-tokens` — design tokens for Palette Canvas UI
- `packages/shared` — permission matrix, hierarchy types, and core dtos
- `prototypes/color-tool` — preserved prototype (React + Vite) as reference

## Run

```sh
npm install
npm run build            # build all workspaces
```

## Documents

- [`Instructions.txt`](Instructions.txt)
- [`docs/permissions.md`](docs/permissions.md)
- [`docs/work-hierarchy.md`](docs/work-hierarchy.md)
- [`docs/decisions/ADR-0001.md`](docs/decisions/ADR-0001.md)
