-- V2 spec §9 / §10.2 / §14.1 — boards, columns, groups, items, subitems,
-- views, semantic roles, and the guest claim.
--
-- Additive only: nothing existing is dropped or reshaped. `engagement` is a
-- first-class entity so `engagement_id` can thread through boards/items/files/
-- comms/dashboards as the single scope key the spec requires (§7.7). The
-- existing `agency`/`project` model is untouched; an engagement may reference a
-- project where one exists.

-- ============================================================
-- ENGAGEMENTS — the scope key (spec §7.7)
-- ============================================================
CREATE TABLE IF NOT EXISTS engagement (
  id           TEXT PRIMARY KEY,
  org_id       TEXT NOT NULL REFERENCES organisation(id),
  agency_id    TEXT REFERENCES agency(id),
  project_id   TEXT REFERENCES project(id) ON DELETE SET NULL,
  name         TEXT NOT NULL,
  status       TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','paused','closed')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at  TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS engagement_org_idx ON engagement (org_id, status);
CREATE INDEX IF NOT EXISTS engagement_agency_idx ON engagement (agency_id);

-- ============================================================
-- WORKSPACES (spec §9.3)
-- ============================================================
CREATE TABLE IF NOT EXISTS workspace (
  id             TEXT PRIMARY KEY,
  org_id         TEXT NOT NULL REFERENCES organisation(id),
  division_id    TEXT NOT NULL DEFAULT 'palette-canvas',
  engagement_id  TEXT REFERENCES engagement(id),  -- NULL = internal workspace
  name           TEXT NOT NULL,
  workspace_type TEXT NOT NULL DEFAULT 'client'
                   CHECK (workspace_type IN ('client','internal')),
  created_by     TEXT NOT NULL REFERENCES person(id),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at    TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS workspace_engagement_idx ON workspace (engagement_id);
CREATE INDEX IF NOT EXISTS workspace_org_idx ON workspace (org_id);

-- ============================================================
-- BOARDS (spec §9.3)
-- ============================================================
CREATE TABLE IF NOT EXISTS board (
  id             TEXT PRIMARY KEY,
  org_id         TEXT NOT NULL REFERENCES organisation(id),
  workspace_id   TEXT NOT NULL REFERENCES workspace(id) ON DELETE CASCADE,
  engagement_id  TEXT REFERENCES engagement(id),  -- denormalised for direct RLS
  name           TEXT NOT NULL,
  description    TEXT,
  is_template    BOOLEAN NOT NULL DEFAULT false,
  cloned_from    TEXT REFERENCES board(id),
  position       INTEGER NOT NULL DEFAULT 0,
  created_by     TEXT NOT NULL REFERENCES person(id),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at    TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS board_workspace_idx ON board (workspace_id);
CREATE INDEX IF NOT EXISTS board_engagement_idx ON board (engagement_id);

-- ============================================================
-- COLUMNS — schema definition, one row per column per board (spec §9.3/9.4)
-- semantic_role added per spec §10.2.
-- ============================================================
CREATE TABLE IF NOT EXISTS board_column (
  id            TEXT PRIMARY KEY,
  board_id      TEXT NOT NULL REFERENCES board(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  column_type   TEXT NOT NULL,
  config        JSONB NOT NULL DEFAULT '{}',
  semantic_role TEXT,                              -- fixed vocabulary, nullable
  position      INTEGER NOT NULL DEFAULT 0,
  is_system     BOOLEAN NOT NULL DEFAULT false,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS board_column_board_idx ON board_column (board_id);
CREATE INDEX IF NOT EXISTS board_column_semantic_idx ON board_column (semantic_role);

-- ============================================================
-- GROUPS — collapsible sections within a board (spec §9.3)
-- ============================================================
CREATE TABLE IF NOT EXISTS board_group (
  id           TEXT PRIMARY KEY,
  board_id     TEXT NOT NULL REFERENCES board(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  color        TEXT,
  position     INTEGER NOT NULL DEFAULT 0,
  is_collapsed BOOLEAN NOT NULL DEFAULT false
);
CREATE INDEX IF NOT EXISTS board_group_board_idx ON board_group (board_id);

-- ============================================================
-- ITEMS — the rows (spec §9.3)
-- ============================================================
CREATE TABLE IF NOT EXISTS item (
  id             TEXT PRIMARY KEY,
  org_id         TEXT NOT NULL REFERENCES organisation(id),
  board_id       TEXT NOT NULL REFERENCES board(id) ON DELETE CASCADE,
  group_id       TEXT NOT NULL REFERENCES board_group(id) ON DELETE CASCADE,
  engagement_id  TEXT REFERENCES engagement(id),  -- denormalised for direct RLS
  name           TEXT NOT NULL,
  column_values  JSONB NOT NULL DEFAULT '{}',     -- { "<column_id>": <value> }
  position       INTEGER NOT NULL DEFAULT 0,
  created_by     TEXT NOT NULL REFERENCES person(id),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS item_board_idx ON item (board_id);
CREATE INDEX IF NOT EXISTS item_group_idx ON item (group_id);
CREATE INDEX IF NOT EXISTS item_engagement_idx ON item (engagement_id);
CREATE INDEX IF NOT EXISTS item_column_values_idx ON item USING GIN (column_values jsonb_path_ops);

-- ============================================================
-- SUBITEMS — belong to an item, own smaller column set (spec §9.3)
-- ============================================================
CREATE TABLE IF NOT EXISTS subitem_column (
  id          TEXT PRIMARY KEY,
  board_id    TEXT NOT NULL REFERENCES board(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  column_type TEXT NOT NULL,
  config      JSONB NOT NULL DEFAULT '{}',
  position    INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS subitem (
  id             TEXT PRIMARY KEY,
  org_id         TEXT NOT NULL REFERENCES organisation(id),
  parent_item_id TEXT NOT NULL REFERENCES item(id) ON DELETE CASCADE,
  engagement_id  TEXT REFERENCES engagement(id),
  name           TEXT NOT NULL,
  column_values  JSONB NOT NULL DEFAULT '{}',
  position       INTEGER NOT NULL DEFAULT 0,
  created_by     TEXT NOT NULL REFERENCES person(id),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS subitem_parent_idx ON subitem (parent_item_id);

-- ============================================================
-- BOARD VIEWS — saved renderings (spec §9.3/9.5)
-- ============================================================
CREATE TABLE IF NOT EXISTS board_view (
  id          TEXT PRIMARY KEY,
  board_id    TEXT NOT NULL REFERENCES board(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  view_type   TEXT NOT NULL
                CHECK (view_type IN ('table','kanban','gantt','calendar','workload','chart','gallery')),
  config      JSONB NOT NULL DEFAULT '{}',
  is_default  BOOLEAN NOT NULL DEFAULT false,
  created_by  TEXT NOT NULL REFERENCES person(id),
  position    INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS board_view_board_idx ON board_view (board_id);

-- ============================================================
-- GUEST ACCESS LINKS (spec §14.1/§14.5)
-- A guest link is scope + expiry; `expires_at` is NOT NULL by design — a guest
-- link that never expires is the failure mode the spec explicitly guards.
-- ============================================================
CREATE TABLE IF NOT EXISTS guest_link (
  id            TEXT PRIMARY KEY,
  org_id        TEXT NOT NULL REFERENCES organisation(id),
  engagement_id TEXT NOT NULL REFERENCES engagement(id),
  item_id       TEXT NOT NULL REFERENCES item(id) ON DELETE CASCADE,
  token         TEXT NOT NULL UNIQUE,
  email         TEXT,                    -- intended recipient, optional
  created_by    TEXT NOT NULL REFERENCES person(id),
  expires_at    TIMESTAMPTZ NOT NULL,
  revoked_at    TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS guest_link_token_idx ON guest_link (token);
CREATE INDEX IF NOT EXISTS guest_link_item_idx ON guest_link (item_id);

-- ============================================================
-- COMPLIANCE CHECKS (spec §12.5) — created here because the QA gate
-- (qa_technical) depends on it from Phase 1 onward.
-- ============================================================
CREATE TABLE IF NOT EXISTS compliance_check (
  id            TEXT PRIMARY KEY,
  org_id        TEXT NOT NULL REFERENCES organisation(id),
  item_id       TEXT NOT NULL REFERENCES item(id) ON DELETE CASCADE,
  engagement_id TEXT REFERENCES engagement(id),
  check_type    TEXT NOT NULL
                  CHECK (check_type IN ('metadata_scan','filename_scan','attribution_scan')),
  status        TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending','passed','failed','cleared')),
  findings      JSONB NOT NULL DEFAULT '[]',
  checked_at    TIMESTAMPTZ,
  cleared_by    TEXT REFERENCES person(id),  -- named human, never silent dismissal
  cleared_at    TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS compliance_check_item_idx ON compliance_check (item_id);
CREATE INDEX IF NOT EXISTS compliance_check_status_idx ON compliance_check (status);

-- ============================================================
-- role_binding gains an `engagement` scope (spec §14.1) so a binding can be
-- narrowed to the new boundary. Additive: the existing organisation/agency/
-- project scopes are untouched and still enforced.
-- ============================================================
ALTER TABLE role_binding DROP CONSTRAINT IF EXISTS role_binding_scope_type_check;
ALTER TABLE role_binding
  ADD CONSTRAINT role_binding_scope_type_check
  CHECK (scope_type IN ('organisation','agency','project','engagement'));
