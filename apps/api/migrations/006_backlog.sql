-- Backlog batch: B-03 agent attribution, P7-01 MFA, P7-04 API keys, P7-05 e-sign stub

-- B-03: tag audit rows written by agent-driven callers (x-agent-tag header)
ALTER TABLE audit_event ADD COLUMN IF NOT EXISTS agent_tag TEXT;
CREATE INDEX IF NOT EXISTS audit_event_agent_idx ON audit_event (org_id, agent_tag);

-- P7-04: org API keys. Only the sha256 hash is stored; the token is shown once.
CREATE TABLE IF NOT EXISTS api_key (
  id         TEXT PRIMARY KEY,
  org_id     TEXT NOT NULL REFERENCES organisation(id),
  person_id  TEXT NOT NULL REFERENCES person(id),
  name       TEXT NOT NULL,
  prefix     TEXT NOT NULL,
  hash       TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  revoked_at TIMESTAMPTZ
);
CREATE UNIQUE INDEX IF NOT EXISTS api_key_hash_idx ON api_key (hash);
CREATE INDEX IF NOT EXISTS api_key_org_idx ON api_key (org_id);

-- P7-01: TOTP MFA enrolment per person
ALTER TABLE person ADD COLUMN IF NOT EXISTS mfa_secret TEXT;
ALTER TABLE person ADD COLUMN IF NOT EXISTS mfa_enabled BOOLEAN NOT NULL DEFAULT false;

-- P7-05: e-sign envelope stub attached to an approval
CREATE TABLE IF NOT EXISTS esign_envelope (
  id          TEXT PRIMARY KEY,
  org_id      TEXT NOT NULL REFERENCES organisation(id),
  approval_id TEXT NOT NULL REFERENCES approval(id) ON DELETE CASCADE,
  status      TEXT NOT NULL DEFAULT 'sent', -- sent | completed | voided
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS esign_envelope_approval_idx ON esign_envelope (approval_id);
