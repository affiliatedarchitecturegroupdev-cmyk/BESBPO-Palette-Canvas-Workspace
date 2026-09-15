# Gap analysis — existing workspace vs. the V2 architecture specification

**Phase 0 deliverable.** The V2 spec (`Palette_Canvas_Workspace_Specification-1.pdf`,
§7.7–§17) mandates that the roadmap *"start the same way rather than inventing a
percentage"*: check the actual codebase against the target specification, then
build only what is genuinely missing. This document is that check.

- **Basis:** direct inspection of the repo at merge `2131e74` (post PR #21).
- **Measured baseline:** **18,049 LoC** total, **62 tables**, **36 API modules**,
  **240 e2e checks**, **23 web routes**, `packages/shared` capability matrix.
- **Method:** for each spec section, classify the underlying data model and
  behaviour as **Present** (matches spec depth), **Partial** (same intent, earlier/
  simpler shape — the spec's own warning about *"an earlier, simpler placeholder
  behind the same label"*), or **Missing** (no evidence in code).

> The spec explicitly warns that a nav item existing does **not** imply the
> underlying data model matches its depth. This document resolves that per
> section rather than guessing a global overlap percentage.

---

## Summary table (drives `docs/roadmap-spec-v2.md`)

| Spec § | Capability | Status | Existing anchor in code | Genuine net-new |
| --- | --- | --- | --- | --- |
| 7.7 | Division architecture, `engagement_id` scope key | **Partial** | `agency`/`project` scoping, `discovery` work-hierarchy | engagement entity + claims |
| 7.7 | Capacity & Seat Management (137.1 hr/seat) | **Partial** | `capacity` module, `person_capacity`, `time_entry` | seat model constants + duration aggregation |
| 7.7 | Brief Intake & Production Pipeline | **Present** | `intake`, `triage`, `brief`, `project` | stage mapping onto boards |
| 7.7 | Deliverable Review & QA Gate (3-part) | **Partial** | `qa_checklist`, `qa_reviewer`, `quality` | `qa_brand`/`qa_brief`/`qa_technical` semantic roles |
| 7.7 | White-Label Compliance Guard | **Missing** | — | `compliance_checks` + guard service |
| 7.7 | Partner Agency Portal | **Partial** | `account-health` page/API | scoped dashboards |
| 8 | Landing page + auth architecture | **Missing** | workspace-only web app | landing page, sign-up branching |
| 9 | Boards/Columns/Groups/Items/Subitems/Views | **Missing** | `task` (fixed columns), `saved_view`, `template_schema` | full board data model + 25 column types + 6 views |
| 10 | Cross-board dashboards + semantic roles | **Missing** | `reports`, `events` | `semantic_role`, `dashboard_metrics`, aggregation |
| 11 | Communication layer (channels/messages/item comments/meetings) | **Missing** | `comment`, `reaction`, `notification`, `comment_asset` | channels model, messages, meetings |
| 12 | AI agent architecture | **Partial** | `ai` module, `ai_action`, `ai.review`/`ai.optin` caps | agent catalog + autonomy levels + compliance guard |
| 13 | Files/DAM + Adobe/Canva/Dropbox | **Partial** | `asset`, `storage`, `media`, `version` | `files` table, versions, integration sources |
| 14 | RBAC — 5 roles + Guest `item_scope` | **Partial** | 11 roles, capability matrix, agency scoping | `guest` role, `item_scope` claims, RLS policy shape |
| 15 | Legal (ToS/Privacy/Accessibility) + Resources | **Missing** | — | 4 pages |
| 16 | LOC estimate + phased roadmap | **Missing** | old roadmap (P5/6/8/9) | spec-ordered roadmap |
| 17 | Usage guides (4 roles) | **Partial** | `help` page | role-specific guides |

**Overlap conclusion:** the existing product carries real depth in *intake,
triage, projects, tasks, deliverables, proofing, approvals, QA, capacity, comms-in-
comments, integrations, audit and RBAC* — i.e. the **Production Pipeline,
Commercial, and Governance** areas. It has **no** implementation of the two
structurally new axes the spec introduces: (a) a **configurable board/column/view
data model**, and (b) **cross-board semantic-role dashboards**. Those two, plus
Guest identity, Files/DAM and the Communication layer, are the genuine net-new
work — and they are exactly the spec's Phase 1–5.

---

## §7.7 — Division architecture

| Aspect | Status | Evidence / gap |
| --- | --- | --- |
| `division_id: "palette-canvas"` | Present (implicit) | single-division repo; no column needed |
| `engagement_id` scope key | **Partial** | `agency` + `project` provide the same boundary but are two entities, not one `engagement_id` claim. Spec wants one key threaded through boards/items/files/comms/dashboards. |
| Core modules (Work/Comms/Files/Issues) | Partial | Work + Issues present (`task`, `comment`, `risk_register`); Comms and Files are thin. |
| Capacity & Seat Management | **Partial** | `capacity.service.ts` computes utilisation from `person_capacity.weekly_hours`; spec wants the benchmarked **173.6 raw / 137.1 productive** hours and read-only aggregation over `duration` column values (§9.7). |
| Brief Intake & Production Pipeline | **Present** | `intake` → `triage` → `intake.convert` → `project` → `deliverable` → `handover`. This is the strongest existing area. |
| Deliverable Review & QA Gate | **Partial** | `qa_checklist`, `technical_check`, `qa_reviewer`, `approval_step` exist, but the 3-part **brand/brief/technical** gate is not modelled as `status` columns with a hard block. |
| White-Label Compliance Guard | **Missing** | no metadata/filename/attribution scan anywhere. |
| Partner Agency Portal | **Partial** | `account-health` exists; not role-scoped to a client `engagement_id`. |

## §8 — Landing page & auth architecture

- **Landing page: Missing.** The web app's root route is the workspace dashboard;
  there is no marketing/landing surface, hero, info cards, "how it works", or
  footer.
- **Sign-up branching: Partial.** `auth.controller.ts` has `POST /auth/signup`
  (A-01 org+owner bootstrap). The spec's three-path branch (employee request /
  partner agency / no guest self-serve) is not expressed.
- **OAuth federation: Missing** (correctly deferred — Keycloak brokering is an
  infra decision; the spec says nothing new is required architecturally).

## §9 — Boards, Columns & Views

- **Missing entirely.** The closest analogues are `task` (fixed `status`/`priority`/
  `custom_fields`) and `template_schema.task_field_schema` (dynamic forms). Neither
  gives per-board column *definitions* with typed `config`, groups, subitems,
  `column_values` JSONB, or saved `board_views`.
- Spec entities absent: `workspaces`, `boards`, `columns`, `groups`, `items`,
  `subitem_columns`, `subitems`, `board_views`.
- **This is the single largest net-new block** (16,470 full-spec LOC per §16.2).

## §10 — Cross-board dashboards

- **Missing.** `reports.service.ts` aggregates over fixed tables, not over
  semantic roles. No `semantic_role` column, no `dashboards`/`dashboard_widgets`/
  `dashboard_metrics`, no aggregation consumer.
- Existing `events` module + `automation_rule` give the *pattern* the spec reuses
  (consumer on the event backbone) but not the dashboards themselves.

## §11 — Communication layer

- **Missing.** `comment` (threaded on task/deliverable) + `reaction` exist, which
  covers the spec's `item_comments` shape well. But there is no `channels`,
  `channel_members`, `messages`, `meetings` or `meeting_participants`, and no
  internal/external visibility boundary at the channel level.

## §12 — AI agent architecture

- **Partial.** `ai.service.ts` + `ai_action` + capabilities `ai.optin.manage` and
  `ai.review` already encode the spec's *"AI proposes, humans approve, the system
  records"* governance. What's missing is the **agent catalog** (6 named agents
  with explicit autonomy levels) and the compliance guard (§12.5).

