# Agentic Delivery Rules — Palette Canvas Workspace

Per the planning document, work in this repository follows **Human-in-the-Loop, issue-driven agentic implementation** with protected merge/release gates. Agents accelerate scaffolding, tests, docs, and well-specified work; accountability for product, security, QA, and release remains with humans.

## What an agent MAY do

- Create branches, propose focused changes, and open pull requests with evidence
- Write/modify code, tests, documentation, and infrastructure definitions inside the monorepo
- Assemble release notes and prepare release changes
- Address issues with clear acceptance criteria and keep individual slices small
- Run build/test/lint pipelines and CI quality gates

## What an agent MUST NOT do

- Commit or push directly to `main` / release branches — use a PR and require human merge approval
- Hold or use production credentials (database, storage, identity provider, unrestricted cloud) at any time
- Deploy to production — deployments originate from protected CI only, after human approval
- Introduce undocumented data migrations, dependency changes to non-standard registries, or `curl|bash` patterns
- Disable quality gates, tests, lint, or audit logging to make a change "work"

## Merge / release gate

A change may only land on `main` when it satisfies:

1. Branch + pull request from a properly scoped agent token
2. All CI checks passing (build, type-check, tests, permission tests)
3. Evidence on the PR for each shipped feature (acceptance scenario per role, negative permission case, data migration/rollback where relevant)
4. CODEOWNERS / domain-owner review
5. Security checks: secrets scanning, dependency scanning, upload-abuse testing
6. Learning retrospective closed for high-severity issues before the next high-impact change

## Credentials policy (per PDF, section 7)

- Development agents get a limited **read/write** repository token scoped to branches and PRs, plus preview-data access
- Agents **never** receive standing production credentials
- Deployments come from protected CI after human approval

## Sizing rule of thumb

Prefer small, well-specified slices: "Add board permission tests for vendor and agency roles" over "Rewrite delivery module." The PDF calls out small slices with enforced CODEOWNER review as the mitigation for agentic-delivery risk.

## Operational knowledge (Phase 2)

- Postgres is required for API tests and boot: local Docker container
  `pc-pg` (`postgres:17`, user `palette_canvas`, password `devpassword`, db
  `palette_canvas`). Docker daemon may need `sudo dockerd -g` style bootstrap.
- Migrations live in `apps/api/migrations/` and run at boot, in seed, and in
  e2e, via the idempotent runner in `apps/api/src/db/migrate.ts`. Path
  discovery uses `apps/api/src/db/paths.ts` (`migrationsDir`).
- Dev auth: endpoints resolve the `x-user-email` header against `person` +
  `role_binding` rows; the web app forwards cookie `pc_user_email` as that
  header (Phase 5 hardening replaces with SSO).
- Permission gates are capability-based: `authz.require` /
  `authz.requireScope` (see `apps/api/src/identity/authz.service.ts`);
  capabilities map is in `packages/shared` (`_ROLE_CAPABILITIES`).
- e2e test `apps/api/test/e2e.test.ts` truncates all domain tables first —
  safe to run repeatedly.
- Run gates: `npm run build` then `npm run test` at the workspace root.
