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
  `palette_canvas`). Bootstrap: run `sudo dockerd` in the background (plain — it
  takes no `-g` flag), then `sudo docker run -d --name pc-pg
  -e POSTGRES_USER=palette_canvas -e POSTGRES_PASSWORD=devpassword
  -e POSTGRES_DB=palette_canvas -p 5432:5432 postgres:17`. All `docker` calls
  need `sudo` in this environment.
- Migrations live in `apps/api/migrations/` and run at boot, in seed, and in
  e2e, via the idempotent runner in `apps/api/src/db/migrate.ts`. Path
  discovery uses `apps/api/src/db/paths.ts` (`migrationsDir`).
- Dev auth: endpoints resolve the `x-user-email` header against `person` +
  `role_binding` rows; the web app forwards cookie `pc_user_email` as that
  header (Phase 5 hardening replaces with SSO).
- **Known dev-mode hole (flagged, not silently changed):** `GET /identity/users`
  (`apps/api/src/identity/identity.controller.ts`) takes no identity, applies no
  capability check, and selects from `person` with no `org_id` filter. It serves
  the dev user switcher, so it lists **every person in every organisation** to
  any caller. It is a deliberate dev affordance and must not ship to any
  shared environment; the Phase 5 SSO exchange is what removes it. Do not
  "fix" it by adding a filter without the switcher's replacement, and do not
  copy its shape into a new endpoint.
- Permission gates are capability-based: `authz.require` /
  `authz.requireScope` (see `apps/api/src/identity/authz.service.ts`);
  capabilities map is in `packages/shared` (`_ROLE_CAPABILITIES`).
- Browser-side API calls use same-origin prefix `/pc-api` (Next rewrites to
  `PC_API_URL`), so a hosted tunnel needs only the web port exposed.
- e2e test `apps/api/test/e2e.test.ts` truncates all domain tables first —
  safe to run repeatedly.
- Run gates: `npm run build` then `npm run test` at the workspace root.
- **Pick up work**: read `docs/roadmap-ledger.md` first — take the top `todo`
  entry, execute it, record the commit + gates in the ledger, and update
  `docs/roadmap.md` only if scope actually changed.
- **No phase skipping**: roadmap steps execute in order; blocked entries stay
  `blocked` with a note rather than disappearing.

## Specification-source discipline

- The authoritative specification package lives outside the repo (supplied as a
  Dropbox ZIP). Work from `full-specification-source/` and the supplied assets
  and legal drafts — **not** from a PDF summary or from memory. Public-surface
  content once shipped from summary-level reading and invented a governing law,
  a data region and a WCAG version; all three were wrong.
- When a user directive contradicts the spec package (e.g. Render instead of
  AWS, or an ignored infra instruction), the user directive wins. Record the
  substitution in `docs/roadmap-ledger.md` next to the affected id.
- Never let a verification script assert strings that were themselves invented.
  A gate that encodes fabricated content cannot detect it. Keep negative guards
  that fail when known-bad content reappears.
- When a shell script captures a page body, use a helper that reads the body for
  exactly one URL (`body_of`). The `$(fetch A; fetch B; cat $file)` idiom
  clobbers a shared temp file and silently checks the wrong page.
- The public-surface check runs as part of `npm test` (`test:public-surface` →
  `scripts/public-surface-gate.sh`), which boots the built web app on an
  ephemeral port. It was an optional script before, and that is how fabricated
  legal content reached `main`: the check existed but nothing enforced it. Do
  not move it back out of the test path.
- A marker can be satisfied by shared chrome rather than the page under test —
  the contact address appears in the footer on every route, so asserting it does
  not prove anything about a specific page. Prefer page-unique text.
- In `docs/roadmap-ledger.md`, `drift-check.js` treats *any* markdown table row
  containing a status token cell (`done|todo|in-review|blocked|n/a`) as a ledger
  row. Extra columns of prose in the planning tables ("Next phases") will be
  parsed as rows and reported as unknown-status errors. Keep planning tables to
  the four columns shown there; the main ledger table is the only place status
  belongs.
- Status semantics: `done` requires a merge reference (a PR number). Work that
  is committed on a branch but awaiting the human merge gate is `in-review` and
  must cite the branch. Do not mark a slice `done` from a branch tip.
