-- Phase 6 ops + infrastructure: commercial controls, automation, storage,
-- queue, AI guards, legal holds, permission reviews.

-- P6-07 commercial controls
CREATE TABLE IF NOT EXISTS rate_card (
  id          TEXT PRIMARY KEY,
  org_id      TEXT NOT NULL REFERENCES organisation(id),
  name        TEXT NOT NULL,
  currency    TEXT NOT NULL DEFAULT 'USD',
  active      BOOLEAN NOT NULL DEFAULT true,
  created_by  TEXT NOT NULL REFERENCES person(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS rate_card_entry (
  id           TEXT PRIMARY KEY,
  org_id       TEXT NOT NULL REFERENCES organisation(id),
  rate_card_id TEXT NOT NULL REFERENCES rate_card(id) ON DELETE CASCADE,
  role         TEXT NOT NULL,
  skill        TEXT,
  hourly_rate  NUMERIC NOT NULL CHECK (hourly_rate >= 0)
);

CREATE TABLE IF NOT EXISTS estimate (
  id            TEXT PRIMARY KEY,
  org_id        TEXT NOT NULL REFERENCES organisation(id),
  project_id    TEXT NOT NULL REFERENCES project(id) ON DELETE CASCADE,
  version       INTEGER NOT NULL,
  status        TEXT NOT NULL DEFAULT 'draft', -- draft | submitted | approved
  total_hours   NUMERIC NOT NULL DEFAULT 0,
  total_amount  NUMERIC NOT NULL DEFAULT 0,
  notes         TEXT NOT NULL DEFAULT '',
  created_by    TEXT NOT NULL REFERENCES person(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (project_id, version)
);

CREATE TABLE IF NOT EXISTS estimate_line (
  id          TEXT PRIMARY KEY,
  org_id      TEXT NOT NULL REFERENCES organisation(id),
  estimate_id TEXT NOT NULL REFERENCES estimate(id) ON DELETE CASCADE,
  label       TEXT NOT NULL,
  role        TEXT NOT NULL,
  hours       NUMERIC NOT NULL CHECK (hours >= 0),
  hourly_rate NUMERIC NOT NULL CHECK (hourly_rate >= 0),
  amount      NUMERIC NOT NULL CHECK (amount >= 0)
);

ALTER TABLE project ADD COLUMN IF NOT EXISTS po_number TEXT;
ALTER TABLE project ADD COLUMN IF NOT EXISTS budget_amount NUMERIC;
ALTER TABLE milestone ADD COLUMN IF NOT EXISTS invoice_ready BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE milestone ADD COLUMN IF NOT EXISTS invoice_amount NUMERIC;

-- P6-08 automation builder
CREATE TABLE IF NOT EXISTS automation_rule (
  id            TEXT PRIMARY KEY,
  org_id        TEXT NOT NULL REFERENCES organisation(id),
  name          TEXT NOT NULL,
  trigger_event TEXT NOT NULL,
  condition     JSONB NOT NULL DEFAULT '[]',
  action        JSONB NOT NULL,
  active        BOOLEAN NOT NULL DEFAULT true,
  created_by    TEXT NOT NULL REFERENCES person(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS automation_run (
  id         TEXT PRIMARY KEY,
  org_id     TEXT NOT NULL REFERENCES organisation(id),
  rule_id    TEXT NOT NULL REFERENCES automation_rule(id) ON DELETE CASCADE,
  event      TEXT NOT NULL,
  matched    BOOLEAN NOT NULL,
  detail     JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS automation_run_rule_idx ON automation_run (rule_id, created_at DESC);

-- P6-10 object storage
CREATE TABLE IF NOT EXISTS asset (
  id           TEXT PRIMARY KEY,
  org_id       TEXT NOT NULL REFERENCES organisation(id),
  key          TEXT NOT NULL,
  content_type TEXT NOT NULL,
  size_bytes   BIGINT NOT NULL,
  sha256       TEXT NOT NULL,
  metadata     JSONB NOT NULL DEFAULT '{}',
  created_by   TEXT NOT NULL REFERENCES person(id),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS asset_org_idx ON asset (org_id, created_at DESC);

-- P6-11 worker queue (Postgres-backed; Redis-compatible semantics)
CREATE TABLE IF NOT EXISTS job (
  id              TEXT PRIMARY KEY,
  org_id          TEXT NOT NULL REFERENCES organisation(id),
  queue           TEXT NOT NULL,
  payload         JSONB NOT NULL DEFAULT '{}',
  status          TEXT NOT NULL DEFAULT 'pending', -- pending | running | done | dead
  attempts        INTEGER NOT NULL DEFAULT 0,
  max_attempts    INTEGER NOT NULL DEFAULT 3,
  idempotency_key TEXT,
  run_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_error      TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (org_id, queue, idempotency_key)
);
CREATE INDEX IF NOT EXISTS job_poll_idx ON job (queue, status, run_at);

-- P6-13 AI opt-in guards
ALTER TABLE organisation ADD COLUMN IF NOT EXISTS ai_opt_in BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS ai_action (
  id          TEXT PRIMARY KEY,
  org_id      TEXT NOT NULL REFERENCES organisation(id),
  kind        TEXT NOT NULL,
  payload     JSONB NOT NULL DEFAULT '{}',
  status      TEXT NOT NULL DEFAULT 'pending', -- pending | approved | rejected | executed
  proposed_by TEXT NOT NULL REFERENCES person(id),
  decided_by  TEXT REFERENCES person(id),
  decided_at  TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- P6-14 legal holds + retention
ALTER TABLE organisation ADD COLUMN IF NOT EXISTS retention_days INTEGER NOT NULL DEFAULT 365;

CREATE TABLE IF NOT EXISTS legal_hold (
  id          TEXT PRIMARY KEY,
  org_id      TEXT NOT NULL REFERENCES organisation(id),
  scope_type  TEXT NOT NULL, -- organisation | project
  scope_id    TEXT NOT NULL,
  reason      TEXT NOT NULL,
  set_by      TEXT NOT NULL REFERENCES person(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  released_at TIMESTAMPTZ
);

-- B-02 permissions reviews
CREATE TABLE IF NOT EXISTS permission_review (
  id          TEXT PRIMARY KEY,
  org_id      TEXT NOT NULL REFERENCES organisation(id),
  role        TEXT NOT NULL,
  capability  TEXT NOT NULL,
  effect      TEXT NOT NULL, -- grant | revoke
  status      TEXT NOT NULL DEFAULT 'pending', -- pending | approved | rejected
  rationale   TEXT NOT NULL DEFAULT '',
  proposed_by TEXT NOT NULL REFERENCES person(id),
  decided_by  TEXT REFERENCES person(id),
  decided_at  TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS role_capability_override (
  id          TEXT PRIMARY KEY,
  org_id      TEXT NOT NULL REFERENCES organisation(id),
  role        TEXT NOT NULL,
  capability  TEXT NOT NULL,
  effect      TEXT NOT NULL, -- grant | revoke
  review_id   TEXT NOT NULL REFERENCES permission_review(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (org_id, role, capability)
);
