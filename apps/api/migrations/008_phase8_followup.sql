-- Phase 8 follow-on schema: risk register (P8-12) + template schemas (P8-15).
-- Both are org-scoped, idempotent, matching the existing migration runner contract.
-- NOTE: this schema has no `workspace` table; template schemas scope to workstream
-- (the project-scoped working area entity used across deliverable/task) — see deliverable.workstream_id.

CREATE TABLE IF NOT EXISTS risk_register (
  id          TEXT PRIMARY KEY,
  org_id      TEXT NOT NULL REFERENCES organisation(id),
  project_id  TEXT NOT NULL REFERENCES project(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  severity     TEXT NOT NULL DEFAULT 'medium' CHECK (severity IN ('low','medium','high')),
  status      TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','mitigated','accepted')),
  owner_id    TEXT REFERENCES person(id),
  created_by  TEXT NOT NULL REFERENCES person(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS risk_register_project_idx ON risk_register (project_id, status);

CREATE TABLE IF NOT EXISTS template_schema (
  id          TEXT PRIMARY KEY,
  org_id      TEXT NOT NULL REFERENCES organisation(id),
  workstream_id TEXT NOT NULL REFERENCES workstream(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  description   TEXT,
  schema      JSONB NOT NULL DEFAULT '{}',
  created_by  TEXT NOT NULL REFERENCES person(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS template_schema_workstream_idx ON template_schema (workstream_id);