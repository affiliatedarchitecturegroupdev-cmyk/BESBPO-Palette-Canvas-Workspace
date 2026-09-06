-- Phase 7 schema: collaboration + governance deep-dive (P8-01..P8-15).
-- All tables are org-scoped like earlier phases.

CREATE TABLE IF NOT EXISTS invite (
  id            TEXT PRIMARY KEY,
  org_id        TEXT NOT NULL REFERENCES organisation(id),
  email        TEXT NOT NULL,
  role         TEXT NOT NULL,
  scope_type   TEXT NOT NULL CHECK (scope_type IN ('organisation','agency','project')),
  scope_id     TEXT NOT NULL,
  token        TEXT NOT NULL UNIQUE,
  invited_by   TEXT NOT NULL REFERENCES person(id),
  status       TEXT NOT NULL DEFAULT 'pending', -- pending | accepted | revoked | expired
  expires_at   TIMESTAMPTZ NOT NULL DEFAULT now() + interval '7 days',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  accepted_at   TIMESTAMPTZ,
  accepted_person_id TEXT REFERENCES person(id)
);
CREATE INDEX IF NOT EXISTS invite_org_idx ON invite (org_id, status, expires_at);

CREATE TABLE IF NOT EXISTS recurrence (
  id          TEXT PRIMARY KEY,
  org_id      TEXT NOT NULL REFERENCES organisation(id),
  project_id  TEXT NOT NULL REFERENCES project(id) ON DELETE CASCADE,
  base_task_id TEXT REFERENCES task(id) ON DELETE SET NULL,
  cadence    TEXT NOT NULL DEFAULT 'weekly', -- weekly | biweekly | monthly | custom
  interval_days INTEGER NOT NULL DEFAULT 7,
  active      BOOLEAN NOT NULL DEFAULT true,
  last_generated_at TIMESTAMPTZ,
  next_run_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by  TEXT NOT NULL REFERENCES person(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS recurrence_org_idx ON recurrence (org_id, active, next_run_at);

CREATE TABLE IF NOT EXISTS saved_view (
  id          TEXT PRIMARY KEY,
  org_id      TEXT NOT NULL REFERENCES organisation(id),
  project_id  TEXT NOT NULL REFERENCES project(id) ON DELETE CASCADE,
  owner_id    TEXT NOT NULL REFERENCES person(id),
  name        TEXT NOT NULL,
  kind        TEXT NOT NULL DEFAULT 'board', -- board | list | calendar
  filters     JSONB NOT NULL DEFAULT '{}',
  shared      BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS saved_view_owner_idx ON saved_view (project_id, owner_id);

CREATE TABLE IF NOT EXISTS reaction (
  id          TEXT PRIMARY KEY,
  org_id      TEXT NOT NULL REFERENCES organisation(id),
  comment_id  TEXT NOT NULL REFERENCES comment(id) ON DELETE CASCADE,
  person_id   TEXT NOT NULL REFERENCES person(id),
  emoji       TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (comment_id, person_id, emoji)
);
CREATE INDEX IF NOT EXISTS reaction_comment_idx ON reaction (comment_id);

CREATE TABLE IF NOT EXISTS comment_asset (
  comment_id  TEXT NOT NULL REFERENCES comment(id) ON DELETE CASCADE,
  asset_id    TEXT NOT NULL REFERENCES asset(id) ON DELETE CASCADE,
  PRIMARY KEY (comment_id, asset_id)
);

CREATE TABLE IF NOT EXISTS task_source (
  task_id     TEXT NOT NULL REFERENCES task(id) ON DELETE CASCADE,
  source_type TEXT NOT NULL,
  source_id   TEXT NOT NULL,
  PRIMARY KEY (task_id, source_type, source_id)
);

CREATE TABLE IF NOT EXISTS approval_step (
  id          TEXT PRIMARY KEY,
  org_id      TEXT NOT NULL REFERENCES organisation(id),
  project_id  TEXT NOT NULL REFERENCES project(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  position     INTEGER NOT NULL,
  required_role TEXT NOT NULL DEFAULT 'client_approver',
  active      BOOLEAN NOT NULL DEFAULT true,
  UNIQUE (project_id, position)
);
CREATE INDEX IF NOT EXISTS approval_step_project_idx ON approval_step (project_id, position);

CREATE TABLE IF NOT EXISTS technical_check (
  id          TEXT PRIMARY KEY,
  org_id      TEXT NOT NULL REFERENCES organisation(id),
  version_id  TEXT NOT NULL REFERENCES version(id) ON DELETE CASCADE,
  check_name  TEXT NOT NULL,
  passed      BOOLEAN NOT NULL DEFAULT false,
  detail      TEXT,
  run_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS technical_check_version_idx ON technical_check (version_id);

CREATE TABLE IF NOT EXISTS qa_reviewer (
  id          TEXT PRIMARY KEY,
  org_id      TEXT NOT NULL REFERENCES organisation(id),
  version_id  TEXT NOT NULL REFERENCES version(id) ON DELETE CASCADE,
  reviewer_id TEXT NOT NULL REFERENCES person(id),
  due_at      TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_by  TEXT NOT NULL REFERENCES person(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS qa_reviewer_version_idx ON qa_reviewer (version_id, completed_at);

CREATE TABLE IF NOT EXISTS export_log (
  id          TEXT PRIMARY KEY,
  org_id      TEXT NOT NULL REFERENCES organisation(id),
  kind        TEXT NOT NULL,
  format      TEXT NOT NULL,
  row_count   INTEGER NOT NULL DEFAULT 0,
  exported_by TEXT NOT NULL REFERENCES person(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS export_log_org_idx ON export_log (org_id, created_at);

ALTER TABLE version ADD COLUMN IF NOT EXISTS confidentiality TEXT NOT NULL DEFAULT 'client_shared';
ALTER TABLE comment ADD COLUMN IF NOT EXISTS visibility TEXT NOT NULL DEFAULT 'internal';

ALTER TABLE task ADD COLUMN IF NOT EXISTS risk TEXT;
ALTER TABLE task ADD COLUMN IF NOT EXISTS risk_reason TEXT;

ALTER TABLE service_template ADD COLUMN IF NOT EXISTS task_field_schema JSONB NOT NULL DEFAULT '[]';