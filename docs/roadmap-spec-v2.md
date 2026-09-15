# Production roadmap — V2 architecture specification

Ordered per the V2 spec's own dependency graph (§16.3), not by arbitrary
sequence. Supersedes `docs/roadmap.md`'s P5/6/8/9 ordering for all *new* work;
completed P2–P9 history is retained in `docs/roadmap-ledger.md`.

Source of truth for scope: `Palette_Canvas_Workspace_Specification-1.pdf` §7.7–17.
Source of truth for what already exists: `docs/gap-analysis-spec-v2.md` (Phase 0).

Every step lists **scope → exit criteria → tests** and lands behind a PR with
evidence per `AGENTS.md`.

---

## Phase 0 — Gap analysis ✅

**Deliverable:** `docs/gap-analysis-spec-v2.md` + this roadmap.

**Exit criteria:** every spec section classified Present / Partial / Missing with
a real code anchor; corrected net-new ranges replace §16.4's assumptions.

**Result:** overlap is real but concentrated in the intake→project→proofing
pipeline, capacity, comments, integration and RBAC foundations. The two
structurally new axes — a configurable board/column/view model (§9) and
cross-board semantic-role dashboards (§10) — have **no** existing implementation,
as does Guest identity (§14.1) and the Communication layer (§11).

---

## Phase 1 — Core data model + Guest identity

Built together, per §16.3: §14.4's guest RLS shape replaces §9.6's from day one.

| # | Scope | Exit criteria | Tests |
| --- | --- | --- | --- |
| V2-1.1 | **Engagement entity + claims** — `engagement` table, `engagement_id` threaded through boards/items/files; `Me` carries resolved `engagementId` | `engagement_id` present on every scope-bearing row | e2e: two engagements, cross-read blocked |
| V2-1.2 | **Board model** (§9.3) — `workspaces`, `boards`, `columns`, `groups`, `items`, `subitem_columns`, `subitems`, `board_views` with the exact spec DDL | board CRUD round-trip; `column_values` JSONB write/read | e2e: board + column + item lifecycle |
| V2-1.3 | **Column type catalog** (§9.4) — 25 types with `config` validation (status labels, formula, connect_board, duration, …) | all 25 types accepted; unknown rejected 400 | e2e: type catalog validation |
| V2-1.4 | **Semantic roles** (§10.2) — `columns.semantic_role` with fixed vocabulary; cloned with templates | role vocabulary enforced; null = board-local | e2e: semantic role set + reject invalid |
| V2-1.5 | **Guest identity** (§14.1/14.4) — `guest` role, `item_scope` + mandatory `expires_at`; three-way RLS policy shape | guest sees exactly one item; expired guest denied | e2e: guest scoped read + expiry |
| V2-1.6 | **Capacity bridge** (§9.7/§7.7) — seat model constants (173.6 raw / 137.1 productive, 21% non-billable), `duration`-column aggregation | utilisation = Σ duration hours vs 137.1 ceiling | e2e: seat utilisation from board items |

**Exit:** boards module + guest policy live; e2e ≥ 260. Net-new 8,000–14,000 LOC.

---

## Phase 2 — Files/DAM (§13)

| # | Scope | Exit criteria | Tests |
| --- | --- | --- | --- |
| V2-2.1 | **`files` table** (§13.1) — `storage_key`, `source` enum, `external_ref`, `parent_file_id` version chain | upload → list → version chain | e2e: version increments on re-upload |
| V2-2.2 | **References** — `files`-type column values, `messages.file_ids`, `item_comments.file_ids` | one storage row referenced from three surfaces | e2e: attach to column + comment |
| V2-2.3 | **Gallery view data** (§9.5) — `files_column_id` config drives grid | gallery config resolves file rows | e2e: gallery render payload |

**Exit:** files module live, referenced by columns + comms. Net-new 5,000–7,000.

---

## Phase 3 — Communication layer (§11)

| # | Scope | Exit criteria | Tests |
| --- | --- | --- | --- |
| V2-3.1 | **Channels** (§11.3) — `channels`, `channel_members`, instant/threaded/direct types | channel create + membership | e2e: join + post |
| V2-3.2 | **Internal/external boundary** (§11.2) — `visibility` fixed at creation; conversion is an audited action | client never sees internal channel; conversion audited | e2e: visibility enforcement + audit event |
| V2-3.3 | **Messages** — threaded via `parent_message_id`, `mentions` drive elevated notifications | thread reply links to parent; mention notifies | e2e: thread + mention |
| V2-3.4 | **Item comments** — existing `comment` shape retained, `engagement_id` denormalised for RLS | comment inherits item access | permission test |
| V2-3.5 | **Meetings** (§11.4) — `meetings` + `meeting_participants`, Jitsi room or external link, honest `joined_at` | meeting schedule + attendance record | e2e: schedule + join |

