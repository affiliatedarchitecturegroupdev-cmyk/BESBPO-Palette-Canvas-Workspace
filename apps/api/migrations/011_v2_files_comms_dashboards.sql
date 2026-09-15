-- V2 spec §13 (files/DAM), §11 (communication), §10 (dashboards).
-- Additive only.

-- ============================================================
-- FILES — one row per uploaded asset, versioned by parent_file_id (§13.1)
-- ============================================================
CREATE TABLE IF NOT EXISTS file_object (
  id             TEXT PRIMARY KEY,
  org_id         TEXT NOT NULL REFERENCES organisation(id),
  engagement_id  TEXT REFERENCES engagement(id),
  name           TEXT NOT NULL,
  content_type   TEXT NOT NULL DEFAULT 'application/octet-stream',
  size_bytes     BIGINT NOT NULL DEFAULT 0,
  storage_key    TEXT NOT NULL,
  source         TEXT NOT NULL DEFAULT 'native_upload'
                   CHECK (source IN ('native_upload','adobe_plugin','canva_app','dropbox_sync')),
  -- For integration round-trips: the id the external tool knows this by, so a
  -- designer can round-trip from Adobe/Canva/Dropbox without losing the link.
  external_ref   TEXT,
  parent_file_id TEXT REFERENCES file_object(id) ON DELETE SET NULL,
  version_number INTEGER NOT NULL DEFAULT 1,
  metadata       JSONB NOT NULL DEFAULT '{}',  -- author, licence, attribution
  uploaded_by    TEXT NOT NULL REFERENCES person(id),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at     TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS file_object_org_idx ON file_object (org_id);
CREATE INDEX IF NOT EXISTS file_object_engagement_idx ON file_object (engagement_id);
CREATE INDEX IF NOT EXISTS file_object_parent_idx ON file_object (parent_file_id);
CREATE INDEX IF NOT EXISTS file_object_external_idx ON file_object (external_ref);

-- A file may be referenced from a board column, a message and a comment.
-- One join table per surface keeps each write path explicit.
CREATE TABLE IF NOT EXISTS item_file (
  item_id   TEXT NOT NULL REFERENCES item(id) ON DELETE CASCADE,
  file_id   TEXT NOT NULL REFERENCES file_object(id) ON DELETE CASCADE,
  column_id TEXT REFERENCES board_column(id) ON DELETE SET NULL,
  PRIMARY KEY (item_id, file_id)
);

-- ============================================================
-- COMMUNICATION (§11)
-- ============================================================
CREATE TABLE IF NOT EXISTS channel (
  id            TEXT PRIMARY KEY,
  org_id        TEXT NOT NULL REFERENCES organisation(id),
  engagement_id TEXT REFERENCES engagement(id),
  name          TEXT,
  channel_type  TEXT NOT NULL DEFAULT 'threaded'
                  CHECK (channel_type IN ('instant','threaded','direct')),
  -- Fixed at creation. §11.2 forbids silently flipping this; conversion is an
  -- explicit, audited action instead.
  visibility    TEXT NOT NULL DEFAULT 'internal'
                  CHECK (visibility IN ('internal','external')),
  created_by    TEXT NOT NULL REFERENCES person(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at   TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS channel_org_idx ON channel (org_id);
CREATE INDEX IF NOT EXISTS channel_engagement_idx ON channel (engagement_id);

CREATE TABLE IF NOT EXISTS channel_member (
  channel_id TEXT NOT NULL REFERENCES channel(id) ON DELETE CASCADE,
  person_id  TEXT NOT NULL REFERENCES person(id) ON DELETE CASCADE,
  role       TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('member','owner')),
  joined_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (channel_id, person_id)
);

CREATE TABLE IF NOT EXISTS message (
  id                TEXT PRIMARY KEY,
  org_id            TEXT NOT NULL REFERENCES organisation(id),
  channel_id        TEXT NOT NULL REFERENCES channel(id) ON DELETE CASCADE,
  engagement_id     TEXT REFERENCES engagement(id),
  parent_message_id TEXT REFERENCES message(id) ON DELETE CASCADE,
  body              TEXT NOT NULL,
  mentions          TEXT[] NOT NULL DEFAULT '{}',
  file_ids          TEXT[] NOT NULL DEFAULT '{}',
  created_by        TEXT NOT NULL REFERENCES person(id),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  edited_at         TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS message_channel_idx ON message (channel_id, created_at);
CREATE INDEX IF NOT EXISTS message_parent_idx ON message (parent_message_id);

-- ============================================================
-- MEETINGS (§11.4) — attendance is recorded honestly, not assumed
-- ============================================================
CREATE TABLE IF NOT EXISTS meeting (
  id            TEXT PRIMARY KEY,
  org_id        TEXT NOT NULL REFERENCES organisation(id),
  engagement_id TEXT REFERENCES engagement(id),
  item_id       TEXT REFERENCES item(id) ON DELETE SET NULL,
  title         TEXT NOT NULL,
  starts_at     TIMESTAMPTZ NOT NULL,
  duration_mins INTEGER NOT NULL DEFAULT 30,
  -- An internal room id or an external link; either is valid.
  room_ref      TEXT,
  external_url  TEXT,
  created_by    TEXT NOT NULL REFERENCES person(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS meeting_org_idx ON meeting (org_id, starts_at);

CREATE TABLE IF NOT EXISTS meeting_participant (
  meeting_id TEXT NOT NULL REFERENCES meeting(id) ON DELETE CASCADE,
  person_id  TEXT REFERENCES person(id) ON DELETE CASCADE,
  guest_email TEXT,
  invited_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  joined_at  TIMESTAMPTZ,
  PRIMARY KEY (meeting_id, person_id)
);

-- ============================================================
-- DASHBOARDS (§10) — read only aggregated metrics, never source rows
-- ============================================================
CREATE TABLE IF NOT EXISTS dashboard (
  id            TEXT PRIMARY KEY,
  org_id        TEXT NOT NULL REFERENCES organisation(id),
  scope_role    TEXT NOT NULL CHECK (scope_role IN ('management','account_manager','client')),
  engagement_id TEXT REFERENCES engagement(id),
  name          TEXT NOT NULL,
  is_system     BOOLEAN NOT NULL DEFAULT false,
  created_by    TEXT REFERENCES person(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS dashboard_org_idx ON dashboard (org_id, scope_role);

CREATE TABLE IF NOT EXISTS dashboard_widget (
  id           TEXT PRIMARY KEY,
  dashboard_id TEXT NOT NULL REFERENCES dashboard(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  widget_type  TEXT NOT NULL
                 CHECK (widget_type IN ('capacity_kpi','qa_pass_rate','turnaround_chart',
                                        'engagement_health','commercial_rollup','workload_leaderboard')),
  semantic_role TEXT,                       -- which role the widget aggregates
  aggregation  TEXT NOT NULL DEFAULT 'sum'
                 CHECK (aggregation IN ('sum','avg','count','min','max','pass_rate')),
  position     INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS dashboard_widget_dashboard_idx ON dashboard_widget (dashboard_id);

-- The only thing dashboards read. Written by the aggregation consumer on item
-- write; there is no query path from a widget to a source row (§10.4).
CREATE TABLE IF NOT EXISTS dashboard_metric (
  id            TEXT PRIMARY KEY,
  org_id        TEXT NOT NULL REFERENCES organisation(id),
  engagement_id TEXT REFERENCES engagement(id),
  board_id      TEXT NOT NULL REFERENCES board(id) ON DELETE CASCADE,
  item_id       TEXT NOT NULL REFERENCES item(id) ON DELETE CASCADE,
  semantic_role TEXT NOT NULL,
  numeric_value DOUBLE PRECISION,
  text_value    TEXT,
  recorded_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (item_id, semantic_role)
);
CREATE INDEX IF NOT EXISTS dashboard_metric_role_idx ON dashboard_metric (org_id, semantic_role);
CREATE INDEX IF NOT EXISTS dashboard_metric_engagement_idx ON dashboard_metric (engagement_id, semantic_role);

-- ============================================================
-- AI AGENT RUNS (§12.2/§12.6) — every agent action is recorded
-- ============================================================
CREATE TABLE IF NOT EXISTS agent_run (
  id            TEXT PRIMARY KEY,
  org_id        TEXT NOT NULL REFERENCES organisation(id),
  agent_key     TEXT NOT NULL,
  autonomy      TEXT NOT NULL,
  engagement_id TEXT REFERENCES engagement(id),
  item_id       TEXT REFERENCES item(id) ON DELETE SET NULL,
  status        TEXT NOT NULL DEFAULT 'proposed'
                  CHECK (status IN ('proposed','confirmed','rejected','applied','blocked')),
  input         JSONB NOT NULL DEFAULT '{}',
  proposal      JSONB NOT NULL DEFAULT '{}',
  decided_by    TEXT REFERENCES person(id),
  decided_at    TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS agent_run_org_idx ON agent_run (org_id, agent_key, created_at);
CREATE INDEX IF NOT EXISTS agent_run_item_idx ON agent_run (item_id);