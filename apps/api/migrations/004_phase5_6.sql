-- Phase 5/6 V1 schema: capacity planning, integrations, proofing annotations,
-- SSO/SCIM scaffolding. All tables are org-scoped like earlier phases.

-- P6-01 capacity planning: a named skill a person can hold.
CREATE TABLE IF NOT EXISTS skill (
  id      TEXT PRIMARY KEY,
  org_id  TEXT NOT NULL REFERENCES organisation(id),
  name    TEXT NOT NULL,
  UNIQUE (org_id, name)
);

-- A person's capacity profile: weekly hours, load threshold (%), skills.
CREATE TABLE IF NOT EXISTS person_capacity (
  id              TEXT PRIMARY KEY,
  org_id          TEXT NOT NULL REFERENCES organisation(id),
  person_id       TEXT NOT NULL REFERENCES person(id) ON DELETE CASCADE,
  weekly_hours    NUMERIC NOT NULL DEFAULT 40,
  threshold_pct   INT NOT NULL DEFAULT 85,      -- % of weekly hours considered "at capacity"
  UNIQUE (org_id, person_id)
);

CREATE TABLE IF NOT EXISTS person_skill (
  id         TEXT PRIMARY KEY,
  org_id     TEXT NOT NULL REFERENCES organisation(id),
  person_id  TEXT NOT NULL REFERENCES person(id) ON DELETE CASCADE,
  skill_id   TEXT NOT NULL REFERENCES skill(id) ON DELETE CASCADE,
  level      INT NOT NULL DEFAULT 1,            -- 1 (aware) .. 5 (expert)
  UNIQUE (person_id, skill_id)
);
CREATE INDEX IF NOT EXISTS person_skill_person_idx ON person_skill (person_id);
CREATE INDEX IF NOT EXISTS person_skill_skill_idx ON person_skill (skill_id);

-- P6-04 integrations hub: outbound webhook subscriptions.
CREATE TABLE IF NOT EXISTS integration (
  id          TEXT PRIMARY KEY,
  org_id      TEXT NOT NULL REFERENCES organisation(id),
  name        TEXT NOT NULL,
  target_url  TEXT NOT NULL,
  event       TEXT NOT NULL,                   -- e.g. task.status_changed, approval.decided
  active      BOOLEAN NOT NULL DEFAULT true,
  secret      TEXT,                            -- HMAC signing secret
  created_by  TEXT NOT NULL REFERENCES person(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS integration_org_idx ON integration (org_id, event, active);

-- P6-05 richer proofing: an annotated comment pinned to a version.
CREATE TABLE IF NOT EXISTS annotation (
  id          TEXT PRIMARY KEY,
  org_id      TEXT NOT NULL REFERENCES organisation(id),
  version_id  TEXT NOT NULL REFERENCES version(id) ON DELETE CASCADE,
  author_id   TEXT NOT NULL REFERENCES person(id),
  x           NUMERIC,                          -- pin position (0..1) on the proof surface
  y           NUMERIC,
  body        TEXT NOT NULL,
  resolved    BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS annotation_version_idx ON annotation (version_id, resolved);

-- P6-06 SSO/SCIM: OIDC provider configuration per organisation.
CREATE TABLE IF NOT EXISTS sso_config (
  id            TEXT PRIMARY KEY,
  org_id        TEXT NOT NULL REFERENCES organisation(id),
  issuer        TEXT NOT NULL,
  client_id     TEXT NOT NULL,
  client_secret TEXT,
  scim_token    TEXT,                           -- bearer token for the SCIM endpoint
  mfa_required  BOOLEAN NOT NULL DEFAULT false,
  created_by    TEXT NOT NULL REFERENCES person(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (org_id, issuer)
);
CREATE INDEX IF NOT EXISTS sso_config_org_idx ON sso_config (org_id);

-- SCIM-provisioned external identity linked to a person.
CREATE TABLE IF NOT EXISTS scim_identity (
  id           TEXT PRIMARY KEY,
  org_id       TEXT NOT NULL REFERENCES organisation(id),
  person_id    TEXT NOT NULL REFERENCES person(id) ON DELETE CASCADE,
  external_id  TEXT NOT NULL,                   -- IdP-side user id
  active       BOOLEAN NOT NULL DEFAULT true,
  synced_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (org_id, external_id)
);
CREATE INDEX IF NOT EXISTS scim_identity_person_idx ON scim_identity (person_id);