## §13 — File ecosystem

- **Partial.** `asset` + `storage` + `media` + `version` cover upload/serve and
  versioning basics. Missing: a single `files` table with `source`
  (`native_upload`/`adobe_plugin`/`canva_app`/`dropbox_sync`), `external_ref`
  round-trip tracking, and `parent_file_id` version chain referenced by columns,
  messages and comments.

## §14 — RBAC

- **Partial.** 11 roles + ~60 capabilities + org/agency/project `role_binding`
  scoping is a solid base. Missing the spec's **5-role matrix normalisation**
  (Employee / Account Manager / Management / Client / Guest) and, critically,
  **Guest** with its `item_scope` + `expires_at` claims and the three-way RLS
  policy shape from §14.4.

## §15 — Legal & resource pages

- **Missing.** No ToS/Privacy/Accessibility/Resources routes or API.

## §16 — LOC & roadmap

- **Superseded.** Old roadmap (`docs/roadmap.md`) is organised by PDF-V1 phases
  P5/6/8/9. The V2 spec re-sequences by dependency (Phase 0–6). A new roadmap
  (`docs/roadmap-spec-v2.md`) is required; the old ledger is retained and extended.

## §17 — Usage guides

- **Partial.** `/help` exists with shortcuts + a role guide; the four role-specific
  guides (Employee / Account-Manager / Management / Partner-Agency) are not
  separate maintained pages.

---

## Net-new work implied (feeds the roadmap)

1. **Phase 1** — board data model (§9) + `semantic_role` (§10.2) + Guest claims
   (§14.1/14.4) + `engagement` entity. ~8,000–14,000 LOC (§16.4).
2. **Phase 2** — Files/DAM single table (§13.1). ~5,000–7,000.
3. **Phase 3** — Communication layer (§11). ~6,000–9,500.
4. **Phase 4** — Cross-board dashboards (§10). ~5,000–8,000.
5. **Phase 5** — AI agent catalog + compliance guard (§12). ~6,500–7,290.
6. **Phase 6** — Landing (§8) + legal/resource pages (§15). ~600–690.

The existing 18k LoC is **complemented, not disturbed**: every net-new table is
additive (new migrations), every net-new module reuses `AuthzService`,
`AuditService` and `Database`, and the existing intake→project→proofing pipeline
becomes the *seed* the board model (`is_template` + `cloned_from`) is built from.