**Exit:** comms module live, visibility enforced twice. Net-new 6,000–9,500.

---

## Phase 4 — Cross-board dashboards (§10)

| # | Scope | Exit criteria | Tests |
| --- | --- | --- | --- |
| V2-4.1 | **Dashboard schema** (§10.3) — `dashboards`, `dashboard_widgets`, `dashboard_metrics` | system dashboards seeded for 3 scopes | e2e: widget CRUD |
| V2-4.2 | **Aggregation consumer** (§10.4) — on item write, extract semantic-role values into `dashboard_metrics` | metric row written per tagged column; no-op when untagged | e2e: aggregation on item update |
| V2-4.3 | **Widget catalog** (§10.6) — capacity KPI, QA pass-rate, turnaround chart, engagement health, commercial rollup, workload leaderboard | each widget type aggregates over metrics | e2e: pass-rate + capacity sum |
| V2-4.4 | **Role-scoped dashboards** (§10.5) — management (no filter), account-manager (own engagements), client (own engagement) | queries filtered by role claims | e2e: client dashboard sees only own engagement |

**Exit:** dashboards module live; widgets read only `dashboard_metrics`.
Net-new 5,000–8,000.

---

## Phase 5 — AI agent architecture (§12)

| # | Scope | Exit criteria | Tests |
| --- | --- | --- | --- |
| V2-5.1 | **Agent catalog** (§12.2) — 6 agents registered with autonomy level (propose-only / act-and-log / block-and-flag) | every agent declares autonomy in code | e2e: catalog shape |
| V2-5.2 | **Compliance Guard** (§12.5) — `compliance_checks`, metadata/filename/attribution scan, blocks `qa_technical` | failed check blocks technical status; clearing is attributed | e2e: block + attributed clear |
| V2-5.3 | **Brief Analysis Agent** — propose-only estimated hour range against `capacity_hours` | suggestion stored, requires human confirm | e2e: propose then confirm |
| V2-5.4 | **KPI/Reminder Agent** — act-and-log overdue reminders via Notification Service | reminder fires, no status change | e2e: reminder without mutation |
| V2-5.5 | **LLM provider seam** (§12.3) — open-weight inference API behind a provider interface, no self-hosted GPU | provider configurable via env, absent = graceful no-op | e2e: no-op without key |

**Exit:** agents governed by propose/approve/record; compliance guard blocks.
Net-new 6,500–7,290.

---

## Phase 6 — Landing + legal & resource pages (§8, §15)

Independent of Phases 1–5; good parallel-track work.

| # | Scope | Exit criteria | Tests |
| --- | --- | --- | --- |
| V2-6.1 | **Visual language** (§8.1) — exact planned palette from the mockups (`#131021` ink, `#1c1830` raise, cobalt `#4a74ed`, violet `#706ed0`, magenta `#c65e8f`) | tokens + CSS mirror the spec colours | snapshot |
| V2-6.2 | **Landing page** (§8.2) — header, hero slider, info cards, how-it-works, footer, social links | all five sections render; links resolve | e2e: routes 200 |
| V2-6.3 | **Sign-up branching** (§8.3) — employee request / partner agency / no guest self-serve | three paths expressed, guest has none | e2e: path mapping |
| V2-6.4 | **Terms / Privacy / Accessibility** (§15.1–15.3) | three pages render spec content incl. honest UK-data + a11y caveats | e2e: routes 200 |
| V2-6.5 | **Resources / What's New** (§15.4) | status + in-development + recently-shipped sections | snapshot |

**Exit:** public surface live. Net-new 600–690.

---

## Roadmap rules

- **Numbers first.** The `V2-<phase>.<n>` id is the canonical ordering.
- **Ledger threads everything.** `docs/roadmap-ledger.md` records status per id.
- **Exit criteria before scope.** A step isn't done until its exit criteria say so.
- **Tests are the gate.** Each step adds e2e/permission checks in the same PR.
- **Additive only.** Every migration is additive; no existing table is dropped or
  reshaped. Existing intake→proofing tests must stay green throughout.
- **Human approvals.** Infra/LLM-provider/legal-finalisation choices are human
  decisions; the agent implements the seam and records it in the ledger.