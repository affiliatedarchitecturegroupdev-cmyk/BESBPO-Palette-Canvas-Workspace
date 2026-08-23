-- Phase 2 schema: identity, tenancy, intake, triage, templates, projects, audit
-- Entity names follow the planning document's data model (section 5).

CREATE TABLE IF NOT EXISTS organisation (
  id   TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS person (
  id         TEXT PRIMARY KEY,
  org_id     TEXT NOT NULL REFERENCES organisation(id),
  email      TEXT NOT NULL UNIQUE,
  name       TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Scoped role grants: organisation scope for org-wide roles,
-- agency/project scopes for narrowed access.
CREATE TABLE IF NOT EXISTS role_binding (
  person_id  TEXT NOT NULL REFERENCES person(id) ON DELETE CASCADE,
  role       TEXT NOT NULL,
  scope_type TEXT NOT NULL CHECK (scope_type IN ('organisation','agency','project')),
  scope_id   TEXT NOT NULL,
  PRIMARY KEY (person_id, role, scope_type, scope_id)
);

CREATE TABLE IF NOT EXISTS agency (
  id                   TEXT PRIMARY KEY,
  org_id               TEXT NOT NULL REFERENCES organisation(id),
  name                 TEXT NOT NULL,
  confidentiality_tier TEXT NOT NULL DEFAULT 'standard',
  health               TEXT NOT NULL DEFAULT 'ok',
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS brand (
  id                   TEXT PRIMARY KEY,
  org_id               TEXT NOT NULL REFERENCES organisation(id),
  agency_id            TEXT NOT NULL REFERENCES agency(id),
  name                 TEXT NOT NULL,
  confidentiality_tier TEXT NOT NULL DEFAULT 'standard',
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS contact (
  id         TEXT PRIMARY KEY,
  agency_id  TEXT NOT NULL REFERENCES agency(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  email      TEXT NOT NULL,
  role_label TEXT NOT NULL DEFAULT 'contact'
);

-- Service templates are versioned so in-flight projects keep their gate set.
CREATE TABLE IF NOT EXISTS service_template (
  id        TEXT PRIMARY KEY,
  org_id    TEXT NOT NULL REFERENCES organisation(id),
  key       TEXT NOT NULL,
  name      TEXT NOT NULL,
  version   INTEGER NOT NULL,
  definition JSONB NOT NULL, -- phases, required brief fields, deliverables,
                             -- quality checks, SLA targets, approval steps,
                             -- handover requirements
  UNIQUE (org_id, key, version)
);

CREATE TABLE IF NOT EXISTS brief (
  id              TEXT PRIMARY KEY,
  org_id          TEXT NOT NULL REFERENCES organisation(id),
  agency_id       TEXT NOT NULL REFERENCES agency(id),
  brand_id        TEXT NOT NULL REFERENCES brand(id),
  template_id     TEXT REFERENCES service_template(id),
  title           TEXT NOT NULL,
  fields          JSONB NOT NULL DEFAULT '{}',
  attachments     JSONB NOT NULL DEFAULT '[]',
  requested_date  TEXT,
  source_channel  TEXT NOT NULL DEFAULT 'web_form',
  confidentiality TEXT NOT NULL DEFAULT 'internal',
  status          TEXT NOT NULL DEFAULT 'inbox',
  duplicate_of    TEXT,
  triage          JSONB,
  created_by      TEXT NOT NULL REFERENCES person(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS project (
  id           TEXT PRIMARY KEY,
  org_id       TEXT NOT NULL REFERENCES organisation(id),
  agency_id    TEXT NOT NULL REFERENCES agency(id),
  brand_id     TEXT NOT NULL REFERENCES brand(id),
  template_id  TEXT NOT NULL REFERENCES service_template(id),
  brief_id     TEXT REFERENCES brief(id),
  name         TEXT NOT NULL,
  status       TEXT NOT NULL DEFAULT 'intake',
  visibility   TEXT NOT NULL DEFAULT 'internal',
  created_by   TEXT NOT NULL REFERENCES person(id),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS milestone (
  id         TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES project(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  target_date TEXT,
  status     TEXT NOT NULL DEFAULT 'pending'
);

CREATE TABLE IF NOT EXISTS project_role (
  project_id TEXT NOT NULL REFERENCES project(id) ON DELETE CASCADE,
  person_id  TEXT NOT NULL REFERENCES person(id),
  role       TEXT NOT NULL,
  PRIMARY KEY (project_id, person_id, role)
);

CREATE TABLE IF NOT EXISTS audit_event (
  id          TEXT PRIMARY KEY,
  org_id      TEXT NOT NULL REFERENCES organisation(id),
  actor       TEXT NOT NULL,
  action      TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id   TEXT NOT NULL,
  metadata    JSONB NOT NULL DEFAULT '{}',
  at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS audit_event_org_idx ON audit_event (org_id, at);
CREATE INDEX IF NOT EXISTS brief_org_status_idx ON brief (org_id, status);
CREATE INDEX IF NOT EXISTS project_org_idx ON project (org_id, status);
