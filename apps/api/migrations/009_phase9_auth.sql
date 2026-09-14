-- Phase 9 (B-1) authN core + org bootstrap schema.
-- A-01: organisation account model upgrade + person credential fields + sessions.

-- Organisation account model (PDF §1.1). All new columns are DEFAULTed so the
-- existing "INSERT (id, name)" paths (seed/e2e fixtures) keep working; the auth
-- service populates the full shape for self-serve signups.
ALTER TABLE organisation
  ADD COLUMN IF NOT EXISTS slug          TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS display_name  TEXT,
  ADD COLUMN IF NOT EXISTS owner_person_id TEXT REFERENCES person(id),
  ADD COLUMN IF NOT EXISTS plan_tier     TEXT NOT NULL DEFAULT 'free' CHECK (plan_tier IN ('free','starter','pro','enterprise')),
  ADD COLUMN IF NOT EXISTS status        TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','suspended','trial','expired')),
  ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS default_timezone TEXT NOT NULL DEFAULT 'UTC',
  ADD COLUMN IF NOT EXISTS default_locale   TEXT NOT NULL DEFAULT 'en-GB',
  ADD COLUMN IF NOT EXISTS settings      JSONB NOT NULL DEFAULT '{}';

CREATE INDEX IF NOT EXISTS organisation_slug_idx ON organisation (slug);
CREATE INDEX IF NOT EXISTS organisation_owner_idx ON organisation (owner_person_id);

-- Person credential + verification fields (§0.1, §1.2/1.3). password_hash uses
-- argon2id; verified_at gates login once enforcement lands (A-02).
ALTER TABLE person
  ADD COLUMN IF NOT EXISTS password_hash TEXT,
  ADD COLUMN IF NOT EXISTS verified_at   TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deactivated_at TIMESTAMPTZ;

-- Login sessions: httpOnly-cookie session rows. Token stored SHA-256 hashed at
-- rest; expires_at enforces 8h (default) or 30d (remember-me). Revoked
-- sessions (logout or password change) get status='revoked' — the row is kept
-- for audit.
CREATE TABLE IF NOT EXISTS session (
  id          TEXT PRIMARY KEY,
  org_id      TEXT NOT NULL REFERENCES organisation(id),
  person_id   TEXT NOT NULL REFERENCES person(id) ON DELETE CASCADE,
  token_hash  TEXT NOT NULL UNIQUE,
  status      TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','revoked','expired')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at  TIMESTAMPTZ NOT NULL,
  revoked_at  TIMESTAMPTZ,
  ip          TEXT,
  user_agent  TEXT,
  remember    BOOLEAN NOT NULL DEFAULT false
);
CREATE INDEX IF NOT EXISTS session_person_idx ON session (person_id, status);
CREATE INDEX IF NOT EXISTS session_token_idx ON session (token_hash);

-- Email outbox (dev transport for A-02 onward): captures signup verification
-- links + any future auth email so e2e can assert send without an SMTP relay.
CREATE TABLE IF NOT EXISTS email_outbox (
  id          TEXT PRIMARY KEY,
  org_id      TEXT NOT NULL REFERENCES organisation(id),
  recipient   TEXT NOT NULL,
  subject     TEXT NOT NULL,
  body        TEXT,
  kind        TEXT NOT NULL,               -- e.g. signup.verify
  token_hash  TEXT UNIQUE,                 -- single-use token (SHA-256 hashed)
  consumed_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS email_outbox_org_idx ON email_outbox (org_id, created_at